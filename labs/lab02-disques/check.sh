#!/usr/bin/env bash
# Lab 02 : correction automatique (ne modifie rien).
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root

VG=vg_donnees
LV_B="/dev/${VG}/lv_boutique"
LV_A="/dev/${VG}/lv_archives"
LV_S="/dev/${VG}/lv_swap"
GIO=1073741824

if [[ ! -f "${ETAT_DIR}/lab02.disques" ]]; then
  alerte "le lab n’a pas été démarré sur cette machine : lance d’abord « lab start 02 »"
  exit 1
fi
mapfile -t DISQUES < "${ETAT_DIR}/lab02.disques"

# Chemin réel d'une source de fstab (UUID=, LABEL=, /dev/…)
resoudre() {
  case "$1" in
    UUID=*|LABEL=*|PARTUUID=*|PARTLABEL=*) findfs "$1" 2>/dev/null ;;
    *) readlink -f "$1" 2>/dev/null ;;
  esac
}
meme_peripherique() { [[ -n "$1" && -n "$2" && "$(readlink -f "$1")" == "$(readlink -f "$2")" ]]; }
taille_lv() { lvs --noheadings --units b --nosuffix -o lv_size "$1" 2>/dev/null | tr -d ' '; }
au_moins() { [[ -n "$1" ]] && (( $1 >= $2 )); }
# Ligne de fstab (non commentée) dont le point de montage est $1
ligne_fstab() { awk -v p="$1" '$1 !~ /^#/ && $2 == p' /etc/fstab; }
source_fstab_correcte() { # point_de_montage volume
  local src
  src="$(ligne_fstab "$1" | awk '{print $1}' | head -1)"
  [[ -n "$src" ]] || return 1
  meme_peripherique "$(resoudre "$src")" "$2"
}
source_stable() { # point de montage : ni /dev/sdX, ni /dev/vdX, ni /dev/dm-N, ni /dev/loopN
  local src
  src="$(ligne_fstab "$1" | awk '{print $1}' | head -1)"
  [[ -n "$src" && ! "$src" =~ ^/dev/(sd|vd|hd|xvd|nvme|dm-|loop) ]]
}
# Erreurs ([E]) signalées par findmnt --verify pour un point de montage donné
erreurs_verify() {
  findmnt --verify 2>&1 | awk -v p="$1" '/^[^ ]/ {cible = $1} cible == p && /\[E\]/'
}
pas_d_erreur_verify() { [[ -z "$(erreurs_verify "$1")" ]]; }
options_montees() { findmnt -n -o OPTIONS "$1" 2>/dev/null; }
a_options() { # point option…
  local o opts; opts=",$(options_montees "$1"),"; shift
  for o in "$@"; do [[ "$opts" == *",$o,"* ]] || return 1; done
}
fstab_a_options() { # point option…
  local o opts; opts=",$(ligne_fstab "$1" | awk '{print $4}' | head -1),"; shift
  for o in "$@"; do [[ "$opts" == *",$o,"* ]] || return 1; done
}
swap_dans_fstab() {
  local src
  while read -r src; do
    meme_peripherique "$(resoudre "$src")" "$LV_S" && return 0
  done < <(awk '$1 !~ /^#/ && $3 == "swap" {print $1}' /etc/fstab)
  return 1
}
# Vrai si le disque $1 (ou une de ses partitions) est un volume physique de $VG
sur_le_disque() {
  local pv vg parent
  while read -r pv vg; do
    [[ "$vg" == "$VG" ]] || continue
    parent="$(lsblk -no PKNAME "$pv" 2>/dev/null | head -1)"
    [[ "$(readlink -f "$pv")" == "$(readlink -f "$1")" || "/dev/${parent}" == "$1" ]] && return 0
  done < <(pvs --noheadings -o pv_name,vg_name 2>/dev/null)
  return 1
}
swap_actif() {
  local s
  while read -r s; do meme_peripherique "$s" "$LV_S" && return 0; done < <(swapon --show=NAME --noheadings 2>/dev/null)
  return 1
}

# 1 ---------------------------------------------------------------------------
objectif "Les deux nouveaux disques sont des volumes physiques du groupe ${VG}"
exiger "le groupe de volumes ${VG} n’existe pas" vgs "$VG"
for d in "${DISQUES[@]}"; do
  exiger "${d} (ou une partition de ${d}) n’est pas un volume physique de ${VG}" sur_le_disque "$d"
done
fin_objectif

# 2 ---------------------------------------------------------------------------
objectif "lv_boutique : ext4, monté sur /srv/boutique, agrandi à 1,5 Gio (volume ET système de fichiers)"
exiger "le volume logique ${LV_B} n’existe pas" lvs "${VG}/lv_boutique"
exiger "${LV_B} doit contenir un système de fichiers ext4" \
  bash -c "[[ \"\$(blkid -o value -s TYPE '${LV_B}' 2>/dev/null)\" == ext4 ]]"
exiger "/srv/boutique doit être le point de montage de ${LV_B}" \
  meme_peripherique "$(findmnt -n -o SOURCE /srv/boutique 2>/dev/null)" "$LV_B"
exiger "le volume lv_boutique doit mesurer au moins 1,5 Gio (lvs)" au_moins "$(taille_lv "${VG}/lv_boutique")" $((GIO * 3 / 2 - 8 * 1048576))
exiger "le système de fichiers de /srv/boutique n’a pas été agrandi (df -h : il faut l’option -r de lvextend, ou resize2fs)" \
  au_moins "$(findmnt -n -b -o SIZE /srv/boutique 2>/dev/null)" $((GIO * 135 / 100))
fin_objectif

