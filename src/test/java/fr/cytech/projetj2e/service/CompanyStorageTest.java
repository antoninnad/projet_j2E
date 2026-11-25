package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.Folder;
import fr.cytech.projetj2e.model.User;

/** Cloisonnement des chemins de stockage par entreprise et écriture des contenus (dossier temporaire). */
class CompanyStorageTest {

    @TempDir
    Path tempDir;

    private CompanyStorage storage;
    private Company companyA;
    private Folder rootA;
    private User owner;

    @BeforeEach
    void setUp() {
        storage = new CompanyStorage(tempDir.toString());
        companyA = company("A", 1L);
        owner = new User();
        owner.setCompany(companyA);
        rootA = Folder.createRoot(owner, new Department("Finance", companyA));
    }

    @Test
    void newPathsAreUniqueAndInsideTheCompanyDirectory() {
        String first = storage.newStoragePath(companyA);
        String second = storage.newStoragePath(companyA);

        assertNotEquals(first, second);
        Path resolved = storage.resolve(file(first));
        assertTrue(resolved.startsWith(tempDir.resolve("companies").resolve("1")));
    }

    @Test
    void deletesContentsImmediatelyOutsideATransaction() throws Exception {
        Path content = storage.getRoot().resolve(storage.newStoragePath(companyA));
        Files.createDirectories(content.getParent());
        Files.writeString(content, "contenu");
        Path missing = content.resolveSibling("deja-supprime");

        storage.deleteAfterCommit(List.of(content, missing));

        assertTrue(Files.notExists(content));
    }

    @Test
    void storesContentUnderAGeneratedNameInTheCompanyDirectory() throws Exception {
        CompanyStorage.StoredContent stored = storage.store(companyA,
                new ByteArrayInputStream("contenu".getBytes(StandardCharsets.UTF_8)));

        assertEquals(7, stored.size());
        Path content = storage.resolve(file(stored.storagePath()));
        assertEquals("contenu", Files.readString(content));
    }

    @Test
    void storedContentIsRemovedWhenTheTransactionRollsBack() {
        TransactionSynchronizationManager.initSynchronization();
        try {
            CompanyStorage.StoredContent kept = storage.store(companyA, new ByteArrayInputStream(new byte[] { 1 }));
            completeTransaction(TransactionSynchronization.STATUS_COMMITTED);
            assertTrue(Files.exists(storage.resolve(file(kept.storagePath()))));

            CompanyStorage.StoredContent dropped = storage.store(companyA, new ByteArrayInputStream(new byte[] { 1 }));
            completeTransaction(TransactionSynchronization.STATUS_ROLLED_BACK);
            assertTrue(Files.notExists(storage.resolve(file(dropped.storagePath()))));
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    /** Simule la fin de transaction : appelle puis retire les synchronisations enregistrées. */
    private static void completeTransaction(int status) {
        for (var synchronization : TransactionSynchronizationManager.getSynchronizations()) {
            synchronization.afterCompletion(status);
        }
        TransactionSynchronizationManager.clearSynchronization();
        TransactionSynchronizationManager.initSynchronization();
    }

    @Test
    void pathEscapingTheCompanyDirectoryIsRefused() {
        assertThrows(IllegalStateException.class, () -> storage.resolve(file("companies/2/autre-entreprise")));
        assertThrows(IllegalStateException.class, () -> storage.resolve(file("companies/1/../2/x")));
        assertThrows(IllegalStateException.class, () -> storage.resolve(file("../../etc/passwd")));
        assertThrows(IllegalStateException.class, () -> storage.resolve(file("companies/1")));
        assertThrows(IllegalStateException.class, () -> storage.resolve(file(" ")));
    }

    @Test
    void unsavedCompanyIsRefused() {
        assertThrows(IllegalArgumentException.class, () -> storage.newStoragePath(new Company("Nouvelle", "N")));
    }

    @Test
    void companyDirectoryIsUnderTheConfiguredRoot() {
        assertEquals(tempDir.toAbsolutePath().normalize().resolve("companies").resolve("1"),
                storage.companyDirectory(companyA));
    }

    private File file(String storagePath) {
        return new File(owner, "f.txt", rootA, "f.txt", "text/plain", storagePath, 1);
    }

    private static Company company(String code, Long id) {
        Company company = new Company("Entreprise " + code, code);
        company.setId(id);
        return company;
    }
}
