#!/usr/bin/env bash
# Lab 00 : vérifie qu'une VM du labo est correctement installée.
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
UTIL="${LAB_UTILISATEUR:-${SUDO_USER:-admin}}"
MAISON="$(getent passwd "$UTIL" | cut -d: -f6)"

objectif "Distribution attendue (Debian 13 ou Rocky Linux 10) — détectée : ${DISTRIB}"
version_ok() {
  case "${ID:-}" in
    debian) [[ "${VERSION_ID:-}" == 13* ]] ;;
    rocky|almalinux|rhel) [[ "${VERSION_ID:-}" == 10* || "${VERSION_ID:-}" == 9* ]] ;;
    *) return 1 ;;
  esac
}
exiger "distribution non prévue par le labo (les labs restent utilisables, mais certains détails peuvent différer)" version_ok
fin_objectif

objectif "Nom de machine conforme au fil rouge (cuve, fut, douane ou comptoir) — actuel : $(hostname -s)"
exiger "le nom de la VM dans Proxmox devrait être cuve ou fut (cloud-init le reprend comme nom de machine)" \
  bash -c '[[ "$(hostname -s)" =~ ^(cuve|fut|douane|comptoir)$ ]]'
fin_objectif

objectif "Ton compte « ${UTIL} » peut administrer la machine avec sudo"
exiger "l’utilisateur ${UTIL} n’existe pas" utilisateur_existe "$UTIL"
exiger "sudo -l -U ${UTIL} ne montre pas de droit complet (ALL)" bash -c "sudo -l -U '$UTIL' | grep -q 'ALL'"
fin_objectif

objectif "Connexion SSH par clé configurée"
exiger "${MAISON}/.ssh/authorized_keys est absent ou vide" test -s "${MAISON}/.ssh/authorized_keys"
exiger "aucune clé publique reconnue dans authorized_keys" grep -Eq '^(ssh-(ed25519|rsa)|ecdsa-sha2-)' "${MAISON}/.ssh/authorized_keys"
exiger "droits trop larges sur ~/.ssh (sshd refuse les clés si le répertoire est accessible aux autres)" \
  bash -c "[[ -z \"\$(find '${MAISON}/.ssh' -maxdepth 0 -perm /go=w)\" ]]"
fin_objectif

objectif "Premier démarrage cloud-init terminé"
if command -v cloud-init >/dev/null 2>&1; then
  exiger "cloud-init n’a pas fini (attends un peu, puis : cloud-init status --long)" bash -c 'cloud-init status 2>/dev/null | grep -q "status: done"'
else
  exiger "cloud-init absent de cette machine" false
fi
fin_objectif

objectif "Agent invité QEMU actif (Proxmox connaît l’adresse IP de la VM)"
if a_systemd; then
  exiger "qemu-guest-agent n’est pas actif : sudo systemctl enable --now qemu-guest-agent" systemctl is-active --quiet qemu-guest-agent
else
  exiger "systemd absent : cette machine n’est pas une VM du labo" false
fi
fin_objectif

objectif "Accès à Internet et résolution de noms"
exiger "le nom deb.debian.org ne se résout pas (DNS ?)" getent hosts deb.debian.org
exiger "pas d’accès HTTPS sortant (passerelle, pare-feu ?)" curl -sSI --max-time 8 https://deb.debian.org
fin_objectif

objectif "Horloge synchronisée (NTP)"
if command -v timedatectl >/dev/null 2>&1; then
  exiger "l’horloge n’est pas encore synchronisée (timedatectl status) : attends quelques minutes" \
    bash -c 'timedatectl show -p NTPSynchronized --value | grep -qx yes'
else
  exiger "timedatectl absent" false
fi
fin_objectif

objectif "Processeur compatible x86-64-v3 (indispensable pour Rocky Linux 10)"
if [[ "$FAMILLE" == "redhat" ]]; then
  exiger "AVX2 absent : règle le type de CPU de la VM sur « host » dans Proxmox" grep -qw avx2 /proc/cpuinfo
else
  # Sur Debian, simple information : la VM « fut » en aura besoin.
  grep -qw avx2 /proc/cpuinfo || alerte "AVX2 absent sur cette VM : la VM Rocky (fut) devra utiliser le type de CPU « host »."
fi
fin_objectif

objectif "Dépôt du cahier et commande « lab » installés"
exiger "dépôt absent de ${LABS_DIR%/labs}" test -d "${LABS_DIR%/labs}/.git"
exiger "la commande lab n’est pas dans /usr/local/bin" test -x /usr/local/bin/lab
fin_objectif

bilan 00
