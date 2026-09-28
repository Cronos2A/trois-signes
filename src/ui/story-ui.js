// Écrans du mode Histoire, d'après la maquette Claude Design
// (design/trois-signes-maquette-lobby/project/Mode Histoire Trois Signes.dc.html) :
// 01 choix des histoires, 02 chemin des 10 combats, 05 fin d'histoire (fragment), 06 déblocage d'Eldan,
// plus l'écran de défaite. Pur affichage : les actions sont passées par story/story.js.
import { D } from '../data.js';
import { sfx } from '../audio/audio.js';
import { glyph, facets, facetSvg } from './icons.js';
import { weaponGainHtml, playWeaponGain } from './weapon-ui.js';
import { landscape, fragIcon, fragPips, bigFragment, silhouette, typeIcon, lockIcon, checkIcon, backIcon } from './story-art.js';

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
    sfx('ui_clic');
    if (f) f(b.dataset.arg);
  });
}

function show(html, on, cls = '') {
  ensure();
  handlers = on;
  root.className = 'lobby story ' + cls;
  root.innerHTML = html;
}
export function hideStory() { if (root) root.classList.add('hidden'); }

const hero = id => D.characters.characters.find(c => c.id === id);
const backBtn = label => `<button class="st-back" data-act="back" aria-label="${label}">${backIcon(20)}</button>`;
const avatar = (c, cls) => `<div class="${cls}" style="background:${c.color}">${facets.small()}<span class="ol">${c.name[0]}</span></div>`;
const fragBar = n => `<div class="st-fragbar"><div class="st-fragtxt"><span>FRAGMENTS DE MÉMOIRE</span><b>${n} / 6</b></div><div class="st-pips">${fragPips(n)}</div></div>`;

/* ---------- 01 · Choix des histoires ---------- */
export function renderChoice(st, on) {
  const cards = D.story_mode.histoires.map(h => {
    const c = hero(h.id), n = (st.done[h.id] || []).length, found = st.fragments.includes(h.id);
    return `<button class="st-card" data-act="pick" data-arg="${h.id}">
      <div class="st-card-top">${avatar(c, 'st-av54')}${found ? `<span class="st-found">${fragIcon(true, 13)}Retrouvé</span>` : ''}</div>
      <div class="st-card-txt"><b>${c.name}</b><span>${h.titre}</span></div>
      <div class="st-prog"><div class="st-bar"><i style="width:${n * 10}%;background:${n >= 10 ? '#FFD23F' : '#FF8C32'}"></i></div><span>${n} / 10</span></div>
    </button>`;
  }).join('');
  const eldan = st.epilogue
    ? `<div class="st-eldan open"><div class="st-eldan-p">${facets.med()}${silhouette('color', 70)}</div>
        <div class="st-eldan-txt"><b>Eldan</b><span>Le Maître · bientôt disponible</span></div></div>`
    : `<div class="st-eldan"><div class="st-eldan-p">${silhouette('grey', 70)}</div>
        <div class="st-eldan-txt"><b>???</b><span>Termine les six histoires</span></div><div class="st-lock">${lockIcon(18, 2.75)}</div></div>`;
  show(`${facets.bg()}
    <header class="st-head">${backBtn('Retour au lobby')}<h1 class="st-h1">Mode Histoire</h1></header>
    <main class="st-main">${fragBar(st.fragments.length)}<div class="st-grid">${cards}${eldan}</div></main>`, on, 'st-choice');
}

/* ---------- 02 · Chemin de l'histoire ---------- */
const XS = [118, 232, 290, 214, 104, 98, 200, 288, 226, 150];   // positions de la maquette (écran de 390 px)
const TYPE_INK = t => t === 'boss_final' ? '#6B4F8F' : t === 'normal' ? '#3d5a45' : '#C4481F';
const NODE_BG = {
  won: 'linear-gradient(180deg,#B6DE5A 0 46%,#9ACD32 46%)',
  avail: 'linear-gradient(180deg,#FFA95C 0 46%,#FF8C32 46%)'
};

