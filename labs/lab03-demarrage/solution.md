# Solution du Lab 03

## Ce que tu vois au redémarrage

Après quelques secondes, la console affiche :

```
[ TIME ] Timed out waiting for device dev-disk-by\x2duuid-…
[DEPEND] Dependency failed for srv-cave.mount - /srv/cave.
[DEPEND] Dependency failed for local-fs.target - Local File Systems.
You are in emergency mode. After logging in, type "journalctl -xb" to view
system logs, "systemctl reboot" to reboot, or "exit" to continue bootup.
Give root password for maintenance
(or press Control-D to continue):
```

systemd a attendu un disque (90 s par défaut), puis l’échec du montage a fait échouer `local-fs.target`, que
presque tout requiert : il bascule en **mode d’urgence**. Tape le mot de passe root.

## Chercher toutes les causes avant de redémarrer

```
# journalctl -xb -p err          # erreurs de ce démarrage
# cat /proc/cmdline              # paramètres reçus par le noyau
BOOT_IMAGE=/boot/vmlinuz-… root=… ro console=tty0 console=ttyS0,115200 systemd.unit=rescue.target
# systemctl get-default
rescue.target
# systemctl cat brassd collecte-capteurs
```

Quatre causes :

| # | Cause | Effet |
|---|---|---|
| 1 | Ligne fstab pour `/srv/cave`, disque absent, sans `nofail` | échec de `local-fs.target` → mode d’urgence |
| 2 | `systemd.unit=rescue.target` dans la configuration de GRUB | démarrage forcé en mode secours |
| 3 | `systemctl set-default rescue.target` | même effet, par systemd : il faut corriger les deux |
| 4a | `ExecStart=/usr/local/bin/brassd-v2` : programme inexistant | brassd en échec (203/EXEC) |
| 4b | Collecteur en `Type=oneshot` alors que c’est un démon | le démarrage attend 100 s, puis le service est tué |

## Corrections

Si `/` est en lecture seule : `mount -o remount,rw /`.

### 1. fstab

```
# vi /etc/fstab
#UUID=5b0e…  /srv/cave  ext4  defaults  0  2
# systemctl daemon-reload
# findmnt --verify
```

Commenter (ou supprimer) la ligne suffit. Si le disque doit revenir de temps en temps : `defaults,nofail`, et
éventuellement `x-systemd.device-timeout=5s` pour ne pas attendre 90 s.

### 2. Paramètre du noyau

Debian : la ligne a été ajoutée dans un fichier `.cfg` de `/etc/default/grub.d/` (lu par `update-grub` après
`/etc/default/grub`).

```
# grep -r systemd.unit /etc/default/
/etc/default/grub.d/99-maintenance.cfg:GRUB_CMDLINE_LINUX_DEFAULT="$GRUB_CMDLINE_LINUX_DEFAULT systemd.unit=rescue.target"
# rm /etc/default/grub.d/99-maintenance.cfg
# update-grub
```

Rocky : les entrées de démarrage sont au format BLS, gérées par `grubby`.

```
# grubby --info=ALL | grep args
# grubby --update-kernel=ALL --remove-args="systemd.unit=rescue.target"
```

Pour un dépannage ponctuel, on aurait pu aussi retirer le paramètre **une seule fois** en éditant l’entrée dans
le menu GRUB (touche `e`, fiche 5.3). Mais la configuration resterait fausse au démarrage suivant.

### 3. Cible par défaut

```
# systemctl set-default multi-user.target
```

### 4. Les services

```
# vi /etc/systemd/system/brassd.service
ExecStart=/usr/local/bin/brassd
# vi /etc/systemd/system/collecte-capteurs.service
Type=simple                      # et suppression de TimeoutStartSec=100
# systemctl daemon-reload
```

Pourquoi `Type=oneshot` posait problème : pour un service `oneshot`, systemd considère le démarrage terminé
quand le programme **se termine**. Le collecteur tourne en boucle : systemd attend, et comme `multi-user.target`
est ordonnée après lui (`Before=multi-user.target`), tout le démarrage attend. Au bout de `TimeoutStartSec`,
systemd le tue. Un démon qui reste au premier plan se déclare `Type=simple` (ou `exec`).

### Redémarrer

```
# systemctl reboot
```

Une fois revenu, par SSH :

```
$ systemd-analyze blame | head -5     # plus de service à 100 s
$ systemctl --failed                  # 0 loaded units listed
$ lab check 03
```

## Exemple de rapport

```
# Incident du 08/11 : serveur bloqué au démarrage

## Symptômes
- Après redémarrage : « emergency mode », pas de réseau ni de SSH, boutique arrêtée.

## Causes
1. fstab : /srv/cave montée depuis le disque USB de Bastien, débranché. Sans nofail, l’échec du montage
   fait échouer local-fs.target → mode d’urgence.
2. GRUB : systemd.unit=rescue.target ajouté dans /etc/default/grub.d/99-maintenance.cfg.
3. Cible par défaut changée en rescue.target.
4. brassd : ExecStart vers /usr/local/bin/brassd-v2, qui n’existe pas (203/EXEC).
5. Collecteur des capteurs : Type=oneshot pour un démon → démarrage retardé de 100 s, puis service tué.

## Corrections
Ligne fstab commentée ; fichier GRUB supprimé + update-grub ; set-default multi-user.target ;
ExecStart corrigé ; Type=simple. Redémarrage de contrôle OK.

## Prévention
- Disques amovibles : toujours nofail dans fstab, ou montage à la demande.
- Tester une modification de fstab avec findmnt --verify et mount -a avant de redémarrer.
- Pas de « maintenance » sans ticket ; instantané avant toute intervention.
```
