#!/usr/bin/env bash
# Lab 08 : à lancer sur douane, cuve ET comptoir, une fois le Lab 07 terminé.
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -euo pipefail
ICI="$(dirname "$(readlink -f "$0")")"
# shellcheck source=../lab07-reseau/reseau.sh
source "$ICI/../lab07-reseau/reseau.sh"
ROLE="${LAB08_ROLE:-$ROLE}"

if ! role_connu; then
  alerte "cette machine s’appelle « ${ROLE} » : le Lab 08 se joue sur douane, cuve et comptoir."
  exit 1
fi
"$ICI/reset.sh" --silencieux
mkdir -p "$ETAT_DIR"
sauvegarder() { tar -C / -czf "${ETAT_DIR}/lab08.etc.tar.gz" --ignore-failed-read "$@" 2>/dev/null || true; }

case "$ROLE" in
  cuve)
    a_adresse "$(iface_lan)" "${IP_CUVE_LAN}/24" || alerte "cuve n’a pas ${IP_CUVE_LAN} : termine d’abord le Lab 07"
    sauvegarder etc/ssh/sshd_config.d
    sha256sum /etc/ssh/sshd_config > "${ETAT_DIR}/lab08.sshd_config"
    assurer_compte 08 bastien "Bastien Roux, maître brasseur" brasseurs
    info "le prestataire a laissé un « outil de diagnostic »…"
    install -m 644 "$ICI/fichiers/outil-debug.service" /etc/systemd/system/outil-debug.service
    systemctl daemon-reload
    systemctl enable --now outil-debug.service >/dev/null 2>&1
    ;;
  comptoir)
    repond_ping "$IP_CUVE_LAN" || alerte "le comptoir ne joint pas cuve : termine d’abord le Lab 07"
    assurer_compte 08 bastien "Bastien Roux, maître brasseur" brasseurs
    command -v nmap >/dev/null || alerte "nmap absent : sudo dnf install nmap (le comptoir a Internet depuis le Lab 07)"
    ;;
  douane)
    unite_active dnsmasq || alerte "dnsmasq ne tourne pas sur douane : termine d’abord le Lab 07"
    sauvegarder etc/ssh/sshd_config.d etc/fail2ban
    paquet_installe fail2ban && echo deja > "${ETAT_DIR}/lab08.fail2ban" || : > "${ETAT_DIR}/lab08.fail2ban"
    ;;
esac
touch "${ETAT_DIR}/lab08.debut"
info "rôle « ${ROLE} » prêt. Lis le ticket : less ${ICI}/README.md"
