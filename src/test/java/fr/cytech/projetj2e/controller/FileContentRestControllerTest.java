package fr.cytech.projetj2e.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.exception.StorageException;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.AdminRepository;
import fr.cytech.projetj2e.repository.CompanyRepository;
import fr.cytech.projetj2e.service.FileContentService;
import fr.cytech.projetj2e.service.FileContentService.FileContent;
import fr.cytech.projetj2e.service.SessionIdentityService;

/** Contrat HTTP de la lecture des contenus (T22) : en-têtes, aperçu, téléchargement, cache et plages. */
@WebMvcTest(FileContentRestController.class)
class FileContentRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FileContentService files;

    @MockitoBean
    private SessionIdentityService identity;

    // Requis par le bean init de ProjetJ2eApplication.
    @MockitoBean
    private AdminRepository adminRepository;

    @MockitoBean
    private CompanyRepository companyRepository;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @TempDir
    Path tempDir;

    private final MockHttpSession session = new MockHttpSession();
    private final User actor = new User();
    private Path text;

    @BeforeEach
    void setUp() throws Exception {
        when(identity.requireActiveMember(any())).thenReturn(actor);
        text = Files.writeString(tempDir.resolve("contenu"), "<script>alert(1)</script>");
    }

    @Test
    void previewServesHtmlAsInlinePlainText() throws Exception {
        when(files.read(actor, 5L)).thenReturn(stored(5L, "page.html", "text/html", text));

        mockMvc.perform(get("/api/files/5/content").session(session))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "text/plain;charset=UTF-8"))
                .andExpect(header().string("Content-Disposition", "inline; filename=\"page.html\"; filename*=UTF-8''page.html"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("ETag", "\"5-2\""))
                .andExpect(header().string("Cache-Control", "no-cache, private"))
                .andExpect(content().string("<script>alert(1)</script>"));
    }

    @Test
    void previewOfAnUnsafeFormatFallsBackToAnAttachment() throws Exception {
        when(files.read(actor, 6L)).thenReturn(stored(6L, "logo.svg", "image/svg+xml", text));

        mockMvc.perform(get("/api/files/6/content").session(session))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/octet-stream"))
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"logo.svg\"; filename*=UTF-8''logo.svg"));
    }

    @Test
    void downloadKeepsTheStoredTypeAndEncodesTheName() throws Exception {
        when(files.read(actor, 5L)).thenReturn(stored(5L, "Bilan été.csv", "text/csv", text));

        mockMvc.perform(get("/api/files/5/download").session(session))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "text/csv"))
                .andExpect(header().string("Content-Disposition",
                        "attachment; filename=\"Bilan ete.csv\"; filename*=UTF-8''Bilan%20%C3%A9t%C3%A9.csv"));
    }

    @Test
    void unchangedVersionIsNotSentAgain() throws Exception {
        when(files.read(actor, 5L)).thenReturn(stored(5L, "a.txt", "text/plain", text));

        mockMvc.perform(get("/api/files/5/content").session(session).header("If-None-Match", "\"5-2\""))
                .andExpect(status().isNotModified());
    }

    @Test
    void rangeRequestsReturnPartialContent() throws Exception {
        when(files.read(actor, 5L)).thenReturn(stored(5L, "a.txt", "text/plain", text));

        mockMvc.perform(get("/api/files/5/download").session(session).header("Range", "bytes=0-7"))
                .andExpect(status().isPartialContent())
                .andExpect(content().string("<script>"));
    }

    @Test
    void refusalsAreJsonErrors() throws Exception {
        when(files.read(eq(actor), eq(7L))).thenThrow(new ResourceNotFoundException("Fichier introuvable."));
        when(files.read(eq(actor), eq(8L))).thenThrow(new StorageException("Le contenu du fichier est indisponible."));

        mockMvc.perform(get("/api/files/7/download").session(session))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mockMvc.perform(get("/api/files/8/content").session(session))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("STORAGE_ERROR"));
    }

    private static FileContent stored(Long id, String name, String type, Path path) throws Exception {
        MediaType mediaType = MediaType.parseMediaType(type);
        Optional<MediaType> preview = switch (type) {
            case "text/html", "text/plain" -> Optional.of(MediaType.parseMediaType("text/plain;charset=UTF-8"));
            default -> Optional.empty();
        };
        return new FileContent(id, 2L, name, mediaType, Files.size(path), preview, path);
    }
}
