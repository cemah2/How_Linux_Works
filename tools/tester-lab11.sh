#!/usr/bin/env bash
# Test de bout en bout du Lab 11 (CI, en root sur une machine jetable).
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
export LAB_HOME="$RACINE"
LAB="$RACINE/infra/bin/lab"
# shellcheck source=../labs/lib/commun.sh
source "$RACINE/labs/lib/commun.sh"

"$LAB" start 11
if "$LAB" check 11; then
  echo "ÉCHEC DU TEST : la correction initiale ne devrait pas être validée" >&2
  exit 1
fi

# Le piège : un shell de connexion lit /etc/profile.d/bastien-densite.sh
# shellcheck source=/dev/null
. /etc/profile.d/bastien-densite.sh
[[ "${LD_LIBRARY_PATH:-}" == /opt/vieux-densite/lib ]] || { echo "ÉCHEC DU TEST : piège absent" >&2; exit 1; }

# --- Solution (identique à labs/lab11-compilation/solution.md) -----------------
# 1. En-têtes de zlib
if [[ "$FAMILLE" == debian ]]; then
  apt-get install -y -qq zlib1g-dev >/dev/null
else
  dnf install -y -q zlib-devel >/dev/null
fi
# 2. Vérifier et déballer
cd /usr/local/src
sha256sum -c SHA256SUMS
tar tzf libdensite-1.0.tar.gz | head -3
tar xzf libdensite-1.0.tar.gz
tar xzf jaugeur-2.1.tar.gz
# 3. libdensite dans /opt/densite (même PREFIX pour make et make install)
cd /usr/local/src/libdensite-1.0
make PREFIX=/opt/densite
make -n PREFIX=/opt/densite install
make PREFIX=/opt/densite install
# 4. Le chargeur dynamique
echo /opt/densite/lib > /etc/ld.so.conf.d/densite.conf
ldconfig
ldconfig -p | grep libdensite
# 5. Plus de LD_LIBRARY_PATH global
rm /etc/profile.d/bastien-densite.sh
unset LD_LIBRARY_PATH
# 6. Correctif (chemins a/ et b/ : -p1)
cd /usr/local/src/jaugeur-2.1
patch -p1 --dry-run < ../jaugeur-2.1-securite.patch
patch -p1 < ../jaugeur-2.1-securite.patch
# 7. Configurer, construire, tester
PKG_CONFIG_PATH=/opt/densite/lib/pkgconfig ./configure --prefix=/usr/local
make
make check
# 8. Installer
make -n install
make install
# ---------------------------------------------------------------------------

cd "$RACINE"
"$LAB" check 11
"$LAB" reset 11
[[ ! -e /opt/densite && ! -e /usr/local/bin/jaugeur ]] || { echo "ÉCHEC DU TEST : fichiers encore présents" >&2; exit 1; }
! ldconfig -p | grep -q libdensite || { echo "ÉCHEC DU TEST : libdensite encore dans le cache" >&2; exit 1; }
echo "Test du Lab 11 réussi."
