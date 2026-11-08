#!/usr/bin/env bash
# Test partiel du Lab 03 (CI, en root sur une machine jetable) : on ne redémarre pas et on ne touche
# pas au chargeur de démarrage. On vérifie que la panne casse bien ce qu'elle doit casser, que la
# réparation valide les objectifs concernés, et que le reset remet tout en place.
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
export LAB_HOME="$RACINE"
LAB="$RACINE/infra/bin/lab"
export LAB_AUTO=1 LAB_SANS_REDEMARRAGE=1 LAB03_SANS_GRUB=1

cp -a /etc/fstab /tmp/fstab.avant-lab03
cible_avant="$(systemctl get-default)"
echo "root:Brasserie-du-Noyau-2026" | chpasswd

"$LAB" start 03
"$LAB" panne 03
sleep 2

attendu() { # numéro symbole(✔|✘) sortie
  if ! grep -qE "^ *$2 +$1\. " <<<"$3"; then
    echo "ÉCHEC DU TEST : l’objectif $1 devrait être marqué $2" >&2
    echo "$3" >&2
    exit 1
  fi
}

sortie="$("$LAB" check 03 || true)"
for n in 3 5 6 7 8; do attendu "$n" ✘ "$sortie"; done
attendu 1 ✔ "$sortie"

# --- Réparation (identique à labs/lab03-demarrage/solution.md, sans le chargeur) ---
sed -i -e 's|^\(UUID=[^ ]* *\)/srv/cave|#&|' /etc/fstab
systemctl set-default multi-user.target
sed -i 's|^ExecStart=.*|ExecStart=/usr/local/bin/brassd|' /etc/systemd/system/brassd.service
sed -i -e 's|^Type=oneshot|Type=simple|' -e '/^TimeoutStartSec=/d' /etc/systemd/system/collecte-capteurs.service
systemctl daemon-reload
systemctl reset-failed brassd.service collecte-capteurs.service || true
systemctl restart brassd.service collecte-capteurs.service
cat > /root/incident-03.md <<'EOF'
# Incident du lab 03
- Symptôme : la machine démarre en mode d’urgence (emergency), puis en mode secours (rescue).
- Cause 1 : une ligne fstab pour /srv/cave vers un disque absent. Corrigé : ligne commentée.
- Cause 2 : systemd.unit=rescue.target dans la configuration de GRUB et cible par défaut rescue.target.
- Cause 3 : brassd lancé avec un chemin inexistant (brassd-v2). Corrigé dans le fichier d’unité.
- Cause 4 : le collecteur des capteurs déclaré Type=oneshot alors que c’est un démon. Corrigé : Type=simple.
EOF
# ---------------------------------------------------------------------------

sortie="$("$LAB" check 03 || true)"
echo "$sortie"
for n in 1 3 4 5 6 7 8; do attendu "$n" ✔ "$sortie"; done
attendu 2 ✘ "$sortie"   # pas de redémarrage en CI

"$LAB" reset 03
diff /tmp/fstab.avant-lab03 /etc/fstab || { echo "ÉCHEC DU TEST : fstab non restauré" >&2; exit 1; }
[[ "$(systemctl get-default)" == "$cible_avant" ]] || { echo "ÉCHEC DU TEST : cible par défaut non restaurée" >&2; exit 1; }
! systemctl cat brassd.service >/dev/null 2>&1 || { echo "ÉCHEC DU TEST : brassd.service encore présent" >&2; exit 1; }
echo "Test (partiel) du Lab 03 réussi."
