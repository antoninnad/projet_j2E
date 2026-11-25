package fr.cytech.projetj2e.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.lang.reflect.RecordComponent;

import org.junit.jupiter.api.Test;

import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;

class PublicUserTest {

    @Test
    void containsIdentityButNoPasswordOrHashField() {
        Company company = new Company("Entreprise", "DEMO");
        company.setId(1L);
        User user = new User();
        user.setId(42L);
        user.setUsername("alice");
        user.setEmail("alice@example.com");
        user.setFirstName("Alice");
        user.setLastName("Dupont");
        user.setPasswordHash("secret-bcrypt-hash");
        user.setStatus(AccountStatus.ACTIVE);
        user.setRole(UserRole.MEMBER);
        user.setCompany(company);

        PublicUser publicUser = PublicUser.from(user);

        assertEquals(42L, publicUser.id());
        assertEquals("Alice Dupont", publicUser.getDisplayName());
        for (RecordComponent component : PublicUser.class.getRecordComponents()) {
            String name = component.getName().toLowerCase();
            assertFalse(name.contains("password"));
            assertFalse(name.contains("hash"));
            assertFalse(name.contains("secret"));
        }
    }
}
