// Classements (data/online.json → leaderboard) : Voyage (meilleur score) et Duel (Empreintes).
// Chaque joueur écrit sa ligne leaderboard/{uid} = { pseudo, hero, voyage, prints, updatedAt } ; le serveur refuse qu'un
// meilleur score du Voyage baisse (firestore.rules). Top 100 et position (nombre de joueurs devant + 1) lus à la demande.
import { D } from '../data.js';
import { prog } from '../game/progress.js';
import { server, whenOnline, pseudo } from './online.js';

const L = () => D.online.leaderboard;
let sent = null, remoteBest = null, busy = false;

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
    const row = { pseudo: pseudo(), hero: favoriteHero(), voyage: Math.max(prog.best || 0, remoteBest), prints: (prog.duel && prog.duel.prints) || 0 };
    const key = JSON.stringify(row);
    if (key === sent) return;
    await S.fb.fs.setDoc(ref(S), { ...row, updatedAt: S.fb.fs.serverTimestamp() });
    sent = key; remoteBest = row.voyage;
  } catch (e) {
    console.warn('Classements :', e && (e.code || e.message));
  } finally { busy = false; }
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
