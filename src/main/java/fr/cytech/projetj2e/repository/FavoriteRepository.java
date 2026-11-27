package fr.cytech.projetj2e.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import fr.cytech.projetj2e.model.Favorite;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;

/** Favoris personnels (T31). La liste est toujours filtrée selon l'accès actuel du compte. */
@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    Optional<Favorite> findByUserAndNode(User user, Node node);

    /** Identifiants des éléments, parmi nodeIds, que le compte a mis en favori (étoile de l'explorateur). */
    @Query("select f.node.id from Favorite f where f.user = :user and f.node.id in :nodeIds")
    List<Long> findFavoriteNodeIds(@Param("user") User user, @Param("nodeIds") Collection<Long> nodeIds);

    @Modifying(flushAutomatically = true)
    @Query("delete from Favorite f where f.user = :user and f.node.id = :nodeId")
    int deleteByUserAndNodeId(@Param("user") User user, @Param("nodeId") Long nodeId);

    /**
     * Favoris du compte encore accessibles : un favori dont l'élément n'est plus visible (seuil relevé,
     * adhésion retirée) est masqué sans être supprimé ; il réapparaît si l'accès revient.
     */
    @Query(value = """
            select f from Favorite f join f.node n
            where f.user = :user and n.company.id = :companyId
              and (:admin = true or exists (select m.id from Membership m
                                             where m.user = :user and m.department = n.department
                                               and m.accessLevel >= n.minAccessLevel))
            order by f.createdAt desc, f.id desc
            """,
            countQuery = """
            select count(f) from Favorite f join f.node n
            where f.user = :user and n.company.id = :companyId
              and (:admin = true or exists (select m.id from Membership m
                                             where m.user = :user and m.department = n.department
                                               and m.accessLevel >= n.minAccessLevel))
            """)
    Page<Favorite> findVisible(@Param("user") User user, @Param("companyId") Long companyId,
                               @Param("admin") boolean admin, Pageable pageable);
}
