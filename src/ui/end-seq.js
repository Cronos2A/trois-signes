// Séquences de fin de partie (data/fin_de_partie.json, textes : data/i18n → end.*). Un seul composant, deux variantes :
//  - défaite (Voyage, Histoire, Duel) : ralenti avec léger zoom sur le héros, le héros explose en facettes (son ennemi_vaincu,
//    vibration), puis le panneau « DÉFAITE » ;
//  - victoire (combat d'Histoire, Duel gagné) : court ralenti, éclair doré, sauts du héros, pluie de facettes dorées (son victoire),
//    puis le panneau « VICTOIRE » ; égalité en Duel : même panneau, « ÉGALITÉ ».
// Le résultat est toujours enregistré AVANT (main.js → endGame, game/duel.js → finish) ; ce module n'est que l'image et le son.
// Effets dessinés sur le canvas du combat par ui/hud.js (heroFx, drawEndFx) ; le ralenti est appliqué par main.js (timeScale).
import { D } from '../data.js';
import { G } from '../game/state.js';
import { sfx, music } from '../audio/audio.js';
import { vibrate } from '../game/effects.js';
import { tr } from '../i18n.js';

const F = () => D.fin_de_partie;
const INK = '#15301E';
const E = { slow: null, parts: [], gone: false, swell: 0, swellT: 0, jump: null, flash: 0, flashMax: 1 };
let frameAvg = 16, panelEl = null, panelDone = null, timers = [];

const rnd = (a, b) => a + Math.random() * (b - a);
const wait = s => new Promise(r => timers.push(setTimeout(r, s * 1000)));

/** Durée d'une image (ms), pour réduire les facettes si l'appareil peine (data/fin_de_partie.json → particles). */
export function noteFrame(ms) { frameAvg = frameAvg * 0.95 + Math.min(ms, 100) * 0.05; }
export const particleBudget = () => (frameAvg > F().particles.slowFrameMs ? F().particles.low : F().particles.max);
/** Tests : durée moyenne d'une image et nombre de facettes en vol. */
export const endStats = () => ({ frameAvg, budget: particleBudget(), parts: E.parts.length });

/* ---------- Ralenti ---------- */
/** Ralenti : le temps du jeu descend à slowScale en slowIn s, tient slowHold s, revient en slowOut s. */
function slowmo(c) { E.slow = { s: c.slowScale, i: c.slowIn, h: c.slowHold, o: c.slowOut, t: 0 }; }
/** Multiplicateur du temps du jeu pour cette image (1 hors ralenti). */
export function timeScale() {
  const w = E.slow;
  if (!w) return 1;
  if (w.t < w.i) return 1 - (1 - w.s) * w.t / w.i;
  if (w.t < w.i + w.h) return w.s;
  if (w.t < w.i + w.h + w.o) return w.s + (1 - w.s) * (w.t - w.i - w.h) / w.o;
  return 1;
}
/** Ralenti sur la dernière mort d'ennemi d'un combat d'Histoire (son éclatement habituel continue). */
export function lastKillSlow() { slowmo(F().victory); }

/* ---------- Zoom (les deux canvas du combat) ---------- */
function zoom(z, sec, at) {
  for (const id of ['bg', 'c']) {
    const c = document.getElementById(id);
    if (!c) continue;
    if (at) c.style.transformOrigin = Math.round(at.x) + 'px ' + Math.round(at.y) + 'px';
    c.style.transition = 'transform ' + sec + 's ease-out';
    c.style.transform = z === 1 ? '' : 'scale(' + z + ')';
  }
}

/* ---------- Mise à jour et dessin (appelés par main.js et ui/hud.js) ---------- */
/** Chaque image, en temps réel. */
export function updateEnd(dt) {
  if (E.slow && (E.slow.t += dt) > E.slow.i + E.slow.h + E.slow.o) E.slow = null;
  if (E.swellT > 0) E.swell = Math.min(1, E.swell + dt / E.swellT);
  if (E.jump) E.jump.t += dt;
  E.flash = Math.max(0, E.flash - dt);
  const P = F().particles;
  for (const p of E.parts) {
    p.t += dt;
    if (p.t < 0) continue;                                   // pluie : facette pas encore tombée
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.rain ? P.rainGravity : P.gravity) * dt; p.rot += p.vr * dt;
  }
  E.parts = E.parts.filter(p => p.t < p.life);
}

/** Héros pendant la séquence : { gone (explosé), swell (gonfle avant d'éclater, 0 à 1), dy (saut, en unités d'écran) }. */
export function heroFx() {
  let dy = 0;
  const j = E.jump;
  if (j) {
    const c = F().victory, n = Math.floor(j.t / c.jumpTime);
    if (n < c.jumps) dy = -Math.sin(Math.PI * (j.t / c.jumpTime - n)) * c.jumpHeight * (n ? 0.7 : 1);
  }
  return { gone: E.gone, swell: E.swell * F().defeat.swell, dy };
}

