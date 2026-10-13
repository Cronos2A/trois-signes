// AdMob dans l'application Android (Capacitor, extension @capacitor-community/admob 8.x) : pubs récompensées seulement.
// Réglages : data/monetisation.json (drapeaux, identifiants de test ou réels, niveau de contenu). Rien ne s'exécute sur le web.
// Ordre imposé par Google : consentement UMP d'abord (Espace économique européen, Royaume-Uni…), puis initialisation du SDK ;
// sans consentement valide (canRequestAds faux), aucune pub n'est demandée.
// L'extension est lue depuis window.Capacitor.Plugins.AdMob : aucun import, rien ne casse si elle manque.
import { D } from '../data.js';

const M = () => D.monetisation;
const plugin = () => (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) || null;
/** Identifiants en usage : ceux de test de Google tant que mode_test est vrai. */
const ids = () => (M().mode_test ? M().admob.test : M().admob.reel);
// Noms des événements de la pub récompensée (RewardAdPluginEvents de l'extension).
const EV = { rewarded: 'onRewardedVideoAdReward', dismissed: 'onRewardedVideoAdDismissed', failedToShow: 'onRewardedVideoAdFailedToShow' };
const GEO = { DISABLED: 0, EEA: 1, NOT_EEA: 2, US: 3, OTHER: 4 };   // AdmobConsentDebugGeography

let consent = null, ready = false;

/** AdMob présent et pubs actives (application native avec l'extension, drapeau pubs_actives, identifiant renseigné) ? */
export const admobAvailable = () => !!plugin() && !!M().pubs_actives && !!ids().rewarded_android;
/** Consentement : { status, canRequestAds, privacyOptionsRequirementStatus } (null avant la demande). */
export const consentInfo = () => consent;
/** Les pubs peuvent-elles être demandées (consentement valide et SDK prêt) ? */
export const admobReady = () => ready;

function consentRequest() {
  const A = M().admob;
  if (!M().mode_test) return {};
  const o = { debugGeography: GEO[A.consentDebugGeography] ?? 0 };
  if (A.testDeviceIdentifiers && A.testDeviceIdentifiers.length) o.testDeviceIdentifiers = A.testDeviceIdentifiers;
  return o;
}

/** Premier lancement (et chaque démarrage) : consentement UMP, formulaire s'il est requis, puis initialisation du SDK. */
export async function admobInit() {
  const AdMob = plugin();
  if (!admobAvailable()) return false;
  try {
    let info = await AdMob.requestConsentInfo(consentRequest());
    if (info && info.isConsentFormAvailable && info.status === 'REQUIRED') info = await AdMob.showConsentForm();
    consent = info || null;
  } catch (e) { console.warn('Pubs (consentement) :', e && (e.code || e.message)); consent = null; }
  return startSdk();
}

async function startSdk() {
  const AdMob = plugin(), A = M().admob;
  if (ready || !consent || !consent.canRequestAds) return ready;
  try {
    await AdMob.initialize({ initializeForTesting: !!M().mode_test, maxAdContentRating: A.maxAdContentRating,
      tagForChildDirectedTreatment: !!A.tagForChildDirectedTreatment, tagForUnderAgeOfConsent: !!A.tagForUnderAgeOfConsent });
    ready = true;
  } catch (e) { console.warn('Pubs (initialisation) :', e && (e.code || e.message)); }
  return ready;
}

/**
 * Réglages → « Choix de confidentialité des pubs » : formulaire de Google pour modifier le consentement.
 * 'shown' (affiché, consentement relu), 'notRequired' (aucun choix à faire dans cette région), 'unavailable' (pas d'AdMob), 'error'.
 */
export async function admobPrivacyForm() {
  const AdMob = plugin();
  if (!admobAvailable()) return 'unavailable';
  try {
    if (!consent) consent = await AdMob.requestConsentInfo(consentRequest());
    if (!consent || consent.privacyOptionsRequirementStatus !== 'REQUIRED') return 'notRequired';
    await AdMob.showPrivacyOptionsForm();
    consent = await AdMob.requestConsentInfo(consentRequest());
    await startSdk();
    return 'shown';
  } catch (e) { console.warn('Pubs (confidentialité) :', e && (e.code || e.message)); return 'error'; }
}

/**
 * Pub récompensée. Résultat : 'rewarded' (vue jusqu'au bout : récompense), 'closed' (fermée trop tôt), 'nofill' (aucune pub
 * disponible), 'offline' (pas de réseau), 'noconsent' (consentement refusé ou absent), 'error'.
 * La récompense n'est donnée que sur l'événement de récompense de Google ; la fermeture règle la promesse dans tous les cas.
 */
export async function admobRewarded() {
  const AdMob = plugin();
  if (!admobAvailable()) return 'error';
  if (!ready) {
    if (!consent) await admobInit();
    if (!ready) return consent && !consent.canRequestAds ? 'noconsent' : 'error';
  }
  if (navigator.onLine === false) return 'offline';
  const adId = ids().rewarded_android;
  try { await AdMob.prepareRewardVideoAd({ adId, isTesting: !!M().mode_test }); }
  catch (e) {
    const c = String(e && e.code);                                   // codes AdMob : 2 réseau, 3 aucune pub
    console.warn('Pubs (chargement) :', c, e && e.message);
    return c === '2' || navigator.onLine === false ? 'offline' : c === '3' ? 'nofill' : 'nofill';
  }
  return new Promise(resolve => {
    let got = false, over = false;
    const handles = [];
    const done = v => { if (over) return; over = true; handles.forEach(h => { try { h.remove(); } catch (e) {} }); resolve(v); };
    Promise.all([
      AdMob.addListener(EV.rewarded, () => { got = true; }),
      AdMob.addListener(EV.dismissed, () => done(got ? 'rewarded' : 'closed')),
      AdMob.addListener(EV.failedToShow, () => done('error'))
    ]).then(h => {
      handles.push(...h);
      if (over) h.forEach(x => { try { x.remove(); } catch (e) {} });
      return AdMob.showRewardVideoAd().then(() => { got = true; });
    }).catch(e => { console.warn('Pubs (affichage) :', e && (e.code || e.message)); done('error'); });
  });
}
