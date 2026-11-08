# Lab 01 : premier jour à la brasserie

> **Chapitre** : 2 (commandes de base, permissions, archives, processus, sudo) · **Durée** : 1 h 30
> **VM** : `cuve` ou `fut` (fais-le sur les deux pour voir les différences) · **Prérequis** : Lab 00, fiches 2.1 à 2.15 et 2.A

## Le ticket

> **Ticket #101**, ouvert par Inès Garnier (gérante), priorité haute
>
> Bonjour et bienvenue !
>
> Premier chantier : notre « partage » de fichiers sur le serveur. Pour l’instant, tout le monde jette ses
> fichiers dans `/srv/brasserie/vrac`, et c’est le bazar. Bastien met tout en accès libre, les fiches de paie
> de Chloé sont lisibles par n’importe qui, et je ne retrouve jamais rien. Voilà ce que je voudrais :
>
> 1. Un répertoire par équipe dans `/srv/brasserie/partage` : `brassage` (Bastien), `compta` (Chloé et moi),
>    `boutique` (Malik), et `commun` pour tout le personnel.
> 2. Chaque équipe ne voit **que** son répertoire, mais tout le monde voit `commun`. Dans `commun`, chacun
>    peut déposer des fichiers, mais personne ne doit pouvoir supprimer ceux des autres. Les fichiers créés
>    dans un répertoire d’équipe doivent automatiquement appartenir à l’équipe.
> 3. Range le vrac : les recettes (`.recette`) dans `brassage`, la compta (`.ods`) dans `compta`, la boutique
>    (`.csv`) dans `boutique`, le reste (`.txt`) dans `commun`. Les membres d’une équipe doivent pouvoir lire
>    **et modifier** leurs fichiers ; les autres, rien du tout.
> 4. Chloé a perdu son `bilan-2025-final-VRAIMENT.ods` « quelque part sur le serveur ». Retrouve-le et range-le avec la compta.
> 5. Les vieux documents de `vrac/archives-2023` encombrent : mets-les dans une archive compressée
>    `/srv/brasserie/archives/vrac-2023.tar.gz` qui se décompresse proprement dans un dossier `archives-2023`,
>    puis supprime le dossier.
> 6. Un programme écrit sans arrêt dans le partage depuis des jours. Bastien dit que c’est « le thermostat ». Arrête-le.
> 7. Bastien veut un raccourci `/srv/brasserie/recette-du-moment` qui pointe vers la recette de l’IPA dans le
>    nouveau partage. Et quand le vrac est vide, supprime-le, avec ses vieux liens morts.
> 8. Malik doit pouvoir **redémarrer le service `boutique`** sans m’appeler. Mais seulement ça : pas question
>    qu’il ait les pleins pouvoirs.
> 9. Dernière chose : le script de sauvegarde des recettes `/usr/local/bin/sauvegarde-recettes` ne marche plus
>    depuis que « quelqu’un a touché aux droits ». Répare-le, et lance une sauvegarde.
>
> Merci ! Inès

## Démarrer

```
$ lab start 01
```

Le script crée les comptes (`bastien`, `chloe`, `malik`, `ines`), les groupes (`brasseurs`, `compta`,
`boutique`, `personnel`) et la situation de départ. Tu n’as **pas** à créer de comptes ni de groupes
(c’est le chapitre 7) : ils existent déjà.

## Ce qui est vérifié

`lab check 01` contrôle dix objectifs :

| # | Objectif |
|---|---|
| 1 | Les quatre répertoires d’équipe existent |
| 2 | Groupes et droits des répertoires (équipe seule, héritage du groupe, `commun` protégé) |
| 3 | Les recettes sont rangées dans `brassage`, avec le bon groupe et les bons droits |
| 4 | `compta`, `boutique` et `commun` rangés de même |
| 5 | Le bilan égaré est retrouvé et rangé |
| 6 | L’archive `vrac-2023.tar.gz` est correcte et le dossier d’origine supprimé |
| 7 | Le thermostat ne tourne plus |
| 8 | Le lien `recette-du-moment` existe ; le vrac (et son lien cassé) a disparu |
| 9 | Malik peut redémarrer `boutique` avec sudo, et rien d’autre |
| 10 | Le script de sauvegarde est réparé et a été lancé |

Lance `lab check 01` aussi souvent que tu veux : il ne modifie rien.

## Règles du jeu

- Travaille avec **ton compte** et **`sudo`**, pas dans un shell root : c’est tracé (fiche 2.15).
- Avant chaque commande destructrice (`rm -r`, `mv` avec jokers), **vérifie** ce que désigne le motif avec `echo` ou `ls`.
- Pour la règle sudo, utilise **`visudo`** (fiche 2.15).
- Il y a au moins **trois pièges** cachés dans ce ticket. Les messages de `lab check` te mettront sur la voie.

## Coincé ?

- `lab hint 01 1` : une piste par objectif ; `lab hint 01 2` : la direction ; `lab hint 01 3` : presque la solution.
- Les mêmes indices sont dans [indices.md](indices.md).
- La solution complète, commentée : `lab solution 01` ou [solution.md](solution.md). Essaie vraiment avant !
- Tout recommencer : `lab reset 01` puis `lab start 01`.

## Pour aller plus loin

- Fais le lab sur `fut` (Rocky Linux) : qu’est-ce qui change ? (Indice : regarde `ls -l`, et le chemin de `systemctl`.)
- Connecte-toi en tant que Bastien (`sudo -iu bastien`) et vérifie qu’il ne peut **pas** lire `compta`,
  mais qu’il peut créer un fichier dans `brassage` : quel est son groupe ?
- Dans `commun`, crée un fichier en tant que `chloe`, puis essaie de le supprimer en tant que `bastien`.
