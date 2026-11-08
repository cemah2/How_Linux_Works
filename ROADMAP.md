# Feuille de route

Livraison par blocs, chacun validé avant de passer au suivant.

## Livraison 1 : pilote ✅

- [x] Moteur du cahier : 10 types d’exercices, 3 niveaux d’indices, score, progression locale + export/import,
      cartes Leitner, examens blancs générés, glossaire, mémos imprimables, recherche, thème sombre, mobile
- [x] Chapitre 0 (mise en place), chapitre 1, chapitre 2 (+ fiches 2.A permissions spéciales/ACL et 2.B vi)
- [x] Infrastructure Proxmox (modèles cloud-init Debian 13 / Rocky 10, déploiement, instantanés) et outil `lab`
- [x] Lab 00 (mise en place) et Lab 01 (premier jour à la brasserie)
- [x] Validation automatique des données, shellcheck, CI, publication GitHub Pages

## Livraison 2 : le système de l’intérieur (chapitres 3 à 8) ✅

- [x] Ch. 3 Périphériques : fichiers de périphériques, sysfs, dd, udev, SCSI
- [x] Ch. 4 Disques et systèmes de fichiers : partitions, mkfs, mount, fstab, UUID, swap, LVM, inodes
- [x] Ch. 5 Démarrage du noyau : messages, paramètres, GRUB, UEFI, Secure Boot
- [x] Ch. 6 Espace utilisateur : systemd (unités, dépendances, activation à la demande), System V, initramfs, mode secours
- [x] Ch. 7 Configuration : journald, logrotate, /etc/passwd et shadow, heure et NTP, cron et timers, at, UID réel/effectif, PAM
- [x] Ch. 8 Processus et ressources : lsof, strace, ltrace, threads, top, nice, load average, vmstat, iostat, pidstat, cgroups v2
- [x] Labs 02 (disques et LVM), 03 (sauvetage du démarrage), 04 (systemd), 05 (comptes, PAM), 06 (performances)
- [x] Examen blanc du bloc 2 (généré à partir des exercices des chapitres 3 à 8)
- [x] `infra/proxmox/ajouter-disques.sh`, sous-commande `lab panne`, tests de bout en bout des labs dans la CI

## Livraison 3 : réseau (chapitres 9, 10, 12) ✅

- [x] Ch. 9 : couches, IPv4/IPv6, sous-réseaux, routes, ip, DNS, NetworkManager, TCP/UDP, DHCP, routage, NAT, pare-feu, ARP/NDP, Wi-Fi
- [x] Ch. 10 : services, sshd, fail2ban, ss/lsof, tcpdump, netcat, balayage de ports, sockets
- [x] Ch. 12 : rsync, Samba, SSHFS, NFS
- [x] Scénario Proxmox `reseau` : pont isolé, `douane` (routeur/pare-feu) et `comptoir` (poste client)
- [x] Labs 07 (réseau), 08 (SSH sécurisé), 10 (sauvegardes et partages)
- [x] Examen blanc du bloc 3
- [x] Tests CI des labs réseau : trois machines simulées (espaces de noms réseau, interfaces factices)

## Livraison 4 : environnement et outils (chapitres 11, 13 à 17)

- [ ] Ch. 11 Scripts shell, ch. 13 Environnements utilisateur, ch. 14 Bureau (allégé), ch. 15 Outils de développement,
      ch. 16 Compilation, ch. 17 Virtualisation et conteneurs
- [ ] Labs 09 (scripts), 11 (compilation), 12 (conteneurs)
- [ ] Examen blanc du bloc 4 et examen final (format LPIC)

## Livraison 5 : au-delà du livre

- [ ] A1 Paquets (apt, dnf, Flatpak) · A2 nftables et firewalld · A3 SELinux et AppArmor · A4 Namespaces
- [ ] A5 Stockage avancé (RAID, LVM, LUKS) · A6 perf, eBPF · A7 Ansible · A8 Exploitation en production
- [ ] Lab 13 : incident en production

## Idées pour plus tard

- Terminal Linux dans le navigateur (émulateur) pour pratiquer les chapitres 2 et 11 sans VM
- Mode « formateur » : export des résultats d’un groupe d’étudiants
- Version imprimable complète (PDF) de toutes les fiches
- Variante Vagrant ou VirtualBox pour celles et ceux qui n’ont pas de Proxmox
