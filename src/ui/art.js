// Dessins low-poly des héros et des ennemis, repris tels quels de la planche Claude Design
// (design/planche-de-personnages-trois-signes). Chaque entrée est une chaîne SVG qui
// s'adapte à son conteneur (largeur/hauteur à fixer en CSS).
// Seul changement par rapport à la maquette : le <svg> n'a plus de taille fixe.

function buildArt(o) {
    const OL = '#17251B'; let LX = -0.55; const LY = -0.83;
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const mix = (h, t, k) => '#' + rgb(h).map((v, i) => Math.round(v + (t[i] - v) * k).toString(16).padStart(2, '0')).join('');
    const sh = (h, a) => a >= 0 ? mix(h, [255, 248, 222], Math.min(a, .9)) : mix(h, [16, 28, 32], Math.min(-a, .9));
    const P = pts => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
    const nrm = a => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; }, perp = a => [-a[1], a[0]];
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
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
    const parts = S => {
      let sil = '', body = '';
      for (const q of S) {
        if (q.raw !== undefined) { body += q.raw; continue; }
        const pp = P(q.p);
        if (q.sil !== false) sil += `<polygon points="${pp}" fill="${OL}" stroke="${OL}" stroke-width="${o.ol}" stroke-linejoin="round"/>`;
        body += `<g${q.o != null ? ` opacity="${q.o}"` : ''}><polygon points="${pp}" fill="${q.c}" stroke="${q.sw === 0 ? 'none' : OL}" stroke-width="${q.sw ?? 4.5}" stroke-linejoin="round"/>${facets(q.p, q.c)}</g>`;
      }
      return sil + body;
    };
    const socle = (cx, y, rx, top, side) => {
      const t = ngon(cx, y, rx, rx * .2, 10, 0), fr = t.slice(0, 6);
      const B = [{ p: [...fr, ...fr.map(p => [p[0], p[1] + 18]).reverse()], c: side }, { p: t, c: top }];
      [[-.62, .1], [.5, .14], [.78, .02]].forEach(([u, v]) => { const x = cx + u * rx, yy = y + v * rx; B.push({ p: [[x - 7, yy], [x - 2, yy - 13], [x + 1, yy - 4], [x + 5, yy - 11], [x + 8, yy]], c: '#9ACD32', sw: 3, sil: false }); });
      return parts(B) + `<polygon points="${P(ngon(cx + rx * .1, y + 1, rx * .6, rx * .12, 9))}" fill="${OL}" opacity=".3"/>`;
    };
    const svg = (C) => {
      LX = C.flip ? .55 : -.55;
      const [cx, y, rx] = C.base; const hero = !C.enemy;
      const base = o.socles ? socle(cx, y, rx, hero ? '#3DDC5B' : '#2E8A4A', hero ? '#1F7A3D' : '#14502A') : `<polygon points="${P(ngon(cx + rx * .1, y + 1, rx * .6, rx * .12, 9))}" fill="${OL}" opacity=".3"/>`;
      const inner = base + parts(C.S);
      return `<svg viewBox="0 0 ${C.W} ${C.H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible">${C.flip ? `<g transform="translate(${C.W} 0) scale(-1 1)">${inner}</g>` : inner}</svg>`;
    };
    // body helpers
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
    };
    const glow = (S, x, y, r, c, op) => S.push({ p: ngon(x, y, r, r, 12, .2), c, o: op, sil: false, sw: 0 });
    const spark = (S, x, y, s, c) => S.push({ p: [[x, y - s], [x + s * .45, y], [x, y + s], [x - s * .45, y]], c, sw: 3, sil: false });
    const face = (x, y, r, f) => {
      const fx = x + r * .14, ey = y + r * .04, e1 = fx - r * .34, e2 = fx + r * .3, E = f.eyes || ['normal', 'normal'];
      let s = '';
      const eye = (ex, kind) => {
        const rx = r * .15, ry = r * .21;
        if (kind === 'closed') return `<polyline points="${P([[ex - rx, ey], [ex, ey + ry * .15], [ex + rx, ey - ry * .1]])}" fill="none" stroke="${OL}" stroke-width="${r * .09}" stroke-linecap="round" stroke-linejoin="round"/>`;
        if (kind === 'happy') return `<polyline points="${P([[ex - rx, ey + ry * .25], [ex, ey - ry * .45], [ex + rx, ey + ry * .25]])}" fill="none" stroke="${OL}" stroke-width="${r * .1}" stroke-linecap="round" stroke-linejoin="round"/>`;
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
    const C = {};
    // ALDRIC
    (() => {
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
      C.aldric = { S, W: 240, H: 320, base: [122, 290, 80] };
    })();
    // NYRA
    (() => {
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
      C.nyra = { S, W: 240, H: 320, base: [120, 290, 80] };
    })();
    // BORAN
    (() => {
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
      C.boran = { S, W: 240, H: 320, base: [121, 290, 86] };
    })();
    // ILWEN
    (() => {
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
      C.ilwen = { S, W: 240, H: 320, base: [121, 290, 80] };
    })();
    // KESTREL
    (() => {
      const S = [], sk = '#F6C9A0', A = '#9ACD32', tu = '#6E4A2E', pa = '#4A3B2E', bt = '#5C3A22', hr = '#D9622B';
      S.push({ p: limb([92, 118], [106, 194], 18, 18), c: bt });
      [[84, 114], [96, 108], [106, 114]].forEach(([x, y]) => S.push({ p: [[x - 5, y + 6], [x, y - 12], [x + 5, y + 6]], c: '#FF5A3C', sw: 3 }));
      S.push({ p: [[96, 132], [140, 130], [150, 160], [112, 250], [68, 236], [78, 170]], c: '#2E7A3E' });
      S.push({ p: [[96, 82], [70, 70], [48, 98], [62, 116], [88, 102]], c: hr });
      leg(S, [108, 196], [92, 240], [80, 286], pa, bt, 20, -1);
      leg(S, [134, 196], [150, 240], [160, 286], pa, bt, 20, 1);
      S.push({ p: [[100, 134], [142, 132], [150, 166], [140, 200], [104, 200], [94, 166]], c: tu });
      S.push({ p: limb([96, 190], [148, 190], 9, 9), c: A });
      const bow = [[186, 54], [202, 76], [212, 104], [215, 138], [212, 172], [202, 200], [186, 222]];
      for (let i = 0; i < bow.length - 1; i++) S.push({ p: limb(bow[i], bow[i + 1], i === 0 || i === 5 ? 8 : 11, i === 0 || i === 5 ? 11 : 11), c: A });
      S.push({ raw: `<polyline points="186,54 140,128 186,222" fill="none" stroke="#F8EED6" stroke-width="2.2"/>` });
      arm(S, [142, 144], [176, 142], [212, 138], { u: tu, hand: sk, w: 15, hr: 9 });
      S.push({ p: limb([130, 128], [228, 138], 4.5, 4.5), c: '#8A5530', sw: 3 });
      S.push({ p: [[226, 132], [240, 139], [226, 145]], c: '#DCE5EC', sw: 3 });
      head(S, 124, 96, 34, sk);
      S.push({ p: [[90, 94], [94, 68], [120, 58], [150, 66], [158, 88], [144, 78], [124, 76], [104, 86]], c: hr });
      S.push({ p: limb([91, 80], [157, 74], 7, 7), c: A, sw: 3 });
      S.push(face(124, 96, 34, { skin: sk, brow: 'angry', mouth: 'focus', eyes: ['closed', 'normal'], iris: '#6B4A22' }));
      arm(S, [106, 144], [82, 136], [140, 128], { u: tu, hand: sk, w: 15, hr: 9 });
      C.kestrel = { S, W: 240, H: 320, base: [120, 290, 80] };
    })();
    // MIRA
    (() => {
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
      C.mira = { S, W: 240, H: 320, base: [122, 290, 78] };
    })();
    const E = '#3B2C4A', E2 = '#55406A', D = '#261C30', bone = '#EADFC8', Y = '#FFD23F', R = '#FF5A3C';
    const glare = pts => `<polygon points="${P(pts)}" fill="${Y}" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>`;
    // SBIRE
    (() => {
      const S = [];
      S.push({ p: [[100, 236], [70, 246], [50, 226], [40, 240], [58, 258], [98, 252]], c: E });
      leg(S, [108, 238], [94, 262], [96, 286], E, D, 13, -1);
      arm(S, [106, 206], [86, 226], [82, 246], { u: E, hand: E2, w: 11, hr: 8 });
      S.push({ p: [[100, 196], [140, 192], [150, 222], [136, 246], [106, 246], [94, 222]], c: E2 });
      S.push({ p: [[98, 226], [146, 222], [138, 240], [120, 234], [104, 242]], c: '#7A3B3B' });
      leg(S, [132, 238], [152, 260], [148, 286], E, D, 13, 1);
      S.push({ p: [[96, 158], [54, 136], [92, 178]], c: E }); S.push({ p: [[152, 156], [192, 130], [156, 176]], c: E });
      S.push({ p: [[92, 150], [112, 136], [140, 134], [160, 150], [158, 178], [140, 198], [108, 198], [90, 178]], c: E });
      S.push({ p: [[106, 140], [96, 112], [118, 136]], c: bone }); S.push({ p: [[134, 136], [148, 110], [148, 140]], c: bone });
      S.push({ raw: glare([[100, 158], [122, 166], [104, 174]]) + glare([[132, 166], [154, 156], [150, 174]]) + `<polygon points="${P(limb([100, 154], [124, 162], 5, 4))}" fill="${OL}"/><polygon points="${P(limb([130, 162], [156, 152], 4, 5))}" fill="${OL}"/><polygon points="106,182 150,177 142,191 112,193" fill="#1A0F1F" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/><polyline points="108,183 113,189 118,182 123,189 128,181 133,188 138,180 143,186 148,178" fill="none" stroke="#FFFDF6" stroke-width="2.2" stroke-linejoin="round"/>` });
      sword(S, [168, 214], [200, 172], { bw: 13, guard: 8, col: '#8E97A0', guardCol: '#5C3A22', edge: '#C8CED4' });
      arm(S, [140, 206], [160, 226], [168, 214], { u: E, hand: E2, w: 11, hr: 8 });
      C.sbire = { S, W: 240, H: 320, base: [120, 290, 64], flip: true, enemy: true };
    })();
    // BRUTE
    (() => {
      const S = [];
      arm(S, [98, 132], [62, 190], [68, 248], { u: E, hand: E2, w: 34, hr: 25 });
      [[54, 264], [68, 268], [82, 264]].forEach(([x, y]) => S.push({ p: [[x - 5, y - 10], [x + 5, y - 10], [x, y + 6]], c: bone, sw: 3 }));
      leg(S, [120, 232], [108, 260], [100, 288], E, D, 32, -1);
      leg(S, [178, 232], [192, 260], [200, 288], E, D, 32, 1);
      S.push({ p: [[90, 120], [150, 98], [210, 116], [226, 170], [198, 238], [106, 240], [78, 180]], c: E2 });
      S.push({ p: [[118, 170], [170, 166], [178, 214], [112, 216]], c: E });
      S.push({ raw: `<polyline points="132,180 144,192 138,204 152,210" fill="none" stroke="${R}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` });
      S.push({ p: [[96, 118], [86, 90], [112, 110]], c: bone }); S.push({ p: [[200, 110], [214, 84], [216, 118]], c: bone });
      S.push({ p: [[124, 96], [146, 80], [172, 84], [186, 104], [178, 130], [154, 144], [130, 138], [120, 116]], c: E });
      S.push({ p: [[128, 92], [100, 62], [110, 50], [140, 84]], c: bone }); S.push({ p: [[172, 86], [194, 54], [206, 62], [184, 96]], c: bone });
      S.push({ raw: glare([[134, 104], [152, 110], [138, 116]]) + glare([[160, 110], [178, 102], [174, 116]]) + `<polygon points="${P(limb([132, 100], [154, 106], 6, 4))}" fill="${OL}"/><polygon points="${P(limb([158, 106], [180, 98], 4, 6))}" fill="${OL}"/><polygon points="136,124 176,120 170,132 142,134" fill="#1A0F1F" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/><polygon points="140,128 144,114 149,127" fill="${bone}" stroke="${OL}" stroke-width="2.5"/><polygon points="162,125 167,111 171,124" fill="${bone}" stroke="${OL}" stroke-width="2.5"/>` });
      S.push({ p: limb([226, 128], [258, 62], 12, 17), c: '#5C3A22' });
      S.push({ p: ngon(260, 56, 27, 31, 6, .3), c: '#7A6A5E' });
      [[240, 36, -1], [282, 46, 1], [262, 24, 0], [284, 70, 1]].forEach(([x, y]) => S.push({ p: [[x - 6, y + 6], [x, y - 12], [x + 6, y + 6]], c: bone, sw: 3 }));
      arm(S, [206, 128], [238, 154], [226, 124], { u: E, hand: E2, w: 34, hr: 22 });
      C.brute = { S, W: 300, H: 320, base: [150, 290, 108], flip: true, enemy: true };
    })();
    // BOSS
    (() => {
      const S = [], ar = '#4A3A5E', gold = '#D9A62A';
      S.push({ p: [[130, 140], [230, 136], [278, 300], [262, 374], [238, 342], [214, 384], [190, 348], [160, 386], [138, 346], [110, 378], [94, 300]], c: '#2A1F36' });
      glow(S, 112, 50, 44, R, .3);
      arm(S, [128, 156], [94, 124], [110, 86], { u: ar, hand: E, w: 26, hr: 17 });
      [[98, 72], [108, 66], [120, 70]].forEach(([x, y]) => S.push({ p: [[x - 4, y + 6], [x, y - 12], [x + 4, y + 6]], c: bone, sw: 3 }));
      S.push({ p: [[94, 70], [102, 34], [112, 52], [122, 20], [132, 50], [140, 40], [134, 74]], c: R, sw: 3.5, sil: false });
      S.push({ p: [[104, 70], [110, 50], [118, 60], [124, 40], [128, 72]], c: Y, sw: 3, sil: false });
      leg(S, [160, 262], [144, 318], [134, 388], ar, D, 32, -1);
      leg(S, [204, 262], [224, 318], [232, 388], ar, D, 32, 1);
      S.push({ p: [[132, 138], [228, 136], [244, 190], [220, 270], [140, 270], [118, 190]], c: ar });
      S.push({ p: [[152, 150], [208, 150], [214, 196], [180, 226], [146, 196]], c: E });
      glow(S, 180, 186, 26, R, .4);
      S.push({ p: ngon(180, 186, 13, 17, 6, Math.PI / 2), c: R });
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
      arm(S, [232, 152], [262, 198], [238, 236], { u: ar, hand: E, w: 26, hr: 18 });
      C.boss = { S, W: 360, H: 420, base: [184, 390, 132], flip: true, enemy: true };
    })();
  const out = {};
  for (const k of Object.keys(C)) out[k] = svg(C[k]);
  return out;
}

let cache = null;
/** { aldric, nyra, boran, ilwen, kestrel, mira, sbire, brute, boss } → chaîne SVG */
export function art() {
  return cache || (cache = buildArt({ ol: 11, fc: 1, socles: true }));
}
