#!/usr/bin/env bash
# Lab 10 : correction automatique, selon le rôle de la machine.
# Seule modification : sur le comptoir, un fichier témoin est créé puis supprimé dans /mnt/boutique.
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
ICI="$(dirname "$(readlink -f "$0")")"
# shellcheck source=../lab07-reseau/reseau.sh
source "$ICI/../lab07-reseau/reseau.sh"
ROLE="${LAB10_ROLE:-$ROLE}"

role_connu || { alerte "machine « ${ROLE} » : lance ce lab sur cuve, comptoir et douane"; exit 1; }
[[ -f "${ETAT_DIR}/lab10.debut" ]] || alerte "le lab n’a pas été démarré sur cette machine : lab start 10"
printf '%sRôle de cette machine : %s%s\n\n' "$C_GRAS" "$ROLE" "$C_RAZ"

CLE=/root/.ssh/sauvegarde
DOUANE="${LAB10_DOUANE:-douane.${DOMAINE}}"

exports() { exportfs -v 2>/dev/null | tr -s ' \t\n' ' '; }
export_ok() { exports | grep -Eq "/srv/partages/commun ${LAN_RESEAU//./\\.}\.0/24\([^)]*\brw\b[^)]*\broot_squash"; }
nfs_actif() { unite_active nfs-server || unite_active nfs-kernel-server; }
nfs_active() { unite_activee nfs-server || unite_activee nfs-kernel-server; }
smb_actif() { unite_active smbd || unite_active smb; }
smb_active() { unite_activee smbd || unite_activee smb; }
smb_param() { testparm -s --section-name="$1" --parameter-name="$2" 2>/dev/null | tail -1; }
smb_global() { testparm -sv 2>/dev/null | awk -F' = ' -v p="$1" 'tolower($1) ~ "^[[:space:]]*" p "$" {print $2; exit}'; }
partage_boutique() { [[ "$(smb_param boutique path)" == /srv/partages/boutique ]]; }
valide_boutique() { smb_param boutique "valid users" | grep -Eq '(^|[ ,])[@+]boutique($|[ ,])'; }
ecriture_boutique() { [[ "$(smb_param boutique "read only")" =~ ^(No|no)$ ]]; }
smb3_min() { smb_global "server min protocol" | grep -qi '^smb3'; }
hosts_allow() { smb_global "hosts allow" | grep -q "${LAN_RESEAU}"; }
compte_samba() { pdbedit -L 2>/dev/null | cut -d: -f1 | grep -qx malik; }
fichier_bastien() { [[ "$(stat -c %U /srv/partages/commun/bonjour-de-bastien.txt 2>/dev/null)" == bastien ]]; }
timer_ok() { propriete sauvegarde-recettes.timer TimersCalendar | grep -q 'OnCalendar=\*-\*-\* 01:00:00'; }
a_tourne() { local t; t="$(propriete sauvegarde-recettes.service ExecMainExitTimestampMonotonic)"; [[ -n "$t" && "$t" != 0 ]]; }
# Différences entre /srv/recettes (sans *.tmp) et la sauvegarde distante : rien = à jour
ecarts() {
  local dest
  for dest in "recettes/" "/srv/sauvegardes/cuve/recettes/"; do
    if sortie="$(rsync -anc --delete --delete-excluded --exclude='*.tmp' --out-format='%n' \
        -e "ssh -i ${CLE} -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new" \
        /srv/recettes/ "sauvegarde@${DOUANE}:${dest}" 2>/dev/null)"; then
      grep -v '^\./\?$' <<<"$sortie"; return 0
    fi
  done
  echo "(connexion impossible)"
}
sauvegarde_a_jour() { [[ -z "$(ecarts)" ]]; }
monte_type() { findmnt -n -o FSTYPE "$1" 2>/dev/null | grep -Eq "^($2)$"; }
monte_depuis() { findmnt -n -o SOURCE "$1" 2>/dev/null | grep -Eq "$2"; }
fstab_ligne() { awk -v p="$1" '$1 !~ /^#/ && $2 == p' /etc/fstab; }
fstab_options() { local o l; l="$(fstab_ligne "$1" | awk '{print $4}')"; shift; for o in "$@"; do [[ ",$l," == *",$o,"* ]] || return 1; done; }
fichier_credentials() { fstab_ligne /mnt/boutique | grep -oE 'credentials=[^, ]+' | head -1 | cut -d= -f2; }
credentials_600() { local f; f="$(fichier_credentials)"; [[ -n "$f" && "$(stat -c %a "$f" 2>/dev/null)" == 600 && "$(stat -c %U "$f")" == root ]]; }
malik_ecrit() { runuser -u malik -- sh -c 'touch /mnt/boutique/.temoin-lab10 && rm -f /mnt/boutique/.temoin-lab10' 2>/dev/null; }
sshfs_bastien() { local h; h="$(getent passwd bastien | cut -d: -f6)"; findmnt -n -o FSTYPE "$h/archives-cuve" 2>/dev/null | grep -q sshfs; }
sauvegarde_compte() { local s; s="$(getent shadow sauvegarde | cut -d: -f2)"; utilisateur_existe sauvegarde && [[ "$s" == \!* || "$s" == \** ]]; }
cle_restreinte() { local h; h="$(getent passwd sauvegarde | cut -d: -f6)"; grep -Eqs '^(restrict|command=|.*,restrict|.*command=).* ssh-ed25519 ' "$h/.ssh/authorized_keys"; }
contenu_sauvegarde() { [[ -n "$(find /srv/sauvegardes/cuve -name '*.recette' -print -quit 2>/dev/null)" ]]; }
sans_tmp() { [[ -z "$(find /srv/sauvegardes/cuve -name '*.tmp' -print -quit 2>/dev/null)" ]]; }

