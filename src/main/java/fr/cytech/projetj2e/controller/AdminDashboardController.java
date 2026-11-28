package fr.cytech.projetj2e.controller;

import java.time.Instant;
import java.util.Optional;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.Membership;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.CompanyRepository;
import fr.cytech.projetj2e.repository.DepartmentRepository;
import fr.cytech.projetj2e.repository.FileRepository;
import fr.cytech.projetj2e.repository.MembershipRepository;
import fr.cytech.projetj2e.repository.NodeRepository;
import fr.cytech.projetj2e.repository.UserRepository;
import fr.cytech.projetj2e.service.PlatformAdministrationService;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/admin/dashboard")
public class AdminDashboardController {

    public record NodeRow(Long id, String type, String name, String owner, Instant createdAt) {}
    public record CompanyRow(Long id, String name, String code,
                             List<DepartmentRow> departments, List<UserRow> unassignedUsers) {}
    public record DepartmentRow(Long id, String name,
                                List<UserRow> users, List<UserRow> availableUsers) {}
    public record UserRow(Long id, String username, String displayName, String email,
                          AccountStatus status, UserRole role, boolean companyAdmin,
                          Integer accessLevel) {}

    private final UserRepository userRepository;
    private final NodeRepository nodeRepository;
    private final FileRepository fileRepository;
    private final DepartmentRepository departmentRepository;
    private final CompanyRepository companyRepository;
    private final MembershipRepository membershipRepository;
    private final PlatformAdministrationService platformAdministration;

    public AdminDashboardController(UserRepository userRepository,
                                    NodeRepository nodeRepository,
                                    FileRepository fileRepository,
                                    DepartmentRepository departmentRepository,
                                    CompanyRepository companyRepository,
                                    MembershipRepository membershipRepository,
                                    PlatformAdministrationService platformAdministration) {
        this.userRepository = userRepository;
        this.nodeRepository = nodeRepository;
        this.fileRepository = fileRepository;
        this.departmentRepository = departmentRepository;
        this.companyRepository = companyRepository;
        this.membershipRepository = membershipRepository;
        this.platformAdministration = platformAdministration;
    }

    @GetMapping("/listUsers")
    public String listUsers(HttpSession session, Model model) {
        if (!isAdmin(session)) {
            return "redirect:/adminLogin";
        }
        return "redirect:/admin/dashboard/listCompanies";
    }

    @GetMapping("/listCompanies")
    public String listCompanies(HttpSession session, Model model) {
        if (!isAdmin(session)) {
            return "redirect:/adminLogin";
        }

        List<CompanyRow> companies = companyRepository.findAll().stream()
                .map(this::companyRow)
                .toList();
        model.addAttribute("companies", companies);
        model.addAttribute("statuses", AccountStatus.values());
        model.addAttribute("roles", UserRole.values());
        return "admin-dashboard-listCompanies";
    }

    @PostMapping("/users/{id}/role")
    public String setUserRole(@PathVariable Long id,
                              @RequestParam boolean companyAdmin,
                              HttpSession session,
                              RedirectAttributes redirect) {
        if (!isAdmin(session)) {
            return "redirect:/adminLogin";
        }
        try {
            platformAdministration.setCompanyAdminRole(id, companyAdmin);
            redirect.addFlashAttribute("notice",
                    companyAdmin ? "Utilisateur promu administrateur d'entreprise."
                                 : "Utilisateur rétrogradé membre.");
        } catch (RuntimeException exception) {
            redirect.addFlashAttribute("error", exception.getMessage());
        }
        return "redirect:/admin/dashboard/listCompanies";
    }

    @PostMapping("/departments/{departmentId}/users/{userId}/access")
    public String setUserAccess(@PathVariable Long departmentId,
                                @PathVariable Long userId,
                                @RequestParam int accessLevel,
                                HttpSession session,
                                RedirectAttributes redirect) {
        if (!isAdmin(session)) {
            return "redirect:/adminLogin";
        }
        try {
            platformAdministration.setAccessLevel(userId, departmentId, accessLevel);
            redirect.addFlashAttribute("notice", "Niveau d'accès modifié.");
        } catch (RuntimeException exception) {
            redirect.addFlashAttribute("error", exception.getMessage());
        }
        return "redirect:/admin/dashboard/listCompanies";
    }

