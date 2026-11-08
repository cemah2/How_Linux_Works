# shellcheck shell=bash
# Bibliothèque commune aux scripts des labs (setup.sh, check.sh, reset.sh).
# À sourcer : source "$(dirname "$0")/../lib/commun.sh"

LABS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ETAT_DIR="/var/lib/hlw"
export LABS_DIR ETAT_DIR

if [[ -t 1 ]]; then
  C_VERT=$'\e[32m'; C_ROUGE=$'\e[31m'; C_JAUNE=$'\e[33m'; C_GRAS=$'\e[1m'; C_GRIS=$'\e[90m'; C_RAZ=$'\e[0m'
else
  C_VERT=''; C_ROUGE=''; C_JAUNE=''; C_GRAS=''; C_GRIS=''; C_RAZ=''
fi

# --- Distribution ---------------------------------------------------------
FAMILLE="inconnue"
DISTRIB="inconnue"
if [[ -r /etc/os-release ]]; then
  # shellcheck source=/dev/null
  . /etc/os-release
  DISTRIB="${PRETTY_NAME:-${ID:-inconnue}}"
  case " ${ID:-} ${ID_LIKE:-} " in
    *" debian "*|*" ubuntu "*) FAMILLE="debian" ;;
    *" rhel "*|*" fedora "*|*" centos "*|*" rocky "*) FAMILLE="redhat" ;;
  esac
fi
if [[ "$FAMILLE" == "redhat" ]]; then GROUPE_ADMIN="wheel"; else GROUPE_ADMIN="sudo"; fi
export FAMILLE DISTRIB GROUPE_ADMIN

a_systemd() { [[ -d /run/systemd/system ]]; }

exiger_root() {
  [[ $EUID -eq 0 ]] || { echo "Ce script doit être lancé en root (passe par « lab », qui utilise sudo)." >&2; exit 1; }
}

info()   { printf '%s==>%s %s\n' "$C_GRAS" "$C_RAZ" "$*"; }
alerte() { printf '%s !! %s %s\n' "$C_JAUNE" "$C_RAZ" "$*" >&2; }

# --- Correction : objectifs -----------------------------------------------
# Usage dans check.sh :
#   objectif "Les quatre répertoires existent"
#   exiger "brassage est un répertoire"  test -d /srv/…/brassage
#   exiger "…"                           commande args…
#   fin_objectif
#   …
#   bilan 01
TOTAL=0
REUSSIS=0
OBJ_TITRE=""
OBJ_OK=1
OBJ_RAISONS=()

objectif() {
  OBJ_TITRE="$1"; OBJ_OK=1; OBJ_RAISONS=()
}

# exiger "raison affichée si échec" commande [args…]
exiger() {
  local raison="$1"; shift
  if ! "$@" >/dev/null 2>&1; then
    OBJ_OK=0
    OBJ_RAISONS+=("$raison")
  fi
}

# refuser "raison affichée si la commande RÉUSSIT" commande [args…]
refuser() {
  local raison="$1"; shift
  if "$@" >/dev/null 2>&1; then
    OBJ_OK=0
    OBJ_RAISONS+=("$raison")
  fi
}

fin_objectif() {
  TOTAL=$((TOTAL + 1))
  if (( OBJ_OK )); then
    REUSSIS=$((REUSSIS + 1))
    printf ' %s✔%s %2d. %s\n' "$C_VERT" "$C_RAZ" "$TOTAL" "$OBJ_TITRE"
  else
    printf ' %s✘%s %2d. %s\n' "$C_ROUGE" "$C_RAZ" "$TOTAL" "$OBJ_TITRE"
    local r
    for r in "${OBJ_RAISONS[@]}"; do printf '       %s- %s%s\n' "$C_GRIS" "$r" "$C_RAZ"; done
  fi
}

# bilan NUMÉRO_DU_LAB : affiche le score, l'enregistre, renvoie 0 si tout est validé
bilan() {
  local lab="$1"
  echo
  if (( REUSSIS == TOTAL )); then
    printf '%sLab %s validé : %d/%d objectifs.%s Bravo !\n' "$C_VERT$C_GRAS" "$lab" "$REUSSIS" "$TOTAL" "$C_RAZ"
  else
    printf '%sLab %s : %d/%d objectifs validés.%s Indices : lab hint %s 1 (puis 2, 3).\n' "$C_GRAS" "$lab" "$REUSSIS" "$TOTAL" "$C_RAZ" "$lab"
  fi
  mkdir -p "$ETAT_DIR"
  printf '%s %d/%d\n' "$(date '+%F %T')" "$REUSSIS" "$TOTAL" >> "${ETAT_DIR}/lab${lab}.resultats"
  (( REUSSIS == TOTAL ))
}

