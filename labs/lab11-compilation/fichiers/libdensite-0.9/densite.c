/* densite.c : calculs de densité pour la Brasserie du Noyau. */
#include "densite.h"

#define DENSITE_VERSION "0.9"

const char *densite_version(void)
{
    return DENSITE_VERSION;
}

double densite_abv(double og, double fg)
{
    return (og - fg) * 105.0;
}

double densite_attenuation(double og, double fg)
{
    if (og <= 1.0)
        return 0.0;
    return (og - fg) / og * 100.0;
}
