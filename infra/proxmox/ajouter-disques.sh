#!/usr/bin/env bash
# Ajoute des disques vierges à une VM du labo (Lab 02), ou les retire.
#
#   ./ajouter-disques.sh cuve              # 2 disques de 2 Go sur cuve
#   ./ajouter-disques.sh fut 3 4           # 3 disques de 4 Go sur fut
#   ./ajouter-disques.sh 211               # par identifiant
#   ./ajouter-disques.sh cuve --retirer    # détruit les disques ajoutés par ce script
#
# Les disques sont ajoutés à chaud (la VM peut tourner) sur le contrôleur SCSI, avec un numéro
# de série « hlw-lab-N » : le Lab 02 les reconnaît ainsi, et --retirer ne touche qu'à eux.

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
charger_config
verifier_proxmox

usage() { sed -n '4,9p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

[[ $# -ge 1 ]] || { usage; exit 1; }
cible="$1"; shift

# Nom ou identifiant → identifiant d'une VM du labo
if [[ "$cible" =~ ^[0-9]+$ ]]; then
  id="$cible"
else
  id=""
  for v in $(vms_du_labo); do
    [[ "$(nom_vm "$v")" == "$cible" ]] && { id="$v"; break; }
  done
  [[ -n "$id" ]] || mourir "aucune VM du labo ne s'appelle « ${cible} » (VM étiquetées hlw : $(vms_du_labo | tr '\n' ' '))"
fi
vm_existe "$id" || mourir "la VM ${id} n'existe pas"
a_etiquette "$id" hlw || mourir "la VM ${id} ne porte pas l'étiquette hlw : par sécurité, ce script ne touche qu'aux VM du labo"

if [[ "${1:-}" == "--retirer" ]]; then
  a_retirer="$(qm config "$id" | sed -nE 's/^(scsi[1-9]):.*serial=hlw-lab-.*/\1/p' | paste -sd, -)"
  [[ -n "$a_retirer" ]] || { info "aucun disque du labo à retirer sur la VM ${id}"; exit 0; }
  alerte "les disques ${a_retirer} de la VM ${id} vont être DÉTRUITS (fais d'abord « lab reset 02 » dans la VM)."
  read -r -p "Confirmer ? [o/N] " r
  [[ "$r" =~ ^[oOyY]$ ]] || exit 0
  qm disk unlink "$id" --idlist "$a_retirer" --force 1
  succes "disques ${a_retirer} retirés et détruits"
  exit 0
fi

nombre="${1:-2}"
taille="${2:-2}"
[[ "$nombre" =~ ^[1-8]$ ]] || mourir "nombre de disques : de 1 à 8"
if ! [[ "$taille" =~ ^[0-9]+$ ]] || (( taille < 1 || taille > 64 )); then mourir "taille en Go : de 1 à 64"; fi

config="$(qm config "$id")"
ajoutes=0
deja="$(grep -cE '^scsi[1-9]:.*serial=hlw-lab-' <<<"$config" || true)"
for n in 1 2 3 4 5 6 7 8 9; do
  (( ajoutes < nombre )) || break
  grep -q "^scsi${n}:" <<<"$config" && continue
  serie="hlw-lab-$((deja + ajoutes + 1))"
  info "ajout de scsi${n} : ${taille} Go sur ${STOCKAGE} (série ${serie})"
  qm set "$id" --"scsi${n}" "${STOCKAGE}:${taille},serial=${serie},discard=on" >/dev/null
  ajoutes=$((ajoutes + 1))
done
(( ajoutes == nombre )) || mourir "plus d'emplacement SCSI libre : ${ajoutes} disque(s) ajouté(s) sur ${nombre}"

succes "${ajoutes} disque(s) ajouté(s) à la VM ${id}"
cat <<EOF

Dans la VM, vérifie qu'ils sont visibles :   lsblk -o NAME,SIZE,SERIAL,TYPE,MOUNTPOINTS
(si la VM était éteinte, démarre-la : qm start ${id})
Puis : lab start 02
EOF
