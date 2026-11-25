package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.exception.ConflictException;
import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.Folder;
import fr.cytech.projetj2e.model.Membership;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;

/**
 * Import de fichiers (T21) sur une base H2 en mémoire et un stockage dans target/test-storage.
 *
 * Arborescence (seuil M entre parenthèses) : Finance (0) ─┬─ Budget (1)
 *                                                          └─ a.txt (0)
 * Autre entreprise : Ventes (0).
 * Alice : Finance niveau 1 ; Bob : Finance niveau 0.
 */
@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.storage.root=target/test-storage"
})
@Import({ FileUploadService.class, NodeResponseMapper.class, NodeNames.class, PermissionService.class,
        CompanyIsolationService.class, CompanyStorage.class,
        BCryptPasswordEncoder.class }) // BCrypt : requis par le bean init de ProjetJ2eApplication
class FileUploadServiceTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private FileUploadService service;

    @Autowired
    private CompanyStorage storage;

    private Company acme;
    private User admin;
    private User alice;
    private User bob;
    private User mallory;
    private Folder financeRoot;
    private Folder budget;

    @BeforeEach
    void setUp() {
        acme = em.persist(new Company("Acme", "ACME"));
        Company other = em.persist(new Company("Autre", "AUTRE"));
        Department finance = em.persist(new Department("Finance", acme));
        Department ventes = em.persist(new Department("Ventes", other));

        admin = em.persist(user("admin", acme, UserRole.COMPANY_ADMIN));
        alice = em.persist(user("alice", acme, UserRole.MEMBER));
        bob = em.persist(user("bob", acme, UserRole.MEMBER));
        mallory = em.persist(user("mallory", other, UserRole.COMPANY_ADMIN));
        em.persist(new Membership(alice, finance, 1));
        em.persist(new Membership(bob, finance, 0));

        financeRoot = em.persist(Folder.createRoot(admin, finance));
        em.persist(Folder.createRoot(mallory, ventes));
        budget = new Folder(admin, "Budget", financeRoot);
        budget.setMinAccessLevel(1);
        em.persist(budget);
        em.persist(new File(admin, "a.txt", financeRoot, "a.txt", "text/plain", storage.newStoragePath(acme), 1));
        em.flush();
    }

    @Test
    void storesTheContentPrivatelyWithItsMetadata() throws IOException {
        byte[] content = "Bilan 2026".getBytes(StandardCharsets.UTF_8);

        NodeResponse created = service.upload(alice, financeRoot.getId(),
                new MockMultipartFile("file", "bilan.txt", "text/plain", content));

        assertEquals("bilan.txt", created.name());
        assertEquals("file", created.kind());
        assertEquals(financeRoot.getId(), created.parentId());
        assertEquals(alice.getId(), created.owner().id());
        assertEquals("bilan.txt", created.originalFileName());
        assertEquals("text/plain", created.contentType());
        assertEquals(content.length, created.size());
        assertTrue(created.permissions().manage());

        File saved = em.find(File.class, created.id());
        assertTrue(saved.getStoragePath().startsWith("companies/" + acme.getId() + "/"));
        assertTrue(!saved.getStoragePath().contains("bilan"), "le nom sur disque ne reprend pas le nom du client");
        assertEquals("Bilan 2026", Files.readString(storage.resolve(saved)));
    }

    @Test
    void inheritsTheThresholdOfTheTargetFolder() {
        NodeResponse created = service.upload(admin, budget.getId(), multipart("plan.csv", "text/csv", "x"));

        assertEquals(1, created.minAccessLevel());
        assertEquals("Finance", created.departmentName());
    }

    @Test
    void keepsOnlyTheFileNameAndDeducesAMissingContentType() {
        NodeResponse created = service.upload(alice, financeRoot.getId(),
                multipart("C:\\fakepath\\rapport.pdf", null, "%PDF"));

        assertEquals("rapport.pdf", created.name());
        assertEquals("application/pdf", created.contentType());
        assertEquals("application/octet-stream", FileUploadService.contentType("n'importe quoi", "donnees.inconnu"));
        assertEquals("text/plain;charset=UTF-8", FileUploadService.contentType("text/plain;charset=UTF-8", "a"));
    }

    @Test
    void refusedUploadsWriteNothing() throws IOException {
        long before = storedContents();

        // Bob : niveau 0 = seuil 0, ni propriétaire ni contributeur → pas de droit de création.
        assertThrows(ForbiddenException.class, () -> service.upload(bob, financeRoot.getId(), multipart("b.txt", "text/plain", "b")));
        // Budget (seuil 1) est invisible pour Bob ; Finance l'est pour Mallory (autre entreprise).
        assertThrows(ResourceNotFoundException.class, () -> service.upload(bob, budget.getId(), multipart("b.txt", "text/plain", "b")));
        assertThrows(ResourceNotFoundException.class, () -> service.upload(mallory, financeRoot.getId(), multipart("m.txt", "text/plain", "m")));
        // Nom déjà pris (casse ignorée) : le remplacement relève de T23.
        assertThrows(ConflictException.class, () -> service.upload(alice, financeRoot.getId(), multipart("A.TXT", "text/plain", "a")));
        // Fichier absent, vide ou nom invalide.
        assertThrows(IllegalArgumentException.class, () -> service.upload(alice, financeRoot.getId(), null));
        assertThrows(IllegalArgumentException.class, () -> service.upload(alice, financeRoot.getId(), multipart("vide.txt", "text/plain", "")));
        assertThrows(IllegalArgumentException.class, () -> service.upload(alice, financeRoot.getId(), multipart("dossier/", "text/plain", "x")));
        assertThrows(IllegalArgumentException.class, () -> service.upload(alice, financeRoot.getId(), multipart("..", "text/plain", "x")));

        assertEquals(before, storedContents());
    }

    private long storedContents() throws IOException {
        Path directory = storage.companyDirectory(acme);
        if (Files.notExists(directory)) {
            return 0;
        }
        try (Stream<Path> files = Files.list(directory)) {
            return files.count();
        }
    }

    private static MockMultipartFile multipart(String name, String contentType, String content) {
        return new MockMultipartFile("file", name, contentType, content.getBytes(StandardCharsets.UTF_8));
    }

    private static User user(String name, Company company, UserRole role) {
        User user = new User();
        user.setFirstName(name);
        user.setLastName("Test");
        user.setUsername(name);
        user.setEmail(name + "@example.test");
        user.setPasswordHash("hash");
        user.setCompany(company);
        user.setRole(role);
        user.setStatus(AccountStatus.ACTIVE);
        return user;
    }
}
