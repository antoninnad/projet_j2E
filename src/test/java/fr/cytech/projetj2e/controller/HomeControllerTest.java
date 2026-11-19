package fr.cytech.projetj2e.controller;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import fr.cytech.projetj2e.repository.AdminRepository;
import fr.cytech.projetj2e.repository.CompanyRepository;
import fr.cytech.projetj2e.repository.UserRepository;
import fr.cytech.projetj2e.service.UserService;

@WebMvcTest({ HomeController.class, PageController.class, LoginController.class, RegisterController.class })
@Import(FrontendModelAdvice.class)
class HomeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminRepository adminRepository;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private CompanyRepository companyRepository;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @Test
    void indexRendersThymeleafTemplateWithSharedFragmentsAndAssets() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(view().name("index"))
                .andExpect(content().string(containsString("Accueil — Lagui")))
                .andExpect(content().string(containsString("/ui/app.css")))
                .andExpect(content().string(containsString("/ui/app.js")))
                .andExpect(content().string(containsString("Navigation principale")))
                .andExpect(content().string(containsString("Aller au contenu principal")))
                .andExpect(content().string(containsString("Espace collaboratif cloisonné par entreprise")));
    }

    @Test
    void loginRendersFormAndDisplaysQueryMessages() throws Exception {
        mockMvc.perform(get("/login").param("required", "true"))
                .andExpect(status().isOk())
                .andExpect(view().name("login"))
                .andExpect(content().string(containsString("Connexion — Lagui")))
                .andExpect(content().string(containsString("action=\"/login\"")))
                .andExpect(content().string(containsString("name=\"username\"")))
                .andExpect(content().string(containsString("name=\"password\"")))
                .andExpect(content().string(containsString("Veuillez vous connecter pour accéder à votre tableau de bord.")));
    }

    @Test
    void loginDisplaysPendingAccountMessage() throws Exception {
        mockMvc.perform(get("/login").param("error", "pending"))
                .andExpect(status().isOk())
                .andExpect(view().name("login"))
                .andExpect(content().string(containsString("en attente d'approbation")));
    }

    @Test
    void registerRendersExpectedFieldsAndFragments() throws Exception {
        mockMvc.perform(get("/register"))
                .andExpect(status().isOk())
                .andExpect(view().name("register"))
                .andExpect(content().string(containsString("Inscription — Lagui")))
                .andExpect(content().string(containsString("action=\"/register\"")))
                .andExpect(content().string(containsString("name=\"firstName\"")))
                .andExpect(content().string(containsString("name=\"lastName\"")))
                .andExpect(content().string(containsString("name=\"username\"")))
                .andExpect(content().string(containsString("name=\"companyCode\"")))
                .andExpect(content().string(containsString("name=\"email\"")))
                .andExpect(content().string(containsString("name=\"password\"")))
                .andExpect(content().string(containsString("name=\"confirmPassword\"")));
    }

    @Test
    void dashboardRedirectsAnonymousVisitorToLogin() throws Exception {
        mockMvc.perform(get("/dashboard"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login?required=true"));
    }

    @Test
    void dashboardRendersWithSharedFragmentsAndReactMountWhenAuthenticated() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(FrontendModelAdvice.ATTR_USER_ID, 42L);
        session.setAttribute(FrontendModelAdvice.ATTR_USERNAME, "alice.dupont");

        mockMvc.perform(get("/dashboard").param("tab", "admin").session(session))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard"))
                .andExpect(content().string(containsString("Tableau de bord — Lagui")))
                .andExpect(content().string(containsString("data-react-mount=\"workspace\"")))
                .andExpect(content().string(containsString("data-initial-tab=\"admin\"")))
                .andExpect(content().string(containsString("alice.dupont")))
                .andExpect(content().string(containsString("action=\"/logout\"")));
    }

    @Test
    void dashboardFallsBackToFilesTabOnUnknownTabValue() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(FrontendModelAdvice.ATTR_USER_ID, 7L);

        mockMvc.perform(get("/dashboard").param("tab", "invalide").session(session))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard"))
                .andExpect(content().string(containsString("data-initial-tab=\"files\"")));
    }
}
