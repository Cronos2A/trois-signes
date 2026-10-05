// Fond de l'accueil selon l'arène de Duel (data/lobby_themes.json) : dégradé et facettes seulement, posés sous tout le reste
// du lobby (ni boutons, ni cartes, ni onglets ne changent). Arène : la plus haute atteinte (source "max", game/duel-rank.js → maxArena)
// ou celle des Empreintes actuelles (source "actuelle"). Changement d'arène : fondu de fadeMs (par exemple au retour de l'écran
// « Nouvelle arène débloquée »). Outils de test (Réglages, développement seulement) : aperçu des 8 fonds.
import { D } from '../data.js';
import { facetSvg } from './icons.js';
import { maxArena, arenaIndex } from '../game/duel-rank.js';

const T = () => D.lobby_themes;
let shown = 0, preview = 0, box = null;

/** Thème de l'arène n (1 à 8), repli sur l'arène 1. */
export const themeOf = n => T().arenas.find(a => a.arena === n) || T().arenas[0];
/** Arène dont le fond est affiché : aperçu de test, sinon d'après data/lobby_themes.json → source. */
export const themeArena = () => preview || (T().source === 'actuelle' ? arenaIndex() + 1 : maxArena());
/** Outils de test : aperçu du fond de l'arène n (0 : revenir au vrai fond). Pas sauvegardé. */
export function previewTheme(n) { preview = n || 0; }
export const previewed = () => preview;

/** Calque d'un thème : dégradé + facettes. */
function layer(th) {
  const el = document.createElement('div');
  const [a, b, c] = th.gradient;
  el.className = 'lb-theme-layer';
  el.style.background = `linear-gradient(180deg,${a} 0%,${b} 45%,${c} 100%)`;
  el.innerHTML = facetSvg(6, 13, th.facets.seed, th.facets.intensity);
  return el;
}

/** Pose le fond de l'arène voulue dans le lobby ; fondu si une autre arène était déjà affichée. */
export function applyLobbyTheme(root) {
  const n = themeArena(), th = themeOf(n);
  if (!box || !box.isConnected) {
    box = document.createElement('div');
    box.className = 'lb-theme';
    box.setAttribute('aria-hidden', 'true');
    root.prepend(box);
    shown = 0;
  }
  root.style.setProperty('--on-bg', th.text);
  root.dataset.arena = String(n);
  if (n === shown) return;
  const el = layer(th), old = [...box.children], fade = shown !== 0;
  shown = n;
  box.appendChild(el);
  if (!fade) { old.forEach(o => o.remove()); return; }
  const ms = T().fadeMs;
  el.style.opacity = '0';
  el.style.transition = `opacity ${ms}ms ease-in-out`;
  requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = '1'; }));
  setTimeout(() => old.forEach(o => o.remove()), ms + 50);
}
