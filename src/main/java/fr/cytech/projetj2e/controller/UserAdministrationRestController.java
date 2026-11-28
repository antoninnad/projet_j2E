package fr.cytech.projetj2e.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fr.cytech.projetj2e.dto.PageResponse;
import fr.cytech.projetj2e.dto.PublicUser;
import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.service.SessionIdentityService;
import fr.cytech.projetj2e.service.UserAdministrationService;
import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/users")
public class UserAdministrationRestController {

    private static final int MAX_PAGE_SIZE = 100;

    private final UserAdministrationService administration;
    private final SessionIdentityService identity;

    public UserAdministrationRestController(UserAdministrationService administration,
                                            SessionIdentityService identity) {
        this.administration = administration;
        this.identity = identity;
    }

    @GetMapping
    public PageResponse<PublicUser> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) AccountStatus status,
            @RequestParam(required = false) String search,
            HttpSession session) {
        if (page < 0) {
            throw new IllegalArgumentException("Le numéro de page doit être positif ou nul.");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("La taille de page doit être comprise entre 1 et "
                    + MAX_PAGE_SIZE + ".");
        }
        if (search != null && search.length() > 100) {
            throw new IllegalArgumentException("La recherche ne doit pas dépasser 100 caractères.");
        }

        User actor = identity.requireActiveMember(session);
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Page<User> users = administration.listCompanyUsers(actor, status, search, pageable);
        return PageResponse.from(users, PublicUser::from);
    }

    private static Sort parseSort(String rawSort) {
        String[] parts = rawSort == null || rawSort.isBlank()
                ? new String[] {"id", "asc"}
                : rawSort.split(",", 2);
        String property = parts[0].strip();
        String direction = parts.length > 1 ? parts[1].strip() : "asc";
        if (!"asc".equalsIgnoreCase(direction) && !"desc".equalsIgnoreCase(direction)) {
            throw new IllegalArgumentException("Le sens du tri doit être asc ou desc.");
        }
        if (!switch (property) {
            case "id", "username", "firstName", "lastName", "email", "status", "role" -> true;
            default -> false;
        }) {
            throw new IllegalArgumentException("Tri de compte non pris en charge.");
        }
        Sort.Direction sortDirection = "desc".equalsIgnoreCase(direction)
                ? Sort.Direction.DESC
                : Sort.Direction.ASC;
        return Sort.by(sortDirection, property);
    }
}
