// Assembly Line: The Bomb - Game Logic
// Technician sees the bomb, Expert reads the manual

const GAME_DURATION = 300; // 5 minutes in seconds
const nm = new window.NetworkManager();
const audio = new window.AudioManager();

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

document.getElementById('createRoomBtn').addEventListener('click', async () => {
  isHost = true;
  
  try {
    const roomCode = await nm.startHost();
    console.log('Generated room code:', roomCode);
    
    const display = document.getElementById('roomCodeDisplay');
    display.textContent = roomCode;
    console.log('Display updated to:', display.textContent);
    
    document.getElementById('createRoomBtn').style.display = 'none';
    document.getElementById('waitingMsg').style.display = 'block';
    
    // Set up data handler
    nm.onData((data) => onDataReceived(data));
    
    // Wait for client to connect - NetworkManager fires 'connection' event on peer
    // We need to poll for connection
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
  console.log('Attempting to join room:', roomCode);
  
  if (roomCode.length !== 4) {
    console.error('Invalid room code length:', roomCode.length);
    alert('Please enter a 4-character room code');
    return;
  }
  
  try {
    console.log('Initializing network as client...');
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
  console.log('Received data:', data);
  
  if (data.type === 'gameState') {
    updateExpertView(data.payload);
  } else if (data.type === 'gameInit') {
    updateManualCode(data.payload.code);
    if (data.payload.wireColors) {
      updateWireColors(data.payload.wireColors);
    }
  } else if (data.type === 'gameEnd') {
    showResult(data.payload.success, data.payload.message);
  }
}

// Initialize game (host only)
function initializeGame() {
  // Randomize wire colors and positions
  const availableColors = ['red', 'blue', 'yellow'];
  const shuffledColors = availableColors.sort(() => Math.random() - 0.5);
  
  // Determine correct wire based on position rules
  // Rule: If red is at top -> cut red, if blue is in middle -> cut blue, if yellow is at bottom -> cut yellow
  // Otherwise, cut the last one (bottom)
  let correctWire = shuffledColors[2]; // Default to bottom wire
  
  if (shuffledColors[0] === 'red') {
    correctWire = 'red';
  } else if (shuffledColors[1] === 'blue') {
    correctWire = 'blue';
  } else if (shuffledColors[2] === 'yellow') {
    correctWire = 'yellow';
  }
  
  gameState.modules.wire.correctWire = correctWire;
  gameState.modules.wire.wireColors = shuffledColors; // Store for rendering
  
  // Update SVG wire colors
  document.getElementById('wire-red').setAttribute('stroke', getColorHex(shuffledColors[0]));
  document.getElementById('wire-red').setAttribute('data-color', shuffledColors[0]);
  document.getElementById('wire-blue').setAttribute('stroke', getColorHex(shuffledColors[1]));
  document.getElementById('wire-blue').setAttribute('data-color', shuffledColors[1]);
  document.getElementById('wire-yellow').setAttribute('stroke', getColorHex(shuffledColors[2]));
  document.getElementById('wire-yellow').setAttribute('data-color', shuffledColors[2]);
  
  // Randomize button label
  gameState.modules.button.label = Math.random() > 0.5 ? 'PRESS' : 'HOLD';
  document.getElementById('buttonLabel').textContent = gameState.modules.button.label;
  
  // Generate keypad code
  gameState.modules.keypad.code = Math.floor(1000 + Math.random() * 9000).toString();
  
  // Send initial data to expert
  nm.sendData('gameInit', {
    code: gameState.modules.keypad.code,
    wireColors: shuffledColors // Send wire positions to Expert
  });
  
  console.log('Game initialized:', gameState.modules);
  console.log('Wire colors (top to bottom):', shuffledColors);
  console.log('Correct wire to cut:', correctWire);
}

function getColorHex(colorName) {
  const colors = {
    'red': '#ff0000',
    'blue': '#0066ff',
    'yellow': '#ffff00'
  };
  return colors[colorName];
}

function startGame() {
  gameState.gameActive = true;
  gameState.timeRemaining = GAME_DURATION;
  
  // Start ticking sound
  audio.startMusic();
  
  // Start timer
  gameState.timerInterval = setInterval(() => {
    gameState.timeRemaining--;
    updateTimerDisplay();
    
    // Send state to expert
    nm.sendData('gameState', {
      timeRemaining: gameState.timeRemaining,
      modulesSolved: gameState.modulesSolved
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
  document.querySelectorAll('#symbolModule text[id^="symbol"]').forEach(symbolEl => {
    symbolEl.style.cursor = 'pointer';
    symbolEl.addEventListener('click', (e) => {
      const symbol = e.target.textContent.trim();
      console.log('Symbol clicked:', symbol);
      pressSymbol(symbol);
    });
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
    audio.blip();
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
    audio.blip();
  } else if (label === 'HOLD' && pressDuration >= 3000) {
    solveModule('button');
    audio.blip();
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
    audio.click();
    console.log('Correct symbol! Progress:', pressed.length, '/', correctOrder.length);
    
    if (pressed.length === correctOrder.length) {
      solveModule('symbol');
      audio.blip();
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
  audio.click();
  
  if (gameState.modules.keypad.entered.length === 4) {
    if (gameState.modules.keypad.entered === gameState.modules.keypad.code) {
      solveModule('keypad');
      audio.blip();
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
  
  nm.sendData('gameEnd', {
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
    audio.win();
  } else {
    audio.explosion();
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

function updateWireColors(wireColors) {
  // Update the manual with actual wire positions
  const wireTable = document.querySelector('.wire-table');
  const colorNames = {
    'red': 'RED',
    'blue': 'BLUE', 
    'yellow': 'YELLOW'
  };
  
  wireTable.innerHTML = `
    <tr>
      <th>Wire Position</th>
      <th>Color</th>
      <th>Action</th>
    </tr>
    <tr>
      <td>Top wire</td>
      <td><span class="wire-color ${wireColors[0]}">${colorNames[wireColors[0]]}</span></td>
      <td>Cut this if it's RED</td>
    </tr>
    <tr>
      <td>Middle wire</td>
      <td><span class="wire-color ${wireColors[1]}">${colorNames[wireColors[1]]}</span></td>
      <td>Cut this if it's BLUE</td>
    </tr>
    <tr>
      <td>Bottom wire</td>
      <td><span class="wire-color ${wireColors[2]}">${colorNames[wireColors[2]]}</span></td>
      <td>Cut this if it's YELLOW</td>
    </tr>
    <tr>
      <td colspan="3"><strong>Otherwise:</strong> Cut the bottom wire</td>
    </tr>
  `;
}
