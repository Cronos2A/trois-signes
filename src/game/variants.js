// Variantes du sbire selon l'avancée (data/rules.json → sbireVariants) : apparence seulement, mêmes valeurs.
// Voyage : une variante par arène (puis Au-delà du Silence) ; Histoire : une par numéro de combat.
import { D } from '../data.js';

const SV = () => D.rules.sbireVariants;
const keyOf = v => 'v_sbire_' + v;

/** Type d'ennemi concerné (le sbire : « grunt »). */
export const variantType = () => SV().type;

/** Images à préparer (battle.art) pour ces variantes ; fichier manquant : sprite du sbire d'origine. */
export function variantArt(list) {
  return [...new Set(list)].filter(v => SV().variants[v]).map(v => {
    const F = SV().variants[v];
    return { key: keyOf(v), url: F.file, unit: SV().fallback, foot: F.foot, head: F.head, fallback: SV().fallback };
  });
}

/** Nom du sprite de la variante v (sprite d'origine si elle n'existe pas). */
export const variantSprite = v => SV().variants[v] ? keyOf(v) : SV().fallback;

/** Voyage : variante de l'arène (index 0 à 7, au-delà : Au-delà du Silence). */
export const voyageVariant = stage => SV().voyage[stage] || SV().beyond;

/** Voyage : toutes les variantes possibles (préparées au lancement). */
export const voyageVariants = () => [...SV().voyage, SV().beyond];

/** Histoire : variante du combat n (1 à 10). */
export const storyVariant = n => SV().story[Math.max(1, Math.min(n, SV().story.length)) - 1];
