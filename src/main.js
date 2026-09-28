// Boucle de jeu et écrans.
import { D, loadData } from './data.js';
import { G } from './game/state.js';
import { attachInput } from './input/gestures.js';
import { handleGesture, useSuper, updateSummons } from './game/combat.js';
import { emptyStats } from './game/grades.js';
import { updateEnemies, updateWaves } from './game/enemies.js';
import { attackMult, grantXp } from './game/progress.js';
import { rand } from './util.js';
import { draw } from './ui/hud.js';
import { prepareCombatArt, paintBackground } from './ui/combat-art.js';
import { setupHud } from './ui/combat-hud.js';
import { resetAnims } from './ui/anim.js';
import { initLobby, showLobby, hideLobby, showResults, activeCharacter } from './ui/lobby.js';
import { initStory, openStory, maybePrologue } from './story/story.js';
import { voyageBattle } from './game/voyage.js';
import { showTransition, hideTransition } from './ui/voyage-ui.js';
import { initAudio, sfx, music, placeMusic, traceStart, traceStop } from './audio/audio.js';

const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d');
let dpr = 1, curChar = null, curBattle = null;

/** Décor de repos (lobby, entraînement) : la Forêt de Mousse, sans vagues. */
const idleBattle = () => ({ waves: [], types: {}, art: [], timeLimit: 0, label: 'Vague', lieu: null, bg: null });

/** Le Voyage (Solo infini) : à chaque arène, nouveau décor puis écran de transition. */
const newVoyage = () => voyageBattle({
  onStage: info => {
    paintBackground($('bg'), G.W, G.H, dpr, G.battle.lieu, G.battle.bg).catch(() => {});
    music(placeMusic(info.id));
    sfx('nouvelle_arene');
    return showTransition(info);
  }
});

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  G.W = innerWidth; G.H = innerHeight;
  cv.width = Math.round(G.W * dpr); cv.height = Math.round(G.H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  G.safeTop = $('safe').offsetHeight || 0;
  if (D.enemies) prepareArt(curChar || activeCharacter(), curBattle || idleBattle()).catch(() => {});
}

/** Décor (lieu du combat en Histoire) et sprites, préparés à la taille de l'écran (voir ui/combat-art.js). */
function prepareArt(c, battle) {
  paintBackground($('bg'), G.W, G.H, dpr, battle.lieu, battle.bg).catch(() => {});
  return prepareCombatArt(c.id, G.W, G.H, dpr, Object.values(D.enemies).map(e => e.sprite), battle.art);
}

/* ---------- Partie ---------- */
function resetGame(c, battle) {
  G.charId = c.id;
  G.battle = battle;
  G.atkMult = attackMult(c.id);
  const P = c.passive || {};
  G.hero = {
    hp: c.hp, max: c.hp, atk: c.attack, shieldUntil: -1, shieldAvoid: 0, flash: 0, col: c.accent || c.color,
    // Passifs (data/characters.json) : pas de combo, combo plus court, esquive de base, soin par attaque.
    noCombo: !!P.noCombo, comboLength: P.comboLength || D.grades.comboLength,
    dodgeBase: P.dodgeBase ?? D.rules.dodge.base, healPerHit: P.healPerHit || 0,
    super: c.super, gauge: 0, sp: null, summon: P.summon || null
  };
  Object.assign(G, {
    enemies: [], loots: [], summons: [], fx: [], pops: [], trails: [],
    time: 0, waveIdx: 0, waveDelay: D.waves.firstWaveDelay, score: 0, scoreMult: 1, paused: false, voyage: null, shake: 0, bigGrade: null, superBanner: null, trainSpawn: 0,
    streak: { name: null, n: 0 }, combos: 0, globalGap: 0, stats: emptyStats()
  });
}

function update(dt) {
  for (const a of [G.fx, G.pops, G.trails]) {
    for (const o of a) o.t += dt;
    for (let i = a.length - 1; i >= 0; i--) if (a[i].t >= a[i].life) a.splice(i, 1);
  }
  if (G.bigGrade) { G.bigGrade.t += dt; if (G.bigGrade.t > 1.1) G.bigGrade = null; }
  if (G.superBanner) { G.superBanner.t += dt; if (G.superBanner.t > 1.6) G.superBanner = null; }
  G.shake = Math.max(0, G.shake - dt * 2);
  G.hero.flash = Math.max(0, G.hero.flash - dt * 3);
  for (const l of G.loots) { l.t += dt; l.life -= dt; }
  G.loots = G.loots.filter(l => l.life > 0);

  if (G.paused) return;                       // Voyage : écran de transition d'arène
  if (G.mode === 'play' || G.mode === 'train') updateSummons(dt);
  if (G.mode === 'train') { updateTraining(dt); return; }
  if (G.mode !== 'play') return;
  G.time += dt;
  if (G.battle.timeLimit && G.time >= G.battle.timeLimit) return endGame('time');
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
  if (G.mode === 'play' || G.mode === 'train') draw(ctx, dt);
  // Son de tracé : en boucle tant que le doigt trace (pas pour un simple tap), coupé au relâchement.
  if (G.drawing && G.drawing.pts.length > 3 && (G.mode === 'play' || G.mode === 'train')) traceStart(); else traceStop();
  if (G.trainMsg !== shownMsg) { shownMsg = G.trainMsg; $('trainPanel').textContent = shownMsg; }
  requestAnimationFrame(loop);
}

