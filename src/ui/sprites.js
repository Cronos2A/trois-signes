// Sprites de combat (héros, ennemis, objets, décor de la Forêt de Mousse), repris tels quels
// de l'export Claude Design design/ecran-de-combat-trois-signes/project/sprites.js.
// Changements : module ES (export TS) au lieu de window.TS, et option part (corps / bras armé)
// pour animer le coup d'arme. Chaque fonction renvoie du SVG.
const OL = '#17251B';
const f1 = v => (+v).toFixed(1);
function engine(o) {
  o = Object.assign({ ol: 11, fc: 1, seed: 7 }, o || {});
  const E = { o, LX: -0.55, LY: -0.83 };
  let seed = o.seed;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (h, t, k) => '#' + rgb(h).map((v, i) => Math.round(v + (t[i] - v) * k).toString(16).padStart(2, '0')).join('');
  const sh = (h, a) => a >= 0 ? mix(h, [255, 248, 222], Math.min(a, .9)) : mix(h, [16, 28, 32], Math.min(-a, .9));
  const lerp = (a, b, t) => mix(a, rgb(b), Math.max(0, Math.min(1, t)));
  const P = pts => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
  const nrm = a => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; }, perp = a => [-a[1], a[0]];
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const ngon = (cx, cy, rx, ry, n, rot = 0) => Array.from({ length: n }, (_, i) => { const t = rot + i * 2 * Math.PI / n; return [cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]; });
  const limb = (a, b, wa, wb) => { const n = perp(nrm(sub(b, a))); return [add(a, mul(n, wa / 2)), add(b, mul(n, wb / 2)), sub(b, mul(n, wb / 2)), sub(a, mul(n, wa / 2))]; };
  const bb = [1e9, 1e9, -1e9, -1e9];
  const track = pts => { for (const p of pts) { if (p[0] < bb[0]) bb[0] = p[0]; if (p[1] < bb[1]) bb[1] = p[1]; if (p[0] > bb[2]) bb[2] = p[0]; if (p[1] > bb[3]) bb[3] = p[1]; } };
  const tri = (pts, f) => `<polygon points="${P(pts)}" fill="${f}" stroke="${f}" stroke-width="0.8" stroke-linejoin="round"/>`;
  const facets = (pts, col) => {
    let cx = 0, cy = 0; pts.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= pts.length; cy /= pts.length;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const m = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * .16;
    const c = [cx + E.LX * m, cy + E.LY * m]; let s = '';
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy, l = Math.hypot(mx, my) || 1;
      const d = (E.LX * mx + E.LY * my) / l;
      s += tri([c, a, b], sh(col, (d > 0 ? d * .2 : d * .32) * o.fc + (rnd() - .5) * .08 * o.fc));
    }
    return s;
  };
  // Cosmétiques : o.recolor remplace des couleurs d'origine (#RRGGBB majuscules) ; le socle n'est jamais recoloré.
  const rc = c => (o.recolor && o.recolor[c.toUpperCase()]) || c;
  const parts = (S, ol, keep) => {
    ol = ol ?? o.ol; let sil = '', body = '';
    for (const q of S) {
      if (q.raw !== undefined) { body += q.raw; continue; }
      track(q.p); const pp = P(q.p), c = keep ? q.c : rc(q.c);
      if (q.sil !== false) sil += `<polygon points="${pp}" fill="${OL}" stroke="${OL}" stroke-width="${ol}" stroke-linejoin="round"/>`;
      body += `<g${q.o != null ? ` opacity="${q.o}"` : ''}><polygon points="${pp}" fill="${c}" stroke="${q.sw === 0 ? 'none' : OL}" stroke-width="${q.sw ?? 4.5}" stroke-linejoin="round"/>${facets(q.p, c)}</g>`;
    }
    return sil + body;
  };
  const socle = (cx, y, rx, top, side) => {
    const t = ngon(cx, y, rx, rx * .2, 10, 0), fr = t.slice(0, 6);
    const B = [{ p: [...fr, ...fr.map(p => [p[0], p[1] + 18]).reverse()], c: side }, { p: t, c: top }];
    [[-.62, .1], [.5, .14], [.78, .02]].forEach(([u, v]) => { const x = cx + u * rx, yy = y + v * rx; B.push({ p: [[x - 7, yy], [x - 2, yy - 13], [x + 1, yy - 4], [x + 5, yy - 11], [x + 8, yy]], c: '#9ACD32', sw: 3, sil: false }); });
    return parts(B, undefined, true) + `<polygon points="${P(ngon(cx + rx * .1, y + 1, rx * .6, rx * .12, 9))}" fill="${OL}" opacity=".3"/>`;
  };
  const shadow = (cx, y, rx) => { const p = ngon(cx + rx * .1, y + 1, rx * .6, rx * .12, 9); track(p); return `<polygon points="${P(p)}" fill="${OL}" opacity=".3"/>`; };
  const arm = (S, s, e, h, a) => { const w = a.w; S.push({ p: limb(s, e, w, w * .92), c: a.u }); S.push({ p: ngon(e[0], e[1], w * .5, w * .5, 6), c: a.u }); S.push({ p: limb(e, h, w * .9, w * .8), c: a.l || a.u }); S.push({ p: ngon(h[0], h[1], a.hr, a.hr * 1.05, 7, .3), c: a.hand }); };
  const leg = (S, hp, k, f, col, boot, w, dir) => {
    S.push({ p: limb(hp, k, w, w * .92), c: col }); S.push({ p: ngon(k[0], k[1], w * .48, w * .48, 6), c: col }); S.push({ p: limb(k, [f[0], f[1] - 18], w * .9, w * .82), c: col });
    const bw = w * .62; S.push({ p: [[f[0] - bw, f[1] - 26], [f[0] + bw, f[1] - 26], [f[0] + bw + (dir > 0 ? 13 : 2), f[1]], [f[0] - bw - (dir < 0 ? 13 : 2), f[1]]], c: boot });
  };
  const sword = (S, h, tip, a) => {
    const d = nrm(sub(tip, h)), n = perp(d), b = add(h, mul(d, 12)), t0 = sub(tip, mul(d, a.bw * 1.4));
    S.push({ p: limb(add(h, mul(d, 10)), sub(h, mul(d, 16)), 8, 8), c: a.grip || '#5C3A22' });
    S.push({ p: [add(b, mul(n, a.bw / 2)), add(t0, mul(n, a.bw * .42)), tip, sub(t0, mul(n, a.bw * .42)), sub(b, mul(n, a.bw / 2))], c: a.col });
    S.push({ raw: `<polygon points="${P([add(b, mul(n, a.bw * .12)), add(t0, mul(n, a.bw * .1)), sub(t0, mul(n, a.bw * .05)), sub(b, mul(n, a.bw * .05))])}" fill="${a.edge || '#FFFFFF'}" opacity=".7"/>` });
    S.push({ p: limb(sub(b, mul(n, a.guard)), add(b, mul(n, a.guard)), 9, 9), c: a.guardCol });
    const pm = sub(h, mul(d, 20)); S.push({ p: ngon(pm[0], pm[1], 7, 7, 6), c: a.guardCol });
  };
  const glow = (S, x, y, r, c, op) => S.push({ p: ngon(x, y, r, r, 12, .2), c, o: op, sil: false, sw: 0 });
  const spark = (S, x, y, s, c) => S.push({ p: [[x, y - s], [x + s * .45, y], [x, y + s], [x - s * .45, y]], c, sw: 3, sil: false });
  const headBack = (S, x, y, r, skin, hair) => {
    S.push({ p: ngon(x, y, r, r * 1.02, 9, Math.PI / 2), c: skin });
    S.push({ p: ngon(x + r * .92, y + r * .14, r * .2, r * .27, 6), c: skin });
    if (hair) S.push({ p: [[x - r * 1.02, y + r * .2], [x - r * .92, y - r * .55], [x - r * .42, y - r * .98], [x + r * .3, y - r * 1.03], [x + r * .86, y - r * .6], [x + r * .96, y - r * .08], [x + r * .7, y + r * .12], [x + r * .56, y + r * .7], [x, y + r * .96], [x - r * .62, y + r * .8]], c: hair });
  };
  const out = (inner, flip, s, foot, head) => {
    let [x0, y0, x1, y1] = bb, fx = foot[0], hx = head[0];
    if (flip) { [x0, x1] = [-x1, -x0]; fx = -fx; hx = -hx; }
    const p = o.ol / 2 + 4; x0 -= p; y0 -= p; x1 += p; y1 += p;
    const w = x1 - x0, h = y1 - y0;
    return {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f1(x0)} ${f1(y0)} ${f1(w)} ${f1(h)}" width="${f1(w * s)}" height="${f1(h * s)}" style="display:block;overflow:visible">${flip ? `<g transform="scale(-1 1)">${inner}</g>` : inner}</svg>`,
      w: w * s, h: h * s, fx: (fx - x0) * s, fy: (foot[1] - y0) * s, hx: (hx - x0) * s, hy: (head[1] - y0) * s
    };
  };
  Object.assign(E, { rnd, rgb, mix, sh, lerp, P, add, sub, mul, nrm, perp, mid, ngon, limb, tri, facets, parts, socle, shadow, arm, leg, sword, glow, spark, headBack, out, track, bb });
  return E;
}

