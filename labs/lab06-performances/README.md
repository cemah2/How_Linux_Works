# Lab 06 : le serveur qui rame

> **Chapitre** : 8 (processus, ressources, lsof, vmstat, iostat, cgroups) · **Durée** : 1 h 30
> **VM** : `cuve` ou `fut` · **Prérequis** : fiches 8.1 à 8.7 (et 4.12 pour les inodes et les fichiers supprimés)

## Le ticket

> **Ticket #613**, ouvert par Inès Garnier (gérante), priorité haute
>
> Depuis ce matin, le serveur est **lent**. Les pages de la boutique mettent des secondes à s’afficher, les
> commandes tapées par SSH répondent avec retard, et on entend le disque gratter.
>
> En plus, `df -h` dit que `/var` a perdu un quart de Go ; Bastien a supprimé « un gros fichier inutile » des
> capteurs pour faire de la place, mais **ça n’a rien changé**.
>
> Contraintes, et elles ne sont pas négociables :
> - Malik a lancé un **recalcul des stocks** qui doit **aller jusqu’au bout**. Mais il ne doit plus gêner personne.
> - La **sauvegarde** de Bastien doit continuer. Mais elle n’a qu’à utiliser le disque quand il est libre.
> - Le **cache du catalogue** de la boutique sait s’adapter à la mémoire qu’on lui accorde : Malik dit que
>   **150 Mo** lui suffisent. Par contre, ne touche pas à son fichier de service, c’est celui du fournisseur.
> - Les **capteurs** doivent continuer d’enregistrer.
>
> Et pour la prochaine fois : installe de quoi garder un **historique** de l’activité du serveur, qu’on puisse
> voir ce qui s’est passé à 3 h du matin sans être là.
>
> Enfin, écris-moi un petit **diagnostic** dans `/root/diagnostic-06.txt` : pour chaque problème, le nom exact
> du coupable (processus ou service), comment tu l’as trouvé, ce que tu as fait.
>
> Inès

## Démarrer

```
$ lab start 06
```

Le script lance les travaux de la nuit et les services de la boutique. Ensuite, c’est à toi de mener l’enquête.

Les travaux « de la nuit » s’arrêtent d’eux-mêmes au bout de deux à trois heures (pour ne pas user le disque
de ton Proxmox). Si tu reprends le lab plus tard : `lab reset 06` puis `lab start 06`.

## Ce qui est vérifié

`lab check 06` contrôle six objectifs :

| # | Objectif |
|---|---|
| 1 | sysstat installé (`iostat`, `pidstat`, `sar`) et collecte historique activée |
| 2 | Le recalcul des stocks tourne toujours, avec la priorité la plus basse |
| 3 | La sauvegarde tourne toujours, dans la classe d’entrées-sorties « idle » |
| 4 | Le cache du catalogue limité à 150 Mo par son cgroup, sans modifier son fichier d’unité |
| 5 | L’espace du fichier supprimé est réellement libéré, les capteurs enregistrent toujours |
| 6 | Le diagnostic nomme les quatre coupables |

## Règles du jeu

- **Mesure avant d’agir** : `uptime`, `top`, `free -h`, `vmstat 2`, `df -h`… Note ce que tu vois : c’est ton diagnostic.
- **N’arrête rien** qui doive continuer : ni le calcul, ni la sauvegarde, ni les services.
- Un seul outil ne montre pas tout : processeur, mémoire, disque et espace disque ont chacun le leur (fiche 8.6).
- Il y a au moins **trois pièges**. Les messages de `lab check` te mettront sur la voie.

## Coincé ?

- `lab hint 06 1`, puis `2`, puis `3` (ou [indices.md](indices.md)).
- La solution commentée : `lab solution 06` ou [solution.md](solution.md).
- Tout recommencer : `lab reset 06` puis `lab start 06`.
