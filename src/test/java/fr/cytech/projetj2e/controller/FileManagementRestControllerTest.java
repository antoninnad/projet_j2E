package fr.cytech.projetj2e.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.multipart.MultipartFile;

import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.exception.ConflictException;
import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.AdminRepository;
import fr.cytech.projetj2e.repository.CompanyRepository;
import fr.cytech.projetj2e.service.FileManagementService;
import fr.cytech.projetj2e.service.PermissionService.NodePermissions;
import fr.cytech.projetj2e.service.SessionIdentityService;

/**
 * Contrat HTTP de l'écriture des fichiers (T23).
 * Cette tranche ne charge pas SecurityConfig : l'exigence du jeton CSRF est vérifiée sur l'application démarrée.
 */
@WebMvcTest(FileManagementRestController.class)
class FileManagementRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FileManagementService files;

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
    void savesTextAndReturnsTheNewVersion() throws Exception {
        when(files.saveText(actor, 5L, "Bonjour", 3L)).thenReturn(file(5L, "note.txt", 4L));

        mockMvc.perform(put("/api/files/5/content").with(csrf()).session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Bonjour\",\"version\":3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(4));
    }

    @Test
    void staleVersionIsAConflict() throws Exception {
        when(files.saveText(actor, 5L, "Bonjour", 2L))
                .thenThrow(new ConflictException("« note.txt » a été modifié entre-temps ; rechargez-le avant de réessayer."));
        when(files.saveText(actor, 5L, "Course", 3L))
                .thenThrow(new ObjectOptimisticLockingFailureException(File.class, 5L));

        mockMvc.perform(put("/api/files/5/content").with(csrf()).session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Bonjour\",\"version\":2}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
        // Modification concurrente détectée par @Version au moment de l'écriture.
        mockMvc.perform(put("/api/files/5/content").with(csrf()).session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Course\",\"version\":3}"))
                .andExpect(status().isConflict());
    }

    @Test
    void replacesWithAMultipartFileAndItsVersion() throws Exception {
        when(files.replace(eq(actor), eq(5L), any(MultipartFile.class), eq(3L))).thenReturn(file(5L, "logo.png", 4L));

        mockMvc.perform(multipart("/api/files/5/replace")
                        .file(new MockMultipartFile("file", "logo-v2.png", "image/png", new byte[] { 1 }))
                        .param("version", "3")
                        .with(csrf()).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("logo.png"));
    }

    @Test
    void renamesAFile() throws Exception {
        when(files.rename(actor, 5L, "notes.md", null)).thenReturn(file(5L, "notes.md", 4L));

        mockMvc.perform(patch("/api/files/5").with(csrf()).session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"notes.md\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("notes.md"));
    }

    @Test
    void deletesAFileOrExplainsTheRefusal() throws Exception {
        mockMvc.perform(delete("/api/files/5").param("version", "3").with(csrf()).session(session))
                .andExpect(status().isNoContent());
        verify(files).delete(actor, 5L, 3L);

        doThrow(new ForbiddenException("Suppression refusée.")).when(files).delete(actor, 6L, null);
        mockMvc.perform(delete("/api/files/6").with(csrf()).session(session))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Suppression refusée."));
    }

    private static NodeResponse file(Long id, String name, Long version) {
        return new NodeResponse(id, name, NodeResponse.FILE, 1L, 1L, "Finance", 0,
                new NodeResponse.OwnerResponse(1L, "Ada", "Admin"), Instant.EPOCH, Instant.EPOCH, version,
                name, "text/plain", 5L, new NodePermissions(true, true, true, true, true));
    }
}
