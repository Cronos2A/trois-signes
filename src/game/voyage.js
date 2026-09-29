// Le Voyage : mode Solo infini (valeurs dans data/voyage.json).
// 8 arènes de 4 rounds (3 vagues puis le gardien), puis « Au-delà du Silence » sans fin.
// La partie ne s'arrête qu'au KO du héros. Chaque round est construit au moment d'apparaître :
// types d'ennemis renforcés selon l'arène (PV, dégâts, alerte), vagues de 3 ennemis au plus.
import { D } from '../data.js';
import { G, heroPos } from './state.js';
import { pop } from './effects.js';
import { reachArena } from './progress.js';
import { enemyUrl, who } from '../ui/assets.js';
import { placeMusic } from '../audio/audio.js';
import { syncRewards } from './rewards.js';
import { variantArt, variantSprite, variantType, voyageVariant, voyageVariants } from './variants.js';

const V = () => D.voyage;
const ARENAS = () => V().arenas.length;

/** Étape d'un round : index d'arène (0 à 7, puis 8 = Au-delà du Silence) et rang dans l'arène. */
export function stageOf(i) {
  const n = V().roundsPerArena, a = Math.floor(i / n);
  return { stage: Math.min(a, ARENAS()), round: i % n, beyond: a >= ARENAS() ? i - ARENAS() * n : -1 };
}

/** Infos d'affichage d'une étape : nom, décor, teinte. */
export function stageInfo(s) {
  const A = s < ARENAS() ? V().arenas[s] : V().beyond;
  return { id: A.id, name: A.name, decor: A.decor, tint: A.tint, index: s };
}

/** Multiplicateurs du round i : PV, dégâts, alerte (s) à retirer, score. */
export function scaling(i) {
  const S = V().scaling, C = V().score, { beyond } = stageOf(i), a = Math.min(stageOf(i).stage, ARENAS() - 1);
  let hp = 1 + S.hpPerArena * a, dmg = 1 + S.dmgPerArena * a, score = 1 + C.perArena * a;
  if (beyond >= 0) {
    hp *= Math.pow(1 + S.beyondHpPerRound, beyond + 1);
    dmg *= Math.pow(1 + S.beyondDmgPerRound, beyond + 1);
    score = C.beyondBase + C.beyondPerRound * beyond;
  }
  return { hp, dmg, windCut: beyond >= 0 ? Infinity : S.windPerArena * a, score };
}

const scaled = (T, m) => ({
  ...T, hp: Math.round(T.hp * m.hp), dmg: Math.round(T.dmg * m.dmg),
  wind: Math.max(V().scaling.minWind, T.wind - m.windCut)
});

/**
 * Crée le combat du Voyage. hooks.onStage(info) : changement d'arène (décor et écran de transition),
 * renvoie une promesse résolue quand le joueur repart.
 */
export async function voyageBattle(hooks) {
  const guardians = [...new Set(V().arenas.map(a => a.guardian))];
  const art = [], sprite = {};
  for (const id of guardians) {
    if (D.enemies[id]) continue;                                   // Forêt de Mousse : boss actuel du Solo
    const url = await enemyUrl(id);
    sprite[id] = url ? 'x_' + id : 'boss';                         // sans sprite : celui du boss du Solo
    if (url) art.push({ key: 'x_' + id, url, height: V().guardianHeight, fallback: 'boss' });
  }
  art.push(...variantArt(voyageVariants()));                       // sbires : une variante par arène
  const arenaOf = id => (V().arenas.find(a => a.guardian === id) || {}).id;   // talisman gardé par ce gardien
  const guardianType = (id, m) => {
    if (D.enemies[id]) return { ...scaled(D.enemies[id], m), special: true, guardianOf: arenaOf(id) };
    const base = id === 'eldan_oublie' ? V().guardianEldan : V().guardian;
    return {
      ...scaled({ ...D.enemies.boss, hp: base.hp, dmg: base.dmg, wind: base.wind }, m),
      name: who(id).name, pts: base.pts, sprite: sprite[id], special: true,
      mech: id === 'eldan_oublie' ? 'eldan' : null, guardianOf: arenaOf(id)
    };
  };

  let entered = -1;                                                // dernière étape affichée
  /** Entrée dans l'arène du round i : décor, musique, soin, coffre ; renvoie la promesse de l'écran d'annonce. */
  const enter = i => {
    const st = stageOf(i), info = stageInfo(st.stage);
    entered = st.stage;
    B.lieu = info.decor;
    B.music = placeMusic(info.id);
    B.bg = st.stage === 0 ? null : { tint: info.tint, title: info.name };
    const heal = i > 0 ? V().healBetweenArenas : 0;
    if (heal) {
      const h = G.hero, p = heroPos();
      h.hp = Math.min(h.max, h.hp + h.max * heal);
      pop(p.x, p.y - 90, '+' + Math.round(heal * 100) + ' % PV', '', '#8CF09A', 1.4, 24);
    }
    // Coffre : le talisman du gardien qu'on vient de battre (écran « Arène découverte »).
    const rewards = syncRewards().filter(r => r.kind === 'talisman');
    const first = (reachArena(info.id, st.stage) && st.stage < ARENAS()) || rewards.length > 0;
    return hooks.onStage({ ...info, heal, first, rewards, total: ARENAS(), lieu: B.lieu, bg: B.bg });
  };
  const B = {
    endless: true, xpMode: 'voyage', label: 'Round', types: {}, waves: [], art, timeLimit: 0, lieu: null, bg: null,
    betweenRounds: V().betweenRounds,
    /** Annonce de la partie : l'arène 1, montrée AVANT que l'arène soit visible (main.js → start). */
    intro: () => enter(0),
    /** Prépare le round i. Renvoie false si un écran de transition vient de s'ouvrir (le round attend). */
    prepare(i) {
      const st = stageOf(i), info = stageInfo(st.stage), m = scaling(i);
      if (st.stage !== entered) {                                   // nouvelle arène en cours de partie
        G.paused = true;
        enter(i).then(() => { G.paused = false; });
        return false;
      }
      G.scoreMult = m.score;
      G.voyage = { stage: st.stage, round: st.round, name: info.name, total: ARENAS(), rounds: V().roundsPerArena, index: i };
      B.types = { grunt: scaled(D.enemies.grunt, m), brute: scaled(D.enemies.brute, m) };
      const vt = variantType();
      B.types[vt] = { ...B.types[vt], sprite: variantSprite(voyageVariant(st.stage)) };
      const max = V().maxEnemies, guardianRound = st.round === V().roundsPerArena - 1;
      let list, gid = null;
      if (st.beyond < 0) {
        const A = V().arenas[st.stage];
        if (guardianRound) { gid = A.guardian; list = [gid, ...A.escort]; }
        else list = A.waves[st.round];
      } else {
        const Y = V().beyond;
        if (guardianRound) {
          gid = guardians[Math.floor(Math.random() * guardians.length)];
          list = [gid, ...(gid === 'eldan_oublie' ? [] : Y.escort)];   // Eldan appelle déjà ses sbires
        } else list = Array.from({ length: Y.enemies }, () => Math.random() < Y.bruteShare ? 'brute' : 'grunt');
      }
      if (gid) B.types[gid] = guardianType(gid, m);
      list = list.slice(0, max);
      B.waves[i] = {
        enemies: list, boss: !!gid,
        title: gid ? B.types[gid].name : 'Round ' + (st.round + 1),
        color: gid ? '#FF5A3C' : undefined
      };
      return true;
    }
  };
  return B;
}
