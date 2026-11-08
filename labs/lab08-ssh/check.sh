#!/usr/bin/env bash
# Lab 08 : correction automatique, selon le rôle de la machine (ne modifie rien).
# shellcheck source=../lib/commun.sh
source "$(dirname "$(readlink -f "$0")")/../lib/commun.sh"
exiger_root
ICI="$(dirname "$(readlink -f "$0")")"
# shellcheck source=../lab07-reseau/reseau.sh
source "$ICI/../lab07-reseau/reseau.sh"
ROLE="${LAB08_ROLE:-$ROLE}"

role_connu || { alerte "machine « ${ROLE} » : lance ce lab sur douane, cuve et comptoir"; exit 1; }
[[ -f "${ETAT_DIR}/lab08.debut" ]] || alerte "le lab n’a pas été démarré sur cette machine : lab start 08"
printf '%sRôle de cette machine : %s%s\n\n' "$C_GRAS" "$ROLE" "$C_RAZ"

sshd_val() { sshd -T 2>/dev/null | awk -v c="$1" 'tolower($1) == c {$1 = ""; sub(/^ /, ""); print}' | head -1; }
sshd_vaut() { [[ "$(sshd_val "$1")" == "$2" ]]; }
sshd_contient() { sshd -T 2>/dev/null | awk -v c="$1" 'tolower($1) == c' | grep -qw "$2"; }
max_essais_ok() { local v; v="$(sshd_val maxauthtries)"; [[ -n "$v" ]] && (( v <= 3 )); }
surcharge_presente() { grep -lqsiE '^[[:space:]]*(PasswordAuthentication|PermitRootLogin|AllowGroups)' /etc/ssh/sshd_config.d/*.conf; }
config_principale_intacte() { sha256sum --quiet -c "${ETAT_DIR}/lab08.sshd_config" >/dev/null 2>&1; }
membre() { id -nG "$1" 2>/dev/null | tr ' ' '\n' | grep -qx "$2"; }
cles_bastien_ok() {
  local h; h="$(getent passwd bastien | cut -d: -f6)"
  [[ -n "$h" ]] && grep -qs '^ssh-ed25519 ' "$h/.ssh/authorized_keys" \
    && [[ "$(stat -c %a "$h/.ssh")" == 700 ]] && [[ "$(stat -c %a "$h/.ssh/authorized_keys")" =~ ^6[04]0$ ]] \
    && [[ "$(stat -c %U "$h/.ssh/authorized_keys")" == bastien ]]
}
ecoute_ssh() { ss -tlnH 'sport = :22' 2>/dev/null | awk '{print $4}'; }
ssh_interne_seulement() {
  local a; a="$(ecoute_ssh)"
  [[ -n "$a" ]] && ! grep -qvE "^(${IP_CUVE_LAN//./\\.}|127\.0\.0\.1|\[::1\]):22$" <<<"$a"
}
port_debug_ouvert() { ss -tlnH 'sport = :31337' 2>/dev/null | grep -q .; }
f2b() { fail2ban-client get sshd "$1" 2>/dev/null | tr -d '\r'; }
f2b_vaut() { [[ "$(f2b "$1" | tail -1 | tr -d ' ')" == "$2" ]]; }
f2b_ignore_lan() { f2b ignoreip | grep -q "${LAN_RESEAU}.0/24"; }
capture_ok() { tcpdump -nr /root/capture-dns.pcap 2>/dev/null | grep -q "A? cuve.${DOMAINE}"; }
cle_comptoir() { local h; h="$(getent passwd bastien | cut -d: -f6)"; [[ -f "$h/.ssh/id_ed25519" && -f "$h/.ssh/id_ed25519.pub" ]]; }
config_client() { local h; h="$(getent passwd bastien | cut -d: -f6)"; grep -qsiE '^[[:space:]]*Host[[:space:]]+(.*[[:space:]])?cuve([[:space:]]|$)' "$h/.ssh/config"; }
cle_chiffree() { local h; h="$(getent passwd bastien | cut -d: -f6)"; ! ssh-keygen -y -P '' -f "$h/.ssh/id_ed25519" >/dev/null 2>&1; }
connexion_par_cle() {
  runuser -u bastien -- ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=5 cuve true >/dev/null 2>&1
}
inventaire_ok() { grep -qs "Nmap scan report for .*${IP_DOUANE_LAN//./\\.}" /root/inventaire.txt && grep -qs "Nmap scan report for .*${IP_CUVE_LAN//./\\.}" /root/inventaire.txt; }

case "$ROLE" in
cuve)
  objectif "sshd durci par une surcharge : pas de root, pas de mot de passe, 3 essais, groupe ssh-autorises"
  exiger "aucune surcharge dans /etc/ssh/sshd_config.d/ (on ne modifie pas le fichier principal)" surcharge_presente
  exiger "le fichier principal /etc/ssh/sshd_config a été modifié" config_principale_intacte
  exiger "PermitRootLogin vaut « $(sshd_val permitrootlogin) » (attendu : no)" sshd_vaut permitrootlogin no
  exiger "PasswordAuthentication vaut « $(sshd_val passwordauthentication) » (attendu : no)" sshd_vaut passwordauthentication no
  exiger "MaxAuthTries vaut « $(sshd_val maxauthtries) » (attendu : 3 au plus)" max_essais_ok
  exiger "AllowGroups ne contient pas ssh-autorises" sshd_contient allowgroups ssh-autorises
  fin_objectif

  objectif "Le groupe ssh-autorises contient admin et bastien ; la clé de Bastien est installée proprement"
  exiger "le groupe ssh-autorises n’existe pas" getent group ssh-autorises
  exiger "admin n’est pas dans ssh-autorises : tu t’enfermerais dehors !" membre "${LAB_UTILISATEUR:-admin}" ssh-autorises
  exiger "bastien n’est pas dans ssh-autorises" membre bastien ssh-autorises
  exiger "~bastien/.ssh/authorized_keys absent, sans clé ed25519, ou droits incorrects (700 et 600, propriétaire bastien)" cles_bastien_ok
  fin_objectif

  objectif "SSH n’est accessible que depuis le réseau interne (via douane)"
  exiger "sshd écoute sur : $(ecoute_ssh | tr '\n' ' ')— attendu : seulement ${IP_CUVE_LAN}:22 (ListenAddress)" ssh_interne_seulement
  exiger "sshd n’est pas actif" bash -c 'systemctl is-active --quiet ssh || systemctl is-active --quiet sshd'
  fin_objectif

  objectif "L’« outil de diagnostic » oublié par le prestataire ne tourne plus"
  refuser "quelque chose écoute encore sur le port 31337 (ss -tlnp)" port_debug_ouvert
  refuser "outil-debug.service est encore activé au démarrage" unite_activee outil-debug.service
  fin_objectif
  ;;
comptoir)
  objectif "Bastien se connecte à cuve depuis le comptoir avec une clé ed25519, en tapant seulement « ssh cuve »"
  exiger "bastien n’a pas de paire de clés ~/.ssh/id_ed25519 sur le comptoir" cle_comptoir
  exiger "~bastien/.ssh/config n’a pas d’entrée « Host cuve »" config_client
  if cle_chiffree; then
    printf '       %s(clé protégée par une phrase de passe : la connexion ne peut pas être testée automatiquement ;%s\n' "$C_GRAS" "$C_RAZ"
    printf '       %s vérifie à la main : sudo -iu bastien ssh cuve)%s\n' "$C_GRAS" "$C_RAZ"
  else
    exiger "« ssh cuve » échoue pour bastien sans mot de passe (clé non installée sur cuve ? groupe ? droits ?)" connexion_par_cle
  fi
  fin_objectif

  objectif "L’inventaire nmap du réseau interne est dans /root/inventaire.txt"
  exiger "/root/inventaire.txt absent, ou douane et cuve n’y figurent pas (nmap 192.168.50.0/24)" inventaire_ok
  fin_objectif
  ;;
douane)
  objectif "douane, seule porte d’entrée, est durcie elle aussi"
  exiger "PermitRootLogin vaut « $(sshd_val permitrootlogin) » (attendu : no)" sshd_vaut permitrootlogin no
  exiger "PasswordAuthentication vaut « $(sshd_val passwordauthentication) » (attendu : no)" sshd_vaut passwordauthentication no
  fin_objectif

  objectif "fail2ban protège SSH : 1 h de bannissement après 5 échecs en 10 minutes, jamais le réseau interne"
  exiger "fail2ban n’est pas actif" unite_active fail2ban
  exiger "la prison sshd n’existe pas (fail2ban-client status sshd)" bash -c 'fail2ban-client status sshd >/dev/null 2>&1'
  exiger "maxretry vaut « $(f2b maxretry | tail -1) » (attendu : 5)" f2b_vaut maxretry 5
  exiger "findtime vaut « $(f2b findtime | tail -1) » s (attendu : 600)" f2b_vaut findtime 600
  exiger "bantime vaut « $(f2b bantime | tail -1) » s (attendu : 3600)" f2b_vaut bantime 3600
  exiger "le réseau interne ${LAN_RESEAU}.0/24 n’est pas dans ignoreip" f2b_ignore_lan
  fin_objectif

  objectif "La capture /root/capture-dns.pcap contient la question DNS du comptoir pour cuve.${DOMAINE}"
  exiger "capture absente ou sans requête « A? cuve.${DOMAINE} » (tcpdump -nr /root/capture-dns.pcap)" capture_ok
  fin_objectif
  ;;
esac

bilan 08
