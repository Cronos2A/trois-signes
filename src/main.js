// Boucle de jeu et écrans.
import { D, loadData } from './data.js';
import { G } from './game/state.js';
import { attachInput } from './input/gestures.js';
import { handleGesture, useSuper, updateSummons } from './game/combat.js';
import { emptyStats } from './game/grades.js';
import { updateEnemies, updateWaves } from './game/enemies.js';
import { levelBonuses, grantXp, voyageXp, migrateProgress, prog, replaceProg, resetProg, saveState, saveProg } from './game/progress.js';
import { weaponBonuses, grantWeaponXp, equippedWeapon, startWeapon } from './game/weapons.js';
import { talismanEffect } from './game/talismans.js';
import { syncRewards } from './game/rewards.js';
import { coinGold, arenaGold, voyageEndGold, addGold, syncGems } from './game/economy.js';
import { look } from './game/cosmetics.js';
import { combatLook } from './ui/looks.js';
import { showCover, hideCover } from './ui/cover.js';
import { initAds, tickPlay, flushPlay, noteVoyageEnd, showRewarded } from './ads/ads.js';
import { askChoice, adToast } from './ui/ad-ui.js';
import { showRewards } from './ui/reward-ui.js';
import { rand } from './util.js';
import { pop } from './game/effects.js';
import { draw } from './ui/hud.js';
import { prepareCombatArt, paintBackground } from './ui/combat-art.js';
import { setupHud } from './ui/combat-hud.js';
import { resetAnims } from './ui/anim.js';
import { initLobby, showLobby, hideLobby, showResults, activeCharacter, refreshLobby } from './ui/lobby.js';
import { initOnline, remoteSave, flushNow } from './online/online.js';
import { syncBoard, startRun } from './online/leaderboard.js';
import { initWallet } from './online/wallet.js';
import { serverPrints } from './online/ranked.js';
import { onOnlineChange } from './online/online.js';
import { openRanking } from './ui/ranking-ui.js';
import { initBack } from './ui/back.js';
import { initOrientation } from './ui/orient.js';
import { ensurePseudo, askDamagedSave } from './ui/account-ui.js';
import { initStory, openStory, maybePrologue } from './story/story.js';
import { voyageBattle } from './game/voyage.js';
import { initTutorial, startTutorial } from './game/tutorial.js';
import { initDuel, startDuel } from './game/duel.js';
import { openDuel, hideDuelUi } from './ui/duel-ui.js';
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
    paintBackground($('bg'), G.W, G.H, dpr, info.lieu, info.bg).catch(() => {});   // décor de l'arène annoncée
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
  return Promise.all([paintBackground($('bg'), G.W, G.H, dpr, battle.lieu, battle.bg).catch(() => {}), prepareCombatArt(c.id, G.W, G.H, dpr, Object.values(D.enemies).map(e => e.sprite), battle.art, battle.tutorial ? null : combatLook(c.id))]);
}

