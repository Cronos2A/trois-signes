// Compte du joueur : fenêtre « Choisis ton pseudo » (premier lancement, ou Réglages → Modifier) et bloc Compte des Réglages.
// Textes et règles : data/online.json (ui, pseudo). Logique : online/online.js et online/pseudo.js.
import { D } from '../data.js';
import { prog } from '../game/progress.js';
import { setPseudo, pseudo, onlineState, onOnlineChange } from '../online/online.js';
import { checkPseudo, suggestPseudo } from '../online/pseudo.js';
import { sfx } from '../audio/audio.js';

const U = () => D.online.ui;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let open = null;   // fenêtre ouverte : { resolve }

/**
 * Fenêtre du pseudo. canCancel : depuis les Réglages (sinon obligatoire, au premier lancement).
 * Renvoie une promesse résolue avec le pseudo validé (ou null si annulé).
 */
export function askPseudo(canCancel = false) {
  if (open) return open.promise;
  const m = $('pseudoModal');
  const cur = pseudo() || suggestPseudo(), P = D.online.pseudo;
  m.innerHTML = `<div class="res-card set-card ps-card">
      <div class="res-title ol ol-5 set-title">${U().title}</div>
      <p class="ps-intro">${U().intro}</p>
      <div class="ps-field"><input class="ps-input" id="psInput" type="text" maxlength="${P.max}" autocomplete="off" autocapitalize="off" spellcheck="false"
        placeholder="${U().placeholder}" aria-label="${U().placeholder}" value="${esc(cur)}">
        <button class="chip ps-dice" data-pa="suggest">${U().suggest}</button></div>
      <div class="ps-err" id="psErr" role="alert"></div>
      <button class="res-again" data-pa="ok"><span class="ol ol-4">${U().ok}</span></button>
      ${canCancel ? `<button class="mini-btn ps-cancel" data-pa="cancel">${U().cancel}</button>` : ''}
    </div>`;
  m.classList.remove('hidden');
  const input = $('psInput'), err = $('psErr');
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  const close = v => { m.classList.add('hidden'); m.innerHTML = ''; m.onclick = null; open = null; resolve(v); };
  const submit = () => {
    const r = checkPseudo(input.value);
    if (r.error) { err.textContent = r.error; input.focus(); return; }
    setPseudo(r.ok);
    close(r.ok);
  };
  input.addEventListener('input', () => { const r = checkPseudo(input.value); err.textContent = input.value.trim().length >= P.min ? (r.error || '') : ''; });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
  m.onclick = e => {
    const b = e.target.closest('[data-pa]');
    if (!b) return;
    sfx('ui_clic');
    if (b.dataset.pa === 'ok') submit();
    else if (b.dataset.pa === 'cancel') close(null);
    else if (b.dataset.pa === 'suggest') { input.value = suggestPseudo(); err.textContent = ''; }
  };
  open = { promise };
  return promise;
}

/** Premier lancement (après le prologue et la leçon) : pseudo obligatoire s'il n'y en a pas encore. */
export function ensurePseudo() {
  if (pseudo() || !prog.tutorial || !prog.story.prologue) return Promise.resolve(pseudo());
  return askPseudo(false);
}

function statusText(s) {
  const t = U().status[s.state] || U().status.off;
  return s.uid ? `${t} · ${U().id.replace('{id}', s.uid.slice(0, 8))}` : t;
}

/** Bloc Compte des Réglages : pseudo, état du serveur, « Lier mon compte Google » (plus tard). */
export function accountHtml() {
  return `<div class="set-row acc-row"><span class="set-label">${U().account}</span>
      <div class="acc-line"><span class="acc-pseudo">${U().pseudoLabel} : <b>${esc(pseudo() || '—')}</b></span>
        <button class="chip acc-edit" data-act="pseudoEdit">${U().edit}</button></div>
      <span class="acc-status" id="accStatus">${statusText(onlineState())}</span>
      <button class="mini-btn acc-google" disabled aria-disabled="true">${U().google}<small>${U().googleSoon}</small></button>
    </div>`;
}

// L'état du serveur change pendant que les Réglages sont ouverts : la ligne d'état suit.
onOnlineChange(s => { const el = $('accStatus'); if (el) el.textContent = statusText(s); });
