// Niveaux de réussite et combos.
import { D } from '../data.js';
import { G, heroPos, addScore } from './state.js';
import { pop, addFx, vibrate } from './effects.js';
import { fmt } from '../util.js';
import { addGauge } from './supers.js';
import { settings } from './settings.js';
import { gradeNotes, sfx } from '../audio/audio.js';

/** Seuils abaissés de toleranceLarge points avec la « Tolérance des gestes : Large » des réglages. */
export const toleranceOffset = () => settings.tolerance === 'large' ? D.grades.toleranceLarge : 0;
export function gradeOf(acc) {
  const off = toleranceOffset();
  for (const g of D.grades.levels) if (acc >= g.min - off) return g;
  return null;
}
export const gradeByName = name => D.grades.levels.find(g => g.name === name);

export function emptyStats() {
  const s = {};
  for (const g of D.grades.levels) s[g.name] = 0;
  s[D.grades.miss.name] = 0;
  return s;
}

/** Gestes identiques de suite pour un combo : 4, ou moins avec un passif (Ilwen). */
export const comboLength = () => (G.hero && G.hero.comboLength) || D.grades.comboLength;

/** Enregistre un geste dans la série et remplit la jauge. Renvoie le multiplicateur de combo (1 si pas de combo). */
export function registerGrade(g) {
  G.stats[g ? g.name : D.grades.miss.name]++;
  if (g) gradeNotes(D.grades.levels.length - D.grades.levels.indexOf(g)); else sfx('geste_rate');
  if (!g) { G.streak = { name: null, n: 0 }; return 1; }
  addGauge(g);
  if (G.hero && G.hero.noCombo) return 1;          // Boran : jamais de combo, pas de série
  if (G.streak.name === g.name) G.streak.n++;
  else G.streak = { name: g.name, n: 1 };
  if (G.streak.n < comboLength()) return 1;
  return comboHit(g);
}

/**
 * Déclenche un combo du niveau g (série pleine, ou attaque du Grimoire ouvert). Renvoie son multiplicateur.
 * fromSuper : combo offert par la super, qui ne remplit pas la jauge.
 */
export function comboHit(g, fromSuper) {
  const cm = g.combo;
  G.streak = { name: null, n: 0 };
  G.combos++;
  addScore(D.grades.comboScore);
  const h = heroPos();
  pop(G.W / 2, G.H * 0.5, 'Combo ' + g.name, 'effet ×' + fmt(cm), g.col, 1.4, 30);
  addFx({ kind: 'burst', x: h.x, y: h.y, col: g.col, life: 0.8, r: 40 });
  vibrate([30, 40, 30]);
  sfx('combo');
  if (!fromSuper) addGauge(g, true);
  return cm;
}

export const streakTxt = () =>
  G.streak.n > 0 ? '. Série ' + G.streak.name + ' : ' + G.streak.n + '/' + comboLength() : '';
