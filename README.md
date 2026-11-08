# How Linux Works : cahier pratique interactif (en français)

Partie pratique complète du livre **[How Linux Works, 3ᵉ édition](https://nostarch.com/howlinuxworks3)** de Brian Ward
(No Starch Press, 2021). Le but est d’acquérir une **vraie expertise d’administration Linux**, chapitre après chapitre :

- des **fiches interactives** qui suivent le livre section par section : rappel en français, exercices corrigés automatiquement,
  **trois niveaux d’indices**, solution expliquée, référence de page ;
- **10 types d’exercices** : QCM, vrai ou faux, commande à écrire, réponse courte, prédire la sortie, remettre dans l’ordre,
  associer, compléter un fichier de configuration, question ouverte, manipulation sur la VM ;
- des **labs** sur de vraies machines virtuelles **Proxmox** (Debian 13 et Rocky Linux 10), corrigés par un script,
  dans un **fil rouge** : la Brasserie du Noyau, dont tu es le nouvel administrateur ;
- des **cartes de révision** à répétition espacée, des **examens blancs** chronométrés, un **glossaire français / anglais**,
  des **mémos imprimables** et la **correspondance avec les certifications** LPIC-1, LFCS et RHCSA ;
- des modules **« Au-delà du livre »** pour ce que la production exige aujourd’hui (paquets, nftables, SELinux, namespaces…).

> Ce dépôt ne contient pas le livre : procure-toi-le. Les fiches le résument et le complètent avec leurs propres mots,
> et renvoient aux sections et aux pages correspondantes.

## Utiliser le cahier

**En ligne** : via GitHub Pages, une fois activé (voir plus bas).

**En local**, sans rien installer : télécharge le dépôt et ouvre `site/index.html` dans ton navigateur. Le site fonctionne
hors ligne ; ta progression est enregistrée dans le navigateur (exportable en fichier).

## Les labs

Il faut un hyperviseur. Avec Proxmox VE :

```
# git clone https://github.com/cemah2/How_Linux_Works.git && cd How_Linux_Works/infra/proxmox
# cp lab.conf.exemple lab.conf && nano lab.conf
# ./creer-modeles.sh && ./deployer.sh base
```

Puis, dans une VM : `lab list`, `lab start 01`, `lab check 01`, `lab hint 01 2`. Le pas à pas est dans le
[Lab 00](labs/lab00-mise-en-place/README.md), le détail de l’infrastructure dans [infra/proxmox](infra/proxmox/README.md).

## Avancement

| Partie | Contenu | État |
|---|---|---|
| Moteur des fiches | 10 types d’exercices, indices, progression, révisions, examens, glossaire, mémos | ✅ |
| Chapitre 0 : mise en place | 4 fiches, 16 exercices | ✅ |
| Chapitre 1 : vue d’ensemble | 6 fiches, 36 exercices | ✅ |
| Chapitre 2 : commandes et arborescence | 17 fiches (dont 2 hors livre), 146 exercices | ✅ |
| Chapitres 3 à 8 : le système de l’intérieur | 48 fiches, 269 exercices, examen blanc du bloc 2 | ✅ |
| Infrastructure Proxmox + outil `lab` | modèles, déploiement, instantanés, disques supplémentaires | ✅ |
| Labs 00 à 06 | mise en place, permissions, disques/LVM, démarrage, systemd, comptes/PAM, performances | ✅ |
| Chapitres 9 à 17, modules A1 à A8, labs 07 à 13 | | voir [ROADMAP.md](ROADMAP.md) |

## Organisation du dépôt

```
site/                 le cahier interactif (HTML/CSS/JS sans étape de compilation)
  index.html
  assets/             moteur (core.js, exercises.js, app.js), styles, polices, marked
  data/               contenu : catalogue.js, glossaire.js, chXX.js (un fichier par chapitre)
labs/                 énoncés et scripts des labs (setup, check, reset, indices, solution)
infra/proxmox/        scripts de création et de pilotage des VM
infra/bin/lab         l’outil « lab » installé dans les VM
tools/validate.mjs    validation des données avec le vrai moteur de correction
.github/workflows/    intégration continue et publication sur GitHub Pages
```

## Contribuer

Le format des fiches et des exercices est décrit dans [CONTRIBUTING.md](CONTRIBUTING.md). Avant chaque commit :

```
node tools/validate.mjs
shellcheck -x -P SCRIPTDIR -e SC2016,SC1112 infra/bin/lab infra/proxmox/*.sh labs/lib/*.sh labs/lab*/*.sh
```

## Publier sur GitHub Pages

Le workflow `.github/workflows/pages.yml` publie le dossier `site/` à chaque push sur `main`. Il faut l’activer une fois :
**Settings → Pages → Source : GitHub Actions**. GitHub Pages n’est gratuit que pour les dépôts **publics** (ou avec un compte payant).

## Crédits

- Livre : Brian Ward, *How Linux Works, 3rd Edition*, No Starch Press, 2021.
- Polices : Atkinson Hyperlegible (Braille Institute) et JetBrains Mono, sous licence SIL Open Font License (fichiers dans `site/assets/fonts`).
- Rendu Markdown : [marked](https://github.com/markedjs/marked), licence MIT.
