package fr.cytech.projetj2e.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.exception.ConflictException;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.exception.StorageException;
import fr.cytech.projetj2e.model.ActivityAction;
import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.NodeRepository;

/**
 * Écriture des fichiers (T23) : enregistrer un texte, remplacer un contenu, renommer, supprimer.
 * Le déplacement d'un fichier passe par FolderManagementService.move (T20) : il ne touche pas au disque.
 *
 * Contrôles, dans cet ordre :
 * 1. isolation et visibilité : 404 pour un fichier d'une autre entreprise, invisible ou inexistant ;
 * 2. version : le client renvoie la version chargée ; si le fichier a changé depuis, 409 et rien n'est écrit.
 *    Elle est obligatoire pour l'enregistrement et le remplacement (pas d'écrasement silencieux),
 *    facultative pour le renommage et la suppression, comme pour les dossiers (T20) ;
 * 3. droits (section 2.6) : modification pour écrire ou renommer, suppression pour supprimer (403).
 *
 * Synchronisation base / disque : un nouveau contenu est écrit sous un nouveau nom, jamais par-dessus l'ancien.
 * Si la transaction échoue (conflit détecté par @Version compris), le nouveau contenu est effacé et l'ancien reste ;
 * si elle est validée, l'ancien contenu est effacé. Une suppression n'efface le disque qu'après validation.
 */
@Service
@Transactional
public class FileManagementService {

    private final CompanyIsolationService isolation;
    private final PermissionService permissions;
    private final NodeRepository nodeRepository;
    private final CompanyStorage storage;
    private final NodeNames names;
    private final NodeResponseMapper mapper;
    private final DataSize maxFileSize;
    private final ActivityRecorder activity;

    public FileManagementService(CompanyIsolationService isolation,
                                 PermissionService permissions,
                                 NodeRepository nodeRepository,
                                 CompanyStorage storage,
                                 NodeNames names,
                                 NodeResponseMapper mapper,
                                 @Value("${spring.servlet.multipart.max-file-size:1MB}") DataSize maxFileSize,
                                 ActivityRecorder activity) {
        this.isolation = isolation;
        this.permissions = permissions;
        this.nodeRepository = nodeRepository;
        this.storage = storage;
        this.names = names;
        this.mapper = mapper;
        this.maxFileSize = maxFileSize;
        this.activity = activity;
    }

    /** Enregistre le texte édité dans l'interface (fichiers texte uniquement), encodé en UTF-8. */
    public NodeResponse saveText(User actor, Long fileId, String content, Long expectedVersion) {
        File file = requireVisibleFile(actor, fileId);
        requireVersion(file, requiredVersion(expectedVersion));
        permissions.requireModify(actor, file);
        MediaType type = FileContentService.storedType(file.getContentType());
        if (!isText(type)) {
            throw new IllegalArgumentException("« " + file.getName() + " » n'est pas un fichier texte : remplacez-le par un import.");
        }
        if (content == null) {
            throw new IllegalArgumentException("Le contenu est obligatoire (chaîne vide pour vider le fichier).");
        }
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        if (bytes.length > maxFileSize.toBytes()) {
            throw new MaxUploadSizeExceededException(maxFileSize.toBytes());
        }
        String contentType = "text".equals(type.getType())
                ? new MediaType(type, StandardCharsets.UTF_8).toString()
                : file.getContentType();
        NodeResponse saved = writeContent(actor, file, new ByteArrayInputStream(bytes), contentType, file.getOriginalFileName());
        activity.node(actor, ActivityAction.FILE_SAVED, file, "version " + saved.version());
        return saved;
    }

