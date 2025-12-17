// Simple PeerJS wrapper for Double Blind
(function(window){
  class NetworkManager{
    constructor(){
      this.peer = null;
      this.conn = null;
      this.onDataCallback = ()=>{};
      this.roomCode = null;
      this.role = null; // 'host' | 'client'
      this._reconnectAttempts = 0;
      this._checkPeerJS();
    }

    _checkPeerJS(){
      if(typeof window.Peer === 'undefined'){
        console.warn('⚠️ PeerJS not loaded yet, will retry when starting host/client');
      }
    }

    _waitForPeerJS(){
      return new Promise((resolve, reject) => {
        if(typeof window.Peer !== 'undefined'){
          resolve();
          return;
        }
        let attempts = 0;
        const checkInterval = setInterval(() => {
          attempts++;
          if(typeof window.Peer !== 'undefined'){
            clearInterval(checkInterval);
            resolve();
          } else if(attempts > 20){
            clearInterval(checkInterval);
            reject(new Error('PeerJS library failed to load. Please refresh the page.'));
          }
        }, 100);
      });
    }

    generateRoomCode(){
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let s=''; for(let i=0;i<4;i++) s+=chars[Math.floor(Math.random()*chars.length)];
      return s;
    }

    startHost(){
      return new Promise(async (resolve,reject)=>{
        try{
          await this._waitForPeerJS();
        }catch(err){
          reject(err);
          return;
        }

        this.role='host';
        const code = this.generateRoomCode();
        this.roomCode = code;
        const hostId = 'doubleblind-'+code.toLowerCase();
        
        const config = {
          debug: 2,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        };
        
        try{
          this.peer = new window.Peer(hostId, config);
        }catch(err){
          reject(new Error('Failed to create Peer: ' + err.message));
          return;
        }

        this.peer.on('open', id=>{
          console.log('✅ Host peer opened with ID:', id);
          console.log('📡 Room Code:', code);
          resolve(code);
        });

        this.peer.on('connection', conn=>{
          console.log('✅ Client connected:', conn.peer);
          this.conn = conn;
          this.conn.on('data', data=> this._handleRaw(data));
          this.conn.on('close', ()=> console.log('⚠️ Connection closed'));
          this.conn.on('error', (err)=> console.error('Connection error:', err));
        });

        this.peer.on('error', err=>{
          console.error('❌ Peer error:', err.type, err);
          reject(new Error(`Host error: ${err.type}`));
        });
        
        setTimeout(()=>{
          if(!this.peer || !this.peer.open){
            reject(new Error('PeerJS connection timeout'));
          }
        }, 10000);
      });
    }

    joinRoom(code){
      return new Promise(async (resolve,reject)=>{
        try{
          await this._waitForPeerJS();
        }catch(err){
          reject(err);
          return;
        }

        this.role='client';
        this.roomCode = code;
        const hostId = 'doubleblind-'+code.toLowerCase();
        
        const config = {
          debug: 2,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        };
        
        try{
          this.peer = new window.Peer(config);
        }catch(err){
          reject(new Error('Failed to create Peer: ' + err.message));
          return;
        }
        
        this.peer.on('open', id=>{
          console.log('✅ Client peer opened with ID:', id);
          console.log('🔗 Attempting to connect to host:', hostId);
          
          const conn = this.peer.connect(hostId, {reliable: true});
          
          conn.on('open', ()=>{
            console.log('✅ Connected to host successfully!');
            this.conn = conn;
            this.conn.on('data', d=> this._handleRaw(d));
            this.conn.on('close', ()=> console.log('⚠️ Connection closed'));
            this.conn.on('error', (err)=> console.error('Connection error:', err));
            resolve();
          });
          
          conn.on('error', err=> {
            console.error('❌ Connection error:', err);
            reject(new Error(`Failed to connect: ${err.type || err.message || 'Unknown error'}`));
          });
          
          setTimeout(()=>{
            if(!this.conn || !this.conn.open){
              reject(new Error('Connection timeout - host may not exist or be offline'));
            }
          }, 15000);
        });
        
        this.peer.on('error', err=> {
          console.error('❌ Peer error:', err.type, err);
          reject(new Error(`Client error: ${err.type}`));
        });
      });
    }

    sendData(type,payload){
      const pkg = {type,payload,t:Date.now()};
      try{
        if(this.conn && this.conn.open){
          this.conn.send(pkg);
        }
      }catch(e){console.warn('send failed',e)}
    }

    onData(cb){ this.onDataCallback = cb; }

    _handleRaw(data){
      // already JSON-ish from PeerJS; forward
      try{ this.onDataCallback(data); }
      catch(e){ console.error('onData callback error',e); }
    }

    close(){
      try{ if(this.conn) this.conn.close(); }catch(e){}
      try{ if(this.peer) this.peer.destroy(); }catch(e){}
      this.peer=null; this.conn=null;
    }
  }

  window.NetworkManager = NetworkManager;
})(window);
