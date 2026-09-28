// Sons synthétisés en code (Web Audio API).
// - Les notes de réussite (OK → Perfect) sont définitives : une petite mélodie magique qui monte d'une note par niveau.
// - Tout le reste est provisoire : un son de remplacement par id d'effet et une petite boucle par musique,
//   joués tant que le fichier assets/audio/... correspondant n'existe pas.

const midi = n => 440 * Math.pow(2, (n - 69) / 12);
let noiseBuf = null;

function noiseBuffer(ctx) {
  if (noiseBuf) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

/** Enveloppe simple : montée en `a` s, puis décroissance exponentielle jusqu'à `t + dur`. */
function env(g, t, vol, a, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

/** Note : oscillateur de type `type`, glissando facultatif vers f2. */
function tone(ctx, out, { f, f2, type = 'sine', t = 0, dur = 0.2, vol = 0.3, a = 0.005 }) {
  const t0 = ctx.currentTime + t, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  env(g, t0, vol, a, dur);
  o.connect(g).connect(out);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

/** Souffle filtré (whoosh, choc) : bruit passé dans un filtre dont la fréquence peut glisser de f à f2. */
function noise(ctx, out, { f = 1200, f2, q = 1, ftype = 'bandpass', t = 0, dur = 0.2, vol = 0.3, a = 0.01 }) {
  const t0 = ctx.currentTime + t, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuffer(ctx);
  fl.type = ftype; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t0);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  env(g, t0, vol, a, dur);
  s.connect(fl).connect(g).connect(out);
  s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.05);
}

/** Cloche douce : fondamentale + octave, pour les notes magiques. */
function bell(ctx, out, f, t, vol, dur = 0.5) {
  tone(ctx, out, { f, type: 'sine', t, dur, vol, a: 0.004 });
  tone(ctx, out, { f: f * 2, type: 'sine', t, dur: dur * 0.6, vol: vol * 0.35, a: 0.004 });
  tone(ctx, out, { f: f * 3.01, type: 'triangle', t, dur: dur * 0.25, vol: vol * 0.12, a: 0.002 });
}
const chord = (ctx, out, notes, t, vol, dur, type = 'triangle') =>
  notes.forEach(n => tone(ctx, out, { f: midi(n), type, t, dur, vol: vol / notes.length, a: 0.02 }));
const arp = (ctx, out, notes, step, vol, dur = 0.25, type = 'triangle') =>
  notes.forEach((n, i) => tone(ctx, out, { f: midi(n), type, t: i * step, dur, vol }));

/* ---------- Notes de réussite (définitives) ---------- */
// Pentatonique majeure qui monte : OK = 1 note, Good = 2, Very Good = 3, Excellent = 4,
// Perfect = les 5 puis un accord brillant avec un léger écho.
const MELODY = [76, 79, 81, 83, 86];          // mi, sol, la, si, ré (octave 5-6)
const PERFECT = [88, 92, 95, 100];            // accord de mi majeur brillant

export function gradeNotes(ctx, out, level) {
  const n = Math.max(1, Math.min(5, level)), step = 0.065;
  for (let i = 0; i < n; i++) bell(ctx, out, midi(MELODY[i]), i * step, 0.22 + i * 0.02, 0.35 + i * 0.05);
  if (n < 5) return;
  // Écho : une ligne à retard avec un peu de réinjection, seulement pour le Perfect.
  const d = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain();
  d.delayTime.value = 0.16; fb.gain.value = 0.32; wet.gain.value = 0.5;
  d.connect(fb).connect(d); d.connect(wet).connect(out);
  const bus = ctx.createGain(); bus.connect(out); bus.connect(d);
  PERFECT.forEach((m, i) => bell(ctx, bus, midi(m), n * step + i * 0.012, 0.16, 0.9));
  setTimeout(() => { try { d.disconnect(); fb.disconnect(); wet.disconnect(); bus.disconnect(); } catch (_) {} }, 3000);
}

/* ---------- Effets provisoires ---------- */
const SFX = {
  ui_clic: (c, o) => tone(c, o, { f: 880, f2: 1100, dur: 0.06, vol: 0.25 }),
  ui_onglet: (c, o) => { tone(c, o, { f: 660, dur: 0.06, vol: 0.22 }); tone(c, o, { f: 990, t: 0.05, dur: 0.08, vol: 0.22 }); },
  texte: (c, o) => tone(c, o, { f: 1400 + Math.random() * 200, type: 'triangle', dur: 0.025, vol: 0.12 }),
  page: (c, o) => noise(c, o, { f: 800, f2: 2600, q: 0.8, dur: 0.18, vol: 0.18, a: 0.03 }),
  geste_rate: (c, o) => { tone(c, o, { f: 220, f2: 180, type: 'square', dur: 0.12, vol: 0.12 }); tone(c, o, { f: 165, f2: 120, type: 'square', t: 0.1, dur: 0.18, vol: 0.12 }); },
  attaque: (c, o) => { noise(c, o, { f: 3000, f2: 700, q: 1.2, dur: 0.16, vol: 0.35 }); tone(c, o, { f: 180, f2: 90, dur: 0.1, vol: 0.2, t: 0.06 }); },
  coup_recu: (c, o) => { tone(c, o, { f: 140, f2: 45, dur: 0.25, vol: 0.5 }); noise(c, o, { f: 500, ftype: 'lowpass', dur: 0.15, vol: 0.3 }); },
  esquive: (c, o) => noise(c, o, { f: 600, f2: 3600, q: 1.5, dur: 0.22, vol: 0.3, a: 0.02 }),
  alerte: (c, o) => { tone(c, o, { f: 880, type: 'triangle', dur: 0.1, vol: 0.18 }); tone(c, o, { f: 660, type: 'triangle', t: 0.11, dur: 0.14, vol: 0.18 }); },
  ennemi_vaincu: (c, o) => { arp(c, o, [84, 79, 76, 72], 0.045, 0.14, 0.18); noise(c, o, { f: 2000, q: 0.7, dur: 0.12, vol: 0.2 }); },
  piece: (c, o) => { tone(c, o, { f: 988, type: 'square', dur: 0.07, vol: 0.1 }); tone(c, o, { f: 1319, type: 'square', t: 0.07, dur: 0.2, vol: 0.1 }); },
  coeur: (c, o) => arp(c, o, [72, 76, 79], 0.07, 0.16, 0.3, 'sine'),
  combo: (c, o) => arp(c, o, [72, 76, 79, 84, 88], 0.04, 0.12, 0.25),
  super_pleine: (c, o) => { chord(c, o, [72, 76, 79, 84], 0, 0.35, 0.9, 'sine'); noise(c, o, { f: 4000, q: 2, dur: 0.6, vol: 0.08, a: 0.3 }); },
  super_aldric: (c, o) => { chord(c, o, [60, 64, 67], 0, 0.45, 0.6, 'sawtooth'); chord(c, o, [67, 72, 76], 0.18, 0.45, 0.8, 'sawtooth'); },
  super_nyra: (c, o) => { noise(c, o, { f: 5000, f2: 800, q: 2, dur: 0.25, vol: 0.3 }); arp(c, o, [84, 91, 96], 0.05, 0.1, 0.2, 'square'); },
  super_boran: (c, o) => { tone(c, o, { f: 90, f2: 40, dur: 0.6, vol: 0.6 }); noise(c, o, { f: 300, ftype: 'lowpass', dur: 0.5, vol: 0.4 }); },
  super_ilwen: (c, o) => arp(c, o, [74, 78, 81, 86, 90, 93], 0.05, 0.12, 0.4, 'sine'),
  super_kestrel: (c, o) => { tone(c, o, { f: 2400, f2: 900, dur: 0.3, vol: 0.18 }); noise(c, o, { f: 3000, f2: 1500, q: 3, dur: 0.3, vol: 0.2 }); },
  super_mira: (c, o) => { chord(c, o, [65, 69, 72, 77], 0, 0.4, 1.1, 'sine'); arp(c, o, [84, 88, 91], 0.1, 0.08, 0.5, 'sine'); },
  boss_apparition: (c, o) => { tone(c, o, { f: 55, dur: 1.4, vol: 0.5, a: 0.4 }); tone(c, o, { f: 82.4, dur: 1.4, vol: 0.3, a: 0.4 }); noise(c, o, { f: 200, ftype: 'lowpass', dur: 0.4, vol: 0.4, t: 0.9 }); },
  nouvelle_arene: (c, o) => { arp(c, o, [67, 72, 76, 79], 0.1, 0.14, 0.35); chord(c, o, [72, 76, 79, 84], 0.42, 0.4, 0.9); },
  victoire: (c, o) => { arp(c, o, [72, 76, 79], 0.12, 0.15, 0.3); chord(c, o, [72, 76, 79, 84], 0.38, 0.45, 1.2); },
  defaite: (c, o) => arp(c, o, [67, 63, 60, 55], 0.22, 0.15, 0.5, 'triangle'),
  deblocage: (c, o) => { chord(c, o, [76, 80, 83, 88], 0, 0.4, 1.1, 'sine'); arp(c, o, [88, 91, 95, 100], 0.07, 0.08, 0.4, 'sine'); }
};

export function playSfx(ctx, out, id) {
  const f = SFX[id] || SFX.ui_clic;
  f(ctx, out);
}

/** Tracé : souffle doux en boucle ; renvoie de quoi l'arrêter. */
export function traceLoop(ctx, out) {
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter();
  s.buffer = noiseBuffer(ctx); s.loop = true;
  fl.type = 'bandpass'; fl.frequency.value = 1800; fl.Q.value = 0.9;
  const g = ctx.createGain(); g.gain.value = 0.25;
  s.connect(fl).connect(g).connect(out);
  s.start();
  return () => { try { s.stop(); } catch (_) {} };
}

/* ---------- Musiques provisoires ---------- */
// Une petite boucle de 4 mesures par musique : nappe, arpège, basse, et percussions pour le boss.
const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10];
const MUSIC = {
  musique_lobby:    { bpm: 100, root: 60, scale: MAJ, prog: [0, 4, 5, 3], arp: 1, bass: 1 },
  musique_tuto:     { bpm: 90,  root: 62, scale: MAJ, prog: [0, 3, 0, 4], arp: 0.5, bass: 1 },
  musique_nature:   { bpm: 84,  root: 65, scale: MAJ, prog: [0, 5, 3, 4], arp: 1, bass: 1 },
  musique_cite:     { bpm: 108, root: 62, scale: MIN, prog: [0, 6, 5, 6], arp: 1, bass: 1, pluck: 1 },
  musique_hauteurs: { bpm: 76,  root: 57, scale: MIN, prog: [0, 5, 2, 6], arp: 0.5, bass: 1 },
  musique_coeur:    { bpm: 64,  root: 55, scale: MIN, prog: [0, 3, 0, 4], arp: 0, bass: 0 },
  musique_boss:     { bpm: 132, root: 57, scale: MIN, prog: [0, 0, 5, 6], arp: 1, bass: 2, drums: 1 },
  musique_triste:   { bpm: 66,  root: 57, scale: MIN, prog: [0, 5, 3, 4], arp: 0.5, bass: 0 },
  musique_epilogue: { bpm: 72,  root: 60, scale: MAJ, prog: [3, 4, 2, 5], arp: 1, bass: 1 }
};

