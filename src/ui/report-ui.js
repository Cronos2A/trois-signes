// Fenêtre « Signaler un pseudo » (classements, adversaire du Duel) : quatre raisons fixes (data/online.json → report.reasons).
import { D } from '../data.js';
import { sendReport, alreadyReported } from '../online/report.js';
import { sfx } from '../audio/audio.js';
import { tr } from '../i18n.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let el = null;

function show(html) {
  if (!el) {
    el = document.createElement('div');
    el.id = 'reportModal'; el.className = 'rp-modal hidden';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    document.body.appendChild(el);
  }
  el.innerHTML = `<div class="res-card set-card ps-card rp-card">${html}</div>`;
  el.classList.remove('hidden');
  return new Promise(done => { el.onclick = e => { const b = e.target.closest('[data-rp]'); if (!b) return; sfx('ui_clic'); done(b.dataset.rp); }; });
}
function close() { if (el) { el.classList.add('hidden'); el.innerHTML = ''; el.onclick = null; } }

/** Signaler pseudo (board : voyage | duel | adversaire). */
export async function askReport(pseudo, board) {
  const title = `<div class="res-title ol ol-5 set-title">${tr('report.title')}</div><p class="ps-intro rp-name">${esc(tr('report.who', { name: pseudo }))}</p>`;
  const message = async text => { await show(title + `<p class="ps-intro">${text}</p><button class="res-again" data-rp="ok"><span class="ol ol-4">${tr('report.ok')}</span></button>`); close(); };
  if (alreadyReported(pseudo)) return message(tr('report.already'));
  const reasons = D.online.report.reasons.map(r => `<button class="mini-btn rp-reason" data-rp="${r}">${tr('report.reasons.' + r)}</button>`).join('');
  const pick = await show(title + `<p class="ps-intro">${tr('report.ask')}</p>${reasons}<button class="mini-btn rp-cancel" data-rp="cancel">${tr('report.cancel')}</button>`);
  if (pick === 'cancel') { close(); return; }
  show(title + `<p class="ps-intro">${tr('report.sending')}</p>`);
  const r = await sendReport(pseudo, pick, board);
  await message(tr('report.' + r));
}
