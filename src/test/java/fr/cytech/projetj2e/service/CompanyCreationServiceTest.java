package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.CompanyRepository;
import fr.cytech.projetj2e.repository.UserRepository;

class CompanyCreationServiceTest {

    @Test
    void createsCompanyAndActiveCompanyAdmin() {
        CompanyRepository companies = mock(CompanyRepository.class);
        UserRepository users = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        CompanyCreationService service = new CompanyCreationService(companies, users, encoder);

        when(companies.existsByCode("ACME")).thenReturn(false);
        when(users.existsByUsername("alice")).thenReturn(false);
        when(users.existsByEmail("alice@acme.test")).thenReturn(false);
        when(companies.save(org.mockito.ArgumentMatchers.any(Company.class)))
                .thenAnswer(invocation -> {
                    Company company = invocation.getArgument(0);
                    company.setId(1L);
                    return company;
                });
        when(encoder.encode("Password123")).thenReturn("bcrypt-hash");
        when(users.save(org.mockito.ArgumentMatchers.any(User.class)))
                .thenAnswer(invocation -> {
                    User user = invocation.getArgument(0);
                    user.setId(10L);
                    return user;
                });

        CompanyCreationService.CreatedCompany created = service.create(
                "Acme", "acme", "Alice", "Martin", "alice",
                "alice@acme.test", "Password123", "Password123");

        assertEquals("ACME", created.company().getCode());
        assertEquals(AccountStatus.ACTIVE, created.admin().getStatus());
        assertEquals(UserRole.COMPANY_ADMIN, created.admin().getRole());
        assertEquals(created.company(), created.admin().getCompany());
        assertEquals("bcrypt-hash", created.admin().getPasswordHash());
        assertEquals(created.admin(), created.admin().getProfile().getUser());
    }

    @Test
    void rejectsDuplicateCodeAndPasswordMismatch() {
        CompanyRepository companies = mock(CompanyRepository.class);
        UserRepository users = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        CompanyCreationService service = new CompanyCreationService(companies, users, encoder);

        when(companies.existsByCode("ACME")).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> service.create(
                "Acme", "ACME", "Alice", "Martin", "alice",
                "alice@acme.test", "Password123", "Password123"));

        when(companies.existsByCode("NEW")).thenReturn(false);
        assertThrows(IllegalArgumentException.class, () -> service.create(
                "New", "NEW", "Alice", "Martin", "alice",
                "alice@new.test", "Password123", "Different123"));
    }
}
