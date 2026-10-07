// Écran des classements (data/classement.json, textes data/i18n → ranking et data/online.json → leaderboard.ui), ouvert depuis
// l'onglet Jouer. Sélecteur Duel / Voyage ; Duel : « Mon arène » (bannière de l'arène aux couleurs du fond du lobby,
// data/lobby_themes.json, flèches pour voir les autres arènes), « Global » et « Pays » (badge d'arène sur chaque ligne) ;
// Voyage : « Global » et « Pays ». 50 lignes, puis « Voir plus » ; ma ligne toujours visible en bas ; tirer la liste vers le bas
// pour rafraîchir (sinon cache de 5 minutes) ; hors connexion : dernier classement gardé, marqué « Hors ligne ».
import { D } from '../data.js';
import { fetchView, cachedView, syncBoard, clearRankCache } from '../online/leaderboard.js';
import { pseudo } from '../online/online.js';
import { prog } from '../game/progress.js';
import { arenaIndex } from '../game/duel-rank.js';
import { myCountry, countryUnknown, setCountry, countryName, countryList, flagOf, deviceCountry } from '../game/country.js';
import { sfx } from '../audio/audio.js';
import { askReport } from './report-ui.js';
import { tr, nfi } from '../i18n.js';

const K = () => D.classement, L = () => D.online.leaderboard, U = () => L().ui;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FLAG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 15V2h9l-2 3.5L12 9H4.5" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
const ARROW = d => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}"/></svg>`;
const rankTxt = n => (n === 1 ? U().first : U().rank.replace('{n}', n));
const N = () => D.duel.arenas.thresholds.length;
const myArena = () => arenaIndex((prog.duel && prog.duel.prints) || 0) + 1;

let el = null, ask = 0;
const st = { board: 'duel', view: 'arena', arena: 1, country: null };
const viewOf = () => ({ board: st.board, view: st.view, arena: st.arena, country: st.country });

/* ---------- Petits morceaux ---------- */
function face(id) {
  const c = D.characters.characters.find(h => h.id === id) || D.characters.characters[0];
  return `<span class="rk-face" style="background:${c.color}" title="${esc(c.name)}"><span class="ol ol-3">${esc(c.name[0])}</span></span>`;
}
const theme = n => D.lobby_themes.arenas.find(a => a.arena === n) || D.lobby_themes.arenas[0];
/** Fond aux couleurs du lobby de l'arène n (haut du dégradé : le texte du thème y garde son contraste). */
const themeBg = n => { const g = theme(n).gradient; return `background:linear-gradient(180deg,${g[0]},color-mix(in srgb,${g[0]} 50%,${g[1]}));color:${theme(n).text}`; };
const arenaName = n => (D.voyage.arenas[n - 1] || {}).name || '';
const badge = n => (n ? `<span class="rk-badge" style="${themeBg(n)}" title="${esc(tr('ranking.arenaN', { n }) + ' · ' + arenaName(n))}" aria-label="${esc(tr('ranking.arenaN', { n }))}">${n}</span>` : '');
const flag = c => `<span class="rk-cflag" title="${esc(countryName(c))}" aria-label="${esc(countryName(c))}">${flagOf(c)}</span>`;

/** Liste déroulante des pays (noms dans la langue du jeu), avec « Non précisé » si unspecified. */
export function countrySelect(attrs, current, unspecified = true, placeholder = '') {
  const opt = (v, t) => `<option value="${v}"${(current || '') === v ? ' selected' : ''}>${esc(t)}</option>`;
  return `<select ${attrs}>${placeholder ? `<option value="" disabled${current ? '' : ' selected'}>${esc(placeholder)}</option>` : ''}${unspecified ? opt('', tr('ranking.unspecified')) : ''}` +
    countryList().map(c => opt(c.code, c.name)).join('') + '</select>';
}

/** Change le pays du joueur (Réglages, première ouverture) : enregistré, envoyé au classement, cache oublié. */
export function changeCountry(c) {
  setCountry(c || null);
  clearRankCache();
  syncBoard();
}

