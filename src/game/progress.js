// XP, niveaux, sauvegarde locale.
import { D } from '../data.js';

const KEY = 'ts_prog';

export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

export const prog = store.get(KEY, { xp: 0 });

export function levelInfo(xp) {
  const P = D.characters.progression;
  let lvl = 1, need = P.firstLevelXp, x = xp;
  while (x >= need) { x -= need; lvl++; need = Math.round(need * P.growth); }
  return { lvl, cur: x, need };
}

export function attackMult() {
  return 1 + D.characters.progression.attackBonusPerLevel * (levelInfo(prog.xp).lvl - 1);
}

/** Ajoute l'XP d'une partie. Renvoie {gain, before, after} (niveaux). */
export function grantXp(score) {
  const P = D.characters.progression;
  const gain = Math.max(P.minXpPerGame, Math.round(score / P.scorePerXp));
  const before = levelInfo(prog.xp).lvl;
  prog.xp += gain;
  store.set(KEY, prog);
  return { gain, before, after: levelInfo(prog.xp).lvl };
}
