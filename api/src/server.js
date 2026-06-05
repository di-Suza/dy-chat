import http from "node:http";

import { app } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { connectRedis } from "./config/redis.js";
import { createSocketServer } from "./lib/socket.js";

const server = http.createServer(app);

// Boots external services before accepting HTTP and Socket.IO traffic.
const startServer = async () => {
  await connectDatabase();
  await connectRedis();

  createSocketServer(server);

  server.listen(env.port, () => {
    console.log(`API server running on port ${env.port}`);
  });
};

startServer();
