import React, { useContext, useState, useEffect } from "react";
import assets from "../assets/assets";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import { X, UserPlus, Search, Loader2 } from "lucide-react";

const RightSidebar = () => {
  const {
    selectedUser,
    selectedGroup,
    messages,
    showInfoDrawer,
    setShowInfoDrawer,
    addGroupMember,
    getNonGroupMembers,
  } = useContext(ChatContext);

  const { logout, onlineUsers } = useContext(AuthContext);

  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatImages, setChatImages] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loadingUserId, setLoadingUserId] = useState(null);

  const currentChat = selectedUser || selectedGroup;

  // Sync Non-Group Directory Setup
  useEffect(() => {
    if (isAdding && selectedGroup?._id) {
      const fetchEligibleUsers = async () => {
        try {
          const res = await getNonGroupMembers(selectedGroup._id);
          setAllUsers(res);
        } catch (error) {
          console.error("Failed to load user directory:", error);
        }
      };
      fetchEligibleUsers();
    }
  }, [isAdding, selectedGroup?._id, getNonGroupMembers]);

  // Reset drawer + UI state whenever the active chat changes
  useEffect(() => {
    setIsAdding(false);
    setSearchQuery("");
    setShowInfoDrawer(false);
  }, [selectedUser?._id, selectedGroup?._id]);

  // Sync shared media grid whenever messages update
  useEffect(() => {
    if (messages) {
      setChatImages(
        messages.filter((msg) => msg.image).map((msg) => msg.image),
      );
    }
  }, [messages]);

  if (!currentChat) return null;

  const filteredUsers = allUsers
    .filter((user) => !selectedGroup?.members?.some((m) => m._id === user._id))
    .filter((user) =>
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  const handleSelectMember = async (userId) => {
    if (!addGroupMember || !selectedGroup) return;
    setLoadingUserId(userId);
    await addGroupMember(selectedGroup._id, userId);
    setLoadingUserId(null);
  };

  // 📝 INTERNAL REUSABLE CORE RENDER
  // Wrapped in a self-contained layout to prevent rendering overflow leaks
  const SidebarInnerUI = () => (
    <div className="flex flex-col h-full min-h-0 justify-between">
      {/* Scrollable Context Box */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-6">
        {/* Profile Card Block */}
        <div className="pt-2 flex flex-col items-center gap-2 text-xs font-light text-center">
          {selectedGroup ? (
            <div className="w-20 h-20 rounded-full bg-blue-500/30 flex items-center justify-center text-blue-300 font-bold uppercase text-2xl mb-2 shrink-0">
              {selectedGroup.name.slice(0, 2)}
            </div>
          ) : (
            <img
              src={selectedUser?.profilePic || assets.avatar_icon}
              className="w-20 h-20 rounded-full object-cover mb-2 border-2 border-white/10 shrink-0"
              alt=""
            />
          )}
          <h1 className="text-xl font-medium flex items-center gap-2 text-white truncate max-w-full">
            {!selectedGroup && onlineUsers.includes(selectedUser?._id) && (
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 block shrink-0"></span>
            )}
            {selectedGroup ? selectedGroup.name : selectedUser?.fullName}
          </h1>
          <p className="text-gray-400 truncate max-w-full">
            {selectedGroup
              ? "Shared Workspace"
              : selectedUser?.bio || "No status setup yet"}
          </p>
        </div>

        <hr className="border-white/10 my-5" />

        {/* Directory/Group Management Panel */}
        {selectedGroup && (
          <div className="mb-4 text-xs">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-400 font-medium">
                Group Members ({selectedGroup.members?.length || 0})
              </p>
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="text-blue-400 hover:text-blue-300 font-medium shrink-0"
              >
                {isAdding ? "View Members" : "Add Member +"}
              </button>
            </div>

            {isAdding ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center bg-gray-800/40 border border-gray-700 rounded-lg px-2.5 py-1.5 gap-2 shrink-0">
                  <Search size={14} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-white outline-none w-full text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1 max-h-36 overflow-y-auto bg-black/20 p-1.5 rounded-lg border border-white/5 custom-scrollbar">
                  {filteredUsers.length === 0 ? (
                    <p className="text-gray-500 text-center py-2">
                      No results matching
                    </p>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center justify-between p-1.5 rounded hover:bg-white/5"
                      >
                        <span className="truncate text-gray-200 pr-2">
                          {user.fullName}
                        </span>
                        <button
                          onClick={() => handleSelectMember(user._id)}
                          disabled={loadingUserId !== null}
                          className="text-blue-400 shrink-0"
                        >
                          {loadingUserId === user._id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <UserPlus size={12} />
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-36 overflow-y-auto bg-black/10 p-2 rounded-lg custom-scrollbar">
                {selectedGroup.members?.map((member) => (
                  <div key={member._id} className="flex items-center gap-2">
                    <img
                      src={member.profilePic || assets.avatar_icon}
                      className="w-6 h-6 rounded-full object-cover shrink-0"
                      alt=""
                    />
                    <span className="truncate text-gray-200">
                      {member.fullName}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <hr className="border-white/10 my-5" />
          </div>
        )}

        {/* Media Block Vault */}
        <div className="text-xs">
          <p className="text-gray-400 font-medium">
            Shared Media ({chatImages.length})
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {chatImages.map((url, index) => (
              <div
                key={index}
                onClick={() => window.open(url)}
                className="cursor-pointer aspect-square rounded overflow-hidden bg-black/20 border border-white/10 hover:border-blue-400 transition-all"
              >
                <img src={url} className="w-full h-full object-cover" alt="" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Persistent Static Bottom Block */}
      <div className="w-full pt-4 flex justify-center shrink-0 border-t border-white/5 mt-auto bg-transparent">
        <button
          onClick={() => logout()}
          className="bg-gradient-to-r from-blue-500 to-gray-600 text-sm py-2 px-10 rounded-full text-white font-medium w-full max-w-[220px] hover:opacity-90 transition-opacity"
        >
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 📱 STANDARD MOBILE VIEW: BOUNDED OVERLAY DRAWER SHEET */}
      {showInfoDrawer && (
        <div className="xl:hidden">
          {/* Backdrop overlay layer */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setShowInfoDrawer(false)}
          />

          {/* Slide Up Panel Frame */}
          <div
            className="fixed bottom-0 left-0 right-0 max-h-[85vh] h-auto bg-[#182031] text-white rounded-t-2xl z-50 px-5 pt-2 pb-6 border-t border-gray-800 flex flex-col justify-start"
          >
            {/* Swipe handle decoration / action bar block */}
            <div className="flex flex-col items-center py-2 shrink-0">
              <div
                className="w-12 h-1.5 bg-gray-700 rounded-full mb-3 cursor-pointer"
                onClick={() => setShowInfoDrawer(false)}
              />
              <div className="w-full flex justify-between items-center pb-1">
                <span className="text-sm font-semibold text-gray-300">
                  Details
                </span>
                <button
                  onClick={() => setShowInfoDrawer(false)}
                  className="text-gray-400 p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Core Content Box with layout boundaries explicitly defined */}
            <div className="flex-1 min-h-0 overflow-hidden mt-2">
              <SidebarInnerUI />
            </div>
          </div>
        </div>
      )}

      {/* 🖥️ STANDARD DESKTOP VIEW: FIXED COLUMN SEGMENT */}
      <div className="hidden xl:flex flex-col justify-between h-full w-[300px] min-w-[300px] max-w-[300px] bg-[#8196b2]/5 text-white border-l border-gray-800 p-5 shrink-0 overflow-hidden">
        <div className="flex-1 min-h-0">
          <SidebarInnerUI />
        </div>
      </div>
    </>
  );
};

export default RightSidebar;
