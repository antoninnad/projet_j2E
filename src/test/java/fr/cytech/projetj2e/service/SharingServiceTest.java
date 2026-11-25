package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.Set;

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
import fr.cytech.projetj2e.repository.NodeRepository;
import fr.cytech.projetj2e.repository.UserRepository;

class SharingServiceTest {

    @Test
    void adminCanSetThresholdAndAddEligibleContributor() {
        Company company = company(1L);
        Department department = new Department("Finance", company);
        User admin = user(10L, company, UserRole.COMPANY_ADMIN);
        User contributor = user(11L, company, UserRole.MEMBER);
        Node node = mock(Node.class);
        when(node.getCompany()).thenReturn(company);
        when(node.getDepartment()).thenReturn(department);
        when(node.getOwner()).thenReturn(admin);
        when(node.getMinAccessLevel()).thenReturn(1);
        when(node.getContributors()).thenReturn(Set.of());

        NodeRepository nodes = mock(NodeRepository.class);
        UserRepository users = mock(UserRepository.class);
        MembershipRepository memberships = mock(MembershipRepository.class);
        CompanyIsolationService isolation = mock(CompanyIsolationService.class);
        PermissionService permissions = mock(PermissionService.class);
        when(isolation.requireNode(admin, 20L)).thenReturn(node);
        when(users.findByIdAndCompany(11L, company)).thenReturn(Optional.of(contributor));
        when(memberships.findByUserAndDepartment(contributor, department))
                .thenReturn(Optional.of(new Membership(contributor, department, 3)));
        when(nodes.save(node)).thenReturn(node);

        SharingService sharing = new SharingService(nodes, users, memberships, isolation, permissions);

        sharing.setThreshold(admin, 20L, 2);
        verify(node).setMinAccessLevel(2);
        sharing.addContributor(admin, 20L, 11L);
        verify(node).addContributor(contributor);
    }

    @Test
    void memberCannotSetThresholdAboveOwnLevelOrAddUnderThreshold() {
        Company company = company(1L);
        Department department = new Department("Finance", company);
        User owner = user(10L, company, UserRole.MEMBER);
        User candidate = user(11L, company, UserRole.MEMBER);
        Node node = mock(Node.class);
        when(node.getCompany()).thenReturn(company);
        when(node.getDepartment()).thenReturn(department);
        when(node.getOwner()).thenReturn(owner);
        when(node.getMinAccessLevel()).thenReturn(2);
        when(node.getContributors()).thenReturn(Set.of());

        NodeRepository nodes = mock(NodeRepository.class);
        UserRepository users = mock(UserRepository.class);
        MembershipRepository memberships = mock(MembershipRepository.class);
        CompanyIsolationService isolation = mock(CompanyIsolationService.class);
        PermissionService permissions = mock(PermissionService.class);
        when(isolation.requireNode(owner, 20L)).thenReturn(node);
        when(memberships.findByUserAndDepartment(owner, department))
                .thenReturn(Optional.of(new Membership(owner, department, 2)));
        when(users.findByIdAndCompany(11L, company)).thenReturn(Optional.of(candidate));
        when(memberships.findByUserAndDepartment(candidate, department))
                .thenReturn(Optional.of(new Membership(candidate, department, 1)));

        SharingService sharing = new SharingService(nodes, users, memberships, isolation, permissions);

        assertThrows(ForbiddenException.class, () -> sharing.setThreshold(owner, 20L, 3));
        assertThrows(ForbiddenException.class, () -> sharing.addContributor(owner, 20L, 11L));
    }

    private static Company company(Long id) {
        Company company = new Company("Entreprise", "DEMO-" + id);
        company.setId(id);
        return company;
    }

    private static User user(Long id, Company company, UserRole role) {
        User user = new User();
        user.setId(id);
        user.setUsername("user-" + id);
        user.setEmail("user-" + id + "@example.com");
        user.setFirstName("Prénom");
        user.setLastName("Nom");
        user.setPasswordHash("hash");
        user.setStatus(AccountStatus.ACTIVE);
        user.setRole(role);
        user.setCompany(company);
        return user;
    }
}
