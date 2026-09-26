// Icônes du lobby, reprises de la maquette Claude Design (design/trois-signes-maquette-lobby).
// Chaque fonction renvoie une chaîne SVG.
export const INK = '#15301E';

function mix(hex, t) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const T = t < 0 ? 0 : 255, a = Math.min(1, Math.abs(t));
  r = Math.round(r + (T - r) * a); g = Math.round(g + (T - g) * a); b = Math.round(b + (T - b) * a);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
const LIGHT = -Math.PI * 0.75;
const poly = (points, fill, extra = '') => `<polygon points="${points}" fill="${fill}" ${extra}/>`;

/** Signe à facettes : 'tri' (attaque), 'circle' (esquive), 'dot' (ramasser). */
export function glyph(type, color, size, opt = {}) {
  const out = opt.outline ?? (size < 40 ? 2 : 3.5);
  const sw = out * 24 / size;
  const polys = [];
  let outline;
  const shade = (ang, base = 0) => mix(color, Math.cos(ang - LIGHT) * 0.3 + base);
  if (type === 'tri') {
    const A = [12, 2], B = [22.5, 20.5], C = [1.5, 20.5], G = [12, 14.3];
    const mAB = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], mBC = [12, 20.5], mCA = [(C[0] + A[0]) / 2, (C[1] + A[1]) / 2];
    const f = (pts, v) => polys.push([pts.map(p => p.join(',')).join(' '), mix(color, v)]);
    f([A, mAB, G], 0.12); f([mAB, B, G], -0.08); f([B, mBC, G], -0.3); f([mBC, C, G], -0.2); f([C, mCA, G], 0.3); f([mCA, A, G], 0.4);
    outline = [A, B, C].map(p => p.join(',')).join(' ');
  } else {
    const n = opt.n ?? (type === 'circle' ? 8 : 6), R = type === 'circle' ? 10.5 : 6.5, ri = R * 0.55;
    const O = [], I = [];
    for (let i = 0; i < n; i++) {
      const a = i * 2 * Math.PI / n - Math.PI / 2;
      O.push([12 + R * Math.cos(a), 12 + R * Math.sin(a)]);
      const b = a + Math.PI / n;
      I.push([12 + ri * Math.cos(b), 12 + ri * Math.sin(b)]);
    }
    const P = pts => pts.map(p => p[0].toFixed(2) + ',' + p[1].toFixed(2)).join(' ');
    for (let i = 0; i < n; i++) {
      const a = i * 2 * Math.PI / n - Math.PI / 2, j = (i + 1) % n, k = (i - 1 + n) % n;
      polys.push([P([O[i], O[j], I[i]]), shade(a + Math.PI / n, -0.06)]);
      polys.push([P([I[k], O[i], I[i]]), shade(a, 0.02)]);
      polys.push([P([[12, 12], I[i], I[j]]), shade(a + 2 * Math.PI / n, 0.14)]);
    }
    outline = P(O);
  }
  const dim = opt.fluid ? 'width="100%" height="100%"' : `width="${size}" height="${size}"`;
  return `<svg ${dim} viewBox="0 0 24 24" style="display:block;overflow:visible" aria-hidden="true">` +
    polys.map(p => poly(p[0], p[1], `stroke="${p[1]}" stroke-width="0.3" stroke-linejoin="round"`)).join('') +
    poly(outline, 'none', `stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"`) + '</svg>';
}

export function gemIcon(size) {
  const c = '#FF5A3C';
  const f = [['4,9 12,3 12,9', mix(c, .4)], ['12,3 20,9 12,9', mix(c, .1)], ['4,9 12,9 12,21', c], ['12,9 20,9 12,21', mix(c, -.3)]];
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block" aria-hidden="true">` +
    f.map(p => poly(p[0], p[1], `stroke="${p[1]}" stroke-width=".3"`)).join('') +
    poly('4,9 12,3 20,9 12,21', 'none', `stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"`) + '</svg>';
}

