# Lab 07 : le réseau de la brasserie

> **Chapitre** : 9 (adresses, routes, Netplan, NetworkManager, DNS, DHCP, routage, NAT, pare-feu) · **Durée** : 3 h
> **VM** : `douane`, `cuve` et `comptoir` · **Prérequis** : fiches 9.1 à 9.12, scénario Proxmox `reseau`

## Le ticket

> **Ticket #701**, ouvert par Inès Garnier (gérante), priorité haute
>
> On ouvre une **boutique physique** ! Malik a installé un poste de caisse, `comptoir`, sur un réseau à part,
> **192.168.50.0/24**, que l’on appellera `brasserie.lan`. Rien n’y fonctionne encore : le poste n’a même pas
> d’adresse. Voici le plan :
>
> | Machine | Rôle | Adresse sur le réseau interne |
> |---|---|---|
> | `douane` | routeur et pare-feu entre le réseau interne et Internet | **192.168.50.1** (fixe) |
> | `cuve` | serveur (il garde aussi sa carte habituelle) | **192.168.50.10** (fixe) |
> | `comptoir` | poste de caisse | **192.168.50.100**, attribuée par DHCP (toujours la même) |
>
> Ce que j’attends :
>
> 1. `douane` route les paquets entre le réseau interne et Internet, avec **traduction d’adresses** (NAT).
> 2. `douane` distribue les adresses (**DHCP**) et répond aux questions de noms (**DNS**) pour le réseau interne :
>    `douane.brasserie.lan`, `cuve.brasserie.lan`, `comptoir.brasserie.lan`. Les autres noms (Internet) doivent
>    aussi fonctionner. Surtout, rien de tout ça ne doit être proposé **du côté externe**.
> 3. `douane` est un **pare-feu** : tout ce qui n’est pas explicitement autorisé est refusé, en entrée comme en
>    transit. Le réseau interne peut sortir ; Internet ne peut pas entrer. Et on doit toujours pouvoir
>    administrer douane en SSH.
> 4. Sur le comptoir, les noms courts doivent marcher : `ping cuve` plutôt que `ping cuve.brasserie.lan`.
> 5. `cuve` rejoint le réseau interne avec son adresse fixe, **sans changer sa sortie habituelle** vers Internet,
>    et sait résoudre les noms de `brasserie.lan`.
> 6. Tout doit survivre à un **redémarrage** des trois machines.
>
> Inès

## Avant de commencer

1. Sur l’hôte Proxmox : `./deployer.sh reseau` (crée le pont isolé, douane et comptoir, et ajoute une carte à
   cuve), puis `./instantane.sh creer avant-lab07`.
2. Lance `lab start 07` **sur chacune des trois machines** : sur douane et cuve par SSH, sur comptoir par la
   console Proxmox (il n’a pas encore de réseau).
3. Repère les interfaces : `ip -br link` et `ip -br address`. Sur douane, l’interface **externe** est celle qui
   a déjà une adresse (souvent `eth0`) ; l’interface **interne** est l’autre (souvent `eth1`).

Conseil d’ordre : douane d’abord (adresse interne, routage, dnsmasq), puis le comptoir, puis cuve, et le pare-feu
en dernier, une fois que tout fonctionne.

## Ce qui est vérifié

`lab check 07` vérifie les objectifs **du rôle de la machine** sur laquelle tu le lances. Il faut que les trois
machines soient au vert.

| Machine | Objectifs |
|---|---|
| douane | adresse interne persistante ; routage persistant ; dnsmasq (DHCP, plage, réservation, bail du comptoir) ; DNS interne, relais externe, rien côté externe ; NAT persistant ; politiques drop en entrée et en transit ; cuve et comptoir joignables |
| comptoir | adresse 192.168.50.100 par DHCP et passerelle douane ; noms internes et noms courts ; Internet (noms et HTTPS) ; cuve joignable |
| cuve | adresse interne persistante ; route par défaut inchangée ; noms de `brasserie.lan` résolus par douane, noms extérieurs toujours résolus ; comptoir joignable |

## Règles du jeu

- Le pare-feu peut te couper de douane : garde la **console Proxmox** ouverte, et autorise SSH **avant** de passer
  la politique à `drop`. Vérifie la syntaxe avec `nft -c -f` avant de charger.
- Pour Netplan à distance, utilise `netplan try` : il annule tout seul si tu perds la connexion.
- Diagnostique couche par couche : lien (`ip link`), adresse (`ip a`), route (`ip r`), voisin (`ip neigh`),
  nom (`getent hosts`, `dig`), service (`ss -ulnp`), pare-feu (`nft list ruleset`), et `tcpdump` quand rien
  ne va plus.
- Il y a au moins **cinq pièges**. Les messages de `lab check` et les journaux te mettront sur la voie.
- Pour finir : redémarre les trois machines et relance `lab check 07` partout.

## Coincé ?

- `lab hint 07 1`, puis `2`, puis `3` (ou [indices.md](indices.md)).
- La solution commentée : `lab solution 07` ou [solution.md](solution.md).
- Tout recommencer : `lab reset 07` sur chaque machine (ou l’instantané `avant-lab07`).
