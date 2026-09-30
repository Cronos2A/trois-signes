// Écrans du Duel (textes : data/duel.json → ui) : menu (adversaire au hasard ou ami), recherche, salon (code, choix du héros),
// attente entre deux vagues (score de l'adversaire en direct), annonce de la pression, écran de fin, nouvelle arène.
// Un seul calque #duel, au-dessus du jeu.
import { D } from '../data.js';
import { activeCharacter } from './lobby.js';
import { whenOnline, pseudo } from '../online/online.js';
import { createRoom, joinRoom, watch, setMine, leaveRoom, current, search } from '../online/duel-net.js';
import { prints, arenaIndex, arenaOf } from '../game/duel-rank.js';
import { sfx, music } from '../audio/audio.js';
import { tipOnce, tipBubble } from './tips.js';
import { tr, nfi } from '../i18n.js';

const nf = nfi;

const U = () => D.duel.ui;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fill = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const heroes = () => D.characters.characters.filter(c => c.available);
let el = null, onClick = null, wait = null, banner = null, liveTimer = 0;

function root() {
  if (el) return el;
  el = document.createElement('div');
  el.id = 'duel';
  el.className = 'du-layer hidden';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-du]');
    if (!b || b.disabled) return;
    sfx('ui_clic');
    if (onClick) onClick(b.dataset.du, b.dataset.arg, b);
  });
  document.body.appendChild(el);
  return el;
}
function screen(html, cls = '') { const r = root(); r.innerHTML = html; r.className = 'du-layer ' + cls; }
export function hideDuelUi() { clearInterval(liveTimer); if (el) { el.className = 'du-layer hidden'; el.innerHTML = ''; } onClick = null; wait = null; }

