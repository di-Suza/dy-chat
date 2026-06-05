import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import {
  globalErrorHandler,
  notFoundHandler
} from "./middlewares/errorHandler.js";
import { authRoutes } from "./routes/auth.routes.js";
import { userRoutes } from "./routes/user.routes.js";

// Express app is exported separately so HTTP and Socket.IO can share one server.
export const app = express();

// CORS allows the React app to send cookie-authenticated requests to the API.
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Root route gives a simple API availability response.
app.get("/", (_req, res) => {
  res.json({
    message: "DyChat API is running",
    status: true
  });
});

// Health route is useful for deploy platform uptime checks.
app.get("/health", (_req, res) => {
  res.json({
    service: "dychat-api",
    status: true
  });
});

// Auth routes are prefixed with /api so frontend VITE_API_URL can point to /api.
app.use("/api/auth", authRoutes);

// User routes expose protected account discovery APIs.
app.use("/api/users", userRoutes);

// Unknown routes and errors are handled last.
app.use(notFoundHandler);
app.use(globalErrorHandler);
