// Jauge et super-attaques. Toutes les valeurs viennent de data/characters.json
// (superGauge pour la jauge, "super" de chaque personnage pour ses effets).
import { D } from '../data.js';
import { G } from './state.js';
import { sfx } from '../audio/audio.js';

const gauge = () => D.characters.superGauge;

/**
 * Après un geste réussi : remplit la jauge selon le niveau (+ bonus si combo). Un raté n'ajoute rien,
 * et la jauge reste vide tant qu'une super est en cours (durée ou charges restantes).
 */
export function addGauge(g, combo) {
  const h = G.hero, J = gauge();
  if (!g || !h || superActive()) return;
  const before = h.gauge, W = G.weapon || {}, T = W.style || {};
  // Arme : jauge plus rapide dès le niveau 3 ; Arc (style) : un Perfect remplit davantage.
  const perfect = !combo && g === D.grades.levels[0] ? 1 + (T.perfectGaugeBonus || 0) : 1;
  const add = (combo ? J.comboBonus : J.gain[g.name] || 0) * (W.gauge || 1) * perfect;
  h.gauge = Math.min(J.max, h.gauge + add);
  if (before < J.max && h.gauge >= J.max) sfx('super_pleine');
}

/** Jauge ajoutée hors geste (Couteaux de lancer : ennemi vaincu), avec les mêmes règles que addGauge. */
export function addGaugeFlat(n) {
  const h = G.hero, J = gauge();
  if (!h || !n || superActive()) return;
  const before = h.gauge;
  h.gauge = Math.min(J.max, h.gauge + n);
  if (before < J.max && h.gauge >= J.max) sfx('super_pleine');
}

/**
 * Passif « Trois gestes » (Eldan) : un Triangle, un Rond et un Toucher réussis à la suite, dans n'importe quel ordre,
 * sans raté entre eux, donnent hero.trioGauge de jauge (+ trioBonus du Bâton d'apprenti), puis le compteur repart à zéro.
 * kind : 'tri' | 'circle' | 'tap' ; g : niveau de réussite, null pour un raté. Renvoie true quand les trois sont réunis.
 */
export function noteSign(kind, g) {
  const h = G.hero;
  if (!h || !h.trioGauge) return false;
  if (!g) { h.trio = []; return false; }
  if (!h.trio.includes(kind)) h.trio.push(kind);
  if (h.trio.length < 3) return false;
  h.trio = [];
  addGaugeFlat(h.trioGauge + ((G.weapon && G.weapon.style && G.weapon.style.trioBonus) || 0));
  return true;
}

/** Une super est en cours tant que sa durée ou ses charges (esquives, combos) ne sont pas épuisées. */
export function superActive() {
  const s = G.hero && G.hero.sp;
  return !!s && (G.time < s.until || s.autoDodges > 0 || s.comboCharges > 0);
}

export const superReady = () => !!G.hero && G.hero.gauge >= gauge().max && !superActive();

const timed = () => { const s = G.hero && G.hero.sp; return s && G.time < s.until ? s : null; };

/** Multiplicateur d'attaque de la super en cours (Ombre, Renouveau). */
export const superAttackMult = () => { const s = timed(); return s ? s.atkMult : 1; };
/** Part des dégâts reçus pendant la super (Rempart). */
export const damageTakenMult = () => { const s = timed(); return s ? s.dmgTaken : 1; };
/** La leçon (Eldan) : nombre de niveaux gagnés par chaque geste réussi (0 hors de la super). */
export const gradeUp = () => { const s = timed(); return s ? s.gradeUp : 0; };
/** Œil de faucon : tout geste reconnu compte comme un Perfect. */
export const perfectMode = () => { const s = timed(); return !!s && s.id === 'faucon'; };

/** Ombre : consomme une esquive automatique si elle en reste. */
export function useAutoDodge() {
  const s = G.hero.sp;
  if (!s || s.autoDodges <= 0) return false;
  s.autoDodges--;
  return true;
}

/** Grimoire ouvert : consomme une attaque traitée comme un combo si elle en reste. */
export function useComboCharge() {
  const s = G.hero.sp;
  if (!s || s.comboCharges <= 0) return false;
  s.comboCharges--;
  return true;
}

/** Démarre la super du héros : vide la jauge et pose ses effets. Renvoie sa config, ou null. */
export function startSuper() {
  if (!superReady()) return null;
  const h = G.hero, S = h.super;
  h.gauge = 0;
  h.sp = {
    id: S.id, name: S.name, col: h.col, start: G.time,
    until: G.time + (S.duration || 0), duration: S.duration || 0,
    atkMult: S.attackMult || 1, dmgTaken: S.damageTaken ?? 1, scale: S.scale || 1,
    autoDodges: S.autoDodges || 0, comboCharges: S.comboCharges || 0, gradeUp: S.gradeUp || 0
  };
  if (S.healPct) h.hp = Math.min(h.max, h.hp + h.max * S.healPct);
  return S;
}
