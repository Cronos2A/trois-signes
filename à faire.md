# À faire — audit complet du 29/09/2026 (avant la traduction)

Audit mené dans le navigateur de test (Chromium), en 390 × 800 et 360 × 640, sur l'émulateur Firebase et par relecture du code.
Parcours joués par des bots : premier lancement (prologue, leçon, pseudo), Entraînement, un Voyage complet (8 arènes puis
Au-delà du Silence), les **6 histoires en entier** (60 combats), des Duels entre amis et au hasard, tous les écrans du lobby,
la boutique, les coffres, les Réglages, les Crédits et les classements.

**Corrections du 29/09/2026** : B1 et G1 à G10 sont corrigés (voir « Corrigé » en bas), chacun vérifié par les mêmes bots.
Restent ouverts : ce qui n'est pas marqué corrigé ci-dessous (G7 en partie, G8 en partie, G11, et toutes les améliorations 🟢).

Légende : 🔴 bug bloquant · 🟠 bug gênant · 🟢 amélioration souhaitable (avis de game design).

---

## 🟠 Encore ouverts

### G7 (suite). Formulation des textes du Duel
- Les élisions sont corrigées (« Pression d'Alpha », « En attente d'Alpha »). Reste la formulation, à revoir avant la traduction
  (par exemple « Pression : Alpha +18 % »), pour ne pas dépendre de la grammaire du français.

### G8 (suite). Pseudo : pas d'unicité
- Accepté alors que discutable : « Admin », un pseudo déjà pris par un autre joueur (deux « Alpha » au classement).
  L'unicité demande un registre des pseudos au serveur (collection réservée par les règles) : à décider.

### G11. Petits défauts
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
  (hors G11).

---

## Corrigé le 29/09/2026 (vérifié par les bots)
- **B1. Sauvegarde abîmée** : le jeu démarre toujours. Sauvegarde illisible ou de mauvaise forme (`src/game/save-check.js`) → écran
  « Sauvegarde endommagée » : récupérer la sauvegarde en ligne si elle existe (cherchée 15 s, « Chercher à nouveau »), ou repartir de zéro
  (avec confirmation). Rien n'est écrit ni envoyé avant ce choix ; l'ancienne est gardée dans `ts_prog_damaged`. Une sauvegarde
  seulement incomplète (vieille version) est complétée sans rien demander. Une sauvegarde du serveur abîmée est ignorée.
- **G1. Bouton Duel** : le calque des écrans du Duel s'appelle maintenant `.du-layer` ; engrenage et « + » des gemmes à nouveau touchables.
- **G2 et G5. Duel, coupure et veille** : l'état de l'adversaire n'est jugé que sur des données confirmées par le serveur (jamais le cache
  local). Le joueur coupé plus de 30 s (réseau ou téléphone en veille) voit « Défaite · Tu as été déconnecté plus de 30 s » (et −20 au hasard,
  comme le serveur) ; l'autre voit sa victoire. Coupure ou veille de moins de 30 s : la partie continue.
- **G3. Fin d'histoire et épilogue** : fragment, histoire terminée et épilogue sont enregistrés dès la victoire du combat 10, avant les scènes
  (`story.endings`, `story.epiloguePending`). Scène interrompue → rejouée à la prochaine ouverture du mode Histoire, une seule fois,
  puis déblocage d'Eldan. Les sauvegardes déjà touchées (6 fragments sans épilogue) sont réparées de la même façon.
- **G4. Bouton Retour** (`src/ui/back.js`) : en partie (combat, Duel, Entraînement, leçon), « Quitter la partie ? » avec le jeu en pause
  (Duel : « Quitter le Duel compte comme une défaite ») ; cinématique : passée ; menus : la fenêtre du dessus se ferme, sinon retour à
  l'onglet Jouer ; sur l'onglet Jouer, Retour quitte le jeu.
- **G6. Filtre Skins** : les filtres passent à la ligne au lieu de défiler ; les cinq sont visibles (en 360, « Skins » sur une 2e ligne).
- **G7. Élisions** : « Histoire d'Aldric », « Gardien du Cœur du Silence », « de la Bibliothèque d'Aubelle », « de l'École des Signes »,
  « des Hautes-Gerbes », « Pression d'Alpha », « En attente d'Alpha » (`deName` dans `src/util.js`, champ `de` des arènes de `voyage.json`).
- **G8. Pseudo** : les accents tapés en deux caractères sont acceptés (normalisation NFC) ; les autres règles n'ont pas changé.
- **G9. Gemmes** : plusieurs gains à la fois (fin de Voyage, lancement) → un seul écran récapitulatif, une ligne par gain et le total.
- **G10. Portrait** : manifeste `manifest.webmanifest` (`orientation: portrait`), tentative de verrouillage, et sur un téléphone tourné
  en paysage un écran « Tourne ton téléphone » ; la partie est en pause pendant ce temps, sauf en Duel.

## Corrigé le 30/09/2026 (vérifié par les bots)
- **Talismans** : plusieurs talismans reçus d'un coup → un seul écran « Nouveaux talismans », une ligne par talisman (icône, nom, effet ;
  la liste défile si besoin), une seule fermeture. Précision : dans un Voyage, chaque talisman est déjà montré dans le coffre de l'écran
  « Arène découverte » ; l'enchaînement de fenêtres venait des talismans reçus en bloc (lancement avec une ancienne sauvegarde).
- **« Passer les 10 min »** (Réglages, mode test) : ne dépasse plus (les rangées de boutons passent à la ligne depuis la correction G6).
- **Record du Voyage fait hors connexion** : au retour du réseau (et hors partie), le jeu note un nouveau départ au serveur, attend la durée
  minimale que les règles demandent pour ce score (quelques secondes à environ 1 min), envoie le record, puis affiche
  « Record synchronisé : 19 918 au classement du Voyage ». Même garantie qu'avant côté sécurité (le score doit rester possible
  pour la durée écoulée) ; aucune règle Firestore modifiée.
