package fr.cytech.projetj2e.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.exception.ConflictException;
import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.model.Folder;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.AdminRepository;
import fr.cytech.projetj2e.repository.CompanyRepository;
import fr.cytech.projetj2e.service.FolderManagementService;
import fr.cytech.projetj2e.service.PermissionService.NodePermissions;
import fr.cytech.projetj2e.service.SessionIdentityService;

/**
 * Contrat HTTP des opérations sur les dossiers (T20).
 * Cette tranche ne charge pas SecurityConfig : l'exigence du jeton CSRF est vérifiée sur l'application démarrée.
 */
@WebMvcTest(FolderRestController.class)
class FolderRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FolderManagementService folders;

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
    void createsAFolder() throws Exception {
        when(folders.createFolder(actor, 1L, "Projets")).thenReturn(folder(7L, "Projets", 1L));

        mockMvc.perform(post("/api/folders").with(csrf()).session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"parentId\":1,\"name\":\"Projets\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.parentId").value(1));
    }

    @Test
    void renamesWithTheExpectedVersion() throws Exception {
        when(folders.renameFolder(actor, 7L, "Archives", 3L)).thenReturn(folder(7L, "Archives", 1L));

        mockMvc.perform(patch("/api/folders/7").with(csrf()).session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Archives\",\"version\":3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Archives"));
    }

    @Test
    void movesANode() throws Exception {
        when(folders.move(eq(actor), eq(7L), eq(2L), isNull())).thenReturn(folder(7L, "Archives", 2L));

        mockMvc.perform(post("/api/nodes/7/move").with(csrf()).session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetFolderId\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.parentId").value(2));
    }

    @Test
    void deletesAFolder() throws Exception {
        mockMvc.perform(delete("/api/folders/7").param("version", "4").with(csrf()).session(session))
                .andExpect(status().isNoContent());

        verify(folders).deleteFolder(actor, 7L, 4L);
    }

    @Test
    void mapsConflictsAndRefusalsToJsonErrors() throws Exception {
        when(folders.renameFolder(eq(actor), anyLong(), any(), any()))
                .thenThrow(new ConflictException("« Archives » a été modifié entre-temps."));
        mockMvc.perform(patch("/api/folders/7").with(csrf()).session(session)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"X\",\"version\":1}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));

        when(folders.move(eq(actor), anyLong(), any(), any()))
                .thenThrow(new ObjectOptimisticLockingFailureException(Folder.class, 7L));
        mockMvc.perform(post("/api/nodes/7/move").with(csrf()).session(session)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"targetFolderId\":2}"))
                .andExpect(status().isConflict());

        doThrow(new ForbiddenException("Suppression refusée.")).when(folders).deleteFolder(actor, 8L, null);
        mockMvc.perform(delete("/api/folders/8").with(csrf()).session(session))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    private static NodeResponse folder(Long id, String name, Long parentId) {
        return new NodeResponse(id, name, NodeResponse.FOLDER, parentId, 1L, "Finance", 0,
                new NodeResponse.OwnerResponse(1L, "Ada", "Admin"), Instant.EPOCH, Instant.EPOCH, 0L,
                null, null, null, new NodePermissions(true, true, true, true, true), false);
    }
}
