package fr.cytech.projetj2e.service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.Set;

import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.exception.StorageException;
import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.User;

/**
 * Lecture du contenu des fichiers (T22).
 *
 * Contrôles : isolation par entreprise puis droit de consultation (section 2.6). Un fichier d'une autre
 * entreprise, inexistant ou invisible pour le compte renvoie 404, comme dans l'exploration (T18).
 * Le chemin physique reste côté serveur : le contrôleur diffuse le contenu sans jamais l'exposer.
 *
 * L'aperçu dans le navigateur est limité aux formats sans contenu actif : texte (servi en text/plain,
 * y compris HTML ou XML, pour qu'aucun script ne s'exécute), images matricielles et PDF.
 * Les autres formats, dont SVG, ne sont proposés qu'en téléchargement.
 */
@Service
@Transactional(readOnly = true)
public class FileContentService {

    /** Contenu prêt à être diffusé : métadonnées utiles aux en-têtes HTTP et chemin privé. */
    public record FileContent(Long id, Long version, String name, MediaType contentType, long size,
                              Optional<MediaType> previewType, Path path) {}

    private static final Set<String> PREVIEWABLE_IMAGES = Set.of(
            "image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp", "image/avif");
    private static final Set<String> TEXT_APPLICATIONS = Set.of(
            "application/json", "application/xml", "application/javascript", "application/x-yaml",
            "application/yaml", "application/sql");

    private final CompanyIsolationService isolation;
    private final PermissionService permissions;
    private final CompanyStorage storage;

    public FileContentService(CompanyIsolationService isolation,
                              PermissionService permissions,
                              CompanyStorage storage) {
        this.isolation = isolation;
        this.permissions = permissions;
        this.storage = storage;
    }

    public FileContent read(User actor, Long fileId) {
        File file = isolation.requireFile(actor, fileId);
        if (!permissions.permissions(actor, file).view()) {
            throw new ResourceNotFoundException("Fichier introuvable.");
        }
        Path path = storage.resolve(file);
        if (!Files.isRegularFile(path) || !Files.isReadable(path)) {
            throw new StorageException("Le contenu du fichier est indisponible.");
        }
        MediaType type = storedType(file.getContentType());
        return new FileContent(file.getId(), file.getVersion(), file.getName(), type, file.getSize(),
                previewType(type), path);
    }

    /** Type enregistré s'il est bien formé, sinon application/octet-stream. */
    static MediaType storedType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
        try {
            MediaType type = MediaType.parseMediaType(contentType);
            return type.isConcrete() ? type : MediaType.APPLICATION_OCTET_STREAM;
        } catch (InvalidMediaTypeException exception) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    /** Type sous lequel l'aperçu est servi, ou vide si le format ne se prévisualise pas sans risque. */
    static Optional<MediaType> previewType(MediaType type) {
        String essence = type.getType() + "/" + type.getSubtype();
        if ("text".equals(type.getType()) || TEXT_APPLICATIONS.contains(essence) || essence.endsWith("+json")) {
            return Optional.of(new MediaType(MediaType.TEXT_PLAIN,
                    type.getCharset() != null ? type.getCharset() : StandardCharsets.UTF_8));
        }
        if (PREVIEWABLE_IMAGES.contains(essence)) {
            return Optional.of(new MediaType(type.getType(), type.getSubtype()));
        }
        if (MediaType.APPLICATION_PDF.equalsTypeAndSubtype(type)) {
            return Optional.of(MediaType.APPLICATION_PDF);
        }
        return Optional.empty();
    }
}
