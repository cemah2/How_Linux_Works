/*
 * app.js : chargement des données, routeur (#/...), navigation et vues.
 */
(function () {
  'use strict';
  const HLW = window.HLW;
  const U = HLW.util;
  const S = HLW.store;
  const el = U.el;

  const $main = () => document.getElementById('contenu');
  const $nav = () => document.getElementById('nav');

  /* ------------------------------------------------------------------ */
  /* Chargement des fichiers de données listés dans le catalogue         */
  /* ------------------------------------------------------------------ */
  function chargerScript(src) {
    return new Promise((ok) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => ok(true);
      s.onerror = () => { console.error('Impossible de charger', src); ok(false); };
      document.head.appendChild(s);
    });
  }

  async function demarrer() {
    appliquerTheme();
    const cat = HLW.data.catalogue;
    if (!cat) { $main().textContent = 'Catalogue introuvable (data/catalogue.js).'; return; }
    for (const f of cat.fichiers || []) await chargerScript('data/' + f);
    installerBarre();
    window.addEventListener('hashchange', router);
    document.addEventListener('hlw:progression', () => { construireNav(); });
    router();
  }

  /* ------------------------------------------------------------------ */
  /* Thème                                                               */
  /* ------------------------------------------------------------------ */
  function appliquerTheme() {
    const t = S.pref('theme', 'auto');
    const sombre = t === 'sombre' || (t === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = sombre ? 'sombre' : 'clair';
  }

  function installerBarre() {
    const themeBtn = document.querySelector('.theme-btn');
    themeBtn.addEventListener('click', () => {
      const actuel = document.documentElement.dataset.theme;
      S.setPref('theme', actuel === 'sombre' ? 'clair' : 'sombre');
      appliquerTheme();
    });
    const menuBtn = document.querySelector('.menu-btn');
    menuBtn.addEventListener('click', () => {
      const ouvert = document.body.classList.toggle('nav-ouverte');
      menuBtn.setAttribute('aria-expanded', String(ouvert));
    });
    const form = document.querySelector('.recherche');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = form.querySelector('input').value.trim();
      if (q) location.hash = '#/recherche/' + encodeURIComponent(q);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Aides                                                               */
  /* ------------------------------------------------------------------ */
  const cat = () => HLW.data.catalogue;
  const infoChap = (id) => cat().chapitres.find((c) => c.id === id);
  const bloc = (id) => cat().blocs.find((b) => b.id === id);
  const chap = (id) => HLW.data.chapitres[id];
  const titreChap = (c) => (c.num !== undefined && c.num !== null ? `Chapitre ${c.num}` : `Module ${c.id}`);

  function barre(p, libelle) {
    return el('span', { class: 'jauge', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(U.pct(p)), 'aria-label': libelle || 'Avancement' },
      [el('i', { style: `width:${U.pct(p)}%` })]);
  }

  function rendre(...noeuds) {
    const m = $main();
    m.innerHTML = '';
    for (const n of noeuds) if (n) m.appendChild(n);
    ajouterBoutonsCopier(m);
  }

  function ajouterBoutonsCopier(racine) {
    racine.querySelectorAll('.prose pre').forEach((pre) => {
      if (pre.closest('.solution') || pre.closest('.enonce') || pre.querySelector('.copier')) return;
      const b = el('button', { type: 'button', class: 'copier', text: 'Copier' });
      b.addEventListener('click', () => {
        const txt = pre.querySelector('code') ? pre.querySelector('code').innerText : pre.innerText;
        const nettoye = txt.split('\n').map((l) => l.replace(/^\$ /, '')).join('\n');
        (navigator.clipboard ? navigator.clipboard.writeText(nettoye) : Promise.reject()).then(
          () => { b.textContent = 'Copié'; setTimeout(() => (b.textContent = 'Copier'), 1500); },
          () => { b.textContent = 'Sélectionne le texte'; });
      });
      pre.appendChild(b);
    });
  }

  function cartesDuesChapitre(ch) { return HLW.cartes.dues(HLW.cartes.duChapitre(ch)); }
  function toutesCartesDues() { return HLW.cartes.dues(HLW.cartes.toutes()); }

  /* ------------------------------------------------------------------ */
  /* Navigation latérale                                                 */
  /* ------------------------------------------------------------------ */
  let routeCourante = [];

  function construireNav() {
    const nav = $nav();
    nav.innerHTML = '';
    const lien = (href, texte, extra) => {
      const a = el('a', { href, class: 'nav-lien' }, [el('span', { text: texte }), extra || null]);
      if (location.hash === href || (href === '#/' && (location.hash === '' || location.hash === '#'))) a.setAttribute('aria-current', 'page');
      return a;
    };
    nav.appendChild(lien('#/', 'Accueil'));

    const parcours = el('div', { class: 'nav-groupe' }, [el('h2', { class: 'nav-titre', text: 'Parcours' })]);
    for (const b of cat().blocs) {
      const g = el('div', { class: 'nav-bloc b-' + b.couleur }, [el('h3', { text: b.nom })]);
      const ul = el('ul');
      for (const id of b.chapitres) {
        const info = infoChap(id);
        const ch = chap(id);
        const dispo = !!ch;
        const st = dispo ? HLW.stats(HLW.exosDuChapitre(ch)) : null;
        const li = el('li', { class: dispo ? '' : 'a-venir' });
        const etiquette = el('span', { class: 'nav-num', text: info.num !== undefined && info.num !== null ? String(info.num) : info.id });
        if (dispo) {
          const a = el('a', { href: '#/chapitre/' + id, class: 'nav-chap' }, [etiquette, el('span', { class: 'nav-chap-titre', text: info.titre }), st.total ? el('span', { class: 'nav-pct', text: U.pct(st.avancement) + ' %' }) : null]);
          if (routeCourante[0] === 'chapitre' && routeCourante[1] === id) {
            a.setAttribute('aria-current', routeCourante[2] ? 'true' : 'page');
            li.appendChild(a);
            const sous = el('ul', { class: 'nav-fiches' });
            for (const f of ch.fiches || []) {
              const fs = HLW.stats(f.exercices || []);
              const af = el('a', { href: `#/chapitre/${id}/fiche/${f.id}`, class: 'nav-fiche' + (fs.total && fs.faits === fs.total ? ' complete' : '') }, [
                el('span', { class: 'nav-fiche-id', text: f.id }), el('span', { text: f.titre }),
              ]);
              if (routeCourante[2] === 'fiche' && routeCourante[3] === f.id) af.setAttribute('aria-current', 'page');
              sous.appendChild(el('li', null, af));
            }
            li.appendChild(sous);
          } else li.appendChild(a);
        } else {
          li.appendChild(el('span', { class: 'nav-chap', title: 'En préparation' }, [etiquette, el('span', { class: 'nav-chap-titre', text: info.titre })]));
        }
        ul.appendChild(li);
      }
      g.appendChild(ul);
      parcours.appendChild(g);
    }
    nav.appendChild(parcours);

    const outils = el('div', { class: 'nav-groupe' }, [el('h2', { class: 'nav-titre', text: 'S’entraîner' })]);
    const dues = toutesCartesDues().length;
    outils.appendChild(lien('#/revisions', 'Révisions', dues ? el('span', { class: 'pastille', text: String(dues), title: dues + ' cartes à réviser' }) : null));
    outils.appendChild(lien('#/examens', 'Examens blancs'));
    outils.appendChild(lien('#/labs', 'Labs'));
    outils.appendChild(lien('#/fil-rouge', 'Fil rouge : la Brasserie du Noyau'));
    nav.appendChild(outils);

    const ref = el('div', { class: 'nav-groupe' }, [el('h2', { class: 'nav-titre', text: 'Référence' })]);
    ref.appendChild(lien('#/glossaire', 'Glossaire'));
    ref.appendChild(lien('#/certifs', 'Certifications'));
    ref.appendChild(lien('#/progression', 'Ma progression'));
    ref.appendChild(lien('#/aide', 'Mode d’emploi'));
    nav.appendChild(ref);
  }

  /* ------------------------------------------------------------------ */
  /* Routeur                                                             */
  /* ------------------------------------------------------------------ */
  function router() {
    const h = decodeURIComponent((location.hash || '#/').replace(/^#\/?/, ''));
    const p = h.split('/').filter(Boolean);
    routeCourante = p;
    document.body.classList.remove('nav-ouverte');
    document.querySelector('.menu-btn').setAttribute('aria-expanded', 'false');
    construireNav();
    try {
      switch (p[0]) {
        case undefined: vueAccueil(); break;
        case 'chapitre':
          if (p[2] === 'fiche') vueFiche(p[1], p[3], p[4] === 'exo' ? p[5] : null);
          else vueChapitre(p[1]);
          break;
        case 'memo': vueMemo(p[1]); break;
        case 'cartes': vueCartes(p[1] || 'toutes'); break;
        case 'revisions': vueRevisions(); break;
        case 'examens': vueExamens(); break;
        case 'examen': vueExamen(p[1]); break;
        case 'labs': vueLabs(); break;
        case 'fil-rouge': vueFilRouge(); break;
        case 'glossaire': vueGlossaire(p[1] || ''); break;
        case 'certifs': vueCertifs(); break;
        case 'progression': vueProgression(); break;
        case 'recherche': vueRecherche(p.slice(1).join('/')); break;
        case 'aide': vueAide(); break;
        default: vueIntrouvable();
      }
    } catch (e) {
      console.error(e);
      rendre(el('div', { class: 'page' }, [el('h1', { text: 'Erreur d’affichage' }), el('p', { text: String(e.message || e) })]));
    }
    const titre = $main().querySelector('h1');
    document.title = (titre ? titre.textContent + ' · ' : '') + 'How Linux Works : cahier pratique';
    if (!(p[4] === 'exo')) window.scrollTo(0, 0);
    $main().focus({ preventScroll: true });
  }

  function vueIntrouvable() {
    rendre(el('div', { class: 'page' }, [el('h1', { text: 'Page introuvable' }), el('p', null, ['Cette adresse ne correspond à aucune page. ', el('a', { href: '#/', text: 'Revenir à l’accueil' }), '.'])]));
  }

  /* ------------------------------------------------------------------ */
  /* Accueil : le parcours présenté comme la pile du système             */
  /* ------------------------------------------------------------------ */
  function vueAccueil() {
    const c = cat();
    const tousExos = Object.values(HLW.data.chapitres).flatMap(HLW.exosDuChapitre);
    const st = HLW.stats(tousExos);
    const der = S.etat().derniere;

    const tete = el('section', { class: 'accueil-tete' }, [
      el('h1', { text: 'Comprendre Linux, couche par couche' }),
      el('p', { class: 'chapeau', html: U.mdInline(c.accroche) }),
      el('div', { class: 'cta' }, [
        der ? el('a', { class: 'btn primaire', href: der.hash, text: 'Reprendre : ' + der.titre }) : el('a', { class: 'btn primaire', href: '#/chapitre/00', text: 'Commencer par la mise en place' }),
        el('a', { class: 'btn', href: '#/aide', text: 'Comment ça marche' }),
      ]),
    ]);

    const pile = el('section', { class: 'pile', 'aria-labelledby': 'pile-titre' }, [
      el('h2', { id: 'pile-titre', class: 'pile-titre', text: 'Ton parcours, du socle vers les applications' }),
    ]);
    const couches = el('ol', { class: 'couches', reversed: true });
    c.blocs.forEach((b, i) => {
      const lignes = el('ul', { class: 'couche-chapitres' });
      for (const id of b.chapitres) {
        const info = infoChap(id);
        const ch = chap(id);
        const s = ch ? HLW.stats(HLW.exosDuChapitre(ch)) : null;
        const contenu = [
          el('span', { class: 'cc-num', text: info.num !== undefined && info.num !== null ? String(info.num) : info.id }),
          el('span', { class: 'cc-titre' }, [el('span', { text: info.titre }), info.titreEn ? el('span', { class: 'cc-en', lang: 'en', text: info.titreEn }) : null]),
          ch ? el('span', { class: 'cc-etat' }, [barre(s.avancement, 'Avancement du chapitre ' + info.titre), el('span', { class: 'cc-pct', text: `${s.faits}/${s.total}` })])
            : el('span', { class: 'cc-etat cc-avenir', text: 'en préparation' }),
        ];
        lignes.appendChild(el('li', null, ch ? el('a', { href: '#/chapitre/' + id, class: 'cc' }, contenu) : el('span', { class: 'cc inactif' }, contenu)));
      }
      couches.appendChild(el('li', { class: 'couche b-' + b.couleur, style: `--rang:${i}` }, [
        el('div', { class: 'couche-tete' }, [el('h3', { text: b.nom }), el('p', { text: b.desc })]),
        lignes,
      ]));
    });
    pile.appendChild(couches);

    const dues = toutesCartesDues().length;
    const resume = el('section', { class: 'resume', 'aria-label': 'Ton avancement' }, [
      el('div', { class: 'resume-item' }, [el('strong', { text: `${st.reussis}` }), el('span', { text: `exercices réussis sur ${st.total}` })]),
      el('div', { class: 'resume-item' }, [el('strong', { text: `${U.pct(st.score)} %` }), el('span', { text: 'score moyen (indices déduits)' })]),
      el('a', { class: 'resume-item', href: '#/revisions' }, [el('strong', { text: String(dues) }), el('span', { text: 'cartes à réviser aujourd’hui' })]),
      el('a', { class: 'resume-item', href: '#/labs' }, [el('strong', { text: String(c.labs.filter((l) => l.statut === 'disponible').length) }), el('span', { text: 'labs prêts sur Proxmox' })]),
    ]);

    rendre(el('div', { class: 'page accueil' }, [tete, resume, pile]));
  }

  /* ------------------------------------------------------------------ */
  /* Chapitre                                                            */
  /* ------------------------------------------------------------------ */
  function enteteChapitre(info, ch) {
    const b = bloc(info.bloc);
    return el('header', { class: 'chap-tete b-' + b.couleur }, [
      el('p', { class: 'chap-sur' }, [el('a', { href: '#/', text: b.nom }), ` · ${titreChap(info)}`]),
      el('h1', { text: info.titre }),
      info.titreEn ? el('p', { class: 'chap-en', lang: 'en', text: `${info.titreEn}${info.pages ? ` — livre p. ${info.pages}` : ''}` }) : (info.auDela ? el('p', { class: 'chap-en', text: 'Module hors livre' }) : null),
    ]);
  }

  function vueChapitre(id) {
    const info = infoChap(id);
    const ch = chap(id);
    if (!info) return vueIntrouvable();
    if (!ch) {
      rendre(el('div', { class: 'page' }, [enteteChapitre(info, null), el('p', { class: 'vide', text: 'Ce chapitre est en préparation. Les fiches arrivent dans une prochaine livraison : consulte la feuille de route du dépôt.' })]));
      return;
    }
    const exos = HLW.exosDuChapitre(ch);
    const st = HLW.stats(exos);
    const dues = cartesDuesChapitre(ch).length;

    const fiches = el('ol', { class: 'liste-fiches' });
    for (const f of ch.fiches) {
      const fs = HLW.stats(f.exercices || []);
      fiches.appendChild(el('li', { class: 'lf' + (f.auDela ? ' au-dela' : '') }, el('a', { href: `#/chapitre/${id}/fiche/${f.id}` }, [
        el('span', { class: 'lf-id', text: f.id }),
        el('span', { class: 'lf-corps' }, [
          el('span', { class: 'lf-titre', text: f.titre }),
          el('span', { class: 'lf-meta', text: [f.auDela ? 'Au-delà du livre' : (f.sections ? `${f.sections}` : null), f.pages ? `p. ${f.pages}` : null, U.pluriel((f.exercices || []).length, 'exercice')].filter(Boolean).join(' · ') }),
        ]),
        el('span', { class: 'lf-etat' }, [barre(fs.avancement), el('span', { class: 'lf-pct', text: `${fs.faits}/${fs.total}` })]),
      ])));
    }

    const cert = ch.certifs ? el('section', { class: 'encart' }, [
      el('h2', { text: 'Pour les certifications' }),
      el('dl', { class: 'certs' }, Object.entries(ch.certifs).flatMap(([k, liste]) => {
        const c = cat().certifs[k];
        if (!c || !liste.length) return [];
        return [el('dt', { text: c.nom }), el('dd', { text: liste.map((o) => (c.objectifs[o] ? `${o} ${c.objectifs[o]}` : o)).join(' ; ') })];
      })),
    ]) : null;

    const labs = (cat().labs || []).filter((l) => l.chapitres.includes(id));

    rendre(el('div', { class: 'page chapitre' }, [
      enteteChapitre(info, ch),
      el('div', { class: 'chap-intro prose', html: U.md(ch.intro) }),
      ch.objectifs ? el('section', { class: 'objectifs' }, [el('h2', { text: 'À la fin de ce chapitre, tu sauras' }), el('ul', null, ch.objectifs.map((o) => el('li', { html: U.mdInline(o) })))]) : null,
      el('div', { class: 'chap-actions' }, [
        el('span', { class: 'chap-avancement' }, [barre(st.avancement), ` ${st.faits}/${st.total} exercices · score ${U.pct(st.score)} %`]),
        ch.memo ? el('a', { class: 'btn', href: '#/memo/' + id, text: 'Mémo du chapitre' }) : null,
        (ch.flashcards || []).length ? el('a', { class: 'btn', href: '#/cartes/' + id, text: dues ? `Réviser ${U.pluriel(dues, 'carte')}` : 'Cartes de révision' }) : null,
      ]),
      el('h2', { text: 'Fiches' }),
      fiches,
      labs.length ? el('section', { class: 'encart' }, [el('h2', { text: 'Labs associés' }), el('ul', null, labs.map((l) => el('li', null, [el('a', { href: '#/labs', text: `${l.id.replace('lab', 'Lab ')} : ${l.titre}` }), l.statut !== 'disponible' ? ' (en préparation)' : '']))) ]) : null,
      cert,
    ]));
  }

  /* ------------------------------------------------------------------ */
  /* Fiche                                                               */
  /* ------------------------------------------------------------------ */
  function vueFiche(id, ficheId, exoId) {
    const info = infoChap(id);
    const ch = chap(id);
    if (!ch) return vueIntrouvable();
    const idx = ch.fiches.findIndex((f) => f.id === ficheId);
    if (idx < 0) return vueIntrouvable();
    const f = ch.fiches[idx];
    S.setDerniere({ hash: location.hash.replace(/\/exo\/.*$/, ''), titre: `fiche ${f.id} ${f.titre}` });

    const st = HLW.stats(f.exercices || []);
    const meta = [];
    if (f.auDela) meta.push(el('span', { class: 'etiquette au-dela', text: 'Au-delà du livre' }));
    if (f.sections || f.pages) meta.push(el('span', { text: `Livre : ${[f.sections, f.pages ? 'p. ' + f.pages : null].filter(Boolean).join(', ')}` }));
    meta.push(el('span', { class: 'fiche-compteur', text: `${st.faits}/${st.total} exercices faits` }));

    const exosNodes = (f.exercices || []).map((e, i) => HLW.exercice(e, { numero: i + 1 }).node);
    const prec = ch.fiches[idx - 1];
    const suiv = ch.fiches[idx + 1];

    rendre(el('div', { class: 'page fiche b-' + bloc(info.bloc).couleur }, [
      el('nav', { class: 'fil', 'aria-label': 'Fil d’Ariane' }, [el('a', { href: '#/chapitre/' + id, text: `${titreChap(info)} : ${info.titre}` })]),
      el('h1', null, [el('span', { class: 'fiche-id', text: f.id }), ' ', f.titre]),
      el('p', { class: 'fiche-meta' }, meta),
      f.objectif ? el('p', { class: 'fiche-objectif', html: U.mdInline(f.objectif) }) : null,
      el('section', { class: 'rappel prose', 'aria-label': 'Rappel de cours', html: U.md(f.rappel) }),
      f.aRetenir && f.aRetenir.length ? el('aside', { class: 'a-retenir' }, [el('h2', { text: 'À retenir' }), el('ul', null, f.aRetenir.map((r) => el('li', { html: U.mdInline(r) })))]) : null,
      exosNodes.length ? el('h2', { class: 'titre-exos', text: 'Exercices' }) : null,
      el('div', { class: 'exos' }, exosNodes),
      el('nav', { class: 'fiche-nav', 'aria-label': 'Fiches voisines' }, [
        prec ? el('a', { class: 'btn', href: `#/chapitre/${id}/fiche/${prec.id}`, text: `Fiche précédente : ${prec.id}` }) : el('span'),
        suiv ? el('a', { class: 'btn primaire', href: `#/chapitre/${id}/fiche/${suiv.id}`, text: `Fiche suivante : ${suiv.id} ${suiv.titre}` })
          : el('a', { class: 'btn primaire', href: '#/chapitre/' + id, text: 'Retour au chapitre' }),
      ]),
    ]));
    if (exoId) {
      const cible = document.getElementById('exo-' + exoId);
      if (cible) { cible.scrollIntoView({ block: 'start' }); cible.classList.add('surligne'); }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Mémo                                                                */
  /* ------------------------------------------------------------------ */
  function vueMemo(id) {
    const info = infoChap(id);
    const ch = chap(id);
    if (!ch || !ch.memo) return vueIntrouvable();
    rendre(el('div', { class: 'page memo' }, [
      el('nav', { class: 'fil', 'aria-label': 'Fil d’Ariane' }, [el('a', { href: '#/chapitre/' + id, text: `${titreChap(info)} : ${info.titre}` })]),
      el('h1', { text: `Mémo : ${info.titre}` }),
      el('p', { class: 'no-print' }, el('button', { type: 'button', class: 'btn', text: 'Imprimer ou enregistrer en PDF', onclick: () => window.print() })),
      el('div', { class: 'prose', html: U.md(ch.memo) }),
    ]));
  }

  /* ------------------------------------------------------------------ */
  /* Cartes de révision (Leitner)                                        */
  /* ------------------------------------------------------------------ */
  function vueCartes(portee) {
    const liste = portee === 'toutes' ? HLW.cartes.toutes() : (chap(portee) ? HLW.cartes.duChapitre(chap(portee)) : []);
    const titre = portee === 'toutes' ? 'Cartes de révision : toutes' : `Cartes de révision : ${infoChap(portee) ? infoChap(portee).titre : portee}`;
    let file = U.melanger(HLW.cartes.dues(liste)).slice(0, 30);
    const total = file.length;
    let savait = 0, fait = 0;
    const zone = el('div', { class: 'carte-zone' });

    const suivant = () => {
      zone.innerHTML = '';
      if (!file.length) {
        zone.appendChild(el('div', { class: 'carte-fin' }, [
          el('h2', { text: total ? 'Session terminée' : 'Rien à réviser pour l’instant' }),
          el('p', { text: total ? `${savait} carte(s) sue(s) sur ${fait}. Les cartes ratées reviendront demain, les autres plus tard.` : 'Toutes les cartes sont planifiées pour plus tard. Reviens demain, ou fais avancer le parcours.' }),
          el('a', { class: 'btn primaire', href: '#/revisions', text: 'Retour aux révisions' }),
        ]));
        construireNav();
        return;
      }
      const c = file[0];
      const etat = HLW.cartes.etat(c.id);
      const verso = el('div', { class: 'carte-verso prose', hidden: true, html: U.md(c.r) });
      const btnRet = el('button', { type: 'button', class: 'btn primaire', text: 'Voir la réponse' });
      const btnNon = el('button', { type: 'button', class: 'btn', hidden: true, text: 'Je ne savais pas' });
      const btnOui = el('button', { type: 'button', class: 'btn primaire', hidden: true, text: 'Je savais' });
      const retourner = () => { verso.hidden = false; btnRet.hidden = true; btnNon.hidden = false; btnOui.hidden = false; btnOui.focus(); };
      const noter = (ok) => { HLW.cartes.noter(c.id, ok); fait++; if (ok) savait++; file.shift(); suivant(); };
      btnRet.onclick = retourner; btnNon.onclick = () => noter(false); btnOui.onclick = () => noter(true);
      zone.appendChild(el('div', { class: 'carte' }, [
        el('p', { class: 'carte-meta', text: `Carte ${fait + 1} sur ${total} · ${etat ? 'boîte ' + etat.boite : 'nouvelle'} · ${infoChap(c.chap) ? titreChap(infoChap(c.chap)) : ''}` }),
        el('div', { class: 'carte-recto prose', html: U.md(c.q) }),
        verso,
        el('div', { class: 'actions' }, [btnRet, btnNon, btnOui]),
        el('p', { class: 'raccourcis', text: 'Clavier : Espace pour retourner, 1 pour « je ne savais pas », 2 pour « je savais ».' }),
      ]));
      zone._clavier = (e) => {
        if (e.target.matches('input, textarea, select')) return;
        if (e.key === ' ' && !btnRet.hidden) { e.preventDefault(); retourner(); }
        else if (e.key === '1' && !btnNon.hidden) noter(false);
        else if (e.key === '2' && !btnOui.hidden) noter(true);
      };
      btnRet.focus();
    };
    const clavier = (e) => { if (!document.body.contains(zone)) { document.removeEventListener('keydown', clavier); return; } if (zone._clavier) zone._clavier(e); };
    document.addEventListener('keydown', clavier);

    rendre(el('div', { class: 'page cartes' }, [
      el('h1', { text: titre }),
      el('p', { class: 'intro', text: 'Réponds de tête, retourne la carte, puis sois honnête : une carte sue revient de plus en plus tard (1, 3, 7, 16, 35 jours), une carte ratée revient demain.' }),
      zone,
    ]));
    suivant();
  }

  function vueRevisions() {
    const chs = Object.values(HLW.data.chapitres).sort((a, b) => a.id.localeCompare(b.id));
    const lignesCartes = chs.filter((ch) => (ch.flashcards || []).length).map((ch) => {
      const d = cartesDuesChapitre(ch).length;
      return el('li', null, [el('a', { href: '#/cartes/' + ch.id, text: `${titreChap(infoChap(ch.id))} : ${infoChap(ch.id).titre}` }), ` — ${d} à réviser sur ${ch.flashcards.length}`]);
    });
    const aRevoir = [];
    for (const ch of chs) for (const f of ch.fiches || []) for (const e of f.exercices || []) {
      const st = S.exo(e.id);
      if (HLW.estARevoir(st)) aRevoir.push({ ch, f, e, st });
    }
    const dues = toutesCartesDues().length;
    rendre(el('div', { class: 'page' }, [
      el('h1', { text: 'Révisions' }),
      el('section', null, [
        el('h2', { text: 'Cartes du jour' }),
        dues ? el('p', null, el('a', { class: 'btn primaire', href: '#/cartes/toutes', text: `Réviser ${U.pluriel(dues, 'carte')} maintenant` })) : el('p', { class: 'vide', text: 'Aucune carte à réviser aujourd’hui.' }),
        el('ul', { class: 'liste-simple' }, lignesCartes),
      ]),
      el('section', null, [
        el('h2', { text: 'Exercices à reprendre' }),
        el('p', { class: 'intro', text: 'Les exercices ratés, ceux dont tu as consulté la solution, et ceux réussis avec au moins deux indices.' }),
        aRevoir.length ? el('ul', { class: 'liste-simple' }, aRevoir.map(({ ch, f, e, st }) => el('li', null, [
          el('a', { href: `#/chapitre/${ch.id}/fiche/${f.id}/exo/${e.id}`, text: `Fiche ${f.id} : ${f.titre}` }),
          ` — ${U.esc(U.dedent(e.enonce).split('\n')[0].replace(/[*`#>]/g, '').slice(0, 90))}… `,
          el('span', { class: 'etat-badge ' + (st.etat === 'ko' ? 'ko' : st.etat === 'vu' ? 'vu' : 'ok'), text: st.etat === 'ko' ? 'à revoir' : st.etat === 'vu' ? 'solution vue' : `${st.indices} indices` }),
        ]))) : el('p', { class: 'vide', text: 'Rien à reprendre pour le moment.' }),
      ]),
    ]));
  }

  /* ------------------------------------------------------------------ */
  /* Examens blancs                                                      */
  /* ------------------------------------------------------------------ */
  function vueExamens() {
    const hist = S.etat().examens || [];
    rendre(el('div', { class: 'page' }, [
      el('h1', { text: 'Examens blancs' }),
      el('p', { class: 'intro', text: 'Un tirage au hasard parmi les exercices corrigés automatiquement du bloc, sans indice et chronométré. Chaque passage est différent. Seuil de réussite : 70 %, comme pour la plupart des certifications.' }),
      el('ul', { class: 'liste-examens' }, cat().examens.map((x) => {
        const dispo = x.chapitres.every((c) => chap(c));
        const passages = hist.filter((h) => h.id === x.id);
        const meilleur = passages.reduce((m, h) => Math.max(m, h.score), 0);
        return el('li', { class: 'examen-item' + (dispo ? '' : ' inactif') }, [
          el('div', null, [el('h2', { text: x.titre }), el('p', { text: `${x.questions} questions · ${x.duree} min · chapitres ${x.chapitres.map((c) => +c || c).join(', ')}` }),
            passages.length ? el('p', { class: 'meta', text: `${U.pluriel(passages.length, 'passage')} · meilleur score ${U.pct(meilleur)} %` }) : null]),
          dispo ? el('a', { class: 'btn primaire', href: '#/examen/' + x.id, text: 'Commencer' }) : el('span', { class: 'meta', text: 'Disponible quand les chapitres seront prêts' }),
        ]);
      })),
    ]));
  }

  function vueExamen(id) {
    const x = cat().examens.find((e) => e.id === id);
    if (!x || !x.chapitres.every((c) => chap(c))) return vueIntrouvable();
    // Examen : uniquement des questions corrigées automatiquement et faisables sans VM
    const pool = x.chapitres.flatMap((c) => HLW.exosDuChapitre(chap(c)))
      .filter((e) => e.type !== 'terminal' && HLW.estAutoCorrigeable(e));
    const tirage = U.melanger(pool).slice(0, x.questions);
    const items = tirage.map((e, i) => HLW.exercice(e, { numero: i + 1, mode: 'examen' }));
    const debut = Date.now();
    const fin = debut + x.duree * 60000;
    const chrono = el('span', { class: 'chrono', 'aria-live': 'off' });
    let termine = false;
    const btnFin = el('button', { type: 'button', class: 'btn primaire', text: 'Terminer et corriger' });
    const resultat = el('div', { class: 'resultat-examen', role: 'status' });

    const terminer = () => {
      if (termine) return;
      termine = true;
      clearInterval(t);
      let bons = 0;
      for (const it of items) if (it.corrigerExamen()) bons++;
      const score = items.length ? bons / items.length : 0;
      const reussi = score * 100 >= x.seuil;
      S.ajouterExamen({ id: x.id, date: Date.now(), score, bons, total: items.length, duree: Math.round((Date.now() - debut) / 1000) });
      btnFin.hidden = true;
      const ecoule = Math.round((Date.now() - debut) / 1000);
      chrono.textContent = `Terminé en ${Math.floor(ecoule / 60)} min ${String(ecoule % 60).padStart(2, '0')} s`;
      chrono.classList.remove('urgent');
      resultat.className = 'resultat-examen ' + (reussi ? 'f-ok' : 'f-ko');
      resultat.innerHTML = `<h2>${reussi ? 'Examen réussi' : 'Examen non validé'} : ${U.pct(score)} %</h2><p>${bons} bonne(s) réponse(s) sur ${items.length}. Seuil : ${x.seuil} %. La correction détaillée est affichée sous chaque question.</p>`;
      resultat.scrollIntoView({ block: 'start', behavior: 'smooth' });
    };
    const tic = () => {
      const r = Math.max(0, fin - Date.now());
      const m = Math.floor(r / 60000), s = Math.floor((r % 60000) / 1000);
      chrono.textContent = `${m}:${String(s).padStart(2, '0')} restantes`;
      chrono.classList.toggle('urgent', r < 60000);
      if (r <= 0) terminer();
    };
    const t = setInterval(() => { if (!document.body.contains(chrono)) { clearInterval(t); return; } tic(); }, 1000);
    btnFin.onclick = terminer;
    rendre(el('div', { class: 'page examen' }, [
      el('div', { class: 'examen-barre' }, [el('h1', { text: x.titre }), chrono]),
      el('p', { class: 'intro', text: `${items.length} questions, pas d’indice. Tu peux répondre dans le désordre. La correction s’affiche à la fin.` }),
      resultat,
      el('div', { class: 'exos' }, items.map((i) => i.node)),
      el('div', { class: 'actions fin-examen' }, [btnFin, el('a', { class: 'btn discret', href: '#/examens', text: 'Abandonner' })]),
    ]));
    tic();
  }

  /* ------------------------------------------------------------------ */
  /* Labs, fil rouge                                                     */
  /* ------------------------------------------------------------------ */
  function vueLabs() {
    const c = cat();
    rendre(el('div', { class: 'page labs' }, [
      el('h1', { text: 'Labs' }),
      el('div', { class: 'prose', html: U.md(c.labsIntro) }),
      el('ol', { class: 'liste-labs' }, c.labs.map((l) => el('li', { class: 'lab' + (l.statut === 'disponible' ? '' : ' inactif') }, [
        el('div', { class: 'lab-tete' }, [
          el('h2', { text: `${l.id.replace('lab', 'Lab ')} : ${l.titre}` }),
          el('span', { class: 'etiquette', text: l.statut === 'disponible' ? 'Disponible' : 'En préparation' }),
        ]),
        el('p', { class: 'lab-meta', text: [`Chapitres ${l.chapitres.map((x) => +x || x).join(', ')}`, l.duree, l.vms ? `VM : ${l.vms.join(', ')}` : null].filter(Boolean).join(' · ') }),
        el('div', { class: 'prose', html: U.md(l.resume) }),
        l.statut === 'disponible' ? el('p', null, [el('a', { class: 'btn', href: `${c.depot}/tree/main/${l.chemin}`, target: '_blank', rel: 'noopener', text: 'Ouvrir l’énoncé sur GitHub' })]) : null,
      ]))),
    ]));
  }

  function vueFilRouge() {
    rendre(el('div', { class: 'page' }, [el('h1', { text: 'Fil rouge : la Brasserie du Noyau' }), el('div', { class: 'prose', html: U.md(cat().filRouge) })]));
  }

  /* ------------------------------------------------------------------ */
  /* Glossaire                                                           */
  /* ------------------------------------------------------------------ */
  function vueGlossaire(filtreInitial) {
    const termes = HLW.data.glossaire.slice().sort((a, b) => U.sansAccents(a.terme).localeCompare(U.sansAccents(b.terme), 'fr', { sensitivity: 'base' }));
    const champ = el('input', { type: 'search', class: 'saisie', placeholder: 'Filtrer (français ou anglais)…', 'aria-label': 'Filtrer le glossaire', value: filtreInitial });
    const liste = el('dl', { class: 'glossaire' });
    const compteur = el('p', { class: 'meta' });
    const afficher = () => {
      const q = U.norm.texte(champ.value);
      liste.innerHTML = '';
      let n = 0;
      for (const t of termes) {
        const cible = U.norm.texte(`${t.terme} ${t.en || ''} ${t.def}`);
        if (q && !cible.includes(q)) continue;
        n++;
        liste.appendChild(el('dt', null, [el('span', { text: t.terme }), t.en ? el('span', { class: 'gl-en', lang: 'en', text: t.en }) : null]));
        liste.appendChild(el('dd', null, [el('span', { html: U.mdInline(t.def) }), t.chap ? el('a', { class: 'gl-chap', href: '#/chapitre/' + t.chap, text: titreChap(infoChap(t.chap) || { id: t.chap }) }) : null]));
      }
      compteur.textContent = U.pluriel(n, 'terme');
    };
    champ.addEventListener('input', afficher);
    rendre(el('div', { class: 'page' }, [el('h1', { text: 'Glossaire français / anglais' }), el('p', { class: 'intro', text: 'Le livre, les pages de manuel et les messages d’erreur sont en anglais : ce glossaire fait le pont.' }), champ, compteur, liste]));
    afficher();
  }

  /* ------------------------------------------------------------------ */
  /* Certifications                                                      */
  /* ------------------------------------------------------------------ */
  function vueCertifs() {
    const c = cat();
    const chs = Object.values(HLW.data.chapitres);
    const sections = Object.entries(c.certifs).map(([k, cert]) => {
      const lignes = Object.entries(cert.objectifs).map(([code, lib]) => {
        const couverts = chs.filter((ch) => ch.certifs && (ch.certifs[k] || []).includes(code)).map((ch) => ch.id);
        const prevus = c.chapitres.filter((ci) => (ci.certifs || {})[k] && ci.certifs[k].includes(code)).map((ci) => ci.id);
        const tous = [...new Set([...couverts, ...prevus])].sort();
        return el('tr', null, [el('td', { class: 'mono', text: code }), el('td', { text: lib }),
          el('td', null, tous.length ? tous.map((id, i) => [i ? ', ' : '', chap(id) ? el('a', { href: '#/chapitre/' + id, text: +id || id }) : el('span', { class: 'meta', text: (+id || id) + ' (à venir)' })]).flat() : el('span', { class: 'meta', text: '—' }))]);
      });
      return el('section', { class: 'cert' }, [
        el('h2', { text: cert.nom }),
        el('p', { class: 'meta', html: U.mdInline(cert.info) }),
        el('div', { class: 'table-defil' }, el('table', null, [el('thead', null, el('tr', null, [el('th', { text: 'Objectif' }), el('th', { text: 'Intitulé' }), el('th', { text: 'Chapitres' })])), el('tbody', null, lignes)])),
      ]);
    });
    rendre(el('div', { class: 'page' }, [el('h1', { text: 'Correspondance avec les certifications' }), el('div', { class: 'prose', html: U.md(c.certifsIntro) }), ...sections]));
  }

  /* ------------------------------------------------------------------ */
  /* Progression : statistiques, export / import                         */
  /* ------------------------------------------------------------------ */
  function vueProgression() {
    const chs = Object.values(HLW.data.chapitres).sort((a, b) => a.id.localeCompare(b.id));
    const lignes = chs.map((ch) => {
      const s = HLW.stats(HLW.exosDuChapitre(ch));
      return el('tr', null, [el('td', null, el('a', { href: '#/chapitre/' + ch.id, text: `${titreChap(infoChap(ch.id))} : ${infoChap(ch.id).titre}` })), el('td', { text: `${s.faits}/${s.total}` }), el('td', { text: `${s.reussis}` }), el('td', { text: `${U.pct(s.score)} %` })]);
    });
    const hist = (S.etat().examens || []).slice().reverse();
    const fichier = el('input', { type: 'file', accept: 'application/json,.json', class: 'cache', id: 'import-fichier' });
    const msg = el('p', { class: 'feedback', role: 'status' });
    fichier.addEventListener('change', () => {
      const f = fichier.files[0];
      if (!f) return;
      f.text().then((t) => { S.importer(t); msg.className = 'feedback f-ok'; msg.textContent = 'Progression importée.'; construireNav(); })
        .catch((e) => { msg.className = 'feedback f-ko'; msg.textContent = 'Import impossible : ' + e.message; });
    });
    const btnExport = el('button', { type: 'button', class: 'btn primaire', text: 'Exporter ma progression' });
    btnExport.onclick = () => {
      const blob = new Blob([S.exporter()], { type: 'application/json' });
      const a = el('a', { href: URL.createObjectURL(blob), download: `progression-how-linux-works-${new Date().toISOString().slice(0, 10)}.json` });
      document.body.appendChild(a); a.click(); a.remove();
    };
    const btnReset = el('button', { type: 'button', class: 'btn discret', text: 'Tout effacer' });
    let arme = false;
    btnReset.onclick = () => {
      if (!arme) { arme = true; btnReset.textContent = 'Confirmer : effacer toute la progression'; btnReset.classList.add('danger'); setTimeout(() => { arme = false; btnReset.textContent = 'Tout effacer'; btnReset.classList.remove('danger'); }, 5000); return; }
      S.reinitialiser(); msg.className = 'feedback f-info'; msg.textContent = 'Progression effacée.'; vueProgression();
    };
    rendre(el('div', { class: 'page' }, [
      el('h1', { text: 'Ma progression' }),
      S.persistant() ? null : el('p', { class: 'feedback f-ko', text: 'Ton navigateur bloque le stockage local : la progression sera perdue à la fermeture de la page. Exporte-la régulièrement.' }),
      el('div', { class: 'table-defil' }, el('table', null, [el('thead', null, el('tr', null, [el('th', { text: 'Chapitre' }), el('th', { text: 'Faits' }), el('th', { text: 'Réussis' }), el('th', { text: 'Score' })])), el('tbody', null, lignes)])),
      el('h2', { text: 'Examens blancs passés' }),
      hist.length ? el('ul', { class: 'liste-simple' }, hist.map((h) => el('li', { text: `${U.dateCourte(h.date)} — ${(cat().examens.find((x) => x.id === h.id) || { titre: h.id }).titre} : ${U.pct(h.score)} % (${h.bons}/${h.total}) en ${Math.round(h.duree / 60)} min` }))) : el('p', { class: 'vide', text: 'Aucun examen passé pour l’instant.' }),
      el('h2', { text: 'Sauvegarder ou changer d’appareil' }),
      el('p', { text: 'La progression est enregistrée dans ce navigateur uniquement. Exporte-la en fichier pour la sauvegarder ou la reprendre sur un autre appareil.' }),
      el('div', { class: 'actions' }, [btnExport, el('label', { class: 'btn', for: 'import-fichier', text: 'Importer un fichier' }), fichier, btnReset]),
      msg,
    ]));
  }

  /* ------------------------------------------------------------------ */
  /* Recherche                                                           */
  /* ------------------------------------------------------------------ */
  function vueRecherche(q) {
    const nq = U.norm.texte(q);
    const res = { fiches: [], exos: [], glossaire: [] };
    if (nq.length >= 2) {
      for (const ch of Object.values(HLW.data.chapitres)) for (const f of ch.fiches || []) {
        if (U.norm.texte(`${f.titre} ${f.rappel} ${(f.aRetenir || []).join(' ')}`).includes(nq)) res.fiches.push({ ch, f });
        for (const e of f.exercices || []) if (U.norm.texte(`${e.enonce} ${e.solution || ''}`).includes(nq)) res.exos.push({ ch, f, e });
      }
      for (const t of HLW.data.glossaire) if (U.norm.texte(`${t.terme} ${t.en || ''} ${t.def}`).includes(nq)) res.glossaire.push(t);
    }
    document.querySelector('.recherche input').value = q;
    const total = res.fiches.length + res.exos.length + res.glossaire.length;
    rendre(el('div', { class: 'page' }, [
      el('h1', { text: `Recherche : « ${q} »` }),
      el('p', { class: 'meta', text: nq.length < 2 ? 'Tape au moins deux caractères.' : U.pluriel(total, 'résultat') }),
      res.glossaire.length ? el('section', null, [el('h2', { text: 'Glossaire' }), el('ul', { class: 'liste-simple' }, res.glossaire.map((t) => el('li', null, [el('strong', { text: t.terme }), t.en ? ` (${t.en}) ` : ' ', el('span', { html: U.mdInline(t.def) })])))]) : null,
      res.fiches.length ? el('section', null, [el('h2', { text: 'Fiches' }), el('ul', { class: 'liste-simple' }, res.fiches.map(({ ch, f }) => el('li', null, el('a', { href: `#/chapitre/${ch.id}/fiche/${f.id}`, text: `${f.id} ${f.titre}` }))))]) : null,
      res.exos.length ? el('section', null, [el('h2', { text: 'Exercices' }), el('ul', { class: 'liste-simple' }, res.exos.slice(0, 60).map(({ ch, f, e }) => el('li', null, [el('a', { href: `#/chapitre/${ch.id}/fiche/${f.id}/exo/${e.id}`, text: `Fiche ${f.id}` }), ' — ', U.dedent(e.enonce).split('\n')[0].replace(/[*`#>]/g, '').slice(0, 100)])))]) : null,
    ]));
  }

  /* ------------------------------------------------------------------ */
  /* Mode d'emploi                                                       */
  /* ------------------------------------------------------------------ */
  function vueAide() {
    rendre(el('div', { class: 'page' }, [el('h1', { text: 'Mode d’emploi' }), el('div', { class: 'prose', html: U.md(cat().aide) })]));
  }

  document.addEventListener('DOMContentLoaded', demarrer);
})();
