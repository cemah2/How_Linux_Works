# Solution du Lab 08

## Repérage : le port inconnu (point 5)

Depuis le comptoir :

```
$ sudo nmap 192.168.50.0/24 -oN /root/inventaire.txt
Nmap scan report for douane.brasserie.lan (192.168.50.1)
PORT   STATE SERVICE
22/tcp open  ssh
53/tcp open  domain
Nmap scan report for cuve.brasserie.lan (192.168.50.10)
PORT      STATE SERVICE
22/tcp    open  ssh
31337/tcp open  Elite
$ curl -s http://cuve:31337/etc/passwd | head -3      # ce que l'auditeur a vu : tout le disque en lecture
```

L’inventaire est fait (point 6). Sur cuve :

```
$ sudo ss -tlnp 'sport = :31337'
LISTEN 0 5 0.0.0.0:31337 0.0.0.0:* users:(("python3",pid=1234,fd=3))
$ systemctl status 1234
● outil-debug.service - Outil de diagnostic DevBrass
$ systemctl cat outil-debug.service      # python3 -m http.server … --directory / , en root, Restart=always
$ sudo systemctl disable --now outil-debug.service
$ sudo systemctl mask outil-debug.service      # ou : sudo rm /etc/systemd/system/outil-debug.service && sudo systemctl daemon-reload
```

**Piège 1** : `kill` ou `systemctl stop` ne suffisent pas. `Restart=always` le relance, et l’unité est activée :
il reviendrait au prochain démarrage.

## Points 1 et 2 : sshd de cuve

**Piège 2 : l’ordre.** Avant d’interdire les mots de passe et de limiter les groupes, on prépare les accès.

1. Le groupe, avec **ton compte** et Bastien :

   ```
   $ sudo groupadd ssh-autorises
   $ sudo usermod -aG ssh-autorises admin
   $ sudo usermod -aG ssh-autorises bastien
   ```

2. La clé de Bastien. Sur le comptoir :

   ```
   $ sudo -iu bastien
   bastien$ ssh-keygen -t ed25519 -C "bastien@comptoir"
   bastien$ cat ~/.ssh/id_ed25519.pub
   ssh-ed25519 AAAAC3Nza… bastien@comptoir
   ```

   Bastien n’a pas de mot de passe sur cuve, donc pas de `ssh-copy-id` possible. Sur cuve, en admin :

   ```
   $ sudo install -d -m 700 -o bastien -g bastien ~bastien/.ssh
   $ echo 'ssh-ed25519 AAAAC3Nza… bastien@comptoir' | sudo tee -a ~bastien/.ssh/authorized_keys
   $ sudo chown bastien:bastien ~bastien/.ssh/authorized_keys ; sudo chmod 600 ~bastien/.ssh/authorized_keys
   ```

   Sur le comptoir, `~bastien/.ssh/config` :

   ```
   Host cuve
       HostName cuve.brasserie.lan
       User bastien
   ```

3. La surcharge `/etc/ssh/sshd_config.d/50-brasserie.conf` sur cuve :

   ```
   PermitRootLogin no
   PasswordAuthentication no
   MaxAuthTries 3
   AllowGroups ssh-autorises
   ListenAddress 192.168.50.10
   ```

4. **Piège 3** : avec `ListenAddress 192.168.50.10`, la connexion par l’adresse externe de cuve est coupée. Prépare
   ton poste d’abord (`~/.ssh/config`) :

   ```
   Host douane
       HostName 192.168.1.213
       User admin
   Host cuve
       HostName 192.168.50.10
       User admin
       ProxyJump douane
   ```

   puis ouvre une session **par douane** (`ssh cuve`), et dans cette session :

   ```
   $ sudo sshd -t                                  # rien = OK
   $ sudo sshd -T | grep -Ei 'permitrootlogin|passwordauthentication|maxauthtries|allowgroups|listenaddress'
   $ sudo systemctl restart ssh
   $ ss -tln 'sport = :22'
   LISTEN 0 128 192.168.50.10:22 0.0.0.0:*
   ```

   Pour les autres réglages, `reload` suffisait ; changer l’**adresse d’écoute** demande un `restart`. Les sessions
   ouvertes n’en souffrent pas : l’unité ssh de Debian a `KillMode=process`, systemd n’arrête que le processus
   principal, pas les sessions en cours.

   Teste depuis un **nouveau** terminal : `ssh cuve` (toi), et sur le comptoir `sudo -iu bastien ssh cuve`.

**Piège 4** : oublier ton propre compte dans `ssh-autorises`. La session ouverte survit, mais toute nouvelle
connexion est refusée (« User admin from … not allowed because none of user’s groups are listed in AllowGroups »).
Rattrapage par la session encore ouverte, ou par la console Proxmox.

## Point 3 : douane

Le même durcissement, sans `AllowGroups` ni `ListenAddress` (douane doit rester joignable de l’extérieur) :

```
$ printf 'PermitRootLogin no\nPasswordAuthentication no\nMaxAuthTries 3\n' | sudo tee /etc/ssh/sshd_config.d/50-brasserie.conf
$ sudo sshd -t && sudo systemctl reload ssh
$ sudo apt install fail2ban
```

`/etc/fail2ban/jail.d/sshd.local` :

```
[sshd]
enabled  = true
backend  = systemd
maxretry = 5
findtime = 10m
bantime  = 1h
ignoreip = 127.0.0.1/8 ::1 192.168.50.0/24
```

```
$ sudo systemctl restart fail2ban
$ sudo fail2ban-client status sshd
$ sudo fail2ban-client get sshd bantime
3600
```

Attention : fail2ban ajoute sa propre table nftables. Un `systemctl restart nftables` (qui commence par
`flush ruleset`) la supprime : redémarre fail2ban ensuite.

## Point 6 : la capture

Sur douane (sans capturer sa propre session SSH, puisque le filtre ne retient que le port 53) :

```
$ sudo tcpdump -i eth1 -n -c 10 -w /root/capture-dns.pcap port 53
```

Pendant ce temps, sur le comptoir : `getent hosts cuve.brasserie.lan`. Puis :

```
$ sudo tcpdump -nr /root/capture-dns.pcap
IP 192.168.50.100.41237 > 192.168.50.1.53: 52107+ A? cuve.brasserie.lan. (36)
IP 192.168.50.1.53 > 192.168.50.100.41237: 52107* 1/0/0 A 192.168.50.10 (52)
```

Si le comptoir a gardé la réponse en cache, interroge un nom qu’il n’a pas encore demandé, ou vide le cache.

## Pour finir

`lab check 08` sur les trois machines. Et relis le résultat de nmap : le port 31337 doit avoir disparu
(`sudo nmap cuve`).
