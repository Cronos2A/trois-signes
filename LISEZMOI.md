# Jeu Trois Signes — dossier du projet

| Fichier | À quoi il sert |
|---|---|
| `index.html` + `src/` | Le jeu, découpé en modules (étapes 1 et 2 faites). |
| `data/*.json` | Tous les chiffres d'équilibrage : niveaux de réussite, personnage, ennemis, vagues, règles de combat. |
| `prototype/trois-signes-prototype.html` | Le prototype d'origine (version 2), gardé comme référence. Sur Android : Mes fichiers, puis ouvrir avec Chrome. |
| `docs/Dossier_conception_jeu_mobile.pdf` | Le dossier de conception complet (version 2). |
| `CLAUDE.md` | Le brief pour Claude Code. |

## Lancer le jeu
Le jeu charge ses fichiers `data/*.json` : il ne s'ouvre plus en double-cliquant sur `index.html`, il faut un petit serveur.

Sur l'ordinateur, dans ce dossier :

```
py -m http.server 8123
```

puis ouvrir http://localhost:8123 dans le navigateur (mode téléphone des outils de développement, 390 × 800).

Sur le téléphone (même Wi-Fi) : `py -m http.server 8123 --bind 0.0.0.0`, puis ouvrir `http://<adresse IP du PC>:8123` dans Chrome.

## Régler l'équilibrage
Modifier les fichiers de `data/`, puis recharger la page. Rien n'est en dur dans le code, sauf les seuils de reconnaissance des gestes (`src/input/gestures.js`, objet `TUNING`).
