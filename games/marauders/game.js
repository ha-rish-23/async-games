// The Marauder's Map - Stealth Raycasting Game
// Map Keeper sees full map, Student sneaks through corridors

const nm = new window.NetworkManager();
const audio = new window.AudioManager();

const gameState = {
  timeElapsed: 0,
  detection: 0, // 0-100, caught at 100
  gameActive: false,
  timerInterval: null,
  player: {
    x: 3,
    y: 3,
    angle: 0,
    speed: 0.08,
    sprintSpeed: 0.15,
    isSprinting: false
  },
  patrols: [], // Filch, Mrs. Norris, prefects
  goal: { x: 27, y: 27 }
};

let isMapKeeper = false; // true = host, false = client
let keys = {};

// Hogwarts castle map (1 = wall, 0 = corridor, 2 = goal)
const MAP_SIZE = 30;
const map = [];

// Generate castle layout
function generateMap() {
  // Initialize with walls
  for (let y = 0; y < MAP_SIZE; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_SIZE; x++) {
      map[y][x] = 1; // Wall
    }
  }
  
  // Create a proper Hogwarts-style maze
  // Main horizontal corridors
  for (let x = 2; x < MAP_SIZE - 2; x++) {
    map[3][x] = 0;
    map[8][x] = 0;
    map[13][x] = 0;
    map[18][x] = 0;
    map[23][x] = 0;
    map[27][x] = 0;
  }
  
  // Main vertical corridors
  for (let y = 2; y < MAP_SIZE - 2; y++) {
    map[y][3] = 0;
    map[y][8] = 0;
    map[y][13] = 0;
    map[y][18] = 0;
    map[y][23] = 0;
    map[y][27] = 0;
  }
  
  // Large rooms
  for (let x = 10; x <= 12; x++) {
    for (let y = 10; y <= 12; y++) {
      map[y][x] = 0;
    }
  }
  
  for (let x = 20; x <= 22; x++) {
    for (let y = 5; y <= 7; y++) {
      map[y][x] = 0;
    }
  }
  
  for (let x = 5; x <= 7; x++) {
    for (let y = 20; y <= 22; y++) {
      map[y][x] = 0;
    }
  }
  
  // Goal area (bottom-right corner) - make it clearly marked
  map[27][27] = 2;
  map[26][27] = 2;
  map[27][26] = 2;
  map[26][26] = 2;
}

generateMap();

// Patrol entities
function createPatrols() {
  gameState.patrols = [
    { name: 'Filch', x: 8, y: 8, path: [{x:3,y:8},{x:27,y:8},{x:27,y:18},{x:3,y:18}], pathIndex: 0, speed: 0.025, detectionRange: 3.5 },
    { name: 'Mrs. Norris', x: 13, y: 13, path: [{x:13,y:3},{x:13,y:27},{x:23,y:27},{x:23,y:3}], pathIndex: 0, speed: 0.03, detectionRange: 3 },
    { name: 'Prefect', x: 18, y: 18, path: [{x:8,y:18},{x:23,y:18},{x:23,y:23},{x:8,y:23}], pathIndex: 0, speed: 0.02, detectionRange: 3.2 }
  ];
}

createPatrols();

// Load images
const images = {
  footprints: new Image(),
  parchment: new Image(),
  corridor: new Image()
};

images.footprints.src = '../../images/human-footprints.png';
images.parchment.src = '../../images/vintage-grunge.jpg';
images.corridor.src = '../../images/hpbg.jpg';

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
  isMapKeeper = true;
  
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
  isMapKeeper = false;
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

// Network
function onPeerConnected() {
  if (isMapKeeper) {
    document.getElementById('setupScreen').classList.remove('active');
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('mapKeeperView').style.display = 'flex';
    startGame();
  } else {
    document.getElementById('setupScreen').classList.remove('active');
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('studentView').style.display = 'flex';
    setupControls();
  }
}

function onDataReceived(data) {
  if (data.type === 'gameState') {
    updateStudentView(data.payload);
  } else if (data.type === 'playerInput') {
    handlePlayerInput(data.payload);
  } else if (data.type === 'gameEnd') {
    showResult(data.payload.success, data.payload.message);
  }
}

