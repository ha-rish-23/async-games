// Gate Closing Ritual - Stranger Things
const nm = new window.NetworkManager();
const audio = new window.AudioManager();

const ROLES = {
  ANCHOR: {
    name: 'THE ANCHOR',
    description: 'Hold the gate steady by maintaining concentration. Click when the gate pulses!',
    action: 'CONCENTRATE',
    cooldown: 3000
  },
  CHANTER: {
    name: 'THE CHANTER',
    description: 'Channel energy through words of power. Time your chants with the ritual!',
    action: 'CHANT',
    cooldown: 4000
  },
  WARD: {
    name: 'THE WARD',
    description: 'Protect the ritual from interference. Banish tentacles before they disrupt!',
    action: 'BANISH',
    cooldown: 5000
  },
  FOCUS: {
    name: 'THE FOCUS',
    description: 'Direct the combined energy. Synchronize the ritual at critical moments!',
    action: 'SYNCHRONIZE',
    cooldown: 6000
  }
};

const gameState = {
  playerCount: 4,
  players: [],
  myRole: null,
  isHost: false,
  gameStarted: false,
  gateHealth: 100,
  ritualPower: 0,
  ritualPhase: 'PREPARING',
  syncLevel: 0,
  tentaclesActive: 0,
  phaseStartTime: 0,
  actionCooldowns: {}
};

let selectedPlayerCount = 4;

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

// Player count selection
document.querySelectorAll('.player-count-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.player-count-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedPlayerCount = parseInt(btn.dataset.count);
    gameState.playerCount = selectedPlayerCount;
  });
});

document.getElementById('createRoomBtn').addEventListener('click', async () => {
  try {
    const roomCode = await nm.startHost();
    document.getElementById('roomCodeDisplay').textContent = roomCode;
    document.getElementById('createRoomBtn').style.display = 'none';
    document.getElementById('waitingArea').style.display = 'block';
    
    gameState.players.push({ id: nm.peer.id, name: 'Host', ready: true });
    updatePlayersList();
    
    nm.onData((data) => onDataReceived(data));
    
    const checkConnection = setInterval(() => {
      if (gameState.players.length >= gameState.playerCount) {
        clearInterval(checkConnection);
        document.getElementById('startGameBtn').style.display = 'block';
      }
    }, 500);
    
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
    nm.onData((data) => onDataReceived(data));
    await nm.joinRoom(roomCode);
    
    // Send join notification to host after a brief delay
    setTimeout(() => {
      nm.sendData('playerJoined', { id: nm.peer.id, name: 'Player' + Math.floor(Math.random() * 1000) });
    }, 500);
    
  } catch (err) {
    alert('Failed to join room: ' + err.message);
  }
});

document.getElementById('startGameBtn').addEventListener('click', () => {
  if (gameState.players.length < 2) {
    alert('Need at least 2 players to start!');
    return;
  }
  
  // Assign roles
  const roleKeys = Object.keys(ROLES);
  const rolesToAssign = gameState.playerCount === 2 ? ['ANCHOR', 'CHANTER'] :
                       gameState.playerCount === 3 ? ['ANCHOR', 'CHANTER', 'WARD'] :
                       ['ANCHOR', 'CHANTER', 'WARD', 'FOCUS'];
  
  gameState.players.forEach((player, index) => {
    player.role = rolesToAssign[index % rolesToAssign.length];
  });
  
  // Send game start
  nm.sendData('gameStart', { players: gameState.players });
  startGame();
});

// Network
function onDataReceived(data) {
  if (data.type === 'playerJoined') {
    if (gameState.isHost) {
      gameState.players.push({ 
        id: data.payload.id, 
        name: data.payload.name, 
        ready: true 
      });
      updatePlayersList();
      
      if (gameState.players.length >= gameState.playerCount) {
        document.getElementById('startGameBtn').style.display = 'block';
      }
    }
  } else if (data.type === 'gameStart') {
    gameState.players = data.payload.players;
    startGame();
  } else if (data.type === 'roleAction') {
    handleRoleAction(data.payload);
  } else if (data.type === 'gameUpdate') {
    updateGameState(data.payload);
  }
}

