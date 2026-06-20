import { Server } from "socket.io";
import socketAuth from "../middleware/socketAuth.js";
import registerMessageHandler from "./messageHandler.js";
import registerCallHandler from "./callHandler.js";
import registerTypingHandler from "./typingHandler.js";

export const userSocketMap = {}; 
export let io = null;
const socketGroupCallMap = {}; 

export const initSocketServer = (server) => {
  io = new Server(server, {
    cors: { origin: "*" },
    maxHttpBufferSize: 50 * 1024 * 1024,
  });

  io.use(socketAuth);

  io.on("connection", (socket) => {
    // Rely completely on verified identity token properties
    const userId = socket.user._id.toString();
    console.log("Securely Authenticated User Connected:", userId);

    userSocketMap[userId] = socket.id;
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    console.log(userSocketMap);

    // Dynamic Channel/Room listeners
    socket.on("joinPersonalRoom", (id) => socket.join(id));
    socket.on("joinGroup", (groupId) => groupId && socket.join(groupId.toString()));
    socket.on("leaveGroup", (groupId) => groupId && socket.leave(groupId.toString()));
    socket.on("joinChat", (chatId) => socket.join(chatId));
    socket.on("joinGroupRequests", (groupId) => socket.join(`requests_${groupId}`));

    // 🌟 Inject Sub-Modules
    registerMessageHandler(io, socket, userSocketMap);
    registerCallHandler(io, socket, userSocketMap, socketGroupCallMap);
    registerTypingHandler(io, socket);

    // Disconnect Cleaning Flow
    socket.on("disconnect", () => {
      console.log("User Disconnected", userId);
      
      const groupId = socketGroupCallMap[socket.id];
      if (groupId) {
        socket.to(`group-call-${groupId}`).emit("user-left-group-call", { participantSocketId: socket.id });
        delete socketGroupCallMap[socket.id];
      }

      delete userSocketMap[userId];
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
  });

  return io;
};
