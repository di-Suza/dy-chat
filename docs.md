# DyChat Development Notes

Ye file project ke saath-saath update hoti rahegi. Har major step/commit ke baad yaha short but clear notes likhenge, taaki baad me README, explanation, viva, ya submission ke time easily samajh aaye ki kya banaya aur kyu banaya.

## 1. Initial Setup

Initial setup me project ko do main parts me divide kiya gaya:

```txt
dychat/
  api/   -> backend server
  web/   -> frontend React app
```

Is structure ka reason simple hai: backend aur frontend separate rahenge, dono ke dependencies alag rahenge, aur deployment ke time bhi dono ko independently deploy karna easy rahega.

## Root Files

### `.gitignore`

Root level par `.gitignore` rakha gaya hai kyuki project ke andar `api` aur `web` dono Node based apps hain. Common generated/local files ko ignore karne ke liye ek hi root ignore file enough hai.

Important ignored items:

- `node_modules/`: installed dependencies, GitHub par push nahi karte.
- `dist/` and `build/`: generated production build output.
- `.env`: local secrets/config values.
- log files: debug output, required source code nahi.
- editor/OS files: local machine specific files.

### `package.json`

Root `package.json` convenience ke liye rakha gaya hai. Isse root folder se hi backend/frontend scripts run kar sakte hain:

```bash
npm run dev:api
npm run dev:web
npm run start:api
npm run build:web
```

Root package actual app code nahi hold karta. Actual backend package `api/package.json` me hai aur frontend package `web/package.json` me hai.

## Backend Setup: `api/`

Backend Node.js, Express, and Socket.IO par setup kiya gaya hai.

### Installed Backend Packages

- `express`: HTTP API server banane ke liye. Auth phase me Express 5 use kiya gaya, so async route handlers rejected promises ko global error middleware tak automatically forward karte hain.
- `cors`: frontend app ko backend se request allow karne ke liye.
- `dotenv`: `.env` values load karne ke liye.
- `socket.io`: real-time communication ke liye.
- `nodemon`: development me server auto-restart ke liye.
- `mongoose`: MongoDB models and database queries ke liye.
- `bcryptjs`: passwords hash/compare karne ke liye.
- `jsonwebtoken`: access and refresh JWT sign/verify karne ke liye.
- `cookie-parser`: HTTP-only auth cookies read karne ke liye.
- `express-validator`: request body validation ke liye.
- `redis`: token blacklist store karne ke liye.

### `api/.env.example`

Example environment file banayi gayi hai:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Iska purpose hai ki actual `.env` GitHub par push na ho, but required env keys ka idea rahe.

### `api/src/config/env.js`

Environment config ko ek central file me wrap kiya gaya:

```js
export const env = {
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV || "development"
};
```

Reason:

- Har file me directly `process.env.PORT` ya `process.env.CLIENT_URL` likhne ki zarurat nahi.
- Default values ek jagah maintained rahengi.
- Future me MongoDB URI, JWT key config, Cloudinary config, etc. yahi add karenge.
- Code clean rahega: `env.port`, `env.clientUrl`, `env.nodeEnv`.

### `api/src/app.js`

Express app yaha create hoti hai:

- `express()` se app instance banaya.
- `cors()` setup kiya using `env.clientUrl`.
- `express.json()` add kiya taaki JSON body parse ho sake.
- Basic routes add kiye:
  - `GET /`: API running check.
  - `GET /health`: health check endpoint.

Important: Is file me server listen nahi kar raha. Ye sirf Express app configure karta hai.

Reason:

- Express app alag file me rahegi.
- Server bootstrapping alag file me rahega.
- Later routes, middleware, auth, error handler yahi attach karenge.

### `api/src/lib/socket.js`

Socket.IO setup ko `createSocketServer` function me wrap kiya gaya:

```js
export const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.emit("server:ready", {
      socketId: socket.id,
      message: "Connected to DyChat realtime server"
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};
```

Reason:

- Socket.IO ko Express app par directly attach nahi kar sakte, uske liye HTTP server chahiye hota hai.
- Function wrapper se socket setup reusable and clean ho gaya.
- Future me yahi par real-time events add honge:
  - `message:send`
  - `message:new`
  - `typing:start`
  - `typing:stop`
  - `conversation:join`
  - `user:online`
  - `user:offline`
