/* Module A8 (hors livre) : exploiter en production, durcissement, sauvegardes, supervision, incidents. */
HLW.chapitre({
  id: 'A8',
  intro: `
    Savoir configurer un système ne suffit pas : il faut qu’il **reste** sûr, qu’on puisse le **restaurer**,
    qu’on soit **prévenu** quand il va mal, et qu’on sache **réagir** quand il tombe. Ce module rassemble les
    pratiques d’exploitation qui font la différence entre « ça marche sur ma VM » et un service de production :
    durcissement de l’hôte et des services, sauvegardes testées, supervision, et gestion d’incident.

    Il prépare directement le **Lab 13**, l’incident final de la brasserie, qui se conclut par un rapport
    d’incident.
  `,
  objectifs: [
    'réduire la surface d’attaque d’un hôte (services, ports, comptes, mises à jour, paramètres du noyau) ;',
    'durcir un service systemd et mesurer le résultat avec systemd-analyze security ;',
    'concevoir et tester des sauvegardes (3-2-1, RPO, RTO) avec un outil comme restic ;',
    'savoir quoi superviser et déclencher une alerte quand un service échoue ;',
    'mener un incident avec méthode et rédiger un rapport sans recherche de coupable.',
  ],
  certifs: { lpic1: ['110.1', '110.2'], lfcs: ['OD'], rhcsa: ['R10'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: 'A8.1',
      titre: 'Durcir un hôte',
      objectif: 'Réduire ce qui est exposé, et le vérifier régulièrement.',
      rappel: `
        Principe : **moins il y a de choses qui tournent et qui écoutent, moins il y a de choses à attaquer**.

        | Domaine | Vérifier | Agir |
        |---|---|---|
        | services | \`systemctl list-unit-files --state=enabled\` | \`systemctl disable --now\` ce qui ne sert pas |
        | ports | \`ss -ltnup\` | fermer le service ou filtrer (module A2) |
        | paquets | \`apt list --installed\`, \`rpm -qa\` | retirer l’inutile, mises à jour de sécurité automatiques (A1) |
        | comptes | \`awk -F: '$3>=1000' /etc/passwd\`, \`lastlog\`, \`sudo -l -U nom\` | verrouiller les comptes inutiles, sudo nominatif |
        | SSH | \`sshd -T\` | clés seulement, pas de root, AllowGroups (fiche 10.4) |
        | fichiers | \`find / -xdev -perm -4000 -type f\` (setuid), \`find / -xdev -perm -0002 -type f\` | retirer ce qui n’a pas lieu d’être |
        | noyau | \`sysctl -a\` | paramètres réseau prudents dans \`/etc/sysctl.d/\` |
        | MAC | \`getenforce\`, \`aa-status\` | SELinux enforcing, AppArmor actif (A3) |

        Quelques paramètres du noyau courants :

        \`\`\`
        # /etc/sysctl.d/80-durcissement.conf
        net.ipv4.conf.all.accept_redirects = 0
        net.ipv4.conf.all.send_redirects = 0
        net.ipv4.conf.all.rp_filter = 1
        net.ipv4.tcp_syncookies = 1
        kernel.dmesg_restrict = 1
        $ sudo sysctl --system
        \`\`\`

        ### Traçabilité

        **auditd** enregistre des événements choisis (qui a modifié tel fichier, qui a utilisé sudo) :

        \`\`\`
        $ sudo auditctl -w /etc/sudoers -p wa -k sudoers     # surveiller écriture et attributs
        $ sudo ausearch -k sudoers -i                         # retrouver les événements
        # règles permanentes : /etc/audit/rules.d/*.rules, puis augenrules --load
        \`\`\`

        **lynis** (\`lynis audit system\`) passe en revue des centaines de points et propose des pistes,
        à trier selon le contexte. Les référentiels de l’**ANSSI** (guide de configuration GNU/Linux) et du
        **CIS** servent de base dans beaucoup d’entreprises.
      `,
      aRetenir: [
        'Inventorier puis réduire : services (`list-unit-files --state=enabled`), ports (`ss -ltnup`), paquets, comptes.',
        'setuid : `find / -xdev -perm -4000 -type f` ; SSH : `sshd -T`.',
        '/etc/sysctl.d/ + `sysctl --system` ; SELinux/AppArmor actifs.',
        'auditd (`auditctl -w … -k`, `ausearch -k`), lynis, référentiels ANSSI et CIS.',
      ],
      exercices: [
        {
          id: 'cA8-01-01', type: 'commande', niveau: 1,
          enonce: 'Liste les ports TCP et UDP en écoute, avec le processus de chacun, en adresses numériques.',
          accepte: ['(sudo )?ss -ltnup', '(sudo )?ss -tulnp', '(sudo )?ss -lntup', '(sudo )?ss -tunlp', '(sudo )?ss -lnptu', '(sudo )?ss -plnut', '(sudo )?ss -tlunp', '(sudo )?ss -ltunp'],
          exemple: 'ss -ltnup',
          indices: ['ss.', 'l écoute, t TCP, u UDP, n numérique, p processus.', 'L’ordre des lettres n’importe pas.'],
          solution: '```\n$ sudo ss -ltnup\n```\nChaque ligne doit avoir une raison d’être.',
        },
        {
          id: 'cA8-01-02', type: 'commande', niveau: 2,
          enonce: 'Liste les fichiers **setuid** du système de fichiers racine (sans descendre dans les autres systèmes de fichiers).',
          accepte: ['(sudo )?find / -xdev -perm -4000 -type f( -ls| -print)?( 2>/dev/null)?', '(sudo )?find / -xdev -type f -perm -4000( -ls)?( 2>/dev/null)?', '(sudo )?find / -xdev -perm -u=s -type f( -ls)?( 2>/dev/null)?', '(sudo )?find / -xdev -type f -perm -u=s( -ls)?( 2>/dev/null)?', '(sudo )?find / -xdev -perm /4000 -type f( -ls)?( 2>/dev/null)?'],
          exemple: 'find / -xdev -perm -4000 -type f',
          indices: ['find avec un test de permissions.', 'Le bit setuid vaut 4000.', '-xdev pour rester sur le même système de fichiers.'],
          solution: '```\n$ sudo find / -xdev -perm -4000 -type f\n/usr/bin/passwd\n/usr/bin/sudo\n…\n```\nUn setuid inattendu (dans /home, /tmp, un vieux binaire) mérite une enquête.',
        },
        {
          id: 'cA8-01-03', type: 'commande', niveau: 2,
          enonce: 'Ajoute (temporairement) une règle auditd qui surveille les écritures et changements d’attributs sur `/etc/sudoers`, avec la clé `sudoers`.',
          accepte: ['(sudo )?auditctl -w /etc/sudoers -p wa -k sudoers', '(sudo )?auditctl -w /etc/sudoers -k sudoers -p wa', '(sudo )?auditctl -p wa -w /etc/sudoers -k sudoers'],
          exemple: 'auditctl -w /etc/sudoers -p wa -k sudoers',
          indices: ['auditctl.', '-w fichier, -p permissions surveillées, -k clé.', 'w = écriture, a = attributs.'],
          solution: '```\n$ sudo auditctl -w /etc/sudoers -p wa -k sudoers\n$ sudo ausearch -k sudoers -i\n```\nPermanent : la même règle (sans « auditctl ») dans /etc/audit/rules.d/sudoers.rules, puis `augenrules --load`.',
        },
        {
          id: 'cA8-01-04', type: 'qcm', niveau: 2,
          enonce: 'Sur fut, `systemctl list-unit-files --state=enabled` montre `cups.service` et `avahi-daemon.service`. fut est un serveur sans imprimante. Que faire ?',
          choix: ['`systemctl disable --now cups avahi-daemon` (et éventuellement retirer les paquets)', 'Les laisser : ils ne consomment presque rien', 'Bloquer seulement leurs ports au pare-feu', 'Changer leurs ports par défaut'],
          reponse: 0,
          indices: ['Un service inutile est une surface d’attaque.', 'Le pare-feu est une seconde ligne, pas la première.', 'Le plus simple : ne pas le faire tourner.'],
          solution: 'Ce qui ne sert pas ne doit pas tourner : `systemctl disable --now`, voire `dnf remove`. Le pare-feu reste utile en défense en profondeur, mais un service arrêté n’a plus de faille exploitable.',
        },
        {
          id: 'cA8-01-05', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`sysctl --system` recharge les paramètres de /etc/sysctl.d/.', vrai: true },
            { texte: 'Une recommandation de lynis doit toujours être appliquée sans réfléchir.', vrai: false, explication: 'Chaque point se juge selon le rôle de la machine.' },
            { texte: '`sshd -T` affiche la configuration effective de sshd.', vrai: true },
            { texte: 'auditd peut enregistrer qui a modifié un fichier sensible.', vrai: true },
          ],
          indices: ['sysctl.d.', 'Une seule fausse.', '-T = test étendu.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A8.2',
      titre: 'Durcir un service systemd',
      objectif: 'Confiner un service avec quelques lignes dans son unité, et mesurer le gain.',
      rappel: `
        systemd sait enfermer un service sans conteneur. On mesure d’abord :

        \`\`\`
        $ systemd-analyze security                     # toutes les unités, score d'exposition 0 (bien) à 10
        $ systemd-analyze security vitrine.service     # le détail, directive par directive
        \`\`\`

        Puis on ajoute des directives dans une **surcharge** (\`systemctl edit vitrine\`) :

        \`\`\`
        [Service]
        User=vitrine                          # ou DynamicUser=yes : compte créé à la volée
        NoNewPrivileges=yes                   # plus d'élévation (setuid, capacités de fichiers)
        ProtectSystem=strict                  # tout le système en lecture seule…
        ReadWritePaths=/var/lib/vitrine       # …sauf ici
        ProtectHome=yes                       # /home, /root invisibles
        PrivateTmp=yes                        # /tmp privé
        PrivateDevices=yes                    # /dev minimal
        CapabilityBoundingSet=CAP_NET_BIND_SERVICE
        AmbientCapabilities=CAP_NET_BIND_SERVICE    # écouter sur 80 sans root (A4.6)
        RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
        SystemCallFilter=@system-service      # liste d'appels système d'un service ordinaire
        ProtectKernelTunables=yes
        ProtectControlGroups=yes
        MemoryMax=256M                        # et une limite de ressources
        \`\`\`

        \`\`\`
        $ sudo systemctl daemon-reload && sudo systemctl restart vitrine
        $ systemd-analyze security vitrine.service | tail -1     # → Overall exposure level: 2.1 OK
        $ journalctl -u vitrine -n 30                             # le service fonctionne-t-il encore ?
        \`\`\`

        On ajoute les directives **une par une** (ou par petits groupes) en testant : une directive trop
        stricte se manifeste par un « Permission denied » ou un « Read-only file system » dans le journal.
        \`ReadWritePaths=\` ou \`StateDirectory=vitrine\` (qui crée \`/var/lib/vitrine\` avec les bons droits)
        règlent la plupart des cas.
      `,
      aRetenir: [
        '`systemd-analyze security [unité]` : score 0 (confiné) à 10 (exposé).',
        'NoNewPrivileges, ProtectSystem=strict + ReadWritePaths, ProtectHome, PrivateTmp, PrivateDevices.',
        'CapabilityBoundingSet / AmbientCapabilities, RestrictAddressFamilies, SystemCallFilter=@system-service.',
        'Une directive à la fois, en lisant le journal ; StateDirectory=, DynamicUser=.',
      ],
      exercices: [
        {
          id: 'cA8-02-01', type: 'commande', niveau: 1,
          enonce: 'Affiche l’évaluation de sécurité détaillée de `vitrine.service`.',
          accepte: ['systemd-analyze security vitrine(\\.service)?', '(sudo )?systemd-analyze security vitrine(\\.service)?'],
          exemple: 'systemd-analyze security vitrine.service',
          indices: ['systemd-analyze.', 'Sous-commande security.', 'Puis l’unité.'],
          solution: '```\n$ systemd-analyze security vitrine.service\n  NAME                 DESCRIPTION                              EXPOSURE\n✗ PrivateTmp=          Service has access to other software\'s…   0.2\n…\n→ Overall exposure level for vitrine.service: 9.2 UNSAFE\n```',
        },
        {
          id: 'cA8-02-02', type: 'association', niveau: 2,
          enonce: 'Associe chaque directive à son effet.',
          paires: [['ProtectSystem=strict', 'Tout le système de fichiers en lecture seule pour le service'], ['ReadWritePaths=/var/lib/vitrine', 'Exception en écriture'], ['PrivateTmp=yes', '/tmp propre au service'], ['NoNewPrivileges=yes', 'Interdit toute élévation de privilèges'], ['RestrictAddressFamilies=AF_INET AF_INET6', 'Seulement des sockets IPv4 et IPv6']],
          indices: ['Protect = protéger.', 'ReadWrite = exception.', 'NoNewPrivileges = pas de setuid.'],
          solution: 'strict : lecture seule ; ReadWritePaths : exception ; PrivateTmp : /tmp privé ; NoNewPrivileges : pas d’élévation ; RestrictAddressFamilies : familles de sockets.',
        },
        {
          id: 'cA8-02-03', type: 'qcm', niveau: 2,
          enonce: 'Après avoir ajouté `ProtectSystem=strict`, la vitrine démarre puis s’arrête ; le journal dit `OSError: [Errno 30] Read-only file system: \'/var/lib/vitrine/visites.log\'`. Quelle correction ?',
          choix: ['Ajouter ReadWritePaths=/var/lib/vitrine (ou StateDirectory=vitrine)', 'Retirer ProtectSystem=strict', 'Lancer la vitrine en root', 'Ajouter PrivateTmp=yes'],
          reponse: 0,
          indices: ['strict met tout en lecture seule.', 'Il faut une exception pour les données.', 'La correction la plus étroite.'],
          solution: '`ReadWritePaths=/var/lib/vitrine` ouvre seulement ce répertoire. `StateDirectory=vitrine` fait mieux encore : systemd crée /var/lib/vitrine, lui donne le bon propriétaire et l’ouvre en écriture.',
        },
        {
          id: 'cA8-02-04', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un score d’exposition de 9,2 indique un service peu confiné.', vrai: true },
            { texte: 'DynamicUser=yes crée un compte temporaire pour le service.', vrai: true },
            { texte: 'Il vaut mieux ajouter toutes les directives d’un coup sans tester.', vrai: false },
            { texte: 'Ces directives se placent de préférence dans une surcharge (systemctl edit).', vrai: true },
          ],
          indices: ['0 = bien, 10 = exposé.', 'Une seule fausse.', 'Fiche 6.3 sur les surcharges.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
        {
          id: 'cA8-02-05', type: 'terminal', niveau: 2,
          enonce: 'Reprends la vitrine du Lab 04 (`vitrine.service`). Note son score avec `systemd-analyze security`, ajoute par une surcharge NoNewPrivileges, ProtectSystem=strict, ProtectHome, PrivateTmp, PrivateDevices et RestrictAddressFamilies, redémarre, vérifie que la page répond, puis colle la dernière ligne de `systemd-analyze security vitrine.service`.',
          attendu: ['Overall exposure level'],
          indices: ['`sudo systemctl edit vitrine`.', 'Teste `curl http://127.0.0.1:8080/` après chaque changement.', 'Lis `journalctl -u vitrine` si elle ne démarre plus.'],
          solution: 'Le score passe d’environ 9 (UNSAFE) à 5 ou moins (MEDIUM/OK) avec ces seules directives. La vitrine n’écrit rien sur disque : ProtectSystem=strict ne la gêne pas.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A8.3',
      titre: 'Sauvegardes : concevoir, automatiser, restaurer',
      objectif: 'Avoir des sauvegardes dont on sait qu’elles se restaurent.',
      rappel: `
        ### Les questions à se poser

        - **RPO** (*recovery point objective*) : combien de données peut-on perdre ? (une sauvegarde par nuit =
          jusqu’à 24 h perdues).
        - **RTO** (*recovery time objective*) : en combien de temps doit-on être reparti ?
        - **Règle 3-2-1** : **3** copies, sur **2** supports différents, dont **1** hors site (et idéalement une
          copie **hors ligne** ou **immuable**, hors de portée d’un rançongiciel).
        - Le RAID, les instantanés et la réplication **ne sont pas** des sauvegardes : une suppression s’y
          propage.

        ### restic, un exemple d’outil moderne

        Sauvegardes **chiffrées**, **dédupliquées** et **incrémentales** (paquet \`restic\` ; EPEL sur Rocky) :

        \`\`\`
        $ export RESTIC_REPOSITORY=sftp:sauvegarde@douane:/srv/restic   # ou un disque, un stockage objet
        $ export RESTIC_PASSWORD_FILE=/root/.restic-mdp                  # chmod 600
        $ restic init
        $ restic backup /srv/boutique /etc --exclude '*.tmp'
        $ restic snapshots
        $ restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune    # rétention
        $ restic check
        $ restic restore latest --target /tmp/restauration --include /srv/boutique/commandes.db
        \`\`\`

        ### Cohérence

        Copier les fichiers d’une base de données **en cours d’écriture** donne une sauvegarde inutilisable.
        Solutions : un export (\`pg_dump\`, \`mariadb-dump\`, \`sqlite3 base.db ".backup copie.db"\`) avant la
        sauvegarde, ou un **instantané LVM** (A5.2) sauvegardé ensuite.

        ### Le test qui compte

        **Une sauvegarde qui n’a jamais été restaurée n’existe pas.** On planifie des restaurations d’essai
        (un fichier chaque semaine, une machine complète chaque trimestre), on mesure leur durée (RTO réel), et on
        **supervise** les sauvegardes : âge de la dernière réussie, taille, erreurs.
      `,
      aRetenir: [
        'RPO (données perdues acceptables), RTO (durée d’interruption acceptable).',
        '3-2-1 (+ une copie hors ligne/immuable) ; RAID, instantanés, réplication ≠ sauvegarde.',
        'restic : init, backup, snapshots, forget --keep-… --prune, check, restore.',
        'Cohérence : export de base ou instantané ; tester les restaurations et superviser les sauvegardes.',
      ],
      exercices: [
        {
          id: 'cA8-03-01', type: 'association', niveau: 1,
          enonce: 'Associe chaque notion à sa définition.',
          paires: [['RPO', 'Quantité de données qu’on accepte de perdre'], ['RTO', 'Durée d’interruption acceptable'], ['3-2-1', 'Trois copies, deux supports, une hors site'], ['Rétention', 'Combien de temps et combien de versions on garde']],
          indices: ['Point = moment des données.', 'Time = temps de reprise.', 'Rétention = conservation.'],
          solution: 'RPO : données perdues ; RTO : temps de reprise ; 3-2-1 : répartition des copies ; rétention : conservation.',
        },
        {
          id: 'cA8-03-02', type: 'commande', niveau: 2,
          enonce: 'Avec restic (dépôt et mot de passe déjà dans les variables d’environnement), sauvegarde `/srv/boutique` et `/etc`.',
          accepte: ['restic backup /srv/boutique /etc', 'restic backup /etc /srv/boutique', 'restic -r \\S+ backup /srv/boutique /etc', 'restic backup /srv/boutique/? /etc/?( --\\S+)*'],
          exemple: 'restic backup /srv/boutique /etc',
          indices: ['restic + sous-commande.', 'backup.', 'Puis les chemins.'],
          solution: '```\n$ restic backup /srv/boutique /etc\nsnapshot 4f2a9c1e saved\n```',
        },
        {
          id: 'cA8-03-03', type: 'commande', niveau: 2,
          enonce: 'Applique la rétention : garder 7 sauvegardes quotidiennes, 4 hebdomadaires et 6 mensuelles, et libérer la place.',
          accepte: ['restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune', 'restic forget --prune --keep-daily 7 --keep-weekly 4 --keep-monthly 6', 'restic forget --keep-daily=7 --keep-weekly=4 --keep-monthly=6 --prune', 'restic forget -d 7 -w 4 -m 6 --prune'],
          exemple: 'restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune',
          indices: ['restic forget.', 'Options --keep-daily, --keep-weekly, --keep-monthly.', '--prune supprime réellement les données.'],
          solution: '```\n$ restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune\n```',
        },
        {
          id: 'cA8-03-04', type: 'qcm', niveau: 2,
          enonce: 'La boutique utilise une base SQLite `/srv/boutique/commandes.db`, écrite en permanence. Comment la sauvegarder de façon cohérente ?',
          choix: [
            'Faire d’abord une copie cohérente (sqlite3 commandes.db ".backup /srv/export/commandes.db") ou un instantané LVM, puis sauvegarder cette copie',
            'Copier le fichier avec cp pendant que la boutique tourne',
            'Compter sur le RAID 1',
            'Arrêter la machine chaque nuit',
          ],
          reponse: 0,
          indices: ['Un fichier en cours d’écriture peut être copié à moitié modifié.', 'Les bases savent produire une copie cohérente.', 'Un instantané fige aussi un état.'],
          solution: 'L’export par l’outil de la base (ou un instantané LVM) donne un état cohérent ; c’est cet état qu’on sauvegarde. Le RAID n’est pas une sauvegarde.',
        },
        {
          id: 'cA8-03-05', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un instantané LVM sur le même disque protège contre la panne de ce disque.', vrai: false },
            { texte: 'Une sauvegarde jamais restaurée doit être considérée comme incertaine.', vrai: true },
            { texte: 'restic chiffre les sauvegardes et déduplique les données.', vrai: true },
            { texte: 'Une copie hors ligne protège contre un rançongiciel qui chiffrerait le serveur et son dépôt de sauvegarde accessible.', vrai: true },
          ],
          indices: ['Même disque, même sort.', 'Une seule fausse.', 'Hors ligne = inaccessible au logiciel malveillant.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A8.4',
      titre: 'Supervision et alertes',
      objectif: 'Être prévenu avant les utilisateurs.',
      rappel: `
        ### Quoi surveiller

        | Catégorie | Exemples |
        |---|---|
        | disponibilité | le site répond-il (code HTTP, temps de réponse) ? les services sont-ils actifs ? |
        | ressources | disque (espace **et** inodes), mémoire, charge, PSI (A6.1) |
        | sauvegardes | âge de la dernière réussie |
        | sécurité | mises à jour en attente, connexions refusées, certificats TLS qui expirent |
        | journaux | erreurs nouvelles, \`systemctl --failed\` |

        On alerte sur ce qui demande une **action humaine** (le disque sera plein dans 4 heures), pas sur chaque
        pic de charge : trop d’alertes et plus personne ne les lit.

        ### Une alerte simple avec systemd

        \`\`\`
        # /etc/systemd/system/alerte@.service
        [Unit]
        Description=Alerte pour %i

        [Service]
        Type=oneshot
        ExecStart=/usr/local/bin/alerter %i         # envoie un message (courriel, messagerie d'équipe…)
        \`\`\`

        \`\`\`
        # dans l'unité à surveiller (surcharge)
        [Unit]
        OnFailure=alerte@%n.service
        \`\`\`

        Et des vérifications périodiques : un timer qui lance un script de contrôle (espace disque, âge de la
        sauvegarde) qui **échoue** si quelque chose ne va pas, et donc déclenche \`OnFailure=\`.

        \`\`\`
        $ systemctl --failed
        $ df -h ; df -i                         # espace et inodes
        $ openssl x509 -enddate -noout -in /etc/ssl/certs/vitrine.pem
        \`\`\`

        ### À plus grande échelle

        - **Métriques** : un agent par machine (\`prometheus-node-exporter\`) et un serveur **Prometheus** qui les
          collecte, **Grafana** pour les tableaux de bord, **Alertmanager** pour les alertes ; ou Zabbix,
          Netdata, etc.
        - **Journaux centralisés** : rsyslog vers un serveur, \`systemd-journal-remote\`, ou une pile dédiée :
          les journaux d’une machine compromise ou morte restent consultables ailleurs.
      `,
      aRetenir: [
        'Surveiller disponibilité, ressources (df -h ET df -i), sauvegardes, sécurité, journaux.',
        'Alerter sur ce qui demande une action.',
        '`OnFailure=alerte@%n.service` + timer de vérification qui échoue en cas de problème ; `systemctl --failed`.',
        'Prometheus + node_exporter + Grafana/Alertmanager ; journaux centralisés.',
      ],
      exercices: [
        {
          id: 'cA8-04-01', type: 'commande', niveau: 1,
          enonce: 'Liste les unités systemd en échec.',
          accepte: ['systemctl --failed', 'systemctl list-units --failed', 'systemctl list-units --state=failed', 'systemctl --state=failed'],
          exemple: 'systemctl --failed',
          indices: ['systemctl.', 'Une option filtre les échecs.', '`systemctl --failed`'],
          solution: '```\n$ systemctl --failed\n  UNIT                  LOAD   ACTIVE SUB    DESCRIPTION\n● export-ventes.service loaded failed failed Export quotidien des ventes\n```',
        },
        {
          id: 'cA8-04-02', type: 'trous', niveau: 2,
          enonce: 'Complète la surcharge qui déclenche l’unité modèle `alerte@.service` quand `vitrine.service` échoue.',
          texte: '[Unit]\n[[1]]=alerte@[[2]].service',
          trous: [{ accepte: ['OnFailure'], exemple: 'OnFailure' }, { accepte: ['%n', '%N', 'vitrine\\.service', 'vitrine'], exemple: '%n' }],
          indices: ['Une directive « en cas d’échec ».', 'Un spécificateur donne le nom de l’unité.', '%n = nom complet.'],
          solution: '```\n[Unit]\nOnFailure=alerte@%n.service\n```\n%n vaut ici `vitrine.service`, transmis à alerte@ comme instance (%i).',
        },
        {
          id: 'cA8-04-03', type: 'qcm', niveau: 2,
          enonce: '`df -h` montre 40 % d’espace libre sur /var, pourtant la boutique affiche « No space left on device ». Que vérifier ?',
          choix: ['`df -i` : les inodes sont peut-être épuisés (des millions de petits fichiers)', 'La mémoire vive', 'Le pare-feu', 'Le fuseau horaire'],
          reponse: 0,
          indices: ['Un fichier consomme de l’espace ET un inode.', 'Beaucoup de petits fichiers épuisent les inodes.', 'df a une option pour eux.'],
          solution: '`df -i /var` : à 100 %, plus aucun fichier ne peut être créé, quel que soit l’espace libre. Cause typique : des sessions ou des fichiers temporaires jamais nettoyés (fiche 4.12, Lab 02).',
        },
        {
          id: 'cA8-04-04', type: 'commande', niveau: 2,
          enonce: 'Affiche la date d’expiration du certificat `/etc/ssl/certs/vitrine.pem`.',
          accepte: ['openssl x509 -enddate -noout -in /etc/ssl/certs/vitrine\\.pem', 'openssl x509 -noout -enddate -in /etc/ssl/certs/vitrine\\.pem', 'openssl x509 -in /etc/ssl/certs/vitrine\\.pem -noout -enddate', 'openssl x509 -in /etc/ssl/certs/vitrine\\.pem -enddate -noout'],
          exemple: 'openssl x509 -enddate -noout -in /etc/ssl/certs/vitrine.pem',
          indices: ['openssl x509 lit un certificat.', '-enddate pour la date de fin, -noout pour ne pas réafficher le certificat.', '-in fichier.'],
          solution: '```\n$ openssl x509 -enddate -noout -in /etc/ssl/certs/vitrine.pem\nnotAfter=Jan 14 23:59:59 2027 GMT\n```\n`openssl x509 -checkend 1209600 …` échoue si le certificat expire dans moins de 14 jours : parfait pour un timer de vérification.',
        },
        {
          id: 'cA8-04-05', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Il faut alerter sur chaque pic de charge supérieur à 1.', vrai: false, explication: 'Trop d’alertes rendent les alertes inutiles ; on alerte sur ce qui demande une action.' },
            { texte: 'Centraliser les journaux permet de les consulter même si la machine est inaccessible.', vrai: true },
            { texte: 'node_exporter expose les métriques d’une machine pour Prometheus.', vrai: true },
            { texte: 'L’âge de la dernière sauvegarde réussie est un bon indicateur à superviser.', vrai: true },
          ],
          indices: ['Fatigue des alertes.', 'Une seule fausse.', 'Une sauvegarde silencieusement arrêtée est un piège classique.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A8.5',
      titre: 'Gérer un incident et rédiger le rapport',
      objectif: 'Rétablir le service avec méthode, puis apprendre de l’incident.',
      rappel: `
        ### Pendant l’incident

        1. **Constater et qualifier** : qu’est-ce qui ne marche pas, pour qui, depuis quand ? Quel impact ?
        2. **Communiquer** : prévenir (gérante, équipe), annoncer la prochaine information (« point dans 30 min »).
        3. **Noter tout, avec l’heure** : commandes, observations, hypothèses. Cette chronologie servira au
           rapport, et évite de refaire deux fois la même vérification.
        4. **Rétablir d’abord, comprendre ensuite** : redémarrer un service, revenir à la version précédente,
           basculer, si cela rend le service vite. Mais **garder les preuves** (journaux, \`journalctl --since\`,
           copie de fichiers) avant de les effacer.
        5. **Une modification à la fois**, vérifiée, sinon on ne sait plus ce qui a corrigé quoi.
        6. **Méthode par couches** (le fil du livre) : matériel et disque → démarrage et services → réseau →
           application. Lire les journaux avant de deviner.

        ### Après : le rapport d’incident (*postmortem*)

        Un rapport **sans recherche de coupable** : on cherche ce qui a permis l’erreur, pas qui l’a faite.

        | Section | Contenu |
        |---|---|
        | Résumé | quoi, quand, combien de temps, quel impact (en deux ou trois phrases) |
        | Chronologie | heure par heure : détection, actions, rétablissement |
        | Causes | la cause **déclenchante** et les causes **profondes** (pourquoi était-ce possible ? les « 5 pourquoi ») |
        | Ce qui a bien marché, ce qui a manqué | détection, documentation, accès, outils |
        | Actions | correctives et préventives, chacune avec un **responsable** et une **date** |

        La suite logique d’un incident : une **procédure** écrite (*runbook*) pour la prochaine fois, une
        **supervision** qui l’aurait détecté plus tôt, et parfois de l’automatisation (A7).
      `,
      aRetenir: [
        'Qualifier, communiquer, noter tout avec l’heure, rétablir puis comprendre, une modification à la fois.',
        'Garder les preuves (journaux) avant de nettoyer ; méthode par couches.',
        'Rapport sans coupable : résumé, chronologie, causes déclenchante et profondes, bilan, actions datées avec responsable.',
        'Après : runbook, supervision, automatisation.',
      ],
      exercices: [
        {
          id: 'cA8-05-01', type: 'ordre', niveau: 1,
          enonce: 'Remets dans l’ordre les étapes d’une gestion d’incident.',
          elements: ['Constater et qualifier l’impact', 'Prévenir les personnes concernées', 'Rétablir le service (en gardant les preuves)', 'Comprendre les causes', 'Rédiger le rapport et planifier les actions'],
          indices: ['On ne répare pas ce qu’on n’a pas qualifié.', 'On communique tôt.', 'Le rapport vient à la fin.'],
          solution: 'Qualifier → communiquer → rétablir → comprendre → rapport et actions.',
        },
        {
          id: 'cA8-05-02', type: 'qcm', niveau: 2,
          enonce: 'Pendant un incident, la boutique est tombée. Tu as une piste qui peut prendre une heure à confirmer, et redémarrer le service la rétablirait tout de suite. Que fais-tu ?',
          choix: [
            'Sauvegarder les journaux et l’état utiles, redémarrer pour rétablir, puis enquêter sur les preuves conservées',
            'Enquêter d’abord pendant une heure, la boutique peut attendre',
            'Redémarrer toute la machine sans rien garder',
            'Attendre que le problème disparaisse seul',
          ],
          reponse: 0,
          indices: ['Le service passe d’abord.', 'Mais un redémarrage peut effacer des indices.', 'On garde les preuves avant.'],
          solution: 'Rétablir d’abord, mais en conservant ce qui servira à comprendre : `journalctl -u … --since … > fichier`, copie des fichiers de configuration, sortie de `ss`, `ps`, `df`. Puis l’enquête se fait au calme.',
        },
        {
          id: 'cA8-05-03', type: 'association', niveau: 2,
          enonce: 'Associe chaque phrase à la section du rapport d’incident où elle a sa place.',
          paires: [
            ['« 21 h 47 : alerte, la boutique renvoie des erreurs 502. »', 'Chronologie'],
            ['« Le disque /var s’est rempli car la rotation des journaux était désactivée. »', 'Causes'],
            ['« Superviser l’espace disque de /var (Inès, d’ici le 20/11). »', 'Actions'],
            ['« La boutique a été indisponible 1 h 12 un vendredi soir. »', 'Résumé'],
          ],
          indices: ['Une heure précise : chronologie.', 'Un « car » : cause.', 'Un responsable et une date : action.'],
          solution: 'Heure → chronologie ; explication → causes ; responsable et date → actions ; impact global → résumé.',
        },
        {
          id: 'cA8-05-04', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un rapport d’incident sert d’abord à désigner la personne responsable de l’erreur.', vrai: false, explication: 'Il cherche ce qui a rendu l’erreur possible, pour l’empêcher de se reproduire.' },
            { texte: 'Changer plusieurs choses à la fois empêche de savoir ce qui a corrigé le problème.', vrai: true },
            { texte: 'Chaque action d’un rapport devrait avoir un responsable et une date.', vrai: true },
            { texte: 'Noter les commandes avec l’heure pendant l’incident facilite la rédaction de la chronologie.', vrai: true },
          ],
          indices: ['Sans recherche de coupable.', 'Une seule fausse.', 'Une action sans responsable ne se fait pas.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
        {
          id: 'cA8-05-05', type: 'libre', niveau: 2,
          enonce: 'Repense au Lab 06 (le serveur qui rame) ou au Lab 03 (sauvetage du démarrage). Rédige un court rapport d’incident : résumé (3 phrases), chronologie (5 lignes au moins), cause déclenchante, une cause profonde (« pourquoi était-ce possible ? »), et trois actions avec responsable et échéance.',
          indices: ['Le résumé dit l’impact, pas la technique.', 'Une cause profonde porte sur l’organisation ou les outils (pas de supervision, pas de procédure…).', 'Des actions vérifiables.'],
          solution: 'Exemple (Lab 06) : *Résumé* — de 14 h à 15 h 20, la boutique a répondu en plus de 10 s ; des commandes ont été abandonnées. *Cause déclenchante* : un calcul de stocks lancé à la main a saturé le processeur. *Cause profonde* : aucune limite de ressources sur les tâches de fond, et aucune alerte sur le temps de réponse. *Actions* : passer le calcul en service avec CPUQuota (Malik, 15/11) ; superviser le temps de réponse de la boutique (toi, 20/11) ; écrire un runbook « boutique lente » (toi, 30/11).',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Inventaire d’exposition ?', r: '`systemctl list-unit-files --state=enabled`, `ss -ltnup`, paquets, comptes, setuid.' },
    { q: 'Paramètres du noyau permanents ?', r: 'Fichier dans /etc/sysctl.d/, puis `sysctl --system`.' },
    { q: 'Tracer qui modifie un fichier ?', r: '`auditctl -w FICHIER -p wa -k CLÉ` ; `ausearch -k CLÉ -i`.' },
    { q: 'Mesurer le confinement d’un service ?', r: '`systemd-analyze security unité` (0 bien, 10 exposé).' },
    { q: 'Système en lecture seule pour un service ?', r: '`ProtectSystem=strict` + `ReadWritePaths=` ou `StateDirectory=`.' },
    { q: 'RPO / RTO ?', r: 'Données perdues acceptables / durée d’interruption acceptable.' },
    { q: 'Règle 3-2-1 ?', r: '3 copies, 2 supports, 1 hors site (+ une hors ligne).' },
    { q: 'restic en 4 commandes ?', r: '`init`, `backup CHEMINS`, `forget --keep-… --prune`, `restore latest --target D`.' },
    { q: 'Alerte si un service échoue ?', r: '`OnFailure=alerte@%n.service`' },
    { q: '« No space left » avec de l’espace libre ?', r: '`df -i` : inodes épuisés.' },
    { q: 'Rapport d’incident ?', r: 'Sans coupable : résumé, chronologie, causes déclenchante et profondes, bilan, actions datées.' },
  ],
  memo: `
    ### Durcissement
    \`\`\`
    systemctl list-unit-files --state=enabled   ss -ltnup   find / -xdev -perm -4000 -type f   sshd -T
    /etc/sysctl.d/80-durcissement.conf ; sysctl --system   auditctl -w F -p wa -k K ; ausearch -k K -i   lynis audit system
    \`\`\`
    ### Service systemd
    \`\`\`
    systemd-analyze security [U]     systemctl edit U :
    NoNewPrivileges=yes  ProtectSystem=strict  ReadWritePaths=/var/lib/x | StateDirectory=x  ProtectHome=yes  PrivateTmp=yes
    PrivateDevices=yes  CapabilityBoundingSet=…  AmbientCapabilities=…  RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
    SystemCallFilter=@system-service  MemoryMax=…  DynamicUser=yes
    \`\`\`
    ### Sauvegardes (restic)
    \`\`\`
    RESTIC_REPOSITORY=…  RESTIC_PASSWORD_FILE=…   restic init | backup /srv /etc | snapshots | check
    restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune   restic restore latest --target /tmp/r
    \`\`\`
    3-2-1 · RPO/RTO · cohérence (dump ou instantané) · **tester la restauration**
    ### Supervision
    \`\`\`
    OnFailure=alerte@%n.service   systemctl --failed   df -h ; df -i   openssl x509 -enddate -noout -in CERT
    \`\`\`
    ### Incident
    Qualifier → communiquer → noter avec l’heure → rétablir (preuves gardées) → comprendre → rapport sans coupable → actions datées.
  `,
});
