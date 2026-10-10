// Boucle de jeu et écrans.
import { confirmQuit, duelInfo } from './ui/quit-confirm.js';
import { koFx, victoryFx, endPanel, resetEnd, updateEnd, timeScale, noteFrame, lastKillSlow } from './ui/end-seq.js';
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
import { initAds, tickPlay, flushPlay, noteVoyageEnd, showRewarded, adsReady } from './ads/ads.js';
import { askChoice, adToast } from './ui/ad-ui.js';
import { showRewards } from './ui/reward-ui.js';
import { rand } from './util.js';
import { pop } from './game/effects.js';
import { draw, heroBody } from './ui/hud.js';
import { prepareCombatArt, paintBackground } from './ui/combat-art.js';
import { setupHud } from './ui/combat-hud.js';
import { resetAnims } from './ui/anim.js';
import { initLobby, showLobby, hideLobby, showResults, activeCharacter, refreshLobby } from './ui/lobby.js';
import { initOnline, remoteSave, flushNow, whenOnline, syncLater } from './online/online.js';
import { syncBoard, startRun } from './online/leaderboard.js';
import { initWallet } from './online/wallet.js';
import { serverPrints } from './online/ranked.js';
import { onOnlineChange } from './online/online.js';
import { openRanking } from './ui/ranking-ui.js';
import { initBack, setLeave, onBack } from './ui/back.js';
import { initNative, hideSplash } from './native.js';
import { loadingProgress, loadingTip, loadingFonts, loadingReady, loadingFade, dropLoading, loadingTransition, transitioning } from './ui/loading.js';
import { preloadAudio } from './audio/audio.js';
import { initOrientation } from './ui/orient.js';
import { ensurePseudo, askDamagedSave } from './ui/account-ui.js';
import { initStory, openStory, maybePrologue, replayStoryEnd } from './story/story.js';
import { voyageBattle } from './game/voyage.js';
import { initTutorial, startTutorial } from './game/tutorial.js';
import { initDuel, startDuel, resumeDuel, duelSaved } from './game/duel.js';
import { openDuel, hideDuelUi } from './ui/duel-ui.js';
import { showTransition, hideTransition } from './ui/voyage-ui.js';
import { initAudio, sfx, music, placeMusic, traceStart, traceStop, fadeOutMusic } from './audio/audio.js';
import { tr, nf, loadI18n, applyLanguageData, applyStatic } from './i18n.js';
import { startBoosts, boostMult, countBoostGame, boostable, offerable } from './game/boosts.js';
import { initDaily, enableDaily, maybeDaily, offerBoosts } from './ui/daily-ui.js';

const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d');
let dpr = 1, curChar = null, curBattle = null;

