// Classements (data/online.json → leaderboard, data/classement.json) : Duel (Empreintes) par arène, global et par pays ;
// Voyage (meilleur score) global et par pays. Chaque joueur écrit sa ligne leaderboard/{uid} =
// { pseudo, hero, voyage, prints, arene, pays, since, updatedAt } ; Empreintes, arène, pays et date d'obtention (since) sont
// recopiés de ranked/{uid} et vérifiés par les règles, qui refusent aussi qu'un meilleur score du Voyage baisse.
// Une vue = pageSize lignes (puis « Voir plus » par moreSize) ; rang du joueur par requêtes de comptage ; cache sur l'appareil.
import { D } from '../data.js';
import { prog } from '../game/progress.js';
import { server, whenOnline, pseudo } from './online.js';
import { rankedInfo, setRankedCountry } from './ranked.js';
import { myCountry } from '../game/country.js';
import { store } from '../game/progress.js';
import { nfi } from '../i18n.js';

const L = () => D.online.leaderboard, K = () => D.classement;
let sent = null, remoteBest = null, busy = false, pending = 0, pendingTimer = null;

/** Héros favori : le plus joué (prog.played), sinon celui qui a le plus haut niveau. */
export function favoriteHero() {
  const P = prog.played || {}, ids = Object.keys(P);
  if (ids.length) return ids.sort((a, b) => P[b] - P[a])[0];
  const C = prog.chars || {};
  return Object.keys(C).sort((a, b) => ((C[b].lvl || 1) - (C[a].lvl || 1)) || ((C[b].xp || 0) - (C[a].xp || 0)))[0] || 'aldric';
}

const ref = S => S.fb.fs.doc(S.db, L().collection, S.uid);

/** Met à jour ma ligne si pseudo, héros favori, record ou Empreintes ont changé (appelé après chaque envoi de la sauvegarde). */
export async function syncBoard() {
  const S = server();
  if (!S || !pseudo() || busy) return;
  busy = true;
  try {
    if (remoteBest === null) {                                        // première fois : record déjà au serveur (il ne baisse jamais)
      const s = await S.fb.fs.getDoc(ref(S));
      remoteBest = s.exists() ? (s.data().voyage || 0) : -1;
    }
    // Empreintes, arène et date d'obtention : celles du serveur (ranked/{uid}) ; pays : le choix du joueur, recopié d'abord dans
    // ranked/{uid} (les règles exigent le même des deux côtés) ; record : jamais plus bas que celui déjà classé.
    const info = await rankedInfo(), pays = myCountry() ?? null;
    if (info.exists && info.pays !== pays) { await setRankedCountry(pays); info.pays = pays; }
    const row = { pseudo: pseudo(), hero: favoriteHero(), voyage: Math.max(prog.best || 0, remoteBest, 0), prints: info.prints, pays };
    if (info.exists) { row.arene = info.arene; row.since = info.since; }
    const key = JSON.stringify({ ...row, since: row.since && row.since.toMillis ? row.since.toMillis() : null });
    if (key === sent) return;
    let legacy = false;                                    // règles d'avant le 07/10/2026 : ni arene, ni pays, ni since
    const put = async r => {
      const { arene, pays: c, since, ...old } = r;
      try { await S.fb.fs.setDoc(ref(S), { ...(legacy ? old : r), updatedAt: S.fb.fs.serverTimestamp() }); }
      catch (e) {
        if (legacy || !(e && e.code === 'permission-denied')) throw e;
        legacy = true;
        await S.fb.fs.setDoc(ref(S), { ...old, updatedAt: S.fb.fs.serverTimestamp() });
      }
    };
    try { await put(row); }
    catch (e) {
      // Record refusé (pas de partie du Voyage enregistrée au serveur assez longue pour ce score) : le reste est quand même mis à jour.
      if (!(e && e.code === 'permission-denied') || row.voyage <= Math.max(remoteBest, 0)) throw e;
      console.info('Classements : record en attente', row.voyage);
      queueRecord(row.voyage);
      row.voyage = Math.max(remoteBest, 0);
      legacy = false;
      await put(row);
    }
    sent = key; remoteBest = row.voyage;
    if (pending && remoteBest >= pending) {               // record fait hors connexion enfin classé : on le dit au joueur
      const n = pending; pending = 0;
      import('../ui/ad-ui.js').then(m => m.adToast(L().ui.recordSynced.replace('{n}', nfi(n)))).catch(() => {});
    }
  } catch (e) {
    console.warn('Classements :', e && (e.code || e.message));
  } finally { busy = false; }
}

