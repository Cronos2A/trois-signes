# Trois Signes — brief pour Claude Code

## Le projet
Petit jeu mobile à gestes, jouable au doigt, en parties courtes. Solo hors-ligne (PVE) et duel en ligne au tour par tour (PVP).
Pas de graphismes complexes, pas d'histoire lourde : un jeu simple avec une vraie marge de progression.

Référence complète : `docs/Dossier_conception_jeu_mobile.pdf` (version 2).
Prototype jouable actuel : `prototype/trois-signes-prototype.html` (un seul fichier, à lire avant toute chose).

## Les règles du jeu (à respecter)
- **Triangle** = attaquer, **rond** = esquiver, **tap** = ramasser.
- **5 niveaux de réussite** selon la précision du tracé (0 à 100 %) :
  | Niveau | Précision | Multiplicateur |
  |---|---|---|
  | Raté | < 60 % | aucun effet, casse la série |
  | OK | 60-69 % | ×0,4 |
  | Good | 70-79 % | ×0,7 |
  | Very Good | 80-87 % | ×1 |
  | Excellent | 88-94 % | ×1,2 |
  | Perfect | 95 % et + | ×1,5 |
  (Seuils durcis à la demande en septembre 2026 : auparavant 40 / 55 / 68 / 80 / 90.)
- **Combos** : 4 fois de suite le même niveau → le 4e geste est multiplié (OK ×1,5, Good ×1,75, Very Good ×2, Excellent ×2,5, Perfect ×3). Esquive en combo = esquive totale + riposte. La série repart à zéro après un combo, un raté ou un niveau différent.
- **Esquive** : part évitée = min(100 %, 80 % × multiplicateur × combo).
- **6 personnages** (Chevalier, Assassin, Colosse, Sorcier, Ranger, Soigneur), chacun avec son niveau et son XP, gagnés seulement en le jouant.
- **Stuff** : un objet par personnage (dague, épée...), avec son propre niveau. Pas de pay-to-win : tout doit s'obtenir en jouant, bonus plafonné en PVP.
- **PVP tour par tour** : vague 1 jouée en même temps (même seed), le meilleur score commence, chaque score durcit la vague de l'adversaire, KO avant le boss = défaite, sinon le plus gros score gagne.
- **Histoire** : cinématiques en images fixes + texte, un fragment débloqué à chaque boss.

## Passifs et super-attaques (valeurs de départ, à rééquilibrer dans `data/characters.json`)
- Aldric 130 PV / 4, aucun passif. Nyra 80 / 6. Boran 170 / 6, jamais de combo. Mira 180 / 3, soin 4 PV × multiplicateur par attaque réussie, et chaque Perfect invoque un petit monstre (1 dégât/s pendant 10 s, 6 au plus). Kestrel 105 / 4,6, esquive de base 120 %. Ilwen 105 / 4, combo en 3 gestes.
- Jauge : OK +2, Good +3, Very Good +5, Excellent +6, Perfect +8, combo +5, pleine à 100 ; elle ne se recharge pas pendant une super. Bouton rond en bas à droite (l'appui n'est jamais un geste).
- Supers : Rempart (8 s, dégâts reçus −50 %, coup sur tous ×2), Ombre (3 esquives auto, attaque +50 % 8 s), Géant (×1,4 pendant 8 s, coup sur tous ×2,5), Grimoire ouvert (2 attaques traitées en combo), Œil de faucon (8 s de Perfect), Renouveau (PV au max, attaque ×2 10 s).

## Équilibrage actuel (version 2 du prototype)
Héros : voir « Passifs » ci-dessus (Aldric 130 PV, attaque 4). Sbire 20 PV / 6 dégâts, brute 28 PV / 9 dégâts, boss 60 PV / 12 dégâts.
Alerte avant un coup : 1,3 à 1,5 s (raccourcie dans les arènes lointaines du Voyage, jamais sous 0,9 s). Pause d'au moins 1,2 s entre deux coups ennemis. Le Solo n'a plus de chrono : c'est le Voyage, qui dure jusqu'au KO.
Ces valeurs doivent vivre dans des fichiers JSON, jamais en dur dans le code.

## Choix techniques
- **PWA en HTML/JS** (canvas), installable, 100 % hors-ligne en solo (service worker).
- Cible : presque tous les téléphones Android et iPhone, écrans à partir de 360 px de large.
- Reconnaissance des gestes : maison, sans IA ni bibliothèque lourde (rééchantillonnage, Douglas-Peucker pour compter les coins, régularité du rayon pour les ronds). Reprendre celle du prototype.
- Données dans `data/*.json` : personnages, ennemis, vagues, stuff, niveaux de réussite, combos, chapitres d'histoire.
- Sauvegarde locale (localStorage ou IndexedDB), toujours dans un try/catch.
- PVP : Firebase ou Supabase (seeds + scores + contrôle de cohérence). Pas de serveur temps réel.

