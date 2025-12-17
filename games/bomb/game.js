// Assembly Line: The Bomb - Game Logic
// Technician sees the bomb, Expert reads the manual

const GAME_DURATION = 300; // 5 minutes in seconds
const nm = new window.NetworkManager();
const audio = new window.AudioManager();

const gameState = {
  timeRemaining: GAME_DURATION,
  modulesSolved: 0,
  totalModules: 4,
  difficulty: 1, // 1 = Easy, 2 = Medium, 3 = Hard
  modules: {
    wire: { solved: false, correctWire: null, wireColors: [] },
    button: { solved: false, label: 'PRESS', pressTime: null, color: 'red' },
    symbol: { solved: false, order: [], pressed: [], symbols: [] },
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
      updateWireManual(data.payload.wireColors, data.payload.wireCount);
    }
    if (data.payload.buttonLabel) {
      updateButtonManual(data.payload.buttonLabel, data.payload.buttonColor);
    }
    if (data.payload.symbols) {
      updateSymbolManual(data.payload.symbols, data.payload.symbolOrder);
    }
  } else if (data.type === 'gameEnd') {
    showResult(data.payload.success, data.payload.message);
  }
}

// Initialize game (host only)
function initializeGame() {
  // === WIRE MODULE ===
  const availableColors = ['red', 'blue', 'yellow', 'green', 'white'];
  const numWires = 3 + Math.floor(Math.random() * 2); // 3-4 wires
  const shuffledColors = availableColors.sort(() => Math.random() - 0.5).slice(0, numWires);
  
  // Wire cutting logic:
  let correctWire;
  const hasRed = shuffledColors.includes('red');
  const hasBlue = shuffledColors.includes('blue');
  const hasYellow = shuffledColors.includes('yellow');
  const redPos = shuffledColors.indexOf('red');
  const bluePos = shuffledColors.indexOf('blue');
  const yellowPos = shuffledColors.indexOf('yellow');
  
  // Complex rules for variety
  if (hasRed && redPos === 0) {
    correctWire = 'red'; // Red at top
  } else if (hasBlue && bluePos === 1 && numWires >= 3) {
    correctWire = 'blue'; // Blue in middle
  } else if (hasYellow && yellowPos === numWires - 1) {
    correctWire = 'yellow'; // Yellow at bottom
  } else if (!hasRed && hasBlue) {
    correctWire = 'blue'; // No red? Cut blue
  } else if (shuffledColors.filter(c => c === shuffledColors[0]).length === 1) {
    correctWire = shuffledColors[0]; // First wire if unique color
  } else {
    correctWire = shuffledColors[numWires - 1]; // Last wire
  }
  
  gameState.modules.wire.correctWire = correctWire;
  gameState.modules.wire.wireColors = shuffledColors;
  
  // Update SVG wires
  updateWireDisplay(shuffledColors);
  
  // === BUTTON MODULE ===
  const buttonLabels = ['PRESS', 'HOLD', 'DETONATE', 'ABORT'];
  const buttonColors = ['red', 'blue', 'yellow', 'white'];
  gameState.modules.button.label = buttonLabels[Math.floor(Math.random() * buttonLabels.length)];
  gameState.modules.button.color = buttonColors[Math.floor(Math.random() * buttonColors.length)];
  
  document.getElementById('buttonLabel').textContent = gameState.modules.button.label;
  document.getElementById('mainButton').setAttribute('fill', getColorHex(gameState.modules.button.color));
  
  // === SYMBOL MODULE ===
  const allSymbols = ['★', '●', '◆', '✦', '▲', '■', '☀', '♠'];
  const selectedSymbols = allSymbols.sort(() => Math.random() - 0.5).slice(0, 4);
  const correctOrder = [...selectedSymbols].sort(); // Alphabetical order
  
  gameState.modules.symbol.symbols = selectedSymbols;
  gameState.modules.symbol.order = correctOrder;
  gameState.modules.symbol.pressed = [];
  
  // Update symbol display
  document.getElementById('symbol1').textContent = selectedSymbols[0];
  document.getElementById('symbol2').textContent = selectedSymbols[1];
  document.getElementById('symbol3').textContent = selectedSymbols[2];
  document.getElementById('symbol4').textContent = selectedSymbols[3];
  
  // === KEYPAD MODULE ===
  gameState.modules.keypad.code = Math.floor(1000 + Math.random() * 9000).toString();
  gameState.modules.keypad.entered = '';
  
  // Send ALL data to expert
  nm.sendData('gameInit', {
    code: gameState.modules.keypad.code,
    wireColors: shuffledColors,
    wireCount: numWires,
    buttonLabel: gameState.modules.button.label,
    buttonColor: gameState.modules.button.color,
    symbols: selectedSymbols,
    symbolOrder: correctOrder
  });
  
  console.log('=== GAME INITIALIZED ===');
  console.log('Wires:', shuffledColors, '-> Cut:', correctWire);
  console.log('Button:', gameState.modules.button.label, gameState.modules.button.color);
  console.log('Symbols:', selectedSymbols, '-> Order:', correctOrder);
  console.log('Code:', gameState.modules.keypad.code);
}

