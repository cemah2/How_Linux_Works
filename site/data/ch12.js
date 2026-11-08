/* Chapitre 12 : Network File Transfer and Sharing (livre p. 315–334). */
HLW.chapitre({
  id: '12',
  num: 12,
  intro: `
    Déplacer des fichiers d’une machine à l’autre est une tâche quotidienne : copier un site sur un serveur, sauvegarder
    des répertoires chaque nuit, partager un dossier entre les postes de la boutique. Ce chapitre présente deux familles
    d’outils :

    - le **transfert** : \`scp\` pour une copie ponctuelle, et surtout **rsync**, qui ne recopie que ce qui a changé ;
    - le **partage** : monter un répertoire distant comme s’il était local, avec **NFS** (entre machines Unix),
      **Samba/CIFS** (compatible Windows) ou **SSHFS** (par-dessus SSH, sans rien installer côté serveur).

    Le **Lab 10** met en place les sauvegardes et les partages de la brasserie. (Le chapitre 11, sur les scripts shell,
    viendra avec la livraison 4.)
  `,
  objectifs: [
    'copier ponctuellement avec scp, ou servir un répertoire en HTTP pour un dépannage ;',
    'synchroniser des répertoires avec rsync (barre finale, -a, --delete, -n, exclusions, compression) ;',
    'choisir entre NFS, Samba et SSHFS selon le besoin et la sécurité ;',
    'configurer un partage Samba et s’y connecter depuis Linux ;',
    'monter un répertoire distant avec SSHFS ;',
    'exporter et monter un partage NFS, de façon persistante.',
  ],
  certifs: { lpic1: ['110.3'], lfcs: ['STO', 'NET'], rhcsa: ['R1', 'R6'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '12.1',
      titre: 'Copie rapide et premiers pas avec rsync',
      sections: '§12.1 à 12.2.3', pages: '315–320',
      objectif: 'Copier un répertoire vers une autre machine et comprendre le piège de la barre finale.',
      rappel: `
        ### Copie rapide

        - \`scp -r dossier admin@cuve:/srv/\` : copie récursive par SSH (fiche 10.3).
        - \`python3 -m http.server 8000\` : sert le répertoire courant en HTTP, le temps d’un dépannage (en clair, sans
          contrôle d’accès : à couper aussitôt après).

        ### rsync

        rsync compare source et destination et ne transfère **que les différences**. Relancé, il ne refait presque rien.
        Il passe par SSH quand la destination est \`hôte:chemin\`, et doit être installé **des deux côtés**.

        \`\`\`
        $ rsync -a recettes admin@cuve:/srv/sauvegardes/        # copie récursive, en conservant tout
        $ rsync -nva recettes admin@cuve:/srv/sauvegardes/      # simulation (-n), détaillée (-v)
        \`\`\`

        **-a** (archive) = récursif + liens symboliques + droits + dates + propriétaires et groupes (en root) +
        fichiers spéciaux. C’est l’option de presque toutes les commandes rsync.

        ### La barre finale

        **La barre finale de la source change tout :**

        \`\`\`
        $ rsync -a recettes  cuve:/srv/sauv/      → crée /srv/sauv/recettes/…   (le répertoire lui-même)
        $ rsync -a recettes/ cuve:/srv/sauv/      → copie le CONTENU dans /srv/sauv/…
        \`\`\`

        La barre de la **destination**, elle, n’a pas d’effet. Combinée à \`--delete\` (fiche 12.2), une barre en trop
        ou en moins peut effacer beaucoup de choses : simule d’abord avec \`-n\`.
      `,
      aRetenir: [
        '`scp -r` pour une copie ponctuelle ; `python3 -m http.server` pour un dépannage bref.',
        'rsync ne transfère que les différences ; installé des deux côtés ; SSH par défaut.',
        '`-a` = récursif + liens + droits + dates + propriétaires ; `-n` simule, `-v` détaille.',
        '`src` copie le répertoire, `src/` copie son contenu.',
      ],
      exercices: [
        {
          id: 'c12-01-01', type: 'commande', niveau: 1, ref: '§12.2.2, p. 318',
          enonce: 'Copie le répertoire `recettes` dans `/srv/sauvegardes/` de cuve (compte `admin`) avec rsync, en conservant droits, dates et liens.',
          accepte: ['rsync -a(v|z|h|P)* recettes/? admin@cuve:/srv/sauvegardes/?', 'rsync -(v|z|h|P)*a(v|z|h|P)* recettes admin@cuve:/srv/sauvegardes/?', 'rsync --archive( -v)? recettes admin@cuve:/srv/sauvegardes/?'],
          exemple: 'rsync -a recettes admin@cuve:/srv/sauvegardes/',
          indices: ['Une option résume « tout conserver ».', 'Mode archive.', '`rsync -a recettes admin@cuve:/srv/sauvegardes/`'],
          solution: '```\n$ rsync -a recettes admin@cuve:/srv/sauvegardes/\n```\nRésultat : `/srv/sauvegardes/recettes/…` sur cuve.',
        },
        {
          id: 'c12-01-02', type: 'qcm', niveau: 2, ref: '§12.2.3, p. 319',
          enonce: 'Quel est le résultat de `rsync -a recettes/ cuve:/srv/sauv/` ?',
          choix: [
            'Le contenu de recettes est copié directement dans /srv/sauv/',
            'Un répertoire /srv/sauv/recettes/ est créé',
            'Une erreur : la barre est interdite',
            'Seuls les fichiers cachés sont copiés',
          ],
          reponse: 0,
          indices: ['Regarde la fin de la source.', 'La barre finale signifie « le contenu de ».', 'Sans barre, rsync crée le répertoire.'],
          solution: 'Avec `recettes/`, rsync copie le **contenu** dans /srv/sauv/. Sans barre, il crée /srv/sauv/recettes/.',
        },
        {
          id: 'c12-01-03', type: 'commande', niveau: 2, ref: '§12.2.2, p. 318',
          enonce: '**Simule**, en mode détaillé, la copie de `recettes` vers `admin@cuve:/srv/sauvegardes/`, sans rien transférer.',
          accepte: ['rsync -(nva|nav|van|vna|anv|avn) recettes/? admin@cuve:/srv/sauvegardes/?', 'rsync -a -n -v recettes/? admin@cuve:/srv/sauvegardes/?', 'rsync -av -n recettes/? admin@cuve:/srv/sauvegardes/?', 'rsync -av --dry-run recettes/? admin@cuve:/srv/sauvegardes/?', 'rsync -n -av recettes/? admin@cuve:/srv/sauvegardes/?'],
          exemple: 'rsync -nva recettes admin@cuve:/srv/sauvegardes/',
          indices: ['`-n` ne fait rien, il montre.', '`-v` pour voir la liste.', 'Garde `-a`.'],
          solution: '```\n$ rsync -nva recettes admin@cuve:/srv/sauvegardes/\n```\nForme longue : `--dry-run`.',
        },
        {
          id: 'c12-01-04', type: 'association', niveau: 2, ref: '§12.2.2',
          enonce: 'Associe chaque option rsync à son rôle.',
          paires: [
            ['`-a`', 'Mode archive : récursif, liens, droits, dates, propriétaires'],
            ['`-n`', 'Simulation : rien n’est transféré'],
            ['`-v`', 'Liste ce qui est fait'],
            ['`-z`', 'Compresse pendant le transfert'],
            ['`-P`', 'Progression, et reprise des transferts interrompus'],
          ],
          indices: ['a = archive.', 'n = « no », pour essayer.', 'z comme gzip.'],
          solution: '-a archive, -n simulation, -v détail, -z compression, -P progression + reprise.',
        },
        {
          id: 'c12-01-05', type: 'vrai-faux', niveau: 2, ref: '§12.2',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'rsync doit être installé sur les deux machines pour un transfert par SSH.', vrai: true },
            { texte: 'Relancer la même commande rsync recopie tous les fichiers.', vrai: false, explication: 'Seuls les fichiers modifiés sont transférés.' },
            { texte: 'La barre finale de la destination change le résultat.', vrai: false, explication: 'Seule celle de la source compte.' },
            { texte: '`python3 -m http.server` sert le répertoire courant sans authentification.', vrai: true },
          ],
          indices: ['rsync parle à un rsync distant.', 'Deux fausses.', 'Source, pas destination.'],
          solution: 'Vrai, faux, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '12.2',
      titre: 'rsync en production : miroir, exclusions, vérification',
      sections: '§12.2.4 à 12.2.9', pages: '320–323',
      objectif: 'Écrire une commande de sauvegarde rsync fiable.',
      rappel: `
        ### Miroir exact

        \`\`\`
        $ rsync -a --delete recettes/ cuve:/srv/sauv/recettes/
        \`\`\`

        \`--delete\` supprime de la destination ce qui n’existe plus dans la source : la destination devient un **miroir**.
        Puissant et dangereux : une source vide ou une barre mal placée efface la sauvegarde. **Toujours simuler
        d’abord** (\`-n\`).

        ### Exclure

        \`\`\`
        $ rsync -a --exclude='*.tmp' --exclude=.git recettes/ cuve:/srv/sauv/recettes/
        $ rsync -a --exclude-from=/etc/sauvegarde/exclusions recettes/ …
        \`\`\`

        Un motif qui commence par \`/\` est relatif à la racine du transfert : \`--exclude=/brouillons\` n’exclut que ce
        répertoire-là, pas tous ceux qui portent ce nom.

        ### Vérifier, compresser, limiter

        - Par défaut, rsync compare **taille et date** ; \`-c\` (\`--checksum\`) compare le contenu (lent, mais sûr).
        - \`-z\` : compression, utile sur un lien lent (inutile en local ou sur des fichiers déjà compressés).
        - \`--bwlimit=5M\` : ne pas saturer le lien (5 Mio/s).
        - \`-P\` : progression et reprise des gros fichiers.
        - Sens inverse : \`rsync -a cuve:/srv/recettes/ ./recettes/\` (de la machine distante vers le poste).

        ### Une sauvegarde typique

        \`\`\`
        rsync -a --delete --exclude='*.tmp' -e "ssh -i /root/.ssh/sauvegarde" \\
              /srv/recettes/ sauvegarde@douane:/srv/sauvegardes/cuve/recettes/
        \`\`\`

        lancée par un **timer** systemd (fiche 7.7), avec une clé SSH dédiée. Attention : un miroir n’est pas un
        historique. Une suppression accidentelle est recopiée à la synchronisation suivante. Pour garder des versions :
        \`--link-dest\` (instantanés économes) ou un outil comme restic ou borg.
      `,
      aRetenir: [
        '`--delete` : miroir exact (simuler avec -n avant !).',
        '`--exclude=motif`, `--exclude-from=fichier` ; `/motif` = relatif à la racine du transfert.',
        '`-c` contenu, `-z` compression, `--bwlimit`, `-P`, `-e "ssh -i clé"`.',
        'Miroir ≠ historique : --link-dest, restic, borg pour des versions.',
      ],
      exercices: [
        {
          id: 'c12-02-01', type: 'commande', niveau: 2, ref: '§12.2.2, p. 319',
          enonce: 'Fais de `/srv/sauv/recettes/` sur cuve un **miroir exact** du contenu de `recettes/` (les fichiers supprimés de la source doivent disparaître de la destination).',
          accepte: ['rsync -a(v|z|h)* --delete recettes/ (admin@)?cuve:/srv/sauv/recettes/?', 'rsync --delete -a(v|z|h)* recettes/ (admin@)?cuve:/srv/sauv/recettes/?', 'rsync -a(v|z|h)* recettes/ (admin@)?cuve:/srv/sauv/recettes/? --delete'],
          exemple: 'rsync -a --delete recettes/ cuve:/srv/sauv/recettes/',
          pieges: [{ motif: 'rsync -a(v|z)* --delete recettes (admin@)?cuve:/srv/sauv/recettes/?', message: 'Sans barre finale à la source, rsync crée /srv/sauv/recettes/recettes/… et --delete efface tout le reste de la destination !' }],
          indices: ['L’option qui supprime à destination.', 'Attention à la barre finale de la source.', '`rsync -a --delete recettes/ …`'],
          solution: '```\n$ rsync -nva --delete recettes/ cuve:/srv/sauv/recettes/   # simulation\n$ rsync -a --delete recettes/ cuve:/srv/sauv/recettes/\n```',
        },
        {
          id: 'c12-02-02', type: 'commande', niveau: 2, ref: '§12.2.4, p. 320',
          enonce: 'Copie `recettes/` vers `cuve:/srv/sauv/recettes/` en **excluant** tous les fichiers `*.tmp`.',
          accepte: ['rsync -a(v|z)* --exclude=["\']?\\*\\.tmp["\']? recettes/ (admin@)?cuve:/srv/sauv/recettes/?', 'rsync -a(v|z)* --exclude ["\']?\\*\\.tmp["\']? recettes/ (admin@)?cuve:/srv/sauv/recettes/?', 'rsync --exclude=["\']?\\*\\.tmp["\']? -a(v|z)* recettes/ (admin@)?cuve:/srv/sauv/recettes/?'],
          exemple: "rsync -a --exclude='*.tmp' recettes/ cuve:/srv/sauv/recettes/",
          indices: ['Option --exclude.', 'Le motif entre apostrophes, pour que le shell ne l’étende pas.', "`--exclude='*.tmp'`"],
          solution: "```\n$ rsync -a --exclude='*.tmp' recettes/ cuve:/srv/sauv/recettes/\n```",
        },
        {
          id: 'c12-02-03', type: 'qcm', niveau: 3, ref: '§12.2.2',
          enonce: 'Le disque de `/srv/recettes` de cuve n’était pas monté cette nuit (répertoire vide). La sauvegarde `rsync -a --delete /srv/recettes/ douane:/srv/sauv/recettes/` a tourné. Que s’est-il passé ?',
          choix: [
            'La sauvegarde a été vidée : --delete a reproduit une source vide',
            'Rien : rsync refuse une source vide',
            'rsync a recopié toute la sauvegarde vers cuve',
            'Une erreur, car le disque n’était pas monté',
          ],
          reponse: 0,
          indices: ['Que fait --delete quand la source est vide ?', 'rsync ne sait pas que c’est anormal.', 'Le miroir est fidèle… au vide.'],
          solution: 'La destination est devenue vide. Défenses : vérifier dans le script que la source est montée (`mountpoint -q`, ou un fichier témoin), `--max-delete=100`, et garder un historique (--link-dest, restic) plutôt qu’un simple miroir.',
        },
        {
          id: 'c12-02-04', type: 'association', niveau: 2, ref: '§12.2.5–12.2.8',
          enonce: 'Associe chaque besoin à l’option rsync.',
          paires: [
            ['Comparer le contenu des fichiers, pas seulement taille et date', '`-c`'],
            ['Ne pas dépasser 5 Mio/s sur le lien', '`--bwlimit=5M`'],
            ['Utiliser une clé SSH particulière', '`-e "ssh -i clé"`'],
            ['Lire la liste des exclusions dans un fichier', '`--exclude-from=fichier`'],
          ],
          indices: ['c comme checksum.', 'bw = bandwidth.', '-e choisit le shell distant.'],
          solution: '-c contenu ; --bwlimit débit ; -e "ssh -i clé" ; --exclude-from fichier.',
        },
        {
          id: 'c12-02-05', type: 'commande', niveau: 2, ref: '§12.2.8, p. 322',
          enonce: 'Rapatrie le **contenu** de `/srv/recettes/` de cuve dans le répertoire local `recettes/`.',
          accepte: ['rsync -a(v|z|P)* (admin@)?cuve:/srv/recettes/ \\./recettes/?', 'rsync -a(v|z|P)* (admin@)?cuve:/srv/recettes/ recettes/?'],
          exemple: 'rsync -a cuve:/srv/recettes/ ./recettes/',
          indices: ['Même commande, source et destination inversées.', 'La source est distante.', 'Barre finale à la source pour le contenu.'],
          solution: '```\n$ rsync -a cuve:/srv/recettes/ ./recettes/\n```',
        },
        {
          id: 'c12-02-06', type: 'vrai-faux', niveau: 2, ref: '§12.2',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un miroir rsync avec --delete protège contre une suppression accidentelle de la veille.', vrai: false, explication: 'La suppression est recopiée à la synchronisation suivante : il faut un historique.' },
            { texte: '`--exclude=/brouillons` n’exclut que le répertoire brouillons à la racine du transfert.', vrai: true },
            { texte: '`-z` est utile sur un lien lent, inutile pour des fichiers déjà compressés.', vrai: true },
            { texte: 'Par défaut, rsync décide de recopier un fichier d’après sa taille et sa date.', vrai: true },
          ],
          indices: ['Miroir ≠ versions.', 'Une seule fausse.', 'Le / ancre le motif.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '12.3',
      titre: 'Partager des fichiers : principes, sécurité et SSHFS',
      sections: '§12.3 et 12.5', pages: '323–324, 331–332',
      objectif: 'Choisir la bonne technique de partage, et monter un répertoire par SSH.',
      rappel: `
        Partager, c’est **monter** un répertoire distant dans l’arborescence locale : les programmes l’utilisent comme un
        répertoire ordinaire. Trois techniques courantes :

        | | NFS | Samba / CIFS (SMB) | SSHFS |
        |---|---|---|---|
        | Clients | Linux, Unix | Windows, macOS, Linux | Linux, macOS |
        | Serveur | nfs-kernel-server / nfs-utils | Samba | rien (sshd suffit) |
        | Sécurité | confiance dans les UID et les adresses (NFSv3), Kerberos (NFSv4) | comptes Samba, chiffrement SMB3 | SSH : chiffré, authentifié |
        | Usage | serveurs entre eux, réseau interne | postes de travail, mixte Windows | dépannage, accès ponctuel |

        Les performances dépendent du réseau et des petits fichiers (beaucoup d’allers-retours). Un partage réseau n’est
        **pas** une sauvegarde : une suppression est immédiate pour tout le monde.

        Sécurité : n’expose jamais un partage sur Internet ; limite les **adresses** autorisées et les **comptes** ;
        préfère les protocoles chiffrés quand le réseau n’est pas de confiance.

        ### SSHFS

        Monte un répertoire distant par **SSH** (via FUSE), avec ton compte et tes clés :

        \`\`\`
        $ mkdir ~/archives-cuve
        $ sshfs admin@cuve:/srv/archives ~/archives-cuve
        $ ls ~/archives-cuve
        $ fusermount3 -u ~/archives-cuve           # démonter (ou fusermount -u)
        \`\`\`

        Paquet \`sshfs\` côté client seulement. Pratique et sûr, mais moins performant que NFS pour un usage intensif.
      `,
      aRetenir: [
        'NFS : entre Linux, confiance UID/adresses ; Samba : compatible Windows ; SSHFS : par SSH, rien à installer côté serveur.',
        'Un partage n’est pas une sauvegarde.',
        'Jamais sur Internet ; limiter adresses et comptes ; chiffrer si le réseau n’est pas sûr.',
        '`sshfs user@hôte:rép point` ; `fusermount3 -u point`.',
      ],
      exercices: [
        {
          id: 'c12-03-01', type: 'association', niveau: 1, ref: '§12.3',
          enonce: 'Associe chaque besoin à la technique la plus adaptée.',
          paires: [
            ['Les PC Windows de la boutique doivent accéder au dossier des commandes', 'Samba (SMB/CIFS)'],
            ['Deux serveurs Linux du réseau interne partagent un répertoire de données', 'NFS'],
            ['Accéder ponctuellement à des fichiers de cuve, par une connexion chiffrée, sans rien installer sur cuve', 'SSHFS'],
          ],
          indices: ['Windows parle SMB.', 'NFS est le partage natif d’Unix.', 'SSH est déjà là.'],
          solution: 'Windows : Samba. Serveurs Linux : NFS. Accès ponctuel chiffré : SSHFS.',
        },
        {
          id: 'c12-03-02', type: 'commande', niveau: 1, ref: '§12.5, p. 331',
          enonce: 'Monte `/srv/archives` de cuve (compte `admin`) dans `~/archives-cuve` avec SSHFS.',
          accepte: ['sshfs admin@cuve:/srv/archives/? ~/archives-cuve/?', 'sshfs admin@cuve:/srv/archives/? \\$HOME/archives-cuve/?', 'sshfs admin@cuve:/srv/archives/? archives-cuve/?'],
          exemple: 'sshfs admin@cuve:/srv/archives ~/archives-cuve',
          indices: ['La syntaxe ressemble à scp.', 'Source distante, puis point de montage.', '`sshfs admin@cuve:/srv/archives ~/archives-cuve`'],
          solution: '```\n$ mkdir -p ~/archives-cuve\n$ sshfs admin@cuve:/srv/archives ~/archives-cuve\n```',
        },
        {
          id: 'c12-03-03', type: 'commande', niveau: 1, ref: '§12.5',
          enonce: 'Démonte `~/archives-cuve` (montage SSHFS fait par ton compte, sans sudo).',
          accepte: ['fusermount3? -u ~/archives-cuve/?', 'fusermount3? -u \\$HOME/archives-cuve/?', 'umount ~/archives-cuve/?'],
          exemple: 'fusermount3 -u ~/archives-cuve',
          indices: ['Les montages FUSE d’un utilisateur se démontent avec un outil FUSE.', 'fusermount (ou fusermount3).', '`-u` pour démonter.'],
          solution: '```\n$ fusermount3 -u ~/archives-cuve\n```\n(Selon la version : `fusermount -u`. Root peut aussi utiliser `umount`.)',
        },
        {
          id: 'c12-03-04', type: 'vrai-faux', niveau: 2, ref: '§12.3.2',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'SSHFS nécessite seulement sshd côté serveur.', vrai: true },
            { texte: 'Un partage réseau protège contre les suppressions accidentelles.', vrai: false, explication: 'La suppression est immédiate et visible de tous.' },
            { texte: 'NFSv3 fait confiance aux UID envoyés par le client.', vrai: true },
            { texte: 'Exposer un partage Samba sur Internet est une pratique sûre si les mots de passe sont forts.', vrai: false, explication: 'SMB est une cible classique : partage interne ou VPN seulement.' },
          ],
          indices: ['SSHFS = SSH + FUSE.', 'Deux fausses.', 'Partager n’est pas sauvegarder.'],
          solution: 'Vrai, faux, vrai, faux.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '12.4',
      titre: 'Partager avec Samba',
      sections: '§12.4.1 à 12.4.8', pages: '324–329',
      objectif: 'Créer un partage Samba réservé à un groupe.',
      rappel: `
        **Samba** implémente le protocole **SMB** de Windows. Paquets : \`samba\` ; services : \`smbd\` (Debian),
        \`smb\` (Rocky). Configuration : \`/etc/samba/smb.conf\`.

        \`\`\`
        [global]
            workgroup = BRASSERIE
            server string = Serveur de la brasserie
            server min protocol = SMB3          # refuser les vieux protocoles (SMB1)
            hosts allow = 192.168.50.0/24 127.0.0.1
            map to guest = never

        [boutique]
            comment = Dossier de la boutique
            path = /srv/partages/boutique
            valid users = @boutique             # le groupe Unix boutique
            read only = no
            create mask = 0660
            directory mask = 2770
        \`\`\`

        \`\`\`
        # testparm                    # vérifier la syntaxe et voir la configuration effective
        # smbpasswd -a malik          # mot de passe SAMBA (distinct du mot de passe Unix ; le compte Unix doit exister)
        # smbpasswd -d kevin          # désactiver ; -e réactiver ; -x supprimer
        # pdbedit -L                  # lister les comptes Samba
        # systemctl enable --now smbd
        \`\`\`

        Les droits finaux combinent ceux de Samba (\`valid users\`, \`read only\`) **et** ceux du système de fichiers :
        le répertoire doit appartenir au groupe et être modifiable par lui (setgid conseillé, fiche 2.A).

        Section \`[homes]\` : chaque utilisateur voit son répertoire personnel. Journaux : \`/var/log/samba/\` et
        \`journalctl -u smbd\`. Sur Rocky, ouvrir le pare-feu (\`firewall-cmd --permanent --add-service=samba\`) et
        étiqueter le répertoire pour SELinux (\`samba_share_t\`, module A3).
      `,
      aRetenir: [
        'smb.conf : [global] (workgroup, server min protocol, hosts allow) et une section par partage.',
        'Partage : path, valid users = @groupe, read only = no, create mask, directory mask.',
        '`testparm`, `smbpasswd -a|-d|-e|-x`, `pdbedit -L` ; mot de passe Samba distinct.',
        'Droits Samba ET droits Unix ; Rocky : firewalld + SELinux.',
      ],
      exercices: [
        {
          id: 'c12-04-01', type: 'trous', niveau: 2, ref: '§12.4.6, p. 328',
          enonce: 'Complète le partage `[boutique]` : répertoire `/srv/partages/boutique`, accessible au **groupe** boutique, en écriture.',
          texte: '[boutique]\n    [[1]] = /srv/partages/boutique\n    valid users = [[2]]\n    read only = [[3]]',
          trous: [
            { accepte: ['path'], exemple: 'path' },
            { accepte: ['@boutique', '\\+boutique'], exemple: '@boutique' },
            { accepte: ['no'], exemple: 'no' },
          ],
          indices: ['Le chemin du répertoire.', 'Un groupe se note avec un préfixe.', 'Écriture autorisée = lecture seule « non ».'],
          solution: '```\n[boutique]\n    path = /srv/partages/boutique\n    valid users = @boutique\n    read only = no\n```',
        },
        {
          id: 'c12-04-02', type: 'commande', niveau: 1, ref: '§12.4.3, p. 326',
          enonce: 'Crée le mot de passe Samba de l’utilisateur `malik`.',
          accepte: ['(sudo )?smbpasswd -a malik'],
          exemple: 'smbpasswd -a malik',
          indices: ['Samba a sa propre base de mots de passe.', 'L’outil smbpasswd.', '`-a` pour ajouter.'],
          solution: '```\n# smbpasswd -a malik\nNew SMB password:\n```\nLe compte Unix `malik` doit déjà exister.',
        },
        {
          id: 'c12-04-03', type: 'commande', niveau: 1, ref: '§12.4',
          enonce: 'Vérifie la syntaxe de `smb.conf` et affiche la configuration effective.',
          accepte: ['(sudo )?testparm( -s)?( /etc/samba/smb\\.conf)?'],
          exemple: 'testparm',
          indices: ['Le nom évoque « tester les paramètres ».', 'Une commande de Samba.', '`testparm`'],
          solution: '```\n$ testparm\nLoaded services file OK.\n```',
        },
        {
          id: 'c12-04-04', type: 'qcm', niveau: 2, ref: '§12.4.2',
          enonce: 'Malik voit le partage `[boutique]` mais ne peut pas y créer de fichier, alors que `read only = no`. `ls -ld /srv/partages/boutique` montre `drwxr-xr-x root root`. Pourquoi ?',
          choix: [
            'Les droits Unix du répertoire ne permettent pas au groupe boutique d’écrire',
            'Samba ne gère pas l’écriture',
            'Il faut redémarrer Windows',
            'valid users doit contenir le mot write',
          ],
          reponse: 0,
          indices: ['Samba agit au nom de malik.', 'Le système de fichiers applique ses propres droits.', 'root:root 755.'],
          solution: 'Samba écrit **en tant que malik** : le système de fichiers refuse. `chgrp boutique` et `chmod 2770` sur le répertoire. Les droits finaux sont l’intersection de Samba et d’Unix.',
        },
        {
          id: 'c12-04-05', type: 'commande', niveau: 2, ref: '§12.4.3, p. 327',
          enonce: 'Désactive (sans le supprimer) le compte Samba de `kevin`.',
          accepte: ['(sudo )?smbpasswd -d kevin'],
          exemple: 'smbpasswd -d kevin',
          indices: ['smbpasswd encore.', 'd comme *disable*.', '`smbpasswd -d kevin`'],
          solution: '```\n# smbpasswd -d kevin\nDisabled user kevin.\n```\n`-e` le réactive, `-x` le supprime.',
        },
        {
          id: 'c12-04-06', type: 'vrai-faux', niveau: 2, ref: '§12.4',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Le mot de passe Samba est automatiquement celui du compte Unix.', vrai: false, explication: 'Il est distinct : `smbpasswd -a`.' },
            { texte: '`server min protocol = SMB3` refuse les clients qui ne parlent que SMB1.', vrai: true },
            { texte: '`hosts allow` limite les adresses autorisées à se connecter.', vrai: true },
            { texte: 'Le service Samba s’appelle smbd sur Debian et smb sur Rocky.', vrai: true },
          ],
          indices: ['Deux bases de mots de passe.', 'Une seule fausse.', 'SMB1 est obsolète et dangereux.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '12.5',
      titre: 'Le client Samba et les montages CIFS',
      sections: '§12.4.9', pages: '329–331',
      objectif: 'Accéder à un partage SMB depuis Linux, ponctuellement ou de façon permanente.',
      rappel: `
        ### smbclient

        \`\`\`
        $ smbclient -L //cuve -U malik            # lister les partages
        $ smbclient //cuve/boutique -U malik      # session de type FTP : ls, get, put, cd
        smb: \\> put commandes.csv
        \`\`\`

        ### Montage CIFS

        Paquet \`cifs-utils\` :

        \`\`\`
        # mount -t cifs //cuve/boutique /mnt/boutique -o credentials=/root/.smb-boutique,uid=malik,gid=boutique
        \`\`\`

        Le fichier d’identifiants évite le mot de passe en clair sur la ligne de commande (visible dans \`ps\`) :

        \`\`\`
        # /root/.smb-boutique   (chmod 600 !)
        username=malik
        password=…
        \`\`\`

        Dans \`/etc/fstab\`, pour un montage au démarrage :

        \`\`\`
        //cuve/boutique  /mnt/boutique  cifs  credentials=/root/.smb-boutique,uid=malik,gid=boutique,_netdev,nofail  0  0
        \`\`\`

        \`_netdev\` : attendre le réseau ; \`nofail\` : ne pas bloquer le démarrage si le serveur est absent (Lab 03 !).
        \`x-systemd.automount\` monte à la première utilisation.
      `,
      aRetenir: [
        '`smbclient -L //hôte -U user` ; `smbclient //hôte/partage -U user`.',
        '`mount -t cifs //hôte/partage point -o credentials=fichier,uid=,gid=` (cifs-utils).',
        'Fichier d’identifiants en 600, jamais de mot de passe sur la ligne de commande.',
        'fstab : `_netdev,nofail` (et éventuellement `x-systemd.automount`).',
      ],
      exercices: [
        {
          id: 'c12-05-01', type: 'commande', niveau: 1, ref: '§12.4.9, p. 330',
          enonce: 'Liste les partages proposés par `cuve`, en t’authentifiant comme `malik`.',
          accepte: ['smbclient -L //cuve/? -U malik', 'smbclient -L cuve -U malik', 'smbclient -U malik -L //cuve/?', 'smbclient -L //cuve\\.brasserie\\.lan/? -U malik'],
          exemple: 'smbclient -L //cuve -U malik',
          indices: ['Le client Samba en ligne de commande.', '`-L` liste, `-U` utilisateur.', '`smbclient -L //cuve -U malik`'],
          solution: '```\n$ smbclient -L //cuve -U malik\n\tSharename       Type      Comment\n\tboutique        Disk      Dossier de la boutique\n```',
        },
        {
          id: 'c12-05-02', type: 'commande', niveau: 2, ref: '§12.4.9, p. 331',
          enonce: 'Monte le partage `//cuve/boutique` sur `/mnt/boutique`, avec le fichier d’identifiants `/root/.smb-boutique`.',
          accepte: ['(sudo )?mount -t cifs //cuve/boutique /mnt/boutique/? -o credentials=/root/\\.smb-boutique(,\\S+)?', '(sudo )?mount -t cifs -o credentials=/root/\\.smb-boutique(,\\S+)? //cuve/boutique /mnt/boutique/?'],
          exemple: 'mount -t cifs //cuve/boutique /mnt/boutique -o credentials=/root/.smb-boutique',
          indices: ['Type de système de fichiers : cifs.', 'Option credentials=.', '`mount -t cifs //cuve/boutique /mnt/boutique -o credentials=…`'],
          solution: '```\n# mount -t cifs //cuve/boutique /mnt/boutique -o credentials=/root/.smb-boutique,uid=malik,gid=boutique\n```',
        },
        {
          id: 'c12-05-03', type: 'qcm', niveau: 2, ref: '§12.4.9',
          enonce: 'Pourquoi éviter `mount -t cifs … -o username=malik,password=Biere2026` ?',
          choix: [
            'Le mot de passe apparaît dans la ligne de commande (ps, historique du shell)',
            'CIFS refuse les mots de passe',
            'C’est plus lent',
            'Les options ne sont pas lues dans cet ordre',
          ],
          reponse: 0,
          indices: ['Qui peut voir la ligne de commande d’un processus ?', 'Et l’historique ?', 'Un fichier en 600 est mieux.'],
          solution: 'La ligne de commande est visible dans `ps` par tous les utilisateurs, et reste dans l’historique du shell. Un fichier `credentials` en 600 évite les deux.',
        },
        {
          id: 'c12-05-04', type: 'trous', niveau: 2, ref: '§12.4.9',
          enonce: 'Complète la ligne fstab : attendre le réseau, et ne pas bloquer le démarrage si cuve est éteinte.',
          texte: '//cuve/boutique  /mnt/boutique  [[1]]  credentials=/root/.smb-boutique,[[2]],[[3]]  0  0',
          trous: [
            { accepte: ['cifs'], exemple: 'cifs' },
            { accepte: ['_netdev', 'nofail'], exemple: '_netdev' },
            { accepte: ['nofail', '_netdev'], exemple: 'nofail' },
          ],
          indices: ['Le type de système de fichiers SMB.', 'Une option dit « c’est un périphérique réseau ».', 'L’autre évite le mode d’urgence (Lab 03).'],
          solution: '```\n//cuve/boutique  /mnt/boutique  cifs  credentials=/root/.smb-boutique,_netdev,nofail  0  0\n```',
        },
        {
          id: 'c12-05-05', type: 'vrai-faux', niveau: 2, ref: '§12.4.9',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Le paquet cifs-utils fournit mount.cifs.', vrai: true },
            { texte: 'smbclient permet de transférer des fichiers sans monter le partage.', vrai: true },
            { texte: 'Le fichier d’identifiants peut être lisible par tous.', vrai: false, explication: 'Il contient un mot de passe : 600.' },
            { texte: 'x-systemd.automount monte le partage à la première utilisation.', vrai: true },
          ],
          indices: ['mount.cifs est un programme d’aide.', 'Une seule fausse.', 'Un mot de passe se protège.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '12.6',
      titre: 'NFS, stockage dans le nuage et état des lieux',
      sections: '§12.6 à 12.8', pages: '332–334',
      objectif: 'Exporter un répertoire en NFS et le monter de façon persistante.',
      rappel: `
        ### Serveur NFS

        Paquets \`nfs-kernel-server\` (Debian) ou \`nfs-utils\` (Rocky, service \`nfs-server\`). Les partages se déclarent
        dans **\`/etc/exports\`** (ou \`/etc/exports.d/*.exports\`) :

        \`\`\`
        /srv/partages/commun   192.168.50.0/24(rw,sync,root_squash)
        /srv/archives          192.168.50.10(ro,sync)
        \`\`\`

        **Pas d’espace** entre l’adresse et la parenthèse : \`192.168.50.0/24 (rw)\` signifierait « lecture seule pour ce
        réseau, lecture-écriture pour **tout le monde** ».

        \`\`\`
        # exportfs -ra          # (re)charger /etc/exports
        # exportfs -v           # exports actifs et leurs options
        $ showmount -e cuve     # vu du client (NFSv3)
        \`\`\`

        - \`root_squash\` (défaut) : root sur le client devient \`nobody\` sur le serveur. \`no_root_squash\` est dangereux.
        - Les droits se basent sur les **UID/GID numériques** : un même utilisateur doit avoir le même UID sur client et
          serveur (ou utiliser NFSv4 avec idmap/Kerberos).

        ### Client NFS

        \`\`\`
        # mount -t nfs cuve:/srv/partages/commun /mnt/commun
        # /etc/fstab :
        cuve:/srv/partages/commun  /mnt/commun  nfs  defaults,_netdev,nofail  0  0
        \`\`\`

        Paquet client : \`nfs-common\` (Debian), \`nfs-utils\` (Rocky). Rocky : \`firewall-cmd --permanent --add-service=nfs\`.

        ### Le nuage

        Stockage objet (S3 et compatibles), Nextcloud, partages « cloud » : accessibles par des outils comme **rclone**
        (qui sait aussi monter un stockage objet). Pratiques pour l’externalisation des sauvegardes, à condition de
        **chiffrer** avant d’envoyer.

        Bilan du livre : aucune solution n’est parfaite. NFS est simple et rapide entre Unix de confiance, Samba
        incontournable avec Windows, SSHFS pratique et sûr pour un accès ponctuel.
      `,
      aRetenir: [
        '/etc/exports : `répertoire  client(options)` sans espace avant la parenthèse.',
        'rw/ro, sync, root_squash (défaut) ; `exportfs -ra`, `exportfs -v`, `showmount -e`.',
        'Droits par UID/GID numériques : mêmes UID partout.',
        'Client : `mount -t nfs serveur:/rép point` ; fstab `_netdev,nofail`.',
      ],
      exercices: [
        {
          id: 'c12-06-01', type: 'trous', niveau: 2, ref: '§12.6',
          enonce: 'Dans `/etc/exports`, partage `/srv/partages/commun` en **lecture-écriture** pour le réseau `192.168.50.0/24`, écritures synchrones.',
          texte: '/srv/partages/commun   [[1]]([[2]],sync)',
          trous: [
            { accepte: ['192\\.168\\.50\\.0/24', '192\\.168\\.50\\.0/255\\.255\\.255\\.0'], exemple: '192.168.50.0/24' },
            { accepte: ['rw'], exemple: 'rw' },
          ],
          indices: ['Le client autorisé : le réseau, en CIDR.', 'Lecture-écriture en deux lettres.', 'Pas d’espace avant la parenthèse.'],
          solution: '```\n/srv/partages/commun   192.168.50.0/24(rw,sync)\n```\nPuis `exportfs -ra`.',
        },
        {
          id: 'c12-06-02', type: 'commande', niveau: 1, ref: '§12.6',
          enonce: 'Recharge tous les partages déclarés dans `/etc/exports`.',
          accepte: ['(sudo )?exportfs -ra', '(sudo )?exportfs -ar', '(sudo )?exportfs -r -a', '(sudo )?exportfs -arv', '(sudo )?exportfs -rav'],
          exemple: 'exportfs -ra',
          indices: ['L’outil des exports NFS.', '-r réexporter, -a tous.', '`exportfs -ra`'],
          solution: '```\n# exportfs -ra\n# exportfs -v\n```',
        },
        {
          id: 'c12-06-03', type: 'commande', niveau: 1, ref: '§12.6, p. 332',
          enonce: 'Monte le partage NFS `cuve:/srv/partages/commun` sur `/mnt/commun`.',
          accepte: ['(sudo )?mount -t nfs4? cuve:/srv/partages/commun/? /mnt/commun/?', '(sudo )?mount cuve:/srv/partages/commun/? /mnt/commun/?'],
          exemple: 'mount -t nfs cuve:/srv/partages/commun /mnt/commun',
          indices: ['Type nfs.', 'Source au format serveur:chemin.', '`mount -t nfs cuve:/… /mnt/commun`'],
          solution: '```\n# mount -t nfs cuve:/srv/partages/commun /mnt/commun\n```',
        },
        {
          id: 'c12-06-04', type: 'qcm', niveau: 3, ref: '§12.6',
          enonce: 'Que signifie la ligne `/srv/archives  192.168.50.10 (rw)` (avec une espace avant la parenthèse) ?',
          choix: [
            '192.168.50.10 en lecture seule (options par défaut), et TOUT LE MONDE en lecture-écriture',
            '192.168.50.10 en lecture-écriture',
            'Une erreur de syntaxe refusée par exportfs',
            'Personne n’a accès',
          ],
          reponse: 0,
          indices: ['L’espace sépare deux clients.', 'Un client sans adresse = tout le monde.', 'Piège célèbre de NFS.'],
          solution: 'L’espace crée deux entrées : `192.168.50.10` avec les options par défaut (ro), et `(rw)` pour **n’importe quel client**. exportfs l’accepte, avec un simple avertissement. Toujours coller la parenthèse.',
        },
        {
          id: 'c12-06-05', type: 'qcm', niveau: 2, ref: '§12.6',
          enonce: 'Sur comptoir, `lea` (UID 1004) crée un fichier dans le partage NFS de cuve. Sur cuve, `ls -l` l’attribue à `yanis`. Pourquoi ?',
          choix: [
            'NFS transmet les UID numériques : sur cuve, l’UID 1004 est celui de yanis',
            'NFS change les propriétaires au hasard',
            'root_squash a transformé lea en yanis',
            'Le fichier a été créé par yanis',
          ],
          reponse: 0,
          indices: ['Ce qui voyage, c’est un nombre.', 'Les comptes n’ont pas été créés dans le même ordre.', 'Même UID partout.'],
          solution: 'NFS (v3, ou v4 sans idmap) transmet l’UID 1004. Sur cuve, 1004 est yanis. Il faut des UID identiques sur toutes les machines (création avec `-u`, annuaire LDAP/FreeIPA) ou NFSv4 avec idmap.',
        },
        {
          id: 'c12-06-06', type: 'vrai-faux', niveau: 2, ref: '§12.6–12.7',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Avec root_squash, root sur le client devient nobody sur le serveur.', vrai: true },
            { texte: '`no_root_squash` est recommandé pour simplifier.', vrai: false, explication: 'Il donne à root de chaque client les pleins pouvoirs sur le partage.' },
            { texte: '`showmount -e cuve` liste les exports de cuve.', vrai: true },
            { texte: 'Il vaut mieux chiffrer une sauvegarde avant de l’envoyer dans le nuage.', vrai: true },
          ],
          indices: ['squash = écraser.', 'Une seule fausse.', 'Le nuage est l’ordinateur de quelqu’un d’autre.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'rsync src vs src/ ?', r: 'src : copie le répertoire ; src/ : copie son contenu.' },
    { q: 'Options rsync de base ?', r: '`-a` archive, `-n` simulation, `-v` détail, `-z` compression, `-P` progression.' },
    { q: 'Miroir exact avec rsync ?', r: '`rsync -a --delete src/ dst/` (simuler avec -n avant).' },
    { q: 'Exclure les .tmp ?', r: "`--exclude='*.tmp'` (ou --exclude-from=fichier)." },
    { q: 'Pourquoi un miroir n’est pas une sauvegarde suffisante ?', r: 'Une suppression est recopiée ; il faut un historique (--link-dest, restic, borg).' },
    { q: 'NFS, Samba, SSHFS : quand ?', r: 'NFS entre Linux ; Samba avec Windows ; SSHFS accès ponctuel chiffré.' },
    { q: 'Monter / démonter avec SSHFS ?', r: '`sshfs user@hôte:rép point` ; `fusermount3 -u point`.' },
    { q: 'Partage Samba réservé à un groupe ?', r: '[partage] path = … ; valid users = @groupe ; read only = no.' },
    { q: 'Mot de passe Samba ?', r: '`smbpasswd -a user` (distinct du mot de passe Unix) ; -d désactive.' },
    { q: 'Vérifier smb.conf ?', r: '`testparm`.' },
    { q: 'Lister les partages SMB ?', r: '`smbclient -L //hôte -U user`.' },
    { q: 'Monter du CIFS proprement ?', r: '`mount -t cifs //h/p point -o credentials=fichier(600),uid=,gid=` ; fstab `_netdev,nofail`.' },
    { q: 'Syntaxe /etc/exports ?', r: '`/rép  client(rw,sync)` sans espace avant la parenthèse.' },
    { q: 'Recharger les exports NFS ?', r: '`exportfs -ra` ; `exportfs -v` ; client : `showmount -e serveur`.' },
    { q: 'root_squash ?', r: 'Root du client devient nobody sur le serveur (défaut, à garder).' },
    { q: 'Problème d’UID avec NFS ?', r: 'NFS transmet des UID numériques : mêmes UID sur toutes les machines.' },
  ],
  memo: `
    ### rsync
    \`\`\`
    rsync -a src hôte:dst/        (crée dst/src)     rsync -a src/ hôte:dst/      (contenu de src dans dst)
    rsync -nva …   rsync -a --delete src/ dst/   --exclude='*.tmp'   --exclude-from=f   -c   -z   -P   --bwlimit=5M
    rsync -a -e "ssh -i ~/.ssh/cle" src/ user@hôte:dst/      rsync -a hôte:src/ ./dst/
    \`\`\`

    ### SSHFS
    \`\`\`
    sshfs user@hôte:/rép ~/point     fusermount3 -u ~/point
    \`\`\`

    ### Samba
    \`\`\`
    /etc/samba/smb.conf : [global] workgroup= · server min protocol = SMB3 · hosts allow = …
                          [partage] path= · valid users = @groupe · read only = no · create mask = 0660 · directory mask = 2770
    testparm   smbpasswd -a|-d|-e|-x user   pdbedit -L   systemctl enable --now smbd (Debian) / smb (Rocky)
    smbclient -L //hôte -U user   smbclient //hôte/partage -U user
    mount -t cifs //hôte/partage /mnt/p -o credentials=/root/.smb-p,uid=…,gid=…
    fstab : //hôte/partage /mnt/p cifs credentials=…,_netdev,nofail 0 0
    \`\`\`

    ### NFS
    \`\`\`
    /etc/exports : /rép 192.168.50.0/24(rw,sync,root_squash)     (pas d'espace avant la parenthèse !)
    exportfs -ra   exportfs -v   showmount -e serveur   systemctl enable --now nfs-server
    mount -t nfs serveur:/rép /mnt/p     fstab : serveur:/rép /mnt/p nfs defaults,_netdev,nofail 0 0
    \`\`\`
  `,
});
