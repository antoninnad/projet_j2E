package fr.cytech.projetj2e.dto;

import java.util.List;

/**
 * Page d'historique par curseur (T33), messages en ordre chronologique.
 * hasMore : d'autres messages existent au-delà de la page, plus anciens (before ou dernière page)
 * ou plus récents (after, rattrapage après coupure).
 */
public record MessagePageResponse(List<ChatMessageResponse> items, boolean hasMore) {}
