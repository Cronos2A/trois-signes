// Attaque, esquive, ramassage, coups ennemis.
// Effets de l'arme équipée (G.weapon.style, data/weapons.json) et du talisman (G.talisman, data/talismans.json).
import { D } from '../data.js';
import { G, heroPos, addScore, emit } from './state.js';
import { clamp, dist, rand } from '../util.js';
import { gradeOf, registerGrade, comboHit, streakTxt, toleranceOffset } from './grades.js';
import { sfx } from '../audio/audio.js';
import { startSuper, superAttackMult, damageTakenMult, perfectMode, useAutoDodge, useComboCharge, addGaugeFlat } from './supers.js';
import { pop, showGrade, addFx, vibrate, trainInfo, superBanner } from './effects.js';
import { gainWeaponXp, attackXp, xpFor } from './weapons.js';
import { beatGuardian } from './rewards.js';
import { tr, nf } from '../i18n.js';

const round1 = v => Math.round(v * 10) / 10;

/** Effet de style de l'arme équipée (valeurs déjà à la force de son niveau), ou {}. */
const style = () => (G.weapon && G.weapon.style) || {};
/** Effet du talisman équipé, ou {}. */
const charm = () => G.talisman || {};
const WU = () => D.weapons.ui;
const isTop = g => g === D.grades.levels[0];               // meilleur niveau de réussite (Perfect)

/** Attaque du héros : base × bonus de niveau (héros et arme) × super en cours (Ombre, Renouveau). */
const heroAtk = () => G.hero.atk * G.atkMult * superAttackMult();

/** Niveau d'un geste reconnu ; pendant Œil de faucon, c'est toujours le meilleur (Perfect). */
const gradeFor = acc => perfectMode() ? D.grades.levels[0] : gradeOf(acc);

const aliveEnemies = () => G.enemies.filter(e => e.hp > 0 && e.state !== 'walk');

/** Cible des attaques : l'ennemi qui prépare un coup, sinon le plus proche (Couteaux de lancer : le plus faible). */
function pickTarget(weakest = false) {
  const alive = aliveEnemies();
  if (!alive.length) return null;
  if (weakest) return alive.sort((a, b) => a.hp - b.hp)[0];
  const w = alive.find(e => e.state === 'windup');
  if (w) return w;
  const h = heroPos();
  return alive.sort((a, b) => dist(a, h) - dist(b, h))[0];
}

function doAttack(g, cm) {
  const S = style(), e = pickTarget(!!S.targetWeakest), h = heroPos();
  let mult = 1;
  if (isTop(g)) mult *= 1 + (S.perfectDamage || 0);                     // Dague
  mult *= 1 - (S.damagePenalty || 0);                                    // Bouclier-tour
  if (G.hero.dodgeBonus) { mult *= 1 + G.hero.dodgeBonus; G.hero.dodgeBonus = 0; }   // Lance garde-fou
  if (e && (S.bossDamage || S.otherPenalty)) mult *= e.T.special ? 1 + (S.bossDamage || 0) : 1 - (S.otherPenalty || 0);   // Arbalète
  const base = heroAtk() * g.mult * cm * mult;
  addScore(g.bonus);
  sfx('attaque');
  if (!e) { pop(h.x, h.y - 70, tr('combat.noTarget'), '', g.col, 0.9, 18); return; }
  hitEnemy(e, round1(base * (1 - (S.targetPenalty || 0))), g.col);      // Masse de pierre : la cible prend moins…
  const others = aliveEnemies().filter(o => o !== e);
  if (S.splash) for (const o of others) hitEnemy(o, round1(base * S.splash), g.col, 'splash');   // …les autres sont touchés
  if (isTop(g) && S.cleaveOnPerfect && others.length) {                  // Hache fendeuse : un 2e ennemi
    const o = others.sort((a, b) => dist(a, e) - dist(b, e))[0];
    hitEnemy(o, round1(base * S.cleaveOnPerfect), g.col, 'cleave');
  }
  if (isTop(g) && S.burnOnPerfect && e.hp > 0) {                         // Bâton de braises : brûlure (non cumulable)
    e.burn = { left: S.burnOnPerfect, rate: S.burnOnPerfect / S.burnDuration, acc: 0 };
  }
}

