// Assembly Line: The Bomb - Game Logic
// Technician sees the bomb, Expert reads the manual

const GAME_DURATION = 300; // 5 minutes in seconds

const gameState = {
  timeRemaining: GAME_DURATION,
  modulesSolved: 0,
  totalModules: 4,
  modules: {
    wire: { solved: false, correctWire: null },
    button: { solved: false, label: 'PRESS', pressTime: null },
    symbol: { solved: false, order: ['★', '●', '◆', '✦'], pressed: [] },
    keypad: { solved: false, code: '', entered: '' }
  },
  gameActive: false,
  timerInterval: null
};

let isHost = false;

// Setup event listeners
document.getElementById('hostBtn').addEventListener('click', () => {
  document.querySelector('.role-select').style.display = 'none';
  document.getElementById('hostSetup').style.display = 'block';
});

document.getElementById('joinBtn').addEventListener('click', () => {
  document.querySelector('.role-select').style.display = 'none';
  document.getElementById('joinSetup').style.display = 'block';
});

document.getElementById('createRoomBtn').addEventListener('click', () => {
  isHost = true;
  const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
  document.getElementById('roomCodeDisplay').textContent = roomCode;
  document.getElementById('createRoomBtn').style.display = 'none';
  document.getElementById('waitingMsg').style.display = 'block';
  
  initNetwork(roomCode, true, onPeerConnected, onDataReceived);
});

document.getElementById('joinRoomBtn').addEventListener('click', () => {
  isHost = false;
  const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  if (roomCode.length === 4) {
    initNetwork(roomCode, false, onPeerConnected, onDataReceived);
  }
});

document.getElementById('playAgainBtn').addEventListener('click', () => {
  location.reload();
});

// Network callbacks
function onPeerConnected() {
  console.log('Peer connected!');
  
  if (isHost) {
    // Technician view - initialize game
    initializeGame();
    document.getElementById('setupScreen').classList.remove('active');
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('technicianView').style.display = 'block';
    startGame();
  } else {
    // Expert view - show manual
    document.getElementById('setupScreen').classList.remove('active');
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('expertView').style.display = 'block';
  }
}

function onDataReceived(data) {
  if (data.type === 'gameState') {
    updateExpertView(data.state);
  } else if (data.type === 'gameInit') {
    updateManualCode(data.code);
  } else if (data.type === 'gameEnd') {
    showResult(data.success, data.message);
  }
}

// Initialize game (host only)
function initializeGame() {
  // Randomize wire puzzle (simple: always one of the three)
  const wires = ['red', 'blue', 'yellow'];
  gameState.modules.wire.correctWire = wires[Math.floor(Math.random() * 3)];
  
  // Randomize button label
  gameState.modules.button.label = Math.random() > 0.5 ? 'PRESS' : 'HOLD';
  document.getElementById('buttonLabel').textContent = gameState.modules.button.label;
  
  // Generate keypad code
  gameState.modules.keypad.code = Math.floor(1000 + Math.random() * 9000).toString();
  
  // Send initial data to expert
  sendData({
    type: 'gameInit',
    code: gameState.modules.keypad.code
  });
  
  console.log('Game initialized:', gameState.modules);
}

function startGame() {
  gameState.gameActive = true;
  gameState.timeRemaining = GAME_DURATION;
  
  // Start timer
  gameState.timerInterval = setInterval(() => {
    gameState.timeRemaining--;
    updateTimerDisplay();
    
    // Send state to expert
    sendData({
      type: 'gameState',
      state: {
        timeRemaining: gameState.timeRemaining,
        modulesSolved: gameState.modulesSolved
      }
    });
    
    if (gameState.timeRemaining <= 0) {
      endGame(false, 'Time ran out! The bomb exploded!');
    }
  }, 1000);
  
  // Wire module
  document.querySelectorAll('.wire').forEach(wire => {
    wire.addEventListener('click', () => cutWire(wire));
  });
  
  // Button module
  const button = document.getElementById('mainButton');
  button.addEventListener('mousedown', onButtonPress);
  button.addEventListener('mouseup', onButtonRelease);
  
  // Symbol module
  document.querySelectorAll('#symbolModule text[id^="symbol"]').forEach(symbol => {
    symbol.style.cursor = 'pointer';
    symbol.addEventListener('click', () => pressSymbol(symbol.textContent));
  });
  
  // Keypad module
  document.querySelectorAll('.keypad-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const num = e.target.getAttribute('data-num') || e.target.parentElement.getAttribute('data-num');
      enterKeypadDigit(num);
    });
  });
}

