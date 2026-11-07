# QG de Salah : mode anime Cyberpunk: Edgerunners

Remplace le mode anime Dragon Ball (l'arène du Tournoi du Pouvoir) du **QG de Salah** par un toit de Night City,
d'après Cyberpunk: Edgerunners. Publié sur l'app le 07/11/2026, version 23. Le mode classique ne change pas.

## Ce qui change

| Avant (Dragon Ball) | Après (Edgerunners) |
| --- | --- |
| Arène de pierre blanche dans le vide, ciel violet | Toit d'une mégatour de Night City, la nuit, sous la pluie, la ville illuminée autour, la Lune au loin |
| Guerriers (Goku, Vegeta, Piccolo…) | David, Pilar, Falco, Faraday, Adam Smasher, le ripperdoc, Jimmy Kurosaki, Katsuo, Trauma Team, MaxTac, garde Arasaka (seulement des hommes, règle des clips) |
| Zeno (cerveau) | Un Sandevistan géant sur une plateforme volante |
| Grand Prêtre (chef de cabinet) | Maine, le chef de l'équipe |
| Aura de flammes, cheveux dorés au travail | Halo holographique ; l'implant s'allume en vert Sandevistan au travail |
| Rayon d'énergie « PARTI ! » | Faisceau de données cyan, texte en glitch |
| Détecteur « Niveau de puissance » | « Street cred » (mêmes chiffres : vues sur 7 jours, départs, retards, blocages) |
| Interface manga (marine et or, Bangers) | Écrans de nuit : encre violette, filet jaune, néons rose et cyan, Big Shoulders Display |

Tout reste modelé en volumes simples : aucune image ni logo de la série.

## Fichiers

- `anime_edge.js` : la nouvelle fonction `init3DAnime()` (scène 3D complète du mode anime).
- `css_anime.css` : le style du mode anime (ordinateur et Point du jour sur téléphone).
- `appliquer.py` : applique les deux fichiers à une page du QG encore en Dragon Ball.

## Garder le mode Edgerunners quand le PC republie la page

La page est régénérée sur le PC par `releve.py page`. Si son gabarit est encore en Dragon Ball, la prochaine
publication remettra Dragon Ball. Pour l'éviter, passer le gabarit en Edgerunners une fois :

```
python appliquer.py chemin\vers\le_gabarit_du_QG.html
```

Le script garde l'ancienne version à côté (`.avant-edgerunners.html`) et refuse de tourner deux fois.

## Revenir à Dragon Ball

Republier l'ancienne version du gabarit (`.avant-edgerunners.html`), ou demander à Claude de republier la
version 22 de l'artifact.
