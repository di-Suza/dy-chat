import multer from "multer";

import { ApiError } from "../utils/ApiError.js";

const allowedProfileImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

// Keeps uploaded profile images in memory so ImageKit can receive the buffer directly.
const storage = multer.memoryStorage();

// Allows only common browser-friendly image formats for profile pictures.
const imageFileFilter = (_req, file, callback) => {
  if (!allowedProfileImageTypes.has(file.mimetype)) {
    callback(new ApiError(400, "Only JPG, PNG, and WEBP images are allowed"));
    return;
  }

  callback(null, true);
};

// Multer middleware for the single multipart field used by profile avatar updates.
export const uploadProfileImage = multer({
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  storage
}).single("avatar");
