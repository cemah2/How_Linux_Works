/*
 * exercises.js : rendu et correction des 10 types d'exercices.
 *
 * Types : qcm, vrai-faux, commande, reponse-courte, sortie, ordre,
 *         association, trous, libre, terminal.
 * Le format de chaque type est documenté dans CONTRIBUTING.md.
 */
(function () {
  'use strict';
  const HLW = window.HLW;
  const U = HLW.util;
  const S = HLW.store;
  const el = U.el;

  /* ------------------------------------------------------------------ */
  /* Définition des types                                                */
  /* ------------------------------------------------------------------ */
  const T = (HLW.types = {});

  const estMulti = (ex) => ex.multi === true || (Array.isArray(ex.reponse) && ex.reponse.length > 1);
  const ensemble = (x) => (Array.isArray(x) ? x : [x]).slice().sort((a, b) => a - b);

  function verifierPieges(ex, valeur) {
    for (const p of ex.pieges || []) {
      try {
        if (new RegExp('^(?:' + p.motif + ')$', p.drapeaux || '').test(valeur)) return p.message;
      } catch (e) { /* motif invalide : ignoré */ }
    }
    return null;
  }

  /* --- QCM ----------------------------------------------------------- */
  T.qcm = {
    libelle: (ex) => (estMulti(ex) ? 'QCM (plusieurs réponses)' : 'QCM'),
    auto: true,
    render(ex, zone, rep) {
      const multi = estMulti(ex);
      const ordre = ex.melanger === false ? ex.choix.map((_, i) => i) : U.melanger(ex.choix.map((_, i) => i), U.hash(ex.id));
      const liste = el('div', { class: 'choix', role: multi ? 'group' : 'radiogroup' });
      if (multi) zone.appendChild(el('p', { class: 'consigne-mini', text: 'Plusieurs réponses sont possibles.' }));
      const coches = new Set(Array.isArray(rep) ? rep : []);
      for (const i of ordre) {
        const inp = el('input', { type: multi ? 'checkbox' : 'radio', name: 'q-' + ex.id + (zone.dataset.suffixe || ''), value: String(i) });
        if (coches.has(i)) inp.checked = true;
        liste.appendChild(el('label', { class: 'choix-item', 'data-i': String(i) }, [inp, el('span', { html: U.mdInline(ex.choix[i]) })]));
      }
      zone.appendChild(liste);
      return { liste };
    },
    lire: (ui) => [...ui.liste.querySelectorAll('input:checked')].map((i) => +i.value).sort((a, b) => a - b),
    verifier(ex, rep) {
      if (!rep.length) return { vide: true, msg: 'Choisis au moins une réponse.' };
      const bon = ensemble(ex.reponse);
      const ok = rep.length === bon.length && rep.every((v, i) => v === bon[i]);
      if (ok) return { ok: true };
      if (estMulti(ex)) {
        const justes = rep.filter((v) => bon.includes(v)).length;
        return { ok: false, msg: `Pas encore : ${justes} bonne(s) réponse(s) cochée(s) sur ${bon.length}, ${rep.length - justes} en trop.` };
      }
      return { ok: false, msg: 'Ce n’est pas la bonne réponse.' };
    },
    corriger(ex, ui) {
      const bon = ensemble(ex.reponse);
      ui.liste.querySelectorAll('.choix-item').forEach((lab) => {
        const i = +lab.dataset.i;
        const coche = lab.querySelector('input').checked;
        lab.classList.toggle('est-juste', bon.includes(i));
        lab.classList.toggle('est-faux', coche && !bon.includes(i));
      });
    },
    verrouiller: (ui, v) => ui.liste.querySelectorAll('input').forEach((i) => (i.disabled = v)),
  };

  /* --- Vrai / faux ---------------------------------------------------- */
  T['vrai-faux'] = {
    libelle: () => 'Vrai ou faux',
    auto: true,
    render(ex, zone, rep) {
      const tab = el('div', { class: 'vf' });
      ex.affirmations.forEach((a, i) => {
        const nom = 'vf-' + ex.id + '-' + i + (zone.dataset.suffixe || '');
        const v = el('input', { type: 'radio', name: nom, value: 'v' });
        const f = el('input', { type: 'radio', name: nom, value: 'f' });
        if (Array.isArray(rep)) { if (rep[i] === true) v.checked = true; if (rep[i] === false) f.checked = true; }
        tab.appendChild(el('div', { class: 'vf-ligne', 'data-i': String(i) }, [
          el('div', { class: 'vf-texte', html: U.mdInline(a.texte) }),
          el('div', { class: 'vf-boutons' }, [
            el('label', { class: 'vf-opt' }, [v, el('span', { text: 'Vrai' })]),
            el('label', { class: 'vf-opt' }, [f, el('span', { text: 'Faux' })]),
          ]),
          el('div', { class: 'vf-explication', hidden: true, html: a.explication ? U.mdInline(a.explication) : '' }),
        ]));
      });
      zone.appendChild(tab);
      return { tab };
    },
    lire: (ui) => [...ui.tab.querySelectorAll('.vf-ligne')].map((l) => {
      const c = l.querySelector('input:checked');
      return c ? c.value === 'v' : null;
    }),
    verifier(ex, rep) {
      if (rep.some((r) => r === null)) return { vide: true, msg: 'Réponds à chaque affirmation.' };
      const justes = rep.filter((r, i) => r === ex.affirmations[i].vrai).length;
      if (justes === rep.length) return { ok: true };
      return { ok: false, msg: `${justes} affirmation(s) sur ${rep.length} correctement jugée(s).` };
    },
    corriger(ex, ui) {
      ui.tab.querySelectorAll('.vf-ligne').forEach((l) => {
        const i = +l.dataset.i;
        const c = l.querySelector('input:checked');
        const bon = ex.affirmations[i].vrai;
        l.classList.toggle('est-juste', !!c && (c.value === 'v') === bon);
        l.classList.toggle('est-faux', !!c && (c.value === 'v') !== bon);
        l.querySelectorAll('.vf-opt').forEach((o) => o.classList.toggle('attendu', (o.querySelector('input').value === 'v') === bon));
        const exp = l.querySelector('.vf-explication');
        if (exp.innerHTML) exp.hidden = false;
      });
    },
    verrouiller: (ui, v) => ui.tab.querySelectorAll('input').forEach((i) => (i.disabled = v)),
  };

  /* --- Commande ------------------------------------------------------- */
  T.commande = {
    libelle: () => 'Commande',
    auto: true,
    render(ex, zone, rep) {
      const inp = el('input', {
        type: 'text', class: 'saisie mono', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off',
        'aria-label': 'Ta commande', placeholder: ex.placeholder || 'tape ta commande ici',
      });
      if (typeof rep === 'string') inp.value = rep;
      zone.appendChild(el('div', { class: 'ligne-commande' }, [el('span', { class: 'invite', 'aria-hidden': 'true', text: ex.root ? '#' : '$' }), inp]));
      return { inp };
    },
    lire: (ui) => ui.inp.value,
    verifier(ex, rep) {
      const v = U.norm.commande(rep);
      if (!v) return { vide: true, msg: 'Écris une commande avant de vérifier.' };
      if (U.correspond(v, ex.accepte)) return { ok: true };
      const piege = verifierPieges(ex, v);
      if (piege) return { ok: false, msg: piege };
      if (ex.souple === false) return { ok: false, msg: 'Ce n’est pas la commande attendue.' };
      return { ok: null, msg: 'Réponse non reconnue. Elle est peut-être correcte sous une autre forme : réessaie, prends un indice, ou compare avec la solution.' };
    },
    corriger() {},
    verrouiller: (ui, v) => (ui.inp.disabled = v),
  };

  /* --- Réponse courte ------------------------------------------------- */
  T['reponse-courte'] = {
    libelle: () => 'Réponse courte',
    auto: true,
    render(ex, zone, rep) {
      const inp = el('input', { type: 'text', class: 'saisie' + (ex.mono ? ' mono' : ''), spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Ta réponse', placeholder: ex.placeholder || 'ta réponse' });
      if (typeof rep === 'string') inp.value = rep;
      zone.appendChild(inp);
      return { inp };
    },
    lire: (ui) => ui.inp.value,
    verifier(ex, rep) {
      const v = ex.casse ? String(rep).trim() : U.norm.texte(rep);
      if (!v) return { vide: true, msg: 'Écris une réponse avant de vérifier.' };
      if (U.correspond(v, ex.accepte, ex.casse ? '' : 'i')) return { ok: true };
      const piege = verifierPieges(ex, v);
      if (piege) return { ok: false, msg: piege };
      return { ok: false, msg: 'Ce n’est pas la réponse attendue.' };
    },
    corriger() {},
    verrouiller: (ui, v) => (ui.inp.disabled = v),
  };

  /* --- Prédire la sortie --------------------------------------------- */
  T.sortie = {
    libelle: () => 'Prédire la sortie',
    auto: true,
    render(ex, zone, rep) {
      const ta = el('textarea', { class: 'saisie mono', rows: String(ex.lignes || 3), spellcheck: 'false', 'aria-label': 'La sortie que tu prévois', placeholder: 'ce que la commande affiche' });
      if (typeof rep === 'string') ta.value = rep;
      zone.appendChild(ta);
      return { ta };
    },
    lire: (ui) => ui.ta.value,
    verifier(ex, rep) {
      const v = U.norm.sortie(rep);
      if (!v) return { vide: true, msg: 'Écris la sortie prévue avant de vérifier.' };
      if (ex.attendu !== undefined && v === U.norm.sortie(ex.attendu)) return { ok: true };
      if (ex.accepte && U.correspond(v, ex.accepte)) return { ok: true };
      return { ok: false, msg: 'Ce n’est pas la sortie produite. Relis la commande élément par élément.' };
    },
    corriger() {},
    verrouiller: (ui, v) => (ui.ta.disabled = v),
  };

  /* --- Remettre dans l'ordre ----------------------------------------- */
  T.ordre = {
    libelle: () => 'Remettre dans l’ordre',
    auto: true,
    render(ex, zone, rep) {
      let ordre;
      if (Array.isArray(rep) && rep.length === ex.elements.length) ordre = rep.slice();
      else {
        const base = ex.elements.map((_, i) => i);
        let g = U.hash(ex.id);
        ordre = U.melanger(base, g);
        while (ordre.every((v, i) => v === i) && base.length > 1) ordre = U.melanger(base, ++g);
      }
      const ol = el('ol', { class: 'ordre' });
      const ui = { ol, bloque: false };
      const deplacer = (li, sens) => {
        if (ui.bloque) return;
        const cible = sens < 0 ? li.previousElementSibling : li.nextElementSibling;
        if (!cible) return;
        if (sens < 0) ol.insertBefore(li, cible); else ol.insertBefore(cible, li);
        li.querySelector(sens < 0 ? '.haut' : '.bas').focus();
      };
      let glisse = null;
      for (const i of ordre) {
        const li = el('li', { class: 'ordre-item', draggable: 'true', 'data-i': String(i) }, [
          el('span', { class: 'poignee', 'aria-hidden': 'true', text: '⋮⋮' }),
          el('span', { class: 'ordre-texte', html: U.mdInline(ex.elements[i]) }),
          el('span', { class: 'ordre-btns' }, [
            el('button', { type: 'button', class: 'mini haut', 'aria-label': 'Monter', text: '▲', onclick: (e) => deplacer(e.currentTarget.closest('li'), -1) }),
            el('button', { type: 'button', class: 'mini bas', 'aria-label': 'Descendre', text: '▼', onclick: (e) => deplacer(e.currentTarget.closest('li'), 1) }),
          ]),
        ]);
        li.addEventListener('dragstart', (e) => { if (ui.bloque) { e.preventDefault(); return; } glisse = li; li.classList.add('glisse'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', ''); } catch (_) { /* ok */ } });
        li.addEventListener('dragend', () => { li.classList.remove('glisse'); glisse = null; });
        li.addEventListener('dragover', (e) => {
          if (!glisse || glisse === li) return;
          e.preventDefault();
          const r = li.getBoundingClientRect();
          ol.insertBefore(glisse, e.clientY < r.top + r.height / 2 ? li : li.nextSibling);
        });
        ol.appendChild(li);
      }
      zone.appendChild(el('p', { class: 'consigne-mini', text: 'Glisse les éléments ou utilise les flèches.' }));
      zone.appendChild(ol);
      return ui;
    },
    lire: (ui) => [...ui.ol.children].map((li) => +li.dataset.i),
    verifier(ex, rep) {
      const bien = rep.filter((v, i) => v === i).length;
      if (bien === rep.length) return { ok: true };
      return { ok: false, msg: `${bien} élément(s) sur ${rep.length} à la bonne place.` };
    },
    corriger(ex, ui) {
      [...ui.ol.children].forEach((li, pos) => {
        li.classList.toggle('est-juste', +li.dataset.i === pos);
        li.classList.toggle('est-faux', +li.dataset.i !== pos);
      });
    },
    verrouiller(ui, v) { ui.bloque = v; ui.ol.querySelectorAll('button').forEach((b) => (b.disabled = v)); ui.ol.querySelectorAll('li').forEach((li) => li.setAttribute('draggable', v ? 'false' : 'true')); },
  };

  /* --- Associer ------------------------------------------------------- */
  T.association = {
    libelle: () => 'Associer',
    auto: true,
    render(ex, zone, rep) {
      const droites = ex.paires.map((p) => p[1]).concat(ex.distracteurs || []);
      const ordre = U.melanger(droites.map((_, i) => i), U.hash(ex.id) + 7);
      const lignes = el('div', { class: 'assoc' });
      ex.paires.forEach((p, i) => {
        const sel = el('select', { class: 'saisie', 'aria-label': 'Associer à : ' + U.sansAccents(p[0]).replace(/[`*]/g, '') });
        sel.appendChild(el('option', { value: '-1', text: '— choisir —' }));
        for (const j of ordre) sel.appendChild(el('option', { value: String(j), text: droites[j].replace(/[`*]/g, '') }));
        if (Array.isArray(rep) && rep[i] !== undefined) sel.value = String(rep[i]);
        lignes.appendChild(el('div', { class: 'assoc-ligne', 'data-i': String(i) }, [
          el('div', { class: 'assoc-g', html: U.mdInline(p[0]) }),
          sel,
          el('div', { class: 'assoc-attendu', hidden: true }),
        ]));
      });
      zone.appendChild(lignes);
      return { lignes, droites };
    },
    lire: (ui) => [...ui.lignes.querySelectorAll('select')].map((s) => +s.value),
    verifier(ex, rep) {
      if (rep.some((r) => r < 0)) return { vide: true, msg: 'Associe chaque élément avant de vérifier.' };
      const justes = rep.filter((r, i) => r === i).length;
      if (justes === rep.length) return { ok: true };
      return { ok: false, msg: `${justes} association(s) correcte(s) sur ${rep.length}.` };
    },
    corriger(ex, ui) {
      ui.lignes.querySelectorAll('.assoc-ligne').forEach((l) => {
        const i = +l.dataset.i;
        const v = +l.querySelector('select').value;
        l.classList.toggle('est-juste', v === i);
        l.classList.toggle('est-faux', v !== i);
        const a = l.querySelector('.assoc-attendu');
        if (v !== i) { a.hidden = false; a.innerHTML = 'Attendu : ' + U.mdInline(ui.droites[i]); }
      });
    },
    verrouiller: (ui, v) => ui.lignes.querySelectorAll('select').forEach((s) => (s.disabled = v)),
  };

  /* --- Texte à trous -------------------------------------------------- */
  T.trous = {
    libelle: () => 'Compléter',
    auto: true,
    render(ex, zone, rep) {
      const src = U.dedent(ex.texte);
      const pre = el('pre', { class: 'trous' });
      const champs = [];
      const morceaux = src.split(/\[\[(\d+)\]\]/);
      morceaux.forEach((m, k) => {
        if (k % 2 === 0) { pre.appendChild(document.createTextNode(m)); return; }
        const n = +m - 1;
        const t = ex.trous[n] || {};
        const larg = Math.max(4, (t.taille || (t.exemple || '').length || 6) + 1);
        const inp = el('input', { type: 'text', class: 'trou mono', spellcheck: 'false', autocomplete: 'off', size: String(larg), 'aria-label': 'Trou ' + (n + 1), 'data-n': String(n) });
        if (Array.isArray(rep) && typeof rep[n] === 'string') inp.value = rep[n];
        champs[n] = inp;
        pre.appendChild(inp);
      });
      zone.appendChild(pre);
      return { champs };
    },
    lire: (ui) => ui.champs.map((c) => c.value),
    verifier(ex, rep) {
      if (rep.some((r) => !String(r).trim())) return { vide: true, msg: 'Remplis tous les trous avant de vérifier.' };
      const res = rep.map((r, i) => {
        const t = ex.trous[i];
        const v = String(r).trim().replace(/\s+/g, ' ');
        return U.correspond(t.casse === false ? v.toLowerCase() : v, t.accepte, t.casse === false ? 'i' : '');
      });
      const justes = res.filter(Boolean).length;
      if (justes === res.length) return { ok: true, detail: res };
      return { ok: false, msg: `${justes} trou(s) correct(s) sur ${res.length}.`, detail: res };
    },
    marquer(ui, detail) {
      if (!detail) return;
      ui.champs.forEach((c, i) => { c.classList.toggle('est-juste', !!detail[i]); c.classList.toggle('est-faux', !detail[i]); });
    },
    corriger(ex, ui) {
      const d = T.trous.verifier(ex, T.trous.lire(ui)).detail;
      if (d) T.trous.marquer(ui, d);
    },
    verrouiller: (ui, v) => ui.champs.forEach((c) => (c.disabled = v)),
  };

  /* --- Question ouverte ----------------------------------------------- */
  T.libre = {
    libelle: () => 'Question ouverte',
    auto: false,
    render(ex, zone, rep) {
      const ta = el('textarea', { class: 'saisie', rows: String(ex.lignes || 4), 'aria-label': 'Ta réponse', placeholder: 'Rédige ta réponse avec tes mots, puis compare avec la réponse modèle.' });
      if (typeof rep === 'string') ta.value = rep;
      zone.appendChild(ta);
      return { ta };
    },
    lire: (ui) => ui.ta.value,
    corriger() {},
    verrouiller: (ui, v) => (ui.ta.disabled = v),
  };

  /* --- Pratique sur la VM -------------------------------------------- */
  T.terminal = {
    libelle: () => 'Pratique sur la VM',
    auto: false, // sauf si `attendu` est fourni
    render(ex, zone, rep) {
      const ta = el('textarea', { class: 'saisie mono', rows: String(ex.lignes || 4), spellcheck: 'false', 'aria-label': 'Sortie de ta commande', placeholder: ex.attendu ? 'Colle ici la sortie obtenue sur ta machine' : 'Colle ici ta sortie ou tes notes (facultatif)' });
      if (typeof rep === 'string') ta.value = rep;
      zone.appendChild(ta);
      return { ta };
    },
    lire: (ui) => ui.ta.value,
    verifier(ex, rep) {
      const v = String(rep || '').trim();
      if (!v) return { vide: true, msg: 'Colle la sortie obtenue sur ta machine pour la faire vérifier.' };
      const ok = (ex.attendu || []).every((m) => { try { return new RegExp(m, 'm').test(v); } catch (e) { return false; } });
      return ok ? { ok: true } : { ok: false, msg: 'La sortie collée ne correspond pas à ce qui est attendu. Relis la consigne.' };
    },
    corriger() {},
    verrouiller: (ui, v) => (ui.ta.disabled = v),
  };

  HLW.estAutoCorrigeable = (ex) => (ex.type === 'terminal' ? !!(ex.attendu && ex.attendu.length) : !!(T[ex.type] && T[ex.type].auto));

  /* ------------------------------------------------------------------ */
  /* Rendu commun d'un exercice (mode fiche ou mode examen)              */
  /* ------------------------------------------------------------------ */
  const ETATS = {
    ok: { texte: 'Réussi', classe: 'ok' },
    auto: { texte: 'Réussi (auto-évalué)', classe: 'ok' },
    ko: { texte: 'À revoir', classe: 'ko' },
    vu: { texte: 'Solution consultée', classe: 'vu' },
  };

  function niveau(n) {
    const v = Math.min(3, Math.max(1, n || 1));
    const noms = ['', 'découverte', 'application', 'approfondissement'];
    return el('span', { class: 'niveau n' + v, title: `Niveau ${v} sur 3 : ${noms[v]}`, 'aria-label': `Niveau ${v} sur 3 : ${noms[v]}` },
      [1, 2, 3].map((k) => el('i', { class: k <= v ? 'plein' : '' })));
  }

  /**
   * Construit un exercice.
   * opts.numero : numéro affiché ; opts.mode : 'fiche' | 'examen'
   * Retourne { node, lire(), corrigerExamen() }.
   */
  HLW.exercice = function (ex, opts) {
    opts = opts || {};
    const type = T[ex.type];
    if (!type) return { node: el('div', { class: 'exo erreur', text: `Type d'exercice inconnu : ${ex.type}` }) };
    const examen = opts.mode === 'examen';
    const st = examen ? null : S.exo(ex.id);

    const badge = el('span', { class: 'etat-badge' });
    const tete = el('header', { class: 'exo-tete' }, [
      el('span', { class: 'exo-num', text: (examen ? 'Question ' : 'Exercice ') + (opts.numero || '') }),
      el('span', { class: 'exo-type', text: type.libelle(ex) }),
      niveau(ex.niveau),
      examen ? null : badge,
    ]);
    const enonce = el('div', { class: 'enonce prose', html: U.md(ex.enonce) });
    const zone = el('div', { class: 'reponse-zone' });
    if (examen) zone.dataset.suffixe = '-x';
    const ui = type.render(ex, zone, st ? st.reponse : undefined);
    const feedback = el('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
    const indicesBox = el('div', { class: 'indices' });
    const solution = el('div', { class: 'solution', hidden: true }, [
      el('h4', { text: ex.type === 'libre' ? 'Réponse modèle' : ex.type === 'terminal' ? 'Ce que tu dois obtenir' : 'Solution expliquée' }),
      el('div', { class: 'prose', html: U.md(ex.solution || '_Pas de solution rédigée._') }),
    ]);
    const actions = el('div', { class: 'actions' });
    const pied = ex.ref ? el('footer', { class: 'exo-ref', text: 'Dans le livre : ' + ex.ref }) : null;
    const node = el('article', { class: 'exo', id: 'exo-' + ex.id, 'data-type': ex.type }, [tete, enonce, zone, actions, feedback, indicesBox, solution, pied]);

    if (examen) {
      return {
        node,
        lire: () => type.lire(ui),
        corrigerExamen() {
          let res;
          if (HLW.estAutoCorrigeable(ex)) res = type.verifier(ex, type.lire(ui));
          else res = { ok: null };
          if (type.corriger) type.corriger(ex, ui);
          if (type.marquer && res.detail) type.marquer(ui, res.detail);
          if (type.verrouiller) type.verrouiller(ui, true);
          const ok = res.ok === true;
          node.classList.add(ok ? 'res-ok' : 'res-ko');
          feedback.className = 'feedback ' + (ok ? 'f-ok' : 'f-ko');
          if (ok) feedback.innerHTML = '<strong>Correct.</strong>';
          else if (res.vide) feedback.innerHTML = '<strong>Sans réponse</strong> (ou réponse incomplète).';
          else if (res.ok === null) feedback.innerHTML = '<strong>Non reconnue.</strong> Compare avec la solution : si ta commande est équivalente, considère-la juste.';
          else feedback.innerHTML = '<strong>Incorrect.</strong> ' + U.esc(res.msg || '');
          solution.hidden = false;
          return ok;
        },
      };
    }

    /* ---------------- mode fiche ---------------- */
    const nbIndices = (ex.indices || []).length;
    let derniereNonReconnue = false;

    const majBadge = () => {
      const s = S.exo(ex.id);
      const e = s && ETATS[s.etat];
      badge.className = 'etat-badge' + (e ? ' ' + e.classe : '');
      badge.textContent = e ? e.texte : '';
      node.dataset.etat = e ? e.classe : '';
    };

    const afficherIndice = (k) => {
      const h = ex.indices[k - 1];
      if (!h || indicesBox.querySelector(`[data-k="${k}"]`)) return;
      indicesBox.appendChild(el('div', { class: 'indice', 'data-k': String(k) }, [
        el('span', { class: 'indice-num', text: `Indice ${k}/${nbIndices}` }),
        el('div', { class: 'prose', html: U.md(h) }),
      ]));
    };

    const dire = (classe, html) => { feedback.className = 'feedback ' + classe; feedback.innerHTML = html; };

    const btnVerifier = el('button', { type: 'button', class: 'btn primaire', text: 'Vérifier' });
    const btnIndice = el('button', { type: 'button', class: 'btn' });
    const btnSolution = el('button', { type: 'button', class: 'btn discret' });
    const btnEquivalent = el('button', { type: 'button', class: 'btn', hidden: true, text: 'Ma réponse était équivalente' });
    const btnSavais = el('button', { type: 'button', class: 'btn primaire', hidden: true, text: 'J’avais l’essentiel' });
    const btnRevoir = el('button', { type: 'button', class: 'btn', hidden: true, text: 'À revoir' });
    const btnRecommencer = el('button', { type: 'button', class: 'btn discret', hidden: true, text: 'Recommencer' });

    const auto = HLW.estAutoCorrigeable(ex);
    const ouvert = !auto; // libre, terminal sans attendu

    const majBoutons = () => {
      const s = S.exo(ex.id) || {};
      const fini = HLW.estReussi(s) || s.etat === 'vu';
      const n = s.indices || 0;
      btnIndice.hidden = fini || n >= nbIndices;
      if (n < nbIndices) btnIndice.textContent = `Indice ${n + 1}`;
      btnIndice.title = `Chaque indice réduit le score de l’exercice de ${U.pct(HLW.PENALITE_INDICE)} %`;
      btnVerifier.hidden = fini || (ouvert && s.solution);
      btnSolution.hidden = !!s.solution;
      btnSolution.textContent = ouvert ? (ex.type === 'terminal' ? 'J’ai terminé : voir le résultat attendu' : 'Comparer avec la réponse modèle') : 'Voir la solution';
      if (ouvert) btnVerifier.hidden = true;
      if (ouvert && ex.type === 'terminal') btnVerifier.hidden = true;
      btnRecommencer.hidden = !(fini || s.etat === 'ko' || s.solution);
      const autoEval = ouvert && s.solution && !HLW.estReussi(s) && s.etat !== 'ko';
      btnSavais.hidden = !autoEval;
      btnRevoir.hidden = !autoEval;
      btnEquivalent.hidden = !(s.solution && derniereNonReconnue && !HLW.estReussi(s) && !ouvert);
      if (type.verrouiller) type.verrouiller(ui, fini);
    };

    btnVerifier.addEventListener('click', () => {
      const rep = type.lire(ui);
      const res = type.verifier(ex, rep);
      if (res.vide) { dire('f-info', U.esc(res.msg)); return; }
      const s = S.exo(ex.id) || {};
      const tentatives = (s.tentatives || 0) + 1;
      if (type.marquer && res.detail) type.marquer(ui, res.detail);
      derniereNonReconnue = res.ok === null;
      if (res.ok === true) {
        const etat = s.etat === 'vu' ? 'vu' : 'ok';
        S.majExo(ex.id, { etat, tentatives, reponse: rep });
        const sc = HLW.scoreExo(S.exo(ex.id));
        dire('f-ok', `<strong>Correct.</strong> ${etat === 'vu' ? 'Tu avais consulté la solution : l’exercice compte 0 %.' : (s.indices ? `Score : ${U.pct(sc)} % (avec ${U.pluriel(s.indices, 'indice')}).` : 'Sans indice, bravo.')}`);
        solution.hidden = false;
        if (type.corriger) type.corriger(ex, ui);
      } else if (res.ok === null) {
        S.majExo(ex.id, { tentatives, reponse: rep, nonReconnue: true });
        dire('f-info', U.esc(res.msg));
      } else {
        S.majExo(ex.id, { etat: s.etat === 'vu' ? 'vu' : 'ko', tentatives, reponse: rep });
        let html = '<strong>Pas encore.</strong> ' + U.esc(res.msg || '');
        const n = s.indices || 0;
        if (tentatives >= 2 && n < nbIndices) html += ` <span class="coup-de-pouce">Besoin d’un coup de pouce ? Essaie l’indice ${n + 1}.</span>`;
        dire('f-ko', html);
      }
      majBadge(); majBoutons();
    });

    btnIndice.addEventListener('click', () => {
      const s = S.exo(ex.id) || {};
      const n = Math.min(nbIndices, (s.indices || 0) + 1);
      S.majExo(ex.id, { indices: n, reponse: type.lire(ui) });
      afficherIndice(n);
      indicesBox.lastElementChild && indicesBox.lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      majBoutons();
    });

    let confirmer = null;
    btnSolution.addEventListener('click', () => {
      const s = S.exo(ex.id) || {};
      if (!ouvert && !HLW.estReussi(s) && !confirmer) {
        btnSolution.textContent = 'Confirmer : l’exercice comptera 0 %';
        btnSolution.classList.add('danger');
        confirmer = setTimeout(() => { confirmer = null; btnSolution.classList.remove('danger'); majBoutons(); }, 5000);
        return;
      }
      clearTimeout(confirmer); confirmer = null; btnSolution.classList.remove('danger');
      const patch = { solution: true, reponse: type.lire(ui) };
      if (!ouvert && !HLW.estReussi(s)) patch.etat = 'vu';
      S.majExo(ex.id, patch);
      solution.hidden = false;
      if (type.corriger) type.corriger(ex, ui);
      if (ouvert) dire('f-info', 'Compare honnêtement ta réponse avec le modèle, puis évalue-toi.');
      solution.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      majBadge(); majBoutons();
    });

    btnEquivalent.addEventListener('click', () => {
      S.majExo(ex.id, { etat: 'auto' });
      dire('f-ok', '<strong>Noté comme réussi.</strong> Garde en tête la forme de la solution, elle te servira.');
      majBadge(); majBoutons();
    });
    btnSavais.addEventListener('click', () => {
      S.majExo(ex.id, { etat: 'auto', reponse: type.lire(ui) });
      dire('f-ok', '<strong>Noté comme réussi.</strong>');
      majBadge(); majBoutons();
    });
    btnRevoir.addEventListener('click', () => {
      S.majExo(ex.id, { etat: 'ko', reponse: type.lire(ui) });
      dire('f-ko', 'Noté « à revoir ». Il apparaîtra dans tes révisions.');
      majBadge(); majBoutons();
    });
    btnRecommencer.addEventListener('click', () => {
      S.effacerExo(ex.id);
      const neuf = HLW.exercice(ex, opts);
      node.replaceWith(neuf.node);
    });

    actions.append(btnVerifier, btnIndice, btnSolution, btnEquivalent, btnSavais, btnRevoir, btnRecommencer);

    // Restauration de l'état
    if (st) {
      for (let k = 1; k <= (st.indices || 0); k++) afficherIndice(k);
      derniereNonReconnue = !!st.nonReconnue && !HLW.estReussi(st);
      if (st.solution || HLW.estReussi(st)) {
        solution.hidden = false;
        if (type.corriger && (HLW.estReussi(st) || st.etat === 'vu')) type.corriger(ex, ui);
      }
      if (HLW.estReussi(st)) dire('f-ok', `<strong>Réussi.</strong> Score : ${U.pct(HLW.scoreExo(st))} %.`);
      else if (st.etat === 'vu') dire('f-info', 'Solution consultée. Tu peux recommencer l’exercice plus tard pour le valider.');
      else if (st.etat === 'ko') dire('f-ko', 'À revoir. Reprends-le quand tu veux.');
    }
    majBadge();
    majBoutons();

    return { node };
  };
})();
