package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;

import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.Membership;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.MembershipRepository;

class PermissionServiceTest {

    @Test
    void appliesReadAndContributorRules() {
        Company company = company(1L);
        Department department = new Department("Finance", company);
        department.setId(2L);
        User owner = user(10L, company);
        User member = user(11L, company);
        User contributor = user(12L, company);
        Node node = mock(Node.class);
        when(node.getCompany()).thenReturn(company);
        when(node.getDepartment()).thenReturn(department);
        when(node.getOwner()).thenReturn(owner);
        when(node.getMinAccessLevel()).thenReturn(2);
        when(node.getContributors()).thenReturn(java.util.Set.of(contributor));

        MembershipRepository memberships = mock(MembershipRepository.class);
        CompanyIsolationService isolation = mock(CompanyIsolationService.class);
        PermissionService permissions = new PermissionService(memberships, isolation);

        when(memberships.findByUserAndDepartment(member, department))
                .thenReturn(Optional.of(new Membership(member, department, 1)));
        assertFalse(permissions.permissions(member, node).view());

        when(memberships.findByUserAndDepartment(member, department))
                .thenReturn(Optional.of(new Membership(member, department, 2)));
        assertTrue(permissions.permissions(member, node).view());
        assertFalse(permissions.permissions(member, node).modify());

        when(memberships.findByUserAndDepartment(contributor, department))
                .thenReturn(Optional.of(new Membership(contributor, department, 2)));
        assertTrue(permissions.permissions(contributor, node).modify());
        assertFalse(permissions.permissions(contributor, node).delete());
        assertThrows(ForbiddenException.class, () -> permissions.requireManage(contributor, node));
    }

    @Test
    void ownerAndAdminPassManagementRules() {
        Company company = company(1L);
        Department department = new Department("Finance", company);
        User owner = user(10L, company);
        User admin = user(20L, company);
        admin.setRole(UserRole.COMPANY_ADMIN);
        Node node = mock(Node.class);
        when(node.getCompany()).thenReturn(company);
        when(node.getDepartment()).thenReturn(department);
        when(node.getOwner()).thenReturn(owner);
        when(node.getMinAccessLevel()).thenReturn(2);
        when(node.getContributors()).thenReturn(java.util.Set.of());

        MembershipRepository memberships = mock(MembershipRepository.class);
        CompanyIsolationService isolation = mock(CompanyIsolationService.class);
        PermissionService permissions = new PermissionService(memberships, isolation);
        when(memberships.findByUserAndDepartment(owner, department))
                .thenReturn(Optional.of(new Membership(owner, department, 3)));

        assertTrue(permissions.permissions(owner, node).manage());
        assertTrue(permissions.permissions(admin, node).manage());
    }

    private static Company company(Long id) {
        Company company = new Company("Entreprise", "DEMO-" + id);
        company.setId(id);
        return company;
    }

    private static User user(Long id, Company company) {
        User user = new User();
        user.setId(id);
        user.setUsername("user-" + id);
        user.setEmail("user-" + id + "@example.com");
        user.setFirstName("Prénom");
        user.setLastName("Nom");
        user.setPasswordHash("hash");
        user.setCompany(company);
        user.setStatus(AccountStatus.ACTIVE);
        user.setRole(UserRole.MEMBER);
        return user;
    }
}
