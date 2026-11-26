package fr.cytech.projetj2e.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.service.FileManagementService;
import fr.cytech.projetj2e.service.SessionIdentityService;
import jakarta.servlet.http.HttpSession;

/**
 * Écriture des fichiers (T23), consommée par l'éditeur React (T26).
 * Chaque réponse renvoie la nouvelle version, à renvoyer à la prochaine écriture ;
 * si le fichier a changé entre-temps, 409 : l'interface garde le brouillon et propose de recharger.
 * Le déplacement d'un fichier utilise POST /api/nodes/{nodeId}/move (T20).
 */
@RestController
@RequestMapping("/api/files/{fileId}")
public class FileManagementRestController {

    public record SaveTextRequest(String content, Long version) {}
    public record RenameFileRequest(String name, Long version) {}

    private final FileManagementService files;
    private final SessionIdentityService identity;

    public FileManagementRestController(FileManagementService files, SessionIdentityService identity) {
        this.files = files;
        this.identity = identity;
    }

    /** Enregistre le texte édité. */
    @PutMapping(path = "/content", consumes = MediaType.APPLICATION_JSON_VALUE)
    public NodeResponse saveText(@PathVariable Long fileId, @RequestBody SaveTextRequest request, HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return files.saveText(actor, fileId, request.content(), request.version());
    }

    /** Remplace le contenu par un fichier importé (champ « file ») ; la version est un champ du formulaire. */
    @PostMapping(path = "/replace", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public NodeResponse replace(@PathVariable Long fileId,
                                @RequestParam(name = "file", required = false) MultipartFile file,
                                @RequestParam(required = false) Long version,
                                HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return files.replace(actor, fileId, file, version);
    }

    @PatchMapping
    public NodeResponse rename(@PathVariable Long fileId, @RequestBody RenameFileRequest request, HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return files.rename(actor, fileId, request.name(), request.version());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long fileId,
                       @RequestParam(required = false) Long version,
                       HttpSession session) {
        User actor = identity.requireActiveMember(session);
        files.delete(actor, fileId, version);
    }
}
