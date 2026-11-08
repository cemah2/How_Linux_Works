# shellcheck shell=bash
# Fonctions communes aux scripts Proxmox du labo. À sourcer, pas à exécuter.

set -euo pipefail

ICI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -t 1 ]]; then
  C_VERT=$'\e[32m'; C_ROUGE=$'\e[31m'; C_JAUNE=$'\e[33m'; C_GRAS=$'\e[1m'; C_RAZ=$'\e[0m'
else
  C_VERT=''; C_ROUGE=''; C_JAUNE=''; C_GRAS=''; C_RAZ=''
fi

info()   { printf '%s==>%s %s\n' "$C_GRAS" "$C_RAZ" "$*"; }
succes() { printf '%s ok %s %s\n' "$C_VERT" "$C_RAZ" "$*"; }
alerte() { printf '%s !! %s %s\n' "$C_JAUNE" "$C_RAZ" "$*" >&2; }
mourir() { printf '%sERREUR%s %s\n' "$C_ROUGE" "$C_RAZ" "$*" >&2; exit 1; }

charger_config() {
  local conf="${ICI}/lab.conf"
  [[ -f "$conf" ]] || mourir "fichier ${conf} absent. Copie lab.conf.exemple en lab.conf et adapte-le."
  # shellcheck source=/dev/null
  source "$conf"
}

verifier_proxmox() {
  [[ $EUID -eq 0 ]] || mourir "lance ce script en root sur l'hôte Proxmox."
  command -v qm >/dev/null 2>&1 || mourir "commande qm introuvable : ce script doit tourner sur un hôte Proxmox VE."
  command -v pvesm >/dev/null 2>&1 || mourir "commande pvesm introuvable."
}

vm_existe() { qm status "$1" >/dev/null 2>&1; }

# Chemin réel d'un fichier dans le stockage de snippets (ex. /var/lib/vz/snippets/x.yaml)
chemin_snippet() { pvesm path "${STOCKAGE_SNIPPETS}:snippets/$1"; }

verifier_snippets() {
  local contenu
  contenu="$(pvesm status --content snippets 2>/dev/null | awk 'NR>1 {print $1}')"
  if ! grep -qx "$STOCKAGE_SNIPPETS" <<<"$contenu"; then
    mourir "le stockage « ${STOCKAGE_SNIPPETS} » n'accepte pas les snippets.
Active-les (une seule fois) puis relance :
    pvesm set ${STOCKAGE_SNIPPETS} --content iso,vztmpl,backup,snippets
(ajuste la liste pour conserver les types déjà activés : pvesm status --verbose)"
  fi
}

# Vrai si la VM porte exactement l'étiquette donnée (les étiquettes sont séparées par « ; »)
a_etiquette() {
  qm config "$1" 2>/dev/null | awk -F': ' '/^tags:/ {print $2}' | sed 's/[;,]/\n/g' | grep -qx "$2"
}

# Liste des VM du labo (étiquette « hlw » ; les modèles portent « hlwmodele »)
vms_du_labo() {
  qm list 2>/dev/null | awk 'NR>1 {print $1}' | while read -r id; do
    if a_etiquette "$id" hlw; then echo "$id"; fi
  done
}

nom_vm() { qm config "$1" | awk '/^name:/ {print $2}'; }
