package fr.cytech.projetj2e.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.cytech.projetj2e.dto.NodeDetailResponse;
import fr.cytech.projetj2e.dto.NodeDetailResponse.BreadcrumbItem;
import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.dto.PageResponse;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.Folder;
import fr.cytech.projetj2e.model.Membership;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.DepartmentRepository;
import fr.cytech.projetj2e.repository.FileRepository;
import fr.cytech.projetj2e.repository.FolderRepository;
import fr.cytech.projetj2e.repository.MembershipRepository;
import fr.cytech.projetj2e.repository.NodeRepository;

/**
 * Exploration de l'arborescence (T18) : racines visibles, enfants paginés, détail d'un élément
 * et données du dashboard Thymeleaf.
 *
 * Règle de visibilité (celle de PermissionService) : un élément est visible si le niveau L du compte
 * dans le département de l'élément atteint son seuil M ; l'administrateur d'entreprise voit tout.
 * Un élément invisible est traité comme inexistant (404), comme une ressource d'une autre entreprise.
 */
@Service
@Transactional(readOnly = true)
public class ExplorationService {

    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;

    /** Niveau donné à l'administrateur d'entreprise : aucun seuil ne lui est opposé. */
    private static final int ADMIN_LEVEL = Integer.MAX_VALUE;
    private static final int NO_ACCESS = -1;

    private final CompanyIsolationService isolation;
    private final NodeResponseMapper mapper;
    private final NodeRepository nodeRepository;
    private final FolderRepository folderRepository;
    private final FileRepository fileRepository;
    private final MembershipRepository membershipRepository;
    private final DepartmentRepository departmentRepository;

    public ExplorationService(CompanyIsolationService isolation,
                              NodeResponseMapper mapper,
                              NodeRepository nodeRepository,
                              FolderRepository folderRepository,
                              FileRepository fileRepository,
                              MembershipRepository membershipRepository,
                              DepartmentRepository departmentRepository) {
        this.isolation = isolation;
        this.mapper = mapper;
        this.nodeRepository = nodeRepository;
        this.folderRepository = folderRepository;
        this.fileRepository = fileRepository;
        this.membershipRepository = membershipRepository;
        this.departmentRepository = departmentRepository;
    }

    // ---------------------------------------------------------------- API REST

    /** Dossiers racines des départements visibles par le compte, triés par nom. */
    public List<NodeResponse> listRoots(User actor) {
        isolation.requireActiveCompanyId(actor);
        List<Folder> roots;
        if (isCompanyAdmin(actor)) {
            roots = folderRepository.findByCompanyAndParentIsNull(actor.getCompany());
        } else {
            roots = new ArrayList<>();
            for (Membership membership : membershipRepository.findByUser(actor)) {
                Department department = membership.getDepartment();
                if (!Node.sameCompany(actor.getCompany(), department.getCompany())) {
                    continue;
                }
                folderRepository.findByDepartmentAndParentIsNull(department)
                        .filter(root -> membership.getAccessLevel() >= root.getMinAccessLevel())
                        .ifPresent(roots::add);
            }
        }
        return roots.stream()
                .sorted(Comparator.comparing((Folder folder) -> folder.getName().toLowerCase()).thenComparing(Folder::getId))
                .map(root -> mapper.toResponse(actor, root))
                .toList();
    }

    /** Enfants visibles d'un dossier, dossiers d'abord puis par nom. */
    public PageResponse<NodeResponse> listChildren(User actor, Long folderId, int page, int size) {
        validatePage(page, size);
        Folder folder = isolation.requireFolder(actor, folderId);
        int level = levelIn(actor, folder.getDepartment());
        requireVisible(level, folder);
        Page<Node> children = nodeRepository.findVisibleChildren(folder, level, PageRequest.of(page, size));
        return PageResponse.from(children, child -> mapper.toResponse(actor, child));
    }

    /** Métadonnées d'un élément visible et fil d'Ariane de ses parents. */
    public NodeDetailResponse getNode(User actor, Long nodeId) {
        Node node = isolation.requireNode(actor, nodeId);
        requireVisible(levelIn(actor, node.getDepartment()), node);
        return new NodeDetailResponse(mapper.toResponse(actor, node), breadcrumb(node));
    }

    // ---------------------------------------------------------------- Dashboard Thymeleaf

    /** Noms des départements auxquels le compte a accès (tous pour l'administrateur d'entreprise). */
    public List<String> accessibleDepartmentNames(User actor) {
        isolation.requireActiveCompanyId(actor);
        List<Department> departments = isCompanyAdmin(actor)
                ? departmentRepository.findByCompany(actor.getCompany())
                : membershipRepository.findByUser(actor).stream()
                        .map(Membership::getDepartment)
                        .filter(department -> Node.sameCompany(actor.getCompany(), department.getCompany()))
                        .toList();
        return departments.stream()
                .map(Department::getName)
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
    }

    /** Noms des derniers fichiers modifiés que le compte peut voir. */
    public List<String> recentDocumentNames(User actor, int limit) {
        Long companyId = isolation.requireActiveCompanyId(actor);
        PageRequest firstPage = PageRequest.of(0, Math.max(1, limit));
        List<File> files = isCompanyAdmin(actor)
                ? fileRepository.findRecentInCompany(companyId, firstPage)
                : fileRepository.findRecentVisibleTo(companyId, actor, firstPage);
        return files.stream().map(File::getName).toList();
    }

    // ---------------------------------------------------------------- Utilitaires

    private int levelIn(User actor, Department department) {
        if (isCompanyAdmin(actor)) {
            return ADMIN_LEVEL;
        }
        return membershipRepository.findByUserAndDepartment(actor, department)
                .map(Membership::getAccessLevel)
                .orElse(NO_ACCESS);
    }

    private static void requireVisible(int level, Node node) {
        if (level < node.getMinAccessLevel()) {
            throw new ResourceNotFoundException("Élément introuvable.");
        }
    }

    private static void validatePage(int page, int size) {
        if (page < 0) {
            throw new IllegalArgumentException("Le numéro de page doit être positif ou nul.");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("La taille de page doit être comprise entre 1 et " + MAX_PAGE_SIZE + ".");
        }
    }

    /** Ancêtres de la racine au parent direct. Ils sont visibles : le seuil d'un enfant est au moins celui de son parent. */
    private static List<BreadcrumbItem> breadcrumb(Node node) {
        List<BreadcrumbItem> path = new ArrayList<>();
        for (Folder current = node.getParent(); current != null; current = current.getParent()) {
            path.add(new BreadcrumbItem(current.getId(), current.getName()));
        }
        Collections.reverse(path);
        return path;
    }

    private static boolean isCompanyAdmin(User actor) {
        return actor != null && actor.isActive() && actor.getRole() == UserRole.COMPANY_ADMIN;
    }
}
