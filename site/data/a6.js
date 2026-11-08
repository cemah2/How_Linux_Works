/* Module A6 (hors livre) : observabilité, méthode, perf, eBPF et bpftrace. */
HLW.chapitre({
  id: 'A6',
  intro: `
    Le chapitre 8 et le Lab 06 t’ont donné les outils classiques (top, vmstat, iostat, pidstat, strace). Ce
    module ajoute deux choses : une **méthode** pour ne pas chercher au hasard quand « le serveur rame », et les
    outils modernes qui observent le noyau **en production, sans le ralentir** : **perf** (profilage) et
    **eBPF** (BCC et bpftrace), qui répondent à des questions qu’aucun outil classique ne pose, comme « quels
    fichiers ce service ouvre-t-il ? » ou « quelle est la distribution des temps d’accès disque ? ».
  `,
  objectifs: [
    'appliquer la méthode USE et la vérification des 60 premières secondes ;',
    'lire la pression sur les ressources (PSI) et les historiques sysstat ;',
    'profiler le processeur avec perf ;',
    'expliquer ce qu’est eBPF et utiliser les outils BCC prêts à l’emploi ;',
    'écrire des commandes bpftrace d’une ligne pour tracer et compter.',
  ],
  certifs: { lfcs: ['OD'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: 'A6.1',
      titre: 'Une méthode : USE et les 60 premières secondes',
      objectif: 'Diagnostiquer une lenteur dans le bon ordre, sans se précipiter sur une hypothèse.',
      rappel: `
        **Méthode USE** (Brendan Gregg) : pour **chaque ressource** (processeur, mémoire, disques, réseau),
        regarder trois choses.

        | Lettre | Question | Exemples d’indicateurs |
        |---|---|---|
        | **U**tilisation | quelle part du temps est-elle occupée ? | %CPU, %util d’un disque |
        | **S**aturation | du travail attend-il ? | file d’exécution (r de vmstat), swap, aqu-sz d’iostat |
        | **E**rreurs | y a-t-il des erreurs ? | dmesg, erreurs d’interface (ip -s link), I/O error |

        ### Les 60 premières secondes

        \`\`\`
        $ uptime                      # charge sur 1, 5, 15 min : ça monte ou ça descend ?
        $ dmesg -T | tail             # erreurs du noyau, OOM killer, disques
        $ vmstat 1 5                  # r (file CPU), si/so (swap), wa (attente disque)
        $ mpstat -P ALL 1 3           # un seul processeur saturé ?
        $ pidstat 1 3                 # quels processus consomment
        $ iostat -xz 1 3              # %util, r_await/w_await, aqu-sz par disque
        $ free -m                     # mémoire disponible (available)
        $ sar -n DEV 1 3              # débit réseau par interface
        $ sar -n TCP,ETCP 1 3         # connexions, retransmissions
        $ top                         # vue d'ensemble pour finir
        \`\`\`

        ### La pression (PSI)

        Le noyau mesure le temps pendant lequel des tâches **attendent** une ressource :

        \`\`\`
        $ cat /proc/pressure/cpu /proc/pressure/memory /proc/pressure/io
        some avg10=12.50 avg60=8.20 avg300=3.10 total=…
        full avg10=4.00 …
        \`\`\`

        \`some\` : au moins une tâche attend ; \`full\` : toutes attendent (le travail n’avance plus). Si
        \`/proc/pressure\` est absent, le noyau a été démarré sans PSI (cas fréquent des noyaux de la famille
        Red Hat) : paramètre de démarrage \`psi=1\`. Les cgroups ont aussi leurs fichiers \`*.pressure\`.

        **Historique** : le paquet \`sysstat\` (timer \`sysstat-collect\`) enregistre les mesures ;
        \`sar -u\`, \`sar -r\`, \`sar -d -f /var/log/sysstat/saDD\` (Rocky : \`/var/log/sa/saDD\`) montrent ce
        qui s’est passé **cette nuit**, quand personne ne regardait.
      `,
      aRetenir: [
        'USE : Utilisation, Saturation, Erreurs, pour chaque ressource.',
        '60 s : uptime, dmesg, vmstat, mpstat, pidstat, iostat -xz, free, sar -n DEV / TCP,ETCP, top.',
        'PSI : /proc/pressure/{cpu,memory,io}, some/full ; psi=1 si absent.',
        'sysstat : `sar` sur les fichiers d’historique.',
      ],
      exercices: [
        {
          id: 'cA6-01-01', type: 'association', niveau: 1,
          enonce: 'Associe chaque indicateur à la lettre de la méthode USE.',
          paires: [['%util d’un disque à 98 %', 'Utilisation'], ['Colonne r de vmstat à 12 sur 4 processeurs', 'Saturation'], ['« I/O error » dans dmesg', 'Erreurs'], ['Colonnes si/so de vmstat non nulles', 'Saturation (mémoire)']],
          indices: ['Utilisation = taux d’occupation.', 'Saturation = file d’attente.', 'Erreurs = messages d’erreur.'],
          solution: '%util : utilisation ; file d’exécution et swap : saturation ; I/O error : erreurs.',
        },
        {
          id: 'cA6-01-02', type: 'commande', niveau: 1,
          enonce: 'Affiche les statistiques étendues des disques, toutes les secondes, en masquant les périphériques inactifs.',
          accepte: ['iostat -xz 1( \\d+)?', 'iostat -zx 1( \\d+)?', 'iostat -x -z 1( \\d+)?', 'iostat -z -x 1( \\d+)?'],
          exemple: 'iostat -xz 1',
          indices: ['iostat du paquet sysstat.', '-x étendu, -z masque l’inactif.', 'Puis l’intervalle.'],
          solution: '```\n$ iostat -xz 1\n```\nRegarde %util (utilisation), aqu-sz (saturation) et r_await/w_await (latence).',
        },
        {
          id: 'cA6-01-03', type: 'qcm', niveau: 2,
          enonce: '`cat /proc/pressure/memory` affiche `full avg10=35.00`. Qu’est-ce que cela signifie ?',
          choix: [
            'Pendant 35 % des 10 dernières secondes, toutes les tâches non inactives étaient bloquées en attente de mémoire',
            'La mémoire est utilisée à 35 %',
            '35 processus attendent de la mémoire',
            'Le swap est plein à 35 %',
          ],
          reponse: 0,
          indices: ['PSI mesure du temps, pas de l’espace.', 'full = toutes les tâches attendent.', 'avg10 = moyenne sur 10 secondes.'],
          solution: '`full` : le système ne fait plus de travail utile pendant ce temps (récupération mémoire, swap). 35 % est un signal fort de manque de mémoire.',
        },
        {
          id: 'cA6-01-04', type: 'ordre', niveau: 2,
          enonce: 'Remets dans l’ordre conseillé le début d’un diagnostic de lenteur.',
          elements: ['uptime', 'dmesg -T | tail', 'vmstat 1 5', 'pidstat 1 3', 'iostat -xz 1 3'],
          indices: ['D’abord la tendance de la charge.', 'Puis les erreurs évidentes du noyau.', 'Puis l’ensemble, les processus, les disques.'],
          solution: 'uptime → dmesg → vmstat → pidstat → iostat (puis free, sar, top).',
        },
        {
          id: 'cA6-01-05', type: 'commande', niveau: 2,
          enonce: 'Sur cuve, affiche l’utilisation processeur enregistrée par sysstat dans le fichier d’historique `/var/log/sysstat/sa08`.',
          accepte: ['sar -u -f /var/log/sysstat/sa08', 'sar -f /var/log/sysstat/sa08 -u', 'sar -f /var/log/sysstat/sa08', 'sar -u ALL -f /var/log/sysstat/sa08'],
          exemple: 'sar -u -f /var/log/sysstat/sa08',
          indices: ['sar lit l’historique avec -f.', '-u pour le processeur.', '`sar -u -f fichier`'],
          solution: '```\n$ sar -u -f /var/log/sysstat/sa08\n02:00:01  CPU  %user  %system  %iowait  %idle\n02:10:01  all  12.3    4.1      61.0     22.6\n```\nUn %iowait élevé à 2 h ? La sauvegarde nocturne, sans doute (Lab 06).',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A6.2',
      titre: 'Profiler avec perf',
      objectif: 'Savoir où le processeur passe son temps, fonction par fonction.',
      rappel: `
        **perf** (paquet \`linux-perf\` sur Debian, \`perf\` sur Rocky) lit les compteurs du processeur et
        échantillonne ce qui s’exécute, noyau compris.

        \`\`\`
        $ sudo perf top                               # fonctions les plus présentes, en direct (q pour quitter)
        $ sudo perf stat -- ./calcul-stocks           # compteurs : temps, changements de contexte, défauts de page…
        $ sudo perf stat -a sleep 5                   # toute la machine pendant 5 s
        $ sudo perf record -F 99 -a -g -- sleep 10    # échantillonner 99 fois/s, avec les piles d'appels
        $ sudo perf report                            # explorer perf.data
        $ sudo perf record -F 99 -g -p 1234 -- sleep 10   # un seul processus
        \`\`\`

        - Échantillonner à **99 Hz** (et non 100) évite de tomber en phase avec des tâches périodiques.
        - \`-g\` enregistre les **piles d’appels** : on voit qui appelle la fonction coûteuse.
        - Les noms de fonctions demandent les **symboles** : sans eux, \`perf report\` affiche des adresses
          (paquets \`-dbgsym\` sur Debian, \`debuginfo\` sur Rocky).
        - Dans une VM, les compteurs matériels (\`cycles\`, \`instructions\`) sont souvent \`<not supported>\` :
          perf se rabat sur l’horloge (\`cpu-clock\`), suffisant pour profiler.
        - Les **flame graphs** (graphiques en flammes) représentent ces piles : la largeur d’une boîte est le
          temps passé dans la fonction et ses appelées.
      `,
      aRetenir: [
        '`perf top`, `perf stat [-a] -- cmd`, `perf record -F 99 -a -g -- sleep 10`, `perf report`.',
        '99 Hz ; -g = piles d’appels ; -p PID.',
        'Symboles de débogage pour des noms lisibles ; compteurs matériels souvent absents en VM.',
        'Flame graph : largeur = temps passé.',
      ],
      exercices: [
        {
          id: 'cA6-02-01', type: 'commande', niveau: 1,
          enonce: 'Affiche en direct les fonctions (noyau et programmes) qui consomment le plus de processeur.',
          accepte: ['(sudo )?perf top( -g)?'],
          exemple: 'perf top',
          indices: ['perf a une vue « à la top ».', 'Sous-commande top.', '`perf top`'],
          solution: '```\n$ sudo perf top\n  32.10%  calcul-stocks  [.] trier_articles\n   8.40%  [kernel]       [k] clear_page_erms\n```\n[.] = espace utilisateur, [k] = noyau.',
        },
        {
          id: 'cA6-02-02', type: 'commande', niveau: 2,
          enonce: 'Enregistre pendant 10 secondes un profil de **toute la machine**, à 99 échantillons par seconde, **avec les piles d’appels**.',
          accepte: ['(sudo )?perf record -F ?99 -a -g -- sleep 10', '(sudo )?perf record -a -g -F ?99 -- sleep 10', '(sudo )?perf record -F ?99 -ag -- sleep 10', '(sudo )?perf record -F ?99 -g -a -- sleep 10', '(sudo )?perf record -F ?99 -a -g sleep 10', '(sudo )?perf record -ag -F ?99 -- sleep 10'],
          exemple: 'perf record -F 99 -a -g -- sleep 10',
          indices: ['perf record.', '-F fréquence, -a toute la machine, -g piles.', 'La durée est donnée par une commande : sleep 10.'],
          solution: '```\n$ sudo perf record -F 99 -a -g -- sleep 10\n$ sudo perf report\n```',
        },
        {
          id: 'cA6-02-03', type: 'qcm', niveau: 2,
          enonce: 'Dans `perf report`, tu vois des lignes comme `0x00000000004011a6` au lieu de noms de fonctions. Pourquoi ?',
          choix: ['Le programme n’a pas de symboles (binaire « strippé » ou sans paquet de débogage)', 'perf est mal installé', 'Il faut augmenter la fréquence', 'Le noyau est trop ancien'],
          reponse: 0,
          indices: ['perf a besoin de faire correspondre les adresses à des noms.', 'Ces noms sont dans la table des symboles.', 'strip les retire (fiche 15.A).'],
          solution: 'Sans symboles, perf ne peut afficher que des adresses. Installe le paquet de débogage (-dbgsym, debuginfo) ou compile avec -g.',
        },
        {
          id: 'cA6-02-04', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Échantillonner à 99 Hz plutôt qu’à 100 Hz évite de se synchroniser avec des tâches périodiques.', vrai: true },
            { texte: 'Dans une VM, les compteurs matériels comme cycles peuvent être indisponibles.', vrai: true },
            { texte: 'Dans un flame graph, la hauteur d’une pile indique le temps passé.', vrai: false, explication: 'C’est la largeur ; la hauteur est la profondeur d’appel.' },
            { texte: '`perf stat` compte des événements pendant l’exécution d’une commande.', vrai: true },
          ],
          indices: ['Synchronisation.', 'Une seule fausse.', 'Largeur ou hauteur ?'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A6.3',
      titre: 'eBPF et les outils BCC',
      objectif: 'Comprendre eBPF et utiliser des outils de traçage prêts à l’emploi.',
      rappel: `
        **eBPF** permet de charger dans le noyau de **petits programmes vérifiés** qui s’exécutent sur des
        événements (appel système, fonction du noyau, paquet réseau, point de trace) et remontent des
        **mesures agrégées**. Le **vérificateur** du noyau refuse tout programme qui pourrait boucler sans fin ou
        lire n’importe où : c’est ce qui rend eBPF utilisable en production. eBPF sert aussi au réseau et à la
        sécurité (Cilium, systemd \`IPAddressDeny=\`, \`RestrictFileSystems=\`).

        **BCC** fournit des dizaines d’outils prêts à l’emploi (en root) :

        | Outil | Question |
        |---|---|
        | **execsnoop** | quels programmes sont lancés (même très brièvement) ? |
        | **opensnoop** | quels fichiers sont ouverts, par qui, avec quel résultat ? |
        | **biolatency** | quelle est la distribution des temps d’accès disque ? |
        | **biosnoop** | chaque accès disque : processus, taille, latence |
        | **tcpconnect** / **tcpaccept** | quelles connexions TCP sortantes / entrantes ? |
        | **tcpretrans** | quelles retransmissions TCP ? |
        | **runqlat** | combien de temps les tâches attendent-elles un processeur ? |
        | **ext4slower** / **xfsslower** | quelles opérations du système de fichiers sont lentes ? |

        \`\`\`
        # apt install bpfcc-tools        → les outils s'appellent execsnoop-bpfcc, opensnoop-bpfcc…
        # dnf install bcc-tools          → /usr/share/bcc/tools/execsnoop, opensnoop…
        $ sudo opensnoop-bpfcc -n vitrine          # Debian ; Rocky : /usr/share/bcc/tools/opensnoop -n vitrine
        $ sudo biolatency-bpfcc 5 1                # histogramme des latences disque sur 5 s
        \`\`\`

        Un script lancé par cron qui ne vit qu’une fraction de seconde est invisible pour \`top\` ; **execsnoop**
        le voit passer.
      `,
      aRetenir: [
        'eBPF : petits programmes vérifiés dans le noyau, déclenchés par des événements, mesures agrégées.',
        'BCC : execsnoop, opensnoop, biolatency, biosnoop, tcpconnect, tcpretrans, runqlat, ext4slower.',
        'Debian : bpfcc-tools (suffixe -bpfcc) ; Rocky : bcc-tools dans /usr/share/bcc/tools.',
      ],
      exercices: [
        {
          id: 'cA6-03-01', type: 'association', niveau: 1,
          enonce: 'Associe chaque outil BCC à la question à laquelle il répond.',
          paires: [['execsnoop', 'Quels programmes sont lancés ?'], ['opensnoop', 'Quels fichiers sont ouverts ?'], ['biolatency', 'Quelle est la distribution des latences disque ?'], ['tcpconnect', 'Quelles connexions TCP sortantes ?'], ['runqlat', 'Combien de temps les tâches attendent-elles un processeur ?']],
          indices: ['exec = lancer un programme.', 'open = ouvrir un fichier.', 'bio = block I/O ; runq = file d’exécution.'],
          solution: 'execsnoop : lancements ; opensnoop : fichiers ; biolatency : disque ; tcpconnect : connexions ; runqlat : attente processeur.',
        },
        {
          id: 'cA6-03-02', type: 'qcm', niveau: 2,
          enonce: 'Qu’est-ce qui permet de charger un programme eBPF dans le noyau d’un serveur de production sans risquer de le planter ?',
          choix: [
            'Le vérificateur du noyau, qui refuse les programmes pouvant boucler sans fin ou accéder à de la mémoire interdite',
            'Le fait qu’eBPF tourne dans l’espace utilisateur',
            'Le redémarrage automatique du noyau en cas d’erreur',
            'Rien : eBPF est réservé aux machines de test',
          ],
          reponse: 0,
          indices: ['Le programme est contrôlé avant d’être accepté.', 'Un composant du noyau fait ce contrôle.', 'vérificateur (verifier).'],
          solution: 'Le **vérificateur** analyse chaque programme avant de l’accepter : terminaison garantie, accès mémoire contrôlés. C’est la différence avec un module noyau.',
        },
        {
          id: 'cA6-03-03', type: 'commande', niveau: 2,
          enonce: 'Sur cuve (Debian), affiche les fichiers ouverts par les processus nommés `vitrine`, avec l’outil BCC adapté.',
          accepte: ['(sudo )?opensnoop-bpfcc -n vitrine', '(sudo )?opensnoop-bpfcc --name vitrine', '(sudo )?/usr/sbin/opensnoop-bpfcc -n vitrine'],
          exemple: 'opensnoop-bpfcc -n vitrine',
          indices: ['Les outils BCC de Debian ont le suffixe -bpfcc.', 'open + snoop.', 'Option -n pour filtrer sur le nom.'],
          solution: '```\n$ sudo opensnoop-bpfcc -n vitrine\nPID    COMM     FD ERR PATH\n2741   vitrine   7   0 /opt/vitrine/www/index.html\n2741   vitrine  -1   2 /opt/vitrine/www/favicon.ico\n```\nERR 2 = ENOENT : fichier absent.',
        },
        {
          id: 'cA6-03-04', type: 'qcm', niveau: 2,
          enonce: 'Toutes les minutes, la charge grimpe brièvement mais `top` ne montre rien de suspect. Quel outil BCC lancer en premier ?',
          choix: ['execsnoop, pour voir les programmes de courte durée lancés (cron, scripts)', 'biolatency', 'tcpretrans', 'ext4slower'],
          reponse: 0,
          indices: ['top rafraîchit toutes les quelques secondes.', 'Un processus très bref lui échappe.', 'Il faut voir chaque lancement.'],
          solution: '`execsnoop` affiche chaque exec(), même pour un processus de 50 ms : on découvre par exemple un script cron qui lance des centaines de `curl`.',
        },
        {
          id: 'cA6-03-05', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Sur Rocky, les outils BCC se trouvent dans /usr/share/bcc/tools.', vrai: true },
            { texte: 'eBPF ne sert qu’au traçage.', vrai: false, explication: 'Il sert aussi au réseau et à la sécurité.' },
            { texte: 'Les outils BCC doivent en général être lancés en root.', vrai: true },
            { texte: 'biolatency affiche un histogramme des temps d’accès disque.', vrai: true },
          ],
          indices: ['bcc-tools sur Rocky.', 'Une seule fausse.', 'Charger un programme eBPF demande des privilèges.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A6.4',
      titre: 'bpftrace en une ligne',
      objectif: 'Poser sa propre question au noyau en quelques mots.',
      rappel: `
        **bpftrace** (paquet du même nom) est un petit langage pour écrire des programmes eBPF d’une ligne :
        \`sonde /filtre/ { action }\`.

        \`\`\`
        $ sudo bpftrace -l 'tracepoint:syscalls:sys_enter_open*'        # lister des sondes
        $ sudo bpftrace -lv tracepoint:syscalls:sys_enter_openat       # leurs arguments
        \`\`\`

        Exemples (Ctrl-C pour arrêter et afficher les résultats) :

        \`\`\`
        # Qui ouvre quels fichiers ?
        $ sudo bpftrace -e 'tracepoint:syscalls:sys_enter_openat { printf("%s %s\\n", comm, str(args.filename)); }'

        # Nombre d'appels système par programme
        $ sudo bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'

        # Taille des lectures réussies, en histogramme
        $ sudo bpftrace -e 'tracepoint:syscalls:sys_exit_read /args.ret > 0/ { @octets = hist(args.ret); }'

        # Seulement pour un programme
        $ sudo bpftrace -e 'tracepoint:syscalls:sys_enter_openat /comm == "vitrine"/ { printf("%s\\n", str(args.filename)); }'
        \`\`\`

        | Élément | Rôle |
        |---|---|
        | \`tracepoint:…\`, \`kprobe:fonction\`, \`uprobe:binaire:fonction\` | types de sondes (points de trace stables, fonctions du noyau, fonctions d’un programme) |
        | \`/comm == "vitrine"/\` | filtre |
        | \`comm\`, \`pid\`, \`args\`, \`retval\` | variables fournies |
        | \`@nom\`, \`count()\`, \`hist()\`, \`sum()\` | tableaux agrégés affichés à la fin |

        Préfère les **tracepoints** (interface stable) aux kprobes (qui dépendent de la version du noyau). Sur
        les versions plus anciennes de bpftrace, on écrit \`args->filename\` au lieu de \`args.filename\`.
      `,
      aRetenir: [
        'Forme : `sonde /filtre/ { action }` ; `bpftrace -l` pour lister, `-lv` pour les arguments.',
        'Variables : comm, pid, args, retval ; agrégats : @x = count(), hist(), sum().',
        'tracepoint (stable) > kprobe (dépend du noyau) ; uprobe pour un programme.',
        'args.filename (args->filename sur les vieilles versions).',
      ],
      exercices: [
        {
          id: 'cA6-04-01', type: 'commande', niveau: 2,
          enonce: 'Liste les sondes de type tracepoint dont le nom commence par `tracepoint:syscalls:sys_enter_open`.',
          accepte: ["(sudo )?bpftrace -l ['\"]?tracepoint:syscalls:sys_enter_open\\*['\"]?", "(sudo )?bpftrace -l ['\"]tracepoint:syscalls:sys_enter_open\\*['\"]"],
          exemple: "bpftrace -l 'tracepoint:syscalls:sys_enter_open*'",
          indices: ['bpftrace sait lister ses sondes.', 'Option -l avec un motif.', 'Le motif entre apostrophes, avec une étoile.'],
          solution: "```\n$ sudo bpftrace -l 'tracepoint:syscalls:sys_enter_open*'\ntracepoint:syscalls:sys_enter_open\ntracepoint:syscalls:sys_enter_openat\ntracepoint:syscalls:sys_enter_openat2\n```",
        },
        {
          id: 'cA6-04-02', type: 'trous', niveau: 2,
          enonce: 'Complète ce programme bpftrace qui compte les appels système par nom de programme.',
          texte: "bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[ [[1]] ] = [[2]]; }'",
          trous: [{ accepte: ['comm'], exemple: 'comm' }, { accepte: ['count\\(\\)'], exemple: 'count()' }],
          indices: ['La variable qui contient le nom du programme.', 'La fonction d’agrégation qui compte.', 'comm et count().'],
          solution: "```\n$ sudo bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'\n^C\n@[sshd]: 412\n@[vitrine]: 9821\n```",
        },
        {
          id: 'cA6-04-03', type: 'association', niveau: 2,
          enonce: 'Associe chaque type de sonde à ce qu’il observe.',
          paires: [['tracepoint:…', 'Point de trace stable prévu par le noyau'], ['kprobe:fonction', 'Entrée d’une fonction quelconque du noyau'], ['uprobe:/chemin/binaire:fonction', 'Fonction d’un programme en espace utilisateur'], ['/comm == "vitrine"/', 'Un filtre, pas une sonde']],
          indices: ['trace = stable.', 'k = kernel, u = user.', 'Entre barres obliques : condition.'],
          solution: 'tracepoint : stable ; kprobe : fonction du noyau ; uprobe : fonction d’un programme ; /…/ : filtre.',
        },
        {
          id: 'cA6-04-04', type: 'qcm', niveau: 2,
          enonce: 'Pourquoi préférer un tracepoint à une kprobe quand les deux conviennent ?',
          choix: [
            'Le tracepoint est une interface stable ; le nom et les arguments d’une fonction du noyau peuvent changer d’une version à l’autre',
            'Les kprobes sont interdites en production',
            'Les tracepoints sont plus nombreux',
            'Les kprobes ne fonctionnent pas sur Rocky',
          ],
          reponse: 0,
          indices: ['Que se passe-t-il à la mise à jour du noyau ?', 'Les fonctions internes peuvent être renommées.', 'Les tracepoints sont maintenus.'],
          solution: 'Les tracepoints font partie de l’interface du noyau et restent stables ; une kprobe vise une fonction interne qui peut disparaître ou changer : ton script pourrait cesser de fonctionner après une mise à jour.',
        },
        {
          id: 'cA6-04-05', type: 'terminal', niveau: 2,
          enonce: 'Sur cuve ou fut, installe bpftrace, lance le comptage des appels système par programme pendant une dizaine de secondes (pendant ce temps, lance `ls -R /usr > /dev/null` dans une autre session), puis Ctrl-C. Colle les dernières lignes.',
          attendu: ['@\\['],
          indices: ['Le programme de l’exercice précédent.', 'Il faut être root.', 'Les résultats s’affichent à l’arrêt.'],
          solution: 'Tu dois voir `@[ls]: …` avec un nombre élevé (getdents64, newfstatat…), à côté de sshd, systemd-journal, etc.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Méthode USE ?', r: 'Pour chaque ressource : Utilisation, Saturation, Erreurs.' },
    { q: 'Les 60 premières secondes ?', r: 'uptime, dmesg, vmstat 1, mpstat -P ALL 1, pidstat 1, iostat -xz 1, free -m, sar -n DEV 1, sar -n TCP,ETCP 1, top.' },
    { q: 'PSI ?', r: '/proc/pressure/{cpu,memory,io} : temps d’attente, some/full ; psi=1 si absent.' },
    { q: 'Historique de cette nuit ?', r: '`sar -u -f /var/log/sysstat/saDD` (Rocky : /var/log/sa/).' },
    { q: 'Profil processeur ?', r: '`perf top` ; `perf record -F 99 -a -g -- sleep 10` ; `perf report`.' },
    { q: 'eBPF ?', r: 'Programmes vérifiés dans le noyau, déclenchés par des événements, sûrs en production.' },
    { q: 'Programmes très brefs ?', r: 'execsnoop (BCC).' },
    { q: 'Fichiers ouverts par un service ?', r: 'opensnoop -n nom (Debian : opensnoop-bpfcc).' },
    { q: 'Syntaxe bpftrace ?', r: '`sonde /filtre/ { action }` ; @x = count() / hist().' },
    { q: 'tracepoint ou kprobe ?', r: 'tracepoint : stable ; kprobe : dépend de la version du noyau.' },
  ],
  memo: `
    ### Méthode
    USE : **U**tilisation · **S**aturation · **E**rreurs, pour CPU, mémoire, disques, réseau.
    \`\`\`
    uptime ; dmesg -T | tail ; vmstat 1 5 ; mpstat -P ALL 1 3 ; pidstat 1 3 ; iostat -xz 1 3 ; free -m
    sar -n DEV 1 3 ; sar -n TCP,ETCP 1 3 ; top
    cat /proc/pressure/{cpu,memory,io}      sar -u|-r|-d -f /var/log/sysstat/saDD
    \`\`\`
    ### perf
    \`\`\`
    perf top   perf stat [-a] -- CMD   perf record -F 99 -a -g -- sleep 10   perf record -F 99 -g -p PID -- sleep 10   perf report
    \`\`\`
    ### BCC (Debian : NOM-bpfcc ; Rocky : /usr/share/bcc/tools/NOM)
    \`\`\`
    execsnoop   opensnoop -n NOM   biolatency 5 1   biosnoop   tcpconnect   tcpaccept   tcpretrans   runqlat   ext4slower
    \`\`\`
    ### bpftrace
    \`\`\`
    bpftrace -l 'tracepoint:syscalls:sys_enter_open*'   bpftrace -lv tracepoint:syscalls:sys_enter_openat
    bpftrace -e 'tracepoint:syscalls:sys_enter_openat { printf("%s %s\\n", comm, str(args.filename)); }'
    bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'
    bpftrace -e 'tracepoint:syscalls:sys_exit_read /args.ret > 0/ { @octets = hist(args.ret); }'
    \`\`\`
  `,
});
