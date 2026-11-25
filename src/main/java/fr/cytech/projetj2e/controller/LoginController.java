package fr.cytech.projetj2e.controller;

import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Admin;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.dto.LoginDTO;
import fr.cytech.projetj2e.dto.PublicUser;
import fr.cytech.projetj2e.exception.InactiveAccountException;
import fr.cytech.projetj2e.repository.AdminRepository;
import fr.cytech.projetj2e.repository.UserRepository;
import fr.cytech.projetj2e.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

@Controller
public class LoginController {

    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserService userService;

    public LoginController(UserRepository userRepository,
                           AdminRepository adminRepository,
                           PasswordEncoder passwordEncoder,
                           UserService userService) {
        this.userRepository = userRepository;
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
        this.userService = userService;
    }

    @GetMapping("/login")
    public String loginForm(Model model) {
        if (!model.containsAttribute("loginDto")) {
            model.addAttribute("loginDto", new LoginDTO());
        }
        return "login";
    }

    @GetMapping("/adminLogin")
    public String adminLoginForm() {
        return "admin-login";
    }

    @PostMapping("/login")
    public String login(@Valid @ModelAttribute("loginDto") LoginDTO loginDto,
                        BindingResult result,
                        HttpServletRequest request,
                        HttpSession session) {
        if (result.hasErrors()) {
            return "login";
        }

        Optional<User> user;
        try {
            user = userService.findUser(loginDto.getEmail(), loginDto.getPassword());
        } catch (InactiveAccountException exception) {
            return "redirect:/login?error="
                    + (exception.getStatus() == AccountStatus.PENDING ? "pending" : "disabled");
        }

        if (user.isEmpty()) {
            return "redirect:/login?error";
        }

        request.changeSessionId();
        session.setAttribute("userId", user.get().getId());
        session.setAttribute("publicUser", PublicUser.from(user.get()));
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
        return "redirect:/admin/dashboard/listUsers";
    }

    @PostMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/login?logout";
    }
}
