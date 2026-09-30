// Récompenses de connexion (data/daily.json), d'après la planche Claude Design « Récompenses de connexion »
// (design/trois-signes-maquette-lobby/project) : fenêtre « Récompense du jour » (première ouverture du jour, après la leçon,
// jamais en partie ni en Duel), écran « Récompenses » (série de 7 jours, calendrier de 30 connexions, stock de boosts),
// bouton cadeau du lobby, proposition de boost au lancement d'une partie, pastille des boosts en combat.
// Textes : data/i18n → daily.* ; icônes : data/daily.json → icons (dessin de secours en code si un fichier manque).
import { D } from '../data.js';
import { G } from '../game/state.js';
import { prog } from '../game/progress.js';
import { dayRewards, streakReward, calendarReward, grantDay, adOffer, grantAd, shownToday, markShown } from '../game/daily.js';
import { boostTypes, stockOf, activeOf, activateBoost, offerable } from '../game/boosts.js';
import { dailyStatus, claimDaily } from '../online/daily-net.js';
import { showRewarded } from '../ads/ads.js';
import { adToast } from './ad-ui.js';
import { showRewards } from './reward-ui.js';
import { sfx } from '../audio/audio.js';
import { tr, nfi } from '../i18n.js';

const DD = () => D.daily;
const $ = id => document.getElementById(id);
let hooks = {}, status = null, win = null, scr = null, offerEl = null, adBusy = false, ready = false;

/** hooks : { refresh() } (lobby : pastille, or et gemmes redessinés). */
export function initDaily(h = {}) { hooks = h; }
/** Démarrage terminé (prologue, leçon, récompenses du lancement) : la fenêtre du jour peut s'ouvrir. */
export function enableDaily() { ready = true; }

/** Pastille du bouton cadeau : jour à récupérer (d'après la dernière lecture du serveur). */
export const dailyDot = () => !!(status && status.ok && status.can);

/* ---------- Icônes (fichier Claude Design, sinon dessin de secours) ---------- */
/** Image d'un fichier ; s'il manque, l'image s'efface et le dessin de secours (juste après) apparaît. */
const img = (src, s, fb = '') => `<span class="dy-img" style="--s:${s}px"><img src="${src}" width="${s}" height="${s}" alt="" draggable="false" onerror="this.remove()">${fb}</span>`;

const giftSvg = s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">
  <rect x="3" y="9" width="18" height="12" rx="2" fill="#FF5A3C" stroke="#15301E" stroke-width="2.2"/>
  <rect x="2" y="6.5" width="20" height="4.5" rx="1.5" fill="#FF8C32" stroke="#15301E" stroke-width="2.2"/>
  <path d="M12 6.5V21" stroke="#15301E" stroke-width="2.2"/>
  <path d="M12 6.5c-1.5-3.6-5.6-3.8-5.6-1.6 0 1.4 2.6 1.6 5.6 1.6zM12 6.5c1.5-3.6 5.6-3.8 5.6-1.6 0 1.4-2.6 1.6-5.6 1.6z" fill="#FFD23F" stroke="#15301E" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
