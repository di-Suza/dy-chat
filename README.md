# DyChat Development Notes

DyChat is a real-time one-to-one and group chat application built with a separate backend and frontend. This document tracks the project structure, major implementation phases, architecture decisions, feature flows, and run/deployment commands.

## 1. Project Structure

The project is split into two main applications:

```txt
dychat/
  api/   -> Express, MongoDB, Redis, Socket.IO backend
  web/   -> Vite React frontend
```

This separation keeps backend and frontend dependencies isolated, makes development easier, and allows either side to be deployed independently or merged for production serving.

## 2. Root Files

### `.gitignore`

The root `.gitignore` covers common generated and local files for both apps:

- `node_modules/`: installed dependencies.
- `dist/` and `build/`: generated frontend build output.
- `.env`: local environment secrets.
- log files and editor/OS-specific files.

### `package.json`

The root `package.json` is a convenience layer for running common scripts from the repository root:

```bash
npm run dev:api
npm run dev:web
npm run start:api
npm run build:web
```

The actual backend package is in `api/package.json`, and the frontend package is in `web/package.json`.

## 3. Backend Overview

The backend uses Node.js, Express 5, MongoDB with Mongoose, Redis, Socket.IO, JWT authentication, and ImageKit.

Main backend folders:

```txt
api/src/
  app.js
  server.js
  config/
  controllers/
  lib/
  middlewares/
  models/
  routes/
  services/
  utils/
  validations/
```

### Backend Dependencies

- `express`: HTTP API server.
- `cors`: cookie-authenticated frontend requests.
- `dotenv`: environment loading.
- `mongoose`: MongoDB models and queries.
- `redis`: token blacklist storage.
- `socket.io`: realtime events.
- `bcryptjs`: password hashing.
- `jsonwebtoken`: JWT signing and verification.
- `cookie-parser`: HTTP-only auth cookie parsing.
- `express-validator`: request validation.
- `multer`: multipart image upload handling.
- `imagekit`: profile and group image storage.

### `api/src/app.js`

This file creates and configures the Express app:

- CORS with credentials.
- JSON and URL-encoded body parsing.
- Cookie parsing.
- API routes under `/api`.
- Static React build serving from `api/views`.
- Non-API route fallback to `api/views/index.html`.
- Not-found and global error middleware.

### `api/src/server.js`

This is the backend runtime entry point. It:

1. Connects MongoDB.
2. Connects Redis.
3. Creates the HTTP server.
4. Attaches Socket.IO.
5. Starts listening on the configured port.

## 4. Frontend Overview

The frontend uses React, Vite, React Router, Redux Toolkit, RTK Query, React Hook Form, Socket.IO client, and Lucide icons.

Main frontend folders:

```txt
web/src/
  app/
    error/
    hooks/
    initializers/
    layouts/
    pages/
    routes/
    store/
  features/
    auth/
    chat/
    profile/
    users/
  shared/
    api/
    services/
```

### Frontend Dependencies

- `react` and `react-dom`: UI rendering.
- `vite`: development and production build tool.
- `react-router-dom`: routing.
- `@reduxjs/toolkit` and `react-redux`: app state and RTK Query.
- `react-hook-form`: form management.
- `async-mutex`: single-flight auth refresh handling.
- `socket.io-client`: realtime client connection.
- `lucide-react`: UI icons.

## 5. Auth Architecture

Authentication is cookie-based. The frontend never stores access or refresh tokens in localStorage, sessionStorage, or Redux.

Backend sets HTTP-only cookies:

- access token cookie
- refresh token cookie

Frontend requests use `credentials: "include"`, so cookies are sent automatically.

### Auth Flow

1. User registers or logs in.
2. Backend creates a refresh session document in MongoDB.
3. Backend signs RS256 access and refresh JWTs.
4. Backend sets HTTP-only cookies.
5. Frontend stores only the safe `user` object.
6. On app start, `AuthInitializer` calls `GET /auth/me`.
7. If access token is expired, RTK Query refresh guard calls `POST /auth/refresh`.
8. If refresh succeeds, the original request is retried.
9. If refresh fails, user state and RTK Query cache are cleared.

### Auth Backend APIs

```txt
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
GET /api/auth/me
POST /api/auth/logout
POST /api/auth/logout-all
PATCH /api/auth/profile
PATCH /api/auth/password
PATCH /api/auth/avatar
DELETE /api/auth/avatar
```

### RS256 JWT Setup

JWTs use RS256:

- private key signs tokens.
- public key verifies tokens.
- keys are loaded from base64 environment variables.

Expected environment keys:

```env
JWT_PRIVATE_KEY_BASE64=
JWT_PUBLIC_KEY_BASE64=
```

## 6. Profile Management

Authenticated users can manage their profile from the private app sidebar.

Features:

- View profile modal.
- Update display name.
- Read-only email.
- Update password using current password.
- Upload or replace profile picture.
- Remove profile picture.
- Logout current session.
- Logout all sessions.

Profile images use Multer memory storage and ImageKit. Allowed formats are JPG, PNG, and WEBP, with a 5MB upload limit.

## 7. User Search

The protected user search API lets users find other users before starting a conversation.

Backend route:

```txt
GET /api/users/search?q=<query>
```

Behavior:

- Requires authentication.
- Searches by name or email.
- Excludes the current user.
- Returns safe serialized user objects.
- Limits results to 12 users.

Frontend behavior:

- Sidebar search icon opens the search modal.
- Search input is debounced.
- Results show user avatar, name, email, and `Start chat` button.
- `Start chat` creates or reveals a direct conversation but does not auto-open the chat window.

