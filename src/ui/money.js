// Petits morceaux d'interface pour l'or et les gemmes (icônes Claude Design, data/economy.json → icons).
import { D } from '../data.js';

const nf = n => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
export const moneyIcon = (cur, size) => `<img class="money-ic" src="${D.economy.icons[cur]}" width="${size}" height="${size}" alt="${cur === 'gold' ? 'or' : 'gemmes'}" draggable="false">`;

/** Prix { gold } ou { gems } : icône + montant. */
export function priceHtml(p, size = 16) {
  const cur = p.gems ? 'gems' : 'gold';
  return `<span class="price ${cur}">${moneyIcon(cur, size)}<b>${nf(p[cur])}</b></span>`;
}

/** Ligne « +N or » des écrans de fin de partie (rien si 0). */
export const goldGainHtml = n => n ? `<div class="money-gain">${moneyIcon('gold', 20)}<b>+${nf(n)} or</b></div>` : '';
export { nf };
