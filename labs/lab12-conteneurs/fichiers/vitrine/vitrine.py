"""Vitrine de la Brasserie du Noyau.

Sert les fichiers de /donnees (index.html…) sur le port 8000 et note chaque visite dans
/donnees/visites.log. Le répertoire /donnees est prévu pour être un volume.
"""
import http.server
import os
import signal
import sys
import time

DONNEES = os.environ.get("VITRINE_DONNEES", "/donnees")
PORT = int(os.environ.get("VITRINE_PORT", "8000"))


class Gestionnaire(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DONNEES, **kwargs)

    def do_GET(self):
        try:
            with open(os.path.join(DONNEES, "visites.log"), "a", encoding="utf-8") as journal:
                journal.write(f"{time.strftime('%Y-%m-%dT%H:%M:%S')} {self.client_address[0]} {self.path}\n")
        except OSError as e:
            self.log_error("impossible d'écrire visites.log : %s", e)
            self.send_error(500, "visites.log non modifiable (volume, droits, SELinux ?)")
            return
        super().do_GET()


def arreter(signum, frame):
    # En PID 1 dans un conteneur, SIGTERM est ignoré sans gestionnaire : on en installe un.
    sys.exit(0)


signal.signal(signal.SIGTERM, arreter)
print(f"vitrine : sert {DONNEES} sur le port {PORT}", flush=True)
http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Gestionnaire).serve_forever()
