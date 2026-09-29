// Lobby (onglets Jouer / Personnage / Boutique) et fenêtre de résultats.
// Recréé d'après la maquette Claude Design design/trois-signes-maquette-lobby,
// portraits tirés de la planche design/planche-de-personnages-trois-signes.
import { D } from '../data.js';
import { prog, heroLevel, saveActive } from '../game/progress.js';
import { glyph, facets } from './icons.js';
import { settings, setSetting } from '../game/settings.js';
import { sfx } from '../audio/audio.js';
import { weaponsCardHtml, talismanCardHtml, weaponGainHtml, playWeaponGain, itemIcon } from './weapon-ui.js';
import { equipWeapon, equippedWeapon, weaponData } from '../game/weapons.js';
import { equipTalisman } from '../game/talismans.js';
import { wallet, testMode, addGold, addGems, resetShop, countries } from '../game/economy.js';
import { shopHtml, confirmHtml, boughtHtml, doBuy, oddsHtml, chestIntroHtml, chestRevealHtml, cosmeticCardHtml, heroLobbyHtml, equip, item } from './shop-ui.js';
import { onSkinReady } from './looks.js';
import { showRewarded, afterVoyageResults, watchForGems, watchForChest, setNoAds, noAds, resetAds, adsState, addPlaySeconds } from '../ads/ads.js';
import { adIcon, adToast } from './ad-ui.js';
import { openChest } from '../game/economy.js';
import { moneyIcon, goldGainHtml } from './money.js';
import { accountHtml, askPseudo } from './account-ui.js';

const $ = id => document.getElementById(id);
const nf = n => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
const pct = (a, b) => Math.round(100 * a / b);

const TABS = [['play', 'tri', 'Jouer'], ['char', 'circle', 'Personnage'], ['shop', 'dot', 'Boutique']];
const ui = { tab: 'play', active: 0, view: 0, filter: 'all', tal: null, shopTab: 'chests' };
let actions = {};

const chars = () => D.characters.characters;

/** actions : { solo(), train(), again(), story(), lesson(), duel() } */
export function initLobby(a) {
  actions = a;
  const ring = D.progression.maxRing;                 // anneau doré du niveau maximum
  document.documentElement.style.setProperty('--lvl-ring', ring.color);
  document.documentElement.style.setProperty('--lvl-glow', ring.glow);
  const root = $('lobby');
  root.innerHTML = facets.bg() +
    '<header class="lb-head" id="lbHead"></header>' +
    '<main class="lb-main">' +
    '<section class="lb-panel" id="tab-play"></section>' +
    '<section class="lb-panel" id="tab-char"></section>' +
    '<section class="lb-panel" id="tab-shop"></section>' +
    '</main>' +
    '<nav class="lb-tabs" id="lbTabs"></nav>' +
    '<div class="lb-modal hidden" id="results" role="dialog" aria-modal="true"></div>' +
    '<div class="lb-modal hidden" id="settings" role="dialog" aria-modal="true" aria-label="Réglages"></div>' +
    '<div class="lb-modal hidden" id="shopModal" role="dialog" aria-modal="true"></div>' +
    '<div class="lb-modal hidden" id="pseudoModal" role="dialog" aria-modal="true" aria-label="Pseudo"></div>';
  onSkinReady(() => { if (!$('lobby').classList.contains('hidden')) render(); });   // skin chargé : on le montre
  root.addEventListener('click', onClick);
  // Curseurs de volume : appliqués en direct (game/settings.js prévient le gestionnaire audio).
  root.addEventListener('input', e => {
    const k = e.target.dataset.vol;
    if (!k) return;
    setSetting(k, e.target.value / 100);
    e.target.nextElementSibling.textContent = e.target.value + ' %';
    e.target.style.setProperty('--v', e.target.value + '%');
  });
  root.addEventListener('change', e => { if (e.target.dataset.vol === 'sfx') sfx('ui_clic'); });
  const saved = chars().findIndex(c => c.id === prog.active && c.available);
  if (saved >= 0) ui.active = saved;
  render();
}

/** Personnage choisi dans l'onglet Personnage (celui qui combat). */
export const activeCharacter = () => chars()[ui.active];

