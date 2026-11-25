package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.exception.StorageException;
import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.Folder;
import fr.cytech.projetj2e.model.Membership;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.service.FileContentService.FileContent;

/**
 * Lecture des contenus (T22) sur une base H2 en mémoire et un stockage dans target/test-storage.
 *
 * Finance (0) ─┬─ note.txt (0)
 *              └─ Budget (1) ── plan.pdf (1)
 * Alice : Finance niveau 1 ; Bob : Finance niveau 0 ; Mallory : autre entreprise.
 */
@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.storage.root=target/test-storage"
})
@Import({ FileContentService.class, PermissionService.class, CompanyIsolationService.class, CompanyStorage.class,
        BCryptPasswordEncoder.class }) // BCrypt : requis par le bean init de ProjetJ2eApplication
class FileContentServiceTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private FileContentService service;

    @Autowired
    private CompanyStorage storage;

    private Company acme;
    private User alice;
    private User bob;
    private User mallory;
    private Folder budget;
    private File note;
    private File plan;

    @BeforeEach
    void setUp() {
        acme = em.persist(new Company("Acme", "ACME"));
        Company other = em.persist(new Company("Autre", "AUTRE"));
        Department finance = em.persist(new Department("Finance", acme));
        User admin = em.persist(user("admin", acme, UserRole.COMPANY_ADMIN));
        alice = em.persist(user("alice", acme, UserRole.MEMBER));
        bob = em.persist(user("bob", acme, UserRole.MEMBER));
        mallory = em.persist(user("mallory", other, UserRole.COMPANY_ADMIN));
        em.persist(new Membership(alice, finance, 1));
        em.persist(new Membership(bob, finance, 0));

        Folder financeRoot = em.persist(Folder.createRoot(admin, finance));
        budget = new Folder(admin, "Budget", financeRoot);
        budget.setMinAccessLevel(1);
        em.persist(budget);
        note = em.persist(stored(admin, "note.txt", financeRoot, "text/plain", "Bonjour"));
        plan = em.persist(stored(admin, "plan.pdf", budget, "application/pdf", "%PDF-1.7"));
        em.flush();
    }

    @Test
    void readsAVisibleFileWithoutExposingMoreThanNeeded() throws Exception {
        FileContent content = service.read(bob, note.getId());

        assertEquals("note.txt", content.name());
        assertEquals(MediaType.TEXT_PLAIN, content.contentType());
        assertEquals(Optional.of(MediaType.parseMediaType("text/plain;charset=UTF-8")), content.previewType());
        assertEquals(note.getVersion(), content.version());
        assertEquals("Bonjour", Files.readString(content.path()));
        assertTrue(content.path().startsWith(storage.companyDirectory(acme)));
    }

    @Test
    void levelAboveTheThresholdIsRequired() {
        assertEquals(MediaType.APPLICATION_PDF, service.read(alice, plan.getId()).contentType());
        // Bob (niveau 0) ne voit pas Budget (seuil 1) : traité comme inexistant.
        assertThrows(ResourceNotFoundException.class, () -> service.read(bob, plan.getId()));
    }

    @Test
    void otherCompaniesFoldersAndUnknownIdsAreNotFound() {
        assertThrows(ResourceNotFoundException.class, () -> service.read(mallory, note.getId()));
        assertThrows(ResourceNotFoundException.class, () -> service.read(alice, budget.getId()));
        assertThrows(ResourceNotFoundException.class, () -> service.read(alice, 999_999L));
    }

    @Test
    void missingContentOnDiskIsAStorageError() throws Exception {
        Files.delete(storage.resolve(note));

        assertThrows(StorageException.class, () -> service.read(alice, note.getId()));
    }

    @Test
    void onlyPassiveFormatsArePreviewed() {
        assertEquals(Optional.of(MediaType.parseMediaType("text/plain;charset=UTF-8")), preview("text/html"));
        assertEquals(Optional.of(MediaType.parseMediaType("text/plain;charset=ISO-8859-1")), preview("text/csv;charset=ISO-8859-1"));
        assertEquals(Optional.of(MediaType.parseMediaType("text/plain;charset=UTF-8")), preview("application/json"));
        assertEquals(Optional.of(MediaType.IMAGE_PNG), preview("image/png"));
        assertEquals(Optional.of(MediaType.APPLICATION_PDF), preview("application/pdf"));
        assertEquals(Optional.empty(), preview("image/svg+xml"));
        assertEquals(Optional.empty(), preview("application/zip"));
        assertEquals(Optional.empty(), preview("pas un type"));
        assertEquals(MediaType.APPLICATION_OCTET_STREAM, FileContentService.storedType("text/*"));
    }

    private static Optional<MediaType> preview(String stored) {
        return FileContentService.previewType(FileContentService.storedType(stored));
    }

    private File stored(User owner, String name, Folder parent, String type, String content) {
        CompanyStorage.StoredContent written = storage.store(acme,
                new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8)));
        return new File(owner, name, parent, name, type, written.storagePath(), written.size());
    }

    private static User user(String username, Company company, UserRole role) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setFirstName("Prénom");
        user.setLastName("Nom");
        user.setPasswordHash("hash");
        user.setStatus(AccountStatus.ACTIVE);
        user.setRole(role);
        user.setCompany(company);
        return user;
    }
}
