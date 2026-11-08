# Lab 03 : sauvetage du démarrage

> **Chapitres** : 5 et 6 (démarrage du noyau, GRUB, systemd, cibles, modes secours) · **Durée** : 1 h 30
> **VM** : `cuve` (puis `fut` pour comparer) · **Prérequis** : fiches 5.1 à 5.5 et 6.1 à 6.8, une console Proxmox

## Le ticket

> **Ticket #307**, ouvert par Inès Garnier (gérante), priorité **critique**
>
> Au secours ! Hier soir, Bastien a « préparé la maintenance de la cave » sur le serveur et l’a redémarré.
> Depuis, il ne répond plus : pas de SSH, la boutique est arrêtée. Sur l’écran, il y a un message qui parle
> de « emergency mode ».
>
> Bastien se souvient vaguement d’avoir : branché son disque USB de cave (il l’a repris depuis), « mis à jour »
> brassd, touché au collecteur des capteurs parce qu’il « démarrait trop tôt », et activé « un truc de
> maintenance » pour que le serveur démarre en mode réparation.
>
> Il me faut :
>
> 1. Le serveur qui redémarre **normalement**, tout seul, et qui le reste après un nouveau redémarrage.
> 2. **brassd** et le **collecteur des capteurs** qui tournent, et un démarrage qui ne traîne pas.
> 3. Un petit **rapport d’incident** dans `/root/incident-03.md` : symptômes, causes, corrections. Je veux
>    comprendre ce qui s’est passé pour que ça n’arrive plus.
>
> Inès

## Préparation (important)

Ce lab casse réellement le démarrage de la VM. Prépare-toi comme en production :

1. **Prépare le lab** : `lab start 03` (installe brassd et le collecteur, en état de marche).
2. **Mot de passe root** : en mode secours, systemd demande le mot de passe **root**. Les images cloud n’en ont
   pas : définis-en un, et note-le.
   ```
   $ sudo passwd root
   ```
3. **Instantané** : sur l’hôte Proxmox, `./instantane.sh creer avant-lab03`. En cas de catastrophe :
   `./instantane.sh restaurer avant-lab03`.
4. **Console** : dans l’interface web de Proxmox, sélectionne la VM, puis **Console** (ou `qm terminal ID`
   sur l’hôte). C’est par là que tu travailleras : le réseau ne sera pas disponible.
5. **Déclenche la panne** :
   ```
   $ lab panne 03
   ```
   La VM redémarre. Bonne chance !

## Ce qui est vérifié

`lab check 03` (à lancer une fois la machine revenue à la normale, par SSH) contrôle huit objectifs :

| # | Objectif |
|---|---|
| 1 | Le compte root a un mot de passe |
| 2 | La panne a été déclenchée, et la machine a redémarré depuis la réparation |
| 3 | `/etc/fstab` ne bloque plus le démarrage |
| 4 | Les paramètres du noyau ne forcent plus le mode secours (démarrage en cours **et** configuration) |
| 5 | La cible par défaut est `multi-user.target`, et elle est atteinte |
| 6 | `brassd` est actif et activé |
| 7 | Le collecteur des capteurs est actif, sans retarder le démarrage |
| 8 | Le rapport d’incident explique les causes |

## Règles du jeu

- Pas de restauration d’instantané pour « réparer » : l’instantané est ton filet de sécurité, pas la solution.
- **Lis les messages** à l’écran, puis le journal : `journalctl -xb`, `journalctl -b -1 -p err`,
  `systemctl --failed`. Note ce que tu trouves au fur et à mesure : c’est ton rapport.
- Il y a **quatre** causes, qui se cachent les unes derrière les autres. Si tu n’en corriges qu’une à la fois,
  il te faudra plusieurs redémarrages. Un vrai administrateur cherche **tout** avant de redémarrer.
- Ce lab existe aussi sur `fut` : les commandes du chargeur de démarrage y sont différentes (fiche 5.4).

## Coincé ?

- `lab hint 03 1`, puis `2`, puis `3` (ou [indices.md](indices.md), lisible depuis ton ordinateur pendant que la VM est en panne).
- La solution commentée : `lab solution 03` ou [solution.md](solution.md).
- Tout recommencer : restaure l’instantané `avant-lab03`, ou `lab reset 03` puis `lab start 03`.
