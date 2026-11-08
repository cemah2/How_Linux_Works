#!/usr/bin/env bash
# Lab 09 : correction automatique. Le script de l'apprenant est exécuté sous le compte « releves »,
# sur des jeux de relevés jetables créés dans /tmp/hlw-lab09.* (rien d'autre n'est modifié, à part un
# compte de test temporaire pour l'objectif 10).
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root

if [[ ! -f "${ETAT_DIR}/lab09.debut" ]]; then
  alerte "le lab n’a pas été démarré sur cette machine : lance d’abord « lab start 09 »"
  exit 1
fi

SCRIPT=/usr/local/bin/archive-releves
DEBUT_CHECK="$(date '+%F %T')"
HOME_LEA="$(getent passwd lea | cut -d: -f6)"
BACS=()
nettoyer() {
  local b
  for b in "${BACS[@]}"; do rm -rf "$b"; done
  userdel -r hlwtest09 >/dev/null 2>&1 || true
}
trap nettoyer EXIT

# --- Jeux d'essai ---------------------------------------------------------------
# preparer_bac : crée un répertoire d'essai neuf (BAC) avec src/, dst/ et tmp/
#   src/cuve 1.csv, cuve2.csv (10 jours), cuve0.csv (40 jours), cuve3.csv (aujourd'hui),
#   notes.txt (10 jours, pas un .csv), ancien/cuve9.csv (20 jours, dans un sous-répertoire)
preparer_bac() {
  BAC="$(mktemp -d /tmp/hlw-lab09.XXXXXX)"
  BACS+=("$BAC")
  mkdir -p "$BAC/src/ancien" "$BAC/dst" "$BAC/tmp"
  local f
  for f in "cuve 1.csv" cuve2.csv cuve0.csv cuve3.csv notes.txt ancien/cuve9.csv; do
    printf 'heure;densite\n08:00;1.012\n' > "$BAC/src/$f"
  done
  touch -d '10 days ago' "$BAC/src/cuve 1.csv" "$BAC/src/cuve2.csv" "$BAC/src/notes.txt"
  touch -d '40 days ago' "$BAC/src/cuve0.csv"
  touch -d '20 days ago' "$BAC/src/ancien/cuve9.csv"
  chown -R releves:releves "$BAC"
  chmod 755 "$BAC"
}
# lancer ARGS… : exécute le script sous « releves », avec un environnement minimal et TMPDIR=$BAC/tmp.
# Remplit SORTIE, ERREURS et CODE.
lancer() {
  CODE=0
  (cd "$BAC" && runuser -u releves -- env -i PATH=/usr/local/bin:/usr/bin:/bin LANG=C.UTF-8 \
      HOME=/tmp TMPDIR="$BAC/tmp" timeout 20 "$SCRIPT" "$@") \
    >"$BAC/.sortie" 2>"$BAC/.erreurs" </dev/null || CODE=$?
  SORTIE="$(cat "$BAC/.sortie")"
  ERREURS="$(cat "$BAC/.erreurs")"
}
etat_src() { (cd "$BAC/src" && find . -printf '%P|%s|%T@\n' | LC_ALL=C sort); }
archives() { find "$BAC/dst" -maxdepth 1 -type f -name '*.tar.gz' 2>/dev/null; }
nb_archives() { archives | wc -l; }
contenu_archive() { tar -tzf "$(archives | head -1)" 2>/dev/null | sed 's#.*/##' | grep -v '^$' | LC_ALL=C sort | paste -sd '|'; }
present() { [[ -e "$BAC/src/$1" ]]; }
tmp_vide() { [[ -z "$(ls -A "$BAC/tmp" 2>/dev/null)" ]]; }

script_present() { [[ -x "$SCRIPT" && -f "$SCRIPT" ]]; }
script_d_origine() { sha256sum --quiet -c "${ETAT_DIR}/lab09.origine" >/dev/null 2>&1; }

# 1 ---------------------------------------------------------------------------
objectif "Le script archive-releves est réécrit, exécutable, sans erreur de syntaxe"
exiger "$SCRIPT est absent ou non exécutable" script_present
refuser "c’est encore le script d’origine de Bastien" script_d_origine
exiger "erreur de syntaxe (bash -n $SCRIPT)" bash -n "$SCRIPT"
if command -v shellcheck >/dev/null 2>&1; then
  exiger "shellcheck signale des avertissements (shellcheck -S warning $SCRIPT)" shellcheck -S warning "$SCRIPT"
else
  alerte "shellcheck absent : vérification shellcheck sautée"
