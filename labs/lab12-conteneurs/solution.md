# Solution du Lab 12

## 1. Une image précise et légère

```
$ sudo podman build -t localhost/hlw-vitrine:1.0 /srv/vitrine
Error: creating build container: short-name resolution enforced but cannot prompt without a TTY
```

`python` est un **nom court** : sur Rocky, Podman ne devine pas de quel registre il vient (Docker Hub ?
quay.io ? un registre piégé ?). Et `latest` change à chaque nouvelle version de Python : la vitrine pourrait
changer sans que personne ne le décide. Enfin `python:latest` pèse plus d’un gigaoctet.

`/srv/vitrine/Containerfile` :

```
FROM docker.io/library/python:3.13-alpine
WORKDIR /app
COPY vitrine.py /app/vitrine.py
EXPOSE 8000
CMD ["python3", "/app/vitrine.py"]
```

```
$ sudo podman build -t localhost/hlw-vitrine:1.0 /srv/vitrine
$ sudo podman images localhost/hlw-vitrine
REPOSITORY             TAG   IMAGE ID      CREATED        SIZE
localhost/hlw-vitrine  1.0   3c5d…         5 seconds ago  52.1 MB
```

Pour aller jusqu’au bout de la reproductibilité, on peut figer l’**empreinte** :
`FROM docker.io/library/python:3.13-alpine@sha256:…` (`podman image inspect --format '{{.Digest}}'`).

## 2. Léa sans root

```
$ sudo -iu lea podman info
WARN[0000] cannot find UID/GID mappings for user "lea": no subuid ranges found for user "lea" in /etc/subuid
```

En rootless, le root du conteneur est Léa elle-même, et les autres UID du conteneur (bin, nobody…) sont
pris dans une **plage subordonnée** que l’administrateur lui accorde dans `/etc/subuid` et `/etc/subgid`
(fiche 17.2). Il faut une plage libre, qui ne chevauche pas celles des autres :

```
$ cat /etc/subuid
hlw:100000:65536
$ sudo usermod --add-subuids 165536-231071 --add-subgids 165536-231071 lea
$ sudo -iu lea
lea$ podman system migrate              # relit les plages si Podman avait déjà tourné
lea$ podman unshare cat /proc/self/uid_map
         0       1002          1
         1     165536      65536
```

La première ligne : l’UID 0 du conteneur est l’UID 1002 (Léa) sur l’hôte ; la seconde : les UID 1 à 65536
du conteneur correspondent aux UID 165536 à 231071 de l’hôte, qui n’appartiennent à personne.

## 3 à 5. La vitrine sous Quadlet

`/etc/containers/systemd/vitrine.container` :

```
[Unit]
Description=Vitrine de la Brasserie du Noyau

[Container]
Image=localhost/hlw-vitrine:1.0
ContainerName=vitrine
PublishPort=8080:8000
Volume=/srv/vitrine/donnees:/donnees:Z
PodmanArgs=--memory=128m

[Service]
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```
$ sudo systemctl daemon-reload
$ systemctl cat vitrine.service | grep ExecStart      # la commande podman run générée
$ sudo systemctl start vitrine
$ curl -s http://127.0.0.1:8080/ | grep Brasserie
$ cat /srv/vitrine/donnees/visites.log
```

- `daemon-reload` lance le **générateur** Quadlet, qui écrit `/run/systemd/generator/vitrine.service` ; on ne
  fait pas `systemctl enable` (unité générée) : c’est `[Install]` qui crée le lien de démarrage.
- `:Z` réétiquette `/srv/vitrine/donnees` pour SELinux (`container_file_t`). Sans lui, sur fut, la vitrine
  répond 500 et `ausearch -m avc -ts recent` montre le refus. `ls -Z /srv/vitrine/donnees` pour voir
  l’étiquette.
- `PodmanArgs=--memory=128m` pose la limite sur le cgroup du conteneur. `MemoryMax=128M` dans `[Service]`
  marcherait aussi, mais limiterait tout le service (conmon compris).

## 6. Sous le capot

```
$ P=$(sudo podman inspect vitrine --format '{{.State.Pid}}'); echo $P
24817
$ ps -o pid,user,cmd -p $P
  PID USER  CMD
