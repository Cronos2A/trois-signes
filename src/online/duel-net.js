// Salon de Duel sur Firestore (data/duel.json → collection) : document duels/{code}.
// { code, host, guest, mode ('friend' | 'random'), invite (Duel au hasard : seul joueur admis), createdAt (heure du serveur : elle fournit
//   la graine), players: { uid: { pseudo, hero, ready, scores[], ko, done, quit, wave, live, seen, arena, prints } } }.
// Chaque joueur n'écrit que sa propre entrée (règles : firestore.rules).
// Duel au hasard : file d'attente queue/{uid} = { pseudo, prints, seen, room } (data/duel.json → random).
import { D } from '../data.js';
import { whenOnline, pseudo } from './online.js';
import { serverPrints } from './ranked.js';

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

/** Entrée d'un joueur ; who : { arena, prints } (arène et Empreintes, pour l'arène du combat et l'affichage). */
const me = (who = {}) => ({ pseudo: pseudo(), hero: null, ready: false, scores: [], ko: null, done: false, quit: false, wave: 0, waveAt: null, live: 0,
  seen: S.fb.fs.serverTimestamp(), arena: who.arena || 0, prints: who.prints || 0 });

/** Crée un salon et renvoie son code. opts : { mode, invite, who }. */
export async function createRoom(opts = {}) {
  S = await whenOnline();
  const { fb, db, uid } = S;
  for (let k = 0; k < DU().code.tries; k++) {
    const c = newCode(), r = fb.fs.doc(db, DU().collection, c);
    const ok = await fb.fs.runTransaction(db, async tx => {
      if ((await tx.get(r)).exists()) return false;
      tx.set(r, { code: c, host: uid, guest: null, mode: opts.mode || 'friend', invite: opts.invite || null,
        createdAt: fb.fs.serverTimestamp(), players: { [uid]: me(opts.who) } });
      return true;
    });
    if (ok) { ref = r; code = c; last = { host: uid, guest: null, players: {} }; return c; }   // salon vide tant que rien n'est reçu
  }
  throw new Error('code');
}

