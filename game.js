// ============================================================
// REEFS & RAINFOREST  –  Global Game Jam 2026
// Coral bleaching vs ocean acidification
// ============================================================
'use strict';

const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
const W = 1280, H = 720;
canvas.width = W; canvas.height = H;

function fitCanvas() {
  const r = Math.min(innerWidth / W, innerHeight / H);
  canvas.style.width  = W * r + 'px';
  canvas.style.height = H * r + 'px';
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

// ---- CONSTANTS ----
const STATE = { MENU:0, PLAY:1, PAUSED:2, OVER:3, WIN:4, TUTORIAL:5 };
const SEA_TOP = H * 0.30;            // y where ocean starts
const FLOOR_Y = H - 60;             // y of sea floor
const PH_DANGER = 7.85;
const PH_DEAD   = 7.40;

// ---- GLOBALS ----
let state      = STATE.MENU;
let pH         = 8.20;
let co2        = 20;   // 0-100
let score      = 0;
let coralHP    = 100;  // 0-100 average
let level      = 1;
let wave       = 1;
let waveTimer  = 0;
let frameCnt   = 0;
let t          = 0;
let highScore  = +localStorage.getItem('rrf_hs') || 0;
let gameTime   = 0;
let combo      = 0;
let comboTimer = 0;
let shakeAmt   = 0;
let factText   = '';
let factTimer  = 0;
let tutStep    = 0;
let tutAnim    = 0;

// ---- TUTORIAL DATA ----
const TUTORIAL_STEPS = [
  {
    title: '🌊 BEM-VINDO!',
    text:  'Este jogo simula a crise real dos recifes de coral.\nA tela é dividida em dois mundos interligados.',
    spotX: W/2, spotY: H/2, spotR: 420,
    arrow: null,
    highlight: 'full',
  },
  {
    title: '🌿 FLORESTA TROPICAL (parte superior)',
    text:  'As árvores absorvem CO₂ da atmosfera, naturalmente.\nQuando desflorestadas, liberam carbono que acidifica o oceano.',
    spotX: W/2, spotY: H*0.15, spotR: 200,
    arrow: { x: W/2, y: H*0.15 - 180, tx: W/2, ty: H*0.09 },
    highlight: 'top',
  },
  {
    title: '🪸 RECIFES DE CORAL (parte inferior)',
    text:  'Os corais no fundo do oceano estão vivos e coloridos.\nQuando o pH cai, eles perdem a cor e embranquecem!',
    spotX: W/2, spotY: FLOOR_Y - 40, spotR: 220,
    arrow: { x: W/2, y: FLOOR_Y - 220, tx: W/2, ty: FLOOR_Y - 50 },
    highlight: 'bottom',
  },
  {
    title: '🟢 BOLSÕES DE CO₂',
    text:  'Bolhas verdes são CO₂ dissolvido na água.\nSe chegarem ao fundo, o pH cai e os corais embranquecem!\n⚠️ IMPEÇA que cheguem ao fundo!',
    spotX: W/2, spotY: SEA_TOP + 80, spotR: 160,
    arrow: { x: W/2 + 160, y: SEA_TOP + 30, tx: W/2 + 100, ty: SEA_TOP + 70 },
    highlight: 'ocean',
  },
  {
    title: '🚢 SEU SUBMARINO',
    text:  'Você controla o submarino com o MOUSE.\nCLIQUE para disparar projéteis alcalinos (OH⁻)\nque neutralizam os bolsões de CO₂!',
    spotX: W/2, spotY: H*0.55, spotR: 110,
    arrow: { x: W/2 + 110, y: H*0.45, tx: W/2 + 40, ty: H*0.53 },
    highlight: 'ocean',
  },
  {
    title: '💠 ORBS ALCALINOS (OH⁻)',
    text:  'Orbs azuis flutuam pelo oceano.\nPasse sobre eles para coletá-los — restauram o pH!\nMais pH = corais mais saudáveis.',
    spotX: W*0.75, spotY: H*0.5, spotR: 100,
    arrow: { x: W*0.75 + 80, y: H*0.4, tx: W*0.75 + 20, ty: H*0.49 },
    highlight: 'ocean',
  },
  {
    title: '📊 BARRA DE pH',
    text:  'Monitore o pH do oceano (deve ficar > 7,9).\nVerde = seguro | Amarelo = alerta | Vermelho = PERIGO!\nA linha tracejada vermelha marca o limite crítico.',
    spotX: 120, spotY: H*0.31 + 32, spotR: 130,
    arrow: { x: 300, y: H*0.31 + 32, tx: 220, ty: H*0.31 + 32 },
    highlight: 'hud',
  },
  {
    title: '🔥 INCÊNDIOS NA FLORESTA',
    text:  'Árvores pegam fogo aleatoriamente!\nCLIQUE nelas rapidamente para apagar.\nSe não salvas, liberam CO₂ que acidifica ainda mais o oceano.',
    spotX: W/2, spotY: H*0.14, spotR: 140,
    arrow: { x: W/2 + 130, y: H*0.06, tx: W/2 + 50, ty: H*0.1 },
    highlight: 'top',
  },
  {
    title: '🏆 OBJETIVO',
    text:  'Sobreviva às ondas mantendo:\n🪸 Saúde dos corais > 0%\n🌊 pH do oceano acima de 7,9\n\nComplete 3 níveis × 5 ondas para VENCER!',
    spotX: W/2, spotY: H/2, spotR: 350,
    arrow: null,
    highlight: 'full',
  },
];

const FACTS = [
  '🌊 Os oceanos absorvem ~30% do CO₂ humano, tornando-se mais ácidos.',
  '🪸 Corais expelem algas simbióticas (zooxantelas) sob estresse térmico.',
  '⚠️ O pH oceânico caiu de 8,2 → 8,1 desde a Revolução Industrial.',
  '🐠 25% de toda a vida marinha depende dos recifes de coral.',
  '🌿 Florestas tropicais absorvem 2,4 bilhões de toneladas de CO₂/ano.',
  '💀 50% dos corais do mundo foram perdidos desde 1950.',
  '🔬 Recifes cobrem <1% do fundo do mar mas hospedam 25% da vida marinha.',
  '🌡️ pH < 7,8 impede corais de construírem seus esqueletos de calcário.',
  '🌍 A Grande Barreira perdeu 50% de seus corais desde 1995.',
  '🧪 Acidificação dissolvendo esqueletos de ouriços-do-mar e moluscos.',
];

function showFact() {
  factText  = FACTS[Math.floor(Math.random() * FACTS.length)];
  factTimer = 240;
}

// ---- INPUT ----
const keys  = {};
const mouse = { x: W/2, y: H/2, down: false, clicked: false };

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Escape') {
    if (state === STATE.PLAY)        state = STATE.PAUSED;
    else if (state === STATE.PAUSED) state = STATE.PLAY;
    else if (state === STATE.TUTORIAL) state = STATE.MENU;
  }
  if (e.code === 'Space' && state === STATE.MENU)     startGame();
  if (e.code === 'Space' && state === STATE.OVER)     startGame();
  if (e.code === 'Space' && state === STATE.TUTORIAL) advanceTutorial();
  if (e.code === 'ArrowRight' && state === STATE.TUTORIAL) advanceTutorial();
  if (e.code === 'ArrowLeft'  && state === STATE.TUTORIAL) retreatTutorial();
});
window.addEventListener('keyup',   e => { keys[e.code] = false; });

