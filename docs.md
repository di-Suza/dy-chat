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
- `multer`: multipart profile image uploads accept karne ke liye.
- `imagekit`: ImageKit media upload/delete ke liye.

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

`/app` par chat workspace render hota hai.

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
    imageKit.js
    jwtKeys.js
    redis.js
  controllers/
    auth.controller.js
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
  services/
    auth.service.js
    imageKit.service.js
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
IMAGE_KIT_PRIVATE=
IMAGE_KIT_PUBLIC=
IMAGE_KIT_URL_ENDPOINT=
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

## ImageKit Config

File:

```txt
api/src/config/imageKit.js
api/src/services/imageKit.service.js
```

ImageKit profile picture upload/remove ke liye use hota hai.

Env keys:

- `IMAGE_KIT_PRIVATE`
- `IMAGE_KIT_PUBLIC`
- `IMAGE_KIT_URL_ENDPOINT`

Behavior:

- Profile image ImageKit ke `/dychat/profile-pictures` folder me upload hoti hai.
- ImageKit ka `fileId` app me `avatar.publicId` field ke andar store hota hai.
- Avatar replace/remove ke time old ImageKit file delete hoti hai.

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

## 4. Profile Management

Is phase me authenticated user ke liye profile management add kiya gaya.

Main goal:

- Private app icon sidebar me user profile/avatar button.
- If user avatar exists, avatar image dikhegi.
- If avatar missing hai, default demo avatar with initials dikhega.
- Profile button click par modal open hota hai.
- User apna name update kar sakta hai.
- Email readonly hai and update nahi hoti.
- User current password ke basis par password update kar sakta hai.
- Forgot password flow intentionally add nahi kiya gaya.
- User profile picture upload/replace kar sakta hai.
- User profile picture remove kar sakta hai.
- User modal se logout kar sakta hai.
- User modal se all sessions end kar sakta hai.

## Backend Profile APIs

Existing auth route group me protected profile routes add hue:

```txt
PATCH /api/auth/profile
PATCH /api/auth/password
PATCH /api/auth/avatar
DELETE /api/auth/avatar
```

### Update Profile

Route:

```txt
PATCH /api/auth/profile
```

Middleware:

- `authenticate`
- `updateProfileValidation`
- `validateRequest`

Body:

```js
{
  name
}
```

Flow:

1. Access cookie authenticate hoti hai.
2. Name validate hota hai.
3. Service user ko load karta hai.
4. Sirf `name` update hota hai.
5. Updated safe user frontend ko return hota hai.

Email is route me accept/update nahi hota.

### Update Password

Route:

```txt
PATCH /api/auth/password
```

Middleware:

- `authenticate`
- `updatePasswordValidation`
- `validateRequest`

Body:

```js
{
  currentPassword,
  newPassword
}
```

Flow:

1. Access cookie authenticate hoti hai.
2. Current and new password validate hote hain.
3. Service user ko password hash ke saath load karta hai.
4. Current password bcrypt compare se verify hota hai.
5. New password old password jaisa nahi hona chahiye.
6. New password hash karke save hota hai.
7. Updated safe user frontend ko return hota hai.

### Update Profile Picture

Route:

```txt
PATCH /api/auth/avatar
```

Middleware:

- `authenticate`
- `uploadProfileImage`

Request:

- multipart form data
- file field name: `avatar`

Flow:

1. Access cookie authenticate hoti hai.
2. Multer image ko memory buffer me accept karta hai.
3. Sirf JPG, PNG, and WEBP images allow hoti hain.
4. Max image size 5MB hai.
5. ImageKit service image upload karta hai.
6. User ke `avatar.url` and `avatar.publicId` update hote hain.
7. Agar old avatar tha to old ImageKit file delete hoti hai.
8. Updated safe user frontend ko return hota hai.

### Remove Profile Picture

Route:

```txt
DELETE /api/auth/avatar
```

Middleware:

- `authenticate`

Flow:

1. Access cookie authenticate hoti hai.
2. Agar user ke paas `avatar.publicId` hai to ImageKit file delete hoti hai.
3. User ke avatar fields empty ho jaate hain.
4. Updated safe user frontend ko return hota hai.

## Backend Service Updates

`api/src/services/auth.service.js` me add hua:

- `updateUserProfile({ name, userId })`
- `updateUserPassword({ currentPassword, newPassword, userId })`
- `updateUserAvatar({ file, userId })`
- `removeUserAvatar({ userId })`

`updateUserProfile`:

