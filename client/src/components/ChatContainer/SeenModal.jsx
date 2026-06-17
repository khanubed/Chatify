import React from "react";
import { X } from "lucide-react";
import assets from "../../assets/assets";

const SeenModal = ({ seenModalList, setSeenModalList }) => {
  if (!seenModalList) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={() => setSeenModalList(null)}
    >
      <div
        className="bg-gray-900 border border-gray-700 text-white w-full max-w-sm rounded-xl p-5 shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-700 pb-3 mb-4">
          <h3 className="font-semibold text-base text-gray-200">Message Seen By</h3>
          <button onClick={() => setSeenModalList(null)} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-3 custom-scrollbar pr-1">
          {seenModalList.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No receipts documented yet</p>
          ) : (
            seenModalList.map((viewer, index) => {
              const displayName = viewer.fullName || viewer.name || "Group Member";
              const profileAvatar = viewer.profilePic || viewer.avatar || assets.avatar_icon;
              const handleName = viewer.username || "user";

              return (
                <div
                  key={viewer._id || index}
                  className="flex items-center gap-3 p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <img
                    src={profileAvatar}
                    alt={displayName}
                    className="w-8 h-8 rounded-full object-cover border border-gray-700"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-200">{displayName}</p>
                    <p className="text-[11px] text-gray-500 truncate">@{handleName}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default SeenModal;