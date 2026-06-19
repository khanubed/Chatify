import { Mongoose } from "mongoose";
import Message from "../models/message.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../sockets/index.js";
import User from "../models/user.js";
import Group from "../models/group.js";
import { uploadToCloudinary } from "../lib/multer.js";

export const getUsersForSideBar = async (req, res) => {
  try {
    const userId = req.user._id;
    const users = await User.find({ _id: { $ne: userId } }).select("-password");

    const formattedUsers = users.map((user) => ({
      ...user._doc,
      hasBlockedMe: user.blockedUsers?.includes(userId) || false,
    }));

    const unseenMessages = {};
    const promises = formattedUsers.map(async (user) => {
      const messages = await Message.find({
        senderId: user._id,
        receiverId: userId,
        seenBy: { $ne: userId },
      });
      if (messages.length > 0) {
        unseenMessages[user._id] = messages.length;
      }
    });
    await Promise.all(promises);
    res.json({ success: true, users: formattedUsers, unseenMessages });
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
      await Message.updateMany(
        { groupId: targetId, seenBy: { $ne: myId } },
        { $addToSet: { seenBy: myId } },
      );

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

export const uploadAsset = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file asset attached." });
    }

    // Stream binary buffer cleanly to Cloudinary
    const uploadResult = await uploadToCloudinary(
      req.file.buffer,
      req.file.mimetype,
    );

    return res.status(200).json({
      success: true,
      secure_url: uploadResult.secure_url,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error("Asset upload failure:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Internal server storage upload error.",
      });
  }
};
// export const sendMessage = async (req, res) => {
//   try {

//     const { text, isGroup, groupId, parent, isForwarded, image, audio, video, messageType } =
//       req.body;
//     const receiverId = req.params.id;
//     const senderId = req.user._id;

//     const parsedIsGroup = isGroup === "true" || isGroup === true;
//     const parsedIsForwarded = isForwarded === "true" || isForwarded === true;

//     // MUTUAL BLOCK CHECK PROTECTION LAYER (Direct Chats Only)
//     if (!parsedIsGroup) {
//       const [receiver, sender] = await Promise.all([
//         User.findById(receiverId),
//         User.findById(senderId),
//       ]);

//       if (!receiver || !sender) {
//         return res
//           .status(404)
//           .json({ success: false, message: "User profile not found" });
//       }

//       const isSenderBlocked = receiver.blockedUsers?.some(
//         (id) => id && id.toString() === senderId.toString(),
//       );

//       if (isSenderBlocked) {
//         return res.status(400).json({
//           success: false,
//           message: "Message not sent. You have been blocked by this user.",
//         });
//       }

//       const hasBlockedReceiver = sender.blockedUsers?.some(
//         (id) => id && id.toString() === receiverId.toString(),
//       );

//       if (hasBlockedReceiver) {
//         return res.status(400).json({
//           success: false,
//           message: "Message not sent. You must unblock this user to send a message.",
//         });
//       }
//     }

//     // MULTIMEDIA PROCESSING LAYER
//     let imageURL = image || null;
//     let audioURL = audio || null;
//     let videoURL = video || null;

//     if (req.file) {
//       const uploadResult = await uploadToCloudinary(
//         req.file.buffer,
//         req.file.mimetype,
//       );
//       const secureUrl = uploadResult.secure_url;

//       if (req.file.mimetype.startsWith("image/")) {
//         imageURL = secureUrl;
//         audioURL = null;
//         videoURL = null;
//       } else if (req.file.mimetype.startsWith("audio/")) {
//         audioURL = secureUrl;
//         imageURL = null;
//         videoURL = null;
//       } else if (req.file.mimetype.startsWith("video/")) {
//         videoURL = secureUrl;
//         imageURL = null;
//         audioURL = null;
//       }
//     }

//     // Structure message document layout safely
//     let newMessage = await Message.create({
//       senderId,
//       text: text || "",
//       image: imageURL,
//       audio: audioURL,
//       video: videoURL,
//       receiverId: parsedIsGroup ? null : receiverId,
//       groupId: parsedIsGroup ? groupId : null,
//       parent: parent && parent !== "null" ? parent : null,
//       seenBy: [senderId],
//       isForwarded: parsedIsForwarded,
//       messageType: messageType || "text", // 🌟 FIX: Persists 'call' or default text state to DB schema
//     });

//     // Hydrate references for instant UI rendering
//     newMessage = await Message.findById(newMessage._id)
//       .populate("senderId", "fullName profilePic")
//       .populate({
//         path: "parent",
//         select: "text image audio senderId",
//         populate: { path: "senderId", select: "fullName" },
//       })
//       .populate("seenBy", "fullName profilePic");

