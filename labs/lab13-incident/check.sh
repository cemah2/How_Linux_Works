#!/usr/bin/env bash
# Lab 13 : correction automatique. Seule modification : une commande de contrôle « HLW13-controle »
# est passée à la boutique pour vérifier que les commandes sont bien enregistrées.
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
export LC_ALL=C.UTF-8   # motifs accentués du rapport

if [[ ! -f "${ETAT_DIR}/lab13.debut" ]]; then
  alerte "le lab n’a pas été démarré sur cette machine : lance d’abord « lab start 13 »"
  exit 1
fi

DONNEES=/srv/boutique/donnees
URL=http://127.0.0.1:8090
RAPPORT=/root/rapport-incident.md

# --- Outils ----------------------------------------------------------------------
code_http() { curl -s -o /dev/null -w '%{http_code}' --max-time 8 "$1" 2>/dev/null; }
sante() { curl -s --max-time 8 "$URL/sante" 2>/dev/null | tr -d '\n'; }
commande_ok() {
  local avant apres
  avant="$(grep -c 'HLW13-controle' "$DONNEES/commandes.log" 2>/dev/null)"
  [[ "$(code_http "$URL/commande?biere=HLW13-controle&qte=1")" == 200 ]] || return 1
  apres="$(grep -c 'HLW13-controle' "$DONNEES/commandes.log" 2>/dev/null)"
  (( ${apres:-0} > ${avant:-0} ))
}
occupation() { df --output=pcent "$DONNEES" 2>/dev/null | tail -1 | tr -dc '0-9'; }
supprimes_ouverts() { find /proc/[0-9]*/fd -lname "$DONNEES/*(deleted)" 2>/dev/null | head -1; }
pid_boutique() { propriete boutique.service MainPID; }
env_debug() {
  local p; p="$(pid_boutique)"
  [[ -n "$p" && "$p" != 0 ]] && tr '\0' '\n' < "/proc/$p/environ" 2>/dev/null | grep -qx 'BOUTIQUE_DEBUG=1'
}
surcharge_debug() { propriete boutique.service Environment | grep -q 'BOUTIQUE_DEBUG=1'; }
mode_conf() { stat -c '%a' /etc/stock/stock.conf 2>/dev/null; }
conf_secrete() { local m; m="$(mode_conf)"; [[ -n "$m" ]] && (( (8#$m & 8#004) == 0 )); }
conf_lisible_par_stock() { runuser -u stock -- test -r /etc/stock/stock.conf 2>/dev/null; }
ip_stock() { getent ahostsv4 stock.brasserie.lan 2>/dev/null | awk 'NR == 1 { print $1 }'; }
stock_repond() {
  timeout 4 bash -c 'exec 3<>/dev/tcp/stock.brasserie.lan/9100 && echo PING >&3 && read -r -t 2 r <&3 && [[ "$r" == PONG ]]' 2>/dev/null
}
cron_actif() {
  grep -sqE '^[^#]*recalcul-tarifs' /etc/crontab /etc/cron.d/* && return 0
  crontab -l -u root 2>/dev/null | grep -qE '^[^#]*recalcul-tarifs'
}
stockage_journal() {
  systemd-analyze cat-config systemd/journald.conf 2>/dev/null | sed -n 's/^[[:space:]]*Storage[[:space:]]*=[[:space:]]*//p' | tail -1
}
journal_persistant() {
  local s; s="$(stockage_journal)"
  [[ "$s" != volatile && "$s" != none ]] && [[ -d /var/log/journal ]]
}
rotation_ok() {
  [[ -f /etc/logrotate.d/boutique ]] || return 1
  grep -q '/srv/boutique/donnees/journal' /etc/logrotate.d/boutique || return 1
  grep -qE '^[[:space:]]*rotate[[:space:]]+[0-9]+' /etc/logrotate.d/boutique || return 1
  grep -qE '^[[:space:]]*(daily|weekly|monthly|size|maxsize)\b' /etc/logrotate.d/boutique || return 1
  logrotate -d /etc/logrotate.d/boutique >/dev/null 2>&1
}
# Rapport
section() { grep -qiE "^#+[[:space:]]*$1" "$RAPPORT" 2>/dev/null; }
nb_heures() { grep -cE '(^|[^0-9])([01]?[0-9]|2[0-3]) ?[h:] ?[0-5][0-9]([^0-9]|$)' "$RAPPORT" 2>/dev/null; }
nb_dates() { grep -ciE '([0-9]{1,2}/[0-9]{1,2})|([0-9]{4}-[0-9]{2}-[0-9]{2})|([0-9]{1,2} (janv|f(é|e)vr|mars|avr|mai|juin|juil|ao(u|û)t|sept|oct|nov|d(é|e)c))' "$RAPPORT" 2>/dev/null; }
mentionne() { grep -qiE "$1" "$RAPPORT" 2>/dev/null; }

# 1 ---------------------------------------------------------------------------
objectif "La boutique est rétablie : /sante répond 200 et une commande est enregistrée"
exiger "boutique.service n’est pas actif (systemctl status boutique)" unite_active boutique.service
exiger "$URL/sante ne répond pas 200 (réponse : $(sante || echo rien))" test "$(code_http "$URL/sante")" == 200
exiger "une commande de contrôle n’a pas pu être enregistrée dans $DONNEES/commandes.log" commande_ok
fin_objectif

# 2 ---------------------------------------------------------------------------
objectif "L’espace du volume de données est vraiment libéré"
exiger "$DONNEES est occupé à $(occupation) % : il faut descendre sous 50 % (df -h, du -sh)" test "$(occupation)" -lt 50
refuser "un fichier supprimé est encore ouvert sur $DONNEES : l’espace n’est pas rendu (lsof +L1)" test -n "$(supprimes_ouverts)"
fin_objectif

# 3 ---------------------------------------------------------------------------
objectif "La cause est traitée : le mode débogage de Malik est retiré"
refuser "la configuration de boutique.service active encore BOUTIQUE_DEBUG=1 (systemctl cat boutique)" surcharge_debug
refuser "le processus de la boutique tourne encore avec BOUTIQUE_DEBUG=1 : redémarre-la après daemon-reload" env_debug
exiger "la boutique doit tourner sous le compte boutique (User=)" propriete_est boutique.service User boutique
fin_objectif

# 4 ---------------------------------------------------------------------------
objectif "stock.service fonctionne, sans exposer son jeton"
exiger "stock.service n’est pas actif (journalctl -u stock)" unite_active stock.service
exiger "stock.service n’est pas activé au démarrage" unite_activee stock.service
exiger "stock.service doit tourner sous le compte stock" propriete_est stock.service User stock
exiger "le compte stock ne peut pas lire /etc/stock/stock.conf" conf_lisible_par_stock
exiger "/etc/stock/stock.conf (mode $(mode_conf)) ne doit pas être lisible par tous : il contient un jeton" conf_secrete
fin_objectif

# 5 ---------------------------------------------------------------------------
objectif "stock.brasserie.lan désigne le bon serveur et le stock répond"
exiger "stock.brasserie.lan résout vers « $(ip_stock) » au lieu de 127.0.0.1 (getent hosts stock.brasserie.lan)" \
  test "$(ip_stock)" == 127.0.0.1
exiger "le service de stock ne répond pas à PING sur stock.brasserie.lan:9100" stock_repond
fin_objectif

# 6 ---------------------------------------------------------------------------
objectif "La surcharge processeur est stoppée"
refuser "des processus recalcul-tarifs tournent encore (pgrep -a recalcul-tarifs)" pgrep -x recalcul-tarifs
refuser "une ligne cron active relance encore recalcul-tarifs chaque minute" cron_actif
fin_objectif

# 7 ---------------------------------------------------------------------------
objectif "Le journal est conservé sur disque (les preuves survivent à un redémarrage)"
exiger "journald est configuré en Storage=$(stockage_journal) : les journaux disparaissent au redémarrage (systemd-analyze cat-config systemd/journald.conf)" journal_persistant
fin_objectif

# 8 ---------------------------------------------------------------------------
objectif "Prévention : les journaux de la boutique ne peuvent plus remplir le volume (logrotate)"
exiger "/etc/logrotate.d/boutique absent, incomplet (chemin, rotate, fréquence ou taille) ou invalide (logrotate -d)" rotation_ok
fin_objectif

# 9 ---------------------------------------------------------------------------
objectif "Le rapport d’incident $RAPPORT est complet"
exiger "$RAPPORT est absent" test -f "$RAPPORT"
exiger "il manque une section « Résumé » (titre markdown : # Résumé)" section 'r(é|e|É)sum(é|e|É)'
exiger "il manque une section « Chronologie »" section 'chronologie'
exiger "il manque une section « Causes »" section 'causes?'
exiger "il manque une section « Actions »" section 'actions?'
exiger "la chronologie doit compter au moins 5 lignes horodatées (21h47, 21:52…) ; trouvées : $(nb_heures)" test "$(nb_heures)" -ge 5
exiger "le rapport doit expliquer le volume plein (disque, espace…)" mentionne 'disque|espace|plein|full'
exiger "le rapport doit nommer la cause du remplissage (mode débogage)" mentionne 'd(é|e)bog|debug'
exiger "le rapport doit parler de la panne du service de stock (permissions de sa configuration)" mentionne 'stock\.conf|permission|droits'
exiger "le rapport doit parler de la résolution de stock.brasserie.lan (/etc/hosts)" mentionne 'hosts|r(é|e)solution|dns'
exiger "le rapport doit parler de la surcharge processeur (recalcul-tarifs)" mentionne 'recalcul|processeur|cpu'
exiger "au moins 3 actions datées (responsable et échéance) ; dates trouvées : $(nb_dates)" test "$(nb_dates)" -ge 3
fin_objectif

bilan 13
