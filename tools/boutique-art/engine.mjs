// Accès aux moteurs de dessin du jeu (src/ui/art.js et src/ui/sprites.js) depuis Node, sans les modifier :
// on lit leur source et on l'évalue, éventuellement après avoir transformé le bloc d'un héros (skins).
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = f => readFileSync(join(ROOT, f), 'utf8');

/**
 * Transforme le bloc [start, end) d'une source : couleurs remplacées (hex → hex), remplacements de texte,
 * code inséré avant une chaîne repère (at: [[repère, code], ...]).
 */
function patchBlock(code, start, end, t) {
  const a = code.indexOf(start);
  if (a < 0) throw new Error('bloc introuvable : ' + start);
  const b = code.indexOf(end, a + start.length);
  if (b < 0) throw new Error('fin de bloc introuvable : ' + end);
  let blk = code.slice(a, b);
  for (const [from, to] of t.rep || []) {
    if (!blk.includes(from)) throw new Error('texte introuvable : ' + from);
    blk = blk.split(from).join(to);
  }
  const C = Object.fromEntries(Object.entries(t.colors || {}).map(([k, v]) => [k.toLowerCase(), v]));
  if (Object.keys(C).length) blk = blk.replace(new RegExp(Object.keys(C).join('|'), 'gi'), m => C[m.toLowerCase()]);   // en une passe
  for (const [mark, add] of t.at || []) {
    const i = blk.indexOf(mark);
    if (i < 0) throw new Error('repère introuvable : ' + mark);
    blk = blk.slice(0, i) + add + '\n' + blk.slice(i);
  }
  return code.slice(0, a) + blk + (t.post || '') + code.slice(b);
}

/** Héros du lobby (pleine pied, avec socle) : { aldric: '<svg…>', … }. t : transformation du bloc du héros. */
export function lobbyArt(hero, t) {
  let code = src('src/ui/art.js').replace('export function art()', 'function art()');
  if (t) code = patchBlock(code, `// ${hero.toUpperCase()}\n`, `C.${hero} = {`, t);
  return new Function(code + '\nreturn buildArt({ ol: 11, fc: 1, socles: true });')();
}

/** Sprite de combat d'un héros (vu de ¾ dos, avec socle) : chaîne SVG. */
export function combatSprite(hero, t) {
  let code = src('src/ui/sprites.js').replace('export const TS', 'const TS');
  if (t) code = patchBlock(code, `    ${hero}: () => {`, '      return {', t);
  return new Function(code + '\nreturn TS;')().sprite(hero, { scale: 1 }).svg;
}

/** Moteur de facettes des sprites (parts, ngon, limb, glow, spark, sh…), pour les icônes et coffres. */
export function engine(o) {
  const code = src('src/ui/sprites.js').replace('export const TS', 'const TS');
  return new Function(code + '\nreturn engine;')()(o);
}

export const OL = '#17251B';
export { ROOT };
