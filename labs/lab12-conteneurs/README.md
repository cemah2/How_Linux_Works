# Lab 12 : conteneurs sous le capot

> **Chapitres** : 17 et module A4 (conteneurs, espaces de noms, cgroups) · **Durée** : 2 h à 2 h 30
> **VM** : `fut` (Rocky, SELinux actif ; fonctionne aussi sur `cuve`) · **Accès Internet** nécessaire
> **Prérequis** : fiches 17.2 à 17.4 et 17.A, 8.7 (cgroups), 4.4 (montages)

## Le ticket

> **Ticket #1207**, ouvert par Inès Garnier (gérante), priorité normale
>
> Malik a « conteneurisé » la vitrine (`/srv/vitrine`) avant de partir en congés. Son Containerfile ne
> construit même pas sur fut, et il a laissé ses essais partout. Je voudrais :
>
> **La vitrine en production**
> 1. Une image **`localhost/hlw-vitrine:1.0`** construite depuis `/srv/vitrine`, qui parte d’une base
>    **précise** : registre complet, version figée (une mise à jour de l’image de base ne doit pas changer la
>    vitrine en douce), et **légère** (moins de 200 Mo).
> 2. Un service **`vitrine`** géré par systemd avec **Quadlet**, qui lance un conteneur nommé **`vitrine`** :
>    - la vitrine écoute sur le port 8000 du conteneur ; elle doit répondre sur le **port 8080** de fut ;
>    - ses données (page d’accueil, journal des visites) sont dans **`/srv/vitrine/donnees`**, monté sur
>      `/donnees` dans le conteneur, en lecture **et écriture** ;
>    - **128 Mo** de mémoire au plus ; redémarrage automatique s’il plante ; lancement au démarrage de fut.
>
> **Léa** voudrait faire ses propres essais de conteneurs, **sans être root**, mais Podman lui répond qu’il ne
> trouve pas ses correspondances d’identifiants. Arrange ça.
>
> **Le ménage** : supprime les essais de Malik (ses conteneurs et ses images, y compris les images
> orphelines `<none>`).
>
> **Pour la formation de l’équipe** (Bastien insiste : « un conteneur, ce n’est que des processus ») :
> 3. Un petit rapport `/root/lab12-sous-le-capot.txt` qui montre la vitrine **vue depuis l’hôte** :
>    ```
>    PID_HOTE=…      le PID, sur fut, du processus principal du conteneur vitrine
>    NS_PID=…        son espace de noms PID   (tel que l’affiche readlink /proc/PID/ns/pid)
>    NS_NET=…        son espace de noms réseau
>    MEMOIRE_MAX=…   sa limite mémoire en octets, lue dans les cgroups (memory.max)
>    ```
> 4. Un **mini-conteneur fait main**, sans Podman : `/usr/local/sbin/mini-conteneur COMMANDE [ARGS…]` lance
>    la commande :
>    - avec pour racine **`/srv/mini/rootfs`**, un système Alpine que tu extrairas de l’image de la vitrine ;
>    - dans de nouveaux espaces de noms **PID** (la commande est le PID 1), **montages**, **UTS** (le nom
>      d’hôte y vaut `mini`, celui de fut ne change pas), **réseau** (seule `lo` existe) et IPC ;
>    - limitée à **64 Mo** de mémoire par un cgroup.
>
> Inès

## Démarrer

```
$ lab start 12
```

Le script installe Podman si besoin, dépose les fichiers de la vitrine dans `/srv/vitrine`, recrée les
essais de Malik (une image Alpine est téléchargée) et retire à Léa ses plages d’identifiants subordonnés.

Tout se fait en **root** (`sudo`), sauf les essais de Léa : `sudo -iu lea`, puis `podman …`.

## Ce qui est vérifié

| # | Objectif |
|---|---|
| 1 | `FROM` avec registre complet et version figée ; image `localhost/hlw-vitrine:1.0` reconstruite, < 200 Mo |
| 2 | Plages de Léa dans `/etc/subuid` et `/etc/subgid` ; `podman unshare` montre une plage de 65536 identifiants |
| 3 | `/etc/containers/systemd/vitrine.container`, `vitrine.service` actif, conteneur `vitrine` sur la bonne image |
| 4 | La page répond sur `http://127.0.0.1:8080/` ; chaque visite est notée dans `/srv/vitrine/donnees/visites.log` |
| 5 | Limite mémoire effective 128 Mio ; `Restart=on-failure` ; lancement au démarrage |
| 6 | Le rapport : PID, espaces de noms PID et réseau, limite mémoire, tous exacts |
| 7 | `/srv/mini/rootfs` contient une Alpine |
| 8 | `mini-conteneur` : PID 1, nom d’hôte `mini` (sans toucher à fut), racine Alpine, seulement `lo` |
| 9 | `mini-conteneur` : limite mémoire effective 64 Mio |
| 10 | Plus d’autre conteneur que `vitrine`, ni d’image `<none>` ou `essai-malik` |

## Règles du jeu

- Après chaque modification du fichier Quadlet : `systemctl daemon-reload`, puis `systemctl restart vitrine`.
  Si le service n’apparaît pas : `/usr/libexec/podman/quadlet -dryrun` affiche les erreurs du fichier.
- `journalctl -u vitrine` et `podman logs vitrine` sont tes meilleurs amis ; sur fut, `ausearch -m avc -ts recent`
  aussi (SELinux).
- Le rapport doit correspondre au conteneur **en cours** : s’il redémarre, son PID change.
- `lab check 12` à volonté ; `lab hint 12 1` (puis 2, 3) si tu bloques.

## Pour aller plus loin

- Fais tourner la vitrine en **rootless**, sous un compte de service avec `loginctl enable-linger` et un
  fichier Quadlet dans `~/.config/containers/systemd/`. Compare le rapport « sous le capot ».
- Ajoute un espace de noms **utilisateur** au mini-conteneur (`unshare --user --map-root-user`) et lance-le
  sans être root. Qu’est-ce qui ne marche plus ?
- Mets `AutoUpdate=registry` dans le Quadlet et regarde `podman auto-update --dry-run` : pourquoi est-ce
  incompatible avec une version figée ?