function defs(E) {
  const { ngon, limb, P, leg, arm, sword, glow, spark, headBack } = E;
  const bone = '#EADFC8', Y = '#FFD23F', R = '#FF5A3C';
  const glare = pts => `<polygon points="${P(pts)}" fill="${Y}" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>`;
  return {
    aldric: () => {
      const S = [], sk = '#F4BE8E', A = '#FF8C32', st = '#B7C3CE', bt = '#5C3A22';
      leg(S, [108, 196], [98, 240], [90, 286], '#98A5B2', bt, 22, -1);
      leg(S, [136, 196], [150, 240], [158, 286], st, bt, 22, 1);
      arm(S, [96, 142], [74, 170], [70, 196], { u: st, hand: sk, w: 18, hr: 11 });
      S.push({ p: ngon(64, 190, 32, 35, 8, Math.PI / 8), c: A });
      S.push({ p: ngon(64, 190, 22, 25, 8, Math.PI / 8), c: '#8A5530' });
      S.push({ p: limb([52, 178], [78, 202], 7, 7), c: bt });
      S.push({ p: [[94, 128], [148, 128], [156, 166], [142, 200], [102, 200], [88, 166]], c: st });
      S.push({ p: limb([98, 198], [146, 198], 11, 11), c: bt });
      S.push({ p: limb([122, 112], [122, 134], 18, 22), c: sk });
      S.push({ p: [[98, 130], [146, 130], [158, 190], [168, 254], [122, 266], [76, 252], [86, 190]], c: '#E0662A' });
      S.push({ p: [[122, 176], [136, 202], [108, 202]], c: Y, sw: 3 });
      S.push({ p: ngon(96, 134, 18, 14, 6), c: st });
      headBack(S, 122, 90, 36, sk, '#6B3E22');
      const w0 = S.length;
      sword(S, [184, 122], [214, 26], { bw: 14, guard: 20, col: '#DCE5EC', guardCol: A });
      S.push({ p: ngon(150, 134, 18, 14, 6), c: st });
      arm(S, [150, 140], [178, 152], [184, 122], { u: st, hand: sk, w: 18, hr: 11 });
      spark(S, 206, 44, 9, '#FFF6D8');
      return { S, base: [122, 290, 80], weapon: [w0, S.length], pivot: [150, 140] };
    },
    nyra: () => {
      const S = [], sk = '#E8AE82', A = '#3DDC5B', cl = '#2F3A44', cl2 = '#3E4B58', bt = '#1E252C';
      S.push({ p: [[106, 140], [62, 120], [30, 132], [56, 146], [36, 164], [94, 156]], c: A });
      leg(S, [110, 202], [80, 236], [68, 286], cl, bt, 19, -1);
      leg(S, [136, 202], [170, 236], [166, 286], cl, bt, 19, 1);
      sword(S, [62, 206], [36, 242], { bw: 10, guard: 9, col: '#CFF5D6', guardCol: A, edge: A });
      arm(S, [102, 152], [76, 180], [62, 206], { u: cl, hand: sk, w: 15, hr: 10 });
      S.push({ p: [[98, 142], [146, 138], [156, 180], [142, 212], [106, 212], [94, 180]], c: cl2 });
      S.push({ p: limb([100, 200], [150, 194], 8, 8), c: A });
      S.push({ p: ngon(124, 144, 26, 11, 7), c: A });
      S.push({ p: [[90, 114], [92, 84], [108, 62], [132, 52], [156, 66], [166, 94], [162, 124], [144, 142], [106, 142]], c: cl2 });
      S.push({ raw: `<polyline points="132,56 128,100 124,138" fill="none" stroke="${OL}" stroke-width="3" stroke-linecap="round"/>` });
      const w0 = S.length;
      sword(S, [196, 150], [232, 112], { bw: 11, guard: 10, col: '#CFF5D6', guardCol: A, edge: A });
      arm(S, [148, 154], [178, 172], [196, 150], { u: cl, hand: sk, w: 15, hr: 10 });
      const w1 = S.length;
      S.push({ raw: `<g stroke="${A}" stroke-width="4" stroke-linecap="round"><line x1="26" y1="196" x2="48" y2="196"/><line x1="18" y1="212" x2="44" y2="212"/></g>` });
      return { S, base: [120, 290, 80], weapon: [w0, w1], pivot: [148, 154] };
    },
    boran: () => {
      const S = [], sk = '#C98657', A = '#1F7A3D', L = '#9ACD32', tu = '#8A5A34', pa = '#4B3A2C', bt = '#2E241C';
      leg(S, [96, 218], [86, 252], [78, 286], pa, bt, 32, -1);
      leg(S, [146, 218], [156, 252], [164, 286], pa, bt, 32, 1);
      arm(S, [72, 142], [36, 168], [46, 118], { u: sk, l: A, hand: A, w: 30, hr: 25 });
      S.push({ p: [[64, 128], [176, 128], [194, 172], [170, 226], [72, 226], [48, 172]], c: tu });
      S.push({ p: limb([80, 134], [160, 216], 11, 11), c: '#5C3A22' });
      S.push({ p: limb([160, 134], [80, 216], 11, 11), c: '#5C3A22' });
      S.push({ p: limb([62, 212], [178, 212], 17, 17), c: '#3B2A1E' });
      S.push({ p: ngon(120, 175, 12, 11, 6), c: L });
      S.push({ p: ngon(70, 138, 25, 19, 7), c: A }); S.push({ p: ngon(172, 138, 25, 19, 7), c: A });
      S.push({ p: limb([120, 108], [120, 132], 36, 44), c: sk });
      headBack(S, 120, 86, 33, sk, null);
      S.push({ p: [[138, 104], [154, 98], [152, 124], [136, 126]], c: '#6B3E22' });
      S.push({ raw: `<polygon points="${P(ngon(106, 66, 9, 5, 5))}" fill="#fff" opacity=".45"/>` });
      const w0 = S.length;
      arm(S, [168, 142], [206, 166], [194, 116], { u: sk, l: A, hand: A, w: 30, hr: 25 });
      const w1 = S.length;
      [[184, 108], [194, 102], [204, 110], [36, 110], [46, 104], [56, 112]].forEach(([x, y]) => S.push({ p: ngon(x, y, 4.5, 4.5, 5), c: L, sw: 2.5, sil: false }));
      return { S, base: [121, 290, 86], weapon: [w0, w1], pivot: [168, 142] };
    },
    ilwen: () => {
      const S = [], sk = '#F7D2B4', A = '#FFD23F', rb = '#5B3B6E', rb2 = '#4A2E5C', hr = '#E6E0F0';
      arm(S, [100, 142], [80, 170], [66, 194], { u: rb, hand: sk, w: 15, hr: 9 });
      S.push({ p: [[100, 130], [142, 130], [152, 170], [174, 286], [68, 286], [90, 170]], c: rb });
      S.push({ p: [[68, 286], [174, 286], [171, 274], [71, 274]], c: A, sw: 3.5 });
      S.push({ p: limb([90, 176], [152, 176], 10, 10), c: A });
      S.push({ p: [[90, 100], [152, 98], [160, 150], [146, 204], [122, 216], [98, 204], [84, 150]], c: hr });
      headBack(S, 121, 94, 34, sk, hr);
      S.push({ p: ngon(121, 64, 56, 13, 10), c: rb2 });
      S.push({ p: [[98, 62], [146, 60], [142, 36], [176, 8], [124, 22]], c: rb });
      S.push({ p: [[98, 62], [146, 60], [144, 50], [100, 52]], c: A, sw: 3.5 });
      const w0 = S.length;
      glow(S, 198, 112, 46, A, .35); glow(S, 198, 112, 28, '#FFF1A8', .5);
      arm(S, [142, 140], [170, 150], [186, 126], { u: rb, hand: sk, w: 15, hr: 9 });
      S.push({ p: [[168, 108], [198, 96], [218, 120], [186, 134]], c: '#8A3B22' });
      S.push({ p: [[186, 134], [218, 120], [219, 127], [188, 141]], c: '#F8EED6', sw: 3 });
      S.push({ raw: `<polygon points="193,106 201,121 185,121" fill="${A}" stroke="${OL}" stroke-width="2"/>` });
      const w1 = S.length;
      spark(S, 52, 208, 8, A); spark(S, 178, 78, 9, A); spark(S, 222, 84, 11, A); spark(S, 232, 128, 6, '#FF8C32');
      return { S, base: [121, 290, 80], weapon: [w0, w1], pivot: [142, 140] };
    },
    kestrel: () => {
      const S = [], sk = '#F6C9A0', A = '#9ACD32', tu = '#6E4A2E', pa = '#4A3B2E', bt = '#5C3A22', hr = '#D9622B';
      leg(S, [108, 196], [92, 240], [80, 286], pa, bt, 20, -1);
      leg(S, [134, 196], [150, 240], [160, 286], pa, bt, 20, 1);
      const bow = [[196, 34], [210, 56], [219, 86], [221, 118], [216, 150], [204, 178], [188, 198]];
      for (let i = 0; i < bow.length - 1; i++) S.push({ p: limb(bow[i], bow[i + 1], i === 0 || i === 5 ? 8 : 11, 11), c: A });
      S.push({ raw: `<polyline points="196,34 148,116 188,198" fill="none" stroke="#F8EED6" stroke-width="2.4"/>` });
      S.push({ p: limb([140, 116], [236, 104], 4.5, 4.5), c: '#8A5530', sw: 3 });
      S.push({ p: [[234, 97], [252, 103], [236, 111]], c: '#DCE5EC', sw: 3 });
      arm(S, [100, 142], [118, 122], [146, 116], { u: tu, hand: sk, w: 15, hr: 9 });
      S.push({ p: [[100, 134], [142, 132], [150, 166], [140, 200], [104, 200], [94, 166]], c: tu });
      S.push({ p: [[98, 132], [144, 130], [154, 172], [132, 238], [88, 232], [86, 170]], c: '#2E7A3E' });
      S.push({ p: limb([104, 120], [138, 202], 20, 18), c: bt });
      S.push({ p: limb([100, 138], [110, 162], 22, 22), c: '#8A5530', sw: 3 });
      [[96, 112], [106, 106], [116, 110]].forEach(([x, y]) => S.push({ p: [[x - 5, y + 8], [x, y - 10], [x + 5, y + 8]], c: R, sw: 3 }));
      S.push({ p: [[96, 82], [70, 70], [46, 98], [60, 116], [88, 102]], c: hr });
      headBack(S, 124, 92, 34, sk, hr);
      S.push({ p: limb([90, 78], [158, 72], 7, 7), c: A, sw: 3 });
      arm(S, [146, 142], [184, 132], [220, 118], { u: tu, hand: sk, w: 15, hr: 9 });
      return { S, base: [120, 290, 80] };
    },
    mira: () => {
      const S = [], sk = '#F2B48C', A = R, dr = '#F3E6C8', hr = '#8A4A2E', bt = '#8A5530';
      leg(S, [110, 200], [106, 242], [100, 286], sk, bt, 16, -1);
      leg(S, [134, 200], [144, 242], [148, 286], sk, bt, 16, 1);
      arm(S, [104, 146], [88, 178], [80, 204], { u: dr, l: sk, hand: sk, w: 14, hr: 9 });
      S.push({ p: [[104, 132], [140, 132], [148, 172], [170, 228], [122, 240], [76, 228], [96, 172]], c: dr });
      S.push({ p: [[78, 228], [168, 228], [164, 216], [82, 216]], c: A, sw: 3.5 });
      S.push({ p: limb([96, 172], [148, 172], 10, 10), c: A });
      S.push({ p: [[122, 172], [100, 158], [102, 190]], c: A, sw: 3.5 }); S.push({ p: [[122, 172], [144, 158], [142, 190]], c: A, sw: 3.5 });
      S.push({ p: ngon(122, 172, 7, 7, 6), c: Y, sw: 3 });
      S.push({ p: ngon(104, 142, 13, 11, 6), c: dr });
      S.push({ p: limb([122, 112], [122, 134], 16, 18), c: sk });
      S.push({ p: ngon(88, 64, 17, 17, 7), c: hr }); S.push({ p: ngon(156, 62, 17, 17, 7), c: hr });
      headBack(S, 122, 92, 35, sk, hr);
      const w0 = S.length;
      glow(S, 186, 78, 50, A, .28); glow(S, 186, 78, 30, Y, .45);
      S.push({ p: ngon(140, 142, 13, 11, 6), c: dr });
      arm(S, [140, 146], [170, 132], [180, 104], { u: dr, l: sk, hand: sk, w: 14, hr: 9 });
      S.push({ raw: `<polyline points="178,100 184,90" fill="none" stroke="#D9A62A" stroke-width="3"/>` });
      S.push({ p: ngon(186, 76, 16, 19, 6, Math.PI / 2), c: Y }); S.push({ p: ngon(186, 76, 10, 12, 6, Math.PI / 2), c: A, sw: 3 });
      const w1 = S.length;
      spark(S, 222, 60, 9, Y); spark(S, 222, 104, 6, A); spark(S, 156, 40, 7, Y);
      return { S, base: [122, 290, 78], weapon: [w0, w1], pivot: [140, 146] };
    },
    sbire: () => {
      const S = [], E1 = '#4B3F5C', E2 = '#625476', D = '#2A2233';
      S.push({ p: [[100, 236], [70, 246], [50, 226], [40, 240], [58, 258], [98, 252]], c: E1 });
      leg(S, [108, 238], [94, 262], [96, 286], E1, D, 13, -1);
      arm(S, [106, 206], [86, 226], [82, 246], { u: E1, hand: E2, w: 11, hr: 8 });
      S.push({ p: [[100, 196], [140, 192], [150, 222], [136, 246], [106, 246], [94, 222]], c: E2 });
      S.push({ p: [[98, 226], [146, 222], [138, 240], [120, 234], [104, 242]], c: '#6E4450' });
      leg(S, [132, 238], [152, 260], [148, 286], E1, D, 13, 1);
      S.push({ p: [[96, 158], [54, 136], [92, 178]], c: E1 }); S.push({ p: [[152, 156], [192, 130], [156, 176]], c: E1 });
      S.push({ p: [[92, 150], [112, 136], [140, 134], [160, 150], [158, 178], [140, 198], [108, 198], [90, 178]], c: E1 });
      S.push({ p: [[106, 140], [96, 112], [118, 136]], c: bone }); S.push({ p: [[134, 136], [148, 110], [148, 140]], c: bone });
      S.push({ raw: glare([[100, 158], [122, 166], [104, 174]]) + glare([[132, 166], [154, 156], [150, 174]]) + `<polygon points="${P(limb([100, 154], [124, 162], 5, 4))}" fill="${OL}"/><polygon points="${P(limb([130, 162], [156, 152], 4, 5))}" fill="${OL}"/><polygon points="106,182 150,177 142,191 112,193" fill="#1A0F1F" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/><polyline points="108,183 113,189 118,182 123,189 128,181 133,188 138,180 143,186 148,178" fill="none" stroke="#FFFDF6" stroke-width="2.2" stroke-linejoin="round"/>` });
      sword(S, [168, 214], [200, 172], { bw: 13, guard: 8, col: '#8E97A0', guardCol: '#5C3A22', edge: '#C8CED4' });
      arm(S, [140, 206], [160, 226], [168, 214], { u: E1, hand: E2, w: 11, hr: 8 });
      return { S, base: [120, 290, 64], flip: true, enemy: true, head: [124, 112] };
    },
    brute: () => {
      const S = [], E1 = '#46534B', E2 = '#5D6B60', D = '#27302A';
      arm(S, [98, 132], [62, 190], [68, 248], { u: E1, hand: E2, w: 34, hr: 25 });
      [[54, 264], [68, 268], [82, 264]].forEach(([x, y]) => S.push({ p: [[x - 5, y - 10], [x + 5, y - 10], [x, y + 6]], c: bone, sw: 3 }));
      leg(S, [120, 232], [108, 260], [100, 288], E1, D, 32, -1);
      leg(S, [178, 232], [192, 260], [200, 288], E1, D, 32, 1);
      S.push({ p: [[90, 120], [150, 98], [210, 116], [226, 170], [198, 238], [106, 240], [78, 180]], c: E2 });
      S.push({ p: [[118, 170], [170, 166], [178, 214], [112, 216]], c: E1 });
      S.push({ raw: `<polyline points="132,180 144,192 138,204 152,210" fill="none" stroke="${R}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` });
      S.push({ p: [[96, 118], [86, 90], [112, 110]], c: bone }); S.push({ p: [[200, 110], [214, 84], [216, 118]], c: bone });
      S.push({ p: [[124, 96], [146, 80], [172, 84], [186, 104], [178, 130], [154, 144], [130, 138], [120, 116]], c: E1 });
      S.push({ p: [[128, 92], [100, 62], [110, 50], [140, 84]], c: bone }); S.push({ p: [[172, 86], [194, 54], [206, 62], [184, 96]], c: bone });
      S.push({ raw: glare([[134, 104], [152, 110], [138, 116]]) + glare([[160, 110], [178, 102], [174, 116]]) + `<polygon points="${P(limb([132, 100], [154, 106], 6, 4))}" fill="${OL}"/><polygon points="${P(limb([158, 106], [180, 98], 4, 6))}" fill="${OL}"/><polygon points="136,124 176,120 170,132 142,134" fill="#1A0F1F" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/><polygon points="140,128 144,114 149,127" fill="${bone}" stroke="${OL}" stroke-width="2.5"/><polygon points="162,125 167,111 171,124" fill="${bone}" stroke="${OL}" stroke-width="2.5"/>` });
      S.push({ p: limb([226, 128], [258, 62], 12, 17), c: '#5C3A22' });
      S.push({ p: ngon(260, 56, 27, 31, 6, .3), c: '#7A6A5E' });
      [[240, 36], [282, 46], [262, 24], [284, 70]].forEach(([x, y]) => S.push({ p: [[x - 6, y + 6], [x, y - 12], [x + 6, y + 6]], c: bone, sw: 3 }));
      arm(S, [206, 128], [238, 154], [226, 124], { u: E1, hand: E2, w: 34, hr: 22 });
      return { S, base: [150, 290, 108], flip: true, enemy: true, head: [152, 58] };
    },
    boss: () => {
      const S = [], E1 = '#3B2C4A', E2 = '#55406A', D = '#261C30', ar = '#4A3A5E', gold = '#D9A62A';
      S.push({ p: [[130, 140], [230, 136], [278, 300], [262, 374], [238, 342], [214, 384], [190, 348], [160, 386], [138, 346], [110, 378], [94, 300]], c: '#2A1F36' });
      glow(S, 112, 50, 44, R, .3);
      arm(S, [128, 156], [94, 124], [110, 86], { u: ar, hand: E1, w: 26, hr: 17 });
      [[98, 72], [108, 66], [120, 70]].forEach(([x, y]) => S.push({ p: [[x - 4, y + 6], [x, y - 12], [x + 4, y + 6]], c: bone, sw: 3 }));
      S.push({ p: [[94, 70], [102, 34], [112, 52], [122, 20], [132, 50], [140, 40], [134, 74]], c: R, sw: 3.5, sil: false });
      S.push({ p: [[104, 70], [110, 50], [118, 60], [124, 40], [128, 72]], c: Y, sw: 3, sil: false });
      leg(S, [160, 262], [144, 318], [134, 388], ar, D, 32, -1);
      leg(S, [204, 262], [224, 318], [232, 388], ar, D, 32, 1);
      S.push({ p: [[132, 138], [228, 136], [244, 190], [220, 270], [140, 270], [118, 190]], c: ar });
      S.push({ p: [[152, 150], [208, 150], [214, 196], [180, 226], [146, 196]], c: E1 });
      glow(S, 180, 186, 26, R, .4);
      S.push({ p: ngon(180, 186, 13, 17, 6, Math.PI / 2), c: R });
      S.push({ p: [[140, 256], [220, 256], [234, 298], [180, 310], [126, 298]], c: E1 });
      S.push({ p: [[104, 150], [122, 122], [152, 130], [152, 162], [126, 174]], c: E2 });
      S.push({ p: [[112, 132], [88, 100], [128, 124]], c: bone });
      S.push({ p: [[158, 86], [126, 52], [136, 30], [168, 76]], c: bone }); S.push({ p: [[206, 86], [238, 52], [230, 30], [198, 76]], c: bone });
      S.push({ p: [[152, 100], [160, 76], [182, 68], [206, 76], [214, 100], [208, 128], [182, 142], [156, 128]], c: E1 });
      S.push({ p: [[156, 82], [208, 82], [206, 70], [158, 70]], c: Y, sw: 3.5 });
      [[164, 70], [182, 68], [200, 70]].forEach(([x, y], i) => S.push({ p: [[x - 7, y], [x, y - (i === 1 ? 26 : 16)], [x + 7, y]], c: gold, sw: 3.5 }));
      S.push({ raw: glare([[160, 102], [180, 108], [163, 115]]) + glare([[188, 108], [208, 99], [205, 114]]) + `<polygon points="168,124 198,122 194,132 172,133" fill="${R}" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/><g stroke="${OL}" stroke-width="2.5"><line x1="176" y1="123" x2="176" y2="133"/><line x1="183" y1="123" x2="183" y2="133"/><line x1="190" y1="122" x2="190" y2="132"/></g>` });
      sword(S, [238, 236], [304, 384], { bw: 26, guard: 30, col: '#3B2C4A', guardCol: Y, edge: R });
      S.push({ p: [[206, 130], [240, 120], [264, 148], [242, 172], [210, 160]], c: E2 });
      S.push({ p: [[236, 122], [256, 86], [252, 132]], c: bone });
      arm(S, [232, 152], [262, 198], [238, 236], { u: ar, hand: E1, w: 26, hr: 18 });
      return { S, base: [184, 390, 132], flip: true, enemy: true, head: [182, 36] };
    },
    coin: () => {
      const S = [], rot = Math.PI / 10;
      S.push({ p: ngon(8, 0, 50, 56, 10, rot), c: '#C98A1A' });
      S.push({ p: ngon(-4, 0, 50, 56, 10, rot), c: Y });
      S.push({ p: ngon(-4, 0, 32, 36, 10, rot), c: '#FFE27A', sw: 3.5 });
      S.push({ p: [[-4, -20], [14, 14], [-22, 14]], c: '#FF8C32', sw: 3.5 });
      S.push({ raw: `<polygon points="-34,-26 -26,-40 -18,-26" fill="#fff" opacity=".65"/>` });
      return { S, base: [0, 84, 64], item: true };
    },
    heart: () => {
      const S = [];
      S.push({ p: [[0, 58], [-50, 10], [-58, -16], [-48, -40], [-26, -50], [0, -32], [26, -50], [48, -40], [58, -16], [50, 10]], c: R });
      S.push({ p: [[-44, -26], [-30, -40], [-16, -36], [-32, -16]], c: '#FFB7A6', sw: 0, sil: false });
      return { S, base: [0, 86, 64], item: true };
    }
  };
}

