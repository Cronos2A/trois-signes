(function () {
const W = 390, H = 844, DK = '#17251B';
function eng(seed, OL) {
  OL = OL || DK; let sd = seed;
  const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const hex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, k) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * k)); };
  const sh = (c, a) => a >= 0 ? mix(c, '#FFF8DE', Math.min(a, .9)) : mix(c, '#101C20', Math.min(-a, .9));
  const grad = (st, t) => { t = Math.max(0, Math.min(1, t)); for (let i = 0; i < st.length - 1; i++) if (t <= st[i + 1][0]) return mix(st[i][1], st[i + 1][1], (t - st[i][0]) / ((st[i + 1][0] - st[i][0]) || 1)); return st[st.length - 1][1]; };
  const P = pts => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const ngon = (cx, cy, rx, ry, n, rot = 0) => Array.from({ length: n }, (_, i) => { const t = rot + i * 2 * Math.PI / n; return [cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]; });
  const limb = (a, b, wa, wb) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; return [[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2], [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]]; };
  const LX = -.55, LY = -.83;
  const tri = (pts, f) => `<polygon points="${P(pts)}" fill="${f}" stroke="${f}" stroke-width=".8" stroke-linejoin="round"/>`;
  const facets = (pts, col) => {
    let cx = 0, cy = 0; pts.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= pts.length; cy /= pts.length;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const m = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * .16;
    const c = [cx + LX * m, cy + LY * m]; let s = '';
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy, l = Math.hypot(mx, my) || 1, d = (LX * mx + LY * my) / l;
      s += tri([c, a, b], sh(col, (d > 0 ? d * .2 : d * .3) + (rnd() - .5) * .07));
    }
    return s;
  };
  const parts = (S, ol = 7) => {
    let sil = '', body = '';
    for (const q of S) {
      if (q.raw !== undefined) { body += q.raw; continue; }
      const pp = P(q.p);
      if (q.sil !== false) sil += `<polygon points="${pp}" fill="${OL}" stroke="${OL}" stroke-width="${ol}" stroke-linejoin="round"/>`;
      body += `<g${q.o != null ? ` opacity="${q.o}"` : ''}><polygon points="${pp}" fill="${q.c}" stroke="${q.sw === 0 ? 'none' : OL}" stroke-width="${q.sw ?? 3}" stroke-linejoin="round"/>${q.flat ? '' : facets(q.p, q.c)}</g>`;
    }
    return sil + body;
  };
  const grid = (y0, y1, cols, rows, colFn, ampFn) => {
    const pts = []; let s = '';
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
    return s;
  };
  const glow = (x, y, rx, ry, c, op, n = 16) => `<polygon points="${P(ngon(x, y, rx, ry, n, .2))}" fill="${c}" opacity="${op}"/>`;
  const line = (pts, c, w, ol = 5, op = 1) => `<g opacity="${op}" fill="none" stroke-linecap="round" stroke-linejoin="round">${ol ? `<polyline points="${P(pts)}" stroke="${OL}" stroke-width="${w + ol}"/>` : ''}<polyline points="${P(pts)}" stroke="${c}" stroke-width="${w}"/></g>`;
  const cat = (a, b, sag, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t)]; });
  const calm = (HZ, base = .02, edge = .15) => (x, y) => { const ex = Math.abs(x - 195) / 195; return base + edge * Math.pow(ex, 2.2) + .035 * Math.max(0, 1 - (y - HZ) / 110); };
  return { OL, rnd, mix, sh, grad, P, ngon, limb, parts, grid, glow, line, cat, calm, facets };
}
const wrap = (s, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">${defs ? `<defs>${defs}</defs>` : ''}${s}</svg>`;

// ---- shared props
const cloud = (e, x, y, k, c) => e.parts([{ p: e.ngon(x - 30 * k, y + 4 * k, 22 * k, 15 * k, 7), c }, { p: e.ngon(x + 28 * k, y + 5 * k, 20 * k, 14 * k, 7), c }, { p: e.ngon(x, y - 6 * k, 28 * k, 22 * k, 8), c }, { p: [[x - 50 * k, y + 15 * k], [x + 46 * k, y + 15 * k], [x + 38 * k, y + 2 * k], [x - 42 * k, y + 2 * k]], c }], 5);
const pine = (e, x, yb, h, c1 = '#3FA85A', c2 = '#2E8A4A', tr = '#6B4428', ol = 6) => { const S = [{ p: e.limb([x, yb + 2], [x, yb - h * .22], h * .1, h * .08), c: tr }]; for (let i = 0; i < 3; i++) { const b = yb - h * .14 - i * h * .22, w = h * .34 * (1 - i * .22), a = b - h * .36; S.push({ p: [[x - w, b], [x - w * .2, b + h * .03], [x + w * .3, b + h * .02], [x + w, b], [x, a]], c: i % 2 ? c2 : c1 }); } return e.parts(S, ol); };
const tree = (e, x, yb, h, c1 = '#2E8A4A', c2 = '#3FA85A', tr = '#6B4428', ol = 6) => e.parts([{ p: e.limb([x, yb + 2], [x, yb - h * .4], h * .12, h * .09), c: tr }, { p: e.ngon(x - h * .14, yb - h * .6, h * .26, h * .24, 7, .3), c: c1 }, { p: e.ngon(x + h * .08, yb - h * .72, h * .3, h * .28, 8, .1), c: c2 }], ol);
const rock = (e, x, y, r, c = '#A2988A', c2) => e.parts([{ p: e.ngon(x, y - r * .4, r, r * .7, 6, .4), c }, { p: e.ngon(x + r * .8, y - r * .15, r * .5, r * .4, 5), c: c2 || e.sh(c, -.12) }], 6);
const bush = (e, x, y, r, c1 = '#5DBA4F', c2 = '#4AA548') => e.parts([{ p: e.ngon(x, y - r * .6, r, r * .75, 7), c: c1 }, { p: e.ngon(x + r * .8, y - r * .4, r * .6, r * .5, 6), c: c2 }], 6);
const blade = (e, x, y, k = 1, c = '#9ACD32') => `<polygon points="${e.P([[x - 7 * k, y], [x - 3 * k, y - 12 * k], [x, y - 4 * k], [x + 3 * k, y - 14 * k], [x + 5 * k, y - 3 * k], [x + 9 * k, y - 10 * k], [x + 9 * k, y]])}" fill="${c}" stroke="${e.OL}" stroke-width="2.5" stroke-linejoin="round"/>`;
const dot = (e, x, y, r, c) => `<polygon points="${e.P(e.ngon(x, y, r, r, 5, e.rnd()))}" fill="${c}" stroke="${e.OL}" stroke-width="1.8" stroke-linejoin="round"/>`;
const edges = (e, n, y0, y1, fn) => { let s = ''; for (let i = 0; i < n; i++) { const L = i % 2 === 0, x = L ? 6 + e.rnd() * 58 : 326 + e.rnd() * 58, y = y0 + e.rnd() * (y1 - y0); s += fn(x, y, i); } return s; };
const page = (e, x, y, rot, k, words, col = '#FFFBEF', ink = '#4A3B2E') => {
  const a = rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), R = (u, v) => [x + u * c - v * s, y + u * s + v * c];
  const w = 13 * k, h = 17 * k;
  let o = `<polygon points="${e.P([R(-w, -h), R(w * .7, -h), R(w, -h * .75), R(w, h), R(-w, h)])}" fill="${col}" stroke="${e.OL}" stroke-width="2.6" stroke-linejoin="round"/><polygon points="${e.P([R(w * .7, -h), R(w * .7, -h * .75), R(w, -h * .75)])}" fill="${e.sh(col, -.15)}" stroke="${e.OL}" stroke-width="1.6" stroke-linejoin="round"/>`;
  for (let r = 0; r < 5; r++) { const v = -h * .55 + r * h * .3, len = (r === 4 ? .9 : 1.5) * w, op = Math.max(0, words - r * .18); if (op > .02) o += `<line x1="${R(-w * .7, v)[0].toFixed(1)}" y1="${R(-w * .7, v)[1].toFixed(1)}" x2="${R(-w * .7 + len, v)[0].toFixed(1)}" y2="${R(-w * .7 + len, v)[1].toFixed(1)}" stroke="${ink}" stroke-width="${(1.6 * k).toFixed(1)}" stroke-linecap="round" opacity="${op.toFixed(2)}" stroke-dasharray="${(3 * k).toFixed(1)} ${(1.6 * k).toFixed(1)}"/>`; }
  if (words < .9) for (let i = 0; i < 4; i++) { const q = R(w + 5 * k + i * 6 * k, -h * .2 + (i % 2) * 5 * k); o += `<rect x="${q[0].toFixed(1)}" y="${q[1].toFixed(1)}" width="${(2.6 * k).toFixed(1)}" height="${(2.6 * k).toFixed(1)}" fill="${ink}" opacity="${(.45 - i * .1).toFixed(2)}"/>`; }
  return o;
};

// ================= HAUTES GERBES
function hautes_gerbes() {
  const e = eng(11), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 300; let s = '';
  s += grid(0, HZ + 12, 6, 7, (x, y) => grad([[0, '#6FC0E6'], [.62, '#BDE3EC'], [1, '#FFE6AA']], y / HZ), () => .04);
  s += glow(86, 146, 78, 78, '#FFF6D0', .42) + parts([{ p: ngon(86, 146, 30, 30, 10, .2), c: '#FFE59A', sil: false, sw: 3.5 }]);
  s += cloud(e, 262, 92, 1, '#FFFFFF') + cloud(e, 150, 52, .55, '#FFFFFF') + cloud(e, 352, 196, .5, '#FFF3DC');
  s += [[178, 128], [194, 118], [206, 134]].map(([x, y]) => `<polyline points="${x - 6},${y - 3} ${x},${y + 1} ${x + 6},${y - 3}" fill="none" stroke="${DK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const hill = [[-10, HZ - 26], [40, HZ - 44], [110, HZ - 34], [170, HZ - 52], [240, HZ - 40], [300, HZ - 30], [360, HZ - 48], [400, HZ - 38], [400, HZ + 14], [-10, HZ + 14]];
  s += parts([{ p: hill, c: '#E6C458', flat: true }], 6);
  let st = ''; const cs = ['#EFCB5A', '#D6A93C', '#B9C85C', '#F3D778'];
  for (let k = 0; k < 16; k++) { const x = -220 + k * 42; st += `<polygon points="${P([[x, HZ - 60], [x + 21, HZ - 60], [x + 101, HZ + 20], [x + 80, HZ + 20]])}" fill="${cs[k % 4]}" stroke="${DK}" stroke-width="1.5" stroke-opacity=".3"/>`; }
  s += `<g clip-path="url(#hgc)">${st}</g><polyline points="${P(hill.slice(0, 8))}" fill="none" stroke="${DK}" stroke-width="3.5" stroke-linejoin="round"/>`;
  s += tree(e, 30, HZ + 2, 66) + tree(e, 212, HZ, 38) + bush(e, 70, HZ + 2, 12) + bush(e, 186, HZ, 9);
  s += parts([{ p: [[244, HZ - 66], [262, HZ - 66], [262, HZ + 4], [244, HZ + 4]], c: '#C9D2DA' }, { p: ngon(253, HZ - 66, 9, 8, 8), c: '#9AA7B4' }], 5);
  s += parts([{ p: [[270, HZ - 44], [300, HZ - 74], [330, HZ - 44], [330, HZ + 4], [270, HZ + 4]], c: '#D9412B' }, { p: [[263, HZ - 41], [300, HZ - 83], [337, HZ - 41], [330, HZ - 37], [300, HZ - 70], [270, HZ - 37]], c: '#7A2E22' }, { p: [[288, HZ + 4], [288, HZ - 24], [312, HZ - 24], [312, HZ + 4]], c: '#8A2A1E', sw: 2.5, flat: true }, { raw: `<g stroke="#F3E6C8" stroke-width="2.5"><line x1="289" y1="${HZ - 23}" x2="311" y2="${HZ + 3}"/><line x1="311" y1="${HZ - 23}" x2="289" y2="${HZ + 3}"/></g>` }, { p: [[294, HZ - 58], [306, HZ - 58], [306, HZ - 46], [294, HZ - 46]], c: '#F3E6C8', sw: 2.5, flat: true }], 5);
  s += parts([{ p: [[340, HZ - 30], [396, HZ - 30], [396, HZ + 4], [340, HZ + 4]], c: '#F6EBD2' }, { p: [[334, HZ - 28], [368, HZ - 58], [402, HZ - 28]], c: '#C4481F' }, { p: [[352, HZ - 20], [364, HZ - 20], [364, HZ - 8], [352, HZ - 8]], c: '#5AA0C8', sw: 2.5, flat: true }], 5);
  s += grid(HZ, H, 8, 16, (x, y) => grad([[0, '#F4D466'], [.45, '#E8BE4A'], [1, '#CF9030']], (y - HZ) / (H - HZ)), e.calm(HZ));
  for (let i = -12; i <= 12; i++) { const op = .04 + .17 * Math.min(1, Math.pow(Math.abs(i) / 7, 2)); s += `<line x1="${195 + i * 4}" y1="${HZ}" x2="${195 + i * 54}" y2="${H + 20}" stroke="#A8701E" stroke-width="2.5" opacity="${op.toFixed(2)}"/>`; }
  s += `<polygon points="${P([[0, HZ + 22], [96, HZ + 10], [96, HZ + 14], [0, HZ + 30]])}" fill="#8A5530" stroke="${DK}" stroke-width="2.5" stroke-linejoin="round"/>`;
  [6, 34, 62, 90].forEach(x => { const y = HZ + 26 - x * .13; s += `<polygon points="${P([[x - 3, y + 6], [x - 3, y - 16], [x, y - 20], [x + 3, y - 16], [x + 3, y + 6]])}" fill="#A8703E" stroke="${DK}" stroke-width="2.5" stroke-linejoin="round"/>`; });
  const bale = (x, y, r) => parts([{ p: [[x, y - r], [x + r * 1.4, y - r * .9], [x + r * 1.4, y + r * .9], [x, y + r]], c: '#D9A83A' }, { p: ngon(x, y, r * .78, r, 10), c: '#F0CC5E' }, { raw: `<polyline points="${P(Array.from({ length: 22 }, (_, i) => { const t = i * .6, rr = r * .06 * i * .5; return [x + Math.cos(t) * rr * .78, y + Math.sin(t) * rr]; }))}" fill="none" stroke="#B07A22" stroke-width="2.2" stroke-linecap="round"/>` }], 6);
  s += bale(338, HZ + 50, 14) + bale(22, 470, 26) + bale(344, 668, 30);
  const wheat = (x, y, k, n) => { const S = []; for (let i = 0; i < n; i++) { const dx = (i - (n - 1) / 2) * 9 * k + (rnd() - .5) * 6 * k, h = (58 + rnd() * 26) * k, lean = dx * .35 + (rnd() - .5) * 8 * k, b = [x + dx, y], t = [x + dx + lean, y - h]; S.push({ p: e.limb(b, t, 3.6 * k, 2.4 * k), c: '#C9922E', flat: true, sw: 2 }); S.push({ p: ngon(t[0], t[1] - 7 * k, 5.5 * k, 13 * k, 6, Math.PI / 2), c: i % 3 ? '#F5D76E' : '#EFC24E', sw: 2.5 }); } return parts(S, 5); };
  s += wheat(36, 420, .7, 5) + wheat(356, 440, .7, 5) + wheat(16, 590, 1, 5) + wheat(378, 590, 1, 5) + wheat(40, 730, 1.2, 6) + wheat(352, 760, 1.2, 6) + wheat(6, 850, 1.7, 5) + wheat(386, 850, 1.7, 5);
  s += edges(e, 16, 360, 830, (x, y, i) => i % 4 === 0 ? dot(e, x, y, 5, '#FF5A3C') : i % 4 === 1 ? dot(e, x, y, 4, '#5AA0C8') : blade(e, x, y, .8, '#9ACD32'));
  return wrap(s, `<clipPath id="hgc"><polygon points="${P(hill)}"/></clipPath>`);
}

// ================= FONTCLAIRE
function fontclaire() {
  const e = eng(23), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 340; let s = '';
  s += grid(0, HZ + 12, 6, 7, (x, y) => grad([[0, '#F4A383'], [.55, '#FFCB9C'], [1, '#FFEBC4']], y / HZ), () => .045);
  s += glow(312, 126, 64, 64, '#FFF3D2', .5) + parts([{ p: ngon(312, 126, 24, 24, 10, .2), c: '#FFE7A8', sil: false, sw: 3.5 }]);
  s += cloud(e, 92, 88, .8, '#FFF4EA') + cloud(e, 232, 54, .5, '#FFF4EA');
  s += parts([{ p: [[-10, HZ - 84], [60, HZ - 118], [140, HZ - 98], [210, HZ - 124], [290, HZ - 102], [350, HZ - 126], [400, HZ - 106], [400, HZ], [-10, HZ]], c: '#86C05E' }], 6);
  for (let x = 14; x < 390; x += 30 + rnd() * 10) s += pine(e, x, HZ - 90 + rnd() * 12, 26 + rnd() * 10, '#4E9A5A', '#3A7F4A', '#6B4428', 4);
  const house = (x, b, w, h, roof, big) => {
    const S = [], t = b - h, pk = t - w * .42; S.push({ p: [[x, t], [x + w, t], [x + w, b], [x, b]], c: '#F7F1E4' }); S.push({ p: [[x - 6, t + 3], [x + w / 2, pk], [x + w + 6, t + 3]], c: roof });
    const nw = big ? 2 : 1, rows = big ? 2 : 1, ww = w * (big ? .2 : .24), wh = ww * 1.25; let fl = '';
    for (let r = 0; r < rows; r++) for (let i = 0; i < nw; i++) {
      const wy = t + h * (big ? .14 + r * .3 : .2), wx = x + w * (nw === 1 ? .62 : .28 + i * .44) - ww / 2;
      S.push({ p: [[wx, wy], [wx + ww, wy], [wx + ww, wy + wh], [wx, wy + wh]], c: '#5AA0C8', sw: 2.5, flat: true });
      S.push({ p: [[wx - ww * .42, wy], [wx, wy], [wx, wy + wh], [wx - ww * .42, wy + wh]], c: '#3DA34A', sw: 2, flat: true });
      S.push({ p: [[wx + ww, wy], [wx + ww * 1.42, wy], [wx + ww * 1.42, wy + wh], [wx + ww, wy + wh]], c: '#3DA34A', sw: 2, flat: true });
      S.push({ p: [[wx - 2, wy + wh], [wx + ww + 2, wy + wh], [wx + ww, wy + wh + 5], [wx, wy + wh + 5]], c: '#8A5530', sw: 2, flat: true });
      for (let k = 0; k < 4; k++) fl += dot(e, wx + ww * (k + .5) / 4, wy + wh - 1, big ? 3.6 : 2.6, ['#FF7AA8', '#FFD23F', '#FF5A3C', '#FFFFFF'][(k + i + r) % 4]);
    }
    const dx = x + w * (big ? .4 : .14), dw = w * .22; S.push({ p: [[dx, b], [dx, b - h * .28], [dx + dw / 2, b - h * .34], [dx + dw, b - h * .28], [dx + dw, b]], c: '#8A5530', sw: 2.5 });
    S.push({ raw: fl }); return parts(S, 5);
  };
  const roofs = ['#D9622B', '#C4481F', '#E0662A', '#B8452A'];
  for (let x = 36, i = 0; x < 350; i++) { const w = 44 + rnd() * 18, h = 44 + rnd() * 30; s += house(x, HZ + 4, w, h, roofs[i % 4]); x += w - 2; }
  s += grid(HZ, H, 8, 16, (x, y) => grad([[0, '#9AD468'], [1, '#34A04C']], (y - HZ) / (H - HZ)), e.calm(HZ, .02, .16));
  const pl = ngon(195, 770, 190, 430, 24, Math.PI / 24);
  s += `<g clip-path="url(#fcp)">${grid(HZ, H, 8, 16, (x, y) => grad([[0, '#EADCC0'], [1, '#CBB184']], (y - HZ) / (H - HZ)), e.calm(HZ, .02, .2))}</g><polygon points="${P(pl)}" fill="none" stroke="${DK}" stroke-width="4" stroke-linejoin="round"/><polygon points="${P(ngon(195, 770, 180, 420, 24, Math.PI / 24))}" fill="none" stroke="#B89C6E" stroke-width="3" stroke-linejoin="round" opacity=".6"/>`;
  const cx = 195, b = HZ + 44, top = ngon(cx, b - 10, 64, 15, 16), fr = top.slice(0, 9);
  s += parts([{ p: [...fr, ...fr.map(p => [p[0], p[1] + 14]).reverse()], c: '#D8CAAE' }, { p: top, c: '#EFE5D0' }, { p: ngon(cx, b - 11, 52, 10, 16), c: '#7CC8E0', sw: 2.5 }, { p: [[cx - 7, b - 12], [cx + 7, b - 12], [cx + 5, b - 52], [cx - 5, b - 52]], c: '#E4D8C0' }, { p: [[cx - 27, b - 56], [cx + 27, b - 56], [cx + 14, b - 45], [cx - 14, b - 45]], c: '#E4D8C0' }, { p: ngon(cx, b - 56, 25, 5, 12), c: '#9ADBEE', sw: 2.5 }, { p: ngon(cx, b - 66, 5, 9, 6, Math.PI / 2), c: '#E4D8C0' },
    { raw: `<g fill="none" stroke-linecap="round"><path d="M${cx} ${b - 72} Q${cx + 26} ${b - 96} ${cx + 44} ${b - 16}" stroke="#BFEAF6" stroke-width="4"/><path d="M${cx} ${b - 72} Q${cx - 26} ${b - 96} ${cx - 44} ${b - 16}" stroke="#BFEAF6" stroke-width="4"/><path d="M${cx} ${b - 72} Q${cx + 12} ${b - 88} ${cx + 20} ${b - 54}" stroke="#FFFFFF" stroke-width="3"/><path d="M${cx} ${b - 72} Q${cx - 12} ${b - 88} ${cx - 20} ${b - 54}" stroke="#FFFFFF" stroke-width="3"/></g>` }], 6);
  s += `<polyline points="${P(e.cat([74, 300], [316, 292], 38))}" fill="none" stroke="${DK}" stroke-width="2.5"/>`;
  const bc = e.cat([74, 300], [316, 292], 38, 14); for (let i = 0; i < bc.length - 1; i++) { const a = bc[i], c = bc[i + 1]; s += `<polygon points="${P([a, c, [(a[0] + c[0]) / 2 + 1, (a[1] + c[1]) / 2 + 16]])}" fill="${['#FF5A3C', '#FFD23F', '#3DDC5B', '#FFFFFF', '#5AA0C8'][i % 5]}" stroke="${DK}" stroke-width="2.2" stroke-linejoin="round"/>`; }
  s += house(-26, 520, 104, 190, '#C4481F', true) + house(314, 540, 104, 200, '#D9622B', true);
  const fb = (x, y, r) => bush(e, x, y, r, '#4FB04C', '#3A9A48') + [0, 1, 2, 3, 4, 5].map(k => dot(e, x - r * .7 + rnd() * r * 1.6, y - r * .3 - rnd() * r * .9, 3.6, ['#FF7AA8', '#FFD23F', '#FFFFFF', '#FF5A3C'][k % 4])).join('');
  const pot = (x, y, r) => parts([{ p: [[x - r * .7, y - r * .9], [x + r * .7, y - r * .9], [x + r * .5, y], [x - r * .5, y]], c: '#D9622B' }], 5) + fb(x - r * .2, y - r * .8, r * .8);
  s += pot(92, 520, 20) + pot(300, 540, 20) + fb(10, 610, 26) + fb(372, 640, 28) + fb(24, 740, 34) + fb(356, 770, 36) + fb(-4, 850, 44) + fb(380, 856, 44);
  s += edges(e, 12, 560, 830, (x, y, i) => i % 3 ? blade(e, x, y, .8, '#9ACD32') : dot(e, x, y, 4, '#FF7AA8'));
  return wrap(s, `<clipPath id="fcp"><polygon points="${P(pl)}"/></clipPath>`);
}

// ================= VELIS TOITS
function velis_toits() {
  const e = eng(37), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 380; let s = '';
  s += grid(0, HZ + 12, 6, 8, (x, y) => grad([[0, '#221C44'], [.5, '#3B2E66'], [.82, '#6E4A7A'], [1, '#B8706A']], y / HZ), () => .05);
  for (let i = 0; i < 40; i++) { const x = rnd() * 390, y = 10 + rnd() * (HZ - 150); if (Math.hypot(x - 282, y - 158) < 110) continue; const r = 1.6 + rnd() * 3.4; s += `<polygon points="${P([[x, y - r], [x + r * .35, y], [x, y + r], [x - r * .35, y]])}" fill="#FFF1C2" opacity="${(.5 + rnd() * .5).toFixed(2)}"/><polygon points="${P([[x - r, y], [x, y - r * .35], [x + r, y], [x, y + r * .35]])}" fill="#FFF1C2" opacity=".6"/>`; }
  s += glow(282, 158, 160, 160, '#FFE9B0', .08) + glow(282, 158, 112, 112, '#FFE9B0', .14);
  s += parts([{ p: ngon(282, 158, 72, 72, 16, .1), c: '#FFF1C2' }, { p: ngon(258, 138, 15, 12, 7), c: '#EDDBA8', sil: false, sw: 2.5 }, { p: ngon(308, 180, 11, 9, 6), c: '#EDDBA8', sil: false, sw: 2.5 }, { p: ngon(292, 116, 7, 6, 6), c: '#EDDBA8', sil: false, sw: 2 }, { p: ngon(250, 186, 8, 7, 6), c: '#EDDBA8', sil: false, sw: 2 }], 8);
  for (let x = -10; x < 400;) { const w = 18 + rnd() * 26, h = 30 + rnd() * 64, b = HZ + 10, t = b - h, k = rnd(), S = []; const top = k < .45 ? [[x - 2, t], [x + w / 2, t - w * .5], [x + w + 2, t]] : k < .7 ? ngon(x + w / 2, t, w / 2, w * .4, 8).filter(p => p[1] <= t + .1) : null; S.push({ p: [[x, t], [x + w, t], [x + w, b], [x, b]], c: '#3A2F5E', flat: true, sw: 2 }); if (top) S.push({ p: top, c: '#2E2550', flat: true, sw: 2 }); let win = ''; for (let j = 0; j < 3; j++) if (rnd() < .6) win += `<rect x="${(x + 3 + rnd() * (w - 8)).toFixed(1)}" y="${(t + 6 + rnd() * (h - 14)).toFixed(1)}" width="3" height="4" fill="#FFC65A"/>`; S.push({ raw: win }); s += parts(S, 4); x += w - 2; }
  s += parts([{ p: [[34, HZ + 6], [72, HZ + 6], [72, 216], [34, 216]], c: '#4A3C6E' }, { p: [[28, 218], [53, 148], [78, 218]], c: '#7A4A5A' }, { p: [[46, 236], [60, 236], [60, 256], [53, 262], [46, 256]], c: '#FFC65A', sw: 2.5, flat: true }], 6);
  const dome = ngon(336, 268, 30, 30, 20).filter(p => p[1] <= 268.1);
  s += parts([{ p: [[306, HZ + 6], [366, HZ + 6], [366, 268], [306, 268]], c: '#4E3F72' }, { p: dome, c: '#7A5A8E' }, { p: [[333, 238], [336, 214], [339, 238]], c: '#FFD23F', sw: 2.5 }, { p: [[326, 300], [346, 300], [346, 326], [326, 326]], c: '#FFC65A', sw: 2.5, flat: true }], 6);
  const mid = [[-14, 70, 78], [52, 64, 58], [110, 58, 44], [164, 60, 40], [222, 58, 46], [276, 64, 60], [334, 72, 80]];
  for (const [x, w, h] of mid) { const b = HZ + 14, t = b - h; let wn = ''; const nwin = Math.max(1, Math.round(w / 34)); for (let i = 0; i < nwin; i++) { const wx = x + w * (i + .5) / nwin - 6; wn += `<g><polygon points="${P(ngon(wx + 6, t + h * .45, 16, 16, 10))}" fill="#FFC65A" opacity=".18"/><rect x="${wx.toFixed(1)}" y="${(t + h * .32).toFixed(1)}" width="12" height="15" fill="#FFC65A" stroke="${DK}" stroke-width="2.5"/></g>`; } s += parts([{ p: [[x, t], [x + w, t], [x + w, b], [x, b]], c: '#54416E' }, { p: [[x - 6, t + 2], [x + w / 2, t - w * .38], [x + w + 6, t + 2]], c: '#8A4A4A' }, { raw: wn }], 5); }
  const lant = (pts, every, col) => { let o = `<polyline points="${P(pts)}" fill="none" stroke="${DK}" stroke-width="2.5"/>`; for (let i = 2; i < pts.length - 1; i += every) { const [x, y] = pts[i]; o += `<polygon points="${P(ngon(x, y + 12, 22, 22, 12))}" fill="#FFD23F" opacity=".28"/>` + `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 4}" stroke="${DK}" stroke-width="2"/>` + e.parts([{ p: ngon(x, y + 13, 8, 10, 6, Math.PI / 2), c: col, sw: 2.5 }, { p: [[x - 5, y + 3], [x + 5, y + 3], [x + 4, y + 6], [x - 4, y + 6]], c: '#3B2A1E', sw: 2, flat: true }], 4); } return o; };
  s += lant(e.cat([-6, 236], [396, 262], 56, 26), 3, '#FF8C32') + lant(e.cat([-6, 312], [396, 296], 34, 26), 4, '#FF5A3C');
  s += grid(HZ, H, 8, 16, (x, y) => grad([[0, '#8E5446'], [.5, '#7A4440'], [1, '#5E3438']], (y - HZ) / (H - HZ)), e.calm(HZ, .02, .16));
  s += glow(282, HZ + 150, 120, 50, '#FFE9B0', .06);
  for (let y = HZ + 30, r = 0; y < H; y += 32, r++) for (const [a, b] of [[-10, 78], [312, 400]]) { let d = ''; for (let x = a + (r % 2) * 11; x < b; x += 22) d += `M${x} ${y} q11 12 22 0 `; s += `<path d="${d}" fill="none" stroke="#3E2226" stroke-width="2.4" opacity=".35"/>`; }
  s += parts([{ p: [[12, 650], [54, 650], [54, 510], [12, 510]], c: '#A2584A' }, { p: [[6, 498], [60, 498], [60, 512], [6, 512]], c: '#6E3A34' }, { raw: `<g stroke="#6E3A34" stroke-width="2" opacity=".6"><line x1="12" y1="550" x2="54" y2="550"/><line x1="12" y1="590" x2="54" y2="590"/><line x1="33" y1="512" x2="33" y2="550"/><line x1="24" y1="550" x2="24" y2="590"/><line x1="44" y1="590" x2="44" y2="630"/></g>` }], 6);
  s += parts([{ p: ngon(34, 474, 14, 11, 7), c: '#8C7FA6', sil: false, o: .7, sw: 2.5 }, { p: ngon(44, 446, 18, 14, 7), c: '#8C7FA6', sil: false, o: .55, sw: 2.5 }, { p: ngon(36, 412, 22, 16, 7), c: '#8C7FA6', sil: false, o: .4, sw: 2.5 }]);
  s += parts([{ p: [[338, 566], [378, 566], [378, 452], [338, 452]], c: '#A2584A' }, { p: [[332, 440], [384, 440], [384, 454], [332, 454]], c: '#6E3A34' }], 6);
  s += `<polygon points="${P(ngon(374, 600, 36, 36, 12))}" fill="#FFD23F" opacity=".22"/>` + parts([{ p: e.limb([374, 720], [374, 610], 7, 6), c: '#2E2550' }, { p: ngon(374, 600, 11, 14, 6, Math.PI / 2), c: '#FFC65A', sw: 3 }, { p: [[364, 588], [384, 588], [374, 578]], c: '#2E2550', sw: 2.5 }], 5);
  const pot = (x, y, r) => parts([{ p: [[x - r * .7, y - r * .9], [x + r * .7, y - r * .9], [x + r * .5, y], [x - r * .5, y]], c: '#C4481F' }], 5) + bush(e, x - r * .2, y - r * .8, r * .85, '#3FA85A', '#2E8A4A');
  s += pot(36, 790, 30) + pot(352, 820, 34) + pot(356, 760, 20);
  return wrap(s);
}

