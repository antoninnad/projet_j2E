package fr.cytech.projetj2e.configuration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistration;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import fr.cytech.projetj2e.websocket.ChatHandshakeInterceptor;
import fr.cytech.projetj2e.websocket.ChatWebSocketHandler;

/**
 * Point de connexion WebSocket du chat (T34) : ws(s)://hôte/ws/chat, WebSocket natif sans STOMP.
 * Seules les pages de la même origine peuvent l'ouvrir (protection contre le détournement de WebSocket
 * depuis un autre site) ; en développement, l'origine du serveur Vite configurée est aussi acceptée.
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    public static final String CHAT_ENDPOINT = "/ws/chat";

    private final ChatWebSocketHandler handler;
    private final ChatHandshakeInterceptor interceptor;
    private final String devServerUrl;

    public WebSocketConfig(ChatWebSocketHandler handler,
                           ChatHandshakeInterceptor interceptor,
                           @Value("${app.frontend.dev-server-url:}") String devServerUrl) {
        this.handler = handler;
        this.interceptor = interceptor;
        this.devServerUrl = devServerUrl;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        WebSocketHandlerRegistration registration = registry.addHandler(handler, CHAT_ENDPOINT)
                .addInterceptors(interceptor);
        if (devServerUrl != null && !devServerUrl.isBlank()) {
            registration.setAllowedOrigins(devServerUrl.strip().replaceAll("/+$", ""));
        }
    }
}
