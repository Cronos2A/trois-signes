// Duel contre un ami (data/duel.json). Les deux joueurs jouent en même temps les mêmes vagues (graine tirée de l'heure du serveur
// à la création du salon), puis le même boss à la 5e. Vagues synchronisées : chacun attend que l'autre ait fini la vague en cours.
// Pression : la vague suivante de chaque joueur est durcie selon le score de l'adversaire sur la vague qui vient de se terminer.
// Réseau : online/duel-net.js ; écrans : ui/duel-ui.js. Ni pub, ni or, ni XP ; bonus de niveau des héros et d'XP des armes neutralisés.
// On ne quitte pas un Duel en cours. Absence (application fermée, écran verrouillé, réseau coupé) : plus de absence_max_s sans
// signe de vie = défaite (absents tous les deux sans que l'un ait vu l'autre partir : match annulé). Le salon est noté dans la
// sauvegarde (prog.duel.room) : à la réouverture, retour dans le Duel ou son résultat, une seule fois (resumeDuel).
import { D } from '../data.js';
import { G } from './state.js';
import { enemyUrl, who } from '../ui/assets.js';
import { placeMusic } from '../audio/audio.js';
import { variantArt, applyVariant } from './variants.js';
import { current, watch, setMine, heartbeat, startWave, leaveRoom, reopenRoom, ms } from '../online/duel-net.js';
import { applyRanked, stale } from '../online/ranked.js';
import { showWait, hideWait, showBanner, showResult, showWaitResult } from '../ui/duel-ui.js';
import { prog, saveProg } from './progress.js';
import { sfx } from '../audio/audio.js';
import { onLifecycle, appHidden } from './lifecycle.js';
import { arenaOf, applyDuelResult } from './duel-rank.js';
import { testMode } from './economy.js';
import { tr, ofName, nf, nfi } from '../i18n.js';

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
/** { startBattle(opts), end(why), home(), leaveGame(), panel(kind), koFx(), victoryFx(slow) } fourni par main.js. */
export function initDuel(a) { api = a; }

/** Duel noté dans la sauvegarde : { code, summary (résultat déjà enregistré, à montrer) } ; null sinon. */
export const duelSaved = () => (prog.duel && prog.duel.room) || null;
function saveRoom(v) { prog.duel.room = v; saveProg(); }

/** Variante du panneau de fin : victoire, défaite, égalité ; aucune pour un match annulé. */
const kindOf = r => (r.why === 'cancel' ? null : r.win === 'me' ? 'victory' : r.win === 'opp' ? 'defeat' : 'tie');

/** Panneau de fin (avec l'éclair et la pluie dorée si le combat est à l'écran), puis la fiche du Duel. Le salon est alors oublié. */
async function presentResult(summary, withFx) {
  const k = kindOf(summary.result);
  if (k === 'victory' && withFx) await api.victoryFx(true);
  else if (k === 'victory') sfx('victoire');
  if (k) await api.panel(k);
  api.leaveGame();
  saveRoom(null);
  showResult(summary, () => api.home());
}

/**
 * Au lancement (après la connexion) : Duel en cours au moment de la fermeture. Résultat déjà enregistré : panneau puis fiche.
 * Sinon on relit le salon et on envoie un signe de vie : refusé (absent plus de absence_max_s), c'est la défaite (ou le match
 * annulé) ; accepté, retour dans le Duel. Renvoie true si le Duel a pris la main.
 */
export async function resumeDuel() {
  const saved = duelSaved();
  if (!saved) return false;
  if (saved.summary) { await presentResult(saved.summary, false); return true; }
  const room = await reopenRoom(saved.code).catch(() => null);
  if (!room || !room.guest) { saveRoom(null); return false; }
  const { uid } = current(), me = room.players[uid];
  const alive = me.done || me.ko != null || await heartbeat();
  const char = D.characters.characters.find(c => c.id === me.hero) || D.characters.characters[0];
  await startDuel(room, char, { entry: me, alive });
  return true;
}

/**
 * Lance le combat du Duel (le salon est prêt : les deux joueurs ont validé leur héros).
 * room : données du salon ; char : héros choisi ; resume : { entry (mon entrée au serveur), alive } après une fermeture.
 */
