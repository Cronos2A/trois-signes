// Armes et talismans à l'écran : cartes Armes et Talisman de l'onglet Personnage, icônes,
// et bloc « XP de l'arme » des fins de partie (Voyage, Histoire) avec l'animation de montée de niveau.
// Tous les noms et textes viennent de data/weapons.json et data/talismans.json.
import { D } from '../data.js';
import {
  weaponXp, weaponLevel, weaponBonuses, weaponData, heroWeapons, weaponUnlocked, equippedWeapon,
  stylePower, styleText, milestones
} from '../game/weapons.js';
import { talismanList, talismanData, talismanUnlocked, equippedTalisman } from '../game/talismans.js';
import { sfx } from '../audio/audio.js';
import { glyph, wIcon } from './icons.js';
import { lockIcon } from './story-art.js';
import { tr, nfi } from '../i18n.js';

const nf = nfi;

/** Remplit un modèle de texte des données : « Niveau {n} » + { n: 3 } → « Niveau 3 ». */
export const tpl = (s, v = {}) => String(s || '').replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const WU = () => D.weapons.ui, TU = () => D.talismans.ui;

/* ---------- Icônes : fichier assets/icones/… s'il existe, sinon dessin provisoire en code ---------- */
const DRAWN = new Set(['epee', 'dague', 'arc', 'gantelets', 'grimoire', 'amulette']);
/** kind : 'armes' | 'talismans'. L'image remplace le dessin dès qu'elle est chargée. */
export function itemIcon(kind, id, size) {
  const fallback = kind === 'armes'
    ? (DRAWN.has(id) ? wIcon(id, size) : glyph('tri', '#FFF1D6', size))
    : glyph('dot', '#FFD23F', size);
  return `<span class="it-ic" style="width:${size}px;height:${size}px">${fallback}` +
    `<img src="assets/icones/${kind}/${id}.svg" alt="" width="${size}" height="${size}" onload="this.previousElementSibling&&this.previousElementSibling.remove()" onerror="this.remove()"></span>`;
}

/* ---------- Carte Armes (onglet Personnage) ---------- */
/** Bonus de niveau actuels d'une arme, en phrases courtes. */
function bonusLines(id) {
  const b = weaponBonuses(id), X = D.weapons, out = [];
  if (b.atk > 1) out.push(tpl(WU().attackBonus, { pct: Math.round((b.atk - 1) * 100) }));
  if (b.gauge > 1) out.push(X.gauge.label);
  if (b.gold) out.push(X.gold.label);
  return out;
}

function nextLine(lvl) {
  const m = milestones().find(m => m.level > lvl);
  return m ? tpl(WU().next, { n: m.level, text: m.label }) : null;
}

function weaponRow(heroId, id, color) {
  const w = weaponData(id);
  if (!weaponUnlocked(id)) {
    return `<div class="arm-row locked">
        <div class="arm-ic" style="background:#C9C1B3">${itemIcon('armes', id, 30)}</div>
        <div class="arm-main"><div class="arm-top"><b>${w.name}</b></div>
          <div class="arm-lock">${lockIcon(12)}<span>${w.lock || ''}</span></div>
          <div class="arm-style">${styleText(id, 1)}</div></div>
      </div>`;
  }
  const L = weaponLevel(weaponXp(id)), p = stylePower(L.lvl), on = equippedWeapon(heroId) === id;
  const bonus = bonusLines(id), next = nextLine(L.lvl);
  return `<div class="arm-row${on ? ' on' : ''}">
      <div class="arm-ic" style="background:${color}">${itemIcon('armes', id, 30)}</div>
      <div class="arm-main">
        <div class="arm-top"><b>${w.name}</b><span class="tag-lvl">${tpl(WU().levelShort, { n: L.lvl })}</span>
          <button class="mini-btn arm-eq" data-act="equipW" data-arg="${id}"${on ? ' disabled' : ''}>${on ? WU().equipped : WU().equip}</button></div>
        <div class="wbar"><i style="width:${L.pct}%"></i></div>
        <div class="wx-xp">${L.max ? WU().maxLevel : tpl(WU().xp, { cur: nf(L.cur), need: nf(L.need) })}</div>
        <div class="arm-style"><em>${WU().styleTitle} · ${tpl(WU().stylePower, { pct: Math.round(p * 100) })}</em>${styleText(id, p)}</div>
        ${bonus.length ? `<div class="wx-bonus">${bonus.map(t => `<span>${t}</span>`).join('')}</div>` : ''}
        ${next ? `<div class="wx-next">${next}</div>` : ''}
      </div>
    </div>`;
}

