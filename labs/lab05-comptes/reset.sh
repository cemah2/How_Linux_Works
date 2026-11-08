#!/usr/bin/env bash
# Lab 05 : remet la machine dans l'état d'avant le lab.
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -u

pkill -x ecrit-commandes 2>/dev/null || true
pkill -x synchro-perso 2>/dev/null || true

# Comptes créés pendant le lab (par toi) : lea, yanis
for u in lea yanis; do
  if id "$u" >/dev/null 2>&1; then
    pkill -u "$u" 2>/dev/null || true
    userdel -r "$u" >/dev/null 2>&1 || userdel "$u" >/dev/null 2>&1 || true
  fi
done
# Groupes ajoutés pendant le lab à des comptes préexistants
id malik >/dev/null 2>&1 && gpasswd -d malik compta >/dev/null 2>&1
for g in systemd-journal adm; do id ines >/dev/null 2>&1 && gpasswd -d ines "$g" >/dev/null 2>&1; done
# Comptes et groupes créés par setup.sh (dont kevin)
supprimer_crees 05

# pwquality
if [[ -f "${ETAT_DIR}/lab05.pwquality.conf" ]]; then
  cp -a "${ETAT_DIR}/lab05.pwquality.conf" /etc/security/pwquality.conf
fi
if [[ -f "${ETAT_DIR}/lab05.pwquality.d" && -d /etc/security/pwquality.conf.d ]]; then
  for f in /etc/security/pwquality.conf.d/*; do
    [[ -e "$f" ]] || continue
    grep -qxF "$(basename "$f")" "${ETAT_DIR}/lab05.pwquality.d" || rm -f "$f"
  done
fi

# journald
if [[ -f "${ETAT_DIR}/lab05.journald.conf" ]]; then
  cp -a "${ETAT_DIR}/lab05.journald.conf" /etc/systemd/journald.conf
fi
# Surcharges : on retire celles qui n'existaient pas avant le lab (au minimum celle de Bastien)
rm -f /etc/systemd/journald.conf.d/50-economie.conf
if [[ -f "${ETAT_DIR}/lab05.journald.d" ]]; then
  for f in /etc/systemd/journald.conf.d/*; do
    [[ -e "$f" ]] || continue
    grep -qxF "$(basename "$f")" "${ETAT_DIR}/lab05.journald.d" || rm -f "$f"
  done
fi
a_systemd && systemctl restart systemd-journald 2>/dev/null

rm -f /etc/logrotate.d/boutique /usr/local/lib/hlw/ecrit-commandes
rm -rf /var/log/boutique /root/audit
rm -f /root/archives/kevin.tar.gz
rmdir /root/archives 2>/dev/null || true
rm -f "${ETAT_DIR}"/lab05.{debut,ip,pwquality.conf,pwquality.d,journald.conf,journald.d,demarre}

[[ "${1:-}" == "--silencieux" ]] || info "lab 05 nettoyé"
