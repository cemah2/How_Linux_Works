# Indices du Lab 06

## Niveau 1

1. **Historique** : quel paquet fournit `iostat`, `pidstat` et `sar` (fiche 8.6) ? Installer ne suffit pas toujours
   à activer la collecte.
2. **Processeur** : quel outil classe les processus par consommation de processeur ? Regarde la colonne USER.
3. **Disque qui gratte** : `vmstat 2` (colonnes `bi`, `bo`, `wa`), puis un outil « top » pour les entrées-sorties.
4. **Mémoire** : `free -h`, puis `top` trié par mémoire. À quel service appartient le processus (`systemctl status PID`) ?
5. **Espace qui ne revient pas** : où va l’espace d’un fichier supprimé qu’un processus garde ouvert (fiche 8.1) ?
6. **Diagnostic** : le nom exact du processus ou du service, l’outil, l’action.

## Niveau 2

1. Paquet `sysstat`. Debian : la collecte est désactivée tant que `ENABLED="true"` n’est pas dans
   `/etc/default/sysstat`. Rocky : il faut activer le service `sysstat`.
2. Dans `top`, le processus en tête appartient à malik. Ne le tue pas : change sa **valeur nice** (fiche 8.4).
3. `sudo iotop -o` ou `pidstat -d 1` : un `dd` qui revient sans cesse, lancé par un script parent.
   La priorité d’entrées-sorties se règle avec `ionice` ; la classe 3 (idle) n’accède au disque que s’il est libre.
4. `systemctl set-property UNITÉ MemoryMax=150M` modifie le cgroup sans toucher au fichier d’unité (fiche 8.7).
5. `sudo lsof +L1` liste les fichiers supprimés encore ouverts. Redémarrer le service lui fait fermer l’ancien fichier.
6. Les noms : la colonne COMMAND de `top`/`ps`, et le nom de l’unité dans `systemctl status`.

## Niveau 3

1. Debian : `sudo apt install sysstat`, puis `sudo sed -i 's/^ENABLED=.*/ENABLED="true"/' /etc/default/sysstat`.
   Rocky : `sudo dnf install sysstat && sudo systemctl enable --now sysstat`.
2. `sudo renice -n 19 -p $(pgrep -x calcul-stocks)`
3. **Piège** : le `dd` change à chaque tour ; c’est le **script parent** qu’il faut viser, ses enfants hériteront
   de sa classe : `sudo ionice -c 3 -p $(pgrep -x sauvegarde-nuit)`.
4. `sudo systemctl set-property catalogue-cache.service MemoryMax=150M`, puis 10 secondes plus tard :
   `systemctl status catalogue-cache` (ligne Memory).
5. `sudo systemctl restart capteurs-brut`, puis `df -h /var`.
6. Les quatre noms : `calcul-stocks`, `sauvegarde-nuit`, `catalogue-cache`, `capteurs-brut`.
