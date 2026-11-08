/* Chapitre 9, partie 2 : noms, transport, DHCP, routeur, NAT, pare-feu, ARP, Wi-Fi (fiches 9.8 à 9.13). */
HLW.completer('09', {
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '9.8',
      titre: 'Résolution des noms d’hôtes',
      sections: '§9.15 et 9.16', pages: '243–247',
      objectif: 'Savoir où le système cherche un nom, et diagnostiquer une résolution qui échoue.',
      rappel: `
        Quand un programme veut l’adresse de \`cuve.brasserie.lan\`, il appelle la bibliothèque C, qui suit
        **\`/etc/nsswitch.conf\`** :

        \`\`\`
        hosts:  files dns            # d'abord /etc/hosts, puis le DNS
        \`\`\`

        (Avec systemd-resolved, on voit souvent \`files resolve [!UNAVAIL=return] dns myhostname\`.)

        ### /etc/hosts

        Correspondances statiques, consultées en premier :

        \`\`\`
        127.0.0.1       localhost
        192.168.50.10   cuve.brasserie.lan cuve
        \`\`\`

        Pratique pour un test ou un petit réseau, ingérable à grande échelle.

        ### /etc/resolv.conf

        Liste des serveurs DNS et domaines de recherche :

        \`\`\`
        nameserver 192.168.50.1
        search brasserie.lan          # « cuve » sera essayé comme cuve.brasserie.lan
        \`\`\`

        Sur la plupart des systèmes actuels, ce fichier est **généré** : par **systemd-resolved** (Debian, Ubuntu ;
        \`resolv.conf\` pointe alors vers le cache local \`127.0.0.53\`) ou par **NetworkManager** (Rocky). Le modifier à la
        main ne tient pas : on configure le DNS dans Netplan ou nmcli.

        \`\`\`
        $ resolvectl status              # serveurs DNS par interface (systemd-resolved)
        $ resolvectl query cuve.brasserie.lan
        $ getent hosts cuve              # résolution EXACTEMENT comme un programme (nsswitch compris)
        \`\`\`

        **Piège classique** : \`host\` et \`dig\` interrogent le DNS **directement**, sans \`/etc/hosts\`. Pour savoir ce que
        verra une application, utilise \`getent hosts\`.

        ### localhost

        \`localhost\` = \`127.0.0.1\` (IPv4) et \`::1\` (IPv6), l’interface \`lo\`. Un service qui écoute seulement sur
        127.0.0.1 n’est **pas** joignable depuis le réseau.
      `,
      aRetenir: [
        '`/etc/nsswitch.conf` (ligne hosts) décide de l’ordre : files puis dns.',
        '`/etc/hosts` : correspondances statiques ; `/etc/resolv.conf` : nameserver, search.',
        'resolv.conf souvent généré (systemd-resolved 127.0.0.53, NetworkManager) : configurer le gestionnaire.',
        '`getent hosts` (comme une appli) vs `host`/`dig` (DNS seul) ; `resolvectl`.',
      ],
      exercices: [
        {
          id: 'c09-08-01', type: 'ordre', niveau: 2, ref: '§9.15',
          enonce: 'Avec `hosts: files dns`, remets dans l’ordre ce qui se passe quand un programme cherche `cuve`.',
          elements: [
            'Le programme appelle la bibliothèque C (getaddrinfo)',
            'La bibliothèque lit la ligne hosts de /etc/nsswitch.conf',
            'Elle cherche cuve dans /etc/hosts',
            'Faute de réponse, elle interroge le serveur DNS de /etc/resolv.conf',
          ],
          indices: ['Tout part du programme.', 'nsswitch donne l’ordre.', 'files avant dns.'],
          solution: 'Programme → bibliothèque C → nsswitch.conf → /etc/hosts → DNS.',
        },
        {
          id: 'c09-08-02', type: 'qcm', niveau: 2, ref: '§9.15.1',
          enonce: 'Tu as ajouté `192.168.50.10 cuve` dans `/etc/hosts`. `ping cuve` marche, mais `host cuve` répond « not found ». Pourquoi ?',
          choix: [
            '`host` interroge le DNS directement, sans passer par /etc/hosts',
            'Le fichier /etc/hosts est mal écrit',
            'Il faut redémarrer la machine',
            'ping utilise IPv6',
          ],
          reponse: 0,
          indices: ['ping passe par la bibliothèque C.', 'host est un outil DNS pur.', 'Quel outil suit nsswitch.conf ?'],
          solution: '`host` et `dig` parlent directement au serveur DNS. `ping` (comme toute application) passe par la bibliothèque C et nsswitch, donc lit /etc/hosts. Pour tester comme une application : `getent hosts cuve`.',
        },
        {
          id: 'c09-08-03', type: 'commande', niveau: 1, ref: '§9.15',
          enonce: 'Résous le nom `cuve` exactement comme le ferait une application (fichier hosts compris).',
          accepte: ['getent (a)?hosts cuve'],
          exemple: 'getent hosts cuve',
          indices: ['C’est la commande de la fiche 7.3, avec une autre base.', '`getent BASE CLÉ`', '`getent hosts cuve`'],
          solution: '```\n$ getent hosts cuve\n192.168.50.10   cuve.brasserie.lan cuve\n```',
        },
        {
          id: 'c09-08-04', type: 'trous', niveau: 1, ref: '§9.15.2, p. 245',
          enonce: 'Complète `/etc/resolv.conf` : serveur DNS `192.168.50.1`, et les noms courts complétés par `brasserie.lan`.',
          texte: '[[1]] 192.168.50.1\n[[2]] brasserie.lan',
          trous: [
            { accepte: ['nameserver'], exemple: 'nameserver' },
            { accepte: ['search', 'domain'], exemple: 'search' },
          ],
          indices: ['Le mot-clé du serveur de noms.', 'Le mot-clé de recherche.', 'nameserver, search.'],
          solution: '```\nnameserver 192.168.50.1\nsearch brasserie.lan\n```\nSur une machine avec systemd-resolved ou NetworkManager, ce fichier est généré : configure plutôt le gestionnaire.',
        },
        {
          id: 'c09-08-05', type: 'qcm', niveau: 2, ref: '§9.15.3',
          enonce: 'Sur cuve, `/etc/resolv.conf` contient seulement `nameserver 127.0.0.53`. Qu’est-ce que cela signifie ?',
          choix: [
            'systemd-resolved sert de cache DNS local ; les vrais serveurs se voient avec `resolvectl status`',
            'Le DNS est en panne',
            'La machine est son propre serveur DNS faisant autorité',
            'C’est une adresse IPv6',
          ],
          reponse: 0,
          indices: ['127.x.x.x est l’adresse de bouclage.', 'Un service local répond à la place des serveurs.', 'resolvectl.'],
          solution: '127.0.0.53 est le **résolveur local** de systemd-resolved. Il relaie vers les serveurs DNS de chaque interface (`resolvectl status`) et garde les réponses en cache.',
        },
        {
          id: 'c09-08-06', type: 'vrai-faux', niveau: 2, ref: '§9.16',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un service qui écoute sur 127.0.0.1 est joignable depuis les autres machines.', vrai: false, explication: '127.0.0.1 n’existe que sur la machine elle-même.' },
            { texte: '`localhost` correspond à 127.0.0.1 et à ::1.', vrai: true },
            { texte: 'Modifier /etc/resolv.conf à la main peut être écrasé par NetworkManager ou systemd-resolved.', vrai: true },
            { texte: 'La ligne `hosts:` de /etc/nsswitch.conf fixe l’ordre des sources de noms.', vrai: true },
          ],
          indices: ['Bouclage = interne.', 'Une seule fausse.', 'resolv.conf est souvent un lien vers un fichier généré.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '9.9',
      titre: 'Couche transport : TCP, UDP et ports',
      sections: '§9.17', pages: '247–251',
      objectif: 'Comprendre ports et connexions, et lister ce qui écoute sur une machine.',
      rappel: `
        La couche transport relie des **programmes**, identifiés par un **numéro de port** (0 à 65535). Une connexion
        TCP est définie par quatre valeurs : adresse et port source, adresse et port destination.

        | | TCP | UDP |
        |---|---|---|
        | Connexion | oui (poignée de main SYN, SYN-ACK, ACK) | non |
        | Fiabilité | ordre garanti, retransmission | aucune : paquets perdus = perdus |
        | Usage | HTTP, SSH, SMTP, bases de données | DNS, DHCP, NTP, streaming, jeux, WireGuard |

        Ports **bien connus** (sous 1024, réservés à root pour écouter) : 22 SSH, 25 SMTP, 53 DNS, 67/68 DHCP,
        80 HTTP, 123 NTP, 443 HTTPS. Liste : \`/etc/services\`. Le client utilise un port **éphémère** choisi au hasard
        (32768–60999).

        ### Qui écoute ? Qui est connecté ?

        Le livre utilise \`netstat\` ; son remplaçant est **\`ss\`** (mêmes options principales) :

        \`\`\`
        $ ss -tln              # TCP (-t), en écoute (-l), sans résolution de noms (-n)
        State   Recv-Q Send-Q  Local Address:Port   Peer Address:Port
        LISTEN  0      128           0.0.0.0:22          0.0.0.0:*
        LISTEN  0      5           127.0.0.1:8080        0.0.0.0:*
        $ ss -uln              # UDP en écoute
        $ ss -tn               # connexions TCP établies
        # ss -tlnp             # + le processus (-p, en root pour tout voir)
        $ ss -tln 'sport = :22'
        \`\`\`

        \`0.0.0.0:22\` (ou \`*:22\`, \`[::]:22\`) : écoute sur **toutes** les adresses. \`127.0.0.1:8080\` : seulement en local.
      `,
      aRetenir: [
        'TCP : connexion, fiable (SSH, HTTP) ; UDP : sans connexion (DNS, DHCP, NTP).',
        'Ports : 22 SSH, 53 DNS, 67/68 DHCP, 80 HTTP, 443 HTTPS, 123 NTP ; < 1024 = root ; /etc/services.',
        '`ss -tlnp` (TCP en écoute + processus), `-u` UDP, `-tn` connexions ; remplace netstat.',
        '0.0.0.0 = toutes les adresses ; 127.0.0.1 = local seulement.',
      ],
      exercices: [
        {
          id: 'c09-09-01', type: 'association', niveau: 1, ref: '§9.17.1, p. 248',
          enonce: 'Associe chaque service à son port habituel.',
          paires: [['SSH', '22'], ['DNS', '53'], ['HTTP', '80'], ['HTTPS', '443'], ['NTP', '123'], ['SMTP', '25']],
          indices: ['/etc/services contient la liste.', 'SSH 22, HTTP 80.', 'DNS 53, NTP 123.'],
          solution: 'SSH 22, DNS 53, HTTP 80, HTTPS 443, NTP 123, SMTP 25.',
        },
        {
          id: 'c09-09-02', type: 'commande', niveau: 1, ref: '§9.17.1, p. 249',
          enonce: 'Liste les ports **TCP en écoute**, sous forme numérique, **avec le processus** associé.',
          accepte: ['(sudo )?ss -[tlnp]{4}', '(sudo )?ss -t -l -n -p', '(sudo )?ss -tln -p', '(sudo )?ss -tlp -n', '(sudo )?netstat -[tlnp]{4}'],
          exemple: 'sudo ss -tlnp',
          indices: ['L’outil moderne est `ss`.', 't TCP, l écoute, n numérique, p processus.', '`ss -tlnp`'],
          solution: '```\n$ sudo ss -tlnp\nLISTEN 0 128 0.0.0.0:22 0.0.0.0:* users:(("sshd",pid=812,fd=3))\n```',
        },
        {
          id: 'c09-09-03', type: 'qcm', niveau: 2, ref: '§9.17.2',
          enonce: 'Lesquels de ces protocoles d’application utilisent **UDP** ?',
          choix: ['DNS (requêtes ordinaires)', 'DHCP', 'NTP', 'SSH', 'HTTPS (HTTP/1.1 et HTTP/2)'],
          reponse: [0, 1, 2], multi: true,
          indices: ['Les échanges courts, sans connexion.', 'DHCP diffuse sans avoir encore d’adresse.', 'SSH et HTTPS ont besoin d’une connexion fiable.'],
          solution: 'DNS, DHCP et NTP utilisent UDP (DNS passe en TCP pour les grosses réponses). SSH et HTTPS (jusqu’à HTTP/2) utilisent TCP ; HTTP/3 passe par QUIC, au-dessus d’UDP.',
        },
        {
          id: 'c09-09-04', type: 'qcm', niveau: 2, ref: '§9.17.1',
          enonce: '`ss -tln` montre `LISTEN 0 5 127.0.0.1:8080`. Depuis comptoir, `curl http://cuve:8080` échoue. Pourquoi ?',
          choix: [
            'Le service n’écoute que sur l’adresse de bouclage : il n’est joignable que depuis cuve',
            'Le port 8080 est réservé à root',
            'curl ne sait pas utiliser le port 8080',
            'Il faut utiliser UDP',
          ],
          reponse: 0,
          indices: ['Regarde l’adresse locale.', '127.0.0.1 = la machine elle-même.', 'Il faudrait 0.0.0.0 ou l’adresse de cuve.'],
          solution: '127.0.0.1:8080 : le service n’accepte que les connexions locales. Il faut le configurer pour écouter sur 0.0.0.0 (ou l’adresse LAN), si c’est voulu. C’était le cas de la vitrine au Lab 04 : volontairement locale.',
        },
        {
          id: 'c09-09-05', type: 'commande', niveau: 2, ref: '§9.17.2',
          enonce: 'Liste les ports **UDP** en écoute, en numérique.',
          accepte: ['(sudo )?ss -[uln]{3}', '(sudo )?ss -u -l -n', '(sudo )?ss -[ulnp]{4}', '(sudo )?netstat -[uln]{3}'],
          exemple: 'ss -uln',
          indices: ['Comme pour TCP, avec une autre lettre.', 'u comme UDP.', '`ss -uln`'],
          solution: '```\n$ ss -uln\nUNCONN 0 0 127.0.0.54:53 0.0.0.0:*\nUNCONN 0 0 0.0.0.0:68  0.0.0.0:*\n```',
        },
        {
          id: 'c09-09-06', type: 'vrai-faux', niveau: 2, ref: '§9.17',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Seul root peut écouter sur un port inférieur à 1024 (par défaut).', vrai: true },
            { texte: 'Le client choisit d’habitude un port source éphémère, au hasard.', vrai: true },
            { texte: 'UDP garantit l’ordre d’arrivée des paquets.', vrai: false, explication: 'C’est TCP qui garantit l’ordre et la retransmission.' },
            { texte: '`ss` remplace `netstat`.', vrai: true },
          ],
          indices: ['Ports privilégiés.', 'Une seule fausse.', 'UDP ne garantit rien.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '9.10',
      titre: 'DHCP et configuration automatique d’IPv6',
      sections: '§9.18 à 9.20', pages: '252–254',
      objectif: 'Comprendre comment une machine obtient son adresse, et mettre en place un serveur DHCP.',
      rappel: `
        **DHCP** (*Dynamic Host Configuration Protocol*) distribue automatiquement : adresse, masque, passerelle, serveurs
        DNS, domaine. Le client, qui n’a pas encore d’adresse, **diffuse** sa demande sur le réseau local (UDP 67/68) :

        1. **D**iscover : « y a-t-il un serveur DHCP ? »
        2. **O**ffer : le serveur propose une adresse ;
        3. **R**equest : le client la demande ;
        4. **A**ck : le serveur confirme. C’est un **bail** (*lease*), à renouveler avant expiration.

        Clients : systemd-networkd et NetworkManager ont le leur (\`dhcpcd\` et \`dhclient\` existent aussi).

        \`\`\`
        $ networkctl status ens18        # adresse obtenue, serveur DHCP, bail (Debian)
        $ nmcli -f DHCP4 device show eth0 # (Rocky)
        \`\`\`

        ### Un serveur DHCP

        Le serveur ISC historique est abandonné ; on utilise **Kea** (gros réseaux) ou **dnsmasq**, qui fait DHCP **et**
        DNS en quelques lignes, idéal pour un petit réseau :

        \`\`\`
        # /etc/dnsmasq.d/boutique.conf
        interface=ens19                    # ne servir QUE le réseau interne
        bind-interfaces
        dhcp-range=192.168.50.100,192.168.50.150,12h
        dhcp-option=option:router,192.168.50.1
        domain=brasserie.lan
        \`\`\`

        Un seul serveur DHCP par réseau ! Un second (une box branchée par erreur) distribue de mauvaises adresses.

        ### IPv6 : configuration automatique

        En IPv6, les routeurs envoient des **annonces** (*Router Advertisements*). Avec **SLAAC**, l’hôte fabrique seul
        son adresse à partir du préfixe annoncé. DHCPv6 existe aussi, souvent en complément (DNS).
      `,
      aRetenir: [
        'DHCP : Discover, Offer, Request, Ack (DORA) ; bail à renouveler ; UDP 67/68.',
        'Distribue adresse, passerelle, DNS, domaine.',
        'dnsmasq : DHCP + DNS pour petit réseau (`dhcp-range`, `interface`, `bind-interfaces`).',
        'IPv6 : annonces de routeur + SLAAC (et DHCPv6).',
      ],
      exercices: [
        {
          id: 'c09-10-01', type: 'ordre', niveau: 1, ref: '§9.19',
          enonce: 'Remets dans l’ordre l’échange DHCP du comptoir qui démarre.',
          elements: ['Discover : le client diffuse sa demande', 'Offer : le serveur propose une adresse', 'Request : le client demande l’adresse proposée', 'Ack : le serveur confirme le bail'],
          indices: ['Moyen mnémotechnique : DORA.', 'Le client commence, sans adresse.', 'Le serveur confirme en dernier.'],
          solution: 'Discover → Offer → Request → Ack (DORA).',
        },
        {
          id: 'c09-10-02', type: 'trous', niveau: 2,
          enonce: 'Complète la configuration dnsmasq : servir seulement `ens19`, et distribuer les adresses de `.100` à `.150` pour 12 heures.',
          texte: '[[1]]=ens19\nbind-interfaces\n[[2]]=192.168.50.100,192.168.50.150,12h',
          trous: [
            { accepte: ['interface'], exemple: 'interface' },
            { accepte: ['dhcp-range'], exemple: 'dhcp-range' },
          ],
          indices: ['L’option qui limite à une interface.', 'La plage DHCP.', 'interface, dhcp-range.'],
          solution: '```\ninterface=ens19\nbind-interfaces\ndhcp-range=192.168.50.100,192.168.50.150,12h\n```',
        },
        {
          id: 'c09-10-03', type: 'qcm', niveau: 2, ref: '§9.19',
          enonce: 'Depuis qu’un stagiaire a branché une box au réseau de la boutique, certains postes reçoivent des adresses en `192.168.0.x` et n’accèdent plus à rien. Cause ?',
          choix: [
            'Un second serveur DHCP répond sur le même réseau',
            'Le DNS est en panne',
            'La passerelle a changé d’adresse MAC',
            'Le pare-feu bloque le port 22',
          ],
          reponse: 0,
          indices: ['Qui distribue des adresses ?', 'Deux serveurs répondent aux Discover.', 'Le plus rapide gagne.'],
          solution: 'La box contient un serveur DHCP : le premier qui répond l’emporte. Il ne faut qu’un serveur DHCP par réseau (ou activer la protection « DHCP snooping » sur les commutateurs).',
        },
        {
          id: 'c09-10-04', type: 'vrai-faux', niveau: 2, ref: '§9.19–9.20',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un client DHCP diffuse sa demande car il ne connaît pas encore le serveur.', vrai: true },
            { texte: 'DHCP utilise TCP.', vrai: false, explication: 'UDP, ports 67 (serveur) et 68 (client).' },
            { texte: 'Avec SLAAC, un hôte IPv6 construit son adresse à partir du préfixe annoncé par le routeur.', vrai: true },
            { texte: 'Une adresse DHCP est attribuée pour une durée limitée : le bail.', vrai: true },
          ],
          indices: ['Pas d’adresse = diffusion.', 'Une seule fausse.', 'UDP.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
        {
          id: 'c09-10-05', type: 'reponse-courte', niveau: 1,
          enonce: 'Quel port UDP utilise un **serveur** DHCP (IPv4) ?',
          accepte: ['67'],
          indices: ['Deux ports consécutifs.', 'Le client utilise 68.', 'Le serveur, l’autre.'],
          solution: '**67** (le client utilise 68).',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '9.11',
      titre: 'Linux routeur, réseaux privés et NAT',
      sections: '§9.21 à 9.24', pages: '254–259',
      objectif: 'Faire d’une machine Linux le routeur d’un réseau privé.',
      rappel: `
        Une machine à **deux interfaces**, une sur chaque réseau, peut faire passer les paquets de l’un à l’autre : c’est
        un **routeur**. Linux le fait, à condition d’activer le **transfert IP** (désactivé par défaut) :

        \`\`\`
        # sysctl -w net.ipv4.ip_forward=1                         # immédiat, perdu au redémarrage
        # echo 'net.ipv4.ip_forward = 1' > /etc/sysctl.d/90-routeur.conf
        # sysctl --system                                         # recharge les fichiers sysctl
        \`\`\`

        (IPv6 : \`net.ipv6.conf.all.forwarding = 1\`.)

        ### Réseaux privés

        Trois plages ne sont **pas routées sur Internet** (RFC 1918) : \`10.0.0.0/8\`, \`172.16.0.0/12\`, \`192.168.0.0/16\`.
        On les utilise librement chez soi ou dans une entreprise.

        ### NAT (masquerading)

        Une machine en \`192.168.50.x\` ne peut pas sortir telle quelle sur Internet : personne ne saurait lui répondre.
        Le routeur **réécrit l’adresse source** des paquets sortants avec sa propre adresse publique, mémorise la
        correspondance, et fait l’inverse pour les réponses. C’est la **traduction d’adresses** (NAT), ou
        *masquerading* quand l’adresse de sortie est celle de l’interface.

        Avec nftables (fiche 9.12) :

        \`\`\`
        table ip nat {
            chain postrouting {
                type nat hook postrouting priority srcnat; policy accept;
                ip saddr 192.168.50.0/24 oifname "ens18" masquerade
            }
        }
        \`\`\`

        Équivalent iptables (livre) : \`iptables -t nat -A POSTROUTING -o ens18 -j MASQUERADE\`.

        Le NAT inverse (**DNAT**, ou redirection de port) expose un service interne : « ce qui arrive sur le port 2222 de
        douane va vers 192.168.50.10:22 ».
      `,
      aRetenir: [
        'Routeur = 2 interfaces + `net.ipv4.ip_forward = 1` (fichier dans /etc/sysctl.d/ pour le rendre durable).',
        'Plages privées : 10/8, 172.16/12, 192.168/16.',
        'NAT/masquerade : réécrit la source des paquets sortants ; DNAT : redirection de port vers l’intérieur.',
        'nftables : chaîne `postrouting` de type nat, règle `masquerade`.',
      ],
      exercices: [
        {
          id: 'c09-11-01', type: 'commande', niveau: 1, ref: '§9.21, p. 255',
          enonce: 'Active **immédiatement** le transfert IPv4 sur douane.',
          accepte: ['(sudo )?sysctl -w net\\.ipv4\\.ip_forward=1', '(sudo )?sysctl net\\.ipv4\\.ip_forward=1', 'echo 1 > /proc/sys/net/ipv4/ip_forward', 'echo 1 \\| (sudo )?tee /proc/sys/net/ipv4/ip_forward'],
          exemple: 'sysctl -w net.ipv4.ip_forward=1',
          indices: ['Un paramètre du noyau, réglé avec sysctl.', 'net.ipv4.ip_forward', '`sysctl -w net.ipv4.ip_forward=1`'],
          solution: '```\n# sysctl -w net.ipv4.ip_forward=1\n```\nPour que ça survive au redémarrage : un fichier dans `/etc/sysctl.d/`.',
        },
        {
          id: 'c09-11-02', type: 'qcm', niveau: 1, ref: '§9.22, p. 256',
          enonce: 'Lesquelles de ces adresses sont **privées** (RFC 1918) ?',
          choix: ['10.42.0.7', '172.20.1.1', '192.168.50.10', '172.32.0.1', '8.8.8.8'],
          reponse: [0, 1, 2], multi: true,
          indices: ['10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16.', '172.16/12 va de 172.16 à 172.31.', '172.32 est en dehors.'],
          solution: '10.x, 172.16–172.31.x et 192.168.x sont privées. 172.32.0.1 et 8.8.8.8 sont publiques.',
        },
        {
          id: 'c09-11-03', type: 'trous', niveau: 2, ref: '§9.21',
          enonce: 'Rends le transfert IP **permanent** : complète le fichier `/etc/sysctl.d/90-routeur.conf` et la commande qui recharge la configuration.',
          texte: '[[1]] = 1\n\n# sysctl [[2]]',
          trous: [
            { accepte: ['net\\.ipv4\\.ip_forward'], exemple: 'net.ipv4.ip_forward' },
            { accepte: ['--system', '-p /etc/sysctl\\.d/90-routeur\\.conf', '-p'], exemple: '--system' },
          ],
          indices: ['Le même nom de paramètre qu’avec sysctl -w.', 'Une option recharge tous les fichiers de configuration.', '--system'],
          solution: '```\nnet.ipv4.ip_forward = 1\n```\npuis `sysctl --system` (ou `sysctl -p /etc/sysctl.d/90-routeur.conf`).',
        },
        {
          id: 'c09-11-04', type: 'qcm', niveau: 2, ref: '§9.23, p. 257',
          enonce: 'douane route bien les paquets (ip_forward = 1), mais comptoir (192.168.50.120) n’a toujours pas Internet. Ce qui manque le plus probablement ?',
          choix: [
            'Le NAT (masquerade) sur l’interface de sortie : les réponses ne savent pas revenir vers une adresse privée',
            'Un serveur web sur douane',
            'Une adresse IPv6',
            'Le port 22 ouvert',
          ],
          reponse: 0,
          indices: ['192.168.x n’est pas routée sur Internet.', 'Qui peut répondre à 192.168.50.120 ?', 'Il faut réécrire la source.'],
          solution: 'Sans NAT, les paquets sortent avec la source 192.168.50.120 : les réponses ne peuvent pas revenir. Le masquerade remplace la source par l’adresse de douane.',
        },
        {
          id: 'c09-11-05', type: 'vrai-faux', niveau: 2, ref: '§9.21–9.24',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Par défaut, Linux ne transfère pas les paquets d’une interface à l’autre.', vrai: true },
            { texte: '`sysctl -w` est conservé après redémarrage.', vrai: false, explication: 'Il faut un fichier dans /etc/sysctl.d/.' },
            { texte: 'Le DNAT permet d’exposer un service interne sur un port du routeur.', vrai: true },
            { texte: 'Les adresses 192.168.x.x sont routées sur Internet.', vrai: false },
          ],
          indices: ['ip_forward vaut 0 par défaut.', 'Deux fausses.', 'RFC 1918.'],
          solution: 'Vrai, faux, vrai, faux.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '9.12',
      titre: 'Pare-feu : iptables, nftables et firewalld',
      sections: '§9.25', pages: '259–264',
      objectif: 'Comprendre tables, chaînes et politiques, et écrire un pare-feu simple avec nftables.',
      rappel: `
        Le noyau filtre les paquets grâce à **netfilter**. Trois moments clés pour le filtrage :

        - **input** : paquets destinés à la machine elle-même ;
        - **forward** : paquets qui la **traversent** (routeur) ;
        - **output** : paquets qu’elle émet.

        Chaque **chaîne** contient des **règles** lues dans l’ordre ; la première qui correspond décide (accept, drop…).
        Si aucune ne correspond, la **politique** de la chaîne s’applique.

        ### Le livre : iptables

        \`\`\`
        # iptables -L                                  # lister
        # iptables -P INPUT DROP                       # politique
        # iptables -A INPUT -s 192.168.34.63 -j DROP   # ajouter une règle à la fin
        # iptables -I INPUT -s 192.168.34.37 -j ACCEPT # insérer en tête
        # iptables -D INPUT 3                          # supprimer la règle n° 3
        \`\`\`

        ### Aujourd’hui : nftables

        Debian 13 et Rocky 10 utilisent **nftables** (\`iptables\`, quand il existe, n’est plus qu’une traduction).
        Le fichier \`/etc/nftables.conf\` (Debian) décrit tout le pare-feu :

        \`\`\`
        table inet filtre {
            chain input {
                type filter hook input priority filter; policy drop;
                iif "lo" accept
                ct state established,related accept      # réponses à ce qu'on a demandé
                ct state invalid drop
                tcp dport 22 accept
                icmp type echo-request accept
                iifname "ens19" udp dport { 53, 67 } accept
            }
            chain forward {
                type filter hook forward priority filter; policy drop;
                ct state established,related accept
                iifname "ens19" oifname "ens18" accept    # du réseau interne vers Internet
            }
        }
        \`\`\`

        \`\`\`
        # nft -c -f /etc/nftables.conf     # vérifier la syntaxe sans appliquer
        # systemctl enable --now nftables  # charger au démarrage
        # nft list ruleset
        \`\`\`

        **Stratégie** : politique \`drop\` et liste blanche. Toujours accepter \`established,related\` (sinon les réponses
        sont bloquées) et le port SSH **avant** de passer à \`drop\` à distance.

        ### firewalld (Rocky)

        Rocky utilise **firewalld**, une couche par-dessus nftables, organisée en **zones** :

        \`\`\`
        # firewall-cmd --list-all
        # firewall-cmd --permanent --add-service=http
        # firewall-cmd --reload
        \`\`\`
      `,
      aRetenir: [
        'Chaînes input (pour moi), forward (je route), output (j’émets) ; première règle qui correspond ; sinon politique.',
        'iptables -L / -P / -A / -I / -D (livre) ; aujourd’hui nftables : `/etc/nftables.conf`, `nft list ruleset`, `nft -c -f`.',
        'Politique drop + `ct state established,related accept` + SSH autorisé avant tout.',
        'Rocky : firewalld (`firewall-cmd --permanent --add-service=…`, `--reload`).',
      ],
      exercices: [
        {
          id: 'c09-12-01', type: 'association', niveau: 1, ref: '§9.25.1, p. 260',
          enonce: 'Associe chaque chaîne aux paquets qu’elle voit.',
          paires: [
            ['input', 'Paquets destinés à la machine elle-même'],
            ['forward', 'Paquets qui traversent la machine (routage)'],
            ['output', 'Paquets émis par la machine'],
          ],
          indices: ['input = entrée pour moi.', 'forward = transmis plus loin.', 'output = sortie de mes programmes.'],
          solution: 'input : pour moi ; forward : à travers moi ; output : de moi.',
        },
        {
          id: 'c09-12-02', type: 'qcm', niveau: 2, ref: '§9.25.3, p. 262',
          enonce: 'Le pare-feu de cuve a `policy drop` en input, avec seulement `tcp dport 22 accept`. Depuis cuve, `apt update` échoue (délai dépassé). Pourquoi ?',
          choix: [
            'Les réponses des serveurs sont bloquées : il manque `ct state established,related accept`',
            'apt utilise le port 22',
            'La politique drop bloque aussi output',
            'Il faut redémarrer nftables',
          ],
          reponse: 0,
          indices: ['Les requêtes sortent, mais les réponses entrent.', 'Elles arrivent sur des ports éphémères.', 'Le suivi de connexion.'],
          solution: 'Les réponses (DNS, HTTP) arrivent en input sur des ports éphémères : sans `ct state established,related accept`, elles sont jetées. C’est la première règle de tout pare-feu.',
        },
        {
          id: 'c09-12-03', type: 'commande', niveau: 1, ref: '§9.25',
          enonce: 'Affiche toutes les règles nftables chargées.',
          accepte: ['(sudo )?nft list ruleset'],
          exemple: 'nft list ruleset',
          indices: ['L’outil s’appelle `nft`.', 'On liste l’ensemble des règles.', '`nft list ruleset`'],
          solution: '```\n# nft list ruleset\n```',
        },
        {
          id: 'c09-12-04', type: 'commande', niveau: 2,
          enonce: 'Vérifie la syntaxe de `/etc/nftables.conf` **sans l’appliquer**.',
          accepte: ['(sudo )?nft -c -f /etc/nftables\\.conf', '(sudo )?nft -cf /etc/nftables\\.conf', '(sudo )?nft --check -f /etc/nftables\\.conf', '(sudo )?nft -f /etc/nftables\\.conf -c'],
          exemple: 'nft -c -f /etc/nftables.conf',
          indices: ['`-f` lit un fichier.', 'Une option *check*.', '`nft -c -f …`'],
          solution: '```\n# nft -c -f /etc/nftables.conf\n```\nAucune sortie = syntaxe correcte. Ensuite : `systemctl restart nftables` (ou `nft -f`).',
        },
        {
          id: 'c09-12-05', type: 'trous', niveau: 2,
          enonce: 'Complète la chaîne input : politique par défaut « jeter », réponses autorisées, SSH autorisé.',
          texte: 'chain input {\n    type filter hook input priority filter; policy [[1]];\n    ct state [[2]] accept\n    tcp dport [[3]] accept\n}',
          trous: [
            { accepte: ['drop'], exemple: 'drop' },
            { accepte: ['established,related', 'related,established', '\\{ ?established, ?related ?\\}'], exemple: 'established,related' },
            { accepte: ['22', 'ssh'], exemple: '22' },
          ],
          indices: ['Liste blanche : tout ce qui n’est pas autorisé est jeté.', 'Les connexions établies et associées.', 'Le port SSH.'],
          solution: '```\npolicy drop;\nct state established,related accept\ntcp dport 22 accept\n```',
        },
        {
          id: 'c09-12-06', type: 'commande', niveau: 2, ref: '§9.25',
          enonce: 'Sur fut (firewalld), autorise **définitivement** le service `http`.',
          accepte: ['(sudo )?firewall-cmd --permanent --add-service=http', '(sudo )?firewall-cmd --add-service=http --permanent', '(sudo )?firewall-cmd --permanent --zone=public --add-service=http', '(sudo )?firewall-cmd --zone=public --permanent --add-service=http'],
          exemple: 'firewall-cmd --permanent --add-service=http',
          pieges: [{ motif: '(sudo )?firewall-cmd --add-service=http', message: 'Sans --permanent, la règle disparaît au prochain rechargement ou redémarrage.' }],
          indices: ['Outil firewall-cmd.', 'Option pour écrire dans la configuration permanente.', 'Puis `firewall-cmd --reload`.'],
          solution: '```\n# firewall-cmd --permanent --add-service=http\n# firewall-cmd --reload\n```',
        },
        {
          id: 'c09-12-07', type: 'qcm', niveau: 3, ref: '§9.25.2, p. 261',
          enonce: 'Règles iptables, dans cet ordre :\n\n```\n-A INPUT -s 192.168.34.0/24 -j DROP\n-A INPUT -s 192.168.34.37 -j ACCEPT\n```\n\nQue devient un paquet de 192.168.34.37 ?',
          choix: ['Il est jeté : la première règle correspond déjà', 'Il est accepté : la règle la plus précise gagne', 'Les deux règles s’annulent', 'Cela dépend de la politique'],
          reponse: 0,
          indices: ['Les règles sont lues dans l’ordre.', 'La première qui correspond décide.', '192.168.34.37 fait partie de 192.168.34.0/24.'],
          solution: 'Jeté. Contrairement aux routes, un pare-feu applique la **première** règle qui correspond. Il faut insérer l’exception avant : `iptables -I INPUT -s 192.168.34.37 -j ACCEPT`.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '9.13',
      titre: 'ARP, NDP et réseaux sans fil',
      sections: '§9.26 à 9.28', pages: '264–268',
      objectif: 'Comprendre le lien entre adresses IP et MAC, et les bases du Wi-Fi.',
      rappel: `
        ### ARP (IPv4) et NDP (IPv6)

        Pour envoyer un paquet IP sur Ethernet, il faut l’**adresse MAC** du destinataire (ou de la passerelle). **ARP**
        pose la question à tout le réseau local : « qui a 192.168.50.1 ? » ; la machine concernée répond avec sa MAC.
        Le résultat est mis en cache :

        \`\`\`
        $ ip -4 neigh
        192.168.50.1 dev ens19 lladdr bc:24:11:7e:20:05 REACHABLE
        192.168.50.120 dev ens19 lladdr bc:24:11:c4:91:33 STALE
        # ip neigh del 192.168.50.120 dev ens19        # oublier une entrée
        \`\`\`

        En IPv6, **NDP** (*Neighbor Discovery*) joue ce rôle, par messages ICMPv6 : \`ip -6 neigh\`.

        Une entrée \`FAILED\` ou \`INCOMPLETE\` : la machine ne répond pas sur le lien (éteinte, mauvais réseau, câble).
        Deux machines avec la **même adresse IP** se disputent les réponses ARP : connexions qui marchent par
        intermittence.

        ### Wi-Fi

        Le Wi-Fi est de l’Ethernet sans fil, avec en plus l’**association** à un point d’accès et le **chiffrement**.
        Outils : \`iw\` (bas niveau), et en pratique NetworkManager (\`nmcli device wifi list\`,
        \`nmcli device wifi connect RÉSEAU password …\`). Sécurité : **WPA2** au minimum, **WPA3** de préférence ;
        WEP est cassé depuis longtemps.
      `,
      aRetenir: [
        'ARP : IP → MAC sur le réseau local ; cache `ip neigh` ; NDP en IPv6.',
        'FAILED/INCOMPLETE : pas de réponse sur le lien ; conflit d’IP = coupures intermittentes.',
        'Wi-Fi : association + chiffrement ; `iw`, `nmcli device wifi` ; WPA2/WPA3.',
      ],
      exercices: [
        {
          id: 'c09-13-01', type: 'commande', niveau: 1, ref: '§9.26, p. 265',
          enonce: 'Affiche le cache ARP (voisins IPv4) de la machine.',
          accepte: ['ip -4 n(eigh(bou?r)?)?( show)?', 'ip n(eigh(bou?r)?)?( show)?', 'arp( -n| -a)?'],
          exemple: 'ip -4 neigh',
          indices: ['Toujours `ip`.', 'Objet : neighbor (voisin).', '`ip -4 neigh`'],
          solution: '```\n$ ip -4 neigh\n192.168.1.1 dev ens18 lladdr 2c:91:ab:00:4e:12 REACHABLE\n```',
        },
        {
          id: 'c09-13-02', type: 'qcm', niveau: 2, ref: '§9.26',
          enonce: 'Depuis douane, `ping 192.168.50.10` échoue et `ip neigh` affiche `192.168.50.10 dev ens19 FAILED`. Qu’en déduis-tu ?',
          choix: [
            'Aucune machine ne répond aux requêtes ARP pour cette adresse sur le lien : machine éteinte, mal adressée ou pas sur ce réseau',
            'Un pare-feu bloque ICMP sur cuve',
            'Le DNS est en panne',
            'La route par défaut est absente',
          ],
          reponse: 0,
          indices: ['FAILED concerne la résolution d’adresse MAC.', 'ARP passe avant ICMP.', 'Personne ne dit « c’est moi ».'],
          solution: 'L’échec est **avant** ICMP : personne ne répond à « qui a 192.168.50.10 ? ». Vérifie que cuve est allumée, que son interface est sur le bon pont et porte la bonne adresse. (Un pare-feu qui bloque ICMP laisserait l’entrée ARP en REACHABLE.)',
        },
        {
          id: 'c09-13-03', type: 'association', niveau: 2, ref: '§9.26–9.27',
          enonce: 'Associe chaque terme à sa définition.',
          paires: [
            ['ARP', 'Trouve l’adresse MAC correspondant à une adresse IPv4'],
            ['NDP', 'Équivalent d’ARP en IPv6, par ICMPv6'],
            ['WPA3', 'Chiffrement Wi-Fi recommandé'],
            ['WEP', 'Chiffrement Wi-Fi obsolète et cassé'],
          ],
          indices: ['Address Resolution Protocol.', 'Neighbor Discovery Protocol.', 'Plus le numéro WPA est grand, mieux c’est.'],
          solution: 'ARP (IPv4 → MAC), NDP (IPv6), WPA3 (recommandé), WEP (cassé).',
        },
        {
          id: 'c09-13-04', type: 'vrai-faux', niveau: 2, ref: '§9.26',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Les requêtes ARP sont diffusées à tout le réseau local.', vrai: true },
            { texte: 'ARP permet de trouver la MAC d’un serveur situé sur Internet.', vrai: false, explication: 'ARP ne fonctionne que sur le réseau local ; pour sortir, on cherche la MAC de la passerelle.' },
            { texte: 'Deux machines avec la même IP provoquent des coupures intermittentes.', vrai: true },
            { texte: '`nmcli device wifi list` affiche les réseaux Wi-Fi visibles.', vrai: true },
          ],
          indices: ['Diffusion = broadcast.', 'Une seule fausse.', 'Pour Internet, on parle à la passerelle.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
        {
          id: 'c09-13-05', type: 'terminal', niveau: 2,
          enonce: 'Sur cuve : `ip neigh`, puis `ping -c1` vers la passerelle, puis à nouveau `ip neigh`. Colle la sortie. Quelle est l’adresse MAC de ta passerelle (ta box ou ton routeur) ?',
          attendu: ['lladdr'],
          indices: ['La passerelle est dans `ip route` (default via …).', 'Après le ping, l’entrée est REACHABLE.', 'La MAC suit le mot lladdr.'],
          solution: 'La ligne de la passerelle montre `lladdr xx:xx:…` et l’état `REACHABLE` juste après le ping. Les trois premiers octets identifient le fabricant de la carte (OUI).',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Ordre de résolution des noms ?', r: 'Ligne hosts de /etc/nsswitch.conf, en général files (/etc/hosts) puis dns.' },
    { q: 'host/dig vs getent hosts ?', r: 'host/dig : DNS seul. getent hosts : comme une application (nsswitch, /etc/hosts).' },
    { q: 'nameserver 127.0.0.53 dans resolv.conf ?', r: 'Résolveur local de systemd-resolved ; vrais serveurs : `resolvectl status`.' },
    { q: 'TCP vs UDP ?', r: 'TCP : connexion, fiable (SSH, HTTP). UDP : sans connexion (DNS, DHCP, NTP).' },
    { q: 'Ports en écoute avec le processus ?', r: '`sudo ss -tlnp` (TCP), `ss -ulnp` (UDP).' },
    { q: '0.0.0.0:22 vs 127.0.0.1:8080 ?', r: 'Toutes les adresses ; local seulement.' },
    { q: 'Les quatre étapes DHCP ?', r: 'Discover, Offer, Request, Ack (DORA) ; UDP 67/68 ; bail.' },
    { q: 'Petit serveur DHCP + DNS ?', r: 'dnsmasq : interface=, bind-interfaces, dhcp-range=, domain=.' },
    { q: 'Activer le routage IPv4 durablement ?', r: '`net.ipv4.ip_forward = 1` dans /etc/sysctl.d/x.conf, puis `sysctl --system`.' },
    { q: 'Plages privées RFC 1918 ?', r: '10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16.' },
    { q: 'Masquerade ?', r: 'NAT source : le routeur remplace l’adresse privée par la sienne en sortie.' },
    { q: 'Chaînes input, forward, output ?', r: 'Pour la machine ; qui la traversent ; qu’elle émet.' },
    { q: 'Première règle de tout pare-feu en drop ?', r: '`ct state established,related accept` (et SSH avant de couper).' },
    { q: 'Vérifier et lister nftables ?', r: '`nft -c -f /etc/nftables.conf` ; `nft list ruleset`.' },
    { q: 'Ouvrir HTTP sur Rocky ?', r: '`firewall-cmd --permanent --add-service=http` puis `--reload`.' },
    { q: 'Cache ARP ?', r: '`ip neigh` (ARP en IPv4, NDP en IPv6).' },
  ],
  memo: `
    ### Noms
    \`\`\`
    /etc/nsswitch.conf (hosts: files dns)   /etc/hosts   /etc/resolv.conf (nameserver, search)
    getent hosts NOM   host NOM   dig NOM   resolvectl status|query NOM
    \`\`\`

    ### Transport
    Ports : 22 SSH · 25 SMTP · 53 DNS · 67/68 DHCP · 80 HTTP · 123 NTP · 443 HTTPS (liste : /etc/services)
    \`\`\`
    ss -tlnp   ss -ulnp   ss -tn   ss -tln 'sport = :22'
    \`\`\`

    ### DHCP (dnsmasq)
    \`\`\`
    interface=ens19   bind-interfaces   dhcp-range=192.168.50.100,192.168.50.150,12h
    dhcp-option=option:router,192.168.50.1   domain=brasserie.lan   address=/cuve.brasserie.lan/192.168.50.10
    \`\`\`

    ### Routeur et NAT
    \`\`\`
    /etc/sysctl.d/90-routeur.conf : net.ipv4.ip_forward = 1   puis sysctl --system
    nft : table ip nat { chain postrouting { type nat hook postrouting priority srcnat; ip saddr 192.168.50.0/24 oifname "ens18" masquerade } }
    iptables -t nat -A POSTROUTING -o ens18 -j MASQUERADE
    \`\`\`

    ### Pare-feu
    \`\`\`
    nft list ruleset   nft -c -f /etc/nftables.conf   systemctl enable --now nftables
    policy drop; iif "lo" accept; ct state established,related accept; tcp dport 22 accept
    iptables -L | -P INPUT DROP | -A INPUT … -j ACCEPT | -I … | -D INPUT 3
    firewall-cmd --list-all | --permanent --add-service=http | --reload
    \`\`\`

    ### Voisins
    \`\`\`
    ip neigh   ip -6 neigh   ip neigh del ADR dev IF   nmcli device wifi list
    \`\`\`
  `,
});
