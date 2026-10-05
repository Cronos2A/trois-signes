// Toutes les valeurs d'équilibrage viennent de data/*.json.
export const D = {};

const FILES = ['grades', 'characters', 'enemies', 'waves', 'rules', 'story_mode', 'voyage', 'audio', 'tutorial', 'credits', 'weapons', 'talismans', 'progression', 'economy', 'cosmetics', 'ads', 'online', 'duel', 'daily', 'version', 'fin_de_partie', 'chargement'];

export async function loadData() {
  await Promise.all(FILES.map(async f => {
    const r = await fetch('data/' + f + '.json');
    if (!r.ok) throw new Error('data/' + f + '.json : ' + r.status);
    D[f] = await r.json();
  }));
}
