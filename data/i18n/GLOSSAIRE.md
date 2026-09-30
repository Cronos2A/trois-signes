# Glossaire imposé — traduction de Trois Signes

Vocabulaire à respecter dans toutes les langues (fichiers `data/i18n/{fr,en,it,es,de}.json`).
Le français est la langue de référence : une clé absente d'une langue est affichée en français.

## Termes du jeu

| Français | English | Italiano | Español | Deutsch |
|---|---|---|---|---|
| Trois Signes | Three Signs | Tre Segni | Tres Signos | Drei Zeichen |
| l'Empreinte (les Empreintes) | the Imprint (Imprints) | l'Impronta (le Impronte) | la Huella (las Huellas) | der Abdruck (die Abdrücke) |
| le Silence | the Silence | il Silenzio | el Silencio | die Stille |
| les Ombracés | the Hollowed | gli Svuotati | los Vaciados | die Verblassten |
| le Cœur du Silence | the Heart of Silence | il Cuore del Silenzio | el Corazón del Silencio | das Herz der Stille |
| Fragment de mémoire | Memory fragment | Frammento di memoria | Fragmento de memoria | Erinnerungsfragment |

## Ce qui ne se traduit jamais
- **Noms des héros** : Aldric, Nyra, Boran, Ilwen, Kestrel, Mira, Eldan.
- **Niveaux de réussite** : OK, Good, Very Good, Excellent, Perfect (identiques dans toutes les langues).
- **Noms propres de lieux** : Fontclaire, Vélis, Aubelle, Pierrelune, Hautes-Gerbes…

## Lieux : nom propre inchangé, mots descriptifs traduits
- Forêt de Mousse = Moss Forest
- Col des Vents = Windy Pass
- Toits de Vélis = Rooftops of Vélis (le nom propre « Vélis » reste)
- Bibliothèque d'Aubelle = Aubelle Library
- École des Signes = School of Signs
- Au-delà du Silence = Beyond the Silence (voir « le Silence »)

## Règles de rédaction
- Chaque langue tourne ses phrases librement : les variables `{name}`, `{n}`, `{of}`… peuvent changer de place.
- « de » + lieu ou héros : forme complète par langue (`of.arena.*`, `of.hero.*`) ; « de » + pseudo : règles `grammar.of`.
- Pluriels : `{ "one": "…", "other": "…" }` (règles de la langue, `Intl.PluralRules`).
- Nombres : jamais écrits en dur, ils sont mis en forme par le jeu (séparateurs de la langue).
- Textes des autres fichiers de `data/` (noms d'objets, descriptions, histoire) : section `"data"` du fichier de langue,
  même chemin que dans le fichier d'origine (ex. `{ "data": { "economy": { "ui": { "buy": "Buy" } } } }`).