canvas.addEventListener('mousemove', e => {
  const r  = canvas.getBoundingClientRect();
  const sx = r.width  / W;
  const sy = r.height / H;
  mouse.x  = (e.clientX - r.left) / sx;
  mouse.y  = (e.clientY - r.top)  / sy;
});

canvas.addEventListener('mousedown', () => { mouse.down = true;  mouse.clicked = true; initAudio(); });
canvas.addEventListener('mouseup',   () => { mouse.down = false; });

// ---- AUDIO ----
let audio = null;
function initAudio() {
  if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
}
function beep(freq, dur, type='sine', vol=0.2) {
  if (!audio) return;
  const o = audio.createOscillator();
  const g = audio.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
  o.connect(g); g.connect(audio.destination);
  o.start(); o.stop(audio.currentTime + dur);
}
function sfxBlast()    { beep(660, 0.12); beep(880, 0.08); }
function sfxCollect()  { beep(523, 0.1); beep(659, 0.1); beep(784, 0.15); }
function sfxDamage()   { beep(120, 0.35, 'sawtooth', 0.3); }
function sfxTree()     { beep(392, 0.1); beep(523, 0.15); }

// ---- PARTICLES ----
const parts = [];
function spawnParts(x, y, col, n=6, spd=3) {
  for (let i=0; i<n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * spd;
    parts.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 1.5,
                 col, life: 1, sz: 2 + Math.random()*5, decay: 0.018 + Math.random()*0.02 });
  }
}
function tickParts() {
  for (let i = parts.length-1; i >= 0; i--) {
    const p = parts[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life -= p.decay;
    if (p.life <= 0) parts.splice(i, 1);
  }
}
function drawParts() {
  parts.forEach(p => {
    ctx.save(); ctx.globalAlpha = p.life;
    ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.sz, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  });
}

// ---- CORALS ----
const corals = [];
const CORAL_TYPES = ['brain','staghorn','fan','pillar','mushroom'];
const CORAL_COLORS = [
  ['#FF6B6B','#FF8E53'], ['#FF9500','#FFBE00'], ['#FF85A1','#FF6B9D'],
  ['#9B59B6','#8E44AD'], ['#E74C3C','#F39C12'], ['#00BCD4','#4DD0E1'],
];

function initCorals() {
  corals.length = 0;
  const N = 14;
  for (let i = 0; i < N; i++) {
    const ci = i % CORAL_COLORS.length;
    corals.push({
      x    : (i + 0.5) * (W / N) + (Math.random()-0.5)*20,
      y    : FLOOR_Y + 10,
      type : CORAL_TYPES[i % CORAL_TYPES.length],
      hp   : 100,
      h    : 40 + Math.random()*40,
      w    : 18 + Math.random()*25,
      ca   : CORAL_COLORS[ci][0],
      cb   : CORAL_COLORS[ci][1],
      ph   : Math.random() * Math.PI * 2,
      spd  : 0.008 + Math.random()*0.015,
    });
  }
}

function lerpHex(a, b, t) {
  const p = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [r1,g1,b1] = p(a); const [r2,g2,b2] = p(b);
  const r = r1+(r2-r1)*t, g = g1+(g2-g1)*t, bv = b1+(b2-b1)*t;
  return `rgb(${r|0},${g|0},${bv|0})`;
}

function drawCoral(c) {
  const bf   = 1 - c.hp/100;
  const main = lerpHex(c.ca, '#E0E0E0', bf);
  const sec  = lerpHex(c.cb, '#F5F5F5', bf);
  const wave = Math.sin(t * c.spd + c.ph) * (3 - bf*2);

  ctx.save(); ctx.translate(c.x, c.y);

  if (c.type === 'brain')    drawBrain(c.w, c.h*0.5, main, sec, wave);
  if (c.type === 'staghorn') drawStaghorn(c.w, c.h, main, sec, wave);
  if (c.type === 'fan')      drawFan(c.w, c.h, main, wave);
  if (c.type === 'pillar')   drawPillar(c.w*0.5, c.h*1.1, main, sec, wave);
  if (c.type === 'mushroom') drawMushroom(c.w, c.h*0.8, main, sec);

  if (c.hp < 25) {
    ctx.globalAlpha = (25-c.hp)/25 * 0.8;
    ctx.font = '14px serif'; ctx.textAlign = 'center';
    ctx.fillText('💀', 0, -c.h - 12);
  }
  ctx.restore();
}

function drawBrain(w, h, c1, c2, wave) {
  const g = ctx.createRadialGradient(wave, -h/2, 0, wave, -h/2, w);
  g.addColorStop(0, c2); g.addColorStop(1, c1);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(wave, -h/2, w, h, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = c2; ctx.lineWidth = 1.5;
  for (let x = -w*0.8; x < w*0.8; x += 5) {
    ctx.beginPath(); ctx.moveTo(x+wave, 0);
    ctx.bezierCurveTo(x+2+wave, -h/2, x+1+wave, -h*0.75, x+wave, -h);
    ctx.stroke();
  }
}

function drawStaghorn(w, h, c1, c2, wave) {
  function branch(x, y, ang, len, dep) {
    if (dep <= 0 || len < 2) return;
    const ex = x + Math.cos(ang)*len;
    const ey = y + Math.sin(ang)*len;
    ctx.strokeStyle = dep > 1 ? c1 : c2;
    ctx.lineWidth = dep * 1.8;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex + wave*dep*0.2, ey); ctx.stroke();
    branch(ex+wave*0.2, ey, ang-0.45, len*0.68, dep-1);
    branch(ex+wave*0.2, ey, ang+0.45, len*0.68, dep-1);
  }
  branch(0, 0, -Math.PI/2, h, 4);
}

function drawFan(w, h, c1, wave) {
  ctx.strokeStyle = c1; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(wave*0.3, -h*0.3); ctx.stroke();
  ctx.lineWidth = 1;
  for (let x = -w; x <= w; x += 5) {
    ctx.beginPath(); ctx.moveTo(wave*0.3, -h*0.3); ctx.lineTo(x+wave, -h*0.95); ctx.stroke();
  }
  for (let f = 0.4; f < 1; f += 0.18) {
    ctx.beginPath(); ctx.arc(wave*0.3, -h*0.3, h*f, -Math.PI+0.2, -0.2); ctx.stroke();
  }
}

function drawPillar(w, h, c1, c2, wave) {
  const g = ctx.createLinearGradient(-w, -h, w, 0);
  g.addColorStop(0, c2); g.addColorStop(1, c1);
  ctx.fillStyle = g;
  [-1, 0, 1].forEach((o, i) => {
    const ox = o*w*2 + wave*0.4;
    const oh = h*(0.7 + i*0.15);
    ctx.beginPath();
    ctx.roundRect(ox-w*0.45, -oh, w*0.9, oh, [4,4,0,0]);
    ctx.fill();
    ctx.strokeStyle = c2; ctx.lineWidth = 1;
    for (let y = 0; y < oh; y += 6) {
      ctx.beginPath(); ctx.moveTo(ox-w*0.45,-y); ctx.lineTo(ox+w*0.45,-y); ctx.stroke();
    }
  });
}

function drawMushroom(w, h, c1, c2) {
  const sg = ctx.createLinearGradient(0, 0, 0, -h);
  sg.addColorStop(0, c1); sg.addColorStop(1, c2);
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.roundRect(-w*0.18, -h, w*0.36, h, [4]); ctx.fill();
  const cg = ctx.createRadialGradient(0,-h,0, 0,-h, w);
  cg.addColorStop(0, c2); cg.addColorStop(1, c1);
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.ellipse(0, -h, w, h*0.38, 0, 0, Math.PI*2); ctx.fill();
}

function tickCorals() {
  const blRate = Math.max(0, (PH_DANGER - pH) * 0.06);
  const recRate = pH > 8.0 ? 0.015 : 0;
  corals.forEach(c => {
    c.hp = Math.max(0, Math.min(100, c.hp - blRate + recRate));
    if (c.hp < 30 && Math.random() < 0.002) spawnParts(c.x, c.y - c.h*0.5, '#BDBDBD', 3, 1.5);
  });
  coralHP = corals.reduce((s, c) => s + c.hp, 0) / corals.length;
  if (coralHP <= 0) endGame(false);
}

// ---- ACID BUBBLES ----
const bubbles = [];
function spawnBubble() {
  bubbles.push({
    x  : 50 + Math.random() * (W - 100),
    y  : SEA_TOP + 20 + Math.random() * H*0.15,
    r  : 10 + Math.random()*10,
    vy : 0.4 + Math.random()*0.5 + level*0.08,
    vx : (Math.random()-0.5)*0.4,
    str: 0.6 + level*0.25,
    ph : Math.random()*Math.PI*2,
  });
}

function tickBubbles() {
  const rate = Math.max(25, 80 - level*8);
  if (frameCnt % rate === 0) spawnBubble();

  for (let i = bubbles.length-1; i >= 0; i--) {
    const b = bubbles[i];
    b.ph += 0.05;
    b.x  += b.vx + Math.sin(b.ph)*0.8;
    b.y  += b.vy;
    if (b.y >= FLOOR_Y - 10) {
      pH    = Math.max(6.5, pH - 0.012 * b.str);
      co2   = Math.min(100, co2 + 1.5);
      shakeAmt = 6;
      spawnParts(b.x, FLOOR_Y, '#AEEA00', 4, 2);
      sfxDamage(); combo = 0;
      factTimer <= 0 && Math.random() < 0.25 && showFact();
      bubbles.splice(i, 1);
    } else if (b.x < -60 || b.x > W+60) {
      bubbles.splice(i, 1);
    }
  }
}

function drawBubbles() {
  bubbles.forEach(b => {
    ctx.save();
    const bg = ctx.createRadialGradient(b.x-b.r*0.3, b.y-b.r*0.3, 0, b.x, b.y, b.r);
    bg.addColorStop(0, 'rgba(220,255,80,0.9)');
    bg.addColorStop(0.6, 'rgba(120,200,0,0.75)');
    bg.addColorStop(1, 'rgba(50,120,0,0.4)');
    ctx.fillStyle   = bg;
    ctx.shadowColor = '#AEEA00';
    ctx.shadowBlur  = 14;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(200,255,0,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle  = 'rgba(0,60,0,0.95)';
    ctx.font       = `bold ${(b.r*0.75)|0}px monospace`;
    ctx.textAlign  = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('CO₂', b.x, b.y);
    ctx.restore();
  });
}

// ---- ALKALINE ORBS ----
const orbs = [];
function spawnOrb() {
  orbs.push({
    x  : 80 + Math.random()*(W-160),
    y  : SEA_TOP + 40 + Math.random()*(H*0.35),
    r  : 13,
    ph : Math.random()*Math.PI*2,
    vy : -0.25 - Math.random()*0.2,
  });
}
function tickOrbs() {
  if (frameCnt % 280 === 0) spawnOrb();
  for (let i = orbs.length-1; i >= 0; i--) {
    const o = orbs[i];
    o.ph += 0.04; o.y += o.vy; o.x += Math.sin(o.ph)*0.5;
    if (o.y < SEA_TOP + 10 || o.y > H) { orbs.splice(i,1); continue; }
    const dx = player.x-o.x, dy = player.y-o.y;
    if (Math.sqrt(dx*dx+dy*dy) < player.r + o.r) {
      pH = Math.min(8.5, pH + 0.12);
      score += 25 * (combo || 1);
      spawnParts(o.x, o.y, '#00E5FF', 14, 4);
      spawnParts(o.x, o.y, '#FFFFFF',  6, 2.5);
      orbs.splice(i,1); sfxCollect();
    }
  }
}
function drawOrbs() {
  orbs.forEach(o => {
    ctx.save();
    const pulse = 1 + Math.sin(o.ph)*0.12;
    const r = o.r * pulse;
    const gg = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, r*2.5);
    gg.addColorStop(0, 'rgba(0,229,255,0.35)');
    gg.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(o.x, o.y, r*2.5, 0, Math.PI*2); ctx.fill();
    const ig = ctx.createRadialGradient(o.x-r*0.3, o.y-r*0.3, 0, o.x, o.y, r);
    ig.addColorStop(0, '#FFFFFF'); ig.addColorStop(0.4, '#00E5FF'); ig.addColorStop(1, '#006064');
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFF'; ctx.font = `bold ${(r*0.85)|0}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('OH⁻', o.x, o.y);
    ctx.restore();
  });
}

// ---- TREES ----
const trees = [];
const TREE_Y = H * 0.24;
function initTrees() {
  trees.length = 0;
  const N = 18;
  for (let i = 0; i < N; i++) {
    trees.push({
      x: (i+0.5)*(W/N) + (Math.random()-0.5)*10,
      y: TREE_Y,
      sz   : 18 + Math.random()*14,
      hp   : 100,
      fire : false,
      fTimer: 0,
      ph   : Math.random()*Math.PI*2,
      wobble: 0,
    });
  }
}

function tickTrees() {
  const evRate = Math.max(200, 420 - level*30);
  if (frameCnt % evRate === 0 && level >= 1) {
    const healthy = trees.filter(tr => !tr.fire && tr.hp > 40);
    if (healthy.length) {
      const tr = healthy[Math.floor(Math.random()*healthy.length)];
      tr.fire = true; tr.fTimer = 300 - level*15;
    }
  }
  trees.forEach(tr => {
    tr.ph += 0.02; tr.wobble *= 0.88;
    if (tr.fire) {
      tr.fTimer--; tr.hp = Math.max(0, tr.hp - 0.4);
      if (tr.fTimer <= 0 || tr.hp <= 0) {
        tr.fire = false; tr.hp = Math.max(0, tr.hp - 25);
        co2 = Math.min(100, co2 + 12); pH = Math.max(6.5, pH - 0.06);
      }
    } else if (tr.hp < 100) {
      tr.hp = Math.min(100, tr.hp + 0.04);
    }
    if (mouse.clicked && tr.fire) {
      const dx = mouse.x - tr.x, dy = mouse.y - tr.y;
      if (Math.sqrt(dx*dx+dy*dy) < tr.sz*1.8) {
        tr.fire = false; tr.fTimer = 0;
        tr.hp   = Math.min(100, tr.hp + 20);
        tr.wobble = 6;
        score     += 60 * (combo||1);
        co2        = Math.max(0, co2 - 8);
        pH         = Math.min(8.5, pH + 0.06);
        spawnParts(tr.x, tr.y - tr.sz, '#69F0AE', 12, 3.5);
        sfxTree(); combo++;
      }
    }
  });
  const healthyCount  = trees.filter(tr => tr.hp > 50).length;
  co2  = Math.max(0, co2 - healthyCount * 0.00008 * 60);
  const co2Decay = co2 * 0.000055;
  pH   = Math.max(6.5, pH - co2Decay);
  if (co2 < 20 && pH < 8.2) pH = Math.min(8.2, pH + 0.0004);
}

function drawTree(tr) {
  ctx.save();
  ctx.translate(tr.x, tr.y + tr.wobble * Math.sin(tr.ph));
  const dead  = 1 - tr.hp/100;
  const trunk = lerpHex('#5D4037', '#795548', dead);
  ctx.fillStyle = trunk;
  ctx.fillRect(-tr.sz*0.13, -tr.sz*0.7, tr.sz*0.26, tr.sz*0.7);
  for (let L = 0; L < 3; L++) {
    const lw  = tr.sz * (1.1 - L*0.28);
    const ly  = -(tr.sz*0.7 + L*tr.sz*0.55);
    const col = tr.fire ? lerpHex('#FF6F00','#FFFF00', Math.random()) :
                lerpHex('#2E7D32','#795548', dead);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, ly - tr.sz*0.55);
    ctx.lineTo(-lw, ly + tr.sz*0.08);
    ctx.lineTo( lw, ly + tr.sz*0.08);
    ctx.closePath(); ctx.fill();
  }
  if (tr.fire) {
    ctx.globalAlpha = 0.8 + Math.sin(frameCnt*0.25)*0.2;
    ctx.font = `${tr.sz}px serif`; ctx.textAlign = 'center';
    ctx.fillText('🔥', 0, -tr.sz*1.9);
    ctx.globalAlpha = 1;
    const urgPct = tr.fTimer / 300;
    ctx.strokeStyle = `hsl(${urgPct*55}, 100%, 55%)`;
    ctx.lineWidth   = 2;
    ctx.setLineDash([4,3]);
    ctx.beginPath(); ctx.arc(0, -tr.sz, tr.sz*1.6, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

// ---- PLAYER ----
const player = {
  x: W/2, y: H*0.55,
  r  : 22,
  blasts: [],
  cooldown: 0,
  COOLDOWN: 14,
  trail: [],
  glow : 0,
};

function tickPlayer() {
  player.glow = (player.glow + 0.05) % (Math.PI*2);
  const dx = mouse.x - player.x;
  const dy = mouse.y - player.y;
  player.x += dx * 0.14;
  player.y += dy * 0.14;
  player.x  = Math.max(24, Math.min(W-24, player.x));
  player.y  = Math.max(SEA_TOP + 10, Math.min(FLOOR_Y - 10, player.y));

  player.trail.unshift({ x: player.x, y: player.y });
  if (player.trail.length > 14) player.trail.pop();

  if (player.cooldown > 0) player.cooldown--;
  if ((mouse.clicked || mouse.down) && player.cooldown === 0) {
    fireBlast();
    player.cooldown = player.COOLDOWN;
    mouse.clicked = false;
  }

  for (let i = player.blasts.length-1; i >= 0; i--) {
    const b = player.blasts[i];
    b.x += b.vx; b.y += b.vy; b.life--;
    let hit = false;
    for (let j = bubbles.length-1; j >= 0; j--) {
      const bub = bubbles[j];
      const dx2 = b.x-bub.x, dy2 = b.y-bub.y;
      if (dx2*dx2+dy2*dy2 < (b.r+bub.r)**2) {
        pH    = Math.min(8.5, pH + 0.04*bub.str);
        co2   = Math.max(0, co2 - 2);
        score += 10 * Math.max(1, combo);
        combo++; comboTimer = 120;
        spawnParts(bub.x, bub.y, '#00FFFF', 8, 4);
        spawnParts(bub.x, bub.y, '#FFFFFF', 4, 2);
        bubbles.splice(j,1);
        sfxBlast();
        factTimer <= 0 && Math.random() < 0.2 && showFact();
        hit = true; break;
      }
    }
    if (hit || b.life <= 0) player.blasts.splice(i,1);
  }
}

function fireBlast() {
  let target = null, md = Infinity;
  bubbles.forEach(b => {
    const dx = b.x-player.x, dy = b.y-player.y, d = dx*dx+dy*dy;
    if (d < md) { md = d; target = b; }
  });
  let vx, vy;
  const spd = 13;
  if (target) {
    const dx = target.x-player.x, dy = target.y-player.y;
    const len = Math.sqrt(dx*dx+dy*dy) || 1;
    vx = dx/len*spd; vy = dy/len*spd;
  } else {
    const dx = mouse.x-player.x, dy = mouse.y-player.y;
    const len = Math.sqrt(dx*dx+dy*dy) || 1;
    vx = dx/len*spd; vy = dy/len*spd;
  }
  player.blasts.push({ x: player.x, y: player.y, vx, vy, r: 8, life: 65 });
}

function drawPlayer() {
  const p = player;
  p.trail.forEach((pt,i) => {
    ctx.save(); ctx.globalAlpha = (1-i/p.trail.length)*0.25;
    ctx.fillStyle = '#00E5FF';
    ctx.beginPath(); ctx.arc(pt.x, pt.y, p.r*(1-i/p.trail.length)*0.6, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  });
  ctx.save();
  const gp = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r*2.8);
  const g  = 0.45 + Math.sin(p.glow)*0.3;
  gp.addColorStop(0, `rgba(0,229,255,${g})`); gp.addColorStop(1, 'rgba(0,229,255,0)');
  ctx.fillStyle = gp;
  ctx.beginPath(); ctx.arc(p.x, p.y, p.r*2.8, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  ctx.save(); ctx.translate(p.x, p.y);
  const hg = ctx.createLinearGradient(-p.r, -p.r*0.5, p.r, p.r*0.5);
  hg.addColorStop(0,'#00838F'); hg.addColorStop(0.5,'#00BCD4'); hg.addColorStop(1,'#006064');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.ellipse(0, 0, p.r*1.4, p.r*0.68, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle='#B2EBF2'; ctx.lineWidth=1.5; ctx.stroke();

  ctx.strokeStyle='#90A4AE'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(0,-p.r*0.68); ctx.lineTo(0,-p.r*1.3); ctx.lineTo(p.r*0.55,-p.r*1.3); ctx.stroke();

  const wg = ctx.createRadialGradient(p.r*0.5,0,0,p.r*0.5,0,p.r*0.32);
  wg.addColorStop(0,'rgba(255,255,255,0.95)'); wg.addColorStop(1,`rgba(0,229,255,${g})`);
  ctx.fillStyle = wg;
  ctx.beginPath(); ctx.arc(p.r*0.5, 0, p.r*0.3, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle='#E0F7FA'; ctx.lineWidth=1.5; ctx.stroke();

  ctx.save(); ctx.translate(-p.r*1.4, 0); ctx.rotate(frameCnt * 0.22);
  ctx.fillStyle='#B0BEC5';
  for (let i=0;i<3;i++) { ctx.save(); ctx.rotate(i*Math.PI*2/3); ctx.fillRect(-1.5,-9,3,9); ctx.restore(); }
  ctx.restore(); ctx.restore();

  p.blasts.forEach(b => {
    ctx.save();
    const bg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    bg.addColorStop(0,'#FFFFFF'); bg.addColorStop(0.5,'#00E5FF'); bg.addColorStop(1,'rgba(0,229,255,0)');
    ctx.fillStyle = bg; ctx.shadowColor='#00E5FF'; ctx.shadowBlur=16;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  });
}

// ---- BACKGROUND ----
const seaweed = [], bgFish = [], lightRays = [];

function initBG() {
  seaweed.length = 0; bgFish.length = 0; lightRays.length = 0;
  for (let i=0;i<22;i++) {
    seaweed.push({ x: Math.random()*W, segs: 4+Math.floor(Math.random()*5),
      ph: Math.random()*Math.PI*2, segH: 12+Math.random()*10,
      col: `hsl(${110+Math.random()*50},${55+Math.random()*20}%,${25+Math.random()*15}%)` });
  }
  for (let i=0;i<10;i++) {
    bgFish.push({ x: Math.random()*W, y: SEA_TOP+40+Math.random()*(H-SEA_TOP-80),
      sz: 8+Math.random()*12, spd: 0.4+Math.random()*0.9,
      dir: Math.random()<0.5?1:-1, ph: Math.random()*Math.PI*2,
      col: ['#FF6B6B','#FFD700','#00BCD4','#FF9500','#E91E63','#7C4DFF'][i%6] });
  }
  for (let i=0;i<7;i++) {
    lightRays.push({ x: Math.random()*W, w: 30+Math.random()*60,
      al: 0.02+Math.random()*0.025, ph: Math.random()*Math.PI*2 });
  }
}

function drawBackground() {
  // Sky / rainforest zone
  const sg = ctx.createLinearGradient(0, 0, 0, SEA_TOP);
  sg.addColorStop(0, '#0a2e0e'); sg.addColorStop(0.6, '#1b4d20'); sg.addColorStop(1, '#256929');
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, SEA_TOP);

  // Ocean
  const og = ctx.createLinearGradient(0, SEA_TOP, 0, H);
  og.addColorStop(0, '#0a3d5a'); og.addColorStop(0.4, '#082f46'); og.addColorStop(1, '#020d18');
  ctx.fillStyle = og; ctx.fillRect(0, SEA_TOP, W, H - SEA_TOP);

  // Wavy surface
  ctx.save(); ctx.strokeStyle='rgba(0,220,255,0.35)'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(0, SEA_TOP);
  for (let x=0;x<=W;x+=8) ctx.lineTo(x, SEA_TOP + Math.sin(x*0.022+t*0.6)*5);
  ctx.stroke(); ctx.restore();

  // Light rays
  lightRays.forEach(r => {
    ctx.save();
    ctx.globalAlpha = r.al * (0.5 + Math.sin(t*0.3+r.ph)*0.5);
    ctx.fillStyle='rgba(100,220,255,1)';
    ctx.beginPath();
    ctx.moveTo(r.x - r.w/2, SEA_TOP); ctx.lineTo(r.x + r.w/2, SEA_TOP);
    ctx.lineTo(r.x + r.w*0.32, H);    ctx.lineTo(r.x - r.w*0.32, H);
    ctx.closePath(); ctx.fill(); ctx.restore();
  });

  // Seaweed
  seaweed.forEach(s => {
    ctx.strokeStyle = s.col; ctx.lineWidth = 2.5;
    ctx.beginPath();
    let sx=s.x, sy=FLOOR_Y+5; ctx.moveTo(sx,sy);
    for (let i=0;i<s.segs;i++) {
      sx += Math.sin(t*0.9+s.ph+i*0.6)*7;
      sy -= s.segH;
      ctx.lineTo(sx,sy);
    }
    ctx.stroke();
  });

  // Floor
  ctx.fillStyle='#050a10';
  ctx.beginPath(); ctx.moveTo(0,H);
  for (let x=0;x<=W;x+=12) ctx.lineTo(x, FLOOR_Y + Math.sin(x*0.05)*12);
  ctx.lineTo(W,H); ctx.closePath(); ctx.fill();

  const sand = ctx.createLinearGradient(0,FLOOR_Y-30,0,H);
  sand.addColorStop(0,'rgba(160,120,60,0)'); sand.addColorStop(1,'rgba(100,70,30,0.5)');
  ctx.fillStyle=sand; ctx.fillRect(0,FLOOR_Y-30,W,H-(FLOOR_Y-30));
}

function tickBgFish() {
  bgFish.forEach(f => {
    f.ph+=0.035; f.x+=f.spd*f.dir; f.y+=Math.sin(f.ph)*0.4;
    if (f.x>W+60) { f.x=-60; f.dir=1; }
    if (f.x<-60)  { f.x=W+60; f.dir=-1; }
  });
}

function drawBgFish() {
  bgFish.forEach(f => {
    ctx.save(); ctx.globalAlpha=0.35+f.sz/24*0.35;
    ctx.translate(f.x,f.y); if(f.dir<0) ctx.scale(-1,1);
    ctx.fillStyle=f.col;
    ctx.beginPath(); ctx.ellipse(0,0,f.sz,f.sz*0.38,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-f.sz,0); ctx.lineTo(-f.sz*1.55,-f.sz*0.48);
    ctx.lineTo(-f.sz*1.55,f.sz*0.48); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(f.sz*0.52,-f.sz*0.12,f.sz*0.14,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(f.sz*0.56,-f.sz*0.12,f.sz*0.06,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });
}

// ---- HUD ----
function drawHUD() {
  // --- pH Bar ---
  uiPanel(18, H*0.31 + 4, 210, 56, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = '#CFD8DC'; ctx.font='bold 11px Inter';
  ctx.textAlign='left'; ctx.textBaseline='top';
  const pHColor = pH >= 8.0 ? '#00E676' : pH >= 7.8 ? '#FFD740' : '#FF1744';
  ctx.fillStyle = pHColor;
  ctx.font='bold 13px Orbitron';
  ctx.fillText(`pH  ${pH.toFixed(2)}`, 26, H*0.31 + 12);
  drawBar(26, H*0.31 + 30, 194, 16, (pH-6.5)/(8.5-6.5),
    { from:'#FF1744', to:'#00E676' }, '#111', 'pH seguro ▶');

  // Danger line on pH bar
  const dangerPct = (7.85-6.5)/(8.5-6.5);
  const bx = 26, bw = 194;
  ctx.strokeStyle='rgba(255,23,68,0.8)'; ctx.lineWidth=2; ctx.setLineDash([3,3]);
  ctx.beginPath(); ctx.moveTo(bx + bw*dangerPct, H*0.31+28);
  ctx.lineTo(bx + bw*dangerPct, H*0.31+48); ctx.stroke(); ctx.setLineDash([]);

  // --- CO₂ Bar ---
  uiPanel(238, H*0.31 + 4, 180, 56, 'rgba(0,0,0,0.55)');
  ctx.fillStyle='#CFD8DC'; ctx.font='bold 13px Orbitron'; ctx.textAlign='left';
  ctx.fillStyle='#AEEA00'; ctx.fillText('CO₂ '+co2.toFixed(0)+'%', 246, H*0.31+12);
  drawBar(246, H*0.31+30, 164, 16, co2/100, { from:'#CCFF90', to:'#FF6D00' }, '#111');

  // --- Coral Health ---
  uiPanel(428, H*0.31 + 4, 180, 56, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = coralHP > 60 ? '#69F0AE' : coralHP > 30 ? '#FFD740' : '#FF5252';
  ctx.font='bold 13px Orbitron'; ctx.textAlign='left';
  ctx.fillText('🪸 '+coralHP.toFixed(0)+'%', 436, H*0.31+12);
  drawBar(436, H*0.31+30, 164, 16, coralHP/100, { from:'#FF5252', to:'#69F0AE' }, '#111');

  // --- Score & Level (top right) ---
  uiPanel(W-220, 8, 212, 52, 'rgba(0,0,0,0.6)');
  ctx.fillStyle='#00E5FF'; ctx.font='bold 16px Orbitron'; ctx.textAlign='right';
  ctx.fillText(score.toLocaleString(), W-18, 28);
  ctx.fillStyle='#78909C'; ctx.font='12px Inter';
  ctx.fillText(`HIGH  ${highScore.toLocaleString()}`, W-18, 46);
  ctx.fillStyle='#B2EBF2'; ctx.font='bold 13px Orbitron'; ctx.textAlign='left';
  ctx.fillText(`LV ${level}  W${wave}`, W-216, 28);

  // --- Combo ---
  if (combo > 1 && comboTimer > 0) {
    const al = Math.min(1, comboTimer/60);
    ctx.save(); ctx.globalAlpha=al;
    ctx.fillStyle='#FFD740'; ctx.font=`bold ${20+combo}px Orbitron`;
    ctx.textAlign='center';
    ctx.fillText(`COMBO ×${combo}`, W/2, H*0.31+35);
    ctx.restore();
  }

  // --- Fact banner ---
  if (factTimer > 0) {
    const al = Math.min(1, factTimer/40) * Math.min(1, factTimer/20 * (1 - (240-factTimer)/240));
    ctx.save(); ctx.globalAlpha=Math.min(1,al);
    uiPanel(W/2-380, H-78, 760, 56, 'rgba(0,10,30,0.85)');
    ctx.fillStyle='#80DEEA'; ctx.font='14px Inter'; ctx.textAlign='center';
    ctx.fillText(factText, W/2, H-52);
    ctx.restore();
    factTimer--;
  }

  // --- Divider label ---
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.5)';
  ctx.fillRect(0, SEA_TOP-14, W, 14);
  ctx.fillStyle='rgba(100,220,255,0.4)';
  ctx.font='bold 10px Inter'; ctx.textAlign='center';
  ctx.fillText('▲  FLORESTA  ▲                                 SUPERFÍCIE OCEÂNICA                                 ▼  OCEANO  ▼', W/2, SEA_TOP-3);
  ctx.restore();

  // --- Game Time ---
  const mins = (gameTime/3600|0), secs = (gameTime/60|0)%60;
  ctx.fillStyle='#546E7A'; ctx.font='12px monospace'; ctx.textAlign='left';
  ctx.fillText(`${mins}:${String(secs).padStart(2,'0')}`, 20, 14);
}

function drawBar(x, y, w, h, pct, grad, bg, label='') {
  ctx.fillStyle = bg || '#111';
  ctx.beginPath(); roundedRect(x,y,w,h,4); ctx.fill();
  const fg = ctx.createLinearGradient(x,0,x+w,0);
  fg.addColorStop(0, grad.from); fg.addColorStop(1, grad.to);
  ctx.fillStyle = fg;
  ctx.beginPath(); roundedRect(x, y, w*Math.max(0,Math.min(1,pct)), h, 4); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.lineWidth=1;
  ctx.beginPath(); roundedRect(x,y,w,h,4); ctx.stroke();
}

function uiPanel(x,y,w,h,bg) {
  ctx.fillStyle = bg;
  ctx.beginPath(); roundedRect(x,y,w,h,8); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1;
  ctx.beginPath(); roundedRect(x,y,w,h,8); ctx.stroke();
}

function roundedRect(x,y,w,h,r) {
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r);
  ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h);
  ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r);
  ctx.arcTo(x,y,x+r,y,r);
}

// ---- SCREENS ----
function drawMenu() {
  // Full gradient bg
  const mg = ctx.createLinearGradient(0,0,0,H);
  mg.addColorStop(0,'#001a08'); mg.addColorStop(0.4,'#002a38'); mg.addColorStop(1,'#000a18');
  ctx.fillStyle=mg; ctx.fillRect(0,0,W,H);

  // Animated corals in bg
  corals.forEach(c => drawCoral(c));
  drawBgFish();
  drawParts();

  // Overlay
  ctx.fillStyle='rgba(0,5,20,0.6)'; ctx.fillRect(0,0,W,H);

  // Title
  ctx.save();
  ctx.shadowColor='#00E5FF'; ctx.shadowBlur=40;
  ctx.fillStyle='#E0F7FA'; ctx.font='bold 78px Orbitron';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('REEFS &', W/2, H/2-110);
  ctx.fillStyle='#00E5FF';
  ctx.fillText('RAINFOREST', W/2, H/2-30);
  ctx.restore();

  ctx.fillStyle='rgba(0,229,255,0.15)';
  ctx.fillRect(W/2-330, H/2-155, 660, 140);
  ctx.strokeStyle='rgba(0,229,255,0.3)'; ctx.lineWidth=1;
  ctx.strokeRect(W/2-330, H/2-155, 660, 140);

  ctx.fillStyle='#B2DFDB'; ctx.font='18px Inter'; ctx.textAlign='center';
  ctx.fillText('Salve os recifes de coral da acidificação dos oceanos', W/2, H/2+32);
  ctx.fillStyle='#546E7A'; ctx.font='14px Inter';
  ctx.fillText('Global Game Jam 2026', W/2, H/2+58);

  // Blink play button
  const blink = Math.sin(t*0.08)>0;
  ctx.fillStyle = blink ? '#00E5FF' : '#4DD0E1';
  ctx.font='bold 22px Orbitron'; ctx.textAlign='center';
  ctx.fillText('▶  CLIQUE OU APERTE ESPAÇO PARA JOGAR', W/2, H/2+100);

  // Tutorial button
  const txBtn = W/2, tyBtn = H/2+148;
  uiPanel(txBtn-130, tyBtn-22, 260, 44, 'rgba(0,100,80,0.7)');
  ctx.strokeStyle='rgba(0,229,180,0.5)'; ctx.lineWidth=1.5;
  ctx.beginPath(); roundedRect(txBtn-130, tyBtn-22, 260, 44, 8); ctx.stroke();
  ctx.fillStyle='#69F0AE'; ctx.font='bold 16px Orbitron'; ctx.textAlign='center';
  ctx.fillText('📖  COMO JOGAR', txBtn, tyBtn+5);

  // Controls quick-ref
  uiPanel(W/2-260, H/2+205, 520, 56, 'rgba(0,0,0,0.5)');
  ctx.fillStyle='#80CBC4'; ctx.font='13px Inter'; ctx.textAlign='center';
  ctx.fillText('🖱 Mouse – Mover Submarino    |    Clicar – Disparar OH⁻ nos CO₂', W/2, H/2+224);
  ctx.fillText('🔥 Clique nas árvores em chamas para salvar a floresta!', W/2, H/2+242);
}

function drawPauseScreen() {
  ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#00E5FF'; ctx.font='bold 52px Orbitron';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('PAUSADO', W/2, H/2-20);
  ctx.fillStyle='#78909C'; ctx.font='20px Inter';
  ctx.fillText('ESC para continuar', W/2, H/2+40);
}

function drawGameOver() {
  ctx.fillStyle='rgba(0,0,0,0.82)'; ctx.fillRect(0,0,W,H);
  ctx.save(); ctx.shadowColor='#FF1744'; ctx.shadowBlur=50;
  ctx.fillStyle='#FF5252'; ctx.font='bold 58px Orbitron';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('RECIFE DESTRUÍDO', W/2, H/2-90);
  ctx.restore();
  ctx.fillStyle='#EF9A9A'; ctx.font='20px Inter';
  ctx.fillText('O pH ácido bleached todos os corais...', W/2, H/2-40);
  ctx.fillStyle='#FFFFFF'; ctx.font='bold 26px Orbitron';
  ctx.fillText(`Pontuação: ${score.toLocaleString()}`, W/2, H/2+20);
  ctx.fillStyle='#78909C'; ctx.font='16px Inter';
  ctx.fillText(`Recorde: ${highScore.toLocaleString()}`, W/2, H/2+56);
  const fact = FACTS[Math.floor(Math.random()*FACTS.length)];
  uiPanel(W/2-320, H/2+85, 640, 60, 'rgba(0,0,0,0.6)');
  ctx.fillStyle='#80DEEA'; ctx.font='14px Inter';
  ctx.fillText(fact, W/2, H/2+116);
  ctx.fillStyle='#4DD0E1'; ctx.font='bold 18px Orbitron';
  ctx.fillText('CLIQUE para jogar novamente', W/2, H/2+174);
}

function drawWin() {
  ctx.fillStyle='rgba(0,20,10,0.85)'; ctx.fillRect(0,0,W,H);
  ctx.save(); ctx.shadowColor='#00E676'; ctx.shadowBlur=60;
  ctx.fillStyle='#69F0AE'; ctx.font='bold 56px Orbitron';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('RECIFE SALVO! 🪸', W/2, H/2-80);
  ctx.restore();
  ctx.fillStyle='#C8E6C9'; ctx.font='20px Inter';
  ctx.fillText('Você sobreviveu e manteve o oceano saudável!', W/2, H/2-30);
  ctx.fillStyle='#FFFFFF'; ctx.font='bold 26px Orbitron';
  ctx.fillText(`Pontuação: ${score.toLocaleString()}`, W/2, H/2+30);
  ctx.fillStyle='#4DD0E1'; ctx.font='bold 18px Orbitron';
  ctx.fillText('CLIQUE para jogar novamente', W/2, H/2+120);
}

// ---- TUTORIAL LOGIC ----
function startTutorial() {
  state   = STATE.TUTORIAL;
  tutStep = 0;
  tutAnim = 0;
  initCorals(); initTrees(); initBG();
  // pre-place a bubble for demonstration
  bubbles.length = 0;
  bubbles.push({ x:W/2, y:SEA_TOP+70, r:14, vy:0, vx:0, str:1, ph:0 });
  orbs.length = 0;
  orbs.push({ x:W*0.75, y:H*0.5, r:13, ph:0, vy:0 });
}

function advanceTutorial() {
  if (tutStep < TUTORIAL_STEPS.length - 1) {
    tutStep++; tutAnim = 0;
    beep(523, 0.08); beep(659, 0.08);
  } else {
    state = STATE.MENU;
    beep(784, 0.15);
  }
}

function retreatTutorial() {
  if (tutStep > 0) { tutStep--; tutAnim = 0; beep(440, 0.08); }
}

function drawTutorial() {
  tutAnim++;
  const step = TUTORIAL_STEPS[tutStep];

  // Draw the game world behind
  drawBackground();
  trees.forEach(drawTree);
  drawBgFish();
  corals.forEach(drawCoral);
  drawBubbles();
  drawOrbs();

  // Dark overlay with spotlight cutout
  ctx.save();
  if (step.highlight !== 'full') {
    // Darken everything
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0,0,W,H);
    // Cut spotlight using composite
    ctx.globalCompositeOperation = 'destination-out';
    const grad = ctx.createRadialGradient(step.spotX, step.spotY, step.spotR*0.5, step.spotX, step.spotY, step.spotR);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(step.spotX, step.spotY, step.spotR, 0, Math.PI*2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0,0,W,H);
  }
  ctx.restore();

  // Spotlight ring pulse
  if (step.highlight !== 'full') {
    const pulse = 0.5 + Math.sin(tutAnim*0.06)*0.3;
    ctx.save(); ctx.globalAlpha = pulse;
    ctx.strokeStyle='rgba(0,229,255,0.8)'; ctx.lineWidth=3;
    ctx.setLineDash([8,6]);
    ctx.beginPath(); ctx.arc(step.spotX, step.spotY, step.spotR, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
  }

  // Animated arrow
  if (step.arrow) {
    const bounce = Math.sin(tutAnim*0.1) * 10;
    const ax = step.arrow.x, ay = step.arrow.y + bounce;
    const tx2 = step.arrow.tx, ty2 = step.arrow.ty;
    ctx.save();
    ctx.strokeStyle='#FFD740'; ctx.lineWidth=3;
    ctx.shadowColor='#FFD740'; ctx.shadowBlur=12;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(tx2, ty2); ctx.stroke();
    // Arrowhead
    const ang = Math.atan2(ty2-ay, tx2-ax);
    ctx.fillStyle='#FFD740';
    ctx.beginPath();
    ctx.moveTo(tx2, ty2);
    ctx.lineTo(tx2 - Math.cos(ang-0.4)*18, ty2 - Math.sin(ang-0.4)*18);
    ctx.lineTo(tx2 - Math.cos(ang+0.4)*18, ty2 - Math.sin(ang+0.4)*18);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Info panel
  const panW = 700, panH = 200;
  const panX = W/2 - panW/2;
  const panY = H - panH - 20;

  // Panel bg
  ctx.save();
  ctx.fillStyle='rgba(0,10,30,0.92)';
  ctx.beginPath(); roundedRect(panX, panY, panW, panH, 14); ctx.fill();
  ctx.strokeStyle='rgba(0,229,255,0.35)'; ctx.lineWidth=1.5;
  ctx.beginPath(); roundedRect(panX, panY, panW, panH, 14); ctx.stroke();

  // Step counter dots
  const dotN = TUTORIAL_STEPS.length;
  for (let i=0;i<dotN;i++) {
    ctx.fillStyle = i===tutStep ? '#00E5FF' : 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(panX + panW/2 + (i - dotN/2 + 0.5)*16, panY+16, i===tutStep?5:3, 0, Math.PI*2);
    ctx.fill();
  }

  // Title
  ctx.fillStyle='#00E5FF'; ctx.font='bold 22px Orbitron';
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.shadowColor='#00E5FF'; ctx.shadowBlur=20;
  ctx.fillText(step.title, panX+panW/2, panY+28);
  ctx.shadowBlur=0;

  // Body text (multiline)
  ctx.fillStyle='#B2DFDB'; ctx.font='15px Inter';
  const lines = step.text.split('\n');
  lines.forEach((ln, i) => {
    ctx.fillText(ln, panX+panW/2, panY+66 + i*24);
  });

  // Navigation hint
  ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.font='12px Inter';
  if (tutStep > 0) ctx.fillText('◀ Voltar', panX+70, panY+panH-20);
  ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='13px Inter';
  const nextLbl = tutStep < TUTORIAL_STEPS.length-1 ? '▶ PRÓXIMO  (→ ou Espaço)' : '✅ COMEÇAR A JOGAR!';
  ctx.fillStyle = tutStep === TUTORIAL_STEPS.length-1 ? '#69F0AE' : '#80CBC4';
  ctx.fillText(nextLbl, panX+panW/2, panY+panH-20);

  ctx.restore();

  // ESC hint top
  ctx.fillStyle='rgba(200,200,200,0.3)'; ctx.font='11px Inter';
  ctx.textAlign='center';
  ctx.fillText('ESC – Voltar ao menu', W/2, 18);
}

// ---- GAME FLOW ----
function startGame() {
  state      = STATE.PLAY;
  pH         = 8.20; co2 = 20; score = 0; coralHP = 100;
  level      = 1; wave = 1; waveTimer = 0;
  frameCnt   = 0; t = 0; gameTime = 0;
  combo      = 0; comboTimer = 0; shakeAmt = 0;
  factText   = ''; factTimer = 0;
  parts.length = 0; bubbles.length = 0; orbs.length = 0;
  player.blasts.length = 0; player.x = W/2; player.y = H*0.55;
  initCorals(); initTrees(); initBG();
  showFact();
}

function endGame(win) {
  state = win ? STATE.WIN : STATE.OVER;
  if (score > highScore) { highScore = score; localStorage.setItem('rrf_hs', highScore); }
}

// ---- LEVEL PROGRESSION ----
function tickWave() {
  waveTimer++;
  const waveLen = 1800 - level*100;
  if (waveTimer >= waveLen) {
    waveTimer = 0; wave++;
    if (wave > 5) { level++; wave = 1; }
    if (level > 3 && coralHP >= 30) {
      endGame(true);
    }
    score += 200 * level;
    spawnParts(W/2, H/2, '#FFD740', 20, 5);
  }
}

// ---- MAIN LOOP ----
function update() {
  if (state === STATE.PLAY) {
    t += 1; frameCnt++; gameTime++;
    if (comboTimer > 0) comboTimer--; else combo = 0;
    if (shakeAmt > 0) shakeAmt *= 0.8;
    tickBgFish(); tickPlayer(); tickBubbles(); tickOrbs();
    tickTrees(); tickCorals(); tickParts(); tickWave();
    mouse.clicked = false;
  } else if (state === STATE.MENU || state === STATE.TUTORIAL) {
    t += 0.5; frameCnt++;
    tickBgFish(); tickParts();
  }
  mouse.clicked = false;
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  if (shakeAmt > 0.5) {
    ctx.save();
    ctx.translate((Math.random()-0.5)*shakeAmt, (Math.random()-0.5)*shakeAmt);
  }

  if (state === STATE.MENU) {
    drawMenu();
    if (shakeAmt > 0.5) ctx.restore();
    return;
  }

  if (state === STATE.TUTORIAL) {
    drawTutorial();
    if (shakeAmt > 0.5) ctx.restore();
    return;
  }

  drawBackground();
  trees.forEach(drawTree);
  drawBgFish();
  corals.forEach(drawCoral);
  drawBubbles();
  drawOrbs();
  drawPlayer();
  drawParts();
  drawHUD();

  if (shakeAmt > 0.5) ctx.restore();

  if (state === STATE.PAUSED) drawPauseScreen();
  if (state === STATE.OVER)   drawGameOver();
  if (state === STATE.WIN)    drawWin();
}

// Click handlers for screens
canvas.addEventListener('click', e => {
  const r  = canvas.getBoundingClientRect();
  const sx = r.width  / W, sy = r.height / H;
  const cx = (e.clientX - r.left) / sx;
  const cy = (e.clientY - r.top)  / sy;

  if (state === STATE.MENU) {
    // Check tutorial button click (approx region)
    if (cx > W/2-130 && cx < W/2+130 && cy > H/2+126 && cy < H/2+170) {
      startTutorial(); return;
    }
    startGame(); return;
  }
  if (state === STATE.TUTORIAL) {
    const step   = TUTORIAL_STEPS[tutStep];
    const panX   = W/2 - 350;
    const panY   = H - 220;
    // Back arrow hit test
    if (tutStep > 0 && cx > panX && cx < panX+120 && cy > panY+180 && cy < panY+220) {
      retreatTutorial(); return;
    }
    advanceTutorial(); return;
  }
  if (state === STATE.OVER)  { startGame(); return; }
  if (state === STATE.WIN)   { startGame(); return; }
});

function loop() {
  update(); draw();
  requestAnimationFrame(loop);
}

// Boot
initCorals(); initBG(); initTrees();
loop();
