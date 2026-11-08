# Solution du Lab 11

## 1. Les en-têtes de zlib

Lancer `./configure` de jaugeur dès le début est le moyen le plus rapide de connaître les dépendances :

```
checking for zlib.h... no
configure: error: zlib.h introuvable : installe le paquet de développement de zlib …
```

```
$ sudo apt install apt-file && sudo apt-file update        # Debian
$ apt-file search zlib.h | grep /usr/include/zlib.h
zlib1g-dev: /usr/include/zlib.h
$ sudo apt install zlib1g-dev

$ dnf provides '*/zlib.h'                                 # Rocky
$ sudo dnf install zlib-devel
```

La bibliothèque elle-même (`libz.so.1`) était déjà là : ce qui manquait, ce sont l’**en-tête** et le lien
`libz.so` utilisés à la compilation, qui vivent dans le paquet **-dev / -devel** (fiches 15.3 et 16.5).

## 2. Vérifier et déballer

```
$ cd /usr/local/src
$ sha256sum -c SHA256SUMS
libdensite-1.0.tar.gz: OK
jaugeur-2.1.tar.gz: OK
jaugeur-2.1-securite.patch: OK
$ tar tzf libdensite-1.0.tar.gz        # tout est sous libdensite-1.0/ : on peut extraire
$ sudo tar xzf libdensite-1.0.tar.gz
$ sudo tar xzf jaugeur-2.1.tar.gz
```

## 3. libdensite dans /opt/densite

```
$ cd /usr/local/src/libdensite-1.0
$ sudo make PREFIX=/opt/densite
$ sudo make -n PREFIX=/opt/densite install       # tout va sous /opt/densite ? oui
$ sudo make PREFIX=/opt/densite install
$ ls -l /opt/densite/lib
libdensite.so -> libdensite.so.1
libdensite.so.1 -> libdensite.so.1.0
libdensite.so.1.0
pkgconfig/
```

**Piège** : le Makefile écrit PREFIX dans `densite.pc` au moment du `make`. Un `make` sans PREFIX suivi d’un
`make PREFIX=/opt/densite install` installe un `densite.pc` qui annonce `/usr/local` : jaugeur ne trouverait
ni l’en-tête ni la bibliothèque. Remède : `make clean`, puis tout refaire avec le même PREFIX.

Les trois noms de la bibliothèque (fiche 15.2) : `libdensite.so.1.0` est le vrai fichier ; `libdensite.so.1`
(le **soname**, inscrit dans les programmes) est celui que cherche ld.so au lancement ; `libdensite.so` sert
uniquement à l’édition de liens (`-ldensite`).

## 4. Le chargeur dynamique

```
$ echo /opt/densite/lib | sudo tee /etc/ld.so.conf.d/densite.conf
$ sudo ldconfig
$ ldconfig -p | grep densite
	libdensite.so.1 (libc6,x86-64) => /opt/densite/lib/libdensite.so.1
```

Tous les programmes, quel que soit l’utilisateur et quelle que soit la façon dont ils sont lancés (cron,
systemd, sudo…), trouvent désormais la bibliothèque. Alternative valable pour un logiciel livré dans
`/opt` : un **rpath** dans l’exécutable (`LDFLAGS=-Wl,-rpath=/opt/densite/lib`).

## 5. Le bricolage de Bastien

```
$ cat /etc/profile.d/bastien-densite.sh
export LD_LIBRARY_PATH=/opt/vieux-densite/lib
```

Ce fichier impose à **tous les shells de connexion** de chercher les bibliothèques d’abord dans
`/opt/vieux-densite/lib`, **avant** le cache de ldconfig. Résultat : le nouveau jaugeur chargerait
libdensite **0.9** (même soname `libdensite.so.1`), qui calcule faux, et `make check` échouerait :

```
$ ldd ./jaugeur | grep densite
	libdensite.so.1 => /opt/vieux-densite/lib/libdensite.so.1
$ ./jaugeur --version
jaugeur 2.1-p1 (libdensite 0.9, zlib 1.3.1)
```

C’est exactement le travers que dénonce le livre (§15.1.3) : ne jamais définir LD_LIBRARY_PATH de façon
globale. Si un vieux programme en avait vraiment besoin, un **script enveloppe** la définirait pour lui seul.

```
$ sudo rm /etc/profile.d/bastien-densite.sh
$ unset LD_LIBRARY_PATH          # ou : se déconnecter et se reconnecter
```

(On peut garder `/opt/vieux-densite` : sans LD_LIBRARY_PATH, plus personne ne la charge.)

## 6. Le correctif

```
$ head -20 /usr/local/src/jaugeur-2.1-securite.patch
--- a/src/jaugeur.c
+++ b/src/jaugeur.c
```

Les chemins commencent par `a/` et `b/` (format de git) : depuis la racine des sources, on retire ce premier
élément avec `-p1`.

```
$ cd /usr/local/src/jaugeur-2.1
$ sudo patch -p1 --dry-run < ../jaugeur-2.1-securite.patch
checking file src/jaugeur.c
$ sudo patch -p1 < ../jaugeur-2.1-securite.patch
patching file src/jaugeur.c
```

Le défaut corrigé : `sscanf("%[^;]", cuve)` copiait un nom de cuve de **n’importe quelle longueur** dans un
tableau de 16 octets. `%15[^;]` limite la lecture. Un relevé piégé suffisait à faire planter jaugeur (et, en
théorie, à exécuter du code).

## 7. Configurer, construire, tester

```
$ sudo env PKG_CONFIG_PATH=/opt/densite/lib/pkgconfig ./configure --prefix=/usr/local
checking for densite... yes (1.0)
checking for zlib.h... yes
config.status: creating Makefile
$ sudo make
cc -I/opt/densite/include -O2 -Wall -c -o src/jaugeur.o src/jaugeur.c
cc -o jaugeur src/jaugeur.o -L/opt/densite/lib -ldensite -lz
$ sudo make check
RÉSULTAT : OK
```

Sans PKG_CONFIG_PATH, configure s’arrête : pkg-config ne regarde pas dans `/opt/densite/lib/pkgconfig`.
`config.log` montre la commande exacte et la réponse de pkg-config.

## 8. Installer et vérifier

```
$ sudo make -n install
install -d /usr/local/bin /usr/local/share/man/man1
install -m 755 jaugeur /usr/local/bin/jaugeur
install -m 644 jaugeur.1 /usr/local/share/man/man1/jaugeur.1
$ sudo make install
$ jaugeur --version
jaugeur 2.1-p1 (libdensite 1.0, zlib 1.3.1)
$ ldd /usr/local/bin/jaugeur | grep -E 'densite|libz'
$ man jaugeur
$ jaugeur /usr/local/src/jaugeur-2.1/tests/exemple.csv
```

## Ce qu’il faut retenir

| Étape | Outil | Erreur typique |
|---|---|---|
| compilation | en-têtes, `-I`, paquet -dev | `zlib.h: No such file or directory` |
| configuration | pkg-config, `PKG_CONFIG_PATH`, `config.log` | `densite introuvable par pkg-config` |
| édition de liens | `-L`, `-l` | `undefined reference to …` |
| lancement | ld.so, `ld.so.conf.d` + `ldconfig`, rpath | `error while loading shared libraries` |
| lancement (piège) | LD_LIBRARY_PATH global | la **mauvaise** version est chargée, sans aucune erreur |
