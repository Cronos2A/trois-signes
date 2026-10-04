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
