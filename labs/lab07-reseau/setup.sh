#!/usr/bin/env bash
# Lab 07 : à lancer sur douane, cuve ET comptoir (chaque machine prépare son rôle).
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -euo pipefail
ICI="$(dirname "$(readlink -f "$0")")"
# shellcheck source=reseau.sh
source "$ICI/reseau.sh"

if ! role_connu; then
  alerte "cette machine s’appelle « ${ROLE} » : le Lab 07 se joue sur douane, cuve et comptoir."
  alerte "Déploie-les depuis Proxmox : ./deployer.sh reseau"
  exit 1
fi
"$ICI/reset.sh" --silencieux
mkdir -p "$ETAT_DIR"
sauvegarder() { tar -C / -czf "${ETAT_DIR}/lab07.etc.tar.gz" --ignore-failed-read "$@" 2>/dev/null || true; }

case "$ROLE" in
  douane)
    installer_paquets bind9-dnsutils nftables tcpdump
    # dnsmasq installé mais NON démarré : c'est à toi de le configurer
    if ! paquet_installe dnsmasq; then
      info "installation de dnsmasq (sans le démarrer)"
      printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d; chmod 755 /usr/sbin/policy-rc.d
      DEBIAN_FRONTEND=noninteractive apt-get install -y -qq dnsmasq >/dev/null 2>&1 \
        || { apt-get update -qq >/dev/null 2>&1; DEBIAN_FRONTEND=noninteractive apt-get install -y -qq dnsmasq >/dev/null; }
      rm -f /usr/sbin/policy-rc.d
    fi
    systemctl disable --now dnsmasq >/dev/null 2>&1 || true
    sauvegarder etc/netplan etc/sysctl.d etc/sysctl.conf etc/nftables.conf etc/dnsmasq.conf etc/dnsmasq.d
    wan="$(iface_wan)"; lan="$(iface_lan)"
    printf '%s %s\n' "$wan" "$lan" > "${ETAT_DIR}/lab07.interfaces"
    info "douane : interface externe ${wan:-?} ($(adresse_de "${wan:-lo}" || true)), interface interne ${lan:-INTROUVABLE}"
    [[ -n "$lan" ]] || alerte "aucune seconde carte : as-tu déployé avec « ./deployer.sh reseau » ?"
    ;;
  cuve)
    installer_paquets bind9-dnsutils tcpdump
    sauvegarder etc/netplan etc/systemd/resolved.conf etc/systemd/resolved.conf.d
    wan="$(iface_wan)"; lan="$(iface_lan)"
    printf '%s %s\n' "$wan" "$lan" > "${ETAT_DIR}/lab07.interfaces"
    info "cuve : interface externe ${wan:-?}, interface interne ${lan:-INTROUVABLE}"
    [[ -n "$lan" ]] || alerte "cuve n’a pas de seconde carte : relance « ./deployer.sh reseau » sur Proxmox"
    ;;
  comptoir)
    for c in dig curl tcpdump; do command -v "$c" >/dev/null || alerte "commande ${c} absente (comptoir n’a pas Internet pour l’instant)"; done
    info "comptoir : interface $(iface_lan), adresse actuelle : $(adresse_de "$(iface_lan)" || echo aucune)"
    ;;
esac
touch "${ETAT_DIR}/lab07.debut"
info "rôle « ${ROLE} » prêt. Lis le ticket : less ${ICI}/README.md"
