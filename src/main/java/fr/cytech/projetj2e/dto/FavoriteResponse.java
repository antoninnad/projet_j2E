package fr.cytech.projetj2e.dto;

import java.time.Instant;

/** Favori personnel (T31) : l'élément, son emplacement et la date d'ajout. */
public record FavoriteResponse(NodeResponse node, String location, Instant addedAt) {}
