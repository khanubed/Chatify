import Message from "../models/message.js";
import User from "../models/user.js";
import Group from "../models/group.js";
import { uploadToCloudinary } from "../lib/multer.js";
import { extractCloudinaryPublicId } from "../lib/util.js";
import { v2 as cloudinary } from "cloudinary";  

export default (io, socket, userSocketMap) => {

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

  const broadcastToConversation = (
    message,
    eventName,
    payload,
    excludeSocketId = null,
  ) => {
    if (message.groupId) {
      if (excludeSocketId) {
        socket.to(message.groupId.toString()).emit(eventName, payload);
      } else {
        io.to(message.groupId.toString()).emit(eventName, payload);
      }
    } else {
      const receiverSocketId = userSocketMap[message.receiverId];
      if (receiverSocketId && receiverSocketId !== excludeSocketId) {
        io.to(receiverSocketId).emit(eventName, payload);
      }
      const senderSocketId = userSocketMap[message.senderId];
      if (senderSocketId && senderSocketId !== excludeSocketId) {
        io.to(senderSocketId).emit(eventName, payload);
      }
    }
  };

  const sendAck = (callback, payload) => {
    if (typeof callback === "function") callback(payload);
  };

  const emitActionError = (callback, message, status = 400) => {
    if (typeof callback === "function") {
      sendAck(callback, { success: false, message, status });
      return;
    }
    socket.emit("socketActionError", { message, status });
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

  // 0. SEND MESSAGE HANDLER (persists message and media directly through Socket.IO)
  socket.on("sendMessage", async (payload = {}, callback) => {
    try {
      const senderId = getAuthenticatedUserId();
      if (!senderId) {
        return emitActionError(
          callback,
          "Socket connection is not authenticated",
          401,
        );
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
        return emitActionError(callback, "Missing chat target");
      }

      if (isGroup) {
        const group = await Group.findById(resolvedGroupId).select("members");
        if (!group) return emitActionError(callback, "Group not found", 404);

        const isMember = group.members.some(
          (mId) => mId.toString() === senderId,
        );
        if (!isMember) {
          return emitActionError(
            callback,
            "You are not a member of this group",
            403,
          );
        }
      } else {
        const [receiver, sender] = await Promise.all([
          User.findById(receiverId),
          User.findById(senderId),
        ]);

        if (!receiver || !sender) {
          return emitActionError(callback, "User profile not found", 404);
        }

        if (
          receiver.blockedUsers?.some((id) => id && id.toString() === senderId)
        ) {
          return emitActionError(
            callback,
            "Message not sent. You have been blocked by this user.",
          );
        }

        if (
          sender.blockedUsers?.some(
            (id) => id && id.toString() === receiverId.toString(),
          )
        ) {
          return emitActionError(
            callback,
            "Message not sent. You must unblock this user.",
          );
        }
      }

      // 🌟 Clean validation structure: All binary upload engines are gone.
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

      broadcastToConversation(newMessage, "newMessage", newMessage, socket.id);
      sendAck(callback, { success: true, newMessage });
    } catch (error) {
      console.error("Socket Error in sendMessage handling layer:", error);
      emitActionError(callback, error.message || "Failed to send message", 500);
    }
  });

  // 1. EDIT MESSAGE HANDLER (Modifies database over WS directly)
  socket.on("editMessage", async ({ messageId, newText }, callback) => {
    try {
      const userId = getAuthenticatedUserId();
      if (!userId) return;

      const message = await Message.findById(messageId);
      if (!message) return emitActionError(callback, "Message not found", 404);

      // Security Guard Check
      if (message.senderId.toString() !== userId) {
        console.error(`Unauthorized edit attempt by user: ${userId}`);
        return emitActionError(callback, "Unauthorized action", 403);
      }

      if (message.isDeleted) {
        return emitActionError(callback, "Cannot edit a deleted message");
      }

      // Update schema parameters
      message.text = newText;
      message.isEdited = true;
      await message.save();

      // Broadcast complete updated state out to the channels
      broadcastToConversation(message, "messageUpdated", message);
      sendAck(callback, { success: true, message });
    } catch (error) {
      console.error("Socket Error in editMessage handling layer:", error);
      emitActionError(callback, error.message || "Failed to edit message", 500);
    }
  });

  // 2. DELETE MESSAGE HANDLER (Applies Soft Delete directly over WS)
  socket.on("deleteMessage", async ({ messageId }, callback) => {
    try {
      const userId = getAuthenticatedUserId();
      if (!userId) return;

      const message = await Message.findById(messageId);
      if (!message) return emitActionError(callback, "Message not found", 404);

      // Security Guard Check
      if (message.senderId.toString() !== userId) {
        console.error(`Unauthorized delete attempt by user: ${userId}`);
        return emitActionError(callback, "Unauthorized action", 403);
      }

      // 🌟 OPTIMIZATION STEP 1: Capture the target file links before nullifying them
      const mediaUrls = [message.image, message.audio, message.video].filter(
        Boolean,
      );

      // Scrub the database records instantly
      message.isDeleted = true;
      message.text = "This message was deleted";
      message.image = null;
      message.audio = null;
      message.video = null;
      await message.save();

      // 🌟 OPTIMIZATION STEP 2: Respond to client interfaces instantly (Zero UI blockage)
      broadcastToConversation(message, "messageRemoved", message);
      sendAck(callback, { success: true, message });

      // 🌟 OPTIMIZATION STEP 3: Fire-and-Forget Cloudinary background cleanup execution engine
      if (mediaUrls.length > 0) {
        // Intentionally run without wrapping in 'await' so it detaches from the main thread execution line
        Promise.all(
          mediaUrls.map(async (url) => {
            const assetDetails = extractCloudinaryPublicId(url);
            if (!assetDetails) return;

            try {
              const result = await cloudinary.uploader.destroy(
                assetDetails.publicId,
                {
                  resource_type: assetDetails.resourceType,
                  invalidate: true, // Force-evicts CDN cache nodes immediately
                },
              );
              console.log(
                `Cloudinary garbage collector scrub complete for asset: ${assetDetails.publicId}`,
                result,
              );
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
      emitActionError(
        callback,
        error.message || "Failed to delete message",
        500,
      );
    }
  });

  // 3. TOGGLE REACTION HANDLER (Manages Reaction Array directly over WS)
  socket.on("toggleReaction", async ({ messageId, emoji }, callback) => {
    try {
      const userId = getAuthenticatedUserId();
      if (!userId) return;

      const message = await Message.findById(messageId);
      if (!message) return emitActionError(callback, "Message not found", 404);

      const existingReactionIndex = message.reactions.findIndex(
        (r) => r.userId.toString() === userId,
      );

      if (existingReactionIndex > -1) {
        if (message.reactions[existingReactionIndex].emoji === emoji) {
          // Toggle off if clicking the identical icon
          message.reactions.splice(existingReactionIndex, 1);
        } else {
          // Change selection choice state mapping
          message.reactions[existingReactionIndex].emoji = emoji;
        }
      } else {
        // Build new reaction schema reference
        message.reactions.push({ userId, emoji });
      }

      await message.save();

      // Hydrate profiles for precise layout rendering
      const populatedMessage = await Message.findById(messageId).populate(
        "reactions.userId",
        "fullName profilePic",
      );

      // Distribute fresh reaction configurations out to channels
      broadcastToConversation(
        populatedMessage,
        "reactionUpdated",
        populatedMessage,
      );
      sendAck(callback, { success: true, message: populatedMessage });
    } catch (error) {
      console.error("Socket Error in toggleReaction handling layer:", error);
      emitActionError(
        callback,
        error.message || "Failed to update reaction",
        500,
      );
    }
  });

  // 4. SEEN RECEIPT HANDLER (persists seenBy directly through Socket.IO)
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
          : {
              senderId: chatId,
              receiverId: userId,
              seenBy: { $ne: userId },
            },
        { $addToSet: { seenBy: userId } },
      );

      const user = {
        _id: socket.user._id,
        fullName: socket.user.fullName,
        profilePic: socket.user.profilePic,
        username: socket.user.username,
      };

      const payload = { chatId, user };

      if (parsedIsGroup) {
        io.to(chatId.toString()).emit("userSeenReceipt", payload);
      } else {
        const targetSocketId = userSocketMap[chatId];
        if (targetSocketId) {
          io.to(targetSocketId).emit("userSeenReceipt", payload);
        }
        const currentSocketId = userSocketMap[userId];
        if (currentSocketId) {
          io.to(currentSocketId).emit("userSeenReceipt", payload);
        }
      }

      sendAck(callback, { success: true });
    } catch (error) {
      console.error("Socket Error in markMessagesSeen handling layer:", error);
      emitActionError(
        callback,
        error.message || "Failed to mark messages seen",
        500,
      );
    }
  });
};
