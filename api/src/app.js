import cors from "cors";
import express from "express";

import { env } from "./config/env.js";

export const app = express();

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "DyChat API is running",
    status: "ok"
  });
});

app.get("/health", (_req, res) => {
  res.json({
    service: "dychat-api",
    status: "healthy"
  });
});

