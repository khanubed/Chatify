import React, { useContext, useState, useEffect } from "react";
import { ChatContext } from "../../../context/ChatContext";
import { Search, Loader2, UserPlus } from "lucide-react";
import assets from "../../../assets/assets";

const GroupManager = () => {
  const { selectedGroup, addGroupMember, getNonGroupMembers } = useContext(ChatContext);
  
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [loadingUserId, setLoadingUserId] = useState(null);

  useEffect(() => {
    setIsAdding(false);
    setSearchQuery("");
  }, [selectedGroup?._id]);

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

  if (!selectedGroup) return null;

  const filteredUsers = allUsers
    .filter((user) => !selectedGroup.members?.some((m) => m._id === user._id))
    .filter((user) => user.fullName.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSelectMember = async (userId) => {
    if (!addGroupMember) return;
    setLoadingUserId(userId);
    await addGroupMember(selectedGroup._id, userId);
    setLoadingUserId(null);
  };

  return (
    <div className="mb-4 text-xs flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3 shrink-0">
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
        <div className="flex flex-col gap-2 min-h-0">
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
              <p className="text-gray-500 text-center py-2">No results matching</p>
            ) : (
              filteredUsers.map((user) => (
                <div key={user._id} className="flex items-center justify-between p-1.5 rounded hover:bg-white/5">
                  <span className="truncate text-gray-200 pr-2">{user.fullName}</span>
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
              <span className="truncate text-gray-200">{member.fullName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupManager;