#!/usr/bin/env bash
# Crée les modèles cloud-init Debian 13 et Rocky Linux 10 sur l'hôte Proxmox.
#
#   ./creer-modeles.sh            # les deux modèles
#   ./creer-modeles.sh debian     # seulement Debian
#   ./creer-modeles.sh rocky      # seulement Rocky
#
# Idempotent : un modèle déjà présent est conservé (supprime-le avec « qm destroy ID » pour le recréer).

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
charger_config
verifier_proxmox

telecharger() {
  local url="$1" dest="$2"
  if [[ -s "$dest" ]]; then
    info "image déjà présente : $(basename "$dest")"
  else
    info "téléchargement de $(basename "$dest")"
    wget -q --show-progress -O "${dest}.partiel" "$url"
    mv "${dest}.partiel" "$dest"
  fi
}

verifier_somme() {
  local fichier="$1" attendue="$2" algo="$3" obtenue
  [[ -n "$attendue" ]] || mourir "somme de contrôle introuvable pour $(basename "$fichier")"
  obtenue="$("${algo}sum" "$fichier" | awk '{print $1}')"
  if [[ "$obtenue" != "$attendue" ]]; then
    rm -f "$fichier"
    mourir "somme de contrôle incorrecte pour $(basename "$fichier") (fichier supprimé, relance le script)"
  fi
  succes "somme de contrôle ${algo} vérifiée"
}

creer_modele() {
  local id="$1" nom="$2" image="$3"
  if vm_existe "$id"; then
    alerte "la VM ${id} existe déjà : modèle « ${nom} » conservé"
    return
  fi
  info "création du modèle ${nom} (ID ${id})"
  qm create "$id" \
    --name "$nom" \
    --ostype l26 \
    --memory "$MEMOIRE" --cores "$COEURS" --cpu "$TYPE_CPU" \
    --net0 "virtio,bridge=${PONT}" \
    --scsihw virtio-scsi-single \
    --scsi0 "${STOCKAGE}:0,import-from=${image},discard=on,ssd=1" \
    --ide2 "${STOCKAGE}:cloudinit" \
    --boot order=scsi0 \
    --serial0 socket --vga serial0 \
    --agent enabled=1 \
    --tags hlwmodele
  qm disk resize "$id" scsi0 "$TAILLE_DISQUE"
  qm template "$id"
  succes "modèle ${nom} prêt"
}

mkdir -p "$REPERTOIRE_IMAGES"
cible="${1:-tout}"

if [[ "$cible" == "tout" || "$cible" == "debian" ]]; then
  img="${REPERTOIRE_IMAGES}/$(basename "$URL_DEBIAN")"
  telecharger "$URL_DEBIAN" "$img"
  somme="$(wget -qO- "$URL_SOMMES_DEBIAN" | awk -v f="$(basename "$URL_DEBIAN")" '$2 == f {print $1}')"
  verifier_somme "$img" "$somme" sha512
  creer_modele "$ID_MODELE_DEBIAN" "modele-debian13" "$img"
fi

if [[ "$cible" == "tout" || "$cible" == "rocky" ]]; then
  if ! grep -qw avx2 /proc/cpuinfo; then
    alerte "le processeur de cet hôte n'annonce pas AVX2 : Rocky Linux 10 (x86-64-v3) ne pourra pas démarrer."
    alerte "Utilise Rocky Linux 9 : remplace « 10 » par « 9 » dans URL_ROCKY et URL_SOMME_ROCKY de lab.conf."
  fi
  img="${REPERTOIRE_IMAGES}/$(basename "$URL_ROCKY")"
  telecharger "$URL_ROCKY" "$img"
  # Format BSD : « SHA256 (fichier) = somme »
  somme="$(wget -qO- "$URL_SOMME_ROCKY" | awk -F' = ' '/^SHA256/ {print $2}' | head -1)"
  verifier_somme "$img" "$somme" sha256
  creer_modele "$ID_MODELE_ROCKY" "modele-rocky10" "$img"
fi

info "terminé. Étape suivante : ./deployer.sh base"
