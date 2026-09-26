// Animations purement visuelles, déduites de l'état du jeu à chaque image.
// Elles ne font que des transformations sur les sprites (déplacement, échelle, rotation, teinte)
// et n'écrivent jamais dans G : la logique de jeu reste celle de game/.
import { G } from '../game/state.js';

// Palette des éclats de facettes quand un ennemi est vaincu (couleurs des sprites).
const SHARDS = {
  sbire: ['#4B3F5C', '#625476', '#EADFC8', '#FFD23F'],
  brute: ['#46534B', '#5D6B60', '#EADFC8', '#FF5A3C'],
  boss: ['#3B2C4A', '#55406A', '#FFD23F', '#FF5A3C']
};

export const A = {
  t: 0,
  hero: null,          // { kind: 'attack' | 'dodge', t, dur, tx, ty, dir }
  dodgeDir: 1,
  lunge: new WeakMap(), // ennemi -> temps écoulé depuis son coup
  dying: [],            // ennemis vaincus en train de disparaître
  shards: [],
  combo: null           // { cm, t } : série pleine affichée en bas
};

const seen = new WeakSet();
let prevEnemies = [], lastCombos = 0, lastStreak = null;

export function resetAnims() {
  Object.assign(A, { hero: null, lunge: new WeakMap(), dying: [], shards: [], combo: null });
  prevEnemies = []; lastCombos = G.combos; lastStreak = null;
}

/** foot(e) : position à l'écran des pieds de l'ennemi (fournie par le rendu). */
export function updateAnims(dt, foot, gradeByName) {
  A.t += dt;

  // Nouveaux effets poussés par la logique : on en tire les gestes du héros.
  for (const f of G.fx) {
    if (seen.has(f)) continue;
    seen.add(f);
    if (f.kind === 'slash') A.hero = { kind: 'attack', t: 0, dur: 0.5, tx: f.x2, ty: f.y2 };
    else if (f.kind === 'ring') {
      const w = G.enemies.find(e => e.state === 'windup');
      A.dodgeDir = w ? (w.x > G.W / 2 ? -1 : 1) : -A.dodgeDir;
      A.hero = { kind: 'dodge', t: 0, dur: 0.5, dir: A.dodgeDir };
    } else if (f.kind === 'bolt') {
      let best = null, bd = 1e9;
      for (const e of G.enemies) { const d = Math.hypot(e.x - f.x1, e.y - f.y1); if (d < bd) { bd = d; best = e; } }
      if (best) A.lunge.set(best, 0);
    }
  }
  if (A.hero && (A.hero.t += dt) >= A.hero.dur) A.hero = null;

  // Ennemis qui viennent de tomber : ils rétrécissent et éclatent en facettes.
  for (const e of prevEnemies) {
    if (e.hp > 0 || G.enemies.includes(e)) continue;
    const p = foot(e), sprite = e.T.sprite;
    A.dying.push({ sprite, x: p.x, y: p.y, t: 0 });
    const pal = SHARDS[sprite] || SHARDS.sbire, n = sprite === 'boss' ? 16 : 10;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4, v = 140 + Math.random() * 220;
      A.shards.push({
        x: p.x + (Math.random() - 0.5) * 30, y: p.y - p.h * (0.3 + Math.random() * 0.4),
        vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14,
        s: 7 + Math.random() * 9, col: pal[i % pal.length], t: 0, life: 0.7 + Math.random() * 0.3
      });
    }
  }
  prevEnemies = G.enemies.slice();
  for (const d of A.dying) d.t += dt;
  A.dying = A.dying.filter(d => d.t < 0.4);
  for (const s of A.shards) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 900 * dt; s.rot += s.vr * dt; }
  A.shards = A.shards.filter(s => s.t < s.life);

  for (const e of G.enemies) {
    const l = A.lunge.get(e);
    if (l !== undefined) { if (l + dt > 0.3) A.lunge.delete(e); else A.lunge.set(e, l + dt); }
  }

  // Série pleine (combo) : on garde le multiplicateur quelques instants pour la pastille du bas.
  if (G.combos > lastCombos) {
    const g = lastStreak && gradeByName(lastStreak);
    A.combo = { cm: g ? g.combo : null, t: 0 };
  }
  lastCombos = G.combos;
  if (G.streak.n > 0) lastStreak = G.streak.name;
  if (A.combo && (A.combo.t += dt) > 1.3) A.combo = null;
}

const easeIn = p => p * p;
const easeOut = p => 1 - (1 - p) * (1 - p);
const easeInOut = p => p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);

/**
 * Transformation du héros pour cette image : { dx, dy, rot, sx, sy, shake, red, arm, swing }.
 * arm : rotation du bras armé autour de l'épaule ; swing : avancement de la traînée de lame (0 = aucune).
 * home : position des pieds au repos ; k : échelle de l'écran.
 */
export function heroPose(home, k) {
  const bob = (1 - Math.cos(A.t * 5)) / 2;                  // attente : léger rebond continu
  const P = { dx: 0, dy: -bob * 4 * k, rot: 0, sx: 1 + 0.02 * (1 - bob), sy: 1 - 0.02 * (1 - bob) + 0.02 * bob, arm: 0, swing: 0 };
  const a = A.hero;
  if (a && a.kind === 'attack') {                           // attaque : ruée, coup d'arme, retour
    const p = a.t / a.dur;
    const go = p < 0.35 ? easeOut(p / 0.35) : p < 0.62 ? 1 : 1 - easeInOut((p - 0.62) / 0.38);
    const vx = a.tx - home.x, vy = a.ty - home.y, d = Math.hypot(vx, vy) || 1;
    const reach = Math.min(d * 0.7, 250 * k);
    P.dx += vx / d * reach * go;
    P.dy += vy / d * reach * go - Math.sin(Math.PI * Math.min(1, p / 0.62)) * 22 * k;
    // Bras armé : armé en arrière pendant la ruée, frappe rapide à l'arrivée, puis retour.
    P.arm = p < 0.3 ? -0.8 * easeOut(p / 0.3)
      : p < 0.46 ? -0.8 + 2.5 * easeIn((p - 0.3) / 0.16)
      : 1.7 * (1 - easeInOut(Math.min(1, (p - 0.46) / 0.4)));
    P.swing = p >= 0.3 && p < 0.66 ? (p - 0.3) / 0.36 : 0;
    const lean = p >= 0.3 && p < 0.62 ? Math.sin(Math.PI * (p - 0.3) / 0.32) : 0;
    P.rot = (vx / d) * 0.12 * go + 0.1 * lean;
    P.sx *= 1 - 0.06 * go; P.sy *= 1 + 0.08 * go - 0.06 * lean;
  } else if (a && a.kind === 'dodge') {                     // esquive : glissement latéral
    const p = a.t / a.dur, go = p < 0.3 ? easeOut(p / 0.3) : 1 - easeInOut((p - 0.3) / 0.7);
    P.dx += a.dir * 70 * k * go;
    P.rot = a.dir * 0.16 * go;
    P.sx *= 1 + 0.06 * go; P.sy *= 1 - 0.06 * go;
  }
  const f = G.hero ? G.hero.flash : 0;                       // coup reçu : secousse et flash rouge
  P.shake = f > 0 ? Math.sin(A.t * 70) * 9 * k * f : 0;
  P.red = f * 0.8;
  return P;
}
