import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

// 1. Configure Multer to hold files temporarily in memory buffers
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB maximum limit to safely account for upcoming videos
  },
  fileFilter: (req, file, cb) => {
    // Dynamically allow images, audio, and video files
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("audio/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file format! Only images, audio, and videos are allowed."), false);
    }
  },
});

// 2. Stream Buffer Uploader Utility for Cloudinary
export const uploadToCloudinary = (fileBuffer, mimeType) => {
  return new Promise((resolve, reject) => {
    // 🌟 IMPORTANT: Cloudinary treats both "audio" and "video" MIME families under resource_type: "video"
    let resourceType = "auto";
    if (mimeType.startsWith("audio/") || mimeType.startsWith("video/")) {
      resourceType = "video";
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "chat_media",
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    // Write the raw file bytes array directly into the network pipe stream
    uploadStream.end(fileBuffer);
  });
};