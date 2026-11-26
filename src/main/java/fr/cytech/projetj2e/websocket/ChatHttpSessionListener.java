package fr.cytech.projetj2e.websocket;

import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpSessionEvent;
import jakarta.servlet.http.HttpSessionListener;

/**
 * Ferme les connexions de chat d'une session HTTP détruite (déconnexion ou expiration), avec le code 4401 (T34).
 * Sans cela, une WebSocket ouverte survivrait à la déconnexion du compte.
 */
@Component
public class ChatHttpSessionListener implements HttpSessionListener {

    private final ChatSessionRegistry registry;

    public ChatHttpSessionListener(ChatSessionRegistry registry) {
        this.registry = registry;
    }

    @Override
    public void sessionDestroyed(HttpSessionEvent event) {
        registry.closeHttpSession(event.getSession().getId());
    }
}
