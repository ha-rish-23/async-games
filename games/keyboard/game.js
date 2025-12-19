// The Broken Keyboard - Shared Typing Game
const nm = new window.NetworkManager();
const audio = new window.AudioManager();

const LEFT_KEYS = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'Z', 'X', 'C', 'V'];
const RIGHT_KEYS = ['Y', 'U', 'I', 'O', 'P', 'H', 'J', 'K', 'L', 'B', 'N', 'M'];

const WORD_PROMPTS = [
  'CHEETAH', 'BUTTERFLY', 'ELEPHANT', 'GIRAFFE', 'PENGUIN',
  'HAMBURGER', 'SPAGHETTI', 'CHOCOLATE', 'STRAWBERRY', 'BLUEBERRY',
  'MOUNTAIN', 'VOLCANO', 'RAINBOW', 'THUNDER', 'LIGHTNING',
  'COMPUTER', 'KEYBOARD', 'MONITOR', 'INTERNET', 'SOFTWARE',
  'BASKETBALL', 'FOOTBALL', 'BASEBALL', 'SKATEBOARD', 'BICYCLE'
];

const gameState = {
  currentWord: '',
  typedText: '',
  round: 1,
  maxRounds: 10,
  score: 0,
  timeLeft: 30,
  timerInterval: null,
  totalAttempts: 0,
  correctWords: 0,
  gameActive: false
};

let isLeftHand = false; // true = left hand, false = right hand
let myKeys = [];
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

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
  isLeftHand = true;
  myKeys = LEFT_KEYS;
  
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
  isLeftHand = false;
  myKeys = RIGHT_KEYS;
  
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
  document.getElementById('setupScreen').classList.remove('active');
  document.getElementById('gameScreen').style.display = 'block';
  
  // Show correct keyboard display
  if (isLeftHand) {
    document.getElementById('leftKeys').style.display = 'block';
    document.getElementById('rightKeys').style.display = 'none';
  } else {
    document.getElementById('leftKeys').style.display = 'none';
    document.getElementById('rightKeys').style.display = 'block';
  }
  
  // Setup mobile keyboard if needed
  if (isMobile) {
    setupMobileKeyboard();
  }
  
  if (isLeftHand) {
    startGame();
  }
}

function onDataReceived(data) {
  if (data.type === 'gameState') {
    updateGameState(data.payload);
  } else if (data.type === 'keyPress') {
    handleRemoteKey(data.payload.key);
  } else if (data.type === 'gameEnd') {
    showResult(data.payload);
  }
}

// Mobile Keyboard Setup
function setupMobileKeyboard() {
  const container = document.getElementById('mobileKeysContainer');
  container.innerHTML = '';
  
  myKeys.forEach(key => {
    const btn = document.createElement('button');
    btn.className = `mobile-key ${isLeftHand ? 'left' : 'right'}`;
    btn.textContent = key;
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleKeyPress(key);
    });
    container.appendChild(btn);
  });
  
  // Backspace button
  document.getElementById('backspaceBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleBackspace();
  });
}

// Game Logic
function startGame() {
  gameState.gameActive = true;
  gameState.round = 1;
  gameState.score = 0;
  gameState.totalAttempts = 0;
  gameState.correctWords = 0;
  
  nextRound();
}

function nextRound() {
  if (gameState.round > gameState.maxRounds) {
    endGame();
    return;
  }
  
  gameState.currentWord = WORD_PROMPTS[Math.floor(Math.random() * WORD_PROMPTS.length)];
  gameState.typedText = '';
  gameState.timeLeft = 30;
  
  updateDisplay();
  sendGameState();
  
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  gameState.timerInterval = setInterval(() => {
    gameState.timeLeft--;
    updateDisplay();
    sendGameState();
    
    if (gameState.timeLeft <= 0) {
      clearInterval(gameState.timerInterval);
      showFeedback('Time\'s up!', 'error');
      setTimeout(() => {
        gameState.round++;
        nextRound();
      }, 2000);
    }
  }, 1000);
}

function handleKeyPress(key) {
  if (!gameState.gameActive) return;
  
  key = key.toUpperCase();
  
  // Check if this key belongs to the current player
  if (!myKeys.includes(key)) {
    showFeedback('Not your key!', 'error');
    audio.explosion();
    return;
  }
  
  // Check if it's the correct next letter
  const nextLetter = gameState.currentWord[gameState.typedText.length];
  
  if (key === nextLetter) {
    gameState.typedText += key;
    audio.blip();
    
    if (isLeftHand) {
      updateDisplay();
      sendGameState();
    } else {
      nm.sendData('keyPress', { key });
    }
    
    // Check if word is complete
    if (gameState.typedText === gameState.currentWord) {
      clearInterval(gameState.timerInterval);
      const bonus = Math.floor(gameState.timeLeft * 10);
      gameState.score += 100 + bonus;
      gameState.correctWords++;
      showFeedback(`Perfect! +${100 + bonus} points!`, 'success');
      audio.win();
      
      setTimeout(() => {
        gameState.round++;
        nextRound();
      }, 2000);
    }
  } else {
    showFeedback('Wrong letter!', 'error');
    audio.explosion();
    gameState.score = Math.max(0, gameState.score - 10);
    
    if (isLeftHand) {
      updateDisplay();
      sendGameState();
    }
  }
}

