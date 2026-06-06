# DyChat API Documentation

This document explains the backend API architecture, runtime flow, models, services, middleware, validation, routes, realtime events, and deployment behavior for DyChat.

## 1. API Goal

The backend provides:

- user registration and login.
- current user lookup.
- cookie-based access and refresh sessions.
- logout for current session.
- logout from all devices.
- profile name updates.
- password updates using current password.
- profile avatar upload/remove.
- protected user search.
- direct conversations.
- group conversations.
- group management.
- text messaging.
- private image, video, audio, and file messages.
- message read receipts.
- message unsend/delete state.
- realtime message, typing, seen, and presence events.
- Redis token blacklist.
- ImageKit media storage for profile and group avatars.
- production React app serving from the API server.

## 2. Runtime Stack

- Node.js
- Express 5
- MongoDB with Mongoose
- Redis
- JSON Web Tokens
- RS256 private/public key cryptography
- HTTP-only cookies
- express-validator
- Multer
- ImageKit
- Socket.IO

## 3. Important Auth Rule

The frontend does not read, store, or manually attach access or refresh tokens.

The backend sets HTTP-only cookies:

- access token cookie
- refresh token cookie

The frontend uses RTK Query with `credentials: "include"`, so the browser automatically sends cookies to the backend.

## 4. Environment Variables

Main environment keys:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/dychat
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
JWT_PRIVATE_KEY_BASE64=
JWT_PUBLIC_KEY_BASE64=
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
ACCESS_TOKEN_COOKIE_NAME=dychat_access
REFRESH_TOKEN_COOKIE_NAME=dychat_refresh
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
IMAGE_KIT_PRIVATE=
IMAGE_KIT_PUBLIC=
IMAGE_KIT_URL_ENDPOINT=
```

## 5. RS256 Key Setup

JWTs use RS256:

- private key signs tokens.
- public key verifies tokens.
- frontend never receives either key.

Recommended key generation:

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

Convert PEM files to base64 and paste them into `.env`:

```env
JWT_PRIVATE_KEY_BASE64=<base64-private-pem>
JWT_PUBLIC_KEY_BASE64=<base64-public-pem>
```

Development fallback:

- if no RSA keys are configured, the backend generates a temporary in-memory key pair.
- this is only for local development.
- tokens become invalid after server restart.
- production must use persisted keys.

## 6. Backend Folder Structure

```txt
api/src/
  app.js
  server.js
  config/
    database.js
    env.js
    imageKit.js
    jwtKeys.js
    redis.js
  controllers/
    auth.controller.js
    conversation.controller.js
    message.controller.js
    user.controller.js
  lib/
    socket.js
  middlewares/
    authenticate.js
    errorHandler.js
    socketAuthenticate.js
    uploadImage.js
    validateRequest.js
  models/
    Conversation.js
    Message.js
    RefreshSession.js
    User.js
  routes/
    auth.routes.js
    conversation.routes.js
    message.routes.js
    user.routes.js
  services/
    auth.service.js
    conversation.service.js
    imageKit.service.js
    message.service.js
    realtime.service.js
    tokenBlacklist.service.js
    user.service.js
  utils/
    ApiError.js
    cookies.js
    crypto.js
    duration.js
    serializeConversation.js
    serializeMessage.js
    serializeUser.js
    tokens.js
  validations/
    auth.validation.js
    conversation.validation.js
    message.validation.js
    user.validation.js
