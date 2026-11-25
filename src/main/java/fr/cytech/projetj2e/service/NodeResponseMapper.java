package fr.cytech.projetj2e.service;

import java.util.Optional;

import org.springframework.stereotype.Component;

import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.dto.NodeResponse.OwnerResponse;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;

/**
 * Convertit un nœud en NodeResponse pour le compte connecté (T18, T20) :
 * métadonnées sans chemin de stockage et actions autorisées calculées par PermissionService.
 * À appeler dans une transaction (relations paresseuses).
 */
@Component
public class NodeResponseMapper {

    private final PermissionService permissions;

    public NodeResponseMapper(PermissionService permissions) {
        this.permissions = permissions;
    }

    public NodeResponse toResponse(User actor, Node node) {
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
                permissions.permissions(actor, node));
    }
}
