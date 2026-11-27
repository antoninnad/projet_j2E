package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import fr.cytech.projetj2e.dto.ActivityResponse;
import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.exception.ConflictException;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.Folder;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.LogRepository;

/**
 * Journal d'activité (T36) alimenté par les vrais services (départements, dossiers, partage)
 * sur une base H2 en mémoire. Acme : Ada (administratrice), Alice (Finance niveau 1), Bob (Finance niveau 0).
 * Autre entreprise : Mallory.
 */
@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.storage.root=target/test-storage"
})
@Import({ ActivityService.class, ActivityRecorder.class, CompanyIsolationService.class, PermissionService.class,
        FolderManagementService.class, NodeResponseMapper.class, NodeNames.class, CompanyStorage.class,
        SharingService.class, DepartmentService.class, FolderService.class,
        BCryptPasswordEncoder.class }) // BCrypt : requis par le bean init de ProjetJ2eApplication
class ActivityServiceTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private ActivityService activity;

    @Autowired
    private DepartmentService departments;

    @Autowired
    private FolderService folderService;

    @Autowired
    private FolderManagementService folders;

    @Autowired
    private SharingService sharing;

    @Autowired
    private LogRepository logs;

    private User ada;
    private User alice;
    private User bob;
    private User mallory;
    private Folder financeRoot;

    @BeforeEach
    void setUp() {
        Company acme = em.persist(new Company("Acme", "ACME"));
        Company other = em.persist(new Company("Autre", "AUTRE"));
        ada = em.persist(user("ada", acme, UserRole.COMPANY_ADMIN));
        alice = em.persist(user("alice", acme, UserRole.MEMBER));
        bob = em.persist(user("bob", acme, UserRole.MEMBER));
        mallory = em.persist(user("mallory", other, UserRole.COMPANY_ADMIN));

        Department finance = departments.create(ada, "Finance");
        departments.setMember(ada, finance.getId(), alice, 1);
        departments.setMember(ada, finance.getId(), bob, 0);
        financeRoot = folderService.findDepartmentRoot(finance).orElseThrow();
        em.flush();
    }

    @Test
    void documentOperationsAreJournaledWithAuthorDateAndElement() {
        NodeResponse archives = folders.createFolder(alice, financeRoot.getId(), "Archives");
        folders.renameFolder(alice, archives.id(), "Archives 2025", null);

        List<ActivityResponse> feed = activity.companyFeed(ada, 0, 20).items();

        ActivityResponse renamed = feed.get(0);
        assertEquals("FOLDER_RENAMED", renamed.action());
        assertEquals("a renommé le dossier", renamed.label());
        assertEquals("DOCUMENT", renamed.category());
        assertEquals(alice.getId(), renamed.actor().id());
        assertEquals("Archives 2025", renamed.nodeName());
        assertEquals("folder", renamed.nodeKind());
        assertEquals("Finance", renamed.departmentName());
        assertEquals("« Archives » → « Archives 2025 »", renamed.details());
        assertTrue(renamed.occurredAt() != null);
        assertEquals("FOLDER_CREATED", feed.get(1).action());
        assertEquals("dans « Finance »", feed.get(1).details());
    }

    @Test
    void rightsChangesAreJournaled() {
        NodeResponse archives = folders.createFolder(ada, financeRoot.getId(), "Archives");

        sharing.addContributor(ada, archives.id(), bob.getId());
        sharing.setThreshold(ada, archives.id(), 1);
        sharing.setThreshold(ada, archives.id(), 1); // inchangé : pas d'entrée

        List<ActivityResponse> history = activity.nodeHistory(ada, archives.id(), 0, 20).items();
        assertEquals(List.of("THRESHOLD_CHANGED", "CONTRIBUTOR_ADDED", "FOLDER_CREATED"),
                history.stream().map(ActivityResponse::action).toList());
        assertEquals("« 0 » → « 1 »", history.get(0).details());
        assertEquals(bob.getId(), history.get(1).targetUserId());
        assertEquals("Prénom bob", history.get(1).targetUserName());
    }

    @Test
    void administratorSeesEverythingMembersOnlyAccessibleDocuments() {
        folders.createFolder(ada, financeRoot.getId(), "Public");
        NodeResponse budget = folders.createFolder(ada, financeRoot.getId(), "Budget");
        sharing.setThreshold(ada, budget.id(), 1);

        // Administratrice : département, adhésions et documents.
        List<String> adaSees = actions(activity.companyFeed(ada, 0, 50).items());
        assertTrue(adaSees.containsAll(List.of("DEPARTMENT_CREATED", "MEMBER_ACCESS_SET", "FOLDER_CREATED", "THRESHOLD_CHANGED")));

        // Alice (niveau 1) voit Public et Budget, mais pas l'administration.
        List<ActivityResponse> aliceSees = activity.companyFeed(alice, 0, 50).items();
        assertEquals(List.of("Budget", "Budget", "Public"), aliceSees.stream().map(ActivityResponse::nodeName).toList());

        // Bob (niveau 0) ne voit que Public : Budget est passé au seuil 1, son historique aussi.
        List<ActivityResponse> bobSees = activity.companyFeed(bob, 0, 50).items();
        assertEquals(List.of("Public"), bobSees.stream().map(ActivityResponse::nodeName).toList());
        assertThrows(ResourceNotFoundException.class, () -> activity.nodeHistory(bob, budget.id(), 0, 20));

        // Autre entreprise : rien.
        assertEquals(0, activity.companyFeed(mallory, 0, 50).page().totalElements());
        assertThrows(ResourceNotFoundException.class, () -> activity.nodeHistory(mallory, budget.id(), 0, 20));
    }

    @Test
    void deletedElementsStayInTheHistoryWithTheirLastThreshold() {
        NodeResponse publicFolder = folders.createFolder(ada, financeRoot.getId(), "Public");
        folders.createFolder(ada, publicFolder.id(), "Sous-dossier");
        NodeResponse secret = folders.createFolder(ada, financeRoot.getId(), "Secret");
        sharing.setThreshold(ada, secret.id(), 1);
        em.flush();

        folders.deleteFolder(ada, publicFolder.id(), null);
        folders.deleteFolder(ada, secret.id(), null);
        em.flush();
        em.clear();

        ActivityResponse deletion = activity.companyFeed(alice, 0, 50).items().stream()
                .filter(entry -> entry.action().equals("FOLDER_DELETED") && entry.nodeName().equals("Public"))
                .findFirst().orElseThrow();
        assertEquals("avec 1 élément", deletion.details());
        List<ActivityResponse> bobSees = activity.companyFeed(bob, 0, 50).items();
        assertTrue(bobSees.stream().anyMatch(entry -> entry.action().equals("FOLDER_DELETED") && entry.nodeName().equals("Public")));
        // Secret a été créé au seuil 0 puis passé au seuil 1 : même son entrée de création reste cachée à Bob.
        assertTrue(bobSees.stream().noneMatch(entry -> "Secret".equals(entry.nodeName())), bobSees.toString());
    }

    @Test
    void refusedOperationsAreNotJournaled() {
        folders.createFolder(alice, financeRoot.getId(), "Archives");
        long before = logs.count();

        assertThrows(ConflictException.class, () -> folders.createFolder(alice, financeRoot.getId(), "archives"));
        assertThrows(RuntimeException.class, () -> folders.createFolder(bob, financeRoot.getId(), "Bob"));

        assertEquals(before, logs.count());
    }

    @Test
    void paginationIsValidatedAndEntriesHaveNoContent() {
        assertThrows(IllegalArgumentException.class, () -> activity.companyFeed(ada, -1, 20));
        assertThrows(IllegalArgumentException.class, () -> activity.companyFeed(ada, 0, 101));
        ActivityResponse created = activity.companyFeed(ada, 0, 1).items().get(0);
        assertNull(created.nodeId()); // entrée d'administration : pas d'élément
        assertEquals("Finance", created.departmentName());
    }

    private static List<String> actions(List<ActivityResponse> entries) {
        return entries.stream().map(ActivityResponse::action).toList();
    }

    private static User user(String username, Company company, UserRole role) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setFirstName("Prénom");
        user.setLastName(username);
        user.setPasswordHash("hash");
        user.setStatus(AccountStatus.ACTIVE);
        user.setRole(role);
        user.setCompany(company);
        return user;
    }
}