const boostSvg = (type, s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">
  <circle cx="12" cy="12" r="10" fill="${DD().boosts.types[type].color}" stroke="#15301E" stroke-width="2.2"/>
  <path d="M13.2 4.5 7.5 13h4l-1 6.5 6-8.8h-4.1z" fill="#FFF1D6" stroke="#15301E" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
const dotSvg = s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="#FF5A3C" stroke="#15301E" stroke-width="3"/></svg>`;

/** Cadeau du lobby. */
export const giftIcon = (s = 44) => img(DD().icons.gift, s, giftSvg(s));
/** Boost XP ou or. */
export const boostIcon = (type, s = 36) => img(DD().icons.boost[type], s, boostSvg(type, s));
const notifIcon = s => img(DD().icons.notif, s, dotSvg(s));
const activeIcon = s => img(DD().icons.active, s, '');

/* ---------- Une récompense ---------- */
const boostName = type => tr('daily.boost.' + type, { m: nfi(DD().boosts.types[type].mult) });
const games = n => tr('daily.games', { n });
/** Icône d'une récompense (or, gemmes, boost, tirage, coffre). */
function partIcon(p, s) {
  if (p.type === 'gold' || p.type === 'gems') return img(D.economy.icons[p.type], s);
  if (p.type === 'boost') return boostIcon(p.boost, s);
  if (p.type === 'draw') return img(DD().icons.draw, s);
  if (p.type === 'chest') return img(D.economy.chests[p.id].image.closed, s);
  return '';
}
/** Texte court sous le médaillon : « × 250 », « XP ×2 · 3 parties », « Coloris au hasard », « Coffre simple ». */
function partLabel(p) {
  if (p.type === 'gold' || p.type === 'gems') return tr('daily.times', { n: nfi(p.n) });
  if (p.type === 'boost') return boostName(p.boost) + ' · ' + games(p.games);
  if (p.type === 'draw') return tr(p.kind === 'trail' ? 'daily.drawTrail' : 'daily.drawColor');
  if (p.type === 'chest') return D.economy.chests[p.id].name;
  return '';
}
/** Récompense principale d'un jour (le reste s'affiche en petit) : gemmes, coffre, tirage ou boost avant l'or. */
const ORDER = ['gems', 'chest', 'draw', 'boost', 'gold'];
const sorted = parts => parts.slice().sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));

/* ---------- Calque commun ---------- */
function layer(id, cls = 'dy') {
  const el = document.createElement('div');
  el.id = id;
  el.className = cls + ' hidden';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  // Calque plein écran : ses appuis ne deviennent jamais des gestes de jeu.
  for (const t of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend']) el.addEventListener(t, e => e.stopPropagation());
  document.body.appendChild(el);
  return el;
}

/* ---------- Fenêtre « Récompense du jour » ---------- */
const lobbyIdle = () => {
  const shown = id => { const e = $(id); return e && !e.classList.contains('hidden'); };
  const open = ['results', 'settings', 'shopModal', 'pseudoModal', 'story', 'duel', 'ranking', 'reward', 'cutscene', 'testAd', 'launchCover', 'dailyWin', 'dailyScr', 'backConfirm', 'voyageTr', 'boostOffer'];
  return G.mode === 'menu' && shown('lobby') && !open.some(shown) && !$('tipBubble');
};

/** Première ouverture du jour : la fenêtre du jour, une seule fois par jour (jamais pendant une partie ou un Duel). */
export async function maybeDaily() {
  if (!ready || !prog.tutorial || !lobbyIdle()) return;
  status = await dailyStatus();
  if (hooks.refresh) hooks.refresh();
  if (!status.ok || !status.can || shownToday(status.today) || !lobbyIdle()) return;
  markShown(status.today);
  openDayWindow();
}

function openDayWindow() {
  if (!win) {
    win = layer('dailyWin');
    win.addEventListener('click', e => { const b = e.target.closest('[data-dy]'); if (b && !b.disabled) onAct(b.dataset.dy, b, 'win'); });
  }
  renderWin();
  win.classList.remove('hidden');
}

/** Jour à récupérer d'après l'état du serveur. */
const nextOf = st => {
  const d = st.doc || {}, n = DD().streak.length, len = DD().calendar.length;
  return { lastDay: st.today, streak: d.lastDay === st.today - 1 ? (d.streak || 0) % n + 1 : 1, cal: (d.cal || 0) % len + 1 };
};
const dayGoldOf = s => { const R = dayRewards(s); return [...R.streak, ...R.cal].filter(p => p.type === 'gold').reduce((a, p) => a + p.n, 0); };

/** Bouton de pub du jour (vert, pastille « lecture ») : doubler l'or, ou bonus s'il n'y a pas d'or ce jour-là. */
function adButton(today, before) {
  const o = before ? (dayGoldOf(nextOf(status)) > 0 ? { double: true } : { bonus: true, n: DD().ad.bonusGold }) : adOffer(today);
  if (!o || prog.daily.adDay === today) return '';
  const label = o.double ? tr('daily.adDouble') : tr('daily.adBonus', { n: nfi(o.n) });
  return `<button class="dy-ad" data-dy="ad"><i class="dy-play" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21 6 3" fill="#FFF1D6" stroke="#FFF1D6" stroke-width="2.75" stroke-linejoin="round"/></svg></i><span>${label}</span></button>`;
}

