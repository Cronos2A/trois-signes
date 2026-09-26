// XP, niveaux, sauvegarde locale.
import { D } from '../data.js';

const KEY = 'ts_prog';

export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

export const prog = store.get(KEY, {});
// Chaque personnage a son XP et son niveau, gagnés seulement en le jouant.
// Une ancienne sauvegarde (XP commune) revient à Aldric, seul jouable jusque-là.
if (!prog.chars) { prog.chars = { aldric: { xp: prog.xp || 0 } }; delete prog.xp; }

export const charXp = id => (prog.chars[id] && prog.chars[id].xp) || 0;

/** Retient le personnage choisi dans le lobby pour les prochaines sessions. */
export function saveActive(id) { prog.active = id; store.set(KEY, prog); }

export function levelInfo(xp) {
  const P = D.characters.progression;
  let lvl = 1, need = P.firstLevelXp, x = xp;
  while (x >= need) { x -= need; lvl++; need = Math.round(need * P.growth); }
  return { lvl, cur: x, need };
}

export function attackMult(id) {
  return 1 + D.characters.progression.attackBonusPerLevel * (levelInfo(charXp(id)).lvl - 1);
}

/** Ajoute l'XP d'une partie au personnage joué et retient le record. Renvoie {gain, before, after, record}. */
export function grantXp(score, id) {
  const P = D.characters.progression;
  const gain = Math.max(P.minXpPerGame, Math.round(score / P.scorePerXp));
  const c = prog.chars[id] || (prog.chars[id] = { xp: 0 });
  const before = levelInfo(c.xp).lvl;
  c.xp += gain;
  const record = score > (prog.best || 0);
  if (record) prog.best = score;
  store.set(KEY, prog);
  return { gain, before, after: levelInfo(c.xp).lvl, record };
}
