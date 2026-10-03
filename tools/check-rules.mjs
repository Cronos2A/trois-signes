// Vérifie que les chiffres recopiés dans firestore.rules sont les mêmes que dans data/*.json.
// Lancer : node tools/check-rules.mjs (depuis le dossier du jeu).
import { readFileSync } from 'fs';
const rules = readFileSync('firestore.rules', 'utf8');
const J = f => JSON.parse(readFileSync('data/' + f + '.json', 'utf8'));
const duel = J('duel'), eco = J('economy'), ads = J('ads'), voyage = J('voyage'), chars = J('characters'), daily = J('daily');
const S = duel.security, bad = [];
const has = (what, re) => { if (!re.test(rules)) bad.push(what); };
has('plafonds des vagues', new RegExp('\\[' + S.waveCaps.join(',\\s*') + '\\]\\[k\\]'));
has('durée minimale d\'une vague', new RegExp('minWaveSeconds\\(\\) \\{ return ' + S.minWaveSeconds + '; \\}'));
has('nombre de vagues', new RegExp('function waves\\(\\) \\{ return ' + (duel.waves.length + 1) + '; \\}'));
has('déconnexion', new RegExp('duration\\.value\\(' + duel.absence_max_s + ", 's'\\)"));
has('Empreintes +/-', new RegExp('o == 1 \\? ' + duel.prints.win + ' : \\(o == -1 \\? ' + duel.prints.loss + ' : ' + duel.prints.tie + '\\)'));
has('record du Voyage', new RegExp('v <= ' + S.voyage.perSecond + ' \\* t \\* \\(' + S.voyage.base + ' \\+ ' + S.voyage.growth + ' \\* t\\)'));
has('pub récompensée (gemmes)', new RegExp('n\\.gems == o\\.gems \\+ ' + ads.rewarded.gems.amount + ' '));
has('pubs par jour', new RegExp('n\\.adCount <= ' + ads.rewarded.gems.perDay));
for (const a of voyage.arenas) has('gain gardien ' + a.id, new RegExp("'guardian:" + a.id + "': " + eco.gems.guardianFirst));
for (const c of chars.characters) has('gain histoire ' + c.id, new RegExp("'story:" + c.id + "': " + eco.gems.storyComplete));
has('gain épilogue', new RegExp("'epilogue': " + eco.gems.epilogue));
// Récompenses de connexion (data/daily.json) : heure de Paris, longueur des séries, gemmes par jour.
const DR = daily.day.rules;
has('heure de Paris (décalages)', new RegExp('\\(summer \\? ' + DR.summerOffsetHours + ' : ' + DR.standardOffsetHours + '\\) \\* 3600000'));
if (DR.summerTime !== 'eu' || daily.day.timeZone !== 'Europe/Paris') bad.push('fuseau horaire (les règles ne connaissent que Europe/Paris)');
has('série de ' + daily.streak.length + ' jours', new RegExp('o\\.streak % ' + daily.streak.length + ' \\+ 1'));
has('calendrier de ' + daily.calendar.length + ' connexions', new RegExp('o\\.cal % ' + daily.calendar.length + ' \\+ 1'));
const ternary = (v, days) => days.length ? days.map(([d, g]) => v + ' == ' + d + ' ? ' + g + ' : ').join('(') + '0' + ')'.repeat(days.length - 1) : '0';
const sDays = daily.streak.map((r, i) => [i + 1, r.gems || 0]).filter(x => x[1]);
const cDays = Object.entries(daily.calendar.special).filter(([, r]) => r.gems).map(([d, r]) => [+d, r.gems]).sort((a, b) => a[0] - b[0]);
const lit = s => s.replace(/[()?]/g, m => '\\' + m);
has('gemmes de la série', new RegExp('function streakGems\\(s\\) \\{ return ' + lit(ternary('s', sDays)) + '; \\}'));
has('gemmes du calendrier', new RegExp('function calendarGems\\(c\\) \\{ return ' + lit(ternary('c', cDays)) + '; \\}'));
// Signalements (data/online.json → report) et suppression du compte (→ account).
const on = J('online');
has('raisons des signalements', new RegExp("reason in \\[" + on.report.reasons.map(r => "'" + r + "'").join(', ') + '\\]'));
has('origines des signalements', new RegExp("board in \\[" + on.report.boards.map(r => "'" + r + "'").join(', ') + '\\]'));
has('collection des signalements', new RegExp('match /' + on.report.collection + '/\\{id\\}'));
has('comptes supprimés', new RegExp('match /' + on.account.closed + '/\\{uid\\}'));
for (const c of [...on.account.erase, on.account.ranked]) has('suppression de ' + c, new RegExp('match /' + c + '/\\{uid\\} \\{[^]*?allow delete: if isOwner\\(uid\\)'));
console.log(bad.length ? 'À corriger dans firestore.rules : ' + bad.join(', ') : 'firestore.rules : chiffres identiques aux données.');
process.exit(bad.length ? 1 : 0);
