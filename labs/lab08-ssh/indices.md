# Indices du Lab 08

## Niveau 1

1. **sshd de cuve** : où dépose-t-on ses réglages sans toucher à `sshd_config` (fiche 10.2) ? Quels mots-clés
   correspondent aux quatre exigences ?
2. **Le groupe** : si `AllowGroups` est actif et que tu n’es pas dans le groupe, que se passe-t-il à ta prochaine
   connexion ?
3. **Écoute interne seulement** : un mot-clé de sshd choisit les adresses d’écoute. Comment te connecteras-tu
   ensuite depuis ton poste ?
4. **fail2ban** : où écrire sa configuration (pas dans `jail.conf`), et en quelles unités sont exprimées les durées ?
5. **Clé de Bastien** : la clé se crée **sur le comptoir**, sous le compte de Bastien. Comment la copier sur cuve si
   les mots de passe sont déjà interdits ?
6. **Port inconnu** : quel outil liste les ports ouverts et les processus (fiche 9.9) ? Et depuis le comptoir, l’outil
   d’inventaire (fiche 10.6) le voit aussi.
7. **Capture** : sur quelle interface de douane passent les questions DNS du comptoir ? Quel filtre ?

## Niveau 2

1. `/etc/ssh/sshd_config.d/50-brasserie.conf` : `PermitRootLogin no`, `PasswordAuthentication no`,
   `MaxAuthTries 3`, `AllowGroups ssh-autorises`. Puis `sshd -t`, `sshd -T | grep -i …`, `systemctl reload ssh`.
2. Crée le groupe et ajoute-y **ton compte** et bastien **avant** de recharger sshd : `groupadd`, `usermod -aG`.
   Une session déjà ouverte n’est pas affectée : garde-la jusqu’à avoir testé une nouvelle connexion.
3. `ListenAddress 192.168.50.10`. Sur ton poste : `ProxyJump douane` dans le bloc `Host cuve` de `~/.ssh/config`.
   Si `ss -tln` montre encore `0.0.0.0:22` après un `reload` : l’adresse d’écoute ne change qu’au **redémarrage**
   du service (les sessions ouvertes survivent).
4. `/etc/fail2ban/jail.d/sshd.local` : `[sshd]`, `enabled`, `backend = systemd`, `maxretry`, `findtime`,
   `bantime`, `ignoreip`. Vérifie avec `fail2ban-client get sshd bantime`.
5. Deux possibilités : copier la clé (`ssh-copy-id`) **avant** de couper les mots de passe ; ou, en tant qu’admin
   sur cuve, coller la clé publique dans `~bastien/.ssh/authorized_keys` (puis droits 700/600 et propriétaire).
   Bastien n’a pas de mot de passe sur cuve : la deuxième méthode est la plus simple.
6. `sudo ss -tlnp` sur cuve, puis `systemctl status PID` pour trouver l’unité. Arrêter ne suffit pas : il y a
   `Restart=always` et l’unité est activée au démarrage.
7. `tcpdump -i eth1 -n -w /root/capture-dns.pcap port 53`, et pendant ce temps, sur le comptoir :
   `getent hosts cuve.brasserie.lan` (ou `dig cuve.brasserie.lan`).

## Niveau 3

1. et 2. Sur cuve :
   ```
   sudo groupadd ssh-autorises
   sudo usermod -aG ssh-autorises admin ; sudo usermod -aG ssh-autorises bastien
   printf 'PermitRootLogin no\nPasswordAuthentication no\nMaxAuthTries 3\nAllowGroups ssh-autorises\n' \
     | sudo tee /etc/ssh/sshd_config.d/50-brasserie.conf
   sudo sshd -t && sudo systemctl reload ssh
   ```
3. Ajoute `ListenAddress 192.168.50.10` au même fichier, `sshd -t`, `systemctl restart ssh`… depuis une session
   ouverte **par douane** (`ssh -J douane admin@192.168.50.10`), sinon tu te coupes toi-même.
4. Sur douane : `sudo apt install fail2ban`, le fichier `sshd.local` de la solution, `sudo systemctl restart fail2ban`.
5. Sur le comptoir : `sudo -iu bastien`, `ssh-keygen -t ed25519`, `cat ~/.ssh/id_ed25519.pub` ; sur cuve, colle cette
   ligne dans `~bastien/.ssh/authorized_keys` (droits !) ; sur le comptoir, `~/.ssh/config` avec `Host cuve`.
6. `sudo systemctl disable --now outil-debug.service` (et `mask`, ou supprime le fichier d’unité).
7. Sur le comptoir : `sudo nmap 192.168.50.0/24 -oN /root/inventaire.txt`.
