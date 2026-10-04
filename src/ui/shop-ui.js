// Boutique (onglet 03) : Coffres, Cosmétiques, Gemmes ; fenêtres d'achat, d'ouverture de coffre et de probabilités ;
// carte Cosmétique de l'onglet Personnage. Textes et valeurs : data/economy.json et data/cosmetics.json.
import { isNative } from '../native.js';
import { D } from '../data.js';
import { prog } from '../game/progress.js';
import { items, item, owned, forHero, equipped, equip, slotOf } from '../game/cosmetics.js';
import { buy, canAfford, chestState, openChest, pityLeft, chestsAllowed } from '../game/economy.js';
import { heroArt } from './art.js';
import { heroLobbyHtml } from './looks.js';
import { glyph, trailIcon, facets } from './icons.js';
import { itemIcon, tpl } from './weapon-ui.js';
import { moneyIcon, priceHtml, nf } from './money.js';
import { sfx } from '../audio/audio.js';
import { leftToday, noAds, adsReady } from '../ads/ads.js';
import { adIcon } from './ad-ui.js';
import { tr } from '../i18n.js';
import { boostTypes, stockOf, activeOf, stockFull } from '../game/boosts.js';
import { boostIcon } from './daily-ui.js';

const U = () => D.economy.ui;
const R = r => D.economy.rarities[r];
const heroName = id => (D.characters.characters.find(c => c.id === id) || {}).name || '';
const oddsLine = odds => ['commun', 'rare', 'epique'].map(r => `<span style="--rc:${R(r).color}">${R(r).name} ${tr('money.pct', { n: nf(odds[r]) })}</span>`).join('');

/* ---------- Vignettes ---------- */
/** Vignette d'un cosmétique (aperçu + cadre de rareté). */
export function thumbHtml(it, size = 76) {
  let inner;
  if (it.kind === 'color') inner = `<div class="th-hero">${heroArt(it.hero, it.recolor)}</div>`;
  else if (it.kind === 'weapon') inner = `<div class="th-ic">${itemIcon('armes', it.weapon, Math.round(size * 0.56))}</div>`;
  else if (it.kind === 'trail') inner = `<div class="th-ic">${trailIcon(it.color, Math.round(size * 0.56))}</div>`;
  else inner = `<img class="th-skin" src="assets/skins/${it.id}.svg" alt="" draggable="false">`;
  return `<div class="th" style="--th:${size}px;--tc:${it.color}">${facets.small()}${inner}<img class="th-frame" src="${R(it.rarity).frame}" alt="" draggable="false"></div>`;
}
const subLine = it => `${D.cosmetics.types[it.kind].name}${it.hero ? ' · ' + heroName(it.hero) : ''}`;

/* ---------- Onglet Boutique ---------- */
export function shopHtml(ui) {
  // Onglet Boosts (texte dans data/i18n) placé avant l'onglet Gemmes.
  const list = U().tabs.slice(), g = list.findIndex(([k]) => k === 'gems');
  list.splice(g < 0 ? list.length : g, 0, ['boosts', tr('daily.shopTab')]);
  const tabs = list.map(([k, label]) => `<button class="chip sub${ui.shopTab === k ? ' on' : ''}" data-act="shopTab" data-arg="${k}" aria-pressed="${ui.shopTab === k}">${label}</button>`).join('');
  const body = ui.shopTab === 'cosmetics' ? cosmeticsHtml(ui) : ui.shopTab === 'gems' ? gemsHtml() : ui.shopTab === 'boosts' ? boostsHtml() : chestsHtml();
  return `<div class="chips shop-tabs">${tabs}</div>${body}`;
}

function chestsHtml() {
  const allowed = chestsAllowed();
  const card = (id, C) => {
    const st = chestState(id), gold = id === 'trois_signes';
    const why = st.reason === 'complete' ? U().complete : st.reason === 'money' ? U().notEnough : st.reason === 'banned' ? '' : '';
    const pity = id === 'simple' && C.guaranteeEpicAfter ? `<div class="chest-pity">${pityLeft() <= 1 ? U().pityNow : tpl(U().pityLeft, { n: pityLeft() })}</div>` : '';
    return `<div class="chest-card${gold ? ' gold' : ''}">
        ${facets.med()}
        <div class="chest-txt">
          <div class="chest-name">${C.name}</div>
          <div class="chest-desc">${C.text}</div>
          <div class="chest-odds">${oddsLine(C.odds)}</div>
          ${pity}
          <div class="grow"></div>
          <div class="chest-btns">
            <button class="offer-btn" data-act="openChest" data-arg="${id}" ${st.can ? '' : 'disabled'}>${moneyIcon('gems', 22)}<span class="ol ol-4">${U().open} · ${C.price}</span></button>
            <button class="mini-btn odds-btn" data-act="odds">${U().odds}</button>
          </div>
          ${why ? `<span class="chest-why">${why}</span>` : ''}
        </div>
        <img class="chest-img" src="${C.image.closed}" alt="" draggable="false">
      </div>`;
  };
  const C = D.economy.chests;
  return (allowed ? '' : `<div class="shop-note warn">${U().banned}</div>`) + card('trois_signes', C.trois_signes) + card('simple', C.simple) + freeChestHtml();
}

