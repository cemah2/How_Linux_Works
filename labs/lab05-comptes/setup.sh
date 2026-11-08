#!/usr/bin/env bash
# Lab 05 : arrivées et départ dans l'équipe, politique de mots de passe, journaux.
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -euo pipefail
ICI="$(dirname "$(readlink -f "$0")")"
F="$ICI/fichiers"

a_systemd || { alerte "ce lab nécessite systemd"; exit 1; }
"$ICI/reset.sh" --silencieux
installer_paquets logrotate
mkdir -p "$ETAT_DIR"

info "l’équipe de la brasserie"
assurer_compte 05 bastien "Bastien Roux, maître brasseur" brasseurs personnel
assurer_compte 05 malik   "Malik Benali, développeur de la boutique" boutique personnel
assurer_compte 05 ines    "Inès Garnier, gérante" compta personnel
assurer_compte 05 chloe   "Chloé Martin, comptable" compta personnel
assurer_compte 05 kevin   "Kevin Petit, vendeur" boutique personnel
echo 'kevin:Vendeur-du-Noyau-2025' | chpasswd
install -d -o kevin -g kevin -m 750 /home/kevin/bin /home/kevin/documents
for f in notes-recettes.txt fournisseurs.csv planning-salons.txt; do
  echo "[document de démonstration] ${f} de Kevin" > "/home/kevin/documents/${f}"
done
chown kevin:kevin /home/kevin/documents/*
install -o kevin -g kevin -m 755 "$F/synchro-perso" /home/kevin/bin/synchro-perso
setsid setpriv --reuid=kevin --regid=kevin --init-groups --reset-env /home/kevin/bin/synchro-perso </dev/null >/dev/null 2>&1 &
disown || true

info "sauvegarde des configurations touchées par le lab"
cp -a /etc/security/pwquality.conf "${ETAT_DIR}/lab05.pwquality.conf" 2>/dev/null || true
ls /etc/security/pwquality.conf.d/ 2>/dev/null > "${ETAT_DIR}/lab05.pwquality.d" || true
ls /etc/systemd/journald.conf.d/ 2>/dev/null > "${ETAT_DIR}/lab05.journald.d" || true
cp -a /etc/systemd/journald.conf "${ETAT_DIR}/lab05.journald.conf"

info "Bastien a « économisé le disque » : journal en mémoire seulement"
mkdir -p /etc/systemd/journald.conf.d
cat > /etc/systemd/journald.conf.d/50-economie.conf <<'FIN'
# Pour économiser le disque (Bastien)
[Journal]
Storage=volatile
FIN
systemctl restart systemd-journald

info "le journal des commandes de la boutique"
install -d -m 755 /var/log/boutique
: > /var/log/boutique/commandes.log
for i in $(seq 1 60000); do echo "2026-10-$(( i % 28 + 1 )) 12:00:00 commande $i validée (archive)"; done >> /var/log/boutique/commandes.log
chown malik:boutique /var/log/boutique/commandes.log
chmod 640 /var/log/boutique/commandes.log
install -d -m 755 /usr/local/lib/hlw
install -m 755 "$F/ecrit-commandes" /usr/local/lib/hlw/ecrit-commandes
setsid setpriv --reuid=malik --regid=malik --init-groups --reset-env /usr/local/lib/hlw/ecrit-commandes </dev/null >/dev/null 2>&1 &
disown || true

info "cette nuit, quelqu’un a frappé à la porte SSH…"
ips=(203.0.113.42 198.51.100.7 192.0.2.99)
mapfile -t comptes < <(printf '%s\n' 37 12 5 | shuf)
noms=(admin root test oracle postgres ubuntu pi deploy)
for k in 0 1 2; do
  for ((j = 0; j < comptes[k]; j++)); do
    logger -t sshd -p authpriv.notice \
      "Failed password for invalid user ${noms[j % 8]} from ${ips[k]} port $((40000 + j * 37 % 20000)) ssh2"
  done
done
logger -t sshd -p authpriv.info "Accepted publickey for admin from 192.168.1.10 port 52814 ssh2"
for k in 0 1 2; do [[ "${comptes[k]}" == 37 ]] && echo "${ips[k]}" > "${ETAT_DIR}/lab05.ip"; done

sleep 1
touch "${ETAT_DIR}/lab05.debut"
info "situation de départ prête : lis le ticket dans le README du lab"