// Part évitée par un Rond : jamais plus de dodge.max (90 %), même en Perfect et pour Kestrel ; seuls les pouvoirs
// (Ombre de Nyra : 3 esquives, répit de la Seconde chance : 1,5 s) évitent tout, en nombre ou en durée limités.
function dodgeShare(g, cm) { return Math.min(D.rules.dodge.max, G.hero.dodgeBase * g.mult * cm); }

function doDodge(g, cm) {
  // Leçon : la garde tient tout le long de l'anneau rouge, pour qu'un Rond tracé tôt compte quand même.
  G.hero.shieldUntil = G.time + (G.battle.tutorial ? D.tutorial.shieldDuration : D.rules.dodge.shieldDuration);
  G.hero.shieldAvoid = dodgeShare(g, cm);
  G.hero.shieldGrade = g;
  addFx({ kind: 'ring', col: '#3FD7C4', life: 0.75 });
  sfx('esquive');
  // Esquive en combo : riposte
  if (cm > 1 && G.mode === 'play') {
    const e = pickTarget();
    if (e) hitEnemy(e, round1(heroAtk() * cm), g.col);
  }
}

function tryPickup(x, y) {
  const P = D.rules.pickup, T = charm(), range = T.pickupRange || 1;      // Gland de mousse : portée plus grande
  let best = null, bd = 1e9;
  for (const l of G.loots) { const d = Math.hypot(l.x - x, l.y - y); if (d < bd) { bd = d; best = l; } }
  if (!best || bd > P.radius * range) return false;
  const acc = Math.round(clamp(100 - bd * P.accuracyLossPerPx / range, 0, 100));
  const g = gradeFor(acc);
  const cm = registerGrade(g, 'pickup');
  summon(g);
  showGrade(g, acc, tr('combat.pickup'), 'tap');
  if (!g) { best.life = Math.min(best.life, P.missLifeCap); emit('tapMiss'); return true; }
  G.loots.splice(G.loots.indexOf(best), 1);
  sfx(best.type === 'coin' ? 'piece' : 'coeur');
  emit('pickup');
  if (best.type === 'coin') {
    const v = Math.round(P.coinValue * g.mult * cm * (T.coinMult || 1));   // Épi d'or
    addScore(v + g.bonus);
    G.coins++;                                                             // pièces → or en fin de partie
    pop(best.x, best.y - 20, '+' + nf(v), tr('units.points', { n: v }), g.col, 0.9, 22);
  } else {
    const v = Math.round(P.heartHeal * g.mult * cm * (T.heartMult || 1));  // Goutte claire
    G.hero.hp = Math.min(G.hero.max, G.hero.hp + v);
    pop(best.x, best.y - 20, tr('units.hpGain', { n: nf(v) }), '', g.col, 0.9, 22);
  }
  const S = style();
  if (S.pickupShot && G.mode === 'play') {                               // Fronde : tir automatique
    const e = pickTarget();
    if (e) hitEnemy(e, round1(S.pickupShot), g.col, 'shot');
  }
  if (G.mode === 'train') trainInfo((cm > 1 ? tr('train.pickupCombo', { grade: g.name, m: nf(cm) }) : tr('train.pickup', { grade: g.name })) + streakTxt());
  return true;
}

/** Libellé des coups secondaires (data/weapons.json → ui). */
const HIT_LABEL = { counter: 'counter', reflect: 'reflect', burn: 'burn', shot: 'shot' };

/**
 * by : undefined (attaque du héros), 'super' (coup sur tous), 'summon' (invocation de Mira),
 * ou un effet d'arme : 'splash', 'cleave', 'counter', 'reflect', 'burn', 'shot'.
 */
