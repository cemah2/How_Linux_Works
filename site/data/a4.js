/* Module A4 (hors livre) : espaces de noms et cgroups, un conteneur construit à la main. */
HLW.chapitre({
  id: 'A4',
  intro: `
    Le chapitre 17 l’affirme : un conteneur n’est qu’un groupe de processus ordinaires, isolés par des
    **espaces de noms** (*namespaces*) et limités par des **cgroups**. Ce module le démontre en construisant
    toutes les pièces à la main, avec les outils de util-linux, iproute2 et systemd, sans Podman.

    C’est aussi une boîte à outils de dépannage : entrer dans le réseau d’un conteneur pour y lancer \`ss\`,
    lire ses limites dans \`/sys/fs/cgroup\`, comprendre pourquoi un conteneur rootless ne peut pas tout faire.
    Le Lab 12 met ces gestes en pratique.
  `,
  objectifs: [
    'citer les espaces de noms du noyau et ce que chacun isole ;',
    'créer des espaces avec unshare et entrer dans ceux d’un processus avec nsenter ;',
    'relier deux espaces réseau par une paire veth, avec un pont et du NAT ;',
    'changer la racine d’un processus et monter /proc proprement ;',
    'créer un cgroup v2 à la main et y fixer des limites, ou le faire faire par systemd ;',
    'comprendre l’espace de noms utilisateur, les correspondances d’UID et les capacités.',
  ],
  certifs: { lfcs: ['OD'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: 'A4.1',
      titre: 'Les espaces de noms du noyau',
      objectif: 'Savoir ce que chaque espace isole, et les voir sur une machine réelle.',
      rappel: `
        Un **espace de noms** donne à un groupe de processus sa propre vue d’une ressource globale :

        | Espace | Isole | Exemple visible |
        |---|---|---|
        | **mnt** | la table des montages | un \`/proc\` ou un \`/\` différents |
        | **uts** | le nom d’hôte et le nom de domaine | \`hostname\` |
        | **ipc** | files de messages et mémoire partagée System V | \`ipcs\` |
        | **pid** | la numérotation des processus | la commande est le PID 1 |
        | **net** | interfaces, routes, pare-feu, ports | seule \`lo\` existe au départ |
        | **user** | UID et GID | root dans l’espace, simple utilisateur dehors |
        | **cgroup** | la vue de la hiérarchie des cgroups | \`/proc/self/cgroup\` affiche \`0::/\` |
        | **time** | les horloges monotones | rarement utilisé |

        Chaque processus appartient à un espace de **chaque** type. Ils sont visibles dans \`/proc/PID/ns/\` :

        \`\`\`
        $ ls -l /proc/$$/ns
        lrwxrwxrwx … net -> 'net:[4026531840]'
        lrwxrwxrwx … pid -> 'pid:[4026531836]'
        $ sudo lsns                       # tous les espaces, avec le nombre de processus et le premier
        $ sudo lsns -t net                # seulement les espaces réseau
        \`\`\`

        Deux processus sont dans le même espace si le **numéro** entre crochets est le même. Trois appels
        système font tout le travail : \`clone()\` (créer un processus dans de nouveaux espaces), \`unshare()\`
        (quitter ses espaces pour de nouveaux) et \`setns()\` (rejoindre un espace existant).
      `,
      aRetenir: [
        'Espaces : mnt, uts, ipc, pid, net, user, cgroup, time.',
        '/proc/PID/ns/* : même numéro = même espace ; `lsns [-t type]`.',
        'clone(), unshare(), setns().',
      ],
      exercices: [
        {
          id: 'cA4-01-01', type: 'association', niveau: 1,
          enonce: 'Associe chaque espace de noms à ce qu’il isole.',
          paires: [['uts', 'Le nom d’hôte'], ['pid', 'La numérotation des processus'], ['net', 'Les interfaces, routes et ports'], ['mnt', 'La table des montages'], ['user', 'Les UID et GID']],
          indices: ['UTS = Unix Time-sharing System (nom de machine).', 'net = réseau.', 'mnt = mount.'],
          solution: 'uts : nom d’hôte ; pid : processus ; net : réseau ; mnt : montages ; user : identités.',
        },
        {
          id: 'cA4-01-02', type: 'commande', niveau: 1,
          enonce: 'Liste seulement les espaces de noms **réseau** de la machine.',
          accepte: ['(sudo )?lsns -t net', '(sudo )?lsns --type net', '(sudo )?lsns --type=net'],
          exemple: 'lsns -t net',
          indices: ['lsns.', 'Une option filtre le type.', '`lsns -t net`'],
          solution: '```\n$ sudo lsns -t net\n        NS TYPE NPROCS   PID USER COMMAND\n4026531840 net     140     1 root /sbin/init\n4026532459 net       1 24817 root python3 /app/vitrine.py\n```',
        },
        {
          id: 'cA4-01-03', type: 'qcm', niveau: 2,
          enonce: 'Comment savoir si deux processus (PID 812 et 24817) partagent le même espace réseau ?',
          choix: [
            'Comparer `readlink /proc/812/ns/net` et `readlink /proc/24817/ns/net` : même numéro = même espace',
            'Comparer leurs PPID',
            'Comparer leurs UID',
            'Regarder s’ils ont le même nom de commande',
          ],
          reponse: 0,
          indices: ['Les espaces sont visibles dans /proc.', 'Chaque lien contient un numéro d’inode.', 'Même numéro, même espace.'],
          solution: 'Les liens `/proc/PID/ns/net` pointent vers `net:[numéro]` ; même numéro = même espace. C’est ce que tu as relevé dans le rapport du Lab 12.',
        },
        {
          id: 'cA4-01-04', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un processus appartient à un espace de chaque type, en même temps.', vrai: true },
            { texte: 'Un nouvel espace réseau contient d’emblée une copie des interfaces de l’hôte.', vrai: false, explication: 'Il ne contient que lo, éteinte.' },
            { texte: 'setns() permet à un processus de rejoindre un espace existant.', vrai: true },
            { texte: 'L’espace pid permet à la commande d’un conteneur d’avoir le PID 1.', vrai: true },
          ],
          indices: ['Tous les types à la fois.', 'Une seule fausse.', 'net neuf = vide.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A4.2',
      titre: 'unshare et nsenter',
      objectif: 'Créer des espaces pour une commande, et entrer dans ceux d’un conteneur existant.',
      rappel: `
        **unshare** lance une commande dans de nouveaux espaces :

        \`\`\`
        $ sudo unshare --uts bash -c 'hostname essai; hostname'   # « essai » ; l'hôte n'a pas changé
        $ sudo unshare --pid --fork --mount-proc bash
        # ps aux                                  # bash est le PID 1, seul avec ps
        $ sudo unshare --net ip link              # seulement lo, DOWN
        \`\`\`

        - Avec \`--pid\`, c’est le **premier enfant** qui devient PID 1 : d’où **\`--fork\`**.
        - **\`--mount-proc\`** (qui implique \`--mount\`) remonte \`/proc\` dans un espace de montage privé :
          sinon \`ps\` lit le \`/proc\` de l’hôte et voit tout.

        **nsenter** fait l’inverse : entrer dans les espaces d’un processus existant, en gardant les outils de
        l’hôte. C’est l’outil de dépannage idéal pour un conteneur minimal qui n’a ni \`ss\` ni \`ip\` :

        \`\`\`
        $ P=$(sudo podman inspect vitrine --format '{{.State.Pid}}')
        $ sudo nsenter -t "$P" -n ss -ltnp        # les ports écoutés DANS le conteneur
        $ sudo nsenter -t "$P" -n ip addr
        $ sudo nsenter -t "$P" -m -u -i -n -p sh  # entrer dans presque tous ses espaces
        \`\`\`

        Options courantes : \`-t PID\` (cible), \`-m\` montages, \`-u\` UTS, \`-i\` IPC, \`-n\` réseau, \`-p\` PID,
        \`-U\` utilisateur, \`-a\` tous.
      `,
      aRetenir: [
        '`unshare --uts|--net|--pid --fork --mount-proc|--mount|--ipc|--user COMMANDE`.',
        '--pid demande --fork ; --mount-proc pour un ps cohérent.',
        '`nsenter -t PID -n ss -ltnp` : outils de l’hôte, espaces du conteneur.',
      ],
      exercices: [
        {
          id: 'cA4-02-01', type: 'commande', niveau: 1,
          enonce: 'Lance un `bash` dans un nouvel espace de noms **UTS** (en root), pour pouvoir changer le nom d’hôte sans toucher à celui de la machine.',
          accepte: ['(sudo )?unshare --uts bash', '(sudo )?unshare -u bash', '(sudo )?unshare --uts /bin/bash', '(sudo )?unshare -u /bin/bash', '(sudo )?unshare --uts', '(sudo )?unshare -u'],
          exemple: 'unshare --uts bash',
          indices: ['unshare.', 'Option du nom de l’espace.', '`unshare --uts bash`'],
          solution: '```\n$ sudo unshare --uts bash\n# hostname essai ; hostname\nessai\n# exit\n$ hostname\ncuve\n```',
        },
        {
          id: 'cA4-02-02', type: 'qcm', niveau: 2,
          enonce: 'Dans `sudo unshare --pid bash`, puis `ps aux`, tu vois tous les processus de l’hôte et bash n’a pas le PID 1. Que manque-t-il ?',
          choix: [
            '--fork (pour que bash soit le premier enfant dans le nouvel espace) et --mount-proc (pour que ps lise un /proc propre)',
            '--net',
            '--user',
            'Rien, unshare ne sait pas isoler les PID',
          ],
          reponse: 0,
          indices: ['Le processus qui appelle unshare reste dans son espace PID d’origine.', 'Seuls ses enfants entrent dans le nouveau.', 'ps lit /proc.'],
          solution: '`sudo unshare --pid --fork --mount-proc bash`. Sans --fork, bash reste dans l’ancien espace PID ; sans /proc remonté, ps voit les processus de l’hôte.',
        },
        {
          id: 'cA4-02-03', type: 'commande', niveau: 2,
          enonce: 'Le processus principal d’un conteneur a le PID 24817 sur l’hôte. Liste les ports TCP en écoute **dans son espace réseau**, avec `ss -ltn`.',
          accepte: ['(sudo )?nsenter -t ?24817 -n ss -ltnp?', '(sudo )?nsenter --target[ =]24817 --net ss -ltnp?', '(sudo )?nsenter -n -t ?24817 ss -ltnp?', '(sudo )?nsenter -t ?24817 --net ss -ltnp?'],
          exemple: 'nsenter -t 24817 -n ss -ltn',
          indices: ['L’outil pour entrer dans des espaces existants.', '-t pour la cible, -n pour le réseau.', '`nsenter -t 24817 -n ss -ltn`'],
          solution: '```\n$ sudo nsenter -t 24817 -n ss -ltn\nState  Recv-Q Send-Q Local Address:Port\nLISTEN 0      5            0.0.0.0:8000\n```\nLe conteneur écoute sur 8000 ; c’est la redirection de Podman qui l’expose sur 8080 de l’hôte.',
        },
        {
          id: 'cA4-02-04', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'nsenter utilise les programmes de l’hôte, même si l’image du conteneur ne les contient pas.', vrai: true, explication: 'Sauf si on entre aussi dans son espace de montage (-m).' },
            { texte: '--mount-proc implique un nouvel espace de montage.', vrai: true },
            { texte: '`unshare --net` crée un espace réseau avec la même adresse IP que l’hôte.', vrai: false },
            { texte: 'nsenter -a entre dans tous les espaces du processus cible.', vrai: true },
          ],
          indices: ['Sans -m, on garde son propre système de fichiers.', 'Une seule fausse.', 'Un espace net neuf est vide.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A4.3',
      titre: 'Espaces réseau, paires veth et pont',
      objectif: 'Reconstruire à la main le réseau qu’un moteur de conteneurs met en place.',
      rappel: `
        \`ip netns\` crée des espaces réseau **nommés** (visibles dans \`/run/netns\`) :

        \`\`\`
        # ip netns add cave
        # ip link add veth-hote type veth peer name veth-cave     # un « câble » à deux bouts
        # ip link set veth-cave netns cave                        # un bout dans l'espace
        # ip addr add 10.99.0.1/24 dev veth-hote ; ip link set veth-hote up
        # ip -n cave addr add 10.99.0.2/24 dev veth-cave
        # ip -n cave link set veth-cave up ; ip -n cave link set lo up
        # ip -n cave route add default via 10.99.0.1
        # ip netns exec cave ping -c1 10.99.0.1                   # OK
        \`\`\`

        Pour plusieurs espaces, on branche les bouts côté hôte sur un **pont** (comme \`podman0\`) :

        \`\`\`
        # ip link add pont0 type bridge ; ip addr add 10.99.0.1/24 dev pont0 ; ip link set pont0 up
        # ip link set veth-hote master pont0                     # (sans adresse sur veth-hote)
        \`\`\`

        Pour sortir vers Internet : routage (\`net.ipv4.ip_forward=1\`) et **masquerade** du réseau
        10.99.0.0/24 (module A2.3). C’est exactement la figure 17-1 du livre, et la technique utilisée par les
        tests automatiques du Lab 07 pour simuler trois machines.

        Nettoyage : \`ip netns del cave\` (le bout veth qui y était disparaît, et son jumeau avec lui).
      `,
      aRetenir: [
        '`ip netns add|list|del`, `ip netns exec NOM cmd`, `ip -n NOM …`.',
        '`ip link add A type veth peer name B` ; `ip link set B netns NOM`.',
        'Pont : `ip link add pont0 type bridge`, `ip link set veth master pont0`.',
        'Sortie : ip_forward + masquerade.',
      ],
      exercices: [
        {
          id: 'cA4-03-01', type: 'commande', niveau: 1,
          enonce: 'Crée un espace réseau nommé `cave`.',
          accepte: ['(sudo )?ip netns add cave', '(sudo )?ip netns a cave'],
          exemple: 'ip netns add cave',
          indices: ['ip netns.', 'Sous-commande add.', '`ip netns add cave`'],
          solution: '```\n# ip netns add cave\n# ip netns list\ncave\n```',
        },
        {
          id: 'cA4-03-02', type: 'commande', niveau: 2,
          enonce: 'Crée une paire veth dont les extrémités s’appellent `veth-hote` et `veth-cave`.',
          accepte: ['(sudo )?ip link add veth-hote type veth peer name veth-cave', '(sudo )?ip link add veth-cave type veth peer name veth-hote', '(sudo )?ip link add name veth-hote type veth peer name veth-cave', '(sudo )?ip link add veth-hote type veth peer veth-cave'],
          exemple: 'ip link add veth-hote type veth peer name veth-cave',
          indices: ['ip link add NOM type veth …', 'peer name pour l’autre bout.', '`ip link add veth-hote type veth peer name veth-cave`'],
          solution: '```\n# ip link add veth-hote type veth peer name veth-cave\n# ip link set veth-cave netns cave\n```',
        },
        {
          id: 'cA4-03-03', type: 'ordre', niveau: 2,
          enonce: 'Remets dans l’ordre la connexion de l’espace `cave` à l’hôte.',
          elements: [
            'ip netns add cave',
            'ip link add veth-hote type veth peer name veth-cave',
            'ip link set veth-cave netns cave',
            'ip addr add 10.99.0.1/24 dev veth-hote ; ip link set veth-hote up',
            'ip -n cave addr add 10.99.0.2/24 dev veth-cave ; ip -n cave link set veth-cave up',
            'ip netns exec cave ping -c1 10.99.0.1',
          ],
          indices: ['L’espace et le câble d’abord.', 'Un bout dans l’espace.', 'Adresses et activation de chaque côté, puis test.'],
          solution: 'Espace → paire veth → un bout dans l’espace → adresse et up côté hôte → adresse et up côté espace → test.',
        },
        {
          id: 'cA4-03-04', type: 'qcm', niveau: 2,
          enonce: 'Depuis `cave`, `ping 10.99.0.1` répond mais `ping 1.1.1.1` échoue avec « Network is unreachable ». Que manque-t-il **en premier** ?',
          choix: ['Une route par défaut dans l’espace (ip -n cave route add default via 10.99.0.1)', 'Le masquerade sur l’hôte', 'Le pont pont0', 'Un serveur DNS'],
          reponse: 0,
          indices: ['« Unreachable » = pas de route.', 'Le masquerade servira ensuite.', 'La passerelle est l’hôte.'],
          solution: '« Network is unreachable » signifie qu’aucune route ne mène là. Route par défaut via 10.99.0.1, puis ip_forward et masquerade sur l’hôte pour que les réponses reviennent.',
        },
        {
          id: 'cA4-03-05', type: 'terminal', niveau: 2,
          enonce: 'Sur cuve, fais la manipulation de la fiche (espace `cave`, paire veth, adresses, route), puis `ip netns exec cave ip -br addr` et `ip netns exec cave ping -c1 10.99.0.1`. Colle la sortie, puis nettoie avec `ip netns del cave`.',
          attendu: ['10\\.99\\.0\\.2', '1 received|1 packets received'],
          indices: ['N’oublie pas `ip -n cave link set lo up`.', 'Les deux bouts doivent être up.', 'ip -br = sortie brève.'],
          solution: '`veth-cave@if…  UP  10.99.0.2/24` et un ping réussi. Après `ip netns del cave`, `ip link` sur l’hôte ne montre plus veth-hote : supprimer un bout supprime la paire.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A4.4',
      titre: 'Changer de racine : chroot, rootfs et montages',
      objectif: 'Donner à un processus un autre système de fichiers racine, proprement.',
      rappel: `
        Un **rootfs** est un arbre complet (\`/bin\`, \`/etc\`, \`/lib\`…). Le plus simple est de l’extraire d’une
        image de conteneur : \`podman create\`, \`podman export | tar -x\`, \`podman rm\` (Lab 12).

        \`\`\`
        # chroot /srv/mini/rootfs /bin/sh           # la racine devient /srv/mini/rootfs
        # unshare --mount --pid --fork --root=/srv/mini/rootfs --mount-proc /bin/sh
        \`\`\`

        - **chroot** change la racine vue par un processus. Seul, ce n’est **pas** une isolation de sécurité :
          root dans un chroot garde tous ses pouvoirs sur le noyau. Combiné aux espaces de noms, il devient une
          brique d’un conteneur.
        - Les vrais moteurs utilisent **\`pivot_root\`** dans un espace de montage privé : l’ancienne racine est
          démontée, il ne reste rien de l’hôte dans l’arbre visible.
        - **Propagation des montages** : dans un nouvel espace mnt, on rend les montages **privés**
          (\`mount --make-rprivate /\`, ce que fait unshare par défaut) pour que ce qu’on monte ne se propage pas
          à l’hôte, et inversement.
        - Un rootfs a besoin de quelques montages pour fonctionner : \`/proc\` (\`mount -t proc proc /proc\`),
          parfois \`/dev\` (un tmpfs avec quelques périphériques) et \`/sys\` en lecture seule.

        \`\`\`
        $ findmnt -o TARGET,PROPAGATION /       # shared, private…
        \`\`\`
      `,
      aRetenir: [
        'rootfs extrait d’une image : `podman export … | tar -x -C rép`.',
        '`chroot rép cmd` ou `unshare --root=rép` ; chroot seul n’isole pas root.',
        'pivot_root dans un espace mnt privé (moteurs) ; propagation privée.',
        'Monter /proc (et /dev, /sys) dans le rootfs ; `findmnt -o TARGET,PROPAGATION`.',
      ],
      exercices: [
        {
          id: 'cA4-04-01', type: 'commande', niveau: 1,
          enonce: 'Lance `/bin/sh` avec pour racine `/srv/mini/rootfs`, avec la commande historique.',
          accepte: ['(sudo )?chroot /srv/mini/rootfs/? /bin/sh', '(sudo )?chroot /srv/mini/rootfs/? sh', '(sudo )?chroot /srv/mini/rootfs/?'],
          exemple: 'chroot /srv/mini/rootfs /bin/sh',
          indices: ['change root.', 'Le répertoire, puis la commande.', '`chroot /srv/mini/rootfs /bin/sh`'],
          solution: '```\n# chroot /srv/mini/rootfs /bin/sh\n/ # cat /etc/os-release | head -1\nNAME="Alpine Linux"\n```',
        },
        {
          id: 'cA4-04-02', type: 'qcm', niveau: 2,
          enonce: 'Pourquoi un simple chroot ne suffit-il pas à isoler un service qui tourne en root ?',
          choix: [
            'Root garde tous ses pouvoirs sur le noyau (processus, réseau, montages) : seule la vue du système de fichiers change',
            'chroot ne fonctionne qu’avec des binaires statiques',
            'chroot est désactivé par SELinux',
            'chroot change aussi le nom d’hôte',
          ],
          reponse: 0,
          indices: ['Que change exactement chroot ?', 'Les processus de l’hôte restent visibles et atteignables.', 'Il faut les espaces de noms en plus.'],
          solution: 'chroot ne change que la racine des chemins. Les processus, le réseau, les montages et les privilèges restent ceux de l’hôte : il faut des espaces de noms, des capacités réduites et un profil SELinux/AppArmor pour isoler vraiment.',
        },
        {
          id: 'cA4-04-03', type: 'commande', niveau: 2,
          enonce: 'Dans le rootfs, monte le système de fichiers `proc` sur `/proc`.',
          accepte: ['(sudo )?mount -t proc proc /proc', '(sudo )?mount -t proc none /proc', '(sudo )?mount proc /proc -t proc'],
          exemple: 'mount -t proc proc /proc',
          indices: ['mount -t TYPE SOURCE CIBLE.', 'Le type et la source s’appellent proc.', '`mount -t proc proc /proc`'],
          solution: '```\n# mount -t proc proc /proc\n```\nÀ faire dans un nouvel espace pid et mnt, sinon ce /proc montre les processus de l’hôte.',
        },
        {
          id: 'cA4-04-04', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'podman export aplatit les couches d’un conteneur en une seule archive tar.', vrai: true },
            { texte: 'Avec une propagation privée, un montage fait dans l’espace du conteneur n’apparaît pas sur l’hôte.', vrai: true },
            { texte: 'pivot_root et chroot sont strictement identiques.', vrai: false, explication: 'pivot_root change la racine de l’espace de montage et permet de démonter l’ancienne.' },
            { texte: 'findmnt peut afficher la propagation des montages.', vrai: true },
          ],
          indices: ['export = aplatir.', 'Une seule fausse.', 'pivot_root est plus radical.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A4.5',
      titre: 'cgroups v2 à la main et par systemd',
      objectif: 'Limiter la mémoire, le processeur et le nombre de processus d’un groupe.',
      rappel: `
        Les cgroups (fiche 8.7) forment une hiérarchie montée sur \`/sys/fs/cgroup\`. Chaque répertoire est un
        groupe ; ses fichiers sont des réglages.

        \`\`\`
        # cat /sys/fs/cgroup/cgroup.controllers               # contrôleurs disponibles : cpu memory pids io…
        # mkdir /sys/fs/cgroup/essai
        # echo 64M  > /sys/fs/cgroup/essai/memory.max         # 64 Mio au plus
        # echo "50000 100000" > /sys/fs/cgroup/essai/cpu.max  # 50 % d'un processeur
        # echo 20   > /sys/fs/cgroup/essai/pids.max           # 20 processus au plus
        # echo $$   > /sys/fs/cgroup/essai/cgroup.procs       # y placer le shell courant (et ses enfants)
        # cat /sys/fs/cgroup/essai/memory.current /sys/fs/cgroup/essai/memory.events
        \`\`\`

        - Un contrôleur n’est disponible dans un groupe que s’il est activé dans
          \`cgroup.subtree_control\` du parent (\`echo +memory > …/cgroup.subtree_control\`).
        - Règle « pas de processus dans les nœuds internes » : un groupe qui délègue des contrôleurs à ses
          enfants ne contient pas lui-même de processus.
        - Un groupe ne se supprime (\`rmdir\`) que vide.
        - Quand la limite mémoire est atteinte, le noyau récupère de la mémoire puis tue un processus du groupe
          (compteur \`oom_kill\` dans \`memory.events\`).

        Sur un système systemd, c’est **systemd** qui gère l’arbre ; on lui demande plutôt :

        \`\`\`
        $ sudo systemd-run --scope -p MemoryMax=64M -p CPUQuota=50% -p TasksMax=20 -- commande
        $ sudo systemctl set-property vitrine.service MemoryMax=256M     # sur une unité existante
        $ systemd-cgls ; systemd-cgtop
        \`\`\`
      `,
      aRetenir: [
        '/sys/fs/cgroup : mkdir = groupe ; memory.max, cpu.max ("quota période"), pids.max ; cgroup.procs.',
        'cgroup.subtree_control du parent ; rmdir d’un groupe vide ; memory.events (oom_kill).',
        'Avec systemd : `systemd-run --scope -p MemoryMax=… -p CPUQuota=… -p TasksMax=…`, `systemctl set-property`.',
        '`systemd-cgls`, `systemd-cgtop`.',
      ],
      exercices: [
        {
          id: 'cA4-05-01', type: 'association', niveau: 2,
          enonce: 'Associe chaque fichier d’un cgroup v2 à son rôle.',
          paires: [['memory.max', 'Limite de mémoire'], ['cpu.max', 'Quota de processeur par période'], ['pids.max', 'Nombre maximal de processus'], ['cgroup.procs', 'Processus membres du groupe'], ['memory.events', 'Compteurs, dont les tueries pour manque de mémoire']],
          indices: ['Les noms parlent d’eux-mêmes.', 'procs = processus.', 'events = événements.'],
          solution: 'memory.max : mémoire ; cpu.max : processeur ; pids.max : processus ; cgroup.procs : membres ; memory.events : compteurs (oom_kill).',
        },
        {
          id: 'cA4-05-02', type: 'commande', niveau: 2,
          enonce: 'Limite le groupe `/sys/fs/cgroup/essai` à **64 Mio** de mémoire (le groupe existe déjà).',
          accepte: ['echo 64M > /sys/fs/cgroup/essai/memory\\.max', 'echo 67108864 > /sys/fs/cgroup/essai/memory\\.max', 'echo 64M \\| (sudo )?tee /sys/fs/cgroup/essai/memory\\.max', 'echo 67108864 \\| (sudo )?tee /sys/fs/cgroup/essai/memory\\.max'],
          exemple: 'echo 64M > /sys/fs/cgroup/essai/memory.max',
          indices: ['On écrit dans un fichier du groupe.', 'Le fichier de la limite mémoire.', 'Valeur avec suffixe M ou en octets.'],
          solution: '```\n# echo 64M > /sys/fs/cgroup/essai/memory.max\n# cat /sys/fs/cgroup/essai/memory.max\n67108864\n```',
        },
        {
          id: 'cA4-05-03', type: 'commande', niveau: 2,
          enonce: 'Lance `./calcul-stocks` dans un scope systemd temporaire limité à **50 %** d’un processeur.',
          accepte: ['(sudo )?systemd-run --scope -p CPUQuota=50% (-- )?\\./calcul-stocks', '(sudo )?systemd-run -p CPUQuota=50% --scope (-- )?\\./calcul-stocks', '(sudo )?systemd-run --scope --property=CPUQuota=50% (-- )?\\./calcul-stocks'],
          exemple: 'systemd-run --scope -p CPUQuota=50% ./calcul-stocks',
          indices: ['systemd-run --scope.', 'La propriété du quota processeur.', 'CPUQuota=50%.'],
          solution: '```\n$ sudo systemd-run --scope -p CPUQuota=50% ./calcul-stocks\n```\nsystemd écrit lui-même `cpu.max` = `50000 100000` dans le cgroup du scope.',
        },
        {
          id: 'cA4-05-04', type: 'qcm', niveau: 2,
          enonce: 'Après `mkdir /sys/fs/cgroup/essai/a`, le fichier `memory.max` n’existe pas dans `essai/a`. Pourquoi ?',
          choix: [
            'Le contrôleur memory n’est pas activé dans cgroup.subtree_control de essai',
            'Il faut redémarrer',
            'Le noyau ne gère pas la mémoire en cgroups v2',
            'mkdir doit être lancé avec l’option -p',
          ],
          reponse: 0,
          indices: ['Les contrôleurs se délèguent du parent vers les enfants.', 'Un fichier du parent liste ceux qui sont délégués.', 'subtree_control.'],
          solution: '`echo +memory > /sys/fs/cgroup/essai/cgroup.subtree_control` : les enfants de essai reçoivent alors les fichiers memory.*. (essai ne doit plus contenir de processus lui-même.)',
        },
        {
          id: 'cA4-05-05', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`echo 50000 100000 > cpu.max` accorde 50 % d’un processeur.', vrai: true },
            { texte: 'On peut supprimer un cgroup qui contient encore des processus.', vrai: false },
            { texte: '`systemctl set-property` modifie les limites d’une unité en cours et les enregistre.', vrai: true },
            { texte: 'Quand memory.max est atteint et que la mémoire ne peut pas être récupérée, un processus du groupe est tué.', vrai: true },
          ],
          indices: ['quota / période.', 'Une seule fausse.', 'rmdir exige un groupe vide.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A4.6',
      titre: 'Espace utilisateur, rootless et capacités',
      objectif: 'Comprendre comment un simple utilisateur obtient un « root » qui n’en est pas un.',
      rappel: `
        L’espace de noms **user** donne à un processus ses propres UID : il peut être **root (UID 0) dans
        l’espace** tout en étant un simple utilisateur sur l’hôte.

        \`\`\`
        $ unshare --user --map-root-user bash       # sans sudo
        # id
        uid=0(root) gid=0(root)
        # cat /proc/self/uid_map
                 0       1002          1            # UID 0 dedans = UID 1002 dehors, une seule valeur
        # touch /etc/essai
        touch: cannot touch '/etc/essai': Permission denied     # le vrai root, lui, n'a pas été donné
        \`\`\`

        Pour disposer de **plusieurs** UID (un conteneur a root, nobody, bin…), il faut des **plages
        subordonnées** dans \`/etc/subuid\` et \`/etc/subgid\`, que les programmes setuid **newuidmap** et
        **newgidmap** écrivent dans \`uid_map\` : c’est ce que fait Podman rootless (Lab 12, \`podman unshare\`).

        ### Les capacités

        Linux découpe les pouvoirs de root en **capacités** (\`CAP_NET_BIND_SERVICE\` pour écouter sous le port
        1024, \`CAP_SYS_ADMIN\` pour monter, \`CAP_NET_ADMIN\` pour le réseau…). Un processus root dans un espace
        user possède des capacités **seulement sur les ressources de cet espace** : il peut configurer le réseau
        de son propre espace net, pas celui de l’hôte.

        \`\`\`
        $ grep Cap /proc/self/status ; capsh --decode=0000003fffffffff
        $ getpcaps $$                              # capacités d'un processus
        $ sudo setcap cap_net_bind_service=+ep /usr/local/bin/vitrine   # écouter sur 80 sans être root
        $ getcap /usr/local/bin/vitrine
        \`\`\`

        Les moteurs de conteneurs retirent la plupart des capacités par défaut ; systemd le permet aussi pour un
        service (\`CapabilityBoundingSet=\`, \`AmbientCapabilities=\`, module A8).
      `,
      aRetenir: [
        'Espace user : root dedans, utilisateur dehors ; `unshare --user --map-root-user`.',
        '/proc/PID/uid_map ; plages /etc/subuid, /etc/subgid ; newuidmap/newgidmap (rootless).',
        'Capacités : pouvoirs de root découpés ; valables seulement dans l’espace user concerné.',
        '`getpcaps`, `capsh --decode`, `setcap`/`getcap`.',
      ],
      exercices: [
        {
          id: 'cA4-06-01', type: 'commande', niveau: 2,
          enonce: 'Sans sudo, lance un `bash` dans un nouvel espace utilisateur où tu apparais comme root.',
          accepte: ['unshare --user --map-root-user bash', 'unshare -U -r bash', 'unshare -Ur bash', 'unshare -rU bash', 'unshare --user --map-root-user', 'unshare -Ur', 'unshare -r bash', 'unshare --map-root-user bash'],
          exemple: 'unshare --user --map-root-user bash',
          indices: ['unshare, espace user.', 'Une option fait correspondre ton UID à 0.', '--map-root-user (ou -r).'],
          solution: '```\n$ unshare --user --map-root-user bash\n# id\nuid=0(root) gid=0(root) groups=0(root)\n```',
        },
        {
          id: 'cA4-06-02', type: 'sortie', niveau: 2,
          enonce: 'Léa (UID 1002) lance `unshare --user --map-root-user cat /proc/self/uid_map`. Que valent les trois nombres affichés ? (sépare-les par des espaces)',
          attendu: '0 1002 1',
          indices: ['UID dans l’espace, UID dehors, nombre.', 'Seul root (0) est défini.', 'Il correspond à Léa.'],
          solution: '`0 1002 1` : l’UID 0 de l’espace correspond à l’UID 1002 de l’hôte, pour une seule valeur.',
        },
        {
          id: 'cA4-06-03', type: 'qcm', niveau: 2,
          enonce: 'Dans `unshare --user --map-root-user bash`, Léa est « root » mais ne peut pas modifier /etc/passwd. Pourquoi ?',
          choix: [
            'Ses capacités ne valent que dans son espace user ; sur les fichiers de l’hôte, elle reste l’UID 1002',
            'SELinux bloque toujours les espaces user',
            'Le fichier est verrouillé par systemd',
            'Il faut ajouter --fork',
          ],
          reponse: 0,
          indices: ['Que vaut l’UID 0 vu de l’hôte ?', 'Les fichiers appartiennent à l’espace initial.', 'Capacités limitées à l’espace.'],
          solution: 'Le root de l’espace est l’UID 1002 sur l’hôte ; ses capacités ne s’appliquent qu’aux ressources créées dans son espace. Les fichiers de l’hôte restent protégés par les permissions habituelles.',
        },
        {
          id: 'cA4-06-04', type: 'commande', niveau: 2,
          enonce: 'Permets au programme `/usr/local/bin/vitrine` d’écouter sur un port inférieur à 1024 sans le lancer en root.',
          accepte: ['(sudo )?setcap ["\']?cap_net_bind_service=\\+?ep["\']? /usr/local/bin/vitrine', '(sudo )?setcap ["\']?cap_net_bind_service\\+ep["\']? /usr/local/bin/vitrine'],
          exemple: 'setcap cap_net_bind_service=+ep /usr/local/bin/vitrine',
          indices: ['On attache une capacité à un fichier.', 'setcap.', 'La capacité de lier un port privilégié : cap_net_bind_service.'],
          solution: '```\n$ sudo setcap cap_net_bind_service=+ep /usr/local/bin/vitrine\n$ getcap /usr/local/bin/vitrine\n/usr/local/bin/vitrine cap_net_bind_service=ep\n```\nPour un service systemd, on préfère `AmbientCapabilities=CAP_NET_BIND_SERVICE` dans l’unité.',
        },
        {
          id: 'cA4-06-05', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'newuidmap est le programme qui écrit les plages de /etc/subuid dans uid_map pour Podman rootless.', vrai: true },
            { texte: 'CAP_SYS_ADMIN est une capacité très large, qu’on évite d’accorder.', vrai: true },
            { texte: 'Un processus root dans un espace user peut configurer les interfaces réseau de l’hôte.', vrai: false },
            { texte: 'getpcaps affiche les capacités d’un processus.', vrai: true },
          ],
          indices: ['new…map = setuid.', 'Une seule fausse.', 'Capacités limitées à l’espace.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Les espaces de noms ?', r: 'mnt, uts, ipc, pid, net, user, cgroup, time.' },
    { q: 'Même espace ?', r: 'Même numéro dans `readlink /proc/PID/ns/TYPE` ; `lsns`.' },
    { q: 'PID 1 avec unshare ?', r: '`unshare --pid --fork --mount-proc cmd`' },
    { q: 'Entrer dans le réseau d’un conteneur ?', r: '`nsenter -t PID -n ss -ltnp`' },
    { q: 'Relier un espace réseau ?', r: '`ip netns add N` ; `ip link add a type veth peer name b` ; `ip link set b netns N` ; adresses, up, route.' },
    { q: 'chroot suffit-il ?', r: 'Non : root garde ses pouvoirs ; il faut espaces de noms, capacités, MAC.' },
    { q: 'Limite mémoire à la main ?', r: '`mkdir /sys/fs/cgroup/g ; echo 64M > g/memory.max ; echo PID > g/cgroup.procs`' },
    { q: 'Contrôleur absent dans un sous-groupe ?', r: '`echo +memory > parent/cgroup.subtree_control`' },
    { q: 'Limites via systemd ?', r: '`systemd-run --scope -p MemoryMax= -p CPUQuota= -p TasksMax=` ; `systemctl set-property`.' },
    { q: 'Root sans être root ?', r: '`unshare --user --map-root-user` ; uid_map ; /etc/subuid + newuidmap pour plusieurs UID.' },
    { q: 'Port < 1024 sans root ?', r: '`setcap cap_net_bind_service=+ep prog` ou AmbientCapabilities.' },
  ],
  memo: `
    ### Espaces de noms
    \`\`\`
    ls -l /proc/$$/ns   lsns [-t net]   unshare --uts|--ipc|--net|--pid --fork --mount-proc|--user --map-root-user CMD
    unshare --pid --fork --mount --uts --net --ipc --root=/srv/mini/rootfs --mount-proc /bin/sh
    nsenter -t PID -n ss -ltnp   nsenter -t PID -a sh
    \`\`\`
    ### Réseau
    \`\`\`
    ip netns add cave ; ip link add veth-hote type veth peer name veth-cave ; ip link set veth-cave netns cave
    ip addr add 10.99.0.1/24 dev veth-hote ; ip link set veth-hote up
    ip -n cave addr add 10.99.0.2/24 dev veth-cave ; ip -n cave link set veth-cave up ; ip -n cave link set lo up
    ip -n cave route add default via 10.99.0.1 ; ip netns exec cave ping -c1 10.99.0.1 ; ip netns del cave
    \`\`\`
    ### cgroups v2
    \`\`\`
    cat /sys/fs/cgroup/cgroup.controllers   mkdir /sys/fs/cgroup/g   echo +memory > /sys/fs/cgroup/cgroup.subtree_control
    echo 64M > g/memory.max   echo "50000 100000" > g/cpu.max   echo 20 > g/pids.max   echo PID > g/cgroup.procs
    systemd-run --scope -p MemoryMax=64M -p CPUQuota=50% -p TasksMax=20 -- CMD   systemctl set-property U MemoryMax=…
    \`\`\`
    ### Utilisateurs et capacités
    \`\`\`
    cat /proc/self/uid_map   /etc/subuid /etc/subgid   getpcaps PID   capsh --decode=HEX   setcap cap_net_bind_service=+ep PROG
    \`\`\`
  `,
});
