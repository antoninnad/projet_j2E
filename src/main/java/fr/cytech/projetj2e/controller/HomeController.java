package fr.cytech.projetj2e.controller;

import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

/**
 * Contrôleur MVC servant les pages Thymeleaf du socle (/, /register, /login, /dashboard).
 * Les soumissions POST d'authentification/inscription et la logique métier associée
 * sont branchées dans les tâches T11–T13.
 */
@Controller
public class HomeController {

    private static final Set<String> ALLOWED_DASHBOARD_TABS = Set.of("files", "admin", "directory", "chat");

    @GetMapping("/")
    public String index() {
        return "index";
    }

    @GetMapping("/login")
    public String login(Model model) {
        if (!model.containsAttribute("loginForm")) {
            model.addAttribute("loginForm", new LoginFormView());
        }
        return "login";
    }

    @GetMapping("/register")
    public String register(Model model) {
        if (!model.containsAttribute("registerForm")) {
            model.addAttribute("registerForm", new RegisterFormView());
        }
        return "register";
    }

    @GetMapping("/dashboard")
    public String dashboard(
            HttpServletRequest request,
            @RequestParam(name = "tab", defaultValue = "files") String tab,
            Model model) {
        HttpSession session = request.getSession(false);
        if (!FrontendModelAdvice.isSessionAuthenticated(session)) {
            return "redirect:/login?required=true";
        }

        String activeTab = ALLOWED_DASHBOARD_TABS.contains(tab) ? tab : "files";
        model.addAttribute("activeTab", activeTab);

        // Listes alimentées côté serveur dès l'intégration de T18 (Exploration backend).
        if (!model.containsAttribute("departments")) {
            model.addAttribute("departments", List.of());
        }
        if (!model.containsAttribute("recentDocuments")) {
            model.addAttribute("recentDocuments", List.of());
        }
        return "dashboard";
    }

    /**
     * Vue-modèle de formulaire de connexion alignée sur LoginDTO (email + password).
     */
    public static class LoginFormView {
        private String email = "";
        private String password = "";

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }

    /**
     * Vue-modèle de formulaire d'inscription alignée sur RegisterDTO.
     */
    public static class RegisterFormView {
        private String firstName = "";
        private String lastName = "";
        private String username = "";
        private String email = "";
        private String companyCode = "";
        private String password = "";
        private String confirmPassword = "";

        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }

        public String getLastName() {
            return lastName;
        }

        public void setLastName(String lastName) {
            this.lastName = lastName;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getCompanyCode() {
            return companyCode;
        }

        public void setCompanyCode(String companyCode) {
            this.companyCode = companyCode;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public String getConfirmPassword() {
            return confirmPassword;
        }

        public void setConfirmPassword(String confirmPassword) {
            this.confirmPassword = confirmPassword;
        }
    }
}
