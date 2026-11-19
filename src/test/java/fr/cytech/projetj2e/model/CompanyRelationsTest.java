package fr.cytech.projetj2e.model;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class CompanyRelationsTest {

    @Test
    void addingDepartmentKeepsBothSidesInSync() {
        Company company = new Company("CyTech", "CYTECH");
        Department department = new Department("Finance", company);

        company.addDepartment(department);

        assertSame(company, department.getCompany());
        assertTrue(company.getDepartments().contains(department));
    }

    @Test
    void addingMembershipKeepsUserAndDepartmentInSync() {
        Company company = new Company("CyTech", "CYTECH");
        Department department = new Department("Finance", company);
        User user = new User();
        Membership membership = new Membership(user, department, 2);

        department.addMembership(membership);
        user.addMembership(membership);

        assertSame(user, membership.getUser());
        assertSame(department, membership.getDepartment());
        assertTrue(department.getMemberships().contains(membership));
        assertTrue(user.getMemberships().contains(membership));
    }

    @Test
    void addingProfileKeepsTheOneToOneRelationInSync() {
        User user = new User();
        UserProfile profile = new UserProfile();

        user.setProfile(profile);

        assertSame(user, profile.getUser());
        assertSame(profile, user.getProfile());
    }
}
