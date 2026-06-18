import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { Server } from "socket.io";
import console from "console";
import groupRouter from "./routes/groupRoutes.js";

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: "*" }));

export const io = new Server(server, {
  cors: { origin: "*" },
});

export const userSocketMap = {}; // { userId : socketId }
// Tracks which group call room a specific socket connection is currently inside
const socketGroupCallMap = {}; // { socketId: groupId }

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  console.log("User Connected", userId);

  if (userId) userSocketMap[userId] = socket.id;

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("joinPersonalRoom", (userId) => {
    socket.join(userId);
    console.log(`User socket connected and joined personal room: ${userId}`);
  });

  socket.on("joinGroup", (groupId) => {
    if (!groupId) return;
    socket.join(groupId.toString());
  });

  socket.on("leaveGroup", (groupId) => {
    if (!groupId) return;
    socket.leave(groupId.toString());
  });

  socket.on("joinChat", (chatId) => {
    socket.join(chatId);
  });

  socket.on("messageEdited", (updatedMessage) => {
    if (updatedMessage.groupId) {
      socket
        .to(updatedMessage.groupId.toString())
        .emit("messageUpdated", updatedMessage);
    } else {
      const targetSocketId = userSocketMap[updatedMessage.receiverId];
      if (targetSocketId) {
        io.to(targetSocketId).emit("messageUpdated", updatedMessage);
      }
    }
  });

  socket.on("messageDeleted", (deletedMessage) => {
    if (deletedMessage.groupId) {
      socket
        .to(deletedMessage.groupId.toString())
        .emit("messageRemoved", deletedMessage);
    } else {
      const targetSocketId = userSocketMap[deletedMessage.receiverId];
      if (targetSocketId) {
        io.to(targetSocketId).emit("messageRemoved", deletedMessage);
      }
    }
  });

  socket.on("joinGroupRequests", (groupId) => {
    socket.join(`requests_${groupId}`);
  });

  socket.on("messagesSeen", ({ chatId, user, isGroup }) => {
    if (!chatId || !user) return;

    const payload = { chatId, user };

    if (isGroup) {
      io.to(chatId.toString()).emit("userSeenReceipt", payload);
    } else {
      socket.to(chatId.toString()).emit("userSeenReceipt", payload);
      const targetSocketId = userSocketMap[chatId];
      if (targetSocketId) {
        io.to(targetSocketId).emit("userSeenReceipt", payload);
      }
    }
  });

  // =========================================================================
  // 📞 1-to-1 CALL SIGNALLING HANDLERS
  // =========================================================================
  socket.on("call-user-init", ({ toUserId, type }, callback) => {
    const targetSocketId = userSocketMap[toUserId];
    if (targetSocketId) {
      callback({ targetSocketId });
    } else {
      callback({ targetSocketId: null });
    }
  });

  socket.on("call-user", ({ toSocketId, offer, type, callerProfile }) => {
    io.to(toSocketId).emit("incoming-call", {
      fromSocket: socket.id,
      offer,
      type,
      callerProfile,
    });
  });

  socket.on("answer-call", ({ toSocket, answer }) => {
    io.to(toSocket).emit("call-accepted", { answer });
  });

  socket.on("ice-candidate", ({ toSocket, candidate }) => {
    io.to(toSocket).emit("ice-candidate", { candidate });
  });

  socket.on("end-call", ({ toSocket }) => {
    io.to(toSocket).emit("call-ended");
  });

  // =========================================================================
  // 👥 MULTI-PEER GROUP CALL SIGNALLING HANDLERS (NEW)
  // =========================================================================
  socket.on("join-group-call", ({ groupId, userProfile }) => {
    const roomName = `group-call-${groupId}`;
    socket.join(roomName);
    socketGroupCallMap[socket.id] = groupId;

    // Broadcast to existing room participants that a newcomer entered
    socket.to(roomName).emit("user-joined-group-call", {
      fromSocketId: socket.id,
      userProfile,
    });
  });

  socket.on("group-signal", ({ targetSocketId, signal }) => {
    // Forward direct cryptographic Offer/Answer configurations between mesh units
    io.to(targetSocketId).emit("receive-group-signal", {
      senderSocketId: socket.id,
      signal,
    });
  });

  socket.on("group-ice-candidate", ({ targetSocketId, candidate }) => {
    // Forward internet network routing nodes between explicit mesh units
    io.to(targetSocketId).emit("receive-group-ice-candidate", {
      senderSocketId: socket.id,
      candidate,
    });
  });

  socket.on("leave-group-call", () => {
    const groupId = socketGroupCallMap[socket.id];
    if (groupId) {
      const roomName = `group-call-${groupId}`;
      socket.leave(roomName);
      socket
        .to(roomName)
        .emit("user-left-group-call", { participantSocketId: socket.id });
      delete socketGroupCallMap[socket.id];
    }
  });

  //========================================================================
  // TYPING
  //================================================

  //========================================================================
  // TYPING IMPLEMENTATION LAYER
  //========================================================================

  socket.on("typing", (data) => {
    if (data.isGroup) {
      socket.to(data.groupId).emit("displayTyping", data);
    } else {
      // 🌟 FIXED: fallback to the tracking string parsed at connection time
      const senderId = userId || data.senderId;

      socket.to(data.receiverId).emit("displayTyping", {
        isGroup: false,
        senderId: senderId, // Resolves correctly to the peer's actual database _id string
        senderName: data.senderName || "Someone",
      });
    }
  });

  socket.on("stop-typing", (data) => {
    if (data.isGroup) {
      socket.to(data.groupId).emit("hideTyping", data);
    } else {
      // 🌟 FIXED: fallback to the tracking string parsed at connection time
      const senderId = userId || data.senderId;

      socket.to(data.receiverId).emit("hideTyping", {
        isGroup: false,
        senderId: senderId, // Safely forwards the accurate ID to remove indicators cleanly
      });
    }
  });
  // =========================================================================
  // DISCONNECT PIPELINE CLEANUP
  // =========================================================================
  socket.on("disconnect", () => {
    console.log("User Disconnected", userId);

    // Group Call Cleanup on sudden tab closure
    const groupId = socketGroupCallMap[socket.id];
    if (groupId) {
      const roomName = `group-call-${groupId}`;
      socket
        .to(roomName)
        .emit("user-left-group-call", { participantSocketId: socket.id });
      delete socketGroupCallMap[socket.id];
    }

    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

app.use(express.json({ limit: "4mb" }));
app.use(cors());

app.use("/api/status", (req, res) => res.send("server is live"));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);
app.use("/api/groups", groupRouter);
app.get("/", (req, res) => {
  res.send("Backend server is running....");
});

await connectDB();
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log("Server is Running on port :" + PORT));
}

export default server;