/* ---------- Écran ---------- */
function frame(ctx, list, foot) {
  const B = K().boards, views = B.find(b => b.id === st.board).views;
  const boards = B.map(b => { const on = b.id === st.board, label = L().boards.find(x => x.id === b.id).label;
    return `<button class="rk-tab${on ? ' on' : ''}" data-rk="board" data-arg="${b.id}" role="tab" aria-selected="${on}">${esc(label)}</button>`; }).join('');
  const tabs = views.map(v => { const on = v === st.view;
    return `<button class="rk-vtab${on ? ' on' : ''}" data-rk="view" data-arg="${v}" role="tab" aria-selected="${on}">${esc(tr('ranking.view.' + v))}</button>`; }).join('');
  el.innerHTML = `<div class="rk-card res-card" role="dialog" aria-modal="true" aria-label="${esc(U().title)}">
      <div class="rk-head"><div class="res-title ol ol-5 rk-title">${esc(U().title)}</div>
        <button class="rk-close" data-rk="close" aria-label="${esc(U().close)}">×</button></div>
      <div class="rk-tabs" role="tablist">${boards}</div>
      <div class="rk-vtabs" role="tablist" style="--n:${views.length}">${tabs}</div>
      ${ctx}
      <div class="rk-list" id="rkList"><div class="rk-pull" id="rkPull" aria-hidden="true"></div>${list}</div>
      ${foot}
    </div>`;
  pullToRefresh(el.querySelector('#rkList'));
}

/** Contexte au-dessus de la liste : bannière d'arène, choix du pays, ou rien (Global). */
function ctxHtml() {
  if (st.view === 'arena') {
    const n = st.arena, T = D.duel.arenas.thresholds, range = n < N()
      ? tr('ranking.range', { from: nfi(T[n - 1]), to: nfi(T[n] - 1) }) : tr('ranking.rangeTop', { from: nfi(T[n - 1]) });
    return `<div class="rk-arena" style="${themeBg(n)}">
        <button class="car-arrow rk-arrow" data-rk="arena" data-arg="-1" aria-label="${esc(tr('ranking.prevArena'))}"${n <= 1 ? ' disabled' : ''}>${ARROW(-1)}</button>
        <div class="rk-arena-txt"><b>${esc(tr('ranking.arenaN', { n }))} · ${esc(arenaName(n))}</b><span>${esc(range)}</span></div>
        <button class="car-arrow rk-arrow" data-rk="arena" data-arg="1" aria-label="${esc(tr('ranking.nextArena'))}"${n >= N() ? ' disabled' : ''}>${ARROW(1)}</button>
      </div>`;
  }
  if (st.view === 'country') return `<label class="rk-country"><span class="rk-cflag">${flagOf(st.country)}</span>
      ${countrySelect(`data-rk-country aria-label="${esc(tr('ranking.countryAria'))}"`, st.country, false, tr('ranking.pickCountry'))}</label>`;
  return '';
}

function rowHtml(r, me) {
  const mine = r.uid === me.uid, duel = st.board === 'duel';
  return `<div class="rk-row${mine ? ' me' : ''}${r.rank <= 3 ? ' top' + r.rank : ''}">
      <span class="rk-rank">${r.rank}</span>${face(r.hero)}${flag(r.pays)}<span class="rk-name">${esc(r.pseudo)}</span>
      ${duel && st.view !== 'arena' ? badge(r.arene) : ''}<span class="rk-val">${nfi(r.value)}</span>${mine ? ''
        : `<button class="rk-flag" data-rk="report" data-name="${esc(r.pseudo)}" aria-label="${esc(tr('report.button', { name: r.pseudo }))}" title="${esc(tr('report.button', { name: r.pseudo }))}">${FLAG}</button>`}</div>`;
}