- Abhi koi auth middleware ya socket middleware nahi add kiya gaya, kyuki initial setup me sirf base server chahiye tha.

### `api/src/server.js`

Server entry point yahi hai:

```js
const server = http.createServer(app);

createSocketServer(server);

server.listen(env.port, () => {
  console.log(`API server running on port ${env.port}`);
});
```

Flow:

1. `app.js` se Express app import hoti hai.
2. Node ka HTTP server create hota hai.
3. Same HTTP server par Socket.IO attach hota hai.
4. Server `env.port` par listen karta hai.

Reason:

- Express HTTP APIs aur Socket.IO realtime dono same server par run karenge.
- Frontend ek hi backend URL se REST APIs and WebSocket connection use kar sakega.

## Frontend Setup: `web/`

Frontend React + Vite par setup kiya gaya hai.

### Installed Frontend Packages

- `react`: UI library.
- `react-dom`: React app ko browser DOM me mount karne ke liye.
- `vite`: fast frontend dev/build tool.
- `@vitejs/plugin-react`: Vite ke saath React support.
- `react-router-dom`: future pages/routes ke liye.
- `@reduxjs/toolkit`: Redux store and RTK Query API layer ke liye.
- `react-redux`: React components ko Redux store se connect karne ke liye.
- `react-hook-form`: auth forms manage and validate karne ke liye.
- `async-mutex`: multiple 401 requests ke time single refresh request coordinate karne ke liye.
- `axios`: initial setup me install hua tha, but current API layer RTK Query `fetchBaseQuery` use kar rahi hai.
- `socket.io-client`: realtime connection ke liye.
- `lucide-react`: icons ke liye.

### `web/index.html`

Vite app ka HTML entry point. Isme root div hai:

```html
<div id="root"></div>
```

React app isi root element me mount hoti hai.

### `web/src/main.jsx`

React app browser me yaha se start hoti hai:

```jsx
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Reason:

- `main.jsx` app ka frontend entry point hai.
- `App` component ko root DOM node me render karta hai.

### `web/src/app/`

App level files yaha rakhe gaye:

- `App.jsx`: Redux Provider, auth initializer, and RouterProvider wrap karta hai.
- `app.css`: global/base styling.
- `store/`: Redux store and app-level Redux hooks.
- `routes/`: React Router data router config.
- `layouts/`: public/private route layouts.
- `initializers/`: app start hone par required initialization logic.
- `pages/`: app-level placeholder/private pages.

Initial smoke screen remove ho chuki hai. App ab directly auth routing flow par boot hoti hai.

### `web/src/features/`

Feature-wise code yaha aayega.

Future examples:

```txt
features/auth/
features/chat/
features/groups/
```

Reason:

- Auth, chat, groups ko isolated feature folders me rakhenge.
- Codebase grow hone ke baad bhi files organized rahengi.

### `web/src/shared/`

Reusable/common code yaha aayega.

Future examples:

```txt
shared/components/
shared/lib/
shared/hooks/
shared/api/
shared/constants/
```

Reason:

- Common buttons, inputs, API client, socket client, helpers, hooks yaha maintain honge.
- Duplicate code avoid hoga.

### `.gitkeep` files

Initial setup me `features` and `shared` folders empty the, aur Git empty folders track nahi karta. Isliye `.gitkeep` rakha gaya tha taaki folder structure commit me visible rahe.

Auth feature and shared API/lib files add hone ke baad `.gitkeep` files remove kar di gayi hain.

## 2. Frontend Auth Foundation

Is phase me backend ko touch nahi kiya gaya. Sirf frontend auth architecture, routing, forms, state, and API-call layer setup kiya gaya.

Main goal:

- RTK Query based API system.
- Cookie-based access/refresh auth guard.
- Feature-based auth architecture.
- Public/private route lock.
- Login and register pages.
- React Hook Form based validation.
- User app open kare to direct login page par land kare, landing page nahi.

## Frontend Architecture Rules

Follow kiya gaya folder rule:

```txt
web/src/
  app/
    initializers/
    layouts/
    pages/
    routes/
    store/
  features/
    auth/
      api/
      lib/
      model/
      ui/
        components/
        pages/
  shared/
    api/
    lib/
