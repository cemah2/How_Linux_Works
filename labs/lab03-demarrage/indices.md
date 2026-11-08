# Indices du Lab 03

## Niveau 1

1. **Le premier écran** : « You are in emergency mode ». Qu’est-ce qui fait basculer systemd dans ce mode (fiche 6.8) ?
   Le message te propose une commande pour voir le journal : utilise-la.
2. **Se connecter** : le mode secours demande le mot de passe root (celui que tu as défini avant la panne).
3. **Le disque USB de Bastien** : il n’est plus branché. Où déclare-t-on les systèmes de fichiers à monter au démarrage (fiche 4.6) ?
4. **« Un truc de maintenance »** : il y a deux façons de choisir la cible de démarrage. L’une est un paramètre
   du noyau (fiche 5.2), l’autre un réglage de systemd (fiche 6.2). Bastien a utilisé les deux.
5. **brassd** : `systemctl status brassd`. Que dit la ligne « Process: … status=… » ?
6. **Le collecteur** : quel service a fait attendre le démarrage ? `systemd-analyze blame`. Lis son fichier d’unité
   et relis la fiche 6.5 sur les types de services.
7. **Rapport** : pour chaque cause : ce qu’on voyait, ce qui était faux, ce que tu as corrigé.

## Niveau 2

1. Une unité requise par `local-fs.target` a échoué : un montage. `journalctl -xb -p err` ou `systemctl --failed`
   (cherche une unité `.mount`).
2. Si `/` est en lecture seule et que tu ne peux rien modifier : `mount -o remount,rw /`.
3. Une ligne de `/etc/fstab` monte `/srv/cave` depuis un UUID qui n’existe plus (`blkid` ne le connaît pas).
   Supprime-la, commente-la, ou ajoute l’option `nofail` si le disque doit revenir un jour.
4. `cat /proc/cmdline` montre les paramètres reçus par le noyau. D’où vient `systemd.unit=…` ?
   Debian : `grep -r systemd.unit /etc/default/`. Rocky : `grubby --info=ALL`. Et `systemctl get-default`.
5. Code 203/EXEC : systemd n’a pas trouvé le programme. Compare `ExecStart` avec ce qui existe dans `/usr/local/bin`.
6. `Type=oneshot` : systemd attend la **fin** du programme avant de continuer le démarrage. Or le collecteur
   ne se termine jamais : systemd attend jusqu’au délai, puis le tue.
7. Les mots-clés vérifiés : fstab, rescue, brassd, capteurs.

## Niveau 3

1. Au prompt du mode d’urgence, tape le mot de passe root, puis : `journalctl -xb -p err | less` et `systemctl --failed`.
2. `mount -o remount,rw /` (souvent inutile, mais sans danger).
3. `vi /etc/fstab` : commente la ligne `UUID=… /srv/cave …` (mets un `#` devant), puis `systemctl daemon-reload`.
4. Debian : `rm /etc/default/grub.d/99-maintenance.cfg && update-grub`.
   Rocky : `grubby --update-kernel=ALL --remove-args="systemd.unit=rescue.target"`.
   Les deux : `systemctl set-default multi-user.target`.
5. `systemctl edit --full brassd` (ou `vi /etc/systemd/system/brassd.service`) : `ExecStart=/usr/local/bin/brassd`.
6. Dans `/etc/systemd/system/collecte-capteurs.service` : `Type=simple`, et supprime `TimeoutStartSec=100`.
   Puis `systemctl daemon-reload`, `systemctl reboot`, et une fois revenu (par SSH) : `lab check 03`.
7. Écris `/root/incident-03.md` (exemple dans la solution).
