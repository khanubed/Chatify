import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import assets from "../assets/assets";
import { formatMessageTime } from "../lib/utils";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";
import toast from "react-hot-toast";
import {
  X,
  Trash2,
  Edit3,
  Check,
  CheckCheck,
  CornerUpLeft,
} from "lucide-react";

const ChatContainer = () => {
  const { authUser, onlineUsers, socket } = useContext(AuthContext);
  const {
    messages,
    selectedUser,
    setSelectedUser,
    selectedGroup,
    setSelectedGroup,
    sendMessage,
    getMessages,
    deleteMessage,
    editMessage,
    markAsSeen,
    showInfoDrawer,
    setShowInfoDrawer,
    replyToMessage,
    setReplyToMessage,
  } = useContext(ChatContext);

  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [activeMobileMenuId, setActiveMobileMenuId] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editInput, setEditInput] = useState("");
  const [seenModalList, setSeenModalList] = useState(null);

  const scrollEnd = useRef(null);
  const fileInputRef = useRef(null);
  const longPressTimerRef = useRef(null);

  const currentChat = selectedUser || selectedGroup;
  const isGroup = !!selectedGroup;

  useEffect(() => {
    const targetRoomId = selectedUser?._id || selectedGroup?._id;
    if (!targetRoomId || !socket) return;

    const fetchChatHistory = async () => {
      try {
        if (selectedUser?._id) {
          socket.emit("joinChat", selectedUser._id);
          await getMessages(selectedUser._id, false);
          await markAsSeen(selectedUser._id, false);
        } else if (selectedGroup?._id) {
          socket.emit("joinGroup", selectedGroup._id);
          await getMessages(selectedGroup._id, true);
          await markAsSeen(selectedGroup._id, true);
        }
      } catch (error) {
        console.error("Failed to load chat history cleanly:", error);
      }
    };

    fetchChatHistory();
    handleCancelImage();
    setInput("");
    setReplyToMessage(null);
    setActiveMobileMenuId(null);
    setZoomedImage(null);
    setEditingMessageId(null);
    setShowInfoDrawer(false);
  }, [
    selectedUser?._id,
    selectedGroup?._id,
    socket,
    markAsSeen,
    setReplyToMessage,
  ]);

  useEffect(() => {
    if (scrollEnd.current && messages.length > 0) {
      scrollEnd.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const handleCancelImage = useCallback(() => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleDispatchMessage = async (e) => {
    if (e) e.preventDefault();
    const cleanText = input.trim();
    if (!cleanText && !imagePreview) return;

    setInput("");
    handleCancelImage();

    await sendMessage({
      text: cleanText,
      image: imagePreview,
      isGroup,
      groupId: isGroup ? selectedGroup._id : null,
      parent: replyToMessage ? replyToMessage._id : null,
    });
  };

  const handleSaveEdit = async (msgId) => {
    if (!editInput.trim()) return;
    await editMessage(msgId, editInput.trim());
    setEditingMessageId(null);
    setEditInput("");
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleTouchStart = (msgId, isMyMsg) => {
    if (!isMyMsg) return;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      setActiveMobileMenuId(msgId);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  const handleCloseChat = () => {
    setSelectedUser(null);
    setSelectedGroup(null);
    setShowInfoDrawer(false);
  };

  return (
    <>
      {currentChat ? (
        <div className="h-full overflow-hidden relative backdrop-blur-lg flex flex-col justify-between text-white w-full flex-1">
          {/* ------- Header ------- */}
          <div className="flex items-center gap-3 mx-4 border-b border-stone-500 py-2 shrink-0 px-2 rounded-lg transition-colors">
            {isGroup ? (
              <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center text-blue-300 font-bold uppercase text-xs">
                {selectedGroup.name.slice(0, 2)}
              </div>
            ) : (
              <img
                src={selectedUser.profilePic || assets.avatar_icon}
                alt=""
                className="w-8 aspect-square rounded-full object-cover"
              />
            )}

            <div className="flex-1 text-lg flex flex-col md:flex-row md:items-center gap-0 md:gap-2 font-medium">
              <div className="flex items-center gap-2">
                {isGroup ? selectedGroup.name : selectedUser.fullName}
                {!isGroup && onlineUsers.includes(selectedUser._id) && (
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowInfoDrawer(true)}
              className="xl:hidden text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
              title="View details"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </button>

            <img
              onClick={(e) => {
                e.stopPropagation();
                handleCloseChat();
                setShowInfoDrawer(false);
              }}
              src={assets.arrow_icon}
              className="md:hidden max-w-7 cursor-pointer p-1 hover:bg-white/10 rounded-full transition-transform"
              alt="back"
            />
          </div>

          {/* ------- Main Interactive Chat Message Arena -------- */}
          <div className="flex-1 overflow-y-auto p-3 pb-2 flex flex-col custom-scrollbar gap-1">
            {messages.map((msg, index) => {
              const isMyMessage =
                msg.senderId?._id === authUser._id ||
                msg.senderId === authUser._id;
              const msgId = msg._id || index;
              const isMenuOpen = activeMobileMenuId === msgId;
              const isEditing = editingMessageId === msgId;

              // 🌟 SAFELY ISOLATE THE SENDER'S REAL ID STRING
              const senderIdString = (
                msg.senderId?._id || msg.senderId
              )?.toString();

              // 🌟 NORMALIZE THE ENTIRE SEENBY ARRAY TO STRING IDs TO PREVENT MISMATCHES
              const seenByStrings =
                msg.seenBy?.map((viewer) =>
                  (viewer._id || viewer)?.toString(),
                ) || [];

              // 🌟 STRIP OUT THE SENDER FROM THE UNREAD/READ COUNT
              const cleanViewerListStrings = seenByStrings.filter(
                (id) => id !== senderIdString,
              );
              const isMessageRead = cleanViewerListStrings.length > 0;

              // 🌟 BUILD A CLEAN OBJECT/STRING LIST FOR THE MODAL VISUALIZER
              const cleanViewerList =
                msg.seenBy?.filter((viewer) => {
                  const viewerIdString = (viewer._id || viewer)?.toString();
                  return viewerIdString !== senderIdString;
                }) || [];

              return (
                <div
                  key={msgId}
                  className={`flex flex-col mb-3 max-w-[85%] group relative ${
                    isMyMessage
                      ? "self-end items-end"
                      : "self-start items-start"
                  }`}
                >
                  {/* 🌟 THREADED PARENT VIEW CONTAINER */}
                  {msg.parent && (
                    <div
                      className={`flex items-center gap-1.5 text-[11px] text-gray-400/80 bg-white/5 border border-white/10 p-1.5 px-2.5 rounded-t-xl max-w-xs truncate mb-[-4px] ${
                        isMyMessage
                          ? "mr-4 rounded-bl-xl"
                          : "ml-4 rounded-br-xl"
                      }`}
                    >
                      <CornerUpLeft
                        size={10}
                        className="text-blue-400 shrink-0"
                      />
                      <span className="font-semibold text-blue-300">
                        {/* 🌟 FIXED: Checks for fullName first to stay aligned with the backend schema */}
                        {msg.parent.senderId?.fullName ||
                          msg.parent.senderId?.name ||
                          "Member"}
                        :
                      </span>
                      <span className="truncate">
                        {msg.parent.text || "📷 Media attachment"}
                      </span>
                    </div>
                  )}

                  <div
                    className={`flex items-end gap-2 ${isMyMessage ? "flex-row" : "flex-row-reverse"}`}
                  >
                    {/* Interactive Action Menu (Edit/Delete/Reply Options) */}
                    {!msg.isDeleted && !isEditing && (
                      <div
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-900/95 border border-gray-700 shadow-md transition-all md:absolute md:-top-7 md:opacity-0 md:group-hover:opacity-100 ${
                          isMyMessage ? "md:right-10" : "md:left-10"
                        } ${isMenuOpen ? "opacity-100 scale-100 flex" : "max-md:hidden"}`}
                      >
                        {/* 🌟 ACTION MENU: REPLY ICON BUTTON */}
                        <button
                          onClick={() => {
                            setReplyToMessage(msg);
                            setActiveMobileMenuId(null);
                          }}
                          className="text-gray-400 hover:text-green-400 p-0.5 transition-colors"
                          title="Reply to message"
                        >
                          <CornerUpLeft size={14} />
                        </button>

                        {isMyMessage && (
                          <>
                            <button
                              onClick={() => {
                                setEditingMessageId(msgId);
                                setEditInput(msg.text);
                                setActiveMobileMenuId(null);
                              }}
                              className="text-gray-400 hover:text-blue-400 p-0.5 transition-colors"
                              title="Edit Message"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                deleteMessage(msg._id);
                                setActiveMobileMenuId(null);
                              }}
                              className="text-gray-400 hover:text-red-400 p-0.5 transition-colors"
                              title="Delete Message"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Chat Bubble Layout Container */}
                    <div
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setActiveMobileMenuId(msgId);
                      }}
                      className="flex flex-col cursor-pointer active:scale-[0.99] transition-transform select-none"
                    >
                      {/* 🌟 FIXED: Always show sender name if it's a group message and NOT sent by me */}
                      {isGroup && !isMyMessage && (
                        <span className="text-[10px] text-gray-400 mb-1 ml-1 self-start">
                          {/* 🌟 Covers all possible backend field configurations */}
                          {msg.senderId?.fullName ||
                            msg.senderId?.name ||
                            selectedGroup?.members?.find(
                              (m) => (m._id || m) === senderIdString,
                            )?.fullName ||
                            "Group Member"}
                        </span>
                      )}

                      <div
                        className={`flex flex-col rounded-xl overflow-hidden border transition-all duration-150 shadow-sm ${
                          msg.isDeleted
                            ? "border-white/5 bg-gray-900/20 opacity-60 italic"
                            : isMenuOpen
                              ? "border-red-500/50 bg-red-950/20"
                              : "border-transparent"
                        } ${isMyMessage ? "bg-blue-500/30 rounded-br-none" : "bg-gray-700/50 rounded-bl-none"}`}
                      >
                        {/* Image attachment rendering stays here... */}
                        {msg.image && (
                          <img
                            src={msg.image}
                            alt="Attached asset"
                            loading="lazy"
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomedImage(msg.image);
                            }}
                            className="max-w-[240px] max-h-[300px] object-cover cursor-zoom-in hover:brightness-95 transition-all"
                          />
                        )}

                        {isEditing ? (
                          <div className="p-2 flex flex-col gap-1.5 min-w-[220px]">
                            <textarea
                              value={editInput}
                              onChange={(e) => setEditInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSaveEdit(msg._id);
                                }
                              }}
                              className="w-full text-xs p-1.5 bg-black/40 border border-gray-600 rounded outline-none text-white resize-none custom-scrollbar"
                              rows={2}
                              autoFocus
                            />
                            <div className="flex justify-end gap-1 text-[10px]">
                              <button
                                onClick={() => setEditingMessageId(null)}
                                className="px-2 py-0.5 bg-gray-600 rounded hover:bg-gray-500"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveEdit(msg._id)}
                                className="px-2 py-0.5 bg-blue-500 rounded hover:bg-blue-400"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          msg.text && (
                            <div className="max-w-xs text-xs md:text-sm font-light px-3 py-2 break-words whitespace-pre-wrap flex flex-col gap-0.5">
                              {/* 🌟 OPTIONAL ADDITION: Displaying who sent it inside one-on-one chats if helpful */}
                              {!isGroup && !isMyMessage && (
                                <span className="text-[10px] text-gray-400 font-medium block mb-0.5">
                                  {selectedUser.fullName}
                                </span>
                              )}
                              <p>{msg.text}</p>
                              {msg.isEdited && !msg.isDeleted && (
                                <span className="text-[9px] text-gray-400/70 self-end select-none mt-0.5">
                                  (edited)
                                </span>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                    {/* Profile Picture & Time Layer */}
                    <div className="text-center text-[9px] flex flex-col items-center min-w-7 shrink-0">
                      <img
                        src={
                          isMyMessage
                            ? authUser?.profilePic || assets.avatar_icon
                            : msg.senderId?.profilePic ||
                              msg.senderId?.avatar ||
                              assets.avatar_icon // 🌟 FIXED: Prefers profilePic over avatar
                        }
                        alt=""
                        className="w-6 h-6 rounded-full object-cover border border-white/5"
                      />
                      <div className="flex items-center gap-0.5 mt-0.5 text-gray-500">
                        <span>{formatMessageTime(msg.createdAt)}</span>
                        {isMyMessage && !msg.isDeleted && (
                          <span className="ml-0.5 shrink-0">
                            {isMessageRead ? (
                              <CheckCheck size={11} className="text-blue-400" />
                            ) : (
                              <Check size={11} className="text-gray-500" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 🌟 INTERACTIVE READ STATUS LABEL */}
                  {/* 🌟 UPDATED INTERACTIVE READ STATUS LABEL */}
                  {isMyMessage && isMessageRead && !msg.isDeleted && (
                    <div
                      className="text-[10px] text-blue-400/80 mr-8 mt-0.5 cursor-pointer hover:underline select-none transition-all"
                      onClick={() => {
                        // 🌟 Hydrate raw string IDs with baseline parameters if they arrived via live sockets
                        const hydratedList = cleanViewerList.map((viewer) => {
                          if (typeof viewer === "string") {
                            return {
                              _id: viewer,
                              fullName: "Group Member",
                              profilePic: assets.avatar_icon,
                              username: "member",
                            };
                          }
                          return viewer;
                        });
                        setSeenModalList(hydratedList);
                      }}
                    >
                      Seen by {cleanViewerListStrings.length}{" "}
                      {isGroup ? "members" : ""}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={scrollEnd} className="h-2 shrink-0"></div>
          </div>

          {/* -------- Bottom Media & Caption Controller Input Panel -------- */}
          <div className="relative w-full flex flex-col bg-transparent shrink-0">
            {/* 🌟 LIVE REPLY ACTIVE STATUS CONTEXT PREVIEW BAR */}
            {replyToMessage && (
              <div className="flex items-center justify-between p-2.5 bg-gray-900/90 border border-gray-700 backdrop-blur-md rounded-t-xl mx-3 animate-fade-in shadow-xl text-xs">
                <div className="flex items-center gap-2 overflow-hidden truncate">
                  <CornerUpLeft size={14} className="text-blue-400 shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold text-blue-400 block text-[11px]">
                      Replying to {replyToMessage.senderId?.name || "User"}
                    </span>
                    <span className="text-gray-400 text-xs truncate block">
                      {replyToMessage.text || "📷 Media attachment file"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyToMessage(null)}
                  className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {imagePreview && (
              <div className="flex items-center gap-3 p-3 bg-gray-900/80 border border-gray-700 backdrop-blur-md rounded-t-xl mx-3 animate-fade-in shadow-xl">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-600 shrink-0">
                  <img
                    src={imagePreview}
                    alt="Upload preview"
                    className="object-cover w-full h-full"
                  />
                  <button
                    type="button"
                    onClick={handleCancelImage}
                    className="absolute top-0.5 right-0.5 bg-black/80 hover:bg-black text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center transition-all"
                  >
                    <X size={10} />
                  </button>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs text-blue-400 font-medium">
                    Image payload staged
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Type down below to bind an optional caption text
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-transparent">
              <div
                className={`flex-1 flex items-center bg-gray-800/40 px-3 rounded-full border border-gray-700 transition-all ${
                  imagePreview || replyToMessage
                    ? "rounded-tl-none rounded-tr-none border-t-transparent bg-gray-900/40"
                    : ""
                }`}
              >
                <input
                  onChange={handleInputChange}
                  value={input}
                  onKeyDown={(e) =>
                    e.key === "Enter" ? handleDispatchMessage(e) : null
                  }
                  type="text"
                  placeholder={
                    imagePreview
                      ? "Add a caption to this image..."
                      : "Send a message..."
                  }
                  className="flex-1 text-sm p-3 bg-transparent border-none outline-none placeholder-gray-400 text-white"
                />
                <input
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  type="file"
                  id="chat-image"
                  accept="image/png, image/jpeg"
                  hidden
                />
                <label htmlFor="chat-image" className="shrink-0">
                  <img
                    src={assets.gallery_icon}
                    alt="gallery handle"
                    className="w-5 mr-2 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                  />
                </label>
              </div>
              <img
                onClick={handleDispatchMessage}
                src={assets.send_button}
                alt="submit icon"
                className="w-10 h-10 cursor-pointer hover:scale-105 transition-transform shrink-0"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/5 h-full w-full">
          <img src={assets.logo_icon} alt="" className="max-w-16 opacity-40" />
          <p className="text-sm md:text-base font-medium text-gray-400">
            Chatify — Connect. Converse. Collaborate
          </p>
        </div>
      )}

      {/* Expanded Image View Display Node Layer */}
      {zoomedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm select-none animate-fade-in">
          <div
            className="absolute inset-0 cursor-zoom-out"
            onClick={() => setZoomedImage(null)}
          />
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-6 right-6 p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 text-white transition-all cursor-pointer shadow-lg z-20"
          >
            <X size={24} />
          </button>
          <img
            src={zoomedImage}
            alt="Expanded visual preview"
            className="fixed z-10 w-[85vw] h-[80vh] object-contain pointer-events-none rounded-md shadow-2xl animate-scale-up"
          />
        </div>
      )}

      {seenModalList && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSeenModalList(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 text-white w-full max-w-sm rounded-xl p-5 shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-700 pb-3 mb-4">
              <h3 className="font-semibold text-base text-gray-200">
                Message Seen By
              </h3>
              <button
                onClick={() => setSeenModalList(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-3 custom-scrollbar pr-1">
              {seenModalList.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  No receipts documented yet
                </p>
              ) : (
                seenModalList.map((viewer, index) => {
                  // 🌟 Fallback check: handles raw string IDs from real-time socket fallbacks cleanly
                  const isStringId = typeof viewer === "string";

                  // 🌟 Schema Sync: Adjusted to use strictly 'fullName' and 'profilePic' from your User Model
                  const displayName = isStringId
                    ? "Group Member"
                    : viewer.fullName || "Group Member";
                  const profileAvatar = isStringId
                    ? assets.avatar_icon
                    : viewer.profilePic || assets.avatar_icon;
                  const uniqueKey = isStringId ? viewer : viewer._id || index;

                  return (
                    <div
                      key={uniqueKey}
                      className="flex items-center gap-3 p-1 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <img
                        src={profileAvatar}
                        alt={displayName}
                        className="w-8 h-8 rounded-full object-cover border border-gray-700"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-gray-200">
                          {displayName}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {isStringId ? "Just now" : "Seen"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatContainer;
