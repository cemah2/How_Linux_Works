#!/usr/bin/env bash
# Lab 02 : prépare la situation de départ (nouveaux disques, anciennes données, capteurs saturés).
#
# Les disques du lab sont reconnus par leur numéro de série « hlw-lab-N » (ajouter-disques.sh sur
# Proxmox), sinon parmi les disques vierges. Pour un test sur des périphériques loop :
#   LAB02_DISQUES="/dev/loop10 /dev/loop11" lab start 02
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -euo pipefail
ICI="$(dirname "$(readlink -f "$0")")"

"$ICI/reset.sh" --silencieux

installer_paquets lvm2 xfsprogs e2fsprogs

# --- 1. Trouver les deux disques du lab ---------------------------------------
vierge() { # vrai si le disque n'a ni partition, ni signature, ni utilisateur
  local d="$1"
  [[ -b "$d" ]] || return 1
  [[ "$(lsblk -n -o NAME "$d" 2>/dev/null | wc -l)" -eq 1 ]] || return 1
  [[ -z "$(blkid -p -o value -s TYPE "$d" 2>/dev/null)" ]] || return 1
  [[ -z "$(blkid -p -o value -s PTTYPE "$d" 2>/dev/null)" ]] || return 1
  ! findmnt -S "$d" >/dev/null 2>&1
}

disques=()
if [[ -n "${LAB02_DISQUES:-}" ]]; then
  read -r -a disques <<<"$LAB02_DISQUES"
else
  # Disques ajoutés par ajouter-disques.sh (numéro de série hlw-lab-N)
  while read -r ligne; do
    NAME=""; TYPE=""; SERIAL=""
    eval "$ligne"
    [[ "$TYPE" == disk && "$SERIAL" == hlw-lab-* ]] && vierge "$NAME" && disques+=("$NAME")
  done < <(lsblk -dpn -P -o NAME,TYPE,SERIAL)
  # À défaut : disques vierges de 1 à 64 Go
  if (( ${#disques[@]} < 2 )); then
    disques=()
    while read -r nom taille type; do
      [[ "$type" == disk ]] || continue
      (( taille >= 1073741824 && taille <= 68719476736 )) || continue
      vierge "$nom" && disques+=("$nom")
    done < <(lsblk -dpnb -o NAME,SIZE,TYPE)
  fi
fi

if (( ${#disques[@]} < 2 )); then
  alerte "il faut deux disques vierges pour ce lab, et je n'en trouve que ${#disques[@]}."
  cat >&2 <<'FIN'
     Sur l'hôte Proxmox, dans le répertoire infra/proxmox du dépôt :
         ./ajouter-disques.sh cuve        (ou fut)
     puis relance : lab start 02
FIN
  exit 1
fi
disques=("${disques[@]:0:2}")
for d in "${disques[@]}"; do vierge "$d" || { alerte "${d} n'est pas vierge : je ne m'en sers pas"; exit 1; }; done
mkdir -p "$ETAT_DIR"
printf '%s\n' "${disques[@]}" > "${ETAT_DIR}/lab02.disques"
info "disques du lab : ${disques[*]}"

# --- 2. Sauvegarde de /etc/fstab (pour le reset) -------------------------------
cp -a /etc/fstab "${ETAT_DIR}/lab02.fstab"

# --- 3. Les anciennes données de la boutique, à migrer --------------------------
assurer_compte 02 malik "Malik Benali, développeur de la boutique" boutique
A=/srv/boutique-ancien
install -d -m 755 "$A"
install -d -o malik -g boutique -m 2775 "$A"/{www,www/images,commandes,config}
install -d -o malik -g boutique -m 2770 "$A/factures"
cat > "$A/www/index.html" <<'FIN'
<!doctype html><html lang="fr"><meta charset="utf-8"><title>Brasserie du Noyau</title>
<h1>Brasserie du Noyau</h1><p>Bières artisanales brassées à Lyon depuis 2019.</p></html>
FIN
for i in $(seq 1 24); do
  printf 'image factice %02d\n' "$i" > "$A/www/images/biere-$(printf %02d "$i").png"
done
for m in 01 02 03 04 05 06 07 08 09 10; do
  { echo "commande;client;montant"; for j in $(seq 1 40); do echo "2026${m}$(printf %03d "$j");client-$j;$((j * 7 % 90 + 10)),50"; done; } \
    > "$A/commandes/commandes-2026-${m}.csv"
done
for i in $(seq 1 12); do echo "Facture F2026-$(printf %04d "$i") (document de démonstration)" > "$A/factures/F2026-$(printf %04d "$i").txt"; done
printf 'port=8080\nbase=/srv/boutique/commandes\njeton_paiement=demo-0000-0000\n' > "$A/config/boutique.conf"
echo "ne pas supprimer : marqueur de version" > "$A/.version"
chown -R malik:boutique "$A"/www "$A"/commandes "$A"/factures "$A"/.version
chmod 664 "$A"/www/index.html "$A"/www/images/* "$A"/commandes/*
chmod 660 "$A"/factures/*
chown root:boutique "$A/config/boutique.conf"; chmod 640 "$A/config/boutique.conf"
ln -s commandes/commandes-2026-10.csv "$A/commandes-du-mois.csv"
# Empreinte de référence : chemin, type, propriétaire, groupe, droits, contenu
( cd "$A" && find . -mindepth 1 -printf '%P %y %u %g %m\n' | sort ) > "${ETAT_DIR}/lab02.manifeste"
( cd "$A" && find . -type f -exec sha256sum {} + | sort -k2 ) > "${ETAT_DIR}/lab02.sommes"

# --- 4. Le système de fichiers des capteurs, à court d'inodes --------------------
if a_systemd && { modprobe loop 2>/dev/null || [[ -e /dev/loop-control ]]; }; then
  IMG="${ETAT_DIR}/capteurs.img"
  truncate -s 64M "$IMG"
  mkfs.ext4 -q -F -N 1024 -L capteurs "$IMG"
  cat > /etc/systemd/system/srv-capteurs.mount <<FIN
# Lab 02 : petit système de fichiers des capteurs de cuve (image disque)
[Unit]
Description=Mesures des capteurs de cuve

[Mount]
What=${IMG}
Where=/srv/capteurs
Type=ext4
Options=loop

[Install]
WantedBy=multi-user.target
FIN
  systemctl daemon-reload
  systemctl enable --now srv-capteurs.mount >/dev/null 2>&1
  install -d -m 755 /srv/capteurs/mesures /srv/capteurs/tmp
  for c in cuve-1 cuve-2 cuve-3 cuve-4 fermenteur; do
    { echo "horodatage;temperature"; for h in $(seq 0 23); do printf '2026-11-07T%02d:00;%d,%d\n' "$h" $((18 + h % 3)) $((h % 10)); done; } \
      > "/srv/capteurs/mesures/${c}.csv"
  done
  ( cd /srv/capteurs/mesures && sha256sum ./*.csv ) > "${ETAT_DIR}/lab02.mesures"
  # Le collecteur laissait un fichier temporaire par relevé… jusqu'à épuisement des inodes
  n=0
  while : 2>/dev/null > "/srv/capteurs/tmp/releve-$(printf %05d "$n").tmp"; do n=$((n + 1)); (( n < 5000 )) || break; done
  info "capteurs : ${n} fichiers temporaires, inodes épuisés"
else
  alerte "périphériques loop indisponibles : la partie « capteurs » (objectif 8) est ignorée"
  : > "${ETAT_DIR}/lab02.sans-capteurs"
fi

info "situation de départ prête : lis le ticket dans le README du lab"
