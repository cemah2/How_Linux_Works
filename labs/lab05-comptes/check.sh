#!/usr/bin/env bash
# Lab 05 : correction automatique (ne modifie rien).
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root

if [[ ! -f "${ETAT_DIR}/lab05.debut" ]]; then
  alerte "le lab n’a pas été démarré sur cette machine : lance d’abord « lab start 05 »"
  exit 1
fi

AUJOURDHUI=$(( $(date -u +%s) / 86400 ))
FIN_STAGE=$(( $(date -u -d 2027-06-30 +%s) / 86400 ))

shadow() { getent shadow "$1" | cut -d: -f"$2"; }
passwd_champ() { getent passwd "$1" | cut -d: -f"$2"; }
dans_groupe() { id -nG "$1" 2>/dev/null | tr ' ' '\n' | grep -qx "$2"; }
mot_de_passe_defini() { [[ "$(shadow "$1" 2)" == \$* ]]; }
doit_changer() { [[ "$(shadow "$1" 3)" == 0 ]]; }
rep_personnel_ok() { local h; h="$(passwd_champ "$1" 6)"; [[ "$h" == "/home/$1" && -d "$h" && "$(stat -c %U "$h")" == "$1" ]]; }
shell_bash() { [[ "$(passwd_champ "$1" 7)" == */bash ]]; }
verrouille() { [[ "$(shadow kevin 2)" == \!* ]]; }
expire_ou_sans_shell() {
  local e; e="$(shadow kevin 8)"
  { [[ -n "$e" ]] && (( e <= AUJOURDHUI )); } || [[ "$(passwd_champ kevin 7)" =~ (nologin|/false)$ ]]
}
lecteur_journaux() { dans_groupe "$1" systemd-journal || dans_groupe "$1" adm; }
archive_ok() { tar tzf /root/archives/kevin.tar.gz 2>/dev/null | grep -q 'notes-recettes.txt'; }

# Valeur effective d'un réglage pwquality (le dernier fichier lu l'emporte)
pwq() {
  local f fichiers=(/etc/security/pwquality.conf)
  for f in /etc/security/pwquality.conf.d/*.conf; do [[ -f "$f" ]] && fichiers+=("$f"); done
  cat "${fichiers[@]}" 2>/dev/null | sed -nE "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*(-?[0-9]+).*/\1/p" | tail -1
}
pwq_au_moins() { local v; v="$(pwq "$1")"; [[ -n "$v" ]] && (( v >= $2 )); }
pwq_au_plus()  { local v; v="$(pwq "$1")"; [[ -n "$v" ]] && (( v <= $2 )); }
expire_le() { [[ "$(shadow "$1" 8)" == "$2" ]]; }
pam_pwquality_actif() {
  if [[ "$FAMILLE" == debian ]]; then
    grep -qE '^[^#]*pam_pwquality\.so' /etc/pam.d/common-password 2>/dev/null
  else
    grep -qE '^[^#]*pam_pwquality\.so' /etc/pam.d/system-auth /etc/pam.d/password-auth 2>/dev/null
  fi
}
# Valeur effective d'un réglage de journald (fichier principal puis surcharges)
journald() { systemd-analyze cat-config systemd/journald.conf 2>/dev/null | sed -nE "s/^[[:space:]]*$1=[[:space:]]*([^[:space:]#]*).*/\1/p" | tail -1; }
journal_persistant() {
  local s; s="$(journald Storage)"
  [[ "$s" == persistent ]] || { [[ -z "$s" || "$s" == auto ]] && [[ -d /var/log/journal ]]; }
}
taille_journal_ok() { [[ "$(journald SystemMaxUse)" =~ ^200M(B)?$|^209715200$ ]]; }
journald_relance() {
  local t; t="$(systemctl show -p ExecMainStartTimestamp --value systemd-journald 2>/dev/null)"
  [[ -n "$t" ]] && (( $(date -d "$t" +%s 2>/dev/null || echo 0) >= $(stat -c %Y "${ETAT_DIR}/lab05.debut") ))
}
LR=/etc/logrotate.d/boutique
lr_directive() { grep -qE "^[[:space:]]*$1([[:space:]]|$)" "$LR" 2>/dev/null; }
lr_valide() { local s; s="$(logrotate -d "$LR" 2>&1)" && ! grep -qi '^error' <<<"$s"; }
lr_couvre() { logrotate -d "$LR" 2>&1 | grep -q '/var/log/boutique/commandes.log'; }
ip_trouvee() {
  local attendue lue
  attendue="$(cat "${ETAT_DIR}/lab05.ip")"
  lue="$(grep -m1 '[^[:space:]]' /root/audit/ip-suspecte.txt 2>/dev/null | tr -d '[:space:]')"
  [[ -n "$lue" && "$lue" == "$attendue" ]]
}

