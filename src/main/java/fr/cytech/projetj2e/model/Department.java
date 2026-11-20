package fr.cytech.projetj2e.model;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Département d'une entreprise (ex. Finance, Ressources humaines).
 * Son dossier racine est le Folder sans parent de ce département :
 * créé par FolderService.createDepartmentRoot, retrouvé par FolderService.findDepartmentRoot.
 */
@Entity
@Table(name = "departments",
       uniqueConstraints = @UniqueConstraint(columnNames = {"company_id", "name"}))
@Getter @Setter @NoArgsConstructor
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    @NotBlank
    private String name;

    // N-1 : plusieurs départements, une entreprise
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    // 1-N : supprimer un département supprime ses adhésions
    @OneToMany(mappedBy = "department", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Membership> memberships = new ArrayList<>();

    public Department(String name, Company company) {
        this.name = name;
        this.company = company;
    }

    public void addMembership(Membership membership) {
        if (!memberships.contains(membership)) {
            memberships.add(membership);
        }
        membership.setDepartment(this);
    }

    public void removeMembership(Membership membership) {
        memberships.remove(membership);
        if (membership.getDepartment() == this) {
            membership.setDepartment(null);
        }
    }
}
