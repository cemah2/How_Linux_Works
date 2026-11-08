# Indices du Lab 01

## Niveau 1

1. **Répertoires** : une seule commande peut créer plusieurs répertoires et leurs parents (fiche 2.3).
2. **Droits** : relis la fiche 2.A. Quel bit fait hériter le groupe ? Lequel empêche de supprimer les fichiers des autres ?
3. **Recettes** : combien y a-t-il de recettes dans le vrac ? Compte avec `ls -a`, pas avec `ls`.
4. **Rangement** : après un `mv`, à quel groupe appartient un fichier ? Vérifie avec `ls -l`.
5. **Bilan égaré** : quelle commande cherche un fichier par son nom dans tout le système (fiche 2.4) ?
6. **Archive** : regarde *avec quels chemins* les fichiers sont enregistrés dans ton archive (`tar tzvf`).
7. **Thermostat** : quel est son PID ? Qui en est le propriétaire ? Que répond `kill` si tu n’es pas ce propriétaire (fiche 2.9) ?
8. **Lien** : dans `ln -s`, qu’est-ce qui vient en premier ?
9. **Malik** : relis la fin de la fiche 2.15 (règle limitée à une commande).
10. **Sauvegarde** : lance le script. Lis le message d’erreur en entier.

## Niveau 2

1. `mkdir -p` accepte plusieurs chemins d’un coup ; les accolades du shell aussi : `rep/{a,b}`.
2. Pour les équipes : `chgrp` puis `chmod` en octal. setgid = 2, sticky = 1, à placer **devant** les trois chiffres habituels.
   `commun` a besoin des deux bits.
3. Le joker `*` ne désigne pas les fichiers cachés (fiche 2.5). La sixième recette commence par un point.
4. `mv` conserve le propriétaire, le groupe et les droits d’origine : le setgid du répertoire ne s’applique qu’aux fichiers **créés** dedans.
   Il faut corriger le groupe et les droits des fichiers déplacés (`-R` aide).
5. `find / -name 'bilan*' 2>/dev/null` (avec `sudo` pour voir partout).
6. `tar` enregistre les chemins tels que tu les donnes. Place-toi dans `vrac` avant d’archiver, ou utilise l’option `-C`.
7. Le processus appartient à `bastien` : il te faut `sudo`.
8. Chemin complet de la cible conseillé : `ln -s /srv/brasserie/partage/brassage/ipa-noyau.recette …`.
9. Crée un fichier dans `/etc/sudoers.d/` avec `sudo visudo -f /etc/sudoers.d/boutique`. Le chemin de systemctl : `command -v systemctl`.
10. « Permission denied » sur un script : il manque un bit (fiche 2.9). Il doit être exécutable par tout le monde, mais rester modifiable par root seul.

## Niveau 3

1. `sudo mkdir -p /srv/brasserie/partage/{brassage,compta,boutique,commun}`
2. ```
   cd /srv/brasserie/partage
   sudo chgrp brasseurs brassage ; sudo chgrp compta compta
   sudo chgrp boutique boutique  ; sudo chgrp personnel commun
   sudo chmod 2770 brassage compta boutique
   sudo chmod 3770 commun
   ```
3. `sudo mv /srv/brasserie/vrac/*.recette /srv/brasserie/vrac/.*.recette /srv/brasserie/partage/brassage/`
4. Même principe pour `*.ods`, `*.csv`, `*.txt`, puis pour chaque équipe :
   `sudo chgrp -R brasseurs brassage && sudo chmod -R g+rw,o-rwx brassage` (adapte le groupe).
5. `sudo find / -name 'bilan-2025-final*' 2>/dev/null`, puis `sudo mv` vers `partage/compta/` et `chgrp`/`chmod` comme au point 4.
6. `sudo tar -C /srv/brasserie/vrac -czvf /srv/brasserie/archives/vrac-2023.tar.gz archives-2023`
   puis vérifier (`tar tzvf …`) avant `sudo rm -r /srv/brasserie/vrac/archives-2023`.
7. `pgrep -a thermostat` puis `sudo kill PID` (ou `sudo pkill -x thermostat-cuve`).
   Évite `sudo pkill -f thermostat` : `-f` cherche dans toute la ligne de commande… y compris celle de ton propre `sudo`.
8. `sudo ln -s /srv/brasserie/partage/brassage/ipa-noyau.recette /srv/brasserie/recette-du-moment`,
   puis `sudo rm /srv/brasserie/vrac/derniere-commande /srv/brasserie/vrac/thermostat.log` et `sudo rmdir /srv/brasserie/vrac`.
9. Dans `sudo visudo -f /etc/sudoers.d/boutique`, une seule ligne :
   `malik ALL=(root) /usr/bin/systemctl restart boutique`
   Vérifie : `sudo -l -U malik`.
10. `sudo chmod 755 /usr/local/bin/sauvegarde-recettes` puis `sudo sauvegarde-recettes`.
