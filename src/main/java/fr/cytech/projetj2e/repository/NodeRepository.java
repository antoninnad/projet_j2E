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
}
