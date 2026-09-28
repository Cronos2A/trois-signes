// Vagues, IA ennemie, boss. Le combat en cours est décrit par G.battle (Solo : data/waves.json ;
// Histoire : combat de data/story_mode.json), avec ses propres types d'ennemis (boss d'histoire, Eldan).
import { D } from '../data.js';
import { G, windOf } from './state.js';
import { rand } from '../util.js';
import { pop } from './effects.js';
import { strike } from './combat.js';
import { sfx, music } from '../audio/audio.js';

const typeOf = type => G.battle.types[type] || D.enemies[type];

export function addEnemy(type, sx, k, delay) {
  const W = D.waves, T = typeOf(type);
  G.enemies.push({
    type, T, hp: T.hp, max: T.hp, sx, sy: T.row, x: sx * G.W, y: -60 - k * 40,
    state: 'walk', cd: rand(W.firstAttack[0], W.firstAttack[1]) + delay, t: 0, hit: 0, guardUntil: -1,
    lead: (G.talisman && G.talisman.alertLead) || 0
  });
}

export function spawnWave(i) {
  const W = D.waves, wave = G.battle.waves[i], list = wave.enemies;
  list.forEach((type, k) => addEnemy(type, typeOf(type).centered ? 0.5 : (k + 1) / (list.length + 1), k, k * W.attackStagger));
  G.roundSummons = 0;
  G.missForgiven = 0;                              // Craie ancienne : un raté pardonné par round
  if (wave.boss) { sfx('boss_apparition'); music('musique_boss'); }
  else if (G.battle.music) music(G.battle.music);
  pop(G.W / 2, G.H * 0.5, wave.title || G.battle.label + ' ' + (i + 1), '', wave.color || '#F4EEFF', 1.4, 30);
}

/**
 * Eldan l'Oublié utilise les trois signes (valeurs dans data/rules.json, story.eldan) :
 * Triangle = coup normal ; Rond = se protège (dégâts reçus réduits, cercle visible) ;
 * Toucher = appelle un sbire, un nombre limité de fois par round et jamais plus de maxExtra ennemis avec lui.
 */
function eldanAction(e) {
  const R = D.rules.story.eldan, w = R.actions;
  const canGuard = G.time >= e.guardUntil;
  const canCall = G.roundSummons < R.summonsPerRound && G.enemies.filter(o => o !== e && o.hp > 0).length < R.maxExtra;
  const opts = [['attack', w.attack], ['guard', canGuard ? w.guard : 0], ['summon', canCall ? w.summon : 0]];
  let r = Math.random() * opts.reduce((a, o) => a + o[1], 0);
  const pick = opts.find(o => (r -= o[1]) < 0)[0];
  if (pick === 'attack') { e.state = 'windup'; e.t = 0; sfx('alerte'); return; }
  e.cd = rand(e.T.cd[0], e.T.cd[1]) * 0.6;
  if (pick === 'guard') {
    e.guardUntil = G.time + R.guardDuration;
    pop(e.x, e.y - e.T.r - 30, 'Rond', 'il se protège', '#8CF09A', 1.1, 24);
  } else {
    G.roundSummons++;
    addEnemy(R.summonType, e.x < G.W / 2 ? 0.8 : 0.2, 0, 0.8);
    pop(e.x, e.y - e.T.r - 30, 'Toucher', 'il appelle un Ombracé', '#FFD23F', 1.1, 24);
  }
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
      if (e.t >= windOf(e)) {
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
      if (e.T.mech === 'eldan') eldanAction(e);
      else { e.state = 'windup'; e.t = 0; sfx('alerte'); }
    }
  }
}

/** Enchaîne les vagues. Renvoie true quand la dernière est vaincue (et le butin ramassé ou expiré) ;
 *  jamais dans le Voyage, qui continue jusqu'au KO. */
export function updateWaves(dt) {
  if (G.enemies.length) return false;
  const W = D.waves, B = G.battle;
  if (!B.endless && G.waveIdx >= B.waves.length) {
    if (G.loots.length === 0 || G.waveDelay < -W.endLootWait) return true;
    G.waveDelay -= dt;
    return false;
  }
  G.waveDelay -= dt;
  if (G.waveDelay <= 0) {
    if (B.endless && !B.prepare(G.waveIdx)) return false;   // Voyage : écran de transition d'arène en cours
    spawnWave(G.waveIdx); G.waveIdx++; G.waveDelay = B.betweenRounds ?? W.betweenWaves;
  }
  return false;
}