export function showLobby() { render(); $('lobby').classList.remove('hidden'); }
/** Progression remplacée (sauvegarde du serveur plus récente) : héros actif et lobby redessinés. */
export function refreshLobby() {
  const saved = chars().findIndex(c => c.id === prog.active && c.available);
  if (saved >= 0) ui.active = ui.view = saved;
  render();
}
export function hideLobby() { $('lobby').classList.add('hidden'); hideResults(); }
export function hideResults() { $('results').classList.add('hidden'); }
const slotOfKind = kind => D.cosmetics.types[kind].slot;
let lastRes = null;
/** Résultats du Voyage : « Doubler l'or » contre une pub (1 fois par partie). */
async function doubleGold(btn) {
  const r = lastRes;
  if (!r || r.doubled || !r.gold) return;
  btn.disabled = true;
  if (!await showRewarded()) { btn.disabled = false; adToast(D.ads.ui.rewardLost); return; }
  r.doubled = true;
  addGold(r.gold);
  const line = $('results').querySelector('.money-gain b');
  if (line) line.textContent = '+' + nf(r.gold * 2) + ' or';
  btn.innerHTML = D.ads.ui.doubled;
  $('lbHead').innerHTML = headHtml();
}
function modal(html, cls = '') { const m = $('shopModal'); m.innerHTML = html; m.className = 'lb-modal ' + cls; }
function closeModal() { $('shopModal').className = 'lb-modal hidden'; $('shopModal').innerHTML = ''; }

function onClick(e) {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const arg = el.dataset.arg;
  sfx(el.dataset.act === 'tab' ? 'ui_onglet' : 'ui_clic');
  switch (el.dataset.act) {
    case 'tab': ui.tab = arg; if (arg === 'char') ui.view = ui.active; render(); break;
    case 'view': ui.view = +arg; render(); break;
    case 'prev': ui.view = (ui.view + chars().length - 1) % chars().length; render(); break;
    case 'next': ui.view = (ui.view + 1) % chars().length; render(); break;
    case 'select': ui.active = ui.view; saveActive(chars()[ui.active].id); render(); break;
    case 'filter': ui.filter = arg; render(); break;
    case 'solo': actions.solo(); break;
    case 'train': actions.train(); break;
    case 'lesson': actions.lesson(); break;
    case 'story': actions.story(); break;
    case 'duel': actions.duel(); break;
    case 'again': afterVoyageResults().then(() => actions.again()); break;   // pub plein écran due (Voyage)
    case 'home': afterVoyageResults().then(() => { hideResults(); ui.tab = 'play'; render(); }); break;
    case 'settings': renderSettings(); $('settings').classList.remove('hidden'); break;
    case 'set': setSetting(el.dataset.key, el.dataset.key === 'vibrate' ? arg === '1' : arg); renderSettings(); break;
    case 'closeSettings': $('settings').classList.add('hidden'); break;
    case 'credits': renderCredits(); break;
    case 'pseudoEdit': askPseudo(true).then(() => { renderSettings(); render(); }); break;
    case 'backSettings': renderSettings(); break;
    case 'equipW': equipWeapon(chars()[ui.view].id, arg); render(); break;
    case 'tal': ui.tal = arg; render(); break;
    case 'equipT': equipTalisman(chars()[ui.view].id, arg); render(); break;
    case 'unequipT': equipTalisman(chars()[ui.view].id, null); render(); break;
    // Boutique (ui/shop-ui.js, game/economy.js)
    case 'shopTab': ui.shopTab = arg; render(); break;
    case 'gemsPlus': ui.tab = 'shop'; ui.shopTab = 'gems'; render(); break;
    case 'toShop': ui.tab = 'shop'; ui.shopTab = 'cosmetics'; render(); break;
    case 'buy': modal(confirmHtml(arg)); break;
    case 'buyOk': {
      const r = doBuy(arg);
      if (r.ok) { const it = r.item; modal(boughtHtml(arg, it.hero || chars()[ui.active].id)); render(); }
      else closeModal();
      break;
    }
    case 'equipNow': { const it = item(arg); equip(el.dataset.hero, slotOfKind(it.kind), arg); closeModal(); render(); break; }
    case 'equipC': equip(chars()[ui.view].id, el.dataset.slot, arg || null); render(); break;
    case 'odds': modal(oddsHtml()); break;
    case 'openChest': modal(chestIntroHtml(arg), 'chest'); break;
    case 'chestReveal': { const h = chestRevealHtml(arg); if (h) modal(h, 'chest'); else closeModal(); render(); break; }
    case 'closeShop': closeModal(); render(); break;
    // Pubs récompensées (ads/ads.js) : récompense seulement si la pub est vue jusqu'au bout
    case 'adDouble': doubleGold(el); break;
    case 'adGems': watchForGems(addGems).then(n => { adToast(n ? D.ads.ui.gemsBtn.replace('{n}', n) : D.ads.ui.rewardLost); render(); }); break;
    case 'adChest': watchForChest(() => openChest(D.ads.rewarded.freeChest.chest, Math.random, true)).then(res => {
      if (res && res.items) modal(chestRevealHtml(D.ads.rewarded.freeChest.chest, res), 'chest'); else adToast(D.ads.ui.rewardLost);
      render();
    }); break;
    case 'testNoAds': setNoAds(!noAds()); renderSettings(); render(); break;
    case 'testGrace': addPlaySeconds(D.ads.interstitial.graceMinutes * 60); renderSettings(); break;
    case 'testResetAds': resetAds(); renderSettings(); render(); break;
    // Mode test (développement)
    case 'testGold': addGold(D.economy.test.gold); renderSettings(); render(); break;
    case 'testGems': addGems(D.economy.test.gems); renderSettings(); render(); break;
    case 'testCountry': wallet().testCountry = arg; addGold(0); renderSettings(); render(); break;
    case 'testReset': resetShop(); renderSettings(); render(); break;
  }
}