- user load karta hai.
- name set karta hai.
- user save karta hai.
- serialized user return karta hai.

`updateUserPassword`:

- user ko `+passwordHash` ke saath load karta hai.
- current password verify karta hai.
- same password reuse block karta hai.
- new password bcrypt hash karta hai.
- serialized user return karta hai.

`updateUserAvatar`:

- multer se aayi image file require karta hai.
- ImageKit me nayi image upload karta hai.
- user avatar fields me ImageKit URL and file id save karta hai.
- old avatar file cleanup karta hai.
- serialized user return karta hai.

`removeUserAvatar`:

- current avatar ImageKit file delete karta hai.
- user avatar fields empty karta hai.
- serialized user return karta hai.

`api/src/services/imageKit.service.js`:

- ImageKit SDK client use karta hai.
- profile image ko `/dychat/profile-pictures` folder me upload karta hai.
- ImageKit `fileId` ko app ke `avatar.publicId` ke roop me return karta hai.
- avatar remove/replace ke time ImageKit file delete karta hai.

`api/src/config/imageKit.js`:

- `IMAGE_KIT_PRIVATE`, `IMAGE_KIT_PUBLIC`, and `IMAGE_KIT_URL_ENDPOINT` se shared ImageKit client create karta hai.

`api/src/middlewares/uploadImage.js`:

- multer memory storage use karta hai.
- single file field `avatar` accept karta hai.
- allowed image types and 5MB size limit enforce karta hai.

## Frontend Profile UI

Private layout now renders:

```txt
AppSidebar
Outlet
ProfileModal
```

New files:

```txt
web/src/app/layouts/AppSidebar.jsx
web/src/features/profile/ui/ProfileModal/ProfileModal.jsx
web/src/features/profile/ui/ProfileModal/useProfileModal.js
web/src/features/profile/ui/ProfileModal/profile.css
```

`AppSidebar`:

- left side thin icon rail show karta hai.
- top me chats icon hai.
- search icon user search modal open karta hai.
- bottom me profile/avatar button hai.
- avatar URL ho to image render karta hai.
- avatar missing ho to default fallback avatar with initials render karta hai.

`ProfileModal`:

- user name field.
- readonly email field.
- profile picture preview.
- upload photo button.
- remove photo button.
- current password field.
- new password field.
- logout button.
- end all sessions button.

`useProfileModal`:

- profile form manage karta hai.
- password form manage karta hai.
- avatar upload/remove actions manage karta hai.
- RTK Query profile/password/avatar/logout/logout-all mutations call karta hai.
- logout ke baad user ko `/login` par navigate karta hai.
- profile/password/avatar success messages 2 second baad auto-hide karta hai.

## Frontend API Updates

`web/src/features/auth/api/authApi.js` me add hua:

- `updateProfile`: `PATCH /auth/profile`
- `updatePassword`: `PATCH /auth/password`
- `updateAvatar`: `PATCH /auth/avatar`
- `removeAvatar`: `DELETE /auth/avatar`

Generated hooks:

- `useUpdateProfileMutation`
- `useUpdatePasswordMutation`
- `useUpdateAvatarMutation`
- `useRemoveAvatarMutation`

Auth slice updates:

- `updateProfile.fulfilled` par user update hota hai.
- `updatePassword.fulfilled` par user update hota hai.
- `updateAvatar.fulfilled` par user update hota hai.
- `removeAvatar.fulfilled` par user update hota hai.

## 5. User Search Foundation

Is phase me chat start karne se pehle user discovery ka base UI and API banaya gaya.

Main goal:

- Left icon sidebar me search button.
- Search icon click karte hi bada modal open hota hai.
- Modal ke top me search input.
- User type kare to matching users API se fetch hote hain.
- Har user row ke aage `Start chat` button dikhta hai.
- `Start chat` button abhi UI-only hai; actual conversation create flow next phase me add hoga.

## Backend User Search API

New backend files:

```txt
api/src/controllers/user.controller.js
api/src/routes/user.routes.js
api/src/services/user.service.js
api/src/validations/user.validation.js
```

Route:

```txt
GET /api/users/search?q=<search>
```

Middleware:

- `authenticate`
- `searchUsersValidation`
- `validateRequest`

Flow:

1. Access cookie authenticate hoti hai.
2. Query `q` validate hota hai.
3. Service current user ko results se exclude karta hai.
4. User `name` and `email` me search hota hai.
5. Max 12 safe user objects return hote hain.

`api/src/app.js` me user routes mount hue:

```txt
/api/users
```

## Frontend User Search UI

