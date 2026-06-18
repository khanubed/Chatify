import React, { useContext } from "react";
import assets from "../../assets/assets";
import { Phone, Video } from "lucide-react";
import { CallContext } from "../../../context/CallContext";
import { ChatContext } from "../../../context/ChatContext";

const ChatHeader = ({
  isGroup,
  selectedChat,
  onlineUsers,
  setShowInfoDrawer,
  handleCloseChat,
}) => {
  const { startCall } = useContext(CallContext);
  const { typingStatus } = useContext(ChatContext);

  const activeChatId = selectedChat?._id;
  const currentTypers = typingStatus[activeChatId];

  let typingText = "";
  if (isGroup && Array.isArray(currentTypers) && currentTypers.length > 0) {
    if (currentTypers.length === 1) {
      typingText = `${currentTypers[0]} is typing...`;
    } else if (currentTypers.length === 2) {
      typingText = `${currentTypers[0]} and ${currentTypers[1]} are typing...`;
    } else {
      typingText = "Several people are typing...";
    }
  } else if (!isGroup && currentTypers) {
    typingText = "typing...";
  }

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

      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-center gap-2 text-md font-medium leading-tight text-white">
          {isGroup ? selectedChat.name : selectedChat.fullName}
          {!isGroup &&
            onlineUsers.includes(selectedChat._id) &&
            !typingText && (
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            )}
        </div>
        {typingText ? (
          <span className="text-xs text-emerald-400 font-normal italic animate-pulse tracking-wide mt-0.5">
            {typingText}
          </span>
        ) : (
          !isGroup && (
            <span className="text-[11px] text-zinc-400 font-light tracking-wide mt-0.5">
              {onlineUsers.includes(selectedChat._id) ? "Online" : "Offline"}
            </span>
          )
        )}
      </div>

      {/* 🌟 Modified: Action Buttons are now visible for both Private AND Group Chats */}
      <div className="flex items-center gap-1 mr-1">
        <button
          onClick={() => startCall(selectedChat, "voice", isGroup)}
          className="text-gray-400 hover:text-green-400 p-2 rounded-full hover:bg-white/5 active:scale-95 transition-all"
          title={isGroup ? "Start group voice call" : "Start voice call"}
        >
          <Phone size={18} />
        </button>
        <button
          onClick={() => startCall(selectedChat, "video", isGroup)}
          className="text-gray-400 hover:text-blue-400 p-2 rounded-full hover:bg-white/5 active:scale-95 transition-all"
          title={isGroup ? "Start group video call" : "Start video call"}
        >
          <Video size={18} />
        </button>
      </div>

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
