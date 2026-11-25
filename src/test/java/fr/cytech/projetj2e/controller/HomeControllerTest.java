package fr.cytech.projetj2e.controller;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
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
import fr.cytech.projetj2e.repository.DepartmentRepository;
import fr.cytech.projetj2e.repository.FileRepository;
import fr.cytech.projetj2e.repository.NodeRepository;
import fr.cytech.projetj2e.repository.UserRepository;
import fr.cytech.projetj2e.service.UserService;
import fr.cytech.projetj2e.model.Admin;
import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.exception.InactiveAccountException;
import fr.cytech.projetj2e.service.ExplorationService;
import fr.cytech.projetj2e.service.SessionIdentityService;

import java.util.Optional;
import java.util.List;

@WebMvcTest({ HomeController.class, PageController.class, LoginController.class, RegisterController.class,
        AdminDashboardController.class })
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
    private DepartmentRepository departmentRepository;

    @MockitoBean
    private FileRepository fileRepository;

    @MockitoBean
    private NodeRepository nodeRepository;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private SessionIdentityService sessionIdentityService;

    @MockitoBean
    private ExplorationService explorationService;

    @BeforeEach
    void setUpActiveUsers() {
        Company company = new Company("Entreprise", "DEMO");
        company.setId(1L);
        for (Long id : new Long[] {42L, 7L}) {
            User user = new User();
            user.setId(id);
            user.setUsername("alice.dupont");
            user.setEmail("alice@example.com");
            user.setFirstName("Alice");
            user.setLastName("Dupont");
            user.setStatus(AccountStatus.ACTIVE);
            user.setCompany(company);
            when(userRepository.findById(id)).thenReturn(Optional.of(user));
            when(sessionIdentityService.requireActiveMember(org.mockito.ArgumentMatchers.any(MockHttpSession.class)))
                    .thenReturn(user);
        }
    }

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
                .andExpect(content().string(containsString("name=\"email\"")))
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
    void adminLoginRendersFormAndRedirectsToPlatformAdminPage() throws Exception {
        Admin admin = new Admin();
        admin.setId(5L);
        admin.setUsername("admin");
        admin.setPassword("$2a$hash");
        when(adminRepository.findByUsername("admin")).thenReturn(Optional.of(admin));
        when(passwordEncoder.matches("admin123", admin.getPassword())).thenReturn(true);

        mockMvc.perform(get("/adminLogin"))
                .andExpect(status().isOk())
                .andExpect(view().name("admin-login"))
                .andExpect(content().string(containsString("action=\"/adminLogin\"")));

        var loginResult = mockMvc.perform(post("/adminLogin").with(csrf())
                        .param("username", "admin")
                        .param("password", "admin123"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/admin/dashboard/listUsers"))
                .andExpect(result -> org.junit.jupiter.api.Assertions.assertEquals(
                        5L, result.getRequest().getSession().getAttribute("adminId")))
                .andReturn();

        when(userRepository.findAll()).thenReturn(List.of());
        mockMvc.perform(get("/admin/dashboard/listUsers")
                        .session((MockHttpSession) loginResult.getRequest().getSession(false)))
                .andExpect(status().isOk())
                .andExpect(view().name("admin-dashboard-listUsers"));
    }

    @Test
    void loginByEmailCreatesSafeSessionAndRotatesSessionId() throws Exception {
        Company company = new Company("Entreprise", "DEMO");
        company.setId(1L);
        User user = new User();
        user.setId(42L);
        user.setUsername("alice");
        user.setEmail("alice@example.com");
        user.setFirstName("Alice");
        user.setLastName("Dupont");
        user.setStatus(AccountStatus.ACTIVE);
        user.setCompany(company);
        when(userService.findUser("alice@example.com", "Secret123!"))
                .thenReturn(Optional.of(user));

        mockMvc.perform(post("/login").with(csrf())
                        .param("email", "alice@example.com")
                        .param("password", "Secret123!"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/dashboard"));
    }

    @Test
    void loginRefusesPendingAccount() throws Exception {
        when(userService.findUser("pending@example.com", "Secret123!"))
                .thenThrow(new InactiveAccountException(AccountStatus.PENDING));

        mockMvc.perform(post("/login").with(csrf())
                        .param("email", "pending@example.com")
                        .param("password", "Secret123!"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login?error=pending"));
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
        when(sessionIdentityService.requireActiveMember(session)).thenReturn(activeUser(42L, UserRole.COMPANY_ADMIN));

        mockMvc.perform(get("/dashboard").param("tab", "admin").session(session))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard"))
                .andExpect(content().string(containsString("Tableau de bord — Lagui")))
                .andExpect(content().string(containsString("data-react-mount=\"workspace\"")))
                .andExpect(content().string(containsString("data-initial-tab=\"admin\"")))
                .andExpect(content().string(containsString("data-is-admin=\"true\"")))
                .andExpect(content().string(containsString("alice.dupont")))
                .andExpect(content().string(containsString("action=\"/logout\"")));
    }

    @Test
    void dashboardFallsBackToFilesTabWhenMemberRequestsAdminTab() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(FrontendModelAdvice.ATTR_USER_ID, 7L);
        when(sessionIdentityService.requireActiveMember(session)).thenReturn(activeUser(7L, UserRole.MEMBER));

        mockMvc.perform(get("/dashboard").param("tab", "admin").session(session))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard"))
                .andExpect(content().string(containsString("data-initial-tab=\"files\"")))
                .andExpect(content().string(containsString("data-is-admin=\"false\"")));
    }

    private static User activeUser(Long id, UserRole role) {
        Company company = new Company("Entreprise", "DEMO");
        company.setId(1L);
        User user = new User();
        user.setId(id);
        user.setUsername("alice.dupont");
        user.setEmail("alice@example.com");
        user.setFirstName("Alice");
        user.setLastName("Dupont");
        user.setStatus(AccountStatus.ACTIVE);
        user.setRole(role);
        user.setCompany(company);
        return user;
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

    @Test
    void dashboardRedirectsWithExpiredMessageWhenAccountBecomesInactive() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(FrontendModelAdvice.ATTR_USER_ID, 99L);
        when(sessionIdentityService.requireActiveMember(session))
                .thenThrow(new fr.cytech.projetj2e.exception.ForbiddenException("Compte désactivé"));

        mockMvc.perform(get("/dashboard").session(session))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login?expired=true"));
    }

    @Test
    void logoutInvalidatesSessionAndRedirectsToLoginWithLogoutParam() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(FrontendModelAdvice.ATTR_USER_ID, 42L);

        mockMvc.perform(post("/logout").with(csrf()).session(session))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login?logout"));
    }
}
