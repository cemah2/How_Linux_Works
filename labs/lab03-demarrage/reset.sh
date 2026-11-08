#!/usr/bin/env bash
# Lab 03 : défait la panne et retire les services du lab.
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -u

if a_systemd; then
  retirer_unite brassd.service collecte-capteurs.service
  if [[ -f "${ETAT_DIR}/lab03.cible" ]]; then
    systemctl set-default "$(cat "${ETAT_DIR}/lab03.cible")" >/dev/null 2>&1 || true
  elif [[ "$(systemctl get-default 2>/dev/null)" == rescue.target ]]; then
    systemctl set-default multi-user.target >/dev/null 2>&1 || true
  fi
fi
rm -f /usr/local/bin/brassd /usr/local/lib/hlw/collecte-capteurs

# fstab : la ligne de la cave et son commentaire
if grep -q '/srv/cave' /etc/fstab; then
  sed -i -e '/^# Cave de garde/d' -e '/[[:space:]]\/srv\/cave[[:space:]]/d' /etc/fstab
  a_systemd && systemctl daemon-reload
fi
rmdir /srv/cave 2>/dev/null || true

# Chargeur de démarrage
grub_modifie=0
if [[ -f /etc/default/grub.d/99-maintenance.cfg ]]; then rm -f /etc/default/grub.d/99-maintenance.cfg; grub_modifie=1; fi
if grep -qs 'systemd.unit=rescue.target' /etc/default/grub; then
  sed -i 's/ *systemd\.unit=rescue\.target//g' /etc/default/grub; grub_modifie=1
fi
if command -v grubby >/dev/null 2>&1 && grubby --info=ALL 2>/dev/null | grep -q 'systemd.unit=rescue.target'; then
  grubby --update-kernel=ALL --remove-args="systemd.unit=rescue.target" >/dev/null 2>&1 || true
fi
if (( grub_modifie )) && command -v update-grub >/dev/null 2>&1; then update-grub >/dev/null 2>&1 || true; fi

rm -f /root/incident-03.md "${ETAT_DIR}"/lab03.{cible,panne,demarre}

[[ "${1:-}" == "--silencieux" ]] || info "lab 03 nettoyé"
