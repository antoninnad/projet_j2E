package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
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

import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.Folder;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.FolderRepository;

/** Persistance de l'arborescence et création des racines, sur une base H2 en mémoire. */
@DataJpaTest
@Import({ FolderService.class, BCryptPasswordEncoder.class }) // BCrypt : requis par le bean init de ProjetJ2eApplication
class FolderServiceTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private FolderService folderService;

    @Autowired
    private FolderRepository folderRepository;

    private Company company;
    private Department finance;
    private User admin;

    @BeforeEach
    void setUp() {
        company = em.persist(new Company("CyTech", "CYTECH"));
        finance = em.persist(new Department("Finance", company));
        admin = em.persist(user("admin", company));
    }

    @Test
    void createsAndFindsTheDepartmentRoot() {
        Folder root = folderService.createDepartmentRoot(finance, admin);

        assertNotNull(root.getId());
        assertTrue(root.isRoot());
        assertEquals("Finance", root.getName());
        assertEquals(root.getId(), folderService.findDepartmentRoot(finance).orElseThrow().getId());
        assertEquals(List.of(root), folderRepository.findByCompanyAndParentIsNull(company));
    }

    @Test
    void refusesASecondRootForTheSameDepartment() {
        folderService.createDepartmentRoot(finance, admin);

        assertThrows(IllegalStateException.class, () -> folderService.createDepartmentRoot(finance, admin));
    }

    @Test
    void refusesAnOwnerFromAnotherCompany() {
        Company other = em.persist(new Company("Autre", "AUTRE"));
        User outsider = em.persist(user("outsider", other));

        assertThrows(IllegalArgumentException.class, () -> folderService.createDepartmentRoot(finance, outsider));
    }

    @Test
    void persistsTreeWithParentsVersionAndCascadeDelete() {
        Folder root = folderService.createDepartmentRoot(finance, admin);
        Folder reports = em.persist(new Folder(admin, "Rapports", root));
        File budget = em.persist(new File(admin, "budget.txt", reports, "budget.txt", "text/plain", "x/1", 10));
        em.flush();
        em.clear();

        Folder reloadedRoot = em.find(Folder.class, root.getId());
        Folder reloadedReports = (Folder) reloadedRoot.getChildren().get(0);
        Node reloadedBudget = reloadedReports.getChildren().get(0);
        assertEquals("Rapports", reloadedReports.getName());
        assertEquals(budget.getId(), reloadedBudget.getId());
        assertSame(reloadedReports, reloadedBudget.getParent());
        assertEquals(finance.getId(), reloadedBudget.getDepartment().getId());
        assertEquals(company.getId(), reloadedBudget.getCompany().getId());
        assertNotNull(reloadedBudget.getVersion());

        em.remove(reloadedRoot);
        em.flush();
        em.clear();

        assertEquals(null, em.find(File.class, budget.getId()));
        assertEquals(null, em.find(Folder.class, reports.getId()));
    }

    private static User user(String username, Company company) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setFirstName("Prénom");
        user.setLastName("Nom");
        user.setPasswordHash("hash");
        user.setCompany(company);
        return user;
    }
}
