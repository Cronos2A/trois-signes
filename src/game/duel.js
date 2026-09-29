// Duel contre un ami (data/duel.json). Les deux joueurs jouent en même temps les mêmes vagues (graine tirée de l'heure du serveur
// à la création du salon), puis le même boss à la 5e. Vagues synchronisées : chacun attend que l'autre ait fini la vague en cours.
// Pression : la vague suivante de chaque joueur est durcie selon le score de l'adversaire sur la vague qui vient de se terminer.
// Réseau : online/duel-net.js ; écrans : ui/duel-ui.js. Ni pub, ni or, ni XP ; bonus de niveau des héros et d'XP des armes neutralisés.
import { D } from '../data.js';
import { G } from './state.js';
import { enemyUrl, who } from '../ui/assets.js';
import { placeMusic } from '../audio/audio.js';
import { variantArt, applyVariant } from './variants.js';
import { current, watch, setMine, heartbeat, leaveRoom, ms } from '../online/duel-net.js';
import { showWait, hideWait, showBanner, showResult, showWaitResult } from '../ui/duel-ui.js';
import { arenaOf, applyDuelResult } from './duel-rank.js';

const DU = () => D.duel;
const fill = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

/* ---------- Graine et tirages ---------- */
/** Graine du salon : code + heure du serveur à la création (la même pour les deux joueurs). */
export function seedOf(room) {
  let h = 2166136261;
  for (const c of room.code + ':' + ms(room.createdAt)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {                                  // mulberry32 : suite reproductible
  let a = seed;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Programme du Duel (identique chez les deux joueurs) : vagues et boss. */
export function planOf(seed) {
  const r = rng(seed), W = DU().waves, Bo = DU().boss;
  const waves = W.map(w => Array.from({ length: w.enemies }, () => (r() < w.bruteShare ? 'brute' : 'grunt')));
  const boss = Bo.pool[Math.floor(r() * Bo.pool.length)];
  waves.push([boss, ...Bo.escort]);
  return { waves, boss };
}

/* ---------- Types d'ennemis d'une vague ---------- */
function typesFor(i, pressure, plan, bossSprite) {
  const w = DU().waves[i] || { hp: 1, dmg: 1 }, m = 1 + pressure;
  const scale = T => ({ ...T, hp: Math.round(T.hp * w.hp * m), dmg: Math.round(T.dmg * w.dmg * m) });
  const Bo = DU().boss, types = { grunt: scale(D.enemies.grunt), brute: scale(D.enemies.brute) };
  if (i === DU().waves.length) {
    types[plan.boss] = { ...D.enemies.boss, name: who(plan.boss).name, hp: Math.round(Bo.hp * m), dmg: Math.round(Bo.dmg * m),
      wind: Bo.wind, pts: Bo.pts, sprite: bossSprite, special: true };
  }
  return applyVariant(types, DU().variants[i] || DU().variants[DU().variants.length - 1], {});
}

/** Score maximal théorique d'une vague jouée avec cette pression (partie sans faute : data/duel.json → maxScore). */
function maxScore(i, pressure, plan, bossSprite) {
  const T = typesFor(i, pressure, plan, bossSprite), P = D.rules.pickup, M = DU().maxScore;
  const top = D.grades.levels.reduce((a, g) => (g.mult > a.mult ? g : a));             // Perfect
  return plan.waves[i].reduce((s, id) => {
    const t = T[id], hits = Math.ceil(t.hp / (M.refAttack * top.mult));
    return s + t.hp * D.rules.score.perDamage + t.pts + hits * top.bonus
      + Math.floor(hits / D.grades.comboLength) * D.grades.comboScore
      + M.dodgesPerEnemy * (D.rules.dodge.perfectScore + top.bonus)
      + t.loot.count * P.coinValue * M.coinMult;
  }, 0);
}
const pressureFrom = (score, max) => Math.min(DU().pressure.cap, DU().pressure.factor * Math.max(0, score) / Math.max(1, max));

/* ---------- Déroulé ---------- */
let api = {};
export function initDuel(a) { api = a; }          // { startBattle(opts), end(why), home(), quit() } fourni par main.js

/**
 * Lance le combat du Duel (le salon est prêt : les deux joueurs ont validé leur héros).
 * room : données du salon ; char : héros choisi.
 */
export async function startDuel(room, char) {
  const { uid } = current(), oppId = room.host === uid ? room.guest : room.host;
  const plan = planOf(seedOf(room)), n = plan.waves.length, random = room.mode === 'random';
  // Arène : la plus haute des deux joueurs (data/duel.json → arenas) : décor et musique de l'arène du Voyage.
  const arena = arenaOf(Math.max(0, ...Object.values(room.players).map(p => p.arena || 0)));
  const url = await enemyUrl(plan.boss), bossSprite = url ? 'x_' + plan.boss : 'boss';
  const art = variantArt(DU().variants);
  if (url) art.push({ key: 'x_' + plan.boss, url, height: DU().boss.height, fallback: 'boss' });
  const S = {                                        // état du Duel
    uid, oppId, plan, n, opp: room.players[oppId], me: room.players[uid], oppName: room.players[oppId].pseudo,
    scores: [], pIn: [0], pOut: [0], stage: [], base: 0, waveStart: 0, active: -1, ko: null, done: false, result: null, ended: false
  };
  let B = null, beat = 0, watchdog = 0, waiting = null;
  const oppLive = () => (S.opp && S.opp.live) || 0;
  const hud = () => {
    const i = Math.max(0, S.active);
    G.duelHud = { wave: i + 1, total: n, label: DU().ui.waveLabel, left: S.active >= 0 ? DU().waveSeconds - (G.time - S.waveStart) : DU().waveSeconds,
      line: fill(DU().ui.hudLine, { name: S.oppName, score: Math.round(oppLive()).toLocaleString('fr-FR') }) };
  };

  // Résultat : null tant que rien n'est joué d'avance ; sinon { win: 'me' | 'opp' | 'tie', why, n }.
  const decide = () => {
    const o = S.opp || {}, m = { scores: S.scores, ko: S.ko, done: S.done };
    const tot = a => (a || []).reduce((s, x) => s + (x || 0), 0), myT = tot(m.scores), opT = tot(o.scores);
    const byScore = why => ({ win: myT > opT ? 'me' : myT < opT ? 'opp' : 'tie', why });
    if (o.quit) return { win: 'me', why: 'quit' };
    if (S.disconnected) return { win: 'me', why: 'disconnect' };
    const oKo = o.ko ?? null;
    if (m.ko !== null) {
      if (oKo !== null) return oKo < m.ko ? { win: 'me', why: 'ko', n: oKo + 1 } : oKo > m.ko ? { win: 'opp', why: 'meKo', n: m.ko + 1 } : { ...byScore('bothKo'), n: m.ko + 1 };
      if ((o.scores || []).length > m.ko) return { win: 'opp', why: 'meKo', n: m.ko + 1 };
      return null;
    }
    if (oKo !== null) return m.scores.length > oKo ? { win: 'me', why: 'ko', n: oKo + 1 } : null;
    if (m.done && o.done) return byScore('score');
    return null;
  };
  const finish = r => {
    if (S.ended) return;
    S.ended = true; S.result = r;
    clearInterval(beat); clearInterval(watchdog);
    if (G.mode === 'play' && S.active >= 0 && S.scores.length <= S.active) S.scores[S.active] = G.score - S.base;   // vague en cours
    hideWait();
    const summary = { result: r, me: { name: DU().ui.you, scores: S.scores }, opp: { name: S.oppName, scores: (S.opp && S.opp.scores) || [] },
      pIn: S.pIn, pOut: S.pOut, n };
    if (random) summary.rank = applyDuelResult(r.win);             // Empreintes : Duel au hasard seulement
    leaveRoom(false);
    if (G.mode === 'play') { B.summary = summary; api.end(r.win === 'me' ? 'win' : 'ko'); }
    else showResult(summary, () => api.home());
  };
  const check = () => { if (!S.ended) { const r = decide(); if (r) finish(r); } };

  // Serveur : l'adversaire en direct ; déconnexion = plus de disconnectSeconds sans signe de vie (heures du serveur).
  watch(d => {
    if (!d || S.ended) return;
    S.opp = d.players[oppId];
    const mine = ms(d.players[uid] && d.players[uid].seen), his = ms(S.opp && S.opp.seen);
    if (mine && his && mine - his > DU().disconnectSeconds * 1000 && !(S.opp.done || S.opp.ko !== null)) S.disconnected = true;
    if (waiting) waiting();
    if (S.ko !== null || S.done || S.disconnected || (S.opp && S.opp.quit)) check();
  });
  beat = setInterval(() => heartbeat(Math.max(0, S.active) + 1, G.mode === 'play' ? G.score : S.scores.reduce((a, b) => a + b, 0)),
    DU().heartbeatSeconds * 1000);
  watchdog = setInterval(() => { if (S.ko !== null || S.done) check(); }, 1000);

  /** Fin de la vague i : score de la vague, envoyé au serveur. */
  const record = i => {
    if (S.scores.length > i) return;
    S.scores[i] = G.score - S.base;
    setMine({ scores: S.scores, wave: i + 1, live: G.score });
  };

  B = {
    duel: true, endless: true, label: 'Vague', waves: [], types: {}, art, timeLimit: 0, lieu: arena.decor,
    bg: arena.index ? { tint: arena.tint, title: arena.name } : null, music: placeMusic(arena.id), betweenRounds: DU().betweenWaves, summary: null,
    intro: () => showBanner([fill(DU().ui.countdown, { name: S.oppName }), fill(DU().ui.arena, { name: arena.name }), fill(DU().ui.noPressure, { n: 1 })].join('\n'), DU().countdownSeconds),
    /** Vague i (0 à n-1) : enregistre la précédente, attend l'adversaire, montre la pression, puis lance la vague. */
    prepare(i) {
      if (S.ended) return false;
      if (i > 0) record(i - 1);
      if (i >= n) {                                              // boss vaincu : survivant jusqu'au bout
        if (!S.done) { S.done = true; setMine({ done: true, live: G.score }); }
        G.paused = true;
        waitFor(() => false, DU().ui.waitTitle, n);
        check();
        return false;
      }
      if (i > 0) {
        const r = decide();
        if (r) { finish(r); return false; }
        const ready = () => S.opp && (S.opp.scores || []).length >= i;
        if (!ready()) { G.paused = true; waitFor(ready, DU().ui.waitTitle, i); return false; }
      }
      if (!S.stage[i]) {                                         // pression de la vague i, puis annonce
        S.stage[i] = 'banner';
        if (i > 0) {
          S.pIn[i] = pressureFrom(S.opp.scores[i - 1], maxScore(i - 1, S.pOut[i - 1], plan, bossSprite));
          S.pOut[i] = pressureFrom(S.scores[i - 1], maxScore(i - 1, S.pIn[i - 1], plan, bossSprite));
          G.paused = true;
          showBanner(fill(DU().ui.pressure, { name: S.oppName, pct: Math.round(S.pIn[i] * 100) }), DU().bannerSeconds)
            .then(() => { S.stage[i] = 'go'; G.paused = false; });
          return false;
        }
        S.stage[i] = 'go';
      }
      if (S.stage[i] !== 'go') return false;
      B.types = typesFor(i, S.pIn[i], plan, bossSprite);
      B.waves[i] = { enemies: plan.waves[i], boss: i === n - 1, title: i === n - 1 ? who(plan.boss).name : undefined, color: i === n - 1 ? '#FF5A3C' : undefined };
      S.active = i; S.base = G.score; S.waveStart = G.time;
      setMine({ wave: i + 1 });
      hud();
      return true;
    },
    /** Chaque image : temps limite de la vague, affichage. */
    update() {
      hud();
      if (S.active >= 0 && S.scores.length <= S.active && G.time - S.waveStart >= DU().waveSeconds) {
        G.enemies.length = 0; G.loots.length = 0;              // temps écoulé : la vague s'arrête avec son score
      }
    },
    /** Fin de partie côté jeu : KO (main.js → endGame) ou fin décidée (finish). */
    onEnd(why) {
      if (!S.ended) {
        if (why === 'ko' && S.ko === null) {
          const i = Math.max(0, S.active);
          S.scores[i] = G.score - S.base; S.ko = i;
          setMine({ scores: S.scores, ko: i, live: G.score });
        }
        showWaitResult(fill(DU().ui.waitKo, { name: S.oppName }), () => (S.opp && S.opp.live) || 0, api.quit);
        check();
        return;
      }
      showResult(B.summary, () => api.home());
    },
    /** Quitter en pleine partie : abandon (l'adversaire gagne). */
    onQuit() {
      if (S.ended) return;
      S.ended = true;
      clearInterval(beat); clearInterval(watchdog);
      if (random) applyDuelResult('opp');                            // abandon = défaite
      hideWait();
      leaveRoom(true);
      api.home();
    }
  };

  /** Écran d'attente (l'autre n'a pas fini) : son score en direct ; reprend dès que ok() devient vrai. */
  function waitFor(ok, title, waveNo) {
    const upd = () => showWait(fill(title, { name: S.oppName }), fill(DU().ui.waitWave, { n: waveNo }), oppLive(), api.quit);
    waiting = () => {
      if (ok()) { waiting = null; hideWait(); G.paused = false; }
      else upd();
    };
    upd();
  }

  await api.startBattle({ char, battle: B });
  return B;
}
