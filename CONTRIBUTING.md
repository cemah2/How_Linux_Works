# Écrire des fiches et des exercices

Tout le contenu du cahier est dans `site/data/`, sous forme de fichiers JavaScript simples (pas de compilation) :

- `catalogue.js` : blocs, chapitres, labs, examens, certifications, fil rouge, mode d’emploi. **Ajoute ici chaque nouveau fichier** dans `fichiers`.
- `glossaire.js` : termes français / anglais.
- `chXX.js` : un chapitre. Un gros chapitre peut être réparti sur plusieurs fichiers avec `HLW.completer('XX', { fiches, flashcards, memo })`.

Après chaque modification : `node tools/validate.mjs`. Il exécute le **vrai moteur de correction** et vérifie que la réponse
modèle de chaque exercice est acceptée.

## Règles de rédaction

- Français, tutoiement, phrases courtes. Les commandes, options et messages restent en anglais.
- **Ne recopie pas le livre** : reformule, résume, complète, et renvoie à la section et à la page (`ref: '§2.4.4, p. 18'`).
- Signale ce qui a changé depuis 2021 dans un encadré `> **Ce qui a changé** : …`.
- Teste chaque commande sur Debian 13 **et** Rocky Linux 10. Signale les différences.
- Typographie : apostrophe `’`, guillemets « », espace avant `:` `;` `?` `!`.

## Structure d’un chapitre

```js
HLW.chapitre({
  id: '03', num: 3,
  intro: `Markdown…`,
  objectifs: ['…', '…'],
  certifs: { lpic1: ['101.1'], lfcs: ['STO'], rhcsa: ['R5'] },   // codes définis dans catalogue.js
  fiches: [ /* voir ci-dessous */ ],
  flashcards: [ { q: 'Question ?', r: 'Réponse (Markdown).' } ],
  memo: `Markdown imprimable`,
});
```

## Structure d’une fiche

```js
{
  id: '3.2',                       // ou '3.A' pour une fiche hors livre
  titre: 'Le chemin sysfs',
  sections: '§3.2', pages: '49–50',
  auDela: false,                   // true pour une fiche « Au-delà du livre »
  objectif: 'Une phrase.',
  rappel: `Markdown (titres ###, tableaux, blocs de code, citations > pour les encadrés)`,
  aRetenir: ['3 à 5 points'],
  exercices: [ … ],
}
```

Le Markdown des rappels est écrit dans des gabarits JS (backticks) : l’indentation commune est retirée automatiquement.
À l’intérieur, échappe les backticks : `` \` ``.

## Champs communs à tous les exercices

| Champ | Obligatoire | Rôle |
|---|---|---|
| `id` | oui | `cXX-YY-NN` : chapitre, fiche, numéro (`c02-0a-01` pour la fiche 2.A). **Ne jamais renuméroter** : la progression des utilisateurs en dépend |
| `type` | oui | un des 10 types ci-dessous |
| `niveau` | oui | 1 découverte, 2 application, 3 approfondissement |
| `enonce` | oui | Markdown |
| `indices` | oui | **trois** chaînes : une piste, une direction, presque la réponse |
| `solution` | oui | Markdown : la réponse **et** l’explication |
| `ref` | conseillé | référence au livre |

## Les types

### `qcm`
```js
{ type: 'qcm', choix: ['A', 'B', 'C'], reponse: 0 }                 // une réponse
{ type: 'qcm', multi: true, choix: [...], reponse: [0, 2] }          // plusieurs réponses
```
Les choix sont mélangés (de façon stable) ; `melanger: false` pour garder l’ordre.

### `vrai-faux`
```js
{ type: 'vrai-faux', affirmations: [ { texte: '…', vrai: true, explication: '…' } ] }
```

### `commande`
```js
{ type: 'commande', accepte: ['ls -(la|al)', 'ls -l -a'], exemple: 'ls -la',
  pieges: [ { motif: 'ls -l', message: 'Il manque les fichiers cachés.' } ],
  root: false, souple: true }
```
- La saisie est normalisée : invite `$ `/`# ` retirée, espaces multiples réduits, `;` final retiré.
- Chaque motif d’`accepte` est une expression régulière **ancrée** (`^…$`), écrite dans une chaîne JS : double les `\\`.
- `exemple` est obligatoire : le validateur vérifie qu’il est accepté.
- `pieges` donne un retour ciblé sur une erreur classique.
- `souple: true` (défaut) : une réponse non reconnue n’est pas comptée fausse ; l’utilisateur peut la déclarer équivalente après avoir vu la solution.

### `reponse-courte`
```js
{ type: 'reponse-courte', accepte: ['16', 'seize'], casse: false, mono: false }
```
Insensible à la casse et aux accents, sauf `casse: true` (chemins, options, noms de fichiers).

### `sortie`
```js
{ type: 'sortie', attendu: 'deux\ntrois', lignes: 3 }
```
Comparaison après normalisation (espaces réduits, lignes vides aux bords retirées). `accepte: [...]` en alternative.

### `ordre`
```js
{ type: 'ordre', elements: ['étape 1', 'étape 2', 'étape 3'] }      // dans le BON ordre
```

### `association`
```js
{ type: 'association', paires: [['gauche', 'droite'], …], distracteurs: ['intrus'] }
```
Les valeurs de droite doivent être uniques.

### `trous`
```js
{ type: 'trous', texte: 'Host [[1]]\n    HostName [[2]]',
  trous: [ { accepte: ['fut'], exemple: 'fut', casse: true }, … ] }
```

### `libre`
Question ouverte : l’utilisateur compare avec la `solution` (réponse modèle) et s’auto-évalue.

### `terminal`
```js
{ type: 'terminal', enonce: 'Lance … et colle la sortie.', attendu: ['regex1', 'regex2'], lignes: 4 }
```
Avec `attendu`, la sortie collée est vérifiée (chaque regex doit être trouvée, mode multiligne). Sans `attendu` : auto-évaluation.

## Labs

Voir [labs/README.md](labs/README.md).
