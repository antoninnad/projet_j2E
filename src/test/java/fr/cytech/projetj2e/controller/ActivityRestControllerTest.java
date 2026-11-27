package fr.cytech.projetj2e.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import fr.cytech.projetj2e.dto.ActivityResponse;
import fr.cytech.projetj2e.dto.PageResponse;
import fr.cytech.projetj2e.dto.PageResponse.PageMeta;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.AdminRepository;
import fr.cytech.projetj2e.repository.CompanyRepository;
import fr.cytech.projetj2e.service.ActivityService;
import fr.cytech.projetj2e.service.SessionIdentityService;

/** Contrat HTTP de la consultation de l'activité (T36). */
@WebMvcTest(ActivityRestController.class)
class ActivityRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ActivityService activity;

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
    void feedIsAPageOfEntries() throws Exception {
        when(activity.companyFeed(actor, 1, 10)).thenReturn(page(entry()));

        mockMvc.perform(get("/api/activity").param("page", "1").param("size", "10").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].action").value("FOLDER_RENAMED"))
                .andExpect(jsonPath("$.items[0].label").value("a renommé le dossier"))
                .andExpect(jsonPath("$.items[0].actor.firstName").value("Alice"))
                .andExpect(jsonPath("$.page.totalElements").value(1));
    }

    @Test
    void nodeHistoryOfAnInvisibleNodeIs404() throws Exception {
        when(activity.nodeHistory(actor, 5L, 0, 20)).thenReturn(page(entry()));
        when(activity.nodeHistory(actor, 6L, 0, 20)).thenThrow(new ResourceNotFoundException("Élément introuvable."));

        mockMvc.perform(get("/api/nodes/5/activity").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].nodeName").value("Archives 2025"));
        mockMvc.perform(get("/api/nodes/6/activity").session(session))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    private static ActivityResponse entry() {
        return new ActivityResponse(1L, "FOLDER_RENAMED", "DOCUMENT", "a renommé le dossier", Instant.EPOCH,
                new ActivityResponse.ActorResponse(2L, "Alice", "Martin"), 5L, "Archives 2025", "folder",
                1L, "Finance", null, null, "« Archives » → « Archives 2025 »");
    }

    private static PageResponse<ActivityResponse> page(ActivityResponse entry) {
        return new PageResponse<>(List.of(entry), new PageMeta(0, 20, 1, 1, true, true));
    }
}
