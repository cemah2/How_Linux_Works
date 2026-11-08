#!/usr/bin/env bash
# Lab 10 : remet la machine dans l'état d'avant le lab (selon son rôle).
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -u
ICI="$(dirname "$(readlink -f "$0")")"
# shellcheck source=../lab07-reseau/reseau.sh
source "$ICI/../lab07-reseau/reseau.sh"
ROLE="${LAB10_ROLE:-$ROLE}"
role_connu || { [[ "${1:-}" == "--silencieux" ]] || alerte "machine « ${ROLE} » : rien à faire"; exit 0; }

ARCHIVE="${ETAT_DIR}/lab10.etc.tar.gz"
restaurer() {
  [[ -f "$ARCHIVE" ]] || return 0
  local x
  for x in "$@"; do
    if tar -tzf "$ARCHIVE" "$x" >/dev/null 2>&1; then rm -rf "/${x:?}"; tar -C / -xzf "$ARCHIVE" "$x"; fi
  done
}
installe_avant() { grep -qx "$1" "${ETAT_DIR}/lab10.paquets-avant" 2>/dev/null; }

case "$ROLE" in
  cuve)
    a_systemd && retirer_unite sauvegarde-recettes.timer sauvegarde-recettes.service
    if [[ -f "$ARCHIVE" ]]; then
      restaurer etc/exports etc/exports.d etc/samba
      command -v exportfs >/dev/null && exportfs -ra 2>/dev/null
      if paquet_installe nfs-kernel-server && ! installe_avant nfs-kernel-server; then systemctl disable --now nfs-server >/dev/null 2>&1 || true; fi
      if paquet_installe samba && ! installe_avant samba; then systemctl disable --now smbd nmbd >/dev/null 2>&1 || true; fi
      command -v pdbedit >/dev/null && pdbedit -x malik >/dev/null 2>&1
    fi
    rm -rf /srv/recettes /srv/partages /srv/archives
    rm -f /root/.ssh/sauvegarde /root/.ssh/sauvegarde.pub
    supprimer_crees 10
    ;;
  comptoir)
    for m in /mnt/commun /mnt/boutique; do mountpoint -q "$m" 2>/dev/null && umount -l "$m"; done
    h="$(getent passwd bastien | cut -d: -f6)"
    if [[ -n "$h" ]] && mountpoint -q "$h/archives-cuve" 2>/dev/null; then umount -l "$h/archives-cuve"; fi
    restaurer etc/fstab
    a_systemd && systemctl daemon-reload
    rm -f /root/.smb-boutique
    rmdir /mnt/commun /mnt/boutique 2>/dev/null || true
    supprimer_crees 10
    ;;
  douane)
    if id sauvegarde >/dev/null 2>&1; then pkill -u sauvegarde 2>/dev/null; userdel -r sauvegarde >/dev/null 2>&1; fi
    rm -rf /srv/sauvegardes
    ;;
esac
rm -f "$ARCHIVE" "${ETAT_DIR}"/lab10.{paquets-avant,debut,demarre}
[[ "${1:-}" == "--silencieux" ]] || info "lab 10 nettoyé sur ${ROLE}"
