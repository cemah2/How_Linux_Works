#!/usr/bin/env bash
# Test du Lab 08 sur UNE machine jetable (CI) : elle joue successivement cuve, comptoir et douane.
# Les adresses 192.168.50.1 et 192.168.50.10 sont posées sur une interface factice « lan0 ».
# Chaque rôle a son propre /var/lib/hlw (montage lié dans un espace de noms de montage).
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
export LAB_HOME="$RACINE"
LAB="$RACINE/infra/bin/lab"
export LAB07_LAN=lan0
MOI="${SUDO_USER:-runner}"

role() { # rôle commande…
  local r="$1"; shift
  mkdir -p "/tmp/etat-$r"
  unshare -m bash -c 'mount --bind "/tmp/etat-$0" /var/lib/hlw && exec env LAB08_ROLE="$0" LAB_UTILISATEUR="$1" "${@:2}"' "$r" "$MOI" "$@"
}
nettoyer() {
  set +e
  for r in douane comptoir cuve; do role "$r" "$LAB" reset 08 >/dev/null 2>&1; done
  ip link del lan0 2>/dev/null
  rm -rf /tmp/etat-cuve /tmp/etat-comptoir /tmp/etat-douane
}
trap nettoyer EXIT

mkdir -p /var/lib/hlw
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq openssh-server nmap tcpdump bind9-dnsutils fail2ban python3-systemd >/dev/null
# Ubuntu active sshd par socket (ListenAddress serait ignoré) : on repasse au service classique
systemctl disable --now ssh.socket >/dev/null 2>&1 || true
systemctl enable --now ssh.service >/dev/null 2>&1 || true
systemctl stop fail2ban >/dev/null 2>&1 || true
ip link add lan0 type dummy && ip link set lan0 up
ip address add 192.168.50.1/24 dev lan0
ip address add 192.168.50.10/24 dev lan0

role cuve "$LAB" start 08
role comptoir "$LAB" start 08
role douane "$LAB" start 08
if role cuve "$LAB" check 08; then echo "ÉCHEC DU TEST : cuve ne devrait pas être validée" >&2; exit 1; fi

# --- Solution : cuve ------------------------------------------------------------
groupadd ssh-autorises
usermod -aG ssh-autorises "$MOI"
usermod -aG ssh-autorises bastien
printf 'PermitRootLogin no\nPasswordAuthentication no\nMaxAuthTries 3\nAllowGroups ssh-autorises\nListenAddress 192.168.50.10\n' \
  > /etc/ssh/sshd_config.d/50-brasserie.conf
sshd -t
systemctl restart ssh
systemctl disable --now outil-debug.service
# --- Solution : comptoir (même machine, donc même compte bastien) ------------------
H="$(getent passwd bastien | cut -d: -f6)"
runuser -u bastien -- ssh-keygen -q -t ed25519 -N '' -C bastien@comptoir -f "$H/.ssh/id_ed25519"
install -m 600 -o bastien -g bastien "$H/.ssh/id_ed25519.pub" "$H/.ssh/authorized_keys"
chmod 700 "$H/.ssh"
printf 'Host cuve\n    HostName 192.168.50.10\n    User bastien\n' > "$H/.ssh/config"
chown bastien:bastien "$H/.ssh/config"
nmap -sT 192.168.50.0/29 192.168.50.10 -oN /root/inventaire.txt >/dev/null
# --- Solution : douane ---------------------------------------------------------
mkdir -p /etc/fail2ban/jail.d
printf '[sshd]\nenabled  = true\nbackend  = systemd\nmaxretry = 5\nfindtime = 10m\nbantime  = 1h\nignoreip = 127.0.0.1/8 ::1 192.168.50.0/24\n' \
  > /etc/fail2ban/jail.d/sshd.local
systemctl enable fail2ban >/dev/null 2>&1
systemctl restart fail2ban
sleep 3
tcpdump -i any -n -c 1 -w /root/capture-dns.pcap 'udp port 53 and host 192.168.50.1' 2>/dev/null &
sleep 2
dig +time=1 +tries=1 @192.168.50.1 cuve.brasserie.lan >/dev/null 2>&1 || true
wait
# ---------------------------------------------------------------------------

# Diagnostic (utile si la CI échoue)
runuser -u bastien -- ssh -v -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=5 cuve true 2>&1 | tail -15 || true
journalctl -u ssh -n 15 --no-pager || true

echo "=== cuve ===";     role cuve "$LAB" check 08
echo "=== comptoir ==="; role comptoir "$LAB" check 08
echo "=== douane ===";   role douane "$LAB" check 08
echo "Test du Lab 08 réussi."
