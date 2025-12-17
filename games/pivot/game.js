// PIVOT! - Physics-based Couch Moving Game
// Navigator sees top-down, Mover sees first-person

const nm = new window.NetworkManager();
const audio = new window.AudioManager();

// Matter.js setup
const Engine = Matter.Engine;
const Render = Matter.Render;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Vector = Matter.Vector;

let engine;
let world;
let couch; // The main physics body
let player; // Mover's position and rotation
let walls = [];

const gameState = {
  timeElapsed: 0,
  moveCount: 0,
  gameActive: false,
  timerInterval: null,
  level: 1
};

let isHost = false; // Host = Navigator, Client = Mover

// Room layout (in physics units, 1 unit = 10 pixels)
const ROOM_WIDTH = 80; // 800px
const ROOM_HEIGHT = 60; // 600px
const WALL_THICKNESS = 2;

// Couch dimensions (typical couch: ~7ft x 3ft, scaled down)
const COUCH_WIDTH = 8;
const COUCH_HEIGHT = 4;

// Goal position (doorway)
const GOAL = { x: 75, y: 30, width: 2, height: 10 };

// Setup event listeners
document.getElementById('hostBtn').addEventListener('click', () => {
  document.querySelector('.role-select').style.display = 'none';
  document.getElementById('hostSetup').style.display = 'block';
});

document.getElementById('joinBtn').addEventListener('click', () => {
  document.querySelector('.role-select').style.display = 'none';
  document.getElementById('joinSetup').style.display = 'block';
});

document.getElementById('createRoomBtn').addEventListener('click', async () => {
  isHost = true;
  
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
    console.error('Failed to create room:', err);
    alert('Failed to create room: ' + err.message);
  }
});

document.getElementById('joinRoomBtn').addEventListener('click', async () => {
  isHost = false;
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
    console.error('Failed to join room:', err);
    alert('Failed to join room: ' + err.message);
  }
});

document.getElementById('playAgainBtn').addEventListener('click', () => {
  location.reload();
});

// Chat functionality
document.getElementById('sendChatBtn')?.addEventListener('click', sendChat);
document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendChat();
});

function sendChat() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  
  const message = input.value.trim();
  if (message.length === 0) return;
  
  nm.sendData('chat', { message });
  displayChat(message, true);
  input.value = '';
}

function displayChat(message, isSelf = false) {
  const container = document.getElementById('chatMessages') || document.getElementById('chatDisplay');
  if (!container) return;
  
  const msgEl = document.createElement('div');
  msgEl.className = 'chat-message' + (isSelf ? ' navigator' : '');
  msgEl.textContent = (isSelf ? 'You: ' : 'Navigator: ') + message;
  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
}

// Network callbacks
function onPeerConnected() {
  console.log('Peer connected!');
  
  if (isHost) {
    // Navigator view
    document.getElementById('setupScreen').classList.remove('active');
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('navigatorView').style.display = 'flex';
    initializePhysics();
    startGame();
    renderTopDown();
  } else {
    // Mover view
    document.getElementById('setupScreen').classList.remove('active');
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('moverView').style.display = 'flex';
    // Wait for physics state from host
  }
}

function onDataReceived(data) {
  console.log('Received:', data.type);
  
  if (data.type === 'physicsState') {
    // Mover receives state updates
    updateMoverView(data.payload);
  } else if (data.type === 'playerInput') {
    // Navigator receives Mover's input
    handlePlayerInput(data.payload);
  } else if (data.type === 'chat') {
    displayChat(data.payload.message, false);
  } else if (data.type === 'gameEnd') {
    showResult(data.payload.success, data.payload.message);
  }
}