/* ---------- Partie ---------- */
function resetGame(c, battle) {
  G.charId = c.id;
  G.battle = battle;
  // Arme équipée (data/weapons.json) et talisman (data/talismans.json) ; en Duel, bonus neutralisés selon les données.
  // La leçon garde l'arme de départ, sans talisman.
  const duel = !!battle.duel, wid = battle.tutorial ? startWeapon(c.id) : equippedWeapon(c.id);
  const Wb = weaponBonuses(wid, duel);
  G.weapon = { ...Wb, gain: 0 };
  G.talisman = battle.tutorial ? {} : talismanEffect(c.id, duel);
  G.trailStyle = battle.tutorial ? null : look(c.id).trail;          // tracé cosmétique (la leçon garde le tracé d'origine)
  const Lb = levelBonuses(c.id, duel);                 // niveau du héros (data/progression.json)
  G.atkMult = Lb.atk * Wb.atk;
  const P = c.passive || {};
  G.hero = {
    hp: Math.round(c.hp * Lb.hp), max: Math.round(c.hp * Lb.hp), atk: c.attack, shieldUntil: -1, shieldAvoid: 0, flash: 0, col: c.accent || c.color,
    // Passifs (data/characters.json) : pas de combo, combo plus court, esquive de base, soin par attaque.
    noCombo: !!P.noCombo, comboLength: P.comboLength || D.grades.comboLength,
    dodgeBase: P.dodgeBase ?? D.rules.dodge.base, healPerHit: P.healPerHit || 0,
    super: c.super, gauge: (G.talisman.gaugeStart || 0) * D.characters.superGauge.max, sp: null,   // Plume de vent
    barrier: 0, dodgeBonus: 0, shieldGrade: null, summon: P.summon || null
  };
  Object.assign(G, {
    enemies: [], loots: [], summons: [], fx: [], pops: [], trails: [],
    time: 0, waveIdx: 0, waveDelay: D.waves.firstWaveDelay, score: 0, scoreMult: 1, paused: false, voyage: null, listen: null, tuto: null, shake: 0, bigGrade: null, superBanner: null, trainSpawn: 0,
    streak: { name: null, n: 0 }, secondChances: 0, coins: 0, goldGain: 0, gemGains: [], paid: { rounds: 0, coins: 0, arenas: 0 }, roundsCleared: 0, guardiansBeaten: 0, missForgiven: 0, combos: 0, globalGap: 0, stats: emptyStats()
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

  if (G.paused) return;                       // Voyage : écran de transition d'arène (ou choix « Seconde chance »)
  if (G.mode === 'play' || G.mode === 'train') { updateSummons(dt); tickPlay(dt); }   // temps de jeu (pubs plein écran)
  if (G.mode === 'train') { updateTraining(dt); return; }
  if (G.mode !== 'play') return;
  G.time += dt;
  if (G.battle.update) G.battle.update(dt);               // Duel : temps limite de la vague, interface
  if (G.battle.tutorial) { updateEnemies(dt); return; }   // leçon : mannequin seul, déroulé dans game/tutorial.js
  if (G.battle.timeLimit && G.time >= G.battle.timeLimit) return endGame('time');
  updateEnemies(dt);
  const won = updateWaves(dt);
  if (G.roundsCleared > G.paid.rounds) payRounds();         // or et gemmes versés dès qu'un round est terminé
  if (won) return endGame('win');
  if (G.hero.hp <= 0) return koOrSecondChance();
}

/**
 * Gains versés round par round (Voyage et Histoire), acquis même si le joueur quitte ensuite :
 * pièces ramassées, arènes traversées (Voyage), gemmes des gardiens battus pour la première fois.
 * all : fin de partie normale, on verse aussi les pièces du round en cours.
 */
function payRounds(all = false) {
  const b = G.battle, P = G.paid;
  if (!b || (b.xpMode !== 'voyage' && b.xpMode !== 'story') || b.duel) return;
  let gold = coinGold(G.coins - P.coins);
  P.coins = G.coins;
  if (b.xpMode === 'voyage') {
    const arenas = Math.min(Math.floor(G.roundsCleared / D.voyage.roundsPerArena), D.voyage.arenas.length);
    gold += arenaGold(arenas - P.arenas);
    P.arenas = arenas;
    G.gemGains.push(...syncGems());
  }
  P.rounds = G.roundsCleared;
  if (gold > 0) {
    addGold(gold);
    G.goldGain += gold;
    if (!all) pop(G.W / 2, G.H * 0.3, '+' + gold + ' or', '', '#FFD23F', 1.2, 24);
  }
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
  flushPlay();                              // temps de jeu (pubs plein écran)
  const gems = G.gemGains || [];             // abandon : l'or et les gemmes des rounds terminés restent acquis
  G.mode = 'menu';
  setInGame(false);
  curChar = null; curBattle = null;
  hideTransition();
  hideCover();
  traceStop();
  if (b && b.onQuit) b.onQuit();          // Histoire : « Quitter » ramène au chemin des combats
  else music('musique_lobby');
  if (gems.length || (b && b.xpMode === 'voyage')) showRewards([...syncRewards(), ...gems]);   // talisman, gemmes déjà versées
  if (pendingRemote) { const d = pendingRemote; pendingRemote = null; applyRemote(d); }
  if (window.__tsReady) ensurePseudo();    // fin de la première leçon : le joueur choisit son pseudo
}

/* ---------- Sauvegarde en ligne (online/online.js) ---------- */
// Sauvegarde du serveur plus récente que celle de l'appareil : elle remplace la progression, jamais en pleine partie.
let pendingRemote = null;
function applyRemote(data) {
  if (G.mode === 'play' || G.mode === 'train' || starting) { pendingRemote = data; return; }
  if (!replaceProg(data)) return;         // sauvegarde du serveur elle-même endommagée : ignorée
  migrateProgress();
  refreshLobby();
}

let starting = false;
/** opts.char : héros imposé (Histoire), sinon celui du lobby ; opts.battle : combat, sinon le Voyage. */
// Ordre d'un lancement : écran de lancement (le lobby disparaît) → annonce de la partie (battle.intro : transition d'arène
// du Voyage, souvenir de la leçon), pendant que sprites et décor se préparent → seulement ensuite l'arène et le combat.
async function start(mode, opts = {}) {
  if (starting) return;
  starting = true;
  showCover();
  const c = opts.char || activeCharacter();
  let battle = opts.battle || idleBattle();
  if (mode === 'play' && !opts.battle) { try { battle = await newVoyage(); } catch (e) { starting = false; hideCover(); throw e; } }
  curChar = c; curBattle = battle;
  if (battle.xpMode === 'voyage') startRun();                        // record du Voyage : durée de la partie notée au serveur
  if (mode === 'play' && !battle.tutorial) { prog.played = prog.played || {}; prog.played[c.id] = (prog.played[c.id] || 0) + 1; }   // héros favori (classements)
  const intro = battle.intro ? battle.intro() : null;               // l'annonce d'abord (elle fixe aussi le décor)
  try { await prepareArt(c, battle); } catch (_) { /* sans sprites, le combat reste jouable */ }
  if (intro) await intro;
  starting = false;
  resetGame(c, battle);
  resetAnims(c.id);
  setupHud(c);
  G.mode = mode;
  setInGame(true);
  hideCover();
  if (mode === 'train') music('musique_tuto');
  if (mode === 'train') G.trainMsg = 'Tracez des triangles et des ronds, tapez sur les objets. La précision s’affiche à chaque geste.';
}

/**
 * KO dans le Voyage : proposer « Seconde chance » (pub récompensée, data/ads.json → rewarded.secondChance), une fois par partie.
 * Jamais en Duel, dans la leçon ou en Histoire. Sinon, fin de partie.
 */
async function koOrSecondChance() {
  const R = D.ads.rewarded.secondChance, b = G.battle, U = D.ads.ui;
  if (b.xpMode !== 'voyage' || b.duel || G.secondChances >= R.perGame) return endGame('ko');
  G.paused = true;
  const yes = await askChoice(U.secondTitle, U.secondText.replace('{pct}', Math.round(R.hp * 100)), U.secondYes, U.secondNo);
  const ok = yes && await showRewarded({ duel: b.duel });
  if (G.battle !== b || G.mode !== 'play') return;          // partie quittée entre-temps
  if (!ok) { if (yes) adToast(U.rewardLost); G.paused = false; return endGame('ko'); }
  G.secondChances++;
  G.hero.hp = Math.round(G.hero.max * R.hp);
  G.hero.shieldUntil = G.time + R.graceSeconds; G.hero.shieldAvoid = 1;   // un court répit pour se remettre en garde
  G.paused = false;
}

function endGame(why) {
  if (G.mode !== 'play') return;
  G.mode = 'end';
  // XP du héros : le Voyage compte les rounds terminés et les gardiens vaincus ; l'Histoire donne la sienne après la victoire.
  const xp = G.battle.xpMode === 'voyage' ? voyageXp(G.roundsCleared, G.guardiansBeaten) : 0;
  const { gain, before, after, max, record } = grantXp(G.charId, xp, G.score, !G.battle.onEnd);
  const weapon = grantWeaponXp();
  // Or : le Voyage le donne ici (base, arènes traversées, record, pièces) ; l'Histoire après le combat (story.js).
  // Or : déjà versé round par round ; en fin normale, les pièces du round en cours et le bonus de fin (Voyage : base + record ;
  // Histoire : bonus de victoire, dans story.js). Un abandon (toLobby) ne passe pas par ici.
  payRounds(true);
  const bonus = G.battle.xpMode === 'voyage' ? voyageEndGold(record) : 0;
  if (bonus) addGold(bonus);
  const goldGain = G.goldGain + bonus;
  $('hud').classList.add('hidden');
  document.documentElement.classList.remove('in-game');
  const b = G.battle;
  curChar = null; curBattle = null;
  traceStop();
  if (G.battle.xpMode === 'voyage') noteVoyageEnd(b); else flushPlay();   // pubs : partie comptée, temps de jeu
  if (b.onEnd) { showLobby(); b.onEnd(why, { gain, levelUp: after > before, score: G.score, weapon, gold: G.goldGain }); return; }
  sfx(why === 'win' ? 'victoire' : 'defaite');
  music('musique_lobby');
  showResults({ why, score: G.score, time: G.time, gain, levelUp: after > before, max, record, stats: G.stats, combos: G.combos, voyage: G.voyage, weapon, gold: goldGain });
  showRewards([...syncRewards(), ...G.gemGains, ...syncGems()]);   // talisman et gemmes (déjà versées) d'un gardien battu
}

/** Fin ou sortie du Duel (ui/duel-ui.js) : retour au lobby. */
function duelHome() {
  hideDuelUi();
  G.mode = 'menu';
  setInGame(false);
  music('musique_lobby');
  if (pendingRemote) { const d = pendingRemote; pendingRemote = null; applyRemote(d); }
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
  migrateProgress();                       // anciennes sauvegardes : niveau gardé, XP dans le niveau à zéro
  initOnline({ applyRemote, afterUpload: syncBoard });   // + classements (online/leaderboard.js)
  initWallet({ changed: refreshLobby });                   // gemmes : le portefeuille du serveur fait foi (online/wallet.js)
  { let was = false; onOnlineChange(s => { if (s.state === 'online' && !was) serverPrints().then(refreshLobby, () => {}); was = s.state === 'online'; }); }   // Empreintes du serveur             // compte anonyme + sauvegarde en ligne, en arrière-plan (data/online.json)
  initAds();                               // AdMob + consentement dans l'application ; rien sur le web
  initAudio();                             // effets chargés maintenant, musiques à la demande
  attachInput(cv, {
    isActive: () => G.mode === 'play' || G.mode === 'train',
    onDraw: d => { G.drawing = d; },
    onGesture
  });
  initLobby({ solo: () => start('play'), train: () => start('train'), again: () => start('play'), story: openStory, lesson: startTutorial, ranks: openRanking,
    duel: () => { openDuel({ start: (room, char) => startDuel(room, char), back: duelHome }); } });
  initDuel({ startBattle: opts => start('play', opts), end: why => endGame(why), home: duelHome, quit: toLobby });
  initTutorial({ startBattle: opts => start('play', opts), quit: toLobby });
  initStory({ startBattle: opts => start('play', opts), toLobby: showLobby });
  $('quit').onclick = () => { sfx('ui_clic'); toLobby(); };
  initBack();                              // bouton Retour du téléphone (ui/back.js)
  initOrientation();                       // portrait seulement (ui/orient.js)
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
  // Sauvegarde de l'appareil endommagée : le jeu a démarré sur une progression neuve ; le joueur choisit
  // de récupérer sa sauvegarde en ligne ou de repartir à zéro (rien n'est écrit ni envoyé avant ce choix).
  if (saveState.damaged) {
    await askDamagedSave({
      remote: remoteSave,
      recover: data => { saveState.damaged = false; replaceProg(data); migrateProgress(); saveProg(); refreshLobby(); },
      reset: () => { resetProg(); flushNow().catch(() => {}); refreshLobby(); }
    });
  }
  // Premier démarrage : prologue, puis la première leçon.
  // Sinon : récompenses déjà méritées et pas encore reçues (sauvegardes d'avant les armes alternatives et talismans).
  maybePrologue().then(first => {
    if (first && !prog.tutorial) return startTutorial();
    return showRewards([...syncRewards(), ...syncGems()]).then(showLobby).then(ensurePseudo);
  });
}

init();
