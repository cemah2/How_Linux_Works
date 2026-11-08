#!/usr/bin/env bash
# Déploie les VM d'un scénario de labo à partir des modèles cloud-init.
#
#   ./deployer.sh base      # cuve (Debian 13) + fut (Rocky 10) : Labs 00 à 06
#   ./deployer.sh reseau    # + pont isolé, douane (routeur) et comptoir (poste) : Labs 07, 08, 10
#   ./deployer.sh liste     # affiche les scénarios
#
# Chaque VM reçoit : ton utilisateur et ta clé SSH, le fuseau horaire, les paquets utiles,
# une copie du dépôt dans /opt/how-linux-works et la commande « lab ».

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
charger_config
verifier_proxmox

# Valeurs par défaut des réglages ajoutés après la première version de lab.conf
PONT_LAB="${PONT_LAB:-vmbr9}"
ID_DOUANE="${ID_DOUANE:-213}"
ID_COMPTOIR="${ID_COMPTOIR:-214}"
IP_DOUANE="${IP_DOUANE:-}"
IP_COMPTOIR="${IP_COMPTOIR:-}"

usage() {
  cat <<EOF
Usage : $0 SCÉNARIO
Scénarios disponibles :
  base     cuve (Debian 13, ID ${ID_CUVE}) et fut (Rocky 10, ID ${ID_FUT})                      — Labs 00 à 06
  reseau   pont isolé ${PONT_LAB}, douane (Debian 13, ID ${ID_DOUANE}, routeur à deux cartes),
           comptoir (Rocky 10, ID ${ID_COMPTOIR}, poste du réseau interne), et une 2ᵉ carte pour cuve  — Labs 07, 08, 10
EOF
}