// Physics Initialization (Host only)
function initializePhysics() {
  engine = Engine.create({
    gravity: { x: 0, y: 0 } // Top-down, no gravity
  });
  world = engine.world;
  
  // Create walls
  const topWall = Bodies.rectangle(ROOM_WIDTH/2, WALL_THICKNESS/2, ROOM_WIDTH, WALL_THICKNESS, { isStatic: true });
  const bottomWall = Bodies.rectangle(ROOM_WIDTH/2, ROOM_HEIGHT - WALL_THICKNESS/2, ROOM_WIDTH, WALL_THICKNESS, { isStatic: true });
  const leftWall = Bodies.rectangle(WALL_THICKNESS/2, ROOM_HEIGHT/2, WALL_THICKNESS, ROOM_HEIGHT, { isStatic: true });
  
  // Right wall with doorway gap
  const rightWallTop = Bodies.rectangle(ROOM_WIDTH - WALL_THICKNESS/2, 15, WALL_THICKNESS, 30, { isStatic: true });
  const rightWallBottom = Bodies.rectangle(ROOM_WIDTH - WALL_THICKNESS/2, 45, WALL_THICKNESS, 30, { isStatic: true });
  
  walls = [topWall, bottomWall, leftWall, rightWallTop, rightWallBottom];
  
  // Add obstacles (narrow hallway, corners, etc.)
  const obstacle1 = Bodies.rectangle(40, 20, 15, 3, { isStatic: true });
  const obstacle2 = Bodies.rectangle(40, 40, 15, 3, { isStatic: true });
  const obstacle3 = Bodies.rectangle(25, 30, 3, 15, { isStatic: true });
  
  walls.push(obstacle1, obstacle2, obstacle3);
  
  // Create couch (rectangular physics body)
  couch = Bodies.rectangle(15, 30, COUCH_WIDTH, COUCH_HEIGHT, {
    density: 0.04,
    friction: 0.8,
    frictionAir: 0.1,
    restitution: 0.3,
    inertia: Infinity // Prevent unrealistic spinning
  });
  
  // Player (Mover) position
  player = {
    x: 10,
    y: 30,
    angle: 0 // Facing direction in radians
  };
  
  World.add(world, [...walls, couch]);
  
  console.log('Physics initialized:', { couch: couch.position, player });
}

// Start game timer
function startGame() {
  gameState.gameActive = true;
  gameState.timeElapsed = 0;
  gameState.moveCount = 0;
  
  gameState.timerInterval = setInterval(() => {
    gameState.timeElapsed++;
    updateTimerDisplay();
    
    if (isHost) {
      // Run physics simulation
      Engine.update(engine, 16.67); // ~60fps
      
      // Check win condition
      const couchPos = couch.position;
      if (couchPos.x > GOAL.x && Math.abs(couchPos.y - GOAL.y) < GOAL.height/2) {
        endGame(true, `Success! Moved the couch in ${formatTime(gameState.timeElapsed)} with ${gameState.moveCount} moves!`);
      }
      
      // Send state to mover
      sendPhysicsState();
      renderTopDown();
    }
  }, 16.67); // ~60fps
}

function sendPhysicsState() {
  if (!isHost) return;
  
  nm.sendData('physicsState', {
    couch: {
      x: couch.position.x,
      y: couch.position.y,
      angle: couch.angle
    },
    player: player,
    time: gameState.timeElapsed,
    moves: gameState.moveCount
  });
}

// Handle Mover input (runs on host)
function handlePlayerInput(input) {
  if (!gameState.gameActive || !isHost) return;
  
  const { key } = input;
  const force = 0.002; // Push force
  const rotSpeed = 0.05;
  
  // Update player position/rotation
  if (key === 'w' || key === 'arrowup') {
    player.x += Math.cos(player.angle) * 0.5;
    player.y += Math.sin(player.angle) * 0.5;
  } else if (key === 's' || key === 'arrowdown') {
    player.x -= Math.cos(player.angle) * 0.5;
    player.y -= Math.sin(player.angle) * 0.5;
  } else if (key === 'a' || key === 'arrowleft') {
    player.x += Math.cos(player.angle - Math.PI/2) * 0.5;
    player.y += Math.sin(player.angle - Math.PI/2) * 0.5;
  } else if (key === 'd' || key === 'arrowright') {
    player.x += Math.cos(player.angle + Math.PI/2) * 0.5;
    player.y += Math.sin(player.angle + Math.PI/2) * 0.5;
  } else if (key === 'q') {
    player.angle -= rotSpeed;
  } else if (key === 'e') {
    player.angle += rotSpeed;
  }
  
  // Keep player in bounds
  player.x = Math.max(2, Math.min(ROOM_WIDTH - 2, player.x));
  player.y = Math.max(2, Math.min(ROOM_HEIGHT - 2, player.y));
  
  // Apply force to couch if close enough
  const dx = couch.position.x - player.x;
  const dy = couch.position.y - player.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  
  if (dist < 10) { // Within push range
    const pushAngle = Math.atan2(dy, dx);
    const fx = Math.cos(pushAngle) * force;
    const fy = Math.sin(pushAngle) * force;
    
    Body.applyForce(couch, couch.position, { x: fx, y: fy });
    gameState.moveCount++;
    audio.click();
  }
}

