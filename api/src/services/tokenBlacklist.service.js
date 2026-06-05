import { redisClient } from "../config/redis.js";
import { secondsUntil } from "../utils/duration.js";

const memoryBlacklist = new Map();

// Creates a namespaced blacklist key for either access or refresh token JTIs.
const createKey = (type, jti) => `blacklist:${type}:${jti}`;

// Removes expired memory fallback entries so local development does not leak memory.
const cleanupMemoryBlacklist = () => {
  const now = Date.now();

  for (const [key, expiresAt] of memoryBlacklist.entries()) {
    if (expiresAt <= now) {
      memoryBlacklist.delete(key);
    }
  }
};

// Blacklists a token JTI until its original expiry time.
export const blacklistTokenJti = async ({ expiresAt, jti, type }) => {
  if (!jti || !expiresAt) {
    return;
  }

  const ttl = secondsUntil(expiresAt);

  if (ttl <= 0) {
    return;
  }

  const key = createKey(type, jti);

  if (redisClient.isOpen) {
    await redisClient.set(key, "1", {
      EX: ttl
    });
    return;
  }

  cleanupMemoryBlacklist();
  memoryBlacklist.set(key, Date.now() + ttl * 1000);
};

// Checks whether a token JTI was invalidated by logout or suspected reuse.
export const isTokenJtiBlacklisted = async ({ jti, type }) => {
  if (!jti) {
    return false;
  }

  const key = createKey(type, jti);

  if (redisClient.isOpen) {
    return Boolean(await redisClient.get(key));
  }

  cleanupMemoryBlacklist();
  return memoryBlacklist.has(key);
};
