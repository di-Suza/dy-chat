import { createClient } from "redis";

import { env } from "./env.js";

// Shared Redis client used by token blacklist services.
export const redisClient = createClient({
  socket: {
    host: env.redisHost,
    port: env.redisPort
  },
  password: env.redisPassword || undefined
});

redisClient.on("error", (error) => {
  console.warn(`Redis error: ${error.message}`);
});

// Connects Redis, but keeps the app usable in development with memory fallback.
export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log("Redis connected");
  } catch (error) {
    console.warn(`Redis unavailable, using in-memory blacklist: ${error.message}`);
  }
};
