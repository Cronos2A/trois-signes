export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const rand = (a, b) => a + Math.random() * (b - a);
/** Nombre au format français (virgule décimale). */
export const fmt = n => String(n).replace('.', ',');
/**
 * « de » + nom, accordé : « d'Aldric », « du Cœur du Silence » (Le …), « des Toits » (Les …), « de la … », « de l'… », sinon « de Kestrel ».
 * Pour les noms (héros, pseudos, lieux) glissés dans les textes des données par {de}.
 */
export function deName(name) {
  const n = String(name || '').trim();
  let m;
  if ((m = /^Le\s+(.*)$/.exec(n))) return 'du ' + m[1];
  if ((m = /^Les\s+(.*)$/.exec(n))) return 'des ' + m[1];
  if ((m = /^La\s+(.*)$/.exec(n))) return 'de la ' + m[1];
  if ((m = /^L['’]\s*(.*)$/.exec(n))) return "de l'" + m[1];
  if (/^y[aeiouyàâéèêîôû]/i.test(n)) return 'de ' + n;                 // « Yann » : le y se prononce comme une consonne
  return /^[aeiouyàâäéèêëîïôöùûüœæ]/i.test(n) ? "d'" + n : 'de ' + n;   // « h » : laissé tel quel (« de Hélo »)
}
