# Images du mode Histoire

Liste générée depuis `data/story_mode.json`. Toutes sont facultatives : tant qu'une image manque, le jeu se replie
(expression → `_neutre`, boss → `_humain`, portrait → pastille, décor → dégradé vert + nom du lieu).

Format : SVG, nommé exactement comme ci-dessous. ✅ = présent, ⬜ = manquant.

Portraits et sprites de combat : `design/trois-signes-character-sheet` (Claude Design, générés par `project/tools/story-engine.js`).
Décors : `design/ecran-de-combat-trois-signes` (Claude Design, générés par `project/decors.js`), fichiers d'origine avec leur certificat C2PA.

## Portraits des héros (`assets/portraits/`)

`neutre` sert de repli pour toutes les autres expressions.

- ✅ `assets/portraits/aldric_neutre.svg` — repli obligatoire
- ✅ `assets/portraits/aldric_joie.svg`
- ✅ `assets/portraits/aldric_colere.svg`
- ✅ `assets/portraits/aldric_tristesse.svg`
- ✅ `assets/portraits/aldric_surprise.svg`
- ✅ `assets/portraits/aldric_determine.svg`
- ✅ `assets/portraits/nyra_neutre.svg` — repli obligatoire
- ✅ `assets/portraits/nyra_joie.svg`
- ✅ `assets/portraits/nyra_colere.svg`
- ✅ `assets/portraits/nyra_tristesse.svg`
- ✅ `assets/portraits/nyra_surprise.svg`
- ✅ `assets/portraits/nyra_determine.svg`
- ✅ `assets/portraits/boran_neutre.svg` — repli obligatoire
- ✅ `assets/portraits/boran_joie.svg`
- ✅ `assets/portraits/boran_colere.svg`
- ✅ `assets/portraits/boran_tristesse.svg`
- ✅ `assets/portraits/boran_surprise.svg`
- ✅ `assets/portraits/boran_determine.svg`
- ✅ `assets/portraits/ilwen_neutre.svg` — repli obligatoire
- ✅ `assets/portraits/ilwen_joie.svg`
- ✅ `assets/portraits/ilwen_colere.svg`
- ✅ `assets/portraits/ilwen_tristesse.svg`
- ✅ `assets/portraits/ilwen_surprise.svg`
- ✅ `assets/portraits/ilwen_determine.svg`
- ✅ `assets/portraits/kestrel_neutre.svg` — repli obligatoire
- ✅ `assets/portraits/kestrel_joie.svg`
- ✅ `assets/portraits/kestrel_colere.svg`
- ✅ `assets/portraits/kestrel_tristesse.svg`
- ✅ `assets/portraits/kestrel_surprise.svg`
- ✅ `assets/portraits/kestrel_determine.svg`
- ✅ `assets/portraits/mira_neutre.svg` — repli obligatoire
- ✅ `assets/portraits/mira_joie.svg`
- ✅ `assets/portraits/mira_colere.svg`
- ✅ `assets/portraits/mira_tristesse.svg`
- ✅ `assets/portraits/mira_surprise.svg`
- ✅ `assets/portraits/mira_determine.svg`

## Portraits d'Eldan et des personnages secondaires

- ✅ `assets/portraits/eldan_neutre.svg`
- ✅ `assets/portraits/eldan_joie.svg`
- ✅ `assets/portraits/eldan_colere.svg`
- ✅ `assets/portraits/eldan_tristesse.svg`
- ✅ `assets/portraits/eldan_surprise.svg`
- ✅ `assets/portraits/eldan_determine.svg`
- ✅ `assets/portraits/maud_neutre.svg`
- ✅ `assets/portraits/pip_neutre.svg`
- ✅ `assets/portraits/lili_joie.svg`
- ✅ `assets/portraits/lili_neutre.svg`
- ✅ `assets/portraits/lili_surprise.svg`
- ✅ `assets/portraits/aubin_joie.svg`
- ✅ `assets/portraits/aubin_neutre.svg`
- ✅ `assets/portraits/fabre_neutre.svg` — repli
- ✅ `assets/portraits/fabre_ombrace.svg`
- ✅ `assets/portraits/fabre_surprise.svg`
- ✅ `assets/portraits/sbire_ombrace.svg` —  — provisoire, tiré de la planche de combat

