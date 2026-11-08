/* Chapitre 4, partie 2 : swap, LVM, inodes (fiches 4.8 à 4.12). */
HLW.completer('04', {
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '4.8',
      titre: 'La mémoire d’échange (swap)',
      sections: '§4.3', pages: '94–96',
      objectif: 'Ajouter de la swap sur une partition ou dans un fichier.',
      rappel: `
        La **swap** (mémoire d’échange) est de l’espace disque que le noyau utilise comme extension de la mémoire vive :
        quand la RAM manque, il y déplace des pages peu utilisées. C’est beaucoup plus lent que la RAM, mais cela évite
        qu’un manque de mémoire ne fasse tuer des processus (par le *OOM killer*, chapitre 8).

        \`\`\`
        $ free -h                 # ligne Swap
        $ swapon --show           # zones de swap actives
        \`\`\`

        > Les images cloud Debian et Rocky démarrent **sans swap**. À toi d’en ajouter si besoin (Lab 02).

        ### Sur une partition

        \`\`\`
        # mkswap /dev/sdb2          # préparer (type de partition « Linux swap » de préférence)
        # swapon /dev/sdb2          # activer
        # swapoff /dev/sdb2         # désactiver
        \`\`\`

        Ligne fstab correspondante : \`UUID=…  none  swap  sw  0  0\` (ou \`defaults\` à la place de \`sw\`).

        ### Dans un fichier

        Pratique quand on ne peut pas repartitionner :

        \`\`\`
        # dd if=/dev/zero of=/swapfile bs=1M count=1024     # ou : fallocate -l 1G /swapfile
        # chmod 600 /swapfile                               # indispensable : la swap contient des données de la RAM
        # mkswap /swapfile
        # swapon /swapfile
        \`\`\`

        Ligne fstab : \`/swapfile  none  swap  sw  0  0\`.

        ### Combien ?

        L’ancienne règle « deux fois la RAM » n’a plus de sens avec des machines de plusieurs dizaines de gigaoctets.
        Le livre conseille de raisonner selon l’usage : un serveur qui swappe beaucoup est un serveur sous-dimensionné.
        La swap sert de **marge de sécurité** (et à l’hibernation sur un portable).
      `,
      aRetenir: [
        '`mkswap` prépare, `swapon` active, `swapoff` désactive ; `swapon --show`, `free -h`.',
        'Fichier de swap : créer, `chmod 600`, `mkswap`, `swapon`.',
        'fstab : `… none swap sw 0 0`.',
        'La swap est une marge de sécurité, pas de la mémoire en plus.',
      ],
      exercices: [
        {
          id: 'c04-08-01', type: 'ordre', niveau: 1, ref: '§4.3.2, p. 95',
          enonce: 'Remets dans l’ordre la création d’un fichier de swap de 1 Gio.',
          elements: [
            'Créer le fichier : `dd if=/dev/zero of=/swapfile bs=1M count=1024`',
            'Restreindre ses droits : `chmod 600 /swapfile`',
            'Le formater en swap : `mkswap /swapfile`',
            'L’activer : `swapon /swapfile`',
            'L’ajouter à `/etc/fstab` pour qu’il revienne au démarrage',
          ],
          indices: ['Le fichier doit exister avant tout.', 'On sécurise avant de l’utiliser.', 'mkswap avant swapon.'],
          solution: 'Créer, `chmod 600`, `mkswap`, `swapon`, puis fstab. `swapon` signale des droits trop larges (« insecure permissions »).',
        },
        {
          id: 'c04-08-02', type: 'commande', niveau: 1, ref: '§4.3.1, p. 94',
          enonce: 'Active la zone de swap préparée sur `/dev/sdb2`.',
          accepte: ['(sudo )?swapon /dev/sdb2', '(sudo )?swapon -v /dev/sdb2'],
          exemple: 'swapon /dev/sdb2',
          pieges: [{ motif: '(sudo )?mkswap /dev/sdb2', message: '`mkswap` prépare la zone (déjà fait ici) ; une autre commande l’active.' }],
          indices: ['« swap on ».', 'Un seul argument : la zone.', '`swapon /dev/sdb2`'],
          solution: '```\n# swapon /dev/sdb2\n$ swapon --show\nNAME      TYPE      SIZE USED PRIO\n/dev/sdb2 partition 512M   0B   -2\n```',
        },
        {
          id: 'c04-08-03', type: 'trous', niveau: 2, ref: '§4.3, p. 94–95',
          enonce: 'Complète la ligne fstab qui active au démarrage la swap d’UUID `0d8e…`.',
          texte: 'UUID=0d8e…  [[1]]  [[2]]  sw  0  0',
          trous: [
            { accepte: ['none', 'swap'], exemple: 'none' },
            { accepte: ['swap'], exemple: 'swap' },
          ],
          indices: ['La swap n’est montée nulle part dans l’arborescence.', 'Le type est… swap.', '`none swap sw 0 0`'],
          solution: '```\nUUID=0d8e…  none  swap  sw  0  0\n```\nPour tester sans redémarrer : `swapon -a` active toutes les swaps de fstab.',
        },
        {
          id: 'c04-08-04', type: 'qcm', niveau: 2, ref: '§4.3.2',
          enonce: 'Pourquoi faut-il impérativement `chmod 600` sur un fichier de swap ?',
          choix: [
            'Parce qu’il contient des morceaux de la mémoire des processus (mots de passe, clés…) qu’aucun utilisateur ne doit pouvoir lire',
            'Parce que sinon le noyau refuse de démarrer',
            'Pour que le fichier soit plus rapide',
            'Parce que mkswap refuse les fichiers en 644',
          ],
          reponse: 0,
          indices: ['Que contient la swap ?', 'Des pages de RAM de n’importe quel processus.', 'Pense à la confidentialité.'],
          solution: 'La swap reçoit des pages de mémoire de **tous** les processus : mots de passe, clés de chiffrement, documents… Lisible par tous, ce serait une fuite de données. `swapon` avertit d’ailleurs si les droits sont trop larges.',
        },
        {
          id: 'c04-08-05', type: 'commande', niveau: 1,
          enonce: 'Affiche les zones de swap actives, avec leur taille et leur utilisation.',
          accepte: ['swapon --show', 'swapon -s', 'cat /proc/swaps', '(sudo )?swapon --show'],
          exemple: 'swapon --show',
          indices: ['C’est une option de `swapon` lui-même.', '« montrer ».', '`swapon --show`'],
          solution: '```\n$ swapon --show\n```\nAucune sortie = aucune swap active (c’est le cas sur une VM cloud fraîche). `free -h` montre le total sur la ligne Swap.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '4.9',
      titre: 'LVM : notions et inspection',
      sections: '§4.4 et début de 4.4.2', pages: '96–100',
      objectif: 'Comprendre volumes physiques, groupes et volumes logiques, et les lister.',
      rappel: `
        Les partitions sont rigides : agrandir l’une impose de déplacer les autres. **LVM** (*Logical Volume Manager*)
        ajoute une couche de souplesse entre les disques et les systèmes de fichiers.

        \`\`\`
        disques / partitions   →   PV (volumes physiques)   /dev/sdb    /dev/sdc
                                          │                      └────┬────┘
        groupe de volumes      →   VG                           vg_brasserie
                                          │                      ┌────┴────┐
        volumes logiques       →   LV                     lv_boutique   lv_photos
                                          │                      │            │
        systèmes de fichiers               →                    XFS          ext4
        \`\`\`

        - **PV** (*physical volume*) : un disque ou une partition préparé pour LVM.
        - **VG** (*volume group*) : un réservoir d’espace formé d’un ou plusieurs PV. Il est découpé en **extents
          physiques** (PE), 4 Mio par défaut.
        - **LV** (*logical volume*) : un « disque virtuel » taillé dans le VG, sur lequel on crée un système de fichiers.
          On peut l’agrandir à chaud, et il peut s’étendre sur plusieurs disques.

        ### Inspecter

        | Résumé | Détail | Pour |
        |---|---|---|
        | \`pvs\` | \`pvdisplay\` | volumes physiques |
        | \`vgs\` | \`vgdisplay\` | groupes de volumes |
        | \`lvs\` | \`lvdisplay\` | volumes logiques |

        \`\`\`
        # vgs
          VG           #PV #LV #SN Attr   VSize  VFree
          vg_brasserie   1   1   0 wz--n- <4.00g <3.00g
        \`\`\`

        ### Noms des volumes logiques

        Un LV a deux noms équivalents : \`/dev/vg_brasserie/lv_boutique\` et \`/dev/mapper/vg_brasserie-lv_boutique\`.
        Ce sont des liens vers \`/dev/dm-N\` (le *device mapper*, fiche 4.11).
      `,
      aRetenir: [
        'PV (disques préparés) → VG (réservoir, découpé en extents de 4 Mio) → LV (volumes où l’on crée un système de fichiers).',
        '`pvs`, `vgs`, `lvs` (résumé) ; `pvdisplay`, `vgdisplay`, `lvdisplay` (détail).',
        '`/dev/VG/LV` = `/dev/mapper/VG-LV` → `/dev/dm-N`.',
      ],
      exercices: [
        {
          id: 'c04-09-01', type: 'ordre', niveau: 1, ref: '§4.4, figure 4-6, p. 96–97',
          enonce: 'Range ces éléments LVM du plus proche du matériel au plus proche des fichiers.',
          elements: [
            'Disque ou partition (`/dev/sdc`)',
            'Volume physique (PV)',
            'Groupe de volumes (VG)',
            'Volume logique (LV)',
            'Système de fichiers (XFS, ext4)',
          ],
          indices: ['On prépare d’abord le disque pour LVM.', 'Les PV sont regroupés dans un réservoir.', 'On taille des volumes dans le réservoir, puis on les formate.'],
          solution: 'Disque → PV → VG → LV → système de fichiers.',
        },
        {
          id: 'c04-09-02', type: 'association', niveau: 1, ref: '§4.4, p. 96–97',
          enonce: 'Associe chaque sigle LVM à sa définition.',
          paires: [
            ['PV', 'Disque ou partition préparé pour LVM'],
            ['VG', 'Réservoir d’espace formé d’un ou plusieurs PV'],
            ['LV', 'Volume taillé dans un VG, qui reçoit un système de fichiers'],
            ['PE', 'Unité d’allocation du VG, 4 Mio par défaut'],
          ],
          indices: ['P = physique, V = volume, G = groupe, L = logique.', 'E = *extent*.', 'Le LV est l’équivalent d’une partition.'],
          solution: 'PV : volume physique ; VG : groupe de volumes ; LV : volume logique ; PE : extent physique.',
        },
        {
          id: 'c04-09-03', type: 'association', niveau: 1, ref: '§4.4.2, p. 98–101',
          enonce: 'Associe chaque commande à ce qu’elle affiche.',
          paires: [
            ['`pvs`', 'Résumé des volumes physiques'],
            ['`vgs`', 'Résumé des groupes de volumes'],
            ['`lvs`', 'Résumé des volumes logiques'],
            ['`vgdisplay`', 'Détail des groupes de volumes (taille des PE, extents libres…)'],
          ],
          indices: ['La première lettre indique le niveau : p, v, l.', 'Le suffixe `s` donne un résumé.', '`display` donne le détail.'],
          solution: '`pvs`, `vgs`, `lvs` en résumé ; `pvdisplay`, `vgdisplay`, `lvdisplay` en détail.',
        },
        {
          id: 'c04-09-04', type: 'reponse-courte', niveau: 2, casse: true, mono: true, ref: '§4.4.2, p. 101',
          enonce: 'Le volume logique `lv_boutique` du groupe `vg_brasserie` est accessible par `/dev/vg_brasserie/lv_boutique`. Quel est son **autre** chemin, sous `/dev/mapper` ?',
          accepte: ['/dev/mapper/vg_brasserie-lv_boutique'],
          indices: ['Le device mapper nomme ses volumes « groupe-volume ».', 'Le séparateur est un tiret.', '`/dev/mapper/VG-LV`'],
          solution: '`/dev/mapper/vg_brasserie-lv_boutique`. (Un tiret dans un nom de VG ou de LV est doublé dans `/dev/mapper` pour éviter l’ambiguïté : `vg--prod-data`.)',
        },
        {
          id: 'c04-09-05', type: 'vrai-faux', niveau: 2, ref: '§4.4, p. 96–97',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un volume logique peut s’étendre sur plusieurs disques physiques.', vrai: true },
            { texte: 'On peut agrandir un volume logique sans démonter son système de fichiers.', vrai: true, explication: 'Agrandir un ext4 ou un XFS se fait à chaud ; réduire, non (et XFS ne se réduit pas du tout).' },
            { texte: 'Un groupe de volumes ne peut contenir qu’un seul volume physique.', vrai: false },
            { texte: 'La taille d’un volume logique est toujours un multiple de la taille d’un extent.', vrai: true },
          ],
          indices: ['C’est tout l’intérêt de LVM : la souplesse.', 'Une seule affirmation est fausse.', 'L’allocation se fait par extents.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
        {
          id: 'c04-09-06', type: 'terminal', niveau: 2,
          enonce: 'Sur `fut` (Rocky), lance `sudo pvs`, `sudo vgs` et `sudo lvs`, puis `lsblk`. Colle la sortie. L’image cloud utilise-t-elle LVM ? (L’image « Base » non, l’image « LVM » oui.)',
          indices: ['Si les trois commandes ne renvoient rien, aucun volume LVM n’existe.', 'Les paquets lvm2 sont-ils installés ? `rpm -q lvm2`.', 'Tes modèles utilisent l’image GenericCloud-Base.'],
          solution: 'Avec l’image **Base**, aucun volume LVM : les commandes ne renvoient rien et `lsblk` montre des partitions classiques. Une installation Rocky « classique » (ISO) crée au contraire un VG `rl` avec des LV `root` et `swap`. Tu créeras ton propre VG au Lab 02 (installe `lvm2` sur Debian si besoin).',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '4.10',
      titre: 'LVM : créer, agrandir, supprimer',
      sections: '§4.4.2', pages: '101–107',
      objectif: 'Mettre en place un volume logique et l’agrandir à chaud.',
      rappel: `
        ### Créer

        \`\`\`
        # pvcreate /dev/sdc                         # préparer le disque (vgcreate le fait aussi implicitement)
        # vgcreate vg_brasserie /dev/sdc            # créer le groupe
        # lvcreate --size 1g -n lv_boutique vg_brasserie   # ou : lvcreate -L 1G -n lv_boutique vg_brasserie
        # mkfs.xfs /dev/vg_brasserie/lv_boutique    # formater
        # mkdir -p /srv/boutique
        # mount /dev/vg_brasserie/lv_boutique /srv/boutique
        \`\`\`

        Ajouter un disque au groupe : \`vgextend vg_brasserie /dev/sdd\`.

        ### Agrandir à chaud

        Deux étapes : agrandir le **volume**, puis le **système de fichiers** qu’il contient.

        \`\`\`
        # lvextend -L +500M vg_brasserie/lv_boutique        # +500 Mio
        # xfs_growfs /srv/boutique                          # XFS : par le point de montage
        # resize2fs /dev/vg_brasserie/lv_boutique           # ext4 : par le périphérique
        \`\`\`

        Ou en une seule commande, avec l’option **\`-r\`** (\`--resizefs\`), qui appelle le bon outil (via \`fsadm\`) :

        \`\`\`
        # lvextend -r -L +500M vg_brasserie/lv_boutique
        # lvresize -r -l +100%FREE vg_brasserie/lv_boutique  # tout l’espace libre du groupe
        \`\`\`

        \`-L\` exprime une taille (\`1G\`, \`+500M\`), \`-l\` un nombre d’**extents** ou un pourcentage (\`+100%FREE\`).

        ### Réduire et supprimer

        - Réduire est **risqué** : il faut réduire le système de fichiers d’abord (\`lvreduce -r\` le fait pour ext4, démonté).
          XFS **ne se réduit pas**.
        - Supprimer : démonter, retirer de fstab, puis \`lvremove vg_brasserie/lv_photos\`.
      `,
      aRetenir: [
        '`pvcreate` → `vgcreate VG disque` → `lvcreate -L taille -n LV VG` → `mkfs` → `mount`.',
        '`vgextend VG disque` ajoute un disque.',
        'Agrandir : `lvextend -r -L +taille VG/LV` (volume et système de fichiers ensemble).',
        '`-L` taille, `-l` extents ou `%FREE` ; XFS ne se réduit pas.',
      ],
      exercices: [
        {
          id: 'c04-10-01', type: 'commande', niveau: 1, ref: '§4.4.2, p. 102',
          enonce: 'Crée un groupe de volumes nommé `vg_brasserie` sur le disque `/dev/sdc`.',
          accepte: ['(sudo )?vgcreate vg_brasserie /dev/sdc'],
          exemple: 'vgcreate vg_brasserie /dev/sdc',
          pieges: [{ motif: '(sudo )?vgcreate /dev/sdc vg_brasserie', message: 'Le nom du groupe vient en premier, puis le ou les disques.' }],
          indices: ['*volume group create*.', 'Nom du groupe, puis disque(s).', '`vgcreate vg_brasserie /dev/sdc`'],
          solution: '```\n# vgcreate vg_brasserie /dev/sdc\n  Physical volume "/dev/sdc" successfully created.\n  Volume group "vg_brasserie" successfully created\n```\nvgcreate a lancé `pvcreate` implicitement.',
        },
        {
          id: 'c04-10-02', type: 'commande', niveau: 1, ref: '§4.4.2, p. 103',
          enonce: 'Crée dans `vg_brasserie` un volume logique de **1 Gio** nommé `lv_boutique`.',
          accepte: ['(sudo )?lvcreate (-L ?1[Gg]|--size[= ]1[Gg]) -n ?lv_boutique vg_brasserie', '(sudo )?lvcreate -n ?lv_boutique (-L ?1[Gg]|--size[= ]1[Gg]) vg_brasserie', '(sudo )?lvcreate (-L ?1[Gg]|--size[= ]1[Gg]) --name[= ]lv_boutique vg_brasserie', '(sudo )?lvcreate (--type linear )?(--size[= ]1[Gg]|-L ?1[Gg]) (--type linear )?-n ?lv_boutique vg_brasserie'],
          exemple: 'lvcreate -L 1G -n lv_boutique vg_brasserie',
          indices: ['*logical volume create*.', 'Taille avec `-L` (ou `--size`), nom avec `-n`.', 'Le groupe vient en dernier.'],
          solution: '```\n# lvcreate -L 1G -n lv_boutique vg_brasserie\n  Logical volume "lv_boutique" created.\n```',
        },
        {
          id: 'c04-10-03', type: 'commande', niveau: 2, ref: '§4.4.2, p. 106',
          enonce: 'Agrandis `vg_brasserie/lv_boutique` de **500 Mio** **et** son système de fichiers, en une seule commande.',
          accepte: ['(sudo )?lvextend -r -L ?\\+500[Mm] (vg_brasserie/lv_boutique|/dev/vg_brasserie/lv_boutique|/dev/mapper/vg_brasserie-lv_boutique)', '(sudo )?lvextend -L ?\\+500[Mm] -r (vg_brasserie/lv_boutique|/dev/vg_brasserie/lv_boutique|/dev/mapper/vg_brasserie-lv_boutique)', '(sudo )?lvresize -r -L ?\\+500[Mm] (vg_brasserie/lv_boutique|/dev/vg_brasserie/lv_boutique|/dev/mapper/vg_brasserie-lv_boutique)', '(sudo )?lvextend --resizefs -L ?\\+500[Mm] (vg_brasserie/lv_boutique|/dev/vg_brasserie/lv_boutique)', '(sudo )?lvextend --size \\+500[Mm] -r (vg_brasserie/lv_boutique|/dev/vg_brasserie/lv_boutique)'],
          exemple: 'lvextend -r -L +500M vg_brasserie/lv_boutique',
          pieges: [{ motif: '(sudo )?lvextend -L ?\\+500[Mm] (vg_brasserie/lv_boutique|/dev/vg_brasserie/lv_boutique)', message: 'Sans `-r`, seul le volume grandit : le système de fichiers garde son ancienne taille (`df` ne bouge pas).' }, { motif: '(sudo )?lvextend (-r )?-L ?500[Mm] .*', message: 'Sans `+`, `-L 500M` fixe la taille **à** 500 Mio (ici, ce serait une réduction refusée).' }],
          indices: ['*logical volume extend*.', 'Le `+` devant la taille l’ajoute à la taille actuelle.', 'L’option `-r` redimensionne aussi le système de fichiers.'],
          solution: '```\n# lvextend -r -L +500M vg_brasserie/lv_boutique\n```\n`-r` appelle `xfs_growfs` ou `resize2fs` selon le système de fichiers. Vérifie avec `df -h /srv/boutique`.',
        },
        {
          id: 'c04-10-04', type: 'qcm', niveau: 2, ref: '§4.4.2, p. 105–106',
          enonce: 'Tu as tapé `lvextend -L +1G vg_brasserie/lv_boutique` (sans `-r`). `lvs` montre bien le volume agrandi, mais `df -h` n’a pas bougé. Que faire pour un **XFS** monté sur `/srv/boutique` ?',
          choix: ['`xfs_growfs /srv/boutique`', '`resize2fs /dev/vg_brasserie/lv_boutique`', 'Démonter, reformater, remonter', 'Redémarrer la machine'],
          reponse: 0,
          indices: ['Le volume a grandi, pas le système de fichiers.', 'Chaque système de fichiers a son outil d’agrandissement.', 'Pour XFS, l’outil prend le point de montage.'],
          solution: '`xfs_growfs /srv/boutique` (le système de fichiers doit être monté). `resize2fs` sert à ext4. Reformater détruirait les données.',
        },
        {
          id: 'c04-10-05', type: 'association', niveau: 2, ref: '§4.4.2, p. 102–107',
          enonce: 'Associe chaque commande à son effet.',
          paires: [
            ['`vgextend vg_brasserie /dev/sdd`', 'Ajoute un disque au groupe de volumes'],
            ['`lvresize -r -l +100%FREE vg_brasserie/lv_boutique`', 'Donne tout l’espace libre du groupe au volume et à son système de fichiers'],
            ['`lvremove vg_brasserie/lv_photos`', 'Supprime un volume logique'],
            ['`pvcreate /dev/sdd`', 'Prépare un disque pour LVM'],
          ],
          indices: ['`extend` sur un VG : on lui ajoute un PV.', '`-l` travaille en extents ou en pourcentage.', 'remove = supprimer.'],
          solution: 'vgextend : ajouter un disque ; lvresize -l +100%FREE -r : tout l’espace libre ; lvremove : supprimer ; pvcreate : préparer.',
        },
        {
          id: 'c04-10-06', type: 'vrai-faux', niveau: 2, ref: '§4.4.2',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`lvcreate -L 2G` et `lvcreate --size 2g` sont équivalents.', vrai: true },
            { texte: 'Un volume XFS peut être réduit avec `lvreduce -r`.', vrai: false, explication: 'XFS ne sait pas rétrécir. Il faut sauvegarder, recréer plus petit, restaurer.' },
            { texte: 'Avant `lvremove`, il faut démonter le système de fichiers et le retirer de fstab.', vrai: true },
            { texte: '`-l +50%FREE` ajoute la moitié de l’espace libre du groupe.', vrai: true },
          ],
          indices: ['-L et --size sont la même option.', 'Une seule affirmation est fausse.', 'XFS a une limite connue.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '4.11',
      titre: 'LVM sous le capot : le device mapper',
      sections: '§4.4.3 et 4.5', pages: '107–111',
      objectif: 'Comprendre où LVM stocke sa configuration et comment le noyau assemble les volumes.',
      rappel: `
        LVM a deux moitiés :

        1. **Dans l’espace utilisateur**, les outils LVM écrivent des **métadonnées** au début de chaque PV : un texte qui
           décrit le groupe, ses volumes et quels extents de quels disques les composent. Au démarrage, \`vgchange -ay\`
           (lancé par systemd ou l’initramfs) lit ces métadonnées et active les volumes.
        2. **Dans le noyau**, le **device mapper** crée un périphérique bloc virtuel (\`/dev/dm-N\`) pour chaque LV, d’après
           une **table** de correspondance « tel morceau de ce volume = tel morceau de tel disque ».

        \`\`\`
        # dd if=/dev/sdc count=1000 2>/dev/null | strings | less    # les métadonnées sont lisibles !
        # dmsetup info                       # volumes du device mapper (nom, majeur:mineur, état)
        # dmsetup table
        vg_brasserie-lv_boutique: 0 2097152 linear 8:32 2048
        \`\`\`

        Lecture de la table : à partir du secteur **0** du volume, sur **2 097 152** secteurs (1 Gio), la cible **linear**
        renvoie vers le périphérique **8:32** (\`/dev/sdc\`) à partir de son secteur **2048** (après les métadonnées).
        Un volume agrandi sur un second disque aurait une deuxième ligne.

        Le device mapper ne sert pas qu’à LVM : le **chiffrement** de disque (LUKS/dm-crypt), le multipath, les
        instantanés et les conteneurs l’utilisent aussi (modules A5 et A4).

        ### Et ensuite ? (§4.5)

        Le livre conclut la partie « disques » : tout ce qui suit dans le système (montages, journaux, services) repose
        sur ces couches. Prochaine étape : l’intérieur d’un système de fichiers.
      `,
      aRetenir: [
        'Métadonnées LVM : texte au début de chaque PV ; activation au démarrage (`vgchange -ay`).',
        'Noyau : le device mapper crée `/dev/dm-N` d’après une table (`dmsetup table`).',
        'Cible `linear` : début, longueur, périphérique majeur:mineur, décalage.',
        'Le device mapper sert aussi au chiffrement (dm-crypt), au multipath, aux instantanés.',
      ],
      exercices: [
        {
          id: 'c04-11-01', type: 'qcm', niveau: 2, ref: '§4.4.3, p. 107–109',
          enonce: 'Où LVM enregistre-t-il la description de ses groupes et volumes ?',
          choix: [
            'Dans des métadonnées en texte, au début de chaque volume physique',
            'Uniquement dans `/etc/lvm/lvm.conf`',
            'Dans la table de partitions GPT',
            'Dans la mémoire du noyau seulement, recalculée à chaque démarrage',
          ],
          reponse: 0,
          indices: ['Les disques doivent pouvoir être déplacés vers une autre machine.', 'La description voyage donc avec les disques.', 'On peut la lire avec `dd … | strings`.'],
          solution: 'Au début de **chaque PV**, en texte. On peut ainsi déplacer les disques vers une autre machine et y réactiver le groupe. (`/etc/lvm/backup` en garde aussi des copies, et `lvm.conf` contient les réglages des outils.)',
        },
        {
          id: 'c04-11-02', type: 'association', niveau: 3, ref: '§4.4.3, p. 110',
          enonce: 'Dans la ligne `dmsetup table` suivante : `vg_brasserie-lv_boutique: 0 2097152 linear 8:32 2048`, associe chaque élément à sa signification.',
          paires: [
            ['`0`', 'Premier secteur du volume logique concerné'],
            ['`2097152`', 'Nombre de secteurs de ce segment'],
            ['`linear`', 'Type de correspondance (cible du device mapper)'],
            ['`8:32`', 'Périphérique sous-jacent (majeur:mineur)'],
            ['`2048`', 'Secteur de départ sur ce périphérique'],
          ],
          indices: ['Les deux premiers nombres décrivent la portion du volume logique.', 'Ensuite vient la cible et ses paramètres.', '8:32 = `/dev/sdc` (fiche 3.1).'],
          solution: 'Secteurs 0 à 2 097 151 du volume (1 Gio) → cible linéaire → `/dev/sdc` (8:32) à partir du secteur 2048.',
        },
        {
          id: 'c04-11-03', type: 'commande', niveau: 2, ref: '§4.4.3, p. 110',
          enonce: 'Affiche les tables de correspondance de tous les volumes du device mapper.',
          accepte: ['(sudo )?dmsetup table'],
          exemple: 'dmsetup table',
          indices: ['L’outil du device mapper s’appelle `dmsetup`.', 'Sous-commande : la « table ».', '`dmsetup table`'],
          solution: '```\n# dmsetup table\nvg_brasserie-lv_boutique: 0 2097152 linear 8:32 2048\n```\n`dmsetup info` donne les noms, numéros et états.',
        },
        {
          id: 'c04-11-04', type: 'vrai-faux', niveau: 2, ref: '§4.4.3',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`/dev/vg_brasserie/lv_boutique` est un lien vers un périphérique `/dev/dm-N`.', vrai: true },
            { texte: 'Le device mapper ne sert qu’à LVM.', vrai: false, explication: 'Il sert aussi au chiffrement (dm-crypt/LUKS), au multipath, aux instantanés…' },
            { texte: 'Un volume logique réparti sur deux disques a plusieurs lignes dans sa table.', vrai: true },
            { texte: 'Au démarrage, les volumes doivent être activés à partir des métadonnées avant de pouvoir être montés.', vrai: true },
          ],
          indices: ['Pense au chiffrement de disque.', 'Une seule affirmation est fausse.', 'Une ligne par segment contigu.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '4.12',
      titre: 'Inodes, liens physiques et allocation',
      sections: '§4.6', pages: '111–116',
      objectif: 'Comprendre ce qu’est un fichier pour un système de fichiers Unix.',
      rappel: `
        Un système de fichiers traditionnel (ext4 et ses ancêtres) contient deux choses : des **blocs de données** et une
        **table d’inodes**.

        - Un **inode** décrit un fichier : type, permissions, propriétaire, groupe, taille, dates, nombre de liens, et où
          se trouvent ses blocs de données. **Il ne contient pas le nom du fichier.**
        - Un **répertoire** est un fichier spécial qui contient une liste de couples **nom → numéro d’inode**.

        \`\`\`
        $ ls -i                         # numéro d’inode devant chaque nom
        2753 recette.txt
        $ stat recette.txt              # tout le contenu de l’inode
        Inode: 2753   Links: 1   Access: (0644/-rw-r--r--)  Uid: 1000 …
        $ df -i                         # inodes utilisés et libres
        \`\`\`

        ### Liens physiques

        Un **lien physique** (*hard link*) est simplement **un deuxième nom** (une deuxième entrée de répertoire) pour le
        **même inode** :

        \`\`\`
        $ ln dir_1/recette dir_2/copie-recette     # même inode, deux noms
        $ ls -li dir_1/recette dir_2/copie-recette
        2753 -rw-r--r-- 2 … dir_1/recette          ← compteur de liens : 2
        2753 -rw-r--r-- 2 … dir_2/copie-recette
        \`\`\`

        - Le **compteur de liens** (2ᵉ colonne de \`ls -l\`) indique combien de noms pointent vers l’inode.
        - \`rm\` supprime un **nom** ; les données ne sont libérées que quand le compteur tombe à **0** (et qu’aucun processus
          n’a plus le fichier ouvert).
        - Un lien physique ne peut **pas traverser** deux systèmes de fichiers (les numéros d’inode sont locaux), ni désigner un **répertoire**.
        - Un répertoire a au moins 2 liens : son nom dans le parent, et \`.\` en lui-même ; plus un par sous-répertoire (leur \`..\`).

        ### Allocation et outils

        Le système de fichiers tient aussi des **cartes** des blocs et des inodes libres. \`fsck\` vérifie que tout est
        cohérent (compteurs de liens, blocs revendiqués par deux fichiers…). On peut examiner un ext4 à bas niveau avec
        \`debugfs\` (en lecture seule par défaut). Un disque peut être « plein » faute d’**inodes** alors qu’il reste des blocs
        (beaucoup de tout petits fichiers) : \`df -i\` le révèle.
      `,
      aRetenir: [
        'Inode = métadonnées + emplacement des données, **sans le nom**.',
        'Répertoire = liste « nom → numéro d’inode ».',
        'Lien physique = autre nom du même inode ; compteur de liens ; données libérées à 0 lien.',
        'Pas de lien physique entre systèmes de fichiers ni vers un répertoire ; `ls -i`, `stat`, `df -i`.',
      ],
      exercices: [
        {
          id: 'c04-12-01', type: 'qcm', niveau: 1, ref: '§4.6, p. 111–112',
          enonce: 'Quelle information **n’est pas** stockée dans l’inode d’un fichier ?',
          choix: ['Son nom', 'Ses permissions', 'Sa taille', 'Son propriétaire'],
          reponse: 0,
          indices: ['Un même fichier peut avoir plusieurs noms.', 'Les noms sont rangés ailleurs.', 'Dans les répertoires.'],
          solution: 'Le **nom**. Il est stocké dans le répertoire, qui associe le nom au numéro d’inode. C’est ce qui rend les liens physiques possibles.',
        },
        {
          id: 'c04-12-02', type: 'sortie', niveau: 2, ref: '§4.6.1, p. 113',
          enonce: 'Qu’affiche la dernière commande (seulement le **compteur de liens**, un nombre) ?\n\n```\n$ echo test > a\n$ ln a b\n$ ln a c\n$ rm b\n$ stat -c %h a\n```',
          attendu: '2',
          indices: ['Chaque `ln` ajoute un nom au même inode.', '`rm` retire un nom.', '1 + 2 − 1.'],
          solution: '```\n2\n```\nTrois noms (a, b, c), puis b est supprimé : il reste a et c. `stat -c %h` affiche le nombre de liens physiques.',
        },
        {
          id: 'c04-12-03', type: 'commande', niveau: 1, ref: '§4.6, p. 115',
          enonce: 'Liste les fichiers du répertoire courant avec leur **numéro d’inode**.',
          accepte: ['ls -i', 'ls -li', 'ls -il', 'ls -ia', 'ls -ai', 'ls -lai', 'ls -ail', 'ls -ial', 'ls --inode'],
          exemple: 'ls -i',
          indices: ['C’est une option de `ls`.', 'i comme inode.', '`ls -i`'],
          solution: '```\n$ ls -i\n2753 recette.txt  2754 notes.txt\n```\nAvec `-l` en plus : `ls -li`.',
        },
        {
          id: 'c04-12-04', type: 'vrai-faux', niveau: 2, ref: '§4.6.1, p. 113–114',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un lien physique peut pointer vers un fichier situé sur un autre système de fichiers.', vrai: false, explication: 'Les numéros d’inode n’ont de sens que dans un même système de fichiers. Il faut un lien symbolique.' },
            { texte: 'Les données d’un fichier sont libérées quand son compteur de liens tombe à zéro et qu’aucun processus ne l’a ouvert.', vrai: true },
            { texte: 'Un répertoire vide a un compteur de liens de 2.', vrai: true, explication: 'Son nom dans le parent, et « . » en lui-même.' },
            { texte: 'On peut créer un lien physique vers un répertoire avec `ln`.', vrai: false, explication: 'Interdit : cela pourrait créer des boucles dans l’arborescence.' },
          ],
          indices: ['Les inodes sont numérotés par système de fichiers.', 'Deux vraies, deux fausses.', 'Pense à « . » et « .. ».'],
          solution: 'Faux, vrai, vrai, faux.',
        },
        {
          id: 'c04-12-05', type: 'reponse-courte', niveau: 3, ref: '§4.6.1, p. 113–114',
          enonce: 'Le répertoire `recettes` contient 3 sous-répertoires et 10 fichiers. Quel est son **compteur de liens** ?',
          accepte: ['5', 'cinq'],
          indices: ['Les fichiers ne comptent pas.', 'Son nom dans le parent + « . » en lui-même.', 'Et un « .. » dans chaque sous-répertoire.'],
          solution: '2 + 3 = **5** : son entrée dans le parent, son propre `.`, et le `..` de chacun des 3 sous-répertoires.',
        },
        {
          id: 'c04-12-06', type: 'qcm', niveau: 2, ref: '§4.6.2, p. 114',
          enonce: 'Un serveur de cache affiche « No space left on device », mais `df -h` montre 40 % de libre. Quelle commande vérifier en priorité ?',
          choix: ['`df -i`', '`du -sh /`', '`fsck -n /`', '`free -h`'],
          reponse: 0,
          indices: ['Il n’y a pas que les blocs qui peuvent manquer.', 'Chaque fichier consomme un inode.', 'Des millions de petits fichiers…'],
          solution: '`df -i` : les **inodes** sont peut-être épuisés (des millions de petits fichiers). On ne peut plus créer de fichier, même s’il reste des blocs.',
        },
        {
          id: 'c04-12-07', type: 'terminal', niveau: 2,
          enonce: `
            Reproduis l’expérience du livre (§4.6) sur ta VM, puis colle la sortie de \`ls -lia dir_1 dir_2\` :

            \`\`\`
            $ mkdir dir_1 dir_2
            $ echo a > dir_1/file_1 ; echo b > dir_1/file_2 ; echo c > dir_1/file_3
            $ echo d > dir_2/file_4
            $ ln dir_1/file_3 dir_2/file_5
            \`\`\`

            Quels fichiers partagent le même numéro d’inode ? Quel est leur compteur de liens ?
          `,
          attendu: ['file_5'],
          indices: ['`-i` affiche les inodes, `-a` montre `.` et `..`.', 'Le lien physique est file_5.', 'Compare la 1ʳᵉ et la 3ᵉ colonne.'],
          solution: '`dir_1/file_3` et `dir_2/file_5` ont le **même numéro d’inode** et un compteur de liens de **2** : c’est un seul fichier avec deux noms. Remarque aussi le compteur de `.` dans chaque répertoire (2), et celui du répertoire courant (2 + nombre de sous-répertoires).',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'MBR vs GPT : nombre de partitions et taille maximale ?', r: 'MBR : 4 primaires (ou étendue + logiques), 2 Tio. GPT : 128 partitions, taille pratiquement illimitée.' },
    { q: 'Numérotation des partitions logiques MBR ?', r: 'À partir de 5.' },
    { q: 'fdisk : écrire ? abandonner ? nouvelle table GPT ?', r: '`w` ; `q` ; `g`.' },
    { q: 'Faire relire la table de partitions au noyau ?', r: '`partprobe /dev/sdX` ou `blockdev --rereadpt /dev/sdX`.' },
    { q: 'Secteur de départ d’une partition alignée sur 1 Mio ?', r: '2048.' },
    { q: 'Créer un ext4 étiqueté « archives » sur sdb1 ?', r: '`mkfs.ext4 -L archives /dev/sdb1`' },
    { q: 'Système de fichiers par défaut de Debian ? de Rocky ?', r: 'ext4 ; XFS (qui ne se réduit pas).' },
    { q: 'Afficher les UUID ?', r: '`blkid` ou `lsblk -f`.' },
    { q: '« target is busy » au démontage ?', r: 'Un processus l’utilise : `lsof /point` ou `fuser -vm /point` (souvent ton propre shell).' },
    { q: 'Remonter la racine en écriture ?', r: '`mount -o remount,rw /`' },
    { q: 'Les 6 champs de fstab ?', r: 'Périphérique (UUID=), point de montage, type, options, dump, ordre fsck.' },
    { q: 'Option fstab pour un disque parfois absent ?', r: '`nofail`' },
    { q: 'Tester fstab sans redémarrer ?', r: '`findmnt --verify`, `systemctl daemon-reload`, `mount -a`.' },
    { q: 'Espace par système de fichiers ? par répertoire ? inodes ?', r: '`df -h` ; `du -sh rep` ; `df -i`.' },
    { q: 'Vérifier un système de fichiers sans le modifier ?', r: '`fsck -n /dev/sdX1` (démonté !). XFS : `xfs_repair -n`.' },
    { q: 'Réserve d’ext4 ?', r: '≈ 5 % des blocs réservés à root (`tune2fs -m`).' },
    { q: 'Activer une swap ? la créer dans un fichier ?', r: '`swapon`. Fichier : dd/fallocate, `chmod 600`, `mkswap`, `swapon`.' },
    { q: 'PV, VG, LV, PE ?', r: 'Volume physique, groupe de volumes, volume logique, extent physique (4 Mio).' },
    { q: 'Créer un VG puis un LV de 1 Gio ?', r: '`vgcreate vg /dev/sdc` puis `lvcreate -L 1G -n lv vg`.' },
    { q: 'Agrandir un LV et son système de fichiers ?', r: '`lvextend -r -L +500M vg/lv`' },
    { q: 'Deux chemins d’un LV ?', r: '`/dev/vg/lv` et `/dev/mapper/vg-lv` (→ /dev/dm-N).' },
    { q: 'Que contient un inode ? que ne contient-il pas ?', r: 'Type, droits, propriétaire, taille, dates, liens, blocs. Pas le nom.' },
    { q: 'Lien physique : limites ?', r: 'Pas entre systèmes de fichiers, pas vers un répertoire.' },
    { q: 'Compteur de liens d’un répertoire ?', r: '2 + nombre de sous-répertoires.' },
  ],
  memo: `
    ### Swap
    \`\`\`
    mkswap /dev/sdb2   swapon /dev/sdb2   swapoff /dev/sdb2   swapon --show   free -h
    fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
    fstab :  UUID=…  none  swap  sw  0  0
    \`\`\`

    ### LVM
    \`\`\`
    pvcreate /dev/sdc            vgcreate vg_brasserie /dev/sdc     vgextend vg_brasserie /dev/sdd
    lvcreate -L 1G -n lv_boutique vg_brasserie
    lvextend -r -L +500M vg_brasserie/lv_boutique
    lvresize -r -l +100%FREE vg_brasserie/lv_boutique
    lvremove vg_brasserie/lv_photos
    pvs vgs lvs   pvdisplay vgdisplay lvdisplay   dmsetup info   dmsetup table
    xfs_growfs /point    resize2fs /dev/vg/lv
    \`\`\`

    ### Inodes et liens
    \`\`\`
    ls -i   ls -li   stat f   stat -c %h f   df -i
    ln cible nom        (physique : même inode)
    ln -s cible nom     (symbolique : un chemin)
    \`\`\`
  `,
});
