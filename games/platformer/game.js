/* Basic Invisible Platformer: Host-authoritative physics + Client blind view */
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
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  let role = null;
  let animationId = null;
  let physicsTimer = null;
  let currentLevel = 0;
  let totalLevels = 20;

  // All 20 levels with progressive difficulty
  const levels = [
    // Level 1 - Tutorial (Easy intro)
    {
      platforms: [{x:0,y:390,w:900,h:30},{x:200,y:300,w:150,h:16},{x:400,y:240,w:150,h:16},{x:600,y:190,w:150,h:16}],
      spikes: [],
      movingObstacles: [],
      goal: {x:700,y:140,w:40,h:40}
    },
    // Level 2 - First spikes
    {
      platforms: [{x:0,y:390,w:900,h:30},{x:180,y:300,w:120,h:16},{x:360,y:230,w:120,h:16},{x:580,y:170,w:160,h:16}],
      spikes: [{x:400,y:390},{x:440,y:390},{x:480,y:390}],
      movingObstacles: [],
      goal: {x:820,y:120,w:40,h:40}
    },
    // Level 3 - More gaps
    {
      platforms: [{x:0,y:390,w:150,h:30},{x:250,y:350,w:100,h:16},{x:450,y:290,w:100,h:16},{x:650,y:230,w:100,h:16},{x:800,y:170,w:100,h:16}],
      spikes: [{x:500,y:390},{x:540,y:390}],
      movingObstacles: [],
      goal: {x:850,y:120,w:40,h:40}
    },
    // Level 4 - First moving obstacle
    {
      platforms: [{x:0,y:390,w:900,h:30},{x:200,y:300,w:140,h:16},{x:400,y:240,w:140,h:16},{x:600,y:180,w:140,h:16}],
      spikes: [{x:350,y:390},{x:390,y:390},{x:430,y:390}],
      movingObstacles: [{x:350,y:350,w:20,h:20,vx:2,range:150,startX:350}],
      goal: {x:700,y:130,w:40,h:40}
    },
    // Level 5 - Vertical moving obstacle
    {
      platforms: [{x:0,y:390,w:200,h:30},{x:300,y:280,w:100,h:16},{x:500,y:280,w:100,h:16},{x:700,y:200,w:200,h:16}],
      spikes: [{x:250,y:390},{x:290,y:390}],
      movingObstacles: [{x:400,y:100,w:20,h:20,vy:3,range:180,startY:100}],
      goal: {x:850,y:150,w:40,h:40}
    },
    // Level 6 - Multiple horizontal movers
    {
      platforms: [{x:0,y:390,w:150,h:30},{x:250,y:320,w:100,h:16},{x:450,y:250,w:100,h:16},{x:650,y:180,w:100,h:16},{x:800,y:150,w:100,h:16}],
      spikes: [{x:300,y:390},{x:340,y:390},{x:600,y:390},{x:640,y:390}],
      movingObstacles: [{x:200,y:360,w:20,h:20,vx:2.5,range:100,startX:200},{x:600,y:280,w:20,h:20,vx:-2.5,range:120,startX:600}],
      goal: {x:850,y:100,w:40,h:40}
    },
    // Level 7 - Narrow platforms
    {
      platforms: [{x:0,y:390,w:100,h:30},{x:180,y:330,w:80,h:16},{x:340,y:270,w:80,h:16},{x:500,y:210,w:80,h:16},{x:660,y:150,w:80,h:16},{x:820,y:120,w:80,h:16}],
      spikes: [{x:450,y:390},{x:490,y:390},{x:530,y:390},{x:570,y:390}],
      movingObstacles: [{x:250,y:300,w:20,h:20,vx:2,range:80,startX:250}],
      goal: {x:850,y:70,w:40,h:40}
    },
    // Level 8 - Vertical gauntlet
    {
      platforms: [{x:0,y:390,w:150,h:30},{x:250,y:310,w:120,h:16},{x:450,y:230,w:120,h:16},{x:650,y:150,w:120,h:16}],
      spikes: [{x:300,y:390},{x:340,y:390},{x:380,y:390},{x:500,y:390},{x:540,y:390}],
      movingObstacles: [{x:370,y:250,w:20,h:20,vy:2.5,range:120,startY:250},{x:570,y:180,w:20,h:20,vy:-2.5,range:100,startY:180}],
      goal: {x:820,y:100,w:40,h:40}
    },
    // Level 9 - Fast movers
    {
      platforms: [{x:0,y:390,w:200,h:30},{x:300,y:300,w:150,h:16},{x:550,y:200,w:150,h:16},{x:750,y:140,w:150,h:16}],
      spikes: [{x:250,y:390},{x:290,y:390},{x:600,y:390},{x:640,y:390}],
      movingObstacles: [{x:300,y:340,w:20,h:20,vx:3.5,range:200,startX:300},{x:750,y:180,w:20,h:20,vx:-3,range:150,startX:750}],
      goal: {x:850,y:90,w:40,h:40}
    },
    // Level 10 - Crossing paths
    {
      platforms: [{x:0,y:390,w:150,h:30},{x:220,y:320,w:100,h:16},{x:400,y:240,w:100,h:16},{x:580,y:320,w:100,h:16},{x:750,y:240,w:150,h:16}],
      spikes: [{x:350,y:390},{x:390,y:390},{x:430,y:390},{x:470,y:390}],
      movingObstacles: [{x:220,y:280,w:20,h:20,vx:2,range:180,startX:220},{x:580,y:100,w:20,h:20,vy:3,range:200,startY:100}],
      goal: {x:850,y:190,w:40,h:40}
    },
    // Level 11 - Spike city
    {
      platforms: [{x:0,y:390,w:120,h:30},{x:200,y:310,w:100,h:16},{x:380,y:230,w:100,h:16},{x:560,y:150,w:100,h:16},{x:740,y:100,w:160,h:16}],
      spikes: [{x:150,y:390},{x:190,y:390},{x:300,y:390},{x:340,y:390},{x:480,y:390},{x:520,y:390},{x:660,y:390},{x:700,y:390}],
      movingObstacles: [{x:300,y:350,w:20,h:20,vx:2.5,range:120,startX:300}],
      goal: {x:850,y:50,w:40,h:40}
    },
    // Level 12 - Diagonal traverse
    {
      platforms: [{x:0,y:390,w:100,h:30},{x:150,y:330,w:90,h:16},{x:290,y:270,w:90,h:16},{x:430,y:210,w:90,h:16},{x:570,y:150,w:90,h:16},{x:710,y:90,w:190,h:16}],
      spikes: [{x:400,y:390},{x:440,y:390},{x:480,y:390},{x:520,y:390},{x:560,y:390}],
      movingObstacles: [{x:200,y:300,w:20,h:20,vx:2,range:100,startX:200},{x:480,y:180,w:20,h:20,vx:-2,range:100,startX:480}],
      goal: {x:850,y:40,w:40,h:40}
    },
    // Level 13 - Three movers
    {
      platforms: [{x:0,y:390,w:180,h:30},{x:280,y:300,w:120,h:16},{x:500,y:220,w:120,h:16},{x:720,y:140,w:180,h:16}],
      spikes: [{x:230,y:390},{x:270,y:390},{x:450,y:390},{x:490,y:390},{x:670,y:390}],
      movingObstacles: [{x:280,y:260,w:20,h:20,vx:2.5,range:120,startX:280},{x:500,y:100,w:20,h:20,vy:2.5,range:100,startY:100},{x:720,y:180,w:20,h:20,vx:-3,range:150,startX:720}],
      goal: {x:850,y:90,w:40,h:40}
    },
    // Level 14 - Precision jumps
    {
      platforms: [{x:0,y:390,w:100,h:30},{x:160,y:340,w:70,h:16},{x:290,y:290,w:70,h:16},{x:420,y:240,w:70,h:16},{x:550,y:190,w:70,h:16},{x:680,y:140,w:70,h:16},{x:810,y:100,w:90,h:16}],
      spikes: [{x:350,y:390},{x:390,y:390},{x:430,y:390},{x:470,y:390},{x:510,y:390},{x:550,y:390}],
      movingObstacles: [{x:230,y:320,w:20,h:20,vx:2,range:70,startX:230},{x:620,y:170,w:20,h:20,vx:-2,range:70,startX:620}],
      goal: {x:850,y:50,w:40,h:40}
    },
    // Level 15 - Vertical challenge
    {
      platforms: [{x:0,y:390,w:150,h:30},{x:250,y:310,w:120,h:16},{x:250,y:210,w:120,h:16},{x:450,y:210,w:120,h:16},{x:650,y:130,w:250,h:16}],
      spikes: [{x:200,y:390},{x:240,y:390},{x:280,y:390},{x:400,y:390},{x:440,y:390},{x:480,y:390}],
      movingObstacles: [{x:250,y:250,w:20,h:20,vy:3,range:80,startY:250},{x:450,y:100,w:20,h:20,vy:2.5,range:90,startY:100},{x:650,y:170,w:20,h:20,vx:3,range:200,startX:650}],
      goal: {x:850,y:80,w:40,h:40}
    },
    // Level 16 - Speed run
    {
      platforms: [{x:0,y:390,w:140,h:30},{x:220,y:320,w:100,h:16},{x:400,y:260,w:100,h:16},{x:580,y:200,w:100,h:16},{x:760,y:140,w:140,h:16}],
      spikes: [{x:300,y:390},{x:340,y:390},{x:500,y:390},{x:540,y:390},{x:700,y:390},{x:740,y:390}],
      movingObstacles: [{x:220,y:280,w:20,h:20,vx:3.5,range:100,startX:220},{x:400,y:220,w:20,h:20,vx:-3.5,range:100,startX:400},{x:580,y:160,w:20,h:20,vx:3.5,range:100,startX:580}],
      goal: {x:850,y:90,w:40,h:40}
    },
    // Level 17 - Maze start
    {
      platforms: [{x:0,y:390,w:120,h:30},{x:180,y:330,w:100,h:16},{x:180,y:230,w:100,h:16},{x:350,y:280,w:100,h:16},{x:520,y:200,w:100,h:16},{x:690,y:140,w:100,h:16},{x:800,y:100,w:100,h:16}],
      spikes: [{x:300,y:390},{x:340,y:390},{x:450,y:390},{x:490,y:390},{x:620,y:390},{x:660,y:390}],
      movingObstacles: [{x:280,y:310,w:20,h:20,vy:2.5,range:100,startY:310},{x:450,y:240,w:20,h:20,vx:2.5,range:80,startX:450},{x:620,y:180,w:20,h:20,vy:-2.5,range:80,startY:180}],
      goal: {x:850,y:50,w:40,h:40}
    },
    // Level 18 - Four movers
    {
      platforms: [{x:0,y:390,w:150,h:30},{x:230,y:310,w:110,h:16},{x:420,y:240,w:110,h:16},{x:610,y:170,w:110,h:16},{x:780,y:120,w:120,h:16}],
      spikes: [{x:200,y:390},{x:240,y:390},{x:280,y:390},{x:370,y:390},{x:410,y:390},{x:560,y:390},{x:600,y:390},{x:730,y:390}],
      movingObstacles: [{x:230,y:270,w:20,h:20,vx:2.5,range:110,startX:230},{x:340,y:350,w:20,h:20,vx:-3,range:120,startX:340},{x:530,y:210,w:20,h:20,vy:2.5,range:60,startY:210},{x:720,y:160,w:20,h:20,vx:3,range:80,startX:720}],
      goal: {x:850,y:70,w:40,h:40}
    },
    // Level 19 - Ultimate test
    {
      platforms: [{x:0,y:390,w:110,h:30},{x:170,y:330,w:80,h:16},{x:310,y:270,w:80,h:16},{x:450,y:210,w:80,h:16},{x:590,y:150,w:80,h:16},{x:730,y:90,w:80,h:16},{x:830,y:60,w:70,h:16}],
      spikes: [{x:250,y:390},{x:290,y:390},{x:330,y:390},{x:390,y:390},{x:430,y:390},{x:530,y:390},{x:570,y:390},{x:670,y:390},{x:710,y:390}],
      movingObstacles: [{x:170,y:290,w:20,h:20,vx:2,range:80,startX:170},{x:310,y:230,w:20,h:20,vx:-2,range:80,startX:310},{x:450,y:100,w:20,h:20,vy:2.5,range:90,startY:100},{x:590,y:110,w:20,h:20,vx:2.5,range:80,startX:590},{x:730,y:130,w:20,h:20,vy:-3,range:70,startY:130}],
      goal: {x:850,y:10,w:40,h:40}
    },
    // Level 20 - Final boss
    {
      platforms: [{x:0,y:390,w:100,h:30},{x:150,y:340,w:70,h:16},{x:270,y:290,w:70,h:16},{x:390,y:240,w:70,h:16},{x:510,y:190,w:70,h:16},{x:630,y:140,w:70,h:16},{x:750,y:90,w:70,h:16},{x:840,y:50,w:60,h:16}],
      spikes: [{x:240,y:390},{x:280,y:390},{x:320,y:390},{x:360,y:390},{x:440,y:390},{x:480,y:390},{x:560,y:390},{x:600,y:390},{x:680,y:390},{x:720,y:390}],
      movingObstacles: [{x:150,y:300,w:20,h:20,vx:3,range:70,startX:150},{x:270,y:250,w:20,h:20,vx:-3,range:70,startX:270},{x:390,y:80,w:20,h:20,vy:3.5,range:140,startY:80},{x:510,y:150,w:20,h:20,vx:3,range:70,startX:510},{x:630,y:100,w:20,h:20,vx:-3,range:70,startX:630},{x:750,y:130,w:20,h:20,vy:-3,range:80,startY:130}],
      goal: {x:860,y:5,w:35,h:35}
    }
  ];

  const level = levels[currentLevel];

  // Host player state (authoritative)
  let player = {x:80,y:340,w:18,h:28,vx:0,vy:0,onGround:false,dead:false,win:false,facing:1};
  let clientInput = {left:false,right:false,jump:false};
  let clientRenderPos = {...player};
  let particles = [];
  let jumpParticles = [];
  let explosionParticles = [];
  let movingObstacles = [];

  function loadLevel(levelIndex){
    if(levelIndex >= levels.length){
      // All levels complete!
      return false;
    }
    currentLevel = levelIndex;
    const lvl = levels[currentLevel];
    // Deep copy moving obstacles with their runtime state
    movingObstacles = lvl.movingObstacles.map(obs => ({
      ...obs,
      x: obs.x,
      y: obs.y,
      startX: obs.startX !== undefined ? obs.startX : obs.x,
      startY: obs.startY !== undefined ? obs.startY : obs.y
    }));
    // Reset player
    player = {x:80,y:340,w:18,h:28,vx:0,vy:0,onGround:false,dead:false,win:false,facing:1};
    particles = [];
    jumpParticles = [];
    explosionParticles = [];
    return true;
  }

  function resetCurrentLevel(){
    loadLevel(currentLevel);
    if(role === 'host'){
      nm.sendData('game',{type:'levelReset', level:currentLevel});
      gameStatus.textContent = `Level ${currentLevel+1}/${totalLevels} - Try again!`;
      audio.blip();
    }
  }

  function createExplosion(x, y){
    // Create explosion particles
    for(let i=0; i<20; i++){
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 3 + Math.random() * 4;
      explosionParticles.push({
        x: x + player.w/2,
        y: y + player.h/2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        alpha: 1,
        color: Math.random() > 0.5 ? '#ff4d4d' : '#ffaa00'
      });
    }
    audio.explosion();
  }

  function redrawHost(){
    const lvl = levels[currentLevel];
    // full map view
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // background gradient
    const bgGrad = ctx.createLinearGradient(0,0,0,canvas.height);
    bgGrad.addColorStop(0,'#0a0f1e'); bgGrad.addColorStop(1,'#1a1535');
    ctx.fillStyle=bgGrad; ctx.fillRect(0,0,canvas.width,canvas.height);
    
    // stars
    ctx.fillStyle='rgba(255,255,255,0.6)';
    for(let i=0;i<40;i++){ const x=(i*37)%canvas.width; const y=(i*53)%300; ctx.fillRect(x,y,2,2); }
    
    // Level indicator
    ctx.fillStyle='rgba(0,255,153,0.6)'; ctx.font='12px "Press Start 2P"';
    ctx.fillText(`LVL ${currentLevel+1}/${totalLevels}`, 10, 20);
    
    // platforms with gradient
    lvl.platforms.forEach(p=>{
      const grad = ctx.createLinearGradient(p.x,p.y,p.x,p.y+p.h);
      grad.addColorStop(0,'#0fffa0'); grad.addColorStop(1,'#06cc7a');
      ctx.fillStyle=grad; ctx.fillRect(p.x,p.y,p.w,p.h);
      ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.fillRect(p.x,p.y+p.h-4,p.w,4);
    });
    
    // spikes
    ctx.fillStyle='#ff4d4d';
    lvl.spikes.forEach(s=>{
      ctx.beginPath(); ctx.moveTo(s.x,390); ctx.lineTo(s.x+20,390); ctx.lineTo(s.x+10,370); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='#aa0000'; ctx.lineWidth=2; ctx.stroke();
    });
    
    // moving obstacles
    ctx.fillStyle='#ff6b35';
    movingObstacles.forEach(obs=>{
      ctx.save();
      ctx.shadowColor='#ff6b35'; ctx.shadowBlur=10;
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      ctx.fillStyle='#ffaa00';
      ctx.fillRect(obs.x+4, obs.y+4, obs.w-8, obs.h-8);
      ctx.restore();
    });
    
    // goal (animated pulsing)
    const pulse = Math.sin(Date.now()/200)*0.15+0.85;
    ctx.save(); ctx.globalAlpha=pulse;
    const goalGrad = ctx.createRadialGradient(lvl.goal.x+lvl.goal.w/2,lvl.goal.y+lvl.goal.h/2,5,lvl.goal.x+lvl.goal.w/2,lvl.goal.y+lvl.goal.h/2,25);
    goalGrad.addColorStop(0,'#ffe066'); goalGrad.addColorStop(1,'#ffa500');
    ctx.fillStyle=goalGrad; ctx.fillRect(lvl.goal.x, lvl.goal.y, lvl.goal.w, lvl.goal.h);
    ctx.restore();
    
    // particles
    particles.forEach(pt=>{
      ctx.fillStyle=`rgba(255,255,255,${pt.alpha})`; ctx.fillRect(pt.x,pt.y,pt.s,pt.s);
    });
    
    // explosion particles
    explosionParticles.forEach(ep=>{
      ctx.fillStyle = ep.color.replace(')', `,${ep.alpha})`).replace('rgb', 'rgba');
      if(!ep.color.includes('#')){
        ctx.fillStyle = `rgba(255,77,77,${ep.alpha})`;
      } else {
        const hex = ep.color;
        const r = parseInt(hex.slice(1,3), 16);
        const g = parseInt(hex.slice(3,5), 16);
        const b = parseInt(hex.slice(5,7), 16);
        ctx.fillStyle = `rgba(${r},${g},${b},${ep.alpha})`;
      }
      ctx.fillRect(ep.x, ep.y, ep.size, ep.size);
    });
    
    // player sprite (pixel art)
    if(!player.dead) drawPlayerSprite(player.x,player.y,player.facing);
  }
  
  function drawPlayerSprite(x,y,dir){
    ctx.fillStyle='#ffffff';
    // head
    ctx.fillRect(x+6,y+2,6,6);
    // body
    ctx.fillRect(x+5,y+8,8,12);
    // legs
    ctx.fillRect(x+5,y+20,3,8); ctx.fillRect(x+10,y+20,3,8);
    // arms
    if(dir>0){ ctx.fillRect(x+13,y+10,3,6); ctx.fillRect(x+2,y+10,3,6); }
    else{ ctx.fillRect(x+2,y+10,3,6); ctx.fillRect(x+13,y+10,3,6); }
    // eyes
    ctx.fillStyle='#00ff99'; ctx.fillRect(x+7,y+4,2,2); ctx.fillRect(x+10,y+4,2,2);
  }

  function redrawClient(){
    // pitch black background
    ctx.fillStyle='#000'; ctx.fillRect(0,0,canvas.width,canvas.height);
    
    // spotlight vignette around player
    const grad = ctx.createRadialGradient(clientRenderPos.x+clientRenderPos.w/2, clientRenderPos.y+clientRenderPos.h/2,20, clientRenderPos.x+clientRenderPos.w/2, clientRenderPos.y+clientRenderPos.h/2,180);
    grad.addColorStop(0,'rgba(0,255,153,0.18)');
    grad.addColorStop(0.25,'rgba(0,255,153,0.08)');
    grad.addColorStop(0.5,'rgba(0,120,80,0.02)');
    grad.addColorStop(1,'rgba(0,0,0,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    
    // jump particles trail
    jumpParticles.forEach(jp=>{
      ctx.fillStyle=`rgba(0,255,153,${jp.alpha})`; ctx.fillRect(jp.x,jp.y,3,3);
    });
    
    // explosion particles (client side)
    explosionParticles.forEach(ep=>{
      const hex = ep.color;
      const r = parseInt(hex.slice(1,3), 16);
      const g = parseInt(hex.slice(3,5), 16);
      const b = parseInt(hex.slice(5,7), 16);
      ctx.fillStyle = `rgba(${r},${g},${b},${ep.alpha})`;
      ctx.save();
      ctx.shadowColor = ep.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(ep.x, ep.y, ep.size, ep.size);
      ctx.restore();
    });
    
    // player sprite glowing (only if alive)
    if(explosionParticles.length === 0){
      ctx.save();
      ctx.shadowColor='#0ff'; ctx.shadowBlur=12;
      drawPlayerSprite(clientRenderPos.x,clientRenderPos.y,clientRenderPos.facing||1);
      ctx.restore();
    }
  }

  function physicsTick(){
    if(player.dead || player.win) return;
    const lvl = levels[currentLevel];
    
    // Update moving obstacles
    movingObstacles.forEach(obs=>{
      if(obs.vx !== undefined){
        obs.x += obs.vx;
        if(Math.abs(obs.x - obs.startX) > obs.range) obs.vx *= -1;
      }
      if(obs.vy !== undefined){
        obs.y += obs.vy;
        if(Math.abs(obs.y - obs.startY) > obs.range) obs.vy *= -1;
      }
    });
    
    // apply input with acceleration
    const speed=4;
    if(clientInput.left){ player.vx = Math.max(player.vx-0.8, -speed); player.facing=-1; }
    else if(clientInput.right){ player.vx = Math.min(player.vx+0.8, speed); player.facing=1; }
    else player.vx *= 0.85;
    
    // smoother jump with variable height
    const wasOnGround = player.onGround;
    if(clientInput.jump && player.onGround){ 
      player.vy = -12; 
      player.onGround=false; 
      audio.jump();
      // spawn jump particles
      for(let i=0;i<5;i++) particles.push({x:player.x+Math.random()*player.w,y:player.y+player.h,vx:(Math.random()-0.5)*2,vy:Math.random()*2,alpha:0.8,s:2});
    }
    // gravity with terminal velocity
    player.vy = Math.min(player.vy + 0.55, 15);
    
    // integrate
    player.x += player.vx; player.y += player.vy;
    
    // platform collision
    player.onGround = false;
    lvl.platforms.forEach(p=>{
      if(player.x + player.w > p.x && player.x < p.x + p.w){
        if(player.y + player.h > p.y && player.y + player.h < p.y + p.h + 20 && player.vy >=0){
          player.y = p.y - player.h; player.vy = 0; player.onGround = true;
        }
      }
    });
    
    // landing sound
    if(player.onGround && !wasOnGround && player.vy > 5) audio.land();
    
    // spike collision
    lvl.spikes.forEach(s=>{
      if(player.x+player.w > s.x && player.x < s.x+20 && player.y+player.h > 370){
        if(!player.dead){ 
          player.dead=true;
          createExplosion(player.x, player.y);
          nm.sendData('game',{type:'death', x:player.x, y:player.y}); 
          setTimeout(()=> resetCurrentLevel(), 2000);
        }
      }
    });
    
    // moving obstacle collision
    movingObstacles.forEach(obs=>{
      if(player.x+player.w > obs.x && player.x < obs.x+obs.w &&
         player.y+player.h > obs.y && player.y < obs.y+obs.h){
        if(!player.dead){ 
          player.dead=true;
          createExplosion(player.x, player.y);
          nm.sendData('game',{type:'death', x:player.x, y:player.y}); 
          setTimeout(()=> resetCurrentLevel(), 2000);
        }
      }
    });
    
    // bounds
    if(player.y > canvas.height+50 && !player.dead) { 
      player.dead = true;
      createExplosion(player.x, canvas.height-50);
      nm.sendData('game',{type:'death', x:player.x, y:canvas.height-50}); 
      setTimeout(()=> resetCurrentLevel(), 2000);
    }
    if(player.x < 0) player.x=0; if(player.x+player.w > canvas.width) player.x=canvas.width-player.w;
    
    // goal collision
    if(player.x + player.w > lvl.goal.x && player.x < lvl.goal.x+lvl.goal.w && 
       player.y + player.h > lvl.goal.y && player.y < lvl.goal.y+lvl.goal.h){
      if(!player.win){ 
        player.win=true;
        if(currentLevel < totalLevels - 1){
          audio.levelComplete();
          nm.sendData('game',{type:'levelComplete', level:currentLevel});
          setTimeout(()=>{
            if(loadLevel(currentLevel + 1)){
              player.win = false;
              nm.sendData('game',{type:'levelLoaded', level:currentLevel});
            }
          }, 1500);
        } else {
          audio.win();
          nm.sendData('game',{type:'gameComplete'});
        }
      }
    }
    
    // update particles
    particles = particles.filter(pt=>{
      pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.2; pt.alpha -= 0.02;
      return pt.alpha > 0;
    });
    
    // update explosion particles
    explosionParticles = explosionParticles.filter(ep=>{
      ep.x += ep.vx;
      ep.y += ep.vy;
      ep.vy += 0.3; // gravity
      ep.alpha -= 0.03;
      return ep.alpha > 0;
    });

    // send position to client
    nm.sendData('pos', {x:player.x,y:player.y,vx:player.vx,vy:player.vy,onGround:player.onGround,facing:player.facing,level:currentLevel});
  }

  function hostLoop(){
    redrawHost();
    animationId = requestAnimationFrame(hostLoop);
  }

  function clientLoop(){
    redrawClient();
    animationId = requestAnimationFrame(clientLoop);
  }

  function startHostFlow(){
    loadLevel(0); // Start at level 1
    hostStatus.textContent = 'Initializing...';
    
    // Start background music
    audio.startMusic();
    
    nm.startHost().then(code=>{
      role='host'; 
      roomCodeSpan.textContent = code; 
      hostWrap.style.display='block'; 
      gameArea.style.display='block';
      gameStatus.textContent='You are HOST (Spirit). Share the code with your partner!';
      hostStatus.textContent = 'Waiting for client to connect...';
      hostStatus.style.color = '#ffd166';
      
      nm.onData(packet=>{
        if(packet.type==='input'){
          clientInput = packet.payload;
        }
      });
      
      // run physics and rendering
      physicsTimer = setInterval(physicsTick,1000/30);
      hostLoop();
      
      // observe connection state
      const checkConn = setInterval(()=>{
        if(nm.conn && nm.conn.open){ 
          hostStatus.textContent='✅ Player connected — Game Active!'; 
          hostStatus.style.color = '#0fffa0';
          gameStatus.textContent='Guide your partner to the goal!';
          clearInterval(checkConn); 
        }
      },300);
    }).catch(err=>{ 
      console.error('Host error:', err);
      hostStatus.textContent = '❌ Failed to start host: ' + err.message;
      hostStatus.style.color = '#ff4d4d';
      alert('Failed to create host. Please refresh and try again.\n\nError: ' + err.message); 
    });
  }

  function startClientFlow(code){
    clientStatus.textContent = 'Connecting to room ' + code + '...';
    clientStatus.style.color = '#ffd166';
    
    nm.joinRoom(code).then(()=>{
      role='client'; 
      clientWrap.style.display='none'; 
      gameArea.style.display='block'; 
      gameStatus.textContent='✅ Connected! Use Arrow Keys or WASD to move. Space to jump.'; 
      gameStatus.style.color = '#0fffa0';
      audio.click();
            // Start background music
      audio.startMusic();
            // send input events
      const keys = {};
      window.addEventListener('keydown',e=>{
        if(['ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','Space','KeyW'].includes(e.code) || ['ArrowLeft','ArrowRight','ArrowUp'].includes(e.key)){
          e.preventDefault();
          if(e.code==='ArrowLeft' || e.key==='ArrowLeft' || e.code==='KeyA') keys.left=true;
          if(e.code==='ArrowRight' || e.key==='ArrowRight' || e.code==='KeyD') keys.right=true;
          if(e.code==='ArrowUp' || e.code==='Space' || e.code==='KeyW') keys.jump=true;
          sendInput(keys);
        }
      });
      window.addEventListener('keyup',e=>{
        if(['ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','Space','KeyW'].includes(e.code) || ['ArrowLeft','ArrowRight','ArrowUp'].includes(e.key)){
          if(e.code==='ArrowLeft' || e.key==='ArrowLeft' || e.code==='KeyA') keys.left=false;
          if(e.code==='ArrowRight' || e.key==='ArrowRight' || e.code==='KeyD') keys.right=false;
          if(e.code==='ArrowUp' || e.code==='Space' || e.code==='KeyW') keys.jump=false;
          sendInput(keys);
        }
      });

      function sendInput(k){ nm.sendData('input', {left:!!k.left,right:!!k.right,jump:!!k.jump}); }

      nm.onData(packet=>{
        if(packet.type==='pos'){
          clientRenderPos.x = packet.payload.x;
          clientRenderPos.y = packet.payload.y;
          clientRenderPos.facing = packet.payload.facing;
          if(packet.payload.level !== undefined && packet.payload.level !== currentLevel){
            currentLevel = packet.payload.level;
            gameStatus.textContent = `Level ${currentLevel+1}/${totalLevels} - Keep going!`;
          }
          // spawn trail particles
          if(Math.random()>0.7) jumpParticles.push({x:clientRenderPos.x+Math.random()*clientRenderPos.w,y:clientRenderPos.y+clientRenderPos.h,alpha:0.6});
          jumpParticles = jumpParticles.filter(jp=>{ jp.y+=1; jp.alpha-=0.03; return jp.alpha>0; });
          
          // update explosion particles
          explosionParticles = explosionParticles.filter(ep=>{
            ep.x += ep.vx; ep.y += ep.vy; ep.vy += 0.3; ep.alpha -= 0.03;
            return ep.alpha > 0;
          });
        }else if(packet.type==='game'){
          if(packet.payload.type === 'death'){ 
            // Create explosion on client
            explosionParticles = [];
            for(let i=0; i<20; i++){
              const angle = (Math.PI * 2 * i) / 20;
              const speed = 3 + Math.random() * 4;
              explosionParticles.push({
                x: packet.payload.x + 9,
                y: packet.payload.y + 14,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 3,
                alpha: 1,
                color: Math.random() > 0.5 ? '#ff4d4d' : '#ffaa00'
              });
            }
            gameStatus.textContent='💥 BOOM! Respawning...';
            gameStatus.style.color='#ff4d4d';
            audio.explosion();
          }
          else if(packet.payload.type === 'levelReset'){
            explosionParticles = [];
            currentLevel = packet.payload.level;
            gameStatus.textContent = `Level ${currentLevel+1}/${totalLevels} - Try again!`;
            gameStatus.style.color='#0fffa0';
            audio.blip();
          }
          else if(packet.payload.type === 'levelComplete'){
            gameStatus.textContent = `🎯 Level ${packet.payload.level+1} Complete! Next level...`;
            gameStatus.style.color='#ffd166';
            audio.levelComplete();
          }
          else if(packet.payload.type === 'levelLoaded'){
            currentLevel = packet.payload.level;
            gameStatus.textContent = `Level ${currentLevel+1}/${totalLevels} - Go!`;
            gameStatus.style.color='#0fffa0';
            audio.blip();
          }
          else if(packet.payload.type === 'gameComplete'){
            gameStatus.textContent='🎉 ALL 20 LEVELS COMPLETE! YOU WIN!';
            gameStatus.style.color='#ffd166';
            audio.win();
          }
        }
      });

      clientLoop();
    }).catch(err=>{ 
      console.error('Join error:', err);
      clientStatus.textContent = '❌ ' + err.message; 
      clientStatus.style.color = '#ff4d4d';
      joinBtn.disabled = false;
      codeInput.disabled = false;
    });
  }

  hostBtn.addEventListener('click', ()=>{
    hostBtn.disabled=true; clientBtn.disabled=true; hostWrap.style.display='block'; gameArea.style.display='block'; startHostFlow();
  });
  clientBtn.addEventListener('click', ()=>{ hostBtn.disabled=true; clientBtn.disabled=true; clientWrap.style.display='block'; });
  joinBtn.addEventListener('click', ()=>{
    const code = codeInput.value.trim().toUpperCase(); 
    if(!code || code.length !== 4) {
      clientStatus.textContent = '⚠️ Please enter a 4-letter room code';
      clientStatus.style.color = '#ffd166';
      return;
    }
    joinBtn.disabled = true;
    codeInput.disabled = true;
    clientStatus.textContent='Connecting...';
    startClientFlow(code);
  });

  // quick demo: if no network, still allow local play (client controls local mimic)
  // (left as future test; current flow requires PeerJS connectivity)

})();
