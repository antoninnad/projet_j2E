package fr.cytech.projetj2e.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.Membership;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.DepartmentRepository;
import fr.cytech.projetj2e.repository.MembershipRepository;
import fr.cytech.projetj2e.repository.UserRepository;

@Service
@Transactional
public class PlatformAdministrationService {

    private final UserRepository users;
    private final DepartmentRepository departments;
    private final MembershipRepository memberships;

    public PlatformAdministrationService(UserRepository users,
                                         DepartmentRepository departments,
                                         MembershipRepository memberships) {
        this.users = users;
        this.departments = departments;
        this.memberships = memberships;
    }

    public User setCompanyAdminRole(Long userId, boolean companyAdmin) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
        if (user.getCompany() == null) {
            throw new IllegalArgumentException("Cet utilisateur n'est rattaché à aucune entreprise.");
        }
        if (user.getStatus() != AccountStatus.ACTIVE) {
            throw new IllegalArgumentException("Seul un utilisateur actif peut être administrateur d'entreprise.");
        }
        user.setRole(companyAdmin ? UserRole.COMPANY_ADMIN : UserRole.MEMBER);
        return users.save(user);
    }

    public Membership setAccessLevel(Long userId, Long departmentId, int accessLevel) {
        if (accessLevel < 0) {
            throw new IllegalArgumentException("Le niveau d'accès ne peut pas être négatif.");
        }
        User user = users.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
        Department department = departments.findById(departmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Département introuvable."));
        if (!Node.sameCompany(user.getCompany(), department.getCompany())) {
            throw new ResourceNotFoundException("Utilisateur ou département introuvable.");
        }

        Membership membership = memberships.findByUserAndDepartment(user, department)
                .orElseGet(() -> new Membership(user, department, accessLevel));
        membership.setAccessLevel(accessLevel);
        Membership saved = memberships.save(membership);
        department.addMembership(saved);
        user.addMembership(saved);
        return saved;
    }

    public void removeAccessLevel(Long userId, Long departmentId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
        Department department = departments.findById(departmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Département introuvable."));
        if (!Node.sameCompany(user.getCompany(), department.getCompany())) {
            throw new ResourceNotFoundException("Utilisateur ou département introuvable.");
        }

        Membership membership = memberships.findByUserAndDepartment(user, department)
                .orElseThrow(() -> new ResourceNotFoundException("Adhésion introuvable."));
        department.removeMembership(membership);
        user.removeMembership(membership);
        memberships.delete(membership);
    }
}
