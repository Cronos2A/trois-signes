// Classements (data/online.json → leaderboard) : Voyage (meilleur score) et Duel (Empreintes).
// Chaque joueur écrit sa ligne leaderboard/{uid} = { pseudo, hero, voyage, prints, updatedAt } ; le serveur refuse qu'un
// meilleur score du Voyage baisse (firestore.rules). Top 100 et position (nombre de joueurs devant + 1) lus à la demande.
import { D } from '../data.js';
import { prog } from '../game/progress.js';
import { server, whenOnline, pseudo } from './online.js';
import { serverPrints } from './ranked.js';
import { nfi } from '../i18n.js';

const L = () => D.online.leaderboard;
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
    // Empreintes : celles du serveur (ranked/{uid}) ; record : jamais plus bas que celui déjà classé.
    const row = { pseudo: pseudo(), hero: favoriteHero(), voyage: Math.max(prog.best || 0, remoteBest, 0), prints: await serverPrints() };
    const key = JSON.stringify(row);
    if (key === sent) return;
    const put = r => S.fb.fs.setDoc(ref(S), { ...r, updatedAt: S.fb.fs.serverTimestamp() });
    try { await put(row); }
    catch (e) {
      // Record refusé (pas de partie du Voyage enregistrée au serveur assez longue pour ce score) : le reste est quand même mis à jour.
      if (!(e && e.code === 'permission-denied') || row.voyage <= Math.max(remoteBest, 0)) throw e;
      console.info('Classements : record en attente', row.voyage);
      queueRecord(row.voyage);
      row.voyage = Math.max(remoteBest, 0);
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

/**
 * Top et position pour un classement (id : 'voyage' | 'duel').
 * Renvoie { rows: [{ uid, pseudo, hero, value }], me: { uid, value, rank (null : pas classé) } }.
 */
export async function fetchBoard(id) {
  const S = await whenOnline();
  await syncBoard();
  const { fb, db, uid } = S, B = L().boards.find(b => b.id === id), col = fb.fs.collection(db, L().collection);
  const q = fb.fs.query(col, fb.fs.where(B.field, '>', 0), fb.fs.orderBy(B.field, 'desc'), fb.fs.limit(L().top));
  const rows = (await fb.fs.getDocs(q)).docs.map(d => ({ uid: d.id, pseudo: d.get('pseudo'), hero: d.get('hero'), value: d.get(B.field) || 0 }));
  const mine = await fb.fs.getDoc(ref(S));
  const value = mine.exists() ? (mine.get(B.field) || 0) : 0;
  let rank = null;
  const at = rows.findIndex(r => r.uid === uid);
  if (value > 0) {
    if (at >= 0) rank = rows.filter(r => r.value > value).length + 1;
    else rank = (await fb.fs.getCountFromServer(fb.fs.query(col, fb.fs.where(B.field, '>', value)))).data().count + 1;
  }
  // Ex æquo : même rang (nombre de joueurs strictement devant + 1).
  let prev = null, r = 0;
  rows.forEach((x, i) => { if (x.value !== prev) { r = i + 1; prev = x.value; } x.rank = r; });
  return { rows, me: { uid, value, rank } };
}
