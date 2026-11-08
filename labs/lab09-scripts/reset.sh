#!/usr/bin/env bash
# Lab 09 : remet la machine dans l'état d'avant le lab.
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -u

if a_systemd; then
  retirer_unite archive-releves.timer archive-releves.service
fi
rm -f /usr/local/bin/archive-releves /etc/profile.d/brasserie.sh /tmp/archive-releves.liste
rm -rf /opt/brasserie /srv/releves /srv/archives /tmp/hlw-lab09.*

# Fichiers restaurés depuis les copies faites au démarrage du lab
if [[ -f "${ETAT_DIR}/lab09.skel-bashrc" ]]; then
  cp -p "${ETAT_DIR}/lab09.skel-bashrc" /etc/skel/.bashrc
fi
if [[ -f "${ETAT_DIR}/lab09.skel-liste" ]]; then
  for f in /etc/skel/.[!.]* /etc/skel/*; do
    [[ -e "$f" ]] || continue
    grep -qxF "$(basename "$f")" "${ETAT_DIR}/lab09.skel-liste" || rm -rf "$f"
  done
fi
HOME_LEA="$(getent passwd lea | cut -d: -f6 || true)"
if [[ -n "$HOME_LEA" && -f "${ETAT_DIR}/lab09.lea-bashrc" && -d "$HOME_LEA" ]]; then
  cp -p "${ETAT_DIR}/lab09.lea-bashrc" "$HOME_LEA/.bashrc"
fi
userdel -r hlwtest09 >/dev/null 2>&1 || true

supprimer_crees 09
rm -f "${ETAT_DIR}"/lab09.{debut,origine,lea-bashrc,skel-bashrc,skel-liste,profile}

[[ "${1:-}" == "--silencieux" ]] || info "lab 09 nettoyé"
