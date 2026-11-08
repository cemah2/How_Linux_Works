#!/usr/bin/env bash
# Lab 09 : le script d'archivage de Bastien, des relevés à archiver, l'environnement de l'équipe à ranger.
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -euo pipefail
ICI="$(dirname "$(readlink -f "$0")")"
F="$ICI/fichiers"

a_systemd || { alerte "ce lab nécessite systemd"; exit 1; }
"$ICI/reset.sh" --silencieux

installer_paquets tar gzip findutils deb=shellcheck
if [[ "$FAMILLE" == redhat ]] && ! command -v shellcheck >/dev/null 2>&1; then
  # ShellCheck est dans EPEL sur Rocky : on essaie, sans en faire une condition du lab.
  { dnf install -y -q epel-release && dnf install -y -q ShellCheck; } >/dev/null 2>&1 \
    || alerte "shellcheck n’a pas pu être installé : la vérification shellcheck sera sautée"
fi

mkdir -p "$ETAT_DIR"
touch "${ETAT_DIR}/lab09.debut"
assurer_compte 09 lea "Léa Durand, brasseuse" brasseurs
if ! id releves >/dev/null 2>&1; then
  useradd --system --home-dir /srv/releves --no-create-home --shell /usr/sbin/nologin \
    -c "Relevés des cuves" releves
  echo "compte releves" >> "${ETAT_DIR}/lab09.crees"
fi

info "le script d’archivage de Bastien dans /usr/local/bin"
install -m 755 "$F/archive-releves" /usr/local/bin/archive-releves
sha256sum /usr/local/bin/archive-releves > "${ETAT_DIR}/lab09.origine"

info "les outils de la brasserie dans /opt/brasserie/bin"
install -d -m 755 /opt/brasserie /opt/brasserie/bin
install -m 755 "$F/etat-cuves" /opt/brasserie/bin/etat-cuves

info "trois mois de relevés dans /srv/releves"
install -d -m 750 -o releves -g releves /srv/releves /srv/archives
for jour in 3 9 15 21 27 33 39 45 51 57; do
  for cuve in "cuve 1" cuve2 cuve3; do
    f="/srv/releves/${cuve}_$(date -d "$jour days ago" +%F).csv"
    printf 'heure;densite;temperature\n08:00;1.0%02d;19.%d\n' "$jour" "$((jour % 10))" > "$f"
    touch -d "$jour days ago" "$f"
  done
done
echo "Penser à commander du houblon." > /srv/releves/notes.txt
touch -d '30 days ago' /srv/releves/notes.txt
chown -R releves:releves /srv/releves

info "le message de bienvenue de Léa"
HOME_LEA="$(getent passwd lea | cut -d: -f6)"
[[ -f "$HOME_LEA/.bashrc" ]] || install -m 644 -o lea -g lea /etc/skel/.bashrc "$HOME_LEA/.bashrc"
cp -p "$HOME_LEA/.bashrc" "${ETAT_DIR}/lab09.lea-bashrc"
sed -i '1i echo "Bienvenue à la brasserie, Léa !"' "$HOME_LEA/.bashrc"

# Fichiers système que le lab demande de ne pas modifier (ou qu'il faudra restaurer)
cp -p /etc/skel/.bashrc "${ETAT_DIR}/lab09.skel-bashrc"
ls -A /etc/skel > "${ETAT_DIR}/lab09.skel-liste"
sha256sum /etc/profile > "${ETAT_DIR}/lab09.profile"

info "situation de départ prête : lis le ticket dans le README du lab"
