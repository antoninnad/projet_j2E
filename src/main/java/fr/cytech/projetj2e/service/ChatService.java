package fr.cytech.projetj2e.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Limit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.cytech.projetj2e.dto.ChatMessageResponse;
import fr.cytech.projetj2e.dto.ChatParticipantResponse;
import fr.cytech.projetj2e.dto.ConversationResponse;
import fr.cytech.projetj2e.dto.MessagePageResponse;
import fr.cytech.projetj2e.dto.PageResponse;
import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.ChatMessage;
import fr.cytech.projetj2e.model.Conversation;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.ChatMessageRepository;
import fr.cytech.projetj2e.repository.ConversationRepository;

/**
 * Chat privé persistant (T33) : conversations à deux, envoi, historique paginé et état de lecture.
 *
 * Règles (section 2.7) :
 * - une conversation réunit deux membres actifs de la même entreprise (requireColleague, T08) ;
 * - seuls les deux participants y accèdent : pour tout autre compte, administrateur compris, elle n'existe pas (404) ;
 * - si le correspondant n'est plus actif, l'historique reste lisible mais l'envoi est refusé (403) ;
 * - l'envoi est idempotent par clientMessageId : un renvoi après coupure renvoie le message déjà enregistré ;
 * - le contenu des messages n'est jamais journalisé.
 */
@Service
@Transactional
public class ChatService {

    public static final int DEFAULT_CONVERSATION_PAGE_SIZE = 20;
    public static final int DEFAULT_MESSAGE_PAGE_SIZE = 30;
    public static final int MAX_PAGE_SIZE = 100;

    /** Résultat d'un envoi : created vaut false pour un renvoi déjà enregistré. */
    public record SendResult(ChatMessageResponse message, boolean created) {}

    private final CompanyIsolationService isolation;
    private final ConversationRepository conversations;
    private final ChatMessageRepository messages;
    private final ApplicationEventPublisher events;

    public ChatService(CompanyIsolationService isolation,
                       ConversationRepository conversations,
                       ChatMessageRepository messages,
                       ApplicationEventPublisher events) {
        this.isolation = isolation;
        this.conversations = conversations;
        this.messages = messages;
        this.events = events;
    }

    // ---------------------------------------------------------------- Conversations

    /** Ouvre (ou retrouve) la conversation avec un collègue actif. */
    public ConversationResponse open(User actor, Long peerId) {
        isolation.requireActiveCompanyId(actor);
        if (actor.getId().equals(peerId)) {
            throw new IllegalArgumentException("Vous ne pouvez pas ouvrir une conversation avec vous-même.");
        }
        User peer = isolation.requireColleague(actor, peerId);
        boolean actorFirst = actor.getId() < peer.getId();
        Conversation conversation = conversations
                .findByParticipantAAndParticipantB(actorFirst ? actor : peer, actorFirst ? peer : actor)
                .orElseGet(() -> conversations.save(new Conversation(actor, peer, Instant.now())));
        return toResponse(actor, conversation, unreadCounts(actor, List.of(conversation)));
    }

    /** Conversations du compte, la plus récemment active d'abord, avec leurs non-lus. */
    @Transactional(readOnly = true)
    public PageResponse<ConversationResponse> list(User actor, int page, int size) {
        isolation.requireActiveCompanyId(actor);
        validatePage(page, size);
        Page<Conversation> found = conversations.findForParticipant(actor, PageRequest.of(page, size));
        Map<Long, Long> unread = unreadCounts(actor, found.getContent());
        return PageResponse.from(found, conversation -> toResponse(actor, conversation, unread));
    }

    @Transactional(readOnly = true)
    public ConversationResponse get(User actor, Long conversationId) {
        Conversation conversation = requireConversation(actor, conversationId);
        return toResponse(actor, conversation, unreadCounts(actor, List.of(conversation)));
    }

    /** Total des messages non lus du compte (badge de l'onglet chat). */
    @Transactional(readOnly = true)
    public long unreadTotal(User actor) {
        isolation.requireActiveCompanyId(actor);
        return messages.countUnread(actor);
    }

    // ---------------------------------------------------------------- Messages

    /**
     * Historique par curseur, en ordre chronologique.
     * Sans curseur : les derniers messages ; before : les plus anciens que ce message ;
     * after : les suivants (rattrapage après coupure, à rappeler tant que hasMore est vrai).
     */
    @Transactional(readOnly = true)
    public MessagePageResponse history(User actor, Long conversationId, Long before, Long after, int size) {
        Conversation conversation = requireConversation(actor, conversationId);
        if (before != null && after != null) {
            throw new IllegalArgumentException("Utilisez before ou after, pas les deux.");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("La taille de page doit être comprise entre 1 et " + MAX_PAGE_SIZE + ".");
        }
        Limit limit = Limit.of(size + 1);
        List<ChatMessage> found;
        if (after != null) {
            found = new ArrayList<>(messages.findByConversationAndIdGreaterThanOrderByIdAsc(conversation, after, limit));
        } else {
            found = new ArrayList<>(before != null
                    ? messages.findByConversationAndIdLessThanOrderByIdDesc(conversation, before, limit)
                    : messages.findByConversationOrderByIdDesc(conversation, limit));
        }
        boolean hasMore = found.size() > size;
        if (hasMore) {
            found.remove(found.size() - 1);
        }
        if (after == null) {
            Collections.reverse(found);
        }
        return new MessagePageResponse(found.stream().map(message -> toResponse(actor, message)).toList(), hasMore);
    }

