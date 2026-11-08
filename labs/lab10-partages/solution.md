# Solution du Lab 10

## 1. NFS

Sur **cuve** :

```
$ sudo apt install nfs-kernel-server
$ echo '/srv/partages/commun 192.168.50.0/24(rw,sync,root_squash)' | sudo tee /etc/exports.d/brasserie.exports
$ sudo exportfs -ra
$ sudo systemctl enable --now nfs-server
$ sudo exportfs -v
/srv/partages/commun  192.168.50.0/24(sync,wdelay,hide,no_subtree_check,sec=sys,rw,secure,root_squash,no_all_squash)
```

Sur le **comptoir** :

```
$ sudo mkdir -p /mnt/commun
$ echo 'cuve.brasserie.lan:/srv/partages/commun  /mnt/commun  nfs  defaults,_netdev,nofail  0 0' | sudo tee -a /etc/fstab
$ sudo systemctl daemon-reload
$ sudo mount /mnt/commun
$ findmnt /mnt/commun
TARGET      SOURCE                                    FSTYPE OPTIONS
/mnt/commun cuve.brasserie.lan:/srv/partages/commun   nfs4   rw,relatime,vers=4.2,…
```

**Piège 1 : les UID.** Depuis le comptoir, `sudo -u bastien touch /mnt/commun/bonjour-de-bastien.txt` donne
« Permission denied », ou crée un fichier qui, sur cuve, appartient à quelqu’un d’autre. NFS transmet l’**UID** :

```
cuve$     id -u bastien        → 1001
comptoir$ id -u bastien        → 1002
```

Sur cuve, 1002 n’est pas Bastien (c’est peut-être Malik, ou personne). On aligne le comptoir :

```
comptoir$ sudo usermod -u 1001 bastien
comptoir$ sudo find / -xdev -user 1002 -exec chown -h bastien {} +     # ses fichiers hors du répertoire personnel
comptoir$ sudo -u bastien touch /mnt/commun/bonjour-de-bastien.txt
cuve$     ls -l /srv/partages/commun/bonjour-de-bastien.txt
-rw-r--r-- 1 bastien personnel 0 nov.  8 22:10 bonjour-de-bastien.txt
```

(`usermod -u` met à jour le répertoire personnel, pas les fichiers ailleurs : d’où le `find`.) En production, on
évite ce problème avec un annuaire commun (LDAP, FreeIPA) ou NFSv4 avec Kerberos.

`root_squash` : root sur le comptoir devient `nobody` sur cuve. `sudo touch /mnt/commun/x` échoue : c’est voulu.

## 2. Samba

Sur **cuve** : `sudo apt install samba`, puis dans `/etc/samba/smb.conf` :

```
[global]
   …                                   (lignes existantes)
   server min protocol = SMB3
   hosts allow = 192.168.50.0/24 127.0.0.1

[boutique]
   comment = Dossier de la boutique
   path = /srv/partages/boutique
   valid users = @boutique
   read only = no
   create mask = 0660
   directory mask = 2770
```

```
$ testparm -s | sed -n '/\[boutique\]/,$p'
$ sudo smbpasswd -a malik
$ sudo systemctl enable --now smbd
$ sudo systemctl restart smbd
$ smbclient -L //localhost -U malik
```

Sur le **comptoir** :

```
$ sudo install -m 600 /dev/null /root/.smb-boutique
$ sudo vi /root/.smb-boutique
username=malik
password=…
$ sudo mkdir -p /mnt/boutique
$ echo '//cuve.brasserie.lan/boutique  /mnt/boutique  cifs  credentials=/root/.smb-boutique,uid=malik,gid=boutique,_netdev,nofail  0 0' | sudo tee -a /etc/fstab
$ sudo systemctl daemon-reload && sudo mount /mnt/boutique
$ sudo -u malik touch /mnt/boutique/essai && ls -l /mnt/boutique
```

