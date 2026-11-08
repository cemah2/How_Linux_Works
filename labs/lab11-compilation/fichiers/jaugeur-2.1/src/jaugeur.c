/* jaugeur : taux d'alcool et atténuation des cuves à partir d'un relevé CSV (éventuellement compressé).
 * Format d'une ligne : cuve;densité initiale;densité finale  (lignes commençant par # ignorées). */
#include <stdio.h>
#include <string.h>
#include <zlib.h>
#include <densite.h>

#define VERSION "2.1"

static void usage(void)
{
    fprintf(stderr, "usage : jaugeur [--version] FICHIER.csv[.gz]\n");
}

/* Analyse une ligne « cuve;og;fg » et affiche le résultat. Renvoie 1 si la ligne est une mesure.
 * (noinline : fonction gardée séparée de main, plus simple à suivre dans un débogueur.) */
static int __attribute__((noinline)) traiter(const char *ligne)
{
    char cuve[16];
    double og, fg;

    if (ligne[0] == '#' || ligne[0] == '\n')
        return 0;
    if (sscanf(ligne, "%[^;];%lf;%lf", cuve, &og, &fg) != 3)
        return 0;
    printf("%-15s %5.2f %% vol.  atténuation %5.1f %%\n",
           cuve, densite_abv(og, fg), densite_attenuation(og, fg));
    return 1;
}

int main(int argc, char **argv)
{
    char ligne[512];
    int mesures = 0;
    gzFile f;

    if (argc == 2 && strcmp(argv[1], "--version") == 0) {
        printf("jaugeur %s (libdensite %s, zlib %s)\n", VERSION, densite_version(), zlibVersion());
        return 0;
    }
    if (argc != 2) {
        usage();
        return 2;
    }
    f = gzopen(argv[1], "r");
    if (f == NULL) {
        fprintf(stderr, "jaugeur : impossible d'ouvrir %s\n", argv[1]);
        return 1;
    }
    while (gzgets(f, ligne, sizeof ligne) != NULL)
        mesures += traiter(ligne);
    gzclose(f);
    if (mesures == 0) {
        fprintf(stderr, "jaugeur : aucune mesure valide dans %s\n", argv[1]);
        return 1;
    }
    return 0;
}
