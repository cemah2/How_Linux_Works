/* Glossaire du bloc « Au-delà du livre » (modules A1 à A8). */
HLW.glossaire([
  // Module A1
  { terme: 'Paquet logiciel', en: 'software package', def: 'Archive (.deb, .rpm) contenant des fichiers, des métadonnées (version, dépendances) et des scripts d’installation.', chap: 'A1' },
  { terme: 'Dépôt', en: 'repository', def: 'Serveur qui publie des paquets et un index signé ; décrit dans /etc/apt/sources.list.d ou /etc/yum.repos.d.', chap: 'A1' },
  { terme: 'Dépendance', en: 'dependency', def: 'Autre paquet nécessaire au fonctionnement d’un paquet ; résolue par apt ou dnf.', chap: 'A1' },
  { terme: 'deb822', en: 'deb822 sources format', def: 'Format des fichiers .sources d’APT (un bloc Types/URIs/Suites/Components/Signed-By), par défaut sur Debian 13.', chap: 'A1' },
  { terme: 'EPEL', en: 'Extra Packages for Enterprise Linux', def: 'Dépôt communautaire de paquets supplémentaires pour Rocky et RHEL.', chap: 'A1' },
  { terme: 'Flatpak', en: 'Flatpak', def: 'Système de distribution d’applications en bac à sable, avec des runtimes partagés ; dépôt Flathub.', chap: 'A1' },
  // Module A2
  { terme: 'Netfilter', en: 'Netfilter', def: 'Sous-système du noyau qui filtre et modifie les paquets ; programmé par nftables, iptables ou firewalld.', chap: 'A2' },
  { terme: 'nftables', en: 'nftables', def: 'Interface moderne de Netfilter : tables, chaînes et règles, commande nft.', chap: 'A2' },
  { terme: 'firewalld', en: 'firewalld', def: 'Démon de pare-feu à zones (Rocky), configurations d’exécution et permanente ; commande firewall-cmd.', chap: 'A2' },
  { terme: 'Zone (firewalld)', en: 'zone', def: 'Niveau de confiance attribué à des interfaces ou des sources, avec ses services et ports autorisés.', chap: 'A2' },
  { terme: 'Masquerade', en: 'masquerading', def: 'NAT de sortie qui remplace l’adresse source par celle de l’interface de sortie.', chap: 'A2' },
  // Module A3
  { terme: 'Contrôle d’accès obligatoire', en: 'mandatory access control (MAC)', def: 'Politique imposée par le système, à laquelle même root est soumis (SELinux, AppArmor).', chap: 'A3' },
  { terme: 'SELinux', en: 'Security-Enhanced Linux', def: 'Contrôle d’accès obligatoire fondé sur des étiquettes (contextes) ; modes enforcing, permissive, disabled.', chap: 'A3' },
  { terme: 'Contexte SELinux', en: 'SELinux context', def: 'Étiquette utilisateur:rôle:type:niveau d’un fichier ou d’un processus ; le type décide des accès.', chap: 'A3' },
  { terme: 'Booléen SELinux', en: 'SELinux boolean', def: 'Interrupteur de la politique (setsebool -P) qui active un comportement prévu.', chap: 'A3' },
  { terme: 'AVC', en: 'access vector cache denial', def: 'Événement d’audit d’un refus SELinux ; ausearch -m AVC.', chap: 'A3' },
  { terme: 'AppArmor', en: 'AppArmor', def: 'Contrôle d’accès obligatoire fondé sur des profils par chemin (Debian, Ubuntu) ; modes enforce et complain.', chap: 'A3' },
  // Module A4
  { terme: 'nsenter', en: 'nsenter', def: 'Commande qui exécute un programme dans les espaces de noms d’un processus existant.', chap: 'A4' },
  { terme: 'Capacité', en: 'capability', def: 'Fraction des pouvoirs de root (CAP_NET_BIND_SERVICE, CAP_SYS_ADMIN…) attribuable séparément.', chap: 'A4' },
  { terme: 'Correspondance d’UID', en: 'UID mapping', def: 'Table (uid_map) qui relie les UID d’un espace user à ceux de l’hôte ; plages dans /etc/subuid.', chap: 'A4' },
  { terme: 'pivot_root', en: 'pivot_root', def: 'Appel système qui change la racine d’un espace de montage, utilisé par les moteurs de conteneurs.', chap: 'A4' },
  // Module A5
  { terme: 'RAID', en: 'Redundant Array of Independent Disks', def: 'Regroupement de disques pour la redondance ou la performance (niveaux 0, 1, 5, 6, 10) ; mdadm sous Linux.', chap: 'A5' },
  { terme: 'Mode dégradé', en: 'degraded mode', def: 'État d’un RAID qui a perdu un disque mais sert encore les données ([U_] dans /proc/mdstat).', chap: 'A5' },
  { terme: 'Instantané LVM', en: 'LVM snapshot', def: 'Image figée d’un volume logique à un instant, en copie sur écriture (lvcreate -s).', chap: 'A5' },
  { terme: 'Volume fin', en: 'thin volume', def: 'Volume LVM dont l’espace est alloué au fur et à mesure dans un pool ; la taille annoncée peut dépasser l’espace réel.', chap: 'A5' },
  { terme: 'LUKS', en: 'Linux Unified Key Setup', def: 'Format de chiffrement de disque (dm-crypt) avec plusieurs emplacements de clés ; cryptsetup.', chap: 'A5' },
  { terme: 'crypttab', en: '/etc/crypttab', def: 'Fichier qui décrit les volumes chiffrés à ouvrir au démarrage.', chap: 'A5' },
  // Module A6
  { terme: 'Méthode USE', en: 'USE method', def: 'Pour chaque ressource, examiner Utilisation, Saturation et Erreurs.', chap: 'A6' },
  { terme: 'PSI', en: 'Pressure Stall Information', def: 'Mesure du temps d’attente des tâches sur le processeur, la mémoire et les disques (/proc/pressure).', chap: 'A6' },
  { terme: 'perf', en: 'perf', def: 'Outil de profilage du noyau Linux : compteurs, échantillonnage, piles d’appels.', chap: 'A6' },
  { terme: 'eBPF', en: 'extended Berkeley Packet Filter', def: 'Petits programmes vérifiés exécutés dans le noyau sur des événements, pour tracer, filtrer ou sécuriser.', chap: 'A6' },
  { terme: 'bpftrace', en: 'bpftrace', def: 'Langage de traçage d’une ligne fondé sur eBPF : sonde /filtre/ { action }.', chap: 'A6' },
  { terme: 'Point de trace', en: 'tracepoint', def: 'Point d’observation stable prévu dans le noyau, utilisable par perf et eBPF.', chap: 'A6' },
  // Module A7
  { terme: 'Ansible', en: 'Ansible', def: 'Outil d’automatisation sans agent : inventaire, modules idempotents, playbooks YAML, via SSH.', chap: 'A7' },
  { terme: 'Inventaire', en: 'inventory', def: 'Liste des machines gérées par Ansible, rangées en groupes.', chap: 'A7' },
  { terme: 'Playbook', en: 'playbook', def: 'Fichier YAML décrivant, pour des groupes de machines, les tâches qui mènent à l’état voulu.', chap: 'A7' },
  { terme: 'Idempotence', en: 'idempotence', def: 'Propriété d’une opération qui, relancée, ne change plus rien une fois l’état voulu atteint.', chap: 'A7' },
  { terme: 'Rôle Ansible', en: 'role', def: 'Ensemble réutilisable de tâches, gestionnaires, modèles et variables autour d’un même sujet.', chap: 'A7' },
  { terme: 'Ansible Vault', en: 'Ansible Vault', def: 'Chiffrement des fichiers et valeurs secrètes d’un projet Ansible.', chap: 'A7' },
  // Module A8
  { terme: 'Durcissement', en: 'hardening', def: 'Réduction de la surface d’attaque : services, ports, comptes, droits et paramètres minimaux.', chap: 'A8' },
  { terme: 'auditd', en: 'Linux audit daemon', def: 'Démon qui enregistre des événements de sécurité choisis (accès à un fichier, appels système).', chap: 'A8' },
  { terme: 'RPO / RTO', en: 'recovery point / time objective', def: 'Quantité de données qu’on accepte de perdre / durée d’interruption acceptable.', chap: 'A8' },
  { terme: 'Règle 3-2-1', en: '3-2-1 backup rule', def: 'Trois copies des données, sur deux supports différents, dont une hors site.', chap: 'A8' },
  { terme: 'Rapport d’incident', en: 'postmortem', def: 'Analyse sans recherche de coupable : chronologie, causes, actions correctives et préventives.', chap: 'A8' },
  { terme: 'Runbook', en: 'runbook', def: 'Procédure écrite pas à pas pour traiter une situation d’exploitation connue.', chap: 'A8' },
]);
