package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.UserRepository;

class SessionIdentityServiceTest {

    @Test
    void reloadsActiveMemberAndCompanyFromDatabase() {
        UserRepository users = mock(UserRepository.class);
        Company company = new Company("Entreprise", "DEMO");
        company.setId(12L);
        User user = new User();
        user.setId(42L);
        user.setStatus(AccountStatus.ACTIVE);
        user.setCompany(company);
        when(users.findById(42L)).thenReturn(Optional.of(user));
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("userId", 42L);

        SessionIdentityService service = new SessionIdentityService(users);

        assertEquals(user, service.requireActiveMember(session));
        assertEquals(12L, service.requireActiveCompanyId(session));
        assertEquals(42L, ((fr.cytech.projetj2e.dto.PublicUser)
                session.getAttribute("publicUser")).id());
    }

    @Test
    void refusesInactiveOrMissingSessionIdentity() {
        UserRepository users = mock(UserRepository.class);
        SessionIdentityService service = new SessionIdentityService(users);

        assertThrows(ForbiddenException.class, () -> service.requireActiveMember(null));

        User inactive = new User();
        inactive.setId(42L);
        inactive.setStatus(AccountStatus.DISABLED);
        when(users.findById(42L)).thenReturn(Optional.of(inactive));
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("userId", 42L);

        assertThrows(ForbiddenException.class, () -> service.requireActiveMember(session));
    }
}