/** Ma ligne (toujours visible) et la note dessous. */
function footHtml(res) {
  const me = res ? res.me : null, duel = st.board === 'duel', notes = [];
  if (res && res.offline) notes.push(`<span class="rk-off">${esc(tr('ranking.offline'))}</span>`);
  let line;
  if (!me && res && res.offline) line = '';                          // hors ligne sans rien en cache : seule la mention
  else if (!me || !me.ranked) {
    line = `<div class="rk-me none"><b>${esc(U().unranked)}</b><span>${esc(duel ? tr('ranking.playDuel') : U().unrankedVoyage)}</span></div>`;
  } else if (st.view === 'country' && !me.pays) {
    line = `<div class="rk-me none"><b>${esc(tr('ranking.noCountry'))}</b><span>${esc(tr('ranking.noCountryHint'))}</span></div>`;
  } else {
    line = `<div class="rk-me"><span class="rk-rank">${me.rank ? rankTxt(me.rank) : '—'}</span>${flag(me.pays)}<span class="rk-name">${esc(U().you)} · ${esc(pseudo())}</span>
      ${duel ? badge(me.arene) : ''}<span class="rk-val">${nfi(me.value)}</span></div>`;
    if (duel && st.view === 'arena') {
      const T = D.duel.arenas.thresholds, next = T[me.arene];
      notes.push(`<span>${esc(next === undefined ? tr('ranking.maxArena') : tr('ranking.toNext', { n: next - me.value }))}</span>`);
    }
  }
  return `<div class="rk-foot">${line}${notes.length ? `<div class="rk-note">${notes.join(' · ')}</div>` : ''}</div>`;
}

/** Message quand la liste est (presque) vide : jamais d'écran vide. */
function emptyHtml(res) {
  const rows = res.rows, me = res.me;
  if (st.board === 'duel' && st.view === 'arena') {
    if (me.ranked && st.arena === me.arene && rows.length <= 1) return `<p class="rk-msg">${esc(tr('ranking.firstOfArena'))}</p>`;
    if (!rows.length) return `<p class="rk-msg">${esc(tr('ranking.emptyArena'))}</p>`;
  }
  if (!rows.length) return `<p class="rk-msg">${esc(tr(st.view === 'country' ? 'ranking.emptyCountry' : 'ranking.emptyGlobal'))}</p>`;
  return '';
}

function render(res) {
  const rows = res.rows.map(r => rowHtml(r, res.me)).join('');
  const more = res.more && !res.offline ? `<button class="mini-btn rk-more" data-rk="more">${esc(tr('ranking.more'))}</button>` : '';
  frame(ctxHtml(), rows + emptyHtml(res) + more, footHtml(res));
}

/** Charge la vue en cours (cache récent, sinon le serveur). force : relire le serveur ; more : lignes suivantes. */
async function load(opts = {}) {
  const n = ++ask;
  if (!pseudo()) { frame('', `<p class="rk-msg">${esc(U().needPseudo)}</p>`, ''); return; }
  if (st.view === 'country' && !st.country) { frame(ctxHtml(), `<p class="rk-msg">${esc(tr('ranking.pickCountryHint'))}</p>`, ''); return; }
  if (!opts.more) {
    const c = cachedView(viewOf());                                   // affichage immédiat du cache pendant la lecture
    if (c && !opts.force) render({ ...c, offline: false });
    else if (!opts.force) frame(ctxHtml(), `<p class="rk-msg">${esc(U().loading)}</p>`, footHtml(null));
  }
  let res;
  try { res = await fetchView(viewOf(), opts); }
  catch (e) {
    if (n !== ask) return;
    frame(ctxHtml(), `<p class="rk-msg">${esc(tr('ranking.offlineNoCache'))}</p>`, footHtml({ me: null, offline: true }));
    return;
  }
  if (n !== ask) return;                                              // vue changée entre-temps
  const keep = opts.more && el.querySelector('#rkList') ? el.querySelector('#rkList').scrollTop : null;
  render(res);
  const list = el.querySelector('#rkList');
  if (keep !== null) list.scrollTop = keep;
  else if (!opts.force) { const mine = el.querySelector('.rk-row.me'); if (mine) mine.scrollIntoView({ block: 'center' }); }
}

