// Empreintes au serveur : ranked/{uid} = { prints, areneMaxDuel, arene, pays, since, last, updatedAt } fait foi (prog.duel.prints n'en est que le reflet).
// Après un Duel au hasard, chaque joueur envoie le résultat des DEUX joueurs : ranked/{x} + ranked/{x}/games/{code} (partie comptée
// une seule fois). Les règles (firestore.rules → outcome) recalculent le vainqueur d'après le salon et n'acceptent que +30, −20 ou 0 :
// un joueur ne peut ni changer ses Empreintes à la main, ni éviter une défaite en ne l'envoyant pas (l'autre l'envoie pour lui).
import { D } from '../data.js';
import { prog, saveProg } from '../game/progress.js';
import { server, whenOnline } from './online.js';
import { arenaIndex, noteMaxArena } from '../game/duel-rank.js';

const P = () => D.duel.prints;
const rankedRef = (S, uid) => S.fb.fs.doc(S.db, 'ranked', uid);

/**
 * Fiche de classement de ce joueur au serveur : { exists (a joué au moins un Duel au hasard), prints, arene, pays, since } ;
 * met aussi à jour prog.duel.prints (et la plus haute arène) pour soi.
 */
export async function rankedInfo(uid) {
  const S = await whenOnline(), id = uid || S.uid;
  const s = await S.fb.fs.getDoc(rankedRef(S, id));
  const d = s.exists() ? s.data() : {}, p = d.prints || 0;
  if (id === S.uid) reflect(s, p);
  return { exists: s.exists(), prints: p, arene: arenaIndex(p) + 1, pays: d.pays ?? null, since: d.since || d.updatedAt || null };
}
/** Empreintes de ce joueur au serveur (0 s'il n'a jamais joué au hasard). */
export const serverPrints = uid => rankedInfo(uid).then(r => r.prints);

/** Pays de classement de ce joueur au serveur (seul ce champ, les règles le vérifient). Sans fiche (aucun Duel au hasard) : rien à faire. */
export async function setRankedCountry(pays) {
  const S = server();
  if (!S) return false;
  const ref = rankedRef(S, S.uid), s = await S.fb.fs.getDoc(ref);
  if (!s.exists() || (s.data().pays ?? null) === pays) return true;
  await S.fb.fs.updateDoc(ref, { pays });
  return true;
}

function reflect(s, p) {
  if (!prog.duel) return;
  // Plus haute arène atteinte (1 à 8, ne baisse jamais) : celle du serveur, sinon celle des Empreintes actuelles.
  const max = noteMaxArena(s.exists() ? (s.data().areneMaxDuel || arenaIndex(p) + 1) : 1);
  if (prog.duel.prints !== p || max) { prog.duel.prints = p; saveProg(); }
}

const tot = a => (a || []).reduce((s, x) => s + (x || 0), 0);
const ms = t => (t && t.toMillis ? t.toMillis() : 0);
/**
 * Issue d'un salon pour le joueur x (même calcul que les règles) : 1 victoire, −1 défaite, 0 égalité ou match annulé,
 * null pas encore décidé. now : heure du serveur (ms) pour l'absence (absence_max_s sans signe de vie, une fois « Prêt »).
 * Issue acquise par les KO ou les scores d'abord ; puis l'absence ; absents tous les deux : celui qui était encore là quand
 * l'autre a dépassé la limite gagne, sinon match annulé (cancelled(room, now) le dit).
 */
export function outcome(room, x, now) {
  const oid = room.host === x ? room.guest : room.host, me = room.players[x], op = room.players[oid];
  if (!me || !op) return null;
  const by = Math.sign(tot(me.scores) - tot(op.scores));
  if (me.quit) return -1;
  if (op.quit) return 1;
  const played = me.ko != null ? (op.ko != null ? (op.ko < me.ko ? 1 : op.ko > me.ko ? -1 : by) : (op.scores || []).length > me.ko ? -1 : null)
    : op.ko != null ? ((me.scores || []).length > op.ko ? 1 : null)
    : me.done && op.done ? by : null;
  if (played != null) return played;
  const sm = stale(me, now), so = stale(op, now);
  if (so && !sm) return 1;
  if (sm && !so) return -1;
  if (sm && so) return bothAway(me, op);
  return null;
}
/** Absent : « Prêt », partie pas finie, plus de absence_max_s sans signe de vie (heure du serveur). */
export const stale = (p, now) => !!p && !!p.ready && !(p.done || p.ko != null) && now - ms(p.seen) > D.duel.absence_max_s * 1000;
const bothAway = (me, op) => { const L = D.duel.absence_max_s * 1000; return ms(op.seen) + L < ms(me.seen) ? 1 : ms(me.seen) + L < ms(op.seen) ? -1 : 0; };
/** Match annulé : absents tous les deux sans que l'un ait vu l'autre partir, et rien de décidé avant. */
export function cancelled(room, x, now) {
  const oid = room.host === x ? room.guest : room.host, me = room.players[x], op = room.players[oid];
  return !!me && !!op && outcome(room, x, now) === 0 && stale(me, now) && stale(op, now) && bothAway(me, op) === 0;
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
  const counted = x => fb.fs.getDoc(fb.fs.doc(db, 'ranked', x, 'games', code)).then(d => d.exists(), () => false);
  for (const x of uids) {
    let form = 0;                                                     // 0 : fiche complète ; 1 et 2 : formes des règles d'avant
    for (; form < 3; form++) {
      try {
        const room = (await fb.fs.getDoc(fb.fs.doc(db, D.duel.collection, code))).data();
        const o = outcome(room, x, Date.now());
        if (o == null) break;
        const game = fb.fs.doc(db, 'ranked', x, 'games', code);
        await fb.fs.runTransaction(db, async tx => {
          const g = await tx.get(game), r = await tx.get(rankedRef(S, x));
          if (g.exists()) return;                                       // déjà compté (par l'autre joueur)
          const d = r.exists() ? r.data() : null, old = d ? (d.prints || 0) : 0, prints = Math.max(P().min, old + deltaOf(o));
          // Plus haute arène atteinte (1 à 8) : jamais en baisse ; les règles la recalculent d'après les Empreintes.
          const max = Math.max(d ? (d.areneMaxDuel || arenaIndex(old) + 1) : 1, arenaIndex(prints) + 1), now = fb.fs.serverTimestamp();
          // Classement : arène des nouvelles Empreintes, pays inchangé, date d'obtention gardée si les Empreintes ne bougent pas.
          const base = { prints, last: code, updatedAt: now };
          tx.set(rankedRef(S, x), form === 2 ? base : form === 1 ? { ...base, areneMaxDuel: max }
            : { ...base, areneMaxDuel: max, arene: arenaIndex(prints) + 1, pays: d ? (d.pays ?? null) : null,
              since: !d || prints !== old ? now : (d.since || d.updatedAt) });
          tx.set(game, { at: fb.fs.serverTimestamp() });
        });
        break;
      } catch (e) {
        // Déjà compté par l'autre joueur entre-temps (course entre les deux envois) : normal, rien à faire.
        if (await counted(x)) break;
        // Règles d'avant le 07/10/2026 (ou le 05/10) pas encore republiées : champs inconnus refusés, nouvel essai sans eux.
        if (form < 2 && e && e.code === 'permission-denied') continue;
        console.warn('Empreintes :', x === S.uid ? 'moi' : 'adversaire', e && (e.code || e.message));
        break;
      }
    }
  }
  return serverPrints();
}
