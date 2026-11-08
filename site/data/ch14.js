/* Chapitre 14 : A Brief Survey of the Linux Desktop and Printing (livre p. 347–362). Version allégée. */
HLW.chapitre({
  id: '14',
  num: 14,
  intro: `
    Tes VM de labo sont des serveurs sans écran : ce chapitre est donc **allégé**, centré sur ce qu’un administrateur
    doit savoir du bureau Linux. Comment une image arrive à l’écran (**X11** et **Wayland**), qui dessine les fenêtres,
    comment les programmes d’une session se parlent (**D-Bus**), et comment fonctionne l’**impression** (CUPS).

    D-Bus et CUPS existent aussi sur les serveurs : tu peux en observer une partie sur cuve et fut.
  `,
  objectifs: [
    'nommer les briques d’un bureau : framebuffer, serveur graphique, gestionnaire de fenêtres, boîte à outils, environnement ;',
    'distinguer X11 et Wayland, et savoir lequel tourne ;',
    'comprendre le rôle d’un gestionnaire de connexion et de la variable DISPLAY ;',
    'décrire D-Bus (bus système et bus de session) et l’observer ;',
    'imprimer et gérer une file d’impression avec CUPS.',
  ],
  certifs: { lpic1: ['106.1', '106.2', '108.4'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '14.1',
      titre: 'Les briques d’un bureau, X11 et Wayland',
      sections: '§14.1 à 14.3', pages: '348–353',
      objectif: 'Savoir qui fait quoi entre le noyau et la fenêtre de ton navigateur.',
      rappel: `
        Du bas vers le haut :

        | Brique | Rôle | Exemples |
        |---|---|---|
        | **Framebuffer** | mémoire d’image gérée par le noyau et la carte graphique (DRM/KMS) | \`/dev/dri/card0\` |
        | **Serveur graphique / compositeur** | assemble l’image de l’écran à partir des fenêtres, gère les entrées | Xorg (X11) ; Mutter, KWin, Sway (Wayland) |
        | **Gestionnaire de fenêtres** | décorations, déplacement, placement | intégré au compositeur sous Wayland |
        | **Boîte à outils** (*toolkit*) | boutons, menus, rendu du texte | GTK, Qt |
        | **Environnement de bureau** | panneau, réglages, gestion des fichiers, cohérence | GNOME, KDE Plasma, Xfce |

        ### X11 et Wayland

        - **X11** (X Window System, 1984) : un **serveur** (Xorg) dessine pour des **clients** (les applications), même à
          travers le réseau. Très souple, mais vieillissant (sécurité : un client peut espionner les autres).
        - **Wayland** : un **protocole** entre les applications et un **compositeur**, qui fait tout à la fois (serveur
          d’affichage, gestionnaire de fenêtres). Les entrées passent par **libinput**. Les vieilles applications X
          tournent dans **XWayland**. C’est le défaut de GNOME et KDE sur Debian 13 et Rocky 10 (Rocky 10 a même retiré
          la session Xorg).

        \`\`\`
        $ echo $XDG_SESSION_TYPE           # wayland ou x11
        $ loginctl show-session $XDG_SESSION_ID -p Type
        \`\`\`
      `,
      aRetenir: [
        'Framebuffer (noyau, DRM/KMS) → serveur/compositeur → gestionnaire de fenêtres → toolkit (GTK, Qt) → environnement (GNOME, KDE).',
        'X11 : serveur Xorg, clients, transparence réseau ; Wayland : protocole + compositeur, libinput, XWayland.',
        '`echo $XDG_SESSION_TYPE` : wayland ou x11.',
      ],
      exercices: [
        {
          id: 'c14-01-01', type: 'association', niveau: 1, ref: '§14.1',
          enonce: 'Associe chaque logiciel à sa brique du bureau.',
          paires: [['Xorg', 'Serveur graphique X11'], ['GTK', 'Boîte à outils graphique'], ['GNOME', 'Environnement de bureau'], ['libinput', 'Gestion des périphériques d’entrée'], ['XWayland', 'Compatibilité X11 sous Wayland']],
          indices: ['X = X Window System.', 'Les toolkits fournissent boutons et menus.', 'libinput lit souris et clavier.'],
          solution: 'Xorg serveur X, GTK toolkit, GNOME environnement, libinput entrées, XWayland compatibilité.',
        },
        {
          id: 'c14-01-02', type: 'commande', niveau: 1, ref: '§14.2, p. 351',
          enonce: 'Dans une session graphique, affiche le type de session (wayland ou x11) grâce à une variable d’environnement.',
          accepte: ['echo "?\\$XDG_SESSION_TYPE"?', 'printenv XDG_SESSION_TYPE', 'echo \\$\\{XDG_SESSION_TYPE\\}'],
          exemple: 'echo $XDG_SESSION_TYPE',
          indices: ['Les variables XDG décrivent la session.', 'XDG_SESSION_…', '`echo $XDG_SESSION_TYPE`'],
          solution: '```\n$ echo $XDG_SESSION_TYPE\nwayland\n```\nDans une connexion SSH, elle vaut `tty` (ou n’existe pas).',
        },
        {
          id: 'c14-01-03', type: 'vrai-faux', niveau: 2, ref: '§14.1–14.3',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Sous Wayland, le compositeur joue aussi le rôle de gestionnaire de fenêtres.', vrai: true },
            { texte: 'Sous X11, une application peut lire ce que tape l’utilisateur dans une autre fenêtre.', vrai: true, explication: 'C’est l’une des faiblesses de sécurité qui ont motivé Wayland.' },
            { texte: 'Les applications X11 ne peuvent pas fonctionner dans une session Wayland.', vrai: false, explication: 'XWayland les fait tourner.' },
            { texte: 'GNOME et KDE utilisent Wayland par défaut sur les distributions récentes.', vrai: true },
          ],
          indices: ['Wayland regroupe les rôles.', 'Une seule fausse.', 'XWayland.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
        {
          id: 'c14-01-04', type: 'ordre', niveau: 2, ref: '§14.1',
          enonce: 'Remets les briques dans l’ordre, du plus proche du matériel au plus proche de l’utilisateur.',
          elements: ['Framebuffer (noyau, DRM/KMS)', 'Compositeur ou serveur graphique', 'Boîte à outils (GTK, Qt)', 'Application (navigateur, éditeur)'],
          indices: ['Le noyau parle au matériel.', 'Le compositeur assemble les fenêtres.', 'Les applications utilisent un toolkit.'],
          solution: 'Framebuffer → compositeur/serveur → toolkit → application.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '14.2',
      titre: 'X de plus près, gestionnaires de connexion et D-Bus',
      sections: '§14.4 et 14.5', pages: '354–360',
      objectif: 'Comprendre DISPLAY, l’ouverture de session graphique et le bus de messages des bureaux.',
      rappel: `
        ### Gestionnaire de connexion

        L’écran de connexion graphique est un **gestionnaire de connexion** (*display manager*) : GDM (GNOME), SDDM (KDE),
        LightDM. Il authentifie (via PAM, fiche 7.9) puis lance la session. C’est un service systemd ; on démarre en
        mode graphique avec la cible \`graphical.target\` (fiche 6.2).

        ### DISPLAY et le réseau (X11)

        Sous X11, la variable **\`DISPLAY\`** (\`:0\`) indique à quel serveur X une application doit se connecter.
        La transparence réseau de X permet d’afficher chez toi une application qui tourne ailleurs ; aujourd’hui on passe
        par SSH : \`ssh -X cuve xeyes\` (redirection X11, si le serveur l’autorise). Outils d’exploration : \`xev\`
        (événements clavier/souris), \`xinput\`, \`xrandr\` (écrans).

        ### D-Bus

        **D-Bus** est un système de **messages** entre processus, par des sockets Unix (fiche 10.8) :

        - le **bus système** (\`/run/dbus/system_bus_socket\`) : systemd, NetworkManager, logind… ;
        - un **bus de session** par session graphique : notifications, applications du bureau.

        \`\`\`
        $ busctl list                       # services présents sur le bus système
        $ busctl tree org.freedesktop.hostname1
        $ sudo dbus-monitor --system        # observer les messages (Ctrl-C)
        \`\`\`

        \`systemctl\`, \`hostnamectl\`, \`timedatectl\` ou \`nmcli\` parlent à leurs services par D-Bus.
      `,
      aRetenir: [
        'Gestionnaire de connexion : GDM, SDDM, LightDM ; graphical.target.',
        'X11 : DISPLAY=:0 ; `ssh -X` ; xev, xinput, xrandr.',
        'D-Bus : bus système (services) et bus de session ; `busctl list`, `dbus-monitor --system`.',
      ],
      exercices: [
        {
          id: 'c14-02-01', type: 'association', niveau: 1, ref: '§14.4–14.5',
          enonce: 'Associe chaque élément à son rôle.',
          paires: [['GDM', 'Écran de connexion graphique'], ['DISPLAY', 'Variable qui désigne le serveur X à utiliser'], ['D-Bus', 'Messages entre processus'], ['xev', 'Afficher les événements clavier et souris (X11)']],
          indices: ['DM = display manager.', 'DISPLAY = écran.', 'Bus = canal de messages.'],
          solution: 'GDM connexion, DISPLAY serveur X, D-Bus messages, xev événements.',
        },
        {
          id: 'c14-02-02', type: 'commande', niveau: 1, ref: '§14.5',
          enonce: 'Liste les services présents sur le bus D-Bus système, avec l’outil de systemd.',
          accepte: ['busctl( list)?', 'busctl --system list', 'busctl list --system'],
          exemple: 'busctl list',
          indices: ['L’outil systemd pour les bus.', 'bus + ctl.', '`busctl list`'],
          solution: '```\n$ busctl list\nNAME                         PID PROCESS         USER ...\norg.freedesktop.hostname1      - -               - ... (activable)\norg.freedesktop.login1       512 systemd-logind  root ...\n```',
        },
        {
          id: 'c14-02-03', type: 'qcm', niveau: 2, ref: '§14.5',
          enonce: 'Quand tu lances `hostnamectl set-hostname brassin`, comment la demande arrive-t-elle au service qui modifie le nom ?',
          choix: ['Par un message D-Bus sur le bus système, adressé à systemd-hostnamed', 'Par un signal UNIX', 'En écrivant directement /etc/hostname', 'Par une requête HTTP locale'],
          reponse: 0,
          indices: ['Les outils *ctl de systemd sont des clients.', 'Le service s’appelle org.freedesktop.hostname1.', 'Bus système.'],
          solution: '`hostnamectl` envoie un message D-Bus à `org.freedesktop.hostname1` (systemd-hostnamed), qui vérifie les droits (polkit) puis modifie la configuration.',
        },
        {
          id: 'c14-02-04', type: 'terminal', niveau: 2,
          enonce: 'Sur cuve : `busctl list | head -15`, puis `busctl tree org.freedesktop.hostname1`. Colle une sortie. Quel processus fournit `org.freedesktop.login1` ?',
          attendu: ['org\\.freedesktop'],
          indices: ['Même sans bureau, le bus système existe.', 'login1 gère les sessions.', 'Regarde la colonne PROCESS.'],
          solution: 'C’est **systemd-logind**. `busctl tree` montre les objets du service (par exemple `/org/freedesktop/hostname1`). Les services marqués « activatable » démarrent au premier message.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '14.3',
      titre: 'L’impression avec CUPS',
      sections: '§14.6 et 14.7', pages: '360–362',
      objectif: 'Comprendre la chaîne d’impression et gérer une file.',
      rappel: `
        **CUPS** est le système d’impression de Linux (et de macOS). Un démon, \`cupsd\`, reçoit les travaux, les
        **convertit** dans le langage de l’imprimante (filtres : PDF, PostScript, Ghostscript…) et les envoie. Les
        imprimantes récentes sont **sans pilote** : elles parlent IPP Everywhere et sont détectées automatiquement.

        \`\`\`
        $ lpstat -p -d                       # imprimantes et imprimante par défaut
        $ lp -d caisse recu.pdf              # imprimer (ou : lpr -P caisse recu.pdf)
        $ lpq -P caisse ; lpstat -o          # file d'attente
        $ cancel caisse-42                   # annuler un travail (ou : lprm 42)
        # lpadmin -p caisse -E -v ipp://192.168.50.30/ipp/print -m everywhere   # ajouter une imprimante IPP
        \`\`\`

        Interface web : \`http://localhost:631\`. Configuration : \`/etc/cups/\`. Un utilisateur doit souvent être dans le
        groupe \`lpadmin\` (Debian) ou \`sys\`/\`wheel\` (Rocky) pour administrer les imprimantes.

        Autres sujets du bureau (§14.7) : les « portails » des applications isolées (Flatpak), l’accessibilité, les
        thèmes… largement hors du périmètre d’un administrateur serveur.
      `,
      aRetenir: [
        'CUPS : cupsd, filtres de conversion, IPP ; interface http://localhost:631.',
        '`lp -d imprimante fichier` (ou `lpr -P`), `lpstat -p -d`, `lpq`, `cancel` (ou `lprm`).',
        '`lpadmin -p nom -E -v URI -m everywhere` pour une imprimante sans pilote.',
      ],
      exercices: [
        {
          id: 'c14-03-01', type: 'commande', niveau: 1, ref: '§14.6',
          enonce: 'Imprime le fichier `recu.pdf` sur l’imprimante nommée `caisse`.',
          accepte: ['lp -d ?caisse recu\\.pdf', 'lpr -P ?caisse recu\\.pdf', 'lp recu\\.pdf -d ?caisse'],
          exemple: 'lp -d caisse recu.pdf',
          indices: ['Deux commandes historiques : lp (System V) et lpr (BSD).', 'lp choisit l’imprimante avec -d (destination).', '`lp -d caisse recu.pdf`'],
          solution: '```\n$ lp -d caisse recu.pdf\nrequest id is caisse-42 (1 file(s))\n```',
        },
        {
          id: 'c14-03-02', type: 'association', niveau: 1, ref: '§14.6',
          enonce: 'Associe chaque commande à son rôle.',
          paires: [['`lpstat -p -d`', 'Lister les imprimantes et celle par défaut'], ['`lpq`', 'Voir la file d’attente'], ['`cancel`', 'Annuler un travail'], ['`lpadmin`', 'Ajouter ou configurer une imprimante']],
          indices: ['stat = état.', 'q = queue.', 'admin = administration.'],
          solution: 'lpstat état, lpq file, cancel annuler, lpadmin configurer.',
        },
        {
          id: 'c14-03-03', type: 'vrai-faux', niveau: 2, ref: '§14.6',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'CUPS convertit les documents dans le langage de l’imprimante grâce à des filtres.', vrai: true },
            { texte: 'L’interface web de CUPS écoute sur le port 631.', vrai: true },
            { texte: 'Une imprimante IPP Everywhere a besoin d’un pilote propriétaire.', vrai: false, explication: 'Elle est « sans pilote » : c’est tout l’intérêt.' },
            { texte: 'CUPS est aussi le système d’impression de macOS.', vrai: true },
          ],
          indices: ['Filtres = conversion.', 'Une seule fausse.', 'Everywhere = universel.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Briques d’un bureau ?', r: 'Framebuffer → serveur/compositeur → gestionnaire de fenêtres → toolkit → environnement.' },
    { q: 'X11 vs Wayland ?', r: 'X11 : serveur Xorg + clients, réseau ; Wayland : protocole, compositeur tout-en-un, XWayland pour la compatibilité.' },
    { q: 'Quelle session tourne ?', r: '`echo $XDG_SESSION_TYPE` (wayland/x11).' },
    { q: 'Gestionnaires de connexion ?', r: 'GDM, SDDM, LightDM ; graphical.target.' },
    { q: 'D-Bus ?', r: 'Messages entre processus : bus système et bus de session ; `busctl list`, `dbus-monitor`.' },
    { q: 'Imprimer, voir la file, annuler ?', r: '`lp -d imp f` ; `lpq` / `lpstat -o` ; `cancel id`.' },
    { q: 'Interface de CUPS ?', r: 'http://localhost:631 ; config /etc/cups/.' },
  ],
  memo: `
    ### Bureau
    Framebuffer (DRM/KMS) → compositeur (Wayland : Mutter, KWin) / Xorg (X11) → toolkit (GTK, Qt) → GNOME, KDE, Xfce
    \`\`\`
    echo $XDG_SESSION_TYPE   loginctl show-session $XDG_SESSION_ID -p Type   echo $DISPLAY   ssh -X hôte appli
    systemctl get-default (graphical.target)   GDM · SDDM · LightDM
    \`\`\`

    ### D-Bus
    \`\`\`
    busctl list   busctl tree org.freedesktop.hostname1   dbus-monitor --system   /run/dbus/system_bus_socket
    \`\`\`

    ### CUPS
    \`\`\`
    lpstat -p -d   lp -d imp fichier   lpr -P imp fichier   lpq   lpstat -o   cancel imp-42   lprm 42
    lpadmin -p imp -E -v ipp://ADRESSE/ipp/print -m everywhere     http://localhost:631
    \`\`\`
  `,
});
