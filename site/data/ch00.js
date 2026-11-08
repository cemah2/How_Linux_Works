/* Chapitre 0 : mise en place (hors livre). */
HLW.chapitre({
  id: '00',
  num: 0,
  intro: `
    Ce chapitre n’existe pas dans le livre : il prépare ton terrain de jeu. Le livre insiste sur un point,
    dès sa préface : on n’apprend pas Linux en le lisant, on l’apprend **en manipulant**. Il te faut donc
    des machines que tu as le droit de casser.

    Tu vas comprendre ce qu’est un terminal et un shell, choisir ton environnement (ton serveur **Proxmox**
    est idéal), te connecter à une VM en **SSH avec une clé**, et prendre les bons réflexes d’administrateur.
    Le **Lab 00** déploie ensuite les deux premières machines de la Brasserie du Noyau.
  `,
  objectifs: [
    'lire une invite de commande et savoir si tu es **root** ou non ;',
    'distinguer les deux grandes familles de distributions (Debian et Red Hat) ;',
    'savoir quel environnement convient à quel chapitre (VM, WSL, conteneur) ;',
    'générer une paire de clés SSH et te connecter à une VM sans mot de passe ;',
    'appliquer les réflexes de base : instantané avant de casser, `sudo` plutôt que root, lire avant d’appuyer sur Entrée.',
  ],
  certifs: { lfcs: ['EC'], rhcsa: ['R1'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '0.1',
      titre: 'Terminal, shell et distributions',
      objectif: 'Savoir ce qu’il y a derrière la fenêtre noire, et lire une invite de commande.',
      rappel: `
        Trois mots que les débutants confondent :

        - le **terminal** (ou émulateur de terminal) est le programme qui affiche une fenêtre de texte et transmet ce que tu tapes ;
        - le **shell** est le programme qui *interprète* tes commandes à l’intérieur de cette fenêtre. Sur Linux, c’est presque toujours **bash** ;
        - la **console** désigne historiquement l’écran et le clavier branchés directement sur la machine (sur Proxmox : l’onglet *Console* d’une VM).

        Quand tu te connectes en SSH, ton terminal local affiche un shell qui tourne **sur la machine distante**.

        ### Lire l’invite

        \`\`\`
        admin@cuve:~$          ← Debian : utilisateur@machine:répertoire$
        [admin@fut ~]$         ← Rocky Linux : [utilisateur@machine répertoire]$
        root@cuve:/etc#        ← le # signale le superutilisateur root
        \`\`\`

        Le \`~\` (tilde) désigne ton répertoire personnel. Le dernier caractère est le plus important :
        \`$\` pour un utilisateur ordinaire, \`#\` pour **root**, qui a tous les droits. Le livre suit cette convention :
        une commande précédée de \`#\` doit être lancée en root (avec \`sudo\`, fiche 2.15).

        ### Deux familles de distributions

        Une *distribution* assemble le noyau Linux, des outils et un gestionnaire de paquets. En entreprise, deux familles dominent :

        | Famille | Exemples | Paquets | Outil |
        |---|---|---|---|
        | Debian | Debian, Ubuntu | \`.deb\` | \`apt\` |
        | Red Hat | RHEL, Rocky Linux, AlmaLinux, Fedora | \`.rpm\` | \`dnf\` |

        Le livre prend ses exemples surtout sur Ubuntu et Fedora. Tu pratiqueras sur **Debian 13** et **Rocky Linux 10** :
        les concepts sont identiques, seuls quelques noms de fichiers, de groupes et de commandes changent.
        Savoir passer de l’une à l’autre est une vraie compétence professionnelle.
      `,
      aRetenir: [
        'Terminal = la fenêtre ; shell = l’interpréteur (bash) ; console = l’accès direct à la machine.',
        '`$` utilisateur ordinaire, `#` root.',
        'Famille Debian : `apt` et `.deb` ; famille Red Hat : `dnf` et `.rpm`.',
      ],
      exercices: [
        {
          id: 'c00-01-01', type: 'qcm', niveau: 1,
          enonce: 'Tu vois l’invite `root@cuve:/var/log#`. Que peux-tu en déduire ?',
          choix: [
            'Tu es connecté en tant que **root** sur la machine **cuve**, dans le répertoire `/var/log`.',
            'Tu es connecté en tant que **cuve** sur la machine **root**, dans `/var/log`.',
            'Tu es un utilisateur ordinaire et `#` indique un commentaire.',
            'Tu es dans ton répertoire personnel.',
          ],
          reponse: 0,
          indices: [
            'L’invite suit le schéma `utilisateur@machine:répertoire` suivi d’un caractère final.',
            'Le caractère final `#` a une signification précise.',
            '`#` = superutilisateur. Avant le `@` : l’utilisateur ; après : le nom de la machine.',
          ],
          solution: 'L’utilisateur est avant le `@` (**root**), la machine après (**cuve**), puis le répertoire courant (`/var/log`). Le `#` final confirme les droits de superutilisateur : prudence, tout est permis.',
        },
        {
          id: 'c00-01-02', type: 'association', niveau: 1,
          enonce: 'Associe chaque terme à sa définition.',
          paires: [
            ['Terminal', 'Programme qui affiche une fenêtre texte et transmet le clavier'],
            ['Shell', 'Programme qui interprète les commandes tapées'],
            ['Console', 'Accès direct à l’écran et au clavier de la machine'],
            ['Distribution', 'Noyau + outils + gestionnaire de paquets, assemblés et maintenus ensemble'],
          ],
          indices: [
            'Le shell et le terminal sont deux programmes distincts qui coopèrent.',
            'Sur Proxmox, l’onglet « Console » d’une VM correspond à un écran branché sur la machine.',
            'Terminal → fenêtre ; shell → interpréteur ; console → accès direct ; distribution → assemblage complet.',
          ],
          solution: 'Le **terminal** affiche, le **shell** (bash) interprète, la **console** est l’accès physique (ou son équivalent virtuel), la **distribution** est l’ensemble cohérent que tu installes.',
        },
        {
          id: 'c00-01-03', type: 'association', niveau: 1,
          enonce: 'Associe chaque distribution à son gestionnaire de paquets.',
          paires: [
            ['Debian', '`apt`'],
            ['Rocky Linux', '`dnf`'],
            ['Ubuntu', '`apt` (dérivée de Debian)'],
            ['Fedora', '`dnf` (famille Red Hat)'],
          ],
          indices: [
            'Il y a deux familles : Debian et Red Hat.',
            'Ubuntu est construite à partir de Debian ; Rocky Linux reconstruit RHEL.',
            'Debian et Ubuntu → apt ; Rocky et Fedora → dnf.',
          ],
          solution: 'Famille Debian (Debian, Ubuntu) : `apt`. Famille Red Hat (RHEL, Rocky, Alma, Fedora) : `dnf` (successeur de `yum`).',
        },
        {
          id: 'c00-01-04', type: 'vrai-faux', niveau: 1,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Quand tu te connectes en SSH à une VM, le shell que tu utilises tourne sur la VM.', vrai: true, explication: 'Ton terminal local ne fait qu’afficher ; les commandes s’exécutent sur la machine distante.' },
            { texte: 'bash est un terminal.', vrai: false, explication: 'bash est un **shell**. Le terminal est par exemple Windows Terminal, GNOME Terminal ou iTerm2.' },
            { texte: 'Une commande précédée de `#` dans le livre doit être lancée avec les droits root.', vrai: true, explication: 'Convention du livre (préface) : `$` utilisateur, `#` superutilisateur.' },
            { texte: 'Les commandes apprises sur Debian sont inutiles sur Rocky Linux.', vrai: false, explication: 'L’immense majorité des commandes (ls, grep, systemctl, ip…) est identique. Seuls quelques outils et chemins diffèrent.' },
          ],
          indices: [
            'Distingue bien le programme qui affiche et celui qui interprète.',
            'Relis la convention `$` / `#` du rappel.',
            'Deux affirmations sont vraies, deux sont fausses.',
          ],
          solution: 'Vrai, faux, vrai, faux. Voir les explications sous chaque affirmation.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '0.2',
      titre: 'Choisir ton environnement de pratique',
      objectif: 'Savoir pourquoi une vraie VM est nécessaire pour une partie du livre.',
      rappel: `
        Tous les environnements ne permettent pas de tout pratiquer. Le livre descend jusqu’au **démarrage**
        (GRUB, noyau, initramfs), aux **disques** (partitions, LVM) et au **réseau** (routage, pare-feu) : il faut
        des machines complètes.

        | Environnement | Ce qui marche | Limites |
        |---|---|---|
        | **VM sur Proxmox** (recommandé) | Tout : boot, disques, réseau multi-machines, instantanés | Demande un serveur (tu en as un) |
        | VM locale (VirtualBox, UTM, Hyper-V) | Presque tout | Consomme la RAM de ton poste |
        | WSL2 sous Windows | Commandes, scripts, beaucoup de systemd | Pas de GRUB, pas de vrais disques, réseau particulier |
        | Conteneur (Docker, Podman) | Commandes et scripts | Pas de boot, pas de systemd en standard, noyau partagé |

        ### Pourquoi Proxmox est idéal

        - Les **instantanés** (*snapshots*) permettent de revenir en arrière en quelques secondes : tu peux casser sans crainte.
        - Les **modèles cloud-init** créent une VM prête à l’emploi en moins d’une minute.
        - Les **ponts réseau** (\`vmbr0\`, \`vmbr1\`) permettent de construire un vrai réseau d’entreprise (routeur, serveurs, postes).
        - C’est exactement ce qu’on rencontre en production (hyperviseur KVM, comme dans la plupart des clouds).

        > Rocky Linux 10 exige un processeur de niveau **x86-64-v3** (instructions AVX2). Dans Proxmox, règle le type de CPU
        > de la VM sur **host** (ou x86-64-v3), sinon elle ne démarre pas. Les scripts du dépôt le font pour toi.
      `,
      aRetenir: [
        'Boot, disques et réseau exigent une vraie VM.',
        'Un instantané avant chaque manipulation risquée : c’est la ceinture de sécurité du labo.',
        'Rocky 10 : type de CPU **host** dans Proxmox.',
      ],
      exercices: [
        {
          id: 'c00-02-01', type: 'qcm', niveau: 1, multi: true,
          enonce: 'Quels sujets du livre **ne peux-tu pas** pratiquer correctement dans un simple conteneur Docker ?',
          choix: [
            'La configuration du chargeur de démarrage GRUB (chapitre 5)',
            'Le partitionnement d’un disque et LVM (chapitre 4)',
            'Les redirections et les tubes du shell (chapitre 2)',
            'La séquence de démarrage de systemd (chapitre 6)',
            'L’écriture de scripts shell (chapitre 11)',
          ],
          reponse: [0, 1, 3],
          indices: [
            'Un conteneur partage le noyau de la machine hôte : il ne démarre pas vraiment.',
            'Tout ce qui touche au démarrage et au matériel (même virtuel) est hors de portée.',
            'GRUB, partitionnement et démarrage de systemd demandent une vraie machine ; le shell et les scripts, non.',
          ],
          solution: 'Un conteneur n’a ni chargeur de démarrage, ni disque à partitionner, et ne lance pas systemd par défaut. Le shell et les scripts fonctionnent partout.',
        },
        {
          id: 'c00-02-02', type: 'association', niveau: 2,
          enonce: 'Pour chaque besoin, choisis l’environnement le plus adapté.',
          paires: [
            ['Simuler un réseau d’entreprise avec routeur, serveur et poste client', 'Plusieurs VM Proxmox reliées par un pont isolé'],
            ['Réviser grep et les redirections dans le train, sur ton portable Windows', 'WSL2'],
            ['Tester une modification risquée de /etc/fstab', 'Une VM avec un instantané pris juste avant'],
            ['Lancer rapidement un outil sans rien installer sur l’hôte', 'Un conteneur Podman ou Docker'],
          ],
          indices: [
            'Demande-toi à chaque fois : faut-il un vrai démarrage ? plusieurs machines ? un retour arrière ?',
            'fstab est lu au démarrage : une erreur peut empêcher la machine de démarrer.',
            'Réseau complet → VM multiples ; révisions nomades → WSL2 ; fstab → VM + instantané ; outil jetable → conteneur.',
          ],
          solution: 'Le bon outil dépend du niveau du système que tu touches. Plus tu descends (démarrage, disques, réseau), plus il te faut une machine complète et un moyen de revenir en arrière.',
        },
        {
          id: 'c00-02-03', type: 'reponse-courte', niveau: 2,
          enonce: 'Dans Proxmox, quel **type de CPU** dois-tu choisir pour qu’une VM Rocky Linux 10 démarre à coup sûr (un seul mot) ?',
          accepte: ['host', 'x86-64-v3', 'x86_64-v3'],
          indices: [
            'Rocky 10 exige des instructions processeur récentes (AVX2).',
            'Le type par défaut de Proxmox n’expose pas toutes les instructions de ton vrai processeur.',
            'Le type qui expose le processeur réel de l’hôte porte le nom de… l’hôte, en anglais.',
          ],
          solution: '**host** : la VM voit le processeur réel de ton serveur. Alternative : **x86-64-v3**. Le défaut (x86-64-v2-AES) ne suffit pas pour RHEL 10 et ses dérivées.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '0.3',
      titre: 'Se connecter en SSH avec une clé',
      objectif: 'Générer une paire de clés et te connecter à une VM sans mot de passe.',
      rappel: `
        **SSH** (*Secure Shell*) ouvre un shell sur une machine distante à travers une connexion chiffrée.
        Le livre y consacre la section 10.3 ; ici, on se contente de l’utiliser.

        ### L’authentification par clé

        Plutôt qu’un mot de passe, on utilise une **paire de clés** :

        - la **clé privée** reste sur ton ordinateur (\`~/.ssh/id_ed25519\`) et ne doit **jamais** être partagée ;
        - la **clé publique** (\`~/.ssh/id_ed25519.pub\`) est copiée sur chaque serveur, dans \`~/.ssh/authorized_keys\`.

        \`\`\`
        $ ssh-keygen -t ed25519 -C "moi@portable"   # crée la paire
        $ ssh-copy-id admin@192.168.1.50            # copie la clé publique
        $ ssh admin@192.168.1.50                    # connexion sans mot de passe
        \`\`\`

        \`ssh-keygen\` fonctionne aussi dans PowerShell sous Windows 10 et 11.

        Avec Proxmox et cloud-init, pas besoin de \`ssh-copy-id\` : tu fournis ta clé publique au moment de créer la VM
        et elle est installée automatiquement. C’est ce que font les scripts du Lab 00.

        ### Le fichier \`~/.ssh/config\`

        Pour ne pas retenir les adresses IP, déclare tes machines une fois pour toutes :

        \`\`\`
        Host cuve
            HostName 192.168.1.50
            User admin

        Host fut
            HostName 192.168.1.51
            User admin
        \`\`\`

        Ensuite, \`ssh cuve\` suffit.
      `,
      aRetenir: [
        'Clé privée : reste chez toi. Clé publique : va sur les serveurs (`authorized_keys`).',
        '`ssh-keygen -t ed25519` crée la paire ; `ssh utilisateur@hôte` se connecte.',
        '`~/.ssh/config` donne des noms courts à tes machines.',
      ],
      exercices: [
        {
          id: 'c00-03-01', type: 'commande', niveau: 1,
          enonce: 'Écris la commande qui génère une paire de clés SSH de type **ed25519**.',
          accepte: ['ssh-keygen -t ed25519( -C ("[^"]*"|\'[^\']*\'|\\S+))?( -f \\S+)?'],
          exemple: 'ssh-keygen -t ed25519',
          pieges: [{ motif: 'ssh-keygen -t rsa.*', message: 'Ceci crée une clé RSA, l’ancien type par défaut. On demande le type moderne **ed25519** (le défaut depuis OpenSSH 9.5, mais mieux vaut l’écrire explicitement).' }],
          indices: [
            'Le nom de la commande associe « ssh » et « key generation ».',
            'L’option qui choisit le **type** de clé est une seule lettre : `-t`.',
            '`ssh-keygen -t …` suivi du nom de l’algorithme.',
          ],
          solution: '```\n$ ssh-keygen -t ed25519\n```\nAccepte l’emplacement proposé (`~/.ssh/id_ed25519`). Une phrase de passe protège la clé privée si ton ordinateur est volé. L’option `-C "commentaire"` aide à reconnaître la clé dans `authorized_keys`.',
        },
        {
          id: 'c00-03-02', type: 'commande', niveau: 1,
          enonce: 'Connecte-toi en SSH à la machine `192.168.1.50` avec l’utilisateur `admin`.',
          accepte: ['ssh admin@192\\.168\\.1\\.50', 'ssh -l admin 192\\.168\\.1\\.50', 'ssh 192\\.168\\.1\\.50 -l admin'],
          exemple: 'ssh admin@192.168.1.50',
          indices: [
            'La commande s’appelle comme le protocole.',
            'La forme la plus courante colle l’utilisateur et la machine avec un caractère spécial.',
            '`ssh utilisateur@adresse`',
          ],
          solution: '```\n$ ssh admin@192.168.1.50\n```\nForme équivalente : `ssh -l admin 192.168.1.50`.',
        },
        {
          id: 'c00-03-03', type: 'vrai-faux', niveau: 1,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'On copie la clé **publique** sur les serveurs.', vrai: true },
            { texte: 'On peut envoyer sa clé **privée** par e-mail à un collègue pour qu’il se connecte à ta place.', vrai: false, explication: 'Jamais. Chaque personne a sa propre paire ; on ajoute la clé publique du collègue sur le serveur.' },
            { texte: 'Les clés publiques autorisées sont listées dans `~/.ssh/authorized_keys` sur le serveur.', vrai: true },
            { texte: '`ssh-keygen` fonctionne aussi dans PowerShell sous Windows 10 et 11.', vrai: true, explication: 'Le client OpenSSH est intégré à Windows.' },
          ],
          indices: ['Une seule affirmation est fausse.', 'Que se passe-t-il si quelqu’un d’autre possède ta clé privée ?', 'La clé privée ne quitte jamais ta machine.'],
          solution: 'Seule la deuxième est fausse : la clé privée est personnelle et secrète.',
        },
        {
          id: 'c00-03-04', type: 'trous', niveau: 2,
          enonce: 'Complète `~/.ssh/config` pour que `ssh fut` te connecte à `192.168.1.51` avec l’utilisateur `admin`.',
          texte: `
            [[1]] fut
                [[2]] 192.168.1.51
                [[3]] admin
          `,
          trous: [
            { accepte: ['Host'], exemple: 'Host', casse: false },
            { accepte: ['HostName', 'Hostname'], exemple: 'HostName', casse: false },
            { accepte: ['User'], exemple: 'User', casse: false },
          ],
          indices: [
            'Le premier mot-clé déclare le nom court que tu taperas après `ssh`.',
            'Le deuxième mot-clé donne l’adresse réelle ; il ressemble au premier.',
            '`Host`, `HostName`, `User`.',
          ],
          solution: '```\nHost fut\n    HostName 192.168.1.51\n    User admin\n```\nLes mots-clés ne sont pas sensibles à la casse, mais on les écrit habituellement ainsi.',
        },
        {
          id: 'c00-03-05', type: 'ordre', niveau: 2,
          enonce: 'Remets dans l’ordre les étapes pour accéder à une nouvelle VM par clé SSH, sans cloud-init.',
          elements: [
            'Générer la paire de clés sur ton ordinateur avec `ssh-keygen`',
            'Te connecter une première fois avec le mot de passe pour vérifier l’accès',
            'Copier la clé publique sur la VM avec `ssh-copy-id`',
            'Te connecter avec `ssh` : plus de mot de passe demandé',
          ],
          indices: ['On ne peut rien copier avant que la clé n’existe.', '`ssh-copy-id` a besoin d’un accès par mot de passe qui fonctionne.', 'Générer → tester l’accès → copier → se connecter.'],
          solution: 'Générer la paire, vérifier l’accès par mot de passe, copier la clé publique (`ssh-copy-id` l’ajoute à `authorized_keys`), puis se connecter. Avec cloud-init, les deux étapes du milieu disparaissent.',
        },
        {
          id: 'c00-03-06', type: 'terminal', niveau: 1,
          enonce: `
            **Sur ton ordinateur** : génère ta paire de clés (si ce n’est pas déjà fait), puis affiche ta clé **publique**.
            Colle ici la sortie de la commande d’affichage.
          `,
          attendu: ['^ssh-ed25519 AAAA'],
          indices: ['La clé publique est le fichier qui se termine par `.pub`.', 'Elle se trouve dans le répertoire caché `.ssh` de ton répertoire personnel.', '`cat ~/.ssh/id_ed25519.pub`'],
          solution: '```\n$ cat ~/.ssh/id_ed25519.pub\nssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... moi@portable\n```\nC’est cette ligne que tu donneras à Proxmox (fichier de configuration du Lab 00).',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '0.4',
      titre: 'Les réflexes de l’administrateur',
      objectif: 'Prendre dès le premier jour les habitudes qui évitent les catastrophes.',
      rappel: `
        Un administrateur système ne se distingue pas par le nombre de commandes qu’il connaît, mais par sa façon
        de travailler. Quelques règles, que l’on retrouve tout au long du livre :

        1. **Travailler en utilisateur ordinaire**, et utiliser \`sudo\` pour les commandes qui l’exigent (section 2.20).
           \`sudo\` garde une trace de qui a fait quoi ; un shell root ouvert en permanence, non.
        2. **Instantané avant toute manipulation risquée** (disques, démarrage, pare-feu). Sur Proxmox :
           \`qm snapshot <vmid> avant-fstab\`, puis \`qm rollback <vmid> avant-fstab\` en cas de problème.
        3. **Lire la commande avant d’appuyer sur Entrée**, surtout avec \`rm -r\`, \`dd\`, \`chmod -R\`, \`>\`.
        4. **Lire le message d’erreur en entier**, et traiter la première erreur en premier (section 2.15).
        5. **Utiliser la complétion** avec la touche **Tab** : moins de fautes de frappe, et tu découvres les noms de fichiers.
        6. **Consulter la documentation locale** : \`man\`, \`--help\` (section 2.13).
        7. **Noter ce que tu fais** : l’historique (\`history\`) aide, un cahier de bord est encore mieux.
      `,
      aRetenir: [
        'Utilisateur ordinaire + `sudo`, jamais de session root permanente.',
        'Instantané avant de casser, retour arrière en cas de problème.',
        'Tab pour compléter, `man` pour comprendre, lire l’erreur en entier.',
      ],
      exercices: [
        {
          id: 'c00-04-01', type: 'qcm', niveau: 1,
          enonce: 'Tu t’apprêtes à modifier la configuration de démarrage d’une VM. Quel est le **premier** réflexe ?',
          choix: [
            'Prendre un instantané de la VM.',
            'Ouvrir un shell root avec `sudo -i` pour aller plus vite.',
            'Redémarrer la VM pour partir d’un état propre.',
            'Désactiver le pare-feu pour éviter les surprises.',
          ],
          reponse: 0,
          indices: ['Que se passe-t-il si la VM ne redémarre plus ?', 'Proxmox sait figer l’état d’une VM pour y revenir.', 'L’instantané (snapshot) est ta ceinture de sécurité.'],
          solution: 'Un **instantané** permet de revenir en quelques secondes à l’état d’avant. Les autres options n’apportent aucune sécurité (et désactiver le pare-feu en crée une nouvelle).',
        },
        {
          id: 'c00-04-02', type: 'commande', niveau: 2,
          enonce: 'Sur l’hôte Proxmox, crée un instantané nommé `avant-fstab` de la VM d’identifiant `201`.',
          accepte: ['qm snapshot 201 avant-fstab( --description (".*"|\'.*\'))?'],
          exemple: 'qm snapshot 201 avant-fstab',
          indices: ['L’outil en ligne de commande des VM Proxmox s’appelle `qm`.', 'La sous-commande est le mot anglais pour « instantané ».', '`qm snapshot <vmid> <nom>`'],
          solution: '```\n# qm snapshot 201 avant-fstab\n```\nRetour arrière : `qm rollback 201 avant-fstab`. Liste : `qm listsnapshot 201`.',
        },
        {
          id: 'c00-04-03', type: 'vrai-faux', niveau: 1,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`sudo` enregistre dans les journaux qui a lancé quelle commande en root.', vrai: true, explication: 'Section 2.20.3 : `journalctl SYSLOG_IDENTIFIER=sudo`.' },
            { texte: 'Travailler toute la journée dans un shell root est une bonne pratique, car on évite de taper `sudo`.', vrai: false, explication: 'Aucune trace, aucun garde-fou : la moindre faute de frappe a des conséquences maximales.' },
            { texte: 'La touche Tab complète les noms de commandes et de fichiers.', vrai: true },
            { texte: 'Quand une commande affiche vingt erreurs, il faut commencer par la dernière.', vrai: false, explication: 'La **première** erreur est souvent la cause des suivantes (section 2.15.1).' },
          ],
          indices: ['Pense à la traçabilité.', 'Relis la règle n° 4 du rappel.', 'Deux vraies, deux fausses.'],
          solution: 'Vrai, faux, vrai, faux.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Que signifie le `#` en fin d’invite ?', r: 'Tu es **root** (superutilisateur). `$` = utilisateur ordinaire.' },
    { q: 'Différence entre terminal et shell ?', r: 'Le **terminal** affiche la fenêtre texte ; le **shell** (bash) interprète les commandes.' },
    { q: 'Gestionnaire de paquets de Debian ? de Rocky Linux ?', r: '`apt` pour Debian/Ubuntu ; `dnf` pour Rocky/RHEL/Fedora.' },
    { q: 'Où va la clé SSH publique sur le serveur ?', r: 'Dans `~/.ssh/authorized_keys` de l’utilisateur cible.' },
    { q: 'Commande pour générer une paire de clés SSH moderne ?', r: '`ssh-keygen -t ed25519`' },
    { q: 'Créer puis restaurer un instantané Proxmox de la VM 201 ?', r: '`qm snapshot 201 nom` puis `qm rollback 201 nom`.' },
    { q: 'Quel type de CPU Proxmox pour Rocky Linux 10 ?', r: '**host** (ou x86-64-v3) : Rocky 10 exige AVX2.' },
  ],
  memo: `
    ### Invite
    | Invite | Signification |
    |---|---|
    | \`admin@cuve:~$\` | utilisateur *admin*, machine *cuve*, répertoire personnel, non root |
    | \`root@cuve:/etc#\` | **root**, dans \`/etc\` |

    ### SSH
    \`\`\`
    ssh-keygen -t ed25519            # créer une paire de clés
    cat ~/.ssh/id_ed25519.pub        # afficher la clé publique
    ssh-copy-id admin@IP             # installer la clé sur un serveur
    ssh admin@IP                     # se connecter
    ssh cuve                         # avec ~/.ssh/config
    \`\`\`

    ### Proxmox (sur l’hôte, en root)
    \`\`\`
    qm list                          # lister les VM
    qm start 201 / qm shutdown 201   # démarrer / arrêter proprement
    qm snapshot 201 nom              # instantané
    qm rollback 201 nom              # revenir à l’instantané
    qm listsnapshot 201              # lister les instantanés
    \`\`\`

    ### Familles
    | | Debian 13 | Rocky Linux 10 |
    |---|---|---|
    | Paquets | \`apt install\` | \`dnf install\` |
    | Groupe admin | \`sudo\` | \`wheel\` |
    | Journal d’authentification | \`/var/log/auth.log\` ou \`journalctl\` | \`/var/log/secure\` ou \`journalctl\` |
  `,
});
