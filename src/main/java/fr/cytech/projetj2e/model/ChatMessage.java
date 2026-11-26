package fr.cytech.projetj2e.model;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * Message texte d'une conversation privée (T33). Les identifiants croissent avec l'ordre d'envoi :
 * ils servent de curseur pour l'historique et pour recharger les messages manqués (T34).
 * clientMessageId, choisi par le client, rend l'envoi idempotent : un renvoi après coupure ne duplique rien.
 */
@Entity
@Table(name = "chat_messages",
       uniqueConstraints = @UniqueConstraint(columnNames = {"conversation_id", "sender_id", "client_message_id"}))
public class ChatMessage {

    public static final int MAX_LENGTH = 4000;
    public static final int MAX_CLIENT_ID_LENGTH = 64;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(nullable = false, length = MAX_LENGTH)
    private String content;

    @Column(name = "client_message_id", length = MAX_CLIENT_ID_LENGTH)
    private String clientMessageId;

    @Column(nullable = false, updatable = false)
    private Instant sentAt;

    protected ChatMessage() {
        // Constructeur requis par JPA.
    }

    public ChatMessage(Conversation conversation, User sender, String content, String clientMessageId, Instant sentAt) {
        if (!conversation.hasParticipant(sender)) {
            throw new IllegalArgumentException("Seuls les participants peuvent écrire dans la conversation.");
        }
        this.conversation = conversation;
        this.sender = sender;
        this.content = content;
        this.clientMessageId = clientMessageId;
        this.sentAt = sentAt;
    }

    public Long getId() {
        return id;
    }

    public Conversation getConversation() {
        return conversation;
    }

    public User getSender() {
        return sender;
    }

    public String getContent() {
        return content;
    }

    public String getClientMessageId() {
        return clientMessageId;
    }

    public Instant getSentAt() {
        return sentAt;
    }
}
