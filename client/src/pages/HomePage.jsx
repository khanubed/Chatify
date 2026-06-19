import React, { useContext } from "react";
import Sidebar from "../sections/Sidebar/Sidebar";
import ChatContainer from "../sections/ChatContainer/ChatContainer";
import RightSidebar from "../sections/RightSidebar";
import { ChatContext } from "../context/ChatContext";
import CallInterface from "../sections/CallInterface";

const HomePage = () => {
  const { selectedUser, selectedGroup } = useContext(ChatContext);
  const isAnyChatActive = !!(selectedUser || selectedGroup);

  return (
    <div className="w-full h-screen max-h-screen overflow-hidden sm:p-[3vh_8vw] bg-[#0c1322]/40 flex flex-col justify-center">
      <div className="backdrop-blur-xl border border-gray-700 sm:border-3 sm:border-gray-400 sm:rounded-2xl overflow-hidden h-full w-full flex relative">
        <div
          className={`h-full shrink-0 border-r border-gray-800 transition-all duration-300 ${
            isAnyChatActive
              ? "hidden md:block md:w-[300px] xl:w-[320px]"
              : "w-full md:w-[300px] xl:w-[320px]"
          }`}
        >
          <Sidebar />
        </div>

        <div
          className={`h-full flex-1 min-w-0 transition-all duration-300 ${
            isAnyChatActive ? "block" : "hidden md:block"
          }`}
        >
          <ChatContainer />
        </div>

        <RightSidebar />
        <CallInterface />
      </div>
    </div>
  );
};

export default HomePage;
