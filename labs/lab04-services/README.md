# Lab 04 : des services dignes de ce nom

> **Chapitres** : 6 et 7 (unités systemd, surcharges, timers, comptes système) · **Durée** : 1 h 30
> **VM** : `cuve` ou `fut` · **Prérequis** : fiches 6.2 à 6.6, 7.3, 7.4, 7.6 et 7.7

## Le ticket

> **Ticket #418**, ouvert par Inès Garnier (gérante), priorité haute
>
> Trois choses qui m’empêchent de dormir :
>
> **La vitrine.** Le site de la boutique (`/opt/vitrine`) tourne depuis trois semaines parce que Malik l’a
> lancé « à la main, en attendant ». Le jour où le serveur redémarre, plus de boutique. Je veux un vrai
> service **`vitrine`** :
> - qui démarre avec la machine et redémarre tout seul s’il plante ;
> - qui tourne sous un **compte système `vitrine`** dédié (répertoire `/opt/vitrine`, aucune connexion
>   possible), pas sous le compte de Malik, et surtout pas en root ;
> - qui lit sa configuration dans **`/etc/vitrine/vitrine.env`** (le port y est déjà), pour qu’on puisse la
>   changer sans toucher au service ;
> - qui réponde sur `http://127.0.0.1:8080/`, comme aujourd’hui.
>
> **L’inventaire.** Le logiciel d’inventaire de CaveSoft (`inventaire.service`) est trop gourmand : il doit
> passer **après** les autres pour le processeur (**nice 10**) et ne **jamais dépasser 200 Mo** de mémoire.
> Attention : l’éditeur écrase son fichier de service à chaque mise à jour.
>
> **L’export des ventes.** Bastien a mis une ligne cron pour l’export des ventes vers la compta. Le mois
> dernier, la machine était éteinte une nuit et l’export n’a jamais été rattrapé ; et quand il échoue,
> personne ne sait pourquoi. Remplace ça par un **timer systemd** `export-ventes` : même horaire (du lundi au
> vendredi à 2 h 30), avec rattrapage. Teste-le une fois, et retire la ligne cron.
>
> Inès

## Démarrer

```
$ lab start 04
```

Le script installe la vitrine, la lance « à la manière de Malik », installe l’inventaire de l’éditeur et la
tâche cron de Bastien.

## Ce qui est vérifié

`lab check 04` contrôle neuf objectifs :

| # | Objectif |
|---|---|
| 1 | Le compte système `vitrine` (UID < 1000, pas de shell, répertoire `/opt/vitrine`) |
| 2 | L’instance de Malik est arrêtée |
| 3 | `vitrine.service` dans `/etc/systemd/system`, activé et actif |
| 4 | `User=vitrine`, `EnvironmentFile=/etc/vitrine/vitrine.env`, `Restart=on-failure` |
| 5 | La vitrine répond sur le port 8080, servie par le compte `vitrine` |
| 6 | `inventaire.service` adapté par une **surcharge** (Nice=10, MemoryMax=200M), effective |
| 7 | `export-ventes.timer` : Mon..Fri 02:30, `Persistent=true`, activé et démarré |
| 8 | `export-ventes.service` de type oneshot, testé avec succès |
| 9 | La ligne cron est retirée |

## Règles du jeu

- Après chaque modification d’unité : `systemctl daemon-reload`. Puis lis `systemctl status` **et**
  `journalctl -u nom` : c’est là que les services expliquent leurs échecs.
- Pour l’inventaire, ne modifie pas le fichier de l’éditeur (fiche 6.3).
- Teste une expression de calendrier avant de l’utiliser : `systemd-analyze calendar "…"`.
- Il y a au moins **trois pièges**. Les messages de `lab check` et le journal te mettront sur la voie.

## Coincé ?

- `lab hint 04 1`, puis `2`, puis `3` (ou [indices.md](indices.md)).
- La solution commentée : `lab solution 04` ou [solution.md](solution.md).
- Tout recommencer : `lab reset 04` puis `lab start 04`.
