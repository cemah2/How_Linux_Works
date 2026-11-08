#!/usr/bin/env bash
# Lab 11 : correction automatique (ne modifie rien, à part des fichiers d'essai dans /tmp).
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root

if [[ ! -f "${ETAT_DIR}/lab11.debut" ]]; then
  alerte "le lab n’a pas été démarré sur cette machine : lance d’abord « lab start 11 »"
  exit 1
fi

SRC=/usr/local/src
LIB=/opt/densite/lib
J="$SRC/jaugeur-2.1"
ESSAI="$(mktemp -d /tmp/hlw-lab11.XXXXXX)"
chmod 755 "$ESSAI"
trap 'rm -rf "$ESSAI"' EXIT

# --- Outils ----------------------------------------------------------------------
# en_connexion_lea 'commandes' : shell de connexion de Léa (avec /etc/profile.d) ; garde ce qui est entre @@…@@
en_connexion_lea() { runuser -l lea -c "$1" </dev/null 2>/dev/null | sed -n 's/.*@@\(.*\)@@.*/\1/p' | tail -1; }
soname() { readelf -d "$1" 2>/dev/null | sed -n 's/.*(SONAME).*\[\(.*\)\].*/\1/p'; }
pc_prefix() { sed -n 's/^prefix=//p' "$LIB/pkgconfig/densite.pc" 2>/dev/null; }
pc_version() { PKG_CONFIG_PATH="$LIB/pkgconfig" pkg-config --modversion densite 2>/dev/null; }
cache_densite() { ldconfig -p 2>/dev/null | sed -n 's/^[[:space:]]*libdensite\.so\.1 .*=> //p' | head -1; }
conf_ld_d() { grep -lsE "^[[:space:]]*/opt/densite/lib/?[[:space:]]*$" /etc/ld.so.conf.d/*.conf | head -1; }
ldlp_global() {
  grep -sE '^[^#]*LD_LIBRARY_PATH' /etc/profile /etc/profile.d/*.sh /etc/environment /etc/bash.bashrc /etc/bashrc >/dev/null
}
ldlp_lea() { [[ -n "$(en_connexion_lea 'printf "@@%s@@\n" "${LD_LIBRARY_PATH:-}"')" ]]; }
version_lea() { en_connexion_lea 'printf "@@%s@@\n" "$(jaugeur --version 2>&1)"'; }
ldd_jaugeur() { ldd /usr/local/bin/jaugeur 2>/dev/null | sed -n 's/^[[:space:]]*libdensite\.so\.1 => \([^ ]*\).*/\1/p'; }

# 1 ---------------------------------------------------------------------------
objectif "Les en-têtes de zlib sont installés (paquet de développement)"
exiger "/usr/include/zlib.h est absent : quel paquet le fournit ? (apt-file search / dnf provides)" test -f /usr/include/zlib.h
exiger "pkg-config ne connaît pas zlib (pkg-config --modversion zlib)" pkg-config --exists zlib
fin_objectif

# 2 ---------------------------------------------------------------------------
objectif "Les deux archives sont déballées dans /usr/local/src"
exiger "$SRC/libdensite-1.0/ est absent (tar xf … dans /usr/local/src)" test -f "$SRC/libdensite-1.0/densite.c"
exiger "$SRC/jaugeur-2.1/ est absent" test -f "$J/configure"
fin_objectif

# 3 ---------------------------------------------------------------------------
objectif "libdensite 1.0 est installée dans /opt/densite (bibliothèque, en-tête, densite.pc)"
exiger "$LIB/libdensite.so.1 est absent" test -e "$LIB/libdensite.so.1"
exiger "$LIB/libdensite.so.1 doit avoir le soname libdensite.so.1" test "$(soname "$LIB/libdensite.so.1")" == libdensite.so.1
exiger "/opt/densite/include/densite.h est absent" test -f /opt/densite/include/densite.h
exiger "$LIB/pkgconfig/densite.pc est absent" test -f "$LIB/pkgconfig/densite.pc"
exiger "densite.pc indique prefix=$(pc_prefix) au lieu de /opt/densite : le même PREFIX doit servir à make et à make install (make clean, puis recommence)" \
  test "$(pc_prefix)" == /opt/densite
exiger "PKG_CONFIG_PATH=$LIB/pkgconfig pkg-config --modversion densite doit répondre 1.0" test "$(pc_version)" == 1.0
refuser "une copie de libdensite traîne dans /usr/local/lib (installation avec le préfixe par défaut) : supprime-la" \
  compgen -G '/usr/local/lib/libdensite.so*'
fin_objectif

# 4 ---------------------------------------------------------------------------
objectif "Le chargeur dynamique trouve libdensite 1.0 pour tous les programmes (/etc/ld.so.conf.d)"
exiger "aucun fichier de /etc/ld.so.conf.d/ ne contient /opt/densite/lib" test -n "$(conf_ld_d)"
exiger "le cache ne contient pas libdensite.so.1 de /opt/densite/lib (ldconfig -p | grep densite ; as-tu lancé ldconfig ?)" \
  test "$(cache_densite)" == "$LIB/libdensite.so.1"
fin_objectif

# 5 ---------------------------------------------------------------------------
objectif "Plus aucun LD_LIBRARY_PATH global"
refuser "LD_LIBRARY_PATH est encore défini dans /etc/profile.d, /etc/profile, /etc/environment ou bashrc" ldlp_global
refuser "un shell de connexion de Léa a encore LD_LIBRARY_PATH (runuser -l lea -c 'echo \$LD_LIBRARY_PATH')" ldlp_lea
fin_objectif

# 6 ---------------------------------------------------------------------------
objectif "Le correctif de sécurité est appliqué aux sources de jaugeur"
exiger "src/jaugeur.c n’est pas corrigé (patch -p? < $SRC/jaugeur-2.1-securite.patch, depuis $J)" \
  grep -qF '%15[^;]' "$J/src/jaugeur.c"
exiger "la version doit être 2.1-p1 dans src/jaugeur.c" grep -qF '#define VERSION "2.1-p1"' "$J/src/jaugeur.c"
refuser "des fichiers .rej montrent un correctif mal appliqué" bash -c "compgen -G '$J/src/*.rej' || compgen -G '$J/*.rej'"
fin_objectif

# 7 ---------------------------------------------------------------------------
objectif "jaugeur est configuré pour /usr/local, construit, et a passé make check"
exiger "pas de Makefile dans $J : lance ./configure" test -f "$J/Makefile"
exiger "le Makefile doit avoir prefix = /usr/local" grep -qE '^prefix = /usr/local/?$' "$J/Makefile"
exiger "$J/jaugeur n’est pas construit (make)" test -x "$J/jaugeur"
exiger "le binaire construit est plus ancien que src/jaugeur.c : reconstruis après le correctif" test "$J/jaugeur" -nt "$J/src/jaugeur.c"
exiger "make check n’a pas réussi (test-suite.log doit contenir « RÉSULTAT : OK »)" grep -q 'RÉSULTAT : OK' "$J/test-suite.log"
fin_objectif

# 8 ---------------------------------------------------------------------------
objectif "jaugeur 2.1-p1 est installé dans /usr/local et fonctionne pour tous avec libdensite 1.0"
exiger "/usr/local/bin/jaugeur est absent (make install)" test -x /usr/local/bin/jaugeur
exiger "la page de manuel /usr/local/share/man/man1/jaugeur.1 est absente" test -f /usr/local/share/man/man1/jaugeur.1
exiger "ldd /usr/local/bin/jaugeur : libdensite.so.1 doit venir de $LIB (actuel : $(ldd_jaugeur || echo introuvable))" \
  test "$(ldd_jaugeur)" == "$LIB/libdensite.so.1"
V="$(version_lea)"
exiger "pour Léa, jaugeur --version doit afficher 2.1-p1 (obtenu : ${V:-rien})" grep -qF 'jaugeur 2.1-p1' <<<"$V"
exiger "pour Léa, jaugeur doit utiliser libdensite 1.0 (obtenu : ${V:-rien})" grep -qF 'libdensite 1.0' <<<"$V"
fin_objectif

# 9 ---------------------------------------------------------------------------
cat > "$ESSAI/releve.csv" <<'EOF'
# cuve;og;fg
cuve-7;1.060;1.012
EOF
gzip -c "$ESSAI/releve.csv" > "$ESSAI/releve.csv.gz"
python3 -c "print('cuve-' + 'X' * 480 + ';1.050;1.010'); print('cuve-8;1.048;1.010')" > "$ESSAI/piege.csv" 2>/dev/null \
  || { printf 'cuve-%0480d;1.050;1.010\ncuve-8;1.048;1.010\n' 0 > "$ESSAI/piege.csv"; }
chmod 644 "$ESSAI"/*
lancer_jaugeur() { runuser -u lea -- env -i PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/jaugeur "$@" 2>/dev/null; }
calcul_juste() { lancer_jaugeur "$ESSAI/releve.csv" | grep -qE '^cuve-7 +6\.30 % vol\. +atténuation +80\.0 %'; }
lit_gzip() { lancer_jaugeur "$ESSAI/releve.csv.gz" | grep -q '^cuve-7 '; }
resiste() {
  local code=0
  lancer_jaugeur "$ESSAI/piege.csv" >"$ESSAI/sortie" || code=$?
  (( code < 128 )) && grep -q '^cuve-8 ' "$ESSAI/sortie"
}
objectif "jaugeur calcule juste, lit les relevés compressés et résiste au relevé piégé"
exiger "résultat faux pour cuve-7 (1.060 → 1.012 : 6,30 % vol., atténuation 80,0 %)" calcul_juste
exiger "jaugeur ne lit pas un relevé compressé (.csv.gz)" lit_gzip
exiger "jaugeur plante sur un nom de cuve trop long (le correctif est-il dans le binaire installé ?)" resiste
fin_objectif

bilan 11
