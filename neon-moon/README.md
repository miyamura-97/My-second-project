# Neon Moon

Scène 3D cyberpunk interactive, pilotée par le défilement, en Three.js.
Une mégapole sous la pluie, un implant de chrome qui suit la caméra d'un chapitre
à l'autre, et la Lune qui se lève à la fin.

Tout est généré par le code : pas de modèle 3D, pas d'image, pas de son à télécharger.
L'esthétique s'inspire de l'animation cyberpunk (néons jaune, cyan et magenta, kanji,
pluie, ralenti à images rémanentes). Aucun logo, nom ni personnage d'une œuvre existante
n'est utilisé.

## Lancer en local

Les modules JavaScript ne se chargent pas si on ouvre `index.html` directement
(`file://`). Il faut un petit serveur :

- **Windows** : double-cliquer sur `lancer.bat` (ouvre http://localhost:8000).
- **Ailleurs** : `python3 -m http.server 8000` dans ce dossier, puis ouvrir http://localhost:8000.

Il faut une connexion internet : Three.js 0.160.0 et les polices viennent de CDN
(jsDelivr, Google Fonts).

## Ce qu'on peut faire sur la page

| Action | Effet |
| --- | --- |
| Faire défiler | La caméra traverse les 5 chapitres : Nuit, Ville, Chrome, Course, Lune |
| Bouger la souris | Parallaxe légère de la caméra |
| Maintenir `Espace`, le bouton « Maintenir : ralentir » ou un appui long | Le temps passe à ×0,12 : pluie et trafic ralentissent, l'implant s'ouvre et laisse des images rémanentes arc-en-ciel |
| Cliquer un chapitre dans la barre du haut | Saut direct au chapitre |

## Organisation

```
neon-moon/
├── index.html            Structure de la page et textes des 5 chapitres
├── css/style.css         Styles (palette en variables CSS en haut du fichier)
├── lancer.bat            Serveur local Windows
└── src/
    ├── main.js           Point d'entrée : moteur, assemblage de la scène, boucle
    ├── config.js         TOUS LES RÉGLAGES : palette, qualité, caméra par chapitre, enseignes
    ├── world/            Ce qu'on voit
    │   ├── sky.js        Ciel dégradé + étoiles
    │   ├── city.js       Tours (1 seul appel de dessin), fenêtres et néons calculés en shader
    │   ├── ground.js     Sol mouillé, voies, bordures néon
    │   ├── signs.js      Enseignes holographiques dessinées sur canvas
    │   ├── traffic.js    Voitures volantes (traînées lumineuses)
    │   ├── rain.js       Pluie animée sur le GPU
    │   ├── moon.js       Lune procédurale + halo, se lève au dernier chapitre
    │   └── core.js       L'implant : coque de chrome en 20 plaques, cœur d'énergie, anneaux
    ├── fx/
    │   ├── postfx.js     Bloom + passe écran (aberration, glitch, balayage, grain, vignette)
    │   └── timeDilation.js  Ralenti et images rémanentes
    ├── rig/scrollRig.js  Caméra pilotée par le défilement
    ├── ui/hud.js         Horloge, altitude, chapitre actif, progression
    ├── ui/boot.js        Écran de démarrage
    └── utils/            Hasard à graine, textures canvas, morceaux de GLSL partagés
```

## Modifier

- **Textes** : dans `index.html`, une `<section class="chapter">` par chapitre.
- **Couleurs** : `PALETTE` dans `src/config.js` pour la 3D, variables `--yellow`,
  `--cyan`, `--magenta`… en haut de `css/style.css` pour l'interface.
- **Cadrages** : `CHAPTERS` dans `src/config.js`. Chaque chapitre a une position de
  caméra (`pos`), un point visé (`look`) et la place de l'implant dans l'écran (`core`).
  Ajouter un chapitre = ajouter une entrée ici **et** une `<section>` dans `index.html`
  (même ordre). Ouvrir la page avec `?debug` expose `window.__NEON__`
  (caméra, implant, scène) dans la console pour trouver de bonnes valeurs.
- **Enseignes** : `SIGNS` dans `src/config.js` (texte japonais + petite ligne latine).
- **Densité de la ville / performances** : `QUALITY` dans `src/config.js`.

## Performances

- La qualité baisse toute seule (résolution de rendu) si l'appareil tombe sous 40 images/s
  dans les premières secondes.
- Sur mobile : moins de tours, de pluie et de trafic, pas d'anticrénelage.
- `prefers-reduced-motion` est respecté : pas de glitch, pluie plus lente, pas de parallaxe.
- Sans WebGL, la page reste lisible (fond dégradé statique).
