package fr.cytech.projetj2e.websocket;

import java.util.List;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.ChatMessageRepository;
import fr.cytech.projetj2e.repository.UserRepository;
import fr.cytech.projetj2e.service.ChatMessageSentEvent;
import fr.cytech.projetj2e.service.ChatReadEvent;
import fr.cytech.projetj2e.service.ChatService;
import tools.jackson.databind.json.JsonMapper;

/**
 * Diffusion temps réel du chat (T34), après validation de la transaction : un message annulé n'est jamais annoncé.
 *
 * Seuls les deux participants de la conversation reçoivent ses événements, sur toutes leurs connexions.
 * Avant chaque envoi, le compte destinataire est revérifié : s'il a été désactivé, ses connexions sont fermées.
 */
@Component
public class ChatRealtimeNotifier {

    private final ChatSessionRegistry registry;
    private final ChatMessageRepository messages;
    private final UserRepository users;
    private final JsonMapper json;

    public ChatRealtimeNotifier(ChatSessionRegistry registry, ChatMessageRepository messages,
                                UserRepository users, JsonMapper json) {
        this.registry = registry;
        this.messages = messages;
        this.users = users;
        this.json = json;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void onMessageSent(ChatMessageSentEvent event) {
        messages.findById(event.messageId()).ifPresent(message -> {
            for (Long userId : List.of(event.senderId(), event.recipientId())) {
                if (stillAllowed(userId)) {
                    registry.sendToUser(userId, json.writeValueAsString(
                            new ChatSocketEvents.MessageCreated(ChatService.toResponse(userId, message))));
                }
            }
        });
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void onRead(ChatReadEvent event) {
        String payload = json.writeValueAsString(new ChatSocketEvents.ConversationRead(
                event.conversationId(), event.readerId(), event.lastReadMessageId()));
        for (Long userId : List.of(event.readerId(), event.peerId())) {
            if (stillAllowed(userId)) {
                registry.sendToUser(userId, payload);
            }
        }
    }

    /** Vrai si le compte est connecté et toujours actif ; ferme ses connexions s'il ne l'est plus. */
    private boolean stillAllowed(Long userId) {
        if (!registry.isConnected(userId)) {
            return false;
        }
        boolean active = users.findById(userId).map(User::isActive).orElse(false);
        if (!active) {
            registry.closeUser(userId, ChatSessionRegistry.SESSION_ENDED);
        }
        return active;
    }
}
