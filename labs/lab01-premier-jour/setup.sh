#!/usr/bin/env bash
# Lab 01 : prépare la situation de départ (le « bazar » du partage de fichiers).
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -euo pipefail
ICI="$(dirname "$(readlink -f "$0")")"

"$ICI/reset.sh" --silencieux

info "création des groupes et des comptes de la brasserie"
for g in brasseurs compta boutique personnel; do groupadd "$g"; done
creer_compte() { # nom, groupe d'équipe, description
  useradd -m -s /bin/bash -G "personnel,$2" -c "$3" "$1"
}
creer_compte bastien brasseurs "Bastien Roux, maître brasseur"
creer_compte chloe   compta    "Chloé Martin, comptable"
creer_compte malik   boutique  "Malik Benali, développeur de la boutique"
creer_compte ines    compta    "Inès Garnier, gérante"

B=/srv/brasserie
V="$B/vrac"
info "mise en place du partage… en vrac"
mkdir -p "$V/archives-2023" "$B/archives"
chmod 755 "$B" "$B/archives"
chmod 777 "$V"   # « comme ça tout le monde peut y mettre ses fichiers » (Bastien)

ecrire() { # chemin, propriétaire, mode, contenu…
  local f="$1" p="$2" m="$3"; shift 3
  printf '%s\n' "$@" > "$f"
  chown "$p:$p" "$f"
  chmod "$m" "$f"
}

# Recettes de Bastien (dont une cachée), en 777 comme d'habitude
ecrire "$V/ipa-noyau.recette"       bastien 777 "IPA du Noyau" "Malts : pale ale 90 %, crystal 10 %" "Houblons : Citra, Mosaic" "Densité initiale : 1,062"
ecrire "$V/stout-du-tunnel.recette" bastien 777 "Stout du Tunnel" "Malts : pale, chocolat, orge torréfiée" "Houblon : East Kent Goldings"
ecrire "$V/blanche-de-lyon.recette" bastien 777 "Blanche de Lyon" "Froment 50 %, coriandre, écorces d’orange"
ecrire "$V/saison-pipe.recette"     bastien 777 "Saison Pipe" "Levure saison, poivre de Sichuan"
ecrire "$V/ambree-kernel.recette"   bastien 777 "Ambrée Kernel" "Malts : pale, munich, caramel"
ecrire "$V/.grand-cru.recette"      bastien 777 "Grand Cru (SECRET)" "Ne jamais diffuser hors de l’équipe de brassage."

# Comptabilité de Chloé (lisible par tous : problème !)
ecrire "$V/bilan-2025.ods"          chloe 644 "[document de démonstration] Bilan 2025"
ecrire "$V/tva-t3-2026.ods"         chloe 644 "[document de démonstration] TVA 3e trimestre 2026"
ecrire "$V/salaires-2026-10.ods"    chloe 644 "[document de démonstration] Salaires octobre 2026 — CONFIDENTIEL"

# Boutique de Malik
ecrire "$V/catalogue.csv"           malik 664 "ref;nom;prix" "IPA-33;IPA du Noyau 33 cl;3,90" "STO-33;Stout du Tunnel 33 cl;4,20"
ecrire "$V/commandes-octobre.csv"   malik 664 "commande;client;montant" "1042;Dupont;46,80" "1043;Nguyen;23,40"

# Documents communs
ecrire "$V/planning-brassage.txt"   ines 666 "Planning de brassage — semaine 46" "Lundi : IPA ; mercredi : Stout ; vendredi : nettoyage des cuves"
ecrire "$V/regles-du-bar.txt"       ines 666 "Règles du bar : on rince les verres, on range les fûts vides."

# Vieux documents de 2023 à archiver
for i in $(seq -w 1 12); do
  ecrire "$V/archives-2023/note-${i}.txt" ines 644 "Note interne n° ${i} (2023)" "Contenu sans intérêt aujourd’hui, mais à conserver dix ans."
done

# Un lien cassé vers un ancien emplacement
ln -s /srv/boutique/commandes/derniere.csv "$V/derniere-commande"

# Le fichier égaré de Chloé, dans un répertoire caché
mkdir -p /var/tmp/.cache-chloe
ecrire /var/tmp/.cache-chloe/bilan-2025-final-VRAIMENT.ods chloe 600 "[document de démonstration] Bilan 2025, version finale validée"
chown chloe:chloe /var/tmp/.cache-chloe
chmod 700 /var/tmp/.cache-chloe

# Le script de sauvegarde… cassé (plus exécutable)
install -m 644 -o root -g root "$ICI/fichiers/sauvegarde-recettes" /usr/local/bin/sauvegarde-recettes

# Le service de la boutique (pour la règle sudo de Malik)
if a_systemd; then
  install -m 644 "$ICI/fichiers/boutique.service" /etc/systemd/system/boutique.service
  systemctl daemon-reload
  systemctl enable --now boutique.service >/dev/null 2>&1
else
  alerte "systemd absent : le service boutique n’est pas installé (la règle sudo reste vérifiable)"
fi

# Le thermostat oublié par Bastien, qui tourne sous son compte
install -d -m 755 /usr/local/lib/hlw
install -m 755 "$ICI/fichiers/thermostat-cuve" /usr/local/lib/hlw/thermostat-cuve
# setpriv remplace directement le processus (pas de parent root qui traîne, contrairement à runuser)
setsid setpriv --reuid=bastien --regid=bastien --init-groups --reset-env \
  /usr/local/lib/hlw/thermostat-cuve </dev/null >/dev/null 2>&1 &
disown || true

info "situation de départ prête : lis le ticket dans le README du lab"