/** Carte d'une série : titre, progression, médaillon de la récompense principale, montant, le reste en petit. */
function dayTile(kind, s) {
  const n = DD().streak.length, len = DD().calendar.length;
  const parts = sorted(kind === 'streak' ? streakReward(s.streak) : calendarReward(s.cal)), main = parts[0];
  const head = kind === 'streak'
    ? `<span class="dy-k s">${tr('daily.streakKick', { n: s.streak })}</span><div class="dy-pips">${Array.from({ length: n }, (_, i) => `<i class="${i < s.streak - 1 ? 'on' : i === s.streak - 1 ? 'cur' : ''}"></i>`).join('')}</div>`
    : `<span class="dy-k c">${tr('daily.calKick', { n: s.cal })}</span><div class="dy-bar"><i style="width:${(s.cal / len * 100).toFixed(1)}%"></i></div>`;
  return `<div class="dy-day">
      ${head}
      <div class="dy-medal t-${main.type}">${partIcon(main, main.type === 'gold' ? 92 : 84)}</div>
      <span class="dy-amt">${main.type === 'boost' ? boostName(main.boost) : partLabel(main)}</span>
      ${main.type === 'boost' ? `<span class="dy-extra">${games(main.games)}</span>` : ''}
      ${parts.slice(1).map(p => `<span class="dy-extra">${partIcon(p, 20)}${partLabel(p)}</span>`).join('')}
    </div>`;
}

function renderWin(msg = '') {
  const st = status;
  const done = st && st.ok && !st.can, last = prog.daily.last;
  const s = !done ? nextOf(st) : last && last.day === st.today ? last : { streak: st.doc.streak, cal: st.doc.cal };
  win.innerHTML = `<div class="dy-win">
      <div class="dy-pill"><span>${tr('daily.dayTitle')}</span></div>
      <button class="dy-x" data-dy="close" aria-label="${tr('common.close')}">×</button>
      <div class="dy-two">${dayTile('streak', s)}${dayTile('cal', s)}</div>
      ${msg ? `<div class="dy-msg">${msg}</div>` : ''}
      <div class="dy-btns">
        ${done ? `<div class="dy-done">${tr('daily.claimed')}</div>` : `<button class="dy-claim" data-dy="claim"><span>${tr('daily.claim')}</span></button>`}
        ${adButton(st.today, !done)}
      </div>
    </div>`;
}

/* ---------- Actions ---------- */
async function onAct(act, btn, where) {
  sfx('ui_clic');
  if (act === 'close') { (where === 'win' ? win : scr).classList.add('hidden'); if (hooks.refresh) hooks.refresh(); return; }
  if (act === 'claim') return doClaim(where);
  if (act === 'ad') return doAd(where, btn);
  if (act === 'activate') { if (activateBoost(btn.dataset.arg)) { sfx('deblocage'); adToast(tr('daily.activated', { name: boostName(btn.dataset.arg) })); } renderScr(); return; }
}

const rerender = where => (where === 'win' ? renderWin : renderScr);

/** Récupère le jour : serveur d'abord (une seule fois par jour), puis or, boosts, cosmétiques, gemmes. Renvoie ce qui a été reçu, ou null. */
async function doClaim(where, quiet = false) {
  document.querySelectorAll('[data-dy="claim"],[data-dy="ad"]').forEach(b => { b.disabled = true; });
  const r = await claimDaily();
  if (!r.ok) {
    // Déjà récupéré (double appui, autre appareil) : état relu au serveur. Sans connexion : l'état affiché reste.
    if (r.already) { const st = await dailyStatus(true); if (st.ok) status = st; rerender(where)(tr('daily.already')); }
    else rerender(where)(tr('daily.offline'));
    if (hooks.refresh) hooks.refresh();
    return null;
  }
  status = { ok: true, can: false, today: r.today, doc: r.state };
  const got = grantDay(r.state);
  sfx('deblocage');
  if (hooks.refresh) hooks.refresh();
  rerender(where)(claimLines(got));
  if (!quiet) await showGot(got);
  return got;
}

/** Ce qui a été reçu en or, et les remplacements (tout possédé, stock plein, coffre impossible). */
function claimLines(got) {
  const notes = got.lines.filter(l => l.fallback).map(l => tr(l.full ? 'daily.stockFull' : 'daily.fallback', { n: nfi(l.fallback) }));
  return [got.gold ? tr('units.goldGain', { n: nfi(got.gold) }) : '', ...notes].filter(Boolean).join('<br>');
}

/** Gemmes et cosmétiques : écrans de récompense habituels (regroupés). */
function showGot(got) {
  const list = [];
  if (got.gems) list.push({ kind: 'gems', n: got.gems, text: tr('daily.gemsFor') });
  for (const c of got.cosmetics) list.push({ kind: 'cosmetic', id: c.id, from: c.from });
  return showRewards(list);
}