# 3 ---------------------------------------------------------------------------
objectif "lv_archives : XFS d’1 Gio, monté sur /srv/archives avec nodev, nosuid et noexec"
exiger "le volume logique ${LV_A} n’existe pas" lvs "${VG}/lv_archives"
exiger "lv_archives doit mesurer environ 1 Gio" au_moins "$(taille_lv "${VG}/lv_archives")" $((GIO - 8 * 1048576))
exiger "${LV_A} doit contenir un système de fichiers XFS" \
  bash -c "[[ \"\$(blkid -o value -s TYPE '${LV_A}' 2>/dev/null)\" == xfs ]]"
exiger "/srv/archives doit être le point de montage de ${LV_A}" \
  meme_peripherique "$(findmnt -n -o SOURCE /srv/archives 2>/dev/null)" "$LV_A"
exiger "/srv/archives n’est pas monté avec les options nodev,nosuid,noexec (findmnt /srv/archives)" a_options /srv/archives nodev nosuid noexec
fin_objectif

# 4 ---------------------------------------------------------------------------
objectif "lv_swap : 256 Mio de mémoire d’échange, active"
exiger "le volume logique ${LV_S} n’existe pas" lvs "${VG}/lv_swap"
exiger "lv_swap doit mesurer 256 Mio" au_moins "$(taille_lv "${VG}/lv_swap")" $((256 * 1048576))
exiger "${LV_S} n’est pas formaté en swap (mkswap)" \
  bash -c "[[ \"\$(blkid -o value -s TYPE '${LV_S}' 2>/dev/null)\" == swap ]]"
exiger "le swap sur lv_swap n’est pas actif (swapon --show)" swap_actif
fin_objectif

# 5 ---------------------------------------------------------------------------
objectif "/etc/fstab : montages persistants, par UUID ou chemin LVM, sans erreur"
exiger "aucune ligne de /etc/fstab ne monte ${LV_B} sur /srv/boutique" source_fstab_correcte /srv/boutique "$LV_B"
exiger "aucune ligne de /etc/fstab ne monte ${LV_A} sur /srv/archives" source_fstab_correcte /srv/archives "$LV_A"
exiger "aucune ligne swap de /etc/fstab ne désigne lv_swap" swap_dans_fstab
exiger "/srv/boutique : n’utilise pas un nom du noyau (/dev/sdX, /dev/dm-N) dans fstab, il peut changer au prochain démarrage" source_stable /srv/boutique
exiger "/srv/archives : n’utilise pas un nom du noyau (/dev/sdX, /dev/dm-N) dans fstab" source_stable /srv/archives
exiger "fstab : les options nodev,nosuid,noexec de /srv/archives doivent y figurer (sinon elles disparaissent au redémarrage)" \
  fstab_a_options /srv/archives nodev nosuid noexec
exiger "findmnt --verify signale une erreur pour /srv/boutique" pas_d_erreur_verify /srv/boutique
exiger "findmnt --verify signale une erreur pour /srv/archives" pas_d_erreur_verify /srv/archives
fin_objectif

# 6 ---------------------------------------------------------------------------
objectif "Les données de la boutique sont migrées à l’identique (contenu, propriétaires, droits, lien)"
manifeste_ok() {
  [[ -d /srv/boutique ]] || return 1
  diff -q "${ETAT_DIR}/lab02.manifeste" \
    <(cd /srv/boutique && find . -mindepth 1 -path ./lost+found -prune -o -printf '%P %y %u %g %m\n' | grep -v '^lost+found ' | sort) >/dev/null
}
sommes_ok() { ( cd /srv/boutique 2>/dev/null && sha256sum --quiet -c "${ETAT_DIR}/lab02.sommes" ) >/dev/null 2>&1; }
exiger "le contenu de /srv/boutique ne correspond pas à l’ancien (fichiers manquants, cachés oubliés, ou propriétaires/droits/liens perdus : cp -a ou rsync -a)" manifeste_ok
exiger "certains fichiers copiés diffèrent de l’original" sommes_ok
exiger "/srv/boutique est vide ou n’est pas monté sur lv_boutique" mountpoint -q /srv/boutique
fin_objectif

# 7 ---------------------------------------------------------------------------
objectif "Les systèmes de fichiers portent les étiquettes « boutique » et « archives »"
exiger "lv_boutique n’a pas l’étiquette boutique (e2label)" \
  bash -c "[[ \"\$(blkid -o value -s LABEL '${LV_B}' 2>/dev/null)\" == boutique ]]"
exiger "lv_archives n’a pas l’étiquette archives (xfs_admin -L)" \
  bash -c "[[ \"\$(blkid -o value -s LABEL '${LV_A}' 2>/dev/null)\" == archives ]]"
fin_objectif

# 8 ---------------------------------------------------------------------------
if [[ ! -f "${ETAT_DIR}/lab02.sans-capteurs" ]]; then
  objectif "/srv/capteurs accepte de nouveau des fichiers, sans perdre les mesures"
  exiger "/srv/capteurs n’est plus monté (systemctl start srv-capteurs.mount)" mountpoint -q /srv/capteurs
  exiger "les inodes de /srv/capteurs sont encore utilisés à plus de 50 % (df -i)" bash -c "v=\$(df --output=ipcent /srv/capteurs | tail -1 | tr -dc 0-9); [[ -n \$v ]] && (( v < 50 ))"
  exiger "des fichiers de mesures (/srv/capteurs/mesures/*.csv) ont disparu ou ont changé" \
    bash -c "cd /srv/capteurs/mesures && sha256sum --quiet -c '${ETAT_DIR}/lab02.mesures'"
  fin_objectif
fi

bilan 02