fi
fin_objectif

if ! script_present; then
  # Inutile de dérouler les essais sans script.
  for t in "Les erreurs d’utilisation sont signalées (usage, codes de sortie 2 et 1)" \
           "-n simule : liste les vieux relevés sans rien modifier" \
           "Archivage : une archive datée avec exactement les vieux relevés, originaux supprimés" \
           "-j JOURS est respecté" \
           "Cas limites : rien à archiver, destination interdite, aucun fichier temporaire oublié" \
           "Chaque archivage réussi est journalisé (logger -t archive-releves)"; do
    objectif "$t"; exiger "le script est absent" false; fin_objectif
  done
else
  # 2 -------------------------------------------------------------------------
  objectif "Les erreurs d’utilisation sont signalées (usage, codes de sortie 2 et 1)"
  preparer_bac
  lancer
  exiger "sans argument : code de sortie $CODE au lieu de 2" test "$CODE" -eq 2
  exiger "sans argument : le message d’usage doit aller sur la sortie d’erreur (stderr) et contenir « usage »" \
    grep -qi usage <<<"$ERREURS"
  exiger "sans argument : rien ne doit s’afficher sur la sortie standard" test -z "$SORTIE"
  lancer "$BAC/src"
  exiger "avec un seul argument : code $CODE au lieu de 2" test "$CODE" -eq 2
  lancer -z "$BAC/src" "$BAC/dst"
  exiger "option inconnue (-z) : code $CODE au lieu de 2" test "$CODE" -eq 2
  lancer "$BAC/inexistant" "$BAC/dst"
  exiger "SOURCE inexistante : code $CODE au lieu de 1" test "$CODE" -eq 1
  exiger "SOURCE inexistante : un message d’erreur est attendu sur stderr" test -n "$ERREURS"
  fin_objectif

  # 3 -------------------------------------------------------------------------
  objectif "-n simule : liste les vieux relevés sans rien modifier"
  preparer_bac
  AVANT="$(etat_src)"
  lancer -n "$BAC/src" "$BAC/dst"
  exiger "-n : code de sortie $CODE au lieu de 0 (erreurs : ${ERREURS:0:120})" test "$CODE" -eq 0
  exiger "-n : « cuve 1.csv » (10 jours, nom avec une espace) doit être listé" grep -qF "cuve 1.csv" <<<"$SORTIE"
  exiger "-n : cuve2.csv et cuve0.csv doivent être listés" bash -c 'grep -qF cuve2.csv <<<"$1" && grep -qF cuve0.csv <<<"$1"' _ "$SORTIE"
  refuser "-n : cuve3.csv est récent, il ne doit pas être listé" grep -qF cuve3.csv <<<"$SORTIE"
  refuser "-n : notes.txt n’est pas un .csv" grep -qF notes.txt <<<"$SORTIE"
  refuser "-n : ancien/cuve9.csv est dans un sous-répertoire (pas d’archivage récursif)" grep -qF cuve9.csv <<<"$SORTIE"
  exiger "-n : la source a été modifiée" test "$AVANT" == "$(etat_src)"
  exiger "-n : une archive a été créée" test "$(nb_archives)" -eq 0
  fin_objectif

  # 4 -------------------------------------------------------------------------
  objectif "Archivage : une archive datée avec exactement les vieux relevés, originaux supprimés"
  preparer_bac
  lancer "$BAC/src" "$BAC/dst"
  exiger "code de sortie $CODE au lieu de 0 (erreurs : ${ERREURS:0:160})" test "$CODE" -eq 0
  exiger "il faut exactement une archive dans DESTINATION (trouvées : $(nb_archives))" test "$(nb_archives)" -eq 1
  NOM="$(basename "$(archives | head -1)" 2>/dev/null)"
  exiger "nom attendu : releves-AAAAMMJJ-HHMMSS.tar.gz (obtenu : ${NOM:-aucun})" \
    bash -c '[[ "$1" =~ ^releves-[0-9]{8}-[0-9]{6}\.tar\.gz$ ]]' _ "$NOM"
  CONTENU="$(contenu_archive)"
  exiger "contenu attendu : « cuve 1.csv », cuve0.csv, cuve2.csv (obtenu : ${CONTENU:-illisible})" \
    test "$CONTENU" == "cuve 1.csv|cuve0.csv|cuve2.csv"
  refuser "les relevés archivés doivent être supprimés de la source" \
    bash -c '[[ -e "$1/cuve 1.csv" || -e "$1/cuve2.csv" || -e "$1/cuve0.csv" ]]' _ "$BAC/src"
  exiger "cuve3.csv (récent), notes.txt et ancien/cuve9.csv doivent rester en place" \
    bash -c '[[ -e "$1/cuve3.csv" && -e "$1/notes.txt" && -e "$1/ancien/cuve9.csv" ]]' _ "$BAC/src"
  fin_objectif

  # 5 -------------------------------------------------------------------------
  objectif "-j JOURS est respecté"
  preparer_bac
  lancer -j 30 "$BAC/src" "$BAC/dst"
  exiger "-j 30 : code de sortie $CODE au lieu de 0" test "$CODE" -eq 0
  CONTENU="$(contenu_archive)"
  exiger "-j 30 : seul cuve0.csv (40 jours) doit être archivé (obtenu : ${CONTENU:-rien})" test "$CONTENU" == "cuve0.csv"
  exiger "-j 30 : « cuve 1.csv » (10 jours) doit rester en place" present "cuve 1.csv"
  fin_objectif

  # 6 -------------------------------------------------------------------------
  objectif "Cas limites : rien à archiver, destination interdite, aucun fichier temporaire oublié"
  preparer_bac
  touch "$BAC/src/"*.csv
  lancer "$BAC/src" "$BAC/dst"
  exiger "rien à archiver : le code de sortie doit être 0 (obtenu : $CODE)" test "$CODE" -eq 0
  exiger "rien à archiver : aucune archive ne doit être créée" test "$(nb_archives)" -eq 0
  exiger "rien à archiver : aucun fichier temporaire ne doit rester dans \$TMPDIR" tmp_vide
  preparer_bac
  chown root:root "$BAC/dst"; chmod 755 "$BAC/dst"
  AVANT="$(etat_src)"
  lancer "$BAC/src" "$BAC/dst"
  exiger "destination non modifiable : le script doit échouer (code ≠ 0)" test "$CODE" -ne 0
  exiger "destination non modifiable : aucun relevé ne doit être supprimé" test "$AVANT" == "$(etat_src)"
  exiger "après un échec : aucun fichier temporaire ne doit rester dans \$TMPDIR (mktemp + trap)" tmp_vide
  refuser "le script utilise encore un fichier temporaire au nom fixe (/tmp/archive-releves.liste)" \
    grep -q '/tmp/archive-releves\.liste' "$SCRIPT"
  fin_objectif

  # 7 -------------------------------------------------------------------------
  objectif "Chaque archivage réussi est journalisé (logger -t archive-releves)"
  journalctl --sync >/dev/null 2>&1 || true
  sleep 1
  exiger "aucun message « archive-releves » dans le journal pendant la correction (journalctl -t archive-releves)" \
    bash -c 'journalctl -q -t archive-releves --since "$1" -o cat | grep -q .' _ "$DEBUT_CHECK"
  fin_objectif
