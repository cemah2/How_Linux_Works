#!/usr/bin/env bash
# Lab 13 : vendredi soir, la boutique est tombée. Plusieurs pannes enchaînées à retrouver et à corriger,
# puis un rapport d'incident à rédiger.
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
set -euo pipefail
ICI="$(dirname "$(readlink -f "$0")")"
F="$ICI/fichiers"

a_systemd || { alerte "ce lab nécessite systemd"; exit 1; }
"$ICI/reset.sh" --silencieux

installer_paquets python3 curl lsof logrotate e2fsprogs deb=cron rh=cronie
systemctl enable --now "$([[ "$FAMILLE" == debian ]] && echo cron || echo crond)" >/dev/null 2>&1 || true

mkdir -p "$ETAT_DIR"
for compte in boutique stock; do
  if ! id "$compte" >/dev/null 2>&1; then
    useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin "$compte"
    echo "compte $compte" >> "${ETAT_DIR}/lab13.crees"
  fi
done

info "le volume de données de la boutique (/srv/boutique/donnees)"
IMAGE="${ETAT_DIR}/lab13-donnees.img"
truncate -s 64M "$IMAGE"
mkfs.ext4 -q -F -L boutique "$IMAGE"
install -d -m 755 /srv/boutique /srv/boutique/donnees
cat > /etc/systemd/system/srv-boutique-donnees.mount <<EOF
[Unit]
Description=Données de la boutique

[Mount]
What=$IMAGE
Where=/srv/boutique/donnees
Type=ext4
Options=loop,noatime

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now srv-boutique-donnees.mount >/dev/null 2>&1
chown boutique:boutique /srv/boutique/donnees     # racine du système de fichiers monté
install -d -m 755 -o boutique -g boutique /srv/boutique/donnees/journal
install -m 644 -o boutique -g boutique /dev/null /srv/boutique/donnees/commandes.log
printf '2026-11-06 18:02:11 IPA du Noyau x6\n2026-11-06 19:40:57 Stout Kernel x2\n' > /srv/boutique/donnees/commandes.log

info "les applications"
install -d -m 755 /opt/boutique /opt/stock /etc/stock
install -m 755 "$F/boutique.py" /opt/boutique/boutique.py
install -m 755 "$F/stock.py" /opt/stock/stock.py
install -m 600 -o root -g root "$F/stock.conf" /etc/stock/stock.conf

cat > /etc/systemd/system/stock.service <<'EOF'
[Unit]
Description=Service de stock de la brasserie
After=network.target

[Service]
User=stock
Group=stock
ExecStart=/opt/stock/stock.py
Restart=on-failure
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF
cat > /etc/systemd/system/boutique.service <<'EOF'
[Unit]
Description=Boutique en ligne de la brasserie
After=network.target stock.service
RequiresMountsFor=/srv/boutique/donnees

[Service]
User=boutique
Group=boutique
Environment=BOUTIQUE_DONNEES=/srv/boutique/donnees
Environment=STOCK_HOTE=stock.brasserie.lan:9100
Environment=BOUTIQUE_PORT=8090
ExecStart=/opt/boutique/boutique.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
install -d -m 755 /etc/systemd/system/boutique.service.d
cat > /etc/systemd/system/boutique.service.d/debogage-malik.conf <<'EOF'
# Malik, mardi : activé pour comprendre un souci de panier. À RETIRER après.
[Service]
Environment=BOUTIQUE_DEBUG=1
EOF

info "la résolution du nom du service de stock"
cp -p /etc/hosts "${ETAT_DIR}/lab13.hosts"
sed -i '/stock\.brasserie\.lan/d' /etc/hosts
echo '10.255.255.1  stock.brasserie.lan   # Malik : essai du nouveau serveur de stock' >> /etc/hosts

info "le journal (réglage « pour gagner de la place »)"
install -d -m 755 /etc/systemd/journald.conf.d
printf '[Journal]\n# Pour gagner de la place sur /var (Malik)\nStorage=volatile\n' > /etc/systemd/journald.conf.d/50-gain-de-place.conf
systemctl restart systemd-journald

info "trois jours de débogage : le journal de la boutique a presque rempli le volume"
LIBRE=$(df --output=avail -B1 /srv/boutique/donnees | tail -1)
TAILLE=$(( LIBRE - 64 * 1024 ))
head -c "$TAILLE" /dev/zero | tr '\0' '.' > /srv/boutique/donnees/journal/debug.log
chown boutique:boutique /srv/boutique/donnees/journal/debug.log

systemctl daemon-reload
systemctl enable stock.service boutique.service >/dev/null 2>&1
systemctl start stock.service >/dev/null 2>&1 || true
systemctl start boutique.service

info "la tâche de recalcul des tarifs de Malik"
install -m 755 "$F/recalcul-tarifs" /usr/local/bin/recalcul-tarifs
echo '* * * * * root /usr/local/bin/recalcul-tarifs' > /etc/cron.d/recalcul-tarifs
for _ in 1 2; do
  setsid /usr/local/bin/recalcul-tarifs </dev/null >/dev/null 2>&1 &
done
disown -a || true

sleep 3
touch "${ETAT_DIR}/lab13.debut"
info "il est 21 h 47, vendredi. Lis le ticket dans le README du lab."
