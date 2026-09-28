// Génère les skins épiques dans assets/skins/ (SVG, fond transparent, sans texte).
// Les images de la boutique, des monnaies, des armes et des talismans viennent de Claude Design : ne pas les générer.
// Lancer : node tools/boutique-art/gen.mjs
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { ROOT, lobbyArt, combatSprite } from './engine.mjs';
import { SKINS } from './skins.mjs';

const A = join(ROOT, 'assets');
const out = (rel, svg) => { const f = join(A, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, svg); return rel; };
// Héros du lobby : même repère que src/ui/art.js (240 × 320), avec 10 de marge tout autour pour que
// l'épée, l'arc et le socle ne soient pas coupés dans un fichier autonome.
const sized = svg => svg.replace('viewBox="0 0 240 320"', 'viewBox="-10 -10 260 344" width="260" height="344"').replace(/ style="[^"]*"/, '');

const files = [];
for (const s of SKINS) {
  files.push(out(`skins/${s.hero}_${s.id}.svg`, sized(lobbyArt(s.hero, s.lobby)[s.hero])));
  files.push(out(`skins/${s.hero}_${s.id}_combat.svg`, combatSprite(s.hero, s.combat).replace(/ style="[^"]*"/, '')));
}
console.log(files.length + ' images :\n' + files.join('\n'));
