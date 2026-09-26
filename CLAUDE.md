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
  | Raté | < 40 % | aucun effet, casse la série |
  | OK | 40-54 % | ×0,4 |
  | Good | 55-67 % | ×0,7 |
  | Very Good | 68-79 % | ×1 |
  | Excellent | 80-89 % | ×1,2 |
  | Perfect | 90 % et + | ×1,5 |
- **Combos** : 4 fois de suite le même niveau → le 4e geste est multiplié (OK ×1,5, Good ×1,75, Very Good ×2, Excellent ×2,5, Perfect ×3). Esquive en combo = esquive totale + riposte. La série repart à zéro après un combo, un raté ou un niveau différent.
- **Esquive** : part évitée = min(100 %, 80 % × multiplicateur × combo).
- **6 personnages** (Chevalier, Assassin, Colosse, Sorcier, Ranger, Soigneur), chacun avec son niveau et son XP, gagnés seulement en le jouant.
- **Stuff** : un objet par personnage (dague, épée...), avec son propre niveau. Pas de pay-to-win : tout doit s'obtenir en jouant, bonus plafonné en PVP.
- **PVP tour par tour** : vague 1 jouée en même temps (même seed), le meilleur score commence, chaque score durcit la vague de l'adversaire, KO avant le boss = défaite, sinon le plus gros score gagne.
- **Histoire** : cinématiques en images fixes + texte, un fragment débloqué à chaque boss.

## Équilibrage actuel (version 2 du prototype)
Héros 150 PV, attaque de base 6. Sbire 10 PV / 6 dégâts, brute 18 PV / 9 dégâts, boss 50 PV / 12 dégâts.
Alerte avant un coup : 1,3 à 1,5 s. Pause d'au moins 1,2 s entre deux coups ennemis. Partie de 120 s.
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
  story/story.js   cinématiques
  ui/hud.js        rendu canvas du combat (sprites, anneau d'alerte, tracés, textes de réussite)
  ui/combat-hud.js interface HTML du combat (vie, Quitter, vague / chrono / score, série)
  ui/combat-art.js sprites et décor rastérisés une fois hors écran (fluide sur petit Android)
  ui/anim.js       animations visuelles (attente, attaque, coup reçu, esquive, ennemi vaincu)
  ui/sprites.js    sprites de combat et décor Forêt de Mousse (repris de la maquette combat)
  game/state.js    état partagé de la partie (lu par ui/)
  game/effects.js  textes flottants, effets, vibrations
  ui/lobby.js      lobby 3 onglets (Jouer / Personnage / Boutique) + fenêtre de résultats
  ui/art.js        dessins low-poly des héros et ennemis (repris de la planche)
  ui/icons.js      signes à facettes, armes, fonds facettés (repris de la maquette lobby)
  ui/organic.css   design system Organic (copie telle quelle, ne pas modifier)
  ui/lobby.css     styles du lobby ; ui/style.css : page, canvas, bouton Quitter
data/
  characters.json enemies.json waves.json grades.json items.json story.json
  rules.json       règles de combat (esquive, ramassage, score, entraînement)
  shop.json        objets affichés dans la boutique (pas encore achetables)
design/            exports Claude Design (référence : planche de personnages, maquette du lobby, écran de combat)
```

Étapes 1 et 2 faites (septembre 2026), puis lobby intégré. Lancer avec `py -m http.server 8123` (les modules et les JSON ne se chargent pas en `file://`).

## Direction artistique (retenue en septembre 2026)
- Référence : `design/trois-signes-maquette-lobby` et `design/planche-de-personnages-trois-signes`, reproduites telles quelles. Elles remplacent la DA de l'ancien PDF « Bible ».
- Style cartoon low-poly : fond vert vif facetté, contours épais `#15301E`, boutons orange/jaune avec ombre portée, cartes crème, polices Caprasimo (titres) et Figtree (texte) du design system Organic.
- Personnages : ceux de la planche (Aldric le Chevalier, Nyra l'Assassine, Boran le Colosse, Ilwen la Sorcière, Kestrel la Rôdeuse, Mira la Soigneuse). Seul Aldric est jouable pour l'instant.
- Ce qui n'est pas encore codé (autres héros, armes, skins, boutique, Duel) est affiché et marqué « Bientôt ». Pas de monnaie premium (gemmes) : pas de pay-to-win.
- Combat : `design/ecran-de-combat-trois-signes` (décor Forêt de Mousse, sprites de ¾ dos pour le héros choisi dans le lobby, sbire / brute / boss, interface restylée). Les animations ne font que transformer les sprites (aucune nouvelle image) et sont déduites de l'état du jeu, sans toucher à la logique.
- Les seuils de réussite affichés dans cette maquette (« seuils proposés ») ne sont pas repris : seules les couleurs par palier l'ont été.

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
