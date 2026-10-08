# Avant la publication sur le Play Store — état des lieux du 01/10/2026 (emballage Android préparé le 04/10/2026)

Ce document liste **tout ce qui manque concrètement** pour publier Three Signs sur le Play Store.
Rien n'a été corrigé pendant cet état des lieux (voir « Coquilles relevées » en bas).

**Qui s'en occupe :**
- 👤 **Toi** : comptes, consoles (Google Play, Firebase, AdMob), paiements, textes légaux, décisions.
- 🤖 **Claude Code** : le code du jeu, l'emballage en application, les tests.
- 🎨 **Claude Design** : images, icônes, captures d'écran.

**Priorité** : 🔴 bloquant (Google refusera le jeu, ou bug grave au lancement) · 🟠 important (à faire avant le lancement public) · 🟢 optionnel.

**Effort** : ⏱ moins d'1 h · ⏱⏱ une demi-journée à une journée · ⏱⏱⏱ plusieurs jours.

## 🗂 Classement par arène et par pays (07/10/2026) — à faire dans la console Firebase 👤
**1. Publier les règles** : console.firebase.google.com → projet **trois-signes** → **Firestore Database** → onglet **Règles** → coller tout le
contenu de `firestore.rules` → **Publier**. (Elles contiennent aussi celles du 03/10 et du 05/10.)

**2. Créer les 8 index composites** (sans eux, le classement affiche « Hors ligne » : le serveur refuse les requêtes).
Méthode la plus simple, à la main : Firestore Database → onglet **Index** → **Composite** → **Créer un index**, puis pour chacun :
- **ID de la collection** : `leaderboard` · **Champs** : ceux du tableau, dans cet ordre (bouton « Ajouter un champ » pour chaque ligne) ·
  **Portée de la requête** : **Collection** → **Créer**.

| N° | 1er champ | 2e champ | 3e champ |
|---|---|---|---|
| 1 | `arene` Croissant | `prints` Décroissant | `since` Croissant |
| 2 | `arene` Croissant | `prints` Croissant | `since` Croissant |
| 3 | `pays` Croissant | `prints` Décroissant | `since` Croissant |
| 4 | `pays` Croissant | `prints` Croissant | `since` Croissant |
| 5 | `prints` Décroissant | `since` Croissant | — |
| 6 | `prints` Croissant | `since` Croissant | — |
| 7 | `pays` Croissant | `voyage` Décroissant | — |
| 8 | `pays` Croissant | `voyage` Croissant | — |

Chaque index passe de « Création en cours » à « Activé » en quelques minutes. Autre méthode, en une commande depuis le dossier du jeu (si
l'outil `firebase` est installé et connecté) : `firebase deploy --only firestore:indexes,firestore:rules`.
Si un index manque, la console du navigateur affiche une erreur « The query requires an index » avec un lien qui le crée directement.
*Non vérifiable dans l'environnement de Claude : l'émulateur n'exige pas les index. À contrôler sur le vrai serveur en ouvrant les 5 vues.*

**3. Lectures consommées** (offre gratuite : 50 000 lectures par jour) :
- ouvrir une vue : ≈ 53 lectures (50 lignes, ma ligne, ma fiche, 2 comptages si je ne suis pas dans les 50) ; « Voir plus » : 25 ;
  même vue dans les 5 minutes : 0 (cache) ; un comptage coûte 1 lecture par tranche de 1 000 joueurs comptés.
- joueur moyen : 1 ouverture par jour, 1,5 vue ≈ **80 lectures** → classement seul : quota dépassé vers **600 joueurs actifs par jour** ;
  joueur assidu : 2 ouvertures × 2 vues ≈ **220 lectures** → vers **230 joueurs actifs par jour**.
- avec le reste du jeu (≈ 10 lectures au lancement : sauvegarde, portefeuille, connexion du jour, Empreintes ; un Duel ≈ 100 lectures par
  joueur pour suivre le salon), un joueur qui fait 3 Duels et ouvre le classement une fois ≈ 400 lectures : **≈ 120 joueurs actifs par jour**.
  Les écritures du Duel (20 000 par jour, ≈ 60 Duels complets) restent la première limite. Au-delà : offre Blaze (≈ 0,03 € les 100 000 lectures).

## 🔗 Adresses des pages légales (à donner à la Play Console)
Adresses attendues si le jeu est publié par GitHub Pages depuis `cronos2a/trois-signes` (branche `main`, dossier racine) :
| Page | Adresse | Où la donner |
|---|---|---|
| Politique de confidentialité | https://cronos2a.github.io/trois-signes/legal/politique-de-confidentialite.html | Play Console → Contenu de l'application → Règles de confidentialité ; aussi la fiche du store |
| Conditions d'utilisation | https://cronos2a.github.io/trois-signes/legal/conditions-utilisation.html | (facultatif dans la Play Console) ; liée depuis le jeu |
| Supprimer mon compte | https://cronos2a.github.io/trois-signes/legal/supprimer-mon-compte.html | Play Console → Contenu de l'application → Sécurité des données → « Suppression du compte » (URL) |

⚠️ **À confirmer** : ces adresses n'ont pas pu être ouvertes depuis l'environnement de test (sites extérieurs bloqués). Ouvre-les une fois
dans ton navigateur avant de les coller. Si le site est publié ailleurs (autre domaine), remplace seulement le début de l'adresse :
la fin `legal/…html` reste la même. Vérifié en local (02/10/2026) : les trois pages s'affichent sans débordement en 360 × 640 et 390 × 800,
et leurs liens entre elles marchent.

⚖️ **Avant d'activer les achats intégrés : ajouter la mention d'un médiateur de la consommation dans les conditions, et l'adresse du développeur.** (`legal/conditions-utilisation.html` → « Droit applicable » ; la mention a été retirée le 09/10/2026 : pas de vente pour l'instant.)

