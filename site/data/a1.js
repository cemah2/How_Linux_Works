/* Module A1 (hors livre) : gérer les paquets avec apt, dnf et Flatpak. */
HLW.chapitre({
  id: 'A1',
  intro: `
    Le livre parle de compilation (chapitre 16) mais très peu des **paquets**, qui sont pourtant la façon normale
    d’installer et surtout de **mettre à jour** un système. Ce module couvre les deux familles de tes VM :
    **apt/dpkg** sur Debian 13 (cuve) et **dnf/rpm** sur Rocky 10 (fut), puis **Flatpak**, au programme du RHCSA.

    Le fil conducteur : savoir d’où vient un logiciel (quel dépôt, quelle signature), ce qu’un paquet a installé,
    et comment mettre un système à jour sans surprise.
  `,
  objectifs: [
    'expliquer le rôle des dépôts, des dépendances et des signatures ;',
    'lire et modifier la configuration des dépôts (deb822 sur Debian 13, .repo sur Rocky 10) ;',
    'installer, mettre à jour, supprimer et interroger des paquets avec apt/dpkg et dnf/rpm ;',
    'retrouver le paquet qui fournit un fichier, et les fichiers d’un paquet ;',
    'annuler une transaction dnf, bloquer une version, automatiser les mises à jour de sécurité ;',
    'installer et gérer une application Flatpak.',
  ],
  certifs: { lpic1: ['102.4', '102.5'], lfcs: ['OD'], rhcsa: ['R2'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: 'A1.1',
      titre: 'Paquets, dépôts et signatures',
      objectif: 'Comprendre ce qu’est un paquet et d’où il vient avant de taper la moindre commande.',
      rappel: `
        Un **paquet** est une archive (\`.deb\` ou \`.rpm\`) qui contient des fichiers, des **métadonnées** (nom,
        version, **dépendances**) et des scripts lancés à l’installation. Deux niveaux d’outils :

        | Niveau | Debian (cuve) | Rocky (fut) | Rôle |
        |---|---|---|---|
        | bas | **dpkg** | **rpm** | installe un fichier paquet, interroge la base locale ; ne résout pas les dépendances |
        | haut | **apt** | **dnf** | télécharge depuis les **dépôts**, résout les dépendances, met à jour |

        Un **dépôt** est un serveur qui publie des paquets et un **index** signé. Le gestionnaire vérifie la
        signature avec une **clé publique** : un paquet modifié en route est refusé.

        ### Debian 13 : format deb822

        \`\`\`
        $ cat /etc/apt/sources.list.d/debian.sources
        Types: deb
        URIs: https://deb.debian.org/debian
        Suites: trixie trixie-updates
        Components: main non-free-firmware
        Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg
        \`\`\`

        Les nouvelles installations utilisent ce format (un fichier \`.sources\` par dépôt). L’ancien
        \`/etc/apt/sources.list\` reste compris ; \`apt modernize-sources\` le convertit. **Composants** : \`main\`
        (libre), \`contrib\`, \`non-free\`, \`non-free-firmware\`. Les correctifs de sécurité viennent de
        \`trixie-security\`.

        ### Rocky 10 : fichiers .repo

        \`\`\`
        $ dnf repolist
        repo id        repo name
        appstream      Rocky Linux 10 - AppStream
        baseos         Rocky Linux 10 - BaseOS
        $ cat /etc/yum.repos.d/rocky.repo        # [baseos] … baseurl/mirrorlist, gpgcheck=1, gpgkey=…
        \`\`\`

        **BaseOS** (le cœur), **AppStream** (applications, langages), **CRB** (outils de construction, désactivé par
        défaut), et **EPEL** (paquets communautaires : \`dnf install epel-release\`). Sur Rocky 10, la modularité
        (« streams ») a disparu : les différentes versions d’un logiciel sont des paquets ordinaires.

        **Règle d’or** : ne mélange jamais les dépôts de deux versions ou de deux distributions différentes.
      `,
      aRetenir: [
        'dpkg/rpm : un fichier, pas de dépendances ; apt/dnf : dépôts, dépendances, mises à jour.',
        'Index et paquets signés : la clé publique (Signed-By, gpgkey) protège contre les modifications.',
        'Debian 13 : /etc/apt/sources.list.d/*.sources (deb822) ; Rocky 10 : /etc/yum.repos.d/*.repo.',
        'Rocky : BaseOS, AppStream, CRB, EPEL ; plus de modules sur Rocky 10.',
      ],
      exercices: [
        {
          id: 'cA1-01-01', type: 'association', niveau: 1,
          enonce: 'Associe chaque outil à son rôle.',
          paires: [['dpkg', 'Installer un fichier .deb, sans résoudre les dépendances'], ['apt', 'Télécharger et installer depuis les dépôts Debian'], ['rpm', 'Interroger la base des paquets RPM installés'], ['dnf', 'Résoudre les dépendances et mettre à jour sur Rocky']],
          indices: ['Deux outils de bas niveau, deux de haut niveau.', 'dpkg et rpm travaillent sur un fichier ou la base locale.', 'apt et dnf parlent aux dépôts.'],
          solution: 'dpkg et rpm : bas niveau ; apt et dnf : dépôts et dépendances.',
        },
        {
          id: 'cA1-01-02', type: 'qcm', niveau: 2,
          enonce: 'Pourquoi apt ou dnf refusent-ils un dépôt dont la signature ne correspond à aucune clé connue ?',
          choix: [
            'Parce qu’on ne peut pas prouver que l’index et les paquets viennent bien de l’éditeur et n’ont pas été modifiés',
            'Parce que le dépôt est trop lent',
            'Parce que les paquets sont compressés',
            'Parce que le dépôt utilise HTTPS',
          ],
          reponse: 0,
          indices: ['La signature sert à l’authenticité.', 'La clé publique de l’éditeur vérifie la signature.', 'Sans elle, un intermédiaire pourrait injecter un paquet.'],
          solution: 'La signature garantit l’origine et l’intégrité. Sans clé de confiance, n’importe qui pourrait servir un paquet modifié.',
        },
        {
          id: 'cA1-01-03', type: 'commande', niveau: 1,
          enonce: 'Sur fut, liste les dépôts activés.',
          accepte: ['(sudo )?dnf repolist( enabled| --enabled)?', '(sudo )?dnf repo list( --enabled)?', '(sudo )?yum repolist'],
          exemple: 'dnf repolist',
          indices: ['dnf a une sous-commande « liste des dépôts ».', 'repo + list.', '`dnf repolist`'],
          solution: '```\n$ dnf repolist\nrepo id        repo name\nappstream      Rocky Linux 10 - AppStream\nbaseos         Rocky Linux 10 - BaseOS\n```\n`dnf repolist --all` montre aussi les dépôts désactivés (crb…).',
        },
        {
          id: 'cA1-01-04', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Sur une installation neuve de Debian 13, les dépôts sont décrits dans /etc/apt/sources.list.d/debian.sources.', vrai: true },
            { texte: 'Ajouter les dépôts de Rocky 9 sur Rocky 10 permet d’avoir plus de logiciels sans risque.', vrai: false, explication: 'Mélanger les versions casse les dépendances.' },
            { texte: 'EPEL fournit des paquets communautaires pour Rocky, en complément des dépôts officiels.', vrai: true },
            { texte: 'rpm -i résout automatiquement les dépendances manquantes en les téléchargeant.', vrai: false, explication: 'C’est le travail de dnf.' },
          ],
          indices: ['deb822 = fichiers .sources.', 'Deux fausses.', 'rpm est de bas niveau.'],
          solution: 'Vrai, faux, vrai, faux.',
        },
        {
          id: 'cA1-01-05', type: 'commande', niveau: 2,
          enonce: 'Sur fut, active le dépôt **CRB** (désactivé par défaut).',
          accepte: ['(sudo )?dnf config-manager --set-enabled crb', '(sudo )?dnf config-manager --enable crb', '(sudo )?crb enable', '(sudo )?/usr/bin/crb enable'],
          exemple: 'dnf config-manager --set-enabled crb',
          indices: ['Le greffon config-manager modifie les .repo.', 'Option --set-enabled.', '`dnf config-manager --set-enabled crb`'],
          solution: '```\n# dnf config-manager --set-enabled crb\n```\nLe paquet epel-release fournit aussi un petit script `crb enable`.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A1.2',
      titre: 'apt et dpkg au quotidien',
      objectif: 'Installer, mettre à jour, supprimer et interroger des paquets sur Debian.',
      rappel: `
        \`\`\`
        $ sudo apt update                 # rafraîchir les index (à faire avant tout le reste)
        $ apt list --upgradable           # ce qui peut être mis à jour
        $ sudo apt upgrade                # mettre à jour sans rien supprimer
        $ sudo apt full-upgrade           # mise à jour qui peut ajouter ou retirer des paquets
        $ sudo apt install nginx          # installer (avec les dépendances)
        $ sudo apt install ./outil_1.0_amd64.deb   # un fichier local, dépendances résolues
        $ sudo apt remove nginx           # supprimer (la configuration reste)
        $ sudo apt purge nginx            # supprimer avec la configuration
        $ sudo apt autoremove             # dépendances devenues inutiles
        $ apt search jaugeur ; apt show nginx ; apt policy nginx   # chercher, décrire, d'où vient la version
        \`\`\`

        Interroger la base locale avec **dpkg** :

        | Commande | Réponse |
        |---|---|
        | \`dpkg -l\` (ou \`dpkg -l 'nginx*'\`) | paquets installés (\`ii\` = installé) |
        | \`dpkg -L nginx\` | fichiers installés par le paquet |
        | \`dpkg -S /usr/sbin/nginx\` | paquet propriétaire d’un fichier **installé** |
        | \`dpkg -s nginx\` | état et description |

        Pour un fichier **non installé** : \`apt-file search\` (fiche 16.5).

        **Bloquer** une version : \`sudo apt-mark hold nginx\` (\`unhold\` pour lever, \`apt-mark showhold\`).
        **Sécurité automatique** : le paquet \`unattended-upgrades\` installe chaque jour les correctifs de
        sécurité ; \`needrestart\` signale les services à redémarrer après une mise à jour de bibliothèque.
        Le journal des opérations : \`/var/log/apt/history.log\`.
      `,
      aRetenir: [
        '`apt update` puis `apt upgrade` / `full-upgrade` ; `install`, `remove`, `purge`, `autoremove`.',
        '`apt show`, `apt policy`, `apt list --upgradable`.',
        '`dpkg -l`, `-L paquet`, `-S fichier`, `-s paquet`.',
        '`apt-mark hold` ; unattended-upgrades ; /var/log/apt/history.log.',
      ],
      exercices: [
        {
          id: 'cA1-02-01', type: 'ordre', niveau: 1,
          enonce: 'Remets dans l’ordre la mise à jour complète de cuve.',
          elements: ['sudo apt update', 'apt list --upgradable', 'sudo apt upgrade', 'sudo apt autoremove'],
          indices: ['D’abord rafraîchir les index.', 'Regarder avant d’agir.', 'Nettoyer à la fin.'],
          solution: '`update` → `list --upgradable` → `upgrade` (ou `full-upgrade`) → `autoremove`.',
        },
        {
          id: 'cA1-02-02', type: 'commande', niveau: 1,
          enonce: 'Quel paquet a installé le fichier `/usr/bin/rsync` ? (base locale de dpkg)',
          accepte: ['dpkg -S /usr/bin/rsync', 'dpkg --search /usr/bin/rsync', 'dpkg-query -S /usr/bin/rsync'],
          exemple: 'dpkg -S /usr/bin/rsync',
          indices: ['dpkg sait chercher (search) un fichier.', 'Option -S.', '`dpkg -S /usr/bin/rsync`'],
          solution: '```\n$ dpkg -S /usr/bin/rsync\nrsync: /usr/bin/rsync\n```',
        },
        {
          id: 'cA1-02-03', type: 'commande', niveau: 1,
          enonce: 'Liste les fichiers installés par le paquet `openssh-server`.',
          accepte: ['dpkg -L openssh-server', 'dpkg --listfiles openssh-server', 'dpkg-query -L openssh-server'],
          exemple: 'dpkg -L openssh-server',
          indices: ['dpkg, option de liste des fichiers.', '-L comme List.', '`dpkg -L openssh-server`'],
          solution: '```\n$ dpkg -L openssh-server | grep bin\n/usr/sbin/sshd\n...\n```',
        },
        {
          id: 'cA1-02-04', type: 'qcm', niveau: 2,
          enonce: 'Malik a désinstallé nginx avec `apt remove nginx`, mais `/etc/nginx/` est toujours là. Pourquoi, et comment tout retirer ?',
          choix: [
            'remove garde la configuration ; `apt purge nginx` la supprime aussi',
            'C’est un bogue d’apt',
            'Il faut redémarrer pour que /etc/nginx disparaisse',
            '`apt autoremove` supprime toujours les configurations',
          ],
          reponse: 0,
          indices: ['Deux verbes de suppression.', 'L’un conserve les fichiers de configuration.', 'dpkg -l affiche alors « rc ».'],
          solution: '`remove` laisse la configuration (`dpkg -l` affiche `rc`), pour une réinstallation future. `purge` supprime tout.',
        },
        {
          id: 'cA1-02-05', type: 'commande', niveau: 2,
          enonce: 'Empêche le paquet `postgresql-17` d’être mis à jour par `apt upgrade`.',
          accepte: ['(sudo )?apt-mark hold postgresql-17', '(sudo )?echo ["\']?postgresql-17 hold["\']? \\| (sudo )?dpkg --set-selections'],
          exemple: 'apt-mark hold postgresql-17',
          indices: ['apt-mark marque les paquets.', 'Le marqueur s’appelle « hold ».', '`apt-mark hold postgresql-17`'],
          solution: '```\n$ sudo apt-mark hold postgresql-17\n$ apt-mark showhold\n```\nÀ lever avec `apt-mark unhold` après avoir planifié la mise à jour.',
        },
        {
          id: 'cA1-02-06', type: 'commande', niveau: 2,
          enonce: 'Affiche la version installée de nginx, les versions disponibles, et le dépôt de chacune.',
          accepte: ['apt policy nginx', 'apt-cache policy nginx'],
          exemple: 'apt policy nginx',
          indices: ['Une sous-commande d’apt parle de priorités et de versions.', 'policy.', '`apt policy nginx`'],
          solution: '```\n$ apt policy nginx\nnginx:\n  Installed: (none)\n  Candidate: 1.26.3-3\n  Version table:\n     1.26.3-3 500\n        500 https://deb.debian.org/debian trixie/main amd64 Packages\n```',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A1.3',
      titre: 'dnf et rpm au quotidien',
      objectif: 'Faire la même chose sur Rocky, avec en prime l’historique et l’annulation.',
      rappel: `
        \`\`\`
        $ dnf check-update                # ce qui peut être mis à jour (code 100 s'il y a des mises à jour)
        $ sudo dnf upgrade                # tout mettre à jour
        $ sudo dnf upgrade --security     # seulement les correctifs de sécurité
        $ sudo dnf install nginx          # ou un fichier local : dnf install ./outil-1.0.x86_64.rpm
        $ sudo dnf remove nginx           # supprime aussi les dépendances devenues inutiles
        $ dnf search jaugeur ; dnf info nginx
        $ dnf provides '*/bin/rsync'      # quel paquet fournit un fichier, même non installé
        $ sudo dnf group install "Development Tools" ; dnf group list
        \`\`\`

        **L’historique** : chaque transaction est numérotée et réversible.

        \`\`\`
        $ dnf history                     # ID | commande | date | action
        $ dnf history info 14
        $ sudo dnf history undo 14        # annuler la transaction 14
        \`\`\`

        Interroger la base locale avec **rpm** :

        | Commande | Réponse |
        |---|---|
        | \`rpm -qa\` | tous les paquets installés |
        | \`rpm -qi nginx\` | informations |
        | \`rpm -ql nginx\` | fichiers du paquet |
        | \`rpm -qf /usr/sbin/nginx\` | paquet propriétaire d’un fichier installé |
        | \`rpm -qc nginx\` | fichiers de configuration |
        | \`rpm -V nginx\` | fichiers **modifiés** depuis l’installation |

        **Bloquer** une version : \`dnf versionlock add nginx\` (paquet \`python3-dnf-plugin-versionlock\`).
        **Mises à jour automatiques** : \`dnf-automatic\` et son timer \`dnf-automatic.timer\`
        (\`/etc/dnf/automatic.conf\`, \`upgrade_type = security\`). Après une mise à jour :
        \`dnf needs-restarting -r\` (redémarrage nécessaire ?) et \`dnf needs-restarting -s\` (services).
      `,
      aRetenir: [
        '`dnf check-update`, `upgrade [--security]`, `install`, `remove`, `info`, `provides`, `group install`.',
        '`dnf history`, `history info N`, `history undo N`.',
        '`rpm -qa`, `-qi`, `-ql`, `-qf`, `-qc`, `-V`.',
        '`dnf versionlock`, dnf-automatic, `dnf needs-restarting`.',
      ],
      exercices: [
        {
          id: 'cA1-03-01', type: 'association', niveau: 1,
          enonce: 'Associe chaque commande Debian à son équivalent sur Rocky.',
          paires: [['`dpkg -L paquet`', '`rpm -ql paquet`'], ['`dpkg -S fichier`', '`rpm -qf fichier`'], ['`apt-file search fichier`', '`dnf provides fichier`'], ['`apt-mark hold paquet`', '`dnf versionlock add paquet`']],
          indices: ['-L et -ql listent les fichiers.', '-S et -qf trouvent le propriétaire.', 'Pour un fichier non installé, on interroge les dépôts.'],
          solution: 'dpkg -L ↔ rpm -ql ; dpkg -S ↔ rpm -qf ; apt-file search ↔ dnf provides ; apt-mark hold ↔ dnf versionlock add.',
        },
        {
          id: 'cA1-03-02', type: 'commande', niveau: 1,
          enonce: 'Sur fut, quel paquet a installé `/etc/ssh/sshd_config` ?',
          accepte: ['rpm -qf /etc/ssh/sshd_config', 'rpm --query --file /etc/ssh/sshd_config', 'dnf provides /etc/ssh/sshd_config'],
          exemple: 'rpm -qf /etc/ssh/sshd_config',
          indices: ['rpm en mode requête (-q).', 'f comme file.', '`rpm -qf /etc/ssh/sshd_config`'],
          solution: '```\n$ rpm -qf /etc/ssh/sshd_config\nopenssh-server-9.9p1-…el10.x86_64\n```',
        },
        {
          id: 'cA1-03-03', type: 'qcm', niveau: 2,
          enonce: 'Hier, une mise à jour (transaction 27 dans `dnf history`) a cassé l’outil de caisse. Quelle est la façon la plus propre de revenir en arrière ?',
          choix: ['`sudo dnf history undo 27`', 'Supprimer à la main les fichiers modifiés', '`rpm -e --nodeps` sur chaque paquet', 'Réinstaller la VM'],
          reponse: 0,
          indices: ['dnf garde l’historique.', 'Chaque transaction peut être annulée.', 'undo.'],
          solution: '`dnf history info 27` pour voir ce qu’elle a fait, puis `dnf history undo 27`. (Les anciennes versions doivent encore être disponibles dans les dépôts.) Un instantané Proxmox avant la mise à jour reste la meilleure assurance.',
        },
        {
          id: 'cA1-03-04', type: 'commande', niveau: 2,
          enonce: 'Vérifie quels fichiers du paquet `openssh-server` ont été modifiés depuis son installation.',
          accepte: ['rpm -V openssh-server', 'rpm --verify openssh-server', 'rpm -Vv openssh-server'],
          exemple: 'rpm -V openssh-server',
          indices: ['rpm sait vérifier (verify).', 'Option -V.', '`rpm -V openssh-server`'],
          solution: '```\n$ rpm -V openssh-server\nS.5....T.  c /etc/ssh/sshd_config\n```\nS = taille, 5 = empreinte, T = date ; `c` = fichier de configuration. Utile pour repérer une modification inattendue.',
        },
        {
          id: 'cA1-03-05', type: 'commande', niveau: 2,
          enonce: 'Installe uniquement les mises à jour de **sécurité** disponibles sur fut.',
          accepte: ['(sudo )?dnf (-y )?upgrade --security( -y)?', '(sudo )?dnf (-y )?update --security( -y)?', '(sudo )?dnf --security (-y )?upgrade( -y)?'],
          exemple: 'dnf upgrade --security',
          indices: ['dnf connaît les avis de sécurité (advisories).', 'Une option filtre la mise à jour.', '`dnf upgrade --security`'],
          solution: '```\n$ dnf updateinfo list --security      # les avis concernés\n$ sudo dnf upgrade --security\n```',
        },
        {
          id: 'cA1-03-06', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`dnf check-update` renvoie le code 100 quand des mises à jour sont disponibles.', vrai: true, explication: 'Pratique dans un script de supervision.' },
            { texte: '`dnf provides` ne trouve que les fichiers des paquets déjà installés.', vrai: false, explication: 'Il interroge aussi les dépôts.' },
            { texte: '`dnf needs-restarting -r` indique si un redémarrage est nécessaire.', vrai: true },
            { texte: 'dnf-automatic s’active avec un timer systemd.', vrai: true },
          ],
          indices: ['Les codes de sortie servent aux scripts.', 'Une seule fausse.', 'needs-restarting fait partie de dnf-plugins-core.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A1.4',
      titre: 'Flatpak',
      objectif: 'Installer une application isolée et indépendante de la distribution.',
      rappel: `
        **Flatpak** distribue des applications (surtout de bureau) avec leurs dépendances, dans un **bac à sable** :
        elles ne voient que ce qu’on leur autorise. Les applications reposent sur des **runtimes** partagés
        (par exemple \`org.freedesktop.Platform\`). La source principale est le dépôt distant **Flathub**.

        \`\`\`
        # dnf install flatpak                     (cuve : apt install flatpak)
        $ flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
        $ flatpak remotes
        $ flatpak search inkscape
        $ flatpak install flathub org.inkscape.Inkscape
        $ flatpak list --app
        $ flatpak run org.inkscape.Inkscape
        $ flatpak update
        $ flatpak uninstall org.inkscape.Inkscape ; flatpak uninstall --unused
        $ flatpak info --show-permissions org.inkscape.Inkscape
        \`\`\`

        - Installation **système** (par défaut, pour tous, sous \`/var/lib/flatpak\`) ou **utilisateur**
          (\`--user\`, sous \`~/.local/share/flatpak\`, sans root).
        - Les applications sont désignées par un identifiant inversé (\`org.inkscape.Inkscape\`).
        - Flatpak ne remplace pas dnf ou apt pour le système : il complète.
      `,
      aRetenir: [
        'Flatpak : applications en bac à sable + runtimes partagés ; dépôt Flathub.',
        '`flatpak remote-add`, `search`, `install`, `list`, `run`, `update`, `uninstall [--unused]`.',
        'Système (/var/lib/flatpak) ou `--user` ; identifiants inversés.',
      ],
      exercices: [
        {
          id: 'cA1-04-01', type: 'commande', niveau: 1,
          enonce: 'Ajoute le dépôt distant **flathub** (sans erreur s’il existe déjà), avec l’URL `https://dl.flathub.org/repo/flathub.flatpakrepo`.',
          accepte: ['(sudo )?flatpak remote-add --if-not-exists flathub https://dl\\.flathub\\.org/repo/flathub\\.flatpakrepo', '(sudo )?flatpak remote-add flathub https://dl\\.flathub\\.org/repo/flathub\\.flatpakrepo --if-not-exists', '(sudo )?flatpak remote-add (--user )?--if-not-exists flathub https://dl\\.flathub\\.org/repo/flathub\\.flatpakrepo'],
          exemple: 'flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo',
          indices: ['Sous-commande remote-add.', 'Une option évite l’erreur si le dépôt existe.', 'Puis le nom et l’URL.'],
          solution: '```\n# flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo\n$ flatpak remotes\n```',
        },
        {
          id: 'cA1-04-02', type: 'commande', niveau: 1,
          enonce: 'Installe l’application `org.inkscape.Inkscape` depuis flathub.',
          accepte: ['(sudo )?flatpak install (-y )?flathub org\\.inkscape\\.Inkscape( -y)?', '(sudo )?flatpak install (-y )?org\\.inkscape\\.Inkscape( -y)?', '(sudo )?flatpak install (--user )?(-y )?flathub org\\.inkscape\\.Inkscape'],
          exemple: 'flatpak install flathub org.inkscape.Inkscape',
          indices: ['Sous-commande install.', 'Le dépôt puis l’identifiant.', '`flatpak install flathub org.inkscape.Inkscape`'],
          solution: '```\n# flatpak install flathub org.inkscape.Inkscape\n$ flatpak list --app\n```',
        },
        {
          id: 'cA1-04-03', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Avec `--user`, un utilisateur peut installer une application Flatpak sans être root.', vrai: true },
            { texte: 'Flatpak est fait pour remplacer dnf pour les paquets du système (noyau, systemd).', vrai: false },
            { texte: '`flatpak uninstall --unused` supprime les runtimes qui ne servent plus.', vrai: true },
            { texte: 'Une application Flatpak tourne dans un bac à sable aux permissions limitées.', vrai: true },
          ],
          indices: ['--user = espace personnel.', 'Une seule fausse.', 'Flatpak vise les applications.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
        {
          id: 'cA1-04-04', type: 'commande', niveau: 2,
          enonce: 'Affiche les permissions accordées à `org.inkscape.Inkscape`.',
          accepte: ['flatpak info --show-permissions org\\.inkscape\\.Inkscape', 'flatpak info -M org\\.inkscape\\.Inkscape'],
          exemple: 'flatpak info --show-permissions org.inkscape.Inkscape',
          indices: ['Sous-commande info.', 'Une option affiche les permissions.', '--show-permissions.'],
          solution: '```\n$ flatpak info --show-permissions org.inkscape.Inkscape\n[Context]\nshared=network;ipc;\nfilesystems=host;\n```\n`flatpak override` permet de restreindre.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Bas niveau / haut niveau ?', r: 'dpkg, rpm (fichier, base locale) ; apt, dnf (dépôts, dépendances).' },
    { q: 'Dépôts sur Debian 13 ?', r: '/etc/apt/sources.list.d/debian.sources (deb822) ; `apt modernize-sources`.' },
    { q: 'Dépôts sur Rocky 10 ?', r: '/etc/yum.repos.d/*.repo ; BaseOS, AppStream, CRB, EPEL ; `dnf repolist`.' },
    { q: 'Propriétaire d’un fichier installé ?', r: '`dpkg -S f` ; `rpm -qf f`.' },
    { q: 'Fichiers d’un paquet ?', r: '`dpkg -L p` ; `rpm -ql p`.' },
    { q: 'remove vs purge ?', r: 'purge supprime aussi la configuration.' },
    { q: 'Annuler une mise à jour sur Rocky ?', r: '`dnf history` puis `dnf history undo N`.' },
    { q: 'Bloquer une version ?', r: '`apt-mark hold p` ; `dnf versionlock add p`.' },
    { q: 'Seulement la sécurité ?', r: 'unattended-upgrades ; `dnf upgrade --security`, dnf-automatic.' },
    { q: 'Fichiers modifiés d’un paquet RPM ?', r: '`rpm -V paquet`' },
    { q: 'Flatpak en 3 commandes ?', r: '`flatpak remote-add --if-not-exists flathub URL` ; `flatpak install flathub ID` ; `flatpak run ID`.' },
  ],
  memo: `
    | Tâche | Debian 13 (cuve) | Rocky 10 (fut) |
    |---|---|---|
    | rafraîchir | \`apt update\` | (automatique) \`dnf makecache\` |
    | à mettre à jour | \`apt list --upgradable\` | \`dnf check-update\` |
    | tout mettre à jour | \`apt upgrade\` / \`full-upgrade\` | \`dnf upgrade\` |
    | sécurité seule | unattended-upgrades | \`dnf upgrade --security\`, dnf-automatic |
    | installer / supprimer | \`apt install\` / \`remove\`, \`purge\` | \`dnf install\` / \`remove\` |
    | chercher, décrire | \`apt search\`, \`apt show\`, \`apt policy\` | \`dnf search\`, \`dnf info\` |
    | qui fournit ce fichier ? | \`dpkg -S\` (installé), \`apt-file search\` | \`rpm -qf\` (installé), \`dnf provides\` |
    | fichiers d’un paquet | \`dpkg -L\` | \`rpm -ql\` |
    | installés | \`dpkg -l\` | \`rpm -qa\` |
    | bloquer | \`apt-mark hold\` | \`dnf versionlock add\` |
    | historique | /var/log/apt/history.log | \`dnf history\`, \`history undo N\` |
    | dépôts | /etc/apt/sources.list.d/*.sources | /etc/yum.repos.d/*.repo, \`dnf config-manager --set-enabled crb\` |

    ### Flatpak
    \`\`\`
    flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
    flatpak install flathub ID   flatpak list --app   flatpak run ID   flatpak update   flatpak uninstall --unused
    \`\`\`
  `,
});