    /** Remplace le contenu par un fichier importé ; le nom affiché ne change pas. */
    public NodeResponse replace(User actor, Long fileId, MultipartFile upload, Long expectedVersion) {
        File file = requireVisibleFile(actor, fileId);
        requireVersion(file, requiredVersion(expectedVersion));
        permissions.requireModify(actor, file);
        if (upload == null) {
            throw new IllegalArgumentException("Aucun fichier reçu (champ « file » attendu).");
        }
        if (upload.isEmpty()) {
            throw new IllegalArgumentException("Le fichier est vide.");
        }
        String sentName = FileUploadService.baseName(upload.getOriginalFilename()).trim();
        String originalFileName = sentName.isEmpty() || sentName.length() > NodeNames.MAX_LENGTH ? file.getName() : sentName;
        String contentType = FileUploadService.contentType(upload.getContentType(), originalFileName);
        try (InputStream content = upload.getInputStream()) {
            NodeResponse replaced = writeContent(actor, file, content, contentType, originalFileName);
            activity.node(actor, ActivityAction.FILE_REPLACED, file, "par « " + originalFileName + " »");
            return replaced;
        } catch (IOException exception) {
            throw new StorageException("Le fichier reçu n'a pas pu être lu.", exception);
        }
    }

    /** Renomme un fichier (droit de modification) ; le nom doit rester libre dans son dossier. */
    public NodeResponse rename(User actor, Long fileId, String rawName, Long expectedVersion) {
        File file = requireVisibleFile(actor, fileId);
        requireVersion(file, expectedVersion);
        permissions.requireModify(actor, file);
        String name = NodeNames.valid(rawName);
        names.requireFree(file.getParent(), name, file.getId());
        String previous = file.getName();
        file.setName(name);
        nodeRepository.flush();
        if (!previous.equals(name)) {
            activity.node(actor, ActivityAction.FILE_RENAMED, file, ActivityRecorder.change(previous, name));
        }
        return mapper.toResponse(actor, file);
    }

    /** Supprime un fichier (droit de suppression) ; son contenu est effacé du disque après validation. */
    public void delete(User actor, Long fileId, Long expectedVersion) {
        File file = requireVisibleFile(actor, fileId);
        requireVersion(file, expectedVersion);
        permissions.requireDelete(actor, file);
        Path content = storage.resolve(file);
        activity.node(actor, ActivityAction.FILE_DELETED, file, "dans « " + file.getParent().getName() + " »");
        activity.freezeHistory(List.of(file));
        file.getParent().removeChild(file);
        nodeRepository.delete(file);
        nodeRepository.flush();
        storage.deleteAfterCommit(List.of(content));
    }

    // ---------------------------------------------------------------- Écriture

    private NodeResponse writeContent(User actor, File file, InputStream content,
                                      String contentType, String originalFileName) {
        Path previous = storage.resolve(file);
        CompanyStorage.StoredContent stored = storage.store(file.getCompany(), content); // effacé si annulation
        file.replaceContent(stored.storagePath(), stored.size(), contentType, originalFileName);
        nodeRepository.flush(); // contrôle @Version maintenant : un conflit annule tout et garde l'ancien contenu
        storage.deleteAfterCommit(List.of(previous));
        return mapper.toResponse(actor, file);
    }

    // ---------------------------------------------------------------- Contrôles

    private File requireVisibleFile(User actor, Long fileId) {
        File file = isolation.requireFile(actor, fileId);
        if (!permissions.permissions(actor, file).view()) {
            throw new ResourceNotFoundException("Fichier introuvable.");
        }
        return file;
    }

    private static Long requiredVersion(Long expectedVersion) {
        if (expectedVersion == null) {
            throw new IllegalArgumentException("La version chargée est obligatoire pour enregistrer un fichier.");
        }
        return expectedVersion;
    }

    private static void requireVersion(File file, Long expectedVersion) {
        if (expectedVersion != null && !expectedVersion.equals(file.getVersion())) {
            throw new ConflictException("« " + file.getName() + " » a été modifié entre-temps ; "
                    + "rechargez-le avant de réessayer.");
        }
    }

    /** Fichier éditable comme texte : ceux dont l'aperçu est servi en texte (T22). */
    static boolean isText(MediaType type) {
        return FileContentService.previewType(type)
                .filter(preview -> MediaType.TEXT_PLAIN.equalsTypeAndSubtype(preview))
                .isPresent();
    }
}
