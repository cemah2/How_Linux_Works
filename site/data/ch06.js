/* Chapitre 6 : How User Space Starts (livre p. 137–166). */
HLW.chapitre({
  id: '06',
  num: 6,
  intro: `
    Le noyau a lancé **init**, le processus numéro 1. Tout le reste de l’espace utilisateur en découle : montages,
    réseau, journalisation, services, invites de connexion. Sur Debian comme sur Rocky, init s’appelle **systemd**.

    Ce chapitre est central pour l’administration : **unités**, **dépendances**, **cibles**, \`systemctl\`, activation à la
    demande par **sockets**, compatibilité avec l’ancien **System V init**, **arrêt** propre, rôle de l’**initramfs**,
    et **modes de secours** quand le démarrage échoue. Le **Lab 03** (sauvetage du démarrage) et le **Lab 04** (services
    maison) le mettent en pratique.
  `,
  objectifs: [
    'identifier l’implémentation d’init et situer le PID 1 ;',
    'nommer les principaux types d’unités et lire un fichier d’unité ;',
    'démarrer, arrêter, activer, désactiver et diagnostiquer un service avec `systemctl` et `journalctl` ;',
    'distinguer les dépendances (`Requires`, `Wants`…) de l’ordre (`Before`, `After`) ;',
    'expliquer l’activation par socket ;',
    'faire le lien entre niveaux d’exécution System V et cibles systemd ;',
    'arrêter et redémarrer proprement, inspecter et régénérer l’initramfs ;',
    'démarrer en mode secours ou en urgence, et obtenir un shell root sans mot de passe en dernier recours.',
  ],
  certifs: { lpic1: ['101.2', '101.3'], lfcs: ['OD'], rhcsa: ['R4', 'R7'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '6.1',
      titre: 'init et systemd',
      sections: '§6.1 et 6.2', pages: '138–139',
      objectif: 'Savoir ce qu’est init et reconnaître son implémentation.',
      rappel: `
        **init** est le premier processus de l’espace utilisateur (**PID 1**), lancé directement par le noyau. Il démarre
        et surveille tous les services, et récupère les processus orphelins. Si init meurt, le noyau s’arrête (*kernel panic*).

        Trois implémentations ont marqué l’histoire :

        | Implémentation | Principe | Où |
        |---|---|---|
        | **System V init** | une suite de scripts lancés dans l’ordre, par « niveau d’exécution » | historique, encore dans quelques systèmes |
        | **Upstart** | démarrage piloté par des événements | ancien Ubuntu (jusqu’en 2014) |
        | **systemd** | unités, dépendances, démarrage parallèle et à la demande | quasiment toutes les distributions actuelles |

        ### Identifier son init

        \`\`\`
        $ ls -l /sbin/init
        lrwxrwxrwx 1 root root 20 … /sbin/init -> /lib/systemd/systemd
        $ ps -p 1 -o pid,comm
            PID COMMAND
              1 systemd
        \`\`\`

        Si \`/usr/lib/systemd/system\` (ou \`/etc/systemd\`) existe, c’est systemd ; un \`/etc/inittab\` suggère System V.
      `,
      aRetenir: [
        'init = PID 1, lancé par le noyau, parent de tous les services ; s’il meurt, le noyau s’arrête.',
        'System V (scripts), Upstart (événements), systemd (unités et dépendances).',
        '`ls -l /sbin/init`, `ps -p 1` pour l’identifier.',
      ],
      exercices: [
        {
          id: 'c06-01-01', type: 'reponse-courte', niveau: 1, ref: '§6.1, p. 138',
          enonce: 'Quel est le **PID** d’init ?',
          accepte: ['1', 'un'],
          indices: ['C’est le tout premier processus de l’espace utilisateur.', 'Fiche 1.5.', 'Le plus petit possible.'],
          solution: '**1**.',
        },
        {
          id: 'c06-01-02', type: 'commande', niveau: 1, ref: '§6.2, p. 139',
          enonce: 'Affiche le nom de la commande du processus de PID 1 avec `ps`.',
          accepte: ['ps -p ?1( -o (pid,)?(comm|cmd|args)(=|,\\S+)?)?', 'ps -o (pid,)?(comm|cmd|args)=? -p ?1', 'ps 1', 'ps u 1', 'cat /proc/1/comm'],
          exemple: 'ps -p 1 -o pid,comm',
          indices: ['`ps -p PID` sélectionne un processus.', '`-o` choisit les colonnes.', '`ps -p 1 -o pid,comm`'],
          solution: '```\n$ ps -p 1 -o pid,comm\n    PID COMMAND\n      1 systemd\n```\nAlternative : `cat /proc/1/comm`.',
        },
        {
          id: 'c06-01-03', type: 'association', niveau: 1, ref: '§6.1, p. 138',
          enonce: 'Associe chaque implémentation d’init à son principe.',
          paires: [
            ['System V init', 'Une suite de scripts lancés dans l’ordre, par niveau d’exécution'],
            ['Upstart', 'Un démarrage piloté par des événements'],
            ['systemd', 'Des unités reliées par des dépendances, démarrées en parallèle ou à la demande'],
          ],
          indices: ['Le plus ancien est le plus simple.', 'Upstart a été créé par Ubuntu.', 'systemd parle d’unités.'],
          solution: 'System V : scripts séquentiels ; Upstart : événements ; systemd : unités et dépendances.',
        },
        {
          id: 'c06-01-04', type: 'vrai-faux', niveau: 1, ref: '§6.1',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'init est lancé directement par le noyau.', vrai: true },
            { texte: 'Si init se termine, le noyau s’arrête (kernel panic).', vrai: true },
            { texte: 'Debian 13 et Rocky 10 utilisent System V init par défaut.', vrai: false, explication: 'Les deux utilisent systemd.' },
            { texte: 'Un processus dont le parent meurt est rattaché à init (ou à un « sous-récupérateur »).', vrai: true },
          ],
          indices: ['init est indispensable.', 'Une seule affirmation est fausse.', 'Les orphelins sont adoptés.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '6.2',
      titre: 'Unités et types d’unités',
      sections: '§6.3 à 6.3.2', pages: '139–141',
      objectif: 'Comprendre ce que systemd gère et comment il organise le démarrage.',
      rappel: `
        systemd ne manipule pas des scripts mais des **unités** (*units*). Chaque unité a un nom et un **type**, donné par son suffixe :

        | Type | Rôle | Exemple |
        |---|---|---|
        | \`.service\` | un démon ou une tâche | \`sshd.service\`, \`cron.service\` |
        | \`.target\` | un **groupe** d’unités, un point d’étape du démarrage | \`multi-user.target\` |
        | \`.socket\` | une socket qui démarre un service à la première connexion | \`sshd.socket\` |
        | \`.mount\` / \`.automount\` | un système de fichiers (souvent généré depuis fstab) | \`srv-archives.mount\` |
        | \`.timer\` | un déclenchement programmé (alternative à cron, chapitre 7) | \`logrotate.timer\` |
        | \`.device\` | un périphérique détecté par udev | \`dev-sda.device\` |
        | \`.path\` | une surveillance de fichier ou de répertoire | |
        | \`.slice\`, \`.scope\` | des groupes de processus pour les ressources (cgroups, chapitre 8) | \`user.slice\` |

        ### Le démarrage comme un graphe

        Au démarrage, systemd veut atteindre la cible par défaut (\`default.target\`, en général \`multi-user.target\` sur
        un serveur, \`graphical.target\` sur un poste). Il en déduit **toutes** les unités nécessaires grâce aux dépendances,
        et les démarre **en parallèle** autant que possible.

        \`\`\`
        $ systemctl get-default                  # la cible par défaut
        $ systemctl list-dependencies multi-user.target | head
        $ systemd-analyze                        # durée du démarrage (complément)
        $ systemd-analyze blame | head           # unités les plus lentes
        \`\`\`
      `,
      aRetenir: [
        'Unité = nom + type (suffixe) : service, target, socket, mount, timer, device, path, slice.',
        'Cible = groupe d’unités ; `default.target` → souvent `multi-user.target`.',
        'systemd déduit le graphe des dépendances et démarre en parallèle.',
        '`systemctl get-default`, `list-dependencies`, `systemd-analyze blame`.',
      ],
      exercices: [
        {
          id: 'c06-02-01', type: 'association', niveau: 1, ref: '§6.3.1, p. 140',
          enonce: 'Associe chaque type d’unité à son rôle.',
          paires: [
            ['`.service`', 'Un démon ou une tâche'],
            ['`.target`', 'Un groupe d’unités, une étape du démarrage'],
            ['`.socket`', 'Une socket qui démarre un service à la première connexion'],
            ['`.mount`', 'Un système de fichiers à monter'],
            ['`.timer`', 'Un déclenchement programmé'],
          ],
          indices: ['Le suffixe dit tout.', 'Une cible ne fait rien d’elle-même : elle regroupe.', 'Les timers remplacent souvent cron.'],
          solution: 'service, target, socket, mount, timer : les cinq types que tu manipuleras le plus.',
        },
        {
          id: 'c06-02-02', type: 'commande', niveau: 1,
          enonce: 'Affiche la **cible par défaut** du système.',
          accepte: ['systemctl get-default'],
          exemple: 'systemctl get-default',
          indices: ['C’est une sous-commande de `systemctl`.', '« obtenir la valeur par défaut ».', '`systemctl get-default`'],
          solution: '```\n$ systemctl get-default\nmulti-user.target\n```\nUn serveur sans interface graphique vise `multi-user.target`. Pour changer : `systemctl set-default graphical.target`.',
        },
        {
          id: 'c06-02-03', type: 'qcm', niveau: 2, ref: '§6.3.2, p. 140–141',
          enonce: 'Comment systemd sait-il quelles unités démarrer au boot ?',
          choix: [
            'Il part de la cible par défaut et suit les dépendances pour construire le graphe des unités nécessaires',
            'Il exécute dans l’ordre alphabétique tous les fichiers de /etc/systemd/system',
            'Il lit un script unique, /etc/rc.local',
            'Il démarre toutes les unités installées sur le système',
          ],
          reponse: 0,
          indices: ['systemd raisonne en dépendances.', 'Il a un objectif : une cible.', '`default.target`.'],
          solution: 'Il part de `default.target` et remonte les dépendances (Wants, Requires…). Cela permet aussi de démarrer en parallèle tout ce qui ne dépend pas l’un de l’autre.',
        },
        {
          id: 'c06-02-04', type: 'commande', niveau: 2,
          enonce: 'Affiche les unités qui ont pris le plus de temps au dernier démarrage.',
          accepte: ['systemd-analyze blame( \\| (head|less)( -n ?\\d+| -\\d+)?)?'],
          exemple: 'systemd-analyze blame',
          indices: ['L’outil d’analyse du démarrage : `systemd-analyze`.', 'Sous-commande qui « blâme » les coupables.', '`systemd-analyze blame`'],
          solution: '```\n$ systemd-analyze blame | head\n  3.512s cloud-init.service\n  1.204s systemd-networkd-wait-online.service\n…\n```\n`systemd-analyze critical-chain` montre la chaîne qui a réellement retardé le démarrage.',
        },
        {
          id: 'c06-02-05', type: 'terminal', niveau: 1,
          enonce: 'Sur ta VM, lance `systemctl list-units --type=target` et colle la sortie. Repère `multi-user.target` et `network-online.target`.',
          attendu: ['multi-user\\.target'],
          indices: ['`--type` filtre par type d’unité.', 'Les cibles actives sont listées.', 'Tu ne verras pas `graphical.target` sur un serveur.'],
          solution: 'Tu vois une vingtaine de cibles actives : `basic.target`, `sysinit.target`, `network.target`, `network-online.target`, `multi-user.target`, `timers.target`… Ce sont les étapes du démarrage.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '6.3',
      titre: 'Les fichiers d’unité',
      sections: '§6.3.3', pages: '141–144',
      objectif: 'Lire et écrire un fichier d’unité, savoir où le placer.',
      rappel: `
        ### Où sont les unités ?

        | Répertoire | Contenu | Priorité |
        |---|---|---|
        | \`/usr/lib/systemd/system\` | unités fournies par les **paquets** (sur Debian aussi \`/lib/systemd/system\`, même endroit) | basse |
        | \`/run/systemd/system\` | unités générées à l’exécution | moyenne |
        | \`/etc/systemd/system\` | unités et modifications de l’**administrateur** | **haute** |

        On ne modifie **jamais** un fichier sous \`/usr/lib\` : une mise à jour l’écraserait. On écrit dans \`/etc/systemd/system\`.

        \`\`\`
        $ systemctl cat ssh.service             # afficher le fichier d’une unité (et ses surcharges)
        $ systemctl -p UnitPath show            # tous les répertoires consultés
        \`\`\`

        ### Anatomie d’un service

        \`\`\`
        # /etc/systemd/system/brassd.service
        [Unit]
        Description=Démon de pilotage des cuves
        After=network-online.target
        Wants=network-online.target

        [Service]
        ExecStart=/usr/local/bin/brassd --config /etc/brassd.conf
        Restart=on-failure
        User=brassd

        [Install]
        WantedBy=multi-user.target
        \`\`\`

        - **[Unit]** : description et dépendances (fiche 6.5).
        - **[Service]** : comment lancer (\`ExecStart\`), sous quel compte (\`User\`), que faire en cas d’arrêt (\`Restart\`)…
        - **[Install]** : ce que fait \`systemctl enable\` (ici : rattacher l’unité à \`multi-user.target\`).

        Les **spécificateurs** commencent par \`%\` : \`%n\` le nom de l’unité, \`%i\` l’instance d’une unité modèle
        (\`getty@ttyS0.service\` → \`%i\` = \`ttyS0\`).

        ### Surcharger sans réécrire (complément)

        \`systemctl edit brassd.service\` crée une **surcharge** (*drop-in*) dans \`/etc/systemd/system/brassd.service.d/override.conf\`,
        qui ne contient que les lignes modifiées. \`systemctl edit --full\` copie toute l’unité dans \`/etc\`.
        Après toute modification manuelle : \`systemctl daemon-reload\`.
      `,
      aRetenir: [
        '`/usr/lib/systemd/system` (paquets) < `/run/systemd/system` < `/etc/systemd/system` (admin).',
        'Sections [Unit], [Service], [Install] ; `ExecStart`, `User`, `Restart`, `WantedBy`.',
        '`systemctl cat`, `systemctl edit` (surcharge), `systemctl daemon-reload`.',
        '`%i` : instance d’une unité modèle `nom@instance`.',
      ],
      exercices: [
        {
          id: 'c06-03-01', type: 'qcm', niveau: 1, ref: '§6.3.3, p. 141–142',
          enonce: 'Où l’administrateur doit-il placer ses propres fichiers d’unité ?',
          choix: ['`/etc/systemd/system`', '`/usr/lib/systemd/system`', '`/run/systemd/system`', '`/var/lib/systemd`'],
          reponse: 0,
          indices: ['La configuration locale va dans /etc.', 'Les paquets écrivent dans /usr/lib.', '/run est effacé au redémarrage.'],
          solution: '`/etc/systemd/system`, qui a priorité sur `/usr/lib/systemd/system` (paquets) et survit aux mises à jour.',
        },
        {
          id: 'c06-03-02', type: 'association', niveau: 1, ref: '§6.3.3, p. 143',
          enonce: 'Associe chaque directive à la section où elle se place.',
          paires: [
            ['`Description=`', '[Unit]'],
            ['`ExecStart=`', '[Service]'],
            ['`WantedBy=`', '[Install]'],
          ],
          indices: ['[Unit] décrit l’unité et ses relations.', '[Service] dit comment lancer.', '[Install] sert à enable.'],
          solution: 'Description → [Unit] ; ExecStart → [Service] ; WantedBy → [Install].',
        },
        {
          id: 'c06-03-03', type: 'trous', niveau: 2, ref: '§6.3.3',
          enonce: 'Complète ce fichier d’unité pour un service qui lance `/usr/local/bin/brassd`, redémarre s’il plante, et s’active avec la cible multi-utilisateurs.',
          texte: '[Unit]\nDescription=Démon de pilotage des cuves\n\n[Service]\n[[1]]=/usr/local/bin/brassd\nRestart=[[2]]\n\n[[[3]]]\nWantedBy=[[4]]',
          trous: [
            { accepte: ['ExecStart'], exemple: 'ExecStart' },
            { accepte: ['on-failure', 'always', 'on-abnormal'], exemple: 'on-failure' },
            { accepte: ['Install'], exemple: 'Install' },
            { accepte: ['multi-user\\.target'], exemple: 'multi-user.target' },
          ],
          indices: ['La commande à exécuter se déclare avec `ExecStart`.', 'Redémarrer en cas d’échec : `on-failure`.', 'La section [Install] contient `WantedBy=multi-user.target`.'],
          solution: '```\n[Service]\nExecStart=/usr/local/bin/brassd\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target\n```',
        },
        {
          id: 'c06-03-04', type: 'commande', niveau: 1,
          enonce: 'Affiche le contenu du fichier d’unité de `cron.service` (et ses éventuelles surcharges) sans chercher où il se trouve.',
          accepte: ['systemctl cat cron(\\.service)?', 'systemctl cat crond(\\.service)?'],
          exemple: 'systemctl cat cron.service',
          indices: ['systemctl sait afficher une unité.', 'Comme la commande qui affiche un fichier.', '`systemctl cat`'],
          solution: '```\n$ systemctl cat cron.service\n# /usr/lib/systemd/system/cron.service\n[Unit]\nDescription=Regular background program processing daemon\n…\n```\nSur Rocky, le service s’appelle `crond.service`.',
        },
        {
          id: 'c06-03-05', type: 'commande', niveau: 2,
          enonce: 'Crée une **surcharge** (drop-in) pour `brassd.service` sans recopier toute l’unité.',
          accepte: ['(sudo )?systemctl edit brassd(\\.service)?'],
          exemple: 'systemctl edit brassd.service',
          pieges: [{ motif: '(sudo )?systemctl edit --full brassd(\\.service)?', message: '`--full` recopie toute l’unité : ce n’est plus une surcharge minimale.' }, { motif: '(sudo )?(vi|vim|nano) /usr/lib/systemd/system/brassd\\.service', message: 'Ne modifie jamais un fichier sous /usr/lib : une mise à jour l’écraserait.' }],
          indices: ['systemctl a une sous-commande d’édition.', 'Sans option, elle crée une surcharge.', '`systemctl edit brassd.service`'],
          solution: '```\n# systemctl edit brassd.service\n```\nsystemctl ouvre un éditeur pour `/etc/systemd/system/brassd.service.d/override.conf`, y place seulement tes lignes, puis recharge systemd tout seul.',
        },
        {
          id: 'c06-03-06', type: 'qcm', niveau: 2, ref: '§6.3.3, p. 143–144',
          enonce: 'Dans l’unité modèle `getty@.service`, que vaut le spécificateur `%i` pour l’instance `getty@ttyS0.service` ?',
          choix: ['`ttyS0`', '`getty@ttyS0.service`', '`getty`', 'L’identifiant numérique de l’instance'],
          reponse: 0,
          indices: ['i comme instance.', 'L’instance est ce qui suit le @.', 'Avant le suffixe.'],
          solution: '`ttyS0`. C’est ainsi qu’un seul fichier modèle lance un programme de connexion sur chaque terminal (`serial-getty@ttyS0.service` sur tes VM).',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '6.4',
      titre: 'Piloter systemd : systemctl et journalctl',
      sections: '§6.3.4', pages: '144–147',
      objectif: 'Démarrer, arrêter, activer et diagnostiquer un service.',
      rappel: `
        \`\`\`
        $ systemctl list-units                        # unités actives
        $ systemctl list-units --type=service --state=failed
        $ systemctl status ssh.service                # état, PID, dernières lignes du journal
        # systemctl start | stop | restart | reload ssh.service
        # systemctl enable ssh.service                # démarrer au boot (selon [Install])
        # systemctl enable --now ssh.service          # activer ET démarrer tout de suite
        # systemctl disable ssh.service
        # systemctl daemon-reload                     # relire les fichiers d’unité modifiés
        $ systemctl list-jobs                         # tâches en attente
        $ journalctl -u ssh.service                   # journal du service
        $ journalctl -u ssh.service -f                # en direct
        \`\`\`

        Le suffixe \`.service\` est facultatif : \`systemctl status ssh\` suffit.

        ### start/stop ≠ enable/disable

        - \`start\` / \`stop\` agissent **maintenant**.
        - \`enable\` / \`disable\` agissent sur les **prochains démarrages** : \`enable\` crée un lien symbolique dans
          \`/etc/systemd/system/multi-user.target.wants/\` (d’après la section [Install]).

        Un service peut donc être actif mais désactivé (il ne reviendra pas après un redémarrage), ou activé mais arrêté.

        ### Noms selon la distribution

        | Service | Debian | Rocky |
        |---|---|---|
        | Serveur SSH | \`ssh.service\` | \`sshd.service\` |
        | Planificateur | \`cron.service\` | \`crond.service\` |

        ### Cibles

        \`systemctl isolate rescue.target\` bascule **maintenant** vers une cible (en arrêtant ce qui n’en fait pas partie) ;
        \`systemctl set-default\` change la cible du prochain démarrage.
      `,
      aRetenir: [
        '`status`, `start`, `stop`, `restart`, `reload` (maintenant) ; `enable`, `disable` (au démarrage) ; `enable --now`.',
        '`daemon-reload` après modification d’un fichier d’unité.',
        '`journalctl -u service [-f]` ; `list-units --state=failed`.',
        'Debian `ssh`/`cron`, Rocky `sshd`/`crond`.',
      ],
      exercices: [
        {
          id: 'c06-04-01', type: 'commande', niveau: 1, ref: '§6.3.4, p. 145',
          enonce: 'Affiche l’état du service SSH sur **Debian** (cuve).',
          accepte: ['systemctl status ssh(\\.service)?', 'sudo systemctl status ssh(\\.service)?'],
          exemple: 'systemctl status ssh',
          pieges: [{ motif: '(sudo )?systemctl status sshd(\\.service)?', message: 'Sur Debian, le service s’appelle `ssh` (sur Rocky : `sshd`). Debian crée d’ailleurs un alias sshd.service, mais retiens le vrai nom.' }],
          indices: ['Sous-commande `status`.', 'Sur Debian, le service SSH s’appelle `ssh`.', '`systemctl status ssh`'],
          solution: '```\n$ systemctl status ssh\n● ssh.service - OpenBSD Secure Shell server\n     Loaded: loaded (/usr/lib/systemd/system/ssh.service; enabled; preset: enabled)\n     Active: active (running) since …\n   Main PID: 642 (sshd)\n```\n« enabled » : démarre au boot ; « active (running) » : tourne maintenant.',
        },
        {
          id: 'c06-04-02', type: 'commande', niveau: 1,
          enonce: 'Active le service `brassd` pour qu’il démarre au boot **et** démarre-le immédiatement, en une seule commande.',
          accepte: ['(sudo )?systemctl enable --now brassd(\\.service)?', '(sudo )?systemctl --now enable brassd(\\.service)?'],
          exemple: 'systemctl enable --now brassd',
          pieges: [{ motif: '(sudo )?systemctl enable brassd(\\.service)?', message: '`enable` seul ne démarre pas le service maintenant : il faut aussi `start`, ou l’option qui fait les deux.' }],
          indices: ['`enable` agit sur le démarrage, `start` sur maintenant.', 'Une option combine les deux.', '`--now`'],
          solution: '```\n# systemctl enable --now brassd\nCreated symlink /etc/systemd/system/multi-user.target.wants/brassd.service → /etc/systemd/system/brassd.service.\n```',
        },
        {
          id: 'c06-04-03', type: 'association', niveau: 1, ref: '§6.3.4, p. 146',
          enonce: 'Associe chaque commande à son effet.',
          paires: [
            ['`systemctl start brassd`', 'Démarrer le service maintenant'],
            ['`systemctl enable brassd`', 'Le faire démarrer aux prochains boots'],
            ['`systemctl reload brassd`', 'Faire relire sa configuration sans l’arrêter'],
            ['`systemctl daemon-reload`', 'Faire relire les fichiers d’unité à systemd'],
            ['`systemctl disable brassd`', 'Ne plus le démarrer au boot'],
          ],
          indices: ['start/stop : maintenant ; enable/disable : au boot.', 'reload concerne le service, daemon-reload concerne systemd.', 'Lis bien chaque verbe.'],
          solution: 'Confondre `reload` (le service relit sa configuration) et `daemon-reload` (systemd relit les fichiers d’unité) est une erreur classique.',
        },
        {
          id: 'c06-04-04', type: 'commande', niveau: 1, ref: '§6.3.4, p. 145',
          enonce: 'Affiche le journal du service `brassd` en suivant les nouvelles lignes en direct.',
          accepte: ['(sudo )?journalctl -u ?brassd(\\.service)? -f', '(sudo )?journalctl -f -u ?brassd(\\.service)?', '(sudo )?journalctl --unit[= ]brassd(\\.service)? -f', '(sudo )?journalctl -fu ?brassd(\\.service)?', '(sudo )?journalctl -f --unit[= ]brassd(\\.service)?'],
          exemple: 'journalctl -u brassd -f',
          indices: ['`journalctl -u` filtre sur une unité.', 'Comme `tail`, une option suit le journal.', '`-f`'],
          solution: '```\n$ journalctl -u brassd -f\n```\nCtrl-C pour arrêter.',
        },
        {
          id: 'c06-04-05', type: 'commande', niveau: 2,
          enonce: 'Liste les **services en échec** sur la machine.',
          accepte: ['systemctl list-units --type=service --state=failed', 'systemctl list-units --state=failed( --type=service)?', 'systemctl --failed( --type=service)?', 'systemctl list-units --failed', 'systemctl --state=failed( --type=service)?', 'systemctl list-units -t service --state=failed'],
          exemple: 'systemctl --failed',
          indices: ['C’est un filtre de `systemctl list-units`.', 'Sur l’état : `--state=failed`.', 'Raccourci : `systemctl --failed`.'],
          solution: '```\n$ systemctl --failed\n  UNIT              LOAD   ACTIVE SUB    DESCRIPTION\n● thermometre.service loaded failed failed Sonde de température\n```\nPremière commande à taper après un démarrage problématique.',
        },
        {
          id: 'c06-04-06', type: 'vrai-faux', niveau: 2, ref: '§6.3.4',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un service peut être « active » mais « disabled ».', vrai: true, explication: 'Démarré à la main, il ne reviendra pas après un redémarrage.' },
            { texte: '`systemctl enable` crée un lien symbolique dans un répertoire `.wants`.', vrai: true },
            { texte: 'Après avoir modifié un fichier d’unité à la main, `systemctl restart` suffit à prendre en compte la modification.', vrai: false, explication: 'Il faut d’abord `systemctl daemon-reload` (systemctl le signale par un avertissement).' },
            { texte: 'Sur Rocky, le serveur SSH s’appelle `sshd.service`.', vrai: true },
          ],
          indices: ['enable et start sont indépendants.', 'Une seule affirmation est fausse.', 'systemd garde ses unités en mémoire.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
        {
          id: 'c06-04-07', type: 'terminal', niveau: 2,
          enonce: 'Sur ta VM, lance `systemctl status cron` (cuve) ou `systemctl status crond` (fut), puis `ls -l /etc/systemd/system/multi-user.target.wants/`. Colle la sortie. Explique le lien entre les deux.',
          attendu: ['\\.service'],
          indices: ['« enabled » dans la ligne Loaded.', 'Le répertoire `.wants` contient des liens.', 'Chaque lien = un `enable`.'],
          solution: 'Le service est **enabled** et **active (running)**. Dans `multi-user.target.wants/`, tu trouves un lien `cron.service -> /usr/lib/systemd/system/cron.service` : c’est ce lien, créé par `systemctl enable`, qui fait démarrer cron avec `multi-user.target`.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '6.5',
      titre: 'Suivi des processus, types de services et dépendances',
      sections: '§6.3.5 et 6.3.6', pages: '147–151',
      objectif: 'Choisir le bon type de service et exprimer correctement dépendances et ordre.',
      rappel: `
        ### Comment systemd suit un service

        systemd place chaque service dans son propre **cgroup** (chapitre 8) : il connaît tous ses processus, même ceux
        qui se sont « détachés ». Il doit aussi savoir **quand** le service est prêt. C’est le rôle de \`Type=\` :

        | \`Type=\` | Le service est considéré prêt… |
        |---|---|
        | \`simple\` (défaut) | dès que le processus est lancé |
        | \`exec\` | dès que le programme a réellement été exécuté |
        | \`forking\` | quand le processus lancé se duplique et que le parent se termine (vieux démons) ; \`PIDFile=\` aide |
        | \`notify\` | quand le programme le signale lui-même à systemd |
        | \`oneshot\` | quand le programme **se termine** (tâches ponctuelles) ; souvent avec \`RemainAfterExit=yes\` |

        ### Dépendances : « qui a besoin de qui »

        | Directive | Signification |
        |---|---|
        | \`Requires=B\` | A a besoin de B : B est démarré avec A ; si B échoue ou s’arrête, A aussi |
        | \`Wants=B\` | A souhaite B : B est démarré avec A, mais l’échec de B n’empêche pas A (**le plus courant**) |
        | \`Requisite=B\` | B doit **déjà** être actif, sinon A échoue |
        | \`Conflicts=B\` | A et B ne peuvent pas tourner ensemble |

        ### Ordre : « qui démarre avant qui »

        \`Before=\` et \`After=\` règlent **seulement l’ordre**. Ils ne démarrent rien ! Sans \`After=\`, deux unités reliées par
        \`Requires=\` démarrent **en même temps**. On combine donc souvent les deux :

        \`\`\`
        Wants=network-online.target
        After=network-online.target
        \`\`\`

        ### Le lien avec [Install]

        \`WantedBy=multi-user.target\` dans [Install] crée, lors de \`enable\`, un lien dans \`multi-user.target.wants/\` :
        c’est l’équivalent d’un \`Wants=\` écrit dans la cible. \`RequiredBy=\` crée un lien dans \`.requires/\`.

        \`\`\`
        $ systemctl list-dependencies brassd.service           # ce dont brassd dépend
        $ systemctl list-dependencies --reverse brassd.service # ce qui dépend de brassd
        $ systemctl show -p Requires,Wants,After brassd.service
        \`\`\`
      `,
      aRetenir: [
        '`Type=` : simple (défaut), exec, forking, notify, oneshot (+ RemainAfterExit).',
        '`Requires` strict, `Wants` souple (le plus courant), `Requisite` (déjà actif), `Conflicts`.',
        '`Before`/`After` = ordre seulement ; combiner `Wants=` et `After=`.',
        '`WantedBy=` dans [Install] → lien dans `cible.wants/` à l’activation.',
      ],
      exercices: [
        {
          id: 'c06-05-01', type: 'association', niveau: 2, ref: '§6.3.6, p. 148–149',
          enonce: 'Associe chaque directive à sa signification.',
          paires: [
            ['`Requires=`', 'Dépendance stricte : si l’autre échoue ou s’arrête, cette unité aussi'],
            ['`Wants=`', 'Dépendance souple : l’autre est démarrée, mais son échec n’empêche rien'],
            ['`Requisite=`', 'L’autre unité doit déjà être active'],
            ['`Conflicts=`', 'Les deux unités ne peuvent pas tourner ensemble'],
            ['`After=`', 'Ordre seulement : démarrer après l’autre unité'],
          ],
          indices: ['Require = exiger, want = souhaiter.', 'Requisite : prérequis déjà rempli.', 'After ne démarre rien.'],
          solution: 'Requires (strict), Wants (souple), Requisite (déjà actif), Conflicts (exclusion), After (ordre).',
        },
        {
          id: 'c06-05-02', type: 'qcm', niveau: 2, ref: '§6.3.6, p. 150',
          enonce: 'Le service `boutique` contient `Requires=postgresql.service` mais **pas** de `After=`. Que se passe-t-il au démarrage ?',
          choix: [
            'Les deux services démarrent en même temps : boutique peut se lancer avant que la base soit prête',
            'boutique attend automatiquement que postgresql soit prêt',
            'postgresql n’est pas démarré du tout',
            'systemd refuse de charger l’unité',
          ],
          reponse: 0,
          indices: ['Requires dit « qui », pas « quand ».', 'L’ordre se règle avec Before/After.', 'Sans ordre, systemd parallélise.'],
          solution: 'Requires garantit que postgresql est **démarré**, pas qu’il l’est **avant**. Sans `After=postgresql.service`, les deux partent en parallèle. Il faut les deux directives.',
        },
        {
          id: 'c06-05-03', type: 'association', niveau: 2, ref: '§6.3.5, p. 147–148',
          enonce: 'Associe chaque situation au `Type=` le plus adapté.',
          paires: [
            ['Un script qui exporte les ventes puis se termine', '`oneshot`'],
            ['Un démon moderne qui reste au premier plan', '`simple`'],
            ['Un vieux démon qui se met tout seul en arrière-plan', '`forking`'],
            ['Un démon qui prévient systemd quand il est prêt', '`notify`'],
          ],
          indices: ['Une tâche qui se termine n’est « prête » qu’à la fin.', 'Se mettre en arrière-plan = se dupliquer (fork).', 'notify = notifier.'],
          solution: 'oneshot pour les tâches, simple pour les démons au premier plan, forking pour les anciens démons qui se détachent, notify pour ceux qui le signalent.',
        },
        {
          id: 'c06-05-04', type: 'trous', niveau: 2,
          enonce: 'Le service `boutique` a besoin du réseau opérationnel, sans échouer si la cible réseau a un souci, et doit démarrer **après**. Complète.',
          texte: '[Unit]\nDescription=Boutique en ligne\n[[1]]=network-online.target\n[[2]]=network-online.target',
          trous: [
            { accepte: ['Wants'], exemple: 'Wants' },
            { accepte: ['After'], exemple: 'After' },
          ],
          indices: ['Dépendance souple.', 'Puis l’ordre.', '`Wants=` et `After=`.'],
          solution: '```\nWants=network-online.target\nAfter=network-online.target\n```\nC’est la combinaison recommandée par systemd pour les services réseau.',
        },
        {
          id: 'c06-05-05', type: 'commande', niveau: 2,
          enonce: 'Affiche l’arbre des unités dont dépend `multi-user.target`.',
          accepte: ['systemctl list-dependencies multi-user\\.target( --all)?', 'systemctl list-dependencies( --all)? multi-user\\.target'],
          exemple: 'systemctl list-dependencies multi-user.target',
          indices: ['Sous-commande « lister les dépendances ».', 'Puis le nom de l’unité.', '`systemctl list-dependencies multi-user.target`'],
          solution: '```\n$ systemctl list-dependencies multi-user.target\nmulti-user.target\n● ├─cron.service\n● ├─ssh.service\n● ├─basic.target\n…\n```\n`--reverse` donne le sens inverse : qui dépend de cette unité.',
        },
        {
          id: 'c06-05-06', type: 'vrai-faux', niveau: 2, ref: '§6.3.5–6.3.6',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`Before=` et `After=` peuvent provoquer le démarrage d’une unité.', vrai: false, explication: 'Ils ne règlent que l’ordre entre unités qui démarrent de toute façon.' },
            { texte: 'systemd suit tous les processus d’un service grâce aux cgroups.', vrai: true },
            { texte: '`Type=oneshot` avec `RemainAfterExit=yes` laisse l’unité « active » après la fin du programme.', vrai: true },
            { texte: '`WantedBy=multi-user.target` agit lors de `systemctl enable`.', vrai: true },
          ],
          indices: ['Ordre ≠ dépendance.', 'Une seule affirmation est fausse.', '[Install] sert à enable.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '6.6',
      titre: 'Démarrage à la demande, sockets et composants auxiliaires',
      sections: '§6.3.7 et 6.3.8', pages: '151–156',
      objectif: 'Comprendre l’activation par socket et connaître les autres démons de systemd.',
      rappel: `
        ### Activation par socket

        systemd peut ouvrir lui-même une socket réseau (ou locale) et ne lancer le service qu’**à la première connexion**.
        Avantages : démarrage plus rapide et parallèle, services peu utilisés qui ne consomment rien, redémarrage sans perdre
        les connexions en attente.

        L’exemple du livre : un service « écho » sur le port TCP 22222.

        \`\`\`
        # /etc/systemd/system/echo.socket
        [Unit]
        Description=socket écho

        [Socket]
        ListenStream=22222
        Accept=true
        \`\`\`

        \`\`\`
        # /etc/systemd/system/echo@.service      ← unité modèle : une instance par connexion
        [Unit]
        Description=service écho

        [Service]
        ExecStart=/bin/cat
        StandardInput=socket
        \`\`\`

        \`\`\`
        # systemctl start echo.socket
        $ nc localhost 22222         # (le livre utilise telnet) : tout ce que tu tapes revient
        \`\`\`

        - \`Accept=true\` : systemd accepte chaque connexion et lance **une instance** \`echo@….service\` par client.
        - \`Accept=false\` (défaut) : systemd passe la socket à **un seul** service qui gère toutes les connexions.

        Une unité \`.path\` déclenche de même un service quand un fichier apparaît ou change.

        ### Les composants auxiliaires (§6.3.8)

        Le projet systemd fournit aussi : **journald** (journal, chapitre 7), **udevd** (périphériques, chapitre 3),
        **logind** (sessions des utilisateurs), **resolved** (résolution DNS, chapitre 9), **networkd** (réseau),
        **timesyncd** (heure, chapitre 7), **tmpfiles** (fichiers temporaires). Tous ne sont pas activés partout :
        Rocky préfère NetworkManager et chronyd.
      `,
      aRetenir: [
        'Activation par socket : systemd écoute et lance le service à la première connexion.',
        '`.socket` (`ListenStream=`) + service ; `Accept=true` → une instance par connexion (`nom@.service`).',
        'Unités `.path` : déclenchement sur un fichier.',
        'journald, udevd, logind, resolved, networkd, timesyncd.',
      ],
      exercices: [
        {
          id: 'c06-06-01', type: 'qcm', niveau: 2, ref: '§6.3.7, p. 151–153',
          enonce: 'Quel est l’intérêt principal de l’activation par socket ?',
          choix: [
            'Le service n’est lancé qu’à la première connexion, et les services peuvent démarrer en parallèle',
            'Le service devient plus sûr car chiffré',
            'Le service peut écouter sur plusieurs machines à la fois',
            'Le service n’a plus besoin d’être écrit pour Linux',
          ],
          reponse: 0,
          indices: ['Qui ouvre la socket ?', 'Le service peut ne pas tourner du tout tant que personne ne se connecte.', 'Démarrage à la demande.'],
          solution: 'systemd ouvre la socket tout de suite et lance le service à la demande : pas de ressources gaspillées, démarrage plus rapide et plus parallèle.',
        },
        {
          id: 'c06-06-02', type: 'trous', niveau: 3, ref: '§6.3.7, p. 152',
          enonce: 'Complète `echo.socket` pour écouter en TCP sur le port 22222 et lancer une instance du service par connexion.',
          texte: '[Socket]\n[[1]]=22222\nAccept=[[2]]',
          trous: [
            { accepte: ['ListenStream'], exemple: 'ListenStream' },
            { accepte: ['true', 'yes'], exemple: 'true' },
          ],
          indices: ['Un flux TCP = *stream*.', 'La directive commence par Listen.', 'Une instance par connexion : Accept vaut vrai.'],
          solution: '```\n[Socket]\nListenStream=22222\nAccept=true\n```\nAvec `Accept=true`, le service doit être une unité modèle `echo@.service`.',
        },
        {
          id: 'c06-06-03', type: 'qcm', niveau: 2, ref: '§6.3.7, p. 153',
          enonce: 'Avec `Accept=true` dans une unité socket, comment s’appelle le fichier de service associé ?',
          choix: ['`echo@.service` (unité modèle)', '`echo.service`', '`echo-socket.service`', '`echo.target`'],
          reponse: 0,
          indices: ['Une instance par connexion.', 'Les instances viennent d’un modèle.', 'Un modèle a un @ dans son nom.'],
          solution: '`echo@.service` : systemd crée une instance (`echo@1-127.0.0.1:22222-127.0.0.1:45678.service`) par connexion. Avec `Accept=false`, ce serait `echo.service`, unique.',
        },
        {
          id: 'c06-06-04', type: 'association', niveau: 1, ref: '§6.3.8, p. 156',
          enonce: 'Associe chaque composant de systemd à son rôle.',
          paires: [
            ['journald', 'Collecte et stocke les journaux'],
            ['logind', 'Gère les sessions des utilisateurs'],
            ['resolved', 'Résout les noms DNS'],
            ['timesyncd', 'Synchronise l’heure'],
            ['udevd', 'Gère les événements de périphériques'],
          ],
          indices: ['journal → journald.', 'login → logind.', 'resolve → resolved.'],
          solution: 'journald (journaux), logind (sessions), resolved (DNS), timesyncd (heure), udevd (périphériques).',
        },
        {
          id: 'c06-06-05', type: 'terminal', niveau: 3,
          enonce: 'Crée sur ta VM les deux unités `echo.socket` et `echo@.service` du rappel, démarre la socket, puis connecte-toi avec `nc localhost 22222` (installe `netcat-openbsd` ou `nmap-ncat` si besoin). Tape un mot, Ctrl-C, puis colle la sortie de `systemctl list-units "echo*"`.',
          attendu: ['echo'],
          indices: ['Les fichiers vont dans /etc/systemd/system/.', 'N’oublie pas `systemctl daemon-reload` puis `systemctl start echo.socket`.', 'Pendant une connexion, une instance `echo@…service` apparaît.'],
          solution: '`echo.socket` est **active (listening)** ; pendant ta connexion, une unité `echo@…service` est active, et disparaît quand tu fermes. Tu viens de construire un service réseau sans écrire une ligne de code réseau. Nettoie avec `systemctl stop echo.socket`.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '6.7',
      titre: 'System V init et compatibilité',
      sections: '§6.4 et 6.5', pages: '156–162',
      objectif: 'Reconnaître l’ancien système et sa correspondance avec systemd.',
      rappel: `
        ### Niveaux d’exécution

        System V définit des **niveaux d’exécution** (*runlevels*), de 0 à 6 :

        | Niveau | Usage | Cible systemd |
        |---|---|---|
        | 0 | arrêt | \`poweroff.target\` |
        | 1 (S) | mono-utilisateur (maintenance) | \`rescue.target\` |
        | 2, 3, 4 | multi-utilisateurs (3 = texte chez Red Hat) | \`multi-user.target\` |
        | 5 | multi-utilisateurs + interface graphique | \`graphical.target\` |
        | 6 | redémarrage | \`reboot.target\` |

        \`\`\`
        $ who -r            # niveau d’exécution actuel
        $ runlevel          # précédent et actuel
        \`\`\`

        ### Le principe de System V init

        Pour entrer dans un niveau, init lance les scripts de \`/etc/rcN.d/\` (\`/etc/rc.d/rcN.d\` chez Red Hat) dans l’ordre
        alphabétique. Ce sont des liens vers les vrais scripts de \`/etc/init.d/\` :

        - \`S20ssh\` → lancé avec l’argument \`start\` (S = start, 20 = ordre) ;
        - \`K01apache2\` → lancé avec \`stop\` (K = kill).

        Pour désactiver un service, on renommait le lien (\`mv S99httpd _S99httpd\`). \`telinit 3\` changeait de niveau,
        \`telinit q\` relisait \`/etc/inittab\`. Les scripts de \`/etc/init.d/\` se lancent aussi à la main :
        \`/etc/init.d/ssh restart\`. **run-parts** exécute tous les scripts d’un répertoire (utilisé aussi par cron).

        ### Compatibilité dans systemd

        systemd lit encore les scripts de \`/etc/init.d/\` et en fait des unités (*systemd-sysv-generator*). Les commandes
        \`service ssh restart\`, \`runlevel\`, \`telinit\` existent toujours et sont traduites en \`systemctl\`.
      `,
      aRetenir: [
        'Niveaux 0 arrêt, 1 maintenance, 3 multi-utilisateurs, 5 graphique, 6 redémarrage → cibles systemd.',
        '`/etc/rcN.d/` : liens `S..` (start) et `K..` (kill) vers `/etc/init.d/`.',
        '`who -r`, `runlevel`, `telinit`, `service` : encore disponibles, traduits par systemd.',
      ],
      exercices: [
        {
          id: 'c06-07-01', type: 'association', niveau: 1, ref: '§6.4, p. 156–157',
          enonce: 'Associe chaque niveau d’exécution System V à la cible systemd équivalente.',
          paires: [
            ['0', '`poweroff.target`'],
            ['1', '`rescue.target`'],
            ['3', '`multi-user.target`'],
            ['5', '`graphical.target`'],
            ['6', '`reboot.target`'],
          ],
          indices: ['0 et 6 sont les extrêmes : arrêter, redémarrer.', '1 = maintenance.', '5 = avec interface graphique.'],
          solution: '0 poweroff, 1 rescue, 3 multi-user, 5 graphical, 6 reboot. systemd fournit même des alias `runlevel3.target`…',
        },
        {
          id: 'c06-07-02', type: 'qcm', niveau: 2, ref: '§6.5.2, p. 159–160',
          enonce: 'Dans `/etc/rc3.d/`, que signifie le lien `S20ssh` ?',
          choix: [
            'Le script ssh est lancé avec l’argument start, en 20ᵉ position, quand on entre dans le niveau 3',
            'Le service ssh est arrêté au niveau 3',
            'ssh démarre 20 secondes après le démarrage',
            'Le service ssh utilise le port 20',
          ],
          reponse: 0,
          indices: ['S = start, K = kill.', 'Le nombre règle l’ordre (tri alphabétique).', 'rc3.d = niveau 3.'],
          solution: 'S = *start*, 20 = rang dans l’ordre d’exécution. Un lien `K01…` serait lancé avec `stop`.',
        },
        {
          id: 'c06-07-03', type: 'commande', niveau: 1, ref: '§6.4, p. 157',
          enonce: 'Affiche le niveau d’exécution courant avec la commande citée par le livre.',
          accepte: ['who -r', 'runlevel'],
          exemple: 'who -r',
          indices: ['C’est une option de `who`.', 'r comme *runlevel*.', '`who -r`'],
          solution: '```\n$ who -r\n         run-level 5  2026-11-08 18:02\n```\nsystemd répond « 5 » si `graphical.target` est actif, « 3 » pour `multi-user.target`. `runlevel` donne le niveau précédent et l’actuel.',
        },
        {
          id: 'c06-07-04', type: 'vrai-faux', niveau: 2, ref: '§6.5.5, p. 161',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'systemd sait encore utiliser les scripts de `/etc/init.d/`.', vrai: true },
            { texte: '`service ssh restart` fonctionne encore sur Debian 13.', vrai: true, explication: 'La commande est traduite en `systemctl restart ssh`.' },
            { texte: 'Sous System V, les scripts d’un niveau sont lancés en parallèle selon leurs dépendances.', vrai: false, explication: 'Ils sont lancés un par un, dans l’ordre alphabétique des liens.' },
            { texte: '`run-parts` exécute tous les scripts d’un répertoire.', vrai: true },
          ],
          indices: ['systemd a gardé une couche de compatibilité.', 'Une seule affirmation est fausse.', 'L’ordre de System V est alphabétique.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '6.8',
      titre: 'Arrêt, initramfs et modes de secours',
      sections: '§6.6 à 6.9', pages: '162–165',
      objectif: 'Arrêter proprement, comprendre l’initramfs, et relever un système qui ne démarre plus.',
      rappel: `
        ### Arrêter et redémarrer

        \`\`\`
        # shutdown -h now           # arrêter maintenant (-h = halt / poweroff)
        # shutdown -r +10           # redémarrer dans 10 minutes (prévient les utilisateurs)
        # shutdown -c               # annuler un arrêt programmé
        # systemctl poweroff | reboot
        \`\`\`

        À l’arrêt, init prévient les utilisateurs, arrête les services, envoie TERM puis KILL aux processus restants,
        démonte les systèmes de fichiers, remonte la racine en lecture seule, et demande au noyau d’éteindre ou de redémarrer.

        ### L’initramfs

        Problème : pour monter la racine, le noyau a besoin des pilotes du disque et du système de fichiers… qui sont des
        modules **sur** la racine. Solution : l’**initramfs**, une petite archive chargée en mémoire par le chargeur avec le
        noyau. Elle contient les modules et outils nécessaires (pilotes, LVM, chiffrement, \`fsck\`), monte la vraie racine,
        puis passe la main au vrai init.

        | | Debian | Rocky |
        |---|---|---|
        | Fichier | \`/boot/initrd.img-<version>\` | \`/boot/initramfs-<version>.img\` |
        | Lister le contenu | \`lsinitramfs /boot/initrd.img-$(uname -r)\` | \`lsinitrd\` |
        | Régénérer | \`update-initramfs -u\` | \`dracut -f\` |

        ### Modes de secours

        | Moyen | Ce qu’on obtient |
        |---|---|
        | \`systemd.unit=rescue.target\` (ou \`single\`) | mono-utilisateur : racine montée, presque aucun service ; **mot de passe root** demandé |
        | \`systemd.unit=emergency.target\` | le strict minimum : racine en **lecture seule**, rien d’autre ; mot de passe root demandé |
        | \`init=/bin/bash\` | un shell root **sans mot de passe** à la place d’init (racine souvent en lecture seule) |
        | \`rd.break\` (Rocky, dracut) | un shell **dans l’initramfs**, avant le montage de la vraie racine |

        Sur les images cloud, le compte root est **verrouillé** : rescue et emergency refusent l’accès. Il reste
        \`init=/bin/bash\` : \`mount -o remount,rw /\`, réparer (fstab, mot de passe avec \`passwd\`), puis \`exec /sbin/init\` ou
        redémarrer de force. Sur Rocky, après avoir changé un mot de passe ainsi, \`touch /.autorelabel\` (SELinux). C’est
        exactement le scénario du **Lab 03**.

        Moralité : quiconque a accès à la **console** (et au menu GRUB) a accès root. Protéger GRUB par mot de passe et
        l’accès à l’hyperviseur fait partie de la sécurité.
      `,
      aRetenir: [
        '`shutdown -h now`, `shutdown -r +10`, `shutdown -c` ; `systemctl poweroff|reboot`.',
        'initramfs : pilotes et outils pour monter la racine ; Debian `lsinitramfs`/`update-initramfs -u`, Rocky `lsinitrd`/`dracut -f`.',
        'rescue.target (mono-utilisateur), emergency.target (minimum), `init=/bin/bash` (sans mot de passe), `rd.break` (Rocky).',
        'Accès console + GRUB = accès root.',
      ],
      exercices: [
        {
          id: 'c06-08-01', type: 'commande', niveau: 1, ref: '§6.6, p. 162',
          enonce: 'Programme un **redémarrage dans 10 minutes** en prévenant les utilisateurs connectés.',
          accepte: ['(sudo )?shutdown -r \\+10( .*)?', '(sudo )?shutdown --reboot \\+10( .*)?'],
          exemple: 'shutdown -r +10',
          indices: ['La commande `shutdown` accepte un délai.', '`-r` pour redémarrer.', '`+10` = dans 10 minutes.'],
          solution: '```\n# shutdown -r +10 "Mise à jour du noyau"\n```\nLes utilisateurs reçoivent le message. `shutdown -c` annule.',
        },
        {
          id: 'c06-08-02', type: 'qcm', niveau: 2, ref: '§6.7, p. 163',
          enonce: 'Pourquoi a-t-on besoin d’un initramfs ?',
          choix: [
            'Parce que les pilotes nécessaires pour monter la racine sont des modules qui se trouvent… sur la racine',
            'Pour accélérer l’affichage du menu GRUB',
            'Pour stocker les journaux du démarrage',
            'Parce que le noyau ne peut pas lancer init sans lui',
          ],
          reponse: 0,
          indices: ['Problème de la poule et de l’œuf.', 'Le noyau générique n’intègre pas tous les pilotes.', 'LVM, chiffrement, contrôleurs exotiques…'],
          solution: 'Les pilotes (contrôleur, système de fichiers, LVM, chiffrement) sont des modules stockés sur la racine. L’initramfs les apporte en mémoire, monte la racine, puis passe la main au vrai init.',
        },
        {
          id: 'c06-08-03', type: 'commande', niveau: 2, ref: '§6.7',
          enonce: 'Sur **Debian** (cuve), liste le contenu de l’initramfs du noyau en cours d’exécution.',
          accepte: ['(sudo )?lsinitramfs /boot/initrd\\.img-\\$\\(uname -r\\)( \\| (less|head|grep .*))?', '(sudo )?lsinitramfs /boot/initrd\\.img-`uname -r`( \\| (less|head|grep .*))?'],
          exemple: 'lsinitramfs /boot/initrd.img-$(uname -r)',
          pieges: [{ motif: '(sudo )?lsinitrd.*', message: '`lsinitrd` appartient à dracut (Rocky). Sur Debian, l’outil d’initramfs-tools s’appelle autrement.' }],
          indices: ['L’outil Debian : `lsinitramfs`.', 'Le fichier : `/boot/initrd.img-VERSION`.', '`$(uname -r)` donne la version du noyau en cours.'],
          solution: '```\n$ lsinitramfs /boot/initrd.img-$(uname -r) | head\n.\nbin\nconf\netc\n…\nusr/lib/modules/6.12…/kernel/drivers/scsi/virtio_scsi.ko\n```\nTu y trouves le pilote virtio_scsi indispensable pour voir le disque de la VM.',
        },
        {
          id: 'c06-08-04', type: 'association', niveau: 2, ref: '§6.8, p. 164',
          enonce: 'Associe chaque moyen de secours à ce qu’il donne.',
          paires: [
            ['`systemd.unit=rescue.target`', 'Mode mono-utilisateur, racine montée, mot de passe root demandé'],
            ['`systemd.unit=emergency.target`', 'Le strict minimum, racine en lecture seule, mot de passe root demandé'],
            ['`init=/bin/bash`', 'Un shell root sans mot de passe à la place d’init'],
            ['`rd.break`', 'Un shell dans l’initramfs, avant le montage de la vraie racine (dracut)'],
          ],
          indices: ['rescue = secours, emergency = urgence (plus minimal).', 'init= remplace systemd lui-même.', 'rd = *ramdisk*.'],
          solution: 'rescue (mono-utilisateur), emergency (minimum), init=/bin/bash (shell sans mot de passe), rd.break (initramfs, Rocky).',
        },
        {
          id: 'c06-08-05', type: 'ordre', niveau: 3, ref: '§6.8 et §4.2.7',
          enonce: 'Le compte root de fut est verrouillé et une ligne de fstab bloque le démarrage. Remets dans l’ordre la réparation avec `init=/bin/bash`.',
          elements: [
            'Dans le menu GRUB (console Proxmox), éditer l’entrée avec e',
            'Ajouter `init=/bin/bash` à la fin de la ligne linux, puis Ctrl-X',
            'Remonter la racine en écriture : `mount -o remount,rw /`',
            'Corriger /etc/fstab (et définir un mot de passe root avec `passwd` si besoin)',
            'Sur Rocky, créer `/.autorelabel` pour SELinux',
            'Redémarrer : `exec /sbin/init` ou `reboot -f`',
          ],
          indices: ['Tout commence dans le menu GRUB.', 'On ne peut rien modifier tant que la racine est en lecture seule.', 'SELinux doit réétiqueter les fichiers modifiés hors contexte.'],
          solution: 'GRUB → `init=/bin/bash` → `mount -o remount,rw /` → corriger → `touch /.autorelabel` (Rocky) → redémarrer. Sans systemd, `reboot` normal ne marche pas : `exec /sbin/init` ou `reboot -f`.',
        },
        {
          id: 'c06-08-06', type: 'vrai-faux', niveau: 2, ref: '§6.6–6.8',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Sur une image cloud où root est verrouillé, `rescue.target` donne un shell root sans mot de passe.', vrai: false, explication: 'rescue et emergency demandent le mot de passe root ; si le compte est verrouillé, l’accès est refusé.' },
            { texte: 'Quiconque peut éditer les entrées GRUB depuis la console peut obtenir un shell root.', vrai: true },
            { texte: 'Sur Rocky, `dracut -f` régénère l’initramfs du noyau en cours.', vrai: true },
            { texte: 'À l’arrêt, init remonte la racine en lecture seule avant d’éteindre.', vrai: true },
          ],
          indices: ['Que demandent rescue et emergency ?', 'Une seule affirmation est fausse.', 'La sécurité physique compte.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Identifier l’implémentation d’init ?', r: '`ls -l /sbin/init` ou `ps -p 1 -o comm`.' },
    { q: 'Les types d’unités les plus courants ?', r: 'service, target, socket, mount, timer (et device, path, slice).' },
    { q: 'Où l’admin met-il ses unités ?', r: '`/etc/systemd/system` (prioritaire sur `/usr/lib/systemd/system`).' },
    { q: 'Les trois sections d’une unité de service ?', r: '[Unit], [Service], [Install].' },
    { q: 'start/stop vs enable/disable ?', r: 'Maintenant vs aux prochains démarrages. `enable --now` fait les deux.' },
    { q: 'reload vs daemon-reload ?', r: 'Le service relit sa config ; systemd relit les fichiers d’unité.' },
    { q: 'Journal d’un service en direct ?', r: '`journalctl -u service -f`' },
    { q: 'Services en échec ?', r: '`systemctl --failed`' },
    { q: 'Créer une surcharge d’unité ?', r: '`systemctl edit unité` (fichier override.conf dans unité.d/).' },
    { q: 'Requires vs Wants ?', r: 'Strict (l’échec se propage) vs souple (le plus courant).' },
    { q: 'Before/After font-ils démarrer une unité ?', r: 'Non : ordre seulement. Combiner Wants= + After=.' },
    { q: 'Type=oneshot ?', r: 'Tâche ponctuelle, prête à la fin ; `RemainAfterExit=yes` pour rester « active ».' },
    { q: 'Accept=true dans une socket ?', r: 'Une instance de service (unité modèle nom@.service) par connexion.' },
    { q: 'Runlevels 0, 1, 3, 5, 6 ?', r: 'poweroff, rescue, multi-user, graphical, reboot.' },
    { q: 'Que signifie S20ssh dans /etc/rc3.d ?', r: 'Lancé avec start, 20ᵉ position, au niveau 3 (K = stop).' },
    { q: 'Redémarrer dans 10 min ? annuler ?', r: '`shutdown -r +10` ; `shutdown -c`.' },
    { q: 'Rôle de l’initramfs ?', r: 'Apporter les pilotes et outils pour monter la racine, puis passer la main à init.' },
    { q: 'Initramfs : lister et régénérer sur Debian ? sur Rocky ?', r: '`lsinitramfs` / `update-initramfs -u` ; `lsinitrd` / `dracut -f`.' },
    { q: 'Shell root sans mot de passe au démarrage ?', r: '`init=/bin/bash` sur la ligne linux de GRUB (puis `mount -o remount,rw /`).' },
    { q: 'Après un passwd via init=/bin/bash sur Rocky ?', r: '`touch /.autorelabel` (SELinux).' },
  ],
  memo: `
    ### systemctl
    \`\`\`
    systemctl status|start|stop|restart|reload unité
    systemctl enable|disable [--now] unité       systemctl daemon-reload
    systemctl list-units [--type=service] [--state=failed]   systemctl --failed
    systemctl cat unité    systemctl edit unité    systemctl show -p Requires,After unité
    systemctl list-dependencies [--reverse] unité
    systemctl get-default | set-default multi-user.target | isolate rescue.target
    journalctl -u unité [-f] [-b]     systemd-analyze blame | critical-chain
    \`\`\`
    Répertoires : /usr/lib/systemd/system (paquets) < /run/systemd/system < /etc/systemd/system (admin)

    ### Unité de service
    \`\`\`
    [Unit]     Description=…  Wants=network-online.target  After=network-online.target
    [Service]  Type=simple|exec|forking|notify|oneshot  ExecStart=…  User=…  Restart=on-failure
    [Install]  WantedBy=multi-user.target
    \`\`\`
    Requires (strict) · Wants (souple) · Requisite (déjà actif) · Conflicts · Before/After (ordre seulement)

    ### Socket
    \`\`\`
    [Socket] ListenStream=22222  Accept=true   →  service modèle nom@.service, StandardInput=socket
    \`\`\`

    ### System V
    0 poweroff · 1 rescue · 3 multi-user · 5 graphical · 6 reboot      who -r · runlevel · telinit · service x restart

    ### Arrêt, initramfs, secours
    \`\`\`
    shutdown -h now   shutdown -r +10   shutdown -c   systemctl poweroff|reboot
    Debian : lsinitramfs /boot/initrd.img-$(uname -r)   update-initramfs -u
    Rocky  : lsinitrd   dracut -f
    GRUB (e) : systemd.unit=rescue.target | emergency.target | init=/bin/bash | rd.break (Rocky)
    init=/bin/bash → mount -o remount,rw / → réparer → (Rocky) touch /.autorelabel → exec /sbin/init
    \`\`\`
  `,
});
