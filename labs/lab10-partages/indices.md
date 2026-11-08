# Indices du Lab 10

## Niveau 1

1. **NFS côté cuve** : où déclare-t-on un export, et avec quelles options pour « réseau interne, écriture, root
   sans privilège » (fiche 12.6) ? Attention à la syntaxe.
2. **NFS côté comptoir** : quelle ligne de fstab, avec quelles options pour ne pas bloquer le démarrage ?
3. **Le fichier de Bastien** : NFS transmet des numéros, pas des noms. Compare `id bastien` sur les deux machines.
4. **Samba** : un partage = une section de `smb.conf`. Les réglages SMB3 et réseau autorisé vont dans `[global]`.
   Malik a besoin d’un mot de passe **Samba** (fiche 12.4).
5. **CIFS** : comment éviter le mot de passe dans fstab (fiche 12.5) ? Comment faire apparaître les fichiers comme
   appartenant à Malik sur le comptoir ?
6. **SSHFS** : c’est Bastien qui monte, pas root. Sa clé et son `~/.ssh/config` du Lab 08 servent ici.
7. **Sauvegarde** : un compte sur douane, une clé sans phrase de passe sur cuve (le timer tourne sans personne),
   une commande rsync, puis un service et un timer (fiche 7.7).
8. **Une clé qui ne sert qu’à ça** : `authorized_keys` accepte des options devant la clé.

## Niveau 2

1. `/etc/exports.d/brasserie.exports` : `/srv/partages/commun 192.168.50.0/24(rw,sync,root_squash)` (sans espace
   avant la parenthèse), puis `exportfs -ra` et `systemctl enable --now nfs-server`.
2. `cuve.brasserie.lan:/srv/partages/commun  /mnt/commun  nfs  defaults,_netdev,nofail  0 0`, puis `mount /mnt/commun`.
3. Si les UID diffèrent, aligne celui du comptoir sur celui de cuve : `usermod -u UID bastien` (session fermée), puis
   `find / -xdev -user ANCIEN_UID -exec chown bastien {} +`. Ensuite, sur le comptoir : `sudo -u bastien touch
   /mnt/commun/bonjour-de-bastien.txt`.
4. `[global]` : `server min protocol = SMB3`, `hosts allow = 192.168.50.0/24 127.0.0.1`. `[boutique]` : `path`,
   `valid users = @boutique`, `read only = no`, `create mask = 0660`, `directory mask = 2770`. Puis `testparm`,
   `smbpasswd -a malik`, `systemctl enable --now smbd`, et `systemctl restart smbd` après chaque modification.
5. `/root/.smb-boutique` (600) avec `username=` et `password=`. Options de montage :
   `credentials=/root/.smb-boutique,uid=malik,gid=boutique,_netdev,nofail`.
6. `sudo -iu bastien`, `mkdir ~/archives-cuve`, `sshfs cuve:/srv/archives ~/archives-cuve`.
7. Sur cuve : `ssh-keygen -t ed25519 -N '' -f /root/.ssh/sauvegarde`. Sur douane : `useradd -m -s /bin/bash
   sauvegarde`, la clé publique dans `~sauvegarde/.ssh/authorized_keys`. La commande :
   `rsync -a --delete --exclude='*.tmp' -e "ssh -i /root/.ssh/sauvegarde" /srv/recettes/ sauvegarde@douane.brasserie.lan:…`
8. `restrict,command="rrsync /srv/sauvegardes/cuve" ssh-ed25519 AAAA…` : la clé ne peut lancer que rsync, et
   seulement dans ce répertoire. La destination devient alors relative : `sauvegarde@douane.brasserie.lan:recettes/`.

## Niveau 3

1. et 2. Voir la solution, sections NFS.
3. ```
   cuve$ id bastien             # uid=1001(bastien)
   comptoir$ id bastien         # uid=1002(bastien) : différent !
   comptoir$ sudo usermod -u 1001 bastien
   ```
4. Le bloc `[boutique]` complet est dans la solution.
5. `sudo mount /mnt/boutique` puis `sudo -u malik touch /mnt/boutique/essai`.
6. `sudo -iu bastien sshfs cuve:/srv/archives ~/archives-cuve` (après `mkdir`).
7. et 8. Le service :
   ```
   [Service]
   Type=oneshot
   ExecStart=/usr/bin/rsync -a --delete --exclude=*.tmp -e "ssh -i /root/.ssh/sauvegarde -o StrictHostKeyChecking=accept-new" /srv/recettes/ sauvegarde@douane.brasserie.lan:recettes/
   ```
   Le timer : `OnCalendar=*-*-* 01:00:00`, `Persistent=true`, `WantedBy=timers.target`.
   `systemctl enable --now sauvegarde-recettes.timer && systemctl start sauvegarde-recettes.service`.
