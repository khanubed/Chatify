export default (io, socket, userSocketMap, socketGroupCallMap) => {
  // 1-to-1 Calls
  socket.on("call-user-init", ({ toUserId, type }, callback) => {
    const targetSocketId = userSocketMap[toUserId];
    callback({ targetSocketId: targetSocketId || null });
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

  // Group Multi-Peer Mesh Calls
  socket.on("join-group-call", ({ groupId, userProfile }) => {
    const roomName = `group-call-${groupId}`;
    socket.join(roomName);
    socketGroupCallMap[socket.id] = groupId;
    socket.to(roomName).emit("user-joined-group-call", { fromSocketId: socket.id, userProfile });
  });

  socket.on("group-signal", ({ targetSocketId, signal }) => {
    io.to(targetSocketId).emit("receive-group-signal", { senderSocketId: socket.id, signal });
  });

  socket.on("group-ice-candidate", ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit("receive-group-ice-candidate", { senderSocketId: socket.id, candidate });
  });

  socket.on("leave-group-call", () => {
    const groupId = socketGroupCallMap[socket.id];
    if (groupId) {
      const roomName = `group-call-${groupId}`;
      socket.leave(roomName);
      socket.to(roomName).emit("user-left-group-call", { participantSocketId: socket.id });
      delete socketGroupCallMap[socket.id];
    }
  });
};