## 8. Chat UI Foundation

The private app renders a chat workspace with:

- Thin left app sidebar.
- Conversation list panel.
- Active chat window.
- Conversation search.
- Header with avatar, name, and status.
- Message bubbles.
- Typing indicator.
- Composer with attachment button, text input, and send button.

The top navbar was removed in favor of the permanent left icon sidebar.

## 9. Direct Chat Feature

Direct chat is implemented end to end.

Backend routes:

```txt
GET /api/conversations
POST /api/conversations/direct
GET /api/conversations/:conversationId/messages
POST /api/conversations/:conversationId/seen
POST /api/messages
DELETE /api/messages/:messageId
```

### Direct Conversation Rules

- `Conversation.participants` stores both users.
- `Conversation.visibleTo` controls who sees the conversation in the sidebar.
- When user A starts a chat with user B, only user A sees the conversation initially.
- When the first message is sent, the conversation becomes visible to both users.

### Message Sending Flow

The send-message flow was optimized for realtime speed:

1. Backend verifies the sender belongs to the conversation.
2. Backend immediately emits a pending realtime message with the same `clientTempId`.
3. Backend saves the message in MongoDB.
4. Backend updates conversation metadata.
5. Backend emits the final DB-backed message.
6. Frontend replaces the pending/optimistic message using `clientTempId`.

This reduces the perceived delay on production networks while keeping the database as the source of truth.

### Seen/Unseen Flow

- Unread count is calculated from messages not sent by the current user and not read by the current user.
- Conversation list shows unread count.
- Opening a conversation marks incoming unread messages as seen.
- Sidebar chat icon shows how many conversations have unread messages.

### Message Unsend

- Sender can right-click their own message and choose `Unsend message`.
- Backend marks the message as deleted instead of removing the document.
- The message remains in the timeline as `This message was deleted`.

## 10. Realtime Socket Flow

Socket.IO is authenticated with the same HTTP-only access cookie.

Connection flow:

1. Socket handshake reads cookies.
2. Access token is verified.
3. Token blacklist and refresh session are checked.
4. User is attached to the socket.
5. Socket joins `user:<id>` room.
6. First active socket marks user online.
7. Last disconnected socket marks user offline and updates `lastSeen`.

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

Client emits:

```txt
typing:start
typing:stop
```

## 11. Group Chat Feature

Group chat is implemented on top of the direct chat system.

Features:

- Sidebar actions menu with `New Chat` and `New Group`.
- Group creation modal.
- Group name.
- Optional group display picture.
- User search and multi-select members.
- Creator becomes group admin.
- Group appears immediately for all selected members.
- Offline members see the group after login.
- Group messages show sender name.
- Group typing indicator shows the typing user's name.
- Group header hides call button and shows leave button.
- Leaving a group creates a centered system message.

Backend group routes:

```txt
POST /api/conversations/groups
POST /api/conversations/:conversationId/leave
```

Group conversation fields:

- `type: "group"`
- `name`
- `avatar.url`
- `avatar.publicId`
- `admins`
- `participants`
- `visibleTo`

System messages use `type: "system"`.

## 12. Group Management Modal

Clicking the group name/avatar in the chat header opens the group details modal.

Admin users can:

- Update group name.
- Update group display picture.
- Add members.
- Remove members.
- Delete the group.

Normal members can:

- View group details.
- View member list.
- Leave the group.

Normal members cannot see edit controls.

Backend group management routes:

```txt
PATCH /api/conversations/:conversationId/group
POST /api/conversations/:conversationId/members
DELETE /api/conversations/:conversationId/members/:memberId
DELETE /api/conversations/:conversationId/group
```

All group management APIs require the current user to be a group admin.

## 13. Production Merge Build

The frontend can be served by the backend server.

Production frontend API URL:

```env
VITE_API_URL=/api
```

Reason:

- API calls use the same backend origin.
- Auth cookies work cleanly as same-origin cookies.
- Socket.IO also uses the same origin.

Build flow:

```powershell
$env:VITE_API_URL="/api"
npm --prefix web run build
```

Then copy `web/dist` contents into:

```txt
api/views/
  index.html
  assets/
```

Express serves:

- `/api/*` as backend APIs.
- `/health` as health check.
- static frontend assets from `api/views`.
- all non-API routes through `api/views/index.html`.

Production start command:

```bash
npm --prefix api start
```

If Render's root directory is set to `api`, use:

```bash
npm start
```

## 14. Run Commands

Backend dev server:

```bash
npm --prefix api run dev
```

Frontend dev server:

```bash
npm --prefix web run dev
```

Frontend production build:

```bash
npm --prefix web run build
```

Backend production server:

```bash
npm --prefix api start
```

Root convenience scripts:

```bash
npm run dev:api
npm run dev:web
npm run build:web
npm run start:api
```

## 15. Current Status

Completed:

- Backend Express server.
- MongoDB connection.
- Redis token blacklist.
- RS256 JWT auth.
- Cookie-based access and refresh flow.
- Auth initializer and route guards.
- Profile management.
- ImageKit profile avatar upload/remove.
- User search.
- Direct conversation creation.
- Realtime message delivery.
- Fast pending-message emit before DB completion.
- Typing indicators.
- Online/offline presence.
- Seen/unseen read receipts.
- Sidebar unread conversation count.
- Message unsend/delete state.
- Group creation.
- Group messaging.
- Group leave flow.
- Group management modal.
- Admin-only group edit/member/delete APIs.
- Production frontend build served from `api/views`.

Not added yet:

- Real file/image/video/audio message sending.
- Rate limiting.
- Email verification.
