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

export const io = new Server(server, {
  cors: { origin: "*" },
});

export const userSocketMap = {}; // { userId : socketId }

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  console.log("User Connected", userId);

  if (userId) userSocketMap[userId] = socket.id;

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

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

  socket.on("disconnect", () => {
    console.log("User Disconnected", userId);
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

await connectDB();
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log("Server is Running on port :" + PORT));
}

export default server;
