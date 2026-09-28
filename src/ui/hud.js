// Rendu canvas du combat, d'après la maquette design/ecran-de-combat-trois-signes :
// sprites (héros choisi, sbires, brute, boss, objets), anneau d'alerte, tracés, textes de réussite.
// Le décor est peint une fois dans un canvas de fond (ui/combat-art.js) ; les barres du haut et la
// série du bas sont en HTML (ui/combat-hud.js). Ne modifie jamais l'état du jeu.
import { G, heroPos } from '../game/state.js';
import { gradeByName } from '../game/grades.js';
import { ART, artScale, SPRITE_SCALE } from './combat-art.js';
import { A, DUR, updateAnims, heroPose, heroAttack } from './anim.js';
import { updateHud, HUD_BOTTOM } from './combat-hud.js';
import { superActive } from '../game/supers.js';

const INK = '#15301E';
const HEAD = 'Caprasimo, system-ui, sans-serif', BODY = 'Figtree, system-ui, sans-serif';
const BAR = { sbire: [46, 12], brute: [64, 12], boss: [120, 14] };   // barres de vie : largeur, hauteur
const GLYPH = { Attaque: 'gTri', Esquive: 'gCircle', Ramassage: 'gDot' };

let k = 1;

export function draw(ctx, dt) {
  const { W, H } = G;
  k = artScale(W, H);
  updateAnims(dt, enemyFoot, gradeByName);
  updateHud(A);
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * 16 * G.shake, (Math.random() - 0.5) * 16 * G.shake);
  if (G.enemies.some(e => e.T.sprite === 'boss' || e.T.special)) bossShade(ctx, W, H);
  drawLoots(ctx);
  const list = G.enemies.map(e => ({ e, p: enemyFoot(e) })).sort((a, b) => a.p.y - b.p.y);
  for (const d of A.dying) drawDying(ctx, d);
  for (const { e, p } of list) drawEnemy(ctx, e, p);
  drawGrade(ctx, W, H);        // sous le héros : le texte de réussite ne cache pas l'attaque
  const body = drawHero(ctx);
  const w = G.enemies.find(e => e.state === 'windup');
  if (w) drawWarning(ctx, body, w.t / w.T.wind);
  drawSummons(ctx, body, dt);
  drawFx(ctx, body);
  drawProjectiles(ctx);
  drawImpacts(ctx);
  drawShards(ctx);
  drawTrails(ctx);
  drawPops(ctx);
  ctx.restore();
  drawSuperLaunch(ctx, W, H);
}

/* ---------- Placement ---------- */

/** Pieds de l'ennemi à l'écran. La logique donne le centre ; on garde la tête sous le bandeau du haut. */
function enemyFoot(e) {
  const S = ART[e.T.sprite];
  if (!S) return { x: e.x, y: e.y, h: 0 };
  const ty = e.sy * G.H;
  const minFoot = G.safeTop + HUD_BOTTOM + (G.battle && G.battle.endless ? 44 : 34) + (S.fy - S.hy);   // Voyage : place pour le nom de l'arène
  return { x: e.x, y: Math.max(ty + 0.45 * S.h, minFoot) + (e.y - ty), h: S.h };
}

function heroFoot() {
  const h = heroPos(), S = ART.hero;
  return { x: h.x, y: Math.min(h.y + 0.55 * (S ? S.h : 0), G.H - 70) };
}

/* ---------- Sprites ---------- */

function sprite(ctx, S, x, y, sx, sy, rot, red, white) {
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
  ctx.drawImage(S.img, -S.fx, -S.fy, S.w, S.h);
  if (red > 0) { ctx.globalAlpha = Math.min(1, red); ctx.drawImage(S.red, -S.fx, -S.fy, S.w, S.h); }
  if (white > 0) { ctx.globalAlpha = Math.min(1, white); ctx.drawImage(S.white, -S.fx, -S.fy, S.w, S.h); }
  ctx.restore();
}

