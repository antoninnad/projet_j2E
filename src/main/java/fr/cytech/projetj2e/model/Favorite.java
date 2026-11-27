package fr.cytech.projetj2e.model;

import java.time.Instant;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

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

/**
 * Favori personnel d'un compte sur un dossier ou un fichier (T31).
 * Il ne donne aucun droit : la liste des favoris est filtrée selon l'accès actuel du compte.
 * Supprimé par la base avec l'élément ou le compte (ON DELETE CASCADE).
 */
@Entity
@Table(name = "favorites", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "node_id"}))
public class Favorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "node_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Node node;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected Favorite() {
        // Constructeur requis par JPA.
    }

    public Favorite(User user, Node node, Instant createdAt) {
        this.user = user;
        this.node = node;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public Node getNode() {
        return node;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
