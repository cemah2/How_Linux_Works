# Lab 00 : monter ton labo sur Proxmox

> **Chapitre** : 0 (mise en place) · **Durée** : 1 h · **VM** : `cuve` (Debian 13), `fut` (Rocky Linux 10)

## Le ticket

> **Ticket #100**, ouvert par Inès Garnier (gérante)
>
> Bienvenue à la brasserie ! Avant de toucher à quoi que ce soit en production, je veux que tu aies
> un environnement de test où tu peux tout casser sans risque. On a un serveur Proxmox qui ne sert à rien :
> il est à toi. Il me faut deux machines qui ressemblent à ce qu’on aura en production : une Debian
> et une Rocky Linux. Et je veux pouvoir revenir en arrière en deux minutes si tu fais une bêtise.

## Objectifs

À la fin du lab :

1. deux modèles cloud-init existent sur Proxmox (Debian 13 et Rocky Linux 10) ;
2. les VM `cuve` et `fut` tournent, avec ton utilisateur et ta clé SSH ;
3. tu te connectes depuis ton ordinateur avec `ssh cuve` et `ssh fut`, sans mot de passe ;
4. `lab check 00` est entièrement vert **sur les deux VM** ;
5. un instantané `propre` existe pour les deux VM.

## Prérequis

- Proxmox VE 8 ou 9, avec un accès root (console web ou SSH).
- Environ 40 Go libres sur le stockage des VM et 4 Gio de RAM disponibles.
- Un stockage qui accepte les **snippets** (fichiers cloud-init). Sur le stockage `local` :
  ```
  # pvesm set local --content iso,vztmpl,backup,snippets
  ```
  Vérifie avant avec `pvesm status --verbose` pour **conserver** les types de contenu déjà activés.
- Ta clé SSH publique (fiche 0.3) : `cat ~/.ssh/id_ed25519.pub` sur ton ordinateur.
- Les VM clonent le dépôt GitHub au premier démarrage. S’il est **privé**, crée un jeton GitHub en lecture
  seule limité à ce dépôt et renseigne-le dans `DEPOT` (voir le commentaire dans `lab.conf.exemple`).
  Pour cloner le dépôt sur l’hôte Proxmox lui-même, utilise ce même jeton : `git clone https://JETON@github.com/…`.

## Étapes

### 1. Récupérer les scripts sur l’hôte Proxmox

Dans le shell de l’hôte Proxmox (en root) :

```
# apt install -y git
# git clone https://github.com/cemah2/How_Linux_Works.git /root/how-linux-works
# cd /root/how-linux-works/infra/proxmox
```

### 2. Configurer

```
# cp lab.conf.exemple lab.conf
# nano lab.conf
```

Points à vérifier : `STOCKAGE` (`pvesm status`), `PONT` (souvent `vmbr0`), les identifiants de VM libres
(`qm list`), `MODE_IP`. Copie ta clé **publique** sur l’hôte, par exemple :

```
# nano /root/cle-labo.pub        # colle la ligne « ssh-ed25519 AAAA… », enregistre
```

Renseigne aussi `MOT_DE_PASSE` : il servira pour la console Proxmox, indispensable quand on cassera le
démarrage (Lab 03).

### 3. Créer les modèles

```
# ./creer-modeles.sh
```

Le script télécharge les images cloud officielles, vérifie leurs sommes de contrôle et crée deux modèles
(IDs 9013 et 9010 par défaut). Il prévient si ton processeur ne permet pas Rocky Linux 10 (AVX2 absent).

### 4. Déployer les VM

```
# ./deployer.sh base
```

Le script clone les modèles, configure cloud-init (utilisateur, clé, paquets, dépôt, commande `lab`),
démarre les VM et affiche leurs adresses IP au bout de quelques minutes, avec le bloc à copier dans
le fichier `~/.ssh/config` de **ton** ordinateur.

### 5. Se connecter et vérifier

Depuis ton ordinateur :

```
$ ssh cuve
admin@cuve:~$ lab check 00
```

Puis la même chose sur `fut`. Corrige chaque objectif rouge (les messages disent quoi faire), relance
`lab check 00` jusqu’à ce que tout soit vert.

### 6. Prendre l’instantané de référence

Sur l’hôte Proxmox :

```
# ./instantane.sh creer propre
# ./instantane.sh liste
```

À partir de maintenant, `./instantane.sh restaurer propre` remet les deux VM dans cet état en quelques secondes.

## Coincé ?

- Indices progressifs : `lab hint 00 1`, puis `2`, puis `3` (sur une VM), ou le fichier [indices.md](indices.md).
- Problèmes fréquents : voir la section « Dépannage » de [infra/proxmox/README.md](../../infra/proxmox/README.md).

## Pour aller plus loin

- Ouvre la console Proxmox d’une VM : tu vois le même système que par SSH, mais par « l’écran » de la machine.
- Regarde ce que cloud-init a reçu : `sudo cloud-init query userdata` et `sudo cat /var/log/cloud-init-output.log`.
- Compare `cat /etc/os-release` sur les deux VM.