    @PostMapping("/departments/{departmentId}/members")
    public String addDepartmentMember(@PathVariable Long departmentId,
                                      @RequestParam Long userId,
                                      @RequestParam int accessLevel,
                                      HttpSession session,
                                      RedirectAttributes redirect) {
        if (!isAdmin(session)) {
            return "redirect:/adminLogin";
        }
        try {
            platformAdministration.setAccessLevel(userId, departmentId, accessLevel);
            redirect.addFlashAttribute("notice", "Utilisateur affecté au département.");
        } catch (RuntimeException exception) {
            redirect.addFlashAttribute("error", exception.getMessage());
        }
        return "redirect:/admin/dashboard/listCompanies";
    }

    @PostMapping("/departments/{departmentId}/users/{userId}/access/remove")
    public String removeUserAccess(@PathVariable Long departmentId,
                                   @PathVariable Long userId,
                                   HttpSession session,
                                   RedirectAttributes redirect) {
        if (!isAdmin(session)) {
            return "redirect:/adminLogin";
        }
        try {
            platformAdministration.removeAccessLevel(userId, departmentId);
            redirect.addFlashAttribute("notice", "Accès du département retiré.");
        } catch (RuntimeException exception) {
            redirect.addFlashAttribute("error", exception.getMessage());
        }
        return "redirect:/admin/dashboard/listCompanies";
    }

    @PostMapping("/users/{id}")
    public String updateUser(@PathVariable Long id,
                             @RequestParam String username,
                             @RequestParam String firstName,
                             @RequestParam String lastName,
                             @RequestParam String email,
                             @RequestParam AccountStatus status,
                             HttpSession session,
                             RedirectAttributes redirect) {
        if (!isAdmin(session)) {
            return "redirect:/adminLogin";
        }

        Optional<User> found = userRepository.findById(id);
        if (found.isEmpty()) {
            return errorRedirect(redirect, "Utilisateur introuvable.", "/listUsers");
        }

        if (!StringUtils.hasText(username) || !StringUtils.hasText(firstName)
                || !StringUtils.hasText(lastName) || !StringUtils.hasText(email)) {
            return errorRedirect(redirect, "Tous les champs utilisateur sont obligatoires.", "/listUsers");
        }

        User user = found.get();
        String normalizedUsername = username.trim();
        String normalizedEmail = email.trim();
        boolean usernameTaken = userRepository.existsByUsername(normalizedUsername)
                && !user.getUsername().equals(normalizedUsername);
        boolean emailTaken = userRepository.existsByEmail(normalizedEmail)
                && !user.getEmail().equals(normalizedEmail);
        if (usernameTaken || emailTaken) {
            return errorRedirect(redirect, "Cet identifiant ou cet email est déjà utilisé.", "/listUsers");
        }

        user.setUsername(normalizedUsername);
        user.setFirstName(firstName.trim());
        user.setLastName(lastName.trim());
        user.setEmail(normalizedEmail);
        user.setStatus(status);
        userRepository.save(user);
        redirect.addFlashAttribute("notice", "Utilisateur mis à jour.");
        return "redirect:/admin/dashboard/listUsers";
    }

    @GetMapping("/listNodes")
    public String listNodes(HttpSession session, Model model) {
        if (!isAdmin(session)) {
            return "redirect:/adminLogin";
        }

        model.addAttribute("nodes", nodeRepository.findAll().stream()
                .map(node -> new NodeRow(node.getId(),
                        node instanceof File ? "Fichier" : "Dossier",
                        node.getName(), node.getOwner().getUsername(), node.getCreatedAt()))
                .toList());
        return "admin-dashboard-listNodes";
    }

    @PostMapping("/nodes/{id}")
    public String updateNode(@PathVariable Long id,
                             @RequestParam String name,
                             HttpSession session,
                             RedirectAttributes redirect) {
        if (!isAdmin(session)) {
            return "redirect:/adminLogin";
        }

        Optional<Node> found = nodeRepository.findById(id);
        if (found.isEmpty()) {
            return errorRedirect(redirect, "Élément introuvable.", "/listNodes");
        }
        if (!StringUtils.hasText(name)) {
            return errorRedirect(redirect, "Le nom est obligatoire.", "/listNodes");
        }

        found.get().setName(name.trim());
        nodeRepository.save(found.get());
        redirect.addFlashAttribute("notice", "Élément mis à jour.");
        return "redirect:/admin/dashboard/listNodes";
    }

    @GetMapping("/listDepartements")
    public String listDepartments(HttpSession session, Model model) {
        if (!isAdmin(session)) {
            return "redirect:/adminLogin";
        }

        model.addAttribute("departments", departmentRepository.findAll());
        return "admin-dashboard-listDepartements";
    }

