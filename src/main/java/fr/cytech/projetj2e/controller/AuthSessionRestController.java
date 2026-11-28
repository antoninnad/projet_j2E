package fr.cytech.projetj2e.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.cytech.projetj2e.dto.PublicUser;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.service.SessionIdentityService;
import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/auth")
public class AuthSessionRestController {

    public record SessionResponse(boolean authenticated, PublicUser user) {}

    private final SessionIdentityService identity;

    public AuthSessionRestController(SessionIdentityService identity) {
        this.identity = identity;
    }

    @GetMapping("/session")
    public SessionResponse getSession(HttpSession session) {
        User user = identity.requireActiveMember(session);
        return new SessionResponse(true, PublicUser.from(user));
    }
}
