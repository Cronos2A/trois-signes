(function (W) {
const OL = '#17251B', OLW = 11; let LX = -0.55; const LY = -0.83;
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (h, t, k) => '#' + rgb(h).map((v, i) => Math.round(v + (t[i] - v) * k).toString(16).padStart(2, '0')).join('');
const sh = (h, a) => a >= 0 ? mix(h, [255, 248, 222], Math.min(a, .9)) : mix(h, [16, 28, 32], Math.min(-a, .9));
const P = pts => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
const nrm = a => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; }, perp = a => [-a[1], a[0]];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const ngon = (cx, cy, rx, ry, n, rot = 0) => Array.from({ length: n }, (_, i) => { const t = rot + i * 2 * Math.PI / n; return [cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]; });
const fluff = (cx, cy, rx, ry, n) => Array.from({ length: n * 2 }, (_, i) => { const t = i * Math.PI / n, k = i % 2 ? .78 : 1; return [cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]; });
const dropPts = (cx, cy, r) => { const p = [[cx, cy - r * 1.9]]; for (let i = 0; i <= 8; i++) { const a = -Math.PI / 6 + i * (Math.PI * 4 / 3) / 8; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; };
const limb = (a, b, wa, wb) => { const n = perp(nrm(sub(b, a))); return [add(a, mul(n, wa / 2)), add(b, mul(n, wb / 2)), sub(b, mul(n, wb / 2)), sub(a, mul(n, wa / 2))]; };
const tri = (pts, f) => `<polygon points="${P(pts)}" fill="${f}" stroke="${f}" stroke-width="0.8" stroke-linejoin="round"/>`;
const pl = (pts, w, c, op) => `<polyline points="${P(pts)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op ? ` opacity="${op}"` : ''}/>`;
const facets = (pts, col) => {
  let cx = 0, cy = 0; pts.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= pts.length; cy /= pts.length;
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const m = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * .16;
  const c = [cx + LX * m, cy + LY * m]; let s = '';
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy, l = Math.hypot(mx, my) || 1;
    const d = (LX * mx + LY * my) / l;
    s += tri([c, a, b], sh(col, (d > 0 ? d * .2 : d * .32) + (rnd() - .5) * .08));
  }
  return s;
};
const parts = S => {
  let sil = '', body = '';
  for (const q of S) {
    if (q.raw !== undefined) { body += q.raw; continue; }
    const pp = P(q.p);
    if (q.sil !== false) sil += `<polygon points="${pp}" fill="${OL}" stroke="${OL}" stroke-width="${OLW}" stroke-linejoin="round"/>`;
    body += `<g${q.o != null ? ` opacity="${q.o}"` : ''}><polygon points="${pp}" fill="${q.c}" stroke="${q.sw === 0 ? 'none' : OL}" stroke-width="${q.sw ?? 4.5}" stroke-linejoin="round"/>${facets(q.p, q.c)}</g>`;
  }
  return sil + body;
};
const shadow = (cx, y, rx) => `<polygon points="${P(ngon(cx + rx * .1, y + 1, rx * .6, rx * .12, 9))}" fill="${OL}" opacity=".3"/>`;
const socle = (cx, y, rx) => {
  const t = ngon(cx, y, rx, rx * .2, 10, 0), fr = t.slice(0, 6);
  const B = [{ p: [...fr, ...fr.map(p => [p[0], p[1] + 18]).reverse()], c: '#1F7A3D' }, { p: t, c: '#3DDC5B' }];
  [[-.62, .1], [.5, .14], [.78, .02]].forEach(([u, v]) => { const x = cx + u * rx, yy = y + v * rx; B.push({ p: [[x - 7, yy], [x - 2, yy - 13], [x + 1, yy - 4], [x + 5, yy - 11], [x + 8, yy]], c: '#9ACD32', sw: 3, sil: false }); });
  return parts(B) + shadow(cx, y, rx);
};
const head = (S, x, y, r, skin) => { const p = ngon(x, y, r, r * 1.02, 9, Math.PI / 2); p[0] = [x + r * .08, y + r * 1.12]; S.push({ p, c: skin }); S.push({ p: ngon(x - r * .8, y + r * .12, r * .2, r * .27, 6), c: skin }); };
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
  return { d, n, b, pm };
};
const glow = (S, x, y, r, c, op) => S.push({ p: ngon(x, y, r, r, 12, .2), c, o: op, sil: false, sw: 0 });
const spark = (S, x, y, s, c) => S.push({ p: [[x, y - s], [x + s * .45, y], [x, y + s], [x - s * .45, y]], c, sw: 3, sil: false });
const clipBands = (id, poly, lines, col, w) => `<clipPath id="${id}"><polygon points="${P(poly)}"/></clipPath><g clip-path="url(#${id})">${lines.map(l => pl(l, w, col)).join('')}</g>`;
const face = (x, y, r, f) => {
  const fx = x + r * .14, ey = y + r * .04, e1 = fx - r * .34, e2 = fx + r * .3, E = f.eyes || ['normal', 'normal'];
  let s = '';
  const eye = (ex, kind) => {
    const rx = r * .15, ry = r * .21;
    if (kind === 'closed') return `<polyline points="${P([[ex - rx, ey], [ex, ey + ry * .15], [ex + rx, ey - ry * .1]])}" fill="none" stroke="${OL}" stroke-width="${r * .09}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const k = kind === 'narrow' ? .62 : 1;
    let t = `<polygon points="${P(ngon(ex, ey, rx, ry * k, 7, Math.PI / 2))}" fill="#FFFDF6" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>`;
    const px = ex + r * .05, pr = Math.min(rx, ry * k) * .72;
    t += `<polygon points="${P(ngon(px, ey + ry * k * .05, pr, pr * 1.1, 6, Math.PI / 6))}" fill="${f.iris || '#3A2E28'}"/>`;
    t += `<polygon points="${P(ngon(px, ey + ry * k * .05, pr * .5, pr * .55, 6))}" fill="${OL}"/>`;
    t += `<polygon points="${P(ngon(px + pr * .35, ey - pr * .4, pr * .32, pr * .32, 5))}" fill="#fff"/>`;
    if (kind === 'sparkle') t += `<polygon points="${P(ngon(px - pr * .35, ey + pr * .45, pr * .18, pr * .18, 4))}" fill="#fff"/>`;
    if (kind === 'half') t += `<polygon points="${P([[ex - rx - 2, ey - ry - 3], [ex + rx + 2, ey - ry - 3], [ex + rx + 2, ey - ry * .15], [ex - rx - 2, ey + ry * .05]])}" fill="${f.skin}"/><line x1="${ex - rx - 2}" y1="${ey + ry * .05}" x2="${ex + rx + 2}" y2="${ey - ry * .15}" stroke="${OL}" stroke-width="3.5" stroke-linecap="round"/>`;
    return t;
  };
  s += `<polygon points="${P([[fx + r * .02, y + r * .16], [fx + r * .16, y + r * .32], [fx - r * .03, y + r * .33]])}" fill="${sh(f.skin, -.22)}"/>`;
  if (f.blush) s += `<polygon points="${P(ngon(e1 - r * .06, ey + r * .32, r * .13, r * .07, 6))}" fill="#FF5A3C" opacity=".45"/><polygon points="${P(ngon(e2 + r * .1, ey + r * .32, r * .13, r * .07, 6))}" fill="#FF5A3C" opacity=".45"/>`;
  s += eye(e1, E[0]) + eye(e2, E[1]);
  const B = { angry: [[-.2, -.09], [.16, .07], [-.16, .07], [.2, -.09]], stern: [[-.21, -.02], [.17, .06], [-.17, .06], [.21, -.02]], up: [[-.2, .03], [.16, -.09], [-.16, -.09], [.2, .03]], calm: [[-.2, .02], [.18, -.04], [-.18, -.04], [.2, .02]], haughty: [[-.2, -.01], [.17, .04], [-.17, -.12], [.21, -.17]], sly: [[-.2, -.08], [.16, .07], [-.16, -.07], [.21, -.13]] }[f.brow];
  const by = ey - r * .34, bw = (a, b) => `<polygon points="${P(limb(a, b, r * .14, r * .1))}" fill="${f.browCol || OL}" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>`;
  s += bw([e1 + B[0][0] * r, by + B[0][1] * r], [e1 + B[1][0] * r, by + B[1][1] * r]) + bw([e2 + B[2][0] * r, by + B[2][1] * r], [e2 + B[3][0] * r, by + B[3][1] * r]);
  const mx = fx, my = y + r * .52, st = `stroke="${OL}" stroke-width="3.5" stroke-linejoin="round"`;
  const line = pts => `<polyline points="${P(pts)}" fill="none" stroke="${OL}" stroke-width="${r * .09}" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (f.mouth === 'grin') s += `<polygon points="${P([[mx - r * .34, my - r * .08], [mx + r * .3, my - r * .13], [mx + r * .2, my + r * .14], [mx - r * .02, my + r * .21], [mx - r * .22, my + r * .12]])}" fill="#5B1E22" ${st}/><polygon points="${P([[mx - r * .3, my - r * .07], [mx + r * .27, my - r * .12], [mx + r * .24, my - r * .01], [mx - r * .27, my + r * .03]])}" fill="#FFFDF6"/>`;
  if (f.mouth === 'open') s += `<polygon points="${P([[mx - r * .3, my - r * .1], [mx + r * .3, my - r * .12], [mx + r * .22, my + r * .16], [mx, my + r * .27], [mx - r * .22, my + r * .17]])}" fill="#5B1E22" ${st}/><polygon points="${P(ngon(mx + r * .01, my + r * .15, r * .14, r * .08, 6))}" fill="#FF7A62"/><polygon points="${P([[mx - r * .26, my - r * .09], [mx + r * .27, my - r * .11], [mx + r * .24, my - r * .02], [mx - r * .24, my]])}" fill="#FFFDF6"/>`;
  if (f.mouth === 'smirk') s += line([[mx - r * .2, my + r * .04], [mx + r * .06, my + r * .05], [mx + r * .27, my - r * .09]]);
  if (f.mouth === 'firm') s += line([[mx - r * .22, my + r * .07], [mx, my + r * .02], [mx + r * .21, my + r * .06]]) + line([[mx - r * .06, my + r * .2], [mx + r * .07, my + r * .2]]);
  if (f.mouth === 'focus') s += `<polygon points="${P([[mx - r * .2, my], [mx + r * .22, my - r * .04], [mx + r * .14, my + r * .1], [mx - r * .12, my + r * .1]])}" fill="#5B1E22" ${st}/><polygon points="${P(ngon(mx + r * .16, my + r * .09, r * .09, r * .07, 6))}" fill="#FF7A62" ${st}/>`;
  return { raw: s };
};

// ===================== ORIGINAUX (lobby, inchangés) =====================
const ORIG = {
  eldan() {
    const S = [], A = [], { sk, hr, tu, ro, ac, pa, bt } = EJ;
    leg(S, [110, 196], [102, 240], [96, 286], pa, bt, 20, -1);
    arm(S, [98, 140], [82, 172], [88, 204], { u: tu, hand: sk, w: 15, hr: 9 });
    leg(S, [134, 196], [146, 240], [152, 286], pa, bt, 20, 1);
    S.push({ p: limb([122, 116], [122, 134], 16, 20), c: sk });
    S.push({ p: [[96, 130], [148, 130], [156, 170], [160, 226], [122, 234], [84, 226], [90, 170]], c: tu });
    S.push({ raw: pl([[110, 134], [122, 152], [134, 134]], 3.5, ac) + pl([[86, 222], [122, 230], [158, 222]], 3, '#D8D0B0') });
    S.push({ p: limb([88, 198], [156, 198], 10, 10), c: ro });
    S.push({ raw: `<polyline points="90,198 154,198" fill="none" stroke="#A8844A" stroke-width="2.2" stroke-dasharray="4 5"/>` });
    S.push({ p: ngon(138, 200, 8, 7, 6), c: ro, sw: 3 });
    S.push({ p: limb([136, 206], [132, 222], 6, 5), c: ro, sw: 3 }); S.push({ p: limb([141, 206], [146, 220], 6, 5), c: ro, sw: 3 });
    S.push({ p: ngon(98, 138, 15, 12, 6), c: tu });
    head(S, 122, 92, 34, sk);
    S.push({ p: ejHair, c: hr });
    S.push(face(122, 92, 34, { skin: sk, brow: 'up', mouth: 'grin', iris: '#4A7A9A', browCol: '#5A3A24' }));
    ejStaff(A, [176, 288], [192, 30]);
    A.push({ p: ngon(146, 138, 15, 12, 6), c: tu });
    arm(A, [148, 142], [172, 170], [184, 158], { u: tu, hand: sk, w: 15, hr: 9 });
    spark(A, 210, 36, 8, '#DDF2FF');
    return { S, A, pivot: [148, 142], base: [122, 290, 80] };
  },
  aldric() {
    const S = [], sk = '#F4BE8E', A = '#FF8C32', st = '#B7C3CE', bt = '#5C3A22';
    S.push({ p: [[96, 128], [150, 126], [178, 250], [126, 266], [70, 250]], c: '#E0662A' });
    leg(S, [108, 192], [98, 238], [90, 286], '#98A5B2', bt, 22, -1);
    arm(S, [96, 140], [76, 172], [80, 200], { u: st, hand: sk, w: 18, hr: 11 });
    S.push({ p: ngon(70, 196, 32, 35, 8, Math.PI / 8), c: A }); S.push({ p: ngon(70, 196, 12, 13, 6), c: st });
    leg(S, [136, 192], [150, 238], [158, 286], st, bt, 22, 1);
    S.push({ p: limb([122, 116], [122, 134], 18, 22), c: sk });
    S.push({ p: [[94, 128], [148, 128], [156, 166], [142, 198], [102, 198], [88, 166]], c: st });
    S.push({ p: [[104, 156], [140, 156], [146, 224], [123, 232], [100, 224]], c: A });
    S.push({ p: [[122, 166], [133, 186], [111, 186]], c: '#FFD23F', sw: 3 });
    S.push({ p: limb([98, 198], [146, 198], 11, 11), c: bt });
    S.push({ p: ngon(96, 136, 17, 14, 6), c: st });
    head(S, 122, 90, 36, sk);
    S.push({ p: [[86, 86], [90, 62], [112, 49], [142, 51], [160, 68], [161, 88], [150, 74], [132, 70], [112, 76], [98, 94]], c: '#6B3E22' });
    S.push(face(122, 90, 36, { skin: sk, brow: 'stern', mouth: 'firm', iris: '#2F5D8A' }));
    sword(S, [182, 130], [214, 30], { bw: 14, guard: 20, col: '#DCE5EC', guardCol: A });
    S.push({ p: ngon(150, 137, 18, 15, 6), c: st });
    arm(S, [150, 142], [176, 168], [182, 130], { u: st, hand: sk, w: 18, hr: 11 });
    spark(S, 204, 50, 9, '#FFF6D8');
    return { S, base: [122, 290, 80] };
  },
  nyra() {
    const S = [], sk = '#E8AE82', A = '#3DDC5B', cl = '#2F3A44', cl2 = '#3E4B58', bt = '#1E252C';
    arm(S, [104, 152], [80, 144], [62, 124], { u: cl, hand: sk, w: 15, hr: 10 });
    S.push({ p: [[108, 140], [64, 120], [34, 134], [58, 146], [38, 162], [94, 156]], c: A });
    leg(S, [112, 198], [80, 232], [66, 286], cl, bt, 19, -1);
    S.push({ p: [[100, 146], [140, 138], [152, 178], [140, 206], [108, 208], [96, 178]], c: cl2 });
    S.push({ p: limb([104, 196], [148, 188], 8, 8), c: A });
    leg(S, [136, 198], [172, 234], [166, 286], cl, bt, 19, 1);
    S.push({ p: [[92, 122], [96, 84], [122, 64], [154, 70], [170, 98], [166, 128], [150, 140], [104, 140]], c: cl2 });
    head(S, 130, 110, 34, sk);
    S.push({ p: [[94, 108], [102, 78], [128, 64], [158, 72], [168, 100], [154, 88], [132, 84], [112, 92]], c: cl2 });
    S.push({ p: [[108, 92], [132, 82], [150, 86], [124, 96]], c: bt, sw: 3 });
    S.push({ p: ngon(126, 142, 24, 11, 7), c: A });
    S.push(face(130, 110, 34, { skin: sk, brow: 'sly', mouth: 'smirk', eyes: ['half', 'half'], iris: '#1F7A3D' }));
    sword(S, [196, 170], [236, 150], { bw: 11, guard: 10, col: '#CFF5D6', guardCol: A, edge: '#3DDC5B' });
    arm(S, [146, 152], [170, 180], [196, 170], { u: cl, hand: sk, w: 15, hr: 10 });
    S.push({ raw: `<g stroke="${A}" stroke-width="4" stroke-linecap="round"><line x1="40" y1="200" x2="62" y2="200"/><line x1="30" y1="216" x2="58" y2="216"/></g>` });
    return { S, base: [120, 290, 80] };
  },
  boran() {
    const S = [], sk = '#C98657', A = '#1F7A3D', L = '#9ACD32', tu = '#8A5A34', pa = '#4B3A2C', bt = '#2E241C';
    arm(S, [72, 142], [44, 182], [46, 216], { u: sk, l: A, hand: A, w: 30, hr: 25 });
    leg(S, [96, 218], [88, 252], [80, 286], pa, bt, 32, -1);
    leg(S, [146, 218], [154, 252], [162, 286], pa, bt, 32, 1);
    S.push({ p: limb([120, 110], [120, 134], 36, 44), c: sk });
    S.push({ p: [[64, 128], [176, 128], [194, 172], [170, 226], [72, 226], [48, 172]], c: tu });
    S.push({ p: [[96, 130], [146, 130], [134, 168], [108, 168]], c: sk });
    S.push({ p: limb([62, 210], [178, 210], 17, 17), c: '#3B2A1E' });
    S.push({ p: ngon(121, 210, 13, 11, 6), c: L });
    S.push({ p: ngon(70, 138, 25, 19, 7), c: A }); S.push({ p: ngon(172, 138, 25, 19, 7), c: A });
    head(S, 120, 88, 34, sk);
    S.push({ p: [[90, 96], [150, 94], [158, 112], [142, 132], [122, 140], [100, 132], [86, 112]], c: '#6B3E22' });
    S.push(face(120, 88, 34, { skin: sk, brow: 'calm', mouth: 'grin', eyes: ['narrow', 'narrow'], browCol: '#6B3E22' }));
    S.push({ raw: `<polygon points="${P(ngon(106, 64, 8, 5, 5))}" fill="#fff" opacity=".45"/>` });
    arm(S, [170, 142], [200, 182], [164, 188], { u: sk, l: A, hand: A, w: 30, hr: 25 });
    [[156, 180], [166, 176], [176, 182]].forEach(([x, y]) => S.push({ p: ngon(x, y, 4.5, 4.5, 5), c: L, sw: 2.5, sil: false }));
    [[40, 208], [50, 204], [58, 212]].forEach(([x, y]) => S.push({ p: ngon(x, y, 4.5, 4.5, 5), c: L, sw: 2.5, sil: false }));
    return { S, base: [121, 290, 86] };
  },
  ilwen() {
    const S = [], sk = '#F7D2B4', A = '#FFD23F', rb = '#5B3B6E', rb2 = '#4A2E5C', hr = '#E6E0F0';
    S.push({ p: [[86, 80], [156, 78], [164, 150], [142, 170], [98, 170], [80, 140]], c: hr });
    arm(S, [102, 140], [80, 168], [100, 190], { u: rb, hand: sk, w: 15, hr: 9 });
    S.push({ p: [[100, 130], [142, 130], [150, 170], [172, 286], [70, 286], [92, 170]], c: rb });
    S.push({ p: [[70, 286], [172, 286], [169, 274], [73, 274]], c: A, sw: 3.5 });
    S.push({ p: limb([92, 176], [150, 176], 10, 10), c: A });
    S.push({ p: ngon(121, 130, 24, 10, 6), c: rb2 });
    head(S, 121, 94, 34, sk);
    S.push({ p: [[88, 96], [92, 68], [120, 58], [150, 66], [157, 90], [140, 76], [118, 78], [102, 86]], c: hr });
    S.push({ p: ngon(121, 62, 56, 13, 10), c: rb2 });
    S.push({ p: [[98, 60], [146, 58], [142, 34], [174, 6], [124, 20]], c: rb });
    S.push({ p: [[98, 60], [146, 58], [144, 48], [100, 50]], c: A, sw: 3.5 });
    S.push(face(121, 94, 34, { skin: sk, brow: 'haughty', mouth: 'smirk', eyes: ['half', 'normal'], iris: '#6B3FA0' }));
    glow(S, 194, 118, 46, A, .35); glow(S, 194, 118, 28, '#FFF1A8', .5);
    arm(S, [140, 140], [164, 164], [184, 152], { u: rb, hand: sk, w: 15, hr: 9 });
    S.push({ p: [[166, 130], [194, 140], [222, 128], [220, 106], [194, 116], [168, 108]], c: '#8A3B22' });
    S.push({ p: [[170, 110], [194, 119], [194, 134], [170, 126]], c: '#F8EED6', sw: 3 });
    S.push({ p: [[194, 119], [218, 108], [218, 124], [194, 134]], c: '#F8EED6', sw: 3 });
    S.push({ raw: `<polygon points="182,114 186,122 178,122" fill="${A}" stroke="${OL}" stroke-width="1.5"/><polygon points="${P(ngon(206, 119, 4, 4, 6))}" fill="${A}" stroke="${OL}" stroke-width="1.5"/>` });
    spark(S, 176, 84, 9, A); spark(S, 216, 84, 11, A); spark(S, 200, 60, 7, '#FF8C32'); spark(S, 230, 108, 6, A);
    return { S, base: [121, 290, 80] };
  },
  kestrel() {
    const S = [], sk = '#F6C9A0', A = '#9ACD32', tu = '#6E4A2E', pa = '#4A3B2E', bt = '#5C3A22', hr = '#D9622B';
    S.push({ p: limb([92, 118], [106, 194], 18, 18), c: bt });
    [[84, 114], [96, 108], [106, 114]].forEach(([x, y]) => S.push({ p: [[x - 5, y + 6], [x, y - 12], [x + 5, y + 6]], c: '#FF5A3C', sw: 3 }));
    S.push({ p: [[96, 132], [140, 130], [150, 160], [112, 250], [68, 236], [78, 170]], c: '#2E7A3E' });
    S.push({ p: [[96, 82], [70, 70], [48, 98], [62, 116], [88, 102]], c: hr });
    leg(S, [108, 196], [92, 240], [80, 286], pa, bt, 20, -1);
    leg(S, [134, 196], [150, 240], [160, 286], pa, bt, 20, 1);
    S.push({ p: [[100, 134], [142, 132], [150, 166], [140, 200], [104, 200], [94, 166]], c: tu });
    S.push({ p: limb([96, 190], [148, 190], 9, 9), c: A });
    const bw = [[186, 54], [202, 76], [212, 104], [215, 138], [212, 172], [202, 200], [186, 222]];
    for (let i = 0; i < bw.length - 1; i++) S.push({ p: limb(bw[i], bw[i + 1], i === 0 || i === 5 ? 8 : 11, 11), c: A });
    S.push({ raw: `<polyline points="186,54 140,128 186,222" fill="none" stroke="#F8EED6" stroke-width="2.2"/>` });
    arm(S, [142, 144], [176, 142], [212, 138], { u: tu, hand: sk, w: 15, hr: 9 });
    S.push({ p: limb([130, 128], [228, 138], 4.5, 4.5), c: '#8A5530', sw: 3 });
    S.push({ p: [[226, 132], [240, 139], [226, 145]], c: '#DCE5EC', sw: 3 });
    head(S, 124, 96, 34, sk);
    S.push({ p: [[90, 94], [94, 68], [120, 58], [150, 66], [158, 88], [144, 78], [124, 76], [104, 86]], c: hr });
    S.push({ p: limb([91, 80], [157, 74], 7, 7), c: A, sw: 3 });
    S.push(face(124, 96, 34, { skin: sk, brow: 'angry', mouth: 'focus', eyes: ['closed', 'normal'], iris: '#6B4A22' }));
    arm(S, [106, 144], [82, 136], [140, 128], { u: tu, hand: sk, w: 15, hr: 9 });
    return { S, base: [120, 290, 80] };
  },
  mira() {
    const S = [], sk = '#F2B48C', A = '#FF5A3C', dr = '#F3E6C8', hr = '#8A4A2E', bt = '#8A5530';
    S.push({ p: ngon(90, 70, 16, 16, 7), c: hr }); S.push({ p: ngon(156, 68, 16, 16, 7), c: hr });
    S.push({ p: [[88, 86], [156, 84], [160, 126], [86, 126]], c: hr });
    leg(S, [110, 200], [106, 242], [102, 286], sk, bt, 16, -1);
    leg(S, [132, 200], [158, 228], [146, 262], sk, bt, 16, 1);
    S.push({ p: [[104, 132], [138, 132], [146, 172], [168, 226], [122, 238], [78, 226], [98, 172]], c: dr });
    S.push({ p: [[80, 226], [166, 226], [162, 216], [84, 216]], c: A, sw: 3.5 });
    S.push({ p: limb([96, 172], [148, 172], 10, 10), c: A });
    glow(S, 153, 162, 52, A, .28); glow(S, 153, 162, 32, '#FFD23F', .45);
    S.push({ p: ngon(104, 142, 13, 11, 6), c: dr }); S.push({ p: ngon(140, 142, 13, 11, 6), c: dr });
    arm(S, [104, 146], [112, 178], [146, 176], { u: dr, l: sk, hand: sk, w: 14, hr: 9 });
    head(S, 122, 94, 35, sk);
    S.push({ p: [[88, 96], [92, 68], [120, 57], [152, 64], [159, 92], [146, 76], [128, 72], [106, 80]], c: hr });
    S.push(face(122, 94, 35, { skin: sk, brow: 'up', mouth: 'open', eyes: ['sparkle', 'sparkle'], blush: true, iris: '#7A3E2A' }));
    S.push({ raw: `<polyline points="116,134 153,150 140,134" fill="none" stroke="#D9A62A" stroke-width="2.5"/>` });
    arm(S, [140, 146], [168, 166], [162, 178], { u: dr, l: sk, hand: sk, w: 14, hr: 9 });
    S.push({ p: ngon(153, 162, 16, 19, 6, Math.PI / 2), c: '#FFD23F' }); S.push({ p: ngon(153, 162, 10, 12, 6, Math.PI / 2), c: A, sw: 3 });
    spark(S, 188, 132, 9, '#FFD23F'); spark(S, 196, 170, 6, A); spark(S, 176, 204, 7, '#FFD23F');
    return { S, base: [122, 290, 78] };
  }
};

const stripPoly = (path, w) => { const L = [], Rr = []; path.forEach((p, i) => { const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)], n = perp(nrm(sub(b, a))), k = w / 2 * (1 - .5 * i / (path.length - 1)); L.push(add(p, mul(n, k))); Rr.push(sub(p, mul(n, k))); }); return [...L, ...Rr.reverse()]; };
const ffly = (S, x, y, r) => { glow(S, x, y, r * 2.8, '#E8FF7A', .3); S.push({ p: ngon(x, y, r, r, 6), c: '#F4FFB0', sw: 0, sil: false }); };
const EJ = { sk: '#F2C6A0', hr: '#6B4226', hr2: '#4E2E18', tu: '#E8E2C8', ro: '#C9A46A', ac: '#4AA8D8', pa: '#8A6A44', bt: '#5C3A22', wd: '#9A6A3A', wd2: '#7A4E28' };
const ejStaff = (T, a, b) => {
  const d = nrm(sub(b, a)), n = perp(d), L = Math.hypot(...sub(b, a));
  T.push({ p: limb(a, b, 11, 10), c: EJ.wd });
  [.32, .7].forEach(t => { const p = add(a, mul(d, L * t)); T.push({ p: ngon(p[0], p[1], 7.5, 6, 6, Math.atan2(d[1], d[0])), c: EJ.wd2, sw: 3 }); });
  [.86, .9].forEach(t => { const p = add(a, mul(d, L * t)); T.push({ p: limb(add(p, mul(d, -2.5)), add(p, mul(d, 2.5)), 15, 15), c: EJ.ac, sw: 3 }); });
  T.push({ p: ngon(b[0], b[1], 11, 10, 7, .4), c: EJ.wd });
  T.push({ raw: pl([add(a, add(mul(d, L * .05), mul(n, 2))), add(a, add(mul(d, L * .28), mul(n, 2)))], 2, '#C89A64') });
};
const ejHair = [[86, 96], [82, 70], [92, 58], [90, 42], [106, 48], [114, 30], [128, 42], [142, 30], [148, 48], [164, 50], [160, 66], [166, 82], [158, 92], [150, 76], [134, 70], [118, 78], [104, 74], [96, 92]];
// ===================== SKINS (S = corps, A = bras armé séparé) =====================
const SKINS = {
  aldric_crepuscule() {
    const S = [], A = [], sk = '#F4BE8E', N = '#27335E', N2 = '#3A4C82', ND = '#182040', G = '#E3B341', cape = '#3A2E62';
    S.push({ p: [[96, 128], [150, 126], [168, 214], [124, 228], [76, 214]], c: cape });
    S.push({ raw: pl([[80, 212], [124, 224], [165, 212]], 4, G) });
    leg(S, [108, 192], [98, 238], [90, 286], N2, ND, 22, -1);
    arm(S, [96, 140], [76, 172], [80, 200], { u: N, hand: sk, w: 18, hr: 11 });
    S.push({ p: ngon(70, 196, 32, 35, 8, Math.PI / 8), c: N2 }); S.push({ p: ngon(70, 196, 21, 23, 8, Math.PI / 8), c: N, sw: 3 });
    const cr = []; for (let i = 0; i <= 8; i++) { const a = .7 + i * (2 * Math.PI - 1.4) / 8; cr.push([70 + Math.cos(a) * 12, 196 + Math.sin(a) * 12]); }
    for (let i = 8; i >= 0; i--) { const a = 1.0 + i * (2 * Math.PI - 2) / 8; cr.push([75 + Math.cos(a) * 9, 193 + Math.sin(a) * 9]); }
    S.push({ p: cr, c: G, sw: 2.5 });
    leg(S, [136, 192], [150, 238], [158, 286], N, ND, 22, 1);
    S.push({ p: ngon(150, 238, 8, 8, 6), c: G, sw: 2.5, sil: false });
    S.push({ p: limb([122, 116], [122, 134], 18, 22), c: sk });
    S.push({ p: [[94, 128], [148, 128], [156, 166], [142, 198], [102, 198], [88, 166]], c: N });
    S.push({ raw: pl([[98, 134], [93, 166], [105, 192]], 3.5, G) + pl([[144, 134], [151, 166], [139, 192]], 3.5, G) });
    S.push({ p: [[104, 156], [140, 156], [146, 224], [123, 232], [100, 224]], c: N2 });
    S.push({ raw: pl([[104, 218], [123, 226], [142, 218]], 3.5, G) });
    S.push({ p: [[122, 164], [127, 176], [138, 180], [127, 184], [122, 196], [117, 184], [106, 180], [117, 176]], c: G, sw: 3 });
    S.push({ p: limb([98, 198], [146, 198], 11, 11), c: ND });
    S.push({ p: ngon(122, 198, 8, 7, 6), c: G, sw: 3 });
    S.push({ p: ngon(96, 136, 17, 14, 6), c: N2 });
    head(S, 122, 90, 36, sk);
    S.push({ p: [[112, 50], [122, 22], [150, 30], [146, 52]], c: G });
    S.push({ p: [[84, 102], [84, 66], [102, 48], [122, 42], [144, 46], [160, 62], [164, 100], [154, 98], [152, 78], [124, 70], [98, 78], [95, 102]], c: N });
    S.push({ raw: pl([[95, 100], [98, 78], [124, 70], [152, 78], [154, 96]], 4, G) + pl([[122, 46], [124, 68]], 3, G) });
    S.push({ p: [[84, 90], [95, 92], [98, 112], [88, 112]], c: N2, sw: 3.5 });
    S.push(face(122, 90, 36, { skin: sk, brow: 'stern', mouth: 'firm', iris: '#2F5D8A' }));
    const s = sword(A, [182, 130], [218, 12], { bw: 17, guard: 26, col: '#D6DEF0', guardCol: G, edge: '#9FB4FF', grip: ND });
    A.push({ p: ngon(s.b[0], s.b[1], 7, 7, 6), c: '#6F8CFF', sw: 2.5 });
    [[-22], [22]].forEach(([u]) => { const q = add(s.b, mul(s.n, u)); A.push({ p: [add(q, mul(s.d, -6)), add(q, mul(s.d, 10)), add(q, mul(s.n, u > 0 ? 8 : -8))], c: G, sw: 3 }); });
    A.push({ p: ngon(150, 137, 19, 16, 6), c: N2 }); A.push({ p: ngon(150, 137, 10, 8, 6), c: G, sw: 2.5 });
    arm(A, [150, 142], [176, 168], [182, 130], { u: N, hand: sk, w: 18, hr: 11 });
    spark(A, 208, 36, 9, '#DCE6FF'); spark(A, 226, 74, 6, G);
    return { S, A, pivot: [150, 142], base: [122, 290, 80] };
  },
  nyra_marches() {
    const S = [], A = [], sk = '#E8AE82', O = '#E8742A', Br = '#6B4226', L = '#D8B47A', L2 = '#B8904F', tu = '#7E5634', lg = '#5A4030', bt = '#3A2A1E';
    arm(S, [104, 152], [80, 144], [62, 124], { u: tu, hand: sk, w: 15, hr: 10 });
    const tail = [[108, 140], [64, 120], [34, 134], [58, 146], [38, 162], [94, 156]];
    S.push({ p: tail, c: O });
    S.push({ raw: clipBands('nyTail', tail, [[[84, 110], [76, 170]], [[62, 110], [54, 170]]], Br, 8) });
    leg(S, [112, 198], [80, 232], [66, 286], lg, bt, 19, -1);
    S.push({ p: [[100, 146], [140, 138], [152, 178], [140, 206], [108, 208], [96, 178]], c: tu });
    S.push({ p: limb([104, 196], [148, 188], 8, 8), c: Br });
    S.push({ p: ngon(110, 206, 10, 11, 6), c: '#B07A3E' });
    leg(S, [136, 198], [172, 234], [166, 286], lg, bt, 19, 1);
    S.push({ p: [[92, 122], [96, 84], [122, 64], [154, 70], [170, 98], [166, 128], [150, 140], [104, 140]], c: L });
    head(S, 130, 110, 34, sk);
    S.push({ p: [[94, 108], [102, 78], [128, 64], [158, 72], [168, 100], [154, 88], [132, 84], [112, 92]], c: L });
    S.push({ p: [[108, 92], [132, 82], [150, 86], [124, 96]], c: L2, sw: 3 });
    S.push({ raw: pl([[100, 100], [108, 80], [128, 68]], 3, O) });
    const sc = ngon(126, 142, 24, 11, 7);
    S.push({ p: sc, c: O });
    S.push({ raw: clipBands('nySc', sc, [[[118, 120], [116, 160]], [[134, 120], [132, 160]]], Br, 6) });
    S.push(face(130, 110, 34, { skin: sk, brow: 'sly', mouth: 'smirk', eyes: ['half', 'half'], iris: '#1F7A3D' }));
    S.push({ p: [[100, 124], [92, 132], [100, 142], [106, 132]], c: O });
    const mk = [[100, 118], [168, 114], [166, 132], [142, 148], [106, 140]];
    S.push({ p: mk, c: O });
    S.push({ raw: clipBands('nyMk', mk, [[[112, 100], [116, 160]], [[132, 100], [136, 160]], [[152, 100], [156, 160]]], Br, 6) });
    S.push({ raw: `<g stroke="${O}" stroke-width="4" stroke-linecap="round"><line x1="40" y1="200" x2="62" y2="200"/><line x1="30" y1="216" x2="58" y2="216"/></g>` });
    const h = [196, 170], s = sword(A, h, [238, 146], { bw: 12, guard: 11, col: '#EDE6D6', guardCol: Br, edge: '#FFFFFF', grip: O });
    [-13, -6, 1, 8].forEach((u, i) => { const c = add(h, mul(s.d, u)); A.push({ p: limb(add(c, mul(s.d, -2)), add(c, mul(s.d, 2)), 10, 10), c: i % 2 ? O : Br, sw: 2.5, sil: false }); });
    const pm = s.pm; A.push({ p: [[pm[0] - 3, pm[1]], [pm[0] - 18, pm[1] + 12], [pm[0] - 12, pm[1] + 22], [pm[0] + 2, pm[1] + 6]], c: O, sw: 3.5 });
    A.push({ p: [[pm[0] - 12, pm[1] + 10], [pm[0] - 15, pm[1] + 13], [pm[0] - 11, pm[1] + 19], [pm[0] - 8, pm[1] + 14]], c: Br, sw: 0, sil: false });
    arm(A, [146, 152], [170, 180], [196, 170], { u: tu, hand: sk, w: 15, hr: 10 });
    return { S, A, pivot: [146, 152], base: [120, 290, 80] };
  },
  boran_batisseur() {
    const S = [], A = [], sk = '#C98657', tu = '#7A4A2E', ap = '#B4552E', ap2 = '#8E3F22', le = '#6B4226', stud = '#E2CFA0', ir = '#6E6A64', ir2 = '#8E8A80', pa = '#5A3A28', bt = '#2E241C';
    const gaunt = (T, e, h) => {
      [.35, .62].forEach(t => { const p = lerp(e, h, t); T.push({ p: ngon(p[0], p[1], 4.5, 4.5, 5), c: stud, sw: 2.5, sil: false }); });
      T.push({ p: limb([h[0] - 20, h[1] - 22], [h[0] + 20, h[1] - 22], 13, 13), c: ir2 });
      T.push({ p: ngon(h[0], h[1], 28, 26, 6, Math.PI / 6), c: ir });
      T.push({ p: ngon(h[0], h[1] + 2, 16, 14, 6, Math.PI / 6), c: ir2, sw: 3 });
      [[-9, -4], [9, -4], [0, 11]].forEach(([u, v]) => T.push({ p: ngon(h[0] + u, h[1] + v, 3.5, 3.5, 5), c: stud, sw: 2, sil: false }));
    };
    arm(S, [72, 142], [44, 182], [46, 216], { u: sk, l: le, hand: ir, w: 30, hr: 25 });
    gaunt(S, [44, 182], [46, 216]);
    leg(S, [96, 218], [88, 252], [80, 286], pa, bt, 32, -1);
    leg(S, [146, 218], [154, 252], [162, 286], pa, bt, 32, 1);
    S.push({ p: limb([120, 110], [120, 134], 36, 44), c: sk });
    S.push({ p: [[64, 128], [176, 128], [194, 172], [170, 226], [72, 226], [48, 172]], c: tu });
    S.push({ p: [[96, 130], [146, 130], [134, 168], [108, 168]], c: sk });
    S.push({ p: [[88, 150], [154, 150], [162, 196], [170, 262], [72, 262], [80, 196]], c: ap });
    S.push({ p: [[102, 218], [140, 216], [142, 242], [100, 244]], c: ap2, sw: 3.5 });
    S.push({ p: limb([112, 218], [108, 200], 6, 6), c: ir2, sw: 3 }); S.push({ p: limb([130, 217], [135, 199], 6, 6), c: '#C9A46A', sw: 3 });
    S.push({ raw: pl([[78, 256], [162, 256]], 3, stud, .8) });
    S.push({ p: limb([80, 196], [162, 196], 13, 13), c: le });
    S.push({ p: ngon(121, 196, 11, 9, 6), c: '#D9A62A', sw: 3.5 });
    S.push({ p: ngon(70, 138, 25, 19, 7), c: le }); S.push({ p: ngon(172, 138, 25, 19, 7), c: le });
    [[62, 134], [76, 132], [166, 132], [180, 134]].forEach(([x, y]) => S.push({ p: ngon(x, y, 4, 4, 5), c: stud, sw: 2, sil: false }));
    head(S, 120, 88, 34, sk);
    S.push({ p: [[90, 96], [150, 94], [158, 112], [142, 132], [122, 140], [100, 132], [86, 112]], c: '#6B3E22' });
    S.push(face(120, 88, 34, { skin: sk, brow: 'calm', mouth: 'grin', eyes: ['narrow', 'narrow'], browCol: '#6B3E22' }));
    S.push({ p: ngon(122, 64, 48, 10, 10), c: le });
    S.push({ p: [[88, 64], [92, 40], [120, 30], [148, 38], [156, 64]], c: '#8A5A34' });
    S.push({ p: [[89, 62], [155, 62], [154, 52], [90, 53]], c: ap, sw: 3.5 });
    S.push({ p: ngon(140, 57, 5, 4, 6), c: '#D9A62A', sw: 2.5 });
    arm(A, [170, 142], [200, 182], [164, 188], { u: sk, l: le, hand: ir, w: 30, hr: 25 });
    gaunt(A, [200, 182], [164, 188]);
    return { S, A, pivot: [170, 142], base: [121, 290, 86] };
  },
  ilwen_racines() {
    const S = [], A = [], sk = '#F7D2B4', rb = '#5C5530', rb2 = '#433E22', tr = '#9ACD32', hat = '#4A4428', le = '#6B4226', en = '#E6C88A', hr = '#E6E0F0';
    const vial = (x, y, liq) => {
      S.push({ raw: pl([[x, y - 8], [x, y]], 2.5, OL) });
      S.push({ p: [[x - 6, y + 4], [x + 6, y + 4], [x + 9, y + 18], [x, y + 24], [x - 9, y + 18]], c: '#E4F2EC' });
      S.push({ p: [[x - 7.5, y + 12], [x + 7.5, y + 12], [x + 9, y + 18], [x, y + 24], [x - 9, y + 18]], c: liq, sw: 0, sil: false });
      S.push({ p: limb([x, y - 1], [x, y + 5], 7, 7), c: '#B08A5A', sw: 2.5 });
    };
    S.push({ p: [[86, 80], [156, 78], [164, 150], [142, 170], [98, 170], [80, 140]], c: hr });
    arm(S, [102, 140], [80, 168], [100, 190], { u: rb, hand: sk, w: 15, hr: 9 });
    S.push({ p: [[100, 130], [142, 130], [150, 170], [172, 286], [70, 286], [92, 170]], c: rb });
    S.push({ p: [[70, 286], [172, 286], [169, 274], [73, 274]], c: tr, sw: 3.5 });
    [[86, 262, -.5], [110, 266, .3], [136, 262, -.2], [158, 264, .5]].forEach(([x, y, a]) => S.push({ p: [[x, y + 6], [x - 6 + a * 4, y - 4], [x, y - 10], [x + 6 + a * 4, y - 3]], c: tr, sw: 2.5, sil: false }));
    S.push({ p: limb([92, 176], [150, 176], 10, 10), c: le });
    vial(104, 184, '#3DDC5B'); vial(122, 186, '#FFB23F'); vial(140, 183, '#5FD6C8');
    S.push({ p: ngon(121, 130, 24, 10, 6), c: rb2 });
    head(S, 121, 94, 34, sk);
    S.push({ p: [[88, 96], [92, 68], [120, 58], [150, 66], [157, 90], [140, 76], [118, 78], [102, 86]], c: hr });
    S.push({ p: ngon(121, 64, 46, 11, 10), c: hat });
    S.push({ p: [[101, 62], [143, 60], [139, 40], [154, 24], [120, 36]], c: hat });
    S.push({ p: [[101, 62], [143, 60], [142, 52], [102, 54]], c: tr, sw: 3.5 });
    S.push({ p: [[140, 56], [152, 48], [156, 56], [146, 62]], c: '#3DDC5B', sw: 2.5 });
    S.push(face(121, 94, 34, { skin: sk, brow: 'haughty', mouth: 'smirk', eyes: ['half', 'normal'], iris: '#4E7A2A' }));
    glow(A, 196, 118, 46, tr, .32); glow(A, 196, 118, 27, '#E4FFB0', .5);
    arm(A, [140, 140], [164, 164], [184, 152], { u: rb, hand: sk, w: 15, hr: 9 });
    A.push({ p: [[214, 88], [220, 92], [228, 142], [222, 140]], c: '#F8EED6', sw: 3 });
    A.push({ p: [[168, 96], [214, 88], [222, 140], [176, 148]], c: le });
    A.push({ p: limb([168, 96], [176, 148], 10, 10), c: '#4A2E1A' });
    [[176, 98], [211, 92], [218, 136], [183, 143]].forEach(([x, y]) => A.push({ p: ngon(x, y, 3.5, 3.5, 5), c: '#D9A62A', sw: 2, sil: false }));
    const lf = (x, y, a, s) => { const c = Math.cos(a), sn = Math.sin(a), r = (u, v) => [x + u * c - v * sn, y + u * sn + v * c]; return `<polygon points="${P([r(0, 0), r(s * .5, -s * .35), r(s, 0), r(s * .5, s * .35)])}" fill="${en}" stroke="${OL}" stroke-width="1.5"/>`; };
    A.push({ raw: pl([[190, 140], [194, 126], [192, 114], [198, 102]], 3, en) + pl([[190, 140], [184, 144], [182, 138]], 2.5, en) + pl([[190, 140], [198, 143], [202, 138]], 2.5, en) + lf(194, 126, -.4, 13) + lf(192, 116, -2.7, 12) + lf(197, 104, -.9, 11) + `<polygon points="${P(ngon(199, 99, 3.5, 3.5, 6))}" fill="#FFD23F" stroke="${OL}" stroke-width="1.5"/>` });
    spark(A, 176, 80, 9, tr); spark(A, 220, 78, 10, '#E4FFB0'); spark(A, 206, 58, 7, '#FFD23F'); spark(A, 236, 110, 6, tr);
    return { S, A, pivot: [140, 140], base: [121, 290, 80] };
  },
  kestrel_cimes() {
    const S = [], A = [], sk = '#F6C9A0', ja = '#2E5A48', cl = '#5B6B63', fur = '#F4ECDC', pa = '#4A4038', bt = '#5C3A22', hr = '#D9622B', wd = '#EAD9B4', gr = '#9AA3AA';
    S.push({ p: limb([92, 118], [106, 194], 18, 18), c: '#B89868' });
    [[84, 114], [96, 108], [106, 114]].forEach(([x, y], i) => S.push({ p: [[x - 5, y + 6], [x, y - 12], [x + 5, y + 6]], c: i === 1 ? '#C8CED4' : '#FFFFFF', sw: 3 }));
    S.push({ p: [[96, 132], [140, 130], [150, 160], [112, 250], [68, 236], [78, 170]], c: cl });
    S.push({ p: [[96, 82], [70, 70], [48, 98], [62, 116], [88, 102]], c: hr });
    leg(S, [108, 196], [92, 240], [80, 286], pa, bt, 20, -1);
    leg(S, [134, 196], [150, 240], [160, 286], pa, bt, 20, 1);
    S.push({ p: fluff(84, 262, 14, 8, 6), c: fur, sw: 3 }); S.push({ p: fluff(158, 262, 14, 8, 6), c: fur, sw: 3 });
    S.push({ p: [[100, 134], [142, 132], [150, 166], [140, 200], [104, 200], [94, 166]], c: ja });
    S.push({ raw: pl([[121, 140], [121, 190]], 3, '#1E3E32') });
    S.push({ p: limb([96, 190], [148, 190], 9, 9), c: '#6B4226' });
    S.push({ p: fluff(122, 134, 28, 12, 8), c: fur });
    head(S, 124, 96, 34, sk);
    S.push({ p: [[90, 94], [94, 68], [120, 58], [150, 66], [158, 88], [144, 78], [124, 76], [104, 86]], c: hr });
    S.push({ p: limb([90, 80], [158, 73], 13, 13), c: fur, sw: 3.5 });
    S.push({ raw: pl([[98, 80], [104, 77]], 2.5, gr) + pl([[116, 78], [122, 76]], 2.5, gr) + pl([[134, 76], [140, 75]], 2.5, gr) });
    S.push(face(124, 96, 34, { skin: sk, brow: 'angry', mouth: 'focus', eyes: ['closed', 'normal'], iris: '#6B4A22' }));
    arm(S, [106, 144], [82, 136], [140, 128], { u: ja, hand: sk, w: 15, hr: 9 });
    const cf = lerp([82, 136], [140, 128], .68); S.push({ p: fluff(cf[0], cf[1], 10, 10, 6), c: fur, sw: 3 });
    [[56, 54, 11, '#FFF6D8'], [34, 158, 9, '#FFFFFF'], [160, 32, 8, '#E4FFB0'], [48, 226, 7, '#FFF6D8'], [236, 200, 9, '#FFFFFF'], [238, 72, 8, '#FFF6D8'], [80, 30, 5, '#E4FFB0'], [230, 250, 5, '#FFF6D8']].forEach(([x, y, r, c]) => spark(S, x, y, r, c));
    const bw = [[184, 50], [202, 74], [212, 104], [215, 138], [212, 172], [202, 202], [184, 226]];
    for (let i = 0; i < bw.length - 1; i++) A.push({ p: limb(bw[i], bw[i + 1], i === 0 || i === 5 ? 8 : 12, i === 0 || i === 5 ? 12 : 12), c: wd });
    A.push({ p: [[184, 50], [176, 42], [190, 46]], c: gr, sw: 3 }); A.push({ p: [[184, 226], [176, 234], [190, 230]], c: gr, sw: 3 });
    let eg = '';
    [[0, .5], [1, .5], [4, .5], [5, .5]].forEach(([i, t]) => { const p = lerp(bw[i], bw[i + 1], t), d = nrm(sub(bw[i + 1], bw[i])), n = perp(d); eg += `<polygon points="${P([add(p, mul(d, -5)), add(p, mul(n, 3)), add(p, mul(d, 5)), add(p, mul(n, -3))])}" fill="#FFFFFF" stroke="${gr}" stroke-width="1.2"/>`; });
    [1, 4].forEach(i => { const a = lerp(bw[i], bw[i + 1], .2), b = lerp(bw[i], bw[i + 1], .8), n = perp(nrm(sub(bw[i + 1], bw[i]))); eg += pl([add(a, mul(n, 3)), add(lerp(a, b, .5), mul(n, -3)), add(b, mul(n, 3))], 1.8, gr); });
    A.push({ raw: eg });
    A.push({ raw: `<polyline points="184,50 140,128 184,226" fill="none" stroke="#F8EED6" stroke-width="2.2"/>` });
    arm(A, [142, 144], [176, 142], [212, 138], { u: ja, hand: sk, w: 15, hr: 9 });
    const cf2 = lerp([176, 142], [212, 138], .55); A.push({ p: fluff(cf2[0], cf2[1], 10, 10, 6), c: fur, sw: 3 });
    A.push({ p: limb([130, 128], [228, 138], 4.5, 4.5), c: wd, sw: 3 });
    A.push({ p: [[133, 121], [146, 126], [145, 131], [130, 131]], c: '#FFFFFF', sw: 2.5 });
    A.push({ p: [[226, 132], [242, 139], [226, 146]], c: '#DCE5EC', sw: 3 });
    return { S, A, pivot: [142, 144], base: [120, 290, 80] };
  },
  mira_sources() {
    const S = [], A = [], sk = '#F2B48C', dr = '#4CB8B2', dr2 = '#2E8E94', fo = '#C8F4EE', pe = '#FFFDF6', hr = '#8A4A2E', sa = '#2C6E78', wa = '#7FE3F0', wi = '#E6FFFF';
    S.push({ p: ngon(90, 70, 16, 16, 7), c: hr }); S.push({ p: ngon(156, 68, 16, 16, 7), c: hr });
    S.push({ p: [[88, 86], [156, 84], [160, 126], [86, 126]], c: hr });
    leg(S, [110, 200], [106, 242], [102, 286], sk, sa, 16, -1);
    leg(S, [132, 200], [158, 228], [146, 262], sk, sa, 16, 1);
    S.push({ p: [[104, 132], [138, 132], [146, 172], [168, 226], [122, 238], [78, 226], [98, 172]], c: dr });
    S.push({ raw: pl([[92, 200], [102, 195], [112, 200], [122, 195], [132, 200], [142, 195], [152, 200]], 3, fo) });
    S.push({ p: [[80, 226], [166, 226], [162, 216], [84, 216]], c: fo, sw: 3.5 });
    S.push({ p: limb([96, 172], [148, 172], 10, 10), c: dr2 });
    S.push({ p: ngon(122, 172, 5, 5, 6), c: pe, sw: 2.5 });
    S.push({ p: ngon(104, 142, 13, 11, 6), c: dr }); S.push({ p: ngon(140, 142, 13, 11, 6), c: dr });
    arm(S, [104, 146], [112, 178], [146, 176], { u: dr, l: sk, hand: sk, w: 14, hr: 9 });
    head(S, 122, 94, 35, sk);
    S.push({ p: [[88, 96], [92, 68], [120, 57], [152, 64], [159, 92], [146, 76], [128, 72], [106, 80]], c: hr });
    S.push({ p: [[90, 74], [120, 62], [152, 66], [152, 74], [120, 70], [92, 82]], c: dr2, sw: 3.5 });
    S.push({ raw: pl([[98, 74], [104, 69], [108, 74], [114, 67], [120, 71], [126, 65], [132, 70], [138, 65], [144, 70]], 2.2, fo) });
    [[92, 80], [104, 72], [120, 64], [136, 66], [150, 70]].forEach(([x, y]) => S.push({ p: ngon(x, y, 4.5, 4.5, 6), c: pe, sw: 2.5, sil: false }));
    [[88, 92], [87, 102], [86, 112]].forEach(([x, y]) => S.push({ p: ngon(x, y, 3.5, 3.5, 6), c: pe, sw: 2, sil: false }));
    S.push({ p: dropPts(122, 80, 4), c: wa, sw: 2.5, sil: false });
    S.push(face(122, 94, 35, { skin: sk, brow: 'up', mouth: 'open', eyes: ['sparkle', 'sparkle'], blush: true, iris: '#2E6E6A' }));
    [[64, 118, 5], [52, 172, 4], [66, 236, 4.5], [188, 96, 4], [214, 150, 4.5], [202, 236, 4], [172, 52, 3.5], [60, 72, 4], [44, 212, 3], [222, 196, 3.5], [100, 26, 3.5], [210, 110, 3]].forEach(([x, y, r], i) => S.push({ p: dropPts(x, y, r), c: i % 2 ? wi : wa, sw: 2.5, sil: false }));
    glow(A, 153, 166, 40, wa, .3); glow(A, 153, 166, 24, wi, .5);
    A.push({ raw: `<polyline points="116,134 153,148 140,134" fill="none" stroke="#DCE5EC" stroke-width="2.5"/>` });
    arm(A, [140, 146], [168, 166], [162, 178], { u: dr, l: sk, hand: sk, w: 14, hr: 9 });
    A.push({ p: dropPts(153, 168, 14), c: wa });
    A.push({ p: dropPts(149, 170, 6), c: wi, sw: 0, sil: false });
    A.push({ p: ngon(153, 143, 6, 4.5, 6), c: '#DCE5EC', sw: 2.5 });
    [[190, 134, 5, wa], [198, 172, 3.5, wi], [178, 206, 4, wa]].forEach(([x, y, r, c]) => A.push({ p: dropPts(x, y, r), c, sw: 2.5, sil: false }));
    return { S, A, pivot: [140, 146], base: [122, 290, 78] };
  },
  aldric_tournois() {
    const S = [], A = [], sk = '#F4BE8E', R = '#C8322A', R2 = '#E0513A', RD = '#7A1C18', G = '#E8B83A';
    S.push({ p: [[96, 128], [150, 126], [172, 236], [124, 250], [72, 236]], c: RD });
    S.push({ raw: pl([[76, 234], [124, 246], [168, 234]], 4, G) });
    leg(S, [108, 192], [98, 238], [90, 286], G, RD, 22, -1);
    arm(S, [96, 140], [76, 172], [80, 200], { u: R, hand: sk, w: 18, hr: 11 });
    S.push({ p: ngon(70, 196, 32, 35, 8, Math.PI / 8), c: R });
    S.push({ p: [[46, 194], [70, 174], [94, 194], [94, 206], [70, 186], [46, 206]], c: G, sw: 3 });
    S.push({ p: ngon(70, 214, 6, 6, 6), c: G, sw: 2.5 });
    leg(S, [136, 192], [150, 238], [158, 286], G, RD, 22, 1);
    S.push({ p: ngon(150, 238, 8, 8, 6), c: R, sw: 2.5, sil: false });
    S.push({ p: limb([122, 116], [122, 134], 18, 22), c: sk });
    S.push({ p: [[94, 128], [148, 128], [156, 166], [142, 198], [102, 198], [88, 166]], c: R });
    S.push({ raw: pl([[98, 134], [93, 166], [105, 192]], 3.5, G) + pl([[144, 134], [151, 166], [139, 192]], 3.5, G) });
    S.push({ p: [[104, 156], [140, 156], [146, 224], [123, 232], [100, 224]], c: G });
    S.push({ p: [[122, 166], [134, 190], [122, 214], [110, 190]], c: R, sw: 3 });
    S.push({ p: limb([98, 198], [146, 198], 11, 11), c: RD });
    S.push({ p: ngon(122, 198, 8, 7, 6), c: G, sw: 3 });
    S.push({ p: ngon(96, 136, 17, 14, 6), c: G });
    head(S, 122, 90, 36, sk);
    S.push({ p: [[120, 46], [96, 8], [72, 0], [86, 20], [66, 20], [88, 32], [72, 42], [104, 50]], c: '#FFFDF6' });
    S.push({ p: [[118, 48], [100, 20], [86, 16], [96, 32], [86, 38], [108, 52]], c: R2, sw: 3 });
    S.push({ p: [[84, 102], [84, 66], [102, 48], [122, 42], [144, 46], [160, 62], [164, 100], [154, 98], [152, 78], [124, 70], [98, 78], [95, 102]], c: R });
    S.push({ raw: pl([[95, 100], [98, 78], [124, 70], [152, 78], [154, 96]], 4, G) + pl([[122, 46], [124, 68]], 3, G) });
    S.push({ p: ngon(122, 44, 7, 6, 6), c: G, sw: 3 });
    S.push({ p: [[84, 90], [95, 92], [98, 112], [88, 112]], c: R2, sw: 3.5 });
    S.push(face(122, 90, 36, { skin: sk, brow: 'stern', mouth: 'firm', iris: '#2F5D8A' }));
    const s = sword(A, [182, 130], [214, 18], { bw: 24, guard: 30, col: '#EEF2F6', guardCol: G, edge: '#FFE9A8', grip: RD });
    A.push({ p: limb(add(s.b, mul(s.d, 10)), add(s.b, mul(s.d, 72)), 6, 3), c: G, sw: 2, sil: false });
    A.push({ p: ngon(s.b[0], s.b[1], 8, 8, 6), c: R, sw: 2.5 });
    [-30, 30].forEach(u => { const q = add(s.b, mul(s.n, u)); A.push({ p: ngon(q[0], q[1], 7, 7, 6), c: G, sw: 3 }); });
    A.push({ p: ngon(150, 137, 19, 16, 6), c: G }); A.push({ p: ngon(150, 137, 10, 8, 6), c: R, sw: 2.5 });
    arm(A, [150, 142], [176, 168], [182, 130], { u: R, hand: sk, w: 18, hr: 11 });
    spark(A, 206, 40, 9, '#FFF6D8'); spark(A, 228, 80, 6, G);
    return { S, A, pivot: [150, 142], base: [122, 290, 80] };
  },
  nyra_lames() {
    const S = [], A = [], sk = '#E8AE82', K = '#1E1A26', K2 = '#2E2838', V = '#6E3FA0', V2 = '#9A5FD0', Pk = '#C77DFF', hr = '#2A2F38';
    S.push({ p: stripPoly([[104, 194], [80, 184], [60, 198], [38, 186], [16, 200]], 11), c: V2 });
    S.push({ p: stripPoly([[106, 200], [84, 214], [62, 206], [42, 226], [22, 222]], 9), c: Pk });
    arm(S, [104, 152], [80, 144], [62, 124], { u: K, hand: sk, w: 15, hr: 10 });
    const w1 = lerp([80, 144], [62, 124], .7); S.push({ p: ngon(w1[0], w1[1], 8, 8, 6), c: V, sw: 3 });
    S.push({ p: [[104, 82], [70, 62], [44, 76], [62, 82], [42, 98], [96, 98]], c: hr });
    leg(S, [112, 198], [80, 232], [66, 286], K, V, 19, -1);
    S.push({ p: [[100, 146], [140, 138], [152, 178], [140, 206], [108, 208], [96, 178]], c: K2 });
    S.push({ p: limb([104, 148], [144, 200], 10, 10), c: V, sw: 3.5, sil: false });
    S.push({ p: limb([104, 196], [148, 188], 8, 8), c: V2 });
    leg(S, [136, 198], [172, 234], [166, 286], K, V, 19, 1);
    S.push({ raw: pl([[160, 246], [176, 248]], 4, V2) + pl([[160, 256], [176, 258]], 4, V2) });
    head(S, 130, 110, 34, sk);
    S.push({ p: [[94, 108], [100, 80], [126, 66], [156, 72], [168, 100], [154, 88], [132, 84], [112, 94]], c: hr });
    S.push({ p: stripPoly([[100, 86], [82, 78], [66, 90], [48, 82]], 7), c: Pk, sw: 3 });
    S.push({ p: limb([98, 88], [164, 82], 7, 7), c: V, sw: 3 });
    S.push({ p: ngon(126, 142, 22, 9, 7), c: V });
    S.push(face(130, 110, 34, { skin: sk, brow: 'sly', mouth: 'smirk', eyes: ['half', 'half'], iris: '#6B3FA0' }));
    S.push({ raw: `<g stroke="${V2}" stroke-width="4" stroke-linecap="round"><line x1="40" y1="250" x2="62" y2="250"/><line x1="30" y1="264" x2="58" y2="264"/></g>` });
    const h = [196, 170], s = sword(A, h, [242, 146], { bw: 8, guard: 12, col: '#E6DCF5', guardCol: V2, edge: '#FFFFFF', grip: K });
    const q = add(s.b, mul(s.n, 12));
    A.push({ p: stripPoly([q, add(q, [-4, 14]), add(q, [-18, 24]), add(q, [-22, 42]), add(q, [-38, 52])], 7), c: Pk, sw: 3.5 });
    arm(A, [146, 152], [170, 180], [196, 170], { u: K, hand: sk, w: 15, hr: 10 });
    const w2 = lerp([170, 180], [196, 170], .6); A.push({ p: ngon(w2[0], w2[1], 8, 8, 6), c: V, sw: 3 });
    return { S, A, pivot: [146, 152], base: [120, 290, 80] };
  },
  boran_port() {
    const S = [], A = [], sk = '#C98657', N = '#24345A', N2 = '#34497A', gy = '#8A929C', gy2 = '#B4BCC4', ro = '#C9A46A', roD = '#8E6E3E', bt = '#1E2430';
    const hook = (T, e, h, dir) => {
      T.push({ p: ngon(h[0], h[1], 27, 25, 6, Math.PI / 6), c: gy });
      T.push({ p: ngon(h[0], h[1] + 2, 15, 13, 6, Math.PI / 6), c: gy2, sw: 3 });
      const k = [add(h, [dir * 6, 18]), add(h, [dir * 16, 32]), add(h, [dir * 8, 46]), add(h, [-dir * 6, 42])];
      T.push({ raw: pl(k, 14, OL) + pl(k, 7, gy2) + pl([k[0], k[1]], 2.5, '#FFFFFF', .6) });
      const c = lerp(e, h, .45); T.push({ p: limb(add(c, [0, -6]), add(c, [0, 6]), 30, 30), c: gy, sw: 3.5 });
    };
    arm(S, [72, 142], [44, 182], [46, 216], { u: N, l: sk, hand: gy, w: 30, hr: 25 });
    hook(S, [44, 182], [46, 216], -1);
    leg(S, [96, 218], [88, 252], [80, 286], gy, bt, 32, -1);
    leg(S, [146, 218], [154, 252], [162, 286], gy, bt, 32, 1);
    S.push({ p: limb([120, 110], [120, 134], 36, 44), c: sk });
    const tor = [[64, 128], [176, 128], [194, 172], [170, 226], [72, 226], [48, 172]];
    S.push({ p: tor, c: N });
    S.push({ raw: clipBands('boTor', tor, [[[40, 158], [200, 158]], [[40, 178], [200, 178]], [[40, 198], [200, 198]]], N2, 7) });
    S.push({ p: ngon(120, 132, 28, 10, 7), c: N2 });
    S.push({ p: limb([62, 212], [178, 212], 16, 16), c: bt });
    S.push({ p: ngon(121, 212, 12, 10, 6), c: gy2, sw: 3.5 });
    S.push({ p: ngon(172, 138, 25, 19, 7), c: N2 });
    const rp = [[70, 132], [110, 170], [150, 200], [172, 214]];
    S.push({ raw: pl(rp, 14, OL) + pl(rp, 7, ro) + `<polyline points="${P(rp)}" fill="none" stroke="${roD}" stroke-width="2.5" stroke-dasharray="4 6"/>` });
    let coil = '';
    [0, 7, 14].forEach(o => { const cx = 64 + o * .4, cy = 146 + o; const e = sw => `<ellipse cx="${cx}" cy="${cy}" rx="22" ry="30" transform="rotate(-18 ${cx} ${cy})" fill="none" ${sw}/>`; coil += e(`stroke="${OL}" stroke-width="14"`) + e(`stroke="${ro}" stroke-width="7"`) + e(`stroke="${roD}" stroke-width="2.5" stroke-dasharray="4 6"`); });
    S.push({ raw: coil });
    head(S, 120, 88, 34, sk);
    S.push({ p: [[90, 96], [150, 94], [158, 112], [142, 132], [122, 140], [100, 132], [86, 112]], c: '#6B3E22' });
    S.push(face(120, 88, 34, { skin: sk, brow: 'calm', mouth: 'grin', eyes: ['narrow', 'narrow'], browCol: '#6B3E22' }));
    S.push({ p: [[86, 70], [90, 44], [120, 32], [150, 42], [156, 70]], c: N2 });
    S.push({ raw: pl([[104, 44], [102, 64]], 2.5, N) + pl([[120, 36], [120, 64]], 2.5, N) + pl([[136, 40], [138, 64]], 2.5, N) });
    S.push({ p: limb([85, 68], [157, 66], 13, 13), c: gy, sw: 3.5 });
    arm(A, [170, 142], [200, 182], [164, 188], { u: N, l: sk, hand: gy, w: 30, hr: 25 });
    hook(A, [200, 182], [164, 188], 1);
    return { S, A, pivot: [170, 142], base: [121, 290, 86] };
  },
  ilwen_filante() {
    const S = [], A = [], sk = '#F7D2B4', rb = '#22306A', rb2 = '#161F48', sv = '#D6DEEA', st = '#FFE9A8', hr = '#E6E0F0';
    [[50, 70, 7], [36, 140, 6], [54, 210, 8], [40, 262, 5], [170, 200, 6], [190, 250, 7], [86, 20, 5], [64, 110, 4], [206, 222, 4], [30, 190, 4]].forEach(([x, y, r], i) => spark(S, x, y, r, i % 2 ? '#FFFFFF' : st));
    S.push({ p: [[86, 80], [156, 78], [164, 150], [142, 170], [98, 170], [80, 140]], c: hr });
    arm(S, [102, 140], [80, 168], [100, 190], { u: rb, hand: sk, w: 15, hr: 9 });
    S.push({ p: [[100, 130], [142, 130], [150, 170], [172, 286], [70, 286], [92, 170]], c: rb });
    S.push({ p: [[70, 286], [172, 286], [169, 274], [73, 274]], c: sv, sw: 3.5 });
    [[98, 206, 6], [132, 196, 5], [116, 232, 7], [146, 250, 5], [88, 256, 5], [124, 150, 4], [150, 222, 4], [104, 240, 3.5]].forEach(([x, y, r]) => S.push({ p: [[x, y - r], [x + r * .35, y - r * .35], [x + r, y], [x + r * .35, y + r * .35], [x, y + r], [x - r * .35, y + r * .35], [x - r, y], [x - r * .35, y - r * .35]], c: st, sw: 2, sil: false }));
    S.push({ p: limb([92, 176], [150, 176], 10, 10), c: sv });
    S.push({ p: ngon(121, 176, 6, 6, 5, -Math.PI / 2), c: st, sw: 2.5 });
    S.push({ p: ngon(121, 130, 24, 10, 6), c: rb2 });
    head(S, 121, 94, 34, sk);
    S.push({ p: [[88, 96], [92, 68], [120, 58], [150, 66], [157, 90], [140, 76], [118, 78], [102, 86]], c: hr });
    S.push({ p: ngon(121, 62, 54, 13, 10), c: rb2 });
    S.push({ p: [[98, 60], [146, 58], [142, 34], [172, 10], [124, 20]], c: rb });
    S.push({ p: [[98, 60], [146, 58], [144, 48], [100, 50]], c: sv, sw: 3.5 });
    spark(S, 130, 36, 5, st); spark(S, 146, 26, 4, '#FFFFFF');
    S.push({ p: [[172, 0], [176, 7], [184, 8], [178, 13], [180, 21], [172, 17], [164, 21], [166, 13], [160, 8], [168, 7]], c: st, sw: 3 });
    S.push(face(121, 94, 34, { skin: sk, brow: 'haughty', mouth: 'smirk', eyes: ['half', 'normal'], iris: '#3A5AB0' }));
    glow(A, 196, 118, 46, '#9FB8FF', .32); glow(A, 196, 118, 27, '#E6ECFF', .5);
    arm(A, [140, 140], [164, 164], [184, 152], { u: rb, hand: sk, w: 15, hr: 9 });
    A.push({ p: [[214, 88], [220, 92], [228, 142], [222, 140]], c: '#F8EED6', sw: 3 });
    A.push({ p: [[168, 96], [214, 88], [222, 140], [176, 148]], c: '#2A3A78' });
    A.push({ p: limb([168, 96], [176, 148], 10, 10), c: sv });
    [[[176, 96], [190, 94], [178, 108]], [[214, 88], [216, 102], [202, 91]], [[222, 140], [208, 142], [220, 127]], [[176, 148], [175, 134], [189, 146]]].forEach(t => A.push({ p: t, c: sv, sw: 2.5 }));
    A.push({ raw: pl([[180, 136], [188, 128], [194, 122]], 3, sv, .9) + pl([[184, 140], [192, 132]], 2, sv, .7) });
    A.push({ p: [[198, 106], [201, 114], [209, 115], [203, 120], [205, 128], [198, 124], [191, 128], [193, 120], [187, 115], [195, 114]], c: st, sw: 2.5 });
    spark(A, 176, 80, 9, st); spark(A, 220, 76, 10, '#FFFFFF'); spark(A, 204, 56, 7, st); spark(A, 236, 110, 6, '#E6ECFF');
    return { S, A, pivot: [140, 140], base: [121, 290, 80] };
  },
  kestrel_desert() {
    const S = [], A = [], sk = '#F6C9A0', be = '#E8D3A8', be2 = '#D4B888', oc = '#C8873A', oc2 = '#A8642A', pa = '#B89868', bt = '#8A5530', wd = '#E0B87A';
    S.push({ p: limb([92, 118], [106, 194], 18, 18), c: oc2 });
    [[84, 114], [96, 108], [106, 114]].forEach(([x, y], i) => S.push({ p: [[x - 5, y + 6], [x, y - 12], [x + 5, y + 6]], c: i === 1 ? oc : '#FFFDF6', sw: 3 }));
    S.push({ p: [[96, 132], [140, 130], [150, 160], [112, 250], [68, 236], [78, 170]], c: be2 });
    S.push({ p: [[92, 82], [62, 72], [40, 96], [60, 98], [48, 114], [88, 100]], c: be });
    leg(S, [108, 196], [92, 240], [80, 286], pa, bt, 20, -1);
    leg(S, [134, 196], [150, 240], [160, 286], pa, bt, 20, 1);
    S.push({ raw: pl([[146, 252], [164, 254]], 4, be) + pl([[145, 262], [164, 264]], 4, be) + pl([[76, 252], [92, 254]], 4, be) });
    S.push({ p: [[100, 134], [142, 132], [150, 166], [140, 200], [104, 200], [94, 166]], c: oc });
    S.push({ p: limb([100, 138], [146, 196], 9, 9), c: be, sw: 3.5, sil: false });
    S.push({ p: limb([96, 190], [148, 190], 9, 9), c: '#6B4226' });
    head(S, 124, 96, 34, sk);
    S.push({ p: [[88, 98], [92, 64], [120, 52], [152, 62], [160, 92], [146, 78], [124, 74], [104, 84]], c: be });
    S.push({ p: [[140, 78], [150, 74], [150, 90], [144, 84]], c: '#D9622B', sw: 3 });
    S.push({ p: limb([90, 80], [158, 73], 8, 8), c: oc, sw: 3 });
    S.push(face(124, 96, 34, { skin: sk, brow: 'angry', mouth: 'focus', eyes: ['closed', 'normal'], iris: '#6B4A22' }));
    S.push({ p: [[92, 106], [160, 102], [158, 120], [132, 136], [96, 126]], c: oc });
    S.push({ raw: pl([[104, 116], [130, 126], [150, 112]], 2.5, oc2) });
    S.push({ p: [[96, 110], [80, 118], [86, 132], [98, 122]], c: oc });
    arm(S, [106, 144], [82, 136], [140, 128], { u: be, hand: sk, w: 15, hr: 9 });
    const bw = [[186, 56], [202, 78], [211, 106], [214, 138], [211, 170], [202, 198], [186, 220]];
    for (let i = 0; i < bw.length - 1; i++) A.push({ p: limb(bw[i], bw[i + 1], i === 0 || i === 5 ? 7 : 10, 10), c: wd });
    A.push({ raw: pl(bw.map(p => [p[0] - 2, p[1]]), 2.2, '#FFFFFF', .6) });
    A.push({ p: [[186, 56], [180, 48], [192, 52]], c: oc2, sw: 3 }); A.push({ p: [[186, 220], [180, 228], [192, 224]], c: oc2, sw: 3 });
    A.push({ p: limb([214, 128], [214, 148], 13, 13), c: oc, sw: 3.5 });
    A.push({ raw: `<polyline points="186,56 140,128 186,220" fill="none" stroke="#F8EED6" stroke-width="2.2"/>` });
    arm(A, [142, 144], [176, 142], [212, 138], { u: be, hand: sk, w: 15, hr: 9 });
    A.push({ p: limb([130, 128], [228, 138], 4.5, 4.5), c: wd, sw: 3 });
    A.push({ p: [[133, 121], [146, 126], [145, 131], [130, 131]], c: oc, sw: 2.5 });
    A.push({ p: [[226, 132], [242, 139], [226, 146]], c: '#DCE5EC', sw: 3 });
    return { S, A, pivot: [142, 144], base: [120, 290, 80] };
  },
  mira_nuit() {
    const S = [], A = [], sk = '#F2B48C', dr = '#22357A', dr2 = '#162558', hm = '#3A5AA8', hr = '#8A4A2E', sa = '#1E2A4A';
    S.push({ p: ngon(90, 70, 16, 16, 7), c: hr }); S.push({ p: ngon(156, 68, 16, 16, 7), c: hr });
    S.push({ p: [[88, 86], [156, 84], [160, 126], [86, 126]], c: hr });
    leg(S, [110, 200], [106, 242], [102, 286], sk, sa, 16, -1);
    leg(S, [132, 200], [158, 228], [146, 262], sk, sa, 16, 1);
    S.push({ p: [[104, 132], [138, 132], [146, 172], [168, 226], [122, 238], [78, 226], [98, 172]], c: dr });
    [[100, 196, 2.6], [124, 190, 2.2], [142, 206, 2.6], [112, 214, 2.2], [92, 214, 2], [134, 222, 2], [116, 150, 2]].forEach(([x, y, r]) => ffly(S, x, y, r));
    S.push({ p: [[80, 226], [166, 226], [162, 216], [84, 216]], c: hm, sw: 3.5 });
    S.push({ p: limb([96, 172], [148, 172], 10, 10), c: dr2 });
    S.push({ p: ngon(104, 142, 13, 11, 6), c: dr }); S.push({ p: ngon(140, 142, 13, 11, 6), c: dr });
    arm(S, [104, 146], [112, 178], [146, 176], { u: dr, l: sk, hand: sk, w: 14, hr: 9 });
    head(S, 122, 94, 35, sk);
    S.push({ p: [[88, 96], [92, 68], [120, 57], [152, 64], [159, 92], [146, 76], [128, 72], [106, 80]], c: hr });
    S.push({ p: [[90, 76], [120, 64], [152, 68], [152, 75], [120, 71], [92, 83]], c: dr2, sw: 3.5 });
    ffly(S, 140, 69, 2.6);
    S.push(face(122, 94, 35, { skin: sk, brow: 'up', mouth: 'open', eyes: ['sparkle', 'sparkle'], blush: true, iris: '#2E4A8A' }));
    [[60, 110, 2.6], [48, 180, 2.2], [70, 244, 2.4], [196, 104, 2.2], [210, 214, 2.6], [172, 44, 2], [58, 60, 2]].forEach(([x, y, r]) => ffly(S, x, y, r));
    glow(A, 153, 166, 42, '#FFF1B8', .3); glow(A, 153, 166, 24, '#FFFBE0', .5);
    A.push({ raw: `<polyline points="116,134 153,148 140,134" fill="none" stroke="#D9A62A" stroke-width="2.5"/>` });
    arm(A, [140, 146], [168, 166], [162, 178], { u: dr, l: sk, hand: sk, w: 14, hr: 9 });
    A.push({ p: ngon(153, 166, 15, 17, 8, Math.PI / 8), c: '#D9A62A' });
    A.push({ p: ngon(153, 166, 10, 12, 8, Math.PI / 8), c: '#FFF1B8', sw: 3 });
    A.push({ p: ngon(153, 166, 4, 4, 6), c: '#E8FF7A', sw: 0, sil: false });
    A.push({ p: ngon(153, 147, 5, 4, 6), c: '#D9A62A', sw: 2.5 });
    spark(A, 188, 136, 7, '#FFF1B8'); spark(A, 180, 196, 5, '#E8FF7A');
    return { S, A, pivot: [140, 146], base: [122, 290, 78] };
  }
};

