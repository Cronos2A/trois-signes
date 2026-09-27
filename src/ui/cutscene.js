// Lecteur unique de cinématiques et de dialogues (prologue, ouvertures, dialogues, fins).
// Chaque ligne : { qui: 'narrateur' | id, texte, expression?, decor?, sujets?: ['id:expression'] }.
// Les textes viennent tels quels de data/story_mode.json. Le lecteur couvre tout l'écran :
// ses appuis ne peuvent jamais devenir des gestes de jeu.
import { D } from '../data.js';
import { portraitUrl, decorUrl, who, placeName, pastille } from './assets.js';

const $ = id => document.getElementById(id);
let el = null;

function build() {
  el = document.createElement('div');
  el.id = 'cutscene';
  el.className = 'cs hidden';
  el.setAttribute('role', 'dialog');
  el.innerHTML = `<div class="cs-bg" id="csBg"><span class="cs-place" id="csPlace"></span></div>
    <button class="cs-skip" id="csSkip">Passer</button>
    <div class="cs-subjects" id="csSubjects"></div>
    <div class="cs-box" id="csBox">
      <div class="cs-who" id="csWho"><div class="cs-av" id="csAv"></div><span class="cs-name" id="csName"></span></div>
      <p class="cs-text" id="csText"></p>
      <span class="cs-next" id="csNext" aria-hidden="true"></span>
    </div>`;
  document.body.appendChild(el);
  // Rien ne traverse le lecteur : ni tap, ni tracé vers le canvas du combat.
  // (touch-action:none en CSS empêche le défilement ; pas de preventDefault, qui supprimerait le clic.)
  for (const t of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend']) {
    el.addEventListener(t, e => e.stopPropagation());
  }
}

const img = (url, cls) => `<img class="${cls}" src="${url}" alt="" draggable="false">`;

async function portrait(id, expr, cls) {
  const url = await portraitUrl(id, expr);
  return url ? `<div class="${cls}">${img(url, 'cs-img')}</div>` : pastille(id, cls);
}

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
      el.classList.add('hidden');
      el.onclick = null; $('csSkip').onclick = null;
      resolve();
    };

    const type = () => {
      clearInterval(timer);
      timer = setInterval(() => {
        shown = Math.min(full.length, shown + 1);
        $('csText').textContent = full.slice(0, shown);
        if (shown >= full.length) { clearInterval(timer); el.classList.add('cs-ready'); }
      }, 1000 / speed);
    };

    const next = async () => {
      if (busy) return;
      if (++i >= lines.length) return finish();
      busy = true;
      const L = lines[i], narr = L.qui === 'narrateur';
      if (L.decor) decor = L.decor;
      const subj = (L.sujets || []).map(s => s.split(':'));
      const [bg, av, subs] = await Promise.all([
        decorUrl(decor),
        narr ? '' : portrait(L.qui, L.expression, 'cs-av-in'),
        Promise.all(subj.map(([id, ex]) => portrait(id, ex, 'cs-sub-in')))
      ]);
      if (done) return;
      const bgEl = $('csBg');
      bgEl.style.backgroundImage = bg ? `url("${bg}")` : '';
      bgEl.classList.toggle('fallback', !bg);
      $('csPlace').textContent = bg ? '' : placeName(decor);
      $('csSubjects').innerHTML = subj.map(([id], k) =>
        `<div class="cs-sub${!narr && id !== L.qui ? ' dim' : ''}" style="--n:${subj.length}">${subs[k]}</div>`).join('');
      $('csBox').classList.toggle('narr', narr);
      $('csAv').innerHTML = av;
      $('csName').textContent = narr ? '' : who(L.qui).name;
      full = L.texte; shown = 0; $('csText').textContent = '';
      el.classList.remove('cs-ready');
      busy = false;
      type();
    };

    // Un tap : affiche la ligne en entier ; un second tap : ligne suivante.
    el.onclick = e => {
      if (e.target.id === 'csSkip') return;
      if (shown < full.length) { shown = full.length; $('csText').textContent = full; clearInterval(timer); el.classList.add('cs-ready'); }
      else next();
    };
    $('csSkip').onclick = e => { e.stopPropagation(); finish(); };
    el.classList.remove('hidden');
    next();
  });
}
