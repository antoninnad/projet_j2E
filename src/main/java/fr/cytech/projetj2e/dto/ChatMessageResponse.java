package fr.cytech.projetj2e.dto;

import java.time.Instant;

/**
 * Message d'une conversation (T33). mine indique si le compte connecté l'a envoyé ;
 * clientMessageId est renvoyé pour que le client rapproche ses envois en attente.
 */
public record ChatMessageResponse(Long id, Long conversationId, Long senderId, String content, Instant sentAt,
                                  String clientMessageId, boolean mine) {}
