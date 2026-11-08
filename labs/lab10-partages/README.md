# Lab 10 : sauvegardes et partages

> **Chapitre** : 12 (rsync, NFS, Samba, SSHFS), avec les timers du chapitre 7 · **Durée** : 2 h
> **VM** : `cuve`, `comptoir` et `douane`, avec le réseau du Lab 07 et les clés du Lab 08 · **Prérequis** : fiches 12.1 à 12.6

## Le ticket

> **Ticket #1003**, ouvert par Inès Garnier (gérante), priorité normale
>
> La boutique tourne, maintenant il faut **partager** et **sauvegarder** :
>
> 1. **Dossier commun.** Bastien dépose les plannings de brassage dans `/srv/partages/commun` sur cuve. Le comptoir
>    doit y accéder en **NFS**, monté sur `/mnt/commun`, dès le démarrage. Seul le réseau interne y a accès, et root
>    sur le comptoir ne doit pas avoir de droits particuliers sur cuve. Pour vérifier, Bastien crée depuis le comptoir
>    le fichier **`bonjour-de-bastien.txt`** dans ce dossier : sur cuve, il doit bien lui appartenir.
> 2. **Dossier boutique.** Malik veut aussi ouvrir le dossier `/srv/partages/boutique` depuis les PC Windows de la
>    caisse, qu’on achètera plus tard. Partage-le avec **Samba** (partage `boutique`), réservé au **groupe boutique**,
>    en **SMB3** minimum, pour le réseau interne seulement. En attendant les PC, le comptoir le monte sur
>    `/mnt/boutique` au démarrage, au nom de Malik, **sans mot de passe en clair** dans `/etc/fstab`.
> 3. **Archives.** Bastien veut parfois consulter `/srv/archives` de cuve depuis le comptoir, sans qu’on installe
>    quoi que ce soit de plus sur cuve : un montage **SSHFS** dans son répertoire, `~/archives-cuve`, suffira.
> 4. **Sauvegarde.** Chaque nuit à **1 h**, les recettes (`/srv/recettes` sur cuve) doivent être copiées sur douane,
>    dans **`/srv/sauvegardes/cuve/recettes/`**, en **miroir exact**, sans les brouillons `*.tmp`. Utilise **rsync**
>    par SSH, avec un compte **`sauvegarde`** dédié sur douane et une **clé** qui ne sert qu’à ça. Lance-la une
>    première fois pour vérifier.
>
> Inès

## Démarrer

Le réseau du Lab 07 doit fonctionner, et Bastien doit pouvoir faire `ssh cuve` depuis le comptoir (Lab 08). Puis,
sur **chacune** des trois machines :

```
$ lab start 10
```

## Ce qui est vérifié

| Machine | Objectifs |
|---|---|
| cuve | export NFS (réseau interne, rw, root_squash) ; le fichier de Bastien lui appartient ; partage Samba [boutique] (groupe, SMB3, hosts allow, compte de Malik) ; timer de sauvegarde, testé, et copie à jour sur douane |
| comptoir | `/mnt/commun` en NFS et dans fstab ; `/mnt/boutique` en CIFS, fichier d’identifiants en 600, Malik peut écrire ; montage SSHFS actif de Bastien |
| douane | compte `sauvegarde` sans mot de passe, clé restreinte, recettes présentes, pas de `*.tmp` |

## Règles du jeu

- Côté serveur, installe ce qu’il faut sur cuve (`nfs-kernel-server`, `samba`). Le comptoir a déjà ses outils clients.
- **Avant tout `--delete`**, simule avec `rsync -n`.
- Les montages réseau dans fstab : pense à ce qui se passe au démarrage si cuve est éteinte (Lab 03).
- Il y a au moins **quatre pièges**.

## Coincé ?

- `lab hint 10 1`, puis `2`, puis `3` (ou [indices.md](indices.md)).
- La solution commentée : `lab solution 10` ou [solution.md](solution.md).
- Tout recommencer : `lab reset 10` sur chaque machine.
