package fr.cytech.projetj2e.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fr.cytech.projetj2e.dto.ChatMessageResponse;
import fr.cytech.projetj2e.dto.ConversationResponse;
import fr.cytech.projetj2e.dto.MessagePageResponse;
import fr.cytech.projetj2e.dto.PageResponse;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.service.ChatService;
import fr.cytech.projetj2e.service.SessionIdentityService;
import jakarta.servlet.http.HttpSession;

/**
 * Chat privé persistant (T33), consommé par le module chat React (T35).
 * Une conversation dont le compte n'est pas participant renvoie 404. Les écritures exigent le jeton CSRF.
 */
@RestController
@RequestMapping("/api/conversations")
public class ChatRestController {

    public record OpenConversationRequest(Long peerId) {}
    public record SendMessageRequest(String content, String clientMessageId) {}
    public record MarkReadRequest(Long lastMessageId) {}
    public record UnreadResponse(long total) {}

    private final ChatService chat;
    private final SessionIdentityService identity;

    public ChatRestController(ChatService chat, SessionIdentityService identity) {
        this.chat = chat;
        this.identity = identity;
    }

    /** Ouvre ou retrouve la conversation avec un collègue actif (lancement depuis un profil). */
    @PostMapping
    public ConversationResponse open(@RequestBody OpenConversationRequest request, HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return chat.open(actor, request.peerId());
    }

    @GetMapping
    public PageResponse<ConversationResponse> list(@RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "" + ChatService.DEFAULT_CONVERSATION_PAGE_SIZE) int size,
                                                   HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return chat.list(actor, page, size);
    }

    @GetMapping("/unread")
    public UnreadResponse unread(HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return new UnreadResponse(chat.unreadTotal(actor));
    }

    @GetMapping("/{conversationId}")
    public ConversationResponse get(@PathVariable Long conversationId, HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return chat.get(actor, conversationId);
    }

    /** Historique par curseur : sans curseur les derniers, before pour remonter, after pour rattraper. */
    @GetMapping("/{conversationId}/messages")
    public MessagePageResponse history(@PathVariable Long conversationId,
                                       @RequestParam(required = false) Long before,
                                       @RequestParam(required = false) Long after,
                                       @RequestParam(defaultValue = "" + ChatService.DEFAULT_MESSAGE_PAGE_SIZE) int size,
                                       HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return chat.history(actor, conversationId, before, after, size);
    }

    /** 201 pour un nouveau message, 200 pour un renvoi du même clientMessageId (rien n'est dupliqué). */
    @PostMapping("/{conversationId}/messages")
    public ResponseEntity<ChatMessageResponse> send(@PathVariable Long conversationId,
                                                    @RequestBody SendMessageRequest request,
                                                    HttpSession session) {
        User actor = identity.requireActiveMember(session);
        ChatService.SendResult result = chat.send(actor, conversationId, request.content(), request.clientMessageId());
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK).body(result.message());
    }

    /** Marque lus les messages jusqu'à lastMessageId inclus (tous si absent). */
    @PostMapping("/{conversationId}/read")
    public ConversationResponse markRead(@PathVariable Long conversationId,
                                         @RequestBody(required = false) MarkReadRequest request,
                                         HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return chat.markRead(actor, conversationId, request == null ? null : request.lastMessageId());
    }
}
