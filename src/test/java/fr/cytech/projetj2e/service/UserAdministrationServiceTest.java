package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.Membership;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.DepartmentRepository;
import fr.cytech.projetj2e.repository.MembershipRepository;
import fr.cytech.projetj2e.repository.UserRepository;

class UserAdministrationServiceTest {

    @Test
    void companyAdminApprovesAndDisablesOnlyOwnCompanyUser() {
        UserRepository users = mock(UserRepository.class);
        UserAdministrationService service = new UserAdministrationService(users, org.mockito.Mockito.mock(ActivityRecorder.class));
        Company company = company(1L);
        User admin = user(10L, company, UserRole.COMPANY_ADMIN, AccountStatus.ACTIVE);
        User target = user(11L, company, UserRole.MEMBER, AccountStatus.PENDING);

        when(users.findByIdAndCompany(11L, company)).thenReturn(Optional.of(target));
        when(users.save(target)).thenReturn(target);

        assertEquals(AccountStatus.ACTIVE, service.approve(admin, 11L).getStatus());
        target.setStatus(AccountStatus.ACTIVE);
        assertEquals(AccountStatus.DISABLED, service.disable(admin, 11L).getStatus());
        verify(users, org.mockito.Mockito.times(2)).save(target);
    }

    @Test
    void refusesMemberAndCrossCompanyTarget() {
        UserRepository users = mock(UserRepository.class);
        UserAdministrationService service = new UserAdministrationService(users, org.mockito.Mockito.mock(ActivityRecorder.class));
        Company company = company(1L);
        User member = user(10L, company, UserRole.MEMBER, AccountStatus.ACTIVE);

        assertThrows(ForbiddenException.class, () -> service.approve(member, 11L));

        User admin = user(12L, company, UserRole.COMPANY_ADMIN, AccountStatus.ACTIVE);
        when(users.findByIdAndCompany(99L, company)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.disable(admin, 99L));
    }

    @Test
    void declineRefusesNonPendingUser() {
        UserRepository users = mock(UserRepository.class);
        UserAdministrationService service = new UserAdministrationService(users, org.mockito.Mockito.mock(ActivityRecorder.class));
        Company company = company(1L);
        User admin = user(10L, company, UserRole.COMPANY_ADMIN, AccountStatus.ACTIVE);
        User active = user(11L, company, UserRole.MEMBER, AccountStatus.ACTIVE);
        when(users.findByIdAndCompany(11L, company)).thenReturn(Optional.of(active));

        assertThrows(IllegalArgumentException.class, () -> service.decline(admin, 11L));
    }

    @Test
    void listsPaginatedUsersOnlyForCompanyAdmins() {
        UserRepository users = mock(UserRepository.class);
        UserAdministrationService service = new UserAdministrationService(
                users, org.mockito.Mockito.mock(ActivityRecorder.class));
        Company company = company(1L);
        User admin = user(10L, company, UserRole.COMPANY_ADMIN, AccountStatus.ACTIVE);
        User pending = user(11L, company, UserRole.MEMBER, AccountStatus.PENDING);
        Pageable pageable = PageRequest.of(0, 10, Sort.by("username"));
        Page<User> expected = new PageImpl<>(List.of(pending), pageable, 1);
        when(users.searchCompanyUsers(company, AccountStatus.PENDING, "alice", pageable)).thenReturn(expected);

        assertEquals(expected, service.listCompanyUsers(admin, AccountStatus.PENDING, "alice", pageable));
        assertThrows(ForbiddenException.class, () -> service.listCompanyUsers(
                user(12L, company, UserRole.MEMBER, AccountStatus.ACTIVE), null, null, pageable));
    }

    @Test
    void platformAdminPromotesActiveUserAndChangesDepartmentAccess() {
        UserRepository users = mock(UserRepository.class);
        DepartmentRepository departments = mock(DepartmentRepository.class);
        MembershipRepository memberships = mock(MembershipRepository.class);
        PlatformAdministrationService service =
                new PlatformAdministrationService(users, departments, memberships);
        Company company = company(1L);
        User target = user(11L, company, UserRole.MEMBER, AccountStatus.ACTIVE);
        Department department = new Department("Finance", company);
        department.setId(20L);

        when(users.findById(11L)).thenReturn(Optional.of(target));
        when(departments.findById(20L)).thenReturn(Optional.of(department));
        when(users.save(target)).thenReturn(target);
        when(memberships.findByUserAndDepartment(target, department)).thenReturn(Optional.empty());
        when(memberships.save(org.mockito.ArgumentMatchers.any(Membership.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        assertEquals(UserRole.COMPANY_ADMIN,
                service.setCompanyAdminRole(11L, true).getRole());
        Membership membership = service.setAccessLevel(11L, 20L, 3);

        assertEquals(3, membership.getAccessLevel());
        assertEquals(department, membership.getDepartment());
        assertEquals(target, membership.getUser());
        verify(users).save(target);
        verify(memberships).save(org.mockito.ArgumentMatchers.any(Membership.class));
    }

    @Test
    void platformAdminRejectsPendingPromotionAndCrossCompanyAccess() {
        UserRepository users = mock(UserRepository.class);
        DepartmentRepository departments = mock(DepartmentRepository.class);
        MembershipRepository memberships = mock(MembershipRepository.class);
        PlatformAdministrationService service =
                new PlatformAdministrationService(users, departments, memberships);
        Company company = company(1L);
        Company other = company(2L);
        User pending = user(11L, company, UserRole.MEMBER, AccountStatus.PENDING);
        User target = user(12L, company, UserRole.MEMBER, AccountStatus.ACTIVE);
        Department foreignDepartment = new Department("Autre", other);
        foreignDepartment.setId(21L);

        when(users.findById(11L)).thenReturn(Optional.of(pending));
        assertThrows(IllegalArgumentException.class,
                () -> service.setCompanyAdminRole(11L, true));

        when(users.findById(12L)).thenReturn(Optional.of(target));
        when(departments.findById(21L)).thenReturn(Optional.of(foreignDepartment));
        assertThrows(ResourceNotFoundException.class,
                () -> service.setAccessLevel(12L, 21L, 2));
    }

    private static Company company(Long id) {
        Company company = new Company("Entreprise", "DEMO-" + id);
        company.setId(id);
        return company;
    }

    private static User user(Long id, Company company, UserRole role, AccountStatus status) {
        User user = new User();
        user.setId(id);
        user.setUsername("user-" + id);
        user.setEmail("user-" + id + "@example.com");
        user.setFirstName("Prénom");
        user.setLastName("Nom");
        user.setPasswordHash("bcrypt-hash");
        user.setCompany(company);
        user.setRole(role);
        user.setStatus(status);
        return user;
    }
}
