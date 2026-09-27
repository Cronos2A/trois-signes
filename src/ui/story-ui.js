// Écrans du mode Histoire, dans le style du lobby : choix des histoires, chemin des 10 combats,
// défaite et fragment de mémoire. Pur affichage : les actions sont passées par story/story.js.
import { D } from '../data.js';
import { art } from './art.js';
import { glyph, facets } from './icons.js';
import { portraitUrl, pastille } from './assets.js';

const $ = id => document.getElementById(id);
let root = null, handlers = {};

function ensure() {
  if (root) return;
  root = document.createElement('div');
  root.id = 'story';
  root.className = 'lobby story hidden';
  document.body.appendChild(root);
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const f = handlers[b.dataset.act];
    if (f) f(b.dataset.arg);
  });
}

function show(html, on) {
  ensure();
  handlers = on;
  root.innerHTML = facets.bg() + html;
  root.classList.remove('hidden');
}
export function hideStory() { if (root) root.classList.add('hidden'); }

const back = (act, label) => `<button class="st-back" data-act="${act}" aria-label="${label}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15301E" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>`;

/** Choix : les 6 histoires + la carte d'Eldan (verrouillée, puis « Bientôt disponible »). */
export function renderChoice(st, on) {
  const stories = D.story_mode.histoires;
  const cards = stories.map(h => {
    const c = D.characters.characters.find(x => x.id === h.id), n = (st.done[h.id] || []).length, frag = st.fragments.includes(h.id);
    return `<button class="st-card" data-act="pick" data-arg="${h.id}" style="--acc:${h.couleur}">
      <div class="st-portrait" style="background:${c.color}">${facets.med()}${art()[h.id] || ''}</div>
      <div class="st-card-txt"><span class="st-hero">${c.name}</span><b>${h.titre}</b></div>
      <div class="st-prog"><span class="st-pill${n >= 10 ? ' full' : ''}">${n} / 10</span>${frag ? `<span class="st-frag" title="Fragment de mémoire">${glyph('dot', '#FFD23F', 16)}</span>` : ''}</div>
    </button>`;
  }).join('');
  const eldan = st.epilogue
    ? `<div class="st-card eldan open"><div class="st-portrait eldan-p" id="stEldan">${pastille('eldan', 'st-past')}</div>
        <div class="st-card-txt"><span class="st-hero">Eldan</span><b>Le Maître</b></div><div class="st-prog"><span class="st-pill soon">Bientôt disponible</span></div></div>`
    : `<div class="st-card eldan locked"><div class="st-portrait eldan-p"><span class="st-q">???</span></div>
        <div class="st-card-txt"><span class="st-hero">???</span><b>Termine les six histoires</b></div><div class="st-prog"><span class="st-pill">${st.fragments.length} / 6</span></div></div>`;
  show(`<header class="st-head">${back('back', 'Retour au lobby')}<div class="st-titles"><span class="kicker">MODE HISTOIRE</span><span class="st-title">Les six histoires</span></div></header>
    <main class="st-main"><div class="st-grid">${cards}${eldan}</div></main>`, on);
  if (st.epilogue) portraitUrl('eldan', 'neutre').then(u => { const p = $('stEldan'); if (u && p) p.innerHTML = `<img class="cs-img" src="${u}" alt="">`; });
}

/** Chemin d'une histoire : 10 combats, le suivant débloqué à chaque victoire, les gagnés rejouables. */
export function renderMap(h, st, on, toast) {
  const c = D.characters.characters.find(x => x.id === h.id), done = st.done[h.id] || [];
  const next = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find(n => !done.includes(n)) || null;
  const labels = D.rules.story.typeLabels;
  const nodes = h.combats.map(k => {
    const won = done.includes(k.n), open = won || k.n === next;
    const state = won ? 'won' : k.n === next ? 'next' : 'locked';
    const big = k.type !== 'normal' && k.type !== 'rencontre';
    return `<li class="st-node ${state}${big ? ' big' : ''} t-${k.type}">
      <button class="st-step" data-act="play" data-arg="${k.n}" ${open ? '' : 'disabled'}>
        <span class="st-num"><i>${won ? "✓" : k.n}</i></span>
        <span class="st-step-txt"><b>${k.titre}</b><span class="st-type">${labels[k.type] || k.type}</span></span>
        <span class="st-go">${won ? 'Rejouer' : k.n === next ? 'Jouer' : glyph('circle', '#B7C3CE', 16, { outline: 1.6 })}</span>
      </button></li>`;
  }).join('');
  show(`<header class="st-head">${back('back', 'Retour aux histoires')}
      <div class="st-av" style="background:${c.color}">${facets.small()}<span class="ol ol-4">${c.name[0]}</span></div>
      <div class="st-titles"><span class="kicker">${c.name.toUpperCase()} · ${done.length} / 10</span><span class="st-title">${h.titre}</span></div></header>
    <main class="st-main"><p class="st-resume">${h.resume}</p><ol class="st-path" style="--acc:${h.couleur}">${nodes}</ol></main>
    ${toast ? `<div class="st-toast">${toast}</div>` : ''}`, on);
  const cur = root.querySelector('.st-node.next');
  if (cur) cur.scrollIntoView({ block: 'center' });
}

/** Défaite : réessayer sans rejouer le dialogue, le revoir en option, ou revenir au chemin. */
export function renderDefeat(k, on) {
  show(`<div class="st-modal"><div class="st-card-big">
      <div class="res-title ol ol-5 lose">KO</div>
      <div class="st-sub">${k.titre}</div>
      <button class="res-again" data-act="retry"><span class="ol ol-4">Réessayer</span></button>
      <button class="mini-btn st-btn" data-act="review">Revoir le dialogue</button>
      <button class="mini-btn st-btn alt" data-act="back">Retour</button>
    </div></div>`, on);
}

/** Fragment de mémoire obtenu : « Fragment de mémoire : x / 6 ». Résolue sur « Continuer ». */
export function renderFragment(n, h) {
  return new Promise(resolve => show(`<div class="st-modal"><div class="st-card-big">
      <div class="st-frag-big">${glyph('dot', '#FFD23F', 64, { outline: 3.5 })}</div>
      <div class="st-frag-title">Fragment de mémoire : ${n} / 6</div>
      <div class="st-sub">${h.titre}</div>
      <button class="res-again" data-act="ok"><span class="ol ol-4">Continuer</span></button>
    </div></div>`, { ok: resolve }));
}