# 1 ---------------------------------------------------------------------------
objectif "Léa : compte créé, équipe brassage, mot de passe provisoire à changer"
exiger "le compte lea n’existe pas" utilisateur_existe lea
exiger "le répertoire personnel /home/lea doit exister et appartenir à lea" rep_personnel_ok lea
exiger "le shell de lea doit être bash" shell_bash lea
exiger "lea doit être dans le groupe brasseurs" dans_groupe lea brasseurs
exiger "lea doit être dans le groupe personnel" dans_groupe lea personnel
exiger "lea n’a pas de mot de passe (passwd lea ou chpasswd)" mot_de_passe_defini lea
exiger "lea devra changer son mot de passe à la première connexion (chage -d 0 ou passwd -e)" doit_changer lea
fin_objectif

# 2 ---------------------------------------------------------------------------
objectif "Yanis : compte de stagiaire boutique, expirant le 30 juin 2027"
exiger "le compte yanis n’existe pas" utilisateur_existe yanis
exiger "le répertoire personnel /home/yanis doit exister et appartenir à yanis" rep_personnel_ok yanis
exiger "yanis doit être dans le groupe boutique" dans_groupe yanis boutique
exiger "yanis doit être dans le groupe personnel" dans_groupe yanis personnel
exiger "yanis n’a pas de mot de passe" mot_de_passe_defini yanis
exiger "yanis devra changer son mot de passe à la première connexion" doit_changer yanis
exiger "le compte de yanis doit expirer le 2027-06-30 (chage -l yanis)" expire_le yanis "$FIN_STAGE"
fin_objectif

# 3 ---------------------------------------------------------------------------
objectif "Malik rejoint la compta sans quitter la boutique"
exiger "malik doit être dans le groupe compta" dans_groupe malik compta
exiger "malik n’est plus dans le groupe boutique (usermod -G sans -a ?)" dans_groupe malik boutique
exiger "malik n’est plus dans le groupe personnel (usermod -G sans -a ?)" dans_groupe malik personnel
fin_objectif

# 4 ---------------------------------------------------------------------------
objectif "Inès peut lire tous les journaux sans être administratrice"
exiger "ines doit être dans le groupe systemd-journal (ou adm)" lecteur_journaux ines
refuser "ines ne doit pas recevoir les pleins pouvoirs (groupe ${GROUPE_ADMIN})" dans_groupe ines "$GROUPE_ADMIN"
fin_objectif

# 5 ---------------------------------------------------------------------------
objectif "Départ de Kevin : compte bloqué mais conservé, fichiers archivés, processus arrêtés"
exiger "le compte kevin a disparu : il fallait le bloquer, pas le supprimer (délai de 30 jours)" utilisateur_existe kevin
exiger "le mot de passe de kevin n’est pas verrouillé (passwd -l)" verrouille
exiger "kevin pourrait encore se connecter par clé SSH : fais expirer le compte (usermod -e 1 / chage -E 0) ou retire-lui son shell" expire_ou_sans_shell
exiger "archive /root/archives/kevin.tar.gz absente ou incomplète (documents de kevin)" archive_ok
refuser "des processus de kevin tournent encore (ps -u kevin)" pgrep -u kevin
fin_objectif

# 6 ---------------------------------------------------------------------------
objectif "Politique de mots de passe : 12 caractères minimum, dont au moins un chiffre"
exiger "le module pam_pwquality n’est pas utilisé pour les changements de mot de passe (Debian : paquet libpam-pwquality)" pam_pwquality_actif
exiger "minlen vaut « $(pwq minlen) » au lieu d’au moins 12 (/etc/security/pwquality.conf)" pwq_au_moins minlen 12
exiger "dcredit vaut « $(pwq dcredit) » : pour exiger au moins un chiffre, il faut une valeur négative (-1)" pwq_au_plus dcredit -1
fin_objectif

# 7 ---------------------------------------------------------------------------
objectif "Le journal systemd est conservé sur disque, limité à 200 Mo"
exiger "le journal est encore volatil (Storage=$(journald Storage) ; regarde aussi /etc/systemd/journald.conf.d/)" journal_persistant
exiger "SystemMaxUse doit valoir 200M (actuel : « $(journald SystemMaxUse) »)" taille_journal_ok
exiger "journald n’a pas été redémarré depuis le début du lab : la configuration n’est pas appliquée" journald_relance
fin_objectif

# 8 ---------------------------------------------------------------------------
objectif "Rotation du journal des commandes : hebdomadaire, 8 semaines, compressée, sans perdre de lignes"
exiger "${LR} n’existe pas" test -f "$LR"
exiger "logrotate -d ${LR} signale une erreur" lr_valide
exiger "la configuration ne concerne pas /var/log/boutique/commandes.log" lr_couvre
for d in weekly compress missingok notifempty; do
  exiger "directive « ${d} » absente" lr_directive "$d"
done
exiger "directive « rotate 8 » absente" lr_directive 'rotate[[:space:]]+8'
exiger "la boutique garde son journal ouvert et ne sait pas le rouvrir : il faut copytruncate" lr_directive copytruncate
fin_objectif

# 9 ---------------------------------------------------------------------------
objectif "Audit : l’adresse IP la plus insistante est identifiée"
exiger "/root/audit/ip-suspecte.txt absent ou adresse incorrecte (une seule adresse, celle qui a le plus d’échecs)" ip_trouvee
fin_objectif

bilan 05