/** Facettes et éclair doré, par-dessus le combat. k : échelle de l'écran. */
export function drawEndFx(ctx, k, W, H) {
  for (const p of E.parts) {
    if (p.t < 0) continue;
    const r = p.s * k, a = Math.max(0, Math.min(1, (p.life - p.t) / 0.35));
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.95, r * 0.65); ctx.lineTo(-r * 0.8, r * 0.75); ctx.closePath();
    ctx.fillStyle = p.col; ctx.fill();
    ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
  }
  if (E.flash > 0) {
    ctx.globalAlpha = F().victory.flashAlpha * E.flash / E.flashMax;
    ctx.fillStyle = '#FFD23F'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

/* ---------- Séquences ---------- */
/** Tout remettre à zéro (début ou fin d'une partie). */
export function resetEnd() {
  timers.forEach(clearTimeout); timers = [];
  Object.assign(E, { slow: null, parts: [], gone: false, swell: 0, swellT: 0, jump: null, flash: 0 });
  zoom(1, 0);
  hidePanel();
}

/**
 * Défaite : ralenti et zoom sur le héros, puis il explose (≤ 30 facettes à ses couleurs, son ennemi_vaincu, vibration).
 * at : centre du héros à l'écran ; cols : ses couleurs. Résolue panelAfter s après l'explosion.
 */
export async function koFx(at, cols) {
  const C = F().defeat, P = F().particles;
  slowmo(C);
  zoom(C.zoom, C.slowIn, at);
  await wait(Math.max(0, C.slowIn + C.slowHold - C.swellTime));
  E.swellT = C.swellTime;
  await wait(C.swellTime);
  E.gone = true; E.swellT = 0; E.swell = 0;
  const pal = [...cols.filter(Boolean), ...P.heroColors], n = particleBudget();
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.7, v = rnd(...P.explodeSpeed);
    E.parts.push({ x: at.x + rnd(-18, 18), y: at.y + rnd(-40, 40), vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: rnd(0, 6), vr: rnd(-12, 12),
      s: rnd(...P.size), col: pal[i % pal.length], t: 0, life: rnd(...P.explodeLife) });
  }
  sfx('ennemi_vaincu');
  vibrate(C.vibrate);
  zoom(1, C.slowOut);
  await wait(C.panelAfter);
}

/** Victoire : (ralenti si slow) éclair doré, sauts du héros, pluie de facettes dorées, son victoire. */
export async function victoryFx(slow = false) {
  const C = F().victory, P = F().particles;
  if (slow) { slowmo(C); await wait(C.slowIn + C.slowHold + C.slowOut); }
  E.flash = E.flashMax = C.flash;
  E.jump = { t: 0 };
  sfx('victoire');
  const n = particleBudget(), W = G.W || innerWidth;
  for (let i = 0; i < n; i++) {
    E.parts.push({ x: rnd(10, W - 10), y: rnd(-30, -10), vx: rnd(-40, 40), vy: rnd(60, 160), rot: rnd(0, 6), vr: rnd(-6, 6), rain: true,
      s: rnd(...P.size) * 0.75, col: P.rainColors[i % P.rainColors.length], t: -rnd(0, C.rainTime), life: rnd(...P.rainLife) });
  }
  await wait(C.panelAfter);
}

/* ---------- Panneau ---------- */
const TXT = { defeat: ['end.defeat', 'end.defeatSub'], victory: ['end.victory', 'end.victorySub'], tie: ['end.tie', 'end.tieSub'] };

/** Panneau ouvert ? (le bouton Retour vaut alors « Continuer », une fois le délai passé). */
export const panelOpen = () => !!panelEl;
/** Bouton Retour : « Continuer » s'il est déjà proposé. */
export function panelBack() { const b = panelEl && panelEl.querySelector('.es-go:not(.hidden)'); if (b) b.click(); }

function hidePanel() { if (panelEl) { panelEl.remove(); panelEl = null; } if (panelDone) { const d = panelDone; panelDone = null; d(); } }

/**
 * Panneau de fin : il descend du haut, rebondit deux fois et se pose (son defaite pour la défaite) ; « Continuer » après
 * continueDelay s, ou un tap n'importe où. kind : 'defeat' | 'victory' | 'tie'. Résolue sur « Continuer ».
 */
export function endPanel(kind) {
  hidePanel();
  const C = F().panel, [t, s] = TXT[kind] || TXT.defeat;
  if (C.musicFade) music(null);                                    // la musique du combat baisse en fondu
  const el = panelEl = document.createElement('div');
  el.id = 'endSeq';
  el.className = 'es-layer es-' + kind;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = `<div class="res-card es-panel" style="animation-duration:${C.drop}s">
      <div class="es-title ol ol-5" role="heading" aria-level="1">${tr(t)}</div>
      <div class="es-sub">${tr(s)}</div>
      <button class="res-again es-go hidden"><span class="ol ol-4">${tr('end.continue')}</span></button>
    </div>`;
  document.body.appendChild(el);
  fit(el.querySelector('.es-title'));
  timers.push(setTimeout(() => { if (kind === 'defeat') sfx('defaite'); else if (kind === 'tie') sfx('victoire'); }, C.drop * C.land * 1000));
  return new Promise(res => {
    panelDone = res;
    let ready = false;
    timers.push(setTimeout(() => { ready = true; const b = el.querySelector('.es-go'); b.classList.remove('hidden'); b.focus({ preventScroll: true }); }, C.continueDelay * 1000));
    el.addEventListener('click', () => { if (!ready || panelEl !== el) return; sfx('ui_clic'); hidePanel(); });
  });
}

/** Titre trop large (allemand, 360 px) : la police rétrécit jusqu'à tenir sur une ligne. */
function fit(t) {
  let size = parseFloat(getComputedStyle(t).fontSize) || 56;
  while (t.scrollWidth > t.clientWidth + 1 && size > 22) { size -= 2; t.style.fontSize = size + 'px'; }
}
