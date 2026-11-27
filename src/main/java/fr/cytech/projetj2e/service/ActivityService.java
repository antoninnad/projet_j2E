package fr.cytech.projetj2e.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.cytech.projetj2e.dto.ActivityResponse;
import fr.cytech.projetj2e.dto.ActivityResponse.ActorResponse;
import fr.cytech.projetj2e.dto.PageResponse;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.Log;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.LogRepository;

/**
 * Consultation de l'activité (T36), section 2.8 :
 * l'administrateur voit toute l'activité de son entreprise ; un membre, celle des éléments qu'il peut voir
 * aujourd'hui (un droit retiré retire aussi l'historique correspondant). Les actions d'administration
 * (départements, adhésions, comptes) sont réservées à l'administrateur.
 */
@Service
@Transactional(readOnly = true)
public class ActivityService {

    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;

    private final CompanyIsolationService isolation;
    private final PermissionService permissions;
    private final LogRepository logs;

    public ActivityService(CompanyIsolationService isolation, PermissionService permissions, LogRepository logs) {
        this.isolation = isolation;
        this.permissions = permissions;
        this.logs = logs;
    }

    /** Fil d'activité de l'entreprise, filtré selon les droits du compte. */
    public PageResponse<ActivityResponse> companyFeed(User actor, int page, int size) {
        Long companyId = isolation.requireActiveCompanyId(actor);
        PageRequest request = pageRequest(page, size);
        Page<Log> found = actor.getRole() == UserRole.COMPANY_ADMIN
                ? logs.findByCompany(companyId, request)
                : logs.findVisibleTo(companyId, actor, request);
        return PageResponse.from(found, ActivityService::toResponse);
    }

    /** Historique d'un dossier ou d'un fichier visible par le compte (404 sinon). */
    public PageResponse<ActivityResponse> nodeHistory(User actor, Long nodeId, int page, int size) {
        Node node = isolation.requireNode(actor, nodeId);
        if (!permissions.permissions(actor, node).view()) {
            throw new ResourceNotFoundException("Élément introuvable.");
        }
        return PageResponse.from(logs.findByNode(node.getCompany().getId(), node.getId(), pageRequest(page, size)),
                ActivityService::toResponse);
    }

    private static PageRequest pageRequest(int page, int size) {
        if (page < 0) {
            throw new IllegalArgumentException("Le numéro de page doit être positif ou nul.");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("La taille de page doit être comprise entre 1 et " + MAX_PAGE_SIZE + ".");
        }
        return PageRequest.of(page, size);
    }

    static ActivityResponse toResponse(Log log) {
        User actor = log.getActor();
        return new ActivityResponse(
                log.getId(),
                log.getAction().name(),
                log.getAction().getCategory().name(),
                log.getAction().getLabel(),
                log.getOccurredAt(),
                actor == null ? null : new ActorResponse(actor.getId(), actor.getFirstName(), actor.getLastName()),
                log.getNodeId(),
                log.getNodeName(),
                log.getNodeKind(),
                log.getDepartmentId(),
                log.getDepartmentName(),
                log.getTargetUserId(),
                log.getTargetUserName(),
                log.getDetails());
    }
}
