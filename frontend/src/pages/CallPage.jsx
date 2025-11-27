import { useEffect, useRef, useState } from "react";

function CallPage({ socket, roomId, userName }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  const [callState, setCallState] = useState("waiting"); // waiting, calling, connected
  const [remoteUserName, setRemoteUserName] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  const ringtoneRef = useRef(new Audio("data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0ZCAAAAAAA=="));

  useEffect(() => {
    // Join room and get media
    initializeCall();

    return () => {
      // Cleanup on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    // Timer for call duration
    let interval;
    if (callState === "connected") {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const initializeCall = async () => {
    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      localStreamRef.current = stream;
      localVideoRef.current.srcObject = stream;

      // Join room
      socket.emit("join-room", { roomId, userName });

      // Listen for remote user
      socket.on("user-joined", handleRemoteUserJoined);
      socket.on("incoming-offer", handleIncomingOffer);
      socket.on("incoming-answer", handleIncomingAnswer);
      socket.on("ice-candidate", handleIceCandidate);
      socket.on("call-rejected", handleCallRejected);
      socket.on("call-ended", handleCallEnded);
      socket.on("user-disconnected", handleUserDisconnected);

      // Start as caller
      setCallState("calling");
      createPeerConnection();
    } catch (error) {
      console.error("Failed to get media:", error);
      alert("Please allow camera and microphone access");
    }
  };

  const handleRemoteUserJoined = async (data) => {
    console.log("Remote user joined:", data.userName);
    setRemoteUserName(data.userName);

    // Create and send offer
    try {
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      socket.emit("offer", {
        to: data.userId,
        from: socket.id,
        offer: offer,
      });
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };

  const createPeerConnection = () => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    // Add local stream tracks
    localStreamRef.current.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStreamRef.current);
    });

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log("Remote track received:", event.track.kind);
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          to: remoteUserName ? socket.id : null,
          from: socket.id,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log("Connection state:", peerConnection.connectionState);
      if (peerConnection.connectionState === "failed") {
        console.error("Peer connection failed");
      }
    };

    peerConnectionRef.current = peerConnection;
  };

  const handleIncomingOffer = async (data) => {
    console.log("Incoming offer from:", data.from);
    setRemoteUserName(data.from);

    try {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );

      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      socket.emit("answer", {
        to: data.from,
        from: socket.id,
        answer: answer,
      });

      setCallState("connected");
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  };

  const handleIncomingAnswer = async (data) => {
    console.log("Incoming answer");
    try {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );
      setCallState("connected");
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  };

  const handleIceCandidate = async (data) => {
    try {
      if (data.candidate) {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      }
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  };

  const handleCallRejected = () => {
    alert("Call was rejected");
    setCallState("waiting");
  };

  const handleCallEnded = () => {
    console.log("Call ended by remote user");
    endCall();
  };

  const handleUserDisconnected = () => {
    console.log("Remote user disconnected");
    endCall();
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current
        .getTracks()
        .find((t) => t.kind === "audio");
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current
        .getTracks()
        .find((t) => t.kind === "video");
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCamOn(videoTrack.enabled);
      }
    }
  };

  const endCall = () => {
    if (remoteUserName) {
      socket.emit("end-call", { to: remoteUserName });
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    setCallState("ended");
    setTimeout(() => {
      window.location.href = "/";
    }, 2000);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ":" : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#0d1117",
        color: "white",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#161b22",
          padding: "16px 20px",
          borderBottom: "1px solid #30363d",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "18px" }}>
            {callState === "calling" && "📞 Calling..."}
            {callState === "connected" && `✅ Call with ${remoteUserName}`}
            {callState === "waiting" && "⏳ Waiting for call..."}
            {callState === "ended" && "❌ Call ended"}
          </h2>
          {callState === "connected" && (
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#8b949e" }}>
              Duration: {formatTime(callDuration)}
            </p>
          )}
        </div>
        {callState === "connected" && (
          <div style={{ fontSize: "12px", color: "#8b949e" }}>
            {`You: ${userName}`}
          </div>
        )}
      </div>

      {/* Video Container */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative",
          background: "#0d1117",
        }}
      >
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            background: "#161b22",
          }}
        />

        {/* Local Video (Picture in Picture) */}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: "absolute",
            bottom: "20px",
            right: "20px",
            width: "200px",
            height: "150px",
            borderRadius: "12px",
            border: "3px solid #238636",
            background: "#000",
            objectFit: "cover",
          }}
        />

        {/* Calling/Waiting State */}
        {callState !== "connected" && callState !== "ended" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              background: "rgba(0, 0, 0, 0.7)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "48px",
                  marginBottom: "20px",
                  animation: "pulse 1.5s infinite",
                }}
              >
                {callState === "calling" ? "📞" : "⏳"}
              </div>
              <p style={{ fontSize: "20px", marginBottom: "10px" }}>
                {callState === "calling" ? `Calling ${remoteUserName}...` : "Waiting for incoming call..."}
              </p>
            </div>
          </div>
        )}

        {/* Call Ended State */}
        {callState === "ended" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              background: "rgba(0, 0, 0, 0.9)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "64px", marginBottom: "20px" }}>
                ✅
              </div>
              <p style={{ fontSize: "20px", marginBottom: "10px" }}>
                Call ended
              </p>
              <p style={{ fontSize: "14px", color: "#8b949e" }}>
                Duration: {formatTime(callDuration)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          background: "#161b22",
          padding: "20px",
          borderTop: "1px solid #30363d",
          display: "flex",
          justifyContent: "center",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        {/* Mic Toggle */}
        <button
          onClick={toggleMic}
          disabled={callState === "ended"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            border: "none",
            background: micOn ? "#238636" : "#da3633",
            color: "white",
            fontSize: "24px",
            cursor: callState === "ended" ? "not-allowed" : "pointer",
            opacity: callState === "ended" ? 0.5 : 1,
            transition: "all 0.3s",
          }}
          title={micOn ? "Mute microphone" : "Unmute microphone"}
        >
          🎤
        </button>

        {/* Camera Toggle */}
        <button
          onClick={toggleCamera}
          disabled={callState === "ended"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            border: "none",
            background: camOn ? "#238636" : "#da3633",
            color: "white",
            fontSize: "24px",
            cursor: callState === "ended" ? "not-allowed" : "pointer",
            opacity: callState === "ended" ? 0.5 : 1,
            transition: "all 0.3s",
          }}
          title={camOn ? "Turn off camera" : "Turn on camera"}
        >
          📷
        </button>

        {/* End Call */}
        <button
          onClick={endCall}
          disabled={callState === "ended"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            border: "none",
            background: "#da3633",
            color: "white",
            fontSize: "24px",
            cursor: callState === "ended" ? "not-allowed" : "pointer",
            opacity: callState === "ended" ? 0.5 : 1,
            transition: "all 0.3s",
          }}
          title="End call"
        >
          🔴
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}

export default CallPage;
