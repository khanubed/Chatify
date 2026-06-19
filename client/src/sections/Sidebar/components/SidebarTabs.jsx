import React from "react";

const SidebarTabs = ({ activeTab, setActiveTab, setShowCreateModal }) => {
  return (
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
  );
};

export default SidebarTabs;