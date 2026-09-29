# Trois Signes — brief pour Claude Code

État du projet au 29/09/2026. À tenir à jour à chaque étape terminée.

## Le projet
Petit jeu mobile à gestes, jouable au doigt, en parties courtes. PWA en HTML/JS (canvas), textes en français.
Trois signes : **Triangle** = attaquer, **Rond** = esquiver, **Toucher** (tap) = ramasser.

Modes jouables aujourd'hui : **Solo = Le Voyage** (infini), **Histoire** (6 × 10 combats), **Duel** contre un ami (en ligne), **Entraînement**, **La première leçon** (tutoriel).
Chaque héros a 3 armes qui progressent (niveaux 1 à 10) et un emplacement de talisman. Économie : or, gemmes, coffres et cosmétiques.

Lancer : `py -m http.server 8123` dans ce dossier, puis http://localhost:8123 (les modules et les JSON ne se chargent pas en `file://`).
Sur téléphone : `py -m http.server 8123 --bind 0.0.0.0`. Tester en 390 × 800 et en 360 × 640.

Références :
- PDF de `docs/` (dossier de conception v2, « Son et Tutoriel », mode Histoire) : documents de lecture, **gardés hors du dépôt**.
  **Le code et les données ne doivent jamais en dépendre** : tout ce qui sert au jeu est recopié dans `data/*.json` ou dans ce fichier.
- `prototype/trois-signes-prototype.html` : prototype d'origine (v2), gardé comme référence de ressenti.

## Direction artistique : design system « Organic » (Claude Design)
Elle **remplace l'ancienne bible** (PDF « Bible ») : ne plus s'en servir.
- Style cartoon low-poly : lobby vert vif facetté, contours épais `#15301E`, boutons orange / jaune avec ombre portée, cartes crème,
  polices Caprasimo (titres) et Figtree (texte).
- `src/ui/organic.css` : copie telle quelle du design system, **ne pas modifier**.
- Maquettes de référence dans `design/` (exports Claude Design, à reproduire telles quelles) :
  - `trois-signes-maquette-lobby` : lobby 3 onglets + `Mode Histoire Trois Signes.dc.html` (écrans 01 à 06 du mode Histoire) ;
  - `planche-de-personnages-trois-signes` : les 6 héros (repris dans `src/ui/art.js`) ;
  - `ecran-de-combat-trois-signes` : écran de combat (décor Forêt de Mousse, sprites, interface) et `project/decors.js` (générateur des 32 décors) ;
  - `trois-signes-character-sheet` : `project/tools/story-engine.js`, générateur des portraits et sprites de boss ;
    `project/tools/hero-skins.js` (12 skins complets, planche `Trois Signes - Planche skins.dc.html`) et
    `project/tools/enemy-variants.js` (variantes petit / moyen / grand / costaud, planche `Trois Signes - Planche variantes ennemis.dc.html`).
- Seuils « proposés » affichés dans la maquette de combat : **non repris** (seules les couleurs par palier le sont).
- Combat : sprites de ¾ dos pour le héros (skins complets : de face en attendant leurs vues de dos, pas de socle), animations = simples transformations des sprites, déduites de l'état du jeu
  (`src/ui/anim.js`). Corps à corps (Aldric, Nyra, Boran) : ruée + coup d'arme ; à distance (Kestrel, Ilwen, Mira) : projectile.
- Ce qui n'est pas codé est affiché et marqué « Bientôt ». Gemmes (achat réel plus tard) : **cosmétiques seulement, jamais d'avantage en jeu**.

## Règles de combat (valeurs dans `data/`)
- **Niveaux de réussite** (`data/grades.json`), selon la précision du tracé :

  | Niveau | Précision | Multiplicateur | Combo |
  |---|---|---|---|
  | Raté | < 60 % | aucun effet, casse la série | — |
  | OK | 60-69 % | ×0,4 | ×1,5 |
  | Good | 70-79 % | ×0,7 | ×1,75 |
  | Very Good | 80-87 % | ×1 | ×2 |
  | Excellent | 88-94 % | ×1,2 | ×2,5 |
  | Perfect | 95 % et + | ×1,5 | ×3 |

  **Seuils retenus : 60 / 70 / 80 / 88 / 95** (décision confirmée le 28/09/2026 ; anciens seuils : 40 / 55 / 68 / 80 / 90).
  Mêmes seuils pour tous, sans réglage de tolérance ; seule la leçon guidée les abaisse (`data/tutorial.json` → `tolerance`).
- **Combo** : 4 gestes de suite du même niveau (3 pour Ilwen, jamais pour Boran) → le dernier est multiplié. Esquive en combo = riposte.
  La série repart à zéro après un combo, un raté ou un niveau différent.
- **Esquive** : part évitée = min(100 %, base × multiplicateur × combo), base 80 % (`data/rules.json` → `dodge.base`).
- **Ramassage** : précision selon la distance au doigt (`rules.json` → `pickup`). Pièce = points, cœur = PV.
- **Ennemis** (`data/enemies.json`) : sbire 20 PV / 6, brute 28 PV / 9, boss 60 PV / 12. Alerte avant un coup 1,3 à 1,5 s,
  un seul ennemi prépare un coup à la fois.
