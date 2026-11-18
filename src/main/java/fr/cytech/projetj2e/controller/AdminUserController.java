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
import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/admin")
public class AdminUserController {

    private final UserRepository users;

    public AdminUserController(UserRepository users) {
        this.users = users;
    }

    record PendingUser(Long id, String username, String firstName, String lastName, String email) {}

    @GetMapping("/dashboard")
    public String pending(HttpSession session, Model model) {
        if (!isAdmin(session)) {
            return "redirect:/adminLogin";
        }

        List<PendingUser> pendingUsers = users.findByStatus(AccountStatus.PENDING).stream()
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
        if (!isAdmin(session)) {
            return "redirect:/adminLogin";
        }

        Optional<User> user = users.findById(id);
        if (user.isEmpty()) {
            redirect.addFlashAttribute("error", "User not found.");
            return "redirect:/admin/dashboard";
        }

        user.get().setStatus(AccountStatus.ACTIVE);
        users.save(user.get());
        redirect.addFlashAttribute("notice", "User approved.");
        return "redirect:/admin/dashboard";
    }

    @PostMapping("/users/{id}/decline")
    public String decline(@PathVariable Long id,
                          HttpSession session,
                          RedirectAttributes redirect) {
        if (!isAdmin(session)) {
            return "redirect:/adminLogin";
        }

        Optional<User> user = users.findById(id);
        if (user.isEmpty()) {
            redirect.addFlashAttribute("error", "User not found.");
            return "redirect:/admin/dashboard";
        }
        if (user.get().getStatus() != AccountStatus.PENDING) {
            redirect.addFlashAttribute("error", "User is not pending approval.");
            return "redirect:/admin/dashboard";
        }

        users.delete(user.get());
        redirect.addFlashAttribute("notice", "Registration declined.");
        return "redirect:/admin/dashboard";
    }

    private boolean isAdmin(HttpSession session) {
        return session.getAttribute("adminId") != null;
    }
}