export async function startDuel(room, char, resume = null) {
  const { uid, code } = current(), oppId = room.host === uid ? room.guest : room.host;
  const plan = planOf(seedOf(room)), n = plan.waves.length, random = room.mode === 'random';
  // Arène : la plus haute des deux joueurs (data/duel.json → arenas) : décor et musique de l'arène du Voyage.
  const arena = arenaOf(Math.max(0, ...Object.values(room.players).map(p => p.arena || 0)));
  const url = await enemyUrl(plan.boss), bossSprite = url ? 'x_' + plan.boss : 'boss';
  const art = variantArt(DU().variants);
  if (url) art.push({ key: 'x_' + plan.boss, url, height: DU().boss.height, fallback: 'boss' });
  const me0 = resume ? resume.entry : room.players[uid];
  const S = {                                        // état du Duel
    uid, oppId, plan, n, opp: room.players[oppId], me: me0, oppName: room.players[oppId].pseudo,
    scores: (me0.scores || []).slice(), times: [], pIn: [0], pOut: [0], stage: [], base: 0, waveStart: 0, active: -1,
    ko: me0.ko ?? null, done: !!me0.done, result: null, summary: null, ended: false, disconnected: false, meStale: false
  };
  saveRoom({ code });                                 // jeu fermé : on reviendra dans ce Duel (resumeDuel)
  let B = null, beat = 0, watchdog = 0, waiting = null, presenting = false, fxBusy = Promise.resolve();
  if (testMode()) window.__tsDuel = S;                               // tests (mode test seulement)
  const oppLive = () => (S.opp && S.opp.live) || 0;
  const sum = a => a.reduce((x, y) => x + (y || 0), 0);
  // skew = écart entre l'heure du serveur et celle de l'appareil, mesuré sur mes propres signes de vie.
  let skew = 0;
  // Attente : temps restant, au plus, de la vague de l'adversaire (sa vague a commencé à waveAt, heure du serveur).
  const oppEta = () => {
    const o = S.opp, at = o && !o.done && o.ko == null && ms(o.waveAt);
    if (!at) return '';
    const left = Math.ceil(DU().waveSeconds - (Date.now() + skew - at) / 1000);
    return left > 1 ? fill(DU().ui.waitEta, { s: Math.min(left, DU().waveSeconds) }) : DU().ui.waitEtaSoon;
  };
  // Adversaire absent : « Ton adversaire est déconnecté : X s » dès absence_alert_s sans signe de vie ; à 0, il a perdu.
  const awayText = () => {
    const o = S.opp;
    if (!o || S.ended || !o.ready || o.done || o.ko != null || !ms(o.seen)) return '';
    const gap = (Date.now() + skew - ms(o.seen)) / 1000;
    return gap < DU().absence_alert_s ? '' : tr('duelAway.opp', { s: Math.max(0, Math.ceil(DU().absence_max_s - gap)) });
  };
  const etaOrAway = () => awayText() || oppEta();
  const hud = () => {
    const i = Math.max(0, S.active), p = Math.round((S.pIn[i] || 0) * 100), away = awayText();
    G.duelHud = { wave: i + 1, total: n, label: DU().ui.waveLabel, left: S.active >= 0 ? DU().waveSeconds - (G.time - S.waveStart) : DU().waveSeconds, away: !!away,
      line: away || fill(DU().ui.hudLine, { name: S.oppName, score: nfi(oppLive()) }) + (p > 0 ? fill(DU().ui.hudPressure, { pct: nf(p) }) : '') };
  };
  // Pression des vagues déjà jouées (reprise après une fermeture) : recalculée d'après les scores des deux joueurs.
  for (let j = 1; j <= S.scores.length && j < n; j++) {
    const o = (S.opp.scores || [])[j - 1];
    if (o == null) break;
    S.pIn[j] = pressureFrom(o, maxScore(j - 1, S.pOut[j - 1], plan, bossSprite));
    S.pOut[j] = pressureFrom(S.scores[j - 1], maxScore(j - 1, S.pIn[j - 1], plan, bossSprite));
    S.stage[j] = 'go';
  }

  // Résultat : null tant que rien n'est joué d'avance ; sinon { win: 'me' | 'opp' | 'tie', why, n } (même ordre que les règles :
  // abandon, issue acquise par les KO ou les scores, puis l'absence ; absents tous les deux : match annulé, why 'cancel').
  const decide = () => {
    const o = S.opp || {};
    const myT = sum(S.scores), opT = sum(o.scores || []);
    const byScore = why => (myT === opT ? { win: 'tie', why: why + 'Tie' } : { win: myT > opT ? 'me' : 'opp', why });
    if (o.quit) return { win: 'me', why: 'quit' };
    const oKo = o.ko ?? null;
    if (S.ko !== null) {
      if (oKo !== null) return oKo < S.ko ? { win: 'me', why: 'ko', n: oKo + 1 } : oKo > S.ko ? { win: 'opp', why: 'meKo', n: S.ko + 1 } : { ...byScore('bothKo'), n: S.ko + 1 };
      if ((o.scores || []).length > S.ko) return { win: 'opp', why: 'meKo', n: S.ko + 1 };
    } else if (oKo !== null) { if (S.scores.length > oKo) return { win: 'me', why: 'ko', n: oKo + 1 }; }
    else if (S.done && o.done) return byScore('score');
    const L = DU().absence_max_s * 1000;
    if (S.meStale) {
      if (S.disconnected) {
        const a = ms(S.me && S.me.seen), b = ms(o.seen);
        if (b + L < a) return { win: 'me', why: 'disconnect' };
        if (a + L >= b) return { win: 'tie', why: 'cancel' };
      }
      return { win: 'opp', why: 'meDisconnect' };
    }
    if (S.disconnected) return { win: 'me', why: 'disconnect' };
    return null;
  };
  const stop = () => { clearInterval(beat); clearInterval(watchdog); offLife(); removeEventListener('pagehide', onHide); };
  /** Issue décidée : enregistrée tout de suite (Empreintes, salon, sauvegarde), puis séquence de fin et fiche. */
  const finish = r => {
    if (S.ended || !r) return;
    S.ended = true; S.result = r;
    stop();
    if (G.mode === 'play' && G.battle === B && S.active >= 0 && S.scores.length <= S.active) S.scores[S.active] = G.score - S.base;   // vague en cours
    hideWait();
    const summary = S.summary = { result: r, me: { name: DU().ui.you, scores: S.scores }, opp: { name: S.oppName, scores: (S.opp && S.opp.scores) || [] },
      pIn: S.pIn, pOut: S.pOut, n, random };
    if (random) {                                                   // Empreintes : Duel au hasard seulement
      summary.rank = applyDuelResult(r.win);                         // affichage tout de suite ; le serveur fait foi
      applyRanked(code, [uid, oppId]);
    }
    leaveRoom(false);
    saveRoom({ code, summary: JSON.parse(JSON.stringify(summary)) });   // jeu fermé pendant la séquence : rejouée à la réouverture
    if (B) B.summary = summary;
    if (G.mode === 'play' && G.battle === B) api.end('decided');   // main.js → endGame → B.onEnd → present
    else present();
  };
  const present = async () => {
    if (presenting) return;
    presenting = true;
    await fxBusy;                                                   // explosion du héros d'abord
    hideWait();
    await presentResult(S.summary, G.mode === 'ending' && G.battle === B);
  };
  const check = () => { if (!S.ended) finish(decide()); };

  // Absence. L'adversaire : jugé seulement sur des heures confirmées par le serveur (mon dernier signe de vie confirmé contre
  // le sien), pas sur celles que l'appareil estime hors connexion. Moi : plus de absence_max_s sans contact avec le serveur
  // (réseau, veille, écran verrouillé), ou un signe de vie refusé par le serveur (entrée figée) : défaite.
  const ABS = DU().absence_max_s * 1000;
  let lastContact = Date.now(), lastBeat = Date.now();
  const playing = () => S.ko === null && !S.done;
  const meOut = () => { if (S.ended) return; S.meStale = true; finish(decide()); };
  const selfCheck = () => { if (!S.ended && playing() && Date.now() - Math.max(lastContact, lastBeat) > ABS) meOut(); };
  const beatNow = () => {
    const inGame = G.battle === B && G.mode === 'play';
    return heartbeat(inGame ? G.score : sum(S.scores), inGame && G.hero ? Math.max(0, Math.round(G.hero.hp)) : undefined).then(ok => {
      if (ok) { lastBeat = lastContact = Date.now(); return; }
      if (!S.ended && playing()) meOut();                           // refusé : absent trop longtemps, l'entrée est figée
    });
  };
  // Écran verrouillé, application en arrière-plan (game/lifecycle.js : web et Android) : plus de signe de vie (l'adversaire voit
  // le compte à rebours) ; au retour, défaite si l'absence a dépassé absence_max_s, sinon le Duel continue.
  const onVisible = state => {
    if (S.ended) return;
    if (state === 'hidden') { beatNow(); return; }
    selfCheck();
    if (!S.ended) beatNow();
  };
  const offLife = onLifecycle(onVisible);
  const onHide = () => { if (!S.ended) beatNow(); };                // application fermée : dernier score et PV envoyés si possible
  addEventListener('pagehide', onHide);
  const isAway = p => !!p && !!p.ready && !(p.done || p.ko != null);
  watch((d, meta) => {
    if (!d || S.ended) return;
    if (!meta.fromCache) lastContact = Date.now();
    S.opp = d.players[oppId];
    if (d.players[uid]) S.me = d.players[uid];
    const mine = ms(S.me && S.me.seen), his = ms(S.opp && S.opp.seen);
    if (!meta.fromCache && !meta.pending && mine && mine !== S.mySeen) { S.mySeen = mine; skew = mine - Date.now(); }
    if (!meta.fromCache && !meta.pending && mine && his && mine - his > ABS && isAway(S.opp)) S.disconnected = true;
    if (waiting) waiting();
    check();
  });
  beat = setInterval(() => { if (!appHidden()) beatNow(); }, DU().heartbeatSeconds * 1000);
  watchdog = setInterval(() => { selfCheck(); check(); }, 1000);

  /** Fin de la vague i : score de la vague, envoyé au serveur. */
  const record = i => {
    if (S.scores.length > i) return;
    S.scores[i] = G.score - S.base; S.times[i] = G.time - S.waveStart;
    setMine({ scores: S.scores, wave: i + 1, live: G.score });
  };
  // Reprise : vague commencée avant la fermeture (elle continue avec le temps qui lui reste, sans nouvelle annonce).
  const resumeWave = resume && (me0.wave || 0) > S.scores.length ? S.scores.length : -1;

  B = {
    duel: true, random, resumed: !!resume, endless: true, label: tr('battle.wave'), waves: [], types: {}, art, timeLimit: 0, lieu: arena.decor,
    bg: arena.index ? { tint: arena.tint, title: arena.name } : null, music: placeMusic(arena.id), betweenRounds: DU().betweenWaves, summary: null,
    intro: () => showBanner(resume ? tr('duelAway.resume', { name: S.oppName })
      : [fill(DU().ui.countdown, { name: S.oppName }), fill(DU().ui.arena, { name: arena.name }), fill(DU().ui.noPressure, { n: 1 })].join('\n'), DU().countdownSeconds),
    /** Reprise : score, PV et vague du serveur (main.js → start, juste après la remise à zéro). */
    onStart() {
      if (!resume) return;
      G.score = me0.live || 0;
      if (me0.hp > 0) G.hero.hp = Math.min(G.hero.max, me0.hp);
      G.waveIdx = S.scores.length;
    },
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
      if (i === resumeWave && !S.stage[i]) S.stage[i] = 'go';
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
      S.active = i;
      if (i === resumeWave) {                                    // déjà commencée au serveur : on garde son heure de début
        S.base = sum(S.scores);
        S.waveStart = G.time - Math.min(DU().waveSeconds, Math.max(0, (Date.now() + skew - ms(me0.waveAt)) / 1000));
      } else { S.base = G.score; S.waveStart = G.time; startWave(i + 1); }
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
    /**
     * Fin côté jeu (main.js → endGame) : KO (noté au serveur tout de suite, puis le héros explose ; résultat attendu si l'autre
     * joue encore) ou issue décidée (finish).
     */
    async onEnd(why) {
      if (!S.ended && why === 'ko' && S.ko === null) {
        const i = Math.max(0, S.active);
        S.scores[i] = G.score - S.base; S.ko = i;
        setMine({ scores: S.scores, ko: i, live: G.score, hp: 0 });
      }
      if (why === 'ko') fxBusy = api.koFx();
      check();
      await fxBusy;
      if (S.ended) { present(); return; }
      showWaitResult(fill(DU().ui.waitKo, { name: S.oppName, of: ofName(S.oppName) }), oppLive, etaOrAway);
    }
  };

  /** Écran d'attente (l'autre n'a pas fini) : son score en direct ; reprend dès que ok() devient vrai. Pas d'abandon. */
  function waitFor(ok, title, waveNo) {
    const upd = () => showWait(fill(title, { name: S.oppName, of: ofName(S.oppName) }), fill(DU().ui.waitWave, { n: waveNo }), oppLive, etaOrAway);
    waiting = () => {
      if (ok()) { waiting = null; hideWait(); G.paused = false; }
      else upd();
    };
    upd();
  }

  if (resume && !resume.alive) {                                  // absent trop longtemps : défaite (ou match annulé)
    S.disconnected = stale(S.opp, Date.now());
    meOut();
    return B;
  }
  if (resume && (S.ko !== null || S.done)) {                      // déjà KO ou boss vaincu : on attend le résultat
    if (S.ko !== null) showWaitResult(fill(DU().ui.waitKo, { name: S.oppName, of: ofName(S.oppName) }), oppLive, etaOrAway);
    else waitFor(() => false, DU().ui.waitTitle, n);
    check();
    return B;
  }
  await api.startBattle({ char, battle: B });
  return B;
}