export function renderMap(h, st, on, toast) {
  const c = hero(h.id), done = st.done[h.id] || [], labels = D.rules.story.typeLabels;
  const next = h.combats.map(k => k.n).find(n => !done.includes(n)) || null;
  const stateOf = k => done.includes(k.n) ? 'won' : k.n === next ? 'avail' : 'locked';
  let sel = next || 10;

  const nodes = h.combats.map((k, i) => {
    const s = stateOf(k), boss = k.type === 'boss_final', size = boss ? 62 : 50;
    const bg = NODE_BG[s] || (boss ? '#E6E2EC' : '#C9C1B3');
    const ink = s === 'locked' ? (boss ? '#6B6478' : '#6d665c') : '#15301E';
    return `<div class="st-node ${s}${XS[i] < 200 ? ' r' : ' l'}" data-i="${i}" style="--sz:${size}px">
      ${s === 'avail' ? '<i class="st-pulse"></i>' : ''}
      <button class="st-dot" data-act="sel" data-arg="${k.n}" aria-label="Étape ${k.n} : ${k.titre}" style="background:${bg}">
        ${typeIcon(k.type, boss ? 28 : 22, ink)}<span class="st-n">${k.n}</span>
        ${s === 'won' ? `<span class="st-badge won">${checkIcon(12)}</span>` : s === 'locked' ? `<span class="st-badge">${lockIcon(11)}</span>` : ''}
      </button>
      <div class="st-label"><b>${k.titre}</b><span style="color:${TYPE_INK(k.type)}">${labels[k.type] || k.type}</span></div>
    </div>`;
  }).join('');

  show(`${landscape('map')}<div class="st-fade"></div>
    <div class="st-scroll" id="stScroll"><div class="st-mapin" id="stMapIn"><svg class="st-trail" id="stTrail"></svg>${nodes}</div></div>
    <header class="st-head">${backBtn('Retour aux histoires')}
      <div class="st-pill">${avatar(c, 'st-av38')}<div class="st-pill-txt"><span>HISTOIRE DE ${c.name.toUpperCase()}</span><b>${h.titre}</b></div><em>${done.length} / 10</em></div></header>
    <div class="st-sel" id="stSel"></div>
    ${toast ? `<div class="st-toast">${toast}</div>` : ''}`,
  { ...on, sel: n => { sel = +n; paintSel(); } }, 'st-map');

  // Étape choisie : titre, type, vagues, et « Jouer » / « Rejouer » ou le verrou.
  function paintSel() {
    const k = h.combats.find(x => x.n === sel), s = stateOf(k), boss = k.type === 'boss_final';
    const t = labels[k.type] || k.type, rounds = k.vagues.length;
    const meta = rounds + ' vagues' + (k.type !== 'normal' && k.type !== 'rencontre' ? ' · ' + t.toLowerCase() + ' à la dernière' : '');
    root.querySelector('#stSel').innerHTML = `
      <div class="st-sel-top"><div class="st-sel-ic" style="background:${NODE_BG[s] || (boss ? '#E6E2EC' : '#C9C1B3')}">${typeIcon(k.type, boss ? 28 : 22, s === 'locked' ? '#6d665c' : '#15301E')}</div>
        <div class="st-sel-txt"><span style="color:${boss ? '#6B4F8F' : '#1F7A3D'}">ÉTAPE ${k.n} · ${t.toUpperCase()}</span><b>${k.titre}</b><em>${meta}</em></div></div>
      ${s === 'locked'
        ? `<div class="st-locked">Termine l'étape ${k.n - 1} pour débloquer</div>`
        : `<button class="st-play" data-act="play" data-arg="${k.n}">${glyph('tri', '#FFD23F', 28)}<span class="ol">${s === 'won' ? 'Rejouer' : 'Jouer'}</span></button>`}`;
    root.querySelectorAll('.st-node').forEach((el, i) => el.classList.toggle('sel', i === sel - 1));
    layout();
  }

  // Place les étapes sur le chemin : positions de la maquette, étirées à l'écran ; défile si l'écran est trop court.
  function layout() {
    const scroll = root.querySelector('#stScroll'), inner = root.querySelector('#stMapIn');
    const W = root.clientWidth, H = root.clientHeight, kx = W / 390;
    const top = root.querySelector('.st-head').getBoundingClientRect().bottom + 48;
    const cardTop = root.querySelector('#stSel').getBoundingClientRect().top;
    const step = Math.max(54, (cardTop - 44 - top) / 9);
    const bottom = top + step * 9, innerH = Math.max(H, bottom + (H - cardTop) + 44);
    inner.style.height = innerH + 'px';
    const pos = XS.map((x, i) => [x * kx, bottom - i * step - (i === 9 ? 4 : 0)]);
    root.querySelectorAll('.st-node').forEach((el, i) => { el.style.left = pos[i][0] + 'px'; el.style.top = pos[i][1] + 'px'; });
    const curve = pts => pts.map((p, i) => {
      if (!i) return 'M' + p.join(',');
      const a = pts[i - 2] || pts[i - 1], b = pts[i - 1], d = pts[i + 1] || p;
      return `C${b[0] + (p[0] - a[0]) / 6},${b[1] + (p[1] - a[1]) / 6} ${p[0] - (d[0] - b[0]) / 6},${p[1] - (d[1] - b[1]) / 6} ${p[0]},${p[1]}`;
    }).join(' ');
    const full = curve(pos), reach = next ? next : 10, doneD = done.length ? curve(pos.slice(0, reach)) : '';
    const svg = root.querySelector('#stTrail');
    svg.setAttribute('viewBox', `0 0 ${W} ${innerH}`);
    svg.style.height = innerH + 'px';
    svg.innerHTML = `<path d="${full}" fill="none" stroke="#15301E" stroke-width="16" stroke-linecap="round"/>
      <path d="${full}" fill="none" stroke="#E4D3B4" stroke-width="8" stroke-linecap="round"/>
      <path d="${full}" fill="none" stroke="#A89A82" stroke-width="3" stroke-dasharray="2 11" stroke-linecap="round"/>
      ${doneD ? `<path d="${doneD}" fill="none" stroke="#FFD23F" stroke-width="8" stroke-linecap="round"/>` : ''}`;
    const y = pos[sel - 1][1];
    if (y < scroll.scrollTop + top || y > scroll.scrollTop + cardTop - 40) scroll.scrollTop = y - (top + cardTop) / 2;
  }
  paintSel();
}

/* ---------- Défaite ---------- */
export function renderDefeat(k, on, weapon) {
  show(`${facets.bg()}<div class="st-modal"><div class="st-card-big">
      <div class="res-title ol ol-5 lose">KO</div>
      <div class="st-sub">${k.titre}</div>
      ${weaponGainHtml(weapon)}
      <button class="res-again" data-act="retry"><span class="ol ol-4">Réessayer</span></button>
      <button class="mini-btn st-btn" data-act="review">Revoir le dialogue</button>
      <button class="mini-btn st-btn alt" data-act="back">Retour</button>
    </div></div>`, on, 'st-defeat');
  playWeaponGain(root, weapon);
}

/* ---------- Victoire : XP du héros et de son arme, avant le dialogue d'après ---------- */
/** Résolue sur « Continuer ». xp : XP du héros (partie + première victoire). */
export function renderVictory(k, xp, weapon) {
  return new Promise(resolve => {
    show(`${facets.bg()}<div class="st-modal"><div class="st-card-big">
        <div class="res-title ol ol-5 win">Victoire</div>
        <div class="st-sub">${k.titre}</div>
        <div class="res-xp"><div class="res-xp-top"><span>Héros +${xp} XP</span></div></div>
        ${weaponGainHtml(weapon)}
        <button class="res-again" data-act="ok"><span class="ol ol-4">Continuer</span></button>
      </div></div>`, { ok: resolve }, 'st-defeat');
    playWeaponGain(root, weapon);
  });
}

/* ---------- 05 · Fin d'histoire : fragment de mémoire ---------- */
/** Le souvenir affiché est la réplique d'Eldan dans la fin de l'histoire (texte tel quel). Résolue sur « Continuer ». */
export function renderFragment(n, h) {
  const memory = (h.fin || []).find(l => l.qui === 'eldan');
  return new Promise(resolve => show(`${facetSvg(6, 13, 5, 0.096)}
    <div class="st-end">
      <div class="st-end-head"><span class="st-kick">${h.titre.toUpperCase()} · TERMINÉE</span><h1 class="st-big">Fragment de mémoire retrouvé</h1></div>
      <div class="st-end-art"><i class="st-rays"></i><i class="st-glow"></i><div class="st-float">${bigFragment()}</div></div>
      ${memory ? `<div class="st-memory"><q>${memory.texte}</q><span>Un souvenir revient à Maître Eldan</span></div>` : ''}
      <div class="st-end-foot">${fragBar(n)}<button class="st-cta" data-act="ok"><span class="ol">Continuer</span></button></div>
    </div>`, { ok: resolve }, 'st-dark'));
}

/* ---------- 06 · Déblocage d'Eldan (après l'épilogue) ---------- */
/** on : { see() « Voir le personnage », later() « Plus tard » } */
export function renderUnlock(on) {
  show(`${facets.bg()}
    <div class="st-end">
      <div class="st-end-head"><span class="st-kick">NOUVEAU PERSONNAGE</span><h1 class="st-big st-eldan-name">Eldan</h1><span class="st-sub-big">le Maître</span></div>
      <div class="st-end-art big"><i class="st-rays"></i><div class="st-disc">${glyph('circle', '#FFD23F', 290, { n: 12, outline: 5 })}</div>
        <div class="st-reveal">${facets.med()}<div>${silhouette('color', 210)}</div></div>
        <span class="st-deco t">${glyph('tri', '#FFD23F', 44)}</span><span class="st-deco c">${glyph('circle', '#FF5A3C', 38)}</span><span class="st-deco d">${glyph('dot', '#FF8C32', 32)}</span></div>
      <div class="st-unlock-info"><div class="st-pips">${fragPips(6)}</div><span>Son histoire sera bientôt disponible</span></div>
      <div class="st-end-foot"><button class="st-cta" data-act="see"><span class="ol">Voir le personnage</span></button><button class="st-later" data-act="later">Plus tard</button></div>
    </div>`, on, 'st-unlock');
}
