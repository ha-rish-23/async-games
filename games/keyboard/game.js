// The Broken Keyboard - Shared Typing Game
const nm = new window.NetworkManager();
const audio = new window.AudioManager();

const LEFT_KEYS = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'Z', 'X', 'C', 'V'];
const RIGHT_KEYS = ['Y', 'U', 'I', 'O', 'P', 'H', 'J', 'K', 'L', 'B', 'N', 'M'];

// Level 1: Single Words (Round 1-20)
const WORDS = [
  'CHEETAH', 'BUTTERFLY', 'ELEPHANT', 'GIRAFFE', 'PENGUIN', 'DOLPHIN', 'OCTOPUS', 'FLAMINGO',
  'HAMBURGER', 'SPAGHETTI', 'CHOCOLATE', 'STRAWBERRY', 'BLUEBERRY', 'PINEAPPLE', 'WATERMELON', 'AVOCADO',
  'MOUNTAIN', 'VOLCANO', 'RAINBOW', 'THUNDER', 'LIGHTNING', 'TORNADO', 'HURRICANE', 'BLIZZARD',
  'COMPUTER', 'KEYBOARD', 'MONITOR', 'INTERNET', 'SOFTWARE', 'DOWNLOAD', 'WEBSITE', 'DATABASE',
  'BASKETBALL', 'FOOTBALL', 'BASEBALL', 'SKATEBOARD', 'BICYCLE', 'SWIMMING', 'MARATHON', 'GYMNASTICS',
  'ADVENTURE', 'BEAUTIFUL', 'CELEBRATE', 'DANGEROUS', 'ECOSYSTEM', 'FANTASTIC', 'GENEROUS', 'HAPPINESS',
  'IMPORTANT', 'JOYFULLY', 'KNOWLEDGE', 'LAUGHTER', 'MAGNIFICENT', 'NEIGHBOR', 'ORGANIZE', 'PARADISE',
  'QUESTION', 'REMEMBER', 'SPARKLING', 'TREASURE', 'UMBRELLA', 'VACATION', 'WONDERFUL', 'YESTERDAY',
  'ABSOLUTE', 'BRILLIANT', 'CREATIVE', 'DELICIOUS', 'EXCELLENT', 'FABULOUS', 'GLORIOUS', 'HARMONY',
  'INCREDIBLE', 'JOYRIDE', 'KINDNESS', 'LEGENDARY', 'MARVELOUS', 'NIGHTFALL', 'OUTSTANDING', 'PEACEFUL', 'SUDHANDIRA', 'HARISH'
];

// Level 2: Short Phrases (Round 21-50)
const PHRASES = [
  'HAPPY BIRTHDAY', 'GOOD MORNING', 'SWEET DREAMS', 'BEST FRIENDS', 'BRIGHT FUTURE',
  'STAY POSITIVE', 'KEEP TRYING', 'WORK HARD', 'DREAM BIG', 'NEVER QUIT',
  'FOLLOW YOUR HEART', 'TRUST YOURSELF', 'BELIEVE IN MAGIC', 'CHASE YOUR DREAMS', 'LOVE YOURSELF',
  'TIME TO CELEBRATE', 'MAKING MEMORIES', 'LIVING THE DREAM', 'FEELING GRATEFUL', 'STAYING FOCUSED',
  'REACHING GOALS', 'BREAKING RECORDS', 'CREATING MAGIC', 'SPREADING JOY', 'BUILDING BRIDGES',
  'FINDING PEACE', 'ENJOYING LIFE', 'MAKING PROGRESS', 'STAYING STRONG', 'GROWING TOGETHER',
  'THE QUICK BROWN FOX', 'JUMPING OVER CLOUDS', 'DANCING IN THE RAIN', 'SINGING IN THE SHOWER', 'RUNNING WITH WOLVES',
  'WALKING ON SUNSHINE', 'FLYING THROUGH SPACE', 'SWIMMING WITH DOLPHINS', 'CLIMBING THE MOUNTAIN', 'EXPLORING THE WORLD'
];

