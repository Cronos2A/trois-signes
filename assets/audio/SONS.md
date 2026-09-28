# Sons du jeu

Les fichiers se branchent seuls : il suffit de les déposer ici avec le bon nom (aucune ligne de code à changer).
Tant qu'un fichier manque, le jeu joue un son provisoire synthétisé en code (`src/audio/synth.js`).
Réglages (volumes relatifs, fondus, lieux → musique) : `data/audio.json`.

- Effets : `assets/audio/sfx/{id}.mp3` — chargés au démarrage, courts (< 2 s, sauf `trace`).
- Musiques : `assets/audio/musique/{id}.mp3` — chargées à la demande, en boucle. Si un morceau boucle parfaitement, ajouter son id à `seamless` dans `data/audio.json` ; sinon un fondu de 1 s est fait à la boucle.
- Les notes de réussite (OK → Perfect) sont définitives et restent en code : pas de fichier.

✅ présent · ⬜ manquant (son provisoire)

## Effets (0 / 26)

| | Fichier | Quand |
|---|---|---|
| ⬜ | `sfx/ui_clic.mp3` | clic sur un bouton |
| ⬜ | `sfx/ui_onglet.mp3` | changement d'onglet du lobby |
| ⬜ | `sfx/texte.mp3` | défilement du texte (toutes les 2 lettres) |
| ⬜ | `sfx/page.mp3` | ligne de dialogue suivante |
| ⬜ | `sfx/trace.mp3` | boucle douce pendant que le doigt trace (bouclable) |
| ⬜ | `sfx/geste_rate.mp3` | geste raté |
| ⬜ | `sfx/attaque.mp3` | attaque (triangle réussi) |
| ⬜ | `sfx/coup_recu.mp3` | le héros est touché |
| ⬜ | `sfx/esquive.mp3` | esquive (rond réussi) |
| ⬜ | `sfx/alerte.mp3` | un ennemi prépare son coup |
| ⬜ | `sfx/ennemi_vaincu.mp3` | ennemi vaincu |
| ⬜ | `sfx/piece.mp3` | pièce ramassée |
| ⬜ | `sfx/coeur.mp3` | cœur ramassé |
| ⬜ | `sfx/combo.mp3` | combo |
| ⬜ | `sfx/super_pleine.mp3` | jauge de super pleine |
| ⬜ | `sfx/super_aldric.mp3` | Rempart (Aldric) |
| ⬜ | `sfx/super_nyra.mp3` | Ombre (Nyra) |
| ⬜ | `sfx/super_boran.mp3` | Géant (Boran) |
| ⬜ | `sfx/super_ilwen.mp3` | Grimoire ouvert (Ilwen) |
| ⬜ | `sfx/super_kestrel.mp3` | Œil de faucon (Kestrel) |
| ⬜ | `sfx/super_mira.mp3` | Renouveau (Mira) |
| ⬜ | `sfx/boss_apparition.mp3` | apparition d'un gardien ou d'un boss |
| ⬜ | `sfx/nouvelle_arene.mp3` | nouvelle arène du Voyage |
| ⬜ | `sfx/victoire.mp3` | victoire |
| ⬜ | `sfx/defaite.mp3` | défaite / fin du Voyage |
| ⬜ | `sfx/deblocage.mp3` | arène découverte, fragment, déblocage |

## Musiques (0 / 9)

| | Fichier | Où |
|---|---|---|
| ⬜ | `musique/musique_lobby.mp3` | lobby, choix et chemin du mode Histoire |
| ⬜ | `musique/musique_tuto.mp3` | Entraînement |
| ⬜ | `musique/musique_nature.mp3` | Forêt de Mousse, Hautes-Gerbes, Fontclaire (et lieux de campagne de l'Histoire) |
| ⬜ | `musique/musique_cite.mp3` | Toits de Vélis, Aubelle |
| ⬜ | `musique/musique_hauteurs.mp3` | Col des Vents, École des Signes |
| ⬜ | `musique/musique_coeur.mp3` | Cœur du Silence, Au-delà du Silence |
| ⬜ | `musique/musique_boss.mp3` | tout round de gardien ou de boss |
| ⬜ | `musique/musique_triste.mp3` | cinématique après un mini-boss ou un lieutenant |
| ⬜ | `musique/musique_epilogue.mp3` | fins d'histoire et épilogue |
