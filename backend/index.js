import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { 
    origin: "*", 
    methods: ["GET", "POST"] 
  },
});

// Track active users and their room assignments
const userSockets = new Map();
const activeRooms = new Map();

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // User joins a room
  socket.on("join-room", (data) => {
    const { roomId, userName } = data;
    socket.join(roomId);
    
    userSockets.set(socket.id, { roomId, userName });
    
    const roomUsers = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    
    console.log(`👤 ${userName} joined room ${roomId}. Users in room: ${roomUsers}`);
    
    if (roomUsers === 2) {
      // Notify the first user that someone is joining
      socket.to(roomId).emit("user-joined", {
        userId: socket.id,
        userName: userName,
      });
      
      // Send back notification to the joiner
      socket.emit("room-ready", { roomId });
    }
  });

  // Handle offer from caller
  socket.on("offer", (data) => {
    console.log("📤 Offer sent:", data.from, "->", data.to);
    socket.to(data.to).emit("incoming-offer", {
      from: data.from,
      offer: data.offer,
    });
  });

  // Handle answer from receiver
  socket.on("answer", (data) => {
    console.log("📥 Answer sent:", data.from, "->", data.to);
    socket.to(data.to).emit("incoming-answer", {
      from: data.from,
      answer: data.answer,
    });
  });

  // Handle ICE candidates
  socket.on("ice-candidate", (data) => {
    socket.to(data.to).emit("ice-candidate", {
      from: data.from,
      candidate: data.candidate,
    });
  });

  // Handle call rejection
  socket.on("reject-call", (data) => {
    console.log("❌ Call rejected:", data.to);
    socket.to(data.to).emit("call-rejected", {
      from: socket.id,
    });
  });

  // Handle call ending
  socket.on("end-call", (data) => {
    console.log("🔴 Call ended by:", socket.id);
    socket.to(data.to).emit("call-ended", {
      from: socket.id,
    });
    
    // Clean up
    const userRoomId = userSockets.get(socket.id)?.roomId;
    if (userRoomId) {
      socket.leave(userRoomId);
    }
  });

  socket.on("disconnect", () => {
    const userData = userSockets.get(socket.id);
    console.log("❌ User disconnected:", socket.id, userData?.userName);
    
    // Notify room members about disconnection
    if (userData) {
      io.to(userData.roomId).emit("user-disconnected", {
        userId: socket.id,
      });
    }
    
    userSockets.delete(socket.id);
  });
});

server.listen(5000, () => {
  console.log("🚀 WebRTC Signaling Server running on http://localhost:5000");
});
