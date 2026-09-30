// Lecteur unique de cinématiques et de dialogues (prologue, ouvertures, dialogues, fins), d'après les écrans
// 03 et 04 de la maquette (design/trois-signes-maquette-lobby/project/Mode Histoire Trois Signes.dc.html).
// Chaque ligne : { qui: 'narrateur' | id, texte, expression?, decor?, sujets?: ['id:expression'] }.
// Les textes viennent tels quels de data/story_mode.json. Le lecteur couvre tout l'écran :
// ses appuis ne peuvent jamais devenir des gestes de jeu.
import { D } from '../data.js';
import { portraitUrl, decorUrl, who, placeName } from './assets.js';
import { facets } from './icons.js';
import { silhouette, skipIcon, chevron } from './story-art.js';
import { sfx, duck } from '../audio/audio.js';
import { tr, initialOf } from '../i18n.js';

const $ = id => document.getElementById(id);
let el = null;

function build() {
  el = document.createElement('div');
  el.id = 'cutscene';
  el.className = 'cs hidden';
  el.setAttribute('role', 'dialog');
  el.innerHTML = `<div class="cs-bg" id="csBg"><span class="cs-place" id="csPlace"></span></div>
    <div class="cs-top"><div class="cs-pips" id="csPips"></div><button class="cs-skip" id="csSkip">${tr('dialogue.skip')}${skipIcon(16)}</button></div>
    <div class="cs-busts" id="csBusts"></div>
    <div class="cs-box" id="csBox">
      <div class="cs-name" id="csName"></div>
      <p class="cs-text" id="csText"></p>
      <div class="cs-hint">${tr('common.tapContinue')}<span id="csChev"></span></div>
    </div>`;
  document.body.appendChild(el);
  // Rien ne traverse le lecteur : ni tap, ni tracé vers le canvas du combat.
  // (touch-action:none en CSS empêche le défilement ; pas de preventDefault, qui supprimerait le clic.)
  for (const t of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend']) {
    el.addEventListener(t, e => e.stopPropagation());
  }
}

/** Buste d'un personnage : son portrait s'il existe, sinon sa couleur, ses facettes et son initiale (Eldan : silhouette). */
async function bust(id, expr) {
  const url = await portraitUrl(id, expr), w = who(id);
  if (url) return `<div class="cs-bust-in img" style="background:${w.bust || w.color}"><img src="${url}" alt="" draggable="false"></div>`;
  const inner = id === 'eldan' ? `<div class="cs-sil">${silhouette('color', 150)}</div>`
    : `<span class="ol">${initialOf(w.name)}</span>`;
  return `<div class="cs-bust-in" style="background:${w.bust || w.color}">${facets.med()}${inner}</div>`;
}

const SLOTS = { 1: [.5], 2: [.29, .71], 3: [.22, .5, .78], 4: [.16, .39, .61, .84] };   // maquette : 190 / 112-268 / 84-190-296 sur 390 px

/**
 * Joue une suite de lignes. startDecor : décor par défaut (lieu du combat) quand une ligne n'en donne pas.
 * Renvoie une promesse résolue à la fin (ou quand le joueur appuie sur « Passer »).
 */
export function playScene(lines, { decor: startDecor } = {}) {
  if (!lines || !lines.length) return Promise.resolve();
  if (!el) build();
  const speed = D.rules.story.lettersPerSecond;
  return new Promise(resolve => {
    let i = -1, decor = startDecor || null, full = '', shown = 0, timer = 0, busy = false, done = false;

    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(timer);
      duck(false);
      el.classList.add('hidden');
      el.onclick = null; $('csSkip').onclick = null;
      resolve();
    };

    const complete = () => { shown = full.length; $('csText').textContent = full; clearInterval(timer); el.classList.add('cs-ready'); };
    const type = () => {
      clearInterval(timer);
      timer = setInterval(() => {
        shown = Math.min(full.length, shown + 1);
        if (shown % D.audio.textTickEvery === 0 && full[shown - 1] !== ' ') sfx('texte');
        $('csText').textContent = full.slice(0, shown);
        if (shown >= full.length) complete();
      }, 1000 / speed);
    };

    const next = async () => {
      if (busy) return;
      if (++i >= lines.length) return finish();
      if (i > 0) sfx('page');
      busy = true;
      const L = lines[i], narr = L.qui === 'narrateur';
      if (L.decor) decor = L.decor;
      const subj = (L.sujets || []).map(s => s.split(':'));
      // Celui qui parle a toujours son buste, même s'il n'est pas dans les sujets.
      if (!narr && !subj.some(([id]) => id === L.qui)) subj.push([L.qui, L.expression]);
      const [bg, busts] = await Promise.all([decorUrl(decor), Promise.all(subj.slice(0, 4).map(([id, ex]) => bust(id, ex)))]);
      if (done) return;
      const bgEl = $('csBg');
      bgEl.style.backgroundImage = bg ? `url("${bg}")` : '';
      bgEl.classList.toggle('fallback', !bg);
      $('csPlace').textContent = bg ? '' : placeName(decor);
      const slots = SLOTS[busts.length] || [];
      $('csBusts').innerHTML = busts.map((b, k) => {
        const speaking = subj[k][0] === L.qui, dim = !narr && !speaking;
        return `<div class="cs-bust${speaking ? ' speak' : dim ? ' dim' : ''}" style="left:${slots[k] * 100}%">${b}</div>`;
      }).join('');
      $('csPips').innerHTML = lines.length > 1 ? lines.map((_, k) => `<i class="${k === i ? 'cur' : k < i ? 'on' : ''}"></i>`).join('') : '';
      $('csBox').classList.toggle('narr', narr);
      const w = narr ? null : who(L.qui);
      $('csName').innerHTML = narr ? '' : `<span class="ol">${w.name}</span>`;
      $('csName').style.background = narr ? '' : w.color;
      $('csChev').innerHTML = chevron(narr ? '#CFF2C0' : '#5b5048');
      full = L.texte; shown = 0; $('csText').textContent = '';
      el.classList.remove('cs-ready');
      busy = false;
      type();
    };

    // Un tap : affiche la ligne en entier ; un second tap : ligne suivante.
    el.onclick = e => {
      if (e.target.closest('#csSkip')) return;
      if (shown < full.length) complete();
      else next();
    };
    $('csSkip').onclick = e => { e.stopPropagation(); finish(); };
    el.classList.remove('hidden');
    duck(true);                      // musique baissée de moitié pendant les dialogues
    next();
  });
}
