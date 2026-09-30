// Mode Histoire : déroulé des six histoires de data/story_mode.json (textes affichés tels quels).
// Prologue au premier lancement, ouverture de chaque histoire, puis pour chaque combat :
// [arrivée au Cœur avant le 10e] → dialogue_avant → combat → dialogue_apres → cinematique_apres.
// Après le 10e : fin, fragment de mémoire, et l'épilogue quand les six sont terminées.
import { D } from '../data.js';
import { prog, saveProg, addXp } from '../game/progress.js';
import { storyWinGold, addGold, syncGems } from '../game/economy.js';
import { playScene } from '../ui/cutscene.js';
import { renderChoice, renderMap, renderDefeat, renderVictory, renderFragment, renderUnlock, hideStory } from '../ui/story-ui.js';
import { enemyUrl, who, bossInfo } from '../ui/assets.js';
import { music, placeMusic, sfx } from '../audio/audio.js';
import { syncRewards } from '../game/rewards.js';
import { variantArt, applyVariant, storyVariant } from '../game/variants.js';
import { showRewards } from '../ui/reward-ui.js';
import { showCover } from '../ui/cover.js';
import { tr, nf } from '../i18n.js';

let api = {};   // { startBattle({ char, battle }), toLobby() } fourni par main.js
const SM = () => D.story_mode;
const st = () => prog.story;
const story = id => SM().histoires.find(h => h.id === id);
const combat = (h, n) => h.combats.find(k => k.n === +n);
const hero = id => D.characters.characters.find(c => c.id === id);

export function initStory(a) { api = a; }

/** Premier lancement du jeu : prologue commun. */
export async function maybePrologue() {
  if (st().prologue) return false;
  music(placeMusic(SM().prologue_commun[0].decor));
  await playScene(SM().prologue_commun);
  st().prologue = true;
  saveProg();
  music('musique_lobby');
  return true;
}

/** Bouton « Histoire » du lobby : écran de choix (après avoir rejoué une fin ou un épilogue interrompus). */
export async function openStory(toEldan) {
  if (await resumeEndings()) return;
  music('musique_lobby');
  renderChoice(st(), { back: () => { hideStory(); api.toLobby(); }, pick: id => openHistory(story(id)) });
  if (toEldan === true) document.querySelector('#story .st-eldan')?.scrollIntoView({ block: 'center' });
}

async function openHistory(h) {
  const key = h.id + ':ouverture';
  if (!st().seen[key]) {
    hideStory();
    music(placeMusic(h.combats[0].lieu));
    await playScene(h.cinematique_ouverture);
    st().seen[key] = true;
    saveProg();
  }
  showMap(h);
}

function showMap(h, toast) {
  music('musique_lobby');
  renderMap(h, st(), { back: openStory, play: n => launch(h, combat(h, n), true) }, toast);
}

