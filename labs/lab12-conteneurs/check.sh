#!/usr/bin/env bash
# Lab 12 : correction automatique (ne modifie rien ; lance seulement quelques mini-conteneurs d'essai).
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root

if [[ ! -f "${ETAT_DIR}/lab12.debut" ]]; then
  alerte "le lab n’a pas été démarré sur cette machine : lance d’abord « lab start 12 »"
  exit 1
fi

IMAGE=localhost/hlw-vitrine:1.0
QUADLET=/etc/containers/systemd/vitrine.container
RAPPORT=/root/lab12-sous-le-capot.txt
MINI=/usr/local/sbin/mini-conteneur
RACINE_MINI=/srv/mini/rootfs
LIMITE_VITRINE=134217728   # 128 Mio
LIMITE_MINI=67108864       # 64 Mio

# --- Outils ----------------------------------------------------------------------
# mem_eff PID : limite mémoire effective d'un processus = plus petite valeur memory.max de son cgroup
# et de ses parents (« max » si aucune limite).
mem_eff() {
  local cg chemin min=max v
  cg="$(sed -n 's/^0:://p' "/proc/$1/cgroup" 2>/dev/null)"
  [[ -n "$cg" ]] || { echo inconnu; return; }
  chemin="/sys/fs/cgroup${cg%/}"
  while [[ -d "$chemin" ]]; do
    if [[ -r "$chemin/memory.max" ]]; then
      v="$(cat "$chemin/memory.max")"
      if [[ "$v" != max ]] && { [[ "$min" == max ]] || (( v < min )); }; then min="$v"; fi
    fi
    [[ "$chemin" == /sys/fs/cgroup ]] && break
    chemin="$(dirname "$chemin")"
  done
  echo "$min"
}
ligne_from() { grep -m1 -iE '^[[:space:]]*FROM[[:space:]]' /srv/vitrine/Containerfile 2>/dev/null | awk '{print $2}'; }
from_qualifie() { [[ "$(ligne_from)" =~ ^[a-z0-9.-]+\.[a-z]+(:[0-9]+)?/[^:@]+(:[A-Za-z0-9._-]+|@sha256:[0-9a-f]+)$ ]]; }
from_fige() { local f; f="$(ligne_from)"; [[ "$f" == *@sha256:* ]] || { [[ "$f" == *:* && "${f##*:}" != latest ]]; }; }
image_existe() { podman image exists "$IMAGE" 2>/dev/null; }
taille_image() { podman image inspect "$IMAGE" --format '{{.Size}}' 2>/dev/null; }
image_recente() {
  local c; c="$(podman image inspect "$IMAGE" --format '{{.Created.Unix}}' 2>/dev/null)"
  [[ -n "$c" ]] && (( c >= $(stat -c %Y "${ETAT_DIR}/lab12.debut") - 5 ))
}
uid_map_lea() { runuser -l lea -c 'podman unshare cat /proc/self/uid_map' </dev/null 2>/dev/null; }
plage_lea() { uid_map_lea | awk 'NR > 1 && $3 >= 65536 { ok = 1 } END { exit !ok }'; }
pid_vitrine() { podman inspect vitrine --format '{{.State.Pid}}' 2>/dev/null; }
image_vitrine() { podman inspect vitrine --format '{{.ImageName}}' 2>/dev/null; }
page() { curl -fsS --max-time 5 http://127.0.0.1:8080/ 2>/dev/null; }
visites() { wc -l < /srv/vitrine/donnees/visites.log 2>/dev/null || echo 0; }
visite_notee() { local a; a="$(visites)"; page >/dev/null; sleep 1; (( $(visites) > a )); }
au_demarrage() { compgen -G '/run/systemd/generator/*.wants/vitrine.service' >/dev/null; }
restart_ok() { local r; r="$(propriete vitrine.service Restart)"; [[ "$r" == on-failure || "$r" == always ]]; }
valeur() { sed -n "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*//p" "$RAPPORT" 2>/dev/null | tail -1 | tr -d ' "'; }
chiffres() { tr -cd '0-9' <<<"$1"; }

# 1 ---------------------------------------------------------------------------
objectif "L’image localhost/hlw-vitrine:1.0 part d’une base précise et légère"
exiger "FROM doit donner le registre complet (ex. docker.io/library/…) : « $(ligne_from) »" from_qualifie
exiger "FROM doit figer une version (pas de :latest, pas d’étiquette absente) : « $(ligne_from) »" from_fige
exiger "l’image $IMAGE n’existe pas (podman build -t …)" image_existe
exiger "l’image $IMAGE n’a pas été reconstruite depuis le début du lab" image_recente
T="$(taille_image)"
exiger "l’image pèse $(( ${T:-0} / 1000000 )) Mo : il faut moins de 200 Mo (une base « alpine » ou « slim »)" \
  test "${T:-999999999999}" -lt 200000000
fin_objectif

# 2 ---------------------------------------------------------------------------
objectif "Léa peut utiliser Podman sans être root (plages subordonnées)"
exiger "Léa n’a pas de plage dans /etc/subuid" grep -qE "^(lea|$(id -u lea)):" /etc/subuid
exiger "Léa n’a pas de plage dans /etc/subgid" grep -qE "^(lea|$(id -u lea)):" /etc/subgid
exiger "« podman unshare cat /proc/self/uid_map » de Léa ne montre pas de plage de 65536 identifiants (podman system migrate ?)" plage_lea
fin_objectif

# 3 ---------------------------------------------------------------------------
objectif "La vitrine tourne sous systemd grâce à Quadlet (vitrine.service)"
exiger "$QUADLET est absent" test -f "$QUADLET"
exiger "vitrine.service n’existe pas : systemctl daemon-reload ? (/usr/libexec/podman/quadlet -dryrun pour les erreurs)" \
  bash -c "systemctl cat vitrine.service >/dev/null 2>&1"
exiger "vitrine.service n’est pas actif (systemctl status vitrine ; journalctl -u vitrine)" unite_active vitrine.service
exiger "aucun conteneur nommé « vitrine » ne tourne (ContainerName=)" test -n "$(pid_vitrine)"
exiger "le conteneur vitrine doit utiliser l’image $IMAGE (actuelle : $(image_vitrine))" test "$(image_vitrine)" == "$IMAGE"
fin_objectif

# 4 ---------------------------------------------------------------------------
objectif "La vitrine répond sur le port 8080 et note les visites dans /srv/vitrine/donnees"
exiger "http://127.0.0.1:8080/ ne renvoie pas la page de la brasserie (PublishPort= ? volume ?)" \
  bash -c "curl -fsS --max-time 5 http://127.0.0.1:8080/ | grep -q 'Brasserie du Noyau'"
exiger "aucune visite notée dans /srv/vitrine/donnees/visites.log (volume monté en écriture ? :Z sous SELinux ?)" visite_notee
fin_objectif

# 5 ---------------------------------------------------------------------------
P="$(pid_vitrine)"
M="inconnu"; [[ -n "$P" && "$P" != 0 ]] && M="$(mem_eff "$P")"
objectif "Mémoire limitée à 128 Mo, redémarrage en cas d’échec, lancement au démarrage"
exiger "limite mémoire effective du conteneur : $M au lieu de $LIMITE_VITRINE (128 Mio)" test "$M" == "$LIMITE_VITRINE"
exiger "Restart= vaut « $(propriete vitrine.service Restart) » au lieu de on-failure" restart_ok
exiger "vitrine.service n’est pas lancé au démarrage (section [Install] du fichier Quadlet)" au_demarrage
fin_objectif

# 6 ---------------------------------------------------------------------------
objectif "Sous le capot : le rapport $RAPPORT est exact"
exiger "$RAPPORT est absent" test -f "$RAPPORT"
exiger "PID_HOTE = « $(valeur PID_HOTE) » : ce n’est pas le PID, vu de l’hôte, du processus principal de vitrine (s’il a redémarré, refais le rapport)" \
  test -n "$P" -a "$(chiffres "$(valeur PID_HOTE)")" == "$P"
NSP="$(readlink "/proc/${P:-0}/ns/pid" 2>/dev/null)"; NSN="$(readlink "/proc/${P:-0}/ns/net" 2>/dev/null)"
exiger "NS_PID = « $(valeur NS_PID) » : ce n’est pas l’espace de noms PID de ce processus" \
  test -n "$NSP" -a "$(chiffres "$(valeur NS_PID)")" == "$(chiffres "$NSP")"
exiger "NS_NET = « $(valeur NS_NET) » : ce n’est pas l’espace de noms réseau de ce processus" \
  test -n "$NSN" -a "$(chiffres "$(valeur NS_NET)")" == "$(chiffres "$NSN")"
exiger "MEMOIRE_MAX = « $(valeur MEMOIRE_MAX) » : la limite en octets (memory.max) est $M" \
  test "$(chiffres "$(valeur MEMOIRE_MAX)")" == "$M"
fin_objectif

# 7 ---------------------------------------------------------------------------
objectif "Un système de fichiers Alpine extrait d’une image dans $RACINE_MINI"
exiger "$RACINE_MINI/etc/os-release est absent (podman create, podman export)" test -f "$RACINE_MINI/etc/os-release"
exiger "$RACINE_MINI ne contient pas une Alpine" grep -qi alpine "$RACINE_MINI/etc/os-release"
exiger "$RACINE_MINI/bin/sh est absent" test -e "$RACINE_MINI/bin/sh"
fin_objectif

# 8 ---------------------------------------------------------------------------
mini() { timeout 15 "$MINI" "$@" </dev/null 2>/dev/null; }
pid1() { [[ "$(mini /bin/sh -c 'echo $$' | tail -1)" == 1 ]]; }
nom_mini() { local avant; avant="$(hostname)"; [[ "$(mini /bin/hostname | tail -1)" == mini && "$(hostname)" == "$avant" ]]; }
chroot_ok() { mini /bin/cat /etc/os-release | grep -qi alpine; }
seulement_lo() {
  local l; l="$(mini /bin/cat /proc/net/dev | awk -F: 'NR > 2 { gsub(/ /, "", $1); print $1 }' | paste -sd,)"
  [[ "$l" == lo ]]
}
objectif "mini-conteneur isole : PID 1, nom d’hôte « mini », racine Alpine, réseau vide"
exiger "$MINI est absent ou non exécutable" test -x "$MINI"
exiger "la commande lancée doit avoir le PID 1 (espace PID + --fork, /proc remonté ; avec systemd-run : --expand-environment=no, sinon \$\$ devient \$)" pid1
exiger "le nom d’hôte vu dans le mini-conteneur doit être « mini », sans changer celui de l’hôte (espace UTS)" nom_mini
exiger "la racine doit être $RACINE_MINI (cat /etc/os-release doit montrer Alpine)" chroot_ok
exiger "seule l’interface lo doit exister (espace de noms réseau)" seulement_lo
fin_objectif

# 9 ---------------------------------------------------------------------------
memoire_mini() {
  [[ -x "$MINI" ]] || return 1
  "$MINI" /bin/sleep 10 >/dev/null 2>&1 </dev/null &
  local lanceur=$! p cible="" m=""
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
    sleep 0.5
    for p in $(pgrep -x sleep); do
      [[ "$(readlink "/proc/$p/root" 2>/dev/null)" == "$RACINE_MINI" ]] && cible="$p"
    done
    [[ -n "$cible" ]] && break
  done
  [[ -n "$cible" ]] && m="$(mem_eff "$cible")"
  [[ -n "$cible" ]] && kill -KILL "$cible" 2>/dev/null
  kill "$lanceur" 2>/dev/null; wait "$lanceur" 2>/dev/null
  MEM_MINI="${m:-introuvable}"
  [[ "$m" == "$LIMITE_MINI" ]]
}
MEM_MINI=""
objectif "mini-conteneur limite la mémoire à 64 Mo (cgroup)"
if memoire_mini; then :; else
  exiger "limite mémoire effective dans le mini-conteneur : ${MEM_MINI} au lieu de $LIMITE_MINI (64 Mio)" false
fi
fin_objectif

# 10 --------------------------------------------------------------------------
autres_conteneurs() { podman ps -a --format '{{.Names}}' 2>/dev/null | grep -vx vitrine | paste -sd ' '; }
orphelines() { podman images -q --filter dangling=true 2>/dev/null | wc -l; }
objectif "Le ménage est fait : pas d’autre conteneur que vitrine, ni d’image orpheline ou d’essai"
exiger "conteneurs à supprimer : $(autres_conteneurs)" test -z "$(autres_conteneurs)"
exiger "$(orphelines) image(s) <none> orpheline(s) (podman image prune)" test "$(orphelines)" -eq 0
refuser "l’image localhost/essai-malik existe encore" podman image exists localhost/essai-malik:latest
fin_objectif

bilan 12
