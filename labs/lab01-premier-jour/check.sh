#!/usr/bin/env bash
# Lab 01 : correction automatique.
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root

B=/srv/brasserie
P="$B/partage"
RECETTES=(ipa-noyau stout-du-tunnel blanche-de-lyon saison-pipe ambree-kernel .grand-cru)
COMPTA=(bilan-2025 tva-t3-2026 salaires-2026-10)
BOUTIQUE=(catalogue commandes-octobre)
COMMUN=(planning-brassage regles-du-bar)

if [[ ! -f "${ETAT_DIR}/lab01.demarre" ]]; then
  alerte "le lab n’a pas été démarré sur cette machine : lance d’abord « lab start 01 »"
fi

# 1 ---------------------------------------------------------------------------
objectif "Les quatre répertoires d’équipe existent dans ${P}"
for d in brassage compta boutique commun; do
  exiger "${P}/${d} n’existe pas (ou n’est pas un répertoire)" test -d "${P}/${d}"
done
fin_objectif

# 2 ---------------------------------------------------------------------------
objectif "Groupes et droits des répertoires (équipe seule, héritage du groupe)"
verifier_rep() { # rep groupe mode
  exiger "${P}/$1 doit appartenir au groupe $2 (actuel : $(stat -c %G "${P}/$1" 2>/dev/null || echo '?'))" groupe_est "${P}/$1" "$2"
  exiger "${P}/$1 doit être en mode $3 (actuel : $(stat -c %a "${P}/$1" 2>/dev/null || echo '?'))" mode_est "${P}/$1" "$3"
}
verifier_rep brassage brasseurs 2770
verifier_rep compta compta 2770
verifier_rep boutique boutique 2770
verifier_rep commun personnel 3770
fin_objectif

# 3 ---------------------------------------------------------------------------
objectif "Les six recettes (oui, six) sont rangées dans brassage, réservées aux brasseurs"
for r in "${RECETTES[@]}"; do
  exiger "${r}.recette absente de ${P}/brassage" test -f "${P}/brassage/${r}.recette"
done
exiger "il reste des recettes dans ${B}/vrac (les fichiers cachés comptent aussi)" \
  bash -c "[[ -z \"\$(find '${B}/vrac' -name '*.recette' -print -quit 2>/dev/null)\" ]]"
exiger "certaines recettes n’appartiennent pas au groupe brasseurs (mv conserve le groupe d’origine)" fichiers_du_groupe "${P}/brassage" brasseurs
exiger "le groupe brasseurs doit pouvoir lire ET modifier chaque recette" groupe_peut_modifier "${P}/brassage"
exiger "des éléments de brassage donnent encore des droits aux « autres » (les 777 de Bastien…)" rien_pour_les_autres "${P}/brassage"
fin_objectif

# 4 ---------------------------------------------------------------------------
objectif "Compta, boutique et commun rangés, avec les bons groupes et sans droits pour les autres"
for f in "${COMPTA[@]}";   do exiger "${f}.ods absent de compta"     test -f "${P}/compta/${f}.ods"; done
for f in "${BOUTIQUE[@]}"; do exiger "${f}.csv absent de boutique"   test -f "${P}/boutique/${f}.csv"; done
for f in "${COMMUN[@]}";   do exiger "${f}.txt absent de commun"     test -f "${P}/commun/${f}.txt"; done
exiger "fichiers de compta : groupe compta attendu"         fichiers_du_groupe "${P}/compta" compta
exiger "fichiers de boutique : groupe boutique attendu"     fichiers_du_groupe "${P}/boutique" boutique
exiger "fichiers de commun : groupe personnel attendu"      fichiers_du_groupe "${P}/commun" personnel
for d in compta boutique commun; do
  exiger "${d} : le groupe doit pouvoir lire et modifier chaque fichier" groupe_peut_modifier "${P}/${d}"
  if [[ "$d" == compta ]]; then precision=" (les salaires sont lisibles par tous !)"; else precision=""; fi
  exiger "${d} : des fichiers donnent encore des droits aux autres${precision}" rien_pour_les_autres "${P}/${d}"
done
fin_objectif

# 5 ---------------------------------------------------------------------------
objectif "Le bilan égaré de Chloé est retrouvé et rangé dans compta"
exiger "bilan-2025-final-VRAIMENT.ods absent de ${P}/compta" test -f "${P}/compta/bilan-2025-final-VRAIMENT.ods"
exiger "le fichier égaré est encore à son ancien emplacement : il fallait le déplacer, pas le copier" \
  bash -c '[[ ! -e /var/tmp/.cache-chloe/bilan-2025-final-VRAIMENT.ods ]]'
