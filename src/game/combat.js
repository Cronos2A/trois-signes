// Attaque, esquive, ramassage, coups ennemis.
import { D } from '../data.js';
import { G, heroPos, addScore, emit } from './state.js';
import { clamp, dist, rand, fmt } from '../util.js';
import { gradeOf, registerGrade, comboHit, streakTxt, toleranceOffset } from './grades.js';
import { sfx } from '../audio/audio.js';
import { startSuper, superAttackMult, damageTakenMult, perfectMode, useAutoDodge, useComboCharge } from './supers.js';
import { pop, showGrade, addFx, vibrate, trainInfo, superBanner } from './effects.js';
import { gainWeaponXp, attackXp, xpFor } from './weapons.js';

const round1 = v => Math.round(v * 10) / 10;

/** Attaque du héros : base × bonus de niveau × super en cours (Ombre, Renouveau). */
const heroAtk = () => G.hero.atk * G.atkMult * superAttackMult();

/** Niveau d'un geste reconnu ; pendant Œil de faucon, c'est toujours le meilleur (Perfect). */
const gradeFor = acc => perfectMode() ? D.grades.levels[0] : gradeOf(acc);

function pickTarget() {
  const alive = G.enemies.filter(e => e.hp > 0 && e.state !== 'walk');
  if (!alive.length) return null;
  const w = alive.find(e => e.state === 'windup');
  if (w) return w;
  const h = heroPos();
  return alive.sort((a, b) => dist(a, h) - dist(b, h))[0];
}

/** Talent de l'arme au niveau 6 (data/weapons.json), ou {} avant. */
const talent = () => (G.weapon && G.weapon.talent) || {};

function doAttack(g, cm) {
  const e = pickTarget(), h = heroPos();
  // Dague (talent) : les attaques du meilleur niveau (Perfect) frappent plus fort.
  const perfect = g === D.grades.levels[0] ? 1 + (talent().perfectDamage || 0) : 1;
  const dmg = round1(heroAtk() * g.mult * cm * perfect);
  addScore(g.bonus);
  sfx('attaque');
  if (!e) { pop(h.x, h.y - 70, 'Aucune cible', '', g.col, 0.9, 18); return; }
  hitEnemy(e, dmg, g.col);
}

function dodgeShare(g, cm) { return Math.min(1, G.hero.dodgeBase * g.mult * cm); }

function doDodge(g, cm) {
  // Leçon : la garde tient tout le long de l'anneau rouge, pour qu'un Rond tracé tôt compte quand même.
  G.hero.shieldUntil = G.time + (G.battle.tutorial ? D.tutorial.shieldDuration : D.rules.dodge.shieldDuration);
  G.hero.shieldAvoid = dodgeShare(g, cm);
  addFx({ kind: 'ring', col: '#3FD7C4', life: 0.75 });
  sfx('esquive');
  // Esquive en combo : riposte
  if (cm > 1 && G.mode === 'play') {
    const e = pickTarget();
    if (e) hitEnemy(e, round1(heroAtk() * cm), g.col);
  }
}

function tryPickup(x, y) {
  const P = D.rules.pickup;
  let best = null, bd = 1e9;
  for (const l of G.loots) { const d = Math.hypot(l.x - x, l.y - y); if (d < bd) { bd = d; best = l; } }
  if (!best || bd > P.radius) return false;
  const acc = Math.round(clamp(100 - bd * P.accuracyLossPerPx, 0, 100));
  const g = gradeFor(acc);
  const cm = registerGrade(g);
  summon(g);
  showGrade(g, acc, 'Ramassage');
  if (!g) { best.life = Math.min(best.life, P.missLifeCap); emit('tapMiss'); return true; }
  G.loots.splice(G.loots.indexOf(best), 1);
  sfx(best.type === 'coin' ? 'piece' : 'coeur');
  emit('pickup');
  if (best.type === 'coin') {
    const v = Math.round(P.coinValue * g.mult * cm);
    addScore(v + g.bonus);
    pop(best.x, best.y - 20, '+' + v, 'points', g.col, 0.9, 22);
  } else {
    const v = Math.round(P.heartHeal * g.mult * cm);
    G.hero.hp = Math.min(G.hero.max, G.hero.hp + v);
    pop(best.x, best.y - 20, '+' + v + ' PV', '', g.col, 0.9, 22);
  }
  if (G.mode === 'train') trainInfo('Ramassage ' + g.name + (cm > 1 ? ' en combo ×' + fmt(cm) : '') + streakTxt());
  return true;
}