// Game loop (Map Keeper only)
function startGame() {
  gameState.gameActive = true;
  gameState.timeElapsed = 0;
  gameState.detection = 0;
  
  gameState.timerInterval = setInterval(() => {
    if (!isMapKeeper) return;
    
    gameState.timeElapsed++;
    updateTimerDisplay();
    
    // Move patrols
    movePatrols();
    
    // Check detection
    checkDetection();
    
    // Check win condition
    const goalDist = Math.sqrt(
      Math.pow(gameState.player.x - gameState.goal.x, 2) +
      Math.pow(gameState.player.y - gameState.goal.y, 2)
    );
    
    if (goalDist < 1) {
      endGame(true, `Congratulations! You reached the destination in ${formatTime(gameState.timeElapsed)}!`);
    }
    
    // Check caught
    if (gameState.detection >= 100) {
      endGame(false, 'You were caught by Filch! Detention for you!');
    }
    
    updateDetectionMeter();
    sendGameState();
    renderMap();
  }, 1000 / 60); // 60 FPS
}

function movePatrols() {
  gameState.patrols.forEach(patrol => {
    const target = patrol.path[patrol.pathIndex];
    const dx = target.x - patrol.x;
    const dy = target.y - patrol.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist < 0.1) {
      // Reached waypoint, move to next
      patrol.pathIndex = (patrol.pathIndex + 1) % patrol.path.length;
    } else {
      // Move towards waypoint
      patrol.x += (dx / dist) * patrol.speed;
      patrol.y += (dy / dist) * patrol.speed;
    }
  });
}

function checkDetection() {
  let detected = false;
  
  gameState.patrols.forEach(patrol => {
    const dx = gameState.player.x - patrol.x;
    const dy = gameState.player.y - patrol.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist < patrol.detectionRange) {
      detected = true;
      gameState.detection += gameState.player.isSprinting ? 2 : 0.5;
    }
  });
  
  if (!detected && gameState.detection > 0) {
    gameState.detection = Math.max(0, gameState.detection - 0.3);
  }
}

function sendGameState() {
  if (!isMapKeeper) return;
  
  nm.sendData('gameState', {
    player: gameState.player,
    patrols: gameState.patrols,
    time: gameState.timeElapsed,
    detection: gameState.detection
  });
}

// Student controls
function setupControls() {
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    keys[key] = true;
    
    console.log('Key pressed:', key, 'All keys:', keys);
    
    if (e.key === 'Shift') {
      gameState.player.isSprinting = true;
    }
  });
  
  document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    keys[key] = false;
    
    if (e.key === 'Shift') {
      gameState.player.isSprinting = false;
    }
  });
  
  // Send input to host every frame
  setInterval(() => {
    console.log('Sending keys to host:', keys);
    nm.sendData('playerInput', { keys, isSprinting: gameState.player.isSprinting });
  }, 16.67);
  
  // Start rendering loop for student
  setInterval(() => {
    if (studentState) {
      renderFirstPerson();
    }
  }, 16.67);
}

function handlePlayerInput(input) {
  if (!isMapKeeper) return;
  if (!gameState.gameActive) {
    console.log('Game not active yet, ignoring input');
    return;
  }
  
  console.log('Host received input:', input);
  
  const { keys: playerKeys, isSprinting } = input;
  gameState.player.isSprinting = isSprinting;
  
  const speed = isSprinting ? gameState.player.sprintSpeed : gameState.player.speed;
  const rotSpeed = 0.05;
  
  console.log('Processing movement with speed:', speed, 'keys:', playerKeys);
  
  // Rotation
  if (playerKeys['arrowleft']) {
    gameState.player.angle -= rotSpeed;
    console.log('Rotating left, new angle:', gameState.player.angle);
  }
  if (playerKeys['arrowright']) {
    gameState.player.angle += rotSpeed;
    console.log('Rotating right, new angle:', gameState.player.angle);
  }
  
  // Movement
  let moveX = 0;
  let moveY = 0;
  
  if (playerKeys['w']) {
    moveX += Math.cos(gameState.player.angle) * speed;
    moveY += Math.sin(gameState.player.angle) * speed;
    console.log('Moving forward');
  }
  if (playerKeys['s']) {
    moveX += -Math.cos(gameState.player.angle) * speed;
    moveY += -Math.sin(gameState.player.angle) * speed;
    console.log('Moving backward');
  }
  if (playerKeys['a']) {
    moveX += Math.cos(gameState.player.angle - Math.PI/2) * speed;
    moveY += Math.sin(gameState.player.angle - Math.PI/2) * speed;
    console.log('Moving left');
  }
  if (playerKeys['d']) {
    moveX += Math.cos(gameState.player.angle + Math.PI/2) * speed;
    moveY += Math.sin(gameState.player.angle + Math.PI/2) * speed;
    console.log('Moving right');
  }
  
  console.log('Total movement:', moveX, moveY);
  
  // Better collision detection with sliding
  const newX = gameState.player.x + moveX;
  const newY = gameState.player.y + moveY;
  
  // Check if full movement is valid
  if (map[Math.floor(newY)] && map[Math.floor(newY)][Math.floor(newX)] !== 1) {
    gameState.player.x = newX;
    gameState.player.y = newY;
    console.log('New position:', newX, newY);
  } else {
    // Try sliding along walls - try X movement only
    const tryX = gameState.player.x + moveX;
    if (map[Math.floor(gameState.player.y)] && map[Math.floor(gameState.player.y)][Math.floor(tryX)] !== 1) {
      gameState.player.x = tryX;
      console.log('Sliding X:', tryX);
    }
    
    // Try Y movement only
    const tryY = gameState.player.y + moveY;
    if (map[Math.floor(tryY)] && map[Math.floor(tryY)][Math.floor(gameState.player.x)] !== 1) {
      gameState.player.y = tryY;
      console.log('Sliding Y:', tryY);
    }
  }
  
  if (isSprinting) {
    audio.blip();
  }
}

