// Reconnaissance des gestes, maison : rééchantillonnage, Douglas-Peucker pour
// compter les coins, régularité du rayon pour les ronds.
// Seuils repris tels quels du prototype v2. Ne pas les durcir sans accord :
// des seuils trop hauts ont rendu le jeu injouable au premier test.
import { clamp, dist } from '../util.js';
import { tr } from '../i18n.js';

export const TUNING = {
  tapMaxLen: 22, tapMaxMs: 450,   // en dessous : c'est un tap
  minSize: 45,                     // taille mini d'une forme (px)
  samples: 64,
  openGap: 0.55,                   // écart début/fin au-delà duquel la forme est "pas fermée"
  overdrawSweep: 330,              // balayage (°) qui compte comme fermé
  closureGap: 0.45,
  dpEps: 0.07,                     // tolérance Douglas-Peucker (× taille)
  loopClose: 0.25, mergeDist: 0.12, flatAngle: 145,
  circleCv: 0.45, circleSweepMin: 220, circleSweepRange: 90,
  triDev: 0.06, triMinAngle: 18, triSliverPenalty: 0.7,
  quadRoundDev: 0.012, quadRoundCv: 0.16, quadCirclePenalty: 0.92
};

function pathLen(p) { let d = 0; for (let i = 1; i < p.length; i++) d += dist(p[i - 1], p[i]); return d; }

function resample(pts, n) {
  const total = pathLen(pts);
  if (total === 0) return Array.from({ length: n }, () => ({ x: pts[0].x, y: pts[0].y }));
  const I = total / (n - 1);
  let D = 0;
  const p = pts.map(q => ({ x: q.x, y: q.y }));
  const out = [{ x: p[0].x, y: p[0].y }];
  for (let i = 1; i < p.length; i++) {
    const d = dist(p[i - 1], p[i]);
    if (d > 0 && D + d >= I) {
      const t = (I - D) / d;
      const q = { x: p[i - 1].x + t * (p[i].x - p[i - 1].x), y: p[i - 1].y + t * (p[i].y - p[i - 1].y) };
      out.push(q); p.splice(i, 0, q); D = 0;
    } else D += d;
  }
  while (out.length < n) out.push({ x: p[p.length - 1].x, y: p[p.length - 1].y });
  return out.slice(0, n);
}

function segDist(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  if (l2 === 0) return dist(p, a);
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function dp(pts, eps) {
  if (pts.length < 3) return pts.slice();
  let dmax = 0, idx = 0;
  const a = pts[0], b = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) { const d = segDist(pts[i], a, b); if (d > dmax) { dmax = d; idx = i; } }
  if (dmax > eps) {
    const l = dp(pts.slice(0, idx + 1), eps), r = dp(pts.slice(idx), eps);
    return l.slice(0, -1).concat(r);
  }
  return [a, b];
}

function angleAt(p, v, q) {
  const a1 = Math.atan2(p.y - v.y, p.x - v.x), a2 = Math.atan2(q.y - v.y, q.x - v.x);
  let d = Math.abs(a1 - a2) * 180 / Math.PI;
  if (d > 180) d = 360 - d;
  return d;
}

/**
 * Analyse un tracé brut.
 * Renvoie {type:'tap',x,y} | {type:'triangle'|'circle',acc} | {type:'fail',reason}
 */
