/* Chapitre 15 : Development Tools (livre p. 363–384). */
HLW.chapitre({
  id: '15',
  num: 15,
  intro: `
    Même si tu ne programmes pas, un administrateur rencontre sans cesse les outils de développement : un logiciel
    absent des dépôts à compiler, un message \`undefined reference\`, une bibliothèque partagée introuvable au
    lancement d’un programme, un \`Makefile\` à lire. Ce chapitre présente le **compilateur C**, les **bibliothèques**
    (statiques et partagées), les **en-têtes**, **make**, puis les langages de script et Java.

    Le but n’est pas d’écrire du C, mais de **comprendre les messages** et de savoir où regarder. Tout se pratique sur
    cuve et fut une fois la chaîne de compilation installée.
  `,
  objectifs: [
    'compiler et lier un petit programme C en plusieurs fichiers (cc, -c, -o) ;',
    'lier avec une bibliothèque (-l, -L) et diagnostiquer « undefined reference » ;',
    'comprendre les bibliothèques partagées : ldd, ld.so, ldconfig, rpath, et pourquoi éviter LD_LIBRARY_PATH ;',
    'trouver un en-tête manquant (-I) et lire les directives du préprocesseur ;',
    'lire et écrire un Makefile simple ; utiliser make -n, CC=, CFLAGS, les cibles clean/install ;',
    'reconnaître les interpréteurs de script (shebang) et lancer une application Java.',
  ],
  certifs: { lpic1: ['102.3'], lfcs: ['OD'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '15.1',
      titre: 'Compiler un programme C',
      sections: '§15.1 et 15.1.1', pages: '364–366',
      objectif: 'Passer d’un fichier source à un exécutable, et d’un programme en plusieurs fichiers à un seul binaire.',
      rappel: `
        D’abord, installer la chaîne de compilation (compilateur, make, en-têtes de la bibliothèque C) :

        \`\`\`
        # apt install build-essential                 # cuve (Debian)
        # dnf group install "Development Tools"       # fut (Rocky)
        \`\`\`

        Sur Linux, \`cc\` est en général **gcc** (GNU) ; **clang** (LLVM) est une alternative compatible.

        \`\`\`
        $ cc bonjour.c                 # produit a.out (nom par défaut)
        $ cc -o bonjour bonjour.c      # -o : nom de l'exécutable
        $ ./bonjour
        \`\`\`

        ### Plusieurs fichiers : compiler, puis lier

        Un programme réel est découpé en plusieurs fichiers \`.c\`. On compile chacun en **fichier objet** (\`.o\`,
        du code machine incomplet) avec **\`-c\`**, puis on **lie** (*link*) les objets en un exécutable :

        \`\`\`
        $ cc -c main.c                 # → main.o
        $ cc -c aux.c                  # → aux.o
        $ cc -o monprog main.o aux.o   # édition de liens → monprog
        \`\`\`

        L’édition de liens est faite par **ld** (le *linker*), que \`cc\` lance pour toi. Elle relie les appels de
        fonctions d’un objet à leur définition dans un autre. Intérêt : si tu modifies \`aux.c\`, seul \`aux.o\` est à
        recompiler (c’est ce qu’automatise make, fiche 15.4).
      `,
      aRetenir: [
        'Paquets : build-essential (Debian), groupe « Development Tools » (Rocky).',
        '`cc -o prog prog.c` ; sans -o → a.out.',
        '`cc -c x.c` → x.o (objet) ; `cc -o prog a.o b.o` : édition de liens (ld).',
      ],
      exercices: [
        {
          id: 'c15-01-01', type: 'commande', niveau: 1, ref: '§15.1, p. 364',
          enonce: 'Compile `bonjour.c` en un exécutable nommé `bonjour`.',
          accepte: ['(cc|gcc|clang) -o bonjour bonjour\\.c', '(cc|gcc|clang) bonjour\\.c -o bonjour'],
          exemple: 'cc -o bonjour bonjour.c',
          pieges: [{ motif: '(cc|gcc|clang) bonjour\\.c', message: 'Sans -o, l’exécutable s’appelle a.out.' }],
          indices: ['Le compilateur C s’appelle cc.', 'Une option donne le nom de sortie.', '`cc -o bonjour bonjour.c`'],
          solution: '```\n$ cc -o bonjour bonjour.c\n$ ./bonjour\n```',
        },
        {
          id: 'c15-01-02', type: 'commande', niveau: 1, ref: '§15.1.1, p. 365',
          enonce: 'Compile `aux.c` en fichier objet `aux.o`, **sans** créer d’exécutable.',
          accepte: ['(cc|gcc|clang) -c aux\\.c', '(cc|gcc|clang) -c aux\\.c -o aux\\.o', '(cc|gcc|clang) -c -o aux\\.o aux\\.c'],
          exemple: 'cc -c aux.c',
          indices: ['Une option arrête après la compilation.', 'c comme compile.', '`cc -c aux.c`'],
          solution: '```\n$ cc -c aux.c\n```\nProduit `aux.o`, code machine non encore lié.',
        },
        {
          id: 'c15-01-03', type: 'ordre', niveau: 1, ref: '§15.1.1',
          enonce: 'Remets dans l’ordre la construction de `monprog` à partir de `main.c` et `aux.c`.',
          elements: ['cc -c main.c', 'cc -c aux.c', 'cc -o monprog main.o aux.o', './monprog'],
          indices: ['Les objets avant l’exécutable.', 'Les deux compilations sont indépendantes (l’ordre entre elles importe peu).', 'On lie, puis on lance.'],
          solution: 'Compiler chaque fichier (`-c`), lier les objets (`-o monprog main.o aux.o`), lancer.',
        },
        {
          id: 'c15-01-04', type: 'vrai-faux', niveau: 2, ref: '§15.1',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un fichier .o peut être lancé directement comme un programme.', vrai: false, explication: 'Il lui manque l’édition de liens.' },
            { texte: 'Si seul aux.c change, il suffit de recompiler aux.o puis de refaire l’édition de liens.', vrai: true },
            { texte: 'L’édition de liens est réalisée par le programme ld, appelé par cc.', vrai: true },
            { texte: 'Sur Debian, le paquet build-essential installe gcc et make.', vrai: true },
          ],
          indices: ['Objet = incomplet.', 'Une seule fausse.', 'ld = linker.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
        {
          id: 'c15-01-05', type: 'commande', niveau: 1, ref: '§15.1',
          enonce: 'Sur fut (Rocky), installe le groupe de paquets de développement.',
          accepte: ['(sudo )?dnf (-y )?group(s)? install (-y )?"Development Tools"( -y)?', "(sudo )?dnf (-y )?group(s)? install (-y )?'Development Tools'( -y)?", '(sudo )?dnf (-y )?groupinstall (-y )?["\']Development Tools["\']( -y)?', '(sudo )?dnf (-y )?group install (-y )?development-tools( -y)?', '(sudo )?dnf (-y )?install (-y )?@development-tools( -y)?', '(sudo )?dnf (-y )?install (-y )?["\']@Development Tools["\']( -y)?'],
          exemple: 'dnf group install "Development Tools"',
          indices: ['dnf gère des groupes de paquets.', 'Sous-commande group install.', 'Le nom contient un espace : guillemets.'],
          solution: '```\n# dnf group install "Development Tools"\n```\nSur Debian : `apt install build-essential`.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '15.2',
      titre: 'Bibliothèques statiques et partagées',
      sections: '§15.1.2 et 15.1.3', pages: '366–371',
      objectif: 'Lier avec une bibliothèque, et comprendre comment un programme trouve ses bibliothèques partagées.',
      rappel: `
        Une **bibliothèque** est un paquet de fonctions déjà compilées. On lie avec **\`-l\`** (nom sans \`lib\` ni
        extension) et on indique un répertoire non standard avec **\`-L\`** :

        \`\`\`
        $ cc -o caisse caisse.o -lcurses                         # libcurses
        $ cc -o caisse caisse.o -L/opt/maison/lib -lmaison       # libmaison dans /opt/maison/lib
        \`\`\`

        Oublier la bibliothèque donne une erreur de l’**édition de liens** :
        \`undefined reference to 'initscr'\` → chercher quelle bibliothèque fournit \`initscr\` (\`nm --defined-only\`
        liste les fonctions d’une bibliothèque).

        ### Statique (.a) ou partagée (.so)

        | | Statique \`libx.a\` | Partagée \`libx.so.N\` |
        |---|---|---|
        | Code | **copié** dans l’exécutable | **référencé**, chargé au lancement |
        | Mise à jour de sécurité | recompiler chaque programme | remplacer la bibliothèque, redémarrer les programmes |
        | Mémoire | une copie par programme | partagée entre processus |

        ### Trouver les bibliothèques au lancement

        \`ldd prog\` liste les bibliothèques partagées nécessaires. C’est **ld.so** (le chargeur dynamique,
        \`/lib64/ld-linux-x86-64.so.2\`) qui les cherche, dans cet ordre :

        1. le **rpath** inscrit dans l’exécutable (\`-Wl,-rpath=/opt/maison/lib\` à la compilation) ;
        2. la variable **LD_LIBRARY_PATH** ;
        3. le **cache** \`/etc/ld.so.cache\`, construit par **\`ldconfig\`** à partir de \`/etc/ld.so.conf\` et
           \`/etc/ld.so.conf.d/*.conf\` (plus \`/lib\` et \`/usr/lib\`).

        \`\`\`
        $ ldd /usr/bin/ssh | grep 'not found'
        # echo /opt/maison/lib > /etc/ld.so.conf.d/maison.conf && ldconfig
        $ ldconfig -p | grep libmaison
        \`\`\`

        Le livre est catégorique : **ne mets pas LD_LIBRARY_PATH** dans tes fichiers de démarrage. Elle s’applique à
        tous les programmes, ralentit et provoque des conflits. Si un vieux programme en a besoin, un petit **script
        enveloppe** la définit pour lui seul. Et n’ajoute pas n’importe quoi à \`ld.so.conf\` : préfère un rpath.
      `,
      aRetenir: [
        '`-lnom` (libnom), `-L/rép` ; « undefined reference » = bibliothèque (ou objet) oubliée à l’édition de liens.',
        '.a copié dans le binaire ; .so chargé au lancement par ld.so.',
        '`ldd prog` ; ordre : rpath → LD_LIBRARY_PATH → cache (ldconfig, /etc/ld.so.conf.d).',
        'Pas de LD_LIBRARY_PATH global ; `-Wl,-rpath=` ou script enveloppe.',
      ],
      exercices: [
        {
          id: 'c15-02-01', type: 'commande', niveau: 2, ref: '§15.1.2, p. 367',
          enonce: 'Lie `caisse.o` en un exécutable `caisse`, avec la bibliothèque `libmaison` qui se trouve dans `/opt/maison/lib`.',
          accepte: ['(cc|gcc) -o caisse caisse\\.o -L ?/opt/maison/lib -lmaison', '(cc|gcc) caisse\\.o -o caisse -L ?/opt/maison/lib -lmaison', '(cc|gcc) -o caisse -L ?/opt/maison/lib caisse\\.o -lmaison', '(cc|gcc) -L ?/opt/maison/lib -o caisse caisse\\.o -lmaison'],
          exemple: 'cc -o caisse caisse.o -L/opt/maison/lib -lmaison',
          pieges: [{ motif: '.*-llibmaison.*', message: '-l prend le nom sans le préfixe « lib » : -lmaison.' }, { motif: '.*-lmaison.*caisse\\.o.*', message: 'Place les bibliothèques après les objets qui les utilisent : l’éditeur de liens lit de gauche à droite.' }],
          indices: ['-L pour le répertoire, -l pour la bibliothèque.', 'Le nom de bibliothèque perd « lib » et l’extension.', '`cc -o caisse caisse.o -L/opt/maison/lib -lmaison`'],
          solution: '```\n$ cc -o caisse caisse.o -L/opt/maison/lib -lmaison\n```\nLes options `-l` se mettent **après** les objets.',
        },
        {
          id: 'c15-02-02', type: 'qcm', niveau: 2, ref: '§15.1.2, p. 366',
          enonce: 'La construction s’arrête sur : `caisse.o: undefined reference to \'initscr\'`. Quelle est la cause la plus probable ?',
          choix: [
            'La bibliothèque qui fournit initscr (curses) n’a pas été donnée à l’édition de liens (-lcurses)',
            'Un en-tête est introuvable',
            'Le fichier caisse.c contient une erreur de syntaxe',
            'Le programme a été lancé sans les droits root',
          ],
          reponse: 0,
          indices: ['« undefined reference » vient de l’édition de liens.', 'Une fonction est utilisée mais jamais définie.', 'initscr appartient à ncurses.'],
          solution: 'Erreur de l’**éditeur de liens** : la fonction n’est définie dans aucun objet ni bibliothèque fournis. Ajoute `-lcurses` (ou `-lncurses`). Un en-tête manquant donnerait « No such file or directory » à la compilation.',
        },
        {
          id: 'c15-02-03', type: 'commande', niveau: 1, ref: '§15.1.3, p. 368',
          enonce: 'Affiche les bibliothèques partagées dont dépend `/usr/bin/ssh`.',
          accepte: ['ldd /usr/bin/ssh', 'ldd \\$\\(which ssh\\)', 'ldd \\$\\(command -v ssh\\)'],
          exemple: 'ldd /usr/bin/ssh',
          indices: ['Commande en trois lettres.', 'List Dynamic Dependencies.', '`ldd /usr/bin/ssh`'],
          solution: '```\n$ ldd /usr/bin/ssh\n\tlinux-vdso.so.1 (0x...)\n\tlibcrypto.so.3 => /lib/x86_64-linux-gnu/libcrypto.so.3 (0x...)\n\tlibc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x...)\n\t/lib64/ld-linux-x86-64.so.2 (0x...)\n```\nUne ligne `=> not found` révèle une bibliothèque manquante. Attention : n’utilise pas `ldd` sur un binaire non fiable (il peut l’exécuter) ; préfère `objdump -p` ou `readelf -d` (fiche 15.A).',
        },
        {
          id: 'c15-02-04', type: 'ordre', niveau: 3, ref: '§15.1.3, p. 369–370',
          enonce: 'Dans quel ordre ld.so cherche-t-il une bibliothèque partagée ?',
          elements: ['Le rpath inscrit dans l’exécutable', 'La variable LD_LIBRARY_PATH', 'Le cache /etc/ld.so.cache (ldconfig)', 'Les répertoires par défaut /lib et /usr/lib'],
          indices: ['Le programme lui-même d’abord.', 'Puis l’environnement.', 'Puis la configuration du système et les répertoires par défaut.'],
          solution: 'rpath → LD_LIBRARY_PATH → cache (ld.so.conf via ldconfig) → /lib, /usr/lib. (Un RUNPATH, la forme moderne du rpath, est consulté *après* LD_LIBRARY_PATH.)',
        },
        {
          id: 'c15-02-05', type: 'commande', niveau: 2, ref: '§15.1.3, p. 370',
          enonce: 'Tu viens de créer `/etc/ld.so.conf.d/maison.conf` contenant `/opt/maison/lib`. Reconstruis le cache des bibliothèques partagées (en root).',
          accepte: ['(sudo )?ldconfig( -v)?', '(sudo )?/sbin/ldconfig( -v)?', '(sudo )?/usr/sbin/ldconfig( -v)?'],
          exemple: 'ldconfig',
          indices: ['ld.so lit un cache, pas la configuration directement.', 'L’outil a un nom proche de ld.so.conf.', '`ldconfig`'],
          solution: '```\n# ldconfig\n$ ldconfig -p | grep libmaison\n```',
        },
        {
          id: 'c15-02-06', type: 'qcm', niveau: 2, ref: '§15.1.3, p. 371',
          enonce: 'Un logiciel métier ancien de la brasserie ne démarre que si `/opt/vieux/lib` est dans LD_LIBRARY_PATH. Quelle est la meilleure solution selon le livre ?',
          choix: [
            'Un petit script enveloppe qui définit LD_LIBRARY_PATH puis lance le programme avec exec',
            'Ajouter `export LD_LIBRARY_PATH=/opt/vieux/lib` dans /etc/profile.d',
            'Copier ses bibliothèques dans /usr/lib',
            'Ajouter LD_LIBRARY_PATH dans ~/.bashrc de chaque utilisateur',
          ],
          reponse: 0,
          indices: ['La variable ne doit toucher que ce programme.', 'Une définition globale affecte tous les programmes.', 'exec remplace le script par le programme.'],
          solution: '```\n#!/bin/sh\nLD_LIBRARY_PATH=/opt/vieux/lib\nexport LD_LIBRARY_PATH\nexec /opt/vieux/bin/logiciel "$@"\n```\nLa variable ne s’applique qu’à lui. Mieux encore, si tu le recompiles : `-Wl,-rpath=/opt/vieux/lib`.',
        },
        {
          id: 'c15-02-07', type: 'vrai-faux', niveau: 2, ref: '§15.1.3',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Après la mise à jour d’une bibliothèque partagée (par exemple OpenSSL), les programmes déjà lancés utilisent encore l’ancienne version.', vrai: true, explication: 'Ils l’ont chargée au démarrage : il faut les redémarrer (needrestart sur Debian, `dnf needs-restarting` sur Rocky).' },
            { texte: 'Un programme lié statiquement à une bibliothèque doit être recompilé pour profiter d’un correctif de celle-ci.', vrai: true },
            { texte: '`-Wl,-rpath=/opt/x/lib` dispense de `-L/opt/x/lib`.', vrai: false, explication: '-L sert à l’édition de liens, le rpath au lancement : il faut les deux.' },
            { texte: '`ldconfig -p` affiche le contenu du cache des bibliothèques.', vrai: true },
          ],
          indices: ['Une bibliothèque est chargée au démarrage du processus.', 'Une seule fausse.', '-L et rpath agissent à deux moments différents.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '15.3',
      titre: 'En-têtes et préprocesseur',
      sections: '§15.1.4', pages: '371–373',
      objectif: 'Résoudre un en-tête introuvable et lire les directives # d’un fichier C.',
      rappel: `
        Un **en-tête** (\`.h\`) déclare les fonctions et types d’une bibliothèque ; le code l’inclut avec \`#include\`.
        Les en-têtes système sont dans **\`/usr/include\`**. Quand un en-tête manque, la **compilation** échoue :

        \`\`\`
        caisse.c:1:10: fatal error: maison.h: No such file or directory
        \`\`\`

        Si l’en-tête existe ailleurs, on ajoute le répertoire avec **\`-I\`** :

        \`\`\`
        $ cc -c -I/opt/maison/include caisse.c
        \`\`\`

        Le plus souvent, il manque simplement le **paquet de développement** de la bibliothèque (\`libxxx-dev\` sur
        Debian, \`xxx-devel\` sur Rocky) : chapitre 16.

        \`#include <stdio.h>\` cherche dans les répertoires système ; \`#include "maison.h"\` d’abord à côté du fichier
        source (un problème avec des guillemets signale souvent des sources incomplètes).

        ### Le préprocesseur (cpp)

        Avant la compilation, le **préprocesseur** traite les directives commençant par \`#\` :

        | Directive | Effet |
        |---|---|
        | \`#include <x.h>\` | insère le fichier (cherché dans /usr/include et les \`-I\`) |
        | \`#define TAUX 20\` | remplace TAUX par 20 dans la suite (équivalent en ligne de commande : \`-DTAUX=20\`) |
        | \`#ifdef DEBUG\` … \`#endif\` | ne garde le bloc que si DEBUG est défini |

        \`\`\`
        $ cc -DDEBUG -o caisse caisse.c     # active les blocs #ifdef DEBUG
        $ cc -E caisse.c | less             # voir le résultat du préprocesseur
        \`\`\`
      `,
      aRetenir: [
        'En-têtes dans /usr/include ; « No such file or directory » sur un .h = compilation.',
        '`-I/rép` pour un répertoire d’en-têtes ; souvent il manque le paquet -dev/-devel.',
        'Préprocesseur : #include, #define (ou -DNOM=val), #ifdef/#endif ; `cc -E`.',
      ],
      exercices: [
        {
          id: 'c15-03-01', type: 'commande', niveau: 2, ref: '§15.1.4, p. 372',
          enonce: 'Compile `caisse.c` en objet, sachant que l’en-tête `maison.h` se trouve dans `/opt/maison/include`.',
          accepte: ['(cc|gcc) -c -I ?/opt/maison/include caisse\\.c', '(cc|gcc) -I ?/opt/maison/include -c caisse\\.c', '(cc|gcc) -c caisse\\.c -I ?/opt/maison/include'],
          exemple: 'cc -c -I/opt/maison/include caisse.c',
          pieges: [{ motif: '.*-L ?/opt/maison/include.*', message: '-L concerne les bibliothèques (édition de liens). Pour les en-têtes, c’est -I.' }],
          indices: ['Option I comme include.', 'Répertoire collé ou non à l’option.', '`cc -c -I/opt/maison/include caisse.c`'],
          solution: '```\n$ cc -c -I/opt/maison/include caisse.c\n```',
        },
        {
          id: 'c15-03-02', type: 'association', niveau: 2, ref: '§15.1.2–15.1.4',
          enonce: 'Associe chaque message à l’étape qui échoue.',
          paires: [
            ['`fatal error: maison.h: No such file or directory`', 'Préprocesseur / compilation : en-tête introuvable'],
            ['`undefined reference to \'maison_init\'`', 'Édition de liens : bibliothèque oubliée'],
            ['`error while loading shared libraries: libmaison.so.1`', 'Lancement : ld.so ne trouve pas la .so'],
            ['`Makefile:7: *** missing separator.  Stop.`', 'make : tabulation manquante'],
          ],
          indices: ['Un .h concerne la compilation.', '« reference » concerne les liens.', '« loading » concerne le lancement.'],
          solution: 'En-tête → compilation (-I, paquet -dev). Undefined reference → édition de liens (-l, -L). Loading shared libraries → lancement (ldconfig, rpath). Missing separator → Makefile mal indenté.',
        },
        {
          id: 'c15-03-03', type: 'commande', niveau: 2, ref: '§15.1.4, p. 373',
          enonce: 'Compile `caisse.c` en exécutable `caisse` en **définissant** la macro `DEBUG` sur la ligne de commande (pour activer les blocs `#ifdef DEBUG`).',
          accepte: ['(cc|gcc) -DDEBUG -o caisse caisse\\.c', '(cc|gcc) -o caisse -DDEBUG caisse\\.c', '(cc|gcc) -o caisse caisse\\.c -DDEBUG', '(cc|gcc) -D ?DEBUG(=1)? -o caisse caisse\\.c', '(cc|gcc) -o caisse caisse\\.c -D ?DEBUG(=1)?'],
          exemple: 'cc -DDEBUG -o caisse caisse.c',
          indices: ['L’option D comme define.', 'Pas besoin de valeur.', '`cc -DDEBUG -o caisse caisse.c`'],
          solution: '```\n$ cc -DDEBUG -o caisse caisse.c\n```\nÉquivaut à `#define DEBUG` en tête du fichier.',
        },
        {
          id: 'c15-03-04', type: 'vrai-faux', niveau: 2, ref: '§15.1.4',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Le préprocesseur connaît la syntaxe du C (variables, fonctions).', vrai: false, explication: 'Il ne comprend que ses propres directives et macros.' },
            { texte: '`cc -E fichier.c` affiche le code après le passage du préprocesseur.', vrai: true },
            { texte: '`#include "x.h"` cherche d’abord x.h à côté du fichier source.', vrai: true },
            { texte: 'Sur Rocky, les en-têtes d’une bibliothèque sont souvent dans un paquet nommé …-devel.', vrai: true },
          ],
          indices: ['cpp fait du remplacement de texte.', 'Une seule fausse.', 'Debian : -dev ; Rocky : -devel.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '15.4',
      titre: 'make et les Makefiles',
      sections: '§15.2', pages: '373–379',
      objectif: 'Lire un Makefile, comprendre cibles et dépendances, et piloter make en ligne de commande.',
      rappel: `
        **make** construit des **cibles** (*targets*) à partir de leurs **dépendances**, en suivant des **règles**,
        et ne refait **que ce qui est périmé** (comparaison des dates de modification).

        \`\`\`
        # Makefile
        OBJS=aux.o main.o

        all: monprog

        monprog: $(OBJS)
            $(CC) -o monprog $(OBJS)

        clean:
            rm -f $(OBJS) monprog
        \`\`\`

        La ligne de commande sous une règle commence **obligatoirement par une tabulation** (affichée ici comme des
        espaces). Sinon : \`Makefile:7: *** missing separator.  Stop.\`

        - Rien n’explique comment faire \`aux.o\` : make a des **règles implicites** (pour un \`.o\`, il cherche un \`.c\`
          et lance \`cc -c\`).
        - \`make\` construit la **première** cible (\`all\` par convention). Une seconde fois : *Nothing to be done*.
          Après \`touch aux.c\`, seul \`aux.o\` puis \`monprog\` sont refaits (réaction en chaîne).

        | Commande | Effet |
        |---|---|
        | \`make aux.o\` | construire une seule cible |
        | \`make CC=clang\` | redéfinir une macro |
        | \`make -n\` | **afficher** les commandes sans les lancer |
        | \`make -f autre.mk\` | utiliser un autre fichier |
        | \`make -j4\` | 4 tâches en parallèle |

        **Macros standard** : \`CC\` (compilateur), \`CFLAGS\` (options de compilation), \`CPPFLAGS\` (préprocesseur,
        \`-I\`, \`-D\`), \`LDFLAGS\` (édition de liens, \`-L\`), \`LDLIBS\` (\`-l\`). **Variables automatiques** dans une
        règle : \`$@\` (la cible), \`$<\` (la première dépendance), \`$*\` (le nom sans suffixe).

        **Cibles conventionnelles** : \`all\`, \`clean\` (supprimer les produits), \`distclean\` (revenir à l’archive
        d’origine), \`install\` (copier sur le système : **toujours \`make -n install\` d’abord**), \`check\`/\`test\`.
      `,
      aRetenir: [
        'Cible : dépendances, puis commande(s) précédée(s) d’une TABULATION.',
        'Règles implicites (.c → .o) ; make ne refait que ce qui est plus ancien que ses dépendances.',
        '`make cible`, `make CC=clang`, `make -n`, `make -f`, `make -j`.',
        'CC, CFLAGS, CPPFLAGS, LDFLAGS, LDLIBS ; $@, $<, $* ; all, clean, distclean, install, check.',
      ],
      exercices: [
        {
          id: 'c15-04-01', type: 'qcm', niveau: 1, ref: '§15.2.3, p. 375',
          enonce: '`make` répond : `Makefile:7: *** missing separator.  Stop.` Que faut-il corriger ?',
          choix: [
            'La ligne de commande 7 doit commencer par une tabulation, pas par des espaces',
            'Il manque un point-virgule en fin de ligne',
            'Le fichier doit s’appeler makefile en minuscules',
            'Il faut installer make',
          ],
          reponse: 0,
          indices: ['Le séparateur dont parle make est un caractère précis.', 'Beaucoup d’éditeurs remplacent ce caractère par des espaces.', 'Tabulation.'],
          solution: 'Les commandes d’une règle doivent commencer par une **tabulation**. `cat -A Makefile` montre les tabulations sous la forme `^I`.',
        },
        {
          id: 'c15-04-02', type: 'commande', niveau: 1, ref: '§15.2.7, p. 378',
          enonce: 'Avant d’installer un logiciel compilé, affiche les commandes que lancerait `make install`, **sans** les exécuter.',
          accepte: ['make -n install', 'make install -n', 'make --dry-run install', 'make --just-print install', 'make install --dry-run'],
          exemple: 'make -n install',
          indices: ['Une option de make simule.', 'n comme « ne fais rien ».', '`make -n install`'],
          solution: '```\n$ make -n install\n```\nTu vois où chaque fichier serait copié : tu évites les mauvaises surprises dans /usr.',
        },
        {
          id: 'c15-04-03', type: 'commande', niveau: 2, ref: '§15.2.5, p. 376',
          enonce: 'Construis le projet avec le compilateur **clang** au lieu de cc, sans modifier le Makefile.',
          accepte: ['make CC=clang', 'make CC="clang"', "make CC='clang'", 'make -e CC=clang', 'CC=clang make -e'],
          exemple: 'make CC=clang',
          indices: ['Une macro peut se redéfinir en ligne de commande.', 'La macro du compilateur C est CC.', '`make CC=clang`'],
          solution: '```\n$ make CC=clang\n```\nMême principe pour `make CFLAGS="-O2 -g"`.',
        },
        {
          id: 'c15-04-04', type: 'association', niveau: 2, ref: '§15.2.6, p. 377',
          enonce: 'Associe chaque macro ou variable de make à son contenu.',
          paires: [['`CFLAGS`', 'Options du compilateur C'], ['`LDFLAGS`', 'Options de l’édition de liens (-L…)'], ['`CPPFLAGS`', 'Options du préprocesseur (-I, -D)'], ['`$@`', 'La cible de la règle en cours'], ['`$<`', 'La première dépendance']],
          indices: ['LD = linker, CPP = préprocesseur.', '@ ressemble à une cible.', '< pointe vers ce qui entre.'],
          solution: 'CFLAGS compilateur, LDFLAGS liens, CPPFLAGS préprocesseur, $@ cible, $< première dépendance.',
        },
        {
          id: 'c15-04-05', type: 'qcm', niveau: 2, ref: '§15.2.4, p. 375–376',
          enonce: 'Le projet `monprog` (aux.c, main.c) vient d’être construit. Tu modifies **main.c** puis relances `make`. Que fait make ?',
          choix: ['Il recompile main.o puis refait l’édition de liens de monprog', 'Il recompile tout', 'Il ne fait rien', 'Il recompile aux.o et main.o mais pas monprog'],
          reponse: 0,
          indices: ['make compare les dates.', 'main.c est plus récent que main.o.', 'Et main.o devient plus récent que monprog.'],
          solution: 'main.c plus récent que main.o → recompilation de main.o ; main.o plus récent que monprog → nouvelle édition de liens. aux.o est à jour, il n’est pas touché.',
        },
        {
          id: 'c15-04-06', type: 'trous', niveau: 2, ref: '§15.2.7',
          enonce: 'Complète la règle `clean` du Makefile (la commande commence par une tabulation).',
          texte: '[[1]]:\n\t[[2]] $(OBJS) monprog',
          trous: [{ accepte: ['clean'], exemple: 'clean' }, { accepte: ['rm -f', 'rm -rf', '\\$\\(RM\\)', 'rm'], exemple: 'rm -f' }],
          indices: ['Le nom conventionnel de la cible de nettoyage.', 'On supprime des fichiers sans erreur s’ils manquent.', '`clean:` puis `rm -f`.'],
          solution: '```\nclean:\n\trm -f $(OBJS) monprog\n```',
        },
        {
          id: 'c15-04-07', type: 'vrai-faux', niveau: 2, ref: '§15.2',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`make` sans argument construit la première cible du Makefile.', vrai: true },
            { texte: 'Pour un programme d’un seul fichier `outil.c`, `make outil` fonctionne même sans Makefile.', vrai: true, explication: 'Les règles implicites suffisent.' },
            { texte: '`distclean` supprime aussi les fichiers générés par ./configure, comme le Makefile.', vrai: true },
            { texte: '`make -j4` lance quatre fois la même compilation.', vrai: false, explication: 'Il lance jusqu’à quatre tâches indépendantes en parallèle.' },
          ],
          indices: ['Les règles implicites…', 'Une seule fausse.', 'j = jobs.'],
          solution: 'Vrai, vrai, vrai, faux.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '15.5',
      titre: 'Lex et Yacc, langages de script, Java',
      sections: '§15.3 à 15.6', pages: '379–383',
      objectif: 'Reconnaître les autres outils et langages courants, et diagnostiquer un shebang cassé.',
      rappel: `
        - **Lex / Yacc** : générateurs d’analyseurs (découpage en jetons et grammaire), utilisés par des programmes qui
          lisent un langage de configuration. Versions GNU : **flex** et **bison** (\`bison -y\` pour la compatibilité
          Yacc).

        ### Langages de script

        Un script commence par un **shebang** (fiche 11.1) qui désigne l’interpréteur :

        \`\`\`
        #!/usr/bin/python3            # chemin fixe
        #!/usr/bin/env python3        # premier python3 trouvé dans PATH
        \`\`\`

        Le noyau lance l’interpréteur indiqué en lui donnant le fichier. Si le chemin n’existe pas :
        \`bad interpreter: No such file or directory\`. Autre cause classique : un fichier écrit sous Windows, dont la
        première ligne se termine par \`\\r\` (\`/usr/bin/python3^M\`) ; \`cat -A\` le montre, \`dos2unix\` le corrige.
        Ne compte pas sur plus d’**un** argument dans la ligne shebang.

        Langages courants : **Python** (omniprésent en administration), **Perl** (traitement de texte, vieux outils),
        PHP, Ruby, JavaScript (**Node.js**, \`node\`), Tcl, R…

        ### Java

        Java est compilé en **bytecode** (\`.class\`), exécuté par la machine virtuelle Java (JRE).

        \`\`\`
        $ java -jar inventaire.jar     # lancer une archive .jar
        $ javac Outil.java             # compiler (JDK) → Outil.class
        \`\`\`

        Variables parfois nécessaires : \`JAVA_HOME\` (répertoire d’installation) et \`CLASSPATH\` (où chercher les
        classes). Les langages compilés récents, **Go** et **Rust**, produisent souvent des binaires statiques, simples à
        déployer.
      `,
      aRetenir: [
        'flex (Lex) et bison (Yacc).',
        'Shebang : `#!/usr/bin/python3` ou `#!/usr/bin/env python3` ; « bad interpreter » = chemin faux ou fin de ligne Windows.',
        '`java -jar x.jar`, `javac X.java` ; JAVA_HOME, CLASSPATH.',
      ],
      exercices: [
        {
          id: 'c15-05-01', type: 'qcm', niveau: 2, ref: '§15.4, p. 380',
          enonce: 'Lancer `./releve.py` (exécutable) donne `bash: ./releve.py: /usr/bin/python3^M: bad interpreter: No such file or directory`. Quelle est la cause ?',
          choix: [
            'Le fichier a des fins de ligne Windows (CRLF) : le noyau cherche « python3\\r »',
            'Python n’est pas installé',
            'Le fichier n’est pas exécutable',
            'Le script contient une erreur de syntaxe Python',
          ],
          reponse: 0,
          indices: ['Regarde le ^M dans le message.', '^M est le retour chariot.', 'Fichier édité sous Windows.'],
          solution: '`^M` = `\\r`. Corrige avec `dos2unix releve.py` ou `sed -i \'s/\\r$//\' releve.py`. `cat -A` affiche les fins de ligne (`^M$`).',
        },
        {
          id: 'c15-05-02', type: 'commande', niveau: 1, ref: '§15.5, p. 382',
          enonce: 'Lance l’application Java contenue dans l’archive `inventaire.jar`.',
          accepte: ['java -jar inventaire\\.jar', 'java -jar \\./inventaire\\.jar'],
          exemple: 'java -jar inventaire.jar',
          indices: ['La commande java.', 'Une option pour les archives .jar.', '`java -jar inventaire.jar`'],
          solution: '```\n$ java -jar inventaire.jar\n```',
        },
        {
          id: 'c15-05-03', type: 'association', niveau: 1, ref: '§15.3–15.5',
          enonce: 'Associe chaque outil à son rôle.',
          paires: [['flex', 'Découper un texte en jetons (Lex)'], ['bison', 'Analyser une grammaire (Yacc)'], ['javac', 'Compiler du Java en bytecode'], ['node', 'Exécuter du JavaScript hors du navigateur']],
          indices: ['flex est le Lex de GNU.', 'bison est le Yacc de GNU.', 'javac = Java compiler.'],
          solution: 'flex jetons, bison grammaire, javac compilation Java, node JavaScript.',
        },
        {
          id: 'c15-05-04', type: 'vrai-faux', niveau: 2, ref: '§15.4',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`#!/usr/bin/env python3` utilise le premier python3 trouvé dans PATH.', vrai: true },
            { texte: 'Une ligne shebang peut contenir autant d’arguments qu’on veut, de façon portable.', vrai: false, explication: 'Un seul argument est fiable.' },
            { texte: 'Un fichier .class contient du bytecode Java, pas du code machine.', vrai: true },
            { texte: '`#!/usr/bin/tail -2` est une ligne shebang valide.', vrai: true, explication: 'N’importe quel programme peut servir d’interpréteur : il reçoit le fichier.' },
          ],
          indices: ['env cherche dans PATH.', 'Une seule fausse.', 'Le livre montre un script interprété par tail.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '15.A',
      titre: 'Inspecter un binaire en toute sécurité',
      auDela: true,
      objectif: 'Savoir ce qu’est un exécutable et de quoi il a besoin, sans le lancer.',
      rappel: `
        Cette fiche complète le livre avec les outils d’inspection utilisés en exploitation (et au Lab 11).

        \`\`\`
        $ file /usr/bin/ssh
        /usr/bin/ssh: ELF 64-bit LSB pie executable, x86-64, dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2 ...
        $ readelf -d /opt/maison/bin/caisse | grep -E 'NEEDED|RPATH|RUNPATH'
         0x...1 (NEEDED)    Shared library: [libmaison.so.1]
         0x...d (RUNPATH)   Library runpath: [/opt/maison/lib]
        $ objdump -p prog | grep NEEDED          # même information
        $ nm -D --defined-only libmaison.so.1    # fonctions exportées par une bibliothèque
        $ strings -n 8 prog | less               # chaînes lisibles (messages, chemins)
        \`\`\`

        - **\`file\`** : type (ELF, script, statique ou dynamique, architecture).
        - **\`readelf -d\`** / **\`objdump -p\`** : bibliothèques requises (NEEDED) et rpath/RUNPATH, **sans exécuter**
          le binaire, contrairement à \`ldd\` qui peut le faire : ne jamais lancer \`ldd\` sur un binaire non fiable.
        - **\`LD_DEBUG=libs prog\`** : ld.so raconte où il cherche chaque bibliothèque (diagnostic au lancement).
        - **\`strip\`** retire les symboles de débogage (binaire plus petit) ; \`file\` affiche alors *stripped*.
        - Quel paquet fournit une bibliothèque ? \`dpkg -S libssl.so.3\` (Debian), \`rpm -qf /usr/lib64/libssl.so.3\` ou
          \`dnf provides '*/libssl.so.3'\` (Rocky).
      `,
      aRetenir: [
        '`file` : type de binaire ; `readelf -d | grep -E "NEEDED|RUNPATH"` ou `objdump -p` : dépendances sans exécuter.',
        'Pas de `ldd` sur un binaire non fiable.',
        '`LD_DEBUG=libs prog` : trace de ld.so ; `nm -D`, `strings`, `strip`.',
        'Paquet propriétaire : `dpkg -S`, `rpm -qf`, `dnf provides`.',
      ],
      exercices: [
        {
          id: 'c15-06-01', type: 'commande', niveau: 2,
          enonce: 'Affiche la section dynamique de `/opt/maison/bin/caisse` (bibliothèques NEEDED, RUNPATH), **sans** exécuter le binaire, avec readelf.',
          accepte: ['readelf -d /opt/maison/bin/caisse( \\| grep .*)?', 'readelf --dynamic /opt/maison/bin/caisse( \\| grep .*)?'],
          exemple: 'readelf -d /opt/maison/bin/caisse',
          indices: ['readelf lit le format ELF.', 'Option d comme dynamic.', '`readelf -d /opt/maison/bin/caisse`'],
          solution: '```\n$ readelf -d /opt/maison/bin/caisse | grep -E \'NEEDED|RUNPATH\'\n```',
        },
        {
          id: 'c15-06-02', type: 'qcm', niveau: 2,
          enonce: 'Un collègue te transmet un binaire trouvé sur un serveur compromis. Pour connaître ses bibliothèques, quelle commande éviter ?',
          choix: ['ldd suspect', 'readelf -d suspect', 'objdump -p suspect', 'file suspect'],
          reponse: 0,
          indices: ['Une seule de ces commandes peut faire exécuter du code du binaire.', 'Elle passe par le chargeur dynamique.', 'ldd.'],
          solution: '`ldd` peut, selon le binaire, provoquer son exécution. `readelf`, `objdump` et `file` se contentent de lire le fichier.',
        },
        {
          id: 'c15-06-03', type: 'commande', niveau: 2,
          enonce: 'Lance `./caisse` en demandant au chargeur dynamique d’afficher sa recherche des bibliothèques.',
          accepte: ['LD_DEBUG=libs \\./caisse', 'LD_DEBUG=all \\./caisse', 'env LD_DEBUG=libs \\./caisse'],
          exemple: 'LD_DEBUG=libs ./caisse',
          indices: ['Une variable d’environnement de ld.so.', 'LD_DEBUG.', 'Valeur libs.'],
          solution: '```\n$ LD_DEBUG=libs ./caisse\n   1234:	find library=libmaison.so.1 [0]; searching\n   1234:	 search cache=/etc/ld.so.cache\n```\n`LD_DEBUG=help` liste les valeurs possibles.',
        },
        {
          id: 'c15-06-04', type: 'association', niveau: 2,
          enonce: 'Associe chaque commande à l’information qu’elle donne.',
          paires: [['`file prog`', 'Type du fichier, liaison statique ou dynamique'], ['`nm -D lib.so`', 'Symboles (fonctions) d’une bibliothèque'], ['`strings prog`', 'Chaînes de texte lisibles'], ['`dpkg -S libssl.so.3`', 'Paquet Debian qui fournit le fichier']],
          indices: ['file identifie.', 'nm = names (symboles).', 'dpkg -S cherche un fichier dans les paquets.'],
          solution: 'file type, nm -D symboles, strings chaînes, dpkg -S paquet propriétaire.',
        },
        {
          id: 'c15-06-05', type: 'terminal', niveau: 2,
          enonce: 'Sur cuve : `file /usr/bin/ls`, puis `readelf -d /usr/bin/ls | grep NEEDED`. Colle la sortie. Combien de bibliothèques ls réclame-t-il ?',
          attendu: ['NEEDED|ELF'],
          indices: ['file indique « dynamically linked ».', 'Chaque ligne NEEDED est une bibliothèque.', 'Compare avec ldd /usr/bin/ls.'],
          solution: 'Typiquement libselinux, libc (et parfois libcap). `ldd` en montre davantage, car il suit aussi les dépendances des dépendances et ajoute ld-linux et le vdso.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Compiler en objet / lier ?', r: '`cc -c x.c` → x.o ; `cc -o prog a.o b.o`.' },
    { q: 'Lier avec libmaison dans /opt/maison/lib ?', r: '`cc -o p p.o -L/opt/maison/lib -lmaison`' },
    { q: '« undefined reference to … » ?', r: 'Édition de liens : bibliothèque (ou objet) manquante → -l.' },
    { q: '« x.h: No such file or directory » ?', r: 'Compilation : -I/rép, ou installer le paquet -dev / -devel.' },
    { q: 'Statique vs partagée ?', r: '.a copié dans le binaire ; .so chargé au lancement par ld.so.' },
    { q: 'Ordre de recherche de ld.so ?', r: 'rpath → LD_LIBRARY_PATH → cache ldconfig (ld.so.conf.d) → /lib, /usr/lib.' },
    { q: 'Ajouter un répertoire de bibliothèques au système ?', r: 'Fichier dans /etc/ld.so.conf.d/ puis `ldconfig`.' },
    { q: 'Pourquoi pas LD_LIBRARY_PATH global ?', r: 'Touche tous les programmes, conflits ; script enveloppe ou rpath.' },
    { q: '« missing separator » ?', r: 'Commande d’une règle make sans tabulation.' },
    { q: 'Simuler make install ?', r: '`make -n install`' },
    { q: '$@ et $< ?', r: 'Cible ; première dépendance.' },
    { q: 'Dépendances d’un binaire sans l’exécuter ?', r: '`readelf -d` ou `objdump -p` (pas ldd sur un binaire non fiable).' },
  ],
  memo: `
    ### Compiler et lier
    \`\`\`
    apt install build-essential        dnf group install "Development Tools"
    cc -o prog prog.c     cc -c a.c     cc -o prog a.o b.o -L/rép -lnom
    cc -I/rép/include -DDEBUG -c a.c   cc -E a.c   cc ... -Wl,-rpath=/opt/x/lib
    \`\`\`
    | Message | Étape | Remède |
    |---|---|---|
    | \`x.h: No such file\` | compilation | -I, paquet -dev/-devel |
    | \`undefined reference\` | édition de liens | -l, -L |
    | \`error while loading shared libraries\` | lancement | ld.so.conf.d + ldconfig, rpath |

    ### Bibliothèques partagées
    \`\`\`
    ldd prog   ldconfig   ldconfig -p | grep x   /etc/ld.so.conf.d/x.conf
    readelf -d prog | grep -E 'NEEDED|RUNPATH'   LD_DEBUG=libs prog   nm -D lib.so
    \`\`\`

    ### make
    \`\`\`
    cible: dépendances
    <TAB>commande
    make   make cible   make -n install   make CC=clang CFLAGS="-O2"   make -f f   make -j4
    CC CFLAGS CPPFLAGS LDFLAGS LDLIBS   $@ $< $*   all clean distclean install check
    \`\`\`
  `,
});
