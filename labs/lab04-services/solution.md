# Solution du Lab 04

## 1. Le compte système

```
$ sudo useradd --system --home-dir /opt/vitrine --no-create-home --shell /usr/sbin/nologin vitrine
$ getent passwd vitrine
vitrine:x:996:996::/opt/vitrine:/usr/sbin/nologin
```

`--system` choisit un UID dans la plage des comptes système (sous 1000) et ne crée pas de boîte aux lettres ni
de vieillissement de mot de passe. Le compte n’a pas de mot de passe et son shell refuse toute connexion :
il ne sert qu’à faire tourner le service avec le **moindre privilège** (fiche 2.15).

## 2. L’instance de Malik

```
$ ss -ltnp 'sport = :8080'
State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process
LISTEN 0      5          127.0.0.1:8080       0.0.0.0:*     users:(("python3",pid=2741,fd=3))
$ ps -o user,pid,cmd -p 2741
USER       PID CMD
malik     2741 python3 -m http.server 8080 --bind 127.0.0.1 --directory /opt/vitrine/www
$ sudo kill 2741
```

**Piège 1** : tant que cette instance tient le port, le service démarre et meurt aussitôt :
`journalctl -u vitrine` montre `OSError: [Errno 98] Address already in use`.

## 3 à 5. Le service vitrine

```
$ sudo vi /etc/systemd/system/vitrine.service
```

```
[Unit]
Description=Vitrine de la boutique en ligne
After=network.target

[Service]
Type=simple
User=vitrine
Group=vitrine
EnvironmentFile=/etc/vitrine/vitrine.env
ExecStart=/opt/vitrine/bin/vitrine
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```
$ sudo systemctl daemon-reload
$ sudo systemctl enable --now vitrine
$ systemctl status vitrine
$ curl http://127.0.0.1:8080/
```

**Piège 2** : sans `User=`, le service tourne en root et la vitrine refuse (« refus de tourner en root »).
**Piège 3** : sans `EnvironmentFile=`, la variable `PORT` n’existe pas (« variable PORT absente »).
Mettre `Environment=PORT=8080` dans l’unité marcherait, mais le ticket demande que la configuration reste
dans `/etc/vitrine/vitrine.env`.

Pour vérifier le redémarrage automatique : `sudo kill -9 $(systemctl show -p MainPID --value vitrine)`, puis
`systemctl status vitrine` quelques secondes plus tard : un nouveau PID. (Avec `systemctl stop`, systemd ne
relance pas : un arrêt demandé n’est pas un échec.)

## 6. Surcharger l’inventaire

```
$ sudo systemctl edit inventaire
```

```
[Service]
Nice=10
MemoryMax=200M
```

`systemctl edit` crée `/etc/systemd/system/inventaire.service.d/override.conf` et fait le `daemon-reload`.
Le fichier de l’éditeur (`/usr/lib/systemd/system/`) reste intact : la mise à jour suivante ne perdra rien.

```
$ systemctl show -p Nice,MemoryMax inventaire
Nice=10
MemoryMax=209715200
$ ps -o ni,cmd -p $(systemctl show -p MainPID --value inventaire)
 NI CMD
  0 /bin/bash /usr/local/lib/hlw/inventaire
```

**Piège 4** : la propriété est à jour, mais le processus tourne toujours avec nice 0 : la priorité est fixée au
lancement. `sudo systemctl restart inventaire`, et `NI` passe à 10. (`MemoryMax` s’applique au cgroup, sans
redémarrage ; fiche 8.7.)

## 7 et 8. Le timer

`/etc/systemd/system/export-ventes.service` :

```
[Unit]
Description=Export quotidien des ventes pour la comptabilité

[Service]
Type=oneshot
ExecStart=/usr/local/bin/export-ventes
```

`/etc/systemd/system/export-ventes.timer` :

```
[Unit]
Description=Déclenche l’export des ventes du lundi au vendredi à 2 h 30

[Timer]
OnCalendar=Mon..Fri 02:30
Persistent=true

[Install]
WantedBy=timers.target
```

```
$ systemd-analyze calendar "Mon..Fri 02:30"
  Original form: Mon..Fri 02:30
Normalized form: Mon..Fri *-*-* 02:30:00
    Next elapse: Mon 2026-11-09 02:30:00 CET
$ sudo systemctl daemon-reload
$ sudo systemctl enable --now export-ventes.timer
$ systemctl list-timers export-ventes.timer
$ sudo systemctl start export-ventes.service        # test immédiat
$ journalctl -u export-ventes -n 3
… export-ventes : /srv/ventes/exports/ventes-20261108-213012.csv créé (3 lignes)
```

Le service n’a pas de section `[Install]` : c’est le timer qui le déclenche, on ne l’active pas lui-même.

## 9. Retirer la ligne cron

```
$ sudo rm /etc/cron.d/export-ventes
```

Sans cela, l’export tournerait deux fois par nuit.

## Ce qu’on a gagné par rapport à cron

| Besoin du ticket | cron | timer systemd |
|---|---|---|
| Rattraper une nuit où la machine était éteinte | non (sauf anacron, à la journée) | `Persistent=true` |
| Savoir pourquoi l’export a échoué | un courriel… si le courrier marche | `journalctl -u export-ventes`, `systemctl status` |
| Éviter deux exports simultanés | à gérer soi-même | un service ne tourne qu’une fois à la fois |
| Limiter les ressources | non | `Nice=`, `MemoryMax=`… dans le service |
