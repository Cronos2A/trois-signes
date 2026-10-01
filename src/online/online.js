// Serveur Firebase (data/online.json) : connexion anonyme automatique et sauvegarde en ligne.
// Le SDK est embarqué (src/vendor/firebase/) et chargé après le démarrage, sans retarder le jeu.
// Document Firestore players/{uid} = { pseudo, save (progression en JSON), savedAt, updatedAt, v }.
// La sauvegarde locale reste la référence hors connexion ; entre l'appareil et le serveur, la plus récente (savedAt) l'emporte.
// Règles de sécurité : firestore.rules (chaque joueur ne lit et n'écrit que son propre document).
import { readSave } from '../game/save-check.js';
import { D } from '../data.js';
import { prog, onSaved, saveProg, saveState } from '../game/progress.js';

const O = () => D.online;
let fb = null, auth = null, db = null, user = null;
let state = 'off', dirty = false, timer = 0, retry = 0, starting = null, hooks = {}, paused = false;
const listeners = new Set();

/** État affiché dans les Réglages : off | connecting | online | saving | offline | error, et l'identifiant. */
export const onlineState = () => ({ state, uid: user ? user.uid : null });
export const onOnlineChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
function setState(s) { if (s === state) return; state = s; listeners.forEach(f => { try { f(onlineState()); } catch (e) {} }); }

async function loadSdk() {
  const base = new URL('../../' + O().sdk.path, import.meta.url).href;
  const [app, a, fs] = await Promise.all(['app', 'auth', 'firestore'].map(m => import(base + 'firebase-' + m + '.js')));
  return { app, auth: a, fs };
}

const docRef = () => fb.fs.doc(db, O().collection, user.uid);

/**
 * Démarre la connexion (sans bloquer) : SDK, compte anonyme (créé au premier lancement, gardé ensuite par le navigateur),
 * puis première synchronisation. h.applyRemote(save) : sauvegarde du serveur plus récente que celle de l'appareil.
 */
export function initOnline(h = {}) {
  hooks = h;
  onSaved(() => { dirty = true; schedule(); });
  addEventListener('online', () => start());
  addEventListener('offline', () => setState('offline'));
  return start();
}

function start() {
  if (user && db) { if (dirty) schedule(0); return Promise.resolve(); }
  if (starting) return starting;
  setState(navigator.onLine === false ? 'offline' : 'connecting');
  starting = (async () => {
    try {
      fb = fb || await loadSdk();
      if (!auth) {
        const app = fb.app.initializeApp(O().firebase);
        auth = fb.auth.getAuth(app);
        // ?longpoll dans l'adresse (data/online.json → longPollParam) : requêtes classiques au lieu du flux continu,
        // pour les réseaux (proxy d'entreprise, tests) qui coupent le flux de Firestore.
        const longPoll = new URLSearchParams(location.search).has(O().longPollParam);
        db = longPoll ? fb.fs.initializeFirestore(app, { experimentalForceLongPolling: true }) : fb.fs.getFirestore(app);
        // Tests en local : émulateurs Firebase (?emu dans l'adresse, data/online.json → emulator), jamais en production.
        if (new URLSearchParams(location.search).has(O().emulator.param)) {
          const E = O().emulator;
          fb.auth.connectAuthEmulator(auth, 'http://' + E.host + ':' + E.authPort, { disableWarnings: true });
          fb.fs.connectFirestoreEmulator(db, E.host, E.firestorePort);
        }
      }
      await auth.authStateReady();
      if (!auth.currentUser) await fb.auth.signInAnonymously(auth);
      user = auth.currentUser;
      await firstSync();
    } catch (e) {
      console.warn('Serveur :', e && (e.code || e.message));
      user = auth && auth.currentUser || null;
      setState(navigator.onLine === false ? 'offline' : 'error');
      clearTimeout(retry); retry = setTimeout(() => { starting = null; start(); }, O().sync.retryMs);
    } finally { starting = null; }
  })();
  return starting;
}

/** Première synchronisation : la sauvegarde la plus récente l'emporte (serveur → appareil, ou appareil → serveur). */
async function firstSync() {
  // Sauvegarde locale endommagée : rien n'est échangé avant le choix du joueur (main.js → écran « Sauvegarde endommagée »).
  if (saveState.damaged) { setState('online'); return; }
  const snap = await fb.fs.getDoc(docRef());
  const remote = snap.exists() ? snap.data() : null;
  if (remote && remote.save && (remote.savedAt || 0) > (prog.savedAt || 0)) {
    let data = null;
    try { data = JSON.parse(remote.save); } catch (e) {}
    if (data && hooks.applyRemote) await hooks.applyRemote(data);
    dirty = false;
    setState('online');
    if (hooks.afterUpload) hooks.afterUpload();
    return;
  }
  setState('online');
  if (!remote || (prog.savedAt || 0) > (remote.savedAt || 0)) { dirty = true; await upload(); }
  else if (hooks.afterUpload) hooks.afterUpload();
}

