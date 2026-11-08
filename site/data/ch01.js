/* Chapitre 1 : The Big Picture (livre p. 1–10). */
HLW.chapitre({
  id: '01',
  num: 1,
  intro: `
    Le premier chapitre ne contient presque aucune commande : il installe la **carte mentale** dont tout le reste
    du livre a besoin. Un système Linux se découpe en trois niveaux : le **matériel**, le **noyau** et l’**espace
    utilisateur**. Chaque fois que quelque chose ne marchera pas, tu te demanderas à quel niveau se trouve le problème.

    Les exercices de manipulation de ce chapitre sont des « fenêtres » : tu vas *observer* le noyau au travail
    (changements de contexte, threads noyau, carte mémoire d’un processus) avec des commandes que tu
    approfondiras plus tard.
  `,
  objectifs: [
    'situer n’importe quel composant dans l’un des trois niveaux du système ;',
    'expliquer la différence entre **mode noyau** et **mode utilisateur** ;',
    'décrire les quatre grandes responsabilités du noyau ;',
    'expliquer ce que font `fork()` et `exec()` quand tu lances une commande ;',
    'savoir comment le noyau identifie un utilisateur, et ce que root peut faire (ou non).',
  ],
  certifs: { lpic1: ['101.1', '103.5'], rhcsa: ['R4'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '1.1',
      titre: 'Les trois niveaux du système',
      sections: '§1 et 1.1', pages: '1–4',
      objectif: 'Découper un système Linux en niveaux, et comprendre pourquoi le noyau est à part.',
      rappel: `
        Le livre part d’une idée simple : pour comprendre un système complexe, on l’**abstrait**. On ignore les détails
        internes d’un composant pour ne retenir que *ce qu’il fait* et *comment on s’en sert*. Ces composants sont
        ensuite rangés en **niveaux** (ou couches), du plus proche du matériel au plus proche de l’utilisateur.

        Pense à la brasserie du fil rouge : le client au bar ne voit ni la cuve ni la chaudière. Il passe commande au
        serveur, qui transmet en cuisine, qui pilote les machines. Chacun ne parle qu’au niveau voisin.

        ### Trois niveaux

        | Niveau | Contenu | Rôle |
        |---|---|---|
        | **Espace utilisateur** | Les processus : shell, serveurs, interface graphique… | Faire le travail utile |
        | **Noyau** (*kernel*) | Gestion des processus, de la mémoire, pilotes, appels système | Arbitrer l’accès au matériel |
        | **Matériel** | Processeur (CPU), mémoire vive (RAM), disques, cartes réseau | Calculer, stocker, communiquer |

        Les processus ne touchent jamais directement le matériel : ils passent par le noyau, à travers les
        **appels système** (fiche 1.5).

        ### Mode noyau et mode utilisateur

        C’est la distinction la plus importante du chapitre :

        - le noyau s’exécute en **mode noyau** : accès sans restriction au processeur et à toute la mémoire.
          La zone de mémoire qui lui est réservée s’appelle l’**espace noyau** ;
        - les processus s’exécutent en **mode utilisateur** : ils n’accèdent qu’à leur part de mémoire et à des
          instructions sans danger. Cette mémoire forme l’**espace utilisateur**.

        Conséquence pratique : si ton navigateur plante, le noyau nettoie derrière lui et le reste du système continue.
        En revanche, un bogue dans le noyau peut faire tomber toute la machine.

        > Attention : « mode utilisateur » ne veut pas dire « sans danger ». Un processus qui a les bonnes permissions
        > peut parfaitement effacer un disque. Le mode utilisateur protège le *noyau*, pas tes données.

        Le noyau peut aussi lancer des **threads noyau** : ils ressemblent à des processus mais travaillent en espace
        noyau. Dans la liste des processus, leur nom apparaît entre crochets, par exemple \`[kthreadd]\`.
      `,
      aRetenir: [
        'Trois niveaux : matériel, noyau, espace utilisateur.',
        'Noyau = mode noyau, accès total ; processus = mode utilisateur, accès restreint.',
        'Un processus qui plante n’entraîne pas le système ; un noyau qui plante, si.',
        'Les threads noyau apparaissent entre crochets dans `ps` : `[kthreadd]`.',
      ],
      exercices: [
        {
          id: 'c01-01-01', type: 'ordre', niveau: 1, ref: '§1.1, figure 1-1, p. 3',
          enonce: 'Range ces éléments **du plus proche du matériel** (en haut de la liste) **au plus proche de l’utilisateur** (en bas).',
          elements: [
            'Processeur, mémoire vive, disques',
            'Pilotes de périphériques, gestion de la mémoire et des processus',
            'Interface des appels système',
            'Processus utilisateur : shell, serveurs, interface graphique',
          ],
          indices: [
            'Le matériel est tout en bas de la pile.',
            'Les appels système sont la « porte d’entrée » du noyau, vue depuis les processus.',
            'Matériel → cœur du noyau → appels système → processus.',
          ],
          solution: 'Le matériel est à la base. Le noyau le pilote (pilotes, mémoire, processus) et expose aux processus une interface : les **appels système**. Les processus utilisateur sont tout en haut.',
        },
        {
          id: 'c01-01-02', type: 'qcm', niveau: 1, ref: '§1.1, p. 3',
          enonce: 'Lequel de ces éléments s’exécute en **mode noyau** ?',
          choix: [
            'Le thread `kthreadd`',
            'Un serveur web lancé par root',
            'Le shell `bash` de l’administrateur',
            'Le navigateur web',
          ],
          reponse: 0,
          indices: [
            'Être root ne change pas le mode d’exécution du processeur.',
            'Seuls le noyau et ses propres threads s’exécutent en mode noyau.',
            'Le nom entre crochets dans `ps` trahit un thread noyau.',
          ],
          solution: '`kthreadd` est un **thread noyau** : il s’exécute en mode noyau. Tous les autres sont des processus utilisateur, **même lancés par root** : root a tous les droits *dans* l’espace utilisateur, mais il reste en mode utilisateur.',
        },
        {
          id: 'c01-01-03', type: 'vrai-faux', niveau: 1, ref: '§1.1, p. 3',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Si un processus utilisateur plante, le noyau peut nettoyer derrière lui sans arrêter le système.', vrai: true },
            { texte: 'L’espace noyau est la mémoire accessible à tous les processus.', vrai: false, explication: 'C’est l’inverse : seul le noyau y a accès.' },
            { texte: 'Un processus en mode utilisateur ne peut jamais endommager les données d’un disque.', vrai: false, explication: 'Avec les bonnes permissions, si. Le mode utilisateur protège le noyau, pas les données.' },
            { texte: 'Le code en mode noyau a un accès sans restriction au processeur et à la mémoire.', vrai: true },
          ],
          indices: ['Distingue « protéger le noyau » et « protéger les données ».', 'L’espace noyau est privé.', 'Deux vraies, deux fausses.'],
          solution: 'Vrai, faux, faux, vrai.',
        },
        {
          id: 'c01-01-04', type: 'association', niveau: 1,
          enonce: 'Associe chaque élément au niveau du système auquel il appartient.',
          paires: [
            ['La barrette de mémoire vive', 'Matériel'],
            ['Le pilote de la carte réseau', 'Noyau'],
            ['Le serveur web nginx', 'Espace utilisateur'],
          ],
          indices: ['Un pilote sert d’intermédiaire entre un processus et le matériel.', 'Un serveur web est un programme comme un autre.', 'Matériel, noyau, espace utilisateur : un élément chacun.'],
          solution: 'La RAM est du **matériel** ; le pilote fait partie du **noyau** ; nginx est un **processus utilisateur** (comme tous les serveurs).',
        },
        {
          id: 'c01-01-05', type: 'terminal', niveau: 2, ref: '§1.1, note p. 4',
          enonce: `
            **Sur ta VM** (cuve ou fut), affiche la ligne du processus \`kthreadd\` dans la liste complète des processus.
            Colle la sortie ci-dessous. Que remarques-tu sur son PID et sur la façon dont son nom est écrit ?
          `,
          attendu: ['kthreadd'],
          indices: ['`ps ax` liste tous les processus du système.', 'Filtre la sortie avec `grep` grâce à un tube `|`.', '`ps ax | grep kthreadd`'],
          solution: '```\n$ ps ax | grep kthreadd\n      2 ?        S      0:00 [kthreadd]\n```\n`kthreadd` a le **PID 2** : c’est le parent de tous les threads noyau (le PID 1 est `systemd`, premier processus utilisateur). Son nom entre crochets signale un thread noyau. Essaie aussi `ps ax | head -20` : tu en verras beaucoup d’autres.',
        },
        {
          id: 'c01-01-06', type: 'libre', niveau: 2,
          enonce: 'Explique avec tes mots, en t’appuyant sur un exemple concret, pourquoi séparer le mode noyau du mode utilisateur rend le système plus **stable**.',
          indices: ['Que se passe-t-il quand un programme fait une erreur d’accès mémoire ?', 'Compare les conséquences d’une erreur dans un processus et d’une erreur dans le noyau.', 'Pense au navigateur qui plante pendant un long calcul en arrière-plan.'],
          solution: 'Un processus en mode utilisateur ne peut toucher qu’à sa propre mémoire. S’il fait une erreur (accès interdit, bogue), le processeur le signale au noyau, qui arrête ce processus et récupère ses ressources : **le reste du système n’est pas affecté**. Exemple : ton navigateur plante, mais le calcul scientifique qui tourne depuis trois jours continue. À l’inverse, le noyau a accès à tout : une erreur de sa part peut corrompre n’importe quelle zone et faire tomber la machine entière (« kernel panic »).',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '1.2',
      titre: 'La mémoire principale et la notion d’état',
      sections: '§1.2', pages: '4',
      objectif: 'Comprendre pourquoi tout tourne autour de la mémoire vive.',
      rappel: `
        De tout le matériel, la **mémoire principale** (RAM) est la pièce centrale. Ce n’est qu’une immense suite de **bits**
        (des 0 et des 1). Le noyau et les processus *sont* des ensembles de bits en mémoire, et toutes les entrées-sorties
        avec les périphériques transitent par elle. Le processeur, lui, n’est qu’un opérateur : il lit instructions et données
        en mémoire, calcule, et réécrit en mémoire.

        ### État et image

        - Un **état**, au sens strict, est un arrangement particulier de bits. Avec 4 bits, \`0110\`, \`0001\` et \`1011\` sont trois états différents.
        - Comme un processus occupe des millions de bits, on décrit plutôt son état de façon **abstraite** : « il attend une saisie », « il en est à la phase 2 de son démarrage ».
        - Le mot **image** désigne au contraire un arrangement *physique* précis de bits (on parlera d’image disque, d’image de conteneur…).

        ### Observer la mémoire

        \`\`\`
        $ free -h                  # mémoire totale, utilisée, disponible, en unités lisibles
        $ head -3 /proc/meminfo    # les mêmes informations, vues par le noyau
        $ lscpu | head             # le processeur
        \`\`\`

        Tu découvriras \`/proc\` au chapitre 2 (fiche 2.14) : c’est une fenêtre sur les structures du noyau.
      `,
      aRetenir: [
        'La RAM contient le noyau, les processus et toutes les données en transit.',
        'Le CPU lit et écrit en mémoire ; il ne « stocke » rien durablement.',
        'État = arrangement de bits, décrit en pratique de façon abstraite ; image = arrangement physique précis.',
      ],
      exercices: [
        {
          id: 'c01-02-01', type: 'reponse-courte', niveau: 1, ref: '§1.2, p. 4',
          enonce: 'Combien d’**états différents** peut-on représenter avec 4 bits ?',
          accepte: ['16', 'seize'],
          pieges: [{ motif: '4|8', message: 'Chaque bit double le nombre de possibilités : 2 × 2 × 2 × 2.' }],
          indices: ['Chaque bit vaut 0 ou 1.', 'Avec 1 bit : 2 états ; avec 2 bits : 4 états (00, 01, 10, 11).', '2 puissance 4.'],
          solution: '2⁴ = **16** états, de `0000` à `1111`.',
        },
        {
          id: 'c01-02-02', type: 'vrai-faux', niveau: 1, ref: '§1.2, p. 4',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Le processeur lit ses instructions dans la mémoire principale.', vrai: true },
            { texte: 'Les données lues sur un disque arrivent dans le processeur sans passer par la mémoire.', vrai: false, explication: 'Toutes les entrées-sorties transitent par la mémoire principale.' },
            { texte: 'Dire « le processus attend une saisie » décrit son état de façon abstraite.', vrai: true },
            { texte: 'Le terme « image » désigne un arrangement physique précis de bits.', vrai: true },
          ],
          indices: ['Le CPU est un « opérateur sur la mémoire ».', 'Une seule affirmation est fausse.', 'Entrées et sorties : par où passent-elles ?'],
          solution: 'Seule la deuxième est fausse.',
        },
        {
          id: 'c01-02-03', type: 'commande', niveau: 1,
          enonce: 'Affiche l’utilisation de la mémoire vive **en unités lisibles** (Mi, Gi…).',
          accepte: ['free -h', 'free --human', 'free -h -w', 'free -hw', 'free -wh'],
          exemple: 'free -h',
          indices: ['La commande porte le nom de ce qu’on cherche souvent : la mémoire **libre**.', 'L’option « lisible par un humain » se note souvent `-h`.', '`free -h`'],
          solution: '```\n$ free -h\n               total        used        free      shared  buff/cache   available\nMem:           1.9Gi       312Mi       1.2Gi       1.0Mi       555Mi       1.6Gi\nSwap:             0B          0B          0B\n```\nLa colonne **available** est la plus utile : la mémoire réellement disponible pour de nouveaux programmes (le cache disque est libérable). Tu approfondiras au chapitre 8.',
        },
        {
          id: 'c01-02-04', type: 'terminal', niveau: 1,
          enonce: 'Sur ta VM, lance `free -h` et colle la sortie. Repère la mémoire totale : correspond-elle à ce que tu as attribué à la VM dans Proxmox ?',
          attendu: ['[Mm][eé]m'],
          lignes: 4,
          indices: ['Tape simplement la commande et copie le résultat.', 'Le total est légèrement inférieur à la RAM attribuée : le noyau et le micrologiciel en réservent un peu.', '`free -h`'],
          solution: 'Le total affiché est un peu inférieur à la mémoire attribuée (par exemple 1,9 Gi pour 2 Gio) : une partie est réservée au noyau et au micrologiciel avant même que le décompte commence.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '1.3',
      titre: 'Le noyau et la gestion des processus',
      sections: '§1.3 et 1.3.1', pages: '4–6',
      objectif: 'Comprendre comment plusieurs programmes semblent tourner en même temps.',
      rappel: `
        Le noyau a **quatre grandes responsabilités** :

        1. **Les processus** : décider lequel a le droit d’utiliser le processeur, et quand.
        2. **La mémoire** : savoir quelle zone appartient à quel processus, ce qui est partagé, ce qui est libre.
        3. **Les pilotes de périphériques** : servir d’interface entre le matériel et les processus.
        4. **Les appels système** : le moyen par lequel les processus demandent des services au noyau.

        ### Le multitâche est une illusion

        Sur un processeur à un seul cœur, **un seul processus s’exécute à un instant donné**. Le noyau donne à chacun une
        **tranche de temps** (*time slice*) très courte, puis passe au suivant. Ce passage s’appelle un **changement de
        contexte** (*context switch*). Les tranches sont si brèves que tout semble simultané.

        Déroulé d’un changement de contexte, dans l’ordre :

        1. un minuteur matériel interrompt le processus en cours ; le processeur passe en mode noyau et rend la main au noyau ;
        2. le noyau sauvegarde l’état du processeur et de la mémoire du processus interrompu ;
        3. il traite ce qui est arrivé pendant la tranche (par exemple des données reçues d’un périphérique) ;
        4. il choisit, parmi les processus prêts, celui qui s’exécutera ensuite ;
        5. il prépare la mémoire puis le processeur pour ce processus, et fixe la durée de sa tranche ;
        6. il repasse le processeur en mode utilisateur et lui donne la main.

        Cela répond à la question « **quand le noyau s’exécute-t-il ?** » : entre les tranches de temps, pendant les
        changements de contexte (et aussi quand un processus lui demande un service par un appel système).

        Sur une machine multicœur, plusieurs processus tournent réellement en parallèle, un par cœur, mais le principe reste le même.

        ### Observer

        \`\`\`
        $ nproc                    # nombre d’unités de traitement disponibles
        $ grep ctxt /proc/stat     # nombre total de changements de contexte depuis le démarrage
        $ vmstat 1 5               # colonne « cs » : changements de contexte par seconde
        \`\`\`
      `,
      aRetenir: [
        'Quatre domaines : processus, mémoire, pilotes, appels système.',
        'Un cœur = un processus à la fois ; le multitâche repose sur des tranches de temps.',
        'Le changement de contexte est le moment où le noyau reprend la main et choisit le suivant.',
      ],
      exercices: [
        {
          id: 'c01-03-01', type: 'association', niveau: 1, ref: '§1.3, p. 4',
          enonce: 'Associe chaque responsabilité du noyau à sa description.',
          paires: [
            ['Gestion des processus', 'Décider quel processus utilise le processeur, et quand'],
            ['Gestion de la mémoire', 'Savoir quelle zone est attribuée, partagée ou libre'],
            ['Pilotes de périphériques', 'Faire l’interface entre le matériel et les processus'],
            ['Appels système', 'Permettre aux processus de demander des services au noyau'],
          ],
          indices: ['Les noms sont assez parlants : lis-les lentement.', 'Le « quand » concerne le temps processeur.', 'Processus ↔ processeur ; mémoire ↔ zones ; pilotes ↔ matériel ; appels système ↔ demandes.'],
          solution: 'Ces quatre domaines structurent tout le livre : processus (chap. 8), mémoire (chap. 4 et 8), périphériques (chap. 3), appels système (chap. 8 avec `strace`).',
        },
        {
          id: 'c01-03-02', type: 'ordre', niveau: 2, ref: '§1.3.1, p. 5',
          enonce: 'Remets dans l’ordre les étapes d’un **changement de contexte**.',
          elements: [
            'Un minuteur matériel interrompt le processus et le processeur passe en mode noyau',
            'Le noyau sauvegarde l’état du processeur et de la mémoire du processus interrompu',
            'Le noyau traite les tâches survenues pendant la tranche (entrées-sorties…)',
            'Le noyau choisit le prochain processus parmi ceux qui sont prêts',
            'Le noyau prépare la mémoire et le processeur, et fixe la durée de la tranche',
            'Le processeur repasse en mode utilisateur et le nouveau processus reprend la main',
          ],
          indices: [
            'Tout commence par une interruption, qui donne la main au noyau.',
            'On sauvegarde avant de faire autre chose, et on choisit avant de préparer.',
            'Interrompre → sauvegarder → traiter → choisir → préparer → rendre la main.',
          ],
          solution: 'Interrompre, sauvegarder, traiter les tâches en attente, choisir, préparer, rendre la main. La sauvegarde de l’état est indispensable : c’est elle qui permet au processus interrompu de reprendre exactement là où il s’était arrêté.',
        },
        {
          id: 'c01-03-03', type: 'qcm', niveau: 1, ref: '§1.3.1, p. 5',
          enonce: 'Sur un processeur à **un seul cœur**, combien de processus s’exécutent réellement à un instant donné ?',
          choix: ['Un seul', 'Deux : un en mode noyau, un en mode utilisateur', 'Autant qu’il y a de processus lancés', 'Cela dépend de la quantité de RAM'],
          reponse: 0,
          indices: ['Le multitâche est une illusion.', 'Que fait le noyau entre deux tranches de temps ?', 'Un cœur = une seule suite d’instructions à la fois.'],
          solution: '**Un seul.** Le noyau alterne très vite entre les processus grâce aux tranches de temps ; l’impression de simultanéité vient de la brièveté des tranches.',
        },
        {
          id: 'c01-03-04', type: 'reponse-courte', niveau: 1,
          enonce: 'Comment s’appelle le fait, pour le noyau, de retirer le processeur à un processus pour le donner à un autre (en français ou en anglais) ?',
          accepte: ['(un )?changement de contexte', '(a )?context switch(ing)?', 'commutation de contexte'],
          indices: ['Le noyau doit sauvegarder puis restaurer le « contexte » d’exécution.', 'En anglais : *context …*', 'Changement de …'],
          solution: 'Un **changement de contexte** (*context switch*).',
        },
        {
          id: 'c01-03-05', type: 'commande', niveau: 1,
          enonce: 'Affiche le **nombre d’unités de traitement** (cœurs logiques) disponibles sur la machine, avec la commande la plus courte possible.',
          accepte: ['nproc', 'nproc --all'],
          exemple: 'nproc',
          pieges: [{ motif: 'lscpu.*', message: '`lscpu` fonctionne mais affiche beaucoup plus. Il existe une commande qui affiche juste le nombre.' }],
          indices: ['Le nom est une abréviation de « number of processing units ».', 'Cinq lettres.', '`n…proc`'],
          solution: '```\n$ nproc\n2\n```\nAutres méthodes : `lscpu` (ligne CPU(s)) ou `grep -c ^processor /proc/cpuinfo`.',
        },
        {
          id: 'c01-03-06', type: 'terminal', niveau: 2,
          enonce: `
            Sur ta VM, lance \`grep ctxt /proc/stat\`, attends quelques secondes, puis relance-la. Colle les deux sorties.
            Le nombre a-t-il augmenté ? De combien environ par seconde ?
          `,
          attendu: ['ctxt\\s+\\d+'],
          indices: ['`/proc/stat` contient des compteurs tenus par le noyau.', 'La ligne `ctxt` compte les changements de contexte depuis le démarrage.', 'Fais la différence entre les deux valeurs et divise par le nombre de secondes écoulées.'],
          solution: 'Le compteur augmente en permanence, même sur une machine « au repos » : plusieurs centaines à milliers de changements de contexte par seconde. `vmstat 1 5` affiche directement ce débit dans la colonne **cs**.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '1.4',
      titre: 'Mémoire virtuelle et pilotes de périphériques',
      sections: '§1.3.2 et 1.3.3', pages: '6–7',
      objectif: 'Comprendre comment chaque processus croit avoir la machine pour lui seul.',
      rappel: `
        ### Ce que la gestion de la mémoire doit garantir

        - le noyau a sa zone privée, inaccessible aux processus ;
        - chaque processus a sa propre zone ;
        - un processus ne peut pas lire la mémoire privée d’un autre ;
        - des processus peuvent malgré tout **partager** de la mémoire (bibliothèques, échanges de données) ;
        - certaines zones peuvent être **en lecture seule** (le code d’un programme) ;
        - le système peut utiliser **plus de mémoire qu’il n’en possède** en se servant du disque en appoint (le *swap*, chapitre 4).

        ### La mémoire virtuelle

        Les processeurs modernes ont une **MMU** (*Memory Management Unit*). Avec la **mémoire virtuelle**, un processus
        n’utilise jamais d’adresses physiques : il manipule des adresses *virtuelles*, et la MMU les traduit à la volée
        grâce à une carte d’adresses que le noyau tient à jour. Cette carte s’appelle la **table des pages**.
        À chaque changement de contexte, le noyau remplace la carte du processus sortant par celle du processus entrant.

        Résultat : deux processus peuvent utiliser la même adresse virtuelle sans conflit, car elle pointe vers deux
        emplacements physiques différents.

        ### Les pilotes

        Les périphériques ne sont en général accessibles qu’en mode noyau : un accès maladroit (couper l’alimentation,
        écrire n’importe où sur un disque) pourrait planter la machine. De plus, deux cartes réseau de marques différentes
        se programment de façon totalement différente. Les **pilotes**, intégrés au noyau ou chargés sous forme de **modules**,
        masquent ces différences et offrent aux processus une interface uniforme.

        \`\`\`
        $ lsmod | head                 # modules (souvent des pilotes) chargés dans le noyau
        $ head -5 /proc/self/maps      # la carte mémoire virtuelle du processus « head » lui-même
        \`\`\`
      `,
      aRetenir: [
        'La MMU traduit les adresses virtuelles en adresses physiques grâce à la table des pages.',
        'Chaque processus a sa propre carte : isolation, partage contrôlé, lecture seule possible.',
        'Les pilotes vivent dans le noyau (souvent en modules, `lsmod`) et uniformisent l’accès au matériel.',
      ],
      exercices: [
        {
          id: 'c01-04-01', type: 'qcm', niveau: 1, ref: '§1.3.2, p. 6',
          enonce: 'Quel est le rôle de la **MMU** ?',
          choix: [
            'Traduire les adresses mémoire vues par un processus en adresses physiques',
            'Choisir le prochain processus à exécuter',
            'Écrire sur le disque les pages de mémoire inutilisées',
            'Charger les pilotes de périphériques au démarrage',
          ],
          reponse: 0,
          indices: ['C’est un composant matériel du processeur.', 'Son nom complet est « Memory Management Unit ».', 'Elle intervient à chaque accès mémoire d’un processus.'],
          solution: 'La MMU intercepte chaque accès mémoire et **traduit l’adresse virtuelle en adresse physique** selon la table des pages préparée par le noyau. Le choix du processus suivant relève de l’ordonnanceur du noyau (logiciel).',
        },
        {
          id: 'c01-04-02', type: 'reponse-courte', niveau: 1, ref: '§1.3.2, note p. 6',
          enonce: 'Comment s’appelle la structure qui implémente la carte des adresses mémoire d’un processus (français ou anglais) ?',
          accepte: ['(la )?tables? des pages', '(the )?page tables?'],
          indices: ['La mémoire est découpée en « pages ».', 'C’est une table.', 'Table des …'],
          solution: 'La **table des pages** (*page table*).',
        },
        {
          id: 'c01-04-03', type: 'vrai-faux', niveau: 2, ref: '§1.3.2, p. 6',
          enonce: 'Parmi ces affirmations sur la gestion de la mémoire, lesquelles sont vraies ?',
          affirmations: [
            { texte: 'Deux processus peuvent partager une zone de mémoire.', vrai: true, explication: 'Par exemple le code d’une bibliothèque partagée, chargé une seule fois.' },
            { texte: 'Un processus peut lire librement la mémoire privée d’un autre processus.', vrai: false },
            { texte: 'Le système peut utiliser plus de mémoire qu’il n’en possède physiquement.', vrai: true, explication: 'En utilisant le disque en appoint (swap).' },
            { texte: 'Pendant un changement de contexte, le noyau change la carte d’adresses active.', vrai: true },
            { texte: 'Toutes les zones mémoire d’un processus sont forcément modifiables.', vrai: false, explication: 'Le code est en général en lecture seule.' },
          ],
          indices: ['Relis la liste des garanties dans le rappel.', 'Isolation n’empêche pas le partage volontaire.', 'Deux affirmations sont fausses.'],
          solution: 'Vrai, faux, vrai, vrai, faux.',
        },
        {
          id: 'c01-04-04', type: 'qcm', niveau: 2, ref: '§1.3.3, p. 6–7',
          enonce: 'Pourquoi les pilotes de périphériques font-ils traditionnellement partie du noyau ?',
          multi: true,
          choix: [
            'Parce que les périphériques ne sont accessibles qu’en mode noyau',
            'Pour offrir aux processus une interface uniforme malgré des matériels très différents',
            'Pour que chaque utilisateur puisse modifier le pilote sans droits particuliers',
            'Parce qu’un accès maladroit au matériel pourrait faire planter la machine',
          ],
          reponse: [0, 1, 3],
          indices: ['Trois réponses sont justes.', 'Pense à la sécurité et à la simplicité pour les développeurs.', 'Une des réponses va à l’encontre de toute la logique de protection.'],
          solution: 'Accès réservé au mode noyau, protection contre les accès dangereux, interface uniforme : voilà pourquoi les pilotes sont dans le noyau. Les modifier demande au contraire des privilèges élevés.',
        },
        {
          id: 'c01-04-05', type: 'commande', niveau: 1,
          enonce: 'Affiche la liste des **modules** actuellement chargés dans le noyau.',
          accepte: ['lsmod', 'cat /proc/modules', 'lsmod \\| (less|more|head( -n ?\\d+| -\\d+)?)'],
          exemple: 'lsmod',
          indices: ['Les commandes qui listent commencent souvent par `ls`.', '« ls » + « mod » (module).', '`lsmod`'],
          solution: '```\n$ lsmod\nModule                  Size  Used by\nvirtio_net             73728  0\n...\n```\nSur une VM, tu verras des modules `virtio_*` : ce sont les pilotes des périphériques virtuels de Proxmox (chapitre 3).',
        },
        {
          id: 'c01-04-06', type: 'terminal', niveau: 3,
          enonce: `
            Lance deux fois de suite \`head -3 /proc/self/maps\`. \`/proc/self\` désigne toujours *le processus qui lit*.
            Colle les sorties. Les adresses sont-elles identiques d’une fois sur l’autre ? Pourquoi ?
          `,
          attendu: ['[0-9a-f]+-[0-9a-f]+\\s+[r-][w-][x-]p'],
          indices: ['Chaque ligne montre une plage d’adresses virtuelles et ses droits (r, w, x).', 'Les deux exécutions sont deux processus différents.', 'Cherche « ASLR » : une mesure de sécurité qui place les zones mémoire au hasard.'],
          solution: 'Chaque ligne est une plage d’adresses **virtuelles** du processus `head`, avec ses droits (`r-xp` = code exécutable en lecture seule, `rw-p` = données modifiables). Les adresses changent d’une exécution à l’autre à cause de l’**ASLR** (randomisation de l’espace d’adressage), une protection contre les attaques. Chaque processus a sa propre carte : c’est la mémoire virtuelle en action.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '1.5',
      titre: 'Appels système : fork() et exec()',
      sections: '§1.3.4', pages: '7–8',
      objectif: 'Comprendre ce qui se passe quand tu tapes une commande.',
      rappel: `
        Un **appel système** (*system call*, *syscall*) est une demande qu’un processus adresse au noyau pour une tâche
        qu’il ne peut pas faire seul : ouvrir, lire ou écrire un fichier, créer un processus, envoyer des données sur le réseau…

        ### Deux appels clés pour lancer un programme

        - **\`fork()\`** : le noyau crée une copie presque identique du processus appelant. On a désormais un *parent* et un *enfant*.
        - **\`exec(programme)\`** : le noyau charge \`programme\` et le lance **à la place** du programme actuel du processus (même PID, nouveau code).

        Quand tu tapes \`ls\` dans le shell :

        1. le shell appelle \`fork()\` : une copie du shell apparaît ;
        2. cette copie appelle \`exec(ls)\` : elle devient \`ls\` ;
        3. \`ls\` affiche son résultat puis se termine ;
        4. le shell d’origine, qui attendait, affiche à nouveau l’invite.

        Tous les processus du système naissent ainsi, **sauf le tout premier**, \`init\` (aujourd’hui \`systemd\`, PID 1), lancé directement par le noyau au démarrage (chapitre 6).

        > Notation : on écrit les appels système avec des parenthèses, comme en langage C. \`exec()\` désigne en fait une famille d’appels (\`execve()\`, etc.).

        ### Les pseudo-périphériques

        Le noyau offre aussi des **pseudo-périphériques** : ils ressemblent à des périphériques mais sont purement logiciels.
        Exemples : \`/dev/null\` (avale tout ce qu’on y écrit), \`/dev/zero\` (fournit des zéros à l’infini), \`/dev/random\`
        et \`/dev/urandom\` (nombres aléatoires). Pour les utiliser, un processus doit tout de même les ouvrir… par un appel système.

        ### Observer

        \`\`\`
        $ echo $$                        # PID du shell courant
        $ ps -o pid,ppid,comm            # PID, PID du parent, nom : qui a créé qui ?
        $ ls -l /dev/null /dev/urandom   # le « c » en tête : périphérique en mode caractère
        \`\`\`
      `,
      aRetenir: [
        '`fork()` duplique le processus ; `exec()` remplace son programme (le PID ne change pas).',
        'Lancer une commande = `fork()` du shell, puis `exec()` de la commande dans l’enfant.',
        'Seul `init`/`systemd` (PID 1) n’est pas né d’un `fork()`.',
        'Pseudo-périphériques : `/dev/null`, `/dev/zero`, `/dev/urandom`.',
      ],
      exercices: [
        {
          id: 'c01-05-01', type: 'ordre', niveau: 1, ref: '§1.3.4, figure 1-2, p. 7',
          enonce: 'Tu tapes `ls` puis Entrée. Remets les événements dans l’ordre.',
          elements: [
            'Le shell lit la ligne de commande `ls`',
            'Le shell appelle `fork()` : une copie du shell est créée',
            'La copie appelle `exec(ls)` et devient le programme `ls`',
            '`ls` affiche le contenu du répertoire puis se termine',
            'Le shell d’origine affiche de nouveau l’invite',
          ],
          indices: ['On ne peut pas remplacer un programme avant d’avoir créé le processus qui va être remplacé.', '`fork()` vient avant `exec()`.', 'Lire → fork → exec → exécution → retour à l’invite.'],
          solution: 'Le shell lit la commande, se duplique avec `fork()`, l’enfant se transforme en `ls` avec `exec()`, `ls` travaille et se termine, et le parent (qui attendait) reprend la main.',
        },
        {
          id: 'c01-05-02', type: 'qcm', niveau: 1, ref: '§1.3.4, p. 7',
          enonce: 'Que fait l’appel système `exec()` ?',
          choix: [
            'Il remplace le programme du processus appelant par un nouveau programme, sans changer de PID',
            'Il crée un nouveau processus, copie du processus appelant',
            'Il exécute un programme dans un processus séparé puis revient',
            'Il donne les droits root au programme exécuté',
          ],
          reponse: 0,
          indices: ['L’un crée, l’autre remplace.', 'Après `exec()`, l’ancien code du processus n’existe plus.', '`fork()` crée ; `exec()` remplace.'],
          solution: '`exec()` **remplace** le programme courant : même processus, même PID, mais nouveau code. C’est `fork()` qui crée un nouveau processus.',
        },
        {
          id: 'c01-05-03', type: 'reponse-courte', niveau: 1, ref: '§1.3.4, p. 7',
          enonce: 'Quel est le **PID** du seul processus utilisateur qui n’est pas créé par `fork()` ?',
          accepte: ['1', 'pid 1', 'un'],
          indices: ['C’est le premier processus lancé par le noyau.', 'Il s’appelle `init` (aujourd’hui `systemd`).', 'Le plus petit PID possible pour un processus utilisateur.'],
          solution: '**PID 1** : `init`, c’est-à-dire `systemd` sur Debian et Rocky. Le noyau le lance directement à la fin de son démarrage (chapitre 6).',
        },
        {
          id: 'c01-05-04', type: 'association', niveau: 2, ref: '§1.3.4, p. 7 et §2.13',
          enonce: 'Associe chaque appel système à ce qu’il fait. (Leurs pages de manuel sont dans la section 2 : `man 2 open`.)',
          paires: [
            ['`fork()`', 'Crée une copie du processus appelant'],
            ['`exec()`', 'Remplace le programme du processus'],
            ['`open()`', 'Ouvre un fichier et renvoie un descripteur'],
            ['`read()`', 'Lit des données depuis un descripteur de fichier'],
            ['`kill()`', 'Envoie un signal à un processus'],
          ],
          indices: ['Les noms sont en anglais : traduis-les.', '`kill` ne tue pas forcément : il **envoie un signal** (fiche 2.10).', 'Fork = bifurquer, open = ouvrir, read = lire.'],
          solution: 'Chacun de ces appels a sa page de manuel en section 2 (`man 2 fork`, `man 2 kill`…). Tu les verras défiler avec `strace` au chapitre 8.',
        },
        {
          id: 'c01-05-05', type: 'vrai-faux', niveau: 2, ref: '§1.3.4, p. 8',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un pseudo-périphérique est implémenté entièrement par du logiciel.', vrai: true },
            { texte: 'Lire `/dev/urandom` ne nécessite aucun appel système.', vrai: false, explication: 'Il faut au moins l’ouvrir (`open()`) et le lire (`read()`).' },
            { texte: 'Après `exec()`, le PID du processus change.', vrai: false, explication: 'Le PID reste le même : seul le programme change.' },
            { texte: 'Après `fork()`, il y a deux processus presque identiques.', vrai: true },
          ],
          indices: ['Un processus n’a aucun moyen de parler au noyau sans appel système.', 'Remplacer n’est pas créer.', 'Deux vraies, deux fausses.'],
          solution: 'Vrai, faux, faux, vrai.',
        },
        {
          id: 'c01-05-06', type: 'qcm', niveau: 3,
          enonce: 'Dans ta session SSH, tu tapes `exec ls`. Que se passe-t-il ?',
          choix: [
            '`ls` affiche le répertoire, puis la session se ferme',
            '`ls` affiche le répertoire et l’invite revient normalement',
            'Rien : `exec` n’est pas une commande du shell',
            'Le shell redémarre avec les droits root',
          ],
          reponse: 0,
          indices: ['`exec` est une commande intégrée au shell qui appelle directement `exec()`… sans `fork()` préalable.', 'Quel programme reste-t-il dans le processus après `exec()` ?', 'Quand `ls` se termine, il n’y a plus de shell pour afficher l’invite.'],
          solution: 'Sans `fork()`, c’est **le shell lui-même** qui est remplacé par `ls`. Quand `ls` se termine, le processus disparaît, et comme c’était ton shell de connexion, la session se ferme. (À tester sur ta VM : tu n’as qu’à te reconnecter.)',
        },
        {
          id: 'c01-05-07', type: 'terminal', niveau: 2,
          enonce: `
            Sur ta VM, lance \`sleep 300 &\` puis \`ps -o pid,ppid,comm\`. Colle la sortie.
            Vérifie que le **PPID** (parent) de \`sleep\` et celui de \`ps\` sont égaux au **PID** de \`bash\`.
          `,
          attendu: ['bash', 'sleep', 'PPID'],
          indices: ['Le `&` lance `sleep` en arrière-plan et te rend l’invite (fiche 2.10).', 'La colonne PPID donne le PID du parent.', 'Les deux commandes ont été lancées par ton shell : elles sont ses enfants.'],
          solution: '```\n$ sleep 300 &\n$ ps -o pid,ppid,comm\n    PID    PPID COMMAND\n   1234    1233 bash\n   1301    1234 sleep\n   1302    1234 ps\n```\n`sleep` et `ps` ont pour parent `bash` (1234) : ils sont nés d’un `fork()` du shell, suivi d’un `exec()`.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '1.6',
      titre: 'L’espace utilisateur et les utilisateurs',
      sections: '§1.4 à 1.6', pages: '8–10',
      objectif: 'Situer les services dans l’espace utilisateur et comprendre ce qu’est un utilisateur pour le noyau.',
      rappel: `
        ### L’espace utilisateur

        L’espace utilisateur désigne la mémoire attribuée aux processus, et par extension l’ensemble des processus en cours
        (on dit aussi *userland*). C’est là que se passe l’essentiel du travail utile.

        On peut y distinguer grossièrement des **niveaux de service** : en bas, de petits composants qui font une seule chose
        (configuration réseau, bus de communication, journalisation) ; au milieu, des services plus gros (cache DNS, courrier,
        impression, base de données) ; en haut, les applications que l’utilisateur pilote (navigateur, interface graphique).
        Un composant s’appuie en général sur des composants de même niveau ou de niveau inférieur.

        Mais ce n’est **qu’une approximation** : aucune règle n’est imposée dans l’espace utilisateur. Par exemple, la plupart
        des programmes écrivent leurs **journaux** via le service standard (syslog/journald), mais certains gèrent les leurs eux-mêmes.

        ### Les utilisateurs

        Un **utilisateur** est une entité qui peut exécuter des processus et posséder des fichiers. Le noyau ne connaît pas
        les noms : il identifie chaque utilisateur par un nombre, l’**UID** (*user ID*). La correspondance nom ↔ UID est
        stockée dans \`/etc/passwd\` (chapitre 7).

        - Chaque processus a un **propriétaire** ; on dit qu’il « s’exécute en tant que » cet utilisateur.
        - Un utilisateur peut agir sur ses propres processus, pas sur ceux des autres. Il peut partager ou non ses fichiers.
        - **root** (UID **0**) est l’exception : il peut agir sur tous les processus et accéder à tous les fichiers locaux.
          C’est le **superutilisateur**. Il s’exécute pourtant **en mode utilisateur**, pas en mode noyau.
        - Un **groupe** est un ensemble d’utilisateurs ; il sert surtout à partager l’accès à des fichiers.
        - Il existe beaucoup d’utilisateurs **système** qui ne correspondent à aucun humain (\`www-data\`, \`nobody\`, \`systemd-network\`…) :
          on fait tourner chaque service sous son propre compte pour limiter les dégâts en cas de faille.

        \`\`\`
        $ id                             # ton UID, ton groupe principal et tes groupes
        $ ps -eo user,pid,comm | head    # le propriétaire de chaque processus
        $ getent passwd root             # la ligne de root : son UID est le 3e champ
        \`\`\`
      `,
      aRetenir: [
        'L’espace utilisateur s’organise grossièrement en niveaux de service, sans règle stricte.',
        'Le noyau identifie les utilisateurs par leur **UID**, pas par leur nom.',
        'root = UID 0, tous les droits sur les processus et fichiers locaux, mais en mode utilisateur.',
        'Les groupes servent à partager des fichiers ; les services tournent sous des comptes dédiés.',
      ],
      exercices: [
        {
          id: 'c01-06-01', type: 'qcm', niveau: 1, ref: '§1.5, p. 9',
          enonce: 'Comment le noyau identifie-t-il l’utilisateur propriétaire d’un processus ?',
          choix: ['Par un identifiant numérique, l’UID', 'Par son nom d’utilisateur', 'Par son adresse e-mail', 'Par le nom du terminal utilisé'],
          reponse: 0,
          indices: ['Le noyau préfère les nombres aux chaînes de caractères.', 'Les noms sont une affaire de l’espace utilisateur (`/etc/passwd`).', 'User ID.'],
          solution: 'Par l’**UID**. Le nom n’est qu’une étiquette, traduite par les programmes de l’espace utilisateur grâce à `/etc/passwd`. Conséquence : renommer un compte ne change rien aux fichiers qu’il possède, car ils sont rattachés à son UID.',
        },
        {
          id: 'c01-06-02', type: 'reponse-courte', niveau: 1, ref: '§1.5',
          enonce: 'Quel est l’**UID** de root ?',
          accepte: ['0', 'zero'],
          indices: ['C’est le plus petit UID possible.', 'Regarde le 3ᵉ champ de `getent passwd root`.', 'Zéro.'],
          solution: '**0**. C’est l’UID, et non le nom « root », qui donne les super-pouvoirs : tout compte d’UID 0 est un superutilisateur (d’où l’importance de surveiller `/etc/passwd`).',
        },
        {
          id: 'c01-06-03', type: 'commande', niveau: 1,
          enonce: 'Affiche ton UID, ton GID principal et la liste de tes groupes, en une seule commande de deux lettres.',
          accepte: ['id', 'id -a', 'id \\$USER', 'id \\$\\(whoami\\)', 'id admin'],
          exemple: 'id',
          indices: ['Le nom de la commande est l’abréviation de « identité ».', 'Deux lettres.', '`id`'],
          solution: '```\n$ id\nuid=1000(admin) gid=1000(admin) groupes=1000(admin),27(sudo)\n```\nSur Rocky, le groupe d’administration s’appelle `wheel` (10) au lieu de `sudo` (27).',
        },
        {
          id: 'c01-06-04', type: 'vrai-faux', niveau: 1, ref: '§1.5, p. 9–10',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'root peut terminer n’importe quel processus du système.', vrai: true },
            { texte: 'root s’exécute en mode noyau.', vrai: false, explication: 'Root reste en mode utilisateur ; seul le noyau est en mode noyau.' },
            { texte: 'Un utilisateur ordinaire peut terminer les processus d’un autre utilisateur ordinaire.', vrai: false },
            { texte: 'Les groupes servent principalement à partager l’accès à des fichiers.', vrai: true },
            { texte: 'Tous les comptes d’un système correspondent à des personnes.', vrai: false, explication: 'Beaucoup sont des comptes système dédiés à des services.' },
          ],
          indices: ['Root est puissant dans l’espace utilisateur, mais il y reste.', 'Chacun ne peut agir que sur ses propres processus, sauf root.', 'Trois affirmations sont fausses.'],
          solution: 'Vrai, faux, faux, vrai, faux.',
        },
        {
          id: 'c01-06-05', type: 'qcm', niveau: 2, ref: '§1.4, p. 8–9',
          enonce: 'Quelle affirmation sur l’organisation de l’espace utilisateur est **juste** ?',
          choix: [
            'La hiérarchie en niveaux de service est une approximation : rien ne l’impose réellement',
            'Le noyau interdit à un processus d’utiliser un service de niveau supérieur',
            'Tous les programmes doivent obligatoirement passer par syslog pour leurs journaux',
            'Les serveurs web font partie du noyau',
          ],
          reponse: 0,
          indices: ['Le noyau ne s’occupe pas de « niveaux » entre processus.', 'Certains programmes gèrent leurs journaux eux-mêmes.', 'L’espace utilisateur n’a pas de règles imposées.'],
          solution: 'Les niveaux (services de base, intermédiaires, applications) aident à comprendre, mais **l’espace utilisateur n’a pas de règles** : le noyau traite tous les processus de la même façon.',
        },
        {
          id: 'c01-06-06', type: 'terminal', niveau: 2,
          enonce: `
            Sur ta VM, liste les propriétaires des processus avec \`ps -eo user,pid,comm\` et colle les 15 premières lignes.
            Repère au moins un processus qui tourne sous un **compte système** autre que root et que ton propre compte.
          `,
          attendu: ['root'],
          lignes: 6,
          indices: ['Ajoute `| head -15` pour ne garder que le début.', 'Cherche des noms comme `systemd+`, `message+`, `chrony`, `polkitd`…', '`ps` tronque les noms longs avec un `+`.'],
          solution: 'Tu verras surtout `root`, mais aussi des comptes comme `systemd-timesync` (affiché `systemd+`), `messagebus` (`message+`), `chrony` ou `polkitd`. Chacun fait tourner un service avec le strict minimum de droits.',
        },
        {
          id: 'c01-06-07', type: 'libre', niveau: 3,
          enonce: 'Le serveur web de la brasserie tourne sous l’utilisateur `www-data` plutôt que root. Explique en quelques phrases pourquoi c’est une bonne pratique, en t’appuyant sur la notion de propriétaire de processus.',
          indices: ['Un serveur web est exposé à Internet : il peut avoir une faille.', 'Un attaquant qui prend le contrôle d’un processus hérite des droits de son propriétaire.', 'Compare ce que peut faire un processus `www-data` et un processus root.'],
          solution: 'Un processus a exactement les droits de son propriétaire. Si une faille permet de prendre le contrôle du serveur web, l’attaquant obtient les droits de `www-data` : il ne peut ni lire les fichiers de comptabilité de Chloé, ni modifier `/etc`, ni arrêter les autres services. Sous root, il aurait **tout** le système. C’est le principe du **moindre privilège**.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Les trois niveaux d’un système Linux ?', r: 'Matériel, noyau, espace utilisateur.' },
    { q: 'Différence entre mode noyau et mode utilisateur ?', r: 'Mode noyau : accès sans restriction au CPU et à toute la mémoire (le noyau). Mode utilisateur : accès limité à sa propre mémoire et aux instructions sûres (les processus, même root).' },
    { q: 'Comment reconnaître un thread noyau dans `ps` ?', r: 'Son nom est entre crochets : `[kthreadd]`, `[kworker/0:1]`…' },
    { q: 'Les quatre responsabilités du noyau ?', r: 'Processus, mémoire, pilotes de périphériques, appels système.' },
    { q: 'Qu’est-ce qu’un changement de contexte ?', r: 'Le noyau reprend le CPU à un processus (fin de tranche), sauvegarde son état et le donne à un autre.' },
    { q: 'Quand le noyau s’exécute-t-il ?', r: 'Entre les tranches de temps, pendant les changements de contexte, et lors des appels système et interruptions.' },
    { q: 'Rôle de la MMU ?', r: 'Traduire les adresses virtuelles des processus en adresses physiques, selon la table des pages.' },
    { q: 'Qu’est-ce que la table des pages ?', r: 'La carte des correspondances adresses virtuelles → physiques d’un processus, tenue par le noyau.' },
    { q: '`fork()` vs `exec()` ?', r: '`fork()` crée une copie du processus ; `exec()` remplace le programme du processus (même PID).' },
    { q: 'Que se passe-t-il quand tu tapes `ls` ?', r: 'Le shell fait `fork()`, l’enfant fait `exec(ls)`, `ls` s’exécute et se termine, le shell réaffiche l’invite.' },
    { q: 'Quel processus n’est pas né d’un `fork()` ?', r: '`init` / `systemd`, PID 1, lancé directement par le noyau.' },
    { q: 'Trois pseudo-périphériques ?', r: '`/dev/null`, `/dev/zero`, `/dev/urandom` (ou `/dev/random`).' },
    { q: 'Comment le noyau identifie-t-il un utilisateur ?', r: 'Par son UID (numérique). Root = UID 0.' },
    { q: 'root s’exécute-t-il en mode noyau ?', r: 'Non : root a tous les droits dans l’espace utilisateur, mais reste en mode utilisateur.' },
  ],
  memo: `
    ### Les niveaux
    | Niveau | Exemples | Observer |
    |---|---|---|
    | Espace utilisateur | bash, sshd, nginx, systemd (PID 1) | \`ps -eo user,pid,ppid,comm\` |
    | Noyau | ordonnanceur, mémoire virtuelle, pilotes, threads \`[kthreadd]\` | \`uname -r\`, \`lsmod\`, \`ps ax\` (noms entre crochets) |
    | Matériel | CPU, RAM, disques, cartes réseau | \`lscpu\`, \`free -h\`, \`nproc\` |

    ### Commandes d’observation du chapitre
    \`\`\`
    uname -r                     # version du noyau
    nproc                        # nombre de cœurs logiques
    free -h                      # mémoire (colonne available)
    grep ctxt /proc/stat         # changements de contexte depuis le démarrage
    vmstat 1 5                   # colonne cs : changements de contexte / s
    lsmod                        # modules (pilotes) chargés
    head -3 /proc/self/maps      # carte mémoire virtuelle d’un processus
    echo $$                      # PID du shell
    ps -o pid,ppid,comm          # qui est le parent de qui
    id                           # UID, GID, groupes
    \`\`\`

    ### Vocabulaire
    | Français | Anglais |
    |---|---|
    | mode noyau / mode utilisateur | kernel mode / user mode |
    | changement de contexte | context switch |
    | tranche de temps | time slice |
    | table des pages | page table |
    | appel système | system call (syscall) |
    | pseudo-périphérique | pseudodevice |
  `,
});
