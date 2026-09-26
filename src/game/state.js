// État partagé de la partie. La logique l'écrit, le rendu (ui/) le lit.
export const G = {
  mode: 'menu',            // 'menu' | 'play' | 'train' | 'end'
  W: 0, H: 0, safeTop: 0,  // taille de l'écran (px CSS)
  time: 0, waveIdx: 0, waveDelay: 0, score: 0, shake: 0,
  streak: { name: null, n: 0 }, combos: 0, globalGap: 0,
  hero: null, atkMult: 1,
  enemies: [], loots: [],
  fx: [], pops: [], trails: [], bigGrade: null, drawing: null,
  stats: {}, trainSpawn: 0, trainMsg: ''
};

export const heroPos = () => ({ x: G.W / 2, y: G.H * 0.78 });
