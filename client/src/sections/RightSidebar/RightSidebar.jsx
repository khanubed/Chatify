import React, { useContext, useEffect } from "react";
import { ChatContext } from "../../context/ChatContext";
import { X } from "lucide-react";
import AdminNotificationPanel from "../AdminNotificationPanel";
import ProfileCard from "./components/ProfileCard";
import GroupManager from "./components/GroupManager";
import MediaGallery from "./components/MediaGallery";
import SidebarActions from "./components/SidebarActions";

const RightSidebar = () => {
  const { selectedUser, selectedGroup, showInfoDrawer, setShowInfoDrawer } =
    useContext(ChatContext);
  const currentChat = selectedUser || selectedGroup;

  // Auto-collapse layout drawer on layout switching safely
  useEffect(() => {
    setShowInfoDrawer(false);
  }, [selectedUser?._id, selectedGroup?._id, setShowInfoDrawer]);

  if (!currentChat) return null;

  // Reusable core structural bundle for viewports
  const SidebarContentComposition = () => (
    // 🌟 CHANGED: Swapped h-full to flex-1 flex flex-col min-h-0 to perfectly fill available remaining space
    <div className="flex-1 flex flex-col min-h-0 justify-between">
      {/* Scrollable Context Box */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-6 flex flex-col gap-5">
        {/* 🌟 FIXED: Wrapped items in shrink-0 blocks to force them to keep their native proportions instead of compressing */}
        <div className="shrink-0">
          <ProfileCard />
        </div>

        <hr className="border-white/10 my-0 shrink-0" />

        <div className="shrink-0">
          <GroupManager />
        </div>

        <div className="shrink-0">
          <MediaGallery />
        </div>
      </div>

      {/* 🌟 FIXED: Wrapped footer actions in shrink-0 so buttons are never squished at the bottom */}
      <div className="shrink-0 pt-2">
        <SidebarActions />
      </div>
    </div>
  );

  return (
    <>
      {/* 📱 MOBILE OVERLAY DRAWER */}
      {showInfoDrawer && (
        <div className="xl:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setShowInfoDrawer(false)}
          />

          <div className="fixed bottom-0 left-0 right-0 h-[85vh] max-h-[85vh] bg-[#182031] text-white rounded-t-2xl z-50 px-5 pt-2 pb-6 border-t border-gray-800 flex flex-col">
            <div className="flex flex-col items-center py-2 shrink-0">
              <div
                className="w-12 h-1.5 bg-gray-700 rounded-full mb-3 cursor-pointer"
                onClick={() => setShowInfoDrawer(false)}
              />
              <div className="w-full flex justify-between items-center pb-1">
                <span className="text-sm font-semibold text-gray-300">
                  Details
                </span>
                <button
                  onClick={() => setShowInfoDrawer(false)}
                  className="text-gray-400 p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* 🌟 FIXED: Changed overflow-y-auto to a clean flex layout container to kill the nested scroll bug */}
            <div className="flex-1 min-h-0 flex flex-col mt-2">
              <SidebarContentComposition />
            </div>
          </div>
        </div>
      )}

      {/* 🖥️ DESKTOP COLUMN SECTION */}
      <div className="hidden xl:flex flex-col justify-between h-full w-[300px] min-w-[300px] max-w-[300px] bg-[#8196b2]/5 text-white border-l border-gray-800 p-5 shrink-0 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col gap-2">
          {/* 🌟 FIXED: Ensure the notification bar stays fixed and won't squish down */}
          <div className="shrink-0">
            <AdminNotificationPanel />
          </div>
          <SidebarContentComposition />
        </div>
      </div>
    </>
  );
};

export default RightSidebar;
