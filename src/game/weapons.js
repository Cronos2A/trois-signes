// Armes (valeurs et textes dans data/weapons.json). Trois armes par héros : celle de départ et deux alternatives,
// débloquées en Histoire (combats 5 et 10). Chaque arme a son XP et son niveau ; l'XP appartient à l'arme, pas au skin.
// Chaque arme a un effet de style : à startPower de sa force au niveau 1, complet au niveau fullLevel.
// Les autres bonus de niveau sont communs : attaque par niveau, jauge au niveau 3, éclat doré au niveau 10.
// L'XP se gagne en combat (Voyage et Histoire seulement) et n'est sauvegardée qu'en fin de partie.
import { D } from '../data.js';
import { G } from './state.js';
import { prog, saveProg } from './progress.js';
import { nf } from '../i18n.js';
import { boostMult } from './boosts.js';

const W = () => D.weapons;
const AR = prog.armory;                                                  // armes débloquées et équipées (progress.js)

export const weaponData = id => W().weapons[id] || { name: id, style: { text: '', scale: {} } };
export const weaponXp = id => (prog.weapons[id] && prog.weapons[id].xp) || 0;
export const heroWeapons = heroId => W().heroes[heroId] || [];
export const startWeapon = heroId => heroWeapons(heroId)[0];

/** Une arme de départ est toujours disponible ; les autres une fois débloquées. */
export const weaponUnlocked = id => !weaponData(id).unlock || AR.weapons.includes(id);

/** Arme équipée par un héros (celle de départ tant qu'il n'en a pas choisi d'autre). */
export function equippedWeapon(heroId) {
  const id = AR.equipped[heroId];
  return id && heroWeapons(heroId).includes(id) && weaponUnlocked(id) ? id : startWeapon(heroId);
}
export function equipWeapon(heroId, id) {
  if (!heroWeapons(heroId).includes(id) || !weaponUnlocked(id)) return;
  AR.equipped[heroId] = id;
  saveProg();
}

/** Débloque une arme. Renvoie true si elle ne l'était pas encore. */
export function unlockWeapon(id) {
  if (weaponUnlocked(id)) return false;
  AR.weapons.push(id);
  saveProg();
  return true;
}

/** XP pour passer du niveau lvl au suivant (data/weapons.json → levels : niveau 2, 3, … maxLevel). */
const needFor = lvl => W().levels[lvl - 1];

/** Niveau d'une arme d'après son XP : { lvl, cur, need, pct, max }. */
export function weaponLevel(xp) {
  let lvl = 1, x = xp;
  while (lvl < W().maxLevel && x >= needFor(lvl)) { x -= needFor(lvl); lvl++; }
  const max = lvl >= W().maxLevel, need = max ? 0 : needFor(lvl);
  return { lvl, cur: max ? 0 : x, need, pct: max ? 100 : Math.round(100 * x / need), max };
}

/** Force de l'effet de style au niveau lvl : startPower au niveau 1, 100 % au niveau fullLevel. */
export function stylePower(lvl) {
  const S = W().style;
  return Math.min(1, S.startPower + (1 - S.startPower) * (lvl - 1) / (S.fullLevel - 1));
}

/** Effet de style à une force donnée : valeurs « scale » multipliées, valeurs « fixed » telles quelles. */
export function styleAt(id, power) {
  const s = weaponData(id).style || {}, out = { power, ...(s.fixed || {}) };
  for (const [k, v] of Object.entries(s.scale || {})) out[k] = v * power;
  return out;
}

/**
 * Bonus d'une arme pour un combat. duel : bonus de niveau neutralisés (sauf weapons.json → bonus_en_duel),
 * effet de style à la force duel.stylePower, ou aucun si l'arme n'est pas autorisée en Duel.
 */
export function weaponBonuses(id, duel = false) {
  const X = W(), { lvl } = weaponLevel(weaponXp(id)), levelOn = !duel || X.bonus_en_duel;
  const styleOn = !duel || weaponData(id).autorise_en_duel;
  return {
    id, lvl,
    atk: levelOn ? 1 + X.attackPerLevel * (lvl - 1) : 1,
    gauge: levelOn && lvl >= X.gauge.level ? X.gauge.mult : 1,
    gold: levelOn && lvl >= X.gold.level,
    style: styleOn ? styleAt(id, duel && !X.bonus_en_duel ? X.duel.stylePower : stylePower(lvl)) : {}
  };
}

/** Paliers communs affichés (niveau 3 : jauge ; fullLevel : effet complet ; niveau 10 : éclat doré). */
export const milestones = () => [W().gauge, { level: W().style.fullLevel, label: W().style.label }, W().gold];

/** Texte d'effet d'une arme avec ses valeurs à la force donnée ({clé} → valeur, en % si listée dans percentKeys). */
export function styleText(id, power = 1) {
  const s = weaponData(id).style || {}, v = styleAt(id, power), P = W().percentKeys || [];
  return (s.text || '').replace(/\{(\w+)\}/g, (_, k) => {
    const n = P.includes(k) ? v[k] * 100 : v[k];
    return n === undefined ? '' : nf(Math.round(n * 100) / 100);
  });
}

/** Ajoute de l'XP d'arme pendant la partie (Voyage et Histoire seulement ; pas l'Entraînement ni la leçon). */
export function gainWeaponXp(n) {
  if (!n || G.mode !== 'play' || !G.weapon || !G.battle || !W().xpModes.includes(G.battle.xpMode)) return;
  G.weapon.gain += n;
}

export const attackXp = g => (g && W().xp.attack[g.name]) || 0;
export const xpFor = key => W().xp[key] || 0;

/**
 * Fin de partie : ajoute l'XP gagnée (× talisman Page du Codex) à l'arme jouée et la sauvegarde.
 * Renvoie { id, name, gain, before, after, reached, unlocks } ou null.
 */
export function grantWeaponXp() {
  const w = G.weapon;
  if (!w || !G.battle || !W().xpModes.includes(G.battle.xpMode)) return null;
  // XP d'arme : × gainMult (data/weapons.json → xp), × talisman Page du Codex.
  const gain = Math.round(w.gain * (W().xp.gainMult || 1) * ((G.talisman && G.talisman.weaponXpMult) || 1) * boostMult('xp'));   // + boost XP ×2
  const s = prog.weapons[w.id] || (prog.weapons[w.id] = { xp: 0 });
  const before = weaponLevel(s.xp);
  s.xp += gain;
  saveProg();
  const after = weaponLevel(s.xp);
  const reached = [];
  for (let l = before.lvl + 1; l <= after.lvl; l++) reached.push(l);
  const levels = milestones().map(m => m.level);
  return { id: w.id, name: weaponData(w.id).name, gain, before, after, reached, unlocks: reached.filter(l => levels.includes(l)) };
}
