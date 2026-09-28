// Gestionnaire unique des publicités (data/ads.json) : pubs récompensées et plein écran, règles et limites.
// Fournisseur : AdMob dans l'application (src/ads/admob.js, à brancher plus tard), sinon fausse pub de test (ui/ad-ui.js).
// Sauvegarde : prog.ads = { noAds, playSeconds, voyageGames, day, used: { gems, freeChest } }.
import { D } from '../data.js';
import { prog, saveProg } from '../game/progress.js';
import { admobAvailable, admobInit, admobRewarded, admobInterstitial } from './admob.js';
import { showTestAd } from '../ui/ad-ui.js';

const A = () => D.ads;
const S = () => prog.ads || (prog.ads = { noAds: false, playSeconds: 0, voyageGames: 0, day: '', used: {} });
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
let pending = false, busy = false, clock = 0;

/** Démarrage : AdMob et consentement UMP si l'application les a (rien sur le web). */
export async function initAds() {
  S();
  try { if (useAdmob()) await admobInit(A().admob); } catch (e) { /* sans pub, le jeu continue */ }
}
const useAdmob = () => A().provider !== 'test' && admobAvailable();

/* ---------- Temps de jeu (pas de pub plein écran avant graceMinutes) ---------- */
/** Appelé par la boucle de jeu pendant un combat, l'Entraînement ou la leçon. */
export function tickPlay(dt) {
  clock += dt;
  if (clock >= 5) flushPlay();
}
export function flushPlay() {
  if (!clock) return;
  S().playSeconds += clock; clock = 0;
  saveProg();
}

/* ---------- Limites par jour ---------- */
function daily() {
  const s = S();
  if (s.day !== today()) { s.day = today(); s.used = {}; }
  return s.used;
}
/** Vues restantes aujourd'hui pour une pub récompensée de la boutique ('gems' | 'freeChest'). */
export const leftToday = k => Math.max(0, A().rewarded[k].perDay - (daily()[k] || 0));
function useToday(k) { const u = daily(); u[k] = (u[k] || 0) + 1; saveProg(); }

/* ---------- Pubs ---------- */
/**
 * Pub récompensée, toujours lancée par le joueur. Résolue à true seulement si elle a été vue jusqu'au bout.
 * ctx.duel : jamais en Duel (data/ads.json → duel).
 */
export async function showRewarded(ctx = {}) {
  if (busy || (ctx.duel && !A().duel.rewards)) return false;
  busy = true;
  try {
    if (useAdmob()) return await admobRewarded(A().admob);
    return await showTestAd('rewarded', A().test.seconds);
  } catch (e) { return false; } finally { busy = false; }
}

async function showInterstitial() {
  if (busy) return;
  busy = true;
  try {
    if (useAdmob()) await admobInterstitial(A().admob);
    else await showTestAd('interstitial', A().test.seconds);
  } catch (e) { /* pub indisponible : on continue */ } finally { busy = false; }
}

/* ---------- Pub plein écran : après une partie du Voyage seulement ---------- */
/** Fin d'une partie du Voyage : compte la partie ; la pub sera montrée en quittant l'écran de résultats. */
export function noteVoyageEnd(battle) {
  flushPlay();
  if (!battle || battle.xpMode !== 'voyage' || battle.duel) return;
  const s = S();
  s.voyageGames = (s.voyageGames || 0) + 1;
  saveProg();
  const I = A().interstitial;
  pending = !s.noAds && s.voyageGames % I.everyGames === 0 && s.playSeconds >= I.graceMinutes * 60;
}

/** En quittant les résultats du Voyage (Rejouer, Retour au lobby) : la pub plein écran due, s'il y en a une. */
export async function afterVoyageResults() {
  if (!pending) return;
  pending = false;
  if (S().noAds) return;
  await showInterstitial();
}

/* ---------- Récompenses ---------- */
/** Boutique : +N gemmes, limité par jour. Renvoie le nombre de gemmes donné (0 si rien). */
export async function watchForGems(addGems) {
  if (!leftToday('gems')) return 0;
  if (!await showRewarded()) return 0;
  useToday('gems');
  const n = A().rewarded.gems.amount;
  addGems(n);
  return n;
}

/** Boutique : coffre gratuit, limité par jour. open() ouvre le coffre sans payer ; renvoie son résultat ou null. */
export async function watchForChest(open) {
  if (!leftToday('freeChest')) return null;
  if (!await showRewarded()) return null;
  useToday('freeChest');
  return open();
}

/* ---------- Sans publicité ---------- */
export const noAds = () => !!S().noAds;
/** Achat « Sans publicité » (dans l'application seulement ; le mode test peut l'activer). */
export function setNoAds(on) { S().noAds = !!on; if (on) pending = false; saveProg(); }

/** Mode test : ajoute du temps de jeu (pour passer le délai des nouveaux joueurs). */
export function addPlaySeconds(n) { S().playSeconds += n; saveProg(); }

/** Mode test : remet les compteurs à zéro. */
export function resetAds() { Object.assign(S(), { playSeconds: 0, voyageGames: 0, day: '', used: {} }); pending = false; saveProg(); }
export const adsState = () => ({ ...S(), pending });
