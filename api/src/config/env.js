import "dotenv/config";

// Converts string env flags into booleans while keeping safe defaults.
const toBoolean = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  return value === "true";
};

export const env = {
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/dychat",
  redisHost: process.env.REDIS_HOST || "127.0.0.1",
  redisPort: Number(process.env.REDIS_PORT || 6379),
  redisPassword: process.env.REDIS_PASSWORD || "",
  jwtPrivateKeyBase64: process.env.JWT_PRIVATE_KEY_BASE64,
  jwtPublicKeyBase64: process.env.JWT_PUBLIC_KEY_BASE64,
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  accessTokenCookieName:
    process.env.ACCESS_TOKEN_COOKIE_NAME || "dychat_access",
  refreshTokenCookieName:
    process.env.REFRESH_TOKEN_COOKIE_NAME || "dychat_refresh",
  cookieSecure: toBoolean(process.env.COOKIE_SECURE, false),
  cookieSameSite: process.env.COOKIE_SAME_SITE || "lax",
  imageKitPrivateKey:
    process.env.IMAGE_KIT_PRIVATE || process.env.IMAGEKIT_PRIVATE_KEY || "",
  imageKitPublicKey:
    process.env.IMAGE_KIT_PUBLIC || process.env.IMAGEKIT_PUBLIC_KEY || "",
  imageKitUrlEndpoint:
    process.env.IMAGE_KIT_URL_ENDPOINT || process.env.IMAGEKIT_URL_ENDPOINT || ""
};
