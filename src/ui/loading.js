// Écran de chargement d'un démarrage à froid (balisage #loading dans index.html, styles ui/loading.css, réglages data/chargement.json).
// Affiché dès le premier dessin de la page, avant tout script ; jamais au retour de l'arrière-plan (la page n'est pas rechargée).
// Pendant au moins minSeconds, le jeu précharge vraiment ce qui est lourd (polices, images du lobby, sons essentiels, sprites du combat) ;
// au plus maxSeconds après l'ouverture de la page, le lobby apparaît quoi qu'il arrive (réseau lent ou absent), en fondu de fadeMs.
// Le même écran sert aux transitions (loadingTransition : sortie d'une partie vers le lobby, lancement de l'Entraînement) :
// la musique en cours s'éteint d'abord en fondu, puis l'écran suivant se prépare dessous (data/chargement.json → transition).
import { D } from '../data.js';
import { tr } from '../i18n.js';
import { fadeOutMusic } from '../audio/audio.js';

const L = () => D.chargement || {};
const el = () => document.getElementById('loading');
let shown = 0, done = false, busy = false;

/** Barre de progression (0 à 1) ; elle ne recule jamais. */
export function loadingProgress(p) {
  const e = el(), bar = document.getElementById('ldBar');
  if (!e || done) return;
  shown = Math.max(shown, Math.min(1, p));
  bar.style.transform = 'scaleX(' + Math.max(0.04, shown).toFixed(3) + ')';
  e.setAttribute('aria-valuenow', String(Math.round(shown * 100)));
}

/** Une astuce tirée au hasard (data/chargement.json → tipKeys), dès que les textes sont chargés. */
export function loadingTip() {
  const t = document.getElementById('ldTip'), keys = L().tipKeys || [];
  if (!t || !keys.length) return;
  t.innerHTML = '<small></small><span></span>';
  t.firstChild.textContent = tr('loading.tip');
  t.lastChild.textContent = tr(keys[Math.floor(Math.random() * keys.length)]);
  t.classList.add('on');
}

/** Titre « Three Signs » montré une fois sa police prête (pas de changement de police à l'écran). */
export function loadingFonts() {
  const e = el(), f = document.fonts;
  if (!e) return;
  const show = () => e.classList.add('fonts');
  if (!f) return show();
  f.load('400 34px Caprasimo').then(show, show);
  setTimeout(show, 800);
}

const wait = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));
/** Une promesse qui ne rejette jamais. */
const safe = p => Promise.resolve(p).then(() => {}, () => {});

/**
 * Attend que tâches (promesses) soient finies et que minSeconds soient passées depuis l'ouverture de la page, au plus maxSeconds ;
 * la barre avance avec les tâches de from à to. Puis fondu vers ce qui est dessous (le lobby). Résolue quand l'écran a disparu.
 */
export async function finishLoading(tasks, from = 0, to = 1) {
  await loadingReady(tasks, from, to);
  await loadingFade();
}

/** Première moitié de finishLoading : tâches finies et durée minimale passée, barre pleine. L'écran reste affiché. */
export async function loadingReady(tasks, from = 0, to = 1) {
  const e = el();
  if (!e || done) return;
  const C = L(), list = tasks.filter(Boolean).map(safe);
  let n = 0;
  for (const t of list) t.then(() => loadingProgress(from + (to - from) * (++n / list.length)));
  if (!list.length) loadingProgress(to);
  const now = performance.now(), min = (C.minSeconds ?? 2.2) * 1000, max = (C.maxSeconds ?? 6) * 1000;
  await Promise.race([Promise.all([Promise.all(list), wait(min - now)]), wait(max - now)]);
  loadingProgress(1);
}

/** Fondu vers ce qui est dessous (ms : durée), puis l'écran est rangé (gardé pour les transitions). */
export async function loadingFade(ms = L().fadeMs ?? 300) {
  const e = el();
  if (!e || done) return;
  await wait(200);                                          // la barre pleine se voit un instant
  done = true;
  e.classList.add('out');
  e.style.transitionDuration = ms + 'ms';
  await wait(ms);
  e.classList.add('off');
}

/** Une transition est en cours (boutons et bouton Retour sans effet). */
export const transitioning = () => busy;

/**
 * Transition par l'écran de chargement : il couvre tout aussitôt (plus aucun appui possible), la musique en cours s'éteint
 * en fondu (musicFadeMs) et on attend qu'elle soit vraiment arrêtée ; puis work() prépare l'écran suivant dessous (et lance
 * sa musique) ; l'écran reste au moins minSeconds, puis fondu. Les effets sonores ne sont pas touchés.
 * Une seule à la fois : un second appel pendant une transition est ignoré (renvoie false).
 */
export async function loadingTransition(work) {
  const e = el();
  if (busy || (e && !done)) return false;
  busy = true;
  const T = L().transition || {}, t0 = performance.now();
  if (e) {
    const bar = document.getElementById('ldBar');
    bar.style.transition = 'none';
    shown = 0; done = false;
    loadingProgress(0);
    void bar.offsetWidth;
    bar.style.transition = '';
    e.style.transitionDuration = '0ms';
    e.classList.remove('off', 'out');
    e.classList.add('fonts');
    loadingTip();
  }
  try {
    await fadeOutMusic(T.musicFadeMs ?? 600);
    loadingProgress(0.5);
    await work();
  } catch (err) { console.error(err); }
  loadingProgress(0.85);
  await wait((T.minSeconds ?? 1.2) * 1000 - (performance.now() - t0));
  loadingProgress(1);
  await loadingFade(T.fadeMs ?? 250);
  busy = false;
  return true;
}

/** Échec du chargement des données : l'écran s'efface pour laisser voir le message d'erreur. */
export function dropLoading() { done = true; const e = el(); if (e) e.remove(); }

/** Écran encore affiché (démarrage ou transition) ? */
export const loadingOn = () => !!el() && !done;
