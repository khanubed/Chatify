import Birthday from "../models/birthday.js";
import { v2 as cloudinary } from "cloudinary"; // 🌟 Import the raw Cloudinary SDK directly

export const createBirthday = async (req, res) => {
  try {
    const { userId, dob, isCelebrated, image, message, heading, subHeading } =
      req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required." });
    }

    let imageUrl = "";

    if (image && image.startsWith("data:image")) {
      // 🌟 BYPASS the multer helper function and upload raw base64 strings directly
      const upload = await cloudinary.uploader.upload(image);
      imageUrl = upload.secure_url;
    } else {
      imageUrl = image;
    }

    const newBirthday = await Birthday.create({
      userId,
      dob,
      isCelebrated: isCelebrated ?? true,
      image: imageUrl,
      message,
      heading,
      subHeading,
    });

    res.status(201).json({
      success: true,
      message: "Birthday template created successfully",
      birthday: newBirthday,
    });
  } catch (error) {
    console.error("Create Birthday Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🚀 2. READ ALL: Fetch all birthday records (with User Details populated)
export const getAllBirthdays = async (req, res) => {
  try {
    // Populates the referenced User's details (name, email, profile picture)
    const birthdays = await Birthday.find()
      .populate("userId", "fullName email profilePic")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, birthdays });
  } catch (error) {
    console.error("Get All Birthdays Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🚀 3. READ SINGLE: Fetch one record by its Birthday Document ID
export const getBirthdayById = async (req, res) => {
  try {
    const { id } = req.params;
    const birthday = await Birthday.findById(id).populate(
      "userId",
      "fullName email profilePic",
    );

    if (!birthday) {
      return res
        .status(404)
        .json({ success: false, message: "Birthday record not found." });
    }

    res.status(200).json({ success: true, birthday });
  } catch (error) {
    console.error("Get Single Birthday Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🚀 4. UPDATE: Admin modifies an existing birthday record
export const updateBirthday = async (req, res) => {
  try {
    const { id } = req.params;
    const { dob, isCelebrated, image, message, heading, subHeading } = req.body;

    // Build the dynamic update object
    const updatePayload = {};
    if (dob) updatePayload.dob = dob;
    if (isCelebrated !== undefined) updatePayload.isCelebrated = isCelebrated;
    if (message) updatePayload.message = message;
    if (heading) updatePayload.heading = heading;
    if (subHeading) updatePayload.subHeading = subHeading;

    // Handle conditional image updating
    if (image) {
      if (image.startsWith("data:image")) {
        const upload = await cloudinary.uploader.upload(image);
        updatePayload.image = upload.secure_url;
      } else {
        updatePayload.image = image;
      }
    }

    const updatedBirthday = await Birthday.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true, runValidators: true },
    ).populate("userId", "fullName email profilePic");

    if (!updatedBirthday) {
      return res
        .status(404)
        .json({ success: false, message: "Birthday record not found." });
    }

    res.status(200).json({
      success: true,
      message: "Birthday record updated successfully",
      birthday: updatedBirthday,
    });
  } catch (error) {
    console.error("Update Birthday Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🚀 5. DELETE: Remove a birthday record completely
export const deleteBirthday = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBirthday = await Birthday.findByIdAndDelete(id);

    if (!deletedBirthday) {
      return res
        .status(404)
        .json({ success: false, message: "Birthday record not found." });
    }

    res.status(200).json({
      success: true,
      message: "Birthday record removed from database successfully.",
    });
  } catch (error) {
    console.error("Delete Birthday Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
