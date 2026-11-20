package fr.cytech.projetj2e.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

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
}
