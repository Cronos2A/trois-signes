// Lobby (onglets Jouer / Personnage / Boutique) et fenêtre de résultats.
// Recréé d'après la maquette Claude Design design/trois-signes-maquette-lobby,
// portraits tirés de la planche design/planche-de-personnages-trois-signes.
import { D } from '../data.js';
import { prog, heroLevel, saveActive } from '../game/progress.js';
import { art } from './art.js';
import { glyph, wIcon, trailIcon, facets } from './icons.js';
import { settings, setSetting } from '../game/settings.js';
import { sfx } from '../audio/audio.js';
import { weaponsCardHtml, talismanCardHtml, weaponGainHtml, playWeaponGain, itemIcon } from './weapon-ui.js';
import { equipWeapon, equippedWeapon, weaponData } from '../game/weapons.js';
import { equipTalisman } from '../game/talismans.js';

const $ = id => document.getElementById(id);
const nf = n => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
const pct = (a, b) => Math.round(100 * a / b);

const TABS = [['play', 'tri', 'Jouer'], ['char', 'circle', 'Personnage'], ['shop', 'dot', 'Boutique']];
const ui = { tab: 'play', active: 0, view: 0, filter: 'all', tal: null };
let actions = {};

const chars = () => D.characters.characters;

/** actions : { solo(), train(), again(), story(), lesson() } */
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
    '<div class="lb-modal hidden" id="settings" role="dialog" aria-modal="true" aria-label="Réglages"></div>';
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
export function hideLobby() { $('lobby').classList.add('hidden'); hideResults(); }
export function hideResults() { $('results').classList.add('hidden'); }

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
    case 'again': actions.again(); break;
    case 'home': hideResults(); ui.tab = 'play'; render(); break;
    case 'settings': renderSettings(); $('settings').classList.remove('hidden'); break;
    case 'set': setSetting(el.dataset.key, el.dataset.key === 'vibrate' ? arg === '1' : arg); renderSettings(); break;
    case 'closeSettings': $('settings').classList.add('hidden'); break;
    case 'credits': renderCredits(); break;
    case 'backSettings': renderSettings(); break;
    case 'equipW': equipWeapon(chars()[ui.view].id, arg); render(); break;
    case 'tal': ui.tal = arg; render(); break;
    case 'equipT': equipTalisman(chars()[ui.view].id, arg); render(); break;
    case 'unequipT': equipTalisman(chars()[ui.view].id, null); render(); break;
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
  $('tab-shop').innerHTML = shopHtml();
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
      <div class="cur-pill" title="Meilleur score">${glyph('tri', '#FFD23F', 22)}<small>Record</small><span>${nf(prog.best || 0)}</span></div>
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
      <div class="hero-portrait">${art()[c.id]}</div>
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
      <button class="mode-btn duel" disabled aria-disabled="true">
        <span class="badge">BIENTÔT</span>
        <span class="mode-txt"><span class="mode-title ol ol-5">Duel</span><span class="mode-sub">En ligne · tour par tour</span></span>
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
      <div class="char-art${L.max ? ' lvl-max' : ''}" style="background:${v.color}">${facets.med()}${art()[v.id]}</div>
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
    <div class="mini-row">
      <div class="mini-card">
        <div class="mini-kicker">${glyph('circle', '#9ACD32', 14, { outline: 1.6 })}COSMÉTIQUE</div>
        <div class="mini-item">
          <div class="mini-thumb" style="background:#1F7A3D">${glyph('circle', v.skinColor, 34)}</div>
          <div class="mini-txt"><b>Tenue d'origine</b><span>Skin · Commun</span></div>
        </div>
        <div class="mini-note grow">1 skin débloqué</div>
        <button class="mini-btn" disabled>Bientôt</button>
      </div>
    </div>
    ${bottom}`;
}

/* ---------- 03 · Boutique ---------- */
function shopHtml() {
  const S = D.shop;
  const chips = S.filters.map(([k, label]) =>
    `<button class="chip${ui.filter === k ? ' on' : ''}" data-act="filter" data-arg="${k}" aria-pressed="${ui.filter === k}">${label}</button>`).join('');
  const items = S.items.filter(s => ui.filter === 'all' || s.kind === ui.filter).map(s => {
    const thumb = s.kind === 'weapon' ? wIcon(s.icon, 42) : s.kind === 'color' ? glyph('circle', s.color, 46) : trailIcon(s.color, 44);
    return `<div class="shop-item">
        <div class="shop-thumb" style="background:${s.kind === 'weapon' ? s.color : '#1F7A3D'}">${facets.small()}<div class="rel">${thumb}</div></div>
        <div class="shop-txt"><b>${s.name}</b><span>${s.type}</span></div>
        <div class="shop-price">Bientôt</div>
      </div>`;
  }).join('');
  return `<div class="offer">
      ${facets.med()}
      <div class="offer-txt">
        <span class="badge">${S.offer.kicker}</span>
        <div class="offer-title">${S.offer.title}</div>
        <div class="offer-desc">${S.offer.text}</div>
        <div class="grow"></div>
        <button class="offer-btn" disabled><span class="ol ol-4">Bientôt</span></button>
        <span class="offer-foot">À gagner en jouant, sans achat</span>
      </div>
      <div class="offer-loot">
        <div class="loot-tri">${glyph('tri', '#FF5A3C', 66, { outline: 3.5 })}</div>
        <div class="loot-circle">${glyph('circle', '#3DDC5B', 58, { outline: 3.5 })}</div>
        <div class="loot-dot">${glyph('dot', '#FF8C32', 50, { outline: 3.5 })}</div>
      </div>
    </div>
    <div class="chips">${chips}</div>
    <div class="shop-grid">${items}</div>`;
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
      <button class="mini-btn set-credits" data-act="credits">Crédits</button>
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
      <button class="res-again" data-act="again"><span class="ol ol-4">Rejouer</span></button>
      <button class="mini-btn res-home" data-act="home">Retour au lobby</button>
    </div>`;
  m.classList.remove('hidden');
  $('lobby').classList.remove('hidden');
  playWeaponGain(m, r.weapon);
}
