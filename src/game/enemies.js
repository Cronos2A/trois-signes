// Vagues, IA ennemie, boss.
import { D } from '../data.js';
import { G } from './state.js';
import { rand } from '../util.js';
import { pop } from './effects.js';
import { strike } from './combat.js';

export function spawnWave(i) {
  const W = D.waves, wave = W.waves[i], list = wave.enemies;
  list.forEach((type, k) => {
    const T = D.enemies[type];
    const sx = T.centered ? 0.5 : (k + 1) / (list.length + 1);
    G.enemies.push({
      type, T, hp: T.hp, max: T.hp, sx, sy: T.row, x: sx * G.W, y: -60 - k * 40,
      state: 'walk', cd: rand(W.firstAttack[0], W.firstAttack[1]) + k * W.attackStagger, t: 0, hit: 0
    });
  });
  pop(G.W / 2, G.H * 0.5, wave.title || 'Vague ' + (i + 1), '', wave.color || '#F4EEFF', 1.4, 30);
}

/** Déplacement, préparation et coups des ennemis. Un seul ennemi prépare un coup à la fois. */
export function updateEnemies(dt) {
  for (const e of G.enemies) {
    e.hit = Math.max(0, e.hit - dt);
    if (e.hp <= 0) continue;
    const tx = e.sx * G.W, ty = e.sy * G.H;
    if (e.state === 'walk') {
      const d = Math.hypot(tx - e.x, ty - e.y), s = e.T.speed * dt;
      if (d <= s) { e.x = tx; e.y = ty; e.state = 'idle'; }
      else { e.x += (tx - e.x) / d * s; e.y += (ty - e.y) / d * s; }
      continue;
    }
    e.x = tx; e.y = ty;
    if (e.state === 'idle') e.cd -= dt;
    if (e.state === 'windup') {
      e.t += dt;
      if (e.t >= e.T.wind) {
        strike(e);
        G.globalGap = D.waves.globalGap;
        e.state = 'idle';
        e.cd = rand(e.T.cd[0], e.T.cd[1]);
      }
    }
  }
  G.enemies = G.enemies.filter(e => e.hp > 0);
  G.globalGap -= dt;
  if (G.globalGap <= 0 && !G.enemies.some(e => e.state === 'windup')) {
    const ready = G.enemies.filter(e => e.state === 'idle' && e.cd <= 0);
    if (ready.length) {
      const e = ready[Math.floor(Math.random() * ready.length)];
      e.state = 'windup'; e.t = 0;
    }
  }
}

/** Enchaîne les vagues. Renvoie true quand la dernière est vaincue (et le butin ramassé ou expiré). */
export function updateWaves(dt) {
  if (G.enemies.length) return false;
  const W = D.waves;
  if (G.waveIdx >= W.waves.length) {
    if (G.loots.length === 0 || G.waveDelay < -W.endLootWait) return true;
    G.waveDelay -= dt;
    return false;
  }
  G.waveDelay -= dt;
  if (G.waveDelay <= 0) { spawnWave(G.waveIdx); G.waveIdx++; G.waveDelay = W.betweenWaves; }
  return false;
}
