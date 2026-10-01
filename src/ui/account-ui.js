// Compte du joueur : fenêtre « Choisis ton pseudo » (premier lancement, ou Réglages → Modifier) et bloc Compte des Réglages.
// Textes et règles : data/online.json (ui, pseudo). Logique : online/online.js et online/pseudo.js.
import { D } from '../data.js';
import { prog } from '../game/progress.js';
import { setPseudo, pseudo, onlineState, onOnlineChange } from '../online/online.js';
import { connectGoogle, googleInfo, deleteAccount } from '../online/account.js';
import { checkPseudo, suggestPseudo } from '../online/pseudo.js';
import { sfx } from '../audio/audio.js';
import { tr, nfi, dateText } from '../i18n.js';

const U = () => D.online.ui;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let open = null;   // fenêtre ouverte : { resolve }

/**
 * Fenêtre du pseudo. canCancel : depuis les Réglages (sinon obligatoire, au premier lancement).
 * Renvoie une promesse résolue avec le pseudo validé (ou null si annulé).
 */
export function askPseudo(canCancel = false) {
  if (open) return open.promise;
  const m = $('pseudoModal');
  const cur = pseudo() || suggestPseudo(), P = D.online.pseudo;
  m.innerHTML = `<div class="res-card set-card ps-card">
      <div class="res-title ol ol-5 set-title">${U().title}</div>
      <p class="ps-intro">${U().intro}</p>
      <div class="ps-field"><input class="ps-input" id="psInput" type="text" maxlength="${P.max}" autocomplete="off" autocapitalize="off" spellcheck="false"
        placeholder="${U().placeholder}" aria-label="${U().placeholder}" value="${esc(cur)}">
        <button class="chip ps-dice" data-pa="suggest">${U().suggest}</button></div>
      <div class="ps-err" id="psErr" role="alert"></div>
      <button class="res-again" data-pa="ok"><span class="ol ol-4">${U().ok}</span></button>
      ${canCancel ? `<button class="mini-btn ps-cancel" data-pa="cancel">${U().cancel}</button>`
        : googleInfo().linked ? '' : `<button class="mini-btn ps-google" data-pa="google">${tr('account.pseudoHasSave')}</button>`}
    </div>`;
  m.classList.remove('hidden');
  const input = $('psInput'), err = $('psErr');
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  const close = v => { m.classList.add('hidden'); m.innerHTML = ''; m.onclick = null; open = null; resolve(v); };
  const submit = () => {
    const r = checkPseudo(input.value);
    if (r.error) { err.textContent = r.error; input.focus(); return; }
    setPseudo(r.ok);
    close(r.ok);
  };
  input.addEventListener('input', () => { const r = checkPseudo(input.value); err.textContent = input.value.trim().length >= P.min ? (r.error || '') : ''; });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
  m.onclick = e => {
    const b = e.target.closest('[data-pa]');
    if (!b) return;
    sfx('ui_clic');
    if (b.dataset.pa === 'ok') submit();
    else if (b.dataset.pa === 'cancel') close(null);
    else if (b.dataset.pa === 'suggest') { input.value = suggestPseudo(); err.textContent = ''; }
    else if (b.dataset.pa === 'google') googleFlow().then(r => { if (r === 'linked') b.remove(); });
  };
  open = { promise };
  return promise;
}

/** Premier lancement (après le prologue et la leçon) : pseudo obligatoire s'il n'y en a pas encore. */
export function ensurePseudo() {
  if (pseudo() || !prog.tutorial || !prog.story.prologue) return Promise.resolve(pseudo());
  return askPseudo(false);
}

function statusText(s) {
  const t = U().status[s.state] || U().status.off;
  return s.uid ? `${t} · ${U().id.replace('{id}', s.uid.slice(0, 8))}` : t;
}

/** Bloc Compte des Réglages : pseudo, état du serveur, Google (sauvegarder / se connecter), suppression du compte. */
export function accountHtml() {
  const g = googleInfo();
  const google = g.linked
    ? `<span class="acc-linked">${tr('account.googleLinked')}${g.email ? `<small>${esc(tr('account.googleAs', { email: g.email }))}</small>` : ''}</span>`
    : `<button class="mini-btn acc-google" data-act="googleLink">${tr('account.googleSave')}</button>
       <span class="acc-status">${tr('account.googleHint')}</span>
       <button class="mini-btn acc-google" data-act="googleLink">${tr('account.googleSignIn')}</button>`;
  return `<div class="set-row acc-row"><span class="set-label">${U().account}</span>
      <div class="acc-line"><span class="acc-pseudo">${tr('common.labelValue', { label: U().pseudoLabel, value: '<b>' + esc(pseudo() || '—') + '</b>' })}</span>
        <button class="chip acc-edit" data-act="pseudoEdit">${U().edit}</button></div>
      <span class="acc-status" id="accStatus">${statusText(onlineState())}</span>
      ${google}
      <button class="mini-btn acc-delete" data-act="deleteAccount">${tr('account.deleteBtn')}</button>
    </div>`;
}

