import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import assets from "../../assets/assets";
import { AuthContext } from "../../../context/AuthContext";
import { ChatContext } from "../../../context/ChatContext";
import toast from "react-hot-toast";

// Sub-components
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import ZoomedImageModal from "./ZoomedImageModal";
import SeenModal from "./SeenModal";
import CallInterface from "./CallInterface"; // 🌟 Imported Calling UI Window Block

const ChatContainer = () => {
  const { authUser, onlineUsers, socket } = useContext(AuthContext);
  const {
    messages,
    selectedUser,
    setSelectedUser,
    selectedGroup,
    setSelectedGroup,
    sendMessage,
    getMessages,
    deleteMessage,
    editMessage,
    markAsSeen,
    setShowInfoDrawer,
    replyToMessage,
    setReplyToMessage,
  } = useContext(ChatContext);

  const [input, setInput] = useState("");
  const [selectedMediaFile, setSelectedMediaFile] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState(null);
  const [mediaType, setMediaType] = useState(null);

  const [activeMobileMenuId, setActiveMobileMenuId] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editInput, setEditInput] = useState("");
  const [seenModalList, setSeenModalList] = useState(null);

  const scrollEnd = useRef(null);
  const fileInputRef = useRef(null);

  const currentChat = selectedUser || selectedGroup;
  const isGroup = !!selectedGroup;

  const handleCancelMedia = useCallback(() => {
    setSelectedMediaFile(null);
    setMediaPreviewUrl(null);
    setMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  useEffect(() => {
    const targetRoomId = selectedUser?._id || selectedGroup?._id;
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
    handleCancelMedia();
    setInput("");
    setReplyToMessage(null);
    setActiveMobileMenuId(null);
    setZoomedImage(null);
    setEditingMessageId(null);
    setShowInfoDrawer(false);
  }, [
    selectedUser?._id,
    selectedGroup?._id,
    socket,
    markAsSeen,
    setReplyToMessage,
    handleCancelMedia,
    setShowInfoDrawer,
  ]);

  useEffect(() => {
    if (scrollEnd.current && messages.length > 0) {
      scrollEnd.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const handleDispatchMessage = async (e, customAudioBlob = null) => {
    if (e) e.preventDefault();
    const cleanText = input.trim();

    if (!cleanText && !selectedMediaFile && !customAudioBlob) return;

    const formData = new FormData();
    formData.append("text", cleanText);
    formData.append("isGroup", isGroup);

    if (isGroup) formData.append("groupId", selectedGroup._id);
    if (replyToMessage) formData.append("parent", replyToMessage._id);

    if (customAudioBlob) {
      formData.append("file", customAudioBlob, "voice-message.webm");
    } else if (selectedMediaFile) {
      formData.append("file", selectedMediaFile);
    }

    setInput("");
    handleCancelMedia();
    setReplyToMessage(null);

    await sendMessage(formData);
  };

  const handleSaveEdit = async (msgId) => {
    if (!editInput.trim()) return;
    await editMessage(msgId, editInput.trim());
    setEditingMessageId(null);
    setEditInput("");
  };

  const handleMediaSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      toast.error("Please select a valid image or video file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedMediaFile(file);
      setMediaPreviewUrl(reader.result);
      setMediaType(isImage ? "image" : "video");
    };
    reader.readAsDataURL(file);
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

          <ChatInput
            input={input}
            setInput={setInput}
            mediaPreviewUrl={mediaPreviewUrl}
            mediaType={mediaType}
            replyToMessage={replyToMessage}
            setReplyToMessage={setReplyToMessage}
            handleCancelMedia={handleCancelMedia}
            handleMediaSelect={handleMediaSelect}
            handleDispatchMessage={handleDispatchMessage}
            fileInputRef={fileInputRef}
          />
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

      {/* 🌟 NEW: Active P2P Audio & Video Overlay Engine Sheet */}
      <CallInterface />
    </>
  );
};

export default ChatContainer;