/* ---------- Menu et salon (avant le combat) ---------- */
/** Ouvre le Duel depuis le lobby. a : { start(room, char) → combat, back() → lobby }. */
export async function openDuel(a) {
  const card = body => `<div class="res-card du-card">
      <div class="res-title ol ol-5 du-title">${U().title}</div>${body}</div>`;
  const menu = (msg = '', code = '') => {
    screen(card(`${rankHtml()}
      <p class="du-text">${U().randomText}</p>
      <button class="res-again" data-du="random"><span class="ol ol-4">${U().random}</span></button>
      <div class="du-sub">${U().friendOr}</div>
      <button class="mini-btn du-create" data-du="create">${U().create}</button>
      <div class="du-join"><input id="duCode" class="du-code-in" maxlength="${D.duel.code.length}" autocomplete="off" autocapitalize="characters"
        spellcheck="false" placeholder="${U().codePlaceholder}" aria-label="${U().codeLabel}" value="${esc(code)}">
        <button class="mini-btn du-join-btn" data-du="join">${U().join}</button></div>
      <div class="du-err" role="alert">${esc(msg)}</div>
      <button class="mini-btn du-back" data-du="back">${U().back}</button>`));
    const inp = root().querySelector('#duCode');
    inp.addEventListener('input', () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') onClick('join'); });
  };
  const busy = t => screen(card(`<p class="du-text du-busy">${esc(t)}</p>`));
  if (!pseudo()) { menu(U().needPseudo); onClick = act => { if (act === 'back') { hideDuelUi(); a.back(); } }; return; }
  busy('…');
  try { await whenOnline(); } catch (e) { menu(U().offline); onClick = act => { if (act === 'back') { hideDuelUi(); a.back(); } }; return; }
  menu();
  onClick = menuClick = async act => {
    if (act === 'back') { hideDuelUi(); a.back(); return; }
    if (act === 'create') {
      busy('…');
      try { await createRoom({ who: who() }); room(a); } catch (e) { menu(U().offline); }
      return;
    }
    if (act === 'random') { findOpponent(a, menu); return; }
    if (act === 'join') {
      const code = (root().querySelector('#duCode') || {}).value || '';
      if (code.length !== D.duel.code.length) { menu(U().notFound, code); return; }
      busy('…');
      let err;
      try { err = await joinRoom(code, who()); } catch (e) { err = 'notFound'; }
      if (err) menu(U()[err] || U().notFound, code); else room(a);
    }
  };
}

/** Mes Empreintes et mon arène, envoyées au salon et à la file d'attente. */
const who = () => ({ prints: prints(), arena: arenaIndex() });
/** Ligne « 340 Empreintes · Hautes-Gerbes » (menu du Duel et onglet Jouer). */
export const printsLine = () => fill(U().printsLine, { prints: nf(prints()), arena: arenaOf(arenaIndex()).name });
const rankHtml = () => `<div class="du-rankline"><span class="du-paw" aria-hidden="true"></span>${esc(printsLine())}</div>`;

/** Recherche d'un adversaire au hasard (écart d'Empreintes élargi avec le temps), annulable ; personne : Réessayer. */
function findOpponent(a, menu) {
  const draw = (lo, hi) => screen(`<div class="res-card du-card">
      <div class="res-title ol ol-5 du-title">${U().randomTitle}</div>
      ${rankHtml()}
      <p class="du-text du-busy-line"><span class="du-wait-dot"></span> ${U().searching}</p>
      <div class="du-sub du-range">${fill(U().searchRange, { min: nf(lo), max: nf(hi) })}</div>
      <button class="mini-btn du-back" data-du="cancel">${U().cancel}</button>
    </div>`, 'search');
  const R = D.duel.random, p = prints();
  draw(Math.max(0, p - R.range), p + R.range);
  let shown = '';
  const job = search(who(), {
    range: (lo, hi) => { const k = lo + '-' + hi; if (k !== shown && el.classList.contains('search')) { shown = k; const r = el.querySelector('.du-range'); if (r) r.textContent = fill(U().searchRange, { min: nf(lo), max: nf(hi) }); } },
    found: () => room(a),
    timeout: () => {
      screen(`<div class="res-card du-card">
          <div class="res-title ol ol-5 du-title">${U().randomTitle}</div>
          <p class="du-text">${U().noOne}</p>
          <button class="res-again" data-du="retry"><span class="ol ol-4">${U().retry}</span></button>
          <button class="mini-btn du-back" data-du="back">${U().back}</button>
        </div>`);
      onClick = act => { if (act === 'retry') findOpponent(a, menu); else if (act === 'back') { menu(); setMenu(); } };
    }
  });
  onClick = async act => { if (act === 'cancel') { await job.cancel(); menu(); setMenu(); } };
  const setMenu = () => { onClick = menuClick; };
}
let menuClick = null;

/** Salon : code à partager, état de l'ami, choix du héros ; le combat part quand les deux sont prêts. */
function room(a) {
  const { uid, code } = current();
  let pick = (heroes().find(c => c.id === activeCharacter().id) || heroes()[0]).id, started = false, gone = false;
  tipBubble('duel');                                             // premier Duel : comment ça se joue (une fois)
  const draw = d => {
    if (started) return;
    const other = d && d.players[d.host === uid ? d.guest : d.host];
    if (!d || (other && other.quit)) { gone = true; screen(`<div class="res-card du-card"><p class="du-text">${U().hostLeft}</p>
      <button class="res-again" data-du="leave"><span class="ol ol-4">${U().back}</span></button></div>`); return; }
    const random = d.mode === 'random';
    const me = d.players[uid] || {}, oid = d.host === uid ? d.guest : d.host, opp = oid ? d.players[oid] : null;
    const heroName = id => (D.characters.characters.find(c => c.id === id) || {}).name || '';
    const friend = !opp ? `<span class="du-wait-dot"></span>${U().waitingFriend}`
      : `<b>${esc(opp.pseudo)}</b>${random ? ` <span class="du-pr">(${fill(U().oppPrints, { prints: nf(opp.prints) })})</span>` : ''} ${opp.ready ? fill(U().readyAs, { hero: heroName(opp.hero) }) : U().choosing}`;
    const grid = heroes().map(c => `<button class="du-hero${c.id === (me.ready ? me.hero : pick) ? ' on' : ''}" data-du="hero" data-arg="${c.id}" ${me.ready ? 'disabled' : ''}>
        <span class="du-face" style="background:${c.color}"><span class="ol ol-4">${esc(c.name[0])}</span></span><span class="du-hname">${esc(c.name)}</span></button>`).join('');
    screen(`<div class="res-card du-card">
        <div class="res-title ol ol-5 du-title">${random ? U().randomTitle : U().friend}</div>
        ${random ? `<div class="du-code-box"><span>${fill(U().arena, { name: esc(arenaOf(Math.max(me.arena || 0, (opp && opp.arena) || 0)).name) })}</span></div>`
          : `<div class="du-code-box"><span>${d.guest ? U().codeLabel : U().shareCode}</span><b class="du-code" aria-label="${U().codeLabel}">${esc(code)}</b></div>`}
        <div class="du-friend">${friend}</div>
        <div class="du-sub">${U().pickHero}</div>
        <div class="du-grid">${grid}</div>
        <button class="res-again" data-du="ready" ${me.ready ? 'disabled' : ''}><span class="ol ol-4">${me.ready ? U().ready + ' ✓' : U().validate}</span></button>
        <button class="mini-btn du-back" data-du="leave">${U().leave}</button>
      </div>`);
    if (opp && me.ready && opp.ready && !started) {
      started = true;
      const char = D.characters.characters.find(c => c.id === me.hero);
      hideDuelUi();
      a.start(d, char);
    }
  };
  watch(draw);
  onClick = (act, arg) => {
    if (act === 'hero') { pick = arg; draw(current().data); }
    else if (act === 'ready') setMine({ hero: pick, ready: true, pseudo: pseudo() });
    else if (act === 'leave') { leaveRoom(!gone); hideDuelUi(); a.back(); }
  };
}

/* ---------- Pendant le combat ---------- */
/** Annonce (compte à rebours du Duel, pression de la vague) ; résolue après seconds. */
export function showBanner(text, seconds) {
  screen(`<div class="du-banner"><span class="ol ol-5">${esc(text)}</span></div>`, 'banner');
  sfx('alerte');
  return new Promise(r => { clearTimeout(banner); banner = setTimeout(() => { if (el && el.classList.contains('banner')) hideDuelUi(); r(); }, seconds * 1000); });
}

/**
 * Attente (l'adversaire n'a pas fini sa vague) : son score en direct et le temps restant, au plus, de sa vague,
 * rafraîchis chaque seconde. live() et eta() : fonctions ; onLeave : « Abandonner ».
 */
export function showWait(title, sub, live, eta, onLeave) {
  if (!el || !el.classList.contains('wait')) {
    screen(`<div class="res-card du-card du-waitcard"><div class="res-title ol ol-5 du-title" id="duWT"></div>
      <div class="du-sub" id="duWS"></div><div class="du-live"><b id="duWL"></b><span id="duWP">${tr('units.points', { n: 2 })}</span></div>
      <div class="du-eta" id="duWE"></div><span class="du-wait-dot big"></span>
      <button class="mini-btn du-back" data-du="abandon">${U().abandon}</button></div>`, 'wait');
  }
  if (onLeave) onClick = act => { if (act === 'abandon') onLeave(); };
  el.querySelector('#duWT').textContent = title;
  el.querySelector('#duWS').textContent = sub;
  const tick = () => {
    const b = el && el.querySelector('#duWL');
    if (!b) { clearInterval(liveTimer); return; }
    const v = live();
    b.textContent = nf(v);
    el.querySelector('#duWP').textContent = tr('units.points', { n: v });
    el.querySelector('#duWE').textContent = eta ? eta() : '';
  };
  tick();
  clearInterval(liveTimer);
  liveTimer = setInterval(tick, 1000);
}
export function hideWait() { if (el && el.classList.contains('wait')) hideDuelUi(); }

/** KO : attente du résultat (la vague de l'adversaire continue), son score en direct. */
export function showWaitResult(text, live, eta, onLeave) {
  showWait(text, '', live, eta, onLeave);
}

/* ---------- Fin ---------- */
/** s : { result: { win, why, n }, me, opp: { name, scores }, pIn, pOut, n } */
export function showResult(s, onHome) {
  clearInterval(liveTimer);
  const r = s.result, title = r.win === 'me' ? U().resultWin : r.win === 'opp' ? U().resultLose : U().resultTie;
  const why = fill(U().why[r.why] || '', { name: s.opp.name, n: r.n || '', s: D.duel.disconnectSeconds });
  const tot = a => a.reduce((x, y) => x + (y || 0), 0);
  const pct = p => (p ? tr('money.plusPct', { n: nf(Math.round(p * 100)) }) : '—');
  const rows = Array.from({ length: s.n }, (_, i) => `<tr><td>${i + 1}</td><td>${s.me.scores[i] != null ? nf(s.me.scores[i]) : '—'}</td>
      <td>${s.opp.scores[i] != null ? nf(s.opp.scores[i]) : '—'}</td><td>${pct(s.pIn[i])}</td><td>${pct(s.pOut[i])}</td></tr>`).join('');
  screen(`<div class="res-card du-card du-result">
      <div class="res-title ol ol-5 ${r.win === 'me' ? 'win' : 'lose'}">${title}</div>
      <div class="du-text">${esc(why)}</div>
      <table class="du-table"><thead><tr><th>${U().tableWave}</th><th>${esc(U().you)}</th><th>${esc(s.opp.name)}</th><th>${U().pressureGot}</th><th>${U().pressureGave}</th></tr></thead>
        <tbody>${rows}<tr class="du-total"><td>${U().tableTotal}</td><td>${nf(tot(s.me.scores))}</td><td>${nf(tot(s.opp.scores))}</td><td></td><td></td></tr></tbody></table>
      ${s.rank ? `<div class="du-rank ${s.rank.delta > 0 ? 'up' : s.rank.delta < 0 ? 'down' : ''}">${fill(U().printsResult, { prints: nf(s.rank.after), delta: (s.rank.delta > 0 ? '+' : s.rank.delta < 0 ? '−' : '±') + Math.abs(s.rank.delta) })}</div>` : ''}
      ${s.rank ? tipOnce('prints') : ''}
      <div class="du-note">${s.rank ? U().noRewardRandom : U().noReward}</div>
      <button class="res-again" data-du="home"><span class="ol ol-4">${U().again}</span></button>
    </div>`, 'result');
  sfx(r.win === 'me' ? 'victoire' : 'defaite');
  music('musique_lobby');
  onClick = act => {
    if (act !== 'home') return;
    if (s.rank && s.rank.newArena != null) showNewArena(s.rank.newArena, () => { hideDuelUi(); onHome(); });
    else { hideDuelUi(); onHome(); }
  };
}

/** « Nouvelle arène débloquée » : palier d'Empreintes franchi pour la première fois. */
export function showNewArena(i, done) {
  const A = arenaOf(i);
  screen(`<div class="res-card du-card du-arena">
      <div class="du-sub">${U().newArena}</div>
      <div class="du-arena-pic" style="--tint:${A.tint}"><span class="ol ol-5">${esc(A.name)}</span></div>
      <div class="du-rank up">${fill(U().newArenaAt, { prints: nf(A.at) })}</div>
      <p class="du-text">${U().newArenaText}</p>
      <button class="res-again" data-du="ok"><span class="ol ol-4">${U().continue}</span></button>
    </div>`, 'result');
  sfx('deblocage');
  onClick = act => { if (act === 'ok') done(); };
}
