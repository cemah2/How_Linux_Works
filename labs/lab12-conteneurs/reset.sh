#!/usr/bin/env bash
# Lab 12 : remet la machine dans l'état d'avant le lab (podman et l'image alpine:3.22 restent).
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -u

if a_systemd; then
  systemctl stop vitrine.service >/dev/null 2>&1 || true
  rm -f /etc/containers/systemd/vitrine.container
  systemctl daemon-reload
  systemctl reset-failed vitrine.service >/dev/null 2>&1 || true
fi
if command -v podman >/dev/null 2>&1; then
  for c in vitrine systemd-vitrine essai-malik essai-malik-2 mini; do
    podman rm -f "$c" >/dev/null 2>&1 || true
  done
  for img in localhost/hlw-vitrine:1.0 localhost/essai-malik:latest; do
    for c in $(podman ps -a -q --filter "ancestor=$img" 2>/dev/null); do
      podman rm -f "$c" >/dev/null 2>&1 || true
    done
    podman rmi -f "$img" >/dev/null 2>&1 || true
  done
  podman image prune -f >/dev/null 2>&1 || true
fi
rm -rf /srv/vitrine /srv/mini
rm -f /usr/local/sbin/mini-conteneur /root/lab12-sous-le-capot.txt

# Plages subordonnées de Léa : on rend celles d'avant le lab
if id lea >/dev/null 2>&1; then
  UID_LEA="$(id -u lea)"
  for f in subuid subgid; do
    [[ -f "/etc/$f" ]] && sed -i -E "/^(lea|$UID_LEA):/d" "/etc/$f"
    [[ -s "${ETAT_DIR}/lab12.$f" ]] && cat "${ETAT_DIR}/lab12.$f" >> "/etc/$f"
  done
fi
supprimer_crees 12
if ! id lea >/dev/null 2>&1; then
  for f in subuid subgid; do [[ -f "/etc/$f" ]] && sed -i '/^lea:/d' "/etc/$f"; done
fi
rm -f "${ETAT_DIR}"/lab12.{debut,subuid,subgid}

[[ "${1:-}" == "--silencieux" ]] || info "lab 12 nettoyé"
