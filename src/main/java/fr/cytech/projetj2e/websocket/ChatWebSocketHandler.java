package fr.cytech.projetj2e.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.adapter.NativeWebSocketSession;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Connexion /ws/chat d'un membre authentifié (T34). Le serveur y pousse les événements des conversations du compte ;
 * le client n'y envoie que des ping (maintien de la connexion). Les messages du chat s'envoient en REST.
 */
@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    /** Taille maximale d'un message reçu du client : un ping suffit largement. */
    static final int MAX_INCOMING_MESSAGE_SIZE = 1024;
    /** Sans ping ni trafic pendant ce délai, la connexion est fermée ; le client pingue toutes les 30 s. */
    static final long IDLE_TIMEOUT_MS = 120_000;

    private final ChatSessionRegistry registry;
    private final JsonMapper json;

    public ChatWebSocketHandler(ChatSessionRegistry registry, JsonMapper json) {
        this.registry = registry;
        this.json = json;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        session.setTextMessageSizeLimit(MAX_INCOMING_MESSAGE_SIZE);
        if (session instanceof NativeWebSocketSession nativeAware) {
            jakarta.websocket.Session nativeSession = nativeAware.getNativeSession(jakarta.websocket.Session.class);
            if (nativeSession != null) {
                nativeSession.setMaxIdleTimeout(IDLE_TIMEOUT_MS);
            }
        }
        if (registry.register(session)) {
            Long userId = (Long) session.getAttributes().get(ChatSessionRegistry.USER_ID);
            registry.sendToConnection(session, json.writeValueAsString(new ChatSocketEvents.Ready(userId)));
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        Object reply;
        try {
            JsonNode event = json.readTree(message.getPayload());
            reply = "ping".equals(event.path("type").asString(""))
                    ? new ChatSocketEvents.Pong()
                    : new ChatSocketEvents.Error("Seul « ping » est accepté ; envoyez les messages par l'API REST.");
        } catch (JacksonException exception) {
            reply = new ChatSocketEvents.Error("Message JSON invalide.");
        }
        registry.sendToConnection(session, json.writeValueAsString(reply));
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        registry.unregister(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        registry.unregister(session);
    }
}
