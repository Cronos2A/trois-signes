// Écran de récompense : nouvelle arme (Histoire) ou nouveau talisman (Voyage), avec son nom, son icône,
// son effet et le son de déblocage. Les récompenses s'affichent l'une après l'autre ; résolu à la dernière.
import { D } from '../data.js';
import { weaponData, styleText } from '../game/weapons.js';
import { talismanData } from '../game/talismans.js';
import { sfx } from '../audio/audio.js';
import { facets } from './icons.js';
import { itemIcon, tpl } from './weapon-ui.js';

let el = null;

function build() {
  el = document.createElement('div');
  el.id = 'reward';
  el.className = 'rw hidden';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  document.body.appendChild(el);
  // Écran plein : ses appuis ne deviennent jamais des gestes de jeu.
  for (const t of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend']) el.addEventListener(t, e => e.stopPropagation());
}

/** r : { kind: 'weapon' | 'talisman', id, hero? } (voir game/rewards.js). */
export function rewardHtml(r) {
  if (r.kind === 'weapon') {
    const w = weaponData(r.id), U = D.weapons.ui, h = D.characters.characters.find(c => c.id === r.hero);
    return { kick: U.rewardKick, name: w.name, sub: h ? tpl(U.rewardFor, { hero: h.name }) : '', text: styleText(r.id, 1),
      icon: itemIcon('armes', r.id, 64), bg: h ? h.color : '#FF8C32', ok: U.rewardOk };
  }
  const t = talismanData(r.id), U = D.talismans.ui;
  return { kick: U.rewardKick, name: t.name, sub: '', text: t.text, icon: itemIcon('talismans', r.id, 64), bg: '#1F7A3D', ok: U.rewardOk };
}

function one(r) {
  const R = rewardHtml(r);
  el.innerHTML = `${facets.bg()}<div class="res-card rw-card">
      <span class="rw-kick">${R.kick}</span>
      <div class="rw-ic" style="background:${R.bg}">${facets.small()}<div class="rel">${R.icon}</div></div>
      <div class="rw-name ol ol-5">${R.name}</div>
      ${R.sub ? `<div class="rw-sub">${R.sub}</div>` : ''}
      <div class="rw-text">${R.text}</div>
      <button class="res-again" data-rw="ok"><span class="ol ol-4">${R.ok}</span></button>
    </div>`;
  el.classList.remove('hidden');
  sfx(D.weapons.unlockSound);
  return new Promise(resolve => {
    el.querySelector('[data-rw=ok]').addEventListener('click', () => { sfx('ui_clic'); resolve(); }, { once: true });
  });
}

/** Affiche les récompenses l'une après l'autre. */
export async function showRewards(list) {
  if (!list || !list.length) return;
  if (!el) build();
  for (const r of list) await one(r);
  el.classList.add('hidden');
}