/** Pub du jour (une fois par jour) : avant la récupération, elle récupère le jour puis double l'or ; après, elle double l'or reçu. */
async function doAd(where, btn) {
  if (adBusy) return;
  adBusy = true;
  btn.disabled = true;
  try {
    if (!await showRewarded()) { adToast(D.ads.ui.rewardLost); btn.disabled = false; return; }
    if (status && status.ok && status.can) {
      const got = await doClaim(where, true);
      if (!got) return;
      const n = grantAd(status.today);
      if (n) adToast(tr('daily.adDone', { n: nfi(n) }));
      if (hooks.refresh) hooks.refresh();
      rerender(where)(claimLines({ ...got, gold: got.gold + n }));
      await showGot(got);
      return;
    }
    const n = grantAd(status && status.today);
    if (n) { sfx('deblocage'); adToast(tr('daily.adDone', { n: nfi(n) })); }
    if (hooks.refresh) hooks.refresh();
    rerender(where)();
  } finally { adBusy = false; }
}

/* ---------- Écran « Récompenses » (bouton cadeau du lobby) ---------- */
export async function openDailyScreen() {
  if (!scr) {
    scr = layer('dailyScr', 'dy dy-full');
    scr.addEventListener('click', e => { const b = e.target.closest('[data-dy]'); if (b && !b.disabled) onAct(b.dataset.dy, b, 'scr'); });
  }
  scr.classList.remove('hidden');
  renderScr();
  const st = await dailyStatus(true);
  if (scr.classList.contains('hidden')) return;
  status = st;
  if (hooks.refresh) hooks.refresh();
  renderScr();
}

const CHECK = s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="#15301E" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

function renderScr(msg = '') {
  const st = status, len = DD().calendar.length, n = DD().streak.length, today = st && st.today;
  const d = (st && st.doc) || {}, claimed = !!(st && st.ok && !st.can), next = st && st.ok ? nextOf(st) : null;
  // Jour du jour : celui à récupérer, ou celui déjà récupéré (coché).
  const curS = claimed ? d.streak : next ? next.streak : 0, curC = claimed ? d.cal : next ? next.cal : 0;
  const state = (k, cur) => (k < cur || (claimed && k === cur) ? 'past' : k === cur ? 'today' : '');
  // Série : 6 cases, puis la 7e en grand.
  const sTile = k => { const p = sorted(streakReward(k))[0], c = state(k, curS);
    return `<div class="dy-st ${c}"><span class="dy-n">${k}</span>${partIcon(p, 26)}${c === 'past' ? `<i class="dy-ok">${CHECK(11)}</i>` : ''}</div>`; };
  const last = sorted(streakReward(n))[0], cl = state(n, curS);
  const streak = Array.from({ length: n - 1 }, (_, i) => sTile(i + 1)).join('') +
    `<div class="dy-st big ${cl}"><span class="dy-badge">${n}</span>${partIcon(last, 56)}${cl === 'past' ? `<i class="dy-ok">${CHECK(11)}</i>` : ''}</div>`;
  // Calendrier : 4 jours ordinaires par ligne, le 5e (tous les 5 jours) en grand dans la colonne de droite.
  const cal = Array.from({ length: len }, (_, i) => {
    const k = i + 1, m = k % 5 === 0, c = state(k, curC), p = sorted(calendarReward(k))[0];
    const icon = c === 'past' && !m ? '' : partIcon(p, m ? 34 : 18);
    return `<div class="dy-ct${m ? ' m' : ''} ${c}"><span class="dy-n">${k}</span>${c === 'past' ? CHECK(m ? 13 : 15) : ''}${icon}</div>`;
  }).join('');
  let action;
  if (!st) action = `<div class="dy-msg">${tr('daily.loading')}</div>`;
  else if (!st.ok) action = `<div class="dy-msg warn">${tr('daily.offline')}</div>`;
  else if (st.can) action = `<button class="dy-claim" data-dy="claim"><span>${tr('daily.claim')}</span></button>${adButton(today, true)}`;
  else action = `<div class="dy-done">${tr('daily.claimedToday')}</div>${adButton(today, false)}<div class="dy-sub">${tr('daily.comeBack')}</div>`;
  const boosts = boostTypes().map(t => {
    const a = activeOf(t), s = stockOf(t);
    const meta = a ? tr('daily.activeLeft', { n: a }) : s.length ? tr('daily.stockGames', { list: s.map(games).join(', ') }) : tr('daily.noStock');
    return `<div class="dy-boost">
        <div class="dy-bi">${boostIcon(t, 36)}<b class="dy-cnt">${tr('daily.count', { n: s.length })}</b></div>
        <div class="dy-bt"><b>${boostName(t)}</b><span>${meta}</span></div>
        <button class="dy-act${a ? ' on' : ''}" data-dy="activate" data-arg="${t}" ${!a && s.length ? '' : 'disabled'}><span>${a ? tr('daily.isActive') : tr('daily.activate')}</span></button>
      </div>`;
  }).join('');
  scr.innerHTML = `<div class="dy-top">
      <button class="dy-back" data-dy="close" aria-label="${tr('common.back')}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15301E" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
      <div class="dy-h ol ol-5">${tr('daily.title')}</div>
    </div>
    <div class="dy-body">
      <div class="dy-cardx">
        <div class="dy-row"><span class="dy-k s">${tr('daily.streakTitle')}</span>${curS ? `<b>${tr('daily.streakDayShort', { n: curS })}</b>` : ''}</div>
        <div class="dy-streak">${streak}</div>
        <div class="dy-sub">${tr('daily.streakNote')}</div>
      </div>
      <div class="dy-cardx">
        <div class="dy-row"><span class="dy-k c">${tr('daily.calTitleLong', { n: len })}</span>${curC ? `<b>${tr('daily.calCountShort', { n: curC, total: len })}</b>` : ''}</div>
        <div class="dy-cal">${cal}</div>
        <div class="dy-sub">${tr('daily.calNote')}</div>
      </div>
      ${msg ? `<div class="dy-msg">${msg}</div>` : ''}
      <div class="dy-action">${action}</div>
      <div class="dy-cardx">
        <span class="dy-k b">${tr('daily.boostsTitle')}</span>
        ${boosts}
        <div class="dy-sub">${tr('daily.boostsNote')}</div>
      </div>
    </div>`;
}

