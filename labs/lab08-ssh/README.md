# Lab 08 : accès distants sécurisés

> **Chapitre** : 10 (sshd, clés, rebond, fail2ban, ss, tcpdump, nmap) · **Durée** : 2 h
> **VM** : `douane`, `cuve` et `comptoir`, avec le réseau du Lab 07 en état de marche · **Prérequis** : fiches 10.1 à 10.7

## Le ticket

> **Ticket #815**, ouvert par Inès Garnier (gérante), priorité haute
>
> L’assureur a fait auditer notre installation. Son rapport est sévère. Il faut corriger :
>
> 1. **cuve** accepte les connexions SSH de root et les mots de passe, avec autant d’essais qu’on veut. Désormais :
>    pas de root, **clés seulement**, **3 essais** au plus, et seuls les membres d’un groupe **`ssh-autorises`**
>    (toi et Bastien) peuvent se connecter. Configure ça proprement, sans toucher au fichier de configuration
>    fourni par la distribution.
> 2. **cuve** ne doit être joignable en SSH que **depuis le réseau interne**. Pour l’administrer de l’extérieur,
>    on passe par **douane**, qui devient notre seule porte d’entrée (un « bastion »).
> 3. **douane** est donc exposée : même durcissement (pas de root, pas de mot de passe), et un **fail2ban** qui bannit
>    pendant **1 heure** toute adresse qui rate **5 connexions en 10 minutes**. Le réseau interne ne doit jamais
>    être banni.
> 4. **Bastien** travaille depuis le **comptoir** : il doit pouvoir se connecter à cuve en tapant simplement
>    `ssh cuve`, avec une **clé ed25519**.
> 5. L’auditeur a trouvé un **port inconnu ouvert** sur cuve, « qui laisse lire n’importe quel fichier ». Trouve ce
>    que c’est et fais-le disparaître pour de bon.
> 6. Il veut deux preuves : un **inventaire nmap** du réseau interne, fait depuis le comptoir, dans
>    `/root/inventaire.txt` ; et une **capture** sur douane, dans `/root/capture-dns.pcap`, qui montre le comptoir
>    demandant l’adresse de `cuve.brasserie.lan`.
>
> Inès

## Démarrer

Le réseau du Lab 07 doit fonctionner (au besoin : `lab check 07` sur les trois machines). Puis, sur **chacune** :

```
$ lab start 08
```

Prends un instantané Proxmox avant (`./instantane.sh creer avant-lab08`) : une erreur dans la configuration de
sshd peut te fermer la porte.

## Ce qui est vérifié

| Machine | Objectifs |
|---|---|
| cuve | sshd durci par une surcharge (root, mots de passe, 3 essais, AllowGroups) ; groupe et clé de Bastien ; écoute seulement sur 192.168.50.10 ; outil oublié supprimé |
| comptoir | `ssh cuve` fonctionne pour Bastien avec une clé ed25519 ; inventaire nmap |
| douane | sshd durci ; fail2ban (5 échecs, 10 min, 1 h, réseau interne ignoré) ; capture DNS |

## Règles du jeu

- **Avant chaque rechargement de sshd** : `sshd -t`, et une session déjà ouverte que tu ne fermes pas. Teste depuis
  une **nouvelle** connexion.
- L’ordre compte : réfléchis à ce qui doit être en place **avant** d’interdire les mots de passe, et **avant** de
  limiter l’écoute de cuve au réseau interne.
- Après le point 2, ta connexion habituelle `ssh cuve` (depuis ton poste) ne marchera plus : prépare ton
  `~/.ssh/config` avec un rebond par douane (fiche 10.3).
- Il y a au moins **quatre pièges**.

## Coincé ?

- `lab hint 08 1`, puis `2`, puis `3` (ou [indices.md](indices.md)).
- La solution commentée : `lab solution 08` ou [solution.md](solution.md).
- Tout recommencer : `lab reset 08` sur chaque machine (ou l’instantané `avant-lab08`).
