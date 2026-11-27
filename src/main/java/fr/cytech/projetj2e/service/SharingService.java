package fr.cytech.projetj2e.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.ActivityAction;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.MembershipRepository;
import fr.cytech.projetj2e.repository.NodeRepository;
import fr.cytech.projetj2e.repository.UserRepository;

@Service
@Transactional
public class SharingService {

    private final NodeRepository nodes;
    private final UserRepository users;
    private final MembershipRepository memberships;
    private final CompanyIsolationService isolation;
    private final PermissionService permissions;
    private final ActivityRecorder activity;

    public SharingService(NodeRepository nodes,
                          UserRepository users,
                          MembershipRepository memberships,
                          CompanyIsolationService isolation,
                          PermissionService permissions,
                          ActivityRecorder activity) {
        this.nodes = nodes;
        this.users = users;
        this.memberships = memberships;
        this.isolation = isolation;
        this.permissions = permissions;
        this.activity = activity;
    }

    public Node setThreshold(User actor, Long nodeId, int threshold) {
        Node node = isolation.requireNode(actor, nodeId);
        permissions.requireManage(actor, node);
        if (threshold < 0) {
            throw new IllegalArgumentException("Le seuil ne peut pas être négatif.");
        }
        if (!isCompanyAdmin(actor)) {
            int actorLevel = memberships.findByUserAndDepartment(actor, node.getDepartment())
                    .map(membership -> membership.getAccessLevel())
                    .orElseThrow(() -> new ForbiddenException("Adhésion au département requise."));
            if (threshold > actorLevel) {
                throw new ForbiddenException(
                        "Vous ne pouvez pas définir un seuil supérieur à votre niveau d'accès.");
            }
        }
        int previous = node.getMinAccessLevel();
        node.setMinAccessLevel(threshold);
        Node saved = nodes.save(node);
        if (previous != threshold) {
            activity.node(actor, ActivityAction.THRESHOLD_CHANGED, saved, ActivityRecorder.change(previous, threshold));
        }
        return saved;
    }

    public Node addContributor(User actor, Long nodeId, Long contributorId) {
        Node node = isolation.requireNode(actor, nodeId);
        permissions.requireManage(actor, node);
        User contributor = users.findByIdAndCompany(requireId(contributorId), actor.getCompany())
                .filter(User::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Contributeur introuvable."));
        int contributorLevel = memberships.findByUserAndDepartment(contributor, node.getDepartment())
                .map(membership -> membership.getAccessLevel())
                .orElse(-1);
        if (contributorLevel < node.getMinAccessLevel()) {
            throw new ForbiddenException(
                    "Un contributeur doit atteindre le seuil d'accès du nœud.");
        }
        node.addContributor(contributor);
        Node saved = nodes.save(node);
        activity.node(actor, ActivityAction.CONTRIBUTOR_ADDED, saved, contributor, null);
        return saved;
    }

    public Node removeContributor(User actor, Long nodeId, Long contributorId) {
        Node node = isolation.requireNode(actor, nodeId);
        permissions.requireManage(actor, node);
        User contributor = users.findByIdAndCompany(requireId(contributorId), actor.getCompany())
                .orElseThrow(() -> new ResourceNotFoundException("Contributeur introuvable."));
        node.removeContributor(contributor);
        Node saved = nodes.save(node);
        activity.node(actor, ActivityAction.CONTRIBUTOR_REMOVED, saved, contributor, null);
        return saved;
    }

    private static boolean isCompanyAdmin(User actor) {
        return actor != null && actor.getRole() == UserRole.COMPANY_ADMIN;
    }

    private static Long requireId(Long id) {
        if (id == null) {
            throw new ResourceNotFoundException("Contributeur introuvable.");
        }
        return id;
    }
}
