// Gestionnaire audio unique du jeu (Web Audio API), réglages dans data/audio.json.
// Deux canaux : Musique et Effets, chacun avec son volume (Réglages du lobby, game/settings.js).
// Les fichiers se branchent seuls : assets/audio/sfx/{id}.mp3 et assets/audio/musique/{id}.mp3.
// Tant qu'un fichier manque, un son provisoire est synthétisé (audio/synth.js) : jamais d'erreur ni de silence.
// Effets chargés au démarrage, musiques à la demande. Audio débloqué au premier toucher (mobile),
// coupé quand l'application passe en arrière-plan et repris au retour.
import { D } from '../data.js';
import { settings, onSettings } from '../game/settings.js';
import * as S from './synth.js';

const A = () => D.audio;
let ctx = null, master, musicBus, duckBus, sfxBus, unlocked = false;
const sfxBuf = {};            // id → AudioBuffer, ou null si le fichier manque
const musicBuf = new Map();   // id → Promise<AudioBuffer | null>

/** Charge et décode un fichier ; null s'il manque ou ne se décode pas (aucune erreur remontée). */
async function load(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = await r.arrayBuffer();
    return await new Promise(ok => ctx.decodeAudioData(data, ok, () => ok(null)));
  } catch (_) { return null; }
}
const url = (kind, id) => A().paths[kind] + id + A().paths.ext;

function applyVolumes() {
  if (!ctx) return;
  const t = ctx.currentTime, V = A().volumes;
  musicBus.gain.setTargetAtTime(V.music * settings.music, t, 0.05);
  sfxBus.gain.setTargetAtTime(V.sfx * settings.sfx, t, 0.05);
}

/** Démarrage : crée le contexte (suspendu jusqu'au premier toucher) et charge les effets. */
export function initAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC || ctx) return;
  try { ctx = new AC({ latencyHint: 'interactive' }); } catch (_) { return; }
  master = ctx.createGain(); master.connect(ctx.destination);
  musicBus = ctx.createGain(); duckBus = ctx.createGain(); sfxBus = ctx.createGain();
  duckBus.connect(musicBus).connect(master); sfxBus.connect(master);
  applyVolumes();
  onSettings(k => { if (k === 'music' || k === 'sfx') applyVolumes(); });
  for (const id of A().sfx) load(url('sfx', id)).then(b => { sfxBuf[id] = b; });

  // Déblocage au premier toucher (obligatoire sur iPhone et Android).
  const unlock = () => {
    if (document.hidden) return;
    ctx.resume().then(() => {
      if (ctx.state !== 'running') return;
      unlocked = true;
      const s = ctx.createBufferSource();                         // tampon muet : débloque iOS
      s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start();
      for (const t of EV) removeEventListener(t, unlock, true);
    }).catch(() => {});
  };
  const EV = ['pointerdown', 'touchend', 'click', 'keydown'];
  for (const t of EV) addEventListener(t, unlock, true);

  // Arrière-plan : on coupe tout, on reprend au retour.
  const vis = () => {
    if (document.hidden) { traceStop(); ctx.suspend().catch(() => {}); }
    else if (unlocked) ctx.resume().catch(() => {});
  };
  document.addEventListener('visibilitychange', vis);
  addEventListener('pagehide', () => ctx.suspend().catch(() => {}));
  addEventListener('pageshow', vis);
}

const recent = [];              // derniers effets joués (état de débogage)
const live = () => ctx && unlocked && ctx.state === 'running';

/** Petit gain dédié à un son (volume relatif de data/audio.json → volumes.sfxGain). */
function out(id) {
  const g = ctx.createGain();
  g.gain.value = A().volumes.sfxGain[id] ?? 1;
  g.connect(sfxBus);
  setTimeout(() => g.disconnect(), 4000);
  return g;
}

/** Joue un effet : son fichier s'il existe, sinon le son provisoire. */
export function sfx(id) {
  if (!live()) return;
  recent.push(id); if (recent.length > 30) recent.shift();
  try {
    const b = sfxBuf[id];
    if (b) { const s = ctx.createBufferSource(); s.buffer = b; s.connect(out(id)); s.start(); }
    else S.playSfx(ctx, out(id), id);
  } catch (_) { /* le jeu continue sans ce son */ }
}

/** Notes de réussite (définitives, en code) : 1 note pour OK … 5 notes + accord avec écho pour Perfect. */
export function gradeNotes(level) {
  if (!live()) return;
  recent.push('notes' + level);
  try { S.gradeNotes(ctx, out('grades'), level); } catch (_) {}
}

