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
- HTTP-only cookie auth
- RS256 JWT signing
- MongoDB session tracking
- Redis token blacklist
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
    jwtKeys.js
    redis.js
  controllers/
    auth.controller.js
  lib/
    socket.js
  middlewares/
    authenticate.js
    errorHandler.js
    validateRequest.js
  models/
    RefreshSession.js
    User.js
  routes/
    auth.routes.js
  services/
    auth.service.js
    tokenBlacklist.service.js
  utils/
    ApiError.js
    cookies.js
    crypto.js
    duration.js
    serializeUser.js
    tokens.js
  validations/
    auth.validation.js
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
- Mount not found handler.
- Mount global error handler.

Routes:

- `GET /`
- `GET /health`
- `/api/auth/*`

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
- Keeps future chat fields like online status and last seen.

Important:

- `passwordHash` has `select: false`, so normal user queries do not return it.
- Login explicitly uses `.select("+passwordHash")`.

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

## Validations

File:

```txt
api/src/validations/auth.validation.js
```

Exports:

- `registerValidation`
- `loginValidation`

### registerValidation

Validates:

- `name`: required, 2-80 chars
- `email`: required, valid email, normalized
- `password`: required, min 6 chars

### loginValidation

Validates:

- `email`: required, valid email, normalized
- `password`: required

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

## Current Limitations

- Refresh token rotation is not complete rotation; only access token rotates.
- Redis memory fallback is only for development.
- Socket authentication is not added yet.
- Rate limiting is not added yet.
- Email verification is not added yet.

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
