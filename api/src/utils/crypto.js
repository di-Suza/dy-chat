import crypto from "node:crypto";

// Hashes raw refresh tokens before storing or querying session documents.
export const createTokenHash = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// Creates a unique JWT id used for token blacklist checks.
export const createJti = () => crypto.randomUUID();
