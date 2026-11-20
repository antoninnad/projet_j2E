package fr.cytech.projetj2e.model;

import java.time.Instant;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jakarta.validation.constraints.Min;

/**
 * Élément de l'arborescence (classe mère de File et Folder).
 * Stratégie JOINED : une table "nodes" pour les champs communs,
 * et une table par sous-classe ("files", "folders") liée par le même id.
 *
 * Règles portées par le modèle :
 * - un nœud appartient à une entreprise et à un département, hérités de son parent ;
 * - seul un dossier racine de département n'a pas de parent ;
 * - le seuil d'accès (M) d'un enfant est au moins celui de son parent ;
 * - le champ version sert au verrouillage optimiste (détection des modifications concurrentes).
 */
@Entity
@Table(name = "nodes")
@Inheritance(strategy = InheritanceType.JOINED)
public abstract class Node {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    /** Incrémentée à chaque modification ; une sauvegarde avec une version périmée échoue. */
    @Version
    private Long version;

    // Plusieurs nodes, un seul parent (null = dossier racine d'un département)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Folder parent;

    // Plusieurs nodes, une seule entreprise (isolation entre entreprises)
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    // Plusieurs nodes, un seul département (référence pour le niveau d'accès L du membre)
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    /** Seuil M : niveau minimum requis dans le département pour accéder au nœud. */
    @Column(nullable = false)
    @Min(0)
    private int minAccessLevel;

    // Plusieurs nodes, un seul propriétaire
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    // Plusieurs nodes, plusieurs contributeurs
    @ManyToMany
    @JoinTable(
        name = "node_contributors",
        joinColumns = @JoinColumn(name = "node_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private Set<User> contributors = new HashSet<>();

    protected Node() {
        // Constructeur requis par JPA.
    }

    /** Nœud racine d'un département : entreprise et département sont fixés explicitement. */
    protected Node(User owner, String name, Department department, int minAccessLevel) {
        this.owner = Objects.requireNonNull(owner, "Le propriétaire est obligatoire.");
        this.name = name;
        this.department = Objects.requireNonNull(department, "Le département est obligatoire.");
        this.company = Objects.requireNonNull(department.getCompany(), "Le département doit appartenir à une entreprise.");
        this.minAccessLevel = requireValidLevel(minAccessLevel);
    }

    /**
     * Nœud enfant : hérite de l'entreprise, du département et du seuil de son parent.
     * La sous-classe doit ensuite appeler parent.addChild(this) une fois ses champs initialisés.
     */
    protected Node(User owner, String name, Folder parent) {
        Objects.requireNonNull(parent, "Le dossier parent est obligatoire.");
        this.owner = Objects.requireNonNull(owner, "Le propriétaire est obligatoire.");
        this.name = name;
        this.company = parent.getCompany();
        this.department = parent.getDepartment();
        this.minAccessLevel = parent.getMinAccessLevel();
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Long getVersion() {
        return version;
    }

    public Folder getParent() {
        return parent;
    }

    /** Réservé à Folder.addChild / removeChild, qui maintiennent les deux côtés de la relation. */
    void setParent(Folder parent) {
        this.parent = parent;
    }

    public boolean isRoot() {
        return parent == null;
    }

    public Company getCompany() {
        return company;
    }

    public Department getDepartment() {
        return department;
    }

    /** Appelé lors d'un déplacement vers un autre département ; Folder propage à ses enfants. */
    void moveToDepartment(Department department) {
        this.department = department;
    }

    public int getMinAccessLevel() {
        return minAccessLevel;
    }

    /**
     * Modifie le seuil d'accès. Refuse un seuil inférieur à celui du parent ;
     * Folder refuse aussi un seuil supérieur à celui d'un de ses enfants.
     */
    public void setMinAccessLevel(int minAccessLevel) {
        requireValidLevel(minAccessLevel);
        if (parent != null && minAccessLevel < parent.getMinAccessLevel()) {
            throw new IllegalArgumentException(
                "Le seuil (" + minAccessLevel + ") ne peut pas être inférieur à celui du dossier parent ("
                    + parent.getMinAccessLevel() + ").");
        }
        this.minAccessLevel = minAccessLevel;
    }

    public User getOwner() {
        return owner;
    }

    public void setOwner(User owner) {
        this.owner = owner;
    }

    public Set<User> getContributors() {
        return contributors;
    }

    public void addContributor(User user) {
        contributors.add(user);
    }

    public void removeContributor(User user) {
        contributors.remove(user);
    }

    /**
     * Compare deux entreprises par identifiant (fiable avec les proxys Hibernate),
     * ou par référence tant qu'elles ne sont pas enregistrées.
     */
    public static boolean sameCompany(Company a, Company b) {
        if (a == b) {
            return true;
        }
        if (a == null || b == null || a.getId() == null) {
            return false;
        }
        return a.getId().equals(b.getId());
    }

    private static int requireValidLevel(int level) {
        if (level < 0) {
            throw new IllegalArgumentException("Le seuil d'accès doit être positif ou nul.");
        }
        return level;
    }
}