exiger "le bilan doit appartenir au groupe compta" groupe_est "${P}/compta/bilan-2025-final-VRAIMENT.ods" compta
fin_objectif

# 6 ---------------------------------------------------------------------------
objectif "Les documents de 2023 sont archivés dans ${B}/archives/vrac-2023.tar.gz"
ARCH="${B}/archives/vrac-2023.tar.gz"
exiger "${ARCH} n’existe pas" test -f "$ARCH"
exiger "${ARCH} n’est pas une archive tar compressée avec gzip valide" bash -c "tar tzf '$ARCH' >/dev/null"
compte_notes() { [[ "$(tar tzf "$ARCH" 2>/dev/null | grep -cE '^(\./)?archives-2023/note-[0-9]{2}\.txt$')" -eq 12 ]]; }
exiger "l’archive doit contenir les 12 notes, sous le chemin archives-2023/ (vérifie avec tar tzvf ; pense à l’option -C ou à te placer dans vrac)" compte_notes
exiger "le répertoire d’origine ${B}/vrac/archives-2023 existe encore" bash -c "[[ ! -e '${B}/vrac/archives-2023' ]]"
fin_objectif

# 7 ---------------------------------------------------------------------------
objectif "Le thermostat oublié ne tourne plus"
exiger "le processus thermostat-cuve est toujours en cours (ps aux | grep thermostat)" processus_absent "thermostat-cuve"
fin_objectif

# 8 ---------------------------------------------------------------------------
objectif "Lien « recette-du-moment » créé, lien cassé et dossier vrac supprimés"
LIEN="${B}/recette-du-moment"
exiger "${LIEN} n’est pas un lien symbolique" test -L "$LIEN"
exiger "${LIEN} doit pointer vers ${P}/brassage/ipa-noyau.recette" \
  bash -c "[[ \"\$(readlink -f '$LIEN')\" == '${P}/brassage/ipa-noyau.recette' ]]"
exiger "le dossier ${B}/vrac existe encore (une fois vide, supprime-le)" bash -c "[[ ! -e '${B}/vrac' ]]"
fin_objectif

# 9 ---------------------------------------------------------------------------
objectif "Malik peut redémarrer le service boutique avec sudo, et rien d’autre"
DROITS_MALIK="$(sudo -l -U malik 2>/dev/null || true)"
exiger "la configuration sudo est invalide (visudo -c)" visudo -c
exiger "sudo -l -U malik ne montre pas « systemctl restart boutique » (avec le chemin complet de systemctl)" \
  grep -Eq '/(usr/)?bin/systemctl restart boutique' <<<"$DROITS_MALIK"
refuser "malik a des droits trop larges (ALL) : le moindre privilège avant tout" \
  grep -Eq '\) *(NOPASSWD: *)?ALL *$' <<<"$DROITS_MALIK"
for f in /etc/sudoers.d/*; do
  if [[ -f "$f" ]] && grep -qw malik "$f"; then
    exiger "$(basename "$f") : mode 440 attendu (visudo le fait pour toi)" mode_est "$f" 440
  fi
done
fin_objectif

# 10 --------------------------------------------------------------------------
objectif "Le script de sauvegarde est réparé et a été lancé au moins une fois"
S=/usr/local/bin/sauvegarde-recettes
exiger "${S} introuvable" test -f "$S"
exiger "${S} doit être exécutable par tout le monde (Permission denied…)" \
  bash -c "[[ \$(( 0\$(stat -c %a '$S') & 0111 )) -eq \$(( 0111 )) ]]"
exiger "${S} doit rester la propriété de root et non modifiable par les autres" \
  bash -c "[[ \"\$(stat -c %U '$S')\" == root && -z \"\$(find '$S' -perm /go=w)\" ]]"
exiger "${S} --verifier échoue (le répertoire brassage existe-t-il ?)" "$S" --verifier
derniere_sauvegarde_ok() {
  local a
  a="$(find "${B}/archives" -maxdepth 1 -name 'recettes-*.tar.gz' -print 2>/dev/null | sort | tail -1)"
  [[ -n "$a" ]] && tar tzf "$a" 2>/dev/null | grep -q 'brassage/ipa-noyau.recette'
}
exiger "aucune archive recettes-AAAA-MM-JJ.tar.gz valide dans ${B}/archives : lance le script (avec sudo)" derniere_sauvegarde_ok
fin_objectif

bilan 01
