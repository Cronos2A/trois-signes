// Interface du combat en HTML, d'après la maquette « Combat Forêt de Mousse » :
// avatar + vie + Quitter, carte Vague / chrono / score, pastille de série en bas.
// Mise à jour à chaque image, mais le DOM n'est touché que si une valeur change.
import { D } from '../data.js';
import { G } from '../game/state.js';
import { facets } from './icons.js';
import { superReady, superActive } from '../game/supers.js';

/** Bas de la carte Vague / chrono / score, sous la zone sûre (px CSS) : les ennemis restent dessous. */
export const HUD_BOTTOM = 128;

const $ = id => document.getElementById(id);
const nf = n => Math.round(n).toLocaleString('fr-FR').replace(/\s/g, ' ');
const last = {};

function set(key, el, prop, value) {
  if (last[key] === value) return;
  last[key] = value;
  if (prop === 'text') el.textContent = value;
  else if (prop.startsWith('--')) el.style.setProperty(prop, value);
  else if (prop === 'html') el.innerHTML = value;
  else if (prop === 'class') el.className = value;
  else el.style[prop] = value;
}

/** Au début d'une partie : personnage choisi dans le lobby. */
export function setupHud(c) {
  for (const k in last) delete last[k];
  const av = $('hudAv');
  av.style.background = c.color;
  av.innerHTML = facets.small() + `<span class="ol ol-4">${c.name[0]}</span>`;
  $('hudName').textContent = c.name;
  $('hud').style.setProperty('--acc', c.accent || c.color);   // couleur d'accent : jauge, bouton et compteur de super
}

export function updateHud(A) {
  if (G.mode !== 'play' && G.mode !== 'train') return;
  const hero = G.hero, ratio = Math.max(0, hero.hp / hero.max);
  set('hp', $('hudHp'), 'text', Math.ceil(hero.hp) + ' / ' + hero.max);
  set('bar', $('hudBar'), 'width', (ratio * 100).toFixed(1) + '%');
  set('low', $('hudBar'), 'class', ratio <= 0.3 ? 'low' : '');

  if (G.mode === 'play') {
    const n = D.waves.waves.length, cur = Math.max(1, Math.min(G.waveIdx, n)), boss = cur === n;
    set('waveK', $('hudWaveK'), 'text', boss ? 'BOSS' : 'VAGUE');
    set('waveKc', $('hudWaveK'), 'class', 'hud-k' + (boss ? ' boss' : ''));
    set('wave', $('hudWave'), 'text', cur + ' / ' + n);
    set('pips', $('hudPips'), 'html', D.waves.waves.map((w, i) =>
      `<i class="${i < cur - 1 ? 'done' : i === cur - 1 ? (boss ? 'boss' : 'cur') : ''}"></i>`).join(''));
    const left = Math.max(0, Math.ceil(D.waves.timeLimit - G.time));
    set('time', $('hudTime'), 'text', Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'));
    set('timeC', $('hudTimer'), 'class', 'hud-timer' + (boss || left <= 20 ? ' hot' : ''));
    set('score', $('hudScore'), 'text', nf(G.score));
  }

  // Jauge de super, puis bouton : prêt (pulse), en cours (compteur), sinon caché.
  const J = D.characters.superGauge.max, gp = Math.min(1, hero.gauge / J);
  set('gauge', $('hudGauge'), 'width', (gp * 100).toFixed(1) + '%');
  set('gaugeC', $('hudGaugeBox'), 'class', 'hud-gauge' + (gp >= 1 ? ' full' : ''));
  const sp = hero.sp, active = superActive(), btn = $('superBtn');
  set('superC', btn, 'class', 'hud-super' + (active ? ' active' : superReady() ? ' ready' : ' hidden'));
  if (active) {
    const left = Math.max(0, sp.until - G.time), charges = sp.autoDodges || sp.comboCharges;
    set('superVal', $('superVal'), 'text', left > 0 ? Math.ceil(left) + ' s' : '×' + charges);
    set('superName', $('superName'), 'text', sp.name + (left > 0 && charges ? ' · ×' + charges : ''));
    const p = left > 0 ? left / sp.duration : charges / (hero.super.autoDodges || hero.super.comboCharges || 1);
    set('superP', btn, '--p', p.toFixed(2));
  } else {
    set('superVal', $('superVal'), 'text', 'SUPER');
    set('superName', $('superName'), 'text', '');
  }

  // Série : pastilles (4, ou 3 pour Ilwen), pleine (orange) juste après un combo. Boran n'en a pas.
  const L = hero.comboLength, full = A.combo;
  const on = full ? L : G.streak.n;
  let html = '';
  for (let i = 0; i < L; i++) html += `<i${i < on ? ' class="on"' : ''}></i>`;
  html += full ? `<span>Série${full.cm ? ' ×' + String(full.cm).replace('.', ',') : ''}</span>` : `<span>${on} / ${L}</span>`;
  set('streak', $('hudStreak'), 'html', html);
  set('streakC', $('hudStreak'), 'class', 'hud-streak' + (hero.noCombo ? ' off' : full ? ' full' : on === L - 1 ? ' near' : ''));
}
