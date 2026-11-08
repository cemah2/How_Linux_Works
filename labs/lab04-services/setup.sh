#!/usr/bin/env bash
# Lab 04 : la vitrine lancée « à la main », un service d'éditeur à adapter, une tâche cron à moderniser.
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -euo pipefail
ICI="$(dirname "$(readlink -f "$0")")"
F="$ICI/fichiers"

a_systemd || { alerte "ce lab nécessite systemd"; exit 1; }
"$ICI/reset.sh" --silencieux

installer_paquets deb=cron rh=cronie curl python3
systemctl enable --now "$([[ "$FAMILLE" == debian ]] && echo cron || echo crond)" >/dev/null 2>&1 || true

mkdir -p "$ETAT_DIR"
touch "${ETAT_DIR}/lab04.debut"
assurer_compte 04 malik "Malik Benali, développeur de la boutique" boutique

info "installation de la vitrine dans /opt/vitrine"
install -d -m 755 /opt/vitrine /opt/vitrine/bin /opt/vitrine/www
install -m 755 "$F/vitrine" /opt/vitrine/bin/vitrine
install -m 644 "$F/index.html" /opt/vitrine/www/index.html
install -d -m 755 /etc/vitrine
install -m 644 "$F/vitrine.env" /etc/vitrine/vitrine.env

info "Malik lance la vitrine à la main, « en attendant »"
setsid setpriv --reuid=malik --regid=malik --init-groups --reset-env \
  env PATH=/usr/local/bin:/usr/bin:/bin PORT=8080 ADRESSE=127.0.0.1 /opt/vitrine/bin/vitrine \
  </dev/null >>/tmp/vitrine-malik.log 2>&1 &
disown || true

info "installation du logiciel d’inventaire de l’éditeur"
install -d -m 755 /usr/local/lib/hlw
install -m 755 "$F/inventaire" /usr/local/lib/hlw/inventaire
install -d -m 755 /usr/lib/systemd/system
install -m 644 "$F/inventaire.service" /usr/lib/systemd/system/inventaire.service
sha256sum /usr/lib/systemd/system/inventaire.service > "${ETAT_DIR}/lab04.inventaire"
systemctl daemon-reload
systemctl enable --now inventaire.service >/dev/null 2>&1

info "la tâche cron de Bastien"
install -m 755 "$F/export-ventes" /usr/local/bin/export-ventes
install -m 644 "$F/export-ventes.cron" /etc/cron.d/export-ventes
install -d -m 755 /srv/ventes /srv/ventes/exports

sleep 1
info "situation de départ prête : lis le ticket dans le README du lab"
