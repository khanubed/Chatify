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
        if (isGroupChat) {
          await API.put(`/groups/mark/${targetId}`);
        }
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

      // Notice we still pass formData directly to your existing endpoint
      const { data } = await API.post(`/messages/send/${targetId}`, formData);

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
    try {
      const res = await API.put(`/messages/edit/${messageId}`, { newText });
      if (res.data) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === messageId ? res.data : msg)),
        );
        socket.emit("messageEdited", res.data);
      }
    } catch (err) {
      toast.error("Failed to edit message");
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      const res = await API.delete(`/messages/delete/${messageId}`);
      if (res.data) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === messageId ? res.data : msg)),
        );
        socket.emit("messageDeleted", res.data);
        toast.success("Message deleted");
      }
    } catch (err) {
      toast.error("Failed to delete message");
    }
  };

  const handleMessageReaction = async (messageId, emoji) => {
    // 1. OPTIMISTIC UPDATE: Update UI instantly for a snappy feel
    setMessages((prevMessages) =>
      prevMessages.map((msg) => {
        if (msg._id !== messageId) return msg;

        // Ensure reactions array exists
        const reactions = msg.reactions || [];

        // Find if current user already reacted
        const existingIndex = reactions.findIndex(
          (r) =>
            (r.userId?._id || r.userId)?.toString() === authUser._id.toString(),
        );

        let updatedReactions = [...reactions];

        if (existingIndex > -1) {
          if (updatedReactions[existingIndex].emoji === emoji) {
            // Remove reaction if clicked the exact same one again
            updatedReactions.splice(existingIndex, 1);
          } else {
            // Swap emoji if they chose a different one
            updatedReactions[existingIndex] = {
              ...updatedReactions[existingIndex],
              emoji,
            };
          }
        } else {
          // Brand new reaction
          updatedReactions.push({ userId: authUser._id, emoji });
        }

        return { ...msg, reactions: updatedReactions };
      }),
    );

    try {
      const response = await API.patch(`/messages/${messageId}/reaction`, {
        emoji,
      });

      console.log(response);
      // 3. SOCKET BROADCAST (Optional): If using socket.io, notify other chat members
      socket.emit("messageReaction", {
        messageId,
        reactions: response.data.reactions,
      });
    } catch (error) {
      console.error("Failed to sync reaction to database:", error);
      // Optional: Revert state or trigger a toast if the database update fails
    }
  };

  // Shared Seen Marker Trigger Block
  const markAsSeen = useCallback(
    async (chatId, isGroupChat = false) => {
      if (!socket || !chatId) return;
      try {
        await API.post(`/messages/seen/${chatId}`, { isGroup: isGroupChat });
        socket.emit("messagesSeen", {
          chatId,
          user: {
            _id: authUser._id,
            fullName: authUser.fullName,
            profilePic: authUser.profilePic,
            username: authUser.username,
          },
          isGroup: isGroupChat,
        });
      } catch (err) {
        console.error("Failed executing visibility sequence:", err);
      }
    },
    [socket, authUser?._id],
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

      // 1. GROUP CHAT HANDLING
      if (newMessage.groupId) {
        console.log("new message emitted");
        setSelectedGroup((currentGroup) => {
          const currentActiveId = currentGroup?._id?.toString();
          const incomingTargetId = newMessage.groupId?.toString();

          if (currentGroup && incomingTargetId === currentActiveId) {
            if (senderUserIdString === authUserIdString) return currentGroup;

            setMessages((prevMessages) => [...prevMessages, newMessage]);
            markAsSeen(incomingTargetId, true); // Sync group seen live
          } else {
            // 🌟 NOT FROM SELECTED GROUP: Increment count and trigger notification
            setUnseenGroups((prevUnseenGroups) => ({
              ...prevUnseenGroups,
              [incomingTargetId]: (prevUnseenGroups[incomingTargetId] || 0) + 1,
            }));

            // Only notify if the background group message wasn't sent by the authUser themselves
            if (senderUserIdString !== authUserIdString) {
              triggerNotification(newMessage, true);
            }
          }
          return currentGroup;
        });
        return;
      }

      // 2. PRIVATE CHAT HANDLING
      if (senderUserIdString === authUserIdString) return;

      setSelectedUser((currentUser) => {
        const activeUserId = currentUser?._id?.toString();

        if (currentUser && senderUserIdString === activeUserId) {
          setMessages((prevMessages) => [...prevMessages, newMessage]);
          markAsSeen(senderUserIdString, false); // Sync private seen live
        } else {
          // 🌟 NOT FROM SELECTED USER: Increment count and trigger notification
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

    socket.on("userSeenReceipt", ({ user, chatId }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          // Safely extract IDs to check for duplicates
          const existingViewerIds =
            msg.seenBy?.map((v) => (v._id || v)?.toString()) || [];
          const newViewerId = (user._id || user)?.toString();

          if (!existingViewerIds.includes(newViewerId)) {
            return {
              ...msg,
              // 🌟 Push the complete user object into the state array
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
      (toast.success("New join request received"), getGroups());
    });

    socket.on("reactionUpdated", (updatedMessage) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg,
        ),
      );
    });

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageUpdated");
      socket.off("messageRemoved");
      socket.off("userSeenReceipt");
      socket.off("requestAction");
      socket.off("reactionUpdated");
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
        sendMessage,
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
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