// ================= AUBELLE BIBLIO
function aubelle_biblio() {
  const e = eng(41), { grid, parts, ngon, P, rnd, glow, grad } = e, FL = 410; let s = '';
  const BK = ['#C4481F', '#1F7A3D', '#FFD23F', '#3E5A8A', '#8A3B22', '#E0662A', '#5B3B6E', '#9ACD32', '#F3E6C8'];
  const shelf = (x0, x1, y0, y1, cw, rh) => { let o = ''; for (let y = y0; y < y1 - 4; y += rh) for (let x = x0; x < x1; x += cw) { const w = Math.min(cw, x1 - x); o += `<rect x="${x}" y="${y.toFixed(1)}" width="${w}" height="${rh.toFixed(1)}" fill="#3B2A1E"/>`; let bx = x + 5; while (bx < x + w - 8) { const bw = 4 + rnd() * 5, bh = rh * (.5 + rnd() * .34); if (rnd() < .07) { bx += bw + 3; continue; } const c = BK[Math.floor(rnd() * BK.length)], ln = rnd() < .06 ? 5 : 0, yb = y + rh - 4; o += `<polygon points="${P([[bx, yb], [bx + bw, yb], [bx + bw + ln, yb - bh], [bx + ln, yb - bh]])}" fill="${c}" stroke="${DK}" stroke-width="1.3" stroke-linejoin="round"/>`; if (rnd() < .4) o += `<line x1="${(bx + .5).toFixed(1)}" y1="${(yb - bh * .75).toFixed(1)}" x2="${(bx + bw - .5).toFixed(1)}" y2="${(yb - bh * .75).toFixed(1)}" stroke="#FFD23F" stroke-width="1.4"/>`; bx += bw + .6; } } for (let y = y0; y < y1 - 4; y += rh) o += `<rect x="${x0 - 3}" y="${(y + rh - 5).toFixed(1)}" width="${x1 - x0 + 6}" height="7" fill="#8A5530" stroke="${DK}" stroke-width="2"/>`; for (let x = x0; x <= x1; x += cw) o += `<rect x="${x - 3}" y="${y0}" width="6" height="${y1 - y0}" fill="#7A4A2A" stroke="${DK}" stroke-width="2"/>`; return o; };
  s += `<rect width="390" height="${FL + 10}" fill="#4A2E1C"/>`;
  s += shelf(36, 354, -12, FL, 53, (FL + 12) / 9);
  s += `<polygon points="${P([[0, 0], [36, 0], [36, FL], [0, FL + 44]])}" fill="#3B2418" stroke="${DK}" stroke-width="3"/><polygon points="${P([[390, 0], [354, 0], [354, FL], [390, FL + 44]])}" fill="#3B2418" stroke="${DK}" stroke-width="3"/>`;
  for (let i = 0; i < 9; i++) { const y = -12 + (i + 1) * (FL + 12) / 9; s += `<line x1="0" y1="${(y + i * 4.4).toFixed(1)}" x2="36" y2="${y.toFixed(1)}" stroke="#8A5530" stroke-width="5"/><line x1="390" y1="${(y + i * 4.4).toFixed(1)}" x2="354" y2="${y.toFixed(1)}" stroke="#8A5530" stroke-width="5"/>`; }
  s += glow(195, 112, 150, 150, '#FFE59A', .22) + glow(195, 112, 104, 104, '#FFE59A', .3);
  let petals = ''; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, b = a + Math.PI / 6; petals += `<polygon points="${P([[195, 112], [195 + Math.cos(a) * 58, 112 + Math.sin(a) * 58], [195 + Math.cos(b) * 58, 112 + Math.sin(b) * 58]])}" fill="${i % 2 ? '#FFD23F' : '#FFF1C2'}" stroke="#8A5530" stroke-width="3" stroke-linejoin="round"/>`; }
  s += parts([{ p: ngon(195, 112, 74, 74, 16, .1), c: '#8A5530' }, { raw: petals }, { p: ngon(195, 112, 14, 14, 8), c: '#FF8C32', sw: 3 }], 8);
  s += grid(FL, H, 8, 14, (x, y) => grad([[0, '#B8804A'], [1, '#8A5A34']], (y - FL) / (H - FL)), e.calm(FL, .02, .14));
  for (let i = -9; i <= 9; i++) { if (Math.abs(i) < 5) continue; s += `<line x1="${195 + i * 20}" y1="${FL}" x2="${195 + i * 60}" y2="${H}" stroke="#5C3A22" stroke-width="2.2" opacity=".35"/>`; }
  s += `<rect x="0" y="${FL - 4}" width="390" height="10" fill="#2E1E14" stroke="${DK}" stroke-width="2"/>`;
  const rug = ngon(195, 660, 178, 176, 20, .15);
  s += parts([{ p: rug, c: '#FFD23F', flat: true }, { p: ngon(195, 660, 164, 162, 20, .15), c: '#2E8A4A', flat: true, sil: false }]) + `<polygon points="${P(ngon(195, 660, 146, 144, 20, .15))}" fill="none" stroke="#FFD23F" stroke-width="3" opacity=".5" stroke-dasharray="10 8"/>`;
  s += `<polygon points="${P([[176, 150], [214, 150], [300, 780], [150, 780]])}" fill="#FFF1C2" opacity=".1"/><polygon points="${P([[196, 146], [228, 156], [356, 690], [276, 720]])}" fill="#FFF1C2" opacity=".07"/>`;
  s += `<g>${e.line([[262, FL + 4], [296, 118]], '#A8703E', 5, 4)}${e.line([[286, FL + 4], [320, 118]], '#A8703E', 5, 4)}${Array.from({ length: 11 }, (_, i) => { const t = (i + .5) / 11; return e.line([[262 + 34 * t, FL + 4 - (FL - 114) * t], [286 + 34 * t, FL + 4 - (FL - 114) * t]], '#C98A4E', 3.5, 3); }).join('')}</g>`;
  s += shelf(-2, 32, 96, H + 20, 34, 62) + `<rect x="30" y="92" width="8" height="${H}" fill="#7A4A2A" stroke="${DK}" stroke-width="3"/>`;
  s += shelf(358, 392, 96, H + 20, 34, 62) + `<rect x="352" y="92" width="8" height="${H}" fill="#7A4A2A" stroke="${DK}" stroke-width="3"/>`;
  s += `<rect x="-4" y="80" width="46" height="16" fill="#8A5530" stroke="${DK}" stroke-width="3"/><rect x="348" y="80" width="46" height="16" fill="#8A5530" stroke="${DK}" stroke-width="3"/>`;
  const pot = (x, y, r) => parts([{ p: [[x - r * .7, y - r * .9], [x + r * .7, y - r * .9], [x + r * .5, y], [x - r * .5, y]], c: '#C4481F' }], 5) + bush(e, x - r * .2, y - r * .8, r * .9, '#3FA85A', '#2E8A4A');
  s += pot(60, 836, 34) + pot(338, 842, 36) + bush(e, 20, 90, 16, '#3FA85A', '#2E8A4A') + bush(e, 366, 90, 16, '#3FA85A', '#2E8A4A');
  [[92, 218, -20, 1.1, 1], [140, 262, 14, .8, .7], [256, 236, -10, 1.1, .35], [316, 186, 25, .85, 0], [60, 330, -28, 1, .8], [340, 318, 18, 1, .4], [80, 470, 12, 1.2, .25], [318, 510, -16, 1.2, 0], [112, 170, 30, .7, .6], [238, 292, 6, .7, .15], [352, 424, -8, .9, .05], [34, 560, 20, .9, .5]].forEach(a => s += page(e, ...a));
  return wrap(s);
}

// ================= COL DES VENTS
function col_vents() {
  const e = eng(53), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 384; let s = '';
  s += grid(0, HZ + 12, 6, 8, (x, y) => grad([[0, '#79BFE6'], [.6, '#C4E4EE'], [1, '#FFE3B4']], y / HZ), () => .045);
  s += glow(92, 96, 60, 60, '#FFF6D0', .45) + parts([{ p: ngon(92, 96, 22, 22, 10), c: '#FFE59A', sil: false, sw: 3.5 }]);
  const cap = (pts, i, f) => { const p = pts[i], a = pts[i - 1], b = pts[i + 1], L = [p[0] + (a[0] - p[0]) * f, p[1] + (a[1] - p[1]) * f], R = [p[0] + (b[0] - p[0]) * f, p[1] + (b[1] - p[1]) * f], my = (L[1] + R[1]) / 2; return [p, R, [p[0] + (R[0] - p[0]) * .55, my - (my - p[1]) * .3], [p[0] + (R[0] - p[0]) * .1, my + 6], [p[0] + (L[0] - p[0]) * .45, my - (my - p[1]) * .25], L]; };
  const range = (pts, c, f, lim, ol) => { const S = [{ p: pts, c }]; for (let i = 1; i < pts.length - 3; i++) if (pts[i][1] < pts[i - 1][1] && pts[i][1] < pts[i + 1][1] && pts[i][1] < lim) S.push({ p: cap(pts, i, f), c: '#F6F8FF', sw: 2.5, sil: false }); return parts(S, ol); };
  s += range([[-10, 300], [34, 164], [80, 232], [132, 150], [176, 252], [195, 272], [214, 250], [262, 136], [312, 222], [362, 112], [400, 200], [400, HZ + 10], [-10, HZ + 10]], '#9DA9C9', .36, 260, 6);
  s += `<g fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" opacity=".75"><path d="M18 196 q40 -14 80 -2 t70 -4"/><path d="M226 88 q34 -12 70 0 t56 -4"/><path d="M150 214 q28 -10 58 0"/><path d="M300 176 q24 -8 48 0 t44 0"/></g>`;
  s += range([[-10, 330], [42, 232], [100, 312], [150, 300], [195, 338], [240, 300], [300, 262], [352, 198], [400, 282], [400, HZ + 16], [-10, HZ + 16]], '#6E9A6A', .32, 250, 6);
  s += pine(e, 128, 318, 40, '#4E9A5A', '#3A7F4A') + pine(e, 270, 300, 44, '#4E9A5A', '#3A7F4A') + pine(e, 300, 296, 36, '#4E9A5A', '#3A7F4A');
  s += grid(HZ, H, 8, 16, (x, y) => grad([[0, '#A9D06A'], [.5, '#5DB84E'], [1, '#2F9A48']], (y - HZ) / (H - HZ)), e.calm(HZ, .02, .16));
  s += `<polygon points="${P([[186, HZ], [204, HZ], [262, H], [128, H]])}" fill="#E8D7A8" opacity=".22"/>`;
  const flag = (px, py, L, h, c1, c2) => { const top = [], bot = []; const n = 7; for (let i = 0; i <= n; i++) { const x = px + L * i / n, yt = py + Math.sin(i * 1.25) * 5 + i * 1.4, hh = h * (1 - i / n * .3); top.push([x, yt]); bot.push([x, yt + hh]); } const tip = [px + L - 10, top[n][1] + h * .38]; const mt = top.map((p, i) => [p[0], p[1] + h * (1 - i / n * .3) * .38]), mb = top.map((p, i) => [p[0], p[1] + h * (1 - i / n * .3) * .62]); return parts([{ p: [...top, tip, ...bot.reverse()], c: c1 }, { p: [...mt, ...mb.slice().reverse()], c: c2, sil: false, sw: 2, flat: true }], 6); };
  s += e.line([[46, 474], [46, 244]], '#8A5530', 6, 5) + flag(49, 248, 78, 34, '#FF5A3C', '#FFD23F') + parts([{ p: ngon(46, 240, 6, 6, 6), c: '#FFD23F' }], 4);
  s += e.line([[352, 462], [352, 226]], '#8A5530', 6, 5) + flag(355, 230, 70, 30, '#3E5A8A', '#FFFFFF') + parts([{ p: ngon(352, 222, 6, 6, 6), c: '#FFD23F' }], 4);
  const pc = e.cat([48, 262], [352, 242], 46, 16); s += `<polyline points="${P(pc)}" fill="none" stroke="${DK}" stroke-width="2.5"/>`;
  for (let i = 0; i < pc.length - 1; i++) { const a = pc[i], c = pc[i + 1]; s += `<polygon points="${P([a, c, [(a[0] + c[0]) / 2 + 7, (a[1] + c[1]) / 2 + 18]])}" fill="${['#FF5A3C', '#FFD23F', '#3DDC5B', '#FFFFFF', '#5AA0C8'][i % 5]}" stroke="${DK}" stroke-width="2.2" stroke-linejoin="round"/>`; }
  const snowrock = (x, y, r) => rock(e, x, y, r, '#9A9AA2') + `<polygon points="${P([[x - r * .7, y - r * .7], [x - r * .1, y - r * 1.05], [x + r * .6, y - r * .8], [x + r * .2, y - r * .6]])}" fill="#F6F8FF" stroke="${DK}" stroke-width="2.2" stroke-linejoin="round"/>`;
  s += pine(e, 8, 610, 150) + pine(e, 384, 566, 136) + snowrock(26, 500, 22) + snowrock(366, 486, 18) + snowrock(360, 700, 30) + snowrock(20, 800, 34);
  s += parts([{ p: ngon(46, 720, 24, 12, 7), c: '#A2988A' }, { p: ngon(44, 700, 18, 10, 7), c: '#B8AE9E' }, { p: ngon(48, 684, 13, 8, 6), c: '#A2988A' }, { p: ngon(46, 671, 8, 6, 6), c: '#C8BEAE' }], 6);
  s += edges(e, 22, 420, 840, (x, y, i) => i % 5 === 0 ? dot(e, x, y, 4, '#FFFFFF') : blade(e, x, y, .85, '#9ACD32'));
  s += `<g fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".5"><path d="M4 560 q24 -8 50 0"/><path d="M340 620 q22 -8 46 0"/></g>`;
  return wrap(s);
}

