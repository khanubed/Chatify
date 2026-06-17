import React, { useContext } from "react";
import assets from "../../assets/assets";
// 🌟 Added Phone and Video from lucide-react
import { Phone, Video } from "lucide-react";
// 🌟 Consume Call Context Hook
import { CallContext } from "../../../context/CallContext";

const ChatHeader = ({ isGroup, selectedChat, onlineUsers, setShowInfoDrawer, handleCloseChat }) => {
  const { startCall } = useContext(CallContext); // 🌟 Hook invocation

  return (
    <div className="flex items-center gap-3 mx-4 border-b border-stone-500 py-2 shrink-0 px-2 rounded-lg transition-colors">
      {isGroup ? (
        <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center text-blue-300 font-bold uppercase text-xs">
          {selectedChat.name.slice(0, 2)}
        </div>
      ) : (
        <img
          src={selectedChat.profilePic || assets.avatar_icon}
          alt=""
          className="w-8 aspect-square rounded-full object-cover"
        />
      )}

      <div className="flex-1 text-lg flex flex-col md:flex-row md:items-center gap-0 md:gap-2 font-medium">
        <div className="flex items-center gap-2">
          {isGroup ? selectedChat.name : selectedChat.fullName}
          {!isGroup && onlineUsers.includes(selectedChat._id) && (
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
          )}
        </div>
      </div>

      {/* 🌟 NEW: WebRTC Media Interaction Controls (Hidden automatically inside Group Chats) */}
      {!isGroup && (
        <div className="flex items-center gap-1 mr-1">
          <button
            onClick={() => startCall(selectedChat, "voice")}
            className="text-gray-400 hover:text-green-400 p-2 rounded-full hover:bg-white/5 active:scale-95 transition-all"
            title="Start voice call"
          >
            <Phone size={18} />
          </button>
          <button
            onClick={() => startCall(selectedChat, "video")}
            className="text-gray-400 hover:text-blue-400 p-2 rounded-full hover:bg-white/5 active:scale-95 transition-all"
            title="Start video call"
          >
            <Video size={18} />
          </button>
        </div>
      )}

      <button
        onClick={() => setShowInfoDrawer(true)}
        className="xl:hidden text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
        title="View details"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>

      <img
        onClick={(e) => {
          e.stopPropagation();
          handleCloseChat();
        }}
        src={assets.arrow_icon}
        className="md:hidden max-w-7 cursor-pointer p-1 hover:bg-white/10 rounded-full transition-transform"
        alt="back"
      />
    </div>
  );
};

export default ChatHeader;