package fr.cytech.projetj2e.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.dto.PageResponse;
import fr.cytech.projetj2e.dto.SearchResultResponse;
import fr.cytech.projetj2e.model.Folder;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.NodeRepository;

/**
 * Recherche de dossiers et de fichiers par nom (T31), section 2.8 : seuls les éléments que le compte peut voir
 * sont renvoyés et comptés. Le filtre est fait en base, comme l'exploration (T18) : aucun élément invisible
 * ne transite par le serveur, et la pagination ne compte que les résultats autorisés.
 */
@Service
@Transactional(readOnly = true)
public class SearchService {

    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;
    public static final int MAX_QUERY_LENGTH = 100;

    private final CompanyIsolationService isolation;
    private final NodeRepository nodes;
    private final NodeResponseMapper mapper;

    public SearchService(CompanyIsolationService isolation, NodeRepository nodes, NodeResponseMapper mapper) {
        this.isolation = isolation;
        this.nodes = nodes;
        this.mapper = mapper;
    }

    /**
     * Éléments dont le nom contient query (sans tenir compte de la casse).
     * kind : "file", "folder" ou null ; departmentId : facultatif.
     */
    public PageResponse<SearchResultResponse> search(User actor, String query, String kind, Long departmentId,
                                                     int page, int size) {
        Long companyId = isolation.requireActiveCompanyId(actor);
        String term = validQuery(query);
        String type = validKind(kind);
        if (page < 0) {
            throw new IllegalArgumentException("Le numéro de page doit être positif ou nul.");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("La taille de page doit être comprise entre 1 et " + MAX_PAGE_SIZE + ".");
        }
        String escaped = escapeLike(term.toLowerCase(Locale.ROOT));
        Page<Node> found = nodes.searchVisible(companyId, actor, actor.getRole() == UserRole.COMPANY_ADMIN,
                "%" + escaped + "%", term.toLowerCase(Locale.ROOT), escaped + "%", type, departmentId,
                PageRequest.of(page, size));
        List<NodeResponse> responses = mapper.toResponses(actor, found.getContent());
        List<SearchResultResponse> items = new ArrayList<>();
        for (int i = 0; i < responses.size(); i++) {
            items.add(new SearchResultResponse(responses.get(i), location(found.getContent().get(i))));
        }
        return new PageResponse<>(items, PageResponse.from(found, node -> node).page());
    }

    static String validQuery(String query) {
        String term = query == null ? "" : query.strip();
        if (term.isEmpty()) {
            throw new IllegalArgumentException("Saisissez un texte à rechercher.");
        }
        if (term.length() > MAX_QUERY_LENGTH) {
            throw new IllegalArgumentException("La recherche ne doit pas dépasser " + MAX_QUERY_LENGTH + " caractères.");
        }
        return term;
    }

    static String validKind(String kind) {
        if (kind == null || kind.isBlank()) {
            return null;
        }
        if (!NodeResponse.FILE.equals(kind) && !NodeResponse.FOLDER.equals(kind)) {
            throw new IllegalArgumentException("Le type doit valoir « file » ou « folder ».");
        }
        return kind;
    }

    /** Échappe les caractères spéciaux de LIKE : une recherche de « 100% » cherche bien « 100% ». */
    static String escapeLike(String term) {
        return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    /** Dossiers parents, de la racine au dossier qui contient l'élément : « Finance / Archives ». */
    static String location(Node node) {
        List<String> names = new ArrayList<>();
        for (Folder current = node.getParent(); current != null; current = current.getParent()) {
            names.add(current.getName());
        }
        Collections.reverse(names);
        return String.join(" / ", names);
    }
}
