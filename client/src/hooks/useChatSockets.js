import { useEffect } from "react";
import toast from "react-hot-toast";

export const useChatSockets = ({
  socket,
  authUser,
  selectedUser,
  selectedGroup,
  setMessages,
  setUnseenMessages,
  setUnseenGroups,
  setTypingStatus,
  setGroups,
  getGroups,
  setUsers,
  setOnlineUsers, // ✨ ADDED: Hook into the dedicated real-time tracker passed from ChatProvider
  markAsSeen,
}) => {
  useEffect(() => {
    if (!socket) return;

    const triggerNotification = (message, isGroupMsg) => {
      const senderName =
        message.senderId?.fullName || message.senderId?.name || "Someone";
      const notificationBody = message.text || "📷 Sent an attachment";
      const title = isGroupMsg
        ? `New message in Group`
        : `New message from ${senderName}`;
      toast(`${title}: ${notificationBody}`);
    };

    const handleNewMessage = (newMessage) => {
      console.log("Real-time Message Received:", newMessage);
      const rawSenderId = newMessage.senderId?._id || newMessage.senderId;
      const senderUserIdString = rawSenderId?.toString();
      const authUserIdString = authUser?._id?.toString();

      // --- Group Context Logic ---
      if (newMessage.groupId) {
        const incomingTargetId = newMessage.groupId?.toString();
        const currentActiveId = selectedGroup?._id?.toString();

        setGroups((prevGroups) => {
          const targetGroup = prevGroups.find(
            (g) => g._id?.toString() === incomingTargetId,
          );
          if (!targetGroup) return prevGroups;
          return [
            targetGroup,
            ...prevGroups.filter((g) => g._id?.toString() !== incomingTargetId),
          ];
        });

        if (selectedGroup && incomingTargetId === currentActiveId) {
          if (senderUserIdString === authUserIdString) return;
          setMessages((prev) => [...prev, newMessage]);
          markAsSeen(incomingTargetId, true);
        } else {
          setUnseenGroups((prev) => ({
            ...prev,
            [incomingTargetId]: (prev[incomingTargetId] || 0) + 1,
          }));
          if (senderUserIdString !== authUserIdString) {
            triggerNotification(newMessage, true);
          }
        }
        return;
      }

      // --- Private Message Context Logic ---
      if (senderUserIdString === authUserIdString) return;
      const activeUserId = selectedUser?._id?.toString();

      setUsers((prevUsers) => {
        const targetUser = prevUsers.find(
          (u) => u._id?.toString() === senderUserIdString,
        );
        if (!targetUser) return prevUsers;

        const remainingUsers = prevUsers.filter(
          (u) => u._id?.toString() !== senderUserIdString,
        );
        return [targetUser, ...remainingUsers];
      });

      if (selectedUser && senderUserIdString === activeUserId) {
        setMessages((prev) => [...prev, newMessage]);
        markAsSeen(senderUserIdString, false);
      } else {
        setUnseenMessages((prev) => ({
          ...prev,
          [senderUserIdString]: (prev[senderUserIdString] || 0) + 1,
        }));
        triggerNotification(newMessage, false);
      }
    };

    const handleOnlineUsers = (userIdsArray) => {
      setOnlineUsers(userIdsArray);
    };

    socket.on("getOnlineUsers", handleOnlineUsers);
    socket.on("newMessage", handleNewMessage);

    socket.on("messageUpdated", (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m)),
      );
    });

    socket.on("messageRemoved", (deletedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === deletedMsg._id ? deletedMsg : m)),
      );
    });

    socket.on("userSeenReceipt", ({ user }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          const viewers =
            msg.seenBy?.map((v) => (v._id || v)?.toString()) || [];
          const newViewerId = (user._id || user)?.toString();
          return !viewers.includes(newViewerId)
            ? { ...msg, seenBy: [...(msg.seenBy || []), user] }
            : msg;
        }),
      );
    });

    socket.on("requestAction", ({ groupName, action }) => {
      getGroups();
      action === "accept"
        ? toast.success(`${groupName} request accepted`)
        : toast.error(`${groupName} request rejected`);
    });

    socket.on("requestedToJoin", () => {
      toast.success("New join request received");
      getGroups();
    });

    socket.on("reactionUpdated", (updatedMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMessage._id ? updatedMessage : m)),
      );
    });

    socket.on("socketActionError", ({ message }) => {
      if (message) toast.error(message);
    });

    socket.on("displayTyping", (data) => {
      const isGroup = data.isGroup ?? false;
      const chatId = isGroup
        ? data.groupId
        : data.senderId || data.senderIdString || data.userId || data.from;
      const senderName = data.senderName || "Someone";
      if (!chatId) return;

      setTypingStatus((prev) => ({
        ...prev,
        [chatId]: isGroup
          ? [
              ...(prev[chatId] || []).filter((n) => n !== senderName),
              senderName,
            ]
          : true,
      }));
    });

    socket.on("hideTyping", (data) => {
      const isGroup = data.isGroup ?? false;
      const chatId = isGroup
        ? data.groupId
        : data.senderId || data.senderIdString || data.userId || data.from;
      const senderName = data.senderName || "Someone";
      if (!chatId) return;

      setTypingStatus((prev) => {
        if (isGroup) {
          return {
            ...prev,
            [chatId]: (prev[chatId] || []).filter((n) => n !== senderName),
          };
        }
        const copy = { ...prev };
        delete copy[chatId];
        return copy;
      });
    });

    // Unmount cleanup sequence
    return () => {
      socket.off("getOnlineUsers", handleOnlineUsers);
      socket.off("newMessage", handleNewMessage);
      socket.off("messageUpdated");
      socket.off("messageRemoved");
      socket.off("userSeenReceipt");
      socket.off("requestAction");
      socket.off("requestedToJoin");
      socket.off("reactionUpdated");
      socket.off("socketActionError");
      socket.off("displayTyping");
      socket.off("hideTyping");
    };
  }, [
    socket,
    authUser?._id,
    selectedUser?._id,
    selectedGroup?._id,
    setMessages,
    setUnseenMessages,
    setUnseenGroups,
    setTypingStatus,
    setGroups,
    setUsers,
    setOnlineUsers,
    getGroups,
    markAsSeen,
  ]);
};
