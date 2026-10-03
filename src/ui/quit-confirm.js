// Confirmation « Quitter la partie ? » : une seule fenêtre pour le bouton « Quitter » de l'écran de combat, le bouton
// « Abandonner » de l'attente du Duel et le bouton Retour du téléphone (ui/back.js). Textes : data/i18n → quit.*
// Le message dit ce qui se passe vraiment (main.js → toLobby, game/duel.js → onQuit) :
//  - Voyage : or et gemmes des rounds terminés gardés ; ni bonus de fin, ni record, ni XP du héros et de l'arme ;
//  - combat d'Histoire : or des rounds terminés gardé ; le combat est à refaire ; ni XP, ni bonus de victoire, ni arme débloquée ;
//  - Entraînement : rien ; leçon : à revoir depuis l'onglet Jouer ;
//  - Duel : défaite ; au hasard, perte d'Empreintes (data/duel.json → prints.loss, jamais sous 0) ; le match continue pendant la question.
// Boost actif et au moins un round terminé : la partie compte pour le boost (game/boosts.js → countBoostGame).
import { D } from '../data.js';
import { G } from '../game/state.js';
import { boostable, activeOf, boostTypes } from '../game/boosts.js';
import { prints } from '../game/duel-rank.js';
import { sfx } from '../audio/audio.js';
import { tr, nfi } from '../i18n.js';

let box = null, open = null;

/** Fenêtre ouverte ? (le bouton Retour la ferme alors : « Continuer »). */
export const quitOpen = () => !!open;
/** Ferme la fenêtre comme « Continuer ». */
export function quitStay() { if (open) open(false); }

/** Titre et lignes du message, selon la partie en cours. */
function message() {
  const b = G.battle || {}, lines = [];
  let title = tr('quit.title');
  if (b.duel) {
    title = tr('quit.titleDuel');
    if (b.random) {
      const loss = Math.min(Math.abs(D.duel.prints.loss), prints());
      lines.push(loss ? tr('quit.duelRandom', { n: nfi(loss) }) : tr('quit.duelRandomZero'));
    } else lines.push(tr('quit.duelFriend'));
    lines.push(tr('quit.duelLive'));
  } else if (b.tutorial) { title = tr('quit.titleLesson'); lines.push(tr('quit.lesson')); }
  else if (G.mode === 'train') title = tr('quit.titleTrain');
  else if (b.xpMode === 'voyage') lines.push(tr('quit.voyage'));
  else lines.push(tr('quit.story'));
  if (boostable(b) && G.roundsCleared >= 1 && boostTypes().some(t => activeOf(t) > 0)) lines.push(tr('quit.boost'));
  return { title, lines };
}

/** Demande confirmation. Résolue avec true (quitter) ou false (continuer). Pause pendant la question, sauf en Duel. */
export function confirmQuit() {
  if (open) return Promise.resolve(false);
  if (!box) {
    box = document.createElement('div');
    box.id = 'backConfirm';
    box.className = 'bk-layer hidden';
    box.setAttribute('role', 'alertdialog');
    document.body.appendChild(box);
  }
  const { title, lines } = message();
  box.innerHTML = `<div class="res-card bk-card" aria-label="${title}">
      <div class="res-title ol ol-5 bk-title">${title}</div>
      ${lines.map(l => `<p class="bk-text">${l}</p>`).join('')}
      <button class="res-again" data-bk="stay"><span class="ol ol-4">${tr('quit.stay')}</span></button>
      <button class="mini-btn bk-quit" data-bk="quit">${tr('quit.quit')}</button>
    </div>`;
  box.classList.remove('hidden');
  const duel = !!(G.battle && G.battle.duel), wasPaused = G.paused;
  if (!duel) G.paused = true;
  box.querySelector('[data-bk="stay"]').focus();
  return new Promise(res => {
    open = v => { box.classList.add('hidden'); box.innerHTML = ''; box.onclick = null; open = null; if (!duel) G.paused = wasPaused; res(v); };
    box.onclick = e => { const btn = e.target.closest('[data-bk]'); if (!btn) return; sfx('ui_clic'); open(btn.dataset.bk === 'quit'); };
  });
}