# --- Petits tests réutilisables ---------------------------------------------
mode_est()    { [[ "$(stat -c '%a' "$1" 2>/dev/null)" == "$2" ]]; }
groupe_est()  { [[ "$(stat -c '%G' "$1" 2>/dev/null)" == "$2" ]]; }
proprio_est() { [[ "$(stat -c '%U' "$1" 2>/dev/null)" == "$2" ]]; }
# Vrai si aucun élément sous $1 (hors $1 lui-même) ne donne un droit aux « autres »
rien_pour_les_autres() { [[ -z "$(find "$1" -mindepth 1 -perm /o=rwx -print -quit 2>/dev/null)" ]]; }
# Vrai si tous les fichiers ordinaires sous $1 appartiennent au groupe $2
fichiers_du_groupe() { [[ -z "$(find "$1" -type f ! -group "$2" -print -quit 2>/dev/null)" ]]; }
# Vrai si tous les fichiers ordinaires sous $1 sont lisibles et modifiables par leur groupe
groupe_peut_modifier() { [[ -z "$(find "$1" -type f ! -perm -g=rw -print -quit 2>/dev/null)" ]]; }
# Correspondance EXACTE sur le nom du processus (pgrep -x) : pgrep -f attraperait aussi
# n'importe quel shell dont la ligne de commande contient ce texte.
processus_absent() { ! pgrep -x "$1" >/dev/null 2>&1; }
utilisateur_existe() { id "$1" >/dev/null 2>&1; }

# --- Paquets ---------------------------------------------------------------
paquet_installe() {
  if [[ "$FAMILLE" == "debian" ]]; then
    dpkg-query -W -f='${Status}' "$1" 2>/dev/null | grep -q 'ok installed'
  else
    rpm -q "$1" >/dev/null 2>&1
  fi
}

# installer_paquets nom… : installe ce qui manque. Préfixes « deb= » et « rh= » pour un paquet
# propre à une famille (ex. : installer_paquets lvm2 deb=xfsprogs).
installer_paquets() {
  local p manquants=()
  for p in "$@"; do
    case "$p" in
      deb=*) [[ "$FAMILLE" == "debian" ]] || continue; p="${p#deb=}" ;;
      rh=*)  [[ "$FAMILLE" == "redhat" ]] || continue; p="${p#rh=}" ;;
    esac
    paquet_installe "$p" || manquants+=("$p")
  done
  (( ${#manquants[@]} )) || return 0
  info "installation des paquets nécessaires : ${manquants[*]}"
  if [[ "$FAMILLE" == "debian" ]]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get install -y -qq "${manquants[@]}" >/dev/null 2>&1 \
      || { apt-get update -qq >/dev/null 2>&1 && apt-get install -y -qq "${manquants[@]}" >/dev/null; }
  else
    dnf install -y -q "${manquants[@]}" >/dev/null
  fi
}

# --- Comptes partagés par plusieurs labs ---------------------------------------
# Les labs 01, 05 et 06 utilisent les mêmes personnages. Un lab ne crée un compte ou un groupe
# que s'il manque, et note ce qu'il a créé (pour que son reset ne supprime que cela).
assurer_groupe() { # lab groupe
  getent group "$2" >/dev/null && return 0
  groupadd "$2"
  mkdir -p "$ETAT_DIR"; echo "groupe $2" >> "${ETAT_DIR}/lab$1.crees"
}
assurer_compte() { # lab nom "Description" groupe_secondaire…
  local lab="$1" nom="$2" desc="$3"; shift 3
  local g groupes=""
  for g in "$@"; do assurer_groupe "$lab" "$g"; groupes+="${groupes:+,}$g"; done
  if id "$nom" >/dev/null 2>&1; then
    [[ -n "$groupes" ]] && usermod -aG "$groupes" "$nom"
    return 0
  fi
  useradd -m -s /bin/bash -c "$desc" ${groupes:+-G "$groupes"} "$nom"
  mkdir -p "$ETAT_DIR"; echo "compte $nom" >> "${ETAT_DIR}/lab${lab}.crees"
}
# Supprime les comptes puis les groupes créés par le lab (dans l'ordre inverse).
supprimer_crees() { # lab
  local f="${ETAT_DIR}/lab$1.crees" type nom
  [[ -f "$f" ]] || return 0
  while read -r type nom; do
    [[ "$type" == compte ]] || continue
    pkill -u "$nom" 2>/dev/null || true
    userdel -r "$nom" >/dev/null 2>&1 || userdel "$nom" >/dev/null 2>&1 || true
  done < "$f"
  while read -r type nom; do
    [[ "$type" == groupe ]] && { groupdel "$nom" >/dev/null 2>&1 || true; }
  done < "$f"
  rm -f "$f"
}

# --- systemd ---------------------------------------------------------------
propriete() { systemctl show -p "$2" --value "$1" 2>/dev/null; }   # propriete unité Nom
propriete_est() { [[ "$(propriete "$1" "$2")" == "$3" ]]; }
unite_active() { systemctl is-active --quiet "$1"; }
unite_activee() { systemctl is-enabled --quiet "$1" 2>/dev/null; }
# Retire proprement une unité installée par un lab (et ses surcharges).
retirer_unite() { # nom.ext…
  local u
  for u in "$@"; do
    systemctl disable --now "$u" >/dev/null 2>&1 || true
    systemctl reset-failed "$u" >/dev/null 2>&1 || true
    rm -rf "/etc/systemd/system/$u" "/etc/systemd/system/$u.d" "/etc/systemd/system.control/$u" \
      "/etc/systemd/system.control/$u.d" "/run/systemd/system.control/$u.d" "/usr/lib/systemd/system/$u"
  done
  systemctl daemon-reload
}
# Identifiant du démarrage en cours (change à chaque redémarrage)
id_demarrage() { cat /proc/sys/kernel/random/boot_id; }
