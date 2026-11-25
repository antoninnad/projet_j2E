package fr.cytech.projetj2e.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.Membership;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.DepartmentRepository;
import fr.cytech.projetj2e.repository.MembershipRepository;

@Service
@Transactional
public class DepartmentService {

    private final DepartmentRepository departments;
    private final MembershipRepository memberships;
    private final FolderService folderService;

    public DepartmentService(DepartmentRepository departments,
                             MembershipRepository memberships,
                             FolderService folderService) {
        this.departments = departments;
        this.memberships = memberships;
        this.folderService = folderService;
    }

    public Department create(User actor, String name) {
        requireCompanyAdmin(actor);
        requireName(name);
        if (departments.existsByCompanyAndName(actor.getCompany(), name.trim())) {
            throw new IllegalArgumentException("Un département porte déjà ce nom dans cette entreprise.");
        }
        Department department = departments.save(new Department(name.trim(), actor.getCompany()));
        folderService.createDepartmentRoot(department, actor);
        return department;
    }

    public Department update(User actor, Long departmentId, String name) {
        requireCompanyAdmin(actor);
        requireName(name);
        Department department = requireDepartment(actor, departmentId);
        if (departments.existsByCompanyAndName(actor.getCompany(), name.trim())
                && !departments.findByCompanyAndName(actor.getCompany(), name.trim())
                        .orElseThrow().getId().equals(departmentId)) {
            throw new IllegalArgumentException("Un département porte déjà ce nom dans cette entreprise.");
        }
        department.setName(name.trim());
        Department saved = departments.save(department);
        folderService.renameDepartmentRoot(saved, name.trim());
        return saved;
    }

    public Membership setMember(User actor, Long departmentId, User member, int accessLevel) {
        requireCompanyAdmin(actor);
        if (member == null || !Node.sameCompany(actor.getCompany(), member.getCompany())) {
            throw new ResourceNotFoundException("Utilisateur introuvable.");
        }
        if (accessLevel < 0) {
            throw new IllegalArgumentException("Le niveau d'accès ne peut pas être négatif.");
        }
        Department department = requireDepartment(actor, departmentId);
        Membership membership = memberships.findByUserAndDepartment(member, department)
                .orElseGet(() -> new Membership(member, department, accessLevel));
        membership.setAccessLevel(accessLevel);
        Membership saved = memberships.save(membership);
        department.addMembership(saved);
        member.addMembership(saved);
        return saved;
    }

    public void removeMember(User actor, Long departmentId, Long memberId) {
        requireCompanyAdmin(actor);
        Department department = requireDepartment(actor, departmentId);
        Membership membership = memberships.findByDepartment(department).stream()
                .filter(candidate -> candidate.getUser().getId().equals(memberId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Adhésion introuvable."));
        department.removeMembership(membership);
        membership.getUser().removeMembership(membership);
        memberships.delete(membership);
    }

    @Transactional(readOnly = true)
    public List<Department> list(User actor) {
        requireCompanyAdmin(actor);
        return departments.findByCompany(actor.getCompany());
    }

    @Transactional(readOnly = true)
    public Department requireDepartment(User actor, Long departmentId) {
        requireCompanyAdmin(actor);
        if (departmentId == null) {
            throw new ResourceNotFoundException("Identifiant de département manquant.");
        }
        return departments.findById(departmentId)
                .filter(department -> Node.sameCompany(actor.getCompany(), department.getCompany()))
                .orElseThrow(() -> new ResourceNotFoundException("Département introuvable."));
    }

    private void requireCompanyAdmin(User actor) {
        if (actor == null || !actor.isActive() || actor.getCompany() == null) {
            throw new ForbiddenException("Compte entreprise requis.");
        }
        if (actor.getRole() != UserRole.COMPANY_ADMIN) {
            throw new ForbiddenException("Administrateur de l'entreprise requis.");
        }
    }

    private static void requireName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Le nom du département est obligatoire.");
        }
    }
}
