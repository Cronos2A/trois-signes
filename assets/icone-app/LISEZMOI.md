# Icône de l'application (source unique)

- `icone.svg` : icône **provisoire** de Three Signs, 1024 × 1024, en deux calques :
  - `<g id="fond">` : l'arrière-plan (plein cadre, il peut être coupé en rond, en carré arrondi… selon le téléphone) ;
  - `<g id="logo">` : le dessin principal, **dans le cercle central de 66 % du côté** (zone toujours visible d'Android).
- `sortie/icone-play-store-512.png` : icône de la fiche Play Store (512 × 512), générée.

## Quand tu auras la vraie icône
1. Remplace `icone.svg` (mêmes `id="fond"` et `id="logo"`), ou dépose un `icone.png` carré d'au moins 1024 px
   (et supprime `icone.svg`) : il sera posé sur un fond vert foncé uni.
2. Dans PowerShell, dans le dossier du jeu : `npm run icons`.
3. Recompile (`tools/android/apk.ps1` ou `aab.ps1`).

Ce dossier n'est jamais copié dans le jeu (`tools/android/build-www.mjs`).