- **Variantes des ennemis** (`data/rules.json` → `enemyVariants`, `src/game/variants.js`, `assets/ennemis/variantes/`) : sbire, brute et
  boss du Solo, apparence seulement, mêmes valeurs. Voyage : petit (arènes 1-2), moyen (3-4), grand (5-6), costaud (7-8 et Au-delà) ;
  Histoire : petit (combats 1-3), moyen (4-6), grand (7-8), costaud (9-10). Taille relative gardée (petit plus petit, costaud plus grand).
  Les boss d'histoire et gardiens ont leur propre dessin (seul leur repli prend la variante).
- **Délais communs à tous les combats** (`data/waves.json`) : pause de 1,2 s entre deux coups ennemis (`globalGap`), première attaque,
  décalage entre ennemis, délai entre deux vagues, attente du butin en fin de combat.
- Reconnaissance des gestes maison, sans IA (`src/input/gestures.js`, objet `TUNING` : seuls chiffres gardés dans le code).
- **Progression des héros** (`data/progression.json`, code `src/game/progress.js`) : XP et niveau par héros, gagnés seulement en le jouant.
  - Niveau 1 à **100** ; XP pour passer du niveau n au niveau n+1 = 100 + 25 × n. Sauvegarde : `prog.chars[id] = { lvl, xp }`
    (XP dans le niveau). Les sauvegardes d'avant (XP totale) sont converties une fois (`legacy`, `prog.heroSave`) :
    niveau gardé, plafonné à 100, XP remise à zéro.
  - L'XP **ne dépend plus du score** : Voyage 10 XP par round terminé + 40 par gardien vaincu ; Histoire 40 XP à la première
    victoire d'un combat, 10 aux suivantes, 0 en cas de défaite ; Entraînement et leçon 0. Quitter une partie ne rapporte rien.
  - Bonus par niveau : +0,5 % d'attaque et +0,5 % de PV max (Nv 100 : +49,5 %). `bonus_en_duel: false` : neutralisés en Duel.
  - Niveau 100 : plus d'XP accumulée, barre dorée « MAX », anneau doré autour du portrait (`maxRing`), « Nv 100 · MAX ».

## Les 6 héros (tous jouables) — `data/characters.json`
Chaque héros : `hp`, `attack`, `passive`, `super`, couleurs `color` / `accent`, `stats` (affichage), `weapon`.
Jauge de super (`superGauge`) : OK +2, Good +3, Very Good +5, Excellent +6, Perfect +8, combo +5, pleine à 100 ;
elle ne se recharge pas pendant une super. Bouton rond en bas à droite (l'appui n'est jamais un geste). Code : `src/game/supers.js`.

| Héros | PV / Att. | Passif | Super |
|---|---|---|---|
| Aldric, Chevalier (épée) | 130 / 4 | Équilibré : aucun | **Rempart** : 8 s, dégâts reçus ×0,5, coup sur tous ×2 |
| Nyra, Assassine (dague) | 80 / 6 | Lame fragile : la plus fragile | **Ombre** : 3 esquives auto, attaque +50 % pendant 8 s |
| Boran, Colosse (gantelets) | 170 / 6 | Force brute : jamais de combo | **Géant** : 8 s, taille ×1,4, coup sur tous ×2,5 |
| Ilwen, Sorcière (grimoire) | 105 / 4 | Incantation : combo en 3 gestes | **Grimoire ouvert** : 2 attaques comptées comme combos |
| Kestrel, Rôdeuse (arc) | 105 / 4,6 | Pas léger : esquive de base 120 % | **Œil de faucon** : 8 s, tout geste reconnu = Perfect |
| Mira, Soigneuse (amulette) | 180 / 3 | Soin 4 PV × multiplicateur par attaque ; chaque Perfect invoque un petit monstre (1 dégât/s, 10 s, 6 max) | **Renouveau** : PV au max, attaque ×2 pendant 10 s |

