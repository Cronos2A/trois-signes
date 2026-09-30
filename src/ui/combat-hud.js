// Interface du combat en HTML, d'après la maquette « Combat Forêt de Mousse » :
// avatar + vie + Quitter, carte Vague / chrono / score, pastille de série en bas.
// Mise à jour à chaque image, mais le DOM n'est touché que si une valeur change.
import { D } from '../data.js';
import { G } from '../game/state.js';
import { facets } from './icons.js';
import { superReady, superActive } from '../game/supers.js';
import { tr, nf, nfi } from '../i18n.js';
import { boostsHudHtml } from './daily-ui.js';

/** Bas de la carte Vague / chrono / score, sous la zone sûre (px CSS) : les ennemis restent dessous. */
export const HUD_BOTTOM = 128;

const $ = id => document.getElementById(id);
const last = {};

function set(key, el, prop, value) {
  if (last[key] === value) return;
  last[key] = value;
  if (prop === 'text') el.textContent = value;
  else if (prop.startsWith('--')) el.style.setProperty(prop, value);
  else if (prop === 'html') el.innerHTML = value;
  else if (prop === 'class') el.className = value;
  else if (prop === 'voyageClass') el.classList.toggle('voyage', value);
  else if (prop === 'tutoClass') el.classList.toggle('tuto', value);
  else el.style[prop] = value;
}

/** Au début d'une partie : personnage choisi dans le lobby. */
export function setupHud(c) {
  for (const k in last) delete last[k];
  const av = $('hudAv');
  av.style.background = c.color;
  av.innerHTML = facets.small() + `<span class="ol ol-4">${c.name[0]}</span>`;
  $('hudName').textContent = c.name;
  $('hudArena').className = 'hud-arena';
  $('hud').style.setProperty('--acc', c.accent || c.color);   // couleur d'accent : jauge, bouton et compteur de super
}

