# Solution du Lab 05

## 1 et 2. Les arrivées

```
$ sudo useradd -m -s /bin/bash -c "Léa Durand, brasseuse" -G brasseurs,personnel lea
$ sudo useradd -m -s /bin/bash -c "Yanis Moreau, stagiaire boutique" -G boutique,personnel -e 2027-06-30 yanis
$ sudo passwd lea            # mot de passe provisoire, à transmettre de vive voix
$ sudo passwd yanis
$ sudo chage -d 0 lea        # « dernier changement = 1ᵉʳ janvier 1970 » → changement exigé
$ sudo chage -d 0 yanis
$ sudo chage -l yanis
Last password change                : password must be changed
Account expires                     : Jun 30, 2027
```

Sur Debian, `adduser` fait la même chose de façon interactive. `passwd -e lea` est équivalent à `chage -d 0 lea`.

**Piège 1** : l’expiration du **compte** (`-e`, champ 8 de shadow) n’est pas l’expiration du **mot de passe**
(`chage -M`, durée de validité). Yanis doit perdre l’accès le 30 juin, quel que soit son mot de passe.

## 3. Malik

```
$ sudo usermod -aG compta malik
$ id malik
uid=1002(malik) gid=1002(malik) groups=1002(malik),1006(boutique),1007(personnel),1005(compta)
```

**Piège 2** : `usermod -G compta malik` sans `-a` lui aurait retiré `boutique` et `personnel`.

## 4. Inès

```
$ sudo usermod -aG systemd-journal ines
```

Le groupe `systemd-journal` (ou `adm` sur Debian) donne la lecture de tout le journal. C’est le **moindre
privilège** : lui donner `sudo`/`wheel` aurait répondu au besoin… en lui donnant tout le reste.

## 5. Le départ de Kevin

```
$ ps -u kevin
    PID TTY          TIME CMD
   3120 ?        00:00:00 synchro-perso
$ sudo pkill -u kevin
$ sudo passwd -l kevin              # « ! » devant l’empreinte dans /etc/shadow
$ sudo usermod -e 1 kevin           # compte expiré (le 2 janvier 1970)
$ sudo mkdir -p /root/archives
$ sudo tar -C /home -czf /root/archives/kevin.tar.gz kevin
$ sudo tar tzf /root/archives/kevin.tar.gz | head
```

**Piège 3** : `passwd -l` ne bloque que le **mot de passe**. Avec une clé SSH dans `~/.ssh/authorized_keys`,
Kevin pourrait encore entrer. Un compte **expiré** est refusé par PAM (`account`), quelle que soit la méthode.
Retirer le shell (`usermod -s /usr/sbin/nologin kevin`) est un complément. Dans 30 jours : `userdel -r kevin`,
puis `find / -nouser` pour ses fichiers restés ailleurs.

## 6. Politique de mots de passe

Debian :

```
$ sudo apt install libpam-pwquality
$ grep pwquality /etc/pam.d/common-password
password  requisite  pam_pwquality.so retry=3
```

Rocky : `pam_pwquality.so` est déjà dans `/etc/pam.d/system-auth` (géré par authselect).

Sur les deux :

```
$ sudo mkdir -p /etc/security/pwquality.conf.d
$ printf 'minlen = 12\ndcredit = -1\n' | sudo tee /etc/security/pwquality.conf.d/50-brasserie.conf
$ su - lea                    # puis passwd : « brasserie » est refusé, « Brasserie-du-Noyau-7 » accepté
```

`dcredit = -1` : un crédit **négatif** impose au moins un chiffre. Un crédit positif ferait l’inverse :
chaque chiffre compterait comme un caractère de plus pour atteindre `minlen`.

## 7. Un journal qui survit aux redémarrages

```
$ systemd-analyze cat-config systemd/journald.conf | grep -v '^#' | grep .
[Journal]
# /etc/systemd/journald.conf.d/50-economie.conf
[Journal]
Storage=volatile
$ sudo rm /etc/systemd/journald.conf.d/50-economie.conf
$ printf '[Journal]\nStorage=persistent\nSystemMaxUse=200M\n' | sudo tee /etc/systemd/journald.conf.d/50-brasserie.conf
$ sudo systemctl restart systemd-journald
$ sudo journalctl --flush           # recopie sur disque ce qui était en mémoire
$ journalctl --disk-usage
```

**Piège 4** : modifier `/etc/systemd/journald.conf` ne sert à rien si une surcharge de `journald.conf.d/` remet
`Storage=volatile` derrière : les surcharges sont lues **après** le fichier principal.

## 8. Rotation sans perte

`/etc/logrotate.d/boutique` :

```
/var/log/boutique/*.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

```
$ sudo logrotate -d /etc/logrotate.d/boutique      # simulation
$ sudo logrotate -f /etc/logrotate.d/boutique      # rotation réelle, pour voir
$ ls -l /var/log/boutique/
$ sudo tail -2 /var/log/boutique/commandes.log     # la boutique continue d’écrire ici
```

**Piège 5** : sans `copytruncate`, logrotate **renomme** `commandes.log` en `commandes.log.1` et crée un fichier
neuf. Mais la boutique garde son descripteur ouvert sur l’ancien inode : elle continue d’écrire dans
`commandes.log.1`, puis dans l’archive compressée… qui finit supprimée. `copytruncate` copie puis vide le fichier
**sur place**. Contrepartie : les quelques lignes écrites entre la copie et la troncature peuvent se perdre.
La vraie solution, côté application, est de rouvrir le journal sur un signal (`postrotate … kill -HUP …`).

## 9. Audit SSH

```
$ sudo journalctl -t sshd -g 'Failed password' -o cat | grep -oE 'from [0-9.]+' | sort | uniq -c | sort -rn
     37 from 198.51.100.7
     12 from 203.0.113.42
      5 from 192.0.2.99
$ sudo mkdir -p /root/audit
$ echo 198.51.100.7 | sudo tee /root/audit/ip-suspecte.txt
```

(Les adresses et les nombres changent à chaque `lab start 05`.) Sur Rocky, les mêmes lignes sont aussi dans
`/var/log/secure`, écrit par rsyslog : `sudo grep 'Failed password' /var/log/secure`.

Pour aller plus loin : bloquer cette adresse (pare-feu, chapitre 9) ou installer `fail2ban`.
