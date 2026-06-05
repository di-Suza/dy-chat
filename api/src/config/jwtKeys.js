import crypto from "node:crypto";

import { env } from "./env.js";

// Decodes a base64-encoded PEM value so multiline keys can live in .env files safely.
const decodeBase64Pem = (value) => {
  if (!value) {
    return "";
  }

  return Buffer.from(value, "base64").toString("utf8");
};

// Creates a temporary key pair for local development when env keys are not configured.
const createDevelopmentKeyPair = () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: {
      format: "pem",
      type: "pkcs8"
    },
    publicKeyEncoding: {
      format: "pem",
      type: "spki"
    }
  });

  console.warn(
    "JWT RSA keys are missing. Generated temporary development keys; sessions will reset on restart."
  );

  return {
    privateKey,
    publicKey
  };
};

const configuredPrivateKey = decodeBase64Pem(env.jwtPrivateKeyBase64);
const configuredPublicKey = decodeBase64Pem(env.jwtPublicKeyBase64);

const hasAnyConfiguredKey = Boolean(configuredPrivateKey || configuredPublicKey);
const hasCompleteConfiguredKeyPair = Boolean(
  configuredPrivateKey && configuredPublicKey
);

if (hasAnyConfiguredKey && !hasCompleteConfiguredKeyPair) {
  throw new Error("Both JWT private and public RSA keys must be configured together.");
}

const developmentKeyPair = hasCompleteConfiguredKeyPair
  ? null
  : createDevelopmentKeyPair();

// Exported key pair used by jsonwebtoken for RS256 signing and verification.
export const jwtKeys = {
  privateKey: configuredPrivateKey || developmentKeyPair.privateKey,
  publicKey: configuredPublicKey || developmentKeyPair.publicKey
};
