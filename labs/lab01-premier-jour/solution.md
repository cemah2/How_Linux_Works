# Solution commentée du Lab 01

> Ne lis ceci qu’après avoir essayé, avec les trois niveaux d’indices. La valeur du lab est dans les
> erreurs que tu rencontres en chemin.

Toutes les commandes sont lancées avec ton compte, préfixées par `sudo` quand il le faut.

## 1. Les répertoires

```
$ sudo mkdir -p /srv/brasserie/partage/{brassage,compta,boutique,commun}
$ cd /srv/brasserie/partage
```

Les accolades sont développées par le shell (comme les jokers) : `mkdir` reçoit quatre chemins.

## 2. Groupes et droits des répertoires

```
$ sudo chgrp brasseurs brassage
$ sudo chgrp compta compta
$ sudo chgrp boutique boutique
$ sudo chgrp personnel commun
$ sudo chmod 2770 brassage compta boutique
$ sudo chmod 3770 commun
$ ls -l
drwxrws--- 2 root brasseurs … brassage
drwxrws--- 2 root boutique  … boutique
drwxrws--T 2 root personnel … commun
drwxrws--- 2 root compta    … compta
```

- `2770` : rwx pour root et pour l’équipe, rien pour les autres, **setgid** (les fichiers créés héritent du groupe).
- `3770` : en plus, le **sticky bit** (le `T` majuscule, car les autres n’ont pas `x`) : chacun ne supprime que ses propres fichiers.

## 3. Les recettes : premier piège, le fichier caché

```
$ ls -a /srv/brasserie/vrac/*.recette     # 5 fichiers seulement…
$ ls -a /srv/brasserie/vrac | grep recette # … mais 6 recettes : .grand-cru.recette est cachée
$ sudo mv /srv/brasserie/vrac/*.recette /srv/brasserie/vrac/.*.recette brassage/
```

## 4. Le reste du vrac : deuxième piège, mv conserve le groupe

```
$ sudo mv /srv/brasserie/vrac/*.ods compta/
$ sudo mv /srv/brasserie/vrac/*.csv boutique/
$ sudo mv /srv/brasserie/vrac/*.txt commun/
$ ls -l brassage
-rwxrwxrwx 1 bastien bastien … ipa-noyau.recette     ← groupe bastien, droits 777 !
```

Le setgid ne concerne que les fichiers **créés** dans le répertoire. Un fichier déplacé garde son groupe
et ses droits. On corrige :

```
$ sudo chgrp -R brasseurs brassage && sudo chmod -R g+rw,o-rwx brassage
$ sudo chgrp -R compta compta       && sudo chmod -R g+rw,o-rwx compta
$ sudo chgrp -R boutique boutique   && sudo chmod -R g+rw,o-rwx boutique
$ sudo chgrp -R personnel commun    && sudo chmod -R g+rw,o-rwx commun
```

`chmod -R` s’applique aussi au répertoire lui-même : ses bits spéciaux sont conservés, et `o-rwx` ne lui retire rien.

## 5. Le bilan égaré

```
$ sudo find / -name 'bilan-2025-final*' 2>/dev/null
/var/tmp/.cache-chloe/bilan-2025-final-VRAIMENT.ods
$ sudo mv /var/tmp/.cache-chloe/bilan-2025-final-VRAIMENT.ods compta/
$ sudo chgrp compta compta/bilan-2025-final-VRAIMENT.ods
$ sudo chmod g+rw,o-rwx compta/bilan-2025-final-VRAIMENT.ods
```

Sans `sudo`, `find` n’entre pas dans `/var/tmp/.cache-chloe` (mode 700) : le fichier reste invisible.

## 6. L’archive : troisième piège, les chemins

```
$ sudo tar -C /srv/brasserie/vrac -czvf /srv/brasserie/archives/vrac-2023.tar.gz archives-2023
$ tar tzvf /srv/brasserie/archives/vrac-2023.tar.gz | head -3
drwxr-xr-x root/root  0 … archives-2023/
-rw-r--r-- ines/ines 81 … archives-2023/note-01.txt
$ sudo rm -r /srv/brasserie/vrac/archives-2023
```

Avec `tar czvf … /srv/brasserie/vrac/archives-2023`, l’archive contiendrait `srv/brasserie/vrac/archives-2023/…` :
elle ne se décompresserait pas « proprement dans un dossier archives-2023 ». `-C` change de répertoire
avant d’archiver ; `cd /srv/brasserie/vrac` avant la commande revient au même.

## 7. Le thermostat

```
$ ps aux | grep thermostat
bastien  2817  0.0  0.1 … /bin/bash /usr/local/lib/hlw/thermostat-cuve
$ kill 2817
bash: kill: (2817) - Operation not permitted     ← le processus appartient à bastien (fiche 2.9)
$ sudo kill 2817
```

Variante : `sudo pkill -x thermostat-cuve` (nom exact du processus). Méfie-toi de `pkill -f` : il cherche le motif
dans **toute** la ligne de commande des processus, y compris celle de ton propre `sudo pkill -f …`, qu’il peut tuer au passage.

## 8. Le lien et la fin du vrac

```
$ sudo ln -s /srv/brasserie/partage/brassage/ipa-noyau.recette /srv/brasserie/recette-du-moment
$ ls -la /srv/brasserie/vrac
lrwxrwxrwx … derniere-commande -> /srv/boutique/commandes/derniere.csv   ← lien cassé
-rw-r--r-- … thermostat.log
$ sudo rm /srv/brasserie/vrac/derniere-commande /srv/brasserie/vrac/thermostat.log
$ sudo rmdir /srv/brasserie/vrac
```

`rmdir` plutôt que `rm -r` : s’il restait un fichier oublié, `rmdir` refuserait, et tu le verrais.

## 9. Le droit sudo de Malik

```
$ command -v systemctl
/usr/bin/systemctl
$ sudo visudo -f /etc/sudoers.d/boutique
```

Contenu :

```
# Ticket #101 : Malik redémarre la boutique, et rien d'autre
malik ALL=(root) /usr/bin/systemctl restart boutique
```

Vérification :

```
$ sudo -l -U malik
User malik may run the following commands on cuve:
    (root) /usr/bin/systemctl restart boutique
```

Malik devra taper son mot de passe (il faudra donc lui en définir un, chapitre 7). On peut ajouter `NOPASSWD:`
devant la commande si le redémarrage doit être automatisé.

## 10. Le script de sauvegarde

```
$ sauvegarde-recettes
bash: /usr/local/bin/sauvegarde-recettes: Permission denied
$ ls -l /usr/local/bin/sauvegarde-recettes
-rw-r--r-- 1 root root … sauvegarde-recettes      ← plus de x
$ sudo chmod 755 /usr/local/bin/sauvegarde-recettes
$ sudo sauvegarde-recettes
Sauvegarde terminée : /srv/brasserie/archives/recettes-2026-11-08.tar.gz
```

`sudo` est nécessaire pour lire `brassage` (réservé aux brasseurs) et écrire dans `archives`.

## Bilan

```
$ lab check 01
 ✔  1. Les quatre répertoires d’équipe existent dans /srv/brasserie/partage
 …
 ✔ 10. Le script de sauvegarde est réparé et a été lancé au moins une fois

Lab 01 validé : 10/10 objectifs. Bravo !
```

Les trois pièges : le **fichier caché** que `*` ne voit pas, **mv qui conserve le groupe**, et les **chemins dans l’archive**.
Un quatrième pour les plus rapides : le `kill` refusé sur le processus d’un autre utilisateur.
