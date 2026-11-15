# Consigne : réparer les alertes « after dusk »

À coller dans une session Claude Code ouverte dans le dossier `afterdusk` sur le PC de Salah.

---

Tu es le réparateur du système after dusk. Salah a reçu des alertes PowerShell. Répare leurs causes, puis vérifie que les alertes ne reviennent pas. Réponds en français, sans détour.

## Étape 1 : comprendre (ne rien modifier)
1. Lis `_systeme/liens_journal.tsv` et `_systeme/contrats.json`.
2. Liste toutes les alertes ouvertes, pas seulement celles ci-dessous. Pour chacune : lien concerné, cause réelle, fichier touché.
3. Alertes connues au 15/11/2026 :
   - **L26** : « Edit programmé → porte verte AVANT la sortie ». La vidéo `e101_draken_moon` (sortie 16/11 à 08h45) est programmée alors que son verdict est ROUGE (1 rouge, 0 non fait). Deux autres liens touchés : **L30** et **L33**.
   - **L37** : le test a été réécrit et ADOUCI (motif). L'ancien test aurait échoué aujourd'hui, le nouveau passe.

## Étape 2 : réparer
- **L26, L30, L33** : pour chaque vidéo concernée, corriger le point rouge (la rendre vraiment prête). Si ce n'est pas faisable avant la sortie, la **dé-programmer** et dire à Salah quelle sortie saute. Une vidéo ROUGE ne sort jamais.
- **L37** : rétablir le test d'origine (retrouve-le dans `liens_journal.tsv` ou dans l'historique git), puis corriger le vrai problème qu'il détectait. Ne laisse **aucun** test plus tolérant qu'avant.

## Règles strictes
- Ne jamais adoucir, retirer ou contourner un test, un contrat ou une « porte » pour faire disparaître une alerte. La seule réparation valable corrige la cause.
- Ne rien publier, ne rien soumettre à une campagne, ne rien envoyer sur une plateforme : seulement réparer, programmer ou dé-programmer.
- Avant de supprimer un fichier, l'afficher et demander. Ne jamais toucher aux mots de passe, codes de connexion ou clés.
- Si une réparation sort de ce cadre ou demande un choix de Salah, s'arrêter et poser **une seule question groupée**.
- Halal pour tout contenu et tout choix.

## Étape 3 : vérifier
1. Relance le contrôle des liens (la commande habituelle du dossier `_systeme`).
2. Résultat attendu : plus aucune alerte rouge, plus de « tolérance ou retrait » dans `contrats.json`.
3. Montre la sortie du contrôle et la liste de ce que tu as changé, fichier par fichier.

## Étape 4 : rapport
Termine par : ce qui est réparé, ce qui a été dé-programmé (avec l'heure de sortie perdue), ce qui attend Salah, et ce qui pourrait recasser.
