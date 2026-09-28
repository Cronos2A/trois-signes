// Affichage de la progression des armes : carte Arme de l'onglet Personnage,
// et bloc « XP de l'arme » des fins de partie (Voyage, Histoire) avec l'animation de montée de niveau.
import { D } from '../data.js';
import { weaponXp, weaponLevel, weaponBonuses, milestones, milestoneText } from '../game/weapons.js';
import { sfx } from '../audio/audio.js';

const nf = n => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
const pctTxt = v => Math.round(v * 100) + ' %';

/** Bonus actuels d'une arme, en phrases courtes. */
function bonusLines(id) {
  const b = weaponBonuses(id), X = D.weapons, out = [];
  if (b.atk > 1) out.push('Attaque +' + pctTxt(b.atk - 1));
  if (b.gauge > 1) out.push(X.gauge.label);
  if (b.talent && b.talent.text) out.push('Talent : ' + b.talent.text);
  if (b.gold) out.push(X.gold.label);
  return out;
}

/** Prochain palier (3, 6 ou 10) pas encore atteint, ou null. */
function nextMilestone(id, lvl) {
  const m = milestones().find(m => m.level > lvl);
  return m ? `Niveau ${m.level} : ${milestoneText(id, m)}` : null;
}

/** Contenu de la carte Arme (onglet Personnage) : niveau, barre d'XP, bonus actuels, prochain palier. */
export function weaponCardHtml(id) {
  const L = weaponLevel(weaponXp(id)), bonus = bonusLines(id), next = nextMilestone(id, L.lvl);
  return `<div class="wlvl"><span class="tag-lvl">Nv ${L.lvl}</span><div class="wbar"><i style="width:${L.pct}%"></i></div></div>
    <div class="wx-xp">${L.max ? 'Niveau max' : nf(L.cur) + ' / ' + nf(L.need) + ' XP'}</div>
    <div class="wx-bonus">${bonus.length ? bonus.map(t => `<span>${t}</span>`).join('') : '<span class="none">Pas encore de bonus</span>'}</div>
    ${next ? `<div class="wx-next">${next}</div>` : ''}`;
}

/** Bloc de fin de partie : XP gagnée par l'arme (r : résultat de grantWeaponXp). */
export function weaponGainHtml(r) {
  if (!r) return '';
  const B = r.before;
  return `<div class="wx" data-weapon="${r.id}">
      <div class="res-xp-top"><span>${r.name} +${nf(r.gain)} XP</span><span class="wx-lvl">Niveau ${B.lvl}</span></div>
      <div class="wbar wx-bar"><i style="width:${B.pct}%"></i></div>
      <div class="wx-msg" aria-live="polite"></div>
    </div>`;
}

/**
 * Anime la barre d'XP de l'arme dans root : remplissage niveau par niveau, « Niveau N ! » à chaque passage,
 * et le son de déblocage aux paliers (3, 6, 10).
 */
export function playWeaponGain(root, r) {
  const box = root && root.querySelector('.wx');
  if (!box || !r) return;
  const bar = box.querySelector('.wx-bar i'), lvlEl = box.querySelector('.wx-lvl'), msg = box.querySelector('.wx-msg');
  const steps = [];
  for (let L = r.before.lvl; L <= r.after.lvl; L++) {
    steps.push({ L, from: L === r.before.lvl ? r.before.pct : 0, to: L === r.after.lvl ? r.after.pct : 100 });
  }
  const levelUp = n => {
    lvlEl.textContent = n >= D.weapons.maxLevel ? 'Niveau max' : 'Niveau ' + n;
    const m = milestones().find(m => m.level === n);
    msg.innerHTML = `<b>Niveau ${n} !</b>${m ? `<span>${milestoneText(r.id, m)}</span>` : ''}`;
    box.classList.remove('up'); void box.offsetWidth; box.classList.add('up');
    if (m) sfx(D.weapons.unlockSound);
  };
  let i = 0;
  const run = () => {
    const s = steps[i++];
    if (!s) return;
    bar.style.transition = 'none'; bar.style.width = s.from + '%';
    void bar.offsetWidth;
    bar.style.transition = ''; bar.style.width = s.to + '%';
    if (i < steps.length) setTimeout(() => { levelUp(steps[i].L); setTimeout(run, 350); }, 700);
  };
  setTimeout(run, 350);
}
