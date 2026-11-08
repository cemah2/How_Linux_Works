#!/usr/bin/env bash
# Test de bout en bout du Lab 04 (CI, en root sur une machine jetable avec systemd).
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
export LAB_HOME="$RACINE"
LAB="$RACINE/infra/bin/lab"

"$LAB" start 04
sleep 2
if "$LAB" check 04; then
  echo "ÉCHEC DU TEST : la correction initiale ne devrait pas être validée" >&2
  exit 1
fi

# --- Solution (identique à labs/lab04-services/solution.md) --------------------
useradd --system --home-dir /opt/vitrine --no-create-home --shell /usr/sbin/nologin vitrine
pkill -u malik -f 'http.server 8080'
cat > /etc/systemd/system/vitrine.service <<'UNITE'
[Unit]
Description=Vitrine de la boutique en ligne
After=network.target

[Service]
Type=simple
User=vitrine
Group=vitrine
EnvironmentFile=/etc/vitrine/vitrine.env
ExecStart=/opt/vitrine/bin/vitrine
Restart=on-failure

[Install]
WantedBy=multi-user.target
UNITE
mkdir -p /etc/systemd/system/inventaire.service.d
cat > /etc/systemd/system/inventaire.service.d/override.conf <<'UNITE'
[Service]
Nice=10
MemoryMax=200M
UNITE
cat > /etc/systemd/system/export-ventes.service <<'UNITE'
[Unit]
Description=Export quotidien des ventes pour la comptabilité

[Service]
Type=oneshot
ExecStart=/usr/local/bin/export-ventes
UNITE
cat > /etc/systemd/system/export-ventes.timer <<'UNITE'
[Unit]
Description=Déclenche l’export des ventes du lundi au vendredi à 2 h 30

[Timer]
OnCalendar=Mon..Fri 02:30
Persistent=true

[Install]
WantedBy=timers.target
UNITE
systemctl daemon-reload
systemctl enable --now vitrine.service export-ventes.timer
systemctl restart inventaire.service
systemctl start export-ventes.service
rm /etc/cron.d/export-ventes
sleep 2
# ---------------------------------------------------------------------------

"$LAB" check 04
"$LAB" reset 04
! id vitrine >/dev/null 2>&1 || { echo "ÉCHEC DU TEST : compte vitrine encore présent" >&2; exit 1; }
echo "Test du Lab 04 réussi."