// Wire Module
function cutWire(wireElement) {
  if (gameState.modules.wire.solved) return;
  
  const color = wireElement.getAttribute('data-color');
  wireElement.classList.add('cut');
  
  if (color === gameState.modules.wire.correctWire) {
    solveModule('wire');
    AudioManager.playSuccess();
  } else {
    endGame(false, 'Wrong wire! The bomb exploded!');
  }
}

// Button Module
let buttonPressStartTime = null;

function onButtonPress() {
  buttonPressStartTime = Date.now();
}

function onButtonRelease() {
  if (gameState.modules.button.solved) return;
  
  const pressDuration = Date.now() - buttonPressStartTime;
  const label = gameState.modules.button.label;
  
  if (label === 'PRESS' && pressDuration < 500) {
    solveModule('button');
    AudioManager.playSuccess();
  } else if (label === 'HOLD' && pressDuration >= 3000) {
    solveModule('button');
    AudioManager.playSuccess();
  } else {
    endGame(false, 'Wrong button action! The bomb exploded!');
  }
}

// Symbol Module
function pressSymbol(symbol) {
  if (gameState.modules.symbol.solved) return;
  
  const pressed = gameState.modules.symbol.pressed;
  const correctOrder = gameState.modules.symbol.order;
  
  // Check if this is the next correct symbol
  if (symbol === correctOrder[pressed.length]) {
    pressed.push(symbol);
    AudioManager.playTick();
    
    if (pressed.length === correctOrder.length) {
      solveModule('symbol');
      AudioManager.playSuccess();
    }
  } else {
    endGame(false, 'Wrong symbol order! The bomb exploded!');
  }
}

// Keypad Module
function enterKeypadDigit(digit) {
  if (gameState.modules.keypad.solved) return;
  
  const entered = gameState.modules.keypad.entered;
  if (entered.length >= 4) return;
  
  gameState.modules.keypad.entered += digit;
  updateKeypadDisplay();
  AudioManager.playTick();
  
  if (gameState.modules.keypad.entered.length === 4) {
    if (gameState.modules.keypad.entered === gameState.modules.keypad.code) {
      solveModule('keypad');
      AudioManager.playSuccess();
    } else {
      endGame(false, 'Wrong code! The bomb exploded!');
    }
  }
}

function updateKeypadDisplay() {
  const display = gameState.modules.keypad.entered.padEnd(4, '_');
  document.getElementById('keypadDisplay').textContent = display;
}

// Solve module
function solveModule(moduleName) {
  gameState.modules[moduleName].solved = true;
  gameState.modulesSolved++;
  
  // Visual feedback
  const moduleMap = {
    wire: 'wireModule',
    button: 'buttonModule',
    symbol: 'symbolModule',
    keypad: 'keypadModule'
  };
  
  document.getElementById(moduleMap[moduleName]).classList.add('solved');
  document.getElementById('modulesDisplay').textContent = `${gameState.modulesSolved}/${gameState.totalModules}`;
  
  // Check win condition
  if (gameState.modulesSolved === gameState.totalModules) {
    endGame(true, 'All modules defused! You saved the day!');
  }
}

// End game
function endGame(success, message) {
  gameState.gameActive = false;
  clearInterval(gameState.timerInterval);
  
  sendData({
    type: 'gameEnd',
    success: success,
    message: message
  });
  
  showResult(success, message);
}

function showResult(success, message) {
  const resultScreen = document.getElementById('resultScreen');
  const resultContent = resultScreen.querySelector('.result-content');
  
  resultScreen.style.display = 'flex';
  resultContent.classList.add(success ? 'success' : 'failure');
  
  document.getElementById('resultTitle').textContent = success ? 'SUCCESS!' : 'FAILED!';
  document.getElementById('resultMessage').textContent = message;
  
  if (success) {
    AudioManager.playWin();
  } else {
    AudioManager.playLose();
  }
}

// Update displays
function updateTimerDisplay() {
  const minutes = Math.floor(gameState.timeRemaining / 60);
  const seconds = gameState.timeRemaining % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  document.getElementById('timerDisplay').textContent = timeString;
  document.getElementById('bombTimer').textContent = timeString;
  
  // Color change when time is low
  if (gameState.timeRemaining <= 30) {
    document.getElementById('bombTimer').setAttribute('fill', '#ff0000');
  }
}

function updateExpertView(state) {
  const minutes = Math.floor(state.timeRemaining / 60);
  const seconds = state.timeRemaining % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  document.getElementById('expertTimer').textContent = timeString;
}

function updateManualCode(code) {
  document.getElementById('manualCode').textContent = code;
}
