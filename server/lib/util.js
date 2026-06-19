import jwt from "jsonwebtoken";

export const generateToken = (userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_KEY);
  return token;
};

export const extractCloudinaryPublicId = (url) => {
  if (!url || !url.includes("res.cloudinary.com")) return null;

  try {
    // Split the URL parts to extract everything after the upload type folder (e.g., /upload/)
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;

    // Remove the version tag (e.g., v17182939/) if present
    const pathWithoutVersion = parts[1].replace(/^v\d+\//, "");

    // Drop the file extension extension tag (.jpg, .mp3, etc.)
    const publicId = pathWithoutVersion.substring(
      0,
      pathWithoutVersion.lastIndexOf("."),
    );

    // Auto-detect asset type matching Cloudinary API requirements
    let resourceType = "image";
    if (url.includes("/video/")) resourceType = "video"; // Cloudinary groups audio under video type
    if (url.includes("/raw/")) resourceType = "raw";

    return { publicId, resourceType };
  } catch (error) {
    console.error("Failed to parse Cloudinary URL identity:", error);
    return null;
  }
};