```

### `app/`

App folder me app-level setup rakha gaya:

- store setup
- router setup
- public/private layouts
- app initializers
- app-level placeholder page

Ye folder kisi one feature ka business logic hold nahi karega.

### `features/auth/`

Auth feature ke andar auth se related state, API calls, UI, page logic, and feature utilities rakhe gaye.

Current auth feature structure:

```txt
features/auth/
  api/authApi.js
  lib/getAuthErrorMessage.js
  model/authSlice.js
  ui/components/
  ui/pages/LoginPage/
  ui/pages/RegisterPage/
```

Page-specific logic colocated rakha gaya:

```txt
LoginPage/
  LoginPage.jsx
  useLoginPage.js

RegisterPage/
  RegisterPage.jsx
  useRegisterPage.js
```

Reason:

- Page ka form submit, navigation, mutation call, and error handling usi page folder ke side hook me rahega.
- `features/auth/hooks` direct folder tab banayenge jab koi hook auth feature ke multiple pages/components me reuse hoga.

### `shared/`

Shared folder me sirf wo cheezein rakhi gayi jo app-wide reusable hain:

- `shared/api/baseApi.js`
- `shared/api/baseQuery.js`
- `shared/api/baseQueryWithAuthGuard.js`

Shared me auth page-specific UI ya page-specific hooks nahi rakhe gaye.

## Redux Store

Store file:

```txt
web/src/app/store/store.js
```

Isme configure kiya:

- `auth` reducer from `features/auth/model/authSlice.js`
- RTK Query reducer from `shared/api/baseApi.js`
- RTK Query middleware

Redux hooks:

```txt
web/src/app/store/hooks.js
```

Reason:

- Components directly `useDispatch` / `useSelector` import na karein.
- App-level hooks future me typed/custom behavior ke liye easy upgrade ho sakte hain.

## RTK Query API Layer

Central API file:

```txt
web/src/shared/api/baseApi.js
```

Yaha `createApi` use kiya gaya:

```js
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithAuthGuard,
  tagTypes: ["Auth", "User"],
  endpoints: () => ({})
});
```

Reason:

- Ek central API client rahega.
- Har feature apne endpoints `baseApi.injectEndpoints()` se add karega.
- Cache, tags, loading states, and error states RTK Query handle karega.

## Base Query With Auth Guard

Files:

```txt
web/src/shared/api/baseQuery.js
web/src/shared/api/baseQueryWithAuthGuard.js
```

`baseQuery.js` simple RTK Query `fetchBaseQuery` setup hai:

- API base URL `VITE_API_URL` se leta hai.
- Default fallback: `http://localhost:5000/api`
- `credentials: "include"` use karta hai, so browser cookies backend ke saath send karega.

Important:

- Frontend access token ya refresh token localStorage/sessionStorage/Redux me save nahi karega.
- Tokens backend cookies me set karega.
- Frontend ka kaam sirf cookie include karke requests bhejna hai.

`baseQueryWithAuthGuard.js` refresh guard hai.

Current behavior:

1. Pehle original request run hoti hai.
2. Agar response success hai, result directly return hota hai.
3. Agar `401` auth route par aata hai, ignore hota hai.
4. Agar `401` protected route par aata hai:
   - mutex lock acquire hota hai.
   - `/auth/refresh` hit hota hai.
   - backend refresh cookie validate karke new access cookie set karega.
   - refresh success par original request dobara run hoti hai.
   - refresh fail par user clear hota hai and RTK Query cache reset hota hai.
5. Agar multiple requests ek saath `401` deti hain, mutex ensure karta hai ki sirf ek refresh request chale. Baaki requests refresh complete hone ka wait karti hain, then retry karti hain.

Important:

- Backend endpoints abhi created nahi hain.
- Frontend already future backend contract ke liye ready hai.
- Expected backend behavior: login/register/refresh cookies set kare, logout cookies clear kare.
- Refresh request body me token nahi bheja jaata; cookie se backend identify karega.

## Auth Slice

File:

```txt
web/src/features/auth/model/authSlice.js
```

State:

```js
{
  user: null,
  status: "idle",
  isLoggedOut: false
}
```

Reducers:

- `setUser`: login/register/getMe success ke baad user set karta hai.
- `clearUser`: logout, getMe fail, ya refresh fail hone par user clear karta hai.

