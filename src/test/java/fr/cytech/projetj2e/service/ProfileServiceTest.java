package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserProfile;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.UserRepository;

class ProfileServiceTest {

    @Test
    void updatesOwnProfileAndPasswordThroughPasswordEncoder() {
        UserRepository users = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        ProfileService service = new ProfileService(users, encoder);
        User actor = user();
        UserProfile profile = new UserProfile();
        actor.setProfile(profile);

        UserProfile updated = service.updateMine(actor, "  Nouvelle bio  ", "https://example.com/avatar.png");

        assertEquals("Nouvelle bio", updated.getBio());
        assertEquals("https://example.com/avatar.png", updated.getProfilePictureUrl());

        when(encoder.matches("Secret123!", "bcrypt-hash")).thenReturn(true);
        when(encoder.encode("Nouveau123!")).thenReturn("new-bcrypt-hash");
        service.changePassword(actor, "Secret123!", "Nouveau123!", "Nouveau123!");
        assertEquals("new-bcrypt-hash", actor.getPasswordHash());
        verify(users).save(actor);
    }

    @Test
    void refusesWrongOrMismatchedPassword() {
        UserRepository users = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        ProfileService service = new ProfileService(users, encoder);
        User actor = user();
        when(encoder.matches("Wrong123!", "bcrypt-hash")).thenReturn(false);
        when(encoder.matches("Secret123!", "bcrypt-hash")).thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> service.changePassword(actor, "Wrong123!", "Nouveau123!", "Nouveau123!"));
        assertThrows(IllegalArgumentException.class,
                () -> service.changePassword(actor, "Secret123!", "Nouveau123!", "Different123!"));
    }

    private static User user() {
        Company company = new Company("Entreprise", "DEMO");
        company.setId(1L);
        User user = new User();
        user.setId(42L);
        user.setUsername("alice");
        user.setEmail("alice@example.com");
        user.setFirstName("Alice");
        user.setLastName("Dupont");
        user.setPasswordHash("bcrypt-hash");
        user.setStatus(AccountStatus.ACTIVE);
        user.setRole(UserRole.MEMBER);
        user.setCompany(company);
        return user;
    }
}
