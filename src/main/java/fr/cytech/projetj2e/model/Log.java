package fr.cytech.projetj2e.model;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Entrée du journal d'activité d'une entreprise (T36) : qui a fait quoi, quand, et sur quoi.
 *
 * L'élément concerné (nœud, département, compte cible) est recopié au moment de l'action — identifiant, nom,
 * département et seuil — sans clé étrangère : l'historique reste lisible après suppression, et le seuil recopié
 * permet de filtrer la consultation d'un élément supprimé. Le contenu des fichiers et des chats n'y figure jamais.
 * admin référence l'administrateur de plateforme pour ses propres actions (relation historique Admin → logs).
 */
@Entity
@Table(name = "logs")
public class Log {

    public static final int MAX_DETAILS_LENGTH = 500;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivityAction action;

    @Column(nullable = false, updatable = false)
    private Instant occurredAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id")
    private Admin admin;

    @Column(name = "node_id")
    private Long nodeId;

    @Column(name = "node_name")
    private String nodeName;

    @Column(name = "node_kind", length = 16)
    private String nodeKind;

    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "department_name")
    private String departmentName;

    @Column(name = "min_access_level")
    private Integer minAccessLevel;

    @Column(name = "target_user_id")
    private Long targetUserId;

    @Column(name = "target_user_name")
    private String targetUserName;

    @Column(length = MAX_DETAILS_LENGTH)
    private String details;

    protected Log() {
        // Constructeur requis par JPA.
    }

    public Log(ActivityAction action, Instant occurredAt, Company company, User actor) {
        this.action = action;
        this.occurredAt = occurredAt;
        this.company = company;
        this.actor = actor;
    }

    /** Recopie l'élément concerné : identifiant, nom, type, département et seuil actuels. */
    public Log about(Node node) {
        this.nodeId = node.getId();
        this.nodeName = node.getName();
        this.nodeKind = node instanceof File ? "file" : "folder";
        return in(node.getDepartment()).withThreshold(node.getMinAccessLevel());
    }

    public Log in(Department department) {
        this.departmentId = department.getId();
        this.departmentName = department.getName();
        return this;
    }

    public Log withThreshold(int minAccessLevel) {
        this.minAccessLevel = minAccessLevel;
        return this;
    }

    public Log target(User user) {
        this.targetUserId = user.getId();
        this.targetUserName = (user.getFirstName() + " " + user.getLastName()).trim();
        return this;
    }

    public Log details(String details) {
        this.details = details == null || details.length() <= MAX_DETAILS_LENGTH
                ? details
                : details.substring(0, MAX_DETAILS_LENGTH - 1) + "…";
        return this;
    }

    public Long getId() {
        return id;
    }

    public ActivityAction getAction() {
        return action;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public Company getCompany() {
        return company;
    }

    public User getActor() {
        return actor;
    }

    public Admin getAdmin() {
        return admin;
    }

    public Long getNodeId() {
        return nodeId;
    }

    public String getNodeName() {
        return nodeName;
    }

    public String getNodeKind() {
        return nodeKind;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public String getDepartmentName() {
        return departmentName;
    }

    public Integer getMinAccessLevel() {
        return minAccessLevel;
    }

    public Long getTargetUserId() {
        return targetUserId;
    }

    public String getTargetUserName() {
        return targetUserName;
    }

    public String getDetails() {
        return details;
    }
}
