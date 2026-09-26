// Rendu canvas : arène, héros, ennemis, effets, HUD. Ne modifie jamais l'état du jeu.
import { D } from '../data.js';
import { G, heroPos } from '../game/state.js';
import { rand } from '../util.js';
import { gradeByName } from '../game/grades.js';

export function draw(ctx) {
  const { W, H } = G;
  const inGame = G.mode === 'play' || G.mode === 'train';
  ctx.save();
  if (G.shake > 0) ctx.translate(rand(-8, 8) * G.shake, rand(-8, 8) * G.shake);
  drawArena(ctx, W, H);
  const h = heroPos();
  drawLoots(ctx);
  for (const e of G.enemies) drawEnemy(ctx, e, h);
  drawHero(ctx, h, inGame && G.time < G.hero.shieldUntil);
  drawFx(ctx, h);
  drawTrails(ctx);
  drawTexts(ctx, W, H);
  if (G.mode === 'play') drawHud(ctx, W);
  if (inGame && G.streak.n > 0) drawStreak(ctx, W, H);
  ctx.restore();
}

function drawArena(ctx, W, H) {
  ctx.fillStyle = '#17123A'; ctx.fillRect(-20, -20, W + 40, H + 40);
  const g = ctx.createRadialGradient(W / 2, H * 0.55, 10, W / 2, H * 0.55, Math.max(W, H) * 0.7);
  g.addColorStop(0, '#2E2470'); g.addColorStop(1, '#17123A');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(W / 2, H * 0.78 + 34, Math.min(W * 0.42, 200), 26, 0, 0, Math.PI * 2); ctx.stroke();
}

function drawLoots(ctx) {
  for (const l of G.loots) {
    const blink = l.life < 1.2 && Math.floor(l.t * 8) % 2 === 0;
    if (blink) continue;
    const bob = Math.sin(l.t * 4) * 4;
    ctx.save(); ctx.translate(l.x, l.y + bob);
    ctx.strokeStyle = 'rgba(255,201,74,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 26 + Math.sin(l.t * 5) * 3, 0, Math.PI * 2); ctx.stroke();
    if (l.type === 'coin') {
      ctx.fillStyle = '#FFC94A'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#C98F10'; ctx.fillRect(-2, -7, 4, 14);
    } else {
      ctx.fillStyle = '#FF6F9B'; ctx.beginPath(); ctx.moveTo(0, 10);
      ctx.bezierCurveTo(-18, -2, -9, -17, 0, -7); ctx.bezierCurveTo(9, -17, 18, -2, 0, 10); ctx.fill();
    }
    ctx.restore();
  }
}

