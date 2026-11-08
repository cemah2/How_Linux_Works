#!/usr/bin/env bash
# Lab 11 : deux archives de sources et un correctif à installer proprement ; une vieille bibliothèque
# et un LD_LIBRARY_PATH global laissés par Bastien.
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -euo pipefail
ICI="$(dirname "$(readlink -f "$0")")"
F="$ICI/fichiers"

"$ICI/reset.sh" --silencieux

# La chaîne de compilation est fournie (le ticket porte sur la suite) ; les en-têtes de zlib ne le sont pas.
installer_paquets gcc make patch binutils file tar gzip deb=pkgconf rh=pkgconf-pkg-config

mkdir -p "$ETAT_DIR"
touch "${ETAT_DIR}/lab11.debut"
assurer_compte 11 lea "Léa Durand, brasseuse" brasseurs

info "l’ancienne libdensite 0.9 de Bastien dans /opt/vieux-densite"
TRAVAIL="$(mktemp -d)"
trap 'rm -rf "$TRAVAIL"' EXIT
install -d -m 755 /opt/vieux-densite/lib
cc -O2 -fPIC -shared -Wl,-soname,libdensite.so.1 -o "$TRAVAIL/libdensite.so.0.9" "$F/libdensite-0.9/densite.c"
install -m 755 "$TRAVAIL/libdensite.so.0.9" /opt/vieux-densite/lib/libdensite.so.0.9
ln -sf libdensite.so.0.9 /opt/vieux-densite/lib/libdensite.so.1
cat > /etc/profile.d/bastien-densite.sh <<'EOF'
# Bastien, mars 2025 : pour que l'ancien jaugeur trouve sa bibliothèque.
export LD_LIBRARY_PATH=/opt/vieux-densite/lib
EOF

info "les sources dans /usr/local/src"
install -d -m 755 /usr/local/src
tar -C "$F" --owner=0 --group=0 -czf /usr/local/src/libdensite-1.0.tar.gz libdensite-1.0
tar -C "$F" --owner=0 --group=0 -czf /usr/local/src/jaugeur-2.1.tar.gz jaugeur-2.1
install -m 644 "$F/jaugeur-2.1-securite.patch" /usr/local/src/
(cd /usr/local/src && sha256sum libdensite-1.0.tar.gz jaugeur-2.1.tar.gz jaugeur-2.1-securite.patch > SHA256SUMS)

info "situation de départ prête : lis le ticket dans le README du lab"
