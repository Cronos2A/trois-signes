// Leçon guidée : écran d'ouverture (« Souvenir »), tableau des 5 niveaux de réussite, et main animée
// qui montre le geste à tracer. Pur affichage : le déroulé est dans game/tutorial.js.
// La main ne capte aucun appui (pointer-events:none) ; les deux écrans couvrent tout et ne laissent rien passer.
import { D } from '../data.js';
import { G, heroPos } from '../game/state.js';
import { facets } from './icons.js';
import { handSvg } from './tutorial-art.js';

let card = null, hand = null, raf = 0;

function overlay(id, cls) {
  const el = document.createElement('div');
  el.id = id; el.className = cls + ' hidden';
  document.body.appendChild(el);
  for (const t of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend']) {
    el.addEventListener(t, e => e.stopPropagation());
  }
  return el;
}

/** Affiche html dans l'écran plein ; résolu au clic sur [data-ok] (ou partout si any), ou après auto s. */
function showCard(html, cls, { any = false, auto = 0 } = {}) {
  if (!card) card = overlay('tutoCard', 'tu-card');
  card.className = 'tu-card ' + cls;
  card.innerHTML = html;
  return new Promise(resolve => {
    let timer = 0;
    const done = () => { clearTimeout(timer); card.onclick = null; card.classList.add('hidden'); resolve(); };
    card.onclick = e => { if (any || e.target.closest('[data-ok]')) done(); };
    if (auto) timer = setTimeout(done, auto * 1000);
  });
}

/** Ouverture : « Souvenir · La première leçon · Pierrelune, avant le Silence ». */
export function showIntro() {
  const I = D.tutorial.intro;
  return showCard(`${facets.bg()}<div class="tu-in">
      <span class="vy-kick">${I.kicker}</span>
      <h1 class="vy-name">${I.title}</h1>
      <span class="tu-sub">${I.sub}</span>
    </div><span class="vy-tap">toucher pour passer</span>`, 'intro', { any: true, auto: I.duration });
}

/** Tableau des 5 niveaux (seuils du jeu, sans la tolérance de la leçon), puis « Compris ». */
export function showLevels() {
  const P = D.tutorial.levelsPanel, L = [...D.grades.levels].reverse();
  const rows = L.map((g, i) => {
    const max = i < L.length - 1 ? L[i + 1].min - 1 + ' %' : '100 %';
    return `<div class="tu-lvl" style="--c:${g.col}"><i></i><b>${g.name}</b><span>${g.min} – ${max}</span><em>×${String(g.mult).replace('.', ',')}</em></div>`;
  }).join('');
  return showCard(`<div class="res-card tu-levels">
      <div class="res-title ol ol-5 tu-title">${P.title}</div>
      <p class="tu-text">${P.text}</p>
      <div class="tu-lvls">${rows}</div>
      <p class="tu-text small">${P.miss}</p>
      <button class="res-again" data-ok><span class="ol ol-4">${P.button}</span></button>
    </div>`, 'levels');
}

/* ---------- Main animée ---------- */
/** Tracé à montrer, en coordonnées écran : triangle ou rond au-dessus du héros ; tap sur la pièce ; bouton de super. */
function pathFor(kind) {
  const cx = G.W / 2, cy = Math.min(G.H * 0.56, heroPos().y - 150), r = Math.min(80, G.W * 0.2);
  if (kind === 'triangle') {
    const P = [[0, -1], [0.95, 0.65], [-0.95, 0.65], [0, -1]].map(([x, y]) => [cx + x * r, cy + y * r]);
    const out = [];
    for (let i = 0; i < 3; i++) for (let t = 0; t < 1; t += 0.05) out.push([P[i][0] + (P[i + 1][0] - P[i][0]) * t, P[i][1] + (P[i + 1][1] - P[i][1]) * t]);
    out.push(P[3]);
    return out;
  }
  if (kind === 'circle') return Array.from({ length: 61 }, (_, i) => [cx + r * Math.sin(i / 60 * 2 * Math.PI), cy - r * Math.cos(i / 60 * 2 * Math.PI)]);
  return null;
}
function tapTarget(kind) {
  if (kind === 'button') {
    const b = document.getElementById('superBtn').getBoundingClientRect();
    return [b.left + b.width / 2, b.top + b.height / 2];
  }
  const l = G.loots[0];
  return l ? [l.x, l.y] : null;
}

/** Montre le geste en boucle (kind : triangle, circle, tap, button) jusqu'à hideHand(). */
export function showHand(kind) {
  if (!hand) {
    hand = document.createElement('div');
    hand.id = 'tutoHand'; hand.className = 'tu-hand';
    hand.innerHTML = `<svg class="tu-trail"><path/></svg><div class="tu-finger">${handSvg(64)}</div>`;
    document.body.appendChild(hand);
  }
  hand.classList.remove('hidden');
  cancelAnimationFrame(raf);
  const finger = hand.querySelector('.tu-finger'), trail = hand.querySelector('path'), t0 = performance.now();
  const frame = now => {
    const t = ((now - t0) / 1000) % 2.2;                      // 1,5 s de geste, puis une courte pause
    const pts = pathFor(kind);
    let x, y, press = 1;
    if (pts) {
      const u = Math.min(1, t / 1.5), n = Math.floor(u * (pts.length - 1));
      [x, y] = pts[n];
      trail.setAttribute('d', 'M' + pts.slice(0, n + 1).map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L'));
      trail.style.opacity = t > 1.5 ? String(Math.max(0, 1 - (t - 1.5) / 0.5)) : '1';
    } else {
      const p = tapTarget(kind);
      if (!p) { finger.style.opacity = '0'; raf = requestAnimationFrame(frame); return; }
      [x, y] = p;
      const u = (t % 1.1) / 1.1, lift = Math.abs(u - 0.5) * 2;   // appui : descend, touche, remonte
      y -= lift * 28; press = 1 + 0.12 * lift;
      trail.setAttribute('d', '');
    }
    finger.style.opacity = '1';
    finger.style.transform = `translate(${x - 14}px, ${y - 6}px) scale(${press})`;
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}

export function hideHand() {
  cancelAnimationFrame(raf);
  if (hand) hand.classList.add('hidden');
}

/** Ferme tout (leçon terminée ou passée). */
export function hideTutorialUi() {
  hideHand();
  if (card) { card.onclick = null; card.classList.add('hidden'); }
}
