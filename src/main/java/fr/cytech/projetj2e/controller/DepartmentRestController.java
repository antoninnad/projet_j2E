package fr.cytech.projetj2e.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.Membership;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.service.DepartmentService;
import fr.cytech.projetj2e.service.SessionIdentityService;
import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/departments")
public class DepartmentRestController {

    public record DepartmentRequest(String name) {}
    public record DepartmentResponse(Long id, String name, Long companyId) {}
    public record MembershipRequest(Long userId, int accessLevel) {}
    public record MembershipResponse(Long id, Long userId, Long departmentId, int accessLevel) {}

    private final DepartmentService departments;
    private final SessionIdentityService identity;
    private final fr.cytech.projetj2e.repository.UserRepository users;

    public DepartmentRestController(DepartmentService departments,
                                     SessionIdentityService identity,
                                     fr.cytech.projetj2e.repository.UserRepository users) {
        this.departments = departments;
        this.identity = identity;
        this.users = users;
    }

    @GetMapping
    public List<DepartmentResponse> list(HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return departments.list(actor).stream()
                .map(this::department)
                .toList();
    }

    @PostMapping
    public DepartmentResponse create(@RequestBody DepartmentRequest request,
                                     HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return department(departments.create(actor, request.name()));
    }

    @PutMapping("/{departmentId}")
    public DepartmentResponse update(@PathVariable Long departmentId,
                                     @RequestBody DepartmentRequest request,
                                     HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return department(departments.update(actor, departmentId, request.name()));
    }

    @PutMapping("/{departmentId}/members")
    public MembershipResponse setMember(@PathVariable Long departmentId,
                                        @RequestBody MembershipRequest request,
                                        HttpSession session) {
        User actor = identity.requireActiveMember(session);
        User member = users.findById(request.userId())
                .orElseThrow(() -> new fr.cytech.projetj2e.exception.ResourceNotFoundException("Utilisateur introuvable."));
        Membership membership = departments.setMember(actor, departmentId, member, request.accessLevel());
        return membership(membership);
    }

    @DeleteMapping("/{departmentId}/members/{memberId}")
    public void removeMember(@PathVariable Long departmentId,
                             @PathVariable Long memberId,
                             HttpSession session) {
        User actor = identity.requireActiveMember(session);
        departments.removeMember(actor, departmentId, memberId);
    }

    private DepartmentResponse department(Department department) {
        return new DepartmentResponse(department.getId(), department.getName(),
                department.getCompany().getId());
    }

    private MembershipResponse membership(Membership membership) {
        return new MembershipResponse(membership.getId(),
                membership.getUser().getId(),
                membership.getDepartment().getId(),
                membership.getAccessLevel());
    }
}
