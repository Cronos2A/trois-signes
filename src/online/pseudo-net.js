// Pseudos uniques (data/online.json → pseudoUnique) : document pseudos/{pseudo encodé} = { uid, pseudo, at }.
// Comparaison exacte, sensible aux majuscules : « Aldric » et « aldric » sont deux pseudos différents ; seuls les espaces
// du début et de la fin sont retirés. Le premier qui réserve un pseudo le garde. Règles : firestore.rules (match /pseudos).
// - claimPseudo : réserve le nouveau pseudo et libère l'ancien dans la même transaction (refusé s'il appartient à un autre joueur).
// - ownPseudo : au lancement, vérifie que le pseudo de la sauvegarde est bien à ce joueur (réservé s'il est libre) et libère
//   les autres pseudos qu'il aurait encore (changement de compte Google, ancien pseudo resté réservé).
// - releasePseudos : suppression du compte.
import { D } from '../data.js';
import { server } from './online.js';

const C = () => D.online.pseudoUnique.collection;
/** Clé comparée : la chaîne exacte, sans les espaces du début et de la fin. */
export const pseudoKey = p => String(p || '').trim();
const ref = (S, p) => S.fb.fs.doc(S.db, C(), encodeURIComponent(pseudoKey(p)));
const taken = () => Object.assign(new Error('taken'), { code: 'ts/taken' });

/**
 * Réserve next pour ce joueur et libère prev (s'il est à lui), en une transaction.
 * Résultat : 'ok' | 'taken' (à un autre joueur) | 'offline' (pas de connexion au serveur) | 'error'.
 */
export async function claimPseudo(next, prev) {
  const S = server();
  if (!S || navigator.onLine === false) return 'offline';
  const n = pseudoKey(next), o = pseudoKey(prev);
  try {
    await S.fb.fs.runTransaction(S.db, async tx => {
      const cur = await tx.get(ref(S, n));
      const old = o && o !== n ? await tx.get(ref(S, o)) : null;
      if (cur.exists() && cur.data().uid !== S.uid) throw taken();
      if (!cur.exists()) tx.set(ref(S, n), { uid: S.uid, pseudo: n, at: S.fb.fs.serverTimestamp() });
      if (old && old.exists() && old.data().uid === S.uid) tx.delete(ref(S, o));
    });
    return 'ok';
  } catch (e) {
    if (e && e.code === 'ts/taken') return 'taken';
    console.warn('Pseudo :', e && (e.code || e.message));
    return e && e.code === 'unavailable' ? 'offline' : 'error';
  }
}

/** Pseudos réservés par ce joueur, sauf keep (gardé). */
async function mine(S, keep) {
  const q = S.fb.fs.query(S.fb.fs.collection(S.db, C()), S.fb.fs.where('uid', '==', S.uid));
  const snap = await S.fb.fs.getDocs(q);
  return snap.docs.filter(d => !keep || d.id !== encodeURIComponent(pseudoKey(keep)));
}

/**
 * Lancement (ou retour de la connexion) : le pseudo p de la sauvegarde est-il bien à ce joueur ?
 * 'none' (pas encore de pseudo : rien à faire), 'ok' (réservé, les autres libérés), 'taken', 'offline', 'error'.
 */
export async function ownPseudo(p) {
  if (!pseudoKey(p)) return 'none';
  const r = await claimPseudo(p, null);
  if (r !== 'ok') return r;
  const S = server();
  try { await Promise.all((await mine(S, p)).map(d => S.fb.fs.deleteDoc(d.ref))); }
  catch (e) { console.warn('Pseudo (ménage) :', e && (e.code || e.message)); }
  return 'ok';
}

/** Suppression du compte (ou compte anonyme remplacé par un compte Google) : libère tous les pseudos de ce joueur. */
export async function releasePseudos() {
  const S = server();
  if (!S) throw new Error('offline');
  const docs = await mine(S, null);
  await Promise.all(docs.map(d => S.fb.fs.deleteDoc(d.ref)));
}