/** by : undefined (attaque du héros), 'super' (coup de super sur tous) ou 'summon' (invocation de Mira). */
function hitEnemy(e, dmg, col, by) {
  const h = heroPos();
  if (G.time < e.guardUntil) dmg = round1(dmg * D.rules.story.eldan.guardDamageTaken);   // Eldan protégé (Rond)
  e.hp -= dmg; e.hit = 0.25;
  if (by === 'super') addFx({ kind: 'superHit', x: e.x, y: e.y, col, life: 0.6 });
  else if (by === 'summon') addFx({ kind: 'bite', x: e.x, y: e.y, col, life: 0.35 });
  else addFx({ kind: 'slash', x1: h.x, y1: h.y - 20, x2: e.x, y2: e.y, col, life: 0.35 });
  pop(e.x, e.y - e.T.r - 14, '-' + dmg, '', col, 0.9, by === 'summon' ? 16 : 24);
  addScore(dmg * D.rules.score.perDamage);
  if (e.T.immortal) { e.hp = e.max; return; }       // mannequin de la leçon
  if (e.hp > 0) return;
  sfx('ennemi_vaincu');
  if (e.T.special) gainWeaponXp(xpFor('bossKill'));   // gardien du Voyage ou boss d'histoire
  addScore(e.T.pts);
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

/** Soin du héros (passif de Mira), sans dépasser ses PV max. */
function heal(v) {
  const h = G.hero, before = h.hp;
  h.hp = Math.min(h.max, h.hp + v);
  const got = round1(h.hp - before);
  if (got > 0) { const p = heroPos(); pop(p.x - 44, p.y - 44, '+' + fmt(got) + ' PV', '', '#8CF09A', 0.9, 20); }
}

/** Bouton de super : lance la super du héros si la jauge est pleine. */
export function useSuper() {
  const S = startSuper();
  if (!S) return false;
  const h = G.hero, p = heroPos();
  superBanner(S.name, h.col);
  vibrate([40, 30, 70]);
  sfx('super_' + G.charId);
  emit('super');
  gainWeaponXp(xpFor('super'));
  if (S.healPct) pop(p.x, p.y - 90, 'PV au max', '', '#8CF09A', 1.2, 24);
  if (S.hitAll) {
    const dmg = round1(G.hero.atk * G.atkMult * S.hitAll);
    for (const e of G.enemies.filter(e => e.hp > 0)) hitEnemy(e, dmg, h.col, 'super');
  }
  return true;
}

/** Mira : chaque geste du niveau voulu (Perfect) invoque un petit monstre, dans la limite de max. */
function summon(g) {
  const S = G.hero.summon;
  if (!S || !g || g.name !== S.on || G.summons.length >= S.max) return;
  G.summons.push({ id: ++summonId, t: 0, life: S.duration, next: S.interval, target: null });
}
let summonId = 0;

/** Chaque invocation frappe la cible du moment toutes les `interval` s, puis disparaît au bout de `duration` s. */
export function updateSummons(dt) {
  const S = G.hero.summon;
  if (!S) return;
  for (const s of G.summons) {
    s.t += dt;
    if (s.t < s.next) continue;
    s.next += S.interval;
    const e = pickTarget();
    s.target = e;
    if (e) hitEnemy(e, S.damage, G.hero.col, 'summon');
  }
  G.summons = G.summons.filter(s => s.t < s.life);
}

/** Un ennemi porte son coup sur le héros. */
export function strike(e) {
  const h = heroPos();
  let avoid = G.time < G.hero.shieldUntil ? G.hero.shieldAvoid : 0;
  const auto = avoid < 1 && useAutoDodge();        // Ombre : esquive totale sans tracer
  if (auto) avoid = 1;
  const taken = Math.round(e.T.dmg * (1 - avoid) * damageTakenMult() * (talent().damageTaken ?? 1));   // Gantelets (talent)
  addFx({ kind: 'bolt', x1: e.x, y1: e.y, x2: h.x, y2: h.y, col: '#FF5D73', life: 0.25 });
  if (auto) pop(h.x, h.y - 80, 'Ombre', 'esquive automatique', G.hero.col, 1, 22);
  else if (avoid > 0) pop(h.x, h.y - 80, 'Esquive ' + Math.round(avoid * 100) + ' %', avoid >= 1 ? 'aucun dégât' : '', '#3FD7C4', 1, 20);
  if (avoid >= 1) addScore(D.rules.dodge.perfectScore);
  emit('strike', { avoid });
  if (taken > 0) {
    sfx('coup_recu');
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
    if (!ok) emit('tapMiss');
    if (!ok && train) trainInfo('Tap sans objet : tapez sur une pièce ou un cœur.');
    return;
  }
  if (res.type === 'fail') {
    registerGrade(null);
    showGrade(null, null, res.reason);
    emit('gesture', { type: 'fail', g: null, cm: 1 });
    if (train) trainInfo(res.reason + '. Série remise à zéro.');
    return;
  }
  const g = gradeFor(res.acc);
  let cm = registerGrade(g);
  summon(g);
  const label = res.type === 'triangle' ? 'Attaque' : 'Esquive';
  showGrade(g, res.acc, label);
  const done = () => emit('gesture', { type: res.type, g, cm });
  if (!g) {
    done();
    if (train) trainInfo(label + ' ratée : précision ' + res.acc + ' % (' + (D.grades.levels[D.grades.levels.length - 1].min - toleranceOffset()) + ' % minimum). Série remise à zéro.');
    return;
  }
  if (res.type === 'triangle') {
    // Grimoire ouvert : l'attaque compte comme un combo de son propre niveau.
    if (useComboCharge() && cm === 1) cm = comboHit(g, true);
    // Soin par attaque réussie : passif de Mira, + talent de l'amulette.
    const cure = G.hero.healPerHit * g.mult + (talent().healPerHit || 0);
    if (cure > 0) heal(cure);
    gainWeaponXp(attackXp(g));
    if (G.mode === 'play') doAttack(g, cm);
    else { addFx({ kind: 'slash', x1: h.x, y1: h.y - 20, x2: h.x, y2: h.y - 200, col: g.col, life: 0.35 }); sfx('attaque'); }
    done();
    if (train) trainInfo('Attaque ' + g.name + ' : ' + fmt(round1(heroAtk() * g.mult * cm)) + ' dégâts' + (cm > 1 ? ' (combo ×' + fmt(cm) + ')' : '') + streakTxt());
  } else {
    doDodge(g, cm);
    done();
    if (train) trainInfo('Esquive ' + g.name + ' : ' + Math.round(dodgeShare(g, cm) * 100) + ' % des dégâts évités' + (cm > 1 ? ' + riposte (combo)' : '') + streakTxt());
  }
}
