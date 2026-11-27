package fr.cytech.projetj2e.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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

import fr.cytech.projetj2e.dto.NodeDetailResponse;
import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.dto.PageResponse;
import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.AdminRepository;
import fr.cytech.projetj2e.repository.CompanyRepository;
import fr.cytech.projetj2e.service.ExplorationService;
import fr.cytech.projetj2e.service.PermissionService.NodePermissions;
import fr.cytech.projetj2e.service.SessionIdentityService;

/** Contrat HTTP de l'exploration (T18) : routes, format JSON et codes d'erreur. */
@WebMvcTest(ExplorerRestController.class)
class ExplorerRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ExplorationService exploration;

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
    void listsRoots() throws Exception {
        when(exploration.listRoots(actor)).thenReturn(List.of(folder(1L, "Finance")));

        mockMvc.perform(get("/api/folders/roots").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].name").value("Finance"))
                .andExpect(jsonPath("$[0].kind").value("folder"))
                .andExpect(jsonPath("$[0].permissions.view").value(true));
    }

    @Test
    void returnsChildrenWithTheCommonPageFormatAndNoStoragePath() throws Exception {
        PageResponse<NodeResponse> page = new PageResponse<>(List.of(file(5L, "a.txt")),
                new PageResponse.PageMeta(1, 10, 11, 2, false, true));
        when(exploration.listChildren(actor, 1L, 1, 10)).thenReturn(page);

        mockMvc.perform(get("/api/folders/1/children").param("page", "1").param("size", "10").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].kind").value("file"))
                .andExpect(jsonPath("$.items[0].size").value(42))
                .andExpect(jsonPath("$.page.page").value(1))
                .andExpect(jsonPath("$.page.totalElements").value(11))
                .andExpect(jsonPath("$.page.last").value(true))
                .andExpect(content().string(not(containsString("storagePath"))));
    }

    @Test
    void usesDefaultPagination() throws Exception {
        when(exploration.listChildren(actor, 1L, 0, ExplorationService.DEFAULT_PAGE_SIZE))
                .thenReturn(new PageResponse<>(List.of(), new PageResponse.PageMeta(0, 20, 0, 0, true, true)));

        mockMvc.perform(get("/api/folders/1/children").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    void returnsNodeDetailWithBreadcrumb() throws Exception {
        when(exploration.getNode(actor, 5L)).thenReturn(new NodeDetailResponse(file(5L, "a.txt"),
                List.of(new NodeDetailResponse.BreadcrumbItem(1L, "Finance"))));

        mockMvc.perform(get("/api/nodes/5").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.node.name").value("a.txt"))
                .andExpect(jsonPath("$.path[0].name").value("Finance"));
    }

    @Test
    void mapsServiceErrorsToJsonErrors() throws Exception {
        when(exploration.getNode(eq(actor), anyLong())).thenThrow(new ResourceNotFoundException("Élément introuvable."));
        mockMvc.perform(get("/api/nodes/99").session(session))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        when(exploration.listChildren(eq(actor), anyLong(), anyInt(), anyInt()))
                .thenThrow(new IllegalArgumentException("La taille de page doit être comprise entre 1 et 100."));
        mockMvc.perform(get("/api/folders/1/children").param("size", "500").session(session))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void refusesAnAnonymousSession() throws Exception {
        when(identity.requireActiveMember(any())).thenThrow(new ForbiddenException("Compte membre requis."));

        mockMvc.perform(get("/api/folders/roots"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    private static NodeResponse folder(Long id, String name) {
        return new NodeResponse(id, name, NodeResponse.FOLDER, null, 1L, "Finance", 0,
                new NodeResponse.OwnerResponse(1L, "Ada", "Admin"), Instant.EPOCH, Instant.EPOCH, 0L,
                null, null, null, new NodePermissions(true, true, true, true, true), false);
    }

    private static NodeResponse file(Long id, String name) {
        return new NodeResponse(id, name, NodeResponse.FILE, 1L, 1L, "Finance", 0,
                new NodeResponse.OwnerResponse(1L, "Ada", "Admin"), Instant.EPOCH, Instant.EPOCH, 0L,
                name, "text/plain", 42L, new NodePermissions(true, false, false, false, false), false);
    }
}
