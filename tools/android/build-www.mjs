// Dossier de build de l'application Android (Capacitor → webDir "www") : seulement ce dont le jeu a besoin.
// Copiés : index.html, manifest.webmanifest, src/, data/, assets/ (images, sons, polices et leurs licences).
// Jamais : design/, docs/, legal/ (pages publiées sur le site), prototype/, tools/, tests, PDF, notes (*.md), journaux,
// la source de l'icône (assets/icone-app/, convertie dans android/ par tools/android/icons.mjs).
// Lancer depuis le dossier du jeu : node tools/android/build-www.mjs (ou npm run www). Affiche le poids final.
import { cpSync, rmSync, mkdirSync, statSync, readdirSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';

const ROOT = process.cwd(), OUT = join(ROOT, 'www');
const FILES = ['index.html', 'manifest.webmanifest'];
const DIRS = ['src', 'data', 'assets'];
const SKIP_DIRS = new Set(['icone-app']);                       // source de l'icône : pas dans le jeu
const SKIP_EXT = new Set(['.md', '.pdf', '.log', '.psd', '.ai', '.zip', '.xcf', '.kra']);
const KEEP_TXT = /^OFL-/;                                       // licences des polices : obligatoires avec les polices

if (!existsSync(join(ROOT, 'index.html')) || !existsSync(join(ROOT, 'data'))) { console.error('Lancer depuis le dossier du jeu.'); process.exit(1); }
const eco = JSON.parse(await import('fs').then(f => f.readFileSync(join(ROOT, 'data/economy.json'), 'utf8')));
if (eco.test && eco.test.autorise) { console.error('ARRÊT : data/economy.json → test.autorise doit valoir false dans une application publiée.'); process.exit(1); }

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const f of FILES) cpSync(join(ROOT, f), join(OUT, f));
const keep = src => {
  const name = basename(src);
  if (name.startsWith('.')) return false;
  let st; try { st = statSync(src); } catch (e) { return false; }
  if (st.isDirectory()) return !SKIP_DIRS.has(name);
  const ext = extname(name).toLowerCase();
  if (SKIP_EXT.has(ext)) return false;
  if (ext === '.txt' && !KEEP_TXT.test(name)) return false;
  return true;
};
for (const d of DIRS) cpSync(join(ROOT, d), join(OUT, d), { recursive: true, filter: keep });

// Poids final, par dossier.
const size = p => { const st = statSync(p); return st.isDirectory() ? readdirSync(p).reduce((s, n) => s + size(join(p, n)), 0) : st.size; };
const count = p => { const st = statSync(p); return st.isDirectory() ? readdirSync(p).reduce((s, n) => s + count(join(p, n)), 0) : 1; };
const mb = n => (n / 1048576).toFixed(1) + ' Mo';
for (const d of DIRS) console.log('  ' + d.padEnd(8) + mb(size(join(OUT, d))).padStart(9));
console.log('www/ : ' + mb(size(OUT)) + ' (' + count(OUT) + ' fichiers)');