/** Rejoint le salon d'un ami. Renvoie null, ou une erreur : 'notFound' | 'full' | 'own'. */
export async function joinRoom(c, who) {
  S = await whenOnline();
  const { fb, db, uid } = S, r = fb.fs.doc(db, DU().collection, c);
  let snap;
  try { snap = await fb.fs.getDoc(r); } catch (e) { return 'notFound'; }   // salon complet d'autres joueurs : lecture refusée
  if (!snap.exists()) return 'notFound';
  const d = snap.data();
  if (d.host === uid) return 'own';
  if ((d.guest && d.guest !== uid) || (d.invite && d.invite !== uid)) return 'full';
  if (!d.guest) await fb.fs.updateDoc(r, { guest: uid, ['players.' + uid]: me(who) });
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

/** Signe de vie (toutes les heartbeatSeconds) : heure du serveur et score en direct. */
export const heartbeat = live => setMine({ seen: S.fb.fs.serverTimestamp(), live });
/** Début de la vague n (1 à 5) : l'heure du serveur est notée (les règles refusent un score de vague rendu trop vite). */
export const startWave = n => setMine({ wave: n, waveAt: S.fb.fs.serverTimestamp() });

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

/* ---------- Duel au hasard : file d'attente ---------- */
/**
 * Cherche un adversaire. who : { prints, arena } ; on : { range(min, max), found(), timeout() }.
 * Chacun s'inscrit dans la file et cherche de son côté ; le premier qui trouve crée le salon (mode 'random', invite = l'autre)
 * et écrit son code dans la fiche de l'autre, qui le rejoint. Renvoie { cancel() }.
 */
export function search(who, on) {
  const R = DU().random;
  let stop = false, busy = false, poll = 0, beat = 0, unQ = null, t0 = Date.now(), mySeen = 0;
  const end = async (keepRoom = false) => {
    stop = true;
    clearInterval(poll); clearInterval(beat);
    if (unQ) { unQ(); unQ = null; }
    try { if (S) await S.fb.fs.deleteDoc(S.fb.fs.doc(S.db, R.collection, S.uid)); } catch (e) {}
    if (!keepRoom && ref) await leaveRoom(false);
  };
  (async () => {
    try { S = await whenOnline(); } catch (e) { if (!stop) { await end(); on.timeout(); } return; }
    if (stop) return;
    who = { ...who, prints: await serverPrints() };                   // Empreintes du serveur (les règles de la file les exigent)
    if (stop) return;
    const { fb, db, uid } = S, mine = fb.fs.doc(db, R.collection, uid);
    await fb.fs.setDoc(mine, { pseudo: pseudo(), prints: who.prints, seen: fb.fs.serverTimestamp(), room: null });
    // Trouvé par un autre joueur : il a écrit le code de son salon dans ma fiche.
    let offered = null;
    const accept = async () => {
      if (!offered || stop || busy) return;
      busy = true;
      const err = await joinRoom(offered, who).catch(() => 'notFound');
      await end(!err);
      if (err) on.timeout(); else on.found();
    };
    unQ = fb.fs.onSnapshot(mine, s => {
      if (!s.exists()) return;
      const d = s.data({ serverTimestamps: 'estimate' });
      mySeen = ms(d.seen);
      if (d.room) { offered = d.room; accept(); }
    });
    beat = setInterval(() => fb.fs.updateDoc(mine, { seen: fb.fs.serverTimestamp() }).catch(() => {}), R.heartbeatSeconds * 1000);
    const tick = async () => {
      if (stop || busy) return;
      const el = (Date.now() - t0) / 1000;
      if (el >= R.searchSeconds) { await end(); on.timeout(); return; }
      const range = R.range + R.rangeStep * Math.floor(el / R.widenSeconds);
      const lo = Math.max(0, who.prints - range), hi = who.prints + range;
      on.range(lo, hi);
      busy = true;
      try {
        const q = fb.fs.query(fb.fs.collection(db, R.collection), fb.fs.where('prints', '>=', lo), fb.fs.where('prints', '<=', hi), fb.fs.limit(20));
        const list = (await fb.fs.getDocs(q)).docs
          .map(s => ({ id: s.id, ...s.data({ serverTimestamps: 'estimate' }) }))
          .filter(d => d.id !== uid && !d.room && (!mySeen || mySeen - ms(d.seen) < R.staleSeconds * 1000))
          .sort((a, b) => Math.abs(a.prints - who.prints) - Math.abs(b.prints - who.prints));
        for (const o of list) {
          if (stop) break;
          if (await claim(o)) { await end(true); on.found(); return; }
        }
      } catch (e) { console.warn('Duel :', e && (e.code || e.message)); }
      busy = false;
      accept();                                                      // un autre m'a trouvé pendant ma recherche
    };
    // Salon créé pour o, puis code écrit dans sa fiche (transaction : il est toujours libre, et moi aussi).
    const claim = async o => {
      const c = await createRoom({ mode: 'random', invite: o.id, who });
      const theirs = fb.fs.doc(db, R.collection, o.id);
      const ok = await fb.fs.runTransaction(db, async tx => {
        const a = await tx.get(mine), b = await tx.get(theirs);
        if (!a.exists() || a.data().room || !b.exists() || b.data().room) return false;
        tx.update(theirs, { room: c });
        tx.delete(mine);
        return true;
      }).catch(() => false);
      if (!ok) await leaveRoom(false);                               // salon vide supprimé
      return ok;
    };
    poll = setInterval(tick, R.pollSeconds * 1000);
    tick();
  })().catch(async e => { console.warn('Duel :', e && (e.code || e.message)); if (!stop) { await end(); on.timeout(); } });
  return { cancel: () => end() };
}
