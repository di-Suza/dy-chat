import ImageKit from "imagekit";

import { env } from "./env.js";

// Tells services whether real ImageKit credentials are available.
export const isImageKitConfigured = Boolean(
  env.imageKitPrivateKey && env.imageKitPublicKey && env.imageKitUrlEndpoint
);

// Creates one shared ImageKit client for profile image upload/delete operations.
export const imageKit = isImageKitConfigured
  ? new ImageKit({
      privateKey: env.imageKitPrivateKey,
      publicKey: env.imageKitPublicKey,
      urlEndpoint: env.imageKitUrlEndpoint
    })
  : null;
