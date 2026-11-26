package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;

import fr.cytech.projetj2e.dto.ChatMessageResponse;
import fr.cytech.projetj2e.dto.ConversationResponse;
import fr.cytech.projetj2e.dto.MessagePageResponse;
import fr.cytech.projetj2e.dto.PageResponse;
import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.ChatMessage;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;

/**
 * Chat privé persistant (T33) sur une base H2 en mémoire.
 * Acme : Alice, Bob, Dave (administrateur), Carol (en attente) ; Autre : Mallory.
 */
@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import({ ChatService.class, CompanyIsolationService.class,
        BCryptPasswordEncoder.class }) // BCrypt : requis par le bean init de ProjetJ2eApplication
@RecordApplicationEvents
class ChatServiceTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private ChatService chat;

    @Autowired
    private ApplicationEvents events;

    private User alice;
    private User bob;
    private User carol;
    private User dave;
    private User mallory;

    @BeforeEach
    void setUp() {
        Company acme = em.persist(new Company("Acme", "ACME"));
        Company other = em.persist(new Company("Autre", "AUTRE"));
        alice = em.persist(user("alice", acme, UserRole.MEMBER, AccountStatus.ACTIVE));
        bob = em.persist(user("bob", acme, UserRole.MEMBER, AccountStatus.ACTIVE));
        carol = em.persist(user("carol", acme, UserRole.MEMBER, AccountStatus.PENDING));
        dave = em.persist(user("dave", acme, UserRole.COMPANY_ADMIN, AccountStatus.ACTIVE));
        mallory = em.persist(user("mallory", other, UserRole.COMPANY_ADMIN, AccountStatus.ACTIVE));
        em.flush();
    }

    // ---------------------------------------------------------------- Conversations

    @Test
    void oneConversationPerPairWhoeverOpensIt() {
        ConversationResponse fromAlice = chat.open(alice, bob.getId());
        ConversationResponse fromBob = chat.open(bob, alice.getId());

        assertEquals(fromAlice.id(), fromBob.id());
        assertEquals(bob.getId(), fromAlice.peer().id());
        assertEquals(alice.getId(), fromBob.peer().id());
        assertTrue(fromAlice.canSend());
        assertNull(fromAlice.lastMessage());
        assertEquals(0, fromAlice.unreadCount());
    }

    @Test
    void onlyActiveColleaguesCanBeContacted() {
        assertThrows(IllegalArgumentException.class, () -> chat.open(alice, alice.getId()));
        assertThrows(ResourceNotFoundException.class, () -> chat.open(alice, mallory.getId()));
        assertThrows(ResourceNotFoundException.class, () -> chat.open(alice, carol.getId()));
        assertThrows(ResourceNotFoundException.class, () -> chat.open(alice, 999_999L));
        assertThrows(ForbiddenException.class, () -> chat.open(carol, alice.getId()));
    }

    @Test
    void onlyTheTwoParticipantsCanAccessTheConversation() {
        Long id = chat.open(alice, bob.getId()).id();
        chat.send(alice, id, "Confidentiel", null);

        // Dave est administrateur de l'entreprise : il ne lit pas pour autant les conversations privées.
        assertThrows(ResourceNotFoundException.class, () -> chat.get(dave, id));
        assertThrows(ResourceNotFoundException.class, () -> chat.history(dave, id, null, null, 10));
        assertThrows(ResourceNotFoundException.class, () -> chat.send(dave, id, "Intrusion", null));
        assertThrows(ResourceNotFoundException.class, () -> chat.markRead(dave, id, null));
        assertThrows(ResourceNotFoundException.class, () -> chat.history(mallory, id, null, null, 10));
        assertEquals(0, chat.list(dave, 0, 20).items().size());
    }

    @Test
    void listShowsTheMostRecentlyActiveConversationFirst() {
        Long withBob = chat.open(alice, bob.getId()).id();
        Long withDave = chat.open(alice, dave.getId()).id();
        chat.send(bob, withBob, "Tu as vu le budget ?", null);

        PageResponse<ConversationResponse> page = chat.list(alice, 0, 20);

        assertEquals(List.of(withBob, withDave), page.items().stream().map(ConversationResponse::id).toList());
        assertEquals("Tu as vu le budget ?", page.items().get(0).lastMessage().content());
        assertEquals(1, page.items().get(0).unreadCount());
        assertEquals(2, page.page().totalElements());
        assertThrows(IllegalArgumentException.class, () -> chat.list(alice, 0, 0));
    }

    // ---------------------------------------------------------------- Envoi et historique

    @Test
    void historyIsPagedChronologicallyWithCursors() {
        Long id = chat.open(alice, bob.getId()).id();
        List<Long> sent = IntStream.rangeClosed(1, 5)
                .mapToObj(i -> chat.send(i % 2 == 0 ? bob : alice, id, "m" + i, null).message().id())
                .toList();

        MessagePageResponse latest = chat.history(alice, id, null, null, 2);
        assertEquals(List.of("m4", "m5"), contents(latest));
        assertTrue(latest.hasMore());

        MessagePageResponse older = chat.history(alice, id, sent.get(3), null, 2);
        assertEquals(List.of("m2", "m3"), contents(older));
        assertTrue(older.hasMore());
        assertEquals(List.of("m1"), contents(chat.history(alice, id, sent.get(1), null, 2)));
        assertFalse(chat.history(alice, id, sent.get(1), null, 2).hasMore());

        // Rattrapage après coupure : les messages qui suivent le dernier reçu.
        MessagePageResponse missed = chat.history(bob, id, null, sent.get(2), 10);
        assertEquals(List.of("m4", "m5"), contents(missed));
        assertFalse(missed.hasMore());
        assertTrue(missed.items().get(0).mine()); // m4 a été envoyé par Bob

        assertThrows(IllegalArgumentException.class, () -> chat.history(alice, id, 1L, 1L, 10));
        assertThrows(IllegalArgumentException.class, () -> chat.history(alice, id, null, null, 101));
    }

    @Test
    void resendingTheSameClientMessageIdDoesNotDuplicate() {
        Long id = chat.open(alice, bob.getId()).id();

        ChatService.SendResult first = chat.send(alice, id, "Bonjour", "c-42");
        ChatService.SendResult again = chat.send(alice, id, "Bonjour", " c-42 ");

        assertTrue(first.created());
        assertFalse(again.created());
        assertEquals(first.message().id(), again.message().id());
        assertEquals(1, chat.history(bob, id, null, null, 10).items().size());
        // Le même identifiant client chez l'autre participant est un autre message.
        assertTrue(chat.send(bob, id, "Salut", "c-42").created());
        assertEquals(2, events.stream(ChatMessageSentEvent.class).count());
    }

    @Test
    void sentMessagesAreValidatedAndAnnouncedWithoutTheirContent() {
        Long id = chat.open(alice, bob.getId()).id();

        ChatMessageResponse sent = chat.send(alice, id, "  Réunion à 14 h  ", null).message();

        assertEquals("Réunion à 14 h", sent.content());
        assertTrue(sent.mine());
        assertEquals(List.of(new ChatMessageSentEvent(id, sent.id(), alice.getId(), bob.getId())),
                events.stream(ChatMessageSentEvent.class).toList());
        assertThrows(IllegalArgumentException.class, () -> chat.send(alice, id, "   ", null));
        assertThrows(IllegalArgumentException.class, () -> chat.send(alice, id, null, null));
        assertThrows(IllegalArgumentException.class, () -> chat.send(alice, id, "x".repeat(ChatMessage.MAX_LENGTH + 1), null));
        assertThrows(IllegalArgumentException.class, () -> chat.send(alice, id, "x", "c".repeat(65)));
    }

    @Test
    void inactivePeerMakesTheConversationReadOnly() {
        Long id = chat.open(alice, bob.getId()).id();
        chat.send(bob, id, "Je pars demain", null);
        bob.setStatus(AccountStatus.DISABLED);
        em.flush();

        assertThrows(ForbiddenException.class, () -> chat.send(alice, id, "Bon voyage", null));
        ConversationResponse conversation = chat.get(alice, id);
        assertFalse(conversation.canSend());
        assertFalse(conversation.peer().active());
        assertEquals(List.of("Je pars demain"), contents(chat.history(alice, id, null, null, 10)));
    }

    // ---------------------------------------------------------------- Lecture

    @Test
    void unreadCountsFollowTheReadMarker() {
        Long id = chat.open(alice, bob.getId()).id();
        Long first = chat.send(alice, id, "1", null).message().id();
        Long second = chat.send(alice, id, "2", null).message().id();
        chat.send(alice, id, "3", null);

        assertEquals(0, chat.get(alice, id).unreadCount()); // ses propres messages sont lus
        assertEquals(3, chat.get(bob, id).unreadCount());
        assertEquals(3, chat.unreadTotal(bob));

        assertEquals(1, chat.markRead(bob, id, second).unreadCount());
        assertEquals(1, chat.markRead(bob, id, first).unreadCount()); // le marqueur ne recule pas
        ConversationResponse allRead = chat.markRead(bob, id, null);
        assertEquals(0, allRead.unreadCount());
        assertEquals(0, chat.unreadTotal(bob));

        Long otherConversation = chat.open(alice, dave.getId()).id();
        Long foreignMessage = chat.send(dave, otherConversation, "Hors sujet", null).message().id();
        assertThrows(ResourceNotFoundException.class, () -> chat.markRead(bob, id, foreignMessage));
    }

    private static List<String> contents(MessagePageResponse page) {
        return page.items().stream().map(ChatMessageResponse::content).toList();
    }

    private static User user(String username, Company company, UserRole role, AccountStatus status) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setFirstName(Character.toUpperCase(username.charAt(0)) + username.substring(1));
        user.setLastName("Nom");
        user.setPasswordHash("hash");
        user.setStatus(status);
        user.setRole(role);
        user.setCompany(company);
        return user;
    }
}
