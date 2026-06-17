import React, { createContext, useState, useEffect, useRef, useContext } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const CallContext = createContext();

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export const CallProvider = ({ children }) => {
  const { authUser, socket } = useContext(AuthContext);

  const [callState, setCallState] = useState("IDLE"); // IDLE, DIALING, RINGING, ON_CALL
  const [callType, setCallType] = useState(null); 
  const [partnerDetails, setPartnerDetails] = useState(null); 
  
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  // 🌟 FIX 1: Track actual stream instances in state so React forces a UI render on track detection
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const peerConnectionRef = useRef(null);
  const partnerSocketIdRef = useRef(null);
  
  // 🌟 FIX 2: Maintain a ref copy of callState to keep socket closures perfectly fresh without rebinding
  const callStateRef = useRef("IDLE");
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const terminateCallPipeline = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    partnerSocketIdRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallState("IDLE");
    setCallType(null);
    setPartnerDetails(null);
    setIsMuted(false);
    setIsCamOff(false);
  };

  const captureLocalMedia = async (type) => {
    try {
      const constraints = {
        audio: true,
        video: type === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      return stream;
    } catch (err) {
      toast.error("Media permission denied. Unable to access hardware peripherals.");
      terminateCallPipeline();
      throw err;
    }
  };

  const createPeerConnection = (targetSocketId, stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    // 🌟 FIX 1 (Cont.): Update state directly here to trigger CallInterface changes instantly
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("ice-candidate", { toSocket: targetSocketId, candidate: event.candidate });
      }
    };

    return pc;
  };

  const startCall = async (targetUser, type) => {
    if (!socket) return toast.error("Socket server connection disrupted.");
    
    setCallState("DIALING");
    setCallType(type);
    setPartnerDetails(targetUser);

    try {
      const stream = await captureLocalMedia(type);
      
      socket.emit("call-user-init", { toUserId: targetUser._id, type }, async (response) => {
        if (!response || !response.targetSocketId) {
          toast.error("User is offline or unavailable.");
          terminateCallPipeline();
          return;
        }

        partnerSocketIdRef.current = response.targetSocketId;
        const pc = createPeerConnection(response.targetSocketId, stream);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("call-user", {
          toSocketId: response.targetSocketId,
          offer,
          type,
          callerProfile: authUser,
        });
      });
    } catch (error) {
      console.error(error);
      terminateCallPipeline();
    }
  };

  const acceptIncomingCall = async () => {
    if (callStateRef.current !== "RINGING" || !peerConnectionRef.current) return;
    
    try {
      const stream = await captureLocalMedia(callType);
      setCallState("ON_CALL");

      stream.getTracks().forEach((track) => peerConnectionRef.current.addTrack(track, stream));

      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      socket.emit("answer-call", {
        toSocket: partnerSocketIdRef.current,
        answer,
      });
    } catch (error) {
      console.error("Failed to answer call payload:", error);
      terminateCallPipeline();
    }
  };

  const dropCall = () => {
    if (socket && partnerSocketIdRef.current) {
      socket.emit("end-call", { toSocket: partnerSocketIdRef.current });
    }
    terminateCallPipeline();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStream && callType === "video") {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOff(!videoTrack.enabled);
      }
    }
  };

  // 🌟 FIX 2 (Cont.): Empty dependencies keep this listener static, solid, and safe from channel dropouts
  useEffect(() => {
    if (!socket) return;

    socket.on("incoming-call", async ({ fromSocket, offer, type, callerProfile }) => {
      // Use the ref to read realtime state transitions safely
      if (callStateRef.current !== "IDLE") {
        return socket.emit("end-call", { toSocket: fromSocket });
      }

      partnerSocketIdRef.current = fromSocket;
      setCallState("RINGING");
      setCallType(type);
      setPartnerDetails(callerProfile);

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", { toSocket: fromSocket, candidate: event.candidate });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
    });

    socket.on("call-accepted", async ({ answer }) => {
      if (peerConnectionRef.current) {
        setCallState("ON_CALL");
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (e) {
        console.error("Error writing incoming ICE candidate pathway:", e);
      }
    });

    socket.on("call-ended", () => {
      toast("Call disconnected.");
      terminateCallPipeline();
    });

    return () => {
      socket.off("incoming-call");
      socket.off("call-accepted");
      socket.off("ice-candidate");
      socket.off("call-ended");
    };
  }, [socket]);

  return (
    <CallContext.Provider
      value={{
        callState,
        callType,
        partnerDetails,
        isMuted,
        isCamOff,
        localStream,
        remoteStream,
        startCall,
        acceptIncomingCall,
        dropCall,
        toggleMute,
        toggleCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};