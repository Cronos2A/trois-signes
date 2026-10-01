# Crédits des sons et des polices

Origine et licence de chaque fichier de `assets/audio/` (à garder à jour : c'est ce qu'un store demandera).
Licences vérifiées le 27/09/2026.

Tous les fichiers ont été retouchés pour le jeu le 28/09/2026 : silence de début coupé (et de fin pour les musiques),
volume ramené à un niveau commun, ré-encodage MP3. Voir `assets/audio/SONS.md`.

## Effets sonores — ElevenLabs (générateur d'effets sonores)

Créés le 28/09/2026. Dossier `assets/audio/sfx/`.

| Fichier | Source | Créé le |
|---|---|---|
| `texte.mp3` | ElevenLabs | 28/09/2026 |
| `page.mp3` | ElevenLabs | 28/09/2026 |
| `trace.mp3` | ElevenLabs | 28/09/2026 |
| `geste_rate.mp3` | ElevenLabs | 28/09/2026 |
| `attaque.mp3` | ElevenLabs | 28/09/2026 |
| `coup_recu.mp3` | ElevenLabs | 28/09/2026 |
| `esquive.mp3` | ElevenLabs | 28/09/2026 |
| `alerte.mp3` | ElevenLabs | 28/09/2026 |
| `ennemi_vaincu.mp3` | ElevenLabs | 28/09/2026 |
| `piece.mp3` | ElevenLabs | 28/09/2026 |
| `coeur.mp3` | ElevenLabs | 28/09/2026 |
| `combo.mp3` | ElevenLabs | 28/09/2026 |
| `super_pleine.mp3` | ElevenLabs | 28/09/2026 |
| `super_aldric.mp3` | ElevenLabs | 28/09/2026 |
| `super_nyra.mp3` | ElevenLabs | 28/09/2026 |
| `super_boran.mp3` | ElevenLabs | 28/09/2026 |
| `super_ilwen.mp3` | ElevenLabs | 28/09/2026 |
| `super_kestrel.mp3` | ElevenLabs | 28/09/2026 |
| `super_mira.mp3` | ElevenLabs | 28/09/2026 |
| `boss_apparition.mp3` | ElevenLabs | 28/09/2026 |
| `nouvelle_arene.mp3` | ElevenLabs | 28/09/2026 |
| `victoire.mp3` | ElevenLabs | 28/09/2026 |
| `defaite.mp3` | ElevenLabs | 28/09/2026 |
| `deblocage.mp3` | ElevenLabs | 28/09/2026 |

Licence : **plan payant** ElevenLabs → aucun crédit exigé (le jeu les cite quand même, voir plus bas).

## Musiques — Suno (plan Pro)

Créées le 28/09/2026, pendant l'abonnement Pro. Dossier `assets/audio/musique/`.

| Fichier | Source | Créé le |
|---|---|---|
| `musique_lobby.mp3` | Suno Pro | 28/09/2026 |
| `musique_tuto.mp3` | Suno Pro (fichier reçu : « musique_tuto (Instrumental).mp3 ») | 28/09/2026 |
| `musique_nature.mp3` | Suno Pro | 28/09/2026 |
| `musique_cite.mp3` | Suno Pro | 28/09/2026 |
| `musique_hauteurs.mp3` | Suno Pro | 28/09/2026 |
| `musique_coeur.mp3` | Suno Pro | 28/09/2026 |
| `musique_boss.mp3` | Suno Pro | 28/09/2026 |
| `musique_epilogue.mp3` | Suno Pro | 28/09/2026 |

Licence : droits commerciaux acquis pour les morceaux créés pendant l'abonnement Pro ; ils restent acquis après
l'arrêt de l'abonnement. (Suno ne garantit pas que ses morceaux soient protégés par le droit d'auteur.)

## Polices — embarquées dans le jeu (`assets/fonts/`)

Chargées en local par `src/ui/fonts.css` (plus aucun appel à Google Fonts depuis le 01/10/2026 : le jeu marche hors connexion
et n'envoie pas l'adresse IP du joueur à Google). Fichiers WOFF2 du projet @fontsource 5.3.0, sous-ensembles latin et latin étendu.

| Police | Graisses | Auteurs | Licence |
|---|---|---|---|
| Caprasimo (titres) | 400 | The Caprasimo Project Authors (github.com/docrepair-fonts/caprasimo-fonts) | SIL Open Font License 1.1 (`assets/fonts/OFL-Caprasimo.txt`) |
| Figtree (texte) | 400, 600, 700 | The Figtree Project Authors (github.com/erikdkennedy/figtree) | SIL Open Font License 1.1 (`assets/fonts/OFL-Figtree.txt`) |

Licence OFL : usage commercial, intégration et redistribution dans le jeu autorisés ; la licence doit accompagner les fichiers
(c'est le cas) ; les polices ne peuvent pas être vendues seules.

## Sons faits en code

- Notes des niveaux de réussite (OK → Perfect) : générées dans `src/audio/synth.js`, aucune licence.
- Sons provisoires (tant qu'un fichier manque : aujourd'hui `ui_clic`, `ui_onglet`, `musique_triste`) : `src/audio/synth.js`, aucune licence.

## Écran Crédits du jeu

Réglages (engrenage du lobby) → Crédits. Texte dans `data/credits.json` : à tenir à jour avec ce fichier.