export function updateHud(A) {
  if (G.mode !== 'play' && G.mode !== 'train') return;
  const hero = G.hero, ratio = Math.max(0, hero.hp / hero.max);
  set('hp', $('hudHp'), 'text', Math.ceil(hero.hp) + ' / ' + hero.max + (hero.barrier > 0 ? ' +' + Math.ceil(hero.barrier) : ''));   // + bouclier (Clochette)
  set('bar', $('hudBar'), 'width', (ratio * 100).toFixed(1) + '%');
  set('low', $('hudBar'), 'class', ratio <= 0.3 ? 'low' : '');

  const tuto = G.mode === 'play' && !!G.battle.tutorial;
  set('tuto', $('hud'), 'tutoClass', tuto);
  set('quitTxt', $('quitTxt'), 'text', tuto ? tr('hud.skip') : tr('hud.quit'));
  if (tuto) {
    // Leçon : « LEÇON 2 / 5 », objectif de l'étape (« 1 / 3 ») et consigne sous la carte.
    const T = G.tuto || { step: 0, total: 5, count: 0, goal: 1, label: '', consigne: '' };
    set('voyage', $('hud'), 'voyageClass', false);
    set('waveK', $('hudWaveK'), 'text', tr('hud.lesson'));
    set('waveKc', $('hudWaveK'), 'class', 'hud-k');
    set('wave', $('hudWave'), 'text', (T.step + 1) + ' / ' + T.total);
    set('pips', $('hudPips'), 'html', Array.from({ length: T.total }, (_, i) =>
      `<i class="${i < T.step ? 'done' : i === T.step ? 'cur' : ''}"></i>`).join(''));
    set('time', $('hudTime'), 'text', T.label + ' ' + T.count + ' / ' + T.goal);
    set('timeC', $('hudTimer'), 'class', 'hud-timer');
    set('arena', $('hudArena'), 'text', T.help ? D.tutorial.handHint : T.consigne);   // après deux échecs : « Suis la main »
    set('help', $('hudArena'), 'class', 'hud-arena' + (T.help ? ' help' : ''));
  } else if (G.mode === 'play' && G.battle.duel && G.duelHud) {
    // Duel : « Vague 2 / 5 » (BOSS à la dernière), temps restant de la vague, adversaire et son score en direct dessous.
    const H = G.duelHud, boss = H.wave === H.total, left = Math.max(0, Math.ceil(H.left));
    set('voyage', $('hud'), 'voyageClass', true);
    set('waveK', $('hudWaveK'), 'text', boss ? tr('hud.boss') : H.label);
    set('waveKc', $('hudWaveK'), 'class', 'hud-k' + (boss ? ' boss' : ''));
    set('wave', $('hudWave'), 'text', H.wave + ' / ' + H.total);
    set('pips', $('hudPips'), 'html', Array.from({ length: H.total }, (_, i) =>
      `<i class="${i < H.wave - 1 ? 'done' : i === H.wave - 1 ? (boss ? 'boss' : 'cur') : ''}"></i>`).join(''));
    set('time', $('hudTime'), 'text', Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'));
    set('timeC', $('hudTimer'), 'class', 'hud-timer' + (boss || left <= 20 ? ' hot' : ''));
    set('arena', $('hudArena'), 'text', H.line);
    set('score', $('hudScore'), 'text', nfi(G.score));
  } else if (G.mode === 'play' && G.battle.endless) {
    // Le Voyage : « Round 2 / 4 », multiplicateur de score à la place du chrono, nom de l'arène dessous.
    const V = G.voyage, n = V ? V.rounds : 4, cur = V ? V.round + 1 : 1, boss = cur === n;
    set('voyage', $('hud'), 'voyageClass', true);
    set('waveK', $('hudWaveK'), 'text', boss ? tr('hud.guardian') : tr('hud.round'));
    set('waveKc', $('hudWaveK'), 'class', 'hud-k' + (boss ? ' boss' : ''));
    set('wave', $('hudWave'), 'text', cur + ' / ' + n);
    set('pips', $('hudPips'), 'html', Array.from({ length: n }, (_, i) =>
      `<i class="${i < cur - 1 ? 'done' : i === cur - 1 ? (boss ? 'boss' : 'cur') : ''}"></i>`).join(''));
    set('time', $('hudTime'), 'text', '×' + nf(Math.round(G.scoreMult * 100) / 100));
    set('timeC', $('hudTimer'), 'class', 'hud-timer' + (boss ? ' hot' : ''));
    set('arena', $('hudArena'), 'text', V ? V.name : '');
    set('score', $('hudScore'), 'text', nfi(G.score));
  } else if (G.mode === 'play') {
    set('voyage', $('hud'), 'voyageClass', false);
    const B = G.battle, n = B.waves.length, cur = Math.max(1, Math.min(G.waveIdx, n)), boss = !!B.waves[cur - 1].boss;
    set('waveK', $('hudWaveK'), 'text', boss ? tr('hud.boss') : B.label.toLocaleUpperCase());
    set('waveKc', $('hudWaveK'), 'class', 'hud-k' + (boss ? ' boss' : ''));
    set('wave', $('hudWave'), 'text', cur + ' / ' + n);
    set('pips', $('hudPips'), 'html', B.waves.map((w, i) =>
      `<i class="${i < cur - 1 ? 'done' : i === cur - 1 ? (boss ? 'boss' : 'cur') : ''}"></i>`).join(''));
    // Chrono : compte à rebours si le combat a une durée, sinon temps écoulé (Histoire).
    const left = B.timeLimit ? Math.max(0, Math.ceil(B.timeLimit - G.time)) : Math.floor(G.time);
    set('time', $('hudTime'), 'text', Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'));
    set('timeC', $('hudTimer'), 'class', 'hud-timer' + (boss || (B.timeLimit && left <= 20) ? ' hot' : ''));
    set('score', $('hudScore'), 'text', nfi(G.score));
  }

  // Jauge de super, puis bouton : prêt (pulse), en cours (compteur), sinon caché.
  const J = D.characters.superGauge.max, gp = Math.min(1, hero.gauge / J);
  set('gauge', $('hudGauge'), 'width', (gp * 100).toFixed(1) + '%');
  set('gaugeC', $('hudGaugeBox'), 'class', 'hud-gauge' + (gp >= 1 ? ' full' : ''));
  const sp = hero.sp, active = superActive(), btn = $('superBtn');
  set('superC', btn, 'class', 'hud-super' + (active ? ' active' : superReady() ? ' ready' : ' hidden'));
  if (active) {
    const left = Math.max(0, sp.until - G.time), charges = sp.autoDodges || sp.comboCharges;
    set('superVal', $('superVal'), 'text', left > 0 ? tr('units.seconds', { n: Math.ceil(left) }) : '×' + charges);
    set('superName', $('superName'), 'text', sp.name + (left > 0 && charges ? ' · ×' + charges : ''));
    const p = left > 0 ? left / sp.duration : charges / (hero.super.autoDodges || hero.super.comboCharges || 1);
    set('superP', btn, '--p', p.toFixed(2));
  } else {
    set('superVal', $('superVal'), 'text', tr('hud.super'));
    set('superName', $('superName'), 'text', '');
  }

  // Série : pastilles (4, ou 3 pour Ilwen), pleine (orange) juste après un combo. Boran n'en a pas.
  const L = hero.comboLength, full = A.combo;
  const on = full ? L : G.streak.n;
  let html = '';
  for (let i = 0; i < L; i++) html += `<i${i < on ? ' class="on"' : ''}></i>`;
  html += full ? `<span>${full.cm ? tr('hud.streakMult', { m: nf(full.cm) }) : tr('hud.streak')}</span>` : `<span>${on} / ${L}</span>`;
  set('streak', $('hudStreak'), 'html', html);
  set('boosts', $('hudBoosts'), 'html', G.mode === 'play' ? boostsHudHtml() : '');   // boosts XP / or de la partie
  set('streakC', $('hudStreak'), 'class', 'hud-streak' + (hero.noCombo ? ' off' : full ? ' full' : on === L - 1 ? ' near' : ''));
}
