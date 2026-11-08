# Solution du Lab 07

Les noms d’interfaces sont ceux d’une installation typique : sur **douane**, `eth0` (externe) et `eth1` (interne) ;
sur **cuve**, `eth0` (externe) et `ens19` (interne, ajoutée après coup, donc pas renommée par cloud-init) ;
sur **comptoir**, `eth0`. Vérifie toujours avec `ip -br link`.

## 1. douane : adresse interne

`/etc/netplan/60-interne.yaml` :

```
network:
  version: 2
  ethernets:
    eth1:
      addresses: [192.168.50.1/24]
```

```
$ sudo chmod 600 /etc/netplan/60-interne.yaml
$ sudo netplan try            # Entrée pour confirmer
$ ip -br a show eth1
eth1   UP   192.168.50.1/24 fe80::…/64
```

`50-cloud-init.yaml` décrit aussi eth1 (sans adresse) : Netplan **fusionne** les fichiers, le tien ajoute l’adresse.
On ne modifie pas le fichier de cloud-init.

## 2. douane : routage

```
$ echo 'net.ipv4.ip_forward = 1' | sudo tee /etc/sysctl.d/90-routeur.conf
$ sudo sysctl --system
$ sysctl net.ipv4.ip_forward
net.ipv4.ip_forward = 1
```

## 3 à 5. douane : DHCP et DNS avec dnsmasq

Adresse MAC du comptoir (console Proxmox du comptoir, ou onglet Matériel de la VM) : `ip link show eth0`.

`/etc/dnsmasq.d/brasserie.conf` :

```
# Ne servir QUE le réseau interne
interface=eth1
bind-interfaces

# Le domaine de la brasserie : réponses locales, jamais relayées vers Internet
domain=brasserie.lan
local=/brasserie.lan/

# DHCP
dhcp-range=192.168.50.120,192.168.50.150,12h
dhcp-option=option:router,192.168.50.1
dhcp-option=option:dns-server,192.168.50.1
dhcp-host=bc:24:11:c4:91:33,comptoir,192.168.50.100

# Noms fixes
host-record=douane.brasserie.lan,douane,192.168.50.1
host-record=cuve.brasserie.lan,cuve,192.168.50.10
```

```
$ sudo systemctl enable --now dnsmasq
$ systemctl status dnsmasq
$ dig +short @192.168.50.1 cuve.brasserie.lan
192.168.50.10
$ dig +short @192.168.50.1 deb.debian.org          # relayé vers les serveurs de douane
```

**Piège 1** : sans `bind-interfaces`, dnsmasq tente d’écouter sur **toutes** les adresses (0.0.0.0:53) et échoue :
`failed to create listening socket for port 53: Address already in use`. Le coupable, `ss -ulnp sport = :53` :
systemd-resolved, sur 127.0.0.53. Avec `bind-interfaces`, dnsmasq n’écoute que sur les adresses de eth1 (et de lo),
et les deux cohabitent. Bonus : il ne répond plus du côté externe.

La réservation (`dhcp-host`) peut être hors de la plage `dhcp-range` : il suffit qu’elle soit dans le même réseau.

## 6 et 7. douane : NAT et pare-feu

`/etc/nftables.conf` :

```
#!/usr/sbin/nft -f
flush ruleset

define EXT = "eth0"
define INT = "eth1"
define LAN = 192.168.50.0/24

table inet filtre {
    chain input {
        type filter hook input priority filter; policy drop;
        iif "lo" accept
        ct state established,related accept
        ct state invalid drop
        tcp dport 22 accept                                   # administration (de partout)
        meta l4proto { icmp, ipv6-icmp } accept               # ping, et IPv6 en a besoin
        iifname $EXT udp sport 67 udp dport 68 accept         # réponses DHCP pour la carte externe
        iifname $INT udp dport { 53, 67 } accept              # DNS et DHCP pour le réseau interne
        iifname $INT tcp dport 53 accept
    }
    chain forward {
        type filter hook forward priority filter; policy drop;
        ct state established,related accept
        ct state invalid drop
        iifname $INT oifname $EXT accept                      # le réseau interne sort
    }
    chain output {
        type filter hook output priority filter; policy accept;
    }
}

table ip nat {
    chain postrouting {
        type nat hook postrouting priority srcnat; policy accept;
        ip saddr $LAN oifname $EXT masquerade
    }
}
```

```
$ sudo nft -c -f /etc/nftables.conf               # syntaxe
$ sudo systemctl enable --now nftables
$ sudo systemctl restart nftables                 # recharge le fichier
$ sudo nft list ruleset
```

**Piège 2** : oublier DNS et DHCP en entrée depuis eth1. Tout marche… jusqu’à ce que la politique passe à `drop` :
le comptoir n’obtient plus d’adresse, et plus aucun nom ne se résout.

**Piège 3** : sans `ct state established,related accept` dans forward, les requêtes du comptoir sortent mais les
réponses ne reviennent pas.

## 8. comptoir

Sur la console du comptoir :

```
$ nmcli connection show
NAME              UUID   TYPE      DEVICE
cloud-init eth0   …      ethernet  eth0
$ sudo nmcli connection up "cloud-init eth0"
$ ip -br a ; ip r
eth0   UP   192.168.50.100/24 …
default via 192.168.50.1 dev eth0 proto dhcp …
$ cat /etc/resolv.conf
search brasserie.lan
nameserver 192.168.50.1
$ ping -c1 cuve ; curl -I https://deb.debian.org
```

Le domaine de recherche `brasserie.lan` vient de l’option `domain=` de dnsmasq (option DHCP 15) : c’est lui qui
fait marcher les noms courts.

Le comptoir a maintenant Internet : sur ton poste, `ssh comptoir` passe par douane (`ProxyJump`, fiche 10.3).

## 9. cuve

`/etc/netplan/60-interne.yaml` :

```
network:
  version: 2
  ethernets:
    ens19:
      addresses: [192.168.50.10/24]
      nameservers:
        addresses: [192.168.50.1]
        search: [brasserie.lan]
```

```
$ sudo chmod 600 /etc/netplan/60-interne.yaml && sudo netplan try
$ ip r                     # la route par défaut passe toujours par eth0
$ resolvectl status ens19
Link 3 (ens19)
    Current Scopes: DNS
       DNS Servers: 192.168.50.1
        DNS Domain: brasserie.lan
$ getent hosts comptoir.brasserie.lan
192.168.50.100  comptoir.brasserie.lan
$ getent hosts deb.debian.org          # toujours résolu par les serveurs de eth0
```

**Piège 4** : ajouter `routes: [{to: default, via: 192.168.50.1}]` (ou `gateway4`) sur ens19. cuve aurait deux
routes par défaut, et sa sortie deviendrait imprévisible. Une interface secondaire n’a pas besoin de passerelle :
le réseau 192.168.50.0/24 est directement connecté.

Pourquoi les deux résolutions marchent : systemd-resolved connaît les serveurs DNS **de chaque interface**. Le
domaine de ens19 (`brasserie.lan`) lui sert de **domaine de routage** : les questions sur `*.brasserie.lan` partent
vers 192.168.50.1, les autres vers les serveurs de eth0.

## Vérification finale

Redémarre les trois machines (`sudo reboot`), puis `lab check 07` sur chacune.
