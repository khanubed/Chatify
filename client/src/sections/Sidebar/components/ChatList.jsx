import React, { useContext } from "react";
import { ChatContext } from "../../../context/ChatContext";
import { AuthContext } from "../../../context/AuthContext";
import assets from "../../../assets/assets";

const ChatList = ({ search }) => {
  const {
    users,
    unseenMessages,
    setSelectedUser,
    setSelectedGroup,
    setUnseenMessages,
    setShowInfoDrawer,
    selectedUser,
  } = useContext(ChatContext);
  const { authUser, onlineUsers } = useContext(AuthContext);

  const filteredUsers = search
    ? users.filter((user) =>
        user.fullName.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  const handleSelectUser = (user) => {
    setShowInfoDrawer(false);
    setSelectedGroup(null);
    setSelectedUser(user);
    const userIdStr = user._id?.toString();
    if (userIdStr) setUnseenMessages((prev) => ({ ...prev, [userIdStr]: 0 }));
  };

  return (
    <>
      {filteredUsers.map((user) => {
        const userIdString = user._id?.toString();
        const directCount = unseenMessages
          ? unseenMessages[userIdString] || 0
          : 0;
        const iBlockedThem = user.blockStatus === "blockedByMe";
        const theyBlockedMe = user.blockStatus === "blockedMe";

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
      })}
    </>
  );
};

export default ChatList;
