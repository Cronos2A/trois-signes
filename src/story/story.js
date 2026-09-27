// Mode Histoire : déroulé des six histoires de data/story_mode.json (textes affichés tels quels).
// Prologue au premier lancement, ouverture de chaque histoire, puis pour chaque combat :
// [arrivée au Cœur avant le 10e] → dialogue_avant → combat → dialogue_apres → cinematique_apres.
// Après le 10e : fin, fragment de mémoire, et l'épilogue quand les six sont terminées.
import { D } from '../data.js';
import { prog, saveProg, addXp } from '../game/progress.js';
import { playScene } from '../ui/cutscene.js';
import { renderChoice, renderMap, renderDefeat, renderFragment, hideStory } from '../ui/story-ui.js';
import { enemyUrl, who, bossInfo } from '../ui/assets.js';

let api = {};   // { startBattle({ char, battle }), toLobby() } fourni par main.js
const SM = () => D.story_mode;
const st = () => prog.story;
const story = id => SM().histoires.find(h => h.id === id);
const combat = (h, n) => h.combats.find(k => k.n === +n);
const hero = id => D.characters.characters.find(c => c.id === id);

export function initStory(a) { api = a; }

/** Premier lancement du jeu : prologue commun. */
export async function maybePrologue() {
  if (st().prologue) return;
  await playScene(SM().prologue_commun);
  st().prologue = true;
  saveProg();
}

/** Bouton « Histoire » du lobby : écran de choix. */
export function openStory() {
  renderChoice(st(), { back: () => { hideStory(); api.toLobby(); }, pick: id => openHistory(story(id)) });
}

async function openHistory(h) {
  const key = h.id + ':ouverture';
  if (!st().seen[key]) {
    hideStory();
    await playScene(h.cinematique_ouverture);
    st().seen[key] = true;
    saveProg();
  }
  showMap(h);
}

function showMap(h, toast) {
  renderMap(h, st(), { back: openStory, play: n => launch(h, combat(h, n), true) }, toast);
}

/** Lance un combat ; withDialogue = false pour « Réessayer » (le dialogue d'avant n'est pas rejoué). */
async function launch(h, k, withDialogue) {
  hideStory();
  if (withDialogue) {
    if (k.n === 10) await playScene(SM().arrivee_coeur.cinematique, { decor: k.lieu });
    await playScene(k.dialogue_avant, { decor: k.lieu });
  }
  const battle = await buildBattle(k);
  battle.onEnd = (why, res) => afterCombat(h, k, why, res);
  battle.onQuit = () => showMap(h);
  api.startBattle({ char: hero(h.id), battle });
}

/**
 * Combat d'histoire : un round par tableau de « vagues ». sbire / brute = ennemis existants ;
 * les autres ids sont les boss de ennemis_speciaux (valeurs de départ selon leur rang).
 */
async function buildBattle(k) {
  const R = D.rules.story, V = SM().ennemis_speciaux.valeurs_de_depart, types = {}, art = [];
  for (const id of new Set(k.vagues.flat())) {
    if (R.enemyMap[id]) continue;
    const b = bossInfo(id), v = V[b.rang], url = await enemyUrl(id);
    if (url) art.push({ key: 'x_' + id, url, height: R.rankHeight[b.rang], fallback: R.rankSprite[b.rang] });
    types[id] = {
      ...D.enemies[R.rankTemplate], name: who(id).name, hp: v.hp, dmg: v.degats, wind: v.alerte_s,
      pts: R.rankPoints[b.rang], sprite: url ? 'x_' + id : R.rankSprite[b.rang],
      mech: id === 'eldan_oublie' ? 'eldan' : null, special: true
    };
  }
  const waves = k.vagues.map(list => {
    const boss = list.find(id => !R.enemyMap[id]);
    return { enemies: list.map(id => R.enemyMap[id] || id), title: boss ? who(boss).name : undefined, color: boss ? '#FF5A3C' : undefined, boss: !!boss };
  });
  return { waves, types, art, timeLimit: R.timeLimit, label: R.roundLabel, lieu: k.lieu };
}

async function afterCombat(h, k, why, res) {
  if (why !== 'win') {
    renderDefeat(k, { retry: () => launch(h, k, false), review: () => launch(h, k, true), back: () => showMap(h) });
    return;
  }
  const done = st().done[h.id] || (st().done[h.id] = []);
  const first = !done.includes(k.n);
  let bonus = 0;
  if (first) { done.push(k.n); bonus = D.rules.story.firstWinXp; addXp(h.id, bonus); }
  saveProg();
  await playScene(k.dialogue_apres, { decor: k.lieu });
  if (k.cinematique_apres) await playScene(k.cinematique_apres, { decor: k.lieu });
  if (k.n === 10) {
    await playScene(h.fin, { decor: k.lieu });
    if (!st().fragments.includes(h.id)) { st().fragments.push(h.id); saveProg(); }
    await renderFragment(st().fragments.length, h);
    if (st().fragments.length >= SM().histoires.length && !st().epilogue) {
      hideStory();
      await playScene(SM().epilogue_final.cinematique);
      st().epilogue = true;
      saveProg();
    }
    openStory();
    return;
  }
  showMap(h, `Victoire ! +${res.gain + bonus} XP${bonus ? ` (dont ${bonus} de première victoire)` : ''}`);
}
