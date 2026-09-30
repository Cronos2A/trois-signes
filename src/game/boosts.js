// Boosts (data/daily.json → boosts) : XP ×2 (XP du héros et des armes) et or ×2 (or gagné), comptés en parties.
// Reçus par les récompenses de connexion ou achetés dans la boutique (data/economy.json → boosts).
// Sauvegarde : prog.boosts = { stock: { xp: [3, 5], gold: [] }, active: { xp: 0, gold: 0 } } (parties restantes).
// Stock de maxStock au plus par type, un seul boost actif à la fois par type. Seulement dans le Voyage et en Histoire :
// jamais en Duel, dans la leçon ni en Entraînement. Les boosts d'une partie sont figés à son lancement (G.boosts).
import { D } from '../data.js';
import { G } from './state.js';
import { prog, saveProg } from './progress.js';

const B = () => D.daily.boosts;
export const boostTypes = () => Object.keys(B().types);

function S() {
  const s = prog.boosts || (prog.boosts = {});
  s.stock = s.stock || {}; s.active = s.active || {};
  for (const t of boostTypes()) { if (!Array.isArray(s.stock[t])) s.stock[t] = []; s.active[t] = Math.max(0, s.active[t] | 0); }
  return s;
}

export const stockOf = type => S().stock[type];
export const activeOf = type => S().active[type];
export const stockFull = type => stockOf(type).length >= B().maxStock;
export const boostMultOf = type => B().types[type].mult;

/** Ajoute un boost au stock. false si le stock de ce type est plein. */
export function addBoost(type, games) {
  if (!B().types[type] || stockFull(type)) return false;
  stockOf(type).push(games);
  saveProg();
  return true;
}

/** Active le premier boost du stock (un seul actif par type). */
export function activateBoost(type) {
  if (activeOf(type) || !stockOf(type).length) return false;
  S().active[type] = stockOf(type).shift();
  saveProg();
  return true;
}

/** Types qu'on peut proposer au lancement d'une partie : du stock, et aucun boost de ce type déjà actif. */
export const offerable = () => boostTypes().filter(t => !activeOf(t) && stockOf(t).length);

/** Partie où les boosts comptent : Voyage ou combat d'Histoire (ni Duel, ni leçon, ni Entraînement). */
export const boostable = battle => !!battle && !battle.duel && !battle.tutorial && B().modes.includes(battle.xpMode);

/** Lancement d'une partie : multiplicateurs figés pour toute la partie. */
export function startBoosts(battle) {
  G.boosts = {};
  G.boostsCounted = false;
  if (!boostable(battle)) return;
  for (const t of boostTypes()) if (activeOf(t) > 0) G.boosts[t] = { mult: boostMultOf(t), left: activeOf(t) };
}

/** Multiplicateur de la partie en cours pour un type (1 sans boost). */
export const boostMult = type => (G.boosts && G.boosts[type] ? G.boosts[type].mult : 1);

/** Fin d'une partie (victoire, défaite, abandon après au moins 1 round) : une partie de moins par boost actif, une seule fois. */
export function countBoostGame() {
  if (!G.boosts || G.boostsCounted) return;
  G.boostsCounted = true;
  let changed = false;
  for (const t of Object.keys(G.boosts)) if (activeOf(t) > 0) { S().active[t]--; changed = true; }
  if (changed) saveProg();
}

/** Boutique (data/economy.json → boosts) : achat en or. Renvoie { ok } ou { error: 'full' | 'money' }. */
export function buyBoost(type) {
  const P = D.economy.boosts[type];
  if (!P || stockFull(type)) return { error: 'full' };
  if (prog.eco.gold < P.price.gold) return { error: 'money' };
  prog.eco.gold -= P.price.gold;
  stockOf(type).push(P.games);
  saveProg();
  return { ok: true };
}

/** Mode test : plus aucun boost. */
export function resetBoosts() { prog.boosts = null; S(); saveProg(); }
