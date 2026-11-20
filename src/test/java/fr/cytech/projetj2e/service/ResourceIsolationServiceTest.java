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

import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.Folder;
import fr.cytech.projetj2e.model.User;

@DataJpaTest
@Import({ ResourceIsolationService.class, BCryptPasswordEncoder.class })
class ResourceIsolationServiceTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private ResourceIsolationService resourceIsolationService;

    private Company company;
    private Company otherCompany;
    private User member;
    private User outsider;
    private Folder root;
    private File file;

    @BeforeEach
    void setUp() {
        company = em.persist(new Company("Lagui", "LAGUI"));
        otherCompany = em.persist(new Company("Autre", "AUTRE"));
        member = em.persist(user("member", company));
        outsider = em.persist(user("outsider", otherCompany));
        Department department = em.persist(new Department("Finance", company));
        root = em.persist(Folder.createRoot(member, department));
        file = em.persist(new File(member, "budget.txt", root,
                "budget.txt", "text/plain",
                resourceIsolationService.buildPrivateStoragePath(company, "budget.txt"), 12));
        em.flush();
    }

    @Test
    void refusesChatAndNodeAccessAcrossCompanies() {
        assertTrue(resourceIsolationService.canChat(member, member));
        assertFalse(resourceIsolationService.canChat(member, outsider));
        assertThrows(SecurityException.class,
                () -> resourceIsolationService.requireSameCompany(member, outsider));
        assertThrows(SecurityException.class,
                () -> resourceIsolationService.requireSameCompany(file, otherCompany));
    }

    @Test
    void filtersDocumentLookupsAndListsByCompany() {
        assertEquals(file.getId(), resourceIsolationService.findFile(file.getId(), company).orElseThrow().getId());
        assertTrue(resourceIsolationService.findFile(file.getId(), otherCompany).isEmpty());
        assertEquals(file.getId(), resourceIsolationService.findNode(file.getId(), company).orElseThrow().getId());
        assertTrue(resourceIsolationService.findNode(file.getId(), otherCompany).isEmpty());
        assertEquals(List.of(file), resourceIsolationService.listFiles(company));
        assertTrue(resourceIsolationService.listFiles(otherCompany).isEmpty());
    }

    @Test
    void confinesStoragePathsToTheCompanyPrefix() {
        String allowed = resourceIsolationService.buildPrivateStoragePath(company, "2026/budget.txt");
        assertTrue(resourceIsolationService.isStoragePathAllowed(allowed, company));
        assertFalse(resourceIsolationService.isStoragePathAllowed(allowed, otherCompany));
        assertThrows(IllegalArgumentException.class,
                () -> resourceIsolationService.buildPrivateStoragePath(company, "../budget.txt"));
        assertThrows(SecurityException.class,
                () -> resourceIsolationService.requireStoragePathAllowed(
                        "companies/" + otherCompany.getId() + "/budget.txt", company));
    }

    private static User user(String username, Company company) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setFirstName("Prenom");
        user.setLastName("Nom");
        user.setPasswordHash("hash");
        user.setCompany(company);
        return user;
    }
}
