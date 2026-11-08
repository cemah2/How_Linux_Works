# Les labs

Chaque lab met en pratique un ou plusieurs chapitres du livre sur de vraies VM, dans le décor du fil rouge :
tu es l’administrateur ou l’administratrice système de la **Brasserie du Noyau** (voir la page « Fil rouge » du cahier).

## Déroulé d’un lab

1. Lis le **ticket** dans le `README.md` du lab : il décrit le besoin avec les mots de la personne qui l’a ouvert.
2. `lab start NN` prépare la machine (comptes, fichiers, pannes…).
3. Traduis le besoin en commandes. Consulte les fiches du cahier et les pages de manuel.
4. `lab check NN` vérifie chaque objectif et explique ce qui manque. Relance-le autant que tu veux.
5. Coincé ? `lab hint NN 1`, puis `2`, puis `3`. En dernier recours : `lab solution NN`.
6. `lab reset NN` remet la machine dans l’état d’avant le lab (ou restaure un instantané Proxmox).

## Liste

| Lab | Titre | Chapitres | État |
|---|---|---|---|
| [00](lab00-mise-en-place/) | Monter ton labo sur Proxmox | 0 | disponible |
| [01](lab01-premier-jour/) | Premier jour à la brasserie | 2 | disponible |
| 02 | Disques, partitions et volumes | 3, 4 | à venir |
| 03 | Sauvetage du démarrage | 5, 6 | à venir |
| 04 | Services maison avec systemd | 6, 7 | à venir |
| 05 | Comptes, sudo et PAM | 7 | à venir |
| 06 | Le serveur qui rame | 8 | à venir |
| 07 | Le réseau de la brasserie | 9 | à venir |
| 08 | Accès distants sécurisés | 10 | à venir |
| 09 | Scripts d’exploitation | 11, 13 | à venir |
| 10 | Sauvegardes et partages | 12 | à venir |
| 11 | Compiler et installer depuis les sources | 15, 16 | à venir |
| 12 | Conteneurs sous le capot | 17, A4 | à venir |
| 13 | Incident en production (final) | tous | à venir |

## Écrire un lab

Structure d’un répertoire `labNN-nom/` :

| Fichier | Rôle |
|---|---|
| `README.md` | ticket, objectifs, règles du jeu (titre `# Lab NN : …` obligatoire, il est lu par `lab list`) |
| `setup.sh` | prépare la situation de départ (root, idempotent : commence par appeler `reset.sh`) |
| `check.sh` | correction : `objectif` / `exiger` / `refuser` / `fin_objectif` / `bilan NN` (voir `lib/commun.sh`) |
| `reset.sh` | défait tout ce que `setup.sh` a créé |
| `indices.md` | sections `## Niveau 1`, `## Niveau 2`, `## Niveau 3` (lues par `lab hint`) |
| `solution.md` | solution commentée |
| `fichiers/` | fichiers copiés par `setup.sh` |

Les scripts doivent fonctionner sur **Debian 13 et Rocky Linux 10** (variables `FAMILLE` et `GROUPE_ADMIN` de `lib/commun.sh`)
et passer `shellcheck` (vérifié par la CI).
