// XP, niveaux, sauvegarde locale.
import { D } from '../data.js';
import { readSave, saveProblems } from './save-check.js';

const KEY = 'ts_prog';

export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

// Lecture contrôlée (game/save-check.js) : une sauvegarde illisible ou endommagée ne bloque jamais le lancement.
// Le jeu part alors d'une progression neuve, sans l'écrire tant que le joueur n'a pas choisi (main.js → écran « Sauvegarde endommagée »).
let raw = null;
try { raw = localStorage.getItem(KEY); } catch (e) {}
const first = readSave(raw);
/** État de la sauvegarde locale au lancement : { damaged, problems }. */
export const saveState = { damaged: first.damaged, problems: first.problems };
if (first.damaged) { try { localStorage.setItem(KEY + '_damaged', raw); } catch (e) {} }   // gardée à part, pour comprendre
export const prog = first.data;

/** Complète une sauvegarde (nouvelle, ancienne ou reçue du serveur) avec ce qui lui manque. */
function ensureDefaults() {
  // Chaque personnage a son XP et son niveau, gagnés seulement en le jouant.
  // Une ancienne sauvegarde (XP commune) revient à Aldric, seul jouable jusque-là.
  if (!prog.chars) { prog.chars = { aldric: { xp: prog.xp || 0 } }; delete prog.xp; }
  for (const k of Object.keys(prog)) if (prog[k] === null) delete prog[k];   // bloc vide : recréé ci-dessous
  // Depuis la version 2 : prog.chars[id] = { lvl, xp } (XP dans le niveau) ; conversion dans migrateProgress().

  // Mode Histoire : combats gagnés par histoire, cinématiques vues, fragments de mémoire.
  if (!prog.story) prog.story = { done: {}, seen: {}, fragments: [], prologue: false, epilogue: false };
  fill(prog.story, { done: {}, seen: {}, fragments: [] });
  // Le Voyage : arène la plus lointaine atteinte (index, 8 = Au-delà du Silence) et arènes déjà découvertes.
  // Le meilleur score reste prog.best.
  if (!prog.voyage) prog.voyage = { maxArena: -1, found: [] };
  if (!prog.tips) prog.tips = {};                                  // explications déjà montrées (ui/tips.js)
  fill(prog.voyage, { maxArena: -1, found: [], beaten: [] });   // beaten : arènes dont le gardien a été battu (talismans)
  // Armes et talismans : XP par arme ; armes et talismans débloqués ; arme et talisman équipés par héros.
  if (!prog.weapons) prog.weapons = {};
  if (!prog.armory) prog.armory = {};
  fill(prog.armory, { weapons: [], talismans: [], equipped: {}, talisman: {} });
  // Économie : or, gemmes, gains déjà donnés, cosmétiques possédés et équipés par héros, garantie des coffres.
  if (!prog.eco) prog.eco = {};
  fill(prog.eco, { gold: 0, gems: 0, granted: [], owned: [], equipped: {}, pity: 0, opened: 0 });
  // Profil en ligne : pseudo choisi par le joueur (online/online.js).
  if (!prog.profile) prog.profile = { pseudo: '' };
  if (typeof prog.profile.pseudo !== 'string') prog.profile.pseudo = '';
  // Duel au hasard : Empreintes et plus haute arène déjà annoncée (game/duel-rank.js).
  if (!prog.duel) prog.duel = { prints: 0, unlocked: 0 };
  fill(prog.duel, { prints: 0, unlocked: 0 });
  // Récompenses de connexion (game/daily.js) : fenêtre du jour déjà montrée, pub du jour, dernière récupération ; boosts (game/boosts.js).
  if (!prog.daily) prog.daily = {};
  if (!prog.boosts) prog.boosts = { stock: {}, active: {} };
}
/** Complète un bloc avec les champs qui lui manquent (sauvegarde d'une version plus ancienne). */
function fill(o, defs) { for (const [k, v] of Object.entries(defs)) if (o[k] === undefined || o[k] === null) o[k] = v; }
ensureDefaults();

// Sauvegarde : datée (savedAt, pour savoir laquelle est la plus récente entre l'appareil et le serveur),
// puis signalée à la sauvegarde en ligne (online/online.js), qui l'envoie un peu plus tard.
let onSave = null;
export const onSaved = fn => { onSave = fn; };
export function saveProg() {
  if (saveState.damaged) return;           // sauvegarde endommagée : rien n'est écrit (ni envoyé) avant le choix du joueur
  prog.savedAt = Date.now();
  store.set(KEY, prog);
  if (onSave) onSave();
}

