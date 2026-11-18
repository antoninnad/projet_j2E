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
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.DepartmentRepository;
import fr.cytech.projetj2e.repository.FileRepository;
import fr.cytech.projetj2e.repository.NodeRepository;
import fr.cytech.projetj2e.repository.UserRepository;
import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/admin/dashboard")
public class AdminDashboardController {

    public record NodeRow(Long id, String type, String name, String owner, Instant createdAt) {}

    private final UserRepository userRepository;
    private final NodeRepository nodeRepository;
    private final FileRepository fileRepository;
    private final DepartmentRepository departmentRepository;

    public AdminDashboardController(UserRepository userRepository,
                                    NodeRepository nodeRepository,
                                    FileRepository fileRepository,
                                    DepartmentRepository departmentRepository) {
        this.userRepository = userRepository;
        this.nodeRepository = nodeRepository;
        this.fileRepository = fileRepository;
        this.departmentRepository = departmentRepository;
    }

    @GetMapping("/listUsers")
    public String listUsers(HttpSession session, Model model) {
        if (!isAdmin(session)) {
            return "redirect:/adminLogin";
        }

        model.addAttribute("users", userRepository.findAll());
        model.addAttribute("statuses", AccountStatus.values());
        return "admin-dashboard-listUsers";
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

    private String errorRedirect(RedirectAttributes redirect, String message, String path) {
        redirect.addFlashAttribute("error", message);
        return "redirect:/admin/dashboard" + path;
    }
}
