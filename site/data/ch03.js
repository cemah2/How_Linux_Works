/* Chapitre 3 : Devices (livre p. 47–68). */
HLW.chapitre({
  id: '03',
  num: 3,
  intro: `
    Le noyau présente presque tout le matériel sous forme de **fichiers** : écrire dans un fichier de \`/dev\`,
    c’est parler à un pilote. Ce chapitre t’apprend à lire ces fichiers, à retrouver un périphérique dans
    l’arborescence **sysfs**, à copier des données brutes avec \`dd\`, à reconnaître les noms des disques et des
    terminaux, à comprendre comment **udev** crée tout cela au démarrage, et comment le sous-système **SCSI**
    unifie disques SATA, clés USB… et les disques virtuels de tes VM Proxmox.

    Tes VM sont un excellent terrain : leurs disques sont branchés sur un contrôleur **virtio-scsi**, le lecteur
    cloud-init est un CD-ROM IDE, et la console Proxmox passe par un **port série**. Tout ce que décrit le livre est là.
  `,
  objectifs: [
    'reconnaître un périphérique bloc, caractère, tube ou socket dans `ls -l` et lire ses numéros majeur et mineur ;',
    'retrouver le chemin sysfs d’un périphérique et y lire des informations ;',
    'utiliser `dd` sans danger pour copier ou créer des données brutes ;',
    'nommer les principaux périphériques (`sd`, `vd`, `nvme`, `sr`, `tty`, `pts`, `ttyS`…) ;',
    'expliquer le rôle de devtmpfs et d’udev, lire et écrire une règle udev simple ;',
    'lire la sortie de `lsscsi` et situer un disque dans les couches SCSI du noyau.',
  ],
  certifs: { lpic1: ['101.1'], lfcs: ['STO'], rhcsa: ['R5'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '3.1',
      titre: 'Les fichiers de périphériques',
      sections: '§3.1', pages: '48–49',
      objectif: 'Lire `ls -l /dev` et comprendre ce qu’un fichier de périphérique représente.',
      rappel: `
        Un **fichier de périphérique** (*device file*, ou *device node*) donne accès à un pilote du noyau avec les outils
        ordinaires : \`cat\`, des redirections, \`dd\`… Il ne contient aucune donnée sur le disque : c’est une porte vers le noyau.

        \`\`\`
        $ echo bla bla > /dev/null        # le pilote de /dev/null jette tout ce qu’on lui écrit
        $ ls -l /dev/null /dev/sda /dev/sda1 /dev/tty1
        crw-rw-rw- 1 root root 1, 3 … /dev/null
        brw-rw---- 1 root disk 8, 0 … /dev/sda
        brw-rw---- 1 root disk 8, 1 … /dev/sda1
        crw--w---- 1 root tty  4, 1 … /dev/tty1
        \`\`\`

        ### Le premier caractère : le type

        | Lettre | Type | Accès | Exemples |
        |---|---|---|---|
        | \`b\` | **bloc** | par blocs de taille fixe, accès aléatoire possible, taille connue | disques, partitions |
        | \`c\` | **caractère** | flux d’octets, pas de taille ni de position | terminaux, \`/dev/null\`, \`/dev/random\` |
        | \`p\` | **tube nommé** (FIFO) | deux processus communiquent par ce fichier | souvent dans \`/run\` |
        | \`s\` | **socket** | interface de communication entre processus (chapitre 10) | \`/run/systemd/journal/socket\` |

        (Tu connais déjà \`-\` fichier ordinaire, \`d\` répertoire, \`l\` lien symbolique : fiche 2.11.)

        ### Numéros majeur et mineur

        À la place de la taille, \`ls -l\` affiche deux nombres : le **majeur** désigne le **pilote** (8 = disques SCSI),
        le **mineur** désigne l’**instance** pour ce pilote (0 = premier disque entier, 1 = sa première partition,
        16 = le deuxième disque…). C’est grâce à ces numéros que le noyau sait à quel pilote transmettre les opérations.

        Tous les périphériques n’ont pas de fichier : les **interfaces réseau**, par exemple, n’en ont pas (chapitre 9).
      `,
      aRetenir: [
        '`b` bloc (disques), `c` caractère (terminaux, /dev/null), `p` tube nommé, `s` socket.',
        'Majeur = pilote, mineur = instance (`8, 0` = sda ; `8, 1` = sda1).',
        'Un fichier de périphérique ne stocke rien : c’est une porte vers un pilote.',
        'Les interfaces réseau n’ont pas de fichier dans `/dev`.',
      ],
      exercices: [
        {
          id: 'c03-01-01', type: 'association', niveau: 1, ref: '§3.1, p. 48–49',
          enonce: 'Associe le premier caractère du mode à son type de fichier.',
          paires: [
            ['`b`', 'Périphérique bloc'],
            ['`c`', 'Périphérique caractère'],
            ['`p`', 'Tube nommé (FIFO)'],
            ['`s`', 'Socket'],
          ],
          indices: ['b comme *block*, c comme *character*.', 'p comme *pipe*.', 's comme *socket*.'],
          solution: '`b` bloc, `c` caractère, `p` tube nommé, `s` socket.',
        },
        {
          id: 'c03-01-02', type: 'qcm', niveau: 1, ref: '§3.1, p. 49',
          enonce: 'Quelle affirmation décrit le mieux un périphérique **bloc** ?',
          choix: [
            'On y accède par blocs de taille fixe, à n’importe quelle position, et sa taille totale est connue',
            'On y lit un flux d’octets sans notion de position ni de taille',
            'C’est un canal de communication entre deux processus',
            'C’est un fichier ordinaire qui contient des blocs de données',
          ],
          reponse: 0,
          indices: ['Pense à un disque.', 'On peut sauter directement au 1 000 000ᵉ bloc d’un disque.', 'Taille fixe, accès aléatoire, taille connue.'],
          solution: 'Un périphérique bloc (disque, partition) se lit par blocs, avec accès aléatoire, et a une taille connue. Un périphérique caractère (terminal, `/dev/random`) est un simple flux.',
        },
        {
          id: 'c03-01-03', type: 'association', niveau: 2, ref: '§3.1, p. 49',
          enonce: 'Associe chaque fichier à son couple majeur, mineur (sur une VM avec deux disques SCSI).',
          paires: [
            ['`/dev/sda`', '8, 0'],
            ['`/dev/sda1`', '8, 1'],
            ['`/dev/sdb`', '8, 16'],
            ['`/dev/null`', '1, 3'],
          ],
          indices: ['Les disques SCSI ont le majeur 8.', 'Chaque disque réserve 16 mineurs : le disque entier puis ses partitions.', 'Le deuxième disque commence donc au mineur 16.'],
          solution: 'Majeur 8 pour les disques SCSI : `sda` = 0, `sda1` = 1, …, `sdb` = 16. `/dev/null` dépend du pilote « mémoire » (majeur 1, mineur 3).',
        },
        {
          id: 'c03-01-04', type: 'vrai-faux', niveau: 1, ref: '§3.1, p. 48–49',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un fichier de périphérique contient les données du disque qu’il représente.', vrai: false, explication: 'Il ne contient rien : il relie le chemin à un pilote via ses numéros majeur et mineur.' },
            { texte: 'L’interface réseau `eth0` a un fichier `/dev/eth0`.', vrai: false, explication: 'Les interfaces réseau n’ont pas de fichier de périphérique.' },
            { texte: 'Le numéro majeur identifie le pilote concerné.', vrai: true },
            { texte: 'On peut écrire dans `/dev/null` avec une simple redirection.', vrai: true },
          ],
          indices: ['Un fichier de périphérique est une porte, pas un conteneur.', 'Le réseau est un cas à part.', 'Deux vraies, deux fausses.'],
          solution: 'Faux, faux, vrai, vrai.',
        },
        {
          id: 'c03-01-05', type: 'commande', niveau: 1,
          enonce: 'Affiche en format long **uniquement** les fichiers de `/dev` dont le nom commence par `sd`.',
          accepte: ['ls -l /dev/sd\\*', 'ls -la /dev/sd\\*', 'ls -al /dev/sd\\*', 'ls -l /dev/sd\\?\\*', 'ls -ld /dev/sd\\*'],
          exemple: 'ls -l /dev/sd*',
          indices: ['C’est `ls -l` avec un joker.', 'Le joker désigne tout ce qui commence par `sd` dans `/dev`.', '`ls -l /dev/sd*`'],
          solution: '```\n$ ls -l /dev/sd*\nbrw-rw---- 1 root disk 8, 0 … /dev/sda\nbrw-rw---- 1 root disk 8, 1 … /dev/sda1\n…\n```\nTous commencent par `b` et appartiennent au groupe `disk`.',
        },
        {
          id: 'c03-01-06', type: 'terminal', niveau: 2,
          enonce: 'Sur ta VM, lance `ls -l /dev/null /dev/zero /dev/urandom /dev/sda /dev/sr0 /dev/ttyS0` et colle la sortie. Quels sont des périphériques caractère, lesquels sont des périphériques bloc ?',
          attendu: ['^c.*/dev/null', '^b.*/dev/sda'],
          indices: ['Regarde la toute première lettre de chaque ligne.', '`/dev/sr0` est le lecteur CD-ROM virtuel de cloud-init.', '`/dev/ttyS0` est le port série de la console Proxmox.'],
          solution: '`/dev/null`, `/dev/zero`, `/dev/urandom` et `/dev/ttyS0` sont des périphériques **caractère** ; `/dev/sda` (le disque) et `/dev/sr0` (le CD-ROM cloud-init) sont des périphériques **bloc**. Remarque les majeurs : 1 pour les pseudo-périphériques mémoire, 8 pour sda, 11 pour sr0, 4 pour ttyS0.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '3.2',
      titre: 'Le chemin sysfs',
      sections: '§3.2', pages: '49–50',
      objectif: 'Retrouver un périphérique dans `/sys` et y lire des informations.',
      rappel: `
        Les noms de \`/dev\` sont pratiques, mais ils ne disent rien du matériel : à quel contrôleur le disque est-il
        branché ? Quelle est sa taille ? Pour cela, le noyau expose une vue structurée de ses périphériques :
        le système de fichiers virtuel **sysfs**, monté sur \`/sys\`.

        | Répertoire | Contenu |
        |---|---|
        | \`/sys/devices\` | l’arborescence **réelle** des périphériques, telle que le matériel est câblé (bus PCI, contrôleur, disque…) |
        | \`/sys/block\` | des liens vers les périphériques bloc |
        | \`/sys/class\` | des liens par catégorie : \`net\`, \`tty\`, \`input\`… |
        | \`/sys/bus\`, \`/sys/dev\` | par bus, et par numéros majeur:mineur |

        \`\`\`
        $ udevadm info --query=path --name=/dev/sda
        /devices/pci0000:00/0000:00:05.0/virtio1/host2/target2:0:0/2:0:0:0/block/sda
        $ ls /sys/block/sda
        dev  device  holders  queue  removable  sda1  size  …
        $ cat /sys/block/sda/dev        # majeur:mineur
        8:0
        $ cat /sys/block/sda/size       # taille en secteurs de 512 octets
        33554432
        \`\`\`

        Les fichiers de sysfs servent surtout aux **programmes** (udev, outils de diagnostic), pas à la lecture humaine.
        Mais on y trouve des réponses précises, et certains réglages s’y modifient à chaud.

        Distinction essentielle : \`/dev\` sert à **utiliser** un périphérique ; \`/sys\` sert à le **décrire** et le **configurer**.
      `,
      aRetenir: [
        '`/sys/devices` : l’arborescence réelle du matériel ; `/sys/block`, `/sys/class` : des raccourcis.',
        '`udevadm info --query=path --name=/dev/sda` donne le chemin sysfs.',
        '`/sys/block/sda/size` est en secteurs de 512 octets.',
        '`/dev` pour utiliser, `/sys` pour décrire et régler.',
      ],
      exercices: [
        {
          id: 'c03-02-01', type: 'qcm', niveau: 1, ref: '§3.2, p. 49',
          enonce: 'Quel répertoire contient l’arborescence **réelle** des périphériques, telle que le matériel est organisé ?',
          choix: ['`/sys/devices`', '`/sys/block`', '`/dev`', '`/proc/devices`'],
          reponse: 0,
          indices: ['C’est sous `/sys`.', '`/sys/block` ne contient que des liens.', 'Le nom du répertoire est le mot anglais pour « périphériques ».'],
          solution: '`/sys/devices`. `/sys/block` et `/sys/class` ne contiennent que des liens symboliques vers lui.',
        },
        {
          id: 'c03-02-02', type: 'commande', niveau: 2, ref: '§3.2, p. 50',
          enonce: 'Affiche le **chemin sysfs** du périphérique `/dev/sda` avec `udevadm`.',
          accepte: ['udevadm info (--query=path|-q path|-q ?path) (--name=|-n ?)/dev/sda', 'udevadm info (--name=|-n ?)/dev/sda (--query=path|-q path|-q ?path)'],
          exemple: 'udevadm info --query=path --name=/dev/sda',
          indices: ['L’outil d’interrogation d’udev s’appelle `udevadm`.', 'Sous-commande `info`, avec une requête de type `path`.', '`udevadm info --query=path --name=/dev/sda`'],
          solution: '```\n$ udevadm info --query=path --name=/dev/sda\n/devices/pci0000:00/0000:00:05.0/virtio1/host2/target2:0:0/2:0:0:0/block/sda\n```\nOn lit le câblage : bus PCI → contrôleur virtio-scsi → hôte SCSI 2 → cible 0 → disque `sda`. Ajoute `/sys` devant pour le visiter.',
        },
        {
          id: 'c03-02-03', type: 'reponse-courte', niveau: 2,
          enonce: '`cat /sys/block/sdb/size` affiche `8388608`. Quelle est la taille du disque en **Gio** ? (un nombre)',
          accepte: ['4', '4 ?gio', '4 ?gib', '4 ?go'],
          indices: ['L’unité est le secteur de 512 octets.', '8 388 608 × 512 octets = ?', '1 Gio = 1 073 741 824 octets.'],
          solution: '8 388 608 × 512 = 4 294 967 296 octets = **4 Gio**. `lsblk` fait ce calcul pour toi.',
        },
        {
          id: 'c03-02-04', type: 'sortie', niveau: 1,
          enonce: 'Qu’affiche cette commande sur une VM dont le premier disque est `/dev/sda` ?\n\n```\n$ cat /sys/block/sda/dev\n```',
          attendu: '8:0',
          indices: ['Le fichier `dev` contient les numéros du fichier de périphérique.', 'Format : majeur:mineur.', 'Rappelle-toi `ls -l /dev/sda` (fiche 3.1).'],
          solution: '```\n8:0\n```\nC’est grâce à ce fichier qu’udev sait quels numéros donner au fichier `/dev/sda` qu’il crée.',
        },
        {
          id: 'c03-02-05', type: 'vrai-faux', niveau: 1, ref: '§3.2, p. 49–50',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`/sys` est un système de fichiers virtuel fourni par le noyau, pas des fichiers stockés sur disque.', vrai: true },
            { texte: 'Les fichiers de `/sys` sont conçus avant tout pour être lus par des humains.', vrai: false, explication: 'Ils servent surtout aux programmes (udev, outils) ; d’où leur format minimaliste.' },
            { texte: '`/sys/class/net` liste les interfaces réseau, alors qu’elles n’ont pas de fichier dans `/dev`.', vrai: true },
            { texte: 'On utilise `/sys/block/sda` pour lire et écrire des données sur le disque.', vrai: false, explication: 'Pour les données, c’est `/dev/sda`. `/sys` décrit et règle.' },
          ],
          indices: ['/dev pour utiliser, /sys pour décrire.', 'Le réseau a bien une place dans /sys.', 'Deux vraies, deux fausses.'],
          solution: 'Vrai, faux, vrai, faux.',
        },
        {
          id: 'c03-02-06', type: 'terminal', niveau: 2,
          enonce: 'Sur ta VM, lance `ls /sys/class/net` puis `cat /sys/block/sda/queue/rotational`. Colle la sortie. Que signifie la valeur `0` ou `1` du second fichier ?',
          attendu: ['lo'],
          indices: ['La première commande liste les interfaces réseau vues par le noyau.', '`rotational` vaut 1 pour un disque à plateaux.', 'Tes modèles Proxmox ont l’option `ssd=1` sur le disque.'],
          solution: 'Tu vois `lo` et ton interface (souvent `eth0` ou `ens18`). `rotational` vaut **0** : le noyau croit avoir affaire à un SSD, parce que le disque virtuel est déclaré avec `ssd=1` dans Proxmox. Le noyau adapte alors l’ordonnancement des entrées-sorties.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '3.3',
      titre: 'dd : copier des données brutes',
      sections: '§3.3', pages: '50–51',
      objectif: 'Utiliser `dd` pour copier des blocs entre fichiers et périphériques, sans catastrophe.',
      rappel: `
        \`dd\` lit un fichier (ou un périphérique) et en écrit le contenu ailleurs, **bloc par bloc**, sans se soucier
        de systèmes de fichiers. Sa syntaxe vient d’un vieux langage IBM : \`option=valeur\`, sans tiret.

        | Option | Rôle |
        |---|---|
        | \`if=\` | fichier d’entrée (défaut : entrée standard) |
        | \`of=\` | fichier de sortie (défaut : sortie standard) |
        | \`bs=\` | taille de bloc, en lecture **et** en écriture (\`512\`, \`4k\`, \`1M\`…) |
        | \`ibs=\` / \`obs=\` | tailles de bloc séparées en lecture / en écriture |
        | \`count=\` | nombre de blocs à copier (sinon : jusqu’à la fin) |
        | \`skip=\` | blocs à **sauter** au début de l’entrée |
        | \`seek=\` | blocs à sauter au début de la **sortie** |
        | \`status=progress\` | afficher la progression (GNU dd) |
        | \`conv=fsync\` | forcer l’écriture physique avant de terminer |

        \`\`\`
        $ dd if=/dev/zero of=fichier-vide bs=1M count=100       # fichier de 100 Mio de zéros
        # dd if=/dev/sda of=mbr.bin bs=512 count=1              # sauvegarder le 1er secteur (MBR)
        # dd if=debian.iso of=/dev/sdc bs=4M status=progress    # écrire une image sur une clé USB
        \`\`\`

        > **Danger.** \`dd\` ne demande jamais confirmation. Inverser \`if\` et \`of\`, ou se tromper de disque
        > (\`sdb\` au lieu de \`sdc\`), efface des données sans retour possible. Vérifie le nom du périphérique avec
        > \`lsblk\` juste avant, relis la commande, et travaille sur une VM avec un instantané.
      `,
      aRetenir: [
        '`dd if=source of=destination bs=taille count=nombre`.',
        '`skip` saute en entrée, `seek` saute en sortie.',
        '`/dev/zero` comme source pour créer un fichier de taille donnée.',
        'Aucune confirmation : vérifier le disque avec `lsblk`, relire, instantané.',
      ],
      exercices: [
        {
          id: 'c03-03-01', type: 'commande', niveau: 1, ref: '§3.3, p. 50',
          enonce: 'Crée un fichier `test.img` de **10 Mio** rempli de zéros avec `dd` (blocs de 1 Mio).',
          accepte: ['dd if=/dev/zero of=test\\.img bs=1M count=10( status=progress)?', 'dd of=test\\.img if=/dev/zero bs=1M count=10( status=progress)?', 'dd if=/dev/zero of=test\\.img count=10 bs=1M', 'dd if=/dev/zero bs=1M count=10 of=test\\.img', 'dd bs=1M count=10 if=/dev/zero of=test\\.img'],
          exemple: 'dd if=/dev/zero of=test.img bs=1M count=10',
          pieges: [{ motif: 'dd if=test\\.img of=/dev/zero.*', message: 'Entrée et sortie inversées : `if` est la source (/dev/zero), `of` la destination.' }],
          indices: ['La source de zéros est un pseudo-périphérique.', '`if=/dev/zero of=test.img`', 'Taille de bloc 1M, 10 blocs.'],
          solution: '```\n$ dd if=/dev/zero of=test.img bs=1M count=10\n10+0 records in\n10+0 records out\n10485760 bytes (10 MB, 10 MiB) copied\n```\n« 10+0 records » : 10 blocs complets, 0 bloc partiel.',
        },
        {
          id: 'c03-03-02', type: 'commande', niveau: 2,
          enonce: 'Sauvegarde le **premier secteur** (512 octets) du disque `/dev/sda` dans le fichier `mbr.bin` (en root).',
          accepte: ['(sudo )?dd if=/dev/sda of=mbr\\.bin bs=512 count=1', '(sudo )?dd if=/dev/sda of=mbr\\.bin count=1( bs=512)?', '(sudo )?dd if=/dev/sda bs=512 count=1 of=mbr\\.bin', '(sudo )?dd of=mbr\\.bin if=/dev/sda bs=512 count=1'],
          exemple: 'dd if=/dev/sda of=mbr.bin bs=512 count=1',
          pieges: [{ motif: '(sudo )?dd if=mbr\\.bin of=/dev/sda.*', message: 'STOP : ceci écrirait le fichier SUR le disque. La source (`if`) doit être le disque.' }],
          indices: ['La source est le disque, la destination un fichier.', 'Un seul bloc de 512 octets.', '`bs=512 count=1`'],
          solution: '```\n# dd if=/dev/sda of=mbr.bin bs=512 count=1\n```\n(512 est d’ailleurs la taille de bloc par défaut de dd.) Ce secteur contient le chargeur et la table de partitions MBR, ou la protection MBR d’un disque GPT (chapitre 4).',
        },
        {
          id: 'c03-03-03', type: 'association', niveau: 1, ref: '§3.3, p. 50–51',
          enonce: 'Associe chaque option de `dd` à son rôle.',
          paires: [
            ['`if=`', 'Fichier ou périphérique d’entrée'],
            ['`of=`', 'Fichier ou périphérique de sortie'],
            ['`bs=`', 'Taille de bloc en lecture et en écriture'],
            ['`count=`', 'Nombre de blocs à copier'],
            ['`skip=`', 'Blocs à sauter au début de l’entrée'],
            ['`seek=`', 'Blocs à sauter au début de la sortie'],
          ],
          indices: ['if = *input file*, of = *output file*.', 'bs = *block size*.', '*skip* (sauter) concerne l’entrée, *seek* (chercher une position) la sortie.'],
          solution: 'if/of : entrée/sortie ; bs : taille de bloc ; count : nombre de blocs ; skip : saut en entrée ; seek : saut en sortie.',
        },
        {
          id: 'c03-03-04', type: 'reponse-courte', niveau: 2,
          enonce: 'Combien d’octets copie `dd if=/dev/zero of=f bs=4k count=3` ? (un nombre)',
          accepte: ['12288', '12 288'],
          indices: ['4k = 4 096 octets pour dd.', 'On copie 3 blocs.', '3 × 4096.'],
          solution: '3 × 4 096 = **12 288** octets. (Pour dd, `k` = 1 024 ; `kB` = 1 000.)',
        },
        {
          id: 'c03-03-05', type: 'qcm', niveau: 2, ref: '§3.3, avertissement p. 50',
          enonce: 'Tu veux écrire une image ISO sur une clé USB. Quel réflexe adoptes-tu **juste avant** de lancer `dd` ?',
          choix: [
            'Vérifier le nom exact du périphérique de la clé avec `lsblk` (taille, modèle), puis relire la commande',
            'Lancer `dd` en arrière-plan pour gagner du temps',
            'Formater d’abord la clé en ext4',
            'Ajouter l’option `-f` pour forcer',
          ],
          reponse: 0,
          indices: ['Le danger principal est de viser le mauvais disque.', 'Quelle commande liste les disques avec leur taille ?', '`lsblk`'],
          solution: 'Identifier **à coup sûr** la cible (`lsblk` : taille, modèle, présence de partitions montées), relire `if` et `of`. Formater est inutile (dd écrase tout), et `-f` n’existe pas.',
        },
        {
          id: 'c03-03-06', type: 'terminal', niveau: 2,
          enonce: 'Sur ta VM, crée un fichier de 5 Mio avec `dd` (source `/dev/urandom`), affiche sa taille avec `ls -lh`, puis copie seulement son **deuxième** Mio dans `morceau.bin` (`bs=1M skip=1 count=1`). Colle les sorties.',
          attendu: ['records (in|out)|enregistrements'],
          indices: ['`dd if=/dev/urandom of=alea.bin bs=1M count=5`', '`skip=1` saute le premier bloc de l’entrée.', 'Vérifie avec `ls -l morceau.bin` : 1 048 576 octets.'],
          solution: '```\n$ dd if=/dev/urandom of=alea.bin bs=1M count=5\n$ ls -lh alea.bin\n-rw-r--r-- 1 admin admin 5.0M … alea.bin\n$ dd if=alea.bin of=morceau.bin bs=1M skip=1 count=1\n1+0 records in\n1+0 records out\n```\n`cmp alea.bin morceau.bin --ignore-initial=1048576:0 -n 1048576` confirmerait que le contenu est identique.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '3.4',
      titre: 'Les noms des périphériques de stockage',
      sections: '§3.4 à 3.4.6, 3.4.11', pages: '51–53, 56',
      objectif: 'Reconnaître un disque, une partition, un lecteur optique ou un volume d’après son nom.',
      rappel: `
        | Nom | Désigne | Où le voir |
        |---|---|---|
        | \`/dev/sda\`, \`sdb\`… ; \`sda1\`, \`sda2\` | disques passant par le sous-système **SCSI** (SATA, USB, SAS, **virtio-scsi**) et leurs partitions | tes VM Proxmox |
        | \`/dev/vda\`, \`/dev/xvda\` | disques **virtuels** : virtio-blk (KVM) ou Xen | VM avec le contrôleur virtio-blk, certains clouds |
        | \`/dev/nvme0n1\` ; \`nvme0n1p1\` | disques **NVMe** (contrôleur 0, espace de noms 1, partition 1) | serveurs et portables récents |
        | \`/dev/dm-0\`, \`/dev/mapper/…\` | volumes du **device mapper** : LVM, chiffrement (chapitre 4) | volumes LVM de Rocky |
        | \`/dev/sr0\` | lecteurs **optiques** (CD/DVD) | le lecteur cloud-init de tes VM |
        | \`/dev/hda\` | anciens disques PATA (IDE) | quasi disparu |
        | \`/dev/loop0\` | périphériques « boucle » : un fichier vu comme un disque | images, snaps |

        Pour voir d’un coup disques, partitions et points de montage, utilise \`lsblk\` (complément au livre) :

        \`\`\`
        $ lsblk
        NAME    MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
        sda       8:0    0   16G  0 disk
        ├─sda1    8:1    0 15.9G  0 part /
        ├─sda14   8:14   0    3M  0 part
        └─sda15   8:15   0  124M  0 part /boot/efi
        sr0      11:0    1    4M  0 rom
        \`\`\`

        ### Des noms qui ne sont pas stables

        Les lettres \`sda\`, \`sdb\` sont attribuées **dans l’ordre de détection**. Ajoute un disque, change de contrôleur,
        et \`sdb\` peut devenir \`sdc\`. C’est pourquoi on désigne les systèmes de fichiers par leur **UUID** (chapitre 4)
        ou par les liens stables de \`/dev/disk/by-id\` (fiche 3.6).

        ### Créer un fichier de périphérique à la main

        \`mknod /dev/sda1 b 8 1\` crée un fichier bloc de majeur 8, mineur 1. On ne le fait presque plus jamais : udev s’en charge (fiche 3.6).
      `,
      aRetenir: [
        '`sd*` : SCSI/SATA/USB/virtio-scsi ; `vd*` : virtio-blk ; `nvme0n1p1` : NVMe ; `sr0` : optique ; `dm-*` : LVM/chiffrement.',
        'Partitions : chiffre après le disque (`sda1`), ou `p` + chiffre pour NVMe (`nvme0n1p1`).',
        'Les lettres dépendent de l’ordre de détection : utiliser les UUID.',
        '`lsblk` : vue d’ensemble des disques et partitions.',
      ],
      exercices: [
        {
          id: 'c03-04-01', type: 'association', niveau: 1, ref: '§3.4.1–3.4.5, p. 52–53',
          enonce: 'Associe chaque nom à ce qu’il désigne.',
          paires: [
            ['`/dev/sdb2`', 'Deuxième partition du deuxième disque SCSI/SATA'],
            ['`/dev/nvme0n1p3`', 'Troisième partition d’un disque NVMe'],
            ['`/dev/vda`', 'Disque virtuel virtio-blk'],
            ['`/dev/sr0`', 'Premier lecteur optique'],
            ['`/dev/mapper/vg0-home`', 'Volume logique géré par le device mapper (LVM)'],
          ],
          indices: ['La lettre après `sd` indique le disque, le chiffre la partition.', 'Pour NVMe, la partition est introduite par `p`.', '`sr` = *SCSI ROM*.'],
          solution: '`sdb2` : 2ᵉ disque, 2ᵉ partition ; `nvme0n1p3` : contrôleur 0, espace de noms 1, partition 3 ; `vda` : virtio-blk ; `sr0` : optique ; `/dev/mapper/vg0-home` : volume LVM `home` du groupe `vg0`.',
        },
        {
          id: 'c03-04-02', type: 'reponse-courte', niveau: 2, casse: true, mono: true,
          enonce: 'Quel est le nom de fichier de la **deuxième partition** du disque NVMe `/dev/nvme1n1` ? (chemin complet)',
          accepte: ['/dev/nvme1n1p2'],
          pieges: [{ motif: '/dev/nvme1n12', message: 'Pour NVMe, on insère un `p` avant le numéro de partition (sinon on confondrait avec le n° d’espace de noms).' }],
          indices: ['On part du nom du disque entier.', 'Pour les noms qui se terminent par un chiffre, on ajoute un `p` avant le numéro de partition.', '`nvme1n1` + `p2`'],
          solution: '`/dev/nvme1n1p2`. Même logique pour les cartes SD (`mmcblk0p1`) et les périphériques boucle partitionnés (`loop0p1`).',
        },
        {
          id: 'c03-04-03', type: 'commande', niveau: 1,
          enonce: 'Affiche l’arborescence des disques, de leurs partitions et de leurs points de montage.',
          accepte: ['lsblk', 'lsblk -f', 'lsblk -o \\S+', 'lsblk -a', 'lsblk -p'],
          exemple: 'lsblk',
          indices: ['« list block devices ».', 'Cinq lettres, commence par `ls`.', '`lsblk`'],
          solution: '```\n$ lsblk\n```\n`lsblk -f` ajoute le type de système de fichiers, le label et l’UUID (chapitre 4).',
        },
        {
          id: 'c03-04-04', type: 'qcm', niveau: 2, ref: '§3.4.1, p. 52',
          enonce: 'Tu ajoutes un disque à la VM `cuve` et, après redémarrage, l’ancien `/dev/sdb` s’appelle `/dev/sdc`. Que faut-il en retenir ?',
          choix: [
            'Les lettres `sdX` dépendent de l’ordre de détection : il faut désigner les systèmes de fichiers par UUID ou par des liens stables',
            'Le disque est défectueux et doit être remplacé',
            'Il faut renommer le disque avec `mv /dev/sdc /dev/sdb`',
            'C’est impossible, les noms sont fixés à l’installation',
          ],
          reponse: 0,
          indices: ['Le noyau numérote les disques au fur et à mesure qu’il les trouve.', 'Renommer un fichier de /dev ne change rien au matériel (et udev le recréerait).', 'Chapitre 4 : fstab utilise des UUID.'],
          solution: 'L’ordre de détection peut changer (nouveau disque, autre contrôleur, timing). D’où l’usage des **UUID** dans `/etc/fstab` et des liens `/dev/disk/by-id`, `by-uuid`, `by-path`.',
        },
        {
          id: 'c03-04-05', type: 'commande', niveau: 2, ref: '§3.4.11, p. 56',
          enonce: 'Crée à la main (en root) le fichier de périphérique **bloc** `/dev/sdz9` de majeur `8` et de mineur `153`.',
          accepte: ['(sudo )?mknod /dev/sdz9 b 8 153'],
          exemple: 'mknod /dev/sdz9 b 8 153',
          indices: ['*make node*.', 'Arguments : nom, type, majeur, mineur.', '`mknod chemin b majeur mineur`'],
          solution: '```\n# mknod /dev/sdz9 b 8 153\n```\nOn ne le fait quasiment plus : udev crée les fichiers tout seul. Supprime ton essai avec `rm /dev/sdz9`.',
        },
        {
          id: 'c03-04-06', type: 'terminal', niveau: 1,
          enonce: 'Lance `lsblk` sur **cuve** puis sur **fut**, et colle les deux sorties. Combien de partitions a le disque système de chacune ? Repères-tu le lecteur cloud-init ?',
          attendu: ['sda', 'sr0'],
          indices: ['Le disque système est `sda`.', 'Le lecteur cloud-init est de type `rom`.', 'Les images Debian et Rocky ne partitionnent pas de la même façon.'],
          solution: 'Sur Debian, l’image cloud a une grande partition racine, une petite partition de démarrage BIOS et une partition EFI. Sur Rocky, l’image « Base » a aussi une partition EFI et une partition `/boot` séparée. Dans les deux cas, `sr0` (type `rom`, 4 Mo environ) est le lecteur virtuel où Proxmox dépose la configuration cloud-init.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '3.5',
      titre: 'Terminaux, consoles et ports série',
      sections: '§3.4.7 à 3.4.10', pages: '53–56',
      objectif: 'Distinguer console virtuelle, pseudo-terminal et port série.',
      rappel: `
        Les **terminaux** sont des périphériques caractère qui font circuler du texte entre un processus et un
        dispositif d’affichage et de saisie.

        | Fichier | Désigne |
        |---|---|
        | \`/dev/tty1\`, \`tty2\`… | **consoles virtuelles** de l’écran physique (Ctrl-Alt-F1, F2…) |
        | \`/dev/pts/0\`, \`pts/1\`… | **pseudo-terminaux** : une fenêtre de terminal, une session SSH |
        | \`/dev/tty\` | le terminal **de contrôle** du processus courant, quel qu’il soit |
        | \`/dev/console\` | la console système (messages du noyau) |
        | \`/dev/ttyS0\`, \`ttyS1\`… | **ports série** (RS-232) |
        | \`/dev/ttyUSB0\`, \`/dev/ttyACM0\` | adaptateurs série USB, modems et cartes type Arduino |
        | \`/dev/lp0\` | ancien port parallèle (imprimantes) |
        | \`/dev/snd/*\` | cartes son (ALSA) |

        \`\`\`
        $ tty                 # quel est mon terminal ?
        /dev/pts/0            # → une session SSH
        # chvt 2              # basculer sur la console virtuelle 2 (sur l’écran de la machine)
        \`\`\`

        ### Le port série de tes VM

        Tes modèles Proxmox ont un port série (\`serial0: socket\`) utilisé **comme écran** (\`vga: serial0\`). Quand tu ouvres
        la console Proxmox (xterm.js), tu es branché sur \`/dev/ttyS0\` de la VM, où systemd fait tourner un programme de
        connexion (\`serial-getty@ttyS0.service\`, chapitre 7). C’est par là qu’on sauve une machine dont le réseau ne marche plus.
      `,
      aRetenir: [
        '`tty1`… consoles virtuelles ; `pts/N` pseudo-terminaux (SSH, fenêtres) ; `/dev/tty` = mon terminal.',
        '`ttyS0` port série ; `ttyUSB0`/`ttyACM0` adaptateurs USB.',
        '`tty` affiche le terminal courant ; `chvt N` change de console virtuelle.',
        'La console Proxmox de tes VM passe par `ttyS0`.',
      ],
      exercices: [
        {
          id: 'c03-05-01', type: 'association', niveau: 1, ref: '§3.4.7–3.4.8, p. 53–55',
          enonce: 'Associe chaque fichier de terminal à ce qu’il représente.',
          paires: [
            ['`/dev/tty1`', 'Première console virtuelle de l’écran physique'],
            ['`/dev/pts/2`', 'Pseudo-terminal (session SSH, fenêtre de terminal)'],
            ['`/dev/tty`', 'Le terminal de contrôle du processus courant'],
            ['`/dev/ttyS0`', 'Premier port série'],
            ['`/dev/ttyUSB0`', 'Adaptateur série branché en USB'],
          ],
          indices: ['pts = *pseudo-terminal slave*.', '`/dev/tty` sans numéro est un alias dynamique.', 'Le S de ttyS vient de *serial*.'],
          solution: 'Consoles virtuelles (`ttyN`), pseudo-terminaux (`pts/N`), terminal courant (`/dev/tty`), série (`ttyS0`), série USB (`ttyUSB0`).',
        },
        {
          id: 'c03-05-02', type: 'commande', niveau: 1,
          enonce: 'Affiche le nom du fichier de terminal auquel ton shell est relié.',
          accepte: ['tty'],
          exemple: 'tty',
          pieges: [{ motif: 'echo \\$TTY|who am i|whoami', message: 'Il existe une commande de trois lettres qui répond exactement à la question.' }],
          indices: ['La commande porte le nom de ce qu’elle affiche.', 'Trois lettres.', '`tty`'],
          solution: '```\n$ tty\n/dev/pts/0\n```\nEn SSH, tu es sur un pseudo-terminal. Dans la console Proxmox, tu verrais `/dev/ttyS0`.',
        },
        {
          id: 'c03-05-03', type: 'sortie', niveau: 2,
          enonce: 'Tu es connecté **en SSH** à `cuve`, c’est ta seule session. Que répond probablement `tty` ?',
          attendu: '/dev/pts/0',
          indices: ['Une session SSH n’utilise pas de console physique.', 'Elle reçoit un pseudo-terminal.', 'Le premier porte le numéro 0.'],
          solution: '```\n/dev/pts/0\n```\nUne deuxième connexion SSH simultanée obtiendrait `/dev/pts/1`.',
        },
        {
          id: 'c03-05-04', type: 'qcm', niveau: 2,
          enonce: 'La carte réseau de `fut` est mal configurée : plus d’accès SSH. Par où te connectes-tu pour réparer ?',
          choix: [
            'Par la console Proxmox, branchée sur le port série `ttyS0` de la VM',
            'Par un second tunnel SSH',
            'Par `/dev/pts/0`',
            'C’est impossible, il faut réinstaller la VM',
          ],
          reponse: 0,
          indices: ['SSH passe par le réseau.', 'Il faut un accès qui ne dépend pas du réseau de la VM.', 'Tes VM utilisent un port série comme écran.'],
          solution: 'La **console Proxmox** utilise le port série virtuel `ttyS0`, indépendant du réseau de la VM. C’est la « prise écran-clavier » du serveur. D’où l’importance d’avoir défini un mot de passe dans `lab.conf`.',
        },
        {
          id: 'c03-05-05', type: 'vrai-faux', niveau: 1, ref: '§3.4.7–3.4.10, p. 53–56',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Les terminaux sont des périphériques caractère.', vrai: true },
            { texte: '`chvt 3` bascule l’écran physique sur la console virtuelle 3.', vrai: true },
            { texte: '`/dev/ttyACM0` est souvent une carte de type Arduino ou un modem USB.', vrai: true },
            { texte: 'Chaque session SSH utilise `/dev/tty1`.', vrai: false, explication: 'Chaque session reçoit son propre pseudo-terminal `/dev/pts/N`.' },
          ],
          indices: ['Un terminal fait circuler un flux de texte.', 'Une seule affirmation est fausse.', 'tty1 est lié à l’écran physique.'],
          solution: 'Vrai, vrai, vrai, faux.',
        },
        {
          id: 'c03-05-06', type: 'terminal', niveau: 2,
          enonce: 'Ouvre la **console Proxmox** de `cuve`, connecte-toi, et tape `tty`. Dans ta session SSH, tape `who`. Colle la sortie de `who`.',
          attendu: ['pts/'],
          indices: ['La console Proxmox se trouve dans l’interface web, onglet « Console » de la VM (choisis xterm.js).', '`who` liste les sessions ouvertes et leur terminal.', 'Tu dois voir une ligne `ttyS0` et une ligne `pts/0`.'],
          solution: '```\n$ who\nadmin    ttyS0        2026-11-08 18:02\nadmin    pts/0        2026-11-08 17:55 (192.168.1.20)\n```\nDeux sessions : la console série et la session SSH, avec l’adresse de ton ordinateur.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '3.6',
      titre: 'devtmpfs et udev',
      sections: '§3.4.11 et 3.5', pages: '56–62',
      objectif: 'Comprendre qui crée `/dev`, et écrire une règle udev simple.',
      rappel: `
        Autrefois, \`/dev\` était un répertoire ordinaire rempli à l’installation de milliers de fichiers créés par
        \`mknod\`. Aujourd’hui, deux mécanismes travaillent ensemble :

        1. **devtmpfs** : un système de fichiers en mémoire monté sur \`/dev\`. Dès qu’il détecte un périphérique,
           le **noyau** y crée lui-même le fichier avec les bons numéros majeur et mineur.
        2. **udevd** (\`systemd-udevd\`) : un démon de l’espace utilisateur qui reçoit un **événement** (*uevent*) du noyau
           pour chaque périphérique. Il applique ses **règles** : régler les droits, charger un pilote, créer des **liens
           symboliques** stables, lancer un programme…

        \`\`\`
        $ ls -l /dev/disk/by-id /dev/disk/by-uuid /dev/disk/by-path
        lrwxrwxrwx … scsi-0QEMU_QEMU_HARDDISK_drive-scsi0 -> ../../sda
        lrwxrwxrwx … 2f8a…-…            -> ../../sda1
        \`\`\`

        ### Les règles

        - Règles du système : \`/usr/lib/udev/rules.d/\` (le livre écrit \`/lib/udev/rules.d\`, même endroit depuis la fusion de /usr).
        - Règles de l’administrateur : \`/etc/udev/rules.d/\`. Un fichier de même nom **remplace** celui du système.
        - Les fichiers sont lus par ordre alphabétique : \`60-…\` avant \`99-…\`.

        Une règle est une ligne de paires clé-opérateur-valeur. \`==\` et \`!=\` **testent**, \`=\` et \`+=\` **assignent** :

        \`\`\`
        # /etc/udev/rules.d/99-sauvegarde.rules
        SUBSYSTEM=="block", ENV{ID_SERIAL}=="QEMU_HARDDISK_drive-scsi1", SYMLINK+="disque-sauvegarde"
        \`\`\`

        ### udevadm

        \`\`\`
        $ udevadm info --query=all --name=/dev/sda     # toutes les propriétés (lignes E: utilisables dans les règles)
        $ udevadm monitor                              # voir passer les événements en direct (ajoute un disque !)
        $ udevadm monitor --kernel --subsystem-match=block
        # udevadm control --reload                     # relire les règles
        # udevadm trigger                              # rejouer les événements
        \`\`\`
      `,
      aRetenir: [
        'devtmpfs : le noyau crée les fichiers de `/dev` ; udevd ajoute droits, liens et actions.',
        'Règles : `/usr/lib/udev/rules.d` (système), `/etc/udev/rules.d` (admin, prioritaire).',
        '`==` teste, `=`/`+=` assigne ; `SYMLINK+=` crée un lien stable.',
        '`udevadm info --query=all`, `udevadm monitor`, `udevadm control --reload`, `udevadm trigger`.',
      ],
      exercices: [
        {
          id: 'c03-06-01', type: 'ordre', niveau: 2, ref: '§3.5, p. 56–58',
          enonce: 'Tu branches à chaud un nouveau disque sur la VM. Remets les événements dans l’ordre.',
          elements: [
            'Le noyau détecte le disque et charge le pilote nécessaire',
            'Le noyau crée le fichier `/dev/sdb` dans devtmpfs',
            'Le noyau envoie un événement (uevent) à l’espace utilisateur',
            'udevd applique ses règles : droits, liens symboliques dans `/dev/disk/…`',
          ],
          indices: ['Tout commence dans le noyau.', 'Le fichier existe avant même qu’udevd n’intervienne (devtmpfs).', 'udevd réagit à l’événement en dernier.'],
          solution: 'Détection et pilote, création du fichier dans devtmpfs, événement envoyé, puis udevd qui complète (droits, liens `by-id`, `by-uuid`…). Tu peux l’observer avec `udevadm monitor` pendant que tu ajoutes un disque dans Proxmox.',
        },
        {
          id: 'c03-06-02', type: 'qcm', niveau: 1, ref: '§3.5.2, p. 58',
          enonce: 'Où l’administrateur place-t-il ses **propres** règles udev ?',
          choix: ['`/etc/udev/rules.d/`', '`/usr/lib/udev/rules.d/`', '`/dev/udev/`', '`/sys/udev/`'],
          reponse: 0,
          indices: ['La configuration propre à la machine va dans…', '… le répertoire de configuration du système.', '`/etc`'],
          solution: '`/etc/udev/rules.d/`. Les règles fournies par les paquets sont dans `/usr/lib/udev/rules.d/` ; un fichier de même nom dans `/etc` les remplace.',
        },
        {
          id: 'c03-06-03', type: 'trous', niveau: 3, ref: '§3.5.2, p. 59',
          enonce: 'Complète la règle pour créer le lien `/dev/disque-sauvegarde` vers le disque dont la propriété `ID_SERIAL` vaut `QEMU_HARDDISK_drive-scsi1`.',
          texte: 'SUBSYSTEM[[1]]"block", ENV{ID_SERIAL}=="QEMU_HARDDISK_drive-scsi1", [[2]]+="disque-sauvegarde"',
          trous: [
            { accepte: ['=='], exemple: '==' },
            { accepte: ['SYMLINK'], exemple: 'SYMLINK' },
          ],
          indices: ['Le premier trou est une condition.', 'Une condition utilise l’opérateur de comparaison.', 'La clé qui crée un lien symbolique : `SYMLINK`.'],
          solution: '```\nSUBSYSTEM=="block", ENV{ID_SERIAL}=="QEMU_HARDDISK_drive-scsi1", SYMLINK+="disque-sauvegarde"\n```\n`==` teste, `+=` ajoute un lien à la liste. Après `udevadm control --reload` et `udevadm trigger`, `/dev/disque-sauvegarde` apparaît.',
        },
        {
          id: 'c03-06-04', type: 'commande', niveau: 2, ref: '§3.5.4, p. 61',
          enonce: 'Observe en direct les événements udev pendant que tu ajoutes un disque à la VM.',
          accepte: ['(sudo )?udevadm monitor( --(kernel|udev|property))*( --subsystem-match=\\S+)?', '(sudo )?udevadm monitor -[kup]+'],
          exemple: 'udevadm monitor',
          indices: ['Toujours `udevadm`.', 'La sous-commande signifie « surveiller ».', '`udevadm monitor`'],
          solution: '```\n$ udevadm monitor\nKERNEL[…] add      /devices/…/block/sdb (block)\nUDEV  […] add      /devices/…/block/sdb (block)\n```\nLes lignes `KERNEL` sont les événements du noyau, les lignes `UDEV` celles traitées par udevd. Ctrl-C pour arrêter.',
        },
        {
          id: 'c03-06-05', type: 'association', niveau: 2, ref: '§3.5.1, p. 57',
          enonce: 'Associe chaque répertoire de liens stables à ce qu’il utilise comme nom.',
          paires: [
            ['`/dev/disk/by-id`', 'Le modèle et le numéro de série du disque'],
            ['`/dev/disk/by-uuid`', 'L’identifiant unique du système de fichiers'],
            ['`/dev/disk/by-path`', 'L’emplacement physique sur le bus (port du contrôleur)'],
            ['`/dev/disk/by-label`', 'L’étiquette donnée au système de fichiers'],
          ],
          indices: ['by-id ne change pas si tu déplaces le disque sur un autre port.', 'by-path change si tu le déplaces.', 'L’UUID et le label sont attribués au formatage (chapitre 4).'],
          solution: 'by-id : identité du disque ; by-uuid : identité du système de fichiers ; by-path : position physique ; by-label : nom choisi au formatage.',
        },
        {
          id: 'c03-06-06', type: 'vrai-faux', niveau: 2, ref: '§3.5, p. 56–58',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Avec devtmpfs, le noyau crée lui-même les fichiers de périphériques.', vrai: true },
            { texte: 'Sans udevd, aucun fichier n’apparaîtrait dans `/dev`.', vrai: false, explication: 'devtmpfs les crée ; udevd ajoute les droits, les liens et les actions.' },
            { texte: 'Les lignes `E:` de `udevadm info --query=all` sont des propriétés utilisables dans les règles (`ENV{…}`).', vrai: true },
            { texte: 'Après avoir modifié une règle, `udevadm control --reload` puis `udevadm trigger` l’appliquent sans redémarrer.', vrai: true },
          ],
          indices: ['Le « tmp » de devtmpfs : il vit en mémoire.', 'Une seule affirmation est fausse.', 'Relis les rôles respectifs du noyau et d’udevd.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
        {
          id: 'c03-06-07', type: 'terminal', niveau: 2,
          enonce: 'Sur ta VM, lance `ls -l /dev/disk/by-id/` et `udevadm info --query=all --name=/dev/sda | grep -E "ID_(SERIAL|MODEL|BUS)="`. Colle la sortie.',
          attendu: ['QEMU'],
          indices: ['Les disques virtuels de Proxmox s’annoncent comme des « QEMU HARDDISK ».', 'Le numéro de série contient le nom de l’emplacement Proxmox (`drive-scsi0`).', 'Ce sont ces propriétés qu’on utilise dans une règle udev.'],
          solution: 'Tu vois des liens `scsi-0QEMU_QEMU_HARDDISK_drive-scsi0 -> ../../sda` et les propriétés `ID_MODEL=QEMU_HARDDISK`, `ID_SERIAL=0QEMU_QEMU_HARDDISK_drive-scsi0`, `ID_BUS=scsi`. Le Lab 02 s’appuiera sur ces noms stables.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '3.7',
      titre: 'Le sous-système SCSI du noyau',
      sections: '§3.6', pages: '62–68',
      objectif: 'Comprendre pourquoi un disque SATA, une clé USB et un disque virtuel s’appellent tous `sd`.',
      rappel: `
        **SCSI** est à l’origine un bus et un protocole pour disques des années 1980. Le bus a presque disparu, mais
        le **protocole** (le jeu de commandes) est resté : il sert d’**interface commune** dans le noyau. SATA, USB, SAS,
        Fibre Channel, iSCSI et **virtio-scsi** traduisent tous leurs échanges en commandes SCSI.

        ### Les couches

        \`\`\`
        ┌──────────────────────────────────────────────────────────┐
        │ Couche haute : pilotes par type de périphérique           │
        │   sd (disques) · sr (optiques) · st (bandes) · sg (générique)│
        ├──────────────────────────────────────────────────────────┤
        │ Couche intermédiaire : routage des messages SCSI          │
        ├──────────────────────────────────────────────────────────┤
        │ Couche basse : adaptateurs et traducteurs                 │
        │   libata (SATA/PATA) · usb-storage · virtio_scsi · …      │
        └──────────────────────────────────────────────────────────┘
        \`\`\`

        - Un disque **SATA** : le pilote libata (couche basse) traduit SCSI ↔ ATA, puis \`sd\` présente \`/dev/sda\`.
        - Une **clé USB** : le pilote usb-storage relie le sous-système USB au sous-système SCSI.
        - Tes **VM** : le contrôleur virtio-scsi de Proxmox, et le lecteur cloud-init IDE (via libata) devient \`/dev/sr0\`.

        ### lsscsi

        \`\`\`
        $ lsscsi                 # paquet lsscsi à installer
        [0:0:0:0]    cd/dvd  QEMU     QEMU DVD-ROM     2.5+  /dev/sr0
        [2:0:0:0]    disk    QEMU     QEMU HARDDISK    2.5+  /dev/sda
        \`\`\`

        Les quatre nombres entre crochets sont l’adresse SCSI **hôte:canal:cible:LUN** (*Logical Unit Number*) :
        l’adaptateur, le bus de cet adaptateur, le périphérique, l’unité logique dans le périphérique.

        ### Le pilote générique sg

        \`/dev/sg0\`, \`/dev/sg1\`… donnent un accès SCSI **brut** à n’importe quel périphérique, pour des outils spécialisés
        (graveurs, lecteurs de bandes, diagnostic). \`lsscsi -g\` affiche la correspondance (module \`sg\`). Un même périphérique
        est donc souvent accessible par **plusieurs chemins** : \`/dev/sr0\` pour lire un CD, \`/dev/sg0\` pour le graver.
      `,
      aRetenir: [
        'SCSI sert d’interface commune : SATA (libata), USB (usb-storage), virtio-scsi… deviennent des `sd`.',
        'Couche haute : `sd`, `sr`, `st`, `sg` ; couche basse : adaptateurs et traducteurs.',
        '`lsscsi` : adresse `[hôte:canal:cible:LUN]`, type, modèle, fichier.',
        '`/dev/sgN` : accès SCSI générique ; un périphérique peut avoir plusieurs fichiers.',
      ],
      exercices: [
        {
          id: 'c03-07-01', type: 'qcm', niveau: 1, ref: '§3.6, p. 62–65',
          enonce: 'Pourquoi un disque **SATA** apparaît-il sous le nom `/dev/sda`, comme un disque SCSI ?',
          choix: [
            'Parce que le noyau traduit les échanges ATA en commandes SCSI (libata) et utilise le pilote de disques SCSI `sd`',
            'Parce que tous les disques modernes sont physiquement des disques SCSI',
            'Parce que SATA veut dire « SCSI ATA »',
            'Par pure convention historique, sans rapport avec le fonctionnement du noyau',
          ],
          reponse: 0,
          indices: ['Le protocole SCSI sert d’interface commune dans le noyau.', 'Un pilote de la couche basse fait la traduction.', 'Son nom : libata.'],
          solution: 'libata traduit SCSI ↔ ATA ; au-dessus, le pilote `sd` présente tous les disques de la même façon : `/dev/sdX`.',
        },
        {
          id: 'c03-07-02', type: 'association', niveau: 2, ref: '§3.6, figure 3-2, p. 64',
          enonce: 'Associe chaque pilote SCSI de la couche haute au type de périphérique qu’il gère.',
          paires: [
            ['`sd`', 'Disques'],
            ['`sr`', 'Lecteurs optiques (CD, DVD)'],
            ['`st`', 'Lecteurs de bandes'],
            ['`sg`', 'Accès générique à n’importe quel périphérique SCSI'],
          ],
          indices: ['sd = *SCSI disk*.', 'sr = *SCSI ROM*, st = *SCSI tape*.', 'sg = *SCSI generic*.'],
          solution: 'sd disques, sr optiques, st bandes, sg générique.',
        },
        {
          id: 'c03-07-03', type: 'association', niveau: 2, ref: '§3.6, p. 63',
          enonce: 'Dans la ligne `[2:0:1:0]  disk  QEMU  QEMU HARDDISK  2.5+  /dev/sdb`, associe chaque nombre de l’adresse à sa signification.',
          paires: [
            ['Premier nombre (2)', 'Numéro de l’adaptateur hôte'],
            ['Deuxième nombre (0)', 'Canal (bus) de l’adaptateur'],
            ['Troisième nombre (1)', 'Cible (le périphérique sur le bus)'],
            ['Quatrième nombre (0)', 'LUN (unité logique du périphérique)'],
          ],
          indices: ['L’ordre va du plus général au plus précis.', 'hôte:canal:cible:LUN', 'LUN = *Logical Unit Number*.'],
          solution: 'Hôte 2, canal 0, cible 1, LUN 0 : le deuxième disque branché sur le contrôleur virtio-scsi de la VM.',
        },
        {
          id: 'c03-07-04', type: 'qcm', niveau: 2, ref: '§3.6.1, p. 65',
          enonce: 'Quel pilote relie le sous-système USB au sous-système SCSI pour qu’une clé USB apparaisse comme `/dev/sdc` ?',
          choix: ['`usb-storage`', '`libata`', '`sg`', '`virtio_scsi`'],
          reponse: 0,
          indices: ['C’est un pilote de stockage USB.', 'Il fait partie de la couche basse du sous-système SCSI.', 'Son nom contient « usb » et « storage ».'],
          solution: '`usb-storage` (ou `uas` pour les périphériques USB 3 récents) traduit entre USB et SCSI. libata sert au SATA, virtio_scsi aux VM.',
        },
        {
          id: 'c03-07-05', type: 'vrai-faux', niveau: 1, ref: '§3.6.3–3.6.4, p. 66–67',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un même périphérique peut être accessible par plusieurs fichiers, par exemple `/dev/sr0` et `/dev/sg0`.', vrai: true },
            { texte: 'Le bus SCSI physique d’origine est encore présent dans la plupart des ordinateurs portables.', vrai: false, explication: 'Le bus a quasiment disparu ; seul le protocole a survécu comme interface commune.' },
            { texte: '`lsscsi -g` affiche aussi le périphérique générique `/dev/sgN` de chaque élément.', vrai: true },
            { texte: 'Les disques de tes VM Proxmox passent par le sous-système SCSI grâce au contrôleur virtio-scsi.', vrai: true },
          ],
          indices: ['Pense au graveur : lire et graver n’utilisent pas le même fichier.', 'Une seule affirmation est fausse.', 'Le protocole a survécu au matériel.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
        {
          id: 'c03-07-06', type: 'terminal', niveau: 2,
          enonce: 'Installe `lsscsi` sur ta VM (`sudo apt install lsscsi` ou `sudo dnf install lsscsi`), puis lance `lsscsi` et `lsscsi -g` (après `sudo modprobe sg`). Colle la sortie.',
          attendu: ['QEMU'],
          indices: ['Les périphériques virtuels de Proxmox s’annoncent comme fabriqués par « QEMU ».', '`modprobe sg` charge le pilote générique.', 'Repère le DVD-ROM (cloud-init) et le disque.'],
          solution: '```\n$ lsscsi -g\n[0:0:0:0]  cd/dvd  QEMU  QEMU DVD-ROM   2.5+  /dev/sr0  /dev/sg0\n[2:0:0:0]  disk    QEMU  QEMU HARDDISK  2.5+  /dev/sda  /dev/sg1\n```\nLe lecteur IDE (via libata) et le disque virtio-scsi sont tous deux dans le sous-système SCSI, chacun avec son fichier générique `sg`.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Que signifient `b`, `c`, `p`, `s` en tête de `ls -l` ?', r: 'Bloc, caractère, tube nommé, socket.' },
    { q: 'Majeur et mineur d’un fichier de périphérique ?', r: 'Majeur = pilote ; mineur = instance (8,0 = sda ; 8,1 = sda1 ; 8,16 = sdb).' },
    { q: 'Les interfaces réseau ont-elles un fichier dans /dev ?', r: 'Non. On les voit dans `/sys/class/net` et avec `ip link`.' },
    { q: 'Différence entre /dev et /sys ?', r: '`/dev` sert à utiliser un périphérique ; `/sys` à le décrire et le régler.' },
    { q: 'Obtenir le chemin sysfs de /dev/sda ?', r: '`udevadm info --query=path --name=/dev/sda`' },
    { q: 'Unité de `/sys/block/sda/size` ?', r: 'Des secteurs de 512 octets.' },
    { q: 'dd : if, of, bs, count, skip, seek ?', r: 'Entrée, sortie, taille de bloc, nombre de blocs, saut en entrée, saut en sortie.' },
    { q: 'Créer un fichier de 100 Mio de zéros ?', r: '`dd if=/dev/zero of=f bs=1M count=100`' },
    { q: 'Partition 2 du disque NVMe nvme0n1 ?', r: '`/dev/nvme0n1p2`' },
    { q: 'sd, vd, xvd, sr, dm ?', r: 'SCSI/SATA/USB/virtio-scsi ; virtio-blk ; Xen ; optique ; device mapper (LVM, chiffrement).' },
    { q: 'Pourquoi ne pas se fier à sda/sdb ?', r: 'Ils dépendent de l’ordre de détection. Utiliser les UUID ou `/dev/disk/by-id`.' },
    { q: 'tty1, pts/0, /dev/tty, ttyS0 ?', r: 'Console virtuelle ; pseudo-terminal (SSH) ; terminal courant ; port série.' },
    { q: 'Rôles de devtmpfs et udevd ?', r: 'devtmpfs : le noyau crée les fichiers de /dev. udevd : droits, liens stables, actions selon des règles.' },
    { q: 'Où mettre ses règles udev ?', r: '`/etc/udev/rules.d/` (prioritaire sur `/usr/lib/udev/rules.d/`).' },
    { q: 'Opérateurs d’une règle udev ?', r: '`==`/`!=` testent ; `=`/`+=` assignent (ex. `SYMLINK+="nom"`).' },
    { q: 'Voir les événements udev en direct ?', r: '`udevadm monitor`' },
    { q: 'Pourquoi un disque SATA s’appelle sda ?', r: 'libata traduit ATA en SCSI ; le pilote SCSI `sd` présente le disque.' },
    { q: 'Adresse SCSI `[2:0:1:0]` ?', r: 'hôte:canal:cible:LUN.' },
  ],
  memo: `
    ### Types et numéros
    \`\`\`
    ls -l /dev/sda   → brw-rw---- 1 root disk 8, 0   (b = bloc, majeur 8, mineur 0)
    b bloc · c caractère · p tube nommé · s socket
    \`\`\`

    ### sysfs
    \`\`\`
    udevadm info --query=path --name=/dev/sda
    cat /sys/block/sda/dev       # 8:0
    cat /sys/block/sda/size      # secteurs de 512 octets
    ls /sys/class/net            # interfaces réseau
    \`\`\`

    ### dd
    \`\`\`
    dd if=/dev/zero of=f bs=1M count=100          # créer
    dd if=/dev/sda of=mbr.bin bs=512 count=1      # 1er secteur
    dd if=image.iso of=/dev/sdX bs=4M status=progress conv=fsync
    \`\`\`

    ### Noms
    | Nom | Périphérique |
    |---|---|
    | sda, sda1 | SCSI, SATA, USB, virtio-scsi |
    | vda | virtio-blk |
    | nvme0n1p1 | NVMe |
    | sr0 | optique |
    | dm-0, /dev/mapper/* | LVM, chiffrement |
    | tty1 · pts/0 · ttyS0 · ttyUSB0 | console · pseudo-terminal · série · série USB |

    ### udev
    \`\`\`
    /usr/lib/udev/rules.d/   (système)   /etc/udev/rules.d/  (admin)
    SUBSYSTEM=="block", ENV{ID_SERIAL}=="…", SYMLINK+="nom"
    udevadm info --query=all --name=/dev/sda
    udevadm monitor   udevadm control --reload   udevadm trigger
    ls -l /dev/disk/by-{id,uuid,path,label}
    \`\`\`

    ### SCSI
    \`\`\`
    lsscsi   lsscsi -g   [hôte:canal:cible:LUN]
    sd disque · sr optique · st bande · sg générique
    \`\`\`
  `,
});
