// Simple WebSocket relay server for async-games
// Run with: node server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve static files (for local testing)
app.use(express.static('.'));

// Store active rooms
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  // Create room (host)
  socket.on('create-room', (roomCode) => {
    socket.join(roomCode);
    rooms.set(roomCode, {
      host: socket.id,
      clients: [],
      created: Date.now()
    });
    console.log('🏠 Room created:', roomCode);
    socket.emit('room-created', { roomCode });
  });

  // Join room (client)
  socket.on('join-room', (roomCode) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    socket.join(roomCode);
    room.clients.push(socket.id);
    
    console.log('🔗 Client joined room:', roomCode);
    
    // Notify host
    io.to(room.host).emit('client-joined', { clientId: socket.id });
    
    // Notify client
    socket.emit('joined-room', { roomCode, hostId: room.host });
  });

  // Relay data between peers
  socket.on('send-data', ({ roomCode, data }) => {
    // Send to everyone in room except sender
    socket.to(roomCode).emit('receive-data', {
      senderId: socket.id,
      data
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
    
    // Clean up rooms
    rooms.forEach((room, code) => {
      if (room.host === socket.id) {
        // Host left - notify clients and delete room
        io.to(code).emit('host-left');
        rooms.delete(code);
      } else {
        // Client left - remove from room
        room.clients = room.clients.filter(id => id !== socket.id);
        io.to(room.host).emit('client-left', { clientId: socket.id });
      }
    });
  });
});

// Clean up old rooms every 5 minutes
setInterval(() => {
  const now = Date.now();
  rooms.forEach((room, code) => {
    if (now - room.created > 30 * 60 * 1000) { // 30 minutes
      rooms.delete(code);
      console.log('🧹 Cleaned up stale room:', code);
    }
  });
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
});
