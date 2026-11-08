#!/usr/bin/env bash
# Test du Lab 07 sur UNE machine jetable (CI) : la machine joue douane, deux espaces de noms réseau
# jouent comptoir et cuve, reliés par un pont « brlan » qui tient lieu de réseau interne.
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
export LAB_HOME="$RACINE"
LAB="$RACINE/infra/bin/lab"
export LAB07_SANS_APPLIQUER=1
MAC_COMPTOIR="bc:24:11:c4:91:33"

dans() { # ns rôle commande… : exécute dans l'espace de noms, avec son propre /var/lib/hlw
  local ns="$1" role="$2"; shift 2
  ip netns exec "$ns" bash -c 'mount --bind "/tmp/etat-$0" /var/lib/hlw && exec env LAB07_ROLE="$1" "${@:2}"' "$ns" "$role" "$@"
}
nettoyer() {
  set +e
  LAB07_ROLE=douane "$LAB" reset 07 >/dev/null 2>&1
  for ns in comptoir cuve; do dans "$ns" "$ns" "$LAB" reset 07 >/dev/null 2>&1; ip netns del "$ns" 2>/dev/null; done
  ip link del brlan 2>/dev/null
  rm -rf /etc/netns/comptoir /etc/netns/cuve /tmp/etat-comptoir /tmp/etat-cuve
}
trap nettoyer EXIT

# --- Machine jetable : Docker met FORWARD en DROP, on l'arrête ---------------------
systemctl stop docker.socket docker >/dev/null 2>&1 || true
iptables -P FORWARD ACCEPT 2>/dev/null || true
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq busybox >/dev/null

# --- Réseau interne simulé ------------------------------------------------------
mkdir -p /var/lib/hlw
ip link add brlan type bridge && ip link set brlan up
for ns in comptoir cuve; do
  ip netns add "$ns"
  ip link add "v-$ns" type veth peer name "e-$ns"
  ip link set "v-$ns" master brlan up
  ip link set "e-$ns" netns "$ns"
  ip netns exec "$ns" ip link set lo up
  mkdir -p "/etc/netns/$ns" "/tmp/etat-$ns"
  sed 's/^hosts:.*/hosts: files dns/' /etc/nsswitch.conf > "/etc/netns/$ns/nsswitch.conf"
  : > "/etc/netns/$ns/resolv.conf"
done
ip netns exec comptoir ip link set e-comptoir address "$MAC_COMPTOIR"
ip netns exec comptoir ip link set e-comptoir up
ip netns exec cuve ip link set e-cuve up
mkdir -p /etc/netns/cuve/netplan
export LAB07_LAN=brlan

# --- Démarrage du lab sur les trois « machines » -----------------------------------
LAB07_ROLE=douane "$LAB" start 07
dans comptoir comptoir env LAB07_LAN=e-comptoir "$LAB" start 07
dans cuve cuve env LAB07_LAN=e-cuve "$LAB" start 07

if LAB07_ROLE=douane "$LAB" check 07; then echo "ÉCHEC DU TEST : douane ne devrait pas être validée" >&2; exit 1; fi

# --- Solution : douane (identique à solution.md, avec brlan pour eth1) ---------------
WAN="$(ip -4 route show default | awk '{print $5; exit}')"
cat > /etc/netplan/60-interne.yaml <<FIN
network:
  version: 2
  ethernets:
    brlan:
      addresses: [192.168.50.1/24]
FIN
chmod 600 /etc/netplan/60-interne.yaml
ip address add 192.168.50.1/24 dev brlan          # (netplan apply n'est pas lancé en CI)
echo 'net.ipv4.ip_forward = 1' > /etc/sysctl.d/90-routeur.conf
sysctl -q --system
cat > /etc/dnsmasq.d/brasserie.conf <<FIN
interface=brlan
bind-interfaces
domain=brasserie.lan
local=/brasserie.lan/
dhcp-range=192.168.50.120,192.168.50.150,12h
dhcp-option=option:router,192.168.50.1
dhcp-option=option:dns-server,192.168.50.1
dhcp-host=${MAC_COMPTOIR},comptoir,192.168.50.100
host-record=douane.brasserie.lan,douane,192.168.50.1
host-record=cuve.brasserie.lan,cuve,192.168.50.10
FIN
systemctl enable --now dnsmasq
cat > /etc/nftables.conf <<FIN
#!/usr/sbin/nft -f
flush ruleset

define EXT = "${WAN}"
define INT = "brlan"
define LAN = 192.168.50.0/24

table inet filtre {
    chain input {
        type filter hook input priority filter; policy drop;
        iif "lo" accept
        ct state established,related accept
        ct state invalid drop
        tcp dport 22 accept
        meta l4proto { icmp, ipv6-icmp } accept
        iifname \$EXT udp sport 67 udp dport 68 accept
        iifname \$INT udp dport { 53, 67 } accept
        iifname \$INT tcp dport 53 accept
    }
    chain forward {
        type filter hook forward priority filter; policy drop;
        ct state established,related accept
        ct state invalid drop
        iifname \$INT oifname \$EXT accept
    }
    chain output {
        type filter hook output priority filter; policy accept;
    }
}

table ip nat {
    chain postrouting {
        type nat hook postrouting priority srcnat; policy accept;
        ip saddr \$LAN oifname \$EXT masquerade
    }
}
FIN
nft -c -f /etc/nftables.conf
systemctl enable nftables
systemctl restart nftables

# --- comptoir : client DHCP (busybox udhcpc, faute de NetworkManager dans l'espace de noms) ---
cat > /tmp/udhcpc.sh <<'FIN'
#!/bin/sh
case "$1" in
  bound|renew)
    prefixe=$(echo "$subnet" | awk -F. '{n=0; for (i=1;i<=4;i++) {x=$i; while (x>0) {n+=x%2; x=int(x/2)}} print n}')
    ip addr flush dev "$interface"
    ip addr add "$ip/$prefixe" dev "$interface" valid_lft "$lease" preferred_lft "$lease"
    ip route replace default via "$router" dev "$interface"
    { [ -n "$domain" ] && echo "search $domain"; for d in $dns; do echo "nameserver $d"; done; } > /etc/resolv.conf
    ;;
esac
FIN
chmod 755 /tmp/udhcpc.sh
ip netns exec comptoir busybox udhcpc -i e-comptoir -q -n -t 5 -s /tmp/udhcpc.sh
ip netns exec comptoir cat /etc/resolv.conf

# --- cuve : adresse fixe, DNS interne (resolv.conf de l'espace de noms) -------------
cat > /etc/netns/cuve/netplan/60-interne.yaml <<FIN
network:
  version: 2
  ethernets:
    e-cuve:
      addresses: [192.168.50.10/24]
      nameservers:
        addresses: [192.168.50.1]
        search: [brasserie.lan]
FIN
ip netns exec cuve ip address add 192.168.50.10/24 dev e-cuve
printf 'nameserver 192.168.50.1\nsearch brasserie.lan\n' > /etc/netns/cuve/resolv.conf
sleep 2
# Diagnostic (utile si la CI échoue)
dig +time=5 +tries=2 @192.168.50.1 deb.debian.org A | grep -E 'status|IN' || true
journalctl -u dnsmasq -n 15 --no-pager || true
# ---------------------------------------------------------------------------

echo "=== douane ===";   LAB07_ROLE=douane "$LAB" check 07
echo "=== comptoir ==="; dans comptoir comptoir env LAB07_LAN=e-comptoir "$LAB" check 07
echo "=== cuve ===";     dans cuve cuve env LAB07_LAN=e-cuve "$LAB" check 07
echo "Test du Lab 07 réussi."
