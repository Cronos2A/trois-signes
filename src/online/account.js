// Compte du joueur (data/online.json → account) : liaison à Google, connexion avec Google sur un autre appareil, suppression.
// - Liaison : le compte anonyme devient un compte Google (même identifiant, rien ne change ni ne se perd).
//   Web : fenêtre Google (linkWithPopup). Application Android (Capacitor) : extension native (account.nativePlugin), qui donne
//   le jeton Google, puis linkWithCredential.
// - Ce compte Google a déjà sa propre progression (autre appareil, réinstallation) : on la lit à part (application Firebase
//   secondaire, rien n'est écrit), le joueur choisit laquelle garder ; seulement après sa confirmation, le compte anonyme
//   de cet appareil est effacé et le jeu se recharge sur le compte Google, avec la progression choisie.
// - Suppression : closed/{uid} (firestore.rules), puis tous les documents du joueur, puis le compte ; le jeu repart de zéro.
import { D } from '../data.js';
import { prog, store, freezeSave } from '../game/progress.js';
import { zoneDay } from '../game/daily.js';
import { accountApi, whenOnline, pauseSync, flushSave, emuMode } from './online.js';

const A = () => D.online.account;
const PROVIDER = 'google.com';

/** { linked, email } : compte lié à Google ? */
export function googleInfo() {
  const S = accountApi();
  const g = S && S.user && S.user.providerData.find(p => p.providerId === PROVIDER);
  return { linked: !!g, email: g ? g.email || '' : '' };
}

const native = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const plugin = () => native() && window.Capacitor.Plugins && window.Capacitor.Plugins[A().nativePlugin];

/** Jeton Google de l'application native (extension Capacitor), en identifiant Firebase. */
async function nativeCredential(fb) {
  const P = plugin();
  if (!P) throw Object.assign(new Error('plugin'), { code: 'ts/no-plugin' });
  const r = await P.signInWithGoogle({ skipNativeAuth: true });
  if (!r || !r.credential || !r.credential.idToken) throw Object.assign(new Error('cancel'), { code: 'auth/popup-closed-by-user' });
  return fb.auth.GoogleAuthProvider.credential(r.credential.idToken, r.credential.accessToken);
}

const cancelled = e => ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'].includes(e && e.code)
  || /cancel/i.test((e && e.message) || '');

/**
 * Chiffres gardés par le serveur pour un compte : gemmes (wallet), Empreintes (ranked), série de connexion (daily ; 0 si elle est
 * déjà rompue, c'est-à-dire si le dernier jour récupéré est avant hier).
 */
async function serverStats(fs, db, uid) {
  const get = async c => { try { const d = await fs.getDoc(fs.doc(db, c, uid)); return d.exists() ? d.data() : null; } catch (e) { return null; } };
  const [wallet, ranked, daily] = await Promise.all([get('wallet'), get(A().ranked), get('daily')]);
  const today = zoneDay(Date.now());
  return { gems: wallet ? wallet.gems || 0 : 0, prints: ranked ? ranked.prints || 0 : 0,
    streak: daily && daily.lastDay >= today - 1 ? daily.streak || 0 : 0 };
}

/** Résumé d'une progression pour le choix : pseudo, record, histoires, plus haut niveau, or ; gemmes, Empreintes, série (serveur). */
export function summarize(save, extra = {}) {
  const s = save || {};
  const stories = Object.values((s.story && s.story.done) || {}).filter(l => l.length >= 10).length;
  const lvl = Math.max(1, ...Object.values(s.chars || {}).map(c => (c && c.lvl) || 1));
  return { pseudo: (s.profile && s.profile.pseudo) || '', best: s.best || 0, stories, lvl,
    gold: (s.eco && s.eco.gold) || 0, gems: extra.gems ?? ((s.eco && s.eco.gems) || 0), prints: extra.prints ?? ((s.duel && s.duel.prints) || 0),
    streak: extra.streak || 0, savedAt: s.savedAt || 0, empty: !save };
}

