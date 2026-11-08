/* Glossaire du bloc « Le système de l’intérieur » (chapitres 3 à 8). */
HLW.glossaire([
  // Chapitre 3
  { terme: 'Fichier de périphérique', en: 'device file, device node', def: 'Fichier de `/dev` qui donne accès à un pilote du noyau ; ne contient aucune donnée.', chap: '03' },
  { terme: 'Périphérique bloc', en: 'block device', def: 'Périphérique lu par blocs de taille fixe, avec accès aléatoire et taille connue (disques, partitions). Lettre `b`.', chap: '03' },
  { terme: 'Périphérique caractère', en: 'character device', def: 'Périphérique qui fonctionne comme un flux d’octets (terminaux, `/dev/null`). Lettre `c`.', chap: '03' },
  { terme: 'Tube nommé', en: 'named pipe, FIFO', def: 'Fichier spécial permettant à deux processus de communiquer. Lettre `p`.', chap: '03' },
  { terme: 'Numéro majeur', en: 'major number', def: 'Identifie le pilote associé à un fichier de périphérique (8 = disques SCSI).', chap: '03' },
  { terme: 'Numéro mineur', en: 'minor number', def: 'Identifie l’instance pour un pilote donné (0 = sda, 1 = sda1, 16 = sdb).', chap: '03' },
  { terme: 'sysfs', en: 'sysfs', def: 'Système de fichiers virtuel monté sur `/sys`, qui décrit les périphériques et permet de les régler.', chap: '03' },
  { terme: 'devtmpfs', en: 'devtmpfs', def: 'Système de fichiers en mémoire monté sur `/dev`, dans lequel le noyau crée lui-même les fichiers de périphériques.', chap: '03' },
  { terme: 'udev', en: 'udev, systemd-udevd', def: 'Démon qui reçoit les événements du noyau et applique des règles : droits, liens stables, actions.', chap: '03' },
  { terme: 'Événement noyau', en: 'uevent', def: 'Notification envoyée par le noyau à l’espace utilisateur quand un périphérique apparaît ou change.', chap: '03' },
  { terme: 'Console virtuelle', en: 'virtual console', def: 'Terminal plein écran de l’écran physique (`/dev/tty1`…), changé avec Ctrl-Alt-Fn ou `chvt`.', chap: '03' },
  { terme: 'Pseudo-terminal', en: 'pseudoterminal, pty', def: 'Terminal logiciel attribué à une fenêtre ou une session SSH (`/dev/pts/N`).', chap: '03' },
  { terme: 'Port série', en: 'serial port', def: 'Liaison texte RS-232 (`/dev/ttyS0`) ; sert de console de secours aux VM Proxmox.', chap: '03' },
  { terme: 'SCSI', en: 'Small Computer System Interface', def: 'Protocole de stockage qui sert d’interface commune dans le noyau pour SATA, USB, SAS, virtio-scsi.', chap: '03' },
  { terme: 'LUN', en: 'logical unit number', def: 'Numéro d’unité logique, dernier élément d’une adresse SCSI hôte:canal:cible:LUN.', chap: '03' },
  { terme: 'virtio', en: 'virtio', def: 'Famille de périphériques virtuels performants pour les VM KVM (virtio-scsi, virtio-blk, virtio-net).', chap: '03' },
]);
