// Le Voyage : écran de transition entre deux arènes (nom, décor, « +30 % PV », touchable pour passer),
// puis, la première fois qu'une arène est atteinte, l'écran « Arène découverte » et le coffre du gardien battu (talisman).
// Ces écrans couvrent tout l'écran : leurs appuis ne deviennent jamais des gestes de jeu.
import { D } from '../data.js';
import { decorUrl } from './assets.js';
import { facets, INK } from './icons.js';
import { sfx } from '../audio/audio.js';
import { talismanData } from '../game/talismans.js';
import { itemIcon, tpl } from './weapon-ui.js';

const $ = id => document.getElementById(id);
let el = null, close = null, finish = null, gen = 0;

function build() {
  el = document.createElement('div');
  el.id = 'voyageTr';
  el.className = 'vy hidden';
  document.body.appendChild(el);
  for (const t of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend']) {
    el.addEventListener(t, e => e.stopPropagation());
  }
  el.addEventListener('click', () => { if (close) close(); });
}

/** Coffre low-poly aux couleurs de l'arène (l'emplacement des cosmétiques à venir). */
function chest(tint) {
  return `<svg width="120" height="104" viewBox="0 0 120 104" aria-hidden="true" style="display:block;overflow:visible">
    <path d="M12 44 L108 44 L104 98 L16 98 Z" fill="${tint}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M12 44 L60 44 L60 98 L16 98 Z" fill="#fff" fill-opacity=".14"/>
    <path d="M10 44 C12 14 108 14 110 44 Z" fill="${tint}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M10 44 C12 14 60 14 60 44 Z" fill="#fff" fill-opacity=".22"/>
    <path d="M8 44 L112 44" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
    <path d="M30 22 L30 98 M90 22 L90 98" stroke="#FFD23F" stroke-width="7" stroke-linecap="round"/>
    <path d="M30 22 L30 98 M90 22 L90 98" stroke="${INK}" stroke-width="2.5" stroke-dasharray="0 12" stroke-linecap="round"/>
    <rect x="49" y="38" width="22" height="26" rx="4" fill="#FFD23F" stroke="${INK}" stroke-width="4.5"/>
    <circle cx="60" cy="50" r="3.5" fill="${INK}"/></svg>`;
}

/** Affiche html et attend : un tap (après minDelay s) ou, si auto > 0, la fin du délai. */
function screen(html, bg, auto, minDelay = 0) {
  if (!el) build();
  el.innerHTML = html;
  el.style.background = bg;
  el.classList.remove('hidden');
  return new Promise(resolve => {
    const t0 = performance.now();
    let timer = 0;
    finish = () => { clearTimeout(timer); close = finish = null; resolve(); };
    close = () => { if (performance.now() - t0 >= minDelay * 1000) finish(); };
    if (auto > 0) timer = setTimeout(() => finish && finish(), auto * 1000);
  });
}

const grad = tint => `linear-gradient(180deg, color-mix(in srgb, ${tint} 70%, #fff) 0%, ${tint} 45%, color-mix(in srgb, ${tint} 60%, #000) 100%)`;

/**
 * info : { name, decor, tint, index, total, heal, first } (voir game/voyage.js).
 * Résolue quand le joueur repart (tap, ou fin du délai).
 */
export async function showTransition(info) {
  const g = ++gen, T = D.voyage.transition, url = info.decor ? await decorUrl(info.decor) : null;
  const beyond = info.index >= info.total;
  const bg = url ? `center / cover no-repeat url("${url}"), ${info.tint}` : grad(info.tint);
  await screen(`${url ? '' : facets.bg()}<div class="vy-in">
      <span class="vy-kick">${beyond ? 'SANS FIN' : 'ARÈNE ' + (info.index + 1) + ' / ' + info.total}</span>
      <h1 class="vy-name">${info.name}</h1>
      ${info.heal ? `<span class="vy-heal">+${Math.round(info.heal * 100)} % PV</span>` : ''}
    </div><span class="vy-tap">toucher pour passer</span>`, bg, T.duration);
  if (!info.first || g !== gen) return hide();
  // Coffre du gardien qu'on vient de battre : son talisman (data/talismans.json). Sinon, simple découverte de l'arène.
  const U = D.talismans.ui, prev = info.index > 0 ? D.voyage.arenas[info.index - 1] : null;
  const loot = (info.rewards || []).map(r => talismanData(r.id)).filter(Boolean);
  sfx('deblocage');
  await screen(`${facets.bg()}<div class="vy-in">
      <span class="vy-kick">ARÈNE DÉCOUVERTE</span>
      <h1 class="vy-name small">${info.name}</h1>
      ${loot.length ? `<div class="vy-chest">${chest(info.tint)}<b>${U.chestTitle}</b>${prev ? `<span>${tpl(U.chestOpened, { arena: prev.name })}</span>` : ''}
        ${loot.map(t => `<div class="vy-loot">${itemIcon('talismans', t.id, 40)}<div><b>${t.name}</b><span>${t.text}</span></div></div>`).join('')}</div>` : ''}
    </div><span class="vy-tap">toucher pour continuer</span>`, grad(info.tint), 0, T.discoveryMin);
  hide();
}

function hide() { if (el) el.classList.add('hidden'); }

/** Ferme l'écran (partie quittée). */
export function hideTransition() {
  gen++;
  if (finish) finish();
  hide();
}
