package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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

import fr.cytech.projetj2e.dto.NodeDetailResponse;
import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.dto.PageResponse;
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
 * Exploration (T18) sur une base H2 en mémoire.
 *
 * Arborescence de test (seuil M entre parenthèses) :
 * Finance (0) ─┬─ Archives (0)
 *              ├─ Budget (1) ── plan.xlsx (1)
 *              ├─ a.txt (0)
 *              ├─ secret.pdf (2)
 *              └─ z.txt (0)
 * RH (0)
 * Autre entreprise : Ventes (0)
 */
@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import({ ExplorationService.class, PermissionService.class, CompanyIsolationService.class,
        BCryptPasswordEncoder.class }) // BCrypt : requis par le bean init de ProjetJ2eApplication
class ExplorationServiceTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private ExplorationService exploration;

    private User admin;
    private User alice;   // Finance niveau 1
    private User bob;     // Finance niveau 0
    private User carol;   // RH niveau 0, aucun accès à Finance
    private User mallory; // autre entreprise
    private Folder financeRoot;
    private Folder budget;
    private File plan;
    private File secret;

    @BeforeEach
    void setUp() {
        Company acme = em.persist(new Company("Acme", "ACME"));
        Company other = em.persist(new Company("Autre", "AUTRE"));
        Department finance = em.persist(new Department("Finance", acme));
        Department rh = em.persist(new Department("RH", acme));
        Department ventes = em.persist(new Department("Ventes", other));

        admin = em.persist(user("admin", acme, UserRole.COMPANY_ADMIN));
        alice = em.persist(user("alice", acme, UserRole.MEMBER));
        bob = em.persist(user("bob", acme, UserRole.MEMBER));
        carol = em.persist(user("carol", acme, UserRole.MEMBER));
        mallory = em.persist(user("mallory", other, UserRole.MEMBER));
        em.persist(new Membership(alice, finance, 1));
        em.persist(new Membership(bob, finance, 0));
        em.persist(new Membership(carol, rh, 0));
        em.persist(new Membership(mallory, ventes, 5));

        financeRoot = em.persist(Folder.createRoot(admin, finance));
        em.persist(Folder.createRoot(admin, rh));
        em.persist(Folder.createRoot(mallory, ventes));

        em.persist(new Folder(admin, "Archives", financeRoot));
        budget = new Folder(admin, "Budget", financeRoot);
        budget.setMinAccessLevel(1);
        em.persist(budget);
        plan = em.persist(file(alice, "plan.xlsx", budget, 1));
        em.persist(file(admin, "z.txt", financeRoot, 0));
        em.persist(file(admin, "a.txt", financeRoot, 0));
        secret = em.persist(file(admin, "secret.pdf", financeRoot, 2));
        em.flush();
    }

    // ---------------------------------------------------------------- Racines

    @Test
    void listsOnlyTheRootsOfTheMembersDepartments() {
        assertEquals(List.of("Finance", "RH"), names(exploration.listRoots(admin)));
        assertEquals(List.of("Finance"), names(exploration.listRoots(alice)));
        assertEquals(List.of("RH"), names(exploration.listRoots(carol)));
        assertEquals(List.of("Ventes"), names(exploration.listRoots(mallory)));
    }

    // ---------------------------------------------------------------- Enfants

    @Test
    void filtersChildrenByAccessLevelWithFoldersFirst() {
        assertEquals(List.of("Archives", "Budget", "a.txt", "z.txt"),
                names(exploration.listChildren(alice, financeRoot.getId(), 0, 20).items()));
        assertEquals(List.of("Archives", "a.txt", "z.txt"),
                names(exploration.listChildren(bob, financeRoot.getId(), 0, 20).items()));
        assertEquals(List.of("Archives", "Budget", "a.txt", "secret.pdf", "z.txt"),
                names(exploration.listChildren(admin, financeRoot.getId(), 0, 20).items()));
    }

    @Test
    void paginatesOnlyTheVisibleChildren() {
        PageResponse<NodeResponse> first = exploration.listChildren(alice, financeRoot.getId(), 0, 2);
        assertEquals(List.of("Archives", "Budget"), names(first.items()));
        assertEquals(new PageResponse.PageMeta(0, 2, 4, 2, true, false), first.page());

        PageResponse<NodeResponse> second = exploration.listChildren(alice, financeRoot.getId(), 1, 2);
        assertEquals(List.of("a.txt", "z.txt"), names(second.items()));
        assertTrue(second.page().last());
    }

    @Test
    void hidesFoldersAboveTheLevelAndOtherCompanies() {
        // Budget (seuil 1) est invisible pour Bob (niveau 0) : traité comme inexistant.
        assertThrows(ResourceNotFoundException.class,
                () -> exploration.listChildren(bob, budget.getId(), 0, 20));
        // Carol n'est pas membre de Finance.
        assertThrows(ResourceNotFoundException.class,
                () -> exploration.listChildren(carol, financeRoot.getId(), 0, 20));
        // Mallory appartient à une autre entreprise, même avec un niveau élevé.
        assertThrows(ResourceNotFoundException.class,
                () -> exploration.listChildren(mallory, financeRoot.getId(), 0, 20));
    }

    @Test
    void rejectsInvalidPagination() {
        assertThrows(IllegalArgumentException.class, () -> exploration.listChildren(alice, financeRoot.getId(), -1, 20));
        assertThrows(IllegalArgumentException.class, () -> exploration.listChildren(alice, financeRoot.getId(), 0, 0));
        assertThrows(IllegalArgumentException.class,
                () -> exploration.listChildren(alice, financeRoot.getId(), 0, ExplorationService.MAX_PAGE_SIZE + 1));
    }

    // ---------------------------------------------------------------- Détail

    @Test
    void returnsFileMetadataBreadcrumbAndPermissions() {
        NodeDetailResponse detail = exploration.getNode(alice, plan.getId());
        NodeResponse node = detail.node();

        assertEquals("file", node.kind());
        assertEquals(budget.getId(), node.parentId());
        assertEquals("Finance", node.departmentName());
        assertEquals("plan.xlsx", node.originalFileName());
        assertEquals("text/plain", node.contentType());
        assertEquals(42L, node.size());
        assertEquals(alice.getId(), node.owner().id());
        assertEquals(List.of("Finance", "Budget"),
                detail.path().stream().map(NodeDetailResponse.BreadcrumbItem::name).toList());
        assertTrue(node.permissions().view());
        assertTrue(node.permissions().manage()); // Alice est propriétaire de plan.xlsx
    }

    @Test
    void describesFoldersWithoutFileFields() {
        NodeDetailResponse detail = exploration.getNode(bob, financeRoot.getId());

        assertEquals("folder", detail.node().kind());
        assertNull(detail.node().parentId());
        assertNull(detail.node().size());
        assertTrue(detail.path().isEmpty());
        assertFalse(detail.node().permissions().modify()); // niveau 0 = seuil 0, ni propriétaire ni contributeur
    }

    @Test
    void hidesTheDetailOfAnInvisibleNode() {
        assertThrows(ResourceNotFoundException.class, () -> exploration.getNode(alice, secret.getId()));
        assertThrows(ResourceNotFoundException.class, () -> exploration.getNode(mallory, plan.getId()));
    }

    // ---------------------------------------------------------------- Dashboard

    @Test
    void feedsTheDashboardWithAuthorizedDepartmentsAndDocuments() {
        assertEquals(List.of("Finance"), exploration.accessibleDepartmentNames(alice));
        assertEquals(List.of("Finance", "RH"), exploration.accessibleDepartmentNames(admin));

        List<String> bobDocuments = exploration.recentDocumentNames(bob, 10);
        assertEquals(2, bobDocuments.size());
        assertTrue(bobDocuments.containsAll(List.of("a.txt", "z.txt")));

        assertEquals(4, exploration.recentDocumentNames(admin, 10).size());
        assertEquals(2, exploration.recentDocumentNames(admin, 2).size());
        assertTrue(exploration.recentDocumentNames(carol, 10).isEmpty());
    }

    // ---------------------------------------------------------------- Données

    private static List<String> names(List<NodeResponse> nodes) {
        return nodes.stream().map(NodeResponse::name).toList();
    }

    private static File file(User owner, String name, Folder parent, int threshold) {
        File file = new File(owner, name, parent, name, "text/plain", "companies/1/" + name, 42L);
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
