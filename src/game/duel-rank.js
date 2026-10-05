// Empreintes et arènes du Duel (data/duel.json → prints, arenas). Sauvegarde : prog.duel = { prints, unlocked, areneMaxDuel }
// (unlocked : plus haute arène déjà annoncée par l'écran « Nouvelle arène débloquée », index 0 à 7 ;
//  areneMaxDuel : plus haute arène atteinte, 1 à 8, reflet de ranked/{uid}.areneMaxDuel au serveur ; ne baisse jamais).
import { D } from '../data.js';
import { prog, saveProg } from './progress.js';

const DU = () => D.duel;
const state = () => prog.duel || (prog.duel = { prints: 0, unlocked: 0 });

export const prints = () => state().prints || 0;

/** Arène (index 0 à 7) atteinte avec ces Empreintes : le plus haut palier franchi. */
export function arenaIndex(p = prints()) {
  const T = DU().arenas.thresholds;
  let i = 0;
  while (i + 1 < T.length && p >= T[i + 1]) i++;
  return i;
}

/** Plus haute arène de Duel atteinte (1 à 8) : jamais en baisse, même si les Empreintes repassent sous un palier. */
export function maxArena() {
  const s = state();
  return Math.max(s.areneMaxDuel || 1, (s.unlocked || 0) + 1, arenaIndex(s.prints || 0) + 1);
}
/** Arène maximale connue au serveur (ranked/{uid}.areneMaxDuel) : gardée si elle est plus haute. Renvoie true si elle a changé. */
export function noteMaxArena(n) {
  const s = state(), m = Math.max(maxArena(), n || 1);
  if (s.areneMaxDuel === m) return false;
  s.areneMaxDuel = m;
  return true;
}

/** Arène du Voyage d'index i : { id, name, decor, tint, … } et son palier d'Empreintes. */
export const arenaOf = i => ({ ...D.voyage.arenas[i], index: i, at: DU().arenas.thresholds[i] });

/**
 * Fin d'un Duel au hasard : win 'me' | 'opp' | 'tie'. Renvoie { before, after, delta, newArena } ;
 * newArena : index de l'arène tout juste débloquée (première fois), sinon null.
 */
export function applyDuelResult(win) {
  const P = DU().prints, s = state(), before = s.prints || 0;
  const delta = win === 'me' ? P.win : win === 'opp' ? P.loss : P.tie;
  s.prints = Math.max(P.min, before + delta);
  const a = arenaIndex(s.prints);
  let newArena = null;
  if (a > (s.unlocked || 0)) { s.unlocked = a; newArena = a; }
  noteMaxArena(a + 1);
  saveProg();
  return { before, after: s.prints, delta: s.prints - before, newArena };
}
