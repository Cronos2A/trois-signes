// Écran des classements (data/online.json → leaderboard.ui) : onglets Voyage / Duel, top 100 mondial
// (rang, héros favori, pseudo, score) et position du joueur en bas. Ouvert depuis l'onglet Jouer.
import { D } from '../data.js';
import { fetchBoard } from '../online/leaderboard.js';
import { pseudo } from '../online/online.js';
import { sfx } from '../audio/audio.js';
import { tr, nfi } from '../i18n.js';

const nf = nfi;

const L = () => D.online.leaderboard, U = () => L().ui;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rankTxt = n => (n === 1 ? U().first : U().rank.replace('{n}', n));
let el = null, tab = 'voyage', ask = 0;

function face(id) {
  const c = D.characters.characters.find(h => h.id === id) || D.characters.characters[0];
  return `<span class="rk-face" style="background:${c.color}" title="${esc(c.name)}"><span class="ol ol-3">${esc(c.name[0])}</span></span>`;
}

function shell(body, foot = '') {
  const tabs = L().boards.map(b => `<button class="rk-tab${b.id === tab ? ' on' : ''}" data-rk="tab" data-arg="${b.id}" role="tab" aria-selected="${b.id === tab}">${esc(b.label)}</button>`).join('');
  el.innerHTML = `<div class="rk-card res-card" role="dialog" aria-modal="true" aria-label="${esc(U().title)}">
      <div class="rk-head"><div class="res-title ol ol-5 rk-title">${esc(U().title)}</div>
        <button class="rk-close" data-rk="close" aria-label="${esc(U().close)}">×</button></div>
      <div class="rk-tabs" role="tablist">${tabs}</div>
      <div class="rk-sub">${esc(U().world.replace('{n}', L().top))} · ${esc(L().boards.find(b => b.id === tab).scoreLabel)}</div>
      <div class="rk-list">${body}</div>
      ${foot}
    </div>`;
}

async function load() {
  const n = ++ask, B = L().boards.find(b => b.id === tab);
  shell(`<p class="rk-msg">${esc(U().loading)}</p>`);
  if (!pseudo()) { shell(`<p class="rk-msg">${esc(U().needPseudo)}</p>`); return; }
  let res;
  try { res = await fetchBoard(tab); } catch (e) { if (n === ask) shell(`<p class="rk-msg">${esc(U().offline)}</p>`); return; }
  if (n !== ask) return;                                              // onglet changé entre-temps
  const rows = res.rows.map(r => `<div class="rk-row${r.uid === res.me.uid ? ' me' : ''}${r.rank <= 3 ? ' top' + r.rank : ''}">
      <span class="rk-rank">${r.rank}</span>${face(r.hero)}<span class="rk-name">${esc(r.pseudo)}</span><span class="rk-val">${nf(r.value)}</span></div>`).join('');
  const me = res.me.rank
    ? `<div class="rk-me"><span class="rk-rank">${rankTxt(res.me.rank)}</span><span class="rk-name">${esc(U().you)} · ${esc(pseudo())}</span><span class="rk-val">${nf(res.me.value)}</span></div>`
    : `<div class="rk-me none"><b>${esc(U().unranked)}</b><span>${esc(B.id === 'voyage' ? U().unrankedVoyage : U().unrankedDuel)}</span></div>`;
  shell(rows || `<p class="rk-msg">${esc(U().empty)}</p>`, me);
  const mine = el.querySelector('.rk-row.me');
  if (mine) mine.scrollIntoView({ block: 'center' });
}

/** Ouvre l'écran des classements (onglet Jouer). */
export function openRanking() {
  if (!el) {
    el = document.createElement('div');
    el.id = 'ranking';
    el.className = 'rk hidden';
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-rk]');
      if (e.target === el) { close(); return; }
      if (!b) return;
      sfx('ui_clic');
      if (b.dataset.rk === 'close') close();
      else if (b.dataset.rk === 'tab' && b.dataset.arg !== tab) { tab = b.dataset.arg; load(); }
    });
    document.body.appendChild(el);
  }
  el.classList.remove('hidden');
  load();
}
function close() { ask++; el.classList.add('hidden'); el.innerHTML = ''; }
