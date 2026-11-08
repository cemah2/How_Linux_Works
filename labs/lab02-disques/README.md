# Lab 02 : de nouveaux disques pour la boutique

> **Chapitres** : 3 et 4 (périphériques, partitions, systèmes de fichiers, LVM, swap, inodes) · **Durée** : 2 h
> **VM** : `cuve` (ou `fut`) avec **deux disques supplémentaires** · **Prérequis** : Lab 01, fiches 3.1 à 3.7 et 4.1 à 4.12

## Le ticket

> **Ticket #214**, ouvert par Malik Benali (boutique en ligne), priorité normale
>
> Salut,
>
> La boutique grossit et ses fichiers vivent toujours dans `/srv/boutique-ancien`, sur le disque système. Si
> les commandes remplissent le disque, c’est tout le serveur qui tombe. Inès a fait ajouter **deux disques de
> 2 Go** à la machine. Ce qu’on voudrait :
>
> 1. Rassembler les deux disques dans un groupe de volumes LVM **`vg_donnees`** (on veut pouvoir agrandir plus tard).
> 2. Un volume **`lv_boutique`** d’1 Go en **ext4**, monté sur **`/srv/boutique`**.
> 3. Un volume **`lv_archives`** d’1 Go en **XFS**, monté sur **`/srv/archives`**. On n’y stocke que des archives :
>    aucun programme ne doit pouvoir s’y exécuter, ni fichier de périphérique, ni bit setuid y fonctionner.
> 4. Le serveur manque de mémoire certains soirs : ajoute **256 Mo de swap** sur un volume **`lv_swap`**.
> 5. Tout doit revenir **tout seul au redémarrage**. Et pas de `/dev/sdb` dans la config : la dernière fois que
>    le prestataire a ajouté un disque, les noms ont changé et le serveur n’a plus démarré.
> 6. **Migre** les données de `/srv/boutique-ancien` vers `/srv/boutique`, sans rien perdre : propriétaires,
>    droits, fichiers cachés, liens.
> 7. Mets des **étiquettes** aux systèmes de fichiers (`boutique` et `archives`), qu’on s’y retrouve dans `lsblk -f`.
> 8. Mauvaise nouvelle de dernière minute : 1 Go ne suffira pas. Passe `lv_boutique` à **1,5 Go**, **sans
>    démonter** (la boutique tourne).
>
> PS de Bastien : rien à voir, mais le collecteur des capteurs de cuve n’arrive plus à écrire dans
> `/srv/capteurs` (« No space left on device ») alors que `df -h` dit qu’il reste plein de place. Tu peux
> regarder ? Les mesures de `/srv/capteurs/mesures` sont précieuses, le reste n’est que du temporaire.

## Avant de commencer : ajouter les deux disques

Sur l’**hôte Proxmox**, dans le répertoire `infra/proxmox` du dépôt :

```
# ./instantane.sh creer avant-lab02     # recommandé : on ne sait jamais
# ./ajouter-disques.sh cuve             # deux disques de 2 Go, ajoutés à chaud
```

Dans la VM, `lsblk` doit montrer deux disques de 2 Go sans partition (par exemple `sdb` et `sdc`).

## Démarrer

```
$ lab start 02
```

Le script repère les deux disques, crée les anciennes données de la boutique et le système de fichiers des
capteurs. Il installe `lvm2` et `xfsprogs` s’ils manquent.

## Ce qui est vérifié

`lab check 02` contrôle huit objectifs :

| # | Objectif |
|---|---|
| 1 | Les deux disques sont des volumes physiques de `vg_donnees` |
| 2 | `lv_boutique` : ext4 monté sur `/srv/boutique`, agrandi à 1,5 Gio (volume **et** système de fichiers) |
| 3 | `lv_archives` : XFS d’1 Gio monté sur `/srv/archives` avec `nodev,nosuid,noexec` |
| 4 | `lv_swap` : 256 Mio de swap actif |
| 5 | `/etc/fstab` : les trois entrées, par UUID ou chemin LVM, sans erreur pour `findmnt --verify` |
| 6 | Les données migrées à l’identique |
| 7 | Les étiquettes `boutique` et `archives` |
| 8 | `/srv/capteurs` accepte de nouveau des fichiers, mesures intactes |

## Règles du jeu

- Avant toute commande destructrice (`pvcreate`, `mkfs`, `wipefs`), **vérifie deux fois** le nom du disque
  avec `lsblk`. Ne touche **jamais** au disque système (celui qui porte `/`).
- Après avoir modifié `/etc/fstab`, teste-le **avant** de redémarrer : `findmnt --verify`, puis `mount -a`
  et `swapon -a`. Une erreur dans fstab peut empêcher le démarrage (tu verras ça au Lab 03).
- Pour finir en beauté : redémarre la VM (`sudo reboot`) et relance `lab check 02`. Tout doit rester vert.
- Il y a au moins **trois pièges**. Les messages de `lab check` te mettront sur la voie.

## Coincé ?

- `lab hint 02 1`, puis `2`, puis `3` (ou [indices.md](indices.md)).
- La solution commentée : `lab solution 02` ou [solution.md](solution.md).
- Tout recommencer : `lab reset 02` (les disques redeviennent vierges) puis `lab start 02`.
- Fin du lab : `lab reset 02`, puis sur Proxmox `./ajouter-disques.sh cuve --retirer` si tu veux récupérer la place.
