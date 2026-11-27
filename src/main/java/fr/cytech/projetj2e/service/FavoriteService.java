package fr.cytech.projetj2e.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.cytech.projetj2e.dto.FavoriteResponse;
import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.dto.PageResponse;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.Favorite;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.FavoriteRepository;

/**
 * Favoris personnels et persistants (T31), section 2.8 :
 * on ne met en favori qu'un élément visible ; un favori ne donne aucun droit supplémentaire et disparaît
 * de la liste si l'accès est retiré (il réapparaît si l'accès revient) ; il est supprimé avec l'élément.
 */
@Service
@Transactional
public class FavoriteService {

    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;

    private final CompanyIsolationService isolation;
    private final PermissionService permissions;
    private final FavoriteRepository favorites;
    private final NodeResponseMapper mapper;

    public FavoriteService(CompanyIsolationService isolation, PermissionService permissions,
                           FavoriteRepository favorites, NodeResponseMapper mapper) {
        this.isolation = isolation;
        this.permissions = permissions;
        this.favorites = favorites;
        this.mapper = mapper;
    }

    /** Favoris encore accessibles, le plus récent d'abord. */
    @Transactional(readOnly = true)
    public PageResponse<FavoriteResponse> list(User actor, int page, int size) {
        Long companyId = isolation.requireActiveCompanyId(actor);
        if (page < 0) {
            throw new IllegalArgumentException("Le numéro de page doit être positif ou nul.");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("La taille de page doit être comprise entre 1 et " + MAX_PAGE_SIZE + ".");
        }
        Page<Favorite> found = favorites.findVisible(actor, companyId, actor.getRole() == UserRole.COMPANY_ADMIN,
                PageRequest.of(page, size));
        List<Node> nodes = found.getContent().stream().map(Favorite::getNode).toList();
        List<NodeResponse> responses = mapper.toResponses(actor, nodes);
        List<FavoriteResponse> items = new ArrayList<>();
        for (int i = 0; i < responses.size(); i++) {
            items.add(new FavoriteResponse(responses.get(i), SearchService.location(nodes.get(i)),
                    found.getContent().get(i).getCreatedAt()));
        }
        return new PageResponse<>(items, PageResponse.from(found, favorite -> favorite).page());
    }

    /** Ajoute l'élément aux favoris (sans effet s'il y est déjà) ; 404 s'il n'est pas visible. */
    public NodeResponse add(User actor, Long nodeId) {
        Node node = isolation.requireNode(actor, nodeId);
        if (!permissions.permissions(actor, node).view()) {
            throw new ResourceNotFoundException("Élément introuvable.");
        }
        if (favorites.findByUserAndNode(actor, node).isEmpty()) {
            favorites.save(new Favorite(actor, node, Instant.now()));
        }
        return mapper.toResponse(actor, node);
    }

    /** Retire l'élément des favoris du compte ; sans effet s'il n'y était pas. */
    public void remove(User actor, Long nodeId) {
        isolation.requireActiveCompanyId(actor);
        if (nodeId != null) {
            favorites.deleteByUserAndNodeId(actor, nodeId);
        }
    }
}
