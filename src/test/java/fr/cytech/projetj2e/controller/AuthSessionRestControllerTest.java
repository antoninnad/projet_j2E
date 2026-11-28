package fr.cytech.projetj2e.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.AdminRepository;
import fr.cytech.projetj2e.repository.CompanyRepository;
import fr.cytech.projetj2e.service.SessionIdentityService;

@WebMvcTest(AuthSessionRestController.class)
class AuthSessionRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SessionIdentityService identity;

    @MockitoBean
    private AdminRepository adminRepository;

    @MockitoBean
    private CompanyRepository companyRepository;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @Test
    void returnsTheCurrentUserWithoutCredentials() throws Exception {
        Company company = new Company("Entreprise", "ENT");
        company.setId(5L);
        User user = new User();
        user.setId(12L);
        user.setUsername("alice");
        user.setFirstName("Alice");
        user.setLastName("Martin");
        user.setEmail("alice@example.com");
        user.setRole(UserRole.COMPANY_ADMIN);
        user.setCompany(company);
        user.setPasswordHash("must-not-be-returned");
        when(identity.requireActiveMember(any())).thenReturn(user);

        mockMvc.perform(get("/api/auth/session").session(new MockHttpSession()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(true))
                .andExpect(jsonPath("$.user.id").value(12))
                .andExpect(jsonPath("$.user.role").value("COMPANY_ADMIN"))
                .andExpect(jsonPath("$.user.companyId").value(5))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("password"))));
    }
}