export const TS = {};
TS.heroes = [['aldric', 'Aldric', 'Le Chevalier · Épée'], ['nyra', 'Nyra', "L'Assassine · Dague"], ['boran', 'Boran', 'Le Colosse · Gantelets'], ['ilwen', 'Ilwen', 'La Sorcière · Grimoire'], ['kestrel', 'Kestrel', 'La Rôdeuse · Arc'], ['mira', 'Mira', 'La Soigneuse · Amulette']];
TS.sprite = (name, opts = {}) => {
  const rec = opts.recolor && Object.fromEntries(Object.entries(opts.recolor).map(([k, v]) => [k.toUpperCase(), v]));
  const E = engine({ ol: opts.outline ?? 11, fc: opts.facets ?? 1, recolor: rec });   // opts.recolor : cosmétiques
  const C = defs(E)[name]();
  E.LX = C.flip ? .55 : -.55;
  const [cx, y, rx] = C.base;
  const soc = !C.item && (opts.socle ?? !C.enemy);
  let inner = soc ? E.socle(cx, y, rx, C.enemy ? '#2E8A4A' : '#3DDC5B', C.enemy ? '#14502A' : '#1F7A3D') : E.shadow(cx, y, rx);
  // opts.part = 'body' | 'weapon' : le héros en deux calques alignés (corps / bras armé) pour animer la frappe.
  const W = opts.part && C.weapon;
  if (W) {
    const body = E.parts([...C.S.slice(0, W[0]), ...C.S.slice(W[1])]), arm = E.parts(C.S.slice(W[0], W[1]));
    inner = opts.part === 'weapon' ? arm : inner + body;
  } else inner += E.parts(C.S);
  const s = opts.scale || 1, r = E.out(inner, C.flip, s, [cx, y], C.head || [cx, y - 220]);
  if (W) { r.px = (C.pivot[0] - cx) * s + r.fx; r.py = (C.pivot[1] - y) * s + r.fy; }
  return r;
};