preparer_snippet() { # nom du snippet (sans .yaml)
  local source dest
  source="${ICI}/snippets/$1.yaml"
  dest="$(chemin_snippet "$1.yaml")"
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

# Exécute une commande shell DANS la VM, par l'agent invité. Vrai si elle réussit.
executer_dans() { # id "commande"
  qm guest exec "$1" --timeout 300 -- bash -c "$2" 2>/dev/null | grep -Eq '"exitcode" *: *0([^0-9]|$)'
}

# Attend la fin du premier démarrage (cloud-init a installé la commande lab).
attendre_preparation() { # id nom
  local essais=120
  while (( essais-- > 0 )); do
    executer_dans "$1" 'test -x /usr/local/bin/lab' && return 0
    sleep 5
  done
  return 1
}

# nom id modèle snippet ip [options qm set supplémentaires…]
deployer_vm() {
  local nom="$1" id="$2" modele="$3" snippet="$4" ip="$5" ipconfig
  shift 5
  if vm_existe "$id"; then
    alerte "la VM ${id} existe déjà : « ${nom} » conservée"
    return 1
  fi
  vm_existe "$modele" || mourir "modèle ${modele} absent : lance d'abord ./creer-modeles.sh"

  info "clonage de ${nom} (ID ${id}) depuis le modèle ${modele}"
  if [[ "$CLONES_LIES" == "1" ]]; then
    qm clone "$modele" "$id" --name "$nom" --full 0
  else
    qm clone "$modele" "$id" --name "$nom" --full 1 --storage "$STOCKAGE"
  fi

  if [[ "$MODE_IP" == "dhcp" || -z "$ip" ]]; then
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
    --cicustom "vendor=${STOCKAGE_SNIPPETS}:snippets/${snippet}.yaml" \
    --onboot 0 "$@" >/dev/null
  if [[ "$MODE_IP" != "dhcp" && -n "$ip" ]]; then qm set "$id" --nameserver "$DNS" >/dev/null; fi
  if [[ -n "$MOT_DE_PASSE" ]]; then qm set "$id" --cipassword "$MOT_DE_PASSE" >/dev/null; fi

  qm start "$id"
  succes "${nom} démarrée"
}

verifier_acces() {
  [[ -s "$CLE_SSH" ]] || mourir "clé SSH publique introuvable : ${CLE_SSH} (voir CLE_SSH dans lab.conf)"
  grep -q '^ssh-' "$CLE_SSH" || mourir "${CLE_SSH} ne ressemble pas à une clé publique (elle doit commencer par ssh-)"
  verifier_snippets
}

# --- Scénario base -------------------------------------------------------------
scenario_base() {
  verifier_acces
  preparer_snippet hlw-debian
  preparer_snippet hlw-rocky
  deployer_vm cuve "$ID_CUVE" "$ID_MODELE_DEBIAN" hlw-debian "$IP_CUVE" || true
  deployer_vm fut "$ID_FUT" "$ID_MODELE_ROCKY" hlw-rocky "$IP_FUT" || true

  info "attente du premier démarrage (cloud-init installe les paquets : 2 à 5 minutes)…"
  local config_ssh="" nom id adresse
  for nom in cuve fut; do
    if [[ "$nom" == cuve ]]; then id="$ID_CUVE"; else id="$ID_FUT"; fi
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
}

# --- Scénario reseau -----------------------------------------------------------
pont_existe() { ip link show "$1" >/dev/null 2>&1; }

assurer_pont() {
  if pont_existe "$PONT_LAB"; then
    succes "pont isolé ${PONT_LAB} présent"
    return
  fi
  [[ "$PONT_LAB" =~ ^vmbr[0-9]{1,4}$ ]] || mourir "PONT_LAB=« ${PONT_LAB} » : Proxmox attend un nom de la forme vmbrN"
  info "création du pont isolé ${PONT_LAB} (aucune carte physique : rien ne sort du labo par lui)"
  local noeud
  noeud="$(hostname)"
  pvesh create "/nodes/${noeud}/network" --iface "$PONT_LAB" --type bridge --autostart 1 \
    --comments "How Linux Works : reseau interne de la brasserie (isole)" >/dev/null
  pvesh set "/nodes/${noeud}/network" >/dev/null      # applique la configuration (ifupdown2)
  pont_existe "$PONT_LAB" || mourir "le pont ${PONT_LAB} n'a pas pu être activé. Crée-le dans l'interface (Système > Réseau > Créer > Linux Bridge, sans port) puis relance."
  succes "pont ${PONT_LAB} créé"
}

mac_de() { qm config "$1" | sed -nE "s/^$2: [a-z0-9]+=([0-9A-Fa-f:]{17}).*/\1/p"; }

scenario_reseau() {
  verifier_acces
  assurer_pont
  preparer_snippet hlw-debian
  preparer_snippet hlw-comptoir

  local nouvelle_douane=0 nouveau_comptoir=0
  # douane : eth0 vers ton réseau (Internet), eth1 vers le réseau interne (non configurée : c'est le Lab 07)
  if deployer_vm douane "$ID_DOUANE" "$ID_MODELE_DEBIAN" hlw-debian "$IP_DOUANE" --net1 "virtio,bridge=${PONT_LAB}"; then
    nouvelle_douane=1
  fi
  # comptoir : d'abord sur ton réseau pour installer ses paquets, puis basculé sur le réseau interne
  if deployer_vm comptoir "$ID_COMPTOIR" "$ID_MODELE_ROCKY" hlw-comptoir "$IP_COMPTOIR"; then
    nouveau_comptoir=1
  fi

  info "attente du premier démarrage de douane et comptoir (installation des paquets : 3 à 6 minutes)…"
  if (( nouvelle_douane )); then
    if attendre_preparation "$ID_DOUANE"; then
      # cloud-init ne doit plus toucher au réseau : c'est toi qui configureras eth1
      executer_dans "$ID_DOUANE" 'touch /etc/cloud/cloud-init.disabled' || alerte "douane : impossible de désactiver cloud-init"
      succes "douane prête"
    else
      alerte "douane : préparation non terminée après 10 minutes ; regarde sa console (journalctl -u cloud-final)"
    fi
  fi
  if (( nouveau_comptoir )); then
    if attendre_preparation "$ID_COMPTOIR"; then
      # Profil réseau en DHCP (c'est douane qui le servira), puis plus de cloud-init
      executer_dans "$ID_COMPTOIR" '
        c="$(nmcli -g NAME,DEVICE connection show | awk -F: "\$2 == \"eth0\" {print \$1; exit}")"
        [ -n "$c" ] && nmcli connection modify "$c" ipv4.method auto ipv4.addresses "" ipv4.gateway "" ipv4.dns ""
        touch /etc/cloud/cloud-init.disabled' || alerte "comptoir : réglage réseau incomplet"
      local mac
      mac="$(mac_de "$ID_COMPTOIR" net0)"
      info "bascule de comptoir sur le réseau interne ${PONT_LAB}"
      qm set "$ID_COMPTOIR" --net0 "virtio=${mac},bridge=${PONT_LAB}" >/dev/null
      qm reboot "$ID_COMPTOIR" >/dev/null 2>&1 || { qm stop "$ID_COMPTOIR"; qm start "$ID_COMPTOIR"; }
      succes "comptoir prêt, branché sur ${PONT_LAB} (sans adresse tant que douane ne fait pas DHCP)"
    else
      alerte "comptoir : préparation non terminée après 10 minutes ; il reste sur ${PONT} pour l'instant. Regarde sa console, puis relance ce script."
    fi
  fi

  # cuve : une deuxième carte sur le réseau interne
  if vm_existe "$ID_CUVE"; then
    if qm config "$ID_CUVE" | grep -q '^net1:'; then
      succes "cuve a déjà une carte sur le réseau interne"
    elif executer_dans "$ID_CUVE" 'touch /etc/cloud/cloud-init.disabled'; then
      # cloud-init désactivé d'abord : sinon il traiterait cuve comme une nouvelle instance au
      # prochain démarrage (nouvelles clés d'hôte SSH, interfaces renommées)
      qm set "$ID_CUVE" --net1 "virtio,bridge=${PONT_LAB}" >/dev/null
      succes "cuve : deuxième carte ajoutée sur ${PONT_LAB} (à configurer au Lab 07)"
    else
      alerte "cuve : agent invité injoignable (VM éteinte ?). Démarre cuve et relance ce script."
    fi
  else
    alerte "cuve n'existe pas : lance d'abord ./deployer.sh base"
  fi

  local adresse_douane=""
  adresse_douane="$(attendre_ip "$ID_DOUANE")" || true
  cat <<EOF

${C_GRAS}Ajoute ceci à ~/.ssh/config sur TON ordinateur :${C_RAZ}

Host douane
    HostName ${adresse_douane:-ADRESSE_DE_DOUANE}
    User ${UTILISATEUR}
Host comptoir
    HostName 192.168.50.100
    User ${UTILISATEUR}
    ProxyJump douane

« ssh douane » fonctionne tout de suite. comptoir n'a pas encore d'adresse : c'est le but du Lab 07.
En attendant, sa console est dans l'interface Proxmox (VM ${ID_COMPTOIR} > Console).
Ensuite, fige l'état propre de toutes les VM :  ./instantane.sh creer reseau-propre
EOF
}

[[ $# -eq 1 ]] || { usage; exit 1; }
case "$1" in
  base) scenario_base ;;
  reseau|réseau) scenario_reseau ;;
  liste) usage ;;
  *) usage; exit 1 ;;
esac
