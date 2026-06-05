import { imageKit, isImageKitConfigured } from "../config/imageKit.js";
import { ApiError } from "../utils/ApiError.js";

const profileImagesFolder = "/dychat/profile-pictures";

// Extracts the safest useful message from ImageKit SDK errors.
const getImageKitErrorMessage = (error, fallback) => {
  return error?.message || error?.response?.data?.message || fallback;
};

// Ensures image upload/delete does not run without the required ImageKit env keys.
const assertImageKitConfigured = () => {
  if (!isImageKitConfigured || !imageKit) {
    throw new ApiError(500, "ImageKit is not configured");
  }
};

// Builds a stable file name while keeping the original image extension when possible.
const createProfileFileName = ({ file, userId }) => {
  const extension =
    file.originalname?.split(".").pop()?.toLowerCase() ||
    file.mimetype.split("/").pop() ||
    "jpg";

  return `profile-${userId}-${Date.now()}.${extension}`;
};

// Uploads a multer in-memory image buffer to ImageKit and returns URL plus file id.
export const uploadProfileImageToImageKit = async ({ file, userId }) => {
  assertImageKitConfigured();

  const encodedFile = `data:${file.mimetype};base64,${file.buffer.toString(
    "base64"
  )}`;

  try {
    const result = await imageKit.upload({
      file: encodedFile,
      fileName: createProfileFileName({
        file,
        userId
      }),
      folder: profileImagesFolder,
      tags: ["dychat", "profile-picture"],
      useUniqueFileName: true
    });

    if (!result?.url || !result?.fileId) {
      throw new Error("ImageKit returned an incomplete upload response");
    }

    return {
      publicId: result.fileId,
      url: result.url
    };
  } catch (error) {
    throw new ApiError(
      502,
      getImageKitErrorMessage(error, "Profile image upload failed")
    );
  }
};

// Deletes an existing ImageKit file by file id when a user removes/replaces avatar.
export const deleteImageKitFile = async (publicId) => {
  if (!publicId) {
    return;
  }

  assertImageKitConfigured();

  try {
    await imageKit.deleteFile(publicId);
  } catch (error) {
    throw new ApiError(
      502,
      getImageKitErrorMessage(error, "Profile image removal failed")
    );
  }
};
