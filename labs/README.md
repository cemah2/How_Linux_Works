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
| [02](lab02-disques/) | De nouveaux disques pour la boutique | 3, 4 | disponible |
| [03](lab03-demarrage/) | Sauvetage du démarrage | 5, 6 | disponible |
| [04](lab04-services/) | Des services dignes de ce nom | 6, 7 | disponible |
| [05](lab05-comptes/) | Arrivées, départ et journaux | 7 | disponible |
| [06](lab06-performances/) | Le serveur qui rame | 8 | disponible |
| [07](lab07-reseau/) | Le réseau de la brasserie | 9 | disponible |
| [08](lab08-ssh/) | Accès distants sécurisés | 10 | disponible |
| 09 | Scripts d’exploitation | 11, 13 | à venir |
| [10](lab10-partages/) | Sauvegardes et partages | 12 | disponible |
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
| `panne.sh` | (labs de dépannage) déclenche la panne, lancé par `lab panne NN` |
| `fichiers/` | fichiers copiés par `setup.sh` |

Les scripts doivent fonctionner sur **Debian 13 et Rocky Linux 10** (variables `FAMILLE` et `GROUPE_ADMIN` de `lib/commun.sh`)
et passer `shellcheck` (vérifié par la CI). Chaque lab a un test de bout en bout `tools/tester-labNN.sh`
(setup → correction qui échoue → solution → correction qui valide → reset), joué par la CI sur une machine jetable.

Quelques règles apprises à la dure :

- Un démon de lab qu’on veut retrouver par son nom (`pgrep -x`, `pkill -x`) commence par `#!/bin/bash` ou
  `#!/usr/bin/python3`, jamais par `#!/usr/bin/env …` : sinon le processus s’appelle `bash` ou `python3`.
- Jamais de `pkill -f motif` dans un reset : il tue aussi le shell de l’étudiant si sa ligne de commande contient le motif.
- Les labs à plusieurs machines (07, 08, 10) ont **un correcteur par rôle** : la machine se reconnaît à son nom
  (`douane`, `cuve`, `comptoir`), qu’une variable `LABNN_ROLE` peut forcer pour les tests. La CI les rejoue sur une
  seule machine, avec des espaces de noms réseau ou des interfaces factices.
- Les comptes partagés entre labs (bastien, malik, ines, chloe) se créent avec `assurer_compte`, qui note ce qu’il crée :
  le reset d’un lab ne supprime que ce que ce lab a créé.
