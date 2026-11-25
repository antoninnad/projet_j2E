package fr.cytech.projetj2e.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.service.FolderManagementService;
import fr.cytech.projetj2e.service.SessionIdentityService;
import jakarta.servlet.http.HttpSession;

/**
 * Opérations sur les dossiers (T20), consommées par l'explorateur React (T24).
 * Les requêtes d'écriture exigent le jeton CSRF de la session.
 * Le champ version, facultatif, est celui renvoyé par l'exploration : s'il a changé, la réponse est 409.
 */
@RestController
@RequestMapping("/api")
public class FolderRestController {

    public record CreateFolderRequest(Long parentId, String name) {}
    public record RenameFolderRequest(String name, Long version) {}
    public record MoveNodeRequest(Long targetFolderId, Long version) {}

    private final FolderManagementService folders;
    private final SessionIdentityService identity;

    public FolderRestController(FolderManagementService folders, SessionIdentityService identity) {
        this.folders = folders;
        this.identity = identity;
    }

    @PostMapping("/folders")
    @ResponseStatus(HttpStatus.CREATED)
    public NodeResponse create(@RequestBody CreateFolderRequest request, HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return folders.createFolder(actor, request.parentId(), request.name());
    }

    @PatchMapping("/folders/{folderId}")
    public NodeResponse rename(@PathVariable Long folderId,
                               @RequestBody RenameFolderRequest request,
                               HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return folders.renameFolder(actor, folderId, request.name(), request.version());
    }

    /** Déplace un dossier ou un fichier dans un autre dossier. */
    @PostMapping("/nodes/{nodeId}/move")
    public NodeResponse move(@PathVariable Long nodeId,
                             @RequestBody MoveNodeRequest request,
                             HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return folders.move(actor, nodeId, request.targetFolderId(), request.version());
    }

    /** Supprime le dossier et tout son contenu (l'interface demande confirmation avant). */
    @DeleteMapping("/folders/{folderId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long folderId,
                       @RequestParam(required = false) Long version,
                       HttpSession session) {
        User actor = identity.requireActiveMember(session);
        folders.deleteFolder(actor, folderId, version);
    }
}