export function analyze(raw, duration) {
  const T = TUNING;
  const len = pathLen(raw);
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const p of raw) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  const size = Math.max(maxX - minX, maxY - minY);
  if (len < T.tapMaxLen && duration < T.tapMaxMs) return { type: 'tap', x: raw[0].x, y: raw[0].y };
  if (size < T.minSize) return { type: 'fail', reason: tr('gestures.tooSmall') };

  const rs = resample(raw, T.samples);
  const c = { x: 0, y: 0 };
  for (const p of rs) { c.x += p.x; c.y += p.y; }
  c.x /= rs.length; c.y /= rs.length;
  const radii = rs.map(p => dist(p, c));
  const meanR = radii.reduce((a, b) => a + b, 0) / radii.length;
  const cvR = Math.sqrt(radii.reduce((a, r) => a + (r - meanR) * (r - meanR), 0) / radii.length) / meanR;
  const gap = dist(rs[0], rs[rs.length - 1]);
  let sweep = 0;
  for (let i = 1; i < rs.length; i++) {
    let d = Math.atan2(rs[i].y - c.y, rs[i].x - c.x) - Math.atan2(rs[i - 1].y - c.y, rs[i - 1].x - c.x);
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    sweep += d;
  }
  sweep = Math.abs(sweep) * 180 / Math.PI;
  const overdrawn = sweep >= T.overdrawSweep;
  if (gap > T.openGap * size && !overdrawn) return { type: 'fail', reason: tr('gestures.notClosed') };
  const closure = overdrawn ? 1 : clamp(1 - gap / (T.closureGap * size));

  // Coins
  const poly = dp(rs, T.dpEps * size);
  if (poly.length > 2 && dist(poly[0], poly[poly.length - 1]) < T.loopClose * size) poly.pop();
  let changed = true, guard = 0;
  while (changed && poly.length > 3 && guard++ < 50) {
    changed = false;
    for (let i = 0; i < poly.length; i++) {
      const n = poly.length, v = poly[i], q = poly[(i + 1) % n];
      if (dist(v, q) < T.mergeDist * size) {
        poly.splice(i, 2, { x: (v.x + q.x) / 2, y: (v.y + q.y) / 2 });
        if (i + 1 >= n) poly.splice(0, 1);
        changed = true; break;
      }
    }
    if (changed) continue;
    for (let i = 0; i < poly.length; i++) {
      const n = poly.length;
      if (angleAt(poly[(i - 1 + n) % n], poly[i], poly[(i + 1) % n]) > T.flatAngle) { poly.splice(i, 1); changed = true; break; }
    }
  }
  const corners = poly.length;

  const circleAcc = () => {
    const round = clamp(1 - cvR / T.circleCv), sw = clamp((sweep - T.circleSweepMin) / T.circleSweepRange);
    return 100 * (0.6 * round + 0.2 * closure + 0.2 * sw);
  };
  const polyDev = k => {
    let per = 0, dev = 0;
    for (let i = 0; i < k; i++) per += dist(poly[i], poly[(i + 1) % k]);
    for (const p of rs) { let m = 1e9; for (let i = 0; i < k; i++) m = Math.min(m, segDist(p, poly[i], poly[(i + 1) % k])); dev += m; }
    return (dev / rs.length) / per;
  };

  if (corners === 3) {
    const straight = clamp(1 - polyDev(3) / T.triDev);
    let minAng = 180;
    for (let i = 0; i < 3; i++) minAng = Math.min(minAng, angleAt(poly[(i + 2) % 3], poly[i], poly[(i + 1) % 3]));
    const shape = minAng < T.triMinAngle ? T.triSliverPenalty : 1;
    return { type: 'triangle', acc: Math.round(100 * (0.65 * straight + 0.35 * closure) * shape), poly };
  }
  if (corners >= 5) return { type: 'circle', acc: Math.round(circleAcc()), c, r: meanR };
  if (corners === 4) {
    if (polyDev(4) > T.quadRoundDev && cvR < T.quadRoundCv) return { type: 'circle', acc: Math.round(circleAcc() * T.quadCirclePenalty), c, r: meanR };
    return { type: 'fail', reason: tr('gestures.fourCorners') };
  }
  return { type: 'fail', reason: tr('gestures.unknown') };
}

/**
 * Branche les événements tactiles sur le canvas.
 * onDraw(tracé en cours | null) sert à l'affichage ; onGesture(résultat, points) à la logique.
 */
export function attachInput(cv, { isActive, onDraw, onGesture }) {
  let drawing = null;
  const ptsFrom = e => {
    const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    return (list.length ? list : [e]).map(q => ({ x: q.clientX, y: q.clientY }));
  };
  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!isActive() || drawing) return;
    drawing = { id: e.pointerId, pts: [{ x: e.clientX, y: e.clientY }], t0: performance.now() };
    onDraw(drawing);
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  }, { passive: false });
  cv.addEventListener('pointermove', e => {
    if (!drawing || e.pointerId !== drawing.id) return;
    e.preventDefault();
    for (const p of ptsFrom(e)) drawing.pts.push(p);
  }, { passive: false });
  const finish = e => {
    if (!drawing || e.pointerId !== drawing.id) return;
    const d = drawing;
    drawing = null;
    onDraw(null);
    onGesture(analyze(d.pts, performance.now() - d.t0), d.pts);
  };
  cv.addEventListener('pointerup', finish);
  cv.addEventListener('pointercancel', finish);
  // Bloque le défilement natif seulement pendant une partie ou l'entraînement : le lobby doit défiler.
  document.addEventListener('touchmove', e => { if (isActive()) e.preventDefault(); }, { passive: false });
}
