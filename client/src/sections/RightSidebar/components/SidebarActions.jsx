import React, { useContext } from "react";
import { ChatContext } from "../../../context/ChatContext";
import { AuthContext } from "../../../context/AuthContext";
import Swal from "sweetalert2";
import { LogOut, UserCheck, UserX } from "lucide-react";

const SidebarActions = () => {
  const { selectedUser, selectedGroup, leaveGroupAction, toggleBlockUserAction } = useContext(ChatContext);
  const { authUser } = useContext(AuthContext);

  const isUserBlocked = selectedUser
    ? authUser?.blockedUsers?.some((id) => id?.toString() === selectedUser._id?.toString())
    : false;

  const handleLeaveGroupConfirm = () => {
    Swal.fire({
      title: "Leave Group?",
      text: "Are you sure you want to step away from this group workspace channel?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#374151",
      confirmButtonText: "Yes, leave group",
      background: "#182031",
      color: "#ffffff",
    }).then((result) => {
      if (result.isConfirmed && selectedGroup) {
        leaveGroupAction(selectedGroup._id);
      }
    });
  };

  const handleBlockUserConfirm = () => {
    const actionText = isUserBlocked ? "unblock" : "block";

    Swal.fire({
      title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} User?`,
      text: `Are you sure you want to ${actionText} ${selectedUser?.fullName || "this user"}?`,
      icon: isUserBlocked ? "info" : "error",
      showCancelButton: true,
      confirmButtonColor: isUserBlocked ? "#10b981" : "#ef4444",
      cancelButtonColor: "#374151",
      confirmButtonText: `Yes, ${actionText}`,
      background: "#182031",
      color: "#ffffff",
    }).then((result) => {
      if (result.isConfirmed && selectedUser) {
        toggleBlockUserAction(selectedUser._id);
      }
    });
  };

  return (
    <div className="w-full pt-4 flex justify-center shrink-0 border-t border-white/5 mt-auto bg-transparent">
      {selectedGroup ? (
        <button
          onClick={handleLeaveGroupConfirm}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-sm py-2 px-10 rounded-full text-white font-medium w-full max-w-[220px] hover:opacity-90 active:scale-95 transition-all"
        >
          <LogOut size={14} />
          <span>Leave Group</span>
        </button>
      ) : (
        <button
          onClick={handleBlockUserConfirm}
          className={`flex items-center justify-center gap-2 text-sm py-2 px-10 rounded-full text-white font-medium w-full max-w-[220px] hover:opacity-90 active:scale-95 transition-all bg-gradient-to-r ${
            isUserBlocked ? "from-green-600 to-emerald-700" : "from-red-500 to-red-600"
          }`}
        >
          {isUserBlocked ? <UserCheck size={14} /> : <UserX size={14} />}
          <span>{isUserBlocked ? "Unblock User" : "Block User"}</span>
        </button>
      )}
    </div>
  );
};

export default SidebarActions;