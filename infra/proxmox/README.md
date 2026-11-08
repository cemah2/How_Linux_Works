# Infrastructure du labo sur Proxmox VE

Scripts à lancer **en root sur l’hôte Proxmox** (testés pour Proxmox VE 8 et 9). Ils créent et pilotent les
machines virtuelles de la Brasserie du Noyau à partir des images cloud officielles.

| Script | Rôle |
|---|---|
| `creer-modeles.sh` | télécharge Debian 13 et Rocky Linux 10 (images cloud), vérifie les sommes de contrôle, crée deux modèles cloud-init |
| `deployer.sh base` | clone les modèles en `cuve` (Debian) et `fut` (Rocky), injecte ton utilisateur, ta clé SSH, les paquets, le dépôt et la commande `lab` |
| `deployer.sh reseau` | crée le pont isolé, `douane` (routeur à deux cartes) et `comptoir` (poste du réseau interne), et ajoute une carte interne à `cuve` (Labs 07, 08, 10) |
| `instantane.sh` | `creer`, `restaurer`, `liste`, `supprimer` des instantanés sur **toutes** les VM du labo |
| `ajouter-disques.sh` | ajoute à chaud des disques vierges à une VM (Lab 02) ; `--retirer` les détruit |
| `detruire.sh` | supprime les VM du labo (`--modeles` : les modèles aussi) |
| `lab.conf.exemple` | paramètres à copier en `lab.conf` |
| `snippets/` | données cloud-init « vendor » (paquets, clonage du dépôt) |

Le pas à pas complet est dans le [Lab 00](../../labs/lab00-mise-en-place/README.md).

## Démarrage rapide

```
# git clone https://github.com/cemah2/How_Linux_Works.git /root/how-linux-works
# cd /root/how-linux-works/infra/proxmox
# cp lab.conf.exemple lab.conf && nano lab.conf
# ./creer-modeles.sh
# ./deployer.sh base
# ./instantane.sh creer propre
```

## Ce que font les scripts, en détail

- Les VM et modèles du labo sont repérés par des **étiquettes** Proxmox : `hlw` pour les VM, `hlwmodele` pour les modèles.
  Les scripts ne touchent jamais à une VM qui ne porte pas ces étiquettes.
- Les images sont stockées dans `REPERTOIRE_IMAGES` et ne sont téléchargées qu’une fois.
- Les modèles utilisent le type de CPU `host` (obligatoire pour Rocky Linux 10, qui exige x86-64-v3), un contrôleur
  virtio-scsi, un disque redimensionné à `TAILLE_DISQUE`, un lecteur cloud-init, une console série et l’agent invité QEMU.
- `deployer.sh` dépose les snippets cloud-init dans le stockage `STOCKAGE_SNIPPETS`, clone les modèles (liés ou complets
  selon `CLONES_LIES`), règle cloud-init (`ciuser`, `sshkeys`, `ipconfig0`, `cicustom vendor=…`), démarre les VM, puis attend
  que l’agent invité remonte leur adresse IP.
- Au premier démarrage, cloud-init installe les outils (git, vim, man, strace, lsof…), clone ce dépôt dans
  `/opt/how-linux-works` et crée le lien `/usr/local/bin/lab`.

## Disques supplémentaires (Lab 02)

```
# ./ajouter-disques.sh cuve            # 2 disques de 2 Go sur le contrôleur SCSI, VM allumée ou non
# ./ajouter-disques.sh fut 3 4         # 3 disques de 4 Go
# ./ajouter-disques.sh cuve --retirer  # après « lab reset 02 » dans la VM
```

Les disques portent le numéro de série `hlw-lab-N` (visible dans la VM avec `lsblk -o NAME,SERIAL`) : le Lab 02 les
reconnaît ainsi, et `--retirer` ne détruit qu’eux. Si tu restaures un instantané pris **avant** leur ajout, vérifie
l’onglet « Matériel » de la VM : les disques peuvent y apparaître comme inutilisés. Relance alors le script, ou
supprime-les depuis l’interface.

## Réseau

Par défaut les VM sont sur `vmbr0` en DHCP, comme n’importe quelle machine de ton réseau local. Pour des adresses fixes :
`MODE_IP="statique"` et les variables `IP_*`, `PASSERELLE`, `DNS`.