function drawEnemy(ctx, e, h) {
  const r = e.T.r, crown = e.T.shape === 'crown';
  const wind = e.state === 'windup' ? e.t / e.T.wind : 0;
  const top = -r - (crown ? r * 0.4 : 0);
  ctx.save(); ctx.translate(e.x, e.y);
  if (wind > 0) {
    ctx.fillStyle = 'rgba(255,93,115,' + (0.15 + 0.25 * wind) + ')';
    ctx.beginPath(); ctx.arc(0, 0, r + 10 + 6 * Math.sin(e.t * 20), 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = e.hit > 0 ? '#FFFFFF' : e.T.col;
  ctx.beginPath();
  if (crown) {
    ctx.moveTo(-r, r * 0.6); ctx.lineTo(-r, -r * 0.4); ctx.lineTo(-r * 0.6, -r * 1.1); ctx.lineTo(-r * 0.25, -r * 0.6);
    ctx.lineTo(0, -r * 1.25); ctx.lineTo(r * 0.25, -r * 0.6); ctx.lineTo(r * 0.6, -r * 1.1); ctx.lineTo(r, -r * 0.4);
    ctx.lineTo(r, r * 0.6); ctx.quadraticCurveTo(0, r * 1.1, -r, r * 0.6);
  } else if (ctx.roundRect) ctx.roundRect(-r, -r, r * 2, r * 2, r * 0.5);
  else ctx.rect(-r, -r, r * 2, r * 2);
  ctx.fill();
  ctx.fillStyle = '#17123A'; ctx.beginPath();
  ctx.arc(-r * 0.35, -r * 0.1, r * 0.16, 0, Math.PI * 2); ctx.arc(r * 0.35, -r * 0.1, r * 0.16, 0, Math.PI * 2); ctx.fill();
  // Barre de vie
  const bw = r * 2;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-bw / 2, top - 14, bw, 5);
  ctx.fillStyle = e.T.col; ctx.fillRect(-bw / 2, top - 14, bw * Math.max(0, e.hp / e.max), 5);
  if (wind > 0) { ctx.fillStyle = '#FFFFFF'; ctx.font = '900 22px system-ui'; ctx.textAlign = 'center'; ctx.fillText('!', 0, top - 22); }
  ctx.restore();
  // Anneau d'alerte qui se resserre sur le héros
  if (wind > 0) {
    const rr = 34 + (1 - wind) * 80;
    ctx.strokeStyle = 'rgba(255,93,115,' + (0.4 + 0.6 * wind) + ')'; ctx.lineWidth = 3 + wind * 3;
    ctx.beginPath(); ctx.arc(h.x, h.y, rr, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawHero(ctx, h, shielded) {
  ctx.save(); ctx.translate(h.x, h.y);
  if (shielded) {
    ctx.fillStyle = 'rgba(63,215,196,.18)'; ctx.strokeStyle = 'rgba(63,215,196,.9)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 48, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = G.hero.flash > 0 ? '#FF5D73' : '#E9E3FF';
  ctx.beginPath(); ctx.arc(0, -6, 24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#17123A'; ctx.fillRect(-14, -12, 28, 6);
  ctx.fillStyle = '#FFC94A'; ctx.beginPath(); ctx.moveTo(18, 4); ctx.lineTo(36, 4); ctx.lineTo(36, 18);
  ctx.quadraticCurveTo(27, 30, 18, 18); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#E9E3FF'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-26, 10); ctx.lineTo(-40, -26); ctx.stroke();
  ctx.restore();
}

function drawFx(ctx, h) {
  for (const f of G.fx) {
    const k = f.t / f.life;
    ctx.strokeStyle = f.col; ctx.globalAlpha = 1 - k;
    if (f.kind === 'slash' || f.kind === 'bolt') {
      const p = Math.min(1, k * 3);
      ctx.lineWidth = f.kind === 'slash' ? 6 : 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x1 + (f.x2 - f.x1) * p, f.y1 + (f.y2 - f.y1) * p); ctx.stroke();
    } else if (f.kind === 'burst') {
      ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, f.y, f.r + k * 50, 0, Math.PI * 2); ctx.stroke();
    } else if (f.kind === 'ring') {
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h.x, h.y, 48 + k * 30, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function strokePts(ctx, p, col, w) {
  if (p.length < 2) return;
  ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y);
  for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
  ctx.stroke();
}

function drawTrails(ctx) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const t of G.trails) { ctx.globalAlpha = 1 - t.t / t.life; strokePts(ctx, t.pts, t.col, 7); }
  ctx.globalAlpha = 1;
  if (G.drawing) strokePts(ctx, G.drawing.pts, '#FFC94A', 8);
}

function drawTexts(ctx, W, H) {
  ctx.textAlign = 'center';
  for (const p of G.pops) {
    const k = p.t / p.life;
    ctx.globalAlpha = 1 - k * k; ctx.fillStyle = p.col;
    ctx.font = '900 ' + p.size + 'px system-ui'; ctx.fillText(p.text, p.x, p.y - k * 30);
    if (p.sub) { ctx.font = '600 13px system-ui'; ctx.fillText(p.sub, p.x, p.y - k * 30 + 18); }
  }
  ctx.globalAlpha = 1;
  const b = G.bigGrade;
  if (b) {
    const k = b.t / 1.1, sc = k < 0.15 ? 0.7 + k * 2 : 1;
    ctx.save(); ctx.translate(W / 2, H * 0.6); ctx.scale(sc, sc); ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    ctx.fillStyle = b.col; ctx.font = '900 40px system-ui'; ctx.fillText(b.text, 0, 0);
    ctx.font = '600 15px system-ui'; ctx.fillStyle = '#F4EEFF';
    ctx.fillText(b.label + (b.acc != null ? ' · ' + b.acc + ' %' : ''), 0, 24);
    ctx.restore();
  }
}

function drawHud(ctx, W) {
  const top = G.safeTop + 14, hero = G.hero, nWaves = D.waves.waves.length;
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(16, top, 150, 12);
  ctx.fillStyle = hero.hp > 30 ? '#3FD7C4' : '#FF5D73'; ctx.fillRect(16, top, 150 * hero.hp / hero.max, 12);
  ctx.fillStyle = '#F4EEFF'; ctx.font = '700 13px system-ui'; ctx.textAlign = 'left';
  ctx.fillText(Math.ceil(hero.hp) + ' PV', 16, top + 30);
  ctx.textAlign = 'center'; ctx.font = '900 20px system-ui';
  ctx.fillText(Math.max(0, Math.ceil(D.waves.timeLimit - G.time)) + ' s', W / 2, top + 12);
  ctx.font = '600 12px system-ui'; ctx.fillStyle = '#9C93C9';
  ctx.fillText('Vague ' + Math.min(G.waveIdx, nWaves) + ' / ' + nWaves, W / 2, top + 30);
  ctx.textAlign = 'left'; ctx.fillStyle = '#FFC94A'; ctx.font = '900 18px system-ui';
  ctx.fillText(G.score + ' pts', 16, top + 52);
}

function drawStreak(ctx, W, H) {
  const g = gradeByName(G.streak.name), y = H * 0.78 + 62, n = D.grades.comboLength;
  ctx.textAlign = 'center'; ctx.font = '700 13px system-ui'; ctx.fillStyle = g.col;
  ctx.fillText('Série ' + G.streak.name, W / 2, y);
  for (let i = 0; i < n; i++) {
    ctx.beginPath(); ctx.arc(W / 2 - 9 * (n - 1) + i * 18, y + 14, 5, 0, Math.PI * 2);
    if (i < G.streak.n) { ctx.fillStyle = g.col; ctx.fill(); }
    else { ctx.strokeStyle = g.col; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
}
