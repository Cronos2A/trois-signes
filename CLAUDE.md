# Trois Signes — brief pour Claude Code

État du projet au 28/09/2026. À tenir à jour à chaque étape terminée.

## Le projet
Petit jeu mobile à gestes, jouable au doigt, en parties courtes. PWA en HTML/JS (canvas), textes en français.
Trois signes : **Triangle** = attaquer, **Rond** = esquiver, **Toucher** (tap) = ramasser.

Modes jouables aujourd'hui : **Solo = Le Voyage** (infini), **Histoire** (6 × 10 combats), **Entraînement**, **La première leçon** (tutoriel).
Chaque héros a 3 armes qui progressent (niveaux 1 à 10) et un emplacement de talisman. Économie : or, gemmes, coffres et cosmétiques. À venir : **Duel** (multijoueur).

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
  - `trois-signes-character-sheet` : `project/tools/story-engine.js`, générateur des portraits et sprites de boss.
- Seuils « proposés » affichés dans la maquette de combat : **non repris** (seules les couleurs par palier le sont).
- Combat : sprites de ¾ dos pour le héros, animations = simples transformations des sprites, déduites de l'état du jeu
  (`src/ui/anim.js`). Corps à corps (Aldric, Nyra, Boran) : ruée + coup d'arme ; à distance (Kestrel, Ilwen, Mira) : projectile.
- Ce qui n'est pas codé (Duel) est affiché et marqué « Bientôt ». Gemmes (achat réel plus tard) : **cosmétiques seulement, jamais d'avantage en jeu**.

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
  `duel.stylePower` (100 %) pour tous. Armes : `autorise_en_duel: true`. Talismans : `autorise_en_duel: false`, **à décider**.
- Équilibre vérifié le 28/09/2026 par un bot à graine (4 Voyages par arme au niveau 6, précision 82 % puis 90 %) : pas d'arme
  nettement au-dessus ; Couteaux de lancer relevés (jauge 10 → 15 par ennemi vaincu) ; à surveiller : Arbalète (+12 à 17 % de score),
  Bâton de sève (Mira tombe plus tôt à faible précision). Mira ne tombe presque jamais (180 PV + soin) : équilibre des héros à revoir.

## Économie et cosmétiques — `data/economy.json`, `data/cosmetics.json` — **fait**
- **Or** (en fin de partie, perdu si on quitte) : Voyage 10 + 5 par arène traversée + 20 si record ; Histoire 30 à la 1re victoire
  d'un combat, 5 ensuite ; chaque pièce ramassée = 2 or (Voyage et Histoire). **Gemmes** : 10 par gardien du Voyage battu la
  1re fois, 30 par histoire terminée, 50 pour l'épilogue ; `syncGems()` les donne une seule fois (`prog.eco.granted`), rétroactives au lancement.
- **Catalogue** (40 objets, commun / rare / épique ≈ 55 / 30 / 15 %) : 3 couleurs par héros (Teinte Lagon, Soleil, Rubis ; recolorations
  `recolor` couleur d'origine → nouvelle), 6 skins d'arme (un par arme de départ : Lame Braise, Dague Givre, Poings de Lave, Grimoire Jade,
  Arc Corail, Amulette Aurore), 10 tracés (Étincelle, Lierre, Arc-en-ciel, Étoiles, Bulles, Flammes, Confettis, Encre, Pixels, Notes),
  6 skins complets épiques (`assets/skins/`). Prix : or pour commun / rare, gemmes pour l'épique.
- **Apparence** : `src/game/cosmetics.js` (possédés, équipement par héros : `tint`, `weapon`, `trail`, `skin` ; `look(hero)`),
  `src/ui/looks.js` (lobby et combat), option `recolor` de `art.js` / `sprites.js` (le socle n'est jamais recoloré),
  skin complet en combat = un seul calque (`combat-art.js` → `bakeSkin`, placé d'après le sprite d'origine), tracés dans `hud.js`.
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
  bouton **Crédits**. Pas de réglage de tolérance des gestes (retiré pour de bon : équité, futur Duel).
- Écran Crédits : texte dans `data/credits.json` (`renderCredits`). À tenir à jour avec `CREDITS.md` à chaque nouvelle source.

## Conventions
- **Toutes les valeurs dans `data/*.json`**, jamais en dur dans le code (seule exception : `TUNING` des gestes).
  `src/data.js` charge : grades, characters, enemies, waves, rules, story_mode, voyage, audio, tutorial, credits, weapons, talismans, progression, economy, cosmetics.
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
  story/story.js     déroulé du mode Histoire
  audio/ audio.js  synth.js
  ui/    lobby.js (+ réglages, crédits, résultats)  hud.js (rendu canvas)  combat-hud.js  combat-art.js  anim.js  sprites.js
         art.js  icons.js  assets.js (images + replis)  cutscene.js  story-ui.js  story-art.js
         tutorial-ui.js  tutorial-art.js  voyage-ui.js  weapon-ui.js (cartes Armes / Talisman, XP de fin de partie)
         reward-ui.js (écran « Nouvelle arme / Nouveau talisman / Gemmes »)  shop-ui.js (boutique, coffres, carte Cosmétiques)
         looks.js (apparence des héros)  money.js (or et gemmes)
         organic.css (ne pas modifier)  lobby.css  shop.css  style.css  story.css  tutorial.css  voyage.css
data/    characters grades enemies waves rules story_mode voyage tutorial audio credits weapons talismans progression economy cosmetics (.json)
assets/  portraits/  ennemis/  decors/  icones/armes/  icones/talismans/  icones/monnaies/  boutique/  skins/  audio/sfx/  audio/musique/   (IMAGES.md, audio/SONS.md)
design/  exports Claude Design (voir Direction artistique)
tools/boutique-art/  générateur provisoire des skins épiques (gen.mjs) et de leur planche (planches.mjs → design/planches-boutique/)
prototype/ prototype d'origine
```

## Avant publication
À faire avant chaque commit publié sur `main` :
- Tester dans le navigateur chaque écran ajouté ou modifié, en **390 × 800** et en **360 × 640** : rien ne déborde,
  pas de défilement horizontal, tous les boutons restent visibles et utilisables, aucune erreur dans la console.

## Prochaines tâches (dans cet ordre)
1. **Terminer le son** si besoin : `ui_clic`, `ui_onglet`, `musique_triste`, et une `musique_lobby` plus longue.
2. **Multijoueur (Duel)** : tour par tour, sans serveur temps réel (Firebase ou Supabase : seeds, scores, contrôle de cohérence).
   Vague 1 jouée en même temps (même seed), le meilleur score commence, chaque score durcit la vague de l'adversaire,
   KO avant le boss = défaite, sinon le plus gros score gagne. **Bonus d'armes neutralisés en Duel** : déjà prévu,
   il suffit de marquer le combat `duel: true` (voir « Armes, talismans et récompenses ») ; décider aussi si le Duel rapporte de l'XP d'arme.

Plus tard : achat réel des gemmes (dans l'application), histoire jouable d'Eldan, jeu installable et jouable hors-ligne.
