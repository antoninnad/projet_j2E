package fr.cytech.projetj2e.websocket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

/** Routage des événements vers les connexions de chaque compte et fermetures (T34). */
class ChatSessionRegistryTest {

    private final ChatSessionRegistry registry = new ChatSessionRegistry();

    @Test
    void sendsOnlyToTheConnectionsOfTheTargetUser() throws IOException {
        Connection aliceTab1 = connect(1L, "http-a1");
        Connection aliceTab2 = connect(1L, "http-a2");
        Connection bob = connect(2L, "http-b");

        registry.sendToUser(1L, "{\"type\":\"x\"}");

        assertEquals(List.of("{\"type\":\"x\"}"), aliceTab1.received);
        assertEquals(List.of("{\"type\":\"x\"}"), aliceTab2.received);
        assertTrue(bob.received.isEmpty());
        registry.sendToUser(3L, "personne"); // compte sans connexion : sans effet
    }

    @Test
    void destroyedHttpSessionClosesOnlyItsConnections() throws IOException {
        Connection loggedOut = connect(1L, "http-a1");
        Connection otherTab = connect(1L, "http-a2");

        registry.closeHttpSession("http-a1");

        verify(loggedOut.session).close(ChatSessionRegistry.SESSION_ENDED);
        verify(otherTab.session, never()).close(any());
        assertEquals(1, registry.connectionCount(1L));
    }

    @Test
    void tooManyConnectionsAreRefused() throws IOException {
        for (int i = 0; i < ChatSessionRegistry.MAX_CONNECTIONS_PER_USER; i++) {
            connect(1L, "http-" + i);
        }
        WebSocketSession extra = session(1L, "http-extra");

        assertFalse(registry.register(extra));
        verify(extra).close(ChatSessionRegistry.TOO_MANY_CONNECTIONS);
        assertEquals(ChatSessionRegistry.MAX_CONNECTIONS_PER_USER, registry.connectionCount(1L));
    }

    @Test
    void failingOrClosedConnectionsAreDropped() throws IOException {
        Connection broken = connect(1L, "http-a1");
        doThrow(new IOException("réseau coupé")).when(broken.session).sendMessage(any());
        Connection closed = connect(1L, "http-a2");
        when(closed.session.isOpen()).thenReturn(false);

        registry.sendToUser(1L, "x");

        assertFalse(registry.isConnected(1L));
        verify(broken.session).close(CloseStatus.SESSION_NOT_RELIABLE);
    }

    @Test
    void closingAUserClosesAllTheirConnections() throws IOException {
        Connection tab1 = connect(1L, "http-a1");
        Connection tab2 = connect(1L, "http-a2");

        registry.closeUser(1L, ChatSessionRegistry.SESSION_ENDED);

        verify(tab1.session).close(ChatSessionRegistry.SESSION_ENDED);
        verify(tab2.session).close(ChatSessionRegistry.SESSION_ENDED);
        assertFalse(registry.isConnected(1L));
    }

    private record Connection(WebSocketSession session, List<String> received) {}

    private int sequence;

    private Connection connect(Long userId, String httpSessionId) throws IOException {
        WebSocketSession session = session(userId, httpSessionId);
        List<String> received = new ArrayList<>();
        org.mockito.Mockito.doAnswer(invocation -> {
            received.add(((TextMessage) invocation.getArgument(0)).getPayload());
            return null;
        }).when(session).sendMessage(any());
        assertTrue(registry.register(session));
        return new Connection(session, received);
    }

    private WebSocketSession session(Long userId, String httpSessionId) {
        WebSocketSession session = mock(WebSocketSession.class);
        Map<String, Object> attributes = new HashMap<>();
        attributes.put(ChatSessionRegistry.USER_ID, userId);
        attributes.put(ChatSessionRegistry.HTTP_SESSION_ID, httpSessionId);
        when(session.getId()).thenReturn("ws-" + (sequence++));
        when(session.getAttributes()).thenReturn(attributes);
        when(session.isOpen()).thenReturn(true);
        return session;
    }
}
