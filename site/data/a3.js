/* Module A3 (hors livre) : contrôle d'accès obligatoire avec SELinux et AppArmor. */
HLW.chapitre({
  id: 'A3',
  intro: `
    Les permissions Unix (chapitre 2) laissent le **propriétaire** d’un fichier décider qui y accède : c’est le
    contrôle d’accès **discrétionnaire**. Un service compromis qui tourne en root peut donc tout faire. Le
    contrôle d’accès **obligatoire** ajoute une politique imposée par le système, que même root ne contourne
    pas : **SELinux** sur Rocky (fut), **AppArmor** sur Debian (cuve).

    Le réflexe à acquérir : quand « les droits sont bons mais ça ne marche pas », regarder le journal
    d’audit **avant** de penser à désactiver quoi que ce soit. C’est un objectif majeur du RHCSA.
  `,
  objectifs: [
    'distinguer contrôle discrétionnaire et obligatoire, SELinux et AppArmor ;',
    'connaître et changer le mode de SELinux, temporairement et de façon permanente ;',
    'lire les contextes SELinux et rétablir le bon étiquetage d’un fichier de façon durable ;',
    'utiliser les booléens et l’étiquetage des ports ;',
    'diagnostiquer un refus avec le journal d’audit, sans désactiver la protection ;',
    'connaître l’état des profils AppArmor et les passer en mode plainte ou application.',
  ],
  certifs: { lfcs: ['OD'], rhcsa: ['R10'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: 'A3.1',
      titre: 'Contrôle obligatoire et modes de SELinux',
      objectif: 'Savoir dans quel état est SELinux et le changer sans tout casser.',
      rappel: `
        | | Discrétionnaire (DAC) | Obligatoire (MAC) |
        |---|---|---|
        | Qui décide | le propriétaire (chmod, chown) | une politique système |
        | root | passe outre | soumis à la politique |
        | Exemples | permissions, ACL | SELinux (Rocky, RHEL, Fedora), AppArmor (Debian, Ubuntu, SUSE) |

        Les deux s’**ajoutent** : un accès doit être permis par les permissions Unix **et** par la politique.

        ### Les trois modes de SELinux

        | Mode | Effet |
        |---|---|
        | **enforcing** | la politique est appliquée et les refus sont journalisés |
        | **permissive** | rien n’est bloqué, mais les refus sont journalisés (diagnostic) |
        | **disabled** | SELinux est éteint (déconseillé : réactiver impose un réétiquetage complet) |

        \`\`\`
        $ getenforce                       # Enforcing
        $ sestatus                         # détail : politique « targeted », modes actuel et configuré
        $ sudo setenforce 0                # permissive jusqu'au prochain démarrage (1 = enforcing)
        $ grep ^SELINUX= /etc/selinux/config     # mode au démarrage : SELINUX=enforcing
        \`\`\`

        La politique par défaut de Rocky, **targeted**, confine les **services** exposés (httpd, sshd, named…) ;
        les sessions des utilisateurs sont peu restreintes (\`unconfined_t\`). Passer en permissive pour un essai
        de quelques minutes est un outil de diagnostic ; laisser une machine en permissive ou disabled ne l’est pas.
      `,
      aRetenir: [
        'DAC (propriétaire) + MAC (politique imposée, même à root) : les deux doivent autoriser.',
        'Modes : enforcing, permissive (journalise sans bloquer), disabled.',
        '`getenforce`, `sestatus`, `setenforce 0|1` (temporaire), /etc/selinux/config (permanent).',
        'Politique targeted : confine les services.',
      ],
      exercices: [
        {
          id: 'cA3-01-01', type: 'commande', niveau: 1,
          enonce: 'Affiche le mode actuel de SELinux en un mot.',
          accepte: ['getenforce'],
          exemple: 'getenforce',
          indices: ['get + enforce.', 'Une commande sans argument.', '`getenforce`'],
          solution: '```\n$ getenforce\nEnforcing\n```',
        },
        {
          id: 'cA3-01-02', type: 'association', niveau: 1,
          enonce: 'Associe chaque mode SELinux à son comportement.',
          paires: [['enforcing', 'Bloque et journalise'], ['permissive', 'Journalise sans bloquer'], ['disabled', 'Ni blocage ni journal']],
          indices: ['enforce = appliquer.', 'permissive = laisser faire.', 'disabled = éteint.'],
          solution: 'enforcing bloque et journalise ; permissive journalise seulement ; disabled ne fait rien.',
        },
        {
          id: 'cA3-01-03', type: 'commande', niveau: 1,
          enonce: 'Passe SELinux en mode permissif jusqu’au prochain redémarrage (pour un diagnostic).',
          accepte: ['(sudo )?setenforce 0', '(sudo )?setenforce [Pp]ermissive'],
          exemple: 'setenforce 0',
          indices: ['set + enforce.', '0 = permissive, 1 = enforcing.', '`setenforce 0`'],
          solution: '```\n$ sudo setenforce 0\n$ getenforce\nPermissive\n```\nNe pas oublier `setenforce 1` après le diagnostic.',
        },
        {
          id: 'cA3-01-04', type: 'qcm', niveau: 2,
          enonce: 'Un fichier `/srv/vitrine/index.html` est en 644, propriétaire root. Le service web (qui tourne en root) reçoit pourtant « Permission denied ». Qu’est-ce qui peut l’expliquer ?',
          choix: [
            'La politique SELinux interdit au type du service web de lire le type de ce fichier',
            'Les permissions 644 interdisent la lecture à root',
            'root ne peut jamais lire /srv',
            'Le fichier est trop gros',
          ],
          reponse: 0,
          indices: ['Les permissions Unix sont bonnes.', 'Il existe une seconde couche de contrôle.', 'Même root y est soumis.'],
          solution: 'Le contrôle obligatoire s’ajoute aux permissions : si le contexte du fichier ne correspond pas à ce que la politique autorise pour le service, l’accès est refusé, même en root. Fiche A3.2 pour la correction.',
        },
        {
          id: 'cA3-01-05', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`setenforce 0` modifie /etc/selinux/config.', vrai: false, explication: 'Le changement est temporaire ; le fichier fixe le mode au démarrage.' },
            { texte: 'En mode permissive, les refus sont tout de même journalisés.', vrai: true },
            { texte: 'Passer de disabled à enforcing impose de réétiqueter tout le système de fichiers.', vrai: true },
            { texte: 'Debian utilise AppArmor par défaut, pas SELinux.', vrai: true },
          ],
          indices: ['setenforce agit sur le noyau en cours.', 'Une seule fausse.', 'disabled = plus aucune étiquette maintenue.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A3.2',
      titre: 'Contextes SELinux et étiquetage des fichiers',
      objectif: 'Lire une étiquette et rétablir la bonne, de façon durable.',
      rappel: `
        Chaque fichier et chaque processus porte un **contexte** \`utilisateur:rôle:type:niveau\`. Dans la
        politique targeted, c’est le **type** qui compte : la politique dit quel type de processus peut faire
        quoi sur quel type de fichier.

        \`\`\`
        $ ls -Z /var/www/html/index.html
        system_u:object_r:httpd_sys_content_t:s0 /var/www/html/index.html
        $ ps -eZ | grep httpd
        system_u:system_r:httpd_t:s0     1234 ?  00:00:00 httpd
        $ id -Z                                   # ton propre contexte
        \`\`\`

        Ici, \`httpd_t\` a le droit de lire \`httpd_sys_content_t\`. Un fichier créé dans \`/srv/vitrine\` reçoit
        un type générique (\`var_t\`) que httpd ne peut pas lire.

        ### Corriger durablement

        La politique contient une table « tel chemin → tel type ». On ajoute une règle, puis on applique :

        \`\`\`
        $ sudo semanage fcontext -a -t httpd_sys_content_t '/srv/vitrine(/.*)?'
        $ sudo restorecon -Rv /srv/vitrine
        $ semanage fcontext -l | grep vitrine
        \`\`\`

        - **\`restorecon\`** remet l’étiquette prévue par la table (le premier réflexe après un doute).
        - **\`chcon -t type fichier\`** change l’étiquette **sans** toucher la table : un \`restorecon\` ou un
          réétiquetage l’efface. À réserver aux essais.
        - **\`mv\`** garde l’étiquette d’origine, **\`cp\`** prend celle du répertoire de destination : un
          fichier préparé dans ton répertoire personnel puis **déplacé** vers /var/www garde un mauvais type.
        - \`semanage\` vient du paquet \`policycoreutils-python-utils\`.
      `,
      aRetenir: [
        'Contexte utilisateur:rôle:**type**:niveau ; `ls -Z`, `ps -eZ`, `id -Z`.',
        'Durable : `semanage fcontext -a -t TYPE \'/chemin(/.*)?\'` puis `restorecon -Rv /chemin`.',
        '`chcon` = temporaire ; `restorecon` = remettre l’étiquette prévue.',
        'mv garde l’étiquette, cp hérite de la destination.',
      ],
      exercices: [
        {
          id: 'cA3-02-01', type: 'commande', niveau: 1,
          enonce: 'Affiche le contexte SELinux du fichier `/var/www/html/index.html`.',
          accepte: ['ls -Z /var/www/html/index\\.html', 'ls -lZ /var/www/html/index\\.html', 'ls -Zl /var/www/html/index\\.html', 'stat -c ?%C /var/www/html/index\\.html'],
          exemple: 'ls -Z /var/www/html/index.html',
          indices: ['ls a une option pour les contextes.', 'Z majuscule.', '`ls -Z …`'],
          solution: '```\n$ ls -Z /var/www/html/index.html\nsystem_u:object_r:httpd_sys_content_t:s0 /var/www/html/index.html\n```',
        },
        {
          id: 'cA3-02-02', type: 'ordre', niveau: 2,
          enonce: 'La vitrine sert désormais `/srv/vitrine`. Remets dans l’ordre la correction **durable** de l’étiquetage.',
          elements: [
            'ls -Z /srv/vitrine (constater le type var_t)',
            "semanage fcontext -a -t httpd_sys_content_t '/srv/vitrine(/.*)?'",
            'restorecon -Rv /srv/vitrine',
            'ls -Z /srv/vitrine et tester la page',
          ],
          indices: ['Constater d’abord.', 'Ajouter la règle à la table.', 'Appliquer, puis vérifier.'],
          solution: 'Constater → règle `semanage fcontext` → `restorecon -Rv` → vérifier.',
        },
        {
          id: 'cA3-02-03', type: 'commande', niveau: 2,
          enonce: 'Remets récursivement, en affichant les changements, les étiquettes prévues par la politique sur `/var/www/html`.',
          accepte: ['(sudo )?restorecon -Rv /var/www/html/?', '(sudo )?restorecon -vR /var/www/html/?', '(sudo )?restorecon -R -v /var/www/html/?', '(sudo )?restorecon -v -R /var/www/html/?', '(sudo )?restorecon -RvF /var/www/html/?'],
          exemple: 'restorecon -Rv /var/www/html',
          indices: ['restore + context.', '-R récursif, -v bavard.', '`restorecon -Rv /var/www/html`'],
          solution: '```\n$ sudo restorecon -Rv /var/www/html\nRelabeled /var/www/html/index.html from unconfined_u:object_r:user_home_t:s0 to unconfined_u:object_r:httpd_sys_content_t:s0\n```',
        },
        {
          id: 'cA3-02-04', type: 'qcm', niveau: 2,
          enonce: 'Malik a préparé `index.html` dans son répertoire personnel, puis l’a **déplacé** avec `mv` dans /var/www/html. La page renvoie 403. Pourquoi ?',
          choix: [
            'mv conserve l’étiquette d’origine (user_home_t), que httpd n’a pas le droit de lire',
            'mv retire le droit de lecture',
            'Le fichier est vide après mv',
            'httpd doit être réinstallé',
          ],
          reponse: 0,
          indices: ['Compare mv et cp.', 'Un déplacement garde les attributs.', 'ls -Z le confirmerait.'],
          solution: 'Un déplacement sur le même système de fichiers garde l’étiquette `user_home_t`. `restorecon -v /var/www/html/index.html` corrige. Avec `cp`, le fichier aurait pris l’étiquette du répertoire.',
        },
        {
          id: 'cA3-02-05', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Une étiquette posée avec chcon disparaît au prochain restorecon.', vrai: true },
            { texte: 'Dans la politique targeted, c’est surtout le type (…_t) qui décide des accès.', vrai: true },
            { texte: '`semanage fcontext -a` réétiquette immédiatement les fichiers existants.', vrai: false, explication: 'Il modifie la table ; restorecon applique.' },
            { texte: '`ps -eZ` affiche le contexte des processus.', vrai: true },
          ],
          indices: ['chcon ne touche pas la table.', 'Une seule fausse.', 'semanage + restorecon vont ensemble.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A3.3',
      titre: 'Booléens et ports',
      objectif: 'Autoriser un comportement prévu par la politique, ou un port non standard.',
      rappel: `
        La politique prévoit des **interrupteurs** : les **booléens**. Ils activent des comportements courants
        mais non souhaités par défaut.

        \`\`\`
        $ getsebool -a | grep httpd
        httpd_can_network_connect --> off
        httpd_enable_homedirs --> off
        $ semanage boolean -l | grep httpd_can_network_connect     # avec une description
        $ sudo setsebool -P httpd_can_network_connect on            # -P : permanent
        \`\`\`

        Sans **\`-P\`**, le changement est perdu au redémarrage.

        ### Les ports ont aussi un type

        Un service confiné ne peut écouter que sur des ports d’un type autorisé :

        \`\`\`
        $ semanage port -l | grep -w http_port_t
        http_port_t   tcp   80, 81, 443, 488, 8008, 8009, 8443, 9000
        $ sudo semanage port -a -t http_port_t -p tcp 8081      # autoriser httpd sur 8081
        $ sudo semanage port -l -C                             # seulement les ajouts locaux
        \`\`\`

        Pour sshd sur un port non standard : \`semanage port -a -t ssh_port_t -p tcp 2222\`, **et** ouvrir le
        pare-feu (module A2). Deux couches, deux réglages.
      `,
      aRetenir: [
        '`getsebool -a`, `semanage boolean -l`, `setsebool -P nom on` (-P = permanent).',
        '`semanage port -l`, `semanage port -a -t TYPE -p tcp PORT`.',
        'Port non standard = étiquette SELinux + règle de pare-feu.',
      ],
      exercices: [
        {
          id: 'cA3-03-01', type: 'commande', niveau: 1,
          enonce: 'Autorise **de façon permanente** le service web à ouvrir des connexions réseau (booléen `httpd_can_network_connect`).',
          accepte: ['(sudo )?setsebool -P httpd_can_network_connect (on|1|true)', '(sudo )?semanage boolean -m --on httpd_can_network_connect', '(sudo )?semanage boolean -m -1 httpd_can_network_connect'],
          exemple: 'setsebool -P httpd_can_network_connect on',
          pieges: [{ motif: '(sudo )?setsebool httpd_can_network_connect (on|1|true)', message: 'Sans -P, le réglage est perdu au redémarrage.' }],
          indices: ['set + se + bool.', 'Une option rend le changement permanent.', '`setsebool -P … on`'],
          solution: '```\n$ sudo setsebool -P httpd_can_network_connect on\n$ getsebool httpd_can_network_connect\nhttpd_can_network_connect --> on\n```',
        },
        {
          id: 'cA3-03-02', type: 'commande', niveau: 2,
          enonce: 'Autorise SSH à écouter sur le port TCP 2222 du point de vue de SELinux.',
          accepte: ['(sudo )?semanage port -a -t ssh_port_t -p tcp 2222', '(sudo )?semanage port --add --type ssh_port_t --proto tcp 2222', '(sudo )?semanage port -a -p tcp -t ssh_port_t 2222'],
          exemple: 'semanage port -a -t ssh_port_t -p tcp 2222',
          indices: ['semanage port.', '-a ajoute, -t le type, -p le protocole.', 'Le type des ports SSH : ssh_port_t.'],
          solution: '```\n$ sudo semanage port -a -t ssh_port_t -p tcp 2222\n$ semanage port -l | grep ssh_port_t\nssh_port_t   tcp   2222, 22\n```\nPuis le pare-feu : `firewall-cmd --permanent --add-port=2222/tcp`.',
        },
        {
          id: 'cA3-03-03', type: 'qcm', niveau: 2,
          enonce: 'Après avoir mis `Listen 8081` dans la configuration du serveur web, `systemctl start httpd` échoue avec « Permission denied: could not bind to address 0.0.0.0:8081 ». Le port est libre. Que faire ?',
          choix: [
            'Donner au port 8081 le type http_port_t avec semanage port',
            'Lancer httpd en root',
            'Ouvrir 8081 dans firewalld',
            'Passer SELinux en disabled',
          ],
          reponse: 0,
          indices: ['Le refus arrive avant tout trafic réseau.', 'Le pare-feu ne bloque pas l’écoute.', 'Le port n’a pas le bon type.'],
          solution: '`semanage port -a -t http_port_t -p tcp 8081`. Le pare-feu concerne les connexions entrantes, pas le droit d’ouvrir le port ; il faudra aussi l’ouvrir pour les clients.',
        },
        {
          id: 'cA3-03-04', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`setsebool` sans -P agit tout de suite mais pas après un redémarrage.', vrai: true },
            { texte: '`semanage port -l -C` montre seulement les modifications locales.', vrai: true },
            { texte: 'Étiqueter le port 2222 en ssh_port_t suffit à le rendre joignable depuis le réseau.', vrai: false, explication: 'Le pare-feu doit aussi l’autoriser.' },
            { texte: '`semanage boolean -l` affiche une description de chaque booléen.', vrai: true },
          ],
          indices: ['-P = persistant.', 'Une seule fausse.', 'Deux couches.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A3.4',
      titre: 'Diagnostiquer un refus sans désactiver la protection',
      objectif: 'Trouver le refus, le comprendre, et appliquer la correction la plus étroite.',
      rappel: `
        Les refus SELinux sont des événements **AVC** écrits par auditd dans \`/var/log/audit/audit.log\`.

        \`\`\`
        $ sudo ausearch -m AVC -ts recent              # refus des 10 dernières minutes
        type=AVC msg=audit(…): avc:  denied  { read } for  pid=2412 comm="httpd" name="index.html"
             scontext=system_u:system_r:httpd_t:s0 tcontext=unconfined_u:object_r:user_home_t:s0 tclass=file
        $ sudo ausearch -m AVC -ts recent | audit2why  # explication et piste de correction
        $ sudo sealert -a /var/log/audit/audit.log     # paquet setroubleshoot-server : conseils détaillés
        $ sudo journalctl -t setroubleshoot --since today
        \`\`\`

        Lecture d’un refus : **qui** (\`comm\`, \`scontext\` : le type du processus), **quoi** (\`{ read }\`),
        **sur quoi** (\`name\`, \`tcontext\` : le type de la cible, \`tclass\`).

        ### La correction la plus étroite d’abord

        1. mauvaise **étiquette** de fichier → \`restorecon\` ou \`semanage fcontext\` (A3.2) ;
        2. comportement prévu mais désactivé → **booléen** (A3.3) ;
        3. port non standard → \`semanage port\` (A3.3) ;
        4. seulement en dernier recours, et après avoir compris, un **module local** généré par \`audit2allow\`
           (\`audit2allow -a -M monmodule\`, puis relecture du fichier \`.te\` avant \`semodule -i\`).

        Ce qu’on ne fait pas : \`setenforce 0\` « pour que ça marche », ni \`SELINUX=disabled\`. On peut en
        revanche passer brièvement en permissive pour **voir tous les refus d’un coup**, puis revenir en
        enforcing.
      `,
      aRetenir: [
        'Refus = événements AVC ; `ausearch -m AVC -ts recent`, `audit2why`, `sealert -a`.',
        'Lire scontext (processus), permission, tcontext (cible), tclass.',
        'Ordre : étiquette → booléen → port → (dernier recours, relu) module audit2allow.',
        'Jamais « setenforce 0 » comme solution.',
      ],
      exercices: [
        {
          id: 'cA3-04-01', type: 'commande', niveau: 1,
          enonce: 'Affiche les refus SELinux (AVC) des dernières minutes.',
          accepte: ['(sudo )?ausearch -m (AVC|avc)( -ts recent)?', '(sudo )?ausearch -m (AVC|avc),USER_AVC( -ts recent)?', '(sudo )?ausearch -ts recent -m (AVC|avc)', '(sudo )?ausearch --message (AVC|avc) --start recent'],
          exemple: 'ausearch -m AVC -ts recent',
          indices: ['L’outil de recherche du journal d’audit.', '-m pour le type de message.', '-ts recent pour les 10 dernières minutes.'],
          solution: '```\n$ sudo ausearch -m AVC -ts recent\n```',
        },
        {
          id: 'cA3-04-02', type: 'association', niveau: 2,
          enonce: 'Dans ce refus, associe chaque champ à ce qu’il indique :\n\n`avc: denied { write } for comm="vitrine" scontext=…:container_t:… tcontext=…:var_t:… tclass=dir`',
          paires: [['comm / scontext', 'Le processus et son type'], ['{ write }', 'L’action refusée'], ['tcontext', 'Le type de la cible'], ['tclass', 'La nature de la cible']],
          indices: ['s = source, t = target.', 'Entre accolades : la permission.', 'tclass = file, dir, tcp_socket…'],
          solution: 'comm/scontext : qui ; { write } : quoi ; tcontext : le type de la cible ; tclass : fichier, répertoire, socket…',
        },
        {
          id: 'cA3-04-03', type: 'qcm', niveau: 2,
          enonce: 'Le refus ci-dessus concerne un conteneur qui écrit dans un volume `/srv/vitrine/donnees` étiqueté `var_t`. Quelle correction est la plus étroite ?',
          choix: [
            'Monter le volume avec l’option :Z, qui lui donne une étiquette accessible à ce conteneur',
            'setenforce 0',
            'Générer un module audit2allow qui permet à container_t d’écrire dans var_t',
            'chmod 777 /srv/vitrine/donnees',
          ],
          reponse: 0,
          indices: ['C’est un problème d’étiquette.', 'Podman sait réétiqueter un volume.', 'Un module audit2allow ouvrirait tous les var_t à tous les conteneurs.'],
          solution: 'L’étiquette est en cause : `:Z` réétiquette le volume pour ce seul conteneur (fiche 17.A, Lab 12). Un module « container_t peut écrire var_t » serait beaucoup trop large.',
        },
        {
          id: 'cA3-04-04', type: 'commande', niveau: 2,
          enonce: 'Fais expliquer par l’outil dédié les refus AVC récents (en le branchant sur ausearch).',
          accepte: ['(sudo )?ausearch -m (AVC|avc) -ts recent \\| (sudo )?audit2why', '(sudo )?ausearch -m (AVC|avc) \\| (sudo )?audit2why', '(sudo )?ausearch -ts recent -m (AVC|avc) \\| (sudo )?audit2why', '(sudo )?audit2why -a'],
          exemple: 'ausearch -m AVC -ts recent | audit2why',
          indices: ['audit2… why.', 'Il lit des refus sur son entrée standard.', 'Un tube depuis ausearch.'],
          solution: '```\n$ sudo ausearch -m AVC -ts recent | audit2why\n   Was caused by:\n   Missing type enforcement (TE) allow rule.\n   …\n```\nPour un booléen manquant, audit2why le nomme directement.',
        },
        {
          id: 'cA3-04-05', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Les refus SELinux sont écrits dans /var/log/audit/audit.log.', vrai: true },
            { texte: 'Un module audit2allow doit être relu avant d’être chargé.', vrai: true },
            { texte: 'Mettre SELINUX=disabled est la solution recommandée quand une application ne fonctionne pas.', vrai: false },
            { texte: 'Passer quelques minutes en permissive permet de voir tous les refus d’un scénario d’un coup.', vrai: true },
          ],
          indices: ['auditd journalise les AVC.', 'Une seule fausse.', 'Le diagnostic n’est pas la solution.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A3.5',
      titre: 'AppArmor sur Debian',
      objectif: 'Connaître l’état d’AppArmor et diagnostiquer un refus sur cuve.',
      rappel: `
        **AppArmor** (actif par défaut sur Debian et Ubuntu) confine des programmes par des **profils** fondés sur
        les **chemins** (et non sur des étiquettes) : « ce programme peut lire tel chemin, écrire tel autre ».

        \`\`\`
        $ sudo aa-status                     # profils chargés, en mode enforce ou complain, processus confinés
        $ ls /etc/apparmor.d/                # profils (usr.sbin.cupsd, usr.bin.man, …)
        $ sudo apt install apparmor-utils    # aa-complain, aa-enforce, aa-logprof…
        \`\`\`

        | Mode | Effet |
        |---|---|
        | **enforce** | applique le profil et journalise les refus |
        | **complain** | journalise sans bloquer (équivalent du permissive de SELinux, mais par profil) |

        \`\`\`
        $ sudo aa-complain /usr/sbin/cupsd              # passer un profil en complain
        $ sudo aa-enforce /usr/sbin/cupsd               # revenir en enforce
        $ sudo journalctl -k | grep 'apparmor="DENIED"'  # refus (profile=, operation=, name=)
        $ sudo apparmor_parser -r /etc/apparmor.d/usr.sbin.cupsd    # recharger un profil modifié
        \`\`\`

        Les ajouts locaux à un profil se placent dans \`/etc/apparmor.d/local/\`, inclus par le profil, pour
        ne pas être écrasés par les mises à jour du paquet. \`aa-logprof\` propose des règles à partir des refus.
      `,
      aRetenir: [
        'AppArmor : profils par chemins ; Debian/Ubuntu ; /etc/apparmor.d/.',
        '`aa-status` ; modes enforce / complain (`aa-enforce`, `aa-complain`, paquet apparmor-utils).',
        'Refus : `journalctl -k | grep apparmor="DENIED"` ; `apparmor_parser -r` pour recharger.',
        'Ajouts locaux dans /etc/apparmor.d/local/.',
      ],
      exercices: [
        {
          id: 'cA3-05-01', type: 'commande', niveau: 1,
          enonce: 'Sur cuve, affiche l’état d’AppArmor (profils chargés et leurs modes).',
          accepte: ['(sudo )?aa-status', '(sudo )?apparmor_status', '(sudo )?aa-status --verbose'],
          exemple: 'aa-status',
          indices: ['Les outils AppArmor commencent par aa-.', 'status.', '`aa-status`'],
          solution: '```\n$ sudo aa-status\napparmor module is loaded.\n12 profiles are loaded.\n10 profiles are in enforce mode.\n…\n```',
        },
        {
          id: 'cA3-05-02', type: 'association', niveau: 2,
          enonce: 'Associe chaque notion SELinux à son équivalent le plus proche dans AppArmor.',
          paires: [['Mode permissive', 'Mode complain d’un profil'], ['Étiquette de fichier', 'Chemin dans un profil'], ['ausearch -m AVC', 'journalctl -k | grep apparmor="DENIED"'], ['sestatus', 'aa-status']],
          indices: ['Journaliser sans bloquer.', 'AppArmor raisonne en chemins.', 'Où sont les refus ?'],
          solution: 'permissive ↔ complain ; étiquette ↔ chemin ; ausearch ↔ journal du noyau ; sestatus ↔ aa-status.',
        },
        {
          id: 'cA3-05-03', type: 'commande', niveau: 2,
          enonce: 'Passe le profil du programme `/usr/sbin/cupsd` en mode **complain**.',
          accepte: ['(sudo )?aa-complain /usr/sbin/cupsd', '(sudo )?aa-complain /etc/apparmor\\.d/usr\\.sbin\\.cupsd'],
          exemple: 'aa-complain /usr/sbin/cupsd',
          indices: ['Outil de apparmor-utils.', 'aa- + mode.', '`aa-complain /usr/sbin/cupsd`'],
          solution: '```\n$ sudo aa-complain /usr/sbin/cupsd\nSetting /usr/sbin/cupsd to complain mode.\n```\nAprès diagnostic : `aa-enforce /usr/sbin/cupsd`.',
        },
        {
          id: 'cA3-05-04', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'AppArmor identifie les fichiers par leur chemin, SELinux par leur étiquette.', vrai: true },
            { texte: 'Le mode complain s’applique profil par profil.', vrai: true },
            { texte: 'Il vaut mieux modifier directement le profil du paquet que /etc/apparmor.d/local/.', vrai: false, explication: 'Une mise à jour du paquet écraserait la modification.' },
            { texte: '`apparmor_parser -r` recharge un profil modifié.', vrai: true },
          ],
          indices: ['Chemins contre étiquettes.', 'Une seule fausse.', 'local/ survit aux mises à jour.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'DAC vs MAC ?', r: 'DAC : le propriétaire décide (permissions) ; MAC : une politique imposée, même à root. Les deux doivent autoriser.' },
    { q: 'Modes SELinux ?', r: 'enforcing, permissive (journalise seulement), disabled ; `getenforce`, `setenforce 0|1`, /etc/selinux/config.' },
    { q: 'Voir les contextes ?', r: '`ls -Z`, `ps -eZ`, `id -Z`.' },
    { q: 'Étiquetage durable ?', r: '`semanage fcontext -a -t T \'/chemin(/.*)?\'` puis `restorecon -Rv /chemin`.' },
    { q: 'mv ou cp et SELinux ?', r: 'mv garde l’étiquette, cp prend celle de la destination.' },
    { q: 'Booléen permanent ?', r: '`setsebool -P nom on`' },
    { q: 'Port non standard ?', r: '`semanage port -a -t http_port_t -p tcp 8081` (+ pare-feu).' },
    { q: 'Trouver un refus ?', r: '`ausearch -m AVC -ts recent`, `| audit2why`, `sealert -a`.' },
    { q: 'Ordre des corrections ?', r: 'étiquette → booléen → port → module audit2allow relu.' },
    { q: 'AppArmor : état et modes ?', r: '`aa-status` ; `aa-complain` / `aa-enforce` ; refus dans `journalctl -k`.' },
  ],
  memo: `
    ### SELinux (Rocky)
    \`\`\`
    getenforce   sestatus   setenforce 0|1   /etc/selinux/config (SELINUX=enforcing)
    ls -Z   ps -eZ   id -Z
    semanage fcontext -a -t httpd_sys_content_t '/srv/vitrine(/.*)?' ; restorecon -Rv /srv/vitrine   chcon (temporaire)
    getsebool -a   semanage boolean -l   setsebool -P httpd_can_network_connect on
    semanage port -l | grep http_port_t   semanage port -a -t http_port_t -p tcp 8081   semanage port -l -C
    ausearch -m AVC -ts recent | audit2why   sealert -a /var/log/audit/audit.log
    \`\`\`
    Correction la plus étroite : étiquette → booléen → port → module audit2allow (relu). Jamais « disabled ».

    ### AppArmor (Debian)
    \`\`\`
    aa-status   /etc/apparmor.d/ (+ local/)   aa-complain PROG   aa-enforce PROG
    journalctl -k | grep 'apparmor="DENIED"'   apparmor_parser -r /etc/apparmor.d/PROFIL   aa-logprof
    \`\`\`
  `,
});
