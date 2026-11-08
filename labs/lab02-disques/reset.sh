#!/usr/bin/env bash
# Lab 02 : remet la machine dans l'état d'avant le lab.
# Ne touche qu'aux disques notés par setup.sh dans /var/lib/hlw/lab02.disques.
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -u

# 1. Groupes de volumes construits sur les disques du lab : démonter, désactiver, supprimer
if [[ -f "${ETAT_DIR}/lab02.disques" ]] && command -v pvs >/dev/null 2>&1; then
  mapfile -t disques < "${ETAT_DIR}/lab02.disques"
  vgs_a_supprimer=()
  for d in "${disques[@]}"; do
    [[ -b "$d" ]] || continue
    while read -r pv vg; do
      [[ -n "$vg" ]] || continue
      parent="$(lsblk -no PKNAME "$pv" 2>/dev/null | head -1)"
      if [[ "$(readlink -f "$pv")" == "$(readlink -f "$d")" || "/dev/${parent}" == "$d" ]]; then
        vgs_a_supprimer+=("$vg")
      fi
    done < <(pvs --noheadings -o pv_name,vg_name 2>/dev/null)
  done
  for vg in $(printf '%s\n' "${vgs_a_supprimer[@]}" | sort -u); do
    while read -r lv; do
      [[ -n "$lv" ]] || continue
      swapoff "$lv" 2>/dev/null || true
      while findmnt -S "$lv" >/dev/null 2>&1; do umount "$lv" 2>/dev/null || umount -l "$lv" 2>/dev/null || break; done
    done < <(lvs --noheadings -o lv_path "$vg" 2>/dev/null | tr -d ' ')
    vgchange -an "$vg" >/dev/null 2>&1 || true
    vgremove -ff -y "$vg" >/dev/null 2>&1 || true
  done
  # 2. Effacer les signatures (partitions puis disques)
  for d in "${disques[@]}"; do
    [[ -b "$d" ]] || continue
    while findmnt -S "$d" >/dev/null 2>&1; do umount "$d" 2>/dev/null || umount -l "$d" 2>/dev/null || break; done
    for p in $(lsblk -lnpo NAME "$d" | tail -n +2); do
      swapoff "$p" 2>/dev/null || true
      while findmnt -S "$p" >/dev/null 2>&1; do umount "$p" 2>/dev/null || umount -l "$p" 2>/dev/null || break; done
      pvremove -ff -y "$p" >/dev/null 2>&1 || true
      wipefs -a -q "$p" 2>/dev/null || true
    done
    pvremove -ff -y "$d" >/dev/null 2>&1 || true
    wipefs -a -q "$d" 2>/dev/null || true
    partprobe "$d" 2>/dev/null || blockdev --rereadpt "$d" 2>/dev/null || true
  done
fi

# 3. /etc/fstab d'origine
if [[ -f "${ETAT_DIR}/lab02.fstab" ]]; then
  cp -a "${ETAT_DIR}/lab02.fstab" /etc/fstab
  a_systemd && systemctl daemon-reload
fi

# 4. Capteurs
if a_systemd && [[ -f /etc/systemd/system/srv-capteurs.mount ]]; then
  retirer_unite srv-capteurs.mount
fi
mountpoint -q /srv/capteurs 2>/dev/null && umount -l /srv/capteurs

# 5. Fichiers et comptes
for m in /srv/boutique /srv/archives; do mountpoint -q "$m" 2>/dev/null && umount -l "$m"; done
rm -rf /srv/boutique-ancien /srv/boutique /srv/archives /srv/capteurs
rm -f "${ETAT_DIR}"/lab02.{disques,fstab,manifeste,sommes,mesures,sans-capteurs,demarre} "${ETAT_DIR}/capteurs.img"
supprimer_crees 02

[[ "${1:-}" == "--silencieux" ]] || info "lab 02 nettoyé (les disques ajoutés sont de nouveau vierges)"
