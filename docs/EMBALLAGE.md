# Emballage Android de Three Signs (Capacitor)

Ce guide dit **ce que tu fais toi-même**, étape par étape, et ce que tu dois voir à l'écran.
Tout ce qui est en `police fixe` se tape ou se copie tel quel.

## Android Studio ou ligne de commande ?

**Tu n'as pas besoin d'ouvrir Android Studio.** Tout se compile en ligne de commande, avec deux scripts prêts dans
`tools/android/` (PowerShell, sous Windows) :

- `apk.ps1` : fabrique l'APK de test et l'installe sur ton téléphone branché en USB ;
- `aab.ps1` : fabrique le fichier AAB signé à envoyer à la Play Console.

Android Studio sert seulement à fournir le **SDK Android** et le **Java** dont la compilation a besoin (il est déjà installé : c'est parfait).
Tu pourras l'ouvrir plus tard si tu veux voir les journaux du téléphone (Logcat), mais ce n'est pas obligatoire.

Pourquoi ce n'est pas moi qui compile : dans mon environnement de travail en ligne, les serveurs de Google qui fournissent le SDK
Android (`dl.google.com`) sont bloqués, et de toute façon la **clé de signature doit rester chez toi**, jamais sur un serveur.
Je prépare donc tout le projet ; ton PC le compile et le signe.

### Tes étapes, dans l'ordre
1. Préparer le PC : Node.js, `npm install` (**1.1**).
2. Créer la clé d'envoi et la sauvegarder à 2 endroits (**4.1**, **4.2**).
3. Fabriquer une première fois l'APK de test sur ton téléphone (**4.4**, **6.2**) : cela crée aussi la clé de débogage.
4. Lire les deux empreintes SHA-1 (**4.5**).
5. Ajouter l'application Android dans Firebase, télécharger `google-services.json` et me le donner (**5.1**, **5.2**).
6. Refaire l'APK, tester sur le téléphone (**5.3**, **6.3**, **6.4**).
7. Fabriquer l'AAB signé et l'envoyer en test interne dans la Play Console (**4.4**).
8. Après ce premier envoi : ajouter la 3e empreinte (signature Google Play) dans Firebase (**5.4**).

---

## 0. Exigences de Google Play (vérifiées le 04/10/2026)

| Exigence | Ce que dit Google | Ce qui est appliqué dans le projet |
|---|---|---|
| **Niveau d'API cible** | Depuis le **31 août 2026**, toute nouvelle application et toute mise à jour doit cibler **Android 16 (API 36)** ou plus (extension possible jusqu'au 1er novembre 2026). — [developer.android.com/google/play/requirements/target-sdk](https://developer.android.com/google/play/requirements/target-sdk) | `targetSdkVersion = 36`, `compileSdkVersion = 36` (`android/variables.gradle`) |
| **Pages mémoire de 16 Ko** | Toute application ciblant Android 15 (API 35) ou plus doit être compatible 16 Ko sur les appareils 64 bits ; à partir du **1er février 2027**, une mise à jour non compatible est refusée. Il faut le plugin Gradle Android **8.5.1 ou plus** (alignement des bibliothèques natives) et le NDK r28 ou plus si on compile du code natif. — [developer.android.com/guide/practices/page-sizes](https://developer.android.com/guide/practices/page-sizes) | Plugin Gradle Android **8.13.0** ; le jeu n'a **aucun code natif** (.so) à lui : WebView + Java seulement, donc compatible d'office. Vérification après compilation : voir l'étape 6. |
| **Format AAB** | Depuis **août 2021**, une nouvelle application doit être publiée en **Android App Bundle** (AAB) ; Google génère et signe ensuite les APK. — [developer.android.com/guide/app-bundle](https://developer.android.com/guide/app-bundle) | `aab.ps1` fabrique `app-release.aab`, signé avec ta clé d'envoi ; la signature finale est faite par Google (« signature d'application par Google Play »). |
| Version minimale | Pas d'obligation de Google ; Capacitor 8 demande Android 7 (API 24). | `minSdkVersion = 24` |

La page d'aide de la Play Console (support.google.com/googleplay) n'est pas joignable depuis mon environnement : les chiffres ci-dessus viennent
des pages officielles de developer.android.com (mises à jour le 01/10/2026 et le 16/09/2026). Si la Play Console affiche autre chose le jour de
l'envoi, c'est elle qui a raison : dis-le-moi.

---

## 1. Le projet Capacitor (déjà prêt dans le dépôt)

- Paquet : **`com.cronos2a.troissignes`** (définitif). Nom affiché : **« Three Signs »**.
- Capacitor **8.5.2** et 6 modules seulement : App (bouton Retour, mise en arrière-plan), Haptics (vibrations), Browser (liens des
  Réglages), Splash Screen (écran de démarrage), Status Bar (barre d'état), `@capacitor-firebase/authentication` (connexion Google native).
- **Dossier de build `www/`** (`npm run www` → `tools/android/build-www.mjs`) : seulement `index.html`, `manifest.webmanifest`, `src/`,
  `data/`, `assets/` (images, sons, polices et leurs licences). Jamais `design/`, `docs/`, `legal/`, `prototype/`, `tools/`, les tests, les PDF,
  les notes (`*.md`), ni la source de l'icône. Le script refuse de continuer si `data/economy.json → test.autorise` vaut `true`.
- **Poids** : `www/` = **30,0 Mo** (362 fichiers : sons 19 Mo, images ≈ 9 Mo, code 1,6 Mo, données et 5 langues 0,6 Mo).
  L'application installée fera environ 35 Mo (WebView, modules Capacitor et Google en plus) ; le téléchargement depuis le Play Store
  sera un peu plus petit (compression).
- **Tout le jeu est dans l'application** : textes des 5 langues, données, images, sons, polices. Rien n'est téléchargé au démarrage,
  sauf Firebase (connexion au compte, sauvegarde en ligne, Duel, classements).

### 1.1 Préparer ton PC (une seule fois)

1. **Installer Node.js** (s'il n'est pas déjà là) : va sur [nodejs.org](https://nodejs.org), télécharge la version « LTS », installe-la
   en laissant tout par défaut.
   Vérification : ouvre **PowerShell** (touche Windows, tape `PowerShell`, Entrée) et tape `node -v`.
   Tu dois voir un numéro comme `v22.x.x` ou plus.
2. **Récupérer le dépôt** dans un dossier, par exemple `C:\Jeux\trois-signes` (avec GitHub Desktop ou `git clone`).
3. Dans PowerShell, va dans ce dossier puis installe les modules (une seule fois, et après chaque mise à jour de `package.json`) :
   ```
   cd C:\Jeux\trois-signes
   npm install
   ```
   Tu dois voir à la fin une ligne du genre `added 190 packages`. Des lignes `npm warn` sont normales.
4. **Autoriser les scripts PowerShell** du dépôt (une seule fois) :
   ```
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```
   Réponds `O` (ou `Y`) si une question s'affiche.

Le Java et le SDK Android sont trouvés tout seuls par les scripts : le Java fourni avec Android Studio
(`C:\Program Files\Android\Android Studio\jbr`) et ton SDK (`C:\Users\croga\AppData\Local\Android\Sdk`).

---

## 2. Comportement dans l'application (déjà fait dans le code)

Tout est dans `src/native.js` (rien ne s'y exécute sur le web) et `src/game/lifecycle.js` :

- **Bouton Retour** : la même logique que sur le web (`src/ui/back.js`). En partie : « Quitter la partie ? » ; en Duel : l'information
  « Impossible de quitter un Duel en cours… » ; dans un menu : il le ferme ; sur l'onglet Jouer sans rien d'ouvert : l'application passe en
  arrière-plan (comme toute application Android).
- **Arrière-plan, écran verrouillé, fermeture** : la musique et les sons sont coupés, et repris au retour. En Duel, la règle d'absence de
  30 s s'applique : un dernier signe de vie part au passage en arrière-plan ; au retour avant 30 s, le Duel continue ; après, c'est la défaite.
  Si l'application est fermée (balayée), le Duel est repris à la réouverture (ou son résultat est montré une fois).
- **Vibrations** : par le module Haptics, seulement si « Vibrations : Oui » dans les Réglages.
- **Portrait verrouillé** ; barre d'état et barre de navigation transparentes, le jeu se place dans les **zones sûres** (encoche comprise).
  Sur les grandes tablettes, Android 16 peut ignorer le verrouillage : l'écran « Tourne ton téléphone » du jeu prend alors le relais.
- **Liens des Réglages et des Crédits** (confidentialité, conditions, suppression du compte) : ouverts dans le navigateur intégré, à
  l'adresse publique `https://cronos2a.github.io/trois-signes/legal/…` (`data/version.json → legalBase`) — les pages ne sont pas dans
  l'application. **Le site doit donc être publié** (voir `AVANT_PUBLICATION.md`).
- **Outils de développement coupés** : dans l'application, l'adresse interne est `https://localhost`, mais le mode test (Réglages de test,
  +1000 or, jour simulé…) et les fausses pubs sont **toujours coupés** dès que le jeu tourne dans l'application native, même si
  `test.autorise` valait `true` (vérifié). Et le script de build refuse de fabriquer l'application si `test.autorise` vaut `true`.
- **Pubs et achats pas encore branchés** : boutons de pub de la boutique (« +5 gemmes », « Coffre gratuit »), packs de gemmes et
  « Sans publicité » affichent **« Bientôt »** et ne donnent rien. « Doubler l'or », la pub du jour et la Seconde chance restent masqués,
  comme sur le site.
- **Sécurité réseau** : trafic non chiffré (`http://`) interdit (`usesCleartextTraffic="false"` et `network_security_config.xml`).
- **Sauvegarde** : la progression est gardée dans la WebView de l'application (`localStorage`, `ts_prog`) et survit à la fermeture et au
  redémarrage du téléphone ; elle est aussi envoyée au serveur (Firebase). **À la désinstallation**, Android efface tout ce que l'application
  avait sur le téléphone, y compris le compte anonyme : la progression n'est retrouvée que si elle était **sauvegardée avec Google**
  (Réglages → Compte → « Sauvegarder ma progression avec Google »), puis « Se connecter avec Google » après réinstallation. La sauvegarde
  automatique d'Android est désactivée exprès (`allowBackup="false"`), pour ne jamais restaurer un vieux compte anonyme à moitié.

### Manifeste final (`android/app/src/main/AndroidManifest.xml`)

| Élément | Valeur |
|---|---|
| Permissions | `INTERNET` (Firebase) ; `VIBRATE` ajoutée par le module Haptics (aucune demande au joueur). **Rien d'autre.** |
| Retirées de force | identifiant publicitaire (`AD_ID`, `ACCESS_ADSERVICES_*`), localisation, notifications (`tools:node="remove"`) |
| Activité | une seule, `MainActivity`, portrait (`screenOrientation="portrait"`), `singleTask` |
| Réseau | `usesCleartextTraffic="false"`, `networkSecurityConfig` (https seulement) |
| Sauvegarde Android | `allowBackup="false"`, `fullBackupContent="false"`, `dataExtractionRules` : rien n'est copié |
| SDK | min 24 (Android 7), cible 36 (Android 16) |

Pour vérifier le manifeste réellement fusionné après compilation : étape 6.4.

---

## 3. Icône et écran de démarrage

- **Source unique** : `assets/icone-app/icone.svg` (icône provisoire : le rond jaune, le triangle orange et le point du toucher, sur un fond
  vert foncé facetté, contours épais comme dans le jeu). Mode d'emploi : `assets/icone-app/LISEZMOI.md`.
- **Tout est régénéré** par `npm run icons` (`tools/android/icons.mjs`) : icône adaptative (fond + logo + icône monochrome pour le thème
  d'Android 13), icônes rondes et carrées des anciens Android, écran de démarrage d'Android 12+ (fond vert foncé `#174A28` + logo) et
  d'Android 7 à 11 (image plein écran), et l'icône 512 × 512 de la fiche Play Store (`assets/icone-app/sortie/`).
- **Quand tu auras la vraie icône** : remplace `icone.svg` (ou dépose un `icone.png` de 1024 × 1024), puis dans PowerShell :
  ```
  npm run icons
  ```
  Tu dois voir : `Icône et écran de démarrage régénérés depuis assets/icone-app/icone.svg.` Puis recompile l'application.
- L'écran de démarrage disparaît dès que le lobby est prêt (au plus 5 s).

---

## 4. Signature, versions, APK et AAB

### 4.1 Créer la clé d'envoi (une seule fois dans la vie du jeu)

La **clé d'envoi** (« upload key ») prouve à Google que c'est bien toi qui envoies une nouvelle version. Google garde de son côté la vraie
clé de signature de l'application (« signature d'application par Google Play ») : si tu perdais ta clé d'envoi, Google peut la remplacer,
mais c'est long. **Elle ne va jamais dans le dépôt GitHub** (les fichiers `*.jks` sont refusés par `.gitignore`).

1. **Prépare le mot de passe AVANT** : invente un mot de passe long (au moins 12 caractères) et **note-le dans ton gestionnaire de mots de
   passe** (Bitwarden, le coffre de Google, ou une feuille rangée à part). Jamais dans un fichier du jeu, jamais dans un message.
2. Dans PowerShell, dans le dossier du jeu :
   ```
   tools\android\cle.ps1
   ```
3. `keytool` pose des questions (en français si Windows est en français) :
   - « Entrez le mot de passe du fichier de clés » : tape ton mot de passe (rien ne s'affiche, c'est normal), Entrée, puis une 2e fois ;
   - « Quels sont vos nom et prénom ? » : `Cronos2A` (ou ton nom) ; unité, organisation, ville, région : ce que tu veux ;
     « code pays » : `FR` ;
   - « Est-ce CN=… correct ? » : `oui` ;
   - s'il demande un mot de passe pour la clé `upload` : appuie sur Entrée (même mot de passe).
4. Le script demande de **retaper le mot de passe** pour afficher les empreintes. Tu dois voir :
   ```
   Clé créée : C:\Users\croga\.three-signs\three-signs-upload.jks
   SHA-1   : 9E:27:33:…:B6:DC   (20 paires de caractères)
   SHA-256 : B0:65:4F:…:9E:F2   (32 paires)
   ```
   **Copie la valeur SHA-1** (sans « SHA-1 : ») : elle sert à l'étape 5. Les empreintes s'affichent quelle que soit la langue
   de Windows (keytool est lancé en anglais et les empreintes sont reconnues à leur forme).

Le fichier `C:\Users\croga\.three-signs\keystore.properties` est créé à côté : il dit seulement où est la clé et son nom (`upload`),
**sans mot de passe** (le mot de passe est demandé à chaque fabrication de l'AAB et n'est jamais écrit).

### 4.2 Sauvegarder la clé en 2 endroits (obligatoire)

Copie le dossier `C:\Users\croga\.three-signs` (il contient `three-signs-upload.jks`) :
1. **sur une clé USB** (ou un disque externe) que tu ranges chez toi ;
2. **dans un coffre en ligne** : Google Drive ou OneDrive, dans un dossier privé (le fichier est lui-même protégé par son mot de passe).

Le mot de passe reste dans ton gestionnaire de mots de passe, **pas** à côté du fichier. Vérifie une fois que la copie s'ouvre :
`tools\android\empreintes.ps1` doit afficher le même SHA1.

### 4.3 Versions : `data/version.json`

- `version` (ex. `0.9.0`) devient le **versionName** (le numéro affiché dans le Play Store et dans les Réglages du jeu).
- `build` (ex. `1`) devient le **versionCode** : un entier que Google exige **plus grand à chaque envoi**.
- **À chaque nouvel envoi à la Play Console** : ouvre `data/version.json`, ajoute 1 à `build` (1 → 2 → 3…), change `version` si tu
  veux (ex. `0.9.1`), et mets à jour `date`. Puis fabrique l'AAB. `aab.ps1` affiche les deux numéros et demande confirmation.
- Un APK de test peut être réinstallé sans changer ces numéros.

### 4.4 Fabriquer l'APK de test et l'AAB

**APK de test** (signé automatiquement avec la clé de débogage de ton PC, à installer sur ton téléphone) :
```
tools\android\apk.ps1
```
La première fois, compte **5 à 15 minutes** : Gradle télécharge ses outils et Android Studio peut ajouter « Android 16 (API 36) » au SDK.
Tu dois voir à la fin : `APK prêt : …\app-debug.apk (≈ 40 Mo)`, puis `Installé et lancé sur le téléphone : Three Signs.`
(installation détaillée à l'étape 6.2).

**AAB de production signé** (pour la Play Console) :
```
tools\android\aab.ps1
```
1. Il affiche `Version : 0.9.0   versionCode : 1` : réponds `o` si c'est bien le numéro voulu.
2. Il demande le **mot de passe de la clé d'envoi** (rien ne s'affiche quand tu tapes).
3. À la fin : `jar verified.` puis `AAB prêt : C:\Jeux\trois-signes\three-signs-0.9.0-1.aab (≈ 35 Mo)`.
   Ce fichier ne va pas dans GitHub (refusé par `.gitignore`).

En cas d'erreur « licences non acceptées » ou « SDK platform 36 not found » : ouvre Android Studio → **More Actions** (ou File) →
**SDK Manager** → onglet **SDK Platforms** → coche **Android 16 (API 36)** → **Apply** → accepte la licence. Puis relance le script.

### 4.5 Empreintes SHA-1

```
tools\android\empreintes.ps1
```
Tu dois voir deux blocs, chacun avec une ligne verte `SHA-1   : …` et une ligne `SHA-256 : …` :
- **clé de DÉBOGAGE** (`C:\Users\croga\.android\debug.keystore`, créée par la première compilation) : pour la connexion Google dans l'APK de test ;
- **clé d'ENVOI** (demande son mot de passe) : pour l'AAB.

Je ne peux pas te donner ces empreintes moi-même : les deux clés sont créées sur ton PC (et doivent y rester). Envoie-moi les deux lignes
`SHA-1` si tu veux que je les note dans `AVANT_PUBLICATION.md` (une empreinte n'est pas un secret).

---

## 5. Firebase pour l'application Android (connexion Google native)

Dans l'application, le jeu garde le même Firebase que sur le web (compte anonyme, sauvegarde, Duel) ; seule la **fenêtre Google** change :
c'est le sélecteur de comptes d'Android (module `@capacitor-firebase/authentication`), puis le compte est relié comme sur le web.
Pour que Google accepte, Firebase doit connaître **le nom du paquet** et **l'empreinte SHA-1** de la clé qui a signé l'application.

### 5.1 Ajouter l'application Android dans la console Firebase
1. Va sur [console.firebase.google.com](https://console.firebase.google.com) → projet **trois-signes**.
2. Roue dentée (en haut à gauche) → **Paramètres du projet** → onglet **Général** → en bas, **Vos applications** → **Ajouter une application**
   → l'icône **Android**.
3. **Nom du package Android** : `com.cronos2a.troissignes` (exactement). **Pseudo de l'application** : `Three Signs`.
   **Certificat de signature SHA-1** : colle la valeur SHA-1 de la clé de **débogage** (`tools\android\empreintes.ps1`, étape 4.5).
   → **Enregistrer l'application**.
4. Écran « Télécharger le fichier de configuration » : clique **Télécharger google-services.json**. Ignore les étapes suivantes de
   l'assistant (« Ajouter le SDK Firebase ») : c'est déjà fait. Clique **Suivant** jusqu'à **Accéder à la console**.
5. Retourne dans **Paramètres du projet** → ta nouvelle application Android → **Ajouter une empreinte** : colle la SHA1 de la clé
   d'**envoi**. Tu dois voir deux empreintes SHA-1 dans la liste.
6. **Authentication** → **Méthode de connexion** : **Google** doit être **Activé** (c'est déjà le cas pour le web), **Anonyme** aussi.
7. Après l'ajout des empreintes, **retélécharge** `google-services.json` (même bouton, dans la fiche de l'application Android) :
   il contient alors le client OAuth dont la connexion Google a besoin (`default_web_client_id`).

### 5.2 Me donner le fichier
- **Le plus simple** : dépose `google-services.json` dans `android\app\` (à côté de `build.gradle`), puis commit et push
  (ou envoie-le-moi dans la conversation et je le mets à sa place). Ce fichier n'est pas un secret : il contient les mêmes identifiants
  publics que `data/online.json`.
- Sans ce fichier, l'application se compile et tout marche **sauf** la connexion Google (le jeu affiche une erreur à ce moment-là).

### 5.3 Essayer sur ton téléphone
1. `tools\android\apk.ps1` (APK de test, signé par la clé de débogage).
2. Dans le jeu : Réglages → Compte → **Sauvegarder ma progression avec Google**. Tu dois voir le **sélecteur de comptes Google d'Android**
   (une fenêtre qui monte du bas, avec tes comptes), choisir ton compte, puis revenir dans le jeu avec « Progression sauvegardée avec Google ».
3. Si un message parle de « DEVELOPER_ERROR », « code 10 » ou « No credentials available » : l'empreinte SHA-1 de la clé de débogage manque
   dans Firebase, ou `google-services.json` n'a pas été retéléchargé après l'ajout. Refais 5.1 (étapes 5 et 7), recompile.

### 5.4 Après le premier envoi dans la Play Console : une 3e empreinte
Google re-signe l'application avec **sa propre clé** (« clé de signature de l'application »). Les joueurs qui installent depuis le
Play Store ont donc une application signée par Google : il faut aussi son empreinte.
1. Play Console → **Three Signs** → **Tester et publier** → **Configuration** → **Intégrité de l'application** → onglet
   **Signature de l'application**.
2. Copie la **SHA-1** du « **Certificat de la clé de signature de l'application** » (pas celle du « certificat de la clé d'importation »,
   qui est ta clé d'envoi, déjà ajoutée).
3. Ajoute-la dans Firebase (5.1, étape 5) et retélécharge `google-services.json`, puis envoie une nouvelle version (versionCode + 1).

---

## 6. Tests

### 6.1 Ce que j'ai vérifié de mon côté (04/10/2026)
Sans émulateur Android possible ici (SDK bloqué), le jeu a été testé dans Chromium **en se faisant passer pour l'application** (un faux
`window.Capacitor` qui envoie les mêmes évènements que le vrai : Retour, arrière-plan, vibrations…), en 360 × 640 et 390 × 800 :

| Point | Résultat |
|---|---|
| Premier lancement sans Internet | prologue puis leçon, aucune erreur ; seules les 4 requêtes vers Firebase échouent |
| Récompenses du jour hors connexion | « À récupérer dès que la connexion revient » |
| Bouton Retour | Réglages fermés ; onglet Jouer → application en arrière-plan ; en partie → « Quitter la partie ? » ; Retour sur la question → on continue ; en Duel → information |
| Arrière-plan / retour | musique et sons coupés puis repris |
| Vibrations | par Haptics (40 ms puis 70 ms) ; rien avec « Vibrations : Non » |
| Liens des Réglages | ouverts par Browser à `https://cronos2a.github.io/trois-signes/legal/…`, le jeu reste affiché |
| Outils de développement | aucun dans les Réglages, même avec `test.autorise` forcé à `true` et l'adresse `localhost` |
| Boutique | « Bientôt » sur les pubs, les packs de gemmes et Sans publicité |
| Rotation | paysage → « Tourne ton téléphone » ; retour en portrait → le jeu reprend |
| Zones sûres simulées | grand écran 412 × 915 (encoche 48 px, barre 34 px) et petit 360 × 640 (24 px, barre à 3 boutons 48 px) : bandeau du combat et boutons sous l'encoche et au-dessus de la barre ; sur le petit écran, le bas du lobby défile |
| Duel entre amis (application contre navigateur, émulateur Firebase) | arrière-plan 12 s → l'autre voit « Ton adversaire est déconnecté : 22 s », le Duel continue ; application fermée puis rouverte 10 s après → retour direct dans le Duel ; arrière-plan 36 s → DÉFAITE « Tu as été déconnecté plus de 30 s » / VICTOIRE pour l'autre |
| Fluidité, processeur 4 fois plus lent | mesurée le 03/10 : 60 images/s en combat et pendant les séquences de fin |

**Pas vérifiable ici, à faire sur ton téléphone** (6.3) : la compilation elle-même, le vrai sélecteur Google, les vraies vibrations, le son,
le verrouillage réel de l'écran et la fermeture par Android.

### 6.2 Installer l'APK sur ton Samsung
1. Sur le téléphone, le **débogage USB** est déjà activé (Paramètres → Options de développement).
2. Branche le téléphone en USB et **déverrouille-le**. La première fois, une fenêtre « Autoriser le débogage USB ? » apparaît sur le
   téléphone : coche « Toujours autoriser sur cet ordinateur » → **Autoriser**.
3. Sur le PC : `tools\android\apk.ps1`. À la fin : `Installé et lancé sur le téléphone : Three Signs.` L'icône Three Signs apparaît sur le
   téléphone et le jeu s'ouvre (écran vert foncé avec le logo, puis le prologue au premier lancement).
4. Si `Aucun téléphone` : débranche/rebranche, choisis le mode USB « Transfert de fichiers » dans la notification du téléphone, accepte la
   fenêtre de débogage, relance. Si `INSTALL_FAILED_UPDATE_INCOMPATIBLE` : une version signée autrement est déjà installée → désinstalle
   Three Signs du téléphone (appui long sur l'icône → Désinstaller), relance.
5. Sans câble : copie `android\app\build\outputs\apk\debug\app-debug.apk` sur le téléphone et ouvre-le (Android demandera d'autoriser
   « Installer des applications inconnues » pour l'application Fichiers).

### 6.3 Liste de vérification sur le téléphone
- [ ] **Premier lancement** : écran de démarrage vert + logo, prologue, leçon, pseudo.
- [ ] **Hors connexion** : mode avion, ferme et rouvre le jeu : le lobby s'affiche, un Voyage se joue ; Réglages → Compte « hors connexion ».
- [ ] **Connexion Google** (après l'étape 5) : Réglages → Compte → « Sauvegarder ma progression avec Google » → sélecteur Android.
- [ ] **Bouton Retour** (geste ou bouton) : ferme les menus ; en partie « Quitter la partie ? » ; en Duel le message d'information ;
      sur l'onglet Jouer, l'application passe en arrière-plan.
- [ ] **Rotation** : le jeu reste en portrait (rotation automatique activée sur le téléphone).
- [ ] **Audio** : musique et sons ; appuie sur le bouton d'accueil : le son s'arrête ; reviens : il reprend.
- [ ] **Vibrations** : un combo en Voyage, ou un KO, fait vibrer ; « Vibrations : Non » dans les Réglages : plus rien.
- [ ] **Récompenses de connexion** : fenêtre du jour, « Récupérer ».
- [ ] **Duel entre amis** avec un autre appareil (ou le site sur le PC) : pendant une vague, ferme l'application (bouton des applications
      récentes → balaie Three Signs), rouvre-la avant 30 s : retour dans le Duel. Recommence en attendant plus de 30 s : « Tu as été
      déconnecté plus de 30 s ».
- [ ] **Fluidité** : un Voyage jusqu'au gardien sans saccade.
- [ ] **Liens** : Réglages → « Politique de confidentialité » s'ouvre dans un navigateur intégré (le site doit être publié).

### 6.4 Vérifier l'APK (permissions et 16 Ko)
```
tools\android\verifier.ps1
```
Tu dois voir la liste des permissions : `android.permission.INTERNET`, `android.permission.VIBRATE`, et peut-être
`android.permission.ACCESS_NETWORK_STATE` et une permission `…DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` (ajoutées par les bibliothèques
Google, sans demande au joueur). Puis `Verification successful` pour l'alignement et
`Aucune bibliothèque native (.so) : compatible 16 Ko d'office.` Envoie-moi cette sortie : je l'ajouterai au manifeste final ci-dessus.

### 6.5 Si je dois compiler moi-même un jour
Mon environnement bloque `dl.google.com`. Pour que je puisse compiler et vérifier l'APK de mon côté, il faudrait ajouter `dl.google.com`
aux domaines autorisés de l'environnement (réglages de l'environnement dans Claude, « Network access »). La signature, elle, restera
toujours sur ton PC.
