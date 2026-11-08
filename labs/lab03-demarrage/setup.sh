#!/usr/bin/env bash
# Lab 03 : installe les services de la brasserie (en état de marche) et vérifie les prérequis.
# La panne elle-même est déclenchée ensuite par « lab panne 03 » (panne.sh).
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -euo pipefail
ICI="$(dirname "$(readlink -f "$0")")"

a_systemd || { alerte "ce lab nécessite systemd"; exit 1; }
"$ICI/reset.sh" --silencieux

mkdir -p "$ETAT_DIR"
systemctl get-default > "${ETAT_DIR}/lab03.cible"

info "installation des services de la brasserie : brassd et collecte-capteurs"
install -m 755 "$ICI/fichiers/brassd" /usr/local/bin/brassd
install -d -m 755 /usr/local/lib/hlw
install -m 755 "$ICI/fichiers/collecte-capteurs" /usr/local/lib/hlw/collecte-capteurs
install -m 644 "$ICI/fichiers/brassd.service" /etc/systemd/system/brassd.service
install -m 644 "$ICI/fichiers/collecte-capteurs.service" /etc/systemd/system/collecte-capteurs.service
systemctl daemon-reload
systemctl enable --now brassd.service collecte-capteurs.service >/dev/null 2>&1

etat_root="$(passwd -S root 2>/dev/null | awk '{print $2}')"
echo
if [[ "$etat_root" == P || "$etat_root" == PS ]]; then
  info "le compte root a un mot de passe : le mode secours sera accessible"
else
  alerte "le compte root n’a PAS de mot de passe utilisable (état : ${etat_root:-inconnu})."
  alerte "En mode secours, systemd demande ce mot de passe : sans lui, tu seras bloqué."
  alerte "Définis-en un MAINTENANT :  sudo passwd root"
fi
cat <<'FIN'

Prochaines étapes (détaillées dans le README) :
  1. sudo passwd root                      (si ce n’est pas déjà fait)
  2. sur Proxmox : ./instantane.sh creer avant-lab03
  3. ouvre la console de la VM dans Proxmox (VM → Console) et garde-la sous la main
  4. lab panne 03                          (la VM redémarre… en panne)
FIN
