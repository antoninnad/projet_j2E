package fr.cytech.projetj2e.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserProfile;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.CompanyRepository;
import fr.cytech.projetj2e.repository.UserRepository;

@Service
@Transactional
public class CompanyCreationService {

    private final CompanyRepository companies;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public CompanyCreationService(CompanyRepository companies,
                                  UserRepository users,
                                  PasswordEncoder passwordEncoder) {
        this.companies = companies;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    public CreatedCompany create(String companyName,
                                 String companyCode,
                                 String adminFirstName,
                                 String adminLastName,
                                 String adminUsername,
                                 String adminEmail,
                                 String adminPassword,
                                 String confirmPassword) {
        if (!hasText(companyName) || !hasText(companyCode)
                || !hasText(adminFirstName) || !hasText(adminLastName)
                || !hasText(adminUsername) || !hasText(adminEmail)
                || !hasText(adminPassword) || !hasText(confirmPassword)) {
            throw new IllegalArgumentException("Tous les champs de création d'entreprise sont obligatoires.");
        }
        if (!adminPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("La confirmation du mot de passe ne correspond pas.");
        }
        if (adminPassword.length() < 8) {
            throw new IllegalArgumentException("Le mot de passe doit contenir au moins 8 caractères.");
        }

        String normalizedName = companyName.trim();
        String normalizedCode = companyCode.trim().toUpperCase();
        String normalizedUsername = adminUsername.trim();
        String normalizedEmail = adminEmail.trim();

        if (companies.existsByCode(normalizedCode)) {
            throw new IllegalArgumentException("Ce code d'entreprise est déjà utilisé.");
        }
        if (users.existsByUsername(normalizedUsername)) {
            throw new IllegalArgumentException("Cet identifiant est déjà utilisé.");
        }
        if (users.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("Cet email est déjà utilisé.");
        }

        Company company = companies.save(new Company(normalizedName, normalizedCode));

        User admin = new User();
        admin.setFirstName(adminFirstName.trim());
        admin.setLastName(adminLastName.trim());
        admin.setUsername(normalizedUsername);
        admin.setEmail(normalizedEmail);
        admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        admin.setStatus(AccountStatus.ACTIVE);
        admin.setRole(UserRole.COMPANY_ADMIN);
        admin.setCompany(company);
        UserProfile profile = new UserProfile();
        admin.setProfile(profile);
        User savedAdmin = users.save(admin);

        company.addUser(savedAdmin);
        return new CreatedCompany(company, savedAdmin);
    }

    private static boolean hasText(String value) {
        return StringUtils.hasText(value);
    }

    public record CreatedCompany(Company company, User admin) {}
}
