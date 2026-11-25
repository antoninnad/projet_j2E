package fr.cytech.projetj2e.service;

import org.springframework.stereotype.Service;

import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.MembershipRepository;

@Service
public class PermissionService {

    public record NodePermissions(
            boolean view,
            boolean modify,
            boolean delete,
            boolean manage,
            boolean createChild) {}

    private final MembershipRepository memberships;
    private final CompanyIsolationService isolation;

    public PermissionService(MembershipRepository memberships,
                             CompanyIsolationService isolation) {
        this.memberships = memberships;
        this.isolation = isolation;
    }

    public NodePermissions permissions(User actor, Node node) {
        if (node == null) {
            return new NodePermissions(false, false, false, false, false);
        }
        try {
            isolation.requireSameCompany(actor, node);
        } catch (RuntimeException exception) {
            return new NodePermissions(false, false, false, false, false);
        }

        if (isCompanyAdmin(actor)) {
            return new NodePermissions(true, true, true, true, true);
        }

        int level = memberships.findByUserAndDepartment(actor, node.getDepartment())
                .map(membership -> membership.getAccessLevel())
                .orElse(-1);
        int threshold = node.getMinAccessLevel();
        boolean levelReached = level >= threshold;
        boolean owner = actor.getId() != null
                && actor.getId().equals(node.getOwner().getId());
        boolean contributor = node.getContributors().stream()
                .filter(user -> user.getId() != null)
                .anyMatch(user -> user.getId().equals(actor.getId()));

        boolean view = levelReached;
        boolean modify = levelReached && (level > threshold || owner || contributor);
        boolean delete = levelReached && (owner || level > threshold);
        boolean manage = levelReached && owner;
        boolean createChild = modify;
        return new NodePermissions(view, modify, delete, manage, createChild);
    }

    public void requireView(User actor, Node node) {
        require(actor, node, permissions(actor, node).view(), "Lecture refusée.");
    }

    public void requireModify(User actor, Node node) {
        require(actor, node, permissions(actor, node).modify(), "Modification refusée.");
    }

    public void requireDelete(User actor, Node node) {
        require(actor, node, permissions(actor, node).delete(), "Suppression refusée.");
    }

    public void requireManage(User actor, Node node) {
        require(actor, node, permissions(actor, node).manage(), "Gestion du partage refusée.");
    }

    public void requireCreateChild(User actor, Node parent) {
        require(actor, parent, permissions(actor, parent).createChild(),
                "Création dans ce dossier refusée.");
    }

    private static void require(User actor, Node node, boolean allowed, String message) {
        if (actor == null || !actor.isActive()) {
            throw new ForbiddenException("Compte actif requis.");
        }
        if (!allowed) {
            throw new ForbiddenException(message);
        }
    }

    private static boolean isCompanyAdmin(User actor) {
        return actor != null && actor.isActive() && actor.getRole() == UserRole.COMPANY_ADMIN;
    }
}