/* ---------- Pubs récompensées de la boutique (data/ads.json) ---------- */
const AU = () => D.ads.ui;
const perDay = k => { const left = leftToday(k); return left ? tpl(AU().perDay, { left, max: D.ads.rewarded[k].perDay }) : AU().noneLeft; };

/** Pub impossible ici (site web publié) : « Disponible dans l'application » à la place du bouton. */
// Pas de pub ici : site web → « Disponible dans l'application » ; application Android sans AdMob (pas encore branché) → « Bientôt ».
const storeOnly = () => `<button class="mini-btn ad-btn ad-store" disabled>${isNative() ? tr('common.soon') : AU().store}</button>`;
/** Achats réels (gemmes, Sans publicité) : pas encore branchés ; dans l'application, « Bientôt » à la place du prix. */
const priceOrSoon = price => (isNative() ? tr('common.soon') : price);
/** Coffre simple gratuit contre une pub, 1 fois par jour. */
function freeChestHtml() {
  const st = chestState(D.ads.rewarded.freeChest.chest, true), can = st.can && leftToday('freeChest') > 0;
  return `<div class="ad-card-shop"><img class="big-ic" src="${D.economy.chests.simple.image.closed}" width="56" height="56" alt="">
      <div class="txt"><b>${AU().freeChestBtn}</b><span class="ad-count">${perDay('freeChest')}</span></div>
      ${adsReady() ? `<button class="mini-btn ad-btn" data-act="adChest" ${can ? '' : 'disabled'}>${adIcon(20)}${AU().watch}</button>` : storeOnly()}</div>`;
}

/** +5 gemmes contre une pub (3 fois par jour) et « Sans publicité ». */
function adGemsHtml() {
  const n = D.ads.rewarded.gems.amount, left = leftToday('gems');
  return `<div class="ad-card-shop">${moneyIcon('gems', 48)}
      <div class="txt"><b>${AU().gemsTitle}</b><span>${tpl(AU().gemsText, { n })}</span><span class="ad-count">${perDay('gems')}</span></div>
      ${adsReady() ? `<button class="mini-btn ad-btn" data-act="adGems" ${left ? '' : 'disabled'}>${adIcon(20)}${tpl(AU().gemsBtn, { n })}</button>` : storeOnly()}</div>`;
}
function noAdsHtml() {
  const on = noAds();
  return `<div class="ad-card-shop no-ads"><div class="txt"><b>${AU().noAdsTitle}</b><span>${on ? AU().noAdsOwned : AU().noAdsText}</span></div>
      ${on ? '' : `<button class="shop-price" disabled>${priceOrSoon(D.ads.noAds.price)}</button>`}</div>`;
}

function cosmeticsHtml(ui) {
  const chips = U().filters.map(([k, label]) => `<button class="chip${ui.filter === k ? ' on' : ''}" data-act="filter" data-arg="${k}" aria-pressed="${ui.filter === k}">${label}</button>`).join('');
  const list = items().filter(i => ui.filter === 'all' || i.kind === ui.filter).map(it => {
    const have = owned(it.id);
    const btn = have ? `<div class="shop-price owned">${U().owned}</div>`
      : `<button class="shop-price buy${canAfford(it.price) ? '' : ' poor'}" data-act="buy" data-arg="${it.id}">${priceHtml(it.price, 15)}</button>`;
    return `<div class="shop-item r-${it.rarity}">
        ${thumbHtml(it)}
        <div class="shop-txt"><b>${it.name}</b><span>${subLine(it)}</span><em style="color:${R(it.rarity).color}">${R(it.rarity).name}</em></div>
        ${btn}
      </div>`;
  }).join('');
  return `<div class="chips">${chips}</div><div class="shop-grid">${list}</div>`;
}

