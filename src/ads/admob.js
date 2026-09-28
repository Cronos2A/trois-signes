// Emplacement d'AdMob (application Android / iOS via Capacitor). PAS ENCORE INSTALLÉ : sur le web, rien ici ne s'exécute.
// Mise en place, le moment venu :
//   npm i @capacitor-community/admob && npx cap sync
//   puis renseigner les identifiants de data/ads.json → admob (aujourd'hui : identifiants de test de Google)
//   et l'identifiant d'application AdMob dans AndroidManifest.xml / Info.plist (voir la documentation du module).
// Le module est lu depuis window.Capacitor.Plugins.AdMob : aucun import, donc aucune erreur tant qu'il n'est pas là.
// Noms des appels d'après la documentation de @capacitor-community/admob (à revérifier avec la version installée).

const plugin = () => (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) || null;
const platform = () => (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform()) || 'android';

/** AdMob est-il disponible (application native avec le module installé) ? */
export const admobAvailable = () => !!plugin();

/**
 * Démarrage : initialisation, puis consentement UMP de Google au premier lancement
 * (formulaire affiché seulement s'il est requis, par exemple dans l'Union européenne).
 */
export async function admobInit(cfg) {
  const AdMob = plugin();
  if (!AdMob) return false;
  await AdMob.initialize({ initializeForTesting: !!cfg.initializeForTesting });
  const info = await AdMob.requestConsentInfo();
  if (info && info.isConsentFormAvailable && info.status === 'REQUIRED') await AdMob.showConsentForm();
  return true;
}

/** Pub récompensée : résolue à true seulement si la récompense a été accordée (pub vue jusqu'au bout). */
export async function admobRewarded(cfg) {
  const AdMob = plugin();
  if (!AdMob) return false;
  await AdMob.prepareRewardVideoAd({ adId: cfg.rewarded[platform()], isTesting: !!cfg.initializeForTesting });
  const reward = await AdMob.showRewardVideoAd();
  return !!reward;
}

/** Pub plein écran. */
export async function admobInterstitial(cfg) {
  const AdMob = plugin();
  if (!AdMob) return;
  await AdMob.prepareInterstitial({ adId: cfg.interstitial[platform()], isTesting: !!cfg.initializeForTesting });
  await AdMob.showInterstitial();
}
