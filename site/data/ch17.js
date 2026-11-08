/* Chapitre 17 : Virtualization (livre p. 401–418). */
HLW.chapitre({
  id: '17',
  num: 17,
  intro: `
    Tu pratiques déjà la virtualisation tous les jours : tes machines cuve, fut et douane sont des **machines
    virtuelles** sur ton hôte Proxmox. Ce chapitre explique ce qui se passe dessous (hyperviseur, matériel virtuel,
    paravirtualisation), puis passe aux **conteneurs**, qui isolent des processus en partageant le **même noyau**.

    Tu y retrouveras des briques vues tout au long du livre : les cgroups (chapitre 8), les systèmes de fichiers
    (chapitre 4), les interfaces et le NAT (chapitre 9). Les exemples utilisent **Podman**, installé d’office sur
    Rocky et compatible avec les commandes Docker du livre. Le Lab 12 et le module A4 iront plus loin, jusqu’à
    construire un conteneur à la main.
  `,
  objectifs: [
    'distinguer hyperviseurs de type 1 et 2, invité et hôte, émulation et paravirtualisation (virtio) ;',
    'expliquer ce qu’est un conteneur : namespaces, cgroups, système de fichiers en couches, un seul noyau ;',
    'construire une image, lancer un conteneur et observer son isolation (PID 1, overlay) ;',
    'comprendre le réseau des conteneurs (pont, paire veth, NAT, mode rootless) et nettoyer conteneurs et images ;',
    'situer LXC, Kubernetes et les environnements virtuels Python, et connaître les pièges des conteneurs.',
  ],
  certifs: { lpic1: ['102.6'], lfcs: ['OD'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '17.1',
      titre: 'Machines virtuelles et hyperviseurs',
      sections: '§17.1', pages: '401–405',
      objectif: 'Comprendre ce que fait un hyperviseur et reconnaître le matériel virtuel depuis un invité.',
      rappel: `
        Une **machine virtuelle** (VM) est un ordinateur complet (processeur, mémoire, disques, cartes réseau) créé par
        logiciel, qui fait tourner son propre système, **noyau compris**. Le logiciel qui gère les VM est
        l’**hyperviseur** (ou VMM). La VM est l’**invité** (*guest*), ce qui fait tourner l’hyperviseur est l’**hôte**.

        | Type | Principe | Exemples |
        |---|---|---|
        | **1** | l’hyperviseur est (presque) le système lui-même | Xen, VMware ESXi, Hyper-V ; KVM, qui fait du noyau Linux un hyperviseur (Proxmox) |
        | **2** | une application sur un système ordinaire | VirtualBox, VMware Workstation |

        Un **émulateur** simule tout en logiciel (lent) ; la virtualisation moderne s’appuie sur le processeur
        (**VT-x** chez Intel, **AMD-V** chez AMD) pour faire tourner le noyau invité presque à pleine vitesse.

        ### Le matériel virtuel

        Émuler un vrai contrôleur de disque ou une vraie carte réseau coûte cher. La **paravirtualisation** donne à
        l’invité des pilotes qui parlent directement à l’hyperviseur : sous KVM, ce sont les périphériques **virtio**
        (\`/dev/vda\` pour un disque virtio-blk, \`/dev/sda\` avec virtio-scsi, pilote réseau \`virtio_net\`). Le but :
        que l’invité utilise ses outils habituels (partitions, systèmes de fichiers) sans rien savoir.

        \`\`\`
        $ systemd-detect-virt                 # kvm, vmware, oracle… ou none
        $ lscpu | grep -i virtualization      # sur l'hôte : VT-x ou AMD-V
        $ ethtool -i eth0 | head -1           # driver: virtio_net
        $ lsblk -d -o NAME,MODEL,SERIAL       # disques virtuels (les tiens : hlw-lab-N)
        \`\`\`

        **Usages** : tests, autres systèmes, serveurs et cloud (toute instance cloud est une VM sur un hyperviseur de
        type 1). **Inconvénients** (§17.1.4) : installation et démarrage lents, un système complet à maintenir par VM,
        conflits de dépendances, coût d’une VM par service.
      `,
      aRetenir: [
        'Hyperviseur (VMM) ; invité / hôte ; type 1 (Xen, ESXi, KVM/Proxmox) vs type 2 (VirtualBox).',
        'VT-x / AMD-V ; paravirtualisation : virtio (vda, virtio_net).',
        '`systemd-detect-virt`, `lscpu`, `ethtool -i`.',
        'VM = système complet à maintenir, démarrage lent.',
      ],
      exercices: [
        {
          id: 'c17-01-01', type: 'association', niveau: 1, ref: '§17.1.1, p. 402',
          enonce: 'Associe chaque terme à sa définition.',
          paires: [['Hyperviseur', 'Logiciel qui gère les machines virtuelles'], ['Invité', 'La machine virtuelle et son système'], ['Hôte', 'Ce qui fait tourner l’hyperviseur'], ['Paravirtualisation', 'Pilotes de l’invité qui parlent directement à l’hyperviseur']],
          indices: ['guest = invité.', 'host = hôte.', 'para = à côté : on contourne l’émulation.'],
          solution: 'Hyperviseur gère les VM ; invité = VM ; hôte = support de l’hyperviseur ; paravirtualisation = pilotes coopératifs (virtio).',
        },
        {
          id: 'c17-01-02', type: 'commande', niveau: 1,
          enonce: 'Depuis cuve, affiche la technologie de virtualisation détectée par systemd.',
          accepte: ['systemd-detect-virt( -v| --vm)?'],
          exemple: 'systemd-detect-virt',
          indices: ['Un outil systemd « detect ».', 'systemd-detect-…', '`systemd-detect-virt`'],
          solution: '```\n$ systemd-detect-virt\nkvm\n```\nDans un conteneur, `systemd-detect-virt -c` affiche par exemple `podman` ou `lxc`.',
        },
        {
          id: 'c17-01-03', type: 'qcm', niveau: 2, ref: '§17.1.1',
          enonce: 'Proxmox VE fait tourner tes VM avec KVM et QEMU, sur une Debian. Comment le classer ?',
          choix: [
            'Plutôt un hyperviseur de type 1 : KVM, module du noyau, fait du noyau Linux de l’hôte l’hyperviseur',
            'Un hyperviseur de type 2, comme VirtualBox',
            'Un émulateur pur, sans aide du processeur',
            'Un système de conteneurs uniquement',
          ],
          reponse: 0,
          indices: ['KVM est dans le noyau.', 'Le noyau de l’hôte joue le rôle d’hyperviseur.', 'QEMU fournit les périphériques virtuels.'],
          solution: 'KVM transforme le noyau Linux en hyperviseur (on le range généralement en type 1), QEMU émule ou paravirtualise les périphériques. Proxmox gère aussi des conteneurs LXC (fiche 17.5).',
        },
        {
          id: 'c17-01-04', type: 'vrai-faux', niveau: 2, ref: '§17.1.2–17.1.4',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Une machine virtuelle fait tourner son propre noyau.', vrai: true },
            { texte: 'VT-x et AMD-V sont des extensions du processeur qui facilitent la virtualisation.', vrai: true },
            { texte: 'Un disque virtio s’utilise avec des outils spéciaux, pas avec fdisk ni mkfs.', vrai: false, explication: 'Le but est que l’invité le traite comme un disque ordinaire.' },
            { texte: 'Chaque VM est un système complet à mettre à jour.', vrai: true },
          ],
          indices: ['Système virtuel complet.', 'Une seule fausse.', 'La virtualisation doit rester transparente.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
        {
          id: 'c17-01-05', type: 'terminal', niveau: 1,
          enonce: 'Sur cuve : `systemd-detect-virt`, `ethtool -i eth0 | head -1`, `lsblk -d -o NAME,MODEL,SERIAL`. Colle la sortie. Quels indices montrent que tu es dans une VM ?',
          attendu: ['kvm|virtio|QEMU'],
          indices: ['systemd-detect-virt répond kvm.', 'Le pilote réseau est virtio_net.', 'Le modèle de disque contient QEMU.'],
          solution: '`kvm`, `driver: virtio_net`, des disques `QEMU HARDDISK` (virtio-scsi) avec les numéros de série que Proxmox a définis (`hlw-lab-1`…).',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '17.2',
      titre: 'Les conteneurs : principe, Docker et Podman',
      sections: '§17.2 et 17.2.1', pages: '405–407',
      objectif: 'Savoir de quoi est fait un conteneur et ce qui distingue Docker de Podman.',
      rappel: `
        Les ancêtres : **chroot** (changer la racine d’un processus : il ne voit plus que ce répertoire) et les
        **limites de ressources** (rlimit). Un **conteneur** pousse l’idée plus loin : un **environnement d’exécution
        restreint** pour un groupe de processus, qui ne peuvent rien toucher en dehors. On parle de virtualisation au
        niveau du système d’exploitation.

        **Un seul noyau** : celui de l’hôte. Mais l’espace utilisateur du conteneur peut venir d’une autre distribution
        (Alpine dans une Rocky…). Les processus d’un conteneur ont :

        | Propriété | Fonction du noyau |
        |---|---|
        | leurs propres cgroups (limites CPU, mémoire) | **cgroups** (chapitre 8) |
        | leur propre système de fichiers et périphériques | **namespace mount** + système de fichiers en couches |
        | aucune vue sur les autres processus | **namespace PID** |
        | leurs propres interfaces réseau | **namespace réseau** |
        | (et aussi nom d’hôte, IPC, identités) | namespaces UTS, IPC, **user** |

        \`\`\`
        $ lsns                      # namespaces existants
        $ ls -l /proc/$$/ns         # ceux de ton shell
        \`\`\`

        ### Docker et Podman

        - **Docker** : un démon, **dockerd**, fait le travail en root. Être dans le groupe \`docker\` revient à être
          **root** sur la machine (on peut monter \`/\` dans un conteneur).
        - **Podman** : **sans démon** ; peut tourner en simple utilisateur (**rootless**), grâce au namespace user
          (le root du conteneur est ton UID sur l’hôte ; plages \`/etc/subuid\`, \`/etc/subgid\`). Ses commandes sont
          compatibles : \`podman\` remplace \`docker\` dans tous les exemples.

        \`\`\`
        # dnf install podman            # fut (souvent déjà présent)
        # apt install podman            # cuve
        $ podman info --format '{{.Host.Security.Rootless}}'
        \`\`\`
      `,
      aRetenir: [
        'Conteneur = processus restreints ; un seul noyau (celui de l’hôte).',
        'Briques : namespaces (PID, mount, réseau, UTS, IPC, user), cgroups, système de fichiers en couches.',
        'Docker : démon dockerd, root ; groupe docker = root.',
        'Podman : sans démon, rootless (subuid/subgid), compatible Docker.',
      ],
      exercices: [
        {
          id: 'c17-02-01', type: 'association', niveau: 2, ref: '§17.2, p. 406',
          enonce: 'Associe chaque propriété d’un conteneur à la fonction du noyau qui la fournit.',
          paires: [
            ['Limiter la mémoire et le CPU', 'cgroups'],
            ['Ne voir que ses propres processus', 'Namespace PID'],
            ['Avoir ses propres interfaces réseau', 'Namespace réseau'],
            ['Être root dans le conteneur sans l’être sur l’hôte', 'Namespace user'],
          ],
          indices: ['Limiter = contrôle de ressources.', 'PID = processus.', 'user = correspondance des identités.'],
          solution: 'Ressources → cgroups ; processus → PID ; interfaces → réseau ; root non privilégié → user.',
        },
        {
          id: 'c17-02-02', type: 'qcm', niveau: 2, ref: '§17.2',
          enonce: 'Un conteneur Alpine tourne sur fut (Rocky 10). Quel noyau utilise-t-il ?',
          choix: ['Celui de fut : un conteneur partage le noyau de l’hôte', 'Un noyau Alpine embarqué dans l’image', 'Un noyau émulé par Podman', 'Aucun noyau'],
          reponse: 0,
          indices: ['Un conteneur n’est pas une VM.', 'L’image contient l’espace utilisateur.', 'Compare `uname -r` dedans et dehors.'],
          solution: 'Le noyau de l’hôte : `uname -r` affiche la même version dans le conteneur et sur fut. Seul l’espace utilisateur (bibliothèques, commandes) vient d’Alpine.',
        },
        {
          id: 'c17-02-03', type: 'qcm', niveau: 2, ref: '§17.2.1, p. 406–407',
          enonce: 'Un développeur demande à être ajouté au groupe `docker` « juste pour lancer des conteneurs ». Quel est le risque ?',
          choix: [
            'C’est équivalent à lui donner root : il peut lancer un conteneur qui monte / de l’hôte en écriture',
            'Aucun, le groupe docker est sans privilège',
            'Il pourra seulement voir les autres conteneurs',
            'Il pourra arrêter le démon, rien de plus',
          ],
          reponse: 0,
          indices: ['dockerd tourne en root et obéit aux membres du groupe.', '`docker run -v /:/hote …`', 'Préférer Podman rootless.'],
          solution: 'Le démon tourne en root et exécute ce qu’on lui demande : `docker run -v /:/h -it alpine` donne un accès complet à l’hôte. Podman rootless évite ce problème.',
        },
        {
          id: 'c17-02-04', type: 'commande', niveau: 1,
          enonce: 'Liste les namespaces présents sur la machine.',
          accepte: ['(sudo )?lsns( -t \\w+)?', '(sudo )?lsns --output.*'],
          exemple: 'lsns',
          indices: ['Comme lsblk, lscpu, lsof…', 'ls + ns.', '`lsns`'],
          solution: '```\n$ sudo lsns\n        NS TYPE   NPROCS   PID USER   COMMAND\n4026531835 cgroup    120     1 root   /sbin/init\n4026531836 pid       118     1 root   /sbin/init\n...\n```\nSans sudo, tu ne vois que tes propres processus.',
        },
        {
          id: 'c17-02-05', type: 'vrai-faux', niveau: 2, ref: '§17.2–17.2.1',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'chroot est un ancêtre des conteneurs : il change la racine vue par un processus.', vrai: true },
            { texte: 'Podman a besoin d’un démon qui tourne en permanence.', vrai: false },
            { texte: 'En mode rootless, le root d’un conteneur correspond à ton UID sur l’hôte.', vrai: true },
            { texte: 'Les commandes podman sont en grande partie compatibles avec docker.', vrai: true },
          ],
          indices: ['chroot = change root.', 'Une seule fausse.', 'Le namespace user fait la correspondance.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '17.3',
      titre: 'Image, conteneur, PID 1 et overlay',
      sections: '§17.2.2 (1ʳᵉ partie)', pages: '407–411',
      objectif: 'Construire une image, lancer un conteneur et observer ce qui le rend isolé.',
      rappel: `
        Une **image** est un système de fichiers (plus quelques métadonnées) ; un **conteneur** est une instance
        d’image dans laquelle tournent des processus. On part presque toujours d’une image publique.

        \`\`\`
        # Containerfile (Podman lit aussi « Dockerfile »)
        FROM docker.io/library/alpine:3.22
        RUN apk add --no-cache bash
        CMD ["/bin/bash"]
        \`\`\`

        \`\`\`
        $ podman build -t hlw_test .        # construire et nommer (tag) l'image
        $ podman images                     # hlw_test et alpine
        $ podman run -it hlw_test           # -i interactif, -t terminal → invite bash dans le conteneur
        \`\`\`

        - Chaque instruction crée une **couche** (image intermédiaire). \`RUN\` s’exécute **pendant la construction**
          (dans un conteneur temporaire), \`CMD\` est la commande par défaut **au lancement**.
        - Sans \`-it\`, bash n’a pas de terminal et le conteneur s’arrête aussitôt.

        ### PID 1

        Dans le conteneur, \`ps aux\` ne montre que deux processus : **bash avec le PID 1** et \`ps\`. Vu de l’hôte, ce
        bash est un processus ordinaire avec un autre PID : c’est le **namespace PID**.

        ### Le système de fichiers en couches (overlay)

        \`mount\` dans le conteneur montre \`overlay on / type overlay (lowerdir=…,upperdir=…,workdir=…)\` :

        - **lowerdir** : les couches de l’image, en lecture seule, empilées (la dernière de la liste est la base) ;
        - **upperdir** : la couche du conteneur, où vont **toutes les modifications** ;
        - **workdir** : répertoire de travail du pilote.

        En rootless, Podman utilise l’overlay natif du noyau (ou \`fuse-overlayfs\` sur les anciens noyaux) ; les
        couches sont sous \`~/.local/share/containers/storage\` (en root : \`/var/lib/containers\`). Plusieurs conteneurs
        d’une même image partagent les couches basses.
      `,
      aRetenir: [
        'Image = système de fichiers en couches ; conteneur = instance qui exécute des processus.',
        'FROM, RUN (à la construction), CMD (au lancement) ; `podman build -t nom .`, `podman images`, `podman run -it nom`.',
        'Namespace PID : la commande du conteneur est PID 1 ; autre PID vu de l’hôte.',
        'overlay : lowerdir (image, lecture seule), upperdir (modifications), workdir.',
      ],
      exercices: [
        {
          id: 'c17-03-01', type: 'commande', niveau: 1, ref: '§17.2.2, p. 407',
          enonce: 'Construis l’image décrite par le Containerfile du répertoire courant, et nomme-la `hlw_test`.',
          accepte: ['(podman|docker) build -t ?hlw_test(:latest)? \\.', '(podman|docker) build --tag[ =]hlw_test(:latest)? \\.', '(podman|docker) build \\. -t ?hlw_test(:latest)?', '(podman|docker) image build -t ?hlw_test(:latest)? \\.', 'buildah (bud|build) -t ?hlw_test(:latest)? \\.'],
          exemple: 'podman build -t hlw_test .',
          pieges: [{ motif: '(podman|docker) build -t ?hlw_test', message: 'Il manque le contexte de construction : le point final (répertoire courant).' }],
          indices: ['Sous-commande build.', '-t donne le nom (tag).', 'Le point désigne le répertoire courant.'],
          solution: '```\n$ podman build -t hlw_test .\n```',
        },
        {
          id: 'c17-03-02', type: 'qcm', niveau: 2, ref: '§17.2.2, p. 409',
          enonce: 'Dans un Containerfile, quelle est la différence entre `RUN apk add bash` et `CMD ["/bin/bash"]` ?',
          choix: [
            'RUN s’exécute pendant la construction de l’image ; CMD est la commande lancée au démarrage d’un conteneur',
            'Les deux s’exécutent à chaque démarrage',
            'RUN s’exécute sur l’hôte, CMD dans le conteneur',
            'CMD installe des paquets, RUN lance le programme principal',
          ],
          reponse: 0,
          indices: ['L’un modifie l’image, l’autre la configure.', 'L’installation de bash est enregistrée dans une couche.', 'CMD est pour l’exécution.'],
          solution: 'RUN : exécuté une fois, dans un conteneur temporaire, à la construction ; le résultat devient une couche. CMD : commande par défaut de chaque conteneur lancé depuis l’image.',
        },
        {
          id: 'c17-03-03', type: 'sortie', niveau: 2, ref: '§17.2.2, p. 410',
          enonce: 'Dans le conteneur lancé par `podman run -it hlw_test`, tu tapes `ps -o pid,comm`. Que vaut le PID de bash ? (réponds par le nombre)',
          attendu: '1',
          indices: ['Namespace PID.', 'Le premier processus d’un nouvel espace de PID.', 'Comme init sur un système normal.'],
          solution: '**1** : bash est le premier processus du nouveau namespace PID. Sur l’hôte, `ps` le montre avec un PID ordinaire (par exemple 20189).',
        },
        {
          id: 'c17-03-04', type: 'association', niveau: 2, ref: '§17.2.2, p. 410–411',
          enonce: 'Associe chaque répertoire du montage overlay à son rôle.',
          paires: [['lowerdir', 'Couches de l’image, en lecture seule'], ['upperdir', 'Modifications faites dans le conteneur'], ['workdir', 'Espace de travail interne du pilote']],
          indices: ['lower = en dessous.', 'upper = au-dessus, là où l’on écrit.', 'work = travail.'],
          solution: 'lowerdir image (lecture seule), upperdir modifications, workdir travail interne (doit être vide au montage).',
        },
        {
          id: 'c17-03-05', type: 'terminal', niveau: 2,
          enonce: 'Sur fut, en simple utilisateur : construis `hlw_test` (Containerfile ci-dessus), lance `podman run --rm hlw_test sh -c "ps -o pid,comm; uname -r; cat /etc/os-release | head -2"`, puis `uname -r` sur l’hôte. Colle la sortie.',
          attendu: ['Alpine|alpine'],
          indices: ['--rm supprime le conteneur à la fin.', 'Compare les deux uname -r.', 'os-release vient de l’image.'],
          solution: 'Dans le conteneur : `sh` en PID 1, `os-release` d’**Alpine**, mais **la même version de noyau** que fut. L’isolation est faite par le noyau de l’hôte.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '17.4',
      titre: 'Réseau et exploitation des conteneurs',
      sections: '§17.2.2 (2ᵉ partie)', pages: '411–414',
      objectif: 'Comprendre le réseau d’un conteneur et garder une machine propre.',
      rappel: `
        ### Réseau en pont (mode root)

        Par défaut, chaque conteneur reçoit un **namespace réseau** presque vide (seulement \`lo\`). Le moteur crée
        sur l’hôte un **pont** (\`docker0\` pour Docker, \`podman0\` pour Podman) sur un réseau privé
        (172.17.0.0/16 chez Docker, 10.88.0.0/16 chez Podman), puis une **paire veth** : une extrémité dans le
        conteneur (appelée \`eth0\`), l’autre branchée sur le pont. Un **NAT** sur l’hôte permet aux conteneurs de
        sortir (chapitre 9). Attention aux conflits entre ce réseau privé et celui de ton routeur.

        **Rootless** : créer une veth demande root. Podman relie le namespace au monde extérieur en espace utilisateur
        (\`slirp4netns\` dans le livre, **pasta** avec Podman 5). Les conteneurs ne se voient pas entre eux, sauf dans
        un même réseau ou un même *pod*.

        Publier un port : \`podman run -d -p 8080:80 docker.io/library/nginx\` (port 8080 de l’hôte → 80 du conteneur).
        En rootless, pas de port inférieur à 1024.

        ### Cycle de vie et nettoyage

        Un conteneur est « en cours » tant qu’un processus y tourne. Ensuite, il reste à l’état **Exited** avec ses
        modifications, sauf avec **\`--rm\`**.

        \`\`\`
        $ podman ps              # conteneurs en cours
        $ podman ps -a           # tous, y compris arrêtés
        $ podman rm ID|nom       # supprimer un conteneur
        $ podman images          # dont les anciennes versions <none>
        $ podman rmi hlw_test    # supprimer une image
        $ podman system df       # place occupée ; podman system prune pour faire le ménage
        \`\`\`

        ### PID 1 et processus zombies

        Le PID 1 doit **récupérer** (wait) ses enfants terminés. Un programme qui ne s’y attend pas laisse des zombies :
        \`podman run --init\` ajoute un petit init (catatonit/tini) en PID 1. Pour plusieurs services, un gestionnaire
        comme **supervisord**, ou mieux, un conteneur par service.
      `,
      aRetenir: [
        'Namespace réseau + paire veth + pont (docker0, podman0) + NAT ; rootless : slirp4netns / pasta.',
        '`-p hôte:conteneur` pour publier ; rootless : pas de port < 1024.',
        '`ps -a`, `rm`, `--rm`, `images`, `rmi`, `system df`, `system prune`.',
        '`--init` si le PID 1 ne récupère pas ses enfants.',
      ],
      exercices: [
        {
          id: 'c17-04-01', type: 'commande', niveau: 1, ref: '§17.2.2, p. 413',
          enonce: 'Liste **tous** les conteneurs, y compris ceux qui sont arrêtés.',
          accepte: ['(podman|docker) ps -a', '(podman|docker) ps --all', '(podman|docker) container ls -a', '(podman|docker) container list -a', '(podman|docker) container ls --all'],
          exemple: 'podman ps -a',
          indices: ['ps seul ne montre que ceux qui tournent.', 'Une option « all ».', '`podman ps -a`'],
          solution: '```\n$ podman ps -a\nCONTAINER ID  IMAGE                       COMMAND    STATUS                    NAMES\n3f2c…         localhost/hlw_test:latest   /bin/bash  Exited (0) 2 minutes ago  boring_lovelace\n```',
        },
        {
          id: 'c17-04-02', type: 'commande', niveau: 2,
          enonce: 'Lance en arrière-plan un conteneur `nginx` (image `docker.io/library/nginx`) nommé `vitrine`, en publiant son port 80 sur le port **8080** de l’hôte.',
          accepte: [
            '(podman|docker) run -d (--name[ =]vitrine -p ?8080:80|-p ?8080:80 --name[ =]vitrine) docker\\.io/library/nginx(:\\S+)?',
            '(podman|docker) run (--name[ =]vitrine -d -p ?8080:80|--name[ =]vitrine -p ?8080:80 -d|-p ?8080:80 -d --name[ =]vitrine|-p ?8080:80 --name[ =]vitrine -d) docker\\.io/library/nginx(:\\S+)?',
            '(podman|docker) run (--detach|-d) --name[ =]vitrine (--publish|-p)[ =]8080:80 (docker\\.io/library/)?nginx(:\\S+)?',
          ],
          exemple: 'podman run -d --name vitrine -p 8080:80 docker.io/library/nginx',
          pieges: [{ motif: '.*-p ?80:8080.*', message: 'L’ordre est hôte:conteneur : 8080:80.' }],
          indices: ['-d détache, --name nomme.', '-p hôte:conteneur.', '`podman run -d --name vitrine -p 8080:80 docker.io/library/nginx`'],
          solution: '```\n$ podman run -d --name vitrine -p 8080:80 docker.io/library/nginx\n$ curl -sI http://localhost:8080 | head -1\nHTTP/1.1 200 OK\n```',
        },
        {
          id: 'c17-04-03', type: 'ordre', niveau: 2, ref: '§17.2.2, p. 411–412',
          enonce: 'Remets dans l’ordre la façon dont un moteur en mode root relie un nouveau conteneur au réseau (mode pont).',
          elements: ['Créer un namespace réseau vide (seulement lo)', 'Créer une paire veth', 'Placer une extrémité dans le conteneur (eth0) et brancher l’autre sur le pont', 'Donner une adresse privée au eth0 du conteneur', 'Le NAT de l’hôte permet de sortir vers Internet'],
          indices: ['D’abord l’espace isolé.', 'Puis le « câble » virtuel à deux bouts.', 'Enfin l’adressage et la sortie.'],
          solution: 'Namespace vide → paire veth → une extrémité dans le conteneur, l’autre sur le pont → adresse privée → NAT.',
        },
        {
          id: 'c17-04-04', type: 'qcm', niveau: 2, ref: '§17.2.2, p. 413',
          enonce: 'Le disque de fut se remplit. `podman ps` n’affiche rien, pourtant `podman system df` indique 6 Go de conteneurs. Explication ?',
          choix: [
            'Des conteneurs arrêtés (Exited) gardent leurs couches modifiées : `podman ps -a` les montre, `podman rm` ou `podman container prune` les supprime',
            'podman system df se trompe',
            'Les images sont toujours comptées comme conteneurs',
            'Les journaux de systemd sont dans les conteneurs',
          ],
          reponse: 0,
          indices: ['ps sans option cache quelque chose.', 'Un conteneur terminé n’est pas supprimé.', '--rm évite l’accumulation.'],
          solution: 'Les conteneurs arrêtés restent, avec leur couche upperdir. `podman ps -a`, puis `podman rm …` ou `podman container prune`. À l’avenir : `--rm` pour les conteneurs jetables.',
        },
        {
          id: 'c17-04-05', type: 'vrai-faux', niveau: 2, ref: '§17.2.2, p. 413–414',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Retaguer une nouvelle image hlw_test supprime automatiquement l’ancienne.', vrai: false, explication: 'L’ancienne perd son nom et apparaît en <none>.' },
            { texte: '`--init` place un petit processus init en PID 1, qui récupère les enfants terminés.', vrai: true },
            { texte: 'On peut faire tourner plusieurs processus dans un même conteneur.', vrai: true },
            { texte: 'En rootless, un conteneur ne peut pas publier directement le port 80 de l’hôte (sans réglage particulier).', vrai: true },
          ],
          indices: ['<none> = ancienne image sans nom.', 'Une seule fausse.', 'Ports privilégiés < 1024.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '17.5',
      titre: 'LXC, Kubernetes, pièges et environnements virtuels',
      sections: '§17.2.3 à 17.3', pages: '414–418',
      objectif: 'Situer les autres approches et savoir quand un conteneur n’est pas la bonne réponse.',
      rappel: `
        ### LXC

        **LXC** (dont les premières versions de Docker dépendaient) vise un conteneur proche d’un **système complet**,
        init compris, avec plus de réglages manuels (réseau, correspondance des UID) et sans couches par défaut.
        **LXD** (et son fork **Incus**) l’administre plus facilement. Les **CT** de Proxmox sont des conteneurs LXC.

        ### Kubernetes

        Gérer des dizaines de conteneurs sur plusieurs machines (placement, redémarrage, réseau, mises à jour
        progressives) : c’est le rôle d’un **orchestrateur**. **Kubernetes** domine ; il fait tourner les images
        Docker/OCI. Le gros du travail est l’écriture de la configuration (YAML). Pour essayer : Minikube, k3s, kind.

        ### Pièges des conteneurs (§17.2.5)

        - Il faut toujours des **machines** à maintenir dessous.
        - **Stockage** : chaque image embarque son espace utilisateur ; les couches supérieures grossissent.
        - **Ressources** : un seul noyau, mêmes disques ; fixer des limites (\`--memory\`, \`--cpus\`).
        - **Données** : les modifications d’un conteneur disparaissent avec lui → **volumes**
          (\`-v /srv/data:/data:Z\`) et un service de **journaux** séparé.
        - **Versions** : \`latest\` change sous tes pieds → étiquettes précises (\`alpine:3.22\`), voire empreinte.
        - **Confiance** : une image publique est du code que tu exécutes ; préfère les images officielles, ou construis
          les tiennes.

        ### Virtualisation à l’exécution : venv Python

        Un **environnement virtuel** isole les bibliothèques d’**une** application, sans VM ni conteneur :

        \`\`\`
        # apt install python3-venv         # Debian (déjà inclus sur Rocky)
        $ python3 -m venv ~/venvs/releve
        $ . ~/venvs/releve/bin/activate     # sourcer : on modifie l'environnement du shell (fiche 11.8)
        (releve) $ pip install requests     # installé dans le venv, pas dans le système
        (releve) $ deactivate
        \`\`\`

        \`activate\` règle \`PATH\` et \`VIRTUAL_ENV\`. Sur Debian 13, \`pip install\` hors venv est refusé
        (*externally-managed-environment*) : c’est voulu.
      `,
      aRetenir: [
        'LXC : conteneur « système complet » (CT Proxmox) ; LXD/Incus pour l’administrer.',
        'Kubernetes : orchestration de conteneurs sur plusieurs machines.',
        'Pièges : machines sous-jacentes, stockage, ressources, données (volumes), versions (pas latest), confiance.',
        'venv : `python3 -m venv rép`, `. rép/bin/activate`, `deactivate`.',
      ],
      exercices: [
        {
          id: 'c17-05-01', type: 'commande', niveau: 1, ref: '§17.3, p. 417',
          enonce: 'Crée un environnement virtuel Python dans le répertoire `releve-venv`.',
          accepte: ['python3? -m venv \\.?/?releve-venv/?', 'python3? -m venv --\\S+ \\.?/?releve-venv/?'],
          exemple: 'python3 -m venv releve-venv',
          pieges: [{ motif: '\\.?/?releve-venv/bin/activate', message: 'Cette commande active un environnement : il faut d’abord le créer.' }],
          indices: ['Le module venv de Python.', 'python3 -m nom_du_module.', '`python3 -m venv releve-venv`'],
          solution: '```\n$ python3 -m venv releve-venv\n$ . releve-venv/bin/activate\n```',
        },
        {
          id: 'c17-05-02', type: 'qcm', niveau: 2, ref: '§17.3, p. 417–418',
          enonce: 'Pourquoi faut-il **sourcer** `bin/activate` (`. bin/activate`) au lieu de l’exécuter (`./bin/activate`) ?',
          choix: [
            'Il modifie des variables (PATH, VIRTUAL_ENV) du shell courant ; exécuté, il ne changerait qu’un sous-processus qui disparaît aussitôt',
            'Il n’a pas le droit d’exécution',
            'Python refuse qu’on l’exécute',
            'C’est plus rapide',
          ],
          reponse: 0,
          indices: ['Un processus ne peut pas modifier l’environnement de son parent.', 'Fiche 11.8.', 'Sourcer = exécuter dans le shell courant.'],
          solution: 'Un script exécuté tourne dans un sous-shell : ses modifications de PATH disparaissent à sa fin. Sourcé, il modifie le shell courant.',
        },
        {
          id: 'c17-05-03', type: 'qcm', niveau: 2, ref: '§17.2.5, p. 416',
          enonce: 'L’application de caisse tourne dans un conteneur. Après une mise à jour (nouveau conteneur), toutes les ventes du jour ont disparu. Quelle erreur de conception ?',
          choix: [
            'Les données étaient écrites dans la couche du conteneur au lieu d’un volume persistant',
            'L’image était trop petite',
            'Le conteneur n’avait pas de namespace PID',
            'Il fallait utiliser l’étiquette latest',
          ],
          reponse: 0,
          indices: ['Que devient l’upperdir d’un conteneur supprimé ?', 'Les données doivent survivre au conteneur.', '-v pour monter un répertoire de l’hôte.'],
          solution: 'La couche supérieure disparaît avec le conteneur. Les données vont dans un **volume** (`-v /srv/caisse:/var/lib/caisse:Z` ou un volume nommé) ou dans une base de données externe.',
        },
        {
          id: 'c17-05-04', type: 'vrai-faux', niveau: 2, ref: '§17.2.3–17.2.5',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Les conteneurs (CT) de Proxmox reposent sur LXC.', vrai: true },
            { texte: 'Utiliser l’étiquette `latest` garantit une construction reproductible.', vrai: false, explication: 'latest change avec le temps : on fixe une version précise.' },
            { texte: 'Kubernetes sert à orchestrer des conteneurs sur plusieurs machines.', vrai: true },
            { texte: 'Un conteneur ne règle pas la lenteur de démarrage d’une application lente.', vrai: true },
          ],
          indices: ['Proxmox : VM (KVM) et CT (LXC).', 'Une seule fausse.', 'L’application reste la même.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
        {
          id: 'c17-05-05', type: 'association', niveau: 2, ref: '§17.1–17.3',
          enonce: 'Associe chaque besoin à la technique la plus adaptée.',
          paires: [
            ['Tester un autre noyau ou un autre système', 'Machine virtuelle'],
            ['Déployer la même application web en 20 exemplaires', 'Conteneurs orchestrés (Kubernetes)'],
            ['Un script Python qui a besoin d’une version précise de requests', 'Environnement virtuel Python (venv)'],
            ['Un système Linux complet léger sur Proxmox', 'Conteneur LXC'],
          ],
          indices: ['Un autre noyau exige une VM.', 'Beaucoup d’exemplaires : orchestration.', 'Une bibliothèque Python : venv.'],
          solution: 'Autre noyau → VM ; 20 exemplaires → conteneurs orchestrés ; bibliothèque Python → venv ; système complet léger → LXC.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '17.A',
      titre: 'Conteneurs en production : volumes, limites et Quadlet',
      auDela: true,
      objectif: 'Faire tourner un conteneur comme un vrai service : persistant, limité, géré par systemd.',
      rappel: `
        Cette fiche complète le livre avec l’exploitation de Podman sur un serveur (utile au Lab 12).

        ### Volumes, limites, redémarrage

        \`\`\`
        $ podman run -d --name caisse \\
            -v /srv/caisse:/var/lib/caisse:Z \\
            --memory 256m --cpus 0.5 \\
            -p 8080:8080 docker.io/library/python:3.13-slim python -m http.server 8080
        $ podman stats --no-stream                  # consommation par conteneur
        $ podman logs -f caisse                     # sortie du conteneur
        $ podman inspect caisse --format '{{.State.Pid}}'   # PID du conteneur vu de l'hôte
        \`\`\`

        \`-v …:Z\` : données persistantes (\`:Z\` pose l’étiquette SELinux) ; \`--memory\` et \`--cpus\` : limites par
        cgroup (chapitre 8).

        Sur Rocky, **SELinux** bloque l’accès d’un conteneur à un répertoire de l’hôte sans \`:Z\` (ou \`:z\` si le
        répertoire est partagé entre conteneurs) : symptôme typique, *Permission denied* alors que les droits Unix
        sont bons.

        ### Quadlet : un conteneur géré par systemd

        Au lieu de \`podman generate systemd\` (obsolète), Podman 5 lit des fichiers **Quadlet** et en génère des
        unités systemd :

        \`\`\`
        # /etc/containers/systemd/caisse.container   (rootless : ~/.config/containers/systemd/)
        [Unit]
        Description=Caisse de la brasserie

        [Container]
        Image=docker.io/library/python:3.13-slim
        Exec=python -m http.server 8080
        PublishPort=8080:8080
        Volume=/srv/caisse:/var/lib/caisse:Z

        [Service]
        Restart=on-failure

        [Install]
        WantedBy=multi-user.target
        \`\`\`

        \`\`\`
        # systemctl daemon-reload && systemctl start caisse      # unité « caisse.service » générée
        $ systemctl --user daemon-reload && systemctl --user start caisse   # version rootless
        # loginctl enable-linger lea     # services rootless de Léa actifs même sans session ouverte
        \`\`\`
      `,
      aRetenir: [
        '`-v hôte:conteneur:Z` (SELinux), `--memory`, `--cpus`, `podman stats`, `podman logs`.',
        'Quadlet : fichier .container dans /etc/containers/systemd (ou ~/.config/containers/systemd) → unité .service.',
        '`systemctl daemon-reload` ; `loginctl enable-linger` pour le rootless.',
      ],
      exercices: [
        {
          id: 'c17-06-01', type: 'qcm', niveau: 2,
          enonce: 'Sur fut (Rocky), `podman run -v /srv/caisse:/data …` : le conteneur reçoit *Permission denied* en écrivant dans /data, alors que /srv/caisse est en 777. Cause probable ?',
          choix: ['SELinux : il manque l’option :Z (ou :z) pour réétiqueter le répertoire', 'Le disque est plein', 'Le conteneur n’est pas root', 'Il faut redémarrer podman'],
          reponse: 0,
          indices: ['Les droits Unix sont bons.', 'Rocky active un contrôle d’accès supplémentaire.', 'Le contexte SELinux du répertoire.'],
          solution: 'SELinux interdit aux conteneurs les fichiers qui n’ont pas l’étiquette `container_file_t`. `-v /srv/caisse:/data:Z` réétiquette le répertoire. `ausearch -m avc -ts recent` confirme (module A3).',
        },
        {
          id: 'c17-06-02', type: 'commande', niveau: 2,
          enonce: 'Affiche une seule fois (sans rafraîchissement) la consommation CPU et mémoire des conteneurs en cours.',
          accepte: ['(podman|docker) stats --no-stream( \\S+)?', '(podman|docker) container stats --no-stream( \\S+)?'],
          exemple: 'podman stats --no-stream',
          indices: ['Sous-commande stats.', 'Par défaut elle se rafraîchit en continu.', '--no-stream.'],
          solution: '```\n$ podman stats --no-stream\nID     NAME    CPU %  MEM USAGE / LIMIT  MEM %\n3f2c…  caisse  0.12%  21.4MB / 268.4MB   7.98%\n```\nLa limite affichée vient de `--memory` (cgroup).',
        },
        {
          id: 'c17-06-03', type: 'ordre', niveau: 2,
          enonce: 'Remets dans l’ordre la mise en service du conteneur `caisse` avec Quadlet (en root).',
          elements: ['Écrire /etc/containers/systemd/caisse.container', 'systemctl daemon-reload', 'systemctl start caisse', 'systemctl status caisse et podman ps'],
          indices: ['Le fichier d’abord.', 'systemd doit régénérer ses unités.', 'Puis démarrer et vérifier.'],
          solution: 'Fichier .container → `daemon-reload` (le générateur Quadlet crée caisse.service) → `start` → vérification.',
        },
        {
          id: 'c17-06-04', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un fichier caisse.container produit une unité nommée caisse.service.', vrai: true },
            { texte: 'Sans `loginctl enable-linger`, les services rootless d’un utilisateur s’arrêtent quand il se déconnecte.', vrai: true },
            { texte: '`--memory 256m` est appliqué par un cgroup.', vrai: true },
            { texte: '`podman generate systemd` est la méthode recommandée avec Podman 5.', vrai: false, explication: 'Elle est obsolète : on utilise Quadlet.' },
          ],
          indices: ['Le générateur garde le nom.', 'Une seule fausse.', 'Quadlet remplace generate systemd.'],
          solution: 'Vrai, vrai, vrai, faux.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Type 1 vs type 2 ?', r: 'Type 1 : l’hyperviseur est le système (Xen, ESXi, KVM) ; type 2 : application (VirtualBox).' },
    { q: 'Paravirtualisation ?', r: 'Pilotes de l’invité qui parlent à l’hyperviseur : virtio (vda, virtio_net).' },
    { q: 'Suis-je dans une VM ?', r: '`systemd-detect-virt`' },
    { q: 'Briques d’un conteneur ?', r: 'Namespaces (PID, mount, net, UTS, IPC, user) + cgroups + système de fichiers en couches ; noyau de l’hôte.' },
    { q: 'Docker vs Podman ?', r: 'Docker : démon root (groupe docker = root) ; Podman : sans démon, rootless.' },
    { q: 'RUN vs CMD ?', r: 'RUN à la construction ; CMD au lancement du conteneur.' },
    { q: 'Construire / lancer ?', r: '`podman build -t nom .` ; `podman run -it nom` (--rm pour jetable).' },
    { q: 'overlay ?', r: 'lowerdir (image, lecture seule), upperdir (modifications), workdir.' },
    { q: 'Réseau en pont ?', r: 'netns + paire veth + pont (docker0/podman0) + NAT ; rootless : pasta/slirp4netns.' },
    { q: 'Ménage ?', r: '`podman ps -a`, `rm`, `rmi`, `system df`, `system prune`.' },
    { q: 'Données persistantes ?', r: 'Volume : `-v /srv/x:/data:Z`.' },
    { q: 'venv ?', r: '`python3 -m venv rép` ; `. rép/bin/activate` ; `deactivate`.' },
    { q: 'Conteneur géré par systemd ?', r: 'Quadlet : .container dans /etc/containers/systemd, puis daemon-reload.' },
  ],
  memo: `
    ### Machines virtuelles
    \`\`\`
    systemd-detect-virt   lscpu | grep -i virtualization   ethtool -i eth0   lsblk -d -o NAME,MODEL,SERIAL
    \`\`\`
    Type 1 : Xen, ESXi, KVM (Proxmox) · Type 2 : VirtualBox · virtio = paravirtualisation

    ### Conteneurs (podman ≈ docker)
    \`\`\`
    FROM docker.io/library/alpine:3.22 / RUN apk add --no-cache bash / CMD ["/bin/bash"]
    podman build -t nom .   podman images   podman run -it --rm nom   podman run -d --name n -p 8080:80 img
    podman ps -a   podman logs -f n   podman stats --no-stream   podman rm n   podman rmi nom   podman system prune
    -v /srv/x:/data:Z   --memory 256m --cpus 0.5   --init
    lsns   ls -l /proc/$$/ns   podman inspect n --format '{{.State.Pid}}'
    \`\`\`
    ### Quadlet
    \`\`\`
    /etc/containers/systemd/n.container  ([Container] Image= Exec= PublishPort= Volume=)
    systemctl daemon-reload ; systemctl start n      rootless : ~/.config/containers/systemd + systemctl --user + loginctl enable-linger
    \`\`\`
    ### venv
    \`\`\`
    python3 -m venv v ; . v/bin/activate ; pip install x ; deactivate
    \`\`\`
  `,
});
