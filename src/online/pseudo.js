// Pseudo du joueur : longueur, caractères permis et filtre des mots grossiers (data/online.json → pseudo).
import { D } from '../data.js';
import { tr } from '../i18n.js';

const P = () => D.online.pseudo;
const fill = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

/** Forme comparée au filtre : minuscules, sans accents, chiffres « leet » remplacés. */
function plain(s) {
  const L = P().leet;
  return [...s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')].map(c => L[c] || c).join('');
}

/** Vrai si le pseudo contient un mot interdit (partout pour « banned », mot entier pour « bannedWords »). */
export function isRude(s) {
  const p = plain(s), flat = p.replace(/[^a-z]/g, ''), squeezed = flat.replace(/(.)\1+/g, '$1');
  if (P().banned.some(w => flat.includes(w) || squeezed.includes(w))) return true;
  const words = p.split(/[^a-z]+/).filter(Boolean);
  return words.some(w => P().bannedWords.includes(w) || P().bannedWords.includes(w.replace(/(.)\1+/g, '$1')));
}

/**
 * Vrai si le pseudo contient un nom réservé (data/online.json → pseudo.reserved : équipe du jeu, nom du jeu).
 * Comparaison sans majuscules, accents, espaces ni symboles ; les chiffres sont lus des deux façons :
 * comme lettres « leet » (4dm1n) et comme glissés au milieu, donc ignorés (ad9min).
 */
export function isReserved(s) {
  const R = P().reserved;
  const forms = v => {
    const low = v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const out = [plain(v).replace(/[^a-z]/g, ''), low.replace(/[^a-z]/g, '')];
    return [...new Set([...out, ...out.map(x => x.replace(/(.)\1+/g, '$1'))])].filter(Boolean);
  };
  const mine = forms(s);
  if (R.anywhere.some(w => forms(w).some(r => mine.some(m => m.includes(r))))) return true;
  const words = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(Boolean);
  return words.some(w => R.words.includes(w) || R.words.includes(plain(w).replace(/[^a-z]/g, '')));
}

/** Vérifie un pseudo tapé : { ok: pseudo nettoyé } ou { error: message }. */
export function checkPseudo(raw) {
  // NFC : un accent tapé en deux touches (touche morte : « e » + « ◌́ ») devient la lettre accentuée « é ».
  const U = D.online.ui, s = String(raw || '').normalize('NFC').trim().replace(/\s+/g, ' ');
  if ([...s].length < P().min) return { error: fill(U.tooShort, P()) };
  if ([...s].length > P().max) return { error: fill(U.tooLong, P()) };
  if (!new RegExp(P().allowed, 'u').test(s)) return { error: U.badChars };
  if (isRude(s)) return { error: U.rude };
  if (isReserved(s)) return { error: tr('pseudo.reserved') };
  return { ok: s };
}

/** Pseudo proposé : « Signeur » + 4 chiffres. */
export const suggestPseudo = () => P().suggest + String(Math.floor(1000 + Math.random() * 9000));
