import React from "react";
import { X } from "lucide-react";
import assets from "../../assets/assets";

const ReactionModal = ({ msg, onClose, members }) => {
  console.log("msg", msg);
  console.log("members", members);
  const groupedReactions = (msg?.reactions || []).reduce((acc, reaction) => {
    if (!reaction.emoji) return acc;
    if (!acc[reaction.emoji]) acc[reaction.emoji] = [];
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {});

  const hasReactions = Object.keys(groupedReactions).length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#182031] border border-gray-700 rounded-xl w-full max-w-sm p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-medium">Reactions</h3>
          <button
            onClick={onClose}
            className="hover:text-white transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto custom-scrollbar">
          {hasReactions ? (
            Object.entries(groupedReactions).map(([emoji, reactions]) => (
              <div
                key={emoji}
                className="flex flex-col gap-2 bg-gray-800/20 p-2.5 rounded-lg border border-gray-800"
              >
                <div className="flex items-center gap-2 text-xl font-bold text-white">
                  <span>{emoji}</span>
                  <span className="text-xs text-gray-400 font-normal bg-white/5 px-2 py-0.5 rounded-full">
                    {reactions.length}
                  </span>
                </div>

                <div className="flex flex-col gap-2 mt-1 pl-1">
                  {reactions.map((r, index) => {
                    // Extracting ID cleanly whether it came populated or raw
                    const reactingUserId = r.userId?._id || r.userId;

                    // Priority 1: Check populated backend data; Priority 2: Fallback context list check
                    const user = r.userId?.fullName
                      ? r.userId
                      : members?.find((m) => (m._id || m) === reactingUserId);

                    return (
                      <div
                        key={reactingUserId || index}
                        className="flex items-center gap-2 py-0.5"
                      >
                        <img
                          src={user?.profilePic || assets.avatar_icon}
                          className="w-6 h-6 rounded-full object-cover border border-gray-700"
                          alt=""
                        />
                        <span className="text-sm text-gray-200">
                          {user?.fullName || "Group Member"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 text-center py-4">
              No reactions left on this message
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReactionModal;
