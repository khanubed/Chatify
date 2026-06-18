import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
} from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";
import API from "../src/api/axios"; // Consistent configured instance

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});
  const [unseenGroups, setUnseenGroups] = useState({});
  const [typingStatus, setTypingStatus] = useState({});
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);

  const { socket, authUser, setAuthUser } = useContext(AuthContext);

  const emitSocketAction = useCallback(
    (eventName, payload, timeout = 30000) =>
      new Promise((resolve, reject) => {
        if (!socket) {
          reject(new Error("Chat disconnected"));
          return;
        }

        socket.timeout(timeout).emit(eventName, payload, (error, response) => {
          if (error) {
            reject(new Error("Socket request timed out"));
            return;
          }

          if (!response?.success) {
            reject(new Error(response?.message || "Socket action failed"));
            return;
          }

          resolve(response);
        });
      }),
    [socket],
  );

  const formDataToSocketPayload = async (formData, targetId, isGroupChat) => {
    const payload = {
      targetId,
      isGroup: isGroupChat,
    };

    for (const [key, value] of formData.entries()) {
      if (key === "file" && value instanceof Blob) {
        payload.file = {
          originalname: value.name || "voice-message.webm",
          mimetype: value.type,
          size: value.size,
          buffer: await value.arrayBuffer(),
        };
      } else {
        payload[key] = value;
      }
    }

    if (isGroupChat) payload.groupId = payload.groupId || targetId;
    return payload;
  };

  const getUsers = async () => {
    try {
      const { data } = await API.get("/messages/users");
      if (data.success) {
        setUsers(data.users);
        setUnseenMessages((prev) => ({ ...prev, ...data.unseenMessages }));
      }
    } catch (error) {
      toast.error(error.message || "Failed to fetch users");
    }
  };

  const getGroups = async () => {
    try {
      const { data } = await API.get("/groups/all");
      if (data.success) {
        setGroups(data.groups);
        console.log(data.groups);
        if (data.unseenGroups) setUnseenGroups(data.unseenGroups);

        if (socket && data.groups?.length > 0) {
          data.groups.forEach((group) => {
            socket.emit("joinGroup", group._id?.toString());
          });
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch groups");
    }
  };

  const createGroup = async (groupData) => {
    try {
      const { data } = await API.post("/groups/create", groupData);
      if (data.success) {
        setGroups((prevGroups) => [...prevGroups, data.group]);
        toast.success(`Group "${groupData.name}" created successfully!`);
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
      return false;
    }
  };

  const getMessages = async (targetId, isGroupChat = false) => {
    try {
      const { data } = await API.get(
        `/messages/${targetId}?isGroup=${isGroupChat}`,
      );
      if (data.success) {
        setMessages(data.messages);
        markAsSeen(targetId, isGroupChat);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch messages");
    }
  };
  const sendMessage = async (
    formData,
    customTargetId = null,
    customIsGroup = null,
  ) => {
    try {
      // 🌟 1. Dynamically choose between the active chat or a forward target
      const isGroupChat =
        customIsGroup !== null ? customIsGroup : !!selectedGroup;
      const targetId =
        customTargetId ||
        (isGroupChat ? selectedGroup?._id : selectedUser?._id);

      if (!targetId) return;

      if (!socket) {
        toast.error("Chat disconnected. Unable to send.");
        return;
      }

      const payload = await formDataToSocketPayload(
        formData,
        targetId,
        isGroupChat,
      );
      const data = await emitSocketAction("sendMessage", payload, 60000);

      if (data.success) {
        // 🌟 2. SMART UX CHECK: Only append to the screen if it's the currently open chat!
        const currentActiveId = selectedGroup?._id || selectedUser?._id;

        if (targetId === currentActiveId) {
          setMessages((prevMessages) => [...prevMessages, data.newMessage]);
        } else {
          toast.success("Message forwarded!");
        }
      } else {
        toast.error(data.message || "Failed to send message");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to dispatch message",
      );
    }
  };

  const editMessage = async (messageId, newText) => {
    if (!socket) return toast.error("Chat disconnected. Unable to edit.");
    try {
      // Emit directly to the backend socket, skipping HTTP API overhead layers
      await emitSocketAction("editMessage", { messageId, newText });
    } catch (err) {
      console.error("Failed handling execution logic for editing:", err);
      toast.error(err.message || "Failed to edit message");
    }
  };

  const deleteMessage = async (messageId) => {
    if (!socket) return toast.error("Chat disconnected. Unable to delete.");
    try {
      // Dispatch soft-delete order sequence down real-time pathways
      await emitSocketAction("deleteMessage", { messageId });
    } catch (err) {
      console.error("Failed handling execution logic for deleting:", err);
      toast.error(err.message || "Failed to delete message");
    }
  };

  const handleMessageReaction = async (messageId, emoji) => {
    if (!socket) return toast.error("Chat disconnected.");

    // OPTIMISTIC UPDATE: Update UI immediately for real-time responsiveness
    setMessages((prevMessages) =>
      prevMessages.map((msg) => {
        if (msg._id !== messageId) return msg;

        const reactions = msg.reactions || [];
        const existingIndex = reactions.findIndex(
          (r) =>
            (r.userId?._id || r.userId)?.toString() === authUser._id.toString(),
        );

        let updatedReactions = [...reactions];

        if (existingIndex > -1) {
          if (updatedReactions[existingIndex].emoji === emoji) {
            updatedReactions.splice(existingIndex, 1);
          } else {
            updatedReactions[existingIndex] = {
              ...updatedReactions[existingIndex],
              emoji,
            };
          }
        } else {
          updatedReactions.push({ userId: authUser._id, emoji });
        }

        return { ...msg, reactions: updatedReactions };
      }),
    );

    try {
      // Send execution details down websocket line rather than hitting API endpoint path layouts
      await emitSocketAction("toggleReaction", { messageId, emoji });
    } catch (error) {
      console.error(
        "Failed syncing reaction parameters down socket structure:",
        error,
      );
    }
  };

  // Shared Seen Marker Trigger Block
  const markAsSeen = useCallback(
    async (chatId, isGroupChat = false) => {
      if (!socket || !chatId) return;
      try {
        await emitSocketAction("markMessagesSeen", {
          chatId,
          isGroup: isGroupChat,
        });
      } catch (err) {
        console.error("Failed executing visibility sequence:", err);
      }
    },
    [socket, emitSocketAction],
  );

  const addGroupMember = async (groupId, userId) => {
    try {
      const res = await API.post(`/groups/${groupId}/add`, { userId });
      setSelectedGroup((prev) => ({
        ...prev,
        members: [...prev.members, res.data.newMember],
      }));
      toast.success("Member added successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add member");
    }
  };

  const getNonGroupMembers = async (groupId) => {
    try {
      const res = await API.get(`/groups/${groupId}/non-members`);
      return res.data;
    } catch (error) {
      console.error("Error fetching non-group members:", error);
      return [];
    }
  };

  const leaveGroupAction = async (groupId) => {
    try {
      await API.patch(`/groups/${groupId}/leave`);
      getGroups();
      setSelectedGroup(null);
      setMessages([]);
      // Optionally trigger a state refresh for your sidebar group listing array here
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to leave group");
    }
  };

  const toggleBlockUserAction = async (userId) => {
    try {
      const response = await API.patch(`/auth/block/${userId}`);

      // Update local authUser state with the new blockedUsers array returns
      setAuthUser((prev) => ({
        ...prev,
        blockedUsers: response.data.blockedUsers,
      }));

      // Clean up current active window context view states
      setSelectedUser(null);
      setMessages([]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to block user");
    }
  };

  const requestToJoinGroup = async (groupId) => {
    try {
      const { data } = await API.post(`/groups/request/${groupId}`);
      if (data.success) {
        toast.success(data.message);
        if (getGroups) getGroups(); // Refresh layouts mapping structures
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit request");
    }
  };

  const handleAdminAction = async (groupId, applicantId, action) => {
    try {
      const { data } = await API.post(`/groups/resolve-request`, {
        groupId,
        applicantId,
        action,
      });
      if (data.success) {
        toast.success(data.message);
        if (getGroups) getGroups();
      }

      await getGroups();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resolve action");
    }
  };
  const forwardMessage = async (messageToForward, targetId, isGroupTarget) => {
    try {
      const formData = new FormData();

      // 🌟 Append text content and core meta configurations
      formData.append("text", messageToForward.text || "");
      formData.append("isGroup", isGroupTarget ? "true" : "false");
      formData.append("isForwarded", "true"); // Tells database to attach the flag

      if (isGroupTarget) {
        formData.append("groupId", targetId);
      }

      // 🌟 Pass existing asset strings directly instead of binary file chunks
      if (messageToForward.image)
        formData.append("image", messageToForward.image);
      if (messageToForward.audio)
        formData.append("audio", messageToForward.audio);
      if (messageToForward.video)
        formData.append("video", messageToForward.video);

      // 🌟 Route it right through your existing centralized engine!
      await sendMessage(formData, targetId, isGroupTarget);
      return true;
    } catch (error) {
      console.error("Error packaging forward payload:", error);
      return false;
    }
  };
  // ... keep your imports and state hooks exactly as they are

  // 🌟 UPDATED: Accepts explicit payload overrides to prevent room-switching race conditions
  const sendTypingStatus = (
    isTyping,
    forcedChatId = null,
    forcedIsGroup = null,
  ) => {
    if (!socket) return;

    // Use explicit overrides if passed from the cleanup hook, otherwise fallback to standard state
    const resolveIsGroup =
      forcedIsGroup !== null ? forcedIsGroup : !!selectedGroup;
    const targetChatId =
      forcedChatId || (resolveIsGroup ? selectedGroup?._id : selectedUser?._id);

    if (!targetChatId) return;

    if (resolveIsGroup) {
      socket.emit(isTyping ? "typing" : "stop-typing", {
        groupId: targetChatId,
        isGroup: true,
        senderName: authUser?.fullName || authUser?.name || "Someone",
      });
    } else {
      socket.emit(isTyping ? "typing" : "stop-typing", {
        receiverId: targetChatId,
        isGroup: false,
      });
    }
  };

  useEffect(() => {
    if (!socket || groups.length === 0) return;
    groups.forEach((group) => {
      socket.emit("joinGroup", group._id?.toString());
    });
  }, [socket, groups]);

  // Real-Time Socket Event Handling Layer
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
      console.log(newMessage);
      const rawSenderId = newMessage.senderId?._id || newMessage.senderId;
      const senderUserIdString = rawSenderId?.toString();
      const authUserIdString = authUser?._id?.toString();

      if (newMessage.groupId) {
        console.log("new message emitted");
        setSelectedGroup((currentGroup) => {
          const currentActiveId = currentGroup?._id?.toString();
          const incomingTargetId = newMessage.groupId?.toString();

          if (currentGroup && incomingTargetId === currentActiveId) {
            if (senderUserIdString === authUserIdString) return currentGroup;

            setMessages((prevMessages) => [...prevMessages, newMessage]);
            markAsSeen(incomingTargetId, true);
          } else {
            setUnseenGroups((prevUnseenGroups) => ({
              ...prevUnseenGroups,
              [incomingTargetId]: (prevUnseenGroups[incomingTargetId] || 0) + 1,
            }));

            if (senderUserIdString !== authUserIdString) {
              triggerNotification(newMessage, true);
            }
          }
          return currentGroup;
        });
        return;
      }

      if (senderUserIdString === authUserIdString) return;

      setSelectedUser((currentUser) => {
        const activeUserId = currentUser?._id?.toString();

        if (currentUser && senderUserIdString === activeUserId) {
          setMessages((prevMessages) => [...prevMessages, newMessage]);
          markAsSeen(senderUserIdString, false);
        } else {
          setUnseenMessages((prevUnseenMessages) => ({
            ...prevUnseenMessages,
            [senderUserIdString]:
              (prevUnseenMessages[senderUserIdString] || 0) + 1,
          }));

          triggerNotification(newMessage, false);
        }
        return currentUser;
      });
    };

    socket.on("messageUpdated", (updatedMsg) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === updatedMsg._id ? updatedMsg : msg)),
      );
    });

    socket.on("messageRemoved", (deletedMsg) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === deletedMsg._id ? deletedMsg : msg)),
      );
    });

    socket.on("userSeenReceipt", ({ user }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          const existingViewerIds =
            msg.seenBy?.map((v) => (v._id || v)?.toString()) || [];
          const newViewerId = (user._id || user)?.toString();

          if (!existingViewerIds.includes(newViewerId)) {
            return {
              ...msg,
              seenBy: [...(msg.seenBy || []), user],
            };
          }
          return msg;
        }),
      );
    });

    socket.on("newMessage", handleNewMessage);

    socket.on("requestAction", ({ groupName, action }) => {
      getGroups();
      if (action === "accept") {
        toast.success(`${groupName} request accepted `);
      } else {
        toast.error(`${groupName} request rejected `);
      }
    });

    socket.on("requestedToJoin", () => {
      toast.success("New join request received");
      getGroups();
    });

    socket.on("reactionUpdated", (updatedMessage) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg,
        ),
      );
    });

    socket.on("socketActionError", ({ message }) => {
      if (message) toast.error(message);
    });

    socket.on("displayTyping", (data) => {
      console.log("Raw displayTyping payload from backend:", data);

      // Fallback map matching what your backend is ACTUALLY emitting
      const isGroup = data.isGroup ?? false;
      const groupId = data.groupId || undefined;
      const senderId =
        data.senderId || data.senderIdString || data.userId || data.from;
      const senderName = data.senderName || "Someone";

      const chatId = isGroup ? groupId : senderId;

      if (!chatId) {
        console.error("Could not resolve a valid chatId from payload:", data);
        return;
      }

      setTypingStatus((prev) => ({
        ...prev,
        [chatId]: isGroup
          ? [
              ...(prev[chatId] || []).filter((name) => name !== senderName),
              senderName,
            ]
          : true,
      }));
    });

    socket.on("hideTyping", (data) => {
      console.log("Raw hideTyping payload from backend:", data);

      const isGroup = data.isGroup ?? false;
      const groupId = data.groupId || undefined;
      const senderId =
        data.senderId || data.senderIdString || data.userId || data.from;
      const senderName = data.senderName || "Someone";

      const chatId = isGroup ? groupId : senderId;

      if (!chatId) return;

      setTypingStatus((prev) => {
        if (isGroup) {
          const activeGroupTypers = prev[chatId] || [];
          return {
            ...prev,
            [chatId]: activeGroupTypers.filter((name) => name !== senderName),
          };
        } else {
          const updatedStatus = { ...prev };
          delete updatedStatus[chatId];
          return updatedStatus;
        }
      });
    });
    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageUpdated");
      socket.off("messageRemoved");
      socket.off("userSeenReceipt");
      socket.off("requestAction");
      socket.off("reactionUpdated");
      socket.off("socketActionError");
      socket.off("displayTyping");
      socket.off("hideTyping");
    };
  }, [socket, authUser?._id, markAsSeen]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        getMessages,
        users,
        getUsers,
        groups,
        getGroups,
        createGroup,
        selectedUser,
        setSelectedUser,
        selectedGroup,
        setSelectedGroup,
        unseenMessages,
        setUnseenMessages,
        unseenGroups,
        setUnseenGroups,
        showInfoDrawer,
        setShowInfoDrawer,
        addGroupMember,
        getNonGroupMembers,
        editMessage,
        deleteMessage,
        markAsSeen,
        replyToMessage,
        setReplyToMessage,
        handleMessageReaction,
        leaveGroupAction,
        toggleBlockUserAction,
        handleAdminAction,
        requestToJoinGroup,
        forwardMessage,
        sendMessage,
        typingStatus,
        setTypingStatus,
        sendTypingStatus, // 🌟 FIXED: Added sendTypingStatus method to your provider value map!
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