## Structure cible
```
index.html
manifest.webmanifest
sw.js
src/
  main.js          boucle de jeu, écrans
  input/gestures.js reconnaissance + calcul de précision
  game/grades.js   niveaux de réussite et combos
  game/combat.js   attaque, esquive, ramassage
  game/enemies.js  vagues, IA ennemie, boss
  game/progress.js XP, niveaux, stuff
  game/supers.js   jauge et super-attaques (valeurs dans characters.json)
  game/voyage.js   Le Voyage (Solo infini) : arènes, rounds, gardiens, renforcement, multiplicateur de score
  story/story.js   mode Histoire : déroulé (prologue, ouvertures, combats, fins, fragments, épilogue)
  ui/hud.js        rendu canvas du combat (sprites, anneau d'alerte, tracés, textes de réussite)
  ui/combat-hud.js interface HTML du combat (vie, Quitter, vague / chrono / score, série)
  ui/combat-art.js sprites et décor rastérisés une fois hors écran (fluide sur petit Android)
  ui/anim.js       animations visuelles (attente, attaque, coup reçu, esquive, ennemi vaincu)
  ui/sprites.js    sprites de combat et décor Forêt de Mousse (repris de la maquette combat)
  game/state.js    état partagé de la partie (lu par ui/)
  game/effects.js  textes flottants, effets, vibrations
  ui/lobby.js      lobby 3 onglets (Jouer / Personnage / Boutique) + fenêtre de résultats
  ui/cutscene.js   lecteur unique de cinématiques et dialogues (lettre par lettre, « Passer »)
  ui/story-ui.js   écrans Histoire : choix des 6 histoires, chemin des 10 combats, défaite, fin d'histoire, déblocage d'Eldan
  ui/story-art.js  dessins de la maquette Mode Histoire (paysage de la carte, fragments, silhouette d'Eldan, icônes)
  ui/assets.js     images du mode Histoire (assets/) et replis (neutre, humain, pastille, dégradé)
  ui/story.css     styles du mode Histoire et du lecteur
  ui/voyage-ui.js  écrans du Voyage : transition d'arène (+30 % PV), « Arène découverte » et son coffre
  ui/voyage.css    styles de ces écrans et du HUD du Voyage (nom de l'arène, multiplicateur)
  ui/art.js        dessins low-poly des héros et ennemis (repris de la planche)
  ui/icons.js      signes à facettes, armes, fonds facettés (repris de la maquette lobby)
  ui/organic.css   design system Organic (copie telle quelle, ne pas modifier)
  ui/lobby.css     styles du lobby ; ui/style.css : page, canvas, bouton Quitter
data/
  characters.json enemies.json waves.json grades.json items.json story.json
  rules.json       règles de combat (esquive, ramassage, score, entraînement)
  shop.json        objets affichés dans la boutique (pas encore achetables)
  story_mode.json  tout le texte du mode Histoire (ne pas réécrire : affiché tel quel)
  voyage.json      Le Voyage : 8 arènes (décor, teinte, vagues, gardien), renforcement, score, soin, coffres
assets/            images du mode Histoire (facultatives, le mode est jouable sans ; liste et état dans assets/IMAGES.md) :
  portraits/{id}_{expression}.svg, portraits/{bossId}_ombrace.svg / _humain.svg
  ennemis/{id}.svg (sprite de combat des boss et d'Eldan), decors/{id}.svg
design/            exports Claude Design (référence : planche de personnages, maquette du lobby, écran de combat, portraits du mode Histoire)
```

Étapes 1 et 2 faites (septembre 2026), puis lobby intégré, puis mode Histoire (étape 5). Lancer avec `py -m http.server 8123` (les modules et les JSON ne se chargent pas en `file://`).

