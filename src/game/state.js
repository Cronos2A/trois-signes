// État partagé de la partie. La logique l'écrit, le rendu (ui/) le lit.
export const G = {
  mode: 'menu',            // 'menu' | 'play' | 'train' | 'end'
  W: 0, H: 0, safeTop: 0,  // taille de l'écran (px CSS)
  time: 0, waveIdx: 0, waveDelay: 0, score: 0, shake: 0,
  streak: { name: null, n: 0 }, combos: 0, globalGap: 0,
  hero: null, atkMult: 1, charId: 'aldric', battle: null, roundSummons: 0,
  scoreMult: 1,            // Voyage : multiplicateur de score de l'arène (1 ailleurs)
  paused: false,           // Voyage : écran de transition entre deux arènes
  voyage: null,            // Voyage : { stage, round, name, total } (lu par le HUD et l'écran de fin)
  enemies: [], loots: [], summons: [],
  fx: [], pops: [], trails: [], trailStyle: null, bigGrade: null, superBanner: null, drawing: null,
  stats: {}, trainSpawn: 0, trainMsg: '',
  listen: null             // Leçon : écoute les événements du combat (game/tutorial.js)
};

/** Ajoute des points au score, multipliés par le multiplicateur en cours (Voyage). */
export function addScore(n) { G.score += Math.round(n * G.scoreMult); }

/** Événement du combat (geste, ramassage, coup reçu, super), pour la leçon guidée. */
export function emit(ev, d) { if (G.listen) G.listen(ev, d); }

/** Durée de l'alerte d'un ennemi : la sienne, + l'avance du talisman Clé des toits (même coup, visible plus tôt). */
export const windOf = e => e.T.wind + (e.lead || 0);

export const heroPos = () => ({ x: G.W / 2, y: G.H * 0.78 });
