import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

export default function App() {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const peer = useRef(null);

  const ringtone = useRef(new Audio("../assets/ringtone.mp3"));

  const [joined, setJoined] = useState(false);
  const [incoming, setIncoming] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const room = "my-room";

  useEffect(() => {
    socket.on("incoming-call", () => {
      setIncoming(true);
      startRingtone();
    });

    socket.on("call-accepted", () => {
      stopRingtone();
      joinCall(true);
    });

    socket.on("offer", handleReceiveOffer);
    socket.on("answer", handleReceiveAnswer);
    socket.on("ice-candidate", handleReceiveCandidate);
  }, []);

  // ------------------------------
  // 🔔 RINGTONE FUNCTIONS
  const startRingtone = () => {
    ringtone.current.loop = true;
    ringtone.current.play();
  };

  const stopRingtone = () => {
    ringtone.current.pause();
    ringtone.current.currentTime = 0;
  };
  // ------------------------------

  const sendCallRequest = () => {
    socket.emit("join-room", room);
    setJoined(true);
    startRingtone(); // caller also hears ringing
  };

  const acceptCall = () => {
    stopRingtone();
    setIncoming(false);
    socket.emit("accept-call", room);
    joinCall();
  };

  const rejectCall = () => {
    stopRingtone();
    setIncoming(false);
  };

  const joinCall = async (skipJoin = false) => {
    if (!skipJoin) socket.emit("join-room", room);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localVideo.current.srcObject = stream;
    createPeer(stream);
  };

  const createPeer = (stream) => {
    peer.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    stream.getTracks().forEach((track) =>
      peer.current.addTrack(track, stream)
    );

    peer.current.ontrack = (event) => {
      remoteVideo.current.srcObject = event.streams[0];
    };

    peer.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { room, candidate: event.candidate });
      }
    };
  };

  const handleReceiveOffer = async (data) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localVideo.current.srcObject = stream;

    createPeer(stream);

    await peer.current.setRemoteDescription(
      new RTCSessionDescription(data.sdp)
    );

    const answer = await peer.current.createAnswer();
    await peer.current.setLocalDescription(answer);

    socket.emit("answer", { room, sdp: answer });
  };

  const handleReceiveAnswer = async (data) => {
    await peer.current.setRemoteDescription(
      new RTCSessionDescription(data.sdp)
    );
    stopRingtone();
  };

  const handleReceiveCandidate = async (candidate) => {
    await peer.current.addIceCandidate(
      new RTCIceCandidate(candidate)
    );
  };

  // MIC
  const toggleMic = () => {
    const audioTrack = localVideo.current.srcObject
      .getTracks()
      .find((t) => t.kind === "audio");

    audioTrack.enabled = !audioTrack.enabled;
    setMicOn(audioTrack.enabled);
  };

  // CAMERA
  const toggleCamera = () => {
    const videoTrack = localVideo.current.srcObject
      .getTracks()
      .find((t) => t.kind === "video");

    videoTrack.enabled = !videoTrack.enabled;
    setCamOn(videoTrack.enabled);
  };

  return (
    <div
      style={{
        background: "#0d1117",
        minHeight: "100vh",
        padding: 20,
        color: "white",
        textAlign: "center",
      }}
    >
      <h1>WebRTC Audio & Video Call</h1>

      {/* 📱 INCOMING CALL SCREEN */}
      {incoming && (
        <div
          style={{
            background: "#111",
            padding: 30,
            borderRadius: 15,
            width: 300,
            margin: "30px auto",
          }}
        >
          <h2>📞 Incoming Call</h2>

          <button
            onClick={acceptCall}
            style={{
              background: "green",
              padding: "12px 25px",
              margin: 10,
              borderRadius: 10,
              cursor: "pointer",
              border: "none",
              color: "white",
            }}
          >
            Accept
          </button>

          <button
            onClick={rejectCall}
            style={{
              background: "red",
              padding: "12px 25px",
              margin: 10,
              borderRadius: 10,
              cursor: "pointer",
              border: "none",
              color: "white",
            }}
          >
            Reject
          </button>
        </div>
      )}

      {!joined && !incoming && (
        <button
          onClick={sendCallRequest}
          style={{
            padding: "12px 25px",
            background: "green",
            color: "white",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            marginTop: 20,
          }}
        >
          Start Call
        </button>
      )}

      {joined && (
        <>
          <div
            style={{
              marginTop: 25,
              display: "flex",
              justifyContent: "center",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <video
              ref={localVideo}
              autoPlay
              playsInline
              muted
              style={{
                width: 300,
                borderRadius: 10,
                background: "#333",
              }}
            ></video>

            <video
              ref={remoteVideo}
              autoPlay
              playsInline
              style={{
                width: 300,
                borderRadius: 10,
                background: "#333",
              }}
            ></video>
          </div>

          {/* CALL CONTROLS */}
          <div
            style={{
              marginTop: 20,
              display: "flex",
              justifyContent: "center",
              gap: 20,
            }}
          >
            <button
              onClick={toggleMic}
              style={{
                background: micOn ? "#444" : "red",
                border: "none",
                padding: 15,
                borderRadius: "50%",
                width: 60,
                height: 60,
                color: "white",
                fontSize: 18,
              }}
            >
              🎤
            </button>

            <button
              onClick={toggleCamera}
              style={{
                background: camOn ? "#444" : "red",
                border: "none",
                padding: 15,
                borderRadius: "50%",
                width: 60,
                height: 60,
                color: "white",
                fontSize: 18,
              }}
            >
              📷
            </button>

            <button
              onClick={() => window.location.reload()}
              style={{
                background: "red",
                border: "none",
                padding: 15,
                borderRadius: "50%",
                width: 60,
                height: 60,
                color: "white",
                fontSize: 18,
              }}
            >
              🔴
            </button>
          </div>
        </>
      )}
    </div>
  );
}
