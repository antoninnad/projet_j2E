package fr.cytech.projetj2e.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.Membership;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.AdminRepository;
import fr.cytech.projetj2e.repository.CompanyRepository;
import fr.cytech.projetj2e.repository.MembershipRepository;
import fr.cytech.projetj2e.repository.UserRepository;
import fr.cytech.projetj2e.service.DepartmentService;
import fr.cytech.projetj2e.service.SessionIdentityService;

@WebMvcTest(DepartmentRestController.class)
class DepartmentRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DepartmentService departments;

    @MockitoBean
    private SessionIdentityService identity;

    @MockitoBean
    private UserRepository users;

    @MockitoBean
    private MembershipRepository memberships;

    @MockitoBean
    private AdminRepository adminRepository;

    @MockitoBean
    private CompanyRepository companyRepository;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    private final MockHttpSession session = new MockHttpSession();
    private final Company company = new Company("Entreprise", "ENT");
    private final User actor = new User();

    @BeforeEach
    void setUp() {
        company.setId(1L);
        actor.setCompany(company);
        when(identity.requireActiveMember(any())).thenReturn(actor);
    }

    @Test
    void listsDepartmentsUsingThePagedResponseContract() throws Exception {
        Department finance = department(2L, "Finance");
        Department hr = department(3L, "Ressources humaines");
        when(departments.list(actor)).thenReturn(List.of(finance, hr));

        mockMvc.perform(get("/api/departments")
                        .param("page", "0")
                        .param("size", "1")
                        .param("sort", "name,desc")
                        .session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Ressources humaines"))
                .andExpect(jsonPath("$.items[0].companyId").value(1))
                .andExpect(jsonPath("$.page.page").value(0))
                .andExpect(jsonPath("$.page.totalElements").value(2))
                .andExpect(jsonPath("$.page.totalPages").value(2))
                .andExpect(jsonPath("$.page.last").value(false));
    }

    @Test
    void listsOnlyMembersForTheAuthorizedDepartment() throws Exception {
        Department department = department(4L, "Finance");
        User member = new User();
        member.setId(12L);
        member.setUsername("alice");
        member.setFirstName("Alice");
        member.setLastName("Martin");
        member.setEmail("alice@example.com");
        member.setCompany(company);
        Membership membership = new Membership(member, department, 3);
        Company otherCompany = new Company("Autre entreprise", "AUTRE");
        otherCompany.setId(2L);
        User otherMember = new User();
        otherMember.setId(13L);
        otherMember.setCompany(otherCompany);
        Membership foreignMembership = new Membership(otherMember, department, 5);
        when(departments.requireDepartment(actor, 4L)).thenReturn(department);
        when(memberships.findByDepartment(department)).thenReturn(List.of(membership, foreignMembership));

        mockMvc.perform(get("/api/departments/4/members").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].userId").value(12))
                .andExpect(jsonPath("$[0].username").value("alice"))
                .andExpect(jsonPath("$[0].email").value("alice@example.com"))
                .andExpect(jsonPath("$[0].accessLevel").value(3));
    }

    @Test
    void updatesMembershipAtTheDocumentedRouteAndWithTheDocumentedBody() throws Exception {
        Department department = department(4L, "Finance");
        User member = new User();
        member.setId(12L);
        member.setCompany(company);
        Membership membership = new Membership(member, department, 3);
        membership.setId(8L);
        when(users.findById(12L)).thenReturn(Optional.of(member));
        when(departments.setMember(actor, 4L, member, 3)).thenReturn(membership);

        mockMvc.perform(put("/api/departments/4/members")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":12,\"accessLevel\":3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(8))
                .andExpect(jsonPath("$.userId").value(12))
                .andExpect(jsonPath("$.departmentId").value(4))
                .andExpect(jsonPath("$.accessLevel").value(3));
    }

    @Test
    void rejectsInvalidPagination() throws Exception {
        mockMvc.perform(get("/api/departments").param("size", "101").session(session))
                .andExpect(status().isBadRequest());
    }

    private Department department(Long id, String name) {
        Department department = new Department(name, company);
        department.setId(id);
        return department;
    }
}
