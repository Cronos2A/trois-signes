// Trois planches de présentation (HTML) dans design/planches-boutique/ : monnaies et packs, coffres et cadres,
// puis les 6 skins à côté du héros d'origine. Lancer après gen.mjs : node tools/boutique-art/planches.mjs
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ROOT, lobbyArt, combatSprite } from './engine.mjs';
import { SKINS } from './skins.mjs';
import { facetSvg } from '../../src/ui/icons.js';

const D = join(ROOT, 'design', 'planches-boutique');
mkdirSync(D, { recursive: true });
const img = (rel, h) => `<img src="../../assets/${rel}" style="height:${h}px;display:block">`;
const cell = (inner, label, bg = '#FFF1D6') => `<figure class="cell" style="background:${bg}">${facetSvg(4, 4, label.length, .18)}<div class="art">${inner}</div><figcaption>${label}</figcaption></figure>`;
const page = (title, body, cols) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Caprasimo&family=Figtree:wght@700;800&display=swap" rel="stylesheet">
<style>
body{margin:0;background:#3DDC5B;font-family:Figtree,sans-serif;color:#15301E;position:relative;min-height:100vh}
.bg{position:absolute;inset:0;width:100%;height:100%}
main{position:relative;padding:28px;display:flex;flex-direction:column;gap:18px}
h1{margin:0;font-family:Caprasimo,serif;font-weight:400;font-size:34px;color:#fff;-webkit-text-stroke:6px #15301E;paint-order:stroke fill;text-shadow:0 4px 0 #15301E}
h2{margin:6px 0 0;font-family:Caprasimo,serif;font-weight:400;font-size:20px;color:#FFF1D6;-webkit-text-stroke:4px #15301E;paint-order:stroke fill}
.grid{display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:16px}
.cell{position:relative;margin:0;border:4px solid #15301E;border-radius:22px;box-shadow:0 6px 0 #15301E;overflow:hidden;display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 10px 10px}
.cell .facets{position:absolute;inset:0;width:100%;height:100%}
.art{position:relative;display:flex;align-items:flex-end;justify-content:center;gap:10px;min-height:120px}
figcaption{position:relative;font-weight:800;font-size:13px;text-align:center}
.pair{display:flex;gap:6px;align-items:flex-end}
.pair svg{display:block}
</style></head><body><svg class="bg" viewBox="0 0 100 100" preserveAspectRatio="none">${facetSvg(8, 14, 5, .12).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg><main><h1>${title}</h1>${body}</main></body></html>`;

// 1. Monnaies et packs
writeFileSync(join(D, '1-monnaies-et-packs.html'), page('Monnaies et packs de gemmes',
  `<div class="grid">${cell(img('icones/monnaies/or.svg', 128), 'icones/monnaies/or.svg')}${cell(img('icones/monnaies/gemme.svg', 128), 'icones/monnaies/gemme.svg')}</div>
   <h2>Packs de gemmes</h2><div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">${[1, 2, 3, 4].map(n => cell(img(`boutique/pack_gemmes_${n}.svg`, 170), `pack_gemmes_${n}.svg`)).join('')}</div>`, 2));

// 2. Coffres et cadres
const frameDemo = k => `<div style="position:relative;width:120px;height:126px"><div style="position:absolute;left:14px;top:14px;width:92px;height:92px;border-radius:14px;background:#FFE3A6"></div><div style="position:absolute;left:0;top:0">${img(`boutique/cadre_${k}.svg`, 126)}</div></div>`;
writeFileSync(join(D, '2-coffres-et-cadres.html'), page('Coffres et cadres de rareté',
  `<div class="grid">${['simple_ferme', 'simple_ouvert', 'trois_signes_ferme', 'trois_signes_ouvert'].map(k => cell(img(`boutique/coffre_${k}.svg`, 190), `coffre_${k}.svg`, k.startsWith('trois') ? '#FFD23F' : '#FFF1D6')).join('')}</div>
   <h2>Cadres de rareté</h2><div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${['commun', 'rare', 'epique'].map(k => cell(frameDemo(k), `cadre_${k}.svg`)).join('')}</div>`, 4));

// 3. Skins : une ligne par héros — lobby d'origine | skin, combat d'origine | skin
const svgH = (s, h) => s.replace('<svg ', `<svg height="${h}" `).replace(/ width="[^"]*"/, '').replace(/ style="[^"]*"/, ' style="display:block;overflow:visible"');
const fig = (inner, label) => `<div class="fig">${inner}<span>${label}</span></div>`;
writeFileSync(join(D, '3-skins.html'), page('Skins épiques',
  SKINS.map(s => `<figure class="cell row"><div class="facets-wrap">${facetSvg(8, 3, s.id.length, .18)}</div>
    <div class="who">${s.name}<small>skins/${s.hero}_${s.id}.svg · skins/${s.hero}_${s.id}_combat.svg</small></div>
    <div class="line">${fig(svgH(lobbyArt(s.hero)[s.hero], 220), "Lobby · d'origine")}${fig(img(`skins/${s.hero}_${s.id}.svg`, 236), 'Lobby · skin')}
    <i class="sep"></i>${fig(svgH(combatSprite(s.hero), 190), "Combat · d'origine")}${fig(img(`skins/${s.hero}_${s.id}_combat.svg`, 190), 'Combat · skin')}</div></figure>`).join('') +
  `<style>.row{background:#FFF1D6;flex-direction:column;align-items:stretch;padding:12px 18px}.row .facets-wrap{position:absolute;inset:0}.row .facets-wrap svg{width:100%;height:100%}
   .who{position:relative;font-family:Caprasimo,serif;font-size:20px;display:flex;align-items:baseline;gap:12px}.who small{font-family:Figtree,sans-serif;font-size:12px;font-weight:800;opacity:.7}
   .line{position:relative;display:flex;align-items:flex-end;justify-content:space-around;gap:8px}.fig{display:flex;flex-direction:column;align-items:center;gap:4px}
   .fig span{font-size:12px;font-weight:800;padding:2px 10px;border-radius:999px;background:#15301E;color:#FFF1D6}.sep{align-self:stretch;width:3px;border-radius:3px;background:#15301E;opacity:.25}</style>`, 1));
console.log('planches écrites dans design/planches-boutique/');