/* ---------- Bouton du lobby ---------- */
/** Bouton rond du lobby : cadeau, pastille quand un jour est à récupérer. */
export const dailyButtonHtml = () => `<button class="dy-gift" data-act="daily" aria-label="${tr('daily.button')}" title="${tr('daily.button')}">${giftIcon(40)}${dailyDot() ? `<span class="dy-notif">${notifIcon(22)}</span>` : ''}</button>`;

/* ---------- Proposition au lancement d'une partie ---------- */
/** Du stock et aucun boost actif de ce type : « Activer un boost ? ». Résolue quand le joueur lance la partie. */
export function offerBoosts() {
  const types = offerable();
  if (!types.length) return Promise.resolve();
  if (!offerEl) offerEl = layer('boostOffer');
  const render = () => {
    offerEl.innerHTML = `<div class="dy-win dy-offer">
        <div class="dy-pill"><span>${tr('daily.offerTitle')}</span></div>
        <p class="dy-sub">${tr('daily.offerText')}</p>
        ${types.map(t => { const a = activeOf(t), s = stockOf(t);
          return `<div class="dy-boost">
              <div class="dy-bi">${boostIcon(t, 36)}<b class="dy-cnt">${tr('daily.count', { n: s.length })}</b></div>
              <div class="dy-bt"><b>${boostName(t)}</b><span>${a ? tr('daily.activeLeft', { n: a }) : games(s[0])}</span></div>
              <button class="dy-act${a ? ' on' : ''}" data-of="${t}" ${a ? 'disabled' : ''}><span>${a ? tr('daily.isActive') : tr('daily.activate')}</span></button>
            </div>`; }).join('')}
        <div class="dy-btns"><button class="dy-claim" data-of="play"><span>${tr('daily.offerPlay')}</span></button></div>
      </div>`;
  };
  render();
  offerEl.classList.remove('hidden');
  return new Promise(resolve => {
    offerEl.onclick = e => {
      const b = e.target.closest('[data-of]');
      if (!b || b.disabled) return;
      sfx('ui_clic');
      if (b.dataset.of === 'play') { offerEl.classList.add('hidden'); offerEl.onclick = null; resolve(); return; }
      if (activateBoost(b.dataset.of)) sfx('deblocage');
      render();
    };
  });
}

/* ---------- Interface de combat ---------- */
/** Pastille des boosts de la partie (planche : bandeau de combat) : boost actif, type, parties restantes (celle-ci comprise). */
export function boostsHudHtml() {
  const B = G.boosts || {}, types = Object.keys(B);
  if (!types.length) return '';
  return `<span class="hud-boost">${activeIcon(26)}${types.map(t => `${boostIcon(t, 20)}<b>${tr('daily.hudLeft', { n: B[t].left })}</b>`).join('')}</span>`;
}
