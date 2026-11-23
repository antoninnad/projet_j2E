package fr.cytech.projetj2e.service;

import fr.cytech.projetj2e.dto.RegisterDTO;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.UserProfile;
import fr.cytech.projetj2e.exception.InactiveAccountException;

import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import fr.cytech.projetj2e.repository.CompanyRepository;
import fr.cytech.projetj2e.repository.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Crée un compte en attente d'approbation (statut PENDING, rôle MEMBER)
     * dans l'entreprise désignée par son code.
     */
    public User register(RegisterDTO dto) {
        if (dto == null
                || !org.springframework.util.StringUtils.hasText(dto.getUsername())
                || !org.springframework.util.StringUtils.hasText(dto.getEmail())
                || !org.springframework.util.StringUtils.hasText(dto.getFirstName())
                || !org.springframework.util.StringUtils.hasText(dto.getLastName())
                || !org.springframework.util.StringUtils.hasText(dto.getCompanyCode())
                || !org.springframework.util.StringUtils.hasText(dto.getPassword())
                || !org.springframework.util.StringUtils.hasText(dto.getConfirmPassword())) {
            throw new IllegalArgumentException("Tous les champs d'inscription sont obligatoires");
        }
        if (!dto.getPassword().equals(dto.getConfirmPassword())) {
            throw new IllegalArgumentException("Les mots de passe ne correspondent pas");
        }
        String username = dto.getUsername().trim();
        String email = dto.getEmail().trim();
        String firstName = dto.getFirstName().trim();
        String lastName = dto.getLastName().trim();
        String companyCode = dto.getCompanyCode().trim();

        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Cet identifiant est déjà utilisé");
        }
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Cet email est déjà utilisé");
        }
        Company company = companyRepository.findByCode(companyCode)
                .orElseThrow(() -> new IllegalArgumentException("Code entreprise inconnu"));

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        user.setCompany(company);
        UserProfile profile = new UserProfile();
        user.setProfile(profile);
        // status = PENDING et role = MEMBER par défaut (voir User)
        return userRepository.save(user);
    }

    public Optional<User> authenticate(String username, String rawPassword) {
        return userRepository.findByUsername(username)
                .filter(u -> passwordEncoder.matches(rawPassword, u.getPasswordHash()));
    }

    /**
     * Authentifie un utilisateur actif par email, en vérifiant le mot de passe BCrypt.
     */
    public Optional<User> findUser(String email, String rawPassword) {
        Optional<User> user = userRepository.findByEmail(email);
        if (user.isEmpty()) {
            return Optional.empty();
        }

        User candidate = user.get();
        if (!passwordEncoder.matches(rawPassword, candidate.getPasswordHash())) {
            return Optional.empty();
        }
        if (candidate.getStatus() == AccountStatus.PENDING
                || candidate.getStatus() == AccountStatus.DISABLED) {
            throw new InactiveAccountException(candidate.getStatus());
        }
        return candidate.getStatus() == AccountStatus.ACTIVE
                ? Optional.of(candidate)
                : Optional.empty();
    }
}
