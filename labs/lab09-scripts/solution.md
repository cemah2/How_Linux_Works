# Solution du Lab 09

## 1. Ce qui n’allait pas dans le script de Bastien

`shellcheck /usr/local/bin/archive-releves` en signale déjà la plupart :

| Ligne | Problème | Conséquence |
|---|---|---|
| `cd $SOURCE` | ni guillemets ni test | sans argument, `cd` part dans le répertoire personnel : c’est l’incident de Malik |
| `for f in $(find …)` | découpage en mots | « cuve 1_….csv » devient « cuve » et « 1_….csv » : jamais archivé |
| `find . -name …` | récursif | les sous-répertoires sont vidés aussi |
| `/tmp/archive-releves.liste` | nom fixe, jamais supprimé, ouvert en ajout | la liste grossit à chaque passage ; un autre utilisateur peut la piéger |
| `tar …` puis `rm …` | aucun test du code de sortie | si `tar` échoue (disque plein, droits), les relevés sont effacés quand même |
| pas d’`exit` | code de sortie toujours celui du dernier `echo` | impossible de savoir, depuis un timer, si cela a marché |

## 2. Le script réécrit

```bash
#!/bin/bash
# archive-releves : archive les relevés CSV anciens d'un répertoire, puis les supprime.
# Usage : archive-releves [-n] [-j JOURS] SOURCE DESTINATION
set -euo pipefail

PROG=$(basename "$0")
JOURS=7
SIMULATION=0

usage() {
  echo "usage : $PROG [-n] [-j JOURS] SOURCE DESTINATION" >&2
  exit 2
}
erreur() {
  echo "$PROG : $*" >&2
  exit 1
}

while getopts ':nj:' opt; do
  case $opt in
    n) SIMULATION=1 ;;
    j) JOURS=$OPTARG ;;
    *) usage ;;
  esac
done
shift $((OPTIND - 1))
[[ $# -eq 2 ]] || usage
[[ $JOURS =~ ^[0-9]+$ ]] || usage

SOURCE=$1
DEST=$2
[[ -d $SOURCE ]] || erreur "$SOURCE n'est pas un répertoire"

# Liste des fichiers à archiver, séparés par un caractère nul (noms avec espaces)
LISTE=$(mktemp)
trap 'rm -f "$LISTE"' EXIT
find "$SOURCE" -maxdepth 1 -type f -name '*.csv' -mtime +"$JOURS" -printf '%f\0' > "$LISTE"

if [[ ! -s $LISTE ]]; then
  echo "rien à archiver dans $SOURCE"
  exit 0
fi

if (( SIMULATION )); then
  tr '\0' '\n' < "$LISTE"
  exit 0
fi

[[ -d $DEST && -w $DEST ]] || erreur "impossible d'écrire dans $DEST"
ARCHIVE="$DEST/releves-$(date +%Y%m%d-%H%M%S).tar.gz"
if ! tar -czf "$ARCHIVE" -C "$SOURCE" --null -T "$LISTE"; then
  rm -f "$ARCHIVE"
  erreur "échec de la création de $ARCHIVE, aucun fichier supprimé"
fi
(cd "$SOURCE" && xargs -0 rm -f -- < "$LISTE")

NB=$(tr -cd '\0' < "$LISTE" | wc -c)
logger -t archive-releves "$NB relevé(s) de $SOURCE archivé(s) dans $ARCHIVE" \
  || echo "$PROG : avertissement, journalisation impossible" >&2
echo "$NB relevé(s) archivé(s) dans $ARCHIVE"
```

Les points clés :

- `set -euo pipefail` : une erreur non gérée arrête le script (fiche 11.A) ;
- `getopts` pour `-n` et `-j`, puis **exactement deux** arguments ; tout écart → `usage` sur stderr et
  `exit 2` ;
- `find -maxdepth 1 -type f -name '*.csv' -mtime +N -printf '%f\0'` : non récursif, noms **séparés par un
  caractère nul**, le seul caractère interdit dans un nom de fichier ;
