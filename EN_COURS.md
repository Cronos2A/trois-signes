# Travail en cours — branche `en-cours` (28/09/2026)

Cette branche n'est **pas fusionnée dans `main`** : la fonctionnalité est codée et presque entièrement testée,
mais il manque deux vérifications (voir « Reste à faire »). `main` est au commit `3c7b26e` (progression des armes).

## Tâche en cours : armes alternatives et talismans

### Fait (et testé)
- `data/weapons.json` réorganisé : 3 armes par héros (`heroes`), 18 armes avec nom, effet de style (`style.text`,
  `scale` = valeurs qui montent de 50 % au niveau 1 à 100 % au niveau 6, `fixed` = valeurs fixes), condition de
  déblocage (`unlock.story` 5 ou 10, texte `lock`), `autorise_en_duel: true`. L'ancien « talent du niveau 6 » des armes
  de départ est devenu leur effet de style. Tous les libellés d'interface des armes sont dans `ui`.
- `data/talismans.json` (nouveau) : 8 talismans (nom, texte, effet, arène du gardien, texte de verrou,
  `autorise_en_duel: false` **à décider**) et leurs libellés `ui`.
- Logique : `src/game/weapons.js` (réécrit : armes par héros, arme équipée, déblocage, force du style, texte d'effet),
  `src/game/talismans.js` (nouveau), `src/game/rewards.js` (nouveau : `syncRewards()` recalcule tout ce qui est mérité
  d'après la sauvegarde, ce qui donne aussi les récompenses rétroactives), sauvegarde `prog.armory` et `prog.voyage.beaten`
  (`src/game/progress.js`).
- Effets en combat : `src/game/combat.js` (réécrit), `grades.js` (Marque-page, Craie ancienne), `supers.js` (Arc, Couteaux),
  `enemies.js` + `state.js` (`windOf` : Clé des toits), `hud.js`, `combat-hud.js` (bouclier de la Clochette affiché à côté des PV).
- Récompenses : écran `src/ui/reward-ui.js` (nom, icône, effet, son `deblocage`) ; au lancement (récompenses déjà méritées),
  après une victoire en Histoire (`story.js`), en fin de Voyage (`main.js`), et coffre du gardien sur l'écran
  « Arène découverte » du Voyage (`voyage.js`, `voyage-ui.js` ; ancien bloc `chest` retiré de `data/voyage.json`).
- Onglet Personnage (`src/ui/lobby.js`, `src/ui/weapon-ui.js`, styles en fin de `src/ui/lobby.css`) : carte Armes
  (3 armes, niveau, XP, effet de style à sa force actuelle, Équiper / verrou) et carte Talisman (emplacement, grille des 8,
  détail, Équiper / Retirer). La pastille de l'onglet Jouer montre l'arme équipée.
- Icônes provisoires : `assets/icones/armes/{id}.svg` (18) et `assets/icones/talismans/{id}.svg` (8), listées dans
  `assets/IMAGES.md` ; un vrai dessin au même nom les remplace, et sans fichier le code dessine un repli.
- Tests faits dans le navigateur (390 × 800) :
  - chaque arme à force 100 %, valeurs conformes (épée +5 PV/combo ; hache 2e ennemi 50 % ; lance +30 % après esquive ;
    dague Perfect ×1,15 ; couteaux : cible la plus faible, +10 de jauge par ennemi vaincu ; lame d'ombre : contre-attaque
    100 % après esquive Perfect, rien après Good ; gantelets 20 → 19 ; masse : cible ×0,9, autres ×0,4 ; bouclier-tour :
    infligés ×0,9, reçus 20 → 17 ; grimoire combo 3,25 ; braises 3 dégâts en 3 s ; orbe : renvoi 20 % des dégâts évités ;
    arc jauge Perfect ×1,5 ; arbalète ×1,2 / ×0,9 ; fronde 3 dégâts par ramassage ; amulette +1 PV ; bâton de sève :
    0 soin par attaque, 12 PV par combo ; clochette : bouclier plafonné à 20, absorbe les coups) ;
  - chaque talisman (ramassage à 50 px possible seulement avec le Gland ; pièces 80 → 86 points ; cœurs 23 → 28 PV ;
    alerte 1,4 → 1,55 s ; série gardée après un ramassage raté ; un raté pardonné par round, pas deux ; jauge de départ 20 ;
    XP d'arme 100 → 110) ;
  - récompenses rétroactives au lancement (hache pour le combat 5 d'Aldric, Gland pour un Voyage déjà allé plus loin) ;
  - coffre du gardien dans le Voyage (gardien de la Forêt battu → Gland de mousse sur l'écran de Hautes-Gerbes) ;
  - équiper une arme et un talisman depuis l'onglet Personnage.

### Reste à faire (dans cet ordre)
1. **Tester le déblocage en jouant l'Histoire** : gagner le combat 5 d'un héros (ex. Boran) doit afficher l'écran
   Victoire puis « Nouvelle arme : Masse de pierre ». Test interrompu : la boucle du jeu ne tournait plus, le panneau du
   navigateur étant masqué (`requestAnimationFrame` suspendu). La sauvegarde de test du navigateur a Boran à 4/10.
2. **Vérifier l'équilibre entre les armes d'un même héros** (demandé) : aucune n'a été simulée. Idée : dans le navigateur,
   importer les modules, remplacer `Math.random` par un générateur à graine, faire jouer un bot (répartition de réussites
   fixe) plusieurs Voyages par arme au niveau 6, comparer rounds atteints, score et dégâts. Ajuster les valeurs dans
   `data/weapons.json` si une arme sort nettement du lot.
3. Tester en **360 × 640** l'onglet Personnage (cartes Armes et Talisman) et l'écran de récompense.
4. Mettre à jour `CLAUDE.md` (section « Progression des armes » : style au lieu de talent, armes alternatives,
   talismans, récompenses, `autorise_en_duel`), supprimer ce fichier, puis fusionner dans `main` et publier.

### Remarques
- Les armes alternatives gardent le sprite de combat de l'arme de départ (aucun nouveau dessin) ; seule l'icône change.
- « Esquive réussie » = un coup ennemi réellement évité (bouclier du Rond actif), pas le simple tracé d'un Rond : sinon
  la Lame d'ombre et la Lance donneraient des attaques gratuites à volonté.
- Duel : si les bonus de niveau sont neutralisés, l'effet de style est pris à `duel.stylePower` (100 %) pour tous.

## Prompts en attente (à faire après la fusion)
Économie du jeu — pièces d'or, gemmes, coffres et cosmétiques (message complet du 28/09/2026) :
- Données dans `data/economy.json` et `data/cosmetics.json` ; les cosmétiques ne donnent jamais d'avantage.
- Or : fin de Voyage 10 + 5/arène + 20 si record ; Histoire 30 (1re victoire) / 5 ; les pièces ramassées deviennent de l'or.
  Gemmes : 10 par gardien battu la 1re fois, 30 par histoire terminée, 50 pour l'épilogue (rétroactif au lancement).
  Compteurs or/gemmes en haut du lobby, « + » sur les gemmes → onglet Gemmes.
- Catalogue : 3 couleurs par héros (recolorations en code, garder Teinte Lagon et Teinte Soleil), 10 tracés en code
  (dont Étincelle et Lierre, + arc-en-ciel, étoiles, bulles, flammes, confettis, encre, pixels, notes), 1 skin d'arme par arme
  de départ (garder Lame Braise et Arc Corail ; signaler si le sprite ne permet pas), 1 emplacement de skin complet
  épique par héros (`assets/skins/{heros}_{skin}.svg`, repli habituel). Raretés ≈ 60/30/10 %.
- Coffres : simple 60 gemmes (commun 70 / rare 25 / épique 5), Trois Signes 150 gemmes (3 objets, ≥ 1 rare), pas de doublon,
  « Collection complète », garantie épique après 10 coffres simples sans épique, **probabilités et liste affichées à côté du
  bouton d'achat (Google Play)**, animation + son selon la rareté, liste de pays sans coffres payants (commencer par "BE").
- Boutique : onglets Coffres (bouton Probabilités), Cosmétiques (Tout, Armes, Couleurs, Tracés, Skins ; achat or/gemmes
  avec confirmation), Gemmes (4 packs 80/0,99 €, 450/4,99 €, 1000/9,99 €, 2200/19,99 €, désactivés « Disponible dans
  l'application »).
- Onglet Personnage : carte Cosmétique pour équiper couleur ou skin, skin d'arme, tracé, avec aperçu ; affichés en combat,
  lobby et histoire.
- Mode test caché (développement seulement) pour se donner or et gemmes. Tester achats, 30 coffres sans doublon, garantie,
  probabilités. Publier sur main.

## Prochaine étape exacte
Rouvrir le panneau du navigateur, lancer `py -m http.server 8123`, puis reprendre le point 1 de « Reste à faire »
(combat 5 de Boran dans le mode Histoire, jusqu'à l'écran « Nouvelle arme »).
