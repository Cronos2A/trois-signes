// Salon de Duel sur Firestore (data/duel.json → collection) : document duels/{code}.
// { code, host, guest, createdAt (heure du serveur : elle fournit la graine), players: { uid: { pseudo, hero, ready, scores[],
//   ko, done, quit, wave, live, seen } } }. Chaque joueur n'écrit que sa propre entrée (règles : firestore.rules).
import { D } from '../data.js';
import { whenOnline, pseudo } from './online.js';

const DU = () => D.duel;
let S = null, ref = null, code = null, unsub = null, last = null;

/** Salon courant : { code, uid, data } (data : dernière version reçue du serveur). */
export const current = () => (ref ? { code, uid: S.uid, data: last } : null);

function newCode() {
  const C = DU().code;
  let s = '';
  const r = crypto.getRandomValues(new Uint32Array(C.length));
  for (let i = 0; i < C.length; i++) s += C.alphabet[r[i] % C.alphabet.length];
  return s;
}

const me = () => ({ pseudo: pseudo(), hero: null, ready: false, scores: [], ko: null, done: false, quit: false, wave: 0, live: 0,
  seen: S.fb.fs.serverTimestamp() });

/** Crée un salon et renvoie son code. */
export async function createRoom() {
  S = await whenOnline();
  const { fb, db, uid } = S;
  for (let k = 0; k < DU().code.tries; k++) {
    const c = newCode(), r = fb.fs.doc(db, DU().collection, c);
    const ok = await fb.fs.runTransaction(db, async tx => {
      if ((await tx.get(r)).exists()) return false;
      tx.set(r, { code: c, host: uid, guest: null, createdAt: fb.fs.serverTimestamp(), players: { [uid]: me() } });
      return true;
    });
    if (ok) { ref = r; code = c; last = { host: uid, guest: null, players: {} }; return c; }   // salon vide tant que rien n'est reçu
  }
  throw new Error('code');
}

/** Rejoint le salon d'un ami. Renvoie null, ou une erreur : 'notFound' | 'full' | 'own'. */
export async function joinRoom(c) {
  S = await whenOnline();
  const { fb, db, uid } = S, r = fb.fs.doc(db, DU().collection, c);
  let snap;
  try { snap = await fb.fs.getDoc(r); } catch (e) { return 'notFound'; }   // salon complet d'autres joueurs : lecture refusée
  if (!snap.exists()) return 'notFound';
  const d = snap.data();
  if (d.host === uid) return 'own';
  if (d.guest && d.guest !== uid) return 'full';
  if (!d.guest) await fb.fs.updateDoc(r, { guest: uid, ['players.' + uid]: me() });
  ref = r; code = c;
  return null;
}

/** Suit le salon : fn(data) à chaque changement (heures du serveur estimées tant qu'une écriture est en route). */
export function watch(fn) {
  if (unsub) unsub();
  unsub = S.fb.fs.onSnapshot(ref, s => {
    last = s.exists() ? s.data({ serverTimestamps: 'estimate' }) : null;
    fn(last);
  }, () => fn(last));
}

/** Écrit dans sa propre entrée du salon (champs de players.{uid}). */
export function setMine(fields) {
  if (!ref) return Promise.resolve();
  const up = {};
  for (const [k, v] of Object.entries(fields)) up['players.' + S.uid + '.' + k] = v;
  return S.fb.fs.updateDoc(ref, up).catch(e => console.warn('Duel :', e && (e.code || e.message)));
}

/** Signe de vie (toutes les heartbeatSeconds) : heure du serveur, vague en cours et score en direct. */
export const heartbeat = (wave, live) => setMine({ seen: S.fb.fs.serverTimestamp(), wave, live });

/** Quitte le salon : l'hôte seul le supprime ; sinon on le marque « abandon ». */
export async function leaveRoom(abandon = true) {
  const d = last, r = ref;
  if (unsub) { unsub(); unsub = null; }
  if (r && d) {
    try {
      if (d.host === S.uid && !d.guest) await S.fb.fs.deleteDoc(r);
      else if (abandon) await setMine({ quit: true });
    } catch (e) {}
  }
  ref = null; code = null; last = null;
}

/** Heure du serveur en millisecondes (Timestamp Firestore), 0 si inconnue. */
export const ms = t => (t && t.toMillis ? t.toMillis() : 0);
