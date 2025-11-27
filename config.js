/**
 * WebRTC Video Calling App - Configuration File
 * This file contains all configurable options for the application
 */

// BACKEND CONFIGURATION
export const BACKEND_CONFIG = {
  // Server port
  PORT: 5000,

  // CORS settings
  CORS: {
    origin: "*",
    methods: ["GET", "POST"],
  },

  // STUN Servers for ICE
  STUN_SERVERS: [
    "stun:stun.l.google.com:19302",
    "stun:stun1.l.google.com:19302",
    "stun:stun2.l.google.com:19302",
    "stun:stun3.l.google.com:19302",
    "stun:stun4.l.google.com:19302",
  ],

  // TURN Server (optional - for NAT traversal)
  TURN_SERVERS: [
    // {
    //   urls: "turn:your-turn-server.com",
    //   username: "username",
    //   credential: "password",
    // }
  ],
};

// FRONTEND CONFIGURATION
export const FRONTEND_CONFIG = {
  // Backend server URL
  BACKEND_URL: "http://localhost:5000",

  // Media constraints
  MEDIA_CONSTRAINTS: {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 44100,
    },
  },

  // UI Theme
  THEME: {
    primary: "#238636",
    danger: "#da3633",
    background: "#0d1117",
    surface: "#161b22",
    border: "#30363d",
    text: "#c9d1d9",
    muted: "#8b949e",
  },

  // Call settings
  CALL_SETTINGS: {
    // Show remote video in full screen
    FULLSCREEN_REMOTE: true,

    // Show call duration
    SHOW_DURATION: true,

    // Auto-end call after inactivity (minutes)
    AUTO_END_DURATION: 0, // 0 = disabled

    // Ring tone volume (0-1)
    RINGTONE_VOLUME: 0.5,
  },

  // WebRTC Configuration
  WEBRTC_CONFIG: {
    // ICE Servers
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],

    // ICE Candidate Pool Size
    iceCandidatePoolSize: 10,

    // Codec preferences (leave empty for default)
    codecs: {
      video: [], // e.g., ["VP8", "VP9", "H264"]
      audio: [], // e.g., ["opus", "PCMU"]
    },
  },

  // Debugging
  DEBUG: {
    logWebRTC: false,
    logSocket: false,
    logMedia: false,
  },
};

// SOCKET.IO EVENTS
export const SOCKET_EVENTS = {
  // Client to Server
  CLIENT: {
    JOIN_ROOM: "join-room",
    OFFER: "offer",
    ANSWER: "answer",
    ICE_CANDIDATE: "ice-candidate",
    END_CALL: "end-call",
    REJECT_CALL: "reject-call",
  },

  // Server to Client
  SERVER: {
    USER_JOINED: "user-joined",
    ROOM_READY: "room-ready",
    INCOMING_OFFER: "incoming-offer",
    INCOMING_ANSWER: "incoming-answer",
    ICE_CANDIDATE: "ice-candidate",
    CALL_REJECTED: "call-rejected",
    CALL_ENDED: "call-ended",
    USER_DISCONNECTED: "user-disconnected",
  },
};

export default {
  BACKEND_CONFIG,
  FRONTEND_CONFIG,
  SOCKET_EVENTS,
};
