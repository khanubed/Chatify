import React, { useContext, useEffect, useRef, useState } from "react";
import assets from "../../assets/assets";
import { AuthContext } from "../../../context/AuthContext";
import { ChatContext } from "../../../context/ChatContext";

// Sub-components
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import ZoomedImageModal from "./ZoomedImageModal";
import SeenModal from "./SeenModal";
import CallInterface from "./CallInterface";

const ChatContainer = () => {
  const { authUser, onlineUsers, socket } = useContext(AuthContext);
  const {
    messages,
    selectedUser,
    setSelectedUser,
    selectedGroup,
    setSelectedGroup,
    getMessages,
    deleteMessage,
    editMessage,
    markAsSeen,
    setShowInfoDrawer,
    setReplyToMessage,
  } = useContext(ChatContext);

  const [activeMobileMenuId, setActiveMobileMenuId] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editInput, setEditInput] = useState("");
  const [seenModalList, setSeenModalList] = useState(null);

  const scrollEnd = useRef(null);

  const currentChat = selectedUser || selectedGroup;
  const isGroup = !!selectedGroup;
  const targetRoomId = selectedUser?._id || selectedGroup?._id;

  // Handles pristine room initialization and history fetches
  useEffect(() => {
    if (!targetRoomId || !socket) return;

    const fetchChatHistory = async () => {
      try {
        if (selectedUser?._id) {
          socket.emit("joinChat", selectedUser._id);
          await getMessages(selectedUser._id, false);
          await markAsSeen(selectedUser._id, false);
        } else if (selectedGroup?._id) {
          socket.emit("joinGroup", selectedGroup._id);
          await getMessages(selectedGroup._id, true);
          await markAsSeen(selectedGroup._id, true);
        }
      } catch (error) {
        console.error("Failed to load chat history cleanly:", error);
      }
    };

    fetchChatHistory();
    setReplyToMessage(null);
    setActiveMobileMenuId(null);
    setZoomedImage(null);
    setEditingMessageId(null);
    setShowInfoDrawer(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRoomId, socket]);

  useEffect(() => {
    if (scrollEnd.current && messages.length > 0) {
      scrollEnd.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const handleSaveEdit = async (msgId) => {
    if (!editInput.trim()) return;
    await editMessage(msgId, editInput.trim());
    setEditingMessageId(null);
    setEditInput("");
  };

  const handleCloseChat = () => {
    setSelectedUser(null);
    setSelectedGroup(null);
    setShowInfoDrawer(false);
  };

  return (
    <>
      {currentChat ? (
        <div className="h-full overflow-hidden relative backdrop-blur-lg flex flex-col justify-between text-white w-full flex-1">
          <ChatHeader
            isGroup={isGroup}
            selectedChat={currentChat}
            onlineUsers={onlineUsers}
            setShowInfoDrawer={setShowInfoDrawer}
            handleCloseChat={handleCloseChat}
          />

          {/* Chat Stream Window Block */}
          <div className="flex-1 overflow-y-auto z-20 p-3 pb-2 flex flex-col custom-scrollbar gap-1">
            {messages.map((msg, index) => (
              <MessageBubble
                key={msg._id || index}
                msg={msg}
                msgId={msg._id || index}
                authUser={authUser}
                isGroup={isGroup}
                selectedGroup={selectedGroup}
                selectedUser={selectedUser}
                activeMobileMenuId={activeMobileMenuId}
                setActiveMobileMenuId={setActiveMobileMenuId}
                editingMessageId={editingMessageId}
                setEditingMessageId={setEditingMessageId}
                editInput={editInput}
                setEditInput={setEditInput}
                handleSaveEdit={handleSaveEdit}
                setReplyToMessage={setReplyToMessage}
                deleteMessage={deleteMessage}
                setZoomedImage={setZoomedImage}
                setSeenModalList={setSeenModalList}
              />
            ))}
            <div ref={scrollEnd} className="h-2 shrink-0"></div>
          </div>

          {/* 🌟 KEY TRICK: Providing targetRoomId as a key forces React to reset 
              all state inside ChatInput automatically when switching chats */}
          <ChatInput key={targetRoomId} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/5 h-full w-full">
          <img src={assets.logo_icon} alt="" className="max-w-16 opacity-40" />
          <p className="text-sm md:text-base font-medium text-gray-400">
            Chatify — Connect. Converse. Collaborate
          </p>
        </div>
      )}

      <ZoomedImageModal
        zoomedImage={zoomedImage}
        setZoomedImage={setZoomedImage}
      />
      <SeenModal
        seenModalList={seenModalList}
        setSeenModalList={setSeenModalList}
      />
      <CallInterface />
    </>
  );
};

export default ChatContainer;
