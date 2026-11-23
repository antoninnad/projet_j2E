package fr.cytech.projetj2e.service;

import org.springframework.stereotype.Service;

import fr.cytech.projetj2e.dto.PublicUser;
import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.UserRepository;
import jakarta.servlet.http.HttpSession;

@Service
public class SessionIdentityService {
    public static final String USER_ID = "userId";
    public static final String PUBLIC_USER = "publicUser";

    private final UserRepository userRepository;

    public SessionIdentityService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** Recharge le compte depuis la base pour toute décision privée. */
    public User requireActiveMember(HttpSession session) {
        if (session == null) {
            throw new ForbiddenException("Session requise.");
        }

        Object value = session.getAttribute(USER_ID);
        if (!(value instanceof Number id)) {
            throw new ForbiddenException("Compte membre requis.");
        }

        User user = userRepository.findById(id.longValue())
                .orElseThrow(() -> new ForbiddenException("Compte introuvable."));
        if (user.getStatus() != AccountStatus.ACTIVE || user.getCompany() == null) {
            throw new ForbiddenException("Compte inactif ou non rattaché à une entreprise.");
        }

        session.setAttribute(PUBLIC_USER, PublicUser.from(user));
        return user;
    }

    public Long requireActiveCompanyId(HttpSession session) {
        return requireActiveMember(session).getCompany().getId();
    }
}
