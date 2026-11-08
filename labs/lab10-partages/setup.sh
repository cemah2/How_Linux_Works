#!/usr/bin/env bash
# Lab 10 : à lancer sur cuve, comptoir ET douane, une fois les Labs 07 et 08 terminés.
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -euo pipefail
ICI="$(dirname "$(readlink -f "$0")")"
# shellcheck source=../lab07-reseau/reseau.sh
source "$ICI/../lab07-reseau/reseau.sh"
ROLE="${LAB10_ROLE:-$ROLE}"

if ! role_connu; then
  alerte "cette machine s’appelle « ${ROLE} » : le Lab 10 se joue sur cuve, comptoir et douane."
  exit 1
fi
"$ICI/reset.sh" --silencieux
mkdir -p "$ETAT_DIR"
sauvegarder() { tar -C / -czf "${ETAT_DIR}/lab10.etc.tar.gz" --ignore-failed-read "$@" 2>/dev/null || true; }
note_paquet() { paquet_installe "$1" && echo "$1" >> "${ETAT_DIR}/lab10.paquets-avant" || true; }

case "$ROLE" in
  cuve)
    a_adresse "$(iface_lan)" "${IP_CUVE_LAN}/24" || alerte "cuve n’a pas ${IP_CUVE_LAN} : termine d’abord le Lab 07"
    : > "${ETAT_DIR}/lab10.paquets-avant"; note_paquet nfs-kernel-server; note_paquet samba
    sauvegarder etc/exports etc/exports.d etc/samba
    assurer_compte 10 bastien "Bastien Roux, maître brasseur" brasseurs personnel
    assurer_compte 10 malik "Malik Benali, développeur de la boutique" boutique personnel
    info "les recettes à sauvegarder, les partages et les archives"
    install -d -m 2775 -o bastien -g brasseurs /srv/recettes /srv/recettes/ipa /srv/recettes/stout /srv/recettes/saisonnieres
    for r in ipa/noyau ipa/session ipa/double stout/tunnel stout/imperial saisonnieres/blanche saisonnieres/ambree saisonnieres/noel; do
      printf 'Recette %s\nMalts : …\nHoublons : …\nDensité initiale : 1,0%02d\n' "$r" $((40 + ${#r})) > "/srv/recettes/${r}.recette"
    done
    for t in ipa/essai-citra stout/brouillon saisonnieres/test-epices; do echo "brouillon" > "/srv/recettes/${t}.tmp"; done
    chown -R bastien:brasseurs /srv/recettes
    install -d -m 755 /srv/partages
    install -d -m 2775 -o bastien -g personnel /srv/partages/commun
    install -d -m 2770 -o root -g boutique /srv/partages/boutique
    install -d -m 755 /srv/archives
    for a in 2023 2024 2025; do echo "Bilan ${a} (document de démonstration)" > "/srv/archives/bilan-${a}.txt"; done
    ;;
  comptoir)
    repond_ping "$IP_CUVE_LAN" || alerte "le comptoir ne joint pas cuve : termine d’abord le Lab 07"
    sauvegarder etc/fstab
    assurer_compte 10 bastien "Bastien Roux, maître brasseur" brasseurs personnel
    assurer_compte 10 malik "Malik Benali, développeur de la boutique" boutique personnel
    for c in mount.nfs mount.cifs sshfs; do command -v "$c" >/dev/null || alerte "${c} absent : sudo dnf install nfs-utils cifs-utils fuse-sshfs"; done
    ;;
  douane)
    command -v rsync >/dev/null || installer_paquets rsync
    ;;
esac
touch "${ETAT_DIR}/lab10.debut"
info "rôle « ${ROLE} » prêt. Lis le ticket : less ${ICI}/README.md"