- `tar --null -T` et `xargs -0` lisent cette liste sans jamais découper sur les espaces ;
- `-C "$SOURCE"` : l’archive contient les noms sans chemin ;
- `mktemp` + `trap … EXIT` : le fichier temporaire disparaît dans tous les cas, même après une erreur ;
- la suppression n’a lieu **que si** `tar` a réussi ;
- le nom de l’archive contient l’heure : deux exécutions le même jour ne s’écrasent pas ;
- `logger -t archive-releves` : une trace dans le journal ; un échec de journalisation n’est qu’un
  avertissement (les relevés sont déjà archivés).

Installation et essais :

```
$ shellcheck ~/archive-releves && sudo install -m 755 ~/archive-releves /usr/local/bin/
$ cp -a /srv/releves /tmp/essai ; mkdir /tmp/dest
$ archive-releves ; echo $?                      # usage… puis 2
$ archive-releves -n /tmp/essai /tmp/dest          # liste, ne touche à rien
$ archive-releves /tmp/essai /tmp/dest && tar -tzf /tmp/dest/releves-*.tar.gz
$ archive-releves /tmp/essai / ; echo $?          # impossible d'écrire dans / … puis 1
$ journalctl -t archive-releves
```

## 3. Le planning

`/etc/systemd/system/archive-releves.service` :

```
[Unit]
Description=Archivage des relevés des cuves

[Service]
Type=oneshot
User=releves
Group=releves
ExecStart=/usr/local/bin/archive-releves /srv/releves /srv/archives
```

`/etc/systemd/system/archive-releves.timer` :

```
[Unit]
Description=Archivage des relevés chaque nuit à 3 h 15

[Timer]
OnCalendar=*-*-* 03:15:00
Persistent=true

[Install]
WantedBy=timers.target
```

```
$ sudo systemctl daemon-reload
$ sudo systemctl enable --now archive-releves.timer
$ sudo systemctl start archive-releves.service
$ systemctl status archive-releves.service ; journalctl -u archive-releves -t archive-releves
$ ls -l /srv/archives
```

Le service tourne avec l’environnement minimal de systemd (pas de `.bashrc`, PATH réduit) : c’est pour cela
qu’un script de production ne doit **jamais** dépendre de l’environnement interactif.

## 4. PATH pour tous

`/etc/profile.d/brasserie.sh` :

```sh
# Outils de la brasserie pour tous les utilisateurs
case ":$PATH:" in
  *:/opt/brasserie/bin:*) ;;
  *) PATH="$PATH:/opt/brasserie/bin" ;;
esac
export PATH
```

- **après** le système (`$PATH:…`) : un outil maison nommé comme une commande standard ne la masquera pas ;
- le `case` évite le doublon si le fichier est lu plusieurs fois (sous-shells, `/etc/bashrc` de Rocky qui
  relit `/etc/profile.d` pour les shells interactifs) ;
- `/etc/profile` reste intact : les mises à jour du paquet ne perdront pas le réglage.

Vérification : `runuser -l lea -c 'echo $PATH; command -v etat-cuves'`.

## 5. Le message de Léa

Dans `~lea/.bashrc`, la première ligne devient :

```
[[ $- == *i* ]] && echo "Bienvenue à la brasserie, Léa !"
```

`scp`, `rsync` et `sftp` lancent un shell **non interactif** qui lit pourtant `.bashrc` ; tout ce qu’il
affiche se mélange à leur protocole. Sur Debian, déplacer la ligne **après** le test `case $- in *i*)` du
début du fichier marche aussi.

## 6. L’alias des nouveaux comptes

```
$ echo "alias ll='ls -lh'" | sudo tee -a /etc/skel/.bashrc
$ sudo useradd -m essai && sudo runuser -u essai -- bash -i -c 'alias ll' ; sudo userdel -r essai
```

Les comptes existants ne changent pas (`/etc/skel` n’est copié qu’à la création).
