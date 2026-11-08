/* Chapitre 9 : Understanding Your Network and Its Configuration (livre p. 223–268), fiches 9.1 à 9.7. */
HLW.chapitre({
  id: '09',
  num: 9,
  intro: `
    Le réseau est le chapitre le plus dense du livre, et l’un des plus utiles en production. On part des **couches**
    (pourquoi un paquet sait où aller), puis on descend dans le concret : **adresses IPv4 et IPv6**, **sous-réseaux**,
    **routes**, configuration des interfaces (à la main, puis par Netplan, systemd-networkd et NetworkManager),
    **résolution de noms**, **TCP et UDP**, **DHCP**, et enfin la machine Linux qui devient **routeur**, avec **NAT** et
    **pare-feu**.

    Le livre utilise encore \`netstat\` et \`iptables\`. Les fiches montrent ces commandes, parce qu’on les croise partout,
    mais aussi leurs successeurs : \`ss\` et **nftables**. Le **Lab 07** met tout en œuvre : la VM \`douane\` deviendra le
    routeur et le pare-feu de la brasserie.
  `,
  objectifs: [
    'expliquer le rôle de chaque couche (application, transport, réseau, physique) ;',
    'lire une adresse IPv4 en notation CIDR, calculer un réseau, un masque, le nombre d’hôtes ;',
    'lire et modifier la table de routage, trouver la passerelle par défaut ;',
    'reconnaître les adresses IPv6 et leurs types ;',
    'configurer une interface à la main avec `ip`, puis de façon persistante (Netplan, NetworkManager) ;',
    'diagnostiquer la résolution de noms (hosts, resolv.conf, systemd-resolved, nsswitch) ;',
    'lister les ports ouverts et les connexions avec `ss` ;',
    'transformer Linux en routeur avec NAT et un pare-feu nftables.',
  ],
  certifs: { lpic1: ['109.1', '109.2', '109.3', '109.4', '110.2'], lfcs: ['NET'], rhcsa: ['R8', 'R10'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '9.1',
      titre: 'Paquets et couches réseau',
      sections: '§9.1 à 9.3', pages: '223–226',
      objectif: 'Comprendre le modèle en couches qui structure tout le chapitre.',
      rappel: `
        Les données circulent en **paquets** : de petits morceaux, chacun avec un **en-tête** (d’où il vient, où il va,
        ce qu’il contient) et une **charge utile** (les données). Découper permet de partager le réseau entre beaucoup de
        machines et de renvoyer seulement ce qui se perd.

        Le traitement est organisé en **couches**. Chaque couche s’appuie sur celle du dessous et rend un service à
        celle du dessus :

        | Couche | Rôle | Exemples |
        |---|---|---|
        | **Application** | ce que veulent les programmes | HTTP, SSH, DNS, SMTP |
        | **Transport** | relier deux *programmes* (ports), fiabilité éventuelle | TCP, UDP |
        | **Réseau** (Internet) | acheminer d’une *machine* à une autre, à travers des routeurs | IPv4, IPv6, ICMP |
        | **Physique** (lien) | envoyer les bits sur un support local | Ethernet, Wi-Fi |

        En émission, chaque couche **encapsule** : la couche transport ajoute son en-tête aux données, la couche réseau
        ajoute le sien, puis la couche physique. En réception, chaque couche retire son en-tête et passe le reste au-dessus.

        Le noyau Linux gère les couches transport, réseau et physique (avec les pilotes). Les applications (navigateur,
        sshd, serveur web) vivent en espace utilisateur et parlent au noyau par des **sockets** (chapitre 10).

        On rencontre aussi le modèle **OSI** à 7 couches (physique, liaison, réseau, transport, session, présentation,
        application) : les « couches 2, 3, 4 » dont parlent les administrateurs viennent de lui. Couche 2 = Ethernet,
        couche 3 = IP, couche 4 = TCP/UDP.
      `,
      aRetenir: [
        'Paquet = en-tête + charge utile.',
        'Application (HTTP, SSH…) → transport (TCP, UDP) → réseau (IP) → physique (Ethernet).',
        'Encapsulation à l’émission, désencapsulation à la réception.',
        'OSI : couche 2 = liaison (Ethernet), 3 = réseau (IP), 4 = transport (TCP/UDP).',
      ],
      exercices: [
        {
          id: 'c09-01-01', type: 'association', niveau: 1, ref: '§9.2, p. 225',
          enonce: 'Associe chaque protocole à sa couche.',
          paires: [
            ['HTTP', 'Application'],
            ['TCP', 'Transport'],
            ['IPv6', 'Réseau'],
            ['Ethernet', 'Physique'],
          ],
          indices: ['Ce que l’utilisateur demande est en haut.', 'TCP et UDP relient des programmes par des ports.', 'IP relie des machines ; Ethernet relie des cartes sur un même câble.'],
          solution: 'HTTP : application (comme SSH, DNS). TCP : transport (comme UDP). IPv6 : réseau. Ethernet : physique (lien).',
        },
        {
          id: 'c09-01-02', type: 'ordre', niveau: 2, ref: '§9.2',
          enonce: 'Le navigateur de Malik envoie une requête HTTP. Remets dans l’ordre ce qui se passe sur sa machine.',
          elements: [
            'Le navigateur écrit la requête HTTP dans une socket',
            'La couche transport ajoute un en-tête TCP (ports source et destination)',
            'La couche réseau ajoute un en-tête IP (adresses source et destination)',
            'La couche physique encapsule dans une trame Ethernet et envoie les bits',
          ],
          indices: ['On part de l’application.', 'Chaque couche ajoute son en-tête devant.', 'La couche la plus basse émet.'],
          solution: 'Application → TCP → IP → Ethernet. En réception, c’est l’inverse : chaque couche retire son en-tête.',
        },
        {
          id: 'c09-01-03', type: 'qcm', niveau: 1, ref: '§9.1, p. 224',
          enonce: 'Pourquoi découper les données en paquets plutôt que de les envoyer d’un bloc ?',
          choix: [
            'Pour partager le réseau entre plusieurs communications et ne renvoyer que les morceaux perdus',
            'Pour chiffrer les données',
            'Parce que les câbles ne transportent qu’un octet à la fois',
            'Pour compresser les données',
          ],
          reponse: 0,
          indices: ['Pense à un réseau partagé par beaucoup de machines.', 'Que se passe-t-il si un énorme bloc est corrompu ?', 'Partage et reprise sur erreur.'],
          solution: 'Les paquets permettent à de nombreuses communications de s’entrelacer sur le même réseau, et en cas de perte, seul le paquet concerné est renvoyé.',
        },
        {
          id: 'c09-01-04', type: 'vrai-faux', niveau: 2, ref: '§9.2–9.3',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'La couche réseau (IP) relie des machines, la couche transport relie des programmes.', vrai: true },
            { texte: 'Un routeur a besoin de lire le contenu HTTP pour acheminer un paquet.', vrai: false, explication: 'Il lui suffit de l’en-tête IP (couche réseau).' },
            { texte: 'Dans le vocabulaire OSI, Ethernet est un protocole de couche 2.', vrai: true },
            { texte: 'Les sockets sont l’interface entre les applications et la pile réseau du noyau.', vrai: true },
          ],
          indices: ['Un routeur travaille à la couche 3.', 'Une seule affirmation est fausse.', 'Les applications ne fabriquent pas les en-têtes IP elles-mêmes.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
        {
          id: 'c09-01-05', type: 'reponse-courte', niveau: 2,
          enonce: 'Un collègue dit : « c’est un problème de couche 3 ». De quel protocole parle-t-il très probablement ?',
          accepte: ['ip', 'ipv4', 'ipv6', 'ipv4 ou ipv6', 'le protocole ip', 'protocole ip'],
          indices: ['C’est la numérotation OSI.', '1 physique, 2 liaison, 3…', 'Adresses et routage.'],
          solution: '**IP** (IPv4 ou IPv6) : la couche réseau, celle des adresses et des routes.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '9.2',
      titre: 'Adresses IPv4, sous-réseaux et CIDR',
      sections: '§9.4', pages: '226–230',
      objectif: 'Lire une adresse en notation CIDR et calculer son réseau.',
      rappel: `
        Une adresse **IPv4** fait 32 bits, écrits en quatre octets décimaux : \`192.168.50.10\`. Elle est toujours
        accompagnée d’un **masque** qui dit quelle partie désigne le **réseau** et quelle partie désigne l’**hôte**.

        \`\`\`
        $ ip address show
        2: ens18: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP …
            link/ether bc:24:11:5a:3e:01 brd ff:ff:ff:ff:ff:ff
            inet 192.168.1.211/24 brd 192.168.1.255 scope global dynamic ens18
        \`\`\`

        **CIDR** : \`/24\` signifie « les 24 premiers bits désignent le réseau ». Le masque correspondant est
        \`255.255.255.0\`. Toutes les machines dont les 24 premiers bits sont identiques sont sur le **même sous-réseau** :
        elles se parlent directement, sans routeur.

        | CIDR | Masque | Adresses | Hôtes utilisables |
        |---|---|---|---|
        | /8 | 255.0.0.0 | 16 777 216 | 16 777 214 |
        | /16 | 255.255.0.0 | 65 536 | 65 534 |
        | /24 | 255.255.255.0 | 256 | 254 |
        | /25 | 255.255.255.128 | 128 | 126 |
        | /26 | 255.255.255.192 | 64 | 62 |
        | /30 | 255.255.255.252 | 4 | 2 |
        | /32 | 255.255.255.255 | 1 | (une seule machine) |

        Dans un sous-réseau, deux adresses sont réservées : la première (adresse du **réseau**, \`192.168.50.0\`) et la
        dernière (**diffusion**, *broadcast*, \`192.168.50.255\`). D’où 2ⁿ − 2 hôtes, avec n le nombre de bits d’hôte.

        Pour calculer le réseau, on garde les bits du masque : \`192.168.50.77/26\` → masque \`255.255.255.192\`,
        dernier octet 77 = 01001101 ; on garde les deux premiers bits (01) → 64 : réseau \`192.168.50.64/26\`, de .64 à
        .127, diffusion \`.127\`. L’outil \`ipcalc\` (paquet du même nom) fait ce calcul.
      `,
      aRetenir: [
        'IPv4 = 32 bits ; /n = n bits de réseau.',
        '/24 = 255.255.255.0 = 254 hôtes ; /16 = 65 534 ; /30 = 2.',
        'Première adresse = réseau, dernière = diffusion ; hôtes = 2ⁿ − 2.',
        'Même sous-réseau = échange direct ; sinon, passage par un routeur.',
      ],
      exercices: [
        {
          id: 'c09-02-01', type: 'association', niveau: 1, ref: '§9.4.3, p. 229',
          enonce: 'Associe chaque préfixe CIDR à son masque.',
          paires: [['/8', '255.0.0.0'], ['/16', '255.255.0.0'], ['/24', '255.255.255.0'], ['/26', '255.255.255.192'], ['/30', '255.255.255.252']],
          indices: ['Chaque groupe de 8 bits à 1 donne 255.', '/26 = 24 + 2 bits : 128 + 64.', '/30 = 24 + 6 bits : 128+64+32+16+8+4.'],
          solution: '/8 255.0.0.0 ; /16 255.255.0.0 ; /24 255.255.255.0 ; /26 255.255.255.192 ; /30 255.255.255.252.',
        },
        {
          id: 'c09-02-02', type: 'reponse-courte', niveau: 1, ref: '§9.4.3',
          enonce: 'Combien de machines peut-on adresser dans un réseau en **/24** ?',
          accepte: ['254'],
          indices: ['Il reste 8 bits pour les hôtes.', '2⁸ = 256 adresses.', 'Moins le réseau et la diffusion.'],
          solution: '**254** : 256 adresses moins l’adresse du réseau (.0) et celle de diffusion (.255).',
        },
        {
          id: 'c09-02-03', type: 'reponse-courte', niveau: 2, ref: '§9.4.2, p. 228',
          enonce: 'Quelle est l’adresse **du réseau** qui contient `192.168.50.77/26` ? (sans le /26)',
          accepte: ['192\\.168\\.50\\.64'],
          indices: ['/26 : masque 255.255.255.192, blocs de 64 adresses.', 'Les blocs commencent à 0, 64, 128, 192.', '77 est dans le bloc qui commence à 64.'],
          solution: '**192.168.50.64**. Le réseau /26 va de .64 (réseau) à .127 (diffusion) ; hôtes de .65 à .126.',
        },
        {
          id: 'c09-02-04', type: 'reponse-courte', niveau: 2,
          enonce: 'Quelle est l’adresse de **diffusion** du réseau `10.42.8.0/22` ?',
          accepte: ['10\\.42\\.11\\.255'],
          indices: ['/22 = 255.255.252.0 : le troisième octet avance par blocs de 4.', 'Le réseau couvre 10.42.8.0 à 10.42.11.255.', 'La diffusion est la dernière adresse.'],
          solution: '**10.42.11.255**. Un /22 regroupe 4 réseaux /24 : 10.42.8.x à 10.42.11.x.',
        },
        {
          id: 'c09-02-05', type: 'qcm', niveau: 2, ref: '§9.4.2',
          enonce: 'cuve a l’adresse `192.168.50.10/24`. Laquelle de ces machines peut-elle joindre **sans passer par un routeur** ?',
          choix: ['192.168.50.200', '192.168.51.10', '192.168.5.10', '10.168.50.10'],
          reponse: 0,
          indices: ['/24 : les trois premiers octets doivent être identiques.', '192.168.50.x', 'Une seule réponse a les trois mêmes premiers octets.'],
          solution: '**192.168.50.200** est dans le même /24 (192.168.50.0 à .255). Les autres sont sur d’autres réseaux : il faut une route.',
        },
        {
          id: 'c09-02-06', type: 'commande', niveau: 1, ref: '§9.4.1, p. 228',
          enonce: 'Affiche les adresses IP de toutes les interfaces de la machine.',
          accepte: ['ip a(ddr(ess)?)?( show| list| sh)?', 'ip -4 a(ddr(ess)?)?( show)?', 'ip -br a(ddr(ess)?)?( show)?', 'ip -c a(ddr(ess)?)?( show)?', 'ip --brief a(ddr(ess)?)?'],
          exemple: 'ip address show',
          pieges: [{ motif: 'ifconfig( -a)?', message: '`ifconfig` (paquet net-tools) est obsolète et souvent absent. La commande actuelle est `ip`.' }],
          indices: ['L’outil moderne s’appelle `ip`.', 'Objet : address.', '`ip address show` (abrégé `ip a`).'],
          solution: '```\n$ ip address show\n```\nForme courte : `ip a`. Vue résumée : `ip -br a`.',
        },
        {
          id: 'c09-02-07', type: 'trous', niveau: 2,
          enonce: 'Complète le plan d’adressage du réseau de la boutique `192.168.50.0/24`.',
          texte: 'Masque : [[1]]\nAdresse de diffusion : [[2]]\nPremière adresse utilisable : [[3]]',
          trous: [
            { accepte: ['255\\.255\\.255\\.0'], exemple: '255.255.255.0' },
            { accepte: ['192\\.168\\.50\\.255'], exemple: '192.168.50.255' },
            { accepte: ['192\\.168\\.50\\.1'], exemple: '192.168.50.1' },
          ],
          indices: ['/24 : trois octets de réseau.', 'La diffusion est la dernière adresse.', 'La première utilisable suit l’adresse du réseau.'],
          solution: 'Masque 255.255.255.0, diffusion 192.168.50.255, hôtes de .1 à .254 (au Lab 07, douane prendra .1).',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '9.3',
      titre: 'Routes et passerelle par défaut',
      sections: '§9.5 et 9.6', pages: '230–231',
      objectif: 'Lire la table de routage et comprendre comment le noyau choisit une route.',
      rappel: `
        Pour chaque paquet sortant, le noyau consulte sa **table de routage** :

        \`\`\`
        $ ip route show
        default via 192.168.1.1 dev ens18 proto dhcp src 192.168.1.211 metric 100
        192.168.1.0/24 dev ens18 proto kernel scope link src 192.168.1.211
        192.168.50.0/24 dev ens19 proto kernel scope link src 192.168.50.1
        \`\`\`

        - \`192.168.1.0/24 dev ens18\` : ce réseau est **directement joignable** par l’interface ens18 (pas de routeur).
          Ces routes sont créées automatiquement quand on donne une adresse à une interface (\`proto kernel\`).
        - \`default via 192.168.1.1\` : pour **tout le reste**, envoyer au routeur 192.168.1.1, la **passerelle par
          défaut**. \`default\` équivaut à \`0.0.0.0/0\`.

        Règle de choix : la route **la plus précise** gagne (le préfixe le plus long). Un paquet pour 192.168.50.20
        correspond à \`192.168.50.0/24\` et à \`default\` (/0) : le /24 l’emporte. À précision égale, la plus petite
        **métrique** gagne.

        La passerelle doit être **sur un réseau directement joignable** : on ne peut pas passer par un routeur qu’on ne
        sait pas atteindre.

        \`\`\`
        $ ip route get 1.1.1.1          # quelle route le noyau utiliserait ?
        1.1.1.1 via 192.168.1.1 dev ens18 src 192.168.1.211 uid 1000
        \`\`\`
      `,
      aRetenir: [
        '`ip route show` ; `default` = 0.0.0.0/0 = passerelle par défaut.',
        'Routes `proto kernel` : réseaux directement connectés.',
        'Le préfixe le plus long gagne ; puis la plus petite métrique.',
        '`ip route get ADRESSE` montre la route choisie.',
      ],
      exercices: [
        {
          id: 'c09-03-01', type: 'commande', niveau: 1, ref: '§9.5, p. 230',
          enonce: 'Affiche la table de routage IPv4.',
          accepte: ['ip r(oute)?( show| list| sh)?', 'ip -4 r(oute)?( show)?'],
          exemple: 'ip route show',
          pieges: [{ motif: 'route( -n)?|netstat -rn?', message: '`route` et `netstat -r` (net-tools) sont obsolètes. Utilise `ip route`.' }],
          indices: ['Toujours `ip`.', 'Objet : route.', '`ip route show` (ou `ip r`).'],
          solution: '```\n$ ip route show\n```',
        },
        {
          id: 'c09-03-02', type: 'qcm', niveau: 2, ref: '§9.5, p. 230–231',
          enonce: 'Avec la table ci-dessous, par où part un paquet destiné à `192.168.50.20` ?\n\n```\ndefault via 192.168.1.1 dev ens18\n192.168.1.0/24 dev ens18 proto kernel\n192.168.50.0/24 dev ens19 proto kernel\n```',
          choix: [
            'Directement par ens19 (réseau directement connecté)',
            'Vers la passerelle 192.168.1.1',
            'Directement par ens18',
            'Il est rejeté : aucune route',
          ],
          reponse: 0,
          indices: ['Deux routes correspondent : laquelle est la plus précise ?', '/24 contre /0.', 'Le réseau 192.168.50.0/24 est sur ens19.'],
          solution: '`192.168.50.0/24` (préfixe /24) est plus précis que `default` (/0) : le paquet part directement par **ens19**.',
        },
        {
          id: 'c09-03-03', type: 'commande', niveau: 2, ref: '§9.5',
          enonce: 'Demande au noyau quelle route il utiliserait pour joindre `1.1.1.1`.',
          accepte: ['ip r(oute)? get 1\\.1\\.1\\.1'],
          exemple: 'ip route get 1.1.1.1',
          indices: ['`ip route` a une sous-commande qui interroge sans rien modifier.', 'get', '`ip route get 1.1.1.1`'],
          solution: '```\n$ ip route get 1.1.1.1\n1.1.1.1 via 192.168.1.1 dev ens18 src 192.168.1.211\n```',
        },
        {
          id: 'c09-03-04', type: 'reponse-courte', niveau: 1, ref: '§9.6, p. 231',
          enonce: 'Dans `default via 192.168.1.1 dev ens18`, quelle est l’adresse de la passerelle par défaut ?',
          accepte: ['192\\.168\\.1\\.1'],
          indices: ['C’est le mot après « via ».', 'Le routeur à qui on confie tout le reste.', '192.168.1.1'],
          solution: '**192.168.1.1** : tout ce qui n’a pas de route plus précise lui est envoyé.',
        },
        {
          id: 'c09-03-05', type: 'vrai-faux', niveau: 2, ref: '§9.5–9.6',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`default` équivaut à la destination 0.0.0.0/0.', vrai: true },
            { texte: 'La passerelle par défaut peut être sur un réseau qu’on n’atteint pas directement.', vrai: false, explication: 'Il faut pouvoir lui envoyer le paquet directement.' },
            { texte: 'Ajouter une adresse à une interface crée automatiquement la route vers son sous-réseau.', vrai: true },
            { texte: 'Entre deux routes de même préfixe, la plus petite métrique est préférée.', vrai: true },
          ],
          indices: ['0.0.0.0/0 englobe toutes les adresses.', 'Une seule fausse.', 'Le premier saut doit être joignable.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '9.4',
      titre: 'IPv6',
      sections: '§9.7', pages: '231–234',
      objectif: 'Reconnaître les adresses IPv6 et leurs types, et afficher la configuration IPv6.',
      rappel: `
        IPv4 offre environ 4 milliards d’adresses : pas assez. **IPv6** utilise des adresses de **128 bits**, écrites en
        huit groupes de quatre chiffres hexadécimaux : \`2001:0db8:0000:0000:0000:0000:0000:0042\`.

        Abréviations : on supprime les **zéros en tête** de chaque groupe, et on remplace **une seule** suite de groupes
        nuls par \`::\` → \`2001:db8::42\`.

        Un réseau IPv6 standard est un **/64** : 64 bits de préfixe réseau, 64 bits d’identifiant d’interface.

        | Type | Préfixe | Rôle |
        |---|---|---|
        | Globale (unicast) | \`2000::/3\` (commence par 2 ou 3) | routable sur Internet |
        | Lien local | \`fe80::/10\` | valable sur le lien seulement, **toujours présente**, non routée |
        | Locale unique (ULA) | \`fc00::/7\` (en pratique \`fd…\`) | équivalent des adresses privées IPv4 |
        | Bouclage | \`::1\` | la machine elle-même |
        | Documentation | \`2001:db8::/32\` | exemples |

        \`\`\`
        $ ip -6 address show
        2: ens18: …
            inet6 2a01:e0a:1f:3c50:be24:11ff:fe5a:3e01/64 scope global dynamic mngtmpaddr
            inet6 fe80::be24:11ff:fe5a:3e01/64 scope link
        $ ip -6 route show
        $ ping -6 ipv6.google.com
        \`\`\`

        Une machine a donc souvent **plusieurs** adresses IPv6 par interface. Un réseau qui fait tourner IPv4 et IPv6 en
        même temps est dit **double pile** (*dual stack*) : c’est la situation la plus courante aujourd’hui.
      `,
      aRetenir: [
        'IPv6 = 128 bits, hexadécimal, groupes séparés par `:` ; `::` une seule fois.',
        'Réseau standard : /64.',
        'fe80::/10 lien local (toujours là), 2000::/3 globale, fd00::/8 locale unique, ::1 bouclage.',
        '`ip -6 address`, `ip -6 route`, `ping -6`.',
      ],
      exercices: [
        {
          id: 'c09-04-01', type: 'reponse-courte', niveau: 2, ref: '§9.7, p. 232',
          enonce: 'Écris la forme **abrégée** de `2001:0db8:0000:0000:0000:0000:0000:0042`.',
          accepte: ['2001:db8::42'],
          indices: ['Supprime les zéros en tête de chaque groupe.', '0db8 devient db8, 0042 devient 42.', 'Une suite de groupes nuls devient `::`.'],
          solution: '**2001:db8::42**',
        },
        {
          id: 'c09-04-02', type: 'association', niveau: 1, ref: '§9.7',
          enonce: 'Associe chaque adresse IPv6 à son type.',
          paires: [
            ['`fe80::be24:11ff:fe5a:3e01`', 'Lien local'],
            ['`2a01:e0a:1f:3c50::11`', 'Globale'],
            ['`fd42:b8::10`', 'Locale unique (ULA)'],
            ['`::1`', 'Bouclage'],
          ],
          indices: ['fe80 = lien local.', 'Les adresses globales commencent par 2 ou 3.', 'fd = locale unique, ::1 = localhost.'],
          solution: 'fe80:: lien local ; 2a01:… globale ; fd42:… ULA ; ::1 bouclage.',
        },
        {
          id: 'c09-04-03', type: 'commande', niveau: 1, ref: '§9.7.1, p. 232',
          enonce: 'Affiche uniquement les adresses **IPv6** des interfaces.',
          accepte: ['ip -6 a(ddr(ess)?)?( show)?', 'ip -6 -br a(ddr(ess)?)?'],
          exemple: 'ip -6 address show',
          indices: ['`ip` a une option par famille d’adresses.', '`-4` pour IPv4, donc…', '`ip -6 address show`'],
          solution: '```\n$ ip -6 address show\n```',
        },
        {
          id: 'c09-04-04', type: 'vrai-faux', niveau: 2, ref: '§9.7',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Une interface IPv6 active a toujours une adresse de lien local fe80::.', vrai: true },
            { texte: '`2001:db8::1::5` est une adresse valide.', vrai: false, explication: '`::` ne peut apparaître qu’une fois, sinon l’adresse serait ambiguë.' },
            { texte: 'Un sous-réseau IPv6 classique est un /64.', vrai: true },
            { texte: 'Les adresses de lien local sont routées sur Internet.', vrai: false, explication: 'Elles ne sont valables que sur le lien local.' },
          ],
          indices: ['Le lien local est automatique.', 'Deux sont fausses.', 'Combien de `::` au maximum ?'],
          solution: 'Vrai, faux, vrai, faux.',
        },
        {
          id: 'c09-04-05', type: 'reponse-courte', niveau: 2, ref: '§9.7',
          enonce: 'Combien de bits compte une adresse IPv6 ?',
          accepte: ['128'],
          indices: ['IPv4 : 32 bits.', 'Huit groupes de 16 bits.', '8 × 16.'],
          solution: '**128 bits** (8 groupes de 16 bits).',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '9.5',
      titre: 'ping, DNS, Ethernet et interfaces du noyau',
      sections: '§9.8 à 9.10', pages: '234–237',
      objectif: 'Faire les premiers tests de connectivité et lire l’état d’une interface.',
      rappel: `
        ### ping

        \`ping\` envoie des messages **ICMP** *echo request* et attend les *echo reply* :

        \`\`\`
        $ ping -c 3 192.168.1.1
        64 bytes from 192.168.1.1: icmp_seq=1 ttl=64 time=0.412 ms
        …
        3 packets transmitted, 3 received, 0% packet loss, time 2003ms
        \`\`\`

        \`icmp_seq\` qui saute = paquets perdus ; \`time\` = aller-retour. Attention : un pare-feu peut bloquer ICMP, donc
        « pas de réponse » ne prouve pas que la machine est éteinte. \`traceroute\` (ou \`tracepath\`, \`mtr\`) montre les
        routeurs traversés.

        ### DNS en une commande

        \`\`\`
        $ host www.debian.org           # nom → adresses
        $ host 151.101.2.132            # adresse → nom (résolution inverse)
        \`\`\`

        \`dig\` donne plus de détails. Paquets : \`bind9-host\`/\`bind9-dnsutils\` (Debian), \`bind-utils\` (Rocky).

        ### Ethernet

        Sur un réseau local, les cartes s’identifient par leur **adresse MAC** (48 bits : \`bc:24:11:5a:3e:01\`). Les
        trames Ethernet ne sortent pas du réseau local : c’est IP, au-dessus, qui traverse les routeurs.

        ### Les interfaces du noyau

        \`\`\`
        2: ens18: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 … state UP
            link/ether bc:24:11:5a:3e:01 brd ff:ff:ff:ff:ff:ff
        \`\`\`

        - \`UP\` : interface activée par l’administrateur ; \`LOWER_UP\` : lien physique présent (câble branché).
        - \`mtu 1500\` : taille maximale d’un paquet sur ce lien.
        - Noms : \`lo\` (bouclage), \`ens18\`, \`enp0s31f6\` (noms **prévisibles**, d’après l’emplacement matériel),
          \`eth0\` (ancien style ; c’est aussi le nom que cloud-init donne aux cartes de tes VM Proxmox), \`wlp1s0\`
          (Wi-Fi). \`ip link show\` les liste.
      `,
      aRetenir: [
        '`ping -c N` ; pas de réponse ≠ machine éteinte (ICMP filtré).',
        '`host nom`, `host adresse` (inverse), `dig` ; `traceroute`/`tracepath`.',
        'MAC = adresse Ethernet locale (48 bits).',
        '`ip link` : UP (activée), LOWER_UP (lien), mtu ; noms ens18, enp…, eth0, lo.',
      ],
      exercices: [
        {
          id: 'c09-05-01', type: 'commande', niveau: 1, ref: '§9.8.1, p. 234',
          enonce: 'Envoie exactement **3** requêtes ICMP à `192.168.1.1`.',
          accepte: ['ping -c ?3 192\\.168\\.1\\.1', 'ping 192\\.168\\.1\\.1 -c ?3', 'ping -c ?3 -4 192\\.168\\.1\\.1'],
          exemple: 'ping -c 3 192.168.1.1',
          indices: ['Sous Linux, ping ne s’arrête pas tout seul.', 'Une option donne le nombre (*count*).', '`-c 3`'],
          solution: '```\n$ ping -c 3 192.168.1.1\n```',
        },
        {
          id: 'c09-05-02', type: 'qcm', niveau: 2, ref: '§9.8.1',
          enonce: '`ping fut` ne reçoit aucune réponse, mais `ssh fut` fonctionne. Explication la plus probable ?',
          choix: [
            'Un pare-feu bloque l’ICMP, pas SSH',
            'fut est éteinte',
            'Le câble réseau est débranché',
            'Le DNS ne fonctionne pas',
          ],
          reponse: 0,
          indices: ['SSH marche : la machine est allumée et joignable.', 'ping utilise un autre protocole que SSH.', 'ICMP peut être filtré.'],
          solution: 'La machine est joignable (SSH répond) : c’est ICMP qui est filtré par un pare-feu. « Pas de ping » ne prouve rien à lui seul.',
        },
        {
          id: 'c09-05-03', type: 'commande', niveau: 1, ref: '§9.8.2, p. 235',
          enonce: 'Trouve les adresses IP de `www.debian.org` avec la commande DNS la plus simple.',
          accepte: ['host www\\.debian\\.org\\.?', 'dig (\\+short )?www\\.debian\\.org\\.?( \\+short)?', 'nslookup www\\.debian\\.org\\.?', 'getent (ahosts|hosts) www\\.debian\\.org\\.?', 'resolvectl query www\\.debian\\.org\\.?'],
          exemple: 'host www.debian.org',
          indices: ['Le livre utilise une commande de quatre lettres.', 'Elle prend le nom en argument.', '`host www.debian.org`'],
          solution: '```\n$ host www.debian.org\nwww.debian.org is an alias for www.debian.org.cdn.cloudflare.net.\n…has address 151.101.2.132\n```',
        },
        {
          id: 'c09-05-04', type: 'association', niveau: 2, ref: '§9.10, p. 236',
          enonce: 'Dans la sortie de `ip link`, associe chaque élément à son sens.',
          paires: [
            ['`UP`', 'L’interface est activée'],
            ['`LOWER_UP`', 'Le lien physique est présent'],
            ['`mtu 1500`', 'Taille maximale d’un paquet sur ce lien'],
            ['`link/ether bc:24:11:…`', 'Adresse MAC'],
            ['`lo`', 'Interface de bouclage'],
          ],
          indices: ['LOWER = la couche du dessous (physique).', 'MTU = Maximum Transmission Unit.', 'ether = Ethernet.'],
          solution: 'UP activée ; LOWER_UP lien physique ; mtu taille max ; link/ether adresse MAC ; lo bouclage.',
        },
        {
          id: 'c09-05-05', type: 'vrai-faux', niveau: 2, ref: '§9.9',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Une adresse MAC permet de joindre une machine sur un autre réseau, à travers un routeur.', vrai: false, explication: 'Les trames Ethernet restent sur le réseau local ; c’est IP qui traverse les routeurs.' },
            { texte: 'Le nom `ens18` est un nom d’interface « prévisible », dérivé de l’emplacement matériel.', vrai: true },
            { texte: '`ip link show` liste les interfaces, même sans adresse IP.', vrai: true },
            { texte: '`host 151.101.2.132` fait une résolution inverse (adresse vers nom).', vrai: true },
          ],
          indices: ['Couche 2 contre couche 3.', 'Une seule fausse.', 'Le nom vient de la position sur le bus.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
        {
          id: 'c09-05-06', type: 'terminal', niveau: 1,
          enonce: 'Sur cuve et sur fut, lance `ip -br link` puis `ip -br address`. Colle une sortie. Comment s’appelle l’interface principale sur chaque machine ?',
          attendu: ['UP'],
          indices: ['`-br` (*brief*) donne une ligne par interface.', 'Regarde la configuration réseau générée au premier démarrage.', 'cloud-init applique les noms fournis par Proxmox.'],
          solution: 'Sur les deux VM, l’interface s’appelle **eth0** : Proxmox décrit la carte sous ce nom dans la configuration cloud-init, et cloud-init la renomme au démarrage (`set-name` dans Netplan sur cuve). Sans cloud-init, Debian utiliserait un nom prévisible comme **ens18**. Les deux ont aussi `lo` (127.0.0.1).',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '9.6',
      titre: 'Configurer une interface et des routes à la main',
      sections: '§9.11', pages: '237–239',
      objectif: 'Ajouter une adresse et une route avec `ip`, en sachant que c’est temporaire.',
      rappel: `
        \`\`\`
        # ip link set ens19 up                              # activer l’interface
        # ip address add 192.168.50.1/24 dev ens19          # ajouter une adresse (et la route du sous-réseau)
        # ip address del 192.168.50.1/24 dev ens19          # la retirer
        # ip route add default via 192.168.1.1 dev ens18    # passerelle par défaut
        # ip route del default
        # ip route add 10.8.0.0/24 via 192.168.50.20        # route vers un autre réseau, via un routeur
        # ip route del 10.8.0.0/24
        \`\`\`

        Une interface peut porter **plusieurs** adresses. N’oublie pas le **/préfixe** : sans lui, \`ip\` suppose /32, et
        la route du sous-réseau n’est pas créée.

        **Tout cela est temporaire** : perdu au redémarrage, ou écrasé par le gestionnaire de réseau (fiche 9.7). On s’en
        sert pour tester, dépanner, ou dans des scripts. Pour une configuration durable, on passe par les fichiers du
        gestionnaire.

        Attention à distance : modifier l’interface ou la route par laquelle passe ta session SSH peut te couper. Sur une VM,
        garde la console Proxmox sous la main.
      `,
      aRetenir: [
        '`ip link set IF up|down` ; `ip address add|del ADR/PRÉFIXE dev IF`.',
        '`ip route add default via GW` ; `ip route add RÉSEAU via ROUTEUR` ; `del` pour retirer.',
        'Sans /préfixe : /32, pas de route de sous-réseau.',
        'Temporaire : perdu au redémarrage ou écrasé par le gestionnaire.',
      ],
      exercices: [
        {
          id: 'c09-06-01', type: 'commande', niveau: 1, ref: '§9.11.1, p. 238',
          enonce: 'Ajoute l’adresse `192.168.50.1` avec un masque /24 à l’interface `ens19`.',
          accepte: ['(sudo )?ip a(ddr(ess)?)? add 192\\.168\\.50\\.1/24 dev ens19', '(sudo )?ip a(ddr(ess)?)? add dev ens19 192\\.168\\.50\\.1/24'],
          exemple: 'ip address add 192.168.50.1/24 dev ens19',
          pieges: [{ motif: '(sudo )?ip a(ddr(ess)?)? add 192\\.168\\.50\\.1 dev ens19', message: 'Sans /24, ip utilise /32 : la route vers 192.168.50.0/24 ne sera pas créée.' }],
          indices: ['Objet address, action add.', 'Adresse avec son préfixe, puis `dev`.', '`ip address add 192.168.50.1/24 dev ens19`'],
          solution: '```\n# ip address add 192.168.50.1/24 dev ens19\n# ip link set ens19 up\n```',
        },
        {
          id: 'c09-06-02', type: 'commande', niveau: 1, ref: '§9.11.2, p. 238',
          enonce: 'Définis `192.168.50.1` comme passerelle par défaut.',
          accepte: ['(sudo )?ip r(oute)? add default via 192\\.168\\.50\\.1( dev [a-z0-9]+)?', '(sudo )?ip r(oute)? add 0\\.0\\.0\\.0/0 via 192\\.168\\.50\\.1( dev [a-z0-9]+)?', '(sudo )?ip r(oute)? replace default via 192\\.168\\.50\\.1( dev [a-z0-9]+)?'],
          exemple: 'ip route add default via 192.168.50.1',
          indices: ['Objet route, action add.', 'La destination s’appelle `default`.', '`via` désigne le routeur.'],
          solution: '```\n# ip route add default via 192.168.50.1\n```\nS’il existe déjà une route par défaut : `ip route replace default via …` ou la supprimer d’abord.',
        },
        {
          id: 'c09-06-03', type: 'commande', niveau: 2, ref: '§9.11.2, p. 238',
          enonce: 'Le réseau `10.8.0.0/24` (le VPN) est joignable via le routeur `192.168.50.20`. Ajoute la route.',
          accepte: ['(sudo )?ip r(oute)? add 10\\.8\\.0\\.0/24 via 192\\.168\\.50\\.20( dev [a-z0-9]+)?'],
          exemple: 'ip route add 10.8.0.0/24 via 192.168.50.20',
          indices: ['Comme pour default, mais avec un réseau précis.', 'Réseau en CIDR, puis `via`.', '`ip route add 10.8.0.0/24 via 192.168.50.20`'],
          solution: '```\n# ip route add 10.8.0.0/24 via 192.168.50.20\n```',
        },
        {
          id: 'c09-06-04', type: 'commande', niveau: 1, ref: '§9.11.1',
          enonce: 'Active l’interface `ens19`.',
          accepte: ['(sudo )?ip l(ink)? set( dev)? ens19 up', '(sudo )?ip l(ink)? set up( dev)? ens19'],
          exemple: 'ip link set ens19 up',
          indices: ['Objet link.', 'Action set … up.', '`ip link set ens19 up`'],
          solution: '```\n# ip link set ens19 up\n```',
        },
        {
          id: 'c09-06-05', type: 'qcm', niveau: 2, ref: '§9.11–9.12',
          enonce: 'Tu as configuré une adresse avec `ip address add`. Après un redémarrage, elle a disparu. Pourquoi ?',
          choix: [
            'Les commandes `ip` modifient seulement l’état courant du noyau ; il faut une configuration persistante',
            'Il fallait ajouter `--permanent`',
            'L’adresse était en conflit avec une autre machine',
            'Le noyau supprime les adresses inutilisées',
          ],
          reponse: 0,
          indices: ['`ip` parle au noyau, pas à un fichier.', 'Le noyau repart de zéro au démarrage.', 'C’est le rôle du gestionnaire de réseau.'],
          solution: '`ip` agit sur la configuration **en mémoire** du noyau. Au démarrage, c’est le gestionnaire de réseau (Netplan/networkd, NetworkManager) qui applique ses fichiers (fiche 9.7).',
        },
        {
          id: 'c09-06-06', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Une interface peut porter plusieurs adresses IPv4.', vrai: true },
            { texte: 'Supprimer la route par défaut d’un serveur distant par SSH est sans risque.', vrai: false, explication: 'Si ta connexion passe par cette route, tu perds la main.' },
            { texte: '`ip address add 192.168.50.1 dev ens19` crée la route vers 192.168.50.0/24.', vrai: false, explication: 'Sans préfixe, c’est un /32.' },
            { texte: 'NetworkManager peut écraser une adresse ajoutée à la main.', vrai: true },
          ],
          indices: ['Pense à ta propre session SSH.', 'Deux fausses.', 'Le préfixe compte.'],
          solution: 'Vrai, faux, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '9.7',
      titre: 'Configuration persistante : Netplan, systemd-networkd, NetworkManager',
      sections: '§9.12 à 9.14', pages: '239–243',
      objectif: 'Savoir quel outil gère le réseau sur Debian et sur Rocky, et modifier sa configuration.',
      rappel: `
        Au démarrage, un **gestionnaire de réseau** configure les interfaces : adresses statiques ou DHCP, routes, DNS.
        Il en existe plusieurs, et chaque distribution fait ses choix :

        | Système | Outil | Configuration |
        |---|---|---|
        | Debian 13 (image cloud, tes VM) | **Netplan** → systemd-networkd | \`/etc/netplan/*.yaml\` |
        | Debian 13 (installation classique) | ifupdown | \`/etc/network/interfaces\` |
        | Rocky Linux 10 | **NetworkManager** | \`/etc/NetworkManager/system-connections/*.nmconnection\`, outil \`nmcli\` |
        | Postes de travail | NetworkManager | interface graphique, \`nmcli\` |

        ### Netplan (Debian, Ubuntu)

        Netplan lit des fichiers YAML et **génère** la configuration de systemd-networkd (ou de NetworkManager).

        \`\`\`
        # /etc/netplan/60-boutique.yaml
        network:
          version: 2
          ethernets:
            ens19:
              addresses: [192.168.50.1/24]
        \`\`\`

        \`\`\`
        # chmod 600 /etc/netplan/60-boutique.yaml
        # netplan try          # applique, et annule tout seul si tu ne confirmes pas (sécurité en SSH)
        # netplan apply
        $ networkctl status ens19
        \`\`\`

        YAML est sensible à l’**indentation** (des espaces, jamais de tabulation). Le fichier \`50-cloud-init.yaml\`
        appartient à cloud-init : ajoute plutôt ton propre fichier.

        ### NetworkManager (Rocky)

        \`\`\`
        $ nmcli device                              # état des interfaces
        $ nmcli connection show                     # profils de connexion
        # nmcli connection add type ethernet ifname eth1 con-name boutique \\
                ipv4.method manual ipv4.addresses 192.168.50.10/24
        # nmcli connection modify boutique ipv4.dns 192.168.50.1
        # nmcli connection up boutique
        \`\`\`

        Une **connexion** (profil) est distincte d’un **périphérique** : un même périphérique peut avoir plusieurs profils.
        \`nmtui\` offre une interface texte.
      `,
      aRetenir: [
        'Debian cloud : Netplan (`/etc/netplan/*.yaml`) → systemd-networkd ; `netplan try`, `netplan apply`, `networkctl`.',
        'Debian classique : `/etc/network/interfaces` (ifupdown).',
        'Rocky : NetworkManager, `nmcli connection add|modify|up`, fichiers `.nmconnection`.',
        'YAML : indentation par espaces ; fichiers Netplan en 600.',
      ],
      exercices: [
        {
          id: 'c09-07-01', type: 'association', niveau: 1, ref: '§9.12–9.14',
          enonce: 'Associe chaque système à l’emplacement de sa configuration réseau.',
          paires: [
            ['Debian 13 image cloud (cuve)', '/etc/netplan/*.yaml'],
            ['Debian installé avec l’installeur classique', '/etc/network/interfaces'],
            ['Rocky Linux 10 (fut)', '/etc/NetworkManager/system-connections/'],
            ['systemd-networkd seul', '/etc/systemd/network/*.network'],
          ],
          indices: ['Les images cloud Debian utilisent un outil YAML.', 'ifupdown est l’outil historique de Debian.', 'Red Hat utilise NetworkManager.'],
          solution: 'cuve : Netplan ; Debian classique : interfaces ; Rocky : NetworkManager ; networkd : fichiers .network.',
        },
        {
          id: 'c09-07-02', type: 'trous', niveau: 2, ref: '§9.14',
          enonce: 'Complète le fichier Netplan qui donne l’adresse statique `192.168.50.10/24` à `ens19`.',
          texte: 'network:\n  version: [[1]]\n  [[2]]:\n    ens19:\n      [[3]]: [192.168.50.10/24]',
          trous: [
            { accepte: ['2'], exemple: '2' },
            { accepte: ['ethernets'], exemple: 'ethernets' },
            { accepte: ['addresses'], exemple: 'addresses' },
          ],
          indices: ['La version du format Netplan est 2.', 'Les cartes filaires sont des « ethernets ».', 'La clé des adresses est au pluriel.'],
          solution: '```\nnetwork:\n  version: 2\n  ethernets:\n    ens19:\n      addresses: [192.168.50.10/24]\n```',
        },
        {
          id: 'c09-07-03', type: 'commande', niveau: 2,
          enonce: 'Tu es connecté en SSH. Applique ta nouvelle configuration Netplan **avec annulation automatique** si tu perds la main.',
          accepte: ['(sudo )?netplan try( --timeout[= ]?\\d+)?'],
          exemple: 'netplan try',
          pieges: [{ motif: '(sudo )?netplan apply', message: '`apply` applique sans filet. `try` annule automatiquement si tu ne confirmes pas.' }],
          indices: ['Netplan a une sous-commande « essayer ».', 'Elle attend ta confirmation.', '`netplan try`'],
          solution: '```\n# netplan try\nDo you want to keep these settings? Press ENTER before the timeout to accept…\n```\nSans confirmation dans les 120 secondes, l’ancienne configuration revient.',
        },
        {
          id: 'c09-07-04', type: 'commande', niveau: 1, ref: '§9.14.2, p. 241',
          enonce: 'Sur fut, liste les profils de connexion de NetworkManager.',
          accepte: ['nmcli c(on(nection)?)?( show)?'],
          exemple: 'nmcli connection show',
          indices: ['L’outil en ligne de commande de NetworkManager.', 'Objet connection.', '`nmcli connection show`'],
          solution: '```\n$ nmcli connection show\nNAME                UUID                                  TYPE      DEVICE\ncloud-init eth0     1dd9a779-…                            ethernet  eth0\n```',
        },
        {
          id: 'c09-07-05', type: 'commande', niveau: 3, ref: '§9.14.2',
          enonce: 'Sur fut, crée un profil `boutique` pour l’interface `eth1`, avec l’adresse statique `192.168.50.20/24`.',
          accepte: ['(sudo )?nmcli c(on(nection)?)? add type ethernet (ifname eth1 con-name boutique|con-name boutique ifname eth1) (ipv4\\.method manual ipv4\\.addresses 192\\.168\\.50\\.20/24|ipv4\\.addresses 192\\.168\\.50\\.20/24 ipv4\\.method manual)', '(sudo )?nmcli c(on(nection)?)? add (con-name boutique type ethernet ifname eth1|type ethernet con-name boutique ifname eth1) (ipv4\\.method manual ipv4\\.addresses 192\\.168\\.50\\.20/24|ipv4\\.addresses 192\\.168\\.50\\.20/24 ipv4\\.method manual)', '(sudo )?nmcli c(on(nection)?)? add type ethernet (ifname eth1 con-name boutique|con-name boutique ifname eth1) ip4 192\\.168\\.50\\.20/24'],
          exemple: 'nmcli connection add type ethernet ifname eth1 con-name boutique ipv4.method manual ipv4.addresses 192.168.50.20/24',
          indices: ['`nmcli connection add`, avec un type, une interface et un nom.', 'Méthode IPv4 manuelle.', 'Propriétés `ipv4.method` et `ipv4.addresses`.'],
          solution: '```\n# nmcli connection add type ethernet ifname eth1 con-name boutique \\\n      ipv4.method manual ipv4.addresses 192.168.50.20/24\n# nmcli connection up boutique\n```\nLe profil est enregistré dans `/etc/NetworkManager/system-connections/boutique.nmconnection`.',
        },
        {
          id: 'c09-07-06', type: 'qcm', niveau: 2,
          enonce: 'Après `netplan apply`, le message « Permissions for /etc/netplan/60-boutique.yaml are too open » apparaît. Que faire ?',
          choix: [
            '`chmod 600 /etc/netplan/60-boutique.yaml` : le fichier peut contenir des secrets (mots de passe Wi-Fi)',
            'Le renommer en .conf',
            'Le déplacer dans /etc/network',
            'Ignorer le message, il n’a aucune importance',
          ],
          reponse: 0,
          indices: ['« too open » : trop de droits.', 'Netplan veut un fichier lisible par root seul.', '600.'],
          solution: 'Netplan exige que ses fichiers ne soient lisibles que par root (ils peuvent contenir des clés Wi-Fi ou VPN) : `chmod 600`.',
        },
        {
          id: 'c09-07-07', type: 'terminal', niveau: 2,
          enonce: 'Sur cuve, affiche `cat /etc/netplan/*.yaml` et `networkctl` ; sur fut, `nmcli device` et `ls /etc/NetworkManager/system-connections/`. Colle une sortie. Qui a écrit ces fichiers ?',
          attendu: ['ethernets|nmconnection|routable|connected'],
          indices: ['Regarde les commentaires en tête des fichiers.', 'Tes VM ont été configurées au premier démarrage.', 'Par cloud-init.'],
          solution: 'Les deux configurations ont été écrites par **cloud-init** au premier démarrage : `50-cloud-init.yaml` sur cuve (DHCP sur eth0, avec `match: macaddress` et `set-name: eth0`), `cloud-init-eth0.nmconnection` sur fut. `networkctl` montre eth0 *routable / configured*.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Les quatre couches (modèle Internet) ?', r: 'Application, transport (TCP/UDP), réseau (IP), physique (Ethernet).' },
    { q: 'Couches OSI 2, 3, 4 ?', r: '2 liaison (Ethernet), 3 réseau (IP), 4 transport (TCP/UDP).' },
    { q: '/24, /16, /26, /30 : masques ?', r: '255.255.255.0 ; 255.255.0.0 ; 255.255.255.192 ; 255.255.255.252.' },
    { q: 'Nombre d’hôtes dans un /24 ? un /30 ?', r: '254 ; 2 (2ⁿ − 2).' },
    { q: 'Adresse réseau et diffusion de 192.168.50.0/24 ?', r: '192.168.50.0 et 192.168.50.255.' },
    { q: 'Afficher adresses et routes ?', r: '`ip address show` (`ip a`) et `ip route show` (`ip r`).' },
    { q: 'Quelle route le noyau choisit-il ?', r: 'Le préfixe le plus long, puis la plus petite métrique ; `ip route get ADR`.' },
    { q: 'default dans la table de routage ?', r: '0.0.0.0/0 : la passerelle par défaut, pour tout ce qui n’a pas de route plus précise.' },
    { q: 'Taille d’une adresse IPv6 ? réseau standard ?', r: '128 bits ; /64.' },
    { q: 'fe80::/10 ? fd00::/8 ? ::1 ?', r: 'Lien local ; locale unique (ULA) ; bouclage.' },
    { q: 'Abréger 2001:0db8:0000:0000:0000:0000:0000:0042 ?', r: '2001:db8::42 (un seul ::).' },
    { q: 'ping sans réponse = machine éteinte ?', r: 'Non : ICMP peut être filtré par un pare-feu.' },
    { q: 'UP et LOWER_UP dans ip link ?', r: 'Interface activée ; lien physique présent.' },
    { q: 'Ajouter une adresse et une passerelle à la main ?', r: '`ip address add 192.168.50.1/24 dev ens19` ; `ip route add default via GW`.' },
    { q: 'Pourquoi une config `ip` disparaît-elle ?', r: 'Elle n’existe que dans le noyau : le gestionnaire réapplique ses fichiers au démarrage.' },
    { q: 'Configuration réseau de cuve (Debian cloud) ?', r: 'Netplan : /etc/netplan/*.yaml (600), `netplan try` / `apply`, puis systemd-networkd (`networkctl`).' },
    { q: 'Configuration réseau de fut (Rocky) ?', r: 'NetworkManager : `nmcli connection add|modify|up`, fichiers .nmconnection.' },
  ],
  memo: `
    ### Adresses et masques
    | CIDR | Masque | Hôtes |
    |---|---|---|
    | /8 | 255.0.0.0 | 16 777 214 |
    | /16 | 255.255.0.0 | 65 534 |
    | /24 | 255.255.255.0 | 254 |
    | /26 | 255.255.255.192 | 62 |
    | /30 | 255.255.255.252 | 2 |

    IPv6 : 128 bits, /64 ; fe80:: lien local · 2000::/3 globale · fd00::/8 ULA · ::1 bouclage.

    ### Commandes ip
    \`\`\`
    ip a | ip -br a | ip -6 a | ip link | ip -s link
    ip r | ip -6 r | ip route get 1.1.1.1
    ip link set IF up|down
    ip address add|del 192.168.50.1/24 dev IF
    ip route add default via GW    ip route add RÉSEAU/PRÉFIXE via ROUTEUR    ip route del …
    ping -c 3 ADR   tracepath ADR   host NOM   host ADR   dig NOM
    \`\`\`

    ### Configuration persistante
    \`\`\`
    Debian cloud : /etc/netplan/60-x.yaml (chmod 600) → netplan try | netplan apply → networkctl [status IF]
    Debian classique : /etc/network/interfaces → ifup/ifdown
    Rocky : nmcli device | nmcli connection show
            nmcli connection add type ethernet ifname eth1 con-name NOM ipv4.method manual ipv4.addresses ADR/PRÉFIXE
            nmcli connection modify NOM ipv4.gateway GW ipv4.dns DNS ; nmcli connection up NOM
    \`\`\`
  `,
});
