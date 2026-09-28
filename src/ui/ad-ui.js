// Fausse publicité (web) : écran plein « Publicité de test » avec un compte à rebours et un bouton Fermer.
// Récompensée : Fermer est possible à tout moment, mais la récompense n'est donnée qu'à la fin du compte à rebours.
// Plein écran : Fermer apparaît à la fin du compte à rebours. Textes : data/ads.json → ui.
import { D } from '../data.js';
import { glyph, facets } from './icons.js';

let el = null;
const U = () => D.ads.ui;

/** Icône des boutons de pub récompensée : écran avec un triangle « lecture ». */
export const adIcon = (s = 20) => `<svg class="ad-ic" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">
  <rect x="2.5" y="4.5" width="19" height="15" rx="3.5" fill="#FFF1D6" stroke="#15301E" stroke-width="2.4"/>
  <polygon points="10,8.6 16,12 10,15.4" fill="#FF5A3C" stroke="#15301E" stroke-width="1.8" stroke-linejoin="round"/></svg>`;

function build() {
  el = document.createElement('div');
  el.id = 'testAd';
  el.className = 'ad-screen hidden';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  document.body.appendChild(el);
  // Écran plein : ses appuis ne deviennent jamais des gestes de jeu.
  for (const t of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend']) el.addEventListener(t, e => e.stopPropagation());
}

/** kind : 'rewarded' | 'interstitial'. Résolue à true si la pub a été vue jusqu'au bout. */
export function showTestAd(kind, seconds) {
  if (!el) build();
  const rewarded = kind === 'rewarded';
  el.innerHTML = `${facets.bg()}<div class="ad-card">
      <span class="ad-kick">${U().testTitle}</span>
      <div class="ad-art">${glyph('tri', '#FF5A3C', 64, { outline: 3.5 })}${glyph('circle', '#3DDC5B', 56, { outline: 3.5 })}${glyph('dot', '#FF8C32', 48, { outline: 3.5 })}</div>
      <p class="ad-text">${U().testText}</p>
      ${rewarded ? `<p class="ad-hint">${U().rewardHint}</p>` : ''}
      <div class="ad-timer"><i></i><b>${U().seconds.replace('{n}', seconds)}</b></div>
    </div>
    <button class="ad-close${rewarded ? '' : ' hidden'}" data-ad="close">${U().close}</button>`;
  el.classList.remove('hidden');
  const bar = el.querySelector('.ad-timer i'), label = el.querySelector('.ad-timer b'), close = el.querySelector('[data-ad=close]');
  const t0 = Date.now();
  return new Promise(resolve => {
    let done = false;
    const tick = setInterval(() => {
      const s = (Date.now() - t0) / 1000, left = Math.max(0, Math.ceil(seconds - s));
      bar.style.width = Math.min(100, s / seconds * 100) + '%';
      label.textContent = left ? U().seconds.replace('{n}', left) : (rewarded ? U().rewardDone : '');
      if (s >= seconds && !done) {
        done = true;
        clearInterval(tick);
        close.classList.remove('hidden');
        el.querySelector('.ad-card').classList.add('done');
      }
    }, 100);
    close.addEventListener('click', () => {
      clearInterval(tick);
      el.classList.add('hidden');
      el.innerHTML = '';
      resolve(done);
    }, { once: true });
  });
}

/** Choix avant une pub récompensée (Seconde chance) : résolu à true si le joueur accepte. */
export function askChoice(title, text, yes, no) {
  if (!el) build();
  el.innerHTML = `<div class="ad-card ask">
      <div class="res-title ol ol-5 set-title">${title}</div>
      <p class="ad-text">${text}</p>
      <button class="res-again ad-yes" data-ad="yes">${adIcon(26)}<span class="ol ol-4">${yes}</span></button>
      <button class="mini-btn" data-ad="no">${no}</button>
    </div>`;
  el.classList.remove('hidden');
  el.classList.add('ask');
  return new Promise(resolve => {
    el.querySelectorAll('[data-ad]').forEach(b => b.addEventListener('click', () => {
      el.classList.add('hidden'); el.classList.remove('ask'); el.innerHTML = '';
      resolve(b.dataset.ad === 'yes');
    }, { once: true }));
  });
}

/** Petit message en bas de l'écran (pub fermée trop tôt, récompense reçue). */
let toastEl = null, toastT = 0;
export function adToast(msg) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'ad-toast hidden'; document.body.appendChild(toastEl); }
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.add('hidden'), 2200);
}
