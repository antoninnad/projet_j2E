package fr.cytech.projetj2e.api;

import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Admin;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.AdminRepository;
import fr.cytech.projetj2e.repository.UserRepository;
import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/login")
public class LoginController {

    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    public LoginController(UserRepository userRepository,
                           AdminRepository adminRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
    }

    record LoginRequest(String username, String password) {}

    private static final ResponseEntity<?> INVALID = ResponseEntity
            .status(HttpStatus.UNAUTHORIZED)
            .body(Map.of("error", "Invalid username or password"));

    @PostMapping
    public ResponseEntity<?> login(@RequestBody LoginRequest req, HttpSession session) {
        Optional<User> opt = userRepository.findByUsername(req.username());

        if (opt.isEmpty() || !passwordEncoder.matches(req.password(), opt.get().getPasswordHash())) {
            return INVALID;
        }
        User user = opt.get();

        if (user.getStatus() == AccountStatus.PENDING) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Your account is awaiting admin approval"));
        }
        if (user.getStatus() == AccountStatus.DISABLED) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Your account has been disabled"));
        }

        session.setAttribute("userId", user.getId());
        return ResponseEntity.ok(Map.of("id", user.getId(), "username", user.getUsername()));
    }

    @PostMapping("/admin")
    public ResponseEntity<?> adminLogin(@RequestBody LoginRequest req, HttpSession session) {
        Optional<Admin> opt = adminRepository.findByUsername(req.username());

        if (opt.isEmpty() || !passwordEncoder.matches(req.password(), opt.get().getPassword())) {
            return INVALID;
        }
        Admin admin = opt.get();

        session.setAttribute("adminId", admin.getId());
        return ResponseEntity.ok(Map.of("id", admin.getId(), "username", admin.getUsername()));
    }
}