package fr.cytech.projetj2e.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

import fr.cytech.projetj2e.dto.FavoriteResponse;
import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.dto.PageResponse;
import fr.cytech.projetj2e.dto.PageResponse.PageMeta;
import fr.cytech.projetj2e.dto.SearchResultResponse;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.AdminRepository;
import fr.cytech.projetj2e.repository.CompanyRepository;
import fr.cytech.projetj2e.service.FavoriteService;
import fr.cytech.projetj2e.service.PermissionService.NodePermissions;
import fr.cytech.projetj2e.service.SearchService;
import fr.cytech.projetj2e.service.SessionIdentityService;

/** Contrat HTTP de la recherche et des favoris (T31). */
@WebMvcTest(SearchRestController.class)
class SearchRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SearchService search;

    @MockitoBean
    private FavoriteService favorites;

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
    void searchPassesFiltersAndReturnsLocations() throws Exception {
        when(search.search(actor, "budget", "file", 2L, 0, 10)).thenReturn(page(new SearchResultResponse(node(true), "Finance / Budget")));

        mockMvc.perform(get("/api/search").param("q", "budget").param("kind", "file").param("departmentId", "2")
                        .param("size", "10").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].node.name").value("budget.txt"))
                .andExpect(jsonPath("$.items[0].node.favorite").value(true))
                .andExpect(jsonPath("$.items[0].location").value("Finance / Budget"));
    }

    @Test
    void invalidSearchIs400() throws Exception {
        when(search.search(actor, null, null, null, 0, 20)).thenThrow(new IllegalArgumentException("Saisissez un texte à rechercher."));

        mockMvc.perform(get("/api/search").session(session))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void favoritesCanBeListedAddedAndRemoved() throws Exception {
        when(favorites.list(actor, 0, 20)).thenReturn(page(new FavoriteResponse(node(true), "Finance", Instant.EPOCH)));
        when(favorites.add(actor, 5L)).thenReturn(node(true));
        when(favorites.add(actor, 6L)).thenThrow(new ResourceNotFoundException("Élément introuvable."));

        mockMvc.perform(get("/api/favorites").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].node.id").value(5))
                .andExpect(jsonPath("$.page.totalElements").value(1));
        mockMvc.perform(put("/api/favorites/5").with(csrf()).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.favorite").value(true));
        mockMvc.perform(put("/api/favorites/6").with(csrf()).session(session))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/favorites/5").with(csrf()).session(session))
                .andExpect(status().isNoContent());
        verify(favorites).remove(actor, 5L);
    }

    private static NodeResponse node(boolean favorite) {
        return new NodeResponse(5L, "budget.txt", NodeResponse.FILE, 1L, 1L, "Finance", 0,
                new NodeResponse.OwnerResponse(1L, "Ada", "Admin"), Instant.EPOCH, Instant.EPOCH, 0L,
                "budget.txt", "text/plain", 5L, new NodePermissions(true, false, false, false, false), favorite);
    }

    private static <T> PageResponse<T> page(T item) {
        return new PageResponse<>(List.of(item), new PageMeta(0, 20, 1, 1, true, true));
    }
}
