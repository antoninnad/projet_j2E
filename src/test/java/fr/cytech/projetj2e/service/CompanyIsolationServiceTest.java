package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.Folder;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.NodeRepository;

/** Deux entreprises A et B : aucune ressource de B n'est accessible depuis un compte de A. */
@DataJpaTest
@Import({ CompanyIsolationService.class, BCryptPasswordEncoder.class }) // BCrypt : requis par le bean init de ProjetJ2eApplication
class CompanyIsolationServiceTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private CompanyIsolationService isolation;

    @Autowired
    private NodeRepository nodeRepository;

    private User aliceA;
    private User bobA;
    private User carolB;
    private Folder rootA;
    private File fileA;
    private Folder rootB;
    private File fileB;

    @BeforeEach
    void setUp() {
        Company a = em.persist(new Company("Entreprise A", "A"));
        Company b = em.persist(new Company("Entreprise B", "B"));
        aliceA = em.persist(user("alice", a, AccountStatus.ACTIVE));
        bobA = em.persist(user("bob", a, AccountStatus.ACTIVE));
        carolB = em.persist(user("carol", b, AccountStatus.ACTIVE));

        rootA = em.persist(Folder.createRoot(aliceA, em.persist(new Department("Finance", a))));
        fileA = em.persist(new File(aliceA, "a.txt", rootA, "a.txt", "text/plain", "companies/x/1", 1));
        rootB = em.persist(Folder.createRoot(carolB, em.persist(new Department("Finance", b))));
        fileB = em.persist(new File(carolB, "b.txt", rootB, "b.txt", "text/plain", "companies/y/2", 1));
        em.flush();
    }

    @Test
    void loadsResourcesOfTheOwnCompany() {
        assertEquals(rootA.getId(), isolation.requireNode(aliceA, rootA.getId()).getId());
        assertEquals(rootA.getId(), isolation.requireFolder(bobA, rootA.getId()).getId());
        assertEquals(fileA.getId(), isolation.requireFile(bobA, fileA.getId()).getId());
    }

    @Test
    void resourcesOfAnotherCompanyLookNonExistent() {
        assertThrows(ResourceNotFoundException.class, () -> isolation.requireNode(aliceA, rootB.getId()));
        assertThrows(ResourceNotFoundException.class, () -> isolation.requireFolder(aliceA, rootB.getId()));
        assertThrows(ResourceNotFoundException.class, () -> isolation.requireFile(aliceA, fileB.getId()));
        assertThrows(ResourceNotFoundException.class, () -> isolation.requireSameCompany(aliceA, rootB));
        assertThrows(ResourceNotFoundException.class, () -> isolation.requireFile(aliceA, 999_999L));
        assertThrows(ResourceNotFoundException.class, () -> isolation.requireFile(aliceA, null));
    }

    @Test
    void wrongTypeIsNotFound() {
        assertThrows(ResourceNotFoundException.class, () -> isolation.requireFolder(aliceA, fileA.getId()));
        assertThrows(ResourceNotFoundException.class, () -> isolation.requireFile(aliceA, rootA.getId()));
    }

    @Test
    void inactiveOrMissingAccountIsForbidden() {
        aliceA.setStatus(AccountStatus.DISABLED);
        assertThrows(ForbiddenException.class, () -> isolation.requireNode(aliceA, rootA.getId()));

        aliceA.setStatus(AccountStatus.PENDING);
        assertThrows(ForbiddenException.class, () -> isolation.requireFile(aliceA, fileA.getId()));

        assertThrows(ForbiddenException.class, () -> isolation.requireNode(null, rootA.getId()));
    }

    @Test
    void colleaguesAreActiveMembersOfTheSameCompany() {
        assertEquals(bobA.getId(), isolation.requireColleague(aliceA, bobA.getId()).getId());
        assertTrue(isolation.areActiveColleagues(aliceA, bobA));

        assertThrows(ResourceNotFoundException.class, () -> isolation.requireColleague(aliceA, carolB.getId()));
        assertFalse(isolation.areActiveColleagues(aliceA, carolB));

        bobA.setStatus(AccountStatus.DISABLED);
        em.flush();
        assertThrows(ResourceNotFoundException.class, () -> isolation.requireColleague(aliceA, bobA.getId()));
        assertFalse(isolation.areActiveColleagues(aliceA, bobA));
    }

    @Test
    void companyListingNeverMixesCompanies() {
        var nodesOfA = nodeRepository.findByCompany_Id(aliceA.getCompany().getId(), Pageable.unpaged()).getContent();

        assertEquals(2, nodesOfA.size());
        assertTrue(nodesOfA.stream().allMatch(node -> node.getCompany().getId().equals(aliceA.getCompany().getId())));
    }

    private static User user(String username, Company company, AccountStatus status) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setFirstName("Prénom");
        user.setLastName("Nom");
        user.setPasswordHash("hash");
        user.setCompany(company);
        user.setStatus(status);
        return user;
    }
}
