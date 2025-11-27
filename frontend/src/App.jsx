import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import CallPage from "./pages/CallPage";
import "./App.css";

const socket = io("http://localhost:5000");

function App() {
  const [page, setPage] = useState("home"); // "home" or "call"
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");

  const handleStartCall = (inputRoomId, inputUserName) => {
    setRoomId(inputRoomId);
    setUserName(inputUserName);
    setPage("call");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117" }}>
      {page === "home" ? (
        <HomePage onStartCall={handleStartCall} />
      ) : (
        <CallPage socket={socket} roomId={roomId} userName={userName} />
      )}
    </div>
  );
}

function HomePage({ onStartCall }) {
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");

  const handleJoin = () => {
    if (roomId.trim() && userName.trim()) {
      onStartCall(roomId, userName);
    } else {
      alert("Please enter both Room ID and Name");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        color: "white",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#161b22",
          padding: "40px",
          borderRadius: "15px",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.5)",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <h1 style={{ textAlign: "center", marginBottom: "30px", color: "#58a6ff" }}>
          📞 Video Call
        </h1>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>
            Your Name
          </label>
          <input
            type="text"
            placeholder="Enter your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #30363d",
              background: "#0d1117",
              color: "white",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>
            Room ID
          </label>
          <input
            type="text"
            placeholder="Enter Room ID (e.g., room-123)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #30363d",
              background: "#0d1117",
              color: "white",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />
        </div>

        <button
          onClick={handleJoin}
          style={{
            width: "100%",
            padding: "12px",
            background: "#238636",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "background 0.3s",
          }}
          onMouseOver={(e) => (e.target.style.background = "#2ea043")}
          onMouseOut={(e) => (e.target.style.background = "#238636")}
        >
          Join Call
        </button>

        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
            color: "#8b949e",
            fontSize: "12px",
          }}
        >
          💡 Share the Room ID with someone to start a call
        </p>
      </div>
    </div>
  );
}

export default App;