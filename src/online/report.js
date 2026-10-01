// Signaler un pseudo (data/online.json → report) : document reports/{uid}_{pseudo normalisé}, un seul par joueur et par pseudo.
// Les règles (firestore.rules) refusent un second signalement du même pseudo par le même joueur ; personne ne peut les lire
// depuis le jeu : on les consulte dans la console Firebase (Firestore Database → reports).
import { D } from '../data.js';
import { prog, saveProg } from '../game/progress.js';
import { whenOnline } from './online.js';

const R = () => D.online.report;

/** Pseudo normalisé (identifiant du document) : minuscules, accents et espaces sans effet ; autres signes codés. */
export function reportKey(pseudo) {
  const s = String(pseudo).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '');
  return [...s].map(c => /[a-z0-9]/.test(c) ? c : '-' + c.codePointAt(0).toString(36)).join('').slice(0, 96) || '-';
}

/** Déjà signalé depuis cet appareil ? (le serveur, lui, refuse de toute façon un second signalement) */
export const alreadyReported = pseudo => ((prog.reports || []).includes(reportKey(pseudo)));

/** Envoie le signalement. Résultat : 'sent' | 'already' | 'offline' | 'error'. board : voyage | duel | adversaire. */
export async function sendReport(pseudo, reason, board) {
  if (!R().reasons.includes(reason) || !R().boards.includes(board)) return 'error';
  const key = reportKey(pseudo);
  if (alreadyReported(pseudo)) return 'already';
  let S;
  try { S = await whenOnline(15000); } catch (e) { return 'offline'; }
  const { fb, db, uid } = S;
  const mark = () => { prog.reports = [...(prog.reports || []), key]; saveProg(); };
  try {
    await fb.fs.setDoc(fb.fs.doc(db, R().collection, uid + '_' + key),
      { pseudo: String(pseudo).slice(0, 16), key, reason, by: uid, at: fb.fs.serverTimestamp(), board });
    mark();
    return 'sent';
  } catch (e) {
    // Document déjà là (signalement fait depuis un autre appareil du même compte) : les règles refusent la réécriture.
    if (e && e.code === 'permission-denied') { mark(); return 'already'; }
    console.warn('Signalement :', e && (e.code || e.message));
    return navigator.onLine === false ? 'offline' : 'error';
  }
}
