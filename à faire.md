# À faire — audit complet du 29/09/2026 (avant la traduction)

Audit mené dans le navigateur de test (Chromium), en 390 × 800 et 360 × 640, sur l'émulateur Firebase et par relecture du code.
Parcours joués par des bots : premier lancement (prologue, leçon, pseudo), Entraînement, un Voyage complet (8 arènes puis
Au-delà du Silence), les **6 histoires en entier** (60 combats), des Duels entre amis et au hasard, tous les écrans du lobby,
la boutique, les coffres, les Réglages, les Crédits et les classements.

**Corrections du 29/09/2026** : B1 et G1 à G10 sont corrigés (voir « Corrigé » en bas), chacun vérifié par les mêmes bots.
Restent ouverts : ce qui n'est pas marqué corrigé ci-dessous (G7 en partie, G8 en partie, G11, et toutes les améliorations 🟢).

Légende : 🔴 bug bloquant · 🟠 bug gênant · 🟢 amélioration souhaitable (avis de game design).

---

## 🔵 XP des armes (05/10/2026)
- Fait : nouvelle courbe (`data/weapons.json → levels`, `gainMult` 0,5) et conversion des sauvegardes (niveau gardé). Mesures et tableau : `CLAUDE.md`
  (Armes → « Courbe du 05/10/2026 »).
- À surveiller au test fermé : l'écart entre héros (Boran ≈ 24 Voyages pour le niveau 10, Kestrel ≈ 14) vient des gains par geste (Perfect, combos,
  supers) ; les bots jouaient avec un héros invincible pour finir les 8 arènes, un vrai joueur moyen tombe souvent avant : il lui faudra plus de parties.

