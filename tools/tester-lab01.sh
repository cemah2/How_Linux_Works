#!/usr/bin/env bash
# Test de bout en bout du Lab 01 (utilisé par la CI, à lancer en root sur une machine jetable) :
# setup → correction initiale (doit échouer) → solution → correction (doit tout valider) → reset.
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
export LAB_HOME="$RACINE"
LAB="$RACINE/infra/bin/lab"

"$LAB" start 01
sleep 1

if "$LAB" check 01; then
  echo "ÉCHEC DU TEST : la correction initiale ne devrait pas être validée" >&2
  exit 1
fi

# --- Solution (identique à labs/lab01-premier-jour/solution.md) ---------------
mkdir -p /srv/brasserie/partage/{brassage,compta,boutique,commun}
cd /srv/brasserie/partage
chgrp brasseurs brassage; chgrp compta compta; chgrp boutique boutique; chgrp personnel commun
chmod 2770 brassage compta boutique
chmod 3770 commun
mv /srv/brasserie/vrac/*.recette /srv/brasserie/vrac/.*.recette brassage/
mv /srv/brasserie/vrac/*.ods compta/
mv /srv/brasserie/vrac/*.csv boutique/
mv /srv/brasserie/vrac/*.txt commun/
for paire in brassage:brasseurs compta:compta boutique:boutique commun:personnel; do
  chgrp -R "${paire#*:}" "${paire%%:*}"
  chmod -R g+rw,o-rwx "${paire%%:*}"
done
# « || true » : head ferme le tube dès la 1re ligne, find reçoit SIGPIPE et pipefail le signalerait
egare="$(find / -name 'bilan-2025-final*' -not -path '/proc/*' 2>/dev/null | head -1 || true)"
mv "$egare" compta/
chgrp compta compta/bilan-2025-final-VRAIMENT.ods
chmod g+rw,o-rwx compta/bilan-2025-final-VRAIMENT.ods
tar -C /srv/brasserie/vrac -czf /srv/brasserie/archives/vrac-2023.tar.gz archives-2023
rm -r /srv/brasserie/vrac/archives-2023
pkill -x thermostat-cuve
sleep 2
ln -s /srv/brasserie/partage/brassage/ipa-noyau.recette /srv/brasserie/recette-du-moment
rm -f /srv/brasserie/vrac/derniere-commande /srv/brasserie/vrac/thermostat.log
rmdir /srv/brasserie/vrac
regle="$(mktemp)"
printf 'malik ALL=(root) %s restart boutique\n' "$(command -v systemctl)" > "$regle"
visudo -cf "$regle"
install -m 440 "$regle" /etc/sudoers.d/boutique
rm -f "$regle"
chmod 755 /usr/local/bin/sauvegarde-recettes
/usr/local/bin/sauvegarde-recettes
cd /
# ---------------------------------------------------------------------------

"$LAB" check 01
"$LAB" reset 01
echo "Test du Lab 01 réussi."