// Level 3: Sentences (Round 51-100)
const SENTENCES = [
  'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG',
  'PRACTICE MAKES PERFECT WHEN YOU NEVER GIVE UP',
  'EVERY DAY IS A NEW OPPORTUNITY TO LEARN SOMETHING',
  'TEAMWORK MAKES THE DREAM WORK EVERY SINGLE TIME',
  'SUCCESS COMES TO THOSE WHO WORK HARD AND STAY FOCUSED',
  'LIFE IS WHAT HAPPENS WHEN YOU ARE MAKING OTHER PLANS',
  'THE BEST WAY TO PREDICT THE FUTURE IS TO CREATE IT',
  'HAPPINESS IS NOT SOMETHING READY MADE IT COMES FROM YOUR ACTIONS',
  'BELIEVE YOU CAN AND YOU ARE HALFWAY THERE TO SUCCESS',
  'THE ONLY WAY TO DO GREAT WORK IS TO LOVE WHAT YOU DO',
  'DO NOT WATCH THE CLOCK DO WHAT IT DOES KEEP GOING',
  'THE FUTURE BELONGS TO THOSE WHO BELIEVE IN THEIR DREAMS',
  'SUCCESS IS NOT FINAL FAILURE IS NOT FATAL COURAGE COUNTS',
  'YOUR TIME IS LIMITED DO NOT WASTE IT LIVING SOMEONE LIFE',
  'BE YOURSELF EVERYONE ELSE IS ALREADY TAKEN BY SOMEONE',
  'IN THE MIDDLE OF DIFFICULTY LIES OPPORTUNITY WAITING FOR YOU',
  'LIFE IS TEN PERCENT WHAT HAPPENS AND NINETY HOW YOU REACT',
  'THE JOURNEY OF A THOUSAND MILES BEGINS WITH ONE STEP',
  'STRIVE NOT TO BE A SUCCESS BUT TO BE OF VALUE',
  'YOU MISS ONE HUNDRED PERCENT OF THE SHOTS YOU DO NOT TAKE'
];

// Level 4: Paragraphs (Round 101+)
const PARAGRAPHS = [
  'COLLABORATION IS THE KEY TO SUCCESS IN ANY TEAM ENVIRONMENT WHERE PEOPLE WORK TOGETHER TOWARDS A COMMON GOAL AND SUPPORT EACH OTHER THROUGH CHALLENGES',
  'COMMUNICATION SKILLS ARE ESSENTIAL IN MODERN WORLD WHERE WE INTERACT WITH DIVERSE PEOPLE ACROSS DIFFERENT CULTURES AND BACKGROUNDS EVERY SINGLE DAY',
  'TECHNOLOGY HAS TRANSFORMED THE WAY WE LIVE WORK AND PLAY MAKING TASKS EASIER AND CONNECTING PEOPLE FROM ALL AROUND THE GLOBE IN REAL TIME',
  'EDUCATION IS THE FOUNDATION OF PERSONAL GROWTH AND DEVELOPMENT OPENING DOORS TO NEW OPPORTUNITIES AND HELPING PEOPLE ACHIEVE THEIR FULL POTENTIAL',
  'CREATIVITY AND INNOVATION DRIVE PROGRESS IN EVERY FIELD FROM ART AND MUSIC TO SCIENCE AND TECHNOLOGY PUSHING BOUNDARIES AND EXPLORING NEW FRONTIERS',
  'PERSEVERANCE IS THE QUALITY THAT SEPARATES THOSE WHO ACHIEVE THEIR DREAMS FROM THOSE WHO GIVE UP WHEN FACED WITH OBSTACLES AND SETBACKS ALONG THE WAY',
  'ENVIRONMENTAL CONSERVATION IS CRUCIAL FOR THE SURVIVAL OF OUR PLANET AND FUTURE GENERATIONS WHO WILL INHERIT THE WORLD WE LEAVE BEHIND FOR THEM',
  'FRIENDSHIP IS ONE OF THE MOST VALUABLE TREASURES IN LIFE PROVIDING SUPPORT LAUGHTER AND COMPANIONSHIP THROUGH BOTH GOOD TIMES AND DIFFICULT MOMENTS',
  'LEARNING NEW SKILLS KEEPS THE MIND SHARP AND OPENS UP ENDLESS POSSIBILITIES FOR PERSONAL AND PROFESSIONAL GROWTH THROUGHOUT YOUR ENTIRE LIFETIME',
  'HEALTHY HABITS SUCH AS REGULAR EXERCISE BALANCED NUTRITION AND ADEQUATE SLEEP CONTRIBUTE TO OVERALL WELLBEING AND QUALITY OF LIFE FOR EVERYONE'
];

