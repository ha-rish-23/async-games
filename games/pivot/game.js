// PIVOT! - F.R.I.E.N.D.S. Couch Scene Recreation
// Ross (Top View) vs Chandler (Bottom View) moving couch up L-shaped stairwell

const nm = new window.NetworkManager();
const audio = new window.AudioManager();

// Matter.js setup
const Engine = Matter.Engine;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;

let engine;
let world;
let couch; // The physics body (2 connected parts: front + back)
let couchFront, couchBack;

const gameState = {
  timeElapsed: 0,
  frustration: 0, // 0-100
  gameActive: false,
  timerInterval: null,
  pivotActive: false,
  pivotTimeRemaining: 0,
  lastRossPivot: 0,
  lastChandlerPivot: 0,
  couchBroken: false,
  stuckCounter: 0, // Frames couch has been stuck
  lastPosition: { x: 0, y: 0 }
};

let isRoss = false; // true = Ross (host), false = Chandler (client)

// L-shaped stairwell layout (physics units, 1 unit = 10px)
const STAIR_WIDTH = 80;
const STAIR_HEIGHT = 60;
const WALL_THICKNESS = 2;
const BANISTER_WIDTH = 1;

// Couch dimensions
const COUCH_LENGTH = 12; // Long couch
const COUCH_WIDTH = 4;

// Goal: get couch to top of stairs
const GOAL_Y = 5;

let walls = [];
let banister;

// Setup
document.getElementById('hostBtn').addEventListener('click', () => {
  document.querySelector('.role-select').style.display = 'none';
  document.getElementById('hostSetup').style.display = 'block';
});

document.getElementById('joinBtn').addEventListener('click', () => {
  document.querySelector('.role-select').style.display = 'none';
  document.getElementById('joinSetup').style.display = 'block';
});

document.getElementById('createRoomBtn').addEventListener('click', async () => {
  isRoss = true;
  
  try {
    const roomCode = await nm.startHost();
    document.getElementById('roomCodeDisplay').textContent = roomCode;
    document.getElementById('createRoomBtn').style.display = 'none';
    document.getElementById('waitingMsg').style.display = 'block';
    
    nm.onData((data) => onDataReceived(data));
    
    const checkConnection = setInterval(() => {
      if (nm.conn && nm.conn.open) {
        clearInterval(checkConnection);
        onPeerConnected();
      }
    }, 100);
    
  } catch (err) {
    alert('Failed to create room: ' + err.message);
  }
});

document.getElementById('joinRoomBtn').addEventListener('click', async () => {
  isRoss = false;
  const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  
  if (roomCode.length !== 4) {
    alert('Please enter a 4-character room code');
    return;
  }
  
  try {
    await nm.joinRoom(roomCode);
    nm.onData((data) => onDataReceived(data));
    onPeerConnected();
  } catch (err) {
    alert('Failed to join room: ' + err.message);
  }
});

document.getElementById('playAgainBtn')?.addEventListener('click', () => {
  location.reload();
});

// PIVOT button handlers
document.getElementById('rossPivotBtn')?.addEventListener('click', () => {
  pressPivot(true);
});

document.getElementById('chandlerPivotBtn')?.addEventListener('click', () => {
  pressPivot(false);
});

function pressPivot(isRossPress) {
  const now = Date.now();
  
  if (isRoss && isRossPress) {
    gameState.lastRossPivot = now;
    nm.sendData('pivot', { player: 'ross', time: now });
    document.getElementById('pivotSync').textContent = 'Waiting for Chandler...';
    audio.click();
  } else if (!isRoss && !isRossPress) {
    gameState.lastChandlerPivot = now;
    nm.sendData('pivot', { player: 'chandler', time: now });
    document.getElementById('pivotSyncChandler').textContent = 'Waiting for Ross...';
    audio.click();
  }
  
  checkPivotSync();
}

function checkPivotSync() {
  const timeDiff = Math.abs(gameState.lastRossPivot - gameState.lastChandlerPivot);
  
  if (timeDiff < 500 && gameState.lastRossPivot > 0 && gameState.lastChandlerPivot > 0) {
    // SUCCESS! Both pressed within 0.5s
    activatePivotMode();
  }
}

