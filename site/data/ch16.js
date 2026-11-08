/* Chapitre 16 : Introduction to Compiling Software from C Source Code (livre p. 385–400). */
HLW.chapitre({
  id: '16',
  num: 16,
  intro: `
    Les dépôts de Debian et de Rocky couvrent l’essentiel, mais un jour il te faudra une version plus récente, une
    option de compilation particulière, ou un logiciel absent des dépôts. Ce chapitre suit la démarche classique :
    **déballer** l’archive, **configurer** (\`./configure\`), **construire** (\`make\`), **installer**
    (\`make install\`), en restant maître de l’endroit où les fichiers atterrissent.

    Tu y apprendras aussi à lire \`config.log\`, à utiliser **pkg-config**, à appliquer un **correctif** (patch) et
    à interpréter les erreurs de construction les plus courantes. Le Lab 11 te fera compiler un vrai outil pour la
    brasserie, sur cuve.
  `,
  objectifs: [
    'savoir quand compiler soi-même et quand préférer un paquet ;',
    'inspecter puis déballer une archive de sources sans mauvaise surprise ;',
    'enchaîner ./configure --prefix, make, make check, make -n install, make install ;',
    'passer des options et des variables (CPPFLAGS, LDFLAGS) à configure, lire config.log, utiliser pkg-config ;',
    'installer proprement (/usr/local, /opt, paquet) et appliquer un patch (-p0, -p1) ;',
    'diagnostiquer une construction qui échoue et trouver le paquet qui fournit un en-tête.',
  ],
  certifs: { lpic1: ['102.4', '102.5'], lfcs: ['OD'], rhcsa: ['R2'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '16.1',
      titre: 'Pourquoi compiler, et déballer une archive',
      sections: '§16.1 et 16.2', pages: '385–388',
      objectif: 'Peser le pour et le contre, puis ouvrir une archive de sources en sécurité.',
      rappel: `
        **Raisons de compiler** : choisir les options, la version, l’emplacement (plusieurs versions côte à côte),
        comprendre le logiciel. **Raisons de ne pas le faire** (§16.4) : pas de mises à jour de sécurité automatiques,
        du temps, des conflits avec les paquets. Pour tout ce qui est exposé au réseau, un paquet de la distribution
        est presque toujours préférable.

        Les étapes, avec le système **GNU autotools** que présente le livre :

        1. déballer l’archive ;
        2. configurer (\`./configure\`) ;
        3. construire (\`make\`) ;
        4. installer (\`make install\` ou un outil de paquet).

        ### Inspecter avant de déballer

        Les sources arrivent en \`.tar.gz\`, \`.tar.bz2\` ou \`.tar.xz\` (fiche 2.18). On **liste** d’abord :

        \`\`\`
        $ tar tvf jaugeur-1.4.tar.gz | head        # tout doit être sous jaugeur-1.4/
        $ tar xf jaugeur-1.4.tar.gz && cd jaugeur-1.4
        $ less README INSTALL
        \`\`\`

        - Si les fichiers ne sont **pas** dans un répertoire commun, crée-en un et déballe dedans (sinon ton
          répertoire courant est envahi).
        - Des chemins **absolus** (\`/etc/passwd\`) dans l’archive : supprime-la, c’est probablement malveillant.
        - Vérifie l’intégrité et l’origine : \`sha256sum\`, signature \`gpg --verify\` si fournie.

        Dans le répertoire : **README** et **INSTALL** d’abord ; des fichiers de construction (\`configure\`,
        \`Makefile.in\`, \`CMakeLists.txt\`, \`meson.build\`), des sources (\`.c\`, \`.h\`), de la documentation.
      `,
      aRetenir: [
        'Compiler : options, version, emplacement ; inconvénient majeur : pas de mises à jour de sécurité automatiques.',
        'Étapes : déballer, configurer, construire, installer.',
        '`tar tvf` avant `tar xf` ; répertoire commun ; pas de chemins absolus ; sha256sum / gpg.',
        'Lire README et INSTALL.',
      ],
      exercices: [
        {
          id: 'c16-01-01', type: 'commande', niveau: 1, ref: '§16.2, p. 386',
          enonce: 'Avant de déballer `jaugeur-1.4.tar.gz`, liste son contenu (en détail) sans rien extraire.',
          accepte: ['tar (-)?t[zv]*f jaugeur-1\\.4\\.tar\\.gz( \\| (less|head).*)?', 'tar (-)?[zv]*t[zv]*f jaugeur-1\\.4\\.tar\\.gz( \\| (less|head).*)?', 'tar --list (-v )?-f jaugeur-1\\.4\\.tar\\.gz'],
          exemple: 'tar tvf jaugeur-1.4.tar.gz',
          pieges: [{ motif: 'tar (-)?x.*', message: 'x extrait : on veut seulement lister (t).' }],
          indices: ['tar a un mode « table des matières ».', 't = list, v = détaillé, f = fichier.', '`tar tvf jaugeur-1.4.tar.gz`'],
          solution: '```\n$ tar tvf jaugeur-1.4.tar.gz | head\n```\nGNU tar détecte la compression tout seul ; `tar ztvf` force gzip.',
        },
        {
          id: 'c16-01-02', type: 'qcm', niveau: 2, ref: '§16.2, p. 387',
          enonce: '`tar tvf outil.tar.gz` affiche `/etc/cron.d/maj` et `/usr/bin/sudo`. Que fais-tu ?',
          choix: ['Je supprime l’archive : des chemins absolus vers des fichiers système sont très suspects', 'Je l’extrais en root pour que les chemins soient respectés', 'Je l’extrais dans /tmp', 'Je la renomme en .tgz'],
          reponse: 0,
          indices: ['Une archive de sources a des chemins relatifs.', 'Ces fichiers remplaceraient des fichiers du système.', 'Cheval de Troie probable.'],
          solution: 'Une archive de sources honnête ne contient que des chemins relatifs sous un répertoire commun. Celle-ci pourrait écraser des fichiers système : supprime-la et signale-la.',
        },
        {
          id: 'c16-01-03', type: 'vrai-faux', niveau: 2, ref: '§16.1, §16.4',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un logiciel compilé à la main reçoit les mises à jour de sécurité avec `apt upgrade`.', vrai: false },
            { texte: 'Compiler soi-même permet d’installer deux versions d’un même logiciel côte à côte.', vrai: true },
            { texte: 'Pour un serveur exposé à Internet, le paquet de la distribution est en général le choix le plus sûr.', vrai: true },
            { texte: 'README et INSTALL donnent souvent les options et les dépendances nécessaires.', vrai: true },
          ],
          indices: ['apt ne connaît que ses paquets.', 'Une seule fausse.', 'Les correctifs de sécurité…'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
        {
          id: 'c16-01-04', type: 'commande', niveau: 1,
          enonce: 'Vérifie l’intégrité de l’archive avec le fichier d’empreintes `SHA256SUMS` fourni par le projet.',
          accepte: ['sha256sum( (-c|--check|--ignore-missing|--quiet))+ SHA256SUMS( --ignore-missing)?'],
          exemple: 'sha256sum -c SHA256SUMS',
          indices: ['L’outil d’empreinte SHA-256.', 'Une option vérifie au lieu de calculer.', '`sha256sum -c SHA256SUMS`'],
          solution: '```\n$ sha256sum -c --ignore-missing SHA256SUMS\njaugeur-1.4.tar.gz: OK\n```\nL’empreinte prouve l’intégrité ; une signature GPG (`gpg --verify`) prouve en plus l’origine.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '16.2',
      titre: 'GNU Autoconf : configure, make, make install',
      sections: '§16.3 à 16.3.2', pages: '388–390',
      objectif: 'Construire et installer un logiciel autotools dans un emplacement que tu choisis.',
      rappel: `
        Un paquet autotools fournit \`configure\`, \`Makefile.in\` et souvent \`config.h.in\`. Les \`.in\` sont des
        **modèles** : \`configure\` examine ton système (compilateur, bibliothèques, en-têtes) et génère les vrais
        \`Makefile\`.

        \`\`\`
        $ ./configure --prefix=$HOME/outils      # emplacement d'installation (défaut : /usr/local)
        $ make                                   # construire (make -j"$(nproc)" pour aller plus vite)
        $ make check                             # tests fournis, s'il y en a
        $ make -n install                        # vérifier OÙ tout sera copié
        $ make install                           # installer (sudo seulement si le préfixe l'exige)
        \`\`\`

        Le livre propose de s’entraîner avec **GNU coreutils** installé dans ton répertoire personnel : sans risque
        pour le système, et supprimable d’un \`rm -r\`.

        Après installation : \`$HOME/outils/bin\`, \`share\`, \`lib\`… Ajoute \`bin\` à ton PATH (fiche 13.1) pour
        l’utiliser.

        ### En faire un paquet

        Un \`make install\` éparpille des fichiers que le gestionnaire de paquets ignore. Pour pouvoir désinstaller
        proprement :

        - Debian : \`checkinstall make install\` crée et installe un \`.deb\` (outil peu maintenu, pas toujours dans
          les dépôts) ;
        - Rocky : \`rpmdev-setuptree\` puis \`rpmbuild\` avec un fichier \`.spec\` (plus long, mais c’est la méthode
          propre).
        - Méthode générale : installer dans un répertoire temporaire avec **\`make DESTDIR=/tmp/stage install\`**, puis
          inspecter ou empaqueter (fiche 16.A).
      `,
      aRetenir: [
        'configure transforme les modèles .in en Makefile adaptés au système.',
        '`./configure --prefix=…` → `make` → `make check` → `make -n install` → `make install`.',
        'Préfixe par défaut /usr/local ; `--prefix=$HOME/x` pour tester sans root.',
        'Paquet : checkinstall (Debian), rpmbuild (Rocky) ; DESTDIR pour une installation à blanc.',
      ],
      exercices: [
        {
          id: 'c16-02-01', type: 'ordre', niveau: 1, ref: '§16.3.1, p. 389',
          enonce: 'Remets dans l’ordre la construction d’un logiciel autotools dans ton répertoire personnel.',
          elements: ['tar xf jaugeur-1.4.tar.gz && cd jaugeur-1.4', './configure --prefix=$HOME/outils', 'make', 'make check', 'make -n install', 'make install'],
          indices: ['Déballer, configurer, construire.', 'Tester avant d’installer.', 'Simuler l’installation avant de la faire.'],
          solution: 'Déballer → `./configure --prefix=…` → `make` → `make check` → `make -n install` → `make install`.',
        },
        {
          id: 'c16-02-02', type: 'commande', niveau: 1, ref: '§16.3.1, p. 389',
          enonce: 'Configure le logiciel pour qu’il s’installe dans `/opt/jaugeur`.',
          accepte: ['\\./configure --prefix=/opt/jaugeur/?', '\\./configure --prefix /opt/jaugeur/?', '\\./configure --prefix="/opt/jaugeur/?"'],
          exemple: './configure --prefix=/opt/jaugeur',
          pieges: [{ motif: 'configure.*', message: 'Le script est dans le répertoire courant : ./configure.' }],
          indices: ['Le script de configuration est dans le répertoire courant.', 'Option de préfixe.', '`./configure --prefix=/opt/jaugeur`'],
          solution: '```\n$ ./configure --prefix=/opt/jaugeur\n```\nLes programmes iront dans /opt/jaugeur/bin, les pages de manuel dans /opt/jaugeur/share/man…',
        },
        {
          id: 'c16-02-03', type: 'qcm', niveau: 2, ref: '§16.3',
          enonce: 'Sans option `--prefix`, où un logiciel autotools s’installe-t-il ?',
          choix: ['Sous /usr/local (bin, lib, share…)', 'Sous /usr', 'Dans le répertoire des sources', 'Sous /opt/nom-du-logiciel'],
          reponse: 0,
          indices: ['Le préfixe par défaut évite les fichiers des paquets.', 'local = installé localement par l’administrateur.', '/usr/local.'],
          solution: '**/usr/local** : les paquets de la distribution n’y touchent pas, et les mises à niveau du système l’ignorent.',
        },
        {
          id: 'c16-02-04', type: 'commande', niveau: 2, ref: '§16.3.2',
          enonce: 'Installe le logiciel construit dans le répertoire temporaire `/tmp/stage` (installation « à blanc », pour inspecter les fichiers), sans toucher au système.',
          accepte: ['make DESTDIR=/tmp/stage/? install', 'make install DESTDIR=/tmp/stage/?', 'DESTDIR=/tmp/stage/? make install', 'make DESTDIR="/tmp/stage/?" install', 'make install DESTDIR="/tmp/stage/?"'],
          exemple: 'make DESTDIR=/tmp/stage install',
          pieges: [{ motif: '.*--prefix.*', message: 'Changer le préfixe modifierait aussi les chemins compilés dans le programme. DESTDIR ne change que l’endroit de copie.' }],
          indices: ['Une variable standard de make install.', 'Elle préfixe chaque chemin d’installation.', '`make DESTDIR=/tmp/stage install`'],
          solution: '```\n$ make DESTDIR=/tmp/stage install\n$ find /tmp/stage -type f\n/tmp/stage/usr/local/bin/jaugeur\n...\n```\nLe programme croit toujours être installé sous /usr/local : DESTDIR sert à inspecter ou à empaqueter.',
        },
        {
          id: 'c16-02-05', type: 'vrai-faux', niveau: 2, ref: '§16.3',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`Makefile.in` est un modèle à partir duquel configure génère le Makefile.', vrai: true },
            { texte: 'Avec `--prefix=$HOME/outils`, `make install` n’a pas besoin de sudo.', vrai: true },
            { texte: 'Un `make install` est suivi par dpkg ou rpm, qui pourront le désinstaller.', vrai: false, explication: 'Ils ne le voient pas, d’où checkinstall, rpmbuild ou DESTDIR.' },
            { texte: '`make check` lance les tests fournis par le projet.', vrai: true },
          ],
          indices: ['.in = modèle.', 'Une seule fausse.', 'Le gestionnaire de paquets ne connaît que ce qu’il installe.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '16.3',
      titre: 'Options de configure, variables, config.log et pkg-config',
      sections: '§16.3.3 à 16.3.7', pages: '390–394',
      objectif: 'Influencer configure, comprendre pourquoi il échoue, et trouver les options d’une bibliothèque.',
      rappel: `
        ### Options

        \`./configure --help\` liste tout (souvent très long). Les plus courantes : \`--prefix\`,
        \`--bindir=…\`, \`--disable-xxx\` / \`--enable-xxx\`, \`--with-xxx=répertoire\` (où trouver une dépendance).
        On peut aussi construire **hors des sources** : créer \`build/\`, y aller et lancer \`../configure\`.

        ### Variables d’environnement

        \`\`\`
        $ CPPFLAGS=-I/opt/maison/include LDFLAGS=-L/opt/maison/lib ./configure
        $ ./configure CPPFLAGS=-DDEBUG                      # équivalent, en option
        $ LDFLAGS="-L/opt/maison/lib -Wl,-rpath=/opt/maison/lib" ./configure
        \`\`\`

        Pour un répertoire d’en-têtes, utilise **CPPFLAGS** (pas CFLAGS) : configure lance parfois le préprocesseur
        seul. Une faute de frappe (\`CPPFLAGS=Iinclude\`, sans tiret) produit
        \`configure: error: C compiler cannot create executables\`.

        ### config.log

        Quand configure échoue, la cause est dans **\`config.log\`**. Le fichier est énorme : va **à la fin**
        (\`G\` dans less), puis remonte : la fin contient tout l’environnement, l’erreur est juste avant.
        Cherche aussi le dernier message \`checking …\` affiché à l’écran.

        ### Cibles autotools

        \`make clean\`, \`make distclean\` (efface aussi Makefile, config.h, config.log : retour à l’archive),
        \`make check\`, \`make install-strip\` (installe sans symboles de débogage).

        ### pkg-config

        Une bibliothèque installée publie ses options dans un fichier \`.pc\` (paquet **-dev**/**-devel**) :

        \`\`\`
        $ pkg-config --cflags --libs zlib          # -lz
        $ pkg-config --modversion openssl
        $ pkg-config --list-all | less
        $ PKG_CONFIG_PATH=/opt/maison/lib/pkgconfig ./configure    # .pc hors des emplacements standard
        \`\`\`
      `,
      aRetenir: [
        '`./configure --help` ; --prefix, --enable/--disable, --with-x=rép ; construction hors sources (../configure).',
        'CPPFLAGS (-I, -D), LDFLAGS (-L, -Wl,-rpath) devant ou après ./configure.',
        'Échec : config.log, à lire depuis la fin.',
        'distclean, check, install-strip ; `pkg-config --cflags --libs x`, PKG_CONFIG_PATH.',
      ],
      exercices: [
        {
          id: 'c16-03-01', type: 'commande', niveau: 2, ref: '§16.3.4, p. 391',
          enonce: 'Lance configure en lui indiquant les en-têtes dans `/opt/maison/include` et les bibliothèques dans `/opt/maison/lib`, par les variables d’environnement.',
          accepte: [
            'CPPFLAGS="?-I ?/opt/maison/include"? LDFLAGS="?-L ?/opt/maison/lib"? \\./configure.*',
            'LDFLAGS="?-L ?/opt/maison/lib"? CPPFLAGS="?-I ?/opt/maison/include"? \\./configure.*',
            '\\./configure CPPFLAGS="?-I ?/opt/maison/include"? LDFLAGS="?-L ?/opt/maison/lib"?',
            '\\./configure LDFLAGS="?-L ?/opt/maison/lib"? CPPFLAGS="?-I ?/opt/maison/include"?',
          ],
          exemple: 'CPPFLAGS=-I/opt/maison/include LDFLAGS=-L/opt/maison/lib ./configure',
          pieges: [{ motif: 'CFLAGS=.*', message: 'Pour un répertoire d’en-têtes, utilise CPPFLAGS : configure lance parfois le préprocesseur seul.' }],
          indices: ['Une variable pour le préprocesseur, une pour l’édition de liens.', 'CPPFLAGS et LDFLAGS.', '`CPPFLAGS=-I/opt/maison/include LDFLAGS=-L/opt/maison/lib ./configure`'],
          solution: '```\n$ CPPFLAGS=-I/opt/maison/include LDFLAGS=-L/opt/maison/lib ./configure\n```\nAjoute `-Wl,-rpath=/opt/maison/lib` à LDFLAGS pour que le programme trouve la bibliothèque au lancement.',
        },
        {
          id: 'c16-03-02', type: 'qcm', niveau: 2, ref: '§16.3.4–16.3.6, p. 392',
          enonce: 'configure s’arrête sur `configure: error: C compiler cannot create executables`. gcc est bien installé. Que regardes-tu en premier ?',
          choix: [
            'La fin de config.log, puis en remontant, pour voir la commande de test qui a échoué (par exemple une variable CPPFLAGS mal écrite)',
            'Le fichier README',
            'La sortie de dmesg',
            'Je réinstalle gcc sans chercher',
          ],
          reponse: 0,
          indices: ['configure garde une trace détaillée de chaque test.', 'Le fichier se termine par l’environnement complet.', 'config.log.'],
          solution: 'Dans `config.log`, juste avant le dump de l’environnement, tu verras la commande exacte (par exemple `gcc Iinclude conftest.c`) et son erreur. Souvent : une variable CPPFLAGS/LDFLAGS fautive.',
        },
        {
          id: 'c16-03-03', type: 'commande', niveau: 1, ref: '§16.3.7, p. 393',
          enonce: 'Affiche les options d’édition de liens nécessaires pour utiliser la bibliothèque `zlib`.',
          accepte: ['pkg-config --libs zlib', 'pkg-config --cflags --libs zlib', 'pkg-config --libs --cflags zlib', 'pkgconf --libs zlib'],
          exemple: 'pkg-config --libs zlib',
          indices: ['L’outil qui lit les fichiers .pc.', 'Une option pour les bibliothèques.', '`pkg-config --libs zlib`'],
          solution: '```\n$ pkg-config --libs zlib\n-lz\n```\nSi rien n’est trouvé : installe `zlib1g-dev` (Debian) ou `zlib-devel` (Rocky).',
        },
        {
          id: 'c16-03-04', type: 'association', niveau: 2, ref: '§16.3.3–16.3.5',
          enonce: 'Associe chaque commande à son effet.',
          paires: [
            ['`./configure --help`', 'Lister les options de configuration'],
            ['`make distclean`', 'Revenir à l’état de l’archive (supprime Makefile, config.log…)'],
            ['`make install-strip`', 'Installer sans les symboles de débogage'],
            ['`./configure --disable-nls`', 'Désactiver une fonctionnalité optionnelle'],
          ],
          indices: ['help aide.', 'dist = distribution d’origine.', 'strip retire les symboles.'],
          solution: '--help options, distclean retour à l’archive, install-strip sans symboles, --disable-x désactive.',
        },
        {
          id: 'c16-03-05', type: 'qcm', niveau: 3, ref: '§16.3.7, p. 394',
          enonce: 'Tu as compilé ta propre bibliothèque dans `/opt/maison` ; son fichier est `/opt/maison/lib/pkgconfig/maison.pc`. Le configure d’un autre logiciel répond « Package maison was not found ». Que faire ?',
          choix: [
            'Lancer configure avec PKG_CONFIG_PATH=/opt/maison/lib/pkgconfig',
            'Copier maison.pc dans /etc',
            'Lancer ldconfig',
            'Ajouter /opt/maison/lib à PATH',
          ],
          reponse: 0,
          indices: ['pkg-config ne cherche que dans ses répertoires standard.', 'Une variable lui en ajoute.', 'PKG_CONFIG_PATH.'],
          solution: '```\n$ PKG_CONFIG_PATH=/opt/maison/lib/pkgconfig ./configure\n```\n(Ou un lien du .pc vers le répertoire pkgconfig standard.) ldconfig concerne le lancement des programmes, pas leur construction.',
        },
        {
          id: 'c16-03-06', type: 'vrai-faux', niveau: 2, ref: '§16.3',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`CPPFLAGS=Iinclude ./configure` (tiret oublié) peut faire croire que le compilateur ne marche pas.', vrai: true },
            { texte: 'Les fichiers .pc d’une bibliothèque sont souvent dans son paquet de développement.', vrai: true },
            { texte: 'L’erreur d’un configure raté se trouve tout à la fin de config.log, sous l’environnement.', vrai: false, explication: 'La fin contient l’environnement : l’erreur est juste avant, il faut remonter.' },
            { texte: 'On peut construire hors du répertoire des sources en lançant ../configure depuis un répertoire build/.', vrai: true },
          ],
          indices: ['Un test de compilation échoue pour une mauvaise option.', 'Une seule fausse.', 'Que contient la toute fin de config.log ?'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '16.4',
      titre: 'Où installer, et appliquer un patch',
      sections: '§16.4 et 16.5', pages: '394–396',
      objectif: 'Choisir l’emplacement d’installation et appliquer un correctif au bon niveau.',
      rappel: `
        ### Où installer

        | Emplacement | Usage |
        |---|---|
        | \`/usr/local\` | défaut ; ignoré par les paquets et les mises à niveau ; peut devenir un fourre-tout |
        | \`/opt/logiciel\` (ou \`/opt/logiciel-1.4\`) | un répertoire par logiciel : facile à supprimer, plusieurs versions |
        | \`$HOME/…\` | essais sans root |
        | un **paquet** | la solution propre dès que le logiciel compte |

        N’installe **jamais** sous \`/usr\` (hors \`/usr/local\`) : tu écraserais des fichiers de paquets.

        ### Appliquer un patch

        Un **patch** (ou *diff*) décrit des modifications de fichiers. Son en-tête indique les chemins :

        \`\`\`
        --- src/lecture.c.orig
        +++ src/lecture.c
        @@ -2,16 +2,12 @@
        \`\`\`

        Place-toi dans le répertoire qui **contient** \`src\`, puis :

        \`\`\`
        $ patch -p0 --dry-run < correctif.patch     # essayer sans rien modifier
        $ patch -p0 < correctif.patch
        \`\`\`

        Si les chemins commencent par un répertoire de version (\`jaugeur-1.3/src/lecture.c\`) alors que tu es dans
        \`jaugeur-1.4\`, retire ce premier élément avec **\`-p1\`**. C’est le cas de presque tous les patchs générés
        par git (\`a/src/…\`, \`b/src/…\`). Si patch demande \`File to patch:\`, tu n’es pas au bon endroit (ou les
        sources ne correspondent pas). On fabrique un patch avec \`diff -u ancien nouveau\`.
      `,
      aRetenir: [
        '/usr/local (défaut), /opt/logiciel, $HOME, ou un paquet ; jamais /usr directement.',
        '`patch -pN < fichier` ; -p0 : chemins tels quels ; -p1 : retire le premier répertoire (a/, b/, jaugeur-1.3/).',
        '`--dry-run` d’abord ; « File to patch: » = mauvais répertoire.',
        '`diff -u ancien nouveau > x.patch`.',
      ],
      exercices: [
        {
          id: 'c16-04-01', type: 'commande', niveau: 2, ref: '§16.5, p. 396',
          enonce: 'Le patch `correctif.patch` contient `--- a/src/lecture.c` / `+++ b/src/lecture.c`. Tu es à la racine des sources (là où se trouve `src/`). Applique-le.',
          accepte: ['patch -p1 < ?correctif\\.patch', 'patch -p1 -i ?correctif\\.patch', 'patch -p 1 < ?correctif\\.patch', 'git apply correctif\\.patch'],
          exemple: 'patch -p1 < correctif.patch',
          pieges: [{ motif: 'patch -p0.*', message: 'Avec -p0, patch chercherait un répertoire a/src/ : retire le premier élément avec -p1.' }],
          indices: ['Les chemins commencent par a/ et b/.', 'Il faut retirer un élément de chemin.', '`patch -p1 < correctif.patch`'],
          solution: '```\n$ patch -p1 --dry-run < correctif.patch\n$ patch -p1 < correctif.patch\npatching file src/lecture.c\n```',
        },
        {
          id: 'c16-04-02', type: 'qcm', niveau: 2, ref: '§16.5, p. 396',
          enonce: 'En appliquant un patch, la commande demande `File to patch:`. Que signifie ce message le plus souvent ?',
          choix: [
            'Tu n’es pas dans le bon répertoire (ou le niveau -p est mauvais), patch ne trouve pas le fichier indiqué',
            'Le patch est corrompu',
            'patch attend que tu tapes le contenu du correctif',
            'Il faut être root',
          ],
          reponse: 0,
          indices: ['patch ne trouve pas un chemin.', 'Les chemins sont relatifs au répertoire courant, après retrait de N éléments.', 'Change de répertoire ou de -p.'],
          solution: 'patch ne trouve pas le fichier : mauvais répertoire, mauvais `-p`, ou sources qui ne correspondent pas à la version visée. Réponds Ctrl-C et corrige.',
        },
        {
          id: 'c16-04-03', type: 'commande', niveau: 2, ref: '§16.5',
          enonce: 'Fabrique un patch unifié `lecture.patch` décrivant les différences entre `lecture.c.orig` et `lecture.c`.',
          accepte: ['diff -u lecture\\.c\\.orig lecture\\.c > ?lecture\\.patch', 'diff -Naur lecture\\.c\\.orig lecture\\.c > ?lecture\\.patch', 'diff -u -- lecture\\.c\\.orig lecture\\.c > ?lecture\\.patch'],
          exemple: 'diff -u lecture.c.orig lecture.c > lecture.patch',
          indices: ['diff produit les patchs.', 'Format unifié : -u.', 'L’ancien d’abord, le nouveau ensuite.'],
          solution: '```\n$ diff -u lecture.c.orig lecture.c > lecture.patch\n```\nL’ordre compte : ancien puis nouveau.',
        },
        {
          id: 'c16-04-04', type: 'qcm', niveau: 2, ref: '§16.4.1, p. 395',
          enonce: 'Tu dois faire tourner deux versions de l’outil `jaugeur` (1.3 et 1.4) le temps d’une migration, et pouvoir supprimer l’ancienne facilement. Quel préfixe ?',
          choix: ['/opt/jaugeur-1.3 et /opt/jaugeur-1.4', '/usr/local pour les deux', '/usr pour la plus récente', '/tmp'],
          reponse: 0,
          indices: ['Un répertoire par version.', '/usr/local mélange tout.', '/opt.'],
          solution: 'Un préfixe par version sous /opt : chaque version est isolée et `rm -r /opt/jaugeur-1.3` la supprime entièrement.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '16.5',
      titre: 'Dépanner une construction',
      sections: '§16.6 et 16.7', pages: '396–399',
      objectif: 'Trouver la vraie erreur dans la sortie de make et la corriger.',
      rappel: `
        ### Lire la sortie de make

        - \`make: *** [cible] Error 1\` : **vraie** erreur ; \`Error 1 (ignored)\` : sans importance.
        - Les gros projets appellent make récursivement (\`make[1]\`, \`make[2]\`…). La **vraie** cause est **au-dessus
          de la première** ligne \`Error\` : le message du compilateur. Les lignes suivantes ne font que propager.
        - Relance avec \`make -j1\` (ou \`make 2>&1 | tee construction.log\`) pour une sortie lisible et conservée.

        ### Erreurs typiques

        | Message | Cause | Remède |
        |---|---|---|
        | \`pkg.h: No such file or directory\` | en-tête absent | installer le paquet **-dev/-devel**, ou \`CPPFLAGS=-I…\` |
        | \`'time_t' undeclared\` | \`#include\` oublié dans le code | \`man 2 time\` donne l’en-tête (\`<time.h>\`) |
        | \`conflicting types for 'item'\` | déclaration en double | retirer ou conditionner la ligne fautive |
        | \`make: cc: Command not found\` | outils de compilation absents | build-essential / Development Tools |
        | \`undefined reference to …\` | bibliothèque manquante à l’édition de liens | \`LDFLAGS\`/\`LIBS\`, paquet -dev |

        ### Quel paquet fournit cet en-tête ?

        \`\`\`
        # apt install apt-file && apt-file update
        $ apt-file search zlib.h                     # → zlib1g-dev: /usr/include/zlib.h
        $ dnf provides '*/zlib.h'                    # → zlib-devel
        \`\`\`

        Sur Rocky, beaucoup de paquets -devel sont dans le dépôt **CRB** : \`dnf config-manager --set-enabled crb\`.
        Raccourci : installer toutes les dépendances de construction du paquet de la distribution :
        \`apt build-dep jaugeur\` (dépôts deb-src activés) ou \`dnf builddep jaugeur\`.

        Pour aller plus loin (§16.7) : CMake, Meson, la compilation du noyau, et les paquets source des distributions
        (\`debuild\`, \`mock\`).
      `,
      aRetenir: [
        'Vraie erreur = message du compilateur au-dessus du premier `Error` ; « (ignored) » sans importance.',
        'En-tête manquant → paquet -dev/-devel : `apt-file search x.h`, `dnf provides \'*/x.h\'` (CRB sur Rocky).',
        '`undeclared` → #include oublié (man 2/3 fonction) ; `Command not found` → outils de compilation.',
        '`apt build-dep` / `dnf builddep` : toutes les dépendances de construction.',
      ],
      exercices: [
        {
          id: 'c16-05-01', type: 'commande', niveau: 2, ref: '§16.6.1, p. 398',
          enonce: 'Sur cuve (Debian), cherche quel paquet fournit l’en-tête `zlib.h` (apt-file est installé et à jour).',
          accepte: ['apt-file search zlib\\.h', 'apt-file search /usr/include/zlib\\.h', 'apt-file find zlib\\.h'],
          exemple: 'apt-file search zlib.h',
          indices: ['apt-file cherche dans le contenu des paquets.', 'Sous-commande search.', '`apt-file search zlib.h`'],
          solution: '```\n$ apt-file search zlib.h\nzlib1g-dev: /usr/include/zlib.h\n```\n`dpkg -S` ne cherche que dans les paquets **installés**.',
        },
        {
          id: 'c16-05-02', type: 'commande', niveau: 2, ref: '§16.6.1, p. 399',
          enonce: 'Sur fut (Rocky), cherche quel paquet fournit un fichier `zlib.h`, quel que soit son répertoire.',
          accepte: ["dnf provides ['\"]?\\*/zlib\\.h['\"]?", "dnf whatprovides ['\"]?\\*/zlib\\.h['\"]?", "yum provides ['\"]?\\*/zlib\\.h['\"]?", "dnf provides ['\"]?/usr/include/zlib\\.h['\"]?"],
          exemple: "dnf provides '*/zlib.h'",
          indices: ['dnf sait chercher le propriétaire d’un fichier, même non installé.', 'Sous-commande provides.', 'Le motif `*/zlib.h` entre guillemets.'],
          solution: "```\n$ dnf provides '*/zlib.h'\nzlib-devel-1.3.1-… : Header files and libraries for Zlib development\n```",
        },
        {
          id: 'c16-05-03', type: 'qcm', niveau: 2, ref: '§16.6, p. 397',
          enonce: 'Voici la fin d’une construction :\n\n```\nlecture.c:41:5: error: unknown type name \'uint8_t\'\nmake[2]: *** [Makefile:310: lecture.o] Error 1\nmake[1]: *** [Makefile:420: all-recursive] Error 1\nmake: *** [Makefile:250: all] Error 2\n```\n\nOù est la vraie cause ?',
          choix: ['Ligne 41 de lecture.c : le type uint8_t est inconnu (un #include <stdint.h> manque)', 'Dans le Makefile ligne 250', 'Dans all-recursive', 'make est mal installé'],
          reponse: 0,
          indices: ['Les lignes make[N] propagent l’échec.', 'La première erreur est celle du compilateur.', 'uint8_t est déclaré dans stdint.h.'],
          solution: 'La seule information utile est le message du compilateur : `lecture.c:41`. Les lignes `make[2]`, `make[1]`, `make` remontent l’échec. Ici, il manque `#include <stdint.h>`.',
        },
        {
          id: 'c16-05-04', type: 'association', niveau: 2, ref: '§16.6.1',
          enonce: 'Associe chaque erreur à son remède.',
          paires: [
            ['`make: cc: Command not found`', 'Installer build-essential ou Development Tools'],
            ['`openssl/ssl.h: No such file or directory`', 'Installer libssl-dev ou openssl-devel'],
            ['`\'time_t\' undeclared`', 'Ajouter l’#include indiqué par man 2 time'],
            ['`make: *** [doc] Error 1 (ignored)`', 'Rien : erreur ignorée volontairement'],
          ],
          indices: ['Pas de compilateur.', 'Pas d’en-tête : paquet de développement.', '(ignored) = sans importance.'],
          solution: 'cc introuvable → outils ; ssl.h → paquet -dev/-devel ; undeclared → #include ; (ignored) → rien.',
        },
        {
          id: 'c16-05-05', type: 'vrai-faux', niveau: 2, ref: '§16.6',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`dnf builddep jaugeur` installe les dépendances nécessaires pour construire jaugeur.', vrai: true },
            { texte: 'Sur Rocky, de nombreux paquets -devel nécessitent le dépôt CRB.', vrai: true },
            { texte: 'Dans une construction récursive, la dernière ligne `make: *** … Error 2` donne la cause précise.', vrai: false, explication: 'Elle ne fait que propager l’échec ; la cause est plus haut.' },
            { texte: '`make 2>&1 | tee construction.log` garde une trace complète de la construction.', vrai: true },
          ],
          indices: ['builddep = dépendances de construction.', 'Une seule fausse.', 'Remonte toujours.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '16.A',
      titre: 'Au-delà d’autotools : CMake, Meson et installation à blanc',
      auDela: true,
      objectif: 'Construire les projets modernes et installer proprement sans gestionnaire de paquets.',
      rappel: `
        Cette fiche complète le livre (§16.7 en donne la piste) avec les systèmes de construction les plus répandus
        aujourd’hui. Le principe reste le même : **configurer → construire → installer**, en dehors des sources.

        | Étape | autotools | CMake | Meson |
        |---|---|---|---|
        | configurer | \`./configure --prefix=/opt/x\` | \`cmake -B build -DCMAKE_INSTALL_PREFIX=/opt/x\` | \`meson setup build --prefix=/opt/x\` |
        | construire | \`make -j"$(nproc)"\` | \`cmake --build build -j\` | \`meson compile -C build\` (ou \`ninja -C build\`) |
        | tester | \`make check\` | \`ctest --test-dir build\` | \`meson test -C build\` |
        | installer | \`make install\` | \`cmake --install build\` | \`meson install -C build\` |
        | à blanc | \`make DESTDIR=/tmp/s install\` | \`DESTDIR=/tmp/s cmake --install build\` | \`meson install -C build --destdir /tmp/s\` |

        Paquets : \`cmake\`, \`meson\`, \`ninja-build\` (même nom sur Debian et Rocky).

        ### Bonnes pratiques d’exploitation

        - Construire en **utilisateur normal**, n’utiliser root que pour l’installation finale.
        - Installer sous \`/opt/nom-version\`, avec un lien \`/opt/nom → /opt/nom-version\` : changer de version =
          changer le lien ; revenir en arrière = remettre l’ancien lien.
        - Garder la trace : version, options de configure (\`config.log\` en tête, \`CMakeCache.txt\`), date, dans un
          fichier à côté de l’installation.
        - Préférer une **unité systemd** qui pointe vers \`/opt/nom/bin/…\` (fiche 6.3) pour un démon compilé.
      `,
      aRetenir: [
        'CMake : `cmake -B build -DCMAKE_INSTALL_PREFIX=…`, `cmake --build build`, `cmake --install build`.',
        'Meson : `meson setup build --prefix=…`, `meson compile -C build`, `meson install -C build`.',
        'DESTDIR pour une installation à blanc ; /opt/nom-version + lien symbolique pour basculer.',
        'Construire sans root ; noter version et options.',
      ],
      exercices: [
        {
          id: 'c16-06-01', type: 'association', niveau: 2,
          enonce: 'Associe chaque commande CMake ou Meson à son étape.',
          paires: [
            ['`cmake -B build -DCMAKE_INSTALL_PREFIX=/opt/jaugeur`', 'Configurer'],
            ['`cmake --build build`', 'Construire'],
            ['`meson test -C build`', 'Tester'],
            ['`meson install -C build --destdir /tmp/s`', 'Installer à blanc'],
          ],
          indices: ['-B crée le répertoire de construction.', '--build construit.', '--destdir = DESTDIR.'],
          solution: 'cmake -B … configurer, --build construire, meson test tester, install --destdir installation à blanc.',
        },
        {
          id: 'c16-06-02', type: 'commande', niveau: 2,
          enonce: 'Dans le répertoire des sources d’un projet CMake, configure une construction dans `build/` avec le préfixe `/opt/jaugeur`.',
          accepte: ['cmake -B ?build -DCMAKE_INSTALL_PREFIX=/opt/jaugeur/?( -S ?\\.)?', 'cmake -S ?\\. -B ?build -DCMAKE_INSTALL_PREFIX=/opt/jaugeur/?', 'cmake -DCMAKE_INSTALL_PREFIX=/opt/jaugeur/? -B ?build( -S ?\\.)?', 'cmake -DCMAKE_INSTALL_PREFIX=/opt/jaugeur/? -S ?\\. -B ?build'],
          exemple: 'cmake -B build -DCMAKE_INSTALL_PREFIX=/opt/jaugeur',
          indices: ['-B indique le répertoire de construction.', 'Le préfixe est une variable CMake définie avec -D.', 'CMAKE_INSTALL_PREFIX.'],
          solution: '```\n$ cmake -B build -DCMAKE_INSTALL_PREFIX=/opt/jaugeur\n$ cmake --build build -j\n$ sudo cmake --install build\n```',
        },
        {
          id: 'c16-06-03', type: 'qcm', niveau: 2,
          enonce: 'jaugeur 1.4 est installé dans `/opt/jaugeur-1.4`, et `/opt/jaugeur` est un lien vers `/opt/jaugeur-1.3`. L’unité systemd lance `/opt/jaugeur/bin/jaugeur`. Comment basculer vers 1.4 en gardant un retour arrière immédiat ?',
          choix: [
            '`ln -sfn /opt/jaugeur-1.4 /opt/jaugeur` puis `systemctl restart jaugeur` (retour : remettre le lien vers 1.3)',
            'Copier /opt/jaugeur-1.4 par-dessus /opt/jaugeur-1.3',
            'Supprimer /opt/jaugeur-1.3 puis renommer 1.4',
            'Modifier PATH de root',
          ],
          reponse: 0,
          indices: ['Le lien est le point d’indirection.', '-n traite le lien existant comme un fichier, pas comme un répertoire.', 'On garde les deux versions installées.'],
          solution: '`ln -sfn` remplace le lien de façon quasi atomique ; l’ancienne version reste en place pour revenir en arrière en une commande.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Les 4 étapes ?', r: 'Déballer, configurer, construire, installer.' },
    { q: 'Inspecter une archive ?', r: '`tar tvf x.tar.gz` (répertoire commun, pas de chemins absolus).' },
    { q: 'Autotools complet ?', r: '`./configure --prefix=…` ; `make` ; `make check` ; `make -n install` ; `make install`.' },
    { q: 'Préfixe par défaut ?', r: '/usr/local' },
    { q: 'En-têtes et bibliothèques hors standard pour configure ?', r: '`CPPFLAGS=-I… LDFLAGS=-L… ./configure`' },
    { q: 'configure échoue ?', r: 'config.log, depuis la fin en remontant.' },
    { q: 'Options d’une bibliothèque ?', r: '`pkg-config --cflags --libs x` ; PKG_CONFIG_PATH.' },
    { q: 'Installation à blanc ?', r: '`make DESTDIR=/tmp/stage install`' },
    { q: '-p0 vs -p1 ?', r: '-p0 chemins tels quels ; -p1 retire le premier répertoire (a/, b/).' },
    { q: 'Quel paquet fournit x.h ?', r: '`apt-file search x.h` ; `dnf provides \'*/x.h\'`.' },
    { q: 'Vraie erreur dans make ?', r: 'Message du compilateur au-dessus du premier `Error`.' },
    { q: 'CMake en 3 commandes ?', r: '`cmake -B build -DCMAKE_INSTALL_PREFIX=…` ; `cmake --build build` ; `cmake --install build`.' },
  ],
  memo: `
    ### Construire depuis les sources
    \`\`\`
    tar tvf x-1.4.tar.gz | head ; tar xf x-1.4.tar.gz ; cd x-1.4 ; less README INSTALL
    ./configure --prefix=/opt/x-1.4      # --help, --enable/--disable, --with-y=rép
    CPPFLAGS=-I/opt/y/include LDFLAGS="-L/opt/y/lib -Wl,-rpath=/opt/y/lib" ./configure
    make -j"$(nproc)" ; make check ; make -n install ; sudo make install
    make DESTDIR=/tmp/stage install      make clean   make distclean   make install-strip
    \`\`\`
    ### Dépendances
    \`\`\`
    pkg-config --cflags --libs zlib   pkg-config --list-all   PKG_CONFIG_PATH=/opt/y/lib/pkgconfig
    apt-file search x.h   apt build-dep x        dnf provides '*/x.h'   dnf builddep x   (CRB sur Rocky)
    \`\`\`
    ### Patch
    \`\`\`
    patch -p1 --dry-run < c.patch ; patch -p1 < c.patch      diff -u ancien nouveau > c.patch
    \`\`\`
    ### CMake / Meson
    \`\`\`
    cmake -B build -DCMAKE_INSTALL_PREFIX=/opt/x ; cmake --build build -j ; cmake --install build
    meson setup build --prefix=/opt/x ; meson compile -C build ; meson install -C build
    \`\`\`
  `,
});