## Direction artistique (retenue en septembre 2026)
- Référence : `design/trois-signes-maquette-lobby` et `design/planche-de-personnages-trois-signes`, reproduites telles quelles. Elles remplacent la DA de l'ancien PDF « Bible ».
- Style cartoon low-poly : fond vert vif facetté, contours épais `#15301E`, boutons orange/jaune avec ombre portée, cartes crème, polices Caprasimo (titres) et Figtree (texte) du design system Organic.
- Personnages : ceux de la planche (Aldric le Chevalier, Nyra l'Assassine, Boran le Colosse, Ilwen la Sorcière, Kestrel la Rôdeuse, Mira la Soigneuse). Les 6 sont jouables, chacun avec son XP et son niveau, ses PV / attaque, un passif et une super-attaque (tout dans `data/characters.json` : `passive`, `super`, `superGauge`, couleur `accent`).
- Ce qui n'est pas encore codé (armes, skins, boutique, Duel) est affiché et marqué « Bientôt ». Pas de monnaie premium (gemmes) : pas de pay-to-win.
- Combat : `design/ecran-de-combat-trois-signes` (décor Forêt de Mousse, sprites de ¾ dos pour le héros choisi dans le lobby, sbire / brute / boss, interface restylée). Les animations ne font que transformer les sprites (aucune nouvelle image) et sont déduites de l'état du jeu, sans toucher à la logique. Attaque au corps à corps (Aldric, Nyra, Boran) : ruée + coup d'arme (bras armé en calque séparé) ; à distance (Kestrel flèche, Ilwen et Mira sort) : tir d'un projectile dessiné, sans ruée.
- Les seuils de réussite affichés dans cette maquette (« seuils proposés ») ne sont pas repris : seules les couleurs par palier l'ont été.

## Mode Histoire (septembre 2026)
- Écrans : `design/trois-signes-maquette-lobby/project/Mode Histoire Trois Signes.dc.html` (01 choix, 02 chemin, 03-04 cinématique, 05 fin d'histoire, 06 déblocage d'Eldan), reproduits tels quels.
- Portraits (6 héros × 6 expressions, Eldan, personnages secondaires, 12 boss + Eldan l'Oublié) et sprites de combat des boss : `design/trois-signes-character-sheet`, générés par `project/tools/story-engine.js` (Claude Design). Seul `sbire_ombrace` reste provisoire (tiré de la planche de combat).
- Décors (32, 390 × 844, centre et bas dégagés pour le jeu) : `design/ecran-de-combat-trois-signes`, générés par `project/decors.js` ; utilisés en cinématique et en fond de combat (Histoire et arènes du Voyage). Toutes les images attendues sont présentes (`assets/IMAGES.md`).
- Bouton « Histoire » dans l'onglet Jouer ; 6 histoires de 10 combats (`data/story_mode.json`), carte d'Eldan verrouillée puis « Bientôt disponible » après l'épilogue.
- Héros imposé ; rounds = `vagues` ; sbire/brute = ennemis existants, les autres ids = boss de `ennemis_speciaux` (valeurs par rang). Eldan l'Oublié : Triangle (coup), Rond (garde 2 s, −50 %), Toucher (appelle un sbire).
- Réglages dans `data/rules.json` → `story` (XP de première victoire, pas de limite de temps, noms et couleurs des PNJ, libellés des types, mécanique d'Eldan, vitesse du texte).
- Sauvegarde : `prog.story` (combats gagnés par histoire, scènes vues, fragments, prologue, épilogue).

## Le Voyage (Solo infini, septembre 2026)
- Le bouton Solo lance le Voyage : 8 arènes de 4 rounds (3 vagues puis le gardien), puis « Au-delà du Silence » sans fin (gardien au hasard tous les 4 rounds). Fin au KO.
- Toutes les valeurs dans `data/voyage.json` (renforcement par arène et par round, multiplicateur de score, 3 ennemis au plus, +30 % PV entre deux arènes). `data/waves.json` ne sert plus que pour les délais communs (pause entre deux coups, première attaque).
- Gardiens et décors repris du mode Histoire (`assets/`) ; si une image manque : sprite du boss du Solo, fond à la teinte de l'arène avec son nom en grand. La Forêt de Mousse garde le décor du Solo.
- Sauvegarde : `prog.best` (record), `prog.voyage` (arène la plus lointaine, arènes découvertes). Coffres de cosmétiques : emplacement et message seulement.

## Ordre de travail
1. Découper le prototype dans cette structure, sans changer le ressenti de jeu.
2. Passer tous les chiffres dans `data/*.json`.
3. Ajouter les 6 personnages et leur progression, avec un écran de sélection.
4. Ajouter le stuff et ses niveaux.
5. Ajouter l'histoire (intro + fragments après chaque boss).
6. Rendre le jeu installable (manifest + service worker) et tester hors-ligne.
7. PVP tour par tour en dernier.

## Conventions
- Textes du jeu en français.
- Chaque étape doit rester jouable sur téléphone : tester en 390 × 800 et en 360 × 640.
- Ne jamais rendre les gestes plus exigeants sans le demander : le premier test a montré que les seuils trop hauts rendaient le jeu injouable.
- L'interface (menus, personnages, monstres) pourra venir de maquettes Claude Design : garder le rendu séparé de la logique pour les intégrer facilement.
