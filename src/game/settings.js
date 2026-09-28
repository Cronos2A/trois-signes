// Réglages du joueur (lobby → engrenage), sauvegardés localement : volumes, vibrations, tolérance des gestes.
import { store } from './progress.js';

const KEY = 'ts_settings';
export const settings = { music: 1, sfx: 1, vibrate: true, tolerance: 'normale', ...store.get(KEY, {}) };
const listeners = [];

/** Change un réglage, le sauvegarde et prévient les modules concernés (audio). */
export function setSetting(k, v) {
  settings[k] = v;
  store.set(KEY, settings);
  for (const f of listeners) f(k, v);
}
export const onSettings = f => listeners.push(f);
