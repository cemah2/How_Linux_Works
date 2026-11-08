# Indices du Lab 04

## Niveau 1

1. **Compte vitrine** : `useradd` a une option pour créer un compte **système** (fiche 7.4). Quel shell empêche toute connexion (fiche 7.3) ?
2. **Instance de Malik** : quel processus écoute sur le port 8080 ? `ss -ltnp` ou `sudo lsof -i :8080` (fiche 8.1).
3. **vitrine.service** : écris-le dans `/etc/systemd/system/` sur le modèle de la fiche 6.3. Section `[Install]` pour le démarrage automatique.
4. **Configuration** : trois directives de la section `[Service]` répondent aux trois exigences (compte, fichier d’environnement, redémarrage).
5. **Le service démarre puis s’arrête ?** Lis `journalctl -u vitrine` : la vitrine dit pourquoi elle refuse.
6. **Inventaire** : comment modifier une unité sans toucher à son fichier (fiche 6.3) ? Une modification de `Nice=` s’applique-t-elle à un processus déjà lancé ?
7. **Timer** : un timer, c’est deux unités (fiche 7.7).
8. **Test** : un timer ne se déclenche qu’à l’heure prévue. Comment lancer le service tout de suite ?
9. **Cron** : où est la ligne de Bastien ? `grep -r export-ventes /etc/cron*`.

## Niveau 2

1. `useradd --system --home-dir /opt/vitrine --no-create-home --shell /usr/sbin/nologin vitrine`
   (`/opt/vitrine` existe déjà).
2. Le processus appartient à malik : `sudo kill PID`. Sinon, ton service ne pourra pas écouter sur 8080
   (« Address already in use » dans le journal).
3. `[Unit]` (Description, After=network.target), `[Service]` (ExecStart=/opt/vitrine/bin/vitrine), `[Install]`
   (WantedBy=multi-user.target). Puis `daemon-reload` et `enable --now`.
4. `User=vitrine`, `EnvironmentFile=/etc/vitrine/vitrine.env`, `Restart=on-failure`.
5. Sans `User=`, la vitrine refuse de tourner en root. Sans `EnvironmentFile=`, elle ne connaît pas son port.
6. `sudo systemctl edit inventaire` crée `/etc/systemd/system/inventaire.service.d/override.conf`. Mets-y une
   section `[Service]` avec `Nice=10` et `MemoryMax=200M`. Puis `systemctl restart inventaire`.
7. `export-ventes.service` (Type=oneshot, ExecStart=…) et `export-ventes.timer` (`[Timer]` OnCalendar=…,
   Persistent=true ; `[Install]` WantedBy=timers.target). On active le **timer**.
8. `sudo systemctl start export-ventes.service`, puis `journalctl -u export-ventes` et `ls /srv/ventes/exports`.
9. La ligne est dans `/etc/cron.d/export-ventes` : supprime le fichier (ou commente la ligne).

## Niveau 3

1. ```
   sudo useradd --system --home-dir /opt/vitrine --no-create-home --shell /usr/sbin/nologin vitrine
   getent passwd vitrine
   ```
2. ```
   ss -ltnp 'sport = :8080'        # repère le PID (users:(("python3",pid=…)))
   sudo kill PID
   ```
3. et 4. `sudo vi /etc/systemd/system/vitrine.service` :
   ```
   [Unit]
   Description=Vitrine de la boutique en ligne
   After=network.target

   [Service]
   User=vitrine
   EnvironmentFile=/etc/vitrine/vitrine.env
   ExecStart=/opt/vitrine/bin/vitrine
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```
   puis `sudo systemctl daemon-reload && sudo systemctl enable --now vitrine`.
5. `curl http://127.0.0.1:8080/` et `ss -ltnp 'sport = :8080'`.
6. `sudo systemctl edit inventaire` → `[Service]`, `Nice=10`, `MemoryMax=200M` ; puis `sudo systemctl restart inventaire`
   et `systemctl show -p Nice,MemoryMax inventaire`.
7. Les deux fichiers sont dans la solution ; `OnCalendar=Mon..Fri 02:30` ; puis
   `sudo systemctl daemon-reload && sudo systemctl enable --now export-ventes.timer && systemctl list-timers`.
8. `sudo systemctl start export-ventes.service && journalctl -u export-ventes -n 5`.
9. `sudo rm /etc/cron.d/export-ventes`.