/* ---------- Boosts (data/economy.json → boosts ; mêmes règles que ceux des récompenses de connexion) ---------- */
const boostName = t => tr('daily.boost.' + t, { m: nf(D.daily.boosts.types[t].mult) });
function boostsHtml() {
  const cards = boostTypes().map(t => {
    const P = D.economy.boosts[t], full = stockFull(t), a = activeOf(t);
    const btn = full ? `<div class="shop-price owned">${tr('daily.full')}</div>`
      : `<button class="shop-price buy${canAfford(P.price) ? '' : ' poor'}" data-act="buyBoost" data-arg="${t}">${priceHtml(P.price, 15)}</button>`;
    return `<div class="shop-item boost-item">
        <div class="boost-th" style="--bc:${D.daily.boosts.types[t].color}">${boostIcon(t, 48)}</div>
        <div class="shop-txt"><b>${boostName(t)} · ${tr('daily.games', { n: P.games })}</b><span>${tr('daily.boostText.' + t)}</span>
          <em>${tr('daily.stock', { n: stockOf(t).length, max: D.daily.boosts.maxStock })}${a ? ' · ' + tr('daily.activeLeft', { n: a }) : ''}</em></div>
        ${btn}
      </div>`;
  }).join('');
  return `<div class="shop-note">${tr('daily.shopNote', { max: D.daily.boosts.maxStock })}</div><div class="shop-grid">${cards}</div>`;
}

/** Confirmation d'achat d'un boost. */
export function confirmBoostHtml(t) {
  const P = D.economy.boosts[t], name = boostName(t) + ' · ' + tr('daily.games', { n: P.games });
  return `<div class="res-card shop-card">
      <div class="res-title ol ol-5 set-title">${U().confirmTitle}</div>
      <div class="shop-big">${boostIcon(t, 96)}</div>
      <div class="shop-line"><b>${name}</b><span>${tr('daily.boostText.' + t)}</span></div>
      <div class="shop-line">${tpl(U().confirmText, { name, price: tr('money.goldAmount', { n: nf(P.price.gold) }) })}</div>
      <button class="res-again" data-act="buyBoostOk" data-arg="${t}"><span class="ol ol-4">${U().confirmOk}</span></button>
      <button class="mini-btn" data-act="closeShop">${U().cancel}</button>
    </div>`;
}

function gemsHtml() {
  const packs = D.economy.gemPacks.map(p => `<div class="pack">
      <img src="${p.image}" alt="" draggable="false">
      <div class="pack-n">${moneyIcon('gems', 18)}<b>${nf(p.gems)}</b></div>
      <button class="shop-price" disabled>${priceOrSoon(p.price)}</button>
    </div>`).join('');
  return `${adGemsHtml()}<div class="shop-note">${U().packsFree}</div><div class="pack-grid">${packs}</div>${noAdsHtml()}<div class="shop-note soft">${isNative() ? tr('common.soon') : U().packsNote}</div>`;
}

/* ---------- Fenêtres (dans #shopModal du lobby) ---------- */
/** Confirmation d'achat. */
export function confirmHtml(id) {
  const it = item(id), p = it.price;
  const price = p.gems ? tr('money.gemsAmount', { n: nf(p.gems) }) : tr('money.goldAmount', { n: nf(p.gold) });
  return `<div class="res-card shop-card">
      <div class="res-title ol ol-5 set-title">${U().confirmTitle}</div>
      <div class="shop-big">${thumbHtml(it, 120)}</div>
      <div class="shop-line"><b>${it.name}</b><span>${subLine(it)} · <em style="color:${R(it.rarity).color}">${R(it.rarity).name}</em></span></div>
      <div class="shop-line">${tpl(U().confirmText, { name: it.name, price })}</div>
      <button class="res-again" data-act="buyOk" data-arg="${id}"><span class="ol ol-4">${U().confirmOk}</span></button>
      <button class="mini-btn" data-act="closeShop">${U().cancel}</button>
    </div>`;
}

/** Achat fait : proposer d'équiper tout de suite. hero : héros pour qui équiper (tracés : héros actif). */
export function boughtHtml(id, hero) {
  const it = item(id);
  return `<div class="res-card shop-card">
      <div class="res-title ol ol-5 win">${U().newItem}</div>
      <div class="shop-big">${thumbHtml(it, 120)}</div>
      <div class="shop-line"><b>${it.name}</b><span>${subLine(it)}</span></div>
      <button class="res-again" data-act="equipNow" data-arg="${id}" data-hero="${hero}"><span class="ol ol-4">${U().equip}${it.kind === 'trail' ? ' · ' + heroName(hero) : ''}</span></button>
      <button class="mini-btn" data-act="closeShop">${U().chestOk}</button>
    </div>`;
}

export function doBuy(id) {
  const r = buy(id);
  if (r.ok) sfx(R(r.item.rarity).sound);
  return r;
}