## 🔵 Écran de chargement (05/10/2026)
- Fait (`data/chargement.json`, détails dans `CLAUDE.md`). **À vérifier sur le téléphone** : passage de l'écran natif à l'écran du jeu sans saut
  (testé seulement dans Chromium ; sur Android 7 à 11, l'image native plein écran est recadrée et le logo peut y être un peu plus petit).
- Si l'icône définitive remplace `assets/icone-app/icone.svg`, recopier son calque « logo » dans `index.html` (`#loading`).

## 🔵 Fond du lobby selon l'arène de Duel (05/10/2026)
- **Règles Firestore du 05/10 à publier dans la console** (`ranked/{uid}.areneMaxDuel`). D'ici là, le jeu envoie les résultats sans ce champ
  (les Empreintes comptent, la plus haute arène ne vit que dans la sauvegarde).
- Les joueurs qui avaient déjà des Empreintes avant : leur plus haute arène part de l'arène de leurs Empreintes actuelles (au serveur) ou de la
  plus haute arène déjà annoncée sur l'appareil (`unlocked`) ; un passage plus haut puis une redescente d'avant le 05/10 n'est pas connu du serveur.
- Les boutons « pilule » vert foncé (Revoir la leçon, Entraînement, monnaies) se détachent moins sur les fonds sombres (Toits de Vélis, Aubelle) :
  leur texte reste lisible (il est sur leur propre fond) ; à regarder sur téléphone.

## 🔵 Préparation à la publication, premier lot (01/10/2026)
- Fait : polices embarquées, zones tactiles (48 px, 8 px), compte Google (lier, se connecter, choisir entre deux progressions), suppression du
  compte (+ `legal/supprimer-mon-compte.html`), signaler un pseudo, fausses pubs limitées au développement, version et crédits. Détails : `CLAUDE.md`,
  état d'ensemble : `AVANT_PUBLICATION.md`.
- **À faire de ton côté** : publier les nouvelles règles (`firestore.rules` : `closed`, `reports`, suppressions) ; activer Google dans Authentication
  et ajouter le domaine du site (AVANT_PUBLICATION.md → E3). Adresse de contact en place le 02/10 : cronos2a.jeux@gmail.com (`data/version.json`,
  `legal/supprimer-mon-compte.html`).
- **Pas testé ici** : la fenêtre Google du web (`apis.google.com` est bloqué dans l'environnement de test ; tout le reste du déroulé a été vérifié sur
  l'émulateur avec un jeton simulé) ; l'extension Google d'Android (pas encore installée). À essayer sur le site publié puis sur un téléphone.
- Salons de Duel joués : ils gardent le pseudo et les scores après une suppression de compte, jusqu'au ménage des salons (toujours à faire).
- Fusionner les gemmes de deux comptes en cas de conflit, possible avec une fonction serveur une fois l'offre Blaze activée.

## 🔵 Quitter une partie (03/10/2026) — règles à trancher
- Voyage abandonné : l'or et les gemmes des rounds terminés sont gardés, mais le héros et l'arme ne gagnent **aucune XP** (12 XP par round
  terminé perdus) et le score ne compte pas pour le record. À décider : garder l'XP des rounds terminés, comme l'or ?
- Combat d'Histoire abandonné : l'or des rounds terminés est gardé (versé round par round) ; l'XP d'arme gagnée pendant le combat est perdue.
- Activer un boost (écran Récompenses, proposition au lancement) se fait sans confirmation : voulu (c'est l'action demandée), à surveiller.

## 🔵 Duel sans sortie et séquences de fin (03/10/2026)
- **Règles Firestore du 03/10 à publier dans la console** (absence de 30 s, entrée figée, match annulé, champ `hp`). Sans elles : le champ `hp`
  des signes de vie est refusé par les anciennes règles (les signes de vie échouent : la reprise et l'absence ne marchent pas).
- Aucune valeur de « 40 s » trouvée dans le code ni les règles : la seule durée d'absence était `disconnectSeconds` (30 s), remplacée par
  `absence_max_s`. Si un 40 s a été vu en jeu, c'est le délai réel : la défaite arrive au signe de vie suivant (toutes les 5 s) après les 30 s.
- Reprise après fermeture : la vague en cours repart avec des ennemis neufs (son temps restant est gardé) ; le score de la vague depuis le dernier
  signe de vie (5 s au plus) peut être perdu si l'application est tuée sans passer en arrière-plan. À observer au test fermé.
- Les deux joueurs coupés du réseau en même temps : chacun voit « Tu as été déconnecté » sur l'appareil, alors que le serveur annule le match
  (0 Empreinte) ; l'affichage des Empreintes se corrige à la connexion suivante. Rare.
- Le compte à rebours de l'adversaire absent ne se rafraîchit pas dans le bandeau pendant l'annonce de pression (2 s) ; il est sur l'écran d'attente.
- Fiche du Duel « Match annulé » en anglais, 360 × 640 : le bouton « Back to the lobby » est sous le pli (la carte défile).
- Pas testé sur un vrai téléphone : vibration de l'explosion, vraie fermeture de l'application Android, verrouillage réel de l'écran
  (simulés : page cachée puis gelée). À essayer avec deux téléphones.

## 🔵 Récompenses de connexion (30/09/2026) — à surveiller
- **Règles publiées le 01/10/2026** (`firestore.rules` : collection `daily/{uid}` et gemmes du jour dans `wallet/{uid}`), confirmé par toi,
  et vérifiées le jour même sur le vrai serveur (récupération acceptée, 2e récupération, jour truqué, série et gemmes gonflées refusés).
- Or, boosts et cosmétiques reçus vivent dans la sauvegarde (comme l'or des parties) : avec deux appareils sur le même compte, la sauvegarde
  la plus récente l'emporte (règle déjà en place pour tout le jeu). Le serveur empêche seulement de récupérer deux fois le même jour.
- Rythme à observer au test fermé, pour 30 jours de suite (hors pubs) : ~4 800 or (2 650 du calendrier + ~2 150 de la série),
  4 boosts du calendrier + jusqu'à 8 de la série, 4 cosmétiques (3 tirages + le coffre du 30e jour), 60 gemmes (+ 15 par série complète),
  à comparer aux prix de la boutique (commun 400 à 550, rare 1 200 à 1 500) ; boost or ×2 à 300 or : rentable dès ~150 or gagnés par partie.
- Le Duel ne consomme ni ne profite des boosts : vérifier au test fermé que la proposition « Activer un boost ? » ne gêne pas
  (elle revient à chaque partie tant qu'il y a du stock et aucun boost actif du type).

## 🟠 Encore ouverts

### G8 (suite). Pseudo : pas d'unicité
- **Corrigé le 30/09** : pseudos réservés refusés (admin, modo, support, staff, trois signes, cronos2a… en 5 langues).
- Reste accepté : un pseudo déjà pris par un autre joueur (deux « Alpha » au classement).
  L'unicité demande un registre des pseudos au serveur (collection réservée par les règles) : à décider.

### G11. Petits défauts
- Son : `ui_clic`, `ui_onglet`, `musique_triste` toujours absents (sons provisoires synthétisés) ; `musique_lobby` boucle toutes les 19 s.
- Le « Coffre » de l'écran « Arène découverte » du Voyage n'est qu'un emplacement (message) : un coffre vide déçoit.

---

## 🟢 Améliorations souhaitables (avis de game design)

### Accueil du nouveau joueur, au-delà de la leçon
- La leçon apprend les trois signes, mais rien n'explique ensuite : armes alternatives et leur style, talismans, niveaux d'arme,
  Empreintes et arènes, **pression du Duel**, différence Duel au hasard / ami. **Fait le 30/09** : explication à la première rencontre
  (armes, talismans, Empreintes, Duel) ; reste un « ? » sur les cartes Armes / Talisman / Duel.
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
- **Attente** : **fait le 30/09** (45 s au plus, score en direct et temps restant). Reste l'idée d'une vue de la partie de l'adversaire.
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

## Fait le 30/09/2026 (points 3, 5 à 8 de la demande d'équilibrage)
- **Esquive** plafonnée à 90 % pour tous (Kestrel comprise) ; Ombre de Nyra limitée à 3 esquives totales, répit de la Seconde chance à 1,5 s.
- **Duel** : vague de 45 s au plus ; attente avec score de l'adversaire et « Fin de sa vague dans X s au plus » ; « Pression : X +18 % »
  avant la vague et dans le bandeau pendant la vague.
- **Explications** à la première rencontre : armes, talismans, Empreintes, Duel.
- **Coffre « Arène découverte »** : talisman déjà possédé → 50 or à la place (il pouvait s'afficher sans rien avec une ancienne sauvegarde).

## Rééquilibrage du 30/09/2026 (points 1, 2 et 4)
- **XP** : héros 100 + 15 × n par niveau (au lieu de 25 × n), Voyage 12 / round et 50 / gardien, Histoire 60 / 15 ; armes : gains × 0,6.
  Mesuré : Nv 5 en 9 min, Nv 10 en 25 min, Nv 20 en 1 h 15, Nv 50 en 6 h, Nv 100 en 22 h ; arme au niveau 10 en ~1 h (≈ 6,5 Voyages).
- **Or** : 20 + 15 par arène (+30 si record) ; communs à 400 et 550 or. Voyage de 8 arènes sans pièce : 140 or (170 avec record).
- **Héros** : Aldric « Garde » (−15 % de dégâts reçus) et attaque 5 ; Ilwen 125 PV et attaque 5 ; Mira 150 PV, soin 0,5 PV par attaque
  (au lieu de 180 PV et 4). À surveiller : Mira encore en vie à 12 min (29-30 rounds, comme les meilleurs) ; la Clochette
  (soin → bouclier) devient faible avec ce soin, le Bâton de sève (12 PV par combo) relativement plus fort.
- **Mira** (30/09) : Renouveau à 10 % des PV, Clochette 1 PV × multiplicateur, Bâton de sève 8 PV par combo, 150 PV, soin 0,5.
  Décidé : réglage gardé, Mira est l'héroïne accessible pour les débutants (étiquette « Idéal pour débuter »).
  Mesuré (bot « humain », armes au niveau 1) : KO à 16,3 / 16,6 min (Amulette), 9,0 / 12,7 min (Bâton de sève), 15,0 / 20,2 min (Clochette),
  moyenne 15 min pour une cible de 8 à 13 min. **À réévaluer après le test fermé**, en comparant les rounds atteints par héros
  dans le classement du Voyage.

## Textes et langues (30/09/2026) — fait
- Tous les textes de l'interface sont sortis du code vers `data/i18n/fr.json` (182 clés) et passent par `tr()` ; système multilingue
  en place (fr, en, it, es, de ; seul le français existe, repli sur le français), choix dans les Réglages, nombres et dates par Intl,
  pluriels et « de » par langue, glossaire `data/i18n/GLOSSAIRE.md`. Voir CLAUDE.md → « Langues ».
- **Anglais fait le 30/09/2026** (`en.json`, interface + section `data` complète, histoire comprise) : voir CLAUDE.md → « Langues ».
  Corrigé au passage : textes encore codés en dur (volume « 0 % », « Pseudo : », « Round » du Voyage), prix « Sans publicité »,
  titre de l'attente et bandeau de pression du Duel qui débordaient avec un pseudo long (16 lettres larges), en français comme en anglais.
- **À relire par un anglophone** : « the Hollowed » au singulier (« a Hollowed »), « Madam Sorel » (connotation possible), Tonnerre
  laissé en français (« Thunder » pour un joueur anglais ?), « the Imprint » à la fois nom des trois gestes (prologue) et points du Duel
  (comme en français), « The Triangle fights for you » (le français dit « te défend »).
- **Italien fait le 30/09/2026** (`it.json`) : voir CLAUDE.md → « Langues ». **À relire par un italophone** : le « voi » de respect entre
  personnages (plus littéraire que « Lei »), « Madama Sorel », « Ser Corvin », Kestrel « la Raminga » (rare ; « l'Esploratrice » ?),
  Tonnerre laissé en français (« Tuono » ?), mots anglais gardés comme dans les jeux italiens (skin, boost, nickname),
  « Lancia di guardia » (le français « garde-fou » n'a pas d'équivalent direct), « Scagnozzo » pour le sbire.
- **Espagnol fait le 30/09/2026** (`es.json`) : voir CLAUDE.md → « Langues ». **À relire par un hispanophone** : « usted » entre personnages
  (Aldric, Nyra et Boran envers Eldan, Ilwen et Kestrel, Mira et Boran), « Doña Sorel », « Ser Corvin », Tonnerre laissé en français (« Trueno » ?),
  « Lanza baranda » (garde-fou), « Esbirro », « potenciador » pour boost (plus long, onglet sur deux lignes de la boutique comme en français),
  « vosotros » (espagnol d'Espagne : « os enfrentáis », « sentaos ») à revoir si le jeu vise l'Amérique latine.
- **Corrigé au passage (toutes langues)** : sur la carte de l'histoire, des titres d'étape sortaient de l'écran, même en français
  (« La piste du vieil homme », « Le camp des réfugiés ») et le titre du haut était coupé (« Ceux qu'on peut sau… ») : ils passent à la ligne.
- **Allemand fait le 01/10/2026** (`de.json`) : voir CLAUDE.md → « Langues ». **À relire par un germanophone** : « Ihr » de respect entre
  personnages (plus ancien que « Sie »), « Sir Corvin », « Frau Sorel », Tonnerre laissé en français (« Donner » ?), « Schutzlanze » (garde-fou),
  « Scherge » / « Rohling », EP / LP (usuels dans les jeux allemands), « Story » sur le bouton du lobby mais « Geschichten » en titre.
- **Les 5 langues sont faites.** Relecture par des locuteurs natifs conseillée avant le test fermé.
