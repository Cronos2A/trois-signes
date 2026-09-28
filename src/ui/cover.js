// Écran de lancement : couvre le lobby entre le choix d'une partie et l'arène prête (sprites et décor préparés),
// pour que rien ne s'affiche dans le désordre. Les annonces (transition d'arène, souvenir de la leçon, cinématiques)
// passent au-dessus. Aucun texte.
import { facets } from './icons.js';

let el = null;
export function showCover() {
  if (!el) {
    el = document.createElement('div');
    el.id = 'launchCover';
    el.className = 'launch-cover hidden';
    el.innerHTML = facets.bg() + '<div class="lc-dots"><i></i><i></i><i></i></div>';
    for (const t of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend']) el.addEventListener(t, e => e.stopPropagation());
    document.body.appendChild(el);
  }
  el.classList.remove('hidden');
}
export function hideCover() { if (el) el.classList.add('hidden'); }