// Armes. Les trois dernières (gantelets, grimoire, amulette) n'existent pas dans la maquette :
// dessinées dans le même style pour Boran, Ilwen et Mira.
const WEAPONS = {
  epee: [['M8 16 L19 5 L19 8 L10 18', 1], ['M5.5 13.5 L10.5 18.5'], ['M7 17 L4 20']],
  dague: [['M10 14 L17.5 6.5 L17 10 L12 16', 1], ['M8 12 L14 18'], ['M9.5 15.5 L6 19']],
  arc: [['M8 3 C 19 7 19 17 8 21'], ['M8 3 L8 21'], ['M4 12 L18.5 12'], ['M15.5 9 L19 12 L15.5 15', 1]],
  marteau: [['M5 19.5 L13 11.5'], ['M11 7.5 L16.5 13 L20 9.5 L14.5 4 Z', 1]],
  baton: [['M5.5 20 L15.5 9'], ['M18 3.5 L21 6.5 L18 9.5 L15 6.5 Z', 1]],
  lance: [['M4 20 L15 9'], ['M13 7 L20.5 3.5 L17 11 Z', 1]],
  gantelets: [['M6 11 Q6 8 9 8 L16 8 Q19 8 19 11 L19 15 Q19 18.5 15.5 18.5 L9.5 18.5 Q6 18.5 6 15 Z', 1], ['M10 8 L10 12'], ['M13.5 8 L13.5 12'], ['M8 18.5 L8 21.5 L17 21.5 L17 18.5']],
  grimoire: [['M4.5 5 L12 7 L19.5 5 L19.5 18 L12 20 L4.5 18 Z', 1], ['M12 7 L12 20'], ['M7.5 10 L9.5 10.6'], ['M14.5 10.6 L16.5 10']],
  amulette: [['M7 3 L12 10 L17 3'], ['M12 10 L16.5 14.5 L12 20.5 L7.5 14.5 Z', 1]]
};
export function wIcon(kind, size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" style="display:block" aria-hidden="true">` +
    WEAPONS[kind].map(p => `<path d="${p[0]}" fill="${p[1] ? '#FFF1D6' : 'none'}"/>`).join('') + '</svg>';
}

export function trailIcon(color, size) {
  const pts = '3,18 8,9 13,15 19,5';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;overflow:visible" aria-hidden="true">` +
    `<polyline points="${pts}" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<g transform="translate(12.5,-6.5) scale(.55)"><polygon points="12,5 18,9 18,15 12,19 6,15 6,9" fill="#FFD23F" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/></g></svg>`;
}

/** Fond à facettes triangulaires, posé en absolu sur son conteneur. */
export function facetSvg(cols, rows, seed, alpha) {
  const r = rng(seed), P = [];
  for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) {
    const jx = x > 0 && x < cols ? (r() - .5) * .8 : 0, jy = y > 0 && y < rows ? (r() - .5) * .8 : 0;
    P.push([(x + jx) * 100 / cols, (y + jy) * 100 / rows]);
  }
  const id = (x, y) => P[y * (cols + 1) + x].map(v => v.toFixed(2)).join(','), tris = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const a = id(x, y), b = id(x + 1, y), c = id(x + 1, y + 1), d = id(x, y + 1);
    if ((x + y) % 2) tris.push(a + ' ' + b + ' ' + c, a + ' ' + c + ' ' + d);
    else tris.push(a + ' ' + b + ' ' + d, b + ' ' + c + ' ' + d);
  }
  return '<svg class="facets" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
    tris.map(t => { const w = r() > .5; return poly(t, w ? '#fff' : '#000', `fill-opacity="${(r() * alpha * (w ? 1.2 : .8)).toFixed(3)}"`); }).join('') + '</svg>';
}

// Intensité des facettes : valeur par défaut de la maquette (facetIntensity 0.12).
const FI = 0.12;
export const facets = {
  bg: () => facetSvg(6, 13, 7, FI),
  small: () => facetSvg(3, 3, 3, FI * 2),
  med: () => facetSvg(5, 4, 11, FI * 1.6)
};