function activatePivotMode() {
  gameState.pivotActive = true;
  gameState.pivotTimeRemaining = 3000; // 3 seconds
  
  audio.win();
  
  // Visual feedback
  document.getElementById('rossPivotBtn')?.classList.add('active');
  document.getElementById('chandlerPivotBtn')?.classList.add('active');
  
  document.getElementById('pivotSync').textContent = '✓ PIVOT MODE ACTIVE!';
  document.getElementById('pivotSyncChandler').textContent = '✓ PIVOT MODE ACTIVE!';
  
  // Make couch more flexible (reduce friction, increase angular freedom)
  if (isRoss) {
    Body.set(couch, { friction: 0.2, frictionAir: 0.05 });
  }
  
  // Countdown
  const pivotInterval = setInterval(() => {
    gameState.pivotTimeRemaining -= 100;
    
    if (gameState.pivotTimeRemaining <= 0) {
      clearInterval(pivotInterval);
      deactivatePivotMode();
    } else {
      const secs = (gameState.pivotTimeRemaining / 1000).toFixed(1);
      document.getElementById('pivotSync').textContent = `PIVOT MODE: ${secs}s`;
      document.getElementById('pivotSyncChandler').textContent = `PIVOT MODE: ${secs}s`;
    }
  }, 100);
}

function deactivatePivotMode() {
  gameState.pivotActive = false;
  gameState.lastRossPivot = 0;
  gameState.lastChandlerPivot = 0;
  
  document.getElementById('rossPivotBtn')?.classList.remove('active');
  document.getElementById('chandlerPivotBtn')?.classList.remove('active');
  
  document.getElementById('pivotSync').textContent = '';
  document.getElementById('pivotSyncChandler').textContent = '';
  
  if (isRoss) {
    Body.set(couch, { friction: 0.8, frictionAir: 0.1 });
  }
}

// Network
function onPeerConnected() {
  if (isRoss) {
    document.getElementById('setupScreen').classList.remove('active');
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('rossView').style.display = 'flex';
    initializePhysics();
    startGame();
  } else {
    document.getElementById('setupScreen').classList.remove('active');
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('chandlerView').style.display = 'flex';
  }
}

function onDataReceived(data) {
  if (data.type === 'physicsState') {
    updateChandlerView(data.payload);
  } else if (data.type === 'rossInput') {
    handleRossInput(data.payload);
  } else if (data.type === 'chandlerInput') {
    handleChandlerInput(data.payload);
  } else if (data.type === 'pivot') {
    if (data.payload.player === 'ross') {
      gameState.lastRossPivot = data.payload.time;
    } else {
      gameState.lastChandlerPivot = data.payload.time;
    }
    checkPivotSync();
  } else if (data.type === 'gameEnd') {
    showResult(data.payload.success, data.payload.message);
  }
}

// Physics (Ross only)
function initializePhysics() {
  engine = Engine.create({
    gravity: { x: 0, y: 0 }
  });
  world = engine.world;
  
  // L-shaped stairwell walls
  // Bottom horizontal section
  const bottomWall = Bodies.rectangle(STAIR_WIDTH/2, STAIR_HEIGHT - WALL_THICKNESS/2, STAIR_WIDTH, WALL_THICKNESS, { isStatic: true });
  const leftWall = Bodies.rectangle(WALL_THICKNESS/2, STAIR_HEIGHT/2, WALL_THICKNESS, STAIR_HEIGHT, { isStatic: true });
  
  // Right wall (lower section before turn)
  const rightWallLower = Bodies.rectangle(STAIR_WIDTH - WALL_THICKNESS/2, 40, WALL_THICKNESS, 40, { isStatic: true });
  
  // Corner turn walls
  const cornerWallTop = Bodies.rectangle(40, 20, 40, WALL_THICKNESS, { isStatic: true });
  const cornerWallRight = Bodies.rectangle(60, 10, WALL_THICKNESS, 20, { isStatic: true });
  
  // Top section
  const topWall = Bodies.rectangle(30, WALL_THICKNESS/2, 60, WALL_THICKNESS, { isStatic: true });
  
  // Banister (the annoying obstacle)
  banister = Bodies.rectangle(45, 30, BANISTER_WIDTH, 30, { isStatic: true });
  
  walls = [bottomWall, leftWall, rightWallLower, cornerWallTop, cornerWallRight, topWall, banister];
  
  // Create couch (single rigid body, long rectangle)
  couch = Bodies.rectangle(10, 50, COUCH_LENGTH, COUCH_WIDTH, {
    density: 0.04,
    friction: 0.8,
    frictionAir: 0.1,
    restitution: 0.1,
    inertia: Infinity // Prevent unrealistic spinning
  });
  
  World.add(world, [...walls, couch]);
}