fi

# 8 ---------------------------------------------------------------------------
# en_connexion_lea 'commandes' : shell de connexion de Léa ; seule la partie entre @@…@@ est gardée
# (un éventuel message d'accueil ne doit pas fausser la mesure).
en_connexion_lea() { runuser -l lea -c "$1" </dev/null 2>/dev/null | sed -n 's/.*@@\(.*\)@@.*/\1/p' | tail -1; }
chemin_lea() { en_connexion_lea 'printf "@@%s@@\n" "$PATH"'; }
outil_trouve() { [[ "$(en_connexion_lea 'printf "@@%s@@\n" "$(command -v etat-cuves)"')" == /opt/brasserie/bin/etat-cuves ]]; }
une_seule_fois() {
  local p n
  p="$(en_connexion_lea '. /etc/profile.d/brasserie.sh; printf "@@%s@@\n" "$PATH"')"
  n="$(tr ':' '\n' <<<"$p" | grep -cx /opt/brasserie/bin)"
  [[ "$n" -eq 1 ]]
}
apres_usr_bin() {
  local p; p="$(chemin_lea)"
  [[ ":$p:" == *:/usr/bin:*:/opt/brasserie/bin:* ]]
}
objectif "Tous les utilisateurs ont /opt/brasserie/bin dans leur PATH (/etc/profile.d/brasserie.sh)"
exiger "/etc/profile.d/brasserie.sh n’existe pas" test -f /etc/profile.d/brasserie.sh
exiger "/etc/profile a été modifié : remets-le d’origine et utilise /etc/profile.d" \
  sha256sum --quiet --status -c "${ETAT_DIR}/lab09.profile"
