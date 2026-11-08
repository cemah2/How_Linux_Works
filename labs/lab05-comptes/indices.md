# Indices du Lab 05

## Niveau 1

1. **Léa** : `useradd` a des options pour le répertoire, le shell et les groupes secondaires (fiche 7.4). Et pour
   forcer le changement de mot de passe, regarde du côté de `chage` (troisième champ de `/etc/shadow`).
2. **Yanis** : une date d’expiration du **compte** (pas du mot de passe). `man chage` ou `man useradd`.
3. **Malik** : relis l’avertissement de la fiche 7.4 sur `usermod -G`.
4. **Inès** : quels groupes donnent accès à tout le journal (fiche 7.1) ?
5. **Kevin** : verrouiller le mot de passe suffit-il, s’il a une clé SSH ? Et comment trouver ses processus ?
6. **Mots de passe** : quel module PAM vérifie la qualité des mots de passe, et où se règle-t-il (fiche 7.9) ?
7. **Journal** : où est réglé le stockage du journal ? Pense aux répertoires `.d` (fiche 7.2).
8. **Rotation** : renommer un fichier qu’un programme garde ouvert… où écrit-il ensuite (fiche 4.12, inodes) ?
9. **Audit** : `journalctl` sait filtrer par motif. Puis il faut compter par adresse (fiche 2.4, `sort | uniq -c`).

## Niveau 2

1. `useradd -m -s /bin/bash -G brasseurs,personnel lea`, puis `passwd lea`, puis `chage -d 0 lea`.
2. `useradd … -e 2027-06-30 yanis` (ou après coup : `chage -E 2027-06-30 yanis`). Vérifie avec `chage -l yanis`.
3. `usermod -aG compta malik` : le `-a` est vital.
4. `usermod -aG systemd-journal ines`. Surtout pas le groupe `sudo`/`wheel`.
5. `passwd -l` bloque le mot de passe, pas les clés : ajoute `usermod -e 1 kevin` (compte expiré depuis 1970)
   ou `usermod -s /usr/sbin/nologin kevin`. Ses processus : `ps -u kevin`, puis `pkill -u kevin`.
   Archive : `tar -C /home -czf /root/archives/kevin.tar.gz kevin`.
6. Debian : installe `libpam-pwquality` (il s’ajoute tout seul à `/etc/pam.d/common-password`). Rocky : déjà en place.
   Réglages : `minlen` et `dcredit` dans `/etc/security/pwquality.conf` (ou un fichier de `pwquality.conf.d/`).
7. `systemd-analyze cat-config systemd/journald.conf` montre la configuration complète, surcharges comprises.
   Il faut `Storage=persistent` et `SystemMaxUse=200M`, puis redémarrer `systemd-journald`.
8. Avec `copytruncate`, logrotate copie le fichier puis le vide **sur place** : la boutique continue d’écrire
   dans le même inode. Teste avec `logrotate -d`.
9. `journalctl -t sshd -g 'Failed password'`, extrais les adresses avec `grep -oE 'from [0-9.]+'`, puis compte.

## Niveau 3

1. ```
   sudo useradd -m -s /bin/bash -c "Léa Durand" -G brasseurs,personnel lea
   sudo passwd lea
   sudo chage -d 0 lea
   ```
2. ```
   sudo useradd -m -s /bin/bash -c "Yanis Moreau" -G boutique,personnel -e 2027-06-30 yanis
   sudo passwd yanis && sudo chage -d 0 yanis
   ```
3. `sudo usermod -aG compta malik && id malik`
4. `sudo usermod -aG systemd-journal ines`
5. ```
   ps -u kevin ; sudo pkill -u kevin
   sudo passwd -l kevin ; sudo usermod -e 1 kevin
   sudo mkdir -p /root/archives
   sudo tar -C /home -czf /root/archives/kevin.tar.gz kevin
   ```
6. Debian : `sudo apt install libpam-pwquality`. Puis, sur les deux :
   ```
   sudo mkdir -p /etc/security/pwquality.conf.d
   printf 'minlen = 12\ndcredit = -1\n' | sudo tee /etc/security/pwquality.conf.d/50-brasserie.conf
   ```
7. ```
   sudo rm /etc/systemd/journald.conf.d/50-economie.conf
   printf '[Journal]\nStorage=persistent\nSystemMaxUse=200M\n' | sudo tee /etc/systemd/journald.conf.d/50-brasserie.conf
   sudo systemctl restart systemd-journald
   ```
8. Le fichier complet est dans la solution (`weekly`, `rotate 8`, `compress`, `missingok`, `notifempty`, `copytruncate`).
9. ```
   sudo journalctl -t sshd -g 'Failed password' -o cat | grep -oE 'from [0-9.]+' | sort | uniq -c | sort -rn
   sudo mkdir -p /root/audit ; echo ADRESSE | sudo tee /root/audit/ip-suspecte.txt
   ```