### Le scénario « reseau » (Labs 07, 08 et 10)

```
# ./deployer.sh reseau
# ./instantane.sh creer avant-lab07
```

```
            ton réseau (vmbr0, Internet)
        ┌──────────┬──────────────┐
      eth0       eth0           eth0
     [cuve]    [douane]         [fut]
      ens19      eth1
        │          │                      pont isolé PONT_LAB (vmbr9 par défaut) :
        └──────────┴──────── eth0 ──      aucune carte physique, rien ne sort
                          [comptoir]      sauf à travers douane
```

Ce que fait le script :

1. crée le pont `PONT_LAB` s’il n’existe pas (`pvesh create /nodes/…/network --type bridge`, sans port physique) ;
2. clone **douane** (Debian) avec une seconde carte sur le pont, laissée sans adresse (c’est le Lab 07) ;
3. clone **comptoir** (Rocky) **sur ton réseau** le temps que cloud-init installe ses paquets (snippet
   `hlw-comptoir.yaml`), puis passe son profil réseau en DHCP, désactive cloud-init, le bascule sur le pont et le
   redémarre : il n’aura d’adresse que quand douane fera DHCP ;
4. ajoute une seconde carte à **cuve** sur le pont, après avoir désactivé cloud-init dans cuve (sinon, au démarrage
   suivant, cloud-init la traiterait comme une nouvelle machine : nouvelles clés d’hôte SSH, cartes renommées).

Noms des cartes : cloud-init renomme les cartes décrites par Proxmox en `eth0`, `eth1`… La carte ajoutée après coup
à cuve garde le nom choisi par le noyau (souvent `ens19`). Vérifie toujours avec `ip -br link`.

Pour supprimer le pont plus tard : retire les cartes des VM qui l’utilisent, puis
`pvesh delete /nodes/$(hostname)/network/vmbr9 && pvesh set /nodes/$(hostname)/network`.

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `le stockage « local » n’accepte pas les snippets` | type de contenu non activé | `pvesm set local --content iso,vztmpl,backup,snippets` (garde les types déjà présents) |
| La VM Rocky redémarre en boucle ou affiche un *kernel panic* | CPU sans AVX2 exposé | `qm set 212 --cpu host` ; si l’hôte n’a pas AVX2, utilise Rocky 9 (modifie `URL_ROCKY` et `URL_SOMME_ROCKY`) |
| `adresse IP non obtenue` | cloud-init encore en cours, ou agent invité absent | attends, regarde la console de la VM ; `qm agent 211 ping` |
| `Permission denied (publickey)` en SSH | mauvaise clé dans `CLE_SSH` | la clé **publique** de ton ordinateur ; `qm set 211 --sshkeys /root/cle-labo.pub` puis `qm cloudinit update 211` et redémarrage |
| Le dépôt n’est pas dans la VM | dépôt privé ou pas d’Internet au premier démarrage | voir `lab hint 00 3` |
| `somme de contrôle incorrecte` | téléchargement interrompu | relance le script (le fichier fautif a été supprimé) |
| `lab start 02` : « il faut deux disques vierges » | disques pas encore ajoutés | `./ajouter-disques.sh cuve`, puis `lsblk` dans la VM |
| `deployer.sh reseau` : comptoir reste sur vmbr0 | préparation pas finie en 10 minutes | regarde sa console (`cloud-init status`), puis relance le script |
| Lab 03 : « Cannot open access to console, the root account is locked » | pas de mot de passe root avant la panne | restaure l’instantané `avant-lab03`, `sudo passwd root`, puis `lab panne 03` |

## Sans Proxmox ?

Les labs fonctionnent sur n’importe quelle VM Debian 13 ou Rocky Linux 10 (VirtualBox, UTM, Hyper-V, cloud) :

```
$ sudo git clone https://github.com/cemah2/How_Linux_Works.git /opt/how-linux-works
$ sudo ln -s /opt/how-linux-works/infra/bin/lab /usr/local/bin/lab
$ lab list
```

Nomme la VM `cuve` ou `fut` pour coller au fil rouge, et prends un instantané avec ton hyperviseur avant chaque lab.
