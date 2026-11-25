package fr.cytech.projetj2e.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.service.FileUploadService;
import fr.cytech.projetj2e.service.SessionIdentityService;
import jakarta.servlet.http.HttpSession;

/**
 * Import de fichiers (T21), consommé par l'explorateur React (T24).
 * Requête multipart/form-data avec le contenu dans le champ « file » et le jeton CSRF en en-tête.
 * La réponse décrit le fichier créé, sans son chemin de stockage.
 */
@RestController
@RequestMapping("/api")
public class FileUploadRestController {

    private final FileUploadService uploads;
    private final SessionIdentityService identity;

    public FileUploadRestController(FileUploadService uploads, SessionIdentityService identity) {
        this.uploads = uploads;
        this.identity = identity;
    }

    @PostMapping(path = "/folders/{folderId}/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public NodeResponse upload(@PathVariable Long folderId,
                               @RequestParam(name = "file", required = false) MultipartFile file,
                               HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return uploads.upload(actor, folderId, file);
    }
}
