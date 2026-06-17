import React, { useContext } from 'react';
import { ChatContext } from '../../context/ChatContext';
import { AuthContext } from '../../context/AuthContext';

const AdminNotificationPanel = () => {
  const { groups = [], handleAdminAction } = useContext(ChatContext);
  const { authUser } = useContext(AuthContext);

  // Filter groups created by the current user that have active join requests
  const adminGroupsWithRequests = groups.filter(
    (group) => group.createdBy?.toString() === authUser._id?.toString() && group.requests?.length > 0
  );

  if (adminGroupsWithRequests.length === 0) return null;

  return (
    <div className="bg-[#212b42] border border-gray-600 rounded-xl p-4 m-4 text-white max-w-md shadow-lg animate-fade-in">
      <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-1.5">
        🔔 Admin Action Required
      </h3>
      <div className="flex flex-col gap-3 max-h-48 overflow-y-auto custom-scrollbar">
        {adminGroupsWithRequests.map((group) =>
          group.requests.map((applicant) => (
            <div key={`${group._id}-${applicant._id}`} className="flex items-center justify-between text-xs bg-[#2d323d]/40 p-2.5 rounded-lg border border-gray-700">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-white">{applicant.fullName}</span>
                <span className="text-[11px] text-gray-400">Wants to join <strong className="text-gray-300">{group.name}</strong></span>
              </div>
              <div className="flex gap-1.5">
                <button 
                  onClick={() => handleAdminAction(group._id, applicant._id, 'reject')}
                  className="px-2.5 py-1 rounded bg-gray-600 hover:bg-gray-500 transition-colors"
                >
                  Decline
                </button>
                <button 
                  onClick={() => handleAdminAction(group._id, applicant._id, 'accept')}
                  className="px-2.5 py-1 rounded bg-blue-500 hover:bg-blue-600 transition-colors text-white font-medium"
                >
                  Accept
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminNotificationPanel;