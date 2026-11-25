package fr.cytech.projetj2e.controller;

import java.util.Set;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import fr.cytech.projetj2e.dto.PublicUser;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.service.ExplorationService;
import fr.cytech.projetj2e.service.SessionIdentityService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

@Controller
public class PageController {

    private static final Set<String> ALLOWED_DASHBOARD_TABS = Set.of("files", "admin", "directory", "chat");
    private static final Set<String> ADMIN_ONLY_TABS = Set.of("admin");
    private static final int RECENT_DOCUMENTS_LIMIT = 5;
    private final SessionIdentityService identityService;
    private final ExplorationService explorationService;

    public PageController(SessionIdentityService identityService, ExplorationService explorationService) {
        this.identityService = identityService;
        this.explorationService = explorationService;
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

        boolean isAdmin;
        User user;
        try {
            user = identityService.requireActiveMember(session);
            PublicUser publicUser = PublicUser.from(user);
            model.addAttribute("userId", user.getId());
            model.addAttribute("companyId", user.getCompany().getId());
            model.addAttribute("publicUser", publicUser);
            if (session.getAttribute(FrontendModelAdvice.ATTR_USERNAME) == null) {
                String displayName = publicUser.getDisplayName();
                model.addAttribute("sessionDisplayName",
                        !displayName.isBlank() ? displayName : publicUser.username());
            }
            boolean platformAdmin = session.getAttribute(FrontendModelAdvice.ATTR_ADMIN_ID) != null;
            isAdmin = platformAdmin || user.getRole() == UserRole.COMPANY_ADMIN;
            model.addAttribute("isAdmin", isAdmin);
        } catch (ForbiddenException exception) {
            session.invalidate();
            return "redirect:/login?expired=true";
        }

        String activeTab = ALLOWED_DASHBOARD_TABS.contains(tab) ? tab : "files";
        // L'onglet Administration est réservé aux administrateurs : un membre simple revient sur Documents.
        if (ADMIN_ONLY_TABS.contains(activeTab) && !isAdmin) {
            activeTab = "files";
        }
        model.addAttribute("activeTab", activeTab);

        // T18 : seuls les départements et documents autorisés pour ce compte sont transmis à la vue.
        model.addAttribute("departments", explorationService.accessibleDepartmentNames(user));
        model.addAttribute("recentDocuments", explorationService.recentDocumentNames(user, RECENT_DOCUMENTS_LIMIT));
        return "dashboard";
    }
}
