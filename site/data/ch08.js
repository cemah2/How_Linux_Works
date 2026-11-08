/* Chapitre 8 : A Closer Look at Processes and Resource Utilization (livre p. 199–222). */
HLW.chapitre({
  id: '08',
  num: 8,
  intro: `
    « Le serveur rame. » C’est la phrase que tout administrateur entend un jour. Ce chapitre donne la boîte à outils pour
    répondre avec des faits plutôt qu’avec des suppositions : quels **fichiers** un processus tient ouverts (\`lsof\`),
    quels **appels système** il fait (\`strace\`), combien de **threads** il a, et surtout comment se répartissent les trois
    grandes ressources : **processeur**, **mémoire**, **entrées-sorties**. Il se termine par les **cgroups**, le mécanisme
    du noyau que systemd utilise pour ranger et limiter les processus.

    Plusieurs outils ne sont pas installés par défaut : \`strace\`, \`lsof\` (Debian), et le paquet \`sysstat\` (\`iostat\`,
    \`pidstat\`, \`sar\`). Le **Lab 06** te met face à une machine lente dont il faut trouver la cause.
  `,
  objectifs: [
    'trouver quel processus utilise un fichier, un répertoire ou un point de montage ;',
    'tracer les appels système d’un programme qui échoue avec `strace` ;',
    'afficher les threads d’un processus ;',
    'mesurer le temps processeur d’une commande et ajuster une priorité avec nice et renice ;',
    'interpréter la charge moyenne, la mémoire et les défauts de page ;',
    'lire `vmstat`, `iostat` et `pidstat` pour localiser un goulot d’étranglement ;',
    'explorer et limiter un cgroup, directement ou via systemd.',
  ],
  certifs: { lpic1: ['103.5', '103.6'], lfcs: ['OD'], rhcsa: ['R4'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '8.1',
      titre: 'Fichiers ouverts : lsof',
      sections: '§8.1 et 8.2', pages: '199–202',
      objectif: 'Savoir quel processus tient un fichier ou un répertoire.',
      rappel: `
        \`top\` (chapitre 2) donne une vue d’ensemble des processus. Pour une vue précise de **ce qu’un processus utilise**,
        \`lsof\` (*list open files*) liste les fichiers ouverts : fichiers ordinaires, répertoires, bibliothèques, tubes,
        sockets réseau, périphériques.

        \`\`\`
        # lsof | less                    # tout (énorme)
        COMMAND  PID USER  FD   TYPE DEVICE SIZE/OFF    NODE NAME
        systemd    1 root  cwd  DIR    8,1     4096       2 /
        systemd    1 root  txt  REG    8,1  1595792 9961784 /usr/lib/systemd/systemd
        vi      1994 lea   3u   REG    8,1    12288  786440 /tmp/.recette.swp
        \`\`\`

        | Colonne | Sens |
        |---|---|
        | FD | rôle (\`cwd\` répertoire courant, \`rtd\` racine, \`txt\` programme, \`mem\` bibliothèque) ou **numéro de descripteur** suivi du mode (\`r\` lecture, \`w\` écriture, \`u\` les deux) |
        | TYPE | \`REG\` fichier, \`DIR\` répertoire, \`IPv4\`, \`unix\`, \`FIFO\`… |
        | DEVICE | numéros majeur, mineur du périphérique qui contient le fichier |
        | NODE | numéro d’inode |

        ### Filtrer

        \`\`\`
        $ lsof +D /srv/recettes          # fichiers ouverts sous ce répertoire (récursif)
        $ lsof -p 1994                   # fichiers ouverts par un processus
        $ lsof /var/log/boutique.log     # qui tient ce fichier ?
        $ lsof -u lea                    # fichiers ouverts par un utilisateur
        $ lsof -i :80                    # qui utilise le port 80 (chapitre 10)
        \`\`\`

        Cas d’usage classiques :

        - « **target is busy** » au démontage (chapitre 4) : \`lsof +D /mnt/donnees\` (ou \`fuser -vm /mnt/donnees\`) montre
          qui bloque.
        - **Disque plein mais \`du\` ne trouve rien** : un fichier supprimé est encore ouvert ; son espace n’est libéré qu’à la
          fermeture. \`lsof +L1\` liste les fichiers supprimés encore ouverts (« (deleted) »).

        Lance \`lsof\` en root pour voir les fichiers de tous les processus.
      `,
      aRetenir: [
        '`lsof` : fichiers ouverts (fichiers, bibliothèques, sockets, tubes).',
        'FD : cwd, rtd, txt, mem, ou numéro + r/w/u.',
        '`lsof +D rép`, `-p PID`, `-u nom`, `-i :port`, `lsof fichier`.',
        'Démontage impossible → `lsof +D` ; espace non libéré → `lsof +L1` (fichiers supprimés ouverts).',
      ],
      exercices: [
        {
          id: 'c08-01-01', type: 'commande', niveau: 1, ref: '§8.2.2, p. 202',
          enonce: '`umount /srv/recettes` répond « target is busy ». Liste les fichiers ouverts **sous ce répertoire** pour trouver le coupable.',
          accepte: ['(sudo )?lsof \\+D /srv/recettes/?', '(sudo )?fuser -v?m /srv/recettes/?', '(sudo )?fuser -mv /srv/recettes/?', '(sudo )?lsof /srv/recettes/?'],
          exemple: 'lsof +D /srv/recettes',
          indices: ['C’est le rôle de lsof.', 'Une option avec un « + » parcourt un répertoire récursivement.', '`lsof +D /srv/recettes`'],
          solution: '```\n# lsof +D /srv/recettes\nCOMMAND  PID USER FD  TYPE DEVICE SIZE/OFF NODE NAME\nbash    3120 lea  cwd DIR  253,2     4096    2 /srv/recettes\n```\nLe shell de Léa a son répertoire courant dedans. Alternative : `fuser -vm /srv/recettes`.',
        },
        {
          id: 'c08-01-02', type: 'commande', niveau: 1, ref: '§8.2.2, p. 202',
          enonce: 'Liste les fichiers ouverts par le processus de PID **1994**.',
          accepte: ['(sudo )?lsof -p ?1994'],
          exemple: 'lsof -p 1994',
          indices: ['Une option de lsof sélectionne un processus.', 'p comme PID.', '`lsof -p 1994`'],
          solution: '```\n$ lsof -p 1994\n```\nTu peux aussi regarder `ls -l /proc/1994/fd` : chaque descripteur y est un lien symbolique.',
        },
        {
          id: 'c08-01-03', type: 'association', niveau: 2, ref: '§8.2.1, p. 201',
          enonce: 'Associe chaque valeur de la colonne FD de lsof à sa signification.',
          paires: [
            ['`cwd`', 'Répertoire courant du processus'],
            ['`txt`', 'Le fichier programme exécuté'],
            ['`mem`', 'Fichier projeté en mémoire (bibliothèque partagée)'],
            ['`3u`', 'Descripteur 3, ouvert en lecture et écriture'],
            ['`1w`', 'Descripteur 1 (sortie standard), ouvert en écriture'],
          ],
          indices: ['cwd = current working directory.', 'txt désigne le code (le « texte ») du programme.', 'r = read, w = write, u = les deux.'],
          solution: 'cwd répertoire courant, txt programme, mem bibliothèque, 3u descripteur 3 lecture-écriture, 1w sortie standard en écriture.',
        },
        {
          id: 'c08-01-04', type: 'qcm', niveau: 3,
          enonce: '`df -h` indique `/var` plein à 100 %, mais `du -sh /var/*` ne trouve que 2 Go sur 10. Hier, quelqu’un a supprimé un gros journal. Que se passe-t-il ?',
          choix: [
            'Le fichier supprimé est encore ouvert par un processus : son espace ne sera libéré qu’à la fermeture (`lsof +L1` le montre)',
            'Le système de fichiers est corrompu',
            'du ne compte pas les fichiers de root',
            'Il faut lancer `sync`',
          ],
          reponse: 0,
          indices: ['Supprimer = retirer un lien (chapitre 4, inodes).', 'L’inode vit tant qu’il a des liens OU qu’un processus le tient ouvert.', 'lsof sait lister les fichiers sans lien.'],
          solution: '`rm` retire le nom, mais l’inode reste tant qu’un processus a le fichier ouvert. `lsof +L1` (ou `lsof | grep deleted`) montre le processus ; redémarre-le (ou fais-lui rouvrir ses journaux) pour libérer l’espace. Pour vider un journal en cours d’utilisation, préfère `truncate -s 0 fichier`.',
        },
        {
          id: 'c08-01-05', type: 'terminal', niveau: 2,
          enonce: 'Sur ta VM, ouvre un fichier avec `less /etc/services` dans une session, puis dans une autre lance `sudo lsof /etc/services` et `ls -l /proc/$(pgrep -x less)/fd`. Colle la sortie.',
          attendu: ['/etc/services'],
          indices: ['Deux connexions SSH, ou tmux.', '`pgrep -x less` donne le PID.', 'Les descripteurs sont des liens dans /proc/PID/fd.'],
          solution: 'lsof affiche une ligne `less  PID  admin  4r  REG … /etc/services` ; dans `/proc/PID/fd`, le lien `4 -> /etc/services`. Les descripteurs 0, 1, 2 pointent vers ton terminal (`/dev/pts/N`).',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '8.2',
      titre: 'Tracer un programme : strace et ltrace',
      sections: '§8.3', pages: '202–204',
      objectif: 'Comprendre pourquoi un programme échoue en observant ses appels système.',
      rappel: `
        Quand un programme meurt dès son lancement avec un message obscur, \`lsof\` n’a pas le temps de le voir. \`strace\`
        lance le programme et affiche **chaque appel système** (chapitre 1) avec ses arguments et son résultat.

        \`\`\`
        $ strace cat /dev/null
        execve("/usr/bin/cat", ["cat", "/dev/null"], 0x7ffd… /* 22 vars */) = 0
        brk(NULL)                               = 0x55d0c8a4f000
        …
        openat(AT_FDCWD, "/dev/null", O_RDONLY) = 3
        read(3, "", 131072)                     = 0
        close(3)                                = 0
        exit_group(0)                           = ?
        \`\`\`

        Le premier appel est \`execve()\` : strace démarre juste après le \`fork()\`. La valeur après \`=\` est le résultat ;
        \`-1\` signale une erreur, suivie de son code :

        \`\`\`
        openat(AT_FDCWD, "/etc/boutique/boutique.conf", O_RDONLY) = -1 ENOENT (No such file or directory)
        \`\`\`

        **ENOENT** (fichier absent) et **EACCES** (permission refusée) sont les erreurs que tu chercheras le plus souvent.

        \`\`\`
        $ strace -o trace.txt ./programme          # sortie dans un fichier (sinon : sur stderr)
        $ strace -f -o trace.txt ./script          # suivre aussi les processus enfants
        $ strace -ff -o trace ./script             # un fichier par processus : trace.PID
        $ strace -e trace=openat,execve ./programme   # seulement certains appels
        # strace -p 2817                          # s’attacher à un processus en cours (Ctrl-C pour lâcher)
        $ strace -c ls                             # résumé : nombre et durée des appels
        \`\`\`

        **ltrace** fait la même chose pour les appels aux **bibliothèques partagées** (\`malloc\`, \`strlen\`…). Il produit
        encore plus de texte, et ne voit pas les programmes liés statiquement.
      `,
      aRetenir: [
        '`strace` : chaque appel système, ses arguments, son résultat ; `-1 ENOENT` / `-1 EACCES` = l’indice cherché.',
        '`-o fichier`, `-f` (enfants), `-ff -o préfixe` (un fichier par processus), `-e trace=…`, `-p PID`, `-c`.',
        'La sortie de strace va sur stderr.',
        '`ltrace` : appels de bibliothèques.',
      ],
      exercices: [
        {
          id: 'c08-02-01', type: 'commande', niveau: 1, ref: '§8.3.1, p. 203',
          enonce: 'Trace les appels système de `/usr/local/bin/boutique` et enregistre la trace dans `trace.txt`.',
          accepte: ['strace -o ?trace\\.txt /usr/local/bin/boutique', 'strace /usr/local/bin/boutique 2> ?trace\\.txt'],
          exemple: 'strace -o trace.txt /usr/local/bin/boutique',
          indices: ['strace écrit sur stderr par défaut.', 'Une option dédiée choisit le fichier de sortie.', '`-o trace.txt`'],
          solution: '```\n$ strace -o trace.txt /usr/local/bin/boutique\n```\n`2> trace.txt` marche aussi, mais mélange la trace avec les propres erreurs du programme.',
        },
        {
          id: 'c08-02-02', type: 'qcm', niveau: 2, ref: '§8.3.1, p. 204',
          enonce: 'Le service boutique refuse de démarrer avec « erreur de configuration ». Dans la trace, quelle ligne t’intéresse le plus ?',
          choix: [
            '`openat(AT_FDCWD, "/etc/boutique/boutique.conf", O_RDONLY) = -1 EACCES (Permission denied)`',
            '`brk(NULL) = 0x55d0c8a4f000`',
            '`mmap(NULL, 8192, PROT_READ|PROT_WRITE, …) = 0x7f…`',
            '`exit_group(1) = ?`',
          ],
          reponse: 0,
          indices: ['Cherche un appel qui renvoie -1.', 'Le message parle de configuration.', 'EACCES = permission refusée.'],
          solution: 'L’appel `openat` sur le fichier de configuration échoue avec **EACCES** : le compte du service ne peut pas le lire. Vérifie propriétaire et droits (`ls -l`, `namei -l`). `exit_group(1)` montre seulement que le programme s’arrête en erreur, pas pourquoi.',
        },
        {
          id: 'c08-02-03', type: 'commande', niveau: 2, ref: '§8.3.1',
          enonce: 'Le script `./deploie.sh` lance plusieurs commandes. Trace-le **ainsi que tous ses processus enfants**, avec **un fichier par processus** de préfixe `trace`.',
          accepte: ['strace -ff -o ?trace \\./deploie\\.sh', 'strace -o ?trace -ff \\./deploie\\.sh'],
          exemple: 'strace -ff -o trace ./deploie.sh',
          pieges: [{ motif: 'strace -f -o ?trace(\\.txt)? \\./deploie\\.sh', message: '`-f` suit les enfants mais met tout dans un seul fichier. On demandait un fichier par processus : `-ff`.' }],
          indices: ['`-f` suit les enfants.', 'Doubler la lettre sépare la sortie par processus.', '`strace -ff -o trace ./deploie.sh` crée trace.PID.'],
          solution: '```\n$ strace -ff -o trace ./deploie.sh\n$ ls trace.*\ntrace.4120  trace.4121  trace.4122\n```',
        },
        {
          id: 'c08-02-04', type: 'association', niveau: 2,
          enonce: 'Associe chaque code d’erreur courant dans une trace à son sens.',
          paires: [
            ['`ENOENT`', 'Le fichier ou répertoire n’existe pas'],
            ['`EACCES`', 'Permission refusée'],
            ['`EADDRINUSE`', 'L’adresse ou le port réseau est déjà utilisé'],
            ['`ENOSPC`', 'Plus de place sur le périphérique'],
          ],
          indices: ['NOENT = no entry.', 'ACCES = accès.', 'NOSPC = no space.'],
          solution: 'ENOENT absent, EACCES permission, EADDRINUSE port pris, ENOSPC disque plein.',
        },
        {
          id: 'c08-02-05', type: 'commande', niveau: 3,
          enonce: 'Le processus 2817 semble bloqué. Attache-toi à lui pour voir quels appels système il fait **en ce moment**.',
          accepte: ['(sudo )?strace -p ?2817', '(sudo )?strace -f -p ?2817', '(sudo )?strace -fp ?2817'],
          exemple: 'strace -p 2817',
          indices: ['strace peut s’attacher à un processus existant.', 'Comme pour lsof, la lettre est p.', '`strace -p 2817` (Ctrl-C pour lâcher, le processus continue).'],
          solution: '```\n# strace -p 2817\nstrace: Process 2817 attached\nread(5, \n```\nIci il attend des données sur le descripteur 5 ; `ls -l /proc/2817/fd/5` montre de quoi il s’agit.',
        },
        {
          id: 'c08-02-06', type: 'terminal', niveau: 2,
          enonce: 'Installe strace (`apt install strace` / `dnf install strace`), puis lance `strace -e trace=openat cat /etc/inexistant`. Colle la sortie et repère l’erreur.',
          attendu: ['ENOENT'],
          indices: ['`-e trace=openat` ne garde que les ouvertures de fichiers.', 'Les premières ouvertures concernent les bibliothèques.', 'La dernière renvoie -1 ENOENT.'],
          solution: 'Tu vois les ouvertures de `ld.so.cache` et `libc.so.6`, puis `openat(AT_FDCWD, "/etc/inexistant", O_RDONLY) = -1 ENOENT (No such file or directory)`, juste avant le message d’erreur de cat.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '8.3',
      titre: 'Les threads',
      sections: '§8.4', pages: '204–206',
      objectif: 'Distinguer processus et threads, et afficher les threads.',
      rappel: `
        Un **thread** (fil d’exécution) ressemble à un processus : il a un identifiant (**TID**) et le noyau l’ordonnance
        de la même façon. Mais tous les threads d’un processus **partagent** sa mémoire et ses ressources d’entrée-sortie
        (fichiers ouverts…). Chaque processus commence avec un thread (le principal), dont le TID est égal au PID.

        Intérêts : un programme multithread peut utiliser **plusieurs cœurs** à la fois, et ses threads communiquent par la
        mémoire partagée, plus vite que des processus séparés. Le revers : des bogues de concurrence plus difficiles.

        \`\`\`
        $ ps m                              # threads sous chaque processus
            PID TTY      STAT   TIME COMMAND
           3587 pts/3    -      0:00 bash
              - -        Ss     0:00 -
          12534 tty7     -    668:30 /usr/lib/xorg/Xorg -core :0
              - -        Ssl+ 659:55 -
              - -        Ssl+   0:00 -
        $ ps m -o pid,tid,command           # avec les TID
        $ ps -eLf                           # une ligne par thread (colonnes LWP et NLWP)
        $ ls /proc/1234/task                # un sous-répertoire par thread
        \`\`\`

        Dans \`top\`, la touche **H** bascule l’affichage par threads. Les noms de colonnes **LWP** (*light-weight process*)
        désignent les threads.
      `,
      aRetenir: [
        'Thread : TID, ordonnancé comme un processus, mais partage mémoire et fichiers du processus.',
        'Thread principal : TID = PID.',
        '`ps m`, `ps m -o pid,tid,command`, `ps -eLf` ; `/proc/PID/task/` ; top : H.',
      ],
      exercices: [
        {
          id: 'c08-03-01', type: 'vrai-faux', niveau: 1, ref: '§8.4.1, p. 204',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Les threads d’un même processus partagent sa mémoire.', vrai: true },
            { texte: 'Chaque thread a sa propre copie des fichiers ouverts du processus.', vrai: false, explication: 'Les descripteurs de fichiers sont partagés entre les threads.' },
            { texte: 'Le TID du thread principal est égal au PID du processus.', vrai: true },
            { texte: 'Un processus multithread peut utiliser plusieurs cœurs en même temps.', vrai: true },
          ],
          indices: ['C’est le partage qui distingue thread et processus.', 'Une seule affirmation est fausse.', 'Les entrées-sorties aussi sont partagées.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
        {
          id: 'c08-03-02', type: 'commande', niveau: 1, ref: '§8.4.2, p. 205',
          enonce: 'Affiche les processus et leurs threads, avec une colonne **TID**, au format `pid,tid,command`.',
          accepte: ['ps m -o ?pid,tid,command', 'ps -m -o ?pid,tid,command', 'ps m -o ?pid,tid,cmd', 'ps -mo ?pid,tid,command', 'ps mo ?pid,tid,command'],
          exemple: 'ps m -o pid,tid,command',
          indices: ['`ps m` affiche les threads.', '`-o` choisit les colonnes.', '`ps m -o pid,tid,command`'],
          solution: '```\n$ ps m -o pid,tid,command\n  PID   TID COMMAND\n 3587     - bash\n    -  3587 -\n12534     - /usr/lib/xorg/Xorg -core :0\n    - 12534 -\n    - 13227 -\n```',
        },
        {
          id: 'c08-03-03', type: 'reponse-courte', niveau: 2,
          enonce: 'Dans quel répertoire de `/proc` trouve-t-on un sous-répertoire par thread du processus 1234 ? (chemin complet)',
          accepte: ['/proc/1234/task/?'],
          indices: ['Le noyau appelle les threads des « tâches ».', 'C’est un sous-répertoire de /proc/1234.', '/proc/1234/task'],
          solution: '`/proc/1234/task/` : un répertoire par TID, avec le même contenu qu’un répertoire de processus.',
        },
        {
          id: 'c08-03-04', type: 'commande', niveau: 2,
          enonce: 'Compte les threads du processus `chronyd`… Plus simplement : affiche **une ligne par thread** pour tous les processus, au format complet.',
          accepte: ['ps -eLf', 'ps -efL', 'ps -Lef', 'ps -e -L -f', 'ps -eLF', 'ps axms'],
          exemple: 'ps -eLf',
          indices: ['L’option `-L` affiche les threads (LWP).', 'Combine-la avec `-e` (tous) et `-f` (complet).', '`ps -eLf`'],
          solution: '```\n$ ps -eLf\nUID   PID  PPID   LWP  C NLWP STIME TTY  TIME CMD\n…\n```\nLWP est le TID, NLWP le nombre de threads du processus.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '8.4',
      titre: 'Temps processeur et priorités',
      sections: '§8.5 à 8.5.2', pages: '206–208',
      objectif: 'Mesurer la consommation d’une commande et donner moins de processeur à une tâche lourde.',
      rappel: `
        ### Mesurer

        \`\`\`
        $ top -p 2817 -p 2818           # suivre seulement ces processus
        $ time ./export-ventes
        real    0m12.442s               # durée totale écoulée
        user    0m3.052s                # temps processeur dans le code du programme
        sys     0m0.991s                # temps processeur dans le noyau pour le compte du programme
        \`\`\`

        **real − (user + sys)** ≈ le temps passé à **attendre** (disque, réseau, autre processus). Ici, l’export attend
        surtout : inutile d’optimiser son calcul.

        Attention : \`time\` est un mot-clé de bash. Le programme \`/usr/bin/time\` (paquet \`time\`) donne plus de détails
        (mémoire maximale, défauts de page, fiche 8.5) : \`/usr/bin/time -v commande\`.

        ### Priorités

        Le noyau ordonnance les processus selon une priorité. Dans \`top\` :

        - **PR** : priorité calculée par le noyau (il l’ajuste en permanence) ;
        - **NI** : la valeur **nice**, l’indication que tu peux donner. De **−20** (prioritaire) à **19** (le plus « gentil »
          envers les autres). Défaut : 0.

        \`\`\`
        $ nice -n 10 ./calcul-stocks          # lancer avec nice 10
        $ renice 19 -p 4120                   # changer un processus en cours (le livre écrit 20 : le noyau ramène à 19)
        # renice -5 -p 4120                   # baisser la valeur (plus prioritaire) : root seulement
        $ ps -o pid,ni,comm -p 4120
        \`\`\`

        Un utilisateur ordinaire peut seulement **augmenter** la valeur nice de ses processus. Donner une valeur négative est
        rarement une bonne idée : les processus système risquent de manquer de processeur. Pour les entrées-sorties, il
        existe l’équivalent \`ionice -c3\` (classe « au repos »).
      `,
      aRetenir: [
        '`time` : real (écoulé), user (code), sys (noyau) ; real ≫ user+sys = attente.',
        '`/usr/bin/time -v` pour la mémoire et les défauts de page.',
        'nice : −20 (prioritaire) à 19 (gentil) ; défaut 0 ; seul root peut baisser.',
        '`nice -n 10 cmd`, `renice 19 -p PID` ; top : colonnes PR et NI.',
      ],
      exercices: [
        {
          id: 'c08-04-01', type: 'qcm', niveau: 2, ref: '§8.5.1, p. 207',
          enonce: '`time ./export-ventes` affiche `real 0m40.1s`, `user 0m1.2s`, `sys 0m0.4s`. Que peux-tu conclure ?',
          choix: [
            'Le programme passe l’essentiel de son temps à attendre (disque, réseau…), pas à calculer',
            'Le programme est très gourmand en processeur',
            'Le noyau est surchargé',
            'La mesure est fausse : real devrait être égal à user + sys',
          ],
          reponse: 0,
          indices: ['user + sys = temps de processeur réellement utilisé.', '1,6 s sur 40 s.', 'Le reste est de l’attente.'],
          solution: 'Seules 1,6 s de processeur sur 40 s : le programme **attend** presque tout le temps (base de données distante, disque lent…). C’est là qu’il faut chercher, avec `strace -c` ou `iostat`.',
        },
        {
          id: 'c08-04-02', type: 'commande', niveau: 1, ref: '§8.5.2, p. 208',
          enonce: 'Le recalcul des stocks (PID **4120**) ralentit tout le monde. Donne-lui la valeur nice la plus élevée possible (**19**).',
          accepte: ['(sudo )?renice (-n )?\\+?19 (-p )?4120', '(sudo )?renice (-n )?20 (-p )?4120'],
          exemple: 'renice 19 -p 4120',
          indices: ['On change la valeur nice d’un processus existant.', 'Commande `renice`.', '`renice 19 -p 4120`'],
          solution: '```\n$ renice 19 -p 4120\n4120 (process ID) old priority 0, new priority 19\n```\nLe processus ne tourne plus que quand le processeur n’a rien de mieux à faire.',
        },
        {
          id: 'c08-04-03', type: 'commande', niveau: 1,
          enonce: 'Lance `./calcul-stocks` directement avec une valeur nice de **10**.',
          accepte: ['nice -n ?\\+?10 \\./calcul-stocks', 'nice -10 \\./calcul-stocks', 'nice --adjustment=10 \\./calcul-stocks'],
          exemple: 'nice -n 10 ./calcul-stocks',
          indices: ['Au lancement : `nice` ; en cours : `renice`.', '`-n` donne l’ajustement.', '`nice -n 10 ./calcul-stocks`'],
          solution: '```\n$ nice -n 10 ./calcul-stocks\n```\nAttention : l’ancienne syntaxe `nice -10` signifie **+10**, pas −10.',
        },
        {
          id: 'c08-04-04', type: 'vrai-faux', niveau: 2, ref: '§8.5.2, p. 208',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Une valeur nice de −20 donne la plus haute priorité.', vrai: true },
            { texte: 'Un utilisateur ordinaire peut passer son processus de nice 0 à nice −5.', vrai: false, explication: 'Seul root peut diminuer la valeur nice.' },
            { texte: 'La colonne PR de top est recalculée en permanence par le noyau.', vrai: true },
            { texte: 'Le `time` tapé dans bash est un mot-clé du shell, différent de /usr/bin/time.', vrai: true },
          ],
          indices: ['Plus la valeur nice est basse, plus le processus est prioritaire.', 'Une seule affirmation est fausse.', 'Être moins gentil demande des privilèges.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
        {
          id: 'c08-04-05', type: 'association', niveau: 1, ref: '§8.5.1, p. 207',
          enonce: 'Associe chaque ligne de la sortie de `time` à sa définition.',
          paires: [
            ['`real`', 'Durée écoulée du début à la fin'],
            ['`user`', 'Temps processeur passé dans le code du programme'],
            ['`sys`', 'Temps processeur passé dans le noyau pour le programme'],
          ],
          indices: ['real = l’horloge murale.', 'user = espace utilisateur.', 'sys = appels système.'],
          solution: 'real : écoulé ; user : code du programme ; sys : travail du noyau pour lui.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '8.5',
      titre: 'Charge moyenne et mémoire',
      sections: '§8.5.3 et 8.5.4', pages: '208–212',
      objectif: 'Interpréter la charge moyenne, l’utilisation mémoire et les défauts de page.',
      rappel: `
        ### La charge moyenne

        \`\`\`
        $ uptime
         14:02:11 up 12 days,  3:41,  2 users,  load average: 0.08, 0.03, 0.01
        \`\`\`

        Les trois nombres : moyenne du nombre de processus **prêts à s’exécuter** (en cours ou en attente du processeur)
        sur **1, 5 et 15 minutes**. Un processus qui attend une frappe ou un paquet réseau ne compte pas. (Linux y ajoute
        les processus bloqués en attente de disque, état D.)

        - À comparer au **nombre de cœurs** (\`nproc\`) : une charge de 2 sur 2 cœurs = processeur pleinement occupé ;
          sur 8 cœurs, c’est calme.
        - Une charge élevée n’est pas un problème si le système répond bien.
        - Charge très élevée **et** système lent : souvent un manque de **mémoire**. Le noyau passe son temps à échanger des
          pages avec le disque (il « rame » : *thrashing*).

        ### La mémoire

        \`\`\`
        $ free -h
                       total   used   free  shared  buff/cache  available
        Mem:           1.9Gi  412Mi  1.1Gi   4.0Mi       561Mi      1.5Gi
        Swap:          1.0Gi     0B  1.0Gi
        \`\`\`

        La colonne à regarder est **available** (estimation de la mémoire utilisable sans swap). Le noyau utilise la mémoire
        libre comme **cache** disque, libéré à la demande : « free » faible n’est donc pas alarmant.

        La mémoire est découpée en **pages** (\`getconf PAGE_SIZE\` → 4096 octets). Le noyau charge les pages **à la
        demande**. Quand une page n’est pas prête, le processus provoque un **défaut de page** :

        - **mineur** : la page est en mémoire, la MMU ne savait pas où ; rapide et fréquent ;
        - **majeur** : la page doit être lue sur le **disque** ; lent. Beaucoup de défauts majeurs = manque de mémoire.

        \`\`\`
        $ /usr/bin/time cal > /dev/null
        0.00user 0.00system 0:00.06elapsed … (2major+254minor)pagefaults 0swaps
        $ ps -o pid,min_flt,maj_flt,rss,comm -p 2817
        \`\`\`

        Quand la mémoire est épuisée, l’**OOM killer** du noyau tue un processus (trace dans le journal :
        \`journalctl -k -g "Out of memory"\`).
      `,
      aRetenir: [
        'Charge = processus prêts (1, 5, 15 min) ; à comparer à `nproc`.',
        'Charge forte + lenteur → penser mémoire (thrashing).',
        '`free -h` : regarder **available** ; le cache est libéré à la demande.',
        'Défaut de page mineur (en mémoire) vs majeur (disque) ; `/usr/bin/time`, `ps -o min_flt,maj_flt`.',
      ],
      exercices: [
        {
          id: 'c08-05-01', type: 'qcm', niveau: 2, ref: '§8.5.3, p. 209',
          enonce: 'Un serveur à **4 cœurs** affiche `load average: 3.90, 3.85, 3.70` et répond normalement. Que faire ?',
          choix: [
            'Rien d’urgent : les 4 cœurs sont bien occupés mais pas saturés, et le système répond',
            'Redémarrer immédiatement',
            'Ajouter de la mémoire',
            'Tuer le processus le plus ancien',
          ],
          reponse: 0,
          indices: ['Compare la charge au nombre de cœurs.', '3,9 sur 4 cœurs, c’est environ 100 %.', 'Le système répond bien.'],
          solution: 'Une charge proche du nombre de cœurs signifie que le processeur est bien utilisé. Tant que la machine répond, ce n’est pas une panne. Surveille la tendance (15 min) et identifie les consommateurs avec `top`.',
        },
        {
          id: 'c08-05-02', type: 'association', niveau: 1, ref: '§8.5.3, p. 209',
          enonce: 'Dans `load average: 0.92, 0.45, 0.20`, associe chaque nombre à sa période.',
          paires: [['0.92', 'Dernière minute'], ['0.45', '5 dernières minutes'], ['0.20', '15 dernières minutes']],
          indices: ['Du plus court au plus long.', '1, 5, 15.', 'La charge augmente : le nombre récent est le plus grand.'],
          solution: '1 min : 0.92 ; 5 min : 0.45 ; 15 min : 0.20. La charge est en train de monter.',
        },
        {
          id: 'c08-05-03', type: 'qcm', niveau: 2, ref: '§8.5.4, p. 210',
          enonce: '`free -h` affiche `total 1.9Gi`, `free 90Mi`, `buff/cache 1.2Gi`, `available 1.3Gi`. La machine manque-t-elle de mémoire ?',
          choix: [
            'Non : le noyau utilise la mémoire libre comme cache, qu’il libère à la demande ; 1,3 Go sont disponibles',
            'Oui : il ne reste que 90 Mo',
            'Oui : le cache prend trop de place, il faut le vider',
            'On ne peut pas savoir sans redémarrer',
          ],
          reponse: 0,
          indices: ['Quelle colonne estime la mémoire réellement utilisable ?', 'Le cache disque se vide quand un programme a besoin de mémoire.', 'available.'],
          solution: 'La colonne **available** (1,3 Go) compte. La mémoire « libre » est faible parce que le noyau l’utilise comme cache, ce qui accélère les accès disque. Vider le cache à la main n’apporte rien.',
        },
        {
          id: 'c08-05-04', type: 'association', niveau: 2, ref: '§8.5.4, p. 211',
          enonce: 'Associe chaque notion à sa définition.',
          paires: [
            ['Défaut de page mineur', 'La page est en mémoire, mais la MMU ne savait pas où'],
            ['Défaut de page majeur', 'La page doit être lue sur le disque'],
            ['Thrashing', 'Le système passe son temps à échanger des pages avec le disque'],
            ['Pagination à la demande', 'Le noyau ne charge une page que lorsque le processus en a besoin'],
          ],
          indices: ['Mineur = sans accès disque.', 'Majeur = avec accès disque.', 'Thrashing = s’agiter sans avancer.'],
          solution: 'Mineur : rapide, pas de disque. Majeur : lecture disque. Thrashing : manque de mémoire, échanges incessants. Pagination à la demande : chargement paresseux.',
        },
        {
          id: 'c08-05-05', type: 'commande', niveau: 2, ref: '§8.5.4, p. 212',
          enonce: 'Affiche le PID, le nombre de défauts de page **mineurs** et **majeurs** du processus **2817**.',
          accepte: ['ps -o ?pid,min_flt,maj_flt (-p )?2817', 'ps -p 2817 -o ?pid,min_flt,maj_flt', 'ps -o ?pid,minflt,majflt (-p )?2817', 'ps -p 2817 -o ?pid,minflt,majflt'],
          exemple: 'ps -o pid,min_flt,maj_flt 2817',
          indices: ['ps permet de choisir les colonnes.', 'Les colonnes s’appellent min_flt et maj_flt.', '`ps -o pid,min_flt,maj_flt 2817`'],
          solution: '```\n$ ps -o pid,min_flt,maj_flt 2817\n  PID  MINFL  MAJFL\n 2817 834182     23\n```',
        },
        {
          id: 'c08-05-06', type: 'commande', niveau: 1,
          enonce: 'Affiche la taille d’une page mémoire du système.',
          accepte: ['getconf PAGE_?SIZE'],
          exemple: 'getconf PAGE_SIZE',
          indices: ['Une commande lit la configuration du système.', '`getconf`', 'Paramètre PAGE_SIZE.'],
          solution: '```\n$ getconf PAGE_SIZE\n4096\n```',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '8.6',
      titre: 'vmstat, iostat, iotop, pidstat',
      sections: '§8.5.5 à 8.5.7', pages: '212–216',
      objectif: 'Localiser un goulot d’étranglement : processeur, mémoire ou disque.',
      rappel: `
        ### vmstat : vue d’ensemble légère

        \`\`\`
        $ vmstat 2                 # une ligne toutes les 2 secondes
        procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
         r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
         1  0      0 1102336  4120 561200    0    0     3    12   95  180  2  1 97  0  0
         5  3  20480   61200  1204 102300  640 1200  4800  1500  900 1400 10 15 20 55  0
        \`\`\`

        | Colonne | Sens | Alerte quand… |
        |---|---|---|
        | r / b | processus prêts / bloqués (en attente d’E/S) | r > nombre de cœurs ; b souvent > 0 |
        | si / so | pages lues depuis / écrites vers le swap | **non nul en continu** : manque de mémoire |
        | bi / bo | blocs lus / écrits sur disque | |
        | us / sy / id | % processeur utilisateur / noyau / inactif | id proche de 0 |
        | wa | % processeur en **attente d’E/S** | élevé : le disque limite |

        La 1ʳᵉ ligne donne des moyennes depuis le démarrage : ignore-la. La 2ᵉ ligne ci-dessus décrit une machine qui
        « rame » : du swap dans les deux sens et 55 % d’attente.

        ### iostat, iotop, pidstat

        Paquet **sysstat** pour iostat et pidstat (à installer).

        \`\`\`
        $ iostat -dx 2              # par disque, statistiques étendues : r/s, w/s, %util…
        $ iostat -p ALL             # avec les partitions
        # iotop -o                  # comme top, pour les E/S ; -o : seulement les processus actifs
        $ pidstat -p 2817 1         # un processus, toutes les secondes : %usr %system %CPU
        $ pidstat -d 1              # E/S par processus ; -r : mémoire
        \`\`\`

        Dans \`iostat -x\`, **%util** proche de 100 % indique un disque saturé. Démarche : \`uptime\` → \`vmstat\` (qui limite :
        CPU, mémoire, E/S ?) → l’outil par processus correspondant (\`top\`/\`pidstat\`, \`iotop\`).
      `,
      aRetenir: [
        '`vmstat 2` : r, b, si/so (swap), bi/bo (disque), us/sy/id/wa ; ignorer la 1ʳᵉ ligne.',
        'si/so non nuls en continu = manque de mémoire ; wa élevé = disque limitant.',
        'sysstat : `iostat -dx` (%util), `pidstat -p PID 1`, `pidstat -d` ; `iotop -o`.',
        'Démarche : uptime → vmstat → outil par processus.',
      ],
      exercices: [
        {
          id: 'c08-06-01', type: 'commande', niveau: 1, ref: '§8.5.5, p. 212',
          enonce: 'Affiche les statistiques de vmstat **toutes les 2 secondes**.',
          accepte: ['vmstat 2', 'vmstat -w 2', 'vmstat 2 \\d+'],
          exemple: 'vmstat 2',
          indices: ['vmstat prend un intervalle en argument.', 'En secondes.', '`vmstat 2`'],
          solution: '```\n$ vmstat 2\n```\nCtrl-C pour arrêter. La première ligne donne des moyennes depuis le démarrage : ne l’interprète pas comme l’état actuel.',
        },
        {
          id: 'c08-06-02', type: 'association', niveau: 2, ref: '§8.5.5, p. 213',
          enonce: 'Associe chaque colonne de vmstat à sa signification.',
          paires: [
            ['`r`', 'Processus prêts à s’exécuter'],
            ['`b`', 'Processus bloqués en attente d’entrées-sorties'],
            ['`si` / `so`', 'Pages échangées avec le swap'],
            ['`bi` / `bo`', 'Blocs lus et écrits sur les disques'],
            ['`wa`', 'Pourcentage du processeur en attente d’entrées-sorties'],
            ['`id`', 'Pourcentage du processeur inactif'],
          ],
          indices: ['r = runnable, b = blocked.', 's = swap, b = blocks.', 'wa = wait, id = idle.'],
          solution: 'r prêts, b bloqués, si/so swap, bi/bo disque, wa attente E/S, id inactif.',
        },
        {
          id: 'c08-06-03', type: 'qcm', niveau: 3, ref: '§8.5.5, p. 213–214',
          enonce: 'vmstat montre pendant plusieurs minutes : `si 800 so 1500`, `wa 50`, `free` très bas, `r 6 b 4`. Diagnostic le plus probable ?',
          choix: [
            'La machine manque de mémoire et swappe en permanence (thrashing)',
            'Un processus consomme tout le processeur en calcul',
            'Le réseau est saturé',
            'Tout est normal',
          ],
          reponse: 0,
          indices: ['si/so mesurent le swap.', 'Swap dans les deux sens, en continu.', 'L’attente d’E/S vient des échanges de pages.'],
          solution: 'Du swap entrant **et** sortant en continu, beaucoup d’attente d’E/S et peu de mémoire libre : **thrashing**. Il faut trouver le processus qui consomme la mémoire (`top` trié par `%MEM` avec la touche M, `ps aux --sort=-rss | head`), le limiter (cgroups, fiche 8.7) ou ajouter de la mémoire.',
        },
        {
          id: 'c08-06-04', type: 'commande', niveau: 2, ref: '§8.5.6, p. 214–215',
          enonce: 'Affiche les statistiques **étendues** de chaque disque toutes les 2 secondes, pour vérifier le taux d’utilisation (`%util`).',
          accepte: ['iostat -dx 2', 'iostat -xd 2', 'iostat -x 2', 'iostat -d -x 2', 'iostat -x -d 2'],
          exemple: 'iostat -dx 2',
          indices: ['L’outil vient du paquet sysstat.', '`-d` pour les disques, `-x` pour les statistiques étendues.', '`iostat -dx 2`'],
          solution: '```\n$ iostat -dx 2\nDevice  r/s   w/s  rkB/s  wkB/s … %util\nsda     2.0 310.5   16.0 9820.0 …  98.7\n```\nUn disque proche de 100 % d’utilisation est saturé.',
        },
        {
          id: 'c08-06-05', type: 'commande', niveau: 2, ref: '§8.5.7, p. 216',
          enonce: 'Surveille la consommation processeur du processus **2817**, une mesure par seconde, avec l’outil de sysstat.',
          accepte: ['pidstat -p ?2817 1', 'pidstat -u -p ?2817 1', 'pidstat 1 -p ?2817'],
          exemple: 'pidstat -p 2817 1',
          indices: ['L’outil par processus de sysstat.', '`-p` sélectionne le processus.', '`pidstat -p 2817 1`'],
          solution: '```\n$ pidstat -p 2817 1\n14:10:01  UID   PID  %usr %system %guest %wait  %CPU CPU Command\n14:10:02 1001  2817 95.00    2.00   0.00  0.00 97.00   1 thermostat-cuve\n```',
        },
        {
          id: 'c08-06-06', type: 'commande', niveau: 2, ref: '§8.5.6, p. 215',
          enonce: 'Lance l’outil de type « top pour les entrées-sorties » en n’affichant que les processus qui font **réellement** des E/S.',
          accepte: ['(sudo )?iotop -o', '(sudo )?iotop --only', '(sudo )?iotop -oP', '(sudo )?iotop -Po', '(sudo )?iotop-c -o'],
          exemple: 'iotop -o',
          indices: ['Son nom combine I/O et top.', 'Une option masque les processus inactifs.', '`iotop -o`'],
          solution: '```\n# iotop -o\n```\nNécessite root. Sur Rocky, le paquet peut s’appeler `iotop-c`.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '8.7',
      titre: 'Les cgroups',
      sections: '§8.6', pages: '216–221',
      objectif: 'Comprendre comment le noyau regroupe et limite les processus, et l’utiliser via systemd.',
      rappel: `
        Un **cgroup** (*control group*) est un groupe de processus auquel le noyau applique des **contrôleurs** : limites et
        comptabilité de processeur (\`cpu\`), mémoire (\`memory\`), nombre de processus (\`pids\`), E/S (\`io\`).
        systemd range **chaque service et chaque session** dans son propre cgroup (c’est ainsi qu’il retrouve tous les
        processus d’un service pour les arrêter). Les conteneurs (chapitre 17) reposent aussi dessus.

        Debian 13 et Rocky 10 utilisent **cgroups v2** : une seule hiérarchie, montée en \`cgroup2\` sur \`/sys/fs/cgroup\`.

        \`\`\`
        $ cat /proc/self/cgroup
        0::/user.slice/user-1000.slice/session-2.scope
        $ cd /sys/fs/cgroup/user.slice/user-1000.slice/session-2.scope
        $ cat cgroup.procs              # PID membres (cgroup.threads : avec les threads)
        $ cat cgroup.controllers        # contrôleurs disponibles : memory pids
        $ cat pids.current memory.max   # nombre de tâches ; limite mémoire (« max » = aucune ici)
        $ cat cpu.stat                  # usage_usec, user_usec, system_usec cumulés
        \`\`\`

        ### Modifier

        On agit **en écrivant dans des fichiers** (root) :

        \`\`\`
        # echo 3000 > pids.max          # au plus 3000 tâches
        # echo 4120 > cgroup.procs      # déplacer un processus dans ce cgroup
        # mkdir /sys/fs/cgroup/essai    # créer un cgroup (le noyau crée les fichiers) ; rmdir pour supprimer
        \`\`\`

        Règles : les processus ne vont que dans les cgroups **feuilles** ; un enfant n’a que les contrôleurs activés par son
        parent dans \`cgroup.subtree_control\` (\`echo "+cpu +pids" > cgroup.subtree_control\`).

        ### Avec systemd (la méthode au quotidien)

        \`\`\`
        $ systemd-cgls                                  # l’arbre des cgroups
        $ systemd-cgtop                                 # top par cgroup
        # systemctl set-property boutique.service MemoryMax=300M CPUQuota=50%
        # systemd-run --scope -p MemoryMax=200M ./calcul-stocks
        \`\`\`

        Dans un fichier d’unité, section \`[Service]\` : \`MemoryMax=\`, \`CPUQuota=\`, \`TasksMax=\`, \`IOWeight=\`.
        Les **slices** (\`system.slice\`, \`user.slice\`) regroupent services et sessions.
      `,
      aRetenir: [
        'cgroup = groupe de processus + contrôleurs (cpu, memory, pids, io) ; v2 sur `/sys/fs/cgroup`.',
        '`/proc/PID/cgroup` ; fichiers `cgroup.procs`, `cgroup.controllers`, `pids.max`, `memory.max`, `cpu.stat`.',
        'On écrit dans les fichiers ; processus seulement dans les feuilles ; `cgroup.subtree_control`.',
        'systemd : `systemd-cgls`, `systemd-cgtop`, `systemctl set-property … MemoryMax= CPUQuota=`.',
      ],
      exercices: [
        {
          id: 'c08-07-01', type: 'commande', niveau: 1, ref: '§8.6.2, p. 219',
          enonce: 'Affiche le cgroup auquel appartient **ton shell actuel**.',
          accepte: ['cat /proc/self/cgroup', 'cat /proc/\\$\\$/cgroup', 'cat /proc/\\$\\{\\$\\}/cgroup'],
          exemple: 'cat /proc/self/cgroup',
          indices: ['L’information se trouve dans /proc.', '`/proc/self` désigne le processus qui lit (ici cat, enfant du shell, même cgroup).', '`cat /proc/self/cgroup`'],
          solution: '```\n$ cat /proc/self/cgroup\n0::/user.slice/user-1000.slice/session-2.scope\n```\nLe `0::` indique la hiérarchie unique de cgroups v2.',
        },
        {
          id: 'c08-07-02', type: 'association', niveau: 2, ref: '§8.6.2–8.6.4, p. 219–221',
          enonce: 'Associe chaque fichier d’un cgroup à son rôle.',
          paires: [
            ['`cgroup.procs`', 'Liste des PID membres du cgroup'],
            ['`cgroup.controllers`', 'Contrôleurs disponibles pour ce cgroup'],
            ['`cgroup.subtree_control`', 'Contrôleurs activés pour les cgroups enfants'],
            ['`pids.max`', 'Nombre maximal de tâches'],
            ['`memory.max`', 'Limite de mémoire'],
            ['`cpu.stat`', 'Temps processeur consommé cumulé'],
          ],
          indices: ['Les fichiers sont préfixés par le nom du contrôleur.', 'subtree = sous-arbre.', 'stat = statistiques.'],
          solution: 'procs : membres ; controllers : disponibles ; subtree_control : pour les enfants ; pids.max, memory.max : limites ; cpu.stat : consommation.',
        },
        {
          id: 'c08-07-03', type: 'commande', niveau: 2, ref: '§8.6.3, p. 220',
          enonce: 'Tu es dans le répertoire d’un cgroup, en root. Limite ce cgroup à **3000** tâches au maximum.',
          accepte: ['echo ["\']?3000["\']? > ?pids\\.max', 'echo ["\']?3000["\']? \\| (sudo )?tee pids\\.max'],
          exemple: 'echo 3000 > pids.max',
          indices: ['Avec les cgroups, on agit en écrivant dans un fichier.', 'Le fichier du contrôleur pids pour la limite.', '`echo 3000 > pids.max`'],
          solution: '```\n# echo 3000 > pids.max\n```\nUne bombe fork (`:(){ :|:& };:`) lancée dans ce cgroup ne pourra pas dépasser 3000 processus.',
        },
        {
          id: 'c08-07-04', type: 'commande', niveau: 2,
          enonce: 'Avec systemd, limite le service `boutique.service` à **300 Mo** de mémoire, sans éditer son fichier d’unité.',
          accepte: ['(sudo )?systemctl set-property boutique(\\.service)? MemoryMax=300M', '(sudo )?systemctl set-property --runtime boutique(\\.service)? MemoryMax=300M'],
          exemple: 'systemctl set-property boutique.service MemoryMax=300M',
          indices: ['systemctl peut modifier une propriété d’unité.', 'Sous-commande `set-property`.', 'La propriété : `MemoryMax=`.'],
          solution: '```\n# systemctl set-property boutique.service MemoryMax=300M\n$ systemctl show -p MemoryMax boutique\nMemoryMax=314572800\n```\nsystemd écrit un fichier de surcharge dans `/etc/systemd/system.control/` et met à jour `memory.max` du cgroup. `--runtime` : jusqu’au prochain redémarrage seulement.',
        },
        {
          id: 'c08-07-05', type: 'vrai-faux', niveau: 2, ref: '§8.6',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'On manipule les cgroups en lisant et écrivant des fichiers sous /sys/fs/cgroup.', vrai: true },
            { texte: 'En cgroups v2, on peut placer un processus dans un cgroup qui a des cgroups enfants avec contrôleurs.', vrai: false, explication: 'Les processus ne vont que dans les feuilles (sauf la racine).' },
            { texte: 'systemd place chaque service dans son propre cgroup.', vrai: true },
            { texte: '`memory.max` contenant « max » signifie qu’aucune limite n’est fixée à ce niveau.', vrai: true, explication: 'Un parent peut tout de même imposer une limite.' },
          ],
          indices: ['Pas d’appel système dédié : tout passe par un système de fichiers.', 'Une seule affirmation est fausse.', 'Règle des feuilles.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
        {
          id: 'c08-07-06', type: 'terminal', niveau: 2,
          enonce: 'Sur ta VM : `systemd-cgls --no-pager | head -30`, puis `cat /sys/fs/cgroup/system.slice/ssh.service/cpu.stat` (sur fut : `sshd.service`). Colle la sortie. Combien de microsecondes de processeur sshd a-t-il consommées ?',
          attendu: ['usage_usec'],
          indices: ['systemd-cgls affiche l’arbre des slices et services.', 'Le chemin du cgroup d’un service est sous system.slice.', 'La ligne usage_usec donne le total.'],
          solution: 'systemd-cgls montre `-.slice`, `user.slice` (tes sessions), `system.slice` (les services). `cpu.stat` affiche `usage_usec`, `user_usec`, `system_usec` : temps cumulé de tous les processus passés dans ce cgroup, y compris ceux qui sont terminés.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Qui bloque le démontage de /mnt/donnees ?', r: '`lsof +D /mnt/donnees` ou `fuser -vm /mnt/donnees`.' },
    { q: 'Fichiers ouverts par le PID 1994 ?', r: '`lsof -p 1994` (ou `ls -l /proc/1994/fd`).' },
    { q: 'Disque plein mais du ne trouve rien ?', r: 'Fichier supprimé encore ouvert : `lsof +L1`, redémarrer le processus.' },
    { q: 'Tracer un programme dans un fichier ?', r: '`strace -o trace.txt programme` ; `-f` enfants ; `-ff` un fichier par processus.' },
    { q: 'ENOENT ? EACCES ?', r: 'Fichier absent ; permission refusée.' },
    { q: 'S’attacher à un processus en cours avec strace ?', r: '`strace -p PID`' },
    { q: 'Ce que partagent les threads d’un processus ?', r: 'La mémoire et les fichiers ouverts (descripteurs).' },
    { q: 'Afficher les threads ?', r: '`ps m -o pid,tid,command`, `ps -eLf`, top + H, `/proc/PID/task`.' },
    { q: 'time : real, user, sys ?', r: 'Écoulé ; processeur dans le programme ; processeur dans le noyau. real ≫ user+sys = attente.' },
    { q: 'Plage des valeurs nice ?', r: '−20 (prioritaire) à 19 ; défaut 0 ; seul root peut baisser.' },
    { q: 'Lancer avec nice 10 ? modifier le PID 4120 ?', r: '`nice -n 10 cmd` ; `renice 19 -p 4120`.' },
    { q: 'Les trois nombres de load average ?', r: 'Processus prêts en moyenne sur 1, 5 et 15 min ; comparer à `nproc`.' },
    { q: 'Quelle colonne de free regarder ?', r: '`available`.' },
    { q: 'Défaut de page mineur vs majeur ?', r: 'Mineur : en mémoire ; majeur : lecture disque (lent).' },
    { q: 'vmstat : si/so ? wa ?', r: 'Échanges avec le swap ; % processeur en attente d’E/S.' },
    { q: 'Disque saturé ?', r: '`iostat -dx 2` : %util proche de 100 %.' },
    { q: 'Paquet de iostat et pidstat ?', r: 'sysstat.' },
    { q: 'Où sont les cgroups v2 ?', r: '/sys/fs/cgroup (type cgroup2) ; `/proc/PID/cgroup`.' },
    { q: 'Limiter un cgroup à 3000 tâches ?', r: '`echo 3000 > pids.max`' },
    { q: 'Limiter la mémoire d’un service avec systemd ?', r: '`systemctl set-property svc MemoryMax=300M` (ou MemoryMax= dans [Service]).' },
  ],
  memo: `
    ### Fichiers ouverts et traces
    \`\`\`
    lsof +D rép | -p PID | -u nom | -i :80 | fichier | +L1      fuser -vm /point
    ls -l /proc/PID/fd
    strace [-f | -ff] -o fichier cmd    strace -e trace=openat,execve cmd    strace -p PID    strace -c cmd
    ltrace cmd
    \`\`\`
    Erreurs : ENOENT (absent) · EACCES (permission) · EADDRINUSE (port pris) · ENOSPC (plein)

    ### Threads et priorités
    \`\`\`
    ps m -o pid,tid,command    ps -eLf    /proc/PID/task    top : H
    time cmd    /usr/bin/time -v cmd    top -p PID
    nice -n 10 cmd    renice 19 -p PID    ps -o pid,ni,comm    ionice -c3 -p PID
    \`\`\`

    ### Charge, mémoire, E/S
    \`\`\`
    uptime    nproc    free -h (available)    getconf PAGE_SIZE
    ps -o pid,min_flt,maj_flt,rss,comm -p PID    ps aux --sort=-rss | head
    vmstat 2 : r b | si so | bi bo | us sy id wa
    iostat -dx 2 (%util)    iotop -o    pidstat -p PID 1    pidstat -d 1    pidstat -r 1
    journalctl -k -g "Out of memory"
    \`\`\`

    ### cgroups v2
    \`\`\`
    cat /proc/self/cgroup      /sys/fs/cgroup/<chemin>/
    cgroup.procs  cgroup.controllers  cgroup.subtree_control  pids.max  pids.current  memory.max  memory.current  cpu.stat
    echo 3000 > pids.max    echo PID > cgroup.procs    echo "+cpu +pids" > cgroup.subtree_control
    systemd-cgls    systemd-cgtop    systemctl set-property svc MemoryMax=300M CPUQuota=50%
    systemd-run --scope -p MemoryMax=200M cmd
    \`\`\`
  `,
});
