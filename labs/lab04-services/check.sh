#!/usr/bin/env bash
# Lab 04 : correction automatique (ne modifie rien).
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root

if [[ ! -f "${ETAT_DIR}/lab04.debut" ]]; then
  alerte "le lab n’a pas été démarré sur cette machine : lance d’abord « lab start 04 »"
  exit 1
fi

champ_passwd() { getent passwd "$1" | cut -d: -f"$2"; }
compte_systeme() {
  local uid; uid="$(champ_passwd vitrine 3)"
  [[ -n "$uid" ]] && (( uid > 0 && uid < 1000 ))
}
sans_shell() { [[ "$(champ_passwd vitrine 7)" =~ (nologin|/false)$ ]]; }
# PID du processus qui écoute sur 127.0.0.1:8080 (ou *:8080)
pid_port() { ss -ltnpH 'sport = :8080' 2>/dev/null | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2; }
utilisateur_du_port() { local p; p="$(pid_port)"; [[ -n "$p" ]] && ps -o user= -p "$p" | tr -d ' '; }
port_tenu_par() { [[ "$(utilisateur_du_port)" == "$1" ]]; }
instance_manuelle() { pgrep -u malik -f 'http.server 8080' >/dev/null 2>&1; }
repond() { curl -fsS --max-time 3 http://127.0.0.1:8080/ 2>/dev/null | grep -q 'Brasserie du Noyau'; }
fichier_unite() { propriete "$1" FragmentPath; }
restart_ok() { local r; r="$(propriete vitrine.service Restart)"; [[ "$r" == on-failure || "$r" == always || "$r" == on-abnormal ]]; }
inventaire_intact() { sha256sum --quiet -c "${ETAT_DIR}/lab04.inventaire" >/dev/null 2>&1; }
surcharge_presente() { compgen -G '/etc/systemd/system/inventaire.service.d/*.conf' >/dev/null; }
nice_effectif() {
  local p; p="$(propriete inventaire.service MainPID)"
  [[ -n "$p" && "$p" != 0 && "$(ps -o ni= -p "$p" | tr -d ' ')" == 10 ]]
}
calendrier_ok() { propriete export-ventes.timer TimersCalendar | grep -q 'OnCalendar=Mon..Fri \*-\*-\* 02:30:00'; }
export_recent() { [[ -n "$(find /srv/ventes/exports -name 'ventes-*.csv' -newer "${ETAT_DIR}/lab04.debut" -print -quit 2>/dev/null)" ]]; }
a_tourne() { local t; t="$(propriete export-ventes.service ExecMainExitTimestampMonotonic)"; [[ -n "$t" && "$t" != 0 ]]; }
ligne_cron_active() {
  grep -sqE '^[^#].*export-ventes' /etc/crontab /etc/cron.d/* && return 0
  crontab -l -u root 2>/dev/null | grep -qE '^[^#].*export-ventes'
}

# 1 ---------------------------------------------------------------------------
objectif "Le compte système vitrine existe (sans connexion possible)"
exiger "le compte vitrine n’existe pas" utilisateur_existe vitrine
exiger "vitrine doit être un compte système (UID < 1000 : useradd --system)" compte_systeme
exiger "vitrine ne doit pas avoir de shell de connexion (shell actuel : $(champ_passwd vitrine 7))" sans_shell
exiger "le répertoire personnel de vitrine doit être /opt/vitrine (actuel : $(champ_passwd vitrine 6))" \
  bash -c "[[ \"\$(getent passwd vitrine | cut -d: -f6)\" == /opt/vitrine ]]"
fin_objectif

# 2 ---------------------------------------------------------------------------
objectif "L’instance lancée à la main par Malik est arrêtée"
refuser "la vitrine de Malik tourne toujours (ss -ltnp, ou ps -u malik)" instance_manuelle
fin_objectif

# 3 ---------------------------------------------------------------------------
objectif "vitrine.service existe dans /etc/systemd/system, est activé et actif"
exiger "fichier d’unité attendu : /etc/systemd/system/vitrine.service (actuel : $(fichier_unite vitrine.service))" \
  bash -c "[[ \"\$(systemctl show -p FragmentPath --value vitrine.service)\" == /etc/systemd/system/vitrine.service ]]"
exiger "vitrine.service n’est pas activé au démarrage" unite_activee vitrine.service
exiger "vitrine.service n’est pas actif (systemctl status vitrine ; journalctl -u vitrine)" unite_active vitrine.service
fin_objectif

# 4 ---------------------------------------------------------------------------
objectif "Le service tourne sous le compte vitrine, avec son fichier d’environnement, et redémarre s’il plante"
exiger "User= doit valoir vitrine (actuel : $(propriete vitrine.service User))" propriete_est vitrine.service User vitrine
exiger "EnvironmentFile= doit désigner /etc/vitrine/vitrine.env (pas de PORT en dur dans l’unité)" \
  bash -c "systemctl show -p EnvironmentFiles --value vitrine.service | grep -q '^/etc/vitrine/vitrine.env'"
exiger "Restart= doit valoir on-failure (actuel : $(propriete vitrine.service Restart))" restart_ok
fin_objectif

# 5 ---------------------------------------------------------------------------
objectif "La vitrine répond sur http://127.0.0.1:8080/, servie par le service"
exiger "rien ne répond correctement sur http://127.0.0.1:8080/ (curl)" repond
exiger "le port 8080 n’est pas tenu par le compte vitrine (actuel : $(utilisateur_du_port || echo personne))" port_tenu_par vitrine
fin_objectif

# 6 ---------------------------------------------------------------------------
objectif "inventaire.service adapté par une surcharge : Nice=10 et MemoryMax=200M"
exiger "le fichier de l’éditeur /usr/lib/systemd/system/inventaire.service a été modifié : il sera écrasé à la prochaine mise à jour" inventaire_intact
exiger "aucune surcharge dans /etc/systemd/system/inventaire.service.d/ (systemctl edit)" surcharge_presente
exiger "Nice= vaut $(propriete inventaire.service Nice) au lieu de 10" propriete_est inventaire.service Nice 10
exiger "MemoryMax= vaut $(propriete inventaire.service MemoryMax) au lieu de 200M (209715200)" propriete_est inventaire.service MemoryMax 209715200
exiger "le processus d’inventaire ne tourne pas avec nice 10 : as-tu redémarré le service ?" nice_effectif
fin_objectif

# 7 ---------------------------------------------------------------------------
objectif "export-ventes.timer : du lundi au vendredi à 2 h 30, avec rattrapage, activé"
exiger "export-ventes.timer n’existe pas" bash -c "systemctl cat export-ventes.timer >/dev/null 2>&1"
exiger "le calendrier doit être Mon..Fri *-*-* 02:30:00 (systemd-analyze calendar pour tester)" calendrier_ok
exiger "Persistent=true manque (rattrapage si la machine était éteinte)" propriete_est export-ventes.timer Persistent yes
exiger "export-ventes.timer n’est pas activé" unite_activee export-ventes.timer
exiger "export-ventes.timer n’est pas démarré (systemctl list-timers)" unite_active export-ventes.timer
fin_objectif

# 8 ---------------------------------------------------------------------------
objectif "export-ventes.service (oneshot) a été testé avec succès"
exiger "export-ventes.service doit être de type oneshot" propriete_est export-ventes.service Type oneshot
exiger "export-ventes.service doit lancer /usr/local/bin/export-ventes" \
  bash -c "systemctl show -p ExecStart --value export-ventes.service | grep -q 'path=/usr/local/bin/export-ventes'"
exiger "le service n’a encore jamais tourné : teste-le (systemctl start export-ventes.service)" a_tourne
exiger "la dernière exécution a échoué (journalctl -u export-ventes)" propriete_est export-ventes.service Result success
exiger "aucun export récent dans /srv/ventes/exports" export_recent
fin_objectif

# 9 ---------------------------------------------------------------------------
objectif "L’ancienne tâche cron est retirée (sinon l’export tournerait deux fois)"
refuser "une ligne cron active lance encore export-ventes (/etc/cron.d, /etc/crontab ou crontab de root)" ligne_cron_active
fin_objectif

bilan 04
