// Application Android (Capacitor) : tout ce qui ne sert que dans l'application native. Sur le web, rien ne s'exécute ici.
// Modules lus depuis window.Capacitor.Plugins (aucun import : le jeu n'a pas de bundler), docs/EMBALLAGE.md :
//  - App : bouton Retour (même logique que ui/back.js), arrière-plan / retour (game/lifecycle.js : absence du Duel, musique) ;
//  - Haptics : vibrations (game/effects.js → vibrate, selon l'option des Réglages) ;
//  - Browser : liens des Réglages et des Crédits (politique de confidentialité, conditions, suppression du compte) ;
//  - Splash Screen : écran de démarrage, caché dès que le lobby est prêt ; Status Bar : icônes claires sur le fond vert.
// Mode test, fausses pubs et outils de développement : coupés dans l'application (economy.js → testMode, ads.js → fakeAllowed).
import { nativeActive } from './game/lifecycle.js';

/** Dans l'application Android (et pas dans un navigateur) ? */
export const isNative = () => { try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch (e) { return false; } };
const plugin = name => (isNative() && window.Capacitor.Plugins && window.Capacitor.Plugins[name]) || null;
const quiet = p => { if (p && p.catch) p.catch(() => {}); };

/**
 * Démarrage (main.js) : back() traite un Retour (true : traité, le jeu reste ouvert ; false : onglet Jouer sans rien d'ouvert,
 * l'application passe en arrière-plan comme toute application Android).
 */
export function initNative({ back }) {
  if (!isNative()) return;
  document.documentElement.classList.add('native');
  const App = plugin('App');
  if (App) {
    quiet(App.addListener('backButton', () => { if (!back()) quiet(App.minimizeApp()); }));
    quiet(App.addListener('appStateChange', s => nativeActive(!!s.isActive)));
  }
  quiet(plugin('StatusBar') && plugin('StatusBar').setStyle({ style: 'DARK' }));
  // Liens qui ouvriraient un nouvel onglet : navigateur intégré (Browser), jamais dans la WebView du jeu.
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[target="_blank"]');
    if (!a || !/^https:/.test(a.href)) return;
    e.preventDefault();
    openUrl(a.href);
  }, true);
}

/** Écran de démarrage caché (le lobby est affiché). */
export function hideSplash() { quiet(plugin('SplashScreen') && plugin('SplashScreen').hide({ fadeOutDuration: 250 })); }

/** Ouvre une adresse https : navigateur intégré dans l'application, nouvel onglet sur le web. */
export function openUrl(url) {
  const B = plugin('Browser');
  if (B) quiet(B.open({ url, toolbarColor: '#174A28' }));
  else window.open(url, '_blank', 'noopener');
}

/**
 * Vibration native (Haptics) : motif [vibre, pause, vibre, …] en millisecondes, comme navigator.vibrate.
 * Renvoie false hors de l'application (le web garde navigator.vibrate).
 */
export function nativeVibrate(pattern) {
  const H = plugin('Haptics');
  if (!H) return false;
  const steps = Array.isArray(pattern) ? pattern : [pattern];
  let t = 0;
  steps.forEach((ms, i) => {
    if (i % 2 === 0 && ms > 0) setTimeout(() => quiet(H.vibrate({ duration: ms })), t);
    t += ms;
  });
  return true;
}
