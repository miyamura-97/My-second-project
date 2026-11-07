"""Passe le mode anime du QG de Salah de Dragon Ball à Cyberpunk: Edgerunners.

Usage :  python appliquer.py chemin/vers/la_page_du_QG.html [sortie.html]
Sans sortie, la page est modifiée sur place et l'ancienne version est gardée à côté (.avant-edgerunners.html).
Les données collées dans la page (relevé, vignettes) ne sont pas touchées.
"""
import re
import shutil
import sys
from pathlib import Path

ICI = Path(__file__).resolve().parent


def convertir(s: str) -> str:
    def sub(old, new, count=1):
        nonlocal s
        n = s.count(old)
        if n != count:
            raise SystemExit(f"Motif introuvable ou en double ({n}) : {old[:70]!r}")
        s = s.replace(old, new)

    # 1. polices : Bangers -> Big Shoulders Display + DotGothic16
    sub('family=Bangers&family=Figtree', 'family=Big+Shoulders+Display:wght@700;900&family=DotGothic16&family=Figtree')
    sub('  --f-manga: "Bangers", "Figtree", system-ui, sans-serif;', '  --f-cyber: "Big Shoulders Display", "Figtree", system-ui, sans-serif;')
    s = s.replace('var(--f-manga)', 'var(--f-cyber)')

    # 2. CSS du mode anime : du commentaire « Mode anime (par défaut) » jusqu'à </style>
    a = s.index('/* Mode anime (par défaut) : un ciel de combat en plein jour.')
    b = s.index('</style>', a)
    s = s[:a] + (ICI / 'css_anime.css').read_text(encoding='utf-8') + s[b:]
    sub('body.mode-anime .sem-pc { --filet: rgba(255, 196, 61, .16); }', 'body.mode-anime .sem-pc { --filet: rgba(243, 230, 0, .14); }')
    sub('body.mode-anime .bouton-3d.cloche-bouton { border: 2px solid #0d1530; box-shadow: inset 0 0 0 1px rgba(255, 196, 61, .4), 4px 4px 0 rgba(8, 14, 38, .45); }',
        'body.mode-anime .bouton-3d.cloche-bouton { border: 1px solid rgba(243, 230, 0, .4); box-shadow: 0 0 20px rgba(255, 42, 109, .14); }')
    sub('body.mode-anime .bouton-3d.cloche-bouton:hover { background: color-mix(in srgb, #ffb21f 24%, var(--verre)); }',
        'body.mode-anime .bouton-3d.cloche-bouton:hover { background: color-mix(in srgb, #f3e600 16%, var(--verre)); }')

    # 3. HTML du détecteur : « Street cred », légende des halos
    sub('<section class="detecteur" id="detecteur" hidden aria-label="Niveau de puissance du QG">', '<section class="detecteur" id="detecteur" hidden aria-label="Street cred du QG">')
    sub('<p class="det-tete"><span>Niveau de puissance</span><i aria-hidden="true"></i></p>', '<p class="det-tete"><span>Street cred</span><i aria-hidden="true"></i></p>')
    sub('''      <ul class="det-legende" aria-label="Couleur des auras">
        <li><i style="--e:#ffc21a"></i>au travail ou en départ</li>
        <li><i style="--e:#55e597"></i>calme</li>
        <li><i style="--e:#ff9324"></i>à faire</li>
        <li><i style="--e:#ff2d4a"></i>bloqué</li>
      </ul>''', '''      <ul class="det-legende" aria-label="Couleur des halos">
        <li><i style="--e:#f3e600"></i>au travail</li>
        <li><i style="--e:#00f0ff"></i>en départ</li>
        <li><i style="--e:#39ff9c"></i>calme</li>
        <li><i style="--e:#ff9a3c"></i>à faire</li>
        <li><i style="--e:#ff003c"></i>bloqué</li>
      </ul>''')

    # 4. textes du script
    sub('/* ---------- mode anime : le détecteur de puissance ---------- */', "/* ---------- mode anime : le street cred (l'afficheur du haut, ancien détecteur de puissance) ---------- */")
    old_aria = re.search(r"  anime: \"Vue 3D du QG en mode anime : l'arène du Tournoi du Pouvoir[^\n]*\n", s)
    if not old_aria:
        raise SystemExit("Texte d'accessibilité du mode anime introuvable")
    s = s.replace(old_aria.group(0), "  anime: \"Vue 3D du QG en mode anime : le toit d'une mégatour de Night City, où chaque agent travaille sous les traits d'un personnage de Cyberpunk: Edgerunners ; un Sandevistan géant tient la place du cerveau, Maine celle du chef de cabinet\",\n")

    # 5. la scène 3D du mode anime, remplacée d'un bloc
    a = s.index("/* ---------- scène 3D, mode anime : l'arène du Tournoi du Pouvoir ----------")
    b = s.index('/* ---------- données ---------- */', a)
    s = s[:a] + (ICI / 'anime_edge.js').read_text(encoding='utf-8').rstrip('\n') + '\n\n' + s[b:]
    return s


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    src = Path(sys.argv[1])
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else src
    s = src.read_text(encoding='utf-8')
    if "un toit de Night City" in s:
        raise SystemExit('Cette page est déjà en mode Edgerunners : rien à faire.')
    neuf = convertir(s)
    if out == src:
        shutil.copyfile(src, src.with_suffix('.avant-edgerunners.html'))
    out.write_text(neuf, encoding='utf-8')
    print(f'Mode anime Edgerunners écrit dans {out}')


if __name__ == '__main__':
    main()