## Boss : deux formes (`_ombrace` = forme d'ennemi, `_humain` = forme humaine, utilisée pour neutre / joie / tristesse)

- ✅ `assets/portraits/bram_ombrace.svg`
- ✅ `assets/portraits/bram_humain.svg`
- ✅ `assets/portraits/corvin_ombrace.svg`
- ✅ `assets/portraits/corvin_humain.svg`
- ✅ `assets/portraits/sorel_ombrace.svg`
- ✅ `assets/portraits/sorel_humain.svg`
- ✅ `assets/portraits/reflet_ombrace.svg`
- ✅ `assets/portraits/reflet_humain.svg`
- ✅ `assets/portraits/tonnerre_ombrace.svg`
- ✅ `assets/portraits/tonnerre_humain.svg`
- ✅ `assets/portraits/oren_ombrace.svg`
- ✅ `assets/portraits/oren_humain.svg`
- ✅ `assets/portraits/archiviste_ombrace.svg`
- ✅ `assets/portraits/archiviste_humain.svg`
- ✅ `assets/portraits/selena_ombrace.svg`
- ✅ `assets/portraits/selena_humain.svg`
- ✅ `assets/portraits/traqueur_ombrace.svg`
- ✅ `assets/portraits/traqueur_humain.svg`
- ✅ `assets/portraits/hardel_ombrace.svg`
- ✅ `assets/portraits/hardel_humain.svg`
- ✅ `assets/portraits/helo_ombrace.svg`
- ✅ `assets/portraits/helo_humain.svg`
- ✅ `assets/portraits/veilleuse_ombrace.svg`
- ✅ `assets/portraits/veilleuse_humain.svg`
- ✅ `assets/portraits/eldan_oublie_ombrace.svg`

## Sprites de combat des boss (`assets/ennemis/`, vus de face, pieds en bas)

Sans sprite, le boss prend celui de la brute (mini-boss) ou du boss de la Forêt de Mousse.

- ✅ `assets/ennemis/bram.svg`
- ✅ `assets/ennemis/corvin.svg`
- ✅ `assets/ennemis/sorel.svg`
- ✅ `assets/ennemis/reflet.svg`
- ✅ `assets/ennemis/tonnerre.svg`
- ✅ `assets/ennemis/oren.svg`
- ✅ `assets/ennemis/archiviste.svg`
- ✅ `assets/ennemis/selena.svg`
- ✅ `assets/ennemis/traqueur.svg`
- ✅ `assets/ennemis/hardel.svg`
- ✅ `assets/ennemis/helo.svg`
- ✅ `assets/ennemis/veilleuse.svg`
- ✅ `assets/ennemis/eldan_oublie.svg`
- ⬜ `assets/ennemis/mannequin.svg` — mannequin de « La première leçon » (poteau de bois et sac de paille) ; en attendant, sprite provisoire dessiné en code (`src/ui/tutorial-art.js`)

## Décors (`assets/decors/`, plein écran, portrait 390 × 844 conseillé)

