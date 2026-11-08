# Solution du Lab 13

Cinq pannes s’enchaînaient, plus deux défauts qui auraient aggravé le prochain incident. L’ordre ci-dessous
est celui d’un diagnostic **par couches**, en commençant par ce que dit l’application elle-même.

## 0. Qualifier et garder les preuves

```
$ curl -s http://127.0.0.1:8090/sante
{"disque": "erreur : No space left on device", "stock": "erreur : timed out"}
$ systemctl --failed
  stock.service   loaded failed failed Service de stock de la brasserie
$ uptime
 21:52:10 up 3 days,  load average: 2.98, 2.71, 1.95
$ journalctl -u boutique -u stock --since today > /root/preuves-incident.txt
$ df -h /srv/boutique/donnees > /root/preuves-df.txt ; ps aux --sort=-%cpu | head > /root/preuves-ps.txt
```

Deux dépendances en erreur (disque, stock), un service en échec, une charge élevée : au moins trois pistes.
Les preuves sont gardées **avant** de toucher à quoi que ce soit, d’autant que le journal est en mémoire
(voir 6).

## 1. Le volume plein et sa cause

```
$ df -h /srv/boutique/donnees
Filesystem  Size  Used Avail Use% Mounted on
/dev/loop0   58M   55M     0 100% /srv/boutique/donnees
$ sudo du -sh /srv/boutique/donnees/journal/*
55M	/srv/boutique/donnees/journal/debug.log
$ systemctl cat boutique
# /etc/systemd/system/boutique.service
…
# /etc/systemd/system/boutique.service.d/debogage-malik.conf
# Malik, mardi : activé pour comprendre un souci de panier. À RETIRER après.
[Service]
Environment=BOUTIQUE_DEBUG=1
```

La surcharge de Malik a mis la boutique en mode débogage : elle écrit son état interne en continu.
On retire d’abord la **cause**, puis on libère l’espace :

```
$ sudo rm /etc/systemd/system/boutique.service.d/debogage-malik.conf
$ sudo systemctl daemon-reload
$ sudo rm /srv/boutique/donnees/journal/debug.log
$ df -h /srv/boutique/donnees                     # toujours 100 % !
$ sudo lsof +L1 /srv/boutique/donnees
COMMAND    PID     USER  FD  TYPE SIZE/OFF NLINK NAME
boutique.p 2210 boutique  3w  REG   57.1M     0 /srv/boutique/donnees/journal/debug.log (deleted)
$ sudo systemctl restart boutique
$ df -h /srv/boutique/donnees                     # 2 %
```

**Piège** (fiche 8.1) : un fichier supprimé mais encore ouvert garde ses blocs. Seule la fermeture (ici le
redémarrage, qui relit aussi la configuration sans débogage) rend l’espace. Les commandes
(`commandes.log`) n’ont jamais été touchées.

## 2. Le service de stock

```
$ journalctl -u stock -n 3
stock : impossible de lire /etc/stock/stock.conf : [Errno 13] Permission denied: '/etc/stock/stock.conf'
$ ls -l /etc/stock/stock.conf
-rw------- 1 root root 151 … /etc/stock/stock.conf
```

Le service tourne sous le compte `stock`, qui ne peut pas lire sa configuration. Elle contient un jeton :
pas question de la passer en 644. Le groupe `stock` en lecture suffit :

```
$ sudo chown root:stock /etc/stock/stock.conf
$ sudo chmod 640 /etc/stock/stock.conf
$ sudo systemctl reset-failed stock          # après trop d'échecs, systemd ne relance plus
$ sudo systemctl restart stock
$ systemctl is-active stock ; systemctl is-enabled stock
```

## 3. Le nom du stock

`/sante` dit encore *timed out* pour le stock, alors qu’il écoute bien :

```
$ ss -ltnp | grep 9100
LISTEN 0 5 127.0.0.1:9100 … users:(("stock.py",…))
$ getent hosts stock.brasserie.lan
10.255.255.1    stock.brasserie.lan
$ grep stock /etc/hosts
10.255.255.1  stock.brasserie.lan   # Malik : essai du nouveau serveur de stock
```

L’ordre de résolution (`/etc/nsswitch.conf`, fiche 9.8) consulte `/etc/hosts` en premier. On remet la
bonne adresse :

```
$ sudoedit /etc/hosts                       # 127.0.0.1  stock.brasserie.lan
$ getent hosts stock.brasserie.lan
127.0.0.1       stock.brasserie.lan
$ curl -s http://127.0.0.1:8090/sante
{"disque": "ok", "stock": "ok"}
$ curl -s 'http://127.0.0.1:8090/commande?biere=Noel&qte=1'
```

La boutique est rétablie. Préviens Inès **maintenant**, avant de finir le reste.

## 4. La lenteur

```
$ pidstat 1 3          # ou top
  UID   PID   %CPU  Command
    0  1840  99.00  recalcul-tarifs
    0  1841  99.00  recalcul-tarifs
    0  3102  99.00  recalcul-tarifs
$ cat /etc/cron.d/recalcul-tarifs
* * * * * root /usr/local/bin/recalcul-tarifs
```

Une instance nouvelle chaque minute, chacune pour 50 minutes : la charge monte sans fin. On coupe d’abord la
**source**, puis on arrête les processus (dans l’autre ordre, cron en relance un dans la minute) :

```
$ sudo rm /etc/cron.d/recalcul-tarifs         # (ou commenter la ligne)
$ sudo pkill -x recalcul-tarifs
```

La correction du script (une vraie fin, un verrou `flock -n` pour éviter deux instances, éventuellement
`CPUQuota=` dans un service) revient à Malik : c’est une **action** du rapport.

## 5. Le journal en mémoire

```
$ systemd-analyze cat-config systemd/journald.conf | grep -B2 Storage
# /etc/systemd/journald.conf.d/50-gain-de-place.conf
[Journal]
Storage=volatile
$ sudo rm /etc/systemd/journald.conf.d/50-gain-de-place.conf
$ sudo mkdir -p /var/log/journal
$ sudo systemctl restart systemd-journald && sudo journalctl --flush
```

Avec `Storage=volatile`, le journal vit dans `/run` : un redémarrage au milieu de l’incident aurait effacé
toutes les preuves. Pour limiter la place, on règle plutôt `SystemMaxUse=` (fiche 7.2).

## 6. La prévention : rotation des journaux de la boutique

`/etc/logrotate.d/boutique` :

```
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
```

```
$ sudo logrotate -d /etc/logrotate.d/boutique      # simulation : pas d'erreur
```

- `maxsize 5M` fait tourner le fichier dès 5 Mo, même avant le lendemain ;
- `copytruncate` : la boutique garde son fichier ouvert et ne sait pas le rouvrir ;
- `su boutique boutique` : le répertoire appartient à `boutique`, logrotate travaille sous ce compte.

## 7. Le rapport d’incident

Exemple de `/root/rapport-incident.md` :

```markdown
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
```

Remarque les deux niveaux de causes : la cause **déclenchante** (le mode débogage) et les causes
**profondes** (pas de suivi des modifications provisoires, pas de supervision du disque, pas de rotation,
journal non persistant). Ce sont les secondes que les actions corrigent.
