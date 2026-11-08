#!/usr/bin/env bash
# Test de bout en bout du Lab 13 (CI, en root sur une machine jetable avec systemd).
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
export LAB_HOME="$RACINE"
LAB="$RACINE/infra/bin/lab"

"$LAB" start 13
sleep 3
curl -s http://127.0.0.1:8090/sante || true
if "$LAB" check 13; then
  echo "ÉCHEC DU TEST : la correction initiale ne devrait pas être validée" >&2
  exit 1
fi

# --- Solution (identique à labs/lab13-incident/solution.md) --------------------
# Constat
df -h /srv/boutique/donnees
du -sh /srv/boutique/donnees/journal/*
# Cause du remplissage : la surcharge de débogage, puis libérer réellement l'espace
rm /etc/systemd/system/boutique.service.d/debogage-malik.conf
systemctl daemon-reload
rm /srv/boutique/donnees/journal/debug.log
lsof +L1 /srv/boutique/donnees || true
systemctl restart boutique.service
df -h /srv/boutique/donnees
# Service de stock : sa configuration illisible pour son compte
journalctl -u stock.service -n 5 --no-pager || true
chown root:stock /etc/stock/stock.conf
chmod 640 /etc/stock/stock.conf
systemctl reset-failed stock.service
systemctl restart stock.service
# Résolution du nom du stock
getent hosts stock.brasserie.lan || true
sed -i 's/^10\.255\.255\.1[[:space:]]\+stock\.brasserie\.lan.*/127.0.0.1  stock.brasserie.lan/' /etc/hosts
getent hosts stock.brasserie.lan
# Surcharge processeur
rm /etc/cron.d/recalcul-tarifs
pkill -x recalcul-tarifs || true
# Journal persistant
rm /etc/systemd/journald.conf.d/50-gain-de-place.conf
mkdir -p /var/log/journal
systemctl restart systemd-journald
journalctl --flush
# Prévention : rotation des journaux de la boutique
cat > /etc/logrotate.d/boutique <<'ROTATION'
/srv/boutique/donnees/journal/*.log {
    su boutique boutique
    daily
    maxsize 5M
    rotate 7
    compress
    missingok
    notifempty
    copytruncate
}
ROTATION
logrotate -d /etc/logrotate.d/boutique
# Rapport d'incident
cat > /root/rapport-incident.md <<'RAPPORT'
# Rapport d’incident : boutique en ligne indisponible

## Résumé

Vendredi 8 novembre, de 21 h 47 à 23 h 05, la boutique en ligne a refusé les commandes (erreurs 503).
Le volume de données de la boutique était plein, le service de stock ne démarrait plus et son nom
pointait vers une mauvaise adresse ; une tâche planifiée saturait en plus le processeur.

## Chronologie

- 21:47 alerte d’Inès : les clients ne peuvent plus commander.
- 21:52 `curl /sante` : disque en erreur (No space left on device) et stock injoignable.
- 21:58 `df -h` : /srv/boutique/donnees plein à 100 % ; `du` montre journal/debug.log (60 Mo).
- 22:05 cause du remplissage : surcharge debogage-malik.conf (BOUTIQUE_DEBUG=1) ; retirée, daemon-reload.
- 22:09 debug.log supprimé, mais l’espace n’est rendu qu’au redémarrage de la boutique (lsof +L1).
- 22:15 `journalctl -u stock` : Permission denied sur /etc/stock/stock.conf ; corrigé en 640 root:stock.
- 22:24 stock actif, mais toujours injoignable : /etc/hosts envoie stock.brasserie.lan vers 10.255.255.1.
- 22:30 /etc/hosts corrigé (127.0.0.1) ; /sante répond 200, commande de test enregistrée.
- 22:41 charge à 8 : deux puis trois processus recalcul-tarifs ; tâche cron retirée, processus arrêtés.
- 22:50 journald repassé en stockage persistant ; rotation des journaux de la boutique ajoutée.
- 23:05 fin de l’incident annoncée à Inès.

## Causes

- Cause déclenchante : le mode débogage activé mardi par une surcharge systemd a écrit en continu dans
  debug.log jusqu’à remplir le disque du volume de données.
- Le service de stock ne pouvait pas lire sa configuration (stock.conf en 600 root:root après une
  modification des droits), et la résolution de stock.brasserie.lan avait été changée dans /etc/hosts
  pour un essai.
- La tâche recalcul-tarifs, lancée par cron chaque minute sans verrou, ne s’arrêtait pas : surcharge du
  processeur (CPU).
- Causes profondes : des modifications « provisoires » sans suivi ni date de fin, aucune supervision de
  l’espace disque ni du service de stock, pas de rotation des journaux de l’application, et un journal
  système non persistant qui aurait effacé les preuves au premier redémarrage.

## Ce qui a bien marché, ce qui a manqué

- La page /sante a orienté le diagnostic tout de suite.
- Il manquait une alerte sur l’espace disque et une liste des modifications en cours.

## Actions

- Superviser l’espace de /srv/boutique/donnees et /sante, alerte par OnFailure (toi, 15/11).
- Toute modification provisoire passe par un ticket avec date de retrait (Inès, 20/11).
- Corriger recalcul-tarifs (fin réelle, verrou flock) avant de le replanifier (Malik, 22/11).
- Écrire le runbook « boutique indisponible » à partir de ce rapport (toi, 29/11).
RAPPORT
sleep 2
curl -s http://127.0.0.1:8090/sante
# ---------------------------------------------------------------------------

"$LAB" check 13
"$LAB" reset 13
! mountpoint -q /srv/boutique/donnees || { echo "ÉCHEC DU TEST : volume encore monté" >&2; exit 1; }
! grep -q stock.brasserie.lan /etc/hosts || { echo "ÉCHEC DU TEST : /etc/hosts non restauré" >&2; exit 1; }
! pgrep -x recalcul-tarifs >/dev/null || { echo "ÉCHEC DU TEST : recalcul-tarifs tourne encore" >&2; exit 1; }
echo "Test du Lab 13 réussi."
