import React, { useState, useEffect, useContext } from "react";
import assets from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext";
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
    setShowInfoDrawer,
    requestToJoinGroup,
    handleAdminAction, // 🌟 Extracted context handler to resolve pending requests
  } = useContext(ChatContext);

  const { logout, onlineUsers, authUser } = useContext(AuthContext);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("direct");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    getUsers();
    if (getGroups) getGroups();
  }, []);

  // 🌟 Filter groups created by the logged-in user that have active join requests
  const adminGroupsWithRequests = groups.filter(
    (group) =>
      group.createdBy?._id?.toString() === authUser?._id?.toString() &&
      group.requests?.length > 0,
  );

  const hasPendingRequests = adminGroupsWithRequests.length > 0;

  const filteredUsers = search
    ? users.filter((user) =>
        user.fullName.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  const filteredGroups = search
    ? groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    : groups;

  const handleSelectUser = (user) => {
    // if (authUser?.blockedUsers?.includes(user._id) || user.hasBlockedMe) {
    //   toast.error("Cannot open chat layout due to blocking restrictions.");
    //   return;
    // }
    setShowInfoDrawer(false);
    setSelectedGroup(null);
    setSelectedUser(user);
    const userIdStr = user._id?.toString();
    if (userIdStr) {
      setUnseenMessages((prev) => ({ ...prev, [userIdStr]: 0 }));
    }
  };

  const handleSelectGroup = (group) => {
    const isMember = group.members?.some((m) => (m._id || m) === authUser._id);
    if (!isMember) return;

    setSelectedUser(null);
    setShowInfoDrawer(false);
    setSelectedGroup(group);
    const groupIdStr = group._id?.toString();
    if (groupIdStr) {
      setUnseenGroups((prev) => ({ ...prev, [groupIdStr]: 0 }));
    }
  };

  const toggleMemberSelection = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return toast.error("Please enter a group name");
    if (selectedMembers.length === 0)
      return toast.error("Select at least one member");

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

  return (
    <div
      className={`bg-[#8196b2]/10 h-full p-5 flex flex-col overflow-y-auto ${selectedUser || selectedGroup ? "max-md:hidden" : ""}`}
    >
      {/* Header section */}
      <div className="pb-3 shrink-0">
        <div className="flex justify-between items-center">
          <img src={assets.logo} alt="logo" className="max-w-40" />

          {/* Action Hub Wrapper */}
          <div className="flex items-center gap-3">
            {/* 🌟 NOTIFICATION BELL DROPDOWN */}
            <div className="relative py-2 group">
              <button className="relative text-gray-400 hover:text-blue-400 transition-colors text-base flex items-center justify-center">
                <span className="text-lg">🔔</span>
                {hasPendingRequests && (
                  <span className="absolute top-1 right-0 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>

              {/* Dropdown panel */}
              <div className="absolute top-full -right-10 z-100 overflow-x-clip w-72 rounded-md bg-[#212b42] p-4 border border-gray-600 text-gray-100 hidden group-hover:block shadow-xl max-h-64 overflow-y-auto custom-scrollbar">
                <h3 className="text-xs font-semibold text-blue-400 mb-2">
                  Join Requests
                </h3>
                {hasPendingRequests ? (
                  <div className="flex flex-col gap-2">
                    {adminGroupsWithRequests.map((group) =>
                      // Add a defensive filter to ensure we don't map over undefined/null items
                      (group.requests || []).map((applicant) => {
                        if (!applicant) return null;

                        return (
                          <div
                            // 🌟 CHANGE THIS: Make sure the key uses the action stamp to force a redraw
                            key={`req-${group._id}-${applicant._id}-${group.requests.length}`}
                            className="flex flex-col gap-2 bg-[#2d323d]/40 p-2 rounded border border-gray-700 text-[11px]"
                          >
                            <div>
                              <span className="font-bold text-white block">
                                {applicant.fullName}
                              </span>
                              <span className="text-gray-400">
                                Wants to join <strong>{group.name}</strong>
                              </span>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() =>
                                  handleAdminAction(
                                    group._id,
                                    applicant._id,
                                    "reject",
                                  )
                                }
                                className="px-2 py-0.5 rounded bg-gray-600 hover:bg-gray-500 transition-colors text-gray-200"
                              >
                                Decline
                              </button>
                              <button
                                onClick={() =>
                                  handleAdminAction(
                                    group._id,
                                    applicant._id,
                                    "accept",
                                  )
                                }
                                className="px-2 py-0.5 rounded bg-blue-500 hover:bg-blue-600 transition-colors text-white font-medium"
                              >
                                Accept
                              </button>
                            </div>
                          </div>
                        );
                      }),
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500 text-center py-2">
                    No pending requests
                  </p>
                )}
              </div>
            </div>

            {/* Menu Options Dropdown */}
            <div className="relative py-2 group">
              <img
                src={assets.menu_icon}
                alt="Menu"
                className="max-h-5 cursor-pointer"
              />
              <div className="absolute top-full right-0 z-20 w-32 rounded-md bg-[#212b42] p-5 border border-gray-600 text-gray-100 hidden group-hover:block">
                <p
                  onClick={() => navigate("/profile")}
                  className="cursor-pointer text-sm hover:text-blue-400"
                >
                  Edit Profile
                </p>
                <hr className="my-2 border-t border-gray-500" />
                <p
                  className="cursor-pointer text-sm hover:text-red-400"
                  onClick={logout}
                >
                  Logout
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-[#2d323d] rounded-full flex items-center gap-2 mt-5 py-3 px-4">
          <img src={assets.search_icon} alt="Search" className="w-3" />
          <input
            type="text"
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs placeholder-[#c8c8c8] flex-1 text-white"
            placeholder={
              activeTab === "direct" ? "Search User" : "Search or Join Channels"
            }
          />
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex justify-between items-center border-b border-gray-600 mb-4 pb-2 gap-2 text-sm text-gray-400 font-medium shrink-0">
        <div className="flex gap-4">
          <span
            onClick={() => setActiveTab("direct")}
            className={`cursor-pointer pb-1 ${activeTab === "direct" ? "text-blue-400 border-b-2 border-blue-400 font-bold" : ""}`}
          >
            Chats
          </span>
          <span
            onClick={() => setActiveTab("groups")}
            className={`cursor-pointer pb-1 ${activeTab === "groups" ? "text-blue-400 border-b-2 border-blue-400 font-bold" : ""}`}
          >
            Groups
          </span>
        </div>
        {activeTab === "groups" && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs hover:bg-blue-500/40"
          >
            + New Group
          </button>
        )}
      </div>

      {/* Render list entries */}
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
        {activeTab === "direct" ? (
          filteredUsers.map((user) => {
            const userIdString = user._id?.toString();
            const directCount = unseenMessages
              ? unseenMessages[userIdString] || 0
              : 0;

            const iBlockedThem = authUser?.blockedUsers?.includes(user._id);
            const theyBlockedMe = user.hasBlockedMe;

            return (
              <div
                onClick={() => handleSelectUser(user)}
                key={userIdString || user.fullName}
                className={`relative flex items-center justify-between p-2 pl-4 rounded cursor-pointer text-white ${selectedUser?._id === user._id ? "bg-[#212b42]/50" : "hover:bg-white/5"} ${iBlockedThem || theyBlockedMe ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center gap-2">
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
                      {iBlockedThem
                        ? "Blocked"
                        : theyBlockedMe
                          ? "Unavailable"
                          : onlineUsers?.includes(user._id)
                            ? "Online"
                            : "Offline"}
                    </span>
                  </div>
                </div>
                {iBlockedThem && (
                  <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30">
                    You Blocked
                  </span>
                )}
                {theyBlockedMe && !iBlockedThem && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                    Blocked You
                  </span>
                )}

                {directCount > 0 && !iBlockedThem && !theyBlockedMe && (
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

            const isMember = group.members?.some(
              (m) => (m._id || m) === authUser._id,
            );
            const hasRequested = group.requests?.some(
              (r) => (r._id || r) === authUser._id,
            );

            return (
              <div
                onClick={() => handleSelectGroup(group)}
                key={groupIdString || group.name}
                className={`relative flex items-center justify-between p-2 pl-4 rounded text-white ${isMember ? "cursor-pointer hover:bg-white/5" : "cursor-default"} ${selectedGroup?._id === group._id ? "bg-[#212b42]/50" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-[35px] h-[35px] rounded-full bg-blue-500/30 flex items-center justify-center text-blue-300 font-bold uppercase shrink-0">
                    {group.name.slice(0, 2)}
                  </div>
                  <div className="flex flex-col leading-5">
                    <p>{group.name}</p>
                    <span className="text-xs text-neutral-400">
                      {group.members?.length || 0} members
                    </span>
                  </div>
                </div>

                {!isMember ? (
                  hasRequested ? (
                    <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded-full border border-yellow-500/20 font-medium">
                      Pending
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        requestToJoinGroup(group._id);
                      }}
                      className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full hover:bg-blue-600 transition-all font-medium shadow"
                    >
                      Join
                    </button>
                  )
                ) : (
                  groupCount > 0 && (
                    <p className="absolute top-4 right-4 text-xs h-5 w-5 flex justify-center items-center rounded-full bg-blue-500 text-white font-bold">
                      {groupCount}
                    </p>
                  )
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