New frontend files:

```txt
web/src/features/users/api/usersApi.js
web/src/features/users/ui/UserSearchModal/UserSearchModal.jsx
web/src/features/users/ui/UserSearchModal/useUserSearchModal.js
web/src/features/users/ui/UserSearchModal/userSearch.css
```

`AppSidebar` update:

- icon-only search trigger added.
- bottom profile button same sidebar me hai.
- mobile par sidebar compact hota hai.

`PrivateLayout` update:

- user search modal state manage karta hai.
- `AppSidebar` ke `onSearchClick` se modal open hota hai.
- `UserSearchModal` private layout ke andar render hota hai.

`usersApi`:

- `searchUsers`: `GET /users/search`
- generated hook: `useSearchUsersQuery`

`useUserSearchModal`:

- search input state manage karta hai.
- input ko debounce karta hai.
- empty input par API skip karta hai.
- search loading/error/empty/results state modal ko deta hai.

## 6. Chat UI Foundation

Is phase me realtime logic se pehle actual chat screen ka frontend UI banaya gaya.

Main goal:

- `/app` par placeholder page remove karke chat workspace show karna.
- Left side conversation list.
- Right side active chat window.
- Conversation search field.
- Active conversation header with avatar, name, and online/last seen status.
- Header top-right call button.
- Sent messages right side.
- Received messages left side.
- Bottom typing indicator.
- Bottom composer with attachment button, message input, and send button.

New frontend files:

```txt
web/src/features/chat/ui/ChatWorkspace/ChatWorkspace.jsx
web/src/features/chat/ui/ChatWorkspace/useChatWorkspace.js
web/src/features/chat/ui/ChatWorkspace/chat.css
```

Updated file:

```txt
web/src/app/pages/PrivateHomePage.jsx
```

`ChatWorkspace`:

- sidebar and active chat panel render karta hai.
- mock conversation data use karta hai for UI preview.
- conversation list item click karne par active conversation change hoti hai.
- active chat header me user avatar/name/status dikhta hai.
- message bubbles direction ke basis par left/right align hote hain.
- composer me attachment, input, and send controls ready hain.

`useChatWorkspace`:

- active conversation state manage karta hai.
- conversation search state manage karta hai.
- message draft state manage karta hai.
- mock conversations ko search term se filter karta hai.

Important:

- Ye phase UI-only hai.
- Real conversation API, message API, socket events, and file sending next phases me attach honge.

## 7. App Shell Sidebar Update

Is phase me top navbar remove karke permanent left icon sidebar add kiya gaya.

Updated files:

```txt
web/src/app/layouts/PrivateLayout.jsx
web/src/app/layouts/AppSidebar.jsx
web/src/app/app.css
web/src/features/chat/ui/ChatWorkspace/chat.css
```

Behavior:

- Top navbar render nahi hota.
- App shell ab `72px` left sidebar + main content grid hai.
- Sidebar top me chats icon hai.
- Sidebar me search icon same `UserSearchModal` open karta hai.
- Sidebar bottom me user avatar/profile button hai.
- Profile button same `ProfileModal` open karta hai.
- Chat workspace ab full `100vh` height use karta hai.
- Profile and search modals dark app shell palette ke saath match karte hain.

## 8. Direct Chat Feature

Is phase me one-to-one chat ka end-to-end base complete kiya gaya.

Main goal:

- Search modal se `Start chat` click par conversation create/reveal.
- Conversation starter ko chat sidebar me conversation immediately dikhe.
- Dusre participant ko conversation tab tak nahi dikhegi jab tak first message send nahi hota.
- Send message API DB me message save karti hai.
- Message save hote hi realtime `message:new` event participants ko milta hai.
- Conversation sidebar realtime update hota hai.
- Chat open karte hi unread messages seen ho jaate hain.
- Conversation list unread count show karti hai.
- Left app sidebar chat icon unseen chats count show karta hai.
- Typing indicator realtime hai.
- Online/offline presence realtime hai.

## Backend Direct Chat

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

New API routes:

```txt
GET /api/conversations
POST /api/conversations/direct
GET /api/conversations/:conversationId/messages
POST /api/conversations/:conversationId/seen
POST /api/messages
```

`Conversation` model:

- `participants` me dono direct chat users rahte hain.
- `visibleTo` decide karta hai sidebar me conversation kis user ko dikhegi.
- `directKey` duplicate direct conversations prevent karta hai.
- `lastMessage`, `lastMessageAt`, and `lastMessagePreview` sidebar ke liye maintained hain.