/** Lit la progression d'un compte Google sans rien changer ici : application Firebase à part, connexion en mémoire seulement. */
async function peek(S, cred) {
  const { fb } = S;
  const app = fb.app.initializeApp(D.online.firebase, 'ts-peek-' + Date.now());
  try {
    const auth = fb.auth.initializeAuth(app, { persistence: fb.auth.inMemoryPersistence });
    const longPoll = new URLSearchParams(location.search).has(D.online.longPollParam);
    const db = longPoll ? fb.fs.initializeFirestore(app, { experimentalForceLongPolling: true }) : fb.fs.getFirestore(app);
    if (emuMode()) {
      const E = D.online.emulator;
      fb.auth.connectAuthEmulator(auth, 'http://' + E.host + ':' + E.authPort, { disableWarnings: true });
      fb.fs.connectFirestoreEmulator(db, E.host, E.firestorePort);
    }
    const u = (await fb.auth.signInWithCredential(auth, cred)).user;
    let player = null;
    try { const d = await fb.fs.getDoc(fb.fs.doc(db, D.online.collection, u.uid)); player = d.exists() ? d.data() : null; } catch (e) {}
    const stats = await serverStats(fb.fs, db, u.uid);
    let save = null;
    try { save = player && player.save ? JSON.parse(player.save) : null; } catch (e) {}
    await fb.auth.signOut(auth).catch(() => {});
    return { uid: u.uid, save, summary: summarize(save, stats) };
  } finally { fb.app.deleteApp(app).catch(() => {}); }
}

/**
 * « Sauvegarder ma progression avec Google » et « Se connecter avec Google » (même déroulé).
 * choose(ici, google) : promesse → 'phone' (garder celle de cet appareil), 'google' (celle du compte Google) ou null (annuler).
 * Résultat : { status: 'linked' | 'switched' | 'already' | 'cancelled' | 'offline' | 'error', code }.
 * 'switched' : le jeu se recharge sur le compte Google.
 */
export async function connectGoogle(choose) {
  let S;
  try { await whenOnline(15000); S = accountApi(); } catch (e) { return { status: 'offline' }; }
  if (!S) return { status: 'offline' };
  if (googleInfo().linked) return { status: 'already' };
  const { fb, auth } = S, anon = auth.currentUser;
  await flushSave().catch(() => {});
  let cred = null;
  try {
    if (native()) { cred = await nativeCredential(fb); await fb.auth.linkWithCredential(anon, cred); }
    else await fb.auth.linkWithPopup(anon, new fb.auth.GoogleAuthProvider());
    await anon.reload().catch(() => {});
    return { status: 'linked' };
  } catch (e) {
    if (cancelled(e)) return { status: 'cancelled' };
    if (e.code !== 'auth/credential-already-in-use' && e.code !== 'auth/email-already-in-use') return { status: 'error', code: e.code || e.message };
    cred = cred || fb.auth.GoogleAuthProvider.credentialFromError(e);
    if (!cred) return { status: 'error', code: e.code };
  }
  // Ce compte Google a déjà sa progression : lue à part, rien n'est écrit avant le choix du joueur.
  let other;
  try { other = await peek(S, cred); } catch (e) { return { status: 'error', code: e.code || e.message }; }
  const mine = await serverStats(fb.fs, S.db, anon.uid);
  const choice = await choose(summarize(prog, mine), other.summary);
  if (choice !== 'phone' && choice !== 'google') return { status: 'cancelled' };
  const keep = choice === 'phone' ? JSON.parse(JSON.stringify(prog)) : other.save;
  try { localStorage.setItem(A().backupKey, JSON.stringify(prog)); } catch (e) {}     // copie de secours de cet appareil
  pauseSync(); freezeSave();
  // Le compte anonyme de cet appareil est fermé et effacé (sa progression est gardée dans « keep » si le joueur l'a choisie).
  await eraseServerData(S, anon.uid).catch(e => console.warn('Compte :', e && (e.code || e.message)));
  await fb.auth.deleteUser(anon).catch(e => console.warn('Compte :', e && (e.code || e.message)));
  try {
    const u = (await fb.auth.signInWithCredential(auth, cred)).user;
    if (choice === 'phone' || !keep) {
      // Progression de cet appareil gardée : elle devient celle du compte Google (gemmes, Empreintes et série de connexion
      // restent celles du serveur pour ce compte ; les gemmes gagnées une fois chacune sont reprises au prochain lancement).
      const data = keep || JSON.parse(JSON.stringify(prog));
      data.savedAt = Date.now();
      await fb.fs.setDoc(fb.fs.doc(S.db, D.online.collection, u.uid), {
        pseudo: (data.profile && data.profile.pseudo) || '', save: JSON.stringify(data), savedAt: data.savedAt,
        updatedAt: fb.fs.serverTimestamp(), v: D.online.saveVersion
      });
      store.set('ts_prog', data);
    } else store.set('ts_prog', keep);
  } catch (e) {
    console.warn('Compte :', e && (e.code || e.message));
    return { status: 'error', code: e.code || e.message };
  }
  return { status: 'switched' };
}

