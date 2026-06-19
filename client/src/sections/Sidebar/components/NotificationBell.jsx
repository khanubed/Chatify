import React, { useContext, useState, useEffect, useRef } from "react";
import { ChatContext } from "../../../context/ChatContext";
import { AuthContext } from "../../../context/AuthContext";

const NotificationBell = () => {
  const { groups = [], handleAdminAction } = useContext(ChatContext);
  const { authUser } = useContext(AuthContext);

  const [isOpen, setIsOpen] = useState(false);

  const bellRef = useRef(null);

  const adminGroupsWithRequests = groups.filter(
    (group) =>
      group.createdBy?._id?.toString() === authUser?._id?.toString() &&
      group.requests?.length > 0,
  );

  const hasPendingRequests = adminGroupsWithRequests.length > 0;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={bellRef} className="relative py-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-gray-400 hover:text-blue-400 transition-colors text-base flex items-center justify-center"
      >
        <span className="text-lg">🔔</span>
        {hasPendingRequests && (
          <span className="absolute top-1 right-0 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        )}
      </button>

      <div
        className={`absolute top-full -right-10 z-50 overflow-x-clip w-72 rounded-md bg-[#212b42] p-4 border border-gray-600 text-gray-100 shadow-xl max-h-64 overflow-y-auto custom-scrollbar transition-all ${
          isOpen ? "block" : "hidden"
        }`}
      >
        <h3 className="text-xs font-semibold text-blue-400 mb-2">
          Join Requests
        </h3>
        {hasPendingRequests ? (
          <div className="flex flex-col gap-2">
            {adminGroupsWithRequests.map((group) =>
              (group.requests || []).map((applicant) => {
                if (!applicant) return null;
                return (
                  <div
                    key={`req-${group._id}-${applicant._id}-${group.requests.length}`}
                    className="flex flex-col gap-2 bg-[#2d323d]/40 p-2 rounded border border-gray-700 text-[11px]"
                  >
                    <div>
                      <span className="font-bold text-white block">
                        {applicant.fullName}
                      </span>
                      <span className="text-gray-400">
                        Wants to join <strong>{group.name}</strong>
                      </span>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          handleAdminAction(group._id, applicant._id, "reject");
                          if (
                            adminGroupsWithRequests.length === 1 &&
                            group.requests.length === 1
                          )
                            setIsOpen(false);
                        }}
                        className="px-2 py-0.5 rounded bg-gray-600 hover:bg-gray-500 transition-colors text-gray-200"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => {
                          handleAdminAction(group._id, applicant._id, "accept");
                          if (
                            adminGroupsWithRequests.length === 1 &&
                            group.requests.length === 1
                          )
                            setIsOpen(false);
                        }}
                        className="px-2 py-0.5 rounded bg-blue-500 hover:bg-blue-600 transition-colors text-white font-medium"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                );
              }),
            )}
          </div>
        ) : (
          <p className="text-[11px] text-gray-500 text-center py-2">
            No pending requests
          </p>
        )}
      </div>
    </div>
  );
};

export default NotificationBell;
