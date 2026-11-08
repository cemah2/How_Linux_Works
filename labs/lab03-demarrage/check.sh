#!/usr/bin/env bash
# Lab 03 : correction automatique (ne modifie rien).
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root

if [[ ! -f "${ETAT_DIR}/lab03.cible" ]]; then
  alerte "le lab n’a pas été démarré sur cette machine : lance d’abord « lab start 03 »"
  exit 1
fi

FICHIERS_DEMARRAGE=(/etc/default/grub /etc/default/grub.d /boot/grub/grub.cfg /boot/grub2/grub.cfg
  /boot/grub2/grubenv /boot/loader/entries /etc/kernel/cmdline)
RAPPORT=/root/incident-03.md

root_a_mot_de_passe() { local e; e="$(passwd -S root 2>/dev/null | awk '{print $2}')"; [[ "$e" == P || "$e" == PS ]]; }
panne_declenchee() { [[ -s "${ETAT_DIR}/lab03.panne" ]]; }
redemarre_depuis() { panne_declenchee && [[ "$(id_demarrage)" != "$(cat "${ETAT_DIR}/lab03.panne")" ]]; }
cave_bloquante() { # vrai si une ligne active monte /srv/cave sans nofail ni noauto
  awk '$1 !~ /^#/ && $2 == "/srv/cave" && $4 !~ /(^|,)(nofail|noauto)(,|$)/ {trouve = 1} END {exit !trouve}' /etc/fstab
}
cmdline_propre() { ! grep -qw 'systemd.unit=rescue.target' /proc/cmdline && ! grep -qw 'systemd.unit=emergency.target' /proc/cmdline; }
config_demarrage_propre() { ! grep -rqs 'systemd.unit=\(rescue\|emergency\)' "${FICHIERS_DEMARRAGE[@]}"; }
cible_normale() { local c; c="$(systemctl get-default 2>/dev/null)"; [[ "$c" == multi-user.target || "$c" == graphical.target ]]; }
chemin_execstart() { systemctl show -p ExecStart --value "$1" 2>/dev/null | sed -n 's/.*path=\([^ ;]*\).*/\1/p' | head -1; }
programme_existe() { local p; p="$(chemin_execstart "$1")"; [[ -n "$p" && -x "$p" ]]; }
type_demon() { local t; t="$(propriete "$1" Type)"; [[ "$t" == simple || "$t" == exec || "$t" == notify || "$t" == forking ]]; }
rapport_mentionne() { grep -qi "$1" "$RAPPORT" 2>/dev/null; }
rapport_assez_long() { [[ "$(grep -c '[^[:space:]]' "$RAPPORT" 2>/dev/null)" -ge 5 ]]; }

# 1 ---------------------------------------------------------------------------
objectif "Le compte root a un mot de passe (indispensable en mode secours)"
exiger "root n’a pas de mot de passe utilisable : sudo passwd root" root_a_mot_de_passe
fin_objectif

# 2 ---------------------------------------------------------------------------
objectif "La panne a été déclenchée, et la machine a redémarré depuis"
exiger "la panne n’a pas encore été déclenchée : lab panne 03" panne_declenchee
exiger "la machine n’a pas redémarré depuis la panne : redémarre pour prouver que la réparation tient" redemarre_depuis
fin_objectif

# 3 ---------------------------------------------------------------------------
objectif "/etc/fstab ne bloque plus le démarrage"
refuser "/srv/cave est toujours monté au démarrage alors que son disque n’existe plus (supprime/commente la ligne, ou ajoute nofail)" cave_bloquante
fin_objectif

# 4 ---------------------------------------------------------------------------
objectif "Les paramètres du noyau ne forcent plus le mode secours"
exiger "le démarrage EN COURS a reçu systemd.unit=… (cat /proc/cmdline)" cmdline_propre
exiger "la configuration du chargeur contient encore systemd.unit=… (grep -r dans /etc/default et /boot)" config_demarrage_propre
fin_objectif

# 5 ---------------------------------------------------------------------------
objectif "La cible par défaut est de nouveau multi-user.target"
exiger "cible par défaut actuelle : $(systemctl get-default 2>/dev/null) (systemctl set-default)" cible_normale
exiger "multi-user.target n’est pas atteinte dans le démarrage en cours" unite_active multi-user.target
fin_objectif

# 6 ---------------------------------------------------------------------------
objectif "brassd fonctionne et démarre avec la machine"
exiger "le programme lancé par brassd.service n’existe pas (systemctl cat brassd)" programme_existe brassd.service
exiger "brassd.service n’est pas actif" unite_active brassd.service
exiger "brassd.service n’est pas activé au démarrage" unite_activee brassd.service
fin_objectif

# 7 ---------------------------------------------------------------------------
objectif "Le collecteur des capteurs tourne, sans retarder le démarrage"
exiger "collecte-capteurs est un démon qui ne s’arrête jamais : Type=oneshot ne convient pas (Type actuel : $(propriete collecte-capteurs.service Type))" \
  type_demon collecte-capteurs.service
exiger "collecte-capteurs.service n’est pas actif" unite_active collecte-capteurs.service
exiger "collecte-capteurs.service n’est pas activé au démarrage" unite_activee collecte-capteurs.service
fin_objectif

# 8 ---------------------------------------------------------------------------
objectif "Le rapport d’incident ${RAPPORT} explique les causes"
exiger "${RAPPORT} absent ou trop court (au moins 5 lignes : symptômes, causes, corrections)" rapport_assez_long
exiger "le rapport ne parle pas de fstab" rapport_mentionne fstab
exiger "le rapport ne parle pas du mode secours (rescue)" rapport_mentionne rescue
exiger "le rapport ne parle pas de brassd" rapport_mentionne brassd
exiger "le rapport ne parle pas du collecteur des capteurs" rapport_mentionne capteur
fin_objectif

bilan 03