/* ---------- Fenêtres du compte (Google, suppression) : au-dessus de tout, y compris de la fenêtre du pseudo ---------- */
function accModal() {
  let m = $('accModal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'accModal'; m.className = 'lb-modal hidden'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    ($('pseudoModal') ? $('pseudoModal').parentElement : document.body).appendChild(m);
  }
  return m;
}
/** Affiche une fenêtre ; buttons : [{ id, label, main }] ; résolue avec l'id du bouton touché. */
function dialog(title, html, buttons) {
  const m = accModal();
  m.innerHTML = `<div class="res-card set-card ps-card acc-card"><div class="res-title ol ol-5 set-title">${title}</div>${html}
    ${buttons.map(b => b.main ? `<button class="res-again${b.danger ? ' acc-danger' : ''}" data-ac="${b.id}"><span class="ol ol-4">${b.label}</span></button>`
      : `<button class="mini-btn" data-ac="${b.id}">${b.label}</button>`).join('')}</div>`;
  m.classList.remove('hidden');
  return new Promise(done => {
    m.onclick = e => { const b = e.target.closest('[data-ac]'); if (!b) return; sfx('ui_clic'); m.onclick = null; done(b.dataset.ac); };
  });
}
function busy(title) { const m = accModal(); m.innerHTML = `<div class="res-card set-card ps-card acc-card"><div class="res-title ol ol-5 set-title">${title}</div><p class="ps-intro">${tr('account.working')}</p></div>`; m.classList.remove('hidden'); m.onclick = null; }
function closeAcc() { const m = $('accModal'); if (m) { m.classList.add('hidden'); m.innerHTML = ''; m.onclick = null; } }
const info = (title, text) => dialog(title, `<p class="ps-intro">${text}</p>`, [{ id: 'ok', label: tr('account.ok'), main: true }]).then(closeAcc);

/** Résumé d'une progression (choix entre deux progressions). */
function summaryHtml(t, s) {
  if (s.empty) return `<div class="acc-sum"><b>${t}</b><span>${tr('account.noSave')}</span></div>`;
  return `<div class="acc-sum"><b>${t}</b>${s.pseudo ? `<span class="acc-sum-name">${esc(s.pseudo)}</span>` : ''}
    <span>${tr('account.record', { n: nfi(s.best) })} · ${tr('account.level', { n: s.lvl })}</span>
    <span>${tr('account.stories', { n: s.stories })}</span>
    <span>${tr('account.wealth', { gold: nfi(s.gold), gems: nfi(s.gems), prints: nfi(s.prints) })}</span></div>`;
}

/** Ce compte Google a déjà sa progression : le joueur choisit, puis confirme (rien n'est écrit avant). */
async function chooseSave(here, google) {
  for (;;) {
    const pick = await dialog(tr('account.chooseTitle'), `<p class="ps-intro">${tr('account.chooseText')}</p>
        ${summaryHtml(tr('account.here'), here)}<button class="res-again" data-ac="phone"><span class="ol ol-4">${tr('account.keep')}</span></button>
        ${summaryHtml(tr('account.google'), google)}<button class="res-again" data-ac="google"><span class="ol ol-4">${tr('account.keep')}</span></button>`,
      [{ id: 'cancel', label: tr('account.cancel') }]);
    if (pick === 'cancel') { closeAcc(); return null; }
    const which = pick === 'phone' ? tr('account.here') : tr('account.google');
    const ok = await dialog(which, `<p class="ps-intro">${tr(pick === 'phone' ? 'account.confirmPhone' : 'account.confirmGoogle')}</p>`,
      [{ id: 'yes', label: tr('account.confirmOk'), main: true }, { id: 'back', label: tr('account.back') }]);
    if (ok === 'yes') { busy(tr('account.google')); return pick; }
  }
}

/** « Sauvegarder ma progression avec Google » / « Se connecter avec Google ». Résolue avec le statut. */
export async function googleFlow() {
  busy(tr('account.google'));
  const r = await connectGoogle(chooseSave);
  const T = tr('account.google');
  if (r.status === 'linked') await info(T, tr('account.linkedOk'));
  else if (r.status === 'already') await info(T, tr('account.already'));
  else if (r.status === 'offline') await info(T, tr('account.offline'));
  else if (r.status === 'switched') { await info(T, tr('account.switched')); location.reload(); }
  else if (r.status === 'error') await info(T, r.code === 'ts/no-plugin' ? tr('account.noPlugin') : tr('account.error', { code: esc(r.code || '?') }));
  else closeAcc();
  return r.status;
}

