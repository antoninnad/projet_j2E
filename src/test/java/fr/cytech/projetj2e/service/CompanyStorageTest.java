package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.Folder;
import fr.cytech.projetj2e.model.User;

/** Cloisonnement des chemins de stockage par entreprise (sans écriture disque). */
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