Extra reducers:

- `getMe.pending`: status `loading`.
- `getMe.fulfilled`: status `succeeded`, user set.
- `getMe.rejected`: status `failed`, user clear, logged out true.
- `login.fulfilled`: user set.
- `register.fulfilled`: user set.
- `logout.fulfilled`: user clear.

Selectors:

- `selectAuth`
- `selectAuthStatus`
- `selectCurrentUser`
- `selectIsLoggedOut`

## Auth Initializer

File:

```txt
web/src/app/initializers/AuthInitializer.jsx
```

Purpose:

- App start hote hi `useGetMeQuery()` call karta hai.
- Backend cookie valid hai to `/auth/me` user return karega.
- Access cookie expired hai but refresh cookie valid hai to base query guard `/auth/refresh` call karega, then `/auth/me` retry hoga.
- Cookie missing/invalid hai to getMe fail hogi and user public routes par rahega.
- Jab tak getMe loading hai, loader render hota hai.

Reason:

- Route guards ko reliable `user/status/isLoggedOut` value milti hai.
- Public/private route redirect flicker kam hota hai.

## Route Layouts

### Public Layout

File:

```txt
web/src/app/layouts/PublicLayout.jsx
```

Behavior:

- User authenticated nahi hai to public page render hota hai.
- User authenticated hai to `/app` par redirect hota hai.
- Auth status loading hai to loader render hota hai.

Public routes:

- `/login`
- `/register`
- `/` redirects to `/login`

### Private Layout

File:

```txt
web/src/app/layouts/PrivateLayout.jsx
```

Behavior:

- User authenticated hai to private route render hota hai.
- User authenticated nahi hai to `/login` par redirect hota hai.
- Redirect state me original route store hota hai, so login ke baad user wapas wahi ja sakta hai.
- Auth status `idle` ya `loading` hai to loader render hota hai.

Private routes:

- `/app`

`/app` par abhi placeholder protected page hai. Chat UI next phase me replace karega.

## Auth API Endpoints

File:

```txt
web/src/features/auth/api/authApi.js
```

Endpoints:

- `login`: `POST /auth/login`
- `register`: `POST /auth/register`
- `getMe`: `GET /auth/me`
- `logout`: `POST /auth/logout`

Hooks generated by RTK Query:

- `useLoginMutation`
- `useRegisterMutation`
- `useGetMeQuery`
- `useLogoutMutation`

Login/register success par:

- backend cookies set karega.
- frontend Redux state me only `user` set hota hai.

Logout par:

- backend cookies clear karega.
- frontend user state clear hoti hai.

## Auth Pages

Login page:

```txt
web/src/features/auth/ui/pages/LoginPage/LoginPage.jsx
web/src/features/auth/ui/pages/LoginPage/useLoginPage.js
```

Fields:

- email
- password

Register page:

```txt
web/src/features/auth/ui/pages/RegisterPage/RegisterPage.jsx
web/src/features/auth/ui/pages/RegisterPage/useRegisterPage.js
```

Fields:

- name
- email
- password

Forms React Hook Form se manage ho rahe hain:

- required validation
- email pattern validation
- register password minimum length validation
- server mutation error display

## Auth UI Components

Auth feature reusable components:

```txt
features/auth/ui/components/
  AuthShell.jsx
  AuthSubmitButton.jsx
  AuthTextField.jsx
  PasswordField.jsx
  auth.css
```

Reason:

- Login and register dono same visual shell, field components, password toggle, and submit button use karte hain.
- Ye components auth feature ke andar hi rakhe gaye kyuki abhi pure app ke shared components nahi hain.

## Frontend Env

Frontend env example:

```txt
web/.env.example
```

Current value:

```env
VITE_API_URL=http://localhost:5000/api
```

Backend auth routes create karte waqt Express side par `/api/auth/...` route prefix match karna hoga.

## 3. Backend Auth APIs

Is phase me backend auth end-to-end setup kiya gaya and frontend ko backend route contract ke saath align kiya gaya.

Main goal:

- User register/login APIs.
- Cookie-based access and refresh token flow.
- `/auth/me` based app boot auth check.
- Refresh-token session model in MongoDB.
- Redis-based token blacklist.
- Logout current session.
- Logout all devices.
- Auth middleware.
- Express-validator validation.
- Global backend error handler.
- Frontend global error boundary.