```

## 7. App Boot Flow

File: `api/src/server.js`

Startup flow:

1. Load environment variables.
2. Connect MongoDB.
3. Connect Redis.
4. Create an HTTP server from the Express app.
5. Attach Socket.IO to the same HTTP server.
6. Start listening on `env.port`.

## 8. Express App Flow

File: `api/src/app.js`

Responsibilities:

- Create the Express app.
- Enable CORS with credentials.
- Parse JSON request bodies.
- Parse URL-encoded request bodies.
- Parse cookies.
- Mount auth routes on `/api/auth`.
- Mount user routes on `/api/users`.
- Mount conversation routes on `/api/conversations`.
- Mount message routes on `/api/messages`.
- Serve production React assets from `api/views`.
- Fallback non-API routes to `api/views/index.html`.
- Mount not-found and global error handlers last.

Routes:

- `GET /health`
- `/api/auth/*`
- `/api/users/*`
- `/api/conversations/*`
- `/api/messages/*`
- frontend static assets under `/assets/*`
- frontend routes such as `/`, `/login`, `/register`, `/app`

Unknown `/api/*` routes are handled by the API not-found middleware. Non-API routes are handled by React Router through `index.html`.

## 9. Config Modules

### `env.js`

Exports one central `env` object for:

- port.
- client URL.
- node environment.
- MongoDB URI.
- Redis connection values.
- JWT keys and expiry values.
- cookie names and settings.
- ImageKit credentials.

### `database.js`

Exports `connectDatabase()`, which connects Mongoose to MongoDB.

### `redis.js`

Exports:

- `redisClient`
- `connectRedis()`

Redis is used for token blacklist storage. Development can fall back to an in-memory blacklist if Redis is unavailable.

### `imageKit.js`

Exports:

- `isImageKitConfigured`
- `imageKit`

Used by profile and group avatar upload/delete services.

### `jwtKeys.js`

Loads RSA private/public keys from base64 environment variables and provides a development-only temporary key pair fallback.

## 10. Models

### User

File: `api/src/models/User.js`

Fields:

- `name`
- `email`
- `passwordHash`
- `avatar.url`
- `avatar.publicId`
- `isOnline`
- `lastSeen`
- timestamps

Notes:

- `passwordHash` has `select: false`.
- login explicitly selects `+passwordHash`.
- avatar `publicId` stores ImageKit's file id.

### RefreshSession

File: `api/src/models/RefreshSession.js`

Fields:

- `user`
- `refreshTokenHash`
- `refreshTokenJti`
- `accessTokenJti`
- `accessTokenExpiresAt`
- `userAgent`
- `ip`
- `lastUsedAt`
- `expiresAt`
- timestamps

Purpose:

- stores one active login session per device/browser.
- supports logout current session.
- supports logout all devices.
- verifies refresh tokens against active session state.
- stores only the hash of the refresh token.

### Conversation

File: `api/src/models/Conversation.js`

Fields:

- `type`: `direct` or `group`.
- `directKey`: unique sorted ids for direct conversations.
- `name`: group name.
- `avatar.url`: group display image URL.
- `avatar.publicId`: ImageKit group image file id.
- `admins`: group admin user ids.
- `participants`: current conversation members.
- `visibleTo`: users who should see the conversation in their sidebar.
- `createdBy`
- `lastMessage`
- `lastMessageAt`
- `lastMessagePreview`
- `lastMessageSender`
- timestamps

Direct chat behavior:

- `participants` stores both users.
- `visibleTo` can initially contain only the starter.
- first message adds all participants to `visibleTo`.

Group chat behavior:

- group creation adds every selected member to `visibleTo`.
- leaving or removal removes the user from `participants` and `visibleTo`.

### Message

File: `api/src/models/Message.js`

Fields:

- `conversation`
- `sender`
- `body`
- `type`: `text`, `image`, `file`, `video`, `audio`, `system`.
- `attachments`
- `readBy`
- `clientTempId`
- `isDeleted`
- `deletedAt`
- timestamps

Purpose:

- stores chat text and future media metadata.
- stores system messages such as group leave events.
- stores per-user read receipts.
- supports frontend optimistic and pending message replacement through `clientTempId`.
- keeps deleted messages in the timeline with `isDeleted: true`.

## 11. Utilities

### `ApiError`

Standard operational API error class. Carries:

- `statusCode`
- `message`
- optional `code`
- optional `errors`

### `cookies.js`

Exports:

- `setAuthCookies(res, { accessToken, refreshToken })`
- `clearAuthCookies(res)`

Sets and clears HTTP-only auth cookies.

### `crypto.js`

Exports:

- `createTokenHash(token)`
- `createJti()`

Used for refresh token hashing and JWT id creation.

### `duration.js`

Exports helpers for converting values such as `15m` or `7d` into milliseconds, dates, or TTL seconds.

### `tokens.js`

Exports:

- `signToken({ expiresIn, jti, payload })`
- `createAccessToken({ sessionId, userId })`
- `createRefreshToken({ sessionId, userId })`
- `verifyAccessToken(token)`
- `verifyRefreshToken(token)`

Tokens are signed and verified using RS256.

### Serializers

- `serializeUser(user)`: removes sensitive fields.
- `serializeConversation(conversation, options)`: returns current-user-specific conversation payloads.
- `serializeMessage(message)`: returns safe message payloads.

## 12. Services

### `tokenBlacklist.service.js`

Exports:

- `blacklistTokenJti({ expiresAt, jti, type })`
- `isTokenJtiBlacklisted({ jti, type })`

Purpose:

- invalidates tokens before natural expiry.
- uses Redis when connected.
- uses in-memory fallback in development.

### `imageKit.service.js`

Exports:

- `uploadProfileImageToImageKit({ file, userId })`
- `uploadGroupImageToImageKit({ file, userId })`
- `deleteImageKitFile(publicId)`

Purpose:

- converts Multer memory buffers into ImageKit uploads.
- stores profile images in `/dychat/profile-pictures`.
- stores group images in `/dychat/group-pictures`.
- deletes old or removed ImageKit files.

### `user.service.js`

Exports:

- `searchUsers({ currentUserId, query })`

Purpose:

- searches users by name or email.
- excludes the current user.
- escapes regex-sensitive characters.
- returns safe serialized users.

### `auth.service.js`

Exports:

- `registerUser({ email, name, password }, meta)`
- `loginUser({ email, password }, meta)`
- `refreshAuthSession(refreshTokenValue, meta)`
- `updateUserProfile({ name, userId })`
- `updateUserPassword({ currentPassword, newPassword, userId })`
- `updateUserAvatar({ file, userId })`
- `removeUserAvatar({ userId })`
- `logoutSession({ accessExpiresAt, accessJti, refreshTokenValue, sessionId, userId })`
- `logoutAllSessions({ accessExpiresAt, accessJti, userId })`

Responsibilities:

- user registration.
- password hashing and comparison.
- session creation.
- access and refresh token creation.
- refresh session verification.
- token blacklist management.
- profile updates.
- current-session and all-session logout.

### `conversation.service.js`

Exports:

- `listUserConversations({ userId })`
- `createDirectConversation({ participantId, userId })`
- `createGroupConversation({ avatar, name, participantIds, userId })`
- `getConversationForParticipant({ conversationId, userId })`
- `listConversationMessages({ conversationId, userId })`
- `markConversationMessagesSeen({ conversationId, userId })`
- `leaveGroupConversation({ conversationId, userId })`
- `updateGroupConversation({ avatar, conversationId, name, userId })`
- `addGroupMembers({ conversationId, participantIds, userId })`
- `removeGroupMember({ conversationId, memberId, userId })`
- `deleteGroupConversation({ conversationId, userId })`
- `getConversationParticipantIds({ conversationId, userId })`
- `getPresenceRecipientIds(userId)`
- `serializeConversationForUser({ conversation, userId })`

Responsibilities:

- list visible conversations.
- create/reveal direct conversations.
- create groups.
- enforce participant access.
- enforce admin access for group management.
- calculate unread counts.
- mark messages as seen.
- leave groups.
- update group details.
- add/remove group members.
- delete groups.
- return user-specific conversation payloads.

### `message.service.js`

Exports:

- `sendConversationMessage({ body, clientTempId, conversationId, senderId, type })`
- `getMessageAttachmentAccessUrl({ attachmentId, messageId, userId })`
- `createAttachmentPayload({ file, uploadedFile })`
- `deleteConversationMessage({ messageId, userId })`

Responsibilities:

- validate message body and type.
- save messages.
- save private attachment metadata.
- generate signed attachment URLs after participant checks.
- update conversation visibility and last-message metadata.
- return serialized message payloads.
- return per-user conversation update payloads.
- mark sender-owned messages as deleted for everyone.

### `realtime.service.js`

Exports:

- `registerRealtimeServer(io)`
- `getRealtimeServer()`
- `addUserConnection({ socketId, userId })`
- `removeUserConnection({ socketId, userId })`
- `isUserOnline(userId)`
- `emitToUser({ event, payload, userId })`
- `emitToUsers({ event, payload, userIds })`
- `emitConversationCreated({ conversation, userId })`
- `emitConversationUpdated({ conversation, userId })`
- `emitConversationRemoved({ conversationId, userId })`
- `emitMessageCreated({ message, userId })`
- `emitMessageDeleted({ conversation, message, userId })`
- `emitMessagesSeen({ conversationId, seenBy, userIds })`
- `emitTypingStarted({ conversationId, user, userIds })`
- `emitTypingStopped({ conversationId, user, userIds })`
- `emitUserPresence({ isOnline, lastSeen, userId, userIds })`

Purpose:

- centralizes Socket.IO event names and emits.
- emits to per-user rooms such as `user:<id>`.
- tracks multiple sockets/tabs per user before marking offline.

## 13. Middleware

### `authenticate.js`

Protects HTTP routes.

Flow:

1. Read access token cookie.
2. Verify access JWT with the public key.
3. Check access JTI blacklist.
4. Check refresh session exists.
5. Confirm access JTI is the latest one for that session.
6. Load user.
7. Attach `req.user` and `req.auth`.

### `socketAuthenticate.js`

Protects Socket.IO connections.

Flow:

1. Parse cookies from socket handshake headers.
2. Read access token cookie.
3. Verify access JWT.
4. Check blacklist and refresh session.
5. Load user.
6. Attach user to `socket.user`.

### `uploadImage.js`

Exports:

- `uploadProfileImage`
- `uploadGroupImage`

Purpose:

- accepts one file under field name `avatar`.
- uses Multer memory storage.
- allows JPG, PNG, and WEBP.
- enforces a 5MB file size limit.

### `validateRequest.js`

Reads express-validator results and converts validation failures into `ApiError(400, "Validation failed")`.

### `errorHandler.js`

Handles:

- `ApiError`
- Mongoose validation errors.
- Mongoose cast errors.
- duplicate key errors.
- Multer errors.
- unknown errors.

Response shape:

```js
{
  status: false,
  message,
  code,
  errors,
  stack
}
```

`stack` is hidden in production.

## 14. Validation Modules

### `auth.validation.js`

Validates:

- register body.
- login body.
- profile update body.
- password update body.

### `user.validation.js`

Validates user search query `q`.

### `conversation.validation.js`

Validates:

- direct conversation participant id.
- conversation id route params.
- group creation payload.
- group update payload.
- add-member payload.
- member id route params.

### `message.validation.js`

Validates:

- send-message payload.
- message id route params.

## 15. Controllers and Routes

### Auth Routes

Base: `/api/auth`

```txt
POST /register
POST /login
POST /refresh
GET /me
PATCH /profile
PATCH /password
PATCH /avatar
DELETE /avatar
POST /logout
POST /logout-all
```

### User Routes

Base: `/api/users`

```txt
GET /search?q=<query>
```

### Conversation Routes

Base: `/api/conversations`

```txt
GET /
POST /direct
POST /groups
GET /:conversationId/messages
POST /:conversationId/seen
POST /:conversationId/leave
PATCH /:conversationId/group
POST /:conversationId/members
DELETE /:conversationId/members/:memberId
DELETE /:conversationId/group
```

### Message Routes

Base: `/api/messages`

```txt
POST /
GET /:messageId/attachments/:attachmentId/url
DELETE /:messageId
```

## 16. Auth Flows

### Register

1. Validate name, email, and password.
2. Hash password.
3. Create user.
4. Create refresh session.
5. Sign RS256 access and refresh tokens.
6. Set HTTP-only cookies.
7. Return safe user.

### Login

1. Validate email and password.
2. Load user with password hash.
3. Compare password.
4. Create refresh session.
5. Sign tokens.
6. Set cookies.
7. Return safe user.

### App Start / Get Me

1. Frontend calls `GET /auth/me`.
2. Browser sends access cookie.
3. Backend verifies token and session.
4. Backend returns safe user.

If access token is expired, frontend refresh guard calls `POST /auth/refresh`, then retries the original request.

### Refresh

1. Read refresh cookie.
2. Verify refresh JWT.
3. Check refresh JTI blacklist.
4. Find matching refresh session document.
5. Load user.
6. Create a new access token.
7. Update session's latest access JTI.
8. Set new access cookie.
9. Return safe user.

### Logout Current Session

1. Authenticate access cookie.
2. Find current refresh session.
3. Blacklist current access and refresh JTIs.
4. Delete current session.
5. Clear cookies.

### Logout All Sessions

1. Authenticate access cookie.
2. Load all sessions for the user.
3. Blacklist all known JTIs.
4. Delete all sessions.
5. Clear cookies for current browser.

## 17. Profile Flows

### Update Profile

Route: `PATCH /api/auth/profile`

Updates only `name`. Email is intentionally immutable in this API.

### Update Password

Route: `PATCH /api/auth/password`

Flow:

1. Load user with password hash.
2. Compare current password.
3. Reject same-password reuse.
4. Hash new password.
5. Save user.

### Update Avatar

Route: `PATCH /api/auth/avatar`

Flow:

1. Authenticate user.
2. Accept image under `avatar` field.
3. Upload image to ImageKit.
4. Store ImageKit URL and file id.
5. Delete previous avatar if present.

### Remove Avatar

Route: `DELETE /api/auth/avatar`

Deletes the ImageKit file when present and clears avatar fields.

## 18. Direct Chat Flow

### Start Direct Conversation

Route: `POST /api/conversations/direct`

Body:

```js
{
  participantId
}
```

Flow:

1. Verify target user exists.
2. Create a stable `directKey` from both user ids.
3. Create conversation if missing.
4. Otherwise reveal existing conversation to starter.
5. Emit `conversation:created` to starter.

### List Conversations

Route: `GET /api/conversations`

Returns conversations where current user is in `visibleTo`, including current-user-specific unread counts.

### Get Messages

Route: `GET /api/conversations/:conversationId/messages`

Requires participant access and returns messages in ascending creation order.

### Mark Seen

Route: `POST /api/conversations/:conversationId/seen`

Flow:

1. Verify participant access.
2. Add current user to `readBy` for incoming unread messages.
3. Emit `messages:seen`.
4. Emit per-user `conversation:updated` payloads.

### Send Message

Route: `POST /api/messages`

Body:

```js
{
  conversationId,
  body,
  type,
  clientTempId
}
```

Text messages use JSON. Media/file messages use multipart form data:

```txt
conversationId=<conversation id>
clientTempId=<client temp id>
body=<optional caption>
attachment=<file>
```

Optimized flow:

1. Verify participant access.
2. Emit a pending realtime message immediately.
3. If a file is present, upload it to ImageKit as a private file with `isPrivateFile: true`.
4. Save the message in MongoDB.
5. Save only private attachment metadata, not a permanent public URL.
6. Add all participants to `visibleTo`.
7. Update conversation last-message metadata.
8. Emit final saved message.
9. Emit per-user conversation updates.
10. Return saved message and current user's conversation payload.

Attachment metadata stored in MongoDB:

- private ImageKit path.
- ImageKit file id.
- original file name.
- MIME type.
- file size.
- attachment kind: `image`, `video`, `audio`, or `file`.

Serialized message payloads do not expose the private ImageKit path.

### Get Attachment Signed URL

Route: `GET /api/messages/:messageId/attachments/:attachmentId/url`

Purpose:

- returns a short-lived signed URL for one private attachment.
- protects direct and group chat media using conversation participant checks.

Flow:

1. Authenticate current user.
2. Load the message.
3. Reject deleted/missing messages.
4. Verify current user is a participant in the message conversation.
5. Find the attachment by id.
6. Generate a signed ImageKit URL with a short expiry.
7. Return the signed URL.

Response:

```js
{
  status: true,
  url,
  expiresIn: 300
}
```

### Delete / Unsend Message

Route: `DELETE /api/messages/:messageId`

Rules:

- only the sender can delete the message.
- system messages cannot be deleted.
- message document remains in the timeline.

Flow:

1. Verify sender owns the message.
2. Clear body and attachments.
3. Set `isDeleted` and `deletedAt`.
4. Update last-message preview if needed.
5. Emit `message:deleted` and `conversation:updated`.

## 19. Group Chat Flow

### Create Group

Route: `POST /api/conversations/groups`

Request:

- multipart form data.
- `name`.
- `participantIds` as JSON string or repeated values.
- optional `avatar` image file.

Flow:

1. Authenticate creator.
2. Upload optional group avatar to ImageKit.
3. Add creator plus selected members as participants.
4. Add creator as admin.
5. Add all participants to `visibleTo`.
6. Emit `conversation:created` to every participant.

### Leave Group

Route: `POST /api/conversations/:conversationId/leave`

Flow:

1. Verify current user is a group participant.
2. Remove user from `participants` and `visibleTo`.
3. Remove user from `admins`.
4. Promote another admin if needed.
5. Create a `system` message such as `<name> left this group`.
6. Emit `conversation:removed` to the leaving user.
7. Emit `message:new` and `conversation:updated` to remaining members.

## 20. Group Management Flow

All group management routes require group admin access.

### Update Group

Route: `PATCH /api/conversations/:conversationId/group`

Request:

- multipart form data.
- optional `name`.
- optional `avatar`.

Flow:

1. Verify current user is participant and admin.
2. Update name when provided.
3. Upload new avatar when provided.
4. Delete old avatar when replaced.
5. Emit `conversation:updated` to members.

### Add Members

Route: `POST /api/conversations/:conversationId/members`

Body:

```js
{
  participantIds
}
```

Flow:

1. Verify admin.
2. Remove duplicate ids.
3. Filter out existing members.
4. Verify users exist.
5. Add new users to `participants` and `visibleTo`.
6. Emit `conversation:created` to new members.
7. Emit `conversation:updated` to existing members.

### Remove Member

Route: `DELETE /api/conversations/:conversationId/members/:memberId`

Rules:

- admin cannot remove self through this route.
- self-removal uses leave group.

Flow:

1. Verify admin.
2. Verify target member belongs to group.
3. Remove member from `participants`, `visibleTo`, and `admins`.
4. Emit `conversation:removed` to removed member.
5. Emit `conversation:updated` to remaining members.

### Delete Group

Route: `DELETE /api/conversations/:conversationId/group`

Flow:

1. Verify admin.
2. Collect participant ids.
3. Delete all messages for the conversation.
4. Delete the conversation.
5. Delete group avatar from ImageKit when present.
6. Emit `conversation:removed` to every participant.

## 21. Socket.IO Flow

Socket server file: `api/src/lib/socket.js`

Connection behavior:

1. Socket auth middleware verifies access cookie.
2. Socket joins `user:<id>` room.
3. First active socket marks user online.
4. Presence is emitted to conversation participants.
5. Last disconnected socket marks user offline and updates `lastSeen`.
6. Typing events are verified by conversation membership and forwarded to other participants.

Client emits:

```txt
typing:start
typing:stop
```

Server emits:

```txt
conversation:created
conversation:updated
conversation:removed
message:new
message:deleted
messages:seen
typing:started
typing:stopped
user:presence
```

## 22. Production Frontend Serving

The backend can serve the production React build.

Frontend build should use:

```env
VITE_API_URL=/api
```

Build command:

```powershell
$env:VITE_API_URL="/api"
npm --prefix web run build
```

Copy `web/dist` into:

```txt
api/views/
```

Express then serves:

- `/api/*` as backend APIs.
- `/health` as health check.
- `/assets/*` as frontend assets.
- all other non-API routes through React Router.

Production start from repo root:

```bash
npm --prefix api start
```

Production start when Render root directory is `api`:

```bash
npm start
```

## 23. Security Notes

- Passwords are hashed with bcrypt.
- Tokens are stored in HTTP-only cookies.
- Frontend never stores tokens.
- JWTs use RS256.
- Refresh tokens are hashed before storage.
- Token JTI blacklist blocks logged-out tokens.
- Latest access JTI check invalidates older access tokens after refresh.
- Logout-all deletes all refresh sessions.
- Redis should be used in production for persistent blacklist behavior.
- Profile and group avatar uploads accept only JPG, PNG, and WEBP.
- Avatar uploads are limited to 5MB.
- Chat attachments are uploaded to ImageKit as private files.
- Chat attachment URLs are generated only after participant access checks.
- Signed attachment URLs are short-lived.
- Uploaded files go directly from memory buffer to ImageKit.
- User search is protected.
- Socket connections are protected by the same access cookie.
- Conversation APIs verify participant access.
- Group management APIs require admin access.
- Only message senders can unsend their own messages.
- System messages cannot be deleted.

## 24. Current Limitations

- Refresh token rotation is not full rotation; only the access token rotates.
- Redis memory fallback is only for development.
- Rate limiting is not implemented yet.
- Email verification is not implemented yet.
- Attachment upload limit is currently 50MB per message.

## 25. Verification Commands

Backend syntax check:

```bash
node --check src/server.js
```

Frontend build:

```bash
npm --prefix ../web run build
```

Backend dev server:

```bash
npm run dev
```

Backend production server:

```bash
npm start
```