// Game loop
function startGame() {
  gameState.gameActive = true;
  gameState.timeElapsed = 0;
  gameState.frustration = 0;
  
  gameState.timerInterval = setInterval(() => {
    if (!isRoss) return;
    
    gameState.timeElapsed++;
    updateTimerDisplay();
    
    // Run physics
    Engine.update(engine, 16.67);
    
    // Check if couch is stuck (velocity near zero for too long)
    const vel = couch.velocity;
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
    const angularSpeed = Math.abs(couch.angularVelocity);
    
    // Only count as stuck after 5 seconds of game time (grace period)
    if (gameState.timeElapsed > 5) {
      // Check if couch hasn't moved much
      const dx = couch.position.x - gameState.lastPosition.x;
      const dy = couch.position.y - gameState.lastPosition.y;
      const positionChange = Math.sqrt(dx*dx + dy*dy);
      
      if (speed < 0.05 && angularSpeed < 0.01 && positionChange < 0.1 && !gameState.pivotActive) {
        gameState.stuckCounter++;
        
        // Only increase frustration if stuck for 3+ seconds (180 frames)
        if (gameState.stuckCounter > 180) {
          gameState.frustration += 0.1; // Much slower increase
        }
      } else {
        gameState.stuckCounter = 0;
        // Decrease frustration when moving
        if (speed > 0.05 || angularSpeed > 0.01) {
          gameState.frustration = Math.max(0, gameState.frustration - 0.3);
        }
      }
      
      // Update last position every second
      if (gameState.timeElapsed % 60 === 0) {
        gameState.lastPosition = { x: couch.position.x, y: couch.position.y };
      }
    }
    
    // Check win condition
    if (couch.position.y < GOAL_Y) {
      endGame(true, `SUCCESS! You got the couch upstairs in ${formatTime(gameState.timeElapsed)}!`);
    }
    
    // Check frustration limit
    if (gameState.frustration >= 100 && !gameState.couchBroken) {
      gameState.couchBroken = true;
      endGame(false, 'The couch broke in half from frustration! "PIVOT! PIVOT! PIVOT!"');
    }
    
    updateFrustrationMeter();
    sendPhysicsState();
    renderRossView();
  }, 16.67);
}

function sendPhysicsState() {
  if (!isRoss) return;
  
  nm.sendData('physicsState', {
    couch: {
      x: couch.position.x,
      y: couch.position.y,
      angle: couch.angle
    },
    time: gameState.timeElapsed,
    frustration: gameState.frustration
  });
}

// Ross controls (front of couch - pull and rotate)
if (isRoss) {
  document.addEventListener('keydown', (e) => {
    if (!gameState.gameActive) return;
    
    const key = e.key.toLowerCase();
    const force = gameState.pivotActive ? 0.004 : 0.002;
    const torque = gameState.pivotActive ? 0.003 : 0.001;
    
    // WASD = move front of couch
    // Q/E = rotate
    if (key === 'w') {
      Body.applyForce(couch, { x: couch.position.x + Math.cos(couch.angle) * 6, y: couch.position.y + Math.sin(couch.angle) * 6 }, 
        { x: Math.cos(couch.angle) * force, y: Math.sin(couch.angle) * force });
      audio.blip();
    } else if (key === 's') {
      Body.applyForce(couch, { x: couch.position.x + Math.cos(couch.angle) * 6, y: couch.position.y + Math.sin(couch.angle) * 6 }, 
        { x: -Math.cos(couch.angle) * force, y: -Math.sin(couch.angle) * force });
      audio.blip();
    } else if (key === 'a') {
      Body.applyForce(couch, { x: couch.position.x + Math.cos(couch.angle) * 6, y: couch.position.y + Math.sin(couch.angle) * 6 }, 
        { x: Math.cos(couch.angle - Math.PI/2) * force, y: Math.sin(couch.angle - Math.PI/2) * force });
      audio.blip();
    } else if (key === 'd') {
      Body.applyForce(couch, { x: couch.position.x + Math.cos(couch.angle) * 6, y: couch.position.y + Math.sin(couch.angle) * 6 }, 
        { x: Math.cos(couch.angle + Math.PI/2) * force, y: Math.sin(couch.angle + Math.PI/2) * force });
      audio.blip();
    } else if (key === 'q') {
      Body.setAngularVelocity(couch, -torque * 10);
      audio.blip();
    } else if (key === 'e') {
      Body.setAngularVelocity(couch, torque * 10);
      audio.blip();
    }
  });
}

