package fr.cytech.projetj2e.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import fr.cytech.projetj2e.dto.FavoriteResponse;
import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.dto.PageResponse;
import fr.cytech.projetj2e.dto.SearchResultResponse;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.service.FavoriteService;
import fr.cytech.projetj2e.service.SearchService;
import fr.cytech.projetj2e.service.SessionIdentityService;
import jakarta.servlet.http.HttpSession;

/**
 * Recherche et favoris (T31), consommés par l'explorateur React (T32).
 * Résultats et favoris ne contiennent que des éléments visibles par le compte. Les écritures exigent le jeton CSRF.
 */
@RestController
@RequestMapping("/api")
public class SearchRestController {

    private final SearchService search;
    private final FavoriteService favorites;
    private final SessionIdentityService identity;

    public SearchRestController(SearchService search, FavoriteService favorites, SessionIdentityService identity) {
        this.search = search;
        this.favorites = favorites;
        this.identity = identity;
    }

    /** Recherche par nom : q obligatoire ; kind = file | folder et departmentId facultatifs. */
    @GetMapping("/search")
    public PageResponse<SearchResultResponse> search(@RequestParam(required = false) String q,
                                                     @RequestParam(required = false) String kind,
                                                     @RequestParam(required = false) Long departmentId,
                                                     @RequestParam(defaultValue = "0") int page,
                                                     @RequestParam(defaultValue = "" + SearchService.DEFAULT_PAGE_SIZE) int size,
                                                     HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return search.search(actor, q, kind, departmentId, page, size);
    }

    @GetMapping("/favorites")
    public PageResponse<FavoriteResponse> favorites(@RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "" + FavoriteService.DEFAULT_PAGE_SIZE) int size,
                                                    HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return favorites.list(actor, page, size);
    }

    /** Ajoute aux favoris (idempotent) ; renvoie l'élément avec favorite = true. */
    @PutMapping("/favorites/{nodeId}")
    public NodeResponse addFavorite(@PathVariable Long nodeId, HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return favorites.add(actor, nodeId);
    }

    /** Retire des favoris (idempotent). */
    @DeleteMapping("/favorites/{nodeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeFavorite(@PathVariable Long nodeId, HttpSession session) {
        User actor = identity.requireActiveMember(session);
        favorites.remove(actor, nodeId);
    }
}
