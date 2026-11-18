package fr.cytech.projetj2e.controller;

import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Admin;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.AdminRepository;
import fr.cytech.projetj2e.repository.UserRepository;
import jakarta.servlet.http.HttpSession;

@Controller
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

    @GetMapping("/login")
    public String loginForm() {
        return "login";
    }

    @GetMapping("/adminLogin")
    public String adminLoginForm() {
        return "admin-login";
    }

    @PostMapping("/login")
    public String login(@RequestParam String username,
                        @RequestParam String password,
                        HttpSession session) {
        Optional<User> user = userRepository.findByUsername(username)
                .filter(candidate -> passwordEncoder.matches(password, candidate.getPasswordHash()));

        if (user.isEmpty()) {
            return "redirect:/login?error";
        }

        if (user.get().getStatus() == AccountStatus.PENDING) {
            return "redirect:/login?error=pending";
        }
        if (user.get().getStatus() == AccountStatus.DISABLED) {
            return "redirect:/login?error=disabled";
        }

        session.setAttribute("userId", user.get().getId());
        return "redirect:/dashboard";
    }

    @PostMapping("/adminLogin")
    public String adminLogin(@RequestParam String username,
                             @RequestParam String password,
                             HttpSession session) {
        Optional<Admin> admin = adminRepository.findByUsername(username)
                .filter(candidate -> passwordEncoder.matches(password, candidate.getPassword()));

        if (admin.isEmpty()) {
            return "redirect:/adminLogin?error";
        }

        session.setAttribute("adminId", admin.get().getId());
        return "redirect:/admin/dashboard";
    }

    @PostMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/login?logout";
    }
}