function render() {
  $('lbHead').innerHTML = headHtml();
  $('lbTabs').innerHTML = TABS.map(([k, g, label]) => {
    const on = ui.tab === k;
    return `<button class="tab${on ? ' on' : ''}" data-act="tab" data-arg="${k}" aria-pressed="${on}">` +
      glyph(g, on ? '#FFD23F' : '#9ACD32', on ? 22 : 20) + `<span>${label}</span></button>`;
  }).join('');
  for (const [k] of TABS) $('tab-' + k).classList.toggle('on', ui.tab === k);
  $('tab-play').innerHTML = playHtml();
  $('tab-char').innerHTML = charHtml();
  $('tab-shop').innerHTML = shopHtml(ui);
}

/* ---------- Niveau du héros (textes dans data/progression.json → ui) ---------- */
const U = () => D.progression.ui;
const fill = (t, L) => t.replace('{lvl}', L.lvl);
/** « Nv 12 », ou « Nv 100 · MAX » au niveau maximum. */
const lvlText = L => fill(L.max ? U().levelMax : U().level, L);

/* ---------- Haut de page commun ---------- */
function headHtml() {
  const c = chars()[ui.active], L = heroLevel(c.id);
  return `<div class="avatar-wrap">
      <div class="avatar${L.max ? ' lvl-max' : ''}" style="background:${c.color}">${facets.small()}<span class="ol ol-4">${c.name[0]}</span></div>
      <div class="lvl-badge${L.max ? ' max' : ''}">${L.lvl}</div>
    </div>
    <div class="head-info">
      <div class="head-name ol ol-4">${c.name}</div>
      <div class="xpbar${L.max ? ' max' : ''}"><i style="width:${L.max ? 100 : pct(L.cur, L.need)}%"></i>${L.max ? '<b>' + U().barMax + '</b>' : ''}</div>
      <div class="head-xp">${L.max ? lvlText(L) : nf(L.cur) + ' / ' + nf(L.need) + ' XP'}</div>
    </div>
    <div class="head-pills">
      <div class="cur-pill gold" title="Or">${moneyIcon('gold', 22)}<span>${nf(wallet().gold)}</span></div>
      <button class="cur-pill gems" data-act="gemsPlus" title="Gemmes">${moneyIcon('gems', 22)}<span>${nf(wallet().gems)}</span><i class="plus">+</i></button>
    </div>
    <button class="gear-btn" data-act="settings" aria-label="Réglages">${gearIcon(22)}</button>`;
}