/* ---------- Tirer vers le bas pour rafraîchir (doigt ou souris) ---------- */
function pullToRefresh(list) {
  const pull = list.querySelector('#rkPull');
  let y0 = null, dy = 0;
  const label = () => { pull.textContent = tr(dy >= K().pullPx ? 'ranking.release' : 'ranking.pull'); pull.style.height = Math.min(dy, K().pullPx * 1.3) + 'px'; };
  const start = y => { if (list.scrollTop <= 0) { y0 = y; dy = 0; } };
  const move = (y, e) => {
    if (y0 === null) return;
    dy = Math.max(0, y - y0);
    if (dy > 4) { if (e.cancelable) e.preventDefault(); label(); }
  };
  const end = () => {
    if (y0 === null) return;
    const go = dy >= K().pullPx;
    y0 = null;
    if (go) { pull.textContent = tr('ranking.refreshing'); sfx('ui_clic'); load({ force: true }); }
    else { pull.style.height = '0px'; pull.textContent = ''; }
    dy = 0;
  };
  list.addEventListener('touchstart', e => start(e.touches[0].clientY), { passive: true });
  list.addEventListener('touchmove', e => move(e.touches[0].clientY, e), { passive: false });
  list.addEventListener('touchend', end);
  list.addEventListener('touchcancel', end);
  list.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') start(e.clientY); });
  list.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && e.buttons) move(e.clientY, e); });
  list.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') end(); });
}

/* ---------- Pays : première ouverture ---------- */
function askCountry() {
  return new Promise(done => {
    const m = document.createElement('div');
    m.className = 'rk-ask';
    m.innerHTML = `<div class="res-card rk-ask-card" role="dialog" aria-modal="true" aria-label="${esc(tr('ranking.askTitle'))}">
        <div class="res-title ol ol-5 rk-ask-title">${esc(tr('ranking.askTitle'))}</div>
        <p class="rk-ask-txt">${esc(tr('ranking.askText'))}</p>
        ${countrySelect(`class="rk-ask-sel" aria-label="${esc(tr('ranking.countryAria'))}"`, deviceCountry() || '', true)}
        <button class="res-again" data-ok><span class="ol ol-4">${esc(tr('ranking.validate'))}</span></button></div>`;
    document.body.appendChild(m);
    m.querySelector('[data-ok]').onclick = () => { sfx('ui_clic'); changeCountry(m.querySelector('select').value); m.remove(); done(); };
  });
}

/** Ouvre l'écran des classements (onglet Jouer). */
export async function openRanking() {
  if (!el) {
    el = document.createElement('div');
    el.id = 'ranking';
    el.className = 'rk hidden';
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-rk]');
      if (e.target === el) { close(); return; }
      if (!b || b.disabled) return;
      sfx('ui_clic');
      const a = b.dataset.rk, arg = b.dataset.arg;
      if (a === 'close') close();
      else if (a === 'board' && arg !== st.board) { st.board = arg; if (!K().boards.find(x => x.id === arg).views.includes(st.view)) st.view = 'global'; load(); }
      else if (a === 'view' && arg !== st.view) { st.view = arg; if (arg === 'arena') st.arena = myArena(); load(); }
      else if (a === 'arena') { st.arena = Math.min(N(), Math.max(1, st.arena + Number(arg))); load(); }
      else if (a === 'more') load({ more: true });
      else if (a === 'report') askReport(b.dataset.name, st.board);
    });
    el.addEventListener('change', e => {
      if (!e.target.matches('[data-rk-country]')) return;
      st.country = e.target.value || null;
      load();
    });
    document.body.appendChild(el);
  }
  st.board = 'duel'; st.view = 'arena'; st.arena = myArena();
  el.classList.remove('hidden');
  if (pseudo() && countryUnknown()) await askCountry();
  st.country = myCountry() || deviceCountry() || null;
  load();
}
function close() { ask++; el.classList.add('hidden'); el.innerHTML = ''; }
/** Écran ouvert ? (bouton Retour du téléphone) */
export const rankingOpen = () => !!el && !el.classList.contains('hidden');
export function closeRanking() { if (rankingOpen()) close(); }