// Chandler controls (back of couch - push and lift)
if (!isRoss) {
  document.addEventListener('keydown', (e) => {
    if (!gameState.gameActive) return;
    
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'q', 'e'].includes(key)) {
      nm.sendData('chandlerInput', { key });
      audio.blip();
      e.preventDefault();
    }
  });
}

function handleRossInput(input) {
  // Processed locally, no need
}

function handleChandlerInput(input) {
  if (!isRoss || !gameState.gameActive) return;
  
  const key = input.key;
  const force = gameState.pivotActive ? 0.004 : 0.002;
  
  // Chandler pushes BACK of couch
  // WASD = push/pull back
  // Q/E = lift/lower (vertical force)
  if (key === 'w') {
    Body.applyForce(couch, { x: couch.position.x - Math.cos(couch.angle) * 6, y: couch.position.y - Math.sin(couch.angle) * 6 }, 
      { x: Math.cos(couch.angle) * force, y: Math.sin(couch.angle) * force });
  } else if (key === 's') {
    Body.applyForce(couch, { x: couch.position.x - Math.cos(couch.angle) * 6, y: couch.position.y - Math.sin(couch.angle) * 6 }, 
      { x: -Math.cos(couch.angle) * force, y: -Math.sin(couch.angle) * force });
  } else if (key === 'a') {
    Body.applyForce(couch, { x: couch.position.x - Math.cos(couch.angle) * 6, y: couch.position.y - Math.sin(couch.angle) * 6 }, 
      { x: Math.cos(couch.angle - Math.PI/2) * force, y: Math.sin(couch.angle - Math.PI/2) * force });
  } else if (key === 'd') {
    Body.applyForce(couch, { x: couch.position.x - Math.cos(couch.angle) * 6, y: couch.position.y - Math.sin(couch.angle) * 6 }, 
      { x: Math.cos(couch.angle + Math.PI/2) * force, y: Math.sin(couch.angle + Math.PI/2) * force });
  } else if (key === 'q') {
    // Lift (upward force)
    Body.applyForce(couch, { x: couch.position.x - Math.cos(couch.angle) * 6, y: couch.position.y - Math.sin(couch.angle) * 6 }, 
      { x: 0, y: -force * 2 });
  } else if (key === 'e') {
    // Lower (downward force)
    Body.applyForce(couch, { x: couch.position.x - Math.cos(couch.angle) * 6, y: couch.position.y - Math.sin(couch.angle) * 6 }, 
      { x: 0, y: force * 2 });
  }
}

