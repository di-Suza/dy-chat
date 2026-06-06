# DyChat API Documentation

Ye file backend API ka detailed technical note hai. Isme auth backend ka folder structure, routes, controllers, services, models, utilities, middleware, config, and complete request flows explain kiye gaye hain.

## API Goal

Backend ka current goal authentication ko complete banana hai:

- Register
- Login
- Get current user
- Refresh session
- Logout current session
- Logout all devices
- Update profile name
- Update password with current password
- Update/remove profile picture
- Search users for starting chats later
- HTTP-only cookie auth
- RS256 JWT signing
- MongoDB session tracking
- Redis token blacklist
- ImageKit media storage
- Multer multipart image upload
- Global error handling

Socket auth abhi intentionally add nahi kiya gaya. Wo later phase me hoga.

## Runtime Stack

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
- Socket.IO base server

## Important Auth Rule

Frontend access token ya refresh token ko read, store, ya manually attach nahi karega.

Backend cookies set karta hai:

- `dychat_access`
- `dychat_refresh`

Frontend RTK Query requests me `credentials: "include"` use karta hai, so browser cookies automatically backend ko send karta hai.

## Environment Variables

File:

```txt
api/.env.example
```

Current keys:

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

## RS256 Key Setup

JWTs use RS256. This means:

- Private key signs tokens.
- Public key verifies tokens.
- Backend must have both keys.
- Frontend never sees either key.

Recommended key generation:

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

Convert both PEM files to base64:

```bash
base64 -w 0 private.pem
base64 -w 0 public.pem
```

Then paste those two base64 strings into `.env`:

```env
JWT_PRIVATE_KEY_BASE64=<base64-private-pem>
JWT_PUBLIC_KEY_BASE64=<base64-public-pem>
```

No key file path is used by the app. Keys come only from env base64 values.

Development fallback:

- If no RSA keys are configured, backend generates a temporary in-memory RSA key pair.
- This is only for local development.
- Tokens become invalid on server restart.
- Production must use real persisted keys.

## Backend Folder Structure

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
    user.controller.js
  lib/
    socket.js
  middlewares/
    authenticate.js
    errorHandler.js
    uploadImage.js
    validateRequest.js
  models/
    RefreshSession.js
    User.js
  routes/
    auth.routes.js
    user.routes.js
  services/
    auth.service.js
    imageKit.service.js
    tokenBlacklist.service.js
    user.service.js
  utils/
    ApiError.js
    cookies.js
    crypto.js
    duration.js
    serializeUser.js
    tokens.js
  validations/
    auth.validation.js
    user.validation.js
