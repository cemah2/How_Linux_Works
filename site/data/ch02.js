/* Chapitre 2 : Basic Commands and Directory Hierarchy (livre p. 11–46). Partie 1 : fiches 2.1 à 2.8. */
HLW.chapitre({
  id: '02',
  num: 2,
  intro: `
    C’est le chapitre le plus long du bloc et le plus important pour un débutant : la **boîte à outils** que tu
    utiliseras dans tout le reste du livre. Le livre parle souvent de « Unix » plutôt que de « Linux » : ces commandes
    fonctionnent aussi sur BSD ou macOS, et beaucoup correspondent directement à des appels système du noyau.

    Les fiches suivent les sections du livre. Deux fiches **« Au-delà du livre »** complètent le chapitre avec ce
    qu’exigent les certifications et le Lab 01 : les permissions spéciales et ACL (2.A), et la survie dans \`vi\` (2.B).

    Conseil : fais les exercices **avec un terminal ouvert sur ta VM**. Pour les questions « Prédire la sortie »,
    réfléchis d’abord, réponds, puis vérifie en tapant la commande.
  `,
  objectifs: [
    'te déplacer dans l’arborescence et manipuler fichiers et répertoires sans hésiter ;',
    'utiliser les jokers du shell, `grep`, `find`, `head`, `tail`, `sort` ;',
    'rediriger les entrées et sorties et enchaîner des commandes avec des tubes ;',
    'lire un message d’erreur Unix et en déduire la cause ;',
    'lister, suspendre et arrêter des processus ;',
    'lire et modifier des permissions, y compris en notation octale ;',
    'créer des liens symboliques et des archives compressées ;',
    'savoir ce que contient chaque grand répertoire du système ;',
    'utiliser et configurer `sudo` de façon sûre.',
  ],
  certifs: {
    lpic1: ['103.1', '103.2', '103.3', '103.4', '103.5', '103.7', '103.8', '104.5', '104.6', '104.7', '110.1'],
    lfcs: ['EC', 'UG'],
    rhcsa: ['R1', 'R4', 'R10'],
  },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '2.1',
      titre: 'Le shell, cat et les flux standard',
      sections: '§2.1 et 2.2', pages: '12–14',
      objectif: 'Comprendre ce que fait le shell et comment un programme lit et écrit ses données.',
      rappel: `
        ### Le shell

        Le **shell** exécute les commandes que tu tapes. Une commande peut être un programme (\`/usr/bin/ls\`) ou une
        fonctionnalité **intégrée** au shell (*built-in*, comme \`cd\`). Le shell est aussi un petit langage de
        programmation : beaucoup de parties du système sont des **scripts shell** (chapitre 11).

        Tous les shells Unix descendent du **Bourne shell**, \`/bin/sh\`. Linux utilise surtout **bash** (*Bourne-again shell*),
        une version enrichie.

        > **Ce qui a changé depuis le livre** : sur Debian (et Ubuntu), \`/bin/sh\` n’est pas un lien vers bash mais vers
        > **dash**, un shell plus léger et plus rapide pour les scripts système. Sur Rocky Linux, \`/bin/sh\` pointe bien vers bash.
        > Ton shell interactif, lui, est bash sur les deux.

        ### Anatomie d’une commande

        \`\`\`
        $ cat -n /etc/hostname
          │   │  └── argument : le fichier à traiter
          │   └───── option : modifie le comportement (commence par -)
          └───────── programme à exécuter
        \`\`\`

        ### cat et les flux standard

        \`cat fichier1 fichier2 …\` affiche le contenu des fichiers les uns après les autres (*concatenate*).

        Chaque processus dispose de **flux** d’entrée-sortie fournis par le noyau :

        - l’**entrée standard** (*stdin*) : là où il lit par défaut ;
        - la **sortie standard** (*stdout*) : là où il écrit ses résultats ;
        - l’**erreur standard** (*stderr*) : là où il écrit ses messages d’erreur (fiche 2.8).

        Lance \`cat\` **sans argument** : il attend. Il lit son entrée standard, reliée au clavier, et recopie chaque ligne
        sur sa sortie standard, reliée à l’écran. Pour terminer :

        - **Ctrl-D** sur une ligne vide envoie une **fin de fichier** (EOF) : \`cat\` comprend qu’il n’y a plus rien à lire et s’arrête proprement ;
        - **Ctrl-C** **interrompt** le programme, quoi qu’il soit en train de faire.

        La force de ces flux : on peut les brancher ailleurs que sur le terminal (un fichier, un autre programme). C’est l’objet de la fiche 2.8.
      `,
      aRetenir: [
        'Une commande = programme + options (`-x`) + arguments.',
        'Sans fichier en argument, beaucoup de commandes lisent l’entrée standard.',
        'Ctrl-D = fin de saisie (EOF) ; Ctrl-C = interruption.',
        'Debian : `/bin/sh` → dash ; Rocky : `/bin/sh` → bash.',
      ],
      exercices: [
        {
          id: 'c02-01-01', type: 'qcm', niveau: 1, ref: '§2.2.3, p. 14',
          enonce: 'Tu as lancé `cat` sans argument et tapé trois lignes, qui ont chacune été répétées. Comment **terminer proprement** la saisie ?',
          choix: ['Ctrl-D sur une ligne vide', 'Ctrl-Z', 'Taper `exit`', 'Taper `:q`'],
          reponse: 0,
          indices: ['`cat` lit tant que son entrée n’est pas terminée.', 'Il faut signaler une « fin de fichier ».', 'La touche de fin de fichier est Ctrl + la 4ᵉ lettre de l’alphabet.'],
          solution: '**Ctrl-D** sur une ligne vide envoie une fin de fichier (EOF) : `cat` n’a plus rien à lire et se termine. Ctrl-C fonctionnerait aussi mais *interrompt* le programme ; Ctrl-Z le suspend (fiche 2.10) ; `exit` et `:q` seraient simplement recopiés par `cat`.',
        },
        {
          id: 'c02-01-02', type: 'association', niveau: 1, ref: '§2.2.3, p. 14',
          enonce: 'Associe chaque notion à sa définition.',
          paires: [
            ['Ctrl-D', 'Signale la fin des données saisies (EOF)'],
            ['Ctrl-C', 'Interrompt le programme en cours'],
            ['Entrée standard (stdin)', 'Flux d’où un programme lit par défaut'],
            ['Sortie standard (stdout)', 'Flux où un programme écrit ses résultats'],
          ],
          indices: ['« Standard » = « par défaut ».', 'L’une des touches termine poliment, l’autre brutalement.', 'D comme « done », C comme « cancel ».'],
          solution: 'Ctrl-D : fin de fichier ; Ctrl-C : interruption ; stdin : entrée par défaut (le clavier) ; stdout : sortie par défaut (l’écran).',
        },
        {
          id: 'c02-01-03', type: 'commande', niveau: 1, ref: '§2.2.2, p. 13',
          enonce: 'Affiche à la suite le contenu des fichiers `entete.txt` puis `corps.txt`.',
          accepte: ['cat entete\\.txt corps\\.txt'],
          exemple: 'cat entete.txt corps.txt',
          pieges: [{ motif: 'cat corps\\.txt entete\\.txt', message: 'L’ordre des arguments compte : `cat` affiche les fichiers dans l’ordre donné.' }],
          indices: ['Le nom de la commande vient de « concatenate ».', 'Elle accepte plusieurs fichiers en arguments.', '`cat fichier1 fichier2`'],
          solution: '```\n$ cat entete.txt corps.txt\n```\n`cat` affiche les fichiers dans l’ordre des arguments. Avec une redirection (`> lettre.txt`, fiche 2.8), tu obtiendrais un fichier qui les réunit.',
        },
        {
          id: 'c02-01-04', type: 'reponse-courte', niveau: 1, mono: true, ref: '§2.2.1, p. 13',
          enonce: 'Dans la commande `grep -i erreur /var/log/boutique.log`, quel argument est une **option** ?',
          accepte: ['-i'],
          casse: true,
          indices: ['Une option modifie le comportement du programme.', 'Elle commence par un caractère particulier.', 'Elle commence par un tiret.'],
          solution: '`-i` est une option (ici : ignorer la casse). `grep` est le programme, `erreur` et `/var/log/boutique.log` sont des arguments.',
        },
        {
          id: 'c02-01-05', type: 'vrai-faux', niveau: 1, ref: '§2.1, p. 12',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Lancé sans nom de fichier, `cat` lit son entrée standard.', vrai: true },
            { texte: 'Sur Debian 13, `/bin/sh` est un lien vers bash.', vrai: false, explication: 'C’est **dash**. Sur Rocky Linux, c’est bien bash.' },
            { texte: 'Certaines commandes sont intégrées au shell lui-même.', vrai: true, explication: 'Par exemple `cd`, `export`, `echo` (qui existe aussi en programme).' },
            { texte: 'Le shell n’est qu’un lanceur : on ne peut pas programmer avec.', vrai: false, explication: 'C’est un vrai langage (variables, boucles, conditions) : chapitre 11.' },
          ],
          indices: ['Relis l’encadré « Ce qui a changé ».', 'Pense au chapitre 11 du livre.', 'Deux vraies, deux fausses.'],
          solution: 'Vrai, faux, vrai, faux.',
        },
        {
          id: 'c02-01-06', type: 'terminal', niveau: 2,
          enonce: `
            Sur **chacune** de tes deux VM, lance \`ls -l /bin/sh\` et colle les deux sorties.
            Vers quel shell pointe \`/bin/sh\` sur cuve (Debian) ? Et sur fut (Rocky) ?
          `,
          attendu: ['/bin/sh'],
          indices: ['`ls -l` affiche la cible d’un lien symbolique après une flèche `->`.', 'Il y a peut-être un lien vers un lien : suis la chaîne.', 'Debian : dash ; Rocky : bash.'],
          solution: '```\nadmin@cuve:~$ ls -l /bin/sh\nlrwxrwxrwx 1 root root 4 … /bin/sh -> dash\n[admin@fut ~]$ ls -l /bin/sh\nlrwxrwxrwx. 1 root root 4 … /bin/sh -> bash\n```\nConséquence pratique : un script qui commence par `#!/bin/sh` mais utilise des fonctionnalités propres à bash marchera sur Rocky et cassera sur Debian. Tu y reviendras au chapitre 11. (Le point après les permissions sur Rocky signale un contexte SELinux.)',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '2.2',
      titre: 'Les commandes de base : ls, cp, mv, touch, rm, echo',
      sections: '§2.3', pages: '15–16',
      objectif: 'Lister, copier, déplacer, créer et supprimer des fichiers.',
      rappel: `
        | Commande | Rôle | Exemples |
        |---|---|---|
        | \`ls\` | lister un répertoire | \`ls\`, \`ls -l\` (détaillé), \`ls -F\` (ajoute \`/\` aux répertoires, \`*\` aux exécutables) |
        | \`cp\` | copier | \`cp f1 f2\`, \`cp f rep/\`, \`cp f1 f2 f3 rep/\` |
        | \`mv\` | renommer ou déplacer | \`mv ancien nouveau\`, \`mv f rep/\` |
        | \`touch\` | créer un fichier vide, ou mettre à jour sa date | \`touch notes.txt\` |
        | \`rm\` | supprimer | \`rm fichier\` |
        | \`echo\` | afficher ses arguments | \`echo Bonjour\` |

        ### Lire \`ls -l\`

        \`\`\`
        -rw-r--r-- 1 bastien brasseurs 3804 May 28 10:40 recette-ipa.txt
        │          │ │       │         │    │            └ nom
        │          │ │       │         │    └ date de dernière modification
        │          │ │       │         └ taille en octets
        │          │ │       └ groupe
        │          │ └ propriétaire
        │          └ nombre de liens physiques (fiche 4.6)
        └ type et permissions (fiche 2.11)
        \`\`\`

        ### Points de vigilance

        - \`rm\` **ne passe pas par une corbeille** : un fichier supprimé est perdu, sauf sauvegarde.
        - \`cp\` et \`mv\` écrasent la destination sans prévenir. L’option \`-i\` demande confirmation.
        - Pour copier un **répertoire**, il faut \`cp -r\` (récursif). \`cp -a\` copie en plus les droits et les dates (archive).

        ### echo et le shell

        \`echo\` affiche ses arguments séparés par **un** espace. C’est le **shell** qui découpe la ligne en arguments :
        les espaces multiples entre les mots disparaissent avant même que \`echo\` soit lancé. Cela fait d’\`echo\` l’outil
        idéal pour voir ce que le shell fait de tes jokers (\`*\`) et de tes variables (\`$HOME\`).
      `,
      aRetenir: [
        '`cp source destination`, `mv source destination` : la destination peut être un répertoire.',
        '`rm` est définitif ; `-i` pour confirmer, `-r` pour les répertoires (avec prudence).',
        'Colonnes de `ls -l` : mode, liens, propriétaire, groupe, taille, date, nom.',
      ],
      exercices: [
        {
          id: 'c02-02-01', type: 'commande', niveau: 1, ref: '§2.3.2, p. 15',
          enonce: 'Copie le fichier `rapport.txt` dans le répertoire `/tmp`, en gardant son nom.',
          accepte: ['cp rapport\\.txt /tmp/?', 'cp rapport\\.txt /tmp/rapport\\.txt', 'cp -[aiv]+ rapport\\.txt /tmp/?'],
          exemple: 'cp rapport.txt /tmp',
          indices: ['La commande de copie a deux lettres.', 'Si la destination est un répertoire, le nom est conservé.', '`cp fichier répertoire`'],
          solution: '```\n$ cp rapport.txt /tmp\n```\nComme `/tmp` est un répertoire, la copie s’appelle `/tmp/rapport.txt`.',
        },
        {
          id: 'c02-02-02', type: 'commande', niveau: 1, ref: '§2.3.3, p. 16',
          enonce: 'Renomme `brouillon.txt` en `final.txt`.',
          accepte: ['mv (-[iv]+ )?brouillon\\.txt final\\.txt'],
          exemple: 'mv brouillon.txt final.txt',
          pieges: [{ motif: 'rename .*', message: '`rename` existe mais sert à des renommages en masse. La commande de base est plus courte.' }],
          indices: ['Sous Unix, renommer, c’est déplacer.', 'La commande vient de « move ».', '`mv ancien nouveau`'],
          solution: '```\n$ mv brouillon.txt final.txt\n```\nRenommer et déplacer sont la même opération pour le système : on change le chemin du fichier.',
        },
        {
          id: 'c02-02-03', type: 'commande', niveau: 1, ref: '§2.3.2, p. 15',
          enonce: 'Copie en une seule commande les fichiers `janvier.csv`, `fevrier.csv` et `mars.csv` dans le répertoire `trimestre1`.',
          accepte: ['cp (-[aiv]+ )?janvier\\.csv fevrier\\.csv mars\\.csv trimestre1/?'],
          exemple: 'cp janvier.csv fevrier.csv mars.csv trimestre1',
          indices: ['`cp` accepte plusieurs sources.', 'Le **dernier** argument est la destination.', '`cp f1 f2 f3 répertoire`'],
          solution: '```\n$ cp janvier.csv fevrier.csv mars.csv trimestre1\n```\nAvec plusieurs sources, la destination doit être un répertoire existant. (Avec les jokers de la fiche 2.3, `cp *.csv trimestre1` ferait aussi l’affaire.)',
        },
        {
          id: 'c02-02-04', type: 'qcm', niveau: 1, ref: '§2.3.4, p. 16',
          enonce: 'Le fichier `notes.txt` existe déjà et contient du texte. Que fait `touch notes.txt` ?',
          choix: ['Il met à jour la date de modification sans toucher au contenu', 'Il vide le fichier', 'Il affiche une erreur « File exists »', 'Il crée une copie `notes.txt.1`'],
          reponse: 0,
          indices: ['`touch` signifie « toucher ».', 'Il crée le fichier seulement s’il n’existe pas.', 'Regarde la colonne de date de `ls -l` avant et après.'],
          solution: '`touch` crée un fichier vide **s’il n’existe pas**. S’il existe, il met seulement à jour sa date de modification. C’est utile, par exemple, pour forcer `make` à recompiler (chapitre 15).',
        },
        {
          id: 'c02-02-05', type: 'association', niveau: 1, ref: '§2.3.1, p. 15',
          enonce: 'Voici une ligne de `ls -l` : `-rw-r----- 1 chloe compta 52714 Mar 3 09:12 bilan-2025.ods`. Associe chaque élément à sa signification.',
          paires: [
            ['`chloe`', 'Propriétaire du fichier'],
            ['`compta`', 'Groupe du fichier'],
            ['`52714`', 'Taille en octets'],
            ['`1`', 'Nombre de liens physiques'],
            ['`-rw-r-----`', 'Type de fichier et permissions'],
          ],
          indices: ['L’ordre des colonnes : mode, liens, propriétaire, groupe, taille, date, nom.', 'Le propriétaire est toujours avant le groupe.', 'Le nombre juste après le mode est le compteur de liens.'],
          solution: 'Mode `-rw-r-----`, 1 lien, propriétaire `chloe`, groupe `compta`, 52 714 octets, modifié le 3 mars à 9 h 12.',
        },
        {
          id: 'c02-02-06', type: 'sortie', niveau: 2, ref: '§2.3.6, p. 16',
          enonce: 'Qu’affiche cette commande ?\n\n```\n$ echo   Bonjour     tout   le    monde\n```',
          attendu: 'Bonjour tout le monde',
          indices: ['Qui découpe la ligne de commande en arguments : `echo` ou le shell ?', 'Le shell sépare les arguments sur les espaces, quel que soit leur nombre.', '`echo` reçoit quatre arguments et les sépare par un seul espace.'],
          solution: '```\nBonjour tout le monde\n```\nLe shell découpe la ligne en arguments (`Bonjour`, `tout`, `le`, `monde`) avant de lancer `echo`, qui les réaffiche séparés par un espace. Pour conserver les espaces, il faut des guillemets : `echo "Bonjour     tout"` (chapitre 11).',
        },
        {
          id: 'c02-02-07', type: 'vrai-faux', niveau: 1, ref: '§2.3, p. 15–16',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`rm` déplace les fichiers dans une corbeille d’où l’on peut les récupérer.', vrai: false, explication: 'Il n’y a pas de corbeille en ligne de commande : la suppression est définitive.' },
            { texte: '`mv rapport.txt archives/` déplace le fichier dans le répertoire `archives`.', vrai: true },
            { texte: '`ls -F` ajoute un `/` à la fin des noms de répertoires.', vrai: true },
            { texte: '`cp` copie un répertoire et son contenu sans option particulière.', vrai: false, explication: 'Il faut `-r` (ou `-a`).' },
          ],
          indices: ['Pense à ce qui se passe après un `rm` malheureux.', 'Copier un répertoire demande une option « récursive ».', 'Deux vraies, deux fausses.'],
          solution: 'Faux, vrai, vrai, faux.',
        },
        {
          id: 'c02-02-08', type: 'commande', niveau: 2,
          enonce: 'Copie le répertoire `recettes` **et tout son contenu** dans `/srv/sauvegarde/`.',
          accepte: ['cp -(r|R|a|rv|vr|Rv|vR|av|va|rp|pr|ra|ar) recettes/? /srv/sauvegarde/?', 'cp --(recursive|archive) recettes/? /srv/sauvegarde/?'],
          exemple: 'cp -r recettes /srv/sauvegarde/',
          pieges: [{ motif: 'cp recettes/? /srv/sauvegarde/?', message: 'Sans option, `cp` refuse de copier un répertoire (« omitting directory »).' }],
          indices: ['`cp` seul refuse les répertoires.', 'Il faut une option qui descend dans les sous-répertoires.', 'L’option « récursive » : `-r`.'],
          solution: '```\n$ cp -r recettes /srv/sauvegarde/\n```\n`-r` copie récursivement. `cp -a` fait de même en conservant propriétaires, droits et dates : c’est l’option à préférer pour une sauvegarde.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '2.3',
      titre: 'Naviguer : chemins, répertoires et jokers',
      sections: '§2.4', pages: '16–19',
      objectif: 'Se déplacer dans l’arborescence et désigner plusieurs fichiers d’un coup.',
      rappel: `
        ### Chemins

        L’arborescence commence à la **racine** \`/\`. Le séparateur est la barre oblique \`/\` (jamais la barre inverse \`\\\`).

        - Un chemin **absolu** commence par \`/\` : \`/usr/lib\`.
        - Un chemin **relatif** part du répertoire courant : \`X11\`, \`./script.sh\`, \`../bin\`.
        - \`.\` désigne le répertoire courant, \`..\` son parent, \`~\` ton répertoire personnel.

        Depuis \`/usr/lib\` : \`..\` vaut \`/usr\`, \`../bin\` vaut \`/usr/bin\`, \`./X11\` (ou \`X11\`) vaut \`/usr/lib/X11\`.

        ### Commandes

        | Commande | Rôle |
        |---|---|
        | \`cd rep\` | changer de répertoire courant ; \`cd\` seul ramène dans ton répertoire personnel ; \`cd -\` revient au précédent |
        | \`pwd\` | afficher le répertoire courant (fiche 2.4) |
        | \`mkdir rep\` | créer un répertoire ; \`mkdir -p a/b/c\` crée aussi les parents manquants |
        | \`rmdir rep\` | supprimer un répertoire **vide** |
        | \`rm -r rep\` | supprimer un répertoire et tout son contenu : **danger** |

        \`cd\` est **intégré au shell** : un programme séparé tournerait dans un processus enfant et ne pourrait pas changer
        le répertoire courant de son parent (le shell). Chaque processus a son propre répertoire courant.

        ### Les jokers (*globbing*)

        Le shell remplace les motifs par les noms de fichiers qui correspondent, **avant** de lancer la commande :

        | Motif | Correspond à |
        |---|---|
        | \`*\` | n’importe quelle suite de caractères (y compris vide) |
        | \`?\` | exactement un caractère |
        | \`at*\` | les noms qui commencent par *at* |
        | \`*at\` | les noms qui finissent par *at* |
        | \`*at*\` | les noms qui contiennent *at* |

        - Si **aucun** fichier ne correspond, bash laisse le motif tel quel : \`echo *xyz\` affiche \`*xyz\`.
        - Pour empêcher l’expansion, entoure le motif d’apostrophes : \`echo '*'\` affiche une étoile.
        - Oublie l’habitude Windows \`*.*\` : sous Unix, \`*.*\` ne désigne que les noms **contenant un point**. Pour tout désigner, \`*\` suffit.

        > Ne combine jamais \`rm -r\` avec un joker sans avoir vérifié ce qu’il désigne : tape d’abord \`echo motif\`.
      `,
      aRetenir: [
        'Absolu = commence par `/` ; relatif = part du répertoire courant ; `..` = parent.',
        '`cd` est intégré au shell ; `rmdir` ne supprime que les répertoires vides.',
        '`*` = n’importe quoi, `?` = un caractère ; expansion faite par le shell, avant la commande.',
        'Vérifier un joker avec `echo` avant un `rm`.',
      ],
      exercices: [
        {
          id: 'c02-03-01', type: 'qcm', niveau: 1, ref: '§2.4, p. 17',
          enonce: 'Lequel de ces chemins est **absolu** ?',
          choix: ['`/usr/lib`', '`../bin`', '`X11`', '`./sauvegarde.sh`'],
          reponse: 0,
          indices: ['Un chemin absolu ne dépend pas du répertoire courant.', 'Il part de la racine.', 'Il commence par `/`.'],
          solution: '`/usr/lib` commence par `/` : il est absolu. Les trois autres sont relatifs au répertoire courant.',
        },
        {
          id: 'c02-03-02', type: 'reponse-courte', niveau: 1, mono: true, casse: true, ref: '§2.4, p. 17',
          enonce: 'Tu es dans `/usr/lib`. Quel **chemin absolu** désigne le chemin relatif `../bin` ?',
          accepte: ['/usr/bin/?'],
          indices: ['`..` remonte d’un niveau.', 'Le parent de `/usr/lib` est `/usr`.', 'Ajoute `bin` au parent.'],
          solution: '`/usr/bin` : `..` remonte à `/usr`, puis on descend dans `bin`.',
        },
        {
          id: 'c02-03-03', type: 'sortie', niveau: 1,
          enonce: 'Qu’affiche la dernière commande ?\n\n```\n$ cd /var/log\n$ cd ../lib\n$ cd ..\n$ pwd\n```',
          attendu: '/var',
          indices: ['Suis le répertoire courant pas à pas.', 'Après la 2ᵉ commande, tu es dans `/var/lib`.', 'Puis tu remontes d’un niveau.'],
          solution: '`/var/log` → `../lib` donne `/var/lib` → `..` donne **`/var`**.',
        },
        {
          id: 'c02-03-04', type: 'commande', niveau: 2,
          enonce: 'Crée en **une seule commande** l’arborescence `projets/2026/etiquettes`, alors qu’aucun de ces répertoires n’existe.',
          accepte: ['mkdir -p projets/2026/etiquettes/?', 'mkdir --parents projets/2026/etiquettes/?', 'mkdir -pv projets/2026/etiquettes/?', 'mkdir -vp projets/2026/etiquettes/?'],
          exemple: 'mkdir -p projets/2026/etiquettes',
          pieges: [{ motif: 'mkdir projets/2026/etiquettes/?', message: 'Sans option, `mkdir` échoue si les répertoires parents n’existent pas (« No such file or directory »).' }],
          indices: ['`mkdir` seul exige que le parent existe déjà.', 'Une option demande de créer aussi les **parents**.', '`-p` comme *parents*.'],
          solution: '```\n$ mkdir -p projets/2026/etiquettes\n```\n`-p` crée les répertoires intermédiaires manquants, et ne se plaint pas s’ils existent déjà : pratique dans les scripts.',
        },
        {
          id: 'c02-03-05', type: 'qcm', niveau: 2, ref: '§2.4.1, note p. 17',
          enonce: 'Pourquoi `cd` est-il une commande **intégrée** au shell et non un programme séparé ?',
          choix: [
            'Un programme séparé tournerait dans un processus enfant et ne pourrait pas changer le répertoire courant du shell',
            'Parce qu’il doit s’exécuter en mode noyau',
            'Pour des raisons de vitesse uniquement',
            'Parce que seul root peut changer de répertoire',
          ],
          reponse: 0,
          indices: ['Chaque processus a son propre répertoire courant.', 'Rappelle-toi `fork()` + `exec()` (fiche 1.5) : la commande s’exécute dans un enfant.', 'Un enfant ne peut pas modifier l’état de son parent.'],
          solution: 'Le répertoire courant est un attribut **de chaque processus**. Un programme `cd` lancé par `fork()` + `exec()` changerait son propre répertoire, puis se terminerait : le shell parent n’aurait pas bougé. D’où la nécessité d’une commande intégrée.',
        },
        {
          id: 'c02-03-06', type: 'qcm', niveau: 2, multi: true, ref: '§2.4.4, p. 18',
          enonce: 'Le répertoire contient : `atelier`, `batte`, `chat`, `plateau`, `boat`, `brat`. Quels fichiers le motif `*at` désigne-t-il ?',
          choix: ['`chat`', '`boat`', '`brat`', '`atelier`', '`plateau`', '`batte`'],
          reponse: [0, 1, 2],
          indices: ['`*at` : n’importe quoi, puis « at » à la **fin**.', 'Le nom doit se terminer exactement par `at`.', 'Trois fichiers se terminent par « at ».'],
          solution: '`chat`, `boat`, `brat` se terminent par *at*. `atelier` commence par *at* (motif `at*`), `plateau` et `batte` le contiennent (motif `*at*`).',
        },
        {
          id: 'c02-03-07', type: 'reponse-courte', niveau: 2, casse: true, ref: '§2.4.4, p. 18',
          enonce: 'Même répertoire : `atelier`, `batte`, `chat`, `plateau`, `boat`, `brat`. Écris les noms désignés par `b?at`, séparés par un espace, dans l’ordre alphabétique.',
          accepte: ['boat brat'],
          indices: ['`?` remplace exactement **un** caractère.', 'Le nom fait donc 4 caractères : b, un caractère, a, t.', 'Deux noms correspondent.'],
          solution: '`boat` et `brat` : un `b`, un caractère quelconque, puis `at`. `batte` ne convient pas (5 caractères).',
        },
        {
          id: 'c02-03-08', type: 'sortie', niveau: 2, ref: '§2.4.4, p. 18',
          enonce: 'Aucun fichier du répertoire courant ne se termine par `xyz`. Qu’affiche cette commande ?\n\n```\n$ echo *xyz\n```',
          attendu: '*xyz',
          indices: ['Le shell tente de remplacer le motif par des noms de fichiers.', 'Que fait bash quand aucun nom ne correspond ?', 'Il laisse le motif tel quel.'],
          solution: '```\n*xyz\n```\nSans correspondance, bash transmet le motif littéralement. C’est à la commande de décider quoi en faire (ici, `echo` l’affiche).',
        },
        {
          id: 'c02-03-09', type: 'vrai-faux', niveau: 1, ref: '§2.4.3–2.4.4, p. 18–19',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`*.*` désigne tous les fichiers du répertoire.', vrai: false, explication: 'Seulement ceux dont le nom contient un point. Utilise `*`.' },
            { texte: 'Le shell développe les jokers avant de lancer la commande.', vrai: true },
            { texte: '`rmdir` supprime un répertoire même s’il contient des fichiers.', vrai: false, explication: 'Il ne supprime que les répertoires vides ; sinon `rm -r`.' },
            { texte: '`echo \'*\'` affiche une étoile, car les apostrophes empêchent l’expansion.', vrai: true },
          ],
          indices: ['Les extensions ne sont pas obligatoires sous Unix.', '`rmdir` est volontairement prudent.', 'Deux vraies, deux fausses.'],
          solution: 'Faux, vrai, faux, vrai.',
        },
        {
          id: 'c02-03-10', type: 'commande', niveau: 2, ref: '§2.4.3, p. 18',
          enonce: 'Supprime le répertoire `vieux-essais` **et tout son contenu**.',
          accepte: ['rm -(r|R|rf|fr|Rf|fR|rv|vr|ri|ir) vieux-essais/?', 'rm --recursive vieux-essais/?'],
          exemple: 'rm -r vieux-essais',
          pieges: [{ motif: 'rmdir vieux-essais/?', message: '`rmdir` refuse les répertoires non vides (« Directory not empty »).' }, { motif: 'rm vieux-essais/?', message: 'Sans option, `rm` refuse de supprimer un répertoire.' }],
          indices: ['`rmdir` ne suffit pas pour un répertoire plein.', '`rm` a besoin d’une option récursive.', '`rm -r`'],
          solution: '```\n$ rm -r vieux-essais\n```\nRelis toujours la commande avant d’appuyer sur Entrée. `-f` (forcer) supprime sans aucune question : à réserver aux cas où tu es absolument sûr.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '2.4',
      titre: 'Commandes intermédiaires : grep, less, find, head, tail, sort…',
      sections: '§2.5', pages: '19–22',
      objectif: 'Chercher dans des fichiers, les parcourir, les trouver et en extraire des morceaux.',
      rappel: `
        ### grep : chercher des lignes

        \`grep motif fichier…\` affiche les lignes qui contiennent le motif. Avec plusieurs fichiers, il préfixe chaque ligne par le nom du fichier.

        | Option | Effet |
        |---|---|
        | \`-i\` | ignorer la casse (majuscules et minuscules) |
        | \`-v\` | inverser : lignes qui **ne** contiennent **pas** le motif |
        | \`-E\` | expressions régulières étendues (\`egrep\` est un ancien synonyme) |
        | \`-c\` | compter les lignes trouvées au lieu de les afficher |
        | \`-r\` | chercher récursivement dans un répertoire |

        Le motif est une **expression régulière** (pas un joker du shell !) :

        | Expression | Signification |
        |---|---|
        | \`.\` | exactement un caractère quelconque |
        | \`.*\` | n’importe quelle suite de caractères, y compris vide |
        | \`.+\` | au moins un caractère (avec \`-E\`) |
        | \`^\` | début de ligne |
        | \`$\` | fin de ligne |

        ### Parcourir et comparer

        - \`less fichier\` : affiche page par page. **Espace** avance, **b** recule, **/mot** cherche vers le bas, **?mot** vers le haut, **n** passe à l’occurrence suivante, **q** quitte.
        - \`commande | less\` : parcourir une longue sortie.
        - \`pwd\` : répertoire courant ; \`pwd -P\` donne le vrai chemin en résolvant les liens symboliques.
        - \`diff f1 f2\` : différences entre deux fichiers ; \`diff -u\` produit le format « unifié » utilisé pour les correctifs.
        - \`file fichier\` : devine le type réel d’un fichier (texte, exécutable ELF, image…).

        ### Trouver des fichiers

        - \`find rep -name nom -print\` cherche en temps réel dans \`rep\`. Les jokers doivent être **protégés** du shell : \`find /etc -name '*.conf'\`.
          (\`-print\` est l’action par défaut sur les versions modernes de \`find\`.)
        - \`locate nom\` interroge un **index** construit périodiquement : très rapide, mais il ne voit pas les fichiers créés depuis la dernière indexation (et n’est pas toujours installé).

        ### Extraire et trier

        - \`head fichier\` : les 10 premières lignes ; \`head -n 5\` (ou \`head -5\`) : les 5 premières.
        - \`tail fichier\` : les 10 dernières ; \`tail -n 20\` ; \`tail -n +5\` : à partir de la ligne 5 ; \`tail -f\` : suit le fichier en direct (journaux).
        - \`sort\` : trie les lignes par ordre **alphanumérique** ; \`-n\` trie numériquement ; \`-r\` inverse.

        > **Bonus utile** (hors livre, au programme LPIC 103.2) : \`wc -l\` compte les lignes, \`cut -d: -f1\` extrait un champ,
        > \`uniq\` supprime les doublons consécutifs (après un \`sort\`), \`tr a-z A-Z\` transforme des caractères.
      `,
      aRetenir: [
        '`grep -i` (casse), `-v` (inverse), `-E` (étendu), `-c` (compte), `-r` (récursif).',
        'Regex : `.` un caractère, `.*` n’importe quoi, `^` début, `$` fin.',
        '`find rep -name \'motif\'` : guillemets obligatoires autour des jokers.',
        '`head`/`tail -n N`, `tail -f` ; `sort -n` pour les nombres.',
      ],
      exercices: [
        {
          id: 'c02-04-01', type: 'commande', niveau: 1, ref: '§2.5.1, p. 19',
          enonce: 'Affiche les lignes de `/etc/passwd` qui contiennent le mot `admin`.',
          accepte: ['grep [\'"]?admin[\'"]? /etc/passwd', 'cat /etc/passwd \\| grep [\'"]?admin[\'"]?'],
          exemple: 'grep admin /etc/passwd',
          indices: ['La commande qui cherche des lignes dans un fichier.', 'Syntaxe : commande motif fichier.', '`grep motif /etc/passwd`'],
          solution: '```\n$ grep admin /etc/passwd\nadmin:x:1000:1000::/home/admin:/bin/bash\n```\n`cat /etc/passwd | grep admin` marche aussi, mais lance un processus inutile.',
        },
        {
          id: 'c02-04-02', type: 'commande', niveau: 1, ref: '§2.5.1, p. 19',
          enonce: 'Affiche les lignes de `/etc/passwd` qui **ne** contiennent **pas** `nologin`.',
          accepte: ['grep -v [\'"]?nologin[\'"]? /etc/passwd', 'grep --invert-match [\'"]?nologin[\'"]? /etc/passwd'],
          exemple: 'grep -v nologin /etc/passwd',
          indices: ['Il faut inverser la sélection.', 'L’option d’inversion de `grep` est une seule lettre.', '`-v`'],
          solution: '```\n$ grep -v nologin /etc/passwd\n```\nTu obtiens les comptes qui ont un vrai shell (ou `/bin/false`, `/bin/sync`…). Utile pour repérer les comptes capables de se connecter.',
        },
        {
          id: 'c02-04-03', type: 'commande', niveau: 1, ref: '§2.5.1, p. 19',
          enonce: 'Cherche le mot `erreur` dans `boutique.log` **sans tenir compte des majuscules** (pour trouver aussi `Erreur` et `ERREUR`).',
          accepte: ['grep -i [\'"]?erreur[\'"]? boutique\\.log', 'grep --ignore-case [\'"]?erreur[\'"]? boutique\\.log'],
          exemple: 'grep -i erreur boutique.log',
          indices: ['Il existe une option pour ignorer la casse.', 'Le mot anglais est *ignore case*.', '`-i`'],
          solution: '```\n$ grep -i erreur boutique.log\n```',
        },
        {
          id: 'c02-04-04', type: 'association', niveau: 2, ref: '§2.5.1, p. 19 et tableau 2-1',
          enonce: 'Associe chaque élément d’expression régulière à sa signification.',
          paires: [
            ['`.`', 'Exactement un caractère quelconque'],
            ['`.*`', 'N’importe quelle suite de caractères, même vide'],
            ['`.+` (avec -E)', 'Au moins un caractère'],
            ['`^`', 'Début de ligne'],
            ['`$`', 'Fin de ligne'],
          ],
          indices: ['Attention : en expression régulière, `.` n’est pas un point littéral.', '`*` répète l’élément précédent zéro fois ou plus ; `+`, une fois ou plus.', '`^` et `$` sont des ancres.'],
          solution: 'Ne confonds pas avec les jokers du shell : en regex, l’équivalent du `*` du shell est `.*`. Exemple : `grep \'^admin\' /etc/passwd` trouve les lignes qui **commencent** par admin.',
        },
        {
          id: 'c02-04-05', type: 'association', niveau: 1, ref: '§2.5.2, p. 20',
          enonce: 'Dans `less`, associe chaque touche à son action.',
          paires: [
            ['Espace', 'Avancer d’un écran'],
            ['`b`', 'Reculer d’un écran'],
            ['`/mot`', 'Chercher « mot » vers le bas'],
            ['`n`', 'Aller à l’occurrence suivante'],
            ['`q`', 'Quitter'],
          ],
          indices: ['b comme *back*, q comme *quit*, n comme *next*.', 'La barre oblique introduit une recherche.', 'Espace = page suivante.'],
          solution: 'Ces touches sont les mêmes dans `man` (qui utilise `less`) : à connaître par cœur.',
        },
        {
          id: 'c02-04-06', type: 'commande', niveau: 2, ref: '§2.5.6, p. 21',
          enonce: 'Trouve tous les fichiers dont le nom se termine par `.conf` sous `/etc`.',
          accepte: ['find /etc -name (\'\\*\\.conf\'|"\\*\\.conf"|\\\\\\*\\.conf)( -print)?', 'find /etc -type f -name (\'\\*\\.conf\'|"\\*\\.conf")( -print)?'],
          exemple: "find /etc -name '*.conf'",
          pieges: [{ motif: 'find /etc -name \\*?\\.conf( -print)?', message: 'Sans guillemets, le shell développe `*.conf` **avant** de lancer `find` (s’il trouve des .conf dans le répertoire courant). Protège le motif : `\'*.conf\'`.' }],
          indices: ['`find répertoire -name motif`', 'Le joker doit arriver intact jusqu’à `find`.', 'Entoure le motif d’apostrophes : `\'*.conf\'`.'],
          solution: "```\n$ find /etc -name '*.conf'\n```\nLes apostrophes empêchent le shell de développer `*.conf` lui-même. Ajoute `2>/dev/null` pour masquer les « Permission denied » (fiche 2.8), ou lance-la avec `sudo`.",
        },
        {
          id: 'c02-04-07', type: 'commande', niveau: 1, ref: '§2.5.7, p. 21',
          enonce: 'Affiche les **5 premières** lignes de `/etc/passwd`.',
          accepte: ['head -n ?5 /etc/passwd', 'head -5 /etc/passwd', 'head --lines=5 /etc/passwd'],
          exemple: 'head -n 5 /etc/passwd',
          indices: ['« Tête » en anglais.', 'L’option `-n` donne le nombre de lignes.', '`head -n 5 fichier`'],
          solution: '```\n$ head -n 5 /etc/passwd\n```\nForme courte acceptée : `head -5 /etc/passwd`.',
        },
        {
          id: 'c02-04-08', type: 'commande', niveau: 2,
          enonce: 'Suis **en direct** les nouvelles lignes ajoutées au fichier `boutique.log` (comme quand on surveille un journal pendant un test).',
          accepte: ['tail -f boutique\\.log', 'tail --follow boutique\\.log', 'tail -F boutique\\.log', 'tail -n ?\\d+ -f boutique\\.log', 'tail -f -n ?\\d+ boutique\\.log', 'less \\+F boutique\\.log'],
          exemple: 'tail -f boutique.log',
          indices: ['C’est une option de la commande qui affiche la fin d’un fichier.', '« Suivre » se dit *follow*.', '`tail -f`'],
          solution: '```\n$ tail -f boutique.log\n```\nCtrl-C pour arrêter. Pour les journaux systemd, l’équivalent est `journalctl -f` (chapitre 7).',
        },
        {
          id: 'c02-04-09', type: 'sortie', niveau: 2, lignes: 3, ref: '§2.5.8, p. 22',
          enonce: '`printf` écrit ici les lignes `10`, `9` et `100`. Qu’affiche la commande ?\n\n```\n$ printf \'10\\n9\\n100\\n\' | sort\n```',
          attendu: '10\n100\n9',
          indices: ['Sans option, `sort` compare des **caractères**, pas des nombres.', 'Le caractère « 1 » vient avant « 9 ».', '« 10 » et « 100 » commencent par « 1 » ; « 10 » est un préfixe de « 100 ».'],
          solution: '```\n10\n100\n9\n```\nTri alphanumérique : caractère par caractère. Avec `sort -n`, on obtient `9`, `10`, `100`.',
        },
        {
          id: 'c02-04-10', type: 'qcm', niveau: 1, ref: '§2.5.6, p. 21',
          enonce: 'Tu viens de créer `inventaire.ods`, mais `locate inventaire` ne le trouve pas, alors que `find` le trouve. Pourquoi ?',
          choix: ['`locate` interroge un index qui n’a pas encore été mis à jour', '`locate` ne cherche que dans `/usr`', '`locate` ignore les fichiers .ods', 'Le fichier est caché'],
          reponse: 0,
          indices: ['`locate` est beaucoup plus rapide que `find` : il ne parcourt pas le disque.', 'D’où vient sa rapidité ?', 'Il consulte une base construite périodiquement.'],
          solution: '`locate` lit un **index** reconstruit périodiquement (`updatedb`). Un fichier créé depuis la dernière indexation y est absent. `find` parcourt réellement le disque.',
        },
        {
          id: 'c02-04-11', type: 'commande', niveau: 2, ref: '§2.5.4, p. 21',
          enonce: 'Compare `ancien.conf` et `nouveau.conf` au format **unifié** (celui qu’on envoie à un collègue ou qu’utilisent les correctifs).',
          accepte: ['diff -u ancien\\.conf nouveau\\.conf', 'diff --unified ancien\\.conf nouveau\\.conf'],
          exemple: 'diff -u ancien.conf nouveau.conf',
          indices: ['La commande qui affiche des différences.', 'Le format unifié a sa propre option d’une lettre.', '`-u`'],
          solution: '```\n$ diff -u ancien.conf nouveau.conf\n--- ancien.conf\n+++ nouveau.conf\n@@ -3 +3 @@\n-Port 22\n+Port 2222\n```\nLes lignes `-` sont retirées, les lignes `+` ajoutées. C’est aussi le format de `patch` (chapitre 16) et de `git diff`.',
        },
        {
          id: 'c02-04-12', type: 'terminal', niveau: 1, ref: '§2.5.5, p. 21',
          enonce: 'Sur ta VM, lance `file /bin/ls /etc/passwd /dev/null` et colle la sortie. Quels types sont reconnus ?',
          attendu: ['ELF'],
          indices: ['`file` examine le contenu, pas l’extension.', '`/bin/ls` est un programme compilé.', 'ELF est le format des exécutables Linux.'],
          solution: '```\n/bin/ls:     ELF 64-bit LSB pie executable, x86-64, …\n/etc/passwd: ASCII text\n/dev/null:   character special (1/3)\n```\n`file` reconnaît un exécutable **ELF**, un fichier texte, et un **périphérique en mode caractère** (chapitre 3).',
        },
        {
          id: 'c02-04-13', type: 'commande', niveau: 3,
          enonce: 'Bonus : affiche **le nombre** de comptes de `/etc/passwd` dont le shell est `/bin/bash` (une seule ligne de résultat, un nombre).',
          accepte: ['grep -c [\'"]?/bin/bash[\'"]? /etc/passwd', 'grep [\'"]?/bin/bash[\'"]? /etc/passwd \\| wc -l', 'grep -c [\'"]?bash\\$?[\'"]? /etc/passwd', 'grep [\'"]?bash\\$?[\'"]? /etc/passwd \\| wc -l', 'grep -c [\'"]?/bin/bash\\$[\'"]? /etc/passwd', 'grep [\'"]?/bin/bash\\$[\'"]? /etc/passwd \\| wc -l'],
          exemple: 'grep -c /bin/bash /etc/passwd',
          indices: ['Tu sais déjà afficher les lignes qui contiennent `/bin/bash`.', 'Il reste à **compter** ces lignes : option de `grep`, ou commande `wc`.', '`grep -c` ou `… | wc -l`'],
          solution: '```\n$ grep -c /bin/bash /etc/passwd\n2\n```\nOu `grep /bin/bash /etc/passwd | wc -l`. Version plus stricte : `grep -c \'/bin/bash$\' /etc/passwd` (le shell est le **dernier** champ).',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '2.5',
      titre: 'Mot de passe, shell de connexion et fichiers cachés',
      sections: '§2.6 et 2.7', pages: '22',
      objectif: 'Gérer son propre compte et comprendre les « dot files ».',
      rappel: `
        ### Ton compte

        - \`passwd\` change ton mot de passe (l’ancien d’abord, puis le nouveau deux fois).
          Préfère une **phrase longue** et absurde, facile à retenir : la longueur compte plus que les caractères spéciaux (16 caractères ou plus).
        - \`chsh\` change ton shell de connexion (\`chsh -s /bin/zsh\`). Le livre suppose bash : reste sur bash pendant le parcours.

        ### Les fichiers « point »

        Les fichiers et répertoires dont le nom commence par un point (\`.bashrc\`, \`.profile\`, \`.ssh/\`) sont des
        **dot files** : souvent des fichiers de configuration. Ils n’ont rien de spécial, si ce n’est que :

        - \`ls\` ne les affiche pas sans l’option \`-a\` (\`-A\` les montre sans \`.\` ni \`..\`) ;
        - les jokers comme \`*\` ne les désignent pas ; il faut un motif qui commence par un point : \`.*\`.

        > **Ce qui a changé depuis le livre.** Le livre prévient que \`.*\` désigne aussi \`.\` et \`..\` (le répertoire courant
        > et son parent), ce qui rend \`rm -r .*\` catastrophique. Depuis **bash 5.2** (Debian 13, Rocky 10), l’option
        > \`globskipdots\`, active par défaut, exclut \`.\` et \`..\`. **Mais** dash (\`/bin/sh\` sur Debian) et d’autres shells
        > les incluent toujours. La règle de prudence reste donc valable dans les scripts : utilise \`.[!.]*\` ou \`.??*\`
        > pour désigner les fichiers cachés sans \`.\` ni \`..\`.
      `,
      aRetenir: [
        '`passwd` : changer son mot de passe ; `chsh` : changer de shell.',
        'Fichiers cachés = nom qui commence par un point ; `ls -a` pour les voir.',
        '`*` ne désigne pas les fichiers cachés ; `.*` oui (et `.`/`..` selon le shell).',
      ],
      exercices: [
        {
          id: 'c02-05-01', type: 'commande', niveau: 1, ref: '§2.7, p. 22',
          enonce: 'Liste le contenu du répertoire courant **y compris les fichiers cachés**.',
          accepte: ['ls -(a|A|la|al|lA|Al|aF|Fa)', 'ls --all', 'ls --almost-all', 'ls -l -a', 'ls -a -l'],
          exemple: 'ls -a',
          indices: ['Les fichiers cachés commencent par un point.', '`ls` a une option pour tout (*all*) afficher.', '`ls -a`'],
          solution: '```\n$ ls -a\n.  ..  .bash_logout  .bashrc  .profile  .ssh\n```\n`ls -A` fait de même sans afficher `.` et `..`.',
        },
        {
          id: 'c02-05-02', type: 'qcm', niveau: 1, ref: '§2.6, p. 22',
          enonce: 'Quel mot de passe suit le mieux les conseils du livre ?',
          choix: ['`cuve-verte-chante-sous-la-pluie-1987`', '`P@ss1`', '`Brasserie2026!`', '`azerty`'],
          reponse: 0,
          indices: ['Le livre insiste sur un critère avant tout.', 'Une phrase absurde est facile à retenir et difficile à deviner.', 'Le critère, c’est la longueur.'],
          solution: 'Le premier : une **phrase longue** et absurde (plus de 30 caractères), facile à retenir. `Brasserie2026!` est trop prévisible (nom de l’entreprise + année + point d’exclamation), les autres trop courts.',
        },
        {
          id: 'c02-05-03', type: 'sortie', niveau: 2, ref: '§2.7, p. 22',
          enonce: 'Le répertoire contient `.bashrc`, `.profile` et `notes.txt`. Qu’affiche la commande ?\n\n```\n$ echo *\n```',
          attendu: 'notes.txt',
          indices: ['`*` correspond à n’importe quoi… avec une exception.', 'Les fichiers cachés ne sont pas désignés par `*`.', 'Il ne reste qu’un fichier visible.'],
          solution: '```\nnotes.txt\n```\nLe joker `*` ignore les noms qui commencent par un point.',
        },
        {
          id: 'c02-05-04', type: 'vrai-faux', niveau: 2, ref: '§2.7, note p. 22',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un fichier « point » a un attribut spécial qui le cache aux yeux du système.', vrai: false, explication: 'Rien de spécial : c’est une simple convention respectée par `ls` et les jokers.' },
            { texte: 'Avec bash 5.2 ou plus récent, `echo .*` n’affiche plus `.` ni `..`.', vrai: true, explication: 'Grâce à l’option `globskipdots`, active par défaut.' },
            { texte: 'Dans un script lancé par dash (`#!/bin/sh` sur Debian), `.*` peut encore désigner `..`.', vrai: true },
            { texte: '`.[!.]*` désigne les fichiers cachés sans `.` ni `..`.', vrai: true },
          ],
          indices: ['Le comportement de `.*` dépend du shell et de sa version.', 'dash n’a pas l’option `globskipdots`.', 'Une seule affirmation est fausse.'],
          solution: 'Faux, vrai, vrai, vrai. Morale : ne compte pas sur la version du shell, écris des motifs explicites.',
        },
        {
          id: 'c02-05-05', type: 'commande', niveau: 2, ref: '§2.6, p. 22',
          enonce: 'Change ton shell de connexion pour `/bin/zsh` (une fois zsh installé).',
          accepte: ['chsh -s /(usr/)?bin/zsh', 'chsh --shell /(usr/)?bin/zsh', 'chsh -s /(usr/)?bin/zsh \\w+', 'sudo chsh -s /(usr/)?bin/zsh \\w+'],
          exemple: 'chsh -s /bin/zsh',
          indices: ['*change shell*', 'L’option `-s` indique le nouveau shell.', '`chsh -s chemin`'],
          solution: '```\n$ chsh -s /bin/zsh\n```\nLe changement prend effet à la prochaine connexion. Pour revenir : `chsh -s /bin/bash`.',
        },
        {
          id: 'c02-05-06', type: 'terminal', niveau: 1,
          enonce: 'Sur ta VM, liste les fichiers cachés de ton répertoire personnel (`ls -a ~`) et colle la sortie. Lesquels reconnais-tu ?',
          attendu: ['\\.(bashrc|profile|bash_profile|ssh)'],
          indices: ['`~` désigne ton répertoire personnel.', 'Tu dois voir des fichiers de configuration du shell.', '`.bashrc` et `.profile` (ou `.bash_profile` sur Rocky).'],
          solution: 'Sur Debian : `.bashrc`, `.profile`, `.bash_logout`, `.ssh/`. Sur Rocky : `.bashrc`, `.bash_profile`, `.bash_logout`, `.ssh/`. Ce sont les fichiers de démarrage du shell (chapitre 13) et tes clés SSH autorisées.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '2.6',
      titre: 'Variables, PATH, caractères spéciaux et édition de la ligne',
      sections: '§2.8 à 2.11', pages: '22–25',
      objectif: 'Comprendre comment le shell trouve les commandes et transmet sa configuration aux programmes.',
      rappel: `
        ### Variables du shell et variables d’environnement

        \`\`\`
        $ BRASSIN=ipa          # variable du shell (pas d’espace autour du =)
        $ echo $BRASSIN        # $ devant le nom pour lire la valeur
        ipa
        $ export BRASSIN       # en fait une variable d’environnement
        \`\`\`

        - Une **variable du shell** n’existe que dans le shell.
        - Une **variable d’environnement** est transmise à **tous les programmes lancés** par le shell (ils en héritent).
          Beaucoup de programmes lisent leur configuration dans l’environnement (la section ENVIRONMENT des pages de manuel les décrit).
        - \`env\` ou \`printenv\` affichent l’environnement.

        ### PATH

        \`PATH\` contient la liste des répertoires où le shell cherche les commandes, séparés par \`:\`.
        Le shell lance le **premier** programme trouvé dans l’ordre de la liste.

        \`\`\`
        $ echo $PATH
        /usr/local/bin:/usr/bin:/bin
        $ PATH=/opt/outils/bin:$PATH     # ajouter un répertoire au début (prioritaire)
        $ PATH=$PATH:/opt/outils/bin     # … ou à la fin
        $ type ls cd                     # comment le shell interprète un nom
        \`\`\`

        Si tu casses ton \`PATH\` par erreur, pas de panique : ce n’est pas permanent. Ouvre un nouveau shell.

        ### Caractères spéciaux

        Il faut savoir les **nommer** pour en parler (en anglais dans la documentation) :

        | Caractère | Nom | Usage principal |
        |---|---|---|
        | \`*\` | *star*, étoile | joker, expression régulière |
        | \`.\` | *dot*, point | répertoire courant, séparateur |
        | \`!\` | *bang* | négation, historique |
        | \`|\` | *pipe*, barre verticale | tube |
        | \`~\` | *tilde* | répertoire personnel |
        | \`$\` | *dollar* | variables, fin de ligne |
        | \`#\` | *hash* | commentaire |
        | \`\\\` | *backslash* | échappement (jamais dans les chemins) |

        ### Éditer la ligne de commande

        Les flèches marchent, mais les raccourcis Ctrl fonctionnent dans beaucoup d’autres programmes Unix :

        | Raccourci | Action |
        |---|---|
        | Ctrl-A / Ctrl-E | début / fin de ligne |
        | Ctrl-B / Ctrl-F | un caractère à gauche / à droite |
        | Ctrl-P / Ctrl-N | commande précédente / suivante |
        | Ctrl-W | effacer le mot précédent |
        | Ctrl-U / Ctrl-K | effacer jusqu’au début / jusqu’à la fin de la ligne |
        | Ctrl-Y | coller ce qui vient d’être effacé |
        | Ctrl-R | rechercher dans l’historique (Échap pour sortir) |
      `,
      aRetenir: [
        '`VAR=valeur` sans espace ; `$VAR` pour lire ; `export VAR` pour la transmettre aux programmes.',
        '`PATH` : répertoires séparés par `:`, le premier qui contient la commande gagne.',
        'Ctrl-A, Ctrl-E, Ctrl-W, Ctrl-U, Ctrl-K, Ctrl-Y, Ctrl-R.',
      ],
      exercices: [
        {
          id: 'c02-06-01', type: 'commande', niveau: 1, ref: '§2.8, p. 23',
          enonce: 'Donne la valeur `brasserie` à une variable du shell nommée `SOCIETE`.',
          accepte: ['SOCIETE=brasserie', 'SOCIETE=[\'"]brasserie[\'"]'],
          exemple: 'SOCIETE=brasserie',
          pieges: [{ motif: 'SOCIETE ?= ?brasserie', message: 'Pas d’espace autour du `=` : sinon le shell croit que `SOCIETE` est une commande.' }, { motif: '\\$SOCIETE=.*', message: 'Pas de `$` pour **affecter** une valeur ; le `$` sert à **lire** la variable.' }, { motif: '(set|export) .*', message: 'Une simple affectation suffit ici (l’`export` viendra après).' }],
          indices: ['L’affectation utilise le signe `=`.', 'Aucun espace, et pas de `$` devant le nom.', '`NOM=valeur`'],
          solution: '```\n$ SOCIETE=brasserie\n$ echo $SOCIETE\nbrasserie\n```',
        },
        {
          id: 'c02-06-02', type: 'sortie', niveau: 2, lignes: 2, ref: '§2.8, p. 23',
          enonce: '`bash -c \'…\'` lance un **nouveau** shell (un processus enfant) qui exécute la commande entre apostrophes. Qu’affichent ces commandes ?\n\n```\n$ A=un\n$ bash -c \'echo "A=$A"\'\n$ export A\n$ bash -c \'echo "A=$A"\'\n```',
          attendu: 'A=\nA=un',
          indices: ['Le shell enfant ne voit que les variables **d’environnement** de son parent.', 'Avant `export`, `A` n’est qu’une variable du shell.', 'Première ligne vide après le `=`, seconde avec la valeur.'],
          solution: '```\nA=\nA=un\n```\nAvant `export`, `A` est une variable du shell : l’enfant ne la reçoit pas. Après `export`, elle fait partie de l’environnement transmis à chaque programme lancé.',
        },
        {
          id: 'c02-06-03', type: 'commande', niveau: 1, ref: '§2.8, p. 23',
          enonce: 'Transforme la variable du shell `SOCIETE` en variable d’environnement.',
          accepte: ['export SOCIETE', 'export SOCIETE=\\$SOCIETE', 'declare -x SOCIETE'],
          exemple: 'export SOCIETE',
          indices: ['Il faut l’« exporter » vers l’environnement.', 'Commande intégrée au shell.', '`export NOM`'],
          solution: '```\n$ export SOCIETE\n```\nRaccourci courant : `export SOCIETE=brasserie` affecte et exporte en une fois.',
        },
        {
          id: 'c02-06-04', type: 'commande', niveau: 2, ref: '§2.9, p. 24',
          enonce: 'Ajoute le répertoire `/opt/outils/bin` **au début** de ton `PATH`, sans perdre les répertoires existants.',
          accepte: ['(export )?PATH=/opt/outils/bin/?:\\$PATH', '(export )?PATH="/opt/outils/bin/?:\\$PATH"', '(export )?PATH=/opt/outils/bin/?:\\$\\{PATH\\}', '(export )?PATH="/opt/outils/bin/?:\\$\\{PATH\\}"'],
          exemple: 'PATH=/opt/outils/bin:$PATH',
          pieges: [{ motif: '(export )?PATH="?\\$PATH:/opt/outils/bin/?"?', message: 'Ceci ajoute le répertoire à la **fin** : il serait consulté en dernier.' }, { motif: '(export )?PATH="?/opt/outils/bin/?"?', message: 'Attention : tu remplaces tout le PATH ! Plus aucune commande habituelle ne serait trouvée.' }],
          indices: ['La nouvelle valeur doit contenir l’ancienne : `$PATH`.', 'Le séparateur est le deux-points.', '`PATH=nouveau:$PATH`'],
          solution: '```\n$ PATH=/opt/outils/bin:$PATH\n```\nLe shell remplace `$PATH` par l’ancienne valeur avant d’affecter. Pour que ce soit permanent, il faudra l’écrire dans un fichier de démarrage (chapitre 13).',
        },
        {
          id: 'c02-06-05', type: 'qcm', niveau: 2, ref: '§2.9, p. 23',
          enonce: 'Un programme `deploy` existe dans `/usr/local/bin` **et** dans `/usr/bin`. Ton PATH vaut `/usr/local/bin:/usr/bin:/bin`. Que lance la commande `deploy` ?',
          choix: ['`/usr/local/bin/deploy`', '`/usr/bin/deploy`', 'Les deux, l’un après l’autre', 'Rien : le shell signale une ambiguïté'],
          reponse: 0,
          indices: ['Le shell parcourt les répertoires du PATH dans l’ordre.', 'Il s’arrête au premier programme trouvé.', 'Quel répertoire est le premier de la liste ?'],
          solution: '`/usr/local/bin/deploy`, car `/usr/local/bin` vient en premier. C’est voulu : l’administrateur peut ainsi remplacer une commande du système par sa propre version. `type deploy` ou `which deploy` te diront laquelle est utilisée.',
        },
        {
          id: 'c02-06-06', type: 'association', niveau: 1, ref: '§2.11, tableau 2-2, p. 25',
          enonce: 'Associe chaque raccourci clavier à son action.',
          paires: [
            ['Ctrl-A', 'Aller au début de la ligne'],
            ['Ctrl-E', 'Aller à la fin de la ligne'],
            ['Ctrl-W', 'Effacer le mot précédent'],
            ['Ctrl-U', 'Effacer du curseur jusqu’au début de la ligne'],
            ['Ctrl-K', 'Effacer du curseur jusqu’à la fin de la ligne'],
            ['Ctrl-Y', 'Coller le texte effacé'],
          ],
          indices: ['A comme la première lettre de l’alphabet (début), E comme *end*.', 'W comme *word*, K comme *kill* (la fin), Y comme *yank* (tirer, coller).', 'U efface vers le début.'],
          solution: 'Entraîne-toi : tape une longue commande, Ctrl-A, Ctrl-K, puis Ctrl-Y pour la récupérer. Ces raccourcis marchent aussi dans `man`, `less`, la plupart des invites interactives et même dans les champs de texte de macOS.',
        },
        {
          id: 'c02-06-07', type: 'association', niveau: 1, ref: '§2.10, tableau 2-1, p. 24–25',
          enonce: 'Associe chaque caractère à son nom anglais (celui que tu liras dans la documentation).',
          paires: [
            ['`|`', 'pipe'],
            ['`~`', 'tilde'],
            ['`!`', 'bang'],
            ['`#`', 'hash'],
            ['`\\`', 'backslash'],
          ],
          indices: ['Le tube se dit *pipe*.', 'Le point d’exclamation a un nom court et bruyant.', 'La barre inverse se dit *backslash*, le dièse *hash*.'],
          solution: 'Le livre recommande de connaître ces noms pour échanger avec d’autres administrateurs : « pipe ls into less », « shebang » (`#!`, chapitre 11)…',
        },
        {
          id: 'c02-06-08', type: 'qcm', niveau: 2, ref: '§2.9, note p. 24',
          enonce: 'Tu as tapé `PATH=/opt/bin` par erreur. Maintenant `ls` répond « command not found ». Quelle est la solution la plus simple ?',
          choix: ['Fermer ce shell et en ouvrir un nouveau', 'Réinstaller le paquet coreutils', 'Redémarrer la machine en mode secours', 'Supprimer `/opt/bin`'],
          reponse: 0,
          indices: ['La modification n’a été faite que dans ce shell.', 'Elle n’est écrite dans aucun fichier.', 'Un nouveau shell repart avec le PATH par défaut.'],
          solution: 'La variable n’a changé **que dans ce shell**. Un nouveau shell (nouvel onglet, nouvelle connexion SSH) retrouve le PATH normal. En attendant, tu peux toujours appeler une commande par son chemin complet : `/usr/bin/ls`.',
        },
        {
          id: 'c02-06-09', type: 'terminal', niveau: 2,
          enonce: 'Sur ta VM, lance `echo $PATH` puis `type ls cd echo`. Colle la sortie. Lesquelles de ces commandes sont des programmes, lesquelles sont intégrées au shell ?',
          attendu: [':', 'builtin|intégrée'],
          indices: ['`type` indique comment le shell interprète un nom.', 'Il peut répondre « is /usr/bin/… », « is a shell builtin » ou « is aliased to… ».', '`cd` et `echo` sont intégrées ; `ls` est souvent un alias de `ls --color=auto`.'],
          solution: '```\n$ type ls cd echo\nls is aliased to `ls --color=auto\'\ncd is a shell builtin\necho is a shell builtin\n```\n`ls` est un alias (chapitre 13) vers le programme `/usr/bin/ls`. `echo` existe aussi en programme (`/usr/bin/echo`), mais la version intégrée est prioritaire.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '2.7',
      titre: 'Éditeurs de texte et documentation en ligne',
      sections: '§2.12 et 2.13', pages: '25–28',
      objectif: 'Savoir trouver l’information sur la machine elle-même.',
      rappel: `
        ### Choisir un éditeur

        Presque toute la configuration d’un système Linux tient dans des **fichiers texte** (dans \`/etc\` notamment).
        Il te faut un éditeur que tu maîtrises. Les deux classiques sont **vi** (et sa version améliorée **vim**) et **Emacs**.
        Le livre conseille de ne pas s’installer dans un éditeur trop simple comme nano. En pratique : nano dépanne,
        mais **vi est présent sur toutes les machines**, y compris en mode secours. La fiche **2.B** t’apprend à y survivre.

        ### Les pages de manuel

        \`\`\`
        $ man ls              # la page de manuel de ls
        $ man -k partition    # chercher par mot-clé (équivalent : apropos)
        $ man 5 passwd        # la page de la section 5 (format du fichier /etc/passwd)
        $ ls --help           # résumé rapide des options
        $ info coreutils      # documentation GNU au format info
        \`\`\`

        Une page de manuel est une **référence**, pas un tutoriel : elle liste tout, sans dire ce qui est important.
        On cite une page avec sa section entre parenthèses : \`ping(8)\`, \`passwd(5)\`.

        | Section | Contenu |
        |---|---|
        | 1 | commandes utilisateur |
        | 2 | appels système du noyau |
        | 3 | bibliothèques de programmation |
        | 4 | interfaces des périphériques et pilotes |
        | 5 | formats des fichiers (configuration) |
        | 6 | jeux |
        | 7 | conventions, formats, encodages |
        | 8 | commandes d’administration et serveurs |

        Les sections 1, 5, 7 et 8 sont les plus utiles pour ce livre. Quand un nom existe dans plusieurs sections,
        \`man\` affiche la première trouvée : précise la section si besoin.

        Enfin, certains paquets déposent leur documentation dans \`/usr/share/doc\`.
      `,
      aRetenir: [
        '`man commande`, `man -k mot`, `man N page`, `commande --help`.',
        'Sections clés : 1 commandes, 2 appels système, 5 fichiers de config, 8 administration.',
        'Documentation supplémentaire : `info`, `/usr/share/doc`.',
      ],
      exercices: [
        {
          id: 'c02-07-01', type: 'commande', niveau: 1, ref: '§2.13, p. 26',
          enonce: 'Ouvre la page de manuel de la commande `tar`.',
          accepte: ['man tar', 'man 1 tar'],
          exemple: 'man tar',
          indices: ['*manual*', 'Trois lettres, puis le nom de la commande.', '`man tar`'],
          solution: '```\n$ man tar\n```\nNavigue avec les touches de `less` (fiche 2.4) : `/` pour chercher, `q` pour quitter.',
        },
        {
          id: 'c02-07-02', type: 'commande', niveau: 1, ref: '§2.13, p. 26–27',
          enonce: 'Tu ne connais pas le nom de la commande, mais tu sais qu’elle concerne les **partitions**. Cherche les pages de manuel par mot-clé.',
          accepte: ['man -k partitions?', 'apropos partitions?', 'man --apropos partitions?'],
          exemple: 'man -k partition',
          indices: ['`man` a une option de recherche par mot-clé.', 'La lettre vient de *keyword*.', '`man -k mot`'],
          solution: '```\n$ man -k partition\nfdisk (8)  - manipulate disk partition table\nparted (8) - a partition manipulation program\n…\n```\n`apropos partition` est équivalent.',
        },
        {
          id: 'c02-07-03', type: 'association', niveau: 1, ref: '§2.13, tableau 2-3, p. 27',
          enonce: 'Associe chaque section du manuel à son contenu.',
          paires: [
            ['Section 1', 'Commandes utilisateur'],
            ['Section 2', 'Appels système du noyau'],
            ['Section 3', 'Bibliothèques de programmation'],
            ['Section 5', 'Formats des fichiers de configuration'],
            ['Section 8', 'Commandes d’administration système'],
          ],
          indices: ['1 est la plus courante.', 'Les appels système (`fork`, `open`) sont juste après les commandes.', '`passwd(5)` décrit le fichier `/etc/passwd` ; `ping(8)` est une commande d’administration.'],
          solution: '1 commandes, 2 appels système, 3 bibliothèques, 5 fichiers, 8 administration.',
        },
        {
          id: 'c02-07-04', type: 'commande', niveau: 2, ref: '§2.13, p. 27',
          enonce: 'Affiche la page de manuel qui décrit le **format du fichier** `/etc/passwd` (et non la commande `passwd`).',
          accepte: ['man 5 passwd', 'man -s ?5 passwd', 'man passwd\\.5', 'man \'passwd\\(5\\)\''],
          exemple: 'man 5 passwd',
          indices: ['Le nom `passwd` existe dans plusieurs sections.', 'Les formats de fichiers sont dans une section précise.', 'Section 5.'],
          solution: '```\n$ man 5 passwd\n```\n`man passwd` seul afficherait la section 1 (la commande).',
        },
        {
          id: 'c02-07-05', type: 'reponse-courte', niveau: 1, ref: '§2.13 et §1.3.4',
          enonce: 'Dans quelle **section** du manuel trouves-tu la page de l’appel système `fork` ? (un chiffre)',
          accepte: ['2'],
          indices: ['Les appels système ont leur propre section.', 'Elle suit immédiatement celle des commandes utilisateur.', '`man 2 fork`'],
          solution: 'Section **2** : `man 2 fork`.',
        },
        {
          id: 'c02-07-06', type: 'vrai-faux', niveau: 1, ref: '§2.13, p. 26–28',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Les pages de manuel sont conçues comme des tutoriels pour débutants.', vrai: false, explication: 'Ce sont des références : complètes, mais sèches.' },
            { texte: '`commande --help` affiche souvent un résumé des options.', vrai: true },
            { texte: '`info` est le format de documentation préféré du projet GNU.', vrai: true },
            { texte: 'Des paquets installent leur documentation dans `/usr/share/doc`.', vrai: true },
          ],
          indices: ['Le livre a une opinion très claire sur le style des pages de manuel.', 'Trois affirmations sont vraies.', 'GNU a créé texinfo.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
        {
          id: 'c02-07-07', type: 'terminal', niveau: 1,
          enonce: 'Sur ta VM, lance `man -k sort | head` et colle la sortie. Repère le numéro de section de la commande `sort`.',
          attendu: ['sort'],
          indices: ['Si `man -k` ne renvoie rien, la base n’est pas construite : lance `sudo mandb`.', 'La section apparaît entre parenthèses.', 'Sur les images cloud minimales, les pages de manuel peuvent manquer : installe le paquet `man-db` (Debian) ou `man-pages` (Rocky).'],
          solution: 'Tu dois voir une ligne `sort (1) - sort lines of text files`. Sur une image cloud minimale, il peut falloir installer la documentation (`sudo apt install man-db manpages` ou `sudo dnf install man-db man-pages`) puis construire l’index avec `sudo mandb`.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '2.8',
      titre: 'Redirections et tubes',
      sections: '§2.14', pages: '28–29',
      objectif: 'Envoyer la sortie d’une commande dans un fichier ou vers une autre commande.',
      rappel: `
        Chaque processus a trois flux numérotés : **0** entrée standard, **1** sortie standard, **2** erreur standard.
        Le shell peut les rediriger **avant** de lancer la commande.

        | Syntaxe | Effet |
        |---|---|
        | \`cmd > f\` | sortie standard vers le fichier \`f\` (créé, ou **écrasé** s’il existe) |
        | \`cmd >> f\` | sortie standard **ajoutée** à la fin de \`f\` |
        | \`cmd1 | cmd2\` | **tube** : la sortie standard de cmd1 devient l’entrée standard de cmd2 |
        | \`cmd 2> e\` | erreur standard vers le fichier \`e\` |
        | \`cmd > f 2>&1\` | sortie **et** erreurs vers \`f\` |
        | \`cmd < f\` | le fichier \`f\` devient l’entrée standard de cmd |
        | \`cmd 2> /dev/null\` | jeter les messages d’erreur (pseudo-périphérique, fiche 1.5) |

        Exemples :

        \`\`\`
        $ head /proc/cpuinfo | tr a-z A-Z          # tube : mettre en majuscules
        $ ls /inexistant > f 2> e                  # résultats dans f, erreurs dans e
        $ find / -name passwd 2>/dev/null          # sans les « Permission denied »
        \`\`\`

        ### Pièges classiques

        - \`>\` écrase sans prévenir. \`set -C\` (option *noclobber*) protège les fichiers existants dans le shell courant.
        - L’ordre compte : dans \`cmd > f 2>&1\`, on envoie d’abord 1 vers \`f\`, puis 2 « au même endroit que 1 », donc dans \`f\`.
          Dans \`cmd 2>&1 > f\`, 2 est copié vers la destination **actuelle** de 1 (le terminal) avant que 1 parte dans \`f\` :
          les erreurs restent à l’écran.
        - bash propose le raccourci \`cmd &> f\` (sortie et erreurs), qui n’existe pas dans tous les shells.
      `,
      aRetenir: [
        '`>` écrase, `>>` ajoute, `|` enchaîne, `<` alimente l’entrée.',
        '0 = stdin, 1 = stdout, 2 = stderr ; `2>` redirige les erreurs.',
        '`> f 2>&1` : tout dans f (l’ordre compte).',
        '`2>/dev/null` pour jeter les erreurs.',
      ],
      exercices: [
        {
          id: 'c02-08-01', type: 'commande', niveau: 1, ref: '§2.14, p. 28',
          enonce: 'Enregistre la sortie de `ls -l /etc` dans le fichier `liste.txt` (en l’écrasant s’il existe).',
          accepte: ['ls -l /etc/? ?> ?liste\\.txt', 'ls -l /etc/? 1> ?liste\\.txt'],
          exemple: 'ls -l /etc > liste.txt',
          pieges: [{ motif: 'ls -l /etc/? ?>> ?liste\\.txt', message: '`>>` **ajoute** à la fin du fichier ; on voulait l’écraser.' }],
          indices: ['Il faut rediriger la sortie standard.', 'Le caractère ressemble à une flèche vers le fichier.', '`commande > fichier`'],
          solution: '```\n$ ls -l /etc > liste.txt\n```',
        },
        {
          id: 'c02-08-02', type: 'commande', niveau: 1, ref: '§2.14, p. 28',
          enonce: 'Ajoute la date du jour (commande `date`) **à la fin** du fichier `journal.txt`, sans effacer son contenu.',
          accepte: ['date ?>> ?journal\\.txt', 'date 1>> ?journal\\.txt'],
          exemple: 'date >> journal.txt',
          pieges: [{ motif: 'date ?> ?journal\\.txt', message: 'Avec un seul `>`, le contenu existant serait effacé.' }],
          indices: ['Un seul `>` écraserait le fichier.', 'Il existe une variante qui ajoute.', 'Double chevron : `>>`.'],
          solution: '```\n$ date >> journal.txt\n```',
        },
        {
          id: 'c02-08-03', type: 'commande', niveau: 1, ref: '§2.14, p. 28',
          enonce: 'Affiche les 10 premières lignes de `/proc/cpuinfo` **en majuscules**, en envoyant la sortie de `head` dans `tr a-z A-Z`.',
          accepte: ['head (-n ?10 |-10 )?/proc/cpuinfo \\| tr a-z A-Z', 'head (-n ?10 |-10 )?/proc/cpuinfo \\| tr \'a-z\' \'A-Z\'', 'head (-n ?10 |-10 )?/proc/cpuinfo \\| tr \'\\[:lower:\\]\' \'\\[:upper:\\]\'', 'head (-n ?10 |-10 )?/proc/cpuinfo \\| tr \\[:lower:\\] \\[:upper:\\]'],
          exemple: 'head /proc/cpuinfo | tr a-z A-Z',
          indices: ['On relie deux commandes avec un tube.', 'Le tube est la barre verticale.', '`head /proc/cpuinfo | tr a-z A-Z`'],
          solution: '```\n$ head /proc/cpuinfo | tr a-z A-Z\n```\nLe tube relie la sortie standard de `head` à l’entrée standard de `tr`. Tu peux enchaîner autant de commandes que tu veux.',
        },
        {
          id: 'c02-08-04', type: 'commande', niveau: 2, ref: '§2.14.1, p. 29',
          enonce: 'Lance `find / -name \'*.conf\'` en envoyant les **résultats** dans `resultats.txt` et les **erreurs** dans `erreurs.txt`.',
          accepte: ['find / -name (\'\\*\\.conf\'|"\\*\\.conf") ?> ?resultats\\.txt 2> ?erreurs\\.txt', 'find / -name (\'\\*\\.conf\'|"\\*\\.conf") 2> ?erreurs\\.txt ?> ?resultats\\.txt', 'find / -name (\'\\*\\.conf\'|"\\*\\.conf") 1> ?resultats\\.txt 2> ?erreurs\\.txt'],
          exemple: "find / -name '*.conf' > resultats.txt 2> erreurs.txt",
          indices: ['La sortie standard se redirige avec `>`.', 'L’erreur standard est le flux numéro 2.', '`> resultats.txt 2> erreurs.txt`'],
          solution: "```\n$ find / -name '*.conf' > resultats.txt 2> erreurs.txt\n```\nEn simple utilisateur, `erreurs.txt` se remplit de « Permission denied » : tous les répertoires ne te sont pas accessibles.",
        },
        {
          id: 'c02-08-05', type: 'commande', niveau: 2,
          enonce: 'Cherche les fichiers nommés `passwd` dans tout le système, **en jetant** les messages d’erreur.',
          accepte: ['find / -name [\'"]?passwd[\'"]? 2> ?/dev/null', 'find / 2> ?/dev/null -name [\'"]?passwd[\'"]?'],
          exemple: 'find / -name passwd 2>/dev/null',
          indices: ['Où peut-on envoyer des données pour qu’elles disparaissent ?', 'Un pseudo-périphérique de la fiche 1.5.', '`2>/dev/null`'],
          solution: '```\n$ find / -name passwd 2>/dev/null\n/etc/passwd\n/usr/bin/passwd\n…\n```\n`/dev/null` avale tout ce qu’on y écrit.',
        },
        {
          id: 'c02-08-06', type: 'trous', niveau: 2, ref: '§2.14.1, p. 29',
          enonce: 'Complète pour envoyer **sortie standard et erreurs** dans le même fichier `sauvegarde.log`.',
          texte: '$ ./sauvegarde.sh [[1]] sauvegarde.log [[2]]',
          trous: [
            { accepte: ['>', '1>'], exemple: '>' },
            { accepte: ['2>&1', '2>& 1'], exemple: '2>&1' },
          ],
          indices: ['Redirige d’abord la sortie standard vers le fichier.', 'Puis envoie le flux 2 « au même endroit que » le flux 1.', '`> fichier 2>&1`'],
          solution: '```\n$ ./sauvegarde.sh > sauvegarde.log 2>&1\n```\nEn bash, `&> sauvegarde.log` est un raccourci équivalent.',
        },
        {
          id: 'c02-08-07', type: 'sortie', niveau: 2, lignes: 3,
          enonce: 'Qu’affiche la dernière commande ?\n\n```\n$ echo un > f\n$ echo deux > f\n$ echo trois >> f\n$ cat f\n```',
          attendu: 'deux\ntrois',
          indices: ['Le deuxième `>` écrase ce que le premier avait écrit.', '`>>` ajoute à la fin.', 'Deux lignes.'],
          solution: '```\ndeux\ntrois\n```\n`un` a été écrasé par `deux`, puis `trois` a été ajouté.',
        },
        {
          id: 'c02-08-08', type: 'qcm', niveau: 3,
          enonce: 'Où s’affiche le message d’erreur de cette commande ?\n\n```\n$ ls /inexistant 2>&1 > f\n```',
          choix: ['Dans le terminal', 'Dans le fichier `f`', 'Nulle part', 'Dans `/dev/null`'],
          reponse: 0,
          indices: ['Les redirections sont traitées de gauche à droite.', '`2>&1` copie la destination **actuelle** du flux 1.', 'Au moment où `2>&1` est traité, le flux 1 pointe encore vers le terminal.'],
          solution: 'Dans le **terminal**. `2>&1` fait pointer le flux 2 vers la destination *actuelle* du flux 1, c’est-à-dire le terminal ; ensuite seulement, `> f` redirige le flux 1 vers `f`. Le fichier `f` est donc vide. Pour tout envoyer dans `f`, écris `> f 2>&1`.',
        },
        {
          id: 'c02-08-09', type: 'association', niveau: 1, ref: '§2.14.1, p. 29',
          enonce: 'Associe chaque numéro de flux à son nom.',
          paires: [
            ['0', 'Entrée standard (stdin)'],
            ['1', 'Sortie standard (stdout)'],
            ['2', 'Erreur standard (stderr)'],
          ],
          indices: ['L’entrée vient en premier.', 'Le flux redirigé par défaut par `>` est le 1.', '`2>` redirige les erreurs.'],
          solution: '0 stdin, 1 stdout, 2 stderr. Ces numéros sont des **descripteurs de fichiers**, que tu retrouveras avec `lsof` (chapitre 8).',
        },
        {
          id: 'c02-08-10', type: 'vrai-faux', niveau: 1, ref: '§2.14, p. 28–29',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`cmd > f` écrase le contenu de `f` s’il existe.', vrai: true },
            { texte: '`set -C` empêche `>` d’écraser un fichier existant.', vrai: true },
            { texte: 'Un tube `|` transmet les messages d’erreur de la première commande à la seconde.', vrai: false, explication: 'Seule la **sortie standard** passe dans le tube ; les erreurs restent à l’écran (sauf `2>&1` avant le tube, ou `|&` en bash).' },
            { texte: '`head < /etc/passwd` affiche les premières lignes de `/etc/passwd`.', vrai: true },
          ],
          indices: ['Le tube relie stdout à stdin.', 'Une seule affirmation est fausse.', '`<` alimente l’entrée standard.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Ctrl-D ou Ctrl-C pour terminer `cat` lancé sans argument ?', r: '**Ctrl-D** (fin de fichier) termine proprement ; Ctrl-C interrompt.' },
    { q: 'Vers quoi pointe `/bin/sh` sur Debian ? sur Rocky ?', r: 'Debian : **dash**. Rocky : **bash**.' },
    { q: 'Les colonnes de `ls -l` ?', r: 'Mode, liens, propriétaire, groupe, taille, date, nom.' },
    { q: 'Copier un répertoire et son contenu ?', r: '`cp -r src dest` (ou `cp -a` pour garder droits et dates).' },
    { q: 'Que fait `touch` sur un fichier existant ?', r: 'Il met à jour sa date de modification, sans toucher au contenu.' },
    { q: 'Pourquoi `cd` est-il intégré au shell ?', r: 'Un programme enfant ne peut pas changer le répertoire courant de son parent.' },
    { q: 'Différence `*` et `?` en joker ?', r: '`*` : n’importe quelle suite (même vide) ; `?` : exactement un caractère.' },
    { q: 'Que fait bash si un joker ne correspond à rien ?', r: 'Il laisse le motif tel quel (`echo *xyz` affiche `*xyz`).' },
    { q: 'Supprimer un répertoire vide ? non vide ?', r: '`rmdir rep` ; `rm -r rep` (prudence).' },
    { q: '`grep` : ignorer la casse ? inverser ? compter ?', r: '`-i`, `-v`, `-c`.' },
    { q: 'En regex, que signifient `.`, `.*`, `^`, `$` ?', r: 'Un caractère ; n’importe quelle suite ; début de ligne ; fin de ligne.' },
    { q: 'Chercher les `.conf` sous /etc avec find ?', r: '`find /etc -name \'*.conf\'` (apostrophes obligatoires).' },
    { q: 'find ou locate : lequel voit un fichier créé il y a une minute ?', r: '`find` (locate dépend d’un index périodique).' },
    { q: 'Suivre un journal en direct ?', r: '`tail -f fichier` (ou `journalctl -f`).' },
    { q: '`sort` sur 10, 9, 100 ? et `sort -n` ?', r: '`sort` : 10, 100, 9. `sort -n` : 9, 10, 100.' },
    { q: 'Voir les fichiers cachés ?', r: '`ls -a` (ou `ls -A` sans `.` et `..`).' },
    { q: 'Variable du shell vs variable d’environnement ?', r: 'La seconde est transmise aux programmes lancés (`export VAR`).' },
    { q: 'Ajouter /opt/bin en tête du PATH ?', r: '`PATH=/opt/bin:$PATH`' },
    { q: 'Ctrl-A, Ctrl-E, Ctrl-W, Ctrl-U, Ctrl-K, Ctrl-Y ?', r: 'Début, fin, effacer mot, effacer jusqu’au début, effacer jusqu’à la fin, coller.' },
    { q: 'Sections 1, 2, 5, 8 du manuel ?', r: 'Commandes, appels système, formats de fichiers, administration.' },
    { q: 'Chercher une page de manuel par mot-clé ?', r: '`man -k mot` (ou `apropos mot`).' },
    { q: '`>` vs `>>` ?', r: '`>` écrase le fichier, `>>` ajoute à la fin.' },
    { q: 'Envoyer sortie et erreurs dans le même fichier ?', r: '`cmd > f 2>&1` (ou `cmd &> f` en bash).' },
    { q: 'Jeter les erreurs d’une commande ?', r: '`cmd 2>/dev/null`' },
  ],
  memo: `
    ### Fichiers et répertoires
    \`\`\`
    ls -l  ls -a  ls -F         lister (détaillé, cachés, types)
    cp src dst   cp -r rep dst  copier (répertoire : -r, ou -a pour tout garder)
    mv src dst                  renommer / déplacer
    touch f                     créer vide / mettre à jour la date
    rm f   rm -r rep            supprimer (définitif !)
    mkdir rep   mkdir -p a/b/c  créer
    rmdir rep                   supprimer un répertoire vide
    cd rep  cd  cd -  cd ..     changer de répertoire
    pwd   pwd -P                répertoire courant (réel)
    \`\`\`

    ### Chercher, lire, extraire
    \`\`\`
    grep motif f   -i -v -c -r -E      chercher des lignes
    less f   (espace b /mot ?mot n q)  parcourir
    head -n 5 f   tail -n 20 f   tail -f f
    sort  sort -n  sort -r             trier
    diff -u a b                        comparer
    file f                             type réel d’un fichier
    find rep -name '*.conf'            trouver (temps réel)
    locate nom                         trouver (index)
    wc -l   cut -d: -f1   uniq   tr a-z A-Z
    \`\`\`

    ### Jokers et regex
    | Joker (shell) | Regex (grep) |
    |---|---|
    | \`*\` n’importe quoi | \`.*\` n’importe quoi |
    | \`?\` un caractère | \`.\` un caractère |
    | | \`^\` début, \`$\` fin |

    ### Variables
    \`\`\`
    VAR=valeur   echo $VAR   export VAR   env
    PATH=/opt/bin:$PATH      type cmd     which cmd
    \`\`\`

    ### Redirections
    | Syntaxe | Effet |
    |---|---|
    | \`> f\` / \`>> f\` | écraser / ajouter |
    | \`2> e\` | erreurs vers e |
    | \`> f 2>&1\` | tout vers f |
    | \`2>/dev/null\` | jeter les erreurs |
    | \`< f\` | f en entrée |
    | \`a | b\` | tube |

    ### Aide
    \`\`\`
    man cmd   man -k mot   man 5 passwd   cmd --help   info cmd   /usr/share/doc
    \`\`\`
  `,
});
