#!/usr/bin/env node
/*
 * Valide les données du cahier (site/data/*.js) avec le VRAI moteur de correction.
 *
 *   node tools/validate.mjs
 *
 * Vérifie notamment :
 *  - identifiants d'exercices uniques et bien formés ;
 *  - champs obligatoires de chaque type, 3 indices, solution présente ;
 *  - expressions régulières valides ;
 *  - la réponse modèle (`exemple`, `reponse`, ordre naturel…) est ACCEPTÉE par le correcteur ;
 *  - cohérence avec le catalogue (chapitres, fichiers, labs, examens).
 * Code de sortie 1 en cas d'erreur.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(racine, 'site');

const ctx = { console, window: {} };
ctx.window.window = ctx.window;
vm.createContext(ctx);
const charger = (f) => vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });

// Le moteur expose HLW sur window ; les fichiers de données appellent `HLW.xxx(...)`.
charger(path.join(site, 'assets/js/core.js'));
charger(path.join(site, 'assets/js/exercises.js'));
ctx.HLW = ctx.window.HLW;
charger(path.join(site, 'data/catalogue.js'));

const HLW = ctx.HLW;
const erreurs = [];
const avertissements = [];
const err = (m) => erreurs.push(m);
const warn = (m) => avertissements.push(m);

const cat = HLW.data.catalogue;
if (!cat) { console.error('catalogue absent'); process.exit(1); }

for (const f of cat.fichiers) {
  const p = path.join(site, 'data', f);
  if (!fs.existsSync(p)) { err(`fichier listé dans le catalogue introuvable : data/${f}`); continue; }
  try { charger(p); } catch (e) { err(`data/${f} : erreur JavaScript : ${e.message}`); }
}

const idsChapitresCatalogue = new Set(cat.chapitres.map((c) => c.id));
for (const b of cat.blocs) for (const c of b.chapitres) if (!idsChapitresCatalogue.has(c)) err(`bloc ${b.id} : chapitre inconnu ${c}`);
for (const c of cat.chapitres) if (!cat.blocs.find((b) => b.id === c.bloc)) err(`chapitre ${c.id} : bloc inconnu ${c.bloc}`);
for (const l of cat.labs) {
  for (const c of l.chapitres) if (!idsChapitresCatalogue.has(c)) err(`${l.id} : chapitre inconnu ${c}`);
  if (l.statut === 'disponible' && !fs.existsSync(path.join(racine, l.chemin, 'README.md'))) err(`${l.id} marqué disponible mais ${l.chemin}/README.md absent`);
}
for (const x of cat.examens) for (const c of x.chapitres) if (!idsChapitresCatalogue.has(c)) err(`examen ${x.id} : chapitre inconnu ${c}`);

const regexOk = (m, ou, flags = '') => {
  try { new RegExp(m, flags); return true; } catch (e) { err(`${ou} : expression régulière invalide « ${m} » (${e.message})`); return false; }
};

const ids = new Set();
let nbExos = 0, nbFiches = 0, nbCartes = 0;
const parType = {};

for (const ch of Object.values(HLW.data.chapitres)) {
  if (!idsChapitresCatalogue.has(ch.id)) err(`chapitre ${ch.id} absent du catalogue`);
  if (!ch.intro) warn(`chapitre ${ch.id} : pas d'intro`);
  for (const [k, liste] of Object.entries(ch.certifs || {})) {
    const c = cat.certifs[k];
    if (!c) { err(`chapitre ${ch.id} : certification inconnue ${k}`); continue; }
    for (const o of liste) if (!c.objectifs[o]) err(`chapitre ${ch.id} : objectif ${k} inconnu ${o}`);
  }
  const idsFiches = new Set();
  for (const f of ch.fiches || []) {
    nbFiches++;
    const lieuF = `ch${ch.id} fiche ${f.id}`;
    if (idsFiches.has(f.id)) err(`${lieuF} : identifiant de fiche en double`);
    idsFiches.add(f.id);
    if (!f.titre) err(`${lieuF} : titre manquant`);
    if (!f.rappel) err(`${lieuF} : rappel manquant`);
    if (/\[\[\d+\]\]/.test(f.rappel || '')) warn(`${lieuF} : marqueur de trou dans le rappel`);
    for (const ex of f.exercices || []) {
      nbExos++;
      const lieu = `${lieuF} exo ${ex.id}`;
      parType[ex.type] = (parType[ex.type] || 0) + 1;
      if (!ex.id || !/^c[0-9A-Z]{2}-[0-9a-z]{2}-\d{2}$/.test(ex.id)) err(`${lieu} : identifiant mal formé (attendu cXX-YY-NN)`);
      if (ids.has(ex.id)) err(`${lieu} : identifiant en double`);
      ids.add(ex.id);
      const T = HLW.types[ex.type];
      if (!T) { err(`${lieu} : type inconnu ${ex.type}`); continue; }
      if (!ex.enonce) err(`${lieu} : énoncé manquant`);
      if (!ex.solution) err(`${lieu} : solution manquante`);
      if (!Array.isArray(ex.indices) || ex.indices.length !== 3) warn(`${lieu} : ${Array.isArray(ex.indices) ? ex.indices.length : 0} indice(s) au lieu de 3`);
      if (![1, 2, 3].includes(ex.niveau)) err(`${lieu} : niveau doit valoir 1, 2 ou 3`);
      for (const p of ex.pieges || []) regexOk(p.motif, `${lieu} piège`);

      let bonne; // réponse modèle à soumettre au correcteur
      switch (ex.type) {
        case 'qcm': {
          if (!Array.isArray(ex.choix) || ex.choix.length < 2) { err(`${lieu} : au moins 2 choix`); break; }
          const r = Array.isArray(ex.reponse) ? ex.reponse : [ex.reponse];
          if (!r.length || r.some((i) => !Number.isInteger(i) || i < 0 || i >= ex.choix.length)) { err(`${lieu} : reponse hors limites`); break; }
          if (r.length > 1 && ex.multi !== true) warn(`${lieu} : plusieurs réponses sans multi: true (affiché quand même en multiple)`);
          bonne = r.slice().sort((a, b) => a - b);
          break;
        }
        case 'vrai-faux':
          if (!Array.isArray(ex.affirmations) || !ex.affirmations.length) { err(`${lieu} : affirmations manquantes`); break; }
          if (ex.affirmations.some((a) => typeof a.vrai !== 'boolean' || !a.texte)) { err(`${lieu} : chaque affirmation a un texte et vrai: true|false`); break; }
          bonne = ex.affirmations.map((a) => a.vrai);
          break;
        case 'commande':
        case 'reponse-courte':
          if (!Array.isArray(ex.accepte) || !ex.accepte.length) { err(`${lieu} : accepte[] manquant`); break; }
          ex.accepte.forEach((m) => regexOk(m, lieu));
          if (ex.type === 'commande' && !ex.exemple) err(`${lieu} : exemple manquant (réponse canonique testée par le validateur)`);
          bonne = ex.exemple !== undefined ? ex.exemple : null;
          if (bonne === null && ex.type === 'reponse-courte') {
            // on teste au moins que le premier motif sans métacaractère s'accepte lui-même
            const lit = ex.accepte.find((m) => /^[\w\sàâäéèêëîïôöùûüç'-]+$/i.test(m));
            if (lit) bonne = lit;
          }
          break;
        case 'sortie':
          if (ex.attendu === undefined && !ex.accepte) { err(`${lieu} : attendu ou accepte requis`); break; }
          (ex.accepte || []).forEach((m) => regexOk(m, lieu));
          bonne = ex.attendu !== undefined ? ex.attendu : ex.exemple;
          break;
        case 'ordre':
          if (!Array.isArray(ex.elements) || ex.elements.length < 2) { err(`${lieu} : au moins 2 éléments`); break; }
          bonne = ex.elements.map((_, i) => i);
          break;
        case 'association': {
          if (!Array.isArray(ex.paires) || ex.paires.length < 2) { err(`${lieu} : au moins 2 paires`); break; }
          const droites = ex.paires.map((p) => p[1]).concat(ex.distracteurs || []);
          if (new Set(droites).size !== droites.length) err(`${lieu} : valeurs de droite en double (la correction serait ambiguë)`);
          bonne = ex.paires.map((_, i) => i);
          break;
        }
        case 'trous': {
          const n = (String(ex.texte || '').match(/\[\[\d+\]\]/g) || []).length;
          if (!n) { err(`${lieu} : aucun [[n]] dans le texte`); break; }
          if (!Array.isArray(ex.trous) || ex.trous.length !== n) { err(`${lieu} : ${n} trous dans le texte mais ${ex.trous ? ex.trous.length : 0} définis`); break; }
          ex.trous.forEach((t, i) => { (t.accepte || []).forEach((m) => regexOk(m, `${lieu} trou ${i + 1}`)); if (!t.exemple) err(`${lieu} trou ${i + 1} : exemple manquant`); });
          bonne = ex.trous.map((t) => t.exemple);
          break;
        }
        case 'terminal':
          (ex.attendu || []).forEach((m) => regexOk(m, lieu, 'm'));
          if (ex.attendu && ex.exemple) bonne = ex.exemple;
          break;
        case 'libre':
          break;
      }
      if (bonne !== undefined && bonne !== null && T.verifier) {
        let res;
        try { res = T.verifier(ex, bonne); } catch (e) { err(`${lieu} : le correcteur plante : ${e.message}`); continue; }
        if (!res || res.ok !== true) err(`${lieu} : la réponse modèle n'est PAS acceptée (${JSON.stringify(bonne)}) → ${res && res.msg}`);
      }
    }
  }
  for (const c of ch.flashcards || []) { nbCartes++; if (!c.q || !c.r) err(`ch${ch.id} : carte incomplète`); }
}

const g = HLW.data.glossaire;
const termes = new Set();
for (const t of g) {
  if (!t.terme || !t.def) err(`glossaire : entrée incomplète ${JSON.stringify(t)}`);
  const k = t.terme.toLowerCase();
  if (termes.has(k)) warn(`glossaire : terme en double « ${t.terme} »`);
  termes.add(k);
  if (t.chap && !idsChapitresCatalogue.has(t.chap)) err(`glossaire « ${t.terme} » : chapitre inconnu ${t.chap}`);
}

console.log(`Chapitres : ${Object.keys(HLW.data.chapitres).length} | fiches : ${nbFiches} | exercices : ${nbExos} | cartes : ${nbCartes} | glossaire : ${g.length}`);
console.log('Par type :', Object.entries(parType).sort().map(([k, v]) => `${k}=${v}`).join(', '));
for (const w of avertissements) console.log('  avertissement :', w);
for (const e of erreurs) console.log('  ERREUR :', e);
if (erreurs.length) { console.log(`\n${erreurs.length} erreur(s).`); process.exit(1); }
console.log(`\nOK${avertissements.length ? ` (${avertissements.length} avertissement(s))` : ''}.`);
