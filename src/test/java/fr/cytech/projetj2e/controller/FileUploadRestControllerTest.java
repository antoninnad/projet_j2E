package fr.cytech.projetj2e.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.exception.ConflictException;
import fr.cytech.projetj2e.exception.StorageException;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.AdminRepository;
import fr.cytech.projetj2e.repository.CompanyRepository;
import fr.cytech.projetj2e.service.FileUploadService;
import fr.cytech.projetj2e.service.PermissionService.NodePermissions;
import fr.cytech.projetj2e.service.SessionIdentityService;

/**
 * Contrat HTTP de l'import de fichiers (T21).
 * Cette tranche ne charge ni SecurityConfig ni la vraie limite multipart :
 * le refus sans jeton CSRF et le 413 sur un vrai envoi sont vérifiés sur l'application démarrée.
 */
@WebMvcTest(FileUploadRestController.class)
@TestPropertySource(properties = "spring.servlet.multipart.max-file-size=20MB")
class FileUploadRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FileUploadService uploads;

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
    private final MockMultipartFile content = new MockMultipartFile("file", "bilan.txt", "text/plain", "Bilan".getBytes());

    @BeforeEach
    void setUp() {
        when(identity.requireActiveMember(any())).thenReturn(actor);
    }

    @Test
    void uploadsAFileAndDescribesItWithoutItsStoragePath() throws Exception {
        when(uploads.upload(eq(actor), eq(4L), any(MultipartFile.class))).thenReturn(file(9L, "bilan.txt", 4L));

        mockMvc.perform(multipart("/api/folders/4/files").file(content).with(csrf()).session(session))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(9))
                .andExpect(jsonPath("$.kind").value("file"))
                .andExpect(jsonPath("$.size").value(5))
                .andExpect(jsonPath("$.storagePath").doesNotExist());
    }

    @Test
    void missingFilePartReachesTheServiceForAClearMessage() throws Exception {
        when(uploads.upload(eq(actor), eq(4L), isNull()))
                .thenThrow(new IllegalArgumentException("Aucun fichier reçu (champ « file » attendu)."));

        mockMvc.perform(multipart("/api/folders/4/files").with(csrf()).session(session))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void duplicateNameIsAConflict() throws Exception {
        when(uploads.upload(eq(actor), eq(4L), any(MultipartFile.class)))
                .thenThrow(new ConflictException("Un élément nommé « bilan.txt » existe déjà dans « Finance »."));

        mockMvc.perform(multipart("/api/folders/4/files").file(content).with(csrf()).session(session))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    @Test
    void tooLargeUploadIs413WithTheLimit() throws Exception {
        when(uploads.upload(eq(actor), eq(4L), any(MultipartFile.class)))
                .thenThrow(new MaxUploadSizeExceededException(20L * 1024 * 1024));

        mockMvc.perform(multipart("/api/folders/4/files").file(content).with(csrf()).session(session))
                .andExpect(status().is(413))
                .andExpect(jsonPath("$.code").value("PAYLOAD_TOO_LARGE"))
                .andExpect(jsonPath("$.message").value("Le fichier dépasse la taille maximale autorisée (20 Mo)."));
    }

    @Test
    void storageFailureIs500WithoutDetails() throws Exception {
        when(uploads.upload(eq(actor), eq(4L), any(MultipartFile.class)))
                .thenThrow(new StorageException("Le fichier n'a pas pu être enregistré.", new java.io.IOException("/srv/storage/x")));

        mockMvc.perform(multipart("/api/folders/4/files").file(content).with(csrf()).session(session))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("STORAGE_ERROR"))
                .andExpect(jsonPath("$.message").value("Le fichier n'a pas pu être enregistré."));
    }

    private static NodeResponse file(Long id, String name, Long parentId) {
        return new NodeResponse(id, name, NodeResponse.FILE, parentId, 1L, "Finance", 0,
                new NodeResponse.OwnerResponse(1L, "Ada", "Admin"), Instant.EPOCH, Instant.EPOCH, 0L,
                name, "text/plain", 5L, new NodePermissions(true, true, true, true, true));
    }
}
