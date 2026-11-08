#!/usr/bin/env bash
# Lab 13 : remet la machine dans l'état d'avant le lab. Le rapport d'incident est mis de côté, pas effacé.
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -u

rm -f /etc/cron.d/recalcul-tarifs
pkill -x recalcul-tarifs 2>/dev/null || true
rm -f /usr/local/bin/recalcul-tarifs

if a_systemd; then
  retirer_unite boutique.service stock.service
  systemctl disable --now srv-boutique-donnees.mount >/dev/null 2>&1 || true
  rm -f /etc/systemd/system/srv-boutique-donnees.mount
  systemctl daemon-reload
fi
mountpoint -q /srv/boutique/donnees && umount /srv/boutique/donnees
rm -f "${ETAT_DIR}/lab13-donnees.img"
rm -rf /srv/boutique /opt/boutique /opt/stock /etc/stock
rm -f /etc/logrotate.d/boutique

if [[ -f "${ETAT_DIR}/lab13.hosts" ]]; then
  cp -p "${ETAT_DIR}/lab13.hosts" /etc/hosts
else
  sed -i '/stock\.brasserie\.lan/d' /etc/hosts
fi

if [[ -f /etc/systemd/journald.conf.d/50-gain-de-place.conf ]]; then
  rm -f /etc/systemd/journald.conf.d/50-gain-de-place.conf
  a_systemd && systemctl restart systemd-journald
fi

if [[ -f /root/rapport-incident.md ]]; then
  mv /root/rapport-incident.md "/root/rapport-incident.$(date +%Y%m%d-%H%M%S).md"
fi

supprimer_crees 13
rm -f "${ETAT_DIR}"/lab13.{debut,hosts}

[[ "${1:-}" == "--silencieux" ]] || info "lab 13 nettoyé"
