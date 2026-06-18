import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  useContext,
} from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";
import { ChatContext } from "./ChatContext";

export const CallContext = createContext();

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export const CallProvider = ({ children }) => {
  const { authUser, socket } = useContext(AuthContext);
  const { sendMessage } = useContext(ChatContext);

  const [callState, setCallState] = useState("IDLE"); // IDLE, DIALING, RINGING, ON_CALL
  const [callType, setCallType] = useState(null);
  const [partnerDetails, setPartnerDetails] = useState(null);
  const [isGroupCall, setIsGroupCall] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  const [localStream, setLocalStream] = useState(null);
  // 🌟 Modified for 1-to-1 compatibility
  const [remoteStream, setRemoteStream] = useState(null);
  // 🌟 New State: Maps remote user socketIds to their incoming streams for group grids
  const [remoteStreams, setRemoteStreams] = useState({}); // { socketId: { stream, profile } }

  // References
  const peerConnectionRef = useRef(null); // Used strictly for 1-to-1 backwards fallback
  const partnerSocketIdRef = useRef(null); // Used strictly for 1-to-1 backwards fallback

  // 🌟 New Refs: Manages all Full-Mesh peer links dynamically
  const groupPeerConnectionsRef = useRef({}); // { socketId: RTCPeerConnection }
  const localStreamRef = useRef(null);
  const callStateRef = useRef("IDLE");

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const terminateCallPipeline = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Terminate 1-to-1 references
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Terminate all Mesh Group connections
    Object.keys(groupPeerConnectionsRef.current).forEach((socketId) => {
      if (groupPeerConnectionsRef.current[socketId]) {
        groupPeerConnectionsRef.current[socketId].close();
      }
    });

    if (socket) {
      socket.emit("leave-group-call");
    }

    groupPeerConnectionsRef.current = {};
    partnerSocketIdRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    setRemoteStreams({});
    setCallState("IDLE");
    setCallType(null);
    setPartnerDetails(null);
    setIsGroupCall(false);
    setIsMuted(false);
    setIsCamOff(false);
    localStreamRef.current = null;
  };

  const captureLocalMedia = async (type) => {
    try {
      const constraints = {
        audio: true,
        video:
          type === "video"
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: "user",
              }
            : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      toast.error("Media permission denied. Unable to access peripherals.");
      terminateCallPipeline();
      throw err;
    }
  };

  // =========================================================================
  // 🌟 NEW: Core Mesh Engine Connection Factory Method
  // =========================================================================
  const createGroupPeerConnection = (targetSocketId, stream, targetProfile) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStreams((prev) => ({
          ...prev,
          [targetSocketId]: {
            stream: event.streams[0],
            profile: targetProfile,
          },
        }));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("group-ice-candidate", {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    return pc;
  };

  // 1-to-1 Legacy Builder Core Method
  const createPeerConnection = (targetSocketId, stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("ice-candidate", {
          toSocket: targetSocketId,
          candidate: event.candidate,
        });
      }
    };
    return pc;
  };

  // =========================================================================
  // MAIN ENTRY SYSTEM TRIGGER
  // =========================================================================
  const startCall = async (target, type, isGroup = false) => {
    if (!socket) return toast.error("Socket server connection disrupted.");

    setCallType(type);
    setPartnerDetails(target);
    setIsGroupCall(isGroup);

    try {
      const stream = await captureLocalMedia(type);

      if (isGroup) {
        // For groups, immediately switch UI to call view and notify the room
        setCallState("ON_CALL");
        socket.emit("join-group-call", {
          groupId: target._id,
          userProfile: authUser,
        });
      } else {
        // Classic 1-to-1 Outbound Dialing Loop Sequence
        setCallState("DIALING");
        socket.emit(
          "call-user-init",
          { toUserId: target._id, type },
          async (response) => {
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
          },
        );
      }
    } catch (error) {
      console.error(error);
      terminateCallPipeline();
    }
  };

  const acceptIncomingCall = async () => {
    if (callStateRef.current !== "RINGING" || !peerConnectionRef.current)
      return;

    try {
      const stream = await captureLocalMedia(callType);
      setCallState("ON_CALL");

      stream
        .getTracks()
        .forEach((track) => peerConnectionRef.current.addTrack(track, stream));

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

  const dropCall = async () => {
    if (socket) {
      if (isGroupCall) {
        socket.emit("leave-group-call");
      } else if (partnerSocketIdRef.current) {
        socket.emit("end-call", { toSocket: partnerSocketIdRef.current });

        if (callState === "ON_CALL" && partnerDetails) {
          try {
            const formData = new FormData();
            formData.append(
              "text",
              `${callType === "video" ? "🎥 Video" : "📞 Voice"} call ended`,
            );
            formData.append("messageType", "call");
            formData.append("isGroup", "false");
            await sendMessage(formData, partnerDetails._id, false);
          } catch (error) {
            console.error("Failed to log call message:", error);
          }
        }
      }
    }
    terminateCallPipeline();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current && callType === "video") {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOff(!videoTrack.enabled);
      }
    }
  };

  // =========================================================================
  // CENTRAL SIGNALLING EFFECT ROUTER
  // =========================================================================
  useEffect(() => {
    if (!socket) return;

    // -----------------------------------------------------------------------
    // 1-to-1 Signalling Handlers
    // -----------------------------------------------------------------------
    socket.on(
      "incoming-call",
      async ({ fromSocket, offer, type, callerProfile }) => {
        if (callStateRef.current !== "IDLE") {
          return socket.emit("end-call", { toSocket: fromSocket });
        }

        partnerSocketIdRef.current = fromSocket;
        setCallState("RINGING");
        setCallType(type);
        setPartnerDetails(callerProfile);
        setIsGroupCall(false);

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;

        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            setRemoteStream(event.streams[0]);
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", {
              toSocket: fromSocket,
              candidate: event.candidate,
            });
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
      },
    );

    socket.on("call-accepted", async ({ answer }) => {
      if (peerConnectionRef.current) {
        setCallState("ON_CALL");
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer),
        );
      }
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(candidate),
          );
        }
      } catch (e) {
        console.error("Error wiring incoming 1-to-1 ICE candidate:", e);
      }
    });

    socket.on("call-ended", () => {
      toast("Call disconnected.");
      terminateCallPipeline();
    });

    // -----------------------------------------------------------------------
    // 👥 Group Mesh Core Signalling Listeners
    // -----------------------------------------------------------------------
    socket.on(
      "user-joined-group-call",
      async ({ fromSocketId, userProfile }) => {
        // An existing user creates an offer for the newcomer
        if (!localStreamRef.current) return;

        const pc = createGroupPeerConnection(
          fromSocketId,
          localStreamRef.current,
          userProfile,
        );
        groupPeerConnectionsRef.current[fromSocketId] = pc;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("group-signal", {
          targetSocketId: fromSocketId,
          signal: offer,
        });
      },
    );

    socket.on("receive-group-signal", async ({ senderSocketId, signal }) => {
      if (signal.type === "offer") {
        // Newcomer receives an offer from an existing participant, generates answer
        if (!localStreamRef.current) return;

        const pc = createGroupPeerConnection(
          senderSocketId,
          localStreamRef.current,
          null,
        );
        groupPeerConnectionsRef.current[senderSocketId] = pc;

        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("group-signal", {
          targetSocketId: senderSocketId,
          signal: answer,
        });
      } else if (signal.type === "answer") {
        // Target peer accepts your offer layout configuration properties
        const pc = groupPeerConnectionsRef.current[senderSocketId];
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        }
      }
    });

    socket.on(
      "receive-group-ice-candidate",
      async ({ senderSocketId, candidate }) => {
        try {
          const pc = groupPeerConnectionsRef.current[senderSocketId];
          if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (e) {
          console.error(
            "Error assigning custom group ICE candidate pipeline:",
            e,
          );
        }
      },
    );

    socket.on("user-left-group-call", ({ participantSocketId }) => {
      if (groupPeerConnectionsRef.current[participantSocketId]) {
        groupPeerConnectionsRef.current[participantSocketId].close();
        delete groupPeerConnectionsRef.current[participantSocketId];
      }
      setRemoteStreams((prev) => {
        const updated = { ...prev };
        delete updated[participantSocketId];
        return updated;
      });
    });

    return () => {
      socket.off("incoming-call");
      socket.off("call-accepted");
      socket.off("ice-candidate");
      socket.off("call-ended");
      socket.off("user-joined-group-call");
      socket.off("receive-group-signal");
      socket.off("receive-group-ice-candidate");
      socket.off("user-left-group-call");
    };
  }, [socket]);

  return (
    <CallContext.Provider
      value={{
        callState,
        callType,
        partnerDetails,
        isGroupCall,
        isMuted,
        isCamOff,
        localStream,
        remoteStream,
        remoteStreams,
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
