#!/usr/bin/env bash
# Lab 11 : remet la machine dans l'état d'avant le lab (les paquets installés restent).
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -u

rm -rf /opt/densite /opt/vieux-densite
rm -rf /usr/local/src/libdensite-1.0 /usr/local/src/jaugeur-2.1
rm -f /usr/local/src/libdensite-1.0.tar.gz /usr/local/src/jaugeur-2.1.tar.gz \
  /usr/local/src/jaugeur-2.1-securite.patch /usr/local/src/SHA256SUMS
rm -f /usr/local/bin/jaugeur /usr/local/share/man/man1/jaugeur.1
# Une installation avec le préfixe par défaut (/usr/local) a pu laisser des fichiers
rm -f /usr/local/lib/libdensite.so* /usr/local/include/densite.h /usr/local/lib/pkgconfig/densite.pc
rm -f /etc/profile.d/bastien-densite.sh
for f in /etc/ld.so.conf.d/*.conf; do
  [[ -f "$f" ]] && grep -qE '/opt/(vieux-)?densite' "$f" && rm -f "$f"
done
ldconfig 2>/dev/null || true

supprimer_crees 11
rm -f "${ETAT_DIR}/lab11.debut"

[[ "${1:-}" == "--silencieux" ]] || info "lab 11 nettoyé"
