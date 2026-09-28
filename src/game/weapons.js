// Progression des armes (valeurs dans data/weapons.json). Une arme par héros (characters.json → weapon) ;
// l'XP appartient à l'arme, pas au skin. Elle se gagne en combat (Voyage et Histoire seulement)
// et n'est ajoutée à la sauvegarde qu'en fin de partie, comme l'XP du héros.
import { D } from '../data.js';
import { G } from './state.js';
import { prog, saveProg } from './progress.js';

const W = () => D.weapons;
if (!prog.weapons) prog.weapons = {};

export const weaponOf = heroId => (D.characters.characters.find(c => c.id === heroId) || {}).weapon;
export const weaponData = id => W().weapons[id] || { name: id, talent: null };
export const weaponXp = id => (prog.weapons[id] && prog.weapons[id].xp) || 0;

/** XP pour passer du niveau lvl au suivant. */
const needFor = lvl => Math.round(W().firstLevelXp * Math.pow(W().growth, lvl - 1));

/** Niveau d'une arme d'après son XP : { lvl, cur, need, pct, max }. */
export function weaponLevel(xp) {
  let lvl = 1, x = xp;
  while (lvl < W().maxLevel && x >= needFor(lvl)) { x -= needFor(lvl); lvl++; }
  const max = lvl >= W().maxLevel, need = max ? 0 : needFor(lvl);
  return { lvl, cur: max ? 0 : x, need, pct: max ? 100 : Math.round(100 * x / need), max };
}

/** Bonus d'une arme à son niveau actuel (neutres si off). */
export function weaponBonuses(id, off = false) {
  const w = weaponData(id), { lvl } = weaponLevel(weaponXp(id)), X = W();
  if (off) return { id, lvl, atk: 1, gauge: 1, talent: {}, gold: false };
  return {
    id, lvl,
    atk: 1 + X.attackPerLevel * (lvl - 1),
    gauge: lvl >= X.gauge.level ? X.gauge.mult : 1,
    talent: lvl >= X.talent.level ? (w.talent || {}) : {},
    gold: lvl >= X.gold.level
  };
}

/** Bonus d'arme actifs pour un combat : neutralisés en Duel sauf si weapons.json → bonus_en_duel. */
export const bonusesOn = battle => !(battle && battle.duel) || W().bonus_en_duel;

/** Paliers franchis : 3 (jauge), 6 (talent), 10 (éclat doré). */
export const milestones = () => [W().gauge, W().talent, W().gold];

/** Texte d'un palier pour une arme. */
export function milestoneText(id, m) {
  if (m === W().talent) return W().talent.label + ' — ' + ((weaponData(id).talent || {}).text || '');
  return m.label;
}

/** Ajoute de l'XP d'arme pendant la partie (Voyage et Histoire seulement ; pas l'Entraînement ni la leçon). */
export function gainWeaponXp(n) {
  if (!n || G.mode !== 'play' || !G.weapon || !G.battle || !W().xpModes.includes(G.battle.xpMode)) return;
  G.weapon.gain += n;
}

/** XP d'arme d'une attaque réussie, selon son niveau de réussite. */
export const attackXp = g => (g && W().xp.attack[g.name]) || 0;
export const xpFor = key => W().xp[key] || 0;

/**
 * Fin de partie : ajoute l'XP gagnée à l'arme du héros joué et la sauvegarde.
 * Renvoie { id, name, gain, before, after, reached: [niveaux atteints], unlocks: [paliers atteints] } ou null.
 */
export function grantWeaponXp() {
  const w = G.weapon;
  if (!w || !G.battle || !W().xpModes.includes(G.battle.xpMode)) return null;
  const s = prog.weapons[w.id] || (prog.weapons[w.id] = { xp: 0 });
  const before = weaponLevel(s.xp);
  s.xp += w.gain;
  saveProg();
  const after = weaponLevel(s.xp);
  const reached = [];
  for (let l = before.lvl + 1; l <= after.lvl; l++) reached.push(l);
  const levels = milestones().map(m => m.level);
  return { id: w.id, name: weaponData(w.id).name, gain: w.gain, before, after, reached, unlocks: reached.filter(l => levels.includes(l)) };
}
