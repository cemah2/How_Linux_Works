#!/usr/bin/env bash
# Instantanés de toutes les VM du labo (étiquette « hlw »).
#
#   ./instantane.sh creer NOM        # ex. : ./instantane.sh creer avant-lab02
#   ./instantane.sh restaurer NOM    # revient à l'instantané (et redémarre les VM)
#   ./instantane.sh liste            # instantanés existants
#   ./instantane.sh supprimer NOM

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
verifier_proxmox

action="${1:-liste}"
nom="${2:-}"
mapfile -t vms < <(vms_du_labo)
(( ${#vms[@]} )) || mourir "aucune VM du labo trouvée (étiquette hlw). Lance d'abord ./deployer.sh base"

valider_nom() {
  [[ -n "$nom" ]] || mourir "précise un nom d'instantané (lettres, chiffres, tirets)"
  [[ "$nom" =~ ^[A-Za-z][A-Za-z0-9_-]*$ ]] || mourir "nom invalide « ${nom} » : commence par une lettre, puis lettres, chiffres, - ou _"
}

case "$action" in
  creer)
    valider_nom
    for id in "${vms[@]}"; do
      info "instantané « ${nom} » de $(nom_vm "$id") (${id})"
      qm snapshot "$id" "$nom" --description "Labo How Linux Works, $(date '+%F %T')"
    done
    succes "instantanés créés"
    ;;
  restaurer)
    valider_nom
    for id in "${vms[@]}"; do
      info "retour de $(nom_vm "$id") (${id}) à « ${nom} »"
      qm rollback "$id" "$nom"
      if ! qm status "$id" | grep -q running; then qm start "$id"; fi
    done
    succes "VM restaurées"
    ;;
  supprimer)
    valider_nom
    for id in "${vms[@]}"; do qm delsnapshot "$id" "$nom" && succes "$(nom_vm "$id") : « ${nom} » supprimé"; done
    ;;
  liste)
    for id in "${vms[@]}"; do
      printf '%s%s (%s)%s\n' "$C_GRAS" "$(nom_vm "$id")" "$id" "$C_RAZ"
      qm listsnapshot "$id"
    done
    ;;
  *) mourir "action inconnue : ${action} (creer, restaurer, liste, supprimer)" ;;
esac
