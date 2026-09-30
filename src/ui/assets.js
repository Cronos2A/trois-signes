// Images du mode Histoire, livrées au fil de l'eau par Claude Design. Convention de noms :
//   assets/portraits/{id}_{expression}.svg (boss : {id}_ombrace.svg / {id}_humain.svg)
//   assets/ennemis/{id}.svg   assets/decors/{id}.svg
// Tant qu'une image manque, on se replie : expression → neutre (boss → humain), portrait → pastille
// à la couleur du personnage, décor → dégradé vert du lobby avec le nom du lieu.
import { D } from '../data.js';
import { facets } from './icons.js';
import { initialOf } from '../i18n.js';

const cache = new Map();

/** Vérifie qu'une image existe (résultat mis en cache) : renvoie son URL ou null. */
export function probe(url) {
  if (!cache.has(url)) cache.set(url, new Promise(ok => {
    const img = new Image();
    img.onload = () => ok(url);
    img.onerror = () => ok(null);
    img.src = url;
  }));
  return cache.get(url);
}

async function firstOf(urls) {
  const found = await Promise.all(urls.map(probe));
  return found.find(Boolean) || null;
}

const bosses = () => D.story_mode.ennemis_speciaux.liste;
export const isBoss = id => bosses().some(b => b.id === id);
export const bossInfo = id => bosses().find(b => b.id === id);

/** URL du portrait (ou null) en suivant les règles de repli. */
export function portraitUrl(id, expr) {
  const P = 'assets/portraits/' + id + '_';
  if (isBoss(id)) return firstOf([P + (expr === 'ombrace' ? 'ombrace' : 'humain') + '.svg']);
  const e = expr || 'neutre';
  return firstOf(e === 'neutre' ? [P + 'neutre.svg'] : [P + e + '.svg', P + 'neutre.svg']);
}
export const decorUrl = id => id ? probe('assets/decors/' + id + '.svg') : Promise.resolve(null);
export const enemyUrl = id => probe('assets/ennemis/' + id + '.svg');

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

/** Nom affiché et couleur d'un personnage de dialogue (héros, PNJ ou boss). */
export function who(id) {
  const hero = D.characters.characters.find(c => c.id === id);
  if (hero) return { name: hero.name, color: hero.color };
  const R = D.rules.story, npc = R.npc[id];
  if (npc) return npc;
  const b = bossInfo(id);
  if (b) return { name: b.nom.split(',')[0].trim(), color: R.bossColor };
  return { name: cap(id.replace(/_/g, ' ')), color: R.bossColor };
}

/** Nom lisible d'un lieu d'après son id (pierrelune_brume → « Pierrelune brume »). */
export const placeName = id => cap(String(id || '').replace(/_/g, ' '));

/** Pastille ronde à la couleur du personnage avec son initiale, comme l'avatar du lobby. */
export function pastille(id, cls = '') {
  const w = who(id);
  return `<div class="pastille ${cls}" style="background:${w.color}">${facets.small()}<span class="ol ol-4">${initialOf(w.name)}</span></div>`;
}