function chordNotes(M, deg) {
  const s = M.scale, n = i => M.root + s[(deg + i) % 7] + 12 * Math.floor((deg + i) / 7);
  return [n(0), n(2), n(4)];
}

/** Joue la boucle de la musique `id` vers `out` ; renvoie une fonction d'arrêt. */
export function musicLoop(ctx, out, id) {
  const M = MUSIC[id] || MUSIC.musique_lobby, sixteenth = 60 / M.bpm / 4;
  let step = 0, next = ctx.currentTime + 0.05, alive = true;
  const at = t => t - ctx.currentTime;
  const tick = () => {
    if (!alive) return;
    while (next < ctx.currentTime + 0.25) {
      const bar = Math.floor(step / 16) % M.prog.length, s16 = step % 16, ch = chordNotes(M, M.prog[bar]), t = at(next);
      if (s16 === 0) chord(ctx, out, ch.map(n => n - 12), t, 0.16, sixteenth * 16, 'triangle');               // nappe
      if (M.arp && s16 % (M.arp >= 1 ? 2 : 4) === 0) {                                                      // arpège
        const k = (s16 / 2) % 4, note = [ch[0], ch[1], ch[2], ch[1] + 12][k] + 12;
        tone(ctx, out, { f: midi(note), type: M.pluck ? 'square' : 'sine', t, dur: M.pluck ? 0.12 : sixteenth * 3, vol: M.pluck ? 0.035 : 0.07 });
      }
      if (M.bass && (s16 === 0 || s16 === 8 || (M.bass > 1 && s16 % 4 === 0)))                           // basse
        tone(ctx, out, { f: midi(ch[0] - 24), type: 'triangle', t, dur: sixteenth * 3.5, vol: 0.18 });
      if (M.drums) {                                                                                        // percussions
        if (s16 % 4 === 0) tone(ctx, out, { f: 120, f2: 45, t, dur: 0.18, vol: 0.4 });
        if (s16 % 4 === 2) noise(ctx, out, { f: 7000, ftype: 'highpass', t, dur: 0.05, vol: 0.08 });
        if (s16 === 12) noise(ctx, out, { f: 1500, q: 0.8, t, dur: 0.12, vol: 0.2 });
      }
      step++; next += sixteenth;
    }
  };
  tick();
  const timer = setInterval(tick, 60);
  return () => { alive = false; clearInterval(timer); };
}
