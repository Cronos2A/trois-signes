// Petits morceaux d'interface pour l'or et les gemmes (icônes Claude Design, data/economy.json → icons).
import { D } from '../data.js';
import { tr, nfi } from '../i18n.js';

const nf = nfi;

export const moneyIcon = (cur, size) => `<img class="money-ic" src="${D.economy.icons[cur]}" width="${size}" height="${size}" alt="${tr(cur === 'gold' ? 'money.gold' : 'money.gems')}" draggable="false">`;

/** Prix { gold } ou { gems } : icône + montant. */
export function priceHtml(p, size = 16) {
  const cur = p.gems ? 'gems' : 'gold';
  return `<span class="price ${cur}">${moneyIcon(cur, size)}<b>${nf(p[cur])}</b></span>`;
}

/** Ligne « +N or » des écrans de fin de partie (rien si 0). */
export const goldGainHtml = n => n ? `<div class="money-gain">${moneyIcon('gold', 20)}<b>${tr('units.goldGain', { n: nf(n) })}</b></div>` : '';
export { nfi as nf };
