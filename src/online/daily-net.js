// Récompenses de connexion au serveur : daily/{uid} = { lastDay, streak, cal, count, seenAt } fait foi.
// Le jour est calculé d'après l'heure du serveur (jamais celle du téléphone) : on note seenAt (heure du serveur) puis on le relit.
// La récupération est une transaction : un seul crédit par jour, même avec un double appui ou deux appareils.
// Les gemmes du jour sont versées au portefeuille (wallet/{uid}) dans la même écriture ; les règles (firestore.rules)
// refont le calcul (jour de Paris, série, calendrier, gemmes) et refusent tout le reste.
// Mode test sans émulateur (développement local) : serveur simulé sur l'appareil, jour décalé à volonté (prog.daily.test).
import { prog, saveProg } from '../game/progress.js';
import { testMode } from '../game/economy.js';
import { zoneDay, nextState, claimable, dayGems } from '../game/daily.js';
import { server, emuMode, onlineState } from './online.js';
import { ensureWallet, walletRef, flushWallet } from './wallet.js';

const DAY_MS = 86400000, WAIT_MS = 8000;
const local = () => testMode() && !emuMode();
const ref = S => S.fb.fs.doc(S.db, 'daily', S.uid);
let skew = null;                     // heure du serveur − heure de l'appareil (ms), mesurée à la dernière lecture
let busy = null, cache = null;      // dernière lecture : { at (heure de l'appareil), st }
const CACHE_MS = 10 * 60000;

const timeout = p => Promise.race([p, new Promise((_, ko) => setTimeout(() => ko(new Error('offline')), WAIT_MS))]);

/* ---------- Mode test : serveur simulé ---------- */
const T = () => prog.daily.test || (prog.daily.test = { offset: 0, doc: null });
const localNow = () => Date.now() + T().offset * DAY_MS;
/** Mode test : avance le jour simulé de n jours (2 = un jour manqué). */
export function testShiftDays(n) { T().offset += n; saveProg(); }
/** Mode test : remet le serveur simulé et la fenêtre du jour à zéro. */
export function testResetDaily() { prog.daily = { test: { offset: 0, doc: null } }; saveProg(); }
export const testDaily = () => (local() ? { offset: T().offset, day: zoneDay(localNow()) } : null);

/**
 * État du jour : { ok: true, today, doc, can } (doc : état au serveur, can : jour encore à récupérer),
 * ou { ok: false, offline: true } sans connexion.
 */
let pending = null;                  // lecture en cours (appels simultanés : une seule lecture)
export function dailyStatus(fresh = false) {
  if (pending) return pending;
  pending = readStatus(fresh).finally(() => { pending = null; });
  return pending;
}
async function readStatus(fresh) {
  // Lecture récente et même jour (d'après l'heure du serveur mesurée) : pas de nouvel aller-retour.
  if (!fresh && cache && !local() && Date.now() - cache.at < CACHE_MS && skew !== null && zoneDay(Date.now() + skew) === cache.st.today) return cache.st;
  if (local()) { const today = zoneDay(localNow()), doc = T().doc; return { ok: true, today, doc, can: claimable(doc, today) }; }
  const S = server();
  if (!S || onlineState().state !== 'online') return { ok: false, offline: true };
  try {
    const { fb } = S, r = ref(S), t0 = Date.now();
    const snap = await timeout(fb.fs.getDoc(r));
    if (!snap.exists()) await timeout(fb.fs.setDoc(r, { lastDay: 0, streak: 0, cal: 0, count: 0, seenAt: fb.fs.serverTimestamp() }));
    else await timeout(fb.fs.updateDoc(r, { seenAt: fb.fs.serverTimestamp() }));
    const read = () => timeout(fb.fs.getDocFromServer ? fb.fs.getDocFromServer(r) : fb.fs.getDoc(r)).then(s => s.data());
    let d = await read();
    if (!d.seenAt) d = await read();                  // heure du serveur pas encore relue : seconde lecture
    if (!d.seenAt) throw new Error('offline');
    const at = d.seenAt.toMillis();
    skew = at - (t0 + Date.now()) / 2;
    const today = zoneDay(at);
    const st = { ok: true, today, doc: d, can: claimable(d, today) };
    cache = { at: Date.now(), st };
    return st;
  } catch (e) {
    console.warn('Récompenses de connexion :', e && (e.code || e.message));
    return { ok: false, offline: true };
  }
}

/**
 * Récupère le jour : { ok: true, state, today } (state : nouvel état, gemmes déjà versées au serveur),
 * { ok: false, already: true, today } (déjà récupéré aujourd'hui, ici ou sur un autre appareil), { ok: false, offline: true }.
 * Un seul appel à la fois (double appui : le second attend le premier et reçoit « déjà récupéré »).
 */
export function claimDaily() {
  if (busy) return busy.then(r => (r.ok ? { ok: false, already: true, today: r.today } : r));
  busy = doClaim().finally(() => { busy = null; });
  return busy;
}

async function doClaim(retry = true) {
  if (local()) {
    const today = zoneDay(localNow());
    if (!claimable(T().doc, today)) return { ok: false, already: true, today };
    const state = nextState(T().doc, today);
    T().doc = state; saveProg();
    return { ok: true, state, today };
  }
  const S = server();
  if (!S || onlineState().state !== 'online') return { ok: false, offline: true };
  if (skew === null) { const st = await dailyStatus(); if (!st.ok) return st; }
  const { fb, db } = S, r = ref(S), w = walletRef(S), today = zoneDay(Date.now() + skew);
  try {
    await timeout(ensureWallet(S));
    const res = await timeout(fb.fs.runTransaction(db, async tx => {
      const cur = await tx.get(r);
      if (!cur.exists()) return { missing: true };
      const d = cur.data();
      if (!claimable(d, today)) return { already: true };
      const state = nextState(d, today), gems = dayGems(state);
      const wal = gems ? await tx.get(w) : null;
      if (gems) tx.update(w, { gems: wal.data().gems + gems, updatedAt: fb.fs.serverTimestamp() });
      tx.update(r, { ...state, seenAt: fb.fs.serverTimestamp() });
      return { state };
    }));
    if (res.missing && retry) { skew = null; return doClaim(false); }   // document pas encore créé : on le crée (dailyStatus)
    if (res.missing) return { ok: false, offline: true };
    if (res.already) { cache = null; return { ok: false, already: true, today }; }
    flushWallet();                                   // gemmes de l'appareil alignées sur le portefeuille
    cache = { at: Date.now(), st: { ok: true, today, doc: res.state, can: false } };
    return { ok: true, state: res.state, today };
  } catch (e) {
    // Jour estimé faux (minuit tout juste passé) : on relit l'heure du serveur et on réessaie une fois.
    if (e && e.code === 'permission-denied' && retry) { skew = null; return doClaim(false); }
    console.warn('Récompenses de connexion :', e && (e.code || e.message));
    return { ok: false, offline: true };
  }
}
