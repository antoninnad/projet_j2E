package fr.cytech.projetj2e.service;

import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserProfile;
import fr.cytech.projetj2e.repository.UserRepository;

@Service
@Transactional
public class ProfileService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public ProfileService(UserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public UserProfile profile(User actor, Long userId) {
        requireActive(actor);
        User user = users.findByIdAndCompany(requireId(userId), actor.getCompany())
                .filter(candidate -> candidate.getStatus() == AccountStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
        if (user.getProfile() == null) {
            UserProfile profile = new UserProfile();
            profile.setUser(user);
            user.setProfile(profile);
        }
        return user.getProfile();
    }

    @Transactional(readOnly = true)
    public UserProfile myProfile(User actor) {
        requireActive(actor);
        if (actor.getProfile() == null) {
            UserProfile profile = new UserProfile();
            profile.setUser(actor);
            actor.setProfile(profile);
        }
        return actor.getProfile();
    }

    public UserProfile updateMine(User actor, String bio, String profilePictureUrl) {
        requireActive(actor);
        UserProfile profile = myProfile(actor);
        profile.setBio(normalize(bio, 2000));
        profile.setProfilePictureUrl(profilePictureUrl);
        return profile;
    }

    public void changePassword(User actor, String currentPassword, String newPassword,
                                String confirmPassword) {
        requireActive(actor);
        if (currentPassword == null || newPassword == null || confirmPassword == null
                || newPassword.length() < 8 || newPassword.length() > 72) {
            throw new IllegalArgumentException("Le nouveau mot de passe doit contenir entre 8 et 72 caractères.");
        }
        if (!passwordEncoder.matches(currentPassword, actor.getPasswordHash())) {
            throw new IllegalArgumentException("Mot de passe actuel incorrect.");
        }
        if (!newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("Les mots de passe ne correspondent pas.");
        }
        actor.setPasswordHash(passwordEncoder.encode(newPassword));
        users.save(actor);
    }

    @Transactional(readOnly = true)
    public List<User> listColleagues(User actor, String search) {
        requireActive(actor);
        String needle = search == null ? "" : search.trim().toLowerCase();
        return users.findByCompany(actor.getCompany()).stream()
                .filter(User::isActive)
                .filter(user -> needle.isEmpty()
                        || user.getUsername().toLowerCase().contains(needle)
                        || user.getFirstName().toLowerCase().contains(needle)
                        || user.getLastName().toLowerCase().contains(needle)
                        || user.getEmail().toLowerCase().contains(needle))
                .toList();
    }

    private static void requireActive(User user) {
        if (user == null || !user.isActive()) {
            throw new ForbiddenException("Compte actif requis.");
        }
    }

    private static Long requireId(Long id) {
        if (id == null) {
            throw new ResourceNotFoundException("Utilisateur introuvable.");
        }
        return id;
    }

    private static String normalize(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() > maxLength) {
            throw new IllegalArgumentException("Le texte dépasse " + maxLength + " caractères.");
        }
        return trimmed;
    }
}
