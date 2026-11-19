package fr.cytech.projetj2e.model;

import java.util.ArrayList;
import java.util.List;

import jakarta.validation.constraints.NotBlank;


import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;


@Entity  @Data 
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    @NotBlank
    private String username;

    @Column(unique = true, nullable = false)
    @NotBlank
    private String email;

    @Column 
    @NotBlank 
    private String firstName;

    @Column 
    @NotBlank
    private String lastName;

    @Column(nullable = false)
    @ToString.Exclude
    private String passwordHash;

    // PENDING à l'inscription, ACTIVE après approbation, DISABLED après désactivation
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccountStatus status = AccountStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role = UserRole.MEMBER;

    // N-1 : un compte appartient à une seule entreprise
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    @ToString.Exclude @EqualsAndHashCode.Exclude
    private Company company;

    // Exclu de toString/hashCode : UserProfile référence User en retour (boucle infinie sinon)
    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude @EqualsAndHashCode.Exclude
    private UserProfile profile;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude @EqualsAndHashCode.Exclude
    private List<Membership> memberships = new ArrayList<>();

    /** Seul un compte approuvé et non désactivé peut utiliser l'espace de travail. */
    public boolean isActive() {
        return status == AccountStatus.ACTIVE;
    }


    // methods ...
    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public UserProfile getProfile() {
        return profile;
    }

    public void setProfile(UserProfile profile) {
        if (profile == null) {
            if (this.profile != null) {
                this.profile.setUser(null);
            }
        } else {
            profile.setUser(this);
        }
        this.profile = profile;
    }

    public List<Membership> getMemberships() {
        return memberships;
    }

    public void addMembership(Membership membership) {
        if (!memberships.contains(membership)) {
            memberships.add(membership);
        }
        membership.setUser(this);
    }

    public void removeMembership(Membership membership) {
        memberships.remove(membership);
        if (membership.getUser() == this) {
            membership.setUser(null);
        }
    }
   
}
