import React from "react";
import assets from "../../../assets/assets";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";

const SidebarHeader = ({ activeTab, setSearch }) => {
  return (
    <div className="pb-3 shrink-0">
      <div className="flex justify-between items-center">
        <img src={assets.logo} alt="logo" className="max-w-40" />
        <div className="flex items-center gap-3">
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

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
  );
};

export default SidebarHeader;
