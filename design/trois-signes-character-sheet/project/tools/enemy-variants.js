(function (W) {
const OL = '#17251B';
const VARIANTS = {
  petit:   { label: 'Petit',   sx: .75, sy: .75, E: '#2E9E48', E2: '#46C862', D: '#17552A', ar: '#35A852', cape: '#1D6630' },
  moyen:   { label: 'Moyen',   sx: 1,   sy: 1,   E: '#3B2C4A', E2: '#55406A', D: '#261C30', ar: '#4A3A5E', cape: '#2A1F36' },
  grand:   { label: 'Grand',   sx: 1.2, sy: 1.12, E: '#C8642A', E2: '#E58A46', D: '#6E3314', ar: '#D2743A', cape: '#7E3A16' },
  costaud: { label: 'Costaud', sx: 1.36, sy: 1.26, E: '#2A1640', E2: '#43245F', D: '#12081E', ar: '#361E52', cape: '#1A0C2A', angular: true }
};
function build(kind, vk, o) {
  o = Object.assign({ ol: 11, fc: 1, socles: true, pad: 18 }, o || {});
  const V = VARIANTS[vk];
  let LX = -0.55; const LY = -0.83;
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (h, t, k) => '#' + rgb(h).map((v, i) => Math.round(v + (t[i] - v) * k).toString(16).padStart(2, '0')).join('');
  const sh = (h, a) => a >= 0 ? mix(h, [255, 248, 222], Math.min(a, .9)) : mix(h, [16, 28, 32], Math.min(-a, .9));
  const P = pts => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
  const nrm = a => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; }, perp = a => [-a[1], a[0]];
  const ngon = (cx, cy, rx, ry, n, rot = 0) => Array.from({ length: n }, (_, i) => { const t = rot + i * 2 * Math.PI / n; return [cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]; });
  const limb = (a, b, wa, wb) => { const n = perp(nrm(sub(b, a))); return [add(a, mul(n, wa / 2)), add(b, mul(n, wb / 2)), sub(b, mul(n, wb / 2)), sub(a, mul(n, wa / 2))]; };
  const tri = (pts, f) => `<polygon points="${P(pts)}" fill="${f}" stroke="${f}" stroke-width="0.8" stroke-linejoin="round"/>`;
  const facets = (pts, col) => {
    let cx = 0, cy = 0; pts.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= pts.length; cy /= pts.length;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const m = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * .16;
    const c = [cx + LX * m, cy + LY * m]; let s = '';
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy, l = Math.hypot(mx, my) || 1;
      const d = (LX * mx + LY * my) / l;
      s += tri([c, a, b], sh(col, (d > 0 ? d * .2 : d * .32) * o.fc + (rnd() - .5) * .08 * o.fc));
    }
    return s;
  };
  // costaud: alternate vertices pushed out -> jagged, more angular silhouette
  const jag = (pts) => {
    if (pts.length < 6) return pts;
    let cx = 0, cy = 0; pts.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= pts.length; cy /= pts.length;
    return pts.map((p, i) => i % 2 ? p : [cx + (p[0] - cx) * 1.12, cy + (p[1] - cy) * 1.12]);
  };
  const parts = S => {
    let sil = '', body = '';
    for (const q of S) {
      if (q.raw !== undefined) { body += q.raw; continue; }
      const pts = V.angular && q.o == null && !q.keep ? jag(q.p) : q.p, pp = P(pts);
      if (q.sil !== false) sil += `<polygon points="${pp}" fill="${OL}" stroke="${OL}" stroke-width="${o.ol}" stroke-linejoin="miter"/>`;
      body += `<g${q.o != null ? ` opacity="${q.o}"` : ''}><polygon points="${pp}" fill="${q.c}" stroke="${q.sw === 0 ? 'none' : OL}" stroke-width="${q.sw ?? 4.5}" stroke-linejoin="round"/>${facets(pts, q.c)}</g>`;
    }
    return sil + body;
  };
  const socle = (cx, y, rx, top, side) => {
    const t = ngon(cx, y, rx, rx * .2, 10, 0), fr = t.slice(0, 6);
    const B = [{ p: [...fr, ...fr.map(p => [p[0], p[1] + 18]).reverse()], c: side, keep: 1 }, { p: t, c: top, keep: 1 }];
    [[-.62, .1], [.5, .14], [.78, .02]].forEach(([u, v]) => { const x = cx + u * rx, yy = y + v * rx; B.push({ p: [[x - 7, yy], [x - 2, yy - 13], [x + 1, yy - 4], [x + 5, yy - 11], [x + 8, yy]], c: '#9ACD32', sw: 3, sil: false, keep: 1 }); });
    return parts(B);
  };
  const shadow = (cx, y, rx) => `<polygon points="${P(ngon(cx + rx * .1, y + 1, rx * .6, rx * .12, 9))}" fill="${OL}" opacity=".3"/>`;
  const arm = (S, s, e, h, a) => { const w = a.w; S.push({ p: limb(s, e, w, w * .92), c: a.u }); S.push({ p: ngon(e[0], e[1], w * .5, w * .5, 6), c: a.u }); S.push({ p: limb(e, h, w * .9, w * .8), c: a.l || a.u }); S.push({ p: ngon(h[0], h[1], a.hr, a.hr * 1.05, 7, .3), c: a.hand }); };
  const leg = (S, hp, k, f, col, boot, w, dir) => {
    S.push({ p: limb(hp, k, w, w * .92), c: col }); S.push({ p: ngon(k[0], k[1], w * .48, w * .48, 6), c: col }); S.push({ p: limb(k, [f[0], f[1] - 18], w * .9, w * .82), c: col });
    const bw = w * .62; S.push({ p: [[f[0] - bw, f[1] - 26], [f[0] + bw, f[1] - 26], [f[0] + bw + (dir > 0 ? 13 : 2), f[1]], [f[0] - bw - (dir < 0 ? 13 : 2), f[1]]], c: boot });
  };
  const sword = (S, h, tip, a) => {
    const d = nrm(sub(tip, h)), n = perp(d), b = add(h, mul(d, 12)), t0 = sub(tip, mul(d, a.bw * 1.4));
    S.push({ p: limb(add(h, mul(d, 10)), sub(h, mul(d, 16)), 8, 8), c: a.grip || '#5C3A22' });
    S.push({ p: [add(b, mul(n, a.bw / 2)), add(t0, mul(n, a.bw * .42)), tip, sub(t0, mul(n, a.bw * .42)), sub(b, mul(n, a.bw / 2))], c: a.col, keep: 1 });
    S.push({ raw: `<polygon points="${P([add(b, mul(n, a.bw * .12)), add(t0, mul(n, a.bw * .1)), sub(t0, mul(n, a.bw * .05)), sub(b, mul(n, a.bw * .05))])}" fill="${a.edge || '#FFFFFF'}" opacity=".7"/>` });
    S.push({ p: limb(sub(b, mul(n, a.guard)), add(b, mul(n, a.guard)), 9, 9), c: a.guardCol });
    const pm = sub(h, mul(d, 20)); S.push({ p: ngon(pm[0], pm[1], 7, 7, 6), c: a.guardCol });
  };
  const glow = (S, x, y, r, c, op) => S.push({ p: ngon(x, y, r, r, 12, .2), c, o: op, sil: false, sw: 0 });
  const spike = (S, pts) => S.push({ p: pts, c: bone, keep: 1 });
  const { E, E2, D, ar } = V;
  const bone = '#EADFC8', Y = '#FFD23F', R = '#FF5A3C';
  const glare = pts => `<polygon points="${P(pts)}" fill="${Y}" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>`;
  let C;
  if (kind === 'sbire') {
    const S = [];
    S.push({ p: [[100, 236], [70, 246], [50, 226], [40, 240], [58, 258], [98, 252]], c: E });
    leg(S, [108, 238], [94, 262], [96, 286], E, D, 13, -1);
    arm(S, [106, 206], [86, 226], [82, 246], { u: E, hand: E2, w: 11, hr: 8 });
    S.push({ p: [[100, 196], [140, 192], [150, 222], [136, 246], [106, 246], [94, 222]], c: E2 });
    S.push({ p: [[98, 226], [146, 222], [138, 240], [120, 234], [104, 242]], c: '#7A3B3B' });
    leg(S, [132, 238], [152, 260], [148, 286], E, D, 13, 1);
    S.push({ p: [[96, 158], [54, 136], [92, 178]], c: E }); S.push({ p: [[152, 156], [192, 130], [156, 176]], c: E });
    if (V.angular) { spike(S, [[104, 200], [96, 184], [114, 196]]); spike(S, [[136, 196], [146, 180], [146, 200]]); }
    S.push({ p: [[92, 150], [112, 136], [140, 134], [160, 150], [158, 178], [140, 198], [108, 198], [90, 178]], c: E });
    S.push({ p: [[106, 140], [96, 112], [118, 136]], c: bone }); S.push({ p: [[134, 136], [148, 110], [148, 140]], c: bone });
    if (V.angular) spike(S, [[118, 136], [124, 116], [132, 135]]);
    S.push({ raw: glare([[100, 158], [122, 166], [104, 174]]) + glare([[132, 166], [154, 156], [150, 174]]) + `<polygon points="${P(limb([100, 154], [124, 162], 5, 4))}" fill="${OL}"/><polygon points="${P(limb([130, 162], [156, 152], 4, 5))}" fill="${OL}"/><polygon points="106,182 150,177 142,191 112,193" fill="#1A0F1F" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/><polyline points="108,183 113,189 118,182 123,189 128,181 133,188 138,180 143,186 148,178" fill="none" stroke="#FFFDF6" stroke-width="2.2" stroke-linejoin="round"/>` });
    sword(S, [168, 214], [200, 172], { bw: 13, guard: 8, col: '#8E97A0', guardCol: '#5C3A22', edge: '#C8CED4' });
    arm(S, [140, 206], [160, 226], [168, 214], { u: E, hand: E2, w: 11, hr: 8 });
    C = { S, W: 240, H: 320, base: [120, 290, 64] };
  } else if (kind === 'brute') {
    const S = [];
    arm(S, [98, 132], [62, 190], [68, 248], { u: E, hand: E2, w: 34, hr: 25 });
    [[54, 264], [68, 268], [82, 264]].forEach(([x, y]) => S.push({ p: [[x - 5, y - 10], [x + 5, y - 10], [x, y + 6]], c: bone, sw: 3 }));
    leg(S, [120, 232], [108, 260], [100, 288], E, D, 32, -1);
    leg(S, [178, 232], [192, 260], [200, 288], E, D, 32, 1);
    if (V.angular) { spike(S, [[84, 160], [60, 140], [88, 146]]); spike(S, [[80, 186], [56, 176], [84, 174]]); }
    S.push({ p: [[90, 120], [150, 98], [210, 116], [226, 170], [198, 238], [106, 240], [78, 180]], c: E2 });
    S.push({ p: [[118, 170], [170, 166], [178, 214], [112, 216]], c: E });
    S.push({ raw: `<polyline points="132,180 144,192 138,204 152,210" fill="none" stroke="${R}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` });
    S.push({ p: [[96, 118], [86, 90], [112, 110]], c: bone }); S.push({ p: [[200, 110], [214, 84], [216, 118]], c: bone });
    if (V.angular) spike(S, [[146, 86], [150, 58], [160, 84]]);
    S.push({ p: [[124, 96], [146, 80], [172, 84], [186, 104], [178, 130], [154, 144], [130, 138], [120, 116]], c: E });
    S.push({ p: [[128, 92], [100, 62], [110, 50], [140, 84]], c: bone }); S.push({ p: [[172, 86], [194, 54], [206, 62], [184, 96]], c: bone });
    S.push({ raw: glare([[134, 104], [152, 110], [138, 116]]) + glare([[160, 110], [178, 102], [174, 116]]) + `<polygon points="${P(limb([132, 100], [154, 106], 6, 4))}" fill="${OL}"/><polygon points="${P(limb([158, 106], [180, 98], 4, 6))}" fill="${OL}"/><polygon points="136,124 176,120 170,132 142,134" fill="#1A0F1F" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/><polygon points="140,128 144,114 149,127" fill="${bone}" stroke="${OL}" stroke-width="2.5"/><polygon points="162,125 167,111 171,124" fill="${bone}" stroke="${OL}" stroke-width="2.5"/>` });
    S.push({ p: limb([226, 128], [258, 62], 12, 17), c: '#5C3A22' });
    S.push({ p: ngon(260, 56, 27, 31, 6, .3), c: '#7A6A5E' });
    [[240, 36], [282, 46], [262, 24], [284, 70]].forEach(([x, y]) => S.push({ p: [[x - 6, y + 6], [x, y - 12], [x + 6, y + 6]], c: bone, sw: 3 }));
    arm(S, [206, 128], [238, 154], [226, 124], { u: E, hand: E2, w: 34, hr: 22 });
    C = { S, W: 300, H: 320, base: [150, 290, 108] };
  } else {
    const S = [], gold = '#D9A62A';
    S.push({ p: [[130, 140], [230, 136], [278, 300], [262, 374], [238, 342], [214, 384], [190, 348], [160, 386], [138, 346], [110, 378], [94, 300]], c: V.cape, keep: 1 });
    glow(S, 112, 50, 44, R, .3);
    arm(S, [128, 156], [94, 124], [110, 86], { u: ar, hand: E, w: 26, hr: 17 });
    [[98, 72], [108, 66], [120, 70]].forEach(([x, y]) => S.push({ p: [[x - 4, y + 6], [x, y - 12], [x + 4, y + 6]], c: bone, sw: 3 }));
    S.push({ p: [[94, 70], [102, 34], [112, 52], [122, 20], [132, 50], [140, 40], [134, 74]], c: R, sw: 3.5, sil: false, keep: 1 });
    S.push({ p: [[104, 70], [110, 50], [118, 60], [124, 40], [128, 72]], c: Y, sw: 3, sil: false, keep: 1 });
    leg(S, [160, 262], [144, 318], [134, 388], ar, D, 32, -1);
    leg(S, [204, 262], [224, 318], [232, 388], ar, D, 32, 1);
    if (V.angular) { spike(S, [[124, 200], [100, 190], [120, 180]]); spike(S, [[236, 200], [262, 190], [240, 180]]); }
    S.push({ p: [[132, 138], [228, 136], [244, 190], [220, 270], [140, 270], [118, 190]], c: ar });
    S.push({ p: [[152, 150], [208, 150], [214, 196], [180, 226], [146, 196]], c: E });
    glow(S, 180, 186, 26, R, .4);
    S.push({ p: ngon(180, 186, 13, 17, 6, Math.PI / 2), c: R, keep: 1 });
    S.push({ p: [[140, 256], [220, 256], [234, 298], [180, 310], [126, 298]], c: E });
    S.push({ p: [[104, 150], [122, 122], [152, 130], [152, 162], [126, 174]], c: E2 });
    S.push({ p: [[112, 132], [88, 100], [128, 124]], c: bone });
    S.push({ p: [[158, 86], [126, 52], [136, 30], [168, 76]], c: bone }); S.push({ p: [[206, 86], [238, 52], [230, 30], [198, 76]], c: bone });
    S.push({ p: [[152, 100], [160, 76], [182, 68], [206, 76], [214, 100], [208, 128], [182, 142], [156, 128]], c: E });
    S.push({ p: [[156, 82], [208, 82], [206, 70], [158, 70]], c: Y, sw: 3.5 });
    [[164, 70], [182, 68], [200, 70]].forEach(([x, y], i) => S.push({ p: [[x - 7, y], [x, y - (i === 1 ? 26 : 16)], [x + 7, y]], c: gold, sw: 3.5 }));
    S.push({ raw: glare([[160, 102], [180, 108], [163, 115]]) + glare([[188, 108], [208, 99], [205, 114]]) + `<polygon points="168,124 198,122 194,132 172,133" fill="${R}" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/><g stroke="${OL}" stroke-width="2.5"><line x1="176" y1="123" x2="176" y2="133"/><line x1="183" y1="123" x2="183" y2="133"/><line x1="190" y1="122" x2="190" y2="132"/></g>` });
    sword(S, [238, 236], [304, 384], { bw: 26, guard: 30, col: '#3B2C4A', guardCol: Y, edge: R });
    S.push({ p: [[206, 130], [240, 120], [264, 148], [242, 172], [210, 160]], c: E2 });
    S.push({ p: [[236, 122], [256, 86], [252, 132]], c: bone });
    if (V.angular) spike(S, [[222, 128], [230, 100], [238, 124]]);
    arm(S, [232, 152], [262, 198], [238, 236], { u: ar, hand: E, w: 26, hr: 18 });
    C = { S, W: 360, H: 420, base: [184, 390, 132] };
  }
  LX = .55;
  const [cx, y, rx] = C.base;
  const base = (o.socles ? socle(cx, y, rx, '#2E8A4A', '#14502A') : '') + shadow(cx, y, rx);
  const inner = base + parts(C.S);
  const pd = o.pad, sx = V.sx, sy = V.sy;
  const w = Math.round(C.W * sx + pd * 2), h = Math.round(C.H * sy + pd * 2);
  return {
    w, h,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g transform="translate(${pd} ${pd}) scale(${sx} ${sy}) translate(${C.W} 0) scale(-1 1)">${inner}</g></svg>`
  };
}
W.TSEnemies = { build, VARIANTS, KINDS: ['sbire', 'brute', 'boss'] };
})(typeof window !== 'undefined' ? window : globalThis);
