# À faire — audit complet du 29/09/2026 (avant la traduction)

Audit mené dans le navigateur de test (Chromium), en 390 × 800 et 360 × 640, sur l'émulateur Firebase et par relecture du code.
Parcours joués par des bots : premier lancement (prologue, leçon, pseudo), Entraînement, un Voyage complet (8 arènes puis
Au-delà du Silence), les **6 histoires en entier** (60 combats), des Duels entre amis et au hasard, tous les écrans du lobby,
la boutique, les coffres, les Réglages, les Crédits et les classements. **Rien n'a été corrigé** : ce fichier est la liste de travail.

Légende : 🔴 bug bloquant · 🟠 bug gênant · 🟢 amélioration souhaitable (avis de game design).

---

## 🔴 Bugs bloquants (empêchent de jouer ou de progresser)

### B1. Une sauvegarde abîmée bloque le lancement du jeu
Le jeu ne démarre plus du tout (écran figé, erreur dans la console) si la sauvegarde locale `ts_prog` est incomplète ou abîmée.
- Reproduire : dans la console du navigateur, `localStorage.setItem('ts_prog', 'null')` (ou `'42'`, ou `'{"armory":{}}'`),
  puis recharger. Erreurs : « Cannot read properties of null (reading 'chars') », « Cannot read properties of undefined (reading 'aldric') ».
- Variante non bloquante : `story.done` qui n'est pas une liste → erreur « includes is not a function » au lancement, le lobby s'affiche quand même.
- Cause : `ensureDefaults()` (`src/game/progress.js`) ne complète que les blocs absents, pas ceux de mauvais type ni les sous-champs manquants
  (`armory.equipped`, `armory.talisman`…). Une sauvegarde reçue du serveur passe par le même chemin.
