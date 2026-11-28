package fr.cytech.projetj2e.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.service.CompanyCreationService;
import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/companies")
public class PlatformCompanyRestController {

    public record CreateCompanyRequest(String companyName,
                                       String companyCode,
                                       String adminFirstName,
                                       String adminLastName,
                                       String adminUsername,
                                       String adminEmail,
                                       String adminPassword,
                                       String adminConfirmPassword) {}

    public record CompanyResponse(Long id, String name, String code) {}
    public record AdminResponse(Long id, String username, String firstName, String lastName,
                                String email, AccountStatus status, UserRole role, Long companyId) {}
    public record CreateCompanyResponse(CompanyResponse company, AdminResponse admin) {}

    private final CompanyCreationService creation;

    public PlatformCompanyRestController(CompanyCreationService creation) {
        this.creation = creation;
    }

    @PostMapping
    public ResponseEntity<CreateCompanyResponse> create(@RequestBody CreateCompanyRequest request,
                                                        HttpSession session) {
        if (session == null || session.getAttribute("adminId") == null) {
            throw new ForbiddenException("Administrateur du site requis.");
        }

        CompanyCreationService.CreatedCompany created = creation.create(
                request.companyName(),
                request.companyCode(),
                request.adminFirstName(),
                request.adminLastName(),
                request.adminUsername(),
                request.adminEmail(),
                request.adminPassword(),
                request.adminConfirmPassword());

        Company company = created.company();
        User admin = created.admin();
        CompanyResponse companyResponse =
                new CompanyResponse(company.getId(), company.getName(), company.getCode());
        AdminResponse adminResponse = new AdminResponse(
                admin.getId(), admin.getUsername(), admin.getFirstName(), admin.getLastName(),
                admin.getEmail(), admin.getStatus(), admin.getRole(), company.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new CreateCompanyResponse(companyResponse, adminResponse));
    }
}
