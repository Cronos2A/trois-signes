// Empreintes et arènes du Duel (data/duel.json → prints, arenas). Sauvegarde : prog.duel = { prints, unlocked }
// (unlocked : plus haute arène déjà annoncée par l'écran « Nouvelle arène débloquée »).
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
  saveProg();
  return { before, after: s.prints, delta: s.prints - before, newArena };
}
