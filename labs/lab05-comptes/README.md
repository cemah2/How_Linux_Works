# Lab 05 : arrivées, départ et journaux

> **Chapitre** : 7 (comptes, groupes, PAM, journaux, logrotate) · **Durée** : 1 h 30
> **VM** : `cuve` puis `fut` (les outils diffèrent) · **Prérequis** : fiches 7.1 à 7.4, 7.8 et 7.9

## Le ticket

> **Ticket #522**, ouvert par Inès Garnier (gérante), priorité normale
>
> Lundi, c’est le grand chamboulement :
>
> 1. **Léa Durand** arrive à l’équipe de brassage. Il lui faut un compte `lea` (avec son répertoire et bash),
>    dans les groupes `brasseurs` et `personnel`. Donne-lui un mot de passe provisoire, qu’elle devra
>    **changer à sa première connexion**.
> 2. **Yanis Moreau** est en stage à la boutique jusqu’au **30 juin 2027** : compte `yanis`, groupes `boutique`
>    et `personnel`, même règle pour le mot de passe, et le compte doit **expirer tout seul** à la fin du stage.
> 3. **Malik** rejoint aussi la compta (groupe `compta`), mais il reste à la boutique, évidemment.
> 4. Moi, je veux pouvoir **lire tous les journaux** du serveur, sans être administratrice.
> 5. **Kevin** nous a quittés vendredi, en mauvais termes. Bloque son compte **tout de suite**, y compris s’il
>    a une clé SSH, mais **ne le supprime pas** : on garde tout 30 jours. Archive ses fichiers dans
>    `/root/archives/kevin.tar.gz`. Et il paraît qu’un de ses scripts tourne encore…
> 6. L’assureur exige des mots de passe d’au moins **12 caractères**, dont au moins **un chiffre**.
> 7. Les journaux disparaissent à chaque redémarrage (Bastien a voulu « économiser le disque »). Je veux les
>    garder, mais sans dépasser **200 Mo**.
> 8. Le journal des commandes de la boutique (`/var/log/boutique/commandes.log`) grossit sans fin. Fais-le
>    tourner chaque **semaine**, garde **8 semaines**, compressé. Malik prévient : la boutique ne sait pas
>    rouvrir son fichier de journal, il ne faut pas perdre de lignes.
> 9. Enfin, il y a eu des tentatives de connexion SSH cette nuit. Trouve **l’adresse IP qui a insisté le plus**
>    et note-la (rien d’autre) dans `/root/audit/ip-suspecte.txt`.
>
> Inès

## Démarrer

```
$ lab start 05
```

Le script crée l’équipe (s’ils n’existent pas déjà : `bastien`, `malik`, `ines`, `chloe`, et `kevin`),
rend le journal volatil, lance la boutique et rejoue les tentatives SSH de la nuit.

**Attention** : le journal est volatil au début du lab. Si tu redémarres avant d’avoir fait l’audit (point 9),
les traces disparaissent.

## Ce qui est vérifié

`lab check 05` contrôle neuf objectifs, dans l’ordre du ticket :

| # | Objectif |
|---|---|
| 1 | Léa : compte, groupes, mot de passe provisoire à changer |
| 2 | Yanis : idem, et expiration le 2027-06-30 |
| 3 | Malik dans `compta`, sans perdre ses autres groupes |
| 4 | Inès lit les journaux (groupe `systemd-journal` ou `adm`), sans droits d’administration |
| 5 | Kevin : verrouillé et expiré (ou sans shell), conservé, archivé, sans processus |
| 6 | `pam_pwquality` actif, `minlen` ≥ 12, `dcredit` ≤ −1 |
| 7 | Journal persistant, `SystemMaxUse=200M`, journald redémarré |
| 8 | `/etc/logrotate.d/boutique` : weekly, rotate 8, compress, missingok, notifempty, **copytruncate** |
| 9 | La bonne adresse IP dans `/root/audit/ip-suspecte.txt` |

## Règles du jeu

- Fais le lab sur `cuve` **et** sur `fut` : les noms de paquets, les fichiers PAM et les journaux texte diffèrent
  (fiches 7.2 et 7.9).
- Avant de toucher à PAM, garde une **deuxième session ouverte** (fiche 7.9).
- Teste la politique de mots de passe : connecte-toi en `lea` (`su - lea`) et essaie de choisir `brasserie`.
- Il y a au moins **quatre pièges**. Les messages de `lab check` te mettront sur la voie.

## Coincé ?

- `lab hint 05 1`, puis `2`, puis `3` (ou [indices.md](indices.md)).
- La solution commentée : `lab solution 05` ou [solution.md](solution.md).
- Tout recommencer : `lab reset 05` puis `lab start 05`.
