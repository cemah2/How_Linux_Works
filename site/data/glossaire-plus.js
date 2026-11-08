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
]);
