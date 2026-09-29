// Empreintes au serveur : ranked/{uid} = { prints, last, updatedAt } fait foi (prog.duel.prints n'en est que le reflet).
// Après un Duel au hasard, chaque joueur envoie le résultat des DEUX joueurs : ranked/{x} + ranked/{x}/games/{code} (partie comptée
// une seule fois). Les règles (firestore.rules → outcome) recalculent le vainqueur d'après le salon et n'acceptent que +30, −20 ou 0 :
// un joueur ne peut ni changer ses Empreintes à la main, ni éviter une défaite en ne l'envoyant pas (l'autre l'envoie pour lui).
import { D } from '../data.js';
import { prog, saveProg } from '../game/progress.js';
import { server, whenOnline } from './online.js';

const P = () => D.duel.prints;
const rankedRef = (S, uid) => S.fb.fs.doc(S.db, 'ranked', uid);

/** Empreintes de ce joueur au serveur (0 s'il n'a jamais joué au hasard) ; met aussi à jour prog.duel.prints pour soi. */
export async function serverPrints(uid) {
  const S = await whenOnline(), id = uid || S.uid;
  const s = await S.fb.fs.getDoc(rankedRef(S, id));
  const p = s.exists() ? (s.data().prints || 0) : 0;
  if (id === S.uid && prog.duel && prog.duel.prints !== p) { prog.duel.prints = p; saveProg(); }
  return p;
}

const tot = a => (a || []).reduce((s, x) => s + (x || 0), 0);
/**
 * Issue d'un salon pour le joueur x (même calcul que les règles) : 1 victoire, −1 défaite, 0 égalité, null pas encore décidé.
 * now : heure (ms) pour la déconnexion (disconnectSeconds sans signe de vie).
 */
export function outcome(room, x, now) {
  const oid = room.host === x ? room.guest : room.host, me = room.players[x], op = room.players[oid];
  if (!me || !op) return null;
  const ms = t => (t && t.toMillis ? t.toMillis() : 0);
  const stale = p => !(p.done || p.ko != null) && now - ms(p.seen) > D.duel.disconnectSeconds * 1000;
  const by = Math.sign(tot(me.scores) - tot(op.scores));
  if (me.quit) return -1;
  if (op.quit) return 1;
  if (stale(op) && !stale(me)) return 1;
  if (stale(me) && !stale(op)) return -1;
  if (me.ko != null) {
    if (op.ko != null) return op.ko < me.ko ? 1 : op.ko > me.ko ? -1 : by;
    return (op.scores || []).length > me.ko ? -1 : null;
  }
  if (op.ko != null) return (me.scores || []).length > op.ko ? 1 : null;
  if (me.done && op.done) return by;
  return null;
}
const deltaOf = o => (o === 1 ? P().win : o === -1 ? P().loss : P().tie);

/**
 * Envoie le résultat du salon code pour ces joueurs (soi et l'adversaire). Déjà compté ou pas encore décidé : ignoré.
 * Renvoie les Empreintes du joueur au serveur ensuite.
 */
export async function applyRanked(code, uids) {
  const S = server();
  if (!S) return null;
  const { fb, db } = S;
  for (const x of uids) {
    try {
      const room = (await fb.fs.getDoc(fb.fs.doc(db, D.duel.collection, code))).data();
      const o = outcome(room, x, Date.now());
      if (o == null) continue;
      const game = fb.fs.doc(db, 'ranked', x, 'games', code);
      await fb.fs.runTransaction(db, async tx => {
        const g = await tx.get(game), r = await tx.get(rankedRef(S, x));
        if (g.exists()) return;                                       // déjà compté (par l'autre joueur)
        const old = r.exists() ? (r.data().prints || 0) : 0;
        tx.set(rankedRef(S, x), { prints: Math.max(P().min, old + deltaOf(o)), last: code, updatedAt: fb.fs.serverTimestamp() });
        tx.set(game, { at: fb.fs.serverTimestamp() });
      });
    } catch (e) {
      // Déjà compté par l'autre joueur entre-temps (course entre les deux envois) : normal, rien à faire.
      const counted = await fb.fs.getDoc(fb.fs.doc(db, 'ranked', x, 'games', code)).then(d => d.exists(), () => false);
      if (!counted) console.warn('Empreintes :', x === S.uid ? 'moi' : 'adversaire', e && (e.code || e.message));
    }
  }
  return serverPrints();
}
