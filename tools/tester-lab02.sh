#!/usr/bin/env bash
# Test de bout en bout du Lab 02 sur deux périphériques loop (CI, ou machine jetable, en root) :
# setup → correction initiale (doit échouer) → solution → correction (doit tout valider) → reset.
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
export LAB_HOME="$RACINE"
LAB="$RACINE/infra/bin/lab"

images=(/var/tmp/hlw-disque1.img /var/tmp/hlw-disque2.img)
boucles=()
nettoyer() {
  "$LAB" reset 02 >/dev/null 2>&1 || true
  for b in "${boucles[@]}"; do losetup -d "$b" 2>/dev/null || true; done
  rm -f "${images[@]}"
}
trap nettoyer EXIT
for img in "${images[@]}"; do
  truncate -s 2G "$img"
  boucles+=("$(losetup -f --show "$img")")
done
export LAB02_DISQUES="${boucles[*]}"
echo "Disques de test : ${LAB02_DISQUES}"

"$LAB" start 02

if "$LAB" check 02; then
  echo "ÉCHEC DU TEST : la correction initiale ne devrait pas être validée" >&2
  exit 1
fi

# --- Solution (identique à labs/lab02-disques/solution.md) --------------------
read -r D1 D2 <<<"$LAB02_DISQUES"
pvcreate -q "$D1" "$D2"
vgcreate -q vg_donnees "$D1" "$D2"
lvcreate -q -y -n lv_boutique -L 1G vg_donnees
lvcreate -q -y -n lv_archives -L 1G vg_donnees
lvcreate -q -y -n lv_swap -L 256M vg_donnees
mkfs.ext4 -q -L boutique /dev/vg_donnees/lv_boutique
mkfs.xfs -q -L archives /dev/vg_donnees/lv_archives
mkswap -q -L swap-donnees /dev/vg_donnees/lv_swap 2>/dev/null || mkswap -L swap-donnees /dev/vg_donnees/lv_swap
mkdir -p /srv/boutique /srv/archives
cat >> /etc/fstab <<EOF
# Lab 02 : volumes de la boutique
UUID=$(blkid -s UUID -o value /dev/vg_donnees/lv_boutique)  /srv/boutique  ext4  defaults  0  2
/dev/vg_donnees/lv_archives  /srv/archives  xfs  defaults,nodev,nosuid,noexec  0  2
UUID=$(blkid -s UUID -o value /dev/vg_donnees/lv_swap)  none  swap  sw  0  0
EOF
if [[ -d /run/systemd/system ]]; then systemctl daemon-reload; fi
mount /srv/boutique
mount /srv/archives
swapon -a
cp -a /srv/boutique-ancien/. /srv/boutique/
lvextend -q -r -L 1.5G vg_donnees/lv_boutique
if mountpoint -q /srv/capteurs; then
  find /srv/capteurs/tmp -name '*.tmp' -delete
fi
# ---------------------------------------------------------------------------

"$LAB" check 02
"$LAB" reset 02
echo "Test du Lab 02 réussi."
