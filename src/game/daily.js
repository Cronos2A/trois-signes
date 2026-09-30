// Récompenses de connexion (data/daily.json), en deux séries :
//  - série de 7 jours consécutifs (un jour manqué la ramène au jour 1 ; après le 7e, elle recommence) ;
//  - calendrier de 30 connexions (jours distincts ; un jour manqué ne change rien ; après la 30e, nouveau calendrier).
// Le jour est celui du serveur (heure de Paris) : l'état qui fait foi est au serveur (online/daily-net.js, daily/{uid}),
// une seule récupération par jour. Ici : récompenses d'un jour, passage au jour suivant, remise des récompenses.
// Sauvegarde : prog.daily = { shownDay, adDay, last: { day, streak, cal, gold } }.
import { D } from '../data.js';
import { prog, saveProg } from './progress.js';
import { addGold, chestState, openChest } from './economy.js';
import { items, owned, grant } from './cosmetics.js';
import { addBoost } from './boosts.js';

const DD = () => D.daily;
const DAY_MS = 86400000;

/** Numéro du jour (jours depuis le 1er janvier 1970) à l'heure de data/daily.json → day.timeZone, pour un instant donné. */
export function zoneDay(ms) {
  const p = {};
  for (const x of new Intl.DateTimeFormat('en-CA', { timeZone: DD().day.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ms)) p[x.type] = +x.value;
  return Date.UTC(p.year, p.month - 1, p.day) / DAY_MS;
}

/** État après la récupération du jour today (même calcul que les règles firestore.rules → dailyStep). */
export function nextState(doc, today) {
  const d = doc || {}, len = DD().calendar.length, n = DD().streak.length;
  return {
    lastDay: today,
    streak: d.lastDay === today - 1 ? (d.streak || 0) % n + 1 : 1,
    cal: (d.cal || 0) % len + 1,
    count: (d.count || 0) + 1
  };
}
/** Le jour today est-il encore à récupérer ? */
export const claimable = (doc, today) => !doc || !(doc.lastDay >= today);

/** Or d'un jour ordinaire du calendrier : de « from » au premier jour ordinaire à « to » au dernier. */
function calendarGold(day) {
  const C = DD().calendar, plain = [];
  for (let k = 1; k <= C.length; k++) if (!C.special[k]) plain.push(k);
  const i = plain.indexOf(day), g = C.gold, r = g.round || 1;
  if (i < 0) return 0;
  const v = plain.length > 1 ? g.from + (g.to - g.from) * i / (plain.length - 1) : g.from;
  return Math.round(v / r) * r;
}

/** Une récompense de data/daily.json en liste d'éléments : { type: 'gold'|'gems'|'boost'|'draw'|'chest', … }. */
function parts(r) {
  const out = [];
  if (r.gold) out.push({ type: 'gold', n: r.gold });
  if (r.gems) out.push({ type: 'gems', n: r.gems });
  if (r.boost) out.push({ type: 'boost', boost: r.boost.type, games: r.boost.games });
  if (r.draw) out.push({ type: 'draw', kind: r.draw });
  if (r.chest) out.push({ type: 'chest', id: r.chest });
  return out;
}
/** Récompense du jour n de la série de 7. */
export const streakReward = n => parts(DD().streak[n - 1] || {});
/** Récompense du jour n du calendrier. */
export const calendarReward = n => parts(DD().calendar.special[n] || { gold: calendarGold(n) });
/** Récompenses d'une récupération : { streak: [...], cal: [...] }. */
export const dayRewards = s => ({ streak: streakReward(s.streak), cal: calendarReward(s.cal) });

/** Gemmes d'une récupération (vérifiées par les règles, versées au serveur dans la même écriture). */
export const dayGems = s => [...streakReward(s.streak), ...calendarReward(s.cal)].filter(p => p.type === 'gems').reduce((a, p) => a + p.n, 0);
/** Or prévu (avant tirages) : sert à choisir le bouton de pub (doubler l'or, ou bonus). */
export const dayGold = s => [...streakReward(s.streak), ...calendarReward(s.cal)].filter(p => p.type === 'gold').reduce((a, p) => a + p.n, 0);

/** Tirage d'un cosmétique jamais possédé d'un type (coloris 'color' ou tracé 'trail') ; null si tout est possédé. */
export function drawCosmetic(kind, rnd = Math.random) {
  const pool = items().filter(i => i.kind === kind && !owned(i.id));
  return pool.length ? pool[Math.floor(rnd() * pool.length)] : null;
}

/**
 * Remise des récompenses d'un jour déjà accepté par le serveur (gemmes déjà versées au portefeuille).
 * Renvoie { gold, gems, boosts: [{ boost, games }], rewards: [écrans de récompense : cosmétiques, gemmes], lines: [...] }.
 * Tirage impossible (tout possédé), coffre impossible, stock de boosts plein : fallbackGold à la place.
 */
export function grantDay(s, rnd = Math.random) {
  const R = dayRewards(s), fb = DD().fallbackGold, out = { gold: 0, gems: 0, boosts: [], cosmetics: [], lines: [] };
  for (const [serie, list] of [['streak', R.streak], ['cal', R.cal]]) {
    for (const p of list) {
      if (p.type === 'gold') { out.gold += p.n; out.lines.push({ serie, ...p }); }
      else if (p.type === 'gems') { out.gems += p.n; out.lines.push({ serie, ...p }); }
      else if (p.type === 'boost') {
        if (addBoost(p.boost, p.games)) { out.boosts.push(p); out.lines.push({ serie, ...p }); }
        else { out.gold += fb; out.lines.push({ serie, ...p, full: true, fallback: fb }); }
      } else if (p.type === 'draw') {
        const it = drawCosmetic(p.kind, rnd);
        if (it) { grant(it.id); out.cosmetics.push({ id: it.id, from: 'draw' }); out.lines.push({ serie, ...p, id: it.id }); }
        else { out.gold += fb; out.lines.push({ serie, ...p, fallback: fb }); }
      } else if (p.type === 'chest') {
        const res = chestState(p.id, true).can ? openChest(p.id, rnd, true) : null;
        if (res && res.items && res.items.length) { for (const it of res.items) out.cosmetics.push({ id: it.id, from: 'chest', chest: p.id }); out.lines.push({ serie, ...p, ids: res.items.map(i => i.id) }); }
        else { out.gold += fb; out.lines.push({ serie, ...p, fallback: fb }); }
      }
    }
  }
  if (out.gold) addGold(out.gold);
  if (out.gems) prog.eco.gems += out.gems;          // reflet local ; le portefeuille du serveur a déjà reçu ces gemmes
  prog.daily.last = { day: s.lastDay, streak: s.streak, cal: s.cal, gold: out.gold };
  saveProg();
  return out;
}

/* ---------- Pub du jour (une fois par jour, data/daily.json → ad) ---------- */
/** Pub encore possible aujourd'hui (jour déjà récupéré) ? Renvoie { double: true, n } ou { bonus: true, n } ou null. */
export function adOffer(today) {
  const L = prog.daily.last;
  if (!L || L.day !== today || prog.daily.adDay === today) return null;
  return L.gold > 0 ? { double: true, n: L.gold } : { bonus: true, n: DD().ad.bonusGold };
}
/** Pub vue jusqu'au bout : or doublé (ou bonus). Renvoie l'or donné. */
export function grantAd(today) {
  const o = adOffer(today);
  if (!o) return 0;
  prog.daily.adDay = today;
  addGold(o.n);
  saveProg();
  return o.n;
}

/** Fenêtre du jour déjà montrée aujourd'hui ? */
export const shownToday = today => prog.daily.shownDay === today;
export function markShown(today) { prog.daily.shownDay = today; saveProg(); }
