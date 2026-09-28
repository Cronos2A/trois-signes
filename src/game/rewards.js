// Récompenses : armes alternatives (Histoire : première victoire au combat 5 puis au combat 10 d'un héros)
// et talismans (Voyage : premier gardien battu dans chaque arène).
// syncRewards() recalcule d'après la sauvegarde tout ce qui est mérité et débloque ce qui manque :
// un joueur qui avait déjà gagné ces combats ou battu ces gardiens reçoit ses récompenses au lancement suivant.
import { D } from '../data.js';
import { prog, saveProg } from './progress.js';
import { heroWeapons, weaponData, unlockWeapon } from './weapons.js';
import { talismanForArena, unlockTalisman } from './talismans.js';

/** Voyage : note qu'un gardien est battu (arène d'origine du gardien). */
export function beatGuardian(arenaId) {
  const B = prog.voyage.beaten;
  if (!arenaId || B.includes(arenaId)) return;
  B.push(arenaId);
  saveProg();
}

/** Gardien d'une arène battu : noté, ou déduit d'une arène plus lointaine déjà atteinte (anciennes sauvegardes). */
const guardianBeaten = (arena, i) => prog.voyage.beaten.includes(arena.id) || prog.voyage.maxArena > i;

/** Tout ce que la sauvegarde mérite : [{ kind: 'weapon', id, hero } | { kind: 'talisman', id }]. */
export function earnedRewards() {
  const out = [], done = prog.story.done;
  for (const hero of Object.keys(D.weapons.heroes)) {
    for (const id of heroWeapons(hero)) {
      const u = weaponData(id).unlock;
      if (u && u.story && (done[hero] || []).includes(u.story)) out.push({ kind: 'weapon', id, hero });
    }
  }
  D.voyage.arenas.forEach((a, i) => {
    const t = talismanForArena(a.id);
    if (t && guardianBeaten(a, i)) out.push({ kind: 'talisman', id: t.id, arena: a.id });
  });
  return out;
}

/** Débloque ce qui est mérité et pas encore reçu. Renvoie les nouvelles récompenses (pour l'écran de récompense). */
export function syncRewards() {
  return earnedRewards().filter(r => r.kind === 'weapon' ? unlockWeapon(r.id) : unlockTalisman(r.id));
}