// Render Ross's view (top-down)
function renderRossView() {
  const canvas = document.getElementById('topCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const scale = 10;
  
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw stairwell walls
  ctx.fillStyle = '#667eea';
  walls.forEach(wall => {
    const w = wall.bounds.max.x - wall.bounds.min.x;
    const h = wall.bounds.max.y - wall.bounds.min.y;
    ctx.fillRect(
      (wall.position.x - w/2) * scale,
      (wall.position.y - h/2) * scale,
      w * scale,
      h * scale
    );
  });
  
  // Draw banister highlight
  ctx.fillStyle = '#f97316';
  const bw = banister.bounds.max.x - banister.bounds.min.x;
  const bh = banister.bounds.max.y - banister.bounds.min.y;
  ctx.fillRect(
    (banister.position.x - bw/2) * scale,
    (banister.position.y - bh/2) * scale,
    bw * scale,
    bh * scale
  );
  
  // Draw goal area
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(0, 0, 600, GOAL_Y * scale);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('GOAL', 300, 30);
  
  // Draw couch
  ctx.save();
  ctx.translate(couch.position.x * scale, couch.position.y * scale);
  ctx.rotate(couch.angle);
  
  if (gameState.couchBroken) {
    // Broken in half
    ctx.fillStyle = '#8b4f5c';
    ctx.fillRect(-COUCH_LENGTH/4 * scale, -COUCH_WIDTH/2 * scale, COUCH_LENGTH/2 * scale, COUCH_WIDTH * scale);
    ctx.fillRect(COUCH_LENGTH/4 * scale, -COUCH_WIDTH/2 * scale, COUCH_LENGTH/2 * scale, COUCH_WIDTH * scale);
  } else {
    ctx.fillStyle = gameState.pivotActive ? '#4ade80' : '#f5576c';
    ctx.fillRect(-COUCH_LENGTH/2 * scale, -COUCH_WIDTH/2 * scale, COUCH_LENGTH * scale, COUCH_WIDTH * scale);
    
    // Front marker
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(COUCH_LENGTH/2 * scale - 10, -COUCH_WIDTH/2 * scale, 5, COUCH_WIDTH * scale);
  }
  
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(-COUCH_LENGTH/2 * scale, -COUCH_WIDTH/2 * scale, COUCH_LENGTH * scale, COUCH_WIDTH * scale);
  ctx.restore();
  
  // Instructions
  ctx.fillStyle = '#a8b2d1';
  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('You are at the FRONT (yellow end)', 10, canvas.height - 10);
}

// Render Chandler's view (bottom-up, inverted)
let chandlerState = null;

function updateChandlerView(state) {
  chandlerState = state;
  
  document.getElementById('timeDisplayChandler').textContent = `Time: ${formatTime(state.time)}`;
  gameState.frustration = state.frustration;
  updateFrustrationMeter();
  
  renderChandlerView();
}

function renderChandlerView() {
  const canvas = document.getElementById('bottomCanvas');
  if (!canvas || !chandlerState) return;
  
  const ctx = canvas.getContext('2d');
  const scale = 10;
  
  // INVERTED VIEW (flipped 180°)
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(Math.PI); // 180° rotation
  ctx.translate(-canvas.width / 2, -canvas.height / 2);
  
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw stairwell walls (simplified, Chandler can't see full layout)
  ctx.fillStyle = '#667eea';
  ctx.fillRect(0, 0, 20, canvas.height); // Left wall
  ctx.fillRect(canvas.width - 20, 0, 20, canvas.height); // Right wall
  ctx.fillRect(0, canvas.height - 20, canvas.width, 20); // Floor
  
  // Draw couch
  const couchX = chandlerState.couch.x * scale;
  const couchY = chandlerState.couch.y * scale;
  
  ctx.save();
  ctx.translate(couchX, couchY);
  ctx.rotate(chandlerState.couch.angle);
  
  ctx.fillStyle = gameState.pivotActive ? '#4ade80' : '#f5576c';
  ctx.fillRect(-COUCH_LENGTH/2 * scale, -COUCH_WIDTH/2 * scale, COUCH_LENGTH * scale, COUCH_WIDTH * scale);
  
  // Back marker (where Chandler is)
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(-COUCH_LENGTH/2 * scale, -COUCH_WIDTH/2 * scale, 5, COUCH_WIDTH * scale);
  
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(-COUCH_LENGTH/2 * scale, -COUCH_WIDTH/2 * scale, COUCH_LENGTH * scale, COUCH_WIDTH * scale);
  ctx.restore();
  
  ctx.restore(); // End inverted view
  
  // Instructions (not inverted)
  ctx.fillStyle = '#a8b2d1';
  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('You are at the BACK (yellow end)', 10, canvas.height - 10);
  ctx.fillText('[View is upside-down from Ross!]', 10, canvas.height - 30);
}

// UI Updates
function updateTimerDisplay() {
  const timeStr = formatTime(gameState.timeElapsed);
  const timeEl = document.getElementById('timeDisplay');
  if (timeEl) timeEl.textContent = `Time: ${timeStr}`;
}

function updateFrustrationMeter() {
  const fill = Math.min(100, Math.max(0, gameState.frustration));
  
  const fillEl = document.getElementById('frustrationFill');
  const fillElC = document.getElementById('frustrationFillChandler');
  
  if (fillEl) fillEl.style.width = fill + '%';
  if (fillElC) fillElC.style.width = fill + '%';
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// End game
function endGame(success, message) {
  if (!gameState.gameActive) return;
  
  gameState.gameActive = false;
  clearInterval(gameState.timerInterval);
  
  if (success) {
    audio.win();
  } else {
    audio.explosion();
  }
  
  nm.sendData('gameEnd', { success, message });
  showResult(success, message);
}

function showResult(success, message) {
  document.getElementById('rossView')?.style.setProperty('display', 'none');
  document.getElementById('chandlerView')?.style.setProperty('display', 'none');
  
  const resultScreen = document.getElementById('resultScreen');
  resultScreen.style.display = 'block';
  
  document.getElementById('resultTitle').textContent = success ? '✅ SUCCESS!' : '💔 COUCH BROKEN!';
  document.getElementById('resultMessage').textContent = message;
  document.getElementById('finalTime').textContent = `Time: ${formatTime(gameState.timeElapsed)}`;
  document.getElementById('finalMoves').textContent = success ? 'You did it!' : 'PIVOT! PIVOT! PIVOT!';
}
