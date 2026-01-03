// Demogorgon Hunt - Asymmetric Hide and Seek
const nm = new window.NetworkManager();
const audio = new window.AudioManager();

const gameState = {
  role: null, // 'hunter' or 'hider'
  isHost: false,
  gameStarted: false,
  timeRemaining: 180, // 3 minutes
  hunterPos: { x: 400, y: 300 },
  hiderPos: { x: 200, y: 150 },
  hunterVel: { x: 0, y: 0 },
  hiderVel: { x: 0, y: 0 },
  sonarCooldown: 0,
  sonarActive: false,
  detectionDistance: 0,
  noiseLevel: 0,
  isCaught: false,
  keys: {}
};

const CONFIG = {
  moveSpeed: 3,
  slowSpeed: 1.5,
  hunterDetectRadius: 80,
  sonarRadius: 300,
  sonarCooldownTime: 5000,
  sonarDuration: 1000,
  canvasWidth: 800,
  canvasHeight: 600
};

let hunterCanvas, hunterCtx;
let hiderCanvas, hiderCtx;
let gameLoop;

// Setup
document.getElementById('hostBtn').addEventListener('click', () => {
  document.querySelector('.role-select').style.display = 'none';
  document.getElementById('hostSetup').style.display = 'block';
  gameState.isHost = true;
});

document.getElementById('joinBtn').addEventListener('click', () => {
  document.querySelector('.role-select').style.display = 'none';
  document.getElementById('joinSetup').style.display = 'block';
});

// Role Selection
document.getElementById('selectHunter').addEventListener('click', () => {
  selectRole('hunter');
});

document.getElementById('selectHider').addEventListener('click', () => {
  selectRole('hider');
});

function selectRole(role) {
  document.querySelectorAll('.role-card').forEach(card => card.classList.remove('selected'));
  
  if (role === 'hunter') {
    document.getElementById('selectHunter').classList.add('selected');
    gameState.role = 'hunter';
    document.getElementById('roleChoice').textContent = 'You are the HUNTER';
  } else {
    document.getElementById('selectHider').classList.add('selected');
    gameState.role = 'hider';
    document.getElementById('roleChoice').textContent = 'You are the HIDER';
  }
  
  document.getElementById('roleConfirm').style.display = 'block';
}

document.getElementById('createRoomBtn').addEventListener('click', async () => {
  if (!gameState.role) {
    alert('Please select a role first');
    return;
  }
  
  try {
    const roomCode = await nm.startHost();
    document.getElementById('roomCodeDisplay').textContent = roomCode;
    document.getElementById('createRoomBtn').style.display = 'none';
    document.getElementById('waitingForPeer').style.display = 'block';
    
    nm.onData((data) => onDataReceived(data));
    
    const checkConnection = setInterval(() => {
      if (nm.conn && nm.conn.open) {
        clearInterval(checkConnection);
        // Send role to peer
        nm.sendData('hostRole', { role: gameState.role });
        startGame();
      }
    }, 100);
    
  } catch (err) {
    alert('Failed to create room: ' + err.message);
  }
});

document.getElementById('joinRoomBtn').addEventListener('click', async () => {
  const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  
  if (roomCode.length !== 4) {
    alert('Please enter a 4-character room code');
    return;
  }
  
  try {
    await nm.joinRoom(roomCode);
    nm.onData((data) => onDataReceived(data));
  } catch (err) {
    alert('Failed to join room: ' + err.message);
  }
});

// Network
function onDataReceived(data) {
  if (data.type === 'hostRole') {
    // Assign opposite role
    gameState.role = data.payload.role === 'hunter' ? 'hider' : 'hunter';
    startGame();
  } else if (data.type === 'posUpdate') {
    if (gameState.role === 'hunter') {
      gameState.hiderPos = data.payload.pos;
      gameState.noiseLevel = data.payload.noise;
    } else {
      gameState.hunterPos = data.payload.pos;
    }
  } else if (data.type === 'sonarPulse') {
    if (gameState.role === 'hider') {
      gameState.sonarActive = true;
      setTimeout(() => {
        gameState.sonarActive = false;
      }, CONFIG.sonarDuration);
    }
  } else if (data.type === 'caught') {
    endGame('hunter');
  } else if (data.type === 'escaped') {
    endGame('hider');
  }
}

