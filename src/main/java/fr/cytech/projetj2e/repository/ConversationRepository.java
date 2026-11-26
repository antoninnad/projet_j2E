package fr.cytech.projetj2e.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import fr.cytech.projetj2e.model.Conversation;
import fr.cytech.projetj2e.model.User;

/** Conversations privées (T33). Toujours filtrer par participant : un tiers ne doit jamais les voir. */
@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    /** a et b dans l'ordre des identifiants (a < b). */
    Optional<Conversation> findByParticipantAAndParticipantB(User a, User b);

    @Query("""
            select c from Conversation c
            where c.id = :id and (c.participantA = :user or c.participantB = :user)
            """)
    Optional<Conversation> findForParticipant(@Param("id") Long id, @Param("user") User user);

    /** Conversations du compte, la plus récemment active d'abord. */
    @Query(value = """
            select c from Conversation c
            where c.participantA = :user or c.participantB = :user
            order by c.lastActivityAt desc, c.id desc
            """,
            countQuery = "select count(c) from Conversation c where c.participantA = :user or c.participantB = :user")
    Page<Conversation> findForParticipant(@Param("user") User user, Pageable pageable);
}
