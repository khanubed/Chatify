import React, { useState, useRef, useContext } from "react";
// 🌟 Added 'Forward' to lucide-react imports
import {
  CornerUpLeft,
  Edit3,
  Trash2,
  Check,
  CheckCheck,
  Forward,
} from "lucide-react";
import assets from "../../../assets/assets";
import { formatMessageTime } from "../../../lib/utils";
import { ChatContext } from "../../../context/ChatContext";
import ReactionModal from "../ReactionModal";
import ForwardModal from "./ForwardModal"; // 🌟 Imported ForwardModal

// Media UI Engines
import { Plyr } from "plyr-react";
import "../../../node_modules/plyr-react/dist/plyr.css";
import VoiceNotePlayer from "../VoiceNotePlayer";
import CallLogMessage from "./CallLogMessage";

const EMOJI_OPTIONS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

const MessageBubble = ({
  msg,
  msgId,
  authUser,
  isGroup,
  selectedGroup,
  selectedUser,
  activeMobileMenuId,
  setActiveMobileMenuId,
  editingMessageId,
  setEditingMessageId,
  editInput,
  setEditInput,
  handleSaveEdit,
  setReplyToMessage,
  deleteMessage,
  setZoomedImage,
  setSeenModalList,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false); // 🌟 State to toggle Forward Modal
  const longPressTimer = useRef(null);
  const [reactionModalData, setReactionModalData] = useState(null);

  const isCallLog = msg.messageType === "call" && !msg.isDeleted;

  const isMyMessage =
    msg.senderId?._id === authUser._id || msg.senderId === authUser._id;
  const isMenuOpen = activeMobileMenuId === msgId;
  const isEditing = editingMessageId === msgId;

  const senderIdString = (msg.senderId?._id || msg.senderId)?.toString();
  const seenByStrings =
    msg.seenBy?.map((viewer) => (viewer._id || viewer)?.toString()) || [];
  const cleanViewerListStrings = seenByStrings.filter(
    (id) => id !== senderIdString,
  );
  const isMessageRead = cleanViewerListStrings.length > 0;

  const { handleMessageReaction } = useContext(ChatContext);

  const cleanViewerList =
    msg.seenBy?.filter((viewer) => {
      const viewerIdString = (viewer._id || viewer)?.toString();
      return viewerIdString !== senderIdString;
    }) || [];

  const reactionCounts =
    msg.reactions?.reduce((acc, current) => {
      if (current.emoji) acc[current.emoji] = (acc[current.emoji] || 0) + 1;
      return acc;
    }, {}) || {};

  const hasReactions = Object.keys(reactionCounts).length > 0;

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (msg.isDeleted) return;
    handleMessageReaction(msg._id, "❤️");
  };

  const startPressTimer = () => {
    if (msg.isDeleted) return;
    longPressTimer.current = setTimeout(() => setShowPicker(true), 450);
  };

  const clearPressTimer = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleScrollToParent = (parentId) => {
    if (!parentId) return;
    const targetElement = document.getElementById(`msg-${parentId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      const bubble = targetElement.querySelector(".bubble-body");
      if (bubble) {
        bubble.classList.add("ring-2", "ring-blue-400/50", "scale-[1.02]");
        setTimeout(
          () =>
            bubble.classList.remove(
              "ring-2",
              "ring-blue-400/50",
              "scale-[1.02]",
            ),
          1200,
        );
      }
    }
  };

  if (isCallLog) {
    return <CallLogMessage msg={msg} />;
  }

  return (
    <div
      id={`msg-${msg._id}`}
      className={`flex flex-col mb-4 max-w-[85%] group relative transition-all duration-300 ${
        isMyMessage ? "self-end items-end" : "self-start items-start"
      }`}
    >
      {/* Emoji Tray */}
      {showPicker && (
        <div
          className={`absolute z-30 -top-10 flex items-center gap-1.5 p-1.5 px-2 bg-gray-900 border border-gray-700/80 shadow-xl rounded-full animate-in fade-in zoom-in-95 duration-150 ${
            isMyMessage
              ? "right-2 origin-bottom-right"
              : "left-2 origin-bottom-left"
          }`}
          onMouseLeave={() => setShowPicker(false)}
        >
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={(e) => {
                e.stopPropagation();
                handleMessageReaction(msg._id, emoji);
                setShowPicker(false);
              }}
              className="text-base hover:scale-135 active:scale-90 transition-transform duration-100 p-0.5"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Parent Preview Bar */}
      {msg.parent && (
        <div
          onClick={() => handleScrollToParent(msg.parent._id)}
          className={`flex items-center gap-1.5 text-[11px] text-gray-400/80 bg-white/5 border border-white/10 p-1.5 px-2.5 rounded-t-xl max-w-xs truncate mb-[-4px] cursor-pointer hover:bg-white/10 hover:text-white transition-all active:scale-95 select-none ${
            isMyMessage ? "mr-4 rounded-bl-xl" : "ml-4 rounded-br-xl"
          }`}
        >
          <CornerUpLeft size={10} className="text-blue-400 shrink-0" />
          <span className="font-semibold text-blue-300">
            {msg.parent.senderId?.fullName ||
              msg.parent.senderId?.name ||
              "Member"}
            :
          </span>
          <span className="truncate">
            {msg.parent.text ||
              (msg.parent.audio
                ? "🎤 Voice Note"
                : msg.parent.video
                  ? "🎥 Video Message"
                  : msg.parent.image
                    ? "📷 Photo"
                    : "📎 Attachment")}
          </span>
        </div>
      )}

      <div
        className={`flex items-end gap-2 ${isMyMessage ? "flex-row" : "flex-row-reverse"}`}
      >
        {/* Action Options Context Menu */}
        {!msg.isDeleted && !isEditing && (
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-900/95 border border-gray-700 shadow-md transition-all md:absolute md:-top-7 md:opacity-0 md:group-hover:opacity-100 ${
              isMyMessage ? "md:right-10" : "md:left-10"
            } ${isMenuOpen ? "opacity-100 scale-100 flex" : "max-md:hidden"}`}
          >
            <button
              onClick={() => {
                setReplyToMessage(msg);
                setActiveMobileMenuId(null);
              }}
              className="text-gray-400 hover:text-green-400 p-0.5 transition-colors"
              title="Reply"
            >
              <CornerUpLeft size={14} />
            </button>

            {/* 🌟 NEW: Forward Action Button */}
            <button
              onClick={() => {
                setShowForwardModal(true);
                setActiveMobileMenuId(null);
              }}
              className="text-gray-400 hover:text-blue-400 p-0.5 transition-colors"
              title="Forward"
            >
              <Forward size={14} />
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
                  title="Edit"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => {
                    deleteMessage(msg._id);
                    setActiveMobileMenuId(null);
                  }}
                  className="text-gray-400 hover:text-red-400 p-0.5 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        )}

        {/* Main Interactive Chat Bubble */}
        <div
          onDoubleClick={handleDoubleClick}
          onMouseDown={startPressTimer}
          onMouseUp={clearPressTimer}
          onMouseLeave={clearPressTimer}
          onTouchStart={startPressTimer}
          onTouchEnd={clearPressTimer}
          onContextMenu={(e) => {
            e.preventDefault();
            setActiveMobileMenuId(msgId);
          }}
          className="flex flex-col cursor-pointer active:scale-[0.99] transition-transform select-none relative"
        >
          {isGroup && !isMyMessage && (
            <span className="text-[10px] text-gray-400 mb-1 ml-1 self-start">
              {msg.senderId?.fullName || msg.senderId?.name || "Group Member"}
            </span>
          )}

          <div
            className={`bubble-body flex flex-col rounded-xl overflow-hidden border transition-all duration-300 shadow-sm ${
              msg.isDeleted
                ? "border-white/5 bg-gray-900/20 opacity-60 italic"
                : isMenuOpen
                  ? "border-red-500/50 bg-red-950/20"
                  : "border-transparent"
            } ${isMyMessage ? "bg-blue-500/30 rounded-br-none" : "bg-gray-700/50 rounded-bl-none"}`}
          >
            {/* 🌟 NEW: Forwarded Indicator Flag */}
            {msg.isForwarded && !msg.isDeleted && (
              <div className="flex items-center gap-1 text-[9px] text-gray-400/70 italic px-3 pt-1.5 select-none">
                <Forward size={10} className="scale-x-[-1] text-gray-400/60" />
                <span>Forwarded</span>
              </div>
            )}

            {/* PREMIUM PHOTO VIEW */}
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

            {/* INSTAGRAM-STYLE PLYR VIDEO COMPONENT */}
            {msg.video && (
              <div
                className="overflow-hidden bg-black/40 min-w-[240px] max-w-[280px] md:max-w-[340px]"
                onClick={(e) => e.stopPropagation()}
              >
                <Plyr
                  source={{
                    type: "video",
                    sources: [{ src: msg.video }],
                  }}
                  options={{
                    controls: [
                      "play",
                      "progress",
                      "current-time",
                      "mute",
                      "fullscreen",
                    ],
                    ratio: "16:9",
                    fullscreen: { fallback: true, iosNative: true },
                  }}
                />
              </div>
            )}

            {/* WHATSAPP-STYLE AUDIO PLAYBACK ENGINE */}
            {msg.audio && (
              <VoiceNotePlayer src={msg.audio} isMyMessage={isMyMessage} />
            )}

            {/* Message Editing Field or Core Body Text Rendering */}
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
                  {!isGroup && !isMyMessage && (
                    <span className="text-[10px] text-gray-400 font-medium block mb-0.5">
                      {selectedUser?.fullName}
                    </span>
                  )}
                  <p>{msg.text}</p>
                  {msg.isEdited && !msg.isDeleted && (
                    <span className="text-[9px] text-gray-400/70 self-end mt-0.5">
                      (edited)
                    </span>
                  )}
                </div>
              )
            )}
          </div>

          {/* Reaction Pill Counters */}
          {hasReactions && !msg.isDeleted && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setReactionModalData(msg);
              }}
              className={`absolute -bottom-2.5 flex items-center gap-1 bg-[#1e2538] border border-gray-700 px-1.5 py-0.5 rounded-full shadow-md text-[10px] text-gray-300 hover:scale-105 active:scale-95 transition-all select-none z-10 ${
                isMyMessage ? "left-3" : "right-3"
              }`}
            >
              <div className="flex items-center">
                {Object.keys(reactionCounts).map((emoji) => (
                  <span key={emoji}>{emoji}</span>
                ))}
              </div>
              {msg.reactions.length > 1 && (
                <span className="font-semibold pl-0.5 border-l border-gray-700 ml-0.5">
                  {msg.reactions.length}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Avatar & Timestamps Layer */}
        <div className="text-center text-[9px] flex flex-col items-center min-w-7 shrink-0">
          <img
            src={
              isMyMessage
                ? authUser?.profilePic || assets.avatar_icon
                : msg.senderId?.profilePic || assets.avatar_icon
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

      {/* Group Seen Confirmation Row */}
      {isMyMessage && isGroup && isMessageRead && !msg.isDeleted && (
        <div
          className="text-[10px] text-blue-400/80 mr-8 mt-1 cursor-pointer hover:underline select-none transition-all"
          onClick={() => setSeenModalList(cleanViewerList)}
        >
          Seen by {cleanViewerListStrings.length} members
        </div>
      )}

      {/* Full Details Modal Portal sheet */}
      {reactionModalData && (
        <ReactionModal
          msg={reactionModalData}
          onClose={() => setReactionModalData(null)}
          members={isGroup ? selectedGroup?.members : [selectedUser, authUser]}
        />
      )}

      {/* 🌟 NEW: Forward Picker Modal Integration */}
      {showForwardModal && (
        <ForwardModal
          msg={msg}
          authUser={authUser}
          onClose={() => setShowForwardModal(false)}
        />
      )}
    </div>
  );
};

export default MessageBubble;
