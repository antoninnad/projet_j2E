package fr.cytech.projetj2e.controller;

import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

@Controller
public class PageController {

    private static final Set<String> ALLOWED_DASHBOARD_TABS = Set.of("files", "admin", "directory", "chat");

    @GetMapping("/dashboard")
    public String dashboard(
            HttpServletRequest request,
            @RequestParam(name = "tab", defaultValue = "files") String tab,
            Model model) {
        HttpSession session = request.getSession(false);
        if (!FrontendModelAdvice.isSessionAuthenticated(session)) {
            return "redirect:/login?required=true";
        }

        Object userId = session.getAttribute(FrontendModelAdvice.ATTR_USER_ID);
        if (userId != null) {
            model.addAttribute("userId", userId);
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
}
