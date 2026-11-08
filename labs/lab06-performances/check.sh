#!/usr/bin/env bash
# Lab 06 : correction automatique (ne modifie rien).
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root

if [[ ! -f "${ETAT_DIR}/lab06.debut" ]]; then
  alerte "le lab n’a pas été démarré sur cette machine : lance d’abord « lab start 06 »"
  exit 1
fi
RAPPORT=/root/diagnostic-06.txt

collecte_activee() {
  if [[ "$FAMILLE" == debian ]]; then
    grep -qE '^[[:space:]]*ENABLED="?true"?' /etc/default/sysstat 2>/dev/null
  else
    unite_activee sysstat-collect.timer || unite_activee sysstat.service
  fi
}
pid_de() { pgrep -o -x "$1" 2>/dev/null; }
nice_de() { local p; p="$(pid_de "$1")"; [[ -n "$p" ]] && ps -o ni= -p "$p" | tr -d ' '; }
nice_est() { [[ "$(nice_de "$1")" == "$2" ]]; }
ionice_repos() { local p; p="$(pid_de sauvegarde-nuit)"; [[ -n "$p" ]] && ionice -p "$p" 2>/dev/null | grep -q '^idle'; }
memoire_cache() { cat "/sys/fs/cgroup/system.slice/catalogue-cache.service/memory.current" 2>/dev/null; }
memoire_sous() { local m; m="$(memoire_cache)"; [[ -n "$m" ]] && (( m < $1 )); }
# Vrai si un processus garde ouvert un fichier supprimé de /var/log/capteurs
fichier_supprime_ouvert() {
  local fd
  for fd in /proc/[0-9]*/fd/*; do
    [[ "$(readlink "$fd" 2>/dev/null)" == /var/log/capteurs/*' (deleted)' ]] && return 0
  done
  return 1
}
rapport_cite() { grep -qi "$1" "$RAPPORT" 2>/dev/null; }

# 1 ---------------------------------------------------------------------------
objectif "Les outils sysstat sont installés et la collecte historique est activée"
for c in iostat pidstat sar; do exiger "commande ${c} introuvable (paquet sysstat)" command -v "$c"; done
if [[ "$FAMILLE" == debian ]]; then
  exiger "la collecte n’est pas activée : ENABLED=\"true\" dans /etc/default/sysstat (ou dpkg-reconfigure sysstat)" collecte_activee
else
  exiger "la collecte n’est pas activée : systemctl enable --now sysstat" collecte_activee
fi
fin_objectif

# 2 ---------------------------------------------------------------------------
objectif "Le gros calcul de Malik continue, mais laisse passer les autres (nice 19)"
exiger "le calcul de Malik ne tourne plus : il devait continuer (lab reset 06 puis lab start 06 pour recommencer)" pid_de calcul-stocks
exiger "le calcul tourne avec nice $(nice_de calcul-stocks || echo '?') au lieu de 19 (renice)" nice_est calcul-stocks 19
fin_objectif

# 3 ---------------------------------------------------------------------------
objectif "La sauvegarde continue, mais n’utilise le disque que quand il est libre (classe idle)"
exiger "la sauvegarde ne tourne plus : elle devait continuer" pid_de sauvegarde-nuit
exiger "le processus principal de la sauvegarde n’est pas dans la classe d’E/S idle (ionice)" ionice_repos
fin_objectif

# 4 ---------------------------------------------------------------------------
objectif "Le cache du catalogue est limité à 150 Mo de mémoire, sans modifier son unité"
exiger "MemoryMax de catalogue-cache.service vaut $(propriete catalogue-cache.service MemoryMax) au lieu de 150M (157286400)" \
  propriete_est catalogue-cache.service MemoryMax 157286400
refuser "le fichier d’unité /etc/systemd/system/catalogue-cache.service a été modifié : utilise systemctl set-property ou une surcharge" \
  grep -q MemoryMax /etc/systemd/system/catalogue-cache.service
exiger "catalogue-cache.service n’est pas actif" unite_active catalogue-cache.service
exiger "le cgroup du cache utilise encore plus de 150 Mo (attends 10 s : il s’adapte)" memoire_sous 157286400
fin_objectif

# 5 ---------------------------------------------------------------------------
objectif "L’espace du fichier brut des capteurs, supprimé mais encore ouvert, est libéré"
refuser "un processus garde ouvert un fichier supprimé de /var/log/capteurs : l’espace n’est pas libéré (lsof +L1)" fichier_supprime_ouvert
exiger "capteurs-brut.service doit continuer de tourner" unite_active capteurs-brut.service
fin_objectif

# 6 ---------------------------------------------------------------------------
objectif "Le diagnostic ${RAPPORT} nomme les quatre coupables"
exiger "${RAPPORT} absent" test -s "$RAPPORT"
exiger "le diagnostic ne nomme pas le processus qui monopolisait le processeur" rapport_cite calcul-stocks
exiger "le diagnostic ne nomme pas le processus qui saturait le disque" rapport_cite sauvegarde-nuit
exiger "le diagnostic ne nomme pas le service qui consommait la mémoire" rapport_cite catalogue-cache
exiger "le diagnostic ne nomme pas le service qui tenait le fichier supprimé" rapport_cite capteurs
fin_objectif

bilan 06
