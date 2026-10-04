// Cycle de vie de l'application : premier plan / arrière-plan, d'une seule source pour tout le jeu.
// Web : visibilitychange (onglet caché, écran verrouillé). Application Android : en plus, l'évènement appStateChange du module
// Capacitor App (src/native.js → nativeActive), car la WebView ne signale pas toujours la mise en arrière-plan.
// Utilisé par le Duel (règle d'absence de 30 s, src/game/duel.js) et la musique (src/audio/audio.js).
const subs = new Set();
let hidden = document.visibilityState === 'hidden', nativeHidden = false;

function update() {
  const h = document.visibilityState === 'hidden' || nativeHidden;
  if (h === hidden) return;
  hidden = h;
  subs.forEach(f => { try { f(h ? 'hidden' : 'visible'); } catch (e) { console.warn('Cycle de vie :', e); } });
}
document.addEventListener('visibilitychange', update);

/** fn('hidden' | 'visible') à chaque passage en arrière-plan / retour. Renvoie de quoi se désabonner. */
export const onLifecycle = fn => { subs.add(fn); return () => subs.delete(fn); };
/** L'application est-elle en arrière-plan (ou l'écran verrouillé) ? */
export const appHidden = () => hidden;
/** Application native : premier plan (true) ou arrière-plan (false). */
export function nativeActive(active) { nativeHidden = !active; update(); }