function schedule(ms = O().sync.debounceMs) {
  clearTimeout(timer);
  timer = setTimeout(() => upload().catch(() => {}), ms);
}

/** Envoie la progression (seulement une fois connecté ; sinon elle attend, gardée sur l'appareil). */
async function upload() {
  if (!dirty || saveState.damaged || paused) return;
  if (!user || !db) { start(); return; }
  if (navigator.onLine === false) { setState('offline'); return; }
  dirty = false;
  setState('saving');
  try {
    await fb.fs.setDoc(docRef(), {
      pseudo: (prog.profile && prog.profile.pseudo) || '',
      save: JSON.stringify(prog),
      savedAt: prog.savedAt || Date.now(),
      updatedAt: fb.fs.serverTimestamp(),
      v: O().saveVersion
    });
    setState(dirty ? 'saving' : 'online');
    if (hooks.afterUpload) hooks.afterUpload();                     // classements (online/leaderboard.js)
  } catch (e) {
    console.warn('Sauvegarde en ligne :', e && (e.code || e.message));
    dirty = true;
    setState(navigator.onLine === false ? 'offline' : 'error');
    schedule(O().sync.retryMs);
  }
}

/** Change le pseudo (déjà vérifié par online/pseudo.js) ; envoyé au serveur avec la sauvegarde. */
export function setPseudo(p) {
  prog.profile = { ...(prog.profile || {}), pseudo: p };
  saveProg();
  schedule(0);
}

export const pseudo = () => (prog.profile && prog.profile.pseudo) || '';
/** Connecté aux émulateurs Firebase (?emu, tests) ? */
export const emuMode = () => { try { return new URLSearchParams(location.search).has(O().emulator.param); } catch (e) { return false; } };

/** Accès au serveur pour le Duel (online/duel-net.js) : SDK, base, joueur ; null tant que la connexion n'est pas prête. */
export const server = () => (user && db ? { fb, db, uid: user.uid } : null);
/** Attend la connexion (ou échoue après ms). */
export function whenOnline(ms = 20000) {
  if (server()) return Promise.resolve(server());
  start();
  return new Promise((ok, ko) => {
    const t = setTimeout(() => { off(); ko(new Error('offline')); }, ms);
    const off = onOnlineChange(() => { if (server()) { clearTimeout(t); off(); ok(server()); } });
  });
}

/** Sauvegarde en ligne de ce compte (pour l'écran « Sauvegarde endommagée ») : { data, savedAt } si elle est lisible, sinon null. */
export async function remoteSave() {
  const S = await whenOnline();
  const snap = await S.fb.fs.getDoc(S.fb.fs.doc(S.db, O().collection, S.uid));
  if (!snap.exists() || !snap.data().save) return null;
  const r = readSave(snap.data().save);
  return r.damaged || !Object.keys(r.data).length ? null : { data: r.data, savedAt: snap.data().savedAt || 0 };
}

/**
 * Compte (online/account.js) : SDK, application Firebase, connexion, base ; null tant que la connexion n'est pas prête.
 * pauseSync() : plus aucun envoi (changement ou suppression du compte, juste avant le rechargement du jeu).
 */
export const accountApi = () => (auth && db && user ? { fb, auth, db, app: auth.app, user: auth.currentUser } : null);
export function pauseSync() { paused = true; clearTimeout(timer); clearTimeout(retry); }
/** Envoie tout de suite la sauvegarde en attente (avant de lier le compte). */
export async function flushSave() { if (dirty) await upload(); }

/** Tests : envoie tout de suite ce qui attend, et lit un document (le sien, ou celui d'un autre : refusé par les règles). */
export const flushNow = () => { dirty = true; return upload(); };
export async function readPlayer(uid) {
  const s = await fb.fs.getDoc(fb.fs.doc(db, O().collection, uid));
  return s.exists() ? s.data() : null;
}
export async function writePlayer(uid, data) { await fb.fs.setDoc(fb.fs.doc(db, O().collection, uid), data); }
