// Effets visuels et retours : la logique pousse des descriptions, ui/hud.js les dessine.
import { D } from '../data.js';
import { G } from './state.js';
import { settings } from './settings.js';
import { nativeVibrate } from '../native.js';

export function pop(x, y, text, sub, col, life, size) {
  G.pops.push({ x, y, text, sub: sub || '', col, t: 0, life: life || 1, size: size || 22 });
}
export function showGrade(g, acc, label, kind = null) {   // kind : 'triangle' | 'circle' | 'tap' (icône de la pastille)
  const miss = D.grades.miss;
  G.bigGrade = { text: g ? g.name : miss.name, col: g ? g.col : miss.col, acc, label, kind, t: 0 };
}
/** Nom de la super en gros au centre, à la couleur du personnage. */
export function superBanner(name, col) { G.superBanner = { name, col, t: 0 }; }
export function addFx(f) { G.fx.push({ t: 0, ...f }); }
/** Vibration (option des Réglages) : Haptics dans l'application Android, navigator.vibrate sur le web. */
export function vibrate(pattern) { if (!settings.vibrate || nativeVibrate(pattern)) return; if (navigator.vibrate) try { navigator.vibrate(pattern); } catch (_) {} }
export function trainInfo(text) { G.trainMsg = text; }
