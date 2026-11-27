package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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

import fr.cytech.projetj2e.dto.FavoriteResponse;
import fr.cytech.projetj2e.dto.SearchResultResponse;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.Folder;
import fr.cytech.projetj2e.model.Membership;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.FavoriteRepository;

/**
 * Recherche et favoris (T31) sur une base H2 en mémoire.
 *
 * Finance (0) ─┬─ Budget 2026 (1) ── budget-final.xlsx (1)
 *              ├─ budget.txt (0)
 *              ├─ Archives (0) ── Rapport_100%.pdf (0), 100 pages.txt (0)
 *              └─ Vieilles archives (0)
 * RH (0) ── budget RH.docx (0)
 * Autre entreprise : Ventes (0) ── Budget (0)
 *
 * Ada : administratrice ; Alice : Finance niveau 1 ; Bob : Finance niveau 0 ; Mallory : autre entreprise.
 */
@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.storage.root=target/test-storage"
})
@Import({ SearchService.class, FavoriteService.class, NodeResponseMapper.class, PermissionService.class,
        CompanyIsolationService.class, FolderManagementService.class, NodeNames.class, CompanyStorage.class,
        ActivityRecorder.class,
        BCryptPasswordEncoder.class }) // BCrypt : requis par le bean init de ProjetJ2eApplication
class SearchAndFavoriteServiceTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private SearchService search;

    @Autowired
    private FavoriteService favorites;

    @Autowired
    private FolderManagementService folders;

    @Autowired
    private FavoriteRepository favoriteRepository;

    private Company acme;
    private User ada;
    private User alice;
    private User bob;
    private User mallory;
    private Department finance;
    private Folder budget2026;
    private File budgetFinal;
    private File budgetTxt;
    private Folder archives;
    private Membership aliceInFinance;

    @BeforeEach
    void setUp() {
        acme = em.persist(new Company("Acme", "ACME"));
        Company other = em.persist(new Company("Autre", "AUTRE"));
        finance = em.persist(new Department("Finance", acme));
        Department rh = em.persist(new Department("RH", acme));
        Department ventes = em.persist(new Department("Ventes", other));
        ada = em.persist(user("ada", acme, UserRole.COMPANY_ADMIN));
        alice = em.persist(user("alice", acme, UserRole.MEMBER));
        bob = em.persist(user("bob", acme, UserRole.MEMBER));
        mallory = em.persist(user("mallory", other, UserRole.COMPANY_ADMIN));
        aliceInFinance = em.persist(new Membership(alice, finance, 1));
        em.persist(new Membership(bob, finance, 0));

        Folder financeRoot = em.persist(Folder.createRoot(ada, finance));
        Folder rhRoot = em.persist(Folder.createRoot(ada, rh));
        Folder ventesRoot = em.persist(Folder.createRoot(mallory, ventes));
        budget2026 = new Folder(ada, "Budget 2026", financeRoot);
        budget2026.setMinAccessLevel(1);
        em.persist(budget2026);
        budgetFinal = em.persist(file("budget-final.xlsx", budget2026));
        budgetTxt = em.persist(file("budget.txt", financeRoot));
        archives = em.persist(new Folder(ada, "Archives", financeRoot));
        em.persist(file("Rapport_100%.pdf", archives));
        em.persist(file("100 pages.txt", archives));
        em.persist(new Folder(ada, "Vieilles archives", financeRoot));
        em.persist(file("budget RH.docx", rhRoot));
        em.persist(new Folder(mallory, "Budget", ventesRoot));
        em.flush();
    }

    // ---------------------------------------------------------------- Recherche

    @Test
    void resultsAreLimitedToVisibleElements() {
        // Bob (niveau 0) : ni Budget 2026 (seuil 1), ni RH (pas d'adhésion), ni l'autre entreprise.
        assertEquals(List.of("budget.txt"), names(search.search(bob, "budget", null, null, 0, 20).items()));
        assertEquals(1, search.search(bob, "budget", null, null, 0, 20).page().totalElements());

        // Alice (niveau 1) : Finance en entier ; dossiers d'abord parmi les noms qui commencent par la recherche.
        assertEquals(List.of("Budget 2026", "budget-final.xlsx", "budget.txt"),
                names(search.search(alice, "BUDGET", null, null, 0, 20).items()));

        // Ada (administratrice) : toute l'entreprise, rien de l'autre.
        assertEquals(4, search.search(ada, "budget", null, null, 0, 20).page().totalElements());
        assertEquals(List.of("Budget"), names(search.search(mallory, "budget", null, null, 0, 20).items()));
    }

    @Test
    void exactNameComesFirstAndResultsCarryTheirLocation() {
        List<SearchResultResponse> found = search.search(alice, "archives", null, null, 0, 20).items();

        assertEquals(List.of("Archives", "Vieilles archives"), names(found));
        assertEquals("Finance", found.get(0).location());
        SearchResultResponse nested = search.search(alice, "final", null, null, 0, 20).items().get(0);
        assertEquals("Finance / Budget 2026", nested.location());
        assertTrue(nested.node().permissions().view());
    }

    @Test
    void likeWildcardsAreSearchedLiterally() {
        assertEquals(List.of("Rapport_100%.pdf"), names(search.search(alice, "100%", null, null, 0, 20).items()));
        assertEquals(List.of("Rapport_100%.pdf"), names(search.search(alice, "_1", null, null, 0, 20).items()));
        assertEquals(List.of("Rapport_100%.pdf"), names(search.search(alice, "%", null, null, 0, 20).items()));
    }

    @Test
    void filtersAndValidation() {
        assertEquals(List.of("Budget 2026"), names(search.search(alice, "budget", "folder", null, 0, 20).items()));
        assertEquals(List.of("budget RH.docx"),
                names(search.search(ada, "budget", "file", budgetRhDepartmentId(), 0, 20).items()));
        assertEquals(2, search.search(alice, "budget", null, null, 0, 2).items().size());
        assertEquals(3, search.search(alice, "budget", null, null, 0, 2).page().totalElements());

        assertThrows(IllegalArgumentException.class, () -> search.search(alice, "  ", null, null, 0, 20));
        assertThrows(IllegalArgumentException.class, () -> search.search(alice, null, null, null, 0, 20));
        assertThrows(IllegalArgumentException.class, () -> search.search(alice, "x".repeat(101), null, null, 0, 20));
        assertThrows(IllegalArgumentException.class, () -> search.search(alice, "budget", "image", null, 0, 20));
        assertThrows(IllegalArgumentException.class, () -> search.search(alice, "budget", null, null, 0, 101));
    }

    // ---------------------------------------------------------------- Favoris

    @Test
    void favoritesArePersonalAndShownInTheExplorer() {
        assertTrue(favorites.add(alice, budgetTxt.getId()).favorite());
        favorites.add(alice, budgetTxt.getId()); // déjà en favori : sans effet
        favorites.add(alice, budgetFinal.getId());

        List<FavoriteResponse> listed = favorites.list(alice, 0, 20).items();
        assertEquals(List.of("budget-final.xlsx", "budget.txt"), listed.stream().map(f -> f.node().name()).toList());
        assertEquals("Finance / Budget 2026", listed.get(0).location());

        // Personnel : Bob ne voit ni la liste ni l'étoile d'Alice.
        assertEquals(0, favorites.list(bob, 0, 20).page().totalElements());
        SearchResultResponse forBob = search.search(bob, "budget.txt", null, null, 0, 20).items().get(0);
        assertFalse(forBob.node().favorite());
        assertTrue(search.search(alice, "budget.txt", null, null, 0, 20).items().get(0).node().favorite());
    }

    @Test
    void onlyVisibleElementsCanBeFavorites() {
        assertThrows(ResourceNotFoundException.class, () -> favorites.add(bob, budgetFinal.getId()));
        assertThrows(ResourceNotFoundException.class, () -> favorites.add(mallory, budgetTxt.getId()));
        assertThrows(ResourceNotFoundException.class, () -> favorites.add(bob, 999_999L));
    }

    @Test
    void aFavoriteGivesNoRightAndHidesWhileAccessIsRemoved() {
        favorites.add(alice, budget2026.getId());

        aliceInFinance.setAccessLevel(0);
        em.flush();
        assertEquals(0, favorites.list(alice, 0, 20).page().totalElements());
        assertThrows(ResourceNotFoundException.class, () -> favorites.add(alice, budget2026.getId()));

        aliceInFinance.setAccessLevel(1);
        em.flush();
        assertEquals(List.of("Budget 2026"), favorites.list(alice, 0, 20).items().stream().map(f -> f.node().name()).toList());
    }

    @Test
    void removingIsIdempotentAndDeletionRemovesFavorites() {
        favorites.add(alice, budgetTxt.getId());
        favorites.remove(alice, budgetTxt.getId());
        favorites.remove(alice, budgetTxt.getId());
        assertEquals(0, favorites.list(alice, 0, 20).page().totalElements());

        favorites.add(alice, archives.getId());
        favorites.add(bob, archives.getId());
        em.flush();
        folders.deleteFolder(ada, archives.getId(), null);
        em.flush();
        em.clear();

        assertEquals(0, favoriteRepository.count());
    }

    // ---------------------------------------------------------------- Outils

    private Long budgetRhDepartmentId() {
        return em.getEntityManager()
                .createQuery("select n.department.id from Node n where n.name = 'budget RH.docx'", Long.class)
                .getSingleResult();
    }

    private static List<String> names(List<SearchResultResponse> results) {
        return results.stream().map(result -> result.node().name()).toList();
    }

    private File file(String name, Folder parent) {
        return new File(ada, name, parent, name, "application/octet-stream", "companies/" + acme.getId() + "/" + Math.abs(name.hashCode()), 1);
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
