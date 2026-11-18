package fr.cytech.projetj2e.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Adhésion d'un utilisateur à un département, avec son niveau d'accès.
 * Réalise la relation N-N User ↔ Department (avec attribut).
 * Le niveau L est comparé au seuil M (minAccessLevel) des nœuds du département.
 */
@Entity
@Table(name = "memberships",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "department_id"}))
@Getter @Setter @NoArgsConstructor
public class Membership {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @Column(nullable = false)
    @Min(0)
    private int accessLevel;

    public Membership(User user, Department department, int accessLevel) {
        this.user = user;
        this.department = department;
        this.accessLevel = accessLevel;
    }
}
