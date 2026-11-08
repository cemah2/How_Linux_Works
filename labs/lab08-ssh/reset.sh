#!/usr/bin/env bash
# Lab 08 : remet la machine dans l'état d'avant le lab (selon son rôle).
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -u
ICI="$(dirname "$(readlink -f "$0")")"
# shellcheck source=../lab07-reseau/reseau.sh
source "$ICI/../lab07-reseau/reseau.sh"
ROLE="${LAB08_ROLE:-$ROLE}"
role_connu || { [[ "${1:-}" == "--silencieux" ]] || alerte "machine « ${ROLE} » : rien à faire"; exit 0; }

ARCHIVE="${ETAT_DIR}/lab08.etc.tar.gz"
restaurer() {
  [[ -f "$ARCHIVE" ]] || return 0
  local x
  for x in "$@"; do
    if tar -tzf "$ARCHIVE" "$x" >/dev/null 2>&1; then rm -rf "/${x:?}"; tar -C / -xzf "$ARCHIVE" "$x"; fi
  done
}
# restart (et non reload) : une adresse d'écoute (ListenAddress) ne change qu'au redémarrage
recharger_ssh() { sshd -t 2>/dev/null && { systemctl restart ssh 2>/dev/null || systemctl restart sshd 2>/dev/null || true; }; }

case "$ROLE" in
  cuve)
    a_systemd && retirer_unite outil-debug.service
    if [[ -f "$ARCHIVE" ]]; then restaurer etc/ssh/sshd_config.d; recharger_ssh; fi
    getent group ssh-autorises >/dev/null && groupdel ssh-autorises 2>/dev/null
    supprimer_crees 08
    ;;
  comptoir)
    supprimer_crees 08
    rm -f /root/inventaire.txt
    ;;
  douane)
    if [[ -f "$ARCHIVE" ]]; then
      if [[ ! -s "${ETAT_DIR}/lab08.fail2ban" ]] && paquet_installe fail2ban; then
        systemctl disable --now fail2ban >/dev/null 2>&1 || true
      fi
      restaurer etc/ssh/sshd_config.d etc/fail2ban
      recharger_ssh
      if unite_active fail2ban; then systemctl restart fail2ban >/dev/null 2>&1 || true; fi
    fi
    rm -f /root/capture-dns.pcap
    ;;
esac
rm -f "$ARCHIVE" "${ETAT_DIR}"/lab08.{sshd_config,fail2ban,debut,demarre}
[[ "${1:-}" == "--silencieux" ]] || info "lab 08 nettoyé sur ${ROLE}"
