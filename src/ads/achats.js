// Achats intégrés Google Play (application Android, extension @capgo/native-purchases 8.x) : 4 paquets de gemmes (consommables)
// et « Sans pub » (non récurrent, possédé pour toujours). Réglages et identifiants : data/monetisation.json → achats.
// Prix : toujours le prix localisé renvoyé par Google Play (getProducts → priceString), jamais un prix écrit en dur.
// Chaque achat n'est accordé qu'une fois : son jeton (purchaseToken) est noté dans prog.iap.done avant d'être consommé
// (gemmes) ou acquitté (Sans pub). Un achat payé mais pas encore traité (jeu fermé, plantage, paiement en attente devenu
// valide) est retrouvé au lancement et au retour de l'arrière-plan (getPurchases) puis traité à son tour.
// Limite : sans serveur, l'attribution se fait sur l'appareil (falsifiable) ; verifyPurchase est le point d'accroche d'une
// future vérification par Cloud Functions (offre Blaze). Les gemmes ne servent qu'aux cosmétiques.
import { D } from '../data.js';
import { prog, saveProg } from '../game/progress.js';
import { addBoughtGems } from '../game/economy.js';
import { setNoAds } from './ads.js';

const M = () => D.monetisation;
const native = () => { try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch (e) { return false; } };
const plugin = () => (native() && window.Capacitor.Plugins && window.Capacitor.Plugins.NativePurchases) || null;
const state = () => prog.iap || (prog.iap = { done: [], pending: [] });
const list = () => M().achats.produits;
export const productOf = id => list().find(p => p.id === id) || null;
/** Paquet de gemmes (data/economy.json → gemPacks) d'un produit. */
export const packOf = p => (p && p.pack ? D.economy.gemPacks.find(x => x.id === p.pack) : null);

let prices = {}, loaded = false, busy = false, hooks = {};

/** Achats possibles ici (application native, extension présente, drapeau achats_actifs) ? */
export const purchasesReady = () => !!M().achats_actifs && !!plugin();
/** Prix localisé de Google Play pour un produit (null tant qu'il n'est pas connu, ou produit introuvable). */
export const priceOf = id => prices[id] || null;
/** Achats payés mais en attente (paiement différé) : identifiants de produits. */
export const pendingIds = () => [...state().pending];
export const pricesLoaded = () => loaded;

/** Démarrage : prix localisés, puis achats déjà payés à traiter (restauration, reprise après plantage). hooks.changed() : rafraîchir. */
export async function initPurchases(h = {}) {
  hooks = h;
  state();
  if (!purchasesReady()) return;
  const NP = plugin();
  try { if (NP.configure) await NP.configure({ autoFinishTransactions: false }); } catch (e) { /* ancienne version : sans effet */ }
  await loadPrices();
  await restore();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) restore(); });   // retour de l'arrière-plan
}

async function loadPrices() {
  try {
    const r = await plugin().getProducts({ productIdentifiers: list().map(p => p.id), productType: 'inapp' });
    prices = {};
    for (const p of (r && r.products) || []) if (p.identifier) prices[p.identifier] = p.priceString;
    loaded = true;
  } catch (e) { console.warn('Achats (produits) :', e && (e.code || e.message)); }
  if (hooks.changed) hooks.changed();
}

/** Point d'accroche de la future vérification au serveur (Cloud Functions, offre Blaze). Aujourd'hui : accepté sur l'appareil. */
async function verifyPurchase(t, product) {
  if (!M().achats.verification_serveur.active) return true;
  return false;                         // pas encore de serveur : rien n'est accordé tant que la vérification n'existe pas
}

const tokenOf = t => t.purchaseToken || t.transactionId || '';
const paid = t => !t.purchaseState || t.purchaseState === '1';      // Android : "1" = payé, "0" = en attente

/** Traite un achat payé : accorde (une seule fois), puis consomme (gemmes) ou acquitte (Sans pub). Renvoie le produit. */
async function deliver(t) {
  const product = productOf(t.productIdentifier), NP = plugin(), token = tokenOf(t), S = state();
  if (!product || !token) return null;
  if (!paid(t)) { if (!S.pending.includes(product.id)) { S.pending.push(product.id); saveProg(); } return null; }
  S.pending = S.pending.filter(x => x !== product.id);
  if (!S.done.includes(token)) {
    if (!await verifyPurchase(t, product)) return null;
    if (product.type === 'gemmes') addBoughtGems((packOf(product) || {}).gems || 0);
    else if (product.type === 'sans_pub') setNoAds(true);
    S.done.push(token);
    S.done = S.done.slice(-50);
    saveProg();                                                        // accordé et noté avant de prévenir Google Play
  } else if (product.type === 'sans_pub') setNoAds(true);
  try {
    if (product.type === 'gemmes') await NP.consumePurchase({ purchaseToken: token });          // consommer = acquitter + racheter possible
    else if (!t.isAcknowledged) await NP.acknowledgePurchase({ purchaseToken: token });
  } catch (e) { console.warn('Achats (acquittement) :', e && (e.code || e.message)); }            // réessayé au prochain lancement
  return product;
}

/** Achats déjà payés et pas encore traités (ou « Sans pub » à restaurer) : relus chez Google Play. */
export async function restore() {
  if (!purchasesReady() || busy) return;
  busy = true;
  try {
    const r = await plugin().getPurchases({ productType: 'inapp' });
    const seen = new Set();
    for (const t of (r && r.purchases) || []) { seen.add(t.productIdentifier); await deliver(t); }
    const S = state(), before = S.pending.length;
    S.pending = S.pending.filter(id => seen.has(id));                  // paiement en attente abandonné : oublié
    if (S.pending.length !== before) saveProg();
  } catch (e) { console.warn('Achats (restauration) :', e && (e.code || e.message)); }
  finally { busy = false; }
  if (hooks.changed) hooks.changed();
}

/**
 * Achat d'un produit. Résultat : { status, product } avec status 'ok' | 'cancelled' | 'pending' | 'owned' (déjà payé :
 * récupéré) | 'notfound' | 'offline' | 'unavailable' | 'error'.
 */
export async function buyProduct(id) {
  const product = productOf(id);
  if (!product) return { status: 'notfound' };
  if (!purchasesReady()) return { status: 'unavailable', product };
  if (navigator.onLine === false) return { status: 'offline', product };
  let t;
  try {
    t = await plugin().purchaseProduct({ productIdentifier: id, productType: 'inapp', isConsumable: false, autoAcknowledgePurchases: false });
  } catch (e) {
    const c = String((e && e.code) || ''), m = String((e && e.message) || '');
    console.warn('Achats :', c, m);
    if (c === 'USER_CANCELED' || /cancel/i.test(m)) return { status: 'cancelled', product };
    if (/pending/i.test(m)) { if (!state().pending.includes(id)) { state().pending.push(id); saveProg(); } return { status: 'pending', product }; }
    if (c === 'ITEM_ALREADY_OWNED') { await restore(); return { status: 'owned', product }; }
    if (c === 'ITEM_UNAVAILABLE' || /not found/i.test(m)) return { status: 'notfound', product };
    if (['NETWORK_ERROR', 'SERVICE_UNAVAILABLE', 'SERVICE_DISCONNECTED', 'BILLING_UNAVAILABLE'].includes(c)) return { status: 'offline', product };
    return { status: 'error', product };
  }
  if (t && !paid(t)) { await deliver(t); return { status: 'pending', product }; }
  const done = await deliver(t);
  if (hooks.changed) hooks.changed();
  return { status: done ? 'ok' : 'error', product };
}
