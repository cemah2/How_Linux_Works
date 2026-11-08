/*
 * How Linux Works — cahier pratique
 * core.js : registre des données, utilitaires, Markdown, stockage de la progression,
 *           répétition espacée (Leitner).
 *
 * Aucune dépendance de build : le site fonctionne en ouvrant index.html (file://)
 * comme sur GitHub Pages.
 */
(function () {
  'use strict';

  const HLW = (window.HLW = window.HLW || {});

  /* ------------------------------------------------------------------ */
  /* Registre : les fichiers de data/ appellent ces fonctions            */
  /* ------------------------------------------------------------------ */
  HLW.data = { catalogue: null, chapitres: {}, glossaire: [], examens: {} };
  HLW.catalogue = (c) => { HLW.data.catalogue = c; };
  HLW.chapitre = (ch) => { HLW.data.chapitres[ch.id] = ch; };
  /** Ajoute des fiches / cartes à un chapitre déjà déclaré (gros chapitres répartis sur plusieurs fichiers). */
  HLW.completer = (id, suite) => {
    const ch = HLW.data.chapitres[id];
    if (!ch) { console.error('HLW.completer : chapitre inconnu', id); return; }
    if (suite.fiches) ch.fiches = (ch.fiches || []).concat(suite.fiches);
    if (suite.flashcards) ch.flashcards = (ch.flashcards || []).concat(suite.flashcards);
    if (suite.memo) ch.memo = (ch.memo || '') + '\n\n' + suite.memo;
  };
  HLW.glossaire = (liste) => { HLW.data.glossaire.push(...liste); };

  /* ------------------------------------------------------------------ */
  /* Utilitaires                                                         */
  /* ------------------------------------------------------------------ */
  const U = (HLW.util = {});

  U.esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /** Crée un élément : el('div', {class: 'x', onclick: fn}, [enfants | 'texte']) */
  U.el = (tag, attrs, enfants) => {
    const n = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k === 'html') n.innerHTML = v;
        else if (k === 'text') n.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else if (v === true) n.setAttribute(k, '');
        else n.setAttribute(k, v);
      }
    }
    if (enfants !== undefined && enfants !== null) {
      for (const e of [].concat(enfants)) {
        if (e === null || e === undefined || e === false) continue;
        n.appendChild(typeof e === 'string' ? document.createTextNode(e) : e);
      }
    }
    return n;
  };

  /** Retire l'indentation commune (contenu écrit dans des template literals JS). */
  U.dedent = (s) => {
    if (!s) return '';
    const lignes = String(s).replace(/\t/g, '    ').split('\n');
    while (lignes.length && !lignes[0].trim()) lignes.shift();
    while (lignes.length && !lignes[lignes.length - 1].trim()) lignes.pop();
    let min = Infinity;
    for (const l of lignes) {
      if (!l.trim()) continue;
      const m = l.match(/^ */)[0].length;
      if (m < min) min = m;
    }
    if (!isFinite(min)) min = 0;
    return lignes.map((l) => l.slice(min)).join('\n');
  };

  /** Markdown -> HTML (marked, GFM). Le contenu est écrit par les auteurs du dépôt. */
  U.md = (s) => {
    const src = U.dedent(s);
    if (window.marked) return window.marked.parse(src, { gfm: true, breaks: false });
    return '<p>' + U.esc(src).replace(/\n\n/g, '</p><p>') + '</p>';
  };
  U.mdInline = (s) => {
    const src = String(s ?? '');
    if (window.marked) return window.marked.parseInline(src, { gfm: true });
    return U.esc(src);
  };

  /** Hash de chaîne stable (pour les mélanges déterministes). */
  U.hash = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  /** Générateur pseudo-aléatoire reproductible (mulberry32). */
  U.rng = (graine) => {
    let a = graine >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.melanger = (tab, graine) => {
    const r = graine === undefined ? Math.random : U.rng(graine);
    const t = tab.slice();
    for (let i = t.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [t[i], t[j]] = [t[j], t[i]];
    }
    return t;
  };

  U.sansAccents = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');

  /* --- Normalisations utilisées par la correction automatique --- */
  U.norm = {
    /** Commande shell : retire l'invite ($, #), espaces multiples, ; final. */
    commande(s) {
      return String(s ?? '')
        .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
        .trim()
        .replace(/^(\$|#)\s+/, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*;\s*$/, '');
    },
    /** Réponse courte : insensible à la casse et aux accents. */
    texte(s) {
      return U.sansAccents(String(s ?? ''))
        .replace(/[‘’]/g, "'")
        .toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!]$/, '');
    },
    /** Sortie de terminal : espaces internes réduits, lignes vides aux bords retirées. */
    sortie(s) {
      const lignes = String(s ?? '').replace(/\r/g, '').split('\n')
        .map((l) => l.replace(/\s+/g, ' ').trim());
      while (lignes.length && !lignes[0]) lignes.shift();
      while (lignes.length && !lignes[lignes.length - 1]) lignes.pop();
      return lignes.join('\n');
    },
  };

  /** Teste une valeur normalisée contre une liste de motifs (ancrés ^...$). */
  U.correspond = (valeur, motifs, drapeaux) => {
    for (const m of motifs || []) {
      try {
        if (new RegExp('^(?:' + m + ')$', drapeaux || '').test(valeur)) return true;
      } catch (e) {
        console.warn('Motif invalide', m, e);
      }
    }
    return false;
  };

  U.pct = (x) => Math.round((x || 0) * 100);
  U.dateCourte = (t) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  U.pluriel = (n, sing, plur) => `${n} ${n > 1 ? (plur || sing + 's') : sing}`;

  /* ------------------------------------------------------------------ */
  /* Stockage local (progression)                                        */
  /* ------------------------------------------------------------------ */
  const CLE = 'hlw.progression.v1';
  const vide = () => ({ version: 1, exos: {}, cartes: {}, examens: [], prefs: {}, derniere: null });

  let memoire = vide();
  let persistant = true;
  try {
    const brut = window.localStorage.getItem(CLE);
    if (brut) memoire = Object.assign(vide(), JSON.parse(brut));
  } catch (e) {
    persistant = false;
  }

  const S = (HLW.store = {
    persistant: () => persistant,
    etat: () => memoire,
    sauver() {
      try { window.localStorage.setItem(CLE, JSON.stringify(memoire)); persistant = true; }
      catch (e) { persistant = false; }
    },
    exo: (id) => memoire.exos[id] || null,
    majExo(id, patch) {
      memoire.exos[id] = Object.assign({ indices: 0, tentatives: 0 }, memoire.exos[id], patch, { date: Date.now() });
      S.sauver();
      document.dispatchEvent(new CustomEvent('hlw:progression', { detail: { id } }));
      return memoire.exos[id];
    },
    effacerExo(id) { delete memoire.exos[id]; S.sauver(); document.dispatchEvent(new CustomEvent('hlw:progression', { detail: { id } })); },
    pref: (k, d) => (k in memoire.prefs ? memoire.prefs[k] : d),
    setPref(k, v) { memoire.prefs[k] = v; S.sauver(); },
    setDerniere(route) { memoire.derniere = route; S.sauver(); },
    ajouterExamen(r) { memoire.examens.push(r); S.sauver(); },
    exporter: () => JSON.stringify(memoire, null, 2),
    importer(json) {
      const d = JSON.parse(json);
      if (!d || typeof d !== 'object' || !d.exos) throw new Error('Fichier de progression invalide.');
      memoire = Object.assign(vide(), d);
      S.sauver();
    },
    reinitialiser() { memoire = vide(); S.sauver(); },
  });

  /* ------------------------------------------------------------------ */
  /* Score d'un exercice                                                 */
  /* ------------------------------------------------------------------ */
  HLW.PENALITE_INDICE = 0.2;
  /** Statut : 'ok' (réussi), 'auto' (auto-évalué réussi), 'ko' (à revoir), 'vu' (solution vue), null */
  HLW.scoreExo = (st) => {
    if (!st || !(st.etat === 'ok' || st.etat === 'auto')) return 0;
    return Math.max(0.4, 1 - HLW.PENALITE_INDICE * (st.indices || 0));
  };
  HLW.estTermine = (st) => !!st && ['ok', 'auto', 'vu', 'ko'].includes(st.etat);
  HLW.estReussi = (st) => !!st && (st.etat === 'ok' || st.etat === 'auto');
  HLW.estARevoir = (st) => !!st && (st.etat === 'ko' || st.etat === 'vu' || (HLW.estReussi(st) && st.indices >= 2));

  /** Statistiques d'une liste d'exercices. */
  HLW.stats = (exos) => {
    let faits = 0, reussis = 0, score = 0;
    for (const e of exos) {
      const st = S.exo(e.id);
      if (HLW.estTermine(st)) faits++;
      if (HLW.estReussi(st)) reussis++;
      score += HLW.scoreExo(st);
    }
    const n = exos.length;
    return { total: n, faits, reussis, avancement: n ? faits / n : 0, score: n ? score / n : 0 };
  };

  /* ------------------------------------------------------------------ */
  /* Accès au contenu                                                    */
  /* ------------------------------------------------------------------ */
  HLW.exosDuChapitre = (ch) => (ch.fiches || []).flatMap((f) => f.exercices || []);
  HLW.trouverExo = (id) => {
    for (const ch of Object.values(HLW.data.chapitres)) {
      for (const f of ch.fiches || []) {
        for (const e of f.exercices || []) if (e.id === id) return { ch, fiche: f, exo: e };
      }
    }
    return null;
  };

  /* ------------------------------------------------------------------ */
  /* Répétition espacée (boîtes de Leitner)                              */
  /* ------------------------------------------------------------------ */
  const JOUR = 86400000;
  HLW.INTERVALLES = [0, 1, 3, 7, 16, 35]; // en jours, index = boîte (1..5)

  HLW.cartes = {
    /** Toutes les cartes d'un chapitre (flashcards déclarées). */
    duChapitre(ch) {
      return (ch.flashcards || []).map((c, i) => ({
        id: c.id || `${ch.id}:${i + 1}`, chap: ch.id, q: c.q, r: c.r,
      }));
    },
    toutes() {
      return Object.values(HLW.data.chapitres).flatMap((ch) => HLW.cartes.duChapitre(ch));
    },
    etat: (id) => memoire.cartes[id] || null,
    estDue(id, maintenant) {
      const st = memoire.cartes[id];
      if (!st) return true; // jamais vue = nouvelle
      return st.due <= (maintenant || Date.now());
    },
    noter(id, savait) {
      const st = memoire.cartes[id] || { boite: 0 };
      const boite = savait ? Math.min(5, (st.boite || 0) + 1) : 1;
      memoire.cartes[id] = { boite, due: Date.now() + HLW.INTERVALLES[boite] * JOUR, vue: Date.now() };
      S.sauver();
    },
    dues(liste) {
      const t = Date.now();
      return liste.filter((c) => HLW.cartes.estDue(c.id, t));
    },
  };
})();