/**
 * Record refusé faute de partie notée au serveur assez longue (partie commencée hors connexion) : dès qu'on est de retour au lobby
 * et connecté, on note au serveur un nouveau départ (runs/{uid}), on attend la durée minimale que les règles demandent pour ce score
 * (data/duel.json → security.voyage), puis on renvoie la ligne. Jamais en pleine partie (le départ noté est celui de la partie en cours).
 */
function queueRecord(v) {
  pending = Math.max(pending, v);
  if (!pendingTimer) pendingTimer = setTimeout(syncRecord, 1000);
}
async function syncRecord() {
  pendingTimer = null;
  if (!pending) return;
  const S = server();
  if (!S || document.documentElement.classList.contains('in-game')) { pendingTimer = setTimeout(syncRecord, 5000); return; }
  try {
    await S.fb.fs.setDoc(S.fb.fs.doc(S.db, 'runs', S.uid), { startedAt: S.fb.fs.serverTimestamp() });
  } catch (e) { pendingTimer = setTimeout(syncRecord, 20000); return; }
  // Durée t telle que perSecond × t × (base + growth × t) ≥ record, plus une marge pour l'écart d'horloge.
  const V = D.duel.security.voyage, a = V.perSecond * V.growth, b = V.perSecond * V.base;
  const t = (-b + Math.sqrt(b * b + 4 * a * pending)) / (2 * a);
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    if (document.documentElement.classList.contains('in-game')) { pendingTimer = setTimeout(syncRecord, 5000); return; }
    sent = null;                                          // forcer le renvoi de la ligne
    syncBoard();
  }, (t * 1.05 + L().recordMargin) * 1000);
}

/** Début d'une partie du Voyage : heure notée au serveur (runs/{uid}), qui borne le record accepté selon la durée de la partie. */
export function startRun() {
  const S = server();
  if (S) S.fb.fs.setDoc(S.fb.fs.doc(S.db, 'runs', S.uid), { startedAt: S.fb.fs.serverTimestamp() }).catch(e => console.warn('Classements :', e && (e.code || e.message)));
}

/* ---------- Lecture des classements ---------- */
// Vue : { board: 'duel' | 'voyage', view: 'arena' | 'global' | 'country', arena (1 à 8), country (code) }.
// Résultat : { rows: [{ uid, pseudo, hero, pays, value, arene, since, rank }], more (d'autres lignes à lire),
//   me: { uid, ranked (classé), value, arene, pays, rank (null : pas classé dans cette vue) }, at (heure de lecture), offline, cached }.
// Égalité d'Empreintes : le premier arrivé devant (since le plus ancien) ; Voyage : ex æquo au même rang.

const viewKey = v => [v.board, v.view, v.view === 'arena' ? v.arena : '', v.view === 'country' ? v.country || '' : ''].join(':');
const ms = t => (t && t.toMillis ? t.toMillis() : t || null);
function readCache() { try { return store.get(K().cacheKey) || {}; } catch (e) { return {}; } }
function writeCache(key, data) {
  try {
    const all = readCache(), now = Date.now();
    for (const k of Object.keys(all)) if (now - all[k].at > 864e5) delete all[k];   // plus vieux qu'un jour : retiré
    all[key] = data;
    store.set(K().cacheKey, all);
  } catch (e) { /* stockage plein ou interdit : sans cache */ }
}
/** Dernier classement gardé pour cette vue (ou null). */
export const cachedView = v => readCache()[viewKey(v)] || null;
/** Oublie le cache (compte supprimé, changement de pays). */
export function clearRankCache() { try { store.set(K().cacheKey, {}); } catch (e) { /* rien */ } }

const withTimeout = p => Promise.race([p, new Promise((ok, ko) => setTimeout(() => ko(new Error('offline')), K().timeoutSeconds * 1000))]);

/** Filtres et ordre d'une vue (sans limite). */
function viewQuery(fb, col, v, after) {
  const W = [], f = fb.fs;
  if (v.board === 'duel') {
    if (v.view === 'arena') W.push(f.where('arene', '==', v.arena));
    if (v.view === 'country') W.push(f.where('pays', '==', v.country));
    W.push(f.orderBy('prints', 'desc'), f.orderBy('since', 'asc'));
    if (after) W.push(f.startAfter(after.value, f.Timestamp.fromMillis(after.since)));
  } else {
    if (v.view === 'country') W.push(f.where('pays', '==', v.country));
    W.push(f.where('voyage', '>', 0), f.orderBy('voyage', 'desc'));
    if (after) W.push(f.startAfter(after.value));
  }
  return f.query(col, ...W);
}

