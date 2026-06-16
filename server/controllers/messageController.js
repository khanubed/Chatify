import { Mongoose } from "mongoose";
import Message from "../models/message.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";
import User from "../models/user.js";
import Group from "../models/group.js";

export const getUsersForSideBar = async (req, res) => {
  try {
    const userId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: userId } }).select(
      "-password",
    );

    console.log(filteredUsers);

    const unseenMessages = {};
    const promises = filteredUsers.map(async (user) => {
      const messages = await Message.find({
        senderId: user._id,
        receiverId: userId,
        seen: false,
      });
      if (messages.length > 0) {
        unseenMessages[user._id] = messages.length;
      }
    });
    await Promise.all(promises);
    res.json({ success: true, users: filteredUsers, unseenMessages });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: targetId } = req.params;
    const { isGroup } = req.query;
    const myId = req.user._id;

    let messages;

    if (isGroup === "true") {
      // 1. First, mark unread group messages as seen by appending your ID
      await Message.updateMany(
        { groupId: targetId, seenBy: { $ne: myId } },
        { $addToSet: { seenBy: myId } },
      );

      // 2. Fetch the newly updated messages with the correct User model fields
      messages = await Message.find({ groupId: targetId })
        .populate("senderId", "fullName profilePic") // 🌟 Match schema attributes
        .populate({
          path: "parent",
          select: "text image senderId",
          populate: { path: "senderId", select: "fullName" }, // 🌟 Match schema attributes
        })
        .populate("seenBy", "fullName profilePic"); // 🌟 Match schema attributes
    } else {
      // 1. First, mark incoming 1-on-1 messages as read
      await Message.updateMany(
        { senderId: targetId, receiverId: myId, seenBy: { $ne: myId } },
        { $addToSet: { seenBy: myId } },
      );

      // 2. Fetch the 1-on-1 chat history
      messages = await Message.find({
        $or: [
          { senderId: myId, receiverId: targetId },
          { senderId: targetId, receiverId: myId },
        ],
      })
        .populate("senderId", "fullName profilePic") // 🌟 Match schema attributes
        .populate({
          path: "parent",
          select: "text image senderId",
          populate: { path: "senderId", select: "fullName" }, // 🌟 Match schema attributes
        })
        .populate("seenBy", "fullName profilePic"); // 🌟 Match schema attributes
    }

    res.json({ success: true, messages });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, isGroup, groupId, parent } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;

    let imageURL;
    if (image) {
      const uploadImage = await cloudinary.uploader.upload(image);
      imageURL = uploadImage.secure_url;
    }

    // 🌟 Structure base document object including parent context and seenBy tracking arrays
    let newMessage = await Message.create({
      senderId,
      text,
      image: imageURL,
      receiverId: isGroup ? null : receiverId,
      groupId: isGroup ? groupId : null,
      parent: parent || null,
    });

    // 🌟 Hydrate references so nested UI layouts can render user items cleanly right away
    newMessage = await Message.findById(newMessage._id)
      .populate("senderId", "name avatar username")
      .populate({
        path: "parent",
        select: "text image senderId",
        populate: { path: "senderId", select: "name" },
      })
      .populate("seenBy", "name avatar username");

    // Real-Time Socket Interception Dispatch Layer
    if (isGroup && groupId) {
      io.to(groupId.toString()).emit("newMessage", newMessage);
    } else {
      const recieverSocketId = userSocketMap[receiverId];
      if (recieverSocketId) {
        io.to(recieverSocketId).emit("newMessage", newMessage);
      }
      const senderSocketId = userSocketMap[senderId];
      if (senderSocketId) {
        io.to(senderSocketId).emit("newMessage", newMessage);
      }
    }

    res.json({ success: true, newMessage });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { newText } = req.body;
    const userId = req.user._id; // Extracted from your auth middleware

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    // Guard: Only the sender can edit their own message
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized action" });
    }

    if (message.isDeleted) {
      return res.status(400).json({ error: "Cannot edit a deleted message" });
    }

    message.text = newText;
    message.isEdited = true;
    await message.save();

    res.status(200).json(message);
  } catch (error) {
    console.error("Error in editMessage controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// 2. DELETE MESSAGE (Soft Delete)
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    // Guard: Only the sender can delete their own message
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized action" });
    }

    message.isDeleted = true;
    message.text = "This message was deleted"; // Scrub the contents
    message.image = null; // Remove any attached media links
    await message.save();

    res.status(200).json(message);
  } catch (error) {
    console.error("Error in deleteMessage controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// 3. MARK MESSAGES AS SEEN
export const markAsSeen = async (req, res) => {
  try {
    const { chatId } = req.params; // Can be a userId or a groupId
    const userId = req.user._id;

    // Add user ID to seenBy array for all unread messages in this chat conversation
    await Message.updateMany(
      {
        $or: [
          { senderId: chatId, receiverId: userId }, // 1-on-1 chats
          { groupId: chatId }, // Group chats
        ],
        seenBy: { $ne: userId }, // Only update if user isn't already in the array
      },
      {
        $addToSet: { seenBy: userId },
      },
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in markAsSeen controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