/** Lance un combat ; withDialogue = false pour « Réessayer » (le dialogue d'avant n'est pas rejoué). */
async function launch(h, k, withDialogue) {
  showCover();                                             // le lobby ne réapparaît pas entre l'écran Histoire et l'arène
  hideStory();
  if (withDialogue) {
    music(placeMusic(k.lieu));
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
  // Sbire, brute, boss : variante selon le numéro du combat (data/rules.json → enemyVariants), mêmes valeurs.
  const v = storyVariant(k.n);
  art.push(...variantArt([v]));
  const waves = k.vagues.map(list => {
    const boss = list.find(id => !R.enemyMap[id]);
    return { enemies: list.map(id => R.enemyMap[id] || id), title: boss ? who(boss).name : undefined, color: boss ? '#FF5A3C' : undefined, boss: !!boss };
  });
  return { waves, types: applyVariant(types, v), art, xpMode: 'story', timeLimit: R.timeLimit, label: R.roundLabel, lieu: k.lieu, music: placeMusic(k.lieu) };
}

async function afterCombat(h, k, why, res) {
  sfx(why === 'win' ? 'victoire' : 'defaite');
  if (why !== 'win') {
    music('musique_lobby');
    // L'or des rounds terminés et des pièces est déjà versé (main.js → payRounds) ; pas de bonus de victoire.
    renderDefeat(k, { retry: () => launch(h, k, false), review: () => launch(h, k, true), back: () => showMap(h) }, res.weapon, res.gold || 0);
    return;
  }
  const done = st().done[h.id] || (st().done[h.id] = []);
  const first = !done.includes(k.n);
  // Combat 10 gagné : fragment et fin d'histoire notés tout de suite (si le jeu est fermé pendant les scènes de fin,
  // rien n'est perdu : openStory → resumeEndings les rejoue). Les 6 fragments : Eldan débloqué et épilogue à voir.
  if (k.n === 10) markEnding(h);
  // XP du héros (data/progression.json → xp.story) : plus à la première victoire, moins aux suivantes.
  const X = D.progression.xp.story;
  if (first) done.push(k.n);
  const xp = addXp(h.id, first ? X.firstWin : X.repeatWin);
  const bonus = storyWinGold(first);                                // data/economy.json → gold.story
  addGold(bonus);
  const gold = (res.gold || 0) + bonus;                            // + l'or déjà versé round par round
  saveProg();
  await renderVictory(k, xp, res.weapon, gold);
  await showRewards(syncRewards());          // combats 5 et 10 : armes alternatives du héros
  hideStory();
  music(placeMusic(k.lieu));
  await playScene(k.dialogue_apres, { decor: k.lieu });
  if (k.cinematique_apres) {
    // Après un mini-boss ou un lieutenant : musique triste (data/audio.json → sadAfter).
    if (D.audio.sadAfter.includes(k.type)) music('musique_triste');
    await playScene(k.cinematique_apres, { decor: k.lieu });
  }
  if (k.n === 10) {
    await playEnding(h, k.lieu);
    if (await playEpilogue()) return;
    openStory();
    return;
  }
  showMap(h, tr('story.victoryToast', { xp: nf(xp.gain), gold: nf(gold) }));
}

/* ---------- Fins d'histoire et épilogue : progression notée au fur et à mesure ---------- */
// prog.story.endings : histoires dont la scène de fin reste à montrer ; prog.story.epiloguePending : épilogue à montrer.
function markEnding(h) {
  const S = st();
  if (!S.fragments.includes(h.id)) S.fragments.push(h.id);
  S.endings = [...new Set([...(S.endings || []), h.id])];
  if (S.fragments.length >= SM().histoires.length && !S.epilogue) { S.epilogue = true; S.epiloguePending = true; }   // Eldan débloqué
  saveProg();
}

/** Scène de fin d'une histoire, fragment, gemmes ; puis la fin est marquée vue. */
async function playEnding(h, lieu) {
  music('musique_epilogue');
  await playScene(h.fin, { decor: lieu || h.combats[h.combats.length - 1].lieu });
  sfx('deblocage');
  await renderFragment(st().fragments.length, h);
  await showRewards(syncGems());             // gemmes : histoire terminée
  st().endings = (st().endings || []).filter(id => id !== h.id);
  saveProg();
}

/** Épilogue à montrer (les 6 histoires finies) : scène, gemmes, écran « Eldan débloqué ». Renvoie true s'il a été joué. */
async function playEpilogue() {
  const S = st();
  if (S.fragments.length >= SM().histoires.length && !S.epilogue) { S.epilogue = true; S.epiloguePending = true; saveProg(); }
  if (!S.epiloguePending) return false;
  hideStory();
  music('musique_epilogue');
  await playScene(SM().epilogue_final.cinematique);
  S.epiloguePending = false;
  saveProg();
  await showRewards(syncGems());             // gemmes : épilogue
  sfx('deblocage');
  // Eldan débloqué (« Bientôt disponible ») : voir sa carte dans le choix des histoires, ou revenir au lobby.
  renderUnlock({ see: () => openStory(true), later: () => { hideStory(); api.toLobby(); } });
  return true;
}

/** Fins et épilogue interrompus (jeu fermé pendant les scènes) : rejoués à l'ouverture du mode Histoire. */
async function resumeEndings() {
  const S = st();
  for (const id of [...(S.endings || [])]) {
    const h = story(id);
    if (h) { hideStory(); await playEnding(h); }
    else S.endings = S.endings.filter(x => x !== id);
  }
  return playEpilogue();
}