    /** Envoie un message texte ; le message envoyé compte comme lu par son auteur. */
    public SendResult send(User actor, Long conversationId, String rawContent, String rawClientMessageId) {
        Conversation conversation = requireConversation(actor, conversationId);
        User peer = conversation.peerOf(actor);
        if (!isolation.areActiveColleagues(actor, peer)) {
            throw new ForbiddenException("Votre correspondant n'a plus accès à l'espace : la conversation est en lecture seule.");
        }
        String content = validContent(rawContent);
        String clientMessageId = validClientMessageId(rawClientMessageId);
        if (clientMessageId != null) {
            Optional<ChatMessage> already = messages.findByConversationAndSenderAndClientMessageId(conversation, actor, clientMessageId);
            if (already.isPresent()) {
                return new SendResult(toResponse(actor, already.get()), false);
            }
        }

        Instant now = Instant.now();
        ChatMessage message = messages.save(new ChatMessage(conversation, actor, content, clientMessageId, now));
        conversation.touch(now);
        conversation.markReadUpTo(actor, message.getId());
        events.publishEvent(new ChatMessageSentEvent(conversation.getId(), message.getId(), actor.getId(), peer.getId()));
        return new SendResult(toResponse(actor, message), true);
    }

    /**
     * Marque comme lus les messages jusqu'à lastMessageId inclus (tous si null).
     * Le « dernier lu » ne recule jamais : un accusé tardif est sans effet.
     */
    public ConversationResponse markRead(User actor, Long conversationId, Long lastMessageId) {
        Conversation conversation = requireConversation(actor, conversationId);
        Optional<ChatMessage> upTo = lastMessageId == null
                ? messages.findFirstByConversationOrderByIdDesc(conversation)
                : Optional.of(messages.findByIdAndConversation(lastMessageId, conversation)
                        .orElseThrow(() -> new ResourceNotFoundException("Message introuvable dans cette conversation.")));
        upTo.filter(message -> conversation.markReadUpTo(actor, message.getId()))
                .ifPresent(message -> events.publishEvent(new ChatReadEvent(conversation.getId(), actor.getId(),
                        conversation.peerOf(actor).getId(), message.getId())));
        return toResponse(actor, conversation, unreadCounts(actor, List.of(conversation)));
    }

    // ---------------------------------------------------------------- Contrôles

    /** Conversation dont le compte est participant ; 404 sinon, sans révéler son existence. */
    private Conversation requireConversation(User actor, Long conversationId) {
        isolation.requireActiveCompanyId(actor);
        if (conversationId == null) {
            throw new ResourceNotFoundException("Conversation introuvable.");
        }
        return conversations.findForParticipant(conversationId, actor)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation introuvable."));
    }

    static String validContent(String rawContent) {
        String content = rawContent == null ? "" : rawContent.strip();
        if (content.isEmpty()) {
            throw new IllegalArgumentException("Le message est vide.");
        }
        if (content.length() > ChatMessage.MAX_LENGTH) {
            throw new IllegalArgumentException("Le message ne doit pas dépasser " + ChatMessage.MAX_LENGTH + " caractères.");
        }
        return content;
    }

    static String validClientMessageId(String rawClientMessageId) {
        if (rawClientMessageId == null || rawClientMessageId.isBlank()) {
            return null;
        }
        String clientMessageId = rawClientMessageId.strip();
        if (clientMessageId.length() > ChatMessage.MAX_CLIENT_ID_LENGTH) {
            throw new IllegalArgumentException("L'identifiant client du message ne doit pas dépasser "
                    + ChatMessage.MAX_CLIENT_ID_LENGTH + " caractères.");
        }
        return clientMessageId;
    }

    private static void validatePage(int page, int size) {
        if (page < 0) {
            throw new IllegalArgumentException("Le numéro de page doit être positif ou nul.");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("La taille de page doit être comprise entre 1 et " + MAX_PAGE_SIZE + ".");
        }
    }

    // ---------------------------------------------------------------- Conversion

    private Map<Long, Long> unreadCounts(User actor, List<Conversation> found) {
        Map<Long, Long> unread = new HashMap<>();
        if (!found.isEmpty()) {
            for (Object[] row : messages.countUnreadByConversation(found, actor)) {
                unread.put((Long) row[0], (Long) row[1]);
            }
        }
        return unread;
    }

    private ConversationResponse toResponse(User actor, Conversation conversation, Map<Long, Long> unread) {
        User peer = conversation.peerOf(actor);
        ChatMessageResponse last = messages.findFirstByConversationOrderByIdDesc(conversation)
                .map(message -> toResponse(actor, message))
                .orElse(null);
        return new ConversationResponse(
                conversation.getId(),
                new ChatParticipantResponse(peer.getId(), peer.getFirstName(), peer.getLastName(),
                        peer.getUsername(), peer.isActive()),
                last,
                unread.getOrDefault(conversation.getId(), 0L),
                conversation.lastReadIdOf(actor),
                isolation.areActiveColleagues(actor, peer),
                conversation.getCreatedAt(),
                conversation.getLastActivityAt());
    }

    private static ChatMessageResponse toResponse(User actor, ChatMessage message) {
        return toResponse(actor.getId(), message);
    }

    /** Message vu par le compte viewerId (mine calculé pour lui) ; réutilisé par le temps réel (T34). */
    public static ChatMessageResponse toResponse(Long viewerId, ChatMessage message) {
        return new ChatMessageResponse(message.getId(), message.getConversation().getId(), message.getSender().getId(),
                message.getContent(), message.getSentAt(), message.getClientMessageId(),
                message.getSender().getId().equals(viewerId));
    }
}