function updateWireDisplay(colors) {
  // Hide all wires first
  document.querySelectorAll('.wire').forEach(w => w.style.display = 'none');
  
  const wireElements = ['wire-red', 'wire-blue', 'wire-yellow'];
  const yPositions = [260, 300, 340];
  
  colors.forEach((color, index) => {
    if (index < 3) {
      const wireEl = document.getElementById(wireElements[index]);
      wireEl.style.display = 'block';
      wireEl.setAttribute('stroke', getColorHex(color));
      wireEl.setAttribute('data-color', color);
    } else if (index === 3) {
      // Add 4th wire if needed
      const wireModule = document.getElementById('wireModule');
      const existingFourth = document.getElementById('wire-fourth');
      if (!existingFourth) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('id', 'wire-fourth');
        line.setAttribute('x1', '120');
        line.setAttribute('y1', '360');
        line.setAttribute('x2', '360');
        line.setAttribute('y2', '360');
        line.setAttribute('stroke-width', '8');
        line.setAttribute('class', 'wire');
        wireModule.appendChild(line);
        
        const c1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c1.setAttribute('cx', '120');
        c1.setAttribute('cy', '360');
        c1.setAttribute('r', '6');
        c1.setAttribute('fill', '#666');
        wireModule.appendChild(c1);
        
        const c2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c2.setAttribute('cx', '360');
        c2.setAttribute('cy', '360');
        c2.setAttribute('r', '6');
        c2.setAttribute('fill', '#666');
        wireModule.appendChild(c2);
      }
      const fourthWire = document.getElementById('wire-fourth');
      fourthWire.style.display = 'block';
      fourthWire.setAttribute('stroke', getColorHex(color));
      fourthWire.setAttribute('data-color', color);
    }
  });
}

function getColorHex(colorName) {
  const colors = {
    'red': '#ff0000',
    'blue': '#0066ff',
    'yellow': '#ffff00',
    'green': '#00ff00',
    'white': '#ffffff'
  };
  return colors[colorName] || '#ffffff';
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
  const color = gameState.modules.button.color;
  
  let correct = false;
  
  // Complex button rules
  if (label === 'PRESS' && pressDuration < 500) {
    correct = true;
  } else if (label === 'HOLD' && pressDuration >= 3000) {
    correct = true;
  } else if (label === 'DETONATE' && color === 'red' && pressDuration < 500) {
    correct = true;
  } else if (label === 'ABORT' && pressDuration >= 2000 && pressDuration < 4000) {
    correct = true;
  }
  
  if (correct) {
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

function updateWireManual(wireColors, wireCount) {
  const wireTable = document.querySelector('.wire-table');
  const colorNames = {
    'red': 'RED', 'blue': 'BLUE', 'yellow': 'YELLOW',
    'green': 'GREEN', 'white': 'WHITE'
  };
  
  const positions = ['Top', 'Second', 'Third', 'Bottom'];
  let html = '<tr><th>Position</th><th>Color</th><th>Cut If...</th></tr>';
  
  wireColors.forEach((color, i) => {
    const pos = i < positions.length ? positions[i] : `Wire ${i+1}`;
    let rule = 'See rules below';
    
    if (color === 'red' && i === 0) rule = 'RED at top → CUT THIS';
    else if (color === 'blue' && i === 1) rule = 'BLUE in 2nd position → CUT THIS';
    else if (color === 'yellow' && i === wireColors.length - 1) rule = 'YELLOW at bottom → CUT THIS';
    
    html += `<tr>
      <td>${pos} wire</td>
      <td><span class="wire-color ${color}">${colorNames[color]}</span></td>
      <td>${rule}</td>
    </tr>`;
  });
  
  html += `<tr><td colspan="3"><strong>Rules:</strong><br/>
    1. If RED is at top → cut RED<br/>
    2. If BLUE is 2nd → cut BLUE<br/>
    3. If YELLOW is last → cut YELLOW<br/>
    4. If no RED → cut BLUE<br/>
    5. Otherwise → cut LAST wire</td></tr>`;
  
  wireTable.innerHTML = html;
}

function updateButtonManual(label, color) {
  const buttonTable = document.querySelector('.button-table');
  const colorNames = { 'red': 'RED', 'blue': 'BLUE', 'yellow': 'YELLOW', 'white': 'WHITE' };
  
  buttonTable.innerHTML = `
    <tr><th>Label</th><th>Color</th><th>Action</th></tr>
    <tr>
      <td><strong>${label}</strong></td>
      <td><span class="wire-color ${color}">${colorNames[color]}</span></td>
      <td>${getButtonAction(label, color)}</td>
    </tr>
  `;
}

function getButtonAction(label, color) {
  if (label === 'PRESS') return 'Click once, release immediately';
  if (label === 'HOLD') return 'Hold for 3+ seconds';
  if (label === 'DETONATE' && color === 'red') return 'Quick tap (< 0.5s)';
  if (label === 'DETONATE') return 'DO NOT PRESS - wrong color!';
  if (label === 'ABORT') return 'Hold for 2-4 seconds';
  return 'Check label and color';
}

function updateSymbolManual(symbols, correctOrder) {
  const symbolSection = document.querySelector('.symbol-order');
  let html = '<p><strong>Symbols shown on bomb:</strong> ' + symbols.join(' ') + '</p>';
  html += '<p><strong>Press them in this order:</strong></p>';
  
  correctOrder.forEach((sym, i) => {
    html += `<span class="symbol-item">${i+1}. ${sym}</span>`;
  });
  
  symbolSection.innerHTML = html;
}
