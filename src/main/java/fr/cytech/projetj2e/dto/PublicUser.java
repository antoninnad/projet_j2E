package fr.cytech.projetj2e.dto;

import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;

public record PublicUser(
        Long id,
        String username,
        String firstName,
        String lastName,
        String email,
        AccountStatus status,
        UserRole role,
        Long companyId) {

    public static PublicUser from(User user) {
        return new PublicUser(
                user.getId(),
                user.getUsername(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getStatus(),
                user.getRole(),
                user.getCompany() == null ? null : user.getCompany().getId());
    }

    public String getDisplayName() {
        return (firstName + " " + lastName).trim();
    }
}