case "$ROLE" in
cuve)
  objectif "NFS : /srv/partages/commun exporté au réseau interne, en écriture, root écrasé"
  exiger "nfs-server n’est pas actif (paquet nfs-kernel-server)" nfs_actif
  exiger "nfs-server n’est pas activé au démarrage" nfs_active
  exiger "exportfs -v ne montre pas /srv/partages/commun ${LAN_RESEAU}.0/24(rw,…,root_squash)" export_ok
  fin_objectif

  objectif "Le fichier créé par Bastien depuis le comptoir lui appartient bien sur cuve"
  exiger "/srv/partages/commun/bonjour-de-bastien.txt absent, ou n’appartient pas à bastien (UID différents d’une machine à l’autre ?)" fichier_bastien
  fin_objectif

  objectif "Samba : le partage [boutique] réservé au groupe boutique, en SMB3, au réseau interne"
  exiger "smbd n’est pas actif (paquet samba)" smb_actif
  exiger "smbd n’est pas activé au démarrage" smb_active
  exiger "pas de partage [boutique] sur /srv/partages/boutique (testparm -s)" partage_boutique
  exiger "valid users du partage ne contient pas @boutique" valide_boutique
  exiger "le partage est en lecture seule (read only = no attendu)" ecriture_boutique
  exiger "server min protocol n’est pas SMB3" smb3_min
  exiger "hosts allow ne limite pas l’accès au réseau ${LAN_RESEAU}.0/24" hosts_allow
  exiger "malik n’a pas de compte Samba (smbpasswd -a malik)" compte_samba
  fin_objectif

  objectif "Sauvegarde nocturne des recettes vers douane, par rsync et timer"
  exiger "sauvegarde-recettes.timer n’est pas activé" unite_activee sauvegarde-recettes.timer
  exiger "sauvegarde-recettes.timer n’est pas démarré" unite_active sauvegarde-recettes.timer
  exiger "le timer ne se déclenche pas chaque jour à 1 h (OnCalendar=*-*-* 01:00:00)" timer_ok
  exiger "sauvegarde-recettes.service doit être de type oneshot" propriete_est sauvegarde-recettes.service Type oneshot
  exiger "la sauvegarde n’a jamais tourné (systemctl start sauvegarde-recettes.service)" a_tourne
  exiger "la dernière exécution a échoué (journalctl -u sauvegarde-recettes)" propriete_est sauvegarde-recettes.service Result success
  exiger "la clé ${CLE} n’existe pas" test -f "$CLE"
  exiger "la copie sur douane n’est pas un miroir exact sans les *.tmp : $(ecarts | head -3 | tr '\n' ' ')" sauvegarde_a_jour
  fin_objectif
  ;;
comptoir)
  objectif "NFS : /mnt/commun monté depuis cuve, et au démarrage"
  exiger "/mnt/commun n’est pas un montage NFS" monte_type /mnt/commun 'nfs|nfs4'
  exiger "/mnt/commun ne vient pas de cuve:/srv/partages/commun" monte_depuis /mnt/commun ':/srv/partages/commun/?$'
  exiger "pas de ligne fstab pour /mnt/commun avec _netdev et nofail" fstab_options /mnt/commun _netdev nofail
  fin_objectif

  objectif "Samba : /mnt/boutique monté depuis //cuve/boutique, sans mot de passe en clair, et Malik y écrit"
  exiger "/mnt/boutique n’est pas un montage CIFS" monte_type /mnt/boutique 'cifs|smb3'
  exiger "/mnt/boutique ne vient pas du partage boutique de cuve" monte_depuis /mnt/boutique '/boutique/?$'
  exiger "pas de ligne fstab pour /mnt/boutique avec _netdev et nofail" fstab_options /mnt/boutique _netdev nofail
  exiger "fstab doit utiliser credentials= vers un fichier de root en 600 (pas de mot de passe en clair)" credentials_600
  refuser "un mot de passe apparaît en clair dans /etc/fstab" grep -Eq '(^|,)pass(word)?=' /etc/fstab
  exiger "malik ne peut pas créer de fichier dans /mnt/boutique (uid=, gid= au montage ?)" malik_ecrit
  fin_objectif

  objectif "SSHFS : Bastien consulte les archives de cuve dans ~/archives-cuve"
  exiger "~bastien/archives-cuve n’est pas un montage sshfs actif (sshfs cuve:/srv/archives ~/archives-cuve)" sshfs_bastien
  fin_objectif
  ;;
douane)
  objectif "Le compte sauvegarde reçoit les copies de cuve, avec une clé restreinte"
  exiger "le compte sauvegarde n’existe pas, ou a un mot de passe utilisable (il n’en a pas besoin)" sauvegarde_compte
  exiger "la clé de cuve n’est pas restreinte dans ~sauvegarde/.ssh/authorized_keys (restrict, command=…)" cle_restreinte
  exiger "aucune recette dans /srv/sauvegardes/cuve" contenu_sauvegarde
  exiger "des brouillons *.tmp ont été sauvegardés" sans_tmp
  fin_objectif
  ;;
esac

bilan 10