// Game Start
function startGame() {
  document.getElementById('setupScreen').classList.remove('active');
  
  if (gameState.role === 'hunter') {
    document.getElementById('hunterScreen').style.display = 'flex';
    hunterCanvas = document.getElementById('hunterCanvas');
    hunterCtx = hunterCanvas.getContext('2d');
    setupHunterControls();
  } else {
    document.getElementById('hiderScreen').style.display = 'flex';
    hiderCanvas = document.getElementById('hiderCanvas');
    hiderCtx = hiderCanvas.getContext('2d');
    setupHiderControls();
  }
  
  setupKeyboard();
  gameState.gameStarted = true;
  gameLoop = setInterval(update, 1000 / 60); // 60 FPS
  
  // Timer
  const timerInterval = setInterval(() => {
    gameState.timeRemaining--;
    updateTimer();
    
    if (gameState.timeRemaining <= 0) {
      clearInterval(timerInterval);
      if (gameState.isHost) {
        nm.sendData('escaped', {});
      }
      endGame('hider');
    }
  }, 1000);
}

// Controls
function setupKeyboard() {
  window.addEventListener('keydown', (e) => {
    gameState.keys[e.key.toLowerCase()] = true;
  });
  
  window.addEventListener('keyup', (e) => {
    gameState.keys[e.key.toLowerCase()] = false;
  });
}

function setupHunterControls() {
  document.getElementById('sonarBtn').addEventListener('click', useSonar);
}

function setupHiderControls() {
  // No extra controls needed
}

function useSonar() {
  if (gameState.sonarCooldown > 0) return;
  
  gameState.sonarCooldown = CONFIG.sonarCooldownTime;
  gameState.sonarActive = true;
  
  nm.sendData('sonarPulse', {});
  audio.blip();
  
  setTimeout(() => {
    gameState.sonarActive = false;
  }, CONFIG.sonarDuration);
  
  const btn = document.getElementById('sonarBtn');
  btn.disabled = true;
}

// Update Loop
function update() {
  if (!gameState.gameStarted) return;
  
  // Update cooldowns
  if (gameState.sonarCooldown > 0) {
    gameState.sonarCooldown -= 1000 / 60;
    if (gameState.sonarCooldown <= 0) {
      gameState.sonarCooldown = 0;
      if (gameState.role === 'hunter') {
        document.getElementById('sonarBtn').disabled = false;
      }
    }
  }
  
  // Movement
  if (gameState.role === 'hunter') {
    updateHunterMovement();
    checkCapture();
    renderHunter();
  } else {
    updateHiderMovement();
    renderHider();
  }
  
  // Send position
  if (gameState.role === 'hunter') {
    nm.sendData('posUpdate', { 
      pos: gameState.hunterPos,
      noise: 0
    });
  } else {
    nm.sendData('posUpdate', { 
      pos: gameState.hiderPos,
      noise: gameState.noiseLevel
    });
  }
}

function updateHunterMovement() {
  gameState.hunterVel = { x: 0, y: 0 };
  
  if (gameState.keys['w']) gameState.hunterVel.y = -CONFIG.moveSpeed;
  if (gameState.keys['s']) gameState.hunterVel.y = CONFIG.moveSpeed;
  if (gameState.keys['a']) gameState.hunterVel.x = -CONFIG.moveSpeed;
  if (gameState.keys['d']) gameState.hunterVel.x = CONFIG.moveSpeed;
  
  gameState.hunterPos.x += gameState.hunterVel.x;
  gameState.hunterPos.y += gameState.hunterVel.y;
  
  // Bounds
  gameState.hunterPos.x = Math.max(20, Math.min(CONFIG.canvasWidth - 20, gameState.hunterPos.x));
  gameState.hunterPos.y = Math.max(20, Math.min(CONFIG.canvasHeight - 20, gameState.hunterPos.y));
}