/* ---------- 01 · Jouer ---------- */
function playHtml() {
  const c = chars()[ui.active], V = D.voyage, max = prog.voyage.maxArena;
  const far = max < 0 ? null : max < V.arenas.length ? V.arenas[max] : V.beyond;
  // Le Voyage : record et arène la plus lointaine ; une pastille par arène, à sa teinte une fois atteinte.
  const pips = V.arenas.map((a, i) => `<i style="background:${i <= max ? a.tint : '#E4D3B4'}"></i>`).join('');
  return `<div class="stage-card">
      <div class="stage-top">
        <div class="stage-titles"><div class="kicker">SOLO · ${V.name.toUpperCase()}</div><div class="stage-name">${V.name} : record ${nf(prog.best || 0)}</div></div>
      </div>
      <div class="stage-far">Arène max : <b>${far ? far.name : 'aucune'}</b></div>
      <div class="pips">${pips}</div>
    </div>
    <div class="hero-zone">
      <div class="hero-disc">${glyph('circle', c.color, 290, { n: 12, outline: 5, fluid: true })}</div>
      <div class="hero-portrait">${heroLobbyHtml(c.id)}</div>
      <div class="deco deco-tri">${glyph('tri', '#FFD23F', 40)}</div>
      <div class="deco deco-circle">${glyph('circle', '#FF5A3C', 34)}</div>
      <div class="deco deco-dot">${glyph('dot', '#FF8C32', 30)}</div>
      <button class="train-pill lesson-pill" data-act="lesson">${glyph('tri', '#FFD23F', 18)}<span>Revoir la leçon</span></button>
      <button class="train-pill" data-act="train">${glyph('circle', '#3DDC5B', 18)}<span>Entraînement</span></button>
      <div class="name-pill">
        <div class="np-icon" style="background:${c.color}">${itemIcon('armes', equippedWeapon(c.id), 20)}</div>
        <div class="np-txt"><span class="np-name">${c.name}</span><span class="np-line">${c.title} · ${weaponData(equippedWeapon(c.id)).name}</span></div>
      </div>
    </div>
    <div class="mode-row three">
      <button class="mode-btn solo" data-act="solo">
        <span class="badge">PVE</span>
        <span class="mode-txt"><span class="mode-title ol ol-5">Solo</span><span class="mode-sub">Le Voyage</span></span>
        <span class="mode-tri">${glyph('tri', '#FFD23F', 34)}</span>
      </button>
      <button class="mode-btn story" data-act="story">
        <span class="badge">PVE</span>
        <span class="mode-txt"><span class="mode-title ol ol-5">Histoire</span><span class="mode-sub">6 héros · 10 combats</span></span>
      </button>
      <button class="mode-btn duel" data-act="duel">
        <span class="badge">PVP</span>
        <span class="mode-txt"><span class="mode-title ol ol-5">Duel</span><span class="mode-sub">Défier un ami</span></span>
      </button>
    </div>`;
}

/* ---------- 02 · Personnage ---------- */
function charHtml() {
  const list = chars(), N = list.length, vi = ui.view, v = list[vi], L = heroLevel(v.id);
  const car = list.map((c, i) => {
    let off = ((i - vi) % N + N) % N;
    if (off > N / 2) off -= N;
    if (Math.abs(off) > 2) return '';
    const size = off === 0 ? 78 : Math.abs(off) === 1 ? 54 : 40;
    return `<button class="car-item${off === 0 ? ' cur' : Math.abs(off) === 2 ? ' far' : ''}" data-act="view" data-arg="${i}" style="order:${off + 3}" aria-label="${c.name}">
      <span class="car-face" style="width:${size}px;height:${size}px;background:${c.color}">${facets.small()}<span class="ol ol-4" style="font-size:${Math.round(size * 0.46)}px">${c.name[0]}</span></span></button>`;
  }).join('');
  const stats = D.characters.statLabels.map((label, k) =>
    `<div class="stat"><span>${label}</span><div class="pips pips-lg">${[0, 1, 2, 3, 4].map(j => `<i style="background:${j < v.stats[k] ? '#FF8C32' : '#E4D3B4'}"></i>`).join('')}</div></div>`).join('');
  let bottom;
  if (vi === ui.active) bottom = `<div class="char-cta dashed">${glyph('circle', '#9ACD32', 14, { outline: 1.6 })}Personnage actif</div>`;
  else if (v.available) bottom = `<button class="char-cta go" data-act="select"><span class="ol ol-4">Jouer avec ${v.name}</span></button>`;
  else bottom = `<div class="char-cta dashed locked">${glyph('circle', '#9ACD32', 14, { outline: 1.6 })}Disponible bientôt</div>`;
  const soon = !v.available;
  return `<div class="carousel">
      <button class="car-arrow" data-act="prev" aria-label="Personnage précédent"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15301E" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
      <div class="car-track">${car}</div>
      <button class="car-arrow" data-act="next" aria-label="Personnage suivant"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15301E" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
    </div>
    <div class="char-card">
      <div class="char-art${L.max ? ' lvl-max' : ''}" style="background:${v.color}">${facets.med()}${heroLobbyHtml(v.id)}</div>
      <div class="char-info">
        <div>
          <div class="char-name">${v.name}</div>
          <div class="tags"><span class="tag-g">${v.role}</span><span class="tag-y${L.max ? ' max' : ''}">${soon ? 'Bientôt' : lvlText(L)}</span></div>
        </div>
        ${stats}
      </div>
    </div>
    <div class="mini-row">
      <div class="mini-card skill">
        <div class="mini-kicker">${glyph('circle', '#9ACD32', 14, { outline: 1.6 })}PASSIF</div>
        <div class="skill-name">${v.passive.name}</div>
        <div class="skill-text">${v.passive.text}</div>
        <div class="skill-stats"><span>${v.hp} PV</span><span>Attaque ${String(v.attack).replace('.', ',')}</span></div>
      </div>
      <div class="mini-card skill super" style="--acc:${v.accent || v.color}">
        <div class="mini-kicker">${glyph('tri', v.accent || v.color, 14, { outline: 1.6 })}SUPER</div>
        <div class="skill-name">${v.super.name}</div>
        <div class="skill-text">${v.super.text}</div>
      </div>
    </div>
    ${weaponsCardHtml(v.id, v.color)}
    ${talismanCardHtml(v.id, ui.tal)}
    ${cosmeticCardHtml(v.id)}
    ${bottom}`;
}