/** Décor de repos (lobby, entraînement) : la Forêt de Mousse, sans vagues. */
const idleBattle = () => ({ waves: [], types: {}, art: [], timeLimit: 0, label: tr('battle.wave'), lieu: null, bg: null });

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
    dodgeBase: P.dodgeBase ?? D.rules.dodge.base, healPerHit: P.healPerHit || 0, damageTaken: P.damageTaken ?? 1,   // Garde d'Aldric
    super: c.super, gauge: (G.talisman.gaugeStart || 0) * D.characters.superGauge.max, sp: null,   // Plume de vent
    barrier: 0, dodgeBonus: 0, shieldGrade: null, summon: P.summon || null
  };
  Object.assign(G, {
    enemies: [], loots: [], summons: [], fx: [], pops: [], trails: [],
    time: 0, waveIdx: 0, waveDelay: D.waves.firstWaveDelay, score: 0, scoreMult: 1, paused: false, voyage: null, listen: null, tuto: null, shake: 0, bigGrade: null, superBanner: null, trainSpawn: 0,
    streak: { name: null, n: 0 }, lastKill: false, secondChances: 0, coins: 0, goldGain: 0, gemGains: [], paid: { rounds: 0, coins: 0, arenas: 0 }, roundsCleared: 0, guardiansBeaten: 0, missForgiven: 0, combos: 0, globalGap: 0, stats: emptyStats()
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
  // Histoire : ralenti sur la dernière mort d'ennemi du combat (data/fin_de_partie.json → victory).
  if (G.battle.xpMode === 'story' && !G.lastKill && !G.enemies.length && G.waveIdx >= G.battle.waves.length && G.hero.hp > 0) { G.lastKill = true; lastKillSlow(); }
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
  let gold = coinGold(G.coins - P.coins) * boostMult('gold');   // boost or ×2 (game/boosts.js)
  P.coins = G.coins;
  if (b.xpMode === 'voyage') {
    const arenas = Math.min(Math.floor(G.roundsCleared / D.voyage.roundsPerArena), D.voyage.arenas.length);
    gold += arenaGold(arenas - P.arenas) * boostMult('gold');
    P.arenas = arenas;
    G.gemGains.push(...syncGems());
  }
  P.rounds = G.roundsCleared;
  if (gold > 0) {
    addGold(gold);
    G.goldGain += gold;
    if (!all) pop(G.W / 2, G.H * 0.3, tr('units.goldGain', { n: nf(gold) }), '', '#FFD23F', 1.2, 24);
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
  const real = Math.min(0.05, (now - last) / 1000);
  if (G.mode === 'play' || G.mode === 'ending') noteFrame(now - last);   // images trop lentes : moins de facettes
  last = now;
  updateEnd(real);                                         // séquence de fin (temps réel)
  const dt = real * timeScale();                           // ralenti de fin de partie
  update(dt);
  if (G.mode === 'play' || G.mode === 'train' || G.mode === 'ending') draw(ctx, dt);
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
  document.documentElement.classList.toggle('duel-live', on && !!(G.battle && G.battle.duel));   // Duel : pas de « Quitter »
  if (!on) document.documentElement.classList.remove('ending');
  $('hud').classList.toggle('hidden', !on);
  $('hud').classList.toggle('train', G.mode === 'train');
  if (on) hideLobby(); else showLobby();
}

/**
 * « Quitter » (bouton de l'écran, bouton Retour) : toujours la même confirmation (ui/quit-confirm.js).
 * Duel en cours (combat, attente, KO) : on ne le quitte pas ; information seulement. Séquence de fin : rien.
 */
function askLeave() {
  const b0 = G.battle;
  if (G.mode === 'ending' && !document.querySelector('#duel.wait')) return Promise.resolve(false);
  if (b0 && b0.duel && (G.mode === 'play' || G.mode === 'ending' || document.querySelector('#duel.wait'))) return duelInfo().then(() => false);
  if (transitioning()) return Promise.resolve(false);
  const here = () => G.battle === b0 && (document.documentElement.classList.contains('in-game') || document.querySelector('#duel.wait'));
  return confirmQuit().then(q => {
    // Partie finie pendant la question (fin de vague, KO, victoire) : on ne quitte plus rien.
    if (!q || !here() || transitioning()) return false;
    // Écran de chargement (ui/loading.js) : la musique de la partie s'éteint en fondu, le combat reste figé dessous, puis le lobby.
    G.paused = true;
    loadingTransition(() => { if (here()) toLobby(); });
    return q;
  });
}

/** Retour au lobby ; quiet : sans lancer la musique du lobby (premier lancement : le prologue vient ensuite). */
function toLobby(quiet) {
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
  else if (!quiet) music('musique_lobby');
  // Boosts : un abandon compte comme une partie s'il vient après au moins un round terminé.
  if (b && G.roundsCleared >= 1) countBoostGame();
  const shown = gems.length || (b && b.xpMode === 'voyage') ? showRewards([...syncRewards(), ...gems]) : null;   // talisman, gemmes déjà versées
  if (pendingRemote) { const d = pendingRemote; pendingRemote = null; applyRemote(d); }
  const named = window.__tsReady ? ensurePseudo() : null;   // fin de la première leçon : le joueur choisit son pseudo
  Promise.all([shown, named]).then(() => maybeDaily());     // récompenses de connexion : fenêtre du jour, s'il y a lieu
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
  resetEnd();
  if (!opts.loader) showCover();                                       // Entraînement : sous l'écran de chargement (initLobby)
  const c = opts.char || activeCharacter();
  let battle = opts.battle || idleBattle();
  if (mode === 'play' && !opts.battle) { try { battle = await newVoyage(); } catch (e) { starting = false; hideCover(); throw e; } }
  // Boosts en stock et aucun actif de ce type : proposés avant le combat (Voyage, Histoire ; jamais en Duel ni dans la leçon).
  if (mode === 'play' && boostable(battle) && offerable().length) await offerBoosts();
  curChar = c; curBattle = battle;
  if (battle.xpMode === 'voyage') startRun();                        // record du Voyage : durée de la partie notée au serveur
  if (mode === 'play' && !battle.tutorial && !battle.resumed) { prog.played = prog.played || {}; prog.played[c.id] = (prog.played[c.id] || 0) + 1; }   // héros favori (classements)
  const intro = battle.intro ? battle.intro() : null;               // l'annonce d'abord (elle fixe aussi le décor)
  try { await prepareArt(c, battle); } catch (_) { /* sans sprites, le combat reste jouable */ }
  if (intro) await intro;
  starting = false;
  resetGame(c, battle);
  if (battle.onStart) battle.onStart();                              // Duel repris : vague, score et PV resynchronisés
  startBoosts(mode === 'play' ? battle : null);                        // boosts actifs, figés pour la partie
  resetAnims(c.id);
  setupHud(c);
  G.mode = mode;
  setInGame(true);
  if (!opts.loader) hideCover();
  if (mode === 'train') music('musique_tuto');
  if (mode === 'train') G.trainMsg = tr('train.intro');
}

/**
 * KO dans le Voyage : proposer « Seconde chance » (pub récompensée, data/ads.json → rewarded.secondChance), une fois par partie.
 * Jamais en Duel, dans la leçon ou en Histoire. Sinon, fin de partie.
 */
async function koOrSecondChance() {
  const R = D.ads.rewarded.secondChance, b = G.battle, U = D.ads.ui;
  if (b.xpMode !== 'voyage' || b.duel || G.secondChances >= R.perGame || !adsReady()) return endGame('ko');   // pas de pub ici : pas d'offre
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

/** Couleurs du héros (éclats de la séquence de défaite). */
const heroCols = c => (c ? [c.color, c.accent] : []);

/**
 * Fin de partie. 1) Tout est enregistré tout de suite (XP, or, record, Histoire ; Duel : game/duel.js) : fermer le jeu pendant
 * la séquence ne perd rien et n'y échappe pas (prog.pendingEnd : panneau puis fiche rejoués à la réouverture).
 * 2) Séquence (ui/end-seq.js) : défaite (KO, Voyage et Histoire) ou victoire (combat d'Histoire). 3) La fiche habituelle.
 */
async function endGame(why) {
  if (G.mode !== 'play') return;
  const b = G.battle, c = curChar || activeCharacter();
  G.mode = 'ending';                                       // gestes bloqués, le combat reste dessiné (ralenti)
  G.drawing = null;
  traceStop();
  document.documentElement.classList.add('ending');
  // XP du héros : le Voyage compte les rounds terminés et les gardiens vaincus ; l'Histoire donne la sienne après la victoire.
  const xp = b.xpMode === 'voyage' ? voyageXp(G.roundsCleared, G.guardiansBeaten) * boostMult('xp') : 0;   // boost XP ×2
  const { gain, before, after, max, record } = grantXp(G.charId, xp, G.score, !b.onEnd);
  const weapon = grantWeaponXp();
  // Or : déjà versé round par round ; en fin normale, les pièces du round en cours et le bonus de fin (Voyage : base + record ;
  // Histoire : bonus de victoire, story.js → recordCombat). Un abandon (toLobby) ne passe pas par ici.
  payRounds(true);
  const bonus = b.xpMode === 'voyage' ? voyageEndGold(record) * boostMult('gold') : 0;
  countBoostGame();                                                   // boosts : une partie de moins (victoire ou défaite)
  if (bonus) addGold(bonus);
  const goldGain = G.goldGain + bonus;
  if (b.xpMode === 'voyage') noteVoyageEnd(b); else flushPlay();   // pubs : partie comptée, temps de jeu
  if (b.duel) { b.onEnd(why); return; }                             // Duel : résultat, séquence et fiche dans game/duel.js
  const res = { gain, levelUp: after > before, score: G.score, weapon, gold: G.goldGain };
  const rec = b.onRecord ? b.onRecord(why) : null;                 // Histoire : victoire enregistrée maintenant
  const kind = b.tutorial ? null : why === 'win' ? (b.xpMode === 'story' ? 'victory' : null) : 'defeat';
  const results = b.onEnd ? null : JSON.parse(JSON.stringify({ why, score: G.score, time: G.time, gain, levelUp: after > before, max, record,
    stats: G.stats, combos: G.combos, voyage: G.voyage, weapon, gold: goldGain }));
  if (kind && (results || b.storyRef)) {
    prog.pendingEnd = results ? { kind, mode: 'voyage', results } : { kind, mode: 'story', ...b.storyRef, why, res: JSON.parse(JSON.stringify(res)), rec };
    saveProg();
  }
  const F = D.fin_de_partie;                                        // sauvegarde en ligne envoyée une fois le panneau posé
  syncLater(1000 * (F.defeat.slowIn + F.defeat.slowHold + F.defeat.panelAfter + F.panel.drop + 0.3));
  if (why === 'ko') await koFx(heroBody(), heroCols(c));
  else if (kind === 'victory') await victoryFx();
  const toSheet = () => {
    leaveGame();
    if (prog.pendingEnd) { delete prog.pendingEnd; saveProg(); }
    if (b.onEnd) { showLobby(); b.onEnd(why, res, rec); return; }
    music('musique_lobby');
    showResults(results);
    showRewards([...syncRewards(), ...G.gemGains, ...syncGems()]);   // talisman et gemmes (déjà versées) d'un gardien battu
  };
  // Après le panneau de victoire ou de défaite : écran de chargement (fondu de la musique, puis la fiche et la musique suivante).
  if (kind) { await endPanel(kind); if (!await loadingTransition(toSheet)) toSheet(); } else toSheet();
}

/** Après la séquence : plus d'interface de combat. */
function leaveGame() {
  G.mode = 'end';
  resetEnd();
  $('hud').classList.add('hidden');
  document.documentElement.classList.remove('in-game', 'ending', 'duel-live');
  curChar = null; curBattle = null;
  showLobby();
}

/** Séquence de fin interrompue (jeu fermé) : panneau puis fiche, une seule fois (prog.pendingEnd). */
async function replayEnd() {
  const p = prog.pendingEnd;
  await endPanel(p.kind);
  delete prog.pendingEnd; saveProg();
  if (p.mode === 'story') { showLobby(); replayStoryEnd(p); return; }
  music('musique_lobby');
  showResults(p.results);
}

/** Réglages de test : aperçu d'une séquence de fin sur le décor de repos, avec le héros du lobby. */
async function demoEnd(kind) {
  if (starting || G.mode === 'play' || G.mode === 'ending') return;
  const c = activeCharacter(), battle = idleBattle();
  resetEnd();
  showCover();
  await prepareArt(c, battle).catch(() => {});
  resetGame(c, battle); resetAnims(c.id); setupHud(c);
  G.mode = 'ending';
  setInGame(true);
  document.documentElement.classList.add('ending');
  hideCover();
  await new Promise(r => setTimeout(r, 500));
  if (kind === 'defeat') await koFx(heroBody(), heroCols(c)); else await victoryFx(true);
  await endPanel(kind === 'defeat' ? 'defeat' : 'victory');
  leaveGame();
  G.mode = 'menu';
  setInGame(false);
  music('musique_lobby');
}

/** Fin ou sortie du Duel (ui/duel-ui.js) : retour au lobby. */
function duelHome() {
  hideDuelUi();
  G.mode = 'menu';
  setInGame(false);
  music('musique_lobby');
  if (pendingRemote) { const d = pendingRemote; pendingRemote = null; applyRemote(d); }
  maybeDaily();
}

/** Duel en cours au moment de la fermeture : reprise (ou son résultat, une fois). Renvoie 'duel' s'il a pris la main. */
let resuming = false;
async function backToDuel() {
  if (!duelSaved() || resuming) return null;
  resuming = true;
  try {
    if (!duelSaved().summary) await whenOnline(15000);
    return (await resumeDuel()) ? 'duel' : null;
  } catch (e) { return null; } finally { resuming = false; }
}

/* ---------- Démarrage ---------- */
/** Ce que l'écran de chargement précharge (data/chargement.json) : une promesse par élément. */
function preloads() {
  const C = D.chargement, img = src => new Promise(ok => { const i = new Image(); i.onload = i.onerror = ok; i.src = src; });
  const lobbyImgs = C.lobbyImages ? [...document.querySelectorAll('#lobby img')].map(i => i.complete ? null : new Promise(ok => { i.addEventListener('load', ok); i.addEventListener('error', ok); })) : [];
  return [
    ...(document.fonts ? C.fonts.map(f => document.fonts.load(f)) : []),
    ...C.images.map(img), ...lobbyImgs,
    preloadAudio(C.sounds.sfx, C.sounds.music),
    C.sprites ? prepareArt(activeCharacter(), idleBattle()) : null
  ];
}

async function init() {
  addEventListener('resize', resize);
  resize();
  hideSplash();                            // application Android : l'écran de chargement (identique) prend le relais de l'écran natif
  loadingFonts();
  try {
    await loadI18n();                      // textes de l'interface (data/i18n), avant les données
    loadingProgress(0.08);
    await loadData();
    applyLanguageData(D);                  // textes des autres fichiers de data/ dans la langue active
    applyStatic();                         // textes fixes de index.html (data-i18n)
    loadingTip();
    loadingProgress(D.chargement.progress.data);
  } catch (err) {
    dropLoading();
    const msg = tr('error.load', { msg: err.message });
    $('loadErr').textContent = msg === 'error.load' ? err.message : msg;   // langue illisible : message technique seul
    $('loadErr').classList.remove('hidden');
    return;
  }
  migrateProgress();                       // anciennes sauvegardes : niveau gardé, XP dans le niveau à zéro
  initOnline({ applyRemote, afterUpload: syncBoard });   // + classements (online/leaderboard.js)
  initWallet({ changed: refreshLobby });                   // gemmes : le portefeuille du serveur fait foi (online/wallet.js)
  initDaily({ refresh: refreshLobby });                    // récompenses de connexion (ui/daily-ui.js)
  { let was = false; onOnlineChange(s => { const on = s.state === 'online'; if (on && !was) maybeDaily(); was = on; }); }   // connexion revenue : jour à récupérer ?
  { let was = false; onOnlineChange(s => { if (s.state === 'online' && !was) serverPrints().then(refreshLobby, () => {}); was = s.state === 'online'; }); }   // Empreintes du serveur             // compte anonyme + sauvegarde en ligne, en arrière-plan (data/online.json)
  initAds();                               // AdMob + consentement dans l'application ; rien sur le web
  initAudio();                             // effets chargés maintenant, musiques à la demande
  attachInput(cv, {
    isActive: () => G.mode === 'play' || G.mode === 'train',
    onDraw: d => { G.drawing = d; },
    onGesture
  });
  initLobby({ demoEnd, solo: () => start('play'), train: () => { if (!starting) loadingTransition(() => start('train', { loader: true })); }, again: () => start('play'), story: openStory, lesson: startTutorial, ranks: openRanking,
    duel: () => { openDuel({ start: (room, char) => startDuel(room, char), back: duelHome }); } });
  initDuel({ startBattle: opts => start('play', opts), end: why => endGame(why), home: duelHome, leaveGame, panel: endPanel, transition: loadingTransition,
    koFx: () => koFx(heroBody(), heroCols(curChar)), victoryFx: slow => victoryFx(slow) });
  initTutorial({ startBattle: opts => start('play', opts), quit: () => loadingTransition(toLobby) });   // fin de la leçon : écran de chargement
  initStory({ startBattle: opts => start('play', opts), toLobby: showLobby });
  $('quit').onclick = () => { sfx('ui_clic'); askLeave(); };
  initBack(); setLeave(askLeave);           // bouton Retour du téléphone (ui/back.js) : même confirmation que « Quitter »
  initNative({ back: onBack });            // application Android : Retour, arrière-plan, liens, barre d'état (src/native.js)
  initOrientation();                       // portrait seulement (ui/orient.js)
  // Bouton de super : réagit dès l'appui, et l'appui n'atteint jamais le canvas (pas de tap ni de tracé).
  $('superBtn').addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    if (G.mode === 'play' || G.mode === 'train') useSuper();
  });
  // Premier lancement (prologue pas encore vu) : le lobby ne doit jamais se montrer avant le prologue et la leçon.
  // Il est préparé (sans sa musique) sous l'écran de lancement, et le prologue démarre sous l'écran de chargement,
  // qui ne s'efface qu'une fois la première image du prologue posée. Sauvegarde endommagée : choix d'abord (voir plus bas).
  const fresh = !saveState.damaged && !prog.story.prologue;
  resetGame(activeCharacter(), idleBattle());
  toLobby(fresh);
  if (fresh) showCover();
  requestAnimationFrame(loop);
  // Écran de chargement (ui/loading.js, data/chargement.json) : polices, images du lobby, sons essentiels et sprites
  // du combat préchargés pendant au moins minSeconds, au plus maxSeconds depuis l'ouverture de la page ; puis fondu
  // vers l'écran final (lobby, ou prologue au premier lancement).
  await loadingReady(preloads(), D.chargement.progress.data, 1 - D.chargement.progress.lobby);
  let prologue = null;
  if (fresh) {
    let shown;
    const ready = new Promise(r => { shown = r; });
    prologue = maybePrologue({ onShown: shown });
    await Promise.race([ready, prologue]);
  }
  await loadingFade();
  window.__tsReady = true;
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
  // Séquence de fin interrompue (jeu fermé pendant celle-ci) : panneau puis fiche. Duel en cours : on y retourne.
  // Prologue → leçon : l'écran de lancement reste dessous jusqu'à l'arène de la leçon (main.js → start), jamais le lobby ;
  // la musique du prologue s'éteint avant celle de la leçon.
  (prologue || maybePrologue()).then(async first => {
    if (first && !prog.tutorial) { showCover(); await fadeOutMusic(D.chargement.transition.musicFadeMs); return startTutorial(); }
    hideCover();
    if (first) music('musique_lobby');
    if (prog.pendingEnd) return replayEnd().then(() => 'end');
    return showRewards([...syncRewards(), ...syncGems()]).then(showLobby).then(ensurePseudo).then(backToDuel);
  }).then(r => { enableDaily(); if (!r) return maybeDaily(); });
  // Connexion revenue plus tard : Duel resté en attente de reprise.
  onOnlineChange(s => { if (s.state === 'online' && duelSaved() && G.mode !== 'play' && G.mode !== 'ending') backToDuel(); });
}

init();
