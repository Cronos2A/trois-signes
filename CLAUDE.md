# Three Signs — brief pour Claude Code

État du projet au 01/10/2026 (jeu en 5 langues ; premier lot de préparation à la publication fait : polices embarquées, zones tactiles, compte Google, suppression du compte, signalements, pubs de test limitées au développement, version ; reste ouvert : `à faire.md` et `AVANT_PUBLICATION.md`). À tenir à jour à chaque étape terminée.

## Le projet
**Titre du jeu : « Three Signs » dans les 5 langues, jamais traduit** (décision du 03/10/2026 ; avant : « Trois Signes »).
Les trois gestes (« les trois signes ») et les noms d'objets (« Coffre des Trois Signes », « Codex des trois signes ») gardent leur traduction
(`data/i18n/GLOSSAIRE.md`). Identifiants techniques inchangés : dossier et dépôt `trois-signes`, projet Firebase `trois-signes`, clés `ts_*`.
Petit jeu mobile à gestes, jouable au doigt, en parties courtes. PWA en HTML/JS (canvas), textes en français.
Trois signes : **Triangle** = attaquer, **Rond** = esquiver, **Toucher** (tap) = ramasser.

Modes jouables aujourd'hui : **Solo = Le Voyage** (infini), **Histoire** (6 × 10 combats), **Duel** (en ligne : adversaire au hasard ou ami), **Entraînement**, **La première leçon** (tutoriel).
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
  Seule exception (01/10/2026, à ta demande) : sa ligne `@import` de Google Fonts est retirée ; les polices Caprasimo et Figtree sont
  embarquées (`assets/fonts/`, licence OFL) et déclarées dans `src/ui/fonts.css`, chargé juste avant. Aucun appel à Google Fonts.
- Maquettes de référence dans `design/` (exports Claude Design, à reproduire telles quelles) :
  - `trois-signes-maquette-lobby` : lobby 3 onglets + `Mode Histoire Trois Signes.dc.html` (écrans 01 à 06 du mode Histoire)
    + `Planche Récompenses de connexion.dc.html` (fenêtre du jour, écran Récompenses, icônes `icones/recompenses/`, bouton du lobby, pastille de combat) ;
  - `planche-de-personnages-trois-signes` : les 6 héros (repris dans `src/ui/art.js`) ;
  - `ecran-de-combat-trois-signes` : écran de combat (décor Forêt de Mousse, sprites, interface) et `project/decors.js` (générateur des 32 décors) ;
  - `trois-signes-character-sheet` : `project/tools/story-engine.js`, générateur des portraits et sprites de boss ;
    `project/tools/hero-skins.js` (12 skins complets, planche `Trois Signes - Planche skins.dc.html`) et
    `project/tools/enemy-variants.js` (variantes petit / moyen / grand / costaud, planche `Trois Signes - Planche variantes ennemis.dc.html`).
- Seuils « proposés » affichés dans la maquette de combat : **non repris** (seules les couleurs par palier le sont).
- Combat : sprites de ¾ dos pour le héros (skins complets : de face en attendant leurs vues de dos, pas de socle), animations = simples transformations des sprites, déduites de l'état du jeu
  (`src/ui/anim.js`). Corps à corps (Aldric, Nyra, Boran) : ruée + coup d'arme ; à distance (Kestrel, Ilwen, Mira) : projectile.
- **Zones tactiles** (`src/ui/touch.css`, chargé en dernier) : tout élément cliquable se touche sur au moins 48 × 48 px (zone invisible `::after`
  qui agrandit les petits boutons sans changer leur dessin) et deux zones sont à 8 px au moins l'une de l'autre (écarts réglés écran par écran).
  Tout nouvel écran : vérifier ces deux règles en 360 × 640 dans les 5 langues (outil des essais : `tapcheck.mjs`).
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
- **Esquive** : part évitée = min(90 %, base × multiplicateur × combo), base 80 % (`data/rules.json` → `dodge.base`, `dodge.max`) ;
  jamais 100 % par un Rond, même en Perfect ou pour Kestrel. Seuls les pouvoirs évitent tout, en nombre ou en durée limités
  (Ombre de Nyra : 3 esquives ; répit de la Seconde chance : 1,5 s). Bonus `perfectScore` à l'esquive maximale.
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
  - Niveau 1 à **100** ; XP pour passer du niveau n au niveau n+1 = 100 + 15 × n. Sauvegarde : `prog.chars[id] = { lvl, xp }`
    (XP dans le niveau). Les sauvegardes d'avant (XP totale) sont converties une fois (`legacy`, `prog.heroSave`) :
    niveau gardé, plafonné à 100, XP remise à zéro.
  - L'XP **ne dépend plus du score** : Voyage 12 XP par round terminé + 50 par gardien vaincu ; Histoire 60 XP à la première
    victoire d'un combat, 15 aux suivantes, 0 en cas de défaite ; Entraînement et leçon 0. Quitter une partie ne rapporte rien.
  - Bonus par niveau : +0,5 % d'attaque et +0,5 % de PV max (Nv 100 : +49,5 %). `bonus_en_duel: false` : neutralisés en Duel.
  - Niveau 100 : plus d'XP accumulée, barre dorée « MAX », anneau doré autour du portrait (`maxRing`), « Nv 100 · MAX ».

## Les 6 héros (tous jouables) — `data/characters.json`
Chaque héros : `hp`, `attack`, `passive`, `super`, couleurs `color` / `accent`, `stats` (affichage), `weapon`.
Jauge de super (`superGauge`) : OK +2, Good +3, Very Good +5, Excellent +6, Perfect +8, combo +5, pleine à 100 ;
elle ne se recharge pas pendant une super. Bouton rond en bas à droite (l'appui n'est jamais un geste). Code : `src/game/supers.js`.

| Héros | PV / Att. | Passif | Super |
|---|---|---|---|
| Aldric, Chevalier (épée) | 130 / 5 | Garde : −15 % de dégâts reçus (`damageTaken`) | **Rempart** : 8 s, dégâts reçus ×0,5, coup sur tous ×2 |
| Nyra, Assassine (dague) | 80 / 6 | Lame fragile : la plus fragile | **Ombre** : 3 esquives auto, attaque +50 % pendant 8 s |
| Boran, Colosse (gantelets) | 170 / 6 | Force brute : jamais de combo | **Géant** : 8 s, taille ×1,4, coup sur tous ×2,5 |
| Ilwen, Sorcière (grimoire) | 125 / 5 | Incantation : combo en 3 gestes | **Grimoire ouvert** : 2 attaques comptées comme combos |
| Kestrel, Rôdeuse (arc) | 105 / 4,6 | Pas léger : esquive de base 120 % | **Œil de faucon** : 8 s, tout geste reconnu = Perfect |
| Mira, Soigneuse (amulette) — **héroïne accessible pour les débutants** (étiquette « Idéal pour débuter », `beginner`) | 150 / 3 | Soin 0,5 PV × multiplicateur par attaque ; chaque Perfect invoque un petit monstre (1 dégât/s, 10 s, 6 max) | **Renouveau** : +10 % des PV max, attaque ×2 pendant 10 s |

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
  | Mira | Amulette (+1 PV par attaque) | Bâton de sève (pas de soin par attaque, 8 PV par combo) | Clochette (pas de soin : bouclier de 1 PV × multiplicateur par attaque, 20 au plus) |
- **Effet de style** (`style.scale` : monte de 50 % au niveau 1 à 100 % au niveau 6 ; `style.fixed` : valeurs fixes).
  « Esquive réussie » = un coup ennemi vraiment évité, pas le simple tracé d'un Rond.
