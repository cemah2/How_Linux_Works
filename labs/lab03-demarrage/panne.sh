#!/usr/bin/env bash
# Lab 03 : déclenche la panne, puis redémarre la machine.
#   LAB_AUTO=1               pas de confirmation (tests)
#   LAB_SANS_REDEMARRAGE=1   ne pas redémarrer (tests)
#   LAB03_SANS_GRUB=1        ne pas toucher au chargeur de démarrage (tests sur une machine jetable)
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -euo pipefail

etat_root="$(passwd -S root 2>/dev/null | awk '{print $2}')"
if [[ "$etat_root" != P && "$etat_root" != PS ]]; then
  alerte "le compte root n’a pas de mot de passe : en mode secours, tu ne pourrais pas te connecter."
  alerte "Définis-en un d’abord :  sudo passwd root   puis relance : lab panne 03"
  exit 1
fi
if [[ -f "${ETAT_DIR}/lab03.panne" ]]; then
  alerte "la panne a déjà été déclenchée. Pour recommencer : lab reset 03 && lab start 03"
  exit 1
fi

if [[ "${LAB_AUTO:-0}" != 1 ]]; then
  echo "La machine va être mise en panne puis redémarrée. Tu la répareras depuis la console Proxmox."
  read -r -p "As-tu fait un instantané Proxmox et ouvert la console de la VM ? [o/N] " r
  [[ "$r" =~ ^[oOyY]$ ]] || { echo "Annulé."; exit 0; }
fi

id_demarrage > "${ETAT_DIR}/lab03.panne"

# 1. Une entrée fstab vers un disque qui n'existe plus
mkdir -p /srv/cave
cat >> /etc/fstab <<FIN
# Cave de garde : disque USB de Bastien (ajouté le $(date +%F))
UUID=$(cat /proc/sys/kernel/random/uuid)  /srv/cave  ext4  defaults  0  2
FIN

# 2. brassd « mis à jour » : le chemin du programme est faux
sed -i 's|^ExecStart=.*|ExecStart=/usr/local/bin/brassd-v2 --cuves=4|' /etc/systemd/system/brassd.service

# 3. Le collecteur déclaré comme une tâche ponctuelle : systemd attend qu'il se termine…
sed -i -e 's|^Type=.*|Type=oneshot|' -e '/^ExecStart=/a TimeoutStartSec=100' /etc/systemd/system/collecte-capteurs.service
systemctl daemon-reload

# 4. « Maintenance » : démarrage forcé en mode secours, par deux moyens différents
systemctl set-default rescue.target >/dev/null 2>&1
if [[ "${LAB03_SANS_GRUB:-0}" != 1 ]]; then
  if [[ "$FAMILLE" == debian ]]; then
    mkdir -p /etc/default/grub.d
    cat > /etc/default/grub.d/99-maintenance.cfg <<'FIN'
# Maintenance de la cave (Bastien) : démarrer en mode secours
GRUB_CMDLINE_LINUX_DEFAULT="$GRUB_CMDLINE_LINUX_DEFAULT systemd.unit=rescue.target"
FIN
    update-grub >/dev/null 2>&1
  else
    grubby --update-kernel=ALL --args="systemd.unit=rescue.target" >/dev/null
  fi
fi

info "panne en place."
if [[ "${LAB_SANS_REDEMARRAGE:-0}" == 1 ]]; then
  exit 0
fi
echo "Redémarrage dans 10 secondes. Suis la suite dans la console Proxmox de la VM."
sleep 10
systemctl reboot
