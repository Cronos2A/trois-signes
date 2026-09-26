// Rendu canvas du combat, d'après la maquette design/ecran-de-combat-trois-signes :
// sprites (héros choisi, sbires, brute, boss, objets), anneau d'alerte, tracés, textes de réussite.
// Le décor est peint une fois dans un canvas de fond (ui/combat-art.js) ; les barres du haut et la
// série du bas sont en HTML (ui/combat-hud.js). Ne modifie jamais l'état du jeu.
import { G, heroPos } from '../game/state.js';
import { gradeByName } from '../game/grades.js';
import { ART, artScale } from './combat-art.js';
import { A, updateAnims, heroPose } from './anim.js';
import { updateHud, HUD_BOTTOM } from './combat-hud.js';

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
  if (G.enemies.some(e => e.T.sprite === 'boss')) bossShade(ctx, W, H);
  drawLoots(ctx);
  const list = G.enemies.map(e => ({ e, p: enemyFoot(e) })).sort((a, b) => a.p.y - b.p.y);
  for (const d of A.dying) drawDying(ctx, d);
  for (const { e, p } of list) drawEnemy(ctx, e, p);
  const body = drawHero(ctx);
  const w = G.enemies.find(e => e.state === 'windup');
  if (w) drawWarning(ctx, body, w.t / w.T.wind);
  drawFx(ctx, body);
  drawShards(ctx);
  drawTrails(ctx);
  drawPops(ctx);
  drawGrade(ctx, W, H);
  ctx.restore();
}

/* ---------- Placement ---------- */

/** Pieds de l'ennemi à l'écran. La logique donne le centre ; on garde la tête sous le bandeau du haut. */
function enemyFoot(e) {
  const S = ART[e.T.sprite];
  if (!S) return { x: e.x, y: e.y, h: 0 };
  const ty = e.sy * G.H;
  const minFoot = G.safeTop + HUD_BOTTOM + 34 + (S.fy - S.hy);
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
  // Sans calque de bras armé (arc de Kestrel), c'est tout le sprite qui s'incline pour frapper.
  heroSprite(ctx, S, Arm, x, y, P.sx, P.sy, P.rot + (Arm ? 0 : P.arm * 0.15), P);
  const body = { x, y: y - S.h * 0.5 };
  if ((G.mode === 'play' || G.mode === 'train') && G.time < G.hero.shieldUntil) {
    ring(ctx, body.x, body.y, 64 * k, '#3DDC5B', 4, 0.9);
    ctx.globalAlpha = 0.16; ctx.fillStyle = '#3DDC5B';
    ctx.beginPath(); ctx.arc(body.x, body.y, 64 * k, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  return body;
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

  const [bw, bh] = BAR[e.T.sprite] || BAR.sbire;
  const hx = p.x + dx + (S.hx - S.fx) * sx, top = p.y + dy - (S.fy - S.hy) * sy - 22;
  hpBar(ctx, hx, top, bw * Math.max(0.8, k), bh, Math.max(0, e.hp / e.max), e.T.sprite === 'boss' ? 3 : 2.5);
  if (wind > 0) outlined(ctx, '!', hx, top - 16, 26, '#FFD23F', 6, 2);
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
    if (f.kind === 'slash') {                    // entaille sur la cible, quand le héros l'atteint
      const q = Math.min(1, Math.max(0, (p - 0.45) * 4)), r = 34 * k;
      if (q <= 0) continue;
      ctx.globalAlpha = 1 - Math.max(0, p - 0.7) / 0.3;
      line(ctx, f.x2 - r, f.y2 - r, f.x2 - r + 2 * r * q, f.y2 - r + 2 * r * q, f.col, 7);
      line(ctx, f.x2 + r * 0.8, f.y2 - r * 0.6, f.x2 + r * 0.8 - 1.6 * r * q, f.y2 - r * 0.6 + 1.2 * r * q, '#FFFFFF', 4);
      ctx.globalAlpha = 1;
    } else if (f.kind === 'burst') {
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
