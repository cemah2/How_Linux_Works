# Indices du Lab 02

## Niveau 1

1. **Disques** : quels disques n’ont ni partition ni point de montage ? `lsblk` répond (fiche 3.4).
   LVM travaille en trois étages : volumes physiques, groupe, volumes logiques (fiche 4.9).
2. **lv_boutique** : un volume logique est un périphérique bloc comme un autre. Il lui faut un système de fichiers,
   puis un point de montage (fiches 4.5 et 4.6).
3. **lv_archives** : les trois interdictions du ticket correspondent à trois options de montage (fiche 4.6).
4. **Swap** : comme pour un système de fichiers, il faut « formater » puis activer (fiche 4.8).
5. **fstab** : quel identifiant ne change pas quand on ajoute un disque ? `blkid` le donne (fiche 4.6).
6. **Migration** : une copie ordinaire perd-elle les propriétaires ? Les fichiers cachés ? Compare `ls -la` des deux côtés.
7. **Étiquettes** : chaque type de système de fichiers a son outil pour changer l’étiquette (ou une option de `mkfs`).
8. **Agrandir** : agrandir le volume ne suffit pas : `df -h` voit-il la nouvelle taille ? (fiche 4.11)
9. **Capteurs** : « plus de place », mais il reste des blocs libres. Qu’est-ce qui peut manquer d’autre dans
   un système de fichiers ? (fiche 4.12)

## Niveau 2

1. `pvcreate` sur les deux disques entiers (pas besoin de partitions), puis `vgcreate vg_donnees disque1 disque2`.
2. `lvcreate -n NOM -L TAILLE vg_donnees`, puis `mkfs.ext4`, `mkdir`, `mount`.
3. `mkfs.xfs`, puis montage avec `-o nodev,nosuid,noexec`. Vérifie avec `findmnt /srv/archives`.
4. `lvcreate` de 256M, `mkswap`, `swapon`. Contrôle : `swapon --show` ou `free -h`.
5. Dans fstab, désigne les volumes par `UUID=…` ou par `/dev/vg_donnees/lv_…` (le chemin LVM est stable lui aussi).
   Les options de `lv_archives` doivent figurer **dans fstab**, sinon elles disparaissent au redémarrage.
   Pour le swap : point de montage `none`, type `swap`, options `sw`.
6. `cp -a ancien/. nouveau/` (le `/.` copie aussi les fichiers cachés) ou `rsync -a ancien/ nouveau/`.
7. `e2label` pour ext4, `xfs_admin -L` pour XFS (volume démonté), ou `mkfs … -L étiquette` à la création.
8. `lvextend` a une option qui agrandit aussi le système de fichiers. ext4 s’agrandit monté.
9. `df -i /srv/capteurs`. Qu’y a-t-il dans `/srv/capteurs/tmp` ? Combien de fichiers ?

## Niveau 3

1. ```
   lsblk -o NAME,SIZE,TYPE,MOUNTPOINTS      # repère les deux disques de 2 Go, par exemple sdb et sdc
   sudo pvcreate /dev/sdb /dev/sdc
   sudo vgcreate vg_donnees /dev/sdb /dev/sdc
   ```
2. ```
   sudo lvcreate -n lv_boutique -L 1G vg_donnees
   sudo mkfs.ext4 -L boutique /dev/vg_donnees/lv_boutique
   sudo mkdir -p /srv/boutique
   ```
3. ```
   sudo lvcreate -n lv_archives -L 1G vg_donnees
   sudo mkfs.xfs -L archives /dev/vg_donnees/lv_archives
   sudo mkdir -p /srv/archives
   ```
4. ```
   sudo lvcreate -n lv_swap -L 256M vg_donnees
   sudo mkswap /dev/vg_donnees/lv_swap
   ```
5. ```
   sudo blkid /dev/vg_donnees/lv_boutique /dev/vg_donnees/lv_swap   # pour les UUID
   sudo vi /etc/fstab
   UUID=…                        /srv/boutique  ext4  defaults                       0 2
   /dev/vg_donnees/lv_archives   /srv/archives  xfs   defaults,nodev,nosuid,noexec   0 2
   UUID=…                        none           swap  sw                             0 0
   sudo systemctl daemon-reload ; sudo findmnt --verify ; sudo mount -a ; sudo swapon -a
   ```
6. `sudo cp -a /srv/boutique-ancien/. /srv/boutique/` (après le montage, sinon tu copies sous le point de montage !)
7. Déjà fait avec `-L` à l’étape 2 ? Sinon : `sudo e2label /dev/vg_donnees/lv_boutique boutique`,
   et pour XFS : `sudo umount /srv/archives ; sudo xfs_admin -L archives /dev/vg_donnees/lv_archives ; sudo mount /srv/archives`.
8. `sudo lvextend -r -L 1.5G vg_donnees/lv_boutique` (ou `-L +512M`), puis `df -h /srv/boutique`.
9. `sudo find /srv/capteurs/tmp -name '*.tmp' -delete`, puis `df -i /srv/capteurs`.