- ✅ `assets/decors/prologue_monde.svg` — Paysage lumineux, un vieux maître enseigne à des enfants sur une colline verte
- ✅ `assets/decors/prologue_silence.svg` — Le même paysage, mangé par une brume grise
- ✅ `assets/decors/prologue_heros.svg` — Les six héros alignés, de dos, face à l'horizon gris
- ✅ `assets/decors/pierrelune_aube.svg` — Village de montagne au lever du soleil, maisons en pierre, toits orange
- ✅ `assets/decors/pierrelune_brume.svg` — Le même village envahi par la brume grise
- ✅ `assets/decors/maison_maitre.svg` — Intérieur chaleureux mais vide : table en bois, parchemins, bougie éteinte
- ✅ `assets/decors/pont_brumes.svg` — Vieux pont de pierre au-dessus d'un ravin rempli de brume
- ✅ `assets/decors/route_ecole.svg` — Chemin forestier entre des rochers gravés de triangles et de ronds
- ✅ `assets/decors/ecole_ruines.svg` — Grandes ruines de pierre couvertes de signes gravés et d'un mur de noms
- ✅ `assets/decors/velis_toits.svg` — Toits d'une cité serrée la nuit, lanternes, lune
- ✅ `assets/decors/velis_marche.svg` — Grand marché couvert, étals colorés en train de griser
- ✅ `assets/decors/planque_chats.svg` — Repaire de voleurs sous les toits, coussins, butin, lanternes
- ✅ `assets/decors/archives_velis.svg` — Salle d'archives, étagères de registres, poussière dans la lumière
- ✅ `assets/decors/velis_porte.svg` — Grande porte Est de la cité, ouverte sur une plaine grise
- ✅ `assets/decors/hautes_gerbes.svg` — Champs de blé doré, ferme et grange rouge, ciel d'été
- ✅ `assets/decors/hautes_gerbes_gris.svg` — Les mêmes champs devenus gris, ciel bas
- ✅ `assets/decors/chemin_collines.svg` — Sentier dans les collines, convoi de charrettes au loin
- ✅ `assets/decors/camp_refugies.svg` — Camp de tentes derrière une palissade en bois, tente de soins
- ✅ `assets/decors/palissade_nuit.svg` — La palissade du camp la nuit, feux de garde
- ✅ `assets/decors/aubelle_biblio.svg` — Immense bibliothèque, étagères jusqu'au plafond, livres qui perdent leurs mots
- ✅ `assets/decors/aubelle_rues.svg` — Rues pavées d'une ville savante, tours et coupoles
- ✅ `assets/decors/reserve_interdite.svg` — Salle secrète, grilles, un seul livre lumineux sur un pupitre
- ✅ `assets/decors/tour_guet.svg` — Sommet d'une tour de guet, vue sur tout le pays avec une tache blanche au centre
- ✅ `assets/decors/lisiere.svg` — Lisière d'une forêt dont une moitié est verte et l'autre grise
- ✅ `assets/decors/camp_eclaireurs.svg` — Camp d'éclaireurs : tentes, cartes épinglées, feu de camp
- ✅ `assets/decors/col_vents.svg` — Col de montagne venteux, drapeaux de prière, neige
- ✅ `assets/decors/foret_effacee.svg` — Forêt dont les arbres s'effacent en fragments de facettes
- ✅ `assets/decors/fontclaire.svg` — Petit village autour d'une fontaine, fleurs, maisons blanches
- ✅ `assets/decors/maison_soins.svg` — Maison de soins : fioles, plantes suspendues, lits simples
- ✅ `assets/decors/route_villages.svg` — Route de campagne entre plusieurs petits villages
- ✅ `assets/decors/coeur_silence.svg` — Clairière entièrement blanche, sans couleur, fragments de pages qui flottent
- ✅ `assets/decors/coeur_silence_gueri.svg` — La même clairière qui retrouve ses couleurs, herbe verte, lumière chaude

## Icônes des armes (`assets/icones/armes/`) et des talismans (`assets/icones/talismans/`)

Claude Design (`design/trois-signes-maquette-lobby`, dossiers `icones/depart`, `icones/armes`, `icones/talismans`), reçues le 28/09/2026,
avec leur certificat C2PA. SVG carré, fond transparent. Armes de départ et alternatives rangées ensemble dans `icones/armes/`.

Sans fichier, le jeu dessine une icône de repli (signe à facettes).

