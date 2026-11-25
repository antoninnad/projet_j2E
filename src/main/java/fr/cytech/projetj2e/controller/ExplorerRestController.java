package fr.cytech.projetj2e.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fr.cytech.projetj2e.dto.NodeDetailResponse;
import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.dto.PageResponse;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.service.ExplorationService;
import fr.cytech.projetj2e.service.SessionIdentityService;
import jakarta.servlet.http.HttpSession;

/**
 * API d'exploration de l'arborescence (T18), consommée par l'explorateur React (T19).
 * Le compte et son entreprise viennent toujours de la session.
 */
@RestController
@RequestMapping("/api")
public class ExplorerRestController {

    private final ExplorationService exploration;
    private final SessionIdentityService identity;

    public ExplorerRestController(ExplorationService exploration, SessionIdentityService identity) {
        this.exploration = exploration;
        this.identity = identity;
    }

    /** Dossiers racines des départements accessibles. */
    @GetMapping("/folders/roots")
    public List<NodeResponse> roots(HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return exploration.listRoots(actor);
    }

    /** Enfants visibles d'un dossier, paginés (page à partir de 0). */
    @GetMapping("/folders/{folderId}/children")
    public PageResponse<NodeResponse> children(@PathVariable Long folderId,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "" + ExplorationService.DEFAULT_PAGE_SIZE) int size,
                                               HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return exploration.listChildren(actor, folderId, page, size);
    }

    /** Métadonnées d'un dossier ou d'un fichier, avec le fil d'Ariane. */
    @GetMapping("/nodes/{nodeId}")
    public NodeDetailResponse node(@PathVariable Long nodeId, HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return exploration.getNode(actor, nodeId);
    }
}
