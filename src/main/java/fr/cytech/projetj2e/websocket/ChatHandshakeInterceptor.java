package fr.cytech.projetj2e.websocket;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.service.SessionIdentityService;
import jakarta.servlet.http.HttpSession;

/**
 * Authentifie l'ouverture de /ws/chat avec la session HTTP du navigateur (T34) :
 * seul un membre actif connecté obtient une connexion, sinon la poignée de main reçoit 403.
 * L'identifiant du compte et celui de la session HTTP sont gardés sur la connexion :
 * le client ne choisit jamais pour qui il écoute.
 */
@Component
public class ChatHandshakeInterceptor implements HandshakeInterceptor {

    private final SessionIdentityService identity;

    public ChatHandshakeInterceptor(SessionIdentityService identity) {
        this.identity = identity;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler handler, Map<String, Object> attributes) {
        HttpSession session = request instanceof ServletServerHttpRequest servlet
                ? servlet.getServletRequest().getSession(false)
                : null;
        try {
            User user = identity.requireActiveMember(session);
            attributes.put(ChatSessionRegistry.USER_ID, user.getId());
            attributes.put(ChatSessionRegistry.HTTP_SESSION_ID, session.getId());
            return true;
        } catch (ForbiddenException exception) {
            response.setStatusCode(HttpStatus.FORBIDDEN);
            return false;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler handler, Exception exception) {
        // Rien à faire.
    }
}