/** Efface tous les documents d'un joueur au serveur (closed/{uid} d'abord : voir firestore.rules). */
async function eraseServerData(S, uid) {
  const { fb, db } = S, doc = (c, id) => fb.fs.doc(db, c, id);
  await fb.fs.setDoc(doc(A().closed, uid), { at: fb.fs.serverTimestamp() });
  const games = await fb.fs.getDocs(fb.fs.collection(db, A().ranked, uid, 'games')).catch(() => null);
  const dels = [...(games ? games.docs.map(g => fb.fs.deleteDoc(g.ref)) : []),
    ...[...A().erase, A().ranked].map(c => fb.fs.deleteDoc(doc(c, uid)))];
  const r = await Promise.allSettled(dels);
  const failed = r.filter(x => x.status === 'rejected');
  if (failed.length) throw failed[0].reason;
}

/**
 * « Supprimer mon compte et mes données » : toute la progression au serveur, le portefeuille, les récompenses de connexion,
 * les classements, les Empreintes, puis le compte ; enfin la sauvegarde de l'appareil. Le jeu repart au premier lancement.
 * Résultat : { status: 'deleted' | 'offline' | 'cancelled' | 'error', code }.
 */
export async function deleteAccount() {
  let S;
  try { await whenOnline(15000); S = accountApi(); } catch (e) { return { status: 'offline' }; }
  if (!S) return { status: 'offline' };
  const { fb, auth } = S, u = auth.currentUser;
  // Compte lié à Google : Google redemande la connexion d'abord (exigé pour supprimer) ; annulée, rien n'est effacé.
  if (googleInfo().linked) {
    try {
      if (native()) await fb.auth.reauthenticateWithCredential(u, await nativeCredential(fb));
      else await fb.auth.reauthenticateWithPopup(u, new fb.auth.GoogleAuthProvider());
    } catch (e) { return { status: cancelled(e) ? 'cancelled' : 'error', code: e.code || e.message }; }
  }
  pauseSync(); freezeSave();
  try { await eraseServerData(S, u.uid); }
  catch (e) { console.warn('Suppression :', e && (e.code || e.message)); return { status: 'error', code: e.code || e.message }; }
  // Données effacées : même si le compte lui-même refuse de partir, on s'en déconnecte (un nouveau compte naîtra au lancement).
  await fb.auth.deleteUser(u).catch(e => { console.warn('Suppression du compte :', e && (e.code || e.message)); return fb.auth.signOut(auth); }).catch(() => {});
  wipeDevice();
  return { status: 'deleted' };
}

/** Efface la progression de cet appareil (les réglages du son et de la langue restent). */
export function wipeDevice() {
  for (const k of ['ts_prog', 'ts_prog_damaged', A().backupKey]) { try { localStorage.removeItem(k); } catch (e) {} }
}