// ================= ECOLE EN RUINES
function ecole_ruines() {
  const e = eng(67), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 330; let s = '';
  s += grid(0, HZ + 12, 6, 7, (x, y) => grad([[0, '#F2915A'], [.55, '#FFC07A'], [1, '#FFE3A6']], y / HZ), () => .05);
  s += glow(306, 118, 64, 64, '#FFF1C2', .45) + parts([{ p: ngon(306, 118, 26, 26, 10, .2), c: '#FFE59A', sil: false, sw: 3.5 }]);
  s += cloud(e, 90, 70, .7, '#FFE9CF');
  s += parts([{ p: [[-6, HZ - 34], [60, HZ - 56], [130, HZ - 40], [200, HZ - 62], [270, HZ - 44], [330, HZ - 60], [396, HZ - 46], [396, HZ + 14], [-6, HZ + 14]], c: '#8DB86A' }], 6);
  const wall = [[66, 214], [96, 198], [138, 206], [168, 190], [210, 198], [250, 186], [290, 202], [324, 212], [324, HZ + 6], [66, HZ + 6]];
  let nm = ''; for (let y = 224, r = 0; y < HZ; y += 12, r++) { let x = 76 + (r % 2) * 6; while (x < 312) { const l = 10 + rnd() * 22; if (x + l > 314) break; const topY = y > 214 || x > 90; nm += `<line x1="${x.toFixed(1)}" y1="${y}" x2="${(x + l).toFixed(1)}" y2="${y}" stroke="#6E5F48" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>`; x += l + 6; } }
  let mo = ''; for (let y = 236; y < HZ; y += 24) mo += `<line x1="66" y1="${y}" x2="324" y2="${y}" stroke="${DK}" stroke-width="1.5" opacity=".25"/>`;
  s += parts([{ p: wall, c: '#CDBE9E', flat: true }, { raw: `<g clip-path="url(#erw)">${mo}${nm}</g>` }], 7);
  const ivy = (x, y, n, dir) => { const S = []; for (let i = 0; i < n; i++) S.push({ p: ngon(x + dir * (i % 2) * 8 + (rnd() - .5) * 6, y + i * 11, 8 + rnd() * 3, 7, 6, rnd()), c: i % 2 ? '#3FA85A' : '#5DBA4F', sw: 2.5 }); return parts(S, 4); };
  s += ivy(74, 210, 6, 1) + ivy(316, 214, 7, -1) + ivy(170, 194, 3, 1);
  s += grid(HZ, H, 8, 16, (x, y) => grad([[0, '#9AD468'], [1, '#2FA24A']], (y - HZ) / (H - HZ)), e.calm(HZ, .02, .16));
  const arch = (a0, a1) => { const o = [], i = []; for (let k = 0; k <= 8; k++) { const a = a0 + (a1 - a0) * k / 8; o.push([195 + Math.cos(a) * 178, 176 + Math.sin(a) * 178]); i.push([195 + Math.cos(a) * 146, 176 + Math.sin(a) * 146]); } const last = o[8], li = i[8]; return [...o, [last[0] + (li[0] - last[0]) * .4 + 8, (last[1] + li[1]) / 2 + 6], ...i.reverse()]; };
  const vous = (a0, a1) => { let o = ''; for (let k = 1; k < 8; k++) { const a = a0 + (a1 - a0) * k / 8; o += `<line x1="${(195 + Math.cos(a) * 178).toFixed(1)}" y1="${(176 + Math.sin(a) * 178).toFixed(1)}" x2="${(195 + Math.cos(a) * 146).toFixed(1)}" y2="${(176 + Math.sin(a) * 146).toFixed(1)}" stroke="${DK}" stroke-width="2.5"/>`; } return o; };
  s += parts([{ p: arch(Math.PI * 1.02, Math.PI * 1.3), c: '#BFAF8E' }, { raw: vous(Math.PI * 1.02, Math.PI * 1.3) }], 7);
  s += parts([{ p: arch(Math.PI * 1.98, Math.PI * 1.72), c: '#BFAF8E' }, { raw: vous(Math.PI * 1.98, Math.PI * 1.72) }], 7);
  const sym = (x, y, r, kind, glowOp = .35) => kind === 't' ? `<polygon points="${P([[x, y - r], [x + r * .9, y + r * .6], [x - r * .9, y + r * .6]])}" fill="#FFD23F" fill-opacity="${glowOp}" stroke="#6E5F48" stroke-width="3" stroke-linejoin="round"/>` : `<polygon points="${P(ngon(x, y, r, r, 10))}" fill="#FFD23F" fill-opacity="${glowOp}" stroke="#6E5F48" stroke-width="3" stroke-linejoin="round"/>`;
  const col = (x, w, top, base, broken, sy) => { const t = broken ? [[x, top + 10], [x + w * .3, top], [x + w * .55, top + 14], [x + w * .8, top + 4], [x + w, top + 12]] : [[x, top], [x + w, top]]; const S = [{ p: [...t, [x + w, base], [x, base]], c: '#D6C8A8', flat: true }]; let fl = ''; for (let k = 1; k < 4; k++) fl += `<line x1="${x + w * k / 4}" y1="${top + 16}" x2="${x + w * k / 4}" y2="${base - 20}" stroke="${DK}" stroke-width="2" opacity=".3"/>`; S.push({ raw: fl }); if (!broken) S.push({ p: [[x - 8, top - 14], [x + w + 8, top - 14], [x + w + 4, top + 2], [x - 4, top + 2]], c: '#C8B894' }); S.push({ p: [[x - 8, base - 18], [x + w + 8, base - 18], [x + w + 8, base], [x - 8, base]], c: '#C8B894' }); if (sy) S.push({ raw: sym(x + w / 2, base - 48, w * .26, sy) }); return parts(S, 7); };
  s += col(84, 26, 280, 410, true) + col(282, 28, 262, 400, true, 'c');
  s += col(8, 40, 160, 540, false, 't') + col(338, 44, 150, 560, false, 'c');
  s += ivy(14, 180, 5, 1) + ivy(368, 170, 4, -1) + ivy(342, 460, 4, 1);
  const block = (x, y, w, h, sy) => parts([{ p: [[x, y - h], [x + w * .2, y - h - h * .35], [x + w * 1.2, y - h - h * .35], [x + w, y - h]], c: '#DDD0B2' }, { p: [[x, y - h], [x + w, y - h], [x + w, y], [x, y]], c: '#C8B894' }, { p: [[x + w, y - h], [x + w * 1.2, y - h - h * .35], [x + w * 1.2, y - h * .35], [x + w, y]], c: '#A89A7A' }, { raw: sy ? sym(x + w / 2, y - h / 2, h * .28, sy, .5) : '' }], 7);
  s += block(-10, 630, 64, 48, 't') + block(334, 700, 50, 44, 'c') + block(10, 820, 78, 58, 'c') + block(300, 850, 92, 64, 't');
  s += edges(e, 10, 560, 840, (x, y) => `<polygon points="${P(ngon(x, y, 14, 6, 6, rnd()))}" fill="#C8B894" stroke="${DK}" stroke-width="2.5" stroke-linejoin="round"/>`);
  s += bush(e, 60, 560, 16) + bush(e, 322, 600, 18) + edges(e, 16, 400, 840, (x, y) => blade(e, x, y, .85, '#9ACD32'));
  return wrap(s, `<clipPath id="erw"><polygon points="${P(wall)}"/></clipPath>`);
}

// ================= CŒUR DU SILENCE (+ guéri)
function coeur(healed) {
  const pal = healed ? { ol: DK, sky: [[0, '#F2915A'], [.55, '#FFC07A'], [1, '#FFE3A6']], gr: [[0, '#9AD468'], [.5, '#4FB04C'], [1, '#2FA24A']], tA: '#3FA85A', tB: '#2E8A4A', tr: '#6B4428', st: '#C8B894', ridge: '#8DB86A', sym: '#FFD23F', page: '#FFF6DA', ink: '#6B4428', words: 1, tuft: '#9ACD32' }
    : { ol: '#5C566B', sky: [[0, '#DDD9E4'], [.55, '#EEECF2'], [1, '#FAF9FC']], gr: [[0, '#F1EFF4'], [.5, '#DEDAE4'], [1, '#C9C4D2']], tA: '#F2F0F6', tB: '#DCD8E2', tr: '#C9C3D2', st: '#E6E2EB', ridge: '#E2DFE8', sym: '#B8B2C4', page: '#FFFFFF', ink: '#B8B2C4', words: 0, tuft: '#D6D2DE' };
  const e = eng(healed ? 79 : 79, pal.ol), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 322; let s = '';
  s += grid(0, HZ + 12, 6, 8, (x, y) => grad(pal.sky, y / HZ), () => healed ? .05 : .035);
  const cx = 195, cy = 176;
  for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 + (i - 6.5) * .24, a2 = a + .07; s += `<polygon points="${P([[cx, cy], [cx + Math.cos(a) * 420, cy + Math.sin(a) * 420], [cx + Math.cos(a2) * 420, cy + Math.sin(a2) * 420]])}" fill="${healed ? '#FFF1C2' : '#FFFFFF'}" opacity="${healed ? .22 : .5}"/>`; }
  s += glow(cx, cy, 170, 170, healed ? '#FFE9B0' : '#FFFFFF', healed ? .3 : .6) + glow(cx, cy, 120, 120, healed ? '#FFF1C2' : '#FFFFFF', healed ? .4 : .7);
  if (healed) s += parts([{ p: ngon(cx, cy, 62, 62, 14, .1), c: '#FFE59A', sw: 3.5 }], 8);
  else {
    s += parts([{ p: ngon(cx, cy, 72, 72, 18, .1), c: '#FFFFFF', flat: true }, { p: ngon(cx, cy, 52, 52, 18, .1), c: '#E9E6EF', sw: 3 }], 8);
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + .3, r = 96 + (i % 3) * 16, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * .9, k = 5 + (i % 3) * 3; s += `<polygon points="${P([[x, y - k], [x + k * .8, y + k * .6], [x - k * .7, y + k * .5]])}" fill="#FFFFFF" stroke="${pal.ol}" stroke-width="2.4" stroke-linejoin="round"/>`; }
  }
  s += parts([{ p: [[-6, HZ - 30], [60, HZ - 48], [130, HZ - 36], [195, HZ - 52], [262, HZ - 36], [330, HZ - 50], [396, HZ - 34], [396, HZ + 14], [-6, HZ + 14]], c: pal.ridge }], 6);
  for (let x = -6; x < 400; x += 26) s += pine(e, x + (rnd() - .5) * 8, HZ + 4 + rnd() * 6, 34 + rnd() * 18, pal.tA, pal.tB, pal.tr, 5);
  s += grid(HZ, H, 8, 16, (x, y) => grad(pal.gr, (y - HZ) / (H - HZ)), e.calm(HZ, .02, healed ? .16 : .12));
  s += glow(cx, 600, 200, 250, '#FFFFFF', healed ? .04 : .12);
  const stones = [[40, HZ + 40, 30, 88, 't'], [96, HZ + 20, 22, 60, 'c'], [146, HZ + 10, 16, 44, 'd'], [244, HZ + 10, 16, 44, 't'], [294, HZ + 20, 22, 60, 'c'], [350, HZ + 40, 30, 88, 'd']];
  for (const [x, b, w, h, k] of stones) {
    const S = [{ p: [[x - w, b], [x - w * .9, b - h * .8], [x - w * .3, b - h], [x + w * .5, b - h * .94], [x + w, b - h * .7], [x + w * .95, b]], c: pal.st }];
    const r = w * .38, y = b - h * .55, sy = k === 't' ? [[x, y - r], [x + r * .9, y + r * .6], [x - r * .9, y + r * .6]] : k === 'c' ? ngon(x, y, r, r, 10) : ngon(x, y, r * .45, r * .45, 8);
    if (healed) S.push({ raw: `<polygon points="${P(ngon(x, y, r * 2, r * 2, 12))}" fill="#FFD23F" opacity=".3"/>` });
    S.push({ raw: `<polygon points="${P(sy)}" fill="${healed ? '#FFD23F' : 'none'}" stroke="${healed ? DK : pal.sym}" stroke-width="3" stroke-linejoin="round" ${healed ? '' : 'stroke-dasharray="5 4"'}/>` });
    s += parts(S, 7);
  }
  const bigTree = (side) => { const m = side < 0 ? (x => x) : (x => 390 - x); const S = []; S.push({ p: [[m(-20), H + 10], [m(46), H + 10], [m(38), 560], [m(52), 300], [m(84), 120], [m(64), 110], [m(20), 290], [m(-20), 520]].map(p => p), c: pal.tr }); S.push({ p: [[m(40), 330], [m(96), 250], [m(104), 262], [m(52), 350]], c: pal.tr }); [[48, 64, 66, 54], [0, 30, 62, 58], [16, 164, 54, 48], [92, 124, 38, 30], [104, 24, 40, 32], [96, 252, 26, 21]].forEach(([x, y, rx, ry], i) => S.push({ p: ngon(m(x), y, rx, ry, 8, i * .4), c: i % 2 ? pal.tA : pal.tB })); return parts(S, 8); };
  s += bigTree(-1) + bigTree(1);
  if (healed) s += edges(e, 16, 120, 300, (x, y, i) => dot(e, x < 195 ? x + 40 : x - 40, y, 4.5, ['#FF5A3C', '#FFD23F', '#FF8C32', '#FFFFFF'][i % 4]));
  [[92, 290, -24, 1.5], [300, 280, 22, 1.4], [128, 86, 16, 1.1], [270, 70, -14, 1.2], [58, 420, -10, 1.1], [336, 440, 28, 1], [196, 44, 4, .8], [150, 250, 36, .75], [248, 244, -30, .8], [30, 540, 14, .9], [362, 560, -18, .9]].forEach(([x, y, r, k], i) => s += page(e, x, y, r, k, healed ? .95 : 0, pal.page, pal.ink));
  if (!healed) for (let i = 0; i < 20; i++) { const x = 60 + rnd() * 270, y = 40 + rnd() * 300, k = 2 + rnd() * 4; s += `<polygon points="${P([[x, y - k], [x + k, y], [x, y + k * .8], [x - k * .8, y]])}" fill="#FFFFFF" stroke="${pal.ol}" stroke-width="1.6" opacity=".85"/>`; }
  s += edges(e, 24, 560, 840, (x, y, i) => healed && i % 4 === 0 ? dot(e, x, y, 4.5, ['#FF7AA8', '#FFD23F', '#FFFFFF'][i % 3]) : blade(e, x, y, .9, pal.tuft));
  s += bush(e, 70, 780, 26, healed ? '#5DBA4F' : '#EEEBF2', healed ? '#4AA548' : '#DCD8E2') + bush(e, 316, 816, 30, healed ? '#5DBA4F' : '#EEEBF2', healed ? '#4AA548' : '#DCD8E2');
  return wrap(s);
}


