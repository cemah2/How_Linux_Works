#!/usr/bin/env bash
# Déploie les VM d'un scénario de labo à partir des modèles cloud-init.
#
#   ./deployer.sh base      # cuve (Debian 13) + fut (Rocky 10) : Labs 00 à 06
#   ./deployer.sh liste     # affiche les scénarios
#
# Chaque VM reçoit : ton utilisateur et ta clé SSH, le fuseau horaire, les paquets utiles,
# une copie du dépôt dans /opt/how-linux-works et la commande « lab ».

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
charger_config
verifier_proxmox

# Scénarios : « nom:id:modèle:famille:ip » séparés par des espaces
scenario() {
  case "$1" in
    base)
      echo "cuve:${ID_CUVE}:${ID_MODELE_DEBIAN}:debian:${IP_CUVE} fut:${ID_FUT}:${ID_MODELE_ROCKY}:rocky:${IP_FUT}"
      ;;
    *) return 1 ;;
  esac
}

usage() {
  cat <<EOF
Usage : $0 SCÉNARIO
Scénarios disponibles :
  base   cuve (Debian 13, ID ${ID_CUVE}) et fut (Rocky 10, ID ${ID_FUT}) — Labs 00 à 06
(Le scénario « reseau », avec douane et comptoir sur un pont isolé, arrivera avec le Lab 07.)
EOF
}

preparer_snippet() {
  local famille="$1" source dest
  source="${ICI}/snippets/hlw-${famille}.yaml"
  dest="$(chemin_snippet "hlw-${famille}.yaml")"
  mkdir -p "$(dirname "$dest")"
  sed -e "s|@DEPOT@|${DEPOT}|g" -e "s|@BRANCHE@|${BRANCHE}|g" -e "s|@FUSEAU@|${FUSEAU}|g" "$source" > "$dest"
}

attendre_ip() {
  local id="$1" essais=60 ip=""
  while (( essais-- > 0 )); do
    if ip="$(qm agent "$id" network-get-interfaces 2>/dev/null \
        | grep -oE '"ip-address" *: *"[0-9]+(\.[0-9]+){3}"' \
        | grep -oE '[0-9]+(\.[0-9]+){3}' | grep -v '^127\.' | head -1)" && [[ -n "$ip" ]]; then
      echo "$ip"; return 0
    fi
    sleep 5
  done
  return 1
}

deployer_vm() {
  local nom="$1" id="$2" modele="$3" famille="$4" ip="$5" ipconfig
  if vm_existe "$id"; then
    alerte "la VM ${id} existe déjà : « ${nom} » conservée"
    return
  fi
  vm_existe "$modele" || mourir "modèle ${modele} absent : lance d'abord ./creer-modeles.sh"

  info "clonage de ${nom} (ID ${id}) depuis le modèle ${modele}"
  if [[ "$CLONES_LIES" == "1" ]]; then
    qm clone "$modele" "$id" --name "$nom" --full 0
  else
    qm clone "$modele" "$id" --name "$nom" --full 1 --storage "$STOCKAGE"
  fi

  if [[ "$MODE_IP" == "dhcp" ]]; then
    ipconfig="ip=dhcp"
  else
    ipconfig="ip=${ip},gw=${PASSERELLE}"
  fi

  qm set "$id" \
    --tags "hlw;${nom}" \
    --cpu "$TYPE_CPU" \
    --ciuser "$UTILISATEUR" \
    --sshkeys "$CLE_SSH" \
    --ipconfig0 "$ipconfig" \
    --cicustom "vendor=${STOCKAGE_SNIPPETS}:snippets/hlw-${famille}.yaml" \
    --onboot 0 >/dev/null
  if [[ "$MODE_IP" != "dhcp" ]]; then qm set "$id" --nameserver "$DNS" >/dev/null; fi
  if [[ -n "$MOT_DE_PASSE" ]]; then qm set "$id" --cipassword "$MOT_DE_PASSE" >/dev/null; fi

  qm start "$id"
  succes "${nom} démarrée"
}

[[ $# -eq 1 ]] || { usage; exit 1; }
[[ "$1" == "liste" ]] && { usage; exit 0; }
vms="$(scenario "$1")" || { usage; exit 1; }

[[ -s "$CLE_SSH" ]] || mourir "clé SSH publique introuvable : ${CLE_SSH} (voir CLE_SSH dans lab.conf)"
grep -q '^ssh-' "$CLE_SSH" || mourir "${CLE_SSH} ne ressemble pas à une clé publique (elle doit commencer par ssh-)"
verifier_snippets

preparer_snippet debian
preparer_snippet rocky

for v in $vms; do
  IFS=: read -r nom id modele famille ip <<<"$v"
  deployer_vm "$nom" "$id" "$modele" "$famille" "$ip"
done

info "attente du premier démarrage (cloud-init installe les paquets : 2 à 5 minutes)…"
config_ssh=""
for v in $vms; do
  IFS=: read -r nom id _ _ _ <<<"$v"
  if adresse="$(attendre_ip "$id")"; then
    succes "${nom} : ${adresse}"
    config_ssh+=$'\n'"Host ${nom}"$'\n'"    HostName ${adresse}"$'\n'"    User ${UTILISATEUR}"$'\n'
  else
    alerte "${nom} : adresse IP non obtenue (agent invité pas encore prêt ?). Consulte la console de la VM ${id}."
  fi
done

cat <<EOF

${C_GRAS}Ajoute ceci à ~/.ssh/config sur TON ordinateur :${C_RAZ}
${config_ssh}
Puis, depuis ton ordinateur :  ssh cuve   et dans la VM :  lab check 00
Quand tout est vert, fige l'état propre :  ./instantane.sh creer propre
EOF
