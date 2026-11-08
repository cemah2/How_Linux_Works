#!/usr/bin/python3
"""Boutique en ligne de la Brasserie du Noyau (application de démonstration du Lab 13).

GET /           page d'accueil
GET /sante      état : écriture des données et joignabilité du service de stock (200 ou 503, JSON)
GET /commande?biere=NOM&qte=N   enregistre une commande dans commandes.log
"""
import http.server
import json
import os
import signal
import socket
import sys
import threading
import time
import urllib.parse

DONNEES = os.environ.get("BOUTIQUE_DONNEES", "/srv/boutique/donnees")
STOCK = os.environ.get("STOCK_HOTE", "stock.brasserie.lan:9100")
PORT = int(os.environ.get("BOUTIQUE_PORT", "8090"))
DEBUG = os.environ.get("BOUTIQUE_DEBUG") == "1"
JOURNAL = os.path.join(DONNEES, "journal")


def verifier_disque():
    chemin = os.path.join(DONNEES, ".sante")
    try:
        with open(chemin, "w", encoding="utf-8") as f:
            f.write("x" * 8192)
            f.flush()
            os.fsync(f.fileno())
        os.remove(chemin)
        return "ok"
    except OSError as e:
        try:
            os.remove(chemin)
        except OSError:
            pass
        return f"erreur : {e.strerror}"


def verifier_stock():
    hote, _, port = STOCK.rpartition(":")
    try:
        with socket.create_connection((hote, int(port)), timeout=2) as s:
            s.sendall(b"PING\n")
            if s.recv(16).strip() == b"PONG":
                return "ok"
            return "erreur : réponse inattendue"
    except OSError as e:
        return f"erreur : {e}"


class Boutique(http.server.BaseHTTPRequestHandler):
    def repondre(self, code, corps, type_mime="application/json; charset=utf-8"):
        donnees = corps.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", type_mime)
        self.send_header("Content-Length", str(len(donnees)))
        self.end_headers()
        self.wfile.write(donnees)

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        if url.path == "/sante":
            etat = {"disque": verifier_disque(), "stock": verifier_stock()}
            code = 200 if all(v == "ok" for v in etat.values()) else 503
            self.repondre(code, json.dumps(etat, ensure_ascii=False) + "\n")
        elif url.path == "/commande":
            q = urllib.parse.parse_qs(url.query)
            biere = q.get("biere", ["?"])[0][:40]
            qte = q.get("qte", ["1"])[0][:4]
            stock = verifier_stock()
            if stock != "ok":
                self.repondre(503, json.dumps({"commande": "refusée", "stock": stock}, ensure_ascii=False) + "\n")
                return
            try:
                with open(os.path.join(DONNEES, "commandes.log"), "a", encoding="utf-8") as f:
                    f.write(f"{time.strftime('%F %T')} {biere} x{qte}\n")
                    f.flush()
                    os.fsync(f.fileno())
            except OSError as e:
                print(f"boutique : commande perdue ({biere} x{qte}) : {e}", file=sys.stderr, flush=True)
                self.repondre(503, json.dumps({"commande": "non enregistrée", "erreur": e.strerror}, ensure_ascii=False) + "\n")
                return
            self.repondre(200, json.dumps({"commande": "enregistrée", "biere": biere, "qte": qte}, ensure_ascii=False) + "\n")
        elif url.path == "/":
            self.repondre(200, "<h1>Brasserie du Noyau</h1><p>La boutique est ouverte.</p>\n", "text/html; charset=utf-8")
        else:
            self.repondre(404, '{"erreur": "page inconnue"}\n')

    def log_message(self, fmt, *args):
        print(f"boutique : {self.address_string()} {fmt % args}", flush=True)


def bavard():
    """Mode débogage : écrit l'état interne en continu dans journal/debug.log."""
    os.makedirs(JOURNAL, exist_ok=True)
    f = open(os.path.join(JOURNAL, "debug.log"), "a", encoding="utf-8")
    n = 0
    while True:
        n += 1
        ligne = f"{time.strftime('%F %T')} DEBUG cycle={n} " + "état-interne " * 60 + "\n"
        try:
            f.write(ligne)
            f.flush()
        except OSError:
            pass
        time.sleep(0.1)


def arreter(signum, frame):
    sys.exit(0)


signal.signal(signal.SIGTERM, arreter)
if DEBUG:
    print("boutique : MODE DÉBOGAGE ACTIF (journal/debug.log)", flush=True)
    threading.Thread(target=bavard, daemon=True).start()
print(f"boutique : écoute sur le port {PORT}, données dans {DONNEES}, stock sur {STOCK}", flush=True)
http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Boutique).serve_forever()