// ================= PARTIE 2 — helpers
const mist = (e, y, h, col, op, ph = 0) => { const pts = []; for (let x = -20; x <= 410; x += 32) pts.push([x, y + Math.sin(x * .028 + ph) * 9 + (e.rnd() - .5) * 8]); return '<g opacity="' + op + '">' + e.parts([{ p: [...pts, [410, y + h], [-20, y + h]], c: col, sil: false, sw: 0 }]) + '<polyline points="' + e.P(pts) + '" fill="none" stroke="' + e.OL + '" stroke-width="2.5" stroke-linejoin="round" opacity=".6"/></g>'; };
const sym = (e, x, y, r, k, col = '#FFD23F', op = .4, ink = '#5C4F3E') => { const pts = k === 't' ? [[x, y - r], [x + r * .9, y + r * .6], [x - r * .9, y + r * .6]] : e.ngon(x, y, r, r, 10); return '<polygon points="' + e.P(pts) + '" fill="' + col + '" fill-opacity="' + op + '" stroke="' + ink + '" stroke-width="3" stroke-linejoin="round"/>'; };
const ranged = (e, pts, c, f, lim, ol, snow = '#F6F8FF') => { const cap = (i) => { const p = pts[i], a = pts[i - 1], b = pts[i + 1], L = [p[0] + (a[0] - p[0]) * f, p[1] + (a[1] - p[1]) * f], R = [p[0] + (b[0] - p[0]) * f, p[1] + (b[1] - p[1]) * f], my = (L[1] + R[1]) / 2; return [p, R, [p[0] + (R[0] - p[0]) * .55, my - (my - p[1]) * .3], [p[0] + (R[0] - p[0]) * .1, my + 6], [p[0] + (L[0] - p[0]) * .45, my - (my - p[1]) * .25], L]; }; const S = [{ p: pts, c }]; for (let i = 1; i < pts.length - 3; i++) if (pts[i][1] < pts[i - 1][1] && pts[i][1] < pts[i + 1][1] && pts[i][1] < lim) S.push({ p: cap(i), c: snow, sw: 2.5, sil: false }); return e.parts(S, ol); };
const stoneHouse = (e, x, b, w, h, T, lit) => { const t = b - h, S = [{ p: [[x, t], [x + w, t], [x + w, b], [x, b]], c: T('#CDBF9F') }]; let j = ''; for (let y = t + 9, r = 0; y < b; y += 9, r++) { j += '<line x1="' + x + '" y1="' + y.toFixed(1) + '" x2="' + (x + w) + '" y2="' + y.toFixed(1) + '" stroke="' + e.OL + '" stroke-width="1.2" opacity=".22"/>'; for (let xx = x + (r % 2) * 6 + 5; xx < x + w; xx += 12) j += '<line x1="' + xx.toFixed(1) + '" y1="' + (y - 9).toFixed(1) + '" x2="' + xx.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="' + e.OL + '" stroke-width="1.2" opacity=".18"/>'; } S.push({ raw: j }); S.push({ p: [[x - 6, t + 3], [x + w / 2, t - w * .4], [x + w + 6, t + 3]], c: T('#E0662A') }); const cx = x + w * .74; S.push({ p: [[cx - 4, t - w * .34], [cx + 5, t - w * .34], [cx + 5, t - w * .12], [cx - 4, t - w * .12]], c: T('#A89A7E'), sw: 2.5 }); const ww = w * .2; S.push({ p: [[x + w * .16, t + h * .28], [x + w * .16 + ww, t + h * .28], [x + w * .16 + ww, t + h * .28 + ww * 1.1], [x + w * .16, t + h * .28 + ww * 1.1]], c: lit ? '#FFD27A' : T('#6E6A7E'), sw: 2.5, flat: true }); if (h > 34) S.push({ p: [[x + w * .56, b], [x + w * .56, b - h * .4], [x + w * .67, b - h * .46], [x + w * .78, b - h * .4], [x + w * .78, b]], c: T('#8A5530'), sw: 2.5 }); return e.parts(S, 5); };
const shelves = (e, x0, x1, y0, y1, cw, rh, cols, o = {}) => { let s = ''; const P = e.P, rnd = e.rnd; for (let y = y0; y < y1 - 4; y += rh) for (let x = x0; x < x1; x += cw) { const w = Math.min(cw, x1 - x); s += '<rect x="' + x + '" y="' + y.toFixed(1) + '" width="' + w + '" height="' + rh.toFixed(1) + '" fill="' + (o.back || '#3B2A1E') + '"/>'; let bx = x + 5; while (bx < x + w - 8) { const bw = (o.bw || 4) + rnd() * (o.bv || 5), bh = rh * (o.hmin || .5) + rnd() * rh * (o.hv || .34); if (rnd() < (o.gap || .07)) { bx += bw + 3; continue; } const c = cols[Math.floor(rnd() * cols.length)], yb = y + rh - 4; s += '<polygon points="' + P([[bx, yb], [bx + bw, yb], [bx + bw, yb - bh], [bx, yb - bh]]) + '" fill="' + c + '" stroke="' + DK + '" stroke-width="1.3" stroke-linejoin="round"/>'; if (o.label) s += '<rect x="' + (bx + bw * .2).toFixed(1) + '" y="' + (yb - bh * .72).toFixed(1) + '" width="' + (bw * .6).toFixed(1) + '" height="' + Math.min(8, bh * .16).toFixed(1) + '" fill="#F3E6C8" stroke="' + DK + '" stroke-width="1"/>'; bx += bw + .6; } } for (let y = y0; y < y1 - 4; y += rh) s += '<rect x="' + (x0 - 3) + '" y="' + (y + rh - 5).toFixed(1) + '" width="' + (x1 - x0 + 6) + '" height="7" fill="#8A5530" stroke="' + DK + '" stroke-width="2"/>'; for (let x = x0; x <= x1; x += cw) s += '<rect x="' + (x - 3) + '" y="' + y0 + '" width="6" height="' + (y1 - y0) + '" fill="#7A4A2A" stroke="' + DK + '" stroke-width="2"/>'; return s; };
const potPlant = (e, x, y, r, pc = '#C4481F') => e.parts([{ p: [[x - r * .7, y - r * .9], [x + r * .7, y - r * .9], [x + r * .5, y], [x - r * .5, y]], c: pc }], 5) + bush(e, x - r * .2, y - r * .8, r * .9, '#3FA85A', '#2E8A4A');

// ================= PROLOGUE MONDE / SILENCE
function prologue(sil) {
  const e = eng(91, sil ? '#5C566B' : DK), T = sil ? (c => e.mix(c, '#ABA5B8', .56)) : (c => c), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 380; let s = '';
  s += grid(0, HZ + 12, 6, 8, (x, y) => T(grad([[0, '#6FC0E6'], [.6, '#C8E8EE'], [1, '#FFE8B0']], y / HZ)), () => .04);
  s += glow(300, 112, 80, 80, T('#FFF6D0'), sil ? .25 : .45) + parts([{ p: ngon(300, 112, 28, 28, 10, .2), c: T('#FFE59A'), sil: false, sw: 3.5 }]);
  s += cloud(e, 86, 96, .8, T('#FFFFFF')) + cloud(e, 214, 58, .55, T('#FFFFFF')) + cloud(e, 362, 196, .45, T('#FFF3DC'));
  if (!sil) s += [[150, 150], [166, 142], [178, 156]].map(([x, y]) => '<polyline points="' + (x - 6) + ',' + (y - 3) + ' ' + x + ',' + (y + 1) + ' ' + (x + 6) + ',' + (y - 3) + '" fill="none" stroke="' + DK + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>').join('');
  s += parts([{ p: [[-10, 300], [50, 262], [110, 288], [170, 250], [240, 282], [300, 246], [360, 270], [400, 256], [400, HZ], [-10, HZ]], c: T('#9FB9CF') }], 6);
  s += parts([{ p: [[-10, 336], [70, 316], [150, 330], [220, 322], [300, 334], [400, 318], [400, HZ + 10], [-10, HZ + 10]], c: T('#A9D46A') }], 6);
  for (let x = 10; x < 120; x += 26 + rnd() * 16) s += tree(e, x, 334 + rnd() * 8, 22 + rnd() * 10, T('#4E9A5A'), T('#5DB84E'), T('#6B4428'), 4);
  const hp = [[110, HZ + 12], [160, 342], [220, 308], [280, 298], [336, 312], [400, 332], [400, HZ + 12]];
  s += parts([{ p: hp, c: T('#8CCB5C') }], 6) + tree(e, 322, 306, 76, T('#2E8A4A'), T('#3FA85A'), T('#6B4428'), 6);
  if (!sil) { const F = '#2E3A30'; s += '<g fill="' + F + '" stroke="' + F + '" stroke-width="1.5" stroke-linejoin="round"><polygon points="' + P([[255, 302], [269, 302], [266, 284], [258, 284]]) + '"/><polygon points="' + P(ngon(262, 279, 4.5, 4.5, 7)) + '"/><line x1="273" y1="302" x2="276" y2="274" stroke-width="2.5"/>' + [[238, 304], [228, 305], [218, 305], [246, 305]].map(([x, y]) => '<polygon points="' + P([[x - 4, y], [x + 4, y], [x + 3, y - 9], [x - 3, y - 9]]) + '"/><polygon points="' + P(ngon(x, y - 12, 3.2, 3.2, 6)) + '"/>').join('') + '</g>'; }
  s += grid(HZ, H, 8, 16, (x, y) => T(grad([[0, '#9AD468'], [.5, '#5DB84E'], [1, '#34A04C']], (y - HZ) / (H - HZ))), e.calm(HZ));
  s += tree(e, 14, 560, 200, T('#2E8A4A'), T('#3FA85A'), T('#6B4428')) + pine(e, 382, 610, 180, T('#3FA85A'), T('#2E8A4A'), T('#6B4428')) + tree(e, 376, 430, 90, T('#2E8A4A'), T('#3FA85A'), T('#6B4428'));
  s += bush(e, 40, 446, 18, T('#5DBA4F'), T('#4AA548')) + bush(e, 340, 770, 26, T('#5DBA4F'), T('#4AA548')) + bush(e, 30, 810, 30, T('#5DBA4F'), T('#4AA548')) + rock(e, 364, 836, 26, T('#A2988A'));
  s += edges(e, 20, 440, 840, (x, y, i) => i % 3 === 0 ? dot(e, x, y, 4.5, T(['#FF5A3C', '#FFD23F', '#FF7AA8', '#FFFFFF'][i % 4])) : blade(e, x, y, .85, T('#9ACD32')));
  if (sil) s += mist(e, 250, 200, '#E4E0EA', .45, 0) + mist(e, 318, 150, '#D8D4E0', .5, 1.4) + mist(e, HZ + 40, 200, '#E6E3EC', .3, 2.1) + mist(e, 680, 220, '#DEDAE6', .18, 3);
  return wrap(s);
}

// ================= PROLOGUE HÉROS
function prologue_heros() {
  const e = eng(97, '#4A4458'), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 430; let s = '';
  s += grid(0, HZ + 12, 6, 9, (x, y) => grad([[0, '#6A6480'], [.55, '#948EA6'], [1, '#C4BED0']], y / HZ), () => .06);
  const gx = 262, gy = 262;
  s += glow(gx, gy, 130, 96, '#FFE3A6', .35) + glow(gx, gy, 72, 54, '#FFF1C2', .65);
  for (let i = -3; i <= 3; i++) s += '<polygon points="' + P([[gx - 16 + i * 6, gy], [gx - 8 + i * 6, gy], [gx + i * 28 + 10, HZ - 4], [gx + i * 28 - 10, HZ - 4]]) + '" fill="#FFE9B0" opacity=".24"/>';
  s += cloud(e, 50, 90, 1.3, '#8A849C') + cloud(e, 196, 56, 1.2, '#9C96AE') + cloud(e, 350, 110, 1.1, '#8A849C') + cloud(e, 110, 190, 1, '#A6A0B8') + cloud(e, 350, 214, .8, '#A6A0B8') + cloud(e, 170, 262, .7, '#A29CB4');
  s += parts([{ p: [[-10, 384], [60, 360], [140, 376], [220, 354], [300, 370], [400, 350], [400, HZ + 10], [-10, HZ + 10]], c: '#8E88A0' }], 5);
  s += parts([{ p: [[228, HZ + 4], [248, HZ - 12], [270, HZ - 16], [298, HZ - 6], [306, HZ + 4]], c: '#E8C27A' }], 5) + pine(e, 256, HZ - 8, 20, '#5DB84E', '#3FA85A', '#6B4428', 3) + pine(e, 276, HZ - 10, 24, '#5DB84E', '#3FA85A', '#6B4428', 3);
  s += grid(HZ, H, 8, 14, (x, y) => grad([[0, '#ABA5BA'], [1, '#8E88A0']], (y - HZ) / (H - HZ)), () => .04);
  s += mist(e, HZ - 22, 60, '#D6D2DE', .6, 0) + mist(e, HZ + 60, 110, '#CFCAD8', .5, 1.2);
  const hp = [[-10, 640], [60, 600], [150, 576], [240, 572], [320, 586], [400, 612], [400, H + 10], [-10, H + 10]];
  s += '<g clip-path="url(#phh)">' + grid(560, H, 8, 8, (x, y) => grad([[0, '#8CBF5C'], [1, '#4E9A48']], (y - 570) / (H - 570)), e.calm(570, .02, .14)) + '</g><polyline points="' + P(hp.slice(0, 6)) + '" fill="none" stroke="' + DK + '" stroke-width="4" stroke-linejoin="round"/>';
  s += rock(e, 30, 806, 30, '#A2988A') + bush(e, 360, 824, 28) + bush(e, 20, 660, 16) + edges(e, 14, 630, 840, (x, y, i) => i % 4 ? blade(e, x, y, .85, '#9ACD32') : dot(e, x, y, 4.5, '#FFD23F'));
  return wrap(s, '<clipPath id="phh"><polygon points="' + P(hp) + '"/></clipPath>');
}

// ================= PIERRELUNE AUBE / BRUME
function pierrelune(brume) {
  const e = eng(103, brume ? '#5C566B' : DK), T = brume ? (c => e.mix(c, '#ABA5B8', .52)) : (c => c), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 410; let s = '';
  s += grid(0, HZ + 12, 6, 8, (x, y) => T(grad([[0, '#7C8CCB'], [.38, '#F2A48A'], [.72, '#FFC98A'], [1, '#FFE9B8']], y / HZ)), () => .045);
  s += glow(176, 250, 130, 130, T('#FFF1C2'), brume ? .2 : .45) + parts([{ p: ngon(176, 250, 34, 34, 12), c: T('#FFE59A'), sil: false, sw: 3.5 }]);
  s += cloud(e, 70, 90, .7, T('#FFD9C4')) + cloud(e, 300, 64, .6, T('#FFD9C4'));
  s += ranged(e, [[-10, 250], [40, 170], [96, 236], [140, 200], [196, 258], [250, 160], [310, 222], [360, 150], [400, 210], [400, HZ], [-10, HZ]], T('#9A9CC4'), .34, 240, 6, T('#FFF4F0'));
  s += parts([{ p: [[-10, 272], [60, 300], [130, 350], [180, 392], [190, HZ + 10], [-10, HZ + 10]], c: T('#7FB25A') }, { p: [[400, 262], [330, 296], [260, 346], [206, 392], [200, HZ + 10], [400, HZ + 10]], c: T('#86B85C') }], 6);
  const lit = !brume;
  s += stoneHouse(e, 162, 384, 26, 20, T, lit) + stoneHouse(e, 200, 390, 24, 18, T, lit);
  [[-12, 300, 58, 42], [44, 322, 50, 38], [96, 356, 44, 34], [-8, 382, 72, 54], [60, 380, 50, 40]].forEach(a => s += stoneHouse(e, ...a, T, lit));
  [[300, 296, 56, 42], [350, 316, 50, 38], [254, 350, 44, 34], [318, 380, 76, 56], [272, 386, 48, 38]].forEach(a => s += stoneHouse(e, ...a, T, lit));
  s += parts([{ p: [[-10, 390], [124, 376], [128, 392], [-10, 408]], c: T('#B8AA8E') }, { p: [[400, 390], [262, 380], [258, 396], [400, 410]], c: T('#B8AA8E') }], 5);
  s += grid(HZ, H, 8, 16, (x, y) => T(grad([[0, '#9AD468'], [.5, '#5DB84E'], [1, '#34A04C']], (y - HZ) / (H - HZ))), e.calm(HZ));
  s += '<polygon points="' + P([[184, HZ], [206, HZ], [292, H], [98, H]]) + '" fill="' + T('#D9C9A6') + '" opacity=".5" stroke="' + e.OL + '" stroke-width="2.5" stroke-opacity=".35"/>';
  s += stoneHouse(e, -34, 572, 100, 116, T, lit) + stoneHouse(e, 324, 600, 100, 120, T, lit);
  s += pine(e, 16, 720, 150, T('#3FA85A'), T('#2E8A4A'), T('#6B4428')) + pine(e, 380, 790, 170, T('#3FA85A'), T('#2E8A4A'), T('#6B4428')) + bush(e, 62, 600, 16, T('#5DBA4F'), T('#4AA548')) + bush(e, 322, 626, 18, T('#5DBA4F'), T('#4AA548')) + rock(e, 40, 836, 28, T('#A2988A'));
  s += edges(e, 18, 620, 840, (x, y, i) => i % 3 === 0 ? dot(e, x, y, 4.5, T(['#FF8C32', '#FFD23F', '#FFFFFF'][i % 3])) : blade(e, x, y, .85, T('#9ACD32')));
  if (brume) s += mist(e, 290, 140, '#E2DEE8', .45, .4) + mist(e, 360, 110, '#D6D2DE', .5, 1.7) + mist(e, HZ + 50, 190, '#E6E3EC', .3, 2.4) + mist(e, 690, 220, '#DEDAE6', .18, 3.1);
  return wrap(s);
}

// ================= MAISON DU MAÎTRE
function maison_maitre() {
  const e = eng(109), { grid, parts, ngon, P, rnd, glow, grad } = e, FL = 468; let s = '';
  for (let x = 0, i = 0; x < 390; x += 30, i++) s += '<rect x="' + x + '" y="0" width="30" height="' + FL + '" fill="' + (i % 2 ? '#A8703E' : '#9A6436') + '" stroke="' + DK + '" stroke-width="2"/>';
  for (let i = 0; i < 8; i++) s += '<polygon points="' + P(ngon(15 + Math.floor(rnd() * 13) * 30, 80 + rnd() * 360, 3, 5, 6)) + '" fill="#6B4428" opacity=".6"/>';
  s += '<rect x="-4" y="-4" width="398" height="34" fill="#5C3A22" stroke="' + DK + '" stroke-width="3"/><rect x="-4" y="30" width="398" height="22" fill="#6B4428" stroke="' + DK + '" stroke-width="3"/>';
  s += '<polygon points="' + P([[44, 256], [150, 256], [250, 720], [30, 740]]) + '" fill="#FFE3A6" opacity=".13"/>';
  s += parts([{ p: [[34, 108], [160, 108], [160, 266], [34, 266]], c: '#6B4428' }, { raw: '<rect x="44" y="118" width="106" height="138" fill="#FFC07A"/><rect x="44" y="176" width="106" height="44" fill="#FFE3A6"/><polygon points="44,222 80,206 118,214 150,200 150,256 44,256" fill="#8DB86A" stroke="' + DK + '" stroke-width="2"/><polygon points="' + P(ngon(118, 176, 12, 12, 10)) + '" fill="#FFE59A"/><line x1="97" y1="118" x2="97" y2="256" stroke="#6B4428" stroke-width="6"/><line x1="44" y1="187" x2="150" y2="187" stroke="#6B4428" stroke-width="6"/>' }, { p: [[26, 264], [168, 264], [164, 278], [30, 278]], c: '#8A5530' }, { p: [[18, 98], [46, 98], [42, 282], [14, 292]], c: '#2E8A4A' }, { p: [[148, 98], [176, 98], [180, 292], [152, 282]], c: '#2E8A4A' }, { p: limb0(8, 98, 186), c: '#8A5530' }], 6);
  s += potPlant(e, 130, 264, 18);
  s += e.line([[196, FL], [216, 196]], '#8A5530', 7, 5) + parts([{ p: ngon(217, 190, 9, 9, 7), c: '#6B4428' }, { p: [[210, 206], [226, 206], [224, 216], [212, 216]], c: '#2E8A4A', sw: 2.5 }], 5);
  s += parts([{ p: [[226, 176], [390, 176], [390, 188], [226, 188]], c: '#6B4428' }, { p: ngon(248, 158, 11, 16, 6, Math.PI / 2), c: '#5AA0C8' }, { p: ngon(276, 164, 9, 11, 6, Math.PI / 2), c: '#9ACD32' }, { p: ngon(302, 157, 10, 18, 6, Math.PI / 2), c: '#C4481F' }, { p: ngon(332, 162, 12, 13, 7), c: '#F3E6C8' }, { p: [[352, 176], [362, 176], [362, 140], [352, 140]], c: '#1F7A3D', flat: true }, { p: [[363, 176], [372, 176], [376, 146], [367, 146]], c: '#8A3B22', flat: true }], 5);
  s += parts([{ p: [[226, 262], [390, 262], [390, 274], [226, 274]], c: '#6B4428' }, ...[[244, 250], [262, 250], [253, 236], [280, 250]].map(([x, y]) => ({ p: ngon(x, y, 9, 9, 8), c: '#EADFC8' })), { p: [[304, 262], [352, 262], [352, 232], [304, 232]], c: '#8A5530' }, { p: [[322, 236], [334, 236], [334, 248], [322, 248]], c: '#FFD23F', sw: 2 }], 5);
  [182, 200, 250, 270].forEach((x, i) => { s += '<line x1="' + x + '" y1="52" x2="' + x + '" y2="' + (74 + i % 2 * 8) + '" stroke="' + DK + '" stroke-width="2"/>' + parts([{ p: [[x - 9, 74 + i % 2 * 8], [x + 9, 74 + i % 2 * 8], [x, 108 + i % 2 * 8]], c: i % 2 ? '#5DBA4F' : '#9ACD32', sw: 2.5 }], 4); });
  s += grid(FL, H, 8, 12, (x, y) => grad([[0, '#B8804A'], [1, '#8A5A34']], (y - FL) / (H - FL)), e.calm(FL, .02, .14));
  for (let i = -9; i <= 9; i++) if (Math.abs(i) > 4) s += '<line x1="' + (195 + i * 20) + '" y1="' + FL + '" x2="' + (195 + i * 58) + '" y2="' + H + '" stroke="#5C3A22" stroke-width="2.2" opacity=".35"/>';
  s += '<rect x="-4" y="' + (FL - 6) + '" width="398" height="12" fill="#5C3A22" stroke="' + DK + '" stroke-width="2.5"/>';
  s += '<polygon points="' + P([[60, FL + 6], [180, FL + 6], [300, 780], [20, 800]]) + '" fill="#FFE3A6" opacity=".1"/>';
  s += parts([{ p: [[262, 626], [274, 626], [274, 508], [262, 508]], c: '#6B4428' }, { p: [[384, 626], [396, 626], [396, 508], [384, 508]], c: '#6B4428' }, { p: [[276, 476], [402, 476], [402, 500], [256, 500]], c: '#8A5530' }, { p: [[256, 500], [402, 500], [402, 514], [256, 514]], c: '#6B4428' }], 7);
  s += '<polygon points="' + P([[276, 488], [318, 480], [326, 494], [284, 500]]) + '" fill="#F3E6C8" stroke="' + DK + '" stroke-width="2.4" stroke-linejoin="round"/>' + [0, 1, 2].map(k => '<line x1="' + (284 + k * 1.5) + '" y1="' + (488 - k * 1.5 + k * 4) + '" x2="' + (314 + k * 1.5) + '" y2="' + (482 - k * 1.5 + k * 4) + '" stroke="#8A7A5E" stroke-width="1.6"/>').join('');
  s += parts([{ p: e.limb([322, 476], [352, 470], 10, 10), c: '#EADFC8' }, { p: ngon(352, 470, 5, 5.5, 7), c: '#D6C8A8', sw: 2 }, { p: ngon(282, 474, 7, 6, 7), c: '#2E3A30', sw: 2.5 }, { p: [[284, 470], [300, 438], [296, 452], [288, 470]], c: '#FFFFFF', sw: 2 }, { p: ngon(374, 476, 13, 4, 8), c: '#C9922E' }, { p: [[368, 476], [380, 476], [380, 440], [368, 440]], c: '#F3E6C8' }], 5);
  s += '<line x1="374" y1="440" x2="374" y2="433" stroke="' + DK + '" stroke-width="2.5" stroke-linecap="round"/><path d="M374 430 q-8 -10 0 -20 q8 -10 0 -22" fill="none" stroke="#8A7A70" stroke-width="2.5" stroke-linecap="round" opacity=".5"/>';
  s += parts([{ p: e.limb([40, 610], [34, 670], 6, 6), c: '#6B4428' }, { p: e.limb([80, 610], [88, 670], 6, 6), c: '#6B4428' }, { p: ngon(60, 604, 40, 12, 10), c: '#8A5530' }], 6);
  s += parts([{ p: e.limb([14, 770], [70, 790], 14, 14), c: '#EADFC8' }, { p: ngon(70, 790, 7, 8, 7), c: '#D6C8A8', sw: 2.5 }], 5);
  s += parts([{ p: [[330, 840], [390, 840], [396, 790], [324, 790]], c: '#A8703E' }, ...[[340, 786], [356, 780], [372, 786], [386, 782]].map(([x, y]) => ({ p: ngon(x, y, 8, 8, 8), c: '#EADFC8' }))], 6);
  return wrap(s);
}
function limb0(x, y0, y1) { return [[x - 3, y0], [x + 3, y0], [x + 3, y1], [x - 3, y1]]; }

// ================= PONT DES BRUMES
function pont_brumes() {
  const e = eng(113), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 318; let s = '';
  s += grid(0, HZ + 12, 6, 7, (x, y) => grad([[0, '#F2915A'], [.55, '#FFC07A'], [1, '#FFE3A6']], y / HZ), () => .05);
  s += glow(106, 150, 64, 64, '#FFF1C2', .45) + parts([{ p: ngon(106, 150, 26, 26, 10, .2), c: '#FFE59A', sil: false, sw: 3.5 }]) + cloud(e, 290, 86, .8, '#FFE9CF');
  s += parts([{ p: [[-10, 250], [70, 190], [140, 240], [210, 196], [280, 236], [340, 180], [400, 226], [400, HZ + 20], [-10, HZ + 20]], c: '#A99AB8' }], 6);
  s += parts([{ p: [[-10, HZ - 8], [80, HZ - 24], [160, HZ - 6], [230, HZ - 8], [310, HZ - 26], [400, HZ - 14], [400, HZ + 16], [-10, HZ + 16]], c: '#7FB25A' }], 6);
  for (let x = -4; x < 400; x += 24 + rnd() * 10) if (x < 160 || x > 230) s += pine(e, x, HZ - 8 + rnd() * 6, 28 + rnd() * 16, '#3FA85A', '#2E8A4A', '#6B4428', 4);
  s += grid(HZ + 10, H, 8, 14, (x, y) => grad([[0, '#E8E4EE'], [1, '#B9B3C8']], (y - HZ) / (H - HZ)), () => .04);
  s += mist(e, HZ + 20, 100, '#F2F0F6', .7, .3);
  const cliff = side => { const m = side < 0 ? (x => x) : (x => 390 - x); return parts([{ p: [[-10, HZ + 20], [46, HZ + 10], [78, HZ + 56], [60, HZ + 150], [30, HZ + 250], [-10, HZ + 300]].map(([x, y]) => [m(x), y]), c: '#8C8374' }, { p: [[-10, HZ + 20], [46, HZ + 10], [60, HZ + 30], [-10, HZ + 44]].map(([x, y]) => [m(x), y]), c: '#6FB04E' }], 7) + tree(e, m(18), HZ + 22, 90) + pine(e, m(52), HZ + 18, 60); };
  s += cliff(-1) + cliff(1);
  const dk = [[176, HZ + 6], [214, HZ + 6], [374, H + 10], [16, H + 10]];
  s += '<g clip-path="url(#pbd)">' + grid(HZ, H + 10, 8, 14, (x, y) => grad([[0, '#D6CAAE'], [1, '#B8AA8E']], (y - HZ) / (H - HZ)), e.calm(HZ, .02, .1)) + '</g>';
  for (let k = 1; k < 14; k++) { const t = Math.pow(k / 14, 1.7), y = HZ + 6 + (H - HZ) * t, xl = 176 + (16 - 176) * t, xr = 214 + (374 - 214) * t; s += '<line x1="' + xl.toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + xr.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="' + DK + '" stroke-width="1.8" opacity=".16"/>'; }
  const para = side => { const m = side < 0 ? (x => x) : (x => 390 - x), M = pts => pts.map(([x, y]) => [m(x), y]); let j = ''; for (let k = 1; k < 12; k++) { const t = Math.pow(k / 12, 1.4), x = 176 + (16 - 176) * t, yb = HZ + 6 + (H + 10 - HZ - 6) * t, yt = yb - (6 + 58 * t); j += '<line x1="' + m(x).toFixed(1) + '" y1="' + yt.toFixed(1) + '" x2="' + m(x).toFixed(1) + '" y2="' + yb.toFixed(1) + '" stroke="' + DK + '" stroke-width="2" opacity=".35"/>'; } return parts([{ p: M([[176, HZ + 6], [176, HZ], [16, H - 54], [16, H + 10]]), c: '#B8AC90', flat: true }, { raw: j }, { p: M([[176, HZ], [170, HZ - 2], [-18, H - 62], [16, H - 54]]), c: '#D6CAAE' }], 6); };
  s += para(-1) + para(1);
  s += parts([{ p: [[168, HZ + 6], [176, HZ + 6], [176, HZ - 28], [168, HZ - 28]], c: '#C8BCA0' }, { p: [[214, HZ + 6], [222, HZ + 6], [222, HZ - 28], [214, HZ - 28]], c: '#C8BCA0' }, { p: [[164, HZ - 26], [195, HZ - 40], [226, HZ - 26], [226, HZ - 32], [195, HZ - 46], [164, HZ - 32]], c: '#B8AC90' }], 5);
  [[40, 790, 14], [120, 520, 8], [350, 780, 14], [270, 520, 8]].forEach(([x, y, r]) => s += parts([{ p: ngon(x, y - 30 * (r / 14), r, r * .5, 7), c: '#5DBA4F', sw: 2.5 }], 4));
  s += mist(e, 560, 80, '#F2F0F6', .35, 2) ;
  return wrap(s, '<clipPath id="pbd"><polygon points="' + P(dk) + '"/></clipPath>');
}

// ================= ROUTE DE L'ÉCOLE
function route_ecole() {
  const e = eng(127), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 318; let s = '';
  s += grid(0, HZ + 12, 6, 7, (x, y) => grad([[0, '#F4A36E'], [.55, '#FFCB8A'], [1, '#FFE8B4']], y / HZ), () => .05);
  s += glow(214, 190, 80, 80, '#FFF1C2', .45) + parts([{ p: ngon(214, 190, 24, 24, 10), c: '#FFE59A', sil: false, sw: 3.5 }]);
  s += parts([{ p: [[-6, HZ - 30], [80, HZ - 50], [170, HZ - 38], [250, HZ - 58], [330, HZ - 42], [396, HZ - 52], [396, HZ + 14], [-6, HZ + 14]], c: '#8DB86A' }], 6);
  s += parts([{ p: [[234, HZ - 48], [234, HZ - 76], [250, HZ - 92], [266, HZ - 76], [266, HZ - 48], [258, HZ - 48], [258, HZ - 72], [250, HZ - 80], [242, HZ - 72], [242, HZ - 48]], c: '#C8B894' }, { p: [[276, HZ - 46], [276, HZ - 70], [284, HZ - 66], [284, HZ - 46]], c: '#C8B894' }], 4);
  for (let x = -10; x < 400; x += 20 + rnd() * 10) if (x < 178 || x > 212) s += pine(e, x, HZ + 6 + rnd() * 6, 44 + rnd() * 30, '#3FA85A', '#2E8A4A', '#6B4428', 5);
  s += grid(HZ, H, 8, 16, (x, y) => grad([[0, '#8FD05E'], [1, '#2FA24A']], (y - HZ) / (H - HZ)), e.calm(HZ));
  const pa = [[186, HZ], [204, HZ], [300, H + 10], [90, H + 10]];
  s += '<g clip-path="url(#rep)">' + grid(HZ, H + 10, 8, 14, (x, y) => grad([[0, '#E6CE96'], [1, '#CDA86E']], (y - HZ) / (H - HZ)), () => .03) + '</g><polyline points="186,' + HZ + ' 90,' + (H + 10) + '" stroke="' + DK + '" stroke-width="3" opacity=".5"/><polyline points="204,' + HZ + ' 300,' + (H + 10) + '" stroke="' + DK + '" stroke-width="3" opacity=".5"/>';
  for (let i = 0; i < 3; i++) s += '<polygon points="' + P([[i * 70 - 40, 0], [i * 70 - 10, 0], [i * 70 + 190, 760], [i * 70 + 140, 760]]) + '" fill="#FFF1C2" opacity=".08"/>';
  s += tree(e, 36, 440, 140) + tree(e, 358, 420, 130) + pine(e, 4, 600, 240) + pine(e, 386, 560, 220) + pine(e, 380, 900, 260);
  const cr = (x, y, r, k) => rock(e, x, y, r, '#B0A696') + sym(e, x - r * .05, y - r * .45, r * .3, k);
  s += cr(92, 400, 22, 'c') + cr(300, 408, 24, 't') + cr(38, 520, 34, 't') + cr(354, 560, 38, 'c') + cr(26, 720, 46, 'c') + cr(360, 760, 50, 't') + cr(60, 848, 40, 't');
  s += bush(e, 70, 610, 18) + bush(e, 324, 650, 20) + edges(e, 22, 440, 840, (x, y, i) => i % 5 === 0 ? dot(e, x, y, 4.5, '#FFD23F') : blade(e, x, y, .85, '#9ACD32'));
  return wrap(s, '<clipPath id="rep"><polygon points="' + P(pa) + '"/></clipPath>');
}

// ================= MARCHÉ DE VÉLIS
function velis_marche() {
  const e = eng(131), { grid, parts, ngon, P, rnd, glow, grad } = e, FL = 380; let s = '';
  const G = (c, k) => e.mix(c, '#A9A3B6', k);
  s += '<rect width="390" height="' + (FL + 20) + '" fill="#8A5530"/>';
  const arch = [[128, FL], [128, 250], ...Array.from({ length: 9 }, (_, i) => { const a = Math.PI + i * Math.PI / 8; return [195 + Math.cos(a) * 67, 250 + Math.sin(a) * 67]; }), [262, 250], [262, FL]];
  s += parts([{ p: [[90, 190], [300, 190], [300, FL], [90, FL]], c: '#A8703E', flat: true }], 6);
  s += '<polygon points="' + P(arch) + '" fill="#CFCAD8" stroke="' + DK + '" stroke-width="4" stroke-linejoin="round"/><polygon points="' + P([[128, FL], [128, 318], [170, 308], [220, 314], [262, 304], [262, FL]]) + '" fill="#A9A3B6"/>' + mist(e, 300, 60, '#E2DEE8', .6);
  s += parts([{ p: [[0, 0], [390, 0], [300, 190], [90, 190]], c: '#5C3A22', flat: true }], 6);
  s += '<polygon points="' + P([[150, 0], [240, 0], [222, 190], [168, 190]]) + '" fill="#FFE3A6" opacity=".22"/>';
  for (let x = 0; x <= 390; x += 39) s += e.line([[x, 0], [90 + x / 390 * 210, 190]], '#8A5530', 6, 4);
  s += e.line([[0, 96], [390, 96]], '#6B4428', 10, 4) + e.line([[90, 190], [300, 190]], '#6B4428', 8, 4);
  s += parts([{ p: [[0, 0], [90, 190], [90, FL], [0, FL + 70]], c: '#7A4A2A', flat: true }, { p: [[390, 0], [300, 190], [300, FL], [390, FL + 70]], c: '#7A4A2A', flat: true }], 6);
  s += grid(FL, H, 8, 14, (x, y) => G(grad([[0, '#D9C9A6'], [1, '#B8A48A']], (y - FL) / (H - FL)), .5 * Math.max(0, 1 - (y - FL) / 260)), e.calm(FL, .02, .14));
  [[90, 190, FL], [62, 150, 420], [22, 90, 480]].forEach(([x, t, b]) => s += e.line([[x, t], [x, b]], '#6B4428', 9, 5) + e.line([[390 - x, t], [390 - x, b]], '#6B4428', 9, 5));
  const stall = (x0, x1, y, h, col, k) => { const S = [], ah = h * .34, n = 5, sw = (x1 - x0) / n; for (let i = 0; i < n; i++) { const a = x0 + i * sw; S.push({ p: [[a, y], [a + sw, y], [a + sw, y + ah], [a + sw / 2, y + ah + sw * .35], [a, y + ah]], c: G(i % 2 ? '#FFF6E6' : col, k), sw: 2.2, flat: true }); } S.push({ p: [[x0 + 4, y + h * .62], [x1 - 4, y + h * .62], [x1 - 4, y + h], [x0 + 4, y + h]], c: G('#8A5530', k * .8) }); const gd = ['#FF5A3C', '#FFD23F', '#9ACD32', '#FF8C32', '#7A3B6E']; let r = ''; for (let i = 0; i < 7; i++) r += dot(e, x0 + 8 + (x1 - x0 - 16) * i / 6, y + h * .62 - 3, Math.max(2.5, h * .04), G(gd[i % 5], k)); S.push({ raw: '<line x1="' + (x0 + 5) + '" y1="' + (y + ah) + '" x2="' + (x0 + 5) + '" y2="' + (y + h * .62) + '" stroke="' + DK + '" stroke-width="2.5"/><line x1="' + (x1 - 5) + '" y1="' + (y + ah) + '" x2="' + (x1 - 5) + '" y2="' + (y + h * .62) + '" stroke="' + DK + '" stroke-width="2.5"/>' + r }); return parts(S, 5); };
  s += stall(64, 94, 300, 56, '#FF5A3C', .75) + stall(296, 326, 300, 56, '#5AA0C8', .8);
  s += stall(22, 88, 336, 96, '#FFD23F', .45) + stall(302, 368, 336, 96, '#FF8C32', .5);
  s += stall(-12, 70, 440, 160, '#3DDC5B', .1) + stall(320, 402, 446, 160, '#FF7AA8', .15);
  const bc = e.cat([20, 120], [370, 120], 44, 18); s += '<polyline points="' + P(bc) + '" fill="none" stroke="' + DK + '" stroke-width="2.5"/>'; for (let i = 0; i < bc.length - 1; i++) { const a = bc[i], c = bc[i + 1]; s += '<polygon points="' + P([a, c, [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2 + 16]]) + '" fill="' + G(['#FF5A3C', '#FFD23F', '#3DDC5B', '#FFFFFF', '#5AA0C8'][i % 5], .15 + .5 * Math.max(0, 1 - Math.abs(i - 8.5) / 8.5) * 0 + i / 18 * .6) + '" stroke="' + DK + '" stroke-width="2.2" stroke-linejoin="round"/>'; }
  const crate = (x, y, w, c) => parts([{ p: [[x, y], [x + w, y], [x + w, y - w * .7], [x, y - w * .7]], c: '#A8703E' }, { raw: '<line x1="' + x + '" y1="' + (y - w * .35) + '" x2="' + (x + w) + '" y2="' + (y - w * .35) + '" stroke="' + DK + '" stroke-width="2" opacity=".5"/>' + [0, 1, 2].map(i => dot(e, x + w * (.2 + i * .3), y - w * .74, w * .12, c)).join('') }], 6);
  s += crate(10, 720, 56, '#FF5A3C') + crate(40, 800, 64, '#FFD23F') + crate(324, 760, 60, '#9ACD32') + crate(340, 840, 56, '#FF8C32');
  s += mist(e, FL - 6, 70, '#D6D2DE', .45, 1);
  return wrap(s);
}

// ================= PLANQUE DES CHATS
function planque_chats() {
  const e = eng(137), { grid, parts, ngon, P, rnd, glow, grad } = e, FL = 450; let s = '';
  s += '<rect width="390" height="' + (FL + 40) + '" fill="#5C3A28"/>';
  const gab = [[40, FL], [195, 70], [350, FL]];
  let pl = ''; for (let x = 40, i = 0; x < 350; x += 22, i++) pl += '<rect x="' + x + '" y="60" width="22" height="' + FL + '" fill="' + (i % 2 ? '#8A5A3A' : '#7E5234') + '" stroke="' + DK + '" stroke-width="1.6"/>';
  s += '<g clip-path="url(#pcg)">' + pl + '</g>';
  for (let k = 0; k < 6; k++) { s += e.line([[195 - k * 34, 0], [0, 40 + k * 84]], '#7A4A2A', 7, 4) + e.line([[195 + k * 34, 0], [390, 40 + k * 84]], '#7A4A2A', 7, 4); }
  s += e.line([[40, FL], [195, 70], [350, FL]], '#6B4428', 12, 5);
  s += parts([{ p: ngon(195, 172, 44, 44, 12), c: '#5C3A22' }, { p: ngon(195, 172, 34, 34, 12), c: '#2E2550', flat: true, sil: false }, { p: ngon(207, 162, 10, 10, 9), c: '#FFF1C2', sil: false, sw: 2 }, { raw: '<line x1="195" y1="138" x2="195" y2="206" stroke="#5C3A22" stroke-width="5"/><line x1="161" y1="172" x2="229" y2="172" stroke="#5C3A22" stroke-width="5"/>' + dot(e, 176, 154, 1.8, '#FFF1C2') + dot(e, 180, 190, 1.5, '#FFF1C2') }], 7);
  s += parts([{ p: [[60, 262], [330, 262], [330, 282], [60, 282]], c: '#5C3A22' }], 6);
  s += parts([{ p: [[176, 282], [214, 282], [214, 344], [195, 330], [176, 344]], c: '#C4481F' }, { p: [[185, 304], [188, 294], [193, 300], [197, 300], [202, 294], [205, 304], [204, 314], [195, 320], [186, 314]], c: '#FFD23F', sw: 2.5 }, { raw: '<g fill="' + DK + '"><circle cx="191" cy="307" r="1.8"/><circle cx="199" cy="307" r="1.8"/></g>' }], 5);
  const lant = (x, y, l) => '<line x1="' + x + '" y1="282" x2="' + x + '" y2="' + (y - 12) + '" stroke="' + DK + '" stroke-width="2.2"/>' + glow(x, y, 34, 34, '#FFD23F', .25) + parts([{ p: ngon(x, y, 10, 13, 6, Math.PI / 2), c: '#FF8C32', sw: 3 }, { p: [[x - 7, y - 13], [x + 7, y - 13], [x, y - 20]], c: '#3B2A1E', sw: 2.5 }], 5);
  s += lant(100, 322) + lant(290, 330);
  s += grid(FL, H, 8, 12, (x, y) => grad([[0, '#9A6436'], [1, '#6E4428']], (y - FL) / (H - FL)), e.calm(FL, .02, .14));
  for (let i = -9; i <= 9; i++) if (Math.abs(i) > 4) s += '<line x1="' + (195 + i * 20) + '" y1="' + FL + '" x2="' + (195 + i * 58) + '" y2="' + H + '" stroke="#4A2E1C" stroke-width="2.2" opacity=".35"/>';
  s += glow(195, 640, 180, 150, '#FFD23F', .05);
  const cush = (x, y, rx, ry, c) => parts([{ p: ngon(x, y, rx, ry, 8, .2), c }, { raw: dot(e, x - rx * .9, y - ry * .5, 3.5, '#FFD23F') + dot(e, x + rx * .9, y - ry * .4, 3.5, '#FFD23F') }], 6);
  s += cush(14, 540, 44, 24, '#8A3B22') + cush(50, 586, 36, 20, '#5B3B6E') + cush(8, 628, 40, 22, '#FF8C32') + cush(42, 690, 46, 24, '#2E8A4A') + cush(10, 740, 34, 20, '#C4481F');
  s += cush(376, 560, 46, 24, '#3E5A8A') + cush(344, 606, 36, 20, '#C4481F') + cush(384, 654, 44, 24, '#FFD23F') + cush(352, 704, 34, 20, '#5B3B6E');
  s += glow(346, 780, 70, 44, '#FFD23F', .3) + parts([{ p: [[300, 840], [392, 840], [392, 780], [300, 780]], c: '#8A5530' }, { p: [[300, 780], [392, 780], [382, 736], [310, 736]], c: '#6B4428' }, { p: [[300, 800], [392, 800], [392, 810], [300, 810]], c: '#FFD23F', sw: 2.5 }, { p: [[340, 790], [352, 790], [352, 806], [340, 806]], c: '#FFD23F', sw: 2.5 }], 6);
  for (let i = 0; i < 12; i++) s += '<polygon points="' + P(ngon(310 + rnd() * 76, 772 + rnd() * 10 - (i % 3) * 5, 6, 3.5, 8)) + '" fill="#FFD23F" stroke="' + DK + '" stroke-width="2"/>';
  s += parts([{ p: [[364, 772], [376, 772], [372, 752], [368, 752]], c: '#C9922E', sw: 2.5 }, { p: ngon(370, 748, 9, 5, 8), c: '#FFD23F', sw: 2.5 }], 4);
  for (let i = 0; i < 9; i++) s += '<polygon points="' + P(ngon(40 + rnd() * 50, 830 - rnd() * 18, 7, 4, 8)) + '" fill="#FFD23F" stroke="' + DK + '" stroke-width="2"/>';
  s += parts([{ p: e.limb([80, 790], [150, 816], 20, 20), c: '#3E5A8A' }, { p: ngon(150, 816, 10, 11, 8), c: '#FF8C32', sw: 2.5 }], 6);
  s += glow(22, 800, 40, 40, '#FFD23F', .25) + parts([{ p: ngon(22, 800, 9, 12, 6, Math.PI / 2), c: '#FFC65A', sw: 3 }], 5);
  return wrap(s, '<clipPath id="pcg"><polygon points="' + P(gab) + '"/></clipPath>');
}

// ================= ARCHIVES DE VÉLIS
function archives_velis() {
  const e = eng(149), { grid, parts, ngon, P, rnd, glow, grad } = e, FL = 440; let s = '';
  const RC = ['#6B3E22', '#1F5A3A', '#8A2A1E', '#3E4B6E', '#A8703E', '#5C3A22'];
  s += '<rect width="390" height="' + (FL + 10) + '" fill="#7A6450"/>';
  s += shelves(e, 34, 356, -10, FL, 54, (FL + 10) / 8, RC, { label: true, bw: 7, bv: 4, hmin: .6, hv: .22, gap: .04 });
  s += '<rect x="276" y="-4" width="92" height="196" fill="#8A7460" stroke="' + DK + '" stroke-width="3"/>';
  const win = [[292, 176], [292, 60], [300, 38], [322, 24], [344, 38], [352, 60], [352, 176]];
  s += glow(322, 100, 90, 90, '#FFF1C2', .3) + parts([{ p: win, c: '#FFF1C2' }, { raw: '<line x1="322" y1="26" x2="322" y2="176" stroke="#5C3A22" stroke-width="5"/><line x1="292" y1="104" x2="352" y2="104" stroke="#5C3A22" stroke-width="5"/>' }], 7);
  s += grid(FL, H, 8, 12, (x, y) => grad([[0, '#BCAC90'], [1, '#8E806A']], (y - FL) / (H - FL)), e.calm(FL, .02, .14));
  for (let y = FL + 40, r = 0; y < H; y += 44, r++) s += '<line x1="0" y1="' + y + '" x2="70" y2="' + y + '" stroke="' + DK + '" stroke-width="2" opacity=".2"/><line x1="320" y1="' + y + '" x2="390" y2="' + y + '" stroke="' + DK + '" stroke-width="2" opacity=".2"/>';
  s += '<rect x="-4" y="' + (FL - 4) + '" width="398" height="10" fill="#4A3A2C" stroke="' + DK + '" stroke-width="2"/>';
  const bA = [[296, 60], [350, 150], [196, 730], [40, 676]];
  s += '<polygon points="' + P(bA) + '" fill="#FFF1C2" opacity=".16"/><polygon points="' + P([[308, 80], [344, 140], [176, 712], [92, 684]]) + '" fill="#FFF1C2" opacity=".12"/>' + glow(118, 700, 96, 34, '#FFF1C2', .18);
  for (let i = 0; i < 70; i++) { const u = rnd(), v = rnd(), top = [296 + (350 - 296) * v, 60 + 90 * v], bot = [40 + (196 - 40) * v, 676 + 54 * v], x = top[0] + (bot[0] - top[0]) * u, y = top[1] + (bot[1] - top[1]) * u; s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (1 + rnd() * 1.8).toFixed(1) + '" fill="#FFF6D8" opacity="' + (.4 + rnd() * .5).toFixed(2) + '"/>'; }
  s += e.line([[60, FL + 2], [86, 100]], '#A8703E', 5, 4) + e.line([[84, FL + 2], [110, 100]], '#A8703E', 5, 4) + Array.from({ length: 12 }, (_, i) => { const t = (i + .5) / 12, y = FL + 2 - (FL - 98) * t; return e.line([[60 + 26 * t, y], [84 + 26 * t, y]], '#C98A4E', 3.5, 3); }).join('');
  s += shelves(e, -2, 30, 110, H + 20, 32, 70, RC, { label: true, bw: 6, bv: 3, hmin: .6, hv: .2, gap: .03 }) + '<rect x="28" y="104" width="8" height="' + H + '" fill="#7A4A2A" stroke="' + DK + '" stroke-width="3"/>';
  s += shelves(e, 360, 392, 110, H + 20, 32, 70, RC, { label: true, bw: 6, bv: 3, hmin: .6, hv: .2, gap: .03 }) + '<rect x="354" y="104" width="8" height="' + H + '" fill="#7A4A2A" stroke="' + DK + '" stroke-width="3"/>';
  s += parts([{ p: [[36, 700], [130, 700], [120, 724], [36, 724]], c: '#8A5530' }, { p: [[40, 724], [50, 724], [50, 810], [40, 810]], c: '#6B4428' }, { p: [[106, 724], [116, 724], [116, 810], [106, 810]], c: '#6B4428' }, { p: [[50, 700], [82, 690], [82, 698], [50, 708]], c: '#F3E6C8', sw: 2.4 }, { p: [[82, 690], [114, 700], [114, 708], [82, 698]], c: '#EADFC8', sw: 2.4 }, { p: ngon(122, 694, 6, 5, 7), c: '#2E3A30', sw: 2 }], 6);
  let st = ''; [[302, 830], [306, 814], [300, 798], [340, 836], [344, 820]].forEach(([x, y], i) => st += parts([{ p: [[x, y], [x + 34, y], [x + 34, y - 15], [x, y - 15]], c: RC[i % RC.length], sw: 2.5 }, { p: [[x + 10, y - 11], [x + 24, y - 11], [x + 24, y - 5], [x + 10, y - 5]], c: '#F3E6C8', sw: 1.4, flat: true }], 4)); s += st;
  return wrap(s);
}

// ================= PORTE DE VÉLIS
function velis_porte() {
  const e = eng(151), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 420, GB = 572; let s = '';
  s += grid(0, HZ + 12, 6, 8, (x, y) => grad([[0, '#8E88A0'], [1, '#CFCAD8']], y / HZ), () => .04);
  s += grid(HZ, GB + 10, 6, 5, (x, y) => grad([[0, '#B6B0C2'], [1, '#9A94A8']], (y - HZ) / (GB - HZ)), () => .03);
  s += '<polygon points="' + P([[191, HZ], [199, HZ], [246, GB + 4], [144, GB + 4]]) + '" fill="#C4BECE" stroke="#5C566B" stroke-width="2" stroke-opacity=".5"/>';
  for (let x = 96; x < 300; x += 22 + rnd() * 18) if (Math.abs(x - 195) > 16) { const e2 = eng(Math.floor(x * 7), '#5C566B'); s += pine(e2, x, HZ + 4, 16 + rnd() * 10, '#A6A0B6', '#948EA6', '#8E88A0', 3); }
  s += mist(e, HZ - 16, 50, '#DAD6E2', .6);
  s += grid(GB - 6, H, 8, 10, (x, y) => grad([[0, '#D9C9A6'], [1, '#B89C6E']], (y - GB) / (H - GB)), e.calm(GB, .02, .16));
  s += '<polygon points="' + P([[140, GB], [250, GB], [330, H], [60, H]]) + '" fill="#E6D8B8" opacity=".45"/>';
  const ap = Array.from({ length: 11 }, (_, i) => { const a = Math.PI + i * Math.PI / 10; return [195 + Math.cos(a) * 103, 300 + Math.sin(a) * 103]; });
  const wallD = 'M0 70 H390 V' + GB + ' H0 Z M92 ' + GB + ' L' + ap.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + ' L298 ' + GB + ' Z';
  let jn = ''; for (let y = 96, r = 0; y < GB; y += 26, r++) { jn += '<line x1="0" y1="' + y + '" x2="390" y2="' + y + '" stroke="' + DK + '" stroke-width="1.8" opacity=".22"/>'; for (let x = (r % 2) * 22; x < 390; x += 44) jn += '<line x1="' + x + '" y1="' + (y - 26) + '" x2="' + x + '" y2="' + y + '" stroke="' + DK + '" stroke-width="1.8" opacity=".18"/>'; }
  s += '<path d="' + wallD + '" fill="#C9B894" fill-rule="evenodd" stroke="' + DK + '" stroke-width="6" stroke-linejoin="round"/><g clip-path="url(#vpw)">' + jn + '</g>';
  for (let x = 0; x < 390; x += 36) s += '<rect x="' + x + '" y="46" width="22" height="26" fill="#C9B894" stroke="' + DK + '" stroke-width="4" stroke-linejoin="round"/>';
  let vs = ''; for (let i = 0; i < 10; i++) { const a0 = Math.PI + i * Math.PI / 10, a1 = a0 + Math.PI / 10, q = (a, r) => [195 + Math.cos(a) * r, 300 + Math.sin(a) * r]; vs += '<polygon points="' + P([q(a0, 103), q(a0, 130), q(a1, 130), q(a1, 103)]) + '" fill="' + (i % 2 ? '#B8A480' : '#C4B08A') + '" stroke="' + DK + '" stroke-width="3" stroke-linejoin="round"/>'; }
  s += '<polygon points="' + P([[92, GB], [92, 300], [66, 300], [66, GB]]) + '" fill="#B8A480" stroke="' + DK + '" stroke-width="3"/><polygon points="' + P([[298, GB], [298, 300], [324, 300], [324, GB]]) + '" fill="#B8A480" stroke="' + DK + '" stroke-width="3"/>' + vs;
  s += parts([{ p: [[180, 164], [210, 164], [206, 200], [184, 200]], c: '#D6C49E' }, { raw: sym(e, 195, 180, 9, 't', '#FFD23F', .8) }], 5);
  s += parts([{ p: [[-6, 10], [54, 10], [54, GB + 30], [-6, GB + 30]], c: '#B8A480' }, { p: [[336, 10], [396, 10], [396, GB + 30], [336, GB + 30]], c: '#B8A480' }], 6);
  [0, 22, 44, 346, 368].forEach(x => s += '<rect x="' + x + '" y="-10" width="14" height="22" fill="#B8A480" stroke="' + DK + '" stroke-width="4"/>');
  s += '<rect x="22" y="150" width="8" height="30" fill="#3B2A1E" stroke="' + DK + '" stroke-width="2.5"/><rect x="360" y="150" width="8" height="30" fill="#3B2A1E" stroke="' + DK + '" stroke-width="2.5"/>';
  const ban = (x, k) => parts([{ p: [[x, 96], [x + 26, 96], [x + 26, 280], [x + 13, 264], [x, 280]], c: '#C4481F' }, { p: [[x, 96], [x + 26, 96], [x + 26, 104], [x, 104]], c: '#FFD23F', sw: 2.5 }, { raw: sym(e, x + 13, 150, 8, k, '#FFD23F', 1, DK) }], 5);
  s += ban(62, 't') + ban(302, 'c');
  const door = side => { const m = side < 0 ? (x => x) : (x => 390 - x), M = pts => pts.map(([x, y]) => [m(x), y]); let ln = ''; for (let k = 1; k < 4; k++) { const t = k / 4; ln += '<line x1="' + m(92 + (40 - 92) * t).toFixed(1) + '" y1="' + (300 + 40 * t).toFixed(1) + '" x2="' + m(92 + (40 - 92) * t).toFixed(1) + '" y2="' + (GB + 50 * t).toFixed(1) + '" stroke="' + DK + '" stroke-width="2" opacity=".4"/>'; } return parts([{ p: M([[92, 300], [40, 340], [40, GB + 50], [92, GB]]), c: '#8A5530' }, { raw: ln }, { p: M([[92, 360], [40, 392], [40, 402], [92, 370]]), c: '#4A3B2E', sw: 2, flat: true }, { p: M([[92, 500], [40, 520], [40, 530], [92, 510]]), c: '#4A3B2E', sw: 2, flat: true }], 6); };
  s += door(-1) + door(1);
  s += glow(20, 400, 30, 30, '#FFD23F', .3) + parts([{ p: ngon(20, 400, 9, 12, 6, Math.PI / 2), c: '#FFC65A', sw: 3 }], 5) + glow(370, 400, 30, 30, '#FFD23F', .3) + parts([{ p: ngon(370, 400, 9, 12, 6, Math.PI / 2), c: '#FFC65A', sw: 3 }], 5);
  s += potPlant(e, 26, 690, 30) + potPlant(e, 364, 700, 30) + bush(e, 8, 840, 32) + bush(e, 372, 846, 30);
  s += edges(e, 14, 620, 840, (x, y, i) => i % 3 ? blade(e, x, y, .8, '#9ACD32') : dot(e, x, y, 4, '#FF7AA8'));
  s += '<g opacity=".9">' + [[20, 200], [30, 240], [24, 280]].map(([x, y], i) => parts([{ p: ngon(x + 34, y, 8, 7, 6, i), c: '#3FA85A', sw: 2.5 }], 4)).join('') + '</g>';
  return wrap(s, '<clipPath id="vpw"><path d="' + wallD + '" clip-rule="evenodd"/></clipPath>');
}

// ================= PARTIE 3 — helpers
const gmix = (a, b, k) => { const A = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), B = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16)); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
const silence = (svg, k = .58) => svg.replace(/#([0-9A-Fa-f]{6})\b/g, m => m.toUpperCase() === '#17251B' ? '#5C566B' : gmix(m, '#ABA5B8', k));
const tent = (e, x, b, w, h, c, c2 = '#3B2A1E') => e.parts([{ p: [[x - w / 2, b], [x, b - h], [x + w / 2, b]], c }, { p: [[x - w * .13, b], [x, b - h * .55], [x + w * .13, b]], c: c2, sw: 2.5, flat: true }, { raw: '<line x1="' + x + '" y1="' + (b - h) + '" x2="' + x + '" y2="' + (b - h - 10) + '" stroke="' + e.OL + '" stroke-width="3" stroke-linecap="round"/>' }], 6);
const palis = (e, x0, x1, b, h, w = 16, c = '#A8703E') => { const S = []; for (let x = x0; x < x1; x += w) { const hh = h * (.9 + e.rnd() * .2); S.push({ p: [[x, b], [x, b - hh], [x + w / 2, b - hh - w * .7], [x + w, b - hh], [x + w, b]], c: e.rnd() < .5 ? c : e.sh(c, -.1) }); } S.push({ p: [[x0, b - h * .66], [x1, b - h * .66], [x1, b - h * .66 + 8], [x0, b - h * .66 + 8]], c: '#6B4428', sw: 2.5 }); return e.parts(S, 5); };
const fire = (e, x, y, k = 1) => e.glow(x, y - 14 * k, 56 * k, 44 * k, '#FFD23F', .28) + e.parts([{ p: e.limb([x - 18 * k, y + 2], [x + 16 * k, y - 4 * k], 8 * k, 8 * k), c: '#6B4428' }, { p: e.limb([x + 18 * k, y + 2], [x - 16 * k, y - 4 * k], 8 * k, 8 * k), c: '#5C3A22' }, { p: [[x - 16 * k, y - 2 * k], [x - 10 * k, y - 22 * k], [x - 4 * k, y - 12 * k], [x, y - 36 * k], [x + 6 * k, y - 14 * k], [x + 12 * k, y - 26 * k], [x + 16 * k, y - 2 * k]], c: '#FF8C32' }, { p: [[x - 8 * k, y - 2 * k], [x - 3 * k, y - 15 * k], [x + 1 * k, y - 9 * k], [x + 5 * k, y - 19 * k], [x + 9 * k, y - 2 * k]], c: '#FFD23F', sil: false, sw: 2 }], 6);
const mini = (e, x, b, w, h, roof = '#E0662A', wall = '#F3E6C8') => e.parts([{ p: [[x, b - h], [x + w, b - h], [x + w, b], [x, b]], c: wall, sw: 2.5 }, { p: [[x - 3, b - h + 2], [x + w / 2, b - h - w * .45], [x + w + 3, b - h + 2]], c: roof, sw: 2.5 }, { p: [[x + w * .35, b], [x + w * .35, b - h * .5], [x + w * .65, b - h * .5], [x + w * .65, b]], c: '#8A5530', sw: 2, flat: true }], 4);
const church = (e, x, b, k = 1) => e.parts([{ p: [[x, b - 20 * k], [x + 16 * k, b - 20 * k], [x + 16 * k, b], [x, b]], c: '#F3E6C8', sw: 2.5 }, { p: [[x + 3 * k, b - 20 * k], [x + 13 * k, b - 20 * k], [x + 13 * k, b - 34 * k], [x + 3 * k, b - 34 * k]], c: '#E8DCC4', sw: 2.5 }, { p: [[x + 1 * k, b - 33 * k], [x + 8 * k, b - 54 * k], [x + 15 * k, b - 33 * k]], c: '#3E5A8A', sw: 2.5 }], 4);
const village = (e, x, b, n, k = 1, T = (c => c)) => { let s = ''; for (let i = 0; i < n; i++) { const w = (12 + e.rnd() * 7) * k, h = (9 + e.rnd() * 6) * k; s += mini(e, x + i * 15 * k - n * 7 * k + (e.rnd() - .5) * 4, b + (i % 2) * 5 * k, w, h, T(['#E0662A', '#C4481F', '#D9622B'][i % 3]), T('#F3E6C8')); } return s; };

// ================= HAUTES GERBES GRISES
function hautes_gerbes_gris() {
  let s = silence(hautes_gerbes(), .6); const e = eng(201, '#5C566B'); let a = '';
  a += e.parts([{ p: [[-10, -10], [400, -10], [400, 130], [340, 150], [280, 134], [220, 156], [150, 140], [90, 160], [30, 138], [-10, 150]], c: '#9E98AE' }], 6);
  a += cloud(e, 70, 150, 1.2, '#B4AEC2') + cloud(e, 230, 170, 1.3, '#ABA5BA') + cloud(e, 360, 146, 1, '#B4AEC2') + cloud(e, 150, 206, .8, '#BDB7CA') + cloud(e, 320, 226, .7, '#BDB7CA');
  a += mist(e, 250, 90, '#D6D2DE', .55, .5) + mist(e, 320, 120, '#DCD8E4', .4, 1.9);
  return s.replace('</svg>', a + '</svg>');
}

// ================= CHEMIN DANS LES COLLINES
function chemin_collines() {
  const e = eng(211), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 300; let s = '';
  s += grid(0, HZ + 12, 6, 7, (x, y) => grad([[0, '#F2A06A'], [.55, '#FFC98A'], [1, '#FFE6AE']], y / HZ), () => .05);
  s += glow(92, 176, 70, 70, '#FFF1C2', .45) + parts([{ p: ngon(92, 176, 26, 26, 10), c: '#FFE59A', sil: false, sw: 3.5 }]) + cloud(e, 280, 80, .8, '#FFE9CF') + cloud(e, 150, 50, .5, '#FFE9CF');
  s += parts([{ p: [[-10, 262], [60, 236], [150, 256], [230, 226], [310, 248], [400, 230], [400, HZ + 10], [-10, HZ + 10]], c: '#A5B98A' }], 6);
  const h2 = [[-10, 300], [70, 272], [170, 290], [260, 262], [340, 280], [400, 270], [400, 360], [-10, 360]];
  s += parts([{ p: h2, c: '#8DC05E' }], 6);
  s += '<polyline points="' + P([[-10, 300], [60, 290], [140, 292], [220, 276], [300, 272], [400, 286]]) + '" fill="none" stroke="#E6CE96" stroke-width="5" stroke-linecap="round"/>';
  const cart = (x, y, k, cov) => { let o = '<g stroke="' + DK + '" stroke-width="' + (2 * k).toFixed(1) + '" stroke-linejoin="round">'; o += '<polygon points="' + P([[x - 12 * k, y - 4 * k], [x + 8 * k, y - 4 * k], [x + 8 * k, y - 10 * k], [x - 12 * k, y - 10 * k]]) + '" fill="#A8703E"/>'; if (cov) o += '<polygon points="' + P([[x - 12 * k, y - 10 * k], [x - 10 * k, y - 20 * k], [x + 6 * k, y - 20 * k], [x + 8 * k, y - 10 * k]]) + '" fill="#F3E6C8"/>'; o += '<polygon points="' + P(ngon(x - 6 * k, y - 3 * k, 3.5 * k, 3.5 * k, 7)) + '" fill="#6B4428"/><polygon points="' + P(ngon(x + 3 * k, y - 3 * k, 3.5 * k, 3.5 * k, 7)) + '" fill="#6B4428"/><polygon points="' + P([[x + 10 * k, y - 2 * k], [x + 10 * k, y - 9 * k], [x + 20 * k, y - 10 * k], [x + 22 * k, y - 16 * k], [x + 24 * k, y - 10 * k], [x + 20 * k, y - 2 * k]]) + '" fill="#8A5530"/></g>'; return o; };
  s += cart(170, 290, 1, true) + cart(210, 284, 1, false) + cart(250, 276, 1, true) + cart(290, 272, .9, true);
  s += tree(e, 40, 292, 50) + tree(e, 348, 280, 44) + tree(e, 100, 282, 30) + bush(e, 320, 282, 10);
  s += grid(350, H, 8, 14, (x, y) => grad([[0, '#9AD468'], [.5, '#5DB84E'], [1, '#34A04C']], (y - 350) / (H - 350)), e.calm(350));
  const pl = [], pr = []; for (let i = 0; i <= 16; i++) { const t = i / 16, y = 350 + (H + 10 - 350) * t, cx = 195 + Math.sin(t * 3.2 + .4) * 60 * (1 - t * .5), w = 10 + 110 * t * t; pl.push([cx - w, y]); pr.push([cx + w, y]); }
  s += '<polygon points="' + P([...pl, ...pr.reverse()]) + '" fill="#E6CE96" opacity=".55"/><polyline points="' + P(pl) + '" fill="none" stroke="' + DK + '" stroke-width="2.5" opacity=".35"/><polyline points="' + P(pr) + '" fill="none" stroke="' + DK + '" stroke-width="2.5" opacity=".35"/>';
  s += '<polyline points="' + P([[210, 350], [200, 330], [190, 312], [182, 296]]) + '" fill="none" stroke="#E6CE96" stroke-width="7" stroke-linecap="round"/>';
  s += tree(e, 10, 540, 180) + tree(e, 384, 500, 160) + pine(e, 370, 820, 200) + rock(e, 40, 700, 30) + rock(e, 350, 620, 22) + bush(e, 30, 820, 30) + bush(e, 60, 450, 16);
  s += edges(e, 22, 420, 840, (x, y, i) => i % 4 === 0 ? dot(e, x, y, 4.5, ['#FF5A3C', '#FFD23F', '#FFFFFF'][i % 3]) : blade(e, x, y, .85, '#9ACD32'));
  return wrap(s);
}

// ================= CAMP DE RÉFUGIÉS
function camp_refugies() {
  const e = eng(223), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 330; let s = '';
  s += grid(0, HZ + 12, 6, 7, (x, y) => grad([[0, '#F2915A'], [.55, '#FFC07A'], [1, '#FFE3A6']], y / HZ), () => .05);
  s += glow(290, 150, 70, 70, '#FFF1C2', .45) + parts([{ p: ngon(290, 150, 26, 26, 10), c: '#FFE59A', sil: false, sw: 3.5 }]) + cloud(e, 90, 90, .8, '#FFE9CF');
  s += parts([{ p: [[-10, 262], [70, 240], [160, 256], [240, 236], [320, 252], [400, 240], [400, HZ + 10], [-10, HZ + 10]], c: '#8DB86A' }], 6);
  for (let x = -6; x < 400; x += 22 + rnd() * 10) s += pine(e, x, 262 + rnd() * 10, 36 + rnd() * 20, '#3FA85A', '#2E8A4A', '#6B4428', 4);
  s += grid(HZ - 20, H, 8, 16, (x, y) => grad([[0, '#A9CE6A'], [.5, '#7DBE54'], [1, '#4FA84A']], (y - HZ) / (H - HZ)), e.calm(HZ));
  s += palis(e, -8, 160, HZ, 64) + palis(e, 230, 400, HZ, 64);
  s += parts([{ p: [[160, HZ], [160, HZ - 80], [170, HZ - 80], [170, HZ]], c: '#6B4428' }, { p: [[222, HZ], [222, HZ - 80], [232, HZ - 80], [232, HZ]], c: '#6B4428' }, { p: [[154, HZ - 84], [238, HZ - 84], [238, HZ - 74], [154, HZ - 74]], c: '#8A5530' }], 6);
  s += '<polygon points="' + P([[172, HZ], [220, HZ], [250, H], [140, H]]) + '" fill="#D9C39A" opacity=".45"/>';
  s += tent(e, 104, HZ + 2, 44, 34, '#E8C27A') + tent(e, 290, HZ + 4, 48, 36, '#C9A87A') + tent(e, 140, HZ + 10, 30, 24, '#F3E6C8');
  s += tent(e, 44, 460, 110, 96, '#E0662A', '#5C3A22');
  const ht = [[290, 520], [290, 420], [340, 380], [390, 380], [400, 420], [400, 530]];
  s += parts([{ p: [[288, 520], [288, 430], [400, 430], [400, 530]], c: '#F6F0E4' }, { p: [[278, 434], [330, 370], [410, 370], [410, 434]], c: '#FFF8EC' }, { p: [[306, 520], [306, 470], [320, 456], [334, 470], [334, 520]], c: '#8A5530', sw: 2.5 }, { p: [[350, 448], [376, 448], [376, 478], [363, 470], [350, 478]], c: '#2E8A4A', sw: 2.5 }, { p: [[363, 454], [370, 458], [370, 462], [363, 468], [356, 462], [356, 458]], c: '#FF5A3C', sw: 2 }], 6);
  s += parts([{ p: ngon(360, 380, 9, 9, 7), c: '#FF5A3C', sw: 2.5 }], 4) + '<line x1="360" y1="372" x2="360" y2="352" stroke="' + DK + '" stroke-width="3"/>';
  s += '<polyline points="' + P(e.cat([60, 380], [150, 386], 18)) + '" fill="none" stroke="' + DK + '" stroke-width="2"/>' + [[74, 386, '#5AA0C8'], [96, 392, '#FFFFFF'], [120, 392, '#FFD23F'], [138, 388, '#FF7AA8']].map(([x, y, cl]) => '<polygon points="' + P([[x - 7, y - 2], [x + 7, y - 2], [x + 6, y + 14], [x - 6, y + 14]]) + '" fill="' + cl + '" stroke="' + DK + '" stroke-width="2.2" stroke-linejoin="round"/>').join('');
  const barrel = (x, y, r) => parts([{ p: [[x - r, y], [x - r * 1.1, y - r * 1.2], [x - r, y - r * 2.2], [x + r, y - r * 2.2], [x + r * 1.1, y - r * 1.2], [x + r, y]], c: '#A8703E' }, { raw: '<line x1="' + (x - r * 1.05) + '" y1="' + (y - r * .6) + '" x2="' + (x + r * 1.05) + '" y2="' + (y - r * .6) + '" stroke="' + DK + '" stroke-width="3"/><line x1="' + (x - r * 1.05) + '" y1="' + (y - r * 1.7) + '" x2="' + (x + r * 1.05) + '" y2="' + (y - r * 1.7) + '" stroke="' + DK + '" stroke-width="3"/>' }], 6);
  s += barrel(22, 640, 16) + barrel(50, 660, 14) + barrel(360, 700, 18);
  s += parts([{ p: [[330, 800], [392, 800], [392, 750], [330, 750]], c: '#A8703E' }, { p: [[4, 840], [76, 840], [76, 790], [4, 790]], c: '#A8703E' }], 6) + fire(e, 340, 620, .7);
  s += edges(e, 18, 560, 840, (x, y) => blade(e, x, y, .85, '#9ACD32'));
  return wrap(s);
}

// ================= PALISSADE LA NUIT
function palissade_nuit() {
  const e = eng(227), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 420; let s = '';
  s += grid(0, HZ + 12, 6, 8, (x, y) => grad([[0, '#1E2148'], [.6, '#2E3668'], [1, '#4A4A7A']], y / HZ), () => .05);
  for (let i = 0; i < 44; i++) { const x = rnd() * 390, y = 10 + rnd() * 250, r = 1.5 + rnd() * 3; s += '<polygon points="' + P([[x, y - r], [x + r * .35, y], [x, y + r], [x - r * .35, y]]) + '" fill="#FFF1C2" opacity="' + (.5 + rnd() * .5).toFixed(2) + '"/>'; }
  s += glow(92, 110, 70, 70, '#FFE9B0', .12) + '<path d="M92 72 a38 38 0 1 0 30 62 a30 30 0 1 1 -30 -62 z" fill="#FFF1C2" stroke="' + DK + '" stroke-width="4" stroke-linejoin="round"/>';
  s += parts([{ p: [[-10, 330], [80, 300], [170, 322], [260, 296], [340, 316], [400, 304], [400, HZ], [-10, HZ]], c: '#2E4A4A' }], 5);
  for (let x = -6; x < 400; x += 20 + rnd() * 10) s += pine(e, x, 318 + rnd() * 10, 40 + rnd() * 26, '#2E5A48', '#244A3E', '#3B2A1E', 4);
  s += grid(HZ - 30, H, 8, 16, (x, y) => grad([[0, '#3E6A4A'], [1, '#24443A']], (y - HZ) / (H - HZ)), e.calm(HZ, .02, .14));
  s += palis(e, -8, 400, HZ, 110, 18, '#7A5A3E');
  const tower = (x, side) => parts([{ p: e.limb([x - 20, HZ + 6], [x - 16, HZ - 150], 8, 8), c: '#5C3A22' }, { p: e.limb([x + 20, HZ + 6], [x + 16, HZ - 150], 8, 8), c: '#5C3A22' }, { p: [[x - 30, HZ - 150], [x + 30, HZ - 150], [x + 30, HZ - 130], [x - 30, HZ - 130]], c: '#7A5A3E' }, { p: [[x - 34, HZ - 180], [x, HZ - 206], [x + 34, HZ - 180], [x + 30, HZ - 176], [x - 30, HZ - 176]], c: '#5C3A22' }, { p: e.limb([x - 26, HZ - 150], [x - 26, HZ - 178], 5, 5), c: '#5C3A22' }, { p: e.limb([x + 26, HZ - 150], [x + 26, HZ - 178], 5, 5), c: '#5C3A22' }], 6);
  s += tower(40, -1) + tower(350, 1);
  const braz = (x, y) => e.glow(x, y - 20, 90, 70, '#FF8C32', .18) + parts([{ p: e.limb([x, y + 60], [x, y], 6, 6), c: '#3B2A1E' }, { p: [[x - 16, y], [x + 16, y], [x + 10, y + 12], [x - 10, y + 12]], c: '#4A3B2E' }], 5) + fire(e, x, y, .8);
  s += braz(40, HZ - 190) + braz(350, HZ - 190) + braz(120, HZ - 60) + braz(272, HZ - 60);
  s += glow(195, HZ + 40, 200, 40, '#FF8C32', .08);
  s += fire(e, 350, 780, 1) + parts([{ p: e.limb([300, 800], [336, 806], 16, 16), c: '#6B4428' }, { p: e.limb([364, 820], [392, 814], 16, 16), c: '#6B4428' }], 6);
  s += edges(e, 14, 560, 840, (x, y) => blade(e, x, y, .85, '#5E8A4A'));
  return wrap(s);
}

// ================= RUES D'AUBELLE
function aubelle_rues() {
  const e = eng(229), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 380; let s = '';
  s += grid(0, HZ + 12, 6, 8, (x, y) => grad([[0, '#F2A06A'], [.55, '#FFC98A'], [1, '#FFE6AE']], y / HZ), () => .05);
  s += glow(250, 190, 70, 70, '#FFF1C2', .4) + cloud(e, 280, 70, .7, '#FFE9CF');
  s += parts([{ p: [[168, HZ], [168, 150], [186, 130], [204, 150], [204, HZ]], c: '#E8DCC4' }, { p: [[164, 152], [186, 84], [208, 152]], c: '#2E8A6A' }, { p: [[180, 190], [192, 190], [192, 214], [186, 220], [180, 214]], c: '#FFC65A', sw: 2.5, flat: true }], 6);
  s += parts([{ p: [[214, HZ], [214, 250], [276, 250], [276, HZ]], c: '#F3E6C8' }, { p: ngon(245, 250, 32, 34, 20).filter(p => p[1] <= 250.1), c: '#D9A62A' }, { p: [[242, 218], [245, 196], [248, 218]], c: '#FFD23F', sw: 2.5 }], 6);
  s += parts([{ p: [[120, HZ], [120, 230], [150, 230], [150, HZ]], c: '#E8DCC4' }, { p: ngon(135, 230, 17, 20, 14).filter(p => p[1] <= 230.1), c: '#3E7A8A' }], 5);
  s += grid(HZ, H, 8, 16, (x, y) => grad([[0, '#E0CFAE'], [1, '#BFA27A']], (y - HZ) / (H - HZ)), e.calm(HZ, .02, .18));
  for (let k = 1; k < 16; k++) { const t = Math.pow(k / 16, 1.6), y = HZ + (H - HZ) * t, xl = 140 - 140 * t, xr = 250 + 140 * t; s += '<line x1="' + xl.toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + (xl + 60 * t).toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="' + DK + '" stroke-width="1.8" opacity=".2"/><line x1="' + (xr - 60 * t).toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + xr.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="' + DK + '" stroke-width="1.8" opacity=".2"/>'; }
  const fac = side => { const m = side < 0 ? (x => x) : (x => 390 - x), X = u => m(0 + 140 * u), top = u => 40 + 250 * u, bot = u => 580 - 190 * u, pt = (u, v) => [X(u), top(u) + (bot(u) - top(u)) * v]; const S = [{ p: [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)], c: side < 0 ? '#F3E6C8' : '#EADCC0', flat: true }]; [.34, .62].forEach(u => S.push({ raw: '<line x1="' + X(u).toFixed(1) + '" y1="' + top(u).toFixed(1) + '" x2="' + X(u).toFixed(1) + '" y2="' + bot(u).toFixed(1) + '" stroke="' + DK + '" stroke-width="3"/>' })); S.push({ p: [[m(-10), 26], pt(1, -.02), [X(1), top(1) - 16], [m(-10), 0]], c: '#2E8A6A' }); for (const [u0, u1] of [[.06, .2], [.4, .5], [.68, .76], [.84, .9]]) for (const v of [.14, .42]) S.push({ p: [pt(u0, v), pt(u1, v), pt(u1, v + .18), pt(u0, v + .18)], c: '#5AA0C8', sw: 2.5, flat: true }); S.push({ p: [pt(.08, .72), pt(.22, .72), pt(.22, 1), pt(.08, 1)], c: '#8A5530', sw: 2.5 }); return parts(S, 7); };
  s += fac(-1) + fac(1);
  const ban = (x, y, c1, k) => parts([{ p: [[x, y], [x + 18, y], [x + 18, y + 64], [x + 9, y + 54], [x, y + 64]], c: c1 }, { raw: sym(e, x + 9, y + 26, 6, k, '#FFD23F', 1, DK) }], 5);
  s += ban(70, 160, '#C4481F', 't') + ban(300, 160, '#1F7A3D', 'c');
  s += parts([{ p: e.limb([28, 480], [60, 480], 4, 4), c: '#3B2A1E' }, { p: [[40, 482], [64, 482], [64, 506], [40, 506]], c: '#FFD23F' }, { p: [[46, 488], [58, 488], [58, 500], [46, 500]], c: '#8A3B22', sw: 2 }], 4);
  const lamp = (x, b) => glow(x, b - 128, 30, 30, '#FFD23F', .3) + parts([{ p: e.limb([x, b], [x, b - 118], 6, 5), c: '#2E3A30' }, { p: ngon(x, b - 128, 9, 12, 6, Math.PI / 2), c: '#FFC65A', sw: 3 }, { p: [[x - 10, b - 138], [x + 10, b - 138], [x, b - 148]], c: '#2E3A30', sw: 2.5 }], 5);
  s += lamp(40, 740) + lamp(350, 760) + potPlant(e, 20, 830, 32) + potPlant(e, 368, 836, 34) + bush(e, 104, 400, 10) + bush(e, 280, 402, 10);
  return wrap(s);
}

// ================= RÉSERVE INTERDITE
function reserve_interdite() {
  const e = eng(233), { grid, parts, ngon, P, rnd, glow, grad } = e, FL = 450; let s = '';
  s += grid(0, FL + 12, 6, 8, (x, y) => grad([[0, '#3B3046'], [1, '#554658']], y / FL), () => .05);
  for (let y = 20, r = 0; y < FL; y += 30, r++) { s += '<line x1="0" y1="' + y + '" x2="390" y2="' + y + '" stroke="' + DK + '" stroke-width="1.8" opacity=".3"/>'; for (let x = (r % 2) * 26; x < 390; x += 52) s += '<line x1="' + x + '" y1="' + (y - 30) + '" x2="' + x + '" y2="' + y + '" stroke="' + DK + '" stroke-width="1.8" opacity=".24"/>'; }
  const alc = (x0, x1, top) => { const w = x1 - x0, cx = (x0 + x1) / 2, arc = Array.from({ length: 9 }, (_, i) => { const a = Math.PI + i * Math.PI / 8; return [cx + Math.cos(a) * w / 2, top + Math.sin(a) * w / 2]; }); let o = '<g clip-path="url(#ri' + Math.round(x0) + ')">' + shelves(e, x0, x1, top - w / 2, FL, w / 2, 46, ['#6B3E22', '#1F5A3A', '#8A2A1E', '#3E4B6E', '#5B3B6E'], { back: '#241C2A' }) + '</g>'; const clip = '<clipPath id="ri' + Math.round(x0) + '"><polygon points="' + P([[x0, FL], ...arc, [x1, FL]]) + '"/></clipPath>'; let bars = ''; for (let x = x0 + 10; x < x1 - 4; x += 14) bars += e.line([[x, FL], [x, top - Math.sqrt(Math.max(0, (w / 2) ** 2 - (x - cx) ** 2)) + 4]], '#5A5A66', 4, 3); bars += e.line([[x0, top + 40], [x1, top + 40]], '#5A5A66', 5, 3); return clip + o + '<polygon points="' + P([[x0, FL], ...arc, [x1, FL]]) + '" fill="none" stroke="' + DK + '" stroke-width="6" stroke-linejoin="round"/>' + bars + parts([{ p: [[cx - 7, top + 48], [cx + 7, top + 48], [cx + 7, top + 60], [cx - 7, top + 60]], c: '#D9A62A', sw: 2.5 }, { raw: '<path d="M' + (cx - 5) + ' ' + (top + 48) + ' v-5 a5 5 0 0 1 10 0 v5" fill="none" stroke="' + DK + '" stroke-width="2.5"/>' }], 4); };
  s += alc(4, 104, 180) + alc(286, 386, 180);
  s += glow(195, 360, 170, 170, '#FFE59A', .14) + glow(195, 370, 96, 96, '#FFE59A', .24);
  for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + (i - 5.5) * .2; s += '<polygon points="' + P([[195, 380], [195 + Math.cos(a) * 260, 380 + Math.sin(a) * 260], [195 + Math.cos(a + .06) * 260, 380 + Math.sin(a + .06) * 260]]) + '" fill="#FFF1C2" opacity=".14"/>'; }
  s += grid(FL, H, 8, 12, (x, y) => grad([[0, '#6A5A62'], [1, '#4A3E48']], (y - FL) / (H - FL)), e.calm(FL, .02, .14));
  for (let k = -8; k <= 8; k++) if (Math.abs(k) > 3) s += '<line x1="' + (195 + k * 24) + '" y1="' + FL + '" x2="' + (195 + k * 70) + '" y2="' + H + '" stroke="' + DK + '" stroke-width="2" opacity=".3"/>';
  s += '<rect x="-4" y="' + (FL - 4) + '" width="398" height="10" fill="#2E2436" stroke="' + DK + '" stroke-width="2"/>' + glow(195, FL + 30, 110, 26, '#FFE59A', .2);
  s += parts([{ p: [[182, FL + 20], [208, FL + 20], [204, 400], [186, 400]], c: '#6B4428' }, { p: [[170, FL + 24], [220, FL + 24], [214, FL + 14], [176, FL + 14]], c: '#5C3A22' }, { p: [[160, 404], [230, 404], [224, 386], [166, 386]], c: '#8A5530' }, { p: [[168, 388], [195, 380], [195, 370], [170, 376]], c: '#FFF6D8' }, { p: [[195, 380], [222, 388], [220, 376], [195, 370]], c: '#FFF1C2' }], 7);
  s += parts([{ p: [[190, 350], [195, 334], [200, 350], [216, 355], [200, 360], [195, 376], [190, 360], [174, 355]], c: '#FFD23F', sil: false, sw: 2.5 }], 4);
  [[180, 362], [212, 360], [202, 340]].forEach(([x, y]) => s += parts([{ p: [[x, y - 5], [x + 2, y], [x, y + 5], [x - 2, y]], c: '#FFF6D8', sil: false, sw: 1.8 }], 4));
  const cand = (x, y) => parts([{ p: [[x - 5, y], [x + 5, y], [x + 5, y - 26], [x - 5, y - 26]], c: '#EADFC8' }, { p: [[x - 11, y], [x + 11, y], [x + 8, y + 6], [x - 8, y + 6]], c: '#8A7460' }], 5) + '<line x1="' + x + '" y1="' + (y - 26) + '" x2="' + x + '" y2="' + (y - 32) + '" stroke="' + DK + '" stroke-width="2.5" stroke-linecap="round"/>';
  s += cand(40, 720) + cand(350, 740) + e.line([[0, 610], [30, 640], [20, 690], [40, 740]], '#5A5A66', 4, 3) + parts([{ p: [[300, 840], [392, 840], [392, 790], [300, 790]], c: '#6B4428' }, { p: [[300, 790], [392, 790], [384, 770], [308, 770]], c: '#5C3A22' }], 6);
  return wrap(s);
}

// ================= TOUR DE GUET
function tour_guet() {
  const e = eng(239), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 196, LB = 486; let s = '';
  s += grid(0, HZ + 12, 6, 5, (x, y) => grad([[0, '#F2A06A'], [.6, '#FFCB8A'], [1, '#FFE8B4']], y / HZ), () => .05);
  s += ranged(e, [[-10, 170], [40, 120], [96, 160], [150, 118], [206, 166], [260, 110], [320, 150], [370, 104], [400, 140], [400, HZ + 6], [-10, HZ + 6]], '#A9A0C0', .34, 140, 5);
  const cols = ['#9ACD32', '#E8C24A', '#7DBE54', '#B9D66A', '#D9B454', '#5DB84E'];
  let fields = ''; const rows = 7; for (let r = 0; r < rows; r++) { const y0 = HZ + (LB - HZ) * Math.pow(r / rows, 1.4), y1 = HZ + (LB - HZ) * Math.pow((r + 1) / rows, 1.4), n = 5 + r; for (let i = 0; i < n; i++) { const x0 = -20 + 430 * i / n + (rnd() - .5) * 16, x1 = -20 + 430 * (i + 1) / n + (rnd() - .5) * 16; const haze = .45 * (1 - r / rows); const col = gmix(cols[Math.floor(rnd() * cols.length)], '#E8E0D4', haze); fields += '<polygon points="' + P([[x0, y0], [x1, y0], [x1 + (x1 - 195) * .08, y1], [x0 + (x0 - 195) * .08, y1]]) + '" fill="' + col + '" stroke="#5C7A48" stroke-width="1.6" stroke-opacity=".5"/>'; } }
  s += fields;
  s += '<path d="M-10 250 C 80 270, 120 330, 150 360 S 240 420, 300 470 S 380 480, 400 486" fill="none" stroke="#7CC8E0" stroke-width="7" stroke-linecap="round"/>';
  [[40, 232], [120, 250], [320, 240], [60, 400], [350, 390], [300, 300]].forEach(([x, y], i) => s += village(e, x, y, 3, .5 + (y - HZ) / 500));
  [[80, 300], [250, 250], [330, 330], [30, 450]].forEach(([x, y]) => s += bush(e, x, y, 9, '#3FA85A', '#2E8A4A'));
  s += glow(195, 336, 120, 56, '#FFFFFF', .5) + '<polygon points="' + P([[128, 334], [148, 312], [178, 306], [212, 304], [246, 314], [264, 332], [250, 352], [214, 362], [172, 360], [140, 352]]) + '" fill="#FFFFFF" stroke="#5C566B" stroke-width="3" stroke-linejoin="round"/>';
  for (let i = 0; i < 10; i++) { const x = 130 + rnd() * 130, y = 290 + rnd() * 80, k = 3 + rnd() * 3; s += '<polygon points="' + P([[x, y - k], [x + k, y + k * .6], [x - k, y + k * .6]]) + '" fill="#FFFFFF" stroke="#5C566B" stroke-width="1.6"/>'; }
  s += grid(LB, H, 8, 10, (x, y) => grad([[0, '#B8804A'], [1, '#8A5A34']], (y - LB) / (H - LB)), e.calm(LB, .02, .14));
  for (let i = -9; i <= 9; i++) if (Math.abs(i) > 3) s += '<line x1="' + (195 + i * 22) + '" y1="' + LB + '" x2="' + (195 + i * 50) + '" y2="' + H + '" stroke="#5C3A22" stroke-width="2.2" opacity=".35"/>';
  s += e.line([[-10, LB - 2], [400, LB - 2]], '#8A5530', 10, 5);
  for (let x = 40; x < 390; x += 52) s += e.line([[x, LB - 2], [x, LB - 44]], '#8A5530', 7, 4);
  s += e.line([[-10, LB - 44], [400, LB - 44]], '#A8703E', 9, 5);
  s += parts([{ p: [[-6, -10], [26, -10], [30, LB + 10], [-6, LB + 10]], c: '#6B4428' }, { p: [[364, -10], [396, -10], [396, LB + 10], [360, LB + 10]], c: '#6B4428' }, { p: [[-10, -10], [400, -10], [400, 20], [-10, 20]], c: '#5C3A22' }, { p: [[-10, 20], [60, 20], [-10, 80]], c: '#7A4A2A' }, { p: [[400, 20], [330, 20], [400, 80]], c: '#7A4A2A' }], 7);
  s += parts([{ p: ngon(210, 20, 7, 9, 6, Math.PI / 2), c: '#D9A62A' }], 4) + '<line x1="210" y1="11" x2="210" y2="20" stroke="' + DK + '" stroke-width="2.5"/>';
  s += parts([{ p: e.limb([40, 800], [110, 790], 14, 12), c: '#8A5530' }, { p: ngon(110, 790, 8, 8, 7), c: '#D9A62A', sw: 2.5 }], 5) + parts([{ p: [[320, 840], [392, 840], [392, 790], [320, 790]], c: '#A8703E' }], 6);
  return wrap(s);
}

// ================= LISIÈRE
function lisiere() {
  const e = eng(241), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 330; let s = '';
  const sm = x => { const t = Math.max(0, Math.min(1, (x - 150) / 110)); return t * t * (3 - 2 * t); }, T = (c, x) => gmix(c, '#ABA5B8', .62 * sm(x));
  s += grid(0, HZ + 12, 8, 7, (x, y) => T(grad([[0, '#F2915A'], [.55, '#FFC07A'], [1, '#FFE3A6']], y / HZ), x), () => .05);
  s += glow(70, 150, 70, 70, '#FFF1C2', .45) + parts([{ p: ngon(70, 150, 26, 26, 10), c: '#FFE59A', sil: false, sw: 3.5 }]) + cloud(e, 300, 110, 1.2, '#B4AEC2') + cloud(e, 360, 190, .8, '#BDB7CA');
  s += parts([{ p: [[-10, 270], [80, 248], [170, 262], [250, 240], [330, 256], [400, 244], [400, HZ + 10], [-10, HZ + 10]], c: '#8DB86A' }], 6).replace(/#8DB86A/g, '#8DB86A');
  for (let x = -6; x < 400; x += 18 + rnd() * 8) s += pine(e, x, HZ + 4 + rnd() * 8, 60 + rnd() * 40, T('#3FA85A', x), T('#2E8A4A', x), T('#6B4428', x), 5);
  s += grid(HZ, H, 10, 16, (x, y) => T(grad([[0, '#8FD05E'], [1, '#2FA24A']], (y - HZ) / (H - HZ)), x), e.calm(HZ));
  s += '<polyline points="' + P(Array.from({ length: 14 }, (_, i) => [205 + Math.sin(i * 1.7) * 10, HZ + i * 40])) + '" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="6 8" opacity=".5"/>';
  s += tree(e, 20, 520, 190) + tree(e, 70, 420, 110) + pine(e, 10, 760, 220);
  s += tree(e, 372, 520, 190, T('#2E8A4A', 372), T('#3FA85A', 372), T('#6B4428', 372)) + tree(e, 322, 420, 110, T('#2E8A4A', 322), T('#3FA85A', 322), T('#6B4428', 322)) + pine(e, 382, 770, 220, T('#3FA85A', 382), T('#2E8A4A', 382), T('#6B4428', 382));
  for (let i = 0; i < 18; i++) { const x = 290 + rnd() * 100, y = 260 + rnd() * 300, k = 3 + rnd() * 5; s += '<polygon points="' + P([[x, y - k], [x + k, y + k * .6], [x - k, y + k * .6]]) + '" fill="' + (i % 2 ? '#DCD8E2' : '#C9C4D2') + '" stroke="#5C566B" stroke-width="1.8" opacity="' + (.5 + rnd() * .5).toFixed(2) + '"/>'; }
  s += edges(e, 24, 420, 840, (x, y, i) => x < 195 ? (i % 4 === 0 ? dot(e, x, y, 4.5, ['#FF5A3C', '#FFD23F', '#FFFFFF'][i % 3]) : blade(e, x, y, .85, '#9ACD32')) : blade(e, x, y, .85, '#C9C4D2'));
  s += bush(e, 60, 820, 30) + bush(e, 330, 816, 30, '#C9C4D2', '#B8B2C4') + rock(e, 350, 640, 24, '#B8B2C4');
  return wrap(s);
}

// ================= CAMP D'ÉCLAIREURS
function camp_eclaireurs() {
  const e = eng(251), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 330; let s = '';
  s += grid(0, HZ + 12, 6, 7, (x, y) => grad([[0, '#E88A5A'], [.55, '#FFB87A'], [1, '#FFE0A0']], y / HZ), () => .05);
  s += glow(195, 240, 90, 90, '#FFF1C2', .4) + parts([{ p: ngon(195, 240, 28, 28, 10), c: '#FFE59A', sil: false, sw: 3.5 }]);
  for (let x = -6; x < 400; x += 18 + rnd() * 8) s += pine(e, x, HZ + 4 + rnd() * 8, 70 + rnd() * 50 + Math.abs(x - 195) * .3, '#3FA85A', '#2E8A4A', '#6B4428', 5);
  s += grid(HZ, H, 8, 16, (x, y) => grad([[0, '#9AD468'], [1, '#34A04C']], (y - HZ) / (H - HZ)), e.calm(HZ));
  s += tent(e, 70, 470, 130, 110, '#3E8A5A', '#2E3A30') + tent(e, 332, 452, 120, 100, '#C98A4E', '#5C3A22') + tent(e, 160, HZ + 26, 60, 46, '#E8C27A') + tent(e, 250, HZ + 20, 50, 40, '#8DB86A');
  s += '<polyline points="' + P(e.cat([132, 380], [270, 372], 24)) + '" fill="none" stroke="' + DK + '" stroke-width="2"/>' + [[150, 386], [180, 392], [214, 392], [246, 386]].map(([x, y], i) => '<polygon points="' + P([[x - 6, y - 2], [x + 6, y - 2], [x, y + 12]]) + '" fill="' + ['#FF5A3C', '#FFD23F', '#FFFFFF', '#5AA0C8'][i] + '" stroke="' + DK + '" stroke-width="2" stroke-linejoin="round"/>').join('');
  s += parts([{ p: e.limb([10, 700], [30, 540], 7, 6), c: '#6B4428' }, { p: e.limb([74, 700], [54, 540], 7, 6), c: '#6B4428' }, { p: [[-4, 540], [90, 540], [90, 630], [-4, 630]], c: '#A8703E' }, { p: [[6, 550], [48, 548], [50, 590], [8, 592]], c: '#F3E6C8', sw: 2.5 }, { p: [[50, 560], [84, 556], [84, 600], [52, 604]], c: '#EADFC8', sw: 2.5 }, { p: [[14, 596], [44, 598], [42, 624], [16, 622]], c: '#F3E6C8', sw: 2.5 }, { raw: '<path d="M12 560 q10 10 18 4 t16 12" fill="none" stroke="#1F7A3D" stroke-width="2.4"/><path d="M56 570 l10 8 l12 -6" fill="none" stroke="#C4481F" stroke-width="2.4" stroke-dasharray="3 3"/><polygon points="' + P([[70, 580], [73, 586], [67, 586]]) + '" fill="#C4481F"/>' + [[26, 552], [64, 558], [30, 598], [78, 560]].map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="3.2" fill="#FF5A3C" stroke="' + DK + '" stroke-width="1.6"/>').join('') }], 6);
  s += fire(e, 330, 700, 1.1) + [[282, 724], [376, 736], [320, 760]].map(([x, y]) => rock(e, x, y, 10, '#A2988A')).join('') + parts([{ p: e.limb([262, 760], [300, 770], 16, 16), c: '#6B4428' }], 6);
  s += parts([{ p: [[10, 840], [70, 840], [70, 796], [10, 796]], c: '#8A5530' }, { p: e.limb([80, 830], [140, 812], 12, 12), c: '#3E5A8A' }], 6);
  s += edges(e, 18, 480, 840, (x, y) => blade(e, x, y, .85, '#9ACD32'));
  return wrap(s);
}

// ================= FORÊT EFFACÉE
function foret_effacee() {
  const e = eng(257, '#4E4A5E'), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 330; let s = '';
  const T = (c, k) => gmix(c, '#B4AEC2', k);
  s += grid(0, HZ + 12, 6, 7, (x, y) => grad([[0, '#B8B2C8'], [.55, '#D6D0DE'], [1, '#EAE4EC']], y / HZ), () => .04);
  s += glow(195, 180, 110, 110, '#FFFFFF', .5);
  for (let x = -6; x < 400; x += 20 + rnd() * 8) { const k = .55 + rnd() * .35, h = 60 + rnd() * 40; s += pine(e, x, HZ + 4 + rnd() * 8, h, T('#3FA85A', k), T('#2E8A4A', k), T('#6B4428', k), 4); }
  s += grid(HZ, H, 8, 16, (x, y) => T(grad([[0, '#8FD05E'], [1, '#2FA24A']], (y - HZ) / (H - HZ)), .55 - .25 * Math.abs(x - 195) / 195), e.calm(HZ, .02, .14));
  const frag = (x, y, n, spread, k) => { let o = ''; for (let i = 0; i < n; i++) { const dx = (rnd() - .3) * spread, dy = -rnd() * spread * 1.2, r = 4 + rnd() * 8, xx = x + dx, yy = y + dy, a = rnd() * 6; o += '<polygon points="' + P([[xx + Math.cos(a) * r, yy + Math.sin(a) * r], [xx + Math.cos(a + 2.2) * r, yy + Math.sin(a + 2.2) * r], [xx + Math.cos(a + 4.1) * r * .8, yy + Math.sin(a + 4.1) * r * .8]]) + '" fill="' + T(['#3FA85A', '#2E8A4A', '#5DB84E'][i % 3], k + rnd() * .3) + '" stroke="#4E4A5E" stroke-width="2" stroke-linejoin="round" opacity="' + (1 - i / n * .75).toFixed(2) + '"/>'; } return o; };
  [[14, 540, 200, .2], [80, 430, 120, .35], [376, 520, 200, .45], [320, 420, 120, .55]].forEach(([x, yb, h, k]) => { s += tree(e, x, yb, h, T('#2E8A4A', k), T('#3FA85A', k), T('#6B4428', k * .8)); s += frag(x + (x < 195 ? 30 : -30), yb - h * .8, 18, h * .7, k + .15); });
  s += pine(e, 8, 800, 220, T('#3FA85A', .25), T('#2E8A4A', .25), T('#6B4428', .2)) + frag(30, 620, 14, 120, .4);
  s += pine(e, 384, 820, 230, T('#3FA85A', .5), T('#2E8A4A', .5), T('#6B4428', .4)) + frag(360, 630, 16, 130, .6);
  s += edges(e, 22, 420, 840, (x, y, i) => i % 3 ? blade(e, x, y, .85, T('#9ACD32', .45)) : '<polygon points="' + P([[x, y - 5], [x + 5, y + 3], [x - 5, y + 3]]) + '" fill="#E6E2EC" stroke="#4E4A5E" stroke-width="1.8"/>');
  s += mist(e, HZ - 20, 60, '#E6E2EC', .45, .7);
  return wrap(s);
}

// ================= MAISON DE SOINS
function maison_soins() {
  const e = eng(263), { grid, parts, ngon, P, rnd, glow, grad } = e, FL = 470; let s = '';
  for (let x = 0, i = 0; x < 390; x += 30, i++) s += '<rect x="' + x + '" y="0" width="30" height="' + FL + '" fill="' + (i % 2 ? '#D9B48A' : '#CFA87E') + '" stroke="' + DK + '" stroke-width="2"/>';
  s += '<rect x="-4" y="-4" width="398" height="30" fill="#8A5530" stroke="' + DK + '" stroke-width="3"/>' + e.line([[-4, 60], [394, 60]], '#8A5530', 12, 5);
  s += glow(195, 200, 120, 120, '#FFF1C2', .3) + parts([{ p: [[140, 110], [250, 110], [250, 270], [140, 270]], c: '#8A5530' }, { raw: '<rect x="150" y="120" width="90" height="140" fill="#FFE3A6"/><polygon points="150,210 190,196 240,206 240,260 150,260" fill="#8DD05E" stroke="' + DK + '" stroke-width="2"/><line x1="195" y1="120" x2="195" y2="260" stroke="#8A5530" stroke-width="6"/><line x1="150" y1="180" x2="240" y2="180" stroke="#8A5530" stroke-width="6"/>' }, { p: [[132, 268], [258, 268], [254, 282], [136, 282]], c: '#A8703E' }], 6);
  s += '<polygon points="' + P([[150, 280], [240, 280], [300, 720], [90, 720]]) + '" fill="#FFF1C2" opacity=".12"/>';
  const vial = (x, y, w, h, c) => parts([{ p: [[x - w * .2, y - h], [x + w * .2, y - h], [x + w * .2, y - h * .7], [x + w / 2, y - h * .5], [x + w / 2, y], [x - w / 2, y], [x - w / 2, y - h * .5], [x - w * .2, y - h * .7]], c: '#E6F2F4', sw: 2.4 }, { p: [[x - w / 2, y - h * .38], [x + w / 2, y - h * .42], [x + w / 2, y], [x - w / 2, y]], c, sw: 2, flat: true, sil: false }, { p: [[x - w * .24, y - h - 5], [x + w * .24, y - h - 5], [x + w * .24, y - h], [x - w * .24, y - h]], c: '#8A5530', sw: 2, flat: true }], 4);
  const shelf = (x0, x1, y, list) => parts([{ p: [[x0, y], [x1, y], [x1, y + 10], [x0, y + 10]], c: '#8A5530' }], 5) + list.join('');
  s += shelf(-4, 120, 170, [vial(14, 170, 16, 30, '#FF5A3C'), vial(38, 170, 14, 24, '#3DDC5B'), vial(60, 170, 18, 34, '#5AA0C8'), vial(84, 170, 14, 22, '#FFD23F'), vial(104, 170, 16, 28, '#FF7AA8')]);
  s += shelf(-4, 120, 250, [vial(18, 250, 18, 30, '#9ACD32'), vial(44, 250, 14, 26, '#FF8C32'), parts([{ p: ngon(78, 238, 16, 12, 8), c: '#C98A4E' }], 4), vial(106, 250, 16, 30, '#7A3B6E')]);
  s += shelf(270, 394, 170, [vial(286, 170, 16, 28, '#3DDC5B'), vial(310, 170, 14, 34, '#FF5A3C'), vial(334, 170, 18, 26, '#FFD23F'), vial(358, 170, 14, 30, '#5AA0C8'), vial(380, 170, 16, 24, '#FF8C32')]);
  s += shelf(270, 394, 250, [parts([{ p: [[280, 250], [320, 250], [316, 226], [284, 226]], c: '#EADFC8' }], 4), vial(340, 250, 16, 30, '#FF7AA8'), vial(368, 250, 18, 26, '#9ACD32')]);
  const hang = (x, len, r) => { let o = '<line x1="' + x + '" y1="66" x2="' + x + '" y2="' + (66 + len) + '" stroke="' + DK + '" stroke-width="2"/>'; o += parts([{ p: [[x - r * .6, 66 + len], [x + r * .6, 66 + len], [x + r * .45, 66 + len + r * .7], [x - r * .45, 66 + len + r * .7]], c: '#C4481F' }], 4); for (let i = 0; i < 5; i++) o += parts([{ p: ngon(x - r * .6 + i * r * .3, 66 + len + r * .7 + (i % 2 ? 10 : 18) + i * 3, 6, 8, 6, i), c: i % 2 ? '#3FA85A' : '#5DBA4F', sw: 2.2 }], 3); return o; };
  s += hang(40, 26, 22) + hang(110, 40, 18) + hang(280, 36, 18) + hang(350, 22, 22);
  [[170, 62], [186, 62], [206, 62], [222, 62]].forEach(([x, y], i) => s += parts([{ p: [[x - 5, y], [x + 5, y], [x + 2, y + 34], [x - 2, y + 34]], c: i % 2 ? '#9ACD32' : '#C9A24A', sw: 2 }], 3));
  s += grid(FL, H, 8, 12, (x, y) => grad([[0, '#C8905A'], [1, '#9A6A40']], (y - FL) / (H - FL)), e.calm(FL, .02, .14));
  for (let i = -9; i <= 9; i++) if (Math.abs(i) > 4) s += '<line x1="' + (195 + i * 20) + '" y1="' + FL + '" x2="' + (195 + i * 58) + '" y2="' + H + '" stroke="#6B4428" stroke-width="2.2" opacity=".3"/>';
  s += '<rect x="-4" y="' + (FL - 6) + '" width="398" height="12" fill="#8A5530" stroke="' + DK + '" stroke-width="2.5"/>';
  const bed = side => { const m = side < 0 ? (x => x) : (x => 390 - x), M = pts => pts.map(([x, y]) => [m(x), y]); return parts([{ p: M([[-10, 560], [70, 520], [80, 540], [-10, 590]]), c: '#8A5530' }, { p: M([[-10, 590], [80, 540], [80, 580], [-10, 640]]), c: '#FFFFFF' }, { p: M([[-10, 640], [80, 580], [80, 600], [-10, 664]]), c: '#6B4428' }, { p: M([[40, 552], [70, 536], [76, 548], [48, 566]]), c: '#F3E6C8' }, { p: M([[-10, 604], [50, 568], [80, 572], [80, 584], [-10, 640]]), c: '#3FA85A' }, { p: M([[70, 520], [80, 520], [84, 610], [78, 612]]), c: '#6B4428' }], 6); };
  s += bed(-1) + bed(1);
  s += parts([{ p: [[150, 840], [240, 840], [236, 800], [154, 800]], c: '#A8703E' }], 6).replace(/150,840/, '150,840') ;
  s += parts([{ p: [[10, 840], [70, 840], [66, 780], [14, 780]], c: '#EADFC8' }, { p: [[10, 780], [70, 780], [64, 770], [16, 770]], c: '#C98A4E' }], 6) + potPlant(e, 356, 836, 32);
  return wrap(s);
}

// ================= ROUTE DES VILLAGES
function route_villages() {
  const e = eng(269), { grid, parts, ngon, P, rnd, glow, grad } = e, HZ = 330; let s = '';
  s += grid(0, HZ + 12, 6, 7, (x, y) => grad([[0, '#79C0E6'], [.6, '#C4E4EE'], [1, '#FFE6B0']], y / HZ), () => .045);
  s += glow(316, 110, 64, 64, '#FFF6D0', .45) + parts([{ p: ngon(316, 110, 24, 24, 10), c: '#FFE59A', sil: false, sw: 3.5 }]) + cloud(e, 90, 80, .9, '#FFFFFF') + cloud(e, 230, 150, .5, '#FFFFFF');
  s += parts([{ p: [[-10, 250], [70, 224], [150, 244], [230, 220], [320, 238], [400, 226], [400, HZ + 10], [-10, HZ + 10]], c: '#A9C0A0' }], 5);
  const hA = [[-10, 300], [40, 262], [110, 270], [170, 300], [170, 340], [-10, 340]], hB = [[140, 318], [200, 286], [260, 292], [300, 318], [300, 340], [140, 340]], hC = [[250, 300], [320, 256], [400, 262], [400, 340], [250, 340]];
  s += parts([{ p: hA, c: '#9CCB62' }], 6) + parts([{ p: hB, c: '#B8D46A' }], 6) + parts([{ p: hC, c: '#8DC05E' }], 6);
  s += '<g opacity=".4" stroke="' + DK + '" stroke-width="1.6"><line x1="0" y1="300" x2="150" y2="316"/><line x1="40" y1="280" x2="120" y2="300"/><line x1="280" y1="300" x2="400" y2="296"/><line x1="320" y1="276" x2="400" y2="280"/></g>';
  s += village(e, 70, 270, 4, .9) + church(e, 92, 264, .9) + village(e, 214, 296, 3, .7) + village(e, 334, 262, 4, .9) + church(e, 302, 268, .8);
  s += tree(e, 16, 290, 40) + tree(e, 160, 304, 26) + tree(e, 376, 262, 34) + bush(e, 260, 300, 8);
  s += grid(340, H, 8, 14, (x, y) => grad([[0, '#9AD468'], [.5, '#5DB84E'], [1, '#34A04C']], (y - 340) / (H - 340)), e.calm(340));
  const pl = [], pr = []; for (let i = 0; i <= 16; i++) { const t = i / 16, y = 340 + (H + 10 - 340) * t, cx = 200 - Math.sin(t * 2.6 + .3) * 50 * (1 - t * .4), w = 8 + 120 * t * t; pl.push([cx - w, y]); pr.push([cx + w, y]); }
  s += '<polygon points="' + P([...pl, ...pr.reverse()]) + '" fill="#E6CE96" opacity=".55"/><polyline points="' + P(pl) + '" fill="none" stroke="' + DK + '" stroke-width="2.5" opacity=".35"/><polyline points="' + P(pr) + '" fill="none" stroke="' + DK + '" stroke-width="2.5" opacity=".35"/>';
  s += '<polyline points="192,340 198,322 210,306 214,298" fill="none" stroke="#E6CE96" stroke-width="6" stroke-linecap="round"/>';
  s += parts([{ p: e.limb([54, 420], [54, 370], 6, 5), c: '#8A5530' }, { p: [[40, 372], [84, 368], [90, 378], [84, 386], [40, 388]], c: '#F3E6C8', sw: 2.5 }], 5);
  s += parts([{ p: e.limb([352, 440], [352, 392], 6, 5), c: '#8A5530' }, { p: [[366, 392], [322, 388], [316, 398], [322, 406], [366, 408]], c: '#F3E6C8', sw: 2.5 }], 5);
  for (let y = 440; y < H; y += 60) { const k = (y - 340) / 500; s += e.line([[0, y], [40 + 40 * k, y - 24]], '#A8703E', 4, 3) + e.line([[390, y + 20], [350 - 40 * k, y - 4]], '#A8703E', 4, 3); }
  s += tree(e, 12, 520, 170) + tree(e, 378, 600, 180) + bush(e, 40, 780, 28) + bush(e, 350, 820, 32) + rock(e, 30, 660, 22);
  s += edges(e, 22, 440, 840, (x, y, i) => i % 4 === 0 ? dot(e, x, y, 4.5, ['#FF5A3C', '#FFD23F', '#FFFFFF', '#FF7AA8'][i % 4]) : blade(e, x, y, .85, '#9ACD32'));
  return wrap(s);
}

window.DECORS = {
  hautes_gerbes_gris, chemin_collines, camp_refugies, palissade_nuit, aubelle_rues, reserve_interdite, tour_guet, lisiere, camp_eclaireurs, foret_effacee, maison_soins, route_villages,
  prologue_monde: () => prologue(false), prologue_silence: () => prologue(true), prologue_heros, pierrelune_aube: () => pierrelune(false), pierrelune_brume: () => pierrelune(true), maison_maitre, pont_brumes, route_ecole, velis_marche, planque_chats, archives_velis, velis_porte,
  hautes_gerbes, fontclaire, velis_toits, aubelle_biblio, col_vents, ecole_ruines,
  coeur_silence: () => coeur(false), coeur_silence_gueri: () => coeur(true)
};
})();
