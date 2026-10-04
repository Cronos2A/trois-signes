// Icône et écran de démarrage de l'application Android, tout régénéré depuis UN fichier source : assets/icone-app/icone.svg
// (ou icone.png). Lancer depuis le dossier du jeu : npm run icons (puis recompiler l'application).
//  - SVG avec deux calques id="fond" et id="logo" : icône adaptative (arrière-plan = fond, premier plan = logo, icône monochrome
//    d'Android 13 = silhouette du logo), écran de démarrage (fond vert foncé + logo) ;
//  - toute autre image (SVG sans ces calques, PNG carré d'au moins 1024 px) : elle sert de premier plan, sur un fond uni BG.
// Sorties : android/app/src/main/res (mipmap-*, drawable-*, mipmap-anydpi-v26, values/ic_launcher_background.xml) et
// assets/icone-app/sortie/icone-play-store-512.png (icône de la fiche Play Store, 512 × 512).
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

const ROOT = process.cwd(), SRC_DIR = join(ROOT, 'assets/icone-app'), RES = join(ROOT, 'android/app/src/main/res');
const BG = '#174A28';                                                 // vert foncé du jeu (fond uni et écran de démarrage)
const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const SPLASH = { port: { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] } };
SPLASH.land = Object.fromEntries(Object.entries(SPLASH.port).map(([d, [w, h]]) => [d, [h, w]]));

if (!existsSync(RES)) { console.error('Lancer depuis le dossier du jeu (android/ doit exister : npx cap add android).'); process.exit(1); }
const svgPath = join(SRC_DIR, 'icone.svg'), pngPath = join(SRC_DIR, 'icone.png');
let fond, logo;                                                       // tampons PNG 1024 × 1024 : arrière-plan, premier plan
if (existsSync(svgPath)) {
  const svg = readFileSync(svgPath, 'utf8');
  const only = keep => Buffer.from(svg.replace(/<g id="(fond|logo)"/g, (m, id) => (id === keep ? m : m + ' display="none"')));
  const render = b => sharp(b, { density: 300 }).resize(1024, 1024).png().toBuffer();
  if (/<g id="fond"/.test(svg) && /<g id="logo"/.test(svg)) { fond = await render(only('fond')); logo = await render(only('logo')); }
  else logo = await render(Buffer.from(svg));
} else if (existsSync(pngPath)) logo = await sharp(pngPath).resize(1024, 1024, { fit: 'contain', background: '#0000' }).png().toBuffer();
else { console.error('Aucune source : assets/icone-app/icone.svg ou icone.png.'); process.exit(1); }
const plain = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BG } }).png().toBuffer();
fond = fond || plain;
const full = await sharp(fond).composite([{ input: logo }]).png().toBuffer();
// Icône monochrome (thème d'Android 13+) : la silhouette du logo, en blanc.
const alpha = await sharp(logo).extractChannel('alpha').raw().toBuffer();
const mono = await sharp({ create: { width: 1024, height: 1024, channels: 3, background: '#FFFFFF' } })
  .joinChannel(alpha, { raw: { width: 1024, height: 1024, channels: 1 } }).png().toBuffer();

const out = async (buf, file, w, h = w, round = false) => {
  let img = sharp(buf).resize(w, h);
  if (round) img = sharp(await img.png().toBuffer()).composite([{ input: Buffer.from(`<svg width="${w}" height="${h}"><circle cx="${w / 2}" cy="${h / 2}" r="${w / 2}"/></svg>`), blend: 'dest-in' }]);
  mkdirSync(join(file, '..'), { recursive: true });
  await img.png({ compressionLevel: 9 }).toFile(file);
};
// Icône « ancienne » (Android 7) : ce qu'affiche l'icône adaptative, c'est-à-dire les 2/3 centraux, carré arrondi ou rond.
const legacy = await sharp(full).extract({ left: 171, top: 171, width: 682, height: 682 }).png().toBuffer();
const rounded = await sharp(legacy).composite([{ input: Buffer.from('<svg width="682" height="682"><rect width="682" height="682" rx="120"/></svg>'), blend: 'dest-in' }]).png().toBuffer();

for (const [d, k] of Object.entries(DENS)) {
  const m = join(RES, 'mipmap-' + d);
  await out(fond, join(m, 'ic_launcher_background.png'), Math.round(108 * k));
  await out(logo, join(m, 'ic_launcher_foreground.png'), Math.round(108 * k));
  await out(mono, join(m, 'ic_launcher_monochrome.png'), Math.round(108 * k));
  await out(rounded, join(m, 'ic_launcher.png'), Math.round(48 * k));
  await out(legacy, join(m, 'ic_launcher_round.png'), Math.round(48 * k), undefined, true);
  // Écran de démarrage d'Android 12+ : l'icône animée (ici fixe) sur 288 dp, le logo tient dans le cercle visible de 192 dp.
  await out(logo, join(RES, 'drawable-' + d, 'splash_icon.png'), Math.round(288 * k));
}
// Écran de démarrage d'Android 7 à 11 (image plein écran) : fond vert foncé, logo au centre.
const splash = async (w, h, file) => {
  const s = Math.round(Math.min(w, h) * 0.62);
  const bgImg = sharp({ create: { width: w, height: h, channels: 4, background: BG } });
  await out(await bgImg.composite([{ input: await sharp(logo).resize(s, s).png().toBuffer(), left: Math.round((w - s) / 2), top: Math.round((h - s) / 2) }]).png().toBuffer(), file, w, h);
};
for (const o of ['port', 'land']) for (const [d, [w, h]] of Object.entries(SPLASH[o])) await splash(w, h, join(RES, `drawable-${o}-${d}`, 'splash.png'));
await splash(480, 320, join(RES, 'drawable', 'splash.png'));

const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<!-- Généré par tools/android/icons.mjs depuis assets/icone-app/ : ne pas modifier à la main. -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
`;
for (const f of ['ic_launcher.xml', 'ic_launcher_round.xml']) writeFileSync(join(RES, 'mipmap-anydpi-v26', f), adaptive);
writeFileSync(join(RES, 'values', 'ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<!-- Généré par tools/android/icons.mjs : couleur du fond de l'écran de démarrage et de l'icône. -->
<resources>
    <color name="ic_launcher_background">${BG}</color>
    <color name="splash_background">${BG}</color>
</resources>
`);
for (const f of ['drawable/ic_launcher_background.xml', 'drawable-v24/ic_launcher_foreground.xml']) rmSync(join(RES, f), { force: true });   // icône par défaut de Capacitor

mkdirSync(join(SRC_DIR, 'sortie'), { recursive: true });
await sharp(full).resize(512, 512).png({ compressionLevel: 9 }).toFile(join(SRC_DIR, 'sortie', 'icone-play-store-512.png'));
console.log('Icône et écran de démarrage régénérés depuis assets/icone-app/' + (existsSync(svgPath) ? 'icone.svg' : 'icone.png') + '.');
