/* Chapitre 13 : User Environments (livre p. 335–346). */
HLW.chapitre({
  id: '13',
  num: 13,
  intro: `
    Chaque fois que tu ouvres une session, le shell lit des **fichiers de démarrage** qui fixent ton environnement :
    le chemin de recherche des commandes, l’invite, les alias, le masque de création des fichiers, l’éditeur par
    défaut… Ce chapitre explique **quels fichiers** sont lus, **dans quel ordre**, et **quoi** y mettre, pour toi et
    pour les nouveaux comptes (\`/etc/skel\`).

    C’est court, mais c’est la source de beaucoup de « chez moi ça marche » : une variable définie au mauvais endroit
    n’existe pas dans une session SSH, dans un script, ou dans cron.
  `,
  objectifs: [
    'savoir ce qu’on met dans un fichier de démarrage (PATH, invite, alias, umask, EDITOR) et ce qu’on n’y met pas ;',
    'distinguer shell de connexion, shell interactif et shell non interactif, et savoir quels fichiers chacun lit ;',
    'organiser .bash_profile, .profile et .bashrc ; utiliser /etc/profile.d ;',
    'préparer l’environnement des nouveaux comptes avec /etc/skel ;',
    'éviter les pièges classiques (sortie dans .bashrc, PATH qui grossit, scripts qui dépendent d’alias).',
  ],
  certifs: { lpic1: ['105.1'], lfcs: ['UG'], rhcsa: ['R9'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '13.1',
      titre: 'Que mettre dans un fichier de démarrage',
      sections: '§13.1 à 13.3', pages: '335–340',
      objectif: 'Régler PATH, l’invite, les alias et le masque de création, sans excès.',
      rappel: `
        Principe du livre : **rester simple**. Un fichier de démarrage court, que tu comprends entièrement, vaut mieux
        qu’une collection de réglages copiés. On le modifie quand un besoin réel apparaît : un répertoire de commandes à
        ajouter, un éditeur à changer.

        \`\`\`
        # ~/.bashrc : extraits typiques
        PATH="$HOME/bin:$PATH"            # tes commandes d'abord (jamais « . » dans PATH !)
        export EDITOR=vim                 # éditeur des programmes (crontab -e, git…)
        umask 022                         # fichiers créés en 644, répertoires en 755 (027 pour plus de discrétion)
        PS1='\\u@\\h:\\w\\$ '              # invite : utilisateur@machine:répertoire$
        alias ll='ls -l'
        alias rm='rm -i'                  # discutable : voir les pièges
        \`\`\`

        | Séquence d’invite | Sens |
        |---|---|
        | \`\\u\` | nom d’utilisateur |
        | \`\\h\` | nom de la machine (court) |
        | \`\\w\` | répertoire courant (\`~\` pour le personnel) |
        | \`\\$\` | \`#\` pour root, \`$\` sinon |
        | \`\\t\` | heure |

        - **PATH** : ajouter, ne pas remplacer ; ne **jamais** y mettre \`.\` (le répertoire courant) : un programme piégé
          nommé \`ls\` dans \`/tmp\` serait exécuté.
        - **MANPATH** : en général inutile, \`man\` le déduit de PATH.
        - **Alias** : pratiques en interactif, ignorés par les scripts. Préfère une fonction ou un petit script dès que
          ça se complique.
        - **umask** : rappel de la fiche 2.11.
      `,
      aRetenir: [
        'Fichier de démarrage court et compris.',
        '`PATH="$HOME/bin:$PATH"` ; jamais `.` dans PATH.',
        '`export EDITOR=vim`, `umask 022`, `PS1=\'\\u@\\h:\\w\\$ \'`, `alias ll=\'ls -l\'`.',
        'Alias = confort interactif ; les scripts ne les voient pas.',
      ],
      exercices: [
        {
          id: 'c13-01-01', type: 'commande', niveau: 1, ref: '§13.3.1, p. 337',
          enonce: 'Ajoute `$HOME/bin` **au début** de PATH, sans perdre les répertoires existants.',
          accepte: ['(export )?PATH="?\\$HOME/bin:\\$PATH"?', '(export )?PATH="?~/bin:\\$PATH"?', '(export )?PATH="?\\$\\{HOME\\}/bin:\\$\\{?PATH\\}?"?'],
          exemple: 'PATH="$HOME/bin:$PATH"',
          pieges: [{ motif: '(export )?PATH="?\\$HOME/bin"?', message: 'Tu remplaces tout le PATH : plus aucune commande ne serait trouvée.' }],
          indices: ['On garde l’ancien PATH à la fin.', 'Les répertoires sont séparés par deux-points.', '`PATH="$HOME/bin:$PATH"`'],
          solution: '```\nPATH="$HOME/bin:$PATH"\n```\nSur Debian et Rocky, `~/.profile` (ou `~/.bash_profile`) ajoute déjà `~/bin` s’il existe.',
        },
        {
          id: 'c13-01-02', type: 'qcm', niveau: 2, ref: '§13.3.1',
          enonce: 'Pourquoi ne faut-il jamais ajouter `.` (le répertoire courant) au PATH ?',
          choix: [
            'Un programme piégé déposé dans un répertoire (par exemple /tmp) sous le nom d’une commande courante serait exécuté',
            'Cela ralentit le shell',
            'Le shell refuse les chemins relatifs dans PATH',
            'Les pages de manuel ne fonctionneraient plus',
          ],
          reponse: 0,
          indices: ['Pense à un fichier nommé ls dans /tmp.', 'Que se passe-t-il si tu fais cd /tmp puis ls ?', 'C’est une faille de sécurité classique.'],
          solution: 'Avec `.` dans PATH, `cd /tmp && ls` pourrait lancer un faux `ls` déposé là par un autre utilisateur, avec tes droits (ou ceux de root !).',
        },
        {
          id: 'c13-01-03', type: 'association', niveau: 1, ref: '§13.3.3, p. 338',
          enonce: 'Associe chaque séquence de l’invite bash (PS1) à ce qu’elle affiche.',
          paires: [['`\\u`', 'Nom d’utilisateur'], ['`\\h`', 'Nom de la machine'], ['`\\w`', 'Répertoire courant'], ['`\\$`', '# pour root, $ sinon'], ['`\\t`', 'Heure']],
          indices: ['u = user, h = host.', 'w = working directory.', '\\$ change selon l’utilisateur.'],
          solution: '\\u utilisateur, \\h machine, \\w répertoire, \\$ # ou $, \\t heure.',
        },
        {
          id: 'c13-01-04', type: 'commande', niveau: 1, ref: '§13.3.4, p. 339',
          enonce: 'Crée l’alias `ll` qui lance `ls -l`.',
          accepte: ['alias ll=[\'"]ls -l[\'"]', 'alias ll=[\'"]ls -lh?[aA]?[\'"]'],
          exemple: "alias ll='ls -l'",
          indices: ['Commande alias.', 'nom=\'commande\', sans espace autour du =.', "`alias ll='ls -l'`"],
          solution: "```\nalias ll='ls -l'\n```\nÀ mettre dans `~/.bashrc` pour le garder. `unalias ll` le supprime, `alias` les liste.",
        },
        {
          id: 'c13-01-05', type: 'vrai-faux', niveau: 2, ref: '§13.3',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un script lancé par `./script` hérite des alias de ton shell interactif.', vrai: false, explication: 'Les alias ne sont pas exportés et ne sont pas développés dans un script non interactif.' },
            { texte: '`export EDITOR=vim` fait utiliser vim par `crontab -e` et `git commit`.', vrai: true },
            { texte: '`umask 027` crée des fichiers non lisibles par les « autres ».', vrai: true },
            { texte: 'En général, MANPATH n’a pas besoin d’être défini.', vrai: true },
          ],
          indices: ['Les alias sont propres au shell interactif.', 'Une seule fausse.', '027 retire tout aux autres.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '13.2',
      titre: 'Quels fichiers, dans quel ordre',
      sections: '§13.4', pages: '340–343',
      objectif: 'Savoir quel fichier est lu selon le type de shell, et organiser les siens.',
      rappel: `
        Tout dépend du **type** de shell :

        | Type | Exemples | Fichiers lus par bash |
        |---|---|---|
        | **connexion** (*login*) | console, SSH, \`su -\`, \`bash -l\` | \`/etc/profile\` (et \`/etc/profile.d/*.sh\`), puis le **premier** trouvé parmi \`~/.bash_profile\`, \`~/.bash_login\`, \`~/.profile\` |
        | **interactif** non connexion | un nouveau terminal graphique, \`bash\` tapé dans un shell | \`/etc/bash.bashrc\` (Debian) ou \`/etc/bashrc\` (Rocky, appelé par \`~/.bashrc\`), puis \`~/.bashrc\` |
        | **non interactif** | un script, \`ssh hôte commande\` | aucun des précédents (seulement \`$BASH_ENV\` s’il est défini) |

        \`~/.bash_logout\` est lu à la fin d’un shell de connexion.

        \`\`\`
        $ echo $0                 # « -bash » : le tiret indique un shell de connexion
        $ shopt login_shell       # login_shell on/off
        \`\`\`

        ### L’organisation conseillée

        Tout mettre dans **\`~/.bashrc\`**, et faire en sorte que le fichier de connexion le lise. C’est ce que font déjà
        les fichiers par défaut : sur Debian, \`~/.profile\` contient \`. "$HOME/.bashrc"\` ; sur Rocky,
        \`~/.bash_profile\` contient \`. ~/.bashrc\`.

        \`\`\`
        # ~/.bash_profile
        [ -f ~/.bashrc ] && . ~/.bashrc
        \`\`\`

        Attention : si tu crées un \`~/.bash_profile\` sur Debian, bash ne lit **plus** \`~/.profile\`.

        ### Pour tous les utilisateurs

        On ne modifie pas \`/etc/profile\` (fichier du paquet) : on dépose un fichier dans **\`/etc/profile.d/\`**
        (\`brasserie.sh\`), lu par tous les shells de connexion. Le shell \`tcsh\` (§13.4.2) a ses propres fichiers
        (\`.tcshrc\`, \`.login\`), rarement utilisés aujourd’hui.
      `,
      aRetenir: [
        'Connexion : /etc/profile (+ profile.d), puis ~/.bash_profile OU ~/.bash_login OU ~/.profile (le premier).',
        'Interactif : /etc/bash.bashrc (Debian) / /etc/bashrc (Rocky) et ~/.bashrc ; non interactif : rien.',
        'Tout dans ~/.bashrc, appelé par le fichier de connexion ; `echo $0` (-bash), `shopt login_shell`.',
        'Pour tous : /etc/profile.d/x.sh.',
      ],
      exercices: [
        {
          id: 'c13-02-01', type: 'association', niveau: 2, ref: '§13.4.1, p. 340–341',
          enonce: 'Associe chaque situation au type de shell qu’elle produit.',
          paires: [
            ['Connexion SSH interactive (`ssh cuve`)', 'Shell de connexion'],
            ['Taper `bash` dans un shell déjà ouvert', 'Shell interactif sans connexion'],
            ['`ssh cuve uptime`', 'Shell non interactif'],
            ['Un script lancé par `./sauvegarde.sh`', 'Script : shell non interactif'],
          ],
          indices: ['Une connexion = une authentification.', 'Un nouveau bash dans une session existante n’est pas une connexion.', 'Une commande passée à ssh ne donne pas de session interactive.'],
          solution: 'SSH interactif : connexion. `bash` dans un shell : interactif sans connexion. `ssh hôte commande` et les scripts : non interactifs (ils ne lisent ni .profile ni .bashrc).',
        },
        {
          id: 'c13-02-02', type: 'ordre', niveau: 2, ref: '§13.4.1',
          enonce: 'Sur Rocky, remets dans l’ordre les fichiers lus lors d’une connexion SSH de Léa (shell bash).',
          elements: ['/etc/profile', '/etc/profile.d/*.sh (appelés par /etc/profile)', '~/.bash_profile', '~/.bashrc (appelé par ~/.bash_profile)', '/etc/bashrc (appelé par ~/.bashrc)'],
          indices: ['Le système avant l’utilisateur.', '/etc/profile appelle profile.d.', 'Le fichier de connexion de l’utilisateur appelle .bashrc, qui appelle /etc/bashrc.'],
          solution: '/etc/profile → /etc/profile.d/*.sh → ~/.bash_profile → ~/.bashrc → /etc/bashrc.',
        },
        {
          id: 'c13-02-03', type: 'qcm', niveau: 2, ref: '§13.4.1',
          enonce: 'Sur cuve (Debian), Léa crée un `~/.bash_profile` pour y définir une variable. Depuis, son alias `ll`, défini dans `~/.bashrc`, a disparu à la connexion. Pourquoi ?',
          choix: [
            'bash lit le premier fichier trouvé : ~/.bash_profile a pris la place de ~/.profile, qui appelait ~/.bashrc',
            'Les alias sont interdits dans ~/.bashrc',
            'Il faut redémarrer la machine',
            '~/.bash_profile n’est lu que par tcsh',
          ],
          reponse: 0,
          indices: ['Un seul fichier parmi trois est lu à la connexion.', 'Sur Debian, c’est ~/.profile qui chargeait ~/.bashrc.', 'Il faut que le nouveau fichier charge .bashrc lui aussi.'],
          solution: 'bash ne lit que le **premier** de ~/.bash_profile, ~/.bash_login, ~/.profile. Le nouveau ~/.bash_profile masque ~/.profile, qui contenait `. ~/.bashrc`. Ajoute `[ -f ~/.bashrc ] && . ~/.bashrc` dans ~/.bash_profile (ou mets la variable dans ~/.profile).',
        },
        {
          id: 'c13-02-04', type: 'commande', niveau: 1, ref: '§13.4',
          enonce: 'Vérifie si le shell courant est un shell de connexion, avec la commande d’options de bash.',
          accepte: ['shopt login_shell', 'shopt -p login_shell', 'shopt \\| grep login_shell'],
          exemple: 'shopt login_shell',
          indices: ['bash a une commande pour ses options internes.', 'shopt.', 'Option login_shell.'],
          solution: '```\n$ shopt login_shell\nlogin_shell    on\n```\nAutre indice : `echo $0` affiche `-bash` dans un shell de connexion.',
        },
        {
          id: 'c13-02-05', type: 'qcm', niveau: 2, ref: '§13.4',
          enonce: 'Tu veux définir `export TZ=Europe/Paris` pour **tous** les utilisateurs de cuve, à la connexion, sans modifier un fichier du paquet. Où ?',
          choix: ['Dans un nouveau fichier /etc/profile.d/brasserie.sh', 'Dans /etc/profile', 'Dans ~/.bashrc de root', 'Dans /etc/passwd'],
          reponse: 0,
          indices: ['Comme pour sudoers.d ou sshd_config.d…', '/etc/profile lit tout un répertoire.', 'profile.d.'],
          solution: '`/etc/profile.d/brasserie.sh`, lu par /etc/profile à chaque connexion. Les mises à jour du paquet ne l’écraseront pas.',
        },
        {
          id: 'c13-02-06', type: 'vrai-faux', niveau: 2, ref: '§13.4',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`ssh cuve \'echo $MAVAR\'` voit une variable définie seulement dans ~/.profile.', vrai: false, explication: 'Une commande passée à ssh lance un shell non interactif, qui ne lit pas ~/.profile.' },
            { texte: '~/.bash_logout est lu à la sortie d’un shell de connexion.', vrai: true },
            { texte: 'Sur Debian, l’équivalent de /etc/bashrc s’appelle /etc/bash.bashrc.', vrai: true },
            { texte: '`su -` lance un shell de connexion.', vrai: true },
          ],
          indices: ['Non interactif = aucun fichier de démarrage.', 'Une seule fausse.', 'Le tiret de su -.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '13.3',
      titre: 'Réglages par défaut, /etc/skel et pièges',
      sections: '§13.5 à 13.7', pages: '343–346',
      objectif: 'Préparer l’environnement des nouveaux comptes et éviter les erreurs classiques.',
      rappel: `
        ### Les nouveaux comptes : /etc/skel

        \`useradd -m\` copie le contenu de **\`/etc/skel\`** dans le nouveau répertoire personnel (\`.bashrc\`,
        \`.profile\`…). Pour que tous les futurs comptes aient un réglage, on le met là. Les comptes **existants** ne sont
        pas modifiés.

        \`\`\`
        $ ls -a /etc/skel
        .  ..  .bash_logout  .bashrc  .profile
        # cp brasserie-aide.txt /etc/skel/          # tous les futurs comptes l'auront
        \`\`\`

        ### Éditeur et pager

        \`EDITOR\` (et \`VISUAL\`) choisissent l’éditeur des programmes ; \`PAGER\` le paginateur (\`less\`). Sur Debian,
        \`update-alternatives --config editor\` règle aussi l’éditeur par défaut du système. Le shell par défaut des
        nouveaux comptes : \`SHELL\` dans \`/etc/default/useradd\` (ou \`useradd -D\`).

        ### Pièges (§13.6)

        - **Afficher quelque chose** dans \`~/.bashrc\` (un \`echo\`, un message de bienvenue) : cela casse \`scp\`,
          \`rsync\` ou \`sftp\`, qui ouvrent des shells et lisent leur sortie. Si tu veux un message, teste d’abord que
          le shell est interactif : \`[[ $- == *i* ]] && echo "Bonjour"\`.
        - **PATH qui grossit** : ajouter un répertoire dans \`.bashrc\` le rajoute à chaque sous-shell. Ajoute-le
          seulement s’il n’y est pas, ou dans le fichier de connexion.
        - **Compter sur l’environnement** dans un script ou dans cron : un script doit définir ce dont il a besoin.
        - Une erreur de syntaxe dans un fichier de démarrage s’affiche à chaque connexion ; teste avec \`bash -n ~/.bashrc\`
          et garde une session ouverte.
      `,
      aRetenir: [
        '/etc/skel copié par `useradd -m` (nouveaux comptes seulement).',
        'EDITOR / VISUAL / PAGER ; `useradd -D` pour les valeurs par défaut.',
        'Rien d’affiché dans .bashrc (casse scp/rsync) sauf si `[[ $- == *i* ]]`.',
        'Les scripts et cron ne dépendent pas de ton environnement ; `bash -n` pour vérifier.',
      ],
      exercices: [
        {
          id: 'c13-03-01', type: 'qcm', niveau: 1, ref: '§13.5',
          enonce: 'Inès veut que tous les **futurs** comptes de cuve aient l’alias `ll` dans leur `.bashrc`. Où l’ajouter ?',
          choix: ['Dans /etc/skel/.bashrc', 'Dans ~ines/.bashrc', 'Dans /etc/passwd', 'Dans /etc/default/useradd'],
          reponse: 0,
          indices: ['useradd -m copie un modèle.', 'Un squelette de répertoire personnel.', 'skel.'],
          solution: '`/etc/skel/.bashrc` : copié dans chaque nouveau répertoire personnel par `useradd -m`. Les comptes existants ne changent pas.',
        },
        {
          id: 'c13-03-02', type: 'qcm', niveau: 2, ref: '§13.6, p. 344',
          enonce: 'Depuis que Bastien a ajouté `echo "Bienvenue Bastien !"` dans son `~/.bashrc` sur cuve, `scp fichier bastien@cuve:` échoue ou se bloque. Pourquoi ?',
          choix: [
            'Le texte affiché par .bashrc se mélange au protocole que scp/rsync lisent sur la connexion',
            'scp n’accepte pas les points d’exclamation',
            'Le fichier .bashrc est trop gros',
            'echo est interdit dans .bashrc',
          ],
          reponse: 0,
          indices: ['scp et rsync ouvrent un shell sur la machine distante.', 'Ils s’attendent à des données précises sur la sortie.', 'Un message en trop les perturbe.'],
          solution: 'Le message s’insère dans le flux que scp/rsync/sftp attendent. Solution : ne l’afficher qu’en interactif : `[[ $- == *i* ]] && echo "Bienvenue"`.',
        },
        {
          id: 'c13-03-03', type: 'commande', niveau: 1,
          enonce: 'Vérifie la syntaxe de ton `~/.bashrc` sans l’exécuter.',
          accepte: ['bash -n ~/\\.bashrc', 'bash -n \\$HOME/\\.bashrc', 'bash -n \\.bashrc'],
          exemple: 'bash -n ~/.bashrc',
          indices: ['bash a une option « lire sans exécuter ».', 'n comme noexec.', '`bash -n ~/.bashrc`'],
          solution: '```\n$ bash -n ~/.bashrc\n```\nRien affiché = pas d’erreur de syntaxe.',
        },
        {
          id: 'c13-03-04', type: 'vrai-faux', niveau: 2, ref: '§13.5–13.6',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Modifier /etc/skel change aussi les comptes déjà créés.', vrai: false },
            { texte: '`useradd -D` affiche les valeurs par défaut de useradd (shell, répertoire…).', vrai: true },
            { texte: 'Un script lancé par cron ne lit pas ton ~/.bashrc.', vrai: true },
            { texte: '`[[ $- == *i* ]]` est vrai dans un shell interactif.', vrai: true, explication: '$- contient les options du shell ; i = interactif.' },
          ],
          indices: ['skel = modèle pour l’avenir.', 'Une seule fausse.', 'cron = non interactif.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
        {
          id: 'c13-03-05', type: 'terminal', niveau: 1,
          enonce: 'Sur cuve et sur fut, compare `ls -a /etc/skel`, puis `grep -n bashrc ~/.profile ~/.bash_profile 2>/dev/null`. Colle la sortie. Quel fichier charge `.bashrc` sur chaque distribution ?',
          attendu: ['bashrc'],
          indices: ['Debian utilise ~/.profile.', 'Rocky utilise ~/.bash_profile.', 'Cherche la ligne qui sourcerait .bashrc.'],
          solution: 'Sur cuve (Debian), `~/.profile` contient `. "$HOME/.bashrc"` (si bash). Sur fut (Rocky), `~/.bash_profile` contient `. ~/.bashrc`. Les deux suivent l’organisation conseillée : tout dans .bashrc.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Ajouter ~/bin au PATH ?', r: '`PATH="$HOME/bin:$PATH"` (jamais « . » dans PATH).' },
    { q: 'Invite user@machine:rép$ ?', r: "`PS1='\\u@\\h:\\w\\$ '`" },
    { q: 'Fichiers d’un shell de connexion bash ?', r: '/etc/profile (+ profile.d), puis le premier de ~/.bash_profile, ~/.bash_login, ~/.profile.' },
    { q: 'Fichiers d’un shell interactif sans connexion ?', r: '/etc/bash.bashrc (Debian) ou /etc/bashrc (Rocky), et ~/.bashrc.' },
    { q: 'Et un script ?', r: 'Aucun fichier de démarrage (sauf $BASH_ENV).' },
    { q: 'Organisation conseillée ?', r: 'Tout dans ~/.bashrc, chargé par ~/.bash_profile ou ~/.profile.' },
    { q: 'Shell de connexion ?', r: '`shopt login_shell` ou `echo $0` → -bash.' },
    { q: 'Réglage pour tous les utilisateurs ?', r: 'Fichier dans /etc/profile.d/.' },
    { q: 'Modèle des nouveaux comptes ?', r: '/etc/skel (copié par useradd -m).' },
    { q: 'Pourquoi rien afficher dans .bashrc ?', r: 'Ça casse scp, rsync, sftp ; sinon `[[ $- == *i* ]] && echo …`.' },
  ],
  memo: `
    ### Ordre de lecture (bash)
    | Shell | Fichiers |
    |---|---|
    | connexion (console, ssh, su -) | /etc/profile → /etc/profile.d/*.sh → 1ᵉʳ de ~/.bash_profile, ~/.bash_login, ~/.profile |
    | interactif (bash dans un shell) | /etc/bash.bashrc (Debian) / /etc/bashrc (Rocky) → ~/.bashrc |
    | non interactif (script, ssh hôte cmd, cron) | rien ($BASH_ENV) |
    | fin d’un shell de connexion | ~/.bash_logout |

    ### ~/.bashrc minimal
    \`\`\`
    PATH="$HOME/bin:$PATH"
    export EDITOR=vim PAGER=less
    umask 022
    PS1='\\u@\\h:\\w\\$ '
    alias ll='ls -l'
    [[ $- == *i* ]] && echo "message seulement en interactif"
    \`\`\`
    \`\`\`
    ~/.bash_profile : [ -f ~/.bashrc ] && . ~/.bashrc
    shopt login_shell   echo $0   bash -n ~/.bashrc   ls -a /etc/skel   useradd -D
    \`\`\`
  `,
});
