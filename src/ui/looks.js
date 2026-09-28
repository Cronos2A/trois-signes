// Apparence des héros selon leurs cosmétiques (game/cosmetics.js) : dessin du lobby et sprite de combat.
// Couleur et skin d'arme = dessin d'origine recoloré ; skin complet = fichier assets/skins/ (repli : dessin d'origine).
import { look } from '../game/cosmetics.js';
import { art, heroArt } from './art.js';

const skinFile = (id, combat) => `assets/skins/${id}${combat ? '_combat' : ''}.svg`;
const skins = new Map();            // id → texte SVG prêt pour le lobby (ou null si le fichier manque)
let onReady = null;

/** Rappel quand un skin vient d'être chargé (le lobby se redessine). */
export const onSkinReady = fn => { onReady = fn; };

/** Charge le dessin de lobby d'un skin ; son repère est celui de art.js (240 × 320, avec 10 de marge). */
function loadSkin(id) {
  if (skins.has(id)) return;
  skins.set(id, undefined);
  fetch(skinFile(id)).then(r => r.ok ? r.text() : null).catch(() => null).then(txt => {
    if (txt) {
      const open = (/<svg[^>]*>/.exec(txt) || [''])[0];
      txt = txt.replace(open, open.replace(/\s(width|height|viewBox|style)="[^"]*"/g, '')
        .replace('<svg', '<svg viewBox="0 0 240 320" preserveAspectRatio="xMidYMid meet" style="display:block;overflow:visible"'));
    }
    skins.set(id, txt || null);
    if (onReady) onReady();
  });
}

/** Dessin du héros pour le lobby, avec ses cosmétiques (L : apparence imposée, pour un aperçu). */
export function heroLobbyHtml(heroId, L = look(heroId)) {
  if (L.skin) {
    loadSkin(L.skin);
    const s = skins.get(L.skin);
    if (s) return s;
  }
  return L.recolor ? heroArt(heroId, L.recolor) : art()[heroId];
}

/** Apparence du sprite de combat : { recolor, skinUrl } (voir ui/combat-art.js). */
export function combatLook(heroId) {
  const L = look(heroId);
  return { recolor: L.recolor, skinUrl: L.skin ? skinFile(L.skin, true) : null };
}
