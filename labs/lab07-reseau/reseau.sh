# shellcheck shell=bash
# Lab 07 : fonctions communes à setup.sh, check.sh et reset.sh (rôle de la machine, interfaces).

LAN_RESEAU="192.168.50"
IP_DOUANE_LAN="${LAN_RESEAU}.1"
IP_CUVE_LAN="${LAN_RESEAU}.10"
IP_COMPTOIR_LAN="${LAN_RESEAU}.100"
DOMAINE="brasserie.lan"
export LAN_RESEAU IP_DOUANE_LAN IP_CUVE_LAN IP_COMPTOIR_LAN DOMAINE

# Rôle : le nom de la machine (douane, cuve, comptoir). LAB07_ROLE permet de le forcer (tests).
ROLE="${LAB07_ROLE:-$(hostname -s)}"

role_connu() { [[ "$ROLE" == douane || "$ROLE" == cuve || "$ROLE" == comptoir ]]; }

# Interface qui porte la route par défaut (externe)
iface_wan() { ip -4 route show default 2>/dev/null | awk '{for (i = 1; i < NF; i++) if ($i == "dev") {print $(i + 1); exit}}'; }

# Interface interne : forcée par LAB07_LAN, sinon celle qui a déjà une adresse 192.168.50.x,
# sinon la première carte Ethernet qui n'est ni l'externe ni virtuelle.
iface_lan() {
  if [[ -n "${LAB07_LAN:-}" ]]; then echo "$LAB07_LAN"; return; fi
  local i wan
  i="$(ip -4 -o addr show 2>/dev/null | awk -v r="${LAN_RESEAU}." 'index($4, r) == 1 {print $2; exit}')"
  if [[ -n "$i" ]]; then echo "$i"; return; fi
  wan="$(iface_wan)"
  for i in /sys/class/net/*; do
    i="${i##*/}"
    [[ "$i" == lo || "$i" == "$wan" ]] && continue
    [[ "$i" =~ ^(docker|veth|br-|virbr|tun|tap|wg) ]] && continue
    [[ "$(cat "/sys/class/net/$i/type" 2>/dev/null)" == 1 ]] || continue
    echo "$i"; return
  done
}

adresse_de() { ip -4 -o addr show dev "$1" 2>/dev/null | awk '{print $4; exit}'; }
a_adresse() { ip -4 -o addr show dev "$1" 2>/dev/null | awk '{print $4}' | grep -qx "$2"; }
repond_ping() { ping -c 1 -W 2 "$1" >/dev/null 2>&1; }

# Une adresse figure-t-elle dans une configuration réseau persistante ?
FICHIERS_RESEAU=(/etc/netplan /etc/systemd/network /etc/network/interfaces /etc/network/interfaces.d
  /etc/NetworkManager/system-connections)
adresse_persistante() { grep -rqsF "$1" "${FICHIERS_RESEAU[@]}"; }