**Piège 2** : sans `uid=malik,gid=boutique`, le montage appartient à root sur le comptoir : Malik ne peut rien y écrire
localement, même si Samba l’y autorise. **Piège 3** : `password=` dans fstab, lisible par tous (fstab est en 644).

## 3. SSHFS

Sur le **comptoir**, en tant que Bastien (sa clé et son `~/.ssh/config` viennent du Lab 08) :

```
$ sudo -iu bastien
bastien$ mkdir -p ~/archives-cuve
bastien$ sshfs cuve:/srv/archives ~/archives-cuve
bastien$ ls ~/archives-cuve
bilan-2023.txt  bilan-2024.txt  bilan-2025.txt
```

Démontage : `fusermount3 -u ~/archives-cuve`.

## 4. Sauvegarde

Sur **cuve**, une clé sans phrase de passe (le timer tourne sans personne pour la taper) :

```
$ sudo ssh-keygen -t ed25519 -N '' -C sauvegarde@cuve -f /root/.ssh/sauvegarde
$ sudo cat /root/.ssh/sauvegarde.pub
```

Sur **douane** :

```
$ sudo useradd -m -s /bin/bash sauvegarde          # pas de mot de passe : compte inaccessible autrement
$ sudo install -d -m 700 -o sauvegarde -g sauvegarde /srv/sauvegardes /srv/sauvegardes/cuve
$ sudo install -d -m 700 -o sauvegarde -g sauvegarde ~sauvegarde/.ssh
$ command -v rrsync                                 # fourni par le paquet rsync
/usr/bin/rrsync
$ echo 'restrict,command="rrsync /srv/sauvegardes/cuve" ssh-ed25519 AAAA… sauvegarde@cuve' \
    | sudo tee ~sauvegarde/.ssh/authorized_keys
$ sudo chown sauvegarde: ~sauvegarde/.ssh/authorized_keys && sudo chmod 600 ~sauvegarde/.ssh/authorized_keys
```

`restrict` coupe tout (pas de shell, pas de tunnel, pas de redirection) ; `command=` impose `rrsync`, qui n’accepte
que rsync, dans `/srv/sauvegardes/cuve` seulement. Si la clé de cuve est volée, l’attaquant ne peut que réécrire
la sauvegarde… ce qui reste un risque : une vraie politique garde aussi des copies que la machine sauvegardée ne
peut pas effacer.

De retour sur **cuve**, la simulation, puis les unités :

```
$ sudo rsync -anv --delete --exclude='*.tmp' -e "ssh -i /root/.ssh/sauvegarde" /srv/recettes/ sauvegarde@douane.brasserie.lan:recettes/
```

`/etc/systemd/system/sauvegarde-recettes.service` :

```
[Unit]
Description=Sauvegarde des recettes vers douane
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/rsync -a --delete --exclude=*.tmp -e "ssh -i /root/.ssh/sauvegarde -o StrictHostKeyChecking=accept-new" /srv/recettes/ sauvegarde@douane.brasserie.lan:recettes/
```

`/etc/systemd/system/sauvegarde-recettes.timer` :

```
[Unit]
Description=Sauvegarde des recettes chaque nuit à 1 h

[Timer]
OnCalendar=*-*-* 01:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```
$ sudo systemctl daemon-reload
$ sudo systemctl enable --now sauvegarde-recettes.timer
$ sudo systemctl start sauvegarde-recettes.service
$ journalctl -u sauvegarde-recettes -n 5
```

**Piège 4** : sans `StrictHostKeyChecking=accept-new` (ou une première connexion manuelle), le service échoue avec
« Host key verification failed » : en tâche de fond, personne ne peut répondre « yes » à la question de la clé d’hôte.

Vérification sur **douane** :

```
$ sudo find /srv/sauvegardes/cuve | head
$ sudo find /srv/sauvegardes/cuve -name '*.tmp'      # rien
```

## Pour finir

`lab check 10` sur les trois machines. Puis un vrai test de restauration : supprime une recette sur cuve, récupère-la
depuis douane, et demande-toi ce qui se serait passé si la sauvegarde avait tourné entre-temps (fiche 12.2).