// Render Map Keeper view (top-down with footprints)
function renderMap() {
  const canvas = document.getElementById('mapCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const tileSize = canvas.width / MAP_SIZE;
  
  // Parchment background
  ctx.fillStyle = '#f2ead3';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  if (images.parchment.complete) {
    ctx.globalAlpha = 0.3;
    ctx.drawImage(images.parchment, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }
  
  // Draw map
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const px = x * tileSize;
      const py = y * tileSize;
      
      if (map[y][x] === 1) {
        // Wall (dark ink)
        ctx.fillStyle = '#2c1810';
        ctx.fillRect(px, py, tileSize, tileSize);
      } else if (map[y][x] === 2) {
        // Goal (gold with star)
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(px, py, tileSize, tileSize);
        ctx.fillStyle = '#2c1810';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('★', px + tileSize/2, py + tileSize/2 + 6);
      } else {
        // Corridor (parchment)
        ctx.fillStyle = '#e8dcc0';
        ctx.fillRect(px, py, tileSize, tileSize);
      }
      
      // Grid lines
      ctx.strokeStyle = 'rgba(44, 24, 16, 0.1)';
      ctx.strokeRect(px, py, tileSize, tileSize);
    }
  }
  
  // Draw patrols
  gameState.patrols.forEach(patrol => {
    const px = patrol.x * tileSize;
    const py = patrol.y * tileSize;
    
    // Detection range
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    ctx.beginPath();
    ctx.arc(px, py, patrol.detectionRange * tileSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Entity
    ctx.fillStyle = '#8b0000';
    ctx.beginPath();
    ctx.arc(px, py, tileSize/3, 0, Math.PI * 2);
    ctx.fill();
    
    // Name
    ctx.fillStyle = '#2c1810';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(patrol.name, px, py - tileSize/2);
  });
  
  // Draw player with footprints
  const px = gameState.player.x * tileSize;
  const py = gameState.player.y * tileSize;
  
  if (images.footprints.complete) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(gameState.player.angle + Math.PI/2); // Rotate 90 degrees to align footprints forward
    ctx.drawImage(images.footprints, -tileSize/2, -tileSize/2, tileSize, tileSize);
    ctx.restore();
  } else {
    ctx.fillStyle = '#4a0e0e';
    ctx.beginPath();
    ctx.arc(px, py, tileSize/3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Direction indicator
  ctx.strokeStyle = '#4a0e0e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(
    px + Math.cos(gameState.player.angle) * tileSize * 0.6,
    py + Math.sin(gameState.player.angle) * tileSize * 0.6
  );
  ctx.stroke();
}

// Render Student view (raycasting first-person)
let studentState = null;

function updateStudentView(state) {
  studentState = state;
  
  document.getElementById('timeDisplayStudent').textContent = `Time: ${formatTime(state.time)}`;
  gameState.detection = state.detection;
  gameState.player = state.player;
  gameState.patrols = state.patrols;
  
  updateDetectionMeter();
}

function renderFirstPerson() {
  const canvas = document.getElementById('corridorCanvas');
  if (!canvas || !studentState) return;
  
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  
  const { player } = studentState;
  const fov = Math.PI / 3; // 60 degrees
  const numRays = w / 2; // Ray every 2 pixels
  const maxDepth = 20;
  
  // Draw ceiling
  ctx.fillStyle = '#1a1410';
  ctx.fillRect(0, 0, w, h/2);
  
  // Draw floor
  ctx.fillStyle = '#2c1810';
  ctx.fillRect(0, h/2, w, h/2);
  
  // Raycasting
  for (let i = 0; i < numRays; i++) {
    const rayAngle = (player.angle - fov/2) + (i / numRays) * fov;
    
    let distance = 0;
    let hitWall = false;
    let hitGoal = false;
    
    const dx = Math.cos(rayAngle);
    const dy = Math.sin(rayAngle);
    
    while (!hitWall && distance < maxDepth) {
      distance += 0.1;
      
      const testX = Math.floor(player.x + dx * distance);
      const testY = Math.floor(player.y + dy * distance);
      
      if (testX < 0 || testX >= MAP_SIZE || testY < 0 || testY >= MAP_SIZE) {
        hitWall = true;
        distance = maxDepth;
      } else if (map[testY][testX] === 1) {
        hitWall = true;
      } else if (map[testY][testX] === 2) {
        hitGoal = true;
        hitWall = true;
      }
    }
    
    // Calculate wall height
    const ceiling = (h / 2) - (h / distance);
    const floor = h - ceiling;
    
    // Shade based on distance
    const shade = Math.max(0, 255 - distance * 12);
    
    // Draw wall slice
    const x = i * 2;
    
    if (hitGoal) {
      ctx.fillStyle = `rgb(${Math.min(255, shade + 100)}, ${Math.min(255, shade + 80)}, ${shade/2})`;
      ctx.fillRect(x, ceiling, 2, floor - ceiling);
    } else {
      // Solid stone wall color
      ctx.fillStyle = `rgb(${shade/2}, ${shade/3}, ${shade/4})`;
      ctx.fillRect(x, ceiling, 2, floor - ceiling);
    }
  }
  
  // Draw patrols as red glows if nearby
  studentState.patrols.forEach(patrol => {
    const dx = patrol.x - player.x;
    const dy = patrol.y - player.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist < 4) {
      const angle = Math.atan2(dy, dx);
      const relativeAngle = angle - player.angle;
      
      // Normalize angle
      let normalized = relativeAngle;
      while (normalized > Math.PI) normalized -= Math.PI * 2;
      while (normalized < -Math.PI) normalized += Math.PI * 2;
      
      if (Math.abs(normalized) < fov/2) {
        const screenX = (normalized + fov/2) / fov * w;
        const size = Math.max(20, 200 / dist);
        
        const gradient = ctx.createRadialGradient(screenX, h/2, 0, screenX, h/2, size);
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX, h/2, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  
  // Sprint indicator
  if (player.isSprinting) {
    ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SPRINTING!', w/2, 30);
  }
}

// UI Updates
function updateTimerDisplay() {
  const timeStr = formatTime(gameState.timeElapsed);
  const timeEl = document.getElementById('timeDisplay');
  if (timeEl) timeEl.textContent = `Time: ${timeStr}`;
}

function updateDetectionMeter() {
  const fill = Math.min(100, Math.max(0, gameState.detection));
  
  const fillEl = document.getElementById('detectionFill');
  const fillElS = document.getElementById('detectionFillStudent');
  
  if (fillEl) fillEl.style.width = fill + '%';
  if (fillElS) fillElS.style.width = fill + '%';
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
  document.getElementById('mapKeeperView')?.style.setProperty('display', 'none');
  document.getElementById('studentView')?.style.setProperty('display', 'none');
  
  const resultScreen = document.getElementById('resultScreen');
  resultScreen.style.display = 'block';
  
  document.getElementById('resultTitle').textContent = success ? '✨ Success!' : '🚨 Caught!';
  document.getElementById('resultMessage').textContent = message;
  document.getElementById('finalTime').textContent = `Time: ${formatTime(gameState.timeElapsed)}`;
  document.getElementById('finalDetection').textContent = `Max Detection: ${Math.floor(gameState.detection)}%`;
}
