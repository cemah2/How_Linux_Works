#!/usr/bin/python3
"""Service de stock de la Brasserie du Noyau (démonstration du Lab 13) : répond PONG à PING."""
import socketserver
import sys

CONF = "/etc/stock/stock.conf"

try:
    with open(CONF, encoding="utf-8") as f:
        conf = dict(l.strip().split("=", 1) for l in f if "=" in l and not l.lstrip().startswith("#"))
except OSError as e:
    print(f"stock : impossible de lire {CONF} : {e}", file=sys.stderr, flush=True)
    sys.exit(1)

ADRESSE = conf.get("ecoute", "127.0.0.1")
PORT = int(conf.get("port", "9100"))


class Stock(socketserver.StreamRequestHandler):
    def handle(self):
        for ligne in self.rfile:
            self.wfile.write(b"PONG\n" if ligne.strip() == b"PING" else b"ERR\n")


socketserver.ThreadingTCPServer.allow_reuse_address = True
print(f"stock : écoute sur {ADRESSE}:{PORT}", flush=True)
socketserver.ThreadingTCPServer((ADRESSE, PORT), Stock).serve_forever()
