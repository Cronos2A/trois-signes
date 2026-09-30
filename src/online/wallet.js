// Portefeuille de gemmes au serveur : wallet/{uid} = { gems, granted[], adDay, adCount, updatedAt }. C'est lui qui fait foi ;
// prog.eco.gems n'en est que le reflet sur l'appareil. Les règles (firestore.rules) n'acceptent que trois mouvements :
// un gain de la table fixe (grant : gardien, histoire, épilogue ; une seule fois chacun), une pub récompensée (ad : +5, 3 par jour),
// une dépense (spend) ; et les gemmes d'une récompense de connexion, dans la même écriture que daily/{uid} (online/daily-net.js).
// Hors connexion, les mouvements attendent dans prog.eco.pending et partent au retour du réseau.
// Mode test sans émulateur (développement local) : gemmes locales seulement, rien n'est envoyé.
import { prog, saveProg } from '../game/progress.js';
import { onGems, testMode } from '../game/economy.js';
import { server, emuMode, onOnlineChange } from './online.js';

let busy = false, again = false, hooks = {};
const active = () => !testMode() || emuMode();
const ref = S => S.fb.fs.doc(S.db, 'wallet', S.uid);
const today = d => d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();

/** hooks : { changed() } (gemmes corrigées d'après le serveur : l'affichage se met à jour). */
export function initWallet(h = {}) {
  hooks = h;
  let was = false;
  onOnlineChange(() => { const on = !!server(); if (on && !was) flushWallet(); was = on; });   // à chaque (re)connexion
  onGems(op => {
    if (!active()) return;
    prog.eco.pending = [...(prog.eco.pending || []), op];
    saveProg();
    flushWallet();
  });
}

/** Portefeuille du joueur, créé vide s'il n'existe pas encore. Renvoie son instantané. */
export async function ensureWallet(S) {
  const r = ref(S);
  let snap = await S.fb.fs.getDoc(r);
  if (!snap.exists()) {
    await S.fb.fs.setDoc(r, { gems: 0, granted: [], adDay: 0, adCount: 0, updatedAt: S.fb.fs.serverTimestamp() });
    snap = await S.fb.fs.getDoc(r);
  }
  return snap;
}
export const walletRef = ref;

/** Mouvement suivant appliqué au document (null : impossible, on l'abandonne). */
function next(d, op, now) {
  if (op.op === 'grant') {
    if (d.granted.includes(op.key)) return null;
    return { gems: d.gems + op.n, granted: [...d.granted, op.key] };
  }
  if (op.op === 'ad') {
    const t = today(now), count = d.adDay === t ? d.adCount + 1 : 1;
    return { gems: d.gems + op.n, adDay: t, adCount: count };
  }
  if (op.op === 'spend') return op.n > 0 && op.n <= d.gems ? { gems: d.gems - op.n } : null;
  return null;
}

/** Envoie les mouvements en attente, puis aligne les gemmes de l'appareil sur celles du serveur. */
export async function flushWallet() {
  const S = server();
  if (!S || !active()) return;
  if (busy) { again = true; return; }
  busy = true;
  try {
    const { fb, db } = S, r = ref(S);
    const snap = await ensureWallet(S);
    // Anciennes sauvegardes : gains déjà reçus sur l'appareil mais jamais envoyés (rejoués un par un, vérifiés par les règles).
    const known = new Set(snap.data().granted || []), pend = prog.eco.pending || [];
    const G = (await import('../data.js')).D.economy.gems;
    for (const key of prog.eco.granted || []) {
      if (known.has(key) || pend.some(o => o.op === 'grant' && o.key === key)) continue;
      const n = key === 'epilogue' ? G.epilogue : key.startsWith('story:') ? G.storyComplete : G.guardianFirst;
      pend.unshift({ op: 'grant', key, n });
    }
    prog.eco.pending = pend;
    const hadOps = pend.length > 0;
    while (prog.eco.pending.length) {
      const op = prog.eco.pending[0];
      try {
        await fb.fs.runTransaction(db, async tx => {
          const cur = (await tx.get(r)).data(), up = next(cur, op, new Date());
          if (up) tx.update(r, { ...up, updatedAt: fb.fs.serverTimestamp() });
        });
      } catch (e) {
        if (e && e.code === 'permission-denied') console.warn('Portefeuille : mouvement refusé', op);
        else throw e;                                                 // réseau : on garde la file pour plus tard
      }
      prog.eco.pending.shift();
    }
    const d = (await fb.fs.getDoc(r)).data();
    const granted = [...new Set([...(prog.eco.granted || []), ...(d.granted || [])])];
    const changed = d.gems !== prog.eco.gems, grew = granted.length !== (prog.eco.granted || []).length;
    prog.eco.gems = d.gems;
    prog.eco.granted = granted;
    if (changed || grew || hadOps) saveProg();                      // sans changement : pas de sauvegarde (pas de boucle d'envois)
    if (changed && hooks.changed) hooks.changed();
  } catch (e) {
    console.warn('Portefeuille :', e && (e.code || e.message));
  } finally {
    busy = false;
    if (again) { again = false; flushWallet(); }
  }
}