const VB = 'viewBox="-24 -24 288 356" width="288" height="356"';
function lobby(k) {
  const isSkin = !!SKINS[k], C = isSkin ? SKINS[k]() : ORIG[k]();
  seed = 7; LX = -.55;
  const [cx, y, rx] = C.base;
  return `<svg xmlns="http://www.w3.org/2000/svg" ${VB}>${socle(cx, y, rx)}${parts(C.S)}${C.A ? parts(C.A) : ''}</svg>`;
}
function combat(k) {
  const C = SKINS[k](); seed = 7; LX = -.55;
  const [cx, y, rx] = C.base, [px, py] = C.pivot;
  return `<svg xmlns="http://www.w3.org/2000/svg" ${VB}><g id="ombre">${shadow(cx, y, rx)}</g><g id="corps">${parts(C.S)}</g><g id="bras_arme" data-pivot="${px},${py}" style="transform-box:view-box;transform-origin:${px}px ${py}px">${parts(C.A)}</g></svg>`;
}
function eldanBack() {
  seed = 7; LX = -.55; const S = [], A = [], { sk, hr, hr2, tu, ro, ac, pa, bt } = EJ;
  leg(S, [110, 196], [104, 240], [98, 286], pa, bt, 20, -1);
  leg(S, [136, 196], [148, 238], [156, 284], pa, bt, 20, 1);
  arm(S, [96, 142], [80, 176], [86, 208], { u: tu, hand: sk, w: 15, hr: 9 });
  S.push({ p: [[94, 130], [150, 128], [160, 170], [162, 226], [124, 234], [86, 226], [90, 170]], c: tu });
  S.push({ raw: pl([[124, 140], [122, 192]], 2.5, '#C8C0A0') + pl([[88, 222], [124, 230], [160, 222]], 3, '#D8D0B0') });
  S.push({ p: limb([88, 198], [158, 196], 10, 10), c: ro });
  S.push({ raw: `<polyline points="90,198 156,196" fill="none" stroke="#A8844A" stroke-width="2.2" stroke-dasharray="4 5"/>` });
  S.push({ p: ngon(96, 200, 8, 7, 6), c: ro, sw: 3 });
  S.push({ p: limb([94, 206], [88, 222], 6, 5), c: ro, sw: 3 }); S.push({ p: limb([99, 206], [100, 222], 6, 5), c: ro, sw: 3 });
  S.push({ p: limb([124, 112], [124, 132], 16, 20), c: sk });
  S.push({ p: ngon(124, 132, 23, 8, 7), c: ac });
  S.push({ p: ngon(98, 140, 15, 12, 6), c: tu });
  S.push({ p: ngon(124, 90, 34, 35, 9, Math.PI / 2), c: sk });
  S.push({ p: ngon(156, 96, 7, 10, 6), c: sk });
  S.push({ p: [[90, 112], [84, 80], [90, 58], [104, 50], [110, 32], [126, 44], [142, 32], [148, 50], [162, 58], [160, 74], [152, 84], [150, 108], [138, 122], [108, 122]], c: hr });
  S.push({ raw: pl([[104, 62], [112, 84], [108, 104]], 2.5, hr2) + pl([[128, 52], [130, 80], [126, 108]], 2.5, hr2) + pl([[146, 62], [142, 86]], 2.5, hr2) });
  const ps = [150, 138];
  ejStaff(A, [158, 240], [234, 18]);
  A.push({ p: ngon(150, 136, 15, 12, 6), c: tu });
  arm(A, ps, [178, 154], [194, 128], { u: tu, hand: sk, w: 15, hr: 9 });
  const [cx, y, rx] = [124, 290, 80];
  return `<svg xmlns="http://www.w3.org/2000/svg" ${VB}><g id="ombre">${shadow(cx, y, rx)}</g><g id="corps">${parts(S)}</g><g id="bras_arme" data-pivot="${ps[0]},${ps[1]}" style="transform-box:view-box;transform-origin:${ps[0]}px ${ps[1]}px">${parts(A)}</g></svg>`;
}
function batonIcon() {
  seed = 7; LX = -.55; const S = [];
  ejStaff(S, [22, 110], [100, 22]);
  spark(S, 112, 44, 7, '#DDF2FF'); spark(S, 80, 12, 5, EJ.ac);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">${parts(S)}</svg>`;
}
W.TSHeroSkins = { lobby, combat, eldanBack, batonIcon, ORIG: Object.keys(ORIG), SKINS: Object.keys(SKINS) };
})(typeof window !== 'undefined' ? window : globalThis);