```

## App Boot Flow

File:

```txt
api/src/server.js
```

Flow:

1. Import Express app.
2. Create Node HTTP server.
3. Connect MongoDB.
4. Connect Redis.
5. Attach Socket.IO server.
6. Start listening on `env.port`.

`startServer()`:

- External services connect karata hai.
- Server ko tabhi listen karata hai jab MongoDB ready ho.
- Redis fail ho to development fallback available hai.

## Express App Flow

File:

```txt
api/src/app.js
```

Responsibilities:

- Create Express app.
- Enable CORS with `credentials: true`.
- Parse JSON bodies.
- Parse URL encoded bodies.
- Parse cookies.
- Register root route.
- Register health route.
- Mount auth routes on `/api/auth`.
- Mount user routes on `/api/users`.
- Mount not found handler.
- Mount global error handler.

Routes:

- `GET /`
- `GET /health`
- `/api/auth/*`
- `/api/users/*`

Important:

- Error handlers are mounted last.
- `/health` is before not-found handler.

## Config Modules

### `env.js`

File:

```txt
api/src/config/env.js
```

Exports a central `env` object.

It reads:

- port
- client URL
- node environment
- MongoDB URI
- Redis host/port/password
- JWT key base64 values
- token expiry settings
- cookie names/settings
- ImageKit private key/public key/url endpoint

Function:

- `toBoolean(value, fallback)`

Purpose:

- Converts string env values like `"true"` into real booleans.

### `database.js`

File:

```txt
api/src/config/database.js
```

Function:

- `connectDatabase()`

Purpose:

- Connects Mongoose to MongoDB using `env.mongoUri`.

### `redis.js`

File:

```txt
api/src/config/redis.js
```

Exports:

- `redisClient`
- `connectRedis()`

Purpose:

- Creates one shared Redis client.
- Connects Redis on server boot.
- Logs Redis errors.
- If Redis unavailable, app can still use in-memory blacklist fallback in development.

### `imageKit.js`

File:

```txt
api/src/config/imageKit.js
```

Exports:

- `isImageKitConfigured`
- `imageKit`

Purpose:

- Creates one shared ImageKit SDK client.
- Uses `IMAGE_KIT_PRIVATE`, `IMAGE_KIT_PUBLIC`, and `IMAGE_KIT_URL_ENDPOINT`.
- Gives upload/delete services a clear configured/not-configured guard.

### `jwtKeys.js`

File:

```txt
api/src/config/jwtKeys.js
```

Functions:

- `decodeBase64Pem(value)`
- `createDevelopmentKeyPair()`

Export:

- `jwtKeys`

Purpose:

- Loads RSA private/public keys.
- Supports only base64 encoded PEM env values.
- Generates temporary dev key pair only when no keys are configured.
- Throws if only one key is configured, because private/public key mismatch would break verification.

## Models

### User Model

File:

```txt
api/src/models/User.js
```

Fields:

- `name`
- `email`
- `passwordHash`
- `avatar.url`
- `avatar.publicId`
- `isOnline`
- `lastSeen`
- `createdAt`
- `updatedAt`

Purpose:

- Stores account identity.
- Stores password hash, not raw password.
- Stores profile picture URL and ImageKit file id.
- Keeps future chat fields like online status and last seen.

Important:

- `passwordHash` has `select: false`, so normal user queries do not return it.
- Login explicitly uses `.select("+passwordHash")`.
- `avatar.publicId` stores ImageKit's `fileId`; field name is kept generic for app code.

### RefreshSession Model

File:

```txt
api/src/models/RefreshSession.js
```

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
- `createdAt`
- `updatedAt`

Purpose:

- Stores one session per device/browser login.
- Lets us log out only current session.
- Lets us log out all sessions.
- Lets refresh route verify that refresh token belongs to a real active session.
- Stores only hash of refresh token.

Indexes:

- `user`
- `refreshTokenHash`
- `refreshTokenJti`
- `accessTokenJti`
- `expiresAt`
- TTL index on `expiresAt`

TTL:

- Expired refresh session docs are automatically removable by MongoDB.

## Utilities

### ApiError

File:

```txt
api/src/utils/ApiError.js
```

Class:

- `ApiError`

Purpose:

- Standard operational error type.
- Carries `statusCode`, `message`, optional `code`, optional `errors`.
- Global error handler knows how to serialize it.

### cookies.js

File:

```txt
api/src/utils/cookies.js
```

Functions:

- `setAuthCookies(res, { accessToken, refreshToken })`
- `clearAuthCookies(res)`

Purpose:

- Sets HTTP-only access/refresh cookies.
- Clears both auth cookies on logout.

Cookie options:

- `httpOnly: true`
- `path: "/"`
- `sameSite: env.cookieSameSite`
- `secure: env.cookieSecure`
- `expires` based on token expiry

### crypto.js

File:

```txt
api/src/utils/crypto.js
```

Functions:

- `createTokenHash(token)`
- `createJti()`

Purpose:

- Hash refresh tokens before storing/querying.
- Create unique JWT IDs for blacklist checks.

Hashing:

- Uses SHA-256.
- Raw refresh token is never stored in MongoDB.

### duration.js

File:

```txt
api/src/utils/duration.js
```

Functions:

- `durationToMs(duration)`
- `durationToDate(duration)`
- `secondsUntil(dateOrTimestamp)`

Purpose:

- Convert strings like `15m` or `7d` into milliseconds/date/TTL seconds.
- Used by JWT cookie expiry and Redis blacklist TTL.

Supported units:

- `s`
- `m`
- `h`
- `d`

### serializeUser.js

File:

```txt
api/src/utils/serializeUser.js
```

Function:

- `serializeUser(user)`

Purpose:

- Returns safe user object to frontend.
- Excludes `passwordHash`.

Returned fields:

- `_id`
- `name`
- `email`
- `avatar`
- `isOnline`
- `lastSeen`
- `createdAt`
- `updatedAt`

### tokens.js

File:

```txt
api/src/utils/tokens.js
```

Functions:

- `signToken({ expiresIn, jti, payload })`
- `createAccessToken({ sessionId, userId })`
- `createRefreshToken({ sessionId, userId })`
- `verifyAccessToken(token)`
- `verifyRefreshToken(token)`

Purpose:

- Create and verify JWTs using RS256.

Signing:

- Uses `jwtKeys.privateKey`.
- Uses `algorithm: "RS256"`.
- Adds `jwtid`.
- Adds `subject`.

Verification:

- Uses `jwtKeys.publicKey`.
- Allows only `RS256`.
- Rejects token if `type` is wrong.

Access token payload:

```js
{
  sessionId,
  type: "access",
  userId
}
```

Refresh token payload:

```js
{
  sessionId,
  type: "refresh",
  userId
}
```

Return shape:

```js
{
  expiresAt,
  jti,
  token
}
```

## Services

### tokenBlacklist.service.js

File:

```txt
api/src/services/tokenBlacklist.service.js
```

Private values/functions:

- `memoryBlacklist`
- `createKey(type, jti)`
- `cleanupMemoryBlacklist()`

Exported functions:

- `blacklistTokenJti({ expiresAt, jti, type })`
- `isTokenJtiBlacklisted({ jti, type })`

Purpose:

- Invalidates tokens before natural expiry.
- Uses Redis when connected.
- Uses memory fallback in development if Redis is unavailable.

Redis key format:

```txt
blacklist:<type>:<jti>
```

Examples:

```txt
blacklist:access:uuid
blacklist:refresh:uuid
```

TTL:

- TTL is calculated until token's original expiry.

### imageKit.service.js

File:

```txt
api/src/services/imageKit.service.js
```

Private helpers:

- `getImageKitErrorMessage(error, fallback)`
- `assertImageKitConfigured()`
- `createProfileFileName({ file, userId })`

Exported services:

- `uploadProfileImageToImageKit({ file, userId })`
- `deleteImageKitFile(publicId)`

Purpose:

- Converts multer's in-memory image buffer into a base64 data URL.
- Uploads the image into `/dychat/profile-pictures` folder on ImageKit.
- Returns `{ url, publicId }`, where `publicId` is ImageKit's `fileId`.
- Deletes old/removed ImageKit files by file id.
- Converts ImageKit SDK failures into API errors.

### user.service.js

File:

```txt
api/src/services/user.service.js
```

Private helpers:

- `escapeRegExp(value)`

Exported services:

- `searchUsers({ currentUserId, query })`

Purpose:

- Searches users by name or email.
- Excludes the authenticated user from results.
- Escapes regex-sensitive characters before building MongoDB regex filters.
- Limits results to 12 users.
- Returns serialized safe user objects only.

### auth.service.js

File:

```txt
api/src/services/auth.service.js
```

Private helpers:

- `buildSessionTokens({ sessionId, userId })`
- `createSession({ meta, user })`
- `blacklistSession(session)`
- `getUserOrThrow(userId)`

Exported services:

- `registerUser({ email, name, password }, meta)`
- `loginUser({ email, password }, meta)`
- `refreshAuthSession(refreshTokenValue, meta)`
- `updateUserProfile({ name, userId })`
- `updateUserPassword({ currentPassword, newPassword, userId })`
- `updateUserAvatar({ file, userId })`
- `removeUserAvatar({ userId })`
- `logoutSession({ accessExpiresAt, accessJti, refreshTokenValue, sessionId, userId })`
- `logoutAllSessions({ accessExpiresAt, accessJti, userId })`

#### buildSessionTokens

Creates access and refresh token objects for one session id.

#### createSession

Flow:

1. Create Mongo ObjectId for session.
2. Create access token.
3. Create refresh token.
4. Store session document.
5. Store refresh token hash.
6. Store latest access token JTI.
7. Return token objects.

#### blacklistSession

Flow:

1. Read refresh session document.
2. Blacklist refresh token JTI.
3. Blacklist current access token JTI.

#### getUserOrThrow

Loads user by id.

If user deleted:

- throws `ApiError(401, "User no longer exists")`.

#### registerUser

Flow:

1. Normalize email.
2. Check duplicate email.
3. Hash password with bcrypt.
4. Create user.
5. Create refresh session.
6. Return safe user and token objects.

#### loginUser

Flow:

1. Find user by normalized email.
2. Include password hash.
3. Compare password.
4. Create refresh session.
5. Return safe user and token objects.

#### refreshAuthSession

Flow:

1. Ensure refresh cookie exists.
2. Verify refresh JWT using public key.
3. Check refresh JTI blacklist.
4. Find matching session by:
   - session id
   - user id
   - refresh token hash
   - refresh token JTI
5. If session missing, blacklist refresh JTI.
6. If session expired, blacklist session and delete it.
7. Load user.
8. Create new access token.
9. Update session's latest access JTI.
10. Update session metadata.
11. Return new access token and safe user.

Important:

- Refresh token itself is not rotated in this version.
- Access token rotates on refresh.
- Session keeps only latest access token JTI.

#### updateUserProfile

Flow:

1. Load authenticated user.
2. Update only `name`.
3. Save user.
4. Return serialized user.

Email is intentionally immutable in this API.

#### updateUserPassword

Flow:

1. Load authenticated user with `+passwordHash`.
2. Compare `currentPassword` with stored hash.
3. Reject invalid current password.
4. Reject same password reuse.
5. Hash `newPassword`.
6. Save user.
7. Return serialized user.

#### updateUserAvatar

Flow:

1. Ensure multipart image file exists.
2. Load authenticated user.
3. Store old avatar ImageKit file id.
4. Upload new image to ImageKit through `imageKit.service.js`.
5. Save new `avatar.url` and `avatar.publicId` on user.
6. Try to delete old ImageKit file after new avatar is saved.
7. Return serialized user.

Important:

- Upload field name is `avatar`.
- Allowed file types are JPG, PNG, and WEBP.
- Max upload size is 5MB.

#### removeUserAvatar

Flow:

1. Load authenticated user.
2. If user has `avatar.publicId`, delete that file from ImageKit.
3. Clear `avatar.url` and `avatar.publicId` in user document.
4. Save user.
5. Return serialized user.

#### logoutSession

Flow:

1. Build query for current session.
2. If refresh cookie exists, match its hash.
3. Find session.
4. Blacklist session token JTIs.
5. Delete current session.
6. Blacklist current access JTI as backup.

#### logoutAllSessions

Flow:

1. Find all sessions for user.
2. Blacklist all known session token JTIs.
3. Delete all sessions for user.
4. Blacklist current access JTI as backup.

## Middleware

### authenticate.js

File:

```txt
api/src/middlewares/authenticate.js
```

Function:

- `authenticate(req, res, next)`

Purpose:

- Protect private routes.

Used by:

- `GET /api/auth/me`
- `PATCH /api/auth/profile`
- `PATCH /api/auth/password`
- `PATCH /api/auth/avatar`
- `DELETE /api/auth/avatar`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `GET /api/users/search`

Flow:

1. Read access token cookie.
2. Verify access JWT using public key.
3. Check access JTI blacklist.
4. Find matching refresh session.
5. Confirm session's latest `accessTokenJti` matches token JTI.
6. Load user.
7. Attach user to `req.user`.
8. Attach token/session data to `req.auth`.
9. Call `next()`.

Rejects when:

- Access cookie missing.
- Token invalid/expired.
- Token is blacklisted.
- Session deleted.
- Access token is no longer latest for session.
- User deleted.

### uploadImage.js

File:

```txt
api/src/middlewares/uploadImage.js
```

Export:

- `uploadProfileImage`

Purpose:

- Accepts one multipart file field named `avatar`.
- Uses multer memory storage, so no temporary local files are written.
- Allows only `image/jpeg`, `image/png`, and `image/webp`.
- Rejects files larger than 5MB.
- Places the accepted file on `req.file` for the avatar controller.

### validateRequest.js

File:

```txt
api/src/middlewares/validateRequest.js
```

Function:

- `validateRequest(req, res, next)`

Purpose:

- Reads express-validator result.
- Converts validation failures into `ApiError(400, "Validation failed")`.
- Sends structured field errors to global error middleware.

### errorHandler.js

File:

```txt
api/src/middlewares/errorHandler.js
```

Private function:

- `normalizeError(error)`

Exported middleware:

- `notFoundHandler(req, res, next)`
- `globalErrorHandler(error, req, res, next)`

Purpose:

- Standardizes all API errors.

Handles:

- `ApiError`
- Mongoose validation error
- Mongoose cast error
- Multer file upload error
- duplicate key error
- unknown error

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

Production:

- Hides stack.

Development:

- Includes stack for debugging.

Logging rule:

- Expected operational 4xx errors like missing access/refresh cookies are returned to the client but not printed as stack traces.
- 5xx or non-operational errors are still logged.

## Validations

File:

```txt
api/src/validations/auth.validation.js
api/src/validations/user.validation.js
```

Exports:

- `registerValidation`
- `loginValidation`
- `updateProfileValidation`
- `updatePasswordValidation`
- `searchUsersValidation`

### registerValidation

Validates:

- `name`: required, 2-80 chars
- `email`: required, valid email, normalized
- `password`: required, min 6 chars

### loginValidation

Validates:

- `email`: required, valid email, normalized
- `password`: required

### updateProfileValidation

Validates:

- `name`: required, 2-80 chars

Email is not validated because this route does not allow email changes.

### updatePasswordValidation

Validates:

- `currentPassword`: required
- `newPassword`: required, min 6 chars

### searchUsersValidation

Validates:

- query `q`: required, 1-80 chars

## Controllers

File:

```txt
api/src/controllers/auth.controller.js
```

Private helper:

- `getRequestMeta(req)`

Controllers:

- `register(req, res)`
- `login(req, res)`
- `refresh(req, res)`
- `getMe(req, res)`
- `updateProfile(req, res)`
- `updatePassword(req, res)`
- `updateAvatar(req, res)`
- `removeAvatar(req, res)`
- `logout(req, res)`
- `logoutAll(req, res)`

### getRequestMeta

Returns:

```js
{
  ip,
  userAgent
}
```

Purpose:

- Store session metadata in `RefreshSession`.

### register

Flow:

1. Receives validated body.
2. Calls `registerUser`.
3. Sets access and refresh cookies.
4. Sends `201`.
5. Returns user.

### login

Flow:

1. Receives validated body.
2. Calls `loginUser`.
3. Sets access and refresh cookies.
4. Returns user.

### refresh

Flow:

1. Reads refresh cookie.
2. Calls `refreshAuthSession`.
3. Sets new access cookie.
4. Returns user.

### getMe

Flow:

1. Uses `req.user` from `authenticate`.
2. Serializes user.
3. Returns user.

### updateProfile

Flow:

1. Uses `req.user` from `authenticate`.
2. Reads validated `name`.
3. Calls `updateUserProfile`.
4. Returns updated user.

### updatePassword

Flow:

1. Uses `req.user` from `authenticate`.
2. Reads `currentPassword` and `newPassword`.
3. Calls `updateUserPassword`.
4. Returns updated user.

### updateAvatar

Flow:

1. Uses `req.user` from `authenticate`.
2. Reads `req.file` from multer's `uploadProfileImage`.
3. Calls `updateUserAvatar`.
4. Returns updated user.

### removeAvatar

Flow:

1. Uses `req.user` from `authenticate`.
2. Calls `removeUserAvatar`.
3. Returns updated user with empty avatar fields.

### logout

Flow:

1. Uses `req.auth` from `authenticate`.
2. Reads refresh cookie.
3. Calls `logoutSession`.
4. Clears auth cookies.
5. Returns success message.

### logoutAll

Flow:

1. Uses `req.auth` from `authenticate`.
2. Calls `logoutAllSessions`.
3. Clears auth cookies.
4. Returns success message.

### user.controller.js

File:

```txt
api/src/controllers/user.controller.js
```

Controller:

- `searchUserList(req, res)`

#### searchUserList

Flow:

1. Uses `req.user` from `authenticate`.
2. Reads validated query `q`.
3. Calls `searchUsers`.
4. Returns matching safe users.

## Routes

File:

```txt
api/src/routes/auth.routes.js
```

Base:

```txt
/api/auth
```

### POST /api/auth/register

Middleware:

- `registerValidation`
- `validateRequest`

Controller:

- `register`

Request:

```js
{
  name,
  email,
  password
}
```

Response:

```js
{
  status: true,
  message: "Registered successfully",
  user
}
```

Cookies set:

- access
- refresh

### POST /api/auth/login

Middleware:

- `loginValidation`
- `validateRequest`

Controller:

- `login`

Request:

```js
{
  email,
  password
}
```

Response:

```js
{
  status: true,
  message: "Logged in successfully",
  user
}
```

Cookies set:

- access
- refresh

### POST /api/auth/refresh

Middleware:

- none

Controller:

- `refresh`

Request:

- refresh cookie only

Response:

```js
{
  status: true,
  message: "Session refreshed",
  user
}
```

Cookies set:

- new access cookie

### GET /api/auth/me

Middleware:

- `authenticate`

Controller:

- `getMe`

Request:

- access cookie

Response:

```js
{
  status: true,
  user
}
```

### PATCH /api/auth/profile

Middleware:

- `authenticate`
- `updateProfileValidation`
- `validateRequest`

Controller:

- `updateProfile`

Request:

```js
{
  name
}
```

Response:

```js
{
  status: true,
  message: "Profile updated successfully",
  user
}
```

### PATCH /api/auth/password

Middleware:

- `authenticate`
- `updatePasswordValidation`
- `validateRequest`

Controller:

- `updatePassword`

Request:

```js
{
  currentPassword,
  newPassword
}
```

Response:

```js
{
  status: true,
  message: "Password updated successfully",
  user
}
```

### PATCH /api/auth/avatar

Middleware:

- `authenticate`
- `uploadProfileImage`

Controller:

- `updateAvatar`

Request:

- access cookie
- multipart form data
- file field name: `avatar`

Response:

```js
{
  status: true,
  message: "Profile picture updated successfully",
  user
}
```

Side effects:

- uploads new image to ImageKit
- saves `avatar.url` and ImageKit `fileId`
- deletes previous ImageKit file when one exists

### DELETE /api/auth/avatar

Middleware:

- `authenticate`

Controller:

- `removeAvatar`

Request:

- access cookie

Response:

```js
{
  status: true,
  message: "Profile picture removed successfully",
  user
}
```

Side effects:

- deletes current ImageKit file when one exists
- clears `avatar.url` and `avatar.publicId`

### POST /api/auth/logout

Middleware:

- `authenticate`

Controller:

- `logout`

Request:

- access cookie
- refresh cookie if present

Response:

```js
{
  status: true,
  message: "Logged out successfully"
}
```

Side effects:

- current session deleted
- current token JTIs blacklisted
- cookies cleared

### POST /api/auth/logout-all

Middleware:

- `authenticate`

Controller:

- `logoutAll`

Request:

- access cookie

Response:

```js
{
  status: true,
  message: "Logged out from all devices"
}
```

Side effects:

- all user sessions deleted
- all known token JTIs blacklisted
- cookies cleared

### GET /api/users/search

Route file:

```txt
api/src/routes/user.routes.js
```

Middleware:

- `authenticate`
- `searchUsersValidation`
- `validateRequest`

Controller:

- `searchUserList`

Request:

- access cookie
- query string `q`

Example:

```txt
GET /api/users/search?q=rahul
```

Response:

```js
{
  status: true,
  users
}
```

Behavior:

- searches user `name` and `email`
- excludes the authenticated user
- returns at most 12 users
- returns safe serialized user fields

## Complete Auth Flows

### App Start

1. Frontend loads.
2. `AuthInitializer` calls `GET /auth/me`.
3. Browser sends access cookie automatically.
4. If access valid, backend returns user.
5. If access expired, frontend base query sees `401`.
6. Frontend calls `POST /auth/refresh`.
7. Backend verifies refresh cookie.
8. Backend sets new access cookie.
9. Frontend retries `GET /auth/me`.
10. User lands in private app.

### Register Flow

1. User submits name/email/password.
2. Frontend calls `POST /auth/register`.
3. Backend validates body.
4. Backend creates user.
5. Backend creates session.
6. Backend signs RS256 tokens.
7. Backend sets HTTP-only cookies.
8. Frontend receives user only.
9. Frontend Redux auth user is set.
10. User redirects to `/app`.

### Login Flow

1. User submits email/password.
2. Frontend calls `POST /auth/login`.
3. Backend validates body.
4. Backend verifies password.
5. Backend creates session.
6. Backend signs RS256 tokens.
7. Backend sets HTTP-only cookies.
8. Frontend receives user only.
9. User redirects to `/app`.

### Protected Request Flow

1. Frontend calls protected API.
2. Browser sends access cookie.
3. `authenticate` verifies access token.
4. `authenticate` checks blacklist.
5. `authenticate` checks session and latest access JTI.
6. Controller runs.

### Profile Update Flow

1. User opens profile modal.
2. User edits name.
3. Frontend calls `PATCH /auth/profile`.
4. Backend authenticates access cookie.
5. Backend validates name.
6. Backend updates only `name`.
7. Frontend receives updated user.
8. Auth slice stores updated user.

### Password Update Flow

1. User opens profile modal.
2. User enters current password and new password.
3. Frontend calls `PATCH /auth/password`.
4. Backend authenticates access cookie.
5. Backend validates body.
6. Backend verifies current password.
7. Backend hashes and saves new password.
8. Frontend shows success state.

### Profile Picture Update Flow

1. User opens profile modal.
2. User selects an image.
3. Frontend creates `FormData` and appends file under `avatar`.
4. Frontend calls `PATCH /auth/avatar`.
5. Backend authenticates access cookie.
6. Multer validates image type and file size.
7. Backend uploads the image buffer to ImageKit.
8. Backend saves ImageKit URL and file id on `user.avatar`.
9. Backend deletes old ImageKit file if user already had one.
10. Frontend receives updated user and auth slice updates avatar everywhere.

### Profile Picture Remove Flow

1. User opens profile modal.
2. User clicks remove.
3. Frontend calls `DELETE /auth/avatar`.
4. Backend authenticates access cookie.
5. Backend deletes current ImageKit file when `avatar.publicId` exists.
6. Backend clears `avatar.url` and `avatar.publicId`.
7. Frontend receives updated user and shows fallback avatar.

### User Search Flow

1. User clicks center search box in the private navbar.
2. Frontend opens the user search modal.
3. User types a name or email.
4. Frontend debounces input and calls `GET /users/search?q=...`.
5. Backend authenticates access cookie.
6. Backend validates query `q`.
7. Backend searches `name` and `email`, excluding current user.
8. Backend returns matching safe user objects.
9. Frontend renders users with `Start chat` button.

Important:

- `Start chat` now creates or reveals a direct conversation.
- The conversation appears only in the starter's sidebar until the first message is sent.

### Refresh Flow

1. Protected API returns `401`.
2. Frontend auth guard calls `/auth/refresh`.
3. Browser sends refresh cookie.
4. Backend verifies refresh token with public key.
5. Backend checks refresh blacklist.
6. Backend checks session document.
7. Backend creates new access token with private key.
8. Backend updates session's latest access JTI.
9. Backend sets new access cookie.
10. Frontend retries old API.

### Logout Current Flow

1. Frontend calls `/auth/logout`.
2. Backend authenticates access cookie.
3. Backend finds current session.
4. Backend blacklists current access and refresh JTIs.
5. Backend deletes current session.
6. Backend clears cookies.
7. Frontend clears user state/cache.

### Logout All Flow

1. Frontend calls `/auth/logout-all`.
2. Backend authenticates access cookie.
3. Backend finds all sessions for user.
4. Backend blacklists all stored JTIs.
5. Backend deletes all sessions.
6. Backend clears cookies for current browser.
7. Frontend clears user state/cache.

## Direct Chat APIs And Realtime

This phase adds one-to-one chat backend and socket behavior.

New backend files:

```txt
api/src/controllers/conversation.controller.js
api/src/controllers/message.controller.js
api/src/middlewares/socketAuthenticate.js
api/src/models/Conversation.js
api/src/models/Message.js
api/src/routes/conversation.routes.js
api/src/routes/message.routes.js
api/src/services/conversation.service.js
api/src/services/message.service.js
api/src/services/realtime.service.js
api/src/utils/serializeConversation.js
api/src/utils/serializeMessage.js
api/src/validations/conversation.validation.js
api/src/validations/message.validation.js
```

### Conversation Model

File:

```txt
api/src/models/Conversation.js
```

Important fields:

- `type`: `direct` or `group`
- `directKey`: sorted direct participant ids for unique one-to-one chat
- `participants`: all users in the conversation
- `visibleTo`: users who should see this conversation in sidebar
- `createdBy`
- `lastMessage`
- `lastMessageAt`
- `lastMessagePreview`
- `lastMessageSender`

Important behavior:

- `participants` always stores both direct chat users.
- `visibleTo` can initially contain only the starter.
- First sent message adds all participants to `visibleTo`.

### Message Model

File:

```txt
api/src/models/Message.js
```

Important fields:

- `conversation`
- `sender`
- `body`
- `type`: `text`, `image`, `file`, `video`, `audio`
- `attachments`
- `readBy`
- `clientTempId`

Purpose:

- Stores message content and future media metadata.
- Stores per-user read receipts for seen/unseen logic.
- Echoes `clientTempId` so frontend optimistic messages can be replaced.

### Conversation Services

File:

```txt
api/src/services/conversation.service.js
```

Exports:

- `listUserConversations({ userId })`
- `createDirectConversation({ participantId, userId })`
- `getConversationForParticipant({ conversationId, userId })`
- `listConversationMessages({ conversationId, userId })`
- `markConversationMessagesSeen({ conversationId, userId })`
- `getConversationParticipantIds({ conversationId, userId })`
- `getPresenceRecipientIds(userId)`
- `serializeConversationForUser({ conversation, userId })`

Core responsibilities:

- Create/reveal one-to-one conversations.
- Keep conversation sidebar visibility separate from participants.
- Calculate unread message counts per current user.
- Mark incoming messages as seen.
- Return participant ids for typing and presence events.

### Message Service

File:

```txt
api/src/services/message.service.js
```

Export:

- `sendConversationMessage({ body, clientTempId, conversationId, senderId, type })`

Flow:

1. Validate message body/type.
2. Verify sender is a conversation participant.
3. Create message document.
4. Mark sender as read in `readBy`.
5. Add all participants to conversation `visibleTo`.
6. Update last message metadata.
7. Return serialized message and per-user conversation payloads.

### Realtime Service

File:

```txt
api/src/services/realtime.service.js
```

Exports:

- `registerRealtimeServer(io)`
- `addUserConnection({ socketId, userId })`
- `removeUserConnection({ socketId, userId })`
- `emitToUser({ event, payload, userId })`
- `emitConversationCreated({ conversation, userId })`
- `emitConversationUpdated({ conversation, userId })`
- `emitMessageCreated({ message, userId })`
- `emitMessagesSeen({ conversationId, seenBy, userIds })`
- `emitTypingStarted({ conversationId, user, userIds })`
- `emitTypingStopped({ conversationId, user, userIds })`
- `emitUserPresence({ isOnline, lastSeen, userId, userIds })`

Purpose:

- Keeps socket event names centralized.
- Emits to per-user rooms like `user:<id>`.
- Tracks multiple tabs/devices before marking a user offline.

### Socket Auth Flow

File:

```txt
api/src/middlewares/socketAuthenticate.js
```

Flow:

1. Parse access cookie from Socket.IO handshake headers.
2. Verify RS256 access token.
3. Check access token blacklist.
4. Check refresh session exists.
5. Check access JTI is latest for the session.
6. Load user and attach it to `socket.user`.

Socket connection behavior in `api/src/lib/socket.js`:

1. Authenticated socket joins `user:<id>` room.
2. First active socket marks user `isOnline: true`.
3. Presence is emitted to conversation participants.
4. Last disconnected socket marks user `isOnline: false` and updates `lastSeen`.
5. Typing start/stop client events are verified by conversation membership and forwarded to other participants.

### Chat Routes

Base:

```txt
/api/conversations
/api/messages
```

#### GET /api/conversations

Returns visible conversations for the current user.

Response:

```js
{
  status: true,
  conversations
}
```

Each conversation includes:

- `participants`
- `otherParticipant`
- `lastMessage`
- `lastMessagePreview`
- `unreadCount`

#### POST /api/conversations/direct

Body:

```js
{
  participantId
}
```

Flow:

1. Authenticates current user.
2. Creates direct conversation if missing.
3. Otherwise reveals existing conversation to starter.
4. Emits `conversation:created` to starter.

#### GET /api/conversations/:conversationId/messages

Returns ordered messages after participant access check.

#### POST /api/conversations/:conversationId/seen

Flow:

1. Authenticates current user.
2. Marks all incoming unread messages as read by current user.
3. Emits `messages:seen`.
4. Emits per-user `conversation:updated` payloads so unread counts refresh.

#### POST /api/messages

Body:

```js
{
  conversationId,
  body,
  type,
  clientTempId
}
```

Flow:

1. Saves message.
2. Updates conversation last message metadata.
3. Adds all participants to `visibleTo`.
4. Emits `message:new` to all participants.
5. Emits `conversation:updated` to all participants with user-specific unread counts.

### Socket Events

Client emits:

- `typing:start`
- `typing:stop`

Server emits:

- `conversation:created`
- `conversation:updated`
- `message:new`
- `messages:seen`
- `typing:started`
- `typing:stopped`
- `user:presence`

### Direct Chat Flow

1. User searches another user.
2. Frontend calls `POST /conversations/direct`.
3. Backend creates/reveals conversation.
4. Starter sees conversation immediately.
5. Other participant does not see it until first message.
6. User sends message through `POST /messages`.
7. Message is saved in MongoDB.
8. Conversation becomes visible to both users.
9. Backend emits realtime message and sidebar updates.

### Seen/Unseen Flow

1. Unread count is calculated from messages where current user is not sender and is not in `readBy`.
2. Conversation list shows `unreadCount`.
3. Opening a conversation calls `POST /conversations/:id/seen`.
4. Backend adds current user to all matching messages' `readBy`.
5. Backend emits seen receipt and updated conversation counts.

## Group Chat APIs And Realtime

This phase adds group conversation support on top of the direct chat system.

Updated backend files:

```txt
api/src/models/Conversation.js
api/src/models/Message.js
api/src/controllers/conversation.controller.js
api/src/controllers/message.controller.js
api/src/routes/conversation.routes.js
api/src/routes/message.routes.js
api/src/services/conversation.service.js
api/src/services/message.service.js
api/src/services/imageKit.service.js
api/src/services/realtime.service.js
api/src/middlewares/uploadImage.js
api/src/validations/conversation.validation.js
api/src/validations/message.validation.js
```

### Group Model Fields

`Conversation` now includes:

- `name`: group name.
- `avatar.url`: ImageKit URL for group display picture.
- `avatar.publicId`: ImageKit file id.
- `admins`: group admin user ids.
- `type`: `direct` or `group`.

For groups, `participants` are current members and `visibleTo` decides whose sidebar shows the group.

`Message` now includes:

- `type: "system"` for center timeline events like a member leaving.
- `isDeleted` and `deletedAt` for unsend/delete-for-everyone.

### POST /api/conversations/groups

Creates a new group conversation.

Middleware:

- `authenticate`
- `uploadGroupImage`
- `createGroupConversationValidation`
- `validateRequest`

Request:

- multipart form data
- `name`: group name
- `participantIds`: JSON string or repeated ids
- optional file field `avatar`

Flow:

1. Authenticates creator.
2. Accepts optional group DP in memory with multer.
3. Uploads group DP to ImageKit when provided.
4. Adds creator plus selected users as unique participants.
5. Adds creator to `admins`.
6. Adds every participant to `visibleTo`.
7. Emits `conversation:created` to every participant.

Response:

```js
{
  status: true,
  conversation
}
```

### POST /api/conversations/:conversationId/leave

Removes current user from a group.

Flow:

1. Verifies current user is a group participant.
2. Removes user from `participants` and `visibleTo`.
3. Removes user from `admins`.
4. Promotes a remaining member if no admin remains.
5. Creates a `system` message like `<name> left this group`.
6. Emits `conversation:removed` to removed user.
7. Emits `message:new` and `conversation:updated` to remaining users.

### DELETE /api/messages/:messageId

Deletes/unsends a sender-owned message for everyone.

Rules:

- Only the sender can delete their message.
- System messages cannot be deleted.
- Message document remains so timeline order stays stable.

Flow:

1. Verifies sender owns the message.
2. Verifies sender still belongs to the conversation.
3. Clears message body and attachments.
4. Sets `isDeleted: true` and `deletedAt`.
5. Updates last-message preview when needed.
6. Emits `message:deleted` and `conversation:updated` to participants.

### New Service Functions

`conversation.service.js`:

- `createGroupConversation({ avatar, name, participantIds, userId })`
- `leaveGroupConversation({ conversationId, userId })`

`message.service.js`:

- `deleteConversationMessage({ messageId, userId })`

`imageKit.service.js`:

- `uploadGroupImageToImageKit({ file, userId })`

### New Realtime Events

Server emits:

- `conversation:removed`
- `message:deleted`

Typing, message, seen, and presence events are group-compatible because backend verifies conversation membership before forwarding events.

## Group Management APIs

This phase adds admin-only group management.

New routes:

```txt
PATCH /api/conversations/:conversationId/group
POST /api/conversations/:conversationId/members
DELETE /api/conversations/:conversationId/members/:memberId
DELETE /api/conversations/:conversationId/group
```

Admin rule:

- Current user must be in `conversation.admins`.
- Non-admin group members can view group details from the frontend cache, but edit APIs return `403`.

### PATCH /api/conversations/:conversationId/group

Updates group name and/or avatar.

Middleware:

- `authenticate`
- `uploadGroupImage`
- `conversationIdParamValidation`
- `updateGroupConversationValidation`
- `validateRequest`

Request:

- multipart form data
- optional `name`
- optional file field `avatar`

Flow:

1. Verifies conversation exists, is a group, and current user is participant.
2. Verifies current user is admin.
3. Updates `name` when provided.
4. Uploads new group avatar to ImageKit when provided.
5. Deletes old group avatar file when replaced.
6. Emits `conversation:updated` to all current members.

### POST /api/conversations/:conversationId/members

Adds members to a group.

Body:

```js
{
  participantIds
}
```

Flow:

1. Verifies current user is group admin.
2. Removes duplicate ids.
3. Ignores users already in the group.
4. Verifies all new users exist.
5. Adds new users to `participants`.
6. Adds new users to `visibleTo`.
7. Emits `conversation:created` to new members.
8. Emits `conversation:updated` to existing members.

### DELETE /api/conversations/:conversationId/members/:memberId

Removes one member from a group.

Rules:

- Admin cannot remove self through this route; self-removal uses leave group.
- Removed user is removed from `participants`, `visibleTo`, and `admins`.

Flow:

1. Verifies current user is group admin.
2. Verifies target user is a group member.
3. Removes target user from group arrays.
4. Emits `conversation:removed` to removed user.
5. Emits `conversation:updated` to remaining members.

### DELETE /api/conversations/:conversationId/group

Deletes the full group for all members.

Flow:

1. Verifies current user is group admin.
2. Collects participant ids.
3. Deletes all messages for the conversation.
4. Deletes the conversation.
5. Deletes group avatar from ImageKit when present.
6. Emits `conversation:removed` to every participant.

### Group Management Service Functions

`conversation.service.js` added:

- `updateGroupConversation({ avatar, conversationId, name, userId })`
- `addGroupMembers({ conversationId, participantIds, userId })`
- `removeGroupMember({ conversationId, memberId, userId })`
- `deleteGroupConversation({ conversationId, userId })`

Private helper:

- `assertGroupAdmin(conversation, userId)`

## Security Notes

- Passwords are hashed with bcrypt.
- Tokens are stored in HTTP-only cookies.
- Frontend never stores tokens.
- JWTs are RS256 signed.
- Private key signs; public key verifies.
- Refresh tokens are hashed before storage.
- Token JTI blacklist blocks logged-out tokens.
- Latest access JTI check invalidates previous access token after refresh.
- Logout-all deletes all refresh sessions.
- Redis should be used in production for persistent blacklist behavior.
- Profile picture uploads accept only JPG, PNG, and WEBP.
- Profile picture uploads are limited to 5MB.
- Uploaded files go directly from memory buffer to ImageKit; no local temp image files are saved.
- User search is protected by access-cookie auth.
- User search excludes the current authenticated user.
- Socket connections are protected by the same HTTP-only access cookie.
- Direct chat APIs verify conversation participant access.
- Group chat APIs verify conversation participant access.
- Group management APIs require group admin access.
- Group avatar uploads accept only JPG, PNG, and WEBP.
- Only a message sender can unsend/delete their own message.
- System messages cannot be deleted.
- Read receipts are stored per message in `readBy`.

## Current Limitations

- Refresh token rotation is not complete rotation; only access token rotates.
- Redis memory fallback is only for development.
- Rate limiting is not added yet.
- Email verification is not added yet.
- ImageKit credentials must be configured before avatar upload/remove can work.
- File message upload UI/API is not added yet; message schema is prepared for it.

## Verification Commands

Backend syntax:

```bash
node --check src/server.js
```

All backend JS syntax from PowerShell:

```powershell
$files = Get-ChildItem -Recurse -Filter *.js src | ForEach-Object { $_.FullName }
foreach ($file in $files) { node --check $file }
```

Frontend build:

```bash
npm --prefix ../web run build
```

Backend dev:

```bash
npm run dev
```
