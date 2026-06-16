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

  const { socket, authUser } = useContext(AuthContext);

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

  const sendMessage = async (messageData) => {
    try {
      const isGroupChat = !!selectedGroup;
      const targetId = isGroupChat ? selectedGroup._id : selectedUser._id;

      const payload = {
        ...messageData,
        isGroup: isGroupChat,
        groupId: isGroupChat ? selectedGroup._id : null,
      };

      const { data } = await API.post(`/messages/send/${targetId}`, payload);
      if (data.success) {
        setMessages((prevMessages) => [...prevMessages, data.newMessage]);
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
          isGroup,
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

  useEffect(() => {
    if (!socket || groups.length === 0) return;
    groups.forEach((group) => {
      socket.emit("joinGroup", group._id?.toString());
    });
  }, [socket, groups]);

  ///TEbjfndfdj

  useEffect(() => {
    console.log(messages);
  }, [messages]);

  // Real-Time Socket Event Handling Layer
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      // 🌟 Extract the actual string ID safely whether senderId is populated or raw
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
            // 🌟 Fix sender identity block check using extracted string IDs
            if (senderUserIdString === authUserIdString) return currentGroup;

            setMessages((prevMessages) => [...prevMessages, newMessage]);
            markAsSeen(incomingTargetId, true); // Sync group seen live
          } else {
            setUnseenGroups((prevUnseenGroups) => ({
              ...prevUnseenGroups,
              [incomingTargetId]: (prevUnseenGroups[incomingTargetId] || 0) + 1,
            }));
          }
          return currentGroup;
        });
        return;
      }

      // 2. PRIVATE CHAT HANDLING
      // 🌟 Drop message early if I am the sender (since my sendMessage function already pushed it locally)
      if (senderUserIdString === authUserIdString) return;

      setSelectedUser((currentUser) => {
        const activeUserId = currentUser?._id?.toString();

        if (currentUser && senderUserIdString === activeUserId) {
          setMessages((prevMessages) => [...prevMessages, newMessage]);
          markAsSeen(senderUserIdString, false); // Sync private seen live
        } else {
          setUnseenMessages((prevUnseenMessages) => ({
            ...prevUnseenMessages,
            [senderUserIdString]:
              (prevUnseenMessages[senderUserIdString] || 0) + 1,
          }));
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

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageUpdated");
      socket.off("messageRemoved");
      socket.off("userSeenReceipt");
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
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
