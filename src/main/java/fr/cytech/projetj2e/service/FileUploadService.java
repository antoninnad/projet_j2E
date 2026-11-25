package fr.cytech.projetj2e.service;

import java.io.IOException;
import java.io.InputStream;

import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.exception.StorageException;
import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.Folder;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.FileRepository;

/**
 * Import d'un fichier dans un dossier (T21).
 *
 * Contrôles, dans cet ordre :
 * 1. isolation et visibilité du dossier : 404 s'il est d'une autre entreprise ou invisible ;
 * 2. droit de création dans le dossier (droit de modification, section 2.6) : 403 ;
 * 3. fichier présent et non vide, nom valide : 400 ; nom déjà pris dans le dossier : 409
 *    (le remplacement d'un fichier existant relève de T23) ;
 * 4. taille : limitée par spring.servlet.multipart.max-file-size, 413 au-delà (ApiExceptionAdvice).
 *
 * Le contenu est écrit dans le stockage privé de l'entreprise sous un nom UUID ; le nom affiché est
 * celui envoyé par le client, débarrassé de tout chemin. Le fichier hérite du département et du seuil
 * du dossier ; le compte en est propriétaire. Si l'enregistrement en base échoue, le contenu est effacé.
 */
@Service
@Transactional
public class FileUploadService {

    static final int MAX_CONTENT_TYPE_LENGTH = 255;

    private final CompanyIsolationService isolation;
    private final PermissionService permissions;
    private final FileRepository fileRepository;
    private final CompanyStorage storage;
    private final NodeNames names;
    private final NodeResponseMapper mapper;

    public FileUploadService(CompanyIsolationService isolation,
                             PermissionService permissions,
                             FileRepository fileRepository,
                             CompanyStorage storage,
                             NodeNames names,
                             NodeResponseMapper mapper) {
        this.isolation = isolation;
        this.permissions = permissions;
        this.fileRepository = fileRepository;
        this.storage = storage;
        this.names = names;
        this.mapper = mapper;
    }

    public NodeResponse upload(User actor, Long folderId, MultipartFile upload) {
        Folder folder = isolation.requireFolder(actor, folderId);
        if (!permissions.permissions(actor, folder).view()) {
            throw new ResourceNotFoundException("Élément introuvable.");
        }
        permissions.requireCreateChild(actor, folder);

        if (upload == null) {
            throw new IllegalArgumentException("Aucun fichier reçu (champ « file » attendu).");
        }
        if (upload.isEmpty()) {
            throw new IllegalArgumentException("Le fichier est vide.");
        }
        String originalFileName = upload.getOriginalFilename();
        String name = NodeNames.valid(baseName(originalFileName));
        names.requireFree(folder, name, null);
        String contentType = contentType(upload.getContentType(), name);

        CompanyStorage.StoredContent stored;
        try (InputStream content = upload.getInputStream()) {
            stored = storage.store(folder.getCompany(), content);
        } catch (IOException exception) {
            throw new StorageException("Le fichier reçu n'a pas pu être lu.", exception);
        }

        File file = new File(actor, name, folder, name, contentType, stored.storagePath(), stored.size());
        return mapper.toResponse(actor, fileRepository.save(file));
    }

    /** Dernier segment du nom envoyé : certains navigateurs transmettent un chemin (C:\fakepath\a.txt). */
    static String baseName(String originalFileName) {
        if (originalFileName == null) {
            return "";
        }
        int separator = Math.max(originalFileName.lastIndexOf('/'), originalFileName.lastIndexOf('\\'));
        return originalFileName.substring(separator + 1);
    }

    /**
     * Type MIME déclaré par le client s'il est bien formé, sinon déduit de l'extension,
     * sinon application/octet-stream. Il ne sert qu'à l'affichage et à l'aperçu (T22/T25).
     */
    static String contentType(String declared, String name) {
        if (declared != null && !declared.isBlank() && declared.length() <= MAX_CONTENT_TYPE_LENGTH) {
            try {
                MediaType type = MediaType.parseMediaType(declared);
                if (!type.isWildcardType() && !type.isWildcardSubtype()) {
                    return type.toString();
                }
            } catch (InvalidMediaTypeException ignored) {
                // Type invalide : on le déduit du nom.
            }
        }
        return MediaTypeFactory.getMediaType(name).orElse(MediaType.APPLICATION_OCTET_STREAM).toString();
    }
}
