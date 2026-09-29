// Écran de récompense : nouvelle arme (Histoire) ou nouveau talisman (Voyage), avec son nom, son icône,
// son effet et le son de déblocage. Les récompenses s'affichent l'une après l'autre ; résolu à la dernière.
import { D } from '../data.js';
import { weaponData, styleText } from '../game/weapons.js';
import { talismanData } from '../game/talismans.js';
import { sfx } from '../audio/audio.js';
import { facets } from './icons.js';
import { itemIcon, tpl } from './weapon-ui.js';
import { moneyIcon } from './money.js';

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

/** r : { kind: 'weapon' | 'talisman', id, hero? } (voir game/rewards.js) ou { kind: 'gems', n, text } (game/economy.js). */
export function rewardHtml(r) {
  if (r.kind === 'weapon') {
    const w = weaponData(r.id), U = D.weapons.ui, h = D.characters.characters.find(c => c.id === r.hero);
    return { kick: U.rewardKick, name: w.name, sub: h ? tpl(U.rewardFor, { hero: h.name }) : '', text: styleText(r.id, 1),
      icon: itemIcon('armes', r.id, 64), bg: h ? h.color : '#FF8C32', ok: U.rewardOk };
  }
  if (r.kind === 'gems') {
    const U = D.economy.ui;
    return { kick: U.gemsReward, name: tpl(U.gemsName, { n: r.n }), sub: '', text: r.text, icon: moneyIcon('gems', 64), bg: '#6B3FA0', ok: U.gemsOk, sound: 'piece' };
  }
  const t = talismanData(r.id), U = D.talismans.ui;
  return { kick: U.rewardKick, name: t.name, sub: '', text: t.text, icon: itemIcon('talismans', r.id, 64), bg: '#1F7A3D', ok: U.rewardOk };
}

function one(R) {
  el.innerHTML = `${facets.bg()}<div class="res-card rw-card">
      <span class="rw-kick">${R.kick}</span>
      <div class="rw-ic" style="background:${R.bg}">${facets.small()}<div class="rel">${R.icon}</div></div>
      <div class="rw-name ol ol-5">${R.name}</div>
      ${R.sub ? `<div class="rw-sub">${R.sub}</div>` : ''}
      <div class="rw-text">${R.text}</div>
      <button class="res-again" data-rw="ok"><span class="ol ol-4">${R.ok}</span></button>
    </div>`;
  el.classList.remove('hidden');
  sfx(R.sound || D.weapons.unlockSound);
  return new Promise(resolve => {
    el.querySelector('[data-rw=ok]').addEventListener('click', () => { sfx('ui_clic'); resolve(); }, { once: true });
  });
}

/** Plusieurs gains de gemmes à la fois : un seul écran, une ligne par gain, puis le total. */
function gemsSummary(list) {
  const U = D.economy.ui, n = list.reduce((s, r) => s + r.n, 0);
  const lines = list.map(r => `<li><span>${r.text}</span><b>${tpl(U.gain, { n: r.n })}</b></li>`).join('');
  return { kick: U.gemsReward, name: tpl(U.gemsName, { n }), sub: '', icon: moneyIcon('gems', 64), bg: '#6B3FA0', ok: U.gemsOk, sound: 'piece',
    text: `<ul class="rw-list">${lines}<li class="rw-total"><span>${U.gemsTotal}</span><b>${tpl(U.gain, { n })}</b></li></ul>` };
}

/** Affiche les récompenses l'une après l'autre ; les gains de gemmes sont regroupés sur un seul écran récapitulatif. */
export async function showRewards(list) {
  if (!list || !list.length) return;
  if (!el) build();
  const gems = list.filter(r => r.kind === 'gems');
  for (const r of list.filter(r => r.kind !== 'gems')) await one(rewardHtml(r));
  if (gems.length > 1) await one(gemsSummary(gems));
  else if (gems.length) await one(rewardHtml(gems[0]));
  el.classList.add('hidden');
}
