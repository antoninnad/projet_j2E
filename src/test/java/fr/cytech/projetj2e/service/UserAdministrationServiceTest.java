package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;

import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.UserRepository;

class UserAdministrationServiceTest {

    @Test
    void companyAdminApprovesAndDisablesOnlyOwnCompanyUser() {
        UserRepository users = mock(UserRepository.class);
        UserAdministrationService service = new UserAdministrationService(users, org.mockito.Mockito.mock(ActivityRecorder.class));
        Company company = company(1L);
        User admin = user(10L, company, UserRole.COMPANY_ADMIN, AccountStatus.ACTIVE);
        User target = user(11L, company, UserRole.MEMBER, AccountStatus.PENDING);

        when(users.findByIdAndCompany(11L, company)).thenReturn(Optional.of(target));
        when(users.save(target)).thenReturn(target);

        assertEquals(AccountStatus.ACTIVE, service.approve(admin, 11L).getStatus());
        target.setStatus(AccountStatus.ACTIVE);
        assertEquals(AccountStatus.DISABLED, service.disable(admin, 11L).getStatus());
        verify(users, org.mockito.Mockito.times(2)).save(target);
    }

    @Test
    void refusesMemberAndCrossCompanyTarget() {
        UserRepository users = mock(UserRepository.class);
        UserAdministrationService service = new UserAdministrationService(users, org.mockito.Mockito.mock(ActivityRecorder.class));
        Company company = company(1L);
        User member = user(10L, company, UserRole.MEMBER, AccountStatus.ACTIVE);

        assertThrows(ForbiddenException.class, () -> service.approve(member, 11L));

        User admin = user(12L, company, UserRole.COMPANY_ADMIN, AccountStatus.ACTIVE);
        when(users.findByIdAndCompany(99L, company)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.disable(admin, 99L));
    }

    @Test
    void declineRefusesNonPendingUser() {
        UserRepository users = mock(UserRepository.class);
        UserAdministrationService service = new UserAdministrationService(users, org.mockito.Mockito.mock(ActivityRecorder.class));
        Company company = company(1L);
        User admin = user(10L, company, UserRole.COMPANY_ADMIN, AccountStatus.ACTIVE);
        User active = user(11L, company, UserRole.MEMBER, AccountStatus.ACTIVE);
        when(users.findByIdAndCompany(11L, company)).thenReturn(Optional.of(active));

        assertThrows(IllegalArgumentException.class, () -> service.decline(admin, 11L));
    }

    private static Company company(Long id) {
        Company company = new Company("Entreprise", "DEMO-" + id);
        company.setId(id);
        return company;
    }

    private static User user(Long id, Company company, UserRole role, AccountStatus status) {
        User user = new User();
        user.setId(id);
        user.setUsername("user-" + id);
        user.setEmail("user-" + id + "@example.com");
        user.setFirstName("Prénom");
        user.setLastName("Nom");
        user.setPasswordHash("bcrypt-hash");
        user.setCompany(company);
        user.setRole(role);
        user.setStatus(status);
        return user;
    }
}
