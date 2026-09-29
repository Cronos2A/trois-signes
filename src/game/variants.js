// Variantes des ennemis selon l'avancée (data/rules.json → enemyVariants) : sbire, brute, boss ; apparence seulement.
// Voyage : une variante par arène (puis Au-delà du Silence) ; Histoire : une par numéro de combat.
// Tout type d'ennemi dessiné avec un sprite qui a des variantes (sbire, brute, boss) prend celle de l'étape.
import { D } from '../data.js';

const EV = () => D.rules.enemyVariants;
const keyOf = (sprite, v) => `v_${sprite}_${v}`;

/** Images à préparer (battle.art) pour ces variantes ; fichier manquant : sprite d'origine. */
export function variantArt(list) {
  const out = [];
  for (const v of new Set(list)) {
    for (const [sprite, files] of Object.entries(EV().sprites)) {
      const F = files[v];
      if (F) out.push({ key: keyOf(sprite, v), url: F.file, unit: sprite, foot: F.foot, head: F.head, fallback: sprite });
    }
  }
  return out;
}

/**
 * Types d'ennemis avec l'apparence de la variante v : chaque type dont le sprite a une variante reçoit la sienne.
 * types : types du combat ; base : types de data/enemies.json ajoutés s'ils manquent (sbire, brute, boss).
 */
export function applyVariant(types, v, base = D.enemies) {
  const out = { ...types };
  for (const [id, T] of Object.entries(base)) if (!out[id]) out[id] = T;
  for (const [id, T] of Object.entries(out)) {
    const files = EV().sprites[T.sprite];
    if (files && files[v]) out[id] = { ...T, sprite: keyOf(T.sprite, v) };
  }
  return out;
}

/** Voyage : variante de l'arène (index 0 à 7, au-delà : Au-delà du Silence). */
export const voyageVariant = stage => EV().voyage[stage] || EV().beyond;

/** Voyage : toutes les variantes possibles (préparées au lancement). */
export const voyageVariants = () => [...EV().voyage, EV().beyond];

/** Histoire : variante du combat n (1 à 10). */
export const storyVariant = n => EV().story[Math.max(1, Math.min(n, EV().story.length)) - 1];
