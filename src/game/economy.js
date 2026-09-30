// Économie (data/economy.json) : or et gemmes, gains de fin de partie, gemmes méritées (rétroactives), coffres, achats.
// Sauvegarde : prog.eco = { gold, gems, granted, owned, equipped, pity, opened }.
import { D } from '../data.js';
import { prog, saveProg } from './progress.js';
import { items, item, owned, grant } from './cosmetics.js';
import { tr } from '../i18n.js';

const E = () => D.economy;
export const wallet = () => prog.eco;
const tpl = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

// Gemmes : le compte qui fait foi est au serveur (online/wallet.js, portefeuille wallet/{uid}). Chaque mouvement lui est
// transmis : gain d'une table fixe (grant), pub récompensée (ad), dépense (spend). Le mode test ajoute des gemmes locales seulement.
let gemsHook = null;
export const onGems = fn => { gemsHook = fn; };
const gemOp = op => { if (gemsHook) gemsHook(op); };

export function addGold(n) { prog.eco.gold += Math.max(0, Math.round(n)); saveProg(); }
/** source : 'ad' (pub récompensée, vérifiée par le serveur) ou 'test' (mode test, local). */
export function addGems(n, source = 'ad') {
  const k = Math.max(0, Math.round(n));
  prog.eco.gems += k; saveProg();
  if (source === 'ad' && k) gemOp({ op: 'ad', n: k });
}

/** Prix { gold } ou { gems }. */
export const canAfford = p => (p.gold || 0) <= prog.eco.gold && (p.gems || 0) <= prog.eco.gems;
function pay(p) { prog.eco.gold -= p.gold || 0; prog.eco.gems -= p.gems || 0; if (p.gems) gemOp({ op: 'spend', n: p.gems }); }

/* ---------- Gains de fin de partie ---------- */
/** Or des pièces ramassées pendant la partie. */
export const coinGold = coins => coins * E().gold.goldPerCoin;

/** Voyage, or d'une arène traversée (versé dès que son dernier round est terminé). */
export const arenaGold = n => n * E().gold.voyage.perArena;

/** Voyage, bonus de fin de partie normale (KO) : base + record. Rien en cas d'abandon. */
export function voyageEndGold(record) {
  const V = E().gold.voyage;
  return V.base + (record ? V.record : 0);
}

/** Histoire, bonus de victoire : première victoire ou suivante. Rien en cas de défaite ou d'abandon. */
export function storyWinGold(first) {
  const S = E().gold.story;
  return first ? S.firstWin : S.repeatWin;
}

/**
 * Gemmes méritées d'après la sauvegarde : gardiens du Voyage battus, histoires terminées, épilogue.
 * Chaque gain n'est donné qu'une fois (prog.eco.granted) : rattrape aussi les anciennes parties.
 * Renvoie la liste des nouveaux gains [{ kind: 'gems', n, text }].
 */
export function syncGems() {
  const G = E().gems, U = E().ui.gemsFor, done = new Set(prog.eco.granted), out = [];
  const give = (key, n, text) => {
    if (done.has(key)) return;
    prog.eco.granted.push(key); prog.eco.gems += n; out.push({ kind: 'gems', n, text });
    gemOp({ op: 'grant', key, n });
  };
  for (const a of prog.voyage.beaten || []) {
    const arena = D.voyage.arenas.find(x => x.id === a);
    give('guardian:' + a, G.guardianFirst, tpl(U.guardian, { name: arena ? arena.name : a, of: tr('of.arena.' + a) }));
  }
  for (const h of prog.story.fragments || []) {
    const c = D.characters.characters.find(x => x.id === h);
    give('story:' + h, G.storyComplete, tpl(U.story, { name: c ? c.name : h, of: tr('of.hero.' + h) }));
  }
  if (prog.story.epilogue) give('epilogue', G.epilogue, U.epilogue);
  if (out.length) saveProg();
  return out;
}

/* ---------- Pays et mode test ---------- */
/** Mode test (développement) : hôte local ou ?test dans l'adresse. */
export function testMode() {
  const T = E().test;
  try { return T.hosts.includes(location.hostname) || new URLSearchParams(location.search).has(T.param); } catch (e) { return false; }
}