## Armes, talismans et récompenses — `data/weapons.json`, `data/talismans.json` — **fait**
- **3 armes par héros** (`weapons.json` → `heroes`) : l'arme de départ + 2 alternatives débloquées en Histoire
  (combat 5 et combat 10 de l'histoire du héros, `unlock.story`, texte `lock`). Même puissance de base : une arme change
  le **style**, pas la force. Arme équipée par héros ; les armes alternatives gardent le sprite de combat de l'arme de départ.
  | Héros | Départ | Combat 5 | Combat 10 |
  |---|---|---|---|
  | Aldric | Épée (combo +5 PV) | Hache fendeuse (Perfect : 2e ennemi à 50 %) | Lance garde-fou (+30 % après une esquive réussie) |
  | Nyra | Dague (Perfect +15 %) | Couteaux de lancer (ennemi le plus faible, +10 jauge par ennemi vaincu) | Lame d'ombre (esquive Perfect → contre-attaque 100 %) |
  | Boran | Gantelets (−5 % reçus) | Masse de pierre (autres ennemis à 40 %, cible −10 %) | Bouclier-tour (−15 % reçus, −10 % infligés) |
  | Ilwen | Grimoire (combo +0,25) | Bâton de braises (Perfect : 3 dégâts en 3 s) | Orbe miroir (renvoie 20 % des dégâts évités) |
  | Kestrel | Arc (Perfect ×1,5 sur la jauge) | Arbalète (+20 % gardiens et boss, −10 % autres) | Fronde (tir de 3 dégâts à chaque ramassage) |
  | Mira | Amulette (+1 PV par attaque) | Bâton de sève (pas de soin par attaque, 12 PV par combo) | Clochette (soin → bouclier, 20 au plus) |
- **Effet de style** (`style.scale` : monte de 50 % au niveau 1 à 100 % au niveau 6 ; `style.fixed` : valeurs fixes).
  « Esquive réussie » = un coup ennemi vraiment évité, pas le simple tracé d'un Rond.
- **XP et niveaux** (chaque arme a les siens, `prog.weapons` = `{ epee: { xp } }`) : Voyage et Histoire seulement (`xpModes`) ;
  attaque OK 0, Good 1, Very Good 1, Excellent 2, Perfect 3 ; combo +3 ; super +3 ; gardien ou boss vaincu +5. Ajoutée en fin
  de partie seulement. Niveaux 1 à 10 : 50 XP pour le niveau 2, puis +50 % par niveau ; +2 % d'attaque par niveau ;
  niveau 3 : jauge ×1,1 ; niveau 6 : style complet ; niveau 10 : éclat doré en combat (`gold_fx`).
- **Talismans** (`talismans.json`, `src/game/talismans.js`) : 1 emplacement par héros, 8 talismans, un par gardien d'arène du
  Voyage battu (Gland de mousse : ramassage +25 % ; Épi d'or : pièces +20 % ; Goutte claire : cœurs +25 % ; Clé des toits :
  alerte 0,15 s plus tôt ; Marque-page : ramasser ne casse pas la série ; Plume de vent : jauge de départ 20 % ;
  Craie ancienne : un raté pardonné par round ; Page du Codex : XP d'arme +10 %).
- **Récompenses** (`src/game/rewards.js`, écran `src/ui/reward-ui.js`, son `deblocage`) : `syncRewards()` recalcule tout ce qui est
  mérité d'après la sauvegarde (donc aussi les récompenses rétroactives, montrées au lancement). Affichées après la Victoire en
  Histoire, en fin de Voyage, et dans le coffre de l'écran « Arène découverte ». Sauvegarde : `prog.armory`
  (`weapons`, `talismans`, `equipped`, `talisman`) et `prog.voyage.beaten`.
- **Affichage** : onglet Personnage, carte Armes (3 armes, niveau, XP, style à sa force actuelle, Équiper / verrou) et carte
  Talisman (emplacement, grille des 8, Équiper / Retirer) ; pastille de l'arme équipée dans l'onglet Jouer ; XP d'arme et montée
  de niveau en fin de partie. Icônes Claude Design `assets/icones/armes/{id}.svg` et `assets/icones/talismans/{id}.svg`
  (un vrai dessin au même nom les remplace).
- **Duel** : `bonus_en_duel: false` neutralise les bonus de niveau dans un combat `duel: true` ; le style est alors pris à
  `duel.stylePower` (100 %) pour tous. Armes : `autorise_en_duel: true`. Talismans : `autorise_en_duel: true` (décidé le 29/09/2026 : actifs en Duel).
- Équilibre vérifié le 28/09/2026 par un bot à graine (4 Voyages par arme au niveau 6, précision 82 % puis 90 %) : pas d'arme
  nettement au-dessus ; Couteaux de lancer relevés (jauge 10 → 15 par ennemi vaincu) ; à surveiller : Arbalète (+12 à 17 % de score),
  Bâton de sève (Mira tombe plus tôt à faible précision). Mira ne tombe presque jamais (180 PV + soin) : équilibre des héros à revoir.

## Économie et cosmétiques — `data/economy.json`, `data/cosmetics.json` — **fait**
- **Versé round par round** (`main.js` → `payRounds`, Voyage et Histoire) dès qu'un round est terminé, **acquis même en abandonnant** :
  2 or par pièce ramassée, +5 or par arène du Voyage traversée, gemmes d'un gardien battu la 1re fois (10). Les pièces du round en
  cours ne comptent qu'en fin normale. **Bonus de fin, seulement en fin normale** (pas en abandon) : Voyage 10 + 20 si record (KO) ;
  Histoire 30 à la 1re victoire d'un combat, 5 ensuite. Autres **gemmes** : 30 par histoire terminée, 50 pour l'épilogue ;
  `syncGems()` donne chaque gain une seule fois (`prog.eco.granted`), rétroactif au lancement.
  Testé le 28/09/2026 en quittant au milieu d'un round (Voyage et Histoire).
- **Catalogue** (46 objets : 22 communs, 12 rares, 12 épiques) : 3 couleurs par héros (Teinte Lagon, Soleil, Rubis ; recolorations
  `recolor` couleur d'origine → nouvelle), 6 skins d'arme (un par arme de départ : Lame Braise, Dague Givre, Poings de Lave, Grimoire Jade,
  Arc Corail, Amulette Aurore), 10 tracés (Étincelle, Lierre, Arc-en-ciel, Étoiles, Bulles, Flammes, Confettis, Encre, Pixels, Notes),
  12 skins complets épiques Claude Design, 2 par héros (`assets/skins/`, 300 gemmes : Garde du Crépuscule, Chevalier des Tournois,
  Ombre des Marchés, Danseuse de Lames, Le Bâtisseur, Le Débardeur du Port, Alchimiste des Racines, Étoile Filante,
  Guetteuse des Cimes, Chasseuse du Désert, Gardienne des Sources, Veilleuse de Nuit). Prix : or pour commun / rare, gemmes pour l'épique.
- **Apparence** : `src/game/cosmetics.js` (possédés, équipement par héros : `tint`, `weapon`, `trail`, `skin` ; `look(hero)`),
  `src/ui/looks.js` (lobby et combat), option `recolor` de `art.js` / `sprites.js` (le socle n'est jamais recoloré),
  skin complet en combat = fichier `_combat.svg` (héros de face, comme la planche) en deux calques corps + bras armé
  (`combat-art.js` → `bakeSkin` : groupe `bras_arme`, pivot `data-pivot` à l'épaule, pieds lus sur l'ombre), tracés dans `hud.js`.
  Un skin complet remplace la couleur et le skin d'arme. La leçon garde l'apparence d'origine. Limite : l'Arc Corail recolore aussi
  la ceinture et le bandeau de Kestrel (même couleur dans le sprite), les Poings de Lave aussi ses épaulières.
- **Coffres** (gemmes) : simple 60 (70 / 25 / 5 %, épique garanti au plus tard au 10e coffre sans épique : `prog.eco.pity`),
  Trois Signes 150 (3 objets, au moins 1 rare). Jamais un objet déjà possédé ; « Collection complète » quand il n'en reste plus assez.
  **Probabilités affichées à côté du bouton**, bouton « Probabilités » (chances, garanties, liste complète). Ouverture animée, son selon
  la meilleure rareté (`rarities[].sound`). Pays sans coffres payants (`noPaidChests`, commence par BE ; langue du navigateur ou fuseau
  horaire) : coffres désactivés, tout reste achetable directement.
- **Boutique** (`src/ui/shop-ui.js`, `shop.css`) : onglets Coffres, Cosmétiques (Tout, Armes, Couleurs, Tracés, Skins ; achat avec
  confirmation, puis « Équiper »), Gemmes (4 packs 80 / 450 / 1000 / 2200, désactivés « Disponible dans l'application »).
  Compteurs or / gemmes en haut du lobby (le « + » mène aux Gemmes) ; le record reste sur la carte du Voyage.
- **Onglet Personnage** : carte Cosmétiques (skin, couleur, skin d'arme, tracé ; « Voir la boutique »).
- **Mode test** (développement : `localhost`, `127.0.0.1` ou `?test`) dans Réglages : +1000 or, +500 gemmes, pays BE / FR, remise à zéro.
- Testé le 28/09/2026 : 30 coffres sans doublon, garantie au 10e, probabilités mesurées sur 4000 tirages (69 / 26 / 4,5 %),
  Trois Signes jamais sans rare, collection complète après 40 objets, Belgique bloquée, achats refusés sans assez d'or ou en double.
- Sauvegarde : `prog.eco = { gold, gems, granted, owned, equipped, pity, opened }`.

## Publicités — `data/ads.json` — **fait (fausses pubs)**
- Un seul module `src/ads/ads.js` : pubs **récompensées** et **plein écran**, règles, limites, sauvegarde `prog.ads`
  (`noAds`, `playSeconds`, `voyageGames`, `day`, `used`). Web : fausse pub « Publicité de test » de 5 s (`src/ui/ad-ui.js`, `ads.css`).
- **AdMob (plus tard)** : `src/ads/admob.js` prêt pour `@capacitor-community/admob` (**pas installé**), lu depuis
  `window.Capacitor.Plugins.AdMob` ; consentement UMP de Google au premier lancement (`initAds` → `admobInit`) ; identifiants
  dans `ads.json → admob` (aujourd'hui ceux de test de Google). `provider: "test"` force la fausse pub.
- **Récompensées** (toujours au choix, bouton avec icône « écran ▶ » ; récompense seulement si la pub est vue jusqu'au bout) :
  « Doubler l'or » sur les résultats du Voyage (1 fois par partie) ; « Seconde chance » au KO dans le Voyage, reprise à 50 % des PV
  avec 1,5 s de garde (1 fois par partie) ; boutique : « +5 gemmes » (3 fois par jour) et « Coffre gratuit » simple (1 fois par jour,
  pas dans les pays sans coffres), compteur « 2 / 3 aujourd'hui ».
- **Plein écran** : seulement en quittant les résultats du Voyage (Rejouer ou Retour), une partie sur 3, après 10 minutes de jeu
  cumulées (combat, Entraînement, leçon). Jamais en combat, leçon, Histoire, cinématique. Fermer après le compte à rebours.
- **Sans publicité** (onglet Gemmes) : 2,99 €, désactivé sur le web ; une fois acheté, plus de pub plein écran (les récompensées restent).
- **Duel** : `ads.json → duel` : aucune pub, aucune récompense de pub (`showRewarded({ duel })` refuse).
- Mode test (Réglages) : Sans publicité on / off, « Passer les 10 min », remise à zéro, compteurs affichés.
- Testé le 28/09/2026 : seconde chance (65 / 130 PV), 2e KO sans proposition, or doublé seulement si la pub est vue en entier,
  pas de pub avant 10 min, pub plein écran à la 3e partie seulement, aucune avec Sans publicité, 3 fois +5 gemmes puis « Reviens demain »,
  coffre gratuit une fois par jour.

## En ligne (Firebase) — `data/online.json` — **fait**
- Projet Firebase `trois-signes`, **offre gratuite Spark** (rien de payant utilisé). SDK web 12.19.0 **embarqué** dans
  `src/vendor/firebase/12.19.0/` (aucun CDN ; import de `firebase-app.js` rendu local, voir son README), chargé en arrière-plan.
- **Connexion anonyme automatique** au premier lancement (aucune inscription) : `src/online/online.js` (`initOnline`, appelé par `main.js`).
  Le compte est gardé par le navigateur ; effacer les données du site ou changer d'appareil = nouveau compte (la liaison Google le réglera).
- **Pseudo** (`src/online/pseudo.js`, `src/ui/account-ui.js`) : demandé après le prologue et la première leçon (obligatoire, pseudo proposé
  au hasard), modifiable dans les Réglages ; 3 à 16 caractères, lettres / chiffres / espace / - . _ ; filtre des mots grossiers
  (`online.json → pseudo` : `banned` partout, `bannedWords` en mot entier, accents et chiffres « leet » ramenés). Sauvegarde : `prog.profile.pseudo`.
- **Sauvegarde en ligne** : document Firestore `players/{uid}` = `{ pseudo, save (toute la progression prog en JSON), savedAt, updatedAt, v }`.
  Chaque `saveProg()` date la sauvegarde (`prog.savedAt`) et déclenche un envoi différé (3 s) ; au lancement, la plus récente l'emporte
  (serveur plus récent → `replaceProg`, jamais en pleine partie : appliqué au retour au lobby). Hors connexion : `ts_prog` reste la référence,
  envoi au retour du réseau (nouvel essai toutes les 20 s). Les Réglages du son (`ts_settings`) restent propres à l'appareil.
- **Règles de sécurité** : `firestore.rules` (publiées dans la console le 29/09/2026 ; `firebase.json` pour `firebase deploy --only firestore:rules`) :
  chaque joueur ne lit, n'écrit et ne supprime QUE `players/{son uid}` ; document validé (champs, pseudo ≤ 16, sauvegarde < 400 Ko) ;
  salons `duels/{code}` (voir Duel) ; tout le reste fermé.
- **Émulateur** (tests) : `firebase emulators:start --only auth,firestore --project trois-signes` (réglages dans `firebase.json`),
  puis le jeu avec `?emu` dans l'adresse (`online.json → emulator`).
  `?longpoll` (`online.json → longPollParam`) : Firestore en requêtes classiques, pour les réseaux qui coupent son flux continu (proxy, tests).
- **Réglages → Compte** : pseudo + « Modifier », état du serveur (en ligne, sauvegarde en cours, hors connexion, injoignable) et n° de joueur,
  « Lier mon compte Google » désactivé (« Bientôt (Google Play Games) »).
- Console Firebase : Authentication → Anonyme activé, « Activer la création (inscription) » coché ; Firestore en Europe, mode production.
- Testé le 29/09/2026 avec deux navigateurs : deux comptes distincts, chacun lit son document, lecture et écriture du document de l'autre
  refusées (permission-denied), hors connexion puis retour (or envoyé), sauvegarde serveur plus récente reprise au lancement, pseudo après la leçon.
- **À prévoir** : le contrôle de cohérence des scores du Duel demandera sans doute des Cloud Functions (**offre payante Blaze**) : à décider avec l'auteur avant.

## Duel contre un ami — `data/duel.json` — **fait (étape 2)**
- Code : `src/online/duel-net.js` (salon Firestore), `src/game/duel.js` (déroulé, pression, victoire), `src/ui/duel-ui.js` + `duel.css` (écrans),
  interface de combat dans `combat-hud.js` (« VAGUE 2 / 5 », temps restant, pseudo et score de l'adversaire en direct).
- Lobby → bouton Duel « Défier un ami » : **Créer un salon** (code de 6 caractères sans 0/O/1/I/L) ou **Rejoindre** avec le code ;
  chacun choisit son héros et valide ; le combat part quand les deux sont prêts. Pseudo et connexion au serveur obligatoires.
- Salon `duels/{code}` = `{ code, host, guest, createdAt, players: { uid: { pseudo, hero, ready, scores[], ko, done, quit, wave, live, seen } } }`.
  Règles : lisible avec le code tant qu'il manque l'invité, puis par ses deux joueurs seulement ; chacun n'écrit que son entrée ;
  l'hôte seul le supprime (salon quitté avant l'arrivée de l'ami). Les salons terminés restent (petits) : ménage à prévoir (TTL).
- **Même programme pour les deux** : graine = code + heure du serveur à la création (`createdAt`) ; 4 vagues de sbires / brutes
  (`waves` : part de brutes, PV et dégâts croissants), puis à la 5e le même boss (gardien du Voyage tiré au sort, `boss`) avec escorte ;
  lieu tiré au sort (`lieux`), variantes d'ennemis par vague (`variants`).
- **Vagues synchronisées** : à la fin d'une vague, écran « En attente de [pseudo] » avec son score en direct (signe de vie toutes les
  `heartbeatSeconds`) et « Abandonner ». Limite de `waveSeconds` (90 s) par vague : la vague s'arrête avec son score.
- **Pression** : avant chaque vague, « Pression de [pseudo] : +X % » ; PV et dégâts des ennemis + 40 % × (score adverse sur la vague
  précédente ÷ score maximal théorique de cette vague), plafonné à 40 % (`pressure`). Score maximal théorique (`maxScore`) : partie sans faute
  (tout en Perfect avec une attaque de référence de 4, combos, 2 esquives Perfect par ennemi, pièces). Vague 1 : même départ pour les deux.
- **Victoire** : KO avant la fin = défaite (l'autre doit finir la vague) ; KO tous les deux dans la même vague = meilleur score total ;
  les deux survivent au boss = plus gros score total ; abandon (« Quitter ») ou plus de 30 s sans signe de vie (`disconnectSeconds`, heure du serveur) = défaite.
- **Écran de fin** : Victoire / Défaite / Égalité, raison, tableau par vague (mes points, les siens, pression reçue, pression donnée), total.
- Bonus de niveau des héros et d'XP des armes neutralisés (`bonus_en_duel`), armes alternatives, style (100 %) et talismans actifs.
  **Ni or, ni gemmes, ni XP** (héros ou armes) en Duel ; aucune pub, aucune récompense de pub, pas de Seconde chance.
- Quotas Spark : environ 12 écritures par joueur et par minute de Duel (signe de vie toutes les 5 s) ; l'offre gratuite
  (20 000 écritures / jour) permet une soixantaine de Duels complets par jour. À surveiller si le jeu grandit.
- Pas encore de contrôle des scores (chaque joueur envoie le sien) : voir « À prévoir » ci-dessus.
- Testé le 29/09/2026 sur l'émulateur Firebase avec deux navigateurs (390 × 800 et 360 × 640) : code inconnu, salon complet
  (un 3e joueur refusé, écriture directe refusée), mêmes ennemis des deux côtés, vague de 90 s, attente avec score en direct,
  pression calculée des deux côtés (reçue chez l'un = donnée chez l'autre), victoire aux points après le boss, KO en vague 2,
  abandon, onglet fermé (défaite après 30 s), ami qui quitte le salon, ni or ni XP gagnés, aucune erreur dans la console.
  Règles publiées dans la console le 29/09/2026, vérifiées sur le vrai serveur : création, jointure, héros, prêt, signe de vie, scores,
  KO, fin, abandon acceptés ; entrée de l'autre joueur, liste des salons et écriture d'un tiers refusées ; salon vide supprimé par l'hôte.
  Un Duel complet en temps réel sur le vrai serveur n'a pas pu être joué depuis l'environnement de test (réseau trop instable) : à essayer sur deux téléphones.

## Mode Histoire — `data/story_mode.json`
- **Tout le texte y est, affiché tel quel : ne pas le réécrire.** Code : `src/story/story.js` (déroulé), `src/ui/story-ui.js` (écrans),
  `src/ui/cutscene.js` (lecteur de cinématiques et dialogues, lettre par lettre, « Passer »).
- Prologue commun au premier lancement, puis **6 histoires de 10 combats**, une par héros (héros imposé) :
  Aldric « Le dernier élève », Nyra « La dette », Boran « Le champ silencieux », Ilwen « La maladie de la mémoire »,
  Kestrel « La carte du Silence », Mira « Ceux qu'on peut sauver ».
- Chaque histoire : ouverture, combats `normal`, un `mini_boss`, une `rencontre` (un autre héros), un `lieutenant`,
  puis le combat 10 au Cœur du Silence (cinématique commune `arrivee_coeur`) contre le **boss final Eldan l'Oublié**.
  Chaque combat : `dialogue_avant` → combat → `dialogue_apres` → `cinematique_apres`.
  Un round par tableau de `vagues` : le nombre de rounds est `vagues.length` (plus de champ `rounds`).
- Boss : `ennemis_speciaux` (12 boss + `eldan_oublie`), valeurs par rang dans `valeurs_de_depart`
  (mini-boss 35 / 10, lieutenant 60 / 12, boss final 90 / 14). Sbire / brute = ennemis de `enemies.json`.
- Eldan l'Oublié utilise les trois signes : Triangle (coup), Rond (garde 2 s, dégâts reçus −50 %), Toucher (appelle un sbire,
  1 par round, 2 ennemis en plus au maximum). Réglages : `rules.json` → `story.eldan`.
- Fin d'une histoire : `fin` + un fragment de mémoire. Les 6 terminées → `epilogue_final`, qui **débloque Eldan** :
  sa carte apparaît dans le choix des histoires, marquée « Bientôt disponible » (pas encore jouable).
- Autres réglages : `rules.json` → `story` (pas de limite de temps, PNJ, libellés, vitesse du texte).
- Sauvegarde : `prog.story` (combats gagnés par histoire, scènes vues, fragments, prologue, épilogue).

## Le Voyage (Solo infini) — `data/voyage.json`
- Bouton Solo. **8 arènes** de 4 rounds (3 vagues puis le gardien) : Forêt de Mousse, Hautes-Gerbes, Fontclaire, Toits de Vélis,
  Bibliothèque d'Aubelle, Col des Vents, École des Signes, Le Cœur du Silence (gardien Eldan l'Oublié).
  Puis **« Au-delà du Silence »** sans fin : vagues au hasard, un gardien tiré au sort tous les 4 rounds. Fin au KO uniquement.
- Renforcement par arène puis par round (`scaling`), multiplicateur de score (`score`), 3 ennemis au plus, +30 % PV entre deux arènes,
  alerte raccourcie au loin (jamais sous 0,9 s).
- Code : `src/game/voyage.js`, écrans `src/ui/voyage-ui.js` (transition d'arène, « Arène découverte » et son coffre).
- **Ordre d'un lancement** (toutes les parties, `main.js` → `start`) : écran de lancement (`src/ui/cover.js`, le lobby disparaît) →
  annonce de la partie (`battle.intro` : transition d'arène 1 du Voyage, « Souvenir » de la leçon ; en Histoire, les dialogues d'avant)
  pendant que sprites et décor se préparent → seulement ensuite l'arène et le combat. Vérifié : Voyage, Rejouer, Histoire, Réessayer, leçon.
- Gardiens et décors repris du mode Histoire ; la Forêt de Mousse garde le décor et le boss du Solo d'origine.
- Coffres de cosmétiques : emplacement et message seulement (`chest`).
- Sauvegarde : `prog.best` (record), `prog.voyage` (arène la plus lointaine, arènes découvertes).

## La première leçon (tutoriel) — **fait** (sauf une image)
- Souvenir : Maître Eldan enseigne à Aldric à Pierrelune avant le Silence. Tout dans `data/tutorial.json` (répliques d'Eldan telles quelles).
  Code : `src/game/tutorial.js`, `src/ui/tutorial-ui.js`, `src/ui/tutorial-art.js`.
- 5 étapes : Triangle (3 réussites sur un mannequin), Rond (2 esquives), Toucher (3 pièces), Justesse (tableau des 5 niveaux, puis un combo), Super.
- Impossible à rater : mannequin immortel sans dégâts, seuils abaissés de `tolerance` (20 points), garde du Rond sur tout l'anneau ;
  après 2 échecs de suite, main animée « Suis la main ». « Passer » remplace « Quitter ».
- Lancée d'office au premier démarrage après le prologue ; « Revoir la leçon » dans l'onglet Jouer. Sauvegarde : `prog.tutorial`.
- Manque : `assets/ennemis/mannequin.svg` (sprite provisoire dessiné en code en attendant).

## Son — **partiel** (24 / 26 effets, 8 / 9 musiques)
- Un seul module `src/audio/audio.js` (Web Audio), deux canaux Musique / Effets. Réglages dans `data/audio.json`
  (ids, volumes, fondus, `musicByPlace`, `sadAfter`, `seamless`). Sons provisoires et notes de réussite : `src/audio/synth.js`.
- Notes de réussite **définitives, en code** : une note de plus par niveau (OK 1 … Perfect 5 + accord). Le raté joue `geste_rate`.
- Musiques : lobby, `musique_tuto` (Entraînement, leçon), musique du lieu, `musique_boss` sur tout round de gardien ou de boss,
  `musique_triste` après un mini-boss ou un lieutenant, `musique_epilogue` pour les fins. Musique baissée de moitié pendant les dialogues.
- Fichiers reçus le 28/09/2026 : effets ElevenLabs (**plan payant**, aucun crédit exigé), musiques Suno Pro ; normalisés à ≈ -16 LUFS.
  État : `assets/audio/SONS.md`, sources et licences : `CREDITS.md`.
- **Manquent** : `sfx/ui_clic`, `sfx/ui_onglet`, `musique/musique_triste`. `musique_lobby` ne dure que 19 s (boucle trop fréquente).

## Réglages et crédits
- Engrenage du lobby (`src/ui/lobby.js` → `renderSettings`, `src/game/settings.js`, clé `ts_settings`) : volumes Musique / Effets, Vibrations,
  Compte (pseudo, état du serveur, liaison Google plus tard), bouton **Crédits**. Pas de réglage de tolérance des gestes (retiré pour de bon : équité, futur Duel).
- Écran Crédits : texte dans `data/credits.json` (`renderCredits`). À tenir à jour avec `CREDITS.md` à chaque nouvelle source.

## Conventions
- **Toutes les valeurs dans `data/*.json`**, jamais en dur dans le code (seule exception : `TUNING` des gestes).
  `src/data.js` charge : grades, characters, enemies, waves, rules, story_mode, voyage, audio, tutorial, credits, weapons, talismans, progression, economy, cosmetics, ads, online, duel.
- **Noms de fichiers des images** (SVG, état dans `assets/IMAGES.md`) :
  - `assets/portraits/{id}_{expression}.svg` (expressions : neutre, joie, colere, tristesse, surprise, determine) ;
  - boss : `assets/portraits/{bossId}_ombrace.svg` (forme d'ennemi) et `{bossId}_humain.svg` (forme humaine) ;
  - `assets/ennemis/{id}.svg` (sprite de combat, de face, pieds en bas) ; `assets/decors/{id}.svg` (plein écran, 390 × 844).
- **Noms de fichiers des sons** : `assets/audio/sfx/{id}.mp3` et `assets/audio/musique/{id}.mp3`, ids listés dans `data/audio.json`.
  Tout nouveau son : couper le silence, normaliser (≈ -16 LUFS), mettre à jour `SONS.md`, `CREDITS.md` et, si la source est nouvelle, `data/credits.json`.
- **Règles de repli quand un fichier manque** (jamais d'erreur, le jeu reste jouable) :
  - expression manquante → `_neutre` ; boss → `_humain` pour tout sauf `ombrace` ; portrait manquant → pastille à la couleur du personnage ;
  - décor manquant → dégradé vert du lobby + nom du lieu (Voyage : fond à la teinte de l'arène + nom en grand) ;
  - sprite de boss manquant → sprite de la brute (mini-boss) ou du boss (autres rangs) ; mannequin → sprite provisoire en code ;
  - son manquant → son provisoire synthétisé (`synth.js`).
  Les fichiers se branchent seuls : les déposer avec le bon nom suffit.
- Sauvegarde locale via `store` (`src/game/progress.js`), toujours dans un try/catch. Clés : `ts_prog`, `ts_settings`.
- Garder le rendu séparé de la logique (`src/ui/` lit `G`, l'état partagé de `src/game/state.js`).
- **Ne jamais rendre les gestes plus exigeants sans le demander.**
- Chaque étape doit rester jouable sur téléphone (390 × 800 et 360 × 640).
- **Publication directe sur `main`** : pas de branche ni de PR ; commit puis push sur `main`.

## Structure
```
index.html
src/
  main.js            boucle de jeu, écrans, démarrage (prologue puis leçon au premier lancement)
  data.js            chargement de data/*.json
  util.js
  input/gestures.js  reconnaissance des gestes + précision
  game/  state.js (état partagé G)  grades.js  combat.js  enemies.js  effects.js  progress.js (XP et niveaux des héros, sauvegarde)
         supers.js  settings.js  tutorial.js  voyage.js  weapons.js (armes, XP, niveaux, style)
         talismans.js  rewards.js (récompenses méritées, rétroactives)  economy.js (or, gemmes, coffres)  cosmetics.js
         variants.js (variantes sbire / brute / boss selon l'arène ou le combat)  duel.js (Duel : programme, pression, victoire)
  story/story.js     déroulé du mode Histoire
  online/ online.js (Firebase : compte anonyme, sauvegarde en ligne)  pseudo.js (pseudo : règles et filtre)  duel-net.js (salon de Duel)
  vendor/firebase/   SDK Firebase embarqué (app, auth, firestore)
  ads/   ads.js (gestionnaire des pubs)  admob.js (emplacement AdMob + consentement UMP, pas encore installé)
  audio/ audio.js  synth.js
  ui/    lobby.js (+ réglages, crédits, résultats)  hud.js (rendu canvas)  combat-hud.js  combat-art.js  anim.js  sprites.js
         art.js  icons.js  assets.js (images + replis)  cutscene.js  story-ui.js  story-art.js
         tutorial-ui.js  tutorial-art.js  voyage-ui.js  weapon-ui.js (cartes Armes / Talisman, XP de fin de partie)
         reward-ui.js (écran « Nouvelle arme / Nouveau talisman / Gemmes »)  shop-ui.js (boutique, coffres, carte Cosmétiques)
         looks.js (apparence des héros)  money.js (or et gemmes)  ad-ui.js (fausse pub, Seconde chance)  cover.js (écran de lancement)
         account-ui.js (pseudo, bloc Compte des Réglages)  duel-ui.js (salon, attente, pression, fin du Duel)
         organic.css (ne pas modifier)  lobby.css  shop.css  ads.css  style.css  story.css  tutorial.css  voyage.css  duel.css
data/    characters grades enemies waves rules story_mode voyage tutorial audio credits weapons talismans progression economy cosmetics ads online duel (.json)
firestore.rules  firebase.json   règles de sécurité Firestore
assets/  portraits/  ennemis/ (+ variantes/)  decors/  icones/armes/  icones/talismans/  icones/monnaies/  boutique/  skins/  audio/sfx/  audio/musique/   (IMAGES.md, audio/SONS.md)
design/  exports Claude Design (voir Direction artistique)
prototype/ prototype d'origine
```

## Avant publication
À faire avant chaque commit publié sur `main` :
- Tester dans le navigateur chaque écran ajouté ou modifié, en **390 × 800** et en **360 × 640** : rien ne déborde,
  pas de défilement horizontal, tous les boutons restent visibles et utilisables, aucune erreur dans la console.

## Prochaines tâches (dans cet ordre)
1. **Terminer le son** si besoin : `ui_clic`, `ui_onglet`, `musique_triste`, et une `musique_lobby` plus longue.
2. **Duel, suite** : contrôle de cohérence des scores (Cloud Functions = offre Blaze, à décider), ménage des salons terminés,
   adversaire au hasard (file d'attente), liaison du compte Google.

Plus tard : achat réel des gemmes et de « Sans publicité », AdMob (dans l'application), histoire jouable d'Eldan, jeu installable et jouable hors-ligne.