function handleBackspace() {
  if (!gameState.gameActive || gameState.typedText.length === 0) return;
  
  gameState.typedText = gameState.typedText.slice(0, -1);
  
  if (isLeftHand) {
    updateDisplay();
    sendGameState();
  } else {
    nm.sendData('keyPress', { key: 'BACKSPACE' });
  }
}

function handleRemoteKey(key) {
  if (key === 'BACKSPACE') {
    gameState.typedText = gameState.typedText.slice(0, -1);
    updateDisplay();
    return;
  }
  
  const nextLetter = gameState.currentWord[gameState.typedText.length];
  
  if (key === nextLetter) {
    gameState.typedText += key;
    audio.blip();
    updateDisplay();
    sendGameState();
    
    // Check if word is complete
    if (gameState.typedText === gameState.currentWord) {
      clearInterval(gameState.timerInterval);
      const bonus = Math.floor(gameState.timeLeft * 10);
      gameState.score += 100 + bonus;
      gameState.correctWords++;
      showFeedback(`Perfect! +${100 + bonus} points!`, 'success');
      audio.win();
      
      setTimeout(() => {
        gameState.round++;
        nextRound();
      }, 2000);
    }
  }
}

// Keyboard input (for desktop)
document.addEventListener('keydown', (e) => {
  if (!gameState.gameActive || isMobile) return;
  
  const key = e.key.toUpperCase();
  
  if (key === 'BACKSPACE') {
    e.preventDefault();
    handleBackspace();
    return;
  }
  
  if (myKeys.includes(key)) {
    e.preventDefault();
    handleKeyPress(key);
  }
});

// Update Display
function updateDisplay() {
  document.getElementById('promptWord').textContent = gameState.currentWord;
  document.getElementById('typedText').textContent = gameState.typedText;
  document.getElementById('scoreDisplay').textContent = `Score: ${gameState.score}`;
  document.getElementById('roundDisplay').textContent = `Round: ${gameState.round}/${gameState.maxRounds}`;
  document.getElementById('timerDisplay').textContent = `Time: ${gameState.timeLeft}`;
}

function updateGameState(state) {
  gameState.currentWord = state.currentWord;
  gameState.typedText = state.typedText;
  gameState.round = state.round;
  gameState.score = state.score;
  gameState.timeLeft = state.timeLeft;
  gameState.correctWords = state.correctWords;
  gameState.gameActive = true;
  
  updateDisplay();
}

function sendGameState() {
  if (!isLeftHand) return;
  
  nm.sendData('gameState', {
    currentWord: gameState.currentWord,
    typedText: gameState.typedText,
    round: gameState.round,
    score: gameState.score,
    timeLeft: gameState.timeLeft,
    correctWords: gameState.correctWords
  });
}

function showFeedback(message, type) {
  const feedbackEl = document.getElementById('feedbackMsg');
  feedbackEl.textContent = message;
  feedbackEl.className = `feedback-msg ${type}`;
  
  setTimeout(() => {
    feedbackEl.textContent = '';
    feedbackEl.className = 'feedback-msg';
  }, 1500);
}

// End Game
function endGame() {
  gameState.gameActive = false;
  clearInterval(gameState.timerInterval);
  
  const accuracy = Math.round((gameState.correctWords / gameState.maxRounds) * 100);
  
  const result = {
    score: gameState.score,
    accuracy,
    correctWords: gameState.correctWords,
    totalRounds: gameState.maxRounds
  };
  
  nm.sendData('gameEnd', result);
  showResult(result);
}

function showResult(result) {
  gameState.gameActive = false;
  document.getElementById('gameScreen').style.display = 'none';
  document.getElementById('resultScreen').style.display = 'flex';
  
  const title = result.accuracy >= 70 ? '🎉 Great Job!' : result.accuracy >= 40 ? '👍 Not Bad!' : '😅 Better Luck Next Time!';
  
  document.getElementById('resultTitle').textContent = title;
  document.getElementById('resultMessage').textContent = result.accuracy >= 70 
    ? 'You two make a great team!'
    : result.accuracy >= 40
    ? 'Keep practicing together!'
    : 'Communication is key!';
  
  document.getElementById('finalScore').textContent = `Final Score: ${result.score}`;
  document.getElementById('accuracy').textContent = `Accuracy: ${result.accuracy}%`;
  document.getElementById('wordsCompleted').textContent = `Words Completed: ${result.correctWords}/${result.totalRounds}`;
}
