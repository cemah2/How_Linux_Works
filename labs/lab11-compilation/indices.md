# Indices du Lab 11

## Niveau 1

1. **zlib** : configure de jaugeur te dira ce qui manque. Un en-tête `.h` vient d’un paquet de
   **développement** ; comment trouver lequel (fiche 16.5) ?
2. **Vérifier, déballer** : `sha256sum` sait vérifier une liste d’empreintes ; `tar` sait lister avant
   d’extraire (fiche 16.1).
3. **libdensite** : pas de configure, mais un Makefile réglable par une variable. Lis le README : il contient
   un avertissement important.
4. **Le chargeur** : comment ld.so trouve-t-il les bibliothèques, et quelle commande met à jour son cache
   (fiche 15.2) ?
5. **Le bricolage de Bastien** : lis `/etc/profile.d/bastien-densite.sh`. Que fait cette variable, pour
   **quels** programmes, et vers **quelle** version de libdensite ? (Le livre a un avis très tranché.)
6. **Le correctif** : regarde l’en-tête du fichier `.patch` (les lignes `---` et `+++`) pour savoir d’où
   l’appliquer et avec quel `-p` (fiche 16.4).
7. **configure ne trouve pas densite** : où est `densite.pc`, et comment dire à pkg-config d’y regarder
   (fiche 16.3) ?
8. **make check échoue** alors que tout compile ? Compare les nombres, puis lance `ldd ./jaugeur` **dans ton
   shell** : quelle libdensite est chargée ?

## Niveau 2

1. `./configure` → « zlib.h introuvable ». Debian : `apt-file search zlib.h` (après
   `apt install apt-file && apt-file update`) → **zlib1g-dev**. Rocky : `dnf provides '*/zlib.h'` →
   **zlib-devel** (fourni par zlib-ng-compat-devel sur Rocky 10).
2. `cd /usr/local/src && sha256sum -c SHA256SUMS`, puis `tar tzf …` et `sudo tar xzf …` pour chaque archive.
3. `make PREFIX=/opt/densite`, `make -n PREFIX=/opt/densite install`, `sudo make PREFIX=/opt/densite install`.
   Si tu as d’abord lancé `make` **sans** PREFIX, `densite.pc` contient `prefix=/usr/local` : `make clean`
   puis recommence avec le bon PREFIX.
4. Un fichier `/etc/ld.so.conf.d/densite.conf` contenant `/opt/densite/lib`, puis `sudo ldconfig` ;
   vérifie avec `ldconfig -p | grep densite`.
5. `LD_LIBRARY_PATH=/opt/vieux-densite/lib` est **prioritaire** sur le cache : tous les utilisateurs chargent
   la **0.9**, qui calcule faux, même avec un jaugeur tout neuf. Supprime ce fichier, puis ouvre une nouvelle
   session (ou `unset LD_LIBRARY_PATH`).
6. Les chemins commencent par `a/src/…` et `b/src/…` : place-toi dans `/usr/local/src/jaugeur-2.1` et utilise
   `patch -p1` (d’abord avec `--dry-run`).
7. `PKG_CONFIG_PATH=/opt/densite/lib/pkgconfig ./configure --prefix=/usr/local`. Si configure échoue, lis la
   fin de `config.log`.
8. Avec l’ancien LD_LIBRARY_PATH, `ldd ./jaugeur` montre `/opt/vieux-densite/lib/libdensite.so.1` : voir le
   point 5. Sans configuration du chargeur, `./jaugeur` ne démarre pas du tout (« error while loading shared
   libraries ») : voir le point 4.

## Niveau 3

L’ordre qui évite les impasses :

```
sudo apt install zlib1g-dev                       # Rocky : sudo dnf install zlib-devel
cd /usr/local/src && sha256sum -c SHA256SUMS
sudo tar xzf libdensite-1.0.tar.gz && sudo tar xzf jaugeur-2.1.tar.gz
cd libdensite-1.0 && sudo make PREFIX=/opt/densite && sudo make PREFIX=/opt/densite install
echo /opt/densite/lib | sudo tee /etc/ld.so.conf.d/densite.conf && sudo ldconfig
sudo rm /etc/profile.d/bastien-densite.sh && unset LD_LIBRARY_PATH
cd ../jaugeur-2.1 && sudo patch -p1 < ../jaugeur-2.1-securite.patch
sudo env PKG_CONFIG_PATH=/opt/densite/lib/pkgconfig ./configure --prefix=/usr/local
sudo make && sudo make check && sudo make -n install && sudo make install
```

Le détail et les explications sont dans `solution.md` (`lab solution 11`).