    @PostMapping("/departments/{id}")
    public String updateDepartment(@PathVariable Long id,
                                   @RequestParam String name,
                                   HttpSession session,
                                   RedirectAttributes redirect) {
        if (!isAdmin(session)) {
            return "redirect:/adminLogin";
        }

        Optional<Department> found = departmentRepository.findById(id);
        if (found.isEmpty()) {
            return errorRedirect(redirect, "Département introuvable.", "/listDepartements");
        }
        if (!StringUtils.hasText(name)) {
            return errorRedirect(redirect, "Le nom est obligatoire.", "/listDepartements");
        }

        Department department = found.get();
        Optional<Department> duplicate = departmentRepository.findByCompanyAndName(
                department.getCompany(), name.trim());
        if (duplicate.isPresent() && !duplicate.get().getId().equals(id)) {
            return errorRedirect(redirect, "Un département porte déjà ce nom dans cette entreprise.",
                    "/listDepartements");
        }

        department.setName(name.trim());
        departmentRepository.save(department);
        redirect.addFlashAttribute("notice", "Département mis à jour.");
        return "redirect:/admin/dashboard/listDepartements";
    }

    @GetMapping("/listFiles")
    public String listFiles(HttpSession session, Model model) {
        if (!isAdmin(session)) {
            return "redirect:/adminLogin";
        }

        model.addAttribute("files", fileRepository.findAll());
        return "admin-dashboard-listFiles";
    }

    @PostMapping("/files/{id}")
    public String updateFile(@PathVariable Long id,
                             @RequestParam String name,
                             @RequestParam String originalFileName,
                             @RequestParam(required = false) String contentType,
                             HttpSession session,
                             RedirectAttributes redirect) {
        if (!isAdmin(session)) {
            return "redirect:/adminLogin";
        }

        Optional<File> found = fileRepository.findById(id);
        if (found.isEmpty()) {
            return errorRedirect(redirect, "Fichier introuvable.", "/listFiles");
        }
        if (!StringUtils.hasText(name) || !StringUtils.hasText(originalFileName)) {
            return errorRedirect(redirect, "Le nom et le nom de fichier sont obligatoires.", "/listFiles");
        }

        File file = found.get();
        file.setName(name.trim());
        file.setOriginalFileName(originalFileName.trim());
        file.setContentType(StringUtils.hasText(contentType) ? contentType.trim() : null);
        fileRepository.save(file);
        redirect.addFlashAttribute("notice", "Fichier mis à jour.");
        return "redirect:/admin/dashboard/listFiles";
    }

    private boolean isAdmin(HttpSession session) {
        return session.getAttribute("adminId") != null;
    }

    private CompanyRow companyRow(Company company) {
        List<User> companyUsers = userRepository.findByCompany(company);
        Set<Long> usersInDepartments = new HashSet<>();
        List<DepartmentRow> departments = departmentRepository.findByCompany(company).stream()
                .map(department -> departmentRow(department, companyUsers, usersInDepartments))
                .toList();
        List<UserRow> unassignedUsers = companyUsers.stream()
                .filter(user -> !usersInDepartments.contains(user.getId()))
                .map(user -> userRow(user, null))
                .toList();
        return new CompanyRow(company.getId(), company.getName(), company.getCode(),
                departments, unassignedUsers);
    }

    private DepartmentRow departmentRow(Department department, List<User> companyUsers,
                                        Set<Long> usersInDepartments) {
        List<UserRow> departmentUsers = membershipRepository.findByDepartment(department).stream()
                .peek(membership -> usersInDepartments.add(membership.getUser().getId()))
                .map(membership -> userRow(membership.getUser(), membership.getAccessLevel()))
                .toList();
        Set<Long> assignedIds = departmentUsers.stream().map(UserRow::id).collect(java.util.stream.Collectors.toSet());
        List<UserRow> availableUsers = companyUsers.stream()
                .filter(user -> !assignedIds.contains(user.getId()))
                .map(user -> userRow(user, null))
                .toList();
        return new DepartmentRow(department.getId(), department.getName(), departmentUsers, availableUsers);
    }

    private UserRow userRow(User user, Integer accessLevel) {
        String displayName = (user.getFirstName() + " " + user.getLastName()).trim();
        if (displayName.isBlank()) {
            displayName = user.getUsername();
        }
        return new UserRow(user.getId(), user.getUsername(), displayName, user.getEmail(),
                user.getStatus(), user.getRole(), user.getRole() == UserRole.COMPANY_ADMIN, accessLevel);
    }

    private String errorRedirect(RedirectAttributes redirect, String message, String path) {
        redirect.addFlashAttribute("error", message);
        return "redirect:/admin/dashboard" + path;
    }
}
