// Gestionnaire unique des publicités (data/ads.json, data/monetisation.json) : pubs récompensées seulement, règles et limites.
// Fournisseur : AdMob dans l'application (src/ads/admob.js), sinon fausse pub de test en développement (ui/ad-ui.js).
// Plus aucune pub plein écran (13/10/2026 : récompensées seulement, jamais en combat ni en Duel).
// « Sans pub » (achat) : plus aucune pub ; les récompenses qui ne touchent qu'à l'économie (gemmes, coffre, or) sont données
// sans vidéo, dans les mêmes limites ; la Seconde chance (avantage en partie, ctx.gameplay) garde sa vidéo.
// Sauvegarde : prog.ads = { noAds, playSeconds, voyageGames, day, used: { gems, freeChest } }.
import { D } from '../data.js';
import { prog, saveProg } from '../game/progress.js';
import { admobAvailable, admobInit, admobRewarded } from './admob.js';
import { tr } from '../i18n.js';
import { showTestAd } from '../ui/ad-ui.js';

const A = () => D.ads;
const S = () => prog.ads || (prog.ads = { noAds: false, playSeconds: 0, voyageGames: 0, day: '', used: {} });
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
let pending = false, busy = false, clock = 0, issue = '';

/** Démarrage : AdMob et consentement UMP si l'application les a (rien sur le web). */
export async function initAds() {
  S();
  try { if (useAdmob()) await admobInit(); } catch (e) { /* sans pub, le jeu continue */ }
}
const useAdmob = () => A().provider !== 'test' && admobAvailable();
const native = () => { try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch (e) { return false; } };
/** Fausse pub de test : seulement sur les adresses de développement (data/ads.json → test.hosts), jamais dans l'application. */
const fakeAllowed = () => { try { return !(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) && A().test.hosts.includes(location.hostname); } catch (e) { return false; } };
/**
 * Une pub peut-elle être montrée ici ? AdMob dans l'application, ou fausse pub en développement.
 * Sur le web publié : non. Les boutons de pub sont alors masqués (ou « Disponible dans l'application ») et rien n'est gagné.
 */
export const adsReady = () => !!(D.monetisation && D.monetisation.pubs_actives) && (useAdmob() || fakeAllowed());
/** Application native sans pub possible (AdMob absent, drapeau coupé) : « Bientôt » à la place des boutons. */
export const adsNative = () => native();

/** Texte à montrer quand une pub récompensée n'a rien donné (dernière raison : fermée trop tôt, aucune pub, réseau, consentement). */
export function adFailText() {
  const k = { closed: 'ads.closed', nofill: 'ads.nofill', offline: 'ads.offline', noconsent: 'ads.noconsent', error: 'ads.nofill' }[issue];
  return issue === 'limit' ? A().ui.noneLeft : k ? tr(k) : A().ui.rewardLost;
}

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
  issue = '';
  if (busy || (ctx.duel && !A().duel.rewards) || !adsReady()) { issue = 'error'; return false; }
  if (noAds() && !ctx.gameplay) return true;                         // « Sans pub » acheté : récompense sans vidéo
  busy = true;
  try {
    if (useAdmob()) { const r = await admobRewarded(); if (r !== 'rewarded') issue = r; return r === 'rewarded'; }
    const ok = await showTestAd('rewarded', A().test.seconds);
    if (!ok) issue = 'closed';
    return ok;
  } catch (e) { issue = 'error'; return false; } finally { busy = false; }
}

/* ---------- Plus de pub plein écran (13/10/2026) : la partie est seulement comptée ---------- */
/** Fin d'une partie du Voyage : compte la partie (statistique) ; aucune pub plein écran. */
export function noteVoyageEnd(battle) {
  flushPlay();
  if (!battle || battle.xpMode !== 'voyage' || battle.duel) return;
  const s = S();
  s.voyageGames = (s.voyageGames || 0) + 1;
  saveProg();
}

/** En quittant les résultats du Voyage : rien (les pubs plein écran sont retirées). */
export async function afterVoyageResults() {}

/* ---------- Récompenses ---------- */
/** Boutique : +N gemmes, limité par jour. Renvoie le nombre de gemmes donné (0 si rien). */
export async function watchForGems(addGems) {
  if (!leftToday('gems')) { issue = 'limit'; return 0; }
  if (!await showRewarded()) return 0;
  useToday('gems');
  const n = A().rewarded.gems.amount;
  addGems(n);
  return n;
}

/** Boutique : coffre gratuit, limité par jour. open() ouvre le coffre sans payer ; renvoie son résultat ou null. */
export async function watchForChest(open) {
  if (!leftToday('freeChest')) { issue = 'limit'; return null; }
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