/** Rang du joueur dans sa propre version de la vue (son arène, son pays) : nombre de joueurs devant + 1, par comptage. */
async function myRank(fb, col, v, me, rows) {
  const f = fb.fs, count = async (...w) => (await f.getCountFromServer(f.query(col, ...w))).data().count;
  if (v.board === 'duel') {
    if (!me.ranked) return null;
    const scope = v.view === 'arena' ? [f.where('arene', '==', me.arene)] : v.view === 'country' ? [f.where('pays', '==', me.pays)] : [];
    if (v.view === 'country' && !me.pays) return null;
    const mine = (v.view === 'global' || (v.view === 'arena' && v.arena === me.arene) || (v.view === 'country' && v.country === me.pays))
      ? rows.findIndex(r => r.uid === me.uid) : -1;
    if (mine >= 0) return mine + 1;
    const ahead = await count(...scope, f.where('prints', '>', me.value));
    const tied = await count(...scope, f.where('prints', '==', me.value), f.where('since', '<', f.Timestamp.fromMillis(me.since)));
    return ahead + tied + 1;
  }
  if (!me.value) return null;
  if (v.view === 'country' && !me.pays) return null;
  const scope = v.view === 'country' ? [f.where('pays', '==', me.pays)] : [];
  return (await count(...scope, f.where('voyage', '>', me.value))) + 1;
}

/** Rangs des lignes : Duel = position (égalités départagées par since) ; Voyage = ex æquo au même rang. */
function rankRows(board, rows, from = 0, prev = null) {
  let r = prev ? prev.rank : 0, pv = prev ? prev.value : null;
  rows.forEach((x, i) => {
    if (board === 'duel') x.rank = from + i + 1;
    else { if (x.value !== pv) { r = from + i + 1; pv = x.value; } x.rank = r; }
  });
  return rows;
}

const rowOf = (board, d) => ({ uid: d.id, pseudo: d.get('pseudo'), hero: d.get('hero'), pays: d.get('pays') || null,
  value: d.get(board === 'duel' ? 'prints' : 'voyage') || 0, arene: d.get('arene') || null, since: ms(d.get('since')) });

/**
 * Une vue du classement. opts : { force (relire le serveur même si le cache est récent), more (lignes suivantes) }.
 * Hors connexion (ou serveur muet après timeoutSeconds) : le dernier classement en cache avec offline = true ; sans cache, une erreur.
 */
export async function fetchView(v, opts = {}) {
  const key = viewKey(v), S = server();
  let cache = cachedView(v);
  if (cache && S && cache.me && cache.me.uid !== S.uid) cache = null;            // autre compte sur cet appareil
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (!opts.force && !opts.more && cache && (offline || Date.now() - cache.at < K().cacheMinutes * 60000)) return { ...cache, cached: true, offline };
  try {
    const res = await withTimeout(readView(v, opts.more ? cache : null));
    writeCache(key, res);
    return { ...res, cached: false, offline: false };
  } catch (e) {
    if (cache) return { ...cache, cached: true, offline: true };
    throw e;
  }
}

async function readView(v, base) {
  if (!navigator.onLine) throw new Error('offline');
  const S = server() || await whenOnline(K().timeoutSeconds * 1000);
  const { fb, db, uid } = S, col = fb.fs.collection(db, L().collection);
  if (base) {                                                         // « Voir plus » : moreSize lignes après la dernière
    const last = base.rows[base.rows.length - 1];
    const docs = last ? (await fb.fs.getDocs(fb.fs.query(viewQuery(fb, col, v, last), fb.fs.limit(K().moreSize)))).docs : [];
    const rows = rankRows(v.board, docs.map(d => rowOf(v.board, d)), base.rows.length, last);
    return { ...base, rows: [...base.rows, ...rows], more: docs.length === K().moreSize, at: base.at };
  }
  await syncBoard();
  const snap = await fb.fs.getDocs(fb.fs.query(viewQuery(fb, col, v), fb.fs.limit(K().pageSize)));
  const rows = rankRows(v.board, snap.docs.map(d => rowOf(v.board, d)));
  const mine = await fb.fs.getDoc(ref(S));
  const md = mine.exists() ? mine.data() : {};
  const me = { uid, ranked: v.board === 'duel' ? md.since != null : (md.voyage || 0) > 0, pays: md.pays || null,
    value: (v.board === 'duel' ? md.prints : md.voyage) || 0, arene: md.arene || 1, since: ms(md.since) };
  me.rank = await myRank(fb, col, v, me, rows);
  return { rows, more: snap.docs.length === K().pageSize, me, at: Date.now() };
}