TS.bg = (o = {}) => {
  const E = engine({ ol: 7, seed: 21 }); const { P, sh, lerp, ngon, limb, rnd, parts } = E;
  const W = 390, H = 844, HZ = 262, calm = o.calm ?? 1; let s = '';
  const grid = (y0, y1, cols, rows, colFn, ampFn) => {
    const pts = [];
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const jx = i > 0 && i < cols ? (rnd() - .5) * .8 : 0, jy = j > 0 && j < rows ? (rnd() - .5) * .8 : 0;
      pts.push([(i + jx) * W / cols, y0 + (j + jy) * (y1 - y0) / rows]);
    }
    const g = (i, j) => pts[j * (cols + 1) + i];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = g(i, j), b = g(i + 1, j), c = g(i + 1, j + 1), d = g(i, j + 1);
      for (const t of ((i + j) % 2 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]])) {
        const cx = (t[0][0] + t[1][0] + t[2][0]) / 3, cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
        const col = sh(colFn(cx, cy), (rnd() - .5) * 2 * ampFn(cx, cy));
        s += `<polygon points="${P(t)}" fill="${col}" stroke="${col}" stroke-width="1" stroke-linejoin="round"/>`;
      }
    }
  };
  grid(0, HZ + 20, 6, 6, (x, y) => { const t = y / HZ; return t < .55 ? lerp('#F2915A', '#FFC07A', t / .55) : lerp('#FFC07A', '#FFE3A6', (t - .55) / .45); }, () => .05);
  s += `<polygon points="${P(ngon(304, 178, 64, 64, 12, .2))}" fill="#FFF1C2" opacity=".45"/>`;
  s += parts([{ p: ngon(304, 178, 30, 30, 10, .2), c: '#FFE59A', sw: 3.5, sil: false }]);
  [[70, 92, 1], [250, 70, .8]].forEach(([x, y, k]) => { s += parts([{ p: [[x - 44 * k, y + 10 * k], [x - 26 * k, y - 8 * k], [x - 4 * k, y - 16 * k], [x + 22 * k, y - 10 * k], [x + 42 * k, y + 8 * k]], c: '#FFE9CF', sw: 3 }], 5); });
  s += parts([{ p: [[-6, HZ - 34], [58, HZ - 58], [124, HZ - 40], [196, HZ - 66], [262, HZ - 44], [334, HZ - 62], [396, HZ - 46], [396, HZ + 14], [-6, HZ + 14]], c: '#8DB86A', sw: 4 }], 6);
  grid(HZ, H, 8, 16, (x, y) => lerp('#8FD05E', '#2FA24A', (y - HZ) / (H - HZ)), (x) => { const ex = Math.abs(x - W / 2) / (W / 2); return .018 * (2 - calm) + .13 * ex * ex; });
  s += `<polygon points="${P(ngon(195, 540, 168, 200, 16, .1))}" fill="#FFFFFF" opacity="${(.05 * calm).toFixed(3)}"/>`;
  const pine = (x, yb, h, m) => { const c = m ? ['#4E9A5A', '#3A7F4A'] : ['#3FA85A', '#2E8A4A']; const S = [{ p: limb([x, yb + 2], [x, yb - h * .22], h * .1, h * .08), c: '#6B4428' }]; for (let i = 0; i < 3; i++) { const b = yb - h * .14 - i * h * .22, w = h * .34 * (1 - i * .22), a = b - h * .36; S.push({ p: [[x - w, b], [x - w * .2, b + h * .03], [x + w * .3, b + h * .02], [x + w, b], [x, a]], c: c[i % 2] }); } return S; };
  const round = (x, yb, h) => [{ p: limb([x, yb + 2], [x, yb - h * .4], h * .12, h * .09), c: '#6B4428' }, { p: ngon(x - h * .14, yb - h * .6, h * .26, h * .24, 7, .3), c: '#2E8A4A' }, { p: ngon(x + h * .08, yb - h * .72, h * .3, h * .28, 8, .1), c: '#3FA85A' }];
  const rock = (x, y, r) => [{ p: ngon(x, y - r * .4, r, r * .7, 6, .4), c: '#A2988A' }, { p: ngon(x + r * .8, y - r * .15, r * .5, r * .4, 5), c: '#8C8374' }];
  const bush = (x, y, r) => [{ p: ngon(x, y - r * .6, r, r * .75, 7), c: '#5DBA4F' }, { p: ngon(x + r * .8, y - r * .4, r * .6, r * .5, 6), c: '#4AA548' }];
  for (let x = -14; x <= 404; x += 28) s += parts(pine(x + (rnd() - .5) * 10, HZ + 8 + rnd() * 8, 42 + rnd() * 24, 1), 5);
  const L = [['pine', 14, 420, 160], ['bush', 62, 468, 20], ['round', -10, 590, 190], ['rock', 22, 660, 18], ['pine', 26, 720, 120], ['rock', 58, 808, 26], ['round', 386, 404, 150], ['bush', 330, 478, 18], ['pine', 372, 586, 176], ['rock', 372, 668, 16], ['pine', 396, 752, 132], ['rock', 334, 810, 22]].sort((a, b) => a[2] - b[2]);
  const F = { pine, round, rock, bush };
  for (const [k, x, y, h] of L) s += parts(F[k](x, y, h), 7);
  for (let i = 0; i < 26; i++) {
    const left = i % 2 === 0, x = left ? 6 + rnd() * 62 : 322 + rnd() * 62, y = 300 + rnd() * 520;
    if (i % 5 === 0) s += `<polygon points="${P(ngon(x, y, 5, 5, 5))}" fill="${i % 10 === 0 ? '#FFD23F' : '#FF8C32'}" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>`;
    else s += `<polygon points="${P([[x - 7, y], [x - 3, y - 12], [x, y - 4], [x + 3, y - 14], [x + 5, y - 3], [x + 9, y - 10], [x + 9, y]])}" fill="#9ACD32" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" style="display:block">${s}</svg>`;
};

