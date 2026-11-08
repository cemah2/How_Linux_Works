# Indices du Lab 12

## Niveau 1

1. **L’image** : lance `podman build -t localhost/hlw-vitrine:1.0 /srv/vitrine` et lis l’erreur. Que
   signifie « short-name » ? Quels sont les deux défauts de `python:latest` pour la production (fiche 17.5) ?
   Et sa taille ?
2. **Léa** : `sudo -iu lea` puis `podman info`. Où Podman cherche-t-il les plages d’identifiants d’un
   utilisateur (fiche 17.2) ?
3. **Quadlet** : un fichier `.container` dans `/etc/containers/systemd/`, avec des sections `[Container]`,
   `[Service]` et `[Install]` (fiche 17.A).
4. **Le port, le volume** : quelles clés de `[Container]` publient un port et montent un répertoire ? Sur fut,
   pourquoi un volume peut-il être illisible alors que les droits Unix sont bons ?
5. **La mémoire** : une option de `podman run` limite la mémoire ; comment la passer depuis Quadlet ?
6. **Le rapport** : `podman inspect` donne le PID ; `/proc/PID/ns/` les espaces de noms ; `/proc/PID/cgroup`
   le cgroup (fiches 8.7 et 17.2).
7. **La racine Alpine** : Podman sait **exporter** le système de fichiers d’un conteneur sous forme
   d’archive tar.
8. **mini-conteneur** : une seule commande de util-linux crée tous les espaces de noms demandés, change de
   racine et remonte `/proc` (`man unshare`). Pour le nom d’hôte, il faut une commande **dans** le nouvel
   espace UTS.
9. **La mémoire du mini-conteneur** : systemd sait lancer une commande dans un cgroup temporaire, avec des
   propriétés comme `MemoryMax` (`man systemd-run`).
10. **Le ménage** : `podman ps -a`, `podman images` ; un conteneur arrêté empêche de supprimer son image.

## Niveau 2

1. Sur Rocky, un nom court comme `python` est ambigu (quel registre ?) : Podman refuse ou demande, et ne peut
   pas demander sans terminal. Écris `FROM docker.io/library/python:3.13-alpine` : registre complet, version
   figée, environ 50 Mo au lieu de plus de 1 Go.
2. `/etc/subuid` et `/etc/subgid` (une ligne `lea:DÉBUT:65536`). Choisis une plage libre (après les autres
   lignes), par exemple `sudo usermod --add-subuids 300000-365535 --add-subgids 300000-365535 lea`. Si Léa
   avait déjà lancé Podman : `podman system migrate` (en tant que Léa) pour qu’il relise les plages.
3. ```
   [Container]
   Image=localhost/hlw-vitrine:1.0
   ContainerName=vitrine
   ```
   puis `systemctl daemon-reload` et `systemctl start vitrine` (le service porte le nom du fichier).
4. `PublishPort=8080:8000` (hôte:conteneur) et `Volume=/srv/vitrine/donnees:/donnees:Z`. Sans `:Z`,
   SELinux interdit au conteneur l’accès au répertoire : la vitrine répond « 500 » ou « 403 ».
5. `PodmanArgs=--memory=128m` dans `[Container]` (ou `MemoryMax=128M` dans `[Service]`, qui limite tout le
   service). `Restart=on-failure` va dans `[Service]`, `WantedBy=multi-user.target` dans `[Install]`.
6. `podman inspect vitrine --format '{{.State.Pid}}'`, puis `readlink /proc/PID/ns/pid` et `…/ns/net`.
   `cat /proc/PID/cgroup` donne un chemin sous `/sys/fs/cgroup` : lis `memory.max` dans ce répertoire (s’il
   affiche `max`, remonte d’un cran : la limite peut être posée sur le parent).
7. `podman create --name mini localhost/hlw-vitrine:1.0`, puis `podman export mini | tar -x -C /srv/mini/rootfs`,
   puis `podman rm mini` (sinon l’objectif 10 te rattrape).
8. `unshare --pid --fork --mount --uts --net --ipc --root=/srv/mini/rootfs --mount-proc COMMANDE`. Pour le nom :
   `… /bin/sh -c 'hostname mini && exec "$@"' mini-conteneur "$@"`.
9. `systemd-run --scope -p MemoryMax=64M -- unshare …` : la commande tourne dans un « scope » temporaire.
   **Piège** : systemd-run remplace lui-même les `$VARIABLES` de ses arguments (`$$` devient `$`) ;
   ajoute `--expand-environment=no` pour que la commande reçoive ses arguments intacts.
10. `podman rm essai-malik essai-malik-2`, `podman rmi localhost/essai-malik`, `podman image prune`.

## Niveau 3

Le fichier Quadlet complet :

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

Le script `mini-conteneur` complet et le rapport sont dans `solution.md` (`lab solution 12`).
