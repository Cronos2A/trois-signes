// Langues : tous les textes de l'interface viennent de data/i18n/{langue}.json (clé → texte), jamais du code.
// Langue active : celle choisie dans les Réglages, sinon celle du téléphone si elle est proposée (data/i18n/languages.json),
// sinon l'anglais. Une clé absente de la langue active est prise en français (langue de référence).
// Les textes déjà rangés dans les autres fichiers de data/ (noms d'objets, descriptions…) se traduisent par la section
// « data » du fichier de langue, superposée à ces fichiers au chargement (applyDataOverlay).
import { settings, setSetting } from './game/settings.js';

const BASE = 'fr';
let LANGS = [], lang = BASE, locale = 'fr-FR', cur = {}, ref = {}, numberFmt = null, plural = null;

const get = (o, key) => key.split('.').reduce((v, k) => (v == null ? undefined : v[k]), o);
async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + ' : ' + r.status);
  return r.json();
}

/** Langue demandée : ?lang= (tests), Réglages, téléphone ; sinon la langue de secours (anglais). */
function wanted(fallback) {
  const ids = LANGS.map(l => l.id);
  const q = new URLSearchParams(location.search).get('lang');
  if (q && ids.includes(q)) return q;
  if (settings.lang && ids.includes(settings.lang)) return settings.lang;
  for (const l of navigator.languages || [navigator.language || '']) {
    const id = String(l).slice(0, 2).toLowerCase();
    if (ids.includes(id)) return id;
  }
  return fallback;
}

/** Charge la langue de référence (français), puis la langue active (avant les autres données : message d'erreur traduit). */
export async function loadI18n() {
  const L = await fetchJson('data/i18n/languages.json');
  LANGS = L.languages;
  ref = await fetchJson('data/i18n/' + BASE + '.json');
  lang = wanted(L.fallback);
  cur = lang === BASE ? ref : await fetchJson('data/i18n/' + lang + '.json').catch(() => ({}));   // pas encore traduite : tout en français
  locale = (LANGS.find(l => l.id === lang) || {}).locale || 'fr-FR';
  numberFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  plural = new Intl.PluralRules(locale);
  document.documentElement.lang = lang;
}

/** Textes des autres fichiers de data/ dans la langue active (section « data » du fichier de langue). */
export function applyLanguageData(D) { if (cur.data) applyDataOverlay(D, cur.data); }

/** Superpose les textes traduits aux fichiers de données (même chemin : { economy: { ui: { buy: "Buy" } } }). */
function applyDataOverlay(target, over) {
  for (const [k, v] of Object.entries(over)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object') applyDataOverlay(target[k], v);
    else target[k] = v;
  }
}

export const language = () => lang;
export const languages = () => LANGS;

/** Choix de langue (Réglages) : sauvegardé, puis le jeu se recharge dans la nouvelle langue. */
export function setLanguage(id) { setSetting('lang', id); location.reload(); }

/**
 * Texte de la clé dans la langue active (repli : français, puis la clé elle-même).
 * vars : { nom: valeur } remplace {nom}. Pluriel : si le texte est { one, other… } (règles de la langue), vars.n choisit la forme.
 */
export function tr(key, vars = {}) {
  let s = get(cur, key);
  if (s === undefined) s = get(ref, key);
  if (s === undefined) return key;
  return fmt(s, vars);
}

/** Même mise en forme pour un texte déjà en main (chaîne ou formes du pluriel). */
export function fmt(s, vars = {}) {
  if (s && typeof s === 'object' && !Array.isArray(s)) s = s[plural ? plural.select(vars.n ?? 0) : 'other'] ?? s.other ?? '';
  return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}

/** Nombre au format de la langue (séparateur des milliers insécable, virgule ou point décimal). */
export function nf(n) {
  const s = numberFmt ? numberFmt.format(n) : String(n);
  return s.replace(/ /g, ' ');
}
/** Entier arrondi, au format de la langue. */
export const nfi = n => nf(Math.round(n));

/** Liste brute d'une clé (tableaux : titres des dialogues…), repli en français. */
export function list(key) { return get(cur, key) || get(ref, key) || []; }

/**
 * « de » + nom quelconque (pseudo d'un joueur) selon les règles de la langue (fr.json → grammar.of) :
 * première règle dont l'expression correspond ; sinon la forme par défaut. Les lieux et les héros ont, eux, leur forme
 * complète écrite dans le fichier de langue (clés of.arena.*, of.hero.*).
 */
export function ofName(name) {
  const G = get(cur, 'grammar.of') || get(ref, 'grammar.of');
  if (!G) return name;
  for (const r of G.rules || []) {
    const m = new RegExp(r.match, 'u' + (r.flags || '')).exec(name);
    if (m) return fmt(r.out, { name, rest: m[1] ?? name });
  }
  return fmt(G.default, { name });
}

/** Initiale d'un nom de personnage, sans son article ni son titre (fr.json → dialogue.titles : « Sire », « Maître »…). */
export function initialOf(name) {
  const n = String(name || '');
  const p = list('dialogue.titles').find(x => n.startsWith(x));
  return (p ? n.slice(p.length) : n)[0] || '';
}

/** Date au format de la langue (« 29 septembre 2026 »). */
export const dateText = ts => new Date(ts).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });

/** Textes fixes de index.html : data-i18n (texte), data-i18n-title, data-i18n-aria ; titre de la page. */
export function applyStatic(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = tr(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-title]')) el.title = tr(el.dataset.i18nTitle);
  for (const el of root.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', tr(el.dataset.i18nAria));
  document.title = tr('app.title');
}