`Message` model:

- `type`: `text`, `image`, `file`, `video`, `audio`.
- `readBy` seen/unseen ke liye.
- `clientTempId` optimistic frontend message replace karne ke liye.
- `attachments` future media/file upload ke liye.

Socket behavior:

- Socket connect hone se pehle access cookie verify hoti hai.
- Valid socket `user:<id>` room join karta hai.
- First active socket user ko online mark karta hai.
- Last disconnected socket user ko offline mark karta hai and `lastSeen` update karta hai.
- Typing events backend participant check ke baad dusre participant ko forward karta hai.

Central realtime service:

- `emitConversationCreated`
- `emitConversationUpdated`
- `emitMessageCreated`
- `emitMessagesSeen`
- `emitTypingStarted`
- `emitTypingStopped`
- `emitUserPresence`

## Frontend Direct Chat

New frontend files:

```txt
web/src/app/hooks/useSocketConnection.js
web/src/features/chat/api/chatApi.js
web/src/features/chat/hooks/useChatRealtime.js
web/src/features/chat/model/chatSlice.js
web/src/shared/services/socket.js
```

Updated frontend behavior:

- Protected layout connects socket after authenticated user reaches private app.
- Logout/redirect/unmount disconnects socket.
- User search modal `Start chat` now calls backend.
- Created direct conversation sidebar me add hoti hai, but chat window auto-open nahi hoti.
- Chat workspace reads conversations/messages from RTK Query.
- Send message uses optimistic cache update.
- Realtime message events update message and conversation caches.
- Opening an unread conversation calls seen API.
- Presence events update participant online/offline status in cached conversations.
- Typing events update active chat typing indicator.

Important:

- Group chat abhi add nahi hua.
- File/image/video/audio upload flow abhi attach nahi hua, but message schema ready hai.

## 9. Group Chat Feature

Is phase me direct chat ke upar group chat layer add ki gayi.

Main goal:

- Conversation sidebar header me actions menu.
- `New Chat` se existing user search modal open hota hai.
- `New Group` se group creation modal open hota hai.
- Group name, optional group DP, and selected users ke saath group create hota hai.
- Creator group admin hota hai.
- Group immediately selected members ki conversation list me visible hota hai.
- Offline member login kare to usko group already conversation list me milega.
- Group messages me sender name message ke saath dikhta hai.
- Group typing indicator me username show hota hai.
- Group chat header me call button nahi, leave button dikhta hai.
- Leave par remaining members ko center system message dikhta hai.
- Message unsend/delete for everyone add hua.
- Chat window right click par `Close chat` option add hua.
- Typing indicator dots animated hain.
- Direct chat start karne par chat auto-open nahi hoti; user manually conversation click karega.

