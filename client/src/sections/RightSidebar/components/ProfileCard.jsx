import React, { useContext } from "react";
import { ChatContext } from "../../../context/ChatContext";
import { AuthContext } from "../../../context/AuthContext";
import assets from "../../../assets/assets";

const ProfileCard = () => {
  const { selectedUser, selectedGroup } = useContext(ChatContext);
  const { onlineUsers } = useContext(AuthContext);

  if (!selectedUser && !selectedGroup) return null;

  return (
    <div className="pt-2 flex flex-col items-center gap-2 text-xs font-light text-center shrink-0">
      {selectedGroup ? (
        <div className="w-20 h-20 rounded-full bg-blue-500/30 flex items-center justify-center text-blue-300 font-bold uppercase text-2xl mb-2 shrink-0">
          {selectedGroup.name.slice(0, 2)}
        </div>
      ) : (
        <img
          src={selectedUser?.profilePic || assets.avatar_icon}
          className="w-20 h-20 rounded-full object-cover mb-2 border-2 border-white/10 shrink-0"
          alt="Profile"
        />
      )}

      <h1 className="text-xl font-medium flex items-center gap-2 text-white truncate max-w-full">
        {!selectedGroup && onlineUsers.includes(selectedUser?._id) && (
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 block shrink-0" />
        )}
        {selectedGroup ? selectedGroup.name : selectedUser?.fullName}
      </h1>

      <p className="text-gray-400 truncate max-w-full">
        {selectedGroup ? "Shared Workspace" : selectedUser?.bio || "No status setup yet"}
      </p>
    </div>
  );
};

export default ProfileCard;