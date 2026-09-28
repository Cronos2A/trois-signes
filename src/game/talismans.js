// Talismans (valeurs et textes dans data/talismans.json). Un emplacement par héros ; un même talisman
// peut être équipé par plusieurs héros. Débloqués en battant pour la première fois le gardien d'une arène du Voyage.
import { D } from '../data.js';
import { prog, saveProg } from './progress.js';

const T = () => D.talismans;
const AR = prog.armory;

export const talismanList = () => T().talismans;
export const talismanData = id => T().talismans.find(t => t.id === id);
export const talismanUnlocked = id => AR.talismans.includes(id);
export const talismanForArena = arenaId => T().talismans.find(t => t.arena === arenaId);

/** Talisman équipé par un héros, ou null. */
export function equippedTalisman(heroId) {
  const id = AR.talisman[heroId];
  return id && talismanUnlocked(id) ? id : null;
}

/** Équipe (id) ou retire (null) le talisman d'un héros. */
export function equipTalisman(heroId, id) {
  if (id && !talismanUnlocked(id)) return;
  if (id) AR.talisman[heroId] = id; else delete AR.talisman[heroId];
  saveProg();
}

/** Débloque un talisman. Renvoie true s'il ne l'était pas encore. */
export function unlockTalisman(id) {
  if (!talismanData(id) || talismanUnlocked(id)) return false;
  AR.talismans.push(id);
  saveProg();
  return true;
}

/** Effet du talisman équipé pour un combat ({} sans talisman, ou en Duel s'il n'y est pas autorisé). */
export function talismanEffect(heroId, duel = false) {
  const id = equippedTalisman(heroId), t = id && talismanData(id);
  if (!t || (duel && !t.autorise_en_duel)) return {};
  return { id, ...t.effect };
}
