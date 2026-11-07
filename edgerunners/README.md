# Cyberpunk: Edgerunners (fan-projet personnel)

Scène 3D interactive de Night City, pilotée par le défilement, en Three.js.
Le Sandevistan de David suit la caméra d'un chapitre à l'autre : on traverse Night City,
on passe devant la tour Arasaka, on rencontre l'équipe de Maine, puis la Lune de Lucy
se lève à la fin.

Projet personnel, non publié. Cyberpunk: Edgerunners © CD PROJEKT RED, Studio Trigger,
Netflix. La ville, le Sandevistan, la Lune et les enseignes sont générés par le code ;
le logo est une recréation en SVG, remplaçable par le fichier officiel (voir plus bas).

## Lancer en local

Les modules JavaScript ne se chargent pas si on ouvre `index.html` directement
(`file://`). Il faut un petit serveur :

- **Windows** : double-cliquer sur `lancer.bat` (ouvre http://localhost:8000).
- **Ailleurs** : `python3 -m http.server 8000` dans ce dossier, puis ouvrir http://localhost:8000.

Il faut une connexion internet : Three.js 0.160.0 et les polices viennent de CDN
(jsDelivr, Google Fonts).

## Logo officiel et photos des personnages

Dépose tes fichiers dans `assets/` (détail dans [`assets/README.md`](assets/README.md)) :

- `assets/logo.png` remplace automatiquement la recréation SVG du logo ;
- `assets/crew/david.jpg`, `lucy.jpg`, `rebecca.jpg`, `maine.jpg`, `dorio.jpg`,
  `kiwi.jpg`, `pilar.jpg`, `falco.jpg` s'affichent dans les cartes de l'équipe.

`.gitignore` exclut ces fichiers de Git : ils restent sur ton PC.

## Ce qu'on peut faire sur la page

| Action | Effet |
| --- | --- |
| Faire défiler | La caméra traverse les 5 chapitres : Night City, Arasaka, Sandevistan, L'équipe, La Lune |
| Bouger la souris | Parallaxe légère de la caméra |
| Maintenir `Espace`, le bouton « Sandevistan » ou un appui long | Sandevistan : le temps passe à ×0,12, pluie et trafic ralentissent, le Sandevistan s'ouvre et laisse des images rémanentes arc-en-ciel |
| Cliquer un chapitre dans la barre du haut | Saut direct au chapitre |

## Organisation

```
edgerunners/
├── index.html            Structure, logo SVG, textes et cartes de l'équipe
├── css/style.css         Styles (palette en variables CSS en haut du fichier)
├── assets/               Tes fichiers officiels (logo, photos), hors Git
├── lancer.bat            Serveur local Windows
└── src/
    ├── main.js           Point d'entrée : moteur, assemblage de la scène, boucle
    ├── config.js         TOUS LES RÉGLAGES : palette, qualité, caméra par chapitre,
    │                     tour Arasaka, enseignes
    ├── world/            Ce qu'on voit
    │   ├── sky.js        Ciel dégradé + étoiles
    │   ├── city.js       Tours (1 seul appel de dessin) + tour Arasaka ; fenêtres et néons en shader
    │   ├── ground.js     Sol mouillé, voies, bordures néon
    │   ├── signs.js      Enseignes holographiques (Militech, Afterlife, Arasaka…) dessinées sur canvas
    │   ├── traffic.js    Voitures volantes (traînées lumineuses)
    │   ├── rain.js       Pluie animée sur le GPU
    │   ├── moon.js       Lune procédurale + halo, se lève au dernier chapitre
    │   └── core.js       Le Sandevistan : coque de chrome en 20 plaques, cœur d'énergie, anneaux
    ├── fx/
    │   ├── postfx.js     Bloom + passe écran (aberration, glitch, balayage, grain, vignette)
    │   └── timeDilation.js  Sandevistan : ralenti et images rémanentes
    ├── rig/scrollRig.js  Caméra pilotée par le défilement, calée sur chaque <section>
    ├── ui/hud.js         Horloge, altitude, chapitre actif, progression
    ├── ui/boot.js        Écran de démarrage
    └── utils/            Hasard à graine, textures canvas, morceaux de GLSL partagés
```

## Modifier

- **Textes** : dans `index.html`, une `<section class="chapter">` par chapitre.
- **Couleurs** : `PALETTE` dans `src/config.js` pour la 3D, variables `--yellow`,
  `--cyan`, `--magenta`… en haut de `css/style.css` pour l'interface.
- **Cadrages** : `CHAPTERS` dans `src/config.js`. Chaque chapitre a une position de
  caméra (`pos`), un point visé (`look`) et la place du Sandevistan dans l'écran (`core`).
  Ajouter un chapitre = ajouter une entrée ici **et** une `<section>` dans `index.html`
  (même ordre). Ouvrir la page avec `?debug` expose `window.__SCENE__`
  (caméra, Sandevistan, scène, `rig.snap()`) dans la console pour trouver de bonnes valeurs.
- **Enseignes** : `SIGNS` et `ARASAKA_SIGNS` dans `src/config.js`.
- **Tour Arasaka** : `WORLD.arasaka` dans `src/config.js` (position, emprise, hauteur).
- **Densité de la ville / performances** : `QUALITY` dans `src/config.js`.

## Performances

- Tous les shaders sont compilés au démarrage : pas de saccade quand un objet entre dans le champ.
- La qualité baisse toute seule (résolution de rendu) si l'appareil tombe sous 40 images/s
  dans les premières secondes.
- Sur mobile : moins de tours, de pluie et de trafic, pas d'anticrénelage.
- `prefers-reduced-motion` est respecté : pas de glitch, pluie plus lente, pas de parallaxe.
- Sans WebGL, la page reste lisible (fond dégradé statique).