TS.hand = (poly, frac = 1, seed = 3, jit = 2.2) => {
  let sd = seed; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const segs = []; let L = 0;
  for (let i = 0; i < poly.length - 1; i++) { const a = poly[i], b = poly[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push([a, b, l]); L += l; }
  const out = [poly[0]]; let acc = 0; const lim = L * frac;
  for (const [a, b, l] of segs) {
    const n = Math.max(2, Math.round(l / 14)), nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      if (acc + l * t > lim) { const u = (lim - acc) / l; out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); return out; }
      const j = k === n ? 0 : (r() - .5) * 2 * jit;
      out.push([a[0] + (b[0] - a[0]) * t + nx * j, a[1] + (b[1] - a[1]) * t + ny * j]);
    }
    acc += l;
  }
  return out;
};
TS.arc = (cx, cy, r, a0, sweep, n = 40, seed = 5) => {
  let sd = seed; const rn = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  return Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + sweep * i / n) * Math.PI / 180, rr = r * (1 + (rn() - .5) * .05); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 1.04]; });
};
TS.trace = (pts, o = {}) => {
  const id = o.id || 'tr', l = pts[pts.length - 1];
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) { const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]; d += ` Q${f1(pts[i][0])} ${f1(pts[i][1])} ${f1(m[0])} ${f1(m[1])}`; }
  d += ` L${f1(l[0])} ${f1(l[1])}`;
  const st = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
  const tip = o.tip ? `<circle cx="${f1(l[0])}" cy="${f1(l[1])}" r="24" fill="#FFD23F" opacity=".55" filter="url(#${id})"/><circle cx="${f1(l[0])}" cy="${f1(l[1])}" r="13" fill="none" stroke="#FFD23F" stroke-width="3.5"/><circle cx="${f1(l[0])}" cy="${f1(l[1])}" r="8" fill="#FFFFFF"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844" width="390" height="844" style="display:block;overflow:visible" opacity="${o.op ?? 1}"><defs><filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter><linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="${f1(pts[0][0])}" y1="${f1(pts[0][1])}" x2="${f1(l[0])}" y2="${f1(l[1])}"><stop offset="0" stop-color="#FFD23F" stop-opacity=".45"/><stop offset="1" stop-color="#FFF4C4"/></linearGradient></defs><path d="${d}" ${st} stroke="#FFD23F" stroke-width="36" opacity=".55" filter="url(#${id})"/><path d="${d}" ${st} stroke="#15301E" stroke-width="19" opacity=".3"/><path d="${d}" ${st} stroke="url(#${id}g)" stroke-width="14"/><path d="${d}" ${st} stroke="#FFFFFF" stroke-width="5" opacity=".9"/>${tip}</svg>`;
};
TS.ring = (R = 100, r2 = 54) => {
  const S = 230, c = S / 2;
  const pts = (r, n) => Array.from({ length: n }, (_, i) => { const a = i * 2 * Math.PI / n - Math.PI / 2; return f1(c + Math.cos(a) * r) + ',' + f1(c + Math.sin(a) * r); }).join(' ');
  let chev = '';
  [-45, 45, 135, 225].forEach(g => { const a = g * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux; const t = [c + ux * (R - 20), c + uy * (R - 20)], b = [c + ux * (R - 2), c + uy * (R - 2)]; chev += `<polygon points="${f1(t[0])},${f1(t[1])} ${f1(b[0] + px * 9)},${f1(b[1] + py * 9)} ${f1(b[0] - px * 9)},${f1(b[1] - py * 9)}" fill="#FF5A3C" stroke="#15301E" stroke-width="3" stroke-linejoin="round"/>`; });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" style="display:block;overflow:visible"><polygon points="${pts(R, 20)}" fill="#FF5A3C" fill-opacity=".08" stroke="#15301E" stroke-width="12" stroke-linejoin="round"/><polygon points="${pts(R, 20)}" fill="none" stroke="#FF5A3C" stroke-width="6.5" stroke-linejoin="round"/><polygon points="${pts(R - 1, 20)}" fill="none" stroke="#FFB7A6" stroke-width="1.8" opacity=".9"/><polygon points="${pts(r2, 16)}" fill="none" stroke="#FF5A3C" stroke-width="3" stroke-dasharray="7 7" opacity=".9"/>${chev}</svg>`;
};
const mixL = (hex, t) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const T = t < 0 ? 0 : 255, a = Math.min(1, Math.abs(t)); r = Math.round(r + (T - r) * a); g = Math.round(g + (T - g) * a); b = Math.round(b + (T - b) * a); return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1); };
TS.glyph = (type, color, size, opt = {}) => {
  const out = opt.outline ?? (size < 40 ? 2 : 3.5), sw = out * 24 / size, polys = []; let outline;
  const LIGHT = -Math.PI * .75, shade = (ang, base = 0) => mixL(color, Math.cos(ang - LIGHT) * .3 + base);
  if (type === 'tri') {
    const A = [12, 2], B = [22.5, 20.5], C = [1.5, 20.5], G = [12, 14.3], mAB = [17.25, 11.25], mBC = [12, 20.5], mCA = [6.75, 11.25];
    const f = (pts, v) => polys.push([pts.map(p => p.join(',')).join(' '), mixL(color, v)]);
    f([A, mAB, G], .12); f([mAB, B, G], -.08); f([B, mBC, G], -.3); f([mBC, C, G], -.2); f([C, mCA, G], .3); f([mCA, A, G], .4);
    outline = [A, B, C].map(p => p.join(',')).join(' ');
  } else {
    const n = opt.n ?? (type === 'circle' ? 8 : 6), R = type === 'circle' ? 10.5 : 6.5, ri = R * .55, O = [], I = [];
    for (let i = 0; i < n; i++) { const a = i * 2 * Math.PI / n - Math.PI / 2; O.push([12 + R * Math.cos(a), 12 + R * Math.sin(a)]); const b = a + Math.PI / n; I.push([12 + ri * Math.cos(b), 12 + ri * Math.sin(b)]); }
    const P = pts => pts.map(p => p[0].toFixed(2) + ',' + p[1].toFixed(2)).join(' ');
    for (let i = 0; i < n; i++) { const a = i * 2 * Math.PI / n - Math.PI / 2, j = (i + 1) % n, k = (i - 1 + n) % n; polys.push([P([O[i], O[j], I[i]]), shade(a + Math.PI / n, -.06)]); polys.push([P([I[k], O[i], I[i]]), shade(a, .02)]); polys.push([P([[12, 12], I[i], I[j]]), shade(a + 2 * Math.PI / n, .14)]); }
    outline = P(O);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;overflow:visible">${polys.map(p => `<polygon points="${p[0]}" fill="${p[1]}" stroke="${p[1]}" stroke-width=".3" stroke-linejoin="round"/>`).join('')}<polygon points="${outline}" fill="none" stroke="#15301E" stroke-width="${sw}" stroke-linejoin="round"/></svg>`;
};
TS.facets = (cols, rows, seed, alpha) => {
  let sd = seed; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; }; const P = [];
  for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) { const jx = x > 0 && x < cols ? (r() - .5) * .8 : 0, jy = y > 0 && y < rows ? (r() - .5) * .8 : 0; P.push([(x + jx) * 100 / cols, (y + jy) * 100 / rows]); }
  const id = (x, y) => P[y * (cols + 1) + x].map(v => v.toFixed(2)).join(','); let s = '';
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const a = id(x, y), b = id(x + 1, y), c = id(x + 1, y + 1), d = id(x, y + 1);
    for (const t of ((x + y) % 2 ? [a + ' ' + b + ' ' + c, a + ' ' + c + ' ' + d] : [a + ' ' + b + ' ' + d, b + ' ' + c + ' ' + d])) { const w = r() > .5; s += `<polygon points="${t}" fill="${w ? '#fff' : '#000'}" fill-opacity="${(r() * alpha * (w ? 1.2 : .8)).toFixed(3)}"/>`; }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">${s}</svg>`;
};
