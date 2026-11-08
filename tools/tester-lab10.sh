#!/usr/bin/env bash
# Test du Lab 10 sur UNE machine jetable (CI) : elle joue cuve (serveur NFS/Samba), le comptoir (client) et
# douane (destination des sauvegardes). Les noms *.brasserie.lan pointent vers une interface factice « lan0 ».
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
export LAB_HOME="$RACINE"
LAB="$RACINE/infra/bin/lab"
export LAB07_LAN=lan0

role() { # rôle commande… (état /var/lib/hlw propre à chaque rôle)
  local r="$1"; shift
  mkdir -p "/tmp/etat-$r"
  unshare -m bash -c 'mount --bind "/tmp/etat-$0" /var/lib/hlw && exec env LAB10_ROLE="$0" "${@:1}"' "$r" "$@"
}
nettoyer() {
  set +e
  for r in comptoir douane cuve; do role "$r" "$LAB" reset 10 >/dev/null 2>&1; done
  sed -i '/brasserie\.lan/d' /etc/hosts
  ip link del lan0 2>/dev/null
  rm -rf /tmp/etat-cuve /tmp/etat-comptoir /tmp/etat-douane
}
trap nettoyer EXIT

mkdir -p /var/lib/hlw
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nfs-kernel-server nfs-common samba smbclient cifs-utils \
  sshfs rsync openssh-server >/dev/null
systemctl disable --now ssh.socket >/dev/null 2>&1 || true
systemctl enable --now ssh.service >/dev/null 2>&1 || true
ip link add lan0 type dummy && ip link set lan0 up
ip address add 192.168.50.1/24 dev lan0
ip address add 192.168.50.10/24 dev lan0
printf '192.168.50.1 douane.brasserie.lan douane\n192.168.50.10 cuve.brasserie.lan cuve\n' >> /etc/hosts

role cuve "$LAB" start 10
role comptoir "$LAB" start 10
role douane "$LAB" start 10
if role cuve "$LAB" check 10; then echo "ÉCHEC DU TEST : cuve ne devrait pas être validée" >&2; exit 1; fi

# --- cuve : NFS -------------------------------------------------------------------
mkdir -p /etc/exports.d
echo '/srv/partages/commun 192.168.50.0/24(rw,sync,root_squash)' > /etc/exports.d/brasserie.exports
exportfs -ra
systemctl enable --now nfs-server
# --- cuve : Samba ------------------------------------------------------------------
sed -i '/^\[global\]/a \   server min protocol = SMB3\n   hosts allow = 192.168.50.0/24 127.0.0.1' /etc/samba/smb.conf
cat >> /etc/samba/smb.conf <<'FIN'

[boutique]
   comment = Dossier de la boutique
   path = /srv/partages/boutique
   valid users = @boutique
   read only = no
   create mask = 0660
   directory mask = 2770
FIN
testparm -s >/dev/null
printf 'Caisse-2026\nCaisse-2026\n' | smbpasswd -s -a malik
systemctl enable --now smbd
systemctl restart smbd
# --- comptoir : montages NFS et CIFS ----------------------------------------------
mkdir -p /mnt/commun /mnt/boutique
install -m 600 /dev/null /root/.smb-boutique
printf 'username=malik\npassword=Caisse-2026\n' > /root/.smb-boutique
cat >> /etc/fstab <<'FIN'
cuve.brasserie.lan:/srv/partages/commun  /mnt/commun  nfs  defaults,_netdev,nofail  0 0
//cuve.brasserie.lan/boutique  /mnt/boutique  cifs  credentials=/root/.smb-boutique,uid=malik,gid=boutique,_netdev,nofail  0 0
FIN
systemctl daemon-reload
mount /mnt/commun
mount /mnt/boutique
runuser -u bastien -- touch /mnt/commun/bonjour-de-bastien.txt
# --- comptoir : SSHFS pour Bastien (clé « du Lab 08 ») -------------------------------
H="$(getent passwd bastien | cut -d: -f6)"
install -d -m 700 -o bastien -g bastien "$H/.ssh"
runuser -u bastien -- ssh-keygen -q -t ed25519 -N '' -f "$H/.ssh/id_ed25519"
install -m 600 -o bastien -g bastien "$H/.ssh/id_ed25519.pub" "$H/.ssh/authorized_keys"
printf 'Host cuve\n    HostName 192.168.50.10\n    User bastien\n    StrictHostKeyChecking accept-new\n' > "$H/.ssh/config"
chown bastien:bastien "$H/.ssh/config"
runuser -u bastien -- mkdir -p "$H/archives-cuve"
runuser -u bastien -- sshfs cuve:/srv/archives "$H/archives-cuve"
# --- douane et cuve : sauvegarde -------------------------------------------------------
ssh-keygen -q -t ed25519 -N '' -C sauvegarde@cuve -f /root/.ssh/sauvegarde
useradd -m -s /bin/bash sauvegarde
install -d -m 700 -o sauvegarde -g sauvegarde /srv/sauvegardes /srv/sauvegardes/cuve
HS="$(getent passwd sauvegarde | cut -d: -f6)"
install -d -m 700 -o sauvegarde -g sauvegarde "$HS/.ssh"
RRSYNC="$(command -v rrsync || echo /usr/share/doc/rsync/scripts/rrsync)"
echo "restrict,command=\"${RRSYNC} /srv/sauvegardes/cuve\" $(cat /root/.ssh/sauvegarde.pub)" > "$HS/.ssh/authorized_keys"
chown sauvegarde:sauvegarde "$HS/.ssh/authorized_keys"; chmod 600 "$HS/.ssh/authorized_keys"
cat > /etc/systemd/system/sauvegarde-recettes.service <<'FIN'
[Unit]
Description=Sauvegarde des recettes vers douane
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/rsync -a --delete --exclude=*.tmp -e "ssh -i /root/.ssh/sauvegarde -o StrictHostKeyChecking=accept-new" /srv/recettes/ sauvegarde@douane.brasserie.lan:recettes/
FIN
cat > /etc/systemd/system/sauvegarde-recettes.timer <<'FIN'
[Unit]
Description=Sauvegarde des recettes chaque nuit à 1 h

[Timer]
OnCalendar=*-*-* 01:00:00
Persistent=true

[Install]
WantedBy=timers.target
FIN
systemctl daemon-reload
systemctl enable --now sauvegarde-recettes.timer
systemctl start sauvegarde-recettes.service
# ---------------------------------------------------------------------------

echo "=== cuve ===";     role cuve "$LAB" check 10
echo "=== comptoir ==="; role comptoir "$LAB" check 10
echo "=== douane ===";   role douane "$LAB" check 10
echo "Test du Lab 10 réussi."
