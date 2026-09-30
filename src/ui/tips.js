// Explications à la première rencontre d'un système (data/rules.json → tips) : un petit encadré dans l'écran où il apparaît
// (nouvelle arme, premier talisman, premières Empreintes, premier Duel), montré une seule fois (prog.tips).
import { D } from '../data.js';
import { prog, saveProg } from '../game/progress.js';

const fill = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined ? v[k] : m));

/** Valeurs des textes, tirées des données (jamais recopiées dans les textes). */
function vars() {
  const U = D.duel;
  return { wave: U.waveSeconds, cap: Math.round(U.pressure.cap * 100), win: U.prints.win, loss: Math.abs(U.prints.loss) };
}

/** HTML de l'encadré id s'il n'a jamais été montré (et le note comme vu), sinon ''. */
export function tipOnce(id) {
  const t = D.rules.tips[id];
  if (!t) return '';
  prog.tips = prog.tips || {};
  if (prog.tips[id]) return '';
  prog.tips[id] = true;
  saveProg();
  const v = vars();
  return `<div class="tip-box" role="note"><b>${fill(t.title, v)}</b><span>${fill(t.text, v)}</span></div>`;
}

/** Même explication, en bulle par-dessus l'écran (quand il n'y a pas la place d'un encadré) ; « Compris » la ferme. */
export function tipBubble(id) {
  const html = tipOnce(id);
  if (!html) return;
  const box = document.createElement('div');
  box.id = 'tipBubble';
  box.className = 'tip-layer';
  box.setAttribute('role', 'dialog');
  box.innerHTML = `<div class="tip-bubble">${html}<button class="res-again" data-tip="ok"><span class="ol ol-4">${D.rules.tips.ok}</span></button></div>`;
  for (const t of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend']) box.addEventListener(t, e => e.stopPropagation());
  box.addEventListener('click', e => { if (e.target.closest('[data-tip]')) box.remove(); });
  document.body.appendChild(box);
}
