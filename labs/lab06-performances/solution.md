# Solution du Lab 06

## La démarche

Du général au particulier : **charge** → **quelle ressource** → **quel processus** → **action proportionnée**.

```
$ uptime
 10:12:01 up 2:03,  1 user,  load average: 2.31, 2.05, 1.40
$ nproc
2
$ vmstat 2
procs -----------memory---------- ---swap-- -----io---- -system-- -------cpu-------
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st gu
 1  1      0 931204  10240 402116    0    0     0 24576  610  480 52  3 15 30  0  0
```

- Charge ≈ nombre de cœurs : processeur bien occupé.
- `us` à 50 % : un cœur sur deux à plein régime, en espace utilisateur.
- `bo` élevé et `wa` à 30 % : beaucoup d’écritures, le processeur attend le disque.

## 1. L’historique : sysstat

Debian :

```
$ sudo apt install sysstat
$ sudo sed -i 's/^ENABLED=.*/ENABLED="true"/' /etc/default/sysstat     # ou : sudo dpkg-reconfigure sysstat
```

Rocky :

```
$ sudo dnf install sysstat
$ sudo systemctl enable --now sysstat
```

La collecte (`sa1`, toutes les 10 minutes) remplit `/var/log/sysstat/` (Debian) ou `/var/log/sa/` (Rocky).
Demain : `sar -u` (processeur), `sar -r` (mémoire), `sar -d` (disques) pour la journée, `sar -u -s 03:00:00 -e 04:00:00`
pour une plage.

## 2. Le processeur : calcul-stocks

```
$ top -o %CPU
    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
   4120 malik     20   0    7444   3584   3200 R  99.7   0.2  12:31.07 calcul-stocks
$ sudo renice -n 19 -p 4120
4120 (process ID) old priority 0, new priority 19
```

Le calcul continue, mais l’ordonnanceur ne lui donne le processeur que lorsque personne d’autre n’en veut.
**Piège 1** : `kill` aurait « réglé » le problème… en violant la contrainte de Malik.

## 3. Le disque : sauvegarde-nuit

```
$ sudo iotop -o -b -n 1
  TID  PRIO  USER   DISK READ  DISK WRITE  COMMAND
 5321 be/4 root    0.00 B/s   48.00 M/s  dd if=/dev/zero of=/var/tmp/sauvegarde-nuit.img bs=1M count=48 …
$ pidstat -d 1 3                      # même information, avec sysstat
$ ps -o pid,ppid,cmd -p 5321
    PID    PPID CMD
   5321    4133 dd if=/dev/zero of=/var/tmp/sauvegarde-nuit.img …
$ ps -o pid,cmd -p 4133
   4133 /bin/bash /usr/local/lib/hlw/sauvegarde-nuit
$ sudo ionice -c 3 -p 4133
$ ionice -p 4133
idle
```

**Piège 2** : le `dd` vit quelques secondes, un autre le remplace aussitôt. Changer la classe du `dd` en cours ne
sert à rien : il faut viser le **parent**, dont les prochains `dd` hériteront. `ionice -c 3` (idle) : le
processus n’accède au disque que lorsque personne d’autre ne s’en sert.

## 4. La mémoire : catalogue-cache

```
$ free -h
$ top -o %MEM
    PID USER      … RES … COMMAND
   3990 catalog+  … 401m … catalogue-cache
$ systemctl status 3990
● catalogue-cache.service - Cache mémoire du catalogue de la boutique
     Memory: 402.1M
$ sudo systemctl set-property catalogue-cache.service MemoryMax=150M
$ sleep 10 ; systemctl status catalogue-cache | grep Memory
     Memory: 120.4M (max: 150.0M …)
```

`set-property` écrit une surcharge dans `/etc/systemd/system.control/catalogue-cache.service.d/` et règle
aussitôt `memory.max` du cgroup. Le programme relit cette limite et s’y adapte. Un programme qui ne s’adapte pas
serait tué par l’OOM killer du cgroup, puis relancé par systemd (`Restart=always`).

## 5. L’espace disque fantôme : capteurs-brut

```
$ df -h /var
$ sudo du -sh /var/log/capteurs
12K     /var/log/capteurs
$ sudo lsof +L1
COMMAND    PID USER FD TYPE DEVICE  SIZE/OFF NLINK  NODE NAME
journal-c 3995 root 1w  REG    8,1 268436224     0 13110 /var/log/capteurs/brut.log (deleted)
$ systemctl status 3995 | head -1
● capteurs-brut.service - Journal brut des capteurs de cuve
$ sudo systemctl restart capteurs-brut
$ df -h /var                           # les 256 Mo sont revenus
```

**Piège 3** : `rm` retire le **nom**, pas l’inode. Tant qu’un processus le garde ouvert, l’espace reste occupé et
`du` (qui parcourt les noms) ne le voit plus, alors que `df` (qui interroge le système de fichiers) le compte
toujours. Redémarrer le service ferme l’ancien fichier ; il en crée un nouveau. Pour vider un journal sans
redémarrer : `truncate -s 0 fichier` **avant** de le supprimer, ou `: > /proc/PID/fd/1` après.

## 6. Le diagnostic

```
Diagnostic du 08/11, serveur lent

Constat : charge 2,3 sur 2 cœurs ; vmstat : us 50 %, wa 30 %, bo 24 Mo/s ; df : 256 Mo perdus sur /var.

1. Processeur : calcul-stocks (malik), 100 % d’un cœur (top). → renice 19 : il finit, sans gêner.
2. Disque : sauvegarde-nuit lance des dd en boucle, 48 Mo/s (iotop, pidstat -d). → ionice -c3 sur le parent.
3. Mémoire : catalogue-cache.service, 400 Mo (top, systemctl status). → set-property MemoryMax=150M.
4. Espace : capteurs-brut.service gardait ouvert brut.log supprimé par Bastien (lsof +L1). → restart.

Prévention : sysstat installé (sar) ; logrotate pour les capteurs ; ne jamais supprimer un journal ouvert.
```