function drawHero(ctx) {
  const S = ART.hero, home = heroFoot();
  if (!S) return { x: home.x, y: home.y - 60 };
  const P = heroPose(home, k), x = home.x + P.dx + P.shake, y = home.y + P.dy, Arm = ART.heroArm;
  const sp = superActive() ? G.hero.sp : null, g = giant(sp);
  const body = { x, y: y - S.h * 0.5 * g };
  if (sp) aura(ctx, body, S.h * 0.5 * g, sp.col, false);
  // Sans calque de bras armé (arc de Kestrel), c'est tout le sprite qui s'incline pour frapper.
  heroSprite(ctx, S, Arm, x, y, P.sx * g, P.sy * g, P.rot + (Arm ? 0 : P.arm * 0.15), P);
  if (sp) aura(ctx, body, S.h * 0.5 * g, sp.col, true);
  fireAttack(x, y, P);
  if ((G.mode === 'play' || G.mode === 'train') && G.time < G.hero.shieldUntil) {
    ring(ctx, body.x, body.y, 64 * k, '#3DDC5B', 4, 0.9);
    ctx.globalAlpha = 0.16; ctx.fillStyle = '#3DDC5B';
    ctx.beginPath(); ctx.arc(body.x, body.y, 64 * k, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  return body;
}

/** Géant (Boran) : taille du sprite, avec 0,3 s de croissance au début et de retour à la fin. */
function giant(sp) {
  if (!sp || sp.scale === 1 || G.time >= sp.until) return 1;
  const env = Math.max(0, Math.min(1, (G.time - sp.start) / 0.3, (sp.until - G.time) / 0.3));
  return 1 + (sp.scale - 1) * env;
}

/** Aura de super à la couleur du personnage : halo derrière le héros, anneau qui pulse devant. */
function aura(ctx, body, r, col, front) {
  const pulse = 0.5 + 0.5 * Math.sin(A.t * 6);
  if (!front) {
    ctx.globalAlpha = 0.18 + 0.12 * pulse; ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(body.x, body.y, r * 1.25, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  ring(ctx, body.x, body.y, r * (1.15 + 0.1 * pulse), col, 4, 0.55 + 0.35 * pulse);
  for (let i = 0; i < 4; i++) {                       // étincelles qui tournent autour du héros
    const a = A.t * 2.4 + i * Math.PI / 2, rr = r * 1.2;
    const sx = body.x + Math.cos(a) * rr, sy = body.y + Math.sin(a) * rr * 0.6, s = 7 * k;
    ctx.beginPath(); ctx.moveTo(sx, sy - s); ctx.lineTo(sx + s * 0.5, sy); ctx.lineTo(sx, sy + s); ctx.lineTo(sx - s * 0.5, sy); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
  }
}

/** Lancement d'une super : flash plein écran puis nom de la super en gros au centre. */
function drawSuperLaunch(ctx, W, H) {
  const b = G.superBanner;
  if (!b) return;
  if (b.t < 0.5) {
    ctx.globalAlpha = 0.45 * (1 - b.t / 0.5); ctx.fillStyle = b.col;
    ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  }
  const q = b.t / 1.6, size = 50 * Math.min(1, W / 390);
  const sc = q < 0.1 ? 0.5 + q / 0.1 * 0.65 : q < 0.18 ? 1.15 - (q - 0.1) / 0.08 * 0.15 : 1;
  ctx.save();
  ctx.globalAlpha = q > 0.75 ? (1 - q) / 0.25 : 1;
  ctx.translate(W / 2, H * 0.42); ctx.scale(sc, sc); ctx.rotate(-3 * Math.PI / 180);
  outlined(ctx, 'SUPER', 0, -size * 0.8, 18, '#FFFFFF', 5, 0, BODY, 700);
  outlined(ctx, b.name, 0, 0, size, b.col, 9, 5);
  ctx.restore();
}

/** Déclenche l'effet de l'attaque au bon moment : entaille (corps à corps) ou projectile (à distance). */
function fireAttack(x, y, P) {
  const a = A.hero;
  if (!a || a.kind !== 'attack' || a.fired) return;
  const p = a.t / a.dur, style = a.style;
  if (style === 'melee' && p >= 0.46) {
    a.fired = true;
    A.impacts.push({ kind: 'slash', x: a.tx, y: a.ty, col: a.col, t: 0 });
  } else if (style !== 'melee' && p >= 0.4) {
    a.fired = true;
    const m = heroAttack().muzzle, s = SPRITE_SCALE.hero * k;
    A.projectiles.push({ kind: style, x0: x + m[0] * s * P.sx, y0: y + m[1] * s * P.sy, tx: a.tx, ty: a.ty, col: heroAttack().col, t: 0 });
  }
}

/** Héros : corps, puis bras armé qui pivote autour de l'épaule, avec une traînée de lame pendant la frappe. */
function heroSprite(ctx, S, Arm, x, y, sx, sy, rot, P) {
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.scale(sx, sy);
  ctx.drawImage(S.img, -S.fx, -S.fy, S.w, S.h);
  if (P.red > 0) { ctx.globalAlpha = Math.min(1, P.red); ctx.drawImage(S.red, -S.fx, -S.fy, S.w, S.h); ctx.globalAlpha = 1; }
  if (Arm) {
    ctx.translate(-Arm.fx + Arm.px, -Arm.fy + Arm.py);
    if (P.swing > 0) {
      const R = S.h * 0.44, a1 = -1.06 + P.arm, a0 = Math.max(-1.06 - 0.8, a1 - 1.6), fade = 1 - P.swing * P.swing;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, R, a0, a1);
      ctx.globalAlpha = 0.45 * fade; ctx.strokeStyle = '#FFD23F'; ctx.lineWidth = 16 * k; ctx.stroke();
      ctx.globalAlpha = 0.95 * fade; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 6 * k; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.rotate(P.arm);
    ctx.drawImage(Arm.img, -Arm.px, -Arm.py, Arm.w, Arm.h);
    if (P.red > 0) { ctx.globalAlpha = Math.min(1, P.red); ctx.drawImage(Arm.red, -Arm.px, -Arm.py, Arm.w, Arm.h); }
  }
  ctx.restore();
}

function drawEnemy(ctx, e, p) {
  const S = ART[e.T.sprite];
  if (!S) return;
  const walk = e.state === 'walk', wind = e.state === 'windup' ? Math.min(1, e.t / e.T.wind) : 0;
  const bob = (1 - Math.cos(A.t * (walk ? 11 : 4) + e.sx * 9)) / 2;   // attente : léger rebond continu
  let dx = 0, dy = -bob * (walk ? 6 : 3) * k, sx = 1 + 0.025 * (1 - bob), sy = 1 - 0.025 * (1 - bob);
  let rot = 0, red = 0, white = 0;
  const hero = heroPos(), side = Math.sign(hero.x - e.x) || 1;
  if (wind > 0) {                                                       // préparation d'un coup
    sx *= 1 + 0.07 * wind; sy *= 1 + 0.07 * wind; rot = -side * 0.07 * wind;
    red = (0.18 + 0.4 * wind) * (0.65 + 0.35 * Math.sin(A.t * 18));
  }
  const l = A.lunge.get(e);
  if (l !== undefined) {                                                // coup porté : petit bond vers le héros
    const go = Math.sin(Math.PI * l / 0.3), vx = hero.x - e.x, vy = hero.y - p.y, d = Math.hypot(vx, vy) || 1;
    dx += vx / d * 34 * k * go; dy += vy / d * 34 * k * go;
  }
  if (e.hit > 0) { white = e.hit / 0.25 * 0.85; dx += Math.sin(A.t * 80) * 4 * k * e.hit / 0.25; }
  sprite(ctx, S, p.x + dx, p.y + dy, sx, sy, rot, red, white);

  const big = e.T.special || e.T.sprite === 'boss';
  const [bw, bh] = big ? BAR.boss : BAR[e.T.sprite] || BAR.sbire;
  const hx = p.x + dx + (S.hx - S.fx) * sx, top = p.y + dy - (S.fy - S.hy) * sy - 22;
  if (G.time < e.guardUntil) drawGuard(ctx, p.x + dx, p.y + dy - (S.fy - S.hy) * 0.5, Math.min(S.fy - S.hy, 260 * k) * 0.6);
  hpBar(ctx, hx, top, bw * Math.max(0.8, k), bh, Math.max(0, e.hp / e.max), big ? 3 : 2.5);
  if (e.T.special) outlined(ctx, e.T.name, p.x + dx, p.y + dy + 16, 15, '#FFFFFF', 4, 1.5);   // nom du boss d'histoire, sous ses pieds
  if (wind > 0) outlined(ctx, '!', hx, top - 16, 26, '#FFD23F', 6, 2);
}

/** Eldan l'Oublié se protège (Rond) : cercle visible autour de lui, dégâts reçus réduits. */
function drawGuard(ctx, x, y, r) {
  ctx.save();
  ctx.globalAlpha = 0.85 + 0.15 * Math.sin(A.t * 10);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(140,240,154,0.28)'; ctx.fill();
  ctx.lineWidth = 11; ctx.strokeStyle = INK; ctx.stroke();
  ctx.lineWidth = 6; ctx.strokeStyle = '#8CF09A'; ctx.stroke();
  ctx.restore();
}

function drawDying(ctx, d) {
  const S = ART[d.sprite];
  if (!S) return;
  const p = d.t / 0.4, s = 1 - p * p;                                   // vaincu : il rétrécit…
  ctx.globalAlpha = 1 - p * 0.5;
  sprite(ctx, S, d.x, d.y - S.h * 0.3 * p, s, s, p * 0.5, 0, 0.6 * (1 - p));
  ctx.globalAlpha = 1;
}

function drawShards(ctx) {                                              // …et éclate en facettes
  for (const s of A.shards) {
    const a = 1 - s.t / s.life, r = s.s * k;
    ctx.save();
    ctx.translate(s.x, s.y); ctx.rotate(s.rot);
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.9, r * 0.7); ctx.lineTo(-r * 0.9, r * 0.6); ctx.closePath();
    ctx.fillStyle = s.col; ctx.fill();
    ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
  }
}

/** Anneau rouge qui se resserre sur le héros pendant la préparation d'un coup ennemi. */
function drawWarning(ctx, body, wind) {
  const R = ART.ring;
  if (!R) return;
  const s = 1.3 - 0.42 * wind;
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.65 * wind;
  ctx.translate(body.x, body.y); ctx.rotate(A.t * 0.6); ctx.scale(s * 0.9, s * 0.9);
  ctx.drawImage(R.img, -R.w / 2, -R.h / 2, R.w, R.h);
  ctx.restore();
}

function drawLoots(ctx) {
  for (const l of G.loots) {
    if (l.life < 1.2 && Math.floor(l.t * 8) % 2 === 0) continue;       // clignote avant de disparaître
    const S = ART[l.type === 'coin' ? 'coin' : 'heart'], bob = Math.sin(l.t * 4) * 4;
    ctx.globalAlpha = 0.5 + 0.25 * Math.sin(l.t * 5);
    ctx.lineWidth = 3; ctx.strokeStyle = '#FFD23F';
    ctx.beginPath(); ctx.arc(l.x, l.y + bob, 30 * k + Math.sin(l.t * 5) * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    if (S) ctx.drawImage(S.img, l.x - S.w / 2, l.y - S.h / 2 + bob, S.w, S.h);
  }
}

function bossShade(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  g.addColorStop(0, 'rgba(59,44,74,.28)'); g.addColorStop(1, 'rgba(59,44,74,0)');
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H * 0.55 + 20);
}

/* ---------- Effets ---------- */

function ring(ctx, x, y, r, col, w, a) {
  ctx.globalAlpha = a;
  ctx.lineWidth = w + 4; ctx.strokeStyle = INK;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
  ctx.globalAlpha = 1;
}

function line(ctx, x1, y1, x2, y2, col, w) {
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.lineWidth = w + 5; ctx.strokeStyle = INK; ctx.stroke();
  ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
}

function drawFx(ctx, body) {
  for (const f of G.fx) {
    const p = f.t / f.life;
    if (f.kind === 'bite') {                      // morsure d'une invocation de Mira
      ring(ctx, f.x, f.y, (8 + p * 18) * k, '#1A1420', 3, 1 - p);
    } else if (f.kind === 'superHit') {                  // coup de super sur chaque ennemi (Rempart, Géant)
      ring(ctx, f.x, f.y, (20 + p * 50) * k, f.col, 6, 1 - p);
      const r = 30 * k, q = Math.min(1, p * 4);
      ctx.globalAlpha = 1 - p;
      line(ctx, f.x - r, f.y - r * q, f.x + r, f.y + r * q, '#FFFFFF', 5);
      line(ctx, f.x + r, f.y - r * q, f.x - r, f.y + r * q, f.col, 5);
      ctx.globalAlpha = 1;
    } else if (f.kind === 'burst') {    // (l'entaille 'slash' est dessinée par drawImpacts, au moment du coup)
      ring(ctx, f.x, f.y, f.r * k + p * 60 * k, f.col, 5, 1 - p);
    } else if (f.kind === 'ring') {
      ring(ctx, body.x, body.y, (56 + p * 34) * k, '#3DDC5B', 4, 1 - p);
    } else if (f.kind === 'bolt') {              // impact du coup ennemi sur le héros
      ctx.globalAlpha = 1 - p;
      const x0 = f.x1 + (f.x2 - f.x1) * 0.7, y0 = f.y1 + (f.y2 - f.y1) * 0.7;
      line(ctx, x0, y0, f.x2, f.y2, '#FF5A3C', 5);
      ctx.globalAlpha = 1;
    }
  }
}

/**
 * Invocations de Mira : boule noire aux yeux blancs (en attendant un vrai sprite).
 * Elles apparaissent près du héros, volent vers leur cible, mordent à chaque dégât et s'effacent à la fin.
 */
const summonPos = new WeakMap();
function drawSummons(ctx, body, dt) {
  for (const s of G.summons) {
    const e = s.target && G.enemies.includes(s.target) ? s.target : null;
    const ang = s.id * 2.4 + A.t * 1.3;
    let gx, gy;
    if (e) { const f = enemyFoot(e); gx = f.x + Math.cos(ang) * 38 * k; gy = f.y - f.h * 0.55 + Math.sin(ang) * 22 * k; }
    else { gx = body.x + Math.cos(ang) * 72 * k; gy = body.y - 30 * k + Math.sin(ang) * 26 * k; }
    let p = summonPos.get(s);
    if (!p) { p = { x: body.x, y: body.y }; summonPos.set(s, p); }
    const f = Math.min(1, dt * 5);
    p.x += (gx - p.x) * f; p.y += (gy - p.y) * f;
    const tick = s.t % 1, bite = e && tick < 0.2 ? Math.sin(Math.PI * tick / 0.2) : 0;   // petit coup vers la cible
    let x = p.x, y = p.y + Math.sin(A.t * 7 + s.id) * 3 * k;
    if (e) { const f2 = enemyFoot(e), vx = f2.x - x, vy = f2.y - f2.h * 0.5 - y, d = Math.hypot(vx, vy) || 1; x += vx / d * 12 * k * bite; y += vy / d * 12 * k * bite; }
    const life = s.life - s.t, sc = Math.min(1, s.t / 0.3) * Math.min(1, life / 0.5), r = 12 * k * sc;
    if (r <= 0.5) continue;
    ctx.globalAlpha = Math.min(1, life / 0.5);
    ctx.fillStyle = INK; ctx.globalAlpha *= 0.25;
    ctx.beginPath(); ctx.ellipse(x, y + r * 1.6, r * 0.8, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = Math.min(1, life / 0.5);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#1A1420'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    const lx = e ? Math.sign(enemyFoot(e).x - x) * r * 0.12 : 0;                // regard vers la cible
    for (const sx of [-0.38, 0.38]) {
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x + sx * r, y - r * 0.15, r * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1A1420'; ctx.beginPath(); ctx.arc(x + sx * r + lx, y - r * 0.1, r * 0.12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/** Flèche (Kestrel) ou sort (Ilwen, Mira) en vol vers la cible. */
function drawProjectiles(ctx) {
  for (const p of A.projectiles) {
    const u = p.t / DUR.shot, ang = Math.atan2(p.ty - p.y0, p.tx - p.x0);
    const x = p.x0 + (p.tx - p.x0) * u, y = p.y0 + (p.ty - p.y0) * u - Math.sin(Math.PI * u) * 18 * k;
    ctx.save();
    ctx.translate(x, y);
    if (p.kind === 'arrow') {
      ctx.rotate(ang);
      const L = 34 * k, hw = 6 * k, hl = 11 * k;
      line(ctx, -L, 0, -hl * 0.5, 0, '#8A5530', 3);
      ctx.beginPath(); ctx.moveTo(4 * k, 0); ctx.lineTo(-hl, -hw); ctx.lineTo(-hl, hw); ctx.closePath();
      ctx.fillStyle = '#DCE5EC'; ctx.fill(); ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.stroke();
      for (const sg of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(-L - 7 * k, sg * 6 * k); ctx.lineTo(-L + 8 * k, 0); ctx.closePath();
        ctx.fillStyle = '#9ACD32'; ctx.fill(); ctx.stroke();
      }
    } else {
      for (let i = 3; i >= 1; i--) {                 // traînée de lumière
        ctx.globalAlpha = 0.18 * (4 - i);
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(-Math.cos(ang) * i * 12 * k, -Math.sin(ang) * i * 12 * k, (10 - i * 2) * k, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 0.35; ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(0, 0, 18 * k, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.rotate(A.t * 8);
      ctx.beginPath(); ctx.moveTo(0, -11 * k); ctx.lineTo(8 * k, 0); ctx.lineTo(0, 11 * k); ctx.lineTo(-8 * k, 0); ctx.closePath();
      ctx.fillStyle = p.col; ctx.fill(); ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, 3.5 * k, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

/** Sur la cible : entaille d'arme, impact de flèche ou éclat de sort. */
function drawImpacts(ctx) {
  for (const i of A.impacts) {
    const p = i.t / DUR.impact;
    if (i.kind === 'slash') {
      const q = Math.min(1, p * 4), r = 34 * k;
      ctx.globalAlpha = 1 - Math.max(0, p - 0.6) / 0.4;
      line(ctx, i.x - r, i.y - r, i.x - r + 2 * r * q, i.y - r + 2 * r * q, i.col, 7);
      line(ctx, i.x + r * 0.8, i.y - r * 0.6, i.x + r * 0.8 - 1.6 * r * q, i.y - r * 0.6 + 1.2 * r * q, '#FFFFFF', 4);
      ctx.globalAlpha = 1;
    } else {
      ring(ctx, i.x, i.y, (12 + p * 34) * k, i.col, 4, 1 - p);
      ctx.globalAlpha = 1 - p;
      const n = i.kind === 'magic' ? 6 : 4, r0 = (10 + p * 30) * k, r1 = r0 + 12 * k;
      for (let j = 0; j < n; j++) {
        const a = j * 2 * Math.PI / n + (i.kind === 'magic' ? A.t : Math.PI / 4);
        line(ctx, i.x + Math.cos(a) * r0, i.y + Math.sin(a) * r0, i.x + Math.cos(a) * r1, i.y + Math.sin(a) * r1, i.kind === 'magic' ? i.col : '#FFFFFF', 3);
      }
      ctx.globalAlpha = 1;
    }
  }
}

/* ---------- Tracés (comme TS.trace de la maquette : halo, ombre, cœur doré, fil blanc) ---------- */

function trace(ctx, pts, a, glow, tip) {
  if (pts.length < 2) return;
  const path = new Path2D();
  path.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) path.lineTo(pts[i].x, pts[i].y);
  const last = pts[pts.length - 1];
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha = a * 0.35; ctx.strokeStyle = glow; ctx.lineWidth = 30 * k; ctx.stroke(path);
  ctx.globalAlpha = a * 0.3; ctx.strokeStyle = INK; ctx.lineWidth = 19 * k; ctx.stroke(path);
  const g = ctx.createLinearGradient(pts[0].x, pts[0].y, last.x, last.y);
  g.addColorStop(0, 'rgba(255,210,63,.45)'); g.addColorStop(1, '#FFF4C4');
  ctx.globalAlpha = a; ctx.strokeStyle = g; ctx.lineWidth = 14 * k; ctx.stroke(path);
  ctx.globalAlpha = a * 0.9; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 5 * k; ctx.stroke(path);
  if (tip) {
    ctx.globalAlpha = a * 0.4; ctx.fillStyle = '#FFD23F';
    ctx.beginPath(); ctx.arc(last.x, last.y, 24 * k, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = a; ctx.lineWidth = 3.5; ctx.strokeStyle = '#FFD23F';
    ctx.beginPath(); ctx.arc(last.x, last.y, 13 * k, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(last.x, last.y, 8 * k, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTrails(ctx) {
  for (const t of G.trails) trace(ctx, t.pts, 0.7 * (1 - t.t / t.life), t.col, false);
  if (G.drawing) trace(ctx, G.drawing.pts, 1, '#FFD23F', true);
}

/* ---------- Textes ---------- */

function outlined(ctx, text, x, y, size, fill, stroke, shadow, font = HEAD, weight = 400) {
  ctx.font = weight + ' ' + size + 'px ' + font;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = stroke; ctx.strokeStyle = INK;
  if (shadow) { ctx.fillStyle = INK; ctx.strokeText(text, x, y + shadow); ctx.fillText(text, x, y + shadow); }
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
}

function drawPops(ctx) {
  for (const p of G.pops) {
    const q = p.t / p.life, y = p.y - q * 30;
    ctx.globalAlpha = 1 - q * q;
    outlined(ctx, p.text, p.x, y, p.size, p.col, Math.max(5, p.size * 0.26), 2);
    if (p.sub) outlined(ctx, p.sub, p.x, y + p.size * 0.5 + 10, 13, '#FFF1D6', 4, 0, BODY, 700);
  }
  ctx.globalAlpha = 1;
}

/** Grand texte de réussite (« Excellent », « Perfect »…) et pastille « Attaque · 92 % ». */
function drawGrade(ctx, W, H) {
  const b = G.bigGrade;
  if (!b) return;
  const q = b.t / 1.1, size = 60 * Math.min(1, W / 390);
  const sc = q < 0.12 ? 0.6 + q / 0.12 * 0.5 : q < 0.2 ? 1.1 - (q - 0.12) / 0.08 * 0.1 : 1;
  ctx.save();
  ctx.globalAlpha = q > 0.7 ? (1 - q) / 0.3 : 1;
  ctx.translate(W / 2, H * 0.5); ctx.scale(sc, sc);
  ctx.save(); ctx.rotate(-4 * Math.PI / 180);
  outlined(ctx, b.text, 0, 0, size, b.col, 8, 5);
  ctx.restore();
  const label = b.label + (b.acc != null ? ' · ' + b.acc + ' %' : ''), gl = ART[GLYPH[b.label]];
  ctx.font = '700 15px ' + BODY;
  const tw = ctx.measureText(label).width, gw = gl ? 22 + 7 : 0, pw = 9 + gw + tw + 14, ph = 34, py = size * 0.55 + 12;
  rr(ctx, -pw / 2, py + 3, pw, ph, ph / 2); ctx.fillStyle = INK; ctx.fill();
  rr(ctx, -pw / 2, py, pw, ph, ph / 2); ctx.fillStyle = '#174A28'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  if (gl) ctx.drawImage(gl.img, -pw / 2 + 9, py + (ph - 22) / 2, 22, 22);
  ctx.fillStyle = '#FFF1D6'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(label, -pw / 2 + 9 + gw, py + ph / 2 + 1);
  ctx.restore();
}

/* ---------- Formes ---------- */

function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hpBar(ctx, cx, top, w, h, ratio, border) {
  const x = cx - w / 2;
  rr(ctx, x, top + 2, w, h, h / 2); ctx.fillStyle = INK; ctx.fill();
  rr(ctx, x, top, w, h, h / 2); ctx.fillStyle = '#2A1F36'; ctx.fill();
  if (ratio > 0) {
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#FF5A3C'; ctx.fillRect(x, top, w * ratio, h);
    ctx.fillStyle = '#FF8A70'; ctx.fillRect(x, top, w * ratio, h * 0.45);
    ctx.fillStyle = INK; ctx.fillRect(x + w * ratio - border / 2, top, border, h);
    ctx.restore();
  }
  rr(ctx, x, top, w, h, h / 2); ctx.lineWidth = border; ctx.strokeStyle = INK; ctx.stroke();
}
