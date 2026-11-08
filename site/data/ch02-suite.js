/* Chapitre 2, partie 2 : fiches 2.9 à 2.15, puis 2.A et 2.B (au-delà du livre). */
HLW.completer('02', {
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: '2.9',
      titre: 'Comprendre les messages d’erreur',
      sections: '§2.15', pages: '29–32',
      objectif: 'Lire un message d’erreur Unix et en déduire immédiatement la cause.',
      rappel: `
        Contrairement à d’autres systèmes, les messages d’erreur Unix disent en général **exactement** ce qui ne va pas.
        Encore faut-il les lire en entier.

        ### Anatomie

        \`\`\`
        ls: cannot access '/dsafsda': No such file or directory
        │                  │          └── le problème
        │                  └── l’objet concerné (souvent un chemin)
        └── le programme qui se plaint
        \`\`\`

        Traduction : « ls a voulu ouvrir /dsafsda, mais ce chemin n’existe pas ».

        **Règle d’or : traite la première erreur en premier.** Un programme qui ne trouve pas son fichier de configuration
        peut ensuite afficher des dizaines d’erreurs qui n’en sont que les conséquences. Distingue aussi les erreurs
        des **avertissements** (*warning*) : le programme signale un problème mais continue.

        ### Les erreurs les plus courantes

        | Message | Cause habituelle |
        |---|---|
        | **No such file or directory** | le fichier ou un répertoire du chemin n’existe pas (code \`ENOENT\`) |
        | **File exists** | tu crées quelque chose qui existe déjà (souvent un répertoire portant le nom d’un fichier) |
        | **Not a directory** / **Is a directory** | un fichier utilisé comme répertoire, ou l’inverse |
        | **No space left on device** | le système de fichiers est plein |
        | **Permission denied** | droits insuffisants pour lire, écrire… ou **exécuter** (bit \`x\` absent) |
        | **Operation not permitted** | action réservée, typiquement tuer le processus d’un autre utilisateur |
        | **Segmentation fault**, **Bus error** | le programme a accédé à une zone mémoire interdite : bogue, entrée inattendue, rarement matériel |

        Beaucoup de ces messages correspondent à des codes d’erreur que le noyau renvoie aux appels système :
        \`ENOENT\` est par exemple ce que renvoie \`open()\` (voir \`man 2 open\`, section ERRORS).

        > Sur une machine configurée en français, les messages sont traduits (« Aucun fichier ou dossier de ce type »,
        > « Permission non accordée »). Les images cloud sont en anglais par défaut, ce qui facilite les recherches sur le web.
      `,
      aRetenir: [
        'Programme : objet : problème. Lire le message en entier.',
        'Toujours traiter la **première** erreur d’abord.',
        '« Permission denied » peut venir d’un bit `x` manquant ; « Operation not permitted » d’un `kill` sur le processus d’autrui.',
      ],
      exercices: [
        {
          id: 'c02-09-01', type: 'association', niveau: 1, ref: '§2.15.2, p. 30–32',
          enonce: 'Associe chaque message d’erreur à sa cause la plus probable.',
          paires: [
            ['No such file or directory', 'Le chemin indiqué n’existe pas'],
            ['Permission denied', 'Droits insuffisants sur le fichier ou le répertoire'],
            ['Operation not permitted', 'Tentative de tuer le processus d’un autre utilisateur'],
            ['No space left on device', 'Le système de fichiers est plein'],
            ['Not a directory', 'Un fichier ordinaire est utilisé comme un répertoire'],
            ['Segmentation fault', 'Le programme a accédé à une zone mémoire interdite'],
          ],
          indices: ['Traduis littéralement chaque message.', '« Operation not permitted » concerne une action, pas un fichier.', 'Segmentation = découpage de la mémoire.'],
          solution: 'Ces six messages couvrent l’immense majorité des problèmes du quotidien. Retiens-les en anglais : c’est sous cette forme que tu les chercheras.',
        },
        {
          id: 'c02-09-02', type: 'qcm', niveau: 2, ref: '§2.15.2, p. 31',
          enonce: 'Tu tapes :\n\n```\n$ touch a\n$ touch a/b\ntouch: cannot touch \'a/b\': Not a directory\n```\n\nQuelle partie du chemin pose problème ?',
          choix: ['`a`, qui est un fichier et non un répertoire', '`b`, qui n’existe pas', 'Le `/`, qui est mal placé', '`touch`, qui ne sait pas créer de sous-répertoire'],
          reponse: 0,
          indices: ['Que crée la première commande ?', 'Pour créer `a/b`, `a` doit être un répertoire.', 'L’erreur porte sur la partie du chemin traitée comme un répertoire.'],
          solution: 'La première commande a créé `a` comme **fichier**. La seconde l’utilise comme répertoire. Le message mentionne `a/b`, mais c’est `a` le coupable : il faut parfois remonter le chemin pour trouver l’élément fautif.',
        },
        {
          id: 'c02-09-03', type: 'reponse-courte', niveau: 2, casse: true, mono: true, ref: '§2.15.2, p. 31',
          enonce: 'Quel est le **nom du code d’erreur** du noyau correspondant à « No such file or directory » ?',
          accepte: ['ENOENT'],
          indices: ['Les codes d’erreur commencent par un E majuscule.', 'Le livre le traduit par *Error NO ENTity*.', 'E-NO-ENT'],
          solution: '`ENOENT`. Tu le croiseras dans les sorties de `strace` (chapitre 8) et dans la section ERRORS des pages de manuel de la section 2.',
        },
        {
          id: 'c02-09-04', type: 'qcm', niveau: 1, ref: '§2.15.1, p. 30',
          enonce: 'Le service `brassd` de la brasserie refuse de démarrer et affiche trente lignes d’erreurs. La première dit : `brassd: cannot access /etc/brassd/brassd.conf: No such file or directory`. Que fais-tu ?',
          choix: [
            'Je vérifie et je corrige `/etc/brassd/brassd.conf` en premier',
            'Je lis la dernière erreur, c’est la plus récente',
            'Je réinstalle tout le système',
            'Je relance le service jusqu’à ce que ça passe',
          ],
          reponse: 0,
          indices: ['Quelle est la règle d’or ?', 'Les erreurs suivantes sont probablement des conséquences.', 'Le message te dit exactement quel fichier manque.'],
          solution: 'Traite **la première erreur**. Sans son fichier de configuration, le service ne peut rien faire correctement : les 29 autres erreurs en découlent probablement.',
        },
        {
          id: 'c02-09-05', type: 'qcm', niveau: 2, ref: '§2.15.2, p. 31',
          enonce: 'Tu peux lire le script `./sauvegarde.sh` avec `cat`, mais `./sauvegarde.sh` répond `Permission denied`. Pourquoi ?',
          choix: ['Le fichier n’a pas le bit d’exécution `x`', 'Le fichier est vide', 'Seul root peut lancer des scripts', 'Le script contient une erreur de syntaxe'],
          reponse: 0,
          indices: ['Lire et exécuter sont deux permissions différentes.', 'Regarde le mode avec `ls -l`.', 'Il manque une lettre dans le mode.'],
          solution: 'Pour lancer un fichier comme programme, il faut le bit **x**. `chmod u+x sauvegarde.sh` règle le problème (fiche 2.11). Une erreur de syntaxe produirait un autre message.',
        },
        {
          id: 'c02-09-06', type: 'vrai-faux', niveau: 1, ref: '§2.15, p. 29–32',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un message contenant *warning* signifie en général que le programme continue malgré un problème.', vrai: true },
            { texte: '« No such file or directory » ne concerne que les fichiers, jamais les répertoires.', vrai: false, explication: 'Unix ne distingue guère les deux pour ce message.' },
            { texte: 'Une « Segmentation fault » est presque toujours due à une panne de mémoire matérielle.', vrai: false, explication: 'C’est le plus souvent un bogue du programme ou une entrée inattendue.' },
            { texte: 'Beaucoup de messages d’erreur reflètent des codes renvoyés par les appels système.', vrai: true },
          ],
          indices: ['*Warning* = avertissement.', 'Le matériel est rarement en cause.', 'Deux vraies, deux fausses.'],
          solution: 'Vrai, faux, faux, vrai.',
        },
        {
          id: 'c02-09-07', type: 'terminal', niveau: 1,
          enonce: `
            Provoque volontairement trois erreurs sur ta VM et colle les messages :

            \`\`\`
            $ ls /nexistepas
            $ mkdir /etc/essai
            $ cat /etc/shadow
            \`\`\`

            Pour chacune, identifie le programme, l’objet et le problème.
          `,
          attendu: ['No such file|Aucun fichier', 'Permission denied|Permission non accordée'],
          indices: ['Les deux dernières commandes demandent des droits que tu n’as pas.', '`/etc/shadow` contient les mots de passe chiffrés : il est protégé.', 'Tu dois obtenir un « No such file » et deux « Permission denied ».'],
          solution: '```\nls: cannot access \'/nexistepas\': No such file or directory\nmkdir: cannot create directory \'/etc/essai\': Permission denied\ncat: /etc/shadow: Permission denied\n```\nLes deux derniers réussiraient avec `sudo` : c’est le sujet de la fiche 2.15.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '2.10',
      titre: 'Lister et contrôler les processus',
      sections: '§2.16', pages: '32–35',
      objectif: 'Voir ce qui tourne, arrêter un processus, travailler en arrière-plan.',
      rappel: `
        ### Lister avec ps

        Chaque processus a un identifiant unique, le **PID**. \`ps\` affiche :

        | Colonne | Sens |
        |---|---|
        | PID | identifiant du processus |
        | TTY | terminal auquel il est rattaché (\`?\` si aucun) |
        | STAT | état : \`R\` en cours d’exécution, \`S\` endormi (en attente), \`T\` arrêté, \`Z\` zombie… |
        | TIME | temps **processeur** consommé (pas le temps écoulé depuis le lancement) |
        | COMMAND | la commande (un processus peut modifier ce champ) |

        \`ps\` accepte trois styles d’options (Unix, BSD, GNU). Le livre utilise le style BSD, **sans tiret** :

        | Commande | Affiche |
        |---|---|
        | \`ps x\` | tous **tes** processus |
        | \`ps ax\` | tous les processus du système |
        | \`ps u\` | plus de détails (utilisateur, mémoire, CPU) |
        | \`ps w\` | les lignes de commande en entier |
        | \`ps aux\` | combinaison la plus courante |
        | \`ps u $$\` | ton shell actuel (\`$$\` = PID du shell) |

        Équivalent style Unix très répandu : \`ps -ef\`. Pratique : \`pgrep nom\` donne le PID d’après le nom.

        ### Envoyer des signaux avec kill

        Un **signal** est un message que le noyau délivre à un processus. \`kill\` envoie un signal (pas forcément mortel) :

        | Commande | Signal | Effet |
        |---|---|---|
        | \`kill PID\` | TERM (15) | demande de terminaison, le programme peut faire le ménage |
        | Ctrl-C | INT (2) | interruption du programme au premier plan |
        | \`kill -STOP PID\` | STOP | gèle le processus (il reste en mémoire) |
        | \`kill -CONT PID\` | CONT | le fait repartir |
        | \`kill -KILL PID\` ou \`kill -9 PID\` | KILL (9) | arrêt immédiat, **impossible à ignorer** : dernier recours |

        \`kill -l\` liste les signaux et leurs numéros. Ne tue pas au hasard des processus dont tu ignores le rôle.
        Les PID sont réutilisés après la fin d’un processus.

        ### Contrôle des tâches et arrière-plan

        - \`commande &\` lance en **arrière-plan** : le shell affiche le PID et te rend la main.
        - **Ctrl-Z** suspend la tâche au premier plan (signal TSTP) ; \`fg\` la ramène au premier plan, \`bg\` la relance en arrière-plan.
        - \`jobs\` liste les tâches de ce shell ; \`%1\` désigne la tâche n° 1 (\`kill %1\`).
        - Un processus en arrière-plan qui écrit sur le terminal mélange sa sortie avec ton travail : redirige-la (fiche 2.8).
        - Pour qu’un programme survive à ta déconnexion : \`nohup\`, ou mieux \`tmux\`/\`screen\` (et plus tard les services systemd).
        - **Ctrl-L** redessine l’écran ; **Ctrl-R** recherche dans l’historique (Échap pour sortir).
      `,
      aRetenir: [
        '`ps aux` (ou `ps -ef`) : tous les processus ; `ps u $$` : ton shell.',
        '`kill PID` = TERM (poli) ; `kill -KILL PID` = 9 (brutal, dernier recours).',
        '`&` arrière-plan ; Ctrl-Z suspend ; `fg`, `bg`, `jobs`.',
        'TIME = temps CPU consommé, pas le temps écoulé.',
      ],
      exercices: [
        {
          id: 'c02-10-01', type: 'commande', niveau: 1, ref: '§2.16.1, p. 33',
          enonce: 'Affiche **tous** les processus du système, avec le détail (utilisateur, CPU, mémoire).',
          accepte: ['ps (aux|axu|uax|uxa|xau|xua)w*', 'ps -aux', 'ps -ef', 'ps -eF', 'ps -elf', 'ps -efl', 'ps -ely'],
          exemple: 'ps aux',
          indices: ['Le livre utilise le style BSD, sans tiret.', 'Il faut combiner « tous les processus » (`ax`) et « détails » (`u`).', '`ps aux`'],
          solution: '```\n$ ps aux\nUSER  PID %CPU %MEM    VSZ   RSS TTY  STAT START   TIME COMMAND\nroot    1  0.0  0.6 ...                Ss   09:00   0:01 /sbin/init\n```\n`ps -ef` (style Unix) donne une vue comparable.',
        },
        {
          id: 'c02-10-02', type: 'commande', niveau: 2, ref: '§2.16.1, p. 33',
          enonce: 'Affiche les informations détaillées (format `u`) sur **ton shell actuel**, en utilisant la variable qui contient son PID.',
          accepte: ['ps u \\$\\$', 'ps -u? ?-p \\$\\$', 'ps -fp \\$\\$', 'ps -f -p \\$\\$', 'ps up \\$\\$'],
          exemple: 'ps u $$',
          indices: ['Le PID du shell est dans une variable spéciale de deux caractères.', 'C’est `$$`.', '`ps u $$`'],
          solution: '```\n$ ps u $$\nUSER   PID %CPU %MEM ... COMMAND\nadmin 1234  0.0  0.2 ... -bash\n```\nLe tiret devant `-bash` indique un **shell de connexion** (chapitre 13).',
        },
        {
          id: 'c02-10-03', type: 'commande', niveau: 1, ref: '§2.16.2, p. 33',
          enonce: 'Demande poliment au processus de PID `4242` de se terminer (signal par défaut).',
          accepte: ['kill 4242', 'kill -(TERM|SIGTERM|15) 4242', 'kill -s (TERM|SIGTERM|15) 4242'],
          exemple: 'kill 4242',
          pieges: [{ motif: 'kill -(9|KILL|SIGKILL) 4242', message: 'KILL est le dernier recours : il ne laisse pas le programme faire le ménage. On commence toujours par le signal par défaut.' }],
          indices: ['La commande s’appelle `kill`, même si elle ne tue pas forcément.', 'Sans option, elle envoie le signal TERM.', '`kill PID`'],
          solution: '```\n$ kill 4242\n```\nSignal TERM (15) : le programme peut sauvegarder, fermer ses fichiers, puis quitter.',
        },
        {
          id: 'c02-10-04', type: 'commande', niveau: 1, ref: '§2.16.2, p. 33',
          enonce: '**Gèle** le processus 4242 sans le terminer (il doit pouvoir repartir ensuite).',
          accepte: ['kill -(STOP|SIGSTOP|19) 4242', 'kill -s (STOP|SIGSTOP) 4242'],
          exemple: 'kill -STOP 4242',
          indices: ['Il existe un signal qui arrête sans tuer.', '« Arrêter » se dit *stop*.', '`kill -STOP PID`, puis `kill -CONT PID` pour reprendre.'],
          solution: '```\n$ kill -STOP 4242\n$ kill -CONT 4242   # pour le relancer\n```\nUn processus stoppé apparaît avec l’état `T` dans `ps`.',
        },
        {
          id: 'c02-10-05', type: 'ordre', niveau: 2, ref: '§2.16.2, p. 33–34',
          enonce: 'Un script d’export bloqué consomme 100 % du CPU. Remets dans l’ordre la démarche propre pour l’arrêter.',
          elements: [
            'Identifier son PID avec `ps aux` ou `pgrep`',
            'Envoyer le signal par défaut : `kill PID`',
            'Attendre quelques secondes et vérifier avec `ps` s’il a disparu',
            'S’il est toujours là, en dernier recours : `kill -KILL PID`',
          ],
          indices: ['On ne peut rien envoyer sans connaître le PID.', 'On commence par le signal le plus doux.', 'KILL vient en dernier, après vérification.'],
          solution: 'Identifier, demander poliment (TERM), vérifier, et seulement ensuite forcer (KILL). KILL empêche le programme de nettoyer : fichiers temporaires, verrous, données à moitié écrites.',
        },
        {
          id: 'c02-10-06', type: 'association', niveau: 2, ref: '§2.16.2–2.16.3, p. 33–34',
          enonce: 'Associe chaque signal à son effet ou à son déclencheur.',
          paires: [
            ['TERM', 'Demande de terminaison, signal par défaut de `kill`'],
            ['KILL', 'Arrêt immédiat, impossible à ignorer'],
            ['INT', 'Envoyé par Ctrl-C'],
            ['TSTP', 'Envoyé par Ctrl-Z'],
            ['STOP', 'Gèle le processus'],
            ['CONT', 'Fait repartir un processus gelé'],
          ],
          indices: ['TERM = terminate, INT = interrupt, CONT = continue.', 'Ctrl-C interrompt, Ctrl-Z suspend.', 'TSTP = *terminal stop*.'],
          solution: 'TERM (poli), KILL (brutal), INT (Ctrl-C), TSTP (Ctrl-Z, comme STOP mais depuis le terminal), STOP (gel), CONT (reprise).',
        },
        {
          id: 'c02-10-07', type: 'reponse-courte', niveau: 1, ref: '§2.16.2, p. 34',
          enonce: 'Quel est le **numéro** du signal KILL ?',
          accepte: ['9', 'neuf'],
          indices: ['C’est le célèbre `kill -…`', 'Un seul chiffre.', 'Entre 8 et 10.'],
          solution: '**9**. `kill -9 PID` équivaut à `kill -KILL PID`. `kill -l` affiche la table complète.',
        },
        {
          id: 'c02-10-08', type: 'qcm', niveau: 1, ref: '§2.16.3, p. 34',
          enonce: 'En éditant un fichier dans `vi`, tu as appuyé sur Ctrl-Z par erreur : tu es revenu à l’invite. Comment retrouver ton éditeur ?',
          choix: ['`fg`', '`bg`', 'Relancer `vi fichier`', '`kill -CONT vi`'],
          reponse: 0,
          indices: ['Ctrl-Z a suspendu la tâche : elle existe toujours.', 'Il faut la ramener au **premier plan**.', '*foreground*'],
          solution: '`fg` ramène la tâche suspendue au premier plan. Relancer `vi` ouvrirait une seconde instance (et un avertissement sur le fichier d’échange). `jobs` te montre les tâches suspendues.',
        },
        {
          id: 'c02-10-09', type: 'commande', niveau: 1, ref: '§2.16.4, p. 34',
          enonce: 'Compresse le gros fichier `ventes-2025.csv` avec `gzip` **en arrière-plan**, pour garder la main sur ton terminal.',
          accepte: ['gzip ventes-2025\\.csv ?&', 'nohup gzip ventes-2025\\.csv ?&'],
          exemple: 'gzip ventes-2025.csv &',
          indices: ['Un caractère en fin de ligne suffit.', 'Le « et commercial ».', '`commande &`'],
          solution: '```\n$ gzip ventes-2025.csv &\n[1] 2817\n```\nLe shell affiche le numéro de tâche et le PID, puis te rend l’invite.',
        },
        {
          id: 'c02-10-10', type: 'vrai-faux', niveau: 2, ref: '§2.16, p. 32',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Dans `ps`, l’état `S` signifie que le processus est endormi (il attend quelque chose).', vrai: true },
            { texte: 'La colonne TIME indique depuis combien de temps le processus a été lancé.', vrai: false, explication: 'C’est le temps **processeur** consommé.' },
            { texte: 'Un PID peut être réutilisé après la fin d’un processus.', vrai: true },
            { texte: 'Le signal KILL laisse au processus le temps de sauvegarder ses données.', vrai: false, explication: 'Le noyau retire le processus de la mémoire sans le prévenir.' },
          ],
          indices: ['TIME et « temps écoulé » sont deux choses différentes.', 'KILL ne peut être ni intercepté ni ignoré.', 'Deux vraies, deux fausses.'],
          solution: 'Vrai, faux, vrai, faux.',
        },
        {
          id: 'c02-10-11', type: 'terminal', niveau: 2,
          enonce: `
            Sur ta VM, enchaîne :

            \`\`\`
            $ sleep 1000 &
            $ sleep 2000 &
            $ jobs
            $ kill %1
            $ jobs
            \`\`\`

            Colle la sortie. Que s’est-il passé pour la tâche n° 1 ?
          `,
          attendu: ['sleep 1000', 'sleep 2000'],
          indices: ['`jobs` numérote les tâches de ton shell.', '`%1` désigne la tâche 1, pas le PID 1 !', 'Termine en tuant aussi la tâche 2 : `kill %2`.'],
          solution: '```\n[1]-  Running    sleep 1000 &\n[2]+  Running    sleep 2000 &\n[1]-  Terminated sleep 1000\n[2]+  Running    sleep 2000 &\n```\n`kill %1` a envoyé TERM à la tâche 1. Attention : `kill 1` (sans `%`) viserait le PID 1, c’est-à-dire systemd (refusé si tu n’es pas root, heureusement).',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '2.11',
      titre: 'Modes et permissions des fichiers',
      sections: '§2.17 et 2.17.1', pages: '35–37',
      objectif: 'Lire un mode, le modifier en notation symbolique ou octale, comprendre umask.',
      rappel: `
        ### Lire un mode

        \`\`\`
        -rw-r--r--   1 bastien brasseurs 7041 Mar 26 19:34 recette-ipa.txt
        │└┬┘└┬┘└┬┘
        │ │  │  └── autres (o) : r--
        │ │  └───── groupe (g) : r--
        │ └──────── propriétaire (u) : rw-
        └────────── type : - fichier ordinaire, d répertoire, l lien symbolique…
        \`\`\`

        - **r** : lecture ; **w** : écriture ; **x** : exécution ; **-** : droit absent.
        - Pour un **répertoire** : \`r\` permet de lister son contenu, \`x\` permet d’y **accéder** (y entrer, atteindre les fichiers qu’il contient), \`w\` permet d’y créer ou supprimer des fichiers.
        - Un **s** à la place du \`x\` du propriétaire signale un exécutable **setuid** : il s’exécute avec les droits de son propriétaire. \`/usr/bin/passwd\` appartient à root et est setuid : c’est ainsi qu’il peut modifier les fichiers de mots de passe (fiche 2.A).
        - \`groups\` affiche tes groupes.

        ### chmod en notation symbolique

        \`\`\`
        $ chmod g+r fichier        # ajouter la lecture au groupe
        $ chmod go+r fichier       # au groupe et aux autres
        $ chmod go-r fichier       # retirer
        $ chmod u+x script.sh      # rendre exécutable par le propriétaire
        $ chmod u=rw,go= fichier   # fixer exactement : rw pour u, rien pour g et o
        \`\`\`

        ### chmod en notation octale (absolue)

        Chaque groupe de trois droits devient un chiffre : **r = 4, w = 2, x = 1**, que l’on additionne.

        | Mode | Droits | Usage typique |
        |---|---|---|
        | 644 | rw-r--r-- | fichiers |
        | 600 | rw------- | fichiers privés |
        | 755 | rwxr-xr-x | répertoires, programmes |
        | 700 | rwx------ | répertoires, programmes privés |
        | 711 | rwx--x--x | répertoires (accès sans listage) |

        Piège classique : appliquer \`644\` à un répertoire lui retire le \`x\`, et plus personne ne peut y entrer.

        ### umask

        Le **masque** retire des droits aux fichiers que tu crées. Les programmes demandent en général 666 pour un fichier, 777 pour un répertoire ; le masque enlève les bits qu’il contient :

        - \`umask 022\` → fichiers 644, répertoires 755 (tout le monde peut lire) ;
        - \`umask 077\` → fichiers 600, répertoires 700 (rien pour les autres) ;
        - \`umask 027\` → fichiers 640, répertoires 750.

        Pour que ce soit permanent, on le place dans un fichier de démarrage du shell (chapitre 13).

        ### Changer le propriétaire (complément, hors §2.17)

        \`chown utilisateur:groupe fichier\` change le propriétaire et le groupe (root uniquement) ; \`chgrp groupe fichier\`
        change le groupe (vers un groupe dont tu fais partie). Avec \`-R\`, l’opération est récursive. Indispensable pour le Lab 01.
      `,
      aRetenir: [
        'Mode = type + droits u/g/o ; r = 4, w = 2, x = 1.',
        'Répertoire : `r` lister, `x` accéder, `w` créer/supprimer dedans.',
        '`chmod go+r`, `chmod u+x`, `chmod 644`, `chmod 600`, `chmod 755`.',
        '`umask 022` → 644/755 ; `umask 077` → 600/700.',
      ],
      exercices: [
        {
          id: 'c02-11-01', type: 'association', niveau: 1, ref: '§2.17, figure 2-1, p. 35',
          enonce: 'Le mode d’un fichier est `-rwxr-x---`. Associe chaque partie à sa signification.',
          paires: [
            ['`-` (1ᵉʳ caractère)', 'Type : fichier ordinaire'],
            ['`rwx`', 'Droits du propriétaire'],
            ['`r-x`', 'Droits du groupe'],
            ['`---`', 'Droits des autres'],
          ],
          indices: ['Le premier caractère n’est pas une permission.', 'Ensuite viennent trois groupes de trois caractères.', 'Ordre : propriétaire, groupe, autres.'],
          solution: 'Type `-` (fichier ordinaire), propriétaire `rwx`, groupe `r-x`, autres `---`. En octal : **750**.',
        },
        {
          id: 'c02-11-02', type: 'reponse-courte', niveau: 1, mono: true, ref: '§2.17.1, tableau 2-4, p. 37',
          enonce: 'Quelle est la notation octale de `rw-r--r--` ?',
          accepte: ['0?644'],
          indices: ['r = 4, w = 2, x = 1.', 'rw- = 4 + 2 = 6 ; r-- = 4.', 'Trois chiffres : propriétaire, groupe, autres.'],
          solution: '**644** : rw- = 6, r-- = 4, r-- = 4.',
        },
        {
          id: 'c02-11-03', type: 'reponse-courte', niveau: 2, mono: true,
          enonce: 'Quelle est la notation octale de `rwxr-x---` ?',
          accepte: ['0?750'],
          indices: ['rwx = 4 + 2 + 1.', 'r-x = 4 + 1.', '--- = 0.'],
          solution: '**750** : rwx = 7, r-x = 5, --- = 0.',
        },
        {
          id: 'c02-11-04', type: 'reponse-courte', niveau: 2, mono: true, casse: true,
          enonce: 'Écris les 9 caractères de droits correspondant au mode octal `640` (sans le caractère de type).',
          accepte: ['rw-r-----'],
          indices: ['Décompose chaque chiffre en 4, 2, 1.', '6 = 4 + 2 ; 4 = 4 ; 0 = rien.', 'rw- puis r-- puis ---.'],
          solution: '`rw-r-----` : lecture et écriture pour le propriétaire, lecture pour le groupe, rien pour les autres. Mode typique d’un fichier partagé avec une équipe.',
        },
        {
          id: 'c02-11-05', type: 'commande', niveau: 1, ref: '§2.17.1, p. 36',
          enonce: 'Ajoute le droit de **lecture** au **groupe** et aux **autres** sur `rapport.txt`, en notation symbolique et en une seule commande.',
          accepte: ['chmod (go|og)\\+r rapport\\.txt', 'chmod g\\+r,o\\+r rapport\\.txt', 'chmod o\\+r,g\\+r rapport\\.txt'],
          exemple: 'chmod go+r rapport.txt',
          pieges: [{ motif: 'chmod (a\\+r|\\+r|ugo\\+r) rapport\\.txt', message: 'Cela marche aussi, mais touche également le propriétaire. La consigne vise le groupe et les autres.' }],
          indices: ['`g` = groupe, `o` = autres (*others*).', '`+` ajoute un droit.', '`chmod go+r fichier`'],
          solution: '```\n$ chmod go+r rapport.txt\n```\n`go-r` retirerait ces droits.',
        },
        {
          id: 'c02-11-06', type: 'commande', niveau: 1,
          enonce: 'Le script `export-ventes.sh` est en mode 644. Rends-le exécutable **par son propriétaire uniquement**.',
          accepte: ['chmod u\\+x export-ventes\\.sh', 'chmod 744 export-ventes\\.sh', 'chmod u=rwx export-ventes\\.sh'],
          exemple: 'chmod u+x export-ventes.sh',
          pieges: [{ motif: 'chmod (\\+x|a\\+x|ugo\\+x|755) export-ventes\\.sh', message: 'Ceci donne le droit d’exécution à tout le monde. La consigne le réserve au propriétaire.' }],
          indices: ['`u` désigne le propriétaire (*user*).', 'On ajoute le droit `x`.', '`chmod u+x` ou, depuis 644, le mode 744.'],
          solution: '```\n$ chmod u+x export-ventes.sh\n```\nDepuis 644, cela donne 744 (`rwxr--r--`).',
        },
        {
          id: 'c02-11-07', type: 'commande', niveau: 2, ref: '§2.17.1, tableau 2-4',
          enonce: 'Chloé veut que son fichier `salaires.ods` soit lisible et modifiable **par elle seule**, et par personne d’autre. Utilise la notation octale.',
          accepte: ['chmod 0?600 salaires\\.ods'],
          exemple: 'chmod 600 salaires.ods',
          indices: ['Le propriétaire a rw ; groupe et autres : rien.', 'rw = 6.', '600'],
          solution: '```\n$ chmod 600 salaires.ods\n```\nÉquivalent symbolique : `chmod u=rw,go= salaires.ods`.',
        },
        {
          id: 'c02-11-08', type: 'qcm', niveau: 2, ref: '§2.17.1, p. 37',
          enonce: 'Bastien a tapé `chmod 644 recettes` sur un **répertoire**. Que se passe-t-il quand il essaie d’ouvrir un fichier dedans ?',
          choix: [
            'Accès refusé : le répertoire n’a plus le bit `x`, plus personne ne peut atteindre son contenu',
            'Tout fonctionne normalement',
            'Les fichiers du répertoire deviennent tous en 644',
            'Le répertoire est transformé en fichier ordinaire',
          ],
          reponse: 0,
          indices: ['Que signifie `x` pour un répertoire ?', '644 ne contient aucun `x`.', 'Sans `x`, on ne peut pas « traverser » le répertoire.'],
          solution: 'Sans `x`, impossible d’accéder au contenu, même pour le propriétaire (`ls` affichera des noms avec des erreurs, mais rien ne s’ouvre). C’est l’erreur classique des modes absolus sur les répertoires : il fallait **755**.',
        },
        {
          id: 'c02-11-09', type: 'trous', niveau: 3,
          enonce: 'Prédis les modes affichés par `ls -ld` après ces commandes (10 caractères, type compris).\n\n```\n$ umask 027\n$ touch f\n$ mkdir d\n$ ls -ld f d\n```',
          texte: 'f : [[1]]\nd : [[2]]',
          trous: [
            { accepte: ['-rw-r-----'], exemple: '-rw-r-----', taille: 10 },
            { accepte: ['drwxr-x---'], exemple: 'drwxr-x---', taille: 10 },
          ],
          indices: ['Un fichier part de 666, un répertoire de 777.', 'Le masque 027 retire w au groupe, et tout aux autres.', '666 − 027 → 640 ; 777 − 027 → 750.'],
          solution: '```\n-rw-r----- … f\ndrwxr-x--- … d\n```\nLe fichier part de 666 et devient 640 ; le répertoire part de 777 et devient 750.',
        },
        {
          id: 'c02-11-10', type: 'vrai-faux', niveau: 1, ref: '§2.17, p. 36–37',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un exécutable setuid s’exécute avec les droits de son propriétaire.', vrai: true },
            { texte: 'Pour atteindre un fichier dans un répertoire, il faut le droit `x` sur ce répertoire.', vrai: true },
            { texte: 'Rendre un fichier accessible en écriture à tous (`o+w`) est sans risque si la machine est sur un réseau local.', vrai: false, explication: 'N’importe quel compte de la machine (dont les services compromis) pourrait le modifier.' },
            { texte: '`umask 077` rend tes nouveaux fichiers illisibles par les autres utilisateurs.', vrai: true },
          ],
          indices: ['`passwd` est l’exemple classique de setuid.', 'Une seule affirmation est fausse.', 'Pense au principe du moindre privilège.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
        {
          id: 'c02-11-11', type: 'terminal', niveau: 2,
          enonce: 'Sur ta VM, lance `ls -l /usr/bin/passwd` et colle la sortie. Repère la lettre inhabituelle dans le mode et explique-la.',
          attendu: ['-rws'],
          indices: ['Regarde la 4ᵉ lettre du mode.', 'Ce n’est pas un `x`.', 'C’est le bit setuid.'],
          solution: '```\n-rwsr-xr-x 1 root root 118168 … /usr/bin/passwd\n```\nLe **s** est le bit setuid : `passwd` s’exécute avec les droits de root, même lancé par toi. Sans cela, tu ne pourrais pas modifier `/etc/shadow` pour changer ton mot de passe.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '2.12',
      titre: 'Les liens symboliques',
      sections: '§2.17.2', pages: '38–39',
      objectif: 'Créer et reconnaître des liens symboliques, éviter leurs pièges.',
      rappel: `
        Un **lien symbolique** (*symlink*) est un fichier qui **pointe vers un autre chemin**, comme un raccourci.
        Dans \`ls -l\`, son type est \`l\` et sa cible apparaît après une flèche :

        \`\`\`
        lrwxrwxrwx 1 admin admin 18 Feb 27 13:52 courant -> /srv/recettes/2026
        \`\`\`

        Accéder à \`courant\`, c’est accéder à \`/srv/recettes/2026\`.

        ### Créer

        \`\`\`
        $ ln -s cible nom_du_lien
        $ ln -s /srv/recettes/2026 courant
        \`\`\`

        L’ordre est le même que pour \`cp\` : **ce qui existe d’abord, ce que tu crées ensuite**.

        ### Les pièges

        - La cible **n’a pas besoin d’exister** : un lien vers un chemin absent est « cassé » (*dangling*) ; y accéder donne « No such file or directory » alors que le lien est bien visible.
        - Le nom d’un lien ne dit rien de sa cible : fichier ? répertoire ? autre lien (liens en chaîne) ? Il faut regarder.
        - Inverser les arguments alors que le « nom » est un répertoire existant crée le lien **à l’intérieur** de ce répertoire (et il peut pointer vers lui-même). Vérifie toujours avant d’appuyer sur Entrée.
        - Tu peux modifier sans t’en rendre compte l’original en croyant éditer une copie.
        - **N’oublie pas \`-s\`** : sans lui, \`ln\` crée un **lien physique** (*hard link*), un second nom pour les mêmes données. On les étudiera avec les inodes (fiche 4.6).

        Pour voir où pointe un lien : \`ls -l lien\` ou \`readlink lien\` (\`readlink -f\` suit toute la chaîne jusqu’au fichier réel).

        Malgré ces pièges, les liens symboliques sont partout : ils permettent qu’un programme trouve un fichier à l’endroit
        attendu sans dupliquer quoi que ce soit (\`/bin\` → \`usr/bin\`, \`/bin/sh\` → \`dash\`…).
      `,
      aRetenir: [
        '`ln -s cible nom` : la cible d’abord.',
        'Type `l` dans `ls -l`, cible après `->`.',
        'Un lien peut être cassé ; son nom ne dit rien de la cible.',
        'Sans `-s` : lien physique (fiche 4.6).',
      ],
      exercices: [
        {
          id: 'c02-12-01', type: 'commande', niveau: 1, ref: '§2.17.2, p. 38',
          enonce: 'Crée un lien symbolique nommé `courant` qui pointe vers `/srv/recettes/2026`.',
          accepte: ['ln -s /srv/recettes/2026/? courant', 'ln --symbolic /srv/recettes/2026/? courant', 'ln -sv /srv/recettes/2026/? courant', 'ln -sfn /srv/recettes/2026/? courant', 'ln -sn /srv/recettes/2026/? courant'],
          exemple: 'ln -s /srv/recettes/2026 courant',
          pieges: [
            { motif: 'ln -s courant /srv/recettes/2026/?', message: 'Arguments inversés : la **cible** (ce qui existe) vient en premier, le nom du lien en second.' },
            { motif: 'ln /srv/recettes/2026/? courant', message: 'Sans `-s`, `ln` crée un lien physique (et refuse pour un répertoire).' },
          ],
          indices: ['La commande des liens est `ln`.', 'Il faut l’option des liens **symboliques**.', '`ln -s cible nom`'],
          solution: '```\n$ ln -s /srv/recettes/2026 courant\n$ ls -l courant\nlrwxrwxrwx 1 admin admin 18 … courant -> /srv/recettes/2026\n```',
        },
        {
          id: 'c02-12-02', type: 'qcm', niveau: 2, ref: '§2.17.2, p. 38',
          enonce: 'Tu vois `donnees -> /mnt/ancien-disque/donnees` dans `ls -l`, mais `cd donnees` répond `No such file or directory`. Explication la plus probable ?',
          choix: [
            'La cible `/mnt/ancien-disque/donnees` n’existe plus : le lien est cassé',
            'Le lien est corrompu et doit être réparé avec fsck',
            'Il faut être root pour suivre un lien symbolique',
            '`cd` ne fonctionne pas avec les liens',
          ],
          reponse: 0,
          indices: ['Le lien lui-même existe, puisque `ls` le montre.', 'Le message parle de ce que le lien désigne.', 'Une cible n’a pas besoin d’exister pour qu’un lien soit créé.'],
          solution: 'Le lien existe, mais sa **cible** a disparu (disque retiré, répertoire déplacé) : le lien est **cassé**. `readlink donnees` affiche la cible ; recrée le lien vers le bon chemin ou supprime-le (`rm donnees`, qui ne touche pas la cible).',
        },
        {
          id: 'c02-12-03', type: 'vrai-faux', niveau: 1, ref: '§2.17.2, p. 38–39',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Sans l’option `-s`, `ln` crée un lien physique.', vrai: true },
            { texte: 'Le nom d’un lien symbolique indique si sa cible est un fichier ou un répertoire.', vrai: false },
            { texte: 'Un lien symbolique peut pointer vers un autre lien symbolique.', vrai: true, explication: 'On parle de liens en chaîne.' },
            { texte: 'Supprimer un lien symbolique supprime aussi sa cible.', vrai: false, explication: '`rm lien` ne supprime que le lien.' },
          ],
          indices: ['Un lien n’est qu’un nom qui pointe vers un chemin.', 'Deux vraies, deux fausses.', '`rm` sur un lien agit sur le lien.'],
          solution: 'Vrai, faux, vrai, faux.',
        },
        {
          id: 'c02-12-04', type: 'reponse-courte', niveau: 1, casse: true, mono: true, ref: '§2.17.2, p. 38',
          enonce: 'Quelle lettre indique un lien symbolique dans la première colonne de `ls -l` ?',
          accepte: ['l'],
          indices: ['C’est le premier caractère du mode.', '`d` pour *directory*, `-` pour fichier ordinaire…', 'Initiale de *link*.'],
          solution: '`l` (comme *link*) : `lrwxrwxrwx`. Les droits d’un lien symbolique sont toujours `rwxrwxrwx` et sans importance : ce sont ceux de la cible qui comptent.',
        },
        {
          id: 'c02-12-05', type: 'commande', niveau: 2,
          enonce: 'Affiche **uniquement** la cible du lien `courant` (sans la ligne complète de `ls -l`).',
          accepte: ['readlink courant', 'readlink -f courant', 'readlink -e courant', 'realpath courant', 'readlink -m courant'],
          exemple: 'readlink courant',
          pieges: [{ motif: 'ls -l courant', message: 'Cela marche, mais affiche toute la ligne. Il existe une commande qui ne donne que la cible.' }],
          indices: ['« Lire le lien », en anglais.', 'Commande en un mot : *read* + *link*.', '`readlink`'],
          solution: '```\n$ readlink courant\n/srv/recettes/2026\n```\n`readlink -f` suit toute la chaîne de liens et affiche le chemin réel final.',
        },
        {
          id: 'c02-12-06', type: 'qcm', niveau: 3, ref: '§2.17.2, p. 38',
          enonce: 'Tu voulais taper `ln -s /srv/partage partage`, mais tu as tapé `ln -s partage /srv/partage`. Or `/srv/partage` est un répertoire existant. Résultat ?',
          choix: [
            'Un lien `/srv/partage/partage` est créé, qui pointe vers « partage », c’est-à-dire vers lui-même',
            'Le répertoire `/srv/partage` est remplacé par un lien',
            'Une erreur « File exists » et rien n’est créé',
            'Le lien `partage` est créé dans le répertoire courant, comme voulu',
          ],
          reponse: 0,
          indices: ['Quand la destination est un répertoire existant, `ln` (comme `cp`) crée le nouvel élément **dedans**.', 'La cible donnée est le chemin relatif `partage`.', 'Un chemin relatif dans un lien est interprété depuis le répertoire où se trouve le lien.'],
          solution: '`ln` crée `/srv/partage/partage`. Sa cible relative « partage » est interprétée depuis `/srv/partage` : le lien pointe vers lui-même (« Too many levels of symbolic links »). C’est exactement le piège décrit par le livre. Supprime le lien errant avec `rm /srv/partage/partage`.',
        },
        {
          id: 'c02-12-07', type: 'terminal', niveau: 1,
          enonce: 'Dans ton répertoire personnel sur la VM, crée un lien `monos` vers `/etc/os-release`, affiche son contenu à travers le lien, puis `ls -l monos`. Colle la sortie.',
          attendu: ['monos -> /etc/os-release'],
          indices: ['`ln -s cible nom`', '`cat monos` affiche le contenu de la cible.', '`ls -l monos` montre la flèche.'],
          solution: '```\n$ ln -s /etc/os-release monos\n$ cat monos\nPRETTY_NAME="Debian GNU/Linux 13 (trixie)"\n…\n$ ls -l monos\nlrwxrwxrwx 1 admin admin 15 … monos -> /etc/os-release\n```\nSur Rocky, `/etc/os-release` est lui-même un lien vers `../usr/lib/os-release` : `readlink -f monos` te le montrera.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '2.13',
      titre: 'Archiver et compresser',
      sections: '§2.18', pages: '39–41',
      objectif: 'Créer, inspecter et extraire des archives tar, compressées ou non.',
      rappel: `
        Deux opérations distinctes, souvent combinées :

        - **compresser** un fichier : \`gzip\` (\`.gz\`), \`bzip2\` (\`.bz2\`), \`xz\` (\`.xz\`) ;
        - **archiver** plusieurs fichiers et répertoires en un seul : \`tar\` (\`.tar\`).

        ### gzip

        \`gzip fichier\` crée \`fichier.gz\` **et supprime l’original** ; \`gunzip fichier.gz\` fait l’inverse.
        \`zcat fichier.gz\` (= \`gunzip -dc\`) décompresse vers la sortie standard sans toucher au fichier.

        ### tar

        \`\`\`
        $ tar cvf archive.tar fichier1 rep2     # c : créer
        $ tar tvf archive.tar                    # t : table des matières (vérifier)
        $ tar xvf archive.tar                    # x : extraire
        \`\`\`

        - \`v\` : verbeux (affiche les fichiers traités) ; \`vv\` donne plus de détails.
        - \`f\` : **le mot suivant est le nom de l’archive** (obligatoire sauf sur bande ; \`-\` pour l’entrée ou la sortie standard).
        - \`p\` : préserver les permissions de l’archive à l’extraction (par défaut quand on est root).
        - L’extraction ne supprime pas l’archive.

        **Vérifie avec \`t\` avant d’extraire** : tous les chemins doivent commencer par le même répertoire. Sinon tu risques
        de répandre des centaines de fichiers dans le répertoire courant. En cas de doute, extrais dans un répertoire vide.

        ### Archives compressées (.tar.gz, .tgz)

        On lit l’extension **de droite à gauche** : d’abord décompresser, puis désarchiver.

        \`\`\`
        $ gunzip fichier.tar.gz && tar xvf fichier.tar   # en deux temps
        $ zcat fichier.tar.gz | tar xvf -                # en un tube
        $ tar zxvf fichier.tar.gz                        # option z : tar appelle gzip lui-même
        $ tar zcvf sauvegarde.tar.gz rep/                # créer une archive compressée
        \`\`\`

        Les équivalents pour les autres formats : \`j\` pour bzip2, \`J\` pour xz. Le GNU tar moderne détecte aussi la
        compression tout seul à l’extraction (\`tar xf fichier.tar.xz\`). \`.tgz\` est un simple synonyme de \`.tar.gz\`.

        Autres formats : \`zip\`/\`unzip\` pour les archives Windows ; \`.Z\` est une relique de \`compress\` que \`gunzip\` sait encore lire.

        > Le livre conseille d’apprendre ces options par cœur, quitte à faire des cartes : c’est exactement ce que proposent les cartes de révision de ce chapitre.
      `,
      aRetenir: [
        '`tar c` créer, `t` lister, `x` extraire ; `v` verbeux ; `f` suivi du nom de l’archive.',
        '`z` gzip, `j` bzip2, `J` xz.',
        '`gzip` supprime l’original ; `zcat` lit sans décompresser sur disque.',
        'Toujours lister (`t`) avant d’extraire.',
      ],
      exercices: [
        {
          id: 'c02-13-01', type: 'commande', niveau: 1, ref: '§2.18.2, p. 39',
          enonce: 'Crée une archive **non compressée** `recettes.tar` contenant le répertoire `recettes`.',
          accepte: ['tar -?(cvf|cf|vcf) recettes\\.tar recettes/?', 'tar -c -v? ?-f recettes\\.tar recettes/?', 'tar --create (--verbose )?--file[= ]recettes\\.tar recettes/?'],
          exemple: 'tar cvf recettes.tar recettes',
          pieges: [{ motif: 'tar -?(zcvf|czvf|czf|zcf) recettes\\.tar recettes/?', message: 'L’option `z` compresserait l’archive : on voulait un .tar simple.' }, { motif: 'tar -?(cvf|cf) recettes/? recettes\\.tar', message: 'Le nom de l’archive doit suivre immédiatement l’option `f`.' }],
          indices: ['`c` pour créer, `f` pour indiquer le nom de l’archive.', 'Le nom de l’archive vient juste après les options.', '`tar cvf archive.tar répertoire`'],
          solution: '```\n$ tar cvf recettes.tar recettes\n```\n`v` est facultatif (il affiche la liste des fichiers ajoutés).',
        },
        {
          id: 'c02-13-02', type: 'commande', niveau: 1, ref: '§2.18.2, p. 40',
          enonce: 'Affiche la liste des fichiers contenus dans `recettes.tar`, **sans rien extraire**.',
          accepte: ['tar -?(tvf|tf|vtf) recettes\\.tar', 'tar --list (--verbose )?--file[= ]recettes\\.tar', 'tar -t -v? ?-f recettes\\.tar'],
          exemple: 'tar tvf recettes.tar',
          indices: ['Il existe un mode « table des matières ».', 'La lettre est `t`.', '`tar tvf archive.tar`'],
          solution: '```\n$ tar tvf recettes.tar\ndrwxr-xr-x bastien/brasseurs 0 … recettes/\n-rw-r--r-- bastien/brasseurs 3804 … recettes/ipa.txt\n```\nTous les chemins commencent par `recettes/` : l’extraction sera propre.',
        },
        {
          id: 'c02-13-03', type: 'commande', niveau: 2, ref: '§2.18.4, p. 41',
          enonce: 'Extrais en **une seule commande** le contenu de `site-web.tar.gz` dans le répertoire courant.',
          accepte: ['tar -?(zxvf|xzvf|xvzf|zxf|xzf|xfz|zvxf|vzxf|vxzf|xvf|xf) site-web\\.tar\\.gz', 'tar -x -z? ?-v? ?-f site-web\\.tar\\.gz', 'zcat site-web\\.tar\\.gz \\| tar -?x?v?xv?f -', 'gunzip -c site-web\\.tar\\.gz \\| tar -?xv?f -'],
          exemple: 'tar zxvf site-web.tar.gz',
          indices: ['`x` pour extraire, `f` pour le nom du fichier.', 'Ajoute l’option qui fait appeler gzip par tar.', '`tar zxvf archive.tar.gz`'],
          solution: '```\n$ tar zxvf site-web.tar.gz\n```\nLe GNU tar moderne détecte la compression : `tar xf site-web.tar.gz` suffit aussi. Mais retiens le `z`, que tu croiseras partout (et indispensable avec `c` pour créer).',
        },
        {
          id: 'c02-13-04', type: 'commande', niveau: 2, ref: '§2.18.4, p. 41',
          enonce: 'Crée l’archive **compressée avec gzip** `compta-2025.tar.gz` à partir du répertoire `compta`.',
          accepte: ['tar -?(zcvf|czvf|cvzf|zcf|czf|vczf|cfz|cvfz) compta-2025\\.tar\\.gz compta/?', 'tar -c -z -v? ?-f compta-2025\\.tar\\.gz compta/?', 'tar -?(cvf|cf) - compta/? \\| gzip > ?compta-2025\\.tar\\.gz'],
          exemple: 'tar zcvf compta-2025.tar.gz compta',
          pieges: [{ motif: 'tar -?(cvf|cf) compta-2025\\.tar\\.gz compta/?', message: 'Sans `z`, l’archive n’est pas compressée, malgré son extension .gz (avec `-a`, GNU tar choisirait d’après l’extension).' }],
          indices: ['Création : `c` ; compression gzip : `z` ; nom de fichier : `f`.', 'Le nom de l’archive suit le `f`.', '`tar zcvf archive.tar.gz répertoire`'],
          solution: '```\n$ tar zcvf compta-2025.tar.gz compta\n```\nAvec xz (plus compact, plus lent) : `tar Jcvf compta-2025.tar.xz compta`.',
        },
        {
          id: 'c02-13-05', type: 'sortie', niveau: 1, ref: '§2.18.1, p. 39',
          enonce: 'Le répertoire ne contient que `journal.log`. Qu’affiche la dernière commande ?\n\n```\n$ gzip journal.log\n$ ls\n```',
          attendu: 'journal.log.gz',
          indices: ['`gzip` ajoute une extension.', 'Que devient le fichier original ?', '`gzip` remplace l’original par la version compressée.'],
          solution: '```\njournal.log.gz\n```\n`gzip` remplace le fichier par sa version compressée. Pour garder l’original : `gzip -k journal.log`.',
        },
        {
          id: 'c02-13-06', type: 'ordre', niveau: 1, ref: '§2.18.2–2.18.3, p. 40',
          enonce: 'Tu reçois `outil.tar.gz`. Remets dans l’ordre la méthode « pas à pas » conseillée par le livre pour les débutants.',
          elements: [
            'Décompresser : `gunzip outil.tar.gz`',
            'Vérifier le contenu : `tar tvf outil.tar`',
            'Extraire : `tar xvf outil.tar`',
          ],
          indices: ['On lit l’extension de droite à gauche.', 'D’abord le `.gz`, ensuite le `.tar`.', 'Et on vérifie avant d’extraire.'],
          solution: 'Décompresser (on retire le `.gz`), vérifier (`t`), extraire (`x`). Avec l’habitude, `tar ztvf` puis `tar zxvf` font la même chose sans fichier intermédiaire.',
        },
        {
          id: 'c02-13-07', type: 'association', niveau: 1, ref: '§2.18.5, p. 41',
          enonce: 'Associe chaque extension à l’outil (ou l’option de tar) qui la traite.',
          paires: [
            ['`.gz`', '`gzip` / `gunzip` (option `z` de tar)'],
            ['`.bz2`', '`bzip2` / `bunzip2` (option `j` de tar)'],
            ['`.xz`', '`xz` / `unxz` (option `J` de tar)'],
            ['`.zip`', '`zip` / `unzip`'],
            ['`.tgz`', 'Synonyme de `.tar.gz`'],
          ],
          indices: ['Le nom de l’outil ressemble à l’extension.', '`.tgz` est une forme courte, héritée des anciens systèmes de fichiers FAT.', '`J` majuscule pour xz, `j` minuscule pour bzip2.'],
          solution: 'gz → gzip (z), bz2 → bzip2 (j), xz → xz (J), zip → zip/unzip, tgz = tar.gz.',
        },
        {
          id: 'c02-13-08', type: 'qcm', niveau: 2, ref: '§2.18.2, p. 39',
          enonce: 'Dans `tar cvf sauvegarde.tar docs`, quel est le rôle de l’option `f` ?',
          choix: [
            'Elle indique que l’argument suivant est le nom du fichier d’archive',
            'Elle force l’écrasement d’une archive existante',
            'Elle filtre les fichiers cachés',
            'Elle compresse l’archive',
          ],
          reponse: 0,
          indices: ['f comme *file*.', 'Sans elle, tar utiliserait un lecteur de bande.', 'Ce qui suit `f` est l’archive.'],
          solution: '`f` signifie que **le mot suivant est le nom de l’archive**. C’est pour cela que `f` se place en dernier dans le groupe d’options : `cvf archive.tar`, et non `cfv archive.tar` (qui marche avec le style sans tiret, mais crée la confusion).',
        },
        {
          id: 'c02-13-09', type: 'commande', niveau: 3, ref: '§2.18.4, p. 41',
          enonce: 'Extrais `site-web.tar.gz` en **tube** : `zcat` décompresse vers la sortie standard, et `tar` lit l’archive sur son entrée standard.',
          accepte: ['zcat site-web\\.tar\\.gz \\| tar -?(xvf|xf|vxf) -', 'gunzip -(dc|cd|c) site-web\\.tar\\.gz \\| tar -?(xvf|xf) -', 'gzip -(dc|cd) site-web\\.tar\\.gz \\| tar -?(xvf|xf) -'],
          exemple: 'zcat site-web.tar.gz | tar xvf -',
          indices: ['Le tube relie `zcat` à `tar`.', 'Pour tar, le nom de fichier `-` désigne l’entrée standard.', '`zcat archive.tar.gz | tar xvf -`'],
          solution: '```\n$ zcat site-web.tar.gz | tar xvf -\n```\nAucun fichier intermédiaire n’est écrit sur le disque : c’est plus rapide et plus économe que la méthode en deux temps.',
        },
        {
          id: 'c02-13-10', type: 'terminal', niveau: 2,
          enonce: `
            Sur ta VM, crée une archive compressée de deux fichiers système, puis liste-la :

            \`\`\`
            $ tar zcvf test.tar.gz /etc/hostname /etc/os-release
            $ tar ztvf test.tar.gz
            \`\`\`

            Colle la sortie. Remarque le message de tar et la forme des chemins dans l’archive.
          `,
          attendu: ['etc/hostname'],
          indices: ['tar affiche un avertissement à propos du `/` initial.', 'Dans l’archive, les chemins sont devenus relatifs.', 'C’est une protection : extraire ne pourra pas écraser `/etc` par erreur.'],
          solution: '```\ntar: Removing leading `/\' from member names\n/etc/hostname\n/etc/os-release\n-rw-r--r-- root/root  5 … etc/hostname\n…\n```\ntar retire le `/` de tête : l’archive contient `etc/hostname`. Extraite ailleurs, elle recrée `./etc/hostname` au lieu d’écraser le vrai fichier système.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '2.14',
      titre: 'L’arborescence du système Linux',
      sections: '§2.19', pages: '42–44',
      objectif: 'Savoir où chercher et où ranger chaque type de fichier.',
      rappel: `
        La structure des répertoires suit le **FHS** (*Filesystem Hierarchy Standard*). Les essentiels :

        | Répertoire | Contenu |
        |---|---|
        | \`/bin\`, \`/sbin\` | programmes essentiels ; \`sbin\` pour l’administration (souvent réservés à root) |
        | \`/dev\` | fichiers de périphériques (chapitre 3) |
        | \`/etc\` | **configuration** du système (prononcé « ett-si ») |
        | \`/home\` | répertoires personnels des utilisateurs |
        | \`/lib\` | bibliothèques partagées (chapitre 15) |
        | \`/proc\` | statistiques et informations sur les processus et le noyau, sous forme de fichiers |
        | \`/sys\` | interface vers les périphériques et le système (chapitre 3) |
        | \`/run\` | données d’exécution : PID, sockets, états (\`/var/run\` y pointe) |
        | \`/tmp\` | fichiers temporaires, accessibles à tous, **vidés au démarrage** |
        | \`/usr\` | l’essentiel des programmes et données du système (« *Unix System Resources* », pas les fichiers des utilisateurs !) |
        | \`/var\` | données qui varient : journaux (\`/var/log\`), caches, files d’attente ; \`/var/tmp\` n’est pas vidé au démarrage |
        | \`/boot\` | noyau et fichiers du chargeur de démarrage (chapitre 5) |
        | \`/media\` | points de montage des supports amovibles |
        | \`/opt\` | logiciels tiers |

        Sous \`/usr\` : \`bin\`, \`sbin\`, \`lib\`, mais aussi \`include\` (en-têtes C), \`local\` (logiciels installés **par l’administrateur**, avec la même structure), \`share\` (données indépendantes de l’architecture, dont \`share/man\` et \`share/doc\`).

        ### Le noyau

        Le noyau est un fichier, en général \`/boot/vmlinuz\` (avec la version : \`/boot/vmlinuz-6.12.…\`). Une fois chargé
        en mémoire par le chargeur de démarrage, ce fichier ne sert plus. Les **modules** chargeables à la demande sont dans
        \`/lib/modules/<version>\`.

        > **Ce qui a changé** : sur Debian 12+ et sur toute la famille Red Hat depuis RHEL 7, \`/bin\`, \`/sbin\` et \`/lib\` sont des
        > **liens symboliques** vers \`/usr/bin\`, \`/usr/sbin\` et \`/usr/lib\` (« fusion de /usr », *usrmerge*). La distinction historique
        > (garder le minimum vital sur la racine quand les disques étaient petits) a disparu.
      `,
      aRetenir: [
        '`/etc` config, `/var/log` journaux, `/home` utilisateurs, `/tmp` temporaire (vidé), `/usr/local` ce que l’admin installe.',
        '`/proc` et `/sys` : fenêtres sur le noyau, pas de vrais fichiers sur disque.',
        'Noyau : `/boot/vmlinuz*` ; modules : `/lib/modules/<version>`.',
        '`/bin` → `usr/bin` sur les systèmes modernes.',
      ],
      exercices: [
        {
          id: 'c02-14-01', type: 'association', niveau: 1, ref: '§2.19, p. 42–43',
          enonce: 'Associe chaque répertoire à son contenu.',
          paires: [
            ['`/etc`', 'Fichiers de configuration du système'],
            ['`/var/log`', 'Journaux du système et des services'],
            ['`/home`', 'Répertoires personnels des utilisateurs'],
            ['`/tmp`', 'Fichiers temporaires, vidés au démarrage'],
            ['`/proc`', 'Informations sur les processus et le noyau'],
            ['`/dev`', 'Fichiers de périphériques'],
          ],
          indices: ['`var` = variable, `dev` = device.', '`/proc` vient de *process*.', 'Le reste se devine.'],
          solution: 'Ce sont les six répertoires que tu visiteras le plus souvent en administration.',
        },
        {
          id: 'c02-14-02', type: 'association', niveau: 2, ref: '§2.19.1–2.19.3, p. 43–44',
          enonce: 'Associe chaque emplacement à ce qu’on y trouve.',
          paires: [
            ['`/usr/local`', 'Logiciels installés par l’administrateur'],
            ['`/boot`', 'Noyau et fichiers du chargeur de démarrage'],
            ['`/opt`', 'Logiciels tiers (parfois inutilisé)'],
            ['`/run`', 'Données d’exécution : PID, sockets'],
            ['`/lib/modules`', 'Modules chargeables du noyau'],
            ['`/usr/share/man`', 'Pages de manuel'],
          ],
          indices: ['`local` = propre à cette machine.', '`/run` remplace l’ancien `/var/run`.', '`share` contient des données partageables, dont la documentation.'],
          solution: '`/usr/local` (admin), `/boot` (démarrage), `/opt` (tiers), `/run` (exécution), `/lib/modules` (modules noyau), `/usr/share/man` (manuel).',
        },
        {
          id: 'c02-14-03', type: 'qcm', niveau: 2, ref: '§2.19.2, p. 44',
          enonce: 'Tu as écrit un script `inventaire` que tous les utilisateurs de la machine doivent pouvoir lancer par son nom. Où le ranger ?',
          choix: ['`/usr/local/bin`', '`/usr/bin`', '`/tmp`', '`/etc`'],
          reponse: 0,
          indices: ['Il faut un répertoire présent dans le PATH de tout le monde.', '`/usr/bin` appartient au gestionnaire de paquets : il pourrait écraser ton fichier.', 'Les ajouts de l’administrateur vont dans `local`.'],
          solution: '`/usr/local/bin` : il est dans le PATH par défaut (souvent en premier) et le gestionnaire de paquets n’y touche jamais. `/usr/bin` est réservé aux paquets de la distribution.',
        },
        {
          id: 'c02-14-04', type: 'qcm', niveau: 1, ref: '§2.19, p. 43',
          enonce: 'Bastien range ses recettes en cours dans `/tmp/recettes` « parce que tout le monde y a accès ». Quel est le problème ?',
          choix: [
            '`/tmp` est vidé au démarrage (et parfois périodiquement) : il peut tout perdre',
            '`/tmp` est en lecture seule',
            'Aucun problème, c’est fait pour ça',
            '`/tmp` est réservé à root',
          ],
          reponse: 0,
          indices: ['Le nom dit tout : *temporary*.', 'Que se passe-t-il au redémarrage ?', 'Le livre déconseille d’y mettre quoi que ce soit d’important.'],
          solution: '`/tmp` est **temporaire** : la plupart des distributions le vident au démarrage (sur Debian 13, c’est même un système de fichiers en mémoire). Les recettes doivent aller dans un vrai répertoire partagé avec les bons droits (Lab 01).',
        },
        {
          id: 'c02-14-05', type: 'reponse-courte', niveau: 1, casse: true, mono: true, ref: '§2.19.3, p. 44',
          enonce: 'Dans quel **répertoire** se trouve habituellement le fichier du noyau Linux ? (chemin absolu)',
          accepte: ['/boot/?'],
          indices: ['C’est lié au démarrage.', 'Le fichier s’appelle `vmlinuz`.', 'Le répertoire du démarrage.'],
          solution: '`/boot`, sous le nom `vmlinuz-<version>`. Tu verras au chapitre 5 comment GRUB le charge.',
        },
        {
          id: 'c02-14-06', type: 'vrai-faux', niveau: 2, ref: '§2.19, p. 42–44',
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: '`/usr` contient les fichiers personnels des utilisateurs.', vrai: false, explication: 'Malgré son nom, il contient les programmes et données du système. Les fichiers personnels sont dans `/home`.' },
            { texte: '`/var/tmp` n’est pas vidé au démarrage, contrairement à `/tmp`.', vrai: true },
            { texte: 'Les programmes de `/sbin` ne fonctionnent souvent qu’avec les droits root.', vrai: true },
            { texte: 'Sur Debian 13 et Rocky 10, `/bin` est un lien symbolique vers `usr/bin`.', vrai: true },
          ],
          indices: ['« usr » ne veut pas dire « user ».', 'Une seule affirmation est fausse.', 'Pense à la fusion de /usr.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
        {
          id: 'c02-14-07', type: 'terminal', niveau: 2,
          enonce: 'Sur tes deux VM, lance `ls -ld /bin /sbin /lib` puis `ls /boot`. Colle la sortie de l’une d’elles. Que constates-tu ?',
          attendu: ['/bin -> usr/bin', 'vmlinuz'],
          indices: ['`-d` affiche le répertoire lui-même, pas son contenu.', 'Cherche des flèches `->`.', '`/boot` contient le noyau et l’initramfs.'],
          solution: '```\nlrwxrwxrwx 1 root root 7 … /bin -> usr/bin\nlrwxrwxrwx 1 root root 7 … /lib -> usr/lib\nlrwxrwxrwx 1 root root 8 … /sbin -> usr/sbin\n$ ls /boot\nconfig-6.12…  grub  initrd.img-6.12…  System.map-6.12…  vmlinuz-6.12…\n```\nLes trois répertoires historiques sont des liens (fusion de /usr). Dans `/boot` : le noyau `vmlinuz`, l’image initiale `initrd`/`initramfs` (chapitre 6) et la configuration de GRUB (chapitre 5).',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '2.15',
      titre: 'Exécuter des commandes en superutilisateur : sudo',
      sections: '§2.20', pages: '44–46',
      objectif: 'Utiliser sudo, comprendre et modifier sans risque /etc/sudoers.',
      rappel: `
        Ouvrir un shell root pour administrer est tentant, mais le livre liste ses inconvénients :

        - aucune trace des commandes qui ont modifié le système ;
        - aucune trace de **qui** les a lancées ;
        - tu perds ton environnement habituel ;
        - il faut connaître le mot de passe root (s’il existe).

        ### sudo

        \`sudo commande\` exécute **une** commande en root, après avoir vérifié que tu en as le droit et (en général) redemandé
        **ton** mot de passe. Chaque utilisation est journalisée.

        \`\`\`
        $ sudo vipw                              # éditer /etc/passwd en root
        $ sudo -l                                # ce que j’ai le droit de faire
        $ journalctl SYSLOG_IDENTIFIER=sudo      # le journal des utilisations de sudo
        \`\`\`

        Sur les systèmes plus anciens, ou avec rsyslog, on trouve aussi ces traces dans \`/var/log/auth.log\` (Debian) ou \`/var/log/secure\` (Rocky).

        ### /etc/sudoers

        Le fichier \`/etc/sudoers\` décide qui a le droit de faire quoi. **On ne l’édite qu’avec \`visudo\`**, qui vérifie la
        syntaxe avant d’enregistrer : une erreur dans ce fichier peut te priver de tout accès root.

        \`\`\`
        User_Alias ADMINS = ines, malik      # un alias regroupant deux utilisateurs
        ADMINS ALL = NOPASSWD: ALL           # ils peuvent tout lancer en root, sans mot de passe
        root ALL=(ALL) ALL                   # root peut tout lancer, en tant que n’importe qui
        \`\`\`

        Lecture d’une règle \`qui  où = (en_tant_que)  quoi\` :

        - le **premier** \`ALL\` : sur tous les **hôtes** (une même règle peut être partagée entre plusieurs machines) ;
        - \`(ALL)\` : en tant que n’importe quel utilisateur (sans cette partie : uniquement en tant que root) ;
        - le dernier \`ALL\` : **toutes les commandes**.

        ### En pratique aujourd’hui (complément)

        - Les distributions donnent les droits via un **groupe** : \`%sudo ALL=(ALL:ALL) ALL\` sur Debian, \`%wheel ALL=(ALL) ALL\` sur Rocky.
          Le \`%\` désigne un groupe. Ajouter quelqu’un au groupe suffit : \`usermod -aG sudo ines\` (chapitre 7).
        - Plutôt que de modifier \`/etc/sudoers\`, on dépose des fichiers dans **\`/etc/sudoers.d/\`** : \`visudo -f /etc/sudoers.d/boutique\`.
        - On peut limiter une personne à **une seule commande**, avec son chemin complet :
          \`malik ALL=(root) /usr/bin/systemctl restart boutique\`. C’est le principe du moindre privilège (Lab 01).
        - \`NOPASSWD\` est pratique pour l’automatisation, mais à éviter pour les humains.
      `,
      aRetenir: [
        '`sudo cmd` plutôt qu’un shell root : traçabilité.',
        'Éditer avec `visudo` (ou `visudo -f /etc/sudoers.d/fichier`), jamais directement.',
        'Règle : `qui hôtes=(en_tant_que) commandes` ; `%groupe` pour un groupe.',
        'Groupe d’admin : `sudo` sur Debian, `wheel` sur Rocky.',
      ],
      exercices: [
        {
          id: 'c02-15-01', type: 'qcm', niveau: 1, multi: true, ref: '§2.20, p. 44',
          enonce: 'Quels inconvénients le livre cite-t-il à l’utilisation d’un shell root ouvert en permanence ?',
          choix: [
            'Aucune trace des commandes qui ont modifié le système',
            'Aucune trace de qui a lancé ces commandes',
            'On perd son environnement de shell habituel',
            'Il faut connaître le mot de passe root',
            'Le shell root consomme beaucoup plus de mémoire',
          ],
          reponse: [0, 1, 2, 3],
          indices: ['Quatre réponses sont justes.', 'Elles tournent autour de la traçabilité et du confort.', 'La consommation mémoire n’a rien à voir.'],
          solution: 'Les quatre premiers. Un shell root ne consomme pas plus de ressources, mais il supprime les garde-fous et la traçabilité.',
        },
        {
          id: 'c02-15-02', type: 'commande', niveau: 1, ref: '§2.20.2, note p. 45',
          enonce: 'Quelle commande dois-tu utiliser pour modifier `/etc/sudoers` sans risque (lancée avec `sudo`) ?',
          accepte: ['(sudo )?visudo', '(sudo )?visudo -f /etc/sudoers', '(sudo )?visudo -f /etc/sudoers\\.d/\\S+'],
          exemple: 'sudo visudo',
          pieges: [{ motif: '(sudo )?(vi|vim|nano|emacs) /etc/sudoers', message: 'Édition directe = aucune vérification de syntaxe. Une erreur peut te priver de sudo.' }],
          indices: ['C’est un éditeur spécialisé qui vérifie la syntaxe.', 'Son nom combine « vi » et « sudo ».', '`visudo`'],
          solution: '```\n$ sudo visudo\n```\n`visudo` ouvre une copie, vérifie la syntaxe à l’enregistrement et refuse d’installer un fichier invalide. Pour un fichier séparé : `sudo visudo -f /etc/sudoers.d/boutique`.',
        },
        {
          id: 'c02-15-03', type: 'trous', niveau: 2, ref: '§2.20.2, p. 45',
          enonce: 'Complète ces lignes de `sudoers` pour qu’Inès et Malik puissent tout exécuter en root, **sans mot de passe**, en passant par un alias.',
          texte: '[[1]] ADMINS = ines, malik\nADMINS [[2]] = [[3]]: ALL',
          trous: [
            { accepte: ['User_Alias'], exemple: 'User_Alias' },
            { accepte: ['ALL'], exemple: 'ALL' },
            { accepte: ['NOPASSWD'], exemple: 'NOPASSWD' },
          ],
          indices: ['Le mot-clé qui déclare un alias d’utilisateurs contient « User ».', 'Le deuxième trou désigne les hôtes concernés.', '`User_Alias`, `ALL`, `NOPASSWD`.'],
          solution: '```\nUser_Alias ADMINS = ines, malik\nADMINS ALL = NOPASSWD: ALL\n```\nPour une vraie équipe, préfère garder la demande de mot de passe : un poste laissé ouvert ne doit pas donner root à n’importe qui.',
        },
        {
          id: 'c02-15-04', type: 'qcm', niveau: 2, ref: '§2.20.2, p. 45',
          enonce: 'Dans la règle `root ALL=(ALL) ALL`, que signifie le **premier** `ALL` ?',
          choix: ['Sur tous les hôtes', 'Toutes les commandes', 'En tant que n’importe quel utilisateur', 'Tous les groupes'],
          reponse: 0,
          indices: ['La forme est `qui où=(en_tant_que) quoi`.', 'Le premier `ALL` vient juste après le « qui ».', 'Il désigne les machines.'],
          solution: 'Le premier `ALL` : **tous les hôtes**. `(ALL)` : en tant que n’importe quel utilisateur. Le dernier `ALL` : toutes les commandes.',
        },
        {
          id: 'c02-15-05', type: 'commande', niveau: 2, ref: '§2.20.3, p. 46',
          enonce: 'Affiche dans le journal systemd toutes les entrées produites par `sudo`.',
          accepte: ['(sudo )?journalctl SYSLOG_IDENTIFIER=sudo', '(sudo )?journalctl -t sudo', '(sudo )?journalctl _COMM=sudo', '(sudo )?journalctl --identifier=sudo'],
          exemple: 'journalctl SYSLOG_IDENTIFIER=sudo',
          indices: ['L’outil de lecture du journal systemd est `journalctl`.', 'On filtre sur l’identifiant syslog du programme.', '`journalctl SYSLOG_IDENTIFIER=sudo`'],
          solution: '```\n$ journalctl SYSLOG_IDENTIFIER=sudo\n… sudo[1532]: admin : TTY=pts/0 ; PWD=/home/admin ; USER=root ; COMMAND=/usr/bin/vipw\n```\nForme courte : `journalctl -t sudo`. Chaque ligne indique qui, d’où, en tant que qui, et quelle commande.',
        },
        {
          id: 'c02-15-06', type: 'commande', niveau: 1,
          enonce: 'Affiche la liste des commandes que **tu** as le droit d’exécuter avec sudo.',
          accepte: ['sudo -l', 'sudo --list', 'sudo -ll'],
          exemple: 'sudo -l',
          indices: ['C’est une option de `sudo` lui-même.', 'L comme *list*.', '`sudo -l`'],
          solution: '```\n$ sudo -l\nUser admin may run the following commands on cuve:\n    (ALL : ALL) ALL\n```',
        },
        {
          id: 'c02-15-07', type: 'reponse-courte', niveau: 1, casse: true, mono: true,
          enonce: 'Sur Rocky Linux (famille Red Hat), quel **groupe** donne le droit d’utiliser sudo par défaut ?',
          accepte: ['wheel', '%wheel'],
          indices: ['Ce n’est pas le même nom que sur Debian.', 'C’est un vieux terme d’argot Unix : « big wheel » (gros bonnet).', 'Cinq lettres, commence par w.'],
          solution: '`wheel` (sur Debian : `sudo`). Dans `/etc/sudoers` : `%wheel ALL=(ALL) ALL`.',
        },
        {
          id: 'c02-15-08', type: 'trous', niveau: 3,
          enonce: 'Malik doit pouvoir **redémarrer le service `boutique`**, et rien d’autre. Complète la règle à déposer dans `/etc/sudoers.d/boutique` (chemin complet de la commande obligatoire).',
          texte: 'malik ALL=([[1]]) [[2]] restart boutique',
          trous: [
            { accepte: ['root'], exemple: 'root' },
            { accepte: ['/usr/bin/systemctl', '/bin/systemctl'], exemple: '/usr/bin/systemctl' },
          ],
          indices: ['Il exécutera la commande en tant que quel utilisateur ?', 'La commande qui pilote les services systemd est `systemctl`.', 'Trouve son chemin complet avec `command -v systemctl`.'],
          solution: '```\nmalik ALL=(root) /usr/bin/systemctl restart boutique\n```\nMalik pourra lancer `sudo systemctl restart boutique`, et toute autre commande sera refusée et journalisée. C’est l’un des objectifs du Lab 01.',
        },
        {
          id: 'c02-15-09', type: 'terminal', niveau: 1,
          enonce: 'Sur ta VM, lance `sudo -l` puis `sudo journalctl -t sudo -n 5`. Colle la sortie.',
          attendu: ['may run|peut lancer|\\(ALL'],
          indices: ['La première commande liste tes droits.', 'La seconde affiche les 5 dernières utilisations de sudo.', 'Tu dois voir `(ALL)` dans la première sortie.'],
          solution: 'Tu dois voir que ton compte peut tout lancer (`(ALL : ALL) ALL` ou `NOPASSWD: ALL` pour un compte créé par cloud-init), puis tes propres utilisations de sudo, dont la commande `journalctl` elle-même.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '2.A',
      titre: 'Permissions spéciales et listes de contrôle d’accès',
      auDela: true,
      objectif: 'Partager proprement un répertoire entre plusieurs personnes : setgid, sticky bit, chown, ACL.',
      rappel: `
        Cette fiche complète la section 2.17 avec ce qu’exigent les certifications (LPIC 104.5, RHCSA, LFCS) et ce dont tu as
        besoin pour le **Lab 01** : un répertoire partagé par une équipe.

        ### Propriétaire et groupe

        \`\`\`
        # chown bastien:brasseurs recette.txt   # propriétaire ET groupe
        # chown -R bastien recettes/            # récursif
        $ chgrp brasseurs recette.txt           # groupe seulement
        \`\`\`

        ### Les trois bits spéciaux

        Un quatrième chiffre octal, **avant** les trois autres :

        | Bit | Valeur | Sur un fichier exécutable | Sur un répertoire | Dans \`ls -l\` |
        |---|---|---|---|---|
        | **setuid** | 4 | s’exécute avec les droits du **propriétaire** | (sans effet sous Linux) | \`s\` à la place du \`x\` de u |
        | **setgid** | 2 | s’exécute avec les droits du **groupe** | les nouveaux fichiers **héritent du groupe du répertoire** | \`s\` à la place du \`x\` de g |
        | **sticky** | 1 | (obsolète) | seul le propriétaire d’un fichier peut le supprimer | \`t\` à la place du \`x\` de o |

        - \`/usr/bin/passwd\` : \`-rwsr-xr-x\` = 4755.
        - \`/tmp\` : \`drwxrwxrwt\` = 1777 : tout le monde écrit, mais chacun ne supprime que ses fichiers.
        - Un répertoire d’équipe : \`drwxrws---\` = **2770** : les membres du groupe y travaillent, les fichiers créés appartiennent au groupe, les autres n’y ont pas accès.

        \`\`\`
        # chmod 2770 /srv/partage/brassage     # ou : chmod g+s
        # chmod +t /srv/partage/depot          # sticky bit
        \`\`\`

        Une majuscule (\`S\`, \`T\`) signale un bit spécial posé **sans** le \`x\` correspondant : souvent une erreur.
        Linux **ignore** le setuid sur les scripts (seulement sur les binaires), pour des raisons de sécurité.

        ### Les ACL

        Les droits u/g/o ne permettent qu’un seul groupe. Les **listes de contrôle d’accès** (ACL) ajoutent des droits pour
        des utilisateurs ou groupes précis :

        \`\`\`
        $ setfacl -m u:chloe:rw budget.ods        # Chloé peut lire et écrire
        $ setfacl -m g:direction:r budget.ods     # le groupe direction peut lire
        $ setfacl -d -m g:compta:rw /srv/compta   # ACL par défaut, héritée par les nouveaux fichiers
        $ getfacl budget.ods                      # afficher
        $ setfacl -x u:chloe budget.ods           # retirer une entrée
        \`\`\`

        Un \`+\` à la fin du mode dans \`ls -l\` (\`-rw-rw-r--+\`) signale la présence d’ACL.
      `,
      aRetenir: [
        '`chown utilisateur:groupe`, `chgrp groupe`, `-R` pour récursif.',
        'setuid 4, setgid 2, sticky 1 : 4755 (passwd), 1777 (/tmp), 2770 (répertoire d’équipe).',
        'setgid sur un répertoire = héritage du groupe ; sticky = chacun ne supprime que ses fichiers.',
        '`setfacl -m u:nom:rw f`, `getfacl f` ; `+` dans `ls -l`.',
      ],
      exercices: [
        {
          id: 'c02-0a-01', type: 'qcm', niveau: 1,
          enonce: 'Quel est l’effet du bit **setgid** posé sur un **répertoire** ?',
          choix: [
            'Les fichiers créés dedans appartiennent au groupe du répertoire',
            'Les fichiers créés dedans deviennent exécutables',
            'Seul le propriétaire peut supprimer ses fichiers',
            'Le répertoire devient accessible à tous',
          ],
          reponse: 0,
          indices: ['« gid » = identifiant de **groupe**.', 'Sur un répertoire, il agit sur les fichiers qu’on y crée.', 'Il s’agit d’héritage.'],
          solution: 'Les nouveaux fichiers et sous-répertoires **héritent du groupe** du répertoire, au lieu du groupe principal de leur créateur. C’est indispensable pour un répertoire d’équipe. Le troisième choix décrit le sticky bit.',
        },
        {
          id: 'c02-0a-02', type: 'reponse-courte', niveau: 1,
          enonce: '`ls -ld /tmp` affiche `drwxrwxrwt`. Comment s’appelle le bit représenté par le `t` final ?',
          accepte: ['(le )?sticky( bit)?', '(le )?bit (sticky|collant)', '(le )?bit de collage'],
          indices: ['Il est dans la position du `x` des « autres ».', 'Son nom anglais évoque quelque chose de collant.', '*sticky bit*'],
          solution: 'Le **sticky bit** : dans un répertoire où tout le monde peut écrire, seul le propriétaire d’un fichier (ou root) peut le supprimer ou le renommer. Sans lui, n’importe qui pourrait effacer les fichiers temporaires des autres.',
        },
        {
          id: 'c02-0a-03', type: 'commande', niveau: 1,
          enonce: 'Donne le répertoire `/srv/partage/compta` à l’utilisatrice `chloe` et au groupe `compta` (en root).',
          accepte: ['(sudo )?chown chloe:compta /srv/partage/compta/?', '(sudo )?chown chloe\\.compta /srv/partage/compta/?', '(sudo )?chown -R chloe:compta /srv/partage/compta/?'],
          exemple: 'chown chloe:compta /srv/partage/compta',
          indices: ['*change owner*', 'Propriétaire et groupe se séparent par deux-points.', '`chown utilisateur:groupe chemin`'],
          solution: '```\n# chown chloe:compta /srv/partage/compta\n```\nLa forme `chloe.compta` est ancienne et dépréciée.',
        },
        {
          id: 'c02-0a-04', type: 'commande', niveau: 2,
          enonce: 'Mets `/srv/partage/brassage` en mode : propriétaire rwx, groupe rwx, autres rien, **plus le bit setgid**. Utilise la notation octale.',
          accepte: ['(sudo )?chmod 2770 /srv/partage/brassage/?'],
          exemple: 'chmod 2770 /srv/partage/brassage',
          pieges: [{ motif: '(sudo )?chmod 0?770 /srv/partage/brassage/?', message: 'Il manque le bit setgid (le chiffre des bits spéciaux, placé devant).' }],
          indices: ['rwx rwx --- = 770.', 'Le bit setgid vaut 2 et se place en premier chiffre.', '2770'],
          solution: '```\n# chmod 2770 /srv/partage/brassage\n$ ls -ld /srv/partage/brassage\ndrwxrws--- 2 root brasseurs … /srv/partage/brassage\n```\nLe `s` dans les droits du groupe confirme le setgid.',
        },
        {
          id: 'c02-0a-05', type: 'reponse-courte', niveau: 2, mono: true,
          enonce: 'Quelle est la notation octale (4 chiffres) du mode `-rwsr-xr-x` ?',
          accepte: ['4755'],
          indices: ['Le `s` à la place du `x` du propriétaire = setuid.', 'setuid vaut 4 ; rwxr-xr-x = 755.', '4 puis 755.'],
          solution: '**4755** : c’est le mode de `/usr/bin/passwd`.',
        },
        {
          id: 'c02-0a-06', type: 'commande', niveau: 2,
          enonce: 'Donne à l’utilisatrice `chloe` le droit de **lire et écrire** `budget.ods` grâce à une ACL, sans toucher au propriétaire ni au groupe.',
          accepte: ['(sudo )?setfacl -m (u|user):chloe:rw-? budget\\.ods', '(sudo )?setfacl --modify[= ](u|user):chloe:rw-? budget\\.ods'],
          exemple: 'setfacl -m u:chloe:rw budget.ods',
          indices: ['La commande qui pose une ACL commence par `set`.', '`-m` modifie ; l’entrée a la forme `u:nom:droits`.', '`setfacl -m u:chloe:rw fichier`'],
          solution: '```\n$ setfacl -m u:chloe:rw budget.ods\n$ ls -l budget.ods\n-rw-rw-r--+ 1 ines direction … budget.ods\n```\nLe `+` signale la présence d’une ACL.',
        },
        {
          id: 'c02-0a-07', type: 'commande', niveau: 1,
          enonce: 'Affiche les ACL de `budget.ods`.',
          accepte: ['getfacl budget\\.ods', 'getfacl -p budget\\.ods'],
          exemple: 'getfacl budget.ods',
          indices: ['Si l’une commence par `set`…', '… l’autre commence par `get`.', '`getfacl fichier`'],
          solution: '```\n$ getfacl budget.ods\n# file: budget.ods\n# owner: ines\n# group: direction\nuser::rw-\nuser:chloe:rw-\ngroup::r--\nmask::rw-\nother::r--\n```\nLe `mask` limite les droits maximum accordés par les ACL nommées et le groupe.',
        },
        {
          id: 'c02-0a-08', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Le sticky bit sur `/tmp` empêche de supprimer les fichiers des autres.', vrai: true },
            { texte: 'Un exécutable setgid s’exécute avec les droits du groupe propriétaire du fichier.', vrai: true },
            { texte: 'Un `+` à la fin du mode dans `ls -l` signale des ACL.', vrai: true },
            { texte: 'Linux respecte le bit setuid posé sur un script shell.', vrai: false, explication: 'Il est ignoré sur les scripts, pour des raisons de sécurité.' },
            { texte: '`drwxrwS---` signale un setgid posé alors que le groupe n’a pas le droit `x`.', vrai: true },
          ],
          indices: ['Une seule affirmation est fausse.', 'Les scripts setuid ont posé trop de problèmes de sécurité.', 'Majuscule = bit spécial sans le `x` sous-jacent.'],
          solution: 'Vrai, vrai, vrai, faux, vrai.',
        },
        {
          id: 'c02-0a-09', type: 'terminal', niveau: 3,
          enonce: `
            Vérifie l’héritage de groupe sur ta VM :

            \`\`\`
            $ mkdir ~/essai-partage
            $ sudo chgrp users ~/essai-partage
            $ chmod 2775 ~/essai-partage
            $ touch ~/essai-partage/f
            $ ls -l ~/essai-partage
            \`\`\`

            Colle la sortie. À quel groupe appartient \`f\` ? Recommence sans le \`2\` (\`chmod 0775\`, puis crée \`g\`) et compare.
          `,
          attendu: ['users'],
          indices: ['Le groupe `users` existe sur Debian et Rocky.', 'Sans setgid, le fichier prend ton groupe principal.', 'Avec setgid, il prend le groupe du répertoire.'],
          solution: '```\n-rw-r--r-- 1 admin users 0 … f\n-rw-r--r-- 1 admin admin 0 … g\n```\n`f` (créé avec setgid) appartient à `users`, le groupe du répertoire. `g` (créé sans setgid) appartient à ton groupe principal `admin`. Pour retirer le setgid d’un répertoire, `chmod 0775` ne suffit pas toujours avec GNU chmod : utilise `chmod g-s`.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: '2.B',
      titre: 'Survivre dans vi',
      auDela: true,
      objectif: 'Ouvrir, modifier, enregistrer et quitter un fichier dans vi, l’éditeur présent partout.',
      rappel: `
        Le livre conseille d’apprendre vi ou Emacs. Pour un administrateur, **vi** est incontournable : il est présent sur
        toutes les machines, y compris les plus minimales et en mode secours (chapitre 6). LPIC-1 l’exige (objectif 103.8).
        Sur Debian et Rocky, \`vi\` lance une version réduite de **vim**.

        ### Les modes

        vi a plusieurs **modes**, c’est ce qui déroute au début :

        - le mode **normal** (au lancement) : les touches sont des **commandes** (déplacer, supprimer, copier) ;
        - le mode **insertion** : les touches insèrent du texte ;
        - la **ligne de commande**, ouverte par \`:\` en mode normal.

        **Échap** ramène toujours au mode normal. En cas de doute, appuie deux fois sur Échap.

        ### Le minimum vital

        | Touche (mode normal) | Effet |
        |---|---|
        | \`i\` / \`a\` / \`o\` | insérer avant le curseur / après / sur une nouvelle ligne en dessous |
        | Échap | revenir en mode normal |
        | \`h j k l\` (ou flèches) | gauche, bas, haut, droite |
        | \`x\` | supprimer le caractère sous le curseur |
        | \`dd\` | supprimer (couper) la ligne |
        | \`yy\` | copier la ligne |
        | \`p\` | coller après le curseur |
        | \`u\` | annuler |
        | \`/mot\` puis \`n\` | chercher « mot », puis l’occurrence suivante |
        | \`gg\` / \`G\` | début / fin du fichier |
        | \`:w\` | enregistrer |
        | \`:q\` | quitter (refusé s’il y a des modifications) |
        | \`:wq\` (ou \`ZZ\`) | enregistrer et quitter |
        | \`:q!\` | quitter **sans** enregistrer |
        | \`:set number\` | afficher les numéros de ligne |

        Pour aller plus loin, lance \`vimtutor\` : une leçon interactive d’une demi-heure (paquet \`vim\`).
      `,
      aRetenir: [
        'Échap = mode normal ; `i` = insertion ; `:` = commandes.',
        '`:wq` enregistrer et quitter ; `:q!` quitter sans enregistrer.',
        '`dd` couper une ligne, `yy` copier, `p` coller, `u` annuler, `/mot` chercher.',
      ],
      exercices: [
        {
          id: 'c02-0b-01', type: 'association', niveau: 1,
          enonce: 'Associe chaque commande vi à son effet.',
          paires: [
            ['`i`', 'Passer en mode insertion avant le curseur'],
            ['Échap', 'Revenir au mode normal'],
            ['`:wq`', 'Enregistrer et quitter'],
            ['`:q!`', 'Quitter sans enregistrer'],
            ['`dd`', 'Supprimer la ligne courante'],
            ['`u`', 'Annuler la dernière modification'],
          ],
          indices: ['i = *insert*, u = *undo*, w = *write*, q = *quit*.', 'Le `!` force l’action.', '`dd` agit sur une ligne entière.'],
          solution: 'Ce sont les six commandes à connaître le premier jour.',
        },
        {
          id: 'c02-0b-02', type: 'ordre', niveau: 1,
          enonce: 'Remets dans l’ordre les actions pour ajouter une ligne à la fin de `/etc/motd` avec vi, puis enregistrer.',
          elements: [
            'Ouvrir le fichier : `sudo vi /etc/motd`',
            'Aller à la dernière ligne avec `G`',
            'Ouvrir une nouvelle ligne en dessous avec `o`',
            'Taper le texte',
            'Revenir au mode normal avec Échap',
            'Enregistrer et quitter avec `:wq`',
          ],
          indices: ['On se déplace en mode normal, avant d’insérer.', '`o` fait passer en mode insertion.', 'On ne peut taper `:wq` qu’en mode normal.'],
          solution: 'Ouvrir, `G`, `o`, taper, Échap, `:wq`. L’erreur classique est de taper `:wq` en mode insertion : le texte « :wq » s’ajoute au fichier.',
        },
        {
          id: 'c02-0b-03', type: 'qcm', niveau: 1,
          enonce: 'Dans vi, tu tapes `:q` et les caractères « :q » apparaissent dans ton texte. Que se passe-t-il ?',
          choix: ['Tu es en mode insertion : appuie d’abord sur Échap', 'vi est bloqué : il faut fermer le terminal', 'Il faut taper `:q` en majuscules', 'Le fichier est en lecture seule'],
          reponse: 0,
          indices: ['Les commandes `:` ne fonctionnent qu’en mode normal.', 'Si les caractères s’insèrent, c’est que…', 'Échap.'],
          solution: 'Tu es en **mode insertion**. Échap ramène au mode normal ; ensuite `:q` (ou `:q!` pour abandonner ce que tu viens d’écrire).',
        },
        {
          id: 'c02-0b-04', type: 'reponse-courte', niveau: 1, casse: true, mono: true,
          enonce: 'En mode normal, que tapes-tu pour chercher le mot `brasseur` vers le bas ?',
          accepte: ['/brasseur'],
          indices: ['C’est la même touche que dans `less`.', 'Une barre oblique, puis le mot.', '`/mot`'],
          solution: '`/brasseur` puis Entrée ; `n` passe à l’occurrence suivante, `N` à la précédente.',
        },
        {
          id: 'c02-0b-05', type: 'reponse-courte', niveau: 2, casse: true, mono: true,
          enonce: 'En mode normal, quelle commande de deux lettres **copie** la ligne courante ?',
          accepte: ['yy', 'Y'],
          indices: ['Copier se dit *yank* dans vi.', 'Comme `dd`, on double la lettre pour agir sur la ligne.', 'y + y.'],
          solution: '`yy` copie la ligne, puis `p` la colle en dessous. `dd` + `p` sert à déplacer une ligne.',
        },
        {
          id: 'c02-0b-06', type: 'terminal', niveau: 2,
          enonce: 'Sur ta VM, installe vim si besoin (`sudo apt install vim` ou `sudo dnf install vim-enhanced`), puis suis au moins la **leçon 1** de `vimtutor`. Note ce que tu as appris ici.',
          indices: ['`vimtutor` ouvre une copie du tutoriel : tu ne casses rien.', 'La leçon 1 couvre les déplacements, l’insertion, la suppression et la sortie.', 'Compte 10 minutes.'],
          solution: 'À la fin de la leçon 1, tu dois savoir te déplacer (`h j k l`), supprimer un caractère (`x`), insérer (`i`, `a`), enregistrer et quitter (`:wq`, `:q!`). Refais `vimtutor` plusieurs fois dans la semaine : c’est la répétition qui crée les réflexes.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Anatomie d’un message d’erreur Unix ?', r: 'Programme : objet (souvent un chemin) : problème.' },
    { q: 'Quelle erreur traiter en premier ?', r: 'La **première** : les suivantes en sont souvent des conséquences.' },
    { q: 'Code d’erreur de « No such file or directory » ?', r: '`ENOENT`' },
    { q: '« Permission denied » en lançant un script lisible ?', r: 'Il manque le bit d’exécution : `chmod u+x script`.' },
    { q: 'Lister tous les processus avec détails ?', r: '`ps aux` (style BSD) ou `ps -ef` (style Unix).' },
    { q: 'Signal envoyé par `kill PID` ? par `kill -9` ?', r: 'TERM (15), poli ; KILL (9), immédiat et impossible à ignorer.' },
    { q: 'Ctrl-C et Ctrl-Z envoient quels signaux ?', r: 'Ctrl-C : INT. Ctrl-Z : TSTP (suspension).' },
    { q: 'Reprendre une tâche suspendue au premier plan ? en arrière-plan ?', r: '`fg` ; `bg`. `jobs` les liste.' },
    { q: 'Que représente la colonne TIME de `ps` ?', r: 'Le temps processeur consommé (pas le temps écoulé).' },
    { q: 'Valeurs octales de r, w, x ?', r: 'r = 4, w = 2, x = 1.' },
    { q: '644, 600, 755, 700 ?', r: 'rw-r--r--, rw-------, rwxr-xr-x, rwx------.' },
    { q: 'Que permet `x` sur un répertoire ?', r: 'D’y accéder (atteindre son contenu). `r` permet de le lister.' },
    { q: 'umask 022 et 077 donnent quels modes ?', r: '022 : fichiers 644, répertoires 755. 077 : 600 et 700.' },
    { q: 'Créer un lien symbolique ?', r: '`ln -s cible nom_du_lien` (la cible d’abord).' },
    { q: 'Lien symbolique cassé : symptôme ?', r: 'Le lien est visible, mais y accéder donne « No such file or directory ».' },
    { q: 'tar : créer, lister, extraire ?', r: '`tar cvf a.tar rep`, `tar tvf a.tar`, `tar xvf a.tar`.' },
    { q: 'Options de compression de tar ?', r: '`z` gzip, `j` bzip2, `J` xz.' },
    { q: 'Rôle de l’option `f` de tar ?', r: 'Le mot suivant est le nom de l’archive (`-` = entrée ou sortie standard).' },
    { q: 'Que fait `gzip fichier` de l’original ?', r: 'Il le remplace par `fichier.gz` (sauf `-k`).' },
    { q: '/etc, /var/log, /usr/local, /tmp ?', r: 'Configuration ; journaux ; logiciels de l’admin ; temporaire vidé au démarrage.' },
    { q: 'Où est le noyau ? les modules ?', r: '`/boot/vmlinuz-<version>` ; `/lib/modules/<version>`.' },
    { q: 'Éditer /etc/sudoers ?', r: 'Avec `visudo` (ou `visudo -f /etc/sudoers.d/fichier`).' },
    { q: 'Que signifient les trois ALL de `root ALL=(ALL) ALL` ?', r: 'Tous les hôtes ; en tant que n’importe qui ; toutes les commandes.' },
    { q: 'Groupe sudo sur Debian ? sur Rocky ?', r: '`sudo` ; `wheel`.' },
    { q: 'Voir le journal de sudo ?', r: '`journalctl SYSLOG_IDENTIFIER=sudo` (ou `-t sudo`).' },
    { q: 'setuid, setgid, sticky : valeurs et symboles ?', r: '4 (`s` chez u), 2 (`s` chez g), 1 (`t` chez o).' },
    { q: 'Effet du setgid sur un répertoire ?', r: 'Les fichiers créés héritent du groupe du répertoire.' },
    { q: 'Mode d’un répertoire d’équipe privé avec héritage de groupe ?', r: '2770 (`drwxrws---`).' },
    { q: 'Ajouter une ACL rw pour chloe ?', r: '`setfacl -m u:chloe:rw fichier` ; `getfacl fichier` pour vérifier.' },
    { q: 'vi : enregistrer et quitter ? quitter sans enregistrer ?', r: '`:wq` ; `:q!` (depuis le mode normal, après Échap).' },
  ],
  memo: `
    ### Erreurs fréquentes
    | Message | Cause |
    |---|---|
    | No such file or directory | chemin inexistant (ENOENT) |
    | Permission denied | droits insuffisants ou bit x absent |
    | Operation not permitted | action réservée (kill d’un processus d’autrui) |
    | Not a directory / Is a directory | confusion fichier / répertoire |
    | No space left on device | disque plein |

    ### Processus
    \`\`\`
    ps aux   ps -ef   ps u $$   pgrep nom
    kill PID   kill -STOP PID   kill -CONT PID   kill -KILL PID (-9)   kill -l
    cmd &   Ctrl-Z   fg   bg   jobs   kill %1
    \`\`\`

    ### Permissions
    | Octal | Symbolique | |
    |---|---|---|
    | 644 | rw-r--r-- | fichier |
    | 600 | rw------- | fichier privé |
    | 755 | rwxr-xr-x | programme, répertoire |
    | 2770 | rwxrws--- | répertoire d’équipe (setgid) |
    | 1777 | rwxrwxrwt | /tmp (sticky) |
    | 4755 | rwsr-xr-x | exécutable setuid |
    \`\`\`
    chmod go+r f   chmod u+x f   chmod 600 f   chmod g+s rep   chmod +t rep
    chown user:groupe f   chgrp groupe f   umask 022
    setfacl -m u:nom:rw f   getfacl f
    \`\`\`

    ### Liens
    \`\`\`
    ln -s cible nom   readlink nom   readlink -f nom
    \`\`\`

    ### Archives
    \`\`\`
    tar cvf a.tar rep      tar tvf a.tar      tar xvf a.tar
    tar zcvf a.tar.gz rep  tar ztvf a.tar.gz  tar zxvf a.tar.gz
    gzip f   gunzip f.gz   zcat f.gz | tar xvf -   (j = bzip2, J = xz)
    \`\`\`

    ### Arborescence
    | | |
    |---|---|
    | /etc | configuration |
    | /var/log | journaux |
    | /home | utilisateurs |
    | /tmp, /var/tmp | temporaire (vidé / conservé au démarrage) |
    | /usr/bin, /usr/local/bin | programmes (distribution / admin) |
    | /proc, /sys | interfaces du noyau |
    | /boot | noyau, GRUB |
    | /dev | périphériques |

    ### sudo
    \`\`\`
    sudo cmd   sudo -l   sudo visudo   sudo visudo -f /etc/sudoers.d/xxx
    journalctl -t sudo
    %sudo ALL=(ALL:ALL) ALL                               # Debian
    %wheel ALL=(ALL) ALL                                  # Rocky
    malik ALL=(root) /usr/bin/systemctl restart boutique  # une seule commande
    \`\`\`

    ### vi
    \`\`\`
    i a o  Échap  :w  :q  :wq  :q!  dd  yy  p  u  x  /mot n  gg G  :set number
    \`\`\`
  `,
});
