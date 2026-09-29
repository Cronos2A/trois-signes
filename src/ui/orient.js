// Orientation : le jeu se joue en portrait (data/rules.json → orientation). Le manifeste la fixe une fois le jeu installé ;
// sinon on essaie de la verrouiller, et un téléphone tourné en paysage affiche « Tourne ton téléphone ».
// Pendant ce temps la partie est en pause, sauf en Duel (l'adversaire, lui, continue).
import { D } from '../data.js';
import { G } from '../game/state.js';

// Téléphone en paysage : écran tactile, plus large que haut, et peu de hauteur (une tablette ou un ordinateur ne sont pas concernés).
const LANDSCAPE = '(orientation: landscape) and (pointer: coarse) and (max-height: 540px)';
let box = null, paused = false;

function update(mq) {
  const on = mq.matches;
  box.classList.toggle('hidden', !on);
  if (on && !paused && !(G.battle && G.battle.duel)) { paused = G.paused ? 'already' : true; G.paused = true; }
  if (!on && paused) { if (paused === true) G.paused = false; paused = false; }
}

/** À appeler une fois au démarrage. */
export function initOrientation() {
  const O = D.rules.orientation;
  box = document.createElement('div');
  box.id = 'rotate';
  box.className = 'or-layer hidden';
  box.setAttribute('role', 'alertdialog');
  box.innerHTML = `<div class="or-phone"></div><div class="res-title ol ol-5 or-title">${O.title}</div><p class="or-text">${O.text}</p>`;
  // Écran plein : ses appuis ne deviennent jamais des gestes de jeu.
  for (const t of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend']) box.addEventListener(t, e => e.stopPropagation());
  document.body.appendChild(box);
  try { screen.orientation.lock('portrait').catch(() => {}); } catch (e) { /* navigateur sans verrouillage */ }
  const mq = matchMedia(LANDSCAPE);
  mq.addEventListener('change', () => update(mq));
  update(mq);
}
