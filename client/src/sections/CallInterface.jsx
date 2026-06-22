import React, { useContext, useEffect, useRef, useState } from "react";
import { CallContext } from "../context/CallContext";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react";
import assets from "../assets/assets";

const CallInterface = () => {
  const {
    callState,
    callType,
    partnerDetails,
    isGroupCall,
    isMuted,
    isCamOff,
    localStream,
    remoteStream,
    remoteStreams,
    acceptIncomingCall,
    dropCall,
    toggleMute,
    toggleCamera,
  } = useContext(CallContext);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [callDuration, setCallDuration] = useState(0);

  // Real-time ticker effect activation on call active links
  useEffect(() => {
    let ticker = null;
    if (callState === "ON_CALL") {
      setCallDuration(0);
      ticker = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }

    return () => {
      if (ticker) clearInterval(ticker);
    };
  }, [callState]);

  // Attach local track stream objects
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  // Attach legacy 1-to-1 track stream objects
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && !isGroupCall) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState, isGroupCall]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (callState === "IDLE") return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center text-white backdrop-blur-xl animate-in fade-in duration-200">
      {/* 1. Ringing & Dialing Layout States */}
      {(callState === "DIALING" || callState === "RINGING") && (
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <img
            src={partnerDetails?.profilePic || assets.avatar_icon}
            alt="User profile"
            className="w-32 h-32 rounded-full object-cover border-4 border-blue-500/30 shadow-2xl"
          />
          <h2 className="text-2xl font-semibold tracking-wide">
            {partnerDetails?.fullName || partnerDetails?.name || "User"}
          </h2>
          <p className="text-gray-400 text-sm tracking-wider uppercase font-light">
            {callState === "DIALING"
              ? "Dialing outbound line..."
              : `Incoming ${callType} request...`}
          </p>
        </div>
      )}

      {/* 2. On-Call Streaming Grid Canvas */}
      {callState === "ON_CALL" && (
        <div className="relative w-full h-full flex flex-col justify-between p-6">
          {/* Global Header Metadata Badge */}
          <div className="absolute top-6 left-6 bg-slate-900/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono tracking-wider tabular-nums text-emerald-400 z-30 shadow-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {formatTime(callDuration)} {isGroupCall ? `| Group Call` : ""}
          </div>

          {isGroupCall ? (
            // ==========================================
            // MULTI-PEER STREAM GRID PANEL
            // ==========================================
            <div className="w-full h-full pt-12 pb-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center justify-center overflow-y-auto">
              {/* Local Stream Canvas Box */}
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-xl bg-slate-900 flex items-center justify-center">
                {callType === "video" && !isCamOff ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    {/* Invisible local audio node to bind stream internally if needed */}
                    <audio ref={localVideoRef} muted autoPlay playsInline />
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold border border-white/5">
                      You
                    </div>
                  </div>
                )}
                <span className="absolute bottom-3 left-3 bg-black/60 px-2.5 py-1 text-xs rounded-md backdrop-blur-sm">
                  You
                </span>
              </div>

              {/* Dynamic Remote Participants Mapping */}
              {Object.entries(remoteStreams).map(
                ([socketId, connectionPayload]) => (
                  <GroupVideoPlayer
                    key={socketId}
                    stream={connectionPayload.stream}
                    profile={connectionPayload.profile}
                    callType={callType}
                  />
                ),
              )}
            </div>
          ) : (
            // ==========================================
            // LEGACY 1-to-1 STREAMING VIEW
            // ==========================================
            <div className="absolute inset-0 w-full h-full bg-black overflow-hidden rounded-lg">
              {callType === "video" ? (
                <>
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!isCamOff && (
                    <div className="absolute top-6 right-6 w-32 md:w-48 aspect-[9/16] rounded-xl overflow-hidden border border-white/20 shadow-xl bg-slate-900 z-10">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 w-full h-full flex flex-col items-center justify-center gap-4">
                  {/* ✨ FIX: Keeps ref alive to feed audio tracks to user speakers */}
                  <audio ref={remoteVideoRef} autoPlay playsInline />

                  <img
                    src={partnerDetails?.profilePic || assets.avatar_icon}
                    alt="Partner profile"
                    className="w-28 h-28 rounded-full object-cover ring-4 ring-green-500/40"
                  />
                  <span className="text-xl font-medium">
                    {partnerDetails?.fullName || partnerDetails?.name}
                  </span>
                  <span className="text-emerald-400 text-sm font-mono tracking-widest tabular-nums bg-emerald-500/10 px-4 py-1 rounded-full border border-emerald-500/20 shadow-inner">
                    Connected
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Control Toolbar Panel */}
      <div className="absolute bottom-12 flex items-center gap-5 bg-slate-900/80 border border-white/10 px-6 py-3.5 rounded-full shadow-2xl backdrop-blur-md z-40">
        {callState === "ON_CALL" && (
          <>
            <button
              onClick={toggleMute}
              className={`p-3.5 rounded-full transition-all active:scale-90 ${
                isMuted
                  ? "bg-red-500 text-white"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {callType === "video" && (
              <button
                onClick={toggleCamera}
                className={`p-3.5 rounded-full transition-all active:scale-90 ${
                  isCamOff
                    ? "bg-red-500 text-white"
                    : "bg-white/10 text-gray-300 hover:bg-white/20"
                }`}
              >
                {isCamOff ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
            )}
          </>
        )}

        {callState === "RINGING" && (
          <button
            onClick={acceptIncomingCall}
            className="p-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-all active:scale-95 shadow-xl shadow-emerald-500/20 animate-bounce"
            title="Accept Call"
          >
            <Phone size={22} />
          </button>
        )}

        <button
          onClick={dropCall}
          className="p-4 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-all active:scale-95 shadow-xl shadow-rose-500/20"
          title="End Call"
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
};

// 🌟 Isolated Sub-Component for Clean, Safe Stream Tracking
const GroupVideoPlayer = ({ stream, profile, callType }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-xl bg-slate-900 flex items-center justify-center">
      {callType === "video" ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          {/* ✨ FIX: Allows group audio-only streams to play output voice */}
          <audio ref={videoRef} autoPlay playsInline />

          <img
            src={profile?.profilePic || assets.avatar_icon}
            alt=""
            className="w-14 h-14 rounded-full border border-white/10 shadow"
          />
        </div>
      )}
      <span className="absolute bottom-3 left-3 bg-black/60 px-2.5 py-1 text-xs rounded-md backdrop-blur-sm">
        {profile?.fullName || "Participant"}
      </span>
    </div>
  );
};

export default CallInterface;
