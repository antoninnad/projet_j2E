package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
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
import org.springframework.web.multipart.MaxUploadSizeExceededException;

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
 * Écriture des fichiers (T23) sur une base H2 en mémoire et un stockage dans target/test-storage.
 * La transaction de test est annulée : l'effacement de l'ancien contenu après validation n'a donc pas lieu
 * (CompanyStorageTest vérifie les deux issues) ; on vérifie ici qu'il n'est jamais écrasé avant.
 *
 * Finance (0) ─┬─ note.txt (0, admin, Bob contributeur)
 *              ├─ logo.png (0, admin)
 *              └─ Budget (1) ── plan.txt (1)
 * Alice : Finance niveau 1 ; Bob : Finance niveau 0 ; Mallory : autre entreprise.
 */
@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.storage.root=target/test-storage",
        "spring.servlet.multipart.max-file-size=1KB"
})
@Import({ FileManagementService.class, NodeResponseMapper.class, NodeNames.class, ActivityRecorder.class, PermissionService.class,
        CompanyIsolationService.class, CompanyStorage.class,
        BCryptPasswordEncoder.class }) // BCrypt : requis par le bean init de ProjetJ2eApplication
class FileManagementServiceTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private FileManagementService service;

    @Autowired
    private CompanyStorage storage;

    private Company acme;
    private User alice;
    private User bob;
    private User mallory;
    private File note;
    private File logo;
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
        Folder budget = new Folder(admin, "Budget", financeRoot);
        budget.setMinAccessLevel(1);
        em.persist(budget);
        note = stored(admin, "note.txt", financeRoot, "text/plain", "Version 1");
        note.getContributors().add(bob);
        em.persist(note);
        logo = em.persist(stored(admin, "logo.png", financeRoot, "image/png", "PNG"));
        plan = em.persist(stored(admin, "plan.txt", budget, "text/plain", "Plan"));
        em.flush();
    }

    // ---------------------------------------------------------------- Enregistrement d'un texte

    @Test
    void savingTextCreatesANewVersionWithoutOverwritingTheOldContent() throws IOException {
        Path before = storage.resolve(note);
        Long version = note.getVersion();

        NodeResponse saved = service.saveText(alice, note.getId(), "Version 2 — été", version);

        assertEquals(version + 1, saved.version());
        assertEquals("text/plain;charset=UTF-8", saved.contentType());
        assertEquals("Version 2 — été".getBytes(StandardCharsets.UTF_8).length, saved.size());
        Path after = storage.resolve(em.find(File.class, note.getId()));
        assertNotEquals(before, after);
        assertEquals("Version 2 — été", Files.readString(after));
        // L'ancien contenu n'est effacé qu'après validation de la transaction.
        assertEquals("Version 1", Files.readString(before));
    }

    @Test
    void staleOrMissingVersionIsRefusedAndWritesNothing() throws IOException {
        long contents = storedContents();
        Long stale = note.getVersion() - 1;

        assertThrows(ConflictException.class, () -> service.saveText(alice, note.getId(), "Écrasement", stale));
        assertThrows(IllegalArgumentException.class, () -> service.saveText(alice, note.getId(), "Écrasement", null));
        assertThrows(ConflictException.class, () -> service.replace(alice, logo.getId(),
                new MockMultipartFile("file", "logo.png", "image/png", new byte[] { 1 }), logo.getVersion() + 1));

        assertEquals(contents, storedContents());
        assertEquals("Version 1", Files.readString(storage.resolve(note)));
    }

    @Test
    void secondSaveWithTheSameLoadedVersionIsAConflict() {
        Long loaded = note.getVersion();
        service.saveText(alice, note.getId(), "Alice", loaded);
        em.flush();

        // Bob avait ouvert la même version : son enregistrement ne doit pas écraser celui d'Alice.
        assertThrows(ConflictException.class, () -> service.saveText(bob, note.getId(), "Bob", loaded));
    }

    @Test
    void contributorCanSaveButNotDelete() {
        NodeResponse saved = service.saveText(bob, note.getId(), "Bob", note.getVersion());

        assertEquals(3, saved.size());
        assertThrows(ForbiddenException.class, () -> service.delete(bob, note.getId(), null));
        // Sans être contributeur, Bob (L = M) ne peut que consulter.
        assertThrows(ForbiddenException.class, () -> service.replace(bob, logo.getId(),
                new MockMultipartFile("file", "logo.png", "image/png", new byte[] { 1 }), logo.getVersion()));
    }

    @Test
    void textLimitsAndBinaryFilesAreChecked() {
        assertThrows(IllegalArgumentException.class, () -> service.saveText(alice, logo.getId(), "texte", logo.getVersion()));
        assertThrows(IllegalArgumentException.class, () -> service.saveText(alice, note.getId(), null, note.getVersion()));
        assertThrows(MaxUploadSizeExceededException.class,
                () -> service.saveText(alice, note.getId(), "x".repeat(1025), note.getVersion()));
    }

    // ---------------------------------------------------------------- Remplacement

    @Test
    void replacingKeepsTheNameAndTakesTheNewMetadata() throws IOException {
        NodeResponse replaced = service.replace(alice, logo.getId(),
                new MockMultipartFile("file", "C:\\fakepath\\logo-v2.webp", null, new byte[] { 1, 2, 3, 4 }),
                logo.getVersion());

        assertEquals("logo.png", replaced.name());
        assertEquals("logo-v2.webp", replaced.originalFileName());
        assertEquals("image/webp", replaced.contentType());
        assertEquals(4, replaced.size());
        assertEquals(4, Files.size(storage.resolve(em.find(File.class, logo.getId()))));
    }

    @Test
    void replacingRequiresANonEmptyFile() {
        assertThrows(IllegalArgumentException.class, () -> service.replace(alice, logo.getId(), null, logo.getVersion()));
        assertThrows(IllegalArgumentException.class, () -> service.replace(alice, logo.getId(),
                new MockMultipartFile("file", "vide.png", "image/png", new byte[0]), logo.getVersion()));
    }

    // ---------------------------------------------------------------- Renommage

    @Test
    void renamesAFileWithinItsFolder() {
        NodeResponse renamed = service.rename(alice, note.getId(), " notes.md ", note.getVersion());

        assertEquals("notes.md", renamed.name());
        assertThrows(ConflictException.class, () -> service.rename(alice, note.getId(), "LOGO.PNG", null));
        assertThrows(IllegalArgumentException.class, () -> service.rename(alice, note.getId(), "a/b", null));
        assertThrows(ForbiddenException.class, () -> service.rename(bob, logo.getId(), "x.png", null));
    }

    // ---------------------------------------------------------------- Suppression

    @Test
    void deletingRemovesTheFileAndKeepsTheContentUntilCommit() {
        Path content = storage.resolve(note);
        Long id = note.getId();

        service.delete(alice, id, note.getVersion());
        em.clear();

        assertNull(em.find(File.class, id));
        assertTrue(Files.exists(content));
    }

    @Test
    void invisibleOrForeignFilesAreNotFound() {
        assertThrows(ResourceNotFoundException.class, () -> service.delete(bob, plan.getId(), null));
        assertThrows(ResourceNotFoundException.class, () -> service.saveText(bob, plan.getId(), "x", plan.getVersion()));
        assertThrows(ResourceNotFoundException.class, () -> service.delete(mallory, note.getId(), null));
        assertThrows(ResourceNotFoundException.class, () -> service.rename(mallory, note.getId(), "x", null));
    }

    // ---------------------------------------------------------------- Outils

    private long storedContents() throws IOException {
        try (Stream<Path> files = Files.list(storage.companyDirectory(acme))) {
            return files.count();
        }
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
