package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
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
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;

/**
 * Opérations sur les dossiers (T20) sur une base H2 en mémoire.
 *
 * Arborescence de test (seuil M entre parenthèses, propriétaire admin sauf mention) :
 * Finance (0) ─┬─ Archives (0) ── old.txt (0)
 *              ├─ Budget (1) ── plan.xlsx (1, Alice)
 *              ├─ a.txt (0)
 *              └─ old.txt (0)
 * RH (0)
 * Autre entreprise : Ventes (0)
 *
 * Alice : Finance niveau 1 ; Bob : Finance niveau 0.
 */
@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.storage.root=target/test-storage"
})
@Import({ FolderManagementService.class, NodeResponseMapper.class, PermissionService.class,
        CompanyIsolationService.class, CompanyStorage.class,
        BCryptPasswordEncoder.class }) // BCrypt : requis par le bean init de ProjetJ2eApplication
class FolderManagementServiceTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private FolderManagementService service;

    @Autowired
    private CompanyStorage storage;

    private Company acme;
    private User admin;
    private User alice;
    private User bob;
    private User mallory;
    private Folder financeRoot;
    private Folder rhRoot;
    private Folder ventesRoot;
    private Folder archives;
    private Folder budget;
    private File archivedFile;
    private File plan;
    private File aTxt;
    private File rootOld;

    @BeforeEach
    void setUp() {
        acme = em.persist(new Company("Acme", "ACME"));
        Company other = em.persist(new Company("Autre", "AUTRE"));
        Department finance = em.persist(new Department("Finance", acme));
        Department rh = em.persist(new Department("RH", acme));
        Department ventes = em.persist(new Department("Ventes", other));

        admin = em.persist(user("admin", acme, UserRole.COMPANY_ADMIN));
        alice = em.persist(user("alice", acme, UserRole.MEMBER));
        bob = em.persist(user("bob", acme, UserRole.MEMBER));
        mallory = em.persist(user("mallory", other, UserRole.COMPANY_ADMIN));
        em.persist(new Membership(alice, finance, 1));
        em.persist(new Membership(bob, finance, 0));

        financeRoot = em.persist(Folder.createRoot(admin, finance));
        rhRoot = em.persist(Folder.createRoot(admin, rh));
        ventesRoot = em.persist(Folder.createRoot(mallory, ventes));

        archives = em.persist(new Folder(admin, "Archives", financeRoot));
        archivedFile = em.persist(file(admin, "old.txt", archives, 0));
        budget = new Folder(admin, "Budget", financeRoot);
        budget.setMinAccessLevel(1);
        em.persist(budget);
        plan = em.persist(file(alice, "plan.xlsx", budget, 1));
        aTxt = em.persist(file(admin, "a.txt", financeRoot, 0));
        rootOld = em.persist(file(admin, "old.txt", financeRoot, 0));
        em.flush();
    }

    // ---------------------------------------------------------------- Création

    @Test
    void createsASubfolderOwnedByTheActorWithTheParentThreshold() {
        NodeResponse created = service.createFolder(alice, financeRoot.getId(), "  Projets  ");

        assertEquals("Projets", created.name());
        assertEquals("folder", created.kind());
        assertEquals(financeRoot.getId(), created.parentId());
        assertEquals(alice.getId(), created.owner().id());
        assertEquals(0, created.minAccessLevel());
        assertTrue(created.permissions().manage());
        assertNotNull(reload(Folder.class, created.id()));
    }

    @Test
    void refusesCreationWithoutTheRightOrOutsideTheVisibleTree() {
        // Bob : niveau 0 = seuil 0, ni propriétaire ni contributeur → pas de droit de modification.
        assertThrows(ForbiddenException.class, () -> service.createFolder(bob, financeRoot.getId(), "X"));
        // Budget (seuil 1) est invisible pour Bob, Finance l'est pour Mallory (autre entreprise).
        assertThrows(ResourceNotFoundException.class, () -> service.createFolder(bob, budget.getId(), "X"));
        assertThrows(ResourceNotFoundException.class, () -> service.createFolder(mallory, financeRoot.getId(), "X"));
    }

    @Test
    void validatesNamesAndRefusesDuplicatesInTheSameFolder() {
        assertThrows(ConflictException.class, () -> service.createFolder(alice, financeRoot.getId(), " archives "));
        assertThrows(IllegalArgumentException.class, () -> service.createFolder(alice, financeRoot.getId(), "   "));
        assertThrows(IllegalArgumentException.class, () -> service.createFolder(alice, financeRoot.getId(), "a/b"));
        assertThrows(IllegalArgumentException.class, () -> service.createFolder(alice, financeRoot.getId(), ".."));
        assertThrows(IllegalArgumentException.class,
                () -> service.createFolder(alice, financeRoot.getId(), "x".repeat(FolderManagementService.MAX_NAME_LENGTH + 1)));
    }

    // ---------------------------------------------------------------- Renommage

    @Test
    void renamesAFolderAndIncrementsItsVersion() {
        Long before = archives.getVersion();

        NodeResponse renamed = service.renameFolder(alice, archives.getId(), "Archives 2025", before);

        assertEquals("Archives 2025", renamed.name());
        assertEquals(before + 1, renamed.version());
        // Changer seulement la casse de son propre nom est permis.
        assertEquals("ARCHIVES 2025", service.renameFolder(alice, archives.getId(), "ARCHIVES 2025", null).name());
    }

    @Test
    void refusesInvalidRenames() {
        assertThrows(ConflictException.class, () -> service.renameFolder(alice, archives.getId(), "budget", null));
        assertThrows(ConflictException.class,
                () -> service.renameFolder(alice, archives.getId(), "Nouveau", archives.getVersion() + 1));
        assertThrows(ForbiddenException.class, () -> service.renameFolder(bob, archives.getId(), "Nouveau", null));
        assertThrows(ForbiddenException.class, () -> service.renameFolder(admin, financeRoot.getId(), "Compta", null));
    }

    // ---------------------------------------------------------------- Déplacement

    @Test
    void movesAFolderWithItsSubtree() {
        NodeResponse moved = service.move(admin, budget.getId(), archives.getId(), null);

        assertEquals(archives.getId(), moved.parentId());
        assertEquals(budget.getId(), plan.getParent().getId());
    }

    @Test
    void movingToAnotherDepartmentMovesTheWholeSubtree() {
        NodeResponse moved = service.move(admin, budget.getId(), rhRoot.getId(), null);

        assertEquals("RH", moved.departmentName());
        assertEquals("RH", reload(File.class, plan.getId()).getDepartment().getName());
    }

    @Test
    void movesAFileIntoAFolder() {
        NodeResponse moved = service.move(alice, aTxt.getId(), archives.getId(), aTxt.getVersion());

        assertEquals("file", moved.kind());
        assertEquals(archives.getId(), moved.parentId());
    }

    @Test
    void refusesMovesThatBreakTheTree() {
        // Seuil : Archives (0) ne peut pas entrer dans Budget (1).
        assertThrows(IllegalArgumentException.class, () -> service.move(admin, archives.getId(), budget.getId(), null));
        // Cycle : un dossier ne peut pas entrer dans son propre sous-dossier.
        Folder sub = em.persist(new Folder(admin, "Sous-dossier", archives));
        assertThrows(IllegalArgumentException.class, () -> service.move(admin, archives.getId(), sub.getId(), null));
        // Nom déjà pris dans la cible.
        assertThrows(ConflictException.class, () -> service.move(admin, rootOld.getId(), archives.getId(), null));
        // Racine de département.
        assertThrows(ForbiddenException.class, () -> service.move(admin, rhRoot.getId(), archives.getId(), null));
    }

    @Test
    void refusesMovesWithoutRightsOrAcrossCompanies() {
        // Alice : niveau 1 = seuil de Budget, ni propriétaire → pas de droit de suppression sur Budget.
        assertThrows(ForbiddenException.class, () -> service.move(alice, budget.getId(), archives.getId(), null));
        // Bob n'a pas le droit de créer dans Archives.
        assertThrows(ForbiddenException.class, () -> service.move(bob, aTxt.getId(), archives.getId(), null));
        // Cible dans une autre entreprise.
        assertThrows(ResourceNotFoundException.class, () -> service.move(admin, archives.getId(), ventesRoot.getId(), null));
        // Version périmée.
        assertThrows(ConflictException.class, () -> service.move(alice, aTxt.getId(), archives.getId(), aTxt.getVersion() + 1));
    }

    // ---------------------------------------------------------------- Suppression

    @Test
    void deletesAFolderAndItsContent() throws Exception {
        java.nio.file.Path content = storage.resolve(archivedFile);
        java.nio.file.Files.createDirectories(content.getParent());
        java.nio.file.Files.writeString(content, "contenu");

        service.deleteFolder(alice, archives.getId(), archives.getVersion());
        em.clear();

        assertNull(em.find(Folder.class, archives.getId()));
        assertNull(em.find(File.class, archivedFile.getId()));
        assertNotNull(em.find(Folder.class, financeRoot.getId()));
        // Le contenu n'est effacé du disque qu'après validation : la transaction de test étant annulée, il reste.
        assertTrue(java.nio.file.Files.exists(content));
        java.nio.file.Files.delete(content);
    }

    @Test
    void refusesDeletionWhenTheSubtreeContainsProtectedElements() {
        // Alice possède « Mixte », mais un fichier de seuil 2 y a été rangé : elle ne peut pas tout supprimer.
        Folder mixed = em.persist(new Folder(alice, "Mixte", financeRoot));
        File secret = em.persist(file(admin, "secret.pdf", mixed, 2));

        assertThrows(ForbiddenException.class, () -> service.deleteFolder(alice, mixed.getId(), null));
        em.flush();
        em.clear();
        assertNotNull(em.find(File.class, secret.getId()));
    }

    @Test
    void refusesOtherInvalidDeletions() {
        assertThrows(ForbiddenException.class, () -> service.deleteFolder(bob, archives.getId(), null));
        assertThrows(ForbiddenException.class, () -> service.deleteFolder(admin, financeRoot.getId(), null));
        assertThrows(ConflictException.class, () -> service.deleteFolder(admin, archives.getId(), archives.getVersion() + 1));
        assertThrows(ResourceNotFoundException.class, () -> service.deleteFolder(mallory, archives.getId(), null));
    }

    // ---------------------------------------------------------------- Données

    private <T extends Node> T reload(Class<T> type, Long id) {
        em.flush();
        em.clear();
        return em.find(type, id);
    }

    private File file(User owner, String name, Folder parent, int threshold) {
        File file = new File(owner, name, parent, name, "text/plain",
                "companies/" + parent.getCompany().getId() + "/" + name, 42L);
        file.setMinAccessLevel(threshold);
        return file;
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