- Rare (coupure pendant une écriture, sauvegarde d'une vieille version), mais sans issue pour le joueur : il faut une remise à zéro sûre.

---

## 🟠 Bugs gênants (ça marche, mais mal)

### G1. Le bouton Duel recouvre le haut du lobby : Réglages et « + » des gemmes inaccessibles depuis l'onglet Jouer
**Le plus visible de l'audit.** Sur l'onglet Jouer, la carte Duel s'affiche tout en haut de l'écran, par-dessus l'avatar, l'or, les gemmes
et l'engrenage, et mord sur la carte du Voyage (le titre « SOLO · LE VOYAGE » est coupé).
- Reproduire : ouvrir le jeu, onglet Jouer, toucher l'engrenage → c'est le menu du Duel qui s'ouvre, pas les Réglages. Idem pour le « + » des gemmes.
  Les Réglages restent accessibles en passant par l'onglet Personnage ou Boutique. La carte recouvre aussi le haut de l'écran de résultats du Voyage.
- Cause : la classe CSS `.duel` du calque des écrans du Duel (`src/ui/duel.css`, `position: fixed`) s'applique aussi au bouton du lobby
  (`class="mode-btn duel"`). Depuis l'étape 2 du multijoueur.

### G2. Duel : après une coupure de plus de 30 s, les deux joueurs voient « Victoire ! »
- Reproduire : Duel (ami ou hasard), couper le réseau d'un joueur (B) pendant 45 s en pleine vague, le rétablir.
  A voit « Victoire ! Bravo s'est déconnecté plus de 30 s » (juste) ; **B voit aussi « Victoire ! Alpha s'est déconnecté plus de 30 s »**.
- En Duel au hasard, l'écran de B annonce « +30 Empreintes », alors que le serveur (qui a raison) lui retire 20. Le compteur se corrige
  à la connexion suivante, mais le joueur voit une victoire qui n'existe pas.
- Cause : `src/game/duel.js` compare l'heure de signe de vie des deux joueurs telle qu'estimée par l'appareil ; hors connexion, la sienne
  avance et celle de l'adversaire est figée. Il faut ignorer les données du cache local et comparer avec l'heure du serveur.
- Même famille : un joueur qui revient après avoir été déclaré déconnecté continue de jouer seul, puis finit aussi par « gagner » à l'écran.

### G3. Quitter pendant la fin de la 6e histoire ou pendant l'épilogue : épilogue perdu, Eldan reste « ??? »
- Reproduire : avoir 5 histoires finies ; gagner le combat 10 de la 6e ; fermer le jeu pendant la cinématique de fin ou l'épilogue ;
  rouvrir → choix des histoires « 6 / 6 », mais la carte d'Eldan reste « ??? Termine les six histoires », et l'épilogue ne se relance jamais.
- Il ne revient qu'en rejouant un combat 10, ce que rien n'indique. Même risque plus tôt : fermer pendant la cinématique de fin d'une histoire
  avant le fragment → histoire à 10 / 10 sans son fragment.
- À faire : proposer l'épilogue (et le fragment) à l'ouverture du mode Histoire dès que les conditions sont remplies.

### G4. Le bouton Retour du téléphone quitte le jeu, à tout moment
- Aucun écran ne gère le retour arrière (pas d'historique ni de `popstate`). Dans le navigateur, « Retour » en plein combat, dans la boutique
  ou pendant un dialogue quitte la page. Dans l'application Android (Capacitor), il fermera le jeu.
- À faire avant le Play Store : Retour = fermer la fenêtre ouverte / revenir au lobby / confirmer « Quitter la partie ? ».

### G5. Téléphone mis en veille pendant un Duel = défaite sans prévenir
- Écran verrouillé ou appli en arrière-plan plus de 30 s → plus de signe de vie → défaite (et −20 au hasard). C'est la règle voulue,
  mais le joueur n'est pas prévenu : au minimum un message au retour (« Tu as été déconnecté plus de 30 s »).

### G6. Filtre « Skins » invisible dans la boutique
- Onglet Boutique → Cosmétiques : la rangée « Tout, Armes, Couleurs, Tracés, Skins » dépasse l'écran en 360 et en 390 ; « Skins » est
  caché à droite, la rangée défile mais sans indice visuel (barre de défilement masquée). Les skins complets (300 gemmes, les objets les plus
  chers) sont donc difficiles à trouver.

### G7. Textes : « de » devant une voyelle ou un article
- « Histoire de Aldric terminée », « Histoire de Ilwen terminée » (écran de gemmes) → « d'Aldric », « d'Ilwen ».
- « Gardien de Le Cœur du Silence battu », « Gardien de École des Signes », « Gardien de Bibliothèque d'Aubelle »
  (modèle `economy.json → ui.gemsFor.guardian`) → « du Cœur du Silence », « de l'École… », « de la Bibliothèque… ».
- Duel : « Pression de Alpha », « En attente de Alpha » (pseudos commençant par une voyelle). Formulations à revoir (« Pression : Alpha +18 % »),
  d'autant plus avant la traduction.

### G8. Pseudo : accents saisis en deux caractères refusés ; pas d'unicité
- « école » tapé avec un accent combinant (e + ◌́, fréquent sur certains claviers) est refusé : normaliser en NFC avant la vérification.
- Accepté alors que discutable : « Admin », un pseudo déjà pris par un autre joueur (deux « Alpha » au classement).
- Vérifié correct : vide, espaces, < 3 caractères, trop long (coupé à 16), emojis, `<b>`, caractères invisibles, gros mots (« M3rde ») refusés ;
  grec et chinois acceptés.

### G9. Fin de Voyage : les gemmes des gardiens s'affichent une par une
- Un Voyage qui bat 8 gardiens pour la première fois ouvre 8 fenêtres « +10 gemmes » d'affilée par-dessus l'écran de résultats,
  qui cachent l'animation de l'XP de l'arme (elle dure ~9 s quand l'arme prend plusieurs niveaux). Les regrouper en une seule fenêtre.

### G10. Écran à l'horizontale
- Pas de verrouillage en portrait (pas encore de manifeste). En paysage, le combat reste jouable mais l'interface occupe toute la hauteur
  et les ennemis sont écrasés contre le haut. À régler avec le manifeste / Capacitor (portrait imposé).

### G11. Petits défauts
- Réglages en mode test : le bouton « Passer les 10 min » dépasse de l'écran (visible seulement en développement).
- Record du Voyage fait sans connexion au début de la partie : jamais classé (voulu par la sécurité), sans message pour le joueur.
- Son : `ui_clic`, `ui_onglet`, `musique_triste` toujours absents (sons provisoires synthétisés) ; `musique_lobby` boucle toutes les 19 s.
- Le « Coffre » de l'écran « Arène découverte » du Voyage n'est qu'un emplacement (message) : un coffre vide déçoit.

---

## 🟢 Améliorations souhaitables (avis de game design)

### Accueil du nouveau joueur, au-delà de la leçon
- La leçon apprend les trois signes, mais rien n'explique ensuite : armes alternatives et leur style, talismans, niveaux d'arme,
  Empreintes et arènes, **pression du Duel** (on découvre « Pression de X : +18 % » sans savoir ce que c'est), différence Duel au hasard / ami.
  Idée : une bulle d'aide à la première rencontre de chaque système (une seule fois), et un « ? » sur les cartes Armes / Talisman / Duel.
- Le Voyage est le premier bouton, mais le mode Histoire guide mieux ; proposer « Commence par l'histoire d'Aldric » après la leçon.

### Rythme de progression (le plus important)
- **Niveau des héros beaucoup trop lent** : une histoire entière (10 combats) = niveau 3. Le niveau 100 demande ~133 000 XP, soit
  ~13 000 rounds du Voyage. Les bonus (+49,5 % au niveau 100) resteront théoriques.
- **Niveau des armes trop rapide en comparaison** : un bon joueur monte l'Épée au niveau 9 en un seul Voyage de 7 minutes (3 543 XP ;
  niveau 10 à 3 745). Les deux progressions sont inversées : à rééquilibrer ensemble (courbe d'XP des héros plus douce, armes plus longues).
- **Or très lent** : 2 or par pièce, 5 par arène, alors qu'un cosmétique commun coûte 500 et un rare 1 200. Un Voyage de 8 arènes
  sans ramasser de pièces rapporte 70 or. Ramasser demande de toucher pendant les combats, en concurrence avec les gestes.
  Suggestion : bonus d'or par arène plus fort, ou or selon le score.
- Mode Histoire : les combats 1 et 2 (un sbire par vague) sont très faciles et courts ; bien pour démarrer, mais le combat 3 pourrait
  déjà mêler une brute.

### Équilibrage
- Mesures (bot « humain » : un geste toutes les 0,7 s, précision 62 à 99 %, 80 % des esquives tentées, niveau 1, arme de départ,
  une partie par héros, donc à confirmer sur plusieurs parties) — rounds tenus dans le Voyage :
  Mira 35 rounds et **toujours en vie** à l'arrêt du test (15 min) ≫ Boran 28 ≈ Nyra 25 > Aldric 19 ≈ Kestrel 18 > Ilwen 14.
  - **Mira** ne meurt presque jamais (180 PV + soin à chaque attaque + petits monstres) : trop forte en survie.
  - **Ilwen** est la plus fragile en pratique (105 PV, 4 d'attaque) malgré son combo en 3 gestes.
  - **Nyra** (80 PV) tient mieux qu'Aldric (130 PV) : son attaque de 6 tue plus vite, donc moins de coups reçus. Aldric, « la référence »,
    n'a aucun avantage : lui donner un petit passif.
- **Esquive Perfect = 100 % évité** (80 % × 1,5, plafonné) : un joueur très précis ne prend jamais de dégâts (le bot parfait a traversé
  8 arènes à 130 PV sur 130). **Kestrel** (base 120 %) évite déjà 100 % dès « Very Good ». Proposer un plafond à 90–95 %, ou une petite
  part de dégâts toujours reçue, sinon le Voyage n'a pas de fin pour les meilleurs.
- Duel : bonus de niveau neutralisés (vérifié : niveau 100 + arme niveau 10 = mêmes chiffres qu'un débutant, style à 100 % pour tous),
  mais les **talismans** (Plume de vent : jauge à 20 % au départ, Craie ancienne : un raté pardonné par round) et les **armes alternatives**
  (histoires finies) avantagent les anciens joueurs face aux nouveaux au même nombre d'Empreintes. À surveiller, ou talismans désactivés
  en Duel au hasard.
- Rappel des mesures d'équilibre du 28/09 : Arbalète +12 à 17 % de score, à surveiller.

### Duel
- **Attente** : un joueur qui a fini sa vague peut attendre jusqu'à 90 s l'autre (qui peut même ne faire qu'esquiver pour gagner du temps).
  Suggestion : limite de 60 s, et pendant l'attente une vue de la partie de l'adversaire (ses coups, son score qui monte).
- **Pression** : bonne idée mais invisible en combat ; afficher « +18 % » à côté de la vague dans l'interface pendant la vague.
- Pas de revanche : ajouter « Rejouer contre lui » en fin de Duel entre amis.

### Retours visuels et sonores
- Les sons manquants (clic, onglet) rendent les menus muets ; la musique du lobby tourne trop court.
- Fin de partie du Voyage : beaucoup d'informations d'un coup (niveaux de réussite, XP, arme, or, pub, gemmes…) ; un ordre en deux temps
  (score et record d'abord, récompenses ensuite) serait plus lisible.
- Aucun retour haptique n'a été vérifié ici (réglage Vibrations présent) : à tester sur téléphone.

### Histoire et textes
- Relecture automatique des textes (`data/*.json`) : pas de faute de ponctuation relevée ; les apostrophes sont droites (') partout,
  c'est cohérent. Tous les personnages qui parlent ont un portrait.
- Les écrans « Histoire de … terminée » et « Gardien de … battu » : voir G7.
- L'épilogue débloque Eldan « Bientôt disponible » : bien, mais l'écran de fin pourrait annoncer clairement « Histoire d'Eldan : bientôt ».

---

## Ce qui a été vérifié et fonctionne
- Premier lancement : prologue → leçon (5 étapes, main « Suis la main », « Passer ») → pseudo obligatoire.
- Entraînement : messages justes pour chaque geste (Perfect, OK, raté, geste non reconnu, tap dans le vide).
- Voyage complet : 8 arènes, transitions, gardiens et 8 talismans, variantes des ennemis dans le bon ordre
  (petit arènes 1-2, moyen 3-4, grand 5-6, costaud 7-8 et Au-delà), gardien tiré au sort Au-delà, écran de fin, record, gemmes au serveur.
- Les **6 histoires en entier** : 60 combats gagnés, cinématiques, armes débloquées aux combats 5 et 10, fragments, +30 gemmes par histoire,
  variantes dans le bon ordre (petit 1-3, moyen 4-6, grand 7-8, costaud 9-10), boss (dont Eldan l'Oublié) ; aucune erreur.
- Taps en rafale : double tap sur un coffre (un seul coffre payé), double confirmation d'achat, 10 taps sur Solo, 8 sur Rejouer,
  quitter / relancer 5 fois, 40 changements d'onglet : rien de cassé.
- Solde énorme (123 456 789 or) : affichage correct. Solde négatif ou illisible : pas de plantage.
- Duel : coupure de 10 s puis retour → la partie continue normalement ; niveaux et armes neutralisés ; sécurité (voir CLAUDE.md, étape 5).
- Écrans du lobby, boutique, coffres, probabilités, Réglages, Crédits, classements : pas d'erreur dans la console, pas de défilement horizontal
  (hors G1, G6 et G11).
