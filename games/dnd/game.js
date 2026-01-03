// D&D Night - Stranger Things Basement Campaign
const nm = new window.NetworkManager();
const audio = new window.AudioManager();

const QUICK_SCENARIOS = {
  demogorgon: {
    type: 'combat',
    description: 'A Demogorgon emerges from the shadows! Its flower-like head opens, revealing rows of teeth. Roll for initiative!',
    dc: 18
  },
  trap: {
    type: 'skill',
    description: 'You notice a pressure plate on the floor. Behind it, poison darts are embedded in the walls. Can you disarm it?',
    dc: 14
  },
  treasure: {
    type: 'puzzle',
    description: 'A locked chest sits before you. Strange symbols glow on its surface. Decipher the code to claim your reward!',
    dc: 12
  },
  npc: {
    type: 'social',
    description: 'A hooded figure approaches. They seem to know something about your quest. Can you gain their trust?',
    dc: 15
  }
};

const gameState = {
  isDM: false,
  isHost: false,
  players: [],
  currentScenario: null,
  playerHP: 20,
  maxHP: 20,
  characterName: '',
  lastRoll: null,
  modifier: 0
};

// Setup
document.getElementById('dmBtn').addEventListener('click', () => {
  document.querySelector('.role-select').style.display = 'none';
  document.getElementById('dmSetup').style.display = 'block';
  gameState.isDM = true;
  gameState.isHost = true;
});

document.getElementById('playerBtn').addEventListener('click', () => {
  document.querySelector('.role-select').style.display = 'none';
  document.getElementById('playerSetup').style.display = 'block';
});

// DM Setup
document.getElementById('createCampaignBtn').addEventListener('click', async () => {
  try {
    const roomCode = await nm.startHost();
    document.getElementById('roomCodeDisplay').textContent = roomCode;
    document.getElementById('dmRoomCode').textContent = 'CODE: ' + roomCode;
    document.getElementById('createCampaignBtn').style.display = 'none';
    document.getElementById('dmWaitingArea').style.display = 'block';
    
    nm.onData((data) => onDataReceived(data));
    
    const checkPlayers = setInterval(() => {
      if (gameState.players.length >= 1) {
        clearInterval(checkPlayers);
        document.getElementById('startAdventureBtn').style.display = 'block';
      }
    }, 500);
    
  } catch (err) {
    alert('Failed to create campaign: ' + err.message);
  }
});

document.getElementById('startAdventureBtn').addEventListener('click', () => {
  document.getElementById('setupScreen').classList.remove('active');
  document.getElementById('dmScreen').style.display = 'block';
  
  updatePartyMonitor();
  addLogEntry('Campaign started. The adventure begins!', 'dm');
  
  nm.sendData('campaignStarted', {});
});

// Player Setup
document.getElementById('joinCampaignBtn').addEventListener('click', async () => {
  const name = document.getElementById('playerNameInput').value.trim();
  const code = document.getElementById('campaignCodeInput').value.trim().toUpperCase();
  
  if (!name) {
    alert('Please enter your character name');
    return;
  }
  
  if (code.length !== 4) {
    alert('Please enter a 4-character campaign code');
    return;
  }
  
  gameState.characterName = name;
  
  try {
    nm.onData((data) => onDataReceived(data));
    await nm.joinRoom(roomCode);
    
    // Send player info after connection stabilizes
    setTimeout(() => {
      nm.sendData('playerJoined', { 
        name: name,
        hp: gameState.playerHP,
        maxHP: gameState.maxHP
      });
    }, 500);
    
  } catch (err) {
    alert('Failed to join campaign: ' + err.message);
  }
});

// Network
function onDataReceived(data) {
  if (data.type === 'playerJoined') {
    if (gameState.isDM) {
      const player = {
        id: nm.conn?.peer || 'player' + gameState.players.length,
        name: data.payload.name,
        hp: data.payload.hp,
        maxHP: data.payload.maxHP,
        status: 'Ready'
      };
      
      gameState.players.push(player);
      updatePlayersList();
      updatePartyMonitor();
      addLogEntry(`${player.name} joined the party!`, 'dm');
    }
  } else if (data.type === 'campaignStarted') {
    document.getElementById('setupScreen').classList.remove('active');
    document.getElementById('playerScreen').style.display = 'block';
    document.getElementById('playerCharName').textContent = gameState.characterName;
    document.getElementById('playerCampaignCode').textContent = 'CODE: ' + document.getElementById('campaignCodeInput').value;
    updatePlayerHP();
  } else if (data.type === 'newScenario') {
    if (!gameState.isDM) {
      displayScenario(data.payload);
    }
  } else if (data.type === 'revealOutcome') {
    if (!gameState.isDM) {
      showOutcome(data.payload);
    }
  } else if (data.type === 'playerRoll') {
    if (gameState.isDM) {
      const player = gameState.players.find(p => p.id === data.payload.playerId);
      const playerName = player ? player.name : 'Player';
      addLogEntry(`${playerName} rolled ${data.payload.dice}: ${data.payload.result} (${data.payload.total})`, 'roll');
    }
  } else if (data.type === 'playerAction') {
    if (gameState.isDM) {
      const player = gameState.players.find(p => p.id === data.payload.playerId);
      const playerName = player ? player.name : 'Player';
      addLogEntry(`${playerName} used ${data.payload.action}`, 'player');
    }
  }
}

