#!/usr/bin/env bash
# Lab 07 : correction automatique, selon le rôle de la machine (ne modifie rien).
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
ICI="$(dirname "$(readlink -f "$0")")"
# shellcheck source=reseau.sh
source "$ICI/reseau.sh"

role_connu || { alerte "machine « ${ROLE} » : lance ce lab sur douane, cuve et comptoir"; exit 1; }
[[ -f "${ETAT_DIR}/lab07.debut" ]] || alerte "le lab n’a pas été démarré sur cette machine : lab start 07"
printf '%sRôle de cette machine : %s%s\n\n' "$C_GRAS" "$ROLE" "$C_RAZ"

LAN="$(iface_lan)"
WAN="$(iface_wan)"

# Interroge un serveur DNS précis ; affiche les réponses (adresses) seulement
dns() { dig +short +time=2 +tries=1 "@$1" "$2" A 2>/dev/null | grep -E '^[0-9]+(\.[0-9]+){3}$'; }
dns_donne() { [[ "$(dns "$1" "$2" | head -1)" == "$3" ]]; }
# Nom extérieur : la première résolution traverse dnsmasq puis les serveurs de douane (plus lent)
dns_externe() { dig +short +time=5 +tries=3 "@$1" "$2" A 2>/dev/null | grep -qE '^[0-9]+(\.[0-9]+){3}$'; }
resout_en() { [[ "$(getent ahostsv4 "$1" 2>/dev/null | awk 'NR == 1 {print $1}')" == "$2" ]]; }
resout() { getent ahostsv4 "$1" >/dev/null 2>&1; }
regles() { nft list ruleset 2>/dev/null; }
politique_drop() { regles | grep -Eq "hook $1 .*policy drop"; }
politique_drop_persistante() { grep -Eqs "hook $1 .*policy drop" /etc/nftables.conf /etc/nftables.d/*.nft /etc/nftables/*.nft; }
masquerade_active() { regles | grep -Eq 'masquerade|snat (ip )?to'; }
masquerade_persistante() { grep -Eqs 'masquerade|snat (ip )?to' /etc/nftables.conf /etc/nftables.d/*.nft /etc/nftables/*.nft; }
forward_actif() { [[ "$(sysctl -n net.ipv4.ip_forward 2>/dev/null)" == 1 ]]; }
forward_persistant() { grep -Eqs '^[[:space:]]*net\.ipv4\.(ip_forward|conf\.all\.forwarding)[[:space:]]*=[[:space:]]*1' /etc/sysctl.conf /etc/sysctl.d/*.conf; }
conf_dnsmasq() { cat /etc/dnsmasq.conf /etc/dnsmasq.d/* 2>/dev/null | grep -v '^[[:space:]]*#'; }
bail_comptoir() { grep -qs " ${IP_COMPTOIR_LAN} " /var/lib/misc/dnsmasq.leases /var/lib/dnsmasq/dnsmasq.leases; }
reservation() { conf_dnsmasq | grep -Eq "^[[:space:]]*dhcp-host=.*${IP_COMPTOIR_LAN//./\\.}([,[:space:]]|$)"; }
plage_dhcp() { conf_dnsmasq | grep -Eq "^[[:space:]]*dhcp-range=.*${LAN_RESEAU//./\\.}\."; }
dhcp_dynamique() { ip -4 -o addr show dev "$LAN" 2>/dev/null | grep -F "${IP_COMPTOIR_LAN}/24" | grep -q dynamic; }
passerelle_douane() { ip -4 route show default 2>/dev/null | grep -q "via ${IP_DOUANE_LAN} "; }
pas_de_defaut_interne() { ! ip -4 route show default 2>/dev/null | grep -q "via ${IP_DOUANE_LAN}"; }
internet_ok() { curl -fsS -o /dev/null --max-time 10 https://deb.debian.org/ 2>/dev/null || curl -fsS -o /dev/null --max-time 10 https://dl.rockylinux.org/ 2>/dev/null; }

case "$ROLE" in
# ---------------------------------------------------------------------------
douane)
  objectif "L’interface interne (${LAN:-?}) a l’adresse ${IP_DOUANE_LAN}/24, de façon persistante"
  exiger "aucune interface interne trouvée (seconde carte absente ?)" test -n "$LAN"
  exiger "${LAN:-l’interface interne} n’a pas l’adresse ${IP_DOUANE_LAN}/24 (ip -br a)" a_adresse "${LAN:-lo}" "${IP_DOUANE_LAN}/24"
  exiger "${IP_DOUANE_LAN}/24 n’apparaît dans aucune configuration persistante (/etc/netplan…) : elle disparaîtra au redémarrage" adresse_persistante "${IP_DOUANE_LAN}/24"
  fin_objectif

  objectif "douane transfère les paquets entre ses interfaces (routage), de façon persistante"
  exiger "net.ipv4.ip_forward vaut $(sysctl -n net.ipv4.ip_forward 2>/dev/null) (sysctl -w …)" forward_actif
  exiger "aucun fichier de /etc/sysctl.d/ (ou sysctl.conf) n’active ip_forward : perdu au redémarrage" forward_persistant
  fin_objectif

  objectif "dnsmasq distribue les adresses du réseau interne, avec une adresse réservée au comptoir"
  exiger "dnsmasq n’est pas actif (systemctl status dnsmasq ; journalctl -u dnsmasq)" unite_active dnsmasq
  exiger "dnsmasq n’est pas activé au démarrage" unite_activee dnsmasq
  exiger "aucune plage dhcp-range en ${LAN_RESEAU}.x dans la configuration de dnsmasq" plage_dhcp
  exiger "pas de réservation dhcp-host=…,${IP_COMPTOIR_LAN} pour le comptoir" reservation
  exiger "le comptoir n’a pas encore obtenu ${IP_COMPTOIR_LAN} (bail absent : relance le réseau du comptoir)" bail_comptoir
  fin_objectif

  objectif "dnsmasq résout les noms de ${DOMAINE}, relaie les autres, et n’écoute pas côté externe"
  exiger "douane.${DOMAINE} ne donne pas ${IP_DOUANE_LAN} (dig @${IP_DOUANE_LAN} douane.${DOMAINE})" dns_donne "$IP_DOUANE_LAN" "douane.${DOMAINE}" "$IP_DOUANE_LAN"
  exiger "cuve.${DOMAINE} ne donne pas ${IP_CUVE_LAN}" dns_donne "$IP_DOUANE_LAN" "cuve.${DOMAINE}" "$IP_CUVE_LAN"
  exiger "comptoir.${DOMAINE} ne donne pas ${IP_COMPTOIR_LAN}" dns_donne "$IP_DOUANE_LAN" "comptoir.${DOMAINE}" "$IP_COMPTOIR_LAN"
  exiger "les noms extérieurs (deb.debian.org) ne sont pas relayés (dig @${IP_DOUANE_LAN} deb.debian.org ; journalctl -u dnsmasq)" dns_externe "$IP_DOUANE_LAN" deb.debian.org
  wan_ip="$(adresse_de "${WAN:-lo}")"; wan_ip="${wan_ip%/*}"
  refuser "dnsmasq répond aussi sur l’interface EXTERNE (${wan_ip}) : limite-le à l’interface interne (interface=, bind-interfaces)" \
    dns_donne "${wan_ip:-127.0.0.2}" "cuve.${DOMAINE}" "$IP_CUVE_LAN"
  fin_objectif

  objectif "Le réseau interne sort sur Internet par traduction d’adresses (NAT), de façon persistante"
  exiger "aucune règle masquerade (ou snat) chargée (nft list ruleset)" masquerade_active
  exiger "la règle de NAT n’est pas dans /etc/nftables.conf : perdue au redémarrage" masquerade_persistante
  exiger "le service nftables n’est pas activé au démarrage" unite_activee nftables
  fin_objectif

  objectif "Pare-feu : politique drop en entrée et en transit, chargée et persistante"
  exiger "la chaîne d’entrée (hook input) n’a pas la politique drop" politique_drop input
  exiger "la chaîne de transit (hook forward) n’a pas la politique drop" politique_drop forward
  exiger "les politiques drop ne sont pas dans /etc/nftables.conf" politique_drop_persistante input
  exiger "la politique drop de forward n’est pas dans /etc/nftables.conf" politique_drop_persistante forward
  fin_objectif

  objectif "cuve et le comptoir répondent sur le réseau interne"
  exiger "cuve (${IP_CUVE_LAN}) ne répond pas au ping" repond_ping "$IP_CUVE_LAN"
  exiger "le comptoir (${IP_COMPTOIR_LAN}) ne répond pas au ping" repond_ping "$IP_COMPTOIR_LAN"
  fin_objectif
  ;;
# ---------------------------------------------------------------------------
comptoir)
  objectif "Le comptoir a obtenu ${IP_COMPTOIR_LAN} par DHCP, avec douane comme passerelle"
  exiger "${LAN:-eth0} n’a pas l’adresse ${IP_COMPTOIR_LAN}/24 attribuée par DHCP (ip -br a ; nmcli device)" dhcp_dynamique
  exiger "la passerelle par défaut n’est pas ${IP_DOUANE_LAN} (ip route)" passerelle_douane
  fin_objectif

  objectif "Le comptoir résout les noms de la brasserie, même les noms courts"
  exiger "cuve.${DOMAINE} ne se résout pas en ${IP_CUVE_LAN} (getent hosts)" resout_en "cuve.${DOMAINE}" "$IP_CUVE_LAN"
  exiger "le nom court « cuve » ne se résout pas (domaine de recherche absent)" resout_en cuve "$IP_CUVE_LAN"
  exiger "douane.${DOMAINE} ne se résout pas en ${IP_DOUANE_LAN}" resout_en "douane.${DOMAINE}" "$IP_DOUANE_LAN"
  fin_objectif

  objectif "Le comptoir accède à Internet (noms et connexions HTTPS)"
  exiger "les noms extérieurs ne se résolvent pas (getent hosts deb.debian.org)" resout deb.debian.org
  exiger "pas de connexion HTTPS vers Internet (curl https://deb.debian.org/) : routage, NAT ou pare-feu de douane ?" internet_ok
  fin_objectif

  objectif "Le comptoir joint cuve sur le réseau interne"
  exiger "cuve (${IP_CUVE_LAN}) ne répond pas au ping" repond_ping "$IP_CUVE_LAN"
  fin_objectif
  ;;
# ---------------------------------------------------------------------------
cuve)
  objectif "L’interface interne (${LAN:-?}) a l’adresse ${IP_CUVE_LAN}/24, de façon persistante"
  exiger "aucune interface interne trouvée (seconde carte absente ?)" test -n "$LAN"
  exiger "${LAN:-l’interface interne} n’a pas l’adresse ${IP_CUVE_LAN}/24" a_adresse "${LAN:-lo}" "${IP_CUVE_LAN}/24"
  exiger "${IP_CUVE_LAN}/24 n’apparaît dans aucune configuration persistante (/etc/netplan…)" adresse_persistante "${IP_CUVE_LAN}/24"
  fin_objectif

  objectif "La route par défaut de cuve ne passe pas par le réseau interne"
  exiger "une route par défaut passe par ${IP_DOUANE_LAN} : cuve garde sa sortie habituelle (pas de gateway sur l’interface interne)" pas_de_defaut_interne
  fin_objectif

  objectif "cuve résout les noms de ${DOMAINE} par douane, et toujours les noms extérieurs"
  exiger "comptoir.${DOMAINE} ne se résout pas en ${IP_COMPTOIR_LAN} (DNS de l’interface interne : nameservers dans Netplan)" resout_en "comptoir.${DOMAINE}" "$IP_COMPTOIR_LAN"
  exiger "les noms extérieurs (deb.debian.org) ne se résolvent plus" resout deb.debian.org
  fin_objectif

  objectif "cuve joint le comptoir sur le réseau interne"
  exiger "le comptoir (${IP_COMPTOIR_LAN}) ne répond pas au ping" repond_ping "$IP_COMPTOIR_LAN"
  fin_objectif
  ;;
esac

bilan 07
