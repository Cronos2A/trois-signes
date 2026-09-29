// Pseudo du joueur : longueur, caractères permis et filtre des mots grossiers (data/online.json → pseudo).
import { D } from '../data.js';

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

/** Vérifie un pseudo tapé : { ok: pseudo nettoyé } ou { error: message }. */
export function checkPseudo(raw) {
  // NFC : un accent tapé en deux touches (touche morte : « e » + « ◌́ ») devient la lettre accentuée « é ».
  const U = D.online.ui, s = String(raw || '').normalize('NFC').trim().replace(/\s+/g, ' ');
  if ([...s].length < P().min) return { error: fill(U.tooShort, P()) };
  if ([...s].length > P().max) return { error: fill(U.tooLong, P()) };
  if (!new RegExp(P().allowed, 'u').test(s)) return { error: U.badChars };
  if (isRude(s)) return { error: U.rude };
  return { ok: s };
}

/** Pseudo proposé : « Signeur » + 4 chiffres. */
export const suggestPseudo = () => P().suggest + String(Math.floor(1000 + Math.random() * 9000));
