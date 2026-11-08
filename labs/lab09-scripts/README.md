# Lab 09 : scripts d’exploitation

> **Chapitres** : 11 et 13 (scripts shell, fichiers de démarrage) · **Durée** : 2 h
> **VM** : `cuve` (fonctionne aussi sur `fut`) · **Prérequis** : fiches 11.1 à 11.8 et 11.A, 13.1 à 13.3, 7.7

## Le ticket

> **Ticket #911**, ouvert par Inès Garnier (gérante), priorité haute
>
> **Le script d’archivage.** Bastien a écrit `/usr/local/bin/archive-releves` pour archiver les vieux relevés
> des cuves. Bilan : il oublie tous les fichiers dont le nom contient une espace, il fouille aussi les
> sous-répertoires, il supprime les relevés même quand l’archive n’a pas pu être créée, et la semaine dernière,
> lancé sans argument par Malik, il a archivé puis effacé les CSV de son répertoire personnel. Je veux un
> script **digne de la production**, qui respecte ce contrat :
>
> ```
> archive-releves [-n] [-j JOURS] SOURCE DESTINATION
> ```
>
> - il archive les fichiers **`*.csv`** situés **directement** dans SOURCE (pas dans ses sous-répertoires) et
>   modifiés il y a **plus de JOURS jours** (7 par défaut), dans **une** archive
>   `DESTINATION/releves-AAAAMMJJ-HHMMSS.tar.gz` ; l’archive contient les fichiers **sans** leur chemin ;
> - il **supprime** les relevés archivés, **seulement** si l’archive a bien été créée ;
> - **`-n`** : simulation, il affiche la liste des fichiers qu’il archiverait (un par ligne) et ne touche à rien ;
> - erreur d’utilisation (argument manquant, option inconnue) : message d’usage sur la **sortie d’erreur**,
>   code de sortie **2** ; SOURCE qui n’est pas un répertoire, ou DESTINATION où l’on ne peut pas écrire :
>   message sur la sortie d’erreur, code **1** ;
> - rien à archiver : il le dit et sort avec le code **0**, sans créer d’archive ;
> - il ne laisse **aucun fichier temporaire** derrière lui, même en cas d’échec ;
> - chaque archivage réussi laisse une ligne dans le **journal**, avec l’étiquette `archive-releves` ;
> - il fonctionne avec **n’importe quel nom de fichier** (espaces comprises) et passe **shellcheck** sans
>   avertissement.
>
> **Le planning.** Ensuite, fais-le tourner **chaque nuit à 3 h 15** sur `/srv/releves` vers `/srv/archives`,
> sous le compte **`releves`** (pas en root), avec rattrapage si la machine était éteinte. Teste-le une fois.
>
> **L’environnement de l’équipe.**
> - Tout le monde tape `/opt/brasserie/bin/etat-cuves` en entier. Je veux que **tous les utilisateurs** aient
>   `/opt/brasserie/bin` dans leur PATH, **après** les répertoires du système (on ne veut pas qu’un outil maison
>   masque une commande standard). Sans toucher à `/etc/profile`, qui appartient au paquet.
> - Depuis hier, Léa ne peut plus faire de `scp` ni de `rsync` vers cuve. Elle a ajouté un message de bienvenue
>   dans son `.bashrc`… et elle tient à le garder quand elle ouvre un terminal.
> - Les **nouveaux** comptes doivent avoir l’alias `ll` qui lance `ls -lh`.
>
> Inès

## Démarrer

```
$ lab start 09
```

Le script installe le script de Bastien, les outils de la brasserie, trois mois de relevés dans
`/srv/releves` (compte `releves`), et le message de bienvenue de Léa.

## Ce qui est vérifié

`lab check 09` exécute **ton** script sous le compte `releves`, sur des jeux de relevés jetables créés dans
`/tmp/hlw-lab09.*`, avec un environnement minimal et `TMPDIR` pointant vers un répertoire surveillé.

| # | Objectif |
|---|---|
| 1 | Le script est réécrit, exécutable, sans erreur de syntaxe ni avertissement shellcheck |
| 2 | Erreurs d’utilisation : usage sur stderr, codes 2 et 1 |
| 3 | `-n` liste les bons fichiers (dont « cuve 1.csv ») et ne modifie rien |
| 4 | Une archive `releves-AAAAMMJJ-HHMMSS.tar.gz` avec exactement les vieux CSV ; originaux supprimés, le reste intact |
| 5 | `-j JOURS` est respecté |
| 6 | Rien à archiver (code 0, pas d’archive) ; destination interdite (échec, rien supprimé) ; aucun fichier temporaire oublié |
| 7 | Une ligne `archive-releves` dans le journal |
| 8 | `/opt/brasserie/bin` dans le PATH de tous, via `/etc/profile.d`, après le système, sans doublon |
| 9 | Le `.bashrc` de Léa est muet hors session interactive, mais l’accueille dans un terminal |
| 10 | Un compte neuf (`useradd -m`) a l’alias `ll='ls -lh'` |
| 11 | `archive-releves.timer` (3 h 15, Persistent) et `archive-releves.service` (oneshot, User=releves), testé avec succès |

## Règles du jeu

- Écris le script **dans un fichier de travail** (par exemple `~/archive-releves`), teste-le sur des copies
  (`cp -a /srv/releves /tmp/essai`), puis installe-le : `sudo install -m 755 ~/archive-releves /usr/local/bin/`.
- Pour fabriquer des fichiers anciens : `touch -d '10 days ago' fichier.csv`.
- Garde une session ouverte quand tu modifies des fichiers de démarrage, et vérifie avec `bash -n`.
- `lab check 09` aussi souvent que tu veux ; `lab hint 09 1` (puis 2, 3) si tu bloques.

## Pour aller plus loin

- Ajoute une option `-h` qui affiche l’aide sur la sortie **standard** avec le code 0.
- Fais en sorte que deux exécutions simultanées ne puissent pas se marcher dessus (`flock`, fiche 11.A).
- Écris une page de manuel minimale pour ton script (`man ./archive-releves.1`).
