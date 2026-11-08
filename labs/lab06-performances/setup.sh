#!/usr/bin/env bash
# Lab 06 : un serveur lent, quatre coupables.
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -euo pipefail
ICI="$(dirname "$(readlink -f "$0")")"
F="$ICI/fichiers"

a_systemd || { alerte "ce lab nécessite systemd"; exit 1; }
[[ -f /sys/fs/cgroup/cgroup.controllers ]] || { alerte "ce lab nécessite les cgroups v2"; exit 1; }
"$ICI/reset.sh" --silencieux
installer_paquets python3
mkdir -p "$ETAT_DIR"
assurer_compte 06 malik "Malik Benali, développeur de la boutique" boutique

install -d -m 755 /usr/local/lib/hlw
for p in calcul-stocks sauvegarde-nuit catalogue-cache journal-capteurs; do
  install -m 755 "$F/$p" "/usr/local/lib/hlw/$p"
done
install -m 644 "$F/catalogue-cache.service" /etc/systemd/system/catalogue-cache.service
install -m 644 "$F/capteurs-brut.service" /etc/systemd/system/capteurs-brut.service

info "démarrage des services de la boutique et des capteurs"
touch /run/hlw-capteurs-historique
systemctl daemon-reload
systemctl enable --now catalogue-cache.service capteurs-brut.service >/dev/null 2>&1
for _ in $(seq 1 60); do
  [[ ! -e /run/hlw-capteurs-historique ]] && break
  sleep 1
done
# « Le fichier brut prenait trop de place, je l’ai supprimé » (Bastien)
rm -f /var/log/capteurs/brut.log

info "lancement des travaux de la nuit"
setsid setpriv --reuid=malik --regid=malik --init-groups --reset-env /usr/local/lib/hlw/calcul-stocks </dev/null >/dev/null 2>&1 &
disown || true
setsid /usr/local/lib/hlw/sauvegarde-nuit </dev/null >/dev/null 2>&1 &
disown || true

sleep 2
touch "${ETAT_DIR}/lab06.debut"
info "situation de départ prête : lis le ticket dans le README du lab"
