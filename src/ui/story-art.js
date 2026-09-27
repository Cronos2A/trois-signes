// Dessins du mode Histoire, repris de la maquette Claude Design
// (design/trois-signes-maquette-lobby/project/Mode Histoire Trois Signes.dc.html) :
// paysage low-poly de la carte, fragments de mémoire, silhouette d'Eldan, icônes des types de combat.
// Chaque fonction renvoie une chaîne SVG.
import { INK, facetSvg } from './icons.js';

function mix(hex, t) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const T = t < 0 ? 0 : 255, a = Math.min(1, Math.abs(t));
  r = Math.round(r + (T - r) * a); g = Math.round(g + (T - g) * a); b = Math.round(b + (T - b) * a);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

const PAL = {
  map: { sky: ['#E9E6EF', '#F3EFE6'], layers: [['#B7B0C4', 150, 70, 5], ['#A9C27A', 270, 60, 6], ['#7FC24A', 420, 50, 6], ['#4BAF4F', 560, 40, 7], ['#2B8745', 700, 30, 8]] }
};

/** Paysage à crêtes facettées (fond de la carte d'une histoire), en « slice » sur son conteneur. */
export function landscape(key = 'map') {
  const p = PAL[key], r = rng(key.length * 97 + 13), gid = 'sky-' + key;
  let s = `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset=".6" stop-color="${p.sky[1]}"/></linearGradient></defs>`;
  s += `<rect width="390" height="844" fill="url(#${gid})"/>`;
  for (const [col, base, amp, cnt] of p.layers) {
    const pts = [], step = 430 / (cnt * 2);
    for (let i = 0; i <= cnt * 2; i++) pts.push([-20 + i * step + (r() - .5) * step * .5, base - (i % 2 ? amp * (.55 + r() * .45) : amp * r() * .25)]);
    let g = '';
    for (let i = 1; i < pts.length; i += 2) {
      const a = pts[i - 1], pk = pts[i], b = pts[i + 1] || [410, base], by = base + amp * .5;
      g += `<polygon points="${a[0]},${a[1]} ${pk[0]},${pk[1]} ${pk[0] + (r() - .5) * 20},${by}" fill="${mix(col, .14)}"/>`;
      g += `<polygon points="${pk[0]},${pk[1]} ${b[0]},${b[1]} ${pk[0] + (r() - .5) * 20},${by}" fill="${mix(col, -.1)}"/>`;
    }
    const d = 'M' + pts.map(q => q.join(',')).join(' L') + ' L410,844 L-20,844 Z';
    s += `<g><path d="${d}" fill="${col}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>${g}<path d="${d}" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></g>`;
  }
  return `<div class="st-land"><svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${s}</svg>${facetSvg(5, 10, 21, 0.12)}</div>`;
}

/** Petit fragment de mémoire (allumé ou éteint). */
export function fragIcon(lit, size) {
  const c = lit ? '#FFE58A' : '#3c6b48', pts = '3,3 17,2 21,7 20,25 14,22 9,26 3,23';
  return `<svg width="${size}" height="${(size * 1.15).toFixed(1)}" viewBox="0 0 24 28" style="display:block;overflow:visible${lit ? ';filter:drop-shadow(0 0 4px rgba(255,220,100,.9))' : ''}" aria-hidden="true">` +
    `<polygon points="${pts}" fill="${c}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>` +
    (lit ? '<polygon points="3,3 17,2 11,14 3,23" fill="#FFF6CF"/>' : '') +
    `<polygon points="${pts}" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/></svg>`;
}

/** Rangée des 6 fragments, les n premiers allumés. */
export const fragPips = (n, size = 20) => Array.from({ length: 6 }, (_, i) => fragIcon(i < n, size)).join('');