- **XP et niveaux** (chaque arme a les siens, `prog.weapons` = `{ epee: { xp } }`) : Voyage et Histoire seulement (`xpModes`) ;
  attaque OK 0, Good 1, Very Good 1, Excellent 2, Perfect 3 ; combo +3 ; super +3 ; gardien ou boss vaincu +5 ; le tout × 0,6
  (`xp.gainMult`). Ajoutée en fin de partie seulement. Niveaux 1 à 10 : 50 XP pour le niveau 2, puis +50 % par niveau ; +2 % d'attaque par niveau ;
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
  Bâton de sève (Mira tombe plus tôt à faible précision). Rééquilibrage du 30/09/2026 (bot « humain » : un geste toutes les 0,7 s, précision 62 à 99 %, 80 % des alertes esquivées,
  3 Voyages par héros) : rounds tenus Boran 29, Kestrel 29, Nyra 27 ; Aldric 20 → 27 (Garde, attaque 5), Ilwen 18 → 22 (125 PV, attaque 5) ;
  Mira (180 PV, soin 4) encore en vie après 25 min et 46 rounds → 150 PV, soin 0,5 : 29-30 rounds en 12 min, encore en vie à l'arrêt du test
  (le plus dur des réglages essayés : soin 3, 2, 1,5 + super à 50 %, 1 et 0,5). Puis (décision du 30/09) Renouveau à 30 % des PV, Clochette
  bouclier 2 PV × multiplicateur, Bâton de sève 8 PV par combo : KO à 17-19 min (Amulette), 16,5-17 min (Bâton de sève),
  22 min et > 25 min (Clochette), contre 9-11 min pour les autres : encore trop solide (sur 8 min, 489 PV perdus pour 488 regagnés ;
  17 supers, soit une Renouveau toutes les 28 s environ). Puis Renouveau à 10 % des PV et Clochette à 1 PV × multiplicateur :
  KO à 16,3 et 16,6 min (Amulette), 9,0 et 12,7 min (Bâton de sève), 15,0 et 20,2 min (Clochette), moyenne 15 min (cible 8-13 min).
  **Mira est à réévaluer après le test fermé**, en comparant les rounds atteints par héros dans le classement du Voyage.
  Décidé le 30/09 : on garde ce réglage ; Mira est l'héroïne accessible pour les débutants (plus solide que les autres, voulu).
  Progression mesurée (un héros, Voyages seulement) : Nv 5 en 9 min, Nv 10 en 25 min, Nv 20 en 1 h 15, Nv 50 en 6 h, Nv 100 en 22 h ;
  arme au niveau 10 en ~6,5 Voyages (≈ 1 h), une histoire ≈ niveau 5. Voyage de 8 arènes sans pièce : 140 or (170 avec record).

## Économie et cosmétiques — `data/economy.json`, `data/cosmetics.json` — **fait**
- **Versé round par round** (`main.js` → `payRounds`, Voyage et Histoire) dès qu'un round est terminé, **acquis même en abandonnant** :
  2 or par pièce ramassée, +15 or par arène du Voyage traversée, gemmes d'un gardien battu la 1re fois (10). Les pièces du round en
  cours ne comptent qu'en fin normale. **Bonus de fin, seulement en fin normale** (pas en abandon) : Voyage 20 + 30 si record (KO) ;
  Histoire 30 à la 1re victoire d'un combat, 5 ensuite. Autres **gemmes** : 30 par histoire terminée, 50 pour l'épilogue ;
  `syncGems()` donne chaque gain une seule fois (`prog.eco.granted`), rétroactif au lancement.
  Testé le 28/09/2026 en quittant au milieu d'un round (Voyage et Histoire).
