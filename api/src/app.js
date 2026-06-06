import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "./config/env.js";
import {
  globalErrorHandler,
  notFoundHandler
} from "./middlewares/errorHandler.js";
import { authRoutes } from "./routes/auth.routes.js";
import { conversationRoutes } from "./routes/conversation.routes.js";
import { messageRoutes } from "./routes/message.routes.js";
import { userRoutes } from "./routes/user.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientBuildPath = path.resolve(__dirname, "../views");

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

// Conversation and message routes power one-to-one chat.
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);

// Production React build is served by the API server from api/views.
app.use(express.static(clientBuildPath));

// Non-API routes fall back to React Router's index.html.
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    next();
    return;
  }

  res.sendFile(path.join(clientBuildPath, "index.html"));
});

// Unknown routes and errors are handled last.
app.use(notFoundHandler);
app.use(globalErrorHandler);
