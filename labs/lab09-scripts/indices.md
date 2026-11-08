# Indices du Lab 09

## Niveau 1

1. **Avant d’écrire** : lance `shellcheck /usr/local/bin/archive-releves` sur le script de Bastien et lis chaque
   avertissement. Puis teste-le sur une copie : `cp -a /srv/releves /tmp/essai`. Qu’arrive-t-il aux fichiers
   « cuve 1_… » ?
2. **Structure** : commence par `set -euo pipefail`, une fonction `usage`, l’analyse des options (fiche 11.A),
   la vérification du nombre d’arguments (`$#`, fiche 11.3).
3. **Choisir les fichiers** : quelle commande sait trouver des fichiers par nom, par type, par date, sans
   descendre dans les sous-répertoires ? Regarde ses options `-maxdepth` et `-mtime` (fiche 2.4, `man find`).
4. **Les espaces** : `for f in $(…)` découpe sur les espaces (fiche 11.2). Il faut une liste dont le
   séparateur ne peut pas apparaître dans un nom de fichier.
5. **Supprimer seulement si l’archive existe** : quel est le code de sortie de `tar` ? Comment l’utiliser
   (fiche 11.3, 11.4) ?
6. **Fichier temporaire** : `mktemp` et `trap … EXIT` (fiche 11.6).
7. **Journal** : quelle commande écrit dans le journal depuis un script (fiche 7.2) ?
8. **PATH pour tous** : quel répertoire `/etc/profile` lit-il pour les ajouts locaux (fiche 13.2) ?
   Que se passe-t-il si le fichier est lu deux fois ?
9. **Léa** : pourquoi un `echo` dans `.bashrc` casse-t-il `scp` (fiche 13.3) ? Comment savoir, dans le shell,
   s’il est interactif ?
10. **Nouveaux comptes** : que copie `useradd -m` dans le répertoire personnel (fiche 13.3) ?
11. **Planning** : un timer et un service, comme au Lab 04 ; cette fois le service ne doit pas tourner en root.

## Niveau 2

1. Les défauts de Bastien : `cd $SOURCE` sans guillemets ni test (sans argument, `cd` va dans le répertoire
   personnel !), boucle `for` sur `$(find)`, fichier temporaire au nom fixe jamais vidé (il grossit à chaque
   passage), `rm` même si `tar` a échoué, `find` récursif, aucun code de sortie.
2. ```
   while getopts ':nj:' opt; do
     case $opt in
       n) SIMULATION=1 ;;
       j) JOURS=$OPTARG ;;
       *) usage ;;      # usage affiche sur >&2 et fait exit 2
     esac
   done
   shift $((OPTIND - 1))
   [[ $# -eq 2 ]] || usage
   ```
3. `find "$SOURCE" -maxdepth 1 -type f -name '*.csv' -mtime +"$JOURS"`. L’option `-printf '%f\0'` donne le nom
   **sans** le chemin, terminé par un caractère nul.
4. Écris cette liste nulle dans un fichier temporaire. `tar` sait la lire : `--null -T fichier`, et
   `-C "$SOURCE"` pour que les noms soient relatifs. Pour supprimer : `xargs -0 rm -f --`.
5. Avec `set -e`, un `tar` qui échoue arrête le script **avant** le `rm`. Plus lisible :
   `if ! tar …; then rm -f "$ARCHIVE"; erreur "…"; fi`.
6. `LISTE=$(mktemp)` puis immédiatement `trap 'rm -f "$LISTE"' EXIT`. `mktemp` respecte `TMPDIR`.
7. `logger -t archive-releves "N relevés archivés dans …"`, puis `journalctl -t archive-releves`.
8. Un fichier `/etc/profile.d/brasserie.sh`. Pour n’ajouter le répertoire que s’il manque :
   un `case ":$PATH:" in *:/opt/brasserie/bin:*) …` (le deux-points de chaque côté évite les faux positifs).
9. `$-` contient `i` dans un shell interactif : `[[ $- == *i* ]] && echo "Bienvenue…"`.
10. Ajoute l’alias dans `/etc/skel/.bashrc` (sur Debian, `/etc/skel/.bash_aliases` marche aussi : `.bashrc` le lit).
11. `archive-releves.service` : `Type=oneshot`, `User=releves`, `ExecStart=/usr/local/bin/archive-releves /srv/releves /srv/archives`.
    `archive-releves.timer` : `OnCalendar=*-*-* 03:15:00`, `Persistent=true`, `WantedBy=timers.target`.

## Niveau 3

La solution complète est dans `solution.md` (`lab solution 09`). Avant de la lire, vérifie au moins :

- `archive-releves` sans argument → `echo $?` affiche 2, et `archive-releves 2>/dev/null` n’affiche rien ;
- `archive-releves -n /tmp/essai /tmp/dest` liste les « cuve 1_… » ;
- `ls /tmp` avant et après une exécution ratée (`archive-releves /tmp/essai /`) : rien de nouveau ;
- `runuser -l lea -c 'echo $PATH'` et `runuser -u lea -- bash -c '. ~/.bashrc'` (ne doit rien afficher).