function updateHiderMovement() {
  const isSlow = gameState.keys['shift'];
  const speed = isSlow ? CONFIG.slowSpeed : CONFIG.moveSpeed;
  
  gameState.hiderVel = { x: 0, y: 0 };
  
  if (gameState.keys['w']) gameState.hiderVel.y = -speed;
  if (gameState.keys['s']) gameState.hiderVel.y = speed;
  if (gameState.keys['a']) gameState.hiderVel.x = -speed;
  if (gameState.keys['d']) gameState.hiderVel.x = speed;
  
  gameState.hiderPos.x += gameState.hiderVel.x;
  gameState.hiderPos.y += gameState.hiderVel.y;
  
  // Bounds
  gameState.hiderPos.x = Math.max(20, Math.min(CONFIG.canvasWidth - 20, gameState.hiderPos.x));
  gameState.hiderPos.y = Math.max(20, Math.min(CONFIG.canvasHeight - 20, gameState.hiderPos.y));
  
  // Noise level
  const isMoving = gameState.hiderVel.x !== 0 || gameState.hiderVel.y !== 0;
  if (isMoving) {
    gameState.noiseLevel = isSlow ? 20 : 80;
  } else {
    gameState.noiseLevel = 0;
  }
  
  updateNoiseBar();
}

function checkCapture() {
  const dx = gameState.hunterPos.x - gameState.hiderPos.x;
  const dy = gameState.hunterPos.y - gameState.hiderPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  gameState.detectionDistance = distance;
  updateDetectionMeter();
  
  if (distance < CONFIG.hunterDetectRadius) {
    if (gameState.isHost) {
      nm.sendData('caught', {});
    }
    endGame('hunter');
  }
}

// Rendering
function renderHunter() {
  hunterCtx.fillStyle = '#0a0614';
  hunterCtx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
  
  // Draw trees (obstacles)
  drawForest(hunterCtx);
  
  // Hunter (self)
  hunterCtx.fillStyle = '#ff6b35';
  hunterCtx.shadowBlur = 20;
  hunterCtx.shadowColor = '#ff6b35';
  hunterCtx.beginPath();
  hunterCtx.arc(gameState.hunterPos.x, gameState.hunterPos.y, 15, 0, Math.PI * 2);
  hunterCtx.fill();
  hunterCtx.shadowBlur = 0;
  
  // Detection radius
  hunterCtx.strokeStyle = 'rgba(255, 107, 53, 0.3)';
  hunterCtx.lineWidth = 2;
  hunterCtx.beginPath();
  hunterCtx.arc(gameState.hunterPos.x, gameState.hunterPos.y, CONFIG.hunterDetectRadius, 0, Math.PI * 2);
  hunterCtx.stroke();
  
  // Sonar pulse
  if (gameState.sonarActive) {
    const pulseRadius = CONFIG.sonarRadius * (1 - gameState.sonarCooldown / CONFIG.sonarDuration);
    hunterCtx.strokeStyle = 'rgba(255, 107, 53, 0.8)';
    hunterCtx.lineWidth = 3;
    hunterCtx.beginPath();
    hunterCtx.arc(gameState.hunterPos.x, gameState.hunterPos.y, pulseRadius, 0, Math.PI * 2);
    hunterCtx.stroke();
    
    // Reveal hider
    const dx = gameState.hunterPos.x - gameState.hiderPos.x;
    const dy = gameState.hunterPos.y - gameState.hiderPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < CONFIG.sonarRadius) {
      hunterCtx.fillStyle = '#00d4ff';
      hunterCtx.shadowBlur = 20;
      hunterCtx.shadowColor = '#00d4ff';
      hunterCtx.beginPath();
      hunterCtx.arc(gameState.hiderPos.x, gameState.hiderPos.y, 12, 0, Math.PI * 2);
      hunterCtx.fill();
      hunterCtx.shadowBlur = 0;
    }
  }
}

