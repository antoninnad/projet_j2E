package fr.cytech.projetj2e.controller;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fr.cytech.projetj2e.dto.PageResponse;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.Membership;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.MembershipRepository;
import fr.cytech.projetj2e.repository.UserRepository;
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
    public record DepartmentMemberResponse(Long userId, String username, String firstName,
                                           String lastName, String email, int accessLevel) {}

    private final DepartmentService departments;
    private final SessionIdentityService identity;
    private final UserRepository users;
    private final MembershipRepository memberships;

    public DepartmentRestController(DepartmentService departments,
                                     SessionIdentityService identity,
                                     UserRepository users,
                                     MembershipRepository memberships) {
        this.departments = departments;
        this.identity = identity;
        this.users = users;
        this.memberships = memberships;
    }

    @GetMapping
    public PageResponse<DepartmentResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String search,
            HttpSession session) {
        if (page < 0) {
            throw new IllegalArgumentException("Le numéro de page doit être positif ou nul.");
        }
        if (size < 1 || size > 100) {
            throw new IllegalArgumentException("La taille de page doit être comprise entre 1 et 100.");
        }
        User actor = identity.requireActiveMember(session);
        List<Department> found = departments.list(actor).stream()
                .filter(department -> search == null || search.isBlank()
                        || department.getName().toLowerCase(Locale.ROOT)
                                .contains(search.strip().toLowerCase(Locale.ROOT)))
                .sorted(departmentComparator(sort))
                .toList();

        long start = Math.min((long) page * size, found.size());
        int fromIndex = Math.toIntExact(start);
        int toIndex = (int) Math.min((long) fromIndex + size, found.size());
        List<DepartmentResponse> items = found.subList(fromIndex, toIndex).stream()
                .map(this::department)
                .toList();
        int totalPages = (int) Math.ceil((double) found.size() / size);
        return new PageResponse<>(items, new PageResponse.PageMeta(page, size, found.size(), totalPages,
                page == 0, page >= totalPages - 1));
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

    @GetMapping("/{departmentId}/members")
    public List<DepartmentMemberResponse> listMembers(@PathVariable Long departmentId,
                                                       HttpSession session) {
        User actor = identity.requireActiveMember(session);
        Department department = departments.requireDepartment(actor, departmentId);
        return memberships.findByDepartment(department).stream()
                .filter(membership -> Node.sameCompany(actor.getCompany(), membership.getUser().getCompany()))
                .map(membership -> new DepartmentMemberResponse(
                        membership.getUser().getId(),
                        membership.getUser().getUsername(),
                        membership.getUser().getFirstName(),
                        membership.getUser().getLastName(),
                        membership.getUser().getEmail(),
                        membership.getAccessLevel()))
                .toList();
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

    private static Comparator<Department> departmentComparator(String rawSort) {
        String[] parts = rawSort == null || rawSort.isBlank()
                ? new String[] {"name", "asc"}
                : rawSort.split(",", 2);
        String property = parts[0].strip();
        String direction = parts.length > 1 ? parts[1].strip() : "asc";
        if (!"asc".equalsIgnoreCase(direction) && !"desc".equalsIgnoreCase(direction)) {
            throw new IllegalArgumentException("Le sens du tri doit être asc ou desc.");
        }
        boolean descending = "desc".equalsIgnoreCase(direction);
        Comparator<Department> comparator = switch (property) {
            case "id" -> Comparator.comparing(Department::getId);
            case "name" -> Comparator.comparing(Department::getName, String.CASE_INSENSITIVE_ORDER);
            default -> throw new IllegalArgumentException("Tri de département non pris en charge.");
        };
        return descending ? comparator.reversed() : comparator;
    }
}
