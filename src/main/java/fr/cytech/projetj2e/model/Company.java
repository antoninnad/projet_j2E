package fr.cytech.projetj2e.model;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Entreprise. Chaque compte, département et document appartient à une seule entreprise,
 * et les données d'une entreprise ne sont jamais visibles depuis une autre.
 */
@Entity
@Table(name = "companies")
@Getter @Setter @NoArgsConstructor
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    @NotBlank
    private String name;

    /** Code saisi à l'inscription pour rejoindre l'entreprise. */
    @Column(unique = true, nullable = false)
    @NotBlank
    private String code;

    // 1-N : une entreprise, plusieurs utilisateurs
    @OneToMany(mappedBy = "company")
    private List<User> users = new ArrayList<>();

    // 1-N : une entreprise, plusieurs départements
    @OneToMany(mappedBy = "company")
    private List<Department> departments = new ArrayList<>();

    public Company(String name, String code) {
        this.name = name;
        this.code = code;
    }

    public void addUser(User user) {
        if (!users.contains(user)) {
            users.add(user);
        }
        user.setCompany(this);
    }

    public void removeUser(User user) {
        users.remove(user);
        if (user.getCompany() == this) {
            user.setCompany(null);
        }
    }

    public void addDepartment(Department department) {
        if (!departments.contains(department)) {
            departments.add(department);
        }
        department.setCompany(this);
    }

    public void removeDepartment(Department department) {
        departments.remove(department);
        if (department.getCompany() == this) {
            department.setCompany(null);
        }
    }
}
