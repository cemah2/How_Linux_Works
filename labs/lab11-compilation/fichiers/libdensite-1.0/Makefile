# Makefile de libdensite (sans configure : on règle PREFIX en ligne de commande).
#   make PREFIX=/opt/densite
#   make PREFIX=/opt/densite install
PREFIX = /usr/local
LIBDIR = $(PREFIX)/lib
INCLUDEDIR = $(PREFIX)/include
CFLAGS = -O2 -Wall
VERSION = 1.0

all: libdensite.so.$(VERSION) densite.pc

densite.o: densite.c densite.h
	$(CC) $(CPPFLAGS) $(CFLAGS) -fPIC -c densite.c -o densite.o

libdensite.so.$(VERSION): densite.o
	$(CC) $(LDFLAGS) -shared -Wl,-soname,libdensite.so.1 -o $@ densite.o

densite.pc: densite.pc.in
	sed -e 's|@prefix@|$(PREFIX)|' -e 's|@version@|$(VERSION)|' densite.pc.in > $@

install: all
	install -d $(DESTDIR)$(LIBDIR)/pkgconfig $(DESTDIR)$(INCLUDEDIR)
	install -m 755 libdensite.so.$(VERSION) $(DESTDIR)$(LIBDIR)/
	ln -sf libdensite.so.$(VERSION) $(DESTDIR)$(LIBDIR)/libdensite.so.1
	ln -sf libdensite.so.1 $(DESTDIR)$(LIBDIR)/libdensite.so
	install -m 644 densite.h $(DESTDIR)$(INCLUDEDIR)/
	install -m 644 densite.pc $(DESTDIR)$(LIBDIR)/pkgconfig/

clean:
	rm -f densite.o libdensite.so.* densite.pc

.PHONY: all install clean
