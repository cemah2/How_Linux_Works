# Indices du Lab 07

## Niveau 1

1. **Adresse interne de douane** : une adresse posée avec `ip address add` disparaît au redémarrage. Où se trouve
   la configuration persistante sur une Debian cloud (fiche 9.7) ?
2. **Routage** : par défaut, Linux ne transfère pas les paquets d’une interface à l’autre (fiche 9.11).
3. **DHCP et DNS** : dnsmasq est installé mais arrêté. Sa configuration se met dans `/etc/dnsmasq.d/`. Il doit ne
   servir que l’interface interne (fiche 9.10).
4. **Réservation** : comment dnsmasq reconnaît-il le comptoir ? Par son adresse MAC (`ip link` sur le comptoir).
5. **Noms** : dnsmasq peut annoncer des noms fixes, et un domaine pour les machines qu’il sert.
6. **NAT** : sans traduction, les réponses d’Internet ne savent pas revenir vers 192.168.50.x (fiche 9.11).
7. **Pare-feu** : quelles chaînes ? quelles politiques ? qu’est-ce qu’il faut autoriser AVANT de tout refuser
   (fiche 9.12) ? N’oublie pas ce dont dnsmasq a besoin.
8. **Comptoir** : une fois douane prête, il faut relancer sa demande DHCP. Qui gère le réseau sur Rocky ?
9. **cuve** : une adresse sans passerelle, et un serveur DNS seulement pour un domaine.

## Niveau 2

1. Crée `/etc/netplan/60-interne.yaml` (droits 600) avec ton interface interne et `addresses: [192.168.50.1/24]`,
   puis `netplan try`. Utilise le nom que montre `ip link` (cloud-init renomme les cartes en eth0, eth1…).
2. `net.ipv4.ip_forward = 1` dans un fichier de `/etc/sysctl.d/`, puis `sysctl --system`.
3. Options utiles : `interface=`, `bind-interfaces`, `dhcp-range=`, `dhcp-option=option:router,…`, `domain=`,
   `local=/brasserie.lan/`. Si dnsmasq refuse de démarrer : `journalctl -u dnsmasq`… quelqu’un écoute déjà sur
   le port 53 (`ss -ulnp`), qui est-ce ?
4. `dhcp-host=MAC,comptoir,192.168.50.100`.
5. `host-record=cuve.brasserie.lan,cuve,192.168.50.10` (et de même pour douane). Le comptoir prend son nom de
   sa réservation, avec le domaine de `domain=`.
6. Une table `ip nat`, une chaîne `postrouting` de type nat, une règle `masquerade` sur l’interface externe.
7. `table inet filtre` avec deux chaînes, input et forward, `policy drop`. En entrée : lo, `ct state
   established,related`, SSH, ICMP, et depuis l’interface interne DNS (udp/tcp 53) et DHCP (udp 67). En transit :
   `established,related`, et de l’interface interne vers l’externe. Puis `systemctl enable --now nftables`.
8. `nmcli connection show`, puis `nmcli connection up NOM` (ou `nmcli device reapply eth0`).
9. Netplan sur cuve : `addresses`, et `nameservers: {addresses: [192.168.50.1], search: [brasserie.lan]}`,
   **sans** `routes`/`gateway4`. systemd-resolved enverra les questions sur `brasserie.lan` à douane.

## Niveau 3

1. ```
   # /etc/netplan/60-interne.yaml
   network:
     version: 2
     ethernets:
       eth1:
         addresses: [192.168.50.1/24]
   ```
   `sudo chmod 600 /etc/netplan/60-interne.yaml && sudo netplan try`
2. `echo 'net.ipv4.ip_forward = 1' | sudo tee /etc/sysctl.d/90-routeur.conf && sudo sysctl --system`
3. à 5. `/etc/dnsmasq.d/brasserie.conf` :
   ```
   interface=eth1
   bind-interfaces
   domain=brasserie.lan
   local=/brasserie.lan/
   dhcp-range=192.168.50.120,192.168.50.150,12h
   dhcp-option=option:router,192.168.50.1
   dhcp-option=option:dns-server,192.168.50.1
   dhcp-host=bc:24:11:xx:xx:xx,comptoir,192.168.50.100
   host-record=douane.brasserie.lan,douane,192.168.50.1
   host-record=cuve.brasserie.lan,cuve,192.168.50.10
   ```
   puis `sudo systemctl enable --now dnsmasq`.
6. et 7. Le fichier `/etc/nftables.conf` complet est dans la solution. `sudo nft -c -f /etc/nftables.conf`, puis
   `sudo systemctl enable --now nftables && sudo systemctl restart nftables`.
8. Sur le comptoir : `sudo nmcli connection up "cloud-init eth0"`, puis `ip -br a`, `ip r`, `getent hosts cuve`.
9. Sur cuve, `/etc/netplan/60-interne.yaml` avec l’interface interne (souvent `ens19`), l’adresse 192.168.50.10/24
   et les `nameservers`, puis `netplan try` et `resolvectl status`.
