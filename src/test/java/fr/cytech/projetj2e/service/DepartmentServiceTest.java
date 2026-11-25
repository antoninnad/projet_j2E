package fr.cytech.projetj2e.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;

import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.Membership;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.DepartmentRepository;
import fr.cytech.projetj2e.repository.MembershipRepository;

class DepartmentServiceTest {

    @Test
    void createsDepartmentAndItsRoot() {
        DepartmentRepository departments = mock(DepartmentRepository.class);
        MembershipRepository memberships = mock(MembershipRepository.class);
        FolderService folders = mock(FolderService.class);
        DepartmentService service = new DepartmentService(departments, memberships, folders);
        Company company = company(1L);
        User admin = user(10L, company, UserRole.COMPANY_ADMIN);

        when(departments.existsByCompanyAndName(company, "Finance")).thenReturn(false);
        when(departments.save(org.mockito.ArgumentMatchers.any(Department.class)))
                .thenAnswer(invocation -> {
                    Department department = invocation.getArgument(0);
                    department.setId(20L);
                    return department;
                });

        Department department = service.create(admin, "Finance");

        assertEquals("Finance", department.getName());
        verify(folders).createDepartmentRoot(department, admin);
    }

    @Test
    void refusesMemberAndCrossCompanyMember() {
        DepartmentRepository departments = mock(DepartmentRepository.class);
        MembershipRepository memberships = mock(MembershipRepository.class);
        FolderService folders = mock(FolderService.class);
        DepartmentService service = new DepartmentService(departments, memberships, folders);
        Company company = company(1L);
        User member = user(10L, company, UserRole.MEMBER);

        assertThrows(ForbiddenException.class, () -> service.create(member, "Finance"));
        User outsider = user(11L, company(2L), UserRole.MEMBER);
        Department department = new Department("Finance", company);
        department.setId(20L);
        when(departments.findById(20L)).thenReturn(Optional.of(department));
        assertThrows(fr.cytech.projetj2e.exception.ResourceNotFoundException.class,
                () -> service.setMember(user(12L, company, UserRole.COMPANY_ADMIN),
                        20L, outsider, 2));
    }

    @Test
    void updatesMembershipLevel() {
        DepartmentRepository departments = mock(DepartmentRepository.class);
        MembershipRepository memberships = mock(MembershipRepository.class);
        FolderService folders = mock(FolderService.class);
        DepartmentService service = new DepartmentService(departments, memberships, folders);
        Company company = company(1L);
        User admin = user(10L, company, UserRole.COMPANY_ADMIN);
        Department department = new Department("Finance", company);
        department.setId(20L);
        User member = user(11L, company, UserRole.MEMBER);
        Membership existing = new Membership(member, department, 1);

        when(departments.findById(20L)).thenReturn(Optional.of(department));
        when(memberships.findByUserAndDepartment(member, department)).thenReturn(Optional.of(existing));
        when(memberships.save(existing)).thenReturn(existing);

        Membership saved = service.setMember(admin, 20L, member, 3);

        assertEquals(3, saved.getAccessLevel());
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
        user.setCompany(company);
        user.setStatus(fr.cytech.projetj2e.model.AccountStatus.ACTIVE);
        user.setRole(role);
        return user;
    }
}
