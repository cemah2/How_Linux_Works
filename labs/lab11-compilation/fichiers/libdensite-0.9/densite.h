/* densite.h : calculs de densité pour la Brasserie du Noyau. */
#ifndef DENSITE_H
#define DENSITE_H

/* Version de la bibliothèque, par exemple "1.0". */
const char *densite_version(void);

/* Taux d'alcool (% vol.) à partir de la densité initiale (og) et finale (fg). */
double densite_abv(double og, double fg);

/* Atténuation apparente (%) : part des sucres consommée par la levure. */
double densite_attenuation(double og, double fg);

#endif
