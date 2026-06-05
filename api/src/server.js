import http from "node:http";

import { app } from "./app.js";
import { env } from "./config/env.js";
import { createSocketServer } from "./lib/socket.js";

const server = http.createServer(app);

createSocketServer(server);

server.listen(env.port, () => {
  console.log(`API server running on port ${env.port}`);
});

