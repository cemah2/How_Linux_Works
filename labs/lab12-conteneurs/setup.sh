#!/usr/bin/env bash
# Lab 12 : la vitrine à conteneuriser proprement, les essais de Malik à nettoyer, Léa sans conteneurs
# rootless, et un mini-conteneur à construire à la main.
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -euo pipefail
ICI="$(dirname "$(readlink -f "$0")")"
F="$ICI/fichiers"

a_systemd || { alerte "ce lab nécessite systemd"; exit 1; }
[[ -f /sys/fs/cgroup/cgroup.controllers ]] || { alerte "ce lab nécessite les cgroups v2"; exit 1; }
"$ICI/reset.sh" --silencieux

installer_paquets podman curl tar util-linux deb=uidmap
command -v podman >/dev/null || { alerte "podman n’a pas pu être installé"; exit 1; }

mkdir -p "$ETAT_DIR"
touch "${ETAT_DIR}/lab12.debut"
assurer_compte 12 lea "Léa Durand, brasseuse" brasseurs

info "Léa perd ses plages d’identifiants subordonnés (/etc/subuid, /etc/subgid)"
UID_LEA="$(id -u lea)"
for f in subuid subgid; do
  touch "/etc/$f"
  grep -E "^(lea|$UID_LEA):" "/etc/$f" > "${ETAT_DIR}/lab12.$f" || true
  sed -i -E "/^(lea|$UID_LEA):/d" "/etc/$f"
done

info "les fichiers de la vitrine dans /srv/vitrine"
install -d -m 755 /srv/vitrine /srv/vitrine/donnees
install -m 644 "$F/vitrine/Containerfile" "$F/vitrine/vitrine.py" /srv/vitrine/
install -m 644 "$F/donnees/index.html" /srv/vitrine/donnees/

info "les essais de Malik (téléchargement d’une petite image Alpine)"
TRAVAIL="$(mktemp -d)"
trap 'rm -rf "$TRAVAIL"' EXIT
podman pull -q docker.io/library/alpine:3.22 >/dev/null
for n in 1 2; do
  printf 'FROM docker.io/library/alpine:3.22\nRUN echo "essai %s de Malik" > /essai\nCMD ["cat", "/essai"]\n' "$n" \
    > "$TRAVAIL/Containerfile"
  podman build -q -t localhost/essai-malik:latest "$TRAVAIL" >/dev/null
done
podman run --name essai-malik localhost/essai-malik:latest >/dev/null
podman create --name essai-malik-2 docker.io/library/alpine:3.22 sleep 60 >/dev/null

info "situation de départ prête : lis le ticket dans le README du lab"
