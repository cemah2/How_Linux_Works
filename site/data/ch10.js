/* Chapitre 10 : Network Applications and Services (livre p. 269–290). */
HLW.chapitre({
  id: '10',
  num: 10,
  intro: `
    Le chapitre 9 a montré comment les paquets voyagent. Celui-ci monte d’un étage : les **applications** qui parlent
    sur le réseau, et surtout les **serveurs** qui attendent leurs clients. Le service le plus important pour un
    administrateur est **SSH** : on le configure côté serveur (\`sshd\`), on l’utilise côté client (clés, \`scp\`,
    rebonds, tunnels), et on le protège (durcissement, fail2ban).

    Viennent ensuite les outils de **diagnostic** : qui écoute sur quel port (\`ss\`, \`lsof -i\`), que passe-t-il
    vraiment sur le fil (\`tcpdump\`), comment tester un port à la main (\`nc\`), quels services sont exposés (\`nmap\`).
    Le chapitre se termine par les **sockets**, l’interface entre les programmes et le réseau. Le **Lab 08** applique
    tout cela à la brasserie.
  `,
  objectifs: [
    'dialoguer à la main avec un service (curl, nc) et lire ce qu’il répond ;',
    'configurer sshd par un fichier de surcharge et vérifier la configuration effective ;',
    'utiliser des clés SSH, l’agent, un fichier de configuration client, un rebond et un tunnel ;',
    'protéger SSH avec fail2ban ;',
    'trouver quel programme écoute sur un port, et capturer le trafic avec tcpdump ;',
    'tester un port avec netcat et inventorier les services d’un réseau avec nmap (le sien seulement) ;',
    'distinguer sockets réseau et sockets Unix.',
  ],
  certifs: { lpic1: ['109.3', '110.1', '110.3'], lfcs: ['NET', 'OD'], rhcsa: ['R1', 'R8', 'R10'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '10.1',
      titre: 'Les services réseau, vus de près',
      sections: '§10.1 et 10.2', pages: '269–272',
      objectif: 'Comprendre qu’un service réseau est un programme qui lit et écrit sur une connexion.',
      rappel: `
        Un **service** (ou serveur) est un programme qui écoute sur un port et répond aux **clients** selon un
        **protocole** d’application. Beaucoup de protocoles sont du **texte** : on peut leur parler à la main.

        HTTP, par exemple : le client envoie quelques lignes, le serveur répond par un en-tête et le contenu.

        \`\`\`
        $ nc example.org 80                 # (le livre utilise telnet, rarement installé aujourd'hui)
        GET / HTTP/1.1
        Host: example.org
                                            # ligne vide : fin de la requête
        HTTP/1.1 200 OK
        Content-Type: text/html
        …
        \`\`\`

        Avec **curl**, l’outil de référence côté client :

        \`\`\`
        $ curl -I https://www.debian.org          # en-têtes seulement
        $ curl -v http://127.0.0.1:8080/          # détail de l'échange (> envoyé, < reçu)
        $ curl --trace-ascii trace.txt http://www.example.org/
        $ curl -o page.html https://…             # enregistrer dans un fichier
        \`\`\`

        Avec HTTPS, le dialogue est chiffré par **TLS** : on ne peut plus le taper à la main, mais
        \`openssl s_client -connect www.debian.org:443\` montre la négociation et le certificat.
      `,
      aRetenir: [
        'Service = programme à l’écoute sur un port, qui parle un protocole d’application.',
        'HTTP est textuel : `nc hôte 80` puis `GET / HTTP/1.1`, `Host:`, ligne vide.',
        '`curl -I` (en-têtes), `-v` (détail), `-o` (fichier), `--trace-ascii`.',
        'HTTPS = HTTP dans TLS ; `openssl s_client -connect hôte:443`.',
      ],
      exercices: [
        {
          id: 'c10-01-01', type: 'commande', niveau: 1, ref: '§10.1',
          enonce: 'Affiche seulement les **en-têtes** de la réponse de `https://www.debian.org`.',
          accepte: ['curl -I https://www\\.debian\\.org/?', 'curl --head https://www\\.debian\\.org/?', 'curl -sI https://www\\.debian\\.org/?', 'curl -Is https://www\\.debian\\.org/?'],
          exemple: 'curl -I https://www.debian.org',
          indices: ['L’outil client HTTP en ligne de commande.', 'Une option demande seulement l’en-tête (requête HEAD).', '`curl -I`'],
          solution: '```\n$ curl -I https://www.debian.org\nHTTP/2 200\ncontent-type: text/html\n…\n```',
        },
        {
          id: 'c10-01-02', type: 'commande', niveau: 2, ref: '§10.2, p. 271',
          enonce: 'Affiche le **détail** de l’échange HTTP avec `http://127.0.0.1:8080/` (requête envoyée et en-têtes reçus).',
          accepte: ['curl -v http://127\\.0\\.0\\.1:8080/?', 'curl --verbose http://127\\.0\\.0\\.1:8080/?', 'curl -sv http://127\\.0\\.0\\.1:8080/?', 'curl -vs http://127\\.0\\.0\\.1:8080/?'],
          exemple: 'curl -v http://127.0.0.1:8080/',
          indices: ['Mode bavard.', 'v comme *verbose*.', '`curl -v …`'],
          solution: '```\n$ curl -v http://127.0.0.1:8080/\n> GET / HTTP/1.1\n> Host: 127.0.0.1:8080\n< HTTP/1.0 200 OK\n< Server: SimpleHTTP/0.6 Python/3.13\n```\nLes lignes `>` sont envoyées, les lignes `<` reçues.',
        },
        {
          id: 'c10-01-03', type: 'ordre', niveau: 2, ref: '§10.1',
          enonce: 'Tu tapes une requête HTTP à la main dans `nc example.org 80`. Remets les lignes dans l’ordre.',
          elements: ['GET / HTTP/1.1', 'Host: example.org', '(une ligne vide)'],
          indices: ['La méthode et le chemin d’abord.', 'Puis les en-têtes.', 'Une ligne vide termine la requête.'],
          solution: '`GET / HTTP/1.1`, puis `Host: example.org`, puis une ligne vide : le serveur répond alors.',
        },
        {
          id: 'c10-01-04', type: 'vrai-faux', niveau: 2, ref: '§10.1–10.2',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'HTTP est un protocole textuel, qu’on peut taper à la main.', vrai: true },
            { texte: 'On peut lire une session HTTPS en clair avec nc.', vrai: false, explication: 'Elle est chiffrée par TLS.' },
            { texte: 'Le code 200 signifie que la requête a réussi.', vrai: true },
            { texte: 'Le client choisit le port de destination : celui du service.', vrai: true },
          ],
          indices: ['HTTPS = HTTP + TLS.', 'Une seule fausse.', '200 OK, 404 Not Found.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
        {
          id: 'c10-01-05', type: 'association', niveau: 1,
          enonce: 'Associe chaque code de réponse HTTP à son sens.',
          paires: [['200', 'Succès'], ['301', 'Déplacé définitivement (redirection)'], ['403', 'Accès interdit'], ['404', 'Ressource introuvable'], ['500', 'Erreur interne du serveur']],
          indices: ['2xx succès, 3xx redirection.', '4xx erreur du client.', '5xx erreur du serveur.'],
          solution: '200 OK, 301 redirection permanente, 403 interdit, 404 introuvable, 500 erreur serveur.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '10.2',
      titre: 'Le serveur SSH (sshd)',
      sections: '§10.3 à 10.3.2', pages: '272–276',
      objectif: 'Comprendre les clés d’hôte et configurer sshd proprement.',
      rappel: `
        **SSH** (*Secure Shell*) chiffre toute la session : connexion à distance, transfert de fichiers, tunnels. Il
        remplace telnet, rlogin et rsh, qui envoyaient tout en clair, mots de passe compris. OpenSSH est l’implémentation
        standard.

        ### Clés d’hôte

        Chaque serveur a des **clés d’hôte** (\`/etc/ssh/ssh_host_*_key\`, privées, et \`.pub\`). À la première
        connexion, le client affiche l’**empreinte** de la clé du serveur et l’enregistre dans \`~/.ssh/known_hosts\`.
        Si elle change ensuite, il refuse avec un grand avertissement (« REMOTE HOST IDENTIFICATION HAS CHANGED ») :
        réinstallation du serveur… ou attaque de l’homme du milieu.

        \`\`\`
        # ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub     # empreinte, à comparer
        \`\`\`

        Les distributions génèrent ces clés à l’installation (cloud-init le fait à chaque nouvelle VM).

        ### Configuration

        \`/etc/ssh/sshd_config\` inclut **\`/etc/ssh/sshd_config.d/*.conf\`** au début : on y met ses réglages, sans
        toucher au fichier du paquet. Pour chaque mot-clé, **la première valeur lue l’emporte** : un fichier
        \`.d/\` passe donc avant le reste.

        \`\`\`
        # /etc/ssh/sshd_config.d/50-brasserie.conf
        PermitRootLogin no
        PasswordAuthentication no
        AllowGroups ssh-autorises
        MaxAuthTries 3
        \`\`\`

        \`\`\`
        # sshd -t                       # vérifier la syntaxe (rien = OK)
        # sshd -T | grep -i password    # configuration EFFECTIVE, après fusion de tous les fichiers
        # systemctl reload ssh          # Debian : ssh ; Rocky : sshd
        \`\`\`

        Recharger sshd **ne coupe pas** les sessions ouvertes. Garde-en une pendant que tu testes depuis une autre
        connexion.
      `,
      aRetenir: [
        'Clés d’hôte /etc/ssh/ssh_host_*_key ; empreinte mémorisée dans ~/.ssh/known_hosts.',
        'Réglages dans /etc/ssh/sshd_config.d/*.conf ; première valeur lue gagne.',
        '`sshd -t` (syntaxe), `sshd -T` (configuration effective), `systemctl reload ssh|sshd`.',
        'PermitRootLogin, PasswordAuthentication, AllowGroups/AllowUsers, MaxAuthTries.',
      ],
      exercices: [
        {
          id: 'c10-02-01', type: 'trous', niveau: 2, ref: '§10.3.2, p. 275',
          enonce: 'Complète la surcharge sshd : interdire la connexion directe de root et l’authentification par mot de passe.',
          texte: '[[1]] no\n[[2]] no',
          trous: [
            { accepte: ['PermitRootLogin'], exemple: 'PermitRootLogin' },
            { accepte: ['PasswordAuthentication'], exemple: 'PasswordAuthentication' },
          ],
          indices: ['« Permettre la connexion de root ».', '« Authentification par mot de passe ».', 'Les mots-clés sshd sont en CamelCase.'],
          solution: '```\nPermitRootLogin no\nPasswordAuthentication no\n```\nÀ placer dans `/etc/ssh/sshd_config.d/50-brasserie.conf`.',
        },
        {
          id: 'c10-02-02', type: 'commande', niveau: 2, ref: '§10.3.2',
          enonce: 'Affiche la configuration **effective** de sshd (tous fichiers fusionnés), pour vérifier tes réglages.',
          accepte: ['(sudo )?sshd -T( \\| (grep|less).*)?', '(sudo )?/usr/sbin/sshd -T( \\| (grep|less).*)?'],
          exemple: 'sudo sshd -T',
          pieges: [{ motif: '(sudo )?sshd -t', message: '`-t` (minuscule) teste seulement la syntaxe. `-T` (majuscule) affiche la configuration effective.' }],
          indices: ['C’est une option du démon lui-même.', 'Deux options proches : minuscule et majuscule.', '`sshd -T`'],
          solution: '```\n$ sudo sshd -T | grep -Ei \'permitrootlogin|passwordauthentication\'\npermitrootlogin no\npasswordauthentication no\n```',
        },
        {
          id: 'c10-02-03', type: 'qcm', niveau: 2, ref: '§10.3.1',
          enonce: 'En te connectant à cuve, ssh affiche « WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED! » et refuse. Hier, tu as recréé la VM cuve. Que faire ?',
          choix: [
            'Vérifier l’empreinte sur la console de la VM, puis retirer l’ancienne clé : ssh-keygen -R cuve',
            'Ajouter StrictHostKeyChecking=no partout',
            'Supprimer ~/.ssh entièrement',
            'Réinstaller OpenSSH sur ton poste',
          ],
          reponse: 0,
          indices: ['Une nouvelle VM a de nouvelles clés d’hôte.', 'L’ancienne clé est dans known_hosts.', 'Mais vérifie avant de faire confiance.'],
          solution: 'La VM recréée a de nouvelles clés d’hôte. On **vérifie** l’empreinte par un autre canal (console Proxmox : `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`), puis `ssh-keygen -R cuve` retire l’ancienne entrée. Désactiver la vérification supprimerait la protection contre l’homme du milieu.',
        },
        {
          id: 'c10-02-04', type: 'commande', niveau: 1,
          enonce: 'Sur cuve (Debian), recharge la configuration de sshd sans couper les sessions ouvertes.',
          accepte: ['(sudo )?systemctl reload ssh(\\.service)?', '(sudo )?systemctl reload sshd(\\.service)?'],
          exemple: 'systemctl reload ssh',
          pieges: [{ motif: '(sudo )?systemctl stop sshd?', message: 'Arrêter sshd à distance, c’est se couper la branche.' }],
          indices: ['systemctl, mais pas restart.', 'Recharger.', 'Le service s’appelle ssh sur Debian.'],
          solution: '```\n# sshd -t && systemctl reload ssh\n```\nSur Rocky : `systemctl reload sshd`. Tester avec `sshd -t` d’abord évite de recharger une configuration cassée.',
        },
        {
          id: 'c10-02-05', type: 'vrai-faux', niveau: 2, ref: '§10.3.2',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Les fichiers de /etc/ssh/sshd_config.d/ sont lus avant le reste de sshd_config.', vrai: true },
            { texte: 'Pour sshd, la dernière valeur lue d’un mot-clé l’emporte.', vrai: false, explication: 'C’est la première : d’où l’intérêt de sshd_config.d/, inclus au début.' },
            { texte: 'Recharger sshd coupe toutes les sessions en cours.', vrai: false, explication: 'Les sessions existantes ne sont pas touchées.' },
            { texte: 'Les clés d’hôte privées doivent être lisibles par root seulement.', vrai: true },
          ],
          indices: ['L’Include est en tête du fichier principal.', 'Deux fausses.', 'Chaque session a son propre processus sshd.'],
          solution: 'Vrai, faux, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '10.3',
      titre: 'Le client SSH : clés, scp, configuration, rebonds et tunnels',
      sections: '§10.3.4 et 10.4', pages: '277–279',
      objectif: 'Se connecter avec une clé, copier des fichiers, et passer par une machine relais.',
      rappel: `
        ### Clés d’utilisateur

        \`\`\`
        $ ssh-keygen -t ed25519 -C "admin@poste"     # crée ~/.ssh/id_ed25519 (privée) et .pub (publique)
        $ ssh-copy-id admin@cuve                     # ajoute la clé publique dans ~/.ssh/authorized_keys de cuve
        $ ssh admin@cuve                             # plus de mot de passe (mais la phrase de passe de la clé)
        \`\`\`

        La clé **privée** ne quitte jamais ton poste ; protège-la par une **phrase de passe**. L’**agent**
        (\`ssh-agent\`, \`ssh-add\`) la garde déverrouillée le temps de ta session. Côté serveur, sshd est exigeant sur
        les droits : \`~/.ssh\` en 700, \`authorized_keys\` en 600, rien d’écrivable par les autres dans le répertoire
        personnel. Sinon, la clé est ignorée.

        ### Copier

        \`\`\`
        $ scp rapport.txt admin@cuve:/tmp/          # vers
        $ scp admin@cuve:/var/log/syslog .          # depuis
        $ sftp admin@cuve                           # session interactive
        $ tar czf - recettes | ssh admin@cuve tar xzf - -C /srv   # archive à travers ssh
        \`\`\`

        ### ~/.ssh/config

        \`\`\`
        Host cuve
            HostName 192.168.50.10
            User admin
            ProxyJump douane              # passer par douane (rebond)
        Host douane
            HostName 192.168.1.213
            User admin
        \`\`\`

        Puis simplement \`ssh cuve\`. En ligne de commande : \`ssh -J admin@douane admin@192.168.50.10\`.

        ### Tunnels

        \`ssh -L 8080:127.0.0.1:8080 cuve\` : le port 8080 de ton poste mène au port 8080 local de cuve (pratique pour un
        service qui n’écoute qu’en local, comme la vitrine du Lab 04).

        Avant systemd, **inetd/xinetd** lançaient un serveur à chaque connexion entrante ; l’activation par socket de
        systemd (fiche 6.6) a repris cette idée.
      `,
      aRetenir: [
        '`ssh-keygen -t ed25519`, `ssh-copy-id user@hôte` ; privée sur le poste, publique dans authorized_keys.',
        'Droits : ~/.ssh 700, authorized_keys 600 ; agent : `ssh-add`.',
        '`scp src dst`, `sftp`, `tar … | ssh hôte tar …`.',
        '~/.ssh/config (Host, HostName, User, ProxyJump) ; `ssh -J` ; tunnel `ssh -L port:hôte:port`.',
      ],
      exercices: [
        {
          id: 'c10-03-01', type: 'commande', niveau: 1, ref: '§10.3.4',
          enonce: 'Crée une paire de clés SSH de type **ed25519**.',
          accepte: ['ssh-keygen -t ed25519( -C (".*"|\'.*\'|\\S+))?( -f \\S+)?', 'ssh-keygen -t ed25519 -a \\d+( -C (".*"|\'.*\'|\\S+))?'],
          exemple: 'ssh-keygen -t ed25519',
          pieges: [{ motif: 'ssh-keygen -t dsa.*', message: 'DSA est obsolète et refusé par les OpenSSH récents. Utilise ed25519.' }],
          indices: ['L’outil de gestion des clés.', 'Option -t pour le type.', '`ssh-keygen -t ed25519`'],
          solution: '```\n$ ssh-keygen -t ed25519 -C "admin@poste"\nEnter passphrase (empty for no passphrase):\n```\nRésultat : `~/.ssh/id_ed25519` (privée) et `~/.ssh/id_ed25519.pub` (publique).',
        },
        {
          id: 'c10-03-02', type: 'commande', niveau: 1, ref: '§10.3.4',
          enonce: 'Installe ta clé publique dans le compte `admin` de cuve.',
          accepte: ['ssh-copy-id( -i ~/\\.ssh/id_ed25519(\\.pub)?)? admin@cuve'],
          exemple: 'ssh-copy-id admin@cuve',
          indices: ['Une commande dédiée copie la clé publique au bon endroit.', 'Son nom combine ssh, copy et id.', '`ssh-copy-id admin@cuve`'],
          solution: '```\n$ ssh-copy-id admin@cuve\n```\nElle ajoute la clé à `~admin/.ssh/authorized_keys` avec les bons droits. Il faut pouvoir se connecter une première fois (mot de passe, ou une autre clé).',
        },
        {
          id: 'c10-03-03', type: 'commande', niveau: 2, ref: '§10.3.4, p. 278',
          enonce: 'Copie le fichier `/var/log/boutique/commandes.log` de cuve (compte `admin`) dans le répertoire courant.',
          accepte: ['scp( -p)? admin@cuve:/var/log/boutique/commandes\\.log \\./?', 'rsync( -[avz]+)? admin@cuve:/var/log/boutique/commandes\\.log \\.'],
          exemple: 'scp admin@cuve:/var/log/boutique/commandes.log .',
          indices: ['Comme cp, avec une syntaxe hôte:chemin.', 'La source est distante, la destination locale.', '`scp admin@cuve:/chemin .`'],
          solution: '```\n$ scp admin@cuve:/var/log/boutique/commandes.log .\n```',
        },
        {
          id: 'c10-03-04', type: 'commande', niveau: 2, ref: '§10.3.4',
          enonce: 'Connecte-toi à `admin@192.168.50.10` (cuve, sur le réseau interne) **en rebondissant** par `admin@douane`.',
          accepte: ['ssh -J admin@douane admin@192\\.168\\.50\\.10', 'ssh -o ProxyJump=admin@douane admin@192\\.168\\.50\\.10'],
          exemple: 'ssh -J admin@douane admin@192.168.50.10',
          indices: ['OpenSSH a une option de rebond (*jump*).', 'Une seule lettre majuscule.', '`ssh -J relais destination`'],
          solution: '```\n$ ssh -J admin@douane admin@192.168.50.10\n```\nLa connexion à cuve est chiffrée de bout en bout ; douane ne fait que relayer. À mettre dans `~/.ssh/config` avec `ProxyJump douane`.',
        },
        {
          id: 'c10-03-05', type: 'trous', niveau: 2,
          enonce: 'Complète `~/.ssh/config` pour que `ssh cuve` aille à `192.168.50.10`, en tant qu’`admin`, via `douane`.',
          texte: '[[1]] cuve\n    [[2]] 192.168.50.10\n    [[3]] admin\n    [[4]] douane',
          trous: [
            { accepte: ['Host'], exemple: 'Host' },
            { accepte: ['HostName', 'Hostname'], exemple: 'HostName' },
            { accepte: ['User'], exemple: 'User' },
            { accepte: ['ProxyJump'], exemple: 'ProxyJump' },
          ],
          indices: ['Le bloc commence par le nom court.', 'Le vrai nom ou l’adresse.', 'Le compte, puis le rebond.'],
          solution: '```\nHost cuve\n    HostName 192.168.50.10\n    User admin\n    ProxyJump douane\n```',
        },
        {
          id: 'c10-03-06', type: 'qcm', niveau: 2, ref: '§10.3.4',
          enonce: 'Tu as copié ta clé publique sur cuve, mais sshd demande toujours le mot de passe de Léa. `ls -ld ~lea ~lea/.ssh` montre `drwxrwxrwx` et `drwxr-xr-x`. Cause ?',
          choix: [
            'Droits trop ouverts : sshd ignore les clés si le répertoire personnel ou ~/.ssh est modifiable par d’autres',
            'La clé est trop courte',
            'Il faut redémarrer la machine',
            'ed25519 n’est pas supporté',
          ],
          reponse: 0,
          indices: ['sshd vérifie que personne d’autre n’a pu glisser une clé.', 'Le répertoire personnel est en 777.', 'StrictModes.'],
          solution: 'Avec `StrictModes yes` (défaut), sshd refuse `authorized_keys` si un répertoire du chemin est modifiable par d’autres. `chmod 755 ~lea` (ou 750), `chmod 700 ~lea/.ssh`, `chmod 600 ~lea/.ssh/authorized_keys`. Le journal de sshd le dit : « bad ownership or modes ».',
        },
        {
          id: 'c10-03-07', type: 'commande', niveau: 3, ref: '§10.3.4',
          enonce: 'La vitrine de cuve n’écoute que sur `127.0.0.1:8080`. Ouvre un tunnel pour que `http://localhost:8080` sur ton poste y mène, via `admin@cuve`.',
          accepte: ['ssh -L ?8080:(127\\.0\\.0\\.1|localhost):8080 admin@cuve( -N)?', 'ssh -N -L ?8080:(127\\.0\\.0\\.1|localhost):8080 admin@cuve', 'ssh -NL ?8080:(127\\.0\\.0\\.1|localhost):8080 admin@cuve'],
          exemple: 'ssh -L 8080:127.0.0.1:8080 admin@cuve',
          indices: ['Redirection de port **locale**.', 'Format : port_local:destination:port, destination vue depuis cuve.', '`ssh -L 8080:127.0.0.1:8080 …`'],
          solution: '```\n$ ssh -N -L 8080:127.0.0.1:8080 admin@cuve\n```\n`127.0.0.1` est interprété **par cuve** : c’est sa propre boucle locale. `-N` : pas de shell, juste le tunnel.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '10.4',
      titre: 'Protéger SSH : durcissement et fail2ban',
      sections: '§10.3.3', pages: '276–277',
      objectif: 'Limiter les attaques par force brute sur un serveur exposé.',
      rappel: `
        Un serveur SSH exposé à Internet reçoit des milliers d’essais de mots de passe par jour (tu l’as vu au Lab 05).
        Défenses, par ordre d’efficacité :

        1. **Pas de mot de passe** : \`PasswordAuthentication no\`, clés seulement. Les robots ne peuvent plus rien deviner.
        2. **Pas de root direct** : \`PermitRootLogin no\` ; on se connecte avec son compte puis \`sudo\`.
        3. **Liste blanche** : \`AllowGroups ssh-autorises\` (ou \`AllowUsers\`).
        4. **Limiter l’exposition** : pare-feu (seulement depuis certaines adresses), VPN, ou bastion.
        5. **fail2ban** : surveille les journaux et **bannit** temporairement (règle de pare-feu) les adresses qui
           échouent trop souvent.

        ### fail2ban

        \`\`\`
        # apt install fail2ban                # Rocky : dnf install epel-release && dnf install fail2ban
        # cat /etc/fail2ban/jail.d/sshd.local
        [sshd]
        enabled  = true
        backend  = systemd                    # lire le journal systemd (pas de auth.log sur Debian 13)
        maxretry = 5                          # échecs tolérés…
        findtime = 10m                        # … dans cette fenêtre
        bantime  = 1h                         # durée du bannissement
        ignoreip = 127.0.0.1/8 192.168.50.0/24
        # systemctl enable --now fail2ban
        # fail2ban-client status sshd
        # fail2ban-client set sshd unbanip 203.0.113.42
        \`\`\`

        On ne modifie pas \`jail.conf\` (fichier du paquet) : on écrit dans \`jail.local\` ou \`jail.d/*.local\`. Pense à
        \`ignoreip\` pour ne pas te bannir toi-même.
      `,
      aRetenir: [
        'Clés seulement, pas de root direct, liste blanche, exposition minimale.',
        'fail2ban : maxretry, findtime, bantime, ignoreip ; `backend = systemd` sur Debian 13.',
        'Configuration dans jail.local ou jail.d/*.local, jamais jail.conf.',
        '`fail2ban-client status sshd`, `set sshd unbanip ADR`.',
      ],
      exercices: [
        {
          id: 'c10-04-01', type: 'trous', niveau: 2, ref: '§10.3.3',
          enonce: 'Complète la prison fail2ban : bannir **1 heure** après **5** échecs en **10 minutes**, en lisant le journal systemd.',
          texte: '[sshd]\nenabled  = true\nbackend  = [[1]]\nmaxretry = [[2]]\nfindtime = 10m\n[[3]]  = 1h',
          trous: [
            { accepte: ['systemd'], exemple: 'systemd' },
            { accepte: ['5'], exemple: '5' },
            { accepte: ['bantime'], exemple: 'bantime' },
          ],
          indices: ['Debian 13 n’a plus de /var/log/auth.log.', 'Nombre d’échecs tolérés.', 'Durée du bannissement : *ban time*.'],
          solution: '```\n[sshd]\nenabled  = true\nbackend  = systemd\nmaxretry = 5\nfindtime = 10m\nbantime  = 1h\n```',
        },
        {
          id: 'c10-04-02', type: 'commande', niveau: 1, ref: '§10.3.3',
          enonce: 'Affiche l’état de la prison `sshd` de fail2ban (adresses bannies).',
          accepte: ['(sudo )?fail2ban-client status sshd'],
          exemple: 'fail2ban-client status sshd',
          indices: ['Le client de fail2ban.', 'Sous-commande status.', 'Suivie du nom de la prison.'],
          solution: '```\n# fail2ban-client status sshd\nStatus for the jail: sshd\n|- Filter\n|  |- Currently failed: 2\n`- Actions\n   |- Currently banned: 1\n   `- Banned IP list: 203.0.113.42\n```',
        },
        {
          id: 'c10-04-03', type: 'commande', niveau: 2,
          enonce: 'Bastien s’est banni en se trompant de mot de passe depuis `192.168.1.57`. Débannis-le.',
          accepte: ['(sudo )?fail2ban-client set sshd unbanip 192\\.168\\.1\\.57', '(sudo )?fail2ban-client unban 192\\.168\\.1\\.57'],
          exemple: 'fail2ban-client set sshd unbanip 192.168.1.57',
          indices: ['fail2ban-client set PRISON action ADR.', 'L’action est unbanip.', '`fail2ban-client set sshd unbanip 192.168.1.57`'],
          solution: '```\n# fail2ban-client set sshd unbanip 192.168.1.57\n```\nPour l’avenir : ajoute le réseau interne à `ignoreip`.',
        },
        {
          id: 'c10-04-04', type: 'qcm', niveau: 2, ref: '§10.3.3',
          enonce: 'Parmi ces mesures, laquelle rend **inutile** la devinette de mots de passe par les robots ?',
          choix: ['PasswordAuthentication no (clés seulement)', 'Changer le port SSH en 2222', 'Installer fail2ban', 'MaxAuthTries 3'],
          reponse: 0,
          indices: ['Les autres ralentissent ou cachent.', 'Une seule supprime la cible.', 'Sans mot de passe, rien à deviner.'],
          solution: 'Sans authentification par mot de passe, il n’y a plus rien à deviner. Changer de port réduit le bruit, fail2ban et MaxAuthTries ralentissent les attaques : utiles, mais complémentaires.',
        },
        {
          id: 'c10-04-05', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'On personnalise fail2ban dans jail.local ou jail.d/, pas dans jail.conf.', vrai: true },
            { texte: 'fail2ban bannit en ajoutant une règle de pare-feu.', vrai: true },
            { texte: 'ignoreip sert à bannir définitivement une adresse.', vrai: false, explication: 'Au contraire : ces adresses ne sont jamais bannies.' },
            { texte: 'Sur Rocky, fail2ban vient du dépôt EPEL.', vrai: true },
          ],
          indices: ['jail.conf est remplacé par les mises à jour.', 'Une seule fausse.', 'ignore = ignorer.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '10.5',
      titre: 'Diagnostic : lsof -i, ss et tcpdump',
      sections: '§10.5 à 10.5.2', pages: '279–283',
      objectif: 'Savoir quel programme utilise un port, et voir ce qui passe vraiment sur le réseau.',
      rappel: `
        ### Qui utilise ce port ?

        \`\`\`
        # lsof -i                     # toutes les sockets réseau ouvertes
        # lsof -n -P -i               # sans résolution de noms ni de ports (rapide)
        # lsof -i :8080               # un port
        # lsof -iTCP -sTCP:LISTEN     # ports TCP en écoute
        # ss -tlnp 'sport = :8080'    # même idée avec ss
        \`\`\`

        ### tcpdump

        \`tcpdump\` met l’interface en écoute et affiche chaque paquet (root nécessaire) :

        \`\`\`
        # tcpdump -i ens19 -n                       # tout le trafic de ens19, sans DNS
        # tcpdump -i ens19 -n port 53               # le DNS
        # tcpdump -i any -n host 192.168.50.120     # tout ce qui concerne le comptoir
        # tcpdump -i ens18 -n 'tcp port 22 and not host 192.168.1.10'
        # tcpdump -i ens19 -n -c 20 -w capture.pcap # 20 paquets dans un fichier
        $ tcpdump -n -r capture.pcap                # relire (ou l'ouvrir dans Wireshark)
        \`\`\`

        Les **filtres** se combinent avec \`and\`, \`or\`, \`not\` : \`host\`, \`net 192.168.50.0/24\`, \`port\`, \`tcp\`,
        \`udp\`, \`icmp\`. Sur un serveur distant, **exclus ta propre session SSH** (\`not port 22\`), sinon tcpdump
        capture ses propres affichages en boucle.

        Exemple de lecture : \`IP 192.168.50.120.51234 > 192.168.50.1.53: 4021+ A? cuve.brasserie.lan.\` — le comptoir
        demande au port 53 de douane l’adresse IPv4 (A) de cuve.
      `,
      aRetenir: [
        '`lsof -n -P -i`, `lsof -i :PORT`, `lsof -iTCP -sTCP:LISTEN`.',
        '`tcpdump -i IF -n FILTRE` ; filtres host, net, port, tcp/udp/icmp, and/or/not.',
        '`-c N` nombre, `-w fichier.pcap` enregistrer, `-r` relire (Wireshark).',
        'À distance : `not port 22`.',
      ],
      exercices: [
        {
          id: 'c10-05-01', type: 'commande', niveau: 1, ref: '§10.5.1, p. 281',
          enonce: 'Avec lsof, trouve quel processus utilise le port **8080**.',
          accepte: ['(sudo )?lsof -i ?:8080', '(sudo )?lsof -n -i ?:8080', '(sudo )?lsof -i ?tcp:8080', '(sudo )?lsof -iTCP:8080', '(sudo )?lsof -nP -i ?:8080', '(sudo )?lsof -n -P -i ?:8080'],
          exemple: 'sudo lsof -i :8080',
          indices: ['`-i` sélectionne les fichiers réseau.', 'On précise le port après deux-points.', '`lsof -i :8080`'],
          solution: '```\n# lsof -i :8080\nCOMMAND  PID    USER FD TYPE DEVICE SIZE/OFF NODE NAME\npython3 3120 vitrine 3u IPv4  41237      0t0  TCP localhost:http-alt (LISTEN)\n```',
        },
        {
          id: 'c10-05-02', type: 'commande', niveau: 2, ref: '§10.5.2, p. 282',
          enonce: 'Sur douane, capture le trafic **DNS** (port 53) de l’interface `ens19`, sans résolution de noms.',
          accepte: ['(sudo )?tcpdump -i ?ens19 -n (udp )?port 53', '(sudo )?tcpdump -n -i ?ens19 (udp )?port 53', '(sudo )?tcpdump -ni ?ens19 (udp )?port 53', '(sudo )?tcpdump -i ?ens19 -nn (udp )?port 53', '(sudo )?tcpdump -i ?ens19 -n [\'"](udp )?port 53[\'"]'],
          exemple: 'tcpdump -i ens19 -n port 53',
          indices: ['`-i` pour l’interface, `-n` sans résolution.', 'Le filtre vient à la fin.', '`port 53`'],
          solution: '```\n# tcpdump -i ens19 -n port 53\nIP 192.168.50.120.51234 > 192.168.50.1.53: 4021+ A? cuve.brasserie.lan. (36)\nIP 192.168.50.1.53 > 192.168.50.120.51234: 4021* 1/0/0 A 192.168.50.10 (52)\n```',
        },
        {
          id: 'c10-05-03', type: 'commande', niveau: 2, ref: '§10.5.2',
          enonce: 'Enregistre **50** paquets de l’interface `ens19` dans le fichier `capture.pcap`.',
          accepte: ['(sudo )?tcpdump -i ?ens19 (-n )?-c ?50 -w ?capture\\.pcap', '(sudo )?tcpdump -i ?ens19 (-n )?-w ?capture\\.pcap -c ?50', '(sudo )?tcpdump -c ?50 -i ?ens19 (-n )?-w ?capture\\.pcap', '(sudo )?tcpdump -w ?capture\\.pcap -c ?50 -i ?ens19', '(sudo )?tcpdump -w ?capture\\.pcap -i ?ens19 -c ?50'],
          exemple: 'tcpdump -i ens19 -c 50 -w capture.pcap',
          indices: ['`-c` limite le nombre de paquets.', '`-w` écrit dans un fichier (*write*).', 'Relire avec `-r`.'],
          solution: '```\n# tcpdump -i ens19 -c 50 -w capture.pcap\n$ tcpdump -n -r capture.pcap\n```',
        },
        {
          id: 'c10-05-04', type: 'qcm', niveau: 2, ref: '§10.5.2',
          enonce: 'Connecté en SSH à douane, tu lances `tcpdump -i ens18`. L’écran défile sans fin, même quand rien ne se passe. Pourquoi ?',
          choix: [
            'tcpdump capture le trafic de ta propre session SSH, qui transporte… son affichage',
            'ens18 est en panne',
            'Il manque l’option -n',
            'Le pare-feu renvoie les paquets',
          ],
          reponse: 0,
          indices: ['Par où passe ton affichage ?', 'Chaque ligne affichée génère des paquets SSH.', 'Qui sont capturés et affichés…'],
          solution: 'Chaque ligne affichée part dans ta session SSH, ce qui crée des paquets, capturés et affichés à leur tour. Ajoute `not port 22` (ou `not host TON_IP`).',
        },
        {
          id: 'c10-05-05', type: 'association', niveau: 2, ref: '§10.5.2',
          enonce: 'Associe chaque filtre tcpdump à ce qu’il retient.',
          paires: [
            ['`host 192.168.50.120`', 'Tout ce qui vient de ou va vers cette adresse'],
            ['`net 192.168.50.0/24`', 'Tout ce qui concerne ce réseau'],
            ['`tcp port 443`', 'Le HTTPS'],
            ['`icmp`', 'Les ping et messages d’erreur IP'],
            ['`not port 22`', 'Tout sauf SSH'],
          ],
          indices: ['host = une machine.', 'net = un réseau.', '443 = HTTPS.'],
          solution: 'host une machine ; net un réseau ; tcp port 443 HTTPS ; icmp ; not port 22 tout sauf SSH.',
        },
        {
          id: 'c10-05-06', type: 'commande', niveau: 2, ref: '§10.5.1, p. 281',
          enonce: 'Avec lsof, liste uniquement les ports **TCP en écoute**, sans résolution de noms ni de ports.',
          accepte: ['(sudo )?lsof -n -P -iTCP -sTCP:LISTEN', '(sudo )?lsof -nP -iTCP -sTCP:LISTEN', '(sudo )?lsof -iTCP -sTCP:LISTEN -n -P', '(sudo )?lsof -iTCP -sTCP:LISTEN -nP', '(sudo )?lsof -i ?tcp -s ?tcp:listen -n -P'],
          exemple: 'lsof -nP -iTCP -sTCP:LISTEN',
          indices: ['`-iTCP` pour TCP, `-sTCP:LISTEN` pour l’état.', '`-n` sans DNS, `-P` sans noms de ports.', '`lsof -nP -iTCP -sTCP:LISTEN`'],
          solution: '```\n# lsof -nP -iTCP -sTCP:LISTEN\nsshd 812 root 3u IPv4 … TCP *:22 (LISTEN)\n```',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '10.6',
      titre: 'netcat, balayage de ports et RPC',
      sections: '§10.5.3 à 10.6', pages: '283–285',
      objectif: 'Tester un port à la main et inventorier les services exposés.',
      rappel: `
        ### netcat (nc)

        Le « couteau suisse » du réseau : une connexion brute, dans les deux sens.

        \`\`\`
        $ nc -zv cuve 22                  # le port 22 de cuve est-il ouvert ? (-z : tester sans envoyer)
        $ nc -zv cuve 20-25               # une plage
        $ nc -l 4000                      # écouter sur le port 4000 (sur une machine)
        $ nc cuve 4000                    # s'y connecter (sur une autre) : ce qu'on tape passe d'un côté à l'autre
        $ nc -l 4000 > recu.tar           # et  tar cf - dossier | nc cuve 4000   : transfert brut, non chiffré
        \`\`\`

        Le paquet s’appelle \`netcat-openbsd\` (Debian) ou \`nmap-ncat\` (Rocky) ; les options varient un peu entre versions.

        ### nmap

        **nmap** découvre les machines et les ports ouverts d’un réseau :

        \`\`\`
        $ nmap 192.168.50.10              # ports courants d'une machine
        $ nmap -sn 192.168.50.0/24        # quelles machines répondent (pas de scan de ports)
        $ nmap -p 1-65535 192.168.50.10   # tous les ports
        $ nmap -sV 192.168.50.10          # versions des services
        \`\`\`

        États : **open** (un service répond), **closed** (la machine répond, aucun service), **filtered** (un pare-feu
        avale les paquets). **Ne scanne que des réseaux qui t’appartiennent ou pour lesquels tu as une autorisation
        écrite** : ailleurs, c’est au mieux mal vu, au pire illégal.

        ### RPC

        Les appels de procédure à distance (**RPC**) d’ONC, utilisés par NFS v3, passent par **rpcbind** (port 111), qui
        indique où trouver chaque service : \`rpcinfo -p hôte\`. NFS v4 n’en a plus besoin.
      `,
      aRetenir: [
        '`nc -zv hôte port` tester ; `nc -l port` écouter ; transfert brut non chiffré.',
        '`nmap hôte`, `nmap -sn réseau` (découverte), `-p`, `-sV` ; open / closed / filtered.',
        'Scanner seulement ce qui t’appartient.',
        'RPC : rpcbind port 111, `rpcinfo -p` ; utile à NFS v3.',
      ],
      exercices: [
        {
          id: 'c10-06-01', type: 'commande', niveau: 1, ref: '§10.5.3, p. 283',
          enonce: 'Avec netcat, teste si le port **22** de `cuve` est ouvert, en mode bavard, sans envoyer de données.',
          accepte: ['nc -zv cuve 22', 'nc -vz cuve 22', 'nc -z -v cuve 22', 'nc -v -z cuve 22', 'ncat -zv cuve 22', 'netcat -zv cuve 22'],
          exemple: 'nc -zv cuve 22',
          indices: ['`-z` : tester sans envoyer.', '`-v` : afficher le résultat.', '`nc -zv cuve 22`'],
          solution: '```\n$ nc -zv cuve 22\nConnection to cuve (192.168.50.10) 22 port [tcp/ssh] succeeded!\n```',
        },
        {
          id: 'c10-06-02', type: 'commande', niveau: 2, ref: '§10.5.3',
          enonce: 'Fais écouter netcat sur le port **4000** de la machine.',
          accepte: ['nc -l 4000', 'nc -l -p 4000', 'nc -lp 4000', 'nc -lv 4000', 'nc -lvp 4000', 'ncat -l 4000', 'nc -lk 4000'],
          exemple: 'nc -l 4000',
          indices: ['l comme *listen*.', 'Le port en argument (ou après -p selon les versions).', '`nc -l 4000`'],
          solution: '```\n$ nc -l 4000\n```\nSur une autre machine : `nc cuve 4000`. N’oublie pas le pare-feu.',
        },
        {
          id: 'c10-06-03', type: 'commande', niveau: 1, ref: '§10.5.4, p. 284',
          enonce: 'Découvre quelles machines répondent sur le réseau `192.168.50.0/24`, **sans** scanner leurs ports.',
          accepte: ['(sudo )?nmap -sn 192\\.168\\.50\\.0/24', '(sudo )?nmap -sP 192\\.168\\.50\\.0/24'],
          exemple: 'nmap -sn 192.168.50.0/24',
          indices: ['L’outil de balayage.', 'Une option désactive le scan de ports.', '`-sn`'],
          solution: '```\n$ nmap -sn 192.168.50.0/24\nNmap scan report for douane.brasserie.lan (192.168.50.1)\nHost is up (0.00031s latency).\n…\n```',
        },
        {
          id: 'c10-06-04', type: 'association', niveau: 2, ref: '§10.5.4',
          enonce: 'Associe chaque état de port nmap à sa signification.',
          paires: [
            ['open', 'Un service accepte les connexions'],
            ['closed', 'La machine répond, mais aucun service n’écoute'],
            ['filtered', 'Aucune réponse : un pare-feu jette les paquets'],
          ],
          indices: ['open = ouvert.', 'closed = la machine dit « non ».', 'filtered = silence.'],
          solution: 'open : service présent ; closed : refus explicite ; filtered : silence (pare-feu en drop).',
        },
        {
          id: 'c10-06-05', type: 'qcm', niveau: 1, ref: '§10.5.4',
          enonce: 'Dans quel cas peux-tu lancer nmap sans risque ?',
          choix: [
            'Sur ton propre labo, ou un réseau pour lequel tu as une autorisation écrite',
            'Sur n’importe quelle adresse publique, c’est seulement de la lecture',
            'Sur le réseau du voisin, s’il n’a pas de mot de passe Wi-Fi',
            'Sur les serveurs d’un concurrent, pour comparer',
          ],
          reponse: 0,
          indices: ['Un scan peut être pris pour une attaque.', 'Il faut un droit.', 'Ton labo Proxmox, oui.'],
          solution: 'Un scan non autorisé peut être considéré comme une tentative d’intrusion. Limite-toi à ton labo (douane, cuve, comptoir) ou à un périmètre autorisé par écrit.',
        },
        {
          id: 'c10-06-06', type: 'commande', niveau: 2, ref: '§10.6, p. 285',
          enonce: 'Liste les services RPC enregistrés auprès de rpcbind sur `cuve`.',
          accepte: ['rpcinfo -p cuve', 'rpcinfo -p cuve\\.brasserie\\.lan'],
          exemple: 'rpcinfo -p cuve',
          indices: ['L’outil d’information RPC.', '`-p` interroge rpcbind (portmapper).', '`rpcinfo -p cuve`'],
          solution: '```\n$ rpcinfo -p cuve\n   program vers proto   port  service\n    100000    4   tcp    111  portmapper\n    100003    3   tcp   2049  nfs\n```',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '10.7',
      titre: 'Sécurité réseau',
      sections: '§10.7 et 10.8', pages: '285–288',
      objectif: 'Adopter les réflexes de base pour réduire la surface d’attaque.',
      rappel: `
        Règles simples, qui évitent la majorité des incidents :

        1. **Ne lance que ce qui sert.** Chaque service qui écoute est une porte. \`ss -tulnp\` doit être court, et
           chaque ligne doit avoir une raison d’être.
        2. **Écoute au plus près.** Un service interne écoute sur 127.0.0.1 ou sur l’interface interne, pas sur 0.0.0.0.
        3. **Pare-feu en liste blanche**, sur les serveurs comme sur le routeur (fiche 9.12).
        4. **Mises à jour** régulières (\`apt upgrade\`, \`dnf upgrade\`), surtout pour les services exposés.
        5. **Moindre privilège** : un compte dédié par service (Lab 04), pas de root.
        6. **Journaux** surveillés : un pic d’échecs d’authentification se voit (Lab 05).

        ### Vulnérabilités typiques

        - **Mots de passe faibles** et services d’administration exposés (SSH avec mot de passe, bases de données
          ouvertes sur Internet).
        - **Protocoles en clair** : telnet, FTP, HTTP pour des formulaires… tout se lit avec tcpdump.
        - **Débordements de tampon** et autres bogues dans des services non mis à jour.
        - **Services oubliés** : un outil de débogage laissé en écoute par un prestataire (tu en chasseras un au Lab 08).

        Ressources : les bulletins de sécurité de ta distribution (Debian Security Advisories, Red Hat/Rocky errata), la
        base **CVE**, et les recommandations de l’**ANSSI** (guide de configuration GNU/Linux).
      `,
      aRetenir: [
        'Seulement les services utiles ; écoute au plus près (127.0.0.1, interface interne).',
        'Pare-feu en liste blanche, mises à jour, moindre privilège, journaux.',
        'Protocoles en clair = lisibles par tcpdump ; services oubliés = portes ouvertes.',
        'Bulletins de la distribution, CVE, guides de l’ANSSI.',
      ],
      exercices: [
        {
          id: 'c10-07-01', type: 'commande', niveau: 1, ref: '§10.7',
          enonce: 'Fais l’inventaire de tous les ports **TCP et UDP** en écoute, en numérique, avec les processus.',
          accepte: ['(sudo )?ss -[tulnp]{5}', '(sudo )?ss -t -u -l -n -p', '(sudo )?netstat -[tulnp]{5}'],
          exemple: 'sudo ss -tulnp',
          indices: ['ss, avec t et u.', 'l écoute, n numérique, p processus.', '`ss -tulnp`'],
          solution: '```\n$ sudo ss -tulnp\n```\nChaque ligne doit correspondre à un service voulu.',
        },
        {
          id: 'c10-07-02', type: 'qcm', niveau: 2, ref: '§10.7.1',
          enonce: 'L’inventaire de cuve montre `LISTEN 0.0.0.0:3306 users:(("mariadbd",…))`. La base ne sert qu’à la vitrine, sur la même machine. Que faire en priorité ?',
          choix: [
            'Faire écouter MariaDB sur 127.0.0.1 seulement (bind-address)',
            'Changer le port en 3307',
            'Désinstaller le pare-feu',
            'Rien : la base a un mot de passe',
          ],
          reponse: 0,
          indices: ['Qui a besoin d’y accéder ?', 'Seulement la machine elle-même.', 'Écoute au plus près.'],
          solution: 'Seule la vitrine locale s’en sert : `bind-address = 127.0.0.1`. La base n’est alors plus joignable du réseau, quel que soit le mot de passe. Le pare-feu ajoute une seconde barrière.',
        },
        {
          id: 'c10-07-03', type: 'vrai-faux', niveau: 1, ref: '§10.7',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un mot de passe envoyé par telnet ou FTP peut être lu avec tcpdump.', vrai: true },
            { texte: 'Un service qui écoute sur 127.0.0.1 n’est pas joignable depuis le réseau.', vrai: true },
            { texte: 'Un service inutilisé mais à jour ne présente aucun risque.', vrai: false, explication: 'Toute porte ouverte est une surface d’attaque, et les failles futures ne sont pas encore corrigées.' },
            { texte: 'Les bulletins de sécurité de la distribution signalent les failles corrigées.', vrai: true },
          ],
          indices: ['En clair = lisible.', 'Une seule fausse.', 'Les failles de demain existent déjà dans le code.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
        {
          id: 'c10-07-04', type: 'libre', niveau: 2,
          enonce: 'Malik veut ouvrir l’accès SSH de cuve à Internet « pour travailler de chez lui ». Propose deux ou trois mesures concrètes, en expliquant ce que chacune protège.',
          indices: ['Que peut deviner un robot ?', 'Par où faire passer la connexion ?', 'Pense aux fiches 10.2 à 10.4.'],
          solution: 'Par exemple : (1) **clés seulement** (`PasswordAuthentication no`) : plus de mot de passe à deviner ; (2) **pas d’exposition directe** : passer par douane en rebond (`ProxyJump`), seul point d’entrée surveillé, ou mieux un VPN (WireGuard) ; (3) **fail2ban** et **AllowGroups** sur le point d’entrée, pour bannir les insistants et limiter les comptes autorisés. Bonus : pare-feu qui n’accepte SSH que depuis l’adresse de Malik si elle est fixe.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '10.8',
      titre: 'Sockets réseau et sockets Unix',
      sections: '§10.9 et 10.10', pages: '288–290',
      objectif: 'Comprendre l’interface entre programmes et réseau, et reconnaître les sockets Unix.',
      rappel: `
        Un programme n’envoie pas de paquets lui-même : il ouvre une **socket** (appel système \`socket()\`), et le noyau
        fait le reste. Deux grandes familles :

        - **Sockets réseau** (\`AF_INET\`, \`AF_INET6\`) : \`SOCK_STREAM\` pour TCP, \`SOCK_DGRAM\` pour UDP. Un serveur
          appelle \`bind()\` (adresse, port), \`listen()\`, puis \`accept()\` : chaque client accepté obtient **une
          nouvelle socket** (et souvent un processus ou un thread), la socket d’écoute restant disponible.
        - **Sockets Unix** (\`AF_UNIX\`) : communication entre processus **de la même machine**, via un fichier spécial
          (type \`s\` dans \`ls -l\`). Pas de pile réseau : plus rapide, et les **permissions du fichier** contrôlent
          l’accès.

        \`\`\`
        $ ls -l /run/dbus/system_bus_socket
        srw-rw-rw- 1 root root 0 nov.  8 09:12 /run/dbus/system_bus_socket
        $ ss -xl                      # sockets Unix en écoute
        # lsof -U                     # sockets Unix ouvertes, par processus
        \`\`\`

        Exemples : D-Bus, le journal (\`/run/systemd/journal/socket\`), Docker (\`/var/run/docker.sock\` : y accéder
        équivaut à être root !), les bases de données en local (\`/run/postgresql/.s.PGSQL.5432\`).
      `,
      aRetenir: [
        'Socket = interface programme ↔ noyau ; serveur : bind, listen, accept (une socket par client).',
        'AF_INET/AF_INET6 (réseau, TCP = STREAM, UDP = DGRAM) ; AF_UNIX (même machine, fichier de type s).',
        'Sockets Unix : accès contrôlé par les permissions du fichier.',
        '`ss -xl`, `lsof -U`.',
      ],
      exercices: [
        {
          id: 'c10-08-01', type: 'ordre', niveau: 2, ref: '§10.9, p. 288',
          enonce: 'Remets dans l’ordre les appels système d’un serveur TCP qui attend un client.',
          elements: ['socket() : créer la socket', 'bind() : l’attacher à une adresse et un port', 'listen() : se mettre en écoute', 'accept() : accepter un client (nouvelle socket)'],
          indices: ['On crée avant d’attacher.', 'On attache avant d’écouter.', 'accept arrive quand un client se présente.'],
          solution: 'socket → bind → listen → accept.',
        },
        {
          id: 'c10-08-02', type: 'commande', niveau: 1, ref: '§10.10',
          enonce: 'Liste les **sockets Unix** en écoute avec ss.',
          accepte: ['ss -xl', 'ss -lx', 'ss -x -l', 'ss -xlp', 'ss -lxp', 'ss -xln'],
          exemple: 'ss -xl',
          indices: ['ss a une option par famille.', 'x comme Unix (domaine local).', '`ss -xl`'],
          solution: '```\n$ ss -xl\nu_str LISTEN 0 4096 /run/systemd/journal/stdout 1234 * 0\n```',
        },
        {
          id: 'c10-08-03', type: 'qcm', niveau: 2, ref: '§10.10, p. 289',
          enonce: 'Comment contrôle-t-on qui peut utiliser une socket Unix comme `/run/postgresql/.s.PGSQL.5432` ?',
          choix: ['Par les permissions et le propriétaire du fichier de socket', 'Par le pare-feu', 'Par le numéro de port', 'Par /etc/hosts.allow uniquement'],
          reponse: 0,
          indices: ['C’est un fichier.', 'Pas de réseau : le pare-feu ne voit rien.', 'chmod, chown.'],
          solution: 'Une socket Unix est un fichier : ses droits (et ceux du répertoire) décident qui peut s’y connecter. Le pare-feu ne la voit pas.',
        },
        {
          id: 'c10-08-04', type: 'vrai-faux', niveau: 2, ref: '§10.9–10.10',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Une socket Unix permet de communiquer avec une autre machine.', vrai: false, explication: 'Seulement entre processus de la même machine.' },
            { texte: '`SOCK_STREAM` correspond à TCP, `SOCK_DGRAM` à UDP.', vrai: true },
            { texte: 'Pouvoir écrire dans /var/run/docker.sock revient à être root.', vrai: true },
            { texte: 'Dans `ls -l`, une socket a le type `s`.', vrai: true },
          ],
          indices: ['Unix = local.', 'Une seule fausse.', 'Docker lance des conteneurs avec tous les droits.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
        {
          id: 'c10-08-05', type: 'terminal', niveau: 2,
          enonce: 'Sur cuve : `ls -l /run/systemd/journal/` puis `sudo lsof -U | head`. Colle la sortie. Repère une socket et le processus qui l’utilise.',
          attendu: ['^s|unix|socket'],
          indices: ['Le premier caractère des lignes est le type.', 'lsof -U liste les sockets Unix.', 'systemd-journald en tient plusieurs.'],
          solution: 'Dans `/run/systemd/journal/`, `socket`, `stdout` et `dev-log` sont de type `s`. `lsof -U` montre `systemd-journald`, `dbus-daemon`, `systemd`… qui les tiennent ouvertes.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Voir les en-têtes HTTP ? le détail de l’échange ?', r: '`curl -I URL` ; `curl -v URL`.' },
    { q: 'Où personnaliser sshd ?', r: '/etc/ssh/sshd_config.d/*.conf (première valeur lue gagne).' },
    { q: 'Tester / afficher la config effective de sshd ?', r: '`sshd -t` ; `sshd -T`.' },
    { q: 'Interdire root et les mots de passe en SSH ?', r: '`PermitRootLogin no`, `PasswordAuthentication no`.' },
    { q: 'Créer et installer une clé SSH ?', r: '`ssh-keygen -t ed25519` puis `ssh-copy-id user@hôte`.' },
    { q: 'Droits exigés par sshd côté serveur ?', r: '~/.ssh 700, authorized_keys 600, rien d’écrivable par les autres sur le chemin.' },
    { q: 'Clé d’hôte changée après réinstallation ?', r: 'Vérifier l’empreinte puis `ssh-keygen -R hôte`.' },
    { q: 'Rebond SSH ?', r: '`ssh -J relais destination` ou `ProxyJump relais` dans ~/.ssh/config.' },
    { q: 'Tunnel vers un service local de cuve ?', r: '`ssh -L 8080:127.0.0.1:8080 cuve`.' },
    { q: 'fail2ban : réglages clés ?', r: 'maxretry, findtime, bantime, ignoreip, backend = systemd ; dans jail.d/*.local.' },
    { q: 'Qui utilise le port 8080 ?', r: '`lsof -i :8080` ou `ss -tlnp \'sport = :8080\'`.' },
    { q: 'Capturer le DNS sur ens19 ?', r: '`tcpdump -i ens19 -n port 53` (`-w f.pcap` pour enregistrer).' },
    { q: 'tcpdump à distance sans boucle ?', r: 'Ajouter `not port 22`.' },
    { q: 'Tester un port avec netcat ?', r: '`nc -zv hôte port`.' },
    { q: 'nmap : découverte sans scan de ports ?', r: '`nmap -sn 192.168.50.0/24`.' },
    { q: 'open / closed / filtered ?', r: 'Service présent ; refus explicite ; silence (pare-feu).' },
    { q: 'Sockets Unix ?', r: 'Communication locale par fichier (type s) ; `ss -xl`, `lsof -U` ; accès par permissions.' },
  ],
  memo: `
    ### Clients
    \`\`\`
    curl -I URL   curl -v URL   curl -o fichier URL   nc hôte 80   openssl s_client -connect hôte:443
    \`\`\`

    ### Serveur SSH
    \`\`\`
    /etc/ssh/sshd_config.d/50-x.conf : PermitRootLogin no · PasswordAuthentication no · AllowGroups grp · MaxAuthTries 3
    sshd -t   sshd -T | grep …   systemctl reload ssh (Debian) / sshd (Rocky)
    ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
    \`\`\`

    ### Client SSH
    \`\`\`
    ssh-keygen -t ed25519   ssh-copy-id user@hôte   ssh-add   ssh-keygen -R hôte
    scp src user@hôte:dst   scp user@hôte:src .   sftp user@hôte   tar czf - d | ssh hôte tar xzf - -C /dst
    ssh -J relais dest   ssh -L 8080:127.0.0.1:8080 hôte
    ~/.ssh/config : Host · HostName · User · ProxyJump · IdentityFile
    \`\`\`

    ### fail2ban
    \`\`\`
    /etc/fail2ban/jail.d/sshd.local : [sshd] enabled=true backend=systemd maxretry=5 findtime=10m bantime=1h ignoreip=…
    fail2ban-client status sshd   fail2ban-client set sshd unbanip ADR
    \`\`\`

    ### Diagnostic
    \`\`\`
    ss -tulnp   lsof -nP -i   lsof -i :PORT   lsof -nP -iTCP -sTCP:LISTEN
    tcpdump -i IF -n [host A | net R/n | port P | tcp | udp | icmp] [and|or|not …] [-c N] [-w f.pcap] ; tcpdump -r f.pcap
    nc -zv hôte port   nc -l port   nmap -sn réseau   nmap hôte   nmap -p- hôte   nmap -sV hôte   rpcinfo -p hôte
    ss -xl   lsof -U
    \`\`\`
  `,
});
