package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import fr.cytech.projetj2e.exception.InactiveAccountException;
import fr.cytech.projetj2e.dto.RegisterDTO;
import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.CompanyRepository;
import fr.cytech.projetj2e.repository.UserRepository;

class UserServiceTest {

    @Test
    void registerCreatesPendingUserAndProfile() {
        UserRepository users = mock(UserRepository.class);
        CompanyRepository companies = mock(CompanyRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        Company company = new Company("Entreprise", "DEMO");
        company.setId(1L);
        RegisterDTO dto = new RegisterDTO();
        dto.setUsername("alice");
        dto.setEmail("alice@example.com");
        dto.setFirstName("Alice");
        dto.setLastName("Dupont");
        dto.setPassword("Secret123!");
        dto.setConfirmPassword("Secret123!");
        dto.setCompanyCode("DEMO");
        when(companies.findByCode("DEMO")).thenReturn(Optional.of(company));
        when(encoder.encode("Secret123!")).thenReturn("bcrypt-hash");
        when(users.save(org.mockito.ArgumentMatchers.any(User.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        UserService service = new UserService(users, companies, encoder);
        User saved = service.register(dto);

        assertEquals(AccountStatus.PENDING, saved.getStatus());
        assertEquals("bcrypt-hash", saved.getPasswordHash());
        assertEquals(company, saved.getCompany());
        assertTrue(saved.getProfile() != null);
        assertEquals(saved, saved.getProfile().getUser());
    }

    @Test
    void registerRejectsPasswordMismatchAndDuplicateEmail() {
        UserRepository users = mock(UserRepository.class);
        CompanyRepository companies = mock(CompanyRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        RegisterDTO dto = new RegisterDTO();
        dto.setUsername("alice");
        dto.setEmail("alice@example.com");
        dto.setFirstName("Alice");
        dto.setLastName("Dupont");
        dto.setPassword("Secret123!");
        dto.setConfirmPassword("Different123!");
        dto.setCompanyCode("DEMO");

        UserService service = new UserService(users, companies, encoder);
        assertThrows(IllegalArgumentException.class, () -> service.register(dto));

        dto.setConfirmPassword("Secret123!");
        when(users.existsByEmail("alice@example.com")).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> service.register(dto));
    }

    @Test
    void registerRejectsDuplicateUsernameAfterPasswordValidation() {
        UserRepository users = mock(UserRepository.class);
        CompanyRepository companies = mock(CompanyRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        RegisterDTO dto = new RegisterDTO();
        dto.setUsername("alice");
        dto.setEmail("alice@example.com");
        dto.setFirstName("Alice");
        dto.setLastName("Dupont");
        dto.setPassword("Secret123!");
        dto.setConfirmPassword("Secret123!");
        dto.setCompanyCode("DEMO");
        when(users.existsByUsername("alice")).thenReturn(true);

        UserService service = new UserService(users, companies, encoder);

        assertThrows(IllegalArgumentException.class, () -> service.register(dto));
    }

    @Test
    void findUserAuthenticatesActiveUserByEmailWithBcrypt() {
        UserRepository users = mock(UserRepository.class);
        CompanyRepository companies = mock(CompanyRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        User user = activeUser();
        when(users.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(encoder.matches("Secret123!", "bcrypt-hash")).thenReturn(true);

        UserService service = new UserService(users, companies, encoder);

        assertEquals(user, service.findUser("alice@example.com", "Secret123!").orElseThrow());
    }

    @Test
    void findUserRejectsPendingAndDisabledAccounts() {
        for (AccountStatus status : new AccountStatus[] {
                AccountStatus.PENDING, AccountStatus.DISABLED }) {
            UserRepository users = mock(UserRepository.class);
            CompanyRepository companies = mock(CompanyRepository.class);
            PasswordEncoder encoder = mock(PasswordEncoder.class);
            User user = activeUser();
            user.setStatus(status);
            when(users.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
            when(encoder.matches("Secret123!", "bcrypt-hash")).thenReturn(true);

            UserService service = new UserService(users, companies, encoder);

            assertThrows(InactiveAccountException.class,
                    () -> service.findUser("alice@example.com", "Secret123!"));
        }
    }

    @Test
    void findUserReturnsEmptyForUnknownEmailOrWrongPassword() {
        UserRepository users = mock(UserRepository.class);
        CompanyRepository companies = mock(CompanyRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        User user = activeUser();
        when(users.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(encoder.matches("wrong", "bcrypt-hash")).thenReturn(false);

        UserService service = new UserService(users, companies, encoder);

        assertTrue(service.findUser("unknown@example.com", "Secret123!").isEmpty());
        assertTrue(service.findUser("alice@example.com", "wrong").isEmpty());
    }

    private User activeUser() {
        Company company = new Company("Entreprise", "DEMO");
        company.setId(1L);
        User user = new User();
        user.setId(42L);
        user.setUsername("alice");
        user.setEmail("alice@example.com");
        user.setPasswordHash("bcrypt-hash");
        user.setStatus(AccountStatus.ACTIVE);
        user.setCompany(company);
        return user;
    }
}
