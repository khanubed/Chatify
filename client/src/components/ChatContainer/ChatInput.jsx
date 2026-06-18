import React, { useState, useRef, useContext, useEffect } from "react";
import { CornerUpLeft, X, Mic, Send, Play } from "lucide-react";
import { ChatContext } from "../../../context/ChatContext";
import toast from "react-hot-toast";
import assets from "../../assets/assets";

const ChatInput = () => {
  const {
    selectedGroup,
    selectedUser,
    replyToMessage,
    setReplyToMessage,
    sendMessage,
    sendTypingStatus,
  } = useContext(ChatContext);

  const isGroup = !!selectedGroup;

  const [localInput, setLocalInput] = useState("");
  const [selectedMediaFile, setSelectedMediaFile] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState(null);
  const [mediaType, setMediaType] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  // 🌟 NEW: Typing state engine references to manage local debouncing
  const localTypingRef = useRef(false);
  const typingTimeoutRef = useRef(null);

  // 🌟 NEW: Wipe remote indicators instantly if the user switches rooms abruptly
  useEffect(() => {
    if (localTypingRef.current) {
      sendTypingStatus(false);
      localTypingRef.current = false;
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setLocalInput("");
  }, [selectedUser?._id, selectedGroup?._id]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setLocalInput(value);

    // Trigger instant signal upon keypress if inactive
    if (!localTypingRef.current && value.trim().length > 0) {
      localTypingRef.current = true;
      sendTypingStatus(true);
    }

    // Standard ticker window resetting execution engine
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (localTypingRef.current) {
        localTypingRef.current = false;
        sendTypingStatus(false);
      }
    }, 1500);
  };

  const handleMediaSelect = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const isImage = file.type.startsWith("image/");

    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      toast.error("Please select a valid image or video file");

      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      setSelectedMediaFile(file);

      setMediaPreviewUrl(reader.result);

      setMediaType(isImage ? "image" : "video");
    };

    reader.readAsDataURL(file);
  };

  const handleCancelMedia = () => {
    setSelectedMediaFile(null);

    setMediaPreviewUrl(null);

    setMediaType(null);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      toast.error("Microphone permission denied or unavailable.");
    }
  };

  const stopRecording = (shouldSend = false) => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        streamTracksStop();

        if (shouldSend) {
          handleDispatchMessage(null, audioBlob);
        }
      };

      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => streamTracksStop();
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    clearInterval(timerRef.current);
    setRecordingTime(0);
  };

  const streamTracksStop = () => {
    mediaRecorderRef.current.stream
      .getTracks()
      .forEach((track) => track.stop());
  };

  const handleDispatchMessage = async (e, customAudioBlob = null) => {
    if (e) e.preventDefault();
    const cleanText = localInput.trim();

    if (!cleanText && !selectedMediaFile && !customAudioBlob) return;

    // 🌟 NEW: Force state termination upon message transmission
    if (localTypingRef.current) {
      localTypingRef.current = false;
      sendTypingStatus(false);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const formData = new FormData();
    formData.append("text", cleanText);
    formData.append("isGroup", isGroup);

    if (isGroup) formData.append("groupId", selectedGroup._id);
    if (replyToMessage) formData.append("parent", replyToMessage._id);

    if (customAudioBlob) {
      formData.append("file", customAudioBlob, "voice-message.webm");
    } else if (selectedMediaFile) {
      formData.append("file", selectedMediaFile);
    }

    setLocalInput("");
    handleCancelMedia();
    setReplyToMessage(null);

    await sendMessage(formData);
  };

  return (
    <div className="relative w-full flex flex-col bg-transparent shrink-0">
      {replyToMessage && (
        <div className="flex items-center justify-between p-2.5 bg-gray-900/90 border border-gray-700 backdrop-blur-md rounded-t-xl mx-3 animate-fade-in shadow-xl text-xs">
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <CornerUpLeft size={14} className="text-blue-400 shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-blue-400 block text-[11px]">
                Replying to{" "}
                {replyToMessage.senderId?.name ||
                  replyToMessage.senderId?.fullName ||
                  "User"}
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

      {mediaPreviewUrl && (
        <div className="flex items-center gap-3 p-3 bg-gray-900/80 border border-gray-700 backdrop-blur-md rounded-t-xl mx-3 animate-fade-in shadow-xl">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-600 shrink-0 bg-black flex items-center justify-center">
            {mediaType === "image" ? (
              <img
                src={mediaPreviewUrl}
                alt="Upload preview"
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="relative w-full h-full text-blue-400">
                <video
                  src={mediaPreviewUrl}
                  className="object-cover w-full h-full opacity-60"
                />
                <Play
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  size={20}
                  // Clean form helper update
                />
              </div>
            )}
            <button
              type="button"
              onClick={handleCancelMedia}
              className="absolute top-0.5 right-0.5 bg-black/80 hover:bg-black text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center transition-all"
            >
              <X size={10} />
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-blue-400 font-medium capitalize">
              {mediaType} payload staged
            </p>
            <p className="text-[11px] text-gray-400">
              Type down below to bind an optional caption text
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 p-3 bg-transparent">
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between bg-red-500/10 border border-red-500/30 px-4 py-2.5 rounded-full text-white text-sm transition-all animate-fade-in">
            <div className="flex items-center gap-2 animate-pulse">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="font-medium text-red-400">
                Recording ({recordingTime}s)
              </span>
            </div>
            <button
              onClick={cancelRecording}
              className="text-gray-400 hover:text-white p-1"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <div
            className={`flex-1 flex items-center bg-gray-800/40 px-3 rounded-full border border-gray-700 transition-all ${
              mediaPreviewUrl || replyToMessage
                ? "rounded-tl-none rounded-tr-none border-t-transparent bg-gray-900/40"
                : ""
            }`}
          >
            <input
              onChange={handleInputChange} // 🌟 UPDATED: Triggers debounce pipeline
              value={localInput}
              onKeyDown={(e) =>
                e.key === "Enter" ? handleDispatchMessage(e) : null
              }
              type="text"
              placeholder={
                mediaPreviewUrl ? "Add a caption..." : "Send a message..."
              }
              className="flex-1 text-sm p-3 bg-transparent border-none outline-none placeholder-gray-400 text-white"
            />
            <input
              ref={fileInputRef}
              onChange={handleMediaSelect}
              type="file"
              id="chat-media"
              accept="image/png, image/jpeg, video/mp4, video/webm"
              hidden
            />
            <label htmlFor="chat-media" className="shrink-0 p-1">
              <img
                src={assets.gallery_icon}
                alt="gallery"
                className="w-5 mr-1 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
              />
            </label>
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {localInput.trim() || mediaPreviewUrl ? (
            <img
              onClick={handleDispatchMessage}
              src={assets.send_button}
              alt="submit icon"
              className="w-10 h-10 cursor-pointer hover:scale-105 transition-transform"
            />
          ) : isRecording ? (
            <button
              onClick={() => stopRecording(true)}
              className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-lg"
            >
              <Send size={18} className="ml-0.5" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="w-10 h-10 flex items-center justify-center bg-gray-800/80 text-gray-400 rounded-full hover:text-blue-400 hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-700"
            >
              <Mic size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
