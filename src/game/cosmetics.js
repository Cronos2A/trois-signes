// Cosmétiques (data/cosmetics.json) : catalogue, objets possédés, équipement par héros, apparence qui en découle.
// Aucun effet en jeu : seulement l'apparence (couleur de tenue, skin d'arme, tracé, skin complet).
import { D } from '../data.js';
import { prog, saveProg } from './progress.js';

const C = () => D.cosmetics;
export const items = () => C().items;
export const item = id => items().find(i => i.id === id) || null;
export const owned = id => prog.eco.owned.includes(id);
export const slotOf = kind => C().types[kind].slot;

/** Objets qu'un héros peut porter pour un type (les tracés vont à tous). */
export const forHero = (hero, kind) => items().filter(i => i.kind === kind && (kind === 'trail' || i.hero === hero));

/** Donne un objet (achat ou coffre). Renvoie false s'il était déjà possédé. */
export function grant(id) {
  if (owned(id)) return false;
  prog.eco.owned.push(id);
  saveProg();
  return true;
}

/** Équipement d'un héros : { tint, weapon, trail, skin } (ids ou null = d'origine). */
export function equipped(hero) {
  return Object.assign({ tint: null, weapon: null, trail: null, skin: null }, prog.eco.equipped[hero]);
}

/** Équipe (id) ou retire (null) un objet d'un emplacement ; un objet non possédé est refusé. */
export function equip(hero, slot, id) {
  if (id && (!owned(id) || slotOf(item(id).kind) !== slot)) return false;
  const e = prog.eco.equipped[hero] || (prog.eco.equipped[hero] = {});
  e[slot] = id || null;
  saveProg();
  return true;
}

/**
 * Apparence d'un héros : { recolor: { '#hex': '#hex' } | null, skin: id | null, trail: style | null }.
 * Un skin complet remplace la couleur et le skin d'arme (son dessin a ses propres couleurs).
 */
export function look(hero) {
  const e = equipped(hero), valid = id => id && owned(id) ? item(id) : null;
  const skin = valid(e.skin), tint = valid(e.tint), weapon = valid(e.weapon), trail = valid(e.trail);
  let recolor = null;
  if (!skin && (tint || weapon)) recolor = Object.assign({}, tint && tint.recolor, weapon && weapon.recolor);
  return { recolor, skin: skin ? skin.id : null, trail: trail ? trail.trail : null };
}