function renderHider() {
  hiderCtx.fillStyle = '#0a0614';
  hiderCtx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
  
  // Limited vision (fog of war)
  const gradient = hiderCtx.createRadialGradient(
    gameState.hiderPos.x, gameState.hiderPos.y, 0,
    gameState.hiderPos.x, gameState.hiderPos.y, 150
  );
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(1, '#0a0614');
  
  // Draw trees
  drawForest(hiderCtx);
  
  // Apply fog
  hiderCtx.fillStyle = gradient;
  hiderCtx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
  
  // Hider (self)
  hiderCtx.fillStyle = '#00d4ff';
  hiderCtx.shadowBlur = 20;
  hiderCtx.shadowColor = '#00d4ff';
  hiderCtx.beginPath();
  hiderCtx.arc(gameState.hiderPos.x, gameState.hiderPos.y, 12, 0, Math.PI * 2);
  hiderCtx.fill();
  hiderCtx.shadowBlur = 0;
  
  // Sonar warning
  if (gameState.sonarActive) {
    hiderCtx.fillStyle = 'rgba(255, 0, 64, 0.3)';
    hiderCtx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
  }
  
  // Hunter proximity warning
  const dx = gameState.hunterPos.x - gameState.hiderPos.x;
  const dy = gameState.hunterPos.y - gameState.hiderPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < 200) {
    document.getElementById('dangerWarning').style.display = 'block';
    document.getElementById('hiderStatus').textContent = 'DANGER';
    document.getElementById('hiderStatus').className = 'value status-danger';
  } else {
    document.getElementById('dangerWarning').style.display = 'none';
    document.getElementById('hiderStatus').textContent = 'HIDDEN';
    document.getElementById('hiderStatus').className = 'value status-safe';
  }
}

function drawForest(ctx) {
  // Simple tree obstacles
  const trees = [
    { x: 150, y: 100 }, { x: 300, y: 150 }, { x: 500, y: 200 },
    { x: 200, y: 400 }, { x: 600, y: 350 }, { x: 400, y: 500 },
    { x: 100, y: 300 }, { x: 700, y: 100 }, { x: 650, y: 450 }
  ];
  
  trees.forEach(tree => {
    ctx.fillStyle = '#1a0f2e';
    ctx.beginPath();
    ctx.arc(tree.x, tree.y, 30, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#3e1a4d';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

// UI Updates
function updateTimer() {
  const minutes = Math.floor(gameState.timeRemaining / 60);
  const seconds = gameState.timeRemaining % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  if (gameState.role === 'hunter') {
    document.getElementById('hunterTimer').textContent = timeStr;
  } else {
    document.getElementById('hiderTimer').textContent = timeStr;
  }
}

function updateDetectionMeter() {
  const maxDistance = 400;
  const percentage = Math.max(0, (1 - gameState.detectionDistance / maxDistance) * 100);
  document.getElementById('detectionBar').style.width = percentage + '%';
}

function updateNoiseBar() {
  document.getElementById('noiseBar').style.width = gameState.noiseLevel + '%';
}

// Update sonar cooldown display
setInterval(() => {
  if (gameState.role === 'hunter' && gameState.sonarCooldown > 0) {
    const seconds = Math.ceil(gameState.sonarCooldown / 1000);
    document.getElementById('sonarCooldown').textContent = seconds + 's';
  } else if (gameState.role === 'hunter') {
    document.getElementById('sonarCooldown').textContent = 'READY';
  }
}, 100);

// End Game
function endGame(winner) {
  if (gameState.isCaught) return;
  gameState.isCaught = true;
  
  clearInterval(gameLoop);
  
  const resultScreen = document.getElementById('resultScreen');
  const resultTitle = document.getElementById('resultTitle');
  const resultMessage = document.getElementById('resultMessage');
  
  if (winner === 'hunter') {
    resultTitle.textContent = 'CAUGHT!';
    resultTitle.className = 'result-title hunter-win';
    resultMessage.textContent = 'The hunter tracked down their prey. The Demogorgon feeds tonight.';
  } else {
    resultTitle.textContent = 'ESCAPED!';
    resultTitle.className = 'result-title hider-win';
    resultMessage.textContent = 'You survived the hunt. Live to hide another day.';
  }
  
  resultScreen.style.display = 'flex';
}

document.getElementById('playAgainBtn').addEventListener('click', () => {
  location.reload();
});
