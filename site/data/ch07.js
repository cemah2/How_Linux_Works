/* Chapitre 7 : System Configuration: Logging, System Time, Batch Jobs, and Users (livre p. 167–198). */
HLW.chapitre({
  id: '07',
  num: 7,
  intro: `
    Une fois le système démarré, l’administrateur vit dans \`/etc\` et dans les journaux. Ce chapitre couvre les tâches du
    quotidien : **lire et conserver les journaux**, **gérer les comptes** et les groupes, **régler l’heure**, **planifier des
    tâches** (cron, timers systemd, at), comprendre les **identifiants** d’un processus (UID réel et effectif), et configurer
    l’authentification avec **PAM**.

    Les différences entre Debian et Rocky sont nombreuses ici (journaux, noms des services, outils de comptes) : chaque fiche
    les signale. Le **Lab 04** (timers) et le **Lab 05** (comptes, PAM, journaux) les mettent en pratique.
  `,
  objectifs: [
    'interroger le journal avec `journalctl` (par période, service, priorité, démarrage) ;',
    'configurer la rotation des journaux et la conservation du journal systemd ;',
    'lire `/etc/passwd`, `/etc/shadow`, `/etc/group`, et gérer comptes et groupes en ligne de commande ;',
    'régler le fuseau horaire et vérifier la synchronisation NTP ;',
    'planifier une tâche avec cron, un timer systemd ou at ;',
    'expliquer UID réel, effectif et sauvegardé, et la différence entre authentification et autorisation ;',
    'lire et modifier une configuration PAM.',
  ],
  certifs: { lpic1: ['107.1', '107.2', '108.1', '108.2', '110.1'], lfcs: ['OD', 'UG'], rhcsa: ['R4', 'R7', 'R9', 'R10'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '7.1',
      titre: 'Le journal systemd',
      sections: '§7.1 à 7.1.2', pages: '168–172',
      objectif: 'Trouver rapidement une information dans le journal.',
      rappel: `
        Presque tous les programmes écrivent des messages de diagnostic : les **journaux** (*logs*). Sur les systèmes actuels,
        c’est **journald** (systemd) qui les collecte : messages du noyau, sorties des services, messages syslog. On les lit
        avec \`journalctl\`. Les fichiers texte de \`/var/log\` existent encore (pour certains services, ou si **rsyslog** est
        installé), mais **Debian 13 n’installe plus rsyslog** par défaut : tout est dans le journal.

        \`\`\`
        $ journalctl -S -4h                     # depuis 4 heures (-S = since, -U = until)
        $ journalctl -S 06:00 -U 08:00          # entre 6 h et 8 h aujourd’hui
        $ journalctl -S '2026-11-08 14:30'      # depuis une date et heure
        $ journalctl -u cron.service            # un service
        $ journalctl -p err                     # priorité err et plus grave (ou -p 3 ; -p 2..3 pour une plage)
        $ journalctl -b                         # depuis le démarrage en cours ; -b -1 : le précédent
        $ journalctl --list-boots               # démarrages enregistrés
        $ journalctl -r                         # du plus récent au plus ancien
        $ journalctl -f                         # suivre en direct
        $ journalctl -g 'Failed password'       # filtrer par expression régulière
        $ journalctl -N                         # liste des champs disponibles
        $ journalctl -F _SYSTEMD_UNIT           # valeurs prises par un champ
        $ journalctl _COMM=sshd                 # filtrer sur un champ
        \`\`\`

        Les options se combinent : \`journalctl -u ssh -p warning -S yesterday\`.

        ### Les priorités

        | Code | Nom | | Code | Nom |
        |---|---|---|---|---|
        | 0 | emerg | | 4 | warning |
        | 1 | alert | | 5 | notice |
        | 2 | crit | | 6 | info |
        | 3 | err | | 7 | debug |

        Un utilisateur ordinaire ne voit que ses propres messages, sauf s’il appartient au groupe \`adm\` ou \`systemd-journal\`.
      `,
      aRetenir: [
        'journald collecte tout ; `journalctl` lit. Debian 13 : plus de rsyslog par défaut.',
        '`-S`/`-U` période, `-u` service, `-p` priorité, `-b` démarrage, `-f` direct, `-r` inverse, `-g` motif.',
        'Priorités 0 emerg … 3 err, 4 warning … 7 debug.',
        'Groupes `adm` / `systemd-journal` pour lire tout le journal.',
      ],
      exercices: [
        {
          id: 'c07-01-01', type: 'commande', niveau: 1, ref: '§7.1.2, p. 170',
          enonce: 'Affiche les messages du journal des **4 dernières heures**.',
          accepte: ['(sudo )?journalctl -S ?-4h', '(sudo )?journalctl --since[= ]-4h', '(sudo )?journalctl -S ["\']-4h["\']', '(sudo )?journalctl --since[= ]["\']4 hours ago["\']', '(sudo )?journalctl -S ["\']4 hours ago["\']'],
          exemple: 'journalctl -S -4h',
          indices: ['`-S` signifie *since* (depuis).', 'Une durée relative s’écrit avec un signe moins.', '`journalctl -S -4h`'],
          solution: '```\n$ journalctl -S -4h\n```\nForme longue : `journalctl --since "4 hours ago"`.',
        },
        {
          id: 'c07-01-02', type: 'commande', niveau: 1, ref: '§7.1.2, p. 171',
          enonce: 'Affiche uniquement les messages de priorité **err** et plus graves.',
          accepte: ['(sudo )?journalctl -p ?(err|3)', '(sudo )?journalctl --priority[= ](err|3)', '(sudo )?journalctl -p ?0\\.\\.3', '(sudo )?journalctl -p ?(emerg|0)\\.\\.(err|3)'],
          exemple: 'journalctl -p err',
          indices: ['L’option porte sur la priorité.', '`-p`', 'err correspond au niveau 3.'],
          solution: '```\n$ journalctl -p err\n```\nÉquivalent : `-p 3`. Une seule valeur signifie « ce niveau et tous les plus graves ».',
        },
        {
          id: 'c07-01-03', type: 'commande', niveau: 2, ref: '§7.1.2, p. 171',
          enonce: 'Affiche le journal du **démarrage précédent**, du plus récent au plus ancien (utile pour voir ce qui s’est passé juste avant un plantage).',
          accepte: ['(sudo )?journalctl -r -b ?-1', '(sudo )?journalctl -b ?-1 -r', '(sudo )?journalctl -rb ?-1', '(sudo )?journalctl --reverse -b ?-1', '(sudo )?journalctl -b ?-1 --reverse'],
          exemple: 'journalctl -r -b -1',
          indices: ['`-b` sélectionne un démarrage ; `-1` le précédent.', '`-r` inverse l’ordre.', '`journalctl -r -b -1`'],
          solution: '```\n$ journalctl -r -b -1\n```\nLes premières lignes sont les derniers messages avant l’arrêt (ou le plantage). Il faut un journal **persistant** (fiche 7.2).',
        },
        {
          id: 'c07-01-04', type: 'association', niveau: 1, ref: '§7.1.2, p. 171',
          enonce: 'Associe chaque code de priorité syslog à son nom.',
          paires: [['0', 'emerg'], ['3', 'err'], ['4', 'warning'], ['6', 'info'], ['7', 'debug']],
          indices: ['Plus le nombre est petit, plus c’est grave.', '0 = urgence, 7 = débogage.', 'err est au milieu des graves : 3.'],
          solution: '0 emerg, 1 alert, 2 crit, 3 err, 4 warning, 5 notice, 6 info, 7 debug.',
        },
        {
          id: 'c07-01-05', type: 'commande', niveau: 2, ref: '§7.1.2, p. 171',
          enonce: 'Cherche dans le journal les lignes qui contiennent `Failed password`.',
          accepte: ['(sudo )?journalctl -g ["\']Failed password["\']', '(sudo )?journalctl --grep[= ]["\']Failed password["\']', '(sudo )?journalctl \\| grep ["\']Failed password["\']', '(sudo )?journalctl -u ssh(d)?(\\.service)? -g ["\']Failed password["\']'],
          exemple: "journalctl -g 'Failed password'",
          indices: ['journalctl a sa propre option de filtrage par motif.', 'Elle porte le nom d’une commande célèbre.', '`-g` (grep).'],
          solution: "```\n$ sudo journalctl -g 'Failed password'\n… sshd[2817]: Failed password for invalid user admin from 203.0.113.42 port 51234 ssh2\n```\n`journalctl | grep …` marche aussi, mais `-g` respecte les autres filtres et colore les correspondances.",
        },
        {
          id: 'c07-01-06', type: 'terminal', niveau: 2,
          enonce: 'Sur ta VM, lance `journalctl --list-boots` puis `journalctl -u ssh -b` (ou `-u sshd` sur fut). Colle la sortie. Combien de démarrages sont enregistrés ?',
          attendu: ['[0-9a-f]{32}|^\\s*-?\\d+ '],
          indices: ['Chaque démarrage a un numéro relatif (0, -1, -2…) et un identifiant.', 'Les VM fraîches n’ont souvent qu’un ou deux démarrages.', 'Sur Rocky, le service SSH s’appelle sshd.'],
          solution: 'Tu vois une ligne par démarrage (index, identifiant, première et dernière date) puis les messages de sshd : démarrage du serveur et tes connexions acceptées (`Accepted publickey for admin from …`).',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '7.2',
      titre: 'Rotation, conservation du journal et syslog',
      sections: '§7.1.3 à 7.1.5', pages: '172–176',
      objectif: 'Empêcher les journaux de remplir le disque et comprendre syslog.',
      rappel: `
        ### logrotate

        Les journaux texte grossissent sans fin. **logrotate** les fait tourner : \`app.log\` devient \`app.log.1\`, puis
        \`app.log.2.gz\`… et les plus anciens sont supprimés. Il est lancé chaque jour (par \`logrotate.timer\` ou cron).
        Configuration : \`/etc/logrotate.conf\` et un fichier par service dans \`/etc/logrotate.d/\`.

        \`\`\`
        # /etc/logrotate.d/boutique
        /var/log/boutique/*.log {
            weekly            # chaque semaine
            rotate 8          # garder 8 anciennes versions
            compress          # compresser avec gzip
            delaycompress     # sauf la plus récente
            missingok         # pas d’erreur si le fichier manque
            notifempty        # ne pas tourner un fichier vide
            create 0640 root adm
        }
        \`\`\`

        \`logrotate -d /etc/logrotate.d/boutique\` simule (débogage, rien n’est modifié) ; \`-f\` force une rotation.

        ### Conserver le journal systemd

        Le journal est stocké dans \`/run/log/journal\` (en mémoire, perdu au redémarrage) ou dans \`/var/log/journal\`
        (**persistant**). Réglage \`Storage=\` dans \`/etc/systemd/journald.conf\` : \`auto\` (persistant si le répertoire existe),
        \`persistent\`, \`volatile\`. Taille : \`SystemMaxUse=\`.

        \`\`\`
        $ journalctl --disk-usage
        # journalctl --vacuum-size=200M      # réduire à 200 Mo
        # journalctl --vacuum-time=4weeks    # supprimer ce qui a plus de 4 semaines
        \`\`\`

        ### syslog

        Avant journald, le standard était **syslog** : un démon (aujourd’hui **rsyslog**) reçoit des messages étiquetés par
        une **catégorie** (*facility*) et une **priorité**, et les répartit dans des fichiers selon des règles :

        \`\`\`
        authpriv.*      /var/log/secure          # Rocky
        auth,authpriv.* /var/log/auth.log        # Debian (si rsyslog est installé)
        \`\`\`

        Catégories : \`kern\`, \`user\`, \`mail\`, \`daemon\`, \`auth\`, \`authpriv\`, \`cron\`, \`local0\`…\`local7\`.
        \`logger\` envoie un message : \`logger -p local0.warning -t boutique "stock faible"\`. journald et rsyslog coexistent :
        journald peut transmettre les messages à rsyslog (c’est le cas sur Rocky).
      `,
      aRetenir: [
        'logrotate : `/etc/logrotate.d/` ; weekly, rotate N, compress, missingok, notifempty ; `-d` pour simuler.',
        'Journal persistant : `/var/log/journal` ou `Storage=persistent` ; `--disk-usage`, `--vacuum-size`.',
        'syslog : catégorie.priorité → fichier ; `logger -p local0.warning -t nom "message"`.',
        'Rocky : rsyslog + `/var/log/secure` ; Debian 13 : journal seulement.',
      ],
      exercices: [
        {
          id: 'c07-02-01', type: 'trous', niveau: 2, ref: '§7.1.3, p. 172',
          enonce: 'Complète la configuration logrotate : rotation **hebdomadaire**, **8** versions conservées, **compression**, pas d’erreur si le fichier manque.',
          texte: '/var/log/boutique/*.log {\n    [[1]]\n    rotate [[2]]\n    [[3]]\n    [[4]]\n}',
          trous: [
            { accepte: ['weekly'], exemple: 'weekly' },
            { accepte: ['8'], exemple: '8' },
            { accepte: ['compress'], exemple: 'compress' },
            { accepte: ['missingok'], exemple: 'missingok' },
          ],
          indices: ['Hebdomadaire en anglais.', 'compress compresse.', '« manquant, c’est OK » : missingok.'],
          solution: '```\n/var/log/boutique/*.log {\n    weekly\n    rotate 8\n    compress\n    missingok\n}\n```\nTeste avec `logrotate -d /etc/logrotate.d/boutique`.',
        },
        {
          id: 'c07-02-02', type: 'commande', niveau: 2, ref: '§7.1.3',
          enonce: '**Simule** la configuration logrotate `/etc/logrotate.d/boutique` sans rien modifier.',
          accepte: ['(sudo )?logrotate -d /etc/logrotate\\.d/boutique', '(sudo )?logrotate --debug /etc/logrotate\\.d/boutique'],
          exemple: 'logrotate -d /etc/logrotate.d/boutique',
          pieges: [{ motif: '(sudo )?logrotate -f /etc/logrotate\\.d/boutique', message: '`-f` force une vraie rotation. On demandait une simulation.' }],
          indices: ['Le mode débogage de logrotate ne touche à rien.', 'Une lettre.', '`-d`'],
          solution: '```\n# logrotate -d /etc/logrotate.d/boutique\n```\nlogrotate explique ce qu’il ferait (« rotating pattern… », « log does not need rotating »).',
        },
        {
          id: 'c07-02-03', type: 'qcm', niveau: 2, ref: '§7.1.4, p. 173',
          enonce: 'Après chaque redémarrage, `journalctl -b -1` répond « Specifying boot ID or boot offset has no effect, no persistent journal was found ». Que faire ?',
          choix: [
            'Rendre le journal persistant : créer `/var/log/journal` (ou `Storage=persistent` dans journald.conf) puis redémarrer journald',
            'Installer rsyslog',
            'Augmenter `SystemMaxUse`',
            'Utiliser `dmesg` à la place',
          ],
          reponse: 0,
          indices: ['Le journal est stocké en mémoire, dans /run.', 'Il faut qu’il soit écrit sur disque.', '`Storage=` dans journald.conf.'],
          solution: 'Le journal est **volatil** (`/run/log/journal`). Crée `/var/log/journal` (avec `Storage=auto`, le défaut) ou mets `Storage=persistent`, puis `systemctl restart systemd-journald`.',
        },
        {
          id: 'c07-02-04', type: 'commande', niveau: 2, ref: '§7.1.4, p. 173',
          enonce: 'Réduis la taille du journal systemd à **200 Mo** en supprimant les plus anciennes archives.',
          accepte: ['(sudo )?journalctl --vacuum-size=200M'],
          exemple: 'journalctl --vacuum-size=200M',
          indices: ['« Passer l’aspirateur ».', 'Option `--vacuum-…`.', '`--vacuum-size=200M`'],
          solution: '```\n# journalctl --vacuum-size=200M\n```\nAlternative par âge : `--vacuum-time=4weeks`. Pour une limite permanente : `SystemMaxUse=200M` dans journald.conf.',
        },
        {
          id: 'c07-02-05', type: 'commande', niveau: 2, ref: '§7.1.5, p. 174–175',
          enonce: 'Envoie au journal le message `stock faible` avec l’étiquette `boutique` et la priorité `warning` de la catégorie `local0`.',
          accepte: ['logger -p local0\\.warning -t boutique ["\']stock faible["\']', 'logger -t boutique -p local0\\.warning ["\']stock faible["\']', 'logger -p local0\\.warn -t boutique ["\']stock faible["\']', 'logger -t boutique -p local0\\.warn ["\']stock faible["\']'],
          exemple: 'logger -p local0.warning -t boutique "stock faible"',
          indices: ['La commande s’appelle `logger`.', '`-p catégorie.priorité`, `-t étiquette`.', '`logger -p local0.warning -t boutique "stock faible"`'],
          solution: '```\n$ logger -p local0.warning -t boutique "stock faible"\n$ journalctl -t boutique\n… boutique[3120]: stock faible\n```\nPratique dans un script (chapitre 11).',
        },
        {
          id: 'c07-02-06', type: 'association', niveau: 1, ref: '§7.1.5',
          enonce: 'Associe chaque catégorie syslog aux messages qu’elle désigne.',
          paires: [
            ['`kern`', 'Messages du noyau'],
            ['`authpriv`', 'Authentification (connexions, sudo)'],
            ['`cron`', 'Tâches planifiées'],
            ['`mail`', 'Courrier électronique'],
            ['`local0` à `local7`', 'Libres, pour les applications locales'],
          ],
          indices: ['kern = kernel.', 'auth = authentification.', 'local = à toi de choisir.'],
          solution: 'kern, authpriv, cron, mail, local0–7. Sur Rocky, `authpriv.*` va dans `/var/log/secure`.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '7.3',
      titre: '/etc et le fichier /etc/passwd',
      sections: '§7.2 à 7.3.2', pages: '176–179',
      objectif: 'S’orienter dans /etc et lire la base des comptes.',
      rappel: `
        ### La structure de /etc

        \`/etc\` contient la configuration de la machine. On y trouve de plus en plus de répertoires \`*.d\`
        (\`/etc/sudoers.d\`, \`/etc/logrotate.d\`, \`/etc/sysctl.d\`…) : chaque paquet ou l’administrateur y dépose son
        propre fichier, au lieu de modifier un fichier unique. Les mises à jour sont ainsi plus sûres.

        ### /etc/passwd

        Une ligne par compte, sept champs séparés par \`:\` :

        \`\`\`
        bastien:x:1001:1001:Bastien Roux,,,:/home/bastien:/bin/bash
        │       │ │    │    │                │             └ shell de connexion
        │       │ │    │    │                └ répertoire personnel
        │       │ │    │    └ GECOS : nom complet et informations (chfn)
        │       │ │    └ GID du groupe principal
        │       │ └ UID
        │       └ « x » : le mot de passe est dans /etc/shadow
        └ nom de connexion
        \`\`\`

        Le fichier est lisible par tous (les programmes en ont besoin pour afficher des noms) : c’est pourquoi les mots de
        passe chiffrés sont ailleurs (\`/etc/shadow\`). \`getent passwd bastien\` consulte la base des comptes, qu’elle soit
        locale ou réseau (LDAP).

        ### Comptes particuliers

        - **root** : UID 0.
        - **comptes système** : UID inférieurs à 1000 (\`daemon\`, \`www-data\`, \`sshd\`, \`chrony\`…), souvent avec le shell
          \`/usr/sbin/nologin\` ou \`/bin/false\` : on ne peut pas s’y connecter.
        - **nobody** : UID 65534, compte sans aucun droit, utilisé par des services qui ne doivent rien posséder.
        - **utilisateurs humains** : UID 1000 et plus.

        On édite \`/etc/passwd\` avec **vipw** (verrouillage, vérification), jamais avec un éditeur ordinaire. En pratique, on
        passe par les commandes de la fiche 7.4.
      `,
      aRetenir: [
        '`/etc/*.d/` : un fichier par paquet ou par besoin.',
        '/etc/passwd : nom:x:UID:GID:GECOS:répertoire:shell ; lisible par tous.',
        'root 0 ; comptes système < 1000 (nologin) ; nobody 65534 ; humains ≥ 1000.',
        '`getent passwd nom` ; édition avec `vipw`.',
      ],
      exercices: [
        {
          id: 'c07-03-01', type: 'association', niveau: 1, ref: '§7.3.1, p. 177–178',
          enonce: 'Dans `chloe:x:1002:1002:Chloé Martin:/home/chloe:/bin/bash`, associe chaque champ à son rôle.',
          paires: [
            ['`chloe`', 'Nom de connexion'],
            ['`x`', 'Le mot de passe est stocké dans /etc/shadow'],
            ['`1002` (3ᵉ champ)', 'UID'],
            ['`1002` (4ᵉ champ)', 'GID du groupe principal'],
            ['`Chloé Martin`', 'Champ GECOS (nom complet)'],
            ['`/bin/bash`', 'Shell de connexion'],
          ],
          indices: ['Sept champs séparés par des deux-points.', 'L’UID vient avant le GID.', 'Le shell est le dernier champ.'],
          solution: 'nom : x : UID : GID : GECOS : répertoire personnel : shell.',
        },
        {
          id: 'c07-03-02', type: 'commande', niveau: 1,
          enonce: 'Affiche la ligne du compte `admin` dans la base des comptes, avec la commande qui interroge aussi les annuaires réseau.',
          accepte: ['getent passwd admin'],
          exemple: 'getent passwd admin',
          pieges: [{ motif: 'grep [\'"]?\\^?admin[:\'"]* /etc/passwd', message: 'Ça marche pour les comptes locaux, mais pas pour un annuaire LDAP. `getent` interroge toutes les sources configurées.' }],
          indices: ['*get entries*.', 'Premier argument : la base (passwd, group…).', '`getent passwd admin`'],
          solution: '```\n$ getent passwd admin\nadmin:x:1000:1000::/home/admin:/bin/bash\n```',
        },
        {
          id: 'c07-03-03', type: 'commande', niveau: 2,
          enonce: 'Affiche uniquement les **noms** et les **UID** de tous les comptes de `/etc/passwd` (champs 1 et 3, séparés par `:`).',
          accepte: ['cut -d ?(:|\'(:)\'|"(:)") -f ?1,3 /etc/passwd', 'cut -f ?1,3 -d ?(:|\'(:)\'|"(:)") /etc/passwd', 'awk -F ?: [\'"]\\{print \\$1(,|" "|":")\\$3\\}[\'"] /etc/passwd'],
          exemple: 'cut -d: -f1,3 /etc/passwd',
          indices: ['Une commande découpe des colonnes (fiche 2.4, bonus).', '`-d` séparateur, `-f` champs.', '`cut -d: -f1,3 /etc/passwd`'],
          solution: '```\n$ cut -d: -f1,3 /etc/passwd\nroot:0\ndaemon:1\n…\nadmin:1000\n```',
        },
        {
          id: 'c07-03-04', type: 'vrai-faux', niveau: 1, ref: '§7.3.1–7.3.2',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '/etc/passwd contient les mots de passe chiffrés.', vrai: false, explication: 'Ils sont dans /etc/shadow, lisible seulement par root.' },
            { texte: 'Les comptes système ont en général un UID inférieur à 1000.', vrai: true },
            { texte: 'Un compte avec le shell `/usr/sbin/nologin` ne peut pas ouvrir de session interactive.', vrai: true },
            { texte: 'On peut modifier /etc/passwd sans risque avec nano.', vrai: false, explication: 'Utilise `vipw` (verrou, vérification) ou mieux les commandes usermod & co.' },
          ],
          indices: ['/etc/passwd est lisible par tous.', 'Deux vraies, deux fausses.', 'vipw = vi + passwd.'],
          solution: 'Faux, vrai, vrai, faux.',
        },
        {
          id: 'c07-03-05', type: 'reponse-courte', niveau: 1,
          enonce: 'Quel est l’UID du compte `nobody` ?',
          accepte: ['65534'],
          indices: ['C’est un très grand nombre.', '2¹⁶ − 2.', '65 534.'],
          solution: '**65534**. Ce compte ne possède rien et n’a aucun droit particulier.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '7.4',
      titre: '/etc/shadow, gestion des comptes et des groupes',
      sections: '§7.3.3 à 7.3.5', pages: '179–181',
      objectif: 'Créer, modifier, verrouiller et supprimer des comptes ; gérer les groupes.',
      rappel: `
        ### /etc/shadow

        Lisible seulement par root. Une ligne par compte :

        \`\`\`
        bastien:$y$j9T$…:20400:0:99999:7:::
        │       │        │     │ │     └ avertissement (jours avant expiration)
        │       │        │     │ └ durée maximale de validité du mot de passe (jours)
        │       │        │     └ durée minimale entre deux changements
        │       │        └ date du dernier changement (jours depuis le 1ᵉʳ janvier 1970)
        │       └ empreinte du mot de passe ($y$ yescrypt, $6$ SHA-512) ; « ! » devant = compte verrouillé ; « * » = pas de mot de passe
        └ nom
        \`\`\`

        ### Gérer les comptes

        \`\`\`
        # useradd -m -s /bin/bash -c "Léa Durand" -G brasseurs lea   # créer (avec répertoire personnel)
        # passwd lea                       # définir son mot de passe
        # usermod -aG compta lea           # AJOUTER à un groupe (-a indispensable !)
        # usermod -s /usr/sbin/nologin kevin
        # passwd -l kevin                  # verrouiller (usermod -L) ; -u pour déverrouiller
        # chage -l lea                     # politique d’expiration ; chage -M 90 lea : 90 jours max
        # userdel -r kevin                 # supprimer avec son répertoire personnel
        $ passwd                           # changer SON mot de passe
        $ chsh / chfn                      # changer son shell / ses informations
        \`\`\`

        - Sur Debian, \`adduser\` est une surcouche interactive plus confortable (crée le répertoire, demande le mot de passe).
        - **Piège classique** : \`usermod -G compta lea\` sans \`-a\` **remplace** tous les groupes secondaires de Léa.

        ### Les groupes

        \`\`\`
        $ getent group brasseurs              # /etc/group : nom:x:GID:membres
        brasseurs:x:1005:bastien,lea
        # groupadd boutique
        # gpasswd -a malik boutique           # ajouter un membre (= usermod -aG boutique malik)
        # gpasswd -d malik boutique           # retirer
        $ groups ; id lea
        \`\`\`

        Un changement de groupes ne s’applique qu’aux **nouvelles sessions** : reconnecte-toi (ou \`newgrp groupe\`).
        \`/etc/gshadow\` contient les mots de passe de groupe (rarement utilisés). \`vigr\` édite \`/etc/group\`.
      `,
      aRetenir: [
        'shadow : empreinte (`!` = verrouillé), dernier changement, min, max, avertissement.',
        '`useradd -m -s -c -G`, `passwd`, `usermod -aG`, `passwd -l`, `chage`, `userdel -r`.',
        '**`usermod -aG`** : sans `-a`, les groupes secondaires sont remplacés.',
        '`groupadd`, `gpasswd -a/-d`, `getent group` ; nouveaux groupes actifs à la prochaine session.',
      ],
      exercices: [
        {
          id: 'c07-04-01', type: 'commande', niveau: 1, ref: '§7.3.4, p. 179–180',
          enonce: 'Crée le compte `lea` **avec son répertoire personnel**, le shell `/bin/bash`, et le groupe secondaire `brasseurs`.',
          accepte: ['(sudo )?useradd (-m -s /bin/bash -G brasseurs|-m -G brasseurs -s /bin/bash|-s /bin/bash -m -G brasseurs|-s /bin/bash -G brasseurs -m|-G brasseurs -m -s /bin/bash|-G brasseurs -s /bin/bash -m)( -c (".*"|\'.*\'))? lea', '(sudo )?useradd -m -s /bin/bash -c (".*"|\'.*\') -G brasseurs lea', '(sudo )?useradd -m -c (".*"|\'.*\') -s /bin/bash -G brasseurs lea'],
          exemple: 'useradd -m -s /bin/bash -G brasseurs lea',
          pieges: [{ motif: '(sudo )?useradd (-s /bin/bash -G brasseurs|-G brasseurs -s /bin/bash) lea', message: 'Sans `-m`, useradd ne crée pas le répertoire personnel (selon la configuration de la distribution).' }],
          indices: ['`-m` crée le répertoire personnel.', '`-s` pour le shell, `-G` pour les groupes secondaires.', '`useradd -m -s /bin/bash -G brasseurs lea`'],
          solution: '```\n# useradd -m -s /bin/bash -G brasseurs lea\n# passwd lea\n```\nSur Debian, `adduser lea` fait tout cela de façon interactive.',
        },
        {
          id: 'c07-04-02', type: 'commande', niveau: 2,
          enonce: 'Ajoute `malik` au groupe `boutique`, **sans** lui retirer ses autres groupes.',
          accepte: ['(sudo )?usermod -aG boutique malik', '(sudo )?usermod -a -G boutique malik', '(sudo )?usermod -G boutique -a malik', '(sudo )?gpasswd -a malik boutique', '(sudo )?usermod --append --groups boutique malik'],
          exemple: 'usermod -aG boutique malik',
          pieges: [{ motif: '(sudo )?usermod -G boutique malik', message: 'Sans `-a`, `-G` REMPLACE tous les groupes secondaires de malik par « boutique » seul.' }],
          indices: ['La commande modifie un compte : usermod.', '`-G` liste les groupes secondaires…', '… et `-a` ajoute au lieu de remplacer.'],
          solution: '```\n# usermod -aG boutique malik\n```\nOu `gpasswd -a malik boutique`. Malik doit se reconnecter pour en profiter.',
        },
        {
          id: 'c07-04-03', type: 'association', niveau: 2, ref: '§7.3.3, p. 179',
          enonce: 'Dans `kevin:!$6$Gx…:20380:0:90:7:::`, associe chaque élément à sa signification.',
          paires: [
            ['`!` devant l’empreinte', 'Le compte est verrouillé'],
            ['`$6$`', 'Empreinte SHA-512'],
            ['`20380`', 'Date du dernier changement, en jours depuis 1970'],
            ['`90`', 'Durée de validité maximale du mot de passe, en jours'],
            ['`7`', 'Nombre de jours d’avertissement avant expiration'],
          ],
          indices: ['passwd -l ajoute un point d’exclamation.', 'Le préfixe $n$ indique l’algorithme.', 'Après la date viennent min, max, avertissement.'],
          solution: 'Verrouillé, SHA-512, dernier changement, max 90 jours, avertissement 7 jours. (Le 0 est le minimum entre deux changements.)',
        },
        {
          id: 'c07-04-04', type: 'commande', niveau: 1,
          enonce: 'Kevin quitte la brasserie. **Verrouille** son compte sans le supprimer.',
          accepte: ['(sudo )?passwd -l kevin', '(sudo )?usermod -L kevin', '(sudo )?passwd --lock kevin', '(sudo )?usermod --lock kevin'],
          exemple: 'passwd -l kevin',
          indices: ['On veut empêcher la connexion par mot de passe.', '`passwd` et `usermod` ont une option de verrouillage.', '`passwd -l kevin`'],
          solution: '```\n# passwd -l kevin\n```\nAttention : cela bloque le **mot de passe**, pas une clé SSH. Pour tout bloquer : `usermod -e 1 kevin` (compte expiré) et/ou shell `nologin`.',
        },
        {
          id: 'c07-04-05', type: 'commande', niveau: 2,
          enonce: 'Impose à `lea` de changer son mot de passe au moins tous les **90 jours**.',
          accepte: ['(sudo )?chage -M ?90 lea', '(sudo )?chage --maxdays[= ]90 lea', '(sudo )?passwd -x ?90 lea'],
          exemple: 'chage -M 90 lea',
          indices: ['*change age*.', 'La durée **maximale** : `-M`.', '`chage -M 90 lea`'],
          solution: '```\n# chage -M 90 lea\n# chage -l lea\nMaximum number of days between password change : 90\n```',
        },
        {
          id: 'c07-04-06', type: 'qcm', niveau: 2, ref: '§7.3.5',
          enonce: 'Tu viens d’ajouter `bastien` au groupe `compta`, mais dans sa session ouverte, `id` ne montre pas ce groupe. Pourquoi ?',
          choix: [
            'Les groupes d’un processus sont fixés à l’ouverture de session : il doit se reconnecter (ou utiliser newgrp)',
            'La commande a échoué silencieusement',
            'Il faut redémarrer la machine',
            '`id` ne montre que le groupe principal',
          ],
          reponse: 0,
          indices: ['Les identifiants d’un processus sont hérités au démarrage de la session.', 'Ils ne sont pas relus en cours de route.', 'Une nouvelle connexion suffit.'],
          solution: 'Les groupes sont attribués à la **connexion** et hérités par les processus. `id bastien` (qui relit /etc/group) montre le nouveau groupe, mais sa session doit être rouverte.',
        },
        {
          id: 'c07-04-07', type: 'commande', niveau: 1,
          enonce: 'Supprime le compte `kevin` **et** son répertoire personnel.',
          accepte: ['(sudo )?userdel -r kevin', '(sudo )?userdel --remove kevin', '(sudo )?deluser --remove-home kevin'],
          exemple: 'userdel -r kevin',
          indices: ['*user delete*.', 'Une option retire aussi le répertoire personnel.', '`-r`'],
          solution: '```\n# userdel -r kevin\n```\nAvant, archive ses fichiers si besoin (`tar czf /root/kevin.tar.gz /home/kevin`). Les fichiers qu’il possédait ailleurs restent, avec son ancien UID orphelin (`find / -nouser`).',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '7.5',
      titre: 'getty, login et l’heure du système',
      sections: '§7.4 et 7.5', pages: '181–183',
      objectif: 'Comprendre la connexion sur un terminal, et régler l’heure et le fuseau.',
      rappel: `
        ### getty et login

        Sur chaque terminal (console virtuelle, port série), un programme **getty** (\`agetty\`) affiche l’invite « login: »,
        lit le nom, puis lance **login**, qui demande le mot de passe (via PAM, fiche 7.9) et lance le shell. systemd démarre
        ces programmes à la demande : \`getty@tty1.service\`, \`serial-getty@ttyS0.service\` (la console de tes VM).
        Les connexions SSH ne passent pas par getty.

        ### L’heure

        Le PC a une **horloge matérielle** (RTC) qui tourne même éteint. Au démarrage, le noyau s’y cale, puis tient sa propre
        horloge, représentée en **secondes depuis le 1ᵉʳ janvier 1970 UTC** (\`date +%s\`). L’horloge matérielle doit être
        en **UTC** ; le fuseau horaire n’est qu’une affaire d’affichage.

        \`\`\`
        $ date                                  # heure locale
        $ date +%s                              # temps Unix
        $ TZ=America/Montreal date              # heure dans un autre fuseau, pour une commande
        $ ls -l /etc/localtime                  # lien vers /usr/share/zoneinfo/Europe/Paris
        # hwclock --systohc --utc               # recopier l’heure système dans l’horloge matérielle
        $ timedatectl                           # complément : tout l’état d’un coup
        # timedatectl set-timezone Europe/Paris
        \`\`\`

        ### NTP

        L’horloge d’un ordinateur dérive. Un client **NTP** la corrige en interrogeant des serveurs de temps : indispensable
        pour les journaux, Kerberos, les certificats TLS, les tâches planifiées. Rocky utilise **chronyd** (\`chronyc sources\`),
        Debian **systemd-timesyncd** ou chrony. \`timedatectl\` affiche « System clock synchronized: yes » quand tout va bien.
      `,
      aRetenir: [
        'getty affiche « login: », login authentifie et lance le shell ; `serial-getty@ttyS0` sur tes VM.',
        'Horloge matérielle en UTC ; temps Unix = secondes depuis 1970 (`date +%s`).',
        'Fuseau : `/etc/localtime`, `TZ=…`, `timedatectl set-timezone`.',
        'NTP : chronyd (Rocky), systemd-timesyncd ou chrony (Debian) ; `timedatectl`.',
      ],
      exercices: [
        {
          id: 'c07-05-01', type: 'ordre', niveau: 1, ref: '§7.4, p. 181',
          enonce: 'Remets dans l’ordre une connexion sur la console série d’une VM.',
          elements: [
            'systemd lance `serial-getty@ttyS0.service`',
            'agetty affiche l’invite « login: » et lit le nom',
            'agetty lance login, qui demande le mot de passe (via PAM)',
            'login lance le shell de l’utilisateur',
          ],
          indices: ['systemd démarre getty.', 'getty ne fait que lire le nom.', 'login authentifie puis passe la main au shell.'],
          solution: 'systemd → agetty → login (+ PAM) → shell.',
        },
        {
          id: 'c07-05-02', type: 'commande', niveau: 1, ref: '§7.5.1, p. 182',
          enonce: 'Affiche l’heure actuelle sous forme de **temps Unix** (secondes depuis 1970).',
          accepte: ['date \\+%s', 'date [\'"]\\+%s[\'"]'],
          exemple: 'date +%s',
          indices: ['C’est un format de `date`.', 'Les formats commencent par `+`.', '`%s` = secondes.'],
          solution: '```\n$ date +%s\n1794160800\n```\n`date -d @1794160800` fait la conversion inverse.',
        },
        {
          id: 'c07-05-03', type: 'commande', niveau: 2, ref: '§7.5.1, p. 182',
          enonce: 'Affiche l’heure qu’il est à **Montréal** (fuseau `America/Montreal`) sans changer le fuseau du système.',
          accepte: ['TZ=America/Montreal date', 'TZ=[\'"]America/Montreal[\'"] date', 'env TZ=America/Montreal date'],
          exemple: 'TZ=America/Montreal date',
          indices: ['Une variable d’environnement règle le fuseau pour un programme.', 'On peut la définir juste pour une commande (fiche 2.6).', '`TZ=America/Montreal date`'],
          solution: '```\n$ TZ=America/Montreal date\n```\nLa variable n’existe que pour cette commande.',
        },
        {
          id: 'c07-05-04', type: 'commande', niveau: 1,
          enonce: 'Règle le fuseau horaire du système sur `Europe/Paris` avec l’outil de systemd.',
          accepte: ['(sudo )?timedatectl set-timezone Europe/Paris'],
          exemple: 'timedatectl set-timezone Europe/Paris',
          indices: ['L’outil systemd de gestion de l’heure : `timedatectl`.', 'Sous-commande `set-timezone`.', '`timedatectl set-timezone Europe/Paris`'],
          solution: '```\n# timedatectl set-timezone Europe/Paris\n```\nCela refait le lien `/etc/localtime -> /usr/share/zoneinfo/Europe/Paris`.',
        },
        {
          id: 'c07-05-05', type: 'vrai-faux', niveau: 2, ref: '§7.5, p. 181–183',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Il est recommandé de régler l’horloge matérielle en UTC.', vrai: true },
            { texte: 'Le noyau compte le temps en secondes depuis le 1ᵉʳ janvier 1970 UTC.', vrai: true },
            { texte: 'Les connexions SSH passent par getty.', vrai: false, explication: 'sshd gère lui-même la connexion et alloue un pseudo-terminal.' },
            { texte: 'Une horloge non synchronisée peut faire échouer des connexions TLS.', vrai: true, explication: 'Les certificats ont des dates de validité.' },
          ],
          indices: ['L’heure d’été ne doit pas toucher l’horloge matérielle.', 'Une seule affirmation est fausse.', 'getty sert aux terminaux.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
        {
          id: 'c07-05-06', type: 'terminal', niveau: 1,
          enonce: 'Lance `timedatectl` sur cuve et sur fut, puis `chronyc sources` sur fut. Colle une sortie. L’horloge est-elle synchronisée ? Quel service NTP est utilisé ?',
          attendu: ['[Tt]ime zone|synchronized'],
          indices: ['Regarde « System clock synchronized » et « NTP service ».', 'Sur Rocky, chronyd est le client NTP.', '`chronyc sources` liste les serveurs interrogés.'],
          solution: 'Tu dois voir `Time zone: Europe/Paris (CET, +0100)`, `System clock synchronized: yes`, `NTP service: active`. Sur fut, `chronyc sources` liste des serveurs `*.pool.ntp.org` (ou ceux de Rocky) ; celui précédé de `^*` est la source retenue.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '7.6',
      titre: 'Planifier avec cron',
      sections: '§7.6 à 7.6.2', pages: '183–185',
      objectif: 'Écrire une ligne crontab correcte.',
      rappel: `
        **cron** lance des commandes à intervalles réguliers. Chaque utilisateur a sa **crontab** :

        \`\`\`
        $ crontab -e        # éditer ma crontab
        $ crontab -l        # l’afficher
        $ crontab -r        # la supprimer (attention !)
        # crontab -u lea -l # celle d’un autre utilisateur (root)
        \`\`\`

        Une ligne = cinq champs de date, puis la commande :

        \`\`\`
        # minute  heure  jour-du-mois  mois  jour-de-semaine  commande
          15      09     *             *     *                /usr/local/bin/rapport          # tous les jours à 9 h 15
          30      02     *             *     1-5              /usr/local/bin/export-ventes    # 2 h 30, du lundi au vendredi
          */10    *      *             *     *                /usr/local/bin/sonde            # toutes les 10 minutes
          0       0      1             *     *                /usr/local/bin/facturation      # le 1ᵉʳ de chaque mois à minuit
        \`\`\`

        - \`*\` = toutes les valeurs ; \`1-5\` = plage ; \`1,15\` = liste ; \`*/10\` = pas de 10.
        - Jour de semaine : 0 ou 7 = dimanche, 1 = lundi…
        - cron envoie la sortie de la commande par **courriel** à l’utilisateur (variable \`MAILTO\`) : redirige-la si besoin.
        - L’environnement de cron est minimal (PATH réduit) : utilise des **chemins complets**.

        ### Les crontabs du système

        - \`/etc/crontab\` et \`/etc/cron.d/*\` : même format **plus un champ utilisateur** avant la commande.
        - \`/etc/cron.hourly\`, \`cron.daily\`, \`cron.weekly\`, \`cron.monthly\` : des scripts lancés par \`run-parts\` (via anacron si la machine était éteinte).
        - Le service s’appelle \`cron\` sur Debian, \`crond\` sur Rocky (paquet cronie).
      `,
      aRetenir: [
        'Champs : minute, heure, jour du mois, mois, jour de semaine, commande.',
        '`*`, `1-5`, `1,15`, `*/10` ; dimanche = 0 ou 7.',
        '`crontab -e/-l/-r` ; `/etc/crontab` et `/etc/cron.d/` ont un champ utilisateur en plus.',
        'Chemins complets et redirection de la sortie dans les commandes cron.',
      ],
      exercices: [
        {
          id: 'c07-06-01', type: 'association', niveau: 1, ref: '§7.6, p. 183–184',
          enonce: 'Associe chaque ligne crontab à sa signification.',
          paires: [
            ['`15 9 * * *`', 'Tous les jours à 9 h 15'],
            ['`30 2 * * 1-5`', 'À 2 h 30 du lundi au vendredi'],
            ['`*/10 * * * *`', 'Toutes les 10 minutes'],
            ['`0 0 1 * *`', 'Le 1ᵉʳ de chaque mois à minuit'],
            ['`0 18 * * 0`', 'Le dimanche à 18 h'],
          ],
          indices: ['Ordre : minute, heure, jour du mois, mois, jour de semaine.', '`*/10` = « tous les 10 ».', 'Jour de semaine 0 = dimanche.'],
          solution: 'Lis toujours dans l’ordre : minute, heure, jour du mois, mois, jour de semaine.',
        },
        {
          id: 'c07-06-02', type: 'trous', niveau: 2, ref: '§7.6',
          enonce: 'Écris les cinq champs de date pour lancer l’export **à 2 h 30, du lundi au vendredi**.',
          texte: '[[1]] [[2]] [[3]] [[4]] [[5]] /usr/local/bin/export-ventes',
          trous: [
            { accepte: ['30'], exemple: '30' },
            { accepte: ['0?2'], exemple: '2' },
            { accepte: ['\\*'], exemple: '*' },
            { accepte: ['\\*'], exemple: '*' },
            { accepte: ['1-5', 'mon-fri', 'Mon-Fri', '1,2,3,4,5'], exemple: '1-5' },
          ],
          indices: ['La minute vient en premier.', 'Tous les jours du mois et tous les mois : étoile.', 'Lundi = 1, vendredi = 5.'],
          solution: '```\n30 2 * * 1-5 /usr/local/bin/export-ventes\n```',
        },
        {
          id: 'c07-06-03', type: 'commande', niveau: 1, ref: '§7.6.1, p. 184',
          enonce: 'Affiche ta propre crontab.',
          accepte: ['crontab -l'],
          exemple: 'crontab -l',
          pieges: [{ motif: 'crontab -r', message: 'ATTENTION : `-r` SUPPRIME la crontab. `l` et `r` sont voisines sur le clavier…' }],
          indices: ['l comme *list*.', 'Une option de crontab.', '`crontab -l`'],
          solution: '```\n$ crontab -l\nno crontab for admin\n```\n`crontab -e` pour la créer. Méfie-toi de `crontab -r`, qui la supprime sans confirmation.',
        },
        {
          id: 'c07-06-04', type: 'qcm', niveau: 2, ref: '§7.6.2, p. 185',
          enonce: 'Quelle est la différence de format entre une ligne de `/etc/cron.d/sauvegarde` et une ligne de `crontab -e` ?',
          choix: [
            'Les fichiers système ont un champ supplémentaire : l’utilisateur qui exécute la commande, avant celle-ci',
            'Aucune différence',
            'Les fichiers système utilisent des heures en UTC',
            'Les fichiers système n’acceptent pas les étoiles',
          ],
          reponse: 0,
          indices: ['Une crontab personnelle sait à qui elle appartient.', 'Un fichier système doit préciser sous quel compte lancer.', 'Un sixième champ.'],
          solution: 'Les crontabs système (`/etc/crontab`, `/etc/cron.d/`) ont un champ **utilisateur** : `30 2 * * * root /usr/local/bin/sauvegarde`.',
        },
        {
          id: 'c07-06-05', type: 'qcm', niveau: 2,
          enonce: 'Un script marche quand tu le lances à la main, mais échoue sous cron avec « command not found ». Cause la plus probable ?',
          choix: [
            'cron lance les commandes avec un PATH minimal : il faut des chemins complets (ou définir PATH dans la crontab)',
            'cron ne sait pas lancer de scripts',
            'Le script doit appartenir à root',
            'cron ne fonctionne que la nuit',
          ],
          reponse: 0,
          indices: ['L’environnement de cron n’est pas celui de ton shell.', 'Pense à la variable qui sert à trouver les commandes (fiche 2.6).', 'PATH.'],
          solution: 'L’environnement de cron est **minimal** (souvent `PATH=/usr/bin:/bin`). Utilise des chemins complets, ou ajoute une ligne `PATH=…` en tête de crontab.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '7.7',
      titre: 'Timers systemd et tâches ponctuelles avec at',
      sections: '§7.6.3 à 7.8', pages: '185–189',
      objectif: 'Remplacer une ligne cron par un timer, et programmer une tâche unique.',
      rappel: `
        ### Un timer = deux unités

        \`\`\`
        # /etc/systemd/system/export-ventes.service
        [Unit]
        Description=Export quotidien des ventes

        [Service]
        Type=oneshot
        ExecStart=/usr/local/bin/export-ventes
        \`\`\`

        \`\`\`
        # /etc/systemd/system/export-ventes.timer
        [Unit]
        Description=Déclenche l’export des ventes

        [Timer]
        OnCalendar=Mon..Fri *-*-* 02:30:00
        Persistent=true

        [Install]
        WantedBy=timers.target
        \`\`\`

        \`\`\`
        # systemctl daemon-reload
        # systemctl enable --now export-ventes.timer    # on active le TIMER, pas le service
        $ systemctl list-timers                          # prochaines exécutions
        $ systemd-analyze calendar "Mon..Fri 02:30"      # vérifier une expression OnCalendar
        \`\`\`

        - \`OnCalendar=\` : date et heure (\`daily\`, \`weekly\`, \`*-*-* 02:30:00\`, \`Mon..Fri 08:00\`).
        - \`OnBootSec=\`, \`OnUnitActiveSec=\` : délais relatifs (au démarrage, à la dernière exécution).
        - \`Persistent=true\` : rattraper une exécution manquée pendant que la machine était éteinte.

        ### cron ou timer ? (§7.6.4)

        cron est plus court à écrire. Les timers apportent le journal (\`journalctl -u export-ventes\`), les dépendances,
        les limites de ressources, le rattrapage, et évitent les exécutions simultanées. Les deux sont au programme des
        certifications (le RHCSA 10 insiste sur les timers).

        ### Tâches ponctuelles

        \`\`\`
        $ at 22:30                       # puis taper les commandes, terminer par Ctrl-D
        $ echo "/usr/local/bin/inventaire" | at now + 2 hours
        $ atq   ;  atrm 3                # lister / supprimer
        # systemd-run --on-calendar='2026-11-14 18:00' /usr/local/bin/inventaire
        # systemd-run --on-active=30m /usr/local/bin/inventaire
        \`\`\`

        \`at\` est un paquet à installer (et le service \`atd\` à démarrer).

        ### Timers d’un utilisateur (§7.8)

        Un utilisateur peut avoir ses propres unités : \`~/.config/systemd/user/\`, \`systemctl --user …\`. Pour qu’elles
        tournent quand il n’est pas connecté : \`loginctl enable-linger lea\`.
      `,
      aRetenir: [
        'Timer = `nom.timer` + `nom.service` ; on active le **timer** (`enable --now`).',
        '`OnCalendar=`, `Persistent=true`, `WantedBy=timers.target` ; `systemctl list-timers`.',
        '`systemd-analyze calendar` pour tester une expression.',
        '`at`, `atq`, `atrm` ; `systemd-run --on-calendar|--on-active` ; `loginctl enable-linger`.',
      ],
      exercices: [
        {
          id: 'c07-07-01', type: 'trous', niveau: 2, ref: '§7.6.3, p. 186',
          enonce: 'Complète le timer qui déclenche `export-ventes.service` du lundi au vendredi à 2 h 30, avec rattrapage si la machine était éteinte.',
          texte: '[Timer]\n[[1]]=Mon..Fri *-*-* 02:30:00\n[[2]]=true\n\n[Install]\nWantedBy=[[3]]',
          trous: [
            { accepte: ['OnCalendar'], exemple: 'OnCalendar' },
            { accepte: ['Persistent'], exemple: 'Persistent' },
            { accepte: ['timers\\.target'], exemple: 'timers.target' },
          ],
          indices: ['Le déclenchement calendaire commence par On.', 'Rattraper = persister.', 'Les timers se rattachent à une cible dédiée.'],
          solution: '```\n[Timer]\nOnCalendar=Mon..Fri *-*-* 02:30:00\nPersistent=true\n\n[Install]\nWantedBy=timers.target\n```',
        },
        {
          id: 'c07-07-02', type: 'commande', niveau: 1, ref: '§7.6.3, p. 187',
          enonce: 'Active **et** démarre le timer `export-ventes.timer`.',
          accepte: ['(sudo )?systemctl enable --now export-ventes\\.timer', '(sudo )?systemctl --now enable export-ventes\\.timer'],
          exemple: 'systemctl enable --now export-ventes.timer',
          pieges: [{ motif: '(sudo )?systemctl enable --now export-ventes(\\.service)?', message: 'On active le TIMER, pas le service : c’est le timer qui déclenchera le service.' }],
          indices: ['C’est le timer qu’on active.', 'Activer et démarrer : `enable --now`.', '`systemctl enable --now export-ventes.timer`'],
          solution: '```\n# systemctl enable --now export-ventes.timer\n$ systemctl list-timers export-ventes.timer\n```',
        },
        {
          id: 'c07-07-03', type: 'commande', niveau: 1,
          enonce: 'Liste les timers actifs et leur prochaine exécution.',
          accepte: ['systemctl list-timers( --all)?'],
          exemple: 'systemctl list-timers',
          indices: ['Sous-commande de systemctl.', '« lister les timers ».', '`systemctl list-timers`'],
          solution: '```\n$ systemctl list-timers\nNEXT                        LEFT    LAST  PASSED  UNIT                 ACTIVATES\nMon 2026-11-09 02:30:00 CET 7h left -     -       export-ventes.timer  export-ventes.service\n```',
        },
        {
          id: 'c07-07-04', type: 'commande', niveau: 2,
          enonce: 'Programme avec `at` l’exécution de `/usr/local/bin/inventaire` **dans 2 heures**, en une seule ligne.',
          accepte: ['echo ["\']?/usr/local/bin/inventaire["\']? \\| at now ?\\+ ?2 ?hours?', 'at now ?\\+ ?2 ?hours? <<< ["\']?/usr/local/bin/inventaire["\']?'],
          exemple: 'echo /usr/local/bin/inventaire | at now + 2 hours',
          indices: ['`at` lit les commandes sur son entrée standard.', 'Un tube avec echo évite la saisie interactive.', '`at now + 2 hours`'],
          solution: '```\n$ echo /usr/local/bin/inventaire | at now + 2 hours\njob 3 at Sun Nov  8 21:00:00 2026\n$ atq\n```',
        },
        {
          id: 'c07-07-05', type: 'vrai-faux', niveau: 2, ref: '§7.6.4 et 7.8',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'La sortie d’un service déclenché par un timer est consultable avec `journalctl -u`.', vrai: true },
            { texte: '`Persistent=true` permet de rattraper une exécution manquée pendant un arrêt.', vrai: true },
            { texte: 'Pour un timer, on active (`enable`) le service et non le timer.', vrai: false },
            { texte: '`loginctl enable-linger lea` permet aux unités utilisateur de Léa de tourner sans qu’elle soit connectée.', vrai: true },
          ],
          indices: ['Avantage des timers : le journal.', 'Une seule affirmation est fausse.', 'C’est le timer qui déclenche.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
        {
          id: 'c07-07-06', type: 'commande', niveau: 3, ref: '§7.7.1, p. 188',
          enonce: 'Avec systemd, lance `/usr/local/bin/inventaire` **une seule fois, dans 30 minutes**, sans écrire d’unité.',
          accepte: ['(sudo )?systemd-run --on-active=["\']?30m(in)?["\']? /usr/local/bin/inventaire', '(sudo )?systemd-run --on-active ["\']?30m(in)?["\']? /usr/local/bin/inventaire', '(sudo )?systemd-run --on-active=["\']?1800s?["\']? /usr/local/bin/inventaire'],
          exemple: 'systemd-run --on-active=30m /usr/local/bin/inventaire',
          indices: ['`systemd-run` crée une unité transitoire.', 'Un délai relatif : `--on-active=`.', '`systemd-run --on-active=30m …`'],
          solution: '```\n# systemd-run --on-active=30m /usr/local/bin/inventaire\nRunning timer as unit: run-u42.timer\n```\nAvec une date : `--on-calendar=\'2026-11-14 18:00\'`.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '7.8',
      titre: 'Identifiants des utilisateurs : UID réel, effectif et sauvegardé',
      sections: '§7.9', pages: '189–192',
      objectif: 'Comprendre comment un processus change d’utilisateur, et la différence entre authentification et autorisation.',
      rappel: `
        Un processus n’a pas un mais **trois** UID :

        | UID | Rôle |
        |---|---|
        | **réel** (*ruid*) | qui a lancé le processus (qui en est « propriétaire » pour les signaux) |
        | **effectif** (*euid*) | qui le processus **est** pour les contrôles de droits (fichiers, actions) |
        | **sauvegardé** (*saved UID*) | un UID qu’il peut reprendre plus tard (permet d’abandonner puis retrouver des droits) |

        D’ordinaire, les trois sont égaux. Un programme **setuid** (fiche 2.11) change l’UID effectif : quand Léa lance
        \`passwd\` (setuid root), le processus a l’UID réel de Léa et l’UID effectif 0.

        \`\`\`
        $ ps -eo pid,euser,ruser,comm | grep passwd     # pendant qu’un passwd tourne
        4120 root     lea      passwd
        \`\`\`

        Seul root peut changer librement d’UID (appel système \`setuid()\`). C’est ce que font \`su\`, \`sudo\`, \`login\` ou
        sshd : ils s’exécutent en root, vérifient l’identité, puis **abandonnent** les droits pour devenir l’utilisateur.
        \`sudo\` met l’UID réel **et** effectif à 0 pour la commande lancée.

        ### Authentification, autorisation, identification

        - **Identification** : qui prétends-tu être ? (un nom)
        - **Authentification** : prouve-le (mot de passe, clé SSH). Le noyau ne s’en occupe **pas** : ce sont des programmes
          de l’espace utilisateur (login, sshd, sudo) qui le font, avec PAM (fiche 7.9).
        - **Autorisation** : qu’as-tu le droit de faire ? (permissions, sudoers)

        Pour traduire noms et UID, les programmes passent par la bibliothèque C et **NSS** (\`/etc/nsswitch.conf\`), qui
        consulte les fichiers locaux ou un annuaire (LDAP, SSSD). D’où \`getent\`.
      `,
      aRetenir: [
        'UID réel (qui a lancé), effectif (droits appliqués), sauvegardé (droits récupérables).',
        'setuid : l’UID effectif devient celui du propriétaire ; `ps -eo pid,euser,ruser,comm`.',
        'su, sudo, login, sshd : root qui vérifie puis devient l’utilisateur.',
        'Identification ≠ authentification (prouver) ≠ autorisation (droits) ; NSS, `getent`.',
      ],
      exercices: [
        {
          id: 'c07-08-01', type: 'association', niveau: 2, ref: '§7.9.2, p. 189–190',
          enonce: 'Associe chaque UID d’un processus à son rôle.',
          paires: [
            ['UID réel', 'L’utilisateur qui a lancé le processus'],
            ['UID effectif', 'L’identité utilisée pour vérifier les droits'],
            ['UID sauvegardé', 'Un UID que le processus peut reprendre plus tard'],
          ],
          indices: ['« réel » = la vraie personne derrière.', '« effectif » = ce qui compte pour les droits.', '« sauvegardé » = mis de côté.'],
          solution: 'Réel : qui l’a lancé ; effectif : droits appliqués ; sauvegardé : identité récupérable.',
        },
        {
          id: 'c07-08-02', type: 'qcm', niveau: 2, ref: '§7.9.2, p. 190',
          enonce: 'Léa lance `/usr/bin/passwd` (propriété de root, mode 4755). Quels sont l’UID réel et l’UID effectif du processus ?',
          choix: ['Réel : Léa ; effectif : root', 'Réel : root ; effectif : Léa', 'Les deux : Léa', 'Les deux : root'],
          reponse: 0,
          indices: ['C’est Léa qui a lancé la commande.', 'Le bit setuid change une seule des deux identités.', 'Laquelle sert aux contrôles de droits ?'],
          solution: 'Réel : Léa (qui l’a lancé) ; effectif : root (grâce au setuid). C’est ce qui permet à passwd d’écrire dans /etc/shadow tout en sachant quel mot de passe changer.',
        },
        {
          id: 'c07-08-03', type: 'commande', niveau: 2, ref: '§7.9.2, p. 190',
          enonce: 'Affiche pour chaque processus son PID, son utilisateur **effectif**, son utilisateur **réel** et le nom de sa commande.',
          accepte: ['ps -eo ?pid,euser,ruser,comm', 'ps -e -o ?pid,euser,ruser,comm', 'ps axo ?pid,euser,ruser,comm', 'ps -eo ?pid,euser,ruser,cmd', 'ps -eo ?pid,euid,ruid,comm'],
          exemple: 'ps -eo pid,euser,ruser,comm',
          indices: ['`-e` tous les processus, `-o` les colonnes.', 'Les colonnes : euser et ruser.', '`ps -eo pid,euser,ruser,comm`'],
          solution: '```\n$ ps -eo pid,euser,ruser,comm\n```\nLance `passwd` dans une autre session pour voir une ligne où euser ≠ ruser.',
        },
        {
          id: 'c07-08-04', type: 'association', niveau: 1, ref: '§7.9.3, p. 191',
          enonce: 'Associe chaque notion à la question à laquelle elle répond.',
          paires: [
            ['Identification', 'Qui prétends-tu être ?'],
            ['Authentification', 'Peux-tu le prouver ?'],
            ['Autorisation', 'Qu’as-tu le droit de faire ?'],
          ],
          indices: ['Identifier = nommer.', 'Authentifier = prouver.', 'Autoriser = permettre.'],
          solution: 'Identification (nom), authentification (preuve : mot de passe, clé), autorisation (droits).',
        },
        {
          id: 'c07-08-05', type: 'vrai-faux', niveau: 2, ref: '§7.9',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Le noyau vérifie lui-même les mots de passe des utilisateurs.', vrai: false, explication: 'Ce sont des programmes de l’espace utilisateur (login, sshd, sudo) avec PAM.' },
            { texte: 'Seul un processus d’UID effectif 0 peut changer librement d’UID.', vrai: true },
            { texte: '`getent passwd lea` passe par NSS et peut interroger un annuaire LDAP.', vrai: true },
            { texte: 'sshd tourne en root puis prend l’identité de l’utilisateur après authentification.', vrai: true },
          ],
          indices: ['Le noyau ne connaît que des UID.', 'Une seule affirmation est fausse.', 'NSS = Name Service Switch.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '7.9',
      titre: 'PAM : les modules d’authentification',
      sections: '§7.10', pages: '192–198',
      objectif: 'Lire une configuration PAM et appliquer une politique de mots de passe.',
      rappel: `
        **PAM** (*Pluggable Authentication Modules*) permet aux programmes (login, sshd, sudo, su, passwd…) de déléguer
        l’authentification à une pile de **modules** configurable, sans être recompilés.

        Configuration : un fichier par programme dans \`/etc/pam.d/\` (\`sshd\`, \`sudo\`, \`login\`…). Chaque ligne :

        \`\`\`
        # type       contrôle     module                 arguments
        auth         requisite    pam_shells.so
        auth         sufficient   pam_unix.so            nullok
        password     requisite    pam_pwquality.so       retry=3
        session      optional     pam_motd.so
        \`\`\`

        | Type | Rôle |
        |---|---|
        | \`auth\` | authentifier (mot de passe, clé…) |
        | \`account\` | le compte est-il autorisé maintenant ? (expiré, verrouillé, horaires) |
        | \`password\` | changer le mot de passe (et en vérifier la qualité) |
        | \`session\` | préparer la session (limites, répertoire, journalisation) |

        | Contrôle | Effet |
        |---|---|
        | \`requisite\` | si échec : refus **immédiat** |
        | \`required\` | si échec : refus, mais la pile continue (on ne révèle pas quel module a échoué) |
        | \`sufficient\` | si succès : accepté **immédiatement** (sauf un \`required\` déjà échoué) ; si échec : on continue |
        | \`optional\` | résultat ignoré (sauf s’il est le seul) |
        | \`include\` / \`substack\` | insérer un autre fichier (Debian : \`@include common-auth\`) |

        ### Modules utiles

        - \`pam_unix.so\` : mots de passe de \`/etc/shadow\`.
        - \`pam_pwquality.so\` : qualité des mots de passe, réglée dans \`/etc/security/pwquality.conf\` (\`minlen = 12\`…).
          Sur Debian, paquet \`libpam-pwquality\`.
        - \`pam_faillock.so\` : verrouillage après trop d’échecs (Rocky : \`authselect enable-feature with-faillock\`).
        - \`pam_limits.so\` : limites de ressources (\`/etc/security/limits.conf\`).

        ### Conseils (§7.10.2)

        Une erreur dans PAM peut **empêcher toute connexion**, y compris root. Garde une session root ouverte pendant tes
        essais, et teste depuis une **autre** session. Sur Rocky, la configuration commune est générée par **authselect** :
        ne modifie pas \`system-auth\` à la main. Pour savoir quels fichiers utilisent un module :
        \`grep pam_unix /etc/pam.d/*\`.
      `,
      aRetenir: [
        '`/etc/pam.d/programme` ; ligne : type, contrôle, module, arguments.',
        'Types : auth, account, password, session.',
        'requisite (refus immédiat), required (refus à la fin), sufficient (succès immédiat), optional.',
        '`pam_unix`, `pam_pwquality` (`/etc/security/pwquality.conf`), `pam_faillock` ; tester dans une autre session.',
      ],
      exercices: [
        {
          id: 'c07-09-01', type: 'association', niveau: 1, ref: '§7.10.1, p. 194',
          enonce: 'Associe chaque type de ligne PAM à son rôle.',
          paires: [
            ['`auth`', 'Vérifier l’identité de l’utilisateur'],
            ['`account`', 'Vérifier que le compte est autorisé (expiration, verrouillage)'],
            ['`password`', 'Changer le mot de passe'],
            ['`session`', 'Préparer et clore la session'],
          ],
          indices: ['auth = authentification.', 'account = état du compte.', 'session = ce qui entoure la connexion.'],
          solution: 'auth, account, password, session.',
        },
        {
          id: 'c07-09-02', type: 'association', niveau: 2, ref: '§7.10.1, p. 194–195',
          enonce: 'Associe chaque mot-clé de contrôle à son effet.',
          paires: [
            ['`requisite`', 'Un échec entraîne un refus immédiat'],
            ['`required`', 'Un échec entraîne un refus, mais la pile continue'],
            ['`sufficient`', 'Un succès suffit à accepter, sauf échec d’un module requis précédent'],
            ['`optional`', 'Le résultat est en général ignoré'],
          ],
          indices: ['requisite est le plus brutal.', 'required masque quel module a échoué.', 'sufficient court-circuite en cas de succès.'],
          solution: 'requisite (refus immédiat), required (refus différé), sufficient (succès immédiat), optional (ignoré).',
        },
        {
          id: 'c07-09-03', type: 'trous', niveau: 2,
          enonce: 'Dans `/etc/security/pwquality.conf`, exige des mots de passe d’au moins **12** caractères, avec au moins **un chiffre** (crédit négatif = obligation).',
          texte: '[[1]] = 12\ndcredit = [[2]]',
          trous: [
            { accepte: ['minlen'], exemple: 'minlen' },
            { accepte: ['-1'], exemple: '-1' },
          ],
          indices: ['La longueur minimale : *min length*.', 'Un crédit négatif impose un minimum de ce type de caractère.', 'Au moins un chiffre : −1.'],
          solution: '```\nminlen = 12\ndcredit = -1\n```\nLe module `pam_pwquality.so` (ligne `password`) applique ces règles à `passwd`.',
        },
        {
          id: 'c07-09-04', type: 'commande', niveau: 2, ref: '§7.10.3, p. 197',
          enonce: 'Trouve tous les fichiers de `/etc/pam.d/` qui utilisent le module `pam_unix`.',
          accepte: ['(sudo )?grep (-[lrH]+ )?pam_unix(\\.so)? /etc/pam\\.d/\\*', '(sudo )?grep -[rlH]*r[rlH]* pam_unix(\\.so)? /etc/pam\\.d/?', '(sudo )?grep ["\']?password\\.\\*unix["\']? /etc/pam\\.d/\\*'],
          exemple: 'grep pam_unix /etc/pam.d/*',
          indices: ['C’est une recherche de texte dans plusieurs fichiers.', '`grep motif fichiers`.', '`grep pam_unix /etc/pam.d/*`'],
          solution: '```\n$ grep pam_unix /etc/pam.d/*\n/etc/pam.d/common-auth:auth [success=1 default=ignore] pam_unix.so nullok\n…\n```\nSur Debian, les fichiers `common-*` sont inclus par les autres ; sur Rocky, ce sont `system-auth` et `password-auth`.',
        },
        {
          id: 'c07-09-05', type: 'qcm', niveau: 2, ref: '§7.10.2, p. 196',
          enonce: 'Tu t’apprêtes à modifier la configuration PAM de sshd sur un serveur distant. Quelle précaution est essentielle ?',
          choix: [
            'Garder une session root ouverte et tester la connexion depuis une autre session avant de fermer',
            'Redémarrer le serveur juste après la modification',
            'Désactiver le pare-feu',
            'Supprimer les autres fichiers de /etc/pam.d',
          ],
          reponse: 0,
          indices: ['Une erreur PAM peut bloquer toutes les connexions.', 'Comment réparer si plus personne ne peut se connecter ?', 'Une session déjà ouverte n’est pas affectée.'],
          solution: 'Garde une **session root ouverte** (non affectée par le changement) et teste depuis une **nouvelle** connexion. Sur une VM, un instantané avant modification complète la sécurité.',
        },
        {
          id: 'c07-09-06', type: 'vrai-faux', niveau: 2, ref: '§7.10',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'PAM permet de changer la méthode d’authentification sans recompiler les programmes.', vrai: true },
            { texte: 'Sur Rocky, on modifie `/etc/pam.d/system-auth` à la main sans précaution.', vrai: false, explication: 'Il est généré par authselect : tes modifications seraient écrasées. Utilise authselect.' },
            { texte: 'Une ligne `@include common-auth` (Debian) insère un autre fichier de configuration.', vrai: true },
            { texte: 'pam_faillock peut verrouiller un compte après plusieurs échecs.', vrai: true },
          ],
          indices: ['Pluggable = enfichable.', 'Une seule affirmation est fausse.', 'authselect gère la configuration commune sur Rocky.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'journalctl : depuis 4 h ? un service ? erreurs ? démarrage précédent ?', r: '`-S -4h` ; `-u service` ; `-p err` ; `-b -1`.' },
    { q: 'Priorités syslog 0 à 7 ?', r: 'emerg, alert, crit, err, warning, notice, info, debug.' },
    { q: 'Rendre le journal systemd persistant ?', r: 'Créer `/var/log/journal` ou `Storage=persistent` dans journald.conf.' },
    { q: 'Simuler une configuration logrotate ?', r: '`logrotate -d /etc/logrotate.d/fichier`' },
    { q: 'Écrire dans le journal depuis un script ?', r: '`logger -p local0.warning -t nom "message"`' },
    { q: 'Champs de /etc/passwd ?', r: 'nom:x:UID:GID:GECOS:répertoire:shell.' },
    { q: 'Que signifie « ! » au début de l’empreinte dans /etc/shadow ?', r: 'Compte verrouillé (passwd -l).' },
    { q: 'Ajouter un utilisateur à un groupe sans retirer les autres ?', r: '`usermod -aG groupe utilisateur` (sans -a, les groupes sont remplacés).' },
    { q: 'Créer un compte avec répertoire et shell bash ?', r: '`useradd -m -s /bin/bash -G groupe nom`' },
    { q: 'Expiration du mot de passe à 90 jours ?', r: '`chage -M 90 nom` ; `chage -l nom` pour voir.' },
    { q: 'UID de root ? de nobody ? des humains ?', r: '0 ; 65534 ; à partir de 1000.' },
    { q: 'Fuseau horaire avec systemd ?', r: '`timedatectl set-timezone Europe/Paris`' },
    { q: 'Temps Unix ?', r: 'Secondes depuis le 1ᵉʳ janvier 1970 UTC (`date +%s`).' },
    { q: 'Champs d’une ligne crontab ?', r: 'minute, heure, jour du mois, mois, jour de semaine, commande.' },
    { q: 'Différence /etc/cron.d et crontab -e ?', r: 'Les fichiers système ont un champ utilisateur avant la commande.' },
    { q: 'Les deux unités d’un timer ?', r: 'nom.timer (OnCalendar, Persistent, WantedBy=timers.target) + nom.service.' },
    { q: 'Voir les prochaines exécutions des timers ?', r: '`systemctl list-timers`' },
    { q: 'Tâche unique dans 2 h ?', r: '`echo cmd | at now + 2 hours` ou `systemd-run --on-active=2h cmd`.' },
    { q: 'UID réel vs effectif ?', r: 'Réel : qui a lancé ; effectif : identité pour les droits (setuid change l’effectif).' },
    { q: 'Les quatre types PAM ?', r: 'auth, account, password, session.' },
    { q: 'requisite vs required ?', r: 'requisite : refus immédiat ; required : refus mais la pile continue.' },
    { q: 'Longueur minimale des mots de passe ?', r: '`minlen` dans `/etc/security/pwquality.conf` (module pam_pwquality).' },
  ],
  memo: `
    ### Journaux
    \`\`\`
    journalctl -S -4h | -S 06:00 -U 08:00 | -u unité | -p err | -b [-1] | --list-boots | -r | -f | -g motif | -t étiquette
    journalctl --disk-usage   --vacuum-size=200M   --vacuum-time=4weeks
    /etc/systemd/journald.conf : Storage=persistent  SystemMaxUse=…
    logrotate -d /etc/logrotate.d/x     logger -p local0.warning -t nom "msg"
    \`\`\`
    Priorités : 0 emerg · 1 alert · 2 crit · 3 err · 4 warning · 5 notice · 6 info · 7 debug

    ### Comptes
    \`\`\`
    /etc/passwd  nom:x:UID:GID:GECOS:rép:shell      /etc/shadow  nom:empreinte:dernier:min:max:avert:…
    useradd -m -s /bin/bash -c "Nom" -G grp nom   passwd nom   usermod -aG grp nom   userdel -r nom
    passwd -l nom   usermod -L nom   chage -M 90 nom   chage -l nom   getent passwd nom
    groupadd grp   gpasswd -a nom grp   gpasswd -d nom grp   getent group grp   id nom
    \`\`\`

    ### Heure
    \`\`\`
    date   date +%s   TZ=America/Montreal date   timedatectl   timedatectl set-timezone Europe/Paris
    hwclock --systohc --utc   chronyc sources (Rocky)
    \`\`\`

    ### Planification
    \`\`\`
    crontab -e | -l | -r      m h jdm mois jds commande      */10  1-5  1,15
    /etc/crontab et /etc/cron.d/ : … utilisateur commande
    [Timer] OnCalendar=Mon..Fri *-*-* 02:30:00  Persistent=true   [Install] WantedBy=timers.target
    systemctl enable --now x.timer   systemctl list-timers   systemd-analyze calendar "…"
    echo cmd | at now + 2 hours   atq   atrm N   systemd-run --on-active=30m cmd
    loginctl enable-linger nom
    \`\`\`

    ### Identités et PAM
    \`\`\`
    ps -eo pid,euser,ruser,comm
    /etc/pam.d/x : type (auth|account|password|session) contrôle (requisite|required|sufficient|optional) module args
    /etc/security/pwquality.conf : minlen = 12  dcredit = -1
    grep pam_unix /etc/pam.d/*
    \`\`\`
  `,
});
