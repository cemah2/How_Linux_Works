#!/usr/bin/env bash
# Test de bout en bout du Lab 12 (CI, en root sur une machine jetable avec systemd et podman).
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
export LAB_HOME="$RACINE"
LAB="$RACINE/infra/bin/lab"

# Ubuntu 24.04 restreint les espaces de noms utilisateur non privilégiés (AppArmor) : on lève la
# restriction pour le test rootless de Léa (Rocky et Debian n'ont pas cette restriction).
sysctl -qw kernel.apparmor_restrict_unprivileged_userns=0 2>/dev/null || true

"$LAB" start 12
if "$LAB" check 12; then
  echo "ÉCHEC DU TEST : la correction initiale ne devrait pas être validée" >&2
  exit 1
fi

# --- Solution (identique à labs/lab12-conteneurs/solution.md) ------------------
# 1. Une base précise et légère, puis la construction
sed -i 's|^FROM .*|FROM docker.io/library/python:3.13-alpine|' /srv/vitrine/Containerfile
podman build -t localhost/hlw-vitrine:1.0 /srv/vitrine
podman images localhost/hlw-vitrine

# 2. Plages subordonnées pour Léa (une plage libre, après celles qui existent)
DEBUT=$(awk -F: '{ fin = $2 + $3; if (fin > max) max = fin } END { print (max > 100000 ? max : 100000) }' /etc/subuid /etc/subgid)
usermod --add-subuids "$DEBUT-$((DEBUT + 65535))" --add-subgids "$DEBUT-$((DEBUT + 65535))" lea
runuser -l lea -c 'podman system migrate' || true
runuser -l lea -c 'podman unshare cat /proc/self/uid_map'

# 3 à 5. Quadlet
mkdir -p /etc/containers/systemd
cat > /etc/containers/systemd/vitrine.container <<'QUADLET'
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
QUADLET
systemctl daemon-reload
systemctl start vitrine.service
for _ in $(seq 20); do curl -fsS http://127.0.0.1:8080/ >/dev/null 2>&1 && break; sleep 1; done
curl -fsS http://127.0.0.1:8080/ | grep 'Brasserie du Noyau'

# 6. Sous le capot
P=$(podman inspect vitrine --format '{{.State.Pid}}')
CG=/sys/fs/cgroup$(sed -n 's/^0:://p' "/proc/$P/cgroup")
while [[ "$(cat "$CG/memory.max")" == max ]]; do CG=$(dirname "$CG"); done
cat > /root/lab12-sous-le-capot.txt <<RAPPORT
PID_HOTE=$P
NS_PID=$(readlink "/proc/$P/ns/pid")
NS_NET=$(readlink "/proc/$P/ns/net")
MEMOIRE_MAX=$(cat "$CG/memory.max")
RAPPORT
cat /root/lab12-sous-le-capot.txt

# 7. Racine Alpine extraite de l'image
mkdir -p /srv/mini/rootfs
podman create --name mini localhost/hlw-vitrine:1.0
podman export mini | tar -xf - -C /srv/mini/rootfs
podman rm mini

# 8 et 9. Le mini-conteneur
cat > /usr/local/sbin/mini-conteneur <<'SCRIPT'
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
SCRIPT
chmod 755 /usr/local/sbin/mini-conteneur
/usr/local/sbin/mini-conteneur /bin/sh -c 'echo "PID $$ sur $(hostname)"; cat /proc/net/dev'

# 10. Ménage
podman rm essai-malik essai-malik-2
podman rmi localhost/essai-malik:latest
podman image prune -f
# ---------------------------------------------------------------------------

"$LAB" check 12
"$LAB" reset 12
! podman image exists localhost/hlw-vitrine:1.0 || { echo "ÉCHEC DU TEST : image encore présente" >&2; exit 1; }
[[ ! -e /etc/containers/systemd/vitrine.container ]] || { echo "ÉCHEC DU TEST : Quadlet encore présent" >&2; exit 1; }
echo "Test du Lab 12 réussi."
