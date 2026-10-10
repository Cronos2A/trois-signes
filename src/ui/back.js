// Bouton Retour du téléphone (et du navigateur) : il ne quitte plus le jeu par surprise (data/rules.json → backButton).
// Une entrée d'historique « garde » est posée au lancement ; chaque Retour la consomme (popstate) et on la repose,
// sauf sur l'onglet Jouer sans rien d'ouvert : là, Retour quitte le jeu comme d'habitude.
//  - en partie (combat, Entraînement, leçon) : la confirmation « Quitter la partie ? » du bouton Quitter (ui/quit-confirm.js) ;
//  - Duel en cours (combat, attente, KO) : seulement l'information « Impossible de quitter un Duel en cours » (duelInfo) ;
//  - écran de chargement (démarrage, transition) : rien ;
//  - séquence de fin (ui/end-seq.js) : rien pendant l'animation, puis « Continuer » quand il est proposé ;
//  - cinématique : elle est passée ; écran « toucher pour continuer » : on continue ;
//  - menus : la fenêtre du dessus se ferme (réglages, boutique, classements, salon du Duel, histoire…), sinon retour à l'onglet Jouer.
import { G } from '../game/state.js';
import { quitOpen, quitStay } from './quit-confirm.js';
import { panelOpen, panelBack } from './end-seq.js';
import { isNative } from '../native.js';
import { loadingOn } from './loading.js';

const $ = id => document.getElementById(id);
const shown = el => !!el && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none';
const visible = sel => [...document.querySelectorAll(sel)].find(e => e.offsetParent || getComputedStyle(e).position === 'fixed');
const clickFirst = sels => { for (const s of sels) { const e = visible(s); if (e) { e.click(); return true; } } return false; };
// Confirmation de sortie de partie : la même fenêtre que le bouton « Quitter » de l'écran (ui/quit-confirm.js).
let leave = () => Promise.resolve(false);
/** main.js fournit l'action « Quitter » (confirmation puis retour au lobby). */
export function setLeave(fn) { leave = fn; }

/** Un Retour : true s'il a été traité (on reste dans le jeu), false pour laisser quitter. Aussi appelé par src/native.js (Android). */
export function onBack() {
  if (loadingOn()) return true;                                                      // écran de chargement (démarrage, transition) : rien
  if (quitOpen()) { quitStay(); return true; }                                     // « Retour » sur la confirmation = continuer
  if (panelOpen()) { panelBack(); return true; }                                   // panneau de fin : « Continuer » s'il est proposé
  if (shown($('testAd'))) return true;                                               // publicité en cours : on attend
  const ask = visible('.ad-card.ask [data-ad="no"]'); if (ask) { ask.click(); return true; }
  if (shown($('reportModal'))) { clickFirst(['#reportModal [data-rp="cancel"]', '#reportModal [data-rp="ok"]']); return true; }   // signalement : annuler
  if (shown($('accModal'))) { clickFirst(['#accModal [data-ac="cancel"]', '#accModal [data-ac="no"]', '#accModal [data-ac="back"]', '#accModal [data-ac="ok"]']); return true; }   // compte : annuler / retour
  const ps = $('pseudoModal');
  if (shown(ps)) { clickFirst(['#pseudoModal [data-pa="cancel"]']); return true; }  // pseudo obligatoire, sauvegarde endommagée : on reste
  if ($('tipBubble')) { $('tipBubble').remove(); return true; }                     // explication : « Compris »
  if (shown($('cutscene'))) { $('csSkip')?.click(); return true; }
  if (shown($('voyageTr'))) { $('voyageTr').click(); return true; }
  if (shown($('reward'))) { clickFirst(['#reward button']); return true; }
  if (shown($('boostOffer'))) { clickFirst(['#boostOffer [data-of="play"]']); return true; }   // boost proposé : on joue sans rien changer
  if (shown($('dailyWin'))) { clickFirst(['#dailyWin [data-dy="close"]']); return true; }
  if (shown($('dailyScr'))) { clickFirst(['#dailyScr [data-dy="close"]']); return true; }
  const du = $('duel');
  const inGame = document.documentElement.classList.contains('in-game') && (G.mode === 'play' || G.mode === 'train');
  if (shown(du) && du.classList.contains('wait')) {                                  // attente de l'adversaire (ou KO) : Duel en cours
    leave();                                                                         // information seulement (main.js → askLeave)
    return true;
  }
  if (G.mode === 'ending') return true;                                              // séquence de fin : on attend le panneau
  if (shown(du) && !du.classList.contains('banner')) {
    clickFirst(['#duel [data-du="cancel"]', '#duel [data-du="leave"]', '#duel [data-du="back"]', '#duel [data-du="home"]', '#duel [data-du="ok"]']);
    return true;
  }
  if (inGame) {
    leave();                                                                         // même confirmation que le bouton « Quitter »
    return true;
  }
  if (document.querySelector('.rk-ask')) { clickFirst(['.rk-ask [data-ok]']); return true; }   // pays demandé : validé tel quel
  if (shown($('ranking'))) { clickFirst(['.rk-close']); return true; }
  if (shown($('shopModal'))) { if (!clickFirst(['#shopModal [data-act="closeShop"]'])) { $('shopModal').className = 'lb-modal hidden'; $('shopModal').innerHTML = ''; } return true; }
  if (shown($('settings'))) { clickFirst(['#settings [data-act="backSettings"]', '#settings [data-act="closeSettings"]']); return true; }
  if (shown($('results'))) { clickFirst(['#results [data-act="home"]']); return true; }
  if (shown($('story'))) { clickFirst(['#story [data-act="back"]', '#story [data-act="later"]']); return true; }
  const tab = visible('#lbTabs .tab.on');
  if (tab && tab.dataset.arg !== 'play') { clickFirst(['#lbTabs [data-arg="play"]']); return true; }
  return false;
}

/** À appeler une fois au démarrage. */
export function initBack() {
  if (isNative()) return;                                                            // Android : évènement Retour de Capacitor (native.js)
  try {
    history.pushState({ ts: 'garde' }, '');
    addEventListener('popstate', () => {
      if (onBack()) history.pushState({ ts: 'garde' }, '');
      else history.back();                                                           // onglet Jouer, rien d'ouvert : on quitte
    });
  } catch (e) {}
}
