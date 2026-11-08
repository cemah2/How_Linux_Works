# Lab 13 : incident en production

> **Lab final** · **Chapitres** : 4, 6, 7, 8, 9, 10 et module A8 · **Durée** : 2 h 30 à 3 h
> **VM** : `cuve` (fonctionne aussi sur `fut`) · **Prérequis** : labs 02 à 08, fiches A8.4 et A8.5

## Le ticket

> **Ticket #1313**, ouvert par Inès Garnier (gérante), priorité **critique**, vendredi 21 h 47
>
> La boutique en ligne ne prend plus de commandes. Les clients voient des erreurs, et c’est le
> week-end de la sortie de la bière de Noël. Malik est en congés jusqu’à lundi et ne répond pas.
>
> Ce que je sais :
> - la boutique tourne sur cuve (`boutique.service`, port **8090**) et s’appuie sur le service de stock
>   (`stock.service`), joint sous le nom **`stock.brasserie.lan`** ;
> - ses données sont sur un volume à part, monté sur **`/srv/boutique/donnees`** ;
> - Bastien dit que « le serveur rame depuis cet après-midi » ;
> - Malik a fait « deux ou trois réglages provisoires » cette semaine.
>
> Remets la boutique en route, **sans perdre les commandes déjà enregistrées**. Puis assure-toi que ça ne se
> reproduira pas lundi, et envoie-moi un **rapport d’incident** : je dois rendre des comptes à l’associé.
>
> Inès

## Démarrer

```
$ lab start 13
```

Le script installe la boutique, son service de stock et le volume de données, puis… laisse la semaine de
Malik produire ses effets. Prends un instantané Proxmox avant, si tu veux pouvoir recommencer à l’identique
(ou utilise `lab reset 13` puis `lab start 13`).

## Ce que tu dois livrer

1. **La boutique rétablie** : `curl http://127.0.0.1:8090/sante` répond 200 et une commande passe.
2. **Chaque cause corrigée** à la racine, pas seulement contournée.
3. **Des protections** pour que la cause principale ne se reproduise pas, et pour que les preuves d’un
   prochain incident ne disparaissent pas au redémarrage.
4. **Un rapport d’incident** dans `/root/rapport-incident.md`, en markdown, avec au moins les sections
   `# Résumé`, `# Chronologie` (lignes horodatées : `21:52 …`), `# Causes` et `# Actions` (chacune avec un
   responsable et une échéance). Modèle : fiche A8.5.

## Ce qui est vérifié

`lab check 13` contrôle neuf objectifs ; il ne dit pas **où** chercher, seulement ce qui ne va pas encore.

| # | Objectif |
|---|---|
| 1 | `/sante` répond 200 et une commande de contrôle est enregistrée |
| 2 | Le volume de données est sous 50 % d’occupation, sans fichier supprimé encore ouvert |
| 3 | La cause du remplissage est retirée de la configuration **et** du processus en cours |
| 4 | `stock.service` actif, activé, sous son compte, sans que sa configuration soit lisible par tous |
| 5 | `stock.brasserie.lan` désigne 127.0.0.1 et le stock répond |
| 6 | Plus de surcharge processeur, et rien ne la relance |
| 7 | Le journal système est conservé sur disque |
| 8 | Les journaux de la boutique ne peuvent plus remplir le volume (logrotate) |
| 9 | Le rapport d’incident est complet |

## Règles du jeu

- Travaille comme en vrai : **note l’heure** de chaque constat et de chaque action, dans un fichier ou sur
  papier. C’est la matière de ta chronologie.
- **Une modification à la fois**, vérifiée. Lis les journaux avant de deviner.
- **Garde les preuves** avant de nettoyer (fiche A8.5) : une copie d’un journal ou d’une sortie de commande
  prend dix secondes.
- Les commandes déjà enregistrées (`commandes.log`) ne doivent pas être perdues.
- `lab check 13` aussi souvent que tu veux ; `lab hint 13 1` (puis 2, 3) si tu bloques. Le niveau 1 ne
  donne que des pistes de méthode.

## Pour aller plus loin

- Ajoute à `boutique.service` un `OnFailure=` qui déclenche une alerte, et un timer qui interroge `/sante`
  toutes les minutes (fiche A8.4).
- Durcis `boutique.service` et `stock.service` et compare leurs scores avec `systemd-analyze security`
  (fiche A8.2).
- Écris le *runbook* « boutique indisponible » à partir de ton rapport.
- Rejoue l’incident sur fut : qu’est-ce qui change (SELinux, noms de paquets, firewalld) ?
