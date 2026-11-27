package fr.cytech.projetj2e.dto;

/**
 * Résultat de recherche (T31) : l'élément et son emplacement, par exemple « Finance / Archives »
 * (dossiers parents, de la racine du département au dossier qui le contient ; vide pour une racine).
 */
public record SearchResultResponse(NodeResponse node, String location) {}
