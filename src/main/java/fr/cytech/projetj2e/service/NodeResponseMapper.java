package fr.cytech.projetj2e.service;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Component;

import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.dto.NodeResponse.OwnerResponse;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.FavoriteRepository;

/**
 * Convertit un nœud en NodeResponse pour le compte connecté (T18, T20, T31) :
 * métadonnées sans chemin de stockage, actions autorisées calculées par PermissionService
 * et favori personnel du compte.
 * À appeler dans une transaction (relations paresseuses).
 */
@Component
public class NodeResponseMapper {

    private final PermissionService permissions;
    private final FavoriteRepository favorites;

    public NodeResponseMapper(PermissionService permissions, FavoriteRepository favorites) {
        this.permissions = permissions;
        this.favorites = favorites;
    }

    public NodeResponse toResponse(User actor, Node node) {
        return toResponse(actor, node, favoriteIds(actor, List.of(node)).contains(node.getId()));
    }

    /** Conversion d'une liste, avec une seule requête pour les favoris. */
    public List<NodeResponse> toResponses(User actor, List<? extends Node> nodes) {
        Set<Long> favoriteIds = favoriteIds(actor, nodes);
        return nodes.stream().map(node -> toResponse(actor, node, favoriteIds.contains(node.getId()))).toList();
    }

    private Set<Long> favoriteIds(User actor, List<? extends Node> nodes) {
        List<Long> ids = nodes.stream().map(Node::getId).filter(id -> id != null).toList();
        if (actor == null || actor.getId() == null || ids.isEmpty()) {
            return Set.of();
        }
        return new HashSet<>(favorites.findFavoriteNodeIds(actor, ids));
    }

    private NodeResponse toResponse(User actor, Node node, boolean favorite) {
        Optional<File> file = node instanceof File f ? Optional.of(f) : Optional.empty();
        User owner = node.getOwner();
        Department department = node.getDepartment();
        return new NodeResponse(
                node.getId(),
                node.getName(),
                file.isPresent() ? NodeResponse.FILE : NodeResponse.FOLDER,
                node.getParent() == null ? null : node.getParent().getId(),
                department.getId(),
                department.getName(),
                node.getMinAccessLevel(),
                new OwnerResponse(owner.getId(), owner.getFirstName(), owner.getLastName()),
                node.getCreatedAt(),
                node.getUpdatedAt(),
                node.getVersion(),
                file.map(File::getOriginalFileName).orElse(null),
                file.map(File::getContentType).orElse(null),
                file.map(File::getSize).orElse(null),
                permissions.permissions(actor, node),
                favorite);
    }
}