## Backend Group Chat

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
api/src/utils/serializeConversation.js
api/src/utils/serializeMessage.js
api/src/validations/conversation.validation.js
api/src/validations/message.validation.js
```

New routes:

```txt
POST /api/conversations/groups
POST /api/conversations/:conversationId/leave
DELETE /api/messages/:messageId
```

`Conversation` model now supports:

- `name` for group name.
- `avatar.url` and `avatar.publicId` for group DP.
- `admins` for group admin users.
- `type: "group"` for group conversations.

`Message` model now supports:

- `type: "system"` for events like user left group.
- `isDeleted` and `deletedAt` for unsend/delete-for-everyone.

Group create flow:

1. Frontend sends multipart form data with `name`, `participantIds`, and optional `avatar`.
2. Backend uploads group DP to ImageKit when provided.
3. Backend creates group with creator + selected users.
4. `visibleTo` includes all group members immediately.
5. Backend emits `conversation:created` to every member.

Leave group flow:

1. User clicks leave in group header.
2. Backend verifies user is a group participant.
3. User is removed from `participants` and `visibleTo`.
4. If needed, next remaining user is promoted as admin.
5. Backend creates a `system` message like `<name> left this group`.
6. Removed user receives `conversation:removed`.
7. Remaining users receive `message:new` and `conversation:updated`.

Message delete flow:

1. Sender right-clicks own message and chooses `Unsend message`.
2. Backend verifies sender owns the message.
3. Message body/attachments are cleared.
4. Message gets `isDeleted: true`.
5. Backend emits `message:deleted` and conversation updates.

## Frontend Group Chat

New frontend files:

```txt
web/src/features/chat/ui/NewGroupModal/NewGroupModal.jsx
web/src/features/chat/ui/NewGroupModal/newGroup.css
```

Updated frontend behavior:

- Chat sidebar header action button opens dropdown.
- Dropdown has `New Chat` and `New Group`.
- `New Group` modal handles group name, avatar preview, user search, selected users, and submit.
- Chat workspace is group-aware:
  - group name/avatar shown in list and header.
  - group member count shown in header status.
  - group messages show sender name for received messages.
  - group header shows leave button instead of call button.
  - system messages are centered.
- Realtime cache now handles:
  - `conversation:removed`
  - `message:deleted`
- Right click active chat panel opens `Close chat`.
- Right click own message opens `Unsend message`.
- Existing user search `Start chat` now only creates/reveals conversation and does not auto-open it.

## 10. Group Management Modal

Is phase me group header se group details/manage modal add kiya gaya.

Main goal:

- Group chat window ke header me group avatar/name area clickable hai.
- Click par group details modal open hota hai.
- Admin ko edit/manage options milte hain.
- Normal member ko same modal read-only details ke roop me dikhta hai.
- Admin group name update kar sakta hai.
- Admin group profile image update kar sakta hai.
- Admin naye members add kar sakta hai.
- Admin existing members remove kar sakta hai.
- Admin full group delete kar sakta hai.

## Backend Group Management APIs

New routes:

```txt
PATCH /api/conversations/:conversationId/group
POST /api/conversations/:conversationId/members
DELETE /api/conversations/:conversationId/members/:memberId
DELETE /api/conversations/:conversationId/group
```

Admin rule:

- Ye management APIs sirf group admins ke liye allowed hain.
- Normal participant route hit karega to `403` milega.

Update group flow:

1. Admin group details modal se name/avatar update karta hai.
2. Frontend multipart `FormData` bhejta hai.
3. Backend admin check karta hai.
4. Optional avatar ImageKit me upload hota hai.
5. Old group avatar delete hota hai.
6. Updated conversation realtime `conversation:updated` se members ko milti hai.

Add members flow:

1. Admin modal me users search karke selected users add karta hai.
2. Backend duplicate/existing members filter karta hai.
3. New members `participants` and `visibleTo` me add hote hain.
4. New members ko `conversation:created` milta hai.
5. Existing members ko `conversation:updated` milta hai.

Remove member flow:

1. Admin member list se remove button click karta hai.
2. Backend user ko `participants` and `visibleTo` se remove karta hai.
3. Removed user ko `conversation:removed` milta hai.
4. Remaining users ko updated conversation milti hai.

Delete group flow:

1. Admin delete group confirm karta hai.
2. Backend conversation and messages delete karta hai.
3. Group avatar ImageKit se delete hota hai.
4. Sabhi members ko `conversation:removed` event milta hai.

## Frontend Group Management

New frontend files:

```txt
web/src/features/chat/ui/GroupDetailsModal/GroupDetailsModal.jsx
web/src/features/chat/ui/GroupDetailsModal/groupDetails.css
```

Updated frontend behavior:

- `ChatWorkspace` me group contact header button ban gaya.
- `GroupDetailsModal` current conversation payload se group details render karta hai.
- `admins` array se current user ka admin status calculate hota hai.
- Admin ke liye inputs/buttons active hote hain.
- Normal user ke liye group name readonly and action buttons hidden hote hain.
- RTK Query me group management mutations add hue:
  - `updateGroupConversation`
  - `addGroupMembers`
  - `removeGroupMember`
  - `deleteGroupConversation`

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
- Profile management APIs ready.
- ImageKit profile picture service ready.
- Multer avatar upload middleware ready.
- Left icon app sidebar ready.
- Sidebar profile avatar button ready.
- Profile modal ready.
- Name update and password update linked end-to-end.
- Profile picture update/remove linked end-to-end.
- Protected user search API ready.
- Sidebar search trigger ready.
- User search modal ready.
- Chat workspace UI ready.
- Conversation list UI ready.
- Active chat window UI ready.
- Direct conversation model ready.
- Message model ready.
- Start direct chat API linked.
- Send text message API linked.
- Realtime message delivery ready.
- Typing indicator events ready.
- Online/offline presence events ready.
- Seen/unseen message flow ready.
- Sidebar unseen chat count ready.
- Group conversation create API ready.
- Group creation modal ready.
- Group message rendering ready.
- Group leave flow ready.
- System messages ready.
- Message unsend/delete flow ready.
- Group management modal ready.
- Admin-only group edit/member/delete APIs ready.

Not added yet:

- Real file/image/video/audio sending.

Ye sab next commits me step-by-step add hoga.