## ✅ Avancement — premier lot de préparation (01/10/2026)
| Point | État dans le jeu | Ce qui reste |
|---|---|---|
| **B1** Compte Google | ✅ « Sauvegarder ma progression avec Google », « Se connecter avec Google », choix entre deux progressions | 👤 E3 (console Firebase) ; 🤖 installer `@capacitor-firebase/authentication` à l'emballage ; essayer la fenêtre Google sur le site et sur un téléphone (bloquée dans l'environnement de test) |
| **B2** Supprimer le compte | ✅ bouton, deux confirmations, tout effacé ; page `legal/supprimer-mon-compte.html` | 👤 publier les règles du 01/10 ; adresse de contact (cronos2a.jeux@gmail.com) en place ; mettre la page en ligne et son adresse dans la Play Console |
| **B5** Pubs | 🟡 fausses pubs seulement en développement : sur le web publié, aucune pub ne rapporte rien | AdMob réel (inchangé) |
| **I-3** Polices | ✅ embarquées, plus aucun appel à Google Fonts | — |
| **I-4** Signaler un pseudo | ✅ classements et Duel, 4 raisons, lisibles dans la console (`reports`) | 👤 consulter `reports` de temps en temps |
| **I-9** Version, contact, crédits | ✅ `data/version.json` (0.9.0, build 1), « Un jeu de Cronos2A » | adresse de contact (masquée tant qu'elle est provisoire) |
| **I-10** Zones tactiles | ✅ 48 × 48 px et 8 px d'écart sur 31 écrans, 5 langues | — |

---

## Ce qui a été vérifié pour cet état des lieux (et qui va bien)

- **Langues** : les 5 langues sont complètes. Aucune clé ne retombe sur le français, aucun texte des données n'est resté non traduit.
  Aucun texte ne déborde en 360 × 640 dans les écrans testés : 21 écrans, histoire d'Aldric, Voyage, Duel, cartes et titres des 6 histoires.
- **Hors connexion** (tout Internet coupé) : le jeu démarre en 0,5 s, même au tout premier lancement (pseudo accepté).
  Voyage, Histoire et Entraînement se jouent normalement. Le Duel affiche qu'il faut une connexion. Les Réglages indiquent « Serveur injoignable : sauvegarde sur cet appareil ».
  Aucune erreur. **Un échec de Firebase ne bloque jamais le démarrage.**
- **Démarrage** (réseau 12 Mbit/s simulé) : jeu prêt en 1,4 s, 2,0 s avec un processeur 4 fois plus lent, 2,6 s avec un processeur 6 fois plus lent.
  Environ 4 Mo sont téléchargés au démarrage, les musiques arrivent ensuite à la demande.
- **Combat** (Voyage, 2 à 3 ennemis puis gardien, supers et particules) : **40 images/s** avec un processeur 4 fois plus lent (fluide).
  **21 images/s** avec un processeur 6 fois plus lent : jouable mais saccadé.
  Mémoire JavaScript : 10 Mo. À confirmer sur un vrai téléphone d'entrée de gamme (voir I-12).
- **Poids du jeu** : environ 31 Mo, dont 18 Mo de musiques, 4,7 Mo de décors et 1 Mo de SDK Firebase. Largement sous la limite du Play Store (150 Mo).
- **Récompenses de connexion sur le vrai serveur** (01/10/2026) : récupération acceptée. La 2e récupération, le jour truqué, la série gonflée,
  les gemmes ajoutées à la main et l'écriture chez un autre joueur sont refusées.
- **Probabilités des coffres** : affichées à côté du bouton, plus une fiche détaillée. Garantie d'un objet épique au 10e coffre affichée.
  Coffres payants désactivés en Belgique.
- **Pseudos réservés** : bloqués (admin, modo, support, staff, trois signes, cronos2a… en 5 langues). Filtre des mots grossiers en place.
- **Mode test** : invisible dans le jeu publié (`test.autorise` = `false`, jamais dans l'application native).
- **Vibrations** : option Oui / Non présente dans les Réglages.

---

## 🔴 BLOQUANT

### B1. Le compte se perd en changeant de téléphone ou en réinstallant (1. Compte)
- **Constat** : le compte est **anonyme** et n'existe que dans le téléphone. Si le joueur désinstalle le jeu, efface ses données ou change de téléphone,
  il obtient un nouveau compte vide : niveaux, histoires, cosmétiques, **gemmes achetées** et Empreintes sont perdus.
  La sauvegarde reste bien sur le serveur, mais plus rien ne la relie au joueur.
- **Pourquoi c'est bloquant** : dès que les gemmes deviennent payantes, un joueur qui perd ce qu'il a acheté demandera un remboursement
  ou laissera une mauvaise note. C'est la première cause de plaintes dans les jeux gratuits.
- **Solution la plus simple** : un bouton **« Se connecter avec Google »** qui *relie* le compte anonyme actuel à son compte Google
  (Firebase « linkWithCredential » : rien n'est perdu, l'identifiant du joueur ne change pas). Sur un nouveau téléphone, le joueur se connecte
  avec le même compte Google et retrouve tout. Le bouton existe déjà dans les Réglages (désactivé, « Bientôt »).
  - **Avec quoi** : le module Capacitor `@capacitor-firebase/authentication` (connexion Google native d'Android). Google Play Jeux est possible
    aussi, mais plus compliqué à brancher sur Firebase.
  - **Coût** : 0 €. La connexion Google est gratuite, même avec l'offre Spark.
  - **Difficulté** : moyenne, environ 1 à 2 jours pour 🤖 Claude Code (bouton, liaison, reprise de la sauvegarde au lancement, cas « ce compte Google
    a déjà une progression »). De ton côté, 👤 environ 30 minutes de réglages dans Firebase (voir « Tes étapes », E3).
  - **À afficher** : une petite invitation « Protège ta progression » après la première histoire ou le premier achat.
- **Qui** : 🤖 Claude Code + 👤 Toi · **Effort** : ⏱⏱⏱

### B2. Pas de bouton « Supprimer mon compte et mes données » (1. Compte)
- **Constat** : rien dans les Réglages. Les règles de sécurité ne permettent au joueur d'effacer que 3 de ses 8 types de documents
  (`players`, `leaderboard`, `queue`). `wallet`, `ranked`, `daily` et `runs` ne peuvent pas être effacés par le joueur.
- **Pourquoi** :
  - **Google Play** exige, pour toute application qui crée un compte (même automatique et anonyme), un moyen de supprimer le compte
    **dans l'application** *et* un **lien web** où demander la suppression. Ce lien se renseigne dans la Play Console.
  - **RGPD** : c'est le droit à l'effacement.
- **Proposition** : Réglages → Compte → « Supprimer mon compte et mes données ». Double confirmation, puis :
  - effacement de tous les documents du joueur (sauvegarde, classement, Empreintes, gemmes, récompenses du jour, partie en cours, file du Duel) ;
  - effacement de son compte Firebase ;
  - remise à zéro de l'appareil.
  - Les règles doivent permettre au propriétaire d'effacer ses documents `wallet`, `ranked`, `daily` et `runs`. Le compte étant supprimé en même temps,
    un tricheur ne peut pas s'en servir pour récupérer deux fois la même récompense.
  - Lien web : une page simple, ou un formulaire avec ton adresse de contact, que tu traites à la main.
- **Qui** : 🤖 Claude Code (bouton et règles) + 👤 Toi (publier les nouvelles règles, page web de demande) · **Effort** : ⏱⏱

### B3. Pas de politique de confidentialité (4. Légal)
- **Constat** : pas de page, pas de lien dans les Réglages.
- **Pourquoi** : obligatoire pour le Play Store (lien dans la fiche **et** dans le jeu), pour AdMob et pour le RGPD.
- **À faire** :
  - 🤖 Claude Code rédige le texte en 5 langues, d'après le tableau de la section « Sécurité des données ».
  - 👤 Toi : tu le publies sur une page web publique et gratuite. Firebase Hosting est le plus simple, et Claude Code peut le préparer.
  - 🤖 Claude Code ajoute le lien « Confidentialité » dans les Réglages.
- **Qui** : 🤖 + 👤 · **Effort** : ⏱⏱

### B4. Achats réels absents : gemmes et « Sans publicité » (5. Technique)
- **Constat** :
  - Les 4 packs de gemmes et « Sans publicité » sont des boutons désactivés (« Disponible dans l'application »).
  - Leurs prix sont écrits en dur (« 0,99 € »), alors que Google affiche le prix de chaque pays.
  - Les règles de sécurité interdisent (à juste titre) au jeu d'ajouter des gemmes achetées : il faut un **serveur de vérification**.
- **À faire** :
  - 👤 Toi : créer les produits dans la Play Console (tableau ci-dessous) et activer l'offre **Blaze** (voir B7).
  - 🤖 Claude Code :
    - brancher Google Play Billing dans l'application (module Capacitor d'achats) ;
    - écrire la **Cloud Function** qui vérifie chaque reçu auprès de Google, puis crédite les gemmes dans `wallet/{uid}` (une seule fois par reçu) ;
    - « Sans publicité » : achat définitif, restauré automatiquement sur un nouveau téléphone ;
    - afficher les prix fournis par Google.
- **Produits à créer dans la Play Console** (identifiants proposés, prix de `data/economy.json` et `data/ads.json`) :

  | Identifiant | Type | Contenu | Prix prévu |
  |---|---|---|---|
  | `gemmes_80` | consommable | 80 gemmes | 0,99 € |
  | `gemmes_450` | consommable | 450 gemmes | 4,99 € |
  | `gemmes_1000` | consommable | 1 000 gemmes | 9,99 € |
  | `gemmes_2200` | consommable | 2 200 gemmes | 19,99 € |
  | `sans_pub` | non consommable (achat unique) | plus de pubs plein écran | 2,99 € |

  Pour chaque produit, Google demande aussi un nom et une description **dans chaque langue de la fiche**.
- **Qui** : 👤 + 🤖 · **Effort** : ⏱⏱⏱

### B5. Publicités : identifiants et mode de TEST (5. Technique, 4. Légal)
- **Constat** :
  - `data/ads.json` contient les **identifiants de test de Google** et `initializeForTesting: true`.
  - Le module AdMob n'est pas installé (le code est prêt : `src/ads/admob.js`).
- **À faire** :
  - 👤 Toi : créer le compte AdMob, l'application et deux blocs d'annonces (récompensée, plein écran) ; remplir le message de consentement
    pour l'Europe (voir E5).
  - 🤖 Claude Code : installer le module, mettre tes identifiants, passer `initializeForTesting` à `false` dans la version publiée,
    déclarer l'identifiant d'application dans Android.
- **Attention** : **ne jamais cliquer sur tes propres vraies pubs** pendant les tests. AdMob peut fermer le compte.
  Pour tester, garder le mode test, ou déclarer ton téléphone comme « appareil de test » dans AdMob.
- **Consentement** : le formulaire de Google (UMP) est déjà prévu au premier lancement. Il ne s'affichera que quand le module sera installé
  et le message rempli dans AdMob.
- **Qui** : 👤 + 🤖 · **Effort** : ⏱⏱

### B6. Pas d'icône d'application, pas d'images pour la fiche du store (5. Technique)
- **Constat** :
  - le fichier `manifest.webmanifest` n'a **aucune icône** ;
  - il n'y a ni icône Android, ni écran de démarrage, ni visuels pour la fiche.
- **À fournir par 🎨 Claude Design** :
  - icône 512 × 512 (fiche du store) ;
  - **icône adaptative Android** : premier plan et fond séparés, 432 × 432, avec une marge de sécurité ;
  - icône monochrome (Android 13 et plus) ;
  - image de présentation 1024 × 500 ;
  - écran de démarrage (logo sur fond vert `#2BA84A`) ;
  - **captures d'écran du téléphone** : au moins 2, conseillé 4 à 8, idéalement dans chaque langue de la fiche. 🤖 Claude Code peut les produire
    depuis le jeu en 1080 × 1920.
- **Qui** : 🎨 + 🤖 · **Effort** : ⏱⏱

### B7. Quotas gratuits de Firebase trop justes pour un lancement (5. Firebase)
- **Constat** :
  - l'offre gratuite Spark permet **20 000 écritures et 50 000 lectures par jour**, pour tout le jeu ;
  - chaque joueur écrit sa sauvegarde après chaque changement (regroupé toutes les 3 s), plus le classement et les récompenses du jour ;
  - un Duel coûte environ 12 écritures par minute et par joueur.
  - Avec quelques centaines de joueurs actifs, la limite est atteinte vers le milieu de la journée. Ensuite, plus rien ne s'enregistre au
    serveur jusqu'à minuit (heure du Pacifique) : Duel impossible, récompenses du jour « hors connexion », sauvegardes non envoyées.
- **À faire** :
  - 👤 Toi : activer **Blaze** avant l'ouverture au public, et **pas seulement pour les achats**. Les mêmes quotas gratuits restent inclus :
    pour ce jeu, le coût reste quasi nul tant qu'il y a peu de joueurs. Régler tout de suite une **alerte de budget** (par exemple 5 € puis 20 €).
  - 🤖 Claude Code (optionnel mais conseillé) : espacer les envois de sauvegarde (par exemple en fin de partie, et au plus une fois par minute dans les menus).
- **Qui** : 👤 + 🤖 · **Effort** : ⏱

### B8. Données de test à effacer avant le lancement (1. Compte)
- **Sur le vrai serveur Firebase** (projet `trois-signes`), des tests ont laissé :
  - des comptes anonymes (Authentication) ;
  - des documents `players`, `leaderboard` (lignes de test), `ranked` (deux joueurs de test à **5 000 Empreintes**, qui fausseraient la recherche
    d'adversaires et le classement Duel), `queue`, `duels` (salons de test), `wallet`, `runs`, `daily` (compte « TestJour » du 01/10/2026).
- **À faire** : tout effacer juste avant l'ouverture au public. Étapes en E8.
- **Qui** : 👤 Toi (Claude Code peut aussi le faire avec un script si tu lui donnes un accès administrateur, sinon à la main) · **Effort** : ⏱

### B9. Classification d'âge et public visé (4. Légal)
- **Décision à prendre** : le style cartoon peut attirer des enfants. Si tu coches un public de **moins de 13 ans** dans la Play Console,
  le jeu entre dans le programme « Familles ». Il faut alors :
  - des publicités non personnalisées ;
  - des réglages AdMob spéciaux ;
  - et les **coffres payants posent problème** : beaucoup de pays et de plateformes les déconseillent ou les encadrent pour les enfants.
- **Conseil** : public visé **13 ans et plus** (ou 16 ans et plus pour simplifier le consentement publicitaire en Europe), en restant honnête
  dans le questionnaire.
- **Éléments à déclarer au questionnaire IARC** (dans la Play Console) :
  - **violence** : affrontements stylisés de dessin animé (fantasy), sans sang, sans mort réaliste ; les ennemis « s'effacent » ;
  - **achats intégrés** : oui, dont des **objets aléatoires achetés avec de l'argent réel** (coffres payés en gemmes, elles-mêmes achetables) ;
  - **publicités** : oui (récompensées et plein écran) ;
  - **interaction entre joueurs** : oui, limitée. Pseudos visibles dans les classements et le Duel ; pas de discussion, pas d'échange d'objets ;
  - **partage de position** : non. **Contenu sexuel, drogues, jeux d'argent réels, langage grossier** : non (filtre de pseudos).
- **Qui** : 👤 Toi · **Effort** : ⏱

### B10. Formulaire « Sécurité des données » de la Play Console (4. Légal)
Liste exacte de ce que le jeu collecte, à recopier dans le formulaire (étapes en E6) :

| Donnée | Type (vocabulaire Google) | Pourquoi | Partagée avec un tiers ? | Facultative ? |
|---|---|---|---|---|
| Identifiant de compte Firebase (anonyme) | Identifiants de l'utilisateur | Fonctionnement de l'application, gestion du compte | Non (Google Firebase est un sous-traitant, pas un partage) | Non |
| Pseudo | Nom ou identifiant d'utilisateur (« Autres infos ») | Fonctionnement : affiché en Duel et dans les classements | Non (visible des autres joueurs dans le jeu) | Non |
| Progression de jeu (sauvegarde : niveaux, scores, objets, gemmes, Empreintes, récompenses du jour) | Activité dans l'application : autres actions | Fonctionnement : sauvegarde en ligne, classements, Duel | Non | Non |
| Scores du Voyage et Empreintes | Activité dans l'application | Classements | Non | Non |
| Historique d'achats (quand les achats seront branchés) | Informations financières : historique d'achats | Fonctionnement : créditer les gemmes, restaurer « Sans publicité » | Non | Oui (seulement si achat) |
| Identifiant publicitaire, informations sur l'appareil, adresse IP (par AdMob) | Identifiants de l'appareil ou autres | Publicité | **Oui, avec Google (AdMob)** | Selon le consentement |
| Compte Google (si la liaison B1 est faite) | Adresse e-mail, identifiants | Gestion du compte | Non | Oui |

- **Chiffrement en transit** : oui (HTTPS). **Suppression possible** : oui, une fois B2 fait.
- **Ce qui n'est PAS collecté** : position GPS, contacts, photos, micro, statistiques de navigation (Google Analytics n'est pas chargé).
  Le pays utilisé pour désactiver les coffres est déduit **sur le téléphone** (langue et fuseau horaire) et n'est envoyé nulle part.
- ⚠️ **Polices Google Fonts** : chaque lancement télécharge les polices depuis les serveurs de Google, ce qui envoie l'adresse IP du joueur à Google
  (voir I-3).

---

## 🟠 IMPORTANT

### I-1. Emballage Capacitor : checklist (5. Technique) — ✅ préparé le 04/10/2026 (`docs/EMBALLAGE.md`)
- ✅ **Nom de l'application** « Three Signs » ; **nom du paquet** `com.cronos2a.troissignes` (décidé, définitif).
- ✅ **Version** : `versionName` = `data/version.json → version`, `versionCode` = `→ build` (1), +1 à chaque envoi (EMBALLAGE 4.3).
- ✅ **Icône adaptative et écran de démarrage** provisoires, régénérés par `npm run icons` (EMBALLAGE 3) ; vraie icône : voir B6.
- ✅ **Portrait** verrouillé ; zones sûres (encoche, barre de navigation) gérées ; vérifié sur deux écrans simulés.
- ✅ **Permissions** : `INTERNET`, `VIBRATE` (Haptics) ; identifiant publicitaire, localisation, notifications retirés de force.
  Quand AdMob et les achats seront branchés : `AD_ID` (AdMob) et `BILLING` (achats) seront à remettre.
- ✅ **API cible 36** (exigée depuis le 31/08/2026), plugin Gradle 8.13 (16 Ko), **AAB signé** par la clé d'envoi (`tools/android/aab.ps1`),
  signature d'application par Google Play.
- ✅ **Taille** : `www/` = 30 Mo (sans `design/`, `docs/`, `legal/`, `prototype/`, `tools/`, notes) ; application ≈ 35 à 40 Mo.
- ✅ **Bouton Retour** branché sur l'évènement Capacitor ; **son coupé en arrière-plan** ; absence du Duel ; liens par Browser ;
  mode test et fausses pubs coupés ; pubs et achats « Bientôt ».
- 👤 **Reste** : compiler sur ton PC (EMBALLAGE 4.4), clé d'envoi et ses 2 copies (4.1, 4.2), Firebase Android + `google-services.json` (5),
  tests sur le téléphone (6.3), 3e empreinte après le premier envoi (5.4). Écran toujours allumé en combat : optionnel, non fait.
- **Qui** : 🤖 fait ; 👤 étapes de `docs/EMBALLAGE.md`

### I-2. Firebase : protéger la clé, éviter les abus (5. Firebase)
- **Règles** : publiées et vérifiées (01/10/2026). **À republier** : celles du 03/10 (Duel sans sortie), du 05/10 (`ranked/{uid}.areneMaxDuel`) et du 07/10 (classement : arène, pays, date d'obtention), toutes dans `firestore.rules` ; plus les 8 index (voir en tête).
- **Clé API** (`data/online.json`) : visible par tous, c'est normal pour Firebase, mais il faut la **restreindre** (étapes en E4) :
  - aux adresses du jeu : `https://localhost` (l'application, qui passe par la WebView) et le domaine du site ;
  - aux seules API utilisées (Identity Toolkit, Firestore, Token Service).
- **App Check** (gratuit) : vérifie que les requêtes viennent bien de *ton* application (Play Integrity sur Android), et bloque les scripts
  qui créeraient des milliers de comptes ou rempliraient la base. Conseillé dès l'offre Blaze. 🤖 branchement, 👤 activation dans la console.
- **Alertes de budget** : dès Blaze (B7).
- **Ménage des salons de Duel terminés** : ils restent dans la base. À prévoir : une règle de suppression automatique (TTL) dans la console Firestore
  (gratuit, 👤 5 min ; 🤖 ajoute un champ de date d'expiration).
- **Qui** : 👤 + 🤖 · **Effort** : ⏱⏱

### I-3. Polices chargées depuis Google Fonts (2. Provisoire, 4. Légal)
- **Constat** : `src/ui/organic.css`, le fichier du design system à ne pas modifier, importe Caprasimo et Figtree depuis `fonts.googleapis.com`.
  - **Hors connexion**, l'application perd ses polices : les titres changent d'aspect.
  - **RGPD** : envoyer l'adresse IP à Google sans consentement a déjà été sanctionné en Allemagne.
- **Solution** : embarquer les deux polices dans le jeu (licence SIL OFL, autorisée) et ne plus les charger depuis Google.
  Comme `organic.css` ne doit pas être modifié, il faut 👤 **ton accord** pour une exception, ou une version du design system avec les polices locales (🎨).
- **Qui** : 👤 décision, 🤖 réalisation · **Effort** : ⏱

### I-4. Signaler un pseudo (4. Légal)
- **Constat** : les pseudos sont visibles par tous (classements, Duel), filtrés (mots grossiers, pseudos réservés) mais **pas uniques**
  et **non signalables**. Pour Google, des noms choisis par les joueurs et vus par les autres sont du contenu créé par les joueurs : il faut un moyen
  de **signaler** et une modération.
- **Proposition** :
  - un bouton « Signaler » sur une ligne de classement et sur l'écran de fin d'un Duel, qui enregistre le signalement au serveur ;
  - de ton côté, tu renommes le joueur depuis la console (pseudo remplacé par « Joueur1234 ») ;
  - mentionner ton adresse de contact dans la fiche.
- **Unicité des pseudos** (G8) : toujours ouverte, à décider (voir D-1).
- **Qui** : 🤖 + 👤 · **Effort** : ⏱⏱

### I-5. Conditions d'utilisation et achats (4. Légal)
- **Constat** : aucune page de conditions.
- **Contenu de la page** :
  - les gemmes et objets sont des biens numériques sans valeur réelle ;
  - le remboursement passe par Google Play (politique de Google, 48 h en libre-service) ;
  - pour les achats numériques livrés immédiatement, le joueur renonce à son droit de rétractation de 14 jours (case prévue par Google Play) ;
  - les coffres sont aléatoires, avec probabilités affichées ;
  - un compte peut être suspendu en cas de triche ;
  - ton contact.
- Même page que la politique de confidentialité, ou une seconde page à côté, avec un lien dans les Réglages.
- **Qui** : 🤖 rédige, 👤 publie et valide · **Effort** : ⏱

### I-6. Version web : la garder ou non ? (5. Technique) — 👤 décision
- **La garder en ligne** (même lien qu'aujourd'hui) :
  - ➕ démo jouable sans installation, pratique pour faire découvrir le jeu ;
  - ➖ pas d'achats possibles sur le web : on ne peut pas utiliser Google Play Billing hors de l'application, et un autre paiement demanderait Stripe et un serveur ;
  - ➖ les **fausses pubs de test** donnent de vraies gemmes sans vraie pub (3 × 5 gemmes par jour par compte) et un coffre gratuit ;
  - ➖ la triche est plus facile depuis un navigateur d'ordinateur ;
  - ➖ deux comptes séparés pour un même joueur (web et téléphone), tant que la liaison Google (B1) n'existe pas ;
  - ➖ la politique de confidentialité doit aussi couvrir le site.
- **La retirer**, ou la remplacer par une page de présentation avec un lien vers le Play Store :
  - ➕ une seule version à maintenir, pas de fuite de gemmes, moins de triche ;
  - ➖ plus de démo.
- **Conseil** : la retirer au lancement, ou la garder en **démo sans compte en ligne et sans pubs récompensées**
  (🤖 ⏱⏱ pour faire cette version démo).

### I-7. « Bientôt » encore visible par les joueurs (2. Provisoire)
- **Réglages** : « Lier mon compte Google », bouton désactivé « Bientôt (Google Play Games) ». Disparaît avec B1 ; le texte doit aussi changer.
- **Histoire** : carte d'Eldan « Le Maître · bientôt disponible » après les 6 histoires, et « Son histoire sera bientôt disponible » à l'épilogue.
  C'est acceptable pour Google (contenu annoncé), mais à garder seulement si une histoire d'Eldan est réellement prévue.
- **Boutique** : packs de gemmes et « Sans publicité » désactivés (« Disponible dans l'application »). Disparaît avec B4.
- **Réglages → Langue** : plus aucune langue « (bientôt) ».
- **Qui** : 🤖 (après B1 et B4) + 👤 (décision pour Eldan) · **Effort** : ⏱

### I-8. Sons et musiques encore provisoires (2. Provisoire)
| Fichier | Ce qu'il faut | Qui |
|---|---|---|
| `sfx/ui_clic.mp3` | clic court et doux sur un bouton (< 0,3 s) | 👤 Toi (ElevenLabs) |
| `sfx/ui_onglet.mp3` | changement d'onglet du lobby (< 0,4 s) | 👤 Toi (ElevenLabs) |
| `musique/musique_triste.mp3` | musique triste après un mini-boss ou un lieutenant (1 à 2 min, bouclable) | 👤 Toi (Suno Pro) |
| `musique/musique_lobby.mp3` | à rallonger : 19 s aujourd'hui, la boucle revient trop souvent (viser 1 min 30 à 3 min) | 👤 Toi (Suno Pro) |

Tant qu'ils manquent, le jeu joue un son synthétisé : aucun bug, mais les menus sonnent « vides ». Après dépôt des fichiers,
🤖 Claude Code les normalise et met à jour `SONS.md` et `CREDITS.md`. **Effort** : ⏱ pour toi.

### I-9. Finitions : version, contact, crédits (7. Finitions)
- **Numéro de version** : absent. À afficher en bas des Réglages (« Version 1.0.0 »), indispensable pour le support.
- **Contact / support** : aucun. Il faut une **adresse e-mail** (obligatoire dans la fiche du Play Store) et un bouton « Nous contacter » dans les Réglages.
- **Écran Crédits** : sons (ElevenLabs), musiques (Suno), notes de réussite, graphismes (Organic, Claude Design), polices (Caprasimo, Figtree, OFL),
  serveur (Firebase) : complet. **Manquent** : ton nom ou celui de ton studio (création, direction), et une mention « Développé avec l'aide de Claude ».
  Si tu veux, 👤 dis-moi quoi écrire.
- **Qui** : 🤖 + 👤 (adresse, nom) · **Effort** : ⏱

### I-10. Accessibilité : zones tactiles trop petites (7. Finitions)
- Google recommande des zones tactiles d'au moins **48 dp** (environ 48 px ici). Mesuré en 360 × 640 :
  - **les plus gênantes** :
    - « Modifier » (pseudo) et « Crédits » dans les Réglages : 23 px de haut ;
    - flèches « héros précédent / suivant » : 30 × 30 px ;
    - boutons de prix des cosmétiques : 26 px de haut ;
    - « Équipée / Équiper » des armes et options de cosmétiques : 28 à 30 px ;
  - **un peu justes** (34 à 42 px) : onglets de la boutique, « Probabilités », filtres, choix de langue, « Revoir la leçon », « Entraînement »,
    engrenage des Réglages (40 × 40), « + » des gemmes (30 px de haut).
- **Solution** : agrandir la zone de toucher sans changer le dessin (marge invisible), sans toucher à `organic.css`.
- **Contraste** : les textes clairs sur fond vert ont été lisibles dans tous les tests, mais aucune mesure chiffrée n'a été faite : à vérifier avec
  l'outil « Accessibility Scanner » de Google sur le téléphone.
- **Vibrations** : option présente (Oui / Non). **Son** : volumes Musique et Effets séparés.
- **Qui** : 🤖 · **Effort** : ⏱⏱

### I-11. Fiche du Play Store dans 5 langues (3. Langues)
Textes hors du jeu, à traduire (🤖 Claude Code peut tous les rédiger) :
- **Nom de l'application** :
  - Trois Signes, Three Signs, Tre Segni, Tres Signos, Drei Zeichen ;
  - 👤 décision : un seul nom partout, ou traduit ? Le jeu l'affiche déjà traduit en haut de la page ;
  - le nom sous l'icône du téléphone se règle dans l'application Android, par langue.
- **Description courte** (80 caractères) et **description complète** (4 000 caractères), dans chaque langue.
- **Noms et descriptions des 5 produits** (B4), dans chaque langue.
- **Captures d'écran** dans chaque langue (B6).
- **Politique de confidentialité** et **conditions** (B3, I-5) : au moins en français et en anglais, idéalement en 5 langues.
- **Notifications** : le jeu n'en envoie aucune aujourd'hui. Si un rappel « Ta récompense du jour t'attend » est ajouté plus tard, il faudra le traduire
  et déclarer la permission de notification (Android 13 et plus).
- **Message de consentement publicitaire** (UMP) : traduit automatiquement par Google.
- **Qui** : 🤖 rédige, 👤 relit et colle dans la Play Console · **Effort** : ⏱⏱

### I-12. Tester sur de vrais téléphones (6. Performance)
- Les mesures ont été faites dans un navigateur ralenti, sur un ordinateur sans carte graphique. Indispensable avant le lancement :
  - un **Android d'entrée de gamme** (2 Go de mémoire) et un récent ;
  - en Duel réel entre deux téléphones : jamais réussi depuis l'environnement de test, à cause du réseau ;
  - le bouton Retour, les vibrations, le son en arrière-plan, la reprise après un appel.
- Si c'est saccadé sur l'entrée de gamme (21 images/s mesurées en simulation 6 fois plus lente) : 🤖 Claude Code peut ajouter un mode « effets réduits »
  automatique (moins de particules, image un peu moins fine).
- Le **test fermé** de Google Play sert justement à ça (voir E9).
- **Qui** : 👤 Toi (et tes testeurs) · **Effort** : ⏱⏱

---

## 🟢 OPTIONNEL

- **O-1. Relecture des traductions** par des locuteurs natifs (liste des doutes dans `à faire.md`, « Textes et langues ») : Tonnerre non traduit,
  tutoiement / vouvoiement des personnages, espagnol d'Espagne ou d'Amérique latine, « Story » / « Geschichten » en allemand. 👤 · ⏱⏱
- **O-2. Nombres en espagnol** : « 1234 » sans séparateur, mais « 12.345 » avec (règle normale de l'espagnol, gérée par le téléphone). Correct, juste surprenant. Rien à faire.
- **O-3. Sprite du mannequin de la leçon** (`assets/ennemis/mannequin.svg`, poteau de bois et sac de paille) : aujourd'hui dessiné en code. 🎨 · ⏱
- **O-4. Portrait du sbire** (`assets/portraits/sbire_ombrace.svg`) : provisoire, tiré de la planche de combat. 🎨 · ⏱
- **O-5. Idées de game design restées ouvertes** (`à faire.md`) :
  - « ? » d'aide sur les cartes Armes, Talisman et Duel ;
  - proposer « Commence par l'histoire d'Aldric » après la leçon ;
  - revanche en fin de Duel entre amis ;
  - écran de fin du Voyage en deux temps ;
  - annonce plus claire « Histoire d'Eldan : bientôt ».
  🤖 · ⏱⏱
- **O-6. Musiques plus légères** : 18 Mo sur 31. Les ré-encoder un peu plus compressées (même qualité perçue sur un téléphone) réduirait le téléchargement. 🤖 · ⏱
- **O-7. Jeu installable et jouable hors ligne sur le web** (service worker) : inutile si la version web est retirée (I-6). 🤖 · ⏱⏱

---

## Décisions en attente (8.)

| N° | Question | Où en est-on |
|---|---|---|
| D-1 | **Pseudos uniques ?** Aujourd'hui, deux joueurs peuvent s'appeler « Alpha ». | Ouvert depuis le 29/09 (G8). Demande un registre des pseudos au serveur. |
| D-2 | **Public visé : plus de 13 ans ?** (B9) | À décider avant de remplir la Play Console. |
| D-3 | **Version web** gardée, en démo ou retirée ? (I-6) | À décider. |
| D-4 | **Nom du paquet** Android (I-1) et **nom de l'application** traduit ou non (I-11). | ✅ Décidé : `com.cronos2a.troissignes`, « Three Signs » partout. |
| D-5 | **Polices** embarquées : exception à « ne pas modifier `organic.css` » ? (I-3) | À décider. |
| D-6 | **Histoire d'Eldan** : réellement prévue ? Sinon, retirer « bientôt disponible ». (I-7) | À décider. |
| D-7 | **Quand activer Blaze ?** Conseil : avant l'ouverture au public (B7), pas seulement pour les achats. | Décidé le 29/09 : « juste avant le Play Store ». À confirmer. |
| D-8 | **Espagnol** : d'Espagne (actuel) ou neutre pour l'Amérique latine ? | À décider. |
| D-9 | **Tonnerre** (taureau de Boran) traduit dans chaque langue (Thunder, Tuono, Trueno, Donner) ou gardé ? | À décider. |
| D-10 | **Talismans en Duel au hasard** : actifs (décidé le 29/09), à surveiller (avantage des anciens joueurs). | À réévaluer après le test fermé. |
| D-11 | **Mira** (plus solide que les autres, voulu) : comparer les rounds atteints par héros au classement. | À réévaluer après le test fermé. |
| D-12 | **Arbalète** (+12 à 17 % de score) et **Bâton de sève** : à surveiller. | À réévaluer après le test fermé. |
| D-13 | **Rythme des récompenses de connexion** (~4 800 or et 60 gemmes en 30 jours) et la question « Activer un boost ? » à chaque partie : gênante ? | À réévaluer après le test fermé. |

---

## Mes alertes (9.) — ce qui pourrait faire refuser le jeu ou casser le lancement

1. **Pas de suppression de compte** (B2) : refus quasi certain par Google, qui l'exige pour toute application qui crée un compte.
2. **Pas de politique de confidentialité** (B3) : refus certain.
3. **Pubs en mode test, ou clics sur tes propres pubs** (B5) : compte AdMob suspendu, revenus perdus.
4. **Achats hors de Google Play Billing** : interdit. Les gemmes doivent passer uniquement par Billing dans l'application (B4).
5. **Formulaire « Sécurité des données » ou classification d'âge inexacts** (B9, B10) : refus ou retrait du jeu après coup.
   Ne pas oublier AdMob dans les données **partagées**.
6. **Quotas gratuits Firebase dépassés le jour du lancement** (B7) : Duel, sauvegardes et récompenses du jour en panne jusqu'au lendemain.
   Le jeu ne plante pas (il passe en « hors connexion »), mais l'expérience est mauvaise.
7. **Progression et gemmes achetées perdues** en changeant de téléphone (B1) : remboursements et mauvaises notes.
8. **Données de test restées au serveur** (B8) : deux faux joueurs à 5 000 Empreintes en tête du classement Duel, salons fantômes.
9. **Clé Firebase non restreinte et sans App Check** (I-2), avec Blaze actif : un script malveillant pourrait remplir la base, et la facture monterait.
   L'alerte de budget limite la casse.
10. **Coffres payants** : bien déclarer « objets aléatoires achetés avec de l'argent réel » ; les garder désactivés en Belgique (déjà fait).
    Ne pas viser les moins de 13 ans avec des coffres payants.
11. **Bouton Retour d'Android** dans l'application (I-1) : ✅ branché sur l'évènement Capacitor (04/10/2026) ; à essayer sur le téléphone (EMBALLAGE 6.3).
12. **Polices Google Fonts** (I-3) : risque RGPD faible mais réel en Europe, et apparence dégradée hors connexion.

---

## Tes étapes (en français simple, une par une)

### E1. Créer ton compte développeur Google Play (si ce n'est pas fait)
1. Va sur play.google.com/console et connecte-toi avec le compte Google qui possédera le jeu.
2. Choisis « Personnel » ou « Organisation » (organisation : il faut un numéro D-U-N-S, plus long à obtenir).
3. Paie les frais d'inscription uniques (25 $ US).
4. Vérifie ton identité (pièce d'identité) et ton numéro de téléphone. Compte quelques jours.
5. Si le compte est **personnel** et récent, Google impose un **test fermé de 14 jours avec au moins 12 testeurs** avant de pouvoir publier
   pour tout le monde (voir E9). Prévois-le dans ton calendrier.

### E2. Créer l'application dans la Play Console
1. Play Console → « Créer une application ».
2. Nom : « Three Signs » (titre jamais traduit). Langue par défaut : français. Type : Jeu. Gratuit.
3. Coche les déclarations (règlement, lois d'export).
4. Dans « Configuration de l'application », remplis dans l'ordre :
   - accès à l'application (tout est accessible sans identifiant) ;
   - annonces (« Oui, contient des annonces ») ;
   - classification du contenu (E7) ;
   - public cible (B9) ;
   - sécurité des données (E6) ;
   - politique de confidentialité (lien de B3) ;
   - suppression de compte (lien de B2).

### E3. Préparer la connexion Google dans Firebase (pour B1)
**Pour le jeu sur le web (à faire maintenant)**
1. Ouvre console.firebase.google.com → projet « trois-signes ».
2. **Authentication** → onglet **Méthode de connexion** (Sign-in method) → **Ajouter un fournisseur** → **Google** → **Activer**.
   Choisis ton adresse e-mail d'assistance (elle s'affiche aux joueurs dans la fenêtre Google) → **Enregistrer**.
   Laisse **Anonyme** activé : c'est lui qui crée le compte au premier lancement.
3. **Authentication** → **Paramètres** → **Domaines autorisés** : `localhost` et `trois-signes.firebaseapp.com` y sont déjà ;
   **ajoute l'adresse où le jeu est publié** (par exemple `cronos2a.github.io`), sinon la fenêtre Google refuse de s'ouvrir.
4. **Authentication** → **Paramètres** → **Association de comptes utilisateur** : garde **« Associer les comptes qui utilisent la même adresse
   e-mail »** (réglage par défaut).
5. Rien d'autre côté web : la clé et `authDomain` sont déjà dans `data/online.json`.

**Pour l'application Android (au moment de l'emballage)**
6. Paramètres du projet (roue dentée) → **Vos applications** → **Ajouter une application** → **Android**.
7. Nom du paquet : `com.cronos2a.troissignes` (pas à pas complet : `docs/EMBALLAGE.md`, étape 5).
8. **Empreintes SHA-1** (Paramètres du projet → ton application Android → **Ajouter une empreinte**) : la connexion Google d'Android ne marche
   que pour une application signée par une clé dont l'empreinte est enregistrée ici. Il en faut **trois** :
   - la clé de **débogage** (pour les essais sur ton téléphone) : `tools\android\empreintes.ps1` sur ton PC ;
   - ta clé d'**importation** (celle avec laquelle tu signes l'APK/AAB envoyé au Play Store) ;
   - la clé de **signature de l'application** gérée par Google : Play Console → ton application → **Test et publication** → **Intégrité de l'application**
     → **Signature de l'application** → « Certificat de la clé de signature de l'application » → SHA-1.
   Sans la bonne empreinte : erreur « DEVELOPER_ERROR » / code 10 au moment de choisir le compte Google.
9. Télécharge le fichier **`google-services.json`** et donne-le à Claude Code (il va dans `android/app/`). À retélécharger après chaque ajout d'empreinte.
10. Ce qui diffère dans l'application : pas de fenêtre web ; le jeu passe par l'extension `@capacitor-firebase/authentication`
    (sélecteur de comptes Google d'Android), puis relie le compte avec `linkWithCredential`. ✅ Installée et configurée le 04/10/2026
    (`rgcfaIncludeGoogle`, `skipNativeAuth`) ; à essayer sur le téléphone dès que `google-services.json` est fourni.

### E4. Restreindre la clé Firebase (I-2)
1. Va sur console.cloud.google.com, projet « trois-signes ».
2. Menu → API et services → Identifiants → clique sur la clé « Browser key » (ou « Android key »).
3. « Restrictions relatives aux applications » : choisis **« Sites web »** (pas « Applications Android » : dans l'application, le jeu
   utilise Firebase par la WebView, depuis l'adresse interne `https://localhost`). Ajoute : `https://localhost/*` (l'application Android),
   `https://cronos2a.github.io/*` (le site) et `http://localhost:8123/*` (tests sur ton PC).
   (La clé « Android key » créée par Firebase avec `google-services.json` sert au module de connexion Google : celle-là peut être
   limitée à « Applications Android », paquet `com.cronos2a.troissignes` + empreintes SHA-1.)
4. « Restrictions relatives aux API » : « Restreindre la clé », coche *Identity Toolkit API*, *Cloud Firestore API*, *Token Service API*.
5. Enregistre. Préviens Claude Code pour qu'il vérifie que le jeu se connecte toujours.

### E5. AdMob (B5)
1. Va sur admob.google.com, connecte-toi avec le même compte Google, et accepte les conditions.
2. Applications → « Ajouter une application » → Android → choisis « Three Signs » une fois publiée sur le Play Store
   (sinon, « pas encore publiée » et tu la relies plus tard).
3. Dans l'application : « Blocs d'annonces » → « Ajouter » → **Avec récompense** (nom : « Récompense ») → crée.
   Recommence avec **Interstitiel** (nom : « Fin du Voyage »).
4. Note les 3 identifiants : celui de l'application (`ca-app-pub-…~…`) et les deux blocs (`ca-app-pub-…/…`). Donne-les à Claude Code.
5. Confidentialité et messages → « Messages RGPD » → crée un message pour l'application (langues : français, anglais, italien, espagnol, allemand) → Publier.
6. Paramètres → Paiements : renseigne ton adresse et ton compte bancaire (paiement à partir de 70 €).
7. **Ne clique jamais** sur tes propres pubs réelles.

### E6. Remplir « Sécurité des données » (B10)
1. Play Console → ton application → Règles et programmes → Contenu de l'application → Sécurité des données → Commencer.
2. « Votre application collecte-t-elle ou partage-t-elle des données ? » → Oui.
3. « Toutes les données sont chiffrées en transit ? » → Oui.
4. « Les utilisateurs peuvent-ils demander la suppression ? » → Oui (après B2).
5. Coche les types du tableau B10 :
   - « Identifiants de l'appareil ou autres » (partagés : publicité) ;
   - « Identifiants de l'utilisateur » ;
   - « Autres actions dans l'application » ;
   - « Historique d'achats » (quand les achats seront branchés).
6. Pour chacun, indique : collecté (oui), partagé (seulement l'identifiant de l'appareil, pour AdMob), finalité (fonctionnement ou publicité),
   obligatoire ou facultatif (comme dans le tableau).
7. Enregistre, vérifie l'aperçu, puis envoie.

### E7. Classification du contenu (B9)
1. Contenu de l'application → Classification du contenu → Commencer → adresse e-mail → catégorie « Jeu ».
2. Réponds selon B9 :
   - violence de dessin animé ou fantastique : oui, sans sang ;
   - interaction entre utilisateurs : oui (pseudos visibles), sans discussion ;
   - achats numériques : oui ;
   - objets aléatoires payants : oui.
3. Envoie : tu obtiens automatiquement les classifications (PEGI, ESRB…).

### E8. Effacer les données de test (B8), juste avant l'ouverture au public
1. Firebase → Firestore Database → onglet « Données ».
2. Pour chaque collection (`players`, `leaderboard`, `ranked`, `queue`, `duels`, `wallet`, `runs`, `daily`) : clique sur les 3 points à côté du nom
   → « Supprimer la collection » → tape le nom pour confirmer.
3. Firebase → Authentication → Utilisateurs : sélectionne tous les comptes (case en haut) → Supprimer.
   S'il y en a beaucoup, demande à Claude Code un petit script.
4. Ne touche pas aux **Règles** : elles restent.

### E9. Test fermé (obligatoire pour un compte personnel récent)
1. Play Console → Tests → Test fermé → Créer un canal → ajoute une liste de testeurs (adresses Gmail, au moins 12).
2. Envoie le fichier AAB préparé par Claude Code → « Examiner la version » → « Lancer le déploiement ».
3. Partage le lien d'inscription aux testeurs. Ils doivent rester inscrits et ouvrir le jeu **pendant 14 jours**.
4. Récolte leurs retours (bugs, difficulté, Mira, rythme des récompenses : décisions D-10 à D-13).
5. Ensuite : Production → Créer une version → même AAB (ou une version corrigée) → envoyer pour examen.
   L'examen prend de quelques heures à quelques jours.

### E10. Activer Blaze et l'alerte de budget (B7)
1. Firebase → en bas à gauche « Spark » → « Modifier le forfait » → **Blaze** → ajoute une carte bancaire.
2. Google Cloud → Facturation → Budgets et alertes → « Créer un budget » → montant 20 € par mois → alertes à 25 %, 50 %, 100 % → Enregistrer.
3. Préviens Claude Code : il pourra alors écrire la vérification des achats (B4) et brancher App Check (I-2).

---

## Coquilles relevées (non corrigées)
- `à faire.md`, section « Textes et langues » : « seul le français existe » est dépassé (les 5 langues existent).
- `à faire.md`, section « Améliorations souhaitables » : certains points sont déjà réglés mais pas barrés :
  - « Niveau des héros beaucoup trop lent » et « Or très lent » (rééquilibrés le 30/09) ;
  - « Esquive Perfect = 100 % » (plafonnée à 90 % le 30/09) ;
  - G11, « coffre vide de l'arène découverte » (corrigé le 30/09).
- `CLAUDE.md`, section « Duel contre un ami » : « Pas encore de contrôle des scores… voir « À prévoir » ci-dessus » ; depuis, ce contrôle est fait par les règles
  (section « Sécurité »), et il n'y a pas de rubrique « À prévoir ».

Ce sont des notes de suivi, pas des textes du jeu : à nettoyer lors de la prochaine mise à jour des documents.

---

## Les 10 points les plus urgents

1. **B2** — Bouton « Supprimer mon compte et mes données » + lien web de demande (🤖 + 👤).
2. **B3** — Politique de confidentialité en ligne + lien dans les Réglages (🤖 rédige, 👤 publie).
3. **B1** — Liaison du compte à Google, pour ne plus perdre la progression ni les achats (🤖 + 👤 E3).
4. **E1 / E9** — Ouvrir ton compte développeur et lancer le **test fermé de 14 jours** au plus tôt : c'est le plus long à attendre (👤).
5. **B6** — Icône adaptative, écran de démarrage, image de présentation, captures d'écran (🎨 + 🤖).
6. **I-1** — Emballage Capacitor : nom du paquet (D-4), permissions, bouton Retour, AAB signé (🤖).
7. **B7 / E10** — Activer Blaze avec une alerte de budget **avant** l'ouverture au public (👤).
8. **B5 / E5** — AdMob : vrais identifiants, message de consentement, mode test coupé dans la version publiée (👤 + 🤖).
9. **B4** — Achats Google Play : 5 produits dans la Play Console, vérification des reçus au serveur, prix fournis par Google (👤 + 🤖).
10. **B9 / B10 / B8** — Public visé, classification d'âge, sécurité des données ; puis effacer les données de test juste avant le lancement (👤).
