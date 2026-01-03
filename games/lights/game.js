// Christmas Lights Cipher - Stranger Things Alphabet Wall
const nm = new window.NetworkManager();
const audio = new window.AudioManager();

const gameState = {
  message: '',
  isBlinking: false,
  gameActive: false
};

let isSender = false;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

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
  isSender = true;
  
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
  isSender = false;
  
  const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  
  if (roomCode.length !== 4) {
    alert('Please enter a 4-character room code');
    return;
  }
  
  try {
    nm.onData((data) => onDataReceived(data));
    await nm.joinRoom(roomCode);
    
    // Wait a moment for connection to stabilize
    setTimeout(() => {
      onPeerConnected();
    }, 500);
  } catch (err) {
    alert('Failed to join room: ' + err.message);
  }
});

// Network
function onPeerConnected() {
  document.getElementById('setupScreen').classList.remove('active');
  document.getElementById('gameScreen').style.display = 'block';
  
  // Update role indicator
  document.getElementById('roleIndicator').textContent = isSender ? 'SENDER' : 'RECEIVER';
  document.getElementById('roleIndicator').style.background = isSender ? '#ffeb3b' : '#e50914';
  document.getElementById('roleIndicator').style.color = isSender ? '#000' : '#fff';
  
  // Show appropriate controls
  if (isSender) {
    document.getElementById('senderControls').style.display = 'flex';
  } else {
    document.getElementById('receiverInfo').style.display = 'block';
  }
  
  createAlphabetWall();
  gameState.gameActive = true;
}

function onDataReceived(data) {
  if (data.type === 'lightBlink') {
    blinkLetter(data.payload.letter);
  } else if (data.type === 'messageUpdate') {
    gameState.message = data.payload.message;
    updateMessageDisplay();
  }
}

// Create Alphabet Wall
function createAlphabetWall() {
  const grid = document.getElementById('lightsGrid');
  grid.innerHTML = '';
  
  ALPHABET.forEach(letter => {
    const bulbDiv = document.createElement('div');
    bulbDiv.className = 'light-bulb';
    bulbDiv.dataset.letter = letter;
    
    bulbDiv.innerHTML = `
      <div class="wire"></div>
      <div class="letter">${letter}</div>
      <div class="bulb"></div>
    `;
    
    if (isSender) {
      bulbDiv.addEventListener('click', () => handleLetterClick(letter));
    }
    
    grid.appendChild(bulbDiv);
  });
}

// Handle Letter Click (Sender only)
function handleLetterClick(letter) {
  if (!gameState.gameActive || gameState.isBlinking) return;
  
  // Add to message
  gameState.message += letter;
  updateMessageDisplay();
  
  // Light up the bulb
  lightUpBulb(letter);
  
  // Send to receiver
  nm.sendData('lightBlink', { letter });
  nm.sendData('messageUpdate', { message: gameState.message });
  
  // Play sound
  audio.blip();
}

// Light Up Bulb
function lightUpBulb(letter) {
  const bulb = document.querySelector(`.light-bulb[data-letter="${letter}"]`);
  if (!bulb) return;
  
  bulb.classList.add('lit');
  
  setTimeout(() => {
    bulb.classList.remove('lit');
  }, 500);
}

// Blink Letter (Receiver)
function blinkLetter(letter) {
  if (!gameState.gameActive) return;
  
  gameState.isBlinking = true;
  
  const bulb = document.querySelector(`.light-bulb[data-letter="${letter}"]`);
  if (!bulb) {
    gameState.isBlinking = false;
    return;
  }
  
  // Update status
  document.getElementById('blinkStatus').textContent = `Blinking: ${letter}`;
  
  // Blink animation
  bulb.classList.add('blinking', 'lit');
  audio.blip();
  
  setTimeout(() => {
    bulb.classList.remove('blinking', 'lit');
    gameState.isBlinking = false;
    document.getElementById('blinkStatus').textContent = 'Waiting...';
  }, 600);
}

// Update Message Display
function updateMessageDisplay() {
  const display = document.getElementById('messageDisplay');
  display.textContent = gameState.message;
  
  // Typewriter effect on last character
  if (gameState.message.length > 0) {
    display.style.animation = 'none';
    setTimeout(() => {
      display.style.animation = 'typewriter 0.1s steps(1)';
    }, 10);
  }
}

// Control Buttons
document.getElementById('clearBtn')?.addEventListener('click', () => {
  gameState.message = '';
  updateMessageDisplay();
  nm.sendData('messageUpdate', { message: '' });
});

document.getElementById('deleteBtn')?.addEventListener('click', () => {
  if (gameState.message.length > 0) {
    gameState.message = gameState.message.slice(0, -1);
    updateMessageDisplay();
    nm.sendData('messageUpdate', { message: gameState.message });
  }
});

// Add typewriter animation
const style = document.createElement('style');
style.textContent = `
  @keyframes typewriter {
    from { opacity: 0.5; }
    to { opacity: 1; }
  }
`;
document.head.appendChild(style);
