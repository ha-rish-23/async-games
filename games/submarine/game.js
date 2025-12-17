/* Sonar Submarine Game */
(function(){
  const nm = new window.NetworkManager();
  const audio = new window.AudioManager();

  const hostBtn = document.getElementById('hostBtn');
  const clientBtn = document.getElementById('clientBtn');
  const hostWrap = document.getElementById('hostWrap');
  const clientWrap = document.getElementById('clientWrap');
  const roomCodeSpan = document.getElementById('roomCode');
  const hostStatus = document.getElementById('hostStatus');
  const clientStatus = document.getElementById('clientStatus');
  const joinBtn = document.getElementById('joinBtn');
  const codeInput = document.getElementById('codeInput');
  const gameArea = document.getElementById('gameArea');
  const gameStatus = document.getElementById('gameStatus');
  const controls = document.getElementById('controls');
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  let role = null;
  let animationId = null;
  let gameTimer = null;

  // Game state
  const sub = {
    x: 400,
    y: 300,
    depth: 300,
    speed: 2,
    maxSpeed: 5,
    minSpeed: 0.5,
    oxygen: 100,
    alive: true
  };

  let obstacles = [];
  let goalReached = false;
  let radarAngle = 0;
  let detectedBlips = [];
  const radarRange = 250;
  let obstaclesInitialized = false;
  let subTrail = []; // Movement trail
  let startX = 400; // Starting X position
  let distanceTraveled = 0;

  // Generate obstacles
  function generateObstacles(){
    obstacles = [];
    // Rocks
    for(let i=0; i<15; i++){
      obstacles.push({
        x: Math.random() * 1600 + 200,
        y: Math.random() * 500 + 50,
        r: 20 + Math.random() * 30,
        type: 'rock'
      });
    }
    // Mines (moving)
    for(let i=0; i<8; i++){
      obstacles.push({
        x: Math.random() * 1600 + 200,
        y: Math.random() * 500 + 50,
        r: 15,
        type: 'mine',
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5
      });
    }
    // Goal
    obstacles.push({
      x: 1800,
      y: 300,
      r: 40,
      type: 'goal'
    });
  }

  // Captain view (dashboard)
  function drawCaptainView(){
    ctx.fillStyle = '#001a00';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Scanlines
    ctx.strokeStyle = 'rgba(0,255,0,0.05)';
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.height; i+=3){
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Title
    ctx.font = '20px "Press Start 2P"';
    ctx.fillStyle = '#0f0';
    ctx.textAlign = 'center';
    ctx.fillText('SUBMARINE CONTROL', canvas.width/2, 50);

    // Dashboard panels
    drawPanel(80, 120, 200, 150, 'DEPTH', sub.depth.toFixed(0) + 'm');
    drawPanel(420, 120, 200, 150, 'SPEED', sub.speed.toFixed(1) + ' kts');
    drawPanel(250, 310, 200, 120, 'OXYGEN', sub.oxygen.toFixed(0) + '%');

    // Instructions
    ctx.font = '11px "Share Tech Mono"';
    ctx.fillStyle = 'rgba(0,255,0,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText('Use controls below to navigate blind', canvas.width/2, 460);
    ctx.fillText('Radar operator will guide you to the goal', canvas.width/2, 480);
  }

  function drawPanel(x, y, w, h, label, value){
    // Border
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Label
    ctx.font = '14px "Share Tech Mono"';
    ctx.fillStyle = '#0f0';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w/2, y + 30);

    // Value
    ctx.font = '36px "Press Start 2P"';
    ctx.fillStyle = '#0ff';
    ctx.fillText(value, x + w/2, y + h/2 + 15);

    // Warning if critical
    if((label === 'OXYGEN' && sub.oxygen < 30) || (label === 'DEPTH' && sub.depth > 500)){
      ctx.fillStyle = '#f00';
      ctx.fillRect(x+5, y+5, 10, 10);
    }
  }

  // Radar view (top-down map)
  function drawRadarView(){
    ctx.fillStyle = '#001a00';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Scanlines
    ctx.strokeStyle = 'rgba(0,255,0,0.03)';
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.height; i+=2){
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Grid
    ctx.strokeStyle = 'rgba(0,255,0,0.1)';
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=50){
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for(let i=0; i<canvas.height; i+=50){
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);

    const scale = 0.35; // Bigger view range

    // Draw submarine trail (shows movement)
    if(subTrail.length > 1){
      // Trail line
      ctx.strokeStyle = 'rgba(0,255,255,0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo((subTrail[0].x - sub.x) * scale, (subTrail[0].y - sub.y) * scale);
      for(let i = 1; i < subTrail.length; i++){
        ctx.lineTo((subTrail[i].x - sub.x) * scale, (subTrail[i].y - sub.y) * scale);
      }
      ctx.stroke();
      
      // Trail dots
      ctx.fillStyle = 'rgba(0,255,255,0.6)';
      for(let i = 0; i < subTrail.length; i += 5){
        const tx = (subTrail[i].x - sub.x) * scale;
        const ty = (subTrail[i].y - sub.y) * scale;
        ctx.beginPath();
        ctx.arc(tx, ty, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw ALL obstacles directly (no sweep needed)
    obstacles.forEach(obs => {
      const relX = (obs.x - sub.x) * scale;
      const relY = (obs.y - sub.y) * scale;
      
      // Only draw if on screen (with some margin)
      if(Math.abs(relX) < canvas.width/2 + 100 && Math.abs(relY) < canvas.height/2 + 100){
        ctx.save();
        
        if(obs.type === 'goal'){
          // Goal - cyan pulsing circle
          ctx.fillStyle = '#0ff';
          ctx.shadowColor = '#0ff';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(relX, relY, obs.r * scale * (1 + Math.sin(Date.now() * 0.003) * 0.2), 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          
          ctx.font = 'bold 14px "Share Tech Mono"';
          ctx.fillStyle = '#0ff';
          ctx.textAlign = 'center';
          ctx.fillText('GOAL', relX, relY - obs.r * scale - 10);
          
        } else if(obs.type === 'mine'){
          // Mine - red danger with spikes
          ctx.fillStyle = '#f00';
          ctx.shadowColor = '#f00';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(relX, relY, obs.r * scale, 0, Math.PI * 2);
          ctx.fill();
          
          // Spikes
          ctx.strokeStyle = '#f00';
          ctx.lineWidth = 2;
          for(let a = 0; a < Math.PI * 2; a += Math.PI / 4){
            ctx.beginPath();
            ctx.moveTo(relX + Math.cos(a) * obs.r * scale, relY + Math.sin(a) * obs.r * scale);
            ctx.lineTo(relX + Math.cos(a) * obs.r * scale * 1.5, relY + Math.sin(a) * obs.r * scale * 1.5);
            ctx.stroke();
          }
          ctx.shadowBlur = 0;
          
          ctx.font = '10px "Share Tech Mono"';
          ctx.fillStyle = '#f00';
          ctx.textAlign = 'center';
          ctx.fillText('MINE', relX, relY - obs.r * scale - 10);
          
        } else {
          // Rock - green obstacle
          ctx.fillStyle = '#0a0';
          ctx.shadowColor = '#0f0';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(relX, relY, obs.r * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          
          ctx.strokeStyle = '#0f0';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(relX, relY, obs.r * scale, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.font = '9px "Share Tech Mono"';
          ctx.fillStyle = '#0f0';
          ctx.textAlign = 'center';
          ctx.fillText('ROCK', relX, relY - obs.r * scale - 8);
        }
        
        ctx.restore();
      }
    });

    // Submarine (center) - larger and more visible
    ctx.fillStyle = '#0ff';
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Sub body
    ctx.fillRect(-20, -6, 40, 12);
    
    // Direction indicator (speed)
    ctx.fillStyle = '#fff';
    ctx.fillRect(15, -3, sub.speed * 3, 6);
    
    ctx.shadowBlur = 0;

    // Range circle
    ctx.strokeStyle = 'rgba(0,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, 200, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();

    // HUD
    ctx.font = '11px "Share Tech Mono"';
    ctx.fillStyle = '#0f0';
    ctx.textAlign = 'left';
    ctx.fillText('SUB POSITION: ' + sub.x.toFixed(0) + ', ' + sub.y.toFixed(0), 10, 20);
    ctx.fillText('DISTANCE: ' + (sub.x - startX).toFixed(0) + 'm | SPEED: ' + sub.speed.toFixed(1) + 'm/s', 10, 40);
    ctx.fillText('DEPTH: ' + sub.depth.toFixed(0) + 'm | OXYGEN: ' + sub.oxygen.toFixed(0) + '%', 10, 60);
    
    if(obstacles.length === 0){
      ctx.fillStyle = '#ff0';
      ctx.fillText('⚠️ WAITING FOR OBSTACLE DATA...', 10, 80);
    } else {
      ctx.fillStyle = '#0ff';
      ctx.fillText('OBSTACLES: ' + obstacles.length + ' (CYAN=GOAL, RED=MINES, GREEN=ROCKS)', 10, 80);
    }
    
    ctx.fillStyle = '#0f0';
    ctx.textAlign = 'center';
    ctx.fillText('GUIDE CAPTAIN: AVOID RED/GREEN, REACH CYAN', canvas.width/2, canvas.height - 10);
  }

  function gameLoop(){
    if(!sub.alive || goalReached) return;

    // Update submarine position
    const oldX = sub.x;
    sub.x += sub.speed;
    
    if(Math.floor(oldX / 10) !== Math.floor(sub.x / 10)){
      console.log('Sub moving:', oldX.toFixed(1), '->', sub.x.toFixed(1), 'speed:', sub.speed);
    }

    // Update oxygen
    sub.oxygen -= 0.02;
    if(sub.oxygen <= 0){
      sub.alive = false;
      nm.sendData('game', {type: 'gameover', reason: 'oxygen'});
      audio.death();
      return;
    }

    // Update mines
    obstacles.forEach(obs => {
      if(obs.type === 'mine'){
        obs.x += obs.vx;
        obs.y += obs.vy;
        if(obs.x < 0 || obs.x > 2000) obs.vx *= -1;
        if(obs.y < 0 || obs.y > 600) obs.vy *= -1;
      }
    });

    // Collision detection
    obstacles.forEach(obs => {
      const dx = sub.x - obs.x;
      const dy = sub.y - obs.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if(obs.type === 'goal' && dist < obs.r + 20){
        goalReached = true;
        nm.sendData('game', {type: 'win'});
        audio.win();
        return;
      }

      if((obs.type === 'rock' || obs.type === 'mine') && dist < obs.r + 15){
        sub.alive = false;
        nm.sendData('game', {type: 'gameover', reason: 'collision'});
        audio.explosion();
        return;
      }
    });

    // Depth bounds
    if(sub.depth < 50) sub.depth = 50;
    if(sub.depth > 550){
      sub.alive = false;
      nm.sendData('game', {type: 'gameover', reason: 'crushed'});
      audio.explosion();
      return;
    }

    // Send state to client (always send obstacles)
    if(nm.conn && nm.conn.open){
      nm.sendData('state', {
        sub: sub,
        obstacles: obstacles
      });
    }
  }

  function radarLoop(){
    // Rotate radar
    radarAngle += 0.05;

    // Detect blips in sweep (even if obstacles not yet received)
    if(obstacles.length > 0){
      obstacles.forEach(obs => {
        const dx = obs.x - sub.x;
        const dy = obs.y - sub.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const angle = Math.atan2(dy, dx);

        // Extended range for better visibility
        if(dist < radarRange * 1.5){
          const angleDiff = Math.abs(((angle - radarAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
          if(angleDiff < 0.15){
            // Detected!
            const existing = detectedBlips.find(b => Math.abs(b.x - obs.x) < 5 && Math.abs(b.y - obs.y) < 5);
            if(!existing){
              detectedBlips.push({
                x: obs.x,
                y: obs.y,
                r: obs.r,
                type: obs.type,
                fade: 1
              });
              if(!obstaclesInitialized) audio.blip();
            } else {
              existing.fade = 1;
            }
          }
        }
      });
      obstaclesInitialized = true;
    }

    // Fade blips slower
    detectedBlips = detectedBlips.filter(blip => {
      blip.fade -= 0.005;
      return blip.fade > 0;
    });
  }

  function hostLoop(){
    drawCaptainView();
    animationId = requestAnimationFrame(hostLoop);
  }

  function clientLoop(){
    // Add to trail
    subTrail.push({x: sub.x, y: sub.y});
    if(subTrail.length > 100) subTrail.shift(); // Keep last 100 positions
    
    drawRadarView();
    animationId = requestAnimationFrame(clientLoop);
  }

  function startHostFlow(){
    generateObstacles();
    hostStatus.textContent = 'Initializing...';
    audio.startMusic();

    nm.startHost().then(code=>{
      role='host';
      roomCodeSpan.textContent = code;
      hostWrap.style.display='block';
      gameArea.style.display='block';
      controls.style.display='flex';
      controls.style.flexWrap='wrap';
      controls.style.justifyContent='center';
      gameStatus.textContent='You are CAPTAIN. Control depth and speed!';
      hostStatus.textContent = 'Waiting for radar operator...';
      hostStatus.style.color = '#ffd166';

      // Controls
      document.getElementById('surfaceBtn').addEventListener('click', () => {
        sub.depth = Math.max(50, sub.depth - 20);
        audio.click();
      });
      document.getElementById('diveBtn').addEventListener('click', () => {
        sub.depth = Math.min(550, sub.depth + 20);
        audio.click();
      });
      document.getElementById('speedUpBtn').addEventListener('click', () => {
        sub.speed = Math.min(sub.maxSpeed, sub.speed + 0.5);
        audio.click();
      });
      document.getElementById('slowDownBtn').addEventListener('click', () => {
        sub.speed = Math.max(sub.minSpeed, sub.speed - 0.5);
        audio.click();
      });

      nm.onData(packet=>{
        // Client doesn't send much, just receives state
      });

      // Start game loop immediately
      gameTimer = setInterval(gameLoop, 1000/30);
      console.log('Game loop started! Speed:', sub.speed, 'Position:', sub.x);
      hostLoop();

      const checkConn = setInterval(()=>{
        if(nm.conn && nm.conn.open){
          hostStatus.textContent='✅ Radar operator connected!';
          hostStatus.style.color='#0f0';
          // Send initial state with obstacles
          nm.sendData('state', {
            sub: sub,
            obstacles: obstacles
          });
          console.log('Host sending initial obstacles:', obstacles.length);
          clearInterval(checkConn);
        }
      }, 300);
    }).catch(err=>{
      hostStatus.textContent = '❌ Failed: ' + err.message;
      alert('Failed to create host. Please refresh and try again.\n\nError: ' + err.message);
    });
  }

  function startClientFlow(code){
    clientStatus.textContent = 'Connecting to room ' + code + '...';

    nm.joinRoom(code).then(()=>{
      role='client';
      clientWrap.style.display='none';
      gameArea.style.display='block';
      gameStatus.textContent='✅ Connected! You are RADAR. Guide the captain!';
      audio.click();
      audio.startMusic();

      nm.onData(packet=>{
        if(packet.type==='state'){
          const oldX = sub.x;
          sub.x = packet.payload.sub.x;
          sub.y = packet.payload.sub.y;
          sub.depth = packet.payload.sub.depth;
          sub.speed = packet.payload.sub.speed;
          sub.oxygen = packet.payload.sub.oxygen;
          sub.alive = packet.payload.sub.alive;
          
          if(Math.abs(oldX - sub.x) > 1){
            console.log('Client received position update:', oldX.toFixed(1), '->', sub.x.toFixed(1));
          }
          
          // Always update obstacles from host
          if(packet.payload.obstacles){
            obstacles = packet.payload.obstacles;
            if(obstacles.length > 0 && !obstaclesInitialized){
              console.log('Received obstacles:', obstacles.length);
              obstaclesInitialized = true;
            }
          }
        } else if(packet.type==='game'){
          if(packet.payload.type === 'win'){
            gameStatus.textContent = '🎉 GOAL REACHED! Mission Complete!';
            audio.win();
          } else if(packet.payload.type === 'gameover'){
            gameStatus.textContent = '💥 MISSION FAILED: ' + packet.payload.reason.toUpperCase();
            audio.explosion();
          }
        }
      });

      clientLoop();
    }).catch(err=>{
      clientStatus.textContent = '❌ ' + err.message;
      joinBtn.disabled = false;
      codeInput.disabled = false;
    });
  }

  hostBtn.addEventListener('click', ()=>{
    hostBtn.disabled=true; clientBtn.disabled=true;
    startHostFlow();
  });

  clientBtn.addEventListener('click', ()=>{
    hostBtn.disabled=true; clientBtn.disabled=true;
    clientWrap.style.display='block';
  });

  joinBtn.addEventListener('click', ()=>{
    const code = codeInput.value.trim().toUpperCase();
    if(!code || code.length !== 4){
      clientStatus.textContent = '⚠️ Please enter a 4-letter room code';
      return;
    }
    joinBtn.disabled = true;
    codeInput.disabled = true;
    startClientFlow(code);
  });
})();
