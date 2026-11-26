package fr.cytech.projetj2e.dto;

import java.time.Instant;

/**
 * Conversation vue par le compte connecté (T33) : son correspondant, le dernier message,
 * ses messages non lus et s'il peut encore écrire (correspondant toujours actif).
 */
public record ConversationResponse(Long id, ChatParticipantResponse peer, ChatMessageResponse lastMessage,
                                   long unreadCount, Long lastReadMessageId, boolean canSend,
                                   Instant createdAt, Instant lastActivityAt) {}
