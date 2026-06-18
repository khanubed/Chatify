import React, { useContext, useEffect, useRef, useState } from "react";
import { CallContext } from "../../../context/CallContext";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react";
import assets from "../../assets/assets";

const CallInterface = () => {
  const {
    callState,
    callType,
    partnerDetails,
    isMuted,
    isCamOff,
    localStream,
    remoteStream,
    acceptIncomingCall,
    dropCall,
    toggleMute,
    toggleCamera,
  } = useContext(CallContext);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // 🌟 NEW: Track call duration in seconds
  const [callDuration, setCallDuration] = useState(0);

  // 🌟 NEW: Real-time ticker effect that activates precisely when the call connects
  useEffect(() => {
    let ticker = null;

    if (callState === "ON_CALL") {
      setCallDuration(0); // Reset timer on a fresh connection
      ticker = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0); // Flush time data when idle/ringing/dialing
    }

    return () => {
      if (ticker) clearInterval(ticker);
    };
  }, [callState]);

  // Attach tracks to HTML Video instances when stream updates occur
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  // 🌟 NEW: Helper utility to format raw seconds into classic MM:SS presentation
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (callState === "IDLE") return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center text-white backdrop-blur-xl animate-in fade-in duration-200">
      {/* 1. Ringing & Dialing Banner Layout States */}
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

      {/* 2. On-Call Streaming Grid Canvas Canvas View Block Layer */}
      {callState === "ON_CALL" && (
        <div className="relative w-full h-full flex flex-col justify-between p-6">
          {callType === "video" ? (
            <div className="absolute inset-0 w-full h-full bg-black overflow-hidden rounded-lg">
              {/* Full-Screen Remote Incoming Video track component */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* 🌟 NEW: Floating overlay call timer container for Video streams */}
              <div className="absolute top-6 left-6 bg-slate-900/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono tracking-wider tabular-nums text-emerald-400 z-10 shadow-lg">
                {formatTime(callDuration)}
              </div>

              {/* Floating Pip Panel showcasing local camera transmission logic */}
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
            </div>
          ) : (
            // Voice Call Mode Avatar Framework Indicator
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <img
                src={partnerDetails?.profilePic || assets.avatar_icon}
                alt="Partner profile"
                className="w-28 h-28 rounded-full object-cover ring-4 ring-green-500/40"
              />
              <span className="text-xl font-medium">
                {partnerDetails?.fullName}
              </span>

              {/* 🌟 FIXED: Time counter tracking dynamically using tabular digits to block shifting */}
              <span className="text-emerald-400 text-sm font-mono tracking-widest tabular-nums bg-emerald-500/10 px-4 py-1 rounded-full border border-emerald-500/20 shadow-inner">
                {formatTime(callDuration)} Connected
              </span>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Absolute Position Action Interface Toolbar */}
      <div className="absolute bottom-12 flex items-center gap-5 bg-slate-900/80 border border-white/10 px-6 py-3.5 rounded-full shadow-2xl backdrop-blur-md z-20">
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

        {/* Call Answer Integration Trigger (Only shown on Incoming Alert states) */}
        {callState === "RINGING" && (
          <button
            onClick={acceptIncomingCall}
            className="p-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-all active:scale-95 shadow-xl shadow-emerald-500/20 animate-bounce"
            title="Accept Call"
          >
            <Phone size={22} />
          </button>
        )}

        {/* Global End Call Execution Point Trigger */}
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

export default CallInterface;
