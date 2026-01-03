// WebSocket-based NetworkManager (works across ANY network)
(function(window){
  class NetworkManager{
    constructor(){
      this.socket = null;
      this.roomCode = null;
      this.role = null; // 'host' | 'client'
      this.onDataCallback = ()=>{};
      this.connected = false;
      
      // Use deployed server or localhost for testing
      this.serverUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000'
        : 'https://your-server-url.com'; // Change this when you deploy
    }

    generateRoomCode(){
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let s=''; for(let i=0;i<4;i++) s+=chars[Math.floor(Math.random()*chars.length)];
      return s;
    }

    _connectSocket(){
      return new Promise((resolve, reject) => {
        if(typeof io === 'undefined'){
          reject(new Error('Socket.io not loaded'));
          return;
        }

        this.socket = io(this.serverUrl, {
          transports: ['websocket', 'polling'], // Polling fallback
          reconnection: true,
          reconnectionAttempts: 5,
          timeout: 10000
        });

        this.socket.on('connect', () => {
          console.log('✅ Connected to server:', this.socket.id);
          this.connected = true;
          resolve();
        });

        this.socket.on('connect_error', (err) => {
          console.error('❌ Connection error:', err);
          reject(new Error('Failed to connect to server'));
        });

        this.socket.on('disconnect', () => {
          console.log('⚠️ Disconnected from server');
          this.connected = false;
        });

        this.socket.on('error', (err) => {
          console.error('❌ Socket error:', err);
        });

        // Set up data handlers
        this.socket.on('receive-data', ({ senderId, data }) => {
          console.log('📦 Received data from:', senderId);
          this.onDataCallback(data);
        });

        this.socket.on('host-left', () => {
          console.log('⚠️ Host left the room');
          alert('Host has disconnected');
        });

        this.socket.on('client-left', ({ clientId }) => {
          console.log('⚠️ Client left:', clientId);
        });

        this.socket.on('client-joined', ({ clientId }) => {
          console.log('✅ Client joined:', clientId);
        });
      });
    }

    async startHost(){
      try {
        await this._connectSocket();
        
        this.role = 'host';
        const code = this.generateRoomCode();
        this.roomCode = code;

        return new Promise((resolve, reject) => {
          this.socket.emit('create-room', code);
          
          this.socket.on('room-created', ({ roomCode }) => {
            console.log('✅ Room created:', roomCode);
            resolve(roomCode);
          });

          setTimeout(() => {
            reject(new Error('Room creation timeout'));
          }, 10000);
        });
      } catch (err) {
        throw new Error('Failed to start host: ' + err.message);
      }
    }

    async joinRoom(code){
      try {
        await this._connectSocket();
        
        this.role = 'client';
        this.roomCode = code;

        return new Promise((resolve, reject) => {
          this.socket.emit('join-room', code);
          
          this.socket.on('joined-room', ({ roomCode, hostId }) => {
            console.log('✅ Joined room:', roomCode, 'Host:', hostId);
            resolve();
          });

          this.socket.on('error', ({ message }) => {
            reject(new Error(message));
          });

          setTimeout(() => {
            reject(new Error('Join timeout - room may not exist'));
          }, 10000);
        });
      } catch (err) {
        throw new Error('Failed to join room: ' + err.message);
      }
    }

    sendData(type, payload){
      if (!this.connected || !this.socket) {
        console.warn('⚠️ Not connected, cannot send data');
        return;
      }

      const pkg = { type, payload, t: Date.now() };
      this.socket.emit('send-data', {
        roomCode: this.roomCode,
        data: pkg
      });
    }

    onData(cb){
      this.onDataCallback = cb;
    }

    close(){
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      this.connected = false;
    }

    // Getter for compatibility
    get peer() {
      return { id: this.socket?.id };
    }

    get conn() {
      return this.connected ? { open: true } : null;
    }
  }

  window.NetworkManager = NetworkManager;
})(window);
