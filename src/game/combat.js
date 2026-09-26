// Attaque, esquive, ramassage, coups ennemis.
import { D } from '../data.js';
import { G, heroPos } from './state.js';
import { clamp, dist, rand, fmt } from '../util.js';
import { gradeOf, registerGrade, streakTxt } from './grades.js';
import { pop, showGrade, addFx, vibrate, trainInfo } from './effects.js';

const round1 = v => Math.round(v * 10) / 10;

function pickTarget() {
  const alive = G.enemies.filter(e => e.hp > 0 && e.state !== 'walk');
  if (!alive.length) return null;
  const w = alive.find(e => e.state === 'windup');
  if (w) return w;
  const h = heroPos();
  return alive.sort((a, b) => dist(a, h) - dist(b, h))[0];
}

function doAttack(g, cm) {
  const e = pickTarget(), h = heroPos();
  const dmg = round1(G.hero.atk * g.mult * G.atkMult * cm);
  G.score += g.bonus;
  if (!e) { pop(h.x, h.y - 70, 'Aucune cible', '', g.col, 0.9, 18); return; }
  hitEnemy(e, dmg, g.col);
}

function dodgeShare(g, cm) { return Math.min(1, D.rules.dodge.base * g.mult * cm); }

function doDodge(g, cm) {
  G.hero.shieldUntil = G.time + D.rules.dodge.shieldDuration;
  G.hero.shieldAvoid = dodgeShare(g, cm);
  addFx({ kind: 'ring', col: '#3FD7C4', life: 0.75 });
  // Esquive en combo : riposte
  if (cm > 1 && G.mode === 'play') {
    const e = pickTarget();
    if (e) hitEnemy(e, round1(G.hero.atk * G.atkMult * cm), g.col);
  }
}

function tryPickup(x, y) {
  const P = D.rules.pickup;
  let best = null, bd = 1e9;
  for (const l of G.loots) { const d = Math.hypot(l.x - x, l.y - y); if (d < bd) { bd = d; best = l; } }
  if (!best || bd > P.radius) return false;
  const acc = Math.round(clamp(100 - bd * P.accuracyLossPerPx, 0, 100));
  const g = gradeOf(acc);
  const cm = registerGrade(g);
  showGrade(g, acc, 'Ramassage');
  if (!g) { best.life = Math.min(best.life, P.missLifeCap); return true; }
  G.loots.splice(G.loots.indexOf(best), 1);
  if (best.type === 'coin') {
    const v = Math.round(P.coinValue * g.mult * cm);
    G.score += v + g.bonus;
    pop(best.x, best.y - 20, '+' + v, 'points', g.col, 0.9, 22);
  } else {
    const v = Math.round(P.heartHeal * g.mult * cm);
    G.hero.hp = Math.min(G.hero.max, G.hero.hp + v);
    pop(best.x, best.y - 20, '+' + v + ' PV', '', g.col, 0.9, 22);
  }
  if (G.mode === 'train') trainInfo('Ramassage ' + g.name + (cm > 1 ? ' en combo ×' + fmt(cm) : '') + streakTxt());
  return true;
}

function hitEnemy(e, dmg, col) {
  const h = heroPos();
  e.hp -= dmg; e.hit = 0.25;
  addFx({ kind: 'slash', x1: h.x, y1: h.y - 20, x2: e.x, y2: e.y, col, life: 0.35 });
  pop(e.x, e.y - e.T.r - 14, '-' + dmg, '', col, 0.9, 24);
  G.score += Math.round(dmg * D.rules.score.perDamage);
  if (e.hp > 0) return;
  G.score += e.T.pts;
  addFx({ kind: 'burst', x: e.x, y: e.y, col: e.T.col, life: 0.6, r: e.T.r });
  const L = e.T.loot, n = L.count;
  for (let i = 0; i < n; i++) {
    const heart = i < L.hearts || Math.random() < L.heartChance;
    G.loots.push({
      x: clamp(e.x + rand(-60, 60) * (n > 1 ? 1 : 0.3), 40, G.W - 40), y: e.y + rand(20, 70),
      type: heart ? 'heart' : 'coin', life: D.rules.pickup.lootLife, t: 0
    });
  }
}

/** Un ennemi porte son coup sur le héros. */
export function strike(e) {
  const h = heroPos();
  const avoid = G.time < G.hero.shieldUntil ? G.hero.shieldAvoid : 0;
  const taken = Math.round(e.T.dmg * (1 - avoid));
  addFx({ kind: 'bolt', x1: e.x, y1: e.y, x2: h.x, y2: h.y, col: '#FF5D73', life: 0.25 });
  if (avoid > 0) pop(h.x, h.y - 80, 'Esquive ' + Math.round(avoid * 100) + ' %', avoid >= 1 ? 'aucun dégât' : '', '#3FD7C4', 1, 20);
  if (avoid >= 1) G.score += D.rules.dodge.perfectScore;
  if (taken > 0) {
    G.hero.hp = Math.max(0, G.hero.hp - taken);
    G.hero.flash = 1; G.shake = 0.5;
    pop(h.x + 40, h.y - 40, '-' + taken, '', '#FF5D73', 0.9, 26);
    vibrate(60);
  }
}

/** Point d'entrée : un geste reconnu par input/gestures.js. */
export function handleGesture(res) {
  const h = heroPos();
  const train = G.mode === 'train';
  if (res.type === 'tap') {
    const ok = tryPickup(res.x, res.y);
    if (!ok && train) trainInfo('Tap sans objet : tapez sur une pièce ou un cœur.');
    return;
  }
  if (res.type === 'fail') {
    registerGrade(null);
    showGrade(null, null, res.reason);
    if (train) trainInfo(res.reason + '. Série remise à zéro.');
    return;
  }
  const g = gradeOf(res.acc);
  const cm = registerGrade(g);
  const label = res.type === 'triangle' ? 'Attaque' : 'Esquive';
  showGrade(g, res.acc, label);
  if (!g) {
    if (train) trainInfo(label + ' ratée : précision ' + res.acc + ' % (' + D.grades.levels[D.grades.levels.length - 1].min + ' % minimum). Série remise à zéro.');
    return;
  }
  if (res.type === 'triangle') {
    if (G.mode === 'play') doAttack(g, cm);
    else addFx({ kind: 'slash', x1: h.x, y1: h.y - 20, x2: h.x, y2: h.y - 200, col: g.col, life: 0.35 });
    if (train) trainInfo('Attaque ' + g.name + ' : ' + fmt(round1(G.hero.atk * g.mult * cm)) + ' dégâts' + (cm > 1 ? ' (combo ×' + fmt(cm) + ')' : '') + streakTxt());
  } else {
    doDodge(g, cm);
    if (train) trainInfo('Esquive ' + g.name + ' : ' + Math.round(dodgeShare(g, cm) * 100) + ' % des dégâts évités' + (cm > 1 ? ' + riposte (combo)' : '') + streakTxt());
  }
}