const gameState = {
  currentWord: '',
  typedText: '',
  round: 1,
  score: 0,
  timeLeft: 30,
  timerInterval: null,
  correctWords: 0,
  gameActive: false,
  usedPrompts: new Set(),
  level: 1
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

// End Game button
document.getElementById('endGameBtn')?.addEventListener('click', () => {
  if (confirm('Are you sure you want to end the game?')) {
    endGame();
  }
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
  gameState.correctWords = 0;
  gameState.usedPrompts.clear();
  gameState.level = 1;
  
  nextRound();
}

function getPromptForRound() {
  let pool;
  let label;
  let timeLimit;
  
  if (gameState.round <= 20) {
    // Level 1: Words
    pool = WORDS;
    label = 'Level 1: Words';
    timeLimit = 30;
    gameState.level = 1;
  } else if (gameState.round <= 50) {
    // Level 2: Phrases
    pool = PHRASES;
    label = 'Level 2: Phrases';
    timeLimit = 45;
    gameState.level = 2;
  } else if (gameState.round <= 100) {
    // Level 3: Sentences
    pool = SENTENCES;
    label = 'Level 3: Sentences';
    timeLimit = 60;
    gameState.level = 3;
  } else {
    // Level 4: Paragraphs
    pool = PARAGRAPHS;
    label = 'Level 4: Paragraphs';
    timeLimit = 90;
    gameState.level = 4;
  }
  
  // Find unused prompt
  let prompt;
  let attempts = 0;
  do {
    prompt = pool[Math.floor(Math.random() * pool.length)];
    attempts++;
    // If all prompts used, clear the set
    if (attempts > pool.length * 2) {
      gameState.usedPrompts.clear();
    }
  } while (gameState.usedPrompts.has(prompt) && attempts < pool.length * 3);
  
  gameState.usedPrompts.add(prompt);
  
  return { prompt, label, timeLimit };
}

function nextRound() {
  // Only host generates the prompt
  if (isLeftHand) {
    const { prompt, label, timeLimit } = getPromptForRound();
    
    gameState.currentWord = prompt;
    gameState.typedText = '';
    gameState.timeLeft = timeLimit;
    
    // Send initial state to client immediately
    sendGameState();
  }
  
  // Update prompt label for both players
  if (gameState.currentWord) {
    document.getElementById('promptLabel').textContent = 
      gameState.level === 1 ? 'Type this word:' :
      gameState.level === 2 ? 'Type this phrase:' :
      gameState.level === 3 ? 'Type this sentence:' :
      'Type this paragraph:';
  }
  
  updateDisplay();
  
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  
  if (isLeftHand) {
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
  const levelText = 
    gameState.level === 1 ? 'Level 1: Words' :
    gameState.level === 2 ? 'Level 2: Phrases' :
    gameState.level === 3 ? 'Level 3: Sentences' :
    'Level 4: Paragraphs';
  
  document.getElementById('levelDisplay').textContent = levelText;
  document.getElementById('promptWord').textContent = gameState.currentWord;
  document.getElementById('typedText').textContent = gameState.typedText;
  document.getElementById('scoreDisplay').textContent = `Score: ${gameState.score}`;
  document.getElementById('roundDisplay').textContent = `Round: ${gameState.round}`;
  document.getElementById('timerDisplay').textContent = `Time: ${gameState.timeLeft}`;
}

function updateGameState(state) {
  gameState.currentWord = state.currentWord;
  gameState.typedText = state.typedText;
  gameState.round = state.round;
  gameState.score = state.score;
  gameState.timeLeft = state.timeLeft;
  gameState.correctWords = state.correctWords;
  gameState.level = state.level;
  gameState.gameActive = true;
  
  // Update prompt label when state is received
  document.getElementById('promptLabel').textContent = 
    gameState.level === 1 ? 'Type this word:' :
    gameState.level === 2 ? 'Type this phrase:' :
    gameState.level === 3 ? 'Type this sentence:' :
    'Type this paragraph:';
  
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
    correctWords: gameState.correctWords,
    level: gameState.level
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
  
  const accuracy = gameState.round > 0 ? Math.round((gameState.correctWords / gameState.round) * 100) : 0;
  
  const result = {
    score: gameState.score,
    accuracy,
    correctWords: gameState.correctWords,
    totalRounds: gameState.round,
    level: gameState.level
  };
  
  nm.sendData('gameEnd', result);
  showResult(result);
}

function showResult(result) {
  gameState.gameActive = false;
  document.getElementById('gameScreen').style.display = 'none';
  document.getElementById('resultScreen').style.display = 'flex';
  
  const levelText = 
    result.level === 1 ? 'Words' :
    result.level === 2 ? 'Phrases' :
    result.level === 3 ? 'Sentences' :
    'Paragraphs';
  
  const title = result.accuracy >= 70 ? '🎉 Great Job!' : result.accuracy >= 40 ? '👍 Not Bad!' : '😅 Better Luck Next Time!';
  
  document.getElementById('resultTitle').textContent = title;
  document.getElementById('resultMessage').textContent = 
    result.accuracy >= 70 ? 'You two make a great team!' :
    result.accuracy >= 40 ? 'Keep practicing together!' :
    'Communication is key!';
  
  document.getElementById('finalScore').textContent = `Final Score: ${result.score}`;
  document.getElementById('accuracy').textContent = `Accuracy: ${result.accuracy}%`;
  document.getElementById('wordsCompleted').textContent = `Completed: ${result.correctWords}/${result.totalRounds} (Reached Level ${result.level}: ${levelText})`;
}
