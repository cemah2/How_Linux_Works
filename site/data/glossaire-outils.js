/* Glossaire du bloc « Environnement et outils » (chapitres 11, 13 à 17). */
HLW.glossaire([
  // Chapitre 11
  { terme: 'Script shell', en: 'shell script', def: 'Fichier de commandes exécuté par un shell, avec une ligne #! en tête.', chap: '11' },
  { terme: 'Shebang', en: 'shebang, hashbang', def: 'Ligne `#!interpréteur` en tête d’un script, lue par le noyau pour lancer l’interpréteur.', chap: '11' },
  { terme: 'Guillemets', en: 'quoting', def: 'Protection contre les transformations du shell : "…" garde les variables, \'…\' rend tout littéral.', chap: '11' },
  { terme: 'Découpage en mots', en: 'word splitting', def: 'Le shell coupe le résultat des expansions non protégées aux espaces.', chap: '11' },
  { terme: 'Code de sortie', en: 'exit code, exit status', def: 'Nombre renvoyé par une commande : 0 = succès ; lu avec `$?`.', chap: '11' },
  { terme: 'Paramètres positionnels', en: 'positional parameters', def: 'Arguments d’un script ou d’une fonction : $1, $2… ; `"$@"` pour tous.', chap: '11' },
  { terme: 'Substitution de commande', en: 'command substitution', def: '`$(commande)` remplacé par la sortie de la commande.', chap: '11' },
  { terme: 'Here document', en: 'here document', def: 'Bloc de texte envoyé sur l’entrée standard : `cmd <<FIN … FIN`.', chap: '11' },
  { terme: 'Sous-shell', en: 'subshell', def: 'Shell enfant `( … )` : ses changements de répertoire et de variables ne remontent pas.', chap: '11' },
  { terme: 'Sourcer', en: 'to source', def: 'Lire un fichier dans le shell courant (`. fichier` ou `source fichier`).', chap: '11' },
  { terme: 'trap', en: 'trap', def: 'Commande qui exécute une action à la réception d’un signal ou à la sortie (EXIT).', chap: '11' },
  { terme: 'shellcheck', en: 'shellcheck', def: 'Analyseur statique qui signale les erreurs et pièges des scripts shell.', chap: '11' },
]);
