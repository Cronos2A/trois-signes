// Réglages du joueur (lobby → engrenage), sauvegardés localement : volumes, vibrations.
// Pas de réglage de tolérance des gestes : tout le monde joue avec les mêmes seuils (équité, futur Duel).
import { store } from './progress.js';

const KEY = 'ts_settings';
const DEFAULTS = { music: 1, sfx: 1, vibrate: true };
const saved = store.get(KEY, {}) || {};
/** Seuls les réglages connus sont repris : une ancienne valeur (ex. tolérance « Large ») est ignorée. */
export const settings = Object.fromEntries(Object.keys(DEFAULTS).map(k => [k, k in saved ? saved[k] : DEFAULTS[k]]));
if (Object.keys(saved).some(k => !(k in DEFAULTS))) store.set(KEY, settings);
const listeners = [];

/** Change un réglage, le sauvegarde et prévient les modules concernés (audio). */
export function setSetting(k, v) {
  settings[k] = v;
  store.set(KEY, settings);
  for (const f of listeners) f(k, v);
}
export const onSettings = f => listeners.push(f);