/* ---------- Tracé : boucle douce pendant que le doigt trace ---------- */
let trace = null;
export function traceStart() {
  if (trace || !live()) return;
  const g = ctx.createGain(), t = ctx.currentTime, F = A().traceFade;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(A().volumes.sfxGain.trace ?? 1, t + F);
  g.connect(sfxBus);
  let stop;
  if (sfxBuf.trace) {
    const s = ctx.createBufferSource(); s.buffer = sfxBuf.trace; s.loop = true; s.connect(g); s.start();
    stop = () => { try { s.stop(); } catch (_) {} };
  } else stop = S.traceLoop(ctx, g);
  trace = { g, stop };
}
export function traceStop() {
  if (!trace) return;
  const { g, stop } = trace, F = A().traceFade;
  trace = null;
  try {
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0.0001, t + F);
  } catch (_) {}
  setTimeout(() => { stop(); g.disconnect(); }, F * 1000 + 60);
}

/* ---------- Musique : une voix à la fois, fondu enchaîné, boucle propre ---------- */
let voice = null, wanted = null;

/** Boucle d'un fichier : naturelle s'il boucle parfaitement (audio.json → seamless), sinon fondu à la boucle. */
function bufferLoop(buf, dest, id) {
  if (A().seamless.includes(id)) {
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(dest); s.start();
    return () => { try { s.stop(); } catch (_) {} };
  }
  const F = Math.min(A().loopFade, buf.duration / 4);
  let alive = true, timer = 0, srcs = [];
  const seg = (t, fadeIn) => {
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = buf; s.connect(g).connect(dest);
    g.gain.setValueAtTime(fadeIn ? 0.0001 : 1, t);
    if (fadeIn) g.gain.linearRampToValueAtTime(1, t + F);
    g.gain.setValueAtTime(1, t + buf.duration - F);
    g.gain.linearRampToValueAtTime(0.0001, t + buf.duration);
    s.start(t); s.stop(t + buf.duration + 0.05);
    srcs.push(s); if (srcs.length > 3) srcs.shift();
    const next = t + buf.duration - F;
    // Le segment suivant est programmé un peu avant son départ (le temps audio s'arrête en arrière-plan).
    const plan = () => {
      if (!alive) return;
      if (ctx.currentTime < next - 2) { timer = setTimeout(plan, 500); return; }
      seg(next, true);
    };
    timer = setTimeout(plan, 500);
  };
  seg(ctx.currentTime + 0.02, false);
  return () => { alive = false; clearTimeout(timer); for (const s of srcs) try { s.stop(); } catch (_) {} };
}

function musicFile(id) {
  if (!musicBuf.has(id)) musicBuf.set(id, load(url('music', id)));
  return musicBuf.get(id);
}

/** Passe à la musique id (fondu enchaîné). null : silence. Sans effet si elle joue déjà. */
export async function music(id) {
  if (!ctx || id === wanted) return;
  wanted = id;
  const buf = id ? await musicFile(id) : null;
  if (wanted !== id) return;                                       // une autre musique a été demandée entre-temps
  const X = A().crossfade, t = ctx.currentTime;
  if (voice) {
    const old = voice;
    old.g.gain.cancelScheduledValues(t); old.g.gain.setValueAtTime(old.g.gain.value, t);
    old.g.gain.linearRampToValueAtTime(0.0001, t + X);
    setTimeout(() => { old.stop(); old.g.disconnect(); }, X * 1000 + 200);
    voice = null;
  }
  if (!id) return;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + X);
  g.connect(duckBus);
  let stop;
  try { stop = buf ? bufferLoop(buf, g, id) : S.musicLoop(ctx, g, id); } catch (_) { stop = () => {}; }
  voice = { id, g, stop };
}

/** Musique d'un lieu (id de décor ou d'arène) : nature, cité, hauteurs ou cœur (audio.json → musicByPlace). */
export function placeMusic(lieu) {
  const P = A().musicByPlace;
  for (const [mood, ids] of Object.entries(P)) if (Array.isArray(ids) && ids.includes(lieu)) return A().moods[mood];
  return P.default;
}

/** Dialogues : musique baissée de moitié. */
export function duck(on) {
  if (!ctx) return;
  const t = ctx.currentTime;
  duckBus.gain.setTargetAtTime(on ? A().dialogueDuck : 1, t, A().duckTime / 3);
}

/** État lisible (débogage, tests) : contexte, musique en cours, fichiers trouvés, derniers effets. */
export const audioState = () => ({
  state: ctx ? ctx.state : 'none', unlocked, music: voice && voice.id, wanted, trace: !!trace,
  duck: ctx ? duckBus.gain.value : 1, musicVol: ctx ? musicBus.gain.value : 0, sfxVol: ctx ? sfxBus.gain.value : 0,
  files: Object.keys(sfxBuf).filter(k => sfxBuf[k]), loaded: Object.keys(sfxBuf).length, recent: recent.slice()
});
