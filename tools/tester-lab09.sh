#!/usr/bin/env bash
# Test de bout en bout du Lab 09 (CI, en root sur une machine jetable avec systemd).
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
export LAB_HOME="$RACINE"
LAB="$RACINE/infra/bin/lab"

"$LAB" start 09
sleep 1
if "$LAB" check 09; then
  echo "ÉCHEC DU TEST : la correction initiale ne devrait pas être validée" >&2
  exit 1
fi

# --- Solution (identique à labs/lab09-scripts/solution.md) --------------------
cat > /usr/local/bin/archive-releves <<'SCRIPT'
#!/bin/bash
# archive-releves : archive les relevés CSV anciens d'un répertoire, puis les supprime.
# Usage : archive-releves [-n] [-j JOURS] SOURCE DESTINATION
set -euo pipefail

PROG=$(basename "$0")
JOURS=7
SIMULATION=0

usage() {
  echo "usage : $PROG [-n] [-j JOURS] SOURCE DESTINATION" >&2
  exit 2
}
erreur() {
  echo "$PROG : $*" >&2
  exit 1
}

while getopts ':nj:' opt; do
  case $opt in
    n) SIMULATION=1 ;;
    j) JOURS=$OPTARG ;;
    *) usage ;;
  esac
done
shift $((OPTIND - 1))
[[ $# -eq 2 ]] || usage
[[ $JOURS =~ ^[0-9]+$ ]] || usage

SOURCE=$1
DEST=$2
[[ -d $SOURCE ]] || erreur "$SOURCE n'est pas un répertoire"

# Liste des fichiers à archiver, séparés par un caractère nul (noms avec espaces)
LISTE=$(mktemp)
trap 'rm -f "$LISTE"' EXIT
find "$SOURCE" -maxdepth 1 -type f -name '*.csv' -mtime +"$JOURS" -printf '%f\0' > "$LISTE"

if [[ ! -s $LISTE ]]; then
  echo "rien à archiver dans $SOURCE"
  exit 0
fi

if (( SIMULATION )); then
  tr '\0' '\n' < "$LISTE"
  exit 0
fi

[[ -d $DEST && -w $DEST ]] || erreur "impossible d'écrire dans $DEST"
ARCHIVE="$DEST/releves-$(date +%Y%m%d-%H%M%S).tar.gz"
if ! tar -czf "$ARCHIVE" -C "$SOURCE" --null -T "$LISTE"; then
  rm -f "$ARCHIVE"
  erreur "échec de la création de $ARCHIVE, aucun fichier supprimé"
fi
(cd "$SOURCE" && xargs -0 rm -f -- < "$LISTE")

NB=$(tr -cd '\0' < "$LISTE" | wc -c)
logger -t archive-releves "$NB relevé(s) de $SOURCE archivé(s) dans $ARCHIVE" \
  || echo "$PROG : avertissement, journalisation impossible" >&2
echo "$NB relevé(s) archivé(s) dans $ARCHIVE"
SCRIPT
chmod 755 /usr/local/bin/archive-releves

cat > /etc/systemd/system/archive-releves.service <<'UNITE'
[Unit]
Description=Archivage des relevés des cuves

[Service]
Type=oneshot
User=releves
Group=releves
ExecStart=/usr/local/bin/archive-releves /srv/releves /srv/archives
UNITE
cat > /etc/systemd/system/archive-releves.timer <<'UNITE'
[Unit]
Description=Archivage des relevés chaque nuit à 3 h 15

[Timer]
OnCalendar=*-*-* 03:15:00
Persistent=true

[Install]
WantedBy=timers.target
UNITE
systemctl daemon-reload
systemctl enable --now archive-releves.timer
systemctl start archive-releves.service

cat > /etc/profile.d/brasserie.sh <<'PROFIL'
# Outils de la brasserie pour tous les utilisateurs
case ":$PATH:" in
  *:/opt/brasserie/bin:*) ;;
  *) PATH="$PATH:/opt/brasserie/bin" ;;
esac
export PATH
PROFIL

HOME_LEA="$(getent passwd lea | cut -d: -f6)"
sed -i 's/^echo "Bienvenue/[[ $- == *i* ]] \&\& echo "Bienvenue/' "$HOME_LEA/.bashrc"
echo "alias ll='ls -lh'" >> /etc/skel/.bashrc
# ---------------------------------------------------------------------------

ls -l /srv/archives
"$LAB" check 09
"$LAB" reset 09
! id releves >/dev/null 2>&1 || { echo "ÉCHEC DU TEST : compte releves encore présent" >&2; exit 1; }
[[ ! -e /etc/profile.d/brasserie.sh ]] || { echo "ÉCHEC DU TEST : brasserie.sh encore présent" >&2; exit 1; }
! grep -q "alias ll='ls -lh'" /etc/skel/.bashrc || { echo "ÉCHEC DU TEST : /etc/skel/.bashrc non restauré" >&2; exit 1; }
echo "Test du Lab 09 réussi."