function updatePlayersList() {
  const list = document.getElementById('playersList');
  list.innerHTML = '';
  
  gameState.players.forEach(player => {
    const div = document.createElement('div');
    div.className = 'player-item';
    div.textContent = player.name;
    list.appendChild(div);
  });
}

// Game Start
function startGame() {
  document.getElementById('setupScreen').classList.remove('active');
  document.getElementById('gameScreen').style.display = 'grid';
  
  // Find my role
  const myPlayer = gameState.players.find(p => p.id === nm.peer.id);
  if (myPlayer) {
    gameState.myRole = myPlayer.role;
  } else {
    gameState.myRole = gameState.players[0].role; // Fallback
  }
  
  setupRole();
  createTentacles();
  updatePlayersGrid();
  
  gameState.gameStarted = true;
  gameState.ritualPhase = 'CHANNELING';
  gameState.phaseStartTime = Date.now();
  
  if (gameState.isHost) {
    startGameLoop();
  }
}

// Role Setup
function setupRole() {
  const role = ROLES[gameState.myRole];
  document.getElementById('roleName').textContent = role.name;
  document.getElementById('roleDescription').textContent = role.description;
  
  const actionDiv = document.getElementById('roleAction');
  actionDiv.innerHTML = `
    <button class="action-btn" id="roleActionBtn">${role.action}</button>
  `;
  
  document.getElementById('roleActionBtn').addEventListener('click', performRoleAction);
}

function performRoleAction() {
  const role = ROLES[gameState.myRole];
  const now = Date.now();
  
  // Check cooldown
  if (gameState.actionCooldowns[gameState.myRole] && 
      now < gameState.actionCooldowns[gameState.myRole]) {
    return;
  }
  
  // Set cooldown
  gameState.actionCooldowns[gameState.myRole] = now + role.cooldown;
  
  // Visual feedback
  const btn = document.getElementById('roleActionBtn');
  btn.disabled = true;
  document.getElementById('cooldownIndicator').style.display = 'block';
  
  setTimeout(() => {
    btn.disabled = false;
    document.getElementById('cooldownIndicator').style.display = 'none';
  }, role.cooldown);
  
  // Send action
  nm.sendData('roleAction', { 
    role: gameState.myRole,
    timestamp: now
  });
  
  // Local effect
  applyRoleEffect(gameState.myRole);
  audio.blip();
}

function handleRoleAction(data) {
  applyRoleEffect(data.role);
}

function applyRoleEffect(role) {
  switch (role) {
    case 'ANCHOR':
      gameState.syncLevel += 10;
      break;
    case 'CHANTER':
      gameState.ritualPower += 15;
      break;
    case 'WARD':
      gameState.tentaclesActive = Math.max(0, gameState.tentaclesActive - 1);
      break;
    case 'FOCUS':
      gameState.syncLevel += 20;
      gameState.ritualPower += 10;
      break;
  }
  
  updateDisplay();
}

// Game Loop (Host only)
function startGameLoop() {
  setInterval(() => {
    const elapsed = Date.now() - gameState.phaseStartTime;
    
    // Update gate health
    if (gameState.ritualPower >= 80 && gameState.syncLevel >= 60) {
      gameState.gateHealth -= 2;
    } else if (gameState.ritualPower < 40 || gameState.syncLevel < 30) {
      gameState.gateHealth += 1;
    }
    
    // Decay
    gameState.ritualPower = Math.max(0, gameState.ritualPower - 0.5);
    gameState.syncLevel = Math.max(0, gameState.syncLevel - 0.3);
    
    // Spawn tentacles
    if (elapsed > 5000 && Math.random() < 0.02) {
      gameState.tentaclesActive++;
      if (gameState.tentaclesActive > 3) {
        gameState.gateHealth += 5;
        gameState.tentaclesActive = 3;
      }
    }
    
    // Clamp values
    gameState.gateHealth = Math.max(0, Math.min(100, gameState.gateHealth));
    gameState.ritualPower = Math.min(100, gameState.ritualPower);
    gameState.syncLevel = Math.min(100, gameState.syncLevel);
    
    updateDisplay();
    
    // Broadcast state
    nm.sendData('gameUpdate', {
      gateHealth: gameState.gateHealth,
      ritualPower: gameState.ritualPower,
      syncLevel: gameState.syncLevel,
      tentaclesActive: gameState.tentaclesActive
    });
    
    // Check win/loss
    if (gameState.gateHealth <= 0) {
      endGame(true);
    } else if (gameState.gateHealth >= 100) {
      endGame(false);
    }
  }, 100);
}

