// Leçon guidée : sprite provisoire du mannequin d'entraînement (tant que assets/ennemis/mannequin.svg manque)
// et main qui montre le geste. Style du jeu : facettes, contour épais #15301E.
import { INK } from './icons.js';

/** Mannequin : poteau de bois planté, bras en croix, sac de paille facetté ficelé, cible peinte. Pieds en bas au centre. */
export function dummySvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="200" viewBox="0 0 140 200">
  <ellipse cx="70" cy="193" rx="34" ry="6" fill="#000" fill-opacity=".22"/>
  <path d="M52 194 L62 176 L78 176 L88 194 Z" fill="#7A4A2A" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M63 60 L77 60 L78 184 L62 184 Z" fill="#A8683A" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M63 60 L70 60 L70 184 L62 184 Z" fill="#C98A52"/>
  <path d="M8 76 L132 70 L133 84 L9 90 Z" fill="#A8683A" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M8 76 L132 70 L132 76 L8 83 Z" fill="#C98A52"/>
  <path d="M30 70 L110 68 L116 118 L104 158 L36 158 L24 118 Z" fill="#E8C15A" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M30 70 L70 69 L70 158 L36 158 L24 118 Z" fill="#F4D77E"/>
  <path d="M24 118 L70 112 L116 118 L104 158 L70 158 Z" fill="#D2A43E"/>
  <path d="M70 69 L110 68 L116 118 L70 112 Z" fill="#E3B64E"/>
  <path d="M28 96 L112 94 M34 140 L106 140" stroke="#8C5A2B" stroke-width="5" stroke-linecap="round"/>
  <path d="M28 96 L112 94 M34 140 L106 140" stroke="${INK}" stroke-width="2" stroke-dasharray="3 7" stroke-linecap="round"/>
  <circle cx="70" cy="118" r="17" fill="#FF5A3C" stroke="${INK}" stroke-width="4"/>
  <circle cx="70" cy="118" r="8" fill="#FFF1D6" stroke="${INK}" stroke-width="3"/>
  <path d="M26 118 L14 124 L22 128 M114 118 L126 124 L118 128 M40 158 L36 168 M100 158 L104 168" stroke="#F4D77E" stroke-width="4" stroke-linecap="round"/>
  <path d="M50 30 L90 30 L96 58 L84 70 L56 70 L44 58 Z" fill="#E8C15A" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M50 30 L70 30 L70 70 L56 70 L44 58 Z" fill="#F4D77E"/>
  <path d="M60 22 L70 10 L80 22" fill="none" stroke="#F4D77E" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M58 46 L64 46 M76 46 L82 46 M62 58 Q70 62 78 58" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
</svg>`;
}

export const dummyUrl = () => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(dummySvg());

/** Main qui guide le geste (index tendu, pointe en haut à gauche = point de contact). */
export function handSvg(size = 64) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
  <path d="M14 8 C14 3 22 3 22 8 L22 28 L26 27 C29 22 34 23 34 28 C37 24 42 25 42 30 C45 27 50 29 50 34 L50 44 C50 54 44 60 34 60 L28 60 C22 60 18 57 15 52 L6 38 C4 34 9 30 13 34 L14 36 Z"
    fill="#FFF1D6" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M22 28 L22 36 M34 28 L34 36 M42 30 L42 37" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
  <path d="M16 12 L16 30" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>
</svg>`;
}
