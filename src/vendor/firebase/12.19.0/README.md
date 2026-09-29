SDK web Firebase 12.19.0 (Google, licence Apache 2.0 : voir l'en-tête de chaque fichier), fichiers du paquet npm `firebase`
(`firebase-app.js`, `firebase-auth.js`, `firebase-firestore.js`, les mêmes que sur le CDN www.gstatic.com/firebasejs/12.19.0/).
Seul changement : l'import de `firebase-app.js` pointe vers la copie locale (`./firebase-app.js`), pour ne dépendre d'aucun CDN
(jeu hors-ligne, application). Mise à jour : `npm pack firebase@<version>`, recopier ces trois fichiers et refaire ce remplacement,
puis changer `sdk.path` dans data/online.json.
