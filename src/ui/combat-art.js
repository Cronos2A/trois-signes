// Images du combat. Les SVG de ui/sprites.js (maquette Claude Design) sont rastérisés une seule
// fois dans des canvas hors écran, à la bonne taille pour l'écran. Le rendu ne fait ensuite que
// copier ces images (drawImage + transformations) : léger, même sur un téléphone d'entrée de gamme.
import { decorUrl, placeName } from './assets.js';
import { TS } from './sprites.js';

const OUTLINE = 11;                 // épaisseur du contour, comme la maquette
export const REF_W = 390, REF_H = 760; // écran de référence de la maquette (hors barre d'état)

/** Échelle des sprites pour l'écran courant (1 = maquette 390 px de large). */
export const artScale = (W, H) => Math.min(W / REF_W, H / REF_H);

/** Taille de chaque sprite dans la maquette « Combat Forêt de Mousse ». */
export const SPRITE_SCALE = { hero: 0.37, sbire: 0.42, brute: 0.44, boss: 0.55, coin: 0.22, heart: 0.2 };

/** Sprites prêts, lus par le rendu : { img, red, white, w, h, fx, fy, hx, hy } en px CSS.
 *  Le héros est en deux calques alignés quand son sprite le permet : hero (corps) + heroArm (bras armé). */
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

async function bakeSprite(name, scale, dpr, part) {
  const r = TS.sprite(name, { scale: scale * dpr, outline: OUTLINE, part });
  const img = await loadSvg(r.svg);
  const c = canvasOf(r.w, r.h);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return {
    img: c, red: tinted(c, '#FF5A3C'), white: tinted(c, '#FFFFFF'),
    w: r.w / dpr, h: r.h / dpr, fx: r.fx / dpr, fy: r.fy / dpr, hx: r.hx / dpr, hy: r.hy / dpr,
    px: r.px / dpr, py: r.py / dpr   // épaule du bras armé (calque 'weapon')
  };
}

/** Image d'un fichier (assets/ennemis/{id}.svg) à la hauteur voulue ; pieds en bas au centre, tête en haut. */
async function bakeImage(url, height, dpr) {
  const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
  const h = height, w = h * (img.naturalWidth || 1) / (img.naturalHeight || 1);
  const c = canvasOf(w * dpr, h * dpr);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return { img: c, red: tinted(c, '#FF5A3C'), white: tinted(c, '#FFFFFF'), w, h, fx: w / 2, fy: h * 0.96, hx: w / 2, hy: h * 0.04 };
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
export async function prepareCombatArt(heroId, W, H, dpr, enemySprites, extra = []) {
  const k = artScale(W, H), key = [heroId, k.toFixed(3), dpr, ...extra.map(a => a.key)].join('|');
  if (key === bakedKey) return;
  const seq = ++bakeSeq;
  const names = [...new Set(enemySprites)];
  const split = !!TS.sprite(heroId, { part: 'weapon' }).px;
  const jobs = {
    hero: bakeSprite(heroId, SPRITE_SCALE.hero * k, dpr, split ? 'body' : undefined),
    heroArm: split ? bakeSprite(heroId, SPRITE_SCALE.hero * k, dpr, 'weapon') : Promise.resolve(null),
    coin: bakeSprite('coin', SPRITE_SCALE.coin * k, dpr),
    heart: bakeSprite('heart', SPRITE_SCALE.heart * k, dpr),
    ring: bakeFixed(TS.ring(100, 54), 230 * k, dpr),
    gTri: bakeFixed(TS.glyph('tri', '#FF5A3C', 22), 22, dpr),
    gCircle: bakeFixed(TS.glyph('circle', '#3DDC5B', 22), 22, dpr),
    gDot: bakeFixed(TS.glyph('dot', '#FFD23F', 22), 22, dpr)
  };
  for (const n of names) jobs[n] = bakeSprite(n, (SPRITE_SCALE[n] || SPRITE_SCALE.sbire) * k, dpr);
  for (const a of extra) jobs[a.key] = bakeImage(a.url, a.height * k, dpr).catch(() => null);   // boss d'histoire
  const done = await Promise.all(Object.entries(jobs).map(async ([n, p]) => [n, await p]));
  if (seq !== bakeSeq) return;        // une préparation plus récente (autre écran ou héros) l'emporte
  for (const [n, s] of done) ART[n] = s;
  for (const a of extra) if (!ART[a.key]) ART[a.key] = ART[a.fallback];   // image illisible : sprite du rang
  bakedKey = key;
}

let bgKey = '';

/**
 * Dessine le décor dans le canvas de fond (au démarrage et au redimensionnement) : la Forêt de Mousse,
 * ou le lieu du combat (assets/decors/{lieu}.svg). Sans image : dégradé vert du lobby et nom du lieu en petit
 * (Histoire), ou, avec opts { tint, title } (arène provisoire du Voyage), dégradé de la teinte et nom en grand.
 */
export async function paintBackground(cv, W, H, dpr, lieu, opts = null) {
  const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
  const key = pw + 'x' + ph + '|' + (lieu || '') + '|' + (opts ? opts.tint + opts.title : '');
  if (key === bgKey) return;
  bgKey = key;
  if (lieu) return paintPlace(cv, pw, ph, dpr, lieu, key, opts);
  // Le SVG du décor est en « slice » : à la taille de l'écran, il le couvre comme la maquette.
  const svg = TS.bg({}).replace('width="390" height="844"', `width="${pw}" height="${ph}"`);
  const img = await loadSvg(svg);
  if (key !== bgKey) return;          // un autre redimensionnement est passé entre-temps
  cv.width = pw; cv.height = ph;
  cv.getContext('2d').drawImage(img, 0, 0, pw, ph);
}

/** Éclaircit (t > 0) ou assombrit (t < 0) une couleur #rrggbb. */
function shade(hex, t) {
  const n = parseInt(hex.slice(1), 16), T = t < 0 ? 0 : 255, a = Math.abs(t);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v + (T - v) * a));
  return 'rgb(' + c.join(',') + ')';
}