exiger "dans un shell de connexion de Léa, etat-cuves est introuvable (runuser -l lea -c 'command -v etat-cuves')" outil_trouve
exiger "/opt/brasserie/bin doit être ajouté APRÈS les répertoires du système (PATH de Léa : $(chemin_lea))" apres_usr_bin
exiger "sourcer brasserie.sh une seconde fois ajoute /opt/brasserie/bin en double : ne l’ajoute que s’il manque" une_seule_fois
fin_objectif

# 9 ---------------------------------------------------------------------------
sortie_non_interactive() { runuser -u lea -- bash -c '. "$1"' _ "$HOME_LEA/.bashrc" </dev/null 2>/dev/null; }
silencieux() { [[ -z "$(sortie_non_interactive)" ]]; }
accueil_interactif() {
  { runuser -u lea -- bash -i -c true; runuser -u lea -- bash -l -i -c true; } </dev/null 2>/dev/null | grep -q Bienvenue
}
objectif "Le .bashrc de Léa n’affiche rien hors session interactive, mais garde son message d’accueil"
exiger "~lea/.bashrc affiche encore quelque chose en mode non interactif (cela casse scp, rsync, sftp)" silencieux
exiger "le message « Bienvenue… » de Léa doit toujours s’afficher quand elle ouvre un terminal" accueil_interactif
exiger "erreur de syntaxe dans ~lea/.bashrc (bash -n)" bash -n "$HOME_LEA/.bashrc"
fin_objectif

# 10 --------------------------------------------------------------------------
alias_nouveau_compte() {
  userdel -r hlwtest09 >/dev/null 2>&1 || true
  useradd -m -s /bin/bash hlwtest09 >/dev/null 2>&1 || return 1
  runuser -u hlwtest09 -- bash -i -c 'alias ll' </dev/null 2>/dev/null | grep -Eq "ls -lh['\"]?$"
  local r=$?
  userdel -r hlwtest09 >/dev/null 2>&1 || true
  return $r
}
objectif "Les nouveaux comptes reçoivent l’alias ll='ls -lh' (/etc/skel)"
exiger "un compte créé avec useradd -m n’a pas l’alias ll='ls -lh' dans ses shells interactifs" alias_nouveau_compte
exiger "erreur de syntaxe dans /etc/skel/.bashrc (bash -n)" bash -n /etc/skel/.bashrc
fin_objectif

# 11 --------------------------------------------------------------------------
calendrier_ok() { propriete archive-releves.timer TimersCalendar | grep -q 'OnCalendar=\*-\*-\* 03:15:00'; }
a_tourne() { local t; t="$(propriete archive-releves.service ExecMainExitTimestampMonotonic)"; [[ -n "$t" && "$t" != 0 ]]; }
archive_srv() { [[ -n "$(find /srv/archives -maxdepth 1 -name 'releves-*.tar.gz' -newer "${ETAT_DIR}/lab09.debut" -print -quit 2>/dev/null)" ]]; }
execstart_ok() {
  local e; e="$(propriete archive-releves.service ExecStart)"
  [[ "$e" == *"path=/usr/local/bin/archive-releves"* && "$e" == *"/srv/releves"* && "$e" == *"/srv/archives"* ]]
}
objectif "archive-releves.timer : chaque nuit à 3 h 15, avec rattrapage, sous le compte releves, testé"
exiger "archive-releves.timer n’existe pas" bash -c "systemctl cat archive-releves.timer >/dev/null 2>&1"
exiger "le calendrier doit être *-*-* 03:15:00 (systemd-analyze calendar pour tester)" calendrier_ok
exiger "Persistent=true manque" propriete_est archive-releves.timer Persistent yes
exiger "archive-releves.timer n’est pas activé et démarré" bash -c "systemctl is-enabled --quiet archive-releves.timer && systemctl is-active --quiet archive-releves.timer"
exiger "archive-releves.service doit être de type oneshot" propriete_est archive-releves.service Type oneshot
exiger "archive-releves.service doit tourner sous le compte releves (User=)" propriete_est archive-releves.service User releves
exiger "ExecStart doit lancer /usr/local/bin/archive-releves /srv/releves /srv/archives" execstart_ok
exiger "le service n’a jamais tourné : teste-le (systemctl start archive-releves.service)" a_tourne
exiger "la dernière exécution a échoué (journalctl -u archive-releves)" propriete_est archive-releves.service Result success
exiger "aucune archive releves-*.tar.gz récente dans /srv/archives" archive_srv
fin_objectif

bilan 09
