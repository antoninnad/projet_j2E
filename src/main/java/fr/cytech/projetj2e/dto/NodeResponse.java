package fr.cytech.projetj2e.dto;

import java.time.Instant;

import fr.cytech.projetj2e.service.PermissionService.NodePermissions;

/**
 * Métadonnées d'un dossier ou d'un fichier renvoyées par l'exploration (T18).
 * Le chemin de stockage n'est jamais exposé ; les champs fichier valent null pour un dossier.
 *
 * @param kind        "folder" ou "file"
 * @param version     version de verrouillage optimiste, à renvoyer lors d'une modification (T23)
 * @param permissions actions autorisées pour le compte connecté
 * @param favorite    vrai si le compte connecté a mis l'élément en favori (T31)
 */
public record NodeResponse(
        Long id,
        String name,
        String kind,
        Long parentId,
        Long departmentId,
        String departmentName,
        int minAccessLevel,
        OwnerResponse owner,
        Instant createdAt,
        Instant updatedAt,
        Long version,
        String originalFileName,
        String contentType,
        Long size,
        NodePermissions permissions,
        boolean favorite) {

    public static final String FOLDER = "folder";
    public static final String FILE = "file";

    public record OwnerResponse(Long id, String firstName, String lastName) {}
}