## Backend Folder Structure

Auth phase ke baad backend me ye structure add hua:

```txt
api/src/
  config/
    database.js
    jwtKeys.js
    redis.js
  controllers/
    auth.controller.js
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

## Express 5 Async Error Flow

Backend Express version upgrade ki gayi to Express 5.

Reason:

- Express 5 async route handlers/middlewares ke thrown errors and rejected promises ko automatically error middleware me bhejta hai.
- Controllers me repeated `try/catch` ya manual `catchAsync` wrapper ki zarurat nahi.
- Controllers clean async functions rahenge, and errors global error handler me normalize honge.

## Environment Config

`api/.env.example` me auth/database config add hua:

```env
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

`api/src/config/env.js` central env config me ye values expose hoti hain.

JWT signing now uses RS256:

- private key signs access/refresh tokens.
- public key verifies access/refresh tokens.
- `api/src/config/jwtKeys.js` loads keys only from `JWT_PRIVATE_KEY_BASE64` and `JWT_PUBLIC_KEY_BASE64`.
- if no keys are configured in development, temporary RSA keys are generated and sessions reset on restart.

## Database Connection

File:

```txt
api/src/config/database.js
```

`connectDatabase()` MongoDB connect karta hai.

`server.js` startup flow:

1. MongoDB connect.
2. Redis connect.
3. Socket.IO attach.
4. HTTP server listen.

MongoDB unavailable hoga to backend start nahi hoga, kyuki auth models database depend karte hain.

## Redis Connection and Blacklist Fallback

File:

```txt
api/src/config/redis.js
api/src/services/tokenBlacklist.service.js
```

Redis token blacklist ke liye use hota hai.

Blacklisted keys:

```txt
blacklist:access:<jti>
blacklist:refresh:<jti>
```

Behavior:

- Logout par access and refresh token `jti` blacklist hota hai.
- Logout-all par user ke all session token JTIs blacklist hote hain.
- Refresh token reuse/block check Redis se hota hai.
- Redis unavailable ho to development ke liye in-memory blacklist fallback use hota hai.

Important:

- Production me Redis running hona chahiye.
- In-memory fallback server restart ke baad clear ho jaata hai, so production security ke liye Redis required hai.

## User Model

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
- timestamps

Reason:

- `passwordHash` selected by default nahi hota.
- `isOnline` and `lastSeen` future chat/socket presence ke liye ready hain.
- Avatar fields future image/profile support ke liye ready hain.

## Refresh Session Model

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
- timestamps

Reason:

- Har login/register ek separate session document create karta hai.
- Multiple devices/sessions separately manage ho sakte hain.
- Current logout me current session delete hota hai.
- Logout-all me user ke all session docs delete hote hain.
- Session docs `expiresAt` TTL index se auto-clean ho sakte hain.
- Refresh token raw value database me save nahi hoti, sirf SHA-256 hash save hota hai.

## Token Contract

Backend JWT cookies use karta hai:

- access token cookie: `dychat_access`
- refresh token cookie: `dychat_refresh`

JWT algorithm:

- `RS256`
- private key for signing
- public key for verification

Cookie options:

- `httpOnly: true`
- `sameSite` env based
- `secure` env based

Frontend token read/store nahi karta.

Access token:

- Short lived.
- Protected APIs ke liye.
- Auth middleware isko verify karta hai.

Refresh token:

- Longer lived.
- `/auth/refresh` ke liye.
- Session model me hashed form me stored.

Both token types me `jti` hota hai for blacklist.

## Auth APIs

Routes mounted at:

```txt
/api/auth
```

Endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`

### Register

Route:

```txt
POST /api/auth/register
```

Body:

```js
{
  name,
  email,
  password
}
```

Flow:

1. Validate request.
2. Check duplicate email.
3. Hash password.
4. Create user.
5. Create refresh session document.
6. Set access and refresh cookies.
7. Return user.

### Login

Route:

```txt
POST /api/auth/login
```

Body:

```js
{
  email,
  password
}
```

Flow:

1. Validate request.
2. Find user with password hash.
3. Compare password.
4. Create refresh session document.
5. Set access and refresh cookies.
6. Return user.

### Refresh

Route:

```txt
POST /api/auth/refresh
```

Flow:

1. Read refresh cookie.
2. Verify refresh JWT.
3. Check refresh `jti` blacklist.
4. Match session document using user, session id, refresh token hash, and refresh `jti`.
5. Create new access token.
6. Update session's latest access token `jti`.
7. Set new access cookie.
8. Return user.

Refresh route does not need token in request body. Cookie handles it.

### Get Me

Route:

```txt
GET /api/auth/me
```

Middleware:

```txt
authenticate
```

Flow:

1. Read access cookie.
2. Verify access JWT.
3. Check access `jti` blacklist.
4. Check session still exists and access `jti` is the latest one for that session.
5. Load user.
6. Return user.

Frontend `AuthInitializer` calls this on app boot.

### Logout Current Session

Route:

```txt
POST /api/auth/logout
```

Middleware:

```txt
authenticate
```

Flow:

1. Auth middleware verifies current access token.
2. Current session is found.
3. Current access and refresh token JTIs are blacklisted.
4. Current refresh session document is deleted.
5. Auth cookies are cleared.

### Logout All Devices

Route:

```txt
POST /api/auth/logout-all
```

Middleware:

```txt
authenticate
```

Flow:

1. Auth middleware verifies current access token.
2. All user's refresh session documents are loaded.
3. All stored access and refresh JTIs are blacklisted.
4. All user's refresh session documents are deleted.
5. Auth cookies are cleared.

## Auth Middleware

File:

```txt
api/src/middlewares/authenticate.js
```

Used by:

- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`

Responsibilities:

- Read access token cookie.
- Verify JWT.
- Check blacklist.
- Check session exists and latest access token `jti` matches.
- Load user.
- Attach `req.user` and `req.auth`.

## Validation

File:

```txt
api/src/validations/auth.validation.js
```

Validation middleware:

```txt
api/src/middlewares/validateRequest.js
```

Uses `express-validator`.

Register validation:

- name required, 2-80 characters
- valid email
- password minimum 6 characters

Login validation:

- valid email
- password required

Validation errors go to global error handler as structured errors.

## Global Error Handler

File:

```txt
api/src/middlewares/errorHandler.js
```

Includes:

- `notFoundHandler`
- `globalErrorHandler`

Handles:

- custom `ApiError`
- Mongoose validation errors
- Mongoose cast errors
- duplicate key errors
- fallback 500 errors

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

Stack is hidden in production.

## Frontend Error Boundary

File:

```txt
web/src/app/error/ErrorBoundary.jsx
```

`App.jsx` now wraps the app with `ErrorBoundary`.

Reason:

- Unexpected frontend render errors should not crash the whole UI silently.
- User sees a clean fallback with retry action.
- Error details are logged to console for debugging.

## Frontend Auth API Update

File:

```txt
web/src/features/auth/api/authApi.js
```

Added endpoint:

```txt
logoutAll: POST /auth/logout-all
```

Generated hook:

```txt
useLogoutAllMutation
```

Auth slice now clears user on `logoutAll.fulfilled`.

Logout and logout-all also reset RTK Query cache so protected cached data does not stay around after session removal.

## Current Run Commands

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

Root convenience commands:

```bash
npm run dev:api
npm run dev:web
npm run build:web
```

## Current Status

Initial setup complete:

- Backend Express server ready.
- Basic health routes ready.
- Socket.IO server attached to HTTP server.
- Env config centralized.
- Frontend Vite React app ready.
- `app`, `features`, and `shared` frontend folders created and now populated.
- Dependencies installed and lockfiles generated.
- Frontend Redux store ready.
- RTK Query base API ready.
- Cookie-based access/refresh guard ready.
- Auth initializer ready.
- Public/private route guards ready.
- Login and register pages ready.
- MongoDB connection ready.
- Redis blacklist service ready.
- RS256 JWT private/public key loader ready.
- User model ready.
- Refresh session model ready.
- Auth APIs ready.
- JWT cookie auth middleware ready.
- Detailed backend API docs ready in `api/docs.md`.
- Logout and logout-all ready.
- Backend global error handler ready.
- Frontend global error boundary ready.

Not added yet:

- Socket auth middleware.
- Chat/message models.
- Real chat UI after login.
- Group chat logic.

Ye sab next commits me step-by-step add hoga.
