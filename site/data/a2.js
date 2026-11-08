/* Module A2 (hors livre) : pare-feu moderne avec nftables et firewalld. */
HLW.chapitre({
  id: 'A2',
  intro: `
    Le livre présente le filtrage avec **iptables** (§9.25). Aujourd’hui, Debian et Rocky utilisent
    **nftables**, son successeur dans le noyau, et Rocky l’administre par **firewalld**. Tu as déjà écrit un
    jeu de règles nftables pour douane au Lab 07 : ce module en donne la grammaire complète, ajoute firewalld
    (incontournable au RHCSA) et les réflexes pour ne jamais te couper l’accès à une machine distante.
  `,
  objectifs: [
    'situer Netfilter, iptables, nftables et firewalld ;',
    'lire et écrire un jeu de règles nftables (tables, chaînes, règles, ensembles), le vérifier et le rendre permanent ;',
    'faire du NAT et de la redirection de port avec nftables ;',
    'administrer firewalld : zones, services, ports, règles permanentes ou temporaires ;',
    'modifier un pare-feu à distance sans se couper l’accès, et le tester depuis une autre machine.',
  ],
  certifs: { lpic1: ['110.2'], lfcs: ['NET'], rhcsa: ['R10'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: 'A2.1',
      titre: 'Netfilter, iptables, nftables, firewalld',
      objectif: 'Savoir qui fait quoi entre le noyau et la commande que tu tapes.',
      rappel: `
        Le filtrage est fait **dans le noyau** par **Netfilter**, qui offre des points d’accroche (*hooks*) sur
        le chemin des paquets : \`prerouting\`, \`input\`, \`forward\`, \`output\`, \`postrouting\` (fiche 9.12
        et §9.25 du livre). Les outils ne font que programmer ces points :

        | Outil | Rôle | Où |
        |---|---|---|
        | **iptables** | ancienne interface (tables fixes filter, nat…) | encore présente, souvent en version **iptables-nft** qui traduit vers nftables |
        | **nftables** (\`nft\`) | interface moderne : une seule commande pour IPv4, IPv6, ARP, ponts | Debian 13 (\`/etc/nftables.conf\`) |
        | **firewalld** | démon de plus haut niveau : zones, services | Rocky 10 (activé par défaut), il écrit des règles nftables |
        | ufw | équivalent simplifié sur Ubuntu | hors de nos VM |

        Un seul gestionnaire à la fois : si firewalld tourne, ne modifie pas ses tables à la main avec \`nft\`.

        ### Vocabulaire nftables

        - une **table** appartient à une **famille** : \`ip\` (IPv4), \`ip6\`, **\`inet\`** (les deux à la fois), \`arp\`, \`bridge\` ;
        - une **chaîne de base** est accrochée à un hook avec un **type** (\`filter\`, \`nat\`, \`route\`), une
          **priorité** et une **politique** (\`accept\` ou \`drop\`) ;
        - une **règle** = des critères + une action (\`accept\`, \`drop\`, \`reject\`, \`jump\`, \`log\`, \`counter\`…).

        \`\`\`
        $ sudo nft list ruleset           # tout ce qui est chargé
        $ sudo nft list tables
        $ sudo iptables -L -n -v          # avec iptables-nft : montre la traduction
        $ systemctl is-active firewalld nftables
        \`\`\`
      `,
      aRetenir: [
        'Netfilter (noyau) ; iptables (ancien), nftables (moderne), firewalld (zones, sur Rocky).',
        'Un seul gestionnaire à la fois.',
        'nftables : table (famille ip, ip6, inet…) → chaîne (hook, type, priorité, politique) → règles.',
        '`nft list ruleset`.',
      ],
      exercices: [
        {
          id: 'cA2-01-01', type: 'association', niveau: 1,
          enonce: 'Associe chaque élément à son rôle.',
          paires: [['Netfilter', 'Filtrage des paquets dans le noyau'], ['nft', 'Commande qui programme les règles nftables'], ['firewalld', 'Démon à zones qui écrit des règles nftables'], ['iptables-nft', 'Ancienne syntaxe traduite vers nftables']],
          indices: ['Le noyau fait le travail.', 'Les autres sont des interfaces.', 'firewalld est un démon.'],
          solution: 'Netfilter : noyau ; nft : commande nftables ; firewalld : démon à zones ; iptables-nft : compatibilité.',
        },
        {
          id: 'cA2-01-02', type: 'commande', niveau: 1,
          enonce: 'Affiche l’ensemble des règles nftables chargées.',
          accepte: ['(sudo )?nft list ruleset', '(sudo )?nft -a list ruleset', '(sudo )?nft --handle list ruleset'],
          exemple: 'nft list ruleset',
          indices: ['Commande nft.', 'Sous-commande list.', 'L’ensemble des règles = ruleset.'],
          solution: '```\n$ sudo nft list ruleset\n```\n`-a` ajoute les numéros (handle) de chaque règle, utiles pour en supprimer une.',
        },
        {
          id: 'cA2-01-03', type: 'qcm', niveau: 2,
          enonce: 'Quelle famille de table permet d’écrire une seule règle valable pour IPv4 **et** IPv6 ?',
          choix: ['inet', 'ip', 'ip6', 'bridge'],
          reponse: 0,
          indices: ['ip = IPv4 seulement.', 'ip6 = IPv6 seulement.', 'Une famille regroupe les deux.'],
          solution: '**inet** : une seule table pour les deux protocoles. C’est le choix par défaut pour un pare-feu d’hôte.',
        },
        {
          id: 'cA2-01-04', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Sur Rocky 10, firewalld est actif par défaut.', vrai: true },
            { texte: 'Quand firewalld tourne, on peut sans risque ajouter des règles à ses tables avec nft.', vrai: false, explication: 'firewalld réécrit ses tables : les ajouts manuels disparaissent ou entrent en conflit.' },
            { texte: 'Une chaîne de base nftables a une politique par défaut (accept ou drop).', vrai: true },
            { texte: 'iptables a disparu des distributions récentes.', vrai: false, explication: 'La commande existe souvent encore, sous forme iptables-nft.' },
          ],
          indices: ['firewalld est le gestionnaire de Rocky.', 'Deux fausses.', 'iptables-nft.'],
          solution: 'Vrai, faux, vrai, faux.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A2.2',
      titre: 'Écrire un jeu de règles nftables',
      objectif: 'Un pare-feu d’hôte « tout fermé sauf » lisible, vérifié et permanent.',
      rappel: `
        Sur Debian, le fichier chargé au démarrage est **\`/etc/nftables.conf\`**, par \`nftables.service\`.

        \`\`\`
        #!/usr/sbin/nft -f
        flush ruleset

        table inet filtre {
            set admins {
                type ipv4_addr
                elements = { 192.168.50.10, 192.168.50.11 }
            }

            chain entree {
                type filter hook input priority filter; policy drop;

                ct state established,related accept      # réponses aux connexions sortantes
                ct state invalid drop
                iif "lo" accept                           # boucle locale
                meta l4proto { icmp, ipv6-icmp } accept   # ping, découverte IPv6
                ip saddr @admins tcp dport 22 accept      # SSH, seulement depuis les admins
                tcp dport { 80, 443 } accept              # la vitrine
                counter log prefix "nft-refus: " drop     # compter et journaliser le reste
            }

            chain transit {
                type filter hook forward priority filter; policy drop;
            }
        }
        \`\`\`

        \`\`\`
        $ sudo nft -c -f /etc/nftables.conf       # vérifier la syntaxe sans charger
        $ sudo nft -f /etc/nftables.conf          # charger
        $ sudo systemctl enable --now nftables    # recharger à chaque démarrage
        $ sudo nft add rule inet filtre entree tcp dport 8080 accept    # ajout à chaud (non permanent)
        $ sudo nft -a list chain inet filtre entree ; sudo nft delete rule inet filtre entree handle 12
        \`\`\`

        Points clés :

        - **politique drop** : tout ce qui n’est pas explicitement accepté est refusé ;
        - la règle **\`ct state established,related accept\`** vient en premier : sans elle, les réponses à tes
          propres connexions (mises à jour, DNS) seraient bloquées ;
        - les **ensembles** (\`{ 80, 443 }\`, \`set admins\`) évitent de dupliquer des règles ;
        - les règles se lisent **dans l’ordre** : la première qui décide gagne ;
        - une modification à chaud est perdue au redémarrage : on édite le fichier et on le recharge.
      `,
      aRetenir: [
        '/etc/nftables.conf + nftables.service (Debian) ; `nft -c -f` pour vérifier, `nft -f` pour charger.',
        'Chaîne input en `policy drop` ; d’abord `ct state established,related accept`, puis lo, ICMP, services.',
        'Ensembles anonymes `{ 80, 443 }` ou nommés `@admins` ; `counter`, `log prefix`.',
        '`nft add rule …` (à chaud), `nft -a list …` + `delete rule … handle N`.',
      ],
      exercices: [
        {
          id: 'cA2-02-01', type: 'commande', niveau: 1,
          enonce: 'Vérifie la syntaxe de `/etc/nftables.conf` **sans** charger les règles.',
          accepte: ['(sudo )?nft -c -f /etc/nftables\\.conf', '(sudo )?nft --check -f /etc/nftables\\.conf', '(sudo )?nft -cf /etc/nftables\\.conf', '(sudo )?nft --check --file /etc/nftables\\.conf'],
          exemple: 'nft -c -f /etc/nftables.conf',
          pieges: [{ motif: '(sudo )?nft -f /etc/nftables\\.conf', message: 'Cette commande charge les règles : il faut d’abord seulement vérifier (option -c).' }],
          indices: ['nft lit un fichier avec -f.', 'Une option vérifie (check) sans appliquer.', '`nft -c -f /etc/nftables.conf`'],
          solution: '```\n$ sudo nft -c -f /etc/nftables.conf\n```\nAucune sortie = syntaxe correcte.',
        },
        {
          id: 'cA2-02-02', type: 'trous', niveau: 2,
          enonce: 'Complète la chaîne d’entrée : tout refuser par défaut, et accepter les réponses aux connexions établies.',
          texte: 'chain entree {\n    type filter hook [[1]] priority filter; policy [[2]];\n    ct state [[3]] accept\n}',
          trous: [{ accepte: ['input'], exemple: 'input' }, { accepte: ['drop'], exemple: 'drop' }, { accepte: ['established,related', 'related,established', '\\{ ?established, ?related ?\\}'], exemple: 'established,related' }],
          indices: ['Le trafic qui entre vers la machine elle-même.', 'Politique « tout fermé ».', 'Les connexions déjà établies et liées.'],
          solution: '```\nchain entree {\n    type filter hook input priority filter; policy drop;\n    ct state established,related accept\n}\n```',
        },
        {
          id: 'cA2-02-03', type: 'qcm', niveau: 2,
          enonce: 'Tu charges un jeu de règles avec `policy drop` sur input, qui accepte SSH et HTTP, mais **sans** la règle `ct state established,related accept`. Que se passe-t-il ?',
          choix: [
            'Les réponses aux connexions que la machine ouvre elle-même (DNS, mises à jour) sont bloquées',
            'Rien de particulier : la politique drop ne concerne que les nouvelles connexions',
            'SSH est bloqué immédiatement',
            'Le noyau refuse de charger ce jeu de règles',
          ],
          reponse: 0,
          indices: ['Une réponse DNS est un paquet qui ENTRE.', 'Sans suivi de connexion, il est traité comme un inconnu.', 'Il tombe dans la politique drop.'],
          solution: 'Les réponses à `apt update` ou au DNS arrivent sur input avec un port source 53/443 et un port destination aléatoire : aucune règle ne les accepte. Le suivi de connexion (conntrack) règle tout cela en une ligne.',
        },
        {
          id: 'cA2-02-04', type: 'commande', niveau: 2,
          enonce: 'Ajoute à chaud, dans la chaîne `entree` de la table `inet filtre`, une règle qui accepte le TCP vers le port 8080.',
          accepte: ['(sudo )?nft add rule inet filtre entree tcp dport 8080 accept', "(sudo )?nft 'add rule inet filtre entree tcp dport 8080 accept'", '(sudo )?nft add rule inet filtre entree tcp dport 8080 counter accept'],
          exemple: 'nft add rule inet filtre entree tcp dport 8080 accept',
          indices: ['add rule famille table chaîne critères action.', 'tcp dport 8080.', 'Attention : add ajoute en fin de chaîne (insert en tête).'],
          solution: '```\n$ sudo nft add rule inet filtre entree tcp dport 8080 accept\n```\nAttention : si la dernière règle de la chaîne est un `drop`, une règle ajoutée **après** ne sera jamais atteinte : utilise `insert` ou `add … position N`. Et reporte la règle dans /etc/nftables.conf pour qu’elle survive au redémarrage.',
        },
        {
          id: 'cA2-02-05', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Une règle ajoutée avec `nft add rule` est perdue au redémarrage si elle n’est pas dans /etc/nftables.conf.', vrai: true },
            { texte: '`tcp dport { 80, 443 } accept` remplace deux règles.', vrai: true },
            { texte: 'Les règles d’une chaîne sont évaluées dans un ordre aléatoire.', vrai: false },
            { texte: '`flush ruleset` en tête de fichier évite d’empiler les règles à chaque rechargement.', vrai: true },
          ],
          indices: ['À chaud = en mémoire.', 'Une seule fausse.', 'L’ordre compte.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
        {
          id: 'cA2-02-06', type: 'terminal', niveau: 2,
          enonce: 'Sur cuve (sans firewalld), installe nftables, écris le jeu de règles de la fiche (adapte l’ensemble `admins` à l’adresse de ton poste), vérifie avec `nft -c -f`, charge-le en gardant une **seconde** session SSH ouverte, puis `nft list ruleset`. Colle la sortie.',
          attendu: ['policy drop', 'established'],
          indices: ['Garde toujours une session de secours ouverte.', 'Teste une nouvelle connexion SSH avant de fermer l’ancienne.', 'Voir la fiche A2.5 pour une sécurité supplémentaire.'],
          solution: 'La sortie montre la table `inet filtre` avec ta chaîne `entree` en `policy drop`. Teste depuis ton poste : SSH passe, un port fermé (`nc -vz cuve 3306`) expire ; `journalctl -k | grep nft-refus` montre les refus.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A2.3',
      titre: 'NAT et redirection de port',
      objectif: 'Partager une connexion et publier un service interne, comme douane au Lab 07.',
      rappel: `
        Le NAT se fait dans des chaînes de **type nat** : \`postrouting\` pour changer la **source** (SNAT,
        masquerade), \`prerouting\` pour changer la **destination** (DNAT, redirection).

        \`\`\`
        table inet nat {
            chain avant {
                type nat hook prerouting priority dstnat;
                iifname "eth0" tcp dport 8080 dnat ip to 192.168.50.20:80     # publier la vitrine interne
            }
            chain apres {
                type nat hook postrouting priority srcnat;
                oifname "eth0" ip saddr 192.168.50.0/24 masquerade            # le LAN sort avec l'adresse de douane
            }
        }
        table inet filtre {
            chain transit {
                type filter hook forward priority filter; policy drop;
                ct state established,related accept
                iifname "eth1" oifname "eth0" accept                            # LAN → Internet
                ct status dnat accept                                           # trafic redirigé par la DNAT
            }
        }
        \`\`\`

        - Sans **\`net.ipv4.ip_forward = 1\`** (sysctl, fiche 9.11), rien ne traverse la machine.
        - **masquerade** prend l’adresse de l’interface de sortie (pratique si elle change) ; \`snat to 203.0.113.5\`
          fixe une adresse.
        - La DNAT ne suffit pas : la chaîne **forward** doit laisser passer le trafic redirigé.
      `,
      aRetenir: [
        'Type nat : prerouting (dnat, redirection) et postrouting (masquerade, snat).',
        '`masquerade` = adresse de l’interface de sortie ; `dnat ip to IP:port`.',
        'ip_forward=1 et une chaîne forward qui laisse passer (`ct status dnat accept`).',
      ],
      exercices: [
        {
          id: 'cA2-03-01', type: 'association', niveau: 2,
          enonce: 'Associe chaque besoin au hook et à l’action nftables.',
          paires: [
            ['Le LAN sort sur Internet avec l’adresse de douane', 'postrouting : masquerade'],
            ['Le port 8080 de douane mène au port 80 de la vitrine interne', 'prerouting : dnat'],
            ['Laisser passer le trafic entre le LAN et Internet', 'forward : accept'],
            ['Protéger douane elle-même', 'input : filtre'],
          ],
          indices: ['La source change en sortie.', 'La destination change à l’entrée.', 'Traverser = forward.'],
          solution: 'masquerade en postrouting ; dnat en prerouting ; transit en forward ; protection de l’hôte en input.',
        },
        {
          id: 'cA2-03-02', type: 'trous', niveau: 2,
          enonce: 'Complète la règle qui fait sortir le réseau 192.168.50.0/24 par eth0 avec l’adresse de douane.',
          texte: 'chain apres {\n    type nat hook [[1]] priority srcnat;\n    oifname "eth0" ip saddr 192.168.50.0/24 [[2]]\n}',
          trous: [{ accepte: ['postrouting'], exemple: 'postrouting' }, { accepte: ['masquerade', 'snat (ip )?to [0-9.]+'], exemple: 'masquerade' }],
          indices: ['La source se change à la sortie.', 'Action qui prend l’adresse de l’interface.', 'masquerade.'],
          solution: '```\nchain apres {\n    type nat hook postrouting priority srcnat;\n    oifname "eth0" ip saddr 192.168.50.0/24 masquerade\n}\n```',
        },
        {
          id: 'cA2-03-03', type: 'qcm', niveau: 3,
          enonce: 'La règle DNAT `tcp dport 8080 dnat ip to 192.168.50.20:80` est en place, ip_forward vaut 1, mais rien ne répond depuis Internet. La chaîne forward est en `policy drop` avec seulement `ct state established,related accept`. Que manque-t-il ?',
          choix: [
            'Une règle forward qui accepte le premier paquet redirigé (par exemple `ct status dnat accept`)',
            'Une règle input sur le port 8080',
            'Une règle output sur le port 80',
            'Rien : il faut redémarrer nftables',
          ],
          reponse: 0,
          indices: ['Après la DNAT, le paquet ne va plus vers douane mais à travers elle.', 'Il passe donc par forward.', 'Le premier paquet n’est pas encore « established ».'],
          solution: 'Le paquet redirigé traverse douane : c’est la chaîne **forward** qui décide, pas input. Le premier paquet (état new) n’est accepté par aucune règle. `ct status dnat accept` (ou une règle explicite vers 192.168.50.20:80) corrige.',
        },
        {
          id: 'cA2-03-04', type: 'commande', niveau: 1,
          enonce: 'Active immédiatement le routage IPv4 (sans le rendre permanent).',
          accepte: ['(sudo )?sysctl -w net\\.ipv4\\.ip_forward=1', '(sudo )?sysctl net\\.ipv4\\.ip_forward=1', 'echo 1 \\| sudo tee /proc/sys/net/ipv4/ip_forward', '(sudo )?sysctl -w net\\.ipv4\\.conf\\.all\\.forwarding=1'],
          exemple: 'sysctl -w net.ipv4.ip_forward=1',
          indices: ['Un paramètre du noyau.', 'sysctl -w.', 'net.ipv4.ip_forward.'],
          solution: '```\n$ sudo sysctl -w net.ipv4.ip_forward=1\n```\nPermanent : un fichier `/etc/sysctl.d/90-routage.conf` contenant `net.ipv4.ip_forward = 1`.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A2.4',
      titre: 'firewalld : zones et services',
      objectif: 'Administrer le pare-feu de Rocky comme le demande le RHCSA.',
      rappel: `
        firewalld classe les interfaces (ou les adresses source) dans des **zones** de confiance (\`public\`,
        \`internal\`, \`trusted\`, \`drop\`, \`block\`…) ; chaque zone autorise des **services** (définitions dans
        \`/usr/lib/firewalld/services/*.xml\` : ssh, http, nfs…) et des **ports**.

        \`\`\`
        $ sudo firewall-cmd --state
        $ sudo firewall-cmd --get-default-zone ; sudo firewall-cmd --get-active-zones
        $ sudo firewall-cmd --list-all                         # zone par défaut
        $ sudo firewall-cmd --get-services | tr ' ' '\\n' | grep -i http
        \`\`\`

        **Deux configurations** : la configuration **d’exécution** (immédiate, perdue au rechargement) et la
        configuration **permanente** (fichiers dans \`/etc/firewalld\`, appliquée au rechargement).

        \`\`\`
        $ sudo firewall-cmd --permanent --add-service=http       # permanent, pas encore actif
        $ sudo firewall-cmd --reload                             # appliquer la permanente
        $ sudo firewall-cmd --add-port=8080/tcp                  # immédiat, temporaire
        $ sudo firewall-cmd --runtime-to-permanent               # garder ce qui marche
        $ sudo firewall-cmd --permanent --remove-service=cockpit
        $ sudo firewall-cmd --permanent --zone=internal --add-interface=eth1
        $ sudo firewall-cmd --permanent --zone=internal --add-source=192.168.50.0/24
        \`\`\`

        Règles plus fines (*rich rules*) :

        \`\`\`
        $ sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.50.10" service name="ssh" accept'
        $ sudo firewall-cmd --permanent --add-masquerade
        $ sudo firewall-cmd --permanent --add-forward-port=port=8080:proto=tcp:toport=80:toaddr=192.168.50.20
        \`\`\`

        Un service SELinux peut aussi bloquer un port (module A3) : ouvrir le pare-feu ne suffit pas toujours.
      `,
      aRetenir: [
        'Zones (public, internal, trusted…) contenant services, ports, interfaces, sources.',
        'Exécution vs `--permanent` ; `--reload` ; `--runtime-to-permanent`.',
        '`--list-all`, `--add-service`, `--add-port=8080/tcp`, `--add-interface`, `--add-source`.',
        '`--add-rich-rule`, `--add-masquerade`, `--add-forward-port`.',
      ],
      exercices: [
        {
          id: 'cA2-04-01', type: 'commande', niveau: 1,
          enonce: 'Sur fut, autorise **de façon permanente** le service `http` dans la zone par défaut.',
          accepte: ['(sudo )?firewall-cmd --permanent --add-service=http', '(sudo )?firewall-cmd --add-service=http --permanent', '(sudo )?firewall-cmd --permanent --zone=public --add-service=http', '(sudo )?firewall-cmd --zone=public --permanent --add-service=http'],
          exemple: 'firewall-cmd --permanent --add-service=http',
          pieges: [{ motif: '(sudo )?firewall-cmd --add-service=http', message: 'Sans --permanent, la règle disparaît au prochain rechargement.' }],
          indices: ['firewall-cmd.', 'Une option rend la modification permanente.', 'Puis --reload pour l’appliquer.'],
          solution: '```\n$ sudo firewall-cmd --permanent --add-service=http\n$ sudo firewall-cmd --reload\n$ sudo firewall-cmd --list-services\n```',
        },
        {
          id: 'cA2-04-02', type: 'commande', niveau: 1,
          enonce: 'Ouvre **immédiatement** (pas de façon permanente) le port TCP 8080.',
          accepte: ['(sudo )?firewall-cmd --add-port=8080/tcp', '(sudo )?firewall-cmd --zone=public --add-port=8080/tcp', '(sudo )?firewall-cmd --add-port 8080/tcp'],
          exemple: 'firewall-cmd --add-port=8080/tcp',
          indices: ['Option --add-port.', 'Format port/protocole.', 'Sans --permanent.'],
          solution: '```\n$ sudo firewall-cmd --add-port=8080/tcp\n```\nSi l’essai est concluant : `firewall-cmd --runtime-to-permanent`.',
        },
        {
          id: 'cA2-04-03', type: 'qcm', niveau: 2,
          enonce: 'Tu as tapé `firewall-cmd --permanent --add-service=nfs`, mais les clients NFS sont toujours bloqués. Pourquoi ?',
          choix: [
            'La configuration permanente n’est appliquée qu’après `firewall-cmd --reload`',
            'Le service nfs n’existe pas dans firewalld',
            'Il faut redémarrer la machine',
            'firewalld ne gère que TCP',
          ],
          reponse: 0,
          indices: ['Deux configurations coexistent.', '--permanent écrit sur disque.', 'Il faut recharger.'],
          solution: '`--permanent` modifie seulement les fichiers. `firewall-cmd --reload` les applique (ou refais la commande sans `--permanent`).',
        },
        {
          id: 'cA2-04-04', type: 'commande', niveau: 2,
          enonce: 'Place l’interface `eth1` dans la zone `internal`, de façon permanente.',
          accepte: ['(sudo )?firewall-cmd --permanent --zone=internal --add-interface=eth1', '(sudo )?firewall-cmd --zone=internal --permanent --add-interface=eth1', '(sudo )?firewall-cmd --zone=internal --add-interface=eth1 --permanent', '(sudo )?firewall-cmd --permanent --zone=internal --change-interface=eth1'],
          exemple: 'firewall-cmd --permanent --zone=internal --add-interface=eth1',
          indices: ['--zone pour choisir la zone.', '--add-interface.', '--permanent.'],
          solution: '```\n$ sudo firewall-cmd --permanent --zone=internal --add-interface=eth1\n$ sudo firewall-cmd --reload\n$ sudo firewall-cmd --get-active-zones\n```\n(Avec NetworkManager, `nmcli connection modify eth1 connection.zone internal` fait de même.)',
        },
        {
          id: 'cA2-04-05', type: 'association', niveau: 2,
          enonce: 'Associe chaque commande firewalld à son effet.',
          paires: [
            ['`--list-all`', 'Tout afficher pour la zone par défaut'],
            ['`--runtime-to-permanent`', 'Enregistrer la configuration d’exécution actuelle'],
            ['`--add-masquerade`', 'Activer le NAT de sortie'],
            ['`--add-rich-rule=…`', 'Règle fine (source, service, action, journalisation)'],
          ],
          indices: ['list = afficher.', 'runtime → permanent.', 'masquerade = NAT.'],
          solution: 'list-all : afficher ; runtime-to-permanent : enregistrer ; add-masquerade : NAT ; rich rule : règle fine.',
        },
        {
          id: 'cA2-04-06', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'La zone `drop` rejette silencieusement tout le trafic entrant non sollicité.', vrai: true },
            { texte: 'Les définitions des services firewalld sont des fichiers XML.', vrai: true },
            { texte: 'Une modification sans --permanent survit à `firewall-cmd --reload`.', vrai: false },
            { texte: 'On peut classer du trafic dans une zone selon son adresse source.', vrai: true },
          ],
          indices: ['drop = silence.', 'Une seule fausse.', '--add-source.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A2.5',
      titre: 'Modifier un pare-feu à distance sans se couper l’accès',
      objectif: 'Prendre les précautions d’un administrateur qui n’a pas de console sous la main.',
      rappel: `
        Une erreur de pare-feu sur une machine distante peut te couper l’accès SSH. Les précautions :

        1. **Une session de secours** reste ouverte pendant la modification ; tu testes une **nouvelle**
           connexion avant de fermer l’ancienne.
        2. **Vérifier avant de charger** : \`nft -c -f fichier\`.
        3. **Un retour automatique** si tu ne confirmes pas :

        \`\`\`
        # sauvegarde, puis rechargement de l'ancienne version dans 5 minutes sauf annulation
        $ sudo nft list ruleset > /root/nft-avant.conf
        $ echo 'nft -f /root/nft-avant.conf' | sudo at now + 5 minutes     # note le numéro du travail
        $ sudo nft -f /etc/nftables.conf
        # … nouvelle connexion SSH OK ? alors :
        $ sudo atrm 7
        \`\`\`

        Avec firewalld : \`firewall-cmd --add-service=http --timeout=5m\` (la règle disparaît seule) ; la
        configuration permanente n’est appliquée qu’au \`--reload\`.

        4. **Tester depuis l’extérieur**, pas depuis la machine elle-même : \`nc -vz cuve 22\`, \`nmap -Pn cuve\`
           depuis ton poste ou douane (fiche 10.6).
        5. **Observer** : compteurs (\`counter\`), journal (\`log prefix\`, puis \`journalctl -k\`),
           \`nft monitor trace\` pour suivre un paquet, et sur Proxmox, garde la **console** de la VM comme
           ultime recours (elle ne passe pas par le réseau).
      `,
      aRetenir: [
        'Session de secours + test d’une nouvelle connexion.',
        '`nft -c -f`, puis retour automatique avec `at` (annulé par `atrm`) ; firewalld : `--timeout`.',
        'Tester depuis une autre machine (nc, nmap) ; counter, log, `journalctl -k`.',
        'Console Proxmox en dernier recours.',
      ],
      exercices: [
        {
          id: 'cA2-05-01', type: 'ordre', niveau: 2,
          enonce: 'Remets dans l’ordre une modification sûre du pare-feu de cuve, à distance.',
          elements: [
            'Ouvrir une seconde session SSH de secours',
            'Sauvegarder les règles actuelles (nft list ruleset > fichier)',
            'Programmer leur rechargement automatique dans 5 minutes (at)',
            'Vérifier puis charger les nouvelles règles (nft -c -f, puis nft -f)',
            'Tester une nouvelle connexion SSH depuis le poste',
            'Annuler le retour automatique (atrm)',
          ],
          indices: ['Le filet de sécurité d’abord.', 'On ne charge qu’après avoir préparé le retour.', 'On n’annule le retour qu’après un test réussi.'],
          solution: 'Session de secours → sauvegarde → retour automatique programmé → vérification et chargement → test d’une nouvelle connexion → annulation du retour.',
        },
        {
          id: 'cA2-05-02', type: 'commande', niveau: 2,
          enonce: 'Sur fut, autorise le service `http` pour **10 minutes** seulement.',
          accepte: ['(sudo )?firewall-cmd --add-service=http --timeout=10m', '(sudo )?firewall-cmd --timeout=10m --add-service=http', '(sudo )?firewall-cmd --add-service=http --timeout=600', '(sudo )?firewall-cmd --add-service=http --timeout 10m'],
          exemple: 'firewall-cmd --add-service=http --timeout=10m',
          indices: ['Option de durée.', '--timeout.', 'Valeur avec unité (m) ou en secondes.'],
          solution: '```\n$ sudo firewall-cmd --add-service=http --timeout=10m\n```',
        },
        {
          id: 'cA2-05-03', type: 'qcm', niveau: 2,
          enonce: 'Pour vérifier que le port 3306 de cuve est bien fermé, où lancer le test ?',
          choix: ['Depuis une autre machine (ton poste ou douane), par exemple `nc -vz cuve 3306`', 'Sur cuve, avec `ss -ltn`', 'Sur cuve, avec `nc -vz 127.0.0.1 3306`', 'Sur Proxmox, avec `qm status`'],
          reponse: 0,
          indices: ['Le pare-feu filtre le trafic venant de l’extérieur.', 'Le trafic local passe souvent par lo, accepté.', 'ss montre l’écoute, pas le filtrage.'],
          solution: 'Seul un test depuis l’extérieur traverse le filtrage d’entrée. `ss -ltn` dit si un programme écoute, pas si le pare-feu laisse passer.',
        },
        {
          id: 'cA2-05-04', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'La console d’une VM dans Proxmox reste utilisable même si le pare-feu bloque SSH.', vrai: true },
            { texte: '`journalctl -k` montre les paquets refusés par une règle `log prefix`.', vrai: true },
            { texte: 'Si la session SSH en cours fonctionne encore, les nouvelles connexions passent forcément.', vrai: false, explication: 'La session existante est acceptée par « established » ; une nouvelle connexion peut être refusée.' },
            { texte: '`atrm` annule un travail programmé avec at.', vrai: true },
          ],
          indices: ['La console ne passe pas par le réseau.', 'Une seule fausse.', 'established ≠ new.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Qui filtre vraiment ?', r: 'Netfilter, dans le noyau ; iptables, nft et firewalld le programment.' },
    { q: 'Famille pour IPv4 + IPv6 ?', r: 'inet' },
    { q: 'Voir toutes les règles ?', r: '`nft list ruleset` (ajouter -a pour les handles).' },
    { q: 'Vérifier un fichier nftables ?', r: '`nft -c -f /etc/nftables.conf`' },
    { q: 'Première règle d’un input en drop ?', r: '`ct state established,related accept`' },
    { q: 'NAT de sortie / redirection ?', r: 'postrouting masquerade ; prerouting dnat ip to IP:port (+ forward).' },
    { q: 'firewalld permanent ?', r: '`--permanent` puis `--reload` ; ou `--runtime-to-permanent`.' },
    { q: 'Ouvrir un port avec firewalld ?', r: '`firewall-cmd --add-port=8080/tcp` (+ --permanent).' },
    { q: 'Interface dans une zone ?', r: '`firewall-cmd --permanent --zone=internal --add-interface=eth1`' },
    { q: 'Règle temporaire firewalld ?', r: '`--timeout=10m`' },
    { q: 'Filet de sécurité avec nft ?', r: 'Sauvegarde + `at now + 5 minutes` pour recharger l’ancienne version ; `atrm` si tout va bien.' },
  ],
  memo: `
    ### nftables
    \`\`\`
    nft list ruleset   nft -a list chain inet filtre entree   nft -c -f /etc/nftables.conf   nft -f …
    nft add rule inet filtre entree tcp dport 8080 accept   nft delete rule inet filtre entree handle N
    systemctl enable --now nftables   nft monitor trace   journalctl -k | grep nft-refus
    \`\`\`
    \`\`\`
    table inet filtre {
      chain entree { type filter hook input priority filter; policy drop;
        ct state established,related accept; ct state invalid drop; iif "lo" accept
        meta l4proto { icmp, ipv6-icmp } accept; tcp dport { 22, 80, 443 } accept; counter log prefix "nft-refus: " drop }
    }
    table inet nat {
      chain avant { type nat hook prerouting priority dstnat; iifname "eth0" tcp dport 8080 dnat ip to 192.168.50.20:80 }
      chain apres { type nat hook postrouting priority srcnat; oifname "eth0" masquerade }
    }
    \`\`\`
    ### firewalld
    \`\`\`
    firewall-cmd --state   --get-active-zones   --list-all [--zone=Z]
    --permanent --add-service=http   --reload   --add-port=8080/tcp   --runtime-to-permanent
    --permanent --zone=internal --add-interface=eth1 | --add-source=192.168.50.0/24
    --add-rich-rule='rule family="ipv4" source address="IP" service name="ssh" accept'
    --add-masquerade   --add-forward-port=port=8080:proto=tcp:toport=80:toaddr=IP   --timeout=10m
    \`\`\`
  `,
});