/* ---------- Réglages (engrenage du haut de page) ---------- */
/** Engrenage à 8 dents, contour épais comme les autres icônes du lobby. */
function gearIcon(s) {
  const teeth = Array.from({ length: 8 }, (_, i) => {
    const a = i * Math.PI / 4, p = (r, d) => `${(12 + r * Math.cos(a + d)).toFixed(2)} ${(12 + r * Math.sin(a + d)).toFixed(2)}`;
    return `L${p(8.2, -0.2)} L${p(10.6, -0.13)} L${p(10.6, 0.13)} L${p(8.2, 0.2)}`;
  }).join(' ');
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path d="M${teeth.slice(1)} Z" fill="#FFD23F" stroke="#15301E" stroke-width="2.2" stroke-linejoin="round"/>
    <circle cx="12" cy="12" r="3.2" fill="#2B8745" stroke="#15301E" stroke-width="2.2"/></svg>`;
}

/** Mode test (développement seulement, data/economy.json → test) : or, gemmes, pays, remise à zéro. */
function testHtml() {
  const T = D.economy.test, U = D.economy.ui, c = wallet().testCountry, cur = c === undefined ? (countries()[0] || '—') : (c || '—');
  const opt = (v, label) => `<button class="chip${(c ?? null) === v ? ' on' : ''}" data-act="testCountry" data-arg="${v ?? ''}">${label}</button>`;
  return `<div class="set-row test-row"><span class="set-label">${U.testTitle}</span>
      <div class="chips set-chips"><button class="chip" data-act="testGold">${U.testGold.replace('{n}', T.gold)}</button><button class="chip" data-act="testGems">${U.testGems.replace('{n}', T.gems)}</button></div>
      <div class="chips set-chips">${opt('BE', 'BE')}${opt('FR', 'FR')}<span class="test-cur">${U.testCountry} : ${cur}</span></div>
      <button class="chip" data-act="testReset">${U.testReset}</button>
      ${adsTestHtml()}</div>`;
}
function adsTestHtml() {
  const A = D.ads.ui, s = adsState();
  return `<div class="chips set-chips"><button class="chip${s.noAds ? ' on' : ''}" data-act="testNoAds">${A.testNoAds}</button><button class="chip" data-act="testGrace">${A.testGrace}</button></div>
      <button class="chip" data-act="testResetAds">${A.testResetAds}</button>
      <span class="test-cur">${A.testState.replace('{min}', Math.floor(s.playSeconds / 60)).replace('{games}', s.voyageGames || 0)}</span>`;
}

function renderSettings() {
  const vol = (k, label) => {
    const v = Math.round(settings[k] * 100);
    return `<div class="set-row"><span class="set-label">${label}</span>
      <div class="set-vol"><input type="range" min="0" max="100" step="5" value="${v}" data-vol="${k}" aria-label="Volume ${label}" style="--v:${v}%"><b>${v} %</b></div></div>`;
  };
  const pick = (key, label, opts) => `<div class="set-row"><span class="set-label">${label}</span>
      <div class="chips set-chips">${opts.map(([val, txt, on]) =>
        `<button class="chip${on ? ' on' : ''}" data-act="set" data-key="${key}" data-arg="${val}" aria-pressed="${on}">${txt}</button>`).join('')}</div></div>`;
  $('settings').innerHTML = `<div class="res-card set-card">
      <div class="res-title ol ol-5 set-title">Réglages</div>
      ${vol('music', 'Musique')}
      ${vol('sfx', 'Effets')}
      ${pick('vibrate', 'Vibrations', [['1', 'Oui', settings.vibrate], ['0', 'Non', !settings.vibrate]])}
      ${accountHtml()}
      <button class="mini-btn set-credits" data-act="credits">Crédits</button>
      ${testMode() ? testHtml() : ''}
      <button class="res-again" data-act="closeSettings"><span class="ol ol-4">Fermer</span></button>
    </div>`;
}

/** Crédits (Réglages → Crédits) : textes dans data/credits.json. */
function renderCredits() {
  const C = D.credits;
  const secs = C.sections.map(s => `<div class="cred-sec"><b>${s.title}</b>${s.lines.map(l => `<span>${l}</span>`).join('')}</div>`).join('');
  $('settings').innerHTML = `<div class="res-card set-card">
      <div class="res-title ol ol-5 set-title">${C.title}</div>
      ${secs}
      <button class="res-again" data-act="backSettings"><span class="ol ol-4">Retour</span></button>
    </div>`;
}

/* ---------- Résultats de partie ---------- */
/** r : { why:'win'|'ko'|'time', score, time, gain, levelUp, record, stats, combos } */
export function showResults(r) {
  lastRes = r;
  ui.tab = 'play';
  render();
  const L = heroLevel(activeCharacter().id);
  const V = r.voyage;
  const title = V ? 'Fin du voyage' : r.why === 'win' ? 'Victoire' : r.why === 'ko' ? 'KO' : 'Temps écoulé';
  const colOf = name => (D.grades.levels.find(g => g.name === name) || D.grades.miss).col;
  const rows = Object.keys(r.stats).map(k =>
    `<div class="res-row"><span><i style="background:${colOf(k)}"></i>${k}</span><b>${r.stats[k]}</b></div>`).join('') +
    `<div class="res-row combo"><span>${glyph('tri', '#FF8C32', 14, { outline: 1.6 })}Combos</span><b>${r.combos}</b></div>`;
  const m = $('results');
  m.innerHTML = `<div class="res-card">
      <div class="res-title ol ol-5 ${r.why === 'win' ? 'win' : 'lose'}">${title}</div>
      ${V ? `<div class="res-score">${nf(r.score)} <small>points</small></div>
      ${r.record ? '<div class="res-record">Nouveau record !</div>' : ''}
      <div class="res-sub">${V.stage < V.total ? 'Arène ' + (V.stage + 1) + ' / ' + V.total : 'Sans fin'} : ${V.name} · round ${V.round + 1} / ${V.rounds}</div>`
      : `<div class="res-sub">${nf(r.score)} points en ${Math.round(r.time)} s${r.record ? ' · nouveau record !' : ''}</div>`}
      <div class="res-table">${rows}</div>
      <div class="res-xp">
        <div class="res-xp-top"><span>${L.max && !r.gain ? U().barMax : '+' + r.gain + ' XP'}</span><span>${r.levelUp ? fill(L.max ? U().maxReached : U().reached, L) : L.max ? lvlText(L) : fill(U().levelLong, L)}</span></div>
        <div class="wbar${L.max ? ' max' : ''}"><i style="width:${L.max ? 100 : pct(L.cur, L.need)}%"></i></div>
      </div>
      ${weaponGainHtml(r.weapon)}
      ${goldGainHtml(r.gold)}
      ${r.gold && r.voyage && D.ads.rewarded.doubleGold.perGame > 0 ? `<button class="mini-btn res-ad ad-btn" data-act="adDouble">${adIcon(22)}${D.ads.ui.doubleGold.replace('{n}', nf(r.gold))}</button>` : ''}
      <button class="res-again" data-act="again"><span class="ol ol-4">Rejouer</span></button>
      <button class="mini-btn res-home" data-act="home">Retour au lobby</button>
    </div>`;
  m.classList.remove('hidden');
  $('lobby').classList.remove('hidden');
  playWeaponGain(m, r.weapon);
}
