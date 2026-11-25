package fr.cytech.projetj2e.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.UserRepository;
import fr.cytech.projetj2e.service.SessionIdentityService;
import fr.cytech.projetj2e.service.UserAdministrationService;
import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/admin")
public class AdminUserController {

    private final UserRepository users;
    private final SessionIdentityService identity;
    private final UserAdministrationService administration;

    public AdminUserController(UserRepository users,
                               SessionIdentityService identity,
                               UserAdministrationService administration) {
        this.users = users;
        this.identity = identity;
        this.administration = administration;
    }

    record PendingUser(Long id, String username, String firstName, String lastName, String email) {}

    @GetMapping("/dashboard")
    public String pending(HttpSession session, Model model) {
        User actor;
        try {
            actor = identity.requireActiveMember(session);
        } catch (RuntimeException exception) {
            return "redirect:/adminLogin";
        }

        if (actor.getRole() != fr.cytech.projetj2e.model.UserRole.COMPANY_ADMIN) {
            return "redirect:/dashboard";
        }

        List<PendingUser> pendingUsers = users.findByCompanyAndStatus(actor.getCompany(), AccountStatus.PENDING).stream()
                .map(user -> new PendingUser(user.getId(), user.getUsername(),
                        user.getFirstName(), user.getLastName(), user.getEmail()))
                .toList();
        model.addAttribute("users", pendingUsers);
        return "admin-dashboard";
    }

    @PostMapping("/users/{id}/approve")
    public String approve(@PathVariable Long id,
                          HttpSession session,
                          RedirectAttributes redirect) {
        try {
            User actor = identity.requireActiveMember(session);
            administration.approve(actor, id);
            redirect.addFlashAttribute("notice", "User approved.");
            return "redirect:/admin/dashboard";
        } catch (RuntimeException exception) {
            redirect.addFlashAttribute("error", exception.getMessage());
            return "redirect:/admin/dashboard";
        }
    }

    @PostMapping("/users/{id}/decline")
    public String decline(@PathVariable Long id,
                          HttpSession session,
                          RedirectAttributes redirect) {
        try {
            User actor = identity.requireActiveMember(session);
            administration.decline(actor, id);
            redirect.addFlashAttribute("notice", "Registration declined.");
            return "redirect:/admin/dashboard";
        } catch (RuntimeException exception) {
            redirect.addFlashAttribute("error", exception.getMessage());
            return "redirect:/admin/dashboard";
        }
    }

    private boolean isAdmin(HttpSession session) {
        return session.getAttribute("adminId") != null;
    }
}
