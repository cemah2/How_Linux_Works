# Lab 11 : compiler et installer depuis les sources

> **Chapitres** : 15 et 16 (compilation, bibliothèques partagées, make, configure, pkg-config, patch)
> **Durée** : 1 h 30 à 2 h · **VM** : `cuve` (fonctionne aussi sur `fut`)
> **Prérequis** : fiches 15.1 à 15.4 et 15.A, 16.1 à 16.5

## Le ticket

> **Ticket #1104**, ouvert par Bastien Roux (maître brasseur), priorité normale
>
> Salut,
>
> Notre outil de calcul des cuves, **jaugeur**, passe en version **2.1**, et il s’appuie maintenant sur notre
> petite bibliothèque maison **libdensite 1.0**. Rien de tout ça n’est dans les dépôts : les archives sont
> dans `/usr/local/src`, avec un **correctif de sécurité** publié hier pour jaugeur et le fichier
> `SHA256SUMS`. Ce que j’aimerais :
>
> 1. **Vérifie** les archives, puis déballe-les dans `/usr/local/src`.
> 2. Installe **libdensite 1.0** dans **`/opt/densite`** (elle n’a pas de configure : lis son README).
> 3. Fais en sorte que **tous les programmes** trouvent `libdensite.so.1` dans `/opt/densite/lib`, de façon
>    permanente et propre, par la configuration du chargeur dynamique.
> 4. Applique le **correctif de sécurité** à jaugeur **avant** de le construire.
> 5. Construis **jaugeur** pour **`/usr/local`**, fais passer ses tests (`make check`), puis installe-le
>    (programme et page de manuel).
>
> Ah, et il y a deux ans j’avais bricolé un truc dans `/etc/profile.d` pour l’ancien jaugeur, avec une
> vieille libdensite 0.9 dans `/opt/vieux-densite`. Je ne sais plus trop ce que ça fait. Je te laisse juger.
>
> Bastien
>
> PS : la chaîne de compilation (gcc, make, pkg-config, patch) est installée. Pour le reste, à toi de voir
> ce qui manque.

## Démarrer

```
$ lab start 11
```

Le script dépose les archives et le correctif dans `/usr/local/src`, compile la
vieille libdensite 0.9 de Bastien et recrée son réglage dans `/etc/profile.d`.

**Important** : après `lab start 11`, **ouvre une nouvelle session** (déconnexion puis reconnexion SSH) pour
que ton shell lise `/etc/profile.d` comme le ferait celui de n’importe quel utilisateur.

## Ce qui est vérifié

| # | Objectif |
|---|---|
| 1 | Les en-têtes de zlib sont installés |
| 2 | Les deux archives sont déballées dans `/usr/local/src` |
| 3 | libdensite 1.0 dans `/opt/densite` : `lib/libdensite.so.1`, `include/densite.h`, `lib/pkgconfig/densite.pc` correct ; rien dans `/usr/local/lib` |
| 4 | Un fichier de `/etc/ld.so.conf.d/` et le cache (`ldconfig -p`) donnent `/opt/densite/lib/libdensite.so.1` |
| 5 | Plus aucun `LD_LIBRARY_PATH` global (fichiers de démarrage, shell de connexion de Léa) |
| 6 | Le correctif est appliqué (`src/jaugeur.c`, version 2.1-p1, pas de `.rej`) |
| 7 | jaugeur configuré pour `/usr/local`, construit après le correctif, `make check` réussi |
| 8 | `/usr/local/bin/jaugeur` et sa page de manuel ; pour Léa, `jaugeur --version` affiche 2.1-p1 et libdensite 1.0 |
| 9 | Calcul juste, relevé `.csv.gz` lu, et pas de plantage sur un nom de cuve de 500 caractères |

## Règles du jeu

- Construis en **utilisateur normal** dans une copie si tu préfères, mais le ticket demande les sources dans
  `/usr/local/src` : `sudo` pour y écrire, ou `sudo chown` le temps du travail.
- **Toujours** `make -n install` avant `make install`.
- Lis les messages : configure et make disent presque toujours ce qui manque. `config.log` en dit plus.
- `lab check 11` à volonté ; `lab hint 11 1` (puis 2, 3) si tu bloques.

## Pour aller plus loin

- Reconstruis jaugeur avec `-Wl,-rpath=/opt/densite/lib` (par `LDFLAGS`) et compare `readelf -d` : quelle
  différence avec la méthode `ld.so.conf.d` ? Laquelle préférer pour un logiciel livré dans `/opt` ?
- Fais une installation à blanc (`make DESTDIR=/tmp/stage install`) et liste ce qui serait installé.
- Compile la version **non corrigée** dans un autre répertoire et lance-la sur le relevé piégé : observe le
  message (`stack smashing detected` ou `Segmentation fault`), puis `dmesg | tail`.
