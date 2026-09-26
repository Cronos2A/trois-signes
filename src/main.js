// Boucle de jeu et écrans.
import { D, loadData } from './data.js';
import { G } from './game/state.js';
import { attachInput } from './input/gestures.js';
import { handleGesture } from './game/combat.js';
import { emptyStats } from './game/grades.js';
import { updateEnemies, updateWaves } from './game/enemies.js';
import { attackMult, grantXp } from './game/progress.js';
import { rand } from './util.js';
import { draw } from './ui/hud.js';
import { initLobby, showLobby, hideLobby, showResults } from './ui/lobby.js';

const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d');

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  G.W = innerWidth; G.H = innerHeight;
  cv.width = Math.round(G.W * dpr); cv.height = Math.round(G.H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  G.safeTop = $('safe').offsetHeight || 0;
}

/* ---------- Partie ---------- */
function resetGame() {
  const C = D.characters.characters[0];
  G.atkMult = attackMult();
  G.hero = { hp: C.hp, max: C.hp, atk: C.attack, shieldUntil: -1, shieldAvoid: 0, flash: 0 };
  Object.assign(G, {
    enemies: [], loots: [], fx: [], pops: [], trails: [],
    time: 0, waveIdx: 0, waveDelay: D.waves.firstWaveDelay, score: 0, shake: 0, bigGrade: null, trainSpawn: 0,
    streak: { name: null, n: 0 }, combos: 0, globalGap: 0, stats: emptyStats()
  });
}

function update(dt) {
  for (const a of [G.fx, G.pops, G.trails]) {
    for (const o of a) o.t += dt;
    for (let i = a.length - 1; i >= 0; i--) if (a[i].t >= a[i].life) a.splice(i, 1);
  }
  if (G.bigGrade) { G.bigGrade.t += dt; if (G.bigGrade.t > 1.1) G.bigGrade = null; }
  G.shake = Math.max(0, G.shake - dt * 2);
  G.hero.flash = Math.max(0, G.hero.flash - dt * 3);
  for (const l of G.loots) { l.t += dt; l.life -= dt; }
  G.loots = G.loots.filter(l => l.life > 0);

  if (G.mode === 'train') { updateTraining(dt); return; }
  if (G.mode !== 'play') return;
  G.time += dt;
  if (G.time >= D.waves.timeLimit) return endGame('time');
  updateEnemies(dt);
  if (updateWaves(dt)) return endGame('win');
  if (G.hero.hp <= 0) return endGame('ko');
}

function updateTraining(dt) {
  const T = D.rules.training;
  G.time += dt;
  G.trainSpawn -= dt;
  if (G.trainSpawn <= 0 && G.loots.length < T.maxLoot) {
    G.loots.push({ x: rand(50, G.W - 50), y: rand(G.H * 0.25, G.H * 0.6), type: Math.random() < 0.5 ? 'coin' : 'heart', life: T.lootLife, t: 0 });
    G.trainSpawn = T.lootInterval;
  }
}

let last = performance.now(), shownMsg = null;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw(ctx);
  if (G.trainMsg !== shownMsg) { shownMsg = G.trainMsg; $('trainPanel').textContent = shownMsg; }
  requestAnimationFrame(loop);
}

/* ---------- Écrans ---------- */
const TRAIL_COL = { triangle: '#FF5D73', circle: '#3FD7C4' };

function onGesture(res, pts) {
  if (res.type !== 'tap') G.trails.push({ pts, t: 0, life: 0.6, col: TRAIL_COL[res.type] || '#8A84B0' });
  handleGesture(res);
}

/** En partie : lobby masqué, bouton Quitter visible. */
function setInGame(on) {
  $('quit').classList.toggle('hidden', !on);
  $('trainPanel').classList.toggle('hidden', G.mode !== 'train');
  if (on) hideLobby(); else showLobby();
}

function toLobby() { G.mode = 'menu'; setInGame(false); }

function start(mode) {
  resetGame();
  G.mode = mode;
  setInGame(true);
  if (mode === 'train') G.trainMsg = 'Tracez des triangles et des ronds, tapez sur les objets. La précision s’affiche à chaque geste.';
}

function endGame(why) {
  if (G.mode !== 'play') return;
  G.mode = 'end';
  const { gain, before, after, record } = grantXp(G.score);
  $('quit').classList.add('hidden');
  showResults({ why, score: G.score, time: G.time, gain, levelUp: after > before, record, stats: G.stats, combos: G.combos });
}

/* ---------- Démarrage ---------- */
async function init() {
  addEventListener('resize', resize);
  resize();
  try {
    await loadData();
  } catch (err) {
    $('loadErr').textContent = 'Impossible de charger les données du jeu (' + err.message + ').';
    $('loadErr').classList.remove('hidden');
    return;
  }
  attachInput(cv, {
    isActive: () => G.mode === 'play' || G.mode === 'train',
    onDraw: d => { G.drawing = d; },
    onGesture
  });
  initLobby({ solo: () => start('play'), train: () => start('train'), again: () => start('play') });
  $('quit').onclick = toLobby;
  resetGame();
  toLobby();
  window.__tsReady = true;
  requestAnimationFrame(loop);
}

init();
