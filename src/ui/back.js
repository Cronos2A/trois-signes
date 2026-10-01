// Bouton Retour du téléphone (et du navigateur) : il ne quitte plus le jeu par surprise (data/rules.json → backButton).
// Une entrée d'historique « garde » est posée au lancement ; chaque Retour la consomme (popstate) et on la repose,
// sauf sur l'onglet Jouer sans rien d'ouvert : là, Retour quitte le jeu comme d'habitude.
//  - en partie (combat, Duel, Entraînement, leçon) : confirmation « Quitter la partie ? » (le combat est en pause pendant ce temps) ;
//  - cinématique : elle est passée ; écran « toucher pour continuer » : on continue ;
//  - menus : la fenêtre du dessus se ferme (réglages, boutique, classements, salon du Duel, histoire…), sinon retour à l'onglet Jouer.
import { D } from '../data.js';
import { G } from '../game/state.js';
import { sfx } from '../audio/audio.js';

const B = () => D.rules.backButton;
const $ = id => document.getElementById(id);
const shown = el => !!el && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none';
const visible = sel => [...document.querySelectorAll(sel)].find(e => e.offsetParent || getComputedStyle(e).position === 'fixed');
const clickFirst = sels => { for (const s of sels) { const e = visible(s); if (e) { e.click(); return true; } } return false; };
let box = null, confirmOpen = null;

/** Fenêtre « Quitter la partie ? ». Résolue avec true (quitter) ou false (continuer). */
function askQuit(text) {
  if (!box) {
    box = document.createElement('div');
    box.id = 'backConfirm';
    box.className = 'bk-layer hidden';
    box.setAttribute('role', 'alertdialog');
    document.body.appendChild(box);
  }
  box.innerHTML = `<div class="res-card bk-card">
      <div class="res-title ol ol-5 bk-title">${B().title}</div>
      <p class="bk-text">${text}</p>
      <button class="res-again" data-bk="stay"><span class="ol ol-4">${B().stay}</span></button>
      <button class="mini-btn bk-quit" data-bk="quit">${B().quit}</button>
    </div>`;
  box.classList.remove('hidden');
  const wasPaused = G.paused;
  G.paused = true;
  return new Promise(res => {
    const close = v => { box.classList.add('hidden'); box.innerHTML = ''; box.onclick = null; confirmOpen = null; G.paused = wasPaused; res(v); };
    confirmOpen = () => close(false);
    box.onclick = e => { const b = e.target.closest('[data-bk]'); if (!b) return; sfx('ui_clic'); close(b.dataset.bk === 'quit'); };
  });
}

/** Un Retour : true s'il a été traité (on reste dans le jeu), false pour laisser quitter. */
function onBack() {
  if (confirmOpen) { confirmOpen(); return true; }                                 // « Retour » sur la confirmation = continuer
  if (shown($('testAd'))) return true;                                               // publicité en cours : on attend
  const ask = visible('.ad-card.ask [data-ad="no"]'); if (ask) { ask.click(); return true; }
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
  if (shown(du) && du.classList.contains('wait')) {                                  // attente de l'adversaire (ou KO) : abandonner ?
    askQuit(B().textDuel).then(q => { if (q) clickFirst(['#duel [data-du="abandon"]']); });
    return true;
  }
  if (shown(du) && !du.classList.contains('banner')) {
    clickFirst(['#duel [data-du="cancel"]', '#duel [data-du="leave"]', '#duel [data-du="back"]', '#duel [data-du="home"]', '#duel [data-du="ok"]']);
    return true;
  }
  if (inGame) {
    const b = G.battle || {};
    const text = b.duel ? B().textDuel : b.tutorial ? B().textLesson : G.mode === 'train' ? B().textTrain : B().text;
    askQuit(text).then(q => { if (q && document.documentElement.classList.contains('in-game')) $('quit')?.click(); });
    return true;
  }
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
  try {
    history.pushState({ ts: 'garde' }, '');
    addEventListener('popstate', () => {
      if (onBack()) history.pushState({ ts: 'garde' }, '');
      else history.back();                                                           // onglet Jouer, rien d'ouvert : on quitte
    });
  } catch (e) {}
}
