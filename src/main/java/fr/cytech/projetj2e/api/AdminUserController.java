package fr.cytech.projetj2e.api;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.UserRepository;
import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserRepository users;

    public AdminUserController(UserRepository users) { this.users = users; }

    record PendingUser(Long id, String username, String firstName, String lastName, String email) {}

    private void requireAdmin(HttpSession session) {
        if (session.getAttribute("adminId") == null)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
    }

    @GetMapping("/pending")
    public List<PendingUser> pending(HttpSession session) {
        requireAdmin(session);
        return users.findByStatus(AccountStatus.PENDING).stream()
                .map(u -> new PendingUser(u.getId(), u.getUsername(),
                        u.getFirstName(), u.getLastName(), u.getEmail()))
                .toList();
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<Void> approve(@PathVariable Long id, HttpSession session) {
        requireAdmin(session);
        User u = users.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        u.setStatus(AccountStatus.ACTIVE);
        users.save(u);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/decline")
    public ResponseEntity<Void> decline(@PathVariable Long id, HttpSession session) {
        requireAdmin(session);
        User u = users.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        // Refuser une inscription ne concerne que les comptes en attente
        if (u.getStatus() != AccountStatus.PENDING)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User is not pending approval");
        users.delete(u);
        return ResponseEntity.noContent().build();
    }
}