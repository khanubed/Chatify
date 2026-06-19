import React, { useState, useEffect, useContext } from "react";
import { ChatContext } from "../../context/ChatContext";

// Child Components
import SidebarHeader from "./components/SidebarHeader";
import SidebarTabs from "./components/SidebarTabs";
import ChatList from "./components/ChatList";
import GroupList from "./components/GroupList";
import CreateGroupModal from "./components/CreateGroupModal";

const Sidebar = () => {
  const { getUsers, getGroups, selectedUser, selectedGroup } =
    useContext(ChatContext);

  // Local UI State
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("direct");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch initial data
  useEffect(() => {
    getUsers();
    if (getGroups) getGroups();
  }, []);

  return (
    <div
      className={`bg-[#8196b2]/10 h-full p-5 flex flex-col overflow-y-auto ${
        selectedUser || selectedGroup ? "max-md:hidden" : ""
      }`}
    >
      <SidebarHeader activeTab={activeTab} setSearch={setSearch} />

      <SidebarTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setShowCreateModal={setShowCreateModal}
      />

      {/* Render list entries */}
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
        {activeTab === "direct" ? (
          <ChatList search={search} />
        ) : (
          <GroupList search={search} />
        )}
      </div>

      {showCreateModal && (
        <CreateGroupModal setShowCreateModal={setShowCreateModal} />
      )}
    </div>
  );
};

export default Sidebar;
