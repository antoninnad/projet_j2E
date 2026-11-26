package fr.cytech.projetj2e.websocket;

import fr.cytech.projetj2e.dto.ChatMessageResponse;

/**
 * Événements JSON échangés sur /ws/chat (T34). Le champ type permet au client de les distinguer.
 *
 * Serveur → client : ready, message.created, conversation.read, pong, error.
 * Client → serveur : ping uniquement ; l'envoi d'un message passe par l'API REST (CSRF, idempotence).
 */
public final class ChatSocketEvents {

    private ChatSocketEvents() {
    }

    /** Connexion acceptée pour ce compte. */
    public record Ready(String type, Long userId) {
        public Ready(Long userId) {
            this("ready", userId);
        }
    }

    /** Nouveau message dans une conversation du compte ; mine est calculé pour le destinataire. */
    public record MessageCreated(String type, Long conversationId, ChatMessageResponse message) {
        public MessageCreated(ChatMessageResponse message) {
            this("message.created", message.conversationId(), message);
        }
    }

    /** Un participant a lu jusqu'à lastReadMessageId (accusé de lecture, non-lus des autres onglets). */
    public record ConversationRead(String type, Long conversationId, Long readerId, Long lastReadMessageId) {
        public ConversationRead(Long conversationId, Long readerId, Long lastReadMessageId) {
            this("conversation.read", conversationId, readerId, lastReadMessageId);
        }
    }

    public record Pong(String type) {
        public Pong() {
            this("pong");
        }
    }

    public record Error(String type, String message) {
        public Error(String message) {
            this("error", message);
        }
    }
}
