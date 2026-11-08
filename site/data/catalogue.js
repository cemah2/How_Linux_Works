/*
 * catalogue.js : structure du parcours.
 * - `fichiers` : fichiers de data/ chargés au démarrage (ajoute ici chaque nouveau chapitre).
 * - `chapitres` : tous les chapitres du livre + modules « Au-delà du livre », prêts ou non.
 *   Un chapitre est « disponible » dès que son fichier chXX.js est chargé.
 */
HLW.catalogue({
  titre: 'How Linux Works : cahier pratique',
  depot: 'https://github.com/cemah2/How_Linux_Works',
  accroche: 'Un cahier d’exercices en français construit sur *How Linux Works* de Brian Ward (3ᵉ édition, No Starch Press, 2021). Chaque fiche suit une section du livre : un rappel, des exercices corrigés automatiquement, trois niveaux d’indices, puis des labs sur de vraies machines virtuelles.',

  fichiers: ['glossaire.js', 'glossaire-systeme.js', 'glossaire-reseau.js', 'glossaire-outils.js', 'ch00.js', 'ch01.js', 'ch02.js', 'ch02-suite.js', 'ch03.js', 'ch04.js', 'ch04-suite.js', 'ch05.js', 'ch06.js', 'ch07.js', 'ch08.js', 'ch09.js', 'ch09-suite.js', 'ch10.js', 'ch11.js', 'ch12.js', 'ch13.js', 'ch14.js', 'ch15.js', 'ch16.js', 'ch17.js'],

  blocs: [
    { id: 'socle', nom: 'Mise en place', couleur: 'socle', desc: 'Ton labo, tes outils, tes premiers réflexes.', chapitres: ['00'] },
    { id: 'fond', nom: 'Fondamentaux', couleur: 'fond', desc: 'Les couches du système et la ligne de commande.', chapitres: ['01', '02'] },
    { id: 'sys', nom: 'Le système de l’intérieur', couleur: 'sys', desc: 'Périphériques, disques, démarrage, systemd, utilisateurs, processus.', chapitres: ['03', '04', '05', '06', '07', '08'] },
    { id: 'res', nom: 'Réseau', couleur: 'res', desc: 'TCP/IP, routage, pare-feu, services, partage de fichiers.', chapitres: ['09', '10', '12'] },
    { id: 'out', nom: 'Environnement et outils', couleur: 'out', desc: 'Scripts, environnement utilisateur, compilation, virtualisation.', chapitres: ['11', '13', '14', '15', '16', '17'] },
    { id: 'plus', nom: 'Au-delà du livre', couleur: 'plus', desc: 'Ce que la production exige aujourd’hui et que le livre survole.', chapitres: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8'] },
  ],

  chapitres: [
    { id: '00', num: 0, titre: 'Mise en place de ton labo', bloc: 'socle', certifs: { lfcs: ['EC'], rhcsa: ['R1'] } },
    { id: '01', num: 1, titre: 'Vue d’ensemble', titreEn: 'The Big Picture', pages: '1–10', bloc: 'fond', certifs: { lpic1: ['101.1'] } },
    { id: '02', num: 2, titre: 'Commandes de base et arborescence', titreEn: 'Basic Commands and Directory Hierarchy', pages: '11–46', bloc: 'fond' },
    { id: '03', num: 3, titre: 'Les périphériques', titreEn: 'Devices', pages: '47–68', bloc: 'sys', certifs: { lpic1: ['101.1'], lfcs: ['STO'], rhcsa: ['R5'] } },
    { id: '04', num: 4, titre: 'Disques et systèmes de fichiers', titreEn: 'Disks and Filesystems', pages: '69–116', bloc: 'sys', certifs: { lpic1: ['102.1', '104.1', '104.2', '104.3'], lfcs: ['STO'], rhcsa: ['R5', 'R6'] } },
    { id: '05', num: 5, titre: 'Comment le noyau démarre', titreEn: 'How the Linux Kernel Boots', pages: '117–136', bloc: 'sys', certifs: { lpic1: ['101.2', '102.2'], lfcs: ['OD'], rhcsa: ['R4', 'R7'] } },
    { id: '06', num: 6, titre: 'Le démarrage de l’espace utilisateur', titreEn: 'How User Space Starts', pages: '137–166', bloc: 'sys', certifs: { lpic1: ['101.2', '101.3'], lfcs: ['OD'], rhcsa: ['R4', 'R7'] } },
    { id: '07', num: 7, titre: 'Configuration système : journaux, heure, tâches, utilisateurs', titreEn: 'System Configuration: Logging, System Time, Batch Jobs, and Users', pages: '167–198', bloc: 'sys', certifs: { lpic1: ['107.1', '107.2', '108.1', '108.2', '110.1'], lfcs: ['OD', 'UG'], rhcsa: ['R4', 'R7', 'R9', 'R10'] } },
    { id: '08', num: 8, titre: 'Processus et utilisation des ressources', titreEn: 'A Closer Look at Processes and Resource Utilization', pages: '199–222', bloc: 'sys', certifs: { lpic1: ['103.5', '103.6'], lfcs: ['OD'], rhcsa: ['R4'] } },
    { id: '09', num: 9, titre: 'Comprendre et configurer le réseau', titreEn: 'Understanding Your Network and Its Configuration', pages: '223–268', bloc: 'res', certifs: { lpic1: ['109.1', '109.2', '109.3', '109.4', '110.2'], lfcs: ['NET'], rhcsa: ['R8', 'R10'] } },
    { id: '10', num: 10, titre: 'Applications et services réseau', titreEn: 'Network Applications and Services', pages: '269–290', bloc: 'res', certifs: { lpic1: ['109.3', '110.2', '110.3'], lfcs: ['NET', 'OD'], rhcsa: ['R1', 'R8', 'R10'] } },
    { id: '11', num: 11, titre: 'Introduction aux scripts shell', titreEn: 'Introduction to Shell Scripts', pages: '291–314', bloc: 'out', certifs: { lpic1: ['103.7', '105.2'], lfcs: ['EC', 'OD'], rhcsa: ['R3'] } },
    { id: '12', num: 12, titre: 'Transfert et partage de fichiers en réseau', titreEn: 'Network File Transfer and Sharing', pages: '315–334', bloc: 'res', certifs: { lpic1: ['110.3'], lfcs: ['STO', 'NET'], rhcsa: ['R1', 'R6'] } },
    { id: '13', num: 13, titre: 'Environnements utilisateur', titreEn: 'User Environments', pages: '335–346', bloc: 'out', certifs: { lpic1: ['105.1'], lfcs: ['UG'], rhcsa: ['R9'] } },
    { id: '14', num: 14, titre: 'Bureau Linux et impression (survol)', titreEn: 'A Brief Survey of the Linux Desktop and Printing', pages: '347–362', bloc: 'out', certifs: { lpic1: ['106.1', '106.2', '108.4'] } },
    { id: '15', num: 15, titre: 'Outils de développement', titreEn: 'Development Tools', pages: '363–384', bloc: 'out', certifs: { lpic1: ['102.3'], lfcs: ['OD'] } },
    { id: '16', num: 16, titre: 'Compiler un logiciel depuis ses sources C', titreEn: 'Introduction to Compiling Software from C Source Code', pages: '385–400', bloc: 'out', certifs: { lpic1: ['102.4', '102.5'], lfcs: ['OD'], rhcsa: ['R2'] } },
    { id: '17', num: 17, titre: 'Virtualisation', titreEn: 'Virtualization', pages: '401–418', bloc: 'out', certifs: { lpic1: ['102.6'], lfcs: ['OD'] } },
    { id: 'A1', titre: 'Gérer les paquets : apt, dnf, Flatpak', bloc: 'plus', auDela: true, certifs: { lpic1: ['102.4', '102.5'], lfcs: ['OD'], rhcsa: ['R2'] } },
    { id: 'A2', titre: 'Pare-feu moderne : nftables et firewalld', bloc: 'plus', auDela: true, certifs: { lpic1: ['110.2'], lfcs: ['NET'], rhcsa: ['R10'] } },
    { id: 'A3', titre: 'Contrôle d’accès obligatoire : SELinux et AppArmor', bloc: 'plus', auDela: true, certifs: { lfcs: ['OD'], rhcsa: ['R10'] } },
    { id: 'A4', titre: 'Namespaces : construire un conteneur à la main', bloc: 'plus', auDela: true, certifs: { lfcs: ['OD'] } },
    { id: 'A5', titre: 'Stockage avancé : RAID logiciel, LVM, chiffrement', bloc: 'plus', auDela: true, certifs: { lfcs: ['STO'], rhcsa: ['R5', 'R6'] } },
    { id: 'A6', titre: 'Observabilité : perf, eBPF, bpftrace', bloc: 'plus', auDela: true, certifs: { lfcs: ['OD'] } },
    { id: 'A7', titre: 'Automatiser avec Ansible', bloc: 'plus', auDela: true, certifs: { lfcs: ['OD'] } },
    { id: 'A8', titre: 'Exploiter en production : durcissement, sauvegardes, supervision', bloc: 'plus', auDela: true, certifs: { lpic1: ['110.1', '110.2'], lfcs: ['OD'], rhcsa: ['R10'] } },
  ],

  labsIntro: `
    Les labs mettent les notions en pratique sur de **vraies machines virtuelles**, dans le décor du
    [fil rouge](#/fil-rouge) : tu es le nouvel administrateur de la Brasserie du Noyau.

    Chaque lab part d’un **ticket** (le besoin métier), donne des objectifs vérifiables, puis se corrige
    automatiquement avec l’outil \`lab\` installé dans les VM :

    \`\`\`
    $ lab list          # labs disponibles
    $ lab start 01      # prépare la machine pour le lab 01
    $ lab check 01      # corrige ton travail, objectif par objectif
    $ lab hint 01 2     # affiche l’indice de niveau 2
    $ lab reset 01      # remet le lab à zéro
    \`\`\`

    L’infrastructure se déploie sur **Proxmox VE** avec des scripts fournis (\`infra/proxmox/\`) :
    modèles cloud-init **Debian 13** et **Rocky Linux 10**, réseau de lab isolé, instantanés avant chaque
    lab. Commence par le **Lab 00**.
  `,

  labs: [
    { id: 'lab00', titre: 'Monter ton labo sur Proxmox', chapitres: ['00'], duree: '1 h', vms: ['cuve (Debian 13)', 'fut (Rocky 10)'], statut: 'disponible', chemin: 'labs/lab00-mise-en-place',
      resume: 'Créer les modèles cloud-init, déployer les deux premières VM de la brasserie, se connecter en SSH avec une clé, installer l’outil `lab` et prendre un premier instantané.' },
    { id: 'lab01', titre: 'Premier jour à la brasserie', chapitres: ['02'], duree: '1 h 30', vms: ['cuve ou fut'], statut: 'disponible', chemin: 'labs/lab01-premier-jour',
      resume: 'Ticket #101 : organiser le partage de fichiers des équipes (arborescence, groupes, permissions, setgid), archiver les vieux documents, retrouver des fichiers égarés, arrêter un processus fou et déléguer un droit sudo précis. Inclut une panne à réparer.' },
    { id: 'lab02', titre: 'De nouveaux disques pour la boutique', chapitres: ['03', '04'], duree: '2 h', vms: ['cuve ou fut + 2 disques'], statut: 'disponible', chemin: 'labs/lab02-disques',
      resume: 'Ticket #214 : deux disques ajoutés à chaud depuis Proxmox, un groupe LVM, des volumes ext4, XFS et swap, fstab par UUID, une migration de données sans perte, une extension à chaud. Et un système de fichiers « plein » avec de la place libre.' },
    { id: 'lab03', titre: 'Sauvetage du démarrage', chapitres: ['05', '06'], duree: '1 h 30', vms: ['cuve puis fut', 'console Proxmox'], statut: 'disponible', chemin: 'labs/lab03-demarrage',
      resume: 'Ticket #307 : la VM démarre en mode d’urgence. Quatre causes empilées (fstab, paramètre du noyau dans GRUB, cible par défaut, services mal déclarés) à trouver depuis la console, puis un rapport d’incident.' },
    { id: 'lab04', titre: 'Des services dignes de ce nom', chapitres: ['06', '07'], duree: '1 h 30', vms: ['cuve ou fut'], statut: 'disponible', chemin: 'labs/lab04-services',
      resume: 'Ticket #418 : transformer un programme lancé à la main en vrai service (compte système, fichier d’environnement, redémarrage automatique), adapter l’unité d’un éditeur par une surcharge, remplacer une ligne cron par un timer.' },
    { id: 'lab05', titre: 'Arrivées, départ et journaux', chapitres: ['07'], duree: '1 h 30', vms: ['cuve puis fut'], statut: 'disponible', chemin: 'labs/lab05-comptes',
      resume: 'Ticket #522 : créer des comptes avec mot de passe provisoire et expiration, bloquer un salarié parti sans le supprimer, imposer une politique de mots de passe avec PAM, rendre le journal persistant, faire tourner un journal sans perte et mener un audit SSH.' },
    { id: 'lab06', titre: 'Le serveur qui rame', chapitres: ['08'], duree: '1 h 30', vms: ['cuve ou fut'], statut: 'disponible', chemin: 'labs/lab06-performances',
      resume: 'Ticket #613 : quatre coupables à démasquer (processeur, disque, mémoire, espace disque fantôme) et à contenir sans rien arrêter : nice, ionice, cgroups via systemd, lsof +L1. Puis sysstat pour garder l’historique.' },
    { id: 'lab07', titre: 'Le réseau de la brasserie', chapitres: ['09'], duree: '3 h', vms: ['douane', 'cuve', 'comptoir'], statut: 'disponible', chemin: 'labs/lab07-reseau',
      resume: 'Ticket #701 : faire de « douane » le routeur de la boutique : adresse fixe par Netplan, routage, DHCP et DNS avec dnsmasq (réservation, domaine brasserie.lan), NAT et pare-feu nftables ; le comptoir en DHCP, cuve sur deux réseaux avec DNS par interface. Trois machines, un correcteur par rôle.' },
    { id: 'lab08', titre: 'Accès distants sécurisés', chapitres: ['10'], duree: '2 h', vms: ['douane', 'cuve', 'comptoir'], statut: 'disponible', chemin: 'labs/lab08-ssh',
      resume: 'Ticket #815 : après un audit, durcir sshd par surcharge (clés, AllowGroups, ListenAddress), faire de douane un bastion avec fail2ban, installer la clé de Bastien, débusquer un service oublié, et prouver le tout avec nmap et tcpdump.' },
    { id: 'lab09', titre: 'Scripts d’exploitation', chapitres: ['11', '13'], duree: '2 h', vms: ['cuve'], statut: 'a-venir', chemin: 'labs/lab09-scripts',
      resume: 'Écrire un script robuste (arguments, codes de sortie, fichiers temporaires, journalisation) et configurer l’environnement des utilisateurs.' },
    { id: 'lab10', titre: 'Sauvegardes et partages', chapitres: ['12'], duree: '2 h', vms: ['cuve', 'comptoir', 'douane'], statut: 'disponible', chemin: 'labs/lab10-partages',
      resume: 'Ticket #1003 : partage NFS (et le piège des UID), partage Samba en SMB3 monté en CIFS sans mot de passe en clair, SSHFS pour un accès ponctuel, et une sauvegarde nocturne rsync vers douane avec un compte dédié, une clé restreinte (rrsync) et un timer.' },
    { id: 'lab11', titre: 'Compiler et installer depuis les sources', chapitres: ['15', '16'], duree: '1 h 30', vms: ['cuve'], statut: 'a-venir', chemin: 'labs/lab11-compilation',
      resume: 'Bibliothèques partagées, make, autoconf, pkg-config, patch et installation propre dans /usr/local.' },
    { id: 'lab12', titre: 'Conteneurs sous le capot', chapitres: ['17', 'A4'], duree: '2 h', vms: ['fut'], statut: 'a-venir', chemin: 'labs/lab12-conteneurs',
      resume: 'Podman et Docker, images et couches, puis un conteneur construit à la main avec unshare, chroot et les cgroups.' },
    { id: 'lab13', titre: 'Incident en production', chapitres: ['04', '06', '07', '08', '09', '10'], duree: '3 h', vms: ['toutes'], statut: 'a-venir', chemin: 'labs/lab13-incident',
      resume: 'Lab final : la boutique en ligne est tombée un vendredi soir. Plusieurs pannes enchaînées, un rapport d’incident à rédiger.' },
  ],

  examens: [
    { id: 'bloc1', titre: 'Examen blanc : Fondamentaux', chapitres: ['01', '02'], questions: 25, duree: 35, seuil: 70 },
    { id: 'bloc2', titre: 'Examen blanc : le système de l’intérieur', chapitres: ['03', '04', '05', '06', '07', '08'], questions: 40, duree: 60, seuil: 70 },
    { id: 'bloc3', titre: 'Examen blanc : réseau', chapitres: ['09', '10', '12'], questions: 30, duree: 45, seuil: 70 },
    { id: 'bloc4', titre: 'Examen blanc : environnement et outils', chapitres: ['11', '13', '14', '15', '16', '17'], questions: 30, duree: 45, seuil: 70 },
    { id: 'final', titre: 'Examen final (format LPIC : 60 questions, 90 min)', chapitres: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17'], questions: 60, duree: 90, seuil: 70 },
  ],

  certifsIntro: `
    Ce cahier ne remplace pas une préparation dédiée, mais il couvre une grande partie des objectifs de trois
    certifications reconnues. Le tableau indique où chaque objectif est travaillé. Les modules « Au-delà du livre »
    comblent les manques les plus importants (paquets, SELinux, pare-feu moderne).

    > Les intitulés sont traduits et résumés. Vérifie toujours la version officielle des objectifs avant de t’inscrire.
  `,

  certifs: {
    lpic1: {
      nom: 'LPIC-1 (LPI)',
      info: 'Version 5.0, examens 101-500 et 102-500 : 60 questions en 90 minutes chacun (QCM et réponses à compléter).',
      objectifs: {
        '101.1': 'Déterminer et configurer le matériel',
        '101.2': 'Démarrer le système',
        '101.3': 'Changer de cible (runlevel), arrêter, redémarrer',
        '102.1': 'Concevoir le partitionnement des disques',
        '102.2': 'Installer un chargeur de démarrage',
        '102.3': 'Gérer les bibliothèques partagées',
        '102.4': 'Gestion de paquets Debian',
        '102.5': 'Gestion de paquets RPM et YUM/DNF',
        '102.6': 'Linux en tant qu’invité de virtualisation',
        '103.1': 'Travailler en ligne de commande',
        '103.2': 'Traiter des flux de texte avec des filtres',
        '103.3': 'Gestion de base des fichiers',
        '103.4': 'Flux, tubes et redirections',
        '103.5': 'Créer, surveiller et tuer des processus',
        '103.6': 'Modifier la priorité des processus',
        '103.7': 'Rechercher avec des expressions régulières',
        '103.8': 'Édition de fichiers (vi)',
        '104.1': 'Créer des partitions et des systèmes de fichiers',
        '104.2': 'Maintenir l’intégrité des systèmes de fichiers',
        '104.3': 'Monter et démonter des systèmes de fichiers',
        '104.5': 'Gérer permissions et propriétaires',
        '104.6': 'Liens physiques et symboliques',
        '104.7': 'Trouver et placer les fichiers système (FHS)',
        '105.1': 'Personnaliser l’environnement du shell',
        '105.2': 'Écrire des scripts simples',
        '106.1': 'Installer et configurer X11',
        '106.2': 'Bureaux graphiques',
        '107.1': 'Gérer comptes utilisateurs et groupes',
        '107.2': 'Planifier des tâches',
        '108.1': 'Maintenir l’heure système',
        '108.2': 'Journalisation système',
        '108.4': 'Gérer l’impression',
        '109.1': 'Fondamentaux des protocoles Internet',
        '109.2': 'Configuration réseau persistante',
        '109.3': 'Dépannage réseau de base',
        '109.4': 'Configurer la résolution DNS côté client',
        '110.1': 'Tâches d’administration de la sécurité',
        '110.2': 'Sécuriser un hôte',
        '110.3': 'Protéger les données par le chiffrement',
      },
    },
    lfcs: {
      nom: 'LFCS (Linux Foundation)',
      info: 'Examen pratique de 2 heures, indépendant de la distribution (domaines en vigueur depuis mai 2023).',
      objectifs: {
        EC: 'Commandes essentielles (20 %)',
        OD: 'Exploitation et déploiement (25 %)',
        NET: 'Réseau (25 %)',
        STO: 'Stockage (20 %)',
        UG: 'Utilisateurs et groupes (10 %)',
      },
    },
    rhcsa: {
      nom: 'RHCSA (Red Hat, EX200)',
      info: 'Examen pratique de 3 heures basé sur RHEL 10. Rocky Linux 10 est un excellent terrain d’entraînement.',
      objectifs: {
        R1: 'Comprendre et utiliser les outils essentiels',
        R2: 'Gérer les logiciels (RPM, Flatpak)',
        R3: 'Créer des scripts shell simples',
        R4: 'Exploiter un système en fonctionnement',
        R5: 'Configurer le stockage local',
        R6: 'Créer et configurer des systèmes de fichiers',
        R7: 'Déployer, configurer et maintenir des systèmes',
        R8: 'Gérer le réseau de base',
        R9: 'Gérer utilisateurs et groupes',
        R10: 'Gérer la sécurité',
      },
    },
  },

  filRouge: `
    La **Brasserie du Noyau** est une microbrasserie lyonnaise de 30 personnes : une salle de brassage,
    un bar, et une boutique en ligne qui représente déjà 40 % du chiffre d’affaires. Jusqu’ici, l’informatique
    tenait sur un vieux serveur que « tout le monde administrait un peu ». C’est fini : **tu es la première
    personne recrutée comme administrateur ou administratrice système.**

    ### Les personnes que tu vas croiser

    - **Inès Garnier**, fondatrice et gérante. Elle veut que « ça marche » et que les données clients soient protégées.
    - **Bastien Roux**, maître brasseur. Ses recettes sont le trésor de la maison ; il a la fâcheuse habitude de tout mettre en \`chmod 777\`.
    - **Chloé Martin**, comptable. Ses fichiers sont confidentiels et elle doit pouvoir les retrouver.
    - **Malik Benali**, développeur freelance de la boutique en ligne. Il a besoin de redémarrer *son* service, et rien d’autre.

    ### L’infrastructure, telle que tu vas la construire

    | Machine | Rôle | Distribution | Apparaît au |
    |---|---|---|---|
    | \`cuve\` | Serveur principal : fichiers, services internes | Debian 13 | Lab 00 |
    | \`fut\` | Serveur applicatif de la boutique | Rocky Linux 10 | Lab 00 |
    | \`douane\` | Routeur et pare-feu entre le réseau de la brasserie et Internet | Debian 13 | Lab 07 |
    | \`comptoir\` | Poste de travail d’un salarié | Debian 13 | Lab 07 |

    Les noms suivent le métier : la **cuve** où l’on brasse, le **fût** où l’on garde, la **douane** qui contrôle
    ce qui entre et sort, le **comptoir** où l’on sert.

    ### Comment ça se passe

    Chaque lab commence par un **ticket**, comme dans une vraie équipe d’exploitation. Il décrit un besoin ou une panne
    avec les mots de la personne qui l’a ouvert, pas avec des commandes. À toi de traduire le besoin en actions,
    puis de lancer \`lab check\` pour vérifier que l’infrastructure est dans l’état attendu.

    À la fin du parcours, le **Lab 13** déclenche un incident en production : tout ce que tu auras construit
    sera mis à l’épreuve en même temps.
  `,

  aide: `
    ### Le principe

    Le cahier suit le livre **section par section**. Pour chaque fiche :

    1. Lis la section indiquée dans le livre (références de pages en haut de la fiche).
    2. Lis le **rappel**, rédigé en français : il résume l’essentiel et ajoute parfois ce qui a changé depuis 2021.
    3. Fais les **exercices**, dans l’ordre : leur difficulté monte (niveau 1 à 3, indiqué par les petits carrés).
    4. Fais le **lab** du chapitre sur tes VM quand il existe.

    ### Les types d’exercices

    | Type | Ce qu’on attend de toi | Correction |
    |---|---|---|
    | QCM | Cocher la ou les bonnes réponses | automatique |
    | Vrai ou faux | Juger chaque affirmation | automatique |
    | Commande | Écrire la commande qui fait le travail | automatique, avec tolérance |
    | Réponse courte | Un mot, un nombre, un chemin | automatique |
    | Prédire la sortie | Écrire ce qu’une commande va afficher | automatique |
    | Remettre dans l’ordre | Ordonner des étapes | automatique |
    | Associer | Relier des éléments deux à deux | automatique |
    | Compléter | Remplir les trous d’un fichier de configuration ou d’une commande | automatique |
    | Question ouverte | Expliquer avec tes mots | auto-évaluation |
    | Pratique sur la VM | Faire une manipulation réelle | vérifiée si tu colles la sortie, sinon auto-évaluation |

    **Commandes** : il existe souvent plusieurs bonnes réponses (\`ls -la\`, \`ls -al\`, \`ls -l -a\`…). Si la tienne n’est pas
    reconnue, le cahier ne la compte pas fausse : compare-la avec la solution et, si elle est équivalente, clique sur
    **« Ma réponse était équivalente »**. Mieux encore : teste-la sur ta VM.

    ### Indices et score

    - Chaque exercice propose jusqu’à **trois indices**, du plus vague au plus précis : une piste, une direction, puis presque la réponse.
    - Un exercice réussi sans indice vaut **100 %**. Chaque indice retire **20 %** (minimum 40 %).
    - Consulter la solution avant d’avoir réussi met l’exercice à **0 %** (il reste consultable, et tu peux le recommencer plus tard).

    ### Réviser

    - Les **cartes de révision** fonctionnent par boîtes (méthode Leitner) : une carte sue revient dans 1, 3, 7, 16 puis 35 jours ; une carte ratée revient le lendemain.
    - La page **Révisions** liste aussi les exercices ratés, ceux dont tu as vu la solution, et ceux réussis avec deux indices ou plus.
    - Les **examens blancs** tirent des questions au hasard, sans indice, chronométrées.

    ### Ta progression

    Tout est enregistré **dans ce navigateur**, rien n’est envoyé nulle part. Pense à **exporter** ta progression
    (page *Ma progression*) pour la sauvegarder ou changer d’appareil.

    ### Conseils pour débuter

    - **Tape les commandes** plutôt que de les copier-coller : c’est comme ça qu’elles restent.
    - Travaille sur une **VM jetable** : tu as le droit de tout casser, c’est même conseillé.
    - Quand une commande échoue, **lis le message d’erreur en entier** (fiche 2.9).
    - \`man\` est ton meilleur ami (fiche 2.7).
  `,
});
