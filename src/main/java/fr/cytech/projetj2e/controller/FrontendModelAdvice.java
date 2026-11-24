package fr.cytech.projetj2e.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

import fr.cytech.projetj2e.dto.PublicUser;
import fr.cytech.projetj2e.model.UserRole;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

/**
 * Expose aux templates Thymeleaf les informations communes de layout
 * (configuration des assets frontend et état minimal de session basé sur PublicUser).
 */
@ControllerAdvice(annotations = Controller.class)
public class FrontendModelAdvice {

    public static final String ATTR_PUBLIC_USER = "publicUser";
    public static final String ATTR_USER_ID = "userId";
    public static final String ATTR_ADMIN_ID = "adminId";
    public static final String ATTR_USERNAME = "username";

    private final String frontendDevServerUrl;

    public FrontendModelAdvice(@Value("${app.frontend.dev-server-url:}") String frontendDevServerUrl) {
        String trimmed = frontendDevServerUrl == null ? "" : frontendDevServerUrl.trim();
        this.frontendDevServerUrl = trimmed.endsWith("/")
                ? trimmed.substring(0, trimmed.length() - 1)
                : trimmed;
    }

    @ModelAttribute
    public void populateCommonAttributes(HttpServletRequest request, Model model) {
        model.addAttribute("frontendDevServerUrl", frontendDevServerUrl);
        model.addAttribute("useViteDevServer", !frontendDevServerUrl.isEmpty());

        HttpSession session = request.getSession(false);
        boolean authenticated = isSessionAuthenticated(session);
        boolean platformAdmin = session != null && session.getAttribute(ATTR_ADMIN_ID) != null;
        PublicUser publicUser = session != null && session.getAttribute(ATTR_PUBLIC_USER) instanceof PublicUser pu
                ? pu
                : null;
        boolean companyAdmin = publicUser != null && publicUser.role() == UserRole.COMPANY_ADMIN;

        model.addAttribute("isAuthenticated", authenticated);
        model.addAttribute("isPlatformAdmin", platformAdmin);
        model.addAttribute("isAdmin", platformAdmin || companyAdmin);
        model.addAttribute("publicUser", publicUser);
        model.addAttribute("sessionDisplayName", resolveDisplayName(session, publicUser, platformAdmin));
    }

    public static boolean isSessionAuthenticated(HttpSession session) {
        if (session == null) {
            return false;
        }
        return session.getAttribute(ATTR_PUBLIC_USER) != null
                || session.getAttribute(ATTR_USER_ID) != null
                || session.getAttribute(ATTR_ADMIN_ID) != null;
    }

    private static String resolveDisplayName(HttpSession session, PublicUser publicUser, boolean platformAdmin) {
        if (session == null) {
            return "";
        }
        if (publicUser != null) {
            String displayName = publicUser.getDisplayName();
            if (!displayName.isBlank()) {
                return displayName;
            }
            if (publicUser.username() != null && !publicUser.username().isBlank()) {
                return publicUser.username();
            }
            if (publicUser.email() != null && !publicUser.email().isBlank()) {
                return publicUser.email();
            }
        }
        Object username = session.getAttribute(ATTR_USERNAME);
        if (username instanceof String value && !value.isBlank()) {
            return value;
        }
        if (platformAdmin) {
            return "Administrateur";
        }
        if (session.getAttribute(ATTR_USER_ID) != null) {
            return "Membre connecté";
        }
        return "";
    }
}
