package fr.cytech.projetj2e.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fr.cytech.projetj2e.dto.ActivityResponse;
import fr.cytech.projetj2e.dto.PageResponse;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.service.ActivityService;
import fr.cytech.projetj2e.service.SessionIdentityService;
import jakarta.servlet.http.HttpSession;

/** Consultation de l'activité (T36), consommée par l'écran d'activité (T37). Pages au format { items, page }. */
@RestController
@RequestMapping("/api")
public class ActivityRestController {

    private final ActivityService activity;
    private final SessionIdentityService identity;

    public ActivityRestController(ActivityService activity, SessionIdentityService identity) {
        this.activity = activity;
        this.identity = identity;
    }

    /** Activité de l'entreprise visible par le compte, la plus récente d'abord. */
    @GetMapping("/activity")
    public PageResponse<ActivityResponse> feed(@RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "" + ActivityService.DEFAULT_PAGE_SIZE) int size,
                                               HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return activity.companyFeed(actor, page, size);
    }

    /** Historique d'un dossier ou d'un fichier visible. */
    @GetMapping("/nodes/{nodeId}/activity")
    public PageResponse<ActivityResponse> nodeHistory(@PathVariable Long nodeId,
                                                      @RequestParam(defaultValue = "0") int page,
                                                      @RequestParam(defaultValue = "" + ActivityService.DEFAULT_PAGE_SIZE) int size,
                                                      HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return activity.nodeHistory(actor, nodeId, page, size);
    }
}
