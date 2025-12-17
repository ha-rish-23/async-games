/* The Art Heist Game */
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
  const controlsText = document.getElementById('controlsText');
  const timeDisplay = document.getElementById('timeDisplay');
  const alarmText = document.getElementById('alarmText');
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  let role = null;
  let animationId = null;
  let gameTimer = null;
  let debugMode = true; // Show collision boxes

  // Grid system - 12x12 grid
  const GRID_SIZE = 12;
  const CELL_SIZE = 50; // pixels per cell

  // Level definitions
  const levels = [
    // Level 1 - Tutorial (current easy level)
    {
      museum: [
        [1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,1,1,0,1,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,1,0,0,0,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,1,1,1,1,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      lasers: [
        { x1: 5, y1: 3, x2: 5, y2: 3, orientation: 'vertical', offset: 0, speed: 0.015, length: 3 },
        { x1: 3, y1: 7, x2: 8, y2: 7, orientation: 'horizontal', offset: 0, speed: 0.02, length: 2 }
      ],
      cameras: [
        { x: 6, y: 6, angle: 0, rotationSpeed: 0.015, viewDistance: 3.5, fov: Math.PI / 4 }
      ],
      painting: { x: 10, y: 10 },
      thief: { x: 1, y: 1, facing: 0 }
    },
    
    // Level 2 - Wide corridors
    {
      museum: [
        [1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,1,1,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,1,0,0,1,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,1,1,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      lasers: [
        { x1: 4, y1: 2, x2: 4, y2: 8, orientation: 'vertical', offset: 0, speed: 0.012, length: 2 },
        { x1: 7, y1: 4, x2: 7, y2: 9, orientation: 'vertical', offset: 0.5, speed: 0.01, length: 2 }
      ],
      cameras: [
        { x: 6, y: 6, angle: 0, rotationSpeed: 0.012, viewDistance: 3, fov: Math.PI / 4 }
      ],
      painting: { x: 10, y: 2 },
      thief: { x: 1, y: 10, facing: 3 }
    },
    
    // Level 3 - Simple maze
    {
      museum: [
        [1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,1,0,0,1,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,1,1,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,1,0,0,1,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,1,0,0,1,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      lasers: [
        { x1: 3, y1: 1, x2: 3, y2: 8, orientation: 'vertical', offset: 0, speed: 0.013, length: 2 },
        { x1: 8, y1: 2, x2: 8, y2: 9, orientation: 'vertical', offset: 0.5, speed: 0.011, length: 2 },
        { x1: 2, y1: 5, x2: 9, y2: 5, orientation: 'horizontal', offset: 0, speed: 0.014, length: 2 }
      ],
      cameras: [
        { x: 5, y: 3, angle: 0, rotationSpeed: 0.015, viewDistance: 3, fov: Math.PI / 4 },
        { x: 6, y: 8, angle: Math.PI, rotationSpeed: -0.012, viewDistance: 3, fov: Math.PI / 4 }
      ],
      painting: { x: 10, y: 10 },
      thief: { x: 1, y: 1, facing: 0 }
    },
    
    // Level 4 - Corridor challenge
    {
      museum: [
        [1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,0,0,0,0,0,0,1,0,1],
        [1,0,1,0,0,0,0,0,0,1,0,1],
        [1,0,0,0,0,1,1,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,1,1,0,0,0,0,1],
        [1,0,1,0,0,0,0,0,0,1,0,1],
        [1,0,1,0,0,0,0,0,0,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      lasers: [
        { x1: 3, y1: 1, x2: 3, y2: 9, orientation: 'vertical', offset: 0, speed: 0.015, length: 2 },
        { x1: 6, y1: 2, x2: 6, y2: 8, orientation: 'vertical', offset: 0.4, speed: 0.013, length: 2 },
        { x1: 8, y1: 1, x2: 8, y2: 9, orientation: 'vertical', offset: 0.7, speed: 0.011, length: 2 },
        { x1: 1, y1: 5, x2: 10, y2: 5, orientation: 'horizontal', offset: 0, speed: 0.016, length: 2 }
      ],
      cameras: [
        { x: 5, y: 3, angle: 0, rotationSpeed: 0.018, viewDistance: 3.5, fov: Math.PI / 4 },
        { x: 5, y: 8, angle: Math.PI, rotationSpeed: -0.015, viewDistance: 3.5, fov: Math.PI / 4 }
      ],
      painting: { x: 10, y: 1 },
      thief: { x: 1, y: 10, facing: 3 }
    },
    
    // Level 5 - Final test
    {
      museum: [
        [1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,0,0,0,0,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,1,1,1,1,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,1,1,1,1,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,0,0,0,0,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      lasers: [
        { x1: 3, y1: 1, x2: 3, y2: 9, orientation: 'vertical', offset: 0, speed: 0.016, length: 2 },
        { x1: 5, y1: 2, x2: 5, y2: 8, orientation: 'vertical', offset: 0.3, speed: 0.014, length: 2 },
        { x1: 8, y1: 1, x2: 8, y2: 9, orientation: 'vertical', offset: 0.6, speed: 0.012, length: 2 },
        { x1: 1, y1: 4, x2: 10, y2: 4, orientation: 'horizontal', offset: 0, speed: 0.018, length: 2 },
        { x1: 1, y1: 7, x2: 10, y2: 7, orientation: 'horizontal', offset: 0.5, speed: 0.015, length: 2 }
      ],
      cameras: [
        { x: 4, y: 2, angle: 0, rotationSpeed: 0.02, viewDistance: 3.5, fov: Math.PI / 4 },
        { x: 7, y: 5, angle: Math.PI / 2, rotationSpeed: -0.017, viewDistance: 3.5, fov: Math.PI / 4 },
        { x: 5, y: 9, angle: Math.PI, rotationSpeed: 0.015, viewDistance: 3, fov: Math.PI / 4 }
      ],
      painting: { x: 10, y: 5 },
      thief: { x: 1, y: 5, facing: 0 }
    }
  ];

  // Game state
  const gameState = {
    thief: { x: 1, y: 1, facing: 0 }, // Grid position (facing: 0=right, 1=down, 2=left, 3=up)
    painting: { x: 10, y: 10 }, // Goal position
    timeRemaining: 180, // 3 minutes in seconds
    alarmTriggered: false,
    gameWon: false,
    gameLost: false,
    currentLevel: 1,
    maxLevel: 5
  };

  // Current level data (loaded dynamically)
  let museum = [];
  let lasers = [];
  let cameras = [];

  // Load level
  function loadLevel(levelNum) {
    const level = levels[levelNum - 1];
    museum = level.museum.map(row => [...row]); // Deep copy
    lasers = level.lasers.map(laser => ({...laser})); // Deep copy
    cameras = level.cameras.map(cam => ({...cam})); // Deep copy
    gameState.painting = {...level.painting};
    gameState.thief = {...level.thief};
    gameState.currentLevel = levelNum;
    gameState.timeRemaining = 180;
    gameState.alarmTriggered = false;
    gameState.gameWon = false;
    gameState.gameLost = false;
    
    alarmText.textContent = 'CLEAR';
    alarmText.classList.remove('alarm-triggered');
    
    if(role === 'host') {
      gameStatus.textContent = 'LEVEL ' + levelNum + ' - Guide the thief to the painting!';
    } else if(role === 'client') {
      gameStatus.textContent = 'LEVEL ' + levelNum + ' - Find the painting!';
    }
    gameStatus.style.color = '#00d4ff';
  }

  // Update lasers
  function updateLasers() {
    lasers.forEach(laser => {
      laser.offset += laser.speed;
      if(laser.offset > 1) laser.offset = 0;
    });
  }

  // Update cameras
  function updateCameras() {
    cameras.forEach(cam => {
      cam.angle += cam.rotationSpeed;
    });
  }

  // Check if thief is hit by laser - FIXED collision detection
  function checkLaserCollision() {
    const tx = gameState.thief.x;
    const ty = gameState.thief.y;
    
    for(let laser of lasers) {
      if(laser.orientation === 'vertical') {
        // Vertical laser moves up/down
        const currentY = laser.y1 + (laser.y2 - laser.y1) * laser.offset;
        const laserX = laser.x1;
        const laserEndY = currentY + laser.length;
        
        // Thief collision box (centered on grid position)
        const thiefLeft = tx - 0.4;
        const thiefRight = tx + 0.4;
        const thiefTop = ty - 0.4;
        const thiefBottom = ty + 0.4;
        
        // Laser collision box
        const laserLeft = laserX - 0.2;
        const laserRight = laserX + 0.2;
        const laserTop = currentY;
        const laserBottom = laserEndY;
        
        // AABB collision
        if(thiefRight > laserLeft && thiefLeft < laserRight &&
           thiefBottom > laserTop && thiefTop < laserBottom) {
          console.log('LASER HIT - Vertical:', {thief: {x: tx, y: ty}, laser: {x: laserX, y1: currentY, y2: laserEndY}});
          return true;
        }
      } else {
        // Horizontal laser moves left/right
        const currentX = laser.x1 + (laser.x2 - laser.x1) * laser.offset;
        const laserY = laser.y1;
        const laserEndX = currentX + laser.length;
        
        // Thief collision box
        const thiefLeft = tx - 0.4;
        const thiefRight = tx + 0.4;
        const thiefTop = ty - 0.4;
        const thiefBottom = ty + 0.4;
        
        // Laser collision box
        const laserLeft = currentX;
        const laserRight = laserEndX;
        const laserTop = laserY - 0.2;
        const laserBottom = laserY + 0.2;
        
        // AABB collision
        if(thiefRight > laserLeft && thiefLeft < laserRight &&
           thiefBottom > laserTop && thiefTop < laserBottom) {
          console.log('LASER HIT - Horizontal:', {thief: {x: tx, y: ty}, laser: {x1: currentX, x2: laserEndX, y: laserY}});
          return true;
        }
      }
    }
    return false;
  }

  // Check if thief is spotted by camera
  function checkCameraDetection() {
    const tx = gameState.thief.x;
    const ty = gameState.thief.y;
    
    for(let cam of cameras) {
      const dx = tx - cam.x;
      const dy = ty - cam.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Check distance first
      if(dist <= cam.viewDistance && dist > 0.5) { // Don't detect if too close (same cell)
        const angleToThief = Math.atan2(dy, dx);
        
        // Normalize angles to [0, 2PI]
        let camAngle = cam.angle % (Math.PI * 2);
        if(camAngle < 0) camAngle += Math.PI * 2;
        
        let targetAngle = angleToThief;
        if(targetAngle < 0) targetAngle += Math.PI * 2;
        
        // Calculate angle difference
        let angleDiff = Math.abs(targetAngle - camAngle);
        if(angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
        
        // Check if within FOV
        if(angleDiff < cam.fov / 2) {
          console.log('CAMERA SPOTTED:', {thief: {x: tx, y: ty}, camera: cam, dist, angleDiff: angleDiff * 180 / Math.PI});
          return true;
        }
      }
    }
    return false;
  }

  // Check if position has wall
  function isWall(x, y) {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    if(gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return true;
    return museum[gy][gx] === 1;
  }

  // Check win condition
  function checkWin() {
    const dx = gameState.thief.x - gameState.painting.x;
    const dy = gameState.thief.y - gameState.painting.y;
    return Math.sqrt(dx * dx + dy * dy) < 0.7;
  }

  // Reset game
  function resetGame() {
    loadLevel(gameState.currentLevel);
    nm.sendData('game', { type: 'reset', level: gameState.currentLevel });
  }

  // ===== HACKER VIEW (Blueprint) =====
  function drawHackerView() {
    ctx.fillStyle = '#001428';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const offsetX = (canvas.width - GRID_SIZE * CELL_SIZE) / 2;
    const offsetY = (canvas.height - GRID_SIZE * CELL_SIZE) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);

    // Draw grid
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
    ctx.lineWidth = 1;
    for(let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw walls
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 3;
    for(let y = 0; y < GRID_SIZE; y++) {
      for(let x = 0; x < GRID_SIZE; x++) {
        if(museum[y][x] === 1) {
          ctx.fillStyle = 'rgba(0, 212, 255, 0.1)';
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }

    // Draw lasers
    ctx.strokeStyle = '#ff0040';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#ff0040';
    ctx.shadowBlur = 10;
    lasers.forEach(laser => {
      ctx.beginPath();
      if(laser.orientation === 'vertical') {
        const currentY = laser.y1 + (laser.y2 - laser.y1) * laser.offset;
        ctx.moveTo((laser.x1 + 0.5) * CELL_SIZE, (currentY + 0.5) * CELL_SIZE);
        ctx.lineTo((laser.x1 + 0.5) * CELL_SIZE, (currentY + laser.length + 0.5) * CELL_SIZE);
      } else {
        const currentX = laser.x1 + (laser.x2 - laser.x1) * laser.offset;
        ctx.moveTo((currentX + 0.5) * CELL_SIZE, (laser.y1 + 0.5) * CELL_SIZE);
        ctx.lineTo((currentX + laser.length + 0.5) * CELL_SIZE, (laser.y1 + 0.5) * CELL_SIZE);
      }
      ctx.stroke();
      
      // Debug: Show collision box
      if(debugMode) {
        ctx.strokeStyle = 'rgba(255, 0, 64, 0.3)';
        ctx.lineWidth = 1;
        if(laser.orientation === 'vertical') {
          const currentY = laser.y1 + (laser.y2 - laser.y1) * laser.offset;
          ctx.strokeRect(
            (laser.x1 + 0.1) * CELL_SIZE,
            (currentY + 0.3) * CELL_SIZE,
            0.8 * CELL_SIZE,
            (laser.length + 0.4) * CELL_SIZE
          );
        } else {
          const currentX = laser.x1 + (laser.x2 - laser.x1) * laser.offset;
          ctx.strokeRect(
            (currentX + 0.3) * CELL_SIZE,
            (laser.y1 + 0.1) * CELL_SIZE,
            (laser.length + 0.4) * CELL_SIZE,
            0.8 * CELL_SIZE
          );
        }
        ctx.strokeStyle = '#ff0040';
        ctx.lineWidth = 4;
      }
    });
    ctx.shadowBlur = 0;

    // Draw cameras
    cameras.forEach(cam => {
      // Camera body
      ctx.fillStyle = '#ffff00';
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc((cam.x + 0.5) * CELL_SIZE, (cam.y + 0.5) * CELL_SIZE, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Vision cone
      ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo((cam.x + 0.5) * CELL_SIZE, (cam.y + 0.5) * CELL_SIZE);
      ctx.arc(
        (cam.x + 0.5) * CELL_SIZE,
        (cam.y + 0.5) * CELL_SIZE,
        cam.viewDistance * CELL_SIZE,
        cam.angle - cam.fov / 2,
        cam.angle + cam.fov / 2
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Draw painting
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(
      (gameState.painting.x + 0.5) * CELL_SIZE,
      (gameState.painting.y + 0.5) * CELL_SIZE,
      12 + Math.sin(Date.now() * 0.003) * 3,
      0,
      Math.PI * 2
    );
    ctx.fill();
    
    // Star shape
    const px = (gameState.painting.x + 0.5) * CELL_SIZE;
    const py = (gameState.painting.y + 0.5) * CELL_SIZE;
    ctx.beginPath();
    for(let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
      const x = px + Math.cos(angle) * 15;
      const y = py + Math.sin(angle) * 15;
      if(i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw thief
    ctx.fillStyle = '#00d4ff';
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(
      (gameState.thief.x + 0.5) * CELL_SIZE,
      (gameState.thief.y + 0.5) * CELL_SIZE,
      10,
      0,
      Math.PI * 2
    );
    ctx.fill();
    
    // Debug: Show thief collision box
    if(debugMode) {
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        (gameState.thief.x + 0.1) * CELL_SIZE,
        (gameState.thief.y + 0.1) * CELL_SIZE,
        0.8 * CELL_SIZE,
        0.8 * CELL_SIZE
      );
    }
    
    // Direction indicator
    const dirAngles = [0, Math.PI/2, Math.PI, -Math.PI/2];
    const angle = dirAngles[gameState.thief.facing];
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo((gameState.thief.x + 0.5) * CELL_SIZE, (gameState.thief.y + 0.5) * CELL_SIZE);
    ctx.lineTo(
      (gameState.thief.x + 0.5) * CELL_SIZE + Math.cos(angle) * 15,
      (gameState.thief.y + 0.5) * CELL_SIZE + Math.sin(angle) * 15
    );
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();

    // HUD
    ctx.fillStyle = '#00d4ff';
    ctx.font = '14px "Share Tech Mono"';
    ctx.fillText('LEVEL ' + gameState.currentLevel + ' / ' + gameState.maxLevel, 10, 20);
    ctx.fillText('THIEF POSITION: (' + gameState.thief.x.toFixed(1) + ', ' + gameState.thief.y.toFixed(1) + ')', 10, 40);
    ctx.fillText('LASERS: ' + lasers.length + ' | CAMERAS: ' + cameras.length, 10, 60);
  }

  // ===== THIEF VIEW (First-Person Noir) =====
  function drawThiefView() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const viewDist = 5; // How far thief can see

    // Draw walls in first-person perspective
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
    ctx.lineWidth = 2;

    // Simple raycasting-like view
    const dirAngles = [0, Math.PI/2, Math.PI, -Math.PI/2];
    const facing = dirAngles[gameState.thief.facing];

    // Draw visible walls
    for(let y = 0; y < GRID_SIZE; y++) {
      for(let x = 0; x < GRID_SIZE; x++) {
        if(museum[y][x] === 1) {
          const dx = x - gameState.thief.x;
          const dy = y - gameState.thief.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if(dist < viewDist) {
            // Transform to view space
            const angle = Math.atan2(dy, dx) - facing;
            const viewX = centerX + Math.cos(angle) * dist * 60;
            const viewY = centerY + Math.sin(angle) * dist * 60;
            const size = Math.max(10, 40 - dist * 5);
            
            ctx.strokeRect(viewX - size/2, viewY - size/2, size, size);
          }
        }
      }
    }

    // Draw painting glow if nearby
    const dx = gameState.painting.x - gameState.thief.x;
    const dy = gameState.painting.y - gameState.thief.y;
    const distToPainting = Math.sqrt(dx * dx + dy * dy);
    
    if(distToPainting < 3) {
      const angle = Math.atan2(dy, dx) - facing;
      const viewX = centerX + Math.cos(angle) * distToPainting * 80;
      const viewY = centerY + Math.sin(angle) * distToPainting * 80;
      const glowSize = Math.max(20, 100 - distToPainting * 20);
      
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(viewX, viewY, glowSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 16px "Share Tech Mono"';
      ctx.textAlign = 'center';
      ctx.fillText('PAINTING', viewX, viewY + glowSize + 20);
    }

    // Crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 10, centerY);
    ctx.lineTo(centerX + 10, centerY);
    ctx.moveTo(centerX, centerY - 10);
    ctx.lineTo(centerX, centerY + 10);
    ctx.stroke();

    // HUD
    ctx.fillStyle = '#666';
    ctx.font = '12px "Share Tech Mono"';
    ctx.textAlign = 'left';
    ctx.fillText('FOLLOW HACKER INSTRUCTIONS', 10, 20);
    ctx.fillText('USE WASD OR ARROW KEYS TO MOVE', 10, 40);
  }

  // Game loop (host only)
  function hostGameLoop() {
    if(gameState.gameLost || gameState.gameWon) return;

    updateLasers();
    updateCameras();

    // Check collisions
    const laserHit = checkLaserCollision();
    const cameraSpotted = checkCameraDetection();
    
    if(laserHit || cameraSpotted) {
      if(!gameState.alarmTriggered) {
        console.log('ALARM TRIGGERED!', {laserHit, cameraSpotted, thiefPos: {x: gameState.thief.x, y: gameState.thief.y}});
        gameState.alarmTriggered = true;
        gameState.gameLost = true;
        alarmText.textContent = 'ALARM!';
        alarmText.classList.add('alarm-triggered');
        audio.explosion();
        nm.sendData('game', { type: 'alarm' });
        gameStatus.textContent = '🚨 ALARM TRIGGERED! MISSION FAILED!';
        gameStatus.style.color = '#ff0040';
        
        // Auto-respawn after 3 seconds
        setTimeout(() => {
          resetGame();
        }, 3000);
        return;
      }
    }

    // Check win
    if(checkWin()) {
      gameState.gameWon = true;
      audio.win();
      
      if(gameState.currentLevel < gameState.maxLevel) {
        nm.sendData('game', { type: 'levelComplete', nextLevel: gameState.currentLevel + 1 });
        gameStatus.textContent = '🎉 LEVEL ' + gameState.currentLevel + ' COMPLETE! Next level in 3s...';
        gameStatus.style.color = '#0f0';
        
        setTimeout(() => {
          loadLevel(gameState.currentLevel + 1);
          nm.sendData('game', { type: 'loadLevel', level: gameState.currentLevel });
        }, 3000);
      } else {
        nm.sendData('game', { type: 'win' });
        gameStatus.textContent = '🎉🎉🎉 ALL LEVELS COMPLETE! YOU WIN! 🎉🎉🎉';
        gameStatus.style.color = '#0f0';
        clearInterval(gameTimer);
      }
      return;
    }

    // Update timer
    gameState.timeRemaining -= 1/30;
    if(gameState.timeRemaining <= 0) {
      gameState.gameLost = true;
      audio.explosion();
      nm.sendData('game', { type: 'timeout' });
      gameStatus.textContent = '⏰ TIME UP! MISSION FAILED!';
      gameStatus.style.color = '#ff0040';
      
      // Auto-respawn after 3 seconds
      setTimeout(() => {
        resetGame();
      }, 3000);
      return;
    }

    // Send state to client
    nm.sendData('state', {
      thief: gameState.thief,
      painting: gameState.painting,
      lasers: lasers,
      cameras: cameras,
      timeRemaining: gameState.timeRemaining,
      alarmTriggered: gameState.alarmTriggered
    });

    // Update timer display
    const mins = Math.floor(gameState.timeRemaining / 60);
    const secs = Math.floor(gameState.timeRemaining % 60);
    timeDisplay.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  function hackerLoop() {
    drawHackerView();
    animationId = requestAnimationFrame(hackerLoop);
  }

  function thiefLoop() {
    drawThiefView();
    animationId = requestAnimationFrame(thiefLoop);
  }

  // Movement handling (thief only)
  function moveThief(dx, dy, newFacing) {
    const step = 0.3; // Smaller, more precise movement
    const newX = gameState.thief.x + dx * step;
    const newY = gameState.thief.y + dy * step;
    
    if(!isWall(newX, gameState.thief.y)) {
      gameState.thief.x = newX;
    }
    if(!isWall(gameState.thief.x, newY)) {
      gameState.thief.y = newY;
    }
    
    gameState.thief.facing = newFacing;
    audio.click();
    
    console.log('Thief moved to:', gameState.thief.x.toFixed(2), gameState.thief.y.toFixed(2));
    
    // Send movement to host
    nm.sendData('move', { thief: gameState.thief });
  }

  // Keyboard controls
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    
    if(role === 'client' && !gameState.gameWon && !gameState.gameLost) {
      if(e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        moveThief(0.5, 0, 0);
      } else if(e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
        moveThief(0, 0.5, 1);
      } else if(e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        moveThief(-0.5, 0, 2);
      } else if(e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
        moveThief(0, -0.5, 3);
      }
    }
  });

  window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
  });

  // Host flow
  function startHostFlow() {
    hostStatus.textContent = 'Initializing...';
    audio.startMusic();
    
    // Load level 1
    loadLevel(1);

    nm.startHost().then(code => {
      role = 'host';
      roomCodeSpan.textContent = code;
      hostWrap.style.display = 'block';
      gameArea.style.display = 'block';
      gameStatus.textContent = 'You are HACKER. Guide the thief to the painting!';
      controlsText.textContent = 'Watch the blueprint. Guide your partner through voice chat!';
      hostStatus.textContent = 'Waiting for thief...';
      hostStatus.style.color = '#ffd166';

      nm.onData(packet => {
        if(packet.type === 'move') {
          gameState.thief = packet.payload.thief;
        }
      });

      gameTimer = setInterval(hostGameLoop, 1000/30);
      hackerLoop();

      const checkConn = setInterval(() => {
        if(nm.conn && nm.conn.open) {
          hostStatus.textContent = '✅ Thief connected!';
          hostStatus.style.color = '#0f0';
          clearInterval(checkConn);
        }
      }, 300);
    }).catch(err => {
      hostStatus.textContent = '❌ Failed: ' + err.message;
      alert('Failed to create host. Please refresh and try again.\n\nError: ' + err.message);
    });
  }

  // Client flow
  function startClientFlow(code) {
    clientStatus.textContent = 'Connecting to room ' + code + '...';
    
    // Load level 1
    loadLevel(1);

    nm.joinRoom(code).then(() => {
      role = 'client';
      clientWrap.style.display = 'none';
      gameArea.style.display = 'block';
      gameStatus.textContent = '✅ Connected! You are THIEF. Find the painting!';
      controlsText.textContent = 'WASD or Arrow Keys to move. Follow hacker\'s instructions!';
      audio.click();
      audio.startMusic();

      nm.onData(packet => {
        if(packet.type === 'state') {
          gameState.thief = packet.payload.thief;
          gameState.painting = packet.payload.painting;
          gameState.timeRemaining = packet.payload.timeRemaining;
          gameState.alarmTriggered = packet.payload.alarmTriggered;
          
          // Update timer display
          const mins = Math.floor(gameState.timeRemaining / 60);
          const secs = Math.floor(gameState.timeRemaining % 60);
          timeDisplay.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
          
          if(gameState.alarmTriggered) {
            alarmText.textContent = 'ALARM!';
            alarmText.classList.add('alarm-triggered');
          }
        } else if(packet.type === 'game') {
          if(packet.payload.type === 'win') {
            gameState.gameWon = true;
            gameStatus.textContent = '🎉🎉🎉 ALL LEVELS COMPLETE! YOU WIN! 🎉🎉🎉';
            gameStatus.style.color = '#0f0';
            audio.win();
          } else if(packet.payload.type === 'levelComplete') {
            gameState.gameWon = true;
            gameStatus.textContent = '🎉 LEVEL ' + gameState.currentLevel + ' COMPLETE! Next level in 3s...';
            gameStatus.style.color = '#0f0';
            audio.win();
          } else if(packet.payload.type === 'loadLevel') {
            loadLevel(packet.payload.level);
            gameState.gameWon = false;
            gameState.gameLost = false;
          } else if(packet.payload.type === 'alarm' || packet.payload.type === 'timeout') {
            gameState.gameLost = true;
            gameStatus.textContent = packet.payload.type === 'alarm' ? 
              '🚨 ALARM! MISSION FAILED!' : '⏰ TIME UP! MISSION FAILED!';
            gameStatus.style.color = '#ff0040';
            audio.explosion();
            
            // Auto-respawn after 3 seconds
            setTimeout(() => {
              gameState.gameWon = false;
              gameState.gameLost = false;
              gameState.alarmTriggered = false;
              alarmText.textContent = 'CLEAR';
              alarmText.classList.remove('alarm-triggered');
              gameStatus.textContent = 'LEVEL ' + gameState.currentLevel + ' - Find the painting!';
              gameStatus.style.color = '#00d4ff';
            }, 3000);
          } else if(packet.payload.type === 'reset') {
            loadLevel(packet.payload.level);
          }
        }
      });

      thiefLoop();
    }).catch(err => {
      clientStatus.textContent = '❌ ' + err.message;
      joinBtn.disabled = false;
      codeInput.disabled = false;
    });
  }

  hostBtn.addEventListener('click', () => {
    hostBtn.disabled = true;
    clientBtn.disabled = true;
    startHostFlow();
  });

  clientBtn.addEventListener('click', () => {
    hostBtn.disabled = true;
    clientBtn.disabled = true;
    clientWrap.style.display = 'block';
  });

  joinBtn.addEventListener('click', () => {
    const code = codeInput.value.trim().toUpperCase();
    if(!code || code.length !== 4) {
      clientStatus.textContent = '⚠️ Please enter a 4-letter room code';
      return;
    }
    joinBtn.disabled = true;
    codeInput.disabled = true;
    startClientFlow(code);
  });
})();
