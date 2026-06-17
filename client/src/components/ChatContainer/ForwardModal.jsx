import React, { useState, useContext } from "react";
import { X, Search, Send } from "lucide-react";
import { ChatContext } from "../../../context/ChatContext";
import assets from "../../assets/assets";

const ForwardModal = ({ msg, onClose, authUser }) => {
  const { users, groups, forwardMessage } = useContext(ChatContext);
  const [search, setSearch] = useState("");
  const [sendingTo, setSendingTo] = useState({}); // Tracks loading states per row

  // Combine users and groups into a clean destination list
  const destinations = [
    ...groups.map((g) => ({ ...g, isGroup: true, id: g._id, title: g.name })),
    ...users
      .filter((u) => u._id !== authUser._id)
      .map((u) => ({ ...u, isGroup: false, id: u._id, title: u.fullName, profilePic: u.profilePic})),
  ].filter((item) => item.title.toLowerCase().includes(search.toLowerCase()));

  const handleForwardClick = async (targetId, isGroup) => {
    setSendingTo((prev) => ({ ...prev, [targetId]: true }));
    const success = await forwardMessage(msg, targetId, isGroup);
    setSendingTo((prev) => ({ ...prev, [targetId]: false }));

    if (success) {
      // Keep modal open if they want to forward to multiple people, or close it
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#181c26] border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-white font-semibold text-base">
            Forward Message
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-gray-800/60 bg-black/10">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-700/50">
            <Search size={14} className="text-gray-500" />
            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-white outline-none placeholder-gray-500"
            />
          </div>
        </div>

        {/* List of Targets */}
        <div className="flex-1 max-h-[320px] overflow-y-auto p-2 custom-scrollbar gap-1 flex flex-col">
          {destinations.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-8">
              No chats found
            </p>
          ) : (
            destinations.map((chat) => (
              <div
                key={chat.id}
                className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={
                      chat.profilePic ||
                      chat.avatar ||
                      assets.avatar_icon
                    }
                    alt=""
                    className="w-9 h-9 rounded-full object-cover border border-white/5"
                  />
                  <div>
                    <p className="text-xs font-medium text-white">
                      {chat.title}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {chat.isGroup ? "Group Chat" : "Direct Message"}
                    </p>
                  </div>
                </div>

                <button
                  disabled={sendingTo[chat.id]}
                  onClick={() => handleForwardClick(chat.id, chat.isGroup)}
                  className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-[11px] font-semibold hover:bg-blue-400 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {sendingTo[chat.id] ? (
                    "Sending..."
                  ) : (
                    <>
                      Forward <Send size={10} />
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;
