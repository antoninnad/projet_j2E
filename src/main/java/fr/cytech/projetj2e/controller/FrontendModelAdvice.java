package fr.cytech.projetj2e.controller;

import java.lang.reflect.Method;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

/**
 * Expose aux templates Thymeleaf les informations communes de layout
 * (configuration des assets frontend et état minimal de session sans secrets).
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
        boolean admin = session != null && session.getAttribute(ATTR_ADMIN_ID) != null;

        model.addAttribute("isAuthenticated", authenticated);
        model.addAttribute("isAdmin", admin);
        model.addAttribute("sessionDisplayName", resolveDisplayName(session, admin));
    }

    public static boolean isSessionAuthenticated(HttpSession session) {
        if (session == null) {
            return false;
        }
        return session.getAttribute(ATTR_PUBLIC_USER) != null
                || session.getAttribute(ATTR_USER_ID) != null
                || session.getAttribute(ATTR_ADMIN_ID) != null;
    }

    private static String resolveDisplayName(HttpSession session, boolean admin) {
        if (session == null) {
            return "";
        }
        Object publicUser = session.getAttribute(ATTR_PUBLIC_USER);
        if (publicUser != null) {
            String name = readSafeDisplayName(publicUser);
            if (!name.isBlank()) {
                return name;
            }
        }
        Object username = session.getAttribute(ATTR_USERNAME);
        if (username instanceof String value && !value.isBlank()) {
            return value;
        }
        if (admin) {
            return "Administrateur";
        }
        if (session.getAttribute(ATTR_USER_ID) != null) {
            return "Membre connecté";
        }
        return "";
    }

    /**
     * Compatibilité ascendante avec le futur PublicUser (T11) sans dépendre de sa signature exacte.
     */
    private static String readSafeDisplayName(Object publicUser) {
        for (String methodName : new String[] { "getDisplayName", "displayName", "getUsername", "username", "getEmail", "email" }) {
            try {
                Method method = publicUser.getClass().getMethod(methodName);
                Object value = method.invoke(publicUser);
                if (value instanceof String str && !str.isBlank()) {
                    return str;
                }
            } catch (ReflectiveOperationException ignored) {
                // Essai du prochain accesseur sûr
            }
        }
        return "";
    }
}