/** Pays du joueur, s'il est reconnu (langue du navigateur ou fuseau horaire) : liste de codes possibles. */
export function countries() {
  if (testMode() && prog.eco.testCountry !== undefined) return prog.eco.testCountry ? [prog.eco.testCountry] : [];
  const out = new Set();
  try { for (const l of navigator.languages || [navigator.language]) { const m = /[-_]([A-Za-z]{2})$/.exec(l || ''); if (m) out.add(m[1].toUpperCase()); } } catch (e) {}
  try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone, c = E().noPaidChests.timezones[tz]; if (c) out.add(c); } catch (e) {}
  return [...out];
}

/** Coffres payants autorisés (interdits dans les pays de noPaidChests). */
export const chestsAllowed = () => !countries().some(c => E().noPaidChests.countries.includes(c));

/* ---------- Achats ---------- */
/** Achète un cosmétique. Renvoie { ok } ou { error: 'owned' | 'money' }. */
export function buy(id) {
  const it = item(id);
  if (!it || owned(id)) return { error: 'owned' };
  if (!canAfford(it.price)) return { error: 'money' };
  pay(it.price);
  grant(id);
  saveProg();
  return { ok: true, item: it };
}

/* ---------- Coffres ---------- */
const RAR = ['commun', 'rare', 'epique'];
const unownedOf = (r, skip) => items().filter(i => i.rarity === r && !owned(i.id) && !skip.includes(i.id));
export const unownedCount = () => items().filter(i => !owned(i.id)).length;

function pickRarity(odds, rnd) {
  const total = RAR.reduce((a, r) => a + (odds[r] || 0), 0);
  let x = rnd() * total;
  for (const r of RAR) { x -= odds[r] || 0; if (x < 0) return r; }
  return RAR[0];
}

/** Un objet non possédé de la rareté tirée ; sinon la rareté la plus proche qui en a encore. */
function drawItem(r, skip, rnd) {
  const i0 = RAR.indexOf(r), order = [r, ...RAR.filter(x => x !== r).sort((a, b) => Math.abs(RAR.indexOf(a) - i0) - Math.abs(RAR.indexOf(b) - i0) || RAR.indexOf(b) - RAR.indexOf(a))];
  for (const x of order) {
    const pool = unownedOf(x, skip);
    if (pool.length) return pool[Math.floor(rnd() * pool.length)];
  }
  return null;
}

/** Coffres simples restants avant l'épique garanti (1 = le prochain). */
export const pityLeft = () => Math.max(1, E().chests.simple.guaranteeEpicAfter - prog.eco.pity);

/** État d'un coffre pour l'affichage : { can, reason: null | 'banned' | 'complete' | 'money' }. */
export function chestState(id, free = false) {
  const C = E().chests[id];
  if (!chestsAllowed()) return { can: false, reason: 'banned' };
  if (unownedCount() < C.count) return { can: false, reason: 'complete' };
  if (!free && prog.eco.gems < C.price) return { can: false, reason: 'money' };
  return { can: true, reason: null };
}

/**
 * Ouvre un coffre : paie en gemmes, tire les objets (jamais un objet déjà possédé ni deux fois le même),
 * applique la garantie d'épique du coffre simple. Renvoie { items } ou { error }.
 */
export function openChest(id, rnd = Math.random, free = false) {     // free : coffre offert (pub récompensée)
  const C = E().chests[id], st = chestState(id, free);
  if (!st.can) return { error: st.reason };
  if (!free) { prog.eco.gems -= C.price; gemOp({ op: 'spend', n: C.price }); }
  const got = [], pity = id === 'simple' && C.guaranteeEpicAfter && prog.eco.pity >= C.guaranteeEpicAfter - 1;
  for (let k = 0; k < C.count; k++) {
    let r;
    if (pity && k === 0) r = 'epique';
    else if (C.minRare && k < C.minRare) r = pickRarity({ rare: C.odds.rare, epique: C.odds.epique }, rnd);
    else r = pickRarity(C.odds, rnd);
    const it = drawItem(r, got.map(i => i.id), rnd);
    if (!it) break;
    got.push(it);
  }
  if (id === 'simple') prog.eco.pity = got.some(i => i.rarity === 'epique') ? 0 : prog.eco.pity + 1;
  prog.eco.opened = (prog.eco.opened || 0) + 1;
  for (const it of got) grant(it.id);
  saveProg();
  return { items: got };
}

/** Mode test : remet la boutique à zéro (objets, équipement, garantie, gains déjà donnés). */
export function resetShop() {
  Object.assign(prog.eco, { owned: [], equipped: {}, pity: 0, opened: 0, granted: [] });
  saveProg();
}