/** Grand fragment flottant de l'écran de fin d'histoire. */
export function bigFragment() {
  const O = [[20, 18], [118, 10], [150, 42], [146, 150], [112, 136], [84, 162], [52, 142], [16, 156]], C = [80, 80];
  const cols = ['#FFF8DC', '#FFF1C2', '#FFE89E', '#FFF4CF', '#FFE08A', '#FFEDB3', '#FFF6D6', '#FFE699'];
  const P = pts => pts.map(p => p.join(',')).join(' ');
  return `<svg width="170" height="180" viewBox="0 0 170 180" style="display:block;overflow:visible;filter:drop-shadow(0 0 18px rgba(255,226,120,.95))" aria-hidden="true">` +
    O.map((p, i) => `<polygon points="${P([p, O[(i + 1) % O.length], C])}" fill="${cols[i]}" stroke="${cols[i]}" stroke-width=".5"/>`).join('') +
    `<polygon points="${P(O)}" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>` +
    '<g transform="translate(34,44) scale(1.6)"><polygon points="12,2 22.5,20.5 1.5,20.5" fill="none" stroke="#C4481F" stroke-width="2.6" stroke-linejoin="round"/></g>' +
    '<circle cx="108" cy="62" r="17" fill="none" stroke="#1F7A3D" stroke-width="4.2"/>' +
    [98, 112, 124].map((y, i) => `<path d="M34 ${y} L${[120, 108, 90][i]} ${y}" stroke="#C9A55A" stroke-width="4" stroke-linecap="round"/>`).join('') + '</svg>';
}

/** Silhouette d'Eldan : grise (verrouillé) ou en couleur. */
export function silhouette(mode, w) {
  const g = mode === 'grey', robe = g ? '#6F6979' : '#EFE4CC', skin = g ? '#6F6979' : '#F1C7A1', hair = g ? '#625C6C' : '#F7F4EC';
  const s = `stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"`;
  return `<svg width="${w}" height="${(w * 1.1).toFixed(1)}" viewBox="0 0 100 110" style="display:block" aria-hidden="true">` +
    `<path d="M6 112 C8 82 26 70 50 70 C74 70 92 82 94 112 Z" fill="${robe}" ${s}/>` +
    (g ? '' : `<polygon points="30,96 37,84 44,96" fill="#FF8C32" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><circle cx="64" cy="91" r="6" fill="#3DDC5B" stroke="${INK}" stroke-width="2.2"/>`) +
    `<path d="M28 42 C26 20 38 12 50 12 C62 12 74 20 72 42 C74 52 70 58 66 58 L34 58 C30 58 26 52 28 42 Z" fill="${hair}" ${s}/>` +
    `<circle cx="50" cy="40" r="17" fill="${skin}" ${s}/>` +
    `<path d="M33 44 C34 64 42 78 50 84 C58 78 66 64 67 44 C60 52 40 52 33 44 Z" fill="${hair}" ${s}/>` +
    (g ? '' : `<circle cx="44" cy="38" r="2.3" fill="${INK}"/><circle cx="56" cy="38" r="2.3" fill="${INK}"/><path d="M39 32 L47 33 M53 33 L61 32" stroke="#F7F4EC" stroke-width="3.6" stroke-linecap="round"/>`) +
    '</svg>';
}

const ICO = {
  normal: ['M14.5 17.5 3 6V3h3l11.5 11.5', 'M13 19l6-6', 'M16 16l4 4', 'M19 21l2-2', 'M14.5 6.5 18 3h3v3l-3.5 3.5', 'M5 14l4 4', 'M7 17l-3 3', 'M3 19l2 2'],
  mini_boss: ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z', 'M12 8v5', 'M12 16.5v.5'],
  rencontre: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  lieutenant: ['M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z', 'M5 21h14'],
  boss_final: ['M12 7v14', 'M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z']
};

/** Icône du type de combat (épées, bouclier, duo, couronne, livre). */
export function typeIcon(type, size, color) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" style="display:block;position:relative" aria-hidden="true">` +
    (ICO[type] || ICO.normal).map(d => `<path d="${d}"/>`).join('') + '</svg>';
}

const lucide = (paths, size, w = 3.5) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
export const lockIcon = (size, w) => lucide('<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', size, w);
export const checkIcon = size => lucide('<path d="M20 6 9 17l-5-5"/>', size, 4.5);
export const backIcon = size => lucide('<path d="m15 18-6-6 6-6"/>', size);
export const skipIcon = size => lucide('<path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/>', size, 2.75);
export const chevron = color => `<svg class="st-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
