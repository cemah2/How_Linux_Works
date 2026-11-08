#!/usr/bin/env bash
# Lab 06 : remet la machine dans l'état d'avant le lab (sysstat reste installé).
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -u

pkill -x calcul-stocks 2>/dev/null || true
pkill -x sauvegarde-nuit 2>/dev/null || true
sleep 1
pkill -KILL -x calcul-stocks 2>/dev/null || true
pkill -KILL -x sauvegarde-nuit 2>/dev/null || true
pkill -f '^dd if=/dev/zero of=/var/tmp/sauvegarde-nuit.img' 2>/dev/null || true
if a_systemd; then
  retirer_unite catalogue-cache.service capteurs-brut.service
fi
rm -f /usr/local/lib/hlw/{calcul-stocks,sauvegarde-nuit,catalogue-cache,journal-capteurs}
rm -rf /var/log/capteurs
rm -f /var/tmp/sauvegarde-nuit.img /run/hlw-capteurs-historique /root/diagnostic-06.txt
supprimer_crees 06
rm -f "${ETAT_DIR}"/lab06.{debut,demarre}

[[ "${1:-}" == "--silencieux" ]] || info "lab 06 nettoyé"