/**
 * Remplace toute la progression (sauvegarde reçue du serveur), sans la redater.
 * Refusée (renvoie false) si elle est elle-même endommagée.
 */
export function replaceProg(data) {
  if (saveProblems(data).length) return false;
  for (const k of Object.keys(prog)) delete prog[k];
  Object.assign(prog, data);
  ensureDefaults();
  store.set(KEY, prog);
  return true;
}

/** Repartir à zéro (sauvegarde endommagée) : progression neuve, écrite tout de suite. */
export function resetProg() {
  for (const k of Object.keys(prog)) delete prog[k];
  ensureDefaults();
  saveState.damaged = false;
  saveProg();
}

const PR = () => D.progression;

/** XP pour passer du niveau n au niveau n+1 (data/progression.json → levelXp). */
export const levelNeed = n => PR().levelXp.base + PR().levelXp.perLevel * n;

/**
 * Convertit une fois les sauvegardes d'avant (XP totale, ancienne courbe) : le niveau est gardé, plafonné,
 * et l'XP dans le niveau repart à zéro. À appeler après le chargement des données.
 */
export function migrateProgress() {
  const L = PR().legacy;
  if ((prog.heroSave || 0) >= L.saveVersion) return;
  for (const c of Object.values(prog.chars)) {
    let lvl = 1, need = L.firstLevelXp, x = c.xp || 0;
    while (x >= need) { x -= need; lvl++; need = Math.round(need * L.growth); }
    c.lvl = Math.min(PR().maxLevel, lvl);
    c.xp = 0;
  }
  prog.heroSave = L.saveVersion;
  saveProg();
}

const hero = id => prog.chars[id] || (prog.chars[id] = { lvl: 1, xp: 0 });

/** Niveau d'un héros : { lvl, cur (XP dans le niveau), need, max (niveau maximum atteint) }. */
export function heroLevel(id) {
  const c = prog.chars[id] || {}, lvl = c.lvl || 1, max = lvl >= PR().maxLevel;
  return { lvl, cur: max ? 0 : c.xp || 0, need: levelNeed(lvl), max };
}

/** Ajoute n XP au héros (rien au niveau maximum). Renvoie { gain, before, after, max }. */
export function addXp(id, n) {
  const c = hero(id), before = c.lvl || 1, M = PR().maxLevel;
  c.lvl = before;
  let gain = 0;
  if (c.lvl < M && n > 0) {
    gain = n;
    c.xp = (c.xp || 0) + n;
    while (c.lvl < M && c.xp >= levelNeed(c.lvl)) { c.xp -= levelNeed(c.lvl); c.lvl++; }
    if (c.lvl >= M) c.xp = 0;                   // plus d'XP accumulée au niveau maximum
  }
  saveProg();
  return { gain, before, after: c.lvl, max: c.lvl >= M };
}

/** Retient le personnage choisi dans le lobby pour les prochaines sessions. */
export function saveActive(id) { prog.active = id; saveProg(); }

/** Bonus de niveau : multiplicateurs d'attaque et de PV max. En Duel, neutralisés si bonus_en_duel vaut false. */
export function levelBonuses(id, duel = false) {
  if (duel && !PR().bonus_en_duel) return { atk: 1, hp: 1 };
  const k = heroLevel(id).lvl - 1, B = PR().bonusPerLevel;
  return { atk: 1 + B.attack * k, hp: 1 + B.hp * k };
}

/** XP d'une partie du Voyage : par round terminé et par gardien vaincu (data/progression.json → xp.voyage). */
export function voyageXp(rounds, guardians) {
  const X = PR().xp.voyage;
  return X.perRound * rounds + X.perGuardian * guardians;
}

/** Ajoute l'XP d'une partie et retient le record (Voyage seulement). Renvoie { gain, before, after, max, record }. */
export function grantXp(id, xp, score, countRecord = true) {
  const r = addXp(id, xp);
  const record = countRecord && score > (prog.best || 0);
  if (record) { prog.best = score; saveProg(); }
  return { ...r, record };
}

/** Le Voyage : note l'arène atteinte. Renvoie true la première fois qu'elle est découverte. */
export function reachArena(id, index) {
  const V = prog.voyage, first = !V.found.includes(id);
  if (first) V.found.push(id);
  if (index > V.maxArena) V.maxArena = index;
  saveProg();
  return first;
}