// Render top-down view (Navigator)
function renderTopDown() {
  const canvas = document.getElementById('topDownCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const scale = 10; // 1 physics unit = 10 pixels
  
  // Clear
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw walls
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
  
  // Draw goal (doorway)
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(GOAL.x * scale, (GOAL.y - GOAL.height/2) * scale, GOAL.width * scale, GOAL.height * scale);
  ctx.font = '14px Arial';
  ctx.fillText('EXIT', (GOAL.x - 5) * scale, (GOAL.y - GOAL.height/2 - 1) * scale);
  
  // Draw couch
  ctx.save();
  ctx.translate(couch.position.x * scale, couch.position.y * scale);
  ctx.rotate(couch.angle);
  ctx.fillStyle = '#f5576c';
  ctx.fillRect(-COUCH_WIDTH/2 * scale, -COUCH_HEIGHT/2 * scale, COUCH_WIDTH * scale, COUCH_HEIGHT * scale);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(-COUCH_WIDTH/2 * scale, -COUCH_HEIGHT/2 * scale, COUCH_WIDTH * scale, COUCH_HEIGHT * scale);
  ctx.restore();
  
  // Draw player (Mover) position
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(player.x * scale, player.y * scale, 5, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw player facing direction
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(player.x * scale, player.y * scale);
  ctx.lineTo(
    (player.x + Math.cos(player.angle) * 3) * scale,
    (player.y + Math.sin(player.angle) * 3) * scale
  );
  ctx.stroke();
  
  // Distance to goal indicator
  const distToGoal = Math.sqrt(
    Math.pow(couch.position.x - GOAL.x, 2) + 
    Math.pow(couch.position.y - GOAL.y, 2)
  );
  ctx.fillStyle = '#a8b2d1';
  ctx.font = '16px Arial';
  ctx.fillText(`Distance to goal: ${distToGoal.toFixed(1)}m`, 10, 20);
}

// Update Mover's first-person view
let moverState = null;

function updateMoverView(state) {
  moverState = state;
  
  // Update time display
  document.getElementById('timeDisplayMover').textContent = `Time: ${formatTime(state.time)}`;
  
  renderFirstPerson();
}

// Render first-person view (Mover)
function renderFirstPerson() {
  const canvas = document.getElementById('firstPersonCanvas');
  if (!canvas || !moverState) return;
  
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  
  // Clear with floor/ceiling gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1a1a2e'); // Ceiling
  grad.addColorStop(0.5, '#2d1b4e'); // Horizon
  grad.addColorStop(1, '#1a1a2e'); // Floor
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  
  // Draw floor grid for depth perception
  ctx.strokeStyle = 'rgba(102, 126, 234, 0.2)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    const y = h/2 + i * 30;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  
  const { couch: couchState, player: playerState } = moverState;
  
  // Calculate relative position
  const dx = couchState.x - playerState.x;
  const dy = couchState.y - playerState.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  
  // Rotate to player's perspective
  const angle = Math.atan2(dy, dx) - playerState.angle;
  
  // IMPROVED 3D COUCH VIEW
  if (dist < 30 && dist > 0.1) {
    const perspective = Math.min(200 / Math.max(dist, 1), 150);
    const screenX = w/2 + Math.sin(angle) * perspective * 3;
    const screenY = h/2 + 50 - (perspective * 0.5); // Vertical position based on distance
    
    const couchWidth = COUCH_WIDTH * perspective;
    const couchDepth = COUCH_HEIGHT * perspective;
    
    ctx.save();
    ctx.translate(screenX, screenY);
    
    const relativeAngle = couchState.angle - playerState.angle;
    ctx.rotate(relativeAngle);
    
    // 3D-ish couch with depth
    // Back cushion (darker)
    ctx.fillStyle = '#5a3a47';
    ctx.fillRect(-couchWidth/2 - 5, -couchDepth/2 - 15, couchWidth + 10, 15);
    
    // Seat (main color)
    ctx.fillStyle = '#8b4f5c';
    ctx.fillRect(-couchWidth/2, -couchDepth/2, couchWidth, couchDepth);
    
    // Armrests (3D effect)
    ctx.fillStyle = '#6b3a47';
    ctx.fillRect(-couchWidth/2 - 8, -couchDepth/2, 8, couchDepth);
    ctx.fillRect(couchWidth/2, -couchDepth/2, 8, couchDepth);
    
    // Outline
    ctx.strokeStyle = '#f5576c';
    ctx.lineWidth = 3;
    ctx.strokeRect(-couchWidth/2, -couchDepth/2, couchWidth, couchDepth);
    
    // Shadow for depth
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(-couchWidth/2 - 2, couchDepth/2, couchWidth + 4, 8);
    
    ctx.restore();
    
    // Distance indicator
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${dist.toFixed(1)}m`, w/2, 50);
  } else if (dist >= 30) {
    // Too far away
    ctx.fillStyle = '#f5576c';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('COUCH IS TOO FAR!', w/2, h/2);
    ctx.font = '18px Arial';
    ctx.fillStyle = '#a8b2d1';
    ctx.fillText('Ask Navigator for directions', w/2, h/2 + 40);
  } else if (dist <= 0.1) {
    // Too close
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TOO CLOSE!', w/2, h/2);
    ctx.font = '18px Arial';
    ctx.fillText('Back up a bit', w/2, h/2 + 40);
  }
  
  // Mini-map in corner
  const miniSize = 150;
  const miniX = w - miniSize - 20;
  const miniY = 20;
  const scale = miniSize / ROOM_WIDTH;
  
  // Mini-map background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(miniX, miniY, miniSize, miniSize * ROOM_HEIGHT / ROOM_WIDTH);
  
  // Mini-map couch
  ctx.fillStyle = '#f5576c';
  ctx.fillRect(
    miniX + couchState.x * scale - 2,
    miniY + couchState.y * scale - 2,
    4, 4
  );
  
  // Mini-map player
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(
    miniX + playerState.x * scale,
    miniY + playerState.y * scale,
    3, 0, Math.PI * 2
  );
  ctx.fill();
  
  // Mini-map goal
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(
    miniX + GOAL.x * scale,
    miniY + (GOAL.y - GOAL.height/2) * scale,
    2,
    GOAL.height * scale
  );
  
  // Instructions
  ctx.fillStyle = '#667eea';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('WASD = Move & Push', 20, 30);
  ctx.fillText('Q/E = Rotate View', 20, 55);
  
  ctx.textAlign = 'center';
}

// Mover controls (send to host)
if (!isHost) {
  document.addEventListener('keydown', (e) => {
    if (!gameState.gameActive && !moverState) return;
    
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      nm.sendData('playerInput', { key });
      e.preventDefault();
    }
  });
}

// Timer display
function updateTimerDisplay() {
  const timeStr = formatTime(gameState.timeElapsed);
  const timeEl = document.getElementById('timeDisplay');
  const movesEl = document.getElementById('movesDisplay');
  
  if (timeEl) timeEl.textContent = `Time: ${timeStr}`;
  if (movesEl) movesEl.textContent = `Moves: ${gameState.moveCount}`;
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
  }
  
  // Send result to both players
  nm.sendData('gameEnd', { success, message });
  showResult(success, message);
}

function showResult(success, message) {
  document.getElementById('navigatorView')?.style.setProperty('display', 'none');
  document.getElementById('moverView')?.style.setProperty('display', 'none');
  
  const resultScreen = document.getElementById('resultScreen');
  resultScreen.style.display = 'block';
  
  document.getElementById('resultTitle').textContent = success ? '🎉 SUCCESS!' : '❌ Failed';
  document.getElementById('resultMessage').textContent = message;
  document.getElementById('finalTime').textContent = `Time: ${formatTime(gameState.timeElapsed)}`;
  document.getElementById('finalMoves').textContent = `Moves: ${gameState.moveCount}`;
}
