// Vérifie que les chiffres recopiés dans firestore.rules sont les mêmes que dans data/*.json.
// Lancer : node tools/check-rules.mjs (depuis le dossier du jeu).
import { readFileSync } from 'fs';
const rules = readFileSync('firestore.rules', 'utf8');
const J = f => JSON.parse(readFileSync('data/' + f + '.json', 'utf8'));
const duel = J('duel'), eco = J('economy'), ads = J('ads'), voyage = J('voyage'), chars = J('characters');
const S = duel.security, bad = [];
const has = (what, re) => { if (!re.test(rules)) bad.push(what); };
has('plafonds des vagues', new RegExp('\\[' + S.waveCaps.join(',\\s*') + '\\]\\[k\\]'));
has('durée minimale d\'une vague', new RegExp('minWaveSeconds\\(\\) \\{ return ' + S.minWaveSeconds + '; \\}'));
has('nombre de vagues', new RegExp('function waves\\(\\) \\{ return ' + (duel.waves.length + 1) + '; \\}'));
has('déconnexion', new RegExp('duration\\.value\\(' + duel.disconnectSeconds + ", 's'\\)"));
has('Empreintes +/-', new RegExp('o == 1 \\? ' + duel.prints.win + ' : \\(o == -1 \\? ' + duel.prints.loss + ' : ' + duel.prints.tie + '\\)'));
has('record du Voyage', new RegExp('v <= ' + S.voyage.perSecond + ' \\* t \\* \\(' + S.voyage.base + ' \\+ ' + S.voyage.growth + ' \\* t\\)'));
has('pub récompensée (gemmes)', new RegExp('n\\.gems == o\\.gems \\+ ' + ads.rewarded.gems.amount + ' '));
has('pubs par jour', new RegExp('n\\.adCount <= ' + ads.rewarded.gems.perDay));
for (const a of voyage.arenas) has('gain gardien ' + a.id, new RegExp("'guardian:" + a.id + "': " + eco.gems.guardianFirst));
for (const c of chars.characters) has('gain histoire ' + c.id, new RegExp("'story:" + c.id + "': " + eco.gems.storyComplete));
has('gain épilogue', new RegExp("'epilogue': " + eco.gems.epilogue));
console.log(bad.length ? 'À corriger dans firestore.rules : ' + bad.join(', ') : 'firestore.rules : chiffres identiques aux données.');
process.exit(bad.length ? 1 : 0);
