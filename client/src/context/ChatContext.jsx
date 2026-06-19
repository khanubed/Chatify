import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
} from "react";
import { AuthContext } from "./AuthContext";
import { chatService } from "../services/chatService";
import { groupService } from "../services/groupService";
import { useChatSockets } from "../hooks/useChatSockets";
import toast from "react-hot-toast";

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

  // Centralized real-time execution wrapper
  const emitSocketAction = useCallback(
    (eventName, payload, timeout = 30000) =>
      new Promise((resolve, reject) => {
        if (!socket) return reject(new Error("Chat disconnected"));

        socket.timeout(timeout).emit(eventName, payload, (error, response) => {
          if (error) return reject(new Error("Socket request timed out"));

          if (!response?.success) {
            const errMsg = response?.message || "Socket action failed";

            if (
              errMsg.toLowerCase().includes("blocked") ||
              errMsg.toLowerCase().includes("unblock")
            ) {
              toast.error(errMsg);
            }

            return reject(new Error(errMsg));
          }

          resolve(response);
        });
      }),
    [socket],
  );

  // Shared Seen Receipt Sync Wrapper
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

  // Sync Background Core Dynamic Sockets Channel Observers
  useChatSockets({
    socket,
    authUser,
    selectedUser,
    selectedGroup,
    setMessages,
    setUnseenMessages,
    setUnseenGroups,
    setTypingStatus,
    setGroups,
    getGroups: () => getGroups(),
    setUsers,
    markAsSeen,
  });

  // REST Interface Dispatch Actions
  const getUsers = async () => {
    try {
      const data = await chatService.fetchUsers();
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
      const data = await groupService.fetchGroups();
      if (data.success) {
        setGroups(data.groups);
        if (data.unseenGroups) setUnseenGroups(data.unseenGroups);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch groups");
    }
  };

  // Autojoin socket rooms whenever group indices refresh
  useEffect(() => {
    if (!socket || groups.length === 0) return;
    groups.forEach((group) => {
      socket.emit("joinGroup", group._id?.toString());
    });
  }, [socket, groups]);

  const createGroup = async (groupData) => {
    try {
      const data = await groupService.create(groupData);
      if (data.success) {
        setGroups((prev) => [...prev, data.group]);
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
      const data = await chatService.fetchMessages(targetId, isGroupChat);
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
      const isGroupChat =
        customIsGroup !== null ? customIsGroup : !!selectedGroup;
      const targetId =
        customTargetId ||
        (isGroupChat ? selectedGroup?._id : selectedUser?._id);

      if (!targetId) return;
      if (!socket) return toast.error("Chat disconnected. Unable to send.");

      const fileAsset = formData.get("file");
      let uploadedMediaUrl = null;
      let autoDetectedType = null;

      if (fileAsset) {
        const uploadData = await chatService.uploadAsset(fileAsset);
        uploadedMediaUrl = uploadData.secure_url;

        if (uploadData.mimetype.startsWith("image/"))
          autoDetectedType = "image";
        else if (uploadData.mimetype.startsWith("audio/"))
          autoDetectedType = "audio";
        else if (uploadData.mimetype.startsWith("video/"))
          autoDetectedType = "video";
      }

      const socketPayload = {
        text: formData.get("text") || "",
        targetId,
        groupId: isGroupChat ? targetId : null,
        isGroup: isGroupChat,
        parent: formData.get("parent"),
        isForwarded: formData.get("isForwarded") || false,
        messageType: autoDetectedType || formData.get("messageType") || "text",
        image: autoDetectedType === "image" ? uploadedMediaUrl : null,
        audio: autoDetectedType === "audio" ? uploadedMediaUrl : null,
        video: autoDetectedType === "video" ? uploadedMediaUrl : null,
      };

      const data = await emitSocketAction("sendMessage", socketPayload, 15000);

      if (data.success) {
        // 🌟 Handle Sidebar Rearrangements Dynamically
        if (isGroupChat) {
          // Bubble group item to index 0
          setGroups((prevGroups) => {
            const targetGroup = prevGroups.find((g) => g._id === targetId);
            if (!targetGroup) return prevGroups;

            const remainingGroups = prevGroups.filter(
              (g) => g._id !== targetId,
            );
            return [targetGroup, ...remainingGroups];
          });
        } else {
          // Bubble private user item to index 0
          setUsers((prevUsers) => {
            const targetUser = prevUsers.find((u) => u._id === targetId);
            if (!targetUser) return prevUsers;

            const remainingUsers = prevUsers.filter((u) => u._id !== targetId);
            return [targetUser, ...remainingUsers];
          });
        }

        const currentActiveId = selectedGroup?._id || selectedUser?._id;
        if (targetId === currentActiveId) {
          setMessages((prev) => [...prev, data.newMessage]);
        } else {
          toast.success("Message forwarded!");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to dispatch message",
      );
    }
  };  

  const editMessage = async (messageId, newText) => {
    if (!socket) return toast.error("Chat disconnected.");
    try {
      await emitSocketAction("editMessage", { messageId, newText });
    } catch (err) {
      toast.error(err.message || "Failed to edit message");
    }
  };

  const deleteMessage = async (messageId) => {
    if (!socket) return toast.error("Chat disconnected.");
    try {
      await emitSocketAction("deleteMessage", { messageId });
    } catch (err) {
      toast.error(err.message || "Failed to delete message");
    }
  };

  const handleMessageReaction = async (messageId, emoji) => {
    if (!socket) return toast.error("Chat disconnected.");

    // Optimistic UI updates implementation mapping strategy
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg._id !== messageId) return msg;
        const reactions = msg.reactions || [];
        const existingIndex = reactions.findIndex(
          (r) =>
            (r.userId?._id || r.userId)?.toString() === authUser._id.toString(),
        );

        let updatedReactions = [...reactions];
        if (existingIndex > -1) {
          if (updatedReactions[existingIndex].emoji === emoji)
            updatedReactions.splice(existingIndex, 1);
          else
            updatedReactions[existingIndex] = {
              ...updatedReactions[existingIndex],
              emoji,
            };
        } else {
          updatedReactions.push({ userId: authUser._id, emoji });
        }
        return { ...msg, reactions: updatedReactions };
      }),
    );

    try {
      await emitSocketAction("toggleReaction", { messageId, emoji });
    } catch (error) {
      console.error(
        "Failed handling syncing reaction setup configurations:",
        error,
      );
    }
  };

  const addGroupMember = async (groupId, userId) => {
    try {
      const res = await groupService.addMember(groupId, userId);
      setSelectedGroup((prev) => ({
        ...prev,
        members: [...prev.members, res.newMember],
      }));
      toast.success("Member added successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add member");
    }
  };

  const getNonGroupMembers = async (groupId) => {
    try {
      return await groupService.fetchNonMembers(groupId);
    } catch (error) {
      console.error("Error fetching non-group members:", error);
      return [];
    }
  };

  const leaveGroupAction = async (groupId) => {
    try {
      await groupService.leave(groupId);
      getGroups();
      setSelectedGroup(null);
      setMessages([]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to leave group");
    }
  };

  const toggleBlockUserAction = async (userId) => {
    try {
      const data = await groupService.toggleBlockUser(userId);

      setAuthUser((prev) => ({ ...prev, blockedUsers: data.blockedUsers }));

      setSelectedUser(null);
      setMessages([]);

      setUsers((prevUsers) =>
        prevUsers.map((user) => {
          if (user._id === userId) {
            const isNowBlocked = data.blockedUsers.includes(userId);

            return {
              ...user,
              blockStatus: isNowBlocked ? "blockedByMe" : null,
            };
          }
          return user;
        }),
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to block user");
    }
  };

  const requestToJoinGroup = async (groupId) => {
    try {
      const data = await groupService.requestJoin(groupId);
      if (data.success) {
        toast.success(data.message);
        getGroups();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit request");
    }
  };

  const handleAdminAction = async (groupId, applicantId, action) => {
    try {
      const data = await groupService.resolveRequest(
        groupId,
        applicantId,
        action,
      );
      if (data.success) toast.success(data.message);
      getGroups();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resolve action");
    }
  };

  const forwardMessage = async (messageToForward, targetId, isGroupTarget) => {
    try {
      const formData = new FormData();
      formData.append("text", messageToForward.text || "");
      formData.append("isGroup", isGroupTarget ? "true" : "false");
      formData.append("isForwarded", "true");

      if (isGroupTarget) formData.append("groupId", targetId);
      if (messageToForward.image)
        formData.append("image", messageToForward.image);
      if (messageToForward.audio)
        formData.append("audio", messageToForward.audio);
      if (messageToForward.video)
        formData.append("video", messageToForward.video);

      await sendMessage(formData, targetId, isGroupTarget);
      return true;
    } catch (error) {
      console.error("Error packaging forward payload:", error);
      return false;
    }
  };

  const sendTypingStatus = (
    isTyping,
    forcedChatId = null,
    forcedIsGroup = null,
  ) => {
    if (!socket) return;
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
        sendTypingStatus,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