- **Catalogue** (46 objets : 22 communs, 12 rares, 12 épiques) : 3 couleurs par héros (Teinte Lagon, Soleil, Rubis ; recolorations
  `recolor` couleur d'origine → nouvelle), 6 skins d'arme (un par arme de départ : Lame Braise, Dague Givre, Poings de Lave, Grimoire Jade,
  Arc Corail, Amulette Aurore), 10 tracés (Étincelle, Lierre, Arc-en-ciel, Étoiles, Bulles, Flammes, Confettis, Encre, Pixels, Notes),
  12 skins complets épiques Claude Design, 2 par héros (`assets/skins/`, 300 gemmes : Garde du Crépuscule, Chevalier des Tournois,
  Ombre des Marchés, Danseuse de Lames, Le Bâtisseur, Le Débardeur du Port, Alchimiste des Racines, Étoile Filante,
  Guetteuse des Cimes, Chasseuse du Désert, Gardienne des Sources, Veilleuse de Nuit). Prix : or pour commun (400 ou 550) / rare (1 200 ou 1 500), gemmes pour l'épique (300).
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
  confirmation, puis « Équiper »), Boosts (XP ×2 et or ×2, voir « Récompenses de connexion »), Gemmes (4 packs 80 / 450 / 1000 / 2200, désactivés « Disponible dans l'application »).
  Compteurs or / gemmes en haut du lobby (le « + » mène aux Gemmes) ; le record reste sur la carte du Voyage.
- **Onglet Personnage** : carte Cosmétiques (skin, couleur, skin d'arme, tracé ; « Voir la boutique »).
- **Mode test** (développement seulement : interrupteur `economy.json → test.autorise`, **`false` dans la version publiée** : le passer à
  `true` sur son poste pour développer ou tester, sans jamais le publier ; puis `localhost` / `127.0.0.1`, ou `?test` sur un réseau local,
  `test.lanHosts` ; **jamais sur un domaine public**, même avec `?test`, ni dans l'application native Capacitor) dans Réglages :
  +1000 or, +500 gemmes, pays BE / FR, remise à zéro.
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
- **Fausses pubs seulement en développement** (`ads.js` → `adsReady`, `ads.json → test.hosts` : localhost, 127.0.0.1) ; dans l'application : AdMob.
  Ailleurs sur le web (site publié) : aucune pub, rien n'est gagné ; boutique « +5 gemmes » et « Coffre gratuit » : « Disponible dans l'application » ;
  « Doubler l'or », pub du jour et Seconde chance masqués ; pas de pub plein écran. Vérifié le 01/10/2026 sur une adresse publique simulée.
- **Plein écran** : seulement en quittant les résultats du Voyage (Rejouer ou Retour), une partie sur 3, après 10 minutes de jeu
  cumulées (combat, Entraînement, leçon). Jamais en combat, leçon, Histoire, cinématique. Fermer après le compte à rebours.
- **Sans publicité** (onglet Gemmes) : 2,99 €, désactivé sur le web ; une fois acheté, plus de pub plein écran (les récompensées restent).
- **Duel** : `ads.json → duel` : aucune pub, aucune récompense de pub (`showRewarded({ duel })` refuse).
- Mode test (Réglages) : Sans publicité on / off, « Passer les 10 min », remise à zéro, compteurs affichés.
- Testé le 28/09/2026 : seconde chance (65 / 130 PV), 2e KO sans proposition, or doublé seulement si la pub est vue en entier,
  pas de pub avant 10 min, pub plein écran à la 3e partie seulement, aucune avec Sans publicité, 3 fois +5 gemmes puis « Reviens demain »,
  coffre gratuit une fois par jour.

## Récompenses de connexion et boosts — `data/daily.json` — **fait**
- Code : `src/game/daily.js` (récompenses d'un jour, passage au jour suivant, remise, pub du jour), `src/online/daily-net.js` (serveur),
  `src/game/boosts.js` (boosts), `src/ui/daily-ui.js` + `daily.css` (écrans, d'après la planche Claude Design « Récompenses de connexion »).
  Icônes `assets/icones/recompenses/` (cadeau, pastille, boost_xp, boost_or, boost_actif ; dessin de secours en code si un fichier manque).
- **Série de 7 jours consécutifs** (`streak`) : 50 or, 100 or, boost XP ×2 (3 parties), 150 or, boost or ×2 (3 parties), 100 or,
  15 gemmes + 100 or ; un jour manqué ramène au jour 1 ; après le 7e, retour au jour 1. Jamais de cosmétique.
- **Calendrier de 30 connexions** (`calendar`, jours distincts, un jour manqué ne change rien, nouveau calendrier après la 30e) :
  J5 boost XP ×2 (5), J10 coloris au hasard, J12 boost or ×2 (5), J15 15 gemmes, J18 boost XP ×2 (5), J20 coloris au hasard,
  J25 tracé au hasard, J27 boost or ×2 (5), J30 30 gemmes + coffre simple gratuit ; les autres jours de l'or, de 50 (J1) à 200 (J29).
  Tirage : un coloris ou tracé jamais possédé ; tout possédé, coffre impossible (collection complète, pays sans coffres)
  ou stock de boosts plein : 100 or à la place (`fallbackGold`).
- **Jour du serveur**, heure de Paris (`day.timeZone`) : `daily/{uid}` = `{ lastDay, streak, cal, count, seenAt }` fait foi. Le jeu note
  `seenAt` (heure du serveur) puis la relit pour connaître le jour ; la récupération est une transaction (double appui, deux appareils :
  un seul crédit), gemmes versées au portefeuille `wallet/{uid}` **dans la même écriture**. Les règles refont tout le calcul (jour de Paris
  avec l'heure d'été européenne, série, calendrier, gemmes du jour) : `node tools/check-rules.mjs` vérifie leurs chiffres.
  Or, boosts et cosmétiques : dans la sauvegarde (`prog.eco`, `prog.boosts`, `prog.daily`), comme le reste. **Offre gratuite Spark suffit.**
- **Vrai serveur** (règles publiées le 01/10/2026, testé le jour même, sans émulateur, mode test coupé) : document du jour créé, jour de Paris
  lu à l'heure du serveur (01/10/2026), 1re récupération acceptée (série 1, calendrier 1) ; refusés (permission-denied) : 2e récupération le même
  jour forcée, jour de demain, série gonflée, gemmes sans récupération, document d'un autre joueur. Les gemmes d'un jour (J7, J15, J30)
  n'ont été vérifiées que sur l'émulateur.
- **Fenêtre « Récompense du jour »** : à la première ouverture du jour (après le démarrage et la leçon, jamais en partie ni en Duel),
  une fois par jour (`prog.daily.shownDay`) ; aussi quand la connexion revient. Série et calendrier du jour, « Récupérer », pub du jour.
  Hors connexion : « À récupérer dès que la connexion revient ». Son `deblocage` ; gemmes et cosmétiques par les écrans de récompense
  habituels (regroupés). **Bouton cadeau** rond dans l'onglet Jouer (pastille quand un jour est à récupérer) → écran « Récompenses »
  (série, calendrier avec un grand jour tous les 5, stock de boosts et « Activer »).
- **Pub du jour** (une fois par jour, `prog.daily.adDay`, gardée avec « Sans publicité ») : « Doubler l'or avec une pub » (or du jour des deux
  séries, remplacements compris) ou, sans or ce jour-là, « Bonus : +100 or avec une pub » (`ad.bonusGold`). Jamais gemmes, cosmétiques,
  coffre ni boosts. Avant de récupérer, la pub récupère le jour puis double l'or. Récompense seulement si la pub est vue jusqu'au bout.
- **Boosts** (`boosts`) : XP ×2 (XP du héros et des armes) et or ×2 (or gagné pendant la partie, bonus de fin et coffre d'arène compris).
  Stock de 5 au plus par type, un seul actif par type ; activés dans l'écran Récompenses ou par la proposition « Activer un boost ? »
  au lancement d'une partie (s'il y a du stock). Une partie compte à sa fin : victoire, défaite, ou abandon après au moins 1 round
  (partie du Voyage ou combat d'Histoire). Jamais en Duel, dans la leçon ni en Entraînement. En combat : pastille sous la carte
  Vague / score (boost actif, type, parties restantes). Boutique, onglet **Boosts** : XP ×2 ou or ×2 (3 parties) à 300 or (`economy.json → boosts`).
- **Mode test** (Réglages, sans émulateur) : jour du serveur simulé sur l'appareil (+1 jour, +2 jours = jour manqué, remise à zéro).
- Testé le 30/09/2026 (390 × 800 et 360 × 640, aucune erreur) : 10 jours de suite, jour manqué (série à 1, calendrier continue), J30 puis
  nouveau calendrier, double appui, deux appareils sur le même compte (émulateur : un seul crédit), tirages sans doublon puis 100 or,
  stock plein, or doublé et bonus sans or (pub vue en entier seulement), boosts décomptés dans le Voyage et en Histoire (XP, XP d'arme, or ×2),
  pas dans l'abandon avant 1 round, jamais en Duel ni en Entraînement ; règles : 24 cas sur l'émulateur (jour de demain, 2e récupération,
  série trichée, gemmes gonflées ou sans récupération refusés), jour de Paris identique à `Intl` sur deux ans (quarts d'heure).

## En ligne (Firebase) — `data/online.json` — **fait**
- Projet Firebase `trois-signes`, **offre gratuite Spark** (rien de payant utilisé). SDK web 12.19.0 **embarqué** dans
  `src/vendor/firebase/12.19.0/` (aucun CDN ; import de `firebase-app.js` rendu local, voir son README), chargé en arrière-plan.
- **Connexion anonyme automatique** au premier lancement (aucune inscription) : `src/online/online.js` (`initOnline`, appelé par `main.js`).
  Le compte est gardé par le navigateur ; effacer les données du site ou changer d'appareil = nouveau compte, sauf si la progression est sauvegardée avec Google (« Se connecter avec Google »).
- **Pseudo** (`src/online/pseudo.js`, `src/ui/account-ui.js`) : demandé après le prologue et la première leçon (obligatoire, pseudo proposé
  au hasard), modifiable dans les Réglages ; 3 à 16 caractères, lettres / chiffres / espace / - . _ ; filtre des mots grossiers
  (`online.json → pseudo` : `banned` partout, `bannedWords` en mot entier, accents et chiffres « leet » ramenés) ;
  **pseudos réservés** (`pseudo.reserved`, `isReserved`) : admin, modo, modérateur, support, staff, trois signes, cronos2a et leurs équivalents
  anglais, italiens, espagnols, allemands, refusés même avec majuscules, accents, espaces, chiffres ou symboles glissés au milieu
  (message `pseudo.reserved`). Sauvegarde : `prog.profile.pseudo`.
- **Sauvegarde en ligne** : document Firestore `players/{uid}` = `{ pseudo, save (toute la progression prog en JSON), savedAt, updatedAt, v }`.
  Chaque `saveProg()` date la sauvegarde (`prog.savedAt`) et déclenche un envoi différé (3 s) ; au lancement, la plus récente l'emporte
  (serveur plus récent → `replaceProg`, jamais en pleine partie : appliqué au retour au lobby). Hors connexion : `ts_prog` reste la référence,
  envoi au retour du réseau (nouvel essai toutes les 20 s). Les Réglages du son (`ts_settings`) restent propres à l'appareil.
- **Règles de sécurité** : `firestore.rules` (publiées dans la console le 29/09/2026, puis le 01/10/2026 avec `daily/{uid}` et les gemmes du jour ; `firebase.json` pour `firebase deploy --only firestore:rules`) :
  chaque joueur ne lit, n'écrit et ne supprime QUE `players/{son uid}` ; document validé (champs, pseudo ≤ 16, sauvegarde < 400 Ko) ;
  salons `duels/{code}` et file d'attente `queue/{uid}` (voir Duel), classements `leaderboard/{uid}`, Empreintes `ranked/{uid}`,
  gemmes `wallet/{uid}`, début de partie du Voyage `runs/{uid}` (voir « Sécurité »), récompenses de connexion `daily/{uid}`, comptes supprimés
  `closed/{uid}` (`wallet`, `daily`, `ranked` effaçables seulement après, et jamais recréés), signalements `reports/{id}` ; tout le reste fermé.
  **Règles du 01/10/2026 (comptes supprimés, signalements) : à publier dans la console** (sinon suppression et signalement échouent).
- **Émulateur** (tests) : `firebase emulators:start --only auth,firestore --project trois-signes` (réglages dans `firebase.json`),
  puis le jeu avec `?emu` dans l'adresse (`online.json → emulator`).
  `?longpoll` (`online.json → longPollParam`) : Firestore en requêtes classiques, pour les réseaux qui coupent son flux continu (proxy, tests).
- **Réglages → Compte** : pseudo + « Modifier », état du serveur (en ligne, sauvegarde en cours, hors connexion, injoignable) et n° de joueur,
  « Sauvegarder ma progression avec Google », « Se connecter avec Google », « Supprimer mon compte et mes données », version du jeu.
- **Compte Google** (`src/online/account.js`, fenêtres dans `account-ui.js`, `online.json → account`, textes `account.*`) :
  « Sauvegarder ma progression avec Google » = le compte anonyme devient un compte Google (même n° de joueur, rien ne se perd) ;
  « Se connecter avec Google » (Réglages, et « J'ai déjà une progression » dans la fenêtre du pseudo du premier lancement) = même déroulé.
  Web : `linkWithPopup` ; application Android : extension `@capacitor-firebase/authentication` (**pas installée**, `nativePlugin`) puis
  `linkWithCredential`. Ce compte Google a déjà une progression : lue à part (application Firebase secondaire, rien n'est écrit), le joueur choisit
  « Ce téléphone » ou « Compte Google » puis confirme ; seulement alors l'ancien compte anonyme est fermé et effacé, et le jeu redémarre sur le compte
  Google (copie de secours locale `ts_prog_before_google`). Chaque côté montre niveau le plus haut, record, histoires, gemmes, Empreintes et
  série de connexion (lues au serveur : `wallet`, `ranked`, `daily`) ; avant de confirmer, avertissement en rouge (`account.warnGoogle` / `warnPhone`).
  Gemmes, Empreintes et série vivent au serveur avec le compte Google : quel que soit le choix, ce sont celles du compte Google qui restent
  (« Ce téléphone » gardé : seuls les gains de la table fixe sont repris). Vérifié le 01/10/2026 sur l'émulateur (liaison, choix des deux côtés, annuler,
  retour, ancien compte effacé) par le chemin de l'application (jeton simulé) : la fenêtre Google du web n'a pas pu être testée ici
  (`apis.google.com` bloqué par le réseau de test) : **à essayer sur le site publié et sur un téléphone**.
- **Suppression du compte** (`account.js` → `deleteAccount`, page `legal/supprimer-mon-compte.html`) : deux confirmations ; compte Google : reconnexion
  d'abord ; puis `closed/{uid}`, effacement de `players`, `leaderboard`, `queue`, `runs`, `daily`, `wallet`, `ranked` (+ `games`), suppression du compte,
  sauvegarde de l'appareil effacée (réglages gardés), retour au premier lancement. Vérifié le 01/10/2026 sur l'émulateur (390 × 800, 360 × 640) :
  annuler aux deux étapes, tout effacé, compte supprimé, prologue au relancement ; effacer son portefeuille sans supprimer le compte : refusé.
  Restent : salons de Duel joués (pseudo, scores) jusqu'au ménage des salons, signalements envoyés, trace `closed/{uid}` (n° et date).
- **Signaler un pseudo** (`src/online/report.js`, `src/ui/report-ui.js`, `online.json → report`, textes `report.*`) : drapeau sur chaque ligne d'un autre
  joueur dans les classements, « Signaler » à côté de l'adversaire dans le salon du Duel et sur l'écran de fin ; 4 raisons fixes (insulte, haine,
  contenu sexuel, usurpation). Document `reports/{uid}_{pseudo normalisé}` = `{ pseudo, key, reason, by, at, board }`, un seul par joueur et par
  pseudo, **lisible seulement dans la console Firebase** (Firestore Database → `reports`). Vérifié : envoi, doublon, réécriture, lecture, signalement
  au nom d'un autre et raison inconnue refusés.
- Console Firebase : Authentication → Anonyme activé, « Activer la création (inscription) » coché ; Firestore en Europe, mode production.
- Testé le 29/09/2026 avec deux navigateurs : deux comptes distincts, chacun lit son document, lecture et écriture du document de l'autre
  refusées (permission-denied), hors connexion puis retour (or envoyé), sauvegarde serveur plus récente reprise au lancement, pseudo après la leçon.
- Contrôles de cohérence : faits par les règles (gratuit), voir « Sécurité ». Ce que seule l'offre payante Blaze permettrait : voir la même section.

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
  arène (voir Duel au hasard), variantes d'ennemis par vague (`variants`).
- **Vagues synchronisées** : à la fin d'une vague, écran « En attente de [pseudo] » avec son score en direct (signe de vie toutes les
  `heartbeatSeconds`) et « Abandonner », plus le temps restant au plus de sa vague (« Fin de sa vague dans 32 s au plus », d'après
  son `waveAt` et l'heure du serveur). Limite de `waveSeconds` (45 s) par vague : la vague s'arrête avec son score.
- **Pression** : avant chaque vague, « Pression : [pseudo] +X % », puis discrètement dans le bandeau pendant la vague ; PV et dégâts des ennemis + 40 % × (score adverse sur la vague
  précédente ÷ score maximal théorique de cette vague), plafonné à 40 % (`pressure`). Score maximal théorique (`maxScore`) : partie sans faute
  (tout en Perfect avec une attaque de référence de 4, combos, 2 esquives Perfect par ennemi, pièces). Vague 1 : même départ pour les deux.
- **Victoire** : KO avant la fin = défaite (l'autre doit finir la vague) ; KO tous les deux dans la même vague = meilleur score total ;
  les deux survivent au boss = plus gros score total ; abandon (« Quitter ») ou plus de 30 s sans signe de vie (`disconnectSeconds`, heure du serveur) = défaite.
- **Écran de fin** : Victoire / Défaite / Égalité, raison, tableau par vague (mes points, les siens, pression reçue, pression donnée), total.
- Bonus de niveau des héros et d'XP des armes neutralisés (`bonus_en_duel`), armes alternatives, style (100 %) et talismans actifs.
  **Ni or, ni gemmes, ni XP** (héros ou armes) en Duel ; aucune pub, aucune récompense de pub, pas de Seconde chance, aucun boost.
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

## Duel contre un adversaire au hasard — `data/duel.json` → `random`, `prints`, `arenas` — **fait (étape 3)**
- Menu du Duel : **Adversaire au hasard** (en premier), puis « ou défie un ami » (Créer un salon / Rejoindre).
- **Recherche** (`duel-net.js` → `search`) : fiche `queue/{uid}` = `{ pseudo, prints, seen, room }` ; chacun cherche un joueur à ± 200 Empreintes
  (`range`), écart élargi de 200 (`rangeStep`) toutes les 10 s (`widenSeconds`), fiches sans signe de vie depuis 15 s ignorées.
  Le premier qui trouve crée le salon (`mode: 'random'`, `invite` = l'autre, seul admis) et écrit son code dans la fiche de l'autre
  (transaction : les deux encore libres), qui le rejoint. « Annuler » retire la fiche ; personne après 60 s (`searchSeconds`) : « Réessayer ».
  Ensuite comme entre amis (choix du héros, Valider), sans code affiché ; salon : pseudo et Empreintes de l'adversaire, arène du combat.
- **Empreintes** (`game/duel-rank.js` pour l'affichage, `online/ranked.js` au serveur qui fait foi ; `prog.duel = { prints, unlocked }`) : victoire +30, défaite −20, égalité 0, jamais sous 0 ;
  abandon = défaite. **Duel au hasard seulement** (entre amis : rien). Affichées sur l'écran de fin (« Empreintes : 320 (+30) »).
- **Arènes du Duel** : les 8 arènes du Voyage, paliers 0 / 300 / 600 / 1 000 / 1 500 / 2 100 / 2 800 / 3 600 (`arenas.thresholds`).
  Arène actuelle = palier des Empreintes actuelles. Tout Duel (au hasard ou entre amis) se joue dans l'arène la plus haute des deux joueurs
  (décor, fond et musique de l'arène du Voyage, annoncée au départ). Boss toujours tiré au sort (`boss.pool`).
  Premier passage d'un palier : écran « Nouvelle arène débloquée » après la fin du Duel (`unlocked`).
- Onglet Jouer : carte Duel « 320 Empreintes · Hautes-Gerbes » (aussi en tête du menu du Duel).
- Règles : fiche de file lisible par tout joueur connecté, écrite par son propriétaire ; un autre joueur ne peut qu'y inscrire (une fois)
  le code d'un salon dont il est l'hôte. Salon au hasard : seul le joueur invité peut le rejoindre.
- Testé le 29/09/2026 sur l'émulateur (trois navigateurs, 390 × 800 et 360 × 640) : recherche annulée (fiche retirée), rencontre 290 / 300,
  arène Hautes-Gerbes pour les deux, abandon : +30 (320, écran « Nouvelle arène débloquée ») et −20 (280), carte Duel à jour,
  joueur seul à 3 000 : « Réessayer » après 60 s, Duel entre amis sans changement d'Empreintes, aucune erreur dans la console.
  Règles republiées le 29/09/2026 et vérifiées sur le vrai serveur : deux joueurs à 5 000 se trouvent (salon `random`, invité seul admis,
  arène 7) ; un tiers ne peut ni inscrire un code, ni changer les Empreintes, ni supprimer la fiche d'un autre (permission-denied).
  Sur deux essais en ligne depuis l'environnement de test, un seul a abouti (l'autre : personne trouvé en 60 s, sans erreur,
  réseau de test instable) : à confirmer sur deux téléphones.

## Sécurité (étape 5) — `firestore.rules`, `data/duel.json` → `security` — **fait, sans offre payante**
- Tout est vérifié par les **règles Firestore** (gratuites) : le client ne peut plus changer directement Empreintes, gemmes ni classements.
  Les chiffres recopiés dans les règles sont vérifiés par `node tools/check-rules.mjs` (à lancer après tout changement de `duel.json`,
  `economy.json`, `ads.json`, des arènes ou des héros).
- **Duel** (entrée de chaque joueur) : scores de vague seulement ajoutés (les anciens ne changent plus), plafonnés par vague
  (`security.waveCaps` : 4 000 / 4 400 / 4 800 / 5 400 / 6 000), jamais rendus moins de `minWaveSeconds` (3 s) après le début de la vague
  (`waveAt`, heure du serveur, notée par `startWave`) ; vague suivante seulement après avoir rendu la précédente ; KO, fin, abandon
  définitifs ; héros figé une fois « Prêt ». Mesures (bot surhumain) : 3 216 points au plus sur une vague, vague la plus rapide 4,7 s.
- **Empreintes** : `ranked/{uid}` = `{ prints, last, updatedAt }` fait foi (`src/online/ranked.js`). Après un Duel au hasard, chaque joueur
  envoie le résultat des **deux** joueurs ; les règles recalculent l'issue d'après le salon (même calcul que `outcome` en JS : abandon,
  déconnexion de 30 s, KO, scores) et n'acceptent que +30 / −20 / 0, une seule fois par salon (`ranked/{uid}/games/{code}`).
  Un perdant ne peut donc pas éviter sa défaite en ne l'envoyant pas. File d'attente et classement Duel : Empreintes = celles du serveur.
  `prog.duel.prints` n'est que le reflet (relu à chaque connexion).
- **Gemmes** : `wallet/{uid}` = `{ gems, granted, adDay, adCount }` fait foi (`src/online/wallet.js`) ; trois mouvements seulement
  (plus les gemmes d'une récompense de connexion, dans la même écriture que `daily/{uid}`, voir « Récompenses de connexion ») :
  gain de la table fixe (gardien 10, histoire 30, épilogue 50, une fois chacun), pub récompensée +5 (3 par jour, jour UTC), dépense.
  Mouvements en attente hors connexion (`prog.eco.pending`). Anciennes sauvegardes : les gains déjà reçus sont rejoués un par un ;
  les gemmes d'avant venues des pubs ou du mode test ne sont pas reprises. Mode test sans émulateur : gemmes locales seulement.
- **Record du Voyage** : début de chaque partie noté au serveur (`runs/{uid}`) ; record accepté si ≤ 600 × t × (3 + 0,025 × t)
  (t : secondes depuis ce début ; `security.voyage`), jamais en baisse. Record refusé faute de durée (partie commencée hors connexion) :
  au retour du réseau et hors partie, nouveau départ noté, attente de la durée minimale pour ce score, renvoi, puis message
  « Record synchronisé » (`leaderboard.js` → `queueRecord`, `online.json → leaderboard.recordMargin`, `ui.recordSynced`).
- **Limites** (sans serveur de calcul) : les règles vérifient qu'un score est *possible*, pas qu'il a été *joué* ; un tricheur peut encore
  envoyer des scores sous les plafonds. Le contenu des coffres et les cosmétiques possédés restent dans la sauvegarde du joueur
  (sans avantage en jeu).
- **Offre Blaze** (non activée) : paiement à l'usage, mêmes quotas gratuits inclus (Cloud Functions : 2 millions d'appels par mois),
  carte bancaire obligatoire, alerte de budget possible ; pour ce jeu aujourd'hui ≈ 0 € par mois. Utile plus tard pour : vérifier les achats
  réels (reçus Google Play, indispensable), tirer les coffres au serveur, et un vrai contrôle anti-triche (rejouer les gestes au serveur,
  gros travail). **Décidé le 29/09/2026 : Blaze reste désactivée ; on l'active juste avant la publication sur le Play Store,
  quand les achats de gemmes deviennent réels** (voir « Avant la publication sur le Play Store »).
- Testé le 29/09/2026 sur l'émulateur : Duels normaux (entre amis et au hasard) acceptés ; refusés : score réécrit, vague rendue en 0,5 s,
  score au-dessus du plafond, héros changé après « Prêt », KO effacé, abandon annulé, victoire avant la fin, partie comptée deux fois,
  Empreintes à 9 999, défaite effacée, file et classement avec de fausses Empreintes, record de 1 000 000 en 10 s, début de partie antidaté,
  gemmes à 9 999, gain reçu deux fois, gain inventé ou gonflé, 4e pub du jour, dépense sous zéro, portefeuille d'un autre.
  Cas limites : KO des deux dans la même vague (égalité à 0 point, puis meilleur score gagne), déconnexion en pleine vague (victoire après 30 s,
  +30), abandon en pleine vague (+30 / −20). Vrai record du Voyage (7 062 après 40 s) classé, coffre payé au serveur (230 → 170).
  Processeur bridé ÷6 (deux navigateurs sur la même machine, rendu sans carte graphique) : Duel 35 à 44 images/s, comme le Voyage
  dans les mêmes conditions (42) : le Duel n'ajoute pas de coût.
  Règles publiées le 29/09/2026 et vérifiées sur le vrai serveur : portefeuille créé, gain de l'épilogue accepté, gemmes à 9 999 et gain
  en double refusés ; Empreintes à 9 999, file avec de fausses Empreintes et record de 500 000 sans partie refusés ; dans un salon :
  score au-dessus du plafond et score réécrit refusés, score normal accepté. La durée minimale d'une vague n'a pas pu être prise en défaut
  depuis l'environnement de test (7 s de réseau entre deux écritures) : vérifiée sur l'émulateur (score rendu 0,5 s après : refusé).

## Classements — `data/online.json` → `leaderboard` — **fait (étape 4)**
- Onglet Jouer : bouton **Classements** sur la carte du Voyage → écran à deux onglets **Voyage** (meilleur score) et **Duel** (Empreintes) :
  top 100 mondial (rang, héros favori, pseudo, score ; ex æquo au même rang), ma ligne surlignée, ma position en bas
  (« 71e · Toi · Alpha 5 050 », aussi hors du top 100 ; « Pas encore classé » à 0). Code : `src/online/leaderboard.js`, `src/ui/ranking-ui.js`, `ranking.css`.
- Ligne `leaderboard/{uid}` = `{ pseudo, hero, voyage, prints, updatedAt }`, écrite après chaque envoi de la sauvegarde si une valeur a changé.
  **Seul le meilleur score du Voyage** est gardé : jamais plus bas que celui déjà au serveur (le client prend le plus haut, les règles refusent une baisse),
  et plausible pour la durée de la partie (voir « Sécurité »). Empreintes : celles de `ranked/{uid}`.
  Héros favori = le plus joué (`prog.played`, compté à chaque partie hors leçon ; sinon le plus haut niveau).
- Position : nombre de joueurs strictement devant + 1 (requête de comptage, offre Spark). Chaque joueur envoie ses propres valeurs : pas de contrôle anti-triche.
- Règles : lecture pour tout joueur connecté ; écriture et suppression de sa seule ligne ; champs validés (pseudo 3 à 16, entiers ≥ 0).
- Testé le 29/09/2026 sur l'émulateur avec 120 joueurs fictifs et deux navigateurs (390 × 800 et 360 × 640) : Alpha 71e au Voyage (dans le top),
  Bravo 122e (hors top) et 60e en Duel, « Pas encore classé » à 0 Empreinte, héros favori (Kestrel), baisse du score et écriture
  de la ligne d'un autre refusées, nouveau record → 1er, record local plus bas → la ligne garde le meilleur, aucune erreur ni débordement.
  Règles republiées le 29/09/2026 et vérifiées sur le vrai serveur : ligne écrite (pseudo, héros favori, record, Empreintes), top et position
  lus pour les deux classements, baisse du record refusée (permission-denied) ; ligne de test supprimée ensuite.

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
  Fin d'histoire enregistrée dès la victoire du combat 10, avant les scènes : fragment, `endings` (fins pas encore vues) et
  `epiloguePending` ; une scène interrompue (jeu fermé) est rejouée à la prochaine ouverture du mode Histoire (`resumeEndings`).

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
- Coffre de l'écran « Arène découverte » : le talisman du gardien battu ; s'il est déjà possédé, de l'or à la place (`chestFallback`).
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

## Robustesse (corrections du 29/09/2026, voir `à faire.md`)
- **Sauvegarde abîmée** (`src/game/save-check.js` : `readSave`, `saveProblems`) : le jeu démarre toujours ; écran « Sauvegarde endommagée »
  (`account-ui.js` → `askDamagedSave`, textes `online.json → damaged`) : récupérer la sauvegarde en ligne ou repartir de zéro. Tant que le
  joueur n'a pas choisi, rien n'est écrit ni envoyé (`saveState.damaged`) ; l'ancienne est gardée dans `ts_prog_damaged`.
  Sauvegarde incomplète : complétée sans rien demander (`ensureDefaults`). Sauvegarde du serveur abîmée : ignorée (`replaceProg`).
- **Quitter une partie** (`src/ui/quit-confirm.js`, textes `quit.*`) : une seule confirmation pour le bouton « Quitter » de l'écran,
  « Abandonner » de l'attente du Duel et le bouton Retour du téléphone (`back.js` → `setLeave`, `main.js` → `askLeave`) ; Retour pendant
  la fenêtre = « Continuer » (sélectionné par défaut). Pause pendant la question, sauf en Duel (le match continue, le message le dit).
  Message selon le mode, d'après les règles du code : Voyage (or et gemmes gardés ; ni bonus de fin, ni record, ni XP), Histoire (combat à
  refaire, or des rounds terminés gardé), Entraînement, leçon, Duel (défaite ; au hasard : perte réelle d'Empreintes, `duel.json → prints.loss`,
  jamais sous 0), boost actif après au moins un round (« compté comme utilisé »). Vérifié le 03/10/2026 dans les 5 langues, deux tailles.
- **Bouton Retour** (`src/ui/back.js`) : en partie, la confirmation ci-dessus ; cinématique passée, fenêtre du dessus fermée dans les menus ;
  sur l'onglet Jouer, il quitte le jeu.
- **Portrait** (`manifest.webmanifest`, `src/ui/orient.js`, textes `rules.json → orientation`) : téléphone en paysage → « Tourne ton téléphone »,
  partie en pause (sauf en Duel).
- **Duel** : l'adversaire n'est jugé déconnecté que sur des données confirmées par le serveur ; soi-même, plus de 30 s sans contact
  avec le serveur (réseau ou veille) = défaite « Tu as été déconnecté ». Calque des écrans du Duel : classe `.du-layer`.
- **Gemmes et talismans** : plusieurs gains d'un coup = un seul écran récapitulatif chacun (`reward-ui.js`).
- **Explications** (`src/ui/tips.js`, textes `rules.json → tips`, vues notées dans `prog.tips`) : une seule fois, encadré dans l'écran
  de la 1re arme alternative, du 1er talisman (récompense ou coffre d'arène), des 1res Empreintes (fin de Duel au hasard) ;
  bulle « Compris » au 1er salon de Duel (pas la place d'un encadré). Pseudo normalisé en NFC avant vérification.

## Langues (i18n) — `src/i18n.js`, `data/i18n/` — **fait (5 langues : français, anglais, italien, espagnol, allemand)**
- **Aucun texte visible dans le code** : tout passe par `tr('clé', { variables })` (textes de `data/i18n/{langue}.json`).
  Les textes déjà rangés dans les autres fichiers de `data/` (noms, descriptions, `ui` de chaque fichier) y restent : une langue les
  remplace par sa section `"data"` (même chemin), superposée au chargement (`applyLanguageData`). Histoire : `story_mode.json`, `tutorial.json`.
  Tableau d'objets (héros, répliques, combats…) : fusionné case par case, on n'y écrit que les textes (`null` = case inchangée) ;
  tableau de textes (`statLabels`, lignes des crédits) : remplacé en entier.
  Textes fixes de `index.html` : attributs `data-i18n`, `data-i18n-title`, `data-i18n-aria` (`applyStatic`).
- **Langues** (`data/i18n/languages.json`) : fr, en, it, es, de ; les 5 fichiers existent (`ready`). Langue par défaut : celle du téléphone si
  elle est proposée, sinon l'anglais ; `?lang=de` pour tester ; choix dans les Réglages (`settings.lang`, le jeu se recharge).
  Clé absente dans la langue active → texte français (repli). Langues pas encore prêtes : « (bientôt) » dans les Réglages.
  Noms des langues traduits dans chaque langue (`settings.langNames`).
- **Nombres** : `nf` / `nfi` (Intl, locale de la langue, séparateur des milliers insécable) ; dates : `dateText`. **Pluriels** : clé
  `{ "one": …, "other": … }` choisie par `Intl.PluralRules` (`vars.n`).
- **Grammaire par langue** : « de » + lieu ou héros = forme complète (`of.arena.*`, `of.hero.*` : « de la Forêt de Mousse », « d'Aldric ») ;
  « de » + pseudo = règles `grammar.of` (`ofName`) ; articles et titres ôtés pour l'initiale d'un portrait manquant : `dialogue.titles` (`initialOf`).
- Glossaire imposé : `data/i18n/GLOSSAIRE.md` (titre Three Signs jamais traduit, les trois signes, Empreinte, Silence, Ombracés, Cœur du Silence, Fragment de mémoire, lieux).
  Noms des héros et niveaux de réussite (OK … Perfect) identiques dans toutes les langues. Aucune image ne contient de texte.
- Exceptions volontaires : message « lancez via un serveur » de `index.html` (ouvert en `file://`, aucun fichier ne se charge), nom de lieu
  de secours tiré de l'identifiant quand un décor manque (`placeName`), messages de la console (développeurs).
- **Anglais** (`en.json`, fait le 30/09/2026) : toute l'interface et toute la section `data` (armes, talismans, cosmétiques, héros, arènes,
  économie, crédits, leçon, prologue, 6 histoires, épilogue, boss). Choix : Le Voyage = **The Journey** ; Sire / Madame / Tante / Capitaine /
  Maître / Monsieur = Sir / Madam / Aunt / Captain / Master / Mr ; « de » + pseudo : « Name's » (« Name' » après un s) ; noms de personnages
  gardés (Tonnerre, le taureau de Boran, aussi) ; prix en « €2.99 ». Le joueur est tutoyé partout (« you »).
  Vérifié : 0 clé en repli, 0 texte de `data/` resté en français ; premier lancement, 21 écrans du lobby, fenêtre du jour, Récompenses,
  Voyage (boost, arène, gardien, Seconde chance, pub, résultats), histoire d'Aldric en entier (26 scènes ligne par ligne) et son combat 5,
  Duel à deux (salon, bulle, attente, pression, retour, fin) en 390 × 800 et 360 × 640 : aucun débordement, aucune erreur.
  Mêmes retours à la ligne qu'en français sur la carte du Voyage et les onglets de la boutique (voulu par la maquette).
- **Italien** (`it.json`, fait le 30/09/2026) : interface et section `data` complètes, histoire comprise. Choix : Le Voyage = **Il Viaggio** ;
  lieux : Foresta di Muschio, Tetti di Vélis, Biblioteca di Aubelle, Passo dei Venti, Scuola dei Segni, Il Cuore del Silenzio, Oltre il Silenzio ;
  Sire / Madame / Tante / Capitaine / Maître / Monsieur = Ser / Madama / Zia / Capitano / Maestro / Signor ; « de » + pseudo : « di {name} » ;
  sbire / brute = Scagnozzo / Bruto, Ombracé = Svuotato ; Kestrel = « la Raminga ». Le joueur est tutoyé ; entre personnages, le « vous »
  de respect devient « voi » (Aldric et Nyra envers Eldan, Ilwen, Mira envers Fabre et Hélo). Prix « 2,99 € ».
  Vérifié comme l'anglais (0 clé en repli, 0 texte de `data/` resté en français, mêmes parcours aux deux tailles) : aucun débordement, aucune
  erreur ; raccourcis pour 360 × 640 : « CALENDARIO · G. 1 », bouton de pub du jour « Oro ×2 con un video ».
- **Espagnol** (`es.json`, fait le 30/09/2026, espagnol d'Espagne) : interface et section `data` complètes, histoire comprise. Choix :
  Le Voyage = **El Viaje** ; lieux : Bosque de Musgo, Tejados de Vélis, Biblioteca de Aubelle, Paso de los Vientos, Escuela de los Signos,
  El Corazón del Silencio, Más allá del Silencio ; Sire / Madame / Tante / Capitaine / Maître / Monsieur = Ser / Doña / Tía / Capitán / Maestro /
  Señor ; « de » + pseudo : « de {name} » (« El X » → « del X ») ; sbire / brute / boss = Esbirro / Bruto / Jefe, Ombracé = Vaciado, boost = potenciador,
  pub = anuncio ; Kestrel = « la Exploradora ». Joueur tutoyé ; le « vous » de respect entre personnages devient « usted ».
  Vérifié comme l'anglais et l'italien : 0 clé en repli, 0 texte de `data/` resté en français, mêmes parcours aux deux tailles, aucune erreur.
- **Allemand** (`de.json`, fait le 01/10/2026) : interface et section `data` complètes, histoire comprise. Choix : Le Voyage = **Die Reise** ;
  lieux : Mooswald, Dächer von Vélis, Bibliothek von Aubelle, Windpass, Schule der Zeichen, Das Herz der Stille, Jenseits der Stille ;
  Sire / Madame / Tante / Capitaine / Maître / Monsieur = Sir / Frau / Tante / Hauptmann / Meister / Herr ; `{of}` = génitif (« des Mooswalds »,
  « Aldrics ») ; « de » + pseudo : « Names » (« Name' » après s, ß, x, z) ; XP = EP, PV = LP, niveau = Stufe (« St. 12 ») ; sbire / brute = Scherge /
  Rohling, Ombracé = Verblasster, gemmes = Edelsteine ; Kestrel = « die Waldläuferin ». Joueur tutoyé (« du ») ; le « vous » de respect entre
  personnages devient « Ihr » (ton de fantasy). Vérifié comme les autres langues (0 clé en repli, mêmes parcours, cartes et titres des 6 histoires) :
  aucun débordement, aucune erreur, sans rien raccourcir.
- **Carte de l'histoire** (corrigé le 30/09/2026, toutes langues, français compris) : titres d'étape sortant de l'écran (« La piste du vieil
  homme », « El campamento de los exploradores »…) et titre d'histoire coupé par « … » en haut (« Ceux qu'on peut sauver ») : l'étiquette a la
  place réelle à côté de son rond (`--room`, `story-ui.js` → `layout`) et passe à la ligne ; le titre du haut aussi.
- Vérifié le 30/09/2026 : textes de 21 écrans et du jeu (Entraînement, bulles, gestes, bandeau) identiques avant / après en français,
  sauf « 1 point » (pluriel), « HISTOIRE D'ALDRIC » (élision), la bulle de Renouveau « +10 % PV » (au lieu de « PV au max », faux depuis
  le rééquilibrage) ; `?lang=de` : textes en français, nombres « 1.234.567 », aucune erreur.

## Réglages et crédits
- Engrenage du lobby (`src/ui/lobby.js` → `renderSettings`, `src/game/settings.js`, clé `ts_settings`) : volumes Musique / Effets, Vibrations,
  Langue, Compte (pseudo, état du serveur, Google, suppression du compte), bouton **Crédits**, version du jeu.
- **Version** : `data/version.json` (`version` x.y.z, `build` entier qui ne fait que monter = versionCode Android, `studio`, `contact`) ; affichée en bas
  des Réglages et en tête des Crédits avec « Un jeu de Cronos2A ». L'adresse de contact n'apparaît dans les Crédits que si c'est une vraie adresse
  e-mail (`cronos2a.jeux@gmail.com`, aussi dans `legal/supprimer-mon-compte.html`).
  Trois liens (nouvel onglet, 48 px de haut) en bas des Réglages et dans les Crédits : « Politique de confidentialité », « Conditions
  d'utilisation », « Supprimer mon compte » (`version.json → legal`, textes `about.*` ; pages de `legal/`, fournies le 02/10/2026, en français).
  Adresses publiques à donner à la Play Console : `AVANT_PUBLICATION.md` (en tête). Pas de réglage de tolérance des gestes (retiré pour de bon : équité, futur Duel).
- Écran Crédits : texte dans `data/credits.json` (`renderCredits`). À tenir à jour avec `CREDITS.md` à chaque nouvelle source.

## Conventions
- **Toutes les valeurs dans `data/*.json`**, jamais en dur dans le code (seule exception : `TUNING` des gestes).
- **Aucun texte visible dans le code** : `tr('clé')` et `data/i18n/fr.json` (voir « Langues ») ; nombres par `nf` / `nfi`, jamais `toLocaleString('fr-FR')`.
  `src/data.js` charge : grades, characters, enemies, waves, rules, story_mode, voyage, audio, tutorial, credits, weapons, talismans, progression, economy, cosmetics, ads, online, duel, daily, version.
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
index.html  manifest.webmanifest (portrait)
src/
  i18n.js            langues : tr(), nombres, pluriels, grammaire par langue, repli sur le français
  main.js            boucle de jeu, écrans, démarrage (prologue puis leçon au premier lancement)
  data.js            chargement de data/*.json
  util.js
  input/gestures.js  reconnaissance des gestes + précision
  game/  state.js (état partagé G)  grades.js  combat.js  enemies.js  effects.js  progress.js (XP et niveaux des héros, sauvegarde)
         save-check.js (sauvegarde abîmée : forme attendue)
         supers.js  settings.js  tutorial.js  voyage.js  weapons.js (armes, XP, niveaux, style)
         talismans.js  rewards.js (récompenses méritées, rétroactives)  economy.js (or, gemmes, coffres)  cosmetics.js
         variants.js (variantes sbire / brute / boss selon l'arène ou le combat)  duel.js (Duel : programme, pression, victoire)
         duel-rank.js (Empreintes, arènes du Duel)  daily.js (récompenses de connexion)  boosts.js (boosts XP / or)
  story/story.js     déroulé du mode Histoire
  online/ online.js (Firebase : compte anonyme, sauvegarde en ligne)  account.js (Google, suppression du compte)  report.js (signalements)  leaderboard.js (classements)  ranked.js (Empreintes au serveur)  wallet.js (gemmes au serveur)  pseudo.js (pseudo : règles et filtre)  duel-net.js (salon de Duel, file d'attente)  daily-net.js (récompenses de connexion au serveur)
  vendor/firebase/   SDK Firebase embarqué (app, auth, firestore)
  ads/   ads.js (gestionnaire des pubs)  admob.js (emplacement AdMob + consentement UMP, pas encore installé)
  audio/ audio.js  synth.js
  ui/    lobby.js (+ réglages, crédits, résultats)  hud.js (rendu canvas)  combat-hud.js  combat-art.js  anim.js  sprites.js
         art.js  icons.js  assets.js (images + replis)  cutscene.js  story-ui.js  story-art.js
         tutorial-ui.js  tutorial-art.js  voyage-ui.js  weapon-ui.js (cartes Armes / Talisman, XP de fin de partie)
         reward-ui.js (écran « Nouvelle arme / Nouveau talisman / Gemmes »)  shop-ui.js (boutique, coffres, carte Cosmétiques)
         looks.js (apparence des héros)  money.js (or et gemmes)  ad-ui.js (fausse pub, Seconde chance)  cover.js (écran de lancement)
         account-ui.js (pseudo, bloc Compte des Réglages, sauvegarde endommagée)  tips.js (explications à la 1re rencontre)
         back.js (bouton Retour du téléphone)  quit-confirm.js (« Quitter la partie ? »)  orient.js (portrait, « Tourne ton téléphone »)  duel-ui.js (salon, attente, pression, fin du Duel)  ranking-ui.js (classements)
         daily-ui.js (fenêtre du jour, écran Récompenses, bouton cadeau, proposition de boost, pastille de combat)
         report-ui.js (fenêtre « Signaler un pseudo »)  fonts.css (polices embarquées)  touch.css (zones tactiles, chargé en dernier)
         organic.css (ne pas modifier)  lobby.css  shop.css  ads.css  style.css  story.css  tutorial.css  voyage.css  duel.css  ranking.css  daily.css
data/    characters grades enemies waves rules story_mode voyage tutorial audio credits weapons talismans progression economy cosmetics ads online duel daily version (.json)
  i18n/  languages.json  fr.json (textes de l'interface)  GLOSSAIRE.md
firestore.rules  firebase.json   règles de sécurité Firestore
legal/  supprimer-mon-compte.html (Play Store : « URL de suppression du compte »)  politique-de-confidentialite.html  conditions-utilisation.html
tools/check-rules.mjs            vérifie que les chiffres des règles sont ceux de data/
assets/  portraits/  ennemis/ (+ variantes/)  decors/  icones/armes/  icones/talismans/  icones/monnaies/  icones/recompenses/  boutique/  skins/  audio/sfx/  audio/musique/   (IMAGES.md, audio/SONS.md)
design/  exports Claude Design (voir Direction artistique)
prototype/ prototype d'origine
```

## Avant publication
À faire avant chaque commit publié sur `main` :
- Tester dans le navigateur chaque écran ajouté ou modifié, en **390 × 800** et en **360 × 640** : rien ne déborde,
  pas de défilement horizontal, tous les boutons restent visibles et utilisables, aucune erreur dans la console.
- **Mode test invisible dans le jeu publié** : les outils de développement des Réglages (+1000 or, +500 gemmes, pays, pubs,
  récompenses de connexion « +1 jour », « +2 jours », remise à zéro, jour du serveur simulé) n'apparaissent que sur `localhost` /
  `127.0.0.1`, ou avec `?test` sur un réseau local (10.x, 192.168.x, 172.16-31.x, `*.local`). Sur un domaine public, `?test` est ignoré
  (`economy.js → testMode`). Vérifié le 30/09/2026 (390 × 800 et 360 × 640) : domaine public, avec ou sans `?test` / `?emu` → aucun
  outil de test, récompenses du jour au serveur ; `localhost`, `127.0.0.1` et réseau local + `?test` → outils visibles.
  À revérifier si le jeu est publié sur une adresse de réseau privé ou si `testMode` change.
  Deux verrous de plus (30/09/2026) : **`economy.json → test.autorise` doit valoir `false`** dans tout commit publié (il coupe tout le
  mode test, même sur `localhost`) ; dans l'**application native**, `testMode` renvoie toujours `false` (`window.Capacitor` défini et
  `Capacitor.isNativePlatform()` vrai), quelle que soit l'adresse. Vérifié : `autorise` à `false` → aucun outil sur `localhost` ni réseau
  local ; à `true` → outils sur `localhost` et réseau local + `?test`, jamais sur un domaine public ; Capacitor natif → aucun outil,
  même à `true` sur `localhost` ; Capacitor en navigateur (non natif) → outils visibles.
- **Au moment de l'emballage Capacitor, vérifier que les outils de test sont invisibles dans l'APK** (Réglages : aucun bloc « Mode test »,
  ni « +1 jour », ni « +1000 or »), et que `test.autorise` vaut `false`.

## Avant la publication sur le Play Store
- **Activer l'offre Blaze de Firebase** (paiement à l'usage, carte bancaire, alerte de budget à régler), juste avant la publication,
  quand les achats de gemmes deviennent réels : Cloud Functions pour vérifier les reçus Google Play (gemmes, « Sans publicité »).
  Jusque-là, rester sur l'offre gratuite Spark.

## Prochaines tâches (dans cet ordre)
1. **Terminer le son** si besoin : `ui_clic`, `ui_onglet`, `musique_triste`, et une `musique_lobby` plus longue.
2. **Duel, suite** : ménage des salons terminés.
3. **Avant le Play Store** : voir `AVANT_PUBLICATION.md` (adresse de contact, extension Google de Capacitor et empreintes SHA-1, règles à publier…).

Plus tard : achat réel des gemmes et de « Sans publicité », AdMob (dans l'application), histoire jouable d'Eldan, jeu installable et jouable hors-ligne.
