#!/usr/bin/env bash
# Supprime définitivement les VM du labo (étiquette « hlw »).
#
#   ./detruire.sh             # les VM du labo (demande confirmation)
#   ./detruire.sh --modeles   # les VM ET les modèles

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
verifier_proxmox

mapfile -t cibles < <(vms_du_labo)
if [[ "${1:-}" == "--modeles" ]]; then
  while read -r id; do
    a_etiquette "$id" hlwmodele && cibles+=("$id")
  done < <(qm list | awk 'NR>1 {print $1}')
fi
(( ${#cibles[@]} )) || { info "rien à supprimer"; exit 0; }

echo "Ces VM vont être SUPPRIMÉES définitivement, disques et instantanés compris :"
for id in "${cibles[@]}"; do echo "  ${id}  $(nom_vm "$id")"; done
read -r -p "Tape « oui » pour confirmer : " reponse
[[ "$reponse" == "oui" ]] || { info "abandon"; exit 0; }

for id in "${cibles[@]}"; do
  if qm status "$id" | grep -q running; then qm stop "$id" --skiplock 1; fi
  qm destroy "$id" --purge 1 --destroy-unreferenced-disks 1
  succes "VM ${id} supprimée"
done
