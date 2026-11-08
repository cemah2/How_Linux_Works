#!/usr/bin/env bash
# Lab 07 : remet la machine dans l'état d'avant le lab (selon son rôle).
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -u
ICI="$(dirname "$(readlink -f "$0")")"
# shellcheck source=reseau.sh
source "$ICI/reseau.sh"
role_connu || { [[ "${1:-}" == "--silencieux" ]] || alerte "machine « ${ROLE} » : rien à faire"; exit 0; }

# LAB07_SANS_APPLIQUER=1 : ne pas réappliquer Netplan ni redémarrer resolved (tests sur une machine partagée)
ARCHIVE="${ETAT_DIR}/lab07.etc.tar.gz"
restaurer() { # répertoires/fichiers sous /etc (sans le / initial)
  [[ -f "$ARCHIVE" ]] || return 0
  local x
  for x in "$@"; do
    if tar -tzf "$ARCHIVE" "$x" >/dev/null 2>&1; then
      rm -rf "/${x:?}"
      tar -C / -xzf "$ARCHIVE" "$x"
    fi
  done
}

case "$ROLE" in
  douane)
    if [[ -f "$ARCHIVE" ]]; then
      systemctl disable --now dnsmasq >/dev/null 2>&1 || true
      rm -f /var/lib/misc/dnsmasq.leases
      restaurer etc/netplan etc/sysctl.d etc/sysctl.conf etc/nftables.conf etc/dnsmasq.conf etc/dnsmasq.d
      read -r _ lan < "${ETAT_DIR}/lab07.interfaces" 2>/dev/null || lan=""
      [[ -n "${lan:-}" ]] && ip addr flush dev "$lan" 2>/dev/null
      [[ "${LAB07_SANS_APPLIQUER:-0}" == 1 ]] || { command -v netplan >/dev/null && netplan apply 2>/dev/null; }
      sysctl -qw net.ipv4.ip_forward=0
      sysctl -q --system >/dev/null 2>&1 || true
      if [[ -f /etc/nftables.conf ]]; then nft -f /etc/nftables.conf 2>/dev/null || nft flush ruleset; else nft flush ruleset 2>/dev/null; fi
    fi
    ;;
  cuve)
    if [[ -f "$ARCHIVE" ]]; then
      restaurer etc/netplan etc/systemd/resolved.conf etc/systemd/resolved.conf.d
      read -r _ lan < "${ETAT_DIR}/lab07.interfaces" 2>/dev/null || lan=""
      [[ -n "${lan:-}" ]] && ip addr flush dev "$lan" 2>/dev/null
      if [[ "${LAB07_SANS_APPLIQUER:-0}" != 1 ]]; then
        command -v netplan >/dev/null && netplan apply 2>/dev/null
        systemctl restart systemd-resolved 2>/dev/null || true
      fi
    fi
    ;;
  comptoir)
    : # rien de persistant n’est modifié sur le comptoir par le lab
    ;;
esac
rm -f "$ARCHIVE" "${ETAT_DIR}"/lab07.{interfaces,debut,demarre}
[[ "${1:-}" == "--silencieux" ]] || info "lab 07 nettoyé sur ${ROLE}"
