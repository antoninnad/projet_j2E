package fr.cytech.projetj2e.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import fr.cytech.projetj2e.dto.ChatMessageResponse;
import fr.cytech.projetj2e.dto.ChatParticipantResponse;
import fr.cytech.projetj2e.dto.ConversationResponse;
import fr.cytech.projetj2e.dto.MessagePageResponse;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.AdminRepository;
import fr.cytech.projetj2e.repository.CompanyRepository;
import fr.cytech.projetj2e.service.ChatService;
import fr.cytech.projetj2e.service.SessionIdentityService;

/**
 * Contrat HTTP du chat persistant (T33).
 * Cette tranche ne charge pas SecurityConfig : l'exigence du jeton CSRF est vérifiée sur l'application démarrée.
 */
@WebMvcTest(ChatRestController.class)
class ChatRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ChatService chat;

    @MockitoBean
    private SessionIdentityService identity;

    // Requis par le bean init de ProjetJ2eApplication.
    @MockitoBean
    private AdminRepository adminRepository;

    @MockitoBean
    private CompanyRepository companyRepository;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    private final MockHttpSession session = new MockHttpSession();
    private final User actor = new User();

    @BeforeEach
    void setUp() {
        when(identity.requireActiveMember(any())).thenReturn(actor);
    }

    @Test
    void opensAConversationWithAColleague() throws Exception {
        when(chat.open(actor, 2L)).thenReturn(conversation(3L, 0));

        mockMvc.perform(post("/api/conversations").with(csrf()).session(session)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"peerId\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(3))
                .andExpect(jsonPath("$.peer.firstName").value("Bob"))
                .andExpect(jsonPath("$.peer.email").doesNotExist())
                .andExpect(jsonPath("$.canSend").value(true));
    }

    @Test
    void newMessageIs201AndAResendIs200() throws Exception {
        when(chat.send(actor, 3L, "Bonjour", "c-1"))
                .thenReturn(new ChatService.SendResult(message(10L, "Bonjour"), true))
                .thenReturn(new ChatService.SendResult(message(10L, "Bonjour"), false));
        String body = "{\"content\":\"Bonjour\",\"clientMessageId\":\"c-1\"}";

        mockMvc.perform(post("/api/conversations/3/messages").with(csrf()).session(session)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.clientMessageId").value("c-1"));
        mockMvc.perform(post("/api/conversations/3/messages").with(csrf()).session(session)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    void historyPassesTheCursorsAndSize() throws Exception {
        when(chat.history(actor, 3L, null, 9L, 50))
                .thenReturn(new MessagePageResponse(List.of(message(10L, "Bonjour")), false));

        mockMvc.perform(get("/api/conversations/3/messages").param("after", "9").param("size", "50").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].content").value("Bonjour"))
                .andExpect(jsonPath("$.hasMore").value(false));
    }

    @Test
    void marksReadWithOrWithoutAMessageId() throws Exception {
        when(chat.markRead(actor, 3L, 10L)).thenReturn(conversation(3L, 0));
        when(chat.markRead(actor, 3L, null)).thenReturn(conversation(3L, 0));

        mockMvc.perform(post("/api/conversations/3/read").with(csrf()).session(session)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"lastMessageId\":10}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));
        mockMvc.perform(post("/api/conversations/3/read").with(csrf()).session(session))
                .andExpect(status().isOk());
    }

    @Test
    void unreadTotalAndUnknownConversation() throws Exception {
        when(chat.unreadTotal(actor)).thenReturn(4L);
        when(chat.get(actor, 99L)).thenThrow(new ResourceNotFoundException("Conversation introuvable."));
        when(chat.history(any(), any(), isNull(), isNull(), any(Integer.class)))
                .thenThrow(new ResourceNotFoundException("Conversation introuvable."));

        mockMvc.perform(get("/api/conversations/unread").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(4));
        mockMvc.perform(get("/api/conversations/99").session(session))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    private static ConversationResponse conversation(Long id, long unread) {
        return new ConversationResponse(id, new ChatParticipantResponse(2L, "Bob", "Nom", "bob", true),
                null, unread, null, true, Instant.EPOCH, Instant.EPOCH);
    }

    private static ChatMessageResponse message(Long id, String content) {
        return new ChatMessageResponse(id, 3L, 1L, content, Instant.EPOCH, "c-1", true);
    }
}
