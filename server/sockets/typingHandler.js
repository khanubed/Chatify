export default (io, socket) => {
  const verifiedUserId = socket.user._id.toString();

  socket.on("typing", (data) => {
    if (data.isGroup) {
      socket.to(data.groupId).emit("displayTyping", data);
    } else {
      socket.to(data.receiverId).emit("displayTyping", {
        isGroup: false,
        senderId: verifiedUserId, 
        senderName: data.senderName || "Someone",
      });
    }
  });

  socket.on("stop-typing", (data) => {
    if (data.isGroup) {
      socket.to(data.groupId).emit("hideTyping", data);
    } else {
      socket.to(data.receiverId).emit("hideTyping", {
        isGroup: false,
        senderId: verifiedUserId,
      });
    }
  });
};