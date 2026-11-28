package fr.cytech.projetj2e.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.AdminRepository;
import fr.cytech.projetj2e.repository.CompanyRepository;
import fr.cytech.projetj2e.service.SessionIdentityService;
import fr.cytech.projetj2e.service.UserAdministrationService;

@WebMvcTest(UserAdministrationRestController.class)
class UserAdministrationRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserAdministrationService administration;

    @MockitoBean
    private SessionIdentityService identity;

    @MockitoBean
    private AdminRepository adminRepository;

    @MockitoBean
    private CompanyRepository companyRepository;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    private final MockHttpSession session = new MockHttpSession();
    private final User actor = new User();

    @BeforeEach
    void setUp() {
        Company company = new Company("Entreprise", "ENT");
        company.setId(5L);
        actor.setCompany(company);
        actor.setStatus(AccountStatus.ACTIVE);
        actor.setRole(UserRole.COMPANY_ADMIN);
        when(identity.requireActiveMember(any())).thenReturn(actor);
    }

    @Test
    void returnsPaginatedCompanyUsersAndHonorsFiltersAndSort() throws Exception {
        User user = new User();
        user.setId(12L);
        user.setUsername("alice");
        user.setFirstName("Alice");
        user.setLastName("Martin");
        user.setEmail("alice@example.com");
        user.setStatus(AccountStatus.PENDING);
        user.setRole(UserRole.MEMBER);
        user.setCompany(actor.getCompany());

        Pageable pageable = PageRequest.of(1, 10, Sort.by(Sort.Direction.DESC, "username"));
        when(administration.listCompanyUsers(actor, AccountStatus.PENDING, "Alice", pageable))
                .thenReturn(new PageImpl<>(List.of(user), pageable, 11));

        mockMvc.perform(get("/api/users")
                        .param("page", "1")
                        .param("size", "10")
                        .param("sort", "username,desc")
                        .param("status", "PENDING")
                        .param("search", "Alice")
                        .session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].id").value(12))
                .andExpect(jsonPath("$.items[0].status").value("PENDING"))
                .andExpect(jsonPath("$.page.page").value(1))
                .andExpect(jsonPath("$.page.totalElements").value(11))
                .andExpect(jsonPath("$.page.totalPages").value(2))
                .andExpect(jsonPath("$.page.last").value(true))
                .andExpect(content().string(Matchers.not(Matchers.containsString("passwordHash"))));
        verify(administration).listCompanyUsers(eq(actor), eq(AccountStatus.PENDING),
                eq("Alice"), eq(pageable));
    }

    @Test
    void rejectsPageSizesAboveTheContractLimit() throws Exception {
        mockMvc.perform(get("/api/users").param("size", "101").session(session))
                .andExpect(status().isBadRequest());
    }
}
