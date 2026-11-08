/* Chapitre 5 : How the Linux Kernel Boots (livre p. 117–136). */
HLW.chapitre({
  id: '05',
  num: 5,
  intro: `
    Entre l’appui sur le bouton et l’apparition de l’invite de connexion, plusieurs programmes se passent le relais :
    le **micrologiciel** (BIOS ou UEFI), le **chargeur de démarrage** (GRUB), le **noyau**, puis **init** (chapitre 6).
    Ce chapitre couvre les trois premiers : lire les messages du noyau, lui passer des **paramètres**, comprendre et
    configurer **GRUB**, et savoir ce que changent **UEFI** et **Secure Boot**.

    C’est la connaissance qui permet de relever une machine qui ne démarre plus. Le **Lab 03** te fera casser puis
    réparer le démarrage de tes VM par la console Proxmox. Note : tes VM démarrent par défaut en **BIOS** (SeaBIOS),
    les images cloud savent aussi démarrer en UEFI.
  `,
  objectifs: [
    'décrire la séquence de démarrage, du micrologiciel à init ;',
    'lire les messages du noyau avec `journalctl -k` et `dmesg` ;',
    'lire et modifier les paramètres du noyau, ponctuellement ou durablement ;',
    'utiliser le menu et la ligne de commande de GRUB ;',
    'régénérer la configuration de GRUB sur Debian et sur Rocky ;',
    'expliquer la différence entre démarrage BIOS/MBR et UEFI, et le rôle de Secure Boot.',
  ],
  certifs: { lpic1: ['101.2', '102.2'], lfcs: ['OD'], rhcsa: ['R4', 'R7'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '5.1',
      titre: 'La séquence de démarrage et les messages du noyau',
      sections: '§5 à 5.2', pages: '117–120',
      objectif: 'Savoir qui fait quoi au démarrage et lire ce que le noyau raconte.',
      rappel: `
        ### Le relais

        1. Le **micrologiciel** (BIOS ou UEFI) initialise le matériel minimal et lance le **chargeur de démarrage**.
        2. Le chargeur (GRUB) trouve l’**image du noyau** sur le disque, la charge en mémoire avec l’**initramfs**, et lui passe des **paramètres**.
        3. Le **noyau** s’initialise, puis lance **init** (PID 1, systemd).
        4. init démarre les services de l’espace utilisateur (chapitre 6), jusqu’à l’invite de connexion.

        ### Ce que fait le noyau, dans l’ordre

        1. examen du processeur ;
        2. examen de la mémoire ;
        3. découverte des bus et des périphériques ;
        4. mise en place des sous-systèmes auxiliaires (réseau…) ;
        5. montage du système de fichiers racine ;
        6. démarrage de l’espace utilisateur (init).

        ### Lire les messages

        \`\`\`
        $ journalctl -k            # messages du noyau depuis le démarrage (journal systemd)
        $ journalctl -k -b -1      # … du démarrage précédent (si le journal est persistant)
        $ sudo dmesg               # le tampon circulaire du noyau (souvent réservé à root)
        $ sudo dmesg -T | less     # avec des dates lisibles
        \`\`\`

        Tu y verras la version du noyau, la mémoire détectée, les disques (\`sd 2:0:0:0: [sda] … QEMU HARDDISK\`),
        le montage de la racine, puis le lancement de systemd. Quand un démarrage échoue, c’est la première chose à lire.
      `,
      aRetenir: [
        'Micrologiciel → chargeur (GRUB) → noyau + initramfs → init (systemd).',
        'Le noyau : processeur, mémoire, bus et périphériques, sous-systèmes, racine, init.',
        '`journalctl -k`, `sudo dmesg -T`.',
      ],
      exercices: [
        {
          id: 'c05-01-01', type: 'ordre', niveau: 1, ref: '§5, p. 117–118',
          enonce: 'Remets dans l’ordre les étapes du démarrage d’une machine Linux.',
          elements: [
            'Le micrologiciel (BIOS ou UEFI) s’exécute et lance le chargeur de démarrage',
            'Le chargeur (GRUB) charge le noyau et l’initramfs en mémoire, avec les paramètres',
            'Le noyau initialise le matériel et monte la racine',
            'Le noyau lance init (systemd, PID 1)',
            'init démarre les services, jusqu’à l’invite de connexion',
          ],
          indices: ['Le premier programme est stocké sur la carte mère.', 'Le noyau ne se charge pas tout seul.', 'init est le premier processus de l’espace utilisateur.'],
          solution: 'Micrologiciel → chargeur → noyau → init → services.',
        },
        {
          id: 'c05-01-02', type: 'ordre', niveau: 2, ref: '§5.2, p. 119',
          enonce: 'Remets dans l’ordre les grandes étapes de l’initialisation **du noyau**.',
          elements: [
            'Examen du processeur',
            'Examen de la mémoire',
            'Découverte des bus et des périphériques',
            'Mise en place des sous-systèmes auxiliaires (réseau…)',
            'Montage du système de fichiers racine',
            'Démarrage de l’espace utilisateur (init)',
          ],
          indices: ['Le noyau commence par ce sur quoi il tourne.', 'Il faut connaître les périphériques avant de monter un disque.', 'init vient en tout dernier.'],
          solution: 'Processeur, mémoire, périphériques, sous-systèmes, racine, init. Ces étapes se lisent dans `journalctl -k`.',
        },
        {
          id: 'c05-01-03', type: 'commande', niveau: 1, ref: '§5.1, p. 118',
          enonce: 'Affiche les messages du **noyau** pour le démarrage en cours, avec `journalctl`.',
          accepte: ['(sudo )?journalctl -k( -b)?', '(sudo )?journalctl --dmesg( -b)?', '(sudo )?journalctl -b -k', '(sudo )?journalctl -kb'],
          exemple: 'journalctl -k',
          indices: ['L’option correspond à *kernel*.', 'Une seule lettre.', '`journalctl -k`'],
          solution: '```\n$ journalctl -k\n… kernel: Linux version 6.12.… (debian-kernel@lists.debian.org) …\n… kernel: Command line: BOOT_IMAGE=/boot/vmlinuz-… root=PARTUUID=… ro console=ttyS0 …\n```\n`journalctl -k -b -1` montre le démarrage précédent (si le journal est conservé sur disque, chapitre 7).',
        },
        {
          id: 'c05-01-04', type: 'commande', niveau: 1, ref: '§5.1, p. 118',
          enonce: 'Affiche le tampon de messages du noyau avec des **dates lisibles**, en root.',
          accepte: ['(sudo )?dmesg -T( \\| less)?', '(sudo )?dmesg --ctime( \\| less)?', '(sudo )?dmesg -HT', '(sudo )?dmesg -TH'],
          exemple: 'dmesg -T',
          indices: ['La commande historique : `dmesg`.', 'Une option convertit les horodatages en dates.', '`-T`'],
          solution: '```\n# dmesg -T\n[sam. nov.  8 18:02:11 2026] Linux version 6.12…\n```\nSans `-T`, les horodatages sont en secondes depuis le démarrage.',
        },
        {
          id: 'c05-01-05', type: 'terminal', niveau: 2,
          enonce: 'Sur ta VM, cherche dans les messages du noyau la détection du disque et le montage de la racine : `journalctl -k | grep -Ei "sda|EXT4-fs|XFS"`. Colle la sortie.',
          attendu: ['sda'],
          indices: ['Le disque apparaît sous la forme `[sda]`.', 'Sur cuve, la racine est en ext4 ; sur fut, en XFS.', 'Repère aussi « QEMU HARDDISK ».'],
          solution: 'Tu vois `sd 2:0:0:0: [sda] 33554432 512-byte logical blocks: (17.2 GB/16.0 GiB)`, puis le montage de la racine (`EXT4-fs (sda1): mounted filesystem…` sur Debian, `XFS (sda4): Mounting V5 Filesystem` sur Rocky). Tu retrouves l’adresse SCSI `2:0:0:0` du chapitre 3.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '5.2',
      titre: 'Les paramètres du noyau',
      sections: '§5.3', pages: '120–121',
      objectif: 'Lire les paramètres de démarrage et en ajouter, ponctuellement ou durablement.',
      rappel: `
        Le chargeur passe au noyau une ligne de **paramètres** texte, qui règle son comportement :

        \`\`\`
        $ cat /proc/cmdline
        BOOT_IMAGE=/boot/vmlinuz-6.12.48+deb13-cloud-amd64 root=PARTUUID=… ro console=tty0 console=ttyS0,115200
        \`\`\`

        | Paramètre | Rôle |
        |---|---|
        | \`root=\` | où se trouve le système de fichiers racine |
        | \`ro\` | monter la racine en **lecture seule** au début (fsck possible), systemd la repasse en écriture |
        | \`quiet\` | moins de messages à l’écran |
        | \`console=\` | où envoyer les messages (\`ttyS0\` : le port série, fiche 3.5) |
        | \`init=\` | programme à lancer à la place de \`/sbin/init\` (dépannage : \`init=/bin/bash\`) |
        | \`systemd.unit=\` | cible systemd à atteindre (\`rescue.target\`, \`emergency.target\`) |
        | \`single\`, \`1\` | mode mono-utilisateur (compatibilité, = \`rescue.target\`) |

        Le noyau transmet à **init** les paramètres qu’il ne reconnaît pas : c’est ainsi que \`single\` arrive jusqu’à systemd.

        ### Modifier les paramètres

        - **Ponctuellement** (un seul démarrage) : dans le menu GRUB, touche **e**, modifier la ligne \`linux\`, puis **Ctrl-X** (fiche 5.3).
        - **Durablement** (complément) :
          - Debian : modifier \`GRUB_CMDLINE_LINUX\` dans \`/etc/default/grub\`, puis \`update-grub\` ;
          - Rocky : \`grubby --update-kernel=ALL --args="paramètre"\` (ou \`--remove-args\`).
      `,
      aRetenir: [
        '`cat /proc/cmdline` : les paramètres du démarrage en cours.',
        '`root=`, `ro`, `quiet`, `console=`, `init=`, `systemd.unit=`, `single`.',
        'Paramètres inconnus du noyau → transmis à init.',
        'Durable : `/etc/default/grub` + `update-grub` (Debian) ; `grubby --args` (Rocky).',
      ],
      exercices: [
        {
          id: 'c05-02-01', type: 'commande', niveau: 1, ref: '§5.3, p. 120',
          enonce: 'Affiche les paramètres passés au noyau lors du démarrage en cours.',
          accepte: ['cat /proc/cmdline'],
          exemple: 'cat /proc/cmdline',
          indices: ['C’est un fichier de `/proc`.', 'Son nom évoque la « ligne de commande ».', '`cat /proc/cmdline`'],
          solution: '```\n$ cat /proc/cmdline\nBOOT_IMAGE=/boot/vmlinuz-… root=PARTUUID=… ro console=tty0 console=ttyS0,115200\n```',
        },
        {
          id: 'c05-02-02', type: 'association', niveau: 1, ref: '§5.3, p. 120–121',
          enonce: 'Associe chaque paramètre du noyau à son rôle.',
          paires: [
            ['`root=`', 'Emplacement du système de fichiers racine'],
            ['`ro`', 'Monter la racine en lecture seule au début du démarrage'],
            ['`quiet`', 'Réduire les messages affichés'],
            ['`console=ttyS0`', 'Envoyer les messages sur le port série'],
            ['`init=/bin/bash`', 'Lancer un shell à la place d’init'],
          ],
          indices: ['ro = *read-only*.', 'ttyS0 : fiche 3.5.', 'init= remplace le premier processus.'],
          solution: 'root=, ro, quiet, console=, init= : tu les retrouveras tous dans le Lab 03.',
        },
        {
          id: 'c05-02-03', type: 'qcm', niveau: 2, ref: '§5.3, p. 121',
          enonce: 'Que devient un paramètre que le noyau ne reconnaît pas, comme `single` ?',
          choix: ['Il est transmis à init', 'Le noyau s’arrête avec une erreur', 'Il est ignoré silencieusement par tout le monde', 'GRUB le supprime avant le démarrage'],
          reponse: 0,
          indices: ['Le noyau n’est pas le seul à lire la ligne de commande.', 'Le processus suivant peut s’en servir.', 'C’est le PID 1.'],
          solution: 'Il est transmis à **init**. systemd comprend `single` (ou `1`) comme une demande de `rescue.target`.',
        },
        {
          id: 'c05-02-04', type: 'qcm', niveau: 2, ref: '§5.3',
          enonce: 'Pourquoi la ligne de commande contient-elle souvent `ro`, alors que la racine est utilisable en écriture une fois démarrée ?',
          choix: [
            'Pour qu’un fsck puisse vérifier la racine en sécurité ; systemd la remonte ensuite en lecture-écriture',
            'Parce que la racine est réellement en lecture seule pendant toute l’exécution',
            'Pour accélérer la lecture des fichiers',
            'C’est un paramètre obsolète sans effet',
          ],
          reponse: 0,
          indices: ['fsck ne doit pas travailler sur un système monté en écriture (fiche 4.7).', 'Quelqu’un remonte la racine plus tard.', 'Le service systemd-remount-fs s’en charge.'],
          solution: 'Démarrer en lecture seule permet de vérifier la racine ; puis `systemd-remount-fs` la repasse en écriture selon fstab.',
        },
        {
          id: 'c05-02-05', type: 'commande', niveau: 3,
          enonce: 'Sur **Rocky** (fut), ajoute durablement le paramètre `audit=1` à **tous** les noyaux installés, avec l’outil propre à la famille Red Hat.',
          accepte: ['(sudo )?grubby --update-kernel=ALL --args=["\']?audit=1["\']?', '(sudo )?grubby --update-kernel ALL --args ["\']?audit=1["\']?', '(sudo )?grubby --args=["\']?audit=1["\']? --update-kernel=ALL'],
          exemple: 'grubby --update-kernel=ALL --args="audit=1"',
          indices: ['L’outil s’appelle `grubby`.', 'Il faut viser tous les noyaux : `--update-kernel=ALL`.', 'Et ajouter avec `--args`.'],
          solution: '```\n# grubby --update-kernel=ALL --args="audit=1"\n# grubby --info=DEFAULT          # vérifier\n```\nSur Debian, on modifierait `GRUB_CMDLINE_LINUX` dans `/etc/default/grub` puis `update-grub`.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '5.3',
      titre: 'Les chargeurs de démarrage et l’interface de GRUB',
      sections: '§5.4 à 5.5.1', pages: '121–127',
      objectif: 'Utiliser le menu et la ligne de commande de GRUB.',
      rappel: `
        ### Le rôle du chargeur

        Le chargeur de démarrage doit : choisir un noyau parmi plusieurs, le charger en mémoire avec l’initramfs, lui passer
        ses paramètres, puis lui donner la main. Il doit le faire **avant** que le moindre pilote de disque ou de système de
        fichiers soit chargé : il s’appuie sur le micrologiciel (BIOS, UEFI) pour lire le disque, et embarque ses propres
        pilotes de systèmes de fichiers.

        **GRUB** (*GRand Unified Bootloader*) est le standard sur Linux. D’autres existent : systemd-boot, SYSLINUX, LILO (historique).

        ### Le menu

        | Touche | Effet |
        |---|---|
        | flèches | choisir une entrée |
        | **e** | **éditer** l’entrée pour ce démarrage (paramètres du noyau) |
        | **Ctrl-X** ou **F10** | démarrer l’entrée modifiée |
        | **c** | ouvrir la **ligne de commande** de GRUB |
        | Échap | revenir |

        Dans l’éditeur, la ligne qui commence par \`linux\` porte le noyau et ses paramètres ; la ligne \`initrd\` l’initramfs.

        > Sur les images cloud, le menu est souvent caché ou dure 0 seconde. Le Lab 03 te fait d’abord rallonger ce délai.

        ### La ligne de commande de GRUB

        \`\`\`
        grub> ls                         # disques et partitions vus par GRUB
        (hd0) (hd0,gpt1) (hd0,gpt14) (hd0,gpt15)
        grub> ls -l                      # avec types et UUID
        grub> echo $root                 # partition racine de GRUB
        hd0,gpt1
        grub> ls ($root)/boot            # parcourir un système de fichiers
        grub> set                        # toutes les variables
        \`\`\`

        GRUB a sa propre notation : \`(hd0,gpt1)\` = premier disque, première partition GPT (\`msdos1\` pour MBR).
        Les disques commencent à 0, les partitions à 1.
      `,
      aRetenir: [
        'Chargeur : choisir, charger noyau + initramfs, passer les paramètres ; il lit le disque sans les pilotes du noyau.',
        'Menu GRUB : **e** éditer, **Ctrl-X**/F10 démarrer, **c** ligne de commande.',
        'Notation GRUB : `(hd0,gpt1)` ; `ls`, `echo $root`, `set`.',
      ],
      exercices: [
        {
          id: 'c05-03-01', type: 'association', niveau: 1, ref: '§5.5, p. 124–125',
          enonce: 'Associe chaque touche du menu GRUB à son effet.',
          paires: [
            ['e', 'Éditer l’entrée sélectionnée pour ce démarrage'],
            ['Ctrl-X', 'Démarrer l’entrée modifiée'],
            ['c', 'Ouvrir la ligne de commande de GRUB'],
            ['Échap', 'Revenir au menu sans démarrer'],
          ],
          indices: ['e = *edit*, c = *command*.', 'F10 est équivalent à Ctrl-X.', 'Échap annule.'],
          solution: 'e, Ctrl-X (ou F10), c, Échap. Les modifications faites avec e ne valent que pour ce démarrage.',
        },
        {
          id: 'c05-03-02', type: 'qcm', niveau: 2, ref: '§5.5',
          enonce: 'Dans l’éditeur d’une entrée GRUB, sur quelle ligne ajoutes-tu un paramètre du noyau comme `systemd.unit=rescue.target` ?',
          choix: ['La ligne qui commence par `linux`', 'La ligne qui commence par `initrd`', 'La ligne `set root=…`', 'Une nouvelle ligne en fin d’entrée'],
          reponse: 0,
          indices: ['Les paramètres suivent le chemin du noyau.', 'Le noyau est chargé par la commande…', '`linux /boot/vmlinuz-… root=… ro …`'],
          solution: 'Sur la ligne `linux` (parfois `linuxefi`), à la fin, après les paramètres existants. `initrd` ne charge que l’image initramfs.',
        },
        {
          id: 'c05-03-03', type: 'reponse-courte', niveau: 2, casse: true, mono: true, ref: '§5.5.1, p. 125–126',
          enonce: 'Dans la notation GRUB, comment désigne-t-on la **troisième** partition GPT du **deuxième** disque ?',
          accepte: ['\\(hd1,gpt3\\)', 'hd1,gpt3'],
          indices: ['Les disques sont numérotés à partir de 0.', 'Les partitions à partir de 1.', '(hdX,gptY)'],
          solution: '`(hd1,gpt3)` : le deuxième disque est `hd1`, la troisième partition `gpt3`.',
        },
        {
          id: 'c05-03-04', type: 'vrai-faux', niveau: 2, ref: '§5.4, p. 121–123',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'GRUB doit lire le disque sans disposer des pilotes du noyau Linux.', vrai: true },
            { texte: 'Une modification faite avec la touche e dans le menu est enregistrée définitivement.', vrai: false, explication: 'Elle ne vaut que pour ce démarrage.' },
            { texte: 'GRUB embarque ses propres pilotes de systèmes de fichiers (ext4, XFS…).', vrai: true },
            { texte: 'GRUB est le seul chargeur de démarrage capable de lancer Linux.', vrai: false, explication: 'systemd-boot, SYSLINUX ou même le micrologiciel UEFI directement peuvent le faire.' },
          ],
          indices: ['Le noyau n’est pas encore chargé quand GRUB travaille.', 'Deux vraies, deux fausses.', 'Pense à systemd-boot.'],
          solution: 'Vrai, faux, vrai, faux.',
        },
        {
          id: 'c05-03-05', type: 'ordre', niveau: 2,
          enonce: 'Remets dans l’ordre la procédure pour démarrer **une fois** en `rescue.target` depuis le menu GRUB (console Proxmox).',
          elements: [
            'Redémarrer la VM et attendre le menu GRUB dans la console',
            'Sélectionner l’entrée habituelle et appuyer sur e',
            'Aller à la fin de la ligne `linux`',
            'Ajouter ` systemd.unit=rescue.target`',
            'Démarrer avec Ctrl-X',
          ],
          indices: ['Il faut voir le menu.', 'On édite, on modifie la bonne ligne.', 'On démarre en dernier.'],
          solution: 'Menu → e → fin de la ligne `linux` → ajout du paramètre → Ctrl-X. Au prochain redémarrage, tout redevient normal.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '5.4',
      titre: 'Configurer et installer GRUB',
      sections: '§5.5.2 et 5.5.3', pages: '127–131',
      objectif: 'Régénérer la configuration de GRUB sur Debian et Rocky, et savoir (ré)installer GRUB.',
      rappel: `
        ### La configuration est générée

        Le fichier lu par GRUB, \`grub.cfg\`, n’est **pas** fait pour être modifié à la main : il est **généré** par
        \`grub-mkconfig\` à partir de :

        - \`/etc/default/grub\` : réglages (\`GRUB_TIMEOUT\`, \`GRUB_TIMEOUT_STYLE\`, \`GRUB_DEFAULT\`, \`GRUB_CMDLINE_LINUX\`…) ;
        - \`/etc/grub.d/\` : scripts qui produisent chaque partie (\`10_linux\` détecte les noyaux, \`40_custom\` pour tes entrées).

        | | Debian | Rocky |
        |---|---|---|
        | Fichier généré | \`/boot/grub/grub.cfg\` | \`/boot/grub2/grub.cfg\` |
        | Régénérer | \`update-grub\` (= \`grub-mkconfig -o /boot/grub/grub.cfg\`) | \`grub2-mkconfig -o /boot/grub2/grub.cfg\` |
        | Entrées des noyaux | dans grub.cfg | fichiers BLS dans \`/boot/loader/entries/\`, gérés par \`grubby\` |

        \`\`\`
        # nano /etc/default/grub         # GRUB_TIMEOUT=5  et  GRUB_TIMEOUT_STYLE=menu
        # update-grub                    # Debian
        # grub2-mkconfig -o /boot/grub2/grub.cfg   # Rocky
        \`\`\`

        > \`grub-mkconfig\` sans \`-o\` affiche le résultat à l’écran sans rien écrire : pratique pour vérifier.

        ### Installer GRUB

        Installer GRUB, c’est écrire son code de démarrage au bon endroit : rarement nécessaire (l’installation l’a fait),
        mais indispensable après un disque remplacé ou un MBR écrasé.

        \`\`\`
        # grub-install /dev/sda                                   # BIOS : sur le disque (pas sur une partition)
        # grub-install --efi-directory=/boot/efi --bootloader-id=debian   # UEFI
        \`\`\`

        Sur Rocky, l’équivalent BIOS est \`grub2-install /dev/sda\` ; en UEFI, on réinstalle plutôt les paquets \`grub2-efi\` et \`shim\`.
      `,
      aRetenir: [
        '`grub.cfg` est généré : ne pas l’éditer. On modifie `/etc/default/grub` ou `/etc/grub.d/`.',
        'Debian : `update-grub` → `/boot/grub/grub.cfg`. Rocky : `grub2-mkconfig -o /boot/grub2/grub.cfg`, entrées BLS + `grubby`.',
        '`grub-install /dev/sda` (le disque) pour réinstaller en BIOS.',
      ],
      exercices: [
        {
          id: 'c05-04-01', type: 'qcm', niveau: 1, ref: '§5.5.2, p. 127–129',
          enonce: 'Tu veux que le menu GRUB reste affiché 5 secondes. Quel fichier modifies-tu ?',
          choix: ['`/etc/default/grub`', '`/boot/grub/grub.cfg`', '`/etc/grub.d/10_linux`', '`/proc/cmdline`'],
          reponse: 0,
          indices: ['grub.cfg est généré et serait écrasé.', 'Les réglages généraux sont dans un fichier « par défaut ».', 'Variable `GRUB_TIMEOUT`.'],
          solution: '`/etc/default/grub` (`GRUB_TIMEOUT=5`, et `GRUB_TIMEOUT_STYLE=menu` pour que le menu ne soit pas caché), puis régénérer grub.cfg.',
        },
        {
          id: 'c05-04-02', type: 'commande', niveau: 1,
          enonce: 'Sur **Debian** (cuve), régénère la configuration de GRUB après avoir modifié `/etc/default/grub`.',
          accepte: ['(sudo )?update-grub2?', '(sudo )?grub-mkconfig -o /boot/grub/grub\\.cfg'],
          exemple: 'update-grub',
          indices: ['Debian fournit un raccourci.', 'Son nom : mettre à jour GRUB.', '`update-grub`'],
          solution: '```\n# update-grub\nGenerating grub configuration file ...\nFound linux image: /boot/vmlinuz-6.12…\ndone\n```\nC’est un raccourci pour `grub-mkconfig -o /boot/grub/grub.cfg`.',
        },
        {
          id: 'c05-04-03', type: 'commande', niveau: 2,
          enonce: 'Sur **Rocky** (fut), régénère le fichier de configuration de GRUB.',
          accepte: ['(sudo )?grub2-mkconfig -o /boot/grub2/grub\\.cfg', '(sudo )?grub2-mkconfig --output=/boot/grub2/grub\\.cfg'],
          exemple: 'grub2-mkconfig -o /boot/grub2/grub.cfg',
          pieges: [{ motif: '(sudo )?update-grub2?', message: '`update-grub` est propre à Debian/Ubuntu. Sur Rocky, l’outil porte un « 2 » dans son nom.' }],
          indices: ['Sur la famille Red Hat, les commandes GRUB portent un 2.', 'Il faut préciser le fichier de sortie avec `-o`.', '`grub2-mkconfig -o /boot/grub2/grub.cfg`'],
          solution: '```\n# grub2-mkconfig -o /boot/grub2/grub.cfg\n```\nLes entrées des noyaux, elles, sont dans `/boot/loader/entries/` (format BLS) et se modifient avec `grubby`.',
        },
        {
          id: 'c05-04-04', type: 'trous', niveau: 2, ref: '§5.5.2',
          enonce: 'Complète `/etc/default/grub` pour démarrer par défaut sur la **première** entrée du menu, et afficher ce menu pendant 5 secondes.',
          texte: 'GRUB_DEFAULT=[[1]]\nGRUB_TIMEOUT=[[2]]\nGRUB_TIMEOUT_STYLE=[[3]]',
          trous: [
            { accepte: ['0', 'saved'], exemple: '0' },
            { accepte: ['5'], exemple: '5' },
            { accepte: ['menu'], exemple: 'menu' },
          ],
          indices: ['Les entrées du menu sont numérotées à partir de 0.', 'Le délai est en secondes.', 'Le style qui affiche le menu porte son nom.'],
          solution: '```\nGRUB_DEFAULT=0\nGRUB_TIMEOUT=5\nGRUB_TIMEOUT_STYLE=menu\n```\nPuis `update-grub` (Debian) ou `grub2-mkconfig -o /boot/grub2/grub.cfg` (Rocky). `GRUB_DEFAULT=saved` reprend la dernière entrée choisie (avec `grub-set-default`).',
        },
        {
          id: 'c05-04-05', type: 'qcm', niveau: 2, ref: '§5.5.3, p. 130',
          enonce: 'Sur une machine BIOS, tu remplaces le disque système et restaures les fichiers. Où installes-tu GRUB ?',
          choix: ['Sur le disque entier : `grub-install /dev/sda`', 'Sur la partition racine : `grub-install /dev/sda1`', 'Dans `/boot/grub/grub.cfg`', 'Il n’y a rien à installer'],
          reponse: 0,
          indices: ['Le BIOS lit le début du **disque**.', 'Le code de démarrage va dans le MBR (et la zone qui suit).', 'On vise le disque, pas une partition.'],
          solution: '`grub-install /dev/sda` : le BIOS exécute le code du MBR du disque. Installer sur une partition est déconseillé.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '5.5',
      titre: 'BIOS, UEFI et Secure Boot',
      sections: '§5.6 à 5.8', pages: '131–136',
      objectif: 'Comprendre les deux modes de démarrage et le rôle de Secure Boot.',
      rappel: `
        ### Démarrage BIOS / MBR (§5.8.1)

        Le BIOS lit le **premier secteur** du disque (le MBR, 512 octets) et exécute le petit code qui s’y trouve (environ
        440 octets). Ce code ne peut pas faire grand-chose : il charge le reste de GRUB (le *core image*), placé juste après
        le MBR, ou dans une petite **partition de démarrage BIOS** sur un disque GPT. GRUB charge ensuite ses modules et
        sa configuration depuis \`/boot/grub\`.

        ### Démarrage UEFI (§5.8.2)

        UEFI sait lire un système de fichiers **FAT** : la **partition système EFI** (ESP), montée sur \`/boot/efi\`.
        Elle contient des programmes \`.efi\` : \`EFI/debian/grubx64.efi\`, \`EFI/rocky/shimx64.efi\`… Le micrologiciel
        garde une liste d’entrées de démarrage dans sa mémoire (variables EFI).

        \`\`\`
        $ ls /sys/firmware/efi && echo UEFI || echo BIOS     # quel mode pour le démarrage en cours ?
        # efibootmgr -v                                      # entrées de démarrage UEFI (en mode UEFI seulement)
        \`\`\`

        ### Secure Boot (§5.6)

        Avec **Secure Boot**, le micrologiciel n’exécute que des programmes **signés** par une clé qu’il connaît (en général
        celle de Microsoft). Les distributions passent par **shim** : un petit chargeur signé par Microsoft, qui vérifie
        ensuite GRUB et le noyau signés par la distribution. Conséquence : un module noyau compilé soi-même doit être signé,
        ou enrôlé avec une clé MOK (\`mokutil\`).

        ### Chaînage (§5.7)

        GRUB peut aussi passer la main à un autre chargeur (*chainloading*) : celui de Windows, par exemple, en lisant
        son secteur de démarrage ou son programme EFI.
      `,
      aRetenir: [
        'BIOS : MBR (≈ 440 octets de code) → core de GRUB (après le MBR ou partition de démarrage BIOS) → /boot/grub.',
        'UEFI : partition système EFI en FAT (`/boot/efi`), programmes `.efi`, entrées gérées par `efibootmgr`.',
        '`/sys/firmware/efi` existe → démarrage UEFI.',
        'Secure Boot : programmes signés ; shim (signé Microsoft) vérifie GRUB et le noyau.',
      ],
      exercices: [
        {
          id: 'c05-05-01', type: 'association', niveau: 2, ref: '§5.8, p. 133–134',
          enonce: 'Associe chaque élément au mode de démarrage auquel il appartient.',
          paires: [
            ['Code de démarrage dans le premier secteur du disque', 'BIOS'],
            ['Partition système en FAT montée sur `/boot/efi`', 'UEFI'],
            ['`shimx64.efi`', 'UEFI avec Secure Boot'],
            ['Partition de démarrage BIOS sur un disque GPT', 'BIOS sur disque GPT'],
          ],
          indices: ['Le BIOS ne connaît pas les systèmes de fichiers.', 'UEFI lit du FAT.', 'shim existe pour Secure Boot.'],
          solution: 'MBR → BIOS ; ESP → UEFI ; shim → UEFI + Secure Boot ; partition de démarrage BIOS → BIOS sur GPT (elle accueille le core de GRUB).',
        },
        {
          id: 'c05-05-02', type: 'commande', niveau: 2,
          enonce: 'Écris une commande qui affiche `UEFI` si la machine a démarré en mode UEFI, `BIOS` sinon (en testant l’existence de `/sys/firmware/efi`).',
          accepte: ['\\[ -d /sys/firmware/efi \\] && echo UEFI \\|\\| echo BIOS', 'test -d /sys/firmware/efi && echo UEFI \\|\\| echo BIOS', 'ls /sys/firmware/efi(>/dev/null|( >/dev/null)?)( 2>&1| 2>/dev/null)? && echo UEFI \\|\\| echo BIOS', '\\[\\[ -d /sys/firmware/efi \\]\\] && echo UEFI \\|\\| echo BIOS'],
          exemple: '[ -d /sys/firmware/efi ] && echo UEFI || echo BIOS',
          indices: ['`test -d chemin` (ou `[ -d chemin ]`) réussit si le répertoire existe.', '`&&` exécute la suite en cas de succès, `||` en cas d’échec (chapitre 11).', '`[ -d /sys/firmware/efi ] && echo UEFI || echo BIOS`'],
          solution: '```\n$ [ -d /sys/firmware/efi ] && echo UEFI || echo BIOS\nBIOS\n```\nTes VM démarrent avec SeaBIOS (BIOS), le réglage par défaut de Proxmox. Avec `bios: ovmf` et un disque EFI, elles démarreraient en UEFI.',
        },
        {
          id: 'c05-05-03', type: 'qcm', niveau: 2, ref: '§5.6, p. 131',
          enonce: 'Avec Secure Boot activé, pourquoi les distributions utilisent-elles **shim** ?',
          choix: [
            'Parce que le micrologiciel n’accepte que ce qui est signé par Microsoft : shim, signé par Microsoft, vérifie ensuite GRUB et le noyau signés par la distribution',
            'Parce que GRUB ne sait pas lire le système de fichiers FAT',
            'Pour accélérer le démarrage',
            'Pour permettre le démarrage en mode BIOS',
          ],
          reponse: 0,
          indices: ['Quelle clé le micrologiciel connaît-il en général ?', 'La distribution ne peut pas tout faire signer par Microsoft à chaque mise à jour.', 'shim fait le lien entre les deux chaînes de confiance.'],
          solution: 'Les micrologiciels font confiance à la clé de Microsoft. shim est signé une fois par Microsoft et contient la clé de la distribution, qui signe GRUB et le noyau.',
        },
        {
          id: 'c05-05-04', type: 'vrai-faux', niveau: 1, ref: '§5.8, p. 133–136',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'En mode BIOS, le code contenu dans le MBR suffit à charger tout GRUB et sa configuration.', vrai: false, explication: 'Il est trop petit : il charge le core de GRUB, qui charge le reste.' },
            { texte: 'La partition système EFI utilise le système de fichiers FAT.', vrai: true },
            { texte: '`efibootmgr` ne fonctionne qu’en mode UEFI.', vrai: true },
            { texte: 'GRUB peut lancer le chargeur de Windows par chaînage.', vrai: true },
          ],
          indices: ['Le MBR fait 512 octets en tout.', 'Une seule affirmation est fausse.', 'efibootmgr manipule les variables EFI.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
        {
          id: 'c05-05-05', type: 'terminal', niveau: 2,
          enonce: 'Sur ta VM, vérifie le mode de démarrage (`ls /sys/firmware/efi`), puis affiche les fichiers de `/boot/efi` (`sudo find /boot/efi -name "*.efi"`). Colle la sortie.',
          attendu: ['\\.efi'],
          indices: ['Sur une VM en BIOS, `/sys/firmware/efi` n’existe pas.', 'La partition EFI est pourtant présente et montée.', 'Les images cloud prévoient les deux modes.'],
          solution: '`/sys/firmware/efi` n’existe pas : démarrage **BIOS**. Pourtant `/boot/efi` contient bien `EFI/debian/grubx64.efi` (ou `EFI/rocky/shimx64.efi`, `grubx64.efi`) : l’image cloud est prête à démarrer en UEFI aussi, grâce à sa partition de démarrage BIOS **et** à sa partition EFI.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Les étapes du démarrage ?', r: 'Micrologiciel (BIOS/UEFI) → chargeur (GRUB) → noyau + initramfs → init (systemd) → services.' },
    { q: 'Ce que fait le noyau au démarrage, dans l’ordre ?', r: 'CPU, mémoire, bus et périphériques, sous-systèmes, montage de la racine, lancement d’init.' },
    { q: 'Lire les messages du noyau ?', r: '`journalctl -k` ou `sudo dmesg -T`.' },
    { q: 'Paramètres du démarrage en cours ?', r: '`cat /proc/cmdline`' },
    { q: 'Que deviennent les paramètres inconnus du noyau ?', r: 'Ils sont transmis à init (ex. `single`).' },
    { q: 'Menu GRUB : éditer ? démarrer ? ligne de commande ?', r: '`e` ; Ctrl-X (ou F10) ; `c`.' },
    { q: 'Notation GRUB de la partition GPT 2 du premier disque ?', r: '`(hd0,gpt2)`' },
    { q: 'Régénérer grub.cfg sur Debian ? sur Rocky ?', r: '`update-grub` ; `grub2-mkconfig -o /boot/grub2/grub.cfg`.' },
    { q: 'Paramètre durable sur Rocky ?', r: '`grubby --update-kernel=ALL --args="…"`' },
    { q: 'Où régler le délai du menu GRUB ?', r: '`/etc/default/grub` : `GRUB_TIMEOUT`, `GRUB_TIMEOUT_STYLE=menu`.' },
    { q: 'Réinstaller GRUB en mode BIOS ?', r: '`grub-install /dev/sda` (le disque, pas une partition).' },
    { q: 'Savoir si on a démarré en UEFI ?', r: '`/sys/firmware/efi` existe.' },
    { q: 'Rôle de shim ?', r: 'Chargeur signé par Microsoft qui vérifie GRUB et le noyau signés par la distribution (Secure Boot).' },
  ],
  memo: `
    ### Séquence
    micrologiciel (BIOS/UEFI) → GRUB → noyau + initramfs → systemd (PID 1) → services

    ### Noyau
    \`\`\`
    journalctl -k   journalctl -k -b -1   sudo dmesg -T   cat /proc/cmdline
    \`\`\`
    Paramètres : root= · ro · quiet · console=ttyS0 · init=/bin/bash · systemd.unit=rescue.target · single

    ### GRUB
    \`\`\`
    menu : e (éditer) · Ctrl-X / F10 (démarrer) · c (ligne de commande) · Échap
    grub> ls   ls -l   echo $root   ls ($root)/boot   set
    /etc/default/grub : GRUB_TIMEOUT=5  GRUB_TIMEOUT_STYLE=menu  GRUB_CMDLINE_LINUX="…"
    \`\`\`
    | | Debian | Rocky |
    |---|---|---|
    | régénérer | \`update-grub\` | \`grub2-mkconfig -o /boot/grub2/grub.cfg\` |
    | paramètre durable | /etc/default/grub + update-grub | \`grubby --update-kernel=ALL --args="…"\` |
    | réinstaller (BIOS) | \`grub-install /dev/sda\` | \`grub2-install /dev/sda\` |

    ### BIOS / UEFI
    \`\`\`
    [ -d /sys/firmware/efi ] && echo UEFI || echo BIOS
    efibootmgr -v   mokutil --sb-state   ls /boot/efi/EFI
    \`\`\`
  `,
});