async function paintPlace(cv, pw, ph, dpr, lieu, key, opts) {
  const url = await decorUrl(lieu);
  const img = url ? await new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = url; }) : null;
  if (key !== bgKey) return;
  cv.width = pw; cv.height = ph;
  const x = cv.getContext('2d');
  if (img) {                                                       // image en « cover »
    const s = Math.max(pw / img.naturalWidth, ph / img.naturalHeight), w = img.naturalWidth * s, h = img.naturalHeight * s;
    x.drawImage(img, (pw - w) / 2, (ph - h) / 2, w, h);
    return;
  }
  const g = x.createLinearGradient(0, 0, 0, ph), t = opts && opts.tint;
  if (t) { g.addColorStop(0, shade(t, 0.3)); g.addColorStop(0.45, t); g.addColorStop(1, shade(t, -0.4)); }
  else { g.addColorStop(0, '#3DDC5B'); g.addColorStop(0.45, '#2BA84A'); g.addColorStop(1, '#1F7A3D'); }
  x.fillStyle = g; x.fillRect(0, 0, pw, ph);
  if (opts && opts.title) {                                        // arène provisoire : son nom en grand
    const size = Math.min(40, (pw / dpr) * 0.9 / Math.max(8, opts.title.length) * 1.9) * dpr;
    x.font = `400 ${size}px Caprasimo, Georgia, serif`;
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    x.globalAlpha = 0.5;
    x.lineWidth = 6 * dpr; x.strokeStyle = '#15301E'; x.strokeText(opts.title, pw / 2, ph * 0.56);
    x.fillStyle = '#FFFFFF'; x.fillText(opts.title, pw / 2, ph * 0.56);
    x.globalAlpha = 1;
    return;
  }
  x.font = `700 ${12 * dpr}px Figtree, sans-serif`;
  x.textAlign = 'center'; x.fillStyle = 'rgba(21,48,30,0.55)';
  x.fillText(placeName(lieu), pw / 2, 150 * dpr);        // sous le bandeau du haut
}
