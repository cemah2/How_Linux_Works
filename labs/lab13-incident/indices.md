# Indices du Lab 13

## Niveau 1

Des pistes de **méthode**, pas de réponses.

1. **Qualifier** : que répond la boutique elle-même ? `curl -s http://127.0.0.1:8090/sante`. Une page de
   santé dit souvent quelles dépendances vont mal.
2. **Par couches**, comme le livre : disque (fiche 4.7), services (`systemctl --failed`, chapitre 6),
   journaux (`journalctl -u …`, chapitre 7), processus et ressources (chapitre 8), réseau et noms
   (chapitre 9).
3. **Le serveur rame** : la méthode des 60 premières secondes (fiche A6.1) ; regarde qui consomme, et
   **qui le relance**.
4. **Un disque plein** : qui l’a rempli (`du`), et pourquoi ? Supprimer un fichier ne libère pas toujours
   l’espace (fiche 8.1, `lsof`).
5. **Les réglages provisoires de Malik** : où cherche-t-on les modifications locales d’un service systemd
   (fiche 6.3) ? D’une résolution de nom (fiche 9.8) ? Du journal (fiche 7.1) ? Des tâches planifiées
   (fiche 7.6) ?
6. **Un service qui ne démarre pas** : son journal dit pourquoi, en une ligne.
7. **La prévention** : qu’est-ce qui empêche un journal de grossir sans fin (fiche 7.2) ?

## Niveau 2

1. `/sante` signale deux problèmes : le **disque** (*No space left on device*) et le **stock** (nom ou
   connexion). Il y a donc au moins deux pannes indépendantes, plus la lenteur de Bastien.
2. `df -h /srv/boutique/donnees` → 100 % ; `du -sh /srv/boutique/donnees/journal/*` → `debug.log` énorme.
3. `systemctl cat boutique` montre une **surcharge** `boutique.service.d/debogage-malik.conf` qui active
   `BOUTIQUE_DEBUG=1`. C’est la cause du remplissage : la retirer, puis `daemon-reload`.
4. Après `rm debug.log`, `df` ne bouge pas : la boutique garde le fichier ouvert (`lsof +L1`). Le
   **redémarrage** de la boutique (sans la surcharge) rend l’espace. (Vider le fichier avec `: > debug.log`
   libère aussi l’espace, mais tant que le débogage est actif, il se remplit de nouveau.)
5. `journalctl -u stock` : *Permission denied* sur `/etc/stock/stock.conf`, en `600 root:root`. Le compte
   `stock` doit pouvoir le lire, mais pas tout le monde (il contient un jeton) : `root:stock` en `640`.
6. `getent hosts stock.brasserie.lan` → `10.255.255.1`, une ligne « essai » de Malik dans `/etc/hosts`.
7. `top` ou `pidstat 1` : des `recalcul-tarifs` à 100 % ; `/etc/cron.d/recalcul-tarifs` en relance un chaque
   minute. Retirer la ligne cron **puis** arrêter les processus (dans l’autre ordre, ils reviennent).
8. `systemd-analyze cat-config systemd/journald.conf` : un fichier `journald.conf.d/50-gain-de-place.conf`
   impose `Storage=volatile`.
9. `/etc/logrotate.d/boutique` pour `/srv/boutique/donnees/journal/*.log` : fréquence ou taille maximale,
   `rotate`, `compress`, `copytruncate` (la boutique ne rouvre pas ses fichiers), et `su boutique boutique`.

## Niveau 3

L’ordre qui rétablit le plus vite :

```
curl -s http://127.0.0.1:8090/sante ; systemctl --failed ; df -h /srv/boutique/donnees
journalctl -u boutique -u stock --since today > /root/preuves-incident.txt      # garder les preuves
sudo rm /etc/systemd/system/boutique.service.d/debogage-malik.conf && sudo systemctl daemon-reload
sudo rm /srv/boutique/donnees/journal/debug.log && sudo systemctl restart boutique
sudo chown root:stock /etc/stock/stock.conf && sudo chmod 640 /etc/stock/stock.conf
sudo systemctl reset-failed stock && sudo systemctl restart stock
sudoedit /etc/hosts                       # stock.brasserie.lan → 127.0.0.1
sudo rm /etc/cron.d/recalcul-tarifs && sudo pkill -x recalcul-tarifs
sudo rm /etc/systemd/journald.conf.d/50-gain-de-place.conf && sudo systemctl restart systemd-journald
```

Puis la rotation des journaux et le rapport : voir `solution.md` (`lab solution 13`).