export function weaponsCardHtml(heroId, color) {
  return `<div class="mini-card wide arm-card">
      <div class="mini-kicker">${glyph('tri', '#FF8C32', 14, { outline: 1.6 })}${WU().cardTitle}</div>
      ${heroWeapons(heroId).map(id => weaponRow(heroId, id, color)).join('')}
    </div>`;
}

/* ---------- Carte Talisman (onglet Personnage) ---------- */
/** sel : talisman montré en détail (celui équipé par défaut). */
export function talismanCardHtml(heroId, sel) {
  const U = TU(), eq = equippedTalisman(heroId), cur = eq && talismanData(eq);
  const shown = talismanData(sel) || cur || talismanList()[0];
  const grid = talismanList().map(t => {
    const open = talismanUnlocked(t.id);
    return `<button class="tal-it${open ? '' : ' locked'}${t.id === eq ? ' on' : ''}${t.id === shown.id ? ' sel' : ''}" data-act="tal" data-arg="${t.id}" aria-label="${t.name}">
        ${itemIcon('talismans', t.id, 26)}${open ? '' : `<i class="tal-lock">${lockIcon(10)}</i>`}</button>`;
  }).join('');
  const open = talismanUnlocked(shown.id), isEq = shown.id === eq;
  const btn = !open ? '' : isEq
    ? `<button class="mini-btn tal-btn alt" data-act="unequipT">${U.unequip}</button>`
    : `<button class="mini-btn tal-btn" data-act="equipT" data-arg="${shown.id}">${U.equip}</button>`;
  return `<div class="mini-card wide tal-card">
      <div class="mini-kicker">${glyph('dot', '#FF8C32', 14, { outline: 1.6 })}${U.cardTitle}</div>
      <div class="tal-slot${cur ? ' full' : ''}">
        <div class="tal-slot-ic">${cur ? itemIcon('talismans', cur.id, 34) : ''}</div>
        <div class="mini-txt"><b>${cur ? cur.name : U.slotEmpty}</b>${cur ? `<span>${cur.text}</span>` : ''}</div>
      </div>
      <div class="tal-grid">${grid}</div>
      <div class="tal-detail${open ? '' : ' locked'}">
        <div class="mini-txt"><b>${shown.name}${isEq ? ` · ${U.equipped}` : ''}</b><span>${open ? shown.text : `${U.locked} : ${shown.lock}`}</span></div>
        ${btn}
      </div>
    </div>`;
}

/* ---------- Fin de partie : XP de l'arme ---------- */
/** Bloc de fin de partie : XP gagnée par l'arme (r : résultat de grantWeaponXp). */
export function weaponGainHtml(r) {
  if (!r) return '';
  return `<div class="wx" data-weapon="${r.id}">
      <div class="res-xp-top"><span>${tpl(WU().gain, { name: r.name, n: nf(r.gain) })}</span><span class="wx-lvl">${tpl(WU().level, { n: r.before.lvl })}</span></div>
      <div class="wbar wx-bar"><i style="width:${r.before.pct}%"></i></div>
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
    lvlEl.textContent = n >= D.weapons.maxLevel ? WU().maxLevel : tpl(WU().level, { n });
    const m = milestones().find(m => m.level === n);
    msg.innerHTML = `<b>${tpl(WU().levelUp, { n })}</b>${m ? `<span>${m.label}</span>` : ''}`;
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