function updatePlayersList() {
  const list = document.getElementById('playersList');
  list.innerHTML = '';
  
  gameState.players.forEach(player => {
    const div = document.createElement('div');
    div.className = 'player-item';
    div.textContent = `${player.name} (HP: ${player.hp}/${player.maxHP})`;
    list.appendChild(div);
  });
}

// DM Functions
document.getElementById('sendScenarioBtn').addEventListener('click', () => {
  const type = document.getElementById('scenarioType').value;
  const desc = document.getElementById('scenarioDesc').value.trim();
  const dc = parseInt(document.getElementById('scenarioDC').value);
  
  if (!desc) {
    alert('Please enter a scenario description');
    return;
  }
  
  const scenario = { type, description: desc, dc };
  gameState.currentScenario = scenario;
  
  nm.sendData('newScenario', scenario);
  addLogEntry(`DM created a ${type} challenge (DC ${dc})`, 'dm');
  audio.blip();
});

document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const scenarioKey = btn.dataset.scenario;
    const scenario = QUICK_SCENARIOS[scenarioKey];
    
    document.getElementById('scenarioType').value = scenario.type;
    document.getElementById('scenarioDesc').value = scenario.description;
    document.getElementById('scenarioDC').value = scenario.dc;
  });
});

document.getElementById('revealBtn').addEventListener('click', () => {
  if (!gameState.currentScenario) {
    alert('No active scenario');
    return;
  }
  
  const outcome = prompt('Enter the outcome:');
  if (outcome) {
    nm.sendData('revealOutcome', { text: outcome });
    addLogEntry(`Outcome revealed: ${outcome}`, 'dm');
  }
});

function updatePartyMonitor() {
  const monitor = document.getElementById('partyMonitor');
  monitor.innerHTML = '';
  
  gameState.players.forEach(player => {
    const card = document.createElement('div');
    card.className = 'party-card';
    card.innerHTML = `
      <div class="player-name">${player.name}</div>
      <div class="player-status">HP: ${player.hp}/${player.maxHP}</div>
    `;
    monitor.appendChild(card);
  });
}

function addLogEntry(text, type = '') {
  const log = document.getElementById('actionLog');
  const entry = document.createElement('div');
  entry.className = 'log-entry ' + type;
  entry.textContent = text;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

// Player Functions
function displayScenario(scenario) {
  gameState.currentScenario = scenario;
  
  const card = document.getElementById('currentScenario');
  card.querySelector('.scenario-type').textContent = scenario.type.toUpperCase();
  card.querySelector('.scenario-description').textContent = scenario.description;
  card.querySelector('.scenario-dc').textContent = `DC: ${scenario.dc}`;
  
  document.getElementById('outcomeDisplay').style.display = 'none';
  
  addPlayerLogEntry('New challenge: ' + scenario.type);
  audio.blip();
}

function showOutcome(data) {
  const display = document.getElementById('outcomeDisplay');
  document.getElementById('outcomeText').textContent = data.text;
  display.style.display = 'block';
  
  addPlayerLogEntry('Outcome: ' + data.text);
}

// Dice Rolling
document.querySelectorAll('.dice-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const sides = parseInt(btn.dataset.sides);
    rollDice(sides);
  });
});

function rollDice(sides) {
  const roll = Math.floor(Math.random() * sides) + 1;
  const modifier = parseInt(document.getElementById('modifierInput').value) || 0;
  const total = roll + modifier;
  
  gameState.lastRoll = { dice: `d${sides}`, result: roll, modifier, total };
  
  // Visual
  const resultDiv = document.getElementById('rollResult');
  const valueDiv = resultDiv.querySelector('.result-value');
  const labelDiv = resultDiv.querySelector('.result-label');
  
  valueDiv.textContent = total;
  labelDiv.textContent = `${roll} (d${sides}) ${modifier >= 0 ? '+' : ''}${modifier}`;
  
  // Critical effects
  if (sides === 20) {
    if (roll === 20) {
      valueDiv.style.color = 'var(--success)';
      labelDiv.textContent = 'CRITICAL SUCCESS!';
    } else if (roll === 1) {
      valueDiv.style.color = 'var(--fail)';
      labelDiv.textContent = 'CRITICAL FAILURE!';
    } else {
      valueDiv.style.color = 'var(--gold)';
    }
  }
  
  // Send to DM
  nm.sendData('playerRoll', {
    playerId: nm.peer.id,
    dice: `d${sides}`,
    result: roll,
    modifier,
    total
  });
  
  addPlayerLogEntry(`Rolled d${sides}: ${roll} (Total: ${total})`);
  audio.blip();
}

document.getElementById('resetModifierBtn').addEventListener('click', () => {
  document.getElementById('modifierInput').value = 0;
});

// Action Buttons
document.querySelectorAll('.action-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.textContent.trim();
    
    nm.sendData('playerAction', {
      playerId: nm.peer.id,
      action
    });
    
    addPlayerLogEntry(`You used: ${action}`);
    audio.blip();
  });
});

function updatePlayerHP() {
  document.getElementById('playerHP').textContent = `HP: ${gameState.playerHP}/${gameState.maxHP}`;
}

function addPlayerLogEntry(text) {
  const log = document.getElementById('playerLog');
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = text;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}
