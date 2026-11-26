package fr.cytech.projetj2e.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import fr.cytech.projetj2e.model.ChatMessage;
import fr.cytech.projetj2e.model.Conversation;
import fr.cytech.projetj2e.model.User;

/** Messages privés (T33). Accès toujours précédé du contrôle de participation à la conversation. */
@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    /** Envoi déjà reçu avec ce clientMessageId (renvoi après coupure). */
    Optional<ChatMessage> findByConversationAndSenderAndClientMessageId(Conversation conversation, User sender,
                                                                         String clientMessageId);

    /** Derniers messages (ordre décroissant) ; complété par Limit pour la taille de page + 1. */
    List<ChatMessage> findByConversationOrderByIdDesc(Conversation conversation, Limit limit);

    /** Messages plus anciens que le curseur (ordre décroissant). */
    List<ChatMessage> findByConversationAndIdLessThanOrderByIdDesc(Conversation conversation, Long beforeId, Limit limit);

    /** Messages plus récents que le curseur (ordre croissant) : rattrapage après coupure. */
    List<ChatMessage> findByConversationAndIdGreaterThanOrderByIdAsc(Conversation conversation, Long afterId, Limit limit);

    Optional<ChatMessage> findFirstByConversationOrderByIdDesc(Conversation conversation);

    Optional<ChatMessage> findByIdAndConversation(Long id, Conversation conversation);

    /**
     * Non-lus du compte par conversation : messages de l'autre participant postérieurs à son « dernier lu ».
     * Chaque ligne : [idConversation, nombre].
     */
    @Query("""
            select m.conversation.id, count(m) from ChatMessage m join m.conversation c
            where c in :conversations and m.sender <> :user
              and m.id > coalesce(case when c.participantA = :user then c.participantALastReadId
                                       else c.participantBLastReadId end, 0)
            group by m.conversation.id
            """)
    List<Object[]> countUnreadByConversation(@Param("conversations") Collection<Conversation> conversations,
                                             @Param("user") User user);

    /** Total des non-lus du compte, toutes conversations confondues. */
    @Query("""
            select count(m) from ChatMessage m join m.conversation c
            where (c.participantA = :user or c.participantB = :user) and m.sender <> :user
              and m.id > coalesce(case when c.participantA = :user then c.participantALastReadId
                                       else c.participantBLastReadId end, 0)
            """)
    long countUnread(@Param("user") User user);
}
