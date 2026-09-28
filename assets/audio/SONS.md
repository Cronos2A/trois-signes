# Sons du jeu

Les fichiers se branchent seuls : il suffit de les déposer ici avec le bon nom (aucune ligne de code à changer).
Tant qu'un fichier manque, le jeu joue un son provisoire synthétisé en code (`src/audio/synth.js`).
Réglages (volumes relatifs, fondus, lieux → musique) : `data/audio.json`. Sources et licences : `CREDITS.md` (racine du dépôt).

- Effets : `assets/audio/sfx/{id}.mp3` — chargés au démarrage, courts (< 2 s, sauf `trace`).
- Musiques : `assets/audio/musique/{id}.mp3` — chargées à la demande, en boucle. Si un morceau boucle parfaitement, ajouter son id à `seamless` dans `data/audio.json` ; sinon un fondu de 1 s est fait à la boucle.
- Les notes de réussite (OK → Perfect) sont définitives et restent en code : pas de fichier.

Traitement appliqué aux fichiers reçus (28/09/2026) : silence de début coupé (et de fin pour les musiques, qui bouclent),
volume ramené à un niveau commun (≈ -16 LUFS, crête ≤ -1 dBTP), ré-encodage MP3 44,1 kHz. Les effets vont de -15,5 à -17,7 LUFS
(avant : de -7 à -45 LUFS) ; `page` et `piece` n'atteignent pas tout à fait -16 sans trop écraser leurs crêtes.

✅ présent · ⬜ manquant (son provisoire)

## Effets (24 / 26)

| | Fichier | Quand | Durée |
|---|---|---|---|
| ⬜ | `sfx/ui_clic.mp3` | clic sur un bouton | — |
| ⬜ | `sfx/ui_onglet.mp3` | changement d'onglet du lobby | — |
| ✅ | `sfx/texte.mp3` | défilement du texte (toutes les 2 lettres) | 0,6 s |
| ✅ | `sfx/page.mp3` | ligne de dialogue suivante | 1,2 s |
| ✅ | `sfx/trace.mp3` | boucle douce pendant que le doigt trace (bouclable) | 3,0 s |
| ✅ | `sfx/geste_rate.mp3` | geste raté | 1,0 s |
| ✅ | `sfx/attaque.mp3` | attaque (triangle réussi) | 1,0 s |
| ✅ | `sfx/coup_recu.mp3` | le héros est touché | 1,0 s |
| ✅ | `sfx/esquive.mp3` | esquive (rond réussi) | 1,0 s |
| ✅ | `sfx/alerte.mp3` | un ennemi prépare son coup | 1,0 s |
| ✅ | `sfx/ennemi_vaincu.mp3` | ennemi vaincu | 2,3 s |
| ✅ | `sfx/piece.mp3` | pièce ramassée | 1,2 s |
| ✅ | `sfx/coeur.mp3` | cœur ramassé | 1,2 s |
| ✅ | `sfx/combo.mp3` | combo | 2,0 s |
| ✅ | `sfx/super_pleine.mp3` | jauge de super pleine | 2,0 s |
| ✅ | `sfx/super_aldric.mp3` | Rempart (Aldric) | 2,0 s |
| ✅ | `sfx/super_nyra.mp3` | Ombre (Nyra) | 1,9 s |
| ✅ | `sfx/super_boran.mp3` | Géant (Boran) | 2,0 s |
| ✅ | `sfx/super_ilwen.mp3` | Grimoire ouvert (Ilwen) | 3,5 s |
| ✅ | `sfx/super_kestrel.mp3` | Œil de faucon (Kestrel) | 1,2 s |
| ✅ | `sfx/super_mira.mp3` | Renouveau (Mira) | 1,2 s |
| ✅ | `sfx/boss_apparition.mp3` | apparition d'un gardien ou d'un boss | 2,0 s |
| ✅ | `sfx/nouvelle_arene.mp3` | nouvelle arène du Voyage | 4,0 s |
| ✅ | `sfx/victoire.mp3` | victoire | 5,1 s |
| ✅ | `sfx/defaite.mp3` | défaite / fin du Voyage | 3,2 s |
| ✅ | `sfx/deblocage.mp3` | arène découverte, fragment, déblocage | 3,2 s |

## Musiques (8 / 9)

| | Fichier | Où | Durée |
|---|---|---|---|
| ✅ | `musique/musique_lobby.mp3` | lobby, choix et chemin du mode Histoire | 19,0 s |
| ✅ | `musique/musique_tuto.mp3` | Entraînement et « La première leçon » | 1 min 30 |
| ✅ | `musique/musique_nature.mp3` | Forêt de Mousse, Hautes-Gerbes, Fontclaire (et lieux de campagne de l'Histoire) | 2 min 17 |
| ✅ | `musique/musique_cite.mp3` | Toits de Vélis, Aubelle | 1 min 57 |
| ✅ | `musique/musique_hauteurs.mp3` | Col des Vents, École des Signes | 2 min 48 |
| ✅ | `musique/musique_coeur.mp3` | Cœur du Silence, Au-delà du Silence | 3 min 09 |
| ✅ | `musique/musique_boss.mp3` | tout round de gardien ou de boss | 2 min 48 |
| ⬜ | `musique/musique_triste.mp3` | cinématique après un mini-boss ou un lieutenant | — |
| ✅ | `musique/musique_epilogue.mp3` | fins d'histoire et épilogue | 1 min 33 |

## À faire

- `sfx/ui_clic.mp3` : clic sur un bouton
- `sfx/ui_onglet.mp3` : changement d'onglet du lobby
- `musique/musique_triste.mp3` : cinématique après un mini-boss ou un lieutenant
- `musique/musique_lobby.mp3` ne dure que 19 s : la boucle (fondu de 1 s) revient souvent ; un morceau plus long serait plus agréable.