24817 root  python3 /app/vitrine.py
$ sudo readlink /proc/$P/ns/pid /proc/$P/ns/net
pid:[4026532456]
net:[4026532459]
$ readlink /proc/self/ns/pid                 # comparer avec ton propre shell
pid:[4026531836]
$ cat /proc/$P/cgroup
0::/system.slice/vitrine.service/libpod-payload-9f1c…
$ cat /sys/fs/cgroup/system.slice/vitrine.service/libpod-payload-9f1c…/memory.max
134217728
```

(Si `memory.max` affiche `max` dans le cgroup du processus, la limite est posée sur un cgroup parent :
remonte d’un répertoire.)

`/root/lab12-sous-le-capot.txt` :

```
PID_HOTE=24817
NS_PID=pid:[4026532456]
NS_NET=net:[4026532459]
MEMOIRE_MAX=134217728
```

Vu de l’hôte, la vitrine est un processus **ordinaire** : il a un PID sur fut, il est dans un cgroup sous
`vitrine.service`, et ses espaces de noms diffèrent de ceux de ton shell. C’est tout ce qu’est un conteneur.

## 7. La racine Alpine

```
$ sudo mkdir -p /srv/mini/rootfs
$ sudo podman create --name mini localhost/hlw-vitrine:1.0
$ sudo podman export mini | sudo tar -x -C /srv/mini/rootfs
$ sudo podman rm mini
$ cat /srv/mini/rootfs/etc/os-release | head -2
```

`podman export` aplatit toutes les couches de l’overlay en un seul système de fichiers.

## 8 et 9. Le mini-conteneur

`/usr/local/sbin/mini-conteneur` :

```bash
#!/bin/bash
# mini-conteneur : lance une commande dans /srv/mini/rootfs, isolée par des espaces de noms
# (PID, montages, UTS, réseau, IPC) et limitée à 64 Mo de mémoire par un cgroup.
# Usage : mini-conteneur COMMANDE [ARGUMENTS…]
set -euo pipefail
RACINE=/srv/mini/rootfs

[[ $# -ge 1 ]] || { echo "usage : mini-conteneur COMMANDE [ARGUMENTS…]" >&2; exit 2; }
[[ -d $RACINE ]] || { echo "mini-conteneur : $RACINE introuvable" >&2; exit 1; }

# systemd-run --scope : place la commande dans un cgroup temporaire avec MemoryMax ;
#   --expand-environment=no : sinon systemd-run remplace lui-même les $VARIABLES (et $$) des arguments.
# unshare : nouveaux espaces de noms ; --fork pour que la commande soit le PID 1 du nouvel espace PID ;
#           --root fait le chroot ; --mount-proc remonte /proc pour que ps et $$ voient le nouvel espace.
# sh -c : fixe le nom d'hôte dans le nouvel espace UTS, puis se remplace par la commande demandée.
exec systemd-run --quiet --scope --expand-environment=no -p MemoryMax=64M -- \
  unshare --pid --fork --mount --uts --net --ipc --root="$RACINE" --mount-proc \
  /bin/sh -c 'hostname mini && exec "$@"' mini-conteneur "$@"
```

```
$ sudo chmod 755 /usr/local/sbin/mini-conteneur
$ sudo mini-conteneur /bin/sh -c 'echo PID $$ sur $(hostname); cat /etc/os-release | head -1; ip link 2>/dev/null || cat /proc/net/dev'
PID 1 sur mini
NAME="Alpine Linux"
…  lo: …
$ hostname          # fut, inchangé
$ sudo mini-conteneur /bin/sh -c 'cat /proc/self/cgroup; cat /sys/fs/cgroup/memory.max 2>/dev/null'
```

| Demande | Moyen |
|---|---|
| racine Alpine | `--root` (chroot) |
| PID 1 | `--pid --fork` ; `--mount-proc` pour que `ps` et `$$` voient le nouvel espace |
| nom d’hôte `mini` | `--uts`, puis `hostname mini` **dans** l’espace |
| seulement `lo` | `--net` (un espace réseau neuf ne contient que `lo`, éteinte) |
| montages privés | `--mount` (le `/proc` remonté ne touche pas l’hôte) |
| 64 Mo | `systemd-run --scope -p MemoryMax=64M` : un cgroup temporaire ; `--expand-environment=no` pour qu’il ne touche pas aux `$` des arguments |

Il manque encore beaucoup à ce « conteneur » pour être sûr : un espace **utilisateur** (ici, le root du
mini-conteneur est le vrai root), des capacités réduites, un `/dev` minimal, `pivot_root` au lieu de
`chroot`… C’est le travail de runc ou crun, que Podman appelle pour toi. Le module A4 va plus loin.

## 10. Le ménage

```
$ sudo podman ps -a
$ sudo podman rm essai-malik essai-malik-2
$ sudo podman images
$ sudo podman rmi localhost/essai-malik
$ sudo podman image prune          # images <none>
$ sudo podman system df
```
