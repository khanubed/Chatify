import React, { useState, useContext } from "react";
import { ChatContext } from "../../../context/ChatContext";
import toast from "react-hot-toast";

const CreateGroupModal = ({ setShowCreateModal }) => {
  const { users, createGroup } = useContext(ChatContext);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

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
  );
};

export default CreateGroupModal;
