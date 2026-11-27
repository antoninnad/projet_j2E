package fr.cytech.projetj2e.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import fr.cytech.projetj2e.model.Folder;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;

/**
 * Pour les accès des membres, utiliser les méthodes filtrées par entreprise
 * (ou CompanyIsolationService) plutôt que findById / findAll.
 */
@Repository
public interface NodeRepository extends JpaRepository<Node, Long> {

    /** Vide si le nœud n'existe pas ou appartient à une autre entreprise. */
    Optional<Node> findByIdAndCompany_Id(Long id, Long companyId);

    Page<Node> findByCompany_Id(Long companyId, Pageable pageable);

    /** Nom déjà pris dans le dossier, sans tenir compte de la casse (T20). */
    boolean existsByParentAndNameIgnoreCase(Folder parent, String name);

    /** Idem en excluant l'élément renommé lui-même. */
    boolean existsByParentAndNameIgnoreCaseAndIdNot(Folder parent, String name, Long id);

    /**
     * Enfants d'un dossier dont le seuil M ne dépasse pas le niveau L du compte (T18).
     * Le filtre est fait en base pour que la pagination ne compte que les éléments visibles.
     * Tri : dossiers d'abord, puis par nom.
     */
    @Query(value = """
            select n from Node n
            where n.parent = :parent and n.minAccessLevel <= :level
            order by case when type(n) = Folder then 0 else 1 end, lower(n.name), n.id
            """,
            countQuery = "select count(n) from Node n where n.parent = :parent and n.minAccessLevel <= :level")
    Page<Node> findVisibleChildren(@Param("parent") Folder parent, @Param("level") int level, Pageable pageable);

    /**
     * Recherche par nom dans l'entreprise, limitée aux éléments visibles (T31) : l'administrateur voit tout ;
     * un membre, les éléments dont le seuil ne dépasse pas son niveau dans leur département.
     * pattern est déjà en minuscules, entouré de % et échappé (\ % _). Tri : nom exact, puis début du nom,
     * puis dossiers d'abord et ordre alphabétique.
     */
    @Query(value = """
            select n from Node n
            where n.company.id = :companyId
              and lower(n.name) like :pattern escape '\\'
              and (:kind is null or (:kind = 'file' and type(n) = File) or (:kind = 'folder' and type(n) = Folder))
              and (:departmentId is null or n.department.id = :departmentId)
              and (:admin = true or exists (select m.id from Membership m
                                             where m.user = :user and m.department = n.department
                                               and m.accessLevel >= n.minAccessLevel))
            order by case when lower(n.name) = :exact then 0 when lower(n.name) like :prefix escape '\\' then 1 else 2 end,
                     case when type(n) = Folder then 0 else 1 end, lower(n.name), n.id
            """,
            countQuery = """
            select count(n) from Node n
            where n.company.id = :companyId
              and lower(n.name) like :pattern escape '\\'
              and (:kind is null or (:kind = 'file' and type(n) = File) or (:kind = 'folder' and type(n) = Folder))
              and (:departmentId is null or n.department.id = :departmentId)
              and (:admin = true or exists (select m.id from Membership m
                                             where m.user = :user and m.department = n.department
                                               and m.accessLevel >= n.minAccessLevel))
            """)
    Page<Node> searchVisible(@Param("companyId") Long companyId, @Param("user") User user, @Param("admin") boolean admin,
                             @Param("pattern") String pattern, @Param("exact") String exact, @Param("prefix") String prefix,
                             @Param("kind") String kind, @Param("departmentId") Long departmentId, Pageable pageable);
}
