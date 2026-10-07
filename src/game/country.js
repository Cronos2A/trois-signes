// Pays du joueur pour les classements (data/classement.json → countries, codes ISO 3166 à 2 lettres).
// Aucune localisation ni adresse IP : le joueur le choisit. Par défaut, la région de la langue du téléphone (fr-FR → FR) ;
// sans région connue, il est demandé à la première ouverture du classement. Modifiable dans les Réglages.
// Sauvegarde : prog.profile.pays = code, null (« Non précisé », choisi par le joueur) ou absent (jamais choisi).
import { D } from '../data.js';
import { prog, saveProg } from './progress.js';
import { language } from '../i18n.js';

const C = () => D.classement;
export const validCountry = c => C().countries.includes(c);

/** Région de la langue du téléphone si c'est un pays de la liste (fr-FR → FR), sinon null. */
export function deviceCountry() {
  for (const l of navigator.languages || [navigator.language]) {
    try { const r = new Intl.Locale(l).region; if (r && validCountry(r)) return r; } catch (e) { /* langue illisible */ }
  }
  return null;
}

/** Pays du joueur : code, null (« Non précisé ») ; undefined s'il n'a jamais été choisi ni deviné. */
export function myCountry() {
  const p = prog.profile || {};
  if (p.pays === undefined) {
    const d = deviceCountry();
    if (d) { prog.profile.pays = d; saveProg(); }
  }
  return prog.profile.pays;
}
/** À demander : aucun pays enregistré et aucun deviné d'après la langue du téléphone. */
export const countryUnknown = () => myCountry() === undefined;

/** Change le pays (code de la liste ou null). */
export function setCountry(c) {
  prog.profile.pays = validCountry(c) ? c : null;
  saveProg();
}

/** Nom du pays dans la langue du jeu (Intl.DisplayNames). */
let names = null, namesLang = null;
export function countryName(c) {
  if (!c) return '';
  if (namesLang !== language()) { try { names = new Intl.DisplayNames([language()], { type: 'region' }); } catch (e) { names = null; } namesLang = language(); }
  try { return (names && names.of(c)) || c; } catch (e) { return c; }
}
/** Tous les pays, triés par nom dans la langue du jeu : [{ code, name }]. */
export function countryList() {
  const coll = new Intl.Collator(language());
  return C().countries.map(code => ({ code, name: countryName(code) })).sort((a, b) => coll.compare(a.name, b.name));
}
/** Drapeau (émoji formé des deux lettres du code). */
export const flagOf = c => (c && /^[A-Z]{2}$/.test(c) ? String.fromCodePoint(...[...c].map(x => 0x1F1E6 + x.charCodeAt(0) - 65)) : '');
