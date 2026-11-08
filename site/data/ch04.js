/* Chapitre 4 : Disks and Filesystems (livre p. 69–116). Partie 1 : fiches 4.1 à 4.7. */
HLW.chapitre({
  id: '04',
  num: 4,
  intro: `
    Comment un disque brut devient-il un répertoire où l’on range des fichiers ? Ce chapitre suit toute la chaîne :
    **table de partitions** → **partitions** → **système de fichiers** → **montage** dans l’arborescence →
    montage automatique au démarrage par **/etc/fstab**. Il couvre aussi la **mémoire d’échange** (swap), le
    **gestionnaire de volumes logiques LVM** (que Rocky Linux utilise souvent par défaut) et l’intérieur d’un système
    de fichiers : les **inodes**.

    C’est l’un des chapitres les plus utiles en production : disque plein, partition à agrandir, disque ajouté,
    machine qui ne démarre plus à cause de fstab… Le **Lab 02** te fera tout pratiquer sur de vrais disques
    ajoutés à tes VM. Travaille toujours avec un instantané : une erreur de disque ne pardonne pas.
  `,
  objectifs: [
    'lire une table de partitions (MBR ou GPT) et en créer une avec `fdisk` ou `parted` ;',
    'créer un système de fichiers, le monter, le démonter, et le désigner par son UUID ;',
    'écrire une ligne `/etc/fstab` correcte et la tester sans risque ;',
    'mesurer l’espace disque (`df`, `du`) et vérifier un système de fichiers ;',
    'ajouter de la mémoire d’échange (partition ou fichier) ;',
    'créer, agrandir et inspecter des volumes LVM ;',
    'expliquer ce qu’est un inode, un lien physique et le compteur de liens.',
  ],
  certifs: { lpic1: ['102.1', '104.1', '104.2', '104.3', '104.6'], lfcs: ['STO'], rhcsa: ['R5', 'R6'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '4.1',
      titre: 'Tables de partitions : MBR et GPT',
      sections: '§4, 4.1.1, 4.1.4 et 4.1.5', pages: '69–75, 78–80',
      objectif: 'Comprendre comment un disque est découpé et lire une table de partitions.',
      rappel: `
        Un disque est d’abord une suite de **secteurs** (traditionnellement 512 octets). Pour le découper, on écrit
        au début du disque une **table de partitions** : chaque **partition** est une plage de secteurs consécutifs.
        Chaque partition peut ensuite recevoir un système de fichiers, de la swap, un volume LVM…

        \`\`\`
        disque /dev/sdb
        ┌────────┬──────────────────────┬──────────────────────┬──────┐
        │ table  │ partition 1 (sdb1)   │ partition 2 (sdb2)   │ libre│
        └────────┴──────────────────────┴──────────────────────┴──────┘
        \`\`\`

        ### Deux formats

        | | **MBR** (ou « DOS ») | **GPT** |
        |---|---|---|
        | Âge | années 1980 | standard actuel (lié à UEFI) |
        | Partitions | 4 **primaires** ; ou 3 primaires + 1 **étendue** contenant des partitions **logiques** (numérotées à partir de 5) | 128 par défaut, pas de distinction |
        | Taille maximale | 2 Tio (avec des secteurs de 512 octets) | pratiquement illimitée |
        | Type de partition | un octet (\`83\` Linux, \`82\` swap, \`8e\` LVM, \`ef\` EFI) | un GUID |
        | Robustesse | une seule copie | en-tête de secours en fin de disque, MBR « protecteur » au début |

        \`\`\`
        # parted -l               # toutes les tables de tous les disques
        # fdisk -l /dev/sda       # même chose, vue de fdisk
        $ lsblk                   # vue arborescente (fiche 3.4)
        \`\`\`

        ### Géométrie et alignement

        Les vieux outils parlaient de **cylindres, têtes et secteurs** (CHS) : c’est une fiction depuis longtemps.
        Aujourd’hui, on adresse le disque par **numéro de secteur** (LBA). Les SSD et les disques modernes travaillent
        en interne par blocs de 4 Kio ou plus : une partition mal **alignée** dégrade les performances. Les outils
        actuels alignent par défaut sur **1 Mio** : la première partition commence au secteur **2048**.

        \`\`\`
        $ cat /sys/block/sda/sda1/start    # secteur de début de sda1
        \`\`\`
      `,
      aRetenir: [
        'Table de partitions = découpage du disque en plages de secteurs.',
        'MBR : 4 primaires (ou étendue + logiques ≥ 5), 2 Tio max. GPT : 128 partitions, standard UEFI, en-tête de secours.',
        '`parted -l`, `fdisk -l`, `lsblk` pour lire.',
        'Alignement sur 1 Mio : première partition au secteur 2048.',
      ],
      exercices: [
        {
          id: 'c04-01-01', type: 'vrai-faux', niveau: 1, ref: '§4.1, p. 72–74',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Une table MBR permet au maximum 4 partitions primaires.', vrai: true },
            { texte: 'Avec MBR, les partitions logiques sont numérotées à partir de 5.', vrai: true },
            { texte: 'GPT conserve une copie de secours de son en-tête à la fin du disque.', vrai: true },
            { texte: 'Une table MBR gère sans problème un disque de 8 Tio.', vrai: false, explication: 'MBR est limité à 2 Tio (secteurs de 512 octets). Au-delà, GPT est obligatoire.' },
          ],
          indices: ['MBR date des années 1980.', 'Les numéros 1 à 4 sont réservés aux primaires.', 'Une seule affirmation est fausse.'],
          solution: 'Vrai, vrai, vrai, faux.',
        },
        {
          id: 'c04-01-02', type: 'association', niveau: 2, ref: '§4.1.1, p. 74',
          enonce: 'Associe chaque code de type de partition MBR à son usage.',
          paires: [
            ['`83`', 'Système de fichiers Linux'],
            ['`82`', 'Swap Linux'],
            ['`8e`', 'Volume physique LVM'],
            ['`ef`', 'Partition système EFI'],
          ],
          indices: ['Ce sont des valeurs hexadécimales.', '83 est le type le plus courant.', 'La partition EFI est celle d’UEFI (chapitre 5).'],
          solution: '83 Linux, 82 swap, 8e LVM, ef EFI. Avec GPT, ces types deviennent des GUID, mais fdisk les présente avec des noms lisibles.',
        },
        {
          id: 'c04-01-03', type: 'commande', niveau: 1, ref: '§4.1.1, p. 72',
          enonce: 'Affiche (en root) les tables de partitions de **tous** les disques avec `parted`.',
          accepte: ['(sudo )?parted -l', '(sudo )?parted --list'],
          exemple: 'parted -l',
          indices: ['L’outil s’appelle `parted`.', 'Il a une option pour tout lister.', '`-l` comme *list*.'],
          solution: '```\n# parted -l\nModel: QEMU QEMU HARDDISK (scsi)\nDisk /dev/sda: 17.2GB\nPartition Table: gpt\n…\n```\nLa ligne « Partition Table » indique `gpt` ou `msdos` (= MBR).',
        },
        {
          id: 'c04-01-04', type: 'reponse-courte', niveau: 2, ref: '§4.1.4, p. 79',
          enonce: 'Avec un alignement sur 1 Mio et des secteurs de 512 octets, à quel **numéro de secteur** commence la première partition ?',
          accepte: ['2048'],
          indices: ['1 Mio = 1 048 576 octets.', 'Combien de secteurs de 512 octets dans 1 Mio ?', '1 048 576 / 512.'],
          solution: '**2048**. C’est ce que proposent fdisk et parted par défaut ; tu le vérifies avec `cat /sys/block/sda/sda1/start` ou `fdisk -l`.',
        },
        {
          id: 'c04-01-05', type: 'qcm', niveau: 2,
          enonce: 'Tu dois partitionner un disque de 6 Tio pour une machine qui démarre en UEFI. Quel type de table choisis-tu ?',
          choix: ['GPT', 'MBR avec une partition étendue', 'MBR avec 4 partitions primaires', 'Aucune table : on formate le disque entier'],
          reponse: 0,
          indices: ['Quelle est la limite de taille de MBR ?', 'UEFI s’appuie sur un format de table particulier.', 'Le standard actuel.'],
          solution: '**GPT** : MBR ne dépasse pas 2 Tio, et GPT est le format naturel d’UEFI. (Formater un disque entier sans table est possible, mais déconseillé : d’autres outils le croiraient vide.)',
        },
        {
          id: 'c04-01-06', type: 'terminal', niveau: 1,
          enonce: 'Sur `cuve` et `fut`, lance `sudo parted -l` (ou `sudo fdisk -l /dev/sda`). Colle une sortie. Quel type de table utilise le disque système ? Combien de partitions ?',
          attendu: ['[Pp]artition [Tt]able|Disklabel type'],
          indices: ['Cherche la ligne « Partition Table » (parted) ou « Disklabel type » (fdisk).', 'Les images cloud récentes utilisent GPT.', 'Compte les lignes numérotées.'],
          solution: 'Les deux images utilisent **GPT** (`Partition Table: gpt`). Debian : une grande racine (`sda1`), une petite partition de démarrage BIOS et une partition EFI. Rocky : partitions de démarrage BIOS et EFI, `/boot` et racine. Ces images démarrent ainsi en BIOS comme en UEFI.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '4.2',
      titre: 'Créer et modifier des partitions',
      sections: '§4.1.2 et 4.1.3', pages: '75–78',
      objectif: 'Partitionner un disque vierge avec fdisk (ou parted) et faire relire la table par le noyau.',
      rappel: `
        Deux outils classiques :

        - **fdisk** : interactif, rien n’est écrit sur le disque avant la commande \`w\`. Idéal pour apprendre.
        - **parted** : chaque commande s’applique **immédiatement** (pas d’annulation). Pratique en script (\`parted -s\`).

        ### Une session fdisk typique (disque vierge \`/dev/sdb\`)

        \`\`\`
        # fdisk /dev/sdb
        Command (m for help): g                  ← nouvelle table GPT (o : table MBR)
        Command (m for help): n                  ← nouvelle partition
        Partition number (1-128, default 1):     ← Entrée
        First sector (2048-…, default 2048):     ← Entrée (alignement 1 Mio)
        Last sector, +/-sectors or +/-size{K,M,G,T,P}: +1G
        Command (m for help): n                  ← deuxième partition, jusqu’à la fin
        …
        Command (m for help): t                  ← changer le type (ex. « Linux swap »)
        Command (m for help): p                  ← afficher le résultat
        Command (m for help): w                  ← ÉCRIRE et quitter (q : quitter sans rien écrire)
        \`\`\`

        | Commande fdisk | Effet |
        |---|---|
        | \`m\` | aide |
        | \`p\` | afficher la table |
        | \`g\` / \`o\` | nouvelle table GPT / MBR (vide) |
        | \`n\` / \`d\` | créer / supprimer une partition |
        | \`t\` | changer le type |
        | \`w\` / \`q\` | écrire et quitter / quitter sans écrire |

        Équivalent parted, en une ligne : \`parted -s /dev/sdb mklabel gpt mkpart data ext4 1MiB 1GiB\`.

        ### Le noyau doit relire la table

        Après l’écriture, le noyau relit la table et crée \`/dev/sdb1\`, \`/dev/sdb2\`… Si le disque est utilisé (une partition
        montée), il peut refuser : on force la relecture avec \`partprobe /dev/sdb\` ou \`blockdev --rereadpt /dev/sdb\`, ou on redémarre.

        > Créer une partition ne la rend pas utilisable : il faut encore y créer un système de fichiers (fiche 4.3), de la swap (fiche 4.8) ou un volume LVM (fiche 4.10).
      `,
      aRetenir: [
        'fdisk : `g` (GPT), `n`, `t`, `p`, puis `w` pour écrire ; `q` abandonne sans rien toucher.',
        'parted applique chaque commande immédiatement.',
        'Taille relative à la saisie : `+1G`.',
        '`partprobe` ou `blockdev --rereadpt` pour faire relire la table au noyau.',
      ],
      exercices: [
        {
          id: 'c04-02-01', type: 'association', niveau: 1, ref: '§4.1.2, p. 76–77',
          enonce: 'Associe chaque commande interactive de `fdisk` à son effet.',
          paires: [
            ['`p`', 'Afficher la table de partitions'],
            ['`n`', 'Créer une nouvelle partition'],
            ['`t`', 'Changer le type d’une partition'],
            ['`g`', 'Créer une nouvelle table GPT vide'],
            ['`w`', 'Écrire la table sur le disque et quitter'],
            ['`q`', 'Quitter sans rien écrire'],
          ],
          indices: ['p = *print*, n = *new*, t = *type*.', 'w = *write*, q = *quit*.', 'g pour GPT ; o (non listé) pour une table MBR.'],
          solution: 'Retiens surtout : **rien n’est écrit avant `w`**. En cas de doute, `q` et tout est oublié.',
        },
        {
          id: 'c04-02-02', type: 'ordre', niveau: 2, ref: '§4.1.3, p. 76–78',
          enonce: 'Remets dans l’ordre la création d’une partition unique de 1 Gio sur le disque vierge `/dev/sdb` avec fdisk.',
          elements: [
            'Lancer `fdisk /dev/sdb`',
            'Créer une table GPT vide avec `g`',
            'Créer la partition avec `n`, en acceptant le numéro et le premier secteur proposés',
            'Indiquer la fin : `+1G`',
            'Vérifier avec `p`',
            'Écrire avec `w`',
          ],
          indices: ['Il faut une table avant de créer des partitions.', 'On vérifie avant d’écrire.', 'L’écriture est toujours la dernière étape.'],
          solution: '`fdisk` → `g` → `n` (Entrée, Entrée) → `+1G` → `p` → `w`. La partition `/dev/sdb1` apparaît ensuite (vérifie avec `lsblk`).',
        },
        {
          id: 'c04-02-03', type: 'qcm', niveau: 1, ref: '§4.1.2, p. 75',
          enonce: 'Tu as fait des modifications dans `fdisk`, puis tu tapes `q`. Qu’arrive-t-il au disque ?',
          choix: ['Rien : aucune modification n’est écrite', 'Les modifications sont écrites puis fdisk quitte', 'Le disque est effacé', 'fdisk refuse de quitter'],
          reponse: 0,
          indices: ['fdisk travaille en mémoire.', 'Seule une commande écrit sur le disque.', 'q = quitter.'],
          solution: 'Rien n’est écrit : fdisk ne touche au disque qu’avec `w`. C’est la grande différence avec parted, qui applique chaque commande immédiatement.',
        },
        {
          id: 'c04-02-04', type: 'commande', niveau: 2, ref: '§4.1.2, p. 76',
          enonce: 'Tu as modifié la table de partitions de `/dev/sdc`, mais `/dev/sdc1` n’apparaît pas. Demande au noyau de **relire la table** de ce disque (en root), avec l’outil de parted.',
          accepte: ['(sudo )?partprobe /dev/sdc', '(sudo )?blockdev --rereadpt /dev/sdc'],
          exemple: 'partprobe /dev/sdc',
          indices: ['Le nom de l’outil évoque « sonder les partitions ».', 'Il est fourni avec parted.', '`partprobe /dev/sdc` (ou `blockdev --rereadpt`).'],
          solution: '```\n# partprobe /dev/sdc\n```\nAlternative du livre : `blockdev --rereadpt /dev/sdc`. Si une partition du disque est utilisée, le noyau peut refuser : il faut alors la libérer ou redémarrer.',
        },
        {
          id: 'c04-02-05', type: 'commande', niveau: 3,
          enonce: 'En **une seule commande non interactive** avec parted, crée une table GPT sur `/dev/sdb` puis une partition nommée `data` (ext4) de 1 Mio à 1 Gio.',
          accepte: ['(sudo )?parted -s /dev/sdb mklabel gpt mkpart data ext4 1MiB 1GiB', '(sudo )?parted --script /dev/sdb mklabel gpt mkpart data ext4 1MiB 1GiB', '(sudo )?parted -s /dev/sdb mklabel gpt mkpart primary ext4 1MiB 1GiB'],
          exemple: 'parted -s /dev/sdb mklabel gpt mkpart data ext4 1MiB 1GiB',
          indices: ['`-s` (*script*) supprime les questions.', 'Les sous-commandes s’enchaînent : `mklabel …` puis `mkpart …`.', '`mkpart nom type début fin`.'],
          solution: '```\n# parted -s /dev/sdb mklabel gpt mkpart data ext4 1MiB 1GiB\n```\nLe « ext4 » ne formate rien : c’est une simple indication de type. Il faudra encore `mkfs` (fiche 4.3).',
        },
        {
          id: 'c04-02-06', type: 'terminal', niveau: 2,
          enonce: '**À faire pendant le Lab 02** (il faut un disque supplémentaire) : crée sur le deuxième disque une table GPT avec deux partitions (1 Gio, puis 512 Mio), écris-la, et colle la sortie de `lsblk` pour ce disque.',
          attendu: ['part'],
          indices: ['Repère le disque vierge avec `lsblk` : celui sans partitions.', 'Dans fdisk : `g`, `n`, +1G, `n`, +512M, `p`, `w`.', '`lsblk /dev/sdb`'],
          solution: '```\n$ lsblk /dev/sdb\nNAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS\nsdb      8:16   0    4G  0 disk\n├─sdb1   8:17   0    1G  0 part\n└─sdb2   8:18   0  512M  0 part\n```',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '4.3',
      titre: 'Les systèmes de fichiers et mkfs',
      sections: '§4.2 à 4.2.2 et 4.2.12', pages: '80–83, 93',
      objectif: 'Choisir un type de système de fichiers et le créer.',
      rappel: `
        Un **système de fichiers** organise les données d’une partition en fichiers et répertoires, avec leurs droits,
        dates et emplacements. C’est une couche entre le noyau (qui ne voit que des blocs) et les programmes.

        ### Les principaux types

        | Type | Usage |
        |---|---|
        | **ext4** | le système Linux classique, défaut de Debian ; robuste, journalisé |
        | **XFS** | haute performance, défaut de Rocky/RHEL ; **ne peut pas être réduit** |
        | **Btrfs** | instantanés, sous-volumes, sommes de contrôle (défaut de Fedora, openSUSE) |
        | **vfat** (FAT32), **exFAT** | clés USB, partition EFI ; aucun droit Unix |
        | **NTFS** | disques Windows |
        | **ISO 9660** | CD et DVD (dont le lecteur cloud-init de tes VM) |

        ### Créer un système de fichiers

        \`\`\`
        # mkfs -t ext4 /dev/sdb1                 # équivalent : mkfs.ext4 /dev/sdb1
        # mkfs.ext4 -L archives /dev/sdb1        # avec une étiquette (label)
        # mkfs.xfs /dev/sdb2                     # paquet xfsprogs sur Debian
        $ ls /usr/sbin/mkfs.*                    # types disponibles sur la machine
        \`\`\`

        \`mkfs\` n’est qu’une façade : il appelle \`mkfs.<type>\`. **Il efface tout** ce que la partition contenait.
        Ne le lance jamais sur une partition déjà en service.

        ### Les systèmes de fichiers spéciaux (§4.2.12)

        Tous les systèmes de fichiers ne sont pas sur un disque :

        | Type | Monté sur | Rôle |
        |---|---|---|
        | \`proc\` | \`/proc\` | processus et paramètres du noyau |
        | \`sysfs\` | \`/sys\` | périphériques (chapitre 3) |
        | \`devtmpfs\` | \`/dev\` | fichiers de périphériques |
        | \`tmpfs\` | \`/run\`, \`/dev/shm\`, \`/tmp\` (Debian 13) | fichiers en **mémoire vive**, perdus à l’arrêt |
        | \`squashfs\` | images compressées | paquets snap, systèmes live |
        | \`overlay\` | conteneurs | superposition de couches (chapitre 17) |
      `,
      aRetenir: [
        'ext4 (Debian), XFS (Rocky, non réductible), Btrfs, vfat/exFAT, ISO 9660.',
        '`mkfs -t type périph` = `mkfs.type périph` ; `-L` donne une étiquette ; efface tout.',
        'proc, sysfs, devtmpfs, tmpfs : systèmes de fichiers sans disque.',
      ],
      exercices: [
        {
          id: 'c04-03-01', type: 'commande', niveau: 1, ref: '§4.2.2, p. 82',
          enonce: 'Crée un système de fichiers **ext4** sur `/dev/sdb1` (en root).',
          accepte: ['(sudo )?mkfs -t ext4 /dev/sdb1', '(sudo )?mkfs\\.ext4 /dev/sdb1', '(sudo )?mkfs\\.ext4 -L \\S+ /dev/sdb1', '(sudo )?mkfs -t ext4 -L \\S+ /dev/sdb1'],
          exemple: 'mkfs -t ext4 /dev/sdb1',
          pieges: [{ motif: '(sudo )?mkfs(\\.ext4| -t ext4) /dev/sdb', message: 'Attention : `/dev/sdb` est le disque entier, pas la partition 1. Ceci écraserait la table de partitions.' }],
          indices: ['*make filesystem*.', 'Le type s’indique avec `-t`.', '`mkfs -t ext4 /dev/sdb1` (ou `mkfs.ext4`).'],
          solution: '```\n# mkfs -t ext4 /dev/sdb1\n```\nmkfs affiche notamment l’**UUID** du nouveau système de fichiers et le nombre d’inodes créés.',
        },
        {
          id: 'c04-03-02', type: 'association', niveau: 1, ref: '§4.2.1, p. 81–82',
          enonce: 'Associe chaque système de fichiers à son usage typique.',
          paires: [
            ['ext4', 'Système Linux classique, défaut de Debian'],
            ['XFS', 'Défaut de Rocky/RHEL, ne peut pas être réduit'],
            ['vfat', 'Clés USB et partition EFI, sans droits Unix'],
            ['ISO 9660', 'CD et DVD'],
            ['tmpfs', 'Fichiers en mémoire vive, perdus à l’arrêt'],
          ],
          indices: ['Rocky Linux suit Red Hat.', 'FAT vient du monde DOS/Windows.', 'tmp = temporaire.'],
          solution: 'ext4 (Debian), XFS (Rocky), vfat (USB/EFI), ISO 9660 (optique), tmpfs (mémoire).',
        },
        {
          id: 'c04-03-03', type: 'commande', niveau: 2,
          enonce: 'Crée un système de fichiers ext4 sur `/dev/sdb1` avec l’étiquette `archives`.',
          accepte: ['(sudo )?mkfs\\.ext4 -L archives /dev/sdb1', '(sudo )?mkfs -t ext4 -L archives /dev/sdb1', '(sudo )?mkfs\\.ext4 /dev/sdb1 -L archives'],
          exemple: 'mkfs.ext4 -L archives /dev/sdb1',
          indices: ['L’étiquette se dit *label*.', 'Option `-L`.', '`mkfs.ext4 -L archives /dev/sdb1`'],
          solution: '```\n# mkfs.ext4 -L archives /dev/sdb1\n```\nL’étiquette apparaît dans `lsblk -f`, `blkid` et `/dev/disk/by-label/archives`. Pour la changer plus tard : `e2label /dev/sdb1 nouveau`.',
        },
        {
          id: 'c04-03-04', type: 'vrai-faux', niveau: 2, ref: '§4.2, p. 80–83',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`mkfs` efface les données présentes sur la partition.', vrai: true },
            { texte: 'Un système de fichiers XFS peut être agrandi, mais pas réduit.', vrai: true },
            { texte: 'vfat conserve les propriétaires et permissions Unix des fichiers.', vrai: false, explication: 'FAT n’a pas de notion de propriétaire Unix : on les simule à la montée (`uid=`, fiche 4.5).' },
            { texte: 'Sur Debian 13, `/tmp` est par défaut un tmpfs, en mémoire.', vrai: true },
          ],
          indices: ['FAT vient de DOS.', 'Une seule affirmation est fausse.', 'Debian 13 a changé le comportement de /tmp.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
        {
          id: 'c04-03-05', type: 'terminal', niveau: 1,
          enonce: 'Sur ta VM, liste les systèmes de fichiers montés de type spécial avec `findmnt -t proc,sysfs,devtmpfs,tmpfs` et colle la sortie.',
          attendu: ['tmpfs', 'proc'],
          indices: ['`findmnt` affiche les montages en arbre.', '`-t` filtre sur les types.', 'Cherche /proc, /sys, /dev, /run.'],
          solution: 'Tu dois voir `/proc` (proc), `/sys` (sysfs), `/dev` (devtmpfs), `/run` et `/dev/shm` (tmpfs), et sur cuve `/tmp` (tmpfs). Aucun n’occupe de place sur le disque.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '4.4',
      titre: 'Monter et démonter, UUID',
      sections: '§4.2.3 et 4.2.4', pages: '83–86',
      objectif: 'Attacher un système de fichiers à l’arborescence et le désigner de façon fiable.',
      rappel: `
        Sous Unix, il n’y a qu’**une seule arborescence**. Pour accéder à un système de fichiers, on le **monte** sur un
        répertoire existant (le **point de montage**) : son contenu apparaît à cet endroit, et masque ce que le répertoire
        contenait avant.

        \`\`\`
        $ mount                                    # tout ce qui est monté (long !)
        $ findmnt                                  # la même chose en arbre (plus lisible)
        # mkdir -p /srv/archives
        # mount -t ext4 /dev/sdb1 /srv/archives    # monter (-t souvent facultatif : détection automatique)
        # umount /srv/archives                     # démonter (attention : umount, sans « n »)
        \`\`\`

        Si \`umount\` répond **« target is busy »**, un processus utilise encore le système de fichiers (un shell dont
        c’est le répertoire courant, un fichier ouvert). \`lsof /srv/archives\` ou \`fuser -vm /srv/archives\` le désignent.

        ### UUID : un nom qui ne change pas

        Les noms \`/dev/sdb1\` dépendent de l’ordre de détection (fiche 3.4). Chaque système de fichiers reçoit à sa création
        un **UUID** (identifiant universel unique). C’est lui qu’on utilise pour monter de façon fiable :

        \`\`\`
        # blkid
        /dev/sdb1: LABEL="archives" UUID="b600fe63-d2e9-461c-a5cd-d3b373a5e1d2" TYPE="ext4" PARTUUID="…"
        $ lsblk -f                                 # même information, en arbre
        # mount UUID=b600fe63-d2e9-461c-a5cd-d3b373a5e1d2 /srv/archives
        # mount LABEL=archives /srv/archives       # ou par étiquette
        \`\`\`

        Ne confonds pas l’**UUID** (du système de fichiers, changé par \`mkfs\`) et le **PARTUUID** (de la partition GPT).
      `,
      aRetenir: [
        '`mount [-t type] périph point` ; `umount point` (sans n).',
        '« target is busy » : `lsof point` ou `fuser -vm point`.',
        '`blkid`, `lsblk -f` pour les UUID ; `mount UUID=… point`.',
        '`findmnt` : montages en arbre.',
      ],
      exercices: [
        {
          id: 'c04-04-01', type: 'commande', niveau: 1, ref: '§4.2.3, p. 84',
          enonce: 'Monte le système de fichiers ext4 de `/dev/sdb1` sur le répertoire existant `/srv/archives`.',
          accepte: ['(sudo )?mount (-t ext4 )?/dev/sdb1 /srv/archives/?'],
          exemple: 'mount -t ext4 /dev/sdb1 /srv/archives',
          pieges: [{ motif: '(sudo )?mount (-t ext4 )?/srv/archives/? /dev/sdb1', message: 'Ordre inversé : d’abord le périphérique, puis le point de montage.' }],
          indices: ['La commande s’appelle `mount`.', 'Le type est facultatif (détection automatique).', 'Ordre : périphérique, puis point de montage.'],
          solution: '```\n# mount -t ext4 /dev/sdb1 /srv/archives\n```\nVérifie avec `findmnt /srv/archives` ou `df -h /srv/archives`.',
        },
        {
          id: 'c04-04-02', type: 'commande', niveau: 1, ref: '§4.2.3, p. 84',
          enonce: 'Démonte le système de fichiers monté sur `/srv/archives`.',
          accepte: ['(sudo )?umount /srv/archives/?', '(sudo )?umount /dev/sdb1'],
          exemple: 'umount /srv/archives',
          pieges: [{ motif: '(sudo )?unmount .*', message: 'Piège classique : la commande s’écrit **umount**, sans « n ».' }],
          indices: ['Attention à l’orthographe.', 'Ce n’est pas « unmount ».', '`umount`'],
          solution: '```\n# umount /srv/archives\n```',
        },
        {
          id: 'c04-04-03', type: 'qcm', niveau: 2, ref: '§4.2.3, p. 84',
          enonce: '`umount /srv/archives` répond `target is busy`. Quelle est la cause la plus probable ?',
          choix: [
            'Un processus utilise encore ce système de fichiers (fichier ouvert, ou répertoire courant d’un shell)',
            'Le disque est plein',
            'Le système de fichiers est corrompu',
            'Il faut d’abord supprimer le répertoire /srv/archives',
          ],
          reponse: 0,
          indices: ['« occupé ».', 'Ton propre shell est-il dans /srv/archives ?', '`lsof /srv/archives` te répondra.'],
          solution: 'Un processus l’utilise. Souvent, c’est **ton propre shell** qui est dans le répertoire : `cd` ailleurs. Sinon, `lsof /srv/archives` ou `fuser -vm /srv/archives` désignent le coupable.',
        },
        {
          id: 'c04-04-04', type: 'commande', niveau: 1, ref: '§4.2.4, p. 85',
          enonce: 'Affiche les UUID, types et étiquettes de tous les systèmes de fichiers (en root), avec la commande présentée par le livre.',
          accepte: ['(sudo )?blkid'],
          exemple: 'blkid',
          pieges: [{ motif: 'lsblk -f', message: 'Ça marche aussi ! Mais le livre présente une autre commande, spécialisée dans les attributs des périphériques bloc.' }],
          indices: ['*block id*.', 'Cinq lettres.', '`blkid`'],
          solution: '```\n# blkid\n/dev/sda1: UUID="…" TYPE="ext4" PARTUUID="…"\n```\n`lsblk -f` donne la même chose sous forme d’arbre, sans être root.',
        },
        {
          id: 'c04-04-05', type: 'commande', niveau: 2, ref: '§4.2.4, p. 85',
          enonce: 'Monte sur `/srv/archives` le système de fichiers dont l’UUID est `b600fe63-d2e9-461c-a5cd-d3b373a5e1d2`.',
          accepte: ['(sudo )?mount UUID=b600fe63-d2e9-461c-a5cd-d3b373a5e1d2 /srv/archives/?', '(sudo )?mount -U b600fe63-d2e9-461c-a5cd-d3b373a5e1d2 /srv/archives/?', '(sudo )?mount /dev/disk/by-uuid/b600fe63-d2e9-461c-a5cd-d3b373a5e1d2 /srv/archives/?'],
          exemple: 'mount UUID=b600fe63-d2e9-461c-a5cd-d3b373a5e1d2 /srv/archives',
          indices: ['À la place du périphérique, on écrit `UUID=…`.', 'Même ordre qu’un montage normal.', '`mount UUID=… /srv/archives`'],
          solution: '```\n# mount UUID=b600fe63-d2e9-461c-a5cd-d3b373a5e1d2 /srv/archives\n```\nÉquivalents : `mount -U …` ou `mount /dev/disk/by-uuid/… …`.',
        },
        {
          id: 'c04-04-06', type: 'vrai-faux', niveau: 2, ref: '§4.2.3–4.2.4, p. 83–86',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Monter un système de fichiers sur un répertoire non vide masque son contenu tant que le montage existe.', vrai: true },
            { texte: 'Reformater une partition avec `mkfs` change l’UUID du système de fichiers.', vrai: true },
            { texte: 'L’UUID et le PARTUUID désignent la même chose.', vrai: false, explication: 'UUID : le système de fichiers ; PARTUUID : la partition GPT.' },
            { texte: 'Le point de montage doit exister avant le montage.', vrai: true },
          ],
          indices: ['Le contenu masqué réapparaît après démontage.', 'Une seule affirmation est fausse.', 'Le préfixe PART veut dire quelque chose.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '4.5',
      titre: 'Cache, options de montage et remontage',
      sections: '§4.2.5 à 4.2.7', pages: '86–88',
      objectif: 'Comprendre le cache d’écriture et utiliser les options de montage.',
      rappel: `
        ### Le cache disque

        Linux n’écrit pas immédiatement sur le disque : il garde les modifications en **mémoire** (cache, tampons) et les écrit
        plus tard, en groupant les écritures. C’est rapide, mais un arrêt brutal peut perdre les dernières modifications.
        \`umount\` vide le cache du système de fichiers concerné ; \`sync\` force l’écriture de tout ce qui est en attente.
        D’où la règle : **toujours démonter** (ou éjecter) une clé USB avant de la retirer.

        ### Options de montage

        \`\`\`
        # mount -o ro,noexec /dev/sdb1 /mnt          # options séparées par des virgules
        # mount -t vfat /dev/sdc1 /cle -o uid=1000   # fichiers FAT attribués à l’utilisateur 1000
        \`\`\`

        | Option | Effet |
        |---|---|
        | \`ro\` / \`rw\` | lecture seule / lecture-écriture |
        | \`noexec\` | interdit d’exécuter des programmes depuis ce système de fichiers |
        | \`nosuid\` | ignore les bits setuid/setgid (fiche 2.A) |
        | \`nodev\` | ignore les fichiers de périphériques |
        | \`noatime\` / \`relatime\` | ne pas (ou rarement) mettre à jour la date de dernier accès |
        | \`uid=\`, \`gid=\`, \`umask=\` | propriétaire et droits simulés (vfat, exFAT, NTFS) |
        | \`loop\` | monter un **fichier image** comme un disque |

        \`noexec,nosuid,nodev\` sur \`/tmp\` ou une partition de données est une mesure de durcissement classique.

        ### Remonter

        On change les options d’un système de fichiers **déjà monté** avec \`remount\`. Le cas typique : en mode secours,
        la racine est montée en lecture seule, il faut la passer en écriture pour réparer (chapitre 6) :

        \`\`\`
        # mount -o remount,rw /
        \`\`\`
      `,
      aRetenir: [
        'Écritures différées en mémoire : `sync`, et toujours démonter avant de retirer.',
        '`-o ro`, `rw`, `noexec`, `nosuid`, `nodev`, `noatime`, `uid=`.',
        '`mount -o remount,rw /` : passer la racine en écriture (mode secours).',
      ],
      exercices: [
        {
          id: 'c04-05-01', type: 'commande', niveau: 2, ref: '§4.2.7, p. 87',
          enonce: 'Tu es en mode secours, la racine `/` est montée en lecture seule. Remonte-la en **lecture-écriture**.',
          accepte: ['(sudo )?mount -o remount,rw /', '(sudo )?mount -o rw,remount /', '(sudo )?mount -n -o remount,rw /', '(sudo )?mount -o remount -o rw /'],
          exemple: 'mount -o remount,rw /',
          indices: ['Il faut changer les options d’un montage existant.', 'Option `remount`, combinée à `rw`.', '`mount -o remount,rw /`'],
          solution: '```\n# mount -o remount,rw /\n```\nCommande indispensable du dépannage (Lab 03).',
        },
        {
          id: 'c04-05-02', type: 'association', niveau: 1, ref: '§4.2.6, p. 86–87',
          enonce: 'Associe chaque option de montage à son effet.',
          paires: [
            ['`ro`', 'Lecture seule'],
            ['`noexec`', 'Interdit l’exécution de programmes'],
            ['`nosuid`', 'Ignore les bits setuid et setgid'],
            ['`noatime`', 'Ne met pas à jour la date de dernier accès'],
            ['`uid=1000`', 'Attribue les fichiers à l’utilisateur 1000 (vfat, NTFS)'],
          ],
          indices: ['ro = *read-only*.', 'Les « no… » désactivent quelque chose.', 'atime = *access time*.'],
          solution: 'ro, noexec, nosuid, noatime, uid= : à combiner selon l’usage (`-o ro,noexec`).',
        },
        {
          id: 'c04-05-03', type: 'commande', niveau: 2, ref: '§4.2.6, p. 87',
          enonce: 'Monte la clé USB FAT `/dev/sdc1` sur `/media/cle` en **lecture seule**.',
          accepte: ['(sudo )?mount (-t vfat )?(-o ro |-r )?/dev/sdc1 /media/cle/?( -o ro)?'],
          exemple: 'mount -o ro /dev/sdc1 /media/cle',
          indices: ['L’option de lecture seule s’écrit en deux lettres.', 'Elle se passe avec `-o` (ou le raccourci `-r`).', '`mount -o ro /dev/sdc1 /media/cle`'],
          solution: '```\n# mount -o ro /dev/sdc1 /media/cle\n```\nRaccourci : `mount -r`. Pratique pour examiner un disque sans risquer de le modifier.',
        },
        {
          id: 'c04-05-04', type: 'qcm', niveau: 1, ref: '§4.2.5, p. 86',
          enonce: 'Tu copies un gros fichier sur une clé USB, la commande se termine, et tu retires aussitôt la clé. Que risques-tu ?',
          choix: [
            'Un fichier incomplet : une partie des données était encore dans le cache en mémoire',
            'Rien, la copie est terminée',
            'La clé USB sera formatée automatiquement',
            'Le système de fichiers de la VM sera corrompu',
          ],
          reponse: 0,
          indices: ['Linux diffère les écritures.', 'La fin de `cp` ne garantit pas que tout est écrit physiquement.', 'Il fallait démonter (ou `sync`).'],
          solution: 'Les écritures sont **différées** : une partie était encore en mémoire. `umount` (ou `sync`) force l’écriture ; c’est le rôle du bouton « éjecter » des bureaux graphiques.',
        },
        {
          id: 'c04-05-05', type: 'commande', niveau: 3,
          enonce: 'Monte le fichier image `debian.iso` sur `/mnt/iso` (en root), grâce à un périphérique boucle.',
          accepte: ['(sudo )?mount (-t iso9660 )?-o loop debian\\.iso /mnt/iso/?', '(sudo )?mount (-t iso9660 )?debian\\.iso /mnt/iso/?( -o loop)?', '(sudo )?mount -o loop,ro debian\\.iso /mnt/iso/?'],
          exemple: 'mount -o loop debian.iso /mnt/iso',
          indices: ['Un fichier n’est pas un périphérique : il faut un périphérique « boucle ».', 'L’option s’appelle `loop`.', '`mount -o loop fichier point`'],
          solution: '```\n# mount -o loop debian.iso /mnt/iso\n```\nmount crée lui-même un `/dev/loopN` relié au fichier (les versions récentes le font même sans `-o loop`).',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '4.6',
      titre: 'La table /etc/fstab',
      sections: '§4.2.8 et 4.2.9', pages: '88–89',
      objectif: 'Monter automatiquement au démarrage, sans rendre la machine indémarrable.',
      rappel: `
        \`/etc/fstab\` liste les systèmes de fichiers à monter au démarrage. Une ligne, six champs séparés par des espaces :

        \`\`\`
        # périphérique                             point          type  options          dump  fsck
        UUID=b600fe63-d2e9-461c-a5cd-d3b373a5e1d2  /srv/archives  ext4  defaults,noatime 0     2
        UUID=0d8e1f2a-…                            none           swap  sw               0     0
        tmpfs                                      /run/cache     tmpfs size=64M         0     0
        \`\`\`

        | Champ | Contenu |
        |---|---|
        | 1 | le périphérique : **UUID=…** de préférence, ou LABEL=…, ou un chemin |
        | 2 | le point de montage (\`none\` pour la swap) |
        | 3 | le type |
        | 4 | les options : \`defaults\` = rw, suid, dev, exec, auto, nouser, async |
        | 5 | sauvegarde avec \`dump\` : toujours \`0\` aujourd’hui |
        | 6 | ordre de vérification \`fsck\` au démarrage : \`1\` la racine, \`2\` les autres, \`0\` jamais |

        Options utiles : \`noauto\` (ne pas monter au démarrage), \`user\` (un utilisateur peut le monter), et surtout
        **\`nofail\`** : si le disque est absent, le démarrage continue au lieu de bloquer en mode urgence.

        ### Tester avant de redémarrer

        Une erreur dans fstab peut bloquer le démarrage (chapitre 6, Lab 03). Après chaque modification :

        \`\`\`
        # findmnt --verify            # vérifie la syntaxe et l’existence des périphériques
        # systemctl daemon-reload     # systemd régénère ses unités de montage à partir de fstab
        # mount -a                    # monte tout ce qui est en « auto » et pas encore monté
        \`\`\`

        Avec un point de montage seul, \`mount /srv/archives\` va chercher le reste dans fstab.

        ### Alternatives (§4.2.9)

        systemd lit fstab et en tire des **unités de montage** (\`srv-archives.mount\`). On peut aussi écrire ces unités
        directement, ou utiliser \`/etc/fstab.d\` sur certaines distributions. fstab reste la méthode standard.
      `,
      aRetenir: [
        '6 champs : périphérique (UUID=), point, type, options, dump (0), fsck (1 racine, 2 autres, 0).',
        '`defaults` ; `noauto`, `user`, **`nofail`** pour les disques facultatifs.',
        'Après modification : `findmnt --verify`, `systemctl daemon-reload`, `mount -a`.',
      ],
      exercices: [
        {
          id: 'c04-06-01', type: 'association', niveau: 1, ref: '§4.2.8, p. 88',
          enonce: 'Dans la ligne `UUID=b600…  /srv/archives  ext4  defaults,noatime  0  2`, associe chaque champ à son rôle.',
          paires: [
            ['`UUID=b600…`', 'Le système de fichiers à monter'],
            ['`/srv/archives`', 'Le point de montage'],
            ['`ext4`', 'Le type de système de fichiers'],
            ['`defaults,noatime`', 'Les options de montage'],
            ['`0` (5ᵉ champ)', 'Sauvegarde dump (désactivée)'],
            ['`2` (6ᵉ champ)', 'Ordre de vérification fsck au démarrage'],
          ],
          indices: ['Le même ordre que la commande mount, plus des réglages.', 'L’avant-dernier champ concerne un vieil outil de sauvegarde.', 'Le dernier concerne fsck.'],
          solution: 'Périphérique, point de montage, type, options, dump, ordre fsck.',
        },
        {
          id: 'c04-06-02', type: 'trous', niveau: 2, ref: '§4.2.8, p. 88',
          enonce: 'Complète la ligne fstab qui monte l’ext4 d’UUID `5c9e…` sur `/srv/boutique`, avec les options par défaut, sans dump, vérifiée après la racine.',
          texte: 'UUID=5c9e…  [[1]]  [[2]]  [[3]]  [[4]]  [[5]]',
          trous: [
            { accepte: ['/srv/boutique/?'], exemple: '/srv/boutique' },
            { accepte: ['ext4'], exemple: 'ext4' },
            { accepte: ['defaults'], exemple: 'defaults' },
            { accepte: ['0'], exemple: '0' },
            { accepte: ['2'], exemple: '2' },
          ],
          indices: ['Point de montage, type, options, dump, fsck.', 'Les options par défaut ont un mot-clé.', 'La racine passe en 1, les autres en 2.'],
          solution: '```\nUUID=5c9e…  /srv/boutique  ext4  defaults  0  2\n```',
        },
        {
          id: 'c04-06-03', type: 'qcm', niveau: 2,
          enonce: 'Un disque USB de sauvegarde n’est pas toujours branché. Quelle option ajouter à sa ligne fstab pour que la machine démarre normalement en son absence ?',
          choix: ['`nofail`', '`noauto,ro`', '`user`', '`defaults`'],
          reponse: 0,
          indices: ['Sans précaution, systemd attend le disque puis bascule en mode urgence.', 'L’option dit « ce n’est pas un échec s’il manque ».', '*no fail*.'],
          solution: '`nofail` : si le périphérique est absent, le démarrage continue. (`noauto` empêcherait aussi le blocage, mais le disque ne serait jamais monté automatiquement.)',
        },
        {
          id: 'c04-06-04', type: 'ordre', niveau: 2,
          enonce: 'Tu viens d’ajouter une ligne à `/etc/fstab`. Remets dans l’ordre la procédure **sûre** avant de redémarrer.',
          elements: [
            'Créer le point de montage s’il n’existe pas',
            'Vérifier la syntaxe avec `findmnt --verify`',
            'Faire relire fstab par systemd : `systemctl daemon-reload`',
            'Monter avec `mount -a` et vérifier avec `findmnt` ou `df -h`',
            'Seulement ensuite, redémarrer pour valider',
          ],
          indices: ['On ne monte pas sur un répertoire inexistant.', 'On vérifie avant d’agir.', 'Redémarrer vient en dernier, quand tout est sûr.'],
          solution: 'Point de montage, vérification, rechargement de systemd, montage de test, puis redémarrage. Si `mount -a` échoue, corrige **avant** de redémarrer : sinon c’est le mode urgence (Lab 03).',
        },
        {
          id: 'c04-06-05', type: 'commande', niveau: 1, ref: '§4.2.8, p. 89',
          enonce: 'Monte tous les systèmes de fichiers de fstab marqués « auto » qui ne sont pas encore montés.',
          accepte: ['(sudo )?mount -a', '(sudo )?mount --all', '(sudo )?mount -av', '(sudo )?mount -va'],
          exemple: 'mount -a',
          indices: ['Une option de mount.', '*all*.', '`mount -a`'],
          solution: '```\n# mount -a\n```\nAucun message = tout va bien. C’est le meilleur test d’une nouvelle ligne fstab.',
        },
        {
          id: 'c04-06-06', type: 'commande', niveau: 2,
          enonce: 'Vérifie la syntaxe et la cohérence de `/etc/fstab` avec `findmnt`.',
          accepte: ['(sudo )?findmnt --verify( --verbose)?', '(sudo )?findmnt -x( -v)?'],
          exemple: 'findmnt --verify',
          indices: ['C’est une option de `findmnt`.', 'Le mot anglais pour « vérifier ».', '`findmnt --verify`'],
          solution: '```\n# findmnt --verify\nSuccess, no errors or warnings detected\n```\nIl signale un UUID introuvable, un type inconnu, un point de montage absent…',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '4.7',
      titre: 'Capacité et vérification des systèmes de fichiers',
      sections: '§4.2.10 et 4.2.11', pages: '89–93',
      objectif: 'Trouver ce qui remplit un disque et réparer un système de fichiers.',
      rappel: `
        ### Mesurer

        \`\`\`
        $ df -h                        # espace utilisé et libre par système de fichiers
        $ df -h /srv                   # celui qui contient /srv
        $ df -i                        # inodes utilisés et libres (fiche 4.12)
        $ du -sh /var/log              # taille totale d’un répertoire
        $ du -h --max-depth=1 /var | sort -h   # quels sous-répertoires pèsent le plus
        \`\`\`

        Sur ext4, environ **5 %** des blocs sont **réservés à root** : un utilisateur voit « disque plein » alors que \`df\`
        montre encore un peu de place. Cette réserve permet à root et aux services de continuer à fonctionner
        (réglable avec \`tune2fs -m\`).

        \`df\` et \`du\` peuvent ne pas être d’accord : un fichier **supprimé mais encore ouvert** par un processus occupe
        toujours de la place (\`du\` ne le voit plus, \`df\` si). On le retrouve avec \`lsof +L1\` (chapitre 8, Lab 06).

        ### Vérifier et réparer

        \`fsck\` (*file system check*) vérifie la cohérence d’un système de fichiers et propose des réparations. Il appelle
        \`fsck.ext4\` (= \`e2fsck\`), etc.

        - **Jamais** sur un système de fichiers monté en écriture : démonte-le d’abord.
        - \`fsck -n /dev/sdb1\` : vérifie **sans rien modifier**.
        - \`e2fsck -f /dev/sdb1\` : force la vérification ; \`-y\` répond oui à tout (à utiliser en connaissance de cause).
        - Les fichiers récupérés sans nom atterrissent dans \`lost+found\`.
        - **XFS** se répare avec \`xfs_repair\` (fsck.xfs ne fait rien).

        Grâce au **journal** d’ext4 et d’XFS, une coupure de courant ne nécessite plus de long fsck : au montage suivant,
        le système rejoue le journal. Un fsck manuel sert surtout après un incident matériel ou une erreur signalée par le noyau.
      `,
      aRetenir: [
        '`df -h` (par système de fichiers), `du -sh rep` (par répertoire), `df -i` (inodes).',
        '5 % réservés à root sur ext4 ; fichier supprimé mais ouvert : `lsof +L1`.',
        '`fsck` jamais sur un système monté en écriture ; `-n` pour vérifier sans modifier ; XFS : `xfs_repair`.',
      ],
      exercices: [
        {
          id: 'c04-07-01', type: 'commande', niveau: 1, ref: '§4.2.10, p. 89–90',
          enonce: 'Affiche l’espace disque utilisé et disponible de tous les systèmes de fichiers, en unités lisibles.',
          accepte: ['df -h', 'df -hT', 'df -Th', 'df --human-readable', 'df -H'],
          exemple: 'df -h',
          indices: ['*disk free*.', 'Option « lisible par un humain ».', '`df -h`'],
          solution: '```\n$ df -h\nFilesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        16G  1.4G   14G  10% /\n```\n`-T` ajoute le type de système de fichiers.',
        },
        {
          id: 'c04-07-02', type: 'commande', niveau: 1, ref: '§4.2.10, p. 90',
          enonce: 'Affiche la **taille totale** du répertoire `/var/log`, en unités lisibles, sur une seule ligne.',
          accepte: ['(sudo )?du -sh /var/log/?', '(sudo )?du -hs /var/log/?', '(sudo )?du -s -h /var/log/?'],
          exemple: 'du -sh /var/log',
          indices: ['*disk usage*.', '`-s` résume (une ligne), `-h` rend lisible.', '`du -sh /var/log`'],
          solution: '```\n$ sudo du -sh /var/log\n57M\t/var/log\n```\nSans `-s`, `du` affiche chaque sous-répertoire.',
        },
        {
          id: 'c04-07-03', type: 'qcm', niveau: 2, ref: '§4.2.10, p. 90–91',
          enonce: 'Sur un ext4, Bastien obtient « No space left on device » alors que `df -h` montre encore 4 % de libre. Explication la plus probable ?',
          choix: [
            'Environ 5 % des blocs sont réservés à root ; un utilisateur ordinaire ne peut pas les utiliser',
            'Le disque est défectueux',
            '`df` se trompe toujours de quelques pourcents',
            'Bastien n’a pas le droit d’écrire dans ce répertoire',
          ],
          reponse: 0,
          indices: ['ext4 garde une réserve.', 'Pour qui ?', 'Cette réserve laisse root et les services fonctionner quand le disque est plein.'],
          solution: 'La **réserve root** (5 % par défaut sur ext4). Pour un manque de droits, le message serait « Permission denied ».',
        },
        {
          id: 'c04-07-04', type: 'commande', niveau: 2, ref: '§4.2.11, p. 91–92',
          enonce: '**Vérifie sans rien modifier** le système de fichiers (démonté) de `/dev/sdb1`.',
          accepte: ['(sudo )?fsck -n /dev/sdb1', '(sudo )?e2fsck -n /dev/sdb1', '(sudo )?fsck\\.ext4 -n /dev/sdb1', '(sudo )?e2fsck -fn /dev/sdb1', '(sudo )?e2fsck -nf /dev/sdb1'],
          exemple: 'fsck -n /dev/sdb1',
          pieges: [{ motif: '(sudo )?(fsck|e2fsck) (-y |-fy |-yf )?/dev/sdb1', message: 'Cette forme peut modifier le système de fichiers. La consigne demande une vérification **sans modification**.' }],
          indices: ['`fsck` vérifie.', 'Une option répond automatiquement « non » à toutes les questions.', '`-n`'],
          solution: '```\n# fsck -n /dev/sdb1\n```\n`-n` répond « non » à toutes les propositions de réparation : on voit les problèmes sans rien changer.',
        },
        {
          id: 'c04-07-05', type: 'vrai-faux', niveau: 2, ref: '§4.2.11, p. 91–93',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'On peut lancer `fsck` sans risque sur un système de fichiers monté en lecture-écriture.', vrai: false, explication: 'Le noyau et fsck modifieraient les mêmes structures : risque de corruption grave.' },
            { texte: 'Les fichiers retrouvés sans nom par fsck sont placés dans `lost+found`.', vrai: true },
            { texte: 'Pour réparer un XFS, on utilise `xfs_repair`.', vrai: true },
            { texte: 'Grâce au journal, une coupure de courant n’impose plus un long fsck sur ext4.', vrai: true },
          ],
          indices: ['Un seul processus doit modifier les structures à la fois.', 'Une seule affirmation est fausse.', 'XFS a son propre outil.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
        {
          id: 'c04-07-06', type: 'commande', niveau: 3,
          enonce: 'Affiche la taille de chaque sous-répertoire **direct** de `/var`, en unités lisibles, triés du plus petit au plus gros.',
          accepte: ['(sudo )?du -h --max-depth=1 /var/? \\| sort -h', '(sudo )?du -hd ?1 /var/? \\| sort -h', '(sudo )?du -h -d ?1 /var/? \\| sort -h', '(sudo )?du -sh /var/\\* \\| sort -h', '(sudo )?du -d ?1 -h /var/? \\| sort -h'],
          exemple: 'du -h --max-depth=1 /var | sort -h',
          indices: ['`du` a une option de profondeur maximale.', '`sort -h` sait trier des tailles « humaines » (K, M, G).', '`du -h --max-depth=1 /var | sort -h`'],
          solution: '```\n$ sudo du -h --max-depth=1 /var | sort -h\n…\n180M\t/var/cache\n310M\t/var/lib\n520M\t/var\n```\nLa commande à réflexe quand un disque se remplit : on descend ensuite dans le plus gros.',
        },
      ],
    },
  ],
  memo: `
    ### Partitions
    \`\`\`
    parted -l   fdisk -l /dev/sdb   lsblk
    fdisk /dev/sdb   → g (GPT) · n · t · p · w (écrire) · q (abandonner)
    parted -s /dev/sdb mklabel gpt mkpart data ext4 1MiB 1GiB
    partprobe /dev/sdb    blockdev --rereadpt /dev/sdb
    \`\`\`

    ### Systèmes de fichiers et montage
    \`\`\`
    mkfs -t ext4 -L nom /dev/sdb1     mkfs.xfs /dev/sdb2
    mount [-t type] [-o opts] /dev/sdb1 /point     umount /point
    mount UUID=… /point     blkid     lsblk -f     findmnt
    mount -o remount,rw /     mount -o loop image.iso /mnt
    lsof /point   fuser -vm /point        (target is busy)
    \`\`\`

    ### /etc/fstab
    \`\`\`
    UUID=…  /srv/archives  ext4  defaults,noatime,nofail  0  2
    UUID=…  none           swap  sw                       0  0
    findmnt --verify  →  systemctl daemon-reload  →  mount -a
    \`\`\`
    Options : ro rw noexec nosuid nodev noatime noauto user nofail uid= loop

    ### Espace et réparation
    \`\`\`
    df -h   df -i   du -sh rep   du -h --max-depth=1 /var | sort -h
    fsck -n /dev/sdb1   e2fsck -f /dev/sdb1   xfs_repair /dev/sdb2   tune2fs -m 1 /dev/sdb1
    lsof +L1      (fichiers supprimés encore ouverts)
    \`\`\`
  `,
});
