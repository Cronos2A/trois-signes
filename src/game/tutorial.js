// Leçon guidée « La première leçon » (data/tutorial.json, docs/Son_et_Tutoriel.pdf section 4).
// Un souvenir : Maître Eldan enseigne à Aldric, à Pierrelune avant le Silence. Cinq étapes, chacune ouverte
// par une réplique d'Eldan (lecteur de dialogues) : Triangle, Rond, Toucher, Justesse (5 niveaux puis un combo),
// Super. Impossible à rater : mannequin sans dégâts, seuils plus tolérants (voir grades.js → toleranceOffset),
// et après deux échecs de suite une main animée montre le geste. « Passer » (bouton Quitter) ramène au lobby.
import { D } from '../data.js';
import { G, heroPos } from './state.js';
import { prog, saveProg } from './progress.js';
import { addEnemy } from './enemies.js';
import { comboLength } from './grades.js';
import { pop } from './effects.js';
import { playScene } from '../ui/cutscene.js';
import { showIntro, showLevels, showHand, hideHand, hideTutorialUi } from '../ui/tutorial-ui.js';
import { enemyUrl } from '../ui/assets.js';
import { dummyUrl } from '../ui/tutorial-art.js';
import { music } from '../audio/audio.js';

const X = () => D.tutorial;
let api = {};      // { startBattle(opts) → Promise, quit() } fourni par main.js
let run = 0;       // numéro de la leçon en cours (une leçon passée n'agit plus)
let types = null;

export function initTutorial(a) { api = a; }

const wait = s => new Promise(r => setTimeout(r, s * 1000));

/** Lance la leçon (premier démarrage, ou « Revoir la leçon » du lobby). */
export async function startTutorial() {
  const id = ++run, T = X(), url = await enemyUrl(T.dummy.id);
  const passive = { ...T.dummy, sprite: 'x_' + T.dummy.id, immortal: true, cd: [1e9, 1e9] };
  types = { passive, attack: { ...passive, cd: T.dummy.cd } };
  const battle = {
    tutorial: true, waves: [], types: { [T.dummy.id]: passive }, timeLimit: 0, label: 'Leçon', lieu: T.decor, bg: null, music: T.music,
    art: [{ key: passive.sprite, url: url || dummyUrl(), height: T.dummy.height, fallback: 'sbire' }],   // sprite provisoire si le fichier manque
    onQuit: () => finish()
  };
  music(T.music);
  await api.startBattle({ char: D.characters.characters.find(c => c.id === T.hero), battle });
  if (id !== run) return;
  G.paused = true;
  addEnemy(T.dummy.id, 0.5, 0, 0);
  const e = G.enemies[0];                                   // le mannequin est déjà planté
  e.state = 'idle'; e.cd = 1e9; e.x = e.sx * G.W; e.y = e.sy * G.H;
  G.tuto = { step: 0, total: T.steps.length, count: 0, goal: T.steps[0].goal, label: T.steps[0].label, consigne: '' };
  await showIntro();
  for (let i = 0; i < T.steps.length; i++) {
    if (id !== run) return;
    await step(i, id);
  }
  if (id !== run) return;
  G.paused = true;
  await playScene(T.fin, { decor: T.decor });
  if (id === run) api.quit();                               // retour au lobby (onQuit → finish)
}

/** Fin de la leçon, terminée ou passée : elle ne se relance plus d'elle-même. */
function finish() {
  run++;
  G.listen = null; G.tuto = null;
  hideTutorialUi();
  if (!prog.tutorial) { prog.tutorial = true; saveProg(); }
  music('musique_lobby');
}

async function step(i, id) {
  const T = X(), S = T.steps[i];
  const t = G.tuto = { step: i, total: T.steps.length, count: 0, goal: S.goal, label: S.label, consigne: S.consigne, fails: 0, help: false };
  if (S.id === 'justesse') { t.goal = comboLength(); t.label = 'Série'; }
  G.paused = true;
  await playScene(S.eldan, { decor: T.decor });
  if (id !== run) return;
  if (S.levels) await showLevels();
  if (id !== run) return;
  setup(S, t);
  G.paused = false;
  await new Promise(done => { G.listen = (ev, d) => onEvent(S, t, ev, d, done); });
  G.listen = null;
  hideHand();
  await wait(T.pauseBetweenSteps);
}

/** Prépare l'étape : le mannequin attaque ou non, pièces, série remise à zéro, jauge pleine. */
function setup(S, t) {
  const T = X();
  let e = G.enemies[0];
  if (!e) { addEnemy(T.dummy.id, 0.5, 0, 0); e = G.enemies[0]; e.state = 'idle'; }
  e.T = S.id === 'rond' ? types.attack : types.passive;
  if (e.state === 'windup') e.state = 'idle';
  e.cd = S.id === 'rond' ? 0.8 : 1e9;
  if (S.id === 'toucher') {
    const C = T.coins;
    G.loots = Array.from({ length: C.count }, (_, k) => ({
      x: G.W / 2 + (k - (C.count - 1) / 2) * Math.min(C.spread, G.W * 0.28), y: G.H * C.row + (k % 2) * 30,
      type: 'coin', life: 1e9, t: k * 0.3
    }));
  }
  if (S.id === 'justesse') G.streak = { name: null, n: 0 };
  if (S.fillGauge) { G.hero.sp = null; G.hero.gauge = D.characters.superGauge.max; }
}

/** Événements du combat (state.js → emit) : réussite de l'étape, ou échec (main animée au bout de deux). */
function onEvent(S, t, ev, d, done) {
  const ok = () => { t.fails = 0; t.help = false; hideHand(); };
  const bad = () => { if (++t.fails >= X().failsBeforeHand) { t.help = true; showHand(S.hand); } };
  const plus = () => { ok(); if (++t.count >= t.goal) done(); };
  switch (S.id) {
    case 'triangle':
      if (ev === 'gesture') (d.type === 'triangle' && d.g) ? plus() : bad();
      break;
    case 'rond':
      if (ev === 'gesture' && !(d.type === 'circle' && d.g)) bad();
      if (ev === 'strike') {
        if (d.avoid > 0) plus();
        else { const h = heroPos(); pop(h.x, h.y - 90, 'Trop tard', 'trace le Rond pendant l\'alerte', '#FFD23F', 1.2, 22); bad(); }
      }
      break;
    case 'toucher':
      if (ev === 'pickup') plus();
      else if (ev === 'tapMiss' || ev === 'gesture') bad();
      break;
    case 'justesse':
      if (ev !== 'gesture') break;
      if (d.cm > 1) { ok(); t.count = t.goal; done(); break; }
      if (d.g && G.streak.n > t.count) ok(); else bad();       // la série grandit, ou elle vient de casser
      t.count = G.streak.n;
      break;
    case 'super':
      if (ev === 'super') plus();
      else if (ev === 'gesture' || ev === 'tapMiss') bad();
      break;
  }
}
