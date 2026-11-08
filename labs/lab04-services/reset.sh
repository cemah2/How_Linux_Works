#!/usr/bin/env bash
# Lab 04 : remet la machine dans l'état d'avant le lab.
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -u

pkill -u malik -f '/opt/vitrine/bin/vitrine|http.server 8080' 2>/dev/null || true
if a_systemd; then
  retirer_unite vitrine.service inventaire.service export-ventes.timer export-ventes.service
fi
if id vitrine >/dev/null 2>&1; then
  pkill -u vitrine 2>/dev/null || true
  userdel vitrine >/dev/null 2>&1 || true
fi
getent group vitrine >/dev/null && groupdel vitrine 2>/dev/null
rm -rf /opt/vitrine /etc/vitrine /srv/ventes
rm -f /usr/local/lib/hlw/inventaire /usr/local/bin/export-ventes /etc/cron.d/export-ventes /tmp/vitrine-malik.log
if crontab -l -u root 2>/dev/null | grep -q export-ventes; then
  crontab -l -u root | grep -v export-ventes | crontab -u root -
fi
supprimer_crees 04
rm -f "${ETAT_DIR}"/lab04.{debut,inventaire,demarre}

[[ "${1:-}" == "--silencieux" ]] || info "lab 04 nettoyé"
