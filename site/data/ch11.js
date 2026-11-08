/* Chapitre 11 : Introduction to Shell Scripts (livre p. 291–314). */
HLW.chapitre({
  id: '11',
  num: 11,
  intro: `
    Un script shell, c’est la liste des commandes que tu taperais à la main, enregistrée dans un fichier. C’est
    l’outil quotidien de l’administrateur : automatiser une sauvegarde, vérifier des dizaines de serveurs, préparer
    des comptes. Ce chapitre couvre ce qu’il faut pour écrire des scripts **corrects** : les **guillemets** (la
    première source de bogues), les **variables spéciales**, les **codes de sortie**, les **conditions** et les
    **boucles**, les fichiers temporaires, et une boîte d’outils (\`awk\`, \`sed\`, \`xargs\`…).

    Une fiche hors livre ajoute ce qu’on attend d’un script de production : \`set -euo pipefail\`, des fonctions,
    \`shellcheck\`. Le **Lab 09** te fera écrire de vrais scripts d’exploitation pour la brasserie.
  `,
  objectifs: [
    'écrire un script exécutable avec sa ligne #! et le rendre utilisable depuis le PATH ;',
    'choisir entre guillemets simples, doubles et pas de guillemets, et prédire le résultat ;',
    'utiliser $1, $#, $@, $0, $$ et $? ;',
    'écrire des conditions avec test/[ ], &&, ||, case, et des boucles for/while ;',
    'gérer des fichiers temporaires proprement (mktemp, trap) et produire du texte avec un here document ;',
    'combiner basename, awk, sed, xargs, read dans un script ;',
    'écrire un script robuste (set -euo pipefail, fonctions) et le vérifier avec shellcheck.',
  ],
  certifs: { lpic1: ['103.7', '105.2'], lfcs: ['EC', 'OD'], rhcsa: ['R3'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '11.1',
      titre: 'Les bases d’un script',
      sections: '§11.1', pages: '291–293',
      objectif: 'Créer un script, le rendre exécutable et le lancer.',
      rappel: `
        \`\`\`
        #!/bin/bash
        # inventaire : affiche l'état rapide du serveur
        echo "Machine : $(hostname)"
        uptime
        df -h /
        \`\`\`

        - La première ligne **\`#!\`** (« shebang ») indique au noyau quel interpréteur lancer : \`#!/bin/sh\` (shell
          POSIX, plus portable) ou \`#!/bin/bash\` (si tu utilises des fonctions propres à bash). C’est le noyau qui la lit,
          au moment de l’\`exec\` (fiche 1.4).
        - \`#\` ailleurs : commentaire.
        - Pour lancer le script par son nom, il lui faut le droit **d’exécution** **et** de **lecture** (le shell doit lire
          le fichier) : \`chmod +rx inventaire\`.

        \`\`\`
        $ chmod +x inventaire
        $ ./inventaire                 # chemin explicite : le répertoire courant n'est pas dans PATH
        $ sudo install -m 755 inventaire /usr/local/bin/   # disponible pour tous, par son nom
        $ bash inventaire              # sans droit d'exécution : on lance l'interpréteur soi-même
        $ bash -x inventaire           # trace chaque commande avant de l'exécuter (débogage)
        \`\`\`

        **Limites** (§11.1.1) : le shell est fait pour enchaîner des commandes et manipuler des fichiers. Pour du calcul,
        des structures de données ou de longs traitements de texte, Python ou un autre langage conviennent mieux. Un script
        shell qui dépasse quelques centaines de lignes est un signal d’alarme.
      `,
      aRetenir: [
        '`#!/bin/sh` ou `#!/bin/bash` en première ligne ; lue par le noyau.',
        'Droits lecture + exécution ; `./script` (le répertoire courant n’est pas dans PATH).',
        '`install -m 755 script /usr/local/bin/` pour l’installer ; `bash -x script` pour tracer.',
        'Le shell enchaîne des commandes ; pour le reste, un vrai langage.',
      ],
      exercices: [
        {
          id: 'c11-01-01', type: 'trous', niveau: 1, ref: '§11.1, p. 292',
          enonce: 'Complète la première ligne d’un script qui doit être exécuté par **bash**.',
          texte: '[[1]]/bin/bash',
          trous: [{ accepte: ['#!'], exemple: '#!' }],
          indices: ['Deux caractères.', 'Un dièse et un point d’exclamation.', 'On l’appelle shebang.'],
          solution: '```\n#!/bin/bash\n```',
        },
        {
          id: 'c11-01-02', type: 'qcm', niveau: 1, ref: '§11.1',
          enonce: 'Le script `inventaire` est dans le répertoire courant, exécutable. `inventaire` répond « command not found ». Pourquoi ?',
          choix: [
            'Le répertoire courant n’est pas dans PATH : il faut taper ./inventaire',
            'Il manque la ligne #!',
            'Le script n’est pas lisible',
            'Il faut le renommer en inventaire.sh',
          ],
          reponse: 0,
          indices: ['Comment le shell trouve-t-il une commande (fiche 2.6) ?', 'Il cherche dans les répertoires de PATH.', '. n’en fait pas partie.'],
          solution: 'Le shell cherche les commandes dans les répertoires de PATH, qui ne contient pas le répertoire courant (par sécurité). `./inventaire` donne un chemin explicite.',
        },
        {
          id: 'c11-01-03', type: 'commande', niveau: 1, ref: '§11.1',
          enonce: 'Lance le script `./inventaire` en **affichant chaque commande** avant son exécution (mode trace).',
          accepte: ['bash -x \\./inventaire', 'bash -x inventaire', 'sh -x \\./inventaire', 'bash -xv \\./inventaire'],
          exemple: 'bash -x ./inventaire',
          indices: ['On lance l’interpréteur avec une option.', 'x comme *xtrace*.', '`bash -x ./inventaire`'],
          solution: '```\n$ bash -x ./inventaire\n++ hostname\n+ echo \'Machine : cuve\'\nMachine : cuve\n+ uptime\n…\n```\nDans un script, `set -x` active la trace à partir de cette ligne.',
        },
        {
          id: 'c11-01-04', type: 'commande', niveau: 2,
          enonce: 'Installe le script `inventaire` dans `/usr/local/bin`, avec les droits `755`, en une commande.',
          accepte: ['(sudo )?install -m ?755 inventaire /usr/local/bin/?', '(sudo )?install -m ?755 \\./inventaire /usr/local/bin/?', '(sudo )?install -m ?755 inventaire /usr/local/bin/inventaire'],
          exemple: 'sudo install -m 755 inventaire /usr/local/bin/',
          indices: ['Une commande copie ET règle les droits.', 'Elle est utilisée par les Makefile (chapitre 16).', '`install -m 755 …`'],
          solution: '```\n$ sudo install -m 755 inventaire /usr/local/bin/\n$ inventaire\n```',
        },
        {
          id: 'c11-01-05', type: 'vrai-faux', niveau: 2, ref: '§11.1–11.1.1',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un script lancé par son nom doit être lisible ET exécutable.', vrai: true, explication: 'L’interpréteur doit pouvoir lire le fichier.' },
            { texte: '`bash script` fonctionne même sans droit d’exécution.', vrai: true },
            { texte: 'La ligne #! est lue par le shell courant, pas par le noyau.', vrai: false, explication: 'C’est le noyau qui l’interprète lors de l’exec.' },
            { texte: 'Un traitement de données complexe est souvent plus simple en Python qu’en shell.', vrai: true },
          ],
          indices: ['Le shell lit le script ligne à ligne.', 'Une seule fausse.', 'exec() et #!.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '11.2',
      titre: 'Guillemets et littéraux',
      sections: '§11.2', pages: '293–296',
      objectif: 'Prédire ce que le shell fait d’une ligne, et protéger ce qui doit l’être.',
      rappel: `
        Avant de lancer une commande, le shell **transforme** la ligne : il remplace les variables (\`$x\`), les
        substitutions (\`$(…)\`), les jokers (\`*.txt\`), puis **découpe** le résultat en mots aux espaces. Les guillemets
        contrôlent ces étapes :

        | Écriture | Variables et \`$(…)\` | Jokers | Découpage en mots |
        |---|---|---|---|
        | sans guillemets | remplacées | étendus | oui |
        | \`"doubles"\` | remplacées | non | **non** (un seul mot) |
        | \`'simples'\` | **non** (tout est littéral) | non | non |

        \`\`\`
        $ fichier="bilan 2025.ods"
        $ rm $fichier            # rm reçoit DEUX arguments : « bilan » et « 2025.ods »
        $ rm "$fichier"          # un seul argument : correct
        $ echo 'Coût : $5'       # Coût : $5
        $ echo "Coût : $5"       # Coût :   ($5 est le 5ᵉ argument, vide)
        \`\`\`

        **Règle d’or : mets les variables entre guillemets doubles**, sauf raison précise. Pour une apostrophe dans une
        chaîne entre guillemets simples, on ferme, on échappe et on rouvre : \`'l'\\''IPA'\`, ou plus simplement
        \`"l'IPA"\`. La barre oblique inverse \`\\\` protège un seul caractère : \`echo \\$HOME\`.
      `,
      aRetenir: [
        'Le shell remplace variables, substitutions et jokers, puis découpe en mots, AVANT de lancer la commande.',
        '`"…"` : variables oui, jokers et découpage non ; `\'…\'` : tout littéral.',
        'Toujours `"$variable"`.',
        '`\\` protège un caractère ; apostrophe : `"l\'IPA"` ou `\'l\'\\\'\'IPA\'`.',
      ],
      exercices: [
        {
          id: 'c11-02-01', type: 'sortie', niveau: 1, ref: '§11.2.2, p. 294',
          enonce: 'Qu’affiche cette commande ?\n\n```\n$ echo \'$HOME\'\n```',
          attendu: '$HOME',
          indices: ['Quel type de guillemets ?', 'Les guillemets simples ne remplacent rien.', 'Le texte est affiché tel quel.'],
          solution: '`$HOME` : entre guillemets simples, le `$` n’est pas spécial.',
        },
        {
          id: 'c11-02-02', type: 'qcm', niveau: 2, ref: '§11.2',
          enonce: 'Avec `fichier="bilan 2025.ods"`, combien d’arguments reçoit `rm` dans `rm $fichier` ?',
          choix: ['2', '1', '0', 'Cela dépend du répertoire courant'],
          reponse: 0,
          indices: ['Sans guillemets, le résultat est découpé en mots.', 'Où sont les espaces ?', '« bilan » et « 2025.ods ».'],
          solution: '**2** : `bilan` et `2025.ods`. rm tenterait de supprimer deux fichiers… peut-être existants ! Il faut `rm "$fichier"`.',
        },
        {
          id: 'c11-02-03', type: 'sortie', niveau: 2, ref: '§11.2.3',
          enonce: 'Qu’affiche ce script ?\n\n```\nbiere="IPA"\necho "La $biere coûte \\$4"\n```',
          attendu: 'La IPA coûte $4',
          indices: ['Les guillemets doubles remplacent les variables.', 'Mais le $ du prix est précédé d’une barre oblique inverse.', 'La barre oblique protège le caractère suivant.'],
          solution: '`La IPA coûte $4` : `$biere` est remplacée, `\\$` donne un `$` littéral.',
        },
        {
          id: 'c11-02-04', type: 'association', niveau: 2, ref: '§11.2',
          enonce: 'Avec `x="a b"`, associe chaque commande au nombre d’arguments que reçoit `printf "[%s]"` (ou à ce qu’elle affiche).',
          paires: [
            ['`printf "[%s]" $x`', '[a][b]'],
            ['`printf "[%s]" "$x"`', '[a b]'],
            ['`printf "[%s]" \'$x\'`', '[$x]'],
          ],
          indices: ['printf répète le format pour chaque argument.', 'Sans guillemets : découpage.', 'Guillemets simples : littéral.'],
          solution: '`$x` → 2 arguments `[a][b]` ; `"$x"` → 1 argument `[a b]` ; `\'$x\'` → littéral `[$x]`.',
        },
        {
          id: 'c11-02-05', type: 'commande', niveau: 2, ref: '§11.2.4, p. 295',
          enonce: 'Affiche exactement le texte `l\'IPA du Noyau` avec echo.',
          accepte: ['echo "l\'IPA du Noyau"', 'echo l\\\\\'IPA du Noyau', 'echo \'l\'\\\\\'\'IPA du Noyau\'', 'printf \'%s\\\\n\' "l\'IPA du Noyau"'],
          exemple: 'echo "l\'IPA du Noyau"',
          indices: ['L’apostrophe est un guillemet simple…', 'Entre guillemets doubles, elle n’a rien de spécial.', '`echo "l\'IPA du Noyau"`'],
          solution: '```\n$ echo "l\'IPA du Noyau"\n```\nAutre forme : `echo \'l\'\\\'\'IPA du Noyau\'` (fermer, apostrophe protégée, rouvrir).',
        },
        {
          id: 'c11-02-06', type: 'vrai-faux', niveau: 1, ref: '§11.2',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Les jokers (`*.txt`) sont étendus par le shell, pas par la commande.', vrai: true },
            { texte: 'Entre guillemets doubles, `*.txt` est étendu.', vrai: false },
            { texte: 'Entre guillemets doubles, `$(date)` est remplacé.', vrai: true },
            { texte: 'Mettre `"$fichier"` entre guillemets est une bonne habitude.', vrai: true },
          ],
          indices: ['Expansion des noms de fichiers.', 'Une seule fausse.', 'Les doubles laissent passer $.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '11.3',
      titre: 'Variables spéciales et codes de sortie',
      sections: '§11.3 et 11.4', pages: '296–299',
      objectif: 'Lire les arguments d’un script et savoir si une commande a réussi.',
      rappel: `
        | Variable | Contenu |
        |---|---|
        | \`$1\`, \`$2\`… \`\${10}\` | arguments du script (ou de la fonction) |
        | \`$#\` | nombre d’arguments |
        | \`"$@"\` | tous les arguments, **chacun comme un mot** (à utiliser presque toujours) |
        | \`"$*"\` | tous les arguments réunis en **un seul** mot |
        | \`$0\` | nom du script, tel qu’il a été lancé |
        | \`$$\` | PID du shell (pratique pour des noms uniques… mais préfère mktemp) |
        | \`$?\` | code de sortie de la **dernière** commande |

        \`shift\` décale les arguments : \`$2\` devient \`$1\`, et \`$#\` diminue de 1.

        \`\`\`
        #!/bin/bash
        if [ $# -lt 1 ]; then
            echo "usage : $0 FICHIER…" >&2      # messages d'erreur sur la sortie d'erreur
            exit 1
        fi
        for f in "$@"; do wc -l "$f"; done
        \`\`\`

        ### Codes de sortie

        Chaque commande renvoie un code entre 0 et 255 : **0 = succès**, autre chose = échec (ou un résultat
        particulier). \`grep\` : 0 trouvé, 1 rien trouvé, 2 erreur. \`diff\` : 0 identiques, 1 différents. Un script
        renvoie le code de sa dernière commande, ou celui donné à \`exit N\`. Attention : \`$?\` est remplacé **à chaque
        commande**, même un simple \`echo\`.
      `,
      aRetenir: [
        '`$1…`, `$#`, `"$@"` (un mot par argument), `$0`, `$$`, `$?` ; `shift`.',
        'Messages d’erreur : `echo … >&2` ; `exit 1` en cas de mauvais usage.',
        '0 = succès ; grep : 0/1/2 ; diff : 0/1.',
        '`$?` ne concerne que la dernière commande.',
      ],
      exercices: [
        {
          id: 'c11-03-01', type: 'sortie', niveau: 2, ref: '§11.3.1–11.3.2',
          enonce: 'Le script `args` contient :\n\n```\n#!/bin/bash\necho "$#" "$1"\nshift\necho "$#" "$1"\n```\n\nQu’affiche `./args un "deux trois" quatre` ? (deux lignes)',
          attendu: '3 un\n2 deux trois',
          indices: ['Combien d’arguments ? Les guillemets regroupent.', 'shift retire le premier.', '"deux trois" est un seul argument.'],
          solution: '```\n3 un\n2 deux trois\n```',
        },
        {
          id: 'c11-03-02', type: 'association', niveau: 1, ref: '§11.3',
          enonce: 'Associe chaque variable spéciale à son contenu.',
          paires: [
            ['`$#`', 'Nombre d’arguments'],
            ['`$0`', 'Nom du script'],
            ['`$?`', 'Code de sortie de la dernière commande'],
            ['`$$`', 'PID du shell'],
            ['`"$@"`', 'Tous les arguments, un mot chacun'],
          ],
          indices: ['# évoque un nombre.', '0 = le premier mot de la ligne : le script.', '? = « ça a marché ? ».'],
          solution: '$# nombre, $0 nom, $? code de sortie, $$ PID, "$@" tous les arguments.',
        },
        {
          id: 'c11-03-03', type: 'reponse-courte', niveau: 1, ref: '§11.4, p. 298',
          enonce: 'Quel est le code de sortie de `grep -q zzzz /etc/passwd` (aucune ligne ne contient zzzz) ?',
          accepte: ['1'],
          indices: ['0 = trouvé.', 'Rien trouvé n’est pas une erreur.', 'C’est 1 (2 serait une erreur).'],
          solution: '**1** : rien trouvé. 0 = trouvé, 2 = erreur (fichier illisible…).',
        },
        {
          id: 'c11-03-04', type: 'qcm', niveau: 2, ref: '§11.3.3',
          enonce: 'Pour parcourir tous les arguments, même ceux qui contiennent des espaces, quelle boucle utiliser ?',
          choix: ['for f in "$@"; do …', 'for f in $*; do …', 'for f in "$*"; do …', 'for f in $@; do …'],
          reponse: 0,
          indices: ['Il faut un mot par argument, sans redécoupage.', 'Les guillemets empêchent le découpage.', '"$@" est la forme spéciale qui garde chaque argument.'],
          solution: '`"$@"` donne exactement un mot par argument. `"$*"` les colle en un seul mot ; sans guillemets, ils sont redécoupés aux espaces.',
        },
        {
          id: 'c11-03-05', type: 'trous', niveau: 2, ref: '§11.3',
          enonce: 'Complète : si le script reçoit **moins d’un** argument, afficher l’usage sur la **sortie d’erreur** et sortir avec le code 1.',
          texte: 'if [ [[1]] -lt 1 ]; then\n    echo "usage : $0 FICHIER" [[2]]\n    exit [[3]]\nfi',
          trous: [
            { accepte: ['\\$#', '"\\$#"'], exemple: '$#' },
            { accepte: ['>&2', '1>&2'], exemple: '>&2' },
            { accepte: ['1'], exemple: '1' },
          ],
          indices: ['Le nombre d’arguments.', 'Rediriger la sortie standard vers la sortie d’erreur.', 'Un code non nul.'],
          solution: '```\nif [ $# -lt 1 ]; then\n    echo "usage : $0 FICHIER" >&2\n    exit 1\nfi\n```',
        },
        {
          id: 'c11-03-06', type: 'sortie', niveau: 2, ref: '§11.4',
          enonce: 'Qu’affiche cette séquence ?\n\n```\n$ false\n$ echo "code : $?"\n$ echo "code : $?"\n```\n(deux lignes)',
          attendu: 'code : 1\ncode : 0',
          indices: ['false renvoie 1.', 'Le premier echo réussit.', '$? change à chaque commande.'],
          solution: '```\ncode : 1\ncode : 0\n```\nLe second `$?` est celui du premier `echo` (succès). Si tu as besoin du code plus tard, enregistre-le : `code=$?`.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '11.4',
      titre: 'Conditions : if, test et opérateurs logiques',
      sections: '§11.5 à 11.5.5', pages: '299–304',
      objectif: 'Écrire des conditions correctes sur des fichiers, des chaînes et des nombres.',
      rappel: `
        \`if\` exécute une **commande** et regarde son code de sortie : 0 → branche \`then\`. \`[\` est une commande
        (synonyme de \`test\`) : les espaces autour des crochets sont **obligatoires**.

        \`\`\`
        if [ -f "$conf" ]; then
            echo "configuration trouvée"
        elif [ -d "$conf" ]; then
            echo "c'est un répertoire" >&2
        else
            echo "absente" >&2; exit 1
        fi
        if grep -q '^bastien:' /etc/passwd; then echo "bastien existe"; fi
        \`\`\`

        | Fichiers | | Chaînes | | Nombres | |
        |---|---|---|---|---|---|
        | \`-e\` existe | \`-f\` fichier | \`-z\` vide | \`-n\` non vide | \`-eq\` égal | \`-ne\` différent |
        | \`-d\` répertoire | \`-s\` non vide | \`=\` égales | \`!=\` différentes | \`-lt\` < | \`-le\` ≤ |
        | \`-r -w -x\` droits | \`-L\` lien | | | \`-gt\` > | \`-ge\` ≥ |

        \`!\` inverse : \`[ ! -d "$rep" ]\`. **Piège** : \`=\` compare des **chaînes**, \`-eq\` des **nombres**. Toujours des
        guillemets autour des variables : \`[ $x = oui ]\` plante si \`x\` est vide.

        ### && et ||

        \`cmd1 && cmd2\` : cmd2 seulement si cmd1 réussit. \`cmd1 || cmd2\` : cmd2 seulement si cmd1 échoue.

        \`\`\`
        mkdir -p "$dest" && cd "$dest"
        cd /srv/recettes || exit 1
        \`\`\`

        bash propose aussi \`[[ … ]]\` (pas de découpage des variables, \`=~\` pour les expressions régulières) et
        \`(( … ))\` pour l’arithmétique : \`(( n > 10 ))\`.
      `,
      aRetenir: [
        '`if COMMANDE; then … elif …; else …; fi` : se base sur le code de sortie.',
        '`[ … ]` = `test` : espaces obligatoires ; -f -d -e -z -n = != -eq -lt -gt ; `!` inverse.',
        '`=` pour les chaînes, `-eq` pour les nombres ; variables entre guillemets.',
        '`&&` si succès, `||` si échec ; `cd rep || exit 1`.',
      ],
      exercices: [
        {
          id: 'c11-04-01', type: 'trous', niveau: 1, ref: '§11.5.5, p. 301',
          enonce: 'Complète : si `/etc/boutique.conf` est un **fichier ordinaire** existant, afficher « présent ».',
          texte: 'if [ [[1]] /etc/boutique.conf ]; then\n    echo "présent"\n[[2]]',
          trous: [
            { accepte: ['-f', '-e'], exemple: '-f' },
            { accepte: ['fi'], exemple: 'fi' },
          ],
          indices: ['Le test « fichier ordinaire ».', 'f comme *file*.', 'if se termine par son envers.'],
          solution: '```\nif [ -f /etc/boutique.conf ]; then\n    echo "présent"\nfi\n```',
        },
        {
          id: 'c11-04-02', type: 'qcm', niveau: 2, ref: '§11.5',
          enonce: 'Pourquoi `if [$x = "oui"]; then` provoque-t-il l’erreur « [oui: command not found » ?',
          choix: [
            '`[` est une commande : il faut des espaces autour des crochets',
            'Il faut == au lieu de =',
            'x n’est pas défini',
            'if n’accepte pas les crochets',
          ],
          reponse: 0,
          indices: ['Le shell découpe aux espaces.', '`[oui` devient le nom de la commande.', '`[ "$x" = "oui" ]`.'],
          solution: '`[` est une commande (comme `test`). Sans espace, le shell cherche une commande nommée `[oui`. Il faut `[ "$x" = "oui" ]`.',
        },
        {
          id: 'c11-04-03', type: 'association', niveau: 1, ref: '§11.5.5',
          enonce: 'Associe chaque test à sa signification.',
          paires: [
            ['`[ -d "$r" ]`', '$r est un répertoire'],
            ['`[ -z "$v" ]`', '$v est vide'],
            ['`[ "$a" = "$b" ]`', 'les chaînes sont égales'],
            ['`[ "$n" -gt 10 ]`', 'le nombre est supérieur à 10'],
            ['`[ ! -e "$f" ]`', '$f n’existe pas'],
          ],
          indices: ['d = directory, z = zéro caractère.', '-gt = greater than.', '! inverse.'],
          solution: '-d répertoire, -z vide, = chaînes égales, -gt plus grand, ! -e inexistant.',
        },
        {
          id: 'c11-04-04', type: 'commande', niveau: 2, ref: '§11.5.4, p. 300',
          enonce: 'Écris une ligne qui va dans `/srv/recettes`, et **arrête le script** (code 1) si ce n’est pas possible.',
          accepte: ['cd /srv/recettes \\|\\| exit 1', 'cd /srv/recettes/ \\|\\| exit 1', 'cd /srv/recettes \\|\\| exit', 'cd "/srv/recettes" \\|\\| exit 1'],
          exemple: 'cd /srv/recettes || exit 1',
          indices: ['« sinon » se dit avec deux barres verticales.', 'exit arrête le script.', '`cd … || exit 1`'],
          solution: '```\ncd /srv/recettes || exit 1\n```\nSans ça, si cd échoue, la suite (un `rm *` par exemple !) s’exécute dans le mauvais répertoire.',
        },
        {
          id: 'c11-04-05', type: 'sortie', niveau: 2, ref: '§11.5.4',
          enonce: 'Qu’affiche cette ligne ?\n\n```\n$ false && echo A || echo B\n```',
          attendu: 'B',
          indices: ['false échoue : && n’exécute pas la suite.', 'Le code de « false && echo A » est donc un échec.', '|| exécute alors sa droite.'],
          solution: '`B`. Attention : `a && b || c` n’est pas un vrai si/sinon : si `b` échoue, `c` s’exécute aussi.',
        },
        {
          id: 'c11-04-06', type: 'qcm', niveau: 3, ref: '§11.5.5, p. 303',
          enonce: 'Avec `n="010"`, que donnent `[ "$n" = 10 ]` et `[ "$n" -eq 10 ]` ?',
          choix: [
            'Le premier est faux (chaînes différentes), le second vrai (nombres égaux)',
            'Les deux sont vrais',
            'Les deux sont faux',
            'Le premier est vrai, le second faux',
          ],
          reponse: 0,
          indices: ['= compare des chaînes de caractères.', '-eq compare des valeurs numériques.', '"010" et "10" ne sont pas la même chaîne.'],
          solution: '`=` compare des chaînes : "010" ≠ "10". `-eq` compare des nombres : 10 = 10.',
        },
        {
          id: 'c11-04-07', type: 'vrai-faux', niveau: 2, ref: '§11.5',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`if` peut tester directement n’importe quelle commande, sans crochets.', vrai: true, explication: 'Par exemple `if grep -q … ; then`.' },
            { texte: '`[ $x = oui ]` fonctionne même si x est vide.', vrai: false, explication: 'Il devient `[ = oui ]` : erreur. D’où `"$x"`.' },
            { texte: '`[[ $nom =~ ^ipa- ]]` teste une expression régulière en bash.', vrai: true },
            { texte: '`(( n > 10 ))` compare des nombres en bash.', vrai: true },
          ],
          indices: ['if regarde un code de sortie.', 'Une seule fausse.', '[[ ]] et (( )) sont propres à bash.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '11.5',
      titre: 'case et boucles',
      sections: '§11.5.6 et 11.6', pages: '304–306',
      objectif: 'Choisir entre plusieurs cas et répéter un traitement.',
      rappel: `
        ### case

        \`\`\`
        case "$1" in
            start|demarrer) echo "démarrage" ;;
            stop)           echo "arrêt" ;;
            *.tar.gz)       tar xzf "$1" ;;
            *)              echo "usage : $0 start|stop" >&2; exit 1 ;;
        esac
        \`\`\`

        Les motifs sont des **jokers** (\`*\`, \`?\`, \`[…]\`), \`|\` sépare des alternatives, \`;;\` termine un cas, \`*)\`
        attrape le reste. Idéal pour traiter une option ou une sous-commande.

        ### for

        \`\`\`
        for f in /srv/recettes/*.recette; do
            echo "== $f"; head -1 "$f"
        done
        for hote in cuve fut douane; do ssh "$hote" uptime; done
        for i in {1..5}; do echo "$i"; done        # bash ; POSIX : $(seq 1 5)
        \`\`\`

        Si aucun fichier ne correspond au joker, la boucle tourne **une fois** avec le motif littéral : teste
        \`[ -e "$f" ] || continue\`.

        ### while

        \`\`\`
        while read -r ligne; do                 # lire un fichier ligne par ligne
            echo "> $ligne"
        done < /etc/hosts
        n=0
        while [ "$n" -lt 3 ]; do n=$((n + 1)); done
        until ping -c1 -W1 cuve >/dev/null; do sleep 2; done   # until : tant que c'est FAUX
        \`\`\`

        \`break\` sort de la boucle, \`continue\` passe au tour suivant. \`read -r\` évite que les \`\\\` soient interprétés.
      `,
      aRetenir: [
        '`case "$x" in motif|autre) … ;; *) … ;; esac` (jokers).',
        '`for v in liste; do … done` ; fichiers : `for f in *.txt` (+ `[ -e "$f" ] || continue`).',
        '`while read -r ligne; do … done < fichier` ; `until` ; `break`, `continue`.',
        'Arithmétique : `$((n + 1))`.',
      ],
      exercices: [
        {
          id: 'c11-05-01', type: 'trous', niveau: 2, ref: '§11.5.6, p. 304',
          enonce: 'Complète le `case` qui accepte `start` ou `demarrer`, et affiche l’usage pour tout le reste.',
          texte: 'case "$1" in\n    start[[1]]demarrer) echo "démarrage" [[2]]\n    [[3]]) echo "usage : $0 start" >&2 ;;\n[[4]]',
          trous: [
            { accepte: ['\\|'], exemple: '|' },
            { accepte: [';;'], exemple: ';;' },
            { accepte: ['\\*'], exemple: '*' },
            { accepte: ['esac'], exemple: 'esac' },
          ],
          indices: ['Le séparateur d’alternatives est celui des tubes.', 'Un cas se termine par deux points-virgules.', 'case se ferme par son envers.'],
          solution: '```\ncase "$1" in\n    start|demarrer) echo "démarrage" ;;\n    *) echo "usage : $0 start" >&2 ;;\nesac\n```',
        },
        {
          id: 'c11-05-02', type: 'sortie', niveau: 1, ref: '§11.6.1, p. 305',
          enonce: 'Qu’affiche cette boucle ? (une ligne par tour)\n\n```\nfor b in IPA Stout Blanche; do\n    echo "Brassage : $b"\ndone\n```',
          attendu: 'Brassage : IPA\nBrassage : Stout\nBrassage : Blanche',
          indices: ['Trois mots, trois tours.', 'La variable prend chaque valeur.', 'Dans l’ordre.'],
          solution: '```\nBrassage : IPA\nBrassage : Stout\nBrassage : Blanche\n```',
        },
        {
          id: 'c11-05-03', type: 'trous', niveau: 2, ref: '§11.6.2',
          enonce: 'Complète la boucle qui lit `/etc/hosts` **ligne par ligne** dans la variable `ligne`.',
          texte: '[[1]] read -r ligne; do\n    echo "> $ligne"\ndone [[2]] /etc/hosts',
          trous: [
            { accepte: ['while'], exemple: 'while' },
            { accepte: ['<'], exemple: '<' },
          ],
          indices: ['Tant que read réussit…', 'L’entrée de toute la boucle est redirigée.', 'Redirection d’entrée.'],
          solution: '```\nwhile read -r ligne; do\n    echo "> $ligne"\ndone < /etc/hosts\n```',
        },
        {
          id: 'c11-05-04', type: 'qcm', niveau: 3, ref: '§11.6.1',
          enonce: '`/srv/vide` ne contient aucun fichier `.recette`. Que fait `for f in /srv/vide/*.recette; do wc -l "$f"; done` ?',
          choix: [
            'Un tour avec f="/srv/vide/*.recette" : wc affiche une erreur « No such file »',
            'Aucun tour',
            'Une erreur de syntaxe',
            'Il liste tous les fichiers du répertoire',
          ],
          reponse: 0,
          indices: ['Que devient un joker sans correspondance (fiche 2.5) ?', 'Il reste tel quel.', 'Donc un tour avec le motif littéral.'],
          solution: 'Le joker sans correspondance reste littéral : un tour avec `f="/srv/vide/*.recette"`. Parade : `[ -e "$f" ] || continue` en début de boucle (ou `shopt -s nullglob` en bash).',
        },
        {
          id: 'c11-05-05', type: 'commande', niveau: 2, ref: '§11.6',
          enonce: 'En une ligne, affiche les nombres de **1 à 5** avec une boucle `for` (syntaxe bash).',
          accepte: ['for i in \\{1\\.\\.5\\}; ?do echo "?\\$i"?; ?done', 'for i in 1 2 3 4 5; ?do echo "?\\$i"?; ?done', 'for i in \\$\\(seq 1 5\\); ?do echo "?\\$i"?; ?done', 'for \\(\\(i ?= ?1; ?i ?<= ?5; ?i\\+\\+\\)\\); ?do echo "?\\$i"?; ?done', 'for n in \\{1\\.\\.5\\}; ?do echo "?\\$n"?; ?done'],
          exemple: 'for i in {1..5}; do echo "$i"; done',
          indices: ['bash sait générer une suite avec des accolades.', '{1..5}', '`for i in {1..5}; do echo "$i"; done`'],
          solution: '```\n$ for i in {1..5}; do echo "$i"; done\n```\nEn shell POSIX : `for i in $(seq 1 5)`.',
        },
        {
          id: 'c11-05-06', type: 'association', niveau: 1, ref: '§11.6',
          enonce: 'Associe chaque mot-clé à son rôle.',
          paires: [
            ['`break`', 'Sortir de la boucle'],
            ['`continue`', 'Passer au tour suivant'],
            ['`until`', 'Répéter tant que la condition est fausse'],
            ['`;;`', 'Terminer un cas de case'],
          ],
          indices: ['break = casser.', 'continue = continuer avec le suivant.', 'until = jusqu’à ce que.'],
          solution: 'break sort, continue saute au suivant, until répète tant que c’est faux, ;; termine un cas.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '11.6',
      titre: 'Substitution de commande, fichiers temporaires et here documents',
      sections: '§11.7 à 11.9', pages: '306–308',
      objectif: 'Récupérer la sortie d’une commande, travailler sur des fichiers temporaires sûrs, produire un bloc de texte.',
      rappel: `
        ### Substitution de commande

        \`\`\`
        jour=$(date +%F)                       # forme moderne ; \`date +%F\` (accents graves) est l'ancienne
        nb=$(grep -c '^ipa' liste.txt)
        echo "Sauvegarde du $jour : $(ls /srv/recettes | wc -l) fichiers"
        \`\`\`

        Les \`$(…)\` s’imbriquent sans peine. Mets-les entre guillemets comme une variable.

        ### Fichiers temporaires

        Ne pas écrire dans \`/tmp/fichier\` à nom fixe : collisions entre exécutions, et faille de sécurité (un autre
        utilisateur peut créer le fichier ou un lien avant toi). On utilise **mktemp**, et **trap** pour nettoyer :

        \`\`\`
        tmp=$(mktemp)                          # /tmp/tmp.k3Jd8s, créé en 600
        rep=$(mktemp -d)                       # un répertoire
        trap 'rm -rf "$tmp" "$rep"' EXIT       # nettoyage à la sortie, même en cas d'erreur ou de Ctrl-C
        \`\`\`

        ### Here documents

        Un bloc de texte envoyé sur l’entrée standard d’une commande :

        \`\`\`
        cat <<FIN > /etc/motd
        Bienvenue sur $(hostname) — Brasserie du Noyau
        Administrateur : $USER
        FIN
        cat <<'FIN'                            # délimiteur entre guillemets : AUCUNE substitution
        Le prix est $5
        FIN
        \`\`\`

        \`<<-FIN\` autorise l’indentation par **tabulations** devant le texte et le délimiteur.
      `,
      aRetenir: [
        '`var=$(commande)` ; s’imbrique ; entre guillemets.',
        '`tmp=$(mktemp)`, `mktemp -d` ; `trap \'rm -f "$tmp"\' EXIT`.',
        'Here document : `cat <<FIN … FIN` ; `<<\'FIN\'` sans substitution.',
      ],
      exercices: [
        {
          id: 'c11-06-01', type: 'commande', niveau: 1, ref: '§11.7, p. 306',
          enonce: 'Range dans la variable `jour` la date du jour au format `AAAA-MM-JJ` (format de `date +%F`).',
          accepte: ['jour=\\$\\(date \\+%F\\)', 'jour="\\$\\(date \\+%F\\)"', 'jour=`date \\+%F`', 'jour=\\$\\(date \\+%Y-%m-%d\\)', 'jour="\\$\\(date \\+%Y-%m-%d\\)"', 'jour=\\$\\(date [\'"]\\+%F[\'"]\\)'],
          exemple: 'jour=$(date +%F)',
          pieges: [{ motif: 'jour = \\$\\(date \\+%F\\)', message: 'Pas d’espace autour du = dans une affectation (fiche 2.6).' }],
          indices: ['La sortie d’une commande se récupère avec $( ).', 'Pas d’espace autour de =.', '`jour=$(date +%F)`'],
          solution: '```\njour=$(date +%F)\necho "$jour"\n2026-11-08\n```',
        },
        {
          id: 'c11-06-02', type: 'commande', niveau: 2, ref: '§11.8, p. 307',
          enonce: 'Crée un fichier temporaire sûr et range son nom dans la variable `tmp`.',
          accepte: ['tmp=\\$\\(mktemp\\)', 'tmp="\\$\\(mktemp\\)"', 'tmp=`mktemp`', 'tmp=\\$\\(mktemp -t [^)]+\\)', 'tmp=\\$\\(mktemp /tmp/[^)]+\\)'],
          exemple: 'tmp=$(mktemp)',
          pieges: [{ motif: 'tmp=/tmp/\\S+', message: 'Un nom fixe dans /tmp risque des collisions et des attaques par lien symbolique. Utilise mktemp.' }],
          indices: ['Une commande crée un fichier au nom unique.', 'mk = make, temp = temporaire.', '`tmp=$(mktemp)`'],
          solution: '```\ntmp=$(mktemp)\ntrap \'rm -f "$tmp"\' EXIT\n```',
        },
        {
          id: 'c11-06-03', type: 'trous', niveau: 2, ref: '§11.8, p. 307',
          enonce: 'Complète pour supprimer automatiquement le répertoire temporaire à la **sortie** du script, quelle qu’en soit la cause.',
          texte: 'rep=$(mktemp [[1]])\n[[2]] \'rm -rf "$rep"\' [[3]]',
          trous: [
            { accepte: ['-d'], exemple: '-d' },
            { accepte: ['trap'], exemple: 'trap' },
            { accepte: ['EXIT', '0'], exemple: 'EXIT' },
          ],
          indices: ['mktemp crée un répertoire avec une option.', 'La commande qui intercepte les signaux.', 'Le pseudo-signal de fin.'],
          solution: '```\nrep=$(mktemp -d)\ntrap \'rm -rf "$rep"\' EXIT\n```',
        },
        {
          id: 'c11-06-04', type: 'sortie', niveau: 2, ref: '§11.9, p. 308',
          enonce: 'Qu’affiche ce here document ?\n\n```\nprix=4\ncat <<\'FIN\'\nIPA : $prix euros\nFIN\n```',
          attendu: 'IPA : $prix euros',
          indices: ['Regarde le délimiteur.', 'Il est entre guillemets simples.', 'Aucune substitution alors.'],
          solution: '`IPA : $prix euros` : avec `<<\'FIN\'`, le texte est littéral. Avec `<<FIN`, on aurait `IPA : 4 euros`.',
        },
        {
          id: 'c11-06-05', type: 'vrai-faux', niveau: 2, ref: '§11.7–11.9',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`$(…)` peut s’imbriquer facilement, contrairement aux accents graves.', vrai: true },
            { texte: 'mktemp crée le fichier avec les droits 600.', vrai: true },
            { texte: '`trap … EXIT` ne s’exécute que si le script se termine sans erreur.', vrai: false, explication: 'EXIT est déclenché à toute sortie du shell.' },
            { texte: '`<<-FIN` permet d’indenter le texte avec des tabulations.', vrai: true },
          ],
          indices: ['Les accents graves s’échappent mal.', 'Une seule fausse.', 'trap EXIT = filet de sécurité.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '11.7',
      titre: 'Les utilitaires des scripts : basename, awk, sed, xargs, expr, exec',
      sections: '§11.10', pages: '308–311',
      objectif: 'Choisir le bon petit outil pour extraire, transformer et enchaîner.',
      rappel: `
        \`\`\`
        $ basename /srv/recettes/ipa.recette .recette     # ipa        (nom sans répertoire ni suffixe)
        $ dirname /srv/recettes/ipa.recette               # /srv/recettes
        $ awk -F: '$3 >= 1000 {print $1}' /etc/passwd     # champ 1 des lignes où le champ 3 ≥ 1000
        $ df -h | awk 'NR > 1 {print $5, $6}'             # colonnes 5 et 6, sans l'en-tête
        $ sed 's/Stout/Porter/g' carte.txt                # remplacer (g : toutes les occurrences de la ligne)
        $ sed -i.bak 's/^Port 22$/Port 2222/' fichier     # modifier le fichier, avec sauvegarde .bak
        $ sed -n '5,10p' fichier ; sed '/^#/d' fichier    # afficher des lignes ; supprimer les commentaires
        $ find /srv -name '*.tmp' -print0 | xargs -0 rm -f   # passer une liste en arguments
        $ expr 7 + 3          # ancien ; préfère $((7 + 3))
        \`\`\`

        - **awk** découpe chaque ligne en champs (\`$1\`, \`$2\`… \`$NF\` le dernier) ; \`-F\` change le séparateur ; c’est
          un petit langage (conditions, calculs : \`{s += $2} END {print s}\`).
        - **sed** édite un flux ligne par ligne ; \`-i\` modifie le fichier lui-même.
        - **xargs** transforme son entrée en arguments ; \`-0\` avec \`find -print0\` gère les noms à espaces ; \`-n 1\` un
          argument par commande.
        - **exec cmd** remplace le shell par cmd (pas de retour) ; \`exec > journal.log 2>&1\` redirige toute la suite du
          script.
        - En bash, beaucoup de traitements se font sans outil externe : \`\${f%.recette}\` retire un suffixe,
          \`\${f##*/}\` garde le nom de fichier, \`\${v:-défaut}\` donne une valeur par défaut.
      `,
      aRetenir: [
        '`basename chemin [suffixe]`, `dirname chemin`.',
        '`awk -F: \'cond {print $1}\'` ; NR, NF, END.',
        '`sed \'s/a/b/g\'`, `sed -i.bak`, `sed -n \'5,10p\'`, `sed \'/^#/d\'`.',
        '`find … -print0 | xargs -0 cmd` ; `exec > log 2>&1` ; `${f%.ext}`, `${f##*/}`, `${v:-défaut}`.',
      ],
      exercices: [
        {
          id: 'c11-07-01', type: 'sortie', niveau: 1, ref: '§11.10.1, p. 308',
          enonce: 'Qu’affiche `basename /srv/recettes/ipa.recette .recette` ?',
          attendu: 'ipa',
          indices: ['basename retire le chemin.', 'Le second argument est un suffixe à retirer.', 'Il reste le nom seul.'],
          solution: '`ipa`',
        },
        {
          id: 'c11-07-02', type: 'commande', niveau: 2, ref: '§11.10.2, p. 309',
          enonce: 'Avec awk, affiche le **nom** (champ 1) des comptes de `/etc/passwd` dont l’**UID** (champ 3) est au moins 1000.',
          accepte: ['awk -F ?: [\'"]\\$3 ?>= ?1000 ?\\{ ?print \\$1 ?\\}[\'"] /etc/passwd', 'awk -F ?[\'"]:[\'"] [\'"]\\$3 ?>= ?1000 ?\\{ ?print \\$1 ?\\}[\'"] /etc/passwd', 'awk -F ?: [\'"]\\$3 ?> ?999 ?\\{ ?print \\$1 ?\\}[\'"] /etc/passwd'],
          exemple: "awk -F: '$3 >= 1000 {print $1}' /etc/passwd",
          indices: ['`-F:` : séparateur deux-points.', 'Une condition devant l’action.', "`awk -F: '$3 >= 1000 {print $1}' /etc/passwd`"],
          solution: "```\n$ awk -F: '$3 >= 1000 {print $1}' /etc/passwd\nadmin\nbastien\nnobody\n```\n(nobody a l’UID 65534 : on peut ajouter `&& $3 < 65534`.)",
        },
        {
          id: 'c11-07-03', type: 'commande', niveau: 1, ref: '§11.10.3, p. 309',
          enonce: 'Avec sed, affiche `carte.txt` en remplaçant **toutes** les occurrences de `Stout` par `Porter`.',
          accepte: ['sed [\'"]s/Stout/Porter/g[\'"] carte\\.txt', 'sed -e [\'"]s/Stout/Porter/g[\'"] carte\\.txt', 'sed s/Stout/Porter/g carte\\.txt', 'sed [\'"]s\\|Stout\\|Porter\\|g[\'"] carte\\.txt'],
          exemple: "sed 's/Stout/Porter/g' carte.txt",
          pieges: [{ motif: 'sed [\'"]?s/Stout/Porter/[\'"]? carte\\.txt', message: 'Sans `g`, seule la première occurrence de chaque ligne est remplacée.' }],
          indices: ['La commande de substitution de sed : s/ancien/nouveau/.', 'Un drapeau pour toutes les occurrences.', "`sed 's/Stout/Porter/g' carte.txt`"],
          solution: "```\n$ sed 's/Stout/Porter/g' carte.txt\n```\nPour modifier le fichier : `sed -i.bak 's/Stout/Porter/g' carte.txt`.",
        },
        {
          id: 'c11-07-04', type: 'commande', niveau: 2, ref: '§11.10.4, p. 310',
          enonce: 'Supprime tous les fichiers `*.tmp` sous `/srv`, **même ceux dont le nom contient des espaces**, avec find et xargs.',
          accepte: ['find /srv -name [\'"]?\\*\\.tmp[\'"]? -print0 \\| xargs -0 rm( -f)?', 'find /srv -type f -name [\'"]?\\*\\.tmp[\'"]? -print0 \\| xargs -0 rm( -f)?', 'find /srv -name [\'"]?\\*\\.tmp[\'"]? -print0 \\| xargs -0 -r rm( -f)?', 'find /srv -name [\'"]?\\*\\.tmp[\'"]? -print0 \\| xargs -r0 rm( -f)?'],
          exemple: "find /srv -name '*.tmp' -print0 | xargs -0 rm -f",
          pieges: [{ motif: 'find /srv -name [\'"]?\\*\\.tmp[\'"]? \\| xargs rm( -f)?', message: 'Sans -print0 / -0, un nom avec espace est coupé en deux arguments.' }],
          indices: ['find sépare les noms par un caractère nul avec une option.', 'xargs doit lire ces séparateurs nuls.', '`-print0 | xargs -0`'],
          solution: "```\n$ find /srv -name '*.tmp' -print0 | xargs -0 rm -f\n```\nAutre forme, sans xargs : `find /srv -name '*.tmp' -delete` (ou `-exec rm -f {} +`).",
        },
        {
          id: 'c11-07-05', type: 'association', niveau: 2, ref: '§11.10',
          enonce: 'Avec `f="/srv/recettes/ipa.recette"`, associe chaque expansion bash à son résultat.',
          paires: [
            ['`${f##*/}`', 'ipa.recette'],
            ['`${f%.recette}`', '/srv/recettes/ipa'],
            ['`${f%/*}`', '/srv/recettes'],
            ['`${inconnu:-aucune}`', 'aucune'],
          ],
          indices: ['## retire le plus long préfixe correspondant.', '% retire le plus court suffixe.', ':- donne une valeur par défaut.'],
          solution: '`${f##*/}` = basename ; `${f%.recette}` retire le suffixe ; `${f%/*}` = dirname ; `${v:-défaut}`.',
        },
        {
          id: 'c11-07-06', type: 'qcm', niveau: 2, ref: '§11.10.6, p. 311',
          enonce: 'Que fait `exec > /var/log/sauvegarde.log 2>&1` placé au début d’un script ?',
          choix: [
            'Toute la suite du script écrit sa sortie et ses erreurs dans le journal',
            'Le script est remplacé par un autre programme',
            'Le script se relance en arrière-plan',
            'Rien sans commande après exec',
          ],
          reponse: 0,
          indices: ['exec sans commande ne remplace rien.', 'Il applique les redirections au shell lui-même.', 'Pour le reste du script.'],
          solution: 'Sans commande, `exec` applique les redirections **au shell courant** : toutes les commandes suivantes écrivent dans le journal. Avec une commande (`exec programme`), le shell est remplacé.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '11.8',
      titre: 'Sous-shells, inclusion, lecture au clavier, et quand ne pas utiliser le shell',
      sections: '§11.11 à 11.14', pages: '311–313',
      objectif: 'Isoler des changements, partager du code entre scripts, demander une saisie.',
      rappel: `
        ### Sous-shells

        Des **parenthèses** lancent un sous-shell : ses changements (répertoire, variables) ne remontent pas.

        \`\`\`
        (cd /srv/recettes && tar czf /tmp/recettes.tgz .)    # on revient où on était après
        x=1; (x=2); echo "$x"                                # 1
        tar cf - recettes | (cd /srv/sauv && tar xf -)       # copie d'arborescence à travers un tube
        \`\`\`

        Attention : les commandes d’un **tube** s’exécutent aussi dans des sous-shells : \`cat f | while read l; do n=…;
        done\` ne modifie pas \`n\` dans le script (préfère \`while …; done < f\`).

        ### Inclure un autre fichier

        \`\`\`
        . /etc/brasserie/config.sh        # ou : source /etc/brasserie/config.sh (bash)
        \`\`\`

        Le fichier est lu **dans le shell courant** : ses variables et fonctions deviennent disponibles. C’est ainsi qu’on
        lit \`/etc/os-release\` ou une bibliothèque commune (les labs le font avec \`labs/lib/commun.sh\`).

        ### Lire au clavier

        \`\`\`
        read -r -p "Nom de la bière : " biere
        read -r -s -p "Mot de passe : " mdp; echo      # -s : sans écho
        read -r -t 10 -p "Continuer ? [o/N] " rep || rep=n   # -t : délai
        \`\`\`

        ### Quand (ne pas) utiliser le shell

        Le shell excelle à **orchestrer** des commandes et des fichiers. S’il faut des structures de données, du calcul,
        analyser du JSON, des centaines de lignes : passe à Python (ou autre). Un indice : tu passes plus de temps à te
        battre avec les guillemets qu’avec le problème.
      `,
      aRetenir: [
        '`( … )` : sous-shell, changements locaux ; les tubes aussi créent des sous-shells.',
        '`. fichier` / `source fichier` : exécute dans le shell courant (variables, fonctions).',
        '`read -r -p "…" var`, `-s` (secret), `-t` (délai).',
        'Shell = orchestration ; logique complexe = autre langage.',
      ],
      exercices: [
        {
          id: 'c11-08-01', type: 'sortie', niveau: 2, ref: '§11.11, p. 311',
          enonce: 'Qu’affiche ce script ?\n\n```\nx=1\n(x=2; echo "dedans : $x")\necho "dehors : $x"\n```\n(deux lignes)',
          attendu: 'dedans : 2\ndehors : 1',
          indices: ['Les parenthèses créent un sous-shell.', 'Le sous-shell a une copie des variables.', 'Les changements ne remontent pas.'],
          solution: '```\ndedans : 2\ndehors : 1\n```',
        },
        {
          id: 'c11-08-02', type: 'commande', niveau: 1, ref: '§11.12, p. 312',
          enonce: 'Charge dans le shell courant les variables de `/etc/os-release` (puis tu pourras faire `echo "$ID"`).',
          accepte: ['\\. /etc/os-release', 'source /etc/os-release'],
          exemple: '. /etc/os-release',
          pieges: [{ motif: '(bash|sh) /etc/os-release|/etc/os-release', message: 'Lancé comme un programme, le fichier s’exécute dans un autre processus : ses variables disparaissent à la fin.' }],
          indices: ['Il faut lire le fichier dans le shell courant.', 'Une commande d’un caractère, ou source en bash.', '`. /etc/os-release`'],
          solution: '```\n$ . /etc/os-release\n$ echo "$ID $VERSION_ID"\ndebian 13\n```',
        },
        {
          id: 'c11-08-03', type: 'commande', niveau: 2, ref: '§11.13, p. 312',
          enonce: 'Demande « Nom de la bière : » et range la réponse dans la variable `biere` (option qui évite d’interpréter les `\\`).',
          accepte: ['read -r -p ["\']Nom de la bière : ["\'] biere', 'read -rp ["\']Nom de la bière : ["\'] biere', 'read -p ["\']Nom de la bière : ["\'] -r biere'],
          exemple: 'read -r -p "Nom de la bière : " biere',
          indices: ['La commande read.', '-p affiche une invite.', '-r : pas d’interprétation des barres obliques inverses.'],
          solution: '```\nread -r -p "Nom de la bière : " biere\necho "Tu as choisi : $biere"\n```',
        },
        {
          id: 'c11-08-04', type: 'qcm', niveau: 3, ref: '§11.11',
          enonce: 'Ce script affiche toujours « 0 lignes ». Pourquoi ?\n\n```\nn=0\ncat liste.txt | while read -r l; do n=$((n + 1)); done\necho "$n lignes"\n```',
          choix: [
            'La boucle à droite du tube tourne dans un sous-shell : son n disparaît à la fin',
            'read ne lit pas les fichiers',
            'L’arithmétique $(( )) ne fonctionne pas dans une boucle',
            'cat ne transmet pas les lignes vides',
          ],
          reponse: 0,
          indices: ['Chaque membre d’un tube est un processus.', 'Les variables d’un sous-shell ne remontent pas.', 'Redirige plutôt : done < liste.txt.'],
          solution: 'La boucle s’exécute dans un sous-shell (à cause du tube). Correction : `while read -r l; do …; done < liste.txt` (la boucle reste dans le shell courant). Ou plus simplement `n=$(wc -l < liste.txt)`.',
        },
        {
          id: 'c11-08-05', type: 'vrai-faux', niveau: 2, ref: '§11.11–11.14',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`(cd /tmp && ls)` laisse le script dans son répertoire d’origine.', vrai: true },
            { texte: '`source config.sh` lance config.sh dans un nouveau processus.', vrai: false, explication: 'Il est lu dans le shell courant.' },
            { texte: '`read -s` masque la saisie (mot de passe).', vrai: true },
            { texte: 'Analyser du JSON compliqué est souvent plus sûr en Python qu’en shell.', vrai: true },
          ],
          indices: ['Les parenthèses isolent.', 'Une seule fausse.', 's = silencieux.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '11.A',
      titre: 'Scripts de production : robustesse, fonctions et shellcheck',
      auDela: true,
      objectif: 'Écrire un script qui échoue proprement plutôt que de faire des dégâts.',
      rappel: `
        Cette fiche complète le livre avec les pratiques attendues en production (et au Lab 09).

        ### Le préambule

        \`\`\`
        #!/usr/bin/env bash
        set -euo pipefail
        \`\`\`

        - \`-e\` : arrêter le script dès qu’une commande échoue (hors \`if\`, \`&&\`, \`||\`) ;
        - \`-u\` : erreur si on utilise une variable non définie (une faute de frappe dans \`$DESTINATON\` ne passe plus) ;
        - \`-o pipefail\` : un tube échoue si **une** de ses commandes échoue (sinon seul le code de la dernière compte).

        Exemple de catastrophe évitée : \`rm -rf "$DEST/"*\` avec \`DEST\` vide efface \`/*\`. Avec \`-u\`, le script
        s’arrête ; mieux encore : \`rm -rf "\${DEST:?non défini}/"*\`.

        ### Fonctions

        \`\`\`
        journal() { logger -t sauvegarde "$*"; echo "$(date +%T) $*"; }
        mourir()  { echo "erreur : $*" >&2; exit 1; }
        verifier_espace() {
            local libre                      # variable locale à la fonction
            libre=$(df --output=avail -k "$1" | tail -1)
            (( libre > 1048576 )) || mourir "moins d'1 Go libre sur $1"
        }
        \`\`\`

        Une fonction a ses propres \`$1\`, \`$#\`, \`"$@"\`, et renvoie un code avec \`return N\`.

        ### Options et vérification

        - \`getopts\` lit des options courtes (\`-n\`, \`-v\`, \`-d rép\`) proprement.
        - **shellcheck** analyse un script et signale les pièges (guillemets manquants, \`cd\` sans \`|| exit\`,
          variables inutilisées…). C’est l’outil qui vérifie tous les scripts des labs dans la CI de ce dépôt.

        \`\`\`
        $ shellcheck sauvegarde.sh
        In sauvegarde.sh line 7:
        rm -rf $DEST/*
               ^---^ SC2086 (info): Double quote to prevent globbing and word splitting.
        \`\`\`
      `,
      aRetenir: [
        '`set -euo pipefail` : arrêt sur erreur, variables non définies interdites, tubes surveillés.',
        '`${VAR:?message}` protège les commandes destructrices.',
        'Fonctions : `nom() { local x; … return N; }` ; `$1`, `"$@"` propres à la fonction.',
        '`getopts` pour les options ; `shellcheck` pour vérifier.',
      ],
      exercices: [
        {
          id: 'c11-09-01', type: 'association', niveau: 2,
          enonce: 'Associe chaque option de `set` à son effet.',
          paires: [
            ['`set -e`', 'Arrêter le script à la première commande qui échoue'],
            ['`set -u`', 'Refuser les variables non définies'],
            ['`set -o pipefail`', 'Faire échouer un tube si une de ses commandes échoue'],
            ['`set -x`', 'Afficher chaque commande avant de l’exécuter'],
          ],
          indices: ['e = error.', 'u = unset.', 'x = trace (comme bash -x).'],
          solution: '-e erreur, -u non défini, pipefail tubes, -x trace.',
        },
        {
          id: 'c11-09-02', type: 'qcm', niveau: 3,
          enonce: 'Dans un script **sans** `set -u`, la variable `DEST` est vide à cause d’une faute de frappe. Que fait `rm -rf "$DEST"/*` ?',
          choix: [
            'Il devient rm -rf /* : il tente d’effacer tout le système',
            'Il ne fait rien car DEST est vide',
            'Il affiche une erreur de syntaxe',
            'Il efface le répertoire courant seulement',
          ],
          reponse: 0,
          indices: ['Remplace $DEST par rien.', 'Il reste "/"*', 'C’est la racine.'],
          solution: '`"$DEST"/*` devient `/*`. D’où `set -u` et surtout `"${DEST:?non défini}"/*`, qui arrête le script avec un message si DEST est vide ou absent.',
        },
        {
          id: 'c11-09-03', type: 'trous', niveau: 2,
          enonce: 'Complète la fonction `mourir`, qui affiche son message sur la sortie d’erreur puis arrête le script avec le code 1.',
          texte: 'mourir() {\n    echo "erreur : [[1]]" >&2\n    [[2]] 1\n}',
          trous: [
            { accepte: ['\\$\\*', '\\$@', '\\$1'], exemple: '$*' },
            { accepte: ['exit'], exemple: 'exit' },
          ],
          indices: ['Tous les arguments de la fonction, en une chaîne.', 'Quitter le script (pas seulement la fonction).', 'return quitterait seulement la fonction.'],
          solution: '```\nmourir() {\n    echo "erreur : $*" >&2\n    exit 1\n}\n```',
        },
        {
          id: 'c11-09-04', type: 'commande', niveau: 1,
          enonce: 'Vérifie le script `sauvegarde.sh` avec l’analyseur statique de scripts shell.',
          accepte: ['shellcheck sauvegarde\\.sh', 'shellcheck \\./sauvegarde\\.sh', 'shellcheck -x sauvegarde\\.sh'],
          exemple: 'shellcheck sauvegarde.sh',
          indices: ['Le nom évoque une vérification du shell.', 'Paquet du même nom.', '`shellcheck sauvegarde.sh`'],
          solution: '```\n$ shellcheck sauvegarde.sh\n```\nChaque avertissement a un code (SC2086…) documenté sur le site de shellcheck.',
        },
        {
          id: 'c11-09-05', type: 'sortie', niveau: 3,
          enonce: 'Qu’affiche ce script (bash) ?\n\n```\n#!/bin/bash\nset -o pipefail\nfalse | true\necho "code : $?"\n```',
          attendu: 'code : 1',
          indices: ['Sans pipefail, le code d’un tube est celui de la dernière commande.', 'Avec pipefail, un échec n’importe où compte.', 'false échoue.'],
          solution: '`code : 1`. Sans `pipefail`, on aurait `code : 0` (celui de `true`).',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Première ligne d’un script bash ?', r: '`#!/bin/bash` (ou `#!/bin/sh` pour du POSIX), lue par le noyau.' },
    { q: 'Pourquoi `./script` et pas `script` ?', r: 'Le répertoire courant n’est pas dans PATH.' },
    { q: 'Tracer un script ?', r: '`bash -x script` (ou `set -x` dans le script).' },
    { q: 'Guillemets doubles vs simples ?', r: '"…" : variables remplacées, pas de découpage ni jokers. \'…\' : tout littéral.' },
    { q: 'Règle d’or des variables ?', r: 'Toujours `"$variable"`.' },
    { q: '$#, $0, $?, $$, "$@" ?', r: 'Nombre d’arguments, nom du script, code de sortie, PID, tous les arguments un par un.' },
    { q: 'Codes de grep ?', r: '0 trouvé, 1 rien trouvé, 2 erreur.' },
    { q: 'Tester fichier, répertoire, chaîne vide ?', r: '`[ -f f ]`, `[ -d r ]`, `[ -z "$v" ]` (espaces obligatoires).' },
    { q: '= vs -eq ?', r: '= compare des chaînes, -eq des nombres.' },
    { q: 'Quitter si cd échoue ?', r: '`cd rep || exit 1`.' },
    { q: 'Structure de case ?', r: '`case "$x" in a|b) … ;; *) … ;; esac`.' },
    { q: 'Lire un fichier ligne par ligne ?', r: '`while read -r l; do …; done < fichier`.' },
    { q: 'Sortie d’une commande dans une variable ?', r: '`v=$(commande)`.' },
    { q: 'Fichier temporaire sûr et nettoyé ?', r: '`tmp=$(mktemp)` ; `trap \'rm -f "$tmp"\' EXIT`.' },
    { q: 'Here document sans substitution ?', r: "`cat <<'FIN' … FIN`." },
    { q: 'awk : champ 1 si champ 3 ≥ 1000 ?', r: "`awk -F: '$3 >= 1000 {print $1}' /etc/passwd`." },
    { q: 'Supprimer des fichiers trouvés, noms à espaces compris ?', r: '`find … -print0 | xargs -0 rm -f` (ou `-delete`).' },
    { q: '${f##*/}, ${f%.ext}, ${v:-d} ?', r: 'Nom de fichier ; sans suffixe ; valeur par défaut.' },
    { q: 'Sous-shell ?', r: '`( … )` : changements de répertoire et variables locaux ; les tubes aussi.' },
    { q: 'Charger les variables d’un fichier ?', r: '`. fichier` ou `source fichier`.' },
    { q: 'Préambule d’un script de production ?', r: '`set -euo pipefail`.' },
    { q: 'Protéger rm -rf "$DEST"/* ?', r: '`"${DEST:?non défini}"/*` (et set -u).' },
  ],
  memo: `
    ### Squelette
    \`\`\`
    #!/usr/bin/env bash
    set -euo pipefail
    mourir() { echo "erreur : $*" >&2; exit 1; }
    [ $# -ge 1 ] || mourir "usage : $0 FICHIER…"
    tmp=$(mktemp); trap 'rm -f "$tmp"' EXIT
    for f in "$@"; do [ -e "$f" ] || continue; …; done
    \`\`\`

    ### Guillemets
    sans : remplacement + jokers + découpage · "…" : remplacement seulement · '…' : rien · \\x : un caractère

    ### Variables spéciales
    $1… \${10} · $# · "$@" · "$*" · $0 · $$ · $? · shift

    ### Tests  [ … ]  (espaces !)
    -e -f -d -s -r -w -x -L · -z -n = != · -eq -ne -lt -le -gt -ge · ! · && || · [[ =~ ]] · (( n > 3 ))

    ### Structures
    \`\`\`
    if cmd; then …; elif …; then …; else …; fi
    case "$x" in a|b) … ;; *.gz) … ;; *) … ;; esac
    for v in a b c; do …; done        for i in {1..5}        for f in *.txt
    while read -r l; do …; done < f   until cmd; do sleep 2; done   break · continue
    \`\`\`

    ### Outils
    \`\`\`
    v=$(cmd)   $((a + b))   mktemp [-d]   trap '…' EXIT   cat <<FIN … FIN   <<'FIN'
    basename p [.ext]   dirname p   \${f##*/}   \${f%.ext}   \${v:-défaut}   \${v:?message}
    awk -F: '$3 >= 1000 {print $1}'   sed 's/a/b/g'   sed -i.bak   sed -n '5,10p'   sed '/^#/d'
    find … -print0 | xargs -0 cmd   exec > log 2>&1   ( cd d && … )   . fichier   read -r -p "…" v
    shellcheck script.sh
    \`\`\`
  `,
});
