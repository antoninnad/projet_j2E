package fr.cytech.projetj2e.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.UserRepository;

@Service
@Transactional
public class UserAdministrationService {

    private final UserRepository users;

    public UserAdministrationService(UserRepository users) {
        this.users = users;
    }

    public User approve(User actor, Long userId) {
        User target = requireCompanyTarget(actor, userId);
        if (target.getStatus() != AccountStatus.PENDING) {
            throw new IllegalArgumentException("Ce compte n'est pas en attente d'approbation.");
        }
        target.setStatus(AccountStatus.ACTIVE);
        return users.save(target);
    }

    public void decline(User actor, Long userId) {
        User target = requireCompanyTarget(actor, userId);
        if (target.getStatus() != AccountStatus.PENDING) {
            throw new IllegalArgumentException("Ce compte n'est pas en attente d'approbation.");
        }
        users.delete(target);
    }

    public User disable(User actor, Long userId) {
        User target = requireCompanyTarget(actor, userId);
        target.setStatus(AccountStatus.DISABLED);
        return users.save(target);
    }

    private User requireCompanyTarget(User actor, Long userId) {
        if (actor == null || !actor.isActive()
                || actor.getRole() != UserRole.COMPANY_ADMIN
                || actor.getCompany() == null) {
            throw new ForbiddenException("Administrateur de l'entreprise requis.");
        }
        if (userId == null) {
            throw new ResourceNotFoundException("Compte introuvable.");
        }
        return users.findByIdAndCompany(userId, actor.getCompany())
                .orElseThrow(() -> new ResourceNotFoundException("Compte introuvable."));
    }
}