/** Probabilités affichées (Google Play) : chances par rareté, garanties, liste de tous les objets. */
export function oddsHtml() {
  const C = D.economy.chests;
  const lines = Object.values(C).map(c => `<div class="odds-row"><b>${c.name}</b> · ${tr('money.gemsAmount', { n: nf(c.price) })}<div class="chest-odds">${oddsLine(c.odds)}</div></div>`).join('');
  const groups = ['epique', 'rare', 'commun'].map(r => {
    const list = items().filter(i => i.rarity === r);
    return `<div class="odds-group"><div class="odds-rar" style="color:${R(r).color}">${R(r).name} · ${list.length}</div>
      <ul>${list.map(i => `<li class="${owned(i.id) ? 'have' : ''}">${i.name}<small>${subLine(i)}${owned(i.id) ? ' · ' + U().owned : ''}</small></li>`).join('')}</ul></div>`;
  }).join('');
  return `<div class="res-card shop-card odds-card">
      <div class="res-title ol ol-5 set-title">${U().oddsTitle}</div>
      <p class="shop-line">${U().oddsIntro}</p>
      ${lines}
      <p class="shop-line">${tpl(U().oddsGuarantee, { n: C.simple.guaranteeEpicAfter })}<br>${U().oddsMinRare}</p>
      ${groups}
      <button class="res-again" data-act="closeShop"><span class="ol ol-4">${tr('common.ok')}</span></button>
    </div>`;
}

/** Ouverture d'un coffre : coffre fermé qui tremble, puis ouvert avec les objets. Renvoie le HTML de l'étape 1. */
export function chestIntroHtml(id) {
  const C = D.economy.chests[id];
  return `<div class="chest-open" data-act="chestReveal" data-arg="${id}">
      <img class="co-chest shake" src="${C.image.closed}" alt="" draggable="false">
      <div class="co-tap ol ol-4">${U().chestTap}</div>
      <button class="mini-btn co-cancel" data-act="closeShop">${U().cancel}</button>
    </div>`;
}

/** Étape 2 : tire les objets, joue le son de la meilleure rareté. */
export function chestRevealHtml(id, res = openChest(id)) {        // res : coffre déjà ouvert (coffre gratuit)
  const C = D.economy.chests[id];
  if (res.error) return null;
  const best = ['epique', 'rare', 'commun'].find(r => res.items.some(i => i.rarity === r)) || 'commun';
  sfx(R(best).sound);
  const cards = res.items.map((it, n) => `<div class="co-item r-${it.rarity}" style="animation-delay:${0.25 + n * 0.35}s">
      ${thumbHtml(it, 96)}
      <b>${it.name}</b><span>${subLine(it)}</span><em style="color:${R(it.rarity).color}">${R(it.rarity).name}</em>
    </div>`).join('');
  return `<div class="chest-open done r-${best}">
      <div class="co-glow"></div>
      <img class="co-chest pop" src="${C.image.open}" alt="" draggable="false">
      <div class="co-items">${cards}</div>
      <button class="res-again co-ok" data-act="closeShop"><span class="ol ol-4">${U().chestOk}</span></button>
    </div>`;
}

/* ---------- Carte Cosmétique (onglet Personnage) ---------- */
export function cosmeticCardHtml(hero) {
  const e = equipped(hero), T = D.cosmetics.types, Dft = D.cosmetics.defaults;
  const row = kind => {
    const slot = slotOf(kind), mine = forHero(hero, kind).filter(i => owned(i.id));
    const opt = (id, label, sw) => `<button class="cos-opt${(e[slot] || null) === id ? ' on' : ''}" data-act="equipC" data-slot="${slot}" data-arg="${id || ''}" aria-pressed="${(e[slot] || null) === id}">${sw}<span>${label}</span></button>`;
    const sw = it => it.kind === 'trail' ? trailIcon(it.color, 18) : glyph('circle', it.color, 16);
    const opts = [opt(null, Dft[slot], glyph('circle', '#E4D3B4', 16)), ...mine.map(it => opt(it.id, it.name, sw(it)))].join('');
    const locked = forHero(hero, kind).length - mine.length;
    return `<div class="cos-row"><div class="cos-label">${T[kind].name}${locked ? `<small>${tpl(D.cosmetics.ui.locked, { n: locked })}</small>` : ''}</div><div class="cos-opts">${opts}</div></div>`;
  };
  const skinOn = !!(e.skin && owned(e.skin));
  return `<div class="mini-row"><div class="mini-card wide cos-card">
      <div class="mini-kicker">${glyph('circle', '#9ACD32', 14, { outline: 1.6 })}${D.cosmetics.ui.kicker}</div>
      ${row('skin')}
      ${row('color')}${skinOn ? `<div class="cos-note">${D.cosmetics.ui.skinNote}</div>` : ''}
      ${row('weapon')}
      ${row('trail')}
      <button class="mini-btn" data-act="toShop">${D.cosmetics.ui.toShop}</button>
    </div></div>`;
}

export { heroLobbyHtml, equip, item, owned };
