# Solution du Lab 02

Les noms `sdb` et `sdc` sont des exemples : chez toi, les disques peuvent s’appeler autrement. Vérifie toujours avec `lsblk`.

## 0. Repérer les disques

```
$ lsblk -o NAME,SIZE,TYPE,SERIAL,MOUNTPOINTS
NAME    SIZE TYPE SERIAL    MOUNTPOINTS
sda      20G disk
├─sda1 19.9G part           /
…
sdb       2G disk hlw-lab-1
sdc       2G disk hlw-lab-2
```

`sda` porte `/` : on n’y touche pas. Les numéros de série `hlw-lab-N` ont été posés par `ajouter-disques.sh`.

## 1. Volumes physiques et groupe

```
$ sudo pvcreate /dev/sdb /dev/sdc
$ sudo vgcreate vg_donnees /dev/sdb /dev/sdc
$ sudo vgs
  VG         #PV #LV #SN Attr   VSize VFree
  vg_donnees   2   0   0 wz--n- 3.99g 3.99g
```

Utiliser les disques entiers est courant avec LVM. Créer d’abord une partition de type « Linux LVM » est tout
aussi valable (et rend le rôle du disque évident pour un autre outil) : le correcteur accepte les deux.

## 2 à 4. Volumes logiques, systèmes de fichiers, swap

```
$ sudo lvcreate -n lv_boutique -L 1G   vg_donnees
$ sudo lvcreate -n lv_archives -L 1G   vg_donnees
$ sudo lvcreate -n lv_swap     -L 256M vg_donnees
$ sudo mkfs.ext4 -L boutique /dev/vg_donnees/lv_boutique
$ sudo mkfs.xfs  -L archives /dev/vg_donnees/lv_archives
$ sudo mkswap -L swap-donnees /dev/vg_donnees/lv_swap
$ sudo mkdir -p /srv/boutique /srv/archives
```

L’option `-L` de `mkfs` pose l’étiquette dès la création (objectif 7). Après coup : `e2label` (ext4, même monté)
et `xfs_admin -L` (XFS, démonté).

## 5. fstab

```
$ sudo blkid /dev/vg_donnees/lv_boutique /dev/vg_donnees/lv_swap
/dev/vg_donnees/lv_boutique: LABEL="boutique" UUID="3f0c…" TYPE="ext4"
/dev/vg_donnees/lv_swap: LABEL="swap-donnees" UUID="9a71…" TYPE="swap"
$ sudo vi /etc/fstab
```

```
# Lab 02 : volumes de la boutique
UUID=3f0c…                    /srv/boutique  ext4  defaults                       0  2
/dev/vg_donnees/lv_archives   /srv/archives  xfs   defaults,nodev,nosuid,noexec   0  2
UUID=9a71…                    none           swap  sw                             0  0
```

Deux façons stables de désigner un volume : l’**UUID** (ou l’étiquette `LABEL=`) et le **chemin LVM**
`/dev/vg_donnees/lv_…` (ou `/dev/mapper/vg_donnees-lv_…`), qui dépend du nom du groupe et du volume, pas de
l’ordre de détection des disques. En revanche, `/dev/sdb` ou `/dev/dm-3` peuvent changer.

Tester **avant** de redémarrer :

```
$ sudo systemctl daemon-reload      # systemd génère ses unités .mount à partir de fstab
$ sudo findmnt --verify
$ sudo mount -a && sudo swapon -a
$ findmnt /srv/archives
TARGET        SOURCE                              FSTYPE OPTIONS
/srv/archives /dev/mapper/vg_donnees-lv_archives  xfs    rw,nosuid,nodev,noexec,relatime,…
$ swapon --show
```

**Piège 1** : les options `nodev,nosuid,noexec` passées seulement à la main (`mount -o …`) disparaissent au
redémarrage. Elles doivent être dans fstab.

## 6. Migration

```
$ sudo cp -a /srv/boutique-ancien/. /srv/boutique/
```

- `-a` conserve propriétaires, groupes, droits, dates et liens symboliques (sans `-a`, tout appartiendrait à root).
- `ancien/.` copie le **contenu**, fichiers cachés compris (`.version`). Avec `ancien/*`, le joker les oublie (**piège 2**).
- Équivalent : `sudo rsync -a /srv/boutique-ancien/ /srv/boutique/` (barre finale importante).

**Piège 3** : copier **avant** de monter. Les fichiers atterrissent dans le répertoire `/srv/boutique` du disque
système, puis sont masqués par le montage. Ils semblent disparus, et occupent toujours de la place.

Vérification : `sudo diff -r /srv/boutique-ancien /srv/boutique` (seul `lost+found` diffère). Une fois sûr de toi,
tu peux supprimer l’ancien répertoire (le correcteur ne l’exige pas).

## 8. Agrandir sans démonter

```
$ sudo lvextend -r -L 1.5G vg_donnees/lv_boutique
$ df -h /srv/boutique
```

`-r` (`--resizefs`) enchaîne `resize2fs` (ext4) ou `xfs_growfs` (XFS). Sans lui, le volume grandit mais le système
de fichiers garde sa taille : `lvs` dit 1,5 Gio, `df` dit toujours 1 Gio (**piège 4**). Rattrapage :
`sudo resize2fs /dev/vg_donnees/lv_boutique`.

## Les capteurs

```
$ df -h /srv/capteurs
Filesystem  Size  Used Avail Use% Mounted on
/dev/loop0   58M  1.6M   52M   3% /srv/capteurs
$ df -i /srv/capteurs
Filesystem  Inodes IUsed IFree IUse% Mounted on
/dev/loop0    1024  1024     0  100% /srv/capteurs
$ ls /srv/capteurs/tmp | wc -l
1008
$ sudo find /srv/capteurs/tmp -name '*.tmp' -delete
```

Chaque fichier, même vide, consomme un **inode**. Un système de fichiers peut donc être « plein » avec des
blocs libres. Le nombre d’inodes d’ext4 est fixé à la création (`mkfs.ext4 -N` ou `-i`). La vraie correction,
côté application : que le collecteur nettoie ses fichiers temporaires (on verra les timers au Lab 04).

## Pour finir

```
$ sudo reboot
… (reconnexion)
$ lab check 02
```

Tout doit rester vert après le redémarrage : c’est la preuve que fstab est correct.