//     // Real-Time Socket Interception Dispatch Layer
//     if (parsedIsGroup && groupId) {
//       io.to(groupId.toString()).emit("newMessage", newMessage);
//     } else {
//       const recieverSocketId = userSocketMap[receiverId];
//       if (recieverSocketId) {
//         io.to(recieverSocketId).emit("newMessage", newMessage);
//       }
//       const senderSocketId = userSocketMap[senderId];
//       if (senderSocketId) {
//         io.to(senderSocketId).emit("newMessage", newMessage);
//       }
//     }

//     res.json({ success: true, newMessage });
//   } catch (error) {
//     console.error("Controller Error:", error.message);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// export const editMessage = async (req, res) => {
//   try {
//     const { messageId } = req.params;
//     const { newText } = req.body;
//     const userId = req.user._id; // Extracted from your auth middleware

//     const message = await Message.findById(messageId);
//     if (!message) return res.status(404).json({ error: "Message not found" });

//     // Guard: Only the sender can edit their own message
//     if (message.senderId.toString() !== userId.toString()) {
//       return res.status(403).json({ error: "Unauthorized action" });
//     }

//     if (message.isDeleted) {
//       return res.status(400).json({ error: "Cannot edit a deleted message" });
//     }

//     message.text = newText;
//     message.isEdited = true;
//     await message.save();

//     res.status(200).json(message);
//   } catch (error) {
//     console.error("Error in editMessage controller:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// 2. DELETE MESSAGE (Soft Delete)
// export const deleteMessage = async (req, res) => {
//   try {
//     const { messageId } = req.params;
//     const userId = req.user._id;

//     const message = await Message.findById(messageId);
//     if (!message) return res.status(404).json({ error: "Message not found" });

//     // Guard: Only the sender can delete their own message
//     if (message.senderId.toString() !== userId.toString()) {
//       return res.status(403).json({ error: "Unauthorized action" });
//     }

//     message.isDeleted = true;
//     message.text = "This message was deleted"; // Scrub the contents
//     message.image = null; // Remove any attached media links
//     message.audio = null;
//     message.video = null;
//     await message.save();

//     res.status(200).json(message);
//   } catch (error) {
//     console.error("Error in deleteMessage controller:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// 3. MARK MESSAGES AS SEEN
// export const markAsSeen = async (req, res) => {
//   try {
//     const { chatId } = req.params; // Can be a userId or a groupId
//     const userId = req.user._id;

//     // Add user ID to seenBy array for all unread messages in this chat conversation
//     await Message.updateMany(
//       {
//         $or: [
//           { senderId: chatId, receiverId: userId }, // 1-on-1 chats
//           { groupId: chatId }, // Group chats
//         ],
//         seenBy: { $ne: userId }, // Only update if user isn't already in the array
//       },
//       {
//         $addToSet: { seenBy: userId },
//       },
//     );

//     res.status(200).json({ success: true });
//   } catch (error) {
//     console.error("Error in markAsSeen controller:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// export const toggleReaction = async (req, res) => {
//   try {
//     const { messageId } = req.params;
//     const { emoji } = req.body;
//     const userId = req.user._id;
//     const message = await Message.findById(messageId);
//     if (!message) return res.status(404).json({ error: "Message not found" });

//     // Find if the authenticated user already has a reaction
//     const existingReactionIndex = message.reactions.findIndex(
//       (r) => r.userId.toString() === userId.toString(),
//     );

//     if (existingReactionIndex > -1) {
//       if (message.reactions[existingReactionIndex].emoji === emoji) {
//         // If it's the exact same emoji, remove it (toggle off)
//         message.reactions.splice(existingReactionIndex, 1);
//       } else {
//         // If it's a different emoji, update it
//         message.reactions[existingReactionIndex].emoji = emoji;
//       }
//     } else {
//       // Add new reaction
//       message.reactions.push({ userId, emoji });
//     }

//     await message.save();

//     // 🌟 POPULATE: Gather user profiles for the fresh layout response
//     const populatedMessage = await Message.findById(messageId).populate(
//       "reactions.userId",
//       "fullName profilePic",
//     );

//     const isGroup = message.groupId !== null;

//     if (isGroup) {
//       io.to(message.groupId.toString()).emit(
//         "reactionUpdated",
//         populatedMessage,
//       );
//     } else {
//       const recieverSocketId = userSocketMap[message.receiverId];
//       if (recieverSocketId) {
//         io.to(recieverSocketId).emit("reactionUpdated", populatedMessage);
//       }
//       const senderSocketId = userSocketMap[message.senderId];
//       if (senderSocketId) {
//         io.to(senderSocketId).emit("reactionUpdated", populatedMessage);
//       }
//     }

//     res.status(200).json(populatedMessage);
//   } catch (error) {
//     console.error("Reaction Error:", error.message);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };
