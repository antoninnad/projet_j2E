package fr.cytech.projetj2e.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import fr.cytech.projetj2e.model.Log;
import fr.cytech.projetj2e.model.User;

/** Journal d'activité (T36). La consultation passe par ActivityService, qui applique les droits. */
@Repository
public interface LogRepository extends JpaRepository<Log, Long> {

    /** Toute l'activité d'une entreprise (administrateur), la plus récente d'abord. */
    @Query(value = "select l from Log l where l.company.id = :companyId order by l.occurredAt desc, l.id desc",
            countQuery = "select count(l) from Log l where l.company.id = :companyId")
    Page<Log> findByCompany(@Param("companyId") Long companyId, Pageable pageable);

    /**
     * Activité des éléments que le membre peut voir aujourd'hui : son niveau dans le département de l'élément
     * atteint le seuil de l'élément. Pour un élément encore présent, son département et son seuil actuels ;
     * pour un élément supprimé, ceux recopiés au moment de l'action. Les entrées sans élément
     * (départements, comptes) sont réservées à l'administrateur.
     */
    @Query(value = """
            select l from Log l left join Node n on n.id = l.nodeId
            where l.company.id = :companyId and l.nodeId is not null
              and exists (select m.id from Membership m
                          where m.user = :user
                            and m.department.id = coalesce(n.department.id, l.departmentId)
                            and m.accessLevel >= coalesce(n.minAccessLevel, l.minAccessLevel))
            order by l.occurredAt desc, l.id desc
            """,
            countQuery = """
            select count(l) from Log l left join Node n on n.id = l.nodeId
            where l.company.id = :companyId and l.nodeId is not null
              and exists (select m.id from Membership m
                          where m.user = :user
                            and m.department.id = coalesce(n.department.id, l.departmentId)
                            and m.accessLevel >= coalesce(n.minAccessLevel, l.minAccessLevel))
            """)
    Page<Log> findVisibleTo(@Param("companyId") Long companyId, @Param("user") User user, Pageable pageable);

    /** Historique d'un élément, le plus récent d'abord (la visibilité de l'élément est vérifiée avant). */
    @Query(value = "select l from Log l where l.company.id = :companyId and l.nodeId = :nodeId order by l.occurredAt desc, l.id desc",
            countQuery = "select count(l) from Log l where l.company.id = :companyId and l.nodeId = :nodeId")
    Page<Log> findByNode(@Param("companyId") Long companyId, @Param("nodeId") Long nodeId, Pageable pageable);

    /**
     * Fige l'historique d'un élément supprimé sur son dernier département et son dernier seuil :
     * une entrée ancienne, recopiée avec un seuil plus bas, ne doit pas redevenir visible après la suppression.
     */
    @Modifying(flushAutomatically = true)
    @Query("update Log l set l.departmentId = :departmentId, l.minAccessLevel = :level where l.nodeId = :nodeId")
    int freezeAccess(@Param("nodeId") Long nodeId, @Param("departmentId") Long departmentId, @Param("level") int level);
}
