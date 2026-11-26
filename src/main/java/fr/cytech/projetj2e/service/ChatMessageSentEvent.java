package fr.cytech.projetj2e.service;

/**
 * Publié par ChatService après l'enregistrement d'un nouveau message (pas pour un renvoi idempotent).
 * Le temps réel (T34) l'écoutera après validation de la transaction pour notifier les deux participants.
 * Ne contient que des identifiants : le contenu est relu avec les contrôles d'accès.
 */
public record ChatMessageSentEvent(Long conversationId, Long messageId, Long senderId, Long recipientId) {}
