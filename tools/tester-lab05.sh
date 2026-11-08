#!/usr/bin/env bash
# Test de bout en bout du Lab 05 (CI, en root sur une machine jetable avec systemd).
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
export LAB_HOME="$RACINE"
LAB="$RACINE/infra/bin/lab"
# shellcheck source=../labs/lib/commun.sh
source "$RACINE/labs/lib/commun.sh"

"$LAB" start 05
sleep 2
if "$LAB" check 05; then
  echo "ÉCHEC DU TEST : la correction initiale ne devrait pas être validée" >&2
  exit 1
fi

# --- Solution (identique à labs/lab05-comptes/solution.md) --------------------
# 1 et 2. Arrivées
useradd -m -s /bin/bash -c "Léa Durand, brasseuse" -G brasseurs,personnel lea
useradd -m -s /bin/bash -c "Yanis Moreau, stagiaire boutique" -G boutique,personnel -e 2027-06-30 yanis
printf 'lea:Provisoire-Lea-2026\nyanis:Provisoire-Yanis-2026\n' | chpasswd
chage -d 0 lea
chage -d 0 yanis
# 3 et 4. Groupes
usermod -aG compta malik
usermod -aG systemd-journal ines
# 5. Départ de Kevin
pkill -u kevin || true
passwd -l kevin
usermod -e 1 kevin
mkdir -p /root/archives
tar -C /home -czf /root/archives/kevin.tar.gz kevin
# 6. Mots de passe
if [[ "$FAMILLE" == debian ]]; then
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq libpam-pwquality >/dev/null
fi
mkdir -p /etc/security/pwquality.conf.d
printf 'minlen = 12\ndcredit = -1\n' > /etc/security/pwquality.conf.d/50-brasserie.conf
# 7. Journal persistant
rm /etc/systemd/journald.conf.d/50-economie.conf
printf '[Journal]\nStorage=persistent\nSystemMaxUse=200M\n' > /etc/systemd/journald.conf.d/50-brasserie.conf
sleep 1
systemctl restart systemd-journald
journalctl --flush
# 8. logrotate
cat > /etc/logrotate.d/boutique <<'EOF'
/var/log/boutique/*.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF
logrotate -d /etc/logrotate.d/boutique
# 9. Audit
mkdir -p /root/audit
journalctl -t sshd -g 'Failed password' --no-pager -o cat \
  | grep -oE 'from [0-9.]+' | sort | uniq -c | sort -rn | head -1 | awk '{print $3}' > /root/audit/ip-suspecte.txt
cat /root/audit/ip-suspecte.txt
# ---------------------------------------------------------------------------

"$LAB" check 05
"$LAB" reset 05
! id kevin >/dev/null 2>&1 || { echo "ÉCHEC DU TEST : kevin encore présent" >&2; exit 1; }
[[ ! -e /etc/systemd/journald.conf.d/50-brasserie.conf ]] || { echo "ÉCHEC DU TEST : surcharge journald restée" >&2; exit 1; }
echo "Test du Lab 05 réussi."
