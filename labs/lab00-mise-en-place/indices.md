# Indices du Lab 00

## Niveau 1

- Les scripts lisent tout leur paramétrage dans `infra/proxmox/lab.conf` : c’est presque toujours là que se trouve l’erreur.
- Un message rouge de `lab check 00` dit précisément ce qui manque : lis-le jusqu’au bout (fiche 2.9).
- cloud-init travaille plusieurs minutes au premier démarrage. Si des objectifs échouent juste après le déploiement, attends et relance.

## Niveau 2

- **Snippets** : `pvesm status --content snippets` doit lister le stockage indiqué dans `STOCKAGE_SNIPPETS`.
- **Clé SSH** : le fichier `CLE_SSH` doit contenir la clé **publique** (une ligne qui commence par `ssh-ed25519`), pas la clé privée.
- **Rocky ne démarre pas** (redémarrage en boucle, « kernel panic ») : type de CPU. `qm config 212 | grep cpu` doit afficher `cpu: host`.
- **Pas d’adresse IP affichée** : l’agent invité n’est peut-être pas encore installé. Regarde la console de la VM, ou ton routeur (baux DHCP).
- **Accès Internet** : depuis la VM, `ping -c 2 1.1.1.1` (réseau) puis `getent hosts deb.debian.org` (DNS).

## Niveau 3

- Activer les snippets sur `local` en gardant les contenus habituels :
  `pvesm set local --content iso,vztmpl,backup,snippets`
- Corriger le CPU d’une VM existante : `qm set 212 --cpu host` puis `qm reboot 212`.
- Suivre cloud-init depuis la VM : `sudo cloud-init status --wait` puis `sudo tail -n 50 /var/log/cloud-init-output.log`.
- Installer l’agent à la main si besoin :
  `sudo apt install -y qemu-guest-agent` (Debian) ou `sudo dnf install -y qemu-guest-agent` (Rocky), puis `sudo systemctl enable --now qemu-guest-agent`.
- Le dépôt n’a pas été cloné (dépôt privé, pas d’Internet au premier démarrage) :
  `sudo git clone https://github.com/cemah2/How_Linux_Works.git /opt/how-linux-works && sudo ln -sf /opt/how-linux-works/infra/bin/lab /usr/local/bin/lab`
- Horloge non synchronisée : `timedatectl status` ; sur Debian, `sudo apt install -y systemd-timesyncd` ; sur Rocky, `sudo systemctl enable --now chronyd`.
