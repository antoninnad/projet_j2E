package fr.cytech.projetj2e.model;

import java.time.Instant;
import java.util.Objects;

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
 * Conversation privée entre deux membres d'une même entreprise (T33).
 * Les participants sont rangés par identifiant croissant (A < B) : une seule conversation par paire.
 * Chaque participant a son propre « dernier message lu », qui détermine ses messages non lus.
 */
@Entity
@Table(name = "conversations",
       uniqueConstraints = @UniqueConstraint(columnNames = {"participant_a_id", "participant_b_id"}))
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_a_id", nullable = false)
    private User participantA;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_b_id", nullable = false)
    private User participantB;

    @Column(name = "participant_a_last_read_id")
    private Long participantALastReadId;

    @Column(name = "participant_b_last_read_id")
    private Long participantBLastReadId;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    /** Date du dernier message (ou de la création) : tri de la liste des conversations. */
    @Column(nullable = false)
    private Instant lastActivityAt;

    protected Conversation() {
        // Constructeur requis par JPA.
    }

    /** Ouvre une conversation entre deux comptes enregistrés et distincts de la même entreprise. */
    public Conversation(User first, User second, Instant now) {
        if (first.getId() == null || second.getId() == null) {
            throw new IllegalArgumentException("Les participants doivent être enregistrés.");
        }
        if (first.getId().equals(second.getId())) {
            throw new IllegalArgumentException("Une conversation réunit deux personnes différentes.");
        }
        if (!Objects.equals(first.getCompany().getId(), second.getCompany().getId())) {
            throw new IllegalArgumentException("Les participants doivent appartenir à la même entreprise.");
        }
        boolean ordered = first.getId() < second.getId();
        this.participantA = ordered ? first : second;
        this.participantB = ordered ? second : first;
        this.company = first.getCompany();
        this.createdAt = now;
        this.lastActivityAt = now;
    }

    public boolean hasParticipant(User user) {
        return user != null && user.getId() != null
                && (user.getId().equals(participantA.getId()) || user.getId().equals(participantB.getId()));
    }

    /** L'autre participant ; IllegalArgumentException si user n'en fait pas partie. */
    public User peerOf(User user) {
        if (!hasParticipant(user)) {
            throw new IllegalArgumentException("Ce compte ne participe pas à la conversation.");
        }
        return user.getId().equals(participantA.getId()) ? participantB : participantA;
    }

    public Long lastReadIdOf(User user) {
        return isA(user) ? participantALastReadId : participantBLastReadId;
    }

    /** Avance le « dernier lu » d'un participant ; ne recule jamais. Vrai si le marqueur a avancé. */
    public boolean markReadUpTo(User user, Long messageId) {
        Long current = lastReadIdOf(user);
        if (messageId == null || (current != null && current >= messageId)) {
            return false;
        }
        if (isA(user)) {
            participantALastReadId = messageId;
        } else {
            participantBLastReadId = messageId;
        }
        return true;
    }

    public void touch(Instant when) {
        if (when.isAfter(lastActivityAt)) {
            lastActivityAt = when;
        }
    }

    private boolean isA(User user) {
        peerOf(user); // vérifie la participation
        return user.getId().equals(participantA.getId());
    }

    public Long getId() {
        return id;
    }

    public Company getCompany() {
        return company;
    }

    public User getParticipantA() {
        return participantA;
    }

    public User getParticipantB() {
        return participantB;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getLastActivityAt() {
        return lastActivityAt;
    }
}