/* ---------- Écrans ---------- */
const TRAIL_COL = { triangle: '#FF5A3C', circle: '#3DDC5B' };

function onGesture(res, pts) {
  if (res.type !== 'tap') G.trails.push({ pts, t: 0, life: 0.6, col: TRAIL_COL[res.type] || '#B7C3CE' });
  handleGesture(res);
}

/** En partie : lobby masqué, interface de combat visible. */
function setInGame(on) {
  document.documentElement.classList.toggle('in-game', on);
  $('hud').classList.toggle('hidden', !on);
  $('hud').classList.toggle('train', G.mode === 'train');
  if (on) hideLobby(); else showLobby();
}

function toLobby() {
  const b = G.battle;
  G.mode = 'menu';
  setInGame(false);
  curChar = null; curBattle = null;
  hideTransition();
  traceStop();
  if (b && b.onQuit) b.onQuit();          // Histoire : « Quitter » ramène au chemin des combats
  else music('musique_lobby');
}

let starting = false;
/** opts.char : héros imposé (Histoire), sinon celui du lobby ; opts.battle : combat, sinon le Voyage. */
async function start(mode, opts = {}) {
  if (starting) return;
  starting = true;
  const c = opts.char || activeCharacter();
  let battle = opts.battle || idleBattle();
  if (mode === 'play' && !opts.battle) { try { battle = await newVoyage(); } catch (e) { starting = false; throw e; } }
  curChar = c; curBattle = battle;
  try { await prepareArt(c, battle); } catch (_) { /* sans sprites, le combat reste jouable */ }
  starting = false;
  resetGame(c, battle);
  resetAnims(c.id);
  setupHud(c);
  G.mode = mode;
  setInGame(true);
  if (mode === 'train') music('musique_tuto');
  if (mode === 'train') G.trainMsg = 'Tracez des triangles et des ronds, tapez sur les objets. La précision s’affiche à chaque geste.';
}

function endGame(why) {
  if (G.mode !== 'play') return;
  G.mode = 'end';
  const { gain, before, after, record } = grantXp(G.score, G.charId, !G.battle.onEnd);
  $('hud').classList.add('hidden');
  document.documentElement.classList.remove('in-game');
  const b = G.battle;
  curChar = null; curBattle = null;
  traceStop();
  if (b.onEnd) { showLobby(); b.onEnd(why, { gain, levelUp: after > before, score: G.score }); return; }
  sfx(why === 'win' ? 'victoire' : 'defaite');
  music('musique_lobby');
  showResults({ why, score: G.score, time: G.time, gain, levelUp: after > before, record, stats: G.stats, combos: G.combos, voyage: G.voyage });
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
  initAudio();                             // effets chargés maintenant, musiques à la demande
  attachInput(cv, {
    isActive: () => G.mode === 'play' || G.mode === 'train',
    onDraw: d => { G.drawing = d; },
    onGesture
  });
  initLobby({ solo: () => start('play'), train: () => start('train'), again: () => start('play'), story: openStory });
  initStory({ startBattle: opts => start('play', opts), toLobby: showLobby });
  $('quit').onclick = () => { sfx('ui_clic'); toLobby(); };
  // Bouton de super : réagit dès l'appui, et l'appui n'atteint jamais le canvas (pas de tap ni de tracé).
  $('superBtn').addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    if (G.mode === 'play' || G.mode === 'train') useSuper();
  });
  resetGame(activeCharacter(), idleBattle());
  toLobby();
  // Sprites préparés juste après le premier affichage du lobby, pour ne pas le retarder.
  setTimeout(() => prepareArt(activeCharacter(), idleBattle()).catch(() => {}), 50);
  if (document.fonts) document.fonts.load('60px Caprasimo').catch(() => {});
  window.__tsReady = true;
  requestAnimationFrame(loop);
  maybePrologue();
}

init();
