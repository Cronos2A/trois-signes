// Contrôle d'une sauvegarde (locale ou reçue du serveur) avant de s'en servir.
// Un bloc absent est normal (sauvegarde d'une version plus ancienne) : progress.js le complète sans rien demander.
// Un bloc présent mais du mauvais type, ou une sauvegarde illisible, rend la sauvegarde « endommagée » :
// le jeu démarre quand même, sur une progression neuve, et propose de repartir à zéro ou de récupérer la sauvegarde en ligne.

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isArr = Array.isArray;

/** Forme attendue de chaque bloc : (valeur) → vrai si acceptable. Les blocs inconnus sont ignorés. */
const SHAPE = {
  chars: v => isObj(v) && Object.values(v).every(c => isObj(c) && (c.lvl === undefined || isNum(c.lvl)) && (c.xp === undefined || isNum(c.xp))),
  story: v => isObj(v)
    && (v.done === undefined || (isObj(v.done) && Object.values(v.done).every(isArr)))
    && (v.seen === undefined || isObj(v.seen))
    && (v.fragments === undefined || isArr(v.fragments)),
  voyage: v => isObj(v) && (v.maxArena === undefined || isNum(v.maxArena))
    && (v.found === undefined || isArr(v.found)) && (v.beaten === undefined || isArr(v.beaten)),
  weapons: v => isObj(v) && Object.values(v).every(w => isObj(w) && (w.xp === undefined || isNum(w.xp))),
  armory: v => isObj(v) && (v.weapons === undefined || isArr(v.weapons)) && (v.talismans === undefined || isArr(v.talismans))
    && (v.equipped === undefined || isObj(v.equipped)) && (v.talisman === undefined || isObj(v.talisman)),
  eco: v => isObj(v) && (v.gold === undefined || (isNum(v.gold) && v.gold >= 0)) && (v.gems === undefined || (isNum(v.gems) && v.gems >= 0))
    && (v.granted === undefined || isArr(v.granted)) && (v.owned === undefined || isArr(v.owned))
    && (v.equipped === undefined || isObj(v.equipped)) && (v.pending === undefined || isArr(v.pending)),
  profile: v => isObj(v) && (v.pseudo === undefined || typeof v.pseudo === 'string'),
  duel: v => isObj(v) && (v.prints === undefined || isNum(v.prints)),
  ads: isObj,
  played: isObj,
  best: isNum,
  active: v => typeof v === 'string'
};

/** Problèmes d'une sauvegarde déjà lue : [] si elle est utilisable. */
export function saveProblems(s) {
  if (!isObj(s)) return ['illisible'];
  return Object.keys(SHAPE).filter(k => s[k] !== undefined && s[k] !== null && !SHAPE[k](s[k]))
    .concat(Object.keys(SHAPE).filter(k => s[k] === null).map(k => k + ' vide'));
}

/** Lecture d'un texte de sauvegarde : { data, damaged, problems }. Texte absent : sauvegarde neuve, pas endommagée. */
export function readSave(raw) {
  if (raw === null || raw === undefined) return { data: {}, damaged: false, problems: [] };
  let data;
  try { data = JSON.parse(raw); } catch (e) { return { data: {}, damaged: true, problems: ['illisible'] }; }
  const problems = saveProblems(data);
  return problems.length ? { data: {}, damaged: true, problems } : { data, damaged: false, problems };
}
