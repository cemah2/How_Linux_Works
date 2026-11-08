#!/usr/bin/env bash
# Lab 01 : remet la machine dans l'état d'avant le lab.
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -u

# -x : nom exact du processus (15 caractères maximum, « thermostat-cuve » tient tout juste)
if pkill -x thermostat-cuve 2>/dev/null; then
  sleep 1
  pkill -KILL -x thermostat-cuve 2>/dev/null || true
fi

if a_systemd && [[ -f /etc/systemd/system/boutique.service ]]; then
  systemctl disable --now boutique.service >/dev/null 2>&1 || true
  rm -f /etc/systemd/system/boutique.service
  systemctl daemon-reload
fi

# Règles sudo du lab (celles qui mentionnent malik)
for f in /etc/sudoers.d/*; do
  [[ -f "$f" ]] && grep -qw malik "$f" && rm -f "$f"
done

for u in bastien chloe malik ines; do
  if id "$u" >/dev/null 2>&1; then
    pkill -u "$u" 2>/dev/null || true
    userdel -r "$u" >/dev/null 2>&1 || userdel "$u" 2>/dev/null || true
  fi
done
for g in brasseurs compta boutique personnel; do
  getent group "$g" >/dev/null && groupdel "$g" 2>/dev/null || true
done

rm -rf /srv/brasserie /var/tmp/.cache-chloe
rm -f /usr/local/bin/sauvegarde-recettes /usr/local/lib/hlw/thermostat-cuve
rm -f "${ETAT_DIR}/lab01.demarre"

[[ "${1:-}" == "--silencieux" ]] || info "lab 01 nettoyé"
