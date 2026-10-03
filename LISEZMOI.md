# Three Signs — dossier du projet

Jeu mobile à gestes (Triangle, Rond, Toucher), en HTML/JS. Modes : Le Voyage (Solo infini), Histoire (6 héros × 10 combats),
Entraînement et « La première leçon » (tutoriel).

| Fichier | À quoi il sert |
|---|---|
| `index.html` + `src/` | Le jeu, découpé en modules. |
| `data/*.json` | Toutes les valeurs : héros, niveaux de réussite, ennemis, délais, Voyage, Histoire (textes), leçon, sons, crédits. |
| `assets/` | Images (portraits, ennemis, décors) et sons. État : `assets/IMAGES.md` et `assets/audio/SONS.md`. |
| `design/` | Maquettes Claude Design (design system Organic) servant de référence visuelle. |
| `prototype/trois-signes-prototype.html` | Le prototype d'origine (version 2), gardé comme référence. |
| `CLAUDE.md` | Le brief pour Claude Code : état du projet, règles, conventions, prochaines tâches. |
| `CREDITS.md` | Origine et licence des sons. |

Les documents de conception (PDF) ne sont pas dans le dépôt : le jeu n'en a pas besoin.

## Lancer le jeu
Le jeu charge ses fichiers `data/*.json` : il ne s'ouvre pas en double-cliquant sur `index.html`, il faut un petit serveur.

Sur l'ordinateur, dans ce dossier :

```
py -m http.server 8123
```

puis ouvrir http://localhost:8123 dans le navigateur (mode téléphone des outils de développement, 390 × 800).

Sur le téléphone (même Wi-Fi) : `py -m http.server 8123 --bind 0.0.0.0`, puis ouvrir `http://<adresse IP du PC>:8123` dans Chrome.

## Régler l'équilibrage
Modifier les fichiers de `data/`, puis recharger la page. Rien n'est en dur dans le code, sauf les seuils de reconnaissance
des gestes (`src/input/gestures.js`, objet `TUNING`).

## Ajouter une image ou un son
Déposer le fichier avec le nom attendu (listes dans `assets/IMAGES.md` et `assets/audio/SONS.md`) : il est pris en compte tout seul.
Tant qu'un fichier manque, le jeu utilise un remplaçant (image simplifiée ou son synthétisé).