/** « Supprimer mon compte et mes données » : deux confirmations, puis suppression et retour au premier lancement. */
export async function deleteFlow() {
  const T = tr('account.deleteTitle');
  const a = await dialog(T, `<p class="ps-intro">${tr('account.deleteText')}</p>`,
    [{ id: 'go', label: tr('account.deleteContinue'), main: true, danger: true }, { id: 'no', label: tr('account.cancel') }]);
  if (a !== 'go') { closeAcc(); return 'cancelled'; }
  const b = await dialog(T, `<p class="ps-intro ps-err">${tr('account.deleteSure')}</p>`,
    [{ id: 'del', label: tr('account.deleteConfirm'), main: true, danger: true }, { id: 'no', label: tr('account.cancel') }]);
  if (b !== 'del') { closeAcc(); return 'cancelled'; }
  busy(tr('account.deleting'));
  const r = await deleteAccount();
  if (r.status === 'deleted') { await info(T, tr('account.deleted')); location.reload(); }
  else if (r.status === 'offline') await info(T, tr('account.deleteOffline'));
  else if (r.status === 'error') await info(T, tr('account.deleteError', { code: esc(r.code || '?') }));
  else closeAcc();
  return r.status;
}

// L'état du serveur change pendant que les Réglages sont ouverts : la ligne d'état suit.
onOnlineChange(s => { const el = $('accStatus'); if (el) el.textContent = statusText(s); });

/**
 * Sauvegarde locale endommagée (game/save-check.js) : écran de choix au lancement.
 * Cherche la sauvegarde en ligne du compte ; propose de la récupérer, ou de repartir à zéro (avec confirmation).
 * h : { remote() → { data, savedAt } | null, recover(data), reset() }. Résolue quand le joueur a choisi.
 */
export function askDamagedSave(h) {
  const T = D.online.damaged, m = $('pseudoModal');
  return new Promise(done => {
    let found = null, confirm = false, state = 'search';
    const draw = () => {
      let body = '';
      if (state === 'search') body = `<p class="ps-intro dm-wait">${T.searching}</p>`;
      else if (found) {
        const d = dateText(found.savedAt || Date.now());
        const st = Object.values((found.data.story && found.data.story.done) || {}).filter(l => l.length >= 10).length;
        body = `<p class="ps-intro">${T.found.replace('{date}', d)}</p>
          <p class="ps-intro dm-detail">${T.foundDetail.replace('{best}', nfi(found.data.best || 0)).replace('{stories}', st).replace('{gold}', nfi((found.data.eco && found.data.eco.gold) || 0))}</p>
          <button class="res-again" data-dm="recover"><span class="ol ol-4">${T.recover}</span></button>`;
      } else body = `<p class="ps-intro">${state === 'offline' ? T.offline : T.none}</p>
          <button class="mini-btn" data-dm="retry">${T.retry}</button>`;
      const reset = confirm
        ? `<p class="ps-err dm-warn">${T.confirmReset}</p><button class="res-again dm-reset" data-dm="resetOk"><span class="ol ol-4">${T.confirmResetBtn}</span></button>`
        : `<button class="${found ? 'mini-btn' : 'res-again'} dm-reset" data-dm="reset">${found ? T.reset : `<span class="ol ol-4">${T.reset}</span>`}</button>`;
      m.innerHTML = `<div class="res-card set-card ps-card dm-card" role="alertdialog" aria-label="${T.title}">
          <div class="res-title ol ol-5 set-title">${T.title}</div>
          <p class="ps-intro">${T.text}</p>${body}${state === 'search' ? '' : reset}</div>`;
      m.classList.remove('hidden');
    };
    const search = async () => {
      state = 'search'; draw();
      try {
        found = await Promise.race([h.remote(), new Promise((_, ko) => setTimeout(() => ko(new Error('délai')), T.searchSeconds * 1000))]);
        state = found ? 'found' : 'none';
      } catch (e) { found = null; state = 'offline'; }
      draw();
    };
    const close = () => { m.classList.add('hidden'); m.innerHTML = ''; m.onclick = null; done(); };
    m.onclick = e => {
      const b = e.target.closest('[data-dm]');
      if (!b) return;
      sfx('ui_clic');
      const a = b.dataset.dm;
      if (a === 'recover' && found) { h.recover(found.data); close(); }
      else if (a === 'retry') search();
      else if (a === 'reset') { confirm = true; draw(); }
      else if (a === 'resetOk') { h.reset(); close(); }
    };
    search();
  });
}
