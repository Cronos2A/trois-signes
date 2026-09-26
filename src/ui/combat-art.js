// Images du combat. Les SVG de ui/sprites.js (maquette Claude Design) sont rastérisés une seule
// fois dans des canvas hors écran, à la bonne taille pour l'écran. Le rendu ne fait ensuite que
// copier ces images (drawImage + transformations) : léger, même sur un téléphone d'entrée de gamme.
import { TS } from './sprites.js';

const OUTLINE = 11;                 // épaisseur du contour, comme la maquette
export const REF_W = 390, REF_H = 760; // écran de référence de la maquette (hors barre d'état)

/** Échelle des sprites pour l'écran courant (1 = maquette 390 px de large). */
export const artScale = (W, H) => Math.min(W / REF_W, H / REF_H);

/** Taille de chaque sprite dans la maquette « Combat Forêt de Mousse ». */
export const SPRITE_SCALE = { hero: 0.37, sbire: 0.42, brute: 0.44, boss: 0.55, coin: 0.22, heart: 0.2 };

/** Sprites prêts, lus par le rendu : { img, red, white, w, h, fx, fy, hx, hy } en px CSS. */
export const ART = {};
let bakedKey = '', bakeSeq = 0;

function loadSvg(svg) {
  return new Promise((ok, ko) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(url); ko(new Error('image SVG illisible')); };
    img.src = url;
  });
}

function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}

/** Copie teintée (flash rouge ou blanc) : même silhouette, couleur posée par-dessus. */
function tinted(src, col) {
  const c = canvasOf(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  return c;
}

async function bakeSprite(name, scale, dpr) {
  const r = TS.sprite(name, { scale: scale * dpr, outline: OUTLINE });
  const img = await loadSvg(r.svg);
  const c = canvasOf(r.w, r.h);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return {
    img: c, red: tinted(c, '#FF5A3C'), white: tinted(c, '#FFFFFF'),
    w: r.w / dpr, h: r.h / dpr, fx: r.fx / dpr, fy: r.fy / dpr, hx: r.hx / dpr, hy: r.hy / dpr
  };
}

/** SVG à taille fixe (anneau, glyphes) : on force sa taille en pixels. */
async function bakeFixed(svg, size, dpr) {
  const px = Math.round(size * dpr);
  const img = await loadSvg(svg.replace(/width="[\d.]+" height="[\d.]+"/, `width="${px}" height="${px}"`));
  const c = canvasOf(px, px);
  c.getContext('2d').drawImage(img, 0, 0, px, px);
  return { img: c, w: size, h: size };
}

/**
 * Prépare tous les sprites du combat pour cet écran et ce héros.
 * Ne refait rien si rien n'a changé ; sinon remplace les images une fois prêtes.
 */
export async function prepareCombatArt(heroId, W, H, dpr, enemySprites) {
  const k = artScale(W, H), key = [heroId, k.toFixed(3), dpr].join('|');
  if (key === bakedKey) return;
  const seq = ++bakeSeq;
  const names = [...new Set(enemySprites)];
  const jobs = {
    hero: bakeSprite(heroId, SPRITE_SCALE.hero * k, dpr),
    coin: bakeSprite('coin', SPRITE_SCALE.coin * k, dpr),
    heart: bakeSprite('heart', SPRITE_SCALE.heart * k, dpr),
    ring: bakeFixed(TS.ring(100, 54), 230 * k, dpr),
    gTri: bakeFixed(TS.glyph('tri', '#FF5A3C', 22), 22, dpr),
    gCircle: bakeFixed(TS.glyph('circle', '#3DDC5B', 22), 22, dpr),
    gDot: bakeFixed(TS.glyph('dot', '#FFD23F', 22), 22, dpr)
  };
  for (const n of names) jobs[n] = bakeSprite(n, (SPRITE_SCALE[n] || SPRITE_SCALE.sbire) * k, dpr);
  const done = await Promise.all(Object.entries(jobs).map(async ([n, p]) => [n, await p]));
  if (seq !== bakeSeq) return;        // une préparation plus récente (autre écran ou héros) l'emporte
  for (const [n, s] of done) ART[n] = s;
  bakedKey = key;
}

let bgKey = '';

/** Dessine le décor de la Forêt de Mousse dans le canvas de fond (au démarrage et au redimensionnement). */
export async function paintBackground(cv, W, H, dpr) {
  const pw = Math.round(W * dpr), ph = Math.round(H * dpr), key = pw + 'x' + ph;
  if (key === bgKey) return;
  bgKey = key;
  // Le SVG du décor est en « slice » : à la taille de l'écran, il le couvre comme la maquette.
  const svg = TS.bg({}).replace('width="390" height="844"', `width="${pw}" height="${ph}"`);
  const img = await loadSvg(svg);
  if (key !== bgKey) return;          // un autre redimensionnement est passé entre-temps
  cv.width = pw; cv.height = ph;
  cv.getContext('2d').drawImage(img, 0, 0, pw, ph);
}
