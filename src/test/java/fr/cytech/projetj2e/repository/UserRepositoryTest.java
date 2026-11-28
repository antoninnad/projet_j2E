package fr.cytech.projetj2e.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.User;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import(BCryptPasswordEncoder.class)
class UserRepositoryTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private UserRepository users;

    private Company company;

    @BeforeEach
    void setUp() {
        company = em.persist(new Company("Entreprise A", "A"));
        Company otherCompany = em.persist(new Company("Entreprise B", "B"));
        em.persist(user("alice.pending", "alice@example.com", AccountStatus.PENDING, company));
        em.persist(user("alice.active", "active@example.com", AccountStatus.ACTIVE, company));
        em.persist(user("alice.foreign", "foreign@example.com", AccountStatus.PENDING, otherCompany));
        em.flush();
    }

    @Test
    void searchesWithinTheCompanyAndFiltersStatusAndText() {
        Page<User> results = users.searchCompanyUsers(
                company,
                AccountStatus.PENDING,
                "alice",
                PageRequest.of(0, 10, Sort.by("username")));

        assertEquals(1, results.getTotalElements());
        assertEquals(List.of("alice.pending"),
                results.getContent().stream().map(User::getUsername).toList());
    }

    @Test
    void returnsPaginatedAllStatusesWhenNoStatusFilterIsProvided() {
        Page<User> results = users.searchCompanyUsers(
                company,
                null,
                null,
                PageRequest.of(0, 1, Sort.by("username")));

        assertEquals(2, results.getTotalElements());
        assertEquals(1, results.getContent().size());
        assertEquals(2, results.getTotalPages());
    }

    private static User user(String username, String email, AccountStatus status, Company company) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setFirstName(username);
        user.setLastName("Test");
        user.setPasswordHash("hash");
        user.setStatus(status);
        user.setCompany(company);
        return user;
    }
}
