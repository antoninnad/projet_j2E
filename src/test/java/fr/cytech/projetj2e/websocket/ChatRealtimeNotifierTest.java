package fr.cytech.projetj2e.websocket;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.ChatMessage;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.Conversation;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.ChatMessageRepository;
import fr.cytech.projetj2e.repository.UserRepository;
import fr.cytech.projetj2e.service.ChatMessageSentEvent;
import fr.cytech.projetj2e.service.ChatReadEvent;
import tools.jackson.databind.json.JsonMapper;

/** Diffusion après validation (T34) : seuls les participants connectés et actifs reçoivent les événements. */
class ChatRealtimeNotifierTest {

    private final ChatSessionRegistry registry = mock(ChatSessionRegistry.class);
    private final ChatMessageRepository messages = mock(ChatMessageRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final ChatRealtimeNotifier notifier =
            new ChatRealtimeNotifier(registry, messages, users, JsonMapper.builder().build());

    private User alice;
    private User bob;

    @BeforeEach
    void setUp() {
        Company acme = new Company("Acme", "ACME");
        acme.setId(1L);
        alice = user(10L, acme);
        bob = user(20L, acme);
        ChatMessage message = new ChatMessage(new Conversation(alice, bob, Instant.EPOCH), alice, "Bonjour", "c-1", Instant.EPOCH);
        when(messages.findById(5L)).thenReturn(Optional.of(message));
        when(users.findById(10L)).thenReturn(Optional.of(alice));
        when(users.findById(20L)).thenReturn(Optional.of(bob));
        when(registry.isConnected(anyLong())).thenReturn(true);
    }

    @Test
    void bothParticipantsReceiveTheMessageWithTheirOwnPointOfView() {
        notifier.onMessageSent(new ChatMessageSentEvent(3L, 5L, 10L, 20L));

        verify(registry).sendToUser(eq(10L), argThat(json -> json.contains("\"type\":\"message.created\"")
                && json.contains("\"content\":\"Bonjour\"") && json.contains("\"mine\":true")));
        verify(registry).sendToUser(eq(20L), argThat(json -> json.contains("\"mine\":false")));
        verify(registry, never()).sendToUser(eq(30L), anyString());
    }

    @Test
    void disabledRecipientIsDisconnectedInsteadOfNotified() {
        bob.setStatus(AccountStatus.DISABLED);

        notifier.onMessageSent(new ChatMessageSentEvent(3L, 5L, 10L, 20L));

        verify(registry).closeUser(20L, ChatSessionRegistry.SESSION_ENDED);
        verify(registry, never()).sendToUser(eq(20L), anyString());
        verify(registry).sendToUser(eq(10L), anyString());
    }

    @Test
    void offlineUsersAreSkippedWithoutQueryingTheDatabase() {
        when(registry.isConnected(20L)).thenReturn(false);

        notifier.onMessageSent(new ChatMessageSentEvent(3L, 5L, 10L, 20L));

        verify(users, never()).findById(20L);
        verify(registry, never()).sendToUser(eq(20L), anyString());
    }

    @Test
    void readReceiptsGoToBothParticipants() {
        notifier.onRead(new ChatReadEvent(3L, 20L, 10L, 5L));

        String expected = "{\"type\":\"conversation.read\",\"conversationId\":3,\"readerId\":20,\"lastReadMessageId\":5}";
        verify(registry).sendToUser(20L, expected);
        verify(registry).sendToUser(10L, expected);
    }

    private static User user(Long id, Company company) {
        User user = new User();
        user.setId(id);
        user.setUsername("u" + id);
        user.setCompany(company);
        user.setStatus(AccountStatus.ACTIVE);
        return user;
    }
}
