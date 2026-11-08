/* Module A7 (hors livre) : automatiser avec Ansible. */
HLW.chapitre({
  id: 'A7',
  intro: `
    Tu as configuré cuve, fut, douane et comptoir à la main, commande après commande. Avec dix ou cent
    machines, ce n’est plus tenable : il faut **décrire** l’état voulu et laisser un outil l’appliquer, de façon
    **reproductible**. **Ansible** est l’outil le plus répandu pour cela : sans agent (il passe par SSH), avec
    des fichiers YAML lisibles, et des modules **idempotents** (relancer ne change rien si tout est déjà en
    place).

    Le nœud de contrôle peut être ton poste ou comptoir ; les machines gérées n’ont besoin que de SSH et de
    Python.
  `,
  objectifs: [
    'expliquer le fonctionnement d’Ansible : nœud de contrôle, inventaire, modules, idempotence ;',
    'écrire un inventaire et lancer des commandes ad hoc ;',
    'écrire un playbook avec tâches, privilèges, gestionnaires, et le tester avec --check --diff ;',
    'utiliser variables, faits, conditions, boucles et modèles Jinja2 ;',
    'organiser le travail en rôles, utiliser des collections et protéger les secrets avec Vault.',
  ],
  certifs: { lfcs: ['OD'] },
  fiches: [
    /* ------------------------------------------------------------------ */
    {
      id: 'A7.1',
      titre: 'Principes, inventaire et commandes ad hoc',
      objectif: 'Mettre en place Ansible et parler à toutes les machines d’un coup.',
      rappel: `
        | Notion | Rôle |
        |---|---|
        | **nœud de contrôle** | la machine où Ansible est installé et d’où tout part |
        | **machines gérées** | joignables en SSH, avec Python ; **aucun agent** à installer |
        | **inventaire** | la liste des machines, rangées en **groupes** |
        | **module** | une unité de travail (installer un paquet, copier un fichier, gérer un service) |
        | **idempotence** | un module ne change que ce qui doit l’être : relancer donne \`ok\` au lieu de \`changed\` |

        \`\`\`
        # apt install ansible            (Debian)   |   dnf install ansible-core     (Rocky)
        $ ansible --version
        \`\`\`

        Un dossier de projet : \`ansible.cfg\` et un inventaire.

        \`\`\`
        # inventaire.ini
        [serveurs]
        cuve ansible_host=192.168.50.20
        fut  ansible_host=192.168.50.21

        [routeurs]
        douane ansible_host=192.168.50.1

        [brasserie:children]
        serveurs
        routeurs
        \`\`\`

        \`\`\`
        # ansible.cfg
        [defaults]
        inventory = inventaire.ini
        remote_user = admin
        \`\`\`

        ### Commandes ad hoc

        \`\`\`
        $ ansible-inventory --graph
        $ ansible all -m ansible.builtin.ping              # « pong » de chaque machine (SSH + Python OK)
        $ ansible serveurs -m ansible.builtin.command -a 'uptime'
        $ ansible serveurs -b -m ansible.builtin.package -a 'name=htop state=present'    # -b : sudo
        $ ansible cuve -m ansible.builtin.setup -a 'filter=ansible_distribution*'       # faits
        \`\`\`

        \`-m\` choisit le module, \`-a\` ses arguments, \`-b\` (*become*) passe en root, \`-K\` demande le mot de
        passe sudo. \`ansible.builtin.\` est le nom complet (FQCN) du module.
      `,
      aRetenir: [
        'Sans agent : SSH + Python ; nœud de contrôle, inventaire (groupes, :children), modules idempotents.',
        'ansible.cfg (inventory, remote_user) ; `ansible-inventory --graph`.',
        '`ansible GROUPE -m MODULE -a ARGS [-b] [-K]` ; ping, command, package, setup.',
        'changed (modifié) vs ok (déjà conforme).',
      ],
      exercices: [
        {
          id: 'cA7-01-01', type: 'association', niveau: 1,
          enonce: 'Associe chaque notion à sa définition.',
          paires: [['Inventaire', 'Liste des machines et de leurs groupes'], ['Module', 'Unité de travail (paquet, fichier, service…)'], ['Idempotence', 'Relancer ne change rien si l’état voulu est atteint'], ['Nœud de contrôle', 'Machine d’où Ansible est lancé']],
          indices: ['Liste de machines.', 'Brique de travail.', 'Relancer sans effet.'],
          solution: 'Inventaire : machines ; module : travail ; idempotence : relancer sans effet ; nœud de contrôle : point de départ.',
        },
        {
          id: 'cA7-01-02', type: 'commande', niveau: 1,
          enonce: 'Vérifie qu’Ansible peut joindre **toutes** les machines de l’inventaire (module ping).',
          accepte: ['ansible all -m (ansible\\.builtin\\.)?ping', 'ansible -m (ansible\\.builtin\\.)?ping all', 'ansible all -i \\S+ -m (ansible\\.builtin\\.)?ping'],
          exemple: 'ansible all -m ansible.builtin.ping',
          indices: ['Le groupe spécial qui contient tout.', '-m pour le module.', 'Le module ping.'],
          solution: '```\n$ ansible all -m ansible.builtin.ping\ncuve | SUCCESS => { "changed": false, "ping": "pong" }\n```\nCe n’est pas un ping ICMP : il teste SSH et Python.',
        },
        {
          id: 'cA7-01-03', type: 'commande', niveau: 2,
          enonce: 'Installe le paquet `htop` sur le groupe `serveurs`, en ad hoc, avec élévation de privilèges et le module générique de paquets.',
          accepte: ["ansible serveurs -b -m (ansible\\.builtin\\.)?package -a ['\"]name=htop state=present['\"]", "ansible serveurs -m (ansible\\.builtin\\.)?package -a ['\"]name=htop state=present['\"] -b", "ansible serveurs --become -m (ansible\\.builtin\\.)?package -a ['\"]name=htop state=present['\"]", "ansible serveurs -b -m (ansible\\.builtin\\.)?package -a ['\"]name=htop['\"]", "ansible serveurs -m (ansible\\.builtin\\.)?package -a ['\"]name=htop state=present['\"] --become", "ansible serveurs -b -K -m (ansible\\.builtin\\.)?package -a ['\"]name=htop state=present['\"]"],
          exemple: "ansible serveurs -b -m ansible.builtin.package -a 'name=htop state=present'",
          indices: ['Module package (il choisit apt ou dnf).', '-a pour les arguments name= et state=.', '-b pour sudo.'],
          solution: "```\n$ ansible serveurs -b -m ansible.builtin.package -a 'name=htop state=present'\ncuve | CHANGED => …\nfut  | CHANGED => …\n```\nRelance : `SUCCESS` et `\"changed\": false`.",
        },
        {
          id: 'cA7-01-04', type: 'qcm', niveau: 2,
          enonce: 'Que faut-il installer sur cuve et fut pour qu’Ansible puisse les gérer depuis comptoir ?',
          choix: ['Rien de spécial : un serveur SSH et Python suffisent (déjà présents)', 'L’agent ansible-agent', 'Ansible lui-même sur chaque machine', 'Un serveur web'],
          reponse: 0,
          indices: ['Ansible est dit « sans agent ».', 'Il se connecte comme toi.', 'Il pousse de petits programmes Python.'],
          solution: 'Ansible se connecte en SSH et exécute des modules Python sur la machine gérée : pas d’agent. Il faut seulement un accès SSH (idéalement par clé) et sudo si l’on utilise -b.',
        },
        {
          id: 'cA7-01-05', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Un groupe peut contenir d’autres groupes grâce au suffixe :children.', vrai: true },
            { texte: '`ansible all -m ping` envoie des paquets ICMP.', vrai: false },
            { texte: 'Le module setup collecte les « faits » d’une machine (distribution, mémoire, interfaces…).', vrai: true },
            { texte: 'L’option -b demande l’élévation de privilèges (sudo par défaut).', vrai: true },
          ],
          indices: ['Groupes de groupes.', 'Une seule fausse.', 'become.'],
          solution: 'Vrai, faux, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A7.2',
      titre: 'Playbooks et modules idempotents',
      objectif: 'Décrire l’état voulu d’un groupe de machines dans un fichier versionné.',
      rappel: `
        Un **playbook** (YAML) contient des **plays** : « sur ces machines, applique ces tâches ».

        \`\`\`yaml
        # vitrine.yml
        - name: Vitrine de la brasserie
          hosts: serveurs
          become: true
          tasks:
            - name: Installer nginx
              ansible.builtin.package:
                name: nginx
                state: present

            - name: Déployer la page d'accueil
              ansible.builtin.copy:
                src: fichiers/index.html
                dest: /var/www/html/index.html
                owner: root
                mode: "0644"
              notify: Recharger nginx

            - name: Démarrer nginx et l'activer au démarrage
              ansible.builtin.service:
                name: nginx
                state: started
                enabled: true

          handlers:
            - name: Recharger nginx
              ansible.builtin.service:
                name: nginx
                state: reloaded
        \`\`\`

        \`\`\`
        $ ansible-playbook vitrine.yml --syntax-check
        $ ansible-playbook vitrine.yml --check --diff       # simulation : ce qui CHANGERAIT, avec les différences
        $ ansible-playbook vitrine.yml                      # PLAY RECAP : ok=4 changed=3 failed=0
        $ ansible-playbook vitrine.yml --limit cuve         # une seule machine
        \`\`\`

        - Les modules décrivent un **état** (\`state: present\`, \`started\`), pas une action : c’est ce qui les
          rend idempotents. \`command\` et \`shell\` ne le sont pas : à éviter quand un module existe.
        - Un **gestionnaire** (*handler*) ne s’exécute que si une tâche qui le notifie a changé quelque chose,
          une seule fois, à la fin du play.
        - Modules courants : \`package\`/\`apt\`/\`dnf\`, \`copy\`, \`template\`, \`file\`, \`lineinfile\`, \`user\`,
          \`group\`, \`service\`/\`systemd_service\`, \`cron\`, \`get_url\`, \`unarchive\`. Documentation :
          \`ansible-doc ansible.builtin.copy\`.
        - L’indentation YAML compte (espaces, jamais de tabulations).
      `,
      aRetenir: [
        'Play : hosts, become, tasks (name + module + arguments), handlers.',
        '`ansible-playbook f.yml --syntax-check`, `--check --diff`, `--limit hôte`.',
        'Modules = état voulu (idempotents) ; command/shell en dernier recours.',
        'Handler : notifié par une tâche qui change, exécuté une fois à la fin ; `ansible-doc module`.',
      ],
      exercices: [
        {
          id: 'cA7-02-01', type: 'commande', niveau: 1,
          enonce: 'Simule l’exécution du playbook `vitrine.yml` en montrant les différences qu’il apporterait, sans rien modifier.',
          accepte: ['ansible-playbook vitrine\\.yml --check --diff', 'ansible-playbook --check --diff vitrine\\.yml', 'ansible-playbook vitrine\\.yml --diff --check', 'ansible-playbook -C -D vitrine\\.yml', 'ansible-playbook vitrine\\.yml -C -D', 'ansible-playbook -CD vitrine\\.yml', 'ansible-playbook vitrine\\.yml -CD'],
          exemple: 'ansible-playbook vitrine.yml --check --diff',
          indices: ['Deux options : simulation et différences.', '--check et --diff.', 'ansible-playbook.'],
          solution: '```\n$ ansible-playbook vitrine.yml --check --diff\n```',
        },
        {
          id: 'cA7-02-02', type: 'trous', niveau: 2,
          enonce: 'Complète la tâche qui garantit que nginx tourne et démarre avec la machine.',
          texte: '- name: nginx actif\n  ansible.builtin.service:\n    name: nginx\n    state: [[1]]\n    enabled: [[2]]',
          trous: [{ accepte: ['started'], exemple: 'started' }, { accepte: ['true', 'yes', 'True'], exemple: 'true' }],
          indices: ['Un état, pas une action.', 'Le service doit être démarré.', 'Activé au démarrage : booléen.'],
          solution: '```yaml\n- name: nginx actif\n  ansible.builtin.service:\n    name: nginx\n    state: started\n    enabled: true\n```\n`state: restarted` redémarrerait à chaque passage : pas idempotent.',
        },
        {
          id: 'cA7-02-03', type: 'qcm', niveau: 2,
          enonce: 'Tu lances deux fois de suite le playbook vitrine.yml sans rien changer. Que doit afficher le second PLAY RECAP ?',
          choix: ['changed=0 : tout est déjà conforme', 'changed=3 comme la première fois', 'failed=3', 'skipped=4'],
          reponse: 0,
          indices: ['Idempotence.', 'Les modules comparent l’état actuel à l’état voulu.', 'Rien à changer.'],
          solution: '`changed=0` : c’est le signe d’un playbook bien écrit. Une tâche qui affiche toujours `changed` (souvent un `command`) mérite d’être revue.',
        },
        {
          id: 'cA7-02-04', type: 'qcm', niveau: 2,
          enonce: 'La tâche « Déployer la page d’accueil » notifie le gestionnaire « Recharger nginx ». Lors d’une exécution où la page n’a **pas** changé, que se passe-t-il ?',
          choix: ['Le gestionnaire ne s’exécute pas', 'nginx est rechargé quand même', 'Le playbook échoue', 'nginx est redémarré au lieu d’être rechargé'],
          reponse: 0,
          indices: ['notify ne déclenche rien si la tâche est « ok ».', 'Le gestionnaire attend un changement.', 'Pas de changement, pas de rechargement.'],
          solution: 'Le gestionnaire n’est exécuté que si une tâche qui le notifie est `changed`. On évite ainsi de recharger nginx pour rien.',
        },
        {
          id: 'cA7-02-05', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Le module command est idempotent par nature.', vrai: false, explication: 'Il relance la commande à chaque fois (sauf options creates/removes).' },
            { texte: 'Les tabulations sont interdites pour indenter du YAML.', vrai: true },
            { texte: '`--limit cuve` restreint l’exécution à la machine cuve.', vrai: true },
            { texte: '`ansible-doc ansible.builtin.copy` affiche la documentation et des exemples du module.', vrai: true },
          ],
          indices: ['command exécute.', 'Une seule fausse.', 'YAML et les espaces.'],
          solution: 'Faux, vrai, vrai, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A7.3',
      titre: 'Variables, faits, conditions, boucles et modèles',
      objectif: 'Écrire un seul playbook pour Debian et Rocky, et des fichiers de configuration adaptés à chaque machine.',
      rappel: `
        ### Variables

        Elles se définissent à plusieurs endroits (du moins au plus prioritaire, en simplifiant) :
        \`group_vars/GROUPE.yml\`, \`host_vars/HÔTE.yml\`, \`vars:\` dans le play, \`-e\` en ligne de commande.

        \`\`\`yaml
        # group_vars/serveurs.yml
        vitrine_port: 8080
        equipe: [lea, malik, bastien]
        \`\`\`

        ### Faits

        Au début de chaque play, Ansible collecte des **faits** (\`ansible_facts\`) : distribution, famille,
        mémoire, adresses…

        \`\`\`yaml
        - name: Pare-feu sur la famille Red Hat seulement
          ansible.posix.firewalld:
            service: http
            permanent: true
            immediate: true
            state: enabled
          when: ansible_facts['os_family'] == "RedHat"

        - name: Créer les comptes de l'équipe
          ansible.builtin.user:
            name: "{{ item }}"
            groups: brasseurs
            append: true
          loop: "{{ equipe }}"
        \`\`\`

        ### Modèles Jinja2

        Le module \`template\` produit un fichier à partir d’un modèle \`.j2\` :

        \`\`\`
        # modeles/vitrine.env.j2
        PORT={{ vitrine_port }}
        NOM_MACHINE={{ inventory_hostname }}
        {% if ansible_facts['memtotal_mb'] > 2000 %}
        CACHE=grand
        {% endif %}
        \`\`\`

        \`\`\`yaml
        - ansible.builtin.template:
            src: modeles/vitrine.env.j2
            dest: /etc/vitrine/vitrine.env
            mode: "0640"
          notify: Redémarrer vitrine
        \`\`\`

        \`{{ … }}\` insère une valeur, \`{% … %}\` est une instruction (if, for). Les valeurs YAML qui
        commencent par \`{{\` doivent être **entre guillemets**.
      `,
      aRetenir: [
        'Variables : group_vars/, host_vars/, vars:, -e (le plus fort) ; `"{{ variable }}"` entre guillemets.',
        'Faits : ansible_facts[\'os_family\'], [\'distribution\'], [\'memtotal_mb\'] ; inventory_hostname.',
        '`when:` condition ; `loop:` + `{{ item }}`.',
        'Module template + modèle .j2 : {{ valeur }}, {% if %}…{% endif %}.',
      ],
      exercices: [
        {
          id: 'cA7-03-01', type: 'trous', niveau: 2,
          enonce: 'Complète la tâche qui crée un compte pour chaque membre de la liste `equipe`.',
          texte: '- ansible.builtin.user:\n    name: "{{ [[1]] }}"\n  [[2]]: "{{ equipe }}"',
          trous: [{ accepte: ['item'], exemple: 'item' }, { accepte: ['loop', 'with_items'], exemple: 'loop' }],
          indices: ['La variable de boucle s’appelle par défaut…', 'Le mot-clé de boucle moderne.', 'item et loop.'],
          solution: '```yaml\n- ansible.builtin.user:\n    name: "{{ item }}"\n  loop: "{{ equipe }}"\n```',
        },
        {
          id: 'cA7-03-02', type: 'qcm', niveau: 2,
          enonce: 'Quelle condition limite une tâche aux machines de la famille Debian ?',
          choix: ["when: ansible_facts['os_family'] == \"Debian\"", "if: os == debian", "only: Debian", "when: inventory_hostname == \"Debian\""],
          reponse: 0,
          indices: ['Le mot-clé de condition est when.', 'La famille est un fait.', 'os_family.'],
          solution: "`when: ansible_facts['os_family'] == \"Debian\"` (vrai sur Debian et Ubuntu). Pour Rocky : \"RedHat\".",
        },
        {
          id: 'cA7-03-03', type: 'commande', niveau: 2,
          enonce: 'Lance `vitrine.yml` en imposant la variable `vitrine_port` à 9090 depuis la ligne de commande.',
          accepte: ['ansible-playbook vitrine\\.yml -e ["\']?vitrine_port=9090["\']?', 'ansible-playbook -e ["\']?vitrine_port=9090["\']? vitrine\\.yml', 'ansible-playbook vitrine\\.yml --extra-vars[ =]["\']?vitrine_port=9090["\']?', 'ansible-playbook --extra-vars[ =]["\']?vitrine_port=9090["\']? vitrine\\.yml'],
          exemple: 'ansible-playbook vitrine.yml -e vitrine_port=9090',
          indices: ['Variables supplémentaires.', 'Option -e (extra vars).', 'Elles l’emportent sur toutes les autres.'],
          solution: '```\n$ ansible-playbook vitrine.yml -e vitrine_port=9090\n```',
        },
        {
          id: 'cA7-03-04', type: 'association', niveau: 2,
          enonce: 'Associe chaque élément à son rôle.',
          paires: [['group_vars/serveurs.yml', 'Variables du groupe serveurs'], ['host_vars/cuve.yml', 'Variables propres à cuve'], ['{{ inventory_hostname }}', 'Nom de la machine dans l’inventaire'], ['{% if … %}', 'Instruction conditionnelle dans un modèle']],
          indices: ['group = groupe, host = machine.', 'inventory_hostname vient de l’inventaire.', '{% %} = instruction.'],
          solution: 'group_vars : groupe ; host_vars : machine ; inventory_hostname : nom ; {% if %} : condition.',
        },
        {
          id: 'cA7-03-05', type: 'vrai-faux', niveau: 2,
          enonce: 'Vrai ou faux ?',
          affirmations: [
            { texte: 'Une valeur YAML qui commence par {{ doit être mise entre guillemets.', vrai: true },
            { texte: 'Les variables passées avec -e ont la priorité la plus haute.', vrai: true },
            { texte: 'Les faits doivent être écrits à la main dans l’inventaire.', vrai: false, explication: 'Ansible les collecte lui-même (module setup).' },
            { texte: 'Le module firewalld fait partie de la collection ansible.posix, pas d’ansible-core.', vrai: true },
          ],
          indices: ['Syntaxe YAML.', 'Une seule fausse.', 'gather_facts.'],
          solution: 'Vrai, vrai, faux, vrai.',
        },
      ],
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'A7.4',
      titre: 'Rôles, collections, Vault et bonnes pratiques',
      objectif: 'Organiser un projet Ansible réutilisable et protéger ses secrets.',
      rappel: `
        ### Rôles

        Un **rôle** regroupe tâches, gestionnaires, modèles, fichiers et variables par défaut d’un même sujet :

        \`\`\`
        $ ansible-galaxy role init roles/vitrine
        roles/vitrine/
          tasks/main.yml   handlers/main.yml   templates/   files/   defaults/main.yml   vars/main.yml   meta/main.yml
        \`\`\`

        \`\`\`yaml
        # site.yml
        - hosts: serveurs
          become: true
          roles:
            - socle          # comptes, SSH, mises à jour automatiques
            - vitrine
        \`\`\`

        \`defaults/main.yml\` : valeurs par défaut, faciles à surcharger ; \`vars/main.yml\` : valeurs internes.

        ### Collections

        Des modules supplémentaires sont distribués en **collections** (\`ansible.posix\`, \`community.general\`…) :

        \`\`\`
        $ ansible-galaxy collection install ansible.posix
        $ ansible-galaxy collection list
        \`\`\`

        Sur Rocky, le paquet \`rhel-system-roles\` fournit aussi des rôles officiels (pare-feu, SELinux, stockage…).

        ### Vault : les secrets chiffrés

        \`\`\`
        $ ansible-vault create group_vars/serveurs/secrets.yml      # éditeur, fichier chiffré
        $ ansible-vault edit group_vars/serveurs/secrets.yml
        $ ansible-vault encrypt_string 'Mot2Passe!' --name db_mdp    # une seule valeur
        $ ansible-playbook site.yml --ask-vault-pass                 # ou --vault-password-file
        \`\`\`

        ### Bonnes pratiques

        - le projet dans **git** ; jamais de secret en clair (Vault) ;
        - **noms complets** des modules (\`ansible.builtin.copy\`) et un \`name:\` explicite par tâche ;
        - \`--check --diff\` avant d’appliquer, \`--limit\` pour essayer sur une machine ;
        - \`ansible-lint\` pour repérer les mauvaises pratiques ;
        - relancer doit donner \`changed=0\`.
      `,
      aRetenir: [
        'Rôle : tasks, handlers, templates, files, defaults, vars, meta ; `ansible-galaxy role init`.',
        'Collections : `ansible-galaxy collection install ansible.posix` ; rhel-system-roles sur Rocky.',
        'Vault : `ansible-vault create|edit|encrypt_string`, `--ask-vault-pass`.',
        'git, FQCN, name:, --check --diff, ansible-lint, changed=0 au second passage.',
      ],
      exercices: [
        {
          id: 'cA7-04-01', type: 'commande', niveau: 1,
          enonce: 'Crée la structure d’un rôle nommé `vitrine` dans le dossier `roles/`.',
          accepte: ['ansible-galaxy role init roles/vitrine', 'ansible-galaxy init roles/vitrine', 'ansible-galaxy role init --init-path roles vitrine', 'ansible-galaxy init --init-path roles vitrine', 'cd roles && ansible-galaxy role init vitrine'],
          exemple: 'ansible-galaxy role init roles/vitrine',
          indices: ['L’outil ansible-galaxy.', 'Sous-commande role init.', 'Le chemin du rôle.'],
          solution: '```\n$ ansible-galaxy role init roles/vitrine\n- Role roles/vitrine was created successfully\n```',
        },
        {
          id: 'cA7-04-02', type: 'commande', niveau: 2,
          enonce: 'Installe la collection `ansible.posix` (qui contient le module firewalld).',
          accepte: ['ansible-galaxy collection install ansible\\.posix', 'ansible-galaxy collection install ansible\\.posix --force'],
          exemple: 'ansible-galaxy collection install ansible.posix',
          indices: ['ansible-galaxy.', 'Sous-commande collection install.', 'Le nom de la collection.'],
          solution: '```\n$ ansible-galaxy collection install ansible.posix\n```',
        },
        {
          id: 'cA7-04-03', type: 'commande', niveau: 2,
          enonce: 'Ouvre pour modification le fichier chiffré `group_vars/serveurs/secrets.yml`.',
          accepte: ['ansible-vault edit group_vars/serveurs/secrets\\.yml', 'ansible-vault edit --ask-vault-pass group_vars/serveurs/secrets\\.yml', 'ansible-vault edit --vault-password-file \\S+ group_vars/serveurs/secrets\\.yml'],
          exemple: 'ansible-vault edit group_vars/serveurs/secrets.yml',
          indices: ['ansible-vault.', 'Sous-commande edit.', 'Le fichier.'],
          solution: '```\n$ ansible-vault edit group_vars/serveurs/secrets.yml\nVault password:\n```\nLe fichier reste chiffré sur disque (et dans git).',
        },
        {
          id: 'cA7-04-04', type: 'association', niveau: 2,
          enonce: 'Associe chaque répertoire d’un rôle à son contenu.',
          paires: [['tasks/main.yml', 'Les tâches du rôle'], ['handlers/main.yml', 'Les gestionnaires'], ['templates/', 'Les modèles Jinja2 (.j2)'], ['defaults/main.yml', 'Les variables par défaut, faciles à surcharger']],
          indices: ['Les noms sont explicites.', 'templates = modèles.', 'defaults = valeurs par défaut.'],
          solution: 'tasks : tâches ; handlers : gestionnaires ; templates : modèles ; defaults : valeurs par défaut.',
        },
        {
          id: 'cA7-04-05', type: 'libre', niveau: 3,
          enonce: 'Écris un playbook `socle.yml` pour le groupe `serveurs` (Debian et Rocky) qui : installe `chrony` et `htop`, crée le groupe `brasseurs` et les comptes de la liste `equipe` (membres de brasseurs), active et démarre chrony, et n’autorise SSH que par clé (`PasswordAuthentication no` dans un fichier de `/etc/ssh/sshd_config.d/`, avec un gestionnaire qui recharge sshd). Lance-le deux fois sur cuve et fut : le second passage doit afficher `changed=0`.',
          indices: ['Modules package, group, user (loop), service, copy (pour le fichier sshd).', 'Le service SSH s’appelle ssh sur Debian, sshd sur Rocky : une variable selon os_family.', 'notify sur la tâche copy.'],
          solution: '```yaml\n- name: Socle des serveurs\n  hosts: serveurs\n  become: true\n  vars:\n    equipe: [lea, malik, bastien]\n    service_ssh: "{{ \'ssh\' if ansible_facts[\'os_family\'] == \'Debian\' else \'sshd\' }}"\n  tasks:\n    - name: Paquets du socle\n      ansible.builtin.package:\n        name: [chrony, htop]\n        state: present\n    - name: Groupe brasseurs\n      ansible.builtin.group:\n        name: brasseurs\n    - name: Comptes de l’équipe\n      ansible.builtin.user:\n        name: "{{ item }}"\n        groups: brasseurs\n        append: true\n      loop: "{{ equipe }}"\n    - name: chrony actif\n      ansible.builtin.service:\n        name: "{{ \'chrony\' if ansible_facts[\'os_family\'] == \'Debian\' else \'chronyd\' }}"\n        state: started\n        enabled: true\n    - name: SSH par clé seulement\n      ansible.builtin.copy:\n        dest: /etc/ssh/sshd_config.d/50-cles.conf\n        content: "PasswordAuthentication no\\n"\n        mode: "0644"\n        validate: sshd -t -f %s\n      notify: Recharger SSH\n  handlers:\n    - name: Recharger SSH\n      ansible.builtin.service:\n        name: "{{ service_ssh }}"\n        state: reloaded\n```\n`validate:` teste le fichier avant de l’installer : une erreur ne coupe pas l’accès SSH.',
        },
      ],
    },
  ],
  flashcards: [
    { q: 'Ansible a-t-il besoin d’un agent ?', r: 'Non : SSH + Python sur la machine gérée.' },
    { q: 'Tester l’accès à toutes les machines ?', r: '`ansible all -m ansible.builtin.ping`' },
    { q: 'Commande ad hoc avec sudo ?', r: '`ansible GROUPE -b -m MODULE -a \'ARGS\'`' },
    { q: 'Simuler un playbook ?', r: '`ansible-playbook f.yml --check --diff`' },
    { q: 'Idempotence ?', r: 'Relancer donne changed=0 si l’état voulu est atteint.' },
    { q: 'Handler ?', r: 'Tâche notifiée, exécutée une fois à la fin du play si une tâche notifiante a changé.' },
    { q: 'Condition / boucle ?', r: '`when: ansible_facts[\'os_family\'] == "RedHat"` ; `loop:` + `{{ item }}`.' },
    { q: 'Fichier de configuration par machine ?', r: 'Module template + modèle Jinja2 .j2.' },
    { q: 'Variables les plus prioritaires ?', r: '`-e` (extra vars).' },
    { q: 'Secrets ?', r: '`ansible-vault create|edit|encrypt_string`, `--ask-vault-pass`.' },
    { q: 'Nouveau rôle / collection ?', r: '`ansible-galaxy role init roles/x` ; `ansible-galaxy collection install ansible.posix`.' },
  ],
  memo: `
    ### Ad hoc
    \`\`\`
    ansible-inventory --graph   ansible all -m ansible.builtin.ping   ansible serveurs -m ansible.builtin.command -a 'uptime'
    ansible serveurs -b [-K] -m ansible.builtin.package -a 'name=htop state=present'   ansible cuve -m setup -a 'filter=ansible_os*'
    \`\`\`
    ### Playbooks
    \`\`\`
    ansible-playbook f.yml --syntax-check   --check --diff   --limit cuve   -e var=valeur   --ask-vault-pass   ansible-doc MODULE   ansible-lint f.yml
    \`\`\`
    \`\`\`yaml
    - name: …
      hosts: serveurs
      become: true
      vars: { vitrine_port: 8080 }
      tasks:
        - name: …
          ansible.builtin.template: { src: m.j2, dest: /etc/x.conf, mode: "0644" }
          notify: Recharger x
          when: ansible_facts['os_family'] == "Debian"
        - ansible.builtin.user: { name: "{{ item }}", groups: brasseurs, append: true }
          loop: "{{ equipe }}"
      handlers:
        - name: Recharger x
          ansible.builtin.service: { name: x, state: reloaded }
    \`\`\`
    ### Organisation
    \`\`\`
    ansible.cfg  inventaire.ini  group_vars/  host_vars/  roles/NOM/{tasks,handlers,templates,files,defaults,vars,meta}
    ansible-galaxy role init roles/NOM   ansible-galaxy collection install ansible.posix   ansible-vault create|edit|encrypt_string
    \`\`\`
  `,
});
