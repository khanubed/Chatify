import React, { useState, useEffect, useContext } from "react";
import assets from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";
import toast from "react-hot-toast";

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    selectedGroup,
    setSelectedGroup,
    unseenGroups,
    groups = [],
    getGroups,
    unseenMessages,
    setUnseenMessages,
    createGroup,
    setUnseenGroups,
    getMessages,
    setShowInfoDrawer
  } = useContext(ChatContext);

  const { logout, onlineUsers } = useContext(AuthContext);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("direct"); // 'direct' or 'groups'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  const navigate = useNavigate();

  // ✅ FIXED: Load basic list payloads cleanly on layout mount
  useEffect(() => {
    getUsers();
    if (getGroups) getGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = search
    ? users.filter((user) =>
        user.fullName.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  const filteredGroups = search
    ? groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    : groups;

  const handleSelectUser = (user) => {
    setShowInfoDrawer(false);
    setSelectedGroup(null);
    setSelectedUser(user);
    const userIdStr = user._id?.toString();
    if (userIdStr) {
      setUnseenMessages((prev) => ({ ...prev, [userIdStr]: 0 }));
    }
  };

  const handleSelectGroup = (group) => {
    setSelectedUser(null);
    setShowInfoDrawer(false);
    setSelectedGroup(group);
    const groupIdStr = group._id?.toString();

    if (groupIdStr) {
      setUnseenGroups((prev) => ({ ...prev, [groupIdStr]: 0 }));
    }
  };

  const toggleMemberSelection = (userId) => {
    setShowInfoDrawer(false);
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();

    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error("Please select at least one member to join your group");
      return;
    }

    const success = await createGroup({
      name: groupName.trim(),
      members: selectedMembers,
    });

    if (success) {
      setShowCreateModal(false);
      setGroupName("");
      setSelectedMembers([]);
    }
  };

  const isTabActive = selectedUser || selectedGroup;

  return (
    <div
      className={`bg-[#8196b2]/10 h-full p-5 flex flex-col overflow-y-auto ${isTabActive ? "max-md:hidden" : ""}`}
    >
      {/* Header setup */}
      <div className="pb-3 shrink-0">
        <div className="flex justify-between items-center">
          <img src={assets.logo} alt="logo" className="max-w-40" />
          <div className="relative py-2 group">
            <img
              src={assets.menu_icon}
              alt="Menu"
              className="max-h-5 cursor-pointer"
            />
            <div className="absolute top-full right-0 z-20 w-32 rounded-md bg-[#212b42] p-5 border border-gray-600 text-gray-100 hidden group-hover:block">
              <p
                onClick={() => navigate("/profile")}
                className="cursor-pointer text-sm hover:text-blue-400 transition-colors"
              >
                Edit Profile
              </p>
              <hr className="my-2 border-t border-gray-500" />
              <p
                className="cursor-pointer text-sm hover:text-red-400 transition-colors"
                onClick={() => logout()}
              >
                Logout
              </p>
            </div>
          </div>
        </div>

        {/* Search query */}
        <div className="bg-[#2d323d] rounded-full flex items-center gap-2 mt-5 py-3 px-4 ">
          <img src={assets.search_icon} alt="Search" className="w-3" />
          <input
            type="text"
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs placeholder-[#c8c8c8] flex-1 text-white"
            placeholder={
              activeTab === "direct" ? "Search User" : "Search Group"
            }
          />
        </div>
      </div>

      {/* Sub-Navigation Controls */}
      <div className="flex justify-between items-center border-b border-gray-600 mb-4 pb-2 gap-2 text-sm text-gray-400 font-medium shrink-0">
        <div className="flex gap-4">
          <span
            onClick={() => setActiveTab("direct")}
            className={`cursor-pointer pb-1 transition-all ${activeTab === "direct" ? "text-blue-400 border-b-2 border-blue-400 font-bold" : ""}`}
          >
            Chats
          </span>
          <span
            onClick={() => setActiveTab("groups")}
            className={`cursor-pointer pb-1 transition-all ${activeTab === "groups" ? "text-blue-400 border-b-2 border-blue-400 font-bold" : ""}`}
          >
            Groups
          </span>
        </div>
        {activeTab === "groups" && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs hover:bg-blue-500/40 transition-all"
          >
            + New Group
          </button>
        )}
      </div>

      {/* List Selection Render spaces */}
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
        {activeTab === "direct" ? (
          filteredUsers.map((user) => {
            const userIdString = user._id?.toString();
            const directCount = unseenMessages
              ? unseenMessages[userIdString] || 0
              : 0;

            return (
              <div
                onClick={() => handleSelectUser(user)}
                key={userIdString || user.fullName}
                className={`relative flex items-center gap-2 p-2 pl-4 rounded cursor-pointer max-sm:text-sm text-white ${selectedUser?._id === user._id ? "bg-[#212b42]/50" : "hover:bg-white/5"}`}
              >
                <img
                  src={user?.profilePic || assets.avatar_icon}
                  alt=""
                  className="w-[35px] aspect-square rounded-full object-cover"
                />
                <div className="flex flex-col leading-5">
                  <p>{user.fullName}</p>
                  <span
                    className={`text-xs ${onlineUsers?.includes(user._id) ? "text-green-400" : "text-neutral-400"}`}
                  >
                    {onlineUsers?.includes(user._id) ? "Online" : "Offline"}
                  </span>
                </div>
                {directCount > 0 && (
                  <p className="absolute top-4 right-4 text-xs h-5 w-5 flex justify-center items-center rounded-full bg-blue-500 text-white font-bold animate-bounce">
                    {directCount}
                  </p>
                )}
              </div>
            );
          })
        ) : filteredGroups.length > 0 ? (
          filteredGroups.map((group) => {
            const groupIdString = group._id?.toString();
            const groupCount = unseenGroups
              ? unseenGroups[groupIdString] || 0
              : 0;

            return (
              <div
                onClick={() => handleSelectGroup(group)}
                key={groupIdString || group.name}
                className={`relative flex items-center gap-2 p-2 pl-4 rounded cursor-pointer max-sm:text-sm text-white ${selectedGroup?._id === group._id ? "bg-[#212b42]/50" : "hover:bg-white/5"}`}
              >
                <div className="w-[35px] h-[35px] rounded-full bg-blue-500/30 flex items-center justify-center text-blue-300 font-bold uppercase shrink-0">
                  {group.name.slice(0, 2)}
                </div>
                <div className="flex flex-col leading-5">
                  <p>{group.name}</p>
                  <span className="text-xs text-neutral-400">
                    {group.members?.length || 0} members
                  </span>
                </div>
                {groupCount > 0 && (
                  <p className="absolute top-4 right-4 text-xs h-5 w-5 flex justify-center items-center rounded-full bg-blue-500 text-white font-bold animate-bounce">
                    {groupCount}
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-xs text-gray-500 text-center mt-4">
            No groups found
          </p>
        )}
      </div>

      {/* Absolute Creation Modal Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#212b42] border border-gray-600 rounded-xl p-5 w-full max-w-sm text-white shadow-2xl animate-scale-up">
            <h2 className="text-lg font-medium mb-4">Create New Channel</h2>
            <form
              onSubmit={handleCreateGroupSubmit}
              className="flex flex-col gap-3"
            >
              <input
                required
                type="text"
                placeholder="Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="bg-[#2d323d] border border-gray-600 rounded-lg p-2 outline-none text-sm placeholder-gray-400 text-white focus:border-blue-500 transition-colors"
              />

              <p className="text-xs text-gray-400 mt-2">Select Members:</p>
              <div className="max-h-32 overflow-y-auto border border-gray-700 rounded-lg p-2 bg-[#2d323d]/40 flex flex-col gap-1 custom-scrollbar">
                {users.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => toggleMemberSelection(u._id)}
                    className="flex items-center justify-between text-xs p-1.5 hover:bg-white/5 rounded cursor-pointer transition-colors"
                  >
                    <span>{u.fullName}</span>
                    <input
                      type="checkbox"
                      readOnly
                      checked={selectedMembers.includes(u._id)}
                      className="accent-blue-500 pointer-events-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 mt-4 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
