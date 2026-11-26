package fr.cytech.projetj2e.websocket;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;

/**
 * Connexions WebSocket ouvertes, par compte (T34). Un compte peut avoir plusieurs onglets ouverts.
 *
 * Les envois passent par ConcurrentWebSocketSessionDecorator : une connexion ne reçoit qu'un envoi à la fois
 * et une connexion trop lente (file pleine ou envoi bloqué) est fermée au lieu de ralentir les autres.
 */
@Component
public class ChatSessionRegistry {

    /** Session HTTP terminée (déconnexion, expiration) ou compte désactivé : le client ne doit pas se reconnecter. */
    public static final CloseStatus SESSION_ENDED = new CloseStatus(4401, "Session terminée : reconnectez-vous.");
    /** Trop d'onglets ouverts pour ce compte. */
    public static final CloseStatus TOO_MANY_CONNECTIONS = new CloseStatus(4429, "Trop de connexions ouvertes.");

    public static final String USER_ID = "chat.userId";
    public static final String HTTP_SESSION_ID = "chat.httpSessionId";

    static final int MAX_CONNECTIONS_PER_USER = 10;
    static final int SEND_TIME_LIMIT_MS = 10_000;
    static final int BUFFER_SIZE_LIMIT = 512 * 1024;

    private static final Logger LOG = LoggerFactory.getLogger(ChatSessionRegistry.class);

    /** idUtilisateur → (idConnexion → connexion protégée). */
    private final Map<Long, Map<String, WebSocketSession>> connections = new ConcurrentHashMap<>();

    /** Enregistre la connexion ; false (et fermeture) si le compte a déjà trop de connexions. */
    public boolean register(WebSocketSession session) {
        Long userId = userId(session);
        Map<String, WebSocketSession> userConnections = connections.computeIfAbsent(userId, id -> new ConcurrentHashMap<>());
        synchronized (userConnections) {
            if (userConnections.size() >= MAX_CONNECTIONS_PER_USER) {
                close(session, TOO_MANY_CONNECTIONS);
                return false;
            }
            userConnections.put(session.getId(),
                    new ConcurrentWebSocketSessionDecorator(session, SEND_TIME_LIMIT_MS, BUFFER_SIZE_LIMIT));
        }
        return true;
    }

    public void unregister(WebSocketSession session) {
        Long userId = userId(session);
        Map<String, WebSocketSession> userConnections = connections.get(userId);
        if (userConnections != null) {
            userConnections.remove(session.getId());
            connections.computeIfPresent(userId, (id, map) -> map.isEmpty() ? null : map);
        }
    }

    public boolean isConnected(Long userId) {
        Map<String, WebSocketSession> userConnections = connections.get(userId);
        return userConnections != null && !userConnections.isEmpty();
    }

    /** Envoie à toutes les connexions du compte ; une connexion en échec est fermée et retirée. */
    public void sendToUser(Long userId, String payload) {
        Map<String, WebSocketSession> userConnections = connections.get(userId);
        if (userConnections != null) {
            List.copyOf(userConnections.values()).forEach(session -> send(session, payload));
        }
    }

    /** Envoie à une connexion précise (réponse à un ping, message d'accueil). */
    public void sendToConnection(WebSocketSession raw, String payload) {
        Map<String, WebSocketSession> userConnections = connections.get(userId(raw));
        WebSocketSession session = userConnections == null ? null : userConnections.get(raw.getId());
        if (session != null) {
            send(session, payload);
        }
    }

    public void closeUser(Long userId, CloseStatus status) {
        Map<String, WebSocketSession> userConnections = connections.remove(userId);
        if (userConnections != null) {
            userConnections.values().forEach(session -> close(session, status));
        }
    }

    /** Ferme les connexions ouvertes avec cette session HTTP (déconnexion ou expiration). */
    public void closeHttpSession(String httpSessionId) {
        connections.values().forEach(userConnections -> List.copyOf(userConnections.values()).stream()
                .filter(session -> Objects.equals(session.getAttributes().get(HTTP_SESSION_ID), httpSessionId))
                .forEach(session -> {
                    userConnections.remove(session.getId());
                    close(session, SESSION_ENDED);
                }));
        connections.values().removeIf(Map::isEmpty);
    }

    int connectionCount(Long userId) {
        Map<String, WebSocketSession> userConnections = connections.get(userId);
        return userConnections == null ? 0 : userConnections.size();
    }

    private void send(WebSocketSession session, String payload) {
        if (!session.isOpen()) {
            unregister(session);
            return;
        }
        try {
            session.sendMessage(new TextMessage(payload));
        } catch (IOException | RuntimeException exception) {
            LOG.debug("Connexion de chat fermée après un échec d'envoi", exception);
            unregister(session);
            close(session, CloseStatus.SESSION_NOT_RELIABLE);
        }
    }

    private static void close(WebSocketSession session, CloseStatus status) {
        try {
            if (session.isOpen()) {
                session.close(status);
            }
        } catch (IOException exception) {
            LOG.debug("Fermeture de connexion de chat impossible", exception);
        }
    }

    private static Long userId(WebSocketSession session) {
        Object value = session.getAttributes().get(USER_ID);
        if (!(value instanceof Long id)) {
            throw new IllegalStateException("Connexion de chat non authentifiée.");
        }
        return id;
    }
}
