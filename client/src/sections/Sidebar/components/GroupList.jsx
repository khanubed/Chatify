import React, { useContext } from "react";
import { ChatContext } from "../../../context/ChatContext";
import { AuthContext } from "../../../context/AuthContext";

const GroupList = ({ search }) => {
  const {
    groups = [],
    unseenGroups,
    setSelectedUser,
    setSelectedGroup,
    setUnseenGroups,
    setShowInfoDrawer,
    selectedGroup,
    requestToJoinGroup,
  } = useContext(ChatContext);
  const { authUser } = useContext(AuthContext);

  const filteredGroups = search
    ? groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    : groups;

  const handleSelectGroup = (group) => {
    const isMember = group.members?.some((m) => (m._id || m) === authUser._id);
    if (!isMember) return;

    setSelectedUser(null);
    setShowInfoDrawer(false);
    setSelectedGroup(group);
    const groupIdStr = group._id?.toString();
    if (groupIdStr) setUnseenGroups((prev) => ({ ...prev, [groupIdStr]: 0 }));
  };

  if (filteredGroups.length === 0) {
    return (
      <p className="text-xs text-gray-500 text-center mt-4">No groups found</p>
    );
  }

  return (
    <>
      {filteredGroups.map((group) => {
        const groupIdString = group._id?.toString();
        const groupCount = unseenGroups ? unseenGroups[groupIdString] || 0 : 0;
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
      })}
    </>
  );
};

export default GroupList;
