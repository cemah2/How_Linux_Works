#!/usr/bin/env bash
# Test de bout en bout du Lab 06 (CI, en root sur une machine jetable avec systemd et cgroups v2).
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
export LAB_HOME="$RACINE"
LAB="$RACINE/infra/bin/lab"
# shellcheck source=../labs/lib/commun.sh
source "$RACINE/labs/lib/commun.sh"
trap '"$LAB" reset 06 >/dev/null 2>&1 || true' EXIT

"$LAB" start 06
sleep 3
if "$LAB" check 06; then
  echo "ÉCHEC DU TEST : la correction initiale ne devrait pas être validée" >&2
  exit 1
fi

# --- Diagnostic et solution (identiques à labs/lab06-performances/solution.md) -
uptime
top -b -n 1 -o %CPU | head -12
lsof +L1 2>/dev/null | head -5 || true
if [[ "$FAMILLE" == debian ]]; then
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq sysstat >/dev/null
  sed -i 's/^ENABLED=.*/ENABLED="true"/' /etc/default/sysstat
  systemctl restart sysstat 2>/dev/null || true
else
  dnf install -y -q sysstat >/dev/null
  systemctl enable --now sysstat
fi
pidstat -d 1 1 | tail -5 || true
renice -n 19 -p "$(pgrep -o -x calcul-stocks)"
ionice -c 3 -p "$(pgrep -o -x sauvegarde-nuit)"
systemctl set-property catalogue-cache.service MemoryMax=150M
systemctl restart capteurs-brut.service
cat > /root/diagnostic-06.txt <<'TEXTE'
Diagnostic du serveur lent
- Processeur : calcul-stocks (malik) à 100 % d’un cœur → renice 19.
- Disque : sauvegarde-nuit écrivait sans arrêt (iotop, pidstat -d) → ionice -c3.
- Mémoire : catalogue-cache occupait 400 Mo → MemoryMax=150M (set-property).
- Disque plein : capteurs-brut gardait ouvert brut.log supprimé (lsof +L1) → redémarrage du service.
TEXTE
sleep 15
# ---------------------------------------------------------------------------

"$LAB" check 06
"$LAB" reset 06
trap - EXIT
! pgrep -x calcul-stocks >/dev/null || { echo "ÉCHEC DU TEST : calcul-stocks tourne encore" >&2; exit 1; }
echo "Test du Lab 06 réussi."