- ✅ `assets/icones/armes/epee.svg` — Épée (aldric)
- ✅ `assets/icones/armes/hache_fendeuse.svg` — Hache fendeuse (aldric)
- ✅ `assets/icones/armes/lance_garde_fou.svg` — Lance garde-fou (aldric)
- ✅ `assets/icones/armes/dague.svg` — Dague (nyra)
- ✅ `assets/icones/armes/couteaux_lancer.svg` — Couteaux de lancer (nyra)
- ✅ `assets/icones/armes/lame_ombre.svg` — Lame d'ombre (nyra)
- ✅ `assets/icones/armes/gantelets.svg` — Gantelets (boran)
- ✅ `assets/icones/armes/masse_pierre.svg` — Masse de pierre (boran)
- ✅ `assets/icones/armes/bouclier_tour.svg` — Bouclier-tour (boran)
- ✅ `assets/icones/armes/grimoire.svg` — Grimoire (ilwen)
- ✅ `assets/icones/armes/baton_braises.svg` — Bâton de braises (ilwen)
- ✅ `assets/icones/armes/orbe_miroir.svg` — Orbe miroir (ilwen)
- ✅ `assets/icones/armes/arc.svg` — Arc (kestrel)
- ✅ `assets/icones/armes/arbalete.svg` — Arbalète (kestrel)
- ✅ `assets/icones/armes/fronde.svg` — Fronde (kestrel)
- ✅ `assets/icones/armes/amulette.svg` — Amulette (mira)
- ✅ `assets/icones/armes/baton_seve.svg` — Bâton de sève (mira)
- ✅ `assets/icones/armes/clochette.svg` — Clochette (mira)

- ✅ `assets/icones/talismans/gland_mousse.svg` — Gland de mousse
- ✅ `assets/icones/talismans/epi_or.svg` — Épi d'or
- ✅ `assets/icones/talismans/goutte_claire.svg` — Goutte claire
- ✅ `assets/icones/talismans/cle_toits.svg` — Clé des toits
- ✅ `assets/icones/talismans/marque_page.svg` — Marque-page
- ✅ `assets/icones/talismans/plume_vent.svg` — Plume de vent
- ✅ `assets/icones/talismans/craie_ancienne.svg` — Craie ancienne
- ✅ `assets/icones/talismans/page_codex.svg` — Page du Codex

## Boutique, monnaies et skins

Boutique et monnaies : Claude Design (`design/trois-signes-maquette-lobby`, dossiers `boutique/` et `icones/monnaies/`),
reçues le 28/09/2026, avec leur certificat C2PA. Pas encore utilisées par le jeu (tâche Économie).

- ✅ `assets/icones/monnaies/or.svg`, `assets/icones/monnaies/gemme.svg`
- ✅ `assets/boutique/pack_gemmes_1.svg` à `pack_gemmes_4.svg` (poignée, bourse, coffret, grand coffre)
- ✅ `assets/boutique/coffre_simple_ferme.svg`, `coffre_simple_ouvert.svg`
- ✅ `assets/boutique/coffre_trois_signes_ferme.svg`, `coffre_trois_signes_ouvert.svg`
- ✅ `assets/boutique/cadre_commun.svg`, `cadre_rare.svg`, `cadre_epique.svg` (centre transparent)

Skins épiques : **pas fournis par Claude Design** ; générés en code par `node tools/boutique-art/gen.mjs` (dessins d'origine de
`src/ui/art.js` et `src/ui/sprites.js`, recolorés, avec accessoires), en attendant. Un vrai dessin déposé au même nom les remplace
(ne plus relancer le générateur ensuite). Planche : `design/planches-boutique/3-skins.html`.

- ✅ `assets/skins/{heros}_{skin}.svg` (lobby, repère 240 × 320 de `art.js` avec 10 de marge : viewBox -10 -10 260 344)
  et `assets/skins/{heros}_{skin}_combat.svg` (sprite de combat, ¾ dos) :
  `aldric_hiver`, `nyra_carnaval`, `boran_moisson`, `ilwen_etoiles`, `kestrel_automne`, `mira_printemps`.