function updateGameState(data) {
  gameState.gateHealth = data.gateHealth;
  gameState.ritualPower = data.ritualPower;
  gameState.syncLevel = data.syncLevel;
  gameState.tentaclesActive = data.tentaclesActive;
  updateDisplay();
}

// Display Updates
function updateDisplay() {
  // Gate health
  const healthBar = document.getElementById('gateHealth');
  healthBar.style.width = gameState.gateHealth + '%';
  
  if (gameState.gateHealth > 60) {
    healthBar.style.fill = 'var(--success-green)';
  } else if (gameState.gateHealth > 30) {
    healthBar.style.fill = '#ffeb3b';
  } else {
    healthBar.style.fill = 'var(--fail-red)';
  }
  
  document.getElementById('gateStatus').textContent = `GATE INTEGRITY: ${gameState.gateHealth.toFixed(0)}%`;
  document.getElementById('gateStatus').style.color = 
    gameState.gateHealth > 60 ? 'var(--success-green)' :
    gameState.gateHealth > 30 ? '#ffeb3b' : 'var(--fail-red)';
  
  // Ritual status
  document.getElementById('phaseDisplay').textContent = gameState.ritualPhase;
  document.getElementById('syncDisplay').textContent = gameState.syncLevel.toFixed(0) + '%';
  document.getElementById('powerDisplay').textContent = gameState.ritualPower.toFixed(0) + '%';
}

function createTentacles() {
  const svg = document.getElementById('tentacles');
  
  for (let i = 0; i < 6; i++) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const angle = (i * 60) * Math.PI / 180;
    const startX = 200 + Math.cos(angle) * 120;
    const startY = 250 + Math.sin(angle) * 150;
    const endX = 200 + Math.cos(angle) * 180;
    const endY = 250 + Math.sin(angle) * 220;
    
    path.setAttribute('d', `M200,250 Q${startX},${startY} ${endX},${endY}`);
    path.classList.add('tentacle');
    path.style.animationDelay = (i * 0.5) + 's';
    svg.appendChild(path);
  }
}

function updatePlayersGrid() {
  const grid = document.getElementById('playersGrid');
  grid.innerHTML = '';
  
  gameState.players.forEach(player => {
    const card = document.createElement('div');
    card.className = 'player-card';
    if (player.id === nm.peer.id) card.classList.add('active');
    
    const role = ROLES[player.role];
    card.innerHTML = `
      <div class="player-name">${player.name}</div>
      <div class="player-role">${role.name}</div>
    `;
    
    grid.appendChild(card);
  });
}

// End Game
function endGame(victory) {
  gameState.gameStarted = false;
  
  const resultScreen = document.getElementById('resultScreen');
  const resultTitle = document.getElementById('resultTitle');
  const resultMessage = document.getElementById('resultMessage');
  
  resultTitle.textContent = victory ? 'GATE CLOSED' : 'RITUAL FAILED';
  resultTitle.className = 'result-title ' + (victory ? 'victory' : 'defeat');
  
  resultMessage.textContent = victory ? 
    'The gate has been sealed. The Upside Down cannot reach through... for now.' :
    'The gate grows stronger. The darkness spreads. You must try again.';
  
  resultScreen.style.display = 'flex';
}

document.getElementById('playAgainBtn').addEventListener('click', () => {
  location.reload();
});
