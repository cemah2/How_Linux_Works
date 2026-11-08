/* Module A5 (hors livre) : stockage avancé, RAID logiciel, LVM avancé, chiffrement LUKS. */
HLW.chapitre({
  id: 'A5',
  intro: `
    Le chapitre 4 et le Lab 02 t’ont appris les partitions, les systèmes de fichiers et les bases de LVM. En
    production, on ajoute trois couches : la **redondance** (RAID logiciel avec mdadm, ou RAID LVM), la
    **souplesse** (instantanés, volumes fins, migration à chaud avec LVM) et la **confidentialité** (chiffrement
    LUKS). Ce module les présente une par une, puis montre comment les empiler et les diagnostiquer.

    Tout se pratique sans risque sur des disques supplémentaires ajoutés par \`infra/proxmox/ajouter-disques.sh\`
    (numéros de série \`hlw-lab-N\`). **Vérifie toujours deux fois le nom du disque** : ces commandes effacent.
  `,
  objectifs: [
    'choisir un niveau de RAID et créer, surveiller et réparer un RAID logiciel avec mdadm ;',
    'utiliser les instantanés, les volumes fins et pvmove de LVM ;',
    'chiffrer un volume avec LUKS et le monter automatiquement au démarrage ;',
    'lire une pile de stockage avec lsblk et sauvegarder les métadonnées de chaque couche.',
  ],
  certifs: { lfcs: ['STO'], rhcsa: ['R5', 'R6'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: 'A5.1',
      titre: 'RAID logiciel avec mdadm',
      objectif: 'Construire un miroir, le surveiller, et remplacer un disque en panne.',
      rappel: `
        | Niveau | Principe | Disques min. | Capacité utile | Pannes tolérées |
        |---|---|---|---|---|
        | **0** | répartition (*striping*) | 2 | 100 % | **aucune** |
        | **1** | miroir | 2 | 50 % | n − 1 |
        | **5** | répartition + parité | 3 | (n − 1) disques | 1 |
        | **6** | double parité | 4 | (n − 2) disques | 2 |
        | **10** | miroirs répartis | 4 | 50 % | 1 par miroir |

        Le RAID protège contre la **panne d’un disque**, pas contre une suppression ou un rançongiciel : ce
        n’est **pas une sauvegarde** (module A8).

        \`\`\`
        # mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sdb /dev/sdc
        # cat /proc/mdstat                         # état et progression de la synchronisation
        # mdadm --detail /dev/md0
        # mkfs.xfs /dev/md0 ; mount /dev/md0 /srv/miroir
        # mdadm --detail --scan >> /etc/mdadm/mdadm.conf     # Rocky : /etc/mdadm.conf
        # update-initramfs -u                      # Rocky : dracut -f
        \`\`\`

        ### Remplacer un disque

        \`\`\`
        # mdadm /dev/md0 --fail /dev/sdc           # (simulation ; une vraie panne le marque F seule)
        # mdadm /dev/md0 --remove /dev/sdc
        # mdadm /dev/md0 --add /dev/sdd            # reconstruction automatique, suivie dans /proc/mdstat
        \`\`\`

        Dans \`/proc/mdstat\`, \`[UU]\` = deux disques en état, \`[U_]\` = un disque manquant (mode
        **dégradé**). Le service \`mdmonitor\` (\`MAILADDR\` dans mdadm.conf) prévient en cas de panne.
      `,
      aRetenir: [
        'RAID 0 (aucune tolérance), 1 (miroir), 5 (1 panne), 6 (2 pannes), 10.',
        'Le RAID n’est pas une sauvegarde.',
        '`mdadm --create … --level= --raid-devices=` ; `/proc/mdstat`, `mdadm --detail`.',
        'mdadm.conf (`--detail --scan`) + initramfs ; `--fail`, `--remove`, `--add`.',
      ],
      exercices: [
        {
          id: 'cA5-01-01', type: 'association', niveau: 1,
          enonce: 'Associe chaque niveau de RAID à sa propriété.',
          paires: [['RAID 0', 'Aucune tolérance de panne'], ['RAID 1', 'Miroir : la moitié de la capacité'], ['RAID 5', 'Parité : tolère la panne d’un disque'], ['RAID 6', 'Double parité : tolère deux pannes']],
          indices: ['0 = pas de redondance.', '1 = copie.', '5 et 6 = parité simple ou double.'],
          solution: 'RAID 0 : aucune tolérance ; 1 : miroir ; 5 : une panne ; 6 : deux pannes.',
        },
        {
          id: 'cA5-01-02', type: 'commande', niveau: 2,
          enonce: 'Crée un miroir (RAID 1) `/dev/md0` avec les disques `/dev/sdb` et `/dev/sdc`.',
          accepte: ['(sudo )?mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sdb /dev/sdc', '(sudo )?mdadm -C /dev/md0 -l ?1 -n ?2 /dev/sdb /dev/sdc', '(sudo )?mdadm --create /dev/md0 --level=(1|mirror) --raid-devices=2 /dev/sd\\[bc\\]', '(sudo )?mdadm --create --verbose /dev/md0 --level=1 --raid-devices=2 /dev/sdb /dev/sdc', '(sudo )?mdadm --create /dev/md0 --level=mirror --raid-devices=2 /dev/sdb /dev/sdc'],
          exemple: 'mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sdb /dev/sdc',
          indices: ['mdadm --create.', '--level et --raid-devices.', 'Puis les disques.'],
          solution: '```\n# mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sdb /dev/sdc\n# cat /proc/mdstat\n```',
        },
        {
          id: 'cA5-01-03', type: 'qcm', niveau: 2,
          enonce: '`/proc/mdstat` affiche `md0 : active raid1 sdb[0]` puis `[2/1] [U_]`. Qu’est-ce que cela signifie ?',
          choix: ['Le miroir est dégradé : un des deux disques manque', 'La synchronisation est terminée normalement', 'Le RAID est en lecture seule', 'Le disque sdb est en panne'],
          reponse: 0,
          indices: ['[2/1] : prévus / présents.', 'U = disque en état, _ = absent.', 'Un seul disque fonctionne.'],
          solution: 'Deux disques prévus, un seul actif : mode **dégradé**. Les données sont encore là, mais une seconde panne serait fatale : remplace le disque au plus vite (`--add`).',
        },
        {
          id: 'cA5-01-04', type: 'ordre', niveau: 2,
          enonce: 'Remets dans l’ordre le remplacement du disque `/dev/sdc` d’un miroir `/dev/md0` par `/dev/sdd`.',
          elements: ['mdadm /dev/md0 --fail /dev/sdc', 'mdadm /dev/md0 --remove /dev/sdc', 'mdadm /dev/md0 --add /dev/sdd', 'cat /proc/mdstat (suivre la reconstruction)'],
          indices: ['On marque le disque en panne (si ce n’est pas déjà fait).', 'On le retire du RAID.', 'On ajoute le neuf et on surveille.'],
          solution: '`--fail` → `--remove` → `--add` → suivre `/proc/mdstat` jusqu’à `[UU]`.',
        },
        {
          id: 'cA5-01-05', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un RAID 1 protège contre un `rm -rf` accidentel.', vrai: false, explication: 'La suppression est recopiée sur les deux disques.' },
            { texte: 'Sans entrée dans mdadm.conf (et initramfs à jour), le RAID peut prendre un autre nom au démarrage (md127).', vrai: true },
            { texte: 'Un RAID 5 de quatre disques de 4 To offre 12 To utiles.', vrai: true },
            { texte: 'Le RAID 0 double la sécurité des données.', vrai: false },
          ],
          indices: ['Le RAID copie tout, même les erreurs.', 'Deux fausses.', 'RAID 5 : n − 1 disques utiles.'],
          solution: 'Faux, vrai, vrai, faux.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A5.2',
      titre: 'LVM avancé : instantanés, volumes fins, migration à chaud',
      objectif: 'Tirer parti de LVM au-delà de la simple découpe d’un disque.',
      rappel: `
        Rappel du Lab 02 : volumes physiques (PV) → groupe (VG) → volumes logiques (LV).

        ### Instantanés

        Un **instantané** fige l’état d’un LV à un instant ; il ne stocke que les blocs modifiés ensuite
        (copie sur écriture). Usage typique : sauvegarder un système de fichiers cohérent, ou tester une mise
        à jour avec retour possible.

        \`\`\`
        # lvcreate --snapshot --size 2G --name boutique-snap vgdata/boutique
        # mount -o ro,nouuid /dev/vgdata/boutique-snap /mnt/snap     # nouuid : XFS refuse deux fois le même UUID
        # … sauvegarde de /mnt/snap …
        # umount /mnt/snap ; lvremove vgdata/boutique-snap
        # lvconvert --merge vgdata/boutique-snap                     # OU revenir à l'état de l'instantané
        \`\`\`

        Un instantané **plein** devient invalide : surveille \`Data%\` dans \`lvs\`.

        ### Volumes fins (*thin provisioning*)

        \`\`\`
        # lvcreate --type thin-pool --size 20G --name reserve vgdata
        # lvcreate --thin --virtualsize 50G --name clients vgdata/reserve    # 50 Go annoncés, 20 Go réels
        \`\`\`

        Pratique, mais **surveiller le remplissage du pool** : un pool plein bloque tous ses volumes.

        ### Agrandir et migrer à chaud

        \`\`\`
        # lvextend -r -L +5G vgdata/boutique        # -r agrandit aussi le système de fichiers
        # pvcreate /dev/sdd ; vgextend vgdata /dev/sdd
        # pvmove /dev/sdb /dev/sdd                  # déplacer les données, volumes montés
        # vgreduce vgdata /dev/sdb ; pvremove /dev/sdb
        # lvs -o +devices,seg_type                   # quel LV est sur quel disque
        \`\`\`

        LVM sait aussi faire du RAID lui-même : \`lvcreate --type raid1 -m 1 -L 10G -n miroir vgdata\`.
      `,
      aRetenir: [
        '`lvcreate --snapshot --size S --name N vg/lv` ; monter en `ro,nouuid` (XFS) ; `lvremove` ou `lvconvert --merge`.',
        'Volumes fins : `--type thin-pool`, puis `--thin --virtualsize` ; surveiller Data% (`lvs`).',
        '`lvextend -r` ; remplacer un disque à chaud : vgextend → pvmove → vgreduce.',
        '`lvs -o +devices,seg_type` ; `--type raid1 -m 1`.',
      ],
      exercices: [
        {
          id: 'cA5-02-01', type: 'commande', niveau: 2,
          enonce: 'Crée un instantané de 2 Gio nommé `boutique-snap` du volume `vgdata/boutique`.',
          accepte: ['(sudo )?lvcreate (--snapshot|-s) (--size|-L) ?2G (--name|-n) ?boutique-snap vgdata/boutique', '(sudo )?lvcreate (--size|-L) ?2G (--snapshot|-s) (--name|-n) ?boutique-snap vgdata/boutique', '(sudo )?lvcreate (--name|-n) ?boutique-snap (--snapshot|-s) (--size|-L) ?2G vgdata/boutique', '(sudo )?lvcreate (--snapshot|-s) (--name|-n) ?boutique-snap (--size|-L) ?2G vgdata/boutique', '(sudo )?lvcreate (--size|-L) ?2G (--name|-n) ?boutique-snap (--snapshot|-s) vgdata/boutique', '(sudo )?lvcreate (--snapshot|-s) (--size|-L) ?2G (--name|-n) ?boutique-snap /dev/vgdata/boutique'],
          exemple: 'lvcreate --snapshot --size 2G --name boutique-snap vgdata/boutique',
          indices: ['lvcreate avec une option d’instantané.', '-s, -L, -n.', 'La source en dernier.'],
          solution: '```\n# lvcreate -s -L 2G -n boutique-snap vgdata/boutique\n# lvs vgdata\n```',
        },
        {
          id: 'cA5-02-02', type: 'qcm', niveau: 2,
          enonce: 'Pourquoi faut-il l’option `nouuid` pour monter l’instantané d’un volume XFS déjà monté ?',
          choix: [
            'L’instantané a le même UUID que l’original, et XFS refuse de monter deux fois le même UUID',
            'Les instantanés n’ont pas d’UUID',
            'nouuid accélère le montage',
            'Sans nouuid, l’instantané serait modifié',
          ],
          reponse: 0,
          indices: ['Un instantané est une copie bloc à bloc.', 'L’UUID est dans le superbloc.', 'XFS vérifie l’unicité.'],
          solution: 'L’instantané est une copie exacte, UUID compris. XFS refuse le doublon ; `nouuid` lève ce contrôle pour ce montage. Monte-le aussi en `ro` pour une sauvegarde.',
        },
        {
          id: 'cA5-02-03', type: 'ordre', niveau: 2,
          enonce: 'Le disque `/dev/sdb` du groupe `vgdata` montre des erreurs. Remets dans l’ordre son remplacement **sans arrêter** la boutique.',
          elements: ['pvcreate /dev/sdd', 'vgextend vgdata /dev/sdd', 'pvmove /dev/sdb /dev/sdd', 'vgreduce vgdata /dev/sdb', 'pvremove /dev/sdb'],
          indices: ['Préparer le nouveau disque.', 'L’ajouter au groupe, déplacer les données.', 'Retirer l’ancien du groupe, puis effacer son étiquette LVM.'],
          solution: 'pvcreate → vgextend → pvmove → vgreduce → pvremove. Les volumes restent montés pendant pvmove.',
        },
        {
          id: 'cA5-02-04', type: 'commande', niveau: 1,
          enonce: 'Agrandis de 5 Gio le volume `vgdata/boutique` **et** son système de fichiers, en une commande.',
          accepte: ['(sudo )?lvextend -r -L \\+5G vgdata/boutique', '(sudo )?lvextend -L \\+5G -r vgdata/boutique', '(sudo )?lvextend --resizefs (-L|--size) \\+5G vgdata/boutique', '(sudo )?lvextend (-L|--size) \\+5G --resizefs vgdata/boutique', '(sudo )?lvextend -r -L \\+5G /dev/vgdata/boutique', '(sudo )?lvresize -r -L \\+5G vgdata/boutique'],
          exemple: 'lvextend -r -L +5G vgdata/boutique',
          indices: ['lvextend.', '-L +5G pour ajouter.', '-r pour le système de fichiers.'],
          solution: '```\n# lvextend -r -L +5G vgdata/boutique\n```',
        },
        {
          id: 'cA5-02-05', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un instantané LVM qui se remplit complètement devient inutilisable.', vrai: true },
            { texte: 'Avec des volumes fins, la somme des tailles annoncées peut dépasser la taille du pool.', vrai: true },
            { texte: 'pvmove impose de démonter les volumes concernés.', vrai: false },
            { texte: '`lvconvert --merge` ramène un volume à l’état de son instantané.', vrai: true },
          ],
          indices: ['Copie sur écriture, place limitée.', 'Une seule fausse.', 'pvmove marche à chaud.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A5.3',
      titre: 'Chiffrement avec LUKS',
      objectif: 'Chiffrer un volume de données et l’ouvrir automatiquement au démarrage.',
      rappel: `
        **LUKS** (avec **dm-crypt** dans le noyau) chiffre un périphérique bloc. Au-dessus, on obtient un
        périphérique **déchiffré** \`/dev/mapper/NOM\`, sur lequel on crée un système de fichiers (ou un PV LVM).
        Il protège les données **au repos** (disque volé, VM copiée) ; une fois ouvert, le volume est lisible
        comme n’importe quel autre.

        \`\`\`
        # cryptsetup luksFormat /dev/sdd            # EFFACE le disque ; demande une phrase secrète
        # cryptsetup open /dev/sdd coffre           # → /dev/mapper/coffre
        # mkfs.ext4 /dev/mapper/coffre
        # mount /dev/mapper/coffre /srv/compta
        # umount /srv/compta ; cryptsetup close coffre
        # cryptsetup luksDump /dev/sdd              # version (LUKS2), algorithmes, emplacements de clés
        \`\`\`

        **Plusieurs clés** : LUKS a des emplacements (*keyslots*) : une phrase pour l’humain, un fichier de clé
        pour l’automatisme, une clé de secours.

        \`\`\`
        # dd if=/dev/urandom of=/root/coffre.cle bs=64 count=1 ; chmod 400 /root/coffre.cle
        # cryptsetup luksAddKey /dev/sdd /root/coffre.cle
        # cryptsetup luksHeaderBackup /dev/sdd --header-backup-file /root/coffre-entete.img   # à mettre en lieu sûr
        \`\`\`

        **Au démarrage** : \`/etc/crypttab\` ouvre le volume, \`/etc/fstab\` le monte.

        \`\`\`
        # /etc/crypttab : nom  périphérique  clé  options
        coffre  UUID=…(blkid /dev/sdd)…  /root/coffre.cle  luks
        # /etc/fstab
        /dev/mapper/coffre  /srv/compta  ext4  defaults,nofail  0 2
        \`\`\`

        Sans fichier de clé (\`none\`), la phrase est demandée sur la console au démarrage. Perdre toutes les
        clés **et** l’en-tête = données perdues pour toujours.
      `,
      aRetenir: [
        'LUKS/dm-crypt : données au repos ; `/dev/mapper/NOM` une fois ouvert.',
        '`cryptsetup luksFormat`, `open`, `close`, `luksDump`, `luksAddKey`, `luksHeaderBackup`.',
        '/etc/crypttab (nom, UUID, clé ou none, luks) + /etc/fstab sur /dev/mapper/NOM.',
        'Sauvegarder l’en-tête et une clé de secours.',
      ],
      exercices: [
        {
          id: 'cA5-03-01', type: 'ordre', niveau: 1,
          enonce: 'Remets dans l’ordre la mise en service d’un volume chiffré sur `/dev/sdd`.',
          elements: ['cryptsetup luksFormat /dev/sdd', 'cryptsetup open /dev/sdd coffre', 'mkfs.ext4 /dev/mapper/coffre', 'mount /dev/mapper/coffre /srv/compta'],
          indices: ['Formater en LUKS d’abord.', 'Ouvrir pour obtenir /dev/mapper/coffre.', 'Système de fichiers sur le périphérique déchiffré.'],
          solution: 'luksFormat → open → mkfs sur /dev/mapper/coffre → mount.',
        },
        {
          id: 'cA5-03-02', type: 'commande', niveau: 1,
          enonce: 'Ouvre le volume LUKS `/dev/sdd` sous le nom `coffre`.',
          accepte: ['(sudo )?cryptsetup open /dev/sdd coffre', '(sudo )?cryptsetup luksOpen /dev/sdd coffre', '(sudo )?cryptsetup open --type luks2? /dev/sdd coffre'],
          exemple: 'cryptsetup open /dev/sdd coffre',
          indices: ['cryptsetup.', 'Sous-commande open (ou luksOpen).', 'Le périphérique, puis le nom.'],
          solution: '```\n# cryptsetup open /dev/sdd coffre\nEnter passphrase for /dev/sdd:\n# ls -l /dev/mapper/coffre\n```',
        },
        {
          id: 'cA5-03-03', type: 'trous', niveau: 2,
          enonce: 'Complète la ligne de `/etc/crypttab` qui ouvre le volume au démarrage sous le nom `coffre`, avec le fichier de clé `/root/coffre.cle`.',
          texte: '[[1]]  UUID=5a3e…  [[2]]  [[3]]',
          trous: [{ accepte: ['coffre'], exemple: 'coffre' }, { accepte: ['/root/coffre\\.cle'], exemple: '/root/coffre.cle' }, { accepte: ['luks', 'luks,[a-z,=-]+'], exemple: 'luks' }],
          indices: ['Le nom du périphérique déchiffré.', 'Le fichier de clé.', 'Le type de chiffrement en option.'],
          solution: '```\ncoffre  UUID=5a3e…  /root/coffre.cle  luks\n```\nPuis dans fstab : `/dev/mapper/coffre /srv/compta ext4 defaults,nofail 0 2`.',
        },
        {
          id: 'cA5-03-04', type: 'commande', niveau: 2,
          enonce: 'Sauvegarde l’en-tête LUKS de `/dev/sdd` dans `/root/coffre-entete.img`.',
          accepte: ['(sudo )?cryptsetup luksHeaderBackup /dev/sdd --header-backup-file /root/coffre-entete\\.img', '(sudo )?cryptsetup luksHeaderBackup --header-backup-file /root/coffre-entete\\.img /dev/sdd'],
          exemple: 'cryptsetup luksHeaderBackup /dev/sdd --header-backup-file /root/coffre-entete.img',
          indices: ['Sous-commande luksHeaderBackup.', 'Option --header-backup-file.', 'Le périphérique et le fichier.'],
          solution: '```\n# cryptsetup luksHeaderBackup /dev/sdd --header-backup-file /root/coffre-entete.img\n```\nÀ copier hors de la machine : un en-tête abîmé rend le volume illisible, même avec la bonne phrase.',
        },
        {
          id: 'cA5-03-05', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un volume LUKS ouvert protège les données contre un utilisateur root de la machine.', vrai: false, explication: 'Une fois ouvert, il est lisible comme un disque ordinaire.' },
            { texte: 'LUKS permet plusieurs clés (emplacements) pour le même volume.', vrai: true },
            { texte: '`cryptsetup luksFormat` efface le contenu du périphérique.', vrai: true },
            { texte: 'L’option nofail dans fstab évite de bloquer le démarrage si le volume ne s’ouvre pas.', vrai: true },
          ],
          indices: ['Au repos contre en fonctionnement.', 'Une seule fausse.', 'Formater = effacer.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A5.4',
      titre: 'Empiler les couches et les diagnostiquer',
      objectif: 'Lire une pile disque → RAID → LUKS → LVM → système de fichiers, et en garder les clés.',
      rappel: `
        Une pile courante sur un serveur : **disques → RAID → LUKS → LVM → systèmes de fichiers**. On chiffre
        **au-dessus** du RAID (une seule ouverture) et **sous** LVM (tous les volumes protégés d’un coup).

        \`\`\`
        $ lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS
        sdb                10G disk  linux_raid_member
        └─md0              10G raid1 crypto_LUKS
          └─coffre         10G crypt LVM2_member
            ├─vgsur-compta  4G lvm   ext4        /srv/compta
            └─vgsur-arch    6G lvm   xfs         /srv/archives
        sdc                10G disk  linux_raid_member
        └─md0 …
        $ lsblk -f ; blkid ; dmsetup ls --tree
        \`\`\`

        **Ordre au démarrage** : assemblage du RAID (mdadm.conf), ouverture LUKS (crypttab), activation LVM,
        montages (fstab). Après une modification de mdadm.conf ou crypttab pour le volume racine : régénérer
        l’**initramfs** (\`update-initramfs -u\` ou \`dracut -f\`, chapitre 6).

        **Garder les métadonnées** de chaque couche, hors de la machine :

        | Couche | Sauvegarde |
        |---|---|
        | RAID | \`mdadm --detail --scan\` |
        | LUKS | \`cryptsetup luksHeaderBackup\` + clé de secours |
        | LVM | \`vgcfgbackup\` (automatique dans \`/etc/lvm/backup\`), restauration \`vgcfgrestore\` |
        | Partitions | \`sfdisk -d /dev/sdb > sdb.part\` |

        **Santé des disques** : \`smartctl -H -a /dev/sdb\` (paquet smartmontools ; peu utile sur un disque
        virtuel, essentiel sur du matériel réel), et \`dmesg\` pour les erreurs d’entrée-sortie.
      `,
      aRetenir: [
        'Pile type : disques → RAID → LUKS → LVM → FS ; `lsblk -o NAME,TYPE,FSTYPE,MOUNTPOINTS`, `dmsetup ls --tree`.',
        'Démarrage : mdadm.conf → crypttab → LVM → fstab ; initramfs à régénérer pour la racine.',
        'Métadonnées : `mdadm --detail --scan`, `luksHeaderBackup`, `vgcfgbackup`, `sfdisk -d`.',
        '`smartctl -H -a` sur du matériel réel.',
      ],
      exercices: [
        {
          id: 'cA5-04-01', type: 'ordre', niveau: 2,
          enonce: 'Remets les couches dans l’ordre, du matériel vers les fichiers.',
          elements: ['Disques', 'RAID (md0)', 'LUKS (/dev/mapper/coffre)', 'LVM (vgsur)', 'Systèmes de fichiers'],
          indices: ['La redondance au plus près des disques.', 'Le chiffrement juste au-dessus.', 'LVM découpe le volume déchiffré.'],
          solution: 'Disques → RAID → LUKS → LVM → systèmes de fichiers.',
        },
        {
          id: 'cA5-04-02', type: 'commande', niveau: 1,
          enonce: 'Affiche l’arbre des périphériques bloc avec le type de système de fichiers de chacun (une option courte de lsblk).',
          accepte: ['lsblk -f', 'lsblk --fs', 'lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS?', 'lsblk -o NAME,FSTYPE.*'],
          exemple: 'lsblk -f',
          indices: ['lsblk.', 'f comme filesystems.', '`lsblk -f`'],
          solution: '```\n$ lsblk -f\n```\nOn y lit linux_raid_member, crypto_LUKS, LVM2_member, ext4…',
        },
        {
          id: 'cA5-04-03', type: 'qcm', niveau: 2,
          enonce: 'Pourquoi chiffrer **au-dessus** du RAID plutôt que chaque disque séparément ?',
          choix: [
            'Une seule ouverture et un seul chiffrement des données, au lieu de chiffrer deux fois les mêmes blocs',
            'Parce que mdadm refuse les disques chiffrés',
            'Parce que LUKS ne fonctionne pas sur un disque entier',
            'Pour que le RAID soit plus rapide à reconstruire en clair',
          ],
          reponse: 0,
          indices: ['Combien de fois faudrait-il saisir la phrase ?', 'Un miroir écrit deux fois les mêmes données.', 'Simplicité et performance.'],
          solution: 'Chiffrer md0 : une seule clé, un seul chiffrement. Chiffrer chaque disque doublerait le travail et les ouvertures, sans gain de sécurité.',
        },
        {
          id: 'cA5-04-04', type: 'association', niveau: 2,
          enonce: 'Associe chaque couche à la commande qui sauvegarde ses métadonnées.',
          paires: [['RAID', '`mdadm --detail --scan`'], ['LUKS', '`cryptsetup luksHeaderBackup`'], ['LVM', '`vgcfgbackup`'], ['Table de partitions', '`sfdisk -d /dev/sdb`']],
          indices: ['md = mdadm.', 'En-tête = header.', 'vg = volume group.'],
          solution: 'RAID : mdadm --detail --scan ; LUKS : luksHeaderBackup ; LVM : vgcfgbackup ; partitions : sfdisk -d.',
        },
        {
          id: 'cA5-04-05', type: 'terminal', niveau: 3,
          enonce: 'Sur cuve, avec trois disques de lab (`ajouter-disques.sh`) : construis un miroir de deux disques, chiffre-le, crée un VG `vgsur` et un LV ext4 monté sur `/srv/compta`. Colle `lsblk -o NAME,TYPE,FSTYPE,MOUNTPOINTS`, puis simule la panne d’un disque et remplace-le par le troisième.',
          attendu: ['raid1', 'crypt', 'lvm'],
          indices: ['Repère les disques par leur numéro de série : `lsblk -o NAME,SERIAL`.', 'Ordre : mdadm, cryptsetup, pvcreate/vgcreate/lvcreate, mkfs, mount.', 'Pendant la reconstruction, le volume reste monté.'],
          solution: 'L’arbre montre `raid1` → `crypt` → `lvm` → `/srv/compta`. Après `--fail`/`--remove`/`--add`, `/proc/mdstat` montre la reconstruction puis `[UU]` : l’application n’a rien vu.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Niveaux de RAID ?', r: '0 aucune tolérance ; 1 miroir ; 5 une panne ; 6 deux pannes ; 10 miroirs répartis.' },
    { q: 'Créer un miroir ?', r: '`mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sdb /dev/sdc`' },
    { q: 'État d’un RAID ?', r: '`cat /proc/mdstat` ([UU] / [U_]) ; `mdadm --detail /dev/md0`.' },
    { q: 'Remplacer un disque RAID ?', r: '`--fail`, `--remove`, `--add`.' },
    { q: 'Instantané LVM ?', r: '`lvcreate -s -L 2G -n snap vg/lv` ; monter ro,nouuid (XFS).' },
    { q: 'Changer de disque à chaud (LVM) ?', r: 'pvcreate, vgextend, pvmove, vgreduce, pvremove.' },
    { q: 'Chiffrer un volume ?', r: '`cryptsetup luksFormat`, `open DEV nom`, mkfs sur /dev/mapper/nom.' },
    { q: 'Ouvrir au démarrage ?', r: '/etc/crypttab (`nom UUID=… clé luks`) + fstab sur /dev/mapper/nom.' },
    { q: 'Ne pas perdre un volume LUKS ?', r: '`luksHeaderBackup` + clé de secours (`luksAddKey`), hors de la machine.' },
    { q: 'Le RAID est-il une sauvegarde ?', r: 'Non : il recopie aussi les suppressions et les corruptions.' },
  ],
  memo: `
    ### RAID (mdadm)
    \`\`\`
    mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sdb /dev/sdc   cat /proc/mdstat   mdadm --detail /dev/md0
    mdadm --detail --scan >> /etc/mdadm/mdadm.conf (Rocky : /etc/mdadm.conf) ; update-initramfs -u | dracut -f
    mdadm /dev/md0 --fail /dev/sdc --remove /dev/sdc ; mdadm /dev/md0 --add /dev/sdd
    \`\`\`
    ### LVM avancé
    \`\`\`
    lvcreate -s -L 2G -n snap vg/lv   mount -o ro,nouuid /dev/vg/snap /mnt   lvconvert --merge vg/snap   lvremove vg/snap
    lvcreate --type thin-pool -L 20G -n pool vg ; lvcreate --thin -V 50G -n fin vg/pool
    lvextend -r -L +5G vg/lv   vgextend vg /dev/sdd ; pvmove /dev/sdb /dev/sdd ; vgreduce vg /dev/sdb
    lvs -o +devices,seg_type   lvcreate --type raid1 -m 1 -L 10G -n miroir vg   vgcfgbackup / vgcfgrestore
    \`\`\`
    ### LUKS
    \`\`\`
    cryptsetup luksFormat /dev/sdd   cryptsetup open /dev/sdd coffre   cryptsetup close coffre   cryptsetup luksDump /dev/sdd
    cryptsetup luksAddKey /dev/sdd /root/coffre.cle   cryptsetup luksHeaderBackup /dev/sdd --header-backup-file F
    /etc/crypttab : coffre UUID=… /root/coffre.cle luks     /etc/fstab : /dev/mapper/coffre /srv/compta ext4 defaults,nofail 0 2
    \`\`\`
    ### Diagnostic
    \`\`\`
    lsblk -f   lsblk -o NAME,TYPE,FSTYPE,MOUNTPOINTS,SERIAL   dmsetup ls --tree   blkid   smartctl -H -a /dev/sdb   dmesg
    \`\`\`
  `,
});
