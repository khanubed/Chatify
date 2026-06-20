import Message from "../models/message.js";
import User from "../models/user.js";
import Group from "../models/group.js";
import { extractCloudinaryPublicId } from "../lib/util.js";
import { v2 as cloudinary } from "cloudinary";

export default  (io, socket, userSocketMap) => {
  const getAuthenticatedUserId = () => {
    const userId = socket.user?._id || socket.request?.user?._id;
    if (!userId) {
      console.error(
        "Socket Action Rejected: Unauthenticated connection socket ID:",
        socket.id,
      );
      return null;
    }
    return userId.toString();
  };

  const parseBoolean = (value) => value === true || value === "true";

  const hydrateMessage = (messageId) =>
    Message.findById(messageId)
      .populate("senderId", "fullName profilePic")
      .populate({
        path: "parent",
        select: "text image audio video senderId",
        populate: { path: "senderId", select: "fullName" },
      })
      .populate("seenBy", "fullName profilePic")
      .populate("reactions.userId", "fullName profilePic");

  // 0. SEND MESSAGE HANDLER
  socket.on("sendMessage", async (payload = {}, callback) => {
    try {
      const senderId = getAuthenticatedUserId();
      if (!senderId) {
        if (typeof callback === "function")
          return callback({
            success: false,
            message: "Socket connection is not authenticated",
            status: 401,
          });
        return socket.emit("socketActionError", {
          message: "Socket connection is not authenticated",
          status: 401,
        });
      }

      const {
        text,
        targetId,
        groupId,
        parent,
        image,
        audio,
        video,
        messageType,
      } = payload;

      const isGroup = parseBoolean(payload.isGroup);
      const isForwarded = parseBoolean(payload.isForwarded);
      const resolvedGroupId = isGroup ? groupId || targetId : null;
      const receiverId = isGroup ? null : targetId;

      if (!targetId && !resolvedGroupId) {
        if (typeof callback === "function")
          return callback({
            success: false,
            message: "Missing chat target",
            status: 400,
          });
        return socket.emit("socketActionError", {
          message: "Missing chat target",
          status: 400,
        });
      }

      if (isGroup) {
        const group = await Group.findById(resolvedGroupId).select("members");
        if (!group) {
          if (typeof callback === "function")
            return callback({
              success: false,
              message: "Group not found",
              status: 404,
            });
          return socket.emit("socketActionError", {
            message: "Group not found",
            status: 404,
          });
        }

        const isMember = group.members.some(
          (mId) => mId.toString() === senderId,
        );
        if (!isMember) {
          if (typeof callback === "function")
            return callback({
              success: false,
              message: "You are not a member of this group",
              status: 403,
            });
          return socket.emit("socketActionError", {
            message: "You are not a member of this group",
            status: 403,
          });
        }
      } else {
        const [receiver, sender] = await Promise.all([
          User.findById(receiverId),
          User.findById(senderId),
        ]);

        if (!receiver || !sender) {
          if (typeof callback === "function")
            return callback({
              success: false,
              message: "User profile not found",
              status: 404,
            });
          return socket.emit("socketActionError", {
            message: "User profile not found",
            status: 404,
          });
        }

        if (
          receiver.blockedUsers?.some((id) => id && id.toString() === senderId)
        ) {
          if (typeof callback === "function")
            return callback({
              success: false,
              message: "Message not sent. You have been blocked by this user.",
              status: 400,
            });
          return socket.emit("socketActionError", {
            message: "Message not sent. You have been blocked by this user.",
            status: 400,
          });
        }

        if (
          sender.blockedUsers?.some(
            (id) => id && id.toString() === receiverId.toString(),
          )
        ) {
          if (typeof callback === "function")
            return callback({
              success: false,
              message: "Message not sent. You must unblock this user.",
              status: 400,
            });
          return socket.emit("socketActionError", {
            message: "Message not sent. You must unblock this user.",
            status: 400,
          });
        }
      }

      const resolvedMessageType = messageType || "text";

      let newMessage = await Message.create({
        senderId,
        text: text || "",
        image: image || null,
        audio: audio || null,
        video: video || null,
        receiverId,
        groupId: isGroup ? resolvedGroupId : null,
        parent: parent && parent !== "null" ? parent : null,
        seenBy: [senderId],
        isForwarded,
        messageType: resolvedMessageType,
      });

      newMessage = await hydrateMessage(newMessage._id);

      // Inlined Broadcast Logic (Exclude sender since they receive the acknowledgement callback)
      if (newMessage.groupId) {
        socket.to(newMessage.groupId.toString()).emit("newMessage", newMessage);
      } else {
        const receiverSocketId =
          userSocketMap[newMessage.receiverId?.toString()];
        // if (receiverSocketId) io.to(receiverSocketId).emit("newMessage", newMessage);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("newMessage", newMessage);
          console.log(`Message send to receiver at ${new Date().toISOString()}`)
        }
      }

      if (typeof callback === "function")
        callback({ success: true, newMessage });
    } catch (error) {
      console.error("Socket Error in sendMessage handling layer:", error);
      if (typeof callback === "function")
        return callback({
          success: false,
          message: error.message || "Failed to send message",
          status: 500,
        });
      socket.emit("socketActionError", {
        message: error.message || "Failed to send message",
        status: 500,
      });
    }
  });

  // 1. EDIT MESSAGE HANDLER
  socket.on("editMessage", async ({ messageId, newText }, callback) => {
    try {
      const userId = getAuthenticatedUserId();
      if (!userId) return;

      const message = await Message.findById(messageId);
      if (!message) {
        if (typeof callback === "function")
          return callback({
            success: false,
            message: "Message not found",
            status: 404,
          });
        return socket.emit("socketActionError", {
          message: "Message not found",
          status: 404,
        });
      }

      if (message.senderId.toString() !== userId) {
        console.error(`Unauthorized edit attempt by user: ${userId}`);
        if (typeof callback === "function")
          return callback({
            success: false,
            message: "Unauthorized action",
            status: 403,
          });
        return socket.emit("socketActionError", {
          message: "Unauthorized action",
          status: 403,
        });
      }

      if (message.isDeleted) {
        if (typeof callback === "function")
          return callback({
            success: false,
            message: "Cannot edit a deleted message",
            status: 400,
          });
        return socket.emit("socketActionError", {
          message: "Cannot edit a deleted message",
          status: 400,
        });
      }

      message.text = newText;
      message.isEdited = true;
      await message.save();

      // Inlined Broadcast Logic (Emits to everyone in the chat pipeline)
      if (message.groupId) {
        io.to(message.groupId.toString()).emit("messageUpdated", message);
      } else {
        const receiverSocketId = userSocketMap[message.receiverId];
        if (receiverSocketId)
          io.to(receiverSocketId).emit("messageUpdated", message);
        const senderSocketId = userSocketMap[message.senderId];
        if (senderSocketId)
          io.to(senderSocketId).emit("messageUpdated", message);
      }

      if (typeof callback === "function") callback({ success: true, message });
    } catch (error) {
      console.error("Socket Error in editMessage handling layer:", error);
      if (typeof callback === "function")
        return callback({
          success: false,
          message: error.message || "Failed to edit message",
          status: 500,
        });
      socket.emit("socketActionError", {
        message: error.message || "Failed to edit message",
        status: 500,
      });
    }
  });

  // 2. DELETE MESSAGE HANDLER
  socket.on("deleteMessage", async ({ messageId }, callback) => {
    try {
      const userId = getAuthenticatedUserId();
      if (!userId) return;

      const message = await Message.findById(messageId);
      if (!message) {
        if (typeof callback === "function")
          return callback({
            success: false,
            message: "Message not found",
            status: 404,
          });
        return socket.emit("socketActionError", {
          message: "Message not found",
          status: 404,
        });
      }

      if (message.senderId.toString() !== userId) {
        console.error(`Unauthorized delete attempt by user: ${userId}`);
        if (typeof callback === "function")
          return callback({
            success: false,
            message: "Unauthorized action",
            status: 403,
          });
        return socket.emit("socketActionError", {
          message: "Unauthorized action",
          status: 403,
        });
      }

      const mediaUrls = [message.image, message.audio, message.video].filter(
        Boolean,
      );

      message.isDeleted = true;
      message.text = "This message was deleted";
      message.image = null;
      message.audio = null;
      message.video = null;
      await message.save();

      // Inlined Broadcast Logic
      if (message.groupId) {
        io.to(message.groupId.toString()).emit("messageRemoved", message);
      } else {
        const receiverSocketId = userSocketMap[message.receiverId];
        if (receiverSocketId)
          io.to(receiverSocketId).emit("messageRemoved", message);
        const senderSocketId = userSocketMap[message.senderId];
        if (senderSocketId)
          io.to(senderSocketId).emit("messageRemoved", message);
      }

      if (typeof callback === "function") callback({ success: true, message });

      // Background Cloudinary Asset Cleanup
      if (mediaUrls.length > 0) {
        Promise.all(
          mediaUrls.map(async (url) => {
            const assetDetails = extractCloudinaryPublicId(url);
            if (!assetDetails) return;
            try {
              await cloudinary.uploader.destroy(assetDetails.publicId, {
                resource_type: assetDetails.resourceType,
                invalidate: true,
              });
            } catch (cloudinaryErr) {
              console.error(
                `Background cloud erasure routine stalled for asset URL (${url}):`,
                cloudinaryErr,
              );
            }
          }),
        ).catch((err) =>
          console.error(
            "Unhandled promise collection crash inside asset purger:",
            err,
          ),
        );
      }
    } catch (error) {
      console.error("Socket Error in deleteMessage handling layer:", error);
      if (typeof callback === "function")
        return callback({
          success: false,
          message: error.message || "Failed to delete message",
          status: 500,
        });
      socket.emit("socketActionError", {
        message: error.message || "Failed to delete message",
        status: 500,
      });
    }
  });

  // 3. TOGGLE REACTION HANDLER
  socket.on("toggleReaction", async ({ messageId, emoji }, callback) => {
    try {
      const userId = getAuthenticatedUserId();
      if (!userId) return;

      const message = await Message.findById(messageId);
      if (!message) {
        if (typeof callback === "function")
          return callback({
            success: false,
            message: "Message not found",
            status: 404,
          });
        return socket.emit("socketActionError", {
          message: "Message not found",
          status: 404,
        });
      }

      const existingReactionIndex = message.reactions.findIndex(
        (r) => r.userId.toString() === userId,
      );

      if (existingReactionIndex > -1) {
        if (message.reactions[existingReactionIndex].emoji === emoji) {
          message.reactions.splice(existingReactionIndex, 1);
        } else {
          message.reactions[existingReactionIndex].emoji = emoji;
        }
      } else {
        message.reactions.push({ userId, emoji });
      }

      await message.save();

      const populatedMessage = await Message.findById(messageId).populate(
        "reactions.userId",
        "fullName profilePic",
      );

      // Inlined Broadcast Logic
      if (populatedMessage.groupId) {
        io.to(populatedMessage.groupId.toString()).emit(
          "reactionUpdated",
          populatedMessage,
        );
      } else {
        const receiverSocketId = userSocketMap[populatedMessage.receiverId];
        if (receiverSocketId)
          io.to(receiverSocketId).emit("reactionUpdated", populatedMessage);
        const senderSocketId = userSocketMap[populatedMessage.senderId];
        if (senderSocketId)
          io.to(senderSocketId).emit("reactionUpdated", populatedMessage);
      }

      if (typeof callback === "function")
        callback({ success: true, message: populatedMessage });
    } catch (error) {
      console.error("Socket Error in toggleReaction handling layer:", error);
      if (typeof callback === "function")
        return callback({
          success: false,
          message: error.message || "Failed to update reaction",
          status: 500,
        });
      socket.emit("socketActionError", {
        message: error.message || "Failed to update reaction",
        status: 500,
      });
    }
  });

  // 4. SEEN RECEIPT HANDLER
  socket.on("markMessagesSeen", async ({ chatId, isGroup }, callback) => {
    try {
      const userId = getAuthenticatedUserId();
      if (!userId || !chatId) return;

      const parsedIsGroup = parseBoolean(isGroup);

      await Message.updateMany(
        parsedIsGroup
          ? {
              groupId: chatId,
              seenBy: { $ne: userId },
              senderId: { $ne: userId },
            }
          : { senderId: chatId, receiverId: userId, seenBy: { $ne: userId } },
        { $addToSet: { seenBy: userId } },
      );

      const payload = {
        chatId,
        user: {
          _id: socket.user._id,
          fullName: socket.user.fullName,
          profilePic: socket.user.profilePic,
          username: socket.user.username,
        },
      };

      if (parsedIsGroup) {
        io.to(chatId.toString()).emit("userSeenReceipt", payload);
      } else {
        const targetSocketId = userSocketMap[chatId];
        if (targetSocketId)
          io.to(targetSocketId).emit("userSeenReceipt", payload);
        const currentSocketId = userSocketMap[userId];
        if (currentSocketId)
          io.to(currentSocketId).emit("userSeenReceipt", payload);
      }

      if (typeof callback === "function") callback({ success: true });
    } catch (error) {
      console.error("Socket Error in markMessagesSeen handling layer:", error);
      if (typeof callback === "function")
        return callback({
          success: false,
          message: error.message || "Failed to mark messages seen",
          status: 500,
        });
      socket.emit("socketActionError", {
        message: error.message || "Failed to mark messages seen",
        status: 500,
      });
    }
  });
};
