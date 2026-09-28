// Monnaies, packs de gemmes, coffres et cadres de rareté : low-poly facetté, contour épais, sans texte.
import { engine, OL } from './engine.mjs';
import { glyph } from '../../src/ui/icons.js';

const E = engine({ ol: 9 });
const { P, ngon, limb, sh, parts } = E;

/** SVG final : viewBox fixe, fond transparent. */
export const wrap = (w, h, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${inner}</svg>\n`;

const sparkle = (x, y, s, c = '#FFFFFF') => `<polygon points="${P([[x, y - s], [x + s * .28, y - s * .28], [x + s, y], [x + s * .28, y + s * .28], [x, y + s], [x - s * .28, y + s * .28], [x - s, y], [x - s * .28, y - s * .28]])}" fill="${c}" stroke="${OL}" stroke-width="${Math.max(1.5, s * .18)}" stroke-linejoin="round"/>`;
const halo = (x, y, r, c, op) => `<polygon points="${P(ngon(x, y, r, r, 14, .1))}" fill="${c}" opacity="${op}"/>`;
const sign = (type, col, x, y, size, rot = 0) => `<g transform="translate(${x - size / 2} ${y - size / 2}) rotate(${rot} ${size / 2} ${size / 2})">${glyph(type, col, size, { outline: 3.5 })}</g>`;

/* ---------- Pièce d'or ---------- */
export function coin(cx = 64, cy = 62, r = 50) {
  const S = [
    { p: ngon(cx, cy + r * .14, r, r, 14, .1), c: '#B9862E' },                    // tranche
    { p: ngon(cx, cy, r, r, 14, .1), c: '#F2B632' },                              // bord
    { p: ngon(cx, cy, r * .8, r * .8, 14, .1), c: '#FFD23F' }                     // face
  ];
  const t = [[cx, cy - r * .5], [cx + r * .5, cy + r * .36], [cx - r * .5, cy + r * .36]];
  S.push({ p: t, c: '#E0A12A', sw: 4, sil: false });                              // triangle gravé
  S.push({ p: [[cx, cy - r * .5], [cx + r * .14, cy - r * .26], [cx - r * .28, cy + r * .36], [cx - r * .5, cy + r * .36]], c: '#FFE58A', sw: 0, sil: false, o: .85 });
  return parts(S) + sparkle(cx - r * .48, cy - r * .5, r * .2);
}

/* ---------- Gemme violette (facettes à la main, contour épais) ---------- */
export function gem(cx, cy, s, rot = 0) {
  const pt = (u, v) => [cx + (u * Math.cos(rot) - v * Math.sin(rot)) * s, cy + (u * Math.sin(rot) + v * Math.cos(rot)) * s];
  const T = [pt(-.42, -.62), pt(.42, -.62)], L = pt(-1, -.2), R = pt(1, -.2), B = pt(0, 1), ml = pt(-.5, -.2), mr = pt(.5, -.2), m = pt(0, -.2);
  const f = (pts, c) => `<polygon points="${P(pts)}" fill="${c}" stroke="${c}" stroke-width=".6" stroke-linejoin="round"/>`;
  return `<polygon points="${P([T[0], T[1], R, B, L])}" fill="${OL}" stroke="${OL}" stroke-width="${s * .3}" stroke-linejoin="round"/>` +
    f([T[0], T[1], m], '#D9B8FF') + f([T[0], m, ml], '#C49BFF') + f([T[1], mr, m], '#B07BFF') +
    f([T[0], ml, L], '#E6CCFF') + f([T[1], R, mr], '#8E52F0') +
    f([L, ml, B], '#A56BFF') + f([ml, m, B], '#8A4DEB') + f([m, mr, B], '#7338D6') + f([mr, R, B], '#5A26B8') +
    `<polygon points="${P([T[0], pt(-.1, -.62), pt(-.55, -.2), L])}" fill="#FFFFFF" opacity=".55"/>` +
    `<polygon points="${P([T[0], T[1], R, B, L])}" fill="none" stroke="${OL}" stroke-width="${Math.max(3, s * .1)}" stroke-linejoin="round"/>`;
}
export const gemIcon = () => wrap(128, 128, halo(64, 62, 58, '#B07BFF', .22) + gem(64, 62, 50) + sparkle(96, 26, 12) + sparkle(28, 92, 8) + sparkle(104, 84, 6));

/* ---------- Coffre (face + côté + couvercle bombé), fermé ou ouvert ---------- */
function chest(o) {
  const { x, y, w, h, d, wood, band, open } = o;               // x, y : coin avant gauche du bas du couvercle
  const side = sh(wood, -.35), dark = sh(wood, -.55);
  const lidH = h * .42, S = [], top = [];
  const X1 = x + w, dx = d, dy = -d * .55;
  let out = '';
  if (open) {
    // couvercle ouvert, basculé derrière : on voit son intérieur
    S.push({ p: [[x + dx * .2, y + dy], [X1 + dx * .9, y + dy], [X1 + dx * .7, y + dy - h * .95], [x - dx * .1, y + dy - h * .95]], c: dark });
    S.push({ p: [[x - dx * .1, y + dy - h * .95], [X1 + dx * .7, y + dy - h * .95], [X1 + dx * .66, y + dy - h * .82], [x - dx * .06, y + dy - h * .82]], c: band });
  }
  // caisse : face avant, côté droit
  S.push({ p: [[X1, y], [X1 + dx, y + dy], [X1 + dx, y + dy + h], [X1, y + h]], c: side });
  S.push({ p: [[x, y], [X1, y], [X1, y + h], [x, y + h]], c: wood });
  const bw = w * .09;
  const bands = o.bands || [.16, .75];
  for (const u of bands) S.push({ p: [[x + w * u, y], [x + w * u + bw, y], [x + w * u + bw, y + h], [x + w * u, y + h]], c: band, sw: 3.5 });
  S.push({ p: [[x, y + h - h * .12], [X1, y + h - h * .12], [X1, y + h], [x, y + h]], c: band, sw: 3.5 });
  if (open) {
    S.push({ p: [[x, y], [X1, y], [X1 + dx, y + dy], [x + dx, y + dy]], c: '#2A1B12', sw: 4.5 });     // ouverture
  } else {
    // couvercle bombé : l'arc de face, et le dessus qui fuit vers l'arrière en bandes facettées
    const arc = [[x, y], [x + w * .02, y - lidH * .55], [x + w * .12, y - lidH * .9], [x + w * .5, y - lidH], [x + w * .88, y - lidH * .9], [x + w * .98, y - lidH * .55], [X1, y]];
    const back = arc.map(([u, v]) => [u + dx, v + dy]);
    for (let i = 0; i < arc.length - 1; i++) {
      const k = i / (arc.length - 2), shade = k < .5 ? .14 - k * .1 : -.06 - (k - .5) * .5;
      S.push({ p: [arc[i], arc[i + 1], back[i + 1], back[i]], c: sh(wood, shade), sw: 3.5 });
    }
    S.push({ p: arc, c: sh(wood, .08) });
    for (const u of bands) S.push({ p: [[x + w * u, y], [x + w * u, y - lidH * (u < .5 ? .93 : .97)], [x + w * u + bw, y - lidH * (u < .5 ? .96 : .94)], [x + w * u + bw, y]], c: band, sw: 3.5 });
    S.push({ p: [[x, y - 4], [X1, y - 4], [X1, y + 6], [x, y + 6]], c: band, sw: 3.5 });
  }
  // planches
  const lines = [.36, .62].map(v => `<line x1="${x + 4}" y1="${y + h * v}" x2="${X1 - 4}" y2="${y + h * v}" stroke="${dark}" stroke-width="2.5" opacity=".6"/>`).join('');
  out += parts(S) + lines;
  // serrure
  const lx = x + w / 2, ly = y + (open ? h * .18 : 2);
  out += parts([{ p: ngon(lx, ly + 10, w * .09, w * .1, 6, Math.PI / 2), c: band, sw: 3.5 }]);
  out += `<polygon points="${P(ngon(lx, ly + 7, 3.2, 3.2, 6))}" fill="${OL}"/><polygon points="${P([[lx - 2, ly + 8], [lx + 2, ly + 8], [lx + 3, ly + 16], [lx - 3, ly + 16]])}" fill="${OL}"/>`;
  return { svg: out, top: [x + dx / 2 + w / 2, y + dy / 2] };
}
const rays = (x, y, w, h, col) => {
  let s = '';
  for (let i = -3; i <= 3; i++) {
    const a = i * .22, bx = x + i * w * .09, tx = x + Math.sin(a) * h * 1.1 + i * w * .12, ty = y - Math.cos(a) * h;
    s += `<polygon points="${P([[bx - w * .05, y], [tx - w * .09, ty], [tx + w * .09, ty], [bx + w * .05, y]])}" fill="${col}" opacity="${i % 2 ? .3 : .5}"/>`;
  }
  return s;
};

export function chestSimple(open) {
  const c = chest({ x: 34, y: 96, w: 112, h: 66, d: 26, wood: '#3E9A4E', band: '#FFD23F', open });
  let s = `<polygon points="${P(ngon(98, 170, 84, 13, 12))}" fill="${OL}" opacity=".25"/>`;
  s += c.svg;
  if (open) s += rays(c.top[0], c.top[1] - 4, 112, 84, '#FFE58A');
  if (open) s += sparkle(62, 40, 9) + sparkle(138, 30, 7) + sparkle(104, 18, 5, '#FFF1A8');
  return wrap(200, 190, s);
}

export function chestTroisSignes(open) {
  const c = chest({ x: 26, y: 106, w: 140, h: 78, d: 30, wood: '#8E2E22', band: '#FFD23F', open, bands: [.05, .86] });
  let s = `<polygon points="${P(ngon(104, 192, 100, 14, 12))}" fill="${OL}" opacity=".25"/>` + halo(104, 110, 96, '#FFD23F', open ? .28 : .16);
  s += c.svg;
  if (open) s += rays(c.top[0], c.top[1] - 4, 150, 110, '#FFF1A8');
  // ornements : gemmes aux coins, les trois signes sur la face
  const orn = (x, y) => parts([{ p: ngon(x, y, 7, 7, 6, Math.PI / 2), c: '#FFD23F', sw: 3.5 }]);
  s += orn(30, 180) + orn(162, 180);
  if (open) {
    s += halo(104, 44, 30, '#FF8C32', .35);
    s += sign('tri', '#FF5A3C', 60, 50, 46, -10) + sign('circle', '#3DDC5B', 150, 44, 42) + sign('dot', '#FF8C32', 104, 28, 38);
    s += sparkle(26, 70, 9) + sparkle(182, 84, 8) + sparkle(128, 12, 6, '#FFF1A8');
    s += sign('tri', '#FF5A3C', 96, 146, 22) + sign('circle', '#3DDC5B', 58, 150, 18) + sign('dot', '#FF8C32', 134, 150, 18);
  } else {
    s += halo(96, 146, 20, '#FFE58A', .45);
    s += sign('tri', '#FF5A3C', 96, 146, 30) + sign('circle', '#3DDC5B', 54, 148, 22);
    s += halo(140, 148, 16, '#FF8C32', .5) + sign('dot', '#FF8C32', 140, 148, 22);
    s += sparkle(160, 84, 8) + sparkle(36, 76, 6);
  }
  return wrap(210, 210, s);
}

/* ---------- Packs de gemmes : de plus en plus généreux ---------- */
export function pack(n) {
  const shadow = (x, y, rx) => `<polygon points="${P(ngon(x, y, rx, rx * .16, 12))}" fill="${OL}" opacity=".25"/>`;
  if (n === 1) return wrap(200, 200, shadow(100, 158, 60) + halo(100, 118, 70, '#B07BFF', .16) +
    gem(72, 128, 24, -.3) + gem(128, 130, 22, .35) + gem(100, 104, 30, .05) + gem(104, 146, 16, -.1) + sparkle(144, 70, 9) + sparkle(56, 84, 6));
  if (n === 2) {
    // bourse en cuir, cordon doré, gemmes qui dépassent
    const S = [
      { p: [[58, 110], [70, 92], [130, 92], [142, 110], [156, 146], [140, 172], [100, 180], [60, 172], [44, 146]], c: '#A8733E' },
      { p: [[72, 92], [80, 80], [120, 80], [128, 92], [114, 100], [86, 100]], c: '#8A5A30' },
      { p: limb([70, 98], [130, 98], 8, 8), c: '#FFD23F', sw: 3.5 }
    ];
    return wrap(200, 200, shadow(100, 180, 66) + halo(100, 70, 44, '#B07BFF', .25) + gem(86, 70, 18, -.35) + gem(116, 66, 20, .3) + gem(100, 56, 16, 0) +
      parts(S) + parts([{ p: [[128, 98], [146, 112], [150, 132], [140, 118]], c: '#FFD23F', sw: 3 }, { p: ngon(150, 136, 6, 6, 6), c: '#FFD23F', sw: 3 }]) +
      gem(90, 148, 16, .2) + sparkle(150, 48, 9) + sparkle(52, 64, 6));
  }
  if (n === 3) {
    // coffret précieux ouvert, rempli de gemmes
    const c = chest({ x: 44, y: 104, w: 104, h: 56, d: 22, wood: '#6B3FA0', band: '#FFD23F', open: true });
    const gems = [[66, 96, 14, -.3], [88, 90, 16, .1], [112, 92, 15, .35], [132, 88, 13, -.2], [100, 78, 14, 0]].map(g => gem(...g)).join('');
    return wrap(200, 200, shadow(106, 168, 76) + c.svg + rays(c.top[0], c.top[1] - 2, 100, 70, '#E6CCFF') + gems + sparkle(154, 50, 9) + sparkle(46, 60, 7));
  }
  // grand coffre débordant, gemmes sur le sol
  const c = chest({ x: 30, y: 104, w: 132, h: 66, d: 28, wood: '#3E9A4E', band: '#FFD23F', open: true });
  const pile = [[52, 96, 15, -.4], [74, 86, 17, .2], [98, 80, 18, -.1], [122, 82, 17, .3], [146, 88, 15, -.2], [88, 66, 15, .1], [114, 64, 16, -.3], [100, 50, 14, 0], [164, 100, 12, .5]];
  const ground = [[24, 176, 13, -.5], [176, 172, 14, .4], [150, 184, 11, .1], [48, 188, 10, .3]];
  return wrap(210, 210, shadow(100, 180, 94) + halo(100, 90, 90, '#B07BFF', .2) + c.svg + rays(c.top[0], c.top[1] - 2, 130, 90, '#E6CCFF') +
    pile.map(g => gem(...g)).join('') + ground.map(g => gem(...g)).join('') + sparkle(170, 40, 11) + sparkle(30, 56, 8) + sparkle(120, 24, 6, '#FFF1A8'));
}

/* ---------- Cadres de rareté (anneau facetté, centre transparent) ---------- */
function roundRect(x, y, w, h, r, n = 4) {
  const pts = [], C = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (const [cx, cy, a0] of C) for (let i = 0; i <= n; i++) { const a = a0 + i * Math.PI / 2 / n; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return pts;
}
export function frame(col, opt = {}) {
  const W = 120, O = roundRect(6, 6, 108, 108, 22), I = roundRect(17, 17, 86, 86, 13);
  let s = '';
  if (opt.glow) s += `<path d="M${P(roundRect(0, 0, 120, 120, 26))}Z" fill="${opt.glow}" opacity=".35"/>`;
  s += `<path d="M${P(O.map(([x, y]) => [x, y + 4]))}Z M${P(I.map(([x, y]) => [x, y + 4]))}Z" fill="${OL}" fill-rule="evenodd"/>`;   // ombre portée
  for (let i = 0; i < O.length; i++) {
    const j = (i + 1) % O.length, mx = (O[i][0] + O[j][0]) / 2 - 60, my = (O[i][1] + O[j][1]) / 2 - 60, l = Math.hypot(mx, my) || 1;
    const d = (-.55 * mx - .83 * my) / l, c = sh(col, d > 0 ? d * .34 : d * .4);
    s += `<polygon points="${P([O[i], O[j], I[j], I[i]])}" fill="${c}" stroke="${c}" stroke-width=".8" stroke-linejoin="round"/>`;
    s += `<polygon points="${P([O[i], O[j], [(I[i][0] + I[j][0] + O[i][0] + O[j][0]) / 4, (I[i][1] + I[j][1] + O[i][1] + O[j][1]) / 4]])}" fill="${sh(c, .12)}" opacity=".6"/>`;
  }
  s += `<path d="M${P(O)}Z M${P(I)}Z" fill="none" stroke="${OL}" stroke-width="4.5" stroke-linejoin="round"/>`;
  if (opt.corners) for (const [x, y] of [[17, 17], [103, 17], [103, 103], [17, 103]]) s += parts([{ p: ngon(x, y, 9, 9, 4), c: opt.corners, sw: 3.5, sil: false }]);
  if (opt.sparkle) s += sparkle(104, 14, 11) + sparkle(18, 104, 7, '#FFF1A8');
  return wrap(W, W + 6, s);
}
export const frames = {
  commun: () => frame('#5CC44A'),
  rare: () => frame('#3D8BFF', { corners: '#BFE3FF' }),
  epique: () => frame('#8B4DE8', { corners: '#FFD23F', sparkle: true, glow: '#C49BFF' })
};

export const coinIcon = () => wrap(128, 128, coin());
