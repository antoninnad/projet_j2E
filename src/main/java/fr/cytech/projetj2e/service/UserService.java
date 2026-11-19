package fr.cytech.projetj2e.service;

import fr.cytech.projetj2e.dto.UserDto;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.User;

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
    public User register(UserDto dto) {
        if (userRepository.existsByUsername(dto.getUsername())) {
            throw new IllegalArgumentException("Cet identifiant est déjà utilisé");
        }
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new IllegalArgumentException("Cet email est déjà utilisé");
        }
        Company company = companyRepository.findByCode(dto.getCompanyCode())
                .orElseThrow(() -> new IllegalArgumentException("Code entreprise inconnu"));

        User user = new User();
        user.setUsername(dto.getUsername());
        user.setEmail(dto.getEmail());
        user.setFirstName(dto.getFirstName());
        user.setLastName(dto.getLastName());
        user.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        user.setCompany(company);
        // status = PENDING et role = MEMBER par défaut (voir User)
        return userRepository.save(user);
    }

    public Optional<User> authenticate(String username, String rawPassword) {
        return userRepository.findByUsername(username)
                .filter(u -> passwordEncoder.matches(rawPassword, u.getPasswordHash()));
    }
}