function hitEnemy(e, dmg, col, by) {
  const h = heroPos();
  if (G.time < e.guardUntil) dmg = round1(dmg * D.rules.story.eldan.guardDamageTaken);   // Eldan protégé (Rond)
  e.hp -= dmg; e.hit = 0.25;
  if (by === 'super' || by === 'cleave' || by === 'reflect') addFx({ kind: 'superHit', x: e.x, y: e.y, col, life: 0.6 });
  else if (by) addFx({ kind: 'bite', x: e.x, y: e.y, col, life: 0.35 });
  else addFx({ kind: 'slash', x1: h.x, y1: h.y - 20, x2: e.x, y2: e.y, col, life: 0.35 });
  const small = by === 'summon' || by === 'burn' || by === 'splash' || by === 'shot';
  pop(e.x, e.y - e.T.r - 14, '-' + dmg, HIT_LABEL[by] ? WU()[HIT_LABEL[by]] : '', col, 0.9, small ? 16 : 24);
  addScore(dmg * D.rules.score.perDamage);
  if (e.T.immortal) { e.hp = e.max; return; }       // mannequin de la leçon
  if (e.hp > 0) return;
  sfx('ennemi_vaincu');
  if (e.T.special) gainWeaponXp(xpFor('bossKill'));   // gardien du Voyage ou boss d'histoire
  if (e.T.guardianOf && G.mode === 'play') { beatGuardian(e.T.guardianOf); G.guardiansBeaten++; }   // Voyage : talisman, XP du héros
  if (style().gaugePerKill) addGaugeFlat(style().gaugePerKill);           // Couteaux de lancer
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

/** Soin du héros, sans dépasser ses PV max. */
function heal(v) {
  const h = G.hero, before = h.hp;
  h.hp = Math.min(h.max, h.hp + v);
  const got = round1(h.hp - before);
  if (got > 0) { const p = heroPos(); pop(p.x - 44, p.y - 44, tr('units.hpGain', { n: nf(got) }), '', '#8CF09A', 0.9, 20); }
}

/** Clochette : bouclier qui absorbe les dégâts, plafonné à barrierMax. */
function addBarrier(v) {
  const h = G.hero, before = h.barrier;
  h.barrier = Math.min(style().barrierMax, h.barrier + v);
  const got = round1(h.barrier - before);
  if (got > 0) { const p = heroPos(); pop(p.x - 44, p.y - 44, '+' + nf(got), WU().barrier, '#8FD3FF', 0.9, 20); }
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
  if (S.healPct) pop(p.x, p.y - 90, tr('units.pctHp', { pct: nf(Math.round(S.healPct * 100)) }), '', '#8CF09A', 1.2, 24);   // Renouveau
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

/**
 * Effets qui durent : invocations de Mira (un coup toutes les `interval` s pendant `duration` s)
 * et brûlures du Bâton de braises (dégâts répartis, un coup par seconde).
 */
export function updateSummons(dt) {
  for (const e of G.enemies) {
    const b = e.burn;
    if (!b || e.hp <= 0) continue;
    b.acc += dt;
    if (b.acc < 1 && b.left > b.rate * b.acc) continue;
    const d = Math.min(b.left, b.rate * b.acc);
    b.left -= d; b.acc = 0;
    if (b.left <= 1e-6) e.burn = null;
    hitEnemy(e, round1(d), '#FF8C32', 'burn');
  }
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
  const h = heroPos(), S = style();
  let avoid = G.time < G.hero.shieldUntil ? G.hero.shieldAvoid : 0;
  const auto = avoid < 1 && useAutoDodge();        // Ombre : esquive totale sans tracer
  if (auto) avoid = 1;
  let taken = Math.round(e.T.dmg * (1 - avoid) * damageTakenMult() * G.hero.damageTaken * (1 - (S.damageReduction || 0)));   // Garde, Gantelets, Bouclier-tour
  addFx({ kind: 'bolt', x1: e.x, y1: e.y, x2: h.x, y2: h.y, col: '#FF5D73', life: 0.25 });
  if (auto) pop(h.x, h.y - 80, G.hero.super.name, tr('combat.autoDodge'), G.hero.col, 1, 22);
  else if (avoid > 0) pop(h.x, h.y - 80, tr('combat.dodgePct', { pct: nf(Math.round(avoid * 100)) }), avoid >= 1 ? tr('combat.noDamage') : '', '#3FD7C4', 1, 20);
  if (avoid >= D.rules.dodge.max) addScore(D.rules.dodge.perfectScore);   // esquive maximale (ou totale, par un pouvoir)
  emit('strike', { avoid });
  if (avoid > 0 && G.mode === 'play') {
    // Esquive réussie : effets d'arme (le coup a été évité, en tout ou en partie).
    if (S.afterDodgeDamage) G.hero.dodgeBonus = S.afterDodgeDamage;                    // Lance garde-fou
    const back = round1(e.T.dmg * avoid * (S.reflect || 0));                          // Orbe miroir
    if (back > 0 && e.hp > 0) hitEnemy(e, back, '#8FD3FF', 'reflect');
    if (S.perfectDodgeCounter && !auto && isTop(G.hero.shieldGrade) && e.hp > 0) {    // Lame d'ombre
      hitEnemy(e, round1(heroAtk() * S.perfectDodgeCounter), G.hero.col, 'counter');
    }
  }
  if (taken > 0 && G.hero.barrier > 0) {                                              // Clochette : le bouclier absorbe
    const soak = Math.min(G.hero.barrier, taken);
    G.hero.barrier = round1(G.hero.barrier - soak);
    taken -= soak;
    pop(h.x - 40, h.y - 40, '-' + nf(round1(soak)), WU().barrier, '#8FD3FF', 0.9, 20);
  }
  taken = Math.round(taken);
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
    if (!ok && train) trainInfo(tr('train.tapMiss'));
    return;
  }
  if (res.type === 'fail') {
    registerGrade(null, 'gesture');
    showGrade(null, null, res.reason);
    emit('gesture', { type: 'fail', g: null, cm: 1 });
    if (train) trainInfo(tr('train.fail', { reason: res.reason }));
    return;
  }
  const g = gradeFor(res.acc);
  let cm = registerGrade(g, 'gesture');
  summon(g);
  const label = res.type === 'triangle' ? tr('combat.attack') : tr('combat.dodge');
  showGrade(g, res.acc, label, res.type);
  const done = () => emit('gesture', { type: res.type, g, cm });
  if (!g) {
    done();
    if (train) trainInfo(tr(res.type === 'triangle' ? 'train.missedAttack' : 'train.missedDodge', { acc: nf(res.acc), min: nf(D.grades.levels[D.grades.levels.length - 1].min - toleranceOffset()) }));
    return;
  }
  if (res.type === 'triangle') {
    // Grimoire ouvert : l'attaque compte comme un combo de son propre niveau.
    if (useComboCharge() && cm === 1) cm = comboHit(g, true);
    // Soin par attaque réussie : passif de Mira (sauf Bâton de sève et Clochette) + Amulette ;
    // Clochette : à la place, bouclier de barrierPerHit × le multiplicateur (indépendant du soin).
    const S = style(), cure = (S.noHealPerHit ? 0 : G.hero.healPerHit * g.mult) + (S.healPerHit || 0);
    if (cure > 0) heal(cure);
    if (S.barrierPerHit) addBarrier(S.barrierPerHit * g.mult);
    gainWeaponXp(attackXp(g));
    if (G.mode === 'play') doAttack(g, cm);
    else { addFx({ kind: 'slash', x1: h.x, y1: h.y - 20, x2: h.x, y2: h.y - 200, col: g.col, life: 0.35 }); sfx('attaque'); }
    done();
    if (train) trainInfo(tr(cm > 1 ? 'train.attackCombo' : 'train.attack', { grade: g.name, dmg: nf(round1(heroAtk() * g.mult * cm)), m: nf(cm) }) + streakTxt());
  } else {
    doDodge(g, cm);
    done();
    if (train) trainInfo(tr(cm > 1 ? 'train.dodgeCombo' : 'train.dodge', { grade: g.name, pct: nf(Math.round(dodgeShare(g, cm) * 100)) }) + streakTxt());
  }
}